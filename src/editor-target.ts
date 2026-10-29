import { MarkdownView, type App } from 'obsidian';

/** A weak reference remembers the correct pane without keeping closed editors alive. */
export class EditorTarget {
  private previous: WeakRef<MarkdownView> | null = null;
  constructor(private app: App) {}
  remember(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) this.previous = new WeakRef(view);
  }
  resolve(): MarkdownView | null {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active) return active;
    const previous = this.previous?.deref();
    if (!previous) return null;
    return this.app.workspace.getLeavesOfType('markdown').some(leaf => leaf.view === previous) ? previous : null;
  }
  clear(): void { this.previous = null; }
}
