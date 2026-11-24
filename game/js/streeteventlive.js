// Straatgebeurtenissen in de wereld (#1316): de regels staan in streetevents.js (puur), dit zet ze neer. Eén scène
// tegelijk, ergens 35 tot 75 m van de speler op een plek die hij net niet ziet; de figuren zijn gewone voetgangers
// (pedestrians.js Pedestrian, het bestaande mensen- en kledingsysteem), de hond komt uit wildlife.js en de props uit
// het propregister (streetevents3d.js tekent ze). Als de tijd om is lopen de bijfiguren gewoon verder; wie bij een prop
// hoort verdwijnt samen met de prop zodra die uit beeld is. Rijdt de speler weg (verder dan EVENT.despawnDist), dan
// is alles meteen weg.
//
// Kosten: alleen de host denkt na, eens per EVENT.checkEvery s over een nieuwe scène (een handvol probeerplekken), en
// per beeld alleen over de actieve scène (vaste lijsten, geen allocatie per beeld). Statistiek: streetEventStats().
//
// Samen spelen: van de wereld van wie het spel opende (main.js roept dit alleen op het gameplaypad aan, dat een gast niet
// draait). Een gast ziet de figuren in de snapshot, de hond in de dierenlijst en de props als tijdelijke rekwisieten
// (coopextra.js registreerRekwisieten 'straatevent'). Geen beloning, geen voortgang; wegvallen of later aansluiten
// verandert niets (een gast die later komt ziet de lopende scène gewoon).
import { hoofdspeler } from './players.js';
import { dist, isInWater } from './util.js';
import { Pedestrian, CITY_CENTRE, isSpawnHidden, walkerSpotClear, releaseFromScene } from './pedestrians.js';
import { setPedPose, isOnRoad, isInsideBuilding, CAR_ROAD_CATS } from './pedgeom.js';
import { findProps, isPropBroken } from './breakables.js';
import { playerBusy } from './busy.js';
import { setLeashHolder } from './models3d_people.js';
import { registreerRekwisieten } from './coopextra.js';
import { readClock } from './dailyrhythm.js';
import { EVENT, EVENT_KINDS, mayStart, rollsStart, pickKind, durationOf, layout, endReason, nextLine } from './streetevents.js';

const BUSY = ['cinematic', 'respawn', 'heliRun', 'pigeon', 'train', 'padel', 'activityGame', 'race', 'challenge', 'mission'];
const st = { lastEndAt: -Infinity, active: null, checkAt: 0 };
const stats = { started: 0, ended: 0, byKind: {}, failedSpot: 0, msMax: 0, msLast: 0 };
const clock = { hour: 14, weekday: 3, wet: 0 };

export const streetEventStats = () => ({ ...stats, active: st.active ? st.active.id : null });
export const activeStreetEvent = () => st.active;

// tijdelijke rekwisieten voor de gasten (coopextra.js): de props van de actieve scène
registreerRekwisieten('straatevent', () => (st.active ? st.active.props.map((p, i) => ({ x: p.x, y: p.y, z: 0, hoek: p.angle, soort: p.id, id: 4000 + i })) : []));

// --- plekken ------------------------------------------------------------------------------------------------
const walkable = (map, x, y) => walkerSpotClear(map, x, y);
function inGreen(map, x, y) {
  for (const g of map.greenNear(x, y, 0.5)) { const [a, b, c, d] = g.bounds; if (x >= a && x <= c && y >= b && y <= d) return true; }
  return false;
}

// Een plek langs een weg op de stoep (of op een voetpad of plein), met de blik naar de straat.
function roadsideSpot(world, p, want) {
  const map = world.map;
  const roads = map.roadsNear(p.x, p.y, EVENT.spawnMax);
  if (!roads.length) return null;
  for (let attempt = 0; attempt < 14; attempt++) {
    const r = roads[Math.floor(Math.random() * roads.length)];
    if (!r.pts || r.pts.length < 2) continue;
    const i = Math.floor(Math.random() * (r.pts.length - 1)), a = r.pts[i], b = r.pts[i + 1];
    const t = Math.random(), sx = a[0] + (b[0] - a[0]) * t, sy = a[1] + (b[1] - a[1]) * t;
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]), side = Math.random() < 0.5 ? 1 : -1;
    const foot = r.cat === 'foot';
    if ((want === 'plein') !== foot && attempt < 9) continue;
    const off = foot ? 0 : (r.width || 6) / 2 + 1.6;
    const x = sx - Math.sin(dir) * off * side, y = sy + Math.cos(dir) * off * side;
    const d = dist(x, y, p.x, p.y);
    if (d < EVENT.spawnMin || d > EVENT.spawnMax) continue;
    if (!walkable(map, x, y)) continue;
    if (want === 'park' && attempt < 9 && !inGreen(map, x, y)) continue;
    // de blik naar de straat (bij een voetpad dwars erop, naar de speler toe)
    const face = foot ? (Math.atan2(p.y - y, p.x - x)) : Math.atan2(sy - y, sx - x);
    return { x, y, angle: face };
  }
  return null;
}

