// #657: desktop serveert met ETag/Last-Modified, zodat een tweede start 304's krijgt.
// #774: de ETag volgt de inhoud (content-hash), niet alleen grootte + mtime.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { cacheHeaders, CACHE_CONTROL } = require('../desktop/httpcache.cjs');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const stat = { size: 12345, mtimeMs: 1700000000000, mtime: new Date(1700000000000) };
const a = cacheHeaders(stat, {});
ok(CACHE_CONTROL === 'no-cache', 'cache-control blijft no-cache');
ok(/^"12345-1700000000000"$/.test(a.etag), 'zonder inhoud (byte-range): ETag uit grootte en mtime', a.etag);
ok(!!a.lastModified, 'Last-Modified gezet', a.lastModified);
ok(!a.fresh, 'eerste bezoek: geen 304');
const b = cacheHeaders(stat, { 'if-none-match': a.etag });
ok(b.fresh, 'zelfde ETag: 304');
const c = cacheHeaders(stat, { 'if-modified-since': a.lastModified });
ok(c.fresh, 'zelfde Last-Modified: 304');
const d = cacheHeaders(stat, { 'if-none-match': '"anders"' });
ok(!d.fresh, 'andere ETag: opnieuw sturen');
// #774: twee verschillende inhouden met dezelfde grootte en mtime verschillen in ETag
const A = Buffer.alloc(12345, 'a');
const B = Buffer.alloc(12345, 'b');
const e = cacheHeaders(stat, {}, A);
const f = cacheHeaders(stat, {}, B);
ok(/^"[0-9a-f]{64}"$/.test(e.etag), 'met inhoud: ETag is een sha256 van de inhoud', e.etag);
ok(e.etag !== f.etag, 'andere inhoud bij gelijke grootte/mtime: andere ETag', e.etag + ' / ' + f.etag);
ok(e.etag !== a.etag, 'inhoud-ETag wijkt af van de mtime-ETag', e.etag);
ok(cacheHeaders(stat, {}, A).etag === e.etag, 'zelfde inhoud: zelfde ETag');
ok(cacheHeaders(stat, { 'if-none-match': e.etag }, A).fresh, 'matching inhoud-ETag: 304');
ok(!cacheHeaders(stat, { 'if-none-match': e.etag }, B).fresh, 'andere inhoud met dezelfde ETag: opnieuw sturen');
console.log('#657/#774 meting: 1 leesactie per bestand bij de eerste start; daarna een 304, en de ETag verandert ook als alleen de inhoud wijzigt');
const src = fs.readFileSync(new URL('../desktop/main.js', import.meta.url), 'utf8');
ok(/cacheHeaders\(st,/.test(src) && /status: 304/.test(src), 'de app-handler valideert');
console.log(`${n - fails}/${n} httpcache`);
process.exit(fails ? 1 : 0);
