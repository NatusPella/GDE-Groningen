// Voetgangers op het worker-contract (simambient.js) + gelaagd versus oud pad.
//   node scripts/simambient_test.mjs
import assert from 'node:assert/strict';
import { isAmbientPed, nearestRoad, planGiveToWorker } from '../game/js/simambient.js';
import { createSimHost } from '../game/js/simhost.js';
import { workerId } from '../game/js/simhandover.js';
import { doelPerLaag, laagVoorAfstand, spawnRing, despawnAfstand, streekVanProfiel } from '../game/js/simlagen.js';

const roads = [{ id: 3, pts: new Float32Array([0, 0, 500, 0]) }, { id: 4, pts: new Float32Array([0, 100, 500, 100]) }];
assert.ok(isAmbientPed({ state: 'wander' }));
for (const k of ['isCop', 'scene', 'ragdoll', 'missionCrowd', 'jobPed', 'nightlife', 'leader']) assert.ok(!isAmbientPed({ state: 'wander', [k]: true }), k);
assert.ok(!isAmbientPed({ state: 'flee' }) && !isAmbientPed(null));
assert.equal(nearestRoad(roads, 40, 3).road, 3);
assert.equal(nearestRoad(roads, 40, 50), null);

const player = { x: 0, y: 0 };
const peds = [{ x: 300, y: 2, state: 'wander', speed: 1.2 }, { x: 50, y: 1, state: 'wander' }, { x: 300, y: 2, state: 'wander', isCop: true }, { x: 300, y: 50, state: 'wander' }];
const plan = planGiveToWorker(peds, player, roads, workerId(0));
assert.equal(plan.length, 1);
assert.deepEqual(plan[0].agent, { id: workerId(0), road: 3, s: 300, speed: 1.2, kind: 'ped' });

// terugval op de hoofdthread: voetganger loopt via de host zonder Worker
const host = createSimHost({ useWorker: false });
host.init(roads); host.spawn(plan.map((p) => p.agent));
assert.equal(host.mode(), 'main');
for (let i = 0; i < 20; i++) host.step(i, 0.1);
assert.ok(Math.abs(host.positions().get(workerId(0)).x - (300 + 1.2 * 2)) < 1e-3);

// ---- deterministische headless populatiesimulatie: oud pad (vast doel) versus lagen ----
// Speler loopt 600 s over een lijn; populatiebeheer zoals manageTrafficPopulation /
// managePopulation: spawn in ring, despawn voorbij afstand. Entiteiten dwalen willekeurig.
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function simuleer(soort, cfg, seed) {
  const rnd = lcg(seed), ents = [];
  const stat = { dichtbij: 0, middel: 0, ontmoetingen: 0, n: 0, maxN: 0, ids: new Set() };
  let id = 0;
  for (let t = 0; t < 600; t += 0.5) {
    const sp = { x: t * 1.4, y: 0 };
    for (const e of ents) { e.x += (rnd() - 0.5) * 2; e.y += (rnd() - 0.5) * 2; }
    for (let i = ents.length - 1; i >= 0; i--) if (Math.hypot(ents[i].x - sp.x, ents[i].y - sp.y) > cfg.despawn) ents.splice(i, 1);
    let k = 0;
    while (ents.length < cfg.target && k++ < 6) {
      const a = rnd() * 6.283, r = cfg.min + rnd() * (cfg.max - cfg.min);
      ents.push({ x: sp.x + Math.cos(a) * r, y: sp.y + Math.sin(a) * r, id: id++ });
    }
    stat.n += ents.length; stat.maxN = Math.max(stat.maxN, ents.length);
    for (const e of ents) {
      const d = Math.hypot(e.x - sp.x, e.y - sp.y);
      if (d < 40) { stat.dichtbij++; stat.ids.add(e.id); }
      if (d < 150) stat.middel++;
    }
  }
  stat.ontmoetingen = stat.ids.size;
  return stat;
}
const OUD = { auto: { target: 30, min: 70, max: 170, despawn: 260 }, voetganger: { target: 28, min: 35, max: 90, despawn: 150 } };
for (const soort of ['auto', 'voetganger']) {
  const d = doelPerLaag(soort, streekVanProfiel('standaard'), 12), ring = spawnRing(soort);
  // voetgangers spawnen in pedestrians.js met vaste ring (spawnPedsRaw) en worden alleen bij overschot opgeruimd: alleen het doel verschilt
  const nieuw = soort === 'auto' ? { target: d.vol + d.vereenvoudigd, min: ring.min, max: ring.max, despawn: despawnAfstand(soort) } : { ...OUD.voetganger, target: d.vol + d.vereenvoudigd };
  const o = simuleer(soort, OUD[soort], 7), n = simuleer(soort, nieuw, 7), n2 = simuleer(soort, nieuw, 7);
  assert.deepEqual([n.dichtbij, n.ontmoetingen, n.maxN], [n2.dichtbij, n2.ontmoetingen, n2.maxN], soort + ' deterministisch');
  assert.ok(n.maxN <= nieuw.target + 6, soort + ' doel gehaald niet overschreden');
  // zelfde orde van grootte aan ontmoetingen binnen 40 m (factor 0,4 tot 2,5 van het oude pad)
  const ratio = n.ontmoetingen / Math.max(1, o.ontmoetingen);
  console.log(soort, 'ontmoetingen oud', o.ontmoetingen, 'lagen', n.ontmoetingen, 'ratio', ratio.toFixed(2), 'gem. aantal oud', (o.n / 1200).toFixed(0), 'lagen', (n.n / 1200).toFixed(0));
  assert.ok(ratio > 0.4 && ratio < 2.5, soort + ' ontmoetingen vergelijkbaar ' + ratio);
  assert.equal(laagVoorAfstand(soort, 10), 'vol');
}
console.log('simambient_test ok');
