export type Entry = { id: string; title: string; author: string; added: number; lastOpened?: number; location?: string; bookmarks?: string[] };
export type Chapter = { id: string; href: string; label: string; subitems?: Chapter[] };
export type Theme = 'light' | 'sepia' | 'dark';
export type Preferences = { theme: Theme; fontSize: number };
export type Match = { cfi: string; excerpt: string };
export type ReportError = (error: unknown) => void;
export type SaveBook = (id: string, values: Partial<Entry>) => Promise<void>;

