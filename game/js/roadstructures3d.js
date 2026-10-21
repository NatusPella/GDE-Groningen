// Civil works under and beside the roads that are not at street level (see
// elevation.js): viaduct decks with piers and abutments, embankment slopes,
// retaining walls of cuttings with a fence on top, tunnel roofs with lights
// and portals, crash barriers, and decks under the streets and rails that
// cross an open cutting. Built per road, cached on it, streamed with the
// road meshes (buildRoadGroup).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y, closestPointOnSegment } from './util.js';
import {
  DECK_T, EMB_SLOPE, WALL_T, FENCE_H, BARRIER_H, ROOF_T, RAISED, COPING,
  surfaceHalfWidth, roofTopAt, coveredAt, isWallBroken, lowerSurfaceAt,
} from './elevation.js';

const PIER_EVERY = 24;
const LOW_FILL = 0.15;     // ramp height from which its sides get a slope
const SLOPE_FOOT = -0.07;  // embankment foot just under the terrain (-0.05)
const LIGHT_EVERY = 12;

const mats = {};
function mat(name) {
  if (mats[name]) return mats[name];
  const spec = {
    concrete: { color: 0xa39f96, roughness: 0.92 },
    wall: { color: 0x8f8b82, roughness: 0.95 },
    // the roof underside only gets the tunnel lights: a little self-light, or it reads as a black hole
    tunnel: { color: 0x8a867e, roughness: 0.9, emissive: 0x3b3934, emissiveIntensity: 1 },
    grass: { color: 0x5c8a4d, roughness: 1 },
    steel: { color: 0xb9bdc1, roughness: 0.45, metalness: 0.6 },
    fence: { color: 0x2f3336, roughness: 0.7, metalness: 0.3 },
    lamp: { color: 0xfff2d0, emissive: 0xffe2a8, emissiveIntensity: 1.6, roughness: 0.4 },
  }[name];
  // the slope's foot runs out flat into the terrain (-0.05) and the green
  // fills (grass.js, up to -1.31 / -7.3): it wins there, under the sidewalks (-2 / -8)
  const off = name === 'grass' ? { polygonOffset: true, polygonOffsetFactor: -1.75, polygonOffsetUnits: -7.9 } : {};
  mats[name] = new THREE.MeshStandardMaterial({ ...spec, ...off, flatShading: true, side: THREE.DoubleSide });
  return mats[name];
}

