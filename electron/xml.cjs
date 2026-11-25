const {DOMParser}=require('@xmldom/xmldom');
const REPLACEMENT_WARNING='Unicode replacement character detected, source encoding issues?';

// U+FFFD is legal XML text. It may already be in the book, or result from
// decoding damaged text; retain it without guessing the missing character.
// Every other parser warning/error still makes metadata invalid.
function parseMetadataXml(xml,label='EPUB package'){
 if(/<!ENTITY/i.test(xml))throw new Error('Entity declarations are not supported in EPUB package metadata.');
 let problem,document;
 try{
  document=new DOMParser({onError:(level,message)=>{
   if(level==='warning'&&message===REPLACEMENT_WARNING)return;
   problem ||= message;
  }}).parseFromString(xml,'application/xml');
 }catch(error){problem ||= error.message;}
 if(problem||!document?.documentElement)throw new Error('Invalid '+label+' XML: '+String(problem||'Missing document root.').slice(0,300));
 return document;
}
module.exports={parseMetadataXml};
