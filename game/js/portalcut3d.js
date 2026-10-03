// Openings where a street, cycleway or footway runs through a building
// (passages.js): the building materials discard their fragments inside the
// passage boxes near the player, so the facade shows a real gate, and a
// lined tunnel (walls, ceiling, lamps) is drawn inside the footprint. The
// Groninger Museum interior uses the same boxes for its doors.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial } from './pixelart3d.js';
import { pointInPolygon } from './util.js';

const MAX_PORTALS = 24;
const PICK_RADIUS = 170;
// how far a cut reaches past the corridor ends (they stop ~0.5 m outside the facade)
const END_PAD = 0.35;

export const PORTAL_UNIFORMS = {
  uPortalA: { value: Array.from({ length: MAX_PORTALS }, () => new THREE.Vector4()) },
  uPortalB: { value: Array.from({ length: MAX_PORTALS }, () => new THREE.Vector4()) },
  uPortalN: { value: 0 },
};

// Patches a building material (MeshStandardMaterial, possibly with its own
// onBeforeCompile) to discard inside the active portal boxes.
export function applyPortalCut(mat) {
  if (!mat || mat.userData.portalCut) return mat;
  mat.userData.portalCut = true;
  const prev = mat.onBeforeCompile;
  const ownKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey : null;
  const prevSrc = prev ? prev.toString() : '';
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, PORTAL_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPortalW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPortalW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vPortalW;
uniform vec4 uPortalA[${MAX_PORTALS}];
uniform vec4 uPortalB[${MAX_PORTALS}];
uniform int uPortalN;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  for (int i = 0; i < ${MAX_PORTALS}; i++) {
    if (i >= uPortalN) break;
    vec4 pa = uPortalA[i];
    vec4 pb = uPortalB[i];
    vec2 pd = vPortalW.xz - pa.xy;
    if (abs(dot(pd, pa.zw)) < pb.x && abs(dot(pd, vec2(-pa.w, pa.z))) < pb.y && vPortalW.y < pb.z && vPortalW.y > pb.w) discard;
  }`);
  };
  mat.customProgramCacheKey = () => 'portal|' + (ownKey ? ownKey.call(mat) : prevSrc);
  mat.needsUpdate = true;
  return mat;
}

// --- registry -------------------------------------------------------------------

// { cx, cy, ux, uy, hl, hw, top, bottom }
const boxes = [];
const registered = new Set();

export function registerPortalBoxes(owner, list) {
  if (registered.has(owner)) return;
  registered.add(owner);
  for (const b of list) boxes.push(b);
}

// Interiors (museum3d.js) are only drawn while the player is within `radius`.
const interiors = [];
export function registerInterior(obj, at, radius, onShow = null) {
  obj.visible = false;
  interiors.push({ obj, x: at.x, y: at.y, radius, onShow });
}

let lastX = Infinity, lastY = Infinity, frame = 0;
const picked = [];
export function updatePortals(x, y, force = false) {
  frame++;
  if (!force && frame % 12 && Math.hypot(x - lastX, y - lastY) < 6) return;
  lastX = x; lastY = y;
  for (const it of interiors) {
    const show = Math.hypot(it.x - x, it.y - y) < it.radius;
    if (show && !it.obj.visible && it.onShow) it.onShow();
    it.obj.visible = show;
  }
  picked.length = 0;
  for (const b of boxes) {
    const d = Math.hypot(b.cx - x, b.cy - y) - b.hl;
    if (d < PICK_RADIUS) picked.push([d, b]);
  }
  picked.sort((a, b) => a[0] - b[0]);
  const n = Math.min(MAX_PORTALS, picked.length);
  const A = PORTAL_UNIFORMS.uPortalA.value, B = PORTAL_UNIFORMS.uPortalB.value;
  for (let i = 0; i < n; i++) {
    const b = picked[i][1];
    A[i].set(b.cx, b.cy, b.ux, b.uy);
    B[i].set(b.hl, b.hw, b.top, b.bottom);
  }
  PORTAL_UNIFORMS.uPortalN.value = n;
}

// --- passage tunnels --------------------------------------------------------------

const tunnelMaterial = vcMaterial({ side: THREE.DoubleSide, emissive: 0x3a3024, emissiveIntensity: 1 });
tunnelMaterial.userData.shared = true;
const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4b0 });
lampMaterial.userData.shared = true;
const WALL = 0xd9cfbf, CEIL = 0xcac0b0, SOCKEL = 0x8f877c;
const doorMaterial = vcMaterial();
doorMaterial.userData.shared = true;
// [width, height, colour] of the door where a footway, cycleway or street
// ends at a facade (passages.js doorsOf); a street gets a roller door
const DOORS = { foot: [1.3, 2.3, 0x4b3526], cycle: [2.2, 2.4, 0x55595d], street: [3.2, 3.0, 0x7d8185] };
const DOOR_FRAME = 0xcfc6b4, DOOR_SLAT = 0x62666a;

function doorQuad(B, d, w, h, off, color, y0) {
  const cx = d.x + d.nx * off, cy = d.y + d.ny * off;
  const ax = cx - d.ux * w / 2, ay = cy - d.uy * w / 2, bx = cx + d.ux * w / 2, by = cy + d.uy * w / 2;
  B.quadOut([ax, y0, ay], [bx, y0, by], [bx, y0 + h, by], [ax, y0 + h, ay], [d.nx, 0, d.ny], color, 2);
}

function addDoors(B, doors, depth, base) {
  for (const d of doors) {
    const street = !DOORS[d.cat];
    const [w0, h0, color] = street ? DOORS.street : DOORS[d.cat];
    const w = Math.min(w0, d.edge - 0.4), h = Math.min(h0, depth - 0.6);
    if (w < 0.8 || h < 1.8) continue;
    doorQuad(B, d, w + 0.24, h + 0.12, 0.06, DOOR_FRAME, base);
    doorQuad(B, d, w, h, 0.09, color, base);
    if (street) for (let y = 0.35; y < h - 0.1; y += 0.35) doorQuad(B, d, w, 0.04, 0.1, DOOR_SLAT, base + y);
  }
}

// Ceiling height of a passage in a building `depth` metres tall (a path
// through a one-storey shop keeps 2.5 m under a 0.6 m lintel).
export function passageHeight(cat, depth) {
  const slow = cat === 'foot' || cat === 'cycle';
  return Math.max(2.3, Math.min(slow ? 3.2 : 4.3, depth - (slow ? 0.6 : 0.7)));
}

// Span [t0, t1] of segment a->b (length L) whose centreline lies inside the ring.
function insideSpan(ring, ax, ay, ux, uy, L) {
  let t0 = null, t1 = null;
  for (let t = 0; t <= L + 1e-6; t += 0.25) {
    if (pointInPolygon(ax + ux * t, ay + uy * t, ring)) { if (t0 === null) t0 = t; t1 = t; }
  }
  return t0 === null ? null : [Math.max(0, t0 - 0.25), Math.min(L, t1 + 0.25)];
}

// Walls, ceiling and lamps along every shown passage of `b`, plus its portal
// boxes, and a door where a way ends at its facade. Returns the mesh (or
// null) and registers the boxes.
export function buildPassageTunnels(b, passages, depth, base = 0, doors = []) {
  const shown = passages.filter((p) => p.shown || p.hall);
  if (!shown.length && !doors.length) return null;
  const B = new GeoBuilder(3);
  addDoors(B, doors, depth, base);
  const list = [];
  const ring = b.pts;
  for (const p of shown) {
    const H = passageHeight(p.cat, depth);
    const hw = p.hw + 0.02;
    const P = p.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      if (L < 0.05) continue;
      const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
      const span = insideSpan(ring, ax, ay, ux, uy, L);
      if (!span) continue;
      // at the ends of the corridor the cut reaches through the facade
      const s0 = span[0] - (i === 0 ? END_PAD : 0.05), s1 = span[1] + (i === P.length - 2 ? END_PAD : 0.05);
      const mid = (s0 + s1) / 2;
      list.push({ cx: ax + ux * mid, cy: ay + uy * mid, ux, uy, hl: (s1 - s0) / 2, hw: hw - 0.01, top: base + H, bottom: base - 2 });
      const [t0, t1] = span;
      const at = (t, side, y) => [ax + ux * t + nx * hw * side, base + y, ay + uy * t + ny * hw * side];
      for (const side of [1, -1]) {
        // a side that runs outside the footprint (an arcade along the facade) stays open
        const ws = insideSpan(ring, ax + nx * hw * side, ay + ny * hw * side, ux, uy, L);
        if (!ws) continue;
        const w0 = Math.max(t0, ws[0]), w1 = Math.min(t1, ws[1]);
        if (w1 - w0 < 0.3) continue;
        const inward = [-nx * side, 0, -ny * side];
        B.quadOut(at(w0, side, 0), at(w1, side, 0), at(w1, side, 0.45), at(w0, side, 0.45), inward, SOCKEL, 0);
        B.quadOut(at(w0, side, 0.45), at(w1, side, 0.45), at(w1, side, H), at(w0, side, H), inward, WALL, 0);
      }
      B.quadOut(at(t0, 1, H), at(t1, 1, H), at(t1, -1, H), at(t0, -1, H), [0, -1, 0], CEIL, 0);
      for (let t = t0 + 1.5; t < t1 - 1; t += 5) {
        const x = ax + ux * t, y = ay + uy * t;
        B.box(x, base + H - 0.04, y, 0.22, 0.05, 0.7, 0xffffff, 1, 0, -Math.atan2(uy, ux) + Math.PI / 2, 0);
      }
    }
  }
  registerPortalBoxes(b, list);
  const geo = B.build();
  if (!geo) return null;
  const mesh = new THREE.Mesh(geo, [tunnelMaterial, lampMaterial, doorMaterial]);
  mesh.name = 'passage';
  return mesh;
}
