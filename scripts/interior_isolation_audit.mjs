// Binnenruimte-isolatie-audit (eigenaar 22-11: wereldobjecten die door een interieur heen komen). Telt op de echte kaart hoeveel
// straatmeubilair en bomen in het volume van een betreedbaar interieur vallen (de hal van planInterior, plus de
// voetafdruk van het ding). De drempel is NUL: elke teller moet 0 zijn, anders faalt de audit.
//
//   node scripts/interior_isolation_audit.mjs [--world=<map met index-provincie.json>] [--tiles=<max>] [--json] [--alles] [--props [--straal=500]]
//
// Lagen: de gemapte meubels uit de tegels (FURNITURE, na dezelfde filter als het spel: streetfurniture3d spotFreeOnMap), de
// regelmeubels van furnitureForTile (lantaarns, banken, prullenbakken, borden) en de bomen uit de tegels (TREES). Zonder
// game/world: SKIP. Standaard alleen de stad (stad.json meta.bounds); --alles neemt de hele provincie.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const cands = [arg('world'), path.join(ROOT, 'game/world'), 'C:/Users/abuis/GIT/GDE-Groningen/game/world'].filter(Boolean);
const WORLD = cands.map((c) => path.resolve(c)).find((c) => fs.existsSync(path.join(c, 'index-provincie.json')));
if (!WORLD) { console.log('SKIP geen game/world met de provinciegegevens (--world=<map>)'); process.exit(0); }
const MAX_TILES = Number(arg('tiles', 1e9));
const ALL = process.argv.includes('--alles');
const PROPS = process.argv.includes('--props'); // deel B (zwaar: laadt de hele stadswereld)
const RADIUS = Number(arg('straal', 500)); // m rond het stadscentrum voor deel B

