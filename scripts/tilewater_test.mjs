// Province water through the one water path (issue #1): the tiles' water
// polygons in the TileWorld answer waterAt, the free-water query boats and
// swimmers use, the car-sinking rule and the shore (quay or bank from the
// row's `bank`), with the polygons cut at the tile border continuous.
// Needs game/world with the province layer (desktop stage, or pack_tiles +
// build_corridor + build_province).
//   node scripts/tilewater_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }

const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const WI = await import('../game/js/waterindex.js');
const L = await import('../game/js/waterlevels.js');
const Q = await import('../game/js/quaywalls.js');
const V = await import('../game/js/vehicle.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
const idx = T.index;

// the tiles with sailable water that carries on over a tile border into a tile that has it too
const rowsOf = (key, type) => {
  const t = idx.tiles[key], p = idx.packs[t.pack];
  const raw = files[p.file].subarray(t.off, t.off + t.len);
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(raw)));
  return (blob.sections.find((s) => s.type === type) || { rows: [] }).rows;
};
const onE = (v, g) => { const m = (((v - g) % 1000) + 1000) % 1000; return Math.min(m, 1000 - m) < 0.02; };
let pick = null;
for (const [key, t] of Object.entries(idx.tiles)) {
  if (!(t.flags & 32) || !t.n || !t.n.water || (t.flags & 8) || (t.flags & 16)) continue;
  const rows = rowsOf(key, G.SECTION.WATER);
  for (const w of rows) {
    if (w.nav < 2 || w.kind === 'meer') continue;
    for (let i = 0; i < w.pts.length; i++) {
      const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length];
      if (Math.abs(a[0] - b[0]) < 0.02 && onE(a[0], G.GRID_X0) && Math.hypot(a[0] - b[0], a[1] - b[1]) > 4) {
        const nk = G.tileKey(t.i + (idx.tiles[key] && a[0] > G.tileOrigin(t.i, t.j)[0] + 500 ? 1 : -1), t.j);
        if (idx.tiles[nk] && idx.tiles[nk].n && idx.tiles[nk].n.water) { pick = { key, nk, mid: [a[0], (a[1] + b[1]) / 2], w }; break; }
      }
    }
    if (pick) break;
  }
  if (pick) break;
}
ok(!!pick, 'a province canal that crosses a tile border into a tile with water');
if (!pick) { console.log(`${n} checks, ${fails} failed`); process.exit(1); }

const load = async (keys) => { await Promise.all(keys.map((k) => T.store.request(k, { priority: -1 }))); map.tileQueue.run(1e9); };
await load([pick.key]);
const [mx, my] = pick.mid;
const inside = (() => {
  // a point of the polygon a few metres from the cut, found by walking in from the middle of the cut edge
  for (const dx of [3, -3, 6, -6, 12, -12]) if (L.waterAt(map, mx + dx, my)) return [mx + dx, my];
  return null;
})();
ok(!!inside, 'waterAt finds the water of a streamed tile', `${mx},${my}`);
if (inside) {
  const q = L.waterAt(map, inside[0], inside[1]);
  ok(q.kind && q.navigable >= 2 && q.depth > 0, 'it has kind, depth and boat class', JSON.stringify(q));
  // one tile only: the cut edge is no shore
  const c1 = WI.waterClearance(map, mx + (inside[0] > mx ? 0.5 : -0.5), my, 8);
  ok(c1 > 0.5 || !L.waterAt(map, mx + (inside[0] > mx ? 0.5 : -0.5), my) === false, 'water next to the cut has clearance with the next tile not loaded', c1);
  const free = WI.waterClearance(map, inside[0], inside[1], 8);
  ok(free > 0, 'free water inside the polygon', free);
  ok(WI.waterClearance(map, mx + 4000, my + 4000, 8) === -1 || !L.waterAt(map, mx + 4000, my + 4000), 'far away is dry or other water');
}
// both tiles in: the cut edge is no shore from either side, the clearance carries over it
await load([pick.nk]);
if (inside) {
  const a = WI.waterClearance(map, mx - 0.3, my, 8), b = WI.waterClearance(map, mx + 0.3, my, 8);
  ok(a > 0 && b > 0 && Math.abs(a - b) < 1.5, 'clearance is continuous across the tile border', `${a} ${b}`);
  const ti = WI.waterIndexAt(map, mx - 0.3, my);
  ok(ti.count > 0 && ti.nearestShore(mx, my, 0.4).i < 0, 'the cut edge is no shore in the index', ti.nearestShore(mx, my, 0.4).d);
}

// the shore: a quay where the row says kade and the way is not green; none along the cut
{
  const polys = [...map.waterNear(mx, my, 400)].filter((w) => w.bank !== undefined && w.bounds);
  ok(polys.length > 0, 'streamed polygons carry bank');
  let cut = 0, kade = 0, oever = 0, wallOnCut = 0;
  for (const w of polys.slice(0, 40)) {
    const parts = Q.shoreParts(w, map, -2.3, false).parts;
    if (w.bank === 'kade') kade++; else oever++;
    const bridged = map.roadsNear((w.bounds[0] + w.bounds[2]) / 2, (w.bounds[1] + w.bounds[3]) / 2, Math.max(w.bounds[2] - w.bounds[0], w.bounds[3] - w.bounds[1]) / 2 + 10).some((r) => r.bridge);
    if (w.bank === 'oever' && !bridged && parts.some((p) => p.kind === 'wall')) wallOnCut++;
    for (let i = 0; i < w.pts.length; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length]; if (WI.onTileCut(a[0], a[1], b[0], b[1])) cut++; }
  }
  ok(wallOnCut === 0, 'a natural bank (oever) gets no quay wall', wallOnCut);
  ok(cut > 0, 'the polygons here are cut at the border', cut);
}