function parkedCarSpot(world, p) {
  for (const v of world.vehicles) {
    if (v.road || v.driver || v.wrecked || v.isBoat || v.isBike || v.isScooter || v.sinking || Math.abs(v.speed || 0) > 0.1) continue;
    const d = dist(v.x, v.y, p.x, p.y);
    if (d < EVENT.spawnMin || d > EVENT.spawnMax) continue;
    return { x: v.x, y: v.y, angle: v.angle, car: v };
  }
  return null;
}

function bikeSpot(world, p) {
  const props = findProps(p.x, p.y, EVENT.spawnMax);
  for (let k = 0; k < 10 && props.length; k++) {
    const b = props[Math.floor(Math.random() * props.length)];
    if (b.kind !== 'bike' || isPropBroken(b.key)) continue;
    const d = dist(b.x, b.y, p.x, p.y);
    if (d < EVENT.spawnMin || d > EVENT.spawnMax) continue;
    const s = (b.angle || 0) + Math.PI / 2, x = b.x + Math.cos(s) * 0.6, y = b.y + Math.sin(s) * 0.6;
    if (!walkable(world.map, x, y)) continue;
    return { x, y, angle: s + Math.PI };
  }
  return null;
}

function landmarkSpot(world, p) {
  for (const l of (world.map.meta && world.map.meta.landmarks) || []) {
    const d = dist(l.x, l.y, p.x, p.y);
    if (d > EVENT.spawnMax + 40) continue;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 10, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r;
      const dd = dist(x, y, p.x, p.y);
      if (dd < EVENT.spawnMin || dd > EVENT.spawnMax || !walkable(world.map, x, y)) continue;
      return { x, y, angle: Math.atan2(l.y - y, l.x - x) + Math.PI };   // met de rug naar het gebouw, de kaart in de hand
    }
  }
  return null;
}

function spotFor(world, p, plek) {
  if (plek === 'auto') return parkedCarSpot(world, p);
  if (plek === 'fietsenrek') return bikeSpot(world, p);
  if (plek === 'bezienswaardigheid') return landmarkSpot(world, p) || roadsideSpot(world, p, 'plein');
  return roadsideSpot(world, p, plek);
}

// Alle plekken van de scène moeten vrij en verborgen zijn (geen figuur die voor je neus opduikt).
function placeable(world, lay) {
  const map = world.map;
  for (const r of lay.rollen) if (!walkable(map, r.x, r.y) || !isSpawnHidden(world, r.x, r.y)) return false;
  for (const q of lay.props) if (isInsideBuilding(map, q.x, q.y) || isInWater(map, q.x, q.y) || isOnRoad(map, q.x, q.y, 0.2, CAR_ROAD_CATS) || !isSpawnHidden(world, q.x, q.y)) return false;
  return true;
}

// --- starten en stoppen -------------------------------------------------------------------------------------
function start(world, p) {
  const inCity = dist(p.x, p.y, CITY_CENTRE.x, CITY_CENTRE.y) < CITY_CENTRE.r + 1200;
  const id = pickKind({ hour: clock.hour, wet: clock.wet, inCity }, Math.random());
  if (!id) return false;
  const k = EVENT_KINDS[id];
  const spot = spotFor(world, p, k.plek);
  if (!spot) { stats.failedSpot++; return false; }
  const rolls = k.rollen.map(() => Math.random());
  let lay = layout(id, spot.x, spot.y, spot.angle, rolls);
  // naast een auto: de kant van de stoep (de andere kant is de rijbaan)
  if (k.plek === 'auto' && !placeable(world, lay)) lay = layout(id, spot.x, spot.y, spot.angle + Math.PI, rolls);
  if (!placeable(world, lay)) { stats.failedSpot++; return false; }
  return startWith(world, id, spot, lay, Math.random());
}

