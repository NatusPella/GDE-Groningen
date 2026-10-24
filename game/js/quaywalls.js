import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { rectOutside, countryBounds } from './countryfield.js';
import { runGeo } from './geojobs.js';
import { streamNearHere } from './streambudget.js';
import { geometryFromPlain } from './geoplain.js';
import { workerMapReady } from './roadsurface.js';
import { createBrickDetailTexture } from './pixelart3d.js';
import { onSettingsChange } from './settings.js';
import { getWaterIndex, addWaterObstacle, onTileCut } from './waterindex.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';
import { surfaceHalfWidth } from './elevation.js';
import { P } from './worldframe.js';
import { hash2 as hash } from './rng.js';

// Canal edges built per water polygon: brick quay walls with a stone coping,
// wet band and algae line, a paving apron hiding the terrain hole edge, and
// sloped grassy banks for ponds, parks and open water outside the centre.
// Extras (bollards, rings, ladders, reeds, debris, houseboats) live in one
// separate merged mesh per polygon so 'laag' can hide them.

const [CENTRE_X, CENTRE_Y] = [100.63, 76.18];
const STEP = 3;
const TERRAIN_Y = -0.05;
const COPE_TOP = 0.07, COPE_FLUSH = 0.008, COPE_BOT = -0.13, COPE_OUT = 0.12, COPE_IN = 0.46;
const APRON = 3.6;
const TILE = 256;
const EXTRAS_DIST = 300;

const _c = new THREE.Color();
function lin(hex, mul = 1) {
  _c.setHex(hex);
  return [_c.r * mul, _c.g * mul, _c.b * mul];
}
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

class Acc {
  constructor() { this.p = []; this.c = []; this.uv = []; this.i = []; }
  v(x, y, z, col, u = 0, w = 0) {
    this.p.push(x, y, z); this.c.push(col[0], col[1], col[2]); this.uv.push(u, w);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c, nx, ny, nz) {
    const p = this.p;
    const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * nx + cy * ny + cz * nz < 0) this.i.push(a, c, b); else this.i.push(a, b, c);
  }
  quad(a, b, c, d, nx, ny, nz) { this.tri(a, b, c, nx, ny, nz); this.tri(a, c, d, nx, ny, nz); }
  // 8 corners: 0-3 bottom ring, 4-7 top ring; faces oriented away from the centre
  hexa(q, col) {
    let mx = 0, my = 0, mz = 0;
    for (const k of q) { mx += k[0] / 8; my += k[1] / 8; mz += k[2] / 8; }
    const ids = q.map((k) => this.v(k[0], k[1], k[2], col));
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    for (const f of faces) {
      let fx = 0, fy = 0, fz = 0;
      for (const j of f) { fx += q[j][0] / 4; fy += q[j][1] / 4; fz += q[j][2] / 4; }
      this.quad(ids[f[0]], ids[f[1]], ids[f[2]], ids[f[3]], fx - mx, fy - my, fz - mz);
    }
  }
  get empty() { return this.i.length === 0; }
  geometry(withColor = true, withUv = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    if (withColor) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

// Local frame helper: lx along (dx,dz), lz along (px,pz), ly up.
function frame(ox, oy, oz, dx, dz, px, pz) {
  return (lx, ly, lz) => [ox + lx * dx + lz * px, oy + ly, oz + lx * dz + lz * pz];
}
function box(acc, T, x0, x1, y0, y1, z0, z1, col) {
  acc.hexa([T(x0, y0, z0), T(x1, y0, z0), T(x1, y0, z1), T(x0, y0, z1), T(x0, y1, z0), T(x1, y1, z0), T(x1, y1, z1), T(x0, y1, z1)], col);
}
function prism(acc, T, cx, cz, r, y0, y1, sides, col, rTop = r) {
  const b = [], t = [];
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2;
    b.push(acc.v(...T(cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r), col));
    t.push(acc.v(...T(cx + Math.cos(a) * rTop, y1, cz + Math.sin(a) * rTop), col));
  }
  const c = T(cx, (y0 + y1) / 2, cz);
  const top = acc.v(...T(cx, y1, cz), col);
  const p = acc.p;
  for (let k = 0; k < sides; k++) {
    const k2 = (k + 1) % sides;
    const mx = (p[b[k] * 3] + p[b[k2] * 3]) / 2 - c[0], mz = (p[b[k] * 3 + 2] + p[b[k2] * 3 + 2]) / 2 - c[2];
    acc.quad(b[k], b[k2], t[k2], t[k], mx, 0, mz);
    acc.tri(t[k], t[k2], top, 0, 1, 0);
  }
}

let mats = null;
function materials() {
  if (mats) return mats;
  const brickTex = createBrickDetailTexture();
  mats = {
    brick: new THREE.MeshStandardMaterial({ color: 0xa35a44, map: brickTex, vertexColors: true, roughness: 0.93, metalness: 0, flatShading: true }),
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true }),
    extras: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05, flatShading: true, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: 0x27343a, roughness: 0.25, metalness: 0.1, emissive: 0xffb760, emissiveIntensity: 0, flatShading: true }),
  };
  for (const m of Object.values(mats)) m.userData.shared = true;
  return mats;
}

const extrasMeshes = new Set();
let showExtras = true;
onSettingsChange((st) => {
  const v = st.quality !== 'laag';
  if (v === showExtras) return;
  showExtras = v;
  for (const m of extrasMeshes) m.visible = v;
});

export function updateShore(night, camera) {
  if (mats) mats.glass.emissiveIntensity = night * 1.4;
  if (!showExtras || !camera) return;
  const cp = camera.position;
  for (const m of extrasMeshes) {
    if (!m.parent || !m.parent.parent) continue;
    const c = m.geometry.boundingSphere.center;
    const d = Math.hypot(c.x - cp.x, c.z - cp.z) - m.geometry.boundingSphere.radius;
    m.visible = d < EXTRAS_DIST;
  }
}

// --- classification -------------------------------------------------------

function inGreen(map, x, y) {
  for (const g of map.greenNear(x, y, 1)) {
    const b = g.bounds;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (pointInPolygon(x, y, g.pts)) return true;
  }
  return false;
}

