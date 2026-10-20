// Sluizen in 3D (state in sluizen.js, #236): de deuren van elke kolk als twee bladen per
// kant die open en dicht draaien, en een sein (rood boven, groen onder, geel als de deur
// opengaat) vóór elke deur. Alleen de sluizen vlak bij de camera worden getekend; de
// vaste sluisprops (waterplekken3d.js) hebben zelf geen deuren meer.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getSluizen, liftOf } from './sluizen.js';
import { WATER_Y } from './util.js';
import { buildWaterGeometry, sharedWaterMaterial } from './water3d.js';

const VIEW = 260;
const GATE_H = 3.4;       // m hoog, 0,6 m onder water
const LEAF_T = 0.5;
const DOOR_MAT = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.8 });
const RAIL_MAT = new THREE.MeshStandardMaterial({ color: 0xc9c4b6, roughness: 0.7 });
const POST_MAT = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.6 });
const OFF_R = new THREE.MeshBasicMaterial({ color: 0x3a1210 }), ON_R = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
const OFF_G = new THREE.MeshBasicMaterial({ color: 0x0f2a14 }), ON_G = new THREE.MeshBasicMaterial({ color: 0x2aff58 });
const OFF_A = new THREE.MeshBasicMaterial({ color: 0x3a2a08 }), ON_A = new THREE.MeshBasicMaterial({ color: 0xffb020 });

let scene = null;
const LIFT_MIN = 0.02;     // m: onder dit verschil ligt het kolkwater in het watervlak van de wereld en blijft het plat
const views = new Map();   // sluis -> { group, water, gates: [[leaf, leaf], [leaf, leaf]], lamps: [{r, a, g}, {r, a, g}] }

function lamp(y, dx) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), OFF_R);
  m.position.set(dx, y, 0);
  return m;
}

function build(k) {
  const group = new THREE.Group();
  group.position.set(k.x, WATER_Y, k.y);
  group.rotation.y = -k.a;
  const gates = [], lamps = [];
  const L = k.width / 2 + 0.2;
  for (const s of [0, 1]) {
    const e = s ? 1 : -1, gu = e * k.half;
    const pair = [];
    for (const sd of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(gu, 0, sd * k.width / 2);
      // het blad ligt vanaf de scharnier naar het midden van de kolk
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(LEAF_T, GATE_H, L), DOOR_MAT);
      leaf.position.set(0, GATE_H / 2 - 0.6, -sd * L / 2);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, L), RAIL_MAT);
      rail.position.set(0, GATE_H - 0.55, -sd * L / 2);
      pivot.add(leaf, rail);
      leaf.castShadow = true;
      group.add(pivot);
      pair.push({ pivot, sd, e });
    }
    gates.push(pair);
    // het sein staat vóór de deur, op de kant van de loopbrug
    const post = new THREE.Group();
    post.position.set(e * (k.half + 3), 0, k.width / 2 + 1.8);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), POST_MAT);
    pole.position.y = 1.5;
    const r = lamp(3.2, 0), a = lamp(2.8, 0), g = lamp(2.4, 0);
    post.add(pole, r, a, g);
    group.add(post);
    lamps.push({ r, a, g });
  }
  // het water in de kolk: het stijgt en daalt met de schutcyclus (liftOf), de boot ligt erop
  let water = null;
  if (k.own) {
    const hl = k.half, hw = k.width / 2 - 0.1;
    const poly = { pts: [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]], kind: 'diep', bank: 'kade' };
    water = new THREE.Mesh(buildWaterGeometry(poly, null), sharedWaterMaterial());
    water.name = 'water';
    water.visible = false;
    group.add(water);
  }
  scene.add(group);
  return { group, water, gates, lamps };
}

export function updateSluizen3D(sc, px, py, night = 0) {
  if (!scene) scene = sc;
  const list = getSluizen();
  if (!list.length) return;
  const glow = 1 + 2.5 * night;
  ON_R.color.setHex(0xff2a1a).multiplyScalar(glow);
  ON_G.color.setHex(0x2aff58).multiplyScalar(glow);
  ON_A.color.setHex(0xffb020).multiplyScalar(glow);
  for (const k of list) {
    const near = Math.abs(k.x - px) < VIEW + k.half && Math.abs(k.y - py) < VIEW + k.half;
    let v = views.get(k);
    if (!near) { if (v) v.group.visible = false; continue; }
    if (!v) { v = build(k); views.set(k, v); }
    v.group.visible = true;
    if (v.water) {
      const lift = liftOf(k);
      v.water.visible = Math.abs(lift) >= LIFT_MIN;
      v.water.position.y = lift;
    }
    for (const s of [0, 1]) {
      const g = k.gate[s], ease = g * g * (3 - 2 * g), phi = ease * (Math.PI / 2) * 0.97;
      for (const { pivot, sd, e } of v.gates[s]) pivot.rotation.y = -sd * e * phi;
      const sig = k.sig[s], l = v.lamps[s];
      l.r.material = sig === 'red' ? ON_R : OFF_R;
      l.a.material = sig === 'amber' ? ON_A : OFF_A;
      l.g.material = sig === 'green' ? ON_G : OFF_G;
    }
  }
}

export function _sluizenViewsForTest() { return views; }
