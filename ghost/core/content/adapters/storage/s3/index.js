// S3-compatible storage adapter (used for Cloudflare R2 in production).
//
// The actual implementation lives in the `ghost-storage-adapter-s3` npm package,
// which is installed into the image's node_modules at build time (see
// Dockerfile.railway). This thin shim lives under content/adapters/storage/s3 so
// that it is included in `base_content` and re-seeded onto the volume on every
// boot, keeping image storage independent of the Railway content volume.
module.exports = require('ghost-storage-adapter-s3');
