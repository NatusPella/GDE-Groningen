// Bereikbaarheidsaudit van de interieurs (epic #1150): hoeveel panden in de provincie kunnen echt betreden worden, per
// soort, en waarom de rest niet. Dezelfde functie als het spel (planInterior) op de echte voetafdrukken uit de gebouwde
// tegels, met de echte gevelbouwer (die de voordeur kiest: b.entrance). Alle panden met een winkel of voorziening erin worden
// volledig gemeten; de rest steekproefsgewijs (elk N-de pand, standaard 15) en opgeschaald per bouwtype.
//   node scripts/interior_audit.mjs [--world=<map met index-provincie.json>] [--sample=15] [--tiles=<max>] [--json]
// Zonder game/world: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { worldDir } from './lib/worldlocator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const WORLD = path.resolve(arg('world', worldDir()));
if (!fs.existsSync(path.join(WORLD, 'index-provincie.json'))) { console.log('SKIP geen game/world met de provinciegegevens (--world=<map>)'); process.exit(0); }
const SAMPLE = Math.max(1, Number(arg('sample', 15)));
const MAX_TILES = Number(arg('tiles', 1e9));

await import('./node3d.mjs');
const { loadTiles } = await import('./world/prop_conflict_audit.mjs');
const { buildBuildingMesh, setBuildingMap } = await import('../game/js/models3d_buildings.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { makeSpotIndex, spotFor } = await import('../game/js/interiorspots.js');
const Fac = await import('../game/js/facilities.js');
const { setShopSpots, spotsFrom } = await import('../game/js/shopspots.js');
const G = await import('../game/js/gdt.js');

const GAME = path.dirname(WORLD);
const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'));
const meta = readJson('stad.json').meta;
Fac.setExtraBuiltWorld((x, y) => { const [i, j] = G.tileIndexOf(x, y); const t = index.tiles[G.tileKey(i, j)]; return !!t && !!(t.flags & 4); });
const map = { meta };
Fac.initFacilities(map, readJson('facilities.json'));
Fac.initShopPlaces(map, readJson('shopplaces.json'));
setShopSpots(spotsFrom(Fac.FAC.all));
const spotIdx = makeSpotIndex(Fac.FAC.all);
const inCity = (x, y) => { const b = meta.bounds; return !!b && x > b[0] && x < b[2] && y > b[1] && y < b[3]; };

const keys = Object.keys(index.tiles).slice(0, MAX_TILES);
const total = { all: 0, sampled: 0, poi: 0 };
const byType = new Map();   // OSM type -> { n, s, ok }
const byKind = new Map();   // kind/sub -> { s, ok, why:{} }
const why = {};
const bump = (m, k, f) => { let r = m.get(k); if (!r) m.set(k, r = { n: 0, s: 0, ok: 0, why: {} }); f(r); };
const seen = new Set();
const t0 = Date.now();
let cnt = 0;
for (let i = 0; i < keys.length; i += 8) {
  const tiles = loadTiles(WORLD, index, keys.slice(i, i + 8));
  for (const t of tiles.values()) {
    for (const b of t.buildings) {
      if (seen.has(b.gid)) continue;
      seen.add(b.gid);
      total.all++;
      const type = b.type || 'yes';
      bump(byType, type, (r) => { r.n++; });
      if (!b.pts || b.pts.length < 4) continue;
      const poi = !!spotFor(spotIdx, b.pts, null, 6);
      const sample = poi || (cnt++ % SAMPLE === 0);
      if (!sample) continue;
      if (poi) total.poi++; else total.sampled++;
      try { buildBuildingMesh(b); } catch (e) { continue; }
      const en = b.entrance;
      const spot = en ? spotFor(spotIdx, b.pts, en, 4) : null;
      const p = planInterior(b, { spot });
      const city = en ? inCity(b.bounds[0], b.bounds[1]) : false;
      bump(byType, type, (r) => { if (!poi) { r.s++; if (p.ok) r.ok++; else r.why[p.why] = (r.why[p.why] || 0) + 1; } });
      const kk = p.ok ? `${p.kind}${p.sub ? '/' + p.sub : ''}` : null;
      if (p.ok) bump(byKind, p.kind, (r) => { r.s++; r.ok++; r.poi = (r.poi || 0) + (poi ? 1 : 0); r.city = (r.city || 0) + (city ? 1 : 0); });
      else { why[p.why] = (why[p.why] || 0) + 1; bump(byKind, 'niet', (r) => { r.s++; r.why[p.why] = (r.why[p.why] || 0) + 1; r.poi = (r.poi || 0) + (poi ? 1 : 0); }); }
      void kk;
      b._geo3dParts = null; b.entrance = b.entrance;
    }
  }
  if ((i / 8) % 40 === 0) process.stderr.write(`  tegel ${i}/${keys.length}, ${total.all} panden, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}

// opschalen per bouwtype: gesampled deel -> alle panden van dat type (POI-panden zijn exact gemeten en daarom apart)
let estOk = 0;
const typeRows = [];
for (const [type, r] of byType) {
  const rate = r.s ? r.ok / r.s : 0;
  const est = Math.round(r.n * rate);
  estOk += est;
  typeRows.push({ type, n: r.n, sampled: r.s, rate: Math.round(rate * 1000) / 10, est, why: r.why });
}
typeRows.sort((a, b) => b.n - a.n);
const res = { panden: total.all, poiPanden: total.poi, steekproef: total.sampled, geschatBetreedbaar: estOk, aandeel: Math.round(estOk / total.all * 1000) / 10, perBouwtype: typeRows.slice(0, 24), redenNiet: why, perSoort: Object.fromEntries([...byKind].map(([k, r]) => [k, { s: r.s, ok: r.ok, poi: r.poi || 0, stad: r.city || 0, why: r.why }])), seconden: Math.round((Date.now() - t0) / 1000) };
if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 1));
else {
  console.log(`${res.panden} panden; ${res.poiPanden} met een winkel of voorziening (alle gemeten) en ${res.steekproef} uit de steekproef (1 op ${SAMPLE}); ${res.seconden} s`);
  console.log(`geschat betreedbaar: ${res.geschatBetreedbaar} (${res.aandeel}%)`);
  console.log('reden dat een gemeten pand niet kan: ' + Object.entries(why).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log('bouwtype            panden  steekproef  betreedbaar%  geschat');
  for (const r of typeRows.slice(0, 24)) console.log(`${r.type.padEnd(18)} ${String(r.n).padStart(7)} ${String(r.sampled).padStart(10)} ${String(r.rate).padStart(12)} ${String(r.est).padStart(8)}  ${Object.entries(r.why).map(([k, v]) => k + ' ' + v).join(' ')}`);
  console.log('soorten (gemeten panden, POI + steekproef): ' + [...byKind].map(([k, r]) => `${k} ${r.ok ?? 0}/${r.s} (poi ${r.poi || 0})`).join(', '));
}
