// Gras boven water (#918) en gras boven de weg (#883): een groenvlak ligt op 0,015 m en de weg op
// 0,03 m, maar binnen ~70 m wint de hogere graslaag van de polygon-offset van de weg; boven water
// wint het groen altijd (het water ligt op -0,35 m). Daarom mag een groenvlak geen driehoek in
// water of op de verharding houden, en mogen er geen graspollen op die plekken staan.
// Deze test rekent dat na op de echte wereld:
//  - de stad: elk groenvlak dat water raakt houdt geen driehoek in water (per punt, waterIndexAt);
//  - de provincie: een groenvlak van een gestroomde tegel raakt zijn water wél (de oude,
//    stadsindex ziet dat water niet: dat is precies de fout), en houdt er na het knippen geen
//    driehoek in water of op de weg;
//  - generateCell: geen graspol, bloem, struik of heg in water of op de rijbaan.
//   node scripts/grass_water_paved_test.mjs   (game/world nodig; zonder provincie SKIP voor dat deel)
import fs from 'node:fs';
import './node3d.mjs';
const THREE = await import('three');
const { dryPavedIndices, pavedTester } = await import('../game/js/greenwater.js');
const { waterIndexAt, getWaterIndex } = await import('../game/js/waterindex.js');
const G = await import('../game/js/grass.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// driehoeken van een vlakke polygoon (net als scene3d.buildPolyGeometry), in xz met y = 0
function polyGeo(pts) {
  const contour = pts.map((p) => new THREE.Vector2(p[0], p[1]));
  let tris = THREE.ShapeUtils.triangulateShape(contour, []);
  if (tris.length * 3 < pts.length) { tris = []; for (let i = 1; i + 1 < pts.length; i++) tris.push([0, i, i + 1]); }
  const pos = [];
  for (const p of pts) pos.push(p[0], 0, p[1]);
  const idx = [];
  for (const t of tris) idx.push(t[0], t[1], t[2]);
  return { pos, idx };
}

const wetTriangles = (pos, idx, wi) => {
  let wet = 0;
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (wi(x, z)) wet++;
  }
  return wet;
};
const pavedTriangles = (pos, idx, on) => {
  let k = 0;
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (on(x, z)) k++;
  }
  return k;
};

