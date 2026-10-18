// Pariteit van de stad uit de OSM-bouw (stadsprofiel) met de stad uit citymap.json (#90 fase 3):
// dezelfde vragen aan twee TileWorlds. Slaat over zonder provincie-extract.
import assert from 'node:assert/strict';
import { haveProvince } from './world/build_province.mjs';
import { buildPair, compare } from './lib/cityparity.mjs';

if (!haveProvince()) { console.log('SKIP city_parity_test: geen data/cache/province'); process.exit(0); }
const { A, B, core } = await buildPair();
const r = compare(A, B, core, Number(process.env.PARITY_STEP) || 40);
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '-') + '%';
console.log(`punten ${r.points} in ${core.length} kerntegels`);
console.log(`water: beide nat ${r.water.both}, alleen stad ${r.water.dryB}, alleen schaduw ${r.water.dryA}; soort gelijk ${pct(r.water.kind, r.water.both)}, vaarklasse ${pct(r.water.nav, r.water.both)}, peil ${pct(r.water.lv, r.water.both)}`);
console.log(`gebouw ja/nee gelijk ${pct(r.building.agree, r.building.n)}; weg binnen 3 m ${pct(r.road.within3, r.road.n)}, 8 m ${pct(r.road.within8, r.road.n)}; hoogte binnen 0,5 m ${pct(r.height.within05, r.height.n)}`);
console.log('soort stad>schaduw', JSON.stringify(r.water.pairs));
if (process.env.PARITY_DEBUG) console.log((r.water.ex || []).filter((_, i) => i % 6 === 0).map((e) => e.join(' ')).join('\n'));
const T = JSON.parse(process.env.PARITY_MIN || '{}');
assert.ok(r.building.agree / r.building.n >= (T.building ?? 0.9), 'gebouwen');
assert.ok(r.road.within8 / r.road.n >= (T.road ?? 0.9), 'wegen');
assert.ok(r.height.within05 / r.height.n >= (T.height ?? 0.9), 'hoogte');
assert.ok((r.water.dryA + r.water.dryB) / Math.max(1, r.water.both + r.water.dryA + r.water.dryB) <= (T.waterDiff ?? 0.15), 'water aanwezig');
assert.ok(r.water.kind / Math.max(1, r.water.both) >= (T.waterKind ?? 0.85), 'watersoort');
assert.ok(r.water.lv / Math.max(1, r.water.both) >= 0.95, 'waterpeil');
console.log('city_parity_test: ok');
