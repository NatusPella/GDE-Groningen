// Civil works under and beside the roads that are not at street level (see
// elevation.js): viaduct decks with piers and abutments, embankment slopes,
// retaining walls of cuttings with a fence on top, tunnel roofs with lights
// and portals, crash barriers, and decks under the streets and rails that
// cross an open cutting. Built per road, cached on it, streamed with the
// road meshes (buildRoadGroup).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y, closestPointOnSegment } from './util.js';
import {
  DECK_T, EMB_SLOPE, WALL_T, FENCE_H, BARRIER_H, ROOF_T, RAISED,
  surfaceHalfWidth, roofTopAt, coveredAt, lowerSurfaceAt,
} from './elevation.js';

const PIER_EVERY = 24;
const LIGHT_EVERY = 12;

const mats = {};
function mat(name) {
  if (mats[name]) return mats[name];
  const spec = {
    concrete: { color: 0xa39f96, roughness: 0.92 },
    wall: { color: 0x8f8b82, roughness: 0.95 },
    tunnel: { color: 0x5f5c57, roughness: 0.9 },
    grass: { color: 0x5c8a4d, roughness: 1 },
    steel: { color: 0xb9bdc1, roughness: 0.45, metalness: 0.6 },
    fence: { color: 0x2f3336, roughness: 0.7, metalness: 0.3 },
    lamp: { color: 0xfff2d0, emissive: 0xffe2a8, emissiveIntensity: 1.6, roughness: 0.4 },
  }[name];
  mats[name] = new THREE.MeshStandardMaterial({ ...spec, flatShading: true, side: THREE.DoubleSide });
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
  group() {
    const g = new THREE.Group();
    for (const [m, arr] of Object.entries(this.p)) {
      if (!arr.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat(m));
      mesh.castShadow = m !== 'lamp' && m !== 'fence';
      mesh.receiveShadow = true;
      mesh.userData.roadStructure = true;
      g.add(mesh);
    }
    return g.children.length ? g : null;
  }
}

