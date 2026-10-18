// Test voor de waterplekken (game/js/waterplekken.js, scripts/world/waterplekken.mjs, #23 #7):
// classificatie uit OSM-tags, kits, celbudget, audit en het gebouwde bestand.
//   node scripts/waterplekken_test.mjs
import fs from 'node:fs';
import { classifyPlek, lineInfo, decimate, kitFor, partsToWorld, tileBudget, auditPlekken, langsLijn, PLEK_TYPES, CEL_BUDGET, celVan } from '../game/js/waterplekken.js';
import { collectPlekken, dedupePlekken, finishPlekken } from './world/waterplekken.mjs';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

// classificatie
const cls = (t, node) => classifyPlek(t, node)?.type;
ok(cls({ lock: 'yes', waterway: 'canal' }) === 'sluis', 'lock=yes is een sluis');
ok(cls({ waterway: 'lock_gate' }) === 'sluisdeur', 'lock_gate is een sluisdeur');
ok(cls({ bridge: 'movable', 'bridge:movable': 'lift' }) === 'brug' && classifyPlek({ 'bridge:movable': 'lift' }).sub === 'lift', 'beweegbare brug (lift)');
ok(cls({ 'bridge:movable': 'swing' }) === 'brug', 'draaibrug');
ok(cls({ leisure: 'marina' }) === 'jachthaven', 'marina');
ok(cls({ landuse: 'harbour' }) === 'haven' && cls({ waterway: 'dock' }) === 'haven', 'haven en dok');
ok(cls({ man_made: 'lighthouse' }, true) === 'vuurtoren', 'vuurtoren');
ok(cls({ man_made: 'groyne' }) === 'strekdam' && cls({ man_made: 'breakwater' }) === 'golfbreker' && cls({ man_made: 'pier' }) === 'pier' && cls({ man_made: 'dyke' }) === 'dijk', 'zeewerken');
ok(cls({ waterway: 'weir' }) === 'stuw' && cls({ leisure: 'slipway' }) === 'helling', 'stuw en helling');
ok(classifyPlek({ highway: 'residential' }) === null && classifyPlek(null) === null, 'rest blijft weg');
ok(classifyPlek({ lock: 'yes', lock_name: 'Dorkwerdersluis', name: 'Reitdiep' }).name === 'Dorkwerdersluis', 'sluisnaam gaat voor');

// lineInfo
const li = lineInfo([[0, 0], [30, 0], [30, 4], [0, 4]]);
ok(Math.abs(li.len - 30) < 0.5 && Math.abs(li.wid - 4) < 0.5 && Math.abs(li.x - 15) < 0.5, 'lineInfo van een kistje');
ok(decimate(Array.from({ length: 100 }, (_, i) => [i, 0]), 12).length === 12, 'decimate');

// kits: elk type heeft er een binnen zijn cap, geen NaN, onderdelen boven of op het water
const proef = {
  sluis: { id: 1, t: 'sluis', x: 0, y: 0, a: 0.3, l: 60, w: 9 }, sluisdeur: { id: 2, t: 'sluisdeur', x: 0, y: 0, a: 0, l: 9 },
  brug: { id: 3, t: 'brug', sub: 'lift', x: 0, y: 0, a: 0, l: 20, w: 7 }, vuurtoren: { id: 4, t: 'vuurtoren', x: 0, y: 0, a: 0, l: 0, h: 30 },
  haven: { id: 5, t: 'haven', x: 0, y: 0, a: 0, l: 120, w: 40 }, jachthaven: { id: 6, t: 'jachthaven', x: 0, y: 0, a: 0, l: 60, w: 25 },
  stuw: { id: 7, t: 'stuw', x: 0, y: 0, a: 0, l: 12 }, helling: { id: 8, t: 'helling', x: 0, y: 0, a: 0, l: 8, w: 4 },
  strekdam: { id: 9, t: 'strekdam', x: 50, y: 50, a: 0, l: 80, pts: [[10, 50], [90, 50]] }, pier: { id: 10, t: 'pier', x: 0, y: 0, a: 0, l: 60 },
  golfbreker: { id: 11, t: 'golfbreker', x: 0, y: 0, a: 0, l: 100 }, dijk: { id: 12, t: 'dijk', x: 0, y: 0, a: 0, l: 200 },
};
for (const type of Object.keys(PLEK_TYPES)) {
  const p = proef[type];
  ok(!!p, `proefplek voor ${type}`);
  const kit = kitFor(p), w = partsToWorld(p, kit);
  ok(kit.length >= 3 && kit.length <= PLEK_TYPES[type].cap, `${type}: kit van ${kit.length} onderdelen binnen de cap`);
  ok(w.every((q) => [q.x, q.y, q.z, q.w, q.h, q.d, q.ry].every(Number.isFinite) && q.y >= 0 && q.w > 0 && q.h > 0), `${type}: eindige onderdelen boven het water`);
}
ok(kitFor({ id: 1, t: 'onbekend' }).length === 0, 'onbekend type heeft geen kit');
ok(JSON.stringify(kitFor(proef.haven)) === JSON.stringify(kitFor(proef.haven)), 'kit is deterministisch');
ok(kitFor({ ...proef.vuurtoren, h: 50 }).length > kitFor({ ...proef.vuurtoren, h: 14 }).length, 'hogere vuurtoren heeft meer segmenten');
// een strekdam in wereldcoordinaten: palen liggen langs de lijn
const sd = partsToWorld(proef.strekdam);
ok(sd.length >= 15 && sd.every((q) => Math.abs(q.z - 50) < 0.01 && q.x >= 9.9 && q.x <= 90.1), 'strekdam: palen langs de lijn');
ok(langsLijn([[0, 0], [10, 0], [10, 10]], { x: 0, y: 0, a: 0 }, (x, z) => [{ x, z }], 5, 99).length === 5, 'langsLijn houdt de stap over de knik');
const wr = partsToWorld({ x: 100, y: 200, a: Math.PI / 2 }, [{ s: 'box', x: 10, y: 0, z: 0, w: 1, h: 1, d: 1, c: 0, ry: 0 }])[0];
ok(Math.abs(wr.x - 100) < 1e-9 && Math.abs(wr.z - 210) < 1e-9, 'lokaal x loopt langs de richting van de plek');