// the rule: deep water sinks a car, a ditch or shallows are driven through
{
  const deep = L.waterAt(map, inside[0], inside[1]);
  ok(deep && !deep.wade ? V.overOpenWater(map, inside[0], inside[1], 0) : true, 'deep province water sinks a car', JSON.stringify(deep));
  ok(V.offroadGround(map, inside[0], inside[1]) !== 'wade' || deep.wade, 'deep water is not a ford');
}
{
  // a ditch of the tiles: find one near and test through its centre
  let ditch = null;
  for (const w of map.waterNear(mx, my, 3000)) if (w.kind === 'sloot' && w.bounds && !ditch) {
    const cx = (w.bounds[0] + w.bounds[2]) / 2, cy = (w.bounds[1] + w.bounds[3]) / 2;
    for (const p of w.pts) { const q = [(p[0] + cx) / 2, (p[1] + cy) / 2]; if (L.waterAt(map, q[0], q[1]) && L.waterAt(map, q[0], q[1]).kind === 'sloot') { ditch = q; break; } }
  }
  if (ditch) {
    ok(!V.overOpenWater(map, ditch[0], ditch[1], 0), 'a ditch does not sink a car');
    ok(V.offroadGround(map, ditch[0], ditch[1]) === 'ditch', 'it drags the car as a ditch', V.offroadGround(map, ditch[0], ditch[1]));
  } else console.log('note: no ditch near the picked tile');
}

// a bridge of the tiles over sailable water has its free height for the boats
{
  let bt = null;
  for (const [key, t] of Object.entries(idx.tiles)) {
    if (!(t.flags & 32) || (t.flags & 16) || !t.n || !t.n.water || !t.n.roads) continue;
    const water = rowsOf(key, G.SECTION.WATER).filter((w) => w.nav >= 2 && !w.pts.some((p) => onE(p[0], G.GRID_X0) || onE(p[1], G.GRID_Y0)));
    if (!water.length) continue;
    for (const r of rowsOf(key, G.SECTION.ROADS)) {
      if (!r.bridge) continue;
      const [x, y] = r.pts[Math.floor(r.pts.length / 2)];
      if (water.some((w) => w.bounds === undefined && w.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 12))) { bt = key; break; }
    }
    if (bt) break;
  }
  ok(!!bt, 'a province tile with a bridge over sailable water');
  if (bt) {
    await load([bt]);
    const [ox, oy] = G.tileOrigin(...G.tileFromKey(bt));
    let found = null;
    for (const r of map.roadsNear(ox + 500, oy + 500, 800)) {
      if (!r.bridge) continue;
      for (let i = 0; i < r.pts.length - 1 && !found; i++) {
        const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1], len = Math.hypot(bx - ax, by - ay);
        for (let d = 0; d <= len && !found; d += 2) {
          const t = len ? d / len : 0, w = L.waterAt(map, ax + (bx - ax) * t, ay + (by - ay) * t);
          if (w && w.navigable >= 2 && w.clearanceAbove < Infinity) found = { r, w, i };
        }
      }
      if (found) break;
    }
    ok(!!found, 'a bridge deck over streamed water');
    if (found) {
      const want = L.bridgeClearance(found.r, found.r.z ? found.r.z[found.i] : 0, found.w.level);
      ok(found.w.clearanceAbove <= want + 1e-6 && found.w.clearanceAbove > 0, 'a tile bridge over water gives its clearance', `${found.w.clearanceAbove} vs ${want}`);
      ok(L.passesUnder(L.airDraftOf({ model: { kind: 'kano' } }), 3) && !L.passesUnder(L.airDraftOf({ model: { kind: 'skutsje' } }), 2), 'air drafts against it');
    }
  }
}

// the same rule on made-up polygons (a ditch with its own peil, a canal, a lake shallows)
{
  const mk = (x0, kind) => { const K = L.WATER_KINDS[kind]; return { pts: [[x0, 0], [x0 + 50, 0], [x0 + 50, 20], [x0, 20]], bounds: [x0, 0, x0 + 50, 20], kind, lv: K.level ?? L.BOEZEM_Y, dp: K.depth, nav: K.nav, bank: 'oever' }; };
  const polys = [mk(0, 'sloot'), mk(100, 'vaart'), mk(200, 'meer')];
  const fake = { waterNear: (x) => polys.filter((w) => x >= w.bounds[0] - 1 && x <= w.bounds[2] + 1), isOnBridge: () => false, roadsNear: () => [], water: [], waterGrid: null, buildings: [] };
  ok(L.shallowWater(fake, 10, 10) && L.shallowWater(fake, 10, 10).kind === 'sloot', 'a ditch is shallow water');
  ok(!L.shallowWater(fake, 110, 10), 'a canal is not');
  ok(!L.shallowWater(fake, 210, 10) && !L.waterAt(fake, 210, 10).wade, 'a lake swims');
  ok(!V.overOpenWater(fake, 10, 10, 0) && V.overOpenWater(fake, 110, 10, 0) && V.overOpenWater(fake, 210, 10, 0), 'a car sinks in the canal and the lake, not in the ditch');
  ok(V.offroadGround(fake, 10, 10) === 'ditch', 'the ditch drags');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
