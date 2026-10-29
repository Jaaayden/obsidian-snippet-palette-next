import { blankDocument, decodeDocument, type Clip, type PaletteDocument, relocate } from './document';

type Change = (draft: PaletteDocument) => void;

/** Commit only after disk accepts the write; each change sees the last committed state. */
export class Catalog {
  private value = blankDocument();
  private pending: Promise<void> = Promise.resolve();
  private observers = new Set<() => void>();
  constructor(private readonly write: (document: PaletteDocument) => Promise<void>) {}
  initialize(data: unknown): void { this.value = decodeDocument(data); }
  snapshot(): PaletteDocument { return structuredClone(this.value); }
  subscribe(observer: () => void): () => void {
    this.observers.add(observer);
    return () => { this.observers.delete(observer); };
  }
  private commit(change: Change): Promise<void> {
    const operation = this.pending.then(async () => {
      const next = this.snapshot();
      change(next);
      const validated = decodeDocument(next);
      await this.write(validated);
      this.value = validated;
      for (const observer of this.observers) {
        try { observer(); } catch (error) { console.error('Palette view update failed', error); }
      }
    });
    this.pending = operation.catch(() => undefined);
    return operation;
  }
  put(entry: Clip, existing: boolean): Promise<void> {
    const captured = structuredClone(entry);
    return this.commit(draft => {
      const index = draft.entries.findIndex(item => item.key === captured.key);
      if (existing && index < 0) throw new Error('Entry no longer exists');
      if (!existing && index >= 0) throw new Error('Entry already exists');
      if (index < 0) draft.entries.push(captured);
      else draft.entries[index] = captured;
    });
  }
  remove(key: string): Promise<void> {
    return this.commit(draft => { draft.entries = draft.entries.filter(item => item.key !== key); });
  }
  move(key: string, anchor: string, side: 'before' | 'after'): Promise<void> {
    return this.commit(draft => {
      const index = draft.entries.findIndex(item => item.key === anchor);
      if (index < 0) throw new Error('Destination no longer exists');
      draft.entries = relocate(draft.entries, key, index + (side === 'after' ? 1 : 0));
    });
  }
  configure(patch: Partial<PaletteDocument['preferences']>): Promise<void> {
    return this.commit(draft => { draft.preferences = { ...draft.preferences, ...patch }; });
  }
}
