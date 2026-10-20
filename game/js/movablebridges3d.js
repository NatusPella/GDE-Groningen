// Movable bridges in 3D (state in movablebridges.js): the leaf over the water
// (one leaf hinged at one end, two for a long bascule, a swing span turning on
// its middle, a lift span, a retractable span sliding back), the half barriers
// and the red lights at both ends. The static road and its deck (roadsurface,
// quaywalls) stand for the bridge while it is closed; while it moves the road
// is hidden (scene3d.js passes openBridgeRoads() to the road batcher).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getMovableBridges, boomsOf, boatSignal } from './movablebridges.js';
import { mergeGeometries, tint } from './geomerge.js';
import { waterAt } from './waterlevels.js';
import { roadSurfaceGeometries, roadSurfaceMaterials, getMarkingMaterial } from './roadsurface.js';

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
const GREEN_OFF = new THREE.MeshBasicMaterial({ color: 0x0f2a14 });
const GREEN_ON = new THREE.MeshBasicMaterial({ color: 0x2aff58 });
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
// railings in one draw (vertex colours). The carriageway and pavements are the
// road's own surface meshes and materials (see surfaceMeshes) when `plain` is
// false; `plain` (no road geometry to wear) paints them in flat colours.
function buildLeaf(L, h, wide, plain = true) {
  const parts = [tint(new THREE.BoxGeometry(L, DECK_T, 2 * h).translate(L / 2, -DECK_T / 2 - 0.01, 0), 0x8d887e)];
  if (plain) parts.push(tint(new THREE.BoxGeometry(L, 0.02, wide ? 2 * h - 3.6 : 2 * h).translate(L / 2, 0.0, 0), 0x3b3d40));
  if (plain && wide) for (const s of [1, -1]) parts.push(tint(new THREE.BoxGeometry(L, 0.14, 1.8).translate(L / 2, 0.07, s * (h - 0.9)), 0x9c968c));
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
export function leafMarkings(pos, uv, b, s0, L, dir, lift = 0.03, low = undefined, nrm = null) {
  if (low === undefined) { low = Infinity; for (let i = 1; i < pos.length; i += 3) low = Math.min(low, pos[i]); }
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
      if (nrm) { const nx = nrm[(t + k) * 3], nz = nrm[(t + k) * 3 + 2]; const [fx, fz] = dir > 0 ? [nx * b.ux + nz * b.uy, -nx * b.uy + nz * b.ux] : [-(nx * b.ux + nz * b.uy), nx * b.uy - nz * b.ux]; out.nrm.push(fx, nrm[(t + k) * 3 + 1], fz); } else out.nrm.push(0, 1, 0);
      out.uv.push(uv[(t + k) * 2], uv[(t + k) * 2 + 1]);
    }
  }
  return out;
}