class Buf {
  constructor() { this.p = {}; }
  tri(m, a, b, c) {
    const arr = this.p[m] || (this.p[m] = []);
    arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  quad(m, a, b, c, d) { this.tri(m, a, b, c); this.tri(m, a, c, d); }
  // box between two ground points (x, y) with a width across and z range per end
  wallBox(m, ax, ay, bx, by, w, za0, za1, zb0, zb1) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * w / 2, ny = dx / l * w / 2;
    const A0 = [ax + nx, za0, ay + ny], A1 = [ax - nx, za0, ay - ny];
    const B0 = [bx + nx, zb0, by + ny], B1 = [bx - nx, zb0, by - ny];
    const A0t = [ax + nx, za1, ay + ny], A1t = [ax - nx, za1, ay - ny];
    const B0t = [bx + nx, zb1, by + ny], B1t = [bx - nx, zb1, by - ny];
    this.quad(m, A0, B0, B0t, A0t);
    this.quad(m, A1, A1t, B1t, B1);
    this.quad(m, A0t, B0t, B1t, A1t);
    this.quad(m, A0, A0t, A1t, A1);
    this.quad(m, B0, B1, B1t, B0t);
  }
  post(m, x, y, w, z0, z1) { this.wallBox(m, x - w / 2, y, x + w / 2, y, w, z0, z1, z0, z1); }
  // the vertex range piece() adds to material m, to hide it again later
  mark(m) { return (this.p[m] || (this.p[m] = [])).length; }
  // plain arrays per material (the geometry worker sends them as they are)
  arrays() {
    const parts = [];
    for (const [m, arr] of Object.entries(this.p)) {
      if (!arr.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const c = geo.boundingSphere.center;
      parts.push({ m, pos: geo.attributes.position.array, nor: geo.attributes.normal.array, sphere: [c.x, c.y, c.z, geo.boundingSphere.radius] });
    }
    return parts.length ? { parts, hide: this.hide || [] } : null;
  }
}

// The typed arrays of a structure (structureArrays), for postMessage.
export function structureTransfer(S, transfer) {
  if (S) for (const p of S.parts) transfer.push(p.pos.buffer, p.nor.buffer);
  return S;
}

// The meshes of a structure from its arrays, on map's own elevation: a
// breakable section (hide: its wall's place in elev.walls and its vertex
// range) remembers its vertices, w.collapse() hides it when its prop is
// knocked out (cityprops.js). Null when the walls do not match this map.
export function structureGroup(map, S) {
  if (!S) return null;
  const walls = map.elev.walls;
  for (const h of S.hide) {
    const w = walls[h.wi];
    if (!w || w.ax !== h.ax || w.ay !== h.ay) return undefined;
  }
  const g = new THREE.Group(), meshOf = {};
  for (const p of S.parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(p.nor, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(p.sphere[0], p.sphere[1], p.sphere[2]), p.sphere[3]);
    const mesh = new THREE.Mesh(geo, mat(p.m));
    mesh.castShadow = p.m !== 'lamp' && p.m !== 'fence';
    mesh.receiveShadow = true;
    mesh.userData.roadStructure = true;
    g.add(mesh);
    meshOf[p.m] = mesh;
  }
  for (const h of S.hide) {
    const w = walls[h.wi], mesh = meshOf[h.m];
    let keep = null;
    w.collapse = () => {
      if (!mesh || keep) return;
      const pos = mesh.geometry.attributes.position, a = pos.array;
      keep = a.slice(h.a, h.b);
      for (let i = h.a + 3; i < h.b; i += 3) { a[i] = a[h.a]; a[i + 1] = a[h.a + 1]; a[i + 2] = a[h.a + 2]; }
      pos.needsUpdate = true;
      mesh.geometry.userData.batchVer = (mesh.geometry.userData.batchVer || 0) + 1;
    };
    w.restore = () => {
      if (!mesh || !keep) return;
      const pos = mesh.geometry.attributes.position;
      pos.array.set(keep, h.a);
      keep = null;
      pos.needsUpdate = true;
      mesh.geometry.userData.batchVer = (mesh.geometry.userData.batchVer || 0) + 1;
    };
    if (isWallBroken(w)) w.collapse();
  }
  return g;
}

// How far (in miter units, like edge()) a tunnel roof reaches from (x, y)
// along the miter (nx, ny): `off`, or half way to a neighbouring covered
// road's centreline.
function roofReach(elev, r, x, y, nx, ny, off) {
  const list = elev.grid.at(x, y);
  if (!list) return off;
  const nl = Math.hypot(nx, ny) || 1;
  let best = off;
  for (const sg of list) {
    if (sg.r === r || !sg.covered || sg.rail) continue;
    const cp = closestPointOnSegment(x, y, sg.ax, sg.ay, sg.bx, sg.by);
    const d = ((cp.x - x) * nx + (cp.y - y) * ny) / nl;
    if (d > 0.5 && d < off * nl + sg.hs + WALL_T) best = Math.min(best, d / 2 / nl);
  }
  return best;
}

// Where way r's end point i (0 or last) carries straight on into exactly one
// other way end (OSM splits a street into ways at every tag change), the
// direction from that node into the other way; null at a junction or a dead
// end. Ribbons and structures cut their end along the bisector there, like
// at a vertex inside a way, so the two ways join without a wedge.
export function jointAway(map, r, i) {
  const P = r.pts, p = P[i], last = P.length - 1;
  let away = null;
  for (const o of map.roadsNear(p[0], p[1], 0.5)) {
    const Q = o.pts;
    for (let k = 0; k < Q.length; k++) {
      if (Math.abs(Q[k][0] - p[0]) > 0.05 || Math.abs(Q[k][1] - p[1]) > 0.05) continue;
      if (o === r && k === i) continue;
      const end = k === 0 || k === Q.length - 1;
      // a closed way (a roundabout) carries on into its own other end
      if (!end || away || (o === r && last < 2)) return null;
      const q = Q[k === 0 ? 1 : k - 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
      if (l < 1e-3) return null;
      away = [dx / l, dy / l];
    }
  }
  // two ways meeting in a V (ramps merging at a node, a hairpin) do not
  // carry on: a bisector cut there would be stretched metres past the node
  if (away) {
    const q = P[i === 0 ? 1 : i - 1], ix = p[0] - q[0], iy = p[1] - q[1], il = Math.hypot(ix, iy);
    if (il > 1e-3 && (ix * away[0] + iy * away[1]) / il < -0.3) return null;
  }
  return away;
}

// Miter (scaled normal) at end i of a polyline whose end segment has normal
// segN, joining it to the way that carries on in direction `away`.
export function jointMiter(segN, away, start, minCos) {
  const on = start ? [away[1], -away[0]] : [-away[1], away[0]];
  let mx = segN[0] + on[0], my = segN[1] + on[1];
  const ml = Math.hypot(mx, my);
  if (ml < 1e-3) return segN.slice();
  mx /= ml; my /= ml;
  const sc = 1 / Math.max(mx * segN[0] + my * segN[1], minCos);
  return [mx * sc, my * sc];
}

function miters(P, r = null, map = null) {
  const n = P.length, segN = [], out = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy) || 1;
    segN.push([-dy / l, dx / l]);
  }
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      const sn = segN[i === 0 ? 0 : n - 2];
      const away = r && map ? jointAway(map, r, i) : null;
      out.push(away ? jointMiter(sn, away, i === 0, 0.5) : sn);
      continue;
    }
    const a = segN[i - 1], b = segN[i];
    let mx = a[0] + b[0], my = a[1] + b[1];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-3) { out.push(b); continue; }
    mx /= ml; my /= ml;
    const sc = 1 / Math.max(mx * b[0] + my * b[1], 0.5);
    out.push([mx * sc, my * sc]);
  }
  return out;
}

