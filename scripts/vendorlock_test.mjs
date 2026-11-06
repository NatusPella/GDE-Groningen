// De vendorbestand-lock van desktop/build.mjs (#593 punt 8): sha256 per binnengehaald
// bestand, controleren bij download én cache-hit, en de gecommitte lock moet compleet
// en kloppend zijn met de bestaande vendor-cache (als die er is).
//   node scripts/vendorlock_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, parseLock, loadLock, lockProblem, serializeLock, LOCK_FILE } from './lib/vendorlock.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

ok(sha256(Buffer.from('abc')) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 is de standaard-hash');
ok(sha256(Buffer.from('')) === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256 van niets');

const lock = { version: 1, files: { 'npm/x.js': { url: 'https://cdn.example/x.js', sha256: sha256(Buffer.from('x')) } } };
ok(lockProblem(lock, 'npm/x.js', Buffer.from('x'), 'https://cdn.example/x.js') === null, 'kloppend bestand is goed');
ok(/niet in vendor-cache\.lock\.json/.test(lockProblem(lock, 'npm/y.js', Buffer.from('y'), 'https://cdn.example/y.js')), 'onbekend bestand wordt geweigerd');
ok(/sha256 wijkt af/.test(lockProblem(lock, 'npm/x.js', Buffer.from('x2'), 'https://cdn.example/x.js')), 'gewijzigde bytes worden geweigerd');
ok(/niet in/.test(lockProblem({ files: {} }, 'npm/x.js', Buffer.from('x'))), 'een lege lock weigert alles');

const rond = parseLock(serializeLock({ 'b/x': { url: 'u2', sha256: 'h2' }, 'a/x': { url: 'u1', sha256: 'h1' } }));
ok(Object.keys(rond.files).join() === 'a/x,b/x', 'serializeLock sorteert stabiel');
ok(rond.files['a/x'].url === 'u1' && rond.files['b/x'].sha256 === 'h2', 'serializeLock bewaart url en hash');
let leeg = false;
try { parseLock('{"version":1}'); } catch { leeg = true; }
ok(leeg, 'een lock zonder files is ongeldig');
ok(loadLock(path.join(ROOT, 'bestaat-niet.json')).files && Object.keys(loadLock(path.join(ROOT, 'bestaat-niet.json')).files).length === 0, 'ontbrekende lock laadt leeg');

// de gecommitte lock: bestaat, is volledig voor de huidige dependencies, en klopt met de
// vendor-cache van deze machine (in CI vult de stage die eerst)
const lockPath = path.join(ROOT, 'desktop', LOCK_FILE);
ok(fs.existsSync(lockPath), `${LOCK_FILE} staat in de repo`);
const gecommit = loadLock(lockPath);
ok(!!gecommit.files['npm/three@0.160.0/build/three.module.js'], 'three staat in de lock');
ok(!!gecommit.files['fonts/font-0.woff2'], 'de fonts staan in de lock (de CSS zelf staat vast in desktop/vendor-fonts.css)');
const cache = path.join(ROOT, 'desktop', 'vendor-cache');
if (fs.existsSync(cache)) {
  for (const [key, entry] of Object.entries(gecommit.files)) {
    const p = path.join(cache, key);
    if (!fs.existsSync(p)) continue;
    ok(sha256(fs.readFileSync(p)) === entry.sha256, 'cache klopt met de lock: ' + key);
  }
} else {
  console.log('vendor-cache ontbreekt; alleen de lock zelf gecontroleerd');
}
const build = fs.readFileSync(path.join(ROOT, 'desktop', 'build.mjs'), 'utf8');
ok(/lockProblem\(/.test(build) && /sha256\(/.test(build) && /GDE_UPDATE_VENDOR_LOCK/.test(build), 'de build controleert en kan de lock bewust bijwerken');

console.log(`vendorlock_test: ${n} checks ok`);
