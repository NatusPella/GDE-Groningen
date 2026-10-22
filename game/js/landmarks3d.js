import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder } from './pixelart3d.js';
import { LANDMARK_MATERIALS, glassMat } from './landmarkmaterials.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';
import { MUSEUM_ROOMS, rectCorners } from './museumplan.js';
import { paddepoelBlock, setPaddepoelNight } from './paddepoel3d.js';
import { P } from './worldframe.js';
import { kitItemFromBuilding, landmarkParams, landmarkGeometry, LOD_FULL } from './landmarkkit.js';

// Procedural models for the named Groningen landmarks, one merged
// vertex-coloured geometry per building (five shared materials). Geometry is
// in world coordinates (x, height, map-y) like the other building parts and
// stays inside the building footprint, so collision needs no changes; only
// roofs, eaves and cantilevers overhang above head height.

const G_PLAIN = 0, G_BRICK = 1, G_GLASS = 2, G_METAL = 3, G_TILE = 4;

export { LANDMARK_MATERIALS };

// Night: landmark glazing gets a faint warm glow (the lit-window shader
// used by ordinary buildings needs per-pane UVs these models don't have).
export function setLandmarkNight(glow) {
  glassMat.emissiveIntensity = Math.min(0.5, glow * 0.22);
  setPaddepoelNight(glow);
}

const C = {
  brick: 0xa3503a, brickDark: 0x86402f, brickBrown: 0x8e4f3a, stone: 0xd9ccae, sandstone: 0xcdb58a,
  slate: 0x4d5561, slateDark: 0x3d434b, lead: 0x7a8186, copper: 0x7fae98, gold: 0xf0c24e,
  glass: 0x2d3b44, glassLight: 0x5d7480, frame: 0xe6dfcf, dark: 0x2b2926, door: 0x3a2a20,
  white: 0xe9e5dc, green: 0x2f7a45, greenSeat: 0x2f8a4a, steel: 0x8b9196, charcoal: 0x3c4044,
};

// --- small geometry helpers ------------------------------------------------------

const W = (x, h, y) => [x, h, y];

// Oriented box built from quads (planar metre UVs, so brick/tile textures keep
// their scale); bottom face omitted.
function obox(B, cx, cy, y0, sx, sy, h, rot, color, g) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const hx = sx / 2, hy = sy / 2;
  const P = (a, b, y) => [cx + a * c - b * s, y, cy + a * s + b * c];
  const y1 = y0 + h;
  const p = [P(-hx, -hy, y0), P(hx, -hy, y0), P(hx, hy, y0), P(-hx, hy, y0)];
  const q = [P(-hx, -hy, y1), P(hx, -hy, y1), P(hx, hy, y1), P(-hx, hy, y1)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    B.quad(p[i], p[j], q[j], q[i], color, g);
  }
  B.quad(q[0], q[1], q[2], q[3], color, g);
}

// Local frame: u along `dir`, v to its left; P(u, v) -> map [x, y].
function frameFrom(ux, uy, pts) {
  const F = { ux, uy, rot: Math.atan2(uy, ux) };
  F.P = (u, v) => [u * ux - v * uy, u * uy + v * ux];
  F.U = (x, y) => x * ux + y * uy;
  F.V = (x, y) => -x * uy + y * ux;
  if (pts) {
    F.u0 = F.v0 = Infinity; F.u1 = F.v1 = -Infinity;
    for (const [x, y] of pts) {
      const u = F.U(x, y), v = F.V(x, y);
      F.u0 = Math.min(F.u0, u); F.u1 = Math.max(F.u1, u);
      F.v0 = Math.min(F.v0, v); F.v1 = Math.max(F.v1, v);
    }
  }
  return F;
}
function minAreaFrame(pts) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 2) continue;
    const F = frameFrom((b[0] - a[0]) / L, (b[1] - a[1]) / L, pts);
    const area = (F.u1 - F.u0) * (F.v1 - F.v0);
    if (!best || area < best.area) { best = F; F.area = area; }
  }
  if (best && best.u1 - best.u0 < best.v1 - best.v0) {
    best = frameFrom(-best.uy, best.ux, pts); // u = long axis
  }
  return best;
}
// Frame box: centre (u, v), bottom y.
function fbox(B, F, u, v, y, su, sv, h, color, g) {
  const [x, z] = F.P(u, v);
  obox(B, x, z, y, su, sv, h, F.rot, color, g);
}
const FW = (F, u, v, h) => { const [x, z] = F.P(u, v); return [x, h, z]; };

function prism(B, geo, x, y, z, rot, color, g) {
  const m = new THREE.Matrix4().makeRotationY(-rot);
  m.setPosition(x, y, z);
  B.geo(geo, m, color, g);
}
function cone(B, x, y, z, r, h, sides, color, g, rot = 0) {
  prism(B, new THREE.ConeGeometry(r, h, sides, 1, true), x, y + h / 2, z, rot + Math.PI / sides, color, g);
}
function cyl(B, x, y, z, rTop, rBot, h, sides, color, g, rot = 0, open = false) {
  prism(B, new THREE.CylinderGeometry(rTop, rBot, h, sides, 1, open), x, y + h / 2, z, rot + Math.PI / sides, color, g);
}

// Gable (ridge along a) or hip roof over a frame rectangle; M maps (a, c, h).
function roofRect(B, M, a0, a1, c0, c1, y, rise, color, g, { hip = 0, oh = 0.35, gable = null, gableG = G_BRICK } = {}) {
  const cm = (c0 + c1) / 2, half = (c1 - c0) / 2;
  const drop = oh * rise / Math.max(0.5, half);
  const ins = hip ? Math.min(half * hip, (a1 - a0) / 2) : 0;
  const e0 = [M(a0 - oh, c0 - oh, y - drop), M(a1 + oh, c0 - oh, y - drop), M(a1 + oh, c1 + oh, y - drop), M(a0 - oh, c1 + oh, y - drop)];
  const r0 = M(a0 + ins, cm, y + rise), r1 = M(a1 - ins, cm, y + rise);
  B.quad(e0[0], e0[1], r1, r0, color, g);
  B.quad(e0[2], e0[3], r0, r1, color, g);
  if (hip) {
    B.tri(e0[3], e0[0], r0, color, g);
    B.tri(e0[1], e0[2], r1, color, g);
  } else if (gable != null) {
    B.tri(M(a0, c0, y), M(a0, c1, y), M(a0, cm, y + rise), gable, gableG);
    B.tri(M(a1, c1, y), M(a1, c0, y), M(a1, cm, y + rise), gable, gableG);
  }
}
const alongU = (F) => (a, c, h) => FW(F, a, c, h);
const alongV = (F) => (a, c, h) => FW(F, c, a, h);

// Ring helpers (map [x, y] arrays).
function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
function triangulate(ring) {
  const contour = ring.map(([x, y]) => new THREE.Vector2(x, y));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  return tris.map((t) => t.map((i) => [contour[i].x, contour[i].y]));
}
function cap(B, ring, yFn, color, g) {
  for (const [a, b, c] of triangulate(ring)) B.tri(W(a[0], yFn(a), a[1]), W(b[0], yFn(b), b[1]), W(c[0], yFn(c), c[1]), color, g);
}
function walls(B, ring, y0, yFn, color, g) {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    B.quad(W(a[0], y0, a[1]), W(b[0], y0, b[1]), W(b[0], yFn(b), b[1]), W(a[0], yFn(a), a[1]), color, g);
  }
}
function extrude(B, ring, y0, y1, color, g, capColor = color, capG = g) {
  walls(B, ring, y0, () => y1, color, g);
  cap(B, ring, () => y1, capColor, capG);
}
// Sutherland-Hodgman against the half-plane f(p) >= 0 (f linear).
function clipRing(ring, f) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
// Pitched roof over an arbitrary footprint: ridge along the frame's u axis,
// slopes planar per half; walls rise to meet it (gables at the ends).
function polyGableRoof(B, ring, F, eave, maxRise, pitchDeg, roofColor, wallColor) {
  const vm = (F.v0 + F.v1) / 2, half = (F.v1 - F.v0) / 2;
  const k = Math.min(Math.tan(pitchDeg * Math.PI / 180), maxRise / half);
  const yAt = (p) => eave + k * (half - Math.abs(F.V(p[0], p[1]) - vm));
  walls(B, ring, 0, yAt, wallColor, G_BRICK);
  for (const s of [1, -1]) {
    const h = clipRing(ring, (p) => s * (F.V(p[0], p[1]) - vm));
    if (h.length >= 3) cap(B, h, yAt, roofColor, G_TILE);
  }
  return { yAt, ridge: eave + k * half, vm };
}

