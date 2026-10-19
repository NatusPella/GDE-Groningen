// Brugprobe (#235): per brug met een auto-klasse rijdt een gesimuleerde auto (surfaceAt met toestand, zoals vehicle.js)
// de doorsnede van --reach m (40, voor opritten 160) voor tot dezelfde afstand na de brug in stappen van 0,25 m op de gestagede wereld (game/world met de provincie)
// en meet: de grootste hoogtestap tussen twee stappen (sprong), het grootste verschil met het dekprofiel van de weg
// (zweven of zinken) en de steilste helling van het profiel. Lijst de slechtste bruggen.
//   node scripts/qa/brug_probe.mjs [--top=30] [--max=0] [--reach=40] [--out=<bestand.json>]
// Zonder wereld: overslaan. Draait zonder Electron, ongeveer 5-15 minuten voor de hele provincie.
import './../node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const TOP = Number(arg('top', 30)), MAXN = Number(arg('max', 0)), REACH = Number(arg('reach', 40));
const root = new URL('../../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP brug_probe: geen game/world met de provincie'); process.exit(0); }
const G = await import('../../game/js/gdt.js');
const S = await import('../../game/js/tilestore.js');
const TW = await import('../../game/js/tileworld.js');
const RC = await import('../../game/js/ringcheck.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world, idx = T.index;
const CARS = new Set(['major', 'normal', 'minor', 'service', 'motorway', 'trunk']);

// 1. de bruggen: alle wegen met bridge in de tegels
const bridges = [];
for (const [key, t] of Object.entries(idx.tiles)) {
  if (!t.n || !t.n.roads) continue;
  const p = idx.packs[t.pack];
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(files[p.file].subarray(t.off, t.off + t.len))));
  const roads = (blob.sections.find((s) => s.type === G.SECTION.ROADS) || { rows: [] }).rows;
  for (const r of roads) if (r.bridge && r.pts && r.pts.length >= 2 && CARS.has(r.cat)) bridges.push({ key, i: t.i, j: t.j, name: r.name || '-', osm: r.osm, mid: r.pts[Math.floor(r.pts.length / 2)] });
}
// dubbele rijen (een weg over meer tegels) eenmaal
const seen = new Set(), list = bridges.filter((b) => { const k = b.osm ? b.osm : b.mid.map(Math.round).join(','); if (seen.has(k)) return false; seen.add(k); return true; });
list.sort((a, b) => a.i - b.i || a.j - b.j);
console.log(`bruggen met autoklasse: ${list.length}`);

