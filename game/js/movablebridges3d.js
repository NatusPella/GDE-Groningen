// Movable bridges in 3D (state in movablebridges.js): the leaf over the water
// (one leaf hinged at one end, two for a long bascule, a swing span turning on
// its middle, a lift span, a retractable span sliding back), the half barriers
// and the red lights at both ends. The static road and its deck (roadsurface,
// quaywalls) stand for the bridge while it is closed; while it moves the road
// is hidden (scene3d.js passes openBridgeRoads() to the road batcher).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getMovableBridges, boomsOf } from './movablebridges.js';
import { mergeGeometries, tint } from './geomerge.js';
import { roadSurfaceGeometries, getMarkingMaterial } from './roadsurface.js';

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

// The road's paint (lane lines, edge lines, arrows: roadsurface.js markings, in
// world coordinates along the road) cut to one leaf and put in the leaf's frame,
// so it turns, lifts and slides with the deck instead of staying behind when the
// static road is hidden. `pos`/`uv` are the marking geometry's arrays; the leaf
// is L long, hinged at s0 and running on (dir 1) or back (dir -1, the
// second half of a double bascule, whose frame runs the other way). Triangles go
// to the leaf their centre is over. Returns { pos, nrm, uv } for a Mesh.
export function leafMarkings(pos, uv, b, s0, L, dir, lift = 0.03) {
  let low = Infinity;
  for (let i = 1; i < pos.length; i += 3) low = Math.min(low, pos[i]);
  const frame = (k) => {
    const dx = pos[k * 3] - b.ax, dz = pos[k * 3 + 2] - b.ay;
    const lx = dx * b.ux + dz * b.uy, lz = -dx * b.uy + dz * b.ux;
    return dir > 0 ? [lx - s0, lz] : [s0 - lx, -lz];
  };
  const out = { pos: [], nrm: [], uv: [] };
  for (let t = 0; t + 2 < pos.length / 3; t += 3) {
    const f = [frame(t), frame(t + 1), frame(t + 2)];
    const cx = (f[0][0] + f[1][0] + f[2][0]) / 3;
    if (cx < 0 || cx >= L) continue;
    for (let k = 0; k < 3; k++) {
      out.pos.push(f[k][0], pos[(t + k) * 3 + 1] - low + lift, f[k][1]);
      out.nrm.push(0, 1, 0);
      out.uv.push(uv[(t + k) * 2], uv[(t + k) * 2 + 1]);
    }
  }
  return out;
}

function markingMesh(b, s0, L, dir, geo) {
  const pos = geo.getAttribute('position'), uv = geo.getAttribute('uv');
  const idx = geo.index;
  // un-index: three vertices per triangle
  const P = [], U = [];
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i++) {
    const v = idx ? idx.getX(i) : i;
    P.push(pos.getX(v), pos.getY(v), pos.getZ(v));
    U.push(uv.getX(v), uv.getY(v));
  }
  const m = leafMarkings(P, U, b, s0, L, dir);
  if (!m.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(m.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
  const mesh = new THREE.Mesh(g, getMarkingMaterial());
  mesh.receiveShadow = true;
  return mesh;
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
    let marks;
    const pieces = double ? [[0, b.len / 2, 1], [b.len, b.len / 2, -1]] : [[0, b.len, 1]];
    for (const [s0, L, dir] of pieces) {
      const pivot = new THREE.Group();
      const ex = b.ax + b.ux * s0, ey = b.ay + b.uy * s0;
      pivot.position.set(ex, 0, ey);
      pivot.rotation.y = dir > 0 ? yaw : yaw + Math.PI;
      const leaf = buildLeaf(L, b.half, wide);
      pivot.add(leaf);
      // the paint rides on the leaf (#153)
      if (marks === undefined) { try { marks = roadSurfaceGeometries(b.r).mark; } catch { marks = null; } }
      const paint = marks ? markingMesh(b, s0, L, dir, marks) : null;
      if (paint) leaf.add(paint);
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