// Outward edges of a ring, with party walls flagged from the building's own
// edge list when available.
function edgesOf(ring, party) {
  const sign = ringArea(ring) >= 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < 0.05) continue;
    const e = { a, b, len, tx: dx / len, ty: dy / len, nx: sign * dy / len, ny: -sign * dx / len };
    e.party = party ? party(e) : false;
    out.push(e);
  }
  return out;
}
function partyTester(srcEdges) {
  if (!srcEdges || !srcEdges.length) return null;
  const partyE = srcEdges.filter((e) => e.party);
  if (!partyE.length) return () => false;
  return (e) => {
    const mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
    return partyE.some((p) => {
      const t = (mx - p.ax) * p.tx + (my - p.ay) * p.ty;
      if (t < -0.5 || t > p.len + 0.5) return false;
      return Math.abs((mx - p.ax) * p.nx + (my - p.ay) * p.ny) < 0.6;
    });
  };
}
// Box on an edge's outside face: t metres along it, `out` proud of the wall.
function ebox(B, e, t, y0, w, h, d, color, g, out = 0) {
  const off = out + d / 2;
  const x = e.a[0] + e.tx * t + e.nx * off, z = e.a[1] + e.ty * t + e.ny * off;
  obox(B, x, z, y0, w, d, h, Math.atan2(e.ty, e.tx), color, g);
}
// Pointed (lancet) or round-headed window: stone surround + glass, proud of
// the wall by >= 3 cm so nothing z-fights.
function archWindow(B, e, t, y0, w, h, { frame = C.stone, pointed = true, mullion = false, out = 0, arch = true } = {}) {
  ebox(B, e, t, y0 - 0.15, w + 0.36, h + 0.2, 0.06, frame, G_PLAIN, out + 0.02);
  ebox(B, e, t, y0, w, h, 0.06, C.glass, G_GLASS, out + 0.06);
  const rot = Math.atan2(e.ty, e.tx);
  const r = w / 2;
  const x = e.a[0] + e.tx * t + e.nx * (out + 0.09), z = e.a[1] + e.ty * t + e.ny * (out + 0.09);
  if (pointed) {
    const s = w * 0.7071;
    B.box(x, y0 + h, z, s + 0.25, s + 0.25, 0.06, frame, G_PLAIN, 0, -rot, Math.PI / 4);
    const x2 = e.a[0] + e.tx * t + e.nx * (out + 0.12), z2 = e.a[1] + e.ty * t + e.ny * (out + 0.12);
    B.box(x2, y0 + h, z2, s, s, 0.06, C.glass, G_GLASS, 0, -rot, Math.PI / 4);
  } else if (arch) {
    B.geo(new THREE.CylinderGeometry(r + 0.18, r + 0.18, 0.06, 4, 1, false, 0, Math.PI), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x, y0 + h, z), frame, G_PLAIN);
    const x2 = e.a[0] + e.tx * t + e.nx * (out + 0.12), z2 = e.a[1] + e.ty * t + e.ny * (out + 0.12);
    B.geo(new THREE.CylinderGeometry(r, r, 0.06, 4, 1, false, 0, Math.PI), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x2, y0 + h, z2), C.glass, G_GLASS);
  }
  if (mullion) ebox(B, e, t, y0, 0.12, h, 0.05, frame, G_PLAIN, out + 0.12);
}
// Evenly spaced positions along an edge, `margin` clear of both corners.
function slots(len, spacing, margin) {
  const n = Math.floor((len - margin * 2) / spacing);
  if (n <= 0) return [];
  const step = (len - margin * 2) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(margin + step * (i + 0.5));
  return out;
}
// a band sits a little into the wall: no face of it in the wall's plane
const BAND_SINK = 0.03;
function band(B, edges, y, h, d, color, g = G_PLAIN) {
  for (const e of edges) if (!e.party && e.len > 0.6) ebox(B, e, e.len / 2, y, e.len + 0.02, h, d + BAND_SINK, color, g, -BAND_SINK);
}

// --- churches -----------------------------------------------------------------------

function gothicChurch(B, ring, srcEdges, { eave, maxRise, pitch = 55, towerEnd = null, flecheAt = 0.55, towerSpec = null }) {
  const F = minAreaFrame(ring);
  const roof = polyGableRoof(B, ring, F, eave, maxRise, pitch, C.slate, C.brick);
  const edges = edgesOf(ring, partyTester(srcEdges));
  // plinth + string course
  band(B, edges, 0, 0.9, 0.08, C.sandstone);
  band(B, edges, eave - 0.6, 0.45, 0.14, C.sandstone);
  for (const e of edges) {
    if (e.party || e.len < 3.2) continue;
    const pos = slots(e.len, 6.2, 1.2);
    for (const t of pos) archWindow(B, e, t, 3.4, Math.min(2.4, e.len * 0.3), Math.max(3, eave - 7.2), { mullion: true });
    // buttresses at the bay divisions
    const bays = [0, ...pos.map((t, i) => (i + 1 < pos.length ? (t + pos[i + 1]) / 2 : null)).filter((t) => t != null), e.len];
    for (const t of bays) {
      if (t < 0.5 || t > e.len - 0.5) continue;
      ebox(B, e, t, 0, 1.0, eave - 2.5, 0.65, C.brickDark, G_BRICK, -0.3);
      ebox(B, e, t, eave - 2.5, 1.0, 1.2, 0.4, C.brickDark, G_BRICK, -0.3);
    }
  }
  if (flecheAt != null) {
    const [fx, fz] = F.P(F.u0 + (F.u1 - F.u0) * flecheAt, roof.vm);
    cyl(B, fx, roof.ridge - 1.5, fz, 1.1, 1.3, 4.5, 8, C.lead, G_METAL);
    cone(B, fx, roof.ridge + 3, fz, 1.35, 9, 8, C.slateDark, G_PLAIN);
    cyl(B, fx, roof.ridge + 11.6, fz, 0.1, 0.1, 1.6, 4, C.gold, G_METAL);
  }
  if (towerSpec) towerSpec(B, F, roof);
  return F;
}

function aKerkTower(B, F, roof) {
  // west end = the frame end with the smaller map x
  const west = F.P(F.u0, 0)[0] < F.P(F.u1, 0)[0] ? -1 : 1;
  const w = 9.2;
  const u = west < 0 ? F.u0 + w / 2 + 0.4 : F.u1 - w / 2 - 0.4;
  const [x, z] = F.P(u, roof.vm);
  const r = F.rot;
  const sq = (y, s, h, c, g) => obox(B, x, z, y, s, s, h, r, c, g);
  sq(0, w, 33, C.brick, G_BRICK);
  // sandstone corner pilasters and cornices
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [px, pz] = F.P(u + a * (w / 2 - 0.35), roof.vm + b * (w / 2 - 0.35));
    obox(B, px, pz, 0, 0.9, 0.9, 33.4, r, C.sandstone, G_PLAIN);
  }
  sq(12, w + 0.3, 0.5, C.sandstone, G_PLAIN);
  sq(24, w + 0.3, 0.5, C.sandstone, G_PLAIN);
  sq(33, w + 0.8, 0.8, C.sandstone, G_PLAIN);
  // louvred belfry openings + clock faces on all four sides
  for (let s = 0; s < 4; s++) {
    const ang = r + s * Math.PI / 2;
    const nx = Math.cos(ang - Math.PI / 2), nz = Math.sin(ang - Math.PI / 2);
    const tx = Math.cos(ang), tz = Math.sin(ang);
    const e = { a: [x + nx * w / 2 - tx * w / 2, z + nz * w / 2 - tz * w / 2], tx, ty: tz, nx, ny: nz };
    archWindow(B, e, w / 2 - 1.7, 26, 1.6, 4.6, { frame: C.sandstone, pointed: false });
    archWindow(B, e, w / 2 + 1.7, 26, 1.6, 4.6, { frame: C.sandstone, pointed: false });
    const cx = e.a[0] + tx * w / 2 + nx * 0.08, cz = e.a[1] + tz * w / 2 + nz * 0.08;
    B.geo(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 14), new THREE.Matrix4().makeRotationY(-ang).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(cx, 20.5, cz), C.white, G_PLAIN);
    B.geo(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 14), new THREE.Matrix4().makeRotationY(-ang).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(cx + nx * 0.03, 20.5, cz + nz * 0.03), C.dark, G_PLAIN);
  }
  // balustrade corner vases
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [px, pz] = F.P(u + a * (w / 2), roof.vm + b * (w / 2));
    cyl(B, px, 33.8, pz, 0.25, 0.4, 1.3, 6, C.sandstone, G_PLAIN);
  }
  // octagonal lantern stages (painted wood + lead), bell cupola, spire
  cyl(B, x, 33.8, z, 3.6, 3.9, 8.5, 8, C.lead, G_METAL, r);
  cyl(B, x, 42.3, z, 3.9, 3.9, 0.7, 8, C.white, G_PLAIN, r);
  cyl(B, x, 43, z, 2.5, 2.8, 7, 8, C.lead, G_METAL, r);
  cyl(B, x, 50, z, 2.9, 2.9, 0.6, 8, C.white, G_PLAIN, r);
  prism(B, new THREE.SphereGeometry(2.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), x, 50.6, z, r, C.copper, G_METAL);
  cyl(B, x, 53, z, 1.1, 1.3, 4.2, 8, C.lead, G_METAL, r);
  prism(B, new THREE.SphereGeometry(1.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), x, 57.2, z, r, C.copper, G_METAL);
  cone(B, x, 58.4, z, 0.9, 13, 8, C.copper, G_METAL, r);
  B.box(x, 72.3, z, 0.5, 0.5, 0.5, C.gold, G_METAL);
  cyl(B, x, 71.4, z, 0.08, 0.08, 4, 4, C.gold, G_METAL);
  B.box(x, 74.2, z, 1.4, 0.7, 0.12, C.gold, G_METAL, 0, -r, 0);
}

// --- Groninger Museum ---------------------------------------------------------------

// Ring pushed outward by ~d (centroid scaling; fine for the convex parts used).
function grown(ring, d) {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const r = ring.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / ring.length || 1;
  const k = 1 + d / r;
  return ring.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

// On (or inside) one of `rings`: an edge there is a shared wall, drawn once.
function onRings(rings, x, y) {
  for (const r of rings) {
    if (!r) continue;
    if (pointInPolygon(x, y, r)) return true;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], c = r[(i + 1) % r.length];
      if (closestPointOnSegment(x, y, a[0], a[1], c[0], c[1]).dist2 < 0.04) return true;
    }
  }
  return false;
}

