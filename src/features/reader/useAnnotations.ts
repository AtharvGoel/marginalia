import {useEffect,useRef,useState} from 'react';
import {desktop} from '../../services/desktop';
import type {Annotation,HighlightColor,PassageSelection,ReportError} from '../../types';

export function useAnnotations(bookId:string|undefined,report:ReportError){
 const [items,setItems]=useState<Annotation[]>([]),[selection,setSelection]=useState<PassageSelection|null>(null);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 const [loadedBook,setLoadedBook]=useState<string>(),[loadFailed,setLoadFailed]=useState(false);
 const epoch=useRef(0),locked=useRef(false);
 useEffect(()=>{
  const token=++epoch.current;locked.current=false;setItems([]);setSelection(null);setReady(false);setBusy(false);setLoadedBook(undefined);setLoadFailed(false);
  if(bookId)void desktop.listAnnotations(bookId).then(value=>{if(token===epoch.current){setItems(value);setLoadedBook(bookId);setReady(true);}}).catch(error=>{if(token===epoch.current){setLoadFailed(true);report(error);}});
  return()=>{epoch.current++;};
 },[bookId,report]);
 const mutate=async(work:()=>Promise<Annotation[]>)=>{
  if(locked.current||!ready)return false;
  locked.current=true;setBusy(true);const token=epoch.current;
  try{const value=await work();if(token!==epoch.current)return false;setItems(value);setSelection(null);return true;}
  catch(error){if(token===epoch.current)report(error);return false;}
  finally{if(token===epoch.current){locked.current=false;setBusy(false);}}
 };
 const current=items.find(item=>item.cfi===selection?.cfi);
 const save=(color:HighlightColor|null,note:string)=>bookId&&selection?mutate(()=>desktop.saveAnnotation(bookId,{cfi:selection.cfi,text:selection.text,color,note})):Promise.resolve(false);
 const remove=(id:string)=>bookId?mutate(()=>desktop.removeAnnotation(bookId,id)):Promise.resolve(false);
 const searchWeb=async()=>{
  if(!selection||locked.current)return;
  locked.current=true;setBusy(true);const token=epoch.current;
  try{await desktop.searchWeb(selection.text);if(token===epoch.current)setSelection(null);}
  catch(error){if(token===epoch.current)report(error);}
  finally{if(token===epoch.current){locked.current=false;setBusy(false);}}
 };
 const available=ready&&loadedBook===bookId;
 return {items:available?items:[],selection:available?selection:null,current:available?current:undefined,ready:available,loadFailed,busy,select:(value:PassageSelection|null)=>{if(!locked.current)setSelection(value);},dismiss:()=>{if(!locked.current)setSelection(null);},save,remove,searchWeb};
}
