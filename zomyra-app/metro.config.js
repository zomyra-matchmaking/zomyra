// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across iOS/Android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];


// maxWorkers is deliberately not set. Emergent pinned it to 2 to fit their cloud
// runner; on a developer machine that throttled bundling to a quarter of the
// available cores. Metro's default is (cores - 1), which uses the machine fully
// while leaving one core for the editor and the dev server.

module.exports = config;
