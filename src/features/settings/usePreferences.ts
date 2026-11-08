import { useEffect,useState } from 'react';
import { desktop } from '../../services/desktop';
import defaults from '../../../shared/reading-defaults.json';
import type { Preferences,ReportError } from '../../types';
function legacyPreferences():Preferences{
 const theme=localStorage.getItem('theme');
 return {...defaults,theme:theme==='dark'||theme==='sepia'?theme:'light',fontSize:Math.min(30,Math.max(14,Number(localStorage.getItem('fontSize'))||20))}as Preferences;
}
export function usePreferences(report:ReportError){
 const [preferences,setState]=useState<Preferences>(legacyPreferences);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let mounted=true;
  void(async()=>{
   const saved=await desktop.getPreferences()||await desktop.migratePreferences(legacyPreferences());
   if(mounted){setState(saved);setReady(true);}
  })().catch(report);
  return()=>{mounted=false;};
 },[report]);
 const setPreferences=(value:Preferences)=>{
  setState(value);
  void desktop.setPreferences(value).catch(report);
 };
 return{preferences,setPreferences,ready};
}
