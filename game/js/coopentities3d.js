// Samen spelen (#95): de wereld van de host bij een gast, getekend. Voertuigen dicht bij
// de spelers als vereenvoudigde blokken in de maat en kleur van het voertuig (coopworld.js
// VOERTUIG_MATEN), en het doel van de opdracht als een lichtzuil. Alleen three.js; de
// gegevens komen uit world.coopHost (coopnet.js). Niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildVehicleMesh, updateVehicleWheelSpin, applyFlatTire, updateIndicatorLamps, updatePoliceLamps, applyVehicleDamage, setBusRearAngle, updateBikeStaat } from './models3d_vehicles.js';
import { poseHeliRotors } from './heli3d.js';
import { uiterlijkSpec } from './coopworld.js';
import { WATER_Y } from './util.js';
import { surfaceLiftAt } from './waterlevels.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';

const voertuigen = new Map(); // id -> mesh
const voetgangers = new Map(); // id -> mesh (de voetgangers van de host in de buurt, als eenvoudige poppetjes)
let beacon = null;
const MATS = {};
const mat = (c) => (MATS[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));

// De snapshot kent alleen de soort, niet het model of de kleur: een gast tekent het echte model van
// die soort (zelfde bouwer als de host), met een stabiele variatie op het id. Lukt dat niet, dan het blok.
const AUTO_MODELLEN = ['hatch', 'sedan', 'wagon', 'suv', 'sport'];
const AUTO_KLEUREN = ['#9aa3ad', '#b33a3a', '#2f5f9a', '#e8e6e0', '#3d7a52', '#c9a227', '#222428'];
function echteMesh(v) {
  const h = (v.id * 2654435761) >>> 0;
  const model = { name: 'hatch', len: v.len, wid: v.wid, color: v.kleur };
  const pv = { id: v.id, model, wrecked: false };
  switch (v.soort) {
    case 'auto': model.name = AUTO_MODELLEN[h % AUTO_MODELLEN.length]; model.color = AUTO_KLEUREN[(h >>> 8) % AUTO_KLEUREN.length]; break;
    case 'bakkie': model.name = 'van'; model.color = AUTO_KLEUREN[(h >>> 8) % AUTO_KLEUREN.length]; break;
    case 'politie': pv.isPolice = true; model.name = 'wagon'; break;
    case 'bus': pv.isBus = true; model.name = 'bus'; break;
    case 'vracht': model.name = 'truck'; break;
    case 'fiets': pv.isBike = true; break;
    case 'scooter': pv.isScooter = true; break;
    case 'motor': pv.isScooter = true; model.motorbike = true; break;
    default: return null;
  }
  try { return buildVehicleMesh(pv); } catch (e) { return null; }
}

// Het echte model van de host (look uit de snapshot, #428): dezelfde bouwer als de host, met deuken, lampen en wielen.
let dbgT = 0;
const wacht = new Map(); // id -> tijdstip waarop we het voertuig voor het eerst zagen zonder uiterlijk
const lookSleutel = (l) => [l.model, l.fl, l.len, l.wid, l.color, l.color2, l.extra].join('|');
const dentSleutel = (l) => l.dents.map((d) => d.map((n) => n.toFixed(2)).join(',')).join(';');
function echtMeshVanLook(spec) {
  try { return buildVehicleMesh(spec); } catch (e) { return null; }
}
// Een nieuwe deuk bij een bestaand model: alleen de nieuwe klappen toepassen (de host stuurt de laatste 8, dus het venster schuift).
// false = opnieuw bouwen (iets anders veranderd of de schade is hersteld).
function pasSchadeToe(m, look) {
  const ud = m.userData, spec = ud.spec;
  if (!spec || ud.gok) return false;
  const oud = ud.dentLijst || [], nieuw = look.dents;
  const gelijk = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 0.06);
  let overlap = -1;
  for (let k = Math.min(oud.length, nieuw.length); k >= 0; k--) { // de langste staart van oud die het begin van nieuw is
    let ok = true;
    for (let i = 0; i < k; i++) if (!gelijk(oud[oud.length - k + i], nieuw[i])) { ok = false; break; }
    if (ok) { overlap = k; break; }
  }
  if (overlap < 0 || (overlap === 0 && oud.length)) return false;
  try {
    for (const d of nieuw.slice(overlap)) applyVehicleDamage(m, spec, d[0], d[1], d[2]);
    spec.dentLog = nieuw.map((d) => d.slice());
    if (spec.isBike) updateBikeStaat(m, spec); // een fiets krijgt geen deuken maar een scheef spatbord (fietsStaat)
  } catch (e) { return false; }
  ud.dentLijst = nieuw.map((d) => d.slice());
  ud.dentSleutel = dentSleutel(look);
  return true;
}
// Wielen, sturen, richtingaanwijzers, zwaailicht, lekke band, rotor en de achterkant van een gelede bus, uit de staat van de host
function animeerVoertuig(m, spec, v, klok, dt) {
  const ud = m.userData;
  spec.indicator = v.ind; spec.flat = v.lek; spec.sirenOn = v.sirene; spec.speed = v.snelheid; spec.steer = v.stuur; spec.horn = v.toeter;
  try {
    updateVehicleWheelSpin(m, v.snelheid, dt, v.stuur);
    if (v.lek || ud.flatIdx >= 0) applyFlatTire(m, spec);
    if (v.ind || ud.indLamps) updateIndicatorLamps(m, spec, klok);
    if (spec.isPolice || spec.isAmbulance || v.sirene) updatePoliceLamps(m, klok, v.sirene, spec.id);
    if (spec.isHeli) { ud.rotorHoek = ((ud.rotorHoek || 0) + dt * 30 * v.rotor) % (Math.PI * 2); poseHeliRotors(m, ud.rotorHoek, v.rotor); }
    if (spec.isBus && ud.busSections) { // de achterkant volgt de voorkant met vertraging: sneller bij meer snelheid
      const k = Math.min(1, dt * Math.abs(v.snelheid) / Math.max(2, spec.model.len * 0.6));
      let d = v.angle - (ud.busAchter ?? v.angle); d = Math.atan2(Math.sin(d), Math.cos(d));
      ud.busAchter = (ud.busAchter ?? v.angle) + d * k;
      setBusRearAngle(m, v.angle, ud.busAchter);
    }
    if (spec.isBoat) { // een boot ligt niet stil op het water: een rustige deining, in de maat van de host
      m.rotation.order = 'YXZ';
      const t = klok * 1.3 + spec.id * 1.7;
      m.rotation.z = Math.sin(t) * 0.012 * Math.min(1, 3.2 / spec.model.len + 0.2);
      m.rotation.x = Math.sin(t * 0.8 + 1) * 0.01;
      m.position.y += Math.sin(t * 0.9) * 0.025;
    }
  } catch (e) { /* een onderdeel dat niet past, laat de rest gewoon staan */ }
}

