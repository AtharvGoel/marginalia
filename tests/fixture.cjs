const JSZip = require('jszip');
async function fixture() {
 const zip = new JSZip();
 zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
 zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OEBPS/book.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test-reader-book</dc:identifier><dc:title>A Quiet Beginning</dc:title><dc:creator>Reader Test</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="image" href="pixel.png" media-type="image/png"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>');
 zip.file('OEBPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">The beginning</a></li><li><a href="two.xhtml">A second chapter</a></li></ol></nav></body></html>');
 zip.file('OEBPS/one.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>The beginning</title></head><body><h1>The beginning</h1><p>A quiet beginning is a good place to start.</p><script>window.parent.compromised = true;</script><a href="https://example.com">External link</a><a href="two.xhtml#note">Read the footnote</a>' + '<p>Every page makes room for another thought.</p>'.repeat(120) + '</body></html>');
 zip.file('OEBPS/two.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>A second chapter</title></head><body><h1>A second chapter</h1><p>The story continues here.</p><img src="pixel.png" alt="Test illustration"/><p id="note">A helpful footnote.</p></body></html>');
 zip.file('OEBPS/pixel.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
module.exports = { fixture };
