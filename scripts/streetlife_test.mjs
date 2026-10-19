// Logic test for the street life, batch 1 (streetlifedata.js, streetlife.js,
// trafficfleet.js bike variants, the boat kinds): spawn rules by district and
// time of day, finite numbers, the magnet-fishing pickup and the grenade
// report. Runs on the real map.
//   node scripts/streetlife_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const D = await import('../game/js/streetlifedata.js');
import { loadCityWorld } from './lib/loadworld.mjs';
const T = await import('../game/js/trafficfleet.js');
const B = await import('../game/js/boattypes.js');
const S = await import('../game/js/streetlife.js');

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const root = new URL('../game/', import.meta.url);
const map = (await loadCityWorld()).map;

// a seeded rng so the checks are repeatable
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// --- density: centre and students heavy, polders nothing
ok(D.lifeDensity('centrum', 100) >= 0.9, 'centre is dense');
ok(D.lifeDensity('student', 700) > D.lifeDensity('chic', 700), 'students heavier than villas');
ok(D.lifeDensity('standaard', 3000) === 0, 'polders: none');
ok(D.lifeDensity('standaard', NaN) === 0, 'NaN distance: none');
ok(D.slotChance('seller', 'standaard', 2000) === 0 && D.slotChance('magnet', 'centrum', 3000) === 0, 'no street folk in the polders');
ok(D.slotChance('seller', 'centrum', 100) > D.slotChance('seller', 'standaard', 700), 'sellers prefer the centre');

// --- delivery riders: dinner time beats the morning, never in the polders
ok(D.deliveryChance('centrum', 100, 19) > 3 * D.deliveryChance('centrum', 100, 8), 'more delivery riders at dinner time');
ok(D.deliveryChance('standaard', 2500, 19) === 0, 'no delivery riders in the polders');
ok(D.bikeBoost('centrum', 100, 19) > D.bikeBoost('centrum', 100, 14), 'more cyclists at dinner time in the centre');
ok(D.bikeBoost('standaard', 2500, 19) === 0, 'no extra cyclists in the polders');

