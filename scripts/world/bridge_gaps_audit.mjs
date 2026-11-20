// Audit op wegen zonder brug: een weg of pad waarvan de hartlijn door een waterpolygoon loopt,
// zonder bridge-vlag (dus ook niet als droge kruising gemarkeerd door markDryRoad), die aan beide
// kanten droog is en 3 tot 40 m nat. Auto's zinken daar, voetgangers zwemmen.
// Leest de echte tegels uit game/world (met de provincielaag), zoals bridge_province_test.
//   node scripts/world/bridge_gaps_audit.mjs [--from=0] [--to=9999] [--json=uit.json] [--max-wet=40]
import '../node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const FROM = +arg('from', 0), TO = +arg('to', 1e9), MAXWET = +arg('max-wet', 40), MINWET = +arg('min-wet', 3);
const root = new URL('../../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP geen game/world met de provincielaag'); process.exit(0); }
await import('../../game/js/mapdata.js');
const S = await import('../../game/js/tilestore.js');
const TW = await import('../../game/js/tileworld.js');
const G = await import('../../game/js/gdt.js');
const { waterPolyIn } = await import('../../game/js/waterlevels.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
const keys = Object.keys(T.index.tiles).filter((k) => !T.index.tiles[k].ov).slice(FROM, TO);
const seen = new Set(), out = [];
let done = 0;
function check(r, key) {
  if (r.bridge || r.tunnel || !r.pts || r.pts.length < 2) return;
  const P = r.pts;
  let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
  for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const polys = map.waterGrid.query(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5);
  if (!polys.length) return;
  const samples = []; // [x, y, wet, z]
  for (let i = 0; i < P.length - 1; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    const n = Math.max(1, Math.ceil(L / 2));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, y = P[i][1] + (P[i + 1][1] - P[i][1]) * t;
      const z = r.z ? (r.z[i] || 0) + ((r.z[i + 1] || 0) - (r.z[i] || 0)) * t : 0;
      samples.push([x, y, !!waterPolyIn(polys, x, y), z]);
    }
  }
  const last = P[P.length - 1];
  samples.push([last[0], last[1], !!waterPolyIn(polys, last[0], last[1]), r.z ? r.z[P.length - 1] || 0 : 0]);
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i][2]) continue;
    let j = i;
    while (j + 1 < samples.length && samples[j + 1][2]) j++;
    const dryBefore = i > 0, dryAfter = j < samples.length - 1; // droog aan beide kanten
    const wet = (j - i + 1) * 2;
    const zs = samples.slice(i, j + 1).map((s) => s[3]);
    if (dryBefore && dryAfter && wet >= MINWET && wet <= MAXWET && Math.min(...zs) >= -1 && Math.max(...zs) <= 1.5) {
      out.push({ tile: key, name: r.name || '', cat: r.cat, wet, x: Math.round(samples[i][0]), y: Math.round(samples[i][1]), z: Math.round(Math.max(...zs) * 100) / 100, hasZ: !!r.z, hw: r.hw || r.highway || '' });
    }
    i = j;
  }
}
for (const k of keys) {
  await T.store.request(k, { priority: -1 });
  map.tileQueue.run(1e9);
  const t = T.index.tiles[k], o = G.tileOrigin(t.i, t.j);
  for (const r of map.roadsNear(o[0] + 500, o[1] + 500, 720)) {
    if (seen.has(r)) continue;
    seen.add(r);
    check(r, k);
  }
  if (++done % 200 === 0) console.error(`${done}/${keys.length} tegels, ${out.length} treffers`);
}
let zDry = 0; for (const r of seen) if (r.dryCrossing && r.z) zDry++;
console.log(`wegen met z-reeks als droge kruising: ${zDry}`);
const car = out.filter((o) => ['major', 'normal', 'minor', 'service'].includes(o.cat));
const byCat = {};
for (const o of out) byCat[o.cat] = (byCat[o.cat] || 0) + 1;
console.log(`${keys.length} tegels, ${seen.size} wegen, ${out.length} treffers`, JSON.stringify(byCat));
for (const o of car) console.log(`AUTO ${o.cat} ${o.name} tegel ${o.tile} (${o.x}, ${o.y}) nat ${o.wet} m z ${o.z} ${o.hasZ ? '[z-reeks]' : ''}`);
const j = arg('json', '');
if (j) fs.writeFileSync(j, JSON.stringify(out));
process.exit(0);
