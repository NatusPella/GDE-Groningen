// Hoogte-audit van de wegen zelf met ?terrain (#269): hoe liggen de profielen (zt) van de gebouwde tegels over het reliëf?
//   node scripts/world/terrain_hoogte_audit.mjs [--world=<map>] [--list[=n]] [--flat] [--json <bestand>]
// Leest de tegels van een gebouwde wereld (game/world of desktop/build/game/world), zet elk wegstuk zoals het spel met ?terrain
// (zt, of zonder profiel vlak over het terrein) en meet:
//   - sprongen: een stap van 0,8 m of meer tussen twee hoekpunten die hooguit 12 m uit elkaar liggen;
//   - voegen: twee wegstukken met een gedeeld hoekpunt (kruispunt, tegelrand) die daar meer dan 10 cm verschillen;
//   - hellingen: de steilste 8 m van elke autoweg (boven 18% genoemd, boven 35% een fout);
//   - water en bruggen: vaste bruggen over vaarwater (nav 4) onder de hoogte van de vaste brug, en autowegen door water zonder dek.
// --flat meet dezelfde dingen met de vlakke profielen (z) zonder terrein, ter vergelijking (de situatie zonder vlag).
// Harde fouten (exit 1), alleen waar een profiel van ons meedoet (zt): een NaN in de hoogtes, een sprong van 3 m of meer, een voeg van 1 m of
// meer, een helling boven 35%, een vaste brug over vaarwater die alleen met de vlag meer dan 0,3 m onder zijn hoogte ligt. Een weg die het
// terrein volgt toont de kliffen en scheuren van de data zelf: dat is een rapport.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from '../../game/js/gdt.js';
import { TerrainField } from '../../game/js/terrainraster.js';
import { auditSurface, auditWaterLevels, SURFACE } from '../../game/js/terrainaudit.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { pointInPolygon } from '../../game/js/polygon.js';
import { SHIPPING_DECK_Z } from './province_profile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((q) => q.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const flat = args.includes('--flat');
const listN = args.includes('--list') ? 10 : Number(opt('list', 0));

const dir = path.resolve(opt('world', '') || ['game/world', 'desktop/build/game/world'].map((d) => path.join(ROOT, d)).find((d) => fs.existsSync(path.join(d, 'index.json'))) || '');
if (!fs.existsSync(path.join(dir, 'index.json'))) { console.log('SKIP geen gebouwde wereld (cd desktop && npm run stage, of --world=<map>)'); process.exit(0); }
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
// the province's and the proefstrook's tiles join the city's (tileworld.js mergeIndex: a tile the index already has stays)
for (const name of ['index-provincie.json', 'index-corridor.json']) {
  const f2 = path.join(dir, name);
  if (!fs.existsSync(f2)) continue;
  const extra = JSON.parse(fs.readFileSync(f2, 'utf8'));
  for (const [pk, p] of Object.entries(extra.packs || {})) if (!index.packs[pk]) index.packs[pk] = p;
  for (const [k, t] of Object.entries(extra.tiles || {})) if (!index.tiles[k]) index.tiles[k] = t;
}

// alle tegels, per pack in één keer gelezen
const field = new TerrainField();
const pieces = [], waters = new SpatialGrid(128);
let rasters = 0, withZt = 0;
const flatPieces = [];
const fds = new Map();
for (const [k, t] of Object.entries(index.tiles)) {
  const file = index.packs[t.pack].file;
  if (!fds.has(file)) fds.set(file, fs.openSync(path.join(dir, file), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(file), buf, 0, t.len, t.off);
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
  const rows = (ty) => (blob.sections.find((s) => s.type === ty) || { rows: [] }).rows;
  const ras = blob.sections.find((s) => s.type === G.SECTION.RASTER);
  if (ras) { field.add(k, ras.raster); rasters++; }
  const heights = new Map(rows(G.SECTION.HEIGHTS).map((h) => [h.gid, h]));
  for (const r of rows(G.SECTION.ROADS)) {
    if (!r.pts || r.pts.length < 2) continue;
    const h = heights.get(r.gid);
    let z = null;
    if (h) { if (flat) z = h.z || null; else if (h.zt) { z = h.zt; withZt++; } else if (!h.zf) z = h.z || null; }
    pieces.push({ ...r, z, ours: !!z && (r.cat === 'major' || !!r.bridge || !!r.tunnel) });
    flatPieces.push({ ...r, z: h ? h.z || null : null });
  }
  for (const w of rows(G.SECTION.WATER)) {
    if (!w.pts || w.pts.length < 4) continue;
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of w.pts) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
    w.bounds = b;
    waters.insert(w, b);
  }
}
for (const fd of fds.values()) fs.closeSync(fd);
console.log(`${dir}: ${Object.keys(index.tiles).length} tegels, ${pieces.length} wegstukken, ${rasters} rasters, ${withZt} wegstukken met een terreinprofiel${flat ? ' (--flat: de vlakke profielen)' : ''}`);
if (!flat && !rasters) { console.log('SKIP geen rasters in de tegels (data/world/ahn en een verse stage)'); process.exit(0); }

const T = flat ? () => 0 : field.at;
const wetAt = (x, y) => {
  for (const w of waters.query(x - 0.5, y - 0.5, x + 0.5, y + 0.5)) {
    if (x < w.bounds[0] || x > w.bounds[2] || y < w.bounds[1] || y > w.bounds[3]) continue;
    if (pointInPolygon(x, y, w.pts)) return w;
  }
  return null;
};

