// Samen spelen (#95): de wereld van de host bij een gast, getekend. Voertuigen dicht bij
// de spelers als vereenvoudigde blokken in de maat en kleur van het voertuig (coopworld.js
// VOERTUIG_MATEN), en het doel van de opdracht als een lichtzuil. Alleen three.js; de
// gegevens komen uit world.coopHost (coopnet.js). Niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildVehicleMesh, updateVehicleWheelSpin, applyFlatTire, updateIndicatorLamps, updatePoliceLamps, applyVehicleDamage, setBusRearAngle, updateBikeStaat } from './models3d_vehicles.js';
import { poseHeliRotors } from './heli3d.js';
import { uiterlijkSpec } from './coopworld.js';
import { doorsFor, ensureDoors, wantDoor } from './vehicledoors.js';
import { syncVehicleDoors } from './vehicledoors3d.js';
import { standVers, MISC_DEUREN, leesDeuren } from './coopextra.js';
import { WATER_Y } from './util.js';
import { surfaceLiftAt } from './waterlevels.js';

const voertuigen = new Map(); // id -> mesh
const hornWas = new Map(); // id -> de toeter stond aan (de vorige keer)
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
// Open deuren van de host (MISC_DEUREN): de gast vraagt precies die deuren open en laat ze met dezelfde regels (vehicledoors.js) bewegen
let deurenOpen = 0;
function zetDeuren(m, spec, dt, deuren) {
  const defs = doorsFor(spec); if (!defs.length) return;
  const mask = deuren ? deuren.get(spec.id) || 0 : 0;
  if (mask || spec.doors) {
    const st = ensureDoors(spec);
    defs.forEach((d, i) => { if (mask & (1 << i)) wantDoor(st, d.id, true, 0); else if (st.want[d.id]) wantDoor(st, d.id, false); });
  }
  syncVehicleDoors(m, spec, dt, null);
  if (spec.doors && Object.values(spec.doors.open).some((x) => x > 0.3)) deurenOpen++;
}
// Wielen, sturen, richtingaanwijzers, zwaailicht, lekke band, rotor en de achterkant van een gelede bus, uit de staat van de host
function animeerVoertuig(m, spec, v, klok, dt, deuren) {
  const ud = m.userData;
  spec.indicator = v.ind; spec.flat = v.lek; spec.sirenOn = v.sirene; spec.speed = v.snelheid; spec.steer = v.stuur; spec.horn = v.toeter;
  try {
    zetDeuren(m, spec, dt, deuren);
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

export const hasHostEntities = () => voertuigen.size > 0 || !!beacon;

// Elke frame (main.js), alleen op een gast.
export function syncHostEntities(world, dt = 1 / 60) {
  const scene = getScene(); if (!scene) return;
  const host = world.coopHost || { voertuigen: [], doelen: [], voetgangers: [] };
  const seen = new Set();
  const klok = performance.now() / 1000;
  const stand = world.coopExtra, md = stand && standVers(stand, world.time) ? stand.misc.get(MISC_DEUREN) : null;
  const deuren = md ? (md.kaart || (md.kaart = leesDeuren(md.data) || new Map())) : null;
  const sirenes = [];
  deurenOpen = 0;
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
    if (spec && !m.userData.blok) animeerVoertuig(m, spec, v, klok, dt, deuren);
    // geluid: de toeter bij het aangaan van de vlag (met de toonhoogte van dit voertuig) en de sirene zolang hij aan staat, met de bestaande geluiden (audio.js)
    const toet = !!v.toeter;
    if (toet && !hornWas.get(v.id) && world.player && Math.hypot(v.x - world.player.x, v.y - world.player.y) < 130) {
      world.coopHoornDbg = (world.coopHoornDbg || 0) + 1; // voor de testbank
      (world.audioEvents || (world.audioEvents = [])).push(spec && (spec.isBike) ? { kind: 'bell', x: v.x, y: v.y } : { kind: 'horn', x: v.x, y: v.y, low: spec ? (spec.isBoat ? 0.45 : spec.isBus ? 0.7 : spec.model && spec.model.name === 'van' ? 0.85 : spec.isHeroCar ? 0.96 : 1) : 1 });
    }
    hornWas.set(v.id, toet);
    if (v.sirene) sirenes.push({ x: v.x, y: v.y, angle: v.angle, speed: v.snelheid, sirenOn: true, isPolice: !!(spec && spec.isPolice), id: v.id });
  }
  for (const id of hornWas.keys()) if (!seen.has(id)) hornWas.delete(id);
  world.coopSirenUnits = sirenes; world.coopDeurenDbg = deurenOpen; world.coopSirenDbg = sirenes.length;
  if (klok - dbgT > 1) { // voor de testbank (eenmaal per seconde): wat de gast per voertuig laat zien
    dbgT = klok;
    const o = {};
    for (const [id, m] of voertuigen) { const u = m.userData; o[id] = [u.blok ? 'blok' : u.gok ? 'gok' : 'echt', u.wheels ? +u.wheels[0].rotation.z.toFixed(2) : null, u.frontWheels ? +u.frontWheels[0].rotation.y.toFixed(2) : null, u.indLamps ? u.indLamps.filter((l) => l.visible).length : 0, u.policeLamps ? +u.policeLamps[0].material.emissiveIntensity.toFixed(1) : null, u.rotorHoek ? +u.rotorHoek.toFixed(1) : null, u.dentLijst ? u.dentLijst.length : 0]; }
    world.coopHostDbg = o;
    const pos = {}; // waar de gast ze tekent (boten en schepen: x, hoogte, y, richting), voor de testbank
    for (const [id, m] of voertuigen) if (m.userData.spec && m.userData.spec.isBoat) pos[id] = [+m.position.x.toFixed(1), +m.position.y.toFixed(2), +m.position.z.toFixed(1), +m.rotation.y.toFixed(2), +m.rotation.x.toFixed(3)];
    world.coopHostPos = pos;
  }
  for (const [id, m] of voertuigen) if (!seen.has(id)) { scene.remove(m); if (!m.userData.vehicleId) m.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); voertuigen.delete(id); } // echte modellen delen hun geometrie
  for (const id of wacht.keys()) if (!seen.has(id)) wacht.delete(id);
  // de voetgangers (uiterlijk, lopen, praten) tekent coopextra3d.js (#428), samen met dieren, verkeerslichten en kapotte objecten
  let echt = 0; for (const m of voertuigen.values()) if (!m.userData.blok) echt++;
  world.coopHostMeshes = [echt, voertuigen.size - echt, 0, 0]; // [echte modellen, blokken], voor de testbank
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
  if (beacon && scene) scene.remove(beacon);
  beacon = null;
}
