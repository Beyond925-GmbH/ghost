// S3-compatible storage adapter (used for the Railway Bucket / Cloudflare R2 in
// production).
//
// The actual implementation lives in the `ghost-storage-adapter-s3` npm package.
// In the Railway image it is installed into an isolated directory
// (/home/ghost/storage-adapters) rather than the Ghost package dir, because npm
// crashes parsing Ghost's pnpm workspace/catalog lockfile context. This thin
// shim lives under content/adapters/storage/s3 so that it is included in
// `base_content` and re-seeded onto the volume on every boot, keeping image
// storage independent of the Railway content volume.
let StorageAdapter;

try {
    // Resolve normally first (e.g. local dev where it sits in node_modules).
    StorageAdapter = require('ghost-storage-adapter-s3');
} catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
        // Railway image: adapter is installed in an isolated directory.
        StorageAdapter = require('/home/ghost/storage-adapters/node_modules/ghost-storage-adapter-s3');
    } else {
        throw err;
    }
}

module.exports = StorageAdapter;