// pad: beyond the carriageway, or with `deck` beyond the deck's own edge
// (buildBridgeDecks: sidewalks included)
function nearBridge(map, x, y, pad = 0.8, deck = false) {
  for (const r of map.roadsNear(x, y, 16)) {
    if (!r.bridge) continue;
    const t = (deck ? deckHalf(r) : r.width / 2) + pad;
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < t * t) return true;
    }
  }
  return false;
}

// On the paved surface of a street-level way (carriageway and sidewalk)?
function onStreet(map, x, y) {
  for (const rd of map.roadsNear(x, y, 12)) {
    if (rd.bridge || rd.tunnel) continue;
    const t = surfaceHalfWidth(rd) + 0.1, P = rd.pts, Z = rd.z;
    for (let i = 0; i < P.length - 1; i++) {
      if (Z && (Math.abs(Z[i]) > 0.3 || Math.abs(Z[i + 1]) > 0.3)) continue;
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < t * t) return true;
    }
  }
  return false;
}

function nearBuilt(map, x, y, r) {
  for (const b of map.buildingsNear(x, y, r)) {
    const bb = b.bounds;
    if (x > bb[0] - r && x < bb[2] + r && y > bb[1] - r && y < bb[3] + r) return true;
  }
  for (const rd of map.roadsNear(x, y, r + 6)) {
    if (rd.bridge || rd.cat === 'foot' || rd.cat === 'cycle') continue;
    const t = rd.width / 2 + r * 0.6;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, rd.pts[i][0], rd.pts[i][1], rd.pts[i + 1][0], rd.pts[i + 1][1]).dist2 < t * t) return true;
    }
  }
  return false;
}

// Splits the polygon outline into runs of consecutive wall/bank steps.
function shoreRuns(poly, map, index) {
  const pts = poly.pts;
  const pond = /vijver|plas|meer/i.test(poly.name || '');
  // a province polygon says what its shore is (waterlevels.js annotateProvinceWater):
  // 'oever' a natural bank, 'kade' a quay where it is built up
  const prov = poly.bank !== undefined;
  const runs = [];
  let cur = null;
  const close = () => { if (cur && cur.pts.length > 1) runs.push(cur); cur = null; };
  for (let e = 0; e < pts.length; e++) {
    const a = pts[e], b = pts[(e + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.25) continue;
    const ux = dx / len, uy = dy / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let nx = -uy, ny = ux;
    const leftWet = index.inWater(mx + nx * 0.7, my + ny * 0.7);
    const rightWet = index.inWater(mx - nx * 0.7, my - ny * 0.7);
    if (prov && onTileCut(a[0], a[1], b[0], b[1])) { close(); continue; }
    if (leftWet === rightWet) { close(); continue; }
    if (leftWet) { nx = -nx; ny = -ny; }
    // the cut along the map edge where the canal carries on into the province's tiles
    if (!prov && rectOutside(mx, my) > -0.5) { close(); continue; }
    const edgeN = [nx, ny];
    const n = Math.max(1, Math.ceil(len / STEP));
    for (let k = 0; k < n; k++) {
      const s0 = k / n, s1 = (k + 1) / n, sm = (s0 + s1) / 2;
      const x = a[0] + dx * sm, y = a[1] + dy * sm;
      let cls = null;
      const dry = !index.inWater(x + nx * 1.2, y + ny * 1.2);
      if (dry && nearBridge(map, x, y, 0.3, true)) cls = 'abut';
      else if (dry) {
        if (pond || inGreen(map, x + nx * 2.5, y + ny * 2.5)) cls = 'bank';
        else if (prov) cls = poly.bank === 'kade' ? 'wall' : 'bank';
        else if (Math.hypot(x - CENTRE_X, y - CENTRE_Y) > 1100 && !nearBuilt(map, x + nx * 3, y + ny * 3, 7)) cls = 'bank';
        else cls = 'wall';
      } else if (!index.inWater(x + nx * 0.15, y + ny * 0.15) && !nearBridge(map, x, y, 0.3, true)) {
        // a strip of dry ground narrower than that between two waters: the
        // banks either side meet in its middle
        cls = 'bank';
      }
      if (!cls) { close(); continue; }
      let prev = null;
      if (cur && cur.cls !== cls) { prev = cur; close(); }
      const x0 = a[0] + dx * s0, y0 = a[1] + dy * s0, x1 = a[0] + dx * s1, y1 = a[1] + dy * s1;
      if (!cur) {
        cur = { cls, pts: [[x0, y0]], segN: [] };
        // a wall running on into a bank: both mitre their shared end, no
        // wedge of bare terrain hole between the two at a corner
        if (prev) { const q = prev.pts[prev.pts.length - 1]; if (Math.hypot(q[0] - x0, q[1] - y0) < 0.01) { prev.nextN = edgeN; cur.prevN = prev.segN[prev.segN.length - 1]; } }
      } else {
        const last = cur.pts[cur.pts.length - 1];
        if (Math.hypot(last[0] - x0, last[1] - y0) > 0.01) { close(); cur = { cls, pts: [[x0, y0]], segN: [] }; }
      }
      cur.pts.push([x1, y1]);
      cur.segN.push(edgeN);
    }
  }
  close();
  if (runs.length > 1) {
    const f = runs[0], l = runs[runs.length - 1];
    const a = l.pts[l.pts.length - 1], b = f.pts[0];
    if (f.cls === l.cls && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) {
      runs[0] = { cls: f.cls, pts: l.pts.concat(f.pts.slice(1)), segN: l.segN.concat(f.segN), prevN: l.prevN, nextN: f.nextN };
      runs.pop();
    } else if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) {
      l.nextN = f.segN[0];
      f.prevN = l.segN[l.segN.length - 1];
    }
  } else if (runs.length === 1) {
    const r = runs[0], a = r.pts[r.pts.length - 1], b = r.pts[0];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) { r.pts.push(r.pts[1]); r.segN.push(r.segN[0]); }
  }
  for (const r of runs) r.N = miters(r);
  return runs;
}

function miters(run) {
  const out = [];
  const n = run.pts.length;
  for (let i = 0; i < n; i++) {
    const a = i === 0 && run.prevN ? run.prevN : run.segN[Math.max(0, i - 1)];
    const b = i === n - 1 && run.nextN ? run.nextN : run.segN[Math.min(run.segN.length - 1, i)];
    let mx = a[0] + b[0], my = a[1] + b[1];
    const l = Math.hypot(mx, my);
    if (l < 1e-3) { out.push([b[0], b[1]]); continue; }
    mx /= l; my /= l;
    const s = 1 / Math.max(0.45, mx * b[0] + my * b[1]);
    out.push([mx * s, my * s]);
  }
  return out;
}

