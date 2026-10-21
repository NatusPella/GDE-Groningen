// Samen spelen (#95, #367): de roepjes van de spelers in de wereld. Een doorzichtige lichtzuil in de kleur van wie riep,
// met een label ("Tessa · Kom hier") dat boven de grond zweeft en een rondje op de grond dat meepulseert. De lijst met
// pings komt uit coopping.js (getest); dit bestand is alleen three.js en is niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';

const baken = new Map(); // id -> { group, beam, ring, label, kleur }
const HOOGTE = 60;

function makeLabel(tekst, kleur) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 72;
  const g = c.getContext('2d');
  g.font = 'bold 38px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,16,10,0.72)'; g.fillRect(6, 6, 372, 60);
  g.strokeStyle = kleur; g.lineWidth = 3; g.strokeRect(6, 6, 372, 60);
  g.fillStyle = '#f0ede4'; g.fillText(tekst, 192, 38);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  spr.scale.set(5.4, 1.0, 1); spr.renderOrder = 20;
  return spr;
}

function bouw(scene, m) {
  const group = new THREE.Group();
  const kleur = new THREE.Color(m.kleur);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, HOOGTE, 10, 1, true), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = HOOGTE / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 28), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15;
  const label = makeLabel(m.naam ? `${m.naam} · ${m.tekst}` : m.tekst, m.kleur);
  label.position.y = 7;
  group.add(beam, ring, label);
  scene.add(group);
  return { group, beam, ring, label, kleur: m.kleur };
}
function ruim(scene, e) {
  scene.remove(e.group);
  e.group.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
}

export const hasPingMeshes = () => baken.size > 0;

// Elke frame (main.js): maak, verplaats en ruim op volgens world.coopPingMarks
export function syncPings(world) {
  const scene = getScene(); if (!scene) return;
  const lijst = world.coopPingMarks || [];
  const ids = new Set(lijst.map((m) => m.id));
  for (const [id, e] of baken) if (!ids.has(id)) { ruim(scene, e); baken.delete(id); }
  const t = performance.now() / 1000;
  for (const m of lijst) {
    let e = baken.get(m.id);
    if (!e) { e = bouw(scene, m); baken.set(m.id, e); }
    let gz = 0; const map = world.map;
    if (map && map.elev && map.elev.has && map.groundHeightAt) { try { gz = map.groundHeightAt(m.x, m.y); } catch (er) { /* hoogte onbekend: vlak */ } }
    e.group.position.set(m.x, gz, m.y);
    const puls = 0.5 + 0.5 * Math.sin(t * 5);
    e.beam.material.opacity = 0.25 + 0.3 * puls * Math.min(1, m.rest / 1.5);
    e.ring.scale.setScalar(1 + 0.35 * puls);
    e.ring.material.opacity = 0.5 + 0.4 * (1 - puls);
  }
}
