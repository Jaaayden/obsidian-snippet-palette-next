import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import path from 'node:path';

const output = await build({
  stdin: { contents: `export {default as Extension} from './src/entry';
    export * from './src/core/catalog'; export * from './src/core/document';
    export * from './src/ui/workspace'; export * from './src/ui/preferences';
    export * from './src/ui/editor'; export * from './src/ui/sorting'; export * from './src/editor-target';
    export * from './src/words'; export * from './test/obsidian-fixture.mjs';`, resolveDir: process.cwd() },
  format: 'esm', bundle: true, write: false,
  plugins: [{ name: 'public-api-fixture', setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: path.resolve('test/obsidian-fixture.mjs') }));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text + '\n//# sourceURL=palette-ui-fixture.mjs').toString('base64')}`);
let dom;
beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  globalThis.document = dom.window.document;
  const proto = dom.window.HTMLElement.prototype;
  proto.createEl = function(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.cls) node.className = options.cls;
    if (options.text) node.textContent = options.text;
    if (options.type) node.type = options.type;
    for (const [key, value] of Object.entries(options.attr ?? {})) node.setAttribute(key, value);
    this.appendChild(node); return node;
  };
  proto.createDiv = function(options) { return this.createEl('div', options); };
  proto.createSpan = function(options) { return this.createEl('span', options); };
  proto.empty = function() { this.replaceChildren(); };
  proto.addClass = function(name) { this.classList.add(name); };
  proto.setText = function(text) { this.textContent = text; };
  proto.setPointerCapture = function(id) { this.captured = id; };
  proto.hasPointerCapture = function(id) { return this.captured === id; };
  proto.releasePointerCapture = function() { this.captured = null; };
  api.setLocale('en'); api.notices.length = 0; api.Modal.opened.length = 0;
});
const settle = async () => { await new Promise(resolve => setTimeout(resolve, 0)); };
function fixture() {
  const handlers = new Set(); let active = null;
  const leaves = [];
  const app = { workspace: {
    getActiveViewOfType: Type => active instanceof Type ? active : null,
    getLeavesOfType: type => leaves.filter(leaf => type === 'markdown' ? leaf.view instanceof api.MarkdownView : leaf.view.getViewType?.() === type),
    on: (_, fn) => { handlers.add(fn); return () => handlers.delete(fn); },
    getRightLeaf: () => ({ async setViewState(state) { this.state = state; } }),
    revealLeaf: async leaf => { app.revealed = leaf; }
  } };
  const context = {
    app, version: '4.3.2', catalog: new api.Catalog(async () => {}),
    createKey: () => 'new-key', targetName: () => 'Experiment',
    insert: key => { context.inserted = key; }, open: async () => {},
    reportSaveFailure: () => { context.failed = true; }
  };
  const activate = view => { active = view; for (const fn of handlers) fn(); };
  return { app, context, activate, leaves, handlers };
}
async function populate(context) {
  for (const key of ['one', 'two', 'three']) await context.catalog.put({ ...api.newClip(key), title: key, body: `Body ${key}` }, false);
}
function input(node, value) { node.value = value; node.dispatchEvent(new dom.window.Event('input')); }
function button(parent, label) { return [...parent.querySelectorAll('button')].find(node => node.textContent === label || node.getAttribute('aria-label') === label); }

test('workspace toggles search, clears hidden filtering and preserves mouse selection', async () => {
  const { context, app } = fixture(); await populate(context);
  const view = new api.PaletteWorkspace({ app }, context); await view.onOpen(); document.body.append(view.contentEl);
  const search = view.contentEl.querySelector('input'); assert.equal(search.hidden, true);
  assert.equal(view.contentEl.querySelectorAll('.spn-token').length, 3);
  const toggle = button(view.contentEl, 'Search snippets'); toggle.click();
  assert.equal(document.activeElement, search); input(search, 'two');
  const token = view.contentEl.querySelector('.spn-token'); assert.equal(token.textContent, 'two');
  const mouse = new dom.window.MouseEvent('mousedown', { button: 0, cancelable: true }); token.dispatchEvent(mouse);
  assert.equal(mouse.defaultPrevented, true); token.click(); assert.equal(context.inserted, 'two');
  search.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(search.hidden, true); assert.equal(search.value, '');
  assert.equal(view.contentEl.querySelectorAll('.spn-token').length, 3);
  view.dispose();
});

test('workspace keeps text-only labels across layouts and releases its subscription', async () => {
  const { context, app } = fixture(); await populate(context);
  const view = new api.PaletteWorkspace({ app }, context); await view.onOpen();
  assert.equal(view.contentEl.querySelectorAll('.spn-token svg').length, 0);
  await context.catalog.configure({ flow: 'strip' });
  assert.equal(view.contentEl.querySelector('.spn-palette').dataset.flow, 'strip');
  assert.equal(view.contentEl.querySelectorAll('.spn-token svg').length, 0);
  view.dispose(); await view.onClose(); await context.catalog.remove('one');
  assert.equal(view.contentEl.querySelectorAll('.spn-token').length, 3);
});

test('compact preferences show version and open an isolated editor', async () => {
  const { context, app } = fixture(); await populate(context);
  const tab = new api.PalettePreferences(new api.Plugin(app), context); tab.display();
  assert.ok(tab.containerEl.querySelector('.spn-version').textContent.includes('v4.3.2'));
  assert.equal(tab.containerEl.querySelectorAll('.spn-record').length, 3);
  assert.equal(tab.containerEl.querySelectorAll('textarea').length, 0);
  tab.containerEl.querySelector('.spn-record-name').click();
  const dialog = api.Modal.opened.at(-1);
  assert.equal(dialog.contentEl.textContent.includes('Icon'), false);
  assert.equal(tab.containerEl.querySelectorAll('input[type=checkbox]').length, 0);
  input(dialog.contentEl.querySelector('input'), 'changed'); button(dialog.contentEl, 'Cancel').click();
  assert.equal(context.catalog.snapshot().entries[0].title, 'one'); tab.hide();
});

test('editor saves once and failed persistence keeps the draft open', async () => {
  const { context } = fixture();
  let reject = true; context.catalog = new api.Catalog(async () => { if (reject) throw Error('disk'); });
  const dialog = new api.ClipEditor(context); dialog.open();
  input(dialog.contentEl.querySelector('input'), 'New'); input(dialog.contentEl.querySelector('textarea'), 'content');
  button(dialog.contentEl, 'Save').click(); await settle();
  assert.equal(context.catalog.snapshot().entries.length, 0); assert.equal(context.failed, true); assert.equal(dialog.closed, undefined);
  reject = false; button(dialog.contentEl, 'Save').click(); button(dialog.contentEl, 'Save').click(); await settle();
  assert.equal(context.catalog.snapshot().entries.length, 1); assert.equal(dialog.closed, true);
});

test('deletion asks for confirmation and keyboard End moves the selected row', async () => {
  const { context, app } = fixture(); await populate(context);
  const tab = new api.PalettePreferences(new api.Plugin(app), context); tab.display(); document.body.append(tab.containerEl);
  const grip = tab.containerEl.querySelector('[data-move-key]');
  grip.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End' })); await settle();
  assert.deepEqual(context.catalog.snapshot().entries.map(x => x.key), ['two', 'three', 'one']);
  assert.equal(document.activeElement.dataset.moveKey, 'one');
  button(tab.containerEl, 'Delete snippet').click();
  assert.equal(context.catalog.snapshot().entries.length, 3);
  button(api.Modal.opened.at(-1).contentEl, 'Delete').click(); await settle();
  assert.equal(context.catalog.snapshot().entries.length, 2); tab.hide();
});

function pointer(node, type, y, extras = {}) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({ pointerId: 7, button: 0, isPrimary: true, clientY: y, ...extras })) Object.defineProperty(event, key, { value });
  node.dispatchEvent(event);
}
test('pointer sorting supports touch, visible drop markers, cancellation and filtered anchors', async () => {
  const { context, app } = fixture(); await populate(context);
  const tab = new api.PalettePreferences(new api.Plugin(app), context); tab.display();
  const rows = [...tab.containerEl.querySelectorAll('.spn-record')];
  rows.forEach((row, i) => { row.getBoundingClientRect = () => ({ top: i * 40, height: 40 }); });
  const list = tab.containerEl.querySelector('.spn-catalog');
  pointer(rows[2].querySelector('[data-move-key]'), 'pointerdown', 100, { pointerType: 'touch' });
  pointer(list, 'pointermove', 5, { pointerType: 'touch' });
  assert.ok(rows[0].classList.contains('spn-before'));
  pointer(list, 'pointercancel', 5); assert.equal(context.catalog.snapshot().entries[0].key, 'one');
  pointer(rows[2].querySelector('[data-move-key]'), 'pointerdown', 100);
  pointer(list, 'pointermove', 5); pointer(list, 'pointerup', 5); await settle();
  assert.deepEqual(context.catalog.snapshot().entries.map(x => x.key), ['three', 'one', 'two']); tab.hide();
});

test('editor target remembers the pane, but never resurrects a closed pane', () => {
  const { app, activate, leaves } = fixture(); const target = new api.EditorTarget(app);
  const view = new api.MarkdownView(); leaves.push({ view }); activate(view); target.remember();
  activate(null); assert.equal(target.resolve(), view);
  leaves.length = 0; assert.equal(target.resolve(), null);
  target.clear(); assert.equal(target.resolve(), null);
});

test('unsupported languages fall back to English', () => {
  assert.equal(api.translate('zh-CN', 'save'), '保存'); assert.equal(api.translate('de', 'save'), 'Save');
  assert.equal(api.translate('en', 'version', { version: '7.0.1' }), 'Installed version 7.0.1');
});

test('plugin lifecycle registers and removes dynamic actions without writing default data', async () => {
  const { app } = fixture(); const extension = new api.Extension(app);
  const data = api.blankDocument(); data.entries.push({ ...api.newClip('x'), title: 'X', body: 'text' });
  extension.saved = { ...structuredClone(data), preferences: { flow: 'tiles', icons: true, shortcuts: true } }; await extension.onload();
  assert.equal(extension.ribbons.length, 1);
  assert.ok(extension.commands.has('paste-x'));
  assert.equal(extension.saved.preferences.icons, true); // Loading never rewrites the existing file.
  extension.onunload(); extension.dispose(); assert.equal(extension.commands.has('paste-x'), false);
});
