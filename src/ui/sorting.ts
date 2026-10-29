export interface DropLocation { key: string; anchor: string; edge: 'before' | 'after' }

/** Pointer capture keeps a drag coherent outside the small handle, including touch input. */
export class SortingSurface {
  private session: { pointer: number; key: string; originY: number; y: number; engaged: boolean } | null = null;
  private landing: DropLocation | null = null;
  private frame = 0;
  private readonly win: Window;
  constructor(private list: HTMLElement, private commit: (drop: DropLocation) => void) {
    const win = list.ownerDocument.defaultView;
    if (!win) throw new Error('Missing window');
    this.win = win;
    list.addEventListener('pointerdown', this.begin);
    list.addEventListener('pointermove', this.travel);
    list.addEventListener('pointerup', this.finish);
    list.addEventListener('pointercancel', this.cancel);
    list.addEventListener('lostpointercapture', this.cancel);
    list.addEventListener('keydown', this.escape);
  }
  private begin = (event: PointerEvent): void => {
    const handle = (event.target as Element | null)?.closest<HTMLElement>('[data-move-key]');
    if (!handle || !this.list.contains(handle) || event.button !== 0 || !event.isPrimary) return;
    const key = handle.dataset.moveKey;
    if (!key) return;
    event.preventDefault();
    this.session = { pointer: event.pointerId, key, originY: event.clientY, y: event.clientY, engaged: false };
    handle.focus();
    this.list.setPointerCapture(event.pointerId);
  };
  private travel = (event: PointerEvent): void => {
    const session = this.session;
    if (!session || session.pointer !== event.pointerId) return;
    session.y = event.clientY;
    if (!session.engaged && Math.abs(session.y - session.originY) < 5) return;
    session.engaged = true;
    event.preventDefault();
    this.locate();
    if (!this.frame) this.frame = this.win.requestAnimationFrame(this.scroll);
  };
  private locate(): void {
    this.clearMarks();
    const session = this.session;
    if (!session?.engaged) return;
    const rows = Array.from(this.list.querySelectorAll<HTMLElement>('[data-entry-key]'));
    let candidate = rows[rows.length - 1];
    let edge: 'before' | 'after' = 'after';
    rows.find(row => row.dataset.entryKey === session.key)?.classList.add('spn-moving');
    for (const row of rows) {
      const bounds = row.getBoundingClientRect();
      if (session.y < bounds.top + bounds.height / 2) { candidate = row; edge = 'before'; break; }
    }
    if (!candidate?.dataset.entryKey || candidate.dataset.entryKey === session.key) { this.landing = null; return; }
    this.landing = { key: session.key, anchor: candidate.dataset.entryKey, edge };
    candidate.classList.add(edge === 'before' ? 'spn-before' : 'spn-after');
  }
  private scroll = (): void => {
    this.frame = 0;
    if (!this.session?.engaged) return;
    let parent: HTMLElement | null = this.list;
    while (parent) {
      const style = this.win.getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        const box = parent.getBoundingClientRect();
        const y = this.session.y;
        const distance = y < box.top + 35 ? -10 : y > box.bottom - 35 ? 10 : 0;
        if (distance) { parent.scrollTop += distance; this.locate(); }
        break;
      }
      parent = parent.parentElement;
    }
    this.frame = this.win.requestAnimationFrame(this.scroll);
  };
  private finish = (event: PointerEvent): void => {
    if (!this.session || event.pointerId !== this.session.pointer) return;
    const drop = this.landing;
    this.cancel();
    if (drop) this.commit(drop);
  };
  private clearMarks(): void {
    for (const node of this.list.querySelectorAll('.spn-moving, .spn-before, .spn-after')) {
      node.classList.remove('spn-moving', 'spn-before', 'spn-after');
    }
  }
  private cancel = (): void => {
    const pointer = this.session?.pointer;
    this.session = null;
    this.landing = null;
    if (this.frame) this.win.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clearMarks();
    if (pointer !== undefined && this.list.hasPointerCapture(pointer)) this.list.releasePointerCapture(pointer);
  };
  private escape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.session) { event.preventDefault(); event.stopPropagation(); this.cancel(); }
  };
  destroy(): void {
    this.cancel();
    this.list.removeEventListener('pointerdown', this.begin);
    this.list.removeEventListener('pointermove', this.travel);
    this.list.removeEventListener('pointerup', this.finish);
    this.list.removeEventListener('pointercancel', this.cancel);
    this.list.removeEventListener('lostpointercapture', this.cancel);
    this.list.removeEventListener('keydown', this.escape);
  }
}