// --- builders -------------------------------------------------------------

const DRY = [1, 1, 1];
const WET = [0.56, 0.53, 0.5];
const ALGAE = [0.34, 0.47, 0.24];
const SUB = [0.2, 0.24, 0.19];
const STONE = lin(0x9a958a);
const STONE_DARK = lin(0x7c776d);
const METAL = lin(0x2a2d2f);
const RUST = lin(0x4a3527);

// bare: abutment under a bridge deck - no coping that would poke through
// the deck; the apron (terrain level, under the deck) runs up to the wall.
function buildWallRun(run, wy, B, index, bare = false, map = null) {
  const { pts, N } = run;
  const mid = pts[pts.length >> 1];
  const wall = B('wall', mid[0], mid[1]), stone = B('stone', mid[0], mid[1]), apron = B('apron', mid[0], mid[1]);
  const rows = [
    [COPE_BOT, DRY], [wy + 0.62, DRY], [wy + 0.32, WET], [wy + 0.1, WET], [wy - 0.02, ALGAE], [wy - 0.62, SUB],
  ];
  let u = 0;
  const colIds = [];
  for (let i = 0; i < pts.length; i++) {
    if (i) u += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const tint = 0.92 + 0.14 * hash(Math.round(pts[i][0] * 0.3), Math.round(pts[i][1] * 0.3));
    colIds.push(rows.map(([y, c]) => wall.v(pts[i][0], y, pts[i][1], [c[0] * tint, c[1] * tint, c[2] * tint], u / 0.5, y / 0.5)));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const n = run.segN[i];
    for (let r = 0; r < rows.length - 1; r++) {
      wall.quad(colIds[i][r], colIds[i + 1][r], colIds[i + 1][r + 1], colIds[i][r + 1], -n[0], 0, -n[1]);
    }
  }
  for (const [i, sgn] of [[0, -1], [pts.length - 1, 1]]) {
    const p = pts[i], m = N[i];
    const seg = run.segN[Math.min(i, run.segN.length - 1)];
    const tx = seg[1] * sgn, ty = -seg[0] * sgn;
    const q = [p[0] + m[0] * COPE_IN, p[1] + m[1] * COPE_IN];
    const brickCol = [0.8, 0.8, 0.8];
    const a = wall.v(p[0], COPE_BOT, p[1], brickCol), b = wall.v(q[0], COPE_BOT, q[1], brickCol);
    const c = wall.v(q[0], wy - 0.62, q[1], SUB), d = wall.v(p[0], wy - 0.62, p[1], SUB);
    wall.quad(a, b, c, d, -tx, 0, -ty);
  }

  // coping blocks (none under a bridge deck: they would poke through it)
  for (let i = 0; i < pts.length - 1 && !bare; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const nb = Math.max(1, Math.round(len / 1.6));
    const sn = run.segN[i];
    for (let k = 0; k < nb; k++) {
      const t0 = k / nb, t1 = (k + 1) / nb;
      const n0 = k === 0 ? N[i] : sn, n1 = k === nb - 1 ? N[i + 1] : sn;
      const ax = p0[0] + (p1[0] - p0[0]) * t0, ay = p0[1] + (p1[1] - p0[1]) * t0;
      const bx = p0[0] + (p1[0] - p0[0]) * t1, by = p0[1] + (p1[1] - p0[1]) * t1;
      const shade = 0.86 + 0.2 * hash(ax * 1.7, ay * 1.3);
      const col = mixc(STONE, STONE_DARK, hash(ay, ax) * 0.5).map((v) => v * shade);
      const oa = [ax - n0[0] * COPE_OUT, ay - n0[1] * COPE_OUT], ob = [bx - n1[0] * COPE_OUT, by - n1[1] * COPE_OUT];
      const ia = [ax + n0[0] * COPE_IN, ay + n0[1] * COPE_IN], ib = [bx + n1[0] * COPE_IN, by + n1[1] * COPE_IN];
      const v = (q, y) => stone.v(q[0], y, q[1], col);
      // under a street or sidewalk running along the quay the coping lies flush
      const top = map && (onStreet(map, ia[0], ia[1]) || onStreet(map, ib[0], ib[1]) || onStreet(map, ax, ay) || onStreet(map, bx, by)) ? COPE_FLUSH : COPE_TOP;
      const t0a = v(oa, top), t0b = v(ob, top), t1b = v(ib, top), t1a = v(ia, top);
      const f0a = v(oa, COPE_BOT), f0b = v(ob, COPE_BOT);
      const w0a = v([ax, ay], COPE_BOT), w0b = v([bx, by], COPE_BOT);
      const b0a = v(ia, TERRAIN_Y - 0.02), b0b = v(ib, TERRAIN_Y - 0.02);
      stone.quad(t0a, t0b, t1b, t1a, 0, 1, 0);
      stone.quad(f0a, f0b, t0b, t0a, -sn[0], 0, -sn[1]);
      stone.quad(w0a, w0b, f0b, f0a, 0, -1, 0);
      stone.quad(t1a, t1b, b0b, b0a, sn[0], 0, sn[1]);
    }
  }

  // paving apron over the terrain hole edge
  const ids = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], m = N[i];
    let w = APRON;
    if (index.inWater(p[0] + m[0] * w, p[1] + m[1] * w) || index.inWater(p[0] + m[0] * w * 0.5, p[1] + m[1] * w * 0.5)) w = 0.7;
    ids.push([
      apron.v(p[0] + m[0] * (bare ? 0 : COPE_IN - 0.05), TERRAIN_Y, p[1] + m[1] * (bare ? 0 : COPE_IN - 0.05), DRY),
      apron.v(p[0] + m[0] * w, TERRAIN_Y, p[1] + m[1] * w, DRY),
    ]);
  }
  for (let i = 0; i < pts.length - 1; i++) apron.quad(ids[i][0], ids[i + 1][0], ids[i + 1][1], ids[i][1], 0, 1, 0);
}

const GRASS = lin(0x5f7d45);
const GRASS_DARK = lin(0x4d6a3a);
const MUD = lin(0x5a4a36);
const MUD_DARK = lin(0x2f2a22);

