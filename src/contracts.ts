import type { App } from 'obsidian';
import type { Catalog } from './core/catalog';

export interface PaletteContext {
  app: App;
  catalog: Catalog;
  version: string;
  createKey(): string;
  open(): Promise<void>;
  insert(key: string): void;
  targetName(): string | null;
  reportSaveFailure(): void;
}
