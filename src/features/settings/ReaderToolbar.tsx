import{useEffect,useRef,useState}from'react';
import type{Entry,Preferences,SaveBook,Theme}from'../../types';
type Props={entry:Entry;chapter:string;current:string;preferences:Preferences;setPreferences:(value:Preferences)=>void;save:SaveBook;fullscreen:boolean;toggleFullscreen:()=>void;exit:()=>void};
export function ReaderToolbar({entry,chapter,current,preferences:p,setPreferences,save,fullscreen,toggleFullscreen,exit}:Props){
 const[settings,setSettings]=useState(false);
 const settingsButton=useRef<HTMLButtonElement>(null);
 const patch=(value:Partial<Preferences>)=>setPreferences({...p,...value});
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&settings){setSettings(false);settingsButton.current?.focus();}};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[settings]);
 return <header className="reader-toolbar">
  <button className="icon-button" aria-label={p.sidebarCollapsed?'Show sidebar':'Hide sidebar'} aria-expanded={!p.sidebarCollapsed} title="Toggle sidebar" onClick={()=>patch({sidebarCollapsed:!p.sidebarCollapsed})}>☰</button>
  <button className="icon-button" aria-label="Back to library" title="Back to library" onClick={exit}>←</button>
  <div className="reader-title" title={chapter||entry.title}>{chapter||entry.title}</div>
  <label className="quick-size">Text <input aria-label="Text size" type="range" min="14" max="30" value={p.fontSize} onChange={event=>patch({fontSize:Number(event.target.value)})}/></label>
  <select aria-label="Reading theme" value={p.theme} onChange={event=>patch({theme:event.target.value as Theme})}><option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option></select>
  <button ref={settingsButton} aria-label="Reading settings" aria-expanded={settings} aria-controls="reading-settings" className={'settings-toggle'+(settings?' selected':'')} onClick={()=>setSettings(!settings)}>Aa</button>
  <button className="fullscreen-button" aria-label={fullscreen?'Exit full screen':'Full screen'} title={fullscreen?'Exit full screen (Esc)':'Full screen (F11)'} onClick={toggleFullscreen}>{fullscreen?'↙':'⛶'}</button>
  <button disabled={!current||entry.bookmarks?.includes(current)} onClick={()=>void save(entry.id,{bookmarks:[...(entry.bookmarks||[]),current]})}>＋ Bookmark</button>
  {settings&&<section id="reading-settings" className="reading-settings" aria-label="Reading preferences">
   <div className="settings-heading"><h2>Make yourself comfortable</h2><button aria-label="Close reading settings" onClick={()=>{setSettings(false);settingsButton.current?.focus();}}>×</button></div>
   <label>Font<select aria-label="Reading font" value={p.fontFamily} onChange={event=>patch({fontFamily:event.target.value as Preferences['fontFamily']})}><option value="book">Book original</option><option value="serif">Georgia · serif</option><option value="sans">Segoe UI · sans serif</option><option value="mono">Consolas · monospace</option></select></label>
   <label>Line spacing <output>{p.lineHeight.toFixed(1)}</output><input aria-label="Line spacing" type="range" min="1.3" max="2.2" step="0.1" value={p.lineHeight} onChange={event=>patch({lineHeight:Number(event.target.value)})}/></label>
   <label>Margins <output>{p.margin}px</output><input aria-label="Reading margins" type="range" min="8" max="64" step="4" value={p.margin} onChange={event=>patch({margin:Number(event.target.value)})}/></label>
   <label>Reading width <output>{p.readingWidth}px</output><input aria-label="Reading width" type="range" min="480" max="1200" step="40" value={p.readingWidth} onChange={event=>patch({readingWidth:Number(event.target.value)})}/></label>
   <label>Reading mode<select aria-label="Reading mode" value={p.layout} onChange={event=>patch({layout:event.target.value as Preferences['layout']})}><option value="paginated">Turn pages</option><option value="scroll">Continuous scrolling</option></select></label>
   <p>Preferences are saved automatically. Your place follows you when the layout changes.</p>
  </section>}
 </header>;
}