// Under a street or sidewalk ribbon (street level, not a bridge): a bank's
// crest stays below it instead of poking through the paving.
function underStreet(map, x, y) {
  for (const r of map.roadsNear(x, y, 8)) {
    if (r.bridge || r.z) continue;
    const t = r.width / 2 + (STREET_CATS.has(r.cat) ? 1.8 : 0) + 0.15;
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < t * t) return true;
    }
  }
  return false;
}
const STREET_CATS = new Set(['major', 'normal', 'minor']);

// Spots on the grassy banks where someone can sit at the waterline with
// their feet in the water (swimmers3d.js), by 64 m tile.
const BANK_TILE = 64;
const bankSeats = new Map();
const SEAT_OFF = -1.1;
export function bankSeatsNear(x, y, r) {
  const out = [];
  for (let tx = Math.floor((x - r) / BANK_TILE); tx <= Math.floor((x + r) / BANK_TILE); tx++) {
    for (let ty = Math.floor((y - r) / BANK_TILE); ty <= Math.floor((y + r) / BANK_TILE); ty++) {
      const list = bankSeats.get(tx + ',' + ty);
      if (list) for (const s of list) if (Math.hypot(s.x - x, s.y - y) < r) out.push(s);
    }
  }
  return out;
}

function bankSeatAt(p, m, prof) {
  // the bank height at SEAT_OFF, between the profile rows either side of it
  let z = null;
  for (let r = 0; r < prof.length - 1; r++) {
    const [o0, y0] = prof[r], [o1, y1] = prof[r + 1];
    if (o0 >= SEAT_OFF && o1 <= SEAT_OFF) { z = y0 + (y1 - y0) * (o0 - SEAT_OFF) / Math.max(1e-3, o0 - o1); break; }
  }
  if (z == null) return null;
  return { x: p[0] + m[0] * SEAT_OFF, y: p[1] + m[1] * SEAT_OFF, z, face: Math.atan2(-m[1], -m[0]) };
}

function addBankSeat(s) {
  const k = Math.floor(s.x / BANK_TILE) + ',' + Math.floor(s.y / BANK_TILE);
  let list = bankSeats.get(k);
  if (!list) bankSeats.set(k, list = []);
  if (list.some((q) => Math.hypot(q.x - s.x, q.y - s.y) < 4)) return;
  list.push(s);
}

function buildBankRun(run, wy, B, rnd, map, index) {
  const { pts, N } = run;
  const mid = pts[pts.length >> 1];
  const acc = B('stone', mid[0], mid[1]);
  const cols = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], m = N[i];
    const h = hash(p[0], p[1]), h2 = hash(p[1] + 3.1, p[0]), h3 = hash(p[0] * 0.37, p[1] * 0.41);
    const prof = [
      [APRON, TERRAIN_Y + 0.003, GRASS],
      [1.7, 0.02 + h * 0.04, mixc(GRASS, GRASS_DARK, h2)],
      [0.3 + (h3 - 0.5) * 0.3, -0.015 + h2 * 0.04, mixc(GRASS_DARK, MUD, 0.2 + h * 0.3)],
      [-0.5 + (h - 0.5) * 0.2, wy * 0.45, mixc(GRASS_DARK, MUD, 0.45)],
      [-1.2 + (h - 0.5) * 0.4, wy + 0.26 + (h2 - 0.5) * 0.12, mixc(MUD, GRASS_DARK, 0.25)],
      [-1.9 + (h2 - 0.5) * 0.4, wy - 0.06, mixc(MUD, MUD_DARK, 0.5)],
      [-2.9, wy - 0.66, MUD_DARK],
    ];
    const ml = Math.hypot(m[0], m[1]) || 1;
    const across = index.rayDist(p[0], p[1], m[0] / ml, m[1] / ml, 1.3);
    for (const row of prof) {
      if (across < 1.3 && row[0] > across / 2 / ml) row[0] = across / 2 / ml;
      if (row[1] > TERRAIN_Y + 0.003 && underStreet(map, p[0] + m[0] * row[0], p[1] + m[1] * row[0])) row[1] = TERRAIN_Y + 0.003;
    }
    if (i % 4 === 2 && h < 0.5) { const s = bankSeatAt(p, m, prof); if (s) sink.seats.push(s); }
    cols.push(prof.map(([o, y, c]) => acc.v(p[0] + m[0] * o, y, p[1] + m[1] * o, c)));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let r = 0; r < cols[i].length - 1; r++) {
      acc.tri(cols[i][r], cols[i + 1][r], cols[i + 1][r + 1], 0, 1, 0);
      acc.tri(cols[i][r], cols[i + 1][r + 1], cols[i][r + 1], 0, 1, 0);
    }
  }
  // reeds along the waterline
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const n = run.segN[i];
    for (let s = rnd() * 2; s < len; s += 1.2 + rnd() * 2.2) {
      if (rnd() < 0.4) continue;
      const t = s / len;
      const o = -1.3 - rnd() * 0.7;
      const x = p0[0] + (p1[0] - p0[0]) * t + n[0] * o, z = p0[1] + (p1[1] - p0[1]) * t + n[1] * o;
      reedTuft(B('extras', x, z), x, wy - 0.08, z, rnd);
    }
  }
}

const REED_BASE = lin(0x4f6b30);
const REED_TIP = lin(0x9aa05a);
const REED_HEAD = lin(0x4a3322);
function reedTuft(acc, x, y, z, rnd) {
  const blades = 4 + Math.floor(rnd() * 4);
  const scale = 0.7 + rnd() * 0.6;
  for (let b = 0; b < blades; b++) {
    const a = rnd() * Math.PI * 2, lean = 0.1 + rnd() * 0.25;
    const h = (0.9 + rnd() * 0.6) * scale;
    const ox = (rnd() - 0.5) * 0.3, oz = (rnd() - 0.5) * 0.3;
    const w = 0.035;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const base = mixc(REED_BASE, REED_TIP, rnd() * 0.3);
    const i0 = acc.v(x + ox - px, y, z + oz - pz, base);
    const i1 = acc.v(x + ox + px, y, z + oz + pz, base);
    const i2 = acc.v(x + ox + Math.cos(a) * lean * h, y + h, z + oz + Math.sin(a) * lean * h, REED_TIP);
    acc.i.push(i0, i1, i2);
    if (rnd() < 0.2) {
      const hx = x + ox + Math.cos(a) * lean * h * 0.8, hz = z + oz + Math.sin(a) * lean * h * 0.8, hy = y + h * 0.8;
      const q = [acc.v(hx, hy - 0.14, hz, REED_HEAD), acc.v(hx + 0.04, hy, hz, REED_HEAD), acc.v(hx - 0.02, hy, hz + 0.035, REED_HEAD), acc.v(hx - 0.02, hy, hz - 0.035, REED_HEAD), acc.v(hx, hy + 0.1, hz, REED_HEAD)];
      acc.i.push(q[0], q[1], q[2], q[0], q[2], q[3], q[0], q[3], q[1], q[4], q[2], q[1], q[4], q[3], q[2], q[4], q[1], q[3]);
    }
  }
}