// budget per cel
const veel = Array.from({ length: 200 }, (_, i) => ({ id: i, t: 'strekdam', x: 10 + i % 10, y: 10, a: 0, l: 40 }));
veel.push({ id: 999, t: 'vuurtoren', x: 12, y: 12, a: 0, l: 0, h: 20 }, { id: 998, t: 'sluis', x: 14, y: 14, a: 0, l: 40, w: 8 });
const b = tileBudget(veel);
ok(b.kept.filter((p) => p.t === 'strekdam').length === CEL_BUDGET.perType.strekdam, 'strekdammen begrensd per cel');
ok(b.kept.some((p) => p.t === 'vuurtoren') && b.kept.some((p) => p.t === 'sluis'), 'vuurtoren en sluis blijven boven strekdammen');
ok(b.dropped.strekdam === 200 - CEL_BUDGET.perType.strekdam, 'weggelaten strekdammen geteld');
ok([...b.perCel.values()].every((v) => v <= CEL_BUDGET.onderdelen), 'celbudget onderdelen');
ok(celVan(-1, 0) === '-1,0' && celVan(513, 0) === '1,0', 'celVan');

// bouwer op synthetische OSM
const els = [
  { type: 'way', id: 1, tags: { lock: 'yes', lock_name: 'Proefsluis', waterway: 'canal', width: '10' }, g: [[53.2, 6.6], [53.2002, 6.6]] },
  { type: 'way', id: 2, tags: { lock: 'yes', waterway: 'canal' }, g: [[53.2, 6.60001], [53.20021, 6.60001]] },
  { type: 'node', id: 3, lat: 53.4, lon: 6.5, tags: { man_made: 'lighthouse', name: 'Proeftoren', height: '28' } },
  { type: 'way', id: 4, tags: { man_made: 'groyne' }, g: [[53.45, 6.5], [53.4502, 6.5], [53.4504, 6.5001]] },
  { type: 'way', id: 5, tags: { man_made: 'groyne' }, g: [[53.45, 6.7], [53.450001, 6.7]] },
  { type: 'way', id: 6, tags: { highway: 'path' }, g: [[53.1, 6.1], [53.1, 6.2]] },
];
const acc = collectPlekken(els);
const res = finishPlekken(acc);
ok(res.alle.filter((p) => p.t === 'sluis').length === 1, 'dubbele sluis samengevoegd');
const sluis = res.alle.find((p) => p.t === 'sluis');
ok(sluis.n === 'Proefsluis' && sluis.w === 10 && sluis.l > 15, 'sluis: naam, breedte en lengte');
ok(res.alle.find((p) => p.t === 'vuurtoren').h === 28, 'vuurtoren: hoogte uit de tag');
ok(res.alle.filter((p) => p.t === 'strekdam').length === 1, 'te korte strekdam valt af');
ok(acc.ruw.sluis === 2, 'ruwe telling telt wat OSM had');
const rows = auditPlekken(res.alle, acc.ruw, res.budget);
ok(rows.length === Object.keys(PLEK_TYPES).length, 'auditrij per type');
ok(rows.find((r) => r.type === 'sluis').ruw === 2 && rows.find((r) => r.type === 'sluis').ontbreekt.length > 0, 'audit meldt wat samengevoegd is');
ok(rows.find((r) => r.type === 'pier').gebouwd === 0 && rows.find((r) => r.type === 'pier').herkenbaar === 0, 'audit: type zonder plekken');
ok(dedupePlekken([{ t: 'strekdam', x: 0, y: 0 }, { t: 'strekdam', x: 1, y: 0 }]).length === 2, 'strekdammen worden niet samengevoegd');

// het gebouwde bestand (als het er is)
const bestand = new URL('../game/waterplekken.json', import.meta.url);
if (fs.existsSync(bestand)) {
  const j = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  ok(j.v === 1 && j.cel === 512 && j.plekken.length > 0, 'waterplekken.json: formaat');
  ok(j.plekken.every((p) => PLEK_TYPES[p.t] && [p.x, p.y, p.a, p.l].every(Number.isFinite)), 'waterplekken.json: types en getallen');
  ok(tileBudget(j.plekken).kept.length === j.plekken.length, 'waterplekken.json zit binnen het celbudget');
  ok(j.plekken.filter((p) => p.t === 'sluis').length >= 20 && j.plekken.some((p) => p.t === 'vuurtoren'), 'bestand heeft sluizen en een vuurtoren');
}

console.log(fails ? `${fails} van ${n} mislukt` : `waterplekken_test ok (${n})`);
process.exit(fails ? 1 : 0);
