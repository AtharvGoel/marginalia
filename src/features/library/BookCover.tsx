import { useEffect, useState } from 'react';
import { desktop } from '../../services/desktop';
import type { Entry } from '../../types';
export function BookCover({book,author,index,open,inspected}: {book: Entry;author: string;index: number;open: (entry: Entry)=>void;inspected:(entry: Entry)=>void}) {
  const [image,setImage]=useState<string|null>(null);
  useEffect(()=>{
    let mounted=true;
    setImage(null);
    void desktop.inspectBook(book.id).then(result=>{
      if(!mounted)return;
      setImage(result.cover);
      inspected(result.entry);
    }).catch(()=>{ /* A missing or damaged cover leaves the readable text fallback. */ });
    return ()=>{mounted=false;};
  },[book.id,inspected]);
  return <button className={'book-cover cover-'+index%4+(image?' has-artwork':'')} onClick={()=>open(book)} aria-label={'Read '+book.title}>
    {image ? <img src={image} alt={'Cover of '+book.title} onError={()=>setImage(null)}/> : <><span className="cover-rule"/><strong>{book.title}</strong><span>{author}</span><span className="cover-mark">E R</span></>}
  </button>;
}
