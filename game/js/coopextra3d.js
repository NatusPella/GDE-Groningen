// Samen spelen (#428): de rest van de wereld van de host bij een gast, getekend. Voetgangers met het echte uiterlijk, lopen,
// groeten, feesten en praten; dieren in de buurt; de verkeerslichten van de host; kapotte en omgevallen objecten.
// De gegevens komen uit world.coopExtra (coopextra.js, gevuld door coopnet.js); de plekken van voetgangers uit de snapshot
// (world.coopHost.voetgangers). De host blijft leidend: de gast leest alleen. Alleen three.js en bestaande bouwers.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, disposeObject } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, waveOverlay, juichOverlay, setHeldWeapon, applyAttackPose, applyHitReaction } from './models3d_people.js';
import { attachCarry, carryPose } from './streetlife3d.js';
import { juichHoek } from './vrijgezellen.js';
import { buildWildlifeMesh3D, animateWildlifeMesh3D } from './wildlife.js';
import { getTrafficControllers, updateTrafficLights } from './trafficlights.js';
import { breakPropByKey, restorePropByKey, isPropBroken } from './breakables.js';
import { V_GROET, V_FEEST, V_WAPEN, V_AANVAL, V_GERAAKT, V_LIGT, lichtVerschil, standVers, MISC_KERMIS, MISC_STUNT, MISC_PUNTEN, MISC_PEDS, MISC_WERELD, MISC_SPREKERS, leesStunt, leesPunten, leesPeds, leesWereld, leesSprekers, WERELD_BRUG, WERELD_SLUIS, WERELD_GARAGE } from './coopextra.js';
import { getMovableBridges, BRIDGE_TIMING } from './movablebridges.js';
import { getSluizen, signalOf } from './sluizen.js';
import { LOCK_TIMING } from './locks.js';
import { zetGaragePoortVanHost } from './home.js';
import { KERMIS, setKermisOverride } from './kermis.js';
import { stuntPropMesh } from './stuntavond.js';
import { buildWaypointDotMesh3D } from './missionmarker3d.js';
import { gastOverwegen } from './railway.js';

const EEND = ['drake', 'hen', 'swan', 'goose'];
const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const grond = (world, x, y) => { try { return world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? world.map.groundHeightAt(x, y) : 0; } catch (e) { return 0; } };
const verwijder = (scene, m) => { scene.remove(m); disposeObject(m); }; // dezelfde opruiming als voor de voetgangers en dieren van het eigen spel (gedeelde geometrie en materialen blijven)

// ----------------------------------------------------------- voetgangers
const pop = new Map(); // id -> { mesh, sig, v, vorig }
const wacht = new Map(); // id -> sinds wanneer we op het uiterlijk wachten
const SHIRT_TERUG = 0xcaa46a, HUID_TERUG = 0xe0b48a;
const NIET_LANGER_WACHTEN = 1.0; // s: zolang wachten we op het uiterlijk voor we een eenvoudig poppetje bouwen

function bouwPop(p, ui) {
  const seed = ui ? ui.zaad : p.id * 3.7 + 11;
  const opts = ui && ui.look ? { seed, look: ui.look } : { seed };
  const m = buildPersonMesh(ui ? hex(ui.kleding) : p.agent ? 0x1c3fae : SHIRT_TERUG, ui ? hex(ui.huid) : HUID_TERUG, opts);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  if (ui && ui.draagt) { try { attachCarry(m, ui.draagt); } catch (e) { /* zonder last */ } }
  return m;
}
const sigVan = (ui) => (ui ? `${ui.kleding}|${ui.huid}|${ui.zaad}|${ui.draagt || ''}|${ui.look ? JSON.stringify(ui.look) : ''}` : 'terug');