function wallProps(run, wy, B, rnd) {
  const { pts } = run;
  let nextRing = 4 + rnd() * 8, nextBollard = 8 + rnd() * 20, nextLadder = 20 + rnd() * 40, nextDebris = 6 + rnd() * 30;
  let u = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (len < 1e-3) continue;
    const dx = (p1[0] - p0[0]) / len, dz = (p1[1] - p0[1]) / len;
    const n = run.segN[i];
    const at = (s) => [p0[0] + dx * s, p0[1] + dz * s];
    const isEnd = (s) => s < 0.8 || s > len - 0.8;
    while (nextRing < u + len) {
      const s = nextRing - u; nextRing += 14 + rnd() * 12;
      if (isEnd(s)) continue;
      const [x, z] = at(s);
      const acc = B('extras', x, z);
      const T = frame(x - n[0] * 0.02, 0, z - n[1] * 0.02, dx, dz, -n[0], -n[1]);
      box(acc, T, -0.09, 0.09, -0.52, -0.3, -0.02, 0.02, METAL);
      for (let k = 0; k < 4; k++) {
        const a0 = (k / 4 + 0.125) * Math.PI * 2, a1 = ((k + 1) / 4 + 0.125) * Math.PI * 2;
        const r = 0.12, cy = -0.52;
        const q0 = [Math.cos(a0) * r, cy + Math.sin(a0) * r], q1 = [Math.cos(a1) * r, cy + Math.sin(a1) * r];
        const t = 0.022;
        acc.hexa([
          T(q0[0] - t, q0[1] - t, 0.03), T(q1[0] - t, q1[1] - t, 0.03), T(q1[0] - t, q1[1] - t, 0.075), T(q0[0] - t, q0[1] - t, 0.075),
          T(q0[0] + t, q0[1] + t, 0.03), T(q1[0] + t, q1[1] + t, 0.03), T(q1[0] + t, q1[1] + t, 0.075), T(q0[0] + t, q0[1] + t, 0.075),
        ], RUST);
      }
    }
    while (nextBollard < u + len) {
      const s = nextBollard - u; nextBollard += 18 + rnd() * 26;
      if (isEnd(s)) continue;
      const [x, z] = at(s);
      const acc = B('extras', x, z);
      const T = frame(x + n[0] * 0.2, COPE_TOP, z + n[1] * 0.2, dx, dz, n[0], n[1]);
      prism(acc, T, 0, 0, 0.11, 0, 0.42, 7, METAL, 0.09);
      prism(acc, T, 0, 0, 0.15, 0.42, 0.5, 7, METAL, 0.12);
    }
    while (nextLadder < u + len) {
      const s = nextLadder - u; nextLadder += 45 + rnd() * 50;
      if (isEnd(s) || s < 1.2 || s > len - 1.2) continue;
      const [x, z] = at(s);
      const acc = B('extras', x, z);
      const T = frame(x, 0, z, dx, dz, -n[0], -n[1]);
      const bot = wy - 0.55;
      for (const sx of [-0.24, 0.24]) {
        box(acc, T, sx - 0.025, sx + 0.025, bot, COPE_TOP, 0.1, 0.15, METAL);
        box(acc, T, sx - 0.025, sx + 0.025, COPE_TOP, COPE_TOP + 0.55, -0.1, -0.05, METAL);
        box(acc, T, sx - 0.025, sx + 0.025, COPE_TOP + 0.5, COPE_TOP + 0.55, -0.1, 0.15, METAL);
        box(acc, T, sx - 0.025, sx + 0.025, COPE_TOP - 0.05, COPE_TOP, -0.1, 0.15, METAL);
      }
      for (let y = bot + 0.2; y < 0; y += 0.28) box(acc, T, -0.24, 0.24, y, y + 0.03, 0.11, 0.14, METAL);
    }
    while (nextDebris < u + len) {
      const s = nextDebris - u; nextDebris += 25 + rnd() * 45;
      if (isEnd(s)) continue;
      const q = at(s);
      debris(B('extras', q[0], q[1]), q, n, wy, rnd);
    }
    u += len;
  }
}

const DEBRIS_COLS = [lin(0x6b4a2e), lin(0x8a6440), lin(0x3b5a3a), lin(0xb8b0a0), lin(0x7a2e28)];
function debris(acc, [x, z], n, wy, rnd) {
  const o = 0.5 + rnd() * 2;
  const a = rnd() * Math.PI;
  const T = frame(x - n[0] * o, wy + 0.01, z - n[1] * o, Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a));
  const col = DEBRIS_COLS[Math.floor(rnd() * DEBRIS_COLS.length)];
  const kind = rnd();
  if (kind < 0.5) box(acc, T, -0.45, 0.45, -0.02, 0.03, -0.07, 0.07, col);
  else if (kind < 0.8) prism(acc, T, 0, 0, 0.05, -0.02, 0.05, 5, col);
  else box(acc, T, -0.12, 0.12, -0.03, 0.05, -0.1, 0.1, col);
}

// --- houseboats -------------------------------------------------------------

const HULLS = [0x2a2f33, 0x3b2a25, 0x243a2e, 0x1f2a3a, 0x40302a].map((h) => lin(h));
const CABINS = [0x6b8a5a, 0x3f6f8a, 0x8a5a3c, 0xd6cab0, 0xcfb46c, 0x5b3a2e, 0xa3b2a0, 0x9e3b2e].map((h) => lin(h));
const ROOFS = [0x3a3b3d, 0x464b52, 0x5b3a2e, 0x7a4a33].map((h) => lin(h));
const WOOD = lin(0x8a6440);
const WOOD_DARK = lin(0x5a3d26);
const FRAME = lin(0xece8de);
const LEAF = [lin(0x4a7236), lin(0x56793a), lin(0x3f6634)];
const POT = lin(0x8a4a33);
const FLOWER = [lin(0xc0392b), lin(0xe07aa0), lin(0xe8c23a)];

