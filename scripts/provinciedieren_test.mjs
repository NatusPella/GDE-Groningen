// De provinciedieren (23-11, Quaternius CC0): ree, vos, wolf, ezel, alpaca en varken. Modellen laden en animeren (alle clips,
// eindig), mesh-LOD's met duidelijk minder driehoeken, en het gedrag: ree en vos vluchten, erfdieren blijven op hun plek,
// en de wolf (ADR 0042): loert, valt aan en bijt binnen bereik, verjaagd door een auto, laat sporen en gehuil vooraf, pakt
// vee zonder getoond geweld, en bijt bij Samen spelen alleen de speler van dit apparaat.
//   node scripts/provinciedieren_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const AM = await import('../game/js/animalmodels.js');
const W = await import('../game/js/wildlife.js');
const P = await import('../game/js/provinceanimals.js');
const X = await import('../game/js/coopextra.js');
let n = 0, bad = 0;
const check = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };
for (const id of AM.ANIMAL_MODEL_IDS) AM.primeAnimalModel(id, JSON.parse(fs.readFileSync(new URL(`../game/models/dieren/${id}.json`, import.meta.url), 'utf8')));

// --- modellen, clips en LOD's ---
for (const id of AM.ANIMAL_MODEL_IDS) {
  const g = W.buildWildlifeMesh3D({ kind: id, bobSeed: 0.3 });
  const tris = AM.animalModelTris(id);
  check(`${id}: drie LOD's met duidelijk minder driehoeken`, tris.length === 3 && tris[1] <= tris[0] * 0.8 && tris[2] <= tris[0] * 0.5, tris.join('/'));
  let ok = true;
  for (const st of [{ speed: 0 }, { speed: 1 }, { speed: 5 }, { speed: 0, state: 'aanval' }, { speed: 0, state: 'schrik' }, { dead: true, deadSide: 1 }]) {
    try {
      const a = { kind: id, bobSeed: 0.3, angle: 0, ...st };
      for (let t = 0; t < 2; t += 0.1) W.animateWildlifeMesh3D(g, a, t);
      g.updateMatrixWorld(true);
      g.traverse((o) => { for (const v of o.matrixWorld.elements) if (!Number.isFinite(v)) ok = false; });
    } catch (e) { ok = false; console.log(e); }
  }
  check(`${id}: alle toestanden animeren eindig`, ok);
  // de LOD stapt bij afstand en de overgang dithert en eindigt
  g.userData.lodD2 = 80 * 80;
  for (let t = 2; t < 3; t += 0.05) W.animateWildlifeMesh3D(g, { kind: id, bobSeed: 0.3, angle: 0, speed: 0 }, t);
  check(`${id}: ver weg de laagste LOD`, g.userData.lod.level === 2 && g.userData.lod.twin.visible === false);
}

