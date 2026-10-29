import { Notice, Plugin, type Editor } from 'obsidian';
import { Catalog } from './core/catalog';
import type { Clip } from './core/document';
import { planInsertion } from './core/insertion';
import type { PaletteContext } from './contracts';
import { EditorTarget } from './editor-target';
import { PalettePreferences } from './ui/preferences';
import { PaletteWorkspace, WORKSPACE_KIND } from './ui/workspace';
import { text } from './words';

export default class PaletteNext extends Plugin {
  private target: EditorTarget | null = null;
  private catalog = new Catalog(value => this.saveData(value));
  private ownedCommandIds: string[] = [];
  async onload(): Promise<void> {
    try { this.catalog.initialize(await this.loadData()); }
    catch { new Notice(text('invalidData')); return; }
    const target = new EditorTarget(this.app);
    this.target = target;
    target.remember();
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => target.remember()));
    const context: PaletteContext = {
      app: this.app,
      catalog: this.catalog,
      version: this.manifest.version,
      createKey: () => crypto.randomUUID(),
      open: () => this.reveal(),
      targetName: () => target.resolve()?.file?.basename ?? null,
      insert: key => {
        const view = target.resolve();
        if (!view?.file || view.getMode() !== 'source') { new Notice(text('needEditor')); return; }
        const clip = this.catalog.snapshot().entries.find(entry => entry.key === key);
        if (clip) {
          this.apply(view.editor, clip);
          view.editor.focus();
        }
      },
      reportSaveFailure: () => { new Notice(text('writeError')); }
    };
    this.registerView(WORKSPACE_KIND, leaf => new PaletteWorkspace(leaf, context));
    this.addCommand({ id: 'show-palette', name: text('open'), callback: () => this.reveal() });
    this.addRibbonIcon('swatch-book', text('open'), () => { void this.reveal(); });
    this.addSettingTab(new PalettePreferences(this, context));
    const sync = (): void => {
      this.clearActions();
      const snapshot = this.catalog.snapshot();
      for (const entry of snapshot.entries) {
        const id = `paste-${entry.key}`;
        this.addCommand({ id, name: text('insertLabel', { title: entry.title }), editorCallback: editor => {
          const current = this.catalog.snapshot().entries.find(clip => clip.key === entry.key);
          if (current) this.apply(editor, current);
        } });
        this.ownedCommandIds.push(id);
      }
    };
    this.register(this.catalog.subscribe(sync));
    sync();
  }
  private async reveal(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(WORKSPACE_KIND)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('split');
      await leaf.setViewState({ type: WORKSPACE_KIND, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  private apply(editor: Editor, clip: Clip): void {
    const edit = planInsertion(editor.getValue(), clip, [
      editor.posToOffset(editor.getCursor('from')), editor.posToOffset(editor.getCursor('to'))
    ]);
    if (edit.status !== 'ready') { new Notice(text(edit.status === 'empty' ? 'emptyBody' : 'already')); return; }
    editor.replaceRange(edit.text, editor.offsetToPos(edit.start), editor.offsetToPos(edit.end));
    new Notice(text('inserted', { title: clip.title }));
  }
  private clearActions(): void {
    for (const command of this.ownedCommandIds) this.removeCommand(command);
    this.ownedCommandIds = [];
  }
  onunload(): void { this.clearActions(); this.target?.clear(); this.target = null; }
}