const PIER_SHIFTS = [0, 3, -3, 6, -6, 9, -9];

const PIER_CATS = new Set(['major', 'normal', 'minor', 'service']);

// Is (x, y) on the carriageway of a road running below height zTop?
function lowerCarriageway(map, x, y, zTop) {
  for (const r of map.roadsNear(x, y, 12)) {
    if (!PIER_CATS.has(r.cat)) continue;
    const hw = r.width / 2 + 0.4;
    const P = r.pts, Z = r.z;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (cp.dist2 >= hw * hw) continue;
      const z = Z ? Z[i] + (Z[i + 1] - Z[i]) * cp.t : 0;
      if (z < zTop - 1.5) return true;
    }
  }
  return false;
}

function pierBlocked(map, x, y, ux, uy, half, z) {
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    for (const a of [-0.8, 0.8]) {
      if (lowerCarriageway(map, x - uy * half * f + ux * a, y + ux * half * f + uy * a, z)) return true;
    }
  }
  return false;
}

// Does another viaduct way carry on from road r's end point p? Then there is
// no abutment there, just more deck.
function deckContinues(map, r, p) {
  for (const o of map.roadsNear(p[0], p[1], 2)) {
    if (o === r || !o.bridge || o.tunnel || !o.z) continue;
    const n = o.pts.length;
    for (const k of [0, n - 1]) {
      if (Math.abs(o.pts[k][0] - p[0]) < 0.05 && Math.abs(o.pts[k][1] - p[1]) < 0.05 && o.z[k] > 1.5) return true;
    }
  }
  return false;
}

// Under a covered section, its round ends not counted: 3 m out of a portal
// is still within the tunnel's own reach (hs + WALL_T) past its end point.
function coveredSpanAt(elev, x, y) {
  for (const s of elev.grid.at(x, y) || []) {
    if (!s.covered) continue;
    const cp = closestPointOnSegment(x, y, s.ax, s.ay, s.bx, s.by);
    if (cp.t > 1e-3 && cp.t < 1 - 1e-3 && cp.dist2 <= (s.hs + WALL_T) ** 2) return true;
  }
  return false;
}

function groundUnder(map, x, y) {
  return map.inWaterRaw(x, y) ? WATER_Y - 0.6 : -0.05;
}

// ------------------------------------------------------------------ elevated road

export function buildRoadStructure(r, map) {
  if (r._geoStruct === undefined) r._geoStruct = structureGroup(map, structureArrays(r, map));
  return r._geoStruct;
}