function bouw(v) {
  const echt = echteMesh(v);
  if (echt) return echt;
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.BoxGeometry(v.len, v.hoogte * 0.55, v.wid), mat(v.kleur));
  romp.position.y = v.hoogte * 0.45; romp.castShadow = true;
  const dak = new THREE.Mesh(new THREE.BoxGeometry(v.len * 0.5, v.hoogte * 0.4, v.wid * 0.9), mat('#cfd8dc'));
  dak.position.set(-v.len * 0.05, v.hoogte * 0.85, 0); dak.castShadow = true;
  g.add(romp, dak);
  g.userData.blok = true;
  return g;
}

// Voetgangers van de gastheer: dezelfde bouwer als de gastheer (kleding, haar, politie-uniform), vaste variatie op het id; terugval op het blokpoppetje.
const SHIRTS = [0xb8473a, 0x3a6ea5, 0x4f8a5b, 0xd9b44a, 0x7a5a9a, 0xe8e6e0, 0x8a8f96, 0xc77d3a];
const HUIDEN = [0xf0c8a0, 0xd9aa82, 0xb98560, 0x8a5a3c, 0x5c3a28];
function echtePop(p) {
  const h = (p.id * 2654435761) >>> 0;
  try {
    const m = buildPersonMesh(p.agent ? 0x1c3fae : SHIRTS[h % SHIRTS.length], HUIDEN[(h >>> 8) % HUIDEN.length], { seed: p.id * 3.7 + 11 });
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return m;
  } catch (e) { return null; }
}

function bouwPop(agent) {
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), mat(agent ? '#2d4a8a' : '#b8a98c')); romp.position.y = 1.0; romp.castShadow = true;
  const benen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.25), mat(agent ? '#1c2f5a' : '#5a5f66')); benen.position.y = 0.33;
  const hoofd = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), mat('#d9b99b')); hoofd.position.y = 1.55;
  g.add(romp, benen, hoofd);
  g.userData.blok = true;
  return g;
}

export const hasHostEntities = () => voertuigen.size > 0 || voetgangers.size > 0 || !!beacon;

