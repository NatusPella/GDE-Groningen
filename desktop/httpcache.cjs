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

function isFresh(req, etag, lastModified) {
  const inm = req['if-none-match'];
  const ims = req['if-modified-since'];
  return !!((inm && inm === etag) || (!inm && ims && ims === lastModified));
}

function cacheHeaders(stat, req = {}, content = null, opts = null) {
  const immutableKey = content == null && opts && opts.immutableKey ? String(opts.immutableKey) : null;
  const cache = immutableKey && opts && opts.cache instanceof Map ? opts.cache : null;
  if (cache && cache.has(immutableKey)) {
    const cached = cache.get(immutableKey);
    return { etag: cached.etag, lastModified: cached.lastModified, fresh: isFresh(req, cached.etag, cached.lastModified), cacheControl: CACHE_CONTROL };
  }
  const mtimeMs = Math.floor(stat.mtimeMs || (stat.mtime ? stat.mtime.getTime() : 0));
  const etag = content != null
    ? '"' + crypto.createHash('sha256').update(content).digest('hex') + '"'
    : immutableKey
      ? '"' + crypto.createHash('sha256').update(`${immutableKey}\0${stat.size}\0${mtimeMs}`).digest('hex') + '"'
      : '"' + stat.size + '-' + mtimeMs + '"';
  const lastModified = (stat.mtime instanceof Date ? stat.mtime : new Date(stat.mtimeMs || 0)).toUTCString();
  if (cache) cache.set(immutableKey, { etag, lastModified });
  return { etag, lastModified, fresh: isFresh(req, etag, lastModified), cacheControl: CACHE_CONTROL };
}

module.exports = { cacheHeaders, CACHE_CONTROL };