// The civil works of road r as plain arrays (no scene, no state on r): the
// main thread and the geometry worker (geokernels.js roadGeo) run this.
export function structureArrays(r, map) {
  const elev = map.elev;
  const B = new Buf();
  const P = r.pts, Z = r.z, n = P.length;
  const hs = surfaceHalfWidth(r);
  const M = miters(P, r, map);
  const deck = !!r.bridge && !r.tunnel;
  const edge = (i, side, off) => [P[i][0] + M[i][0] * off * side, P[i][1] + M[i][1] * off * side];

  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const deckBox = (i, t0, t1, a0, b0) => {
    for (const side of [1, -1]) {
      const ea = lerp2(edge(i, side, hs), edge(i + 1, side, hs), t0), eb = lerp2(edge(i, side, hs), edge(i + 1, side, hs), t1);
      B.quad('concrete', [ea[0], a0 + 0.02, ea[1]], [eb[0], b0 + 0.02, eb[1]], [eb[0], b0 - DECK_T, eb[1]], [ea[0], a0 - DECK_T, ea[1]]);
    }
    const l0 = lerp2(edge(i, 1, hs), edge(i + 1, 1, hs), t0), r0 = lerp2(edge(i, -1, hs), edge(i + 1, -1, hs), t0);
    const l1 = lerp2(edge(i, 1, hs), edge(i + 1, 1, hs), t1), r1 = lerp2(edge(i, -1, hs), edge(i + 1, -1, hs), t1);
    B.quad('concrete', [l0[0], a0 - DECK_T, l0[1]], [l1[0], b0 - DECK_T, l1[1]], [r1[0], b0 - DECK_T, r1[1]], [r0[0], a0 - DECK_T, r0[1]]);
  };
  const segOf = new Map();
  // (a streamed road has its segments listed: no walk over all of the province's)
  for (const sg of (elev.byRoad && elev.byRoad.get(r)) || elev.segs) if (sg.r === r) segOf.set(sg.i, sg);

  // open ends of an embankment slope (where it gives way to a deck, an
  // abutment wall or the road ends) are closed with a triangle down to the
  // ground, otherwise you look into the embankment through a gap
  const slopeEnd = [null, null];
  const closeSlope = (j) => {
    const e = slopeEnd[j];
    if (e && e.z > 0.1) B.tri('grass', [e.ex, e.z + 0.015, e.ey], [e.fx, SLOPE_FOOT, e.fy], [e.ex, SLOPE_FOOT, e.ey]);
    slopeEnd[j] = null;
  };
  for (let i = 0; i < n - 1; i++) {
    const za = Z[i], zb = Z[i + 1];
    // (the low foot of a ramp, under RAISED, still stands a hand's width
    // over the terrain: a grass slope down to it, drawn only)
    const low = !deck && za <= RAISED && zb <= RAISED && Math.max(za, zb) > LOW_FILL;
    if (deck || (za <= RAISED && zb <= RAISED && !low)) { closeSlope(0); closeSlope(1); }
    if (za > RAISED || zb > RAISED || low) {
      if (deck) deckBox(i, 0, 1, Math.max(za, 0), Math.max(zb, 0));
      else {
        const sg = segOf.get(i);
        const pieces = (sg && sg.pieces) || [{ t0: 0, t1: 1, over: false, retain: [false, false] }];
        let prevOver = null;
        for (const pc of pieces) {
          const a0 = Math.max(0, za + (zb - za) * pc.t0), b0 = Math.max(0, za + (zb - za) * pc.t1);
          if (pc.over) { deckBox(i, pc.t0, pc.t1, a0, b0); closeSlope(0); closeSlope(1); }
          else {
            [1, -1].forEach((side, j) => {
              const ea = lerp2(edge(i, side, hs), edge(i + 1, side, hs), pc.t0), eb = lerp2(edge(i, side, hs), edge(i + 1, side, hs), pc.t1);
              if (pc.retain[j]) {
                closeSlope(j);
                B.quad('wall', [ea[0], a0 + 0.02, ea[1]], [eb[0], b0 + 0.02, eb[1]], [eb[0], -0.05, eb[1]], [ea[0], -0.05, ea[1]]);
              } else {
                const ra = (a0 - SLOPE_FOOT) / EMB_SLOPE, rb = (b0 - SLOPE_FOOT) / EMB_SLOPE;
                const fa = lerp2(edge(i, side, hs + ra), edge(i + 1, side, hs + ra), pc.t0);
                const fb = lerp2(edge(i, side, hs + rb), edge(i + 1, side, hs + rb), pc.t1);
                if (!slopeEnd[j]) {
                  slopeEnd[j] = { ex: ea[0], ey: ea[1], fx: fa[0], fy: fa[1], z: a0 };
                  closeSlope(j);
                }
                B.quad('grass', [ea[0], a0 + 0.015, ea[1]], [eb[0], b0 + 0.015, eb[1]], [fb[0], SLOPE_FOOT, fb[1]], [fa[0], SLOPE_FOOT, fa[1]]);
                slopeEnd[j] = { ex: eb[0], ey: eb[1], fx: fb[0], fy: fb[1], z: b0 };
              }
            });
          }
          // abutment where the road runs onto / off its span over a lower road
          if (prevOver !== null && prevOver !== pc.over && a0 > 1) {
            const l = lerp2(edge(i, 1, hs), edge(i + 1, 1, hs), pc.t0), rr = lerp2(edge(i, -1, hs), edge(i + 1, -1, hs), pc.t0);
            B.wallBox('concrete', l[0], l[1], rr[0], rr[1], 0.8, -0.05, a0 - DECK_T + 0.05, -0.05, a0 - DECK_T + 0.05);
          }
          prevOver = pc.over;
        }
      }
    }
    if (za > RAISED || zb > RAISED) {
      // a slab just under the raised carriageway: where its ribbon is cut back
      // against a way alongside (a slip road splitting off) the cracks
      // between the two ribbons look onto it instead of the ground far below
      const ext = 0.6, ux = (P[i + 1][0] - P[i][0]), uy = (P[i + 1][1] - P[i][1]), ul = Math.hypot(ux, uy) || 1;
      const ex = ux / ul * ext, ey = uy / ul * ext;
      const l0 = edge(i, 1, hs), r0 = edge(i, -1, hs), l1 = edge(i + 1, 1, hs), r1 = edge(i + 1, -1, hs);
      const fa = Math.max(za, 0) - 0.06, fb = Math.max(zb, 0) - 0.06;
      B.quad('concrete', [l0[0] - ex, fa, l0[1] - ey], [l1[0] + ex, fb, l1[1] + ey], [r1[0] + ex, fb, r1[1] + ey], [r0[0] - ex, fa, r0[1] - ey]);
    }
    if (za < -RAISED || zb < -RAISED) {
      // a floor under the sunken carriageway: where two ways' ribbons meet
      // (or stop short at a portal) the ground above is cut away, so a
      // crack would look straight into the void
      // (out past the verge to under the wall: the open-cut mask's texels
      // reach a little beyond it, and a slip road alongside a wider
      // carriageway puts its wall on that one's verge)
      const ext = 0.6, ux = (P[i + 1][0] - P[i][0]), uy = (P[i + 1][1] - P[i][1]), ul = Math.hypot(ux, uy) || 1;
      const ex = ux / ul * ext, ey = uy / ul * ext;
      const fa = Math.min(za - 0.06, -0.12), fb = Math.min(zb - 0.06, -0.12);
      // (never out over a lower carriageway beside it)
      const fw = (k, side, f) => { const q = edge(k, side, hs + WALL_T + 0.8); return lowerSurfaceAt(elev, q[0], q[1], f + 1) ? hs : hs + WALL_T + 0.8; };
      const l0 = edge(i, 1, fw(i, 1, fa)), r0 = edge(i, -1, fw(i, -1, fa)), l1 = edge(i + 1, 1, fw(i + 1, 1, fb)), r1 = edge(i + 1, -1, fw(i + 1, -1, fb));
      B.quad('concrete', [l0[0] - ex, fa, l0[1] - ey], [l1[0] + ex, fb, l1[1] + ey], [r1[0] + ex, fb, r1[1] + ey], [r0[0] - ex, fa, r0[1] - ey]);
    }
    if (r.tunnel && (za < -RAISED || zb < -RAISED)) {
      // roof slab underside across the tunnel, lights along the middle; beside
      // the other carriageway's tunnel it stops at the midline between them, so
      // the two roofs meet instead of lying over each other
      const off = hs + WALL_T;
      const lim = (k, side) => roofReach(elev, r, P[k][0], P[k][1], M[k][0] * side, M[k][1] * side, off);
      const l0 = edge(i, 1, lim(i, 1)), r0 = edge(i, -1, lim(i, -1)), l1 = edge(i + 1, 1, lim(i + 1, 1)), r1 = edge(i + 1, -1, lim(i + 1, -1));
      const ta = roofTopAt(elev, P[i][0], P[i][1], za) - ROOF_T, tb = roofTopAt(elev, P[i + 1][0], P[i + 1][1], zb) - ROOF_T;
      B.quad('tunnel', [l0[0], ta, l0[1]], [l1[0], tb, l1[1]], [r1[0], tb, r1[1]], [r0[0], ta, r0[1]]);
    }
  }

  closeSlope(0);
  closeSlope(1);

  // a raised or sunken path or cycleway has no sidewalk ribbon out to the
  // deck edge, the top of the slope or the cutting's wall (hs): a shoulder
  // strip closes the gap beside it
  const hw = r.width / 2;
  if (hs - hw > 0.05) {
    for (let i = 0; i < n - 1; i++) {
      const za = Z[i], zb = Z[i + 1];
      const up = za > RAISED || zb > RAISED, down = za < -RAISED || zb < -RAISED;
      if (!up && !down) continue;
      const a0 = (up ? Math.max(0, za) : za) + 0.025, b0 = (up ? Math.max(0, zb) : zb) + 0.025;
      for (const side of [1, -1]) {
        const ia = edge(i, side, hw), ib = edge(i + 1, side, hw), oa = edge(i, side, hs), ob = edge(i + 1, side, hs);
        B.quad(deck || down ? 'concrete' : 'grass', [ia[0], a0, ia[1]], [ib[0], b0, ib[1]], [ob[0], b0, ob[1]], [oa[0], a0, oa[1]]);
      }
    }
  }

  // piers, lights and portals by arc length
  let s = 0;
  let nextPier = PIER_EVERY / 2, nextLight = LIGHT_EVERY / 2;
  for (let i = 0; i < n - 1; i++) {
    const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
    const L = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / (L || 1), uy = (by - ay) / (L || 1);
    while (deck && nextPier < s + L) {
      const half = Math.max(1.5, hs * 0.55);
      // a pier never stands in a road passing underneath: slide it along the
      // deck to a free spot, else columns beside that road
      let placed = false;
      for (const shift of PIER_SHIFTS) {
        const t = (nextPier + shift - s) / L;
        if (t < 0 || t > 1) continue;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = Z[i] + (Z[i + 1] - Z[i]) * t;
        if (z <= 2.2) break;
        if (pierBlocked(map, x, y, ux, uy, half, z)) continue;
        const g = groundUnder(map, x, y);
        B.wallBox('concrete', x - uy * half, y + ux * half, x + uy * half, y - ux * half, 1.3, g, z - DECK_T, g, z - DECK_T);
        placed = true;
        break;
      }
      if (!placed) {
        // over a road running underneath: columns beside it, under the deck edges
        const t = (nextPier - s) / L;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = Z[i] + (Z[i + 1] - Z[i]) * t;
        if (t >= 0 && t <= 1 && z > 2.2) {
          for (const side of [1, -1]) {
            for (const f of [0.85, 0.65, 0.45]) {
              const cx = x - uy * hs * f * side, cy = y + ux * hs * f * side;
              if (pierBlocked(map, cx, cy, ux, uy, 0.65, z)) continue;
              const g = groundUnder(map, cx, cy);
              B.wallBox('concrete', cx - uy * 0.65, cy + ux * 0.65, cx + uy * 0.65, cy - ux * 0.65, 1.3, g, z - DECK_T, g, z - DECK_T);
              break;
            }
          }
        }
      }
      nextPier += PIER_EVERY;
    }
    while (r.tunnel && nextLight < s + L) {
      const t = (nextLight - s) / L;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = Z[i] + (Z[i + 1] - Z[i]) * t;
      if (z < -3) {
        const top = roofTopAt(elev, x, y, z) - ROOF_T;
        B.wallBox('lamp', x - ux * 0.9, y - uy * 0.9, x + ux * 0.9, y + uy * 0.9, 0.35, top - 0.12, top - 0.01, top - 0.12, top - 0.01);
      }
      nextLight += LIGHT_EVERY;
    }
    s += L;
  }

  // deck ends: abutment block where the road comes off the viaduct
  if (deck) {
    for (const i of [0, n - 1]) {
      if (Z[i] < 1.5 || deckContinues(map, r, P[i])) continue;
      const j = i === 0 ? 1 : n - 2;
      const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      const cx = P[i][0] + ux * 0.8, cy = P[i][1] + uy * 0.8;
      if (pierBlocked(map, cx, cy, ux, uy, hs, Z[i])) continue;
      const g = groundUnder(map, cx, cy);
      B.wallBox('concrete', cx - uy * hs, cy + ux * hs, cx + uy * hs, cy - ux * hs, 1.6, g, Z[i] - DECK_T + 0.05, g, Z[i] - DECK_T + 0.05);
    }
  }

  // tunnel portals: where the covered section opens into the cutting
  if (r.tunnel) {
    for (const i of [0, n - 1]) {
      if (Z[i] > -2) continue;
      const j = i === 0 ? 1 : n - 2;
      const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], l = Math.hypot(dx, dy) || 1;
      const px = P[i][0] + dx / l * 3, py = P[i][1] + dy / l * 3;
      if (coveredSpanAt(elev, px, py)) continue;
      const top = roofTopAt(elev, P[i][0], P[i][1], Z[i]);
      const e1 = edge(i, 1, hs + WALL_T), e2 = edge(i, -1, hs + WALL_T);
      B.wallBox('wall', e1[0], e1[1], e2[0], e2[1], 0.6, top - ROOF_T - 0.6, Math.max(top, -0.02), top - ROOF_T - 0.6, Math.max(top, -0.02));
      // a coping over the portal hides the jagged edge of the cut-away ground
      const cy = Math.max(top, -0.02) + 0.04, bx = -dx / l * COPING, by = -dy / l * COPING, fx = dx / l * 0.3, fy = dy / l * 0.3;
      B.quad('wall', [e1[0] + fx, cy, e1[1] + fy], [e2[0] + fx, cy, e2[1] + fy], [e2[0] + bx, cy, e2[1] + by], [e1[0] + bx, cy, e1[1] + by]);
    }
  }

  // retaining walls, fences and crash barriers from elevation.js' wall pieces;
  // a breakable section's vertex range goes along (structureGroup)
  const breakable = (w, wi, m, draw) => {
    if (!w.brk) { draw(); return; }
    const h = { m, a: B.mark(m), b: 0, wi, ax: w.ax, ay: w.ay };
    draw();
    h.b = B.mark(m);
    (B.hide || (B.hide = [])).push(h);
  };
  // the ground is cut away (cutmask3d.js, ~1 m texels) a little past the
  // outer face of an open cutting's wall: a coping strip at street level
  // covers the edge of the hole (not where a street runs along the top)
  const coping = (w) => {
    if (!w.coping) return;
    const ox = -w.nx, oy = -w.ny, i0 = -WALL_T / 2, i1 = WALL_T / 2 + w.coping;
    const at = (i, y) => [[w.ax + ox * i, y, w.ay + oy * i], [w.bx + ox * i, y, w.by + oy * i]];
    const [a0, b0] = at(i0, 0.04), [a1, b1] = at(i1, 0.04);
    B.quad('wall', a0, b0, b1, a1);
    // short of a street alongside: sloping down under its ribbon
    if (w.coping < COPING) { const [a2, b2] = at(i1 + 0.25, 0); B.quad('wall', a1, b1, b2, a2); }
  };
  for (const w of elev.skirts || []) {
    if (w.seg.r !== r) continue;
    const top = w.top ?? 0.04;
    B.wallBox('wall', w.ax, w.ay, w.bx, w.by, WALL_T, w.za - 0.1, top, w.zb - 0.1, top);
    coping(w);
  }
  // between two sunken carriageways without a wall: a floor strip across
  for (const f of elev.floors || []) {
    if (f.seg.r !== r) continue;
    const ox = -f.nx, oy = -f.ny, i0 = -(WALL_T / 2 + 0.4), i1 = f.reach + 0.3;
    B.quad('concrete', [f.ax + ox * i0, f.za - 0.03, f.ay + oy * i0], [f.bx + ox * i0, f.zb - 0.03, f.by + oy * i0], [f.bx + ox * i1, (f.fb ?? f.zb) - 0.03, f.by + oy * i1], [f.ax + ox * i1, (f.fa ?? f.za) - 0.03, f.ay + oy * i1]);
  }
  for (let wi = 0; wi < elev.walls.length; wi++) {
    const w = elev.walls[wi];
    if (w.seg.r !== r) continue;
    if (w.kind === 'cut') {
      const top = w.top;
      if (w.low) B.wallBox('wall', w.ax, w.ay, w.bx, w.by, WALL_T, w.za - 0.1, top + 0.05, w.zb - 0.1, top + 0.05);
      if (!w.parapet && Math.abs(top) < 0.05) coping(w);
      if (w.fence) {
        breakable(w, wi, 'fence', () => {
          B.wallBox('fence', w.ax, w.ay, w.bx, w.by, 0.06, top + FENCE_H - 0.08, top + FENCE_H, top + FENCE_H - 0.08, top + FENCE_H);
          B.wallBox('fence', w.ax, w.ay, w.bx, w.by, 0.04, top + 0.45, top + 0.5, top + 0.45, top + 0.5);
          B.post('fence', w.ax, w.ay, 0.07, top, top + FENCE_H);
        });
      }
    } else if (w.low && w.kind === 'barrier') {
      if (deck) B.wallBox('concrete', w.ax, w.ay, w.bx, w.by, 0.32, w.za - 0.05, w.za + BARRIER_H, w.zb - 0.05, w.zb + BARRIER_H);
      else {
        breakable(w, wi, 'steel', () => {
          B.wallBox('steel', w.ax, w.ay, w.bx, w.by, 0.12, w.za + 0.5, w.za + 0.8, w.zb + 0.5, w.zb + 0.8);
          B.post('steel', w.ax, w.ay, 0.12, w.za, w.za + 0.75);
        });
      }
    }
  }

  for (const [P, a, b] of copingBends(elev)) {
    if (a.w.seg.r !== r) continue;
    const r0 = a.off - WALL_T / 2, r1 = a.off + WALL_T / 2 + Math.min(a.w.coping, b.w.coping);
    let mx = a.n[0] + b.n[0], my = a.n[1] + b.n[1];
    const ml = Math.hypot(mx, my);
    mx /= ml; my /= ml;
    const at = (n, d) => [P[0] + n[0] * d, 0.04, P[1] + n[1] * d];
    B.quad('wall', at(a.n, r0), at(a.n, r1), at([mx, my], r1), at([mx, my], r0));
    B.quad('wall', at([mx, my], r0), at([mx, my], r1), at(b.n, r1), at(b.n, r0));
  }

  return B.arrays();
}