// Elke frame (main.js), alleen op een gast.
export function syncHostEntities(world, dt = 1 / 60) {
  const scene = getScene(); if (!scene) return;
  const host = world.coopHost || { voertuigen: [], doelen: [], voetgangers: [] };
  const seen = new Set();
  const klok = performance.now() / 1000;
  for (const v of host.voertuigen) {
    seen.add(v.id);
    let m = voertuigen.get(v.id);
    const sleutel = v.look ? lookSleutel(v.look) : '';
    if (m && v.look && (m.userData.gok || m.userData.lookSleutel !== sleutel)) { // het uiterlijk is anders dan getekend: opnieuw bouwen
      scene.remove(m); voertuigen.delete(v.id); m = null;
    } else if (m && v.look && m.userData.dentSleutel !== dentSleutel(v.look)) { // alleen nieuwe deuken erbij, anders opnieuw bouwen
      if (!pasSchadeToe(m, v.look)) { scene.remove(m); voertuigen.delete(v.id); m = null; }
    }
    if (!m) {
      const spec = v.look ? uiterlijkSpec(v.look) : null;
      if (!spec) { // het uiterlijk is nog onderweg (hoogstens een paar snapshots): even wachten, daarna een gok op het id
        const sinds = wacht.get(v.id) ?? (wacht.set(v.id, klok), klok);
        if (klok - sinds < 1.2) continue;
      }
      m = spec ? echtMeshVanLook(spec) : null;
      if (m) { const u = m.userData; u.lookSleutel = sleutel; u.dentSleutel = dentSleutel(v.look); u.dentLijst = v.look.dents.map((d) => d.slice()); u.spec = spec; u.gok = false; }
      else { m = bouw(v); m.userData.gok = true; }
      scene.add(m); voertuigen.set(v.id, m); wacht.delete(v.id);
    }
    const gz = world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? (() => { try { return world.map.groundHeightAt(v.x, v.y); } catch (e) { return 0; } })() : 0;
    let y = v.hoogteZ || gz;
    const spec = m.userData.spec;
    if (spec && spec.isBoat) { let lift = 0; try { lift = world.map ? surfaceLiftAt(world.map, v.x, v.y) : 0; } catch (e) { lift = 0; } y = WATER_Y + (Number.isFinite(lift) ? lift : 0); }
    m.position.set(v.x, y, v.y); m.rotation.y = -v.angle;
    if (spec && !m.userData.blok) animeerVoertuig(m, spec, v, klok, dt);
  }
  if (klok - dbgT > 1) { // voor de testbank (eenmaal per seconde): wat de gast per voertuig laat zien
    dbgT = klok;
    const o = {};
    for (const [id, m] of voertuigen) { const u = m.userData; o[id] = [u.blok ? 'blok' : u.gok ? 'gok' : 'echt', u.wheels ? +u.wheels[0].rotation.z.toFixed(2) : null, u.frontWheels ? +u.frontWheels[0].rotation.y.toFixed(2) : null, u.indLamps ? u.indLamps.filter((l) => l.visible).length : 0, u.policeLamps ? +u.policeLamps[0].material.emissiveIntensity.toFixed(1) : null, u.rotorHoek ? +u.rotorHoek.toFixed(1) : null, u.dentLijst ? u.dentLijst.length : 0]; }
    world.coopHostDbg = o;
  }
  for (const [id, m] of voertuigen) if (!seen.has(id)) { scene.remove(m); if (!m.userData.vehicleId) m.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); voertuigen.delete(id); } // echte modellen delen hun geometrie
  for (const id of wacht.keys()) if (!seen.has(id)) wacht.delete(id);
  const zienP = new Set();
  for (const p of host.voetgangers || []) {
    zienP.add(p.id);
    let m = voetgangers.get(p.id);
    if (!m) { m = echtePop(p) || bouwPop(p.agent); scene.add(m); voetgangers.set(p.id, m); }
    const gz = world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? (() => { try { return world.map.groundHeightAt(p.x, p.y); } catch (er) { return 0; } })() : 0;
    const sn = m.userData.vorig && dt > 0 ? Math.hypot(p.x - m.position.x, p.y - m.position.z) / dt : 0; m.userData.vorig = true; // de snapshot heeft geen snelheid: de afgelegde weg, gladgestreken
    const v = m.userData.v = (m.userData.v || 0) + (Math.min(sn, 12) - (m.userData.v || 0)) * Math.min(1, dt * 4);
    m.position.set(p.x, gz, p.y); m.rotation.y = -p.angle;
    if (!m.userData.blok) { try { animatePersonWalk(m, Math.min(v, 6), dt); } catch (e) { /* zonder loopanimatie */ } }
  }
  for (const [id, m] of voetgangers) if (!zienP.has(id)) { scene.remove(m); if (m.userData.blok) m.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); voetgangers.delete(id); }
  let echt = 0; for (const m of voertuigen.values()) if (!m.userData.blok) echt++;
  let echtP = 0; for (const m of voetgangers.values()) if (!m.userData.blok) echtP++;
  world.coopHostMeshes = [echt, voertuigen.size - echt, echtP, voetgangers.size - echtP]; // [echte modellen, blokken], voor de testbank
  const doel = host.doelen[0];
  if (doel && !beacon) {
    beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x3fc97a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(beacon);
  }
  if (beacon) { beacon.visible = !!doel; if (doel) beacon.position.set(doel.x, 30, doel.y); }
}

export function clearHostEntities() {
  const scene = getScene();
  for (const m of voertuigen.values()) if (scene) scene.remove(m);
  voertuigen.clear();
  for (const m of voetgangers.values()) if (scene) scene.remove(m);
  voetgangers.clear();
  if (beacon && scene) scene.remove(beacon);
  beacon = null;
}