const PROUST = [0xe0483e, 0x2f7fc1, 0xf2c23a, 0x3fa65a, 0x8a4fb0, 0xf08a3c, 0x1f3d7a, 0xe86fa0];
function groningerMuseum(B, b) {
  const byPart = Object.fromEntries((b.parts || []).map((p) => [p.part, p.pts]));
  const base = -0.6;
  // walls a block shares with a taller block (the entrance building runs
  // under the wings and the tower, the bridge ends at their facades) are left
  // to the taller one: two coplanar walls z-fight
  const hiddenBy = {
    entrance: ['wingN', 'wingS', 'tower'],
    bridge: ['tower', 'mendini'],
  };
  const blk = (name, y0, y1, color, g = G_PLAIN, capColor = color) => {
    const r = byPart[name];
    if (!r) return r;
    const over = (hiddenBy[name] || []).map((n) => byPart[n]);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], c = r[(i + 1) % r.length];
      if (over.length && onRings(over, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2)) continue;
      B.quad(W(a[0], y0, a[1]), W(c[0], y0, c[1]), W(c[0], y1, c[1]), W(a[0], y1, a[1]), color, g);
    }
    cap(B, r, () => y1, capColor, G_PLAIN);
    return r;
  };
  // De Lucchi pavilion: red brick cube; Starck's aluminium disc on top
  blk('lucci', base, 6, C.brick, G_BRICK, 0x9a8f86);
  const st = blk('starck', 6, 13.5, 0xc7ccd0, G_METAL, 0xb9bec2);
  if (st) {
    walls(B, grown(st, 0.08), 9.4, () => 10.6, C.glassLight, G_GLASS);
  }
  // Mendini's entrance building and bridge, pastel laminate
  blk('entrance', base, 5, 0xd88f7e, G_PLAIN, 0x9e928a);
  blk('bridge', base, 4.4, 0xb9bdbf, G_PLAIN, 0x8f9496);
  blk('wingN', base, 11.5, 0xe6d27a, G_PLAIN, 0xa39c8e);
  blk('wingS', base, 11.5, 0x86a9c4, G_PLAIN, 0xa39c8e);
  // the gold tower
  const tw = blk('tower', base, 30, C.gold, G_METAL, 0xb88f38);
  if (tw) {
    // Mendini's depot tower: closed, clad in gold laminate panels; the seams
    // between them as a slightly darker gold grid, a rim on top
    const e = edgesOf(tw);
    for (const ed of e) {
      if (ed.len <= 3) continue;
      ebox(B, ed, ed.len / 2, 30, ed.len + 0.1, 0.6, 0.35, 0xe8c25a, G_METAL, -0.05);
      for (let y = 2.5; y < 29.5; y += 2.7) ebox(B, ed, ed.len / 2, y, ed.len, 0.1, 0.04, 0xb88f38, G_METAL, 0.01);
      for (const t of slots(ed.len, 2.4, 0)) ebox(B, ed, t - ed.len / slots(ed.len, 2.4, 0).length / 2, base, 0.1, 30 - base, 0.04, 0xb88f38, G_METAL, 0.01);
    }
  }
  // Mendini's east pavilion with Coop Himmelb(l)au's shards on top
  const me = blk('mendini', base, 8, 0xe5b3ae, G_PLAIN, 0x9e9690);
  if (me) {
    for (const ed of edgesOf(me)) {
      if (ed.len <= 4) continue;
      ebox(B, ed, ed.len / 2, 5.4, ed.len - 1, 1.1, 0.05, 0x7fb3a0, G_PLAIN, 0.03);
      // the "Proust" motif: Mendini's pointillist dots in many colours
      const n = Math.floor(ed.len / 1.6);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
          const h = (Math.sin(i * 12.99 + k * 78.23 + ed.a[0]) * 43758.5) % 1;
          const c = PROUST[Math.floor(Math.abs(h) * PROUST.length)];
          ebox(B, ed, (i + 0.5) * ed.len / n + (Math.abs(h) - 0.5) * 0.5, 0.6 + k * 1.5 + Math.abs(h) * 0.5, 0.55, 0.55, 0.04, c, G_PLAIN, 0.03);
        }
      }
    }
  }
  const co = byPart.coop;
  if (co) {
    const F = minAreaFrame(co);
    const cu = (F.u0 + F.u1) / 2, cv = (F.v0 + F.v1) / 2, lu = F.u1 - F.u0, lv = F.v1 - F.v0;
    const inside = (u, v) => { const [x, y] = F.P(u, v); return pointInPolygon(x, y, co); };
    // chaotic steel/glass plates, leaning every which way
    const shards = [
      [-0.28, -0.2, 18, 11, 7.0, 0.16, -0.1, 0.22, 0x6f777c, G_METAL],
      [0.18, 0.18, 20, 9, 8.2, -0.12, 0.2, -0.18, 0x7d868a, G_METAL],
      [0.05, -0.28, 14, 1.2, 12.5, 0.35, 0.1, 0.05, 0x5d6a70, G_METAL],
      [-0.12, 0.3, 22, 1.0, 11, -0.08, -0.3, 0.12, 0x4f5c62, G_GLASS],
      [0.32, -0.05, 9, 7, 10.8, 0.25, 0.05, -0.35, 0x7a8285, G_METAL],
      [-0.35, 0.12, 10, 8, 9.8, -0.28, 0.4, 0.1, 0x3f4a50, G_GLASS],
    ];
    for (const [du, dv, su, sv, y, rx, ry, rz, col, g] of shards) {
      const u = cu + du * lu, v = cv + dv * lv;
      if (!inside(u, v)) continue;
      const [x, z] = F.P(u, v);
      B.box(x, y, z, su, 1.1, sv, col, g, rx, -F.rot + ry, rz);
    }
    // the steel deck sits on the Mendini pavilion (the coop outline sticks out over the water)
    if (me) extrude(B, grown(me, 0.35), 8, 8.6, 0x5d666b, G_METAL, 0x6a7277, G_PLAIN);
    const [x, z] = F.P(cu + 0.1 * lu, cv);
    B.box(x, 12.8, z, 3, 9.5, 0.9, 0x39434a, G_GLASS, 0.35, -F.rot + 0.6, -0.2);
  }
  // glazing bands on the pastel blocks
  for (const name of ['wingN', 'wingS', 'entrance']) {
    const r = byPart[name];
    if (!r) continue;
    const top = name === 'entrance' ? 5 : 11.5;
    const over = (hiddenBy[name] || []).map((n) => byPart[n]);
    for (const ed of edgesOf(r)) {
      if (ed.len <= 5 || (over.length && onRings(over, (ed.a[0] + ed.b[0]) / 2, (ed.a[1] + ed.b[1]) / 2))) continue;
      ebox(B, ed, ed.len / 2, top - 2.2, ed.len - 1.6, 1.0, 0.05, C.glass, G_GLASS, 0.03);
      // laminate panel joints
      const seam = name === 'wingN' ? 0xc9b25c : name === 'wingS' ? 0x6f8fa8 : 0xb97565;
      for (const t of slots(ed.len, 2.4, 0.4)) ebox(B, ed, t, base, 0.08, top - 2.3 - base, 0.03, seam, G_PLAIN, 0.01);
      ebox(B, ed, ed.len / 2, top - 0.6, ed.len, 0.25, 0.08, seam, G_PLAIN, 0.01);
    }
  }
  // the atrium the cycle bridge runs through (no pavilion of its own in OSM)
  // and the entrance gang: a flat glass-edged roof over the interior rooms
  for (const id of ['atrium', 'atriumW', 'gang']) {
    const rm = MUSEUM_ROOMS.find((q) => q.id === id);
    if (!rm) continue;
    const ring = rectCorners(rm);
    const top = rm.h + (id === 'atriumW' ? 0.4 : 0.45);
    extrude(B, ring, rm.h + 0.03, top, 0xd9d2c4, G_PLAIN, 0x9aa3a8, G_PLAIN);
    walls(B, grown(ring, 0.04), rm.h + 0.12, () => top - 0.08, C.glassLight, G_GLASS);
  }
}

// --- Forum Groningen ----------------------------------------------------------------

