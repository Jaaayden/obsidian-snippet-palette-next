import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { PaletteContext } from '../contracts';
import { shadeFor } from '../core/document';
import { text } from '../words';
import { ClipEditor } from './editor';
import { glyph, tool } from './elements';

export const WORKSPACE_KIND = 'spn-workspace';
export class PaletteWorkspace extends ItemView {
  private query = '';
  private area: HTMLElement | null = null;
  private destination: HTMLElement | null = null;
  constructor(leaf: WorkspaceLeaf, private context: PaletteContext) { super(leaf); }
  getViewType(): string { return WORKSPACE_KIND; }
  getDisplayText(): string { return text('palette'); }
  getIcon(): string { return 'swatch-book'; }
  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('spn-workspace');
    const bar = this.contentEl.createDiv({ cls: 'spn-bar' });
    this.destination = bar.createSpan({ cls: 'spn-destination' });
    const searchToggle = tool(bar, 'search', text('search'));
    searchToggle.setAttribute('aria-expanded', 'false');
    tool(bar, 'plus', text('add'), () => new ClipEditor(this.context).open());
    const search = this.contentEl.createEl('input', {
      cls: 'spn-filter', type: 'search', attr: { placeholder: text('query'), 'aria-label': text('search') }
    });
    search.hidden = true;
    this.query = '';
    const hide = (): void => {
      search.hidden = true;
      this.query = search.value = '';
      searchToggle.setAttribute('aria-expanded', 'false');
      searchToggle.setAttribute('aria-label', text('search'));
      searchToggle.title = text('search');
      this.paint();
      searchToggle.focus();
    };
    searchToggle.addEventListener('click', () => {
      if (!search.hidden) { hide(); return; }
      search.hidden = false;
      searchToggle.setAttribute('aria-expanded', 'true');
      searchToggle.setAttribute('aria-label', text('closeSearch'));
      searchToggle.title = text('closeSearch');
      search.focus();
    });
    search.addEventListener('input', () => { this.query = search.value; this.paint(); });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(); }
    });
    this.area = this.contentEl.createDiv({ cls: 'spn-palette' });
    this.register(this.context.catalog.subscribe(() => this.paint()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.paint()));
    this.paint();
  }
  private paint(): void {
    const area = this.area;
    if (!area || !this.destination) return;
    const name = this.context.targetName();
    this.destination.setText(name ? text('destination', { title: name }) : text('noDestination'));
    const document = this.context.catalog.snapshot();
    area.dataset.flow = document.preferences.flow;
    area.empty();
    const filter = this.query.trim().toLocaleLowerCase();
    const matches = document.entries.filter(entry => entry.title.toLocaleLowerCase().includes(filter));
    for (const entry of matches) {
      const button = area.createEl('button', {
        cls: `spn-token spn-${shadeFor(entry)}`,
        attr: { type: 'button', 'aria-label': text('insertLabel', { title: entry.title }), title: entry.body }
      });
      if (document.preferences.icons) glyph(button.createSpan({ cls: 'spn-glyph' }), entry.glyph);
      button.createSpan({ text: entry.title });
      button.addEventListener('mousedown', event => { if (event.button === 0) event.preventDefault(); });
      button.addEventListener('click', () => this.context.insert(entry.key));
    }
    if (!matches.length) area.createEl('p', { cls: 'spn-muted', text: text(filter ? 'noResults' : 'emptyList') });
  }
  async onClose(): Promise<void> { this.area = null; this.destination = null; }
}