// --- gedrag ---
const map = new Proxy({ meta: { horeca: [] }, _bridgeRails: new Map() }, { get: (t, k) => (k in t ? t[k] : () => []) });
const mkWorld = (px, py) => ({ time: 10, clock: 22, player: { x: px, y: py, vx: 0, vy: 0, inVehicle: null }, vehicles: [], map, wildlife: [], pedestrians: [], weather: null, msgs: [], addMessage(t) { this.msgs.push(t); } });
const ctx = (world) => ({
  world, rng: Math.random,
  nearest: () => world.player, mover: () => (world.player.inVehicle ? { x: world.player.x, y: world.player.y, speed: Math.abs(world.player.inVehicle.speed || 0), kind: 'voertuig' } : { x: world.player.x, y: world.player.y, speed: Math.hypot(world.player.vx, world.player.vy), kind: 'speler' }),
  steer: (a, tx, ty, turn, dt) => { a.angle = Math.atan2(ty - a.y, tx - a.x); a.x += Math.cos(a.angle) * a.speed * dt; a.y += Math.sin(a.angle) * a.speed * dt; a.stride = (a.stride || 0) + a.speed * dt; },
  openGround: () => true,
  playersNear: (a, r) => Math.hypot(a.x - world.player.x, a.y - world.player.y) < r,
  prey: (a, r) => world.wildlife.find((o) => o.kind === 'sheep' && !o.gone && Math.hypot(o.x - a.x, o.y - a.y) < r) || null,
  message: (t) => world.addMessage(t),
  bite: (body, d) => { if (body === world.player) P.queueAnimalHit(world, d); },
});
{
  const w = mkWorld(0, 0);
  w.player.vx = 2;
  const ree = { kind: 'ree', x: 20, y: 0, angle: 0, speed: 0, wanderTarget: { x: 20, y: 0 }, homeX: 20, homeY: 0, homeRadius: 12, waypointTimer: 5 };
  P.updateProvinceAnimal(ree, 0.1, ctx(w));
  check('een ree vlucht voor een lopende speler op 20 m', ree.fleeT > 0 && ree.wanderTarget.x > 20);
  const ezel = { kind: 'ezel', x: 3, y: 0, angle: 0, speed: 0, wanderTarget: { x: 3, y: 0 }, homeX: 3, homeY: 0, homeRadius: 3, waypointTimer: 0 };
  for (let i = 0; i < 200; i++) P.updateProvinceAnimal(ezel, 0.1, ctx(w));
  check('een ezel blijft op zijn erf, ook met een speler dichtbij', Math.hypot(ezel.x - 3, ezel.y) < 3.5 && !(ezel.fleeT > 0));
}
{
  // de wolf: sporen, loeren, aanvallen en bijten
  const w = mkWorld(0, 0);
  const wolf = { kind: 'wolf', x: 45, y: 0, angle: Math.PI, speed: 0, wanderTarget: { x: 45, y: 0 }, homeX: 45, homeY: 0, homeRadius: 40, waypointTimer: 5, state: 'zwerf', bites: 0, biteT: 0 };
  P.updateProvinceAnimal(wolf, 0.1, ctx(w));
  check('de wolf laat sporen zien voor je hem tegenkomt', wolf.tracks && w.msgs.some((m) => /pootafdrukken/.test(m)));
  wolf.x = 20;
  P.updateProvinceAnimal(wolf, 0.1, ctx(w));
  check('op 20 m loert de wolf: stil en naar je toe gedraaid', wolf.state === 'loer' && wolf.speed === 0 && Math.abs(Math.cos(wolf.angle) + 1) < 1e-6);
  wolf.x = 7;
  let hits = 0, aanval = false;
  for (let i = 0; i < 40; i++) { P.updateProvinceAnimal(wolf, 0.1, ctx(w)); hits += P.takeAnimalHits(w, () => {}); if (wolf.state === 'aanval') aanval = true; }
  check('dichterbij dan 9 m valt hij aan en bijt hij (met pauzes)', aanval && hits >= P.WOLF_BITE * 2 && hits <= P.WOLF_BITE * 4, String(hits));
  for (let i = 0; i < 40; i++) P.updateProvinceAnimal(wolf, 0.1, ctx(w));
  check('na drie beten gaat hij ervandoor', wolf.state === 'vlucht');
  let dmg = 0;
  P.queueAnimalHit(w, 14); P.takeAnimalHits(w, (world, d, soort) => { dmg += d; check('de beet is gewone melee-schade (geen bloed)', soort === 'melee'); });
  check('takeAnimalHits geeft de schade door aan damagePlayer', dmg === 14);
}
{
  const w = mkWorld(0, 0);
  w.player.inVehicle = { speed: 8 };
  const wolf = { kind: 'wolf', x: 15, y: 0, angle: 0, speed: 0, wanderTarget: { x: 15, y: 0 }, homeX: 15, homeY: 0, homeRadius: 40, waypointTimer: 5, state: 'loer', bites: 0, biteT: 0, tracks: true };
  P.updateProvinceAnimal(wolf, 0.1, ctx(w));
  check('een auto verjaagt de wolf', wolf.state === 'vlucht');
}
{
  const w = mkWorld(500, 0);
  const schaap = { kind: 'sheep', x: 10, y: 0, speed: 0 };
  w.wildlife.push(schaap);
  const wolf = { kind: 'wolf', x: 0, y: 0, angle: 0, speed: 0, wanderTarget: { x: 0, y: 0 }, homeX: 0, homeY: 0, homeRadius: 40, waypointTimer: 5, state: 'zwerf', bites: 0, biteT: 0, tracks: true };
  for (let i = 0; i < 60 && !schaap.gone; i++) P.updateProvinceAnimal(wolf, 0.1, ctx(w));
  check('zonder mensen in de buurt pakt de wolf een schaap: het is weg, er wordt niets getoond', schaap.gone === true && wolf.state === 'vlucht' && !schaap.dead);
}
{
  // Samen spelen: de wolf bijt alleen het lichaam van dit apparaat; een meespeler neemt de beet in zijn eigen spel
  const w = mkWorld(0, 0);
  const c = ctx(w);
  c.bite({ x: 1, y: 1 }, 14);
  check('een beet op een meespeler komt niet in de rij van deze speler', !(w.animalHits && w.animalHits.length));
  check('de wolf staat in de dierenlijst van het netwerk, achteraan', X.DIER_SOORTEN.indexOf('wolf') > X.DIER_SOORTEN.indexOf('dog'));
  check('de aanval gaat mee naar de gast', X.WOLF_STATES_NET[2] === 'aanval' && P.WOLF_STATES[2] === 'aanval');
}
{
  // spawn: de wolf alleen 's nachts in de grensstreek, ver van huizen, en eerst gehoord
  const msgs = [];
  const sctx = (streekId, hour, urban) => ({ rng: () => 0.001, streekId, hour, greenPoint: () => ({ x: 90, y: 0 }), openGround: () => true, urbanAt: () => urban, inKom: () => false, message: (t) => msgs.push(t) });
  const nacht = P.spawnProvinceAnimals(sctx('westerwolde', 23, 0), {});
  check('in Westerwolde komt er s nachts een wolf, met gehuil vooraf', nacht.some((a) => a.kind === 'wolf') && msgs.some((m) => /huilt een wolf/.test(m)));
  check('overdag geen wolf', !P.spawnProvinceAnimals(sctx('westerwolde', 13, 0), {}).some((a) => a.kind === 'wolf'));
  check('in het Hogeland geen wolf', !P.spawnProvinceAnimals(sctx('hogeland', 23, 0), {}).some((a) => a.kind === 'wolf'));
  check('erfdieren alleen aan de dorpsrand', P.spawnProvinceAnimals(sctx('westerkwartier', 12, 0.15), {}).some((a) => ['ezel', 'alpaca', 'varken'].includes(a.kind)) && !P.spawnProvinceAnimals(sctx('westerkwartier', 12, 0), {}).some((a) => ['ezel', 'alpaca', 'varken'].includes(a.kind)));
}
console.log(`provinciedieren_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
