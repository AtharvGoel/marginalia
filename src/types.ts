export type Entry = { id: string; title: string; author: string; added: number; lastOpened?: number; location?: string; bookmarks?: string[] };
export type Chapter = { id: string; href: string; label: string; depth?: number; subitems?: Chapter[] };
export type Theme = 'light' | 'sepia' | 'dark';
export type Preferences = {theme:Theme;fontSize:number;fontFamily:'book'|'serif'|'sans'|'mono';lineHeight:number;margin:number;readingWidth:number;layout:'paginated'|'scroll';sidebarWidth:number;sidebarCollapsed:boolean};
export type Match = { cfi: string; excerpt: string };
export type ReportError = (error: unknown) => void;
export type SaveBook = (id: string, values: Partial<Entry>) => Promise<void>;

export type HighlightColor = 'yellow'|'green'|'blue'|'pink';
export type AnnotationInput = {cfi:string;text:string;color:HighlightColor|null;note:string};
export type Annotation = AnnotationInput & {id:string;bookId:string;createdAt:number;updatedAt:number};
export type PassageSelection = {cfi:string;text:string;x:number;y:number};
