const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { userDataPath } = require('../electron/identity.cjs');
const metadata = require('../package.json');

test('Marginalia retains the original reader profile and installer identity', () => {
 const appData = path.resolve('example-appdata');
 const old = userDataPath(appData, {name:'epub-reader'});
 assert.equal(userDataPath(appData, metadata), old);
 assert.equal(metadata.productName, 'Marginalia');
 assert.equal(metadata.build.productName, metadata.productName);
 assert.equal(metadata.build.appId, 'com.atharvgoel.epubreader');
 assert.equal(metadata.build.nsis.deleteAppDataOnUninstall, false);
 const validation = require('./installer-builder.cjs').extraMetadata;
 assert.equal(path.basename(userDataPath(appData, validation)), 'epub-reader-validation');
 assert.notEqual(userDataPath(appData, validation), old);
});

test('profile directories cannot escape the application data folder', () => {
 for (const directory of ['', '..', '../other', 'a/b', 'a\\b', 'C:other', null]) {
  assert.throws(() => userDataPath('profile', {readerDataDirectory:directory}), /Invalid application data directory/);
 }
});