function startWith(world, id, spot, lay, durRoll) {
  const now = world.time;
  const k = EVENT_KINDS[id];
  const ev = { id, x: spot.x, y: spot.y, angle: spot.angle, started: now, until: now + durationOf(id, durRoll), rollen: [], props: lay.props, lineAt: now - 3, turn: 0, dog: null, phase: 'speelt' };
  for (const r of lay.rollen) {
    const ped = new Pedestrian(r.x, r.y, r.angle);
    ped.state = 'idle';
    ped.scene = { x: r.x, y: r.y, angle: r.angle, pose: r.pose, kind: 'straatevent' };
    ped.eventActor = id;
    if (r.pose) setPedPose(ped, r.pose);
    world.pedestrians.push(ped);
    ev.rollen.push({ rol: r.rol, ped });
  }
  if (k.hond && ev.rollen.length) {
    const owner = ev.rollen[0].ped;
    owner.scripted = true;   // het baasje rent zelf (stepDog), pedestrians.js laat hem met rust
    const dog = { kind: 'dog', breed: Math.floor(Math.random() * 4), color: Math.random(), owner, x: owner.x + Math.cos(spot.angle) * 4, y: owner.y + Math.sin(spot.angle) * 4,
      angle: spot.angle, speed: 0, state: 'loose', stateTimer: 0, bobSeed: Math.random() * Math.PI * 2, sideOffset: 0.6, looseTarget: null, looseSpeed: 4.4, nextTurnAt: 0 };
    (world.wildlife || (world.wildlife = [])).push(dog);
    ev.dog = dog;
  }
  st.active = ev;
  stats.started++;
  stats.byKind[id] = (stats.byKind[id] || 0) + 1;
  return true;
}

function actorAlive(world, a) {
  const p = a.ped;
  return p && p.state !== 'dead' && p.scene && p.scene.kind === 'straatevent' && world.pedestrians.includes(p);
}

function removeActor(world, a) {
  const p = a.ped;
  if (!p) return;
  if (p.scene && p.scene.kind === 'straatevent') {
    setPedPose(p, null);
    const i = world.pedestrians.indexOf(p);
    if (i >= 0) world.pedestrians.splice(i, 1);
  }
  a.ped = null;
}

// Laat een figuur los: hij loopt als gewone voetganger verder (pedroutes.js kiest een bestemming).
function freeActor(a) {
  const p = a.ped;
  if (!p) return;
  p.scripted = false;
  if (p.scene && p.scene.kind === 'straatevent') { releaseFromScene(p); p.state = 'wander'; }
  p.eventActor = null;
  a.ped = null;
}

function finish(world, ev, far) {
  for (const a of ev.rollen) { if (far) removeActor(world, a); else freeActor(a); }
  if (ev.dog) {
    if (far || !ev.dog.owner || ev.dog.owner.state === 'dead') ev.dog.gone = true;
    else { ev.dog.state = 'walk'; ev.dog.looseTarget = null; setLeashHolder(ev.dog.owner._lookSeed, true); }
  }
  st.active = null;
  st.lastEndAt = world.time;
  stats.ended++;
}

// --- per beeld -------------------------------------------------------------------------------------------------
function stepActive(world, ev, dt, p) {
  const now = world.time;
  const dPlayer = dist(ev.x, ev.y, p.x, p.y);
  const why = endReason(ev, now, dPlayer);
  if (why === 'weg') { finish(world, ev, true); return; }
  if (why === 'tijd' && ev.phase === 'speelt') {
    // de bijfiguren lopen door; wie bij een prop hoort blijft tot die uit beeld is
    ev.phase = 'opruimen';
    for (const a of ev.rollen) if (!ev.props.length || (a.rol !== 'verkoper' && a.rol !== 'muzikant')) freeActor(a);
    if (ev.dog) finish(world, ev, false);
  }
  if (ev.phase === 'opruimen') {
    let hidden = true;
    for (const q of ev.props) if (!isSpawnHidden(world, q.x, q.y)) { hidden = false; break; }
    if (hidden) {
      for (const a of ev.rollen) if (a.ped) removeActor(world, a);
      st.active = null; st.lastEndAt = now; stats.ended++;
    }
    return;
  }
  // wie wegrende (een schot, een auto op de stoep) is geen speler meer van de scène
  for (const a of ev.rollen) if (a.ped && !a.ped.scripted && !actorAlive(world, a)) { a.ped.eventActor = null; a.ped = null; }
  if (ev.dog) stepDog(world, ev, dt);
  // om de beurt een regel in een tekstballon, alleen als de speler dichtbij genoeg is om hem te lezen
  const line = nextLine(ev.id, ev, now, Math.random(), dPlayer);
  if (line) {
    const a = ev.rollen[line.rolIndex];
    ev.lineAt = now; ev.turn = line.rolIndex + 1;
    if (a && a.ped && a.ped.state !== 'dead') { a.ped.speechText = line.line; a.ped.speechUntil = now + 3.2; }
  }
}

