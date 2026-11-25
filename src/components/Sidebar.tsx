import { AnnotationList } from '../features/reader/AnnotationList';
import { Brand } from './Brand';
import { useEffect, useRef, useState } from 'react';
import type { Entry, Preferences, SaveBook } from '../types';
import type { ReaderControls } from '../features/reader/useReader';
type Props={active:Entry|null;count:number;reader:ReaderControls;save:SaveBook;exit:()=>void;preferences:Preferences;setPreferences:(value:Preferences)=>void};
export function Sidebar({active,count,reader,save,exit,preferences,setPreferences}:Props){
 const [panel,setPanel]=useState<'chapters'|'bookmarks'|'search'|'notes'>('chapters');
 const [dragWidth,setDragWidth]=useState<number|null>(null);
 const nav=useRef<HTMLElement>(null);
 const drag=useRef<{start:number;width:number;latest:number}|null>(null);
 const {chapters,chapterHref,searchText,setSearchText,matches,searching,search,busy,navigate}=reader;
 const limit=(width:number)=>Math.round(Math.max(220,Math.min(420,window.innerWidth-460,width)));
 const width=dragWidth??preferences.sidebarWidth;
 useEffect(()=>{
  if(panel==='chapters')nav.current?.querySelector('[aria-current="location"]')?.scrollIntoView({block:'nearest'});
 },[chapterHref,panel,preferences.sidebarCollapsed]);
 if(active && preferences.sidebarCollapsed)return null;
 return <aside className={'sidebar'+(active?' reader-sidebar':'')+(dragWidth!==null?' is-resizing':'')} style={active?{width}:undefined}>
  {active ? <>
   <div className="reader-sidebar-heading"><Brand compact/><button aria-label="Hide sidebar" title="Hide sidebar" onClick={()=>setPreferences({...preferences,sidebarCollapsed:true})}>‹</button></div>
   <button className="nav-item" onClick={exit}>← All books</button>
   <h2 className="sidebar-title" title={active.title}>{active.title}</h2>
   <div className="tabs" role="group" aria-label="Reader navigation">
    {(['chapters','bookmarks','search','notes']as const).map(value=><button key={value} aria-pressed={panel===value} className={panel===value?'selected':''} onClick={()=>setPanel(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}
   </div>
   <nav ref={nav} aria-label={panel} className="chapter-list">
    {panel==='notes'?<AnnotationList reader={reader}/>:panel==='chapters'?chapters.map((chapter,i)=><button key={chapter.id+i} style={{paddingInlineStart:12+(chapter.depth||0)*12}} aria-current={chapter.href===chapterHref?'location':undefined} onClick={()=>navigate(chapter.href)}>{chapter.label.trim()}</button>):
     panel==='bookmarks'?(active.bookmarks||[]).length?active.bookmarks!.map((cfi,i)=><div className="bookmark" key={cfi}><button onClick={()=>navigate(cfi)}>Bookmark {i+1}</button><button aria-label={'Remove bookmark '+(i+1)} onClick={()=>void save(active.id,{bookmarks:active.bookmarks!.filter(mark=>mark!==cfi)})}>×</button></div>):<p className="muted">Save a place using Bookmark above the page.</p>:
     <><form className="book-search" onSubmit={event=>{event.preventDefault();void search();}}><input aria-label="Search within book" placeholder="Find in this book…" minLength={2} maxLength={100} value={searchText} onChange={event=>setSearchText(event.target.value)}/><button disabled={searching||busy||searchText.trim().length<2}>{searching?'Searching…':'Find'}</button></form><p className="muted">{searching?'Searching chapters…':matches.length+' results (up to 100)'}</p>{matches.map((match,i)=><button className="search-result" key={i} onClick={()=>navigate(match.cfi)}>{match.excerpt}</button>)}</>}
   </nav>
  </>:<><Brand/><div className="eyebrow">YOUR READING SPACE</div><button className="nav-item selected">▤ &nbsp; My library <span>{count}</span></button><p className="sidebar-note">A little room for<br/>your next great read.</p></>}
  <div className="sidebar-footer"><span className="status-dot"/> Offline · Stored on this device</div>
  {active&&<div className="sidebar-resizer" role="separator" aria-label="Sidebar width" aria-orientation="vertical" aria-valuemin={220} aria-valuemax={Math.min(420,window.innerWidth-460)} aria-valuenow={limit(width)} tabIndex={0}
   onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={start:event.clientX,width:limit(width),latest:limit(width)};setDragWidth(limit(width));}}
   onPointerMove={event=>{if(drag.current){const value=limit(drag.current.width+event.clientX-drag.current.start);drag.current.latest=value;setDragWidth(value);}}}
   onPointerUp={event=>{if(drag.current){setPreferences({...preferences,sidebarWidth:drag.current.latest});drag.current=null;setDragWidth(null);event.currentTarget.releasePointerCapture(event.pointerId);}}}
   onPointerCancel={()=>{drag.current=null;setDragWidth(null);}}
   onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?220:event.key==='End'?420:width+(event.key==='ArrowRight'?10:-10);setPreferences({...preferences,sidebarWidth:limit(next)});}}}/>}
 </aside>;
}