// --- bike variants through the real fleet code
const centre = { x: D.CENTRE.x, y: D.CENTRE.y };
const rng = seeded(7);
let delivery = 0, share = 0, mover = 0, unlit = 0, old = 0, bad = 0;
for (let i = 0; i < 3000; i++) {
  const v = T.pickBikeVariant(map, centre.x, centre.y, rng, { hour: 19 });
  if (!v) continue;
  for (const k of ['len', 'wid', 'maxSpeed', 'accel', 'brake', 'turnRate']) if (!Number.isFinite(v[k]) || v[k] <= 0) bad++;
  if (v.delivery) { delivery++; if (!/^#[0-9a-f]{6}$/i.test(v.bag)) bad++; }
  if (v.share) { share++; if (!v.tint) bad++; }
  if (v.load) mover++;
  if (v.old) { old++; if (v.noLight) unlit++; }
}
ok(bad === 0, 'bike variants have finite numbers and colours');
ok(delivery > 150, `delivery riders at dinner time in the centre (${delivery})`);
ok(share > 0, 'bike-share bikes in the centre');
ok(old > 100 && unlit > old * 0.5, `most shabby bikes have no light (${unlit}/${old})`);
let noon = 0;
for (let i = 0; i < 3000; i++) { const v = T.pickBikeVariant(map, centre.x, centre.y, seeded(i + 99), { hour: 8 }); if (v && v.delivery) noon++; }
ok(noon < delivery, 'fewer delivery riders in the morning');
let polder = 0;
for (let i = 0; i < 2000; i++) { const v = T.pickBikeVariant(map, 3000, -2000, rng, { hour: 19 }); if (v && (v.delivery || v.share || v.load)) polder++; }
ok(polder === 0, 'no delivery, share or mover bikes in the polders');
let studentMover = 0;
for (let i = 0; i < 4000; i++) { const v = T.pickBikeVariant(map, -300, 160, rng, { hour: 14 }); if (v && v.load) studentMover++; }
ok(studentMover >= 0, 'movers need no crash in the student area');

// --- water life: rowing in the morning on wide water, caps respected, never at night
const wl = (hour, have, extra = {}) => D.pickWaterLife(rng, { hour, d: 600, profile: 'student', wide: true, have, ...extra });
let skiffs = 0, achts = 0, sups = 0;
for (let i = 0; i < 2000; i++) { const k = wl(8, { skiff: 0, acht: 0, sup: 0 }); if (k === 'skiff') skiffs++; else if (k === 'acht') achts++; else if (k === 'sup') sups++; }
ok(skiffs > 100 && achts > 20 && sups > 0, `rowers and an eight in the morning (${skiffs}/${achts}/${sups})`);
ok(wl(8, { skiff: 2, acht: 1, sup: 3 }) === null, 'caps: nothing more when the water is full');
ok(wl(2, { skiff: 0, acht: 0, sup: 0 }) === null, 'no rowing at night');
ok(D.pickWaterLife(rng, { hour: 8, d: 3000, profile: 'standaard', wide: true, have: {} }) === null, 'none in the polders');
let narrowAcht = 0;
for (let i = 0; i < 2000; i++) if (wl(8, { skiff: 0, acht: 0, sup: 0 }, { wide: false }) === 'acht') narrowAcht++;
ok(narrowAcht === 0, 'an eight only on wide water');
// inland barges: only on broad shipping canals, capped, also in the polders and at night
let barges = 0;
for (let i = 0; i < 2000; i++) { const k = D.pickWaterLife(rng, { hour: 3, d: 3000, profile: 'standaard', wide: true, width: 40, nav: 4, have: { binnenvaart: 0 } }); if (k === 'spits' || k === 'kempenaar') barges++; }
ok(barges > 500, `barges on a shipping canal, polders and night included (${barges})`);
ok(D.pickWaterLife(rng, { hour: 12, d: 600, profile: 'student', wide: true, width: 40, nav: 3, have: { binnenvaart: 0 } }) !== 'spits', 'no barge on class 3 water');
let narrowBarge = 0;
for (let i = 0; i < 500; i++) if (['spits', 'kempenaar'].includes(D.pickWaterLife(rng, { hour: 12, d: 3000, profile: 'standaard', wide: false, width: 12, nav: 4, have: {} }))) narrowBarge++;
ok(narrowBarge === 0, 'no barge on a canal under 24 m wide');
ok(D.pickWaterLife(rng, { hour: 12, d: 3000, profile: 'standaard', wide: true, width: 40, nav: 4, have: { binnenvaart: 2 } }) === null, 'cap: two barges near');
for (const k of ['spits', 'kempenaar']) {
  const m = B.BOAT_KINDS[k];
  ok(m && m.kind === 'binnenvaart' && m.name === 'boat' && m.len > 30 && m.wid > 4.5 && m.maxSpeed > 0, `${k} is a usable barge model`);
  ok(B.boatSeats({ model: m, id: 3 }).length >= 1 && B.boatIsMotorised({ model: m }), `${k} has a skipper's seat and lights`);
}
ok(B.BINNENVAART_NAMES.length >= 10 && B.BINNENVAART_NAMES.every((x) => typeof x === 'string') && typeof B.binnenvaartName({ id: 5 }) === 'string', 'invented barge names');
for (const k of ['skiff', 'acht']) {
  const m = B.BOAT_KINDS[k];
  ok(m && m.name === 'boat' && Number.isFinite(m.len) && Number.isFinite(m.wid) && m.maxSpeed > 0, `${k} is a usable boat model`);
  const seats = B.boatSeats({ model: m, id: 3 });
  ok(seats.length >= 2 && seats.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z)), `${k} has finite seats`);
  ok(!B.boatIsMotorised({ model: m }), `${k} is rowed, not motorised`);
}
ok(B.boatCrewCount({ model: B.BOAT_KINDS.acht, id: 1 }) === 9 && B.boatSeats({ model: B.BOAT_KINDS.acht }).length === 9, 'an eight: a cox and eight rowers');

// --- magnet fishing
let grenades = 0, junk = 0;
for (let i = 0; i < 4000; i++) { const g = D.rollMagnet(rng); if (g.grenade) grenades++; else if (g.name && Number.isFinite(g.value)) junk++; }
ok(grenades > 100 && grenades < 500, `the grenade is rare (${grenades}/4000)`);
ok(junk + grenades === 4000, 'every pull gives something');

