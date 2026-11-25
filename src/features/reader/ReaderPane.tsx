import {PassageMenu} from './PassageMenu';
import type{Entry,Preferences,SaveBook}from'../../types';
import{palettes}from'../../services/epub';
import{ReaderToolbar}from'../settings/ReaderToolbar';
import type{ReaderControls}from'./useReader';
type Props={entry:Entry;reader:ReaderControls;preferences:Preferences;setPreferences:(value:Preferences)=>void;save:SaveBook;fullscreen:boolean;toggleFullscreen:()=>void;exit:()=>void};
export function ReaderPane({entry,reader,preferences,setPreferences,save,fullscreen,toggleFullscreen,exit}:Props){
 return <>
  <ReaderToolbar entry={entry} chapter={reader.chapter} current={reader.current} preferences={preferences} setPreferences={setPreferences} save={save} fullscreen={fullscreen} toggleFullscreen={toggleFullscreen} exit={exit}/>
  <div className="reading-area" style={{background:palettes[preferences.theme].background,padding:preferences.margin}}>
   {reader.busy&&<div className="loading" role="status">Preparing your page…</div>}
   <div className="reader-page" style={{maxWidth:preferences.readingWidth}}><div ref={reader.host} className="epub-host"/></div>
  </div>
  {reader.annotations.selection&&<PassageMenu key={reader.annotations.selection.cfi} actions={reader.annotations}/>}
  <footer className="reader-footer"><button onClick={reader.previous}>← Previous</button><span>{reader.chapter||'Use the arrow keys to turn pages'}</span><button onClick={reader.next}>Next →</button></footer>
 </>;
}
