const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const MAX_SIZE = 100 * 1024 * 1024;
function validId(id) { return typeof id === 'string' && /^[a-f0-9]{64}$/.test(id); }
async function validateEpub(bytes) {
  if (bytes.length > MAX_SIZE) throw new Error('Books must be smaller than 100 MB.');
  let zip;
  try { zip = await JSZip.loadAsync(bytes); } catch { throw new Error('This file is not a valid EPUB archive.'); }
  if (await zip.file('mimetype')?.async('string') !== 'application/epub+zip' || !zip.file('META-INF/container.xml')) {
    throw new Error('This file is not a valid EPUB book.');
  }
  // Reject excessively large expanded archives before the renderer opens them.
  const entries = Object.values(zip.files);
  const expanded = entries.reduce((n, entry) => n + (entry._data?.uncompressedSize || 0), 0);
  if (entries.some(entry => entry.unsafeOriginalName && (entry.unsafeOriginalName.split('/').includes('..') || entry.unsafeOriginalName.startsWith('/')))) throw new Error('Unsafe paths in EPUB archive.');
  if (entries.length > 20000 || expanded > 300 * 1024 * 1024) throw new Error('This book is too large to open safely.');
  const parse = async (name, rootName) => {
    const entry = zip.file(name);
    if (!entry || entry._data.uncompressedSize > 4 * 1024 * 1024) throw new Error('Missing or oversized EPUB package: ' + name);
    const xml = await entry.async('string');
    if (/<!ENTITY/i.test(xml)) throw new Error('Entity declarations are not supported in EPUB package metadata.');
    const document = new DOMParser({ onError: (_level,message) => { throw new Error('Invalid EPUB package XML: ' + message); } }).parseFromString(xml,'application/xml');
    if (document.documentElement.localName !== rootName) throw new Error('Invalid EPUB ' + rootName + ' document.');
    return document;
  };
  const container = await parse('META-INF/container.xml','container');
  const roots = Array.from(container.getElementsByTagNameNS('*','rootfile'));
  const root = roots.find(node => node.getAttribute('media-type') === 'application/oebps-package+xml');
  const packagePath = root?.getAttribute('full-path');
  if (!packagePath || packagePath.startsWith('/') || packagePath.split('/').includes('..')) throw new Error('Missing or unsafe EPUB package path.');
  const opf = await parse(packagePath,'package');
  const items = Array.from(opf.getElementsByTagNameNS('*','item'));
  const spine = Array.from(opf.getElementsByTagNameNS('*','itemref'));
  if (!spine.length) throw new Error('This EPUB has no reading chapters.');
  for (const reference of spine) {
    const item = items.find(node => node.getAttribute('id') === reference.getAttribute('idref'));
    const href = item?.getAttribute('href');
    if (!href || (/^[a-z]+:/i.test(href) || href.startsWith('/'))) throw new Error('Invalid EPUB chapter reference.');
    let chapter;
    try { chapter = path.posix.normalize(path.posix.join(path.posix.dirname(packagePath),decodeURIComponent(href.split('#')[0]))); }
    catch { throw new Error('Invalid EPUB chapter path.'); }
    if (chapter.startsWith('../') || !zip.file(chapter)) throw new Error('An EPUB chapter is missing: ' + chapter);
  }
}
async function atomicJson(filename, value) {
  const temp = `${filename}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2));
  await fs.rename(temp, filename);
}
function bookPath(root, id) {
  if (!validId(id)) throw new Error('Invalid book identifier.');
  return path.join(root, 'books', `${id}.epub`);
}
module.exports = { MAX_SIZE, validId, validateEpub, atomicJson, bookPath };

