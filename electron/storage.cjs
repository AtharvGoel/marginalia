const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const JSZip = require('jszip');
const MAX_SIZE = 100 * 1024 * 1024;
function validId(id) { return typeof id === 'string' && /^[a-f0-9]{64}$/.test(id); }
async function validateEpub(bytes) {
  if (bytes.length > MAX_SIZE) throw new Error('Books must be smaller than 100 MB.');
  const zip = await JSZip.loadAsync(bytes);
  if (await zip.file('mimetype')?.async('string') !== 'application/epub+zip' || !zip.file('META-INF/container.xml')) {
    throw new Error('This file is not a valid EPUB book.');
  }
  // Reject excessively large expanded archives before the renderer opens them.
  const entries = Object.values(zip.files);
  const expanded = entries.reduce((n, entry) => n + (entry._data?.uncompressedSize || 0), 0);
  if (entries.length > 20000 || expanded > 300 * 1024 * 1024) throw new Error('This book is too large to open safely.');
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
