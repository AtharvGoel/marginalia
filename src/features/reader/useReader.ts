import {useEffect,useRef,useState}from'react';
import {desktop}from'../../services/desktop';
import {EpubSession}from'../../services/epub';
import type{Chapter,Entry,Match,Preferences,ReportError,SaveBook}from'../../types';
export function useReader(entry:Entry|null,save:SaveBook,report:ReportError,preferences:Preferences,onKey:(key:string)=>void){
 const host=useRef<HTMLDivElement>(null),session=useRef<EpubSession|null>(null);
 const [loading,setLoading]=useState(false),[pending,setPending]=useState(0);
 const [chapters,setChapters]=useState<Chapter[]>([]),[chapter,setChapter]=useState(''),[chapterHref,setChapterHref]=useState(''),[current,setCurrent]=useState('');
 const [searchText,setSearchText]=useState(''),[matches,setMatches]=useState<Match[]>([]),[searching,setSearching]=useState(false);
 const latest=useRef({save,report,preferences,onKey});latest.current={save,report,preferences,onKey};
 useEffect(()=>{
  if(!entry||!host.current)return;
  let mounted=true,resizeTimer:ReturnType<typeof setTimeout>;
  setLoading(true);setPending(0);setChapters([]);setChapter('');setChapterHref('');setCurrent('');setSearchText('');setMatches([]);setSearching(false);
  const reader=new EpubSession({
   chapters:value=>{if(mounted)setChapters(value);},
   relocated:(cfi,label,href)=>{if(!mounted)return;setCurrent(cfi);setChapter(label);setChapterHref(href);void latest.current.save(entry.id,{location:cfi});},
   key:key=>latest.current.onKey(key),
   error:error=>{if(mounted)latest.current.report(error);},
  });
  session.current=reader;
  const observer=new ResizeObserver(()=>{
   clearTimeout(resizeTimer);
   resizeTimer=setTimeout(()=>{if(mounted)void reader.resize().catch(error=>{if(mounted)latest.current.report(error);});},150);
  });
  observer.observe(host.current);
  const open=async()=>{
   const bytes=await desktop.read(entry.id);
   if(!mounted)return;
   await reader.open(bytes,host.current!,entry,latest.current.preferences);
  };
  void open().catch(error=>{if(mounted)latest.current.report(error);}).finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;observer.disconnect();clearTimeout(resizeTimer);session.current=null;reader.destroy();};
 },[entry?.id]);
 useEffect(()=>{
  const reader=session.current;
  if(!reader)return;
  const timer=setTimeout(()=>{
   if(session.current!==reader)return;
   setPending(count=>count+1);
   void reader.configure(latest.current.preferences).catch(error=>{if(session.current===reader)report(error);}).finally(()=>{if(session.current===reader)setPending(count=>Math.max(0,count-1));});
  },120);
  return()=>clearTimeout(timer);
 },[preferences.theme,preferences.fontSize,preferences.fontFamily,preferences.lineHeight,preferences.margin,preferences.readingWidth,preferences.layout]);
 const navigate=(target:string)=>{
  const reader=session.current;if(!reader)return;
  setPending(count=>count+1);
  void reader.navigate(target).catch(error=>{if(session.current===reader)report(error);}).finally(()=>{if(session.current===reader)setPending(count=>Math.max(0,count-1));});
 };
 const next=()=>{void session.current?.next().catch(report);};
 const previous=()=>{void session.current?.previous().catch(report);};
 const search=async()=>{
  const reader=session.current;
  if(!reader||searching)return;
  setSearching(true);setMatches([]);
  try{const result=await reader.search(searchText);if(session.current===reader)setMatches(result);}
  catch(error){if(session.current===reader)report(error);}
  finally{if(session.current===reader)setSearching(false);}
 };
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(!entry||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement||event.target instanceof HTMLTextAreaElement)return;
   if(event.key==='ArrowRight'){event.preventDefault();next();}
   if(event.key==='ArrowLeft'){event.preventDefault();previous();}
  };
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[entry?.id]);
 return{host,busy:loading||pending>0,chapters,chapter,chapterHref,current,searchText,setSearchText,matches,searching,search,navigate,next,previous};
}
export type ReaderControls=ReturnType<typeof useReader>;
