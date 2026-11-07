import ePub, { Book, Rendition } from 'epubjs';
import type Section from 'epubjs/types/section';
import type { Chapter, Entry, Match, Preferences } from '../types';

export const palettes = {
  light: { background: '#fffdf8', color: '#292d28' },
  sepia: { background: '#f2e6cc', color: '#453b2d' },
  dark: { background: '#222923', color: '#e4e8df' },
};
const flatten = (items: Chapter[]): Chapter[] => items.flatMap(item => [item, ...flatten(item.subitems || [])]);
type Callbacks = {
  metadata(value: Partial<Entry>): Promise<void>;
  chapters(value: Chapter[]): void;
  relocated(cfi: string, chapter: string): void;
  exit(): void;
  error(error: unknown): void;
};

/** All epub.js-specific lifecycle and security behavior lives behind this interface. */
export class EpubSession {
  private book?: Book;
  private rendition?: Rendition;
  private disposed = false;
  private searchGeneration = 0;
  constructor(private callbacks: Callbacks) {}
  async open(bytes: Uint8Array, host: HTMLElement, entry: Entry) {
    const book = ePub(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    this.book = book;
    await book.ready;
    if (this.disposed) return;
    const metadata = await book.loaded.metadata;
    await this.callbacks.metadata({ title: metadata.title || entry.title, author: metadata.creator || entry.author });
    if (this.disposed) return;
    const toc = flatten((await book.loaded.navigation).toc as Chapter[]);
    this.callbacks.chapters(toc);
    const rendition = book.renderTo(host, { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
    this.rendition = rendition;
    rendition.hooks.content.register((content: { document: Document }) => {
      content.document.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(el => el.remove());
      content.document.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (/^on/i.test(attr.name) || /^(javascript|https?|ftp):/i.test(attr.value.trim()) && ['href', 'src', 'xlink:href', 'action'].includes(attr.name)) el.removeAttribute(attr.name);
        });
      });
    });
    rendition.on('relocated', (location: { start: { cfi: string; href: string } }) => {
      if (this.disposed) return;
      const found = toc.find(c => c.href.split('#')[0] === location.start.href.split('#')[0]);
      this.callbacks.relocated(location.start.cfi, found?.label.trim() || 'Reading');
    });
    rendition.on('keyup', (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') void this.next().catch(this.callbacks.error);
      if (event.key === 'ArrowLeft') void this.previous().catch(this.callbacks.error);
      if (event.key === 'Escape') this.callbacks.exit();
    });
    try { await rendition.display(entry.location || undefined); }
    catch (error) {
      if (this.disposed) return;
      if (!entry.location) throw error;
      await rendition.display();
    }
  }
  appearance(preferences: Preferences) {
    if (this.disposed || !this.rendition) return;
    const { theme, fontSize } = preferences;
    this.rendition.themes.default({ body: { 'background-color': palettes[theme].background, color: palettes[theme].color }, a: { color: theme === 'dark' ? '#b6d7ad' : '#3b6747' } });
    this.rendition.themes.fontSize(fontSize + 'px');
  }
  async next() { if (!this.disposed) await this.rendition?.next(); }
  async previous() { if (!this.disposed) await this.rendition?.prev(); }
  async navigate(target: string) { if (!this.disposed) await this.rendition?.display(target); }
  async search(text: string): Promise<Match[]> {
    const book = this.book, token = ++this.searchGeneration;
    if (!book || this.disposed || text.trim().length < 2) return [];
    const sections: Section[] = [], matches: Match[] = [];
    book.spine.each((section: Section) => sections.push(section));
    for (const section of sections) {
      if (this.disposed || token !== this.searchGeneration) return [];
      await section.load(book.load.bind(book));
      if (this.disposed || token !== this.searchGeneration) return [];
      matches.push(...section.find(text.trim()) as unknown as Match[]);
      if (matches.length >= 100) break;
    }
    return matches.slice(0, 100);
  }
  destroy() {
    this.disposed = true;
    this.searchGeneration++;
    this.book?.destroy();
  }
}

