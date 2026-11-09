// Separate identity and stable data root prevent touching the installed personal reader.
const production = require('../package.json').build;
const version = process.env.EPUB_INSTALLER_TEST_VERSION || '0.3.1';
const productName = version === '0.3.0' ? 'EPUB Reader Validation' : 'Marginalia Validation';
module.exports = {
 ...production,
 appId:'com.atharvgoel.epubreader.validation',
 productName,
 directories:{output:'release/validation-' + version},
 extraMetadata:{name:'epub-reader-validation',productName,readerDataDirectory:'epub-reader-validation',version},
 nsis:{...production.nsis,uninstallDisplayName:productName,shortcutName:productName,createDesktopShortcut:false},
};
