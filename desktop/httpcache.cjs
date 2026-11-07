// #657: de app://-handler stuurde alles met cache-control: no-cache en zonder
// validators, dus Chromium las bij elke start ~892 modules opnieuw van schijf.
// Met een ETag/Last-Modified wordt revalidatie een goedkope 304.
const CACHE_CONTROL = 'no-cache';

function cacheHeaders(stat, req = {}) {
  const etag = '"' + stat.size + '-' + Math.floor(stat.mtimeMs || stat.mtime.getTime()) + '"';
  const lastModified = (stat.mtime instanceof Date ? stat.mtime : new Date(stat.mtimeMs || 0)).toUTCString();
  const inm = req['if-none-match'];
  const ims = req['if-modified-since'];
  const fresh = !!((inm && inm === etag) || (!inm && ims && ims === lastModified));
  return { etag, lastModified, fresh, cacheControl: CACHE_CONTROL };
}

module.exports = { cacheHeaders, CACHE_CONTROL };