// Where two coping strips beside an open cutting meet at a bend (the end of
// one segment, the start of the next), the outside of the bend between their
// square ends: [joint, end a, end b], a's road draws the wedge.
function copingBends(elev) {
  if (elev._copingBends) return elev._copingBends;
  const ends = new Map(), out = [];
  const strips = (elev.skirts || []).filter((w) => w.coping)
    .concat(elev.walls.filter((w) => w.kind === 'cut' && w.coping && !w.parapet && Math.abs(w.top) < 0.05));
  strips.forEach((w, i) => {
    const s = w.seg;
    for (const [px, py, qx, qy, ex, ey] of [[s.ax, s.ay, w.ax, w.ay, s.ux, s.uy], [s.bx, s.by, w.bx, w.by, -s.ux, -s.uy]]) {
      const dx = qx - px, dy = qy - py;
      if (Math.abs(dx * ex + dy * ey) > 0.01) continue;
      const off = Math.hypot(dx, dy);
      const k = Math.round(px * 20) + ',' + Math.round(py * 20);
      const list = ends.get(k) || ends.set(k, []).get(k);
      list.push({ w, i, P: [px, py], q: [qx, qy], n: [dx / off, dy / off], e: [ex, ey], off });
    }
  });
  for (const list of ends.values()) {
    for (const a of list) {
      for (const b of list) {
        if (b.i <= a.i || b.w.seg === a.w.seg) continue;
        if (a.n[0] * b.n[0] + a.n[1] * b.n[1] < -0.2) continue;
        const gx = b.q[0] - a.q[0], gy = b.q[1] - a.q[1];
        if (Math.hypot(gx, gy) < 0.02 || gx * a.e[0] + gy * a.e[1] > 0) continue;
        out.push([a.P, a, b]);
      }
    }
  }
  return (elev._copingBends = out);
}

