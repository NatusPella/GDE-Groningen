// Movable bridges in 3D (state in movablebridges.js): the leaf over the water
// (one leaf hinged at one end, two for a long bascule, a swing span turning on
// its middle, a lift span, a retractable span sliding back), the half barriers
// and the red lights at both ends. The static road and its deck (roadsurface,
// quaywalls) stand for the bridge while it is closed; while it moves the road
// is hidden (scene3d.js passes openBridgeRoads() to the road batcher).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getMovableBridges, boomsOf } from './movablebridges.js';
import { mergeGeometries, tint } from './geomerge.js';

const VIEW = 180;
const BOOM_VIEW = 90;
const DECK_T = 0.5;
const RAIL_H = 1.05;
const MAX_ANGLE = { bascule: 1.25, swing: Math.PI / 2, draw: 1.25 };
const LIFT_H = 7;

const LEAF_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
const POST_MAT = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.6 });
// the leaf only needs drawing while it is not lying in the static road's place
const LAMP_OFF = new THREE.MeshBasicMaterial({ color: 0x3a1210 });
const LAMP_ON = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
let BOOM_MAT = null;

function stripeTexture() {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c) return null;
  c.width = 64; c.height = 8;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d42020'; g.fillRect(i * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let scene = null;
const views = [];

// A leaf of length L and half width h in its own frame: x from the hinge
// along the span, z across, the top at y = 0: deck, carriageway, footways and
// railings in one draw (vertex colours).
function buildLeaf(L, h, wide) {
  const parts = [tint(new THREE.BoxGeometry(L, DECK_T, 2 * h).translate(L / 2, -DECK_T / 2 - 0.01, 0), 0x8d887e)];
  parts.push(tint(new THREE.BoxGeometry(L, 0.02, wide ? 2 * h - 3.6 : 2 * h).translate(L / 2, 0.0, 0), 0x3b3d40));
  if (wide) for (const s of [1, -1]) parts.push(tint(new THREE.BoxGeometry(L, 0.14, 1.8).translate(L / 2, 0.07, s * (h - 0.9)), 0x9c968c));
  for (const s of [1, -1]) {
    parts.push(tint(new THREE.BoxGeometry(L, 0.08, 0.08).translate(L / 2, RAIL_H, s * (h - 0.05)), 0xe9e6dd));
    for (let x = 0.4; x < L; x += 1.6) parts.push(tint(new THREE.BoxGeometry(0.06, RAIL_H, 0.06).translate(x, RAIL_H / 2, s * (h - 0.05)), 0xe9e6dd));
  }
  const m = new THREE.Mesh(mergeGeometries(parts), LEAF_MAT);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function buildBoom(bm) {
  const root = new THREE.Group();
  root.position.set(bm.px, 0, bm.py);
  root.rotation.y = -Math.atan2(-bm.ry, -bm.rx);
  const post = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(0.22, 1.1, 0.22).translate(0, 0.55, 0), new THREE.BoxGeometry(0.08, 0.8, 0.08).translate(0, 1.5, 0)]), POST_MAT);
  root.add(post);
  const lamps = [];
  for (const dz of [-0.18, 0.18]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), LAMP_OFF);
    lamp.position.set(-0.14, 1.75, dz);
    root.add(lamp);
    lamps.push(lamp);
  }
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.95, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(bm.len, 0.09, 0.07).translate(bm.len / 2 + 0.1, 0, 0), BOOM_MAT || POST_MAT);
  pivot.add(arm);
  pivot.rotation.z = 1.45;
  root.add(pivot);
  return { root, lamps, pivot };
}

export function initMovableBridges3D(sceneRef) {
  scene = sceneRef;
  if (!BOOM_MAT) { const t = stripeTexture(); BOOM_MAT = new THREE.MeshLambertMaterial(t ? { map: t } : { color: 0xd42020 }); }
  for (const v of views) scene.remove(v.group);
  views.length = 0;
  for (const b of getMovableBridges()) {
    const group = new THREE.Group();
    group.visible = false;
    const wide = b.r.cat === 'major' || b.r.cat === 'normal' || b.r.cat === 'minor';
    const yaw = -Math.atan2(b.uy, b.ux);
    const leaves = [];
    const double = b.kind === 'bascule' && b.len > 26;
    const pieces = double ? [[0, b.len / 2, 1], [b.len, b.len / 2, -1]] : [[0, b.len, 1]];
    for (const [s0, L, dir] of pieces) {
      const pivot = new THREE.Group();
      const ex = b.ax + b.ux * s0, ey = b.ay + b.uy * s0;
      pivot.position.set(ex, 0, ey);
      pivot.rotation.y = dir > 0 ? yaw : yaw + Math.PI;
      const leaf = buildLeaf(L, b.half, wide);
      pivot.add(leaf);
      group.add(pivot);
      leaves.push({ pivot, leaf, L, dir, base: pivot.rotation.y, ex, ey });
    }
    const booms = boomsOf(b).map((bm) => { const v = buildBoom(bm); group.add(v.root); return v; });
    scene.add(group);
    views.push({ b, group, leaves, booms });
  }
}

// the roads of the bridges that are not lying closed (scene3d hides their static road)
export function openBridgeRoads(out = new Set()) {
  out.clear();
  for (const b of getMovableBridges()) if (b.open > 0) out.add(b.r);
  return out;
}

export function updateMovableBridges3D(px, py, night = 0) {
  if (!scene) return;
  LAMP_ON.color.setHex(0xff2a1a).multiplyScalar(1 + 2.5 * night);
  for (const v of views) {
    const { b } = v;
    const near = Math.abs(b.x - px) < VIEW && Math.abs(b.y - py) < VIEW;
    v.group.visible = near;
    if (!near) continue;
    const e = b.open * b.open * (3 - 2 * b.open);
    for (const L of v.leaves) {
      // lying closed it is the deck under the static road (quaywalls.js
      // leaves the movable spans out), a few cm under its surface
      L.leaf.rotation.set(0, 0, 0);
      L.leaf.position.set(0, b.open > 0 ? 0 : -0.06, 0);
      if (b.kind === 'swing') {
        // the whole span turns on its middle
        L.leaf.position.set(L.L / 2, 0, 0);
        L.leaf.rotation.y = e * MAX_ANGLE.swing;
        L.leaf.position.x = L.L / 2 - Math.cos(e * MAX_ANGLE.swing) * L.L / 2;
        L.leaf.position.z = Math.sin(e * MAX_ANGLE.swing) * L.L / 2;
      } else if (b.kind === 'lift') {
        L.leaf.position.y = e * LIFT_H;
      } else if (b.kind === 'retractable') {
        L.leaf.position.x = -e * L.L * 0.9;
        L.leaf.position.y = -e * 0.6;
      } else {
        L.leaf.rotation.z = e * (MAX_ANGLE[b.kind] || MAX_ANGLE.bascule);
      }
    }
    const phase = b.warn ? Math.floor(b.flash * 1.9) % 2 : -1;
    const ease = b.boom * b.boom * (3 - 2 * b.boom);
    const close = Math.abs(b.x - px) < BOOM_VIEW && Math.abs(b.y - py) < BOOM_VIEW;
    v.booms.forEach((p, i) => {
      p.root.visible = close;
      p.pivot.visible = !(b.snapped && b.snapped[i]);
      p.lamps[0].material = phase === 0 ? LAMP_ON : LAMP_OFF;
      p.lamps[1].material = phase === 1 ? LAMP_ON : LAMP_OFF;
      p.pivot.rotation.z = 1.45 * (1 - ease);
    });
  }
}
