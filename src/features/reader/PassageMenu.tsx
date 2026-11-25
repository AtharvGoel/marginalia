import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import colors from '../../../shared/annotation-colors.json';
import type {HighlightColor} from '../../types';
import type {ReaderControls} from './useReader';
import './annotations.css';

type Actions=ReaderControls['annotations'];
function NoteDialog({actions,close}:{actions:Actions;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [note,setNote]=useState(actions.current?.note||'');
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 return <dialog ref={dialog} className="passage-note-dialog" aria-labelledby="passage-note-heading" onCancel={event=>{event.preventDefault();close();}}>
  <form onSubmit={event=>{event.preventDefault();void actions.save(actions.current?.color||null,note).then(saved=>{if(saved)close();});}}>
   <h2 id="passage-note-heading">{actions.current?.note?'Edit note':'Add note'}</h2>
   <blockquote>{actions.selection?.text}</blockquote>
   <label htmlFor="passage-note">Your note</label>
   <textarea id="passage-note" autoFocus rows={7} maxLength={50000} value={note} onChange={event=>setNote(event.target.value)} placeholder="What would you like to remember?"/>
   <div className="annotation-actions"><button type="button" onClick={close} disabled={actions.busy}>Cancel</button><button className="primary" disabled={actions.busy||!note.trim()}>{actions.busy?'Saving…':'Save note'}</button></div>
  </form>
 </dialog>;
}
export function PassageMenu({actions}:{actions:Actions}){
 const menu=useRef<HTMLDivElement>(null),[editing,setEditing]=useState(false);
 const [position,setPosition]=useState({left:12,top:100});
 const selection=actions.selection;
 useLayoutEffect(()=>{
  if(!selection||!menu.current)return;
  const box=menu.current.getBoundingClientRect();
  const left=Math.max(12,Math.min(selection.x,window.innerWidth-box.width-12));
  const below=selection.y+10;
  const top=Math.max(12,Math.min(below+box.height<=window.innerHeight-12?below:selection.y-box.height-12,window.innerHeight-box.height-12));
  setPosition({left,top});
 },[selection,actions.current]);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(!editing&&menu.current&&!menu.current.contains(event.target as Node))actions.dismiss();};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[editing,actions.dismiss]);
 if(!selection)return null;
 const current=actions.current;
 return <>
  <div ref={menu} role="region" aria-label="Passage actions" className="passage-menu" style={position} hidden={editing} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();actions.dismiss();}}}>
   <div className="passage-menu-heading"><strong>{current?'Saved passage':'Selected passage'}</strong><button type="button" aria-label="Close passage actions" onClick={actions.dismiss}>×</button></div>
   <blockquote>{selection.text}</blockquote>
   <div className="highlight-options" role="group" aria-label="Highlight colour">
    <span>Highlight</span>{(Object.keys(colors) as HighlightColor[]).map(color=><button key={color} type="button" aria-label={'Highlight '+color} title={color[0].toUpperCase()+color.slice(1)} aria-pressed={current?.color===color} disabled={actions.busy} style={{background:colors[color]}} onMouseDown={event=>event.preventDefault()} onClick={()=>void actions.save(color,current?.note||'')}><span>{current?.color===color?'✓':''}</span></button>)}
   </div>
   <div className="passage-buttons"><button type="button" onClick={()=>setEditing(true)} disabled={actions.busy}>{current?.note?'Edit note':'Add note'}</button><button type="button" title="Search this passage with Google in your default browser" onClick={()=>void actions.searchWeb()} disabled={actions.busy}>Search on Web ↗</button></div>
   {current&&<div className="annotation-secondary">
    {current.color&&<button type="button" disabled={actions.busy} onClick={()=>void (current.note?actions.save(null,current.note):actions.remove(current.id))}>Remove highlight</button>}
    {current.note&&<button type="button" disabled={actions.busy} onClick={()=>void (current.color?actions.save(current.color,''):actions.remove(current.id))}>Delete note</button>}
   </div>}
   <small>Alt+M to focus passage actions</small>
  </div>
  {editing&&<NoteDialog actions={actions} close={()=>setEditing(false)}/>}
 </>;
}
