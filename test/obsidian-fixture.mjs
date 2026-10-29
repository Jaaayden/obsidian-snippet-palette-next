// Minimal public-API fixture, authored for this implementation's integration tests.
export const notices = [];
export let locale = 'en';
export const setLocale = value => { locale = value; };
export const getLanguage = () => locale;
export const getIconIds = () => ['text', 'star', 'book', 'search', 'plus', 'grip-vertical', 'swatch-book'];
export const getIcon = name => getIconIds().includes(name) ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : null;
export function setIcon(element, name) { const icon = getIcon(name); if (icon) element.append(icon); }
export class Notice { constructor(message) { notices.push(message); } }
class Lifetime {
  disposals = [];
  register(fn) { this.disposals.push(fn); }
  registerEvent(fn) { if (typeof fn === 'function') this.register(fn); }
  dispose() { for (const fn of this.disposals.splice(0)) fn(); }
}
export class Plugin extends Lifetime {
  manifest = { id: 'snippet-palette-next', version: '1.0.0' };
  commands = new Map(); ribbons = []; constructors = new Map(); tabs = [];
  constructor(app) { super(); this.app = app; }
  async loadData() { return this.saved; }
  async saveData(value) { this.saved = structuredClone(value); }
  registerView(type, factory) { this.constructors.set(type, factory); }
  addCommand(command) { this.commands.set(command.id, command); }
  removeCommand(id) { this.commands.delete(id); }
  addRibbonIcon(icon, label, handler) { const button = document.createElement('button'); button.addEventListener('click', handler); this.ribbons.push(button); return button; }
  addSettingTab(tab) { this.tabs.push(tab); }
}
export class ItemView extends Lifetime {
  constructor(leaf) { super(); this.leaf = leaf; this.app = leaf.app; this.contentEl = document.createElement('div'); }
}
export class MarkdownView {}
export class PluginSettingTab {
  constructor(app) { this.app = app; this.containerEl = document.createElement('section'); }
}
export class Modal {
  static opened = [];
  constructor(app) { this.app = app; this.contentEl = document.createElement('section'); }
  setTitle(title) { this.title = title; }
  open() { Modal.opened.push(this); this.onOpen(); }
  close() { this.closed = true; this.onClose?.(); }
}
export class SuggestModal extends Modal { setPlaceholder(value) { this.placeholder = value; } }
export class Setting {
  constructor(parent) {
    this.settingEl = parent.createDiv({ cls: 'setting-item' });
    this.nameEl = this.settingEl.createDiv(); this.descEl = this.settingEl.createDiv();
    this.controlEl = this.settingEl.createDiv();
  }
  setName(value) { this.nameEl.textContent = value; return this; }
  setDesc(value) { this.descEl.textContent = value; return this; }
  setClass(value) { this.settingEl.classList.add(value); return this; }
  field(kind, configure) {
    const element = this.controlEl.createEl(kind === 'toggle' ? 'input' : kind);
    if (kind === 'toggle') element.type = 'checkbox';
    const control = {
      inputEl: element, buttonEl: element,
      setValue(value) { if (kind === 'toggle') element.checked = value; else element.value = value; return this; },
      setButtonText(value) { element.textContent = value; return this; },
      setDisabled(value) { element.disabled = value; return this; },
      setCta() { return this; }, setWarning() { return this; },
      addOption(value, label) { const option = element.createEl('option', { text: label }); option.value = value; return this; },
      onChange(fn) { element.addEventListener('input', () => fn(kind === 'toggle' ? element.checked : element.value)); return this; },
      onClick(fn) { element.addEventListener('click', fn); return this; }
    };
    configure(control); return this;
  }
  addText(fn) { return this.field('input', fn); }
  addTextArea(fn) { return this.field('textarea', fn); }
  addToggle(fn) { return this.field('toggle', fn); }
  addDropdown(fn) { return this.field('select', fn); }
  addButton(fn) { return this.field('button', fn); }
}
