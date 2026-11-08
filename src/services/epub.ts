import ePub, { Book, Rendition, EpubCFI, type Contents } from 'epubjs';
import type Section from 'epubjs/types/section';
import type { Chapter,Entry,Match,Preferences } from '../types';
export const palettes={
 light:{background:'#fffdf8',color:'#292d28'},sepia:{background:'#f2e6cc',color:'#453b2d'},dark:{background:'#222923',color:'#e4e8df'},
};
const fonts={serif:'Georgia, "Times New Roman", serif',sans:'"Segoe UI", Arial, sans-serif',mono:'Consolas, "Courier New", monospace'};
const flatten=(items:Chapter[],depth=0):Chapter[]=>items.flatMap(item=>[{...item,depth},...flatten(item.subitems||[],depth+1)]);
type Callbacks={chapters(value:Chapter[]):void;relocated(cfi:string,chapter:string,href:string):void;error(error:unknown):void;key(key:string):void};
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
 private acceptLocations=false;
 private activate=()=>{this.acceptLocations=true;};
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
  host.addEventListener('wheel',this.activate,{capture:true,passive:true});
  host.addEventListener('pointerdown',this.activate,true);
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
 private async alignScroll(r:Rendition,target?:string){
  if(this.preferences?.layout!=='scroll'||!target?.startsWith('epubcfi('))return;
  const section=new EpubCFI(target).spinePos;
  const deadline=performance.now()+1000;
  let stableSince=performance.now(),previousHeight=-1;
  while(performance.now()<deadline){
   if(this.disposed||this.rendition!==r||this.acceptLocations)return;
   const contents=(r.getContents()as unknown as Contents[]).find(content=>content.sectionIndex===section);
   // File/blob sandbox origins may hide frameElement; match the owned document instead.
   const frame=contents?.window.frameElement as HTMLIFrameElement|null || Array.from(this.host?.querySelectorAll<HTMLIFrameElement>('iframe')||[]).find(candidate=>candidate.contentDocument===contents?.document);
   const container=this.host?.querySelector<HTMLElement>('.epub-container');
   if(contents&&frame&&container){
    const position=await contents.locationOf(target);
    const box=container.getBoundingClientRect();
    const top=frame.getBoundingClientRect().top+position.top-box.top;
    const before=container.scrollTop;
    const height=container.scrollHeight;
    container.scrollTop=Math.max(0,Math.min(height-container.clientHeight,before+top-8));
    const moved=Math.abs(container.scrollTop-before)>1;
    if(moved||height!==previousHeight||top<0||top>=box.height)stableSince=performance.now();
    else if(performance.now()-stableSince>=300)return;
    previousHeight=height;
   }else stableSince=performance.now();
   // The continuous manager trims neighbouring views after 250ms.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  }
 }
 private async render(){
  const p=this.preferences,host=this.host,book=this.book;
  if(!p||!host||!book||this.disposed)return;
  const width=Math.floor(host.clientWidth),height=Math.floor(host.clientHeight);
  if(width<50||height<50)return;
  const key=JSON.stringify([width,height,p.theme,p.fontSize,p.fontFamily,p.lineHeight,p.layout]);
  if(key===this.fingerprint)return;
  const target=this.lastCfi;
  this.acceptLocations=false;
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
   content.document.addEventListener('wheel',this.activate,{capture:true,passive:true});
   content.document.addEventListener('pointerdown',this.activate,true);
   content.document.addEventListener('keydown',this.activate,true);
   content.document.addEventListener('keydown',event=>{if((event.key==='F11'||event.key==='Escape')&&!event.repeat){event.preventDefault();this.callbacks.key(event.key);}},true);
   content.document.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(el=>el.remove());
   content.document.querySelectorAll('*').forEach(el=>Array.from(el.attributes).forEach(attr=>{
    if(/^on/i.test(attr.name)||/^(javascript|https?|ftp):/i.test(attr.value.trim())&&['href','src','xlink:href','action'].includes(attr.name))el.removeAttribute(attr.name);
   }));
  });
  r.on('relocated',(location:{start:{cfi:string;href:string}})=>{
   if(this.disposed||this.rendition!==r)return;
   if(this.acceptLocations||!this.lastCfi)this.lastCfi=location.start.cfi;
   const currentHref=this.book?.spine.get(this.lastCfi)?.href||location.start.href;
   const found=this.toc.find(chapter=>chapter.href.split('#')[0]===currentHref.split('#')[0]);
   this.callbacks.relocated(this.lastCfi,found?.label.trim()||'Reading',found?.href||currentHref);
  });
  r.on('keyup',(event:KeyboardEvent)=>{
   if(event.key==='ArrowRight')void this.next().catch(this.callbacks.error);
   if(event.key==='ArrowLeft')void this.previous().catch(this.callbacks.error);
  });
  try{await r.display(target);}
  catch(error){if(this.disposed)return;if(!target)throw error;this.lastCfi=undefined;await r.display();}
  // Align once more after theme injection and font metrics have settled.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  if(!this.disposed&&this.rendition===r&&!this.acceptLocations&&this.lastCfi)await r.display(this.lastCfi);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  await this.alignScroll(r,this.lastCfi);
  if(!this.disposed&&this.rendition===r){this.fingerprint=key;host.dataset.layout=p.layout;}
 }
 next(){return this.enqueue(async()=>{this.acceptLocations=true;await this.rendition?.next();});}
 previous(){return this.enqueue(async()=>{this.acceptLocations=true;await this.rendition?.prev();});}
 navigate(target:string){return this.enqueue(async()=>{
  const book=this.book,r=this.rendition;
  if(!book||!r)return;
  let destination=target;
  if(!target.startsWith('epubcfi(')){
   const section=book.spine.get(target);
   if(section){
    await section.load(book.load.bind(book));
    const fragment=target.split('#')[1];
    const body=section.document.getElementsByTagName('body')[0];
    const element=fragment?section.document.getElementById(decodeURIComponent(fragment)):body?.firstElementChild||body;
    if(element)destination=section.cfiFromElement(element);
   }
  }
  this.acceptLocations=false;
  this.lastCfi=destination.startsWith('epubcfi(')?destination:undefined;
  await r.display(destination);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  if(!this.disposed&&this.rendition===r&&!this.acceptLocations)await r.display(destination);
  await this.alignScroll(r,destination);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 });}
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
 destroy(){this.host?.removeEventListener('wheel',this.activate,true);this.host?.removeEventListener('pointerdown',this.activate,true);this.disposed=true;this.searchGeneration++;this.book?.destroy();}
}