function forum(B, ring, srcEdges) {
  const F = minAreaFrame(ring);
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const top = 45;
  // the facade breaks into slanted facets at a different height at every
  // corner, and the crown leans in hardest at the west end
  const kink = ring.map(([x, y], i) => 20 + ((Math.sin(i * 12.9898 + x * 0.07) * 43758.5453) % 1 + 1) % 1 * 16);
  const pull = ring.map(([x, y]) => {
    const u = (F.U(x, y) - F.u0) / (F.u1 - F.u0);
    const k = u < 0.18 ? 0.36 : u > 0.85 ? 0.2 : 0.09;
    return [x + (cx - x) * k, y + (cy - y) * k];
  });
  const straight = Math.min(...kink);
  const stone = 0xd3cabb, stoneShade = 0xbdb3a4;
  const sg = ringArea(ring) >= 0 ? 1 : -1;
  walls(B, ring, 0, (p) => kink[ring.indexOf(p)], stone, G_PLAIN);
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const a = ring[i], b = ring[j], c = pull[j], d = pull[i];
    const A = W(a[0], kink[i], a[1]), Bq = W(b[0], kink[j], b[1]), Cq = W(c[0], top, c[1]), D = W(d[0], top, d[1]);
    B.tri(A, Bq, Cq, i % 2 ? stone : stoneShade, G_PLAIN);
    B.tri(A, Cq, D, i % 2 ? stoneShade : 0xc8bfb0, G_PLAIN);
    // glazed slash across each slanted facet
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > 6) {
      const m = (p, q, t) => p.map((v, k) => v + (q[k] - v) * t);
      const ox = (sg * (b[1] - a[1]) / len) * 0.12, oz = (-sg * (b[0] - a[0]) / len) * 0.12;
      const sh = (p) => [p[0] + ox, p[1] + 0.05, p[2] + oz];
      B.quad(sh(m(A, D, 0.3)), sh(m(Bq, Cq, 0.5)), sh(m(Bq, Cq, 0.62)), sh(m(A, D, 0.42)), C.glassLight, G_GLASS);
    }
  }
  cap(B, pull, () => top, 0x8a7a66, G_PLAIN); // roof terrace deck
  const edges = edgesOf(ring, partyTester(srcEdges));
  // vertical glazed slits of irregular width, the Forum's facade rhythm
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const e of edges) {
    if (e.len < 4) continue;
    let t = 1.5;
    while (t < e.len - 1.5) {
      const w = 0.8 + rnd() * 1.6;
      const y0 = 4.9 + Math.floor(rnd() * 3) * 3.6;
      const h = Math.min(straight - 1.2 - y0, 6 + rnd() * 14);
      if (t + w / 2 < e.len - 1.2) ebox(B, e, t, y0, w, h, 0.06, C.glass, G_GLASS, 0.03);
      t += w + 1.0 + rnd() * 1.8;
    }
    // ground floor: glass plinth with a dark soffit
    if (!e.party) {
      ebox(B, e, e.len / 2, 0, e.len - 1, 4.2, 0.06, C.glassLight, G_GLASS, 0.03);
      ebox(B, e, e.len / 2, 4.2, e.len - 0.6, 0.5, 0.12, 0x6e6860, G_PLAIN, 0.03);
    }
  }
  // big diagonal glass cut on the long south facade
  let south = null;
  for (const e of edges) if (!e.party && e.len > 15 && e.ny > 0.5 && (!south || e.len > south.len)) south = e;
  if (south) {
    const o = 0.14, P = (t, y) => [south.a[0] + south.tx * t + south.nx * o, y, south.a[1] + south.ty * t + south.ny * o];
    const L = south.len;
    B.quad(P(L * 0.18, 4.7), P(L * 0.34, 4.7), P(L * 0.62, straight - 0.6), P(L * 0.46, straight - 0.6), C.glassLight, G_GLASS);
  }
  // roof terrace: glass balustrade, planters, the rooftop pavilion
  for (const e of edgesOf(pull)) if (e.len > 2) ebox(B, e, e.len / 2, top, e.len - 0.4, 1.2, 0.08, 0x9fb7c0, G_GLASS, -0.6);
  const pcx = (F.u0 + F.u1) / 2, pcv = (F.v0 + F.v1) / 2;
  fbox(B, F, pcx + 4, pcv, top, 22, 10, 4.2, 0x3a4248, G_GLASS);
  fbox(B, F, pcx + 4, pcv, top + 4.2, 23, 11, 0.5, stone, G_PLAIN);
  for (const du of [-14, -9, 16]) fbox(B, F, pcx + du, pcv + 3, top, 3, 1.4, 0.8, 0x5b7d45, G_PLAIN);
}

// --- Hoofdstation ---------------------------------------------------------------------

