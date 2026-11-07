const JSZip=require('jszip');
const {fixture}=require('./fixture.cjs');
async function coverBook(style='epub3',author='Test, Reader',artwork=false) {
 const zip=await JSZip.loadAsync(await fixture());
 let opf=await zip.file('OEBPS/book.opf').async('string');
 opf=opf.replace('Reader Test',author);
 if(style==='epub3')opf=opf.replace('id="image" href="pixel.png"','id="image" properties="cover-image" href="pixel.png"');
 if(style==='epub2')opf=opf.replace('</metadata>','<meta name="cover" content="image"/></metadata>');
 if(style==='wrapper'){
  opf=opf.replace('</package>','<guide><reference type="cover" href="cover.xhtml"/></guide></package>');
  zip.file('OEBPS/cover.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head><body><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="pixel.png"/></svg></body></html>');
 }
 zip.file('OEBPS/book.opf',opf);
 if(artwork)zip.file('OEBPS/pixel.png',coverPNG());
 return zip.generateAsync({type:'nodebuffer'});
}

function coverPNG(){
 const {deflateSync}=require('node:zlib');
 const width=240,height=360,raw=Buffer.alloc((width*3+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=y*(width*3+1)+1+x*3;
  const border=x<12 || x>227 || y<12 || y>347;
  const bar=y>85 && y<115 && x>35 && x<205 || y>140 && y<147 && x>60 && x<180;
  const circle=(x-120)**2+(y-250)**2<1800;
  const color=border?[183,140,71]:bar?[236,217,166]:circle?[176,104,69]:[40,70,64];
  color.forEach((value,i)=>raw[offset+i]=value);
 }
 function chunk(type,data){
  const body=Buffer.concat([Buffer.from(type),data]);
  let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([size,body,check]);
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

module.exports={coverBook};
