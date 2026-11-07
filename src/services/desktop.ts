import type { Entry, Preferences } from '../types';
export interface DesktopAPI {
  getPreferences(): Promise<Preferences | null>;
  migratePreferences(value: Preferences): Promise<Preferences>;
  setPreferences(value: Preferences): Promise<Preferences>;
  list(): Promise<Entry[]>;
  importBooks(): Promise<Entry[]>;
  read(id: string): Promise<Uint8Array>;
  update(id: string, value: Partial<Entry>): Promise<Entry>;
  remove(id: string): Promise<Entry[]>;
}
declare global { interface Window { reader: DesktopAPI } }
export const desktop = window.reader;