function hoofdstation(B, ring) {
  // frame along the straight platform-side (south) wall
  let sEdge = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!sEdge || L > sEdge.L) sEdge = { a, b, L };
  }
  let ux = (sEdge.b[0] - sEdge.a[0]) / sEdge.L, uy = (sEdge.b[1] - sEdge.a[1]) / sEdge.L;
  if (ux < 0) { ux = -ux; uy = -uy; }
  const F = frameFrom(ux, uy, ring);
  const vBack = F.v1 - 0.15; // south wall (map y grows south)
  const vAt = (x, y) => F.V(x, y);
  const base = 10.5;
  walls(B, ring, 0, () => base, C.brick, G_BRICK);
  cap(B, ring, () => base, 0x5b5f63, G_PLAIN);
  const edges = edgesOf(ring);
  band(B, edges, 0, 1.0, 0.1, C.sandstone);
  band(B, edges, 4.6, 0.45, 0.1, C.stone);
  band(B, edges, base - 0.7, 0.7, 0.18, C.stone);
  // arched windows on all long outward faces
  for (const e of edges) {
    if (e.len < 3) continue;
    for (const t of slots(e.len, 3.4, 0.9)) {
      archWindow(B, e, t, 1.3, 1.5, 2.3, { pointed: false, frame: C.stone });
      archWindow(B, e, t, 5.7, 1.3, 2.2, { pointed: false, frame: C.stone });
    }
  }
  // blocks: [front-west corner, front-east corner (north face), eave, roof]
  const blocks = [
    [[-105.04, 948.69], [-88, 948.41], 14.5, 'pav'],
    [[-87.72, 953.34], [-64.06, 952.95], 12.5, 'wing'],
    [[-64.17, 946.41], [-30.7, 945.86], 16, 'hall'],
    [[-57.91, 942.88], [-37.57, 942.55], 18.5, 'front'],
    [[-30.04, 949.27], [-7.09, 948.9], 12.5, 'wing'],
    [[-6.9, 942.05], [9.84, 941.78], 14.5, 'pav'],
  ];
  for (const [[ax, ay], [bx, by], eave, kind] of blocks) {
    const u0 = F.U(ax, ay), u1 = F.U(bx, by);
    const v0 = vAt((ax + bx) / 2, (ay + by) / 2) + 0.06;
    const v1 = kind === 'front' ? v0 + 8 : vBack - 0.06;
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    fbox(B, F, um, vm, 0, u1 - u0, v1 - v0, eave, C.brick, G_BRICK);
    fbox(B, F, um, vm, eave - 0.8, u1 - u0 + 0.35, v1 - v0 + 0.35, 0.83, C.stone, G_PLAIN);
    // front face windows above the base (blocks taller than the base)
    const e = { a: F.P(u0, v0), tx: F.ux, ty: F.uy, nx: F.uy, ny: -F.ux, len: u1 - u0 };
    if (eave > base + 2 && kind !== 'front') {
      for (const t of slots(u1 - u0, 3.2, 1.2)) archWindow(B, e, t, base + 0.4, 1.2, eave - base - 2.4, { pointed: false });
    }
    const M = alongU(F);
    if (kind === 'wing') {
      roofRect(B, M, u0, u1, v0, v1, eave, 5.5, C.slate, G_TILE, { oh: 0.4 });
      for (const t of slots(u1 - u0, 5, 2)) {
        fbox(B, F, u0 + t, v0 + 1.6, eave, 1.6, 1.8, 2.4, C.stone, G_PLAIN);
        roofRect(B, alongV(F), v0 + 0.8, v0 + 2.6, u0 + t - 1, u0 + t + 1, eave + 2.4, 1.1, C.slate, G_TILE, { oh: 0.1 });
      }
    } else if (kind === 'pav') {
      roofRect(B, M, u0, u1, v0, v1, eave, 9, C.slate, G_TILE, { hip: 1, oh: 0.4 });
      const [x, z] = F.P(um, vm);
      cyl(B, x, eave + 8.3, z, 0.12, 0.12, 3, 4, C.lead, G_METAL);
      // ornamented dormer gable on the square side
      fbox(B, F, um, v0 + 0.5, eave, 6, 1.0, 3.5, C.brick, G_BRICK);
      roofRect(B, alongV(F), v0, v0 + 2, um - 3.3, um + 3.3, eave + 3.5, 2.4, C.stone, G_PLAIN, { oh: 0.05 });
    } else if (kind === 'hall') {
      roofRect(B, M, u0, u1, v0, v1, eave, 9.5, C.slate, G_TILE, { hip: 0.9, oh: 0.4 });
      const [x, z] = F.P(um, vm);
      obox(B, x, z, eave + 9, 2.6, 2.6, 3, F.rot, C.lead, G_METAL);
      cone(B, x, eave + 12, z, 2.0, 6, 4, C.slateDark, G_PLAIN, F.rot + Math.PI / 4);
    } else if (kind === 'front') {
      // tall gabled front of the central hall, facing the Stationsplein
      roofRect(B, alongV(F), v0, v1, u0, u1, eave, 7.5, C.slate, G_TILE, { oh: 0.3, gable: C.brick });
      const g = { a: F.P(u0, v0), tx: F.ux, ty: F.uy, nx: F.uy, ny: -F.ux, len: u1 - u0 };
      archWindow(B, g, (u1 - u0) / 2, base + 0.3, 8.5, 5.2, { pointed: false, frame: C.stone, mullion: true });
      const [cx, cz] = F.P(um, v0 - 0.12);
      B.geo(new THREE.CylinderGeometry(1.4, 1.4, 0.14, 16), new THREE.Matrix4().makeRotationY(-F.rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(cx, eave + 3.2, cz), C.white, G_PLAIN);
      B.geo(new THREE.CylinderGeometry(1.0, 1.0, 0.16, 16), new THREE.Matrix4().makeRotationY(-F.rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(cx, eave + 3.2, cz - 0.02 * F.ux), C.dark, G_PLAIN);
      // entrance arches
      for (const t of [0.3, 0.5, 0.7]) {
        ebox(B, g, (u1 - u0) * t, 0, 3.2, 4.2, 0.06, C.door, G_GLASS, 0.16);
        ebox(B, g, (u1 - u0) * t, 4.2, 3.8, 0.5, 0.1, C.stone, G_PLAIN, 0.16);
      }
      // corner turrets with spires
      for (const u of [u0 + 0.9, u1 - 0.9]) {
        const [x, z] = F.P(u, v0 + 0.9);
        cyl(B, x, eave, z, 1.3, 1.3, 5.5, 8, C.stone, G_PLAIN, F.rot);
        cone(B, x, eave + 5.5, z, 1.6, 6.5, 8, C.slateDark, G_PLAIN, F.rot);
        cyl(B, x, eave + 12, z, 0.07, 0.07, 1.5, 4, C.gold, G_METAL);
      }
    }
  }
  // entrance canopy on the square side
  const [gx, gy] = [-47.59, 942.71];
  const [ex, ez] = F.P(F.U(gx, gy), vAt(gx, gy) - 2.2);
  obox(B, ex, ez, 4.8, 16, 4.2, 0.35, F.rot, C.charcoal, G_METAL);
}

// --- Academiegebouw ---------------------------------------------------------------

// Steep roof band round a (possibly concave) footprint: every open edge gets
// a sloped strip + inner face, convex corners are closed with hip triangles.
function roofRim(B, edges, eave, depth, rise, color) {
  const n = edges.length;
  const top = (e, t) => [e.a[0] + e.tx * t - e.nx * depth, eave + rise, e.a[1] + e.ty * t - e.ny * depth];
  for (let i = 0; i < n; i++) {
    const e = edges[i];
    if (e.len < 0.4) continue;
    const a = W(e.a[0] + e.nx * 0.3, eave - 0.2, e.a[1] + e.ny * 0.3), b = W(e.b[0] + e.nx * 0.3, eave - 0.2, e.b[1] + e.ny * 0.3);
    const ta = top(e, 0), tb = top(e, e.len);
    B.quad(a, b, tb, ta, color, G_TILE);
    B.quad(ta, tb, [tb[0], eave, tb[2]], [ta[0], eave, ta[2]], color, G_TILE);
    const nx = edges[(i + 1) % n];
    const cross = e.tx * nx.ty - e.ty * nx.tx;
    const convex = cross * (e.nx * -e.ty + e.ny * e.tx) < 0;
    if (convex) B.tri(W(e.b[0] + e.nx * 0.3, eave - 0.2, e.b[1] + e.ny * 0.3), tb, top(nx, 0), color, G_TILE);
  }
}

function academiegebouw(B, ring, srcEdges) {
  const eave = 15.5;
  const edges = edgesOf(ring, partyTester(srcEdges));
  walls(B, ring, 0, () => eave, C.brickBrown, G_BRICK);
  cap(B, ring, () => eave, 0x585c60, G_PLAIN);
  band(B, edges, 0, 1.3, 0.1, C.sandstone);
  band(B, edges, 5.2, 0.45, 0.1, C.sandstone);
  band(B, edges, 10.2, 0.45, 0.1, C.sandstone);
  band(B, edges, eave - 0.9, 0.9, 0.18, C.sandstone); // 2 cm achter het voorvlak van de middenrisaliet (0,2), niet gelijk (#382)
  for (const e of edges) {
    if (e.party || e.len < 2.6) continue;
    for (const t of slots(e.len, 3.3, 0.8)) {
      archWindow(B, e, t, 1.8, 1.4, 2.8, { pointed: false, frame: C.sandstone, mullion: true });
      archWindow(B, e, t, 6.2, 1.4, 3.0, { pointed: false, frame: C.sandstone });
      archWindow(B, e, t, 11.1, 1.3, 2.4, { pointed: false, frame: C.sandstone, arch: false });
    }
  }
  roofRim(B, edges, eave, 4.2, 5.8, C.slate);
  // main front: the longest open edge gets the tall ornamented central bay
  let main = null;
  for (const e of edges) if (!e.party && (!main || e.len > main.len)) main = e;
  if (!main) return;
  const t = main.len / 2, w = Math.min(15, main.len * 0.4);
  ebox(B, main, t, 0, w, eave + 3, 1.3, C.brickBrown, G_BRICK, -1.1);
  const steps = [[w, 3.2], [w * 0.78, 3], [w * 0.56, 2.8], [w * 0.34, 2.6]];
  let y = eave + 3;
  for (const [sw, sh] of steps) {
    ebox(B, main, t, y, sw, sh, 1.2, C.brickBrown, G_BRICK, -1.05);
    ebox(B, main, t, y + sh - 0.35, sw + 0.35, 0.38, 1.35, C.sandstone, G_PLAIN, -1.1);
    for (const s of [-1, 1]) {
      const px = main.a[0] + main.tx * (t + s * sw / 2) - main.nx * 0.45, pz = main.a[1] + main.ty * (t + s * sw / 2) - main.ny * 0.45;
      cone(B, px, y + sh, pz, 0.35, 1.8, 4, C.sandstone, G_PLAIN);
    }
    y += sh;
  }
  archWindow(B, main, t, 5.2, 3.6, 6.4, { pointed: false, frame: C.sandstone, mullion: true, out: 0.2 });
  archWindow(B, main, t, eave + 1.2, 2.4, 3.6, { pointed: false, frame: C.sandstone, mullion: true, out: 0.2 });
  for (const s of [-1, 1]) archWindow(B, main, t + s * w * 0.3, 5.6, 1.4, 3.2, { pointed: false, frame: C.sandstone, out: 0.2 });
  ebox(B, main, t, 0, 3.4, 4.2, 0.06, C.door, G_GLASS, 0.22);
  ebox(B, main, t, 4.2, 4.2, 0.6, 0.12, C.sandstone, G_PLAIN, 0.22);
  // slender clock turret (dakruiter) behind the gable
  const px = main.a[0] + main.tx * t - main.nx * 6, pz = main.a[1] + main.ty * t - main.ny * 6;
  const rot = Math.atan2(main.ty, main.tx);
  obox(B, px, pz, eave, 3.4, 3.4, 9.5, rot, C.brickBrown, G_BRICK);
  obox(B, px, pz, eave + 9.5, 3.8, 3.8, 0.5, rot, C.sandstone, G_PLAIN);
  cyl(B, px, eave + 10, pz, 1.4, 1.6, 3.2, 8, C.copper, G_METAL);
  prism(B, new THREE.SphereGeometry(1.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), px, eave + 13.2, pz, 0, C.copper, G_METAL);
  cone(B, px, eave + 14.4, pz, 0.6, 5, 8, C.copper, G_METAL);
  cyl(B, px, eave + 19.2, pz, 0.06, 0.06, 1.5, 4, C.gold, G_METAL);
}

// --- Goudkantoor -------------------------------------------------------------------

// Two storeys of red brick with sandstone bands and cross windows with
// shutters; the long east front carries three ornamental topgevels with
// volutes (the third, from Huis Panser, added 1964), the roof ridge runs
// along the front.
function goudkantoor(B, ring, srcEdges) {
  const edges = edgesOf(ring, partyTester(srcEdges));
  let main = null;
  for (const e of edges) if (!e.party && e.len > 4 && (!main || e.nx * e.len > main.nx * main.len)) main = e;
  if (!main) main = edges.reduce((m, e) => (e.len > m.len ? e : m));
  const F = frameFrom(main.tx, main.ty, ring);
  const eave = 8.4, rise = 6.2;
  walls(B, ring, 0, () => eave, C.brick, G_BRICK);
  const u0 = F.u0 + 0.1, u1 = F.u1 - 0.1, v0 = F.v0 + 0.1, v1 = F.v1 - 0.1;
  roofRect(B, alongU(F), u0, u1, v0, v1, eave, rise, C.slateDark, G_TILE, { oh: 0.3, gable: C.brick });
  band(B, edges, 0, 0.8, 0.1, C.sandstone);
  band(B, edges, 4.2, 0.35, 0.1, C.sandstone);
  band(B, edges, eave - 0.4, 0.4, 0.16, C.sandstone);
  for (const e of edges) {
    if (e.party || e.len < 3) continue;
    for (const [i, t] of slots(e.len, 2.6, 0.7).entries()) {
      for (const y0 of [1.4, 5.1]) {
        ebox(B, e, t, y0 - 0.12, 1.5, 2.9, 0.06, C.sandstone, G_PLAIN, 0.02);
        ebox(B, e, t, y0, 1.2, 2.65, 0.06, C.glass, G_GLASS, 0.06);
        ebox(B, e, t, y0 + 1.6, 1.2, 0.12, 0.05, C.sandstone, G_PLAIN, 0.12);
        ebox(B, e, t, y0, 0.1, 2.65, 0.05, C.sandstone, G_PLAIN, 0.12);
        for (const s of [-1, 1]) ebox(B, e, t + s * 0.95, y0 + 0.1, 0.55, 2.4, 0.06, i % 2 ? 0xc0392b : 0x2f6b4a, G_PLAIN, 0.04);
        // shell ornament in the arch field over the window
        const x = e.a[0] + e.tx * t + e.nx * 0.05, z = e.a[1] + e.ty * t + e.ny * 0.05;
        B.geo(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 6, 1, false, 0, Math.PI), new THREE.Matrix4().makeRotationY(-Math.atan2(e.ty, e.tx)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x, y0 + 2.8, z), C.gold, G_PLAIN);
      }
    }
  }
  // three topgevels on the front: brick with stone bands, volute shoulders,
  // a round top with a gilded finial; a small roof runs back to the ridge
  const n = 3, gw = Math.min(4.2, (main.len - 1.2) / n - 0.5);
  const rot = Math.atan2(main.ty, main.tx);
  const P = (s, off, y) => W(main.a[0] + main.tx * s - main.nx * off, y, main.a[1] + main.ty * s - main.ny * off);
  for (let k = 0; k < n; k++) {
    const s = main.len * (k + 0.5) / n;
    const y1 = eave + 1.8, y2 = y1 + 1.9;
    ebox(B, main, s, eave, gw, 1.8, 0.45, C.brick, G_BRICK, -0.45);
    ebox(B, main, s, y1 - 0.2, gw + 0.2, 0.22, 0.55, C.sandstone, G_PLAIN, -0.5);
    ebox(B, main, s, y1, gw * 0.5, 1.9, 0.45, C.brick, G_BRICK, -0.45);
    ebox(B, main, s, y2 - 0.2, gw * 0.5 + 0.2, 0.22, 0.55, C.sandstone, G_PLAIN, -0.5);
    for (const sg of [-1, 1]) {
      const a = P(s + sg * gw / 2, 0, y1), b = P(s + sg * gw * 0.25, 0, y1), c = P(s + sg * gw * 0.25, 0, y1 + 1.5);
      const a2 = P(s + sg * gw / 2, 0.45, y1), b2 = P(s + sg * gw * 0.25, 0.45, y1), c2 = P(s + sg * gw * 0.25, 0.45, y1 + 1.5);
      B.tri(a, b, c, C.sandstone, G_PLAIN); B.tri(a2, c2, b2, C.sandstone, G_PLAIN);
      B.quad(a, c, c2, a2, C.sandstone, G_PLAIN);
      const p = P(s + sg * gw / 2, 0.22, 0);
      cone(B, p[0], y1, p[2], 0.16, 0.8, 4, C.sandstone, G_PLAIN);
    }
    const [x, , z] = P(s, 0.22, 0);
    B.geo(new THREE.CylinderGeometry(gw * 0.25, gw * 0.25, 0.45, 8, 1, false, 0, Math.PI), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x, y2, z), C.sandstone, G_PLAIN);
    cone(B, x, y2 + gw * 0.25, z, 0.14, 1.0, 4, C.gold, G_METAL);
    B.box(x, y2 + gw * 0.25 + 1.05, z, 0.3, 0.3, 0.3, C.gold, G_METAL);
    const [ox, , oz] = P(s, -0.02, 0);
    B.geo(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(ox, y1 + 0.9, oz), 0x2c4f8a, G_PLAIN);
    ebox(B, main, s, eave + 0.4, 1.0, 1.1, 0.06, C.glass, G_GLASS, 0.0);
    // dormer roof from the topgevel back into the main slope
    const back = Math.min((F.v1 - F.v0) / 2, 4.5);
    const yR = y1 + 0.6;
    const L = P(s - gw / 2 + 0.1, 0.45, eave + 0.6), R = P(s + gw / 2 - 0.1, 0.45, eave + 0.6), T = P(s, 0.45, yR);
    const Lb = P(s - gw / 2 + 0.1, back, eave + 0.6), Rb = P(s + gw / 2 - 0.1, back, eave + 0.6), Tb = P(s, back, yR);
    B.quad(L, Lb, Tb, T, C.slateDark, G_TILE);
    B.quad(Rb, R, T, Tb, C.slateDark, G_TILE);
  }
}