export function syncGastVoetgangers(world, lijst, dt) {
  const scene = getScene(); if (!scene) return { echt: 0, rest: 0, ligt: 0, wapen: 0, vecht: 0 };
  const stand = world.coopExtra, vers = stand && standVers(stand, world.time);
  const nu = world.time || 0;
  const gezien = new Set();
  const mp = vers ? stand.misc.get(MISC_PEDS) : null; // wie een wapen draagt of vecht (wapen, soort slag)
  const pedX = mp ? (mp.lijst || (mp.lijst = leesPeds(mp.data) || new Map())) : null;
  let ligt = 0, wapens = 0, vecht = 0;
  for (const p of lijst || []) {
    gezien.add(p.id);
    const ui = vers ? stand.uiterlijk.get(p.id) : null, vs = vers ? stand.voetgangers.get(p.id) : null;
    let e = pop.get(p.id);
    if (!e) {
      if (!ui && vers) { // nog geen uiterlijk: even wachten, daarna een eenvoudig poppetje (het echte volgt zodra het binnen is)
        if (!wacht.has(p.id)) wacht.set(p.id, nu);
        if (nu - wacht.get(p.id) < NIET_LANGER_WACHTEN) continue;
      }
      wacht.delete(p.id);
      let m = null; try { m = bouwPop(p, ui); } catch (er) { m = null; }
      if (!m) continue;
      scene.add(m);
      e = { mesh: m, sig: sigVan(ui), v: 0, vorig: null, eerste: true }; pop.set(p.id, e);
    } else if (ui && e.sig !== sigVan(ui)) { // het uiterlijk kwam later binnen (of veranderde): opnieuw bouwen, op dezelfde plek
      let m = null; try { m = bouwPop(p, ui); } catch (er) { m = null; }
      if (m) { m.position.copy(e.mesh.position); m.rotation.copy(e.mesh.rotation); verwijder(scene, e.mesh); scene.add(m); e.mesh = m; e.sig = sigVan(ui); }
    }
    const m = e.mesh;
    const afstand = e.vorig ? Math.hypot(p.x - e.vorig.x, p.y - e.vorig.y) : 0;
    const snel = dt > 0 ? afstand / dt : 0; e.vorig = { x: p.x, y: p.y };
    const doel = vs ? vs.speed : Math.min(snel, 12);
    e.v += (doel - e.v) * Math.min(1, dt * 6);
    if (vs && (vs.flags & V_LIGT)) { // dood of omgevallen: achterover vallen en liggen, zoals bij de host (scene3d.js)
      if (e.lig == null) e.lig = e.eerste ? nu - 1 : nu;
      const val = Math.min(1, (nu - e.lig) / 0.3);
      m.position.set(p.x, 0.14 * val + grond(world, p.x, p.y), p.y); m.rotation.set(0, -p.angle, val * val * Math.PI / 2);
      try { animatePersonWalk(m, 0, dt); } catch (er) { /* */ }
      e.eerste = false; ligt++;
      continue;
    }
    if (e.lig != null) { e.lig = null; m.rotation.set(0, -p.angle, 0); }
    e.eerste = false;
    m.position.set(p.x, grond(world, p.x, p.y), p.y); m.rotation.y = -p.angle;
    try { animatePersonWalk(m, Math.min(e.v, 8), dt); } catch (er) { /* zonder loopanimatie */ }
    const ui2 = ui || (stand && stand.uiterlijk.get(p.id));
    if (ui2 && ui2.draagt) { try { carryPose(m, ui2.draagt); } catch (er) { /* */ } }
    if (vs) { // een wapen in de hand en een vechtbeweging, een klap die aankomt
      const wp = pedX ? pedX.get(p.id) : null;
      const wapen = (vs.flags & V_WAPEN) && wp ? wp.wapen : '';
      if (wapen !== (e.wapen || '')) { e.wapen = wapen; try { setHeldWeapon(m, wapen || null); } catch (er) { /* */ } }
      const slaat = !!((vs.flags & V_AANVAL) && wp && wp.fx);
      if (slaat) { if (!e.fx || nu - e.fx.start > 0.8) e.fx = { type: wp.fx, swing: wp.swing || undefined, start: nu }; } else e.fx = null;
      if (wapen || e.fx) { try { applyAttackPose(m, e.fx, nu, null); } catch (er) { /* */ } }
      if (wapen) wapens++; if (slaat) vecht++;
      if (vs.flags & V_GERAAKT) { if (!e.klap || nu - e.klap > 0.8) e.klap = nu; }
      if (e.klap && nu - e.klap < 0.6) { try { applyHitReaction(m, { t: e.klap, dx: Math.cos(p.angle), dy: Math.sin(p.angle), k: 0.7 }, nu, p.angle); } catch (er) { /* */ } }
    }
    if (vs) {
      if (vs.flags & V_GROET) { try { waveOverlay(m, nu + p.id * 0.37, 1); } catch (er) { /* */ } }
      if (vs.flags & V_FEEST) { try { const h = juichHoek(nu + p.id * 0.37, 1); juichOverlay(m, nu, h.links, h.rechts, h.spring, 1); } catch (er) { /* */ } }
    }
  }
  for (const [id, e] of pop) if (!gezien.has(id)) { verwijder(scene, e.mesh); pop.delete(id); }
  for (const id of wacht.keys()) if (!gezien.has(id)) wacht.delete(id);
  let terug = 0; for (const e of pop.values()) if (e.sig === 'terug') terug++;
  return { echt: pop.size - terug, rest: terug, ligt, wapen: wapens, vecht };
}