function houseboat(acc, glass, T, L, W, rnd, wy) {
  const hull = HULLS[Math.floor(rnd() * HULLS.length)];
  const cabin = CABINS[Math.floor(rnd() * CABINS.length)];
  const roof = ROOFS[Math.floor(rnd() * ROOFS.length)];
  const hw = W / 2;
  box(acc, T, -L / 2, L / 2, -0.5, 0.36, -hw, hw, hull);
  box(acc, T, -L / 2 - 0.03, L / 2 + 0.03, 0.3, 0.44, -hw - 0.04, hw + 0.04, mixc(hull, FRAME, 0.35));
  box(acc, T, -L / 2 + 0.1, L / 2 - 0.1, 0.36, 0.46, -hw + 0.1, hw - 0.1, WOOD);
  const bow = 1.4 + rnd() * 0.8, stern = 0.6 + rnd() * 0.6;
  const cx0 = -L / 2 + stern, cx1 = L / 2 - bow;
  const cw = hw - 0.28;
  const ch = 1.95 + rnd() * 0.35;
  const top = 0.46 + ch;
  box(acc, T, cx0, cx1, 0.46, top, -cw, cw, cabin);
  const nWin = Math.max(2, Math.floor((cx1 - cx0) / 2.1));
  for (let k = 0; k < nWin; k++) {
    const wx = cx0 + ((k + 0.5) / nWin) * (cx1 - cx0);
    for (const s of [-1, 1]) {
      box(acc, T, wx - 0.52, wx + 0.52, 1.12, 2.02, s * cw - 0.02, s * cw + 0.02, FRAME);
      box(glass, T, wx - 0.44, wx + 0.44, 1.2, 1.94, s * cw - 0.035, s * cw + 0.035, FRAME);
      if (rnd() < 0.35) {
        box(acc, T, wx - 0.45, wx + 0.45, 1.0, 1.12, s * (cw + 0.04), s * (cw + 0.2), WOOD_DARK);
        const fc = FLOWER[Math.floor(rnd() * FLOWER.length)];
        for (let f = -0.35; f <= 0.36; f += 0.175) box(acc, T, wx + f - 0.06, wx + f + 0.06, 1.12, 1.24, s * (cw + 0.06), s * (cw + 0.18), rnd() < 0.5 ? fc : LEAF[0]);
      }
    }
  }
  box(glass, T, cx1 - 0.02, cx1 + 0.03, 0.9, 1.85, -0.35, 0.35, FRAME);
  box(acc, T, cx1, cx1 + 0.02, 0.46, 2.0, -0.45, 0.45, FRAME);
  const kind = rnd();
  if (kind < 0.45) {
    const r0 = top, r1 = top + 0.55 + rnd() * 0.3, ov = 0.2;
    const a0 = T(cx0 - ov, r0, -cw - ov), b0 = T(cx1 + ov, r0, -cw - ov), a1 = T(cx0 - ov, r0, cw + ov), b1 = T(cx1 + ov, r0, cw + ov);
    const ra = T(cx0 - ov, r1, 0), rb = T(cx1 + ov, r1, 0);
    const ids = [a0, b0, a1, b1, ra, rb].map((q) => acc.v(q[0], q[1], q[2], roof));
    const up = (q) => [q[0] - (a0[0] + a1[0]) / 2, 1, q[2] - (a0[2] + a1[2]) / 2];
    const n0 = up(a0), n1 = up(a1);
    acc.quad(ids[0], ids[1], ids[5], ids[4], n0[0], 1, n0[2]);
    acc.quad(ids[2], ids[3], ids[5], ids[4], n1[0], 1, n1[2]);
    const g0 = [T(cx0, r0, -cw), T(cx0, r0, cw), T(cx0, r1 - 0.05, 0)].map((q) => acc.v(q[0], q[1], q[2], cabin));
    const g1 = [T(cx1, r0, -cw), T(cx1, r0, cw), T(cx1, r1 - 0.05, 0)].map((q) => acc.v(q[0], q[1], q[2], cabin));
    const e0 = T(-1, 0, 0), e1 = T(1, 0, 0), o = T(0, 0, 0);
    acc.tri(g0[0], g0[1], g0[2], e0[0] - o[0], 0, e0[2] - o[2]);
    acc.tri(g1[0], g1[1], g1[2], e1[0] - o[0], 0, e1[2] - o[2]);
  } else {
    box(acc, T, cx0 - 0.15, cx1 + 0.15, top, top + 0.12, -cw - 0.15, cw + 0.15, roof);
    if (kind > 0.75) {
      const ux1 = cx0 + Math.min(3, (cx1 - cx0) * 0.4);
      box(acc, T, cx0 + 0.3, ux1, top + 0.12, top + 1.2, -cw + 0.4, cw - 0.4, mixc(cabin, FRAME, 0.3));
      box(glass, T, cx0 + 0.5, ux1 - 0.2, top + 0.45, top + 0.95, -cw + 0.37, cw - 0.37, FRAME);
      box(acc, T, cx0 + 0.2, ux1 + 0.1, top + 1.2, top + 1.3, -cw + 0.3, cw - 0.3, roof);
    } else {
      for (let k = 0; k < 3; k++) {
        const px = cx0 + 0.6 + rnd() * (cx1 - cx0 - 1.2), pz = (rnd() - 0.5) * cw;
        box(acc, T, px - 0.18, px + 0.18, top + 0.12, top + 0.4, pz - 0.18, pz + 0.18, POT);
        box(acc, T, px - 0.28, px + 0.28, top + 0.4, top + 0.85, pz - 0.28, pz + 0.28, LEAF[k % 3]);
      }
    }
  }
  box(acc, T, cx0 + 0.6, cx0 + 0.76, top, top + 0.75, cw - 0.6, cw - 0.44, METAL);
  for (let k = 0; k < 2; k++) {
    const px = cx1 + 0.35 + rnd() * (bow - 0.8), pz = (rnd() - 0.5) * (W - 1.2);
    box(acc, T, px - 0.2, px + 0.2, 0.46, 0.8, pz - 0.2, pz + 0.2, POT);
    box(acc, T, px - 0.32, px + 0.32, 0.8, 1.3, pz - 0.32, pz + 0.32, LEAF[(k + 1) % 3]);
  }
  // steep gangway stair up to the quay (quay is on local +z)
  const gx = cx1 + bow * 0.5;
  const z0 = hw - 0.05, z1 = hw + 0.95, y0 = 0.46, y1 = COPE_TOP - wy + 0.02;
  for (const sx of [-0.3, 0.3]) {
    acc.hexa([T(gx + sx - 0.03, y0 - 0.12, z0), T(gx + sx + 0.03, y0 - 0.12, z0), T(gx + sx + 0.03, y1 - 0.12, z1), T(gx + sx - 0.03, y1 - 0.12, z1),
      T(gx + sx - 0.03, y0, z0), T(gx + sx + 0.03, y0, z0), T(gx + sx + 0.03, y1, z1), T(gx + sx - 0.03, y1, z1)], WOOD_DARK);
  }
  const steps = Math.max(2, Math.round((y1 - y0) / 0.24));
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, sy = y0 + (y1 - y0) * t, sz = z0 + (z1 - z0) * t;
    box(acc, T, gx - 0.27, gx + 0.27, sy - 0.04, sy, sz - 0.1, sz + 0.02, WOOD);
  }
  for (const fx of [-L * 0.3, L * 0.3]) prism(acc, T, fx, hw + 0.1, 0.12, -0.2, 0.3, 6, METAL);
}

