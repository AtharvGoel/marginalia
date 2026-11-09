const path = require('node:path');

// Display names may change. Keep the original profile directory for existing libraries.
function userDataPath(appData, metadata) {
  const directory = metadata.readerDataDirectory || metadata.name;
  if (typeof directory !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(directory)) {
    throw new Error('Invalid application data directory.');
  }
  return path.join(appData, directory);
}
module.exports = { userDataPath };
