import { getLanguage } from 'obsidian';

const phrases = {
  open: ['Open palette', '打开调色板'],
  palette: ['Snippet Palette Next', 'Snippet Palette Next'],
  search: ['Search snippets', '搜索片段'], closeSearch: ['Close search', '收起搜索'],
  query: ['Filter by title…', '按标题筛选…'], add: ['New snippet', '新建片段'],
  edit: ['Edit snippet', '编辑片段'], erase: ['Delete snippet', '删除片段'],
  removeQuestion: ['Delete “{title}”? This cannot be undone.', '删除「{title}」？此操作无法撤销。'],
  remove: ['Delete', '删除'], cancel: ['Cancel', '取消'], save: ['Save', '保存'],
  title: ['Title', '标题'], body: ['Text to insert', '要插入的文本'],
  shade: ['Background color', '底色'], auto: ['Automatic', '自动'], gray: ['Gray', '灰色'],
  azure: ['Blue', '蓝色'], mint: ['Green', '绿色'], amber: ['Amber', '橙色'], rose: ['Rose', '粉色'], violet: ['Violet', '紫色'],
  position: ['Insert at', '插入位置'], selection: ['Cursor or selection', '光标或选区'],
  beginning: ['Start, after properties', '开头，属性之后'], ending: ['End of note', '笔记末尾'],
  unique: ['Skip duplicates', '跳过重复片段'], uniqueHelp: ['Skip if the first line already appears in the note.', '笔记中已出现片段第一行时不再插入。'],
  titleMissing: ['Enter a title first.', '请先填写标题。'],
  writeError: ['Could not save. Your previous data is unchanged; please retry.', '保存失败，原有数据未变更，请重试。'],
  invalidData: ['Saved palette data could not be read. Restore a backup before enabling the plugin again.', '无法读取片段数据，请恢复备份后重新启用插件。'],
  destination: ['Target: {title}', '目标：{title}'], noDestination: ['Open a note to start', '请先打开笔记'],
  needEditor: ['Switch the target note to editing mode first.', '请先将目标笔记切换到编辑模式。'],
  inserted: ['Inserted “{title}”.', '已插入「{title}」。'], already: ['This snippet is already in the note.', '这条片段已存在于笔记中。'],
  emptyBody: ['Add text to this snippet before inserting it.', '请先为片段添加文本。'],
  emptyList: ['No snippets yet. Use + to create one.', '还没有片段，点击加号新建。'],
  noResults: ['No matching titles.', '没有匹配的标题。'],
  insertLabel: ['Insert {title}', '插入 {title}'],
  settingsView: ['Workspace panel', '工作区面板'],
  dockHelp: ['Move the panel tab to any sidebar or split.', '拖动面板标签，可放入侧栏或分栏。'],
  flow: ['Layout', '布局'], tiles: ['Wrapping labels', '自动换行标签'], stack: ['One column', '单列'], strip: ['One scrolling row', '横向单行'],
  library: ['Snippets', '片段列表'],
  version: ['Installed version {version}', '安装版本 {version}'],
  drag: ['Move {title}: drag, ↑/↓, Home/End', '移动 {title}：拖动、↑/↓、Home/End'],
  earlier: ['Move earlier', '上移'], later: ['Move later', '下移'],
  moved: ['Moved {title} to position {position}.', '已将 {title} 移至第 {position} 位。']
} as const;
export type Phrase = keyof typeof phrases;
export function translate(locale: string, key: Phrase, values: Record<string, string> = {}): string {
  const chinese = /^(zh|zh-cn|zh-sg|zh-hans)$/i.test(locale.replace('_', '-'));
  const message = phrases[key][chinese ? 1 : 0];
  return message.replace(/\{([^}]+)\}/g, (token, name: string) => values[name] ?? token);
}
export function text(key: Phrase, values?: Record<string, string>): string {
  return translate(getLanguage(), key, values);
}