function miters(P) {
  const n = P.length, segN = [], out = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy) || 1;
    segN.push([-dy / l, dx / l]);
  }
  for (let i = 0; i < n; i++) {
    if (i === 0) { out.push(segN[0]); continue; }
    if (i === n - 1) { out.push(segN[n - 2]); continue; }
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

function pierBlocked(elev, x, y, ux, uy, half, z) {
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    for (const a of [-0.8, 0.8]) {
      if (lowerSurfaceAt(elev, x - uy * half * f + ux * a, y + ux * half * f + uy * a, z)) return true;
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

function groundUnder(map, x, y) {
  return map.inWaterRaw(x, y) ? WATER_Y - 0.6 : -0.05;
}

// ------------------------------------------------------------------ elevated road

export function buildRoadStructure(r, map) {
  if (r._geoStruct !== undefined) return r._geoStruct;
  const elev = map.elev;
  const B = new Buf();
  const P = r.pts, Z = r.z, n = P.length;
  const hs = surfaceHalfWidth(r);
  const M = miters(P);
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
  for (const sg of elev.segs) if (sg.r === r) segOf.set(sg.i, sg);

  for (let i = 0; i < n - 1; i++) {
    const za = Z[i], zb = Z[i + 1];
    if (za > RAISED || zb > RAISED) {
      if (deck) deckBox(i, 0, 1, Math.max(za, 0), Math.max(zb, 0));
      else {
        const sg = segOf.get(i);
        const pieces = (sg && sg.pieces) || [{ t0: 0, t1: 1, over: false, retain: [false, false] }];
        let prevOver = null;
        for (const pc of pieces) {
          const a0 = Math.max(0, za + (zb - za) * pc.t0), b0 = Math.max(0, za + (zb - za) * pc.t1);
          if (pc.over) deckBox(i, pc.t0, pc.t1, a0, b0);
          else {
            [1, -1].forEach((side, j) => {
              const ea = lerp2(edge(i, side, hs), edge(i + 1, side, hs), pc.t0), eb = lerp2(edge(i, side, hs), edge(i + 1, side, hs), pc.t1);
              if (pc.retain[j]) {
                B.quad('wall', [ea[0], a0 + 0.02, ea[1]], [eb[0], b0 + 0.02, eb[1]], [eb[0], -0.05, eb[1]], [ea[0], -0.05, ea[1]]);
              } else {
                const fa = lerp2(edge(i, side, hs + a0 / EMB_SLOPE), edge(i + 1, side, hs + a0 / EMB_SLOPE), pc.t0);
                const fb = lerp2(edge(i, side, hs + b0 / EMB_SLOPE), edge(i + 1, side, hs + b0 / EMB_SLOPE), pc.t1);
                B.quad('grass', [ea[0], a0 + 0.015, ea[1]], [eb[0], b0 + 0.015, eb[1]], [fb[0], 0.0, fb[1]], [fa[0], 0.0, fa[1]]);
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
    if (r.tunnel && (za < -RAISED || zb < -RAISED)) {
      // roof slab underside across the tunnel, lights along the middle
      const off = hs + WALL_T;
      const l0 = edge(i, 1, off), r0 = edge(i, -1, off), l1 = edge(i + 1, 1, off), r1 = edge(i + 1, -1, off);
      const ta = roofTopAt(elev, P[i][0], P[i][1]) - ROOF_T, tb = roofTopAt(elev, P[i + 1][0], P[i + 1][1]) - ROOF_T;
      B.quad('tunnel', [l0[0], ta, l0[1]], [l1[0], tb, l1[1]], [r1[0], tb, r1[1]], [r0[0], ta, r0[1]]);
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
      // deck to a free spot, or leave it out
      for (const shift of PIER_SHIFTS) {
        const t = (nextPier + shift - s) / L;
        if (t < 0 || t > 1) continue;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = Z[i] + (Z[i + 1] - Z[i]) * t;
        if (z <= 2.2) break;
        if (pierBlocked(elev, x, y, ux, uy, half, z)) continue;
        const g = groundUnder(map, x, y);
        B.wallBox('concrete', x - uy * half, y + ux * half, x + uy * half, y - ux * half, 1.3, g, z - DECK_T, g, z - DECK_T);
        break;
      }
      nextPier += PIER_EVERY;
    }
    while (r.tunnel && nextLight < s + L) {
      const t = (nextLight - s) / L;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = Z[i] + (Z[i + 1] - Z[i]) * t;
      if (z < -3) {
        const top = roofTopAt(elev, x, y) - ROOF_T;
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
      if (pierBlocked(elev, cx, cy, ux, uy, hs, Z[i])) continue;
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
      if (coveredAt(elev, px, py)) continue;
      const top = roofTopAt(elev, P[i][0], P[i][1]);
      const e1 = edge(i, 1, hs + WALL_T), e2 = edge(i, -1, hs + WALL_T);
      B.wallBox('wall', e1[0], e1[1], e2[0], e2[1], 0.6, top - ROOF_T - 0.6, Math.max(top, -0.02), top - ROOF_T - 0.6, Math.max(top, -0.02));
    }
  }

  // retaining walls, fences and crash barriers from elevation.js' wall pieces
  for (const w of elev.walls) {
    if (w.seg.r !== r) continue;
    if (w.kind === 'cut') {
      const top = w.top;
      if (w.low) B.wallBox('wall', w.ax, w.ay, w.bx, w.by, WALL_T, w.za - 0.1, top + 0.05, w.zb - 0.1, top + 0.05);
      if (w.fence) {
        B.wallBox('fence', w.ax, w.ay, w.bx, w.by, 0.06, top + FENCE_H - 0.08, top + FENCE_H, top + FENCE_H - 0.08, top + FENCE_H);
        B.wallBox('fence', w.ax, w.ay, w.bx, w.by, 0.04, top + 0.45, top + 0.5, top + 0.45, top + 0.5);
        B.post('fence', w.ax, w.ay, 0.07, top, top + FENCE_H);
      }
    } else if (w.low) {
      if (deck) B.wallBox('concrete', w.ax, w.ay, w.bx, w.by, 0.32, w.za - 0.05, w.za + BARRIER_H, w.zb - 0.05, w.zb + BARRIER_H);
      else {
        B.wallBox('steel', w.ax, w.ay, w.bx, w.by, 0.12, w.za + 0.5, w.za + 0.8, w.zb + 0.5, w.zb + 0.8);
        B.post('steel', w.ax, w.ay, 0.12, w.za, w.za + 0.75);
      }
    }
  }

  r._geoStruct = B.group();
  return r._geoStruct;
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
    const a = s0 - 1.5, b = s1 + 1.5;
    const steps = Math.max(1, Math.ceil((b - a) / 3));
    for (let k = 0; k < steps; k++) {
      const p = pointAt(P, a + ((b - a) * k) / steps), q = pointAt(P, a + ((b - a) * (k + 1)) / steps);
      B.wallBox('concrete', p[0], p[1], q[0], q[1], half * 2, -0.85, 0.0, -0.85, 0.0);
    }
  }
}

// A street at street level crossing an open cutting gets a bridge deck.
export function buildOverpassDeck(r, map) {
  if (r._geoOverDeck !== undefined) return r._geoOverDeck;
  r._geoOverDeck = null;
  const elev = map.elev;
  if (!elev.has || !elev.cuts.length || r.z) return null;
  const b = r.bounds;
  if (b && !elev.cuts.some((s) => Math.max(s.ax, s.bx) + 20 > b[0] && Math.min(s.ax, s.bx) - 20 < b[2] && Math.max(s.ay, s.by) + 20 > b[1] && Math.min(s.ay, s.by) - 20 < b[3])) return null;
  const B = new Buf();
  deckSpans(B, elev, r.pts, surfaceHalfWidth(r));
  r._geoOverDeck = B.group();
  return r._geoOverDeck;
}

// Rails crossing an open cutting, built once.
export function buildRailDecks(map) {
  const elev = map.elev;
  if (!elev.has || !elev.cuts.length) return null;
  const B = new Buf();
  for (const rail of map.rails || []) deckSpans(B, elev, rail.pts || rail, 2.6);
  return B.group();
}