function straights(run) {
  const out = [];
  let a = 0;
  for (let i = 1; i <= run.segN.length; i++) {
    if (i < run.segN.length && run.segN[i] === run.segN[a]) continue;
    out.push([run.pts[a], run.pts[i], run.segN[a]]);
    a = i;
  }
  return out;
}

function placeHouseboats(run, wy, B, map, index, rnd) {
  for (const [p0, p1, n] of straights(run)) {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (len < 13) continue;
    const dx = (p1[0] - p0[0]) / len, dz = (p1[1] - p0[1]) / len;
    let s = 1.5 + rnd() * 3;
    while (s + 11 < len - 1.5) {
      const L = 11 + rnd() * 5;
      if (s + L > len - 1.5) break;
      const W = 3.8 + rnd() * 0.9;
      const sm = s + L / 2;
      const mx = p0[0] + dx * sm, mz = p0[1] + dz * sm;
      const seed = hash(Math.round(mx), Math.round(mz));
      const width = index.rayDist(mx - n[0] * 0.05, mz - n[1] * 0.05, -n[0], -n[1], 60);
      const off = W / 2 + 0.35;
      const cx = mx - n[0] * off, cz = mz - n[1] * off;
      const ok = seed < 0.5 && width >= 17 &&
        !nearBridge(map, cx, cz, 12) && !nearBridge(map, cx + dx * L / 2, cz + dz * L / 2, 8) && !nearBridge(map, cx - dx * L / 2, cz - dz * L / 2, 8) &&
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => index.inWater(cx + dx * a * (L / 2 + 0.5) - n[0] * b * (W / 2 + 0.3), cz + dz * a * (L / 2 + 0.5) - n[1] * b * (W / 2 + 0.3)));
      if (ok) {
        houseboat(B('extras', cx, cz), B('glass', cx, cz), frame(cx, wy, cz, dx, dz, n[0], n[1]), L, W, rnd, wy);
        const hl = L / 2, hw = W / 2;
        sink.hulls.push([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => [cx + dx * u * hl + n[0] * w * hw, cz + dz * u * hl + n[1] * w * hw]));
        s += L + 2 + rnd() * 5;
      } else {
        s += 4 + rnd() * 6;
      }
    }
  }
}

// --- bridge decks -----------------------------------------------------------
// Bridges are just road ribbons at street level; from a boat you would look
// straight through them. Each bridge gets a DECK_T thick slab (fascia sides,
// soffit, end caps) over the stretch that crosses this water polygon, run a
// little onto the abutments.

const DECK_T = 0.5, DECK_OVERRUN = 1.5;
const DECK_SIDE = lin(0x8d887e), DECK_SOFFIT = lin(0x4a4843);
const DECK_WIDE = new Set(['major', 'normal', 'minor']);
const deckHalf = (r) => (r.width || 4) / 2 + (DECK_WIDE.has(r.cat) ? 1.8 : 0.15);