// De hond rent in lussen rond de plek, het baasje erachteraan; tegen het einde laat hij zich vangen.
function stepDog(world, ev, dt) {
  const dog = ev.dog, ownerA = ev.rollen[0], owner = ownerA && ownerA.ped;
  if (!owner || dog.gone) { ev.dog = null; return; }
  const now = world.time;
  const catchUp = now > ev.until - 8;
  if (catchUp) { dog.looseTarget = dog.looseTarget || { x: 0, y: 0 }; dog.looseTarget.x = owner.x; dog.looseTarget.y = owner.y; dog.looseSpeed = 2.5; }
  else if (!dog.looseTarget || now > dog.nextTurnAt || dist(dog.x, dog.y, dog.looseTarget.x, dog.looseTarget.y) < 1.2) {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 9;
      const x = ev.x + Math.cos(a) * r, y = ev.y + Math.sin(a) * r;
      if (!walkerSpotClear(world.map, x, y)) continue;
      dog.looseTarget = dog.looseTarget || { x: 0, y: 0 }; dog.looseTarget.x = x; dog.looseTarget.y = y;
      break;
    }
    dog.nextTurnAt = now + 2 + Math.random() * 2.5;
    dog.looseSpeed = 4 + Math.random() * 1.2;
  }
  // het baasje rent naar de hond toe en blijft net achter hem
  const d = dist(owner.x, owner.y, dog.x, dog.y);
  const sp = d > 1.6 ? Math.min(3.6, 1.2 + d * 0.5) : 0;
  if (sp > 0) {
    const ang = Math.atan2(dog.y - owner.y, dog.x - owner.x);
    const nx = owner.x + Math.cos(ang) * sp * dt, ny = owner.y + Math.sin(ang) * sp * dt;
    if (walkerSpotClear(world.map, nx, ny)) { owner.x = nx; owner.y = ny; }
    owner.angle = ang;
  }
  owner.speed = sp;
  if (owner.scene) { owner.scene.x = owner.x; owner.scene.y = owner.y; owner.scene.angle = owner.angle; }
  if (catchUp && d < 1.4) {
    // gevangen: de riem weer om, samen verder
    dog.state = 'walk'; dog.looseTarget = null; setLeashHolder(owner._lookSeed, true);
    ev.dog = null;
    freeActor(ownerA);
    ev.until = Math.min(ev.until, now);
  }
}

export function updateStreetEvents(dt, world) {
  if (!world || !world.map || !world.pedestrians || world.paused) return;
  const t0 = performance.now();
  const p = hoofdspeler(world);
  readClock(world, clock);
  if (st.active) stepActive(world, st.active, dt, p);
  else if (world.time >= st.checkAt) {
    st.checkAt = world.time + EVENT.checkEvery;
    const pv = p.inVehicle;
    const busy = playerBusy(world, BUSY).busy || !!world.interiorActive;
    if (mayStart(st, world.time, { playerSpeed: pv ? Math.abs(pv.speed || 0) : 0, busy }) && rollsStart(Math.random())) start(world, p);
  }
  const ms = performance.now() - t0;
  stats.msLast = ms;
  if (ms > stats.msMax) stats.msMax = ms;
}

// Voor de beeldpagina en de spelbot: een scène van soort id hier en nu (dezelfde plekregels, zonder de kansen en zonder
// de eis dat de plek uit beeld is: de camera moet hem juist zien). -> de scène of null.
export function forceStreetEvent(world, id, tries = 40) {
  const k = EVENT_KINDS[id];
  if (!k) return null;
  const p = hoofdspeler(world);
  readClock(world, clock);
  if (st.active) finish(world, st.active, true);
  for (let n = 0; n < tries; n++) {
    const spot = spotFor(world, p, k.plek);
    if (!spot) continue;
    const lay = layout(id, spot.x, spot.y, spot.angle, k.rollen.map(() => 0));
    if (lay.rollen.every((r) => walkable(world.map, r.x, r.y))) { startWith(world, id, spot, lay, 0.5); return st.active; }
  }
  return null;
}
