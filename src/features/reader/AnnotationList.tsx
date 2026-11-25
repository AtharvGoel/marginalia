import type {ReaderControls} from './useReader';
import colors from '../../../shared/annotation-colors.json';
export function AnnotationList({reader}:{reader:ReaderControls}){
 const {items,ready,loadFailed}=reader.annotations;
 return <div className="annotation-list">
  <h3>Highlights &amp; notes <span>{items.length}</span></h3>
  {loadFailed?<p className="muted">Saved passages could not load. Reopen the book to try again.</p>:!ready?<p className="muted">Loading saved passages…</p>:!items.length?<p className="muted">Select a passage to highlight it or add a note. Your saved passages will appear here.</p>:items.map(item=><article key={item.id} className="annotation-card">
   <span className="annotation-kind"><i style={{background:item.color?colors[item.color]:'transparent'}}/>{item.color?'Highlight':'Note'}{item.color&&item.note?' · Note':''}</span>
   <blockquote>{item.text}</blockquote>
   {item.note&&<p className="annotation-preview">{item.note}</p>}
   <div className="annotation-card-actions"><button type="button" onClick={()=>reader.navigate(item.cfi)}>Go to passage</button><button type="button" onClick={()=>reader.reviewAnnotation(item)}>Edit annotation</button></div>
  </article>)}
 </div>;
}
