// Samen spelen (#95): de wereld van de host bij een gast, getekend. Voertuigen dicht bij
// de spelers als vereenvoudigde blokken in de maat en kleur van het voertuig (coopworld.js
// VOERTUIG_MATEN), en het doel van de opdracht als een lichtzuil. Alleen three.js; de
// gegevens komen uit world.coopHost (coopnet.js). Niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildVehicleMesh } from './models3d_vehicles.js';

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

function bouw(v) {
  const echt = echteMesh(v);
  if (echt) return echt;
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.BoxGeometry(v.len, v.hoogte * 0.55, v.wid), mat(v.kleur));
  romp.position.y = v.hoogte * 0.45; romp.castShadow = true;
  const dak = new THREE.Mesh(new THREE.BoxGeometry(v.len * 0.5, v.hoogte * 0.4, v.wid * 0.9), mat('#cfd8dc'));
  dak.position.set(-v.len * 0.05, v.hoogte * 0.85, 0); dak.castShadow = true;
  g.add(romp, dak);
  return g;
}

function bouwPop(agent) {
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), mat(agent ? '#2d4a8a' : '#b8a98c')); romp.position.y = 1.0; romp.castShadow = true;
  const benen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.25), mat(agent ? '#1c2f5a' : '#5a5f66')); benen.position.y = 0.33;
  const hoofd = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), mat('#d9b99b')); hoofd.position.y = 1.55;
  g.add(romp, benen, hoofd);
  return g;
}

export const hasHostEntities = () => voertuigen.size > 0 || voetgangers.size > 0 || !!beacon;

// Elke frame (main.js), alleen op een gast.
export function syncHostEntities(world) {
  const scene = getScene(); if (!scene) return;
  const host = world.coopHost || { voertuigen: [], doelen: [], voetgangers: [] };
  const seen = new Set();
  for (const v of host.voertuigen) {
    seen.add(v.id);
    let m = voertuigen.get(v.id);
    if (!m) { m = bouw(v); scene.add(m); voertuigen.set(v.id, m); }
    const gz = world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? (() => { try { return world.map.groundHeightAt(v.x, v.y); } catch (e) { return 0; } })() : 0;
    m.position.set(v.x, gz, v.y); m.rotation.y = -v.angle;
  }
  for (const [id, m] of voertuigen) if (!seen.has(id)) { scene.remove(m); if (!m.userData.vehicleId) m.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); voertuigen.delete(id); } // echte modellen delen hun geometrie
  const zienP = new Set();
  for (const p of host.voetgangers || []) {
    zienP.add(p.id);
    let m = voetgangers.get(p.id);
    if (!m) { m = bouwPop(p.agent); scene.add(m); voetgangers.set(p.id, m); }
    const gz = world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? (() => { try { return world.map.groundHeightAt(p.x, p.y); } catch (er) { return 0; } })() : 0;
    m.position.set(p.x, gz, p.y); m.rotation.y = -p.angle;
  }
  for (const [id, m] of voetgangers) if (!zienP.has(id)) { scene.remove(m); m.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); voetgangers.delete(id); }
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