let hard = 0;
const fail = (m) => { hard++; console.log('FAIL ' + m); };
const f = (v, d = 2) => Number(v).toFixed(d);
const CARS = new Set(['major', 'normal', 'minor']);
const surf = auditSurface(pieces.filter((r) => CARS.has(r.cat)), T);
const surfFlat = flat ? null : auditSurface(flatPieces.filter((r) => CARS.has(r.cat)), () => 0);
const st = surf.stats;
if (!Number.isFinite(st.maxGrade)) fail('NaN in de hoogtes');
console.log(`autowegstukken ${st.pieces}, ${f(st.km, 0)} km; p95 van de steilste 8 m ${f(st.p95Grade * 100, 1)}%, steilste ${f(st.maxGrade * 100, 1)}%`);
if (surfFlat) console.log(`  (dezelfde wegen met de vlakke profielen: sprongen ${surfFlat.jumps.length}, voegen ${surfFlat.joints.length}, steiler dan ${SURFACE.carGrade * 100}%: ${surfFlat.steep.length}, p95 ${f(surfFlat.stats.p95Grade * 100, 1)}%, steilste ${f(surfFlat.stats.maxGrade * 100, 1)}%)`);
console.log(`sprongen (>= ${SURFACE.jump} m binnen ${SURFACE.jumpLen} m): ${surf.jumps.length}; voegen (> ${SURFACE.joint * 100} cm): ${surf.joints.length}; steiler dan ${SURFACE.carGrade * 100}%: ${surf.steep.length}`);
// (hard only where a profile of ours is involved: a road that follows the terrain shows the cliffs and tears of the data itself)
const hardJump = surf.jumps.find((q) => q.prof && q.dz >= 3), hardJoint = surf.joints.find((q) => q.prof && q.d >= 1), hardSteep = surf.steep.find((q) => q.prof && q.grade > SURFACE.hardGrade);
console.log(`  met een profiel van ons: sprongen ${surf.jumps.filter((q) => q.prof).length}, voegen ${surf.joints.filter((q) => q.prof).length}, steiler dan ${SURFACE.carGrade * 100}%: ${surf.steep.filter((q) => q.prof).length}; zonder (volgt het terrein): ${surf.jumps.filter((q) => !q.prof).length}, ${surf.joints.filter((q) => !q.prof).length}, ${surf.steep.filter((q) => !q.prof).length}`);
if (hardJump) fail(`sprong van ${f(hardJump.dz, 1)} m op ${Math.round(hardJump.x)},${Math.round(hardJump.y)} (${hardJump.road})`);
if (hardJoint) fail(`voeg van ${f(hardJoint.d, 1)} m op ${hardJoint.at} (${hardJoint.roads})`);
if (hardSteep) fail(`helling van ${f(hardSteep.grade * 100, 0)}% op ${Math.round(hardSteep.x)},${Math.round(hardSteep.y)} (${hardSteep.road})`);
for (const j of surf.jumps.slice(0, listN)) console.log(`  sprong ${f(j.dz, 1)} m over ${f(j.len, 0)} m: ${j.road} op ${Math.round(j.x)},${Math.round(j.y)}`);
for (const j of surf.joints.slice(0, listN)) console.log(`  voeg ${f(j.d)} m op ${j.at}: ${j.roads}`);
for (const j of surf.steep.slice(0, listN)) console.log(`  helling ${f(j.grade * 100, 0)}%: ${j.road} op ${Math.round(j.x)},${Math.round(j.y)}`);

const wet = auditWaterLevels(pieces, T, wetAt, { shippingMin: SHIPPING_DECK_Z });
// (the city's bridges lie at street level over water that lies lower: only a bridge that is lower than it is without the flag counts)
const wetFlat = flat ? null : auditWaterLevels(flatPieces, () => 0, wetAt, { shippingMin: SHIPPING_DECK_Z });
const lowFlat = new Set((wetFlat ? wetFlat.low : []).map((q) => q.gid + '@' + Math.round(q.x / 40) + ',' + Math.round(q.y / 40)));
const lowNew = wet.low.filter((q) => !lowFlat.has(q.gid + '@' + Math.round(q.x / 40) + ',' + Math.round(q.y / 40)));
console.log(`bruggen over water: ${wet.decks}; vaste bruggen over vaarwater onder hun hoogte (${f(SHIPPING_DECK_Z)} m): ${wet.low.length}${wetFlat ? `, zonder de vlag ${wetFlat.low.length}, alleen met de vlag ${lowNew.length}` : ''}; autowegen door water zonder dek: ${wet.dry.length}${wetFlat ? ` (zonder de vlag ${wetFlat.dry.length})` : ''}`);
if (lowNew.length) fail(`${lowNew.length} vaste bruggen over vaarwater alleen met de vlag te laag, de laagste ${f(lowNew[0].h)} m bij ${Math.round(lowNew[0].x)},${Math.round(lowNew[0].y)} (${lowNew[0].road})`);
for (const j of lowNew.slice(0, listN)) console.log(`  brug ${f(j.h)} m (nodig ${f(j.need)}): ${j.road} op ${Math.round(j.x)},${Math.round(j.y)}`);
for (const j of wet.dry.slice(0, listN)) console.log(`  door water ${f(j.wet, 0)} m: ${j.road} op ${Math.round(j.x)},${Math.round(j.y)}`);

const jf = opt('json', null) || (args.includes('--json') ? args[args.indexOf('--json') + 1] : null);
if (jf) fs.writeFileSync(jf, JSON.stringify({ world: dir, flat, stats: st, jumps: surf.jumps.slice(0, 200), joints: surf.joints.slice(0, 200), steep: surf.steep.slice(0, 200), water: { decks: wet.decks, low: wet.low, dry: wet.dry.slice(0, 200) } }, null, 1));
console.log(hard ? `${hard} harde fouten` : 'terrain hoogte audit ok');
process.exit(hard ? 1 : 0);
