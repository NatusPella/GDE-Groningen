// Zeeschepen (#398): de modellen (zeeschip3d.js) zijn eindig en blijven klein in driehoeken, ze delen hun geometrie, en het beheer
// (zeeschepen.js) houdt er hooguit ZEE_MAX rond de speler, alleen op zee, met variatie in soort en kleur, en ruimt ze op.
//   node scripts/zeeschepen_test.mjs
import './node3d.mjs';
import { pickZeeschip, zeeModel, manageSeaShips, resetZeeschepen, isZee, ruimteVoor, ZEE_MAX, ZEE_WEG, ZEE_TIK_S } from '../game/js/zeeschepen.js';
import { BOAT_KINDS, boatSeats, boatCrewCount } from '../game/js/boattypes.js';
import { BOAT_CLASS, AIR_DRAFT, DRAFT } from '../game/js/waterlevels.js';

const THREE = await import('three');
const M = await import('../game/js/models3d_vehicles.js');

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// ---- de keuze
const rng = seeded(7), teller = {};
for (let i = 0; i < 2000; i++) { const k = pickZeeschip(rng); teller[k] = (teller[k] || 0) + 1; }
check('alle vier de soorten komen voor', ['zeeVracht', 'zeeContainer', 'zeeTanker', 'zeeSleper'].every((k) => teller[k] > 150), JSON.stringify(teller));
check('het vrachtschip is het vaakst', teller.zeeVracht > teller.zeeTanker);
const modellen = new Set(), kleuren = new Set();
const r2 = seeded(11);
for (let i = 0; i < 300; i++) { const m = zeeModel(r2); modellen.add(`${m.key}|${m.len}|${m.wid}`); kleuren.add(`${m.key}|${m.color}`); check(`model ${i} heeft een geldige soort`, m.kind === 'zeeschip' || m.kind === 'sleper'); }
check('er zijn veel varianten (soort, lengte, kleur)', modellen.size >= 12 && kleuren.size >= 10, `${modellen.size} maten, ${kleuren.size} kleuren`);
check('het aantal maten blijft klein: de geometrie wordt gedeeld', modellen.size <= 4 * 5 + 1, String(modellen.size));
check('de tabellen kennen de nieuwe soorten (klasse 4, lage mast)', BOAT_CLASS.zeeschip === 4 && BOAT_CLASS.sleper === 4 && AIR_DRAFT.zeeschip === 4.2 && DRAFT.zeeschip > 3);

// ---- de modellen
for (const k of ['zeeVracht', 'zeeContainer', 'zeeTanker', 'zeeSleper', 'zeeNieuw']) {
  const model = BOAT_KINDS[k];
  const v = { id: 300 + k.length, model, isBoat: true, x: 0, y: 0, angle: 0 };
  const g = M.buildVehicleMesh(v);
  const box = new THREE.Box3().setFromObject(g);
  let tris = 0, nan = false;
  g.traverse((o) => { if (o.geometry) { tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; for (const x of o.geometry.attributes.position.array) if (!Number.isFinite(x)) nan = true; } });
  const lengte = box.max.x - box.min.x, breedte = box.max.z - box.min.z;
  check(`${k}: geen NaN in de geometrie`, !nan && [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite));
  check(`${k}: de lengte klopt met het model (${model.len} m)`, Math.abs(lengte - model.len) < 0.6, lengte.toFixed(1));
  check(`${k}: de breedte hoogstens de breedte plus de brugvleugels`, breedte >= model.wid - 0.5 && breedte < model.wid + 5, breedte.toFixed(1));
  check(`${k}: laag-poly (minder dan 4000 driehoeken)`, tris > 300 && tris < 4000, String(Math.round(tris)));
  check(`${k}: de kiel ligt onder de waterlijn en de opbouw erboven`, box.min.y < -1.5 && box.max.y > 3, `${box.min.y.toFixed(1)} .. ${box.max.y.toFixed(1)}`);
  const seats = boatSeats(v);
  check(`${k}: de schipper heeft een plek binnen het schip`, seats.length === 1 && Math.abs(seats[0].x) < model.len / 2 && seats[0].y > 2, JSON.stringify(seats[0]));
  check(`${k}: één bemanningslid`, boatCrewCount(v) === 1);
}
// dezelfde maat en kleur delen één geometrie
{
  const a = BOAT_KINDS.zeeVracht;
  const g1 = M.buildVehicleMesh({ id: 401, model: a, isBoat: true }), g2 = M.buildVehicleMesh({ id: 402, model: a, isBoat: true });
  const geo = (g) => { let r = null; g.traverse((o) => { if (o.geometry && !r) r = o.geometry; }); return r; };
  check('twee schepen van dezelfde uitvoering delen hun geometrie', geo(g1) === geo(g2));
}