// Wat voetgangers zeggen: als tekstballon (scene3d.js syncSpeechBubbles leest world.extraSpeakers)
const sprekers = new Map(); // id -> { x, y, h, speechText, speechUntil }
export function syncGastSpraak(world, lijst) {
  const stand = world.coopExtra; if (!stand || !standVers(stand, world.time)) return;
  const nu = world.time || 0;
  if (!world.extraSpeakers) world.extraSpeakers = [];
  const plek = new Map(); for (const p of lijst || []) plek.set(p.id, p);
  for (const [id, s] of stand.spraak) {
    const p = plek.get(id); if (!p || nu - s.at > 0.8) continue;
    let o = sprekers.get(id);
    if (!o || o.speechText !== s.tekst) { o = { x: p.x, y: p.y, h: 2.1, speechText: s.tekst, speechUntil: nu + 0.9 }; sprekers.set(id, o); }
    o.x = p.x; o.y = p.y; o.speechUntil = Math.max(o.speechUntil, nu + 0.9);
    if (!world.extraSpeakers.includes(o)) world.extraSpeakers.push(o);
  }
  for (const [id, o] of sprekers) if (nu > o.speechUntil + 3) sprekers.delete(id);
  // wie praat zonder voetganger te zijn (een opdrachtgever, een kermisbaas): met naam, zoals bij de host
  const ms = stand.misc.get(MISC_SPREKERS), sl = ms && nu - ms.at < 2 ? (ms.lijst || (ms.lijst = leesSprekers(ms.data) || [])) : [];
  for (const s of sl) {
    const sleutel = s.naam + '|' + s.tekst;
    let o = losSprekers.get(sleutel);
    if (!o) { o = { x: s.x, y: s.y, h: s.h || 2.1, female: s.vrouw, speechName: s.naam || undefined, speechText: s.tekst, speechUntil: nu + 1 }; losSprekers.set(sleutel, o); }
    o.x = s.x; o.y = s.y; o.speechUntil = nu + 1;
    if (!world.extraSpeakers.includes(o)) world.extraSpeakers.push(o);
  }
  for (const [k, o] of losSprekers) if (nu > o.speechUntil + 3) losSprekers.delete(k);
}
const losSprekers = new Map(); // naam|tekst -> { x, y, h, female, speechName, speechText, speechUntil }

