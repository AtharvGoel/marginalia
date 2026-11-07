const path = require('node:path');
const { DOMParser } = require('@xmldom/xmldom');
const { validateEpub } = require('./storage.cjs');
const MAX_COVER = 8 * 1024 * 1024;
const rasterTypes = new Set(['image/png','image/jpeg','image/gif','image/webp']);
const nodes = (document,name) => Array.from(document.getElementsByTagNameNS('*',name));
function localResource(base, href) {
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/') || href.includes('\\')) return null;
  try {
    const decoded = decodeURIComponent(href.split('#')[0]);
    if(decoded.startsWith('/') || decoded.includes('\\')) return null;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(base),decoded));
    return resolved.startsWith('../') ? null : resolved;
  } catch { return null; }
}
async function metadata(bytes, parsed) {
  const {zip,opf,packagePath} = parsed || await validateEpub(bytes);
  const metadataNode = nodes(opf,'metadata')[0];
  const title = metadataNode ? nodes(metadataNode,'title')[0]?.textContent.trim().slice(0,4096) || '' : '';
  const creators = metadataNode ? nodes(metadataNode,'creator') : [];
  const metas = metadataNode ? nodes(metadataNode,'meta') : [];
  const role = node => node.getAttributeNS('http://www.idpf.org/2007/opf','role') ||
    metas.find(meta=>meta.getAttribute('refines') === '#'+node.getAttribute('id') && meta.getAttribute('property') === 'role')?.textContent.trim() || '';
  const authors = creators.filter(node => !role(node) || role(node)==='aut');
  const author = [...new Set(authors.map(node => node.textContent.trim()).filter(Boolean))].join('; ').slice(0,4096);
  const items = nodes(opf,'manifest')[0] ? nodes(nodes(opf,'manifest')[0],'item') : [];
  const coverItem = items.find(item => (item.getAttribute('properties') || '').split(/\s+/).includes('cover-image'));
  const legacyId = metas.find(meta=>(meta.getAttribute('name') || '').toLowerCase()==='cover')?.getAttribute('content');
  const legacyItem = items.find(item=>legacyId && item.getAttribute('id')===legacyId);
  const guide = nodes(opf,'reference').find(item=>(item.getAttribute('type') || '').split(/\s+/).includes('cover'));
  const candidates = [coverItem?.getAttribute('href'),legacyItem?.getAttribute('href'),guide?.getAttribute('href')].filter(Boolean);
  async function resolveCover(base,href,depth=0) {
    const name = localResource(base,href), entry = name && zip.file(name);
    if (!entry || entry._data.uncompressedSize > MAX_COVER || depth>2) return null;
    const item = items.find(item=>localResource(packagePath,item.getAttribute('href'))===name);
    const extension = path.posix.extname(name).toLowerCase();
    const inferred = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'}[extension];
    const mime = item?.getAttribute('media-type') || inferred;
    if (rasterTypes.has(mime)) return { bytes: await entry.async('nodebuffer'),mime };
    // A cover page or SVG wrapper may reference an embedded raster cover.
    if (!['.svg','.xhtml','.html','.htm'].includes(extension) || entry._data.uncompressedSize>1024*1024) return null;
    const xml = await entry.async('string');
    if(/<!ENTITY/i.test(xml)) return null;
    const document = new DOMParser({onError:()=>{throw new Error('Invalid cover wrapper');}}).parseFromString(xml,'application/xml');
    for(const image of [...nodes(document,'img'),...nodes(document,'image')]) {
      const result = await resolveCover(name,image.getAttribute('src') || image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink','href'),depth+1);
      if(result)return result;
    }
    return null;
  }
  let cover=null;
  for(const candidate of candidates) {
    try { cover=await resolveCover(packagePath,candidate); } catch { /* Cover failure must not prevent reading. */ }
    if(cover)break;
  }
  return { title,author,cover };
}
module.exports={ metadata,localResource };
