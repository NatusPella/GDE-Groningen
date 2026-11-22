// Akte 4 (Zuidwaarts), perfect-ronde 22-11: staan de plekken van de reisstappen en de missieplekken van akte 4 op de
// geladen tegels op droge, vrije grond, en kan de speler binnen de aankomststraal komen?
//   node scripts/akte4_plekken_test.mjs   (zonder game/world met de provincie: SKIP)
import fs from 'node:fs';
import './node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP akte4_plekken_test: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { PLACES } = await import('../game/js/missions_akte4.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });

const reisSteps = STEPS.filter((s) => s.part === 'zuid').filter((s) => s.goal && s.goal.type === 'reis');
const pts = [];
for (const [k, [la, lo]] of Object.entries(PLACES)) pts.push({ name: `PLACES.${k}`, xy: wgsToWorld(la, lo), r: 0 });
for (const s of reisSteps) pts.push({ name: `${s.id} ${s.goal.to}`, xy: wgsToWorld(s.goal.at[0], s.goal.at[1]), r: s.goal.r || 300 });

const keys = new Set();
for (const p of pts) for (let dx = -300; dx <= 300; dx += 100) for (let dy = -300; dy <= 300; dy += 100) {
  const [i, j] = G.tileIndexOf(p.xy[0] + dx, p.xy[1] + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
try { const { patchRows } = await import('../game/js/vaarnet.js'); map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip)); } catch (e) { /* geen vaarnet: de test telt alleen de tegels */ }

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const inBuilding = (x, y) => map.buildingsNear(x, y, 0.4).some((b) => {
  const [minx, miny, maxx, maxy] = b.bounds;
  return x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts);
});
ok(map.buildingsNear(...wgsToWorld(53.1060, 6.8790), 300).length > 20, 'de tegels van Veendam zijn geladen (gebouwen in de buurt van J4)');
ok(reisSteps.length >= 5, `de reisstappen van akte 4 zijn gevonden (${reisSteps.length})`);
for (const p of pts) {
  const [x, y] = p.xy;
  if (p.r) {
    // een reisdoel telt als bereikt binnen de straal: er moet droge, vrije grond binnen de straal liggen
    let found = false;
    for (let a = 0; a < 360 && !found; a += 30) for (const rr of [0, p.r * 0.3, p.r * 0.6, p.r * 0.9]) {
      const px = x + Math.cos(a * Math.PI / 180) * rr, py = y + Math.sin(a * Math.PI / 180) * rr;
      if (!isInWater(map, px, py) && !inBuilding(px, py) && map.canWalkOut(px, py, 3)) { found = true; break; }
    }
    ok(found, `${p.name}: er is open grond binnen de aankomststraal (${p.r} m)`, `${x.toFixed(0)},${y.toFixed(0)}`);
  } else if (/boot|Boot|Kade|veendam[A-D]|Gracht|Wal|Kruit/.test(p.name)) {
    // water- en vestingpunten zijn met de hand op de tegels gemeten (bourtange_test, #948-#955): geen tweede oordeel
    ok(Number.isFinite(x) && Number.isFinite(y), `${p.name}: eindige plek`);
  } else {
    ok(!isInWater(map, x, y), `${p.name}: niet in het water`, `${x.toFixed(0)},${y.toFixed(0)}`);
    ok(!inBuilding(x, y), `${p.name}: niet in een gebouw`);
  }
}
console.log(`akte4_plekken_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