// ----------------------------------------------------------- dieren
const dieren = new Map(); // id -> { mesh, a }
function dierData(d) {
  const a = { kind: d.soort, x: d.x, y: d.y, z: 0, angle: d.hoek, speed: d.speed, stride: 0, bobSeed: d.bob, flapSeed: d.bob, dead: d.dood, state: 'walk' };
  if (d.soort === 'cow' && d.var === 1) a.variant = 'red';
  else if (d.soort === 'duck') a.variant = EEND[d.var] || 'hen';
  else if (d.soort === 'cat') a.variant = d.var;
  else if (d.soort === 'dog') { a.breed = d.var; a.color = d.aux / 255; }
  return a;
}
const hoekLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
export function syncGastDieren(world, dt) {
  const scene = getScene(); if (!scene) return 0;
  const stand = world.coopExtra, vers = stand && standVers(stand, world.time);
  const nu = world.time || 0;
  const k = Math.min(1, dt * 8);
  if (vers) for (const [id, d] of stand.dieren) {
    let e = dieren.get(id);
    if (!e || e.a.kind !== d.soort) {
      if (e) verwijder(scene, e.mesh);
      const a = dierData(d); let m = null; try { m = buildWildlifeMesh3D(a); } catch (er) { m = null; }
      if (!m) continue;
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(m); e = { mesh: m, a, doel: d }; dieren.set(id, e);
    }
    const a = e.a; e.doel = d;
    if (Math.hypot(d.x - a.x, d.y - a.y) > 15) { a.x = d.x; a.y = d.y; } else { a.x += (d.x - a.x) * k; a.y += (d.y - a.y) * k; }
    a.angle = hoekLerp(a.angle, d.hoek, k); a.speed = d.speed; a.dead = d.dood; a.stride += d.speed * dt;
    const m = e.mesh;
    const y = (a.kind === 'seagull' ? 6 + Math.sin(nu * 2 + (a.flapSeed || 0)) * 1.2 : grond(world, a.x, a.y)) + (a.lift || 0);
    m.position.set(a.x, y, a.y); m.rotation.y = -a.angle;
    try { animateWildlifeMesh3D(m, a, nu); } catch (er) { /* zonder animatie */ }
  }
  for (const [id, e] of dieren) {
    if (!vers || !stand.dieren.has(id)) { verwijder(scene, e.mesh); dieren.delete(id); }
  }
  return dieren.size;
}

// ----------------------------------------------------------- verkeerslichten
// De gast laat de klokken zelf lopen (soepel) en volgt de host zodra die meer dan 0,4 s afwijkt.
export function syncGastLichten(world, dt) {
  try { updateTrafficLights(dt, world); } catch (e) { return 0; }
  const stand = world.coopExtra; if (!stand || !standVers(stand, world.time)) return 0;
  const cs = getTrafficControllers(); const nu = world.time || 0;
  let n = 0;
  for (const [i, l] of stand.lichten) {
    const c = cs[i]; if (!c || nu - l.at > 1.5) continue;
    const verschil = lichtVerschil(c.t, l.t + (nu - l.at), c.cycle);
    if (Math.abs(verschil) > 0.4) { c.t = ((c.t + verschil) % c.cycle + c.cycle) % c.cycle; n++; }
  }
  if (n) try { updateTrafficLights(0, world); } catch (e) { /* */ }
  return n;
}

// ----------------------------------------------------------- kapotte en omgevallen objecten
const mijnKapot = new Set();
let kapotT = 0;
export function syncGastKapot(world, dt) {
  const stand = world.coopExtra; if (!stand || !standVers(stand, world.time)) return;
  kapotT -= dt; if (kapotT > 0) return; kapotT = 0.5;
  const nu = new Set();
  for (const b of stand.kapot) {
    nu.add(b.key);
    if (isPropBroken(b.key)) { mijnKapot.add(b.key); continue; }
    const h = (b.x10 * 73856093 ^ b.y10 * 19349663) >>> 0, hoek = (h % 628) / 100;
    if (breakPropByKey(b.key, b.x10 / 10, b.y10 / 10, Math.cos(hoek), Math.sin(hoek))) mijnKapot.add(b.key);
  }
  for (const key of [...mijnKapot]) if (!nu.has(key)) { restorePropByKey(key); mijnKapot.delete(key); }
}