// --- Euroborg ---------------------------------------------------------------------

function euroborgStand(B, b, ring) {
  const pitch = b.pitch;
  if (!pitch) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pitch) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const dPitch = (p) => Math.max(x0 - p[0], p[0] - x1, y0 - p[1], p[1] - y1, 0);
  const inner = 5, depth = 25;
  const k = (p) => Math.max(0, Math.min(1, (dPitch(p) - inner) / (depth - 1)));
  const tierY = (p) => 1.2 + 15.5 * k(p);
  const facadeH = 21, roofY = 23.5;
  // seating bowl
  walls(B, ring, 0, tierY, C.charcoal, G_PLAIN);
  cap(B, ring, tierY, C.greenSeat, G_PLAIN);
  const edges = edgesOf(ring);
  const innerE = edges.filter((e) => k(e.a) < 0.05 && k(e.b) < 0.05);
  const outerE = edges.filter((e) => k(e.a) > 0.95 && k(e.b) > 0.95);
  // white seat stripes (rows) parallel to the pitch side
  for (const ie of innerE) {
    for (let r = 1; r < 9; r++) {
      const d = r * (depth - 1) / 9;
      const f = d / (depth - 1);
      const o = -d;
      const y = 1.2 + 15.5 * f + 0.05;
      const shrink = 0;
      const P = (t) => [ie.a[0] + ie.tx * t + ie.nx * o, y, ie.a[1] + ie.ty * t + ie.ny * o];
      const t0 = -shrink, t1 = ie.len + shrink;
      const A = P(t0), Bp = P(t1);
      const A2 = [A[0] - ie.nx * 0.5, y + 0.34, A[2] - ie.ny * 0.5], B2 = [Bp[0] - ie.nx * 0.5, y + 0.34, Bp[2] - ie.ny * 0.5];
      B.quad(A, Bp, B2, A2, r === 5 ? C.white : 0x246b3a, G_PLAIN);
    }
    // pitch-side advertising boards
    ebox(B, ie, ie.len / 2, 0.1, ie.len - 2, 1.0, 0.08, 0x1f2a2e, G_PLAIN, 0.03);
  }
  // outer facade: dark panels, glazed band, green club stripe
  for (const e of outerE) {
    ebox(B, e, e.len / 2, 0, e.len + 0.3, facadeH, 0.8, 0x44494e, G_PLAIN, -0.75);
    ebox(B, e, e.len / 2, 3, e.len - 1, 4.2, 0.06, C.glass, G_GLASS, 0.03);
    ebox(B, e, e.len / 2, 13, e.len - 1, 1.4, 0.06, C.green, G_PLAIN, 0.03);
    for (const t of slots(e.len, 7.5, 1)) ebox(B, e, t, 0, 0.5, facadeH + 0.5, 0.3, C.steel, G_METAL, 0.03);
  }
  // cantilevered roof: stand ring with the pitch-side edge pushed 4 m out
  // over the touchline, so the four stands' roofs join into one ring
  const push = (p) => {
    if (k(p) > 0.05) return p;
    const nx = Math.max(x0, Math.min(x1, p[0])), ny = Math.max(y0, Math.min(y1, p[1]));
    const d = Math.hypot(nx - p[0], ny - p[1]) || 1;
    return [p[0] + (nx - p[0]) / d * 4, p[1] + (ny - p[1]) / d * 4];
  };
  const roofRing = ring.map(push);
  cap(B, roofRing, (p) => roofY - 0.6 + Math.min(1, Math.max(0, (dPitch(p) - 1) / 29)), 0xd9dedf, G_METAL);
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    if (k(ring[i]) > 0.05 || k(ring[j]) > 0.05) continue;
    const a = roofRing[i], c = roofRing[j];
    B.quad(W(a[0], roofY - 1.6, a[1]), W(c[0], roofY - 1.6, c[1]), W(c[0], roofY - 0.6, c[1]), W(a[0], roofY - 0.6, a[1]), 0xeef0f0, G_PLAIN);
  }
  for (const e of outerE) {
    const P = (t, o, y) => [e.a[0] + e.tx * t - e.nx * o, y, e.a[1] + e.ty * t - e.ny * o];
    if (e.len < 20) continue;
    const reach = depth + 4;
    for (const t of slots(e.len, 7.5, 1)) {
      const a = P(t, 0.4, facadeH), c = P(t, reach * 0.55, roofY + 3.2), d = P(t, reach, roofY - 0.6);
      B.geo(tube(a, c, 0.22), null, C.white, G_METAL);
      B.geo(tube(c, d, 0.18), null, C.white, G_METAL);
    }
  }
}
function tube(a, b, r) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, 5, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

// --- dispatch ---------------------------------------------------------------------