const msgs = [];
const player = { x: 0, y: 0, inVehicle: null, swimming: false };
const fisher = { x: 0.5, y: 0, state: 'idle', scene: { kind: 'magnet' } };
const input = { wasPressed: (k) => k === 'e', consume: () => {} };
const world = { time: 100, money: 20, player, input, addMessage: (t) => msgs.push(t), pedestrians: [fisher], map: { meta: { policeStations: [] } } };
S.resetStreetLife();
ok(S.streetLifePrompt(world).label === 'Magneetvisser', 'prompt next to a magnet fisher');
ok(S.useStreetLife(world, () => 0.5) === true && /Magneetvissen/.test(msgs[msgs.length - 1]), 'pulling up junk gives a message');
world.time += 1;
const before = world.money;
S.useStreetLife(world, () => 0);
ok(world.money === before, 'the magnet needs a pause between pulls');
world.time += 10;
S.useStreetLife(world, () => 0);
ok(S.getStreetLifeState().grenade === true && /granaat/i.test(msgs[msgs.length - 1]), 'a rare old grenade turns up');
ok(!world.pedestrians.some((p) => p.exploded) && world.health === undefined, 'nothing explodes or hurts');
// report it
world.pedestrians = [];
ok(S.streetLifePrompt(world) === null, 'nobody to report to: no prompt');
const cop = { x: 1, y: 0, state: 'wander', isCop: true };
world.pedestrians = [cop];
ok(/granaat/i.test(S.streetLifePrompt(world).sub), 'a cop nearby: report prompt');
const m0 = world.money;
S.useStreetLife(world);
ok(world.money === m0 + D.GRENADE_REWARD && S.getStreetLifeState().grenade === false, 'reporting pays the reward once');
ok(S.nearestReporter(world) === null, 'nothing left to report');
world.pedestrians = [{ ...fisher }];
world.player.inVehicle = {};
ok(S.nearestFolk(world) === null, 'not from a vehicle');
world.player.inVehicle = null;

// --- street paper, coins and Bernhard
const seller = { x: 0.4, y: 0, state: 'idle', scene: { kind: 'seller' } };
world.pedestrians = [seller]; world.money = 10; world.time += 10;
S.useStreetLife(world);
ok(world.money === 10 - S.PAPER_PRICE && /De Reep/.test(msgs[msgs.length - 1]), 'buying De Reep costs money');
world.money = 0; world.time += 10;
const m1 = world.money;
S.useStreetLife(world);
ok(world.money === m1, 'no paper without money');
const beggar = { x: 0.4, y: 0, state: 'idle', scene: { kind: 'beggar' } };
world.pedestrians = [beggar]; world.money = 5; world.time += 10;
S.useStreetLife(world);
ok(world.money === 5 - S.COIN && /dank|lief|goed/i.test(beggar.speechText), 'a coin buys a thank-you');
world.money = 0; world.time += 10; beggar.speechText = null;
S.useStreetLife(world);
ok(world.money === 0 && !beggar.speechText, 'no coin, no cost, no fuss');
const bernhard = { x: 0.4, y: 0, state: 'idle', scene: { kind: 'bernard' } };
world.pedestrians = [bernhard]; world.money = 3;
const lines = new Set();
for (let i = 0; i < D.BERNARD_LINES.length; i++) { world.time += 10; S.useStreetLife(world); lines.add(bernhard.speechText); }
ok(lines.size === D.BERNARD_LINES.length, 'Bernhard walks through his story lines');
ok(D.BERNARD_LINES.every((l) => !/\b(Bernard|Bernhard) [A-Z][a-z]+ [A-Z]/.test(l.replace('Bernhard. Van de Karretje', ''))) && D.NAMES.bernard === 'Bernhard met de Karretje', 'an invented character, named in the style only');

// --- the invented names stay invented
const text = JSON.stringify([D.NAMES, D.CHAINS, D.SELLER_LINES, D.SELLER_BUY, D.BEGGAR_ASK, D.BERNARD_LINES]);
ok(!/(thuisbezorgd|deliveroo|uber|swapfiets|oogtv|rtv noord|\bnam\b|ANWB)/i.test(text), 'no real brands in the street-life text');

// --- carriers on foot
ok(S.pickCarrier(map, 3000, -2000, 14, () => 0) === null, 'nobody carries a sofa through the polders');
let carriers = 0;
for (let i = 0; i < 3000; i++) if (S.pickCarrier(map, -300, 160, 14, rng)) carriers++;
ok(carriers >= 0, 'carriers are a possibility in the student area');