// ----------------------------------------------------------- bruggen en sluizen die de host beweegt
// updateMovableBridges en updateSluizen draaien niet bij een gast: de toestand komt van de host (MISC_WERELD) en de gast laat de delen zelf naar die
// toestand lopen, op de snelheid van de host (BRIDGE_TIMING, LOCK_TIMING). Een brug die niet meer gemeld wordt, is dicht.
const gedreven = new Set();
const stapNaar = (b, k, doel, d) => { const v = b[k] || 0; b[k] = Math.abs(doel - v) <= d ? doel : v + Math.sign(doel - v) * d; };
const dichtstbij = (lijst, x, y, max) => { let best = null, bd = max; for (const o of lijst || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } return best; };
export function syncGastWereld(world, dt) {
  const stand = world.coopExtra, m = stand && standVers(stand, world.time) ? stand.misc.get(MISC_WERELD) : null;
  const lijst = m ? (m.lijst || (m.lijst = leesWereld(m.data) || [])) : [];
  const nu = new Set(); let n = 0, garage = 0;
  for (const e of lijst) {
    if (e.soort === WERELD_GARAGE) { garage = e.a > 0.5 ? 1 : 0; n++; continue; }
    if (e.soort === WERELD_BRUG) {
      const b = dichtstbij(getMovableBridges(), e.x, e.y, 4); if (!b) continue;
      nu.add(b); gedreven.add(b); n++;
      b.state = e.staat; b.warn = true; b.t = (b.t || 0) + dt; b.flash = (b.flash || 0) + dt;
      stapNaar(b, 'open', e.a, dt / BRIDGE_TIMING.MOVE_S * 1.5); stapNaar(b, 'boom', e.b, dt / BRIDGE_TIMING.BOOMS_S * 1.5);
      if (b.r) b.r._open = e.staat === 'opening' || e.staat === 'open' || e.staat === 'closing';
    } else if (e.soort === WERELD_SLUIS) {
      const l = dichtstbij(getSluizen(), e.x, e.y, 6); if (!l || !l.gate) continue;
      n++; l.state = e.staat; l.at = e.kant; l.clock = (l.clock || 0) + dt;
      stapNaar(l.gate, 0, e.a, dt / LOCK_TIMING.GATE_S * 1.5); stapNaar(l.gate, 1, e.b, dt / LOCK_TIMING.GATE_S * 1.5);
      stapNaar(l, 'level', e.peil, Math.max(0.05, LOCK_TIMING.FILL_MS * 3) * dt);
      l.t = e.staat === 'opening' ? l.gate[1 - l.at] * LOCK_TIMING.GATE_S : e.staat === 'closing' ? (1 - l.gate[l.at]) * LOCK_TIMING.GATE_S : l.t || 0;
      if (l.sig) { l.sig[0] = signalOf(l, 0); l.sig[1] = signalOf(l, 1); }
    }
  }
  for (const b of [...gedreven]) if (!nu.has(b)) { b.state = 'closed'; b.open = 0; b.boom = 0; b.warn = false; b.snapped = null; if (b.r) b.r._open = false; gedreven.delete(b); }
  zetGaragePoortVanHost(garage); // de garagepoort volgt de host (staat hij dicht of is er geen bericht, dan dicht)
  return n;
}

// ----------------------------------------------------------- kermis, stuntavond en de punten van een opdracht (misc)
// De kermis staat of staat niet zoals bij de host (de tijd van de dag is al gelijk, de kalender niet altijd); de rest van de kermis draait de gast zelf.
let kermisAan = false;
export function syncGastKermis(world, dt) {
  const stand = world.coopExtra, m = stand && standVers(stand, world.time) ? stand.misc.get(MISC_KERMIS) : null;
  if (m) { kermisAan = true; setKermisOverride(m.data[0] === 1); } else if (kermisAan) { kermisAan = false; setKermisOverride(null); }
  if (m) { try { KERMIS.tick(dt, world); } catch (e) { /* zonder kermis */ } }
}
const stunt = { groep: null, meshes: [], sig: '' };
export function syncGastStunt(world) {
  const scene = getScene(); if (!scene) return 0;
  const stand = world.coopExtra, m = stand && standVers(stand, world.time) ? stand.misc.get(MISC_STUNT) : null;
  const s = m ? leesStunt(m.data) : null;
  if (!s) { if (stunt.groep) { scene.remove(stunt.groep); stunt.groep = null; stunt.meshes = []; stunt.sig = ''; } return 0; }
  const sig = s.x + ',' + s.y + ',' + s.props.length;
  if (sig !== stunt.sig) { // een nieuwe avond: opnieuw opbouwen
    if (stunt.groep) scene.remove(stunt.groep);
    stunt.groep = new THREE.Group(); stunt.groep.name = 'stuntavond-gast'; stunt.meshes = []; stunt.sig = sig;
    s.props.forEach((p, i) => { const mesh = stuntPropMesh(p.kind, i); mesh.position.set(p.x, grond(world, p.x, p.y), p.y); stunt.groep.add(mesh); stunt.meshes.push(mesh); });
    scene.add(stunt.groep);
  }
  s.props.forEach((p, i) => { if (stunt.meshes[i]) stunt.meshes[i].visible = p.alive; });
  return stunt.meshes.length;
}
const punten = { meshes: [], sig: '' };
export function syncGastPunten(world) {
  const scene = getScene(); if (!scene) return 0;
  const stand = world.coopExtra, m = stand && standVers(stand, world.time) ? stand.misc.get(MISC_PUNTEN) : null;
  const l = m ? leesPunten(m.data) : null;
  const sig = l ? l.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(';') : '';
  if (sig === punten.sig) return punten.meshes.length;
  for (const mesh of punten.meshes) scene.remove(mesh);
  punten.meshes = []; punten.sig = sig;
  for (const p of l || []) { let mesh = null; try { mesh = buildWaypointDotMesh3D(); } catch (e) { mesh = null; } if (mesh) { mesh.position.set(p.x, 0.4 + p.z, p.y); scene.add(mesh); punten.meshes.push(mesh); } }
  return punten.meshes.length;
}

