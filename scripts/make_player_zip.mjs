// Builds GDE-Groningen-Windows.zip for players from the clean web build:
// "START DE GAME.bat" + LEESMIJ.txt at the top, and in GDE-Groningen/ only
// start.bat, scripts/windows/serve.ps1, the licence files and web-dist/.
// Nothing is uploaded or published.
//
//   node scripts/make_player_zip.mjs [out.zip] [--dist=<web-dist>] [--no-build]
//     --no-build  reuse an existing web-dist (default: run web/build.mjs first)
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'GDE-Groningen-Windows.zip'));
const DIST = path.resolve(flag('dist') || path.join(ROOT, 'web-dist'));

if (!args.includes('--no-build') && !flag('dist')) {
  execFileSync(process.execPath, [path.join(ROOT, 'web', 'build.mjs')], { stdio: 'inherit' });
}
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error(`geen web-build in ${DIST}; draai eerst node web/build.mjs`);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

// [name in zip, file on disk]
const entries = [
  ['START DE GAME.bat', 'scripts/windows/START DE GAME.bat'],
  ['LEESMIJ.txt', 'scripts/windows/LEESMIJ.txt'],
  ['GDE-Groningen/start.bat', 'start.bat'],
  ['GDE-Groningen/scripts/windows/serve.ps1', 'scripts/windows/serve.ps1'],
  ['GDE-Groningen/LICENSE', 'LICENSE'],
  ['GDE-Groningen/LICENSE-CONTENT.md', 'LICENSE-CONTENT.md'],
  ['GDE-Groningen/NOTICE.md', 'NOTICE.md'],
  ...walk(path.join(ROOT, 'licenses')).map((f) => ['GDE-Groningen/' + path.relative(ROOT, f).split(path.sep).join('/'), path.relative(ROOT, f)]),
  ...walk(DIST).map((f) => ['GDE-Groningen/web-dist/' + path.relative(DIST, f).split(path.sep).join('/'), f]),
].map(([name, f]) => [name, path.resolve(ROOT, f)]);

// minimal zip writer (deflate, or stored for already-compressed media)
const STORE = /\.(webm|mp3|pack|bin|glb|woff2|gdp|png|zip)$/i;
const crcTable = Int32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };

fs.rmSync(OUT, { force: true });
const fd = fs.openSync(OUT, 'w');
let pos = 0;
const put = (b) => { fs.writeSync(fd, b); pos += b.length; };
const central = [];
for (const [name, file] of entries) {
  const data = fs.readFileSync(file);
  const store = STORE.test(name) || data.length < 64;
  const body = store ? data : zlib.deflateRawSync(data, { level: 6 });
  const nm = Buffer.from(name, 'utf8');
  const crc = crc32(data);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(store ? 0 : 8, 8);
  h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); // 1980-01-01, keeps the zip reproducible
  h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
  central.push({ nm, crc, store, csize: body.length, size: data.length, off: pos });
  put(h); put(nm); put(body);
}
const cdStart = pos;
for (const e of central) {
  const h = Buffer.alloc(46);
  h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt16LE(0x0800, 8); h.writeUInt16LE(e.store ? 0 : 8, 10);
  h.writeUInt16LE(0, 12); h.writeUInt16LE(0x21, 14); h.writeUInt32LE(e.crc, 16); h.writeUInt32LE(e.csize, 20); h.writeUInt32LE(e.size, 24);
  h.writeUInt16LE(e.nm.length, 28); h.writeUInt32LE(e.off, 42);
  put(h); put(e.nm);
}
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
end.writeUInt32LE(pos - cdStart, 12); end.writeUInt32LE(cdStart, 16);
put(end);
fs.closeSync(fd);
if (central.length > 65535 || pos > 0xfffffffe) throw new Error('zip te groot voor het simpele formaat (zip64 nodig)');
console.log(`${OUT} (${central.length} bestanden, ${(pos / 1e6).toFixed(1)} MB)`);