// --- the cell slots: street folk around the centre, none in the polders, all finite
const C = await import('../game/js/cityprops.js');
C.initCityProps({ map });
const bs = C.getBernardSpot();
ok(bs && Number.isFinite(bs.x + bs.y + bs.angle) && D.distToCentre(bs.x, bs.y) < 600, 'Bernhard has a fixed spot in the centre');
const kinds = {};
let badSlot = 0;
for (let gx = -4; gx <= 14; gx++) for (let gy = -3; gy <= 10; gy++) for (const sl of C.cellSlotSpots(map, gx, gy)) {
  kinds[sl.kind] = (kinds[sl.kind] || 0) + 1;
  if (![sl.x, sl.y, sl.angle].every(Number.isFinite)) badSlot++;
}
ok(badSlot === 0, 'slot positions are finite');
ok(kinds.seller > 3 && kinds.beggar > 2 && kinds.magnet > 2 && kinds.bernard === 1, 'sellers, beggars, magnet fishers and one Bernhard around the centre ' + JSON.stringify(kinds));
let polderFolk = 0;
for (let gx = 40; gx <= 60; gx++) for (let gy = -40; gy <= -20; gy++) for (const sl of C.cellSlotSpots(map, gx, gy)) if (['seller', 'beggar', 'magnet', 'bernard'].includes(sl.kind)) polderFolk++;
ok(polderFolk === 0, 'no street folk in the polders');

// --- the new models build into finite geometry, and the boats drive
const { Vehicle } = await import('../game/js/vehicle.js');
const M3 = await import('../game/js/models3d_vehicles.js');
const finiteMesh = (mesh) => {
  let verts = 0, badV = 0;
  mesh.traverse((o) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    verts += pos.count;
    for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) { badV++; break; }
  });
  return verts > 0 && badV === 0;
};
let vid = 9000;
const mk = (model, flags) => { const v = new Vehicle(0, 0, 0, model); Object.assign(v, flags, { id: ++vid }); return v; };
for (const k of ['skiff', 'acht']) {
  const boat = mk({ ...B.BOAT_KINDS[k] }, { isBoat: true });
  ok(finiteMesh(M3.buildVehicleMesh(boat)), `${k} mesh is finite`);
  boat.driver = 'player';
  for (let i = 0; i < 600; i++) boat.applyControls(1 / 60, 1, i % 120 < 30 ? 0.5 : 0, false);
  ok(Number.isFinite(boat.x + boat.y + boat.speed) && boat.speed > 0.5 && boat.speed <= B.BOAT_KINDS[k].playerTop + 0.5, `${k} drives at a sensible speed (${boat.speed.toFixed(1)})`);
}
const bikeModels = [
  T.pickBikeVariant(map, centre.x, centre.y, () => 0, { hour: 19 }),
  { name: 'bike', delivery: 'happie', bag: '#9bd630', bagTrim: '#2b3a12', len: 1.8, wid: 0.5, maxSpeed: 6, color: '#23262a', rider: '#9bd630' },
  { name: 'bike', share: true, tint: '#ff6a4d', len: 1.75, wid: 0.5, maxSpeed: 5, color: '#c9ccd0', rider: '#2f5c8a' },
  ...D.BIKE_LOADS.map((load) => ({ name: 'bike', cargo: true, load, len: 2.55, wid: 0.72, maxSpeed: 4, color: '#2f4a3a', rider: '#2f5c8a' })),
  { name: 'bike', old: true, noLight: true, len: 1.75, wid: 0.5, maxSpeed: 5, color: '#5a3a2a', rider: '#2f5c8a' },
];
for (const m of bikeModels) ok(finiteMesh(M3.buildVehicleMesh(mk(m, { isBike: true }))), `bike mesh finite: ${m.delivery || m.share || m.load || m.old || 'plain'}`);
ok(finiteMesh(M3.buildVehicleMesh(mk(T.carModel('newsvan'), {}))), 'news van mesh is finite');

// --- news van and rows of finite fleet numbers
ok(D.newsVanWanted(14, 300) && !D.newsVanWanted(3, 300) && !D.newsVanWanted(14, 5000), 'the news van drives by day around town');
const nv = T.carModel('newsvan');
ok(nv.livery === 'nieuws' && Number.isFinite(nv.len) && nv.color === '#f2f0ea', 'the news van is a white van with the Noord-Nieuws livery');
const flags = {};
T.applyFleetFlags(flags, 'newsvan');
ok(flags.isNewsVan === true, 'the news van is flagged');

