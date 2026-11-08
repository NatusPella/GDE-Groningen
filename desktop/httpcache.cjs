// #657: de app://-handler stuurde alles met cache-control: no-cache en zonder
// validators, dus Chromium las bij elke start ~892 modules opnieuw van schijf.
// Met een ETag/Last-Modified wordt revalidatie een goedkope 304.
// #774: een ETag op grootte + mtime kan botsen: inhoud met dezelfde grootte die
// binnen dezelfde milliseconde verandert (of een teruggezette mtime) houdt
// dezelfde validator en levert dan stale data. Met de inhoud erbij is de ETag
// een hash daarvan; zonder inhoud (een byte-range, waarvoor main.js het
// mediabestand niet eerst helemaal wil lezen) blijft het grootte + mtime.
const crypto = require('node:crypto');

const CACHE_CONTROL = 'no-cache';

function cacheHeaders(stat, req = {}, content = null) {
  const etag = content == null
    ? '"' + stat.size + '-' + Math.floor(stat.mtimeMs || stat.mtime.getTime()) + '"'
    : '"' + crypto.createHash('sha256').update(content).digest('hex') + '"';
  const lastModified = (stat.mtime instanceof Date ? stat.mtime : new Date(stat.mtimeMs || 0)).toUTCString();
  const inm = req['if-none-match'];
  const ims = req['if-modified-since'];
  const fresh = !!((inm && inm === etag) || (!inm && ims && ims === lastModified));
  return { etag, lastModified, fresh, cacheControl: CACHE_CONTROL };
}

module.exports = { cacheHeaders, CACHE_CONTROL };