// EIKEA: blue box with a yellow band and big yellow letters on the long sides.
const LETTERS = {
  E: ['#####', '#....', '####.', '#....', '#####'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
};
function eikea(B, ring) {
  const H = 14, BLUE = 0x1d4fa3, YELLOW = 0xf2c230;
  walls(B, ring, 0, () => H, BLUE, G_PLAIN);
  cap(B, ring, () => H, 0x6f7479, G_PLAIN);
  const edges = edgesOf(ring, null);
  for (const e of edges) {
    const out = [e.nx, 0, e.ny];
    const at = (t, y, off) => [e.a[0] + e.tx * t + e.nx * off, y, e.a[1] + e.ty * t + e.ny * off];
    B.quadOut(at(0, H - 2.4, 0.06), at(e.len, H - 2.4, 0.06), at(e.len, H - 0.9, 0.06), at(0, H - 0.9, 0.06), out, YELLOW, G_PLAIN);
  }
  const long = edges.filter((e) => e.len > 40).sort((p, q) => q.len - p.len).slice(0, 2);
  for (const e of long) {
    const out = [e.nx, 0, e.ny];
    const at = (t, y) => [e.a[0] + e.tx * t + e.nx * 0.1, y, e.a[1] + e.ty * t + e.ny * 0.1];
    const word = 'EIKEA', px = 1.25, gap = 1.4;
    const width = [...word].reduce((s, ch) => s + LETTERS[ch][0].length * px + gap, -gap);
    // letters read left to right for someone facing the wall from outside
    const dir = ringArea(ring) >= 0 ? -1 : 1;
    let t = e.len / 2 - dir * width / 2;
    for (const ch of word) {
      const rows = LETTERS[ch];
      rows.forEach((row, r) => {
        [...row].forEach((c, k) => {
          if (c !== '#') return;
          const t0 = t + k * px * dir, y1 = H - 3.2 - r * px;
          B.quadOut(at(t0, y1 - px), at(t0 + px * dir, y1 - px), at(t0 + px * dir, y1), at(t0, y1), out, YELLOW, G_PLAIN);
        });
      });
      t += (rows[0].length * px + gap) * dir;
    }
    // entrance: glass doors in the middle
    B.quadOut(at(e.len / 2 - 4, 0.02), at(e.len / 2 + 4, 0.02), at(e.len / 2 + 4, 3.2), at(e.len / 2 - 4, 3.2), out, C.glass, G_GLASS);
  }
}

// --- Stadhuis (Grote Markt) ---------------------------------------------------------

// The OSM outline is a rectangle with sub-metre jags: model the clean frame.
// Husly's neoclassical front faces east onto the square: Bentheimer sandstone,
// colossal pilasters, a raised souterrain, and in the middle four colossal
// columns under a pediment, reached by a bordes; low hipped roof.
function stadhuis(B, ring) {
  const F = minAreaFrame(ring);
  const k = 0.2, rect = [[F.u0 + k, F.v0 + k], [F.u1 - k, F.v0 + k], [F.u1 - k, F.v1 - k], [F.u0 + k, F.v1 - k]].map(([u, v]) => F.P(u, v));
  const eave = 16, rise = 3.6, stone = 0xdccfa8, stoneShade = 0xc9bb93, plinth = 0xb3a483;
  const edges = edgesOf(rect);
  let main = edges[0];
  for (const e of edges) if (e.nx > main.nx) main = e;
  const t = main.len / 2, w = Math.min(13.5, main.len * 0.32), inset = 2.6;
  const at = (e, s, off, y) => W(e.a[0] + e.tx * s - e.nx * off, y, e.a[1] + e.ty * s - e.ny * off);
  const wall = (e, s0, s1, off, y0, y1, c = stone) => B.quad(at(e, s0, off, y0), at(e, s1, off, y0), at(e, s1, off, y1), at(e, s0, off, y1), c, G_PLAIN);
  const top = eave - 1.9;
  for (const e of edges) {
    if (e !== main) { wall(e, 0, e.len, 0, 0, eave); continue; }
    wall(e, 0, t - w / 2, 0, 0, eave);
    wall(e, t + w / 2, e.len, 0, 0, eave);
    wall(e, t - w / 2, t + w / 2, 0, top, eave);
    wall(e, t - w / 2, t + w / 2, inset, 0, top, 0xd2c59f);
    for (const s of [t - w / 2, t + w / 2]) B.quad(at(e, s, 0, 0), at(e, s, inset, 0), at(e, s, inset, top), at(e, s, 0, top), stoneShade, G_PLAIN);
    B.quad(at(e, t - w / 2, 0, top), at(e, t + w / 2, 0, top), at(e, t + w / 2, inset, top), at(e, t - w / 2, inset, top), stoneShade, G_PLAIN);
  }
  cap(B, rect, () => eave, 0x585c60, G_PLAIN);
  roofRim(B, edges, eave + 0.3, 6, rise, C.slateDark);
  band(B, edges, 0, 1.9, 0.1, plinth); // het glas van de ramen (0,12) steekt 2 cm uit de plint, niet gelijk (#382)
  band(B, edges, 1.9, 0.3, 0.18, stoneShade);
  band(B, edges, eave - 1.3, 1.3, 0.34, stoneShade);
  band(B, edges, eave - 1.6, 0.3, 0.2, C.white);
  for (const e of edges) {
    const pos = slots(e.len, 3.8, 1.0);
    for (const [i, s] of pos.entries()) {
      const inPortico = e === main && Math.abs(s - t) < w / 2 + 0.9;
      // colossal pilaster left of every bay (and right of the last)
      for (const ps of i === pos.length - 1 ? [s - 1.9, s + 1.9] : [s - 1.9]) {
        if (e === main && Math.abs(ps - t) < w / 2 + 0.4) continue;
        ebox(B, e, ps, 2.2, 0.75, eave - 3.5, 0.16, stoneShade, G_PLAIN, 0.02);
        ebox(B, e, ps, eave - 1.6 - 0.45, 1.0, 0.45, 0.26, C.white, G_PLAIN, 0.02);
      }
      if (inPortico) continue;
      archWindow(B, e, s, 0.5, 1.2, 1.1, { pointed: false, arch: false, frame: C.white });
      archWindow(B, e, s, 3.0, 1.6, 4.3, { pointed: false, arch: false, frame: C.white, mullion: true });
      ebox(B, e, s, 7.5, 2.2, 0.25, 0.22, stoneShade, G_PLAIN, 0.02);
      archWindow(B, e, s, 9.4, 1.5, 3.4, { pointed: false, arch: false, frame: C.white, mullion: true });
    }
  }
  // the portico: four colossal columns on the bordes, entablature, pediment
  const rot = Math.atan2(main.ty, main.tx);
  const lift = 1.5;
  for (let i = 0; i < 3; i++) {
    const [lx, , lz] = at(main, t, 0.15 + i * 0.3, 0);
    obox(B, lx, lz, 0, w - 0.6, 0.3, lift * (i + 1) / 4, rot, plinth, G_PLAIN);
  }
  const [bx, , bz] = at(main, t, (0.9 + inset) / 2, 0);
  obox(B, bx, bz, 0, w - 0.4, inset - 0.9, lift, rot, plinth, G_PLAIN);
  for (let i = 0; i < 4; i++) {
    const s = t - w / 2 + 1.3 + (w - 2.6) * i / 3;
    const [x, , z] = at(main, s, 1.5, 0);
    obox(B, x, z, lift, 1.3, 1.3, 0.5, rot, C.white, G_PLAIN);
    cyl(B, x, lift + 0.5, z, 0.48, 0.58, top - lift - 1.6, 12, C.white, G_PLAIN);
    obox(B, x, z, top - 1.1, 1.3, 1.3, 1.1, rot, C.white, G_PLAIN);
  }
  ebox(B, main, t, top - 0.6, w, 0.6, inset - 0.4, stoneShade, G_PLAIN, -inset + 0.4);
  for (let i = 0; i < 3; i++) archWindow(B, main, t + (i - 1) * 3.6, 3.4, 1.6, 4.2, { pointed: false, arch: false, frame: C.white, out: -inset });
  ebox(B, main, t, lift, 2.2, 3.4, 0.06, C.door, G_GLASS, -inset + 0.02);
  // pediment over the columns, its roof running back into the hip
  const pw = w + 0.8, ph = 3.4, pd = 3.2;
  const pa = at(main, t - pw / 2, -0.3, eave), pb = at(main, t + pw / 2, -0.3, eave), pc = at(main, t, -0.3, eave + ph);
  B.tri(pa, pb, pc, stone, G_PLAIN);
  const qa = at(main, t - pw / 2, pd, eave), qb = at(main, t + pw / 2, pd, eave), qc = at(main, t, pd, eave + ph);
  B.quad(pa, qa, qc, pc, C.slateDark, G_TILE);
  B.quad(qb, pb, pc, qc, C.slateDark, G_TILE);
  B.quad(at(main, t - pw / 2 - 0.2, -0.45, eave - 0.05), at(main, t + pw / 2 + 0.2, -0.45, eave - 0.05), at(main, t + pw / 2 + 0.2, -0.45, eave + 0.3), at(main, t - pw / 2 - 0.2, -0.45, eave + 0.3), C.white, G_PLAIN);
  const [ax, , az] = at(main, t, -0.36, 0);
  B.geo(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 10), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(ax, eave + 1.2, az), C.gold, G_METAL);
  const [fx, fz] = F.P((F.u0 + F.u1) / 2, (F.v0 + F.v1) / 2);
  cyl(B, fx, eave + rise, fz, 0.07, 0.09, 8, 4, C.white, G_PLAIN);
  for (const [i, c] of [0xc8102e, C.white, 0x21468b].entries()) B.box(fx + 0.9, eave + rise + 7.6 - i * 0.4, fz, 1.8, 0.4, 0.04, c, G_PLAIN);
}

// --- Prinsenhof -------------------------------------------------------------------

function prinsenhof(B, ring, srcEdges) {
  const eave = 8.4;
  const edges = edgesOf(ring, partyTester(srcEdges));
  walls(B, ring, 0, () => eave, C.brick, G_BRICK);
  cap(B, ring, () => eave, 0x6d3528, G_TILE);
  roofRim(B, edges, eave, 6, 4.6, 0x7a3a2c);
  band(B, edges, 0, 0.7, 0.08, C.sandstone);
  band(B, edges, eave - 0.35, 0.35, 0.14, C.white);
  for (const e of edges) {
    if (e.party || e.len < 2.8) continue;
    for (const t of slots(e.len, 2.9, 0.8)) {
      for (const y0 of [1.2, 4.9]) {
        ebox(B, e, t, y0 - 0.1, 1.3, 2.6, 0.06, C.white, G_PLAIN, 0.02);
        ebox(B, e, t, y0, 1.05, 2.4, 0.06, C.glass, G_GLASS, 0.06);
        ebox(B, e, t, y0 + 1.1, 1.05, 0.1, 0.05, C.white, G_PLAIN, 0.11);
        for (const s of [-1, 1]) ebox(B, e, t + s * 0.9, y0, 0.5, 2.4, 0.06, C.green, G_PLAIN, 0.04);
      }
    }
  }
  // dakruiter with the bell lantern over the longest wing
  let main = null;
  for (const e of edges) if (!e.party && (!main || e.len > main.len)) main = e;
  if (!main) return;
  const x = main.a[0] + main.tx * main.len * 0.35 - main.nx * 6.5, z = main.a[1] + main.ty * main.len * 0.35 - main.ny * 6.5;
  if (!pointInPolygon(x, z, ring)) return;
  const rot = Math.atan2(main.ty, main.tx);
  obox(B, x, z, eave, 2.6, 2.6, 6.4, rot, C.white, G_PLAIN);
  cyl(B, x, eave + 6.4, z, 1.1, 1.3, 2.2, 8, C.white, G_PLAIN, rot);
  prism(B, new THREE.SphereGeometry(1.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), x, eave + 8.6, z, rot, C.copper, G_METAL);
  cone(B, x, eave + 9.6, z, 0.35, 2.6, 6, C.copper, G_METAL, rot);
  B.box(x, eave + 12.4, z, 0.3, 0.3, 0.3, C.gold, G_METAL);
}

// --- Apenrots (the glass grid-operator HQ) ---------------------------------------