export function clearExtra() {
  const scene = getScene();
  if (scene) { for (const e of pop.values()) verwijder(scene, e.mesh); for (const e of dieren.values()) verwijder(scene, e.mesh); }
  pop.clear(); wacht.clear(); dieren.clear(); sprekers.clear(); losSprekers.clear();
  for (const b of gedreven) { b.state = 'closed'; b.open = 0; b.boom = 0; b.warn = false; if (b.r) b.r._open = false; }
  gedreven.clear(); zetGaragePoortVanHost(null);
  if (scene) { if (stunt.groep) scene.remove(stunt.groep); for (const m of punten.meshes) scene.remove(m); }
  stunt.groep = null; stunt.meshes = []; stunt.sig = ''; punten.meshes = []; punten.sig = '';
  if (kermisAan) { kermisAan = false; setKermisOverride(null); }
  for (const key of mijnKapot) restorePropByKey(key);
  mijnKapot.clear();
}
export const hasExtra = () => pop.size > 0 || dieren.size > 0 || mijnKapot.size > 0 || !!stunt.groep || punten.meshes.length > 0 || kermisAan;

// Elke frame (main.js), alleen op een gast
export function syncExtra(world, dt) {
  // een gast draait de wereld niet: wat hij zelf bij het laden aan voetgangers en dieren kreeg, stond stil en was niet die van de host
  if (world.pedestrians && world.pedestrians.length) world.pedestrians.length = 0;
  if (world.wildlife && world.wildlife.length) world.wildlife.length = 0;
  const lijst = (world.coopHost && world.coopHost.voetgangers) || [];
  const r = syncGastVoetgangers(world, lijst, dt);
  syncGastSpraak(world, lijst);
  const nd = syncGastDieren(world, dt);
  syncGastLichten(world, dt);
  try { gastOverwegen(dt, world); } catch (e) { /* zonder overwegen */ }
  syncGastKapot(world, dt);
  const nw = syncGastWereld(world, dt);
  syncGastKermis(world, dt);
  const ns = syncGastStunt(world), np = syncGastPunten(world);
  let doodDier = 0; for (const e of dieren.values()) if (e.a.dead) doodDier++;
  world.coopExtraDbg = { ligt: r.ligt, wapen: r.wapen, vecht: r.vecht, wereld: nw, sprekers: losSprekers.size, doodDier }; // voor de testbank
  world.coopExtraMeshes = [r.echt, nd, stand0(world), ns, np, kermisAan ? 1 : 0]; // voor de testbank: [voetgangers met hun echte uiterlijk, dieren, kapotte objecten, stuntdingen, punten, kermis]
  if (Array.isArray(world.coopHostMeshes)) { world.coopHostMeshes[2] = r.echt; world.coopHostMeshes[3] = r.rest; } // zelfde plekken als vroeger: [voertuigen echt, blokken, voetgangers echt, eenvoudig]
}
const stand0 = (world) => mijnKapot.size;
