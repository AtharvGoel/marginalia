// Test identity prevents replacing the user's installed EPUB Reader.
const production = require('../package.json').build;
const version = process.env.EPUB_INSTALLER_TEST_VERSION || '0.2.0';
module.exports = {
 ...production,
 appId:'com.atharvgoel.epubreader.validation',
 productName:'EPUB Reader Validation',
 directories:{output:'release/validation-' + version},
 extraMetadata:{name:'epub-reader-validation',version},
 nsis:{...production.nsis,uninstallDisplayName:'EPUB Reader Validation',shortcutName:'EPUB Reader Validation',createDesktopShortcut:false},
};
