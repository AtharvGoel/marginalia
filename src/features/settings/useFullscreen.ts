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
 return{fullscreen,toggleFullscreen:()=>{void desktop.setFullscreen(!fullscreen).catch(report);}};
}
