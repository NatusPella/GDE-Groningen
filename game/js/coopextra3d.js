// Samen spelen (#428): de rest van de wereld van de host bij een gast, getekend. Voetgangers met het echte uiterlijk, lopen,
// groeten, feesten en praten; dieren in de buurt; de verkeerslichten van de host; kapotte en omgevallen objecten.
// De gegevens komen uit world.coopExtra (coopextra.js, gevuld door coopnet.js); de plekken van voetgangers uit de snapshot
// (world.coopHost.voetgangers). De host blijft leidend: de gast leest alleen. Alleen three.js en bestaande bouwers.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, waveOverlay, juichOverlay } from './models3d_people.js';
import { attachCarry, carryPose } from './streetlife3d.js';
import { juichHoek } from './vrijgezellen.js';
import { buildWildlifeMesh3D, animateWildlifeMesh3D } from './wildlife.js';
import { getTrafficControllers, updateTrafficLights } from './trafficlights.js';
import { breakPropByKey, restorePropByKey, isPropBroken } from './breakables.js';
import { V_GROET, V_FEEST, lichtVerschil, standVers } from './coopextra.js';

const EEND = ['drake', 'hen', 'swan', 'goose'];
const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const grond = (world, x, y) => { try { return world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? world.map.groundHeightAt(x, y) : 0; } catch (e) { return 0; } };
const verwijder = (scene, m) => { scene.remove(m); m.traverse((o) => { if (o.isSkinnedMesh) { if (o.geometry) o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } else if (o.userData && o.userData.blok && o.geometry) o.geometry.dispose(); }); };

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
  const scene = getScene(); if (!scene) return { echt: 0, rest: 0 };
  const stand = world.coopExtra, vers = stand && standVers(stand, world.time);
  const nu = world.time || 0;
  const gezien = new Set();
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
      e = { mesh: m, sig: sigVan(ui), v: 0, vorig: null }; pop.set(p.id, e);
    } else if (ui && e.sig !== sigVan(ui)) { // het uiterlijk kwam later binnen (of veranderde): opnieuw bouwen, op dezelfde plek
      let m = null; try { m = bouwPop(p, ui); } catch (er) { m = null; }
      if (m) { m.position.copy(e.mesh.position); m.rotation.copy(e.mesh.rotation); verwijder(scene, e.mesh); scene.add(m); e.mesh = m; e.sig = sigVan(ui); }
    }
    const m = e.mesh;
    const afstand = e.vorig ? Math.hypot(p.x - e.vorig.x, p.y - e.vorig.y) : 0;
    const snel = dt > 0 ? afstand / dt : 0; e.vorig = { x: p.x, y: p.y };
    const doel = vs ? vs.speed : Math.min(snel, 12);
    e.v += (doel - e.v) * Math.min(1, dt * 6);
    m.position.set(p.x, grond(world, p.x, p.y), p.y); m.rotation.y = -p.angle;
    try { animatePersonWalk(m, Math.min(e.v, 8), dt); } catch (er) { /* zonder loopanimatie */ }
    const ui2 = ui || (stand && stand.uiterlijk.get(p.id));
    if (ui2 && ui2.draagt) { try { carryPose(m, ui2.draagt); } catch (er) { /* */ } }
    if (vs) {
      if (vs.flags & V_GROET) { try { waveOverlay(m, nu + p.id * 0.37, 1); } catch (er) { /* */ } }
      if (vs.flags & V_FEEST) { try { const h = juichHoek(nu + p.id * 0.37, 1); juichOverlay(m, nu, h.links, h.rechts, h.spring, 1); } catch (er) { /* */ } }
    }
  }
  for (const [id, e] of pop) if (!gezien.has(id)) { verwijder(scene, e.mesh); pop.delete(id); }
  for (const id of wacht.keys()) if (!gezien.has(id)) wacht.delete(id);
  let terug = 0; for (const e of pop.values()) if (e.sig === 'terug') terug++;
  return { echt: pop.size - terug, rest: terug };
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
}

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

export function clearExtra() {
  const scene = getScene();
  if (scene) { for (const e of pop.values()) verwijder(scene, e.mesh); for (const e of dieren.values()) verwijder(scene, e.mesh); }
  pop.clear(); wacht.clear(); dieren.clear(); sprekers.clear();
  for (const key of mijnKapot) restorePropByKey(key);
  mijnKapot.clear();
}
export const hasExtra = () => pop.size > 0 || dieren.size > 0 || mijnKapot.size > 0;

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
  syncGastKapot(world, dt);
  world.coopExtraMeshes = [r.echt, nd, stand0(world)]; // voor de testbank: [voetgangers met hun echte uiterlijk, dieren, kapotte objecten]
  if (Array.isArray(world.coopHostMeshes)) { world.coopHostMeshes[2] = r.echt; world.coopHostMeshes[3] = r.rest; } // zelfde plekken als vroeger: [voertuigen echt, blokken, voetgangers echt, eenvoudig]
}
const stand0 = (world) => mijnKapot.size;
