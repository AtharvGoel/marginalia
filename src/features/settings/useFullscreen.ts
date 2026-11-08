import{useEffect,useState}from'react';
import{desktop}from'../../services/desktop';
import type{ReportError}from'../../types';
export function useFullscreen(report:ReportError){
 const[fullscreen,setFullscreen]=useState(false);
 useEffect(()=>{
  const unsubscribe=desktop.onFullscreen(setFullscreen);
  void desktop.getFullscreen().then(setFullscreen).catch(report);
  return unsubscribe;
 },[report]);
 const onKey=(key:string)=>{
  if(key==='F11')void desktop.toggleFullscreen().catch(report);
  if(key==='Escape')void desktop.setFullscreen(false).catch(report);
 };
 useEffect(()=>{
  const keydown=(event:KeyboardEvent)=>{
   if((event.key==='F11'||event.key==='Escape')&&!event.repeat){event.preventDefault();onKey(event.key);}
  };
  window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
 },[report]);
 return{fullscreen,onKey,toggleFullscreen:()=>{void desktop.toggleFullscreen().catch(report);}};
}