// Stacked, shrinking brick masses with sloping tops that lean up to a tower
// at the east end: the organic silhouette of the Apenrots (a made-up name for the real grid-operator HQ).
function gasunie(B, ring, srcEdges) {
  const F = minAreaFrame(ring);
  const east = F.P(F.u1, 0)[0] > F.P(F.u0, 0)[0] ? 1 : -1;
  const uN = (p) => { const u = (F.U(p[0], p[1]) - F.u0) / (F.u1 - F.u0); return east > 0 ? u : 1 - u; };
  const wob = (p, s) => Math.sin(p[0] * 0.11 + s) * Math.cos(p[1] * 0.09 - s) * 2.2;
  const brick = 0x8a4a36, brick2 = 0x9a5a40, roofCol = 0x5f6f5e, glass = 0x3e5a58;
  const tiers = [
    { d: 0, lo: 10, hi: 18, c: brick },
    { d: -7, lo: 20, hi: 31, c: brick2 },
    { d: -16, lo: 30, hi: 42, c: brick },
  ];
  for (const [i, T] of tiers.entries()) {
    const r = T.d ? grown(ring, T.d) : ring;
    const yAt = (p) => T.lo + (T.hi - T.lo) * uN(p) + wob(p, i);
    walls(B, r, i ? tiers[i - 1].lo - 3 : 0, yAt, T.c, G_BRICK);
    cap(B, r, yAt, roofCol, G_TILE);
    // green-glass ribbons, kept below the lowest point of the sloping top
    const top = Math.min(...r.map(yAt));
    for (const e of edgesOf(r, i ? null : partyTester(srcEdges))) {
      if (e.party || e.len < 3) continue;
      for (let y = 4; y < top - 2.4; y += 3.6) ebox(B, e, e.len / 2, y, e.len - 0.8, 1.6, 0.06, glass, G_GLASS, 0.03);
    }
  }
  // the tower head: an octagonal drum with a leaning, cut-off crown
  const [tx, tz] = F.P(east > 0 ? F.u1 - (F.u1 - F.u0) * 0.22 : F.u0 + (F.u1 - F.u0) * 0.22, (F.v0 + F.v1) / 2);
  let room = Infinity;
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k], c = ring[(k + 1) % ring.length];
    room = Math.min(room, Math.sqrt(closestPointOnSegment(tx, tz, a[0], a[1], c[0], c[1]).dist2));
  }
  const R0 = Math.max(5, Math.min(13, room - 4));
  const drum = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2, rr = R0 * (1 + Math.sin(k * 2.3) * 0.15);
    return [tx + Math.cos(a) * rr, tz + Math.sin(a) * rr];
  });
  const dY = (p) => 50 + ((p[0] - tx) * F.ux + (p[1] - tz) * F.uy) * 0.35 * east;
  walls(B, drum, 26, dY, brick2, G_BRICK);
  cap(B, drum, dY, 0x4f6a60, G_METAL);
  for (const e of edgesOf(drum)) for (let y = 34; y < 44; y += 3.4) ebox(B, e, e.len / 2, y, e.len - 0.4, 2, 0.06, glass, G_GLASS, 0.03);
  cyl(B, tx, 52, tz, 0.15, 0.2, 9, 4, C.steel, G_METAL);
}

// --- DUO "Cruiseschip" (Rijkskantoor Kempkensberg) --------------------------------

// A long white hull of alternating deck bands and glass, with a superstructure
// stepping back toward a bridge deck and mast.
function duoCruiseschip(B, ring) {
  const F = minAreaFrame(ring);
  const U = (p) => (F.U(p[0], p[1]) - F.u0) / (F.u1 - F.u0);
  const white = 0xeceae4, glass = 0x33424c;
  const deck = (r, y0, n) => {
    let y = y0;
    for (let i = 0; i < n; i++) {
      walls(B, r, y, () => y + 1.1, white, G_PLAIN);
      walls(B, r, y + 1.1, () => y + 3.2, glass, G_GLASS);
      y += 3.2;
    }
    walls(B, r, y, () => y + 1.2, white, G_PLAIN);
    cap(B, r, () => y + 1.2, 0xb6b4ae, G_PLAIN);
    return y + 1.2;
  };
  const slice = (a, b, d) => grown(clipRing(clipRing(ring, (p) => U(p) - a), (p) => b - U(p)), d);
  walls(B, ring, 0, () => 3.6, 0x4a5258, G_GLASS);
  let y = deck(ring, 3.6, 6);
  y = deck(slice(0.08, 0.9, -2.2), y, 3);
  y = deck(slice(0.22, 0.72, -5), y, 2);
  const bu = F.u0 + (F.u1 - F.u0) * 0.47, bv = (F.v0 + F.v1) / 2;
  const [bx, bz] = F.P(bu, bv);
  fbox(B, F, bu, bv, y, 16, 9, 3.2, glass, G_GLASS);
  fbox(B, F, bu, bv, y + 3.2, 17.5, 10.5, 0.6, white, G_PLAIN);
  cyl(B, bx, y + 3.8, bz, 0.12, 0.2, 10, 4, C.steel, G_METAL);
  B.box(bx, y + 11, bz, 3, 0.12, 0.12, C.steel, G_METAL, 0, -F.rot, 0);
  // blue DUO stripe along the hull
  for (const e of edgesOf(ring)) if (e.len > 4) ebox(B, e, e.len / 2, 3.6, e.len - 0.3, 0.5, 0.05, 0x1f4e8c, G_PLAIN, 0.04);
}

const BUILDERS = {
  EIKEA: (B, b, ring) => eikea(B, ring),
  Martinikerk: (B, b, ring, edges) => gothicChurch(B, ring, edges, { eave: 17, maxRise: 16, pitch: 52, flecheAt: 0.6 }),
  'Der Aa-kerk': (B, b, ring, edges) => {
    if (b.type !== 'church') return false;
    gothicChurch(B, ring, edges, { eave: 15, maxRise: 13, pitch: 50, flecheAt: 0.62, towerSpec: aKerkTower });
  },
  'Groninger Museum': (B, b) => { if (!b.parts) return false; groningerMuseum(B, b); },
  'Forum Groningen': (B, b, ring, edges) => forum(B, ring, edges),
  'Hoofdstation Groningen': (B, b, ring) => hoofdstation(B, ring),
  Academiegebouw: (B, b, ring, edges) => academiegebouw(B, ring, edges),
  Goudkantoor: (B, b, ring, edges) => goudkantoor(B, ring, edges),
  Euroborg: (B, b, ring) => euroborgStand(B, b, ring),
  'Winkelcentrum Paddepoel': (B, b, ring, edges) => paddepoelBlock(B, b, ring, edges),
};

// Named city buildings that get a model without being a spawn landmark.
const NAMED = {
  Stadhuis: (B, b, ring) => { if (b.type !== 'civic') return false; stadhuis(B, ring); },
  Prinsenhof: (B, b, ring, edges) => prinsenhof(B, ring, edges),
  Apenrots: (B, b, ring, edges) => gasunie(B, ring, edges),
  'Rijkskantoor Kempkensberg': (B, b, ring) => duoCruiseschip(B, ring),
};
// Shared with the Grote Markt / Vismarkt models (marktgebouwen.js).
export const LM = {
  G: { PLAIN: G_PLAIN, BRICK: G_BRICK, GLASS: G_GLASS, METAL: G_METAL, TILE: G_TILE }, C, W,
  obox, frameFrom, minAreaFrame, fbox, FW, prism, cone, cyl, roofRect, alongU, alongV, ringArea, triangulate,
  cap, walls, extrude, clipRing, polyGableRoof, edgesOf, partyTester, ebox, archWindow, slots, band, roofRim,
};
// Models other modules add for buildings they tag with b.model (thuis3d.js).
const MODELS = {};
export function registerBuildingModel(key, fn) { MODELS[key] = fn; }
export const modelKit = { obox, fbox, walls, cap, extrude, ebox, edgesOf, partyTester, minAreaFrame, frameFrom, cyl, slots, band, clipRing, grown, triangulate, C, G: { PLAIN: G_PLAIN, BRICK: G_BRICK, GLASS: G_GLASS, METAL: G_METAL, TILE: G_TILE } };
// The everyday kits (landmarkkit.js: farm, silo, factory, flat, school, station, town hall,
// museum) for tile buildings the data says they fit (issue #164); the kit's own geometry
// (its long axis along +x) is turned and moved onto the footprint.
const KIT_GROUP = [G_PLAIN, G_PLAIN, G_GLASS]; // body, glow (no glow here), glass
function kitBuilder(B, b, ring) {
  const item = b._kitItem;
  const p = landmarkParams(item);
  if (!p) return false;
  const src = landmarkGeometry(p, LOD_FULL).geometry;
  const pos = src.attributes.position, col = src.attributes.color, uv = src.attributes.uv;
  const ca = Math.cos(p.angle), sa = Math.sin(p.angle);
  const at = (i) => { const x = pos.getX(i), z = pos.getZ(i); return [p.x + x * ca - z * sa, pos.getY(i) - 0.05, p.y + x * sa + z * ca]; };
  for (const g of src.groups) {
    for (let i = g.start; i < g.start + g.count; i += 3) {
      const rgb = [col.getX(i), col.getY(i), col.getZ(i)];
      B._push(KIT_GROUP[g.materialIndex] ?? G_PLAIN, at(i), at(i + 1), at(i + 2), rgb, uv ? [uv.getX(i), uv.getY(i), uv.getX(i + 1), uv.getY(i + 1), uv.getX(i + 2), uv.getY(i + 2)] : null);
    }
  }
  src.dispose();
}
const kitFor = (b) => {
  if (b._kitItem !== undefined) return b._kitItem ? kitBuilder : null;
  b._kitItem = b.pts && b.pts.length >= 3 ? kitItemFromBuilding(b) : null;
  return b._kitItem ? kitBuilder : null;
};
const builderOf = (b) => (b.model && MODELS[b.model]) || (b.landmark && BUILDERS[b.landmark]) || (b.name && NAMED[b.name]) || kitFor(b) || null;

export function hasLandmarkModel(b) {
  return !!builderOf(b);
}

// ring: sanitized footprint [[x, y], ...]; edges: the building's outward
// edge list with party-wall flags (models3d_buildings' format).
export function buildLandmarkGeometry(b, ring, edges) {
  const fn = builderOf(b);
  if (!fn) return null;
  const B = new GeoBuilder(5);
  if (fn(B, b, ring, edges) === false) return null;
  return B.build();
}