const lenOf = (r) => r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1]), 0);
// de hoogte en afstand van een weg bij een punt: dichtstbijzijnde segment, z uit het profiel (0 zonder)
const near = (r, x, y) => {
  let best = { d: Infinity, z: 0 };
  for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
    if (d < best.d) best = { d, z: r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0 };
  }
  return best;
};
// naast elkaar liggende banen (dubbele rijbaan, parallel fietspad) die in het vlak overlappen maar op verschillende hoogte liggen
const ribbonSteps = (road) => {
  let worst = 0, at = null, other = null; const hw = (road.width || 6) / 2;
  for (let i = 0; i < road.pts.length; i++) {
    const [x, y] = road.pts[i], z = road.z ? road.z[i] : 0;
    for (const o of map.roadsNear(x, y, 14)) {
      if (o === road || o.pts.length < 2 || !CARS.has(o.cat)) continue;
      const q = near(o, x, y);
      if (q.d > hw + (o.width || 6) / 2 - 0.5) continue;
      const dz = Math.abs(q.z - z);
      if (dz < 3 && dz > worst) { worst = dz; at = [Math.round(x), Math.round(y)]; other = (o.name || '-') + '|' + o.osm; }
    }
  }
  return { worst: +worst.toFixed(2), at, other };
};
const res = [];
let done = 0;
for (const b of list) {
  if (MAXN && done >= MAXN) break;
  const keys = [];
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) keys.push(G.tileKey(b.i + di, b.j + dj));
  await Promise.all(keys.map((k) => (idx.tiles[k] ? T.store.request(k, { priority: -1 }) : null)));
  map.tileQueue.run(1e9);
  const road = map.roadsNear(b.mid[0], b.mid[1], 3).find((q) => q.bridge && ((b.osm && q.osm === b.osm) || (q.name || '-') === b.name));
  if (!road) continue;
  done++;
  const len = lenOf(road);
  const path = RC.crossingPath(map, { road, s0: 0, s1: len }, REACH);
  if (path.length < 4) continue;
  // 0,25 m stappen langs het pad met het profiel (z per punt) ernaast
  const st = { z: path[0][2] || 0, ribbon: null, kind: 'ground' };
  let maxStep = 0, maxGap = 0, atStep = null, atGap = null, maxSlope = 0, cum = 0, prevZ = null, prevProf = null, kinds = '';
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], c = path[i], d = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (d < 0.01) continue;
    const slope = Math.abs((c[2] || 0) - (a[2] || 0)) / d;
    if (d > 3 && slope > maxSlope) maxSlope = slope;
    const n = Math.max(1, Math.ceil(d / 0.25));
    for (let k = 1; k <= n; k++) {
      const x = a[0] + ((c[0] - a[0]) * k) / n, y = a[1] + ((c[1] - a[1]) * k) / n, prof = (a[2] || 0) + (((c[2] || 0) - (a[2] || 0)) * k) / n;
      const s = map.surfaceAt(x, y, st);
      const z = s.z;
      if (prevZ !== null) { const j = Math.abs(z - prevZ); if (j > maxStep) { maxStep = j; atStep = [Math.round(x), Math.round(y), +prevZ.toFixed(2), +z.toFixed(2), s.kind]; } }
      const g = Math.abs(z - prof);
      if (g > maxGap) { maxGap = g; atGap = [Math.round(x), Math.round(y), +z.toFixed(2), +prof.toFixed(2), s.kind]; }
      prevZ = z; cum += d / n;
    }
  }
  const maxZ = road.z ? Math.max(...road.z) : 0;
  const rs = ribbonSteps(road);
  const z0 = path[0][2] || 0, z1 = path[path.length - 1][2] || 0;
  res.push({ name: b.name, startZ: +z0.toFixed(2), eindZ: +z1.toFixed(2), osm: b.osm, at: b.mid.map(Math.round), len: Math.round(len), maxZ: +maxZ.toFixed(1), maxStep: +maxStep.toFixed(2), maxGap: +maxGap.toFixed(2), maxSlope: +maxSlope.toFixed(3), atStep, atGap, baanStap: rs.worst, baanAt: rs.at, baanMet: rs.other });
  if (done % 100 === 0) console.log(`  ${done}/${list.length}`);
}
// de score: sprong weegt zwaarder dan het profielverschil
const score = (r) => r.maxStep + r.maxGap * 0.5 + (r.baanStap || 0);
res.sort((a, b) => score(b) - score(a));
console.log(`pad begint niet op maaiveld (z>0,3): ${res.filter((r) => r.startZ > 0.3).length}, eindigt niet op maaiveld: ${res.filter((r) => r.eindZ > 0.3).length}`);
const bad = res.filter((r) => r.maxStep > 0.5 || r.maxGap > 1.0 || r.baanStap > 0.5);
console.log(`naast elkaar liggende banen met hoogteverschil >0,3 m: ${res.filter((r) => r.baanStap > 0.3).length}, >0,5 m: ${res.filter((r) => r.baanStap > 0.5).length}, >1 m: ${res.filter((r) => r.baanStap > 1).length}`);
console.log(`gemeten ${res.length}; sprong >0,5 m of verschil >1 m: ${bad.length}; sprong >1,0 m: ${res.filter((r) => r.maxStep > 1).length}`);
for (const r of res.slice(0, TOP)) console.log(`${r.name} (${r.at}) ${r.len} m, profiel tot ${r.maxZ}: stap ${r.maxStep} m ${JSON.stringify(r.atStep)}, verschil ${r.maxGap} m ${JSON.stringify(r.atGap)}, helling ${(r.maxSlope * 100).toFixed(1)}%, banenverschil ${r.baanStap} m ${JSON.stringify(r.baanAt)} met ${r.baanMet}`);
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(res, null, 1));
