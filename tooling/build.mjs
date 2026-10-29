import { build } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.version, manifest.version);
if (process.env.RELEASE_VERSION) assert.equal(process.env.RELEASE_VERSION, manifest.version);
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/entry.ts'], outfile: 'dist/main.js', bundle: true,
  format: 'cjs', platform: 'browser', target: 'es2021', external: ['obsidian'],
  banner: { js: '/* Snippet Palette Next — MIT, Jayden */' }, logLevel: 'info' });
for (const file of ['manifest.json', 'styles.css', 'LICENSE']) await copyFile(file, `dist/${file}`);
