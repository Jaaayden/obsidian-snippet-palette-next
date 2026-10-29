import obsidian from 'eslint-plugin-obsidianmd';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'test/**', 'tooling/**', '*.mjs'] },
  ...obsidian.configs.recommended,
  { files: ['src/**/*.ts'], languageOptions: { parserOptions: { projectService: true } } }
];
