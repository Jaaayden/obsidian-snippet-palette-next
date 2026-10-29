import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({ stdin: { contents: "export * from './src/core/document'; export * from './src/core/catalog'; export * from './src/core/insertion';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm' });
const { blankDocument, decodeDocument, newClip, relocate, shadeFor, Catalog, planInsertion } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const clip = (key = 'a', patch = {}) => ({ ...newClip(key), title: key.toUpperCase(), body: 'text', ...patch });

test('document decoder protects existing data from unknown formats and duplicate identities', () => {
  assert.deepEqual(decodeDocument(null), blankDocument());
  const document = blankDocument(); document.entries.push(clip());
  assert.deepEqual(decodeDocument(document), document);
  assert.throws(() => decodeDocument({ ...document, format: 2 }));
  assert.throws(() => decodeDocument({ ...document, entries: [clip(), clip()] }));
  assert.throws(() => decodeDocument({ ...document, entries: [clip('a', { body: 42 })] }));
  assert.throws(() => decodeDocument({ ...document, preferences: { ...document.preferences, flow: 'unknown' } }));
});

test('automatic colors depend on identity and explicit choices are preserved', () => {
  const item = clip('stable'); const chosen = shadeFor(item);
  assert.equal(shadeFor({ ...item, title: 'Renamed' }), chosen);
  assert.equal(shadeFor({ ...item, shade: 'rose' }), 'rose');
});

test('reordering uses gap positions without mutating the input', () => {
  const entries = ['a', 'b', 'c', 'd'].map(key => clip(key));
  assert.deepEqual(relocate(entries, 'd', 0).map(x => x.key), ['d', 'a', 'b', 'c']);
  assert.deepEqual(relocate(entries, 'a', 4).map(x => x.key), ['b', 'c', 'd', 'a']);
  assert.equal(relocate(entries, 'b', 2), entries);
  assert.equal(relocate(entries, 'missing', 0), entries);
  assert.equal(relocate(entries, 'b', -1), entries);
  assert.equal(relocate(entries, 'b', 1.5), entries);
  assert.deepEqual(entries.map(x => x.key), ['a', 'b', 'c', 'd']);
});

const cases = [
  ['selection', 'abc', [1, 2], 'atext\nc'],
  ['selection', '', [0, 0], 'text\n'],
  ['beginning', 'note', [0, 0], 'text\nnote'],
  ['beginning', '---\ntitle: A\n---\nbody', [0, 0], '---\ntitle: A\n---\ntext\nbody'],
  ['beginning', '---\ntitle: A\n---', [0, 0], '---\ntitle: A\n---\ntext\n'],
  ['beginning', '\uFEFF---\ntitle: A\n...\nbody', [0, 0], '\uFEFF---\ntitle: A\n...\ntext\nbody'],
  ['beginning', '---\nunclosed', [0, 0], 'text\n---\nunclosed'],
  ['ending', 'note', [0, 0], 'note\ntext\n'],
  ['ending', 'note\n', [0, 0], 'note\ntext\n'],
  ['beginning', '---\r\nx: y\r\n---\r\nbody', [0, 0], '---\r\nx: y\r\n---\r\ntext\r\nbody']
];
for (const [placement, note, selection, expected] of cases) {
  test(`insertion: ${placement} in ${JSON.stringify(note)}`, () => {
    const edit = planInsertion(note, clip('x', { placement }), selection);
    assert.equal(edit.status, 'ready');
    assert.equal(note.slice(0, edit.start) + edit.text + note.slice(edit.end), expected);
  });
}
test('empty, duplicate and invalid-selection paths never produce edits', () => {
  assert.equal(planInsertion('text exists', clip('x', { unique: true }), [0, 0]).status, 'duplicate');
  assert.equal(planInsertion('text', clip('x', { body: '' }), [0, 0]).status, 'empty');
  assert.throws(() => planInsertion('x', clip(), [0, 3]));
});

test('queued commits are lossless and observers see only persisted state', async () => {
  const saved = [];
  const catalog = new Catalog(async next => { await Promise.resolve(); saved.push(structuredClone(next)); });
  const seen = []; const stop = catalog.subscribe(() => seen.push(catalog.snapshot().entries.length));
  await Promise.all([catalog.put(clip('a'), false), catalog.put(clip('b'), false), catalog.configure({ flow: 'strip' })]);
  assert.deepEqual(catalog.snapshot().entries.map(x => x.key), ['a', 'b']);
  assert.equal(catalog.snapshot().preferences.flow, 'strip');
  assert.deepEqual(seen, [1, 2, 2]);
  assert.equal(saved[0].entries.length, 1);
  stop(); await catalog.remove('a'); assert.equal(seen.length, 3);
});

test('disk failure rolls back completely and later operations can still commit', async () => {
  let reject = true;
  const catalog = new Catalog(async () => { if (reject) throw Error('disk unavailable'); });
  await assert.rejects(catalog.put(clip(), false));
  assert.equal(catalog.snapshot().entries.length, 0);
  reject = false; await catalog.put(clip(), false);
  assert.equal(catalog.snapshot().entries.length, 1);
});

test('editing cannot resurrect a deleted entry, and snapshots cannot mutate storage', async () => {
  const catalog = new Catalog(async () => {});
  await catalog.put(clip(), false);
  const copy = catalog.snapshot(); copy.entries[0].body = 'outside mutation';
  assert.equal(catalog.snapshot().entries[0].body, 'text');
  await catalog.remove('a');
  await assert.rejects(catalog.put(clip(), true));
  assert.equal(catalog.snapshot().entries.length, 0);
});

test('moves use stable anchors across filtered lists', async () => {
  const catalog = new Catalog(async () => {});
  for (const key of ['visible-a', 'hidden', 'visible-b']) await catalog.put(clip(key), false);
  await catalog.move('visible-b', 'visible-a', 'before');
  assert.deepEqual(catalog.snapshot().entries.map(x => x.key), ['visible-b', 'visible-a', 'hidden']);
  await catalog.move('visible-b', 'hidden', 'after');
  assert.deepEqual(catalog.snapshot().entries.map(x => x.key), ['visible-a', 'hidden', 'visible-b']);
});

test('legacy icon options are ignored while snippet data and layout are preserved', () => {
  const document = blankDocument(); document.entries.push(clip('legacy'));
  const legacy = structuredClone(document);
  legacy.entries[0].glyph = 'star';
  legacy.preferences.icons = true; legacy.preferences.shortcuts = true;
  assert.deepEqual(decodeDocument(legacy), document);
});
