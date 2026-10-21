// De stad uit de tegelbouw (#90): de oude stadskaart bestaat niet meer, dus dit telt wat er in de stad moet staan.
// De drempels liggen onder de gemeten stand (20 oktober 2026: 51.728 gebouwen, 12.159 wegen, 22.744 bomen, 75 overkappingen,
// 454 bruggen) zodat een nieuwe OSM-extract niet meteen faalt, maar een verloren laag wel. Zonder data/cache/province: SKIP.
//   node scripts/stad_test.mjs
import assert from 'node:assert/strict';
import { loadCityWorld } from './lib/loadworld.mjs';
const { map } = await loadCityWorld();
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const len = (a) => (a ? a.length : 0);
ok(len(map.buildings) > 48000, `gebouwen ${len(map.buildings)}`);
ok(len(map.roads) > 11000, `wegen ${len(map.roads)}`);
ok(len(map.rails) > 150, `spoor ${len(map.rails)}`);
ok(len(map.water) > 600, `water ${len(map.water)}`);
ok(len(map.green) > 3000, `groen ${len(map.green)}`);
ok(len(map.trees) > 20000, `bomen ${len(map.trees)}`);
ok(len(map.canopies) > 60, `overkappingen ${len(map.canopies)}`);
ok(len(map.stations) >= 3, 'stations');
ok(len(map.meta.trafficLights) > 400 && len(map.meta.horeca) > 400 && len(map.meta.shops) >= 50 && len(map.meta.landmarks) >= 14, 'meta-lijsten');
// de handgemaakte gebouwen (stad.json) staan er met hun landmarkmodel
const lm = new Set(map.buildings.filter((b) => b.landmark).map((b) => b.landmark));
for (const name of ['Martinitoren', 'Martinikerk', 'Der Aa-kerk', 'Academiegebouw', 'Goudkantoor', 'Forum Groningen', 'Groninger Museum', 'Euroborg', 'Hoofdstation Groningen', 'Winkelcentrum Paddepoel']) ok(lm.has(name), `landmark ${name}`);
ok(map.buildings.filter((b) => b.landmark).length >= 30, 'alle 30 landmarkrijen');
// kunstwerken en hoogteprofielen
ok(map.roads.filter((r) => r.bridge).length > 350, 'bruggen');
ok(map.roads.filter((r) => r.movable).length >= 30, 'beweegbare bruggen');
ok(map.roads.filter((r) => r.tunnel).length > 80, 'tunnels');
ok(map.roads.filter((r) => r.z).length > 450, 'wegen met hoogteprofiel');
// geen dubbele handgebouwen: een OSM-gebouw dat een handgebouw bedekt vervalt
const hand = map.buildings.filter((b) => b.landmark);
let overlap = 0;
for (const h of hand) for (const b of map.buildings) if (b !== h && !b.landmark && b.pts.length > 3 && Math.abs(b.pts[0][0] - h.pts[0][0]) < 0.01 && Math.abs(b.pts[0][1] - h.pts[0][1]) < 0.01) overlap++;
ok(overlap === 0, 'geen OSM-gebouw op de plek van een handgebouw');
console.log(`stad_test: ok (${n} checks)`);