// The part of a road surface geometry over one leaf, as a mesh in the leaf's
// frame with the road's own material. `low`: the road surface's lowest point
// (shared by all its parts so they keep their heights to each other).
function surfaceMesh(b, s0, L, dir, geo, material, lift, low) {
  if (!geo) return null;
  const pos = geo.getAttribute('position'), uv = geo.getAttribute('uv'), nrm = geo.getAttribute('normal');
  const idx = geo.index;
  // un-index: three vertices per triangle
  const P = [], U = [], N = [];
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i++) {
    const v = idx ? idx.getX(i) : i;
    P.push(pos.getX(v), pos.getY(v), pos.getZ(v));
    U.push(uv ? uv.getX(v) : 0, uv ? uv.getY(v) : 0);
    if (nrm) N.push(nrm.getX(v), nrm.getY(v), nrm.getZ(v));
  }
  const m = leafMarkings(P, U, b, s0, L, dir, lift, low, nrm ? N : null);
  if (!m.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(m.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}

// What a leaf wears: the road's carriageway, pavements and paint, each cut to
// the leaf (#153). Nothing for a road without geometry (the leaf then keeps its
// flat colours).
function surfaceMeshes(b, s0, L, dir, geo, mats) {
  if (!geo || !geo.road || !mats) return [];
  const rp = geo.road.getAttribute('position');
  let low = Infinity;
  for (let i = 0; i < rp.count; i++) low = Math.min(low, rp.getY(i));
  return [
    surfaceMesh(b, s0, L, dir, geo.road, mats.road, 0.01, low),
    mats.sidewalk ? surfaceMesh(b, s0, L, dir, geo.sidewalk, mats.sidewalk, 0.02, low) : null,
    surfaceMesh(b, s0, L, dir, geo.mark, getMarkingMaterial(), 0.035, low),
  ].filter(Boolean);
}

// The boat signals at the span (#154): a post with a red lamp over a green one on
// each bank, at opposite ends and opposite sides of the deck so a boat sees one
// from either way along the water. Red until the span lies open. They stand on
// the banks just beyond the span's ends (not in the water beside the deck).
// With the map the spot dodges: it moves outward and along until it stands on no
// other car road and, if it can, not in the water.
export function signalSpot(b, end, map = null) {
  const side = end ? -1 : 1;
  const nx = -b.uy * side, ny = b.ux * side;
  const dir = end ? 1 : -1;
  const ex = end ? b.bx : b.ax, ey = end ? b.by : b.ay;
  let best = null, bestScore = Infinity;
  for (const out of [0, 1.8, 3.6, 5.4, 8, 11]) {
    for (const beyond of [1.5, 4.5, 7.5, 11, 15, 20]) {
      const x = ex + dir * b.ux * beyond + nx * (b.half + 1.2 + out), y = ey + dir * b.uy * beyond + ny * (b.half + 1.2 + out);
      if (!map) return [x, y];
      const score = (onCarRoad(map, x, y, b.r) ? 2 : 0) + (waterAt(map, x, y) ? 1 : 0) + out * 0.01 + beyond * 0.001;
      if (score < bestScore) { bestScore = score; best = [x, y]; }
    }
  }
  return best;
}
function onCarRoad(map, x, y, own) {
  if (!map.roadsNear) return false;
  for (const r of map.roadsNear(x, y, 6)) {
    if (r === own || r.cat === 'foot' || r.cat === 'cycle') continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const ax = r.pts[i][0], ay = r.pts[i][1], bx = r.pts[i + 1][0] - ax, by = r.pts[i + 1][1] - ay, l2 = bx * bx + by * by || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / l2));
      if (Math.hypot(ax + bx * t - x, ay + by * t - y) < (r.width || 4) / 2 + 0.5) return true;
    }
  }
  return false;
}
function buildSignal(b, end, map) {
  const root = new THREE.Group();
  const [sx, sy] = signalSpot(b, end, map);
  root.position.set(sx, 0, sy);
  root.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16).translate(0, 1.6, 0), POST_MAT));
  const lamps = [];
  for (const y of [3.0, 2.6]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), LAMP_OFF);
    lamp.position.set(0, y, 0);
    root.add(lamp);
    lamps.push(lamp);
  }
  return { root, red: lamps[0], green: lamps[1] };
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

export function initMovableBridges3D(sceneRef, map = null) {
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
    let surf;
    const pieces = double ? [[0, b.len / 2, 1], [b.len, b.len / 2, -1]] : [[0, b.len, 1]];
    for (const [s0, L, dir] of pieces) {
      const pivot = new THREE.Group();
      const ex = b.ax + b.ux * s0, ey = b.ay + b.uy * s0;
      pivot.position.set(ex, 0, ey);
      pivot.rotation.y = dir > 0 ? yaw : yaw + Math.PI;
      // the road's surface, pavements and paint ride on the leaf with the
      // road's own materials, so the deck looks the same open and closed (#153)
      if (surf === undefined) { try { surf = { geo: roadSurfaceGeometries(b.r), mats: roadSurfaceMaterials(b.r) }; } catch { surf = null; } }
      const worn = surf ? surfaceMeshes(b, s0, L, dir, surf.geo, surf.mats) : [];
      const leaf = buildLeaf(L, b.half, wide, !worn.length);
      for (const m of worn) leaf.add(m);
      pivot.add(leaf);
      group.add(pivot);
      leaves.push({ pivot, leaf, L, dir, base: pivot.rotation.y, ex, ey });
    }
    const booms = boomsOf(b).map((bm) => { const v = buildBoom(bm); group.add(v.root); return v; });
    const signals = [0, 1].map((end) => { const s = buildSignal(b, end, map); group.add(s.root); return s; });
    scene.add(group);
    views.push({ b, group, leaves, booms, signals });
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
  GREEN_ON.color.setHex(0x2aff58).multiplyScalar(1 + 2.5 * night);
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
    const green = boatSignal(b) === 'green';
    for (const s of v.signals) {
      s.red.material = green ? LAMP_OFF : LAMP_ON;
      s.green.material = green ? GREEN_ON : GREEN_OFF;
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

// for tests: the built views
export function _bridgeViewsForTest() { return views; }
