// Disco-zwaailicht (streek, #61): elk voertuig in de buurt krijgt een draaiend lichtje op het dak, in alle
// kleuren van de regenboog (een kleur per voertuig, steeds opschuivend). Alleen een gekleurd blokje en een
// schijfje glans (geen echte lichten: honderd voertuigen kosten dan niets). Pure kleurkeuze hier, de scene in
// scene3d.js (updateDiscoLamp per voertuigmesh). Zie scripts/discolight_test.mjs.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';

export const DISCO_PERIOD = 2.4; // seconden voor een hele ronde door de kleuren

// De tint (0..1) van voertuig `id` op tijd `t`: elk voertuig een eigen begin, alle tinten komen langs.
export function discoHue(t, id = 0) {
  const off = (((id * 0.6180339) % 1) + 1) % 1;
  return (((t / DISCO_PERIOD + off) % 1) + 1) % 1;
}

// Het draaiende licht: een knippering van 0 tot 1 (vier flitsen per ronde), voor de glans.
export function discoPulse(t, id = 0) {
  const phase = (t * 4 / DISCO_PERIOD + id * 0.37) % 1;
  return 0.35 + 0.65 * Math.max(0, Math.cos(phase * Math.PI * 2)) ** 2;
}

const BOX = markShared(new THREE.BoxGeometry(0.26, 0.2, 0.26));
const DISC = markShared(new THREE.CircleGeometry(0.55, 14));
const _c = new THREE.Color();

// De hoogte van het dak van een voertuig, ruw: genoeg om het lampje erboven te zetten.
function roofY(v) {
  const m = v.model || {};
  if (v.isBus) return 3.3;
  if (m.name === 'truck' || m.name === 'trekkerlimo') return 3.0;
  if (m.name === 'tractor') return 2.9;
  if (v.isBike || v.isScooter || m.motorbike) return 2.0;
  if (m.van) return 2.2;
  return 1.75;
}

// Zet of haalt het lampje op een voertuigmesh. on = de streek staat aan. Geeft niets terug.
export function updateDiscoLamp(mesh, v, time, on) {
  let d = mesh.userData.disco;
  if (!on) { if (d) d.group.visible = false; return; }
  if (!d) {
    if (v.isBoat || v.isHeli || v.isPlane) return;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const box = new THREE.Mesh(BOX, mat);
    const glow = new THREE.Mesh(DISC, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.05;
    group.add(box, glow);
    group.position.set(0, roofY(v), 0);
    mesh.add(group);
    d = mesh.userData.disco = { group, mat, glowMat };
  }
  d.group.visible = true;
  _c.setHSL(discoHue(time, v.id || 0), 1, 0.55);
  d.mat.color.copy(_c);
  d.glowMat.color.copy(_c);
  d.glowMat.opacity = 0.25 + 0.4 * discoPulse(time, v.id || 0);
  d.group.rotation.y = time * 6;
}