// ------------------------------------------------------------------ decks over open cuts

function cutAt(elev, x, y) {
  const list = elev.grid.at(x, y);
  if (!list) return false;
  for (const s of list) {
    if (s.covered) continue;
    const cp = closestPointOnSegment(x, y, s.ax, s.ay, s.bx, s.by);
    const r = s.hs + WALL_T;
    if (cp.dist2 > r * r) continue;
    if (s.za + (s.zb - s.za) * cp.t < -RAISED) return true;
  }
  return false;
}

// Spans [s0, s1] along a polyline that lie over an open cutting.
function spansOverCut(elev, P) {
  const out = [];
  let s = 0, open = null;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(L));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      const hit = cutAt(elev, x, y);
      if (hit && open === null) open = s + L * t;
      if (!hit && open !== null) { out.push([open, s + L * t]); open = null; }
    }
    s += L;
  }
  if (open !== null) out.push([open, s]);
  return out;
}

function pointAt(P, sv) {
  let s = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (s + L >= sv || i === P.length - 2) {
      const t = L ? Math.min(1, Math.max(0, (sv - s) / L)) : 0;
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t];
    }
    s += L;
  }
  return P[0];
}

function deckSpans(B, elev, P, half) {
  for (const [s0, s1] of spansOverCut(elev, P)) {
    // reach over the cutting's walls, but never under a tunnel roof beside it
    const pa = pointAt(P, s0 - 1.5), pb = pointAt(P, s1 + 1.5);
    const a = coveredAt(elev, pa[0], pa[1]) ? s0 : s0 - 1.5, b = coveredAt(elev, pb[0], pb[1]) ? s1 : s1 + 1.5;
    const steps = Math.max(1, Math.ceil((b - a) / 3));
    for (let k = 0; k < steps; k++) {
      const p = pointAt(P, a + ((b - a) * k) / steps), q = pointAt(P, a + ((b - a) * (k + 1)) / steps);
      B.wallBox('concrete', p[0], p[1], q[0], q[1], half * 2, -0.85, 0.0, -0.85, 0.0);
    }
  }
}

// A street at street level crossing an open cutting gets a bridge deck.
export function buildOverpassDeck(r, map) {
  if (r._geoOverDeck === undefined) r._geoOverDeck = structureGroup(map, overpassDeckArrays(r, map));
  return r._geoOverDeck;
}
export function overpassDeckArrays(r, map) {
  const elev = map.elev;
  if (!elev.has || !elev.cuts.length || r.z) return null;
  const b = r.bounds;
  if (b && !elev.cuts.some((s) => Math.max(s.ax, s.bx) + 20 > b[0] && Math.min(s.ax, s.bx) - 20 < b[2] && Math.max(s.ay, s.by) + 20 > b[1] && Math.min(s.ay, s.by) - 20 < b[3])) return null;
  const B = new Buf();
  deckSpans(B, elev, r.pts, surfaceHalfWidth(r));
  return B.arrays();
}

// Rails crossing an open cutting, built once.
export function buildRailDecks(map) {
  const elev = map.elev;
  if (!elev.has || !elev.cuts.length) return null;
  const B = new Buf();
  for (const rail of map.rails || []) deckSpans(B, elev, rail.pts || rail, 2.6);
  return structureGroup(map, B.arrays());
}