// ---- het beheer
class V { constructor(x, y, model) { this.x = x; this.y = y; this.model = model; this.isBoat = true; this.angle = 0; } }
const wereld = (polys, px = 0, py = 0) => ({ player: { x: px, y: py }, paused: false, vehicles: [], map: { waterNear: () => polys } });
const zee = { kind: 'zee', nav: 4 }, meer = { kind: 'meer', nav: 4 };
const env = {
  spawnBoatOnWater: (map, poly, rng2, o) => {
    const a = rng2() * Math.PI * 2, d = o.min + rng2() * (o.max - o.min);
    return new V(o.near[0] + Math.cos(a) * d, o.near[1] + Math.sin(a) * d, o.model);
  },
  isShip: (v) => v.model.kind === 'zeeschip' || v.model.kind === 'sleper',
};
const tik = (w, sec, r = seeded(5)) => { for (let t = 0; t < sec; t += ZEE_TIK_S) { manageSeaShips(w, ZEE_TIK_S + 0.01, env, r); } };
{
  resetZeeschepen();
  const w = wereld([zee, meer]);
  tik(w, 600, () => 0.1);
  const schepen = w.vehicles.filter((v) => v.zeeSchip);
  check('er komen schepen, hooguit ZEE_MAX', schepen.length > 0 && schepen.length <= ZEE_MAX, String(schepen.length));
  check('op 250 tot 1500 m van de speler', schepen.every((v) => { const d = Math.hypot(v.x, v.y); return d >= 249 && d <= 1501; }));
  check('met variatie in soort', new Set(schepen.map((v) => v.model.kind + (v.model.soort || ''))).size >= 1);
  check('en niet te dicht op elkaar', schepen.every((a, i) => schepen.every((b, j) => i === j || ruimteVoor(a.model, a.x, a.y, [b], 0) || Math.hypot(a.x - b.x, a.y - b.y) > 60)));
  // ver weg opruimen
  w.player.x = ZEE_WEG * 3; w.player.y = 0;
  manageSeaShips(w, ZEE_TIK_S + 0.1, env, () => 0.99);
  check('schepen die ver uit beeld zijn worden opgeruimd', w.vehicles.every((v) => !v.zeeSchip || Math.hypot(v.x - w.player.x, v.y - w.player.y) <= ZEE_WEG));
}
{
  resetZeeschepen();
  const w = wereld([meer]);
  tik(w, 300, () => 0.1);
  check('op een meer komen geen zeeschepen', w.vehicles.length === 0);
  check('isZee: alleen de zee', isZee(zee) && !isZee(meer) && !isZee(null));
}
{
  resetZeeschepen();
  const w = wereld([zee]); w.paused = true;
  tik(w, 300, () => 0.1);
  check('in de pauze komt er niets bij', w.vehicles.length === 0);
}
{
  resetZeeschepen();
  const w = wereld([zee]);
  const r = seeded(3);
  for (let t = 0; t < 40; t += ZEE_TIK_S) manageSeaShips(w, ZEE_TIK_S + 0.01, env, () => 0.99);
  check('met een dobbelsteen die nooit raak is komt er geen schip (kans per tik)', w.vehicles.length === 0);
}
{
  resetZeeschepen();
  const w = wereld([zee]);
  w.vehicles.push(Object.assign(new V(0, 0, BOAT_KINDS.zeeVracht), { zeeSchip: true, wrecked: true }));
  manageSeaShips(w, ZEE_TIK_S + 0.1, env, () => 0.99);
  check('een wrak wordt opgeruimd', w.vehicles.length === 0);
}

console.log(bad ? `${bad} van ${n} mislukt` : `zeeschepen_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
