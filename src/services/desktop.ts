import type { Entry, Preferences, Annotation, AnnotationInput } from '../types';
export interface DesktopAPI {
  toggleFullscreen(): Promise<void>;
  getFullscreen(): Promise<boolean>;
  setFullscreen(value:boolean): Promise<void>;
  onFullscreen(callback:(value:boolean)=>void): ()=>void;
  getPreferences(): Promise<Preferences | null>;
  migratePreferences(value: Preferences): Promise<Preferences>;
  setPreferences(value: Preferences): Promise<Preferences>;
  listAnnotations(bookId:string): Promise<Annotation[]>;
  saveAnnotation(bookId:string,value:AnnotationInput): Promise<Annotation[]>;
  removeAnnotation(bookId:string,id:string): Promise<Annotation[]>;
  searchWeb(text:string): Promise<void>;
  list(): Promise<Entry[]>;
  importBooks(): Promise<Entry[]>;
  inspectBook(id: string): Promise<{entry: Entry; cover: string | null}>;
  read(id: string): Promise<Uint8Array>;
  update(id: string, value: Partial<Entry>): Promise<Entry>;
  remove(id: string): Promise<Entry[]>;
}
declare global { interface Window { reader: DesktopAPI } }
export const desktop = window.reader;
