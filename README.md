# Snippet Palette Next

A compact, dockable text-snippet palette for Obsidian 1.8.7 and later.

- Text-only titles with stable accent colors.
- Wrapped tiles, a vertical list, or a horizontal strip.
- Search stays hidden until you press the search button; Escape closes it.
- Compact settings list with a separate Save/Cancel editor.
- Drag handles support pointer and touch input, edge scrolling, and cancellation. Keyboard users can move a focused handle with arrow keys, Home, and End.
- Insert at the selection, below YAML frontmatter, or at the end of a note; optional duplicate checking.
- Simplified Chinese and English, selected from Obsidian's language. Version shown in settings.

## Install

Download `main.js`, `manifest.json`, and `styles.css` from a GitHub release into `<vault>/.obsidian/plugins/snippet-palette-next/`. Reload Obsidian and enable **Snippet Palette Next** under Community plugins. Run **Snippet Palette Next: Open palette** (or use its ribbon icon), then dock the panel wherever you prefer. Edit a Markdown note before inserting text.

This project has **not been accepted into the Obsidian community directory**. See [PROVENANCE.md](PROVENANCE.md) for its relationship to earlier work and the limits of its independence claim.

## 中文使用说明

将 Release 中的 `main.js`、`manifest.json`、`styles.css` 放入笔记库的 `.obsidian/plugins/snippet-palette-next/`，重载 Obsidian 后启用插件。点击侧栏图标打开片段面板，可拖动面板到侧边栏或主工作区。

设置页面使用紧凑列表；点击标题或编辑按钮进入详情，保存才会写入。拖动左侧手柄调整顺序，也可聚焦手柄后使用方向键、Home、End。片段统一显示标题和底色，不使用图标。面板搜索默认隐藏，点击搜索按钮展开，按 Esc 关闭。请先打开可编辑的 Markdown 笔记，再点击片段插入。

旧插件数据不会在插件启动时自动读取。替换旧版时，应先备份旧插件及 Obsidian 配置，再显式转换数据；不要直接将旧版 `data.json` 覆盖到新目录。

## Development

Use Node.js 22.22.2+, 24.15.0+, or 26+ (supported LTS/current branches). Run `npm ci`, then `npm run verify`. Build output is in `dist/`. Tag the manifest/package version without a `v` prefix to publish release assets after verification.

Tests cover insertion, transactional persistence, validation, filtering, editing, keyboard/pointer sorting, target lifecycle, and plugin integration using a simulated Obsidian environment. They do not replace testing on physical mobile devices. Official Obsidian lint currently reports one advisory about a settings API newer than the minimum supported SDK.

The plugin makes no network requests and includes no telemetry. It stores configuration in its own plugin data file and modifies the selected editor only when a snippet is invoked. Development dependencies are not bundled; Obsidian supplies its runtime API.

## License

MIT. See [LICENSE](LICENSE).