await import('./node3d.mjs');
const { buildBuildingMesh } = await import('../game/js/models3d_buildings.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { makeSpotIndex, spotFor } = await import('../game/js/interiorspots.js');
const Fac = await import('../game/js/facilities.js');
const { setShopSpots, spotsFrom } = await import('../game/js/shopspots.js');
const G = await import('../game/js/gdt.js');
const SF = await import('../game/js/streetfurniture.js');
const { addInteriorVolume, clearInteriorVolumes, volumeOfPlan, interiorVolumeAt } = await import('../game/js/interiorvolume.js');
const { buildingAt } = await import('../game/js/tileplace.js');

const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'));
const meta = readJson('stad.json').meta;
Fac.setExtraBuiltWorld((x, y) => { const [i, j] = G.tileIndexOf(x, y); const t = index.tiles[G.tileKey(i, j)]; return !!t && !!(t.flags & 4); });
const map0 = { meta };
Fac.initFacilities(map0, readJson('facilities.json'));
Fac.initShopPlaces(map0, readJson('shopplaces.json'));
setShopSpots(spotsFrom(Fac.FAC.all));
const spotIdx = makeSpotIndex(Fac.FAC.all);
const cb = meta.bounds;
const inCity = (x, y) => ALL || (!!cb && x > cb[0] && x < cb[2] && y > cb[1] && y < cb[3]);

const bnd = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
function readTiles(keys) {
  const fds = new Map(), res = new Map();
  for (const k of keys) {
    const t = index.tiles[k]; if (!t) continue;
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(WORLD, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    const rows = (ty, need = true) => ((blob.sections.find((s) => s.type === ty) || { rows: [] }).rows).filter((r) => !need || (r.pts && r.pts.length > 1)).map((r) => (r.pts ? { ...r, bounds: bnd(r.pts) } : r));
    res.set(k, { buildings: rows(G.SECTION.BUILDINGS), roads: rows(G.SECTION.ROADS), water: rows(G.SECTION.WATER), rails: rows(G.SECTION.RAILS), furniture: rows(G.SECTION.FURNITURE, false), trees: rows(G.SECTION.TREES, false) });
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return res;
}

const tileHitsCity = (t) => { const x0 = G.tileOriginX(t.i), y0 = G.tileOriginY(t.j); return ALL || !cb || (x0 + G.TILE_M > cb[0] && x0 < cb[2] && y0 + G.TILE_M > cb[1] && y0 < cb[3]); };
const keys = Object.keys(index.tiles).filter((k) => tileHitsCity(index.tiles[k])).slice(0, MAX_TILES);
const near = (list) => (x, y, r) => list.filter((o) => o.bounds && x >= o.bounds[0] - r && x <= o.bounds[2] + r && y >= o.bounds[1] - r && y <= o.bounds[3] + r);
const out = { panden: 0, betreedbaar: 0, meubelsGemapt: 0, meubelsRegel: 0, bomen: 0, inHal: { gemapt: 0, regel: 0, boom: 0 }, voorbeelden: [] };
const seen = new Set();
const t0 = Date.now();
const POINT = new Set(['lamp', 'bench', 'bin', 'bikerack', 'shelter', 'bollard', 'placesign', 'wegwijzer', 'speedbump']);
for (let i = 0; i < keys.length; i += 4) {
  const tiles = readTiles(keys.slice(i, i + 4));
  const all = (kind) => { const s = new Set(), o = []; for (const t of tiles.values()) for (const r of t[kind]) { if (r.gid !== undefined) { if (s.has(r.gid)) continue; s.add(r.gid); } o.push(r); } return o; };
  const buildings = all('buildings');
  const map = { buildingsNear: near(buildings) };
  clearInteriorVolumes();
  let any = false;
  for (const b of buildings) {
    if (seen.has(b.gid) || !b.pts || b.pts.length < 4) continue;
    seen.add(b.gid);
    if (!inCity(b.bounds[0], b.bounds[1])) continue;
    out.panden++;
    try { buildBuildingMesh(b); } catch (e) { continue; }
    const en = b.entrance; if (!en) continue;
    const p = planInterior(b, { spot: spotFor(spotIdx, b.pts, en, 4) });
    if (!p.ok) continue;
    out.betreedbaar++; any = true;
    addInteriorVolume('b' + b.gid, volumeOfPlan(p, 0));
  }
  if (!any) continue;
  const hit = (kind, x, y, r, what) => { const z = interiorVolumeAt(x, y, r, null, 0); if (!z) return; out.inHal[kind]++; if (out.voorbeelden.length < 12) out.voorbeelden.push({ laag: kind, wat: what, x: +x.toFixed(1), y: +y.toFixed(1) }); };
  // wat het spel zelf neerzet na zijn filter: spotFreeOnMap (huis 0,35 m; lantaarn LAMP_AWNING)
  const free = (x, y, k) => !buildingAt(map, x, y, k === 'lamp' ? SF.LAMP_AWNING : 0.35);
  for (const t of tiles.values()) {
    for (const f of t.furniture) {
      const pts = f.pts || [[f.x, f.y]];
      if (!POINT.has(f.k)) { for (let k = 0; k < pts.length; k++) { out.meubelsGemapt++; hit('gemapt', pts[k][0], pts[k][1], 0.1, f.k); } continue; }
      for (const q of pts) { out.meubelsGemapt++; if (free(q[0], q[1], f.k)) hit('gemapt', q[0], q[1], 0.3, f.k); }
    }
    for (const tr of t.trees) for (const q of tr.p || []) { out.bomen++; hit('boom', q[0], q[1], 0.25, 'boom'); }
  }
  // de regelmeubels van een tegel (lantaarns, banken, borden, ...), met de wegen en de huizen van de tegel zelf
  for (const [k, t] of tiles) {
    const x0 = G.tileOriginX(index.tiles[k].i), y0 = G.tileOriginY(index.tiles[k].j);
    try {
      const res = SF.furnitureForTile({ x0, y0, size: G.TILE_M, roads: t.roads, mapped: t.furniture, water: t.water, rails: t.rails, buildings: t.buildings, opts: {} });
      for (const it of res.items) { if (!POINT.has(it.k)) continue; out.meubelsRegel++; if (free(it.x, it.y, it.k)) hit('regel', it.x, it.y, 0.3, it.k); }
    } catch (e) { /* een tegel zonder genoeg gegevens telt niet mee */ }
  }
  if ((i / 4) % 25 === 0) process.stderr.write(`  tegel ${i}/${keys.length}, ${out.panden} panden, ${out.betreedbaar} betreedbaar, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}

// --- deel B: de losse props van de stad (cityprops.js: banken, bakken, fietsen, terrastafels, kramen, ...) op de echte wereld ---
out.inHal.prop = 0; out.props = 0; out.celPropsPerSoort = {};
{
  const { loadGameWorld } = await import('./worldload.mjs');
  const T = await loadGameWorld();
  if (PROPS && T && cb) {
    const W = T.world;
    const CP = await import('../game/js/cityprops.js');
    CP.initCityProps({ map: W, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [], time: 0 });
    clearInteriorVolumes();
    const done = new Set();
    for (const b of W.buildingsNear((cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2, RADIUS + 50)) {
      if (done.has(b.gid ?? b) || !b.pts || b.pts.length < 4) continue;
      done.add(b.gid ?? b);
      try { buildBuildingMesh(b); } catch (e) { continue; }
      if (!b.entrance) continue;
      const p = planInterior(b, { spot: spotFor(spotIdx, b.pts, b.entrance, 4) });
      if (p.ok) addInteriorVolume('w' + (b.gid ?? done.size), volumeOfPlan(p, 0));
    }
    const C = CP.CLUTTER_CELL;
    const mx = (cb[0] + cb[2]) / 2, my = (cb[1] + cb[3]) / 2;
    for (let gx = Math.floor((mx - RADIUS) / C); gx <= Math.floor((mx + RADIUS) / C); gx++) for (let gy = Math.floor((my - RADIUS) / C); gy <= Math.floor((my + RADIUS) / C); gy++) {
      for (const pr of CP.cellPropSpots(W, gx, gy)) {
        out.props++;
        const r = Math.max(pr.r || 0, 0.3), half = pr.half || 0;
        const ends = half ? [[pr.x - Math.cos(pr.angle) * half, pr.y - Math.sin(pr.angle) * half], [pr.x, pr.y], [pr.x + Math.cos(pr.angle) * half, pr.y + Math.sin(pr.angle) * half]] : [[pr.x, pr.y]];
        if (ends.some(([x, y]) => interiorVolumeAt(x, y, r, null, 0))) { out.inHal.prop++; out.celPropsPerSoort[pr.kind] = (out.celPropsPerSoort[pr.kind] || 0) + 1; if (out.voorbeelden.length < 24) out.voorbeelden.push({ laag: 'prop', wat: pr.kind, x: +pr.x.toFixed(1), y: +pr.y.toFixed(1) }); }
      }
    }
    out.zones = done.size;
  } else if (PROPS) console.log('deel B: SKIP (geen stad of geen wereld)');
}

const totaal = out.inHal.gemapt + out.inHal.regel + out.inHal.boom + out.inHal.prop;
if (process.argv.includes('--json')) console.log(JSON.stringify({ ...out, totaal }, null, 1));
else {
  console.log(`${out.panden} panden bekeken, ${out.betreedbaar} betreedbaar (met een hal); ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`bekeken: ${out.meubelsGemapt} gemapte meubels, ${out.meubelsRegel} regelmeubels, ${out.bomen} bomen`);
  console.log(`in een hal (de hal zelf, plus de eigen voetafdruk van het ding): gemapt ${out.inHal.gemapt}, regel ${out.inHal.regel}, bomen ${out.inHal.boom}  => totaal ${totaal}`);
  console.log(`losse stadsprops (cityprops.js): ${out.props} bekeken, ${out.inHal.prop} in een hal ${JSON.stringify(out.celPropsPerSoort)}`);
  for (const v of out.voorbeelden) console.log('  ', JSON.stringify(v));
}
process.exit(totaal === 0 ? 0 : 1);