function buildBridgeDecks(poly, map, B) {
  const [bx0, by0, bx1, by1] = poly.bounds;
  const inPoly = (x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1 && pointInPolygon(x, y, poly.pts);
  for (const r of map.roadGrid.query(bx0, by0, bx1, by1)) {
    // (a movable span draws its own deck, movablebridges3d.js)
    if (!r.bridge || r.movable || r.pts.length < 2) continue;
    const half = deckHalf(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const n = Math.max(1, Math.ceil(len));
      let s0 = -1, s1 = -1;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        if (!inPoly(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) continue;
        if (s0 < 0) s0 = t * len;
        s1 = t * len;
      }
      if (s0 < 0) continue;
      const ext0 = i === 0 ? DECK_OVERRUN : 0.3, ext1 = i === r.pts.length - 2 ? DECK_OVERRUN : 0.3;
      deckSlab(B, a, b, len, Math.max(-ext0, s0 - DECK_OVERRUN), Math.min(len + ext1, s1 + DECK_OVERRUN), half);
    }
  }
}

function deckSlab(B, a, b, len, s0, s1, half) {
  const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len, nx = -ty, ny = tx;
  const P = (s, o) => [a[0] + tx * s + nx * o, a[1] + ty * s + ny * o];
  const mid = P((s0 + s1) / 2, 0);
  const acc = B('stone', mid[0], mid[1]);
  const top = -0.01, bot = -DECK_T;
  const face = (q, col, fx, fy, fz) => {
    const ids = q.map(([x, y, z]) => acc.v(x, y, z, col));
    acc.quad(ids[0], ids[1], ids[2], ids[3], fx, fy, fz);
  };
  const L0 = P(s0, -half), L1 = P(s1, -half), R0 = P(s0, half), R1 = P(s1, half);
  face([[L0[0], bot, L0[1]], [L1[0], bot, L1[1]], [R1[0], bot, R1[1]], [R0[0], bot, R0[1]]], DECK_SOFFIT, 0, -1, 0);
  face([[L0[0], bot, L0[1]], [L1[0], bot, L1[1]], [L1[0], top, L1[1]], [L0[0], top, L0[1]]], DECK_SIDE, -nx, 0, -ny);
  face([[R0[0], bot, R0[1]], [R1[0], bot, R1[1]], [R1[0], top, R1[1]], [R0[0], top, R0[1]]], DECK_SIDE, nx, 0, ny);
  face([[L0[0], bot, L0[1]], [R0[0], bot, R0[1]], [R0[0], top, R0[1]], [L0[0], top, L0[1]]], DECK_SOFFIT, -tx, 0, -ty);
  face([[L1[0], bot, L1[1]], [R1[0], bot, R1[1]], [R1[0], top, R1[1]], [L1[0], top, L1[1]]], DECK_SOFFIT, tx, 0, ty);
}

// --- entry ------------------------------------------------------------------

function chop(run, maxSeg) {
  if (run.segN.length <= maxSeg) return [run];
  const out = [];
  for (let i = 0; i < run.segN.length; i += maxSeg) {
    out.push({ cls: run.cls, pts: run.pts.slice(i, i + maxSeg + 1), segN: run.segN.slice(i, i + maxSeg), N: run.N.slice(i, i + maxSeg + 1) });
  }
  return out;
}

const MATERIAL_OF = { wall: 'brick', stone: 'stone', extras: 'extras', glass: 'glass' };

// A polygon's shore as geometry, plus the bank seats and houseboat hulls it
// places (applied by shoreGroup); no materials, scene or DOM, so it also runs
// in the geometry worker.
let sink = null;
export function shoreParts(poly, map, waterY, withApron) {
  sink = { seats: [], hulls: [] };
  const index = getWaterIndex(map, poly);
  const runs = shoreRuns(poly, map, index);
  const buckets = new Map();
  const B = (kind, x, z) => {
    const k = kind + ':' + Math.floor(x / TILE) + ',' + Math.floor(z / TILE);
    let a = buckets.get(k);
    if (!a) { buckets.set(k, a = new Acc()); a.kind = kind; }
    return a;
  };
  const rnd = rng(Math.floor(Math.abs(poly.pts[0][0] * 131 + poly.pts[0][1] * 17)) + poly.pts.length);
  const central = Math.hypot((poly.bounds[0] + poly.bounds[2]) / 2 - CENTRE_X, (poly.bounds[1] + poly.bounds[3]) / 2 - CENTRE_Y) < 1500;
  for (const run of runs) {
    if (run.cls === 'wall' && central) placeHouseboats(run, waterY, B, map, index, rnd);
    for (const piece of chop(run, 40)) {
      if (piece.cls === 'abut') {
        buildWallRun(piece, waterY, B, index, true);
      } else if (piece.cls === 'wall') {
        buildWallRun(piece, waterY, B, index, false, map);
        wallProps(piece, waterY, B, rnd);
      } else {
        buildBankRun(piece, waterY, B, rnd, map, index);
      }
    }
  }
  buildBridgeDecks(poly, map, B);
  const parts = [];
  for (const acc of buckets.values()) {
    if (acc.empty) continue;
    const isApron = acc.kind === 'apron';
    if (isApron && !withApron) continue;
    const plain = isApron || acc.kind === 'glass';
    parts.push({ kind: acc.kind, geo: acc.geometry(!plain, acc.kind === 'wall') });
  }
  const out = { parts, seats: sink.seats, hulls: sink.hulls };
  sink = null;
  return out;
}

function shoreGroup(map, { parts, seats, hulls }, apronMaterial) {
  for (const s of seats) addBankSeat(s);
  for (const h of hulls) addWaterObstacle(map, h);
  const M = materials();
  const group = new THREE.Group();
  for (const { kind, geo } of parts) {
    const mesh = new THREE.Mesh(geo, kind === 'apron' ? apronMaterial : M[MATERIAL_OF[kind]]);
    mesh.receiveShadow = true;
    if (kind === 'extras' || kind === 'glass') {
      mesh.castShadow = kind === 'extras';
      mesh.visible = showExtras;
      mesh.userData.noBatch = true; // toggled one by one (showExtras), so never merged
      extrasMeshes.add(mesh);
    }
    group.add(mesh);
  }
  return group.children.length ? group : null;
}

export function buildShore(poly, map, { waterY, apronMaterial }) {
  if (poly._shore !== undefined) return poly._shore;
  poly._shore = shoreGroup(map, shoreParts(poly, map, waterY, !!apronMaterial), apronMaterial);
  return poly._shore;
}

// The shores are built in the geometry worker (geokernels.js shore) from its
// own copy of the map once that is loaded (roadsurface.js), with the map
// rectangle sent once; until then, or without a worker, here as before. done(shore) may run before requestShore returns.
let shoreInitSent = false;
function shoreWorker() {
  if (!workerMapReady() || !countryBounds()) return false;
  if (!shoreInitSent) {
    shoreInitSent = true;
    runGeo('shoreInit', { bounds: countryBounds() });
  }
  return true;
}

export function requestShore(poly, map, opts, done) {
  if (poly._shore !== undefined) { done(poly._shore); return; }
  if (poly._shoreWait) { poly._shoreWait.push(done); return; }
  const wi = map.water.indexOf(poly);
  if (wi < 0 || !shoreWorker()) { done(buildShore(poly, map, opts)); return; }
  const wait = poly._shoreWait = [done];
  const near = streamNearHere((poly.bounds[0] + poly.bounds[2]) / 2, (poly.bounds[1] + poly.bounds[3]) / 2);
  runGeo('shore', { wi, n: poly.pts.length, x: poly.pts[0][0], y: poly.pts[0][1], waterY: opts.waterY, withApron: !!opts.apronMaterial }, (res) => {
    poly._shoreWait = null;
    if (poly._shore === undefined) {
      if (!res) buildShore(poly, map, opts);
      else poly._shore = shoreGroup(map, { parts: res.parts.map((q) => ({ kind: q.kind, geo: geometryFromPlain(q.geo) })), seats: res.seats, hulls: res.hulls }, opts.apronMaterial);
    }
    for (const f of wait) f(poly._shore);
  }, near);
}
