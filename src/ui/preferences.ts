import { PluginSettingTab, Setting, type Plugin } from 'obsidian';
import type { PaletteContext } from '../contracts';
import { shadeFor, type Flow } from '../core/document';
import { text } from '../words';
import { ClipEditor, RemovalDialog } from './editor';
import { tool } from './elements';
import { SortingSurface, type DropLocation } from './sorting';

export class PalettePreferences extends PluginSettingTab {
  private stop: (() => void) | null = null;
  private sorting: SortingSurface | null = null;
  private filter = '';
  private list: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private busy = false;
  constructor(plugin: Plugin, private context: PaletteContext) { super(context.app, plugin); }
  display(): void {
    this.hide();
    this.containerEl.empty();
    this.containerEl.addClass('spn-preferences');
    const version = this.containerEl.createDiv({ cls: 'spn-version', text: `Snippet Palette Next · v${this.context.version}` });
    version.setAttribute('aria-label', text('version', { version: this.context.version }));
    new Setting(this.containerEl).setName(text('settingsView')).setDesc(text('dockHelp'))
      .addButton(button => button.setButtonText(text('open')).onClick(() => { void this.context.open(); }));
    const preferences = this.context.catalog.snapshot().preferences;
    new Setting(this.containerEl).setName(text('flow')).addDropdown(input => {
      for (const flow of ['tiles', 'stack', 'strip'] as const) input.addOption(flow, text(flow));
      input.setValue(preferences.flow).onChange(value => {
        void this.context.catalog.configure({ flow: value as Flow }).catch(() => { this.context.reportSaveFailure(); this.display(); });
      });
    });
    const bar = this.containerEl.createDiv({ cls: 'spn-library-bar' });
    bar.createSpan({ text: text('library') });
    const search = bar.createEl('input', { type: 'search', attr: { 'aria-label': text('search'), placeholder: text('query') } });
    search.value = this.filter;
    search.addEventListener('input', () => { this.filter = search.value; this.renderRows(); });
    tool(bar, 'plus', text('add'), () => new ClipEditor(this.context).open());
    this.status = this.containerEl.createDiv({ cls: 'spn-sr-only', attr: { 'aria-live': 'polite', role: 'status' } });
    this.list = this.containerEl.createDiv({ cls: 'spn-catalog' });
    this.stop = this.context.catalog.subscribe(() => this.renderRows());
    this.renderRows();
  }
  hide(): void {
    this.stop?.(); this.stop = null;
    this.sorting?.destroy(); this.sorting = null;
    this.list = null; this.status = null;
  }
  private move(drop: DropLocation): void {
    if (this.busy) return;
    this.busy = true;
    void this.context.catalog.move(drop.key, drop.anchor, drop.edge).then(() => {
      const entries = this.context.catalog.snapshot().entries;
      const position = entries.findIndex(entry => entry.key === drop.key);
      this.status?.setText(text('moved', { title: entries[position]?.title ?? '', position: String(position + 1) }));
    }).catch(() => this.context.reportSaveFailure()).finally(() => {
      this.busy = false;
      const rows = this.list?.querySelectorAll<HTMLElement>('[data-entry-key]');
      for (const row of rows ?? []) if (row.dataset.entryKey === drop.key) row.querySelector<HTMLButtonElement>('[data-move-key]')?.focus();
    });
  }
  private renderRows(): void {
    const list = this.list;
    if (!list) return;
    this.sorting?.destroy();
    list.empty();
    const entries = this.context.catalog.snapshot().entries;
    const matches = entries.filter(entry => entry.title.toLocaleLowerCase().includes(this.filter.trim().toLocaleLowerCase()));
    for (const entry of matches) {
      const index = entries.findIndex(item => item.key === entry.key);
      const row = list.createDiv({ cls: 'spn-record', attr: { 'data-entry-key': entry.key } });
      const grip = tool(row, 'grip-vertical', text('drag', { title: entry.title }));
      grip.addClass('spn-grip');
      grip.dataset.moveKey = entry.key;
      grip.addEventListener('keydown', event => {
        const destination = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 :
          event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : -1;
        if (!['Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const target = entries[destination];
        if (target && target.key !== entry.key) this.move({ key: entry.key, anchor: target.key, edge: destination > index ? 'after' : 'before' });
      });
      const name = row.createEl('button', {
        cls: `spn-record-name spn-${shadeFor(entry)}`, text: entry.title, attr: { type: 'button', title: entry.title }
      });
      name.addEventListener('click', () => new ClipEditor(this.context, entry).open());
      const controls = row.createDiv({ cls: 'spn-row-tools' });
      for (const direction of [-1, 1]) {
        const target = entries[index + direction];
        const button = tool(controls, direction < 0 ? 'chevron-up' : 'chevron-down', text(direction < 0 ? 'earlier' : 'later'), () => {
          if (target) this.move({ key: entry.key, anchor: target.key, edge: direction < 0 ? 'before' : 'after' });
        });
        button.disabled = !target;
      }
      tool(controls, 'pencil', text('edit'), () => new ClipEditor(this.context, entry).open());
      tool(controls, 'trash', text('erase'), () => new RemovalDialog(this.context, entry).open());
    }
    if (!matches.length) list.createEl('p', { cls: 'spn-muted', text: text(this.filter ? 'noResults' : 'emptyList') });
    this.sorting = new SortingSurface(list, drop => this.move(drop));
  }
}