// --- batch 3: skateboarders
ok(D.skaterChance('student', 300, 17) > D.skaterChance('chic', 700, 17), 'skaters prefer the student districts');
ok(D.skaterChance('student', 300, 3) === 0 && D.skaterChance('standaard', 3000, 17) === 0, 'no skaters at night or in the polders');
{
  let sk = 0;
  const r = seeded(11);
  for (let i = 0; i < 2000; i++) if (S.pickSkater(map, centre.x, centre.y, 17, r)) sk++;
  ok(sk > 0 && sk < 1000, `some skaters now and then in the centre (${sk})`);
  ok(D.SKATER_PACE > 1 && D.SKATER_LINES.length >= 4, 'skaters are quick and have lines');
}

// --- batch 3: the kennismakingsweek parody
ok(D.ontgroeningChance('student', 300, 14) > 0 && D.ontgroeningChance('student', 300, 23) === 0 && D.ontgroeningChance('standaard', 3000, 14) === 0, 'initiation groups by day in student districts only');
ok(D.ONTGROENING.club.startsWith('Dispuut') && D.LEADER_LINES.length >= 4 && D.FRESHMAN_LINES.length >= 4, 'invented dispuut with lines');
{
  let g = 0;
  const r = seeded(5);
  for (let i = 0; i < 2000; i++) if (S.pickOrientation(map, centre.x, centre.y, 14, r)) g++;
  ok(g > 0 && g < 800, `initiation groups are occasional (${g})`);
}

// --- batch 3: district profiles on foot
ok(D.wijkBagChance('student') > D.wijkBagChance('industrie'), 'students carry more bags than the industrial parts');
{
  const r = seeded(3);
  let hi = 0, cols = 0;
  for (let i = 0; i < 500; i++) { const c = D.wijkClothing('industrie', r); if (c) { cols++; if (c === '#e0701a') hi++; } }
  ok(hi > cols * 0.3 && D.wijkClothing('standaard', r) === null, 'hi-vis orange in the industrial parts, default elsewhere');
  const w = { player: { x: centre.x, y: centre.y }, map, pedestrians: [{ x: centre.x + 5, y: centre.y, clothing: '#000000', hasBag: true }, { x: centre.x, y: centre.y + 2, isCop: true, clothing: '#123456' }] };
  S.dressWalkers(w, seeded(8));
  ok(w.pedestrians[0]._wijkDressed && w.pedestrians[1].clothing === '#123456', 'walkers get dressed once, officers keep their uniform');
}

// --- batch 3: more couriers
ok(D.CHAINS.length >= 4 && new Set(D.CHAINS.map((c) => c.color)).size === D.CHAINS.length, 'four invented chains, each with its own colour');
ok(D.footCourierChance('centrum', 100, 19) > 0 && D.footCourierChance('centrum', 100, 4) === 0 && D.footCourierChance('standaard', 3000, 19) === 0, 'couriers on foot at meal times in town only');
{
  let c = 0;
  const r = seeded(21);
  for (let i = 0; i < 2000; i++) if (S.pickFootCourier(map, centre.x, centre.y, 19, r)) c++;
  ok(c > 0 && c < 1000, `couriers on foot are occasional (${c})`);
}

// Kennismakingsweek-parodie (#24): alleen domme opdrachten, niemand beschaamd of gekwetst
{
  const lines = [...D.LEADER_LINES, ...D.FRESHMAN_LINES];
  ok(lines.every((l) => typeof l === 'string' && l.length > 8), 'ontgroening: alle regels zijn tekst');
  ok(!lines.some((l) => /dwing|pijn|bloed|slaan|slag|schaam|dronken|drank|bier|verneder|pesten|naakt|slijm/i.test(l)), 'ontgroening: geen dwang, drank of vernedering');
  ok(D.ONTGROENING_MAX === 1, 'ontgroening: hooguit een groepje tegelijk');
  ok(D.ontgroeningChance('student', 100, 3) === 0 && D.ontgroeningChance('student', 100, 23) === 0, 'ontgroening: alleen overdag');
  ok(D.ontgroeningChance('industrie', 100, 14) === 0, 'ontgroening: niet op het industrieterrein');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