// --- de stad: groen dat water raakt houdt geen natte driehoek -----------------
{
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const map = await loadCityData({ extras: false });
  let overlap = 0, wet = 0, dropped = 0;
  const wi = (x, y) => waterIndexAt(map, x, y).inWater(x, y);
  for (const g of map.green) {
    if (!g.pts || g.pts.length < 3) continue;
    if (!g.bounds) { let a = Infinity, b2 = Infinity, c = -Infinity, d = -Infinity; for (const p of g.pts) { a = Math.min(a, p[0]); b2 = Math.min(b2, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } g.bounds = [a, b2, c, d]; }
    const [x0, y0, x1, y1] = g.bounds;
    const on = pavedTester(map, (x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2 + 8);
    const { pos, idx } = polyGeo(g.pts);
    if (!wetTriangles(pos, idx, wi) && !(on && pavedTriangles(pos, idx, on))) continue;
    overlap++;
    const out = dryPavedIndices(pos, idx, wi, on);
    dropped += idx.length - out.length;
    wet += wetTriangles(pos, out, wi);
    if (on) ok(pavedTriangles(pos, out, on) === 0, 'stad: geen groen op de verharding', g.kind || '');
  }
  ok(overlap > 0, 'de stad heeft groen dat water of een weg raakt', String(overlap));
  ok(wet === 0, 'stad: geen groene driehoek in water', String(wet));
  console.log(`stad: ${overlap} vlakken geknipt, ${dropped / 3} driehoeken weg`);
}

// --- de provincie: het water van de tegels ------------------------------------
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) {
  console.log('SKIP provincie: game/world heeft geen index-provincie.json');
} else {
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  const PW = await import('../game/js/provinceworld.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  const keys = Object.keys(T.index.tiles);
  const take = [];
  for (let i = 0; i < keys.length; i += 5) take.push(keys[i]);
  await Promise.all(take.map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  const TM = T.index.tileM || 320;
  // de oude route (alleen de stad) ziet het water van de tegels niet
  const stadIdx = getWaterIndex(map);
  const wi = (x, y) => waterIndexAt(map, x, y).inWater(x, y);
  let wetBefore = 0, wetAfter = 0, missedByCity = 0, wetPolys = 0, pavedDropped = 0, pavedAfter = 0, pavedPolys = 0;
  const cells = new Set();
  // elk groenvlak één keer (greenNear geeft een vlak voor elke tegel in de buurt terug)
  const seen = new Set();
  const list = [];
  for (const k of take) {
    const t = T.index.tiles[k];
    const cx = (t.i + 0.5) * TM, cy = (t.j + 0.5) * TM;
    for (const g of map.greenNear(cx, cy, TM * 0.7)) {
      if (!g.pts || g.pts.length < 3 || seen.has(g)) continue;
      seen.add(g);
      list.push(g);
    }
  }
  for (const g of list) {
    {
      if (!g.bounds) { let a = Infinity, b2 = Infinity, c = -Infinity, d = -Infinity; for (const p of g.pts) { a = Math.min(a, p[0]); b2 = Math.min(b2, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } g.bounds = [a, b2, c, d]; }
      const [x0, y0, x1, y1] = g.bounds;
      const on = pavedTester(map, (x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2 + 8);
      const { pos, idx } = polyGeo(g.pts);
      const wet = wetTriangles(pos, idx, wi);
      const pav = on ? pavedTriangles(pos, idx, on) : 0;
      if (wet) {
        wetPolys++;
        wetBefore += wet;
        missedByCity += wetTriangles(pos, idx, (x, y) => stadIdx.inWater(x, y));
        for (const p of g.pts) if (wet) { /* cel van dit vlak onthouden voor de graspollentest */ }
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        cells.add(Math.floor(mx / G.CELL) + ',' + Math.floor(my / G.CELL));
        const out = dryPavedIndices(pos, idx, wi, on);
        wetAfter += wetTriangles(pos, out, wi);
      }
      if (pav) {
        pavedPolys++;
        const out = dryPavedIndices(pos, idx, wi, on);
        pavedDropped += pav - pavedTriangles(pos, out, on);
        pavedAfter += pavedTriangles(pos, out, on);
      }
    }
  }
  ok(wetPolys > 0, 'provincie: groen raakt het water van de tegels', String(wetPolys));
  ok(missedByCity > 0, 'provincie: de stadsindex alleen ziet dat water niet (dat was de fout)', String(missedByCity));
  ok(wetAfter === 0, 'provincie: geen groene driehoek in water', String(wetAfter));
  ok(pavedPolys > 0, 'provincie: groen valt over de weg', String(pavedPolys));
  ok(pavedDropped > 0 && pavedAfter === 0, 'provincie: geen groen op de verharding', `weg ${pavedDropped} geknipt, ${pavedAfter} over`);
  console.log(`provincie: ${wetPolys} vlakken over water (${wetBefore} driehoeken), ${pavedPolys} vlakken over de weg (${pavedDropped} driehoeken geknipt)`);

  // --- geen graspollen in het water of op de rijbaan -------------------------
  const Q = G.QUALITY.hoog;
  let checked = 0, inWater = 0, onRoad = 0, inst = 0;
  for (const ck of [...cells].slice(0, 40)) {
    const [ci, cj] = ck.split(',').map(Number);
    const out = G.generateCell(map, ci, cj, Q, true);
    const roads = map.roadsNear(ci * G.CELL + G.CELL / 2, cj * G.CELL + G.CELL / 2, G.CELL);
    for (const type of ['grass', 'flower', 'shrub', 'hedge']) {
      const m = out[type] && out[type].m;
      if (!m) continue;
      for (let i = 0; i + 15 < m.length; i += 16) {
        const x = m[i + 12], z = m[i + 14];
        inst++;
        if (wi(x, z)) { inWater++; if (inWater < 4) console.log('   natte pol', type, x.toFixed(1), z.toFixed(1)); }
        for (const r of roads) {
          const h = (r.width || 0) / 2;
          for (let q = 0; q < r.pts.length - 1; q++) {
            const ax = r.pts[q][0], ay = r.pts[q][1], dx = r.pts[q + 1][0] - ax, dy = r.pts[q + 1][1] - ay;
            const l2 = dx * dx + dy * dy || 1e-9;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - ay) * dy) / l2));
            const ex = ax + dx * t - x, ey = ay + dy * t - z;
            if (ex * ex + ey * ey < h * h) { onRoad++; break; }
          }
        }
      }
    }
    checked++;
  }
  ok(inst > 100, 'graspollentest: er zijn cellen met gras', String(inst));
  ok(inWater === 0, 'geen graspol in het water', String(inWater));
  ok(onRoad === 0, 'geen graspol op de rijbaan', String(onRoad));
  console.log(`graspollen: ${inst} instanties in ${checked} cellen, ${inWater} nat, ${onRoad} op de weg`);
}

console.log(bad ? `${bad} van ${n} mislukt` : `grass_water_paved_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);

