import { Modal, Notice, Setting, SuggestModal, getIconIds } from 'obsidian';
import type { PaletteContext } from '../contracts';
import { newClip, shades, type Clip, type Placement, type Shade } from '../core/document';
import { text } from '../words';
import { glyph } from './elements';

export class GlyphChooser extends SuggestModal<string> {
  private readonly options = getIconIds();
  constructor(private context: PaletteContext, private accept: (name: string) => void) {
    super(context.app);
    this.setPlaceholder(text('iconQuery'));
    this.limit = 50;
  }
  getSuggestions(query: string): string[] {
    const words = query.toLowerCase().trim().split(/\s+/);
    return this.options.filter(option => words.every(word => option.includes(word))).slice(0, this.limit);
  }
  renderSuggestion(value: string, item: HTMLElement): void {
    item.addClass('spn-glyph-result');
    glyph(item.createSpan({ cls: 'spn-glyph' }), value);
    item.createSpan({ text: value });
  }
  onChooseSuggestion(value: string): void { this.accept(value); }
}

export class ClipEditor extends Modal {
  private working: Clip;
  private pending = false;
  constructor(private context: PaletteContext, private source?: Clip) {
    super(context.app);
    this.working = source ? structuredClone(source) : newClip(context.createKey());
  }
  onOpen(): void {
    this.setTitle(text(this.source ? 'edit' : 'add'));
    this.contentEl.addClass('spn-editor');
    new Setting(this.contentEl).setName(text('title')).addText(input => {
      input.setValue(this.working.title).onChange(value => { this.working.title = value; });
      input.inputEl.setAttribute('aria-label', text('title'));
    });
    const icon = new Setting(this.contentEl).setName(text('icon'));
    const preview = icon.controlEl.createSpan({ cls: 'spn-glyph' });
    glyph(preview, this.working.glyph);
    icon.addButton(button => button.setButtonText(text('choose')).onClick(() => {
      new GlyphChooser(this.context, value => { this.working.glyph = value; glyph(preview, value); }).open();
    }));
    new Setting(this.contentEl).setName(text('shade')).addDropdown(input => {
      for (const shade of shades) input.addOption(shade, text(shade));
      input.setValue(this.working.shade).onChange(value => { this.working.shade = value as Shade; });
    });
    new Setting(this.contentEl).setName(text('position')).addDropdown(input => {
      for (const placement of ['selection', 'beginning', 'ending'] as const) input.addOption(placement, text(placement));
      input.setValue(this.working.placement).onChange(value => { this.working.placement = value as Placement; });
    });
    new Setting(this.contentEl).setName(text('unique')).setDesc(text('uniqueHelp')).addToggle(input => {
      input.setValue(this.working.unique).onChange(value => { this.working.unique = value; });
    });
    new Setting(this.contentEl).setName(text('body')).setClass('spn-body-field').addTextArea(input => {
      input.setValue(this.working.body).onChange(value => { this.working.body = value; });
      input.inputEl.rows = 9;
      input.inputEl.setAttribute('aria-label', text('body'));
    });
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(text('cancel')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(text('save')).setCta().onClick(() => {
        if (this.pending) return;
        if (!this.working.title.trim()) { new Notice(text('titleMissing')); return; }
        this.pending = true;
        button.setDisabled(true);
        const saved = { ...this.working, title: this.working.title.trim() };
        void this.context.catalog.put(saved, Boolean(this.source)).then(() => this.close()).catch(() => {
          this.pending = false;
          button.setDisabled(false);
          this.context.reportSaveFailure();
        });
      }));
  }
  onClose(): void { this.contentEl.empty(); }
}

export class RemovalDialog extends Modal {
  constructor(private context: PaletteContext, private entry: Clip) { super(context.app); }
  onOpen(): void {
    this.setTitle(text('erase'));
    this.contentEl.createEl('p', { text: text('removeQuestion', { title: this.entry.title }) });
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(text('cancel')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(text('remove')).setWarning().onClick(() => {
        button.setDisabled(true);
        void this.context.catalog.remove(this.entry.key).then(() => this.close()).catch(() => {
          button.setDisabled(false); this.context.reportSaveFailure();
        });
      }));
  }
  onClose(): void { this.contentEl.empty(); }
}
