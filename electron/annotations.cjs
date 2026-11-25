const EpubCFI = require('epubjs/lib/epubcfi').default;
const colors = require('../shared/annotation-colors.json');
function validateAnnotation(value) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid annotation.');
 const {cfi,text,color=null,note=''}=value;
 if(typeof cfi!=='string'||cfi.length>8192||!/^epubcfi\([^()\r\n\0]+\)$/.test(cfi))throw new Error('Invalid passage location.');
 try {
  const parsed=new EpubCFI(cfi);
  const steps=[...parsed.base.steps,...parsed.path.steps,...(parsed.start?.steps||[]),...(parsed.end?.steps||[])];
  if(!parsed.range||!Number.isInteger(parsed.spinePos)||parsed.spinePos<0||!parsed.start.steps.length||!parsed.end.steps.length||steps.some(step=>!Number.isInteger(step.index)||step.index<0)||!Number.isInteger(parsed.start.terminal.offset)||!Number.isInteger(parsed.end.terminal.offset)||parsed.start.terminal.offset<0||parsed.end.terminal.offset<0)throw new Error();
 }catch{throw new Error('Invalid passage location.');}
 if(typeof text!=='string'||!text.trim()||text.length>20000)throw new Error('Select a passage of up to 20,000 characters.');
 if(color!==null&&!Object.hasOwn(colors,color))throw new Error('Invalid highlight colour.');
 if(typeof note!=='string'||note.length>50000)throw new Error('Notes must be no longer than 50,000 characters.');
 if(color===null&&!note.trim())throw new Error('Choose a highlight colour or write a note.');
 return {cfi,text,color,note:note.trim()};
}
function webSearchUrl(text) {
 if(typeof text!=='string'||!text.trim()||text.length>2000)throw new Error('Select up to 2,000 characters for a web search.');
 const url=new URL('https://www.google.com/search');
 url.searchParams.set('q',text.trim());
 return url.href;
}
function validateAnnotationId(id){if(typeof id!=='string'||! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new Error('Invalid annotation identifier.');}
module.exports={validateAnnotation,validateAnnotationId,webSearchUrl};
