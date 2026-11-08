import ePub, { Book, Rendition } from 'epubjs';
import type Section from 'epubjs/types/section';
import type { Chapter,Entry,Match,Preferences } from '../types';
export const palettes={
 light:{background:'#fffdf8',color:'#292d28'},sepia:{background:'#f2e6cc',color:'#453b2d'},dark:{background:'#222923',color:'#e4e8df'},
};
const fonts={serif:'Georgia, "Times New Roman", serif',sans:'"Segoe UI", Arial, sans-serif',mono:'Consolas, "Courier New", monospace'};
const flatten=(items:Chapter[],depth=0):Chapter[]=>items.flatMap(item=>[{...item,depth},...flatten(item.subitems||[],depth+1)]);
type Callbacks={chapters(value:Chapter[]):void;relocated(cfi:string,chapter:string,href:string):void;error(error:unknown):void};
export class EpubSession{
 private book?:Book;
 private rendition?:Rendition;
 private host?:HTMLElement;
 private preferences?:Preferences;
 private toc:Chapter[]=[];
 private disposed=false;
 private ready=false;
 private searchGeneration=0;
 private lastCfi?:string;
 private fingerprint='';
 private operations=Promise.resolve();
 constructor(private callbacks:Callbacks){}
 private enqueue(work:()=>Promise<void>){
  const next=this.operations.then(async()=>{if(!this.disposed)await work();});
  this.operations=next.catch(()=>{});
  return next;
 }
 async open(bytes:Uint8Array,host:HTMLElement,entry:Entry,preferences:Preferences){
  const book=ePub(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)as ArrayBuffer);
  this.book=book;this.host=host;this.lastCfi=entry.location;this.preferences=preferences;
  await book.ready;
  if(this.disposed)return;
  this.toc=flatten((await book.loaded.navigation).toc as Chapter[]);
  this.callbacks.chapters(this.toc);this.ready=true;
  await this.enqueue(()=>this.render());
 }
 configure(preferences:Preferences){
  this.preferences=preferences;
  return this.ready?this.enqueue(()=>this.render()):Promise.resolve();
 }
 resize(){return this.ready?this.enqueue(()=>this.render()):Promise.resolve();}
 private async render(){
  const p=this.preferences,host=this.host,book=this.book;
  if(!p||!host||!book||this.disposed)return;
  const width=Math.floor(host.clientWidth),height=Math.floor(host.clientHeight);
  if(width<50||height<50)return;
  const key=JSON.stringify([width,height,p.theme,p.fontSize,p.fontFamily,p.lineHeight,p.layout]);
  if(key===this.fingerprint)return;
  const target=this.lastCfi;
  const old=this.rendition;
  this.rendition=undefined;
  old?.destroy();
  host.replaceChildren();
  const r=book.renderTo(host,{width,height,manager:p.layout==='scroll'?'continuous':'default',flow:p.layout==='scroll'?'scrolled':'paginated',spread:'none',allowScriptedContent:false});
  this.rendition=r;
  const family=p.fontFamily==='book'?{}:{'font-family':fonts[p.fontFamily]+' !important'};
  r.themes.default({
   body:{'background-color':palettes[p.theme].background+' !important',color:palettes[p.theme].color+' !important','line-height':p.lineHeight+' !important',...family},
   'p, li, blockquote':{'line-height':p.lineHeight+' !important',...family},
   a:{color:p.theme==='dark'?'#b6d7ad':'#3b6747'},
  });
  r.themes.fontSize(p.fontSize+'px');
  r.hooks.content.register((content:{document:Document})=>{
   content.document.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(el=>el.remove());
   content.document.querySelectorAll('*').forEach(el=>Array.from(el.attributes).forEach(attr=>{
    if(/^on/i.test(attr.name)||/^(javascript|https?|ftp):/i.test(attr.value.trim())&&['href','src','xlink:href','action'].includes(attr.name))el.removeAttribute(attr.name);
   }));
  });
  r.on('relocated',(location:{start:{cfi:string;href:string}})=>{
   if(this.disposed||this.rendition!==r)return;
   this.lastCfi=location.start.cfi;
   const found=this.toc.find(chapter=>chapter.href.split('#')[0]===location.start.href.split('#')[0]);
   this.callbacks.relocated(location.start.cfi,found?.label.trim()||'Reading',found?.href||location.start.href);
  });
  r.on('keyup',(event:KeyboardEvent)=>{
   if(event.key==='ArrowRight')void this.next().catch(this.callbacks.error);
   if(event.key==='ArrowLeft')void this.previous().catch(this.callbacks.error);
  });
  try{await r.display(target);}
  catch(error){if(this.disposed)return;if(!target)throw error;await r.display();}
  if(!this.disposed&&this.rendition===r){this.fingerprint=key;host.dataset.layout=p.layout;}
 }
 next(){return this.enqueue(async()=>{await this.rendition?.next();});}
 previous(){return this.enqueue(async()=>{await this.rendition?.prev();});}
 navigate(target:string){return this.enqueue(async()=>{await this.rendition?.display(target);});}
 async search(text:string):Promise<Match[]>{
  const book=this.book,token=++this.searchGeneration;
  if(!book||this.disposed||text.trim().length<2)return[];
  const sections:Section[]=[],matches:Match[]=[];
  book.spine.each((section:Section)=>sections.push(section));
  for(const section of sections){
   if(this.disposed||token!==this.searchGeneration)return[];
   await section.load(book.load.bind(book));
   if(this.disposed||token!==this.searchGeneration)return[];
   matches.push(...section.find(text.trim())as unknown as Match[]);
   if(matches.length>=100)break;
  }
  return matches.slice(0,100);
 }
 destroy(){this.disposed=true;this.searchGeneration++;this.book?.destroy();}
}
