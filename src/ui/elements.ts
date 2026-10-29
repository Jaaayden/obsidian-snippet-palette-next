import { getIcon, setIcon } from 'obsidian';

export function glyph(container: HTMLElement, name: string): void {
  container.empty();
  const known = getIcon(name);
  if (known) container.appendChild(known);
  else setIcon(container, 'text');
  container.setAttribute('aria-hidden', 'true');
}
export function tool(parent: HTMLElement, name: string, label: string, invoke?: () => void): HTMLButtonElement {
  const button = parent.createEl('button', { cls: 'spn-tool', attr: { type: 'button', 'aria-label': label, title: label } });
  glyph(button.createSpan(), name);
  if (invoke) button.addEventListener('click', invoke);
  return button;
}
