import type { Clip } from './document';

export type Insertion = { status: 'empty' | 'duplicate' } | {
  status: 'ready'; start: number; end: number; text: string;
};

export function planInsertion(note: string, clip: Clip, selection: readonly [number, number]): Insertion {
  if (clip.body.length === 0) return { status: 'empty' };
  const first = clip.body.match(/^[^\r\n]*/)?.[0] ?? '';
  if (clip.unique && first.length > 0 && note.includes(first)) return { status: 'duplicate' };
  const newline = note.includes('\r\n') ? '\r\n' : '\n';
  let text = clip.body.replace(/\r?\n/g, newline);
  if (!text.endsWith(newline)) text += newline;
  let start: number;
  let end: number;
  if (clip.placement === 'selection') {
    [start, end] = selection;
    if (start < 0 || end < start || end > note.length) throw new Error('Selection is outside the note');
  } else if (clip.placement === 'ending') {
    start = end = note.length;
    if (note.length && !note.endsWith('\n')) text = newline + text;
  } else {
    start = end = 0;
    // Match a complete YAML block at the very beginning, accepting an optional BOM.
    const opening = /^(?:\uFEFF)?---[^\S\r\n]*\r?\n/.exec(note);
    if (opening) {
      const remainder = note.slice(opening[0].length);
      const closing = /^(?:---|\.\.\.)[^\S\r\n]*(?:\r?\n|$)/m.exec(remainder);
      if (closing) {
        start = end = opening[0].length + closing.index + closing[0].length;
        if (start === note.length && !note.endsWith('\n')) text = newline + text;
      }
    }
  }
  return { status: 'ready', start, end, text };
}
