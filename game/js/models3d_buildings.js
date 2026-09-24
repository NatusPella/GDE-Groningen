import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, vcMaterial, GeoBuilder, createBrickDetailTexture, createRoofTileTexture } from './pixelart3d.js';
import { getLandmarkModel } from './landmarkmodels.js';
import { pointInPolygon } from './util.js';

// Procedural Groningen buildings. Geometry bakes absolute world coordinates
// (x, height, map-y) and is cached per building on b._geo3dParts: the wall
// extrusion plus one merged "detail" geometry (windows, doors, shopfronts,
// roofs, dormers, chimneys) drawn with four shared materials. Facade detail
// follows the real footprint edges; edges that touch a neighbouring building
// (party walls) get none, so terraces show their fronts and gables instead.

const LEVEL_HEIGHT = 3.1;
const TOWER_HEIGHT = 95;
const HOUSEBOAT_MAX_DEPTH = 3.5;
const CITY_CENTRE = [100, 77];
const CITY_CENTRE_R = 650;
const PART_CACHE_MAX = 800;
const MAX_WINDOWS = 420;

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// --- palette ------------------------------------------------------------------

const P = HABBO_PALETTE;
const BRICKS = new Set([P.brickRed, P.brickOrange, P.brickDark, P.brickBrown, P.brickBuff, 0x9a5a44, 0x84503c]);
const PALETTE_FAMILIES = [
  { wall: [P.brickRed, P.brickBrown, P.brickOrange, P.plasterWhite], roof: P.roofTerracotta, frame: P.frameWhite },
  { wall: [P.brickDark, P.brickRed, P.brickBrown, 0x9a5a44], roof: P.roofSlate, frame: P.frameWhite },
  { wall: [P.plasterWhite, P.wallCream, P.brickRed, 0xc9b99a], roof: P.roofSlate, frame: P.frameGreen },
  { wall: [P.brickBuff, P.brickOrange, P.brickBrown, P.wallCream], roof: 0x6b3a2a, frame: P.frameWhite },
  { wall: [P.brickBrown, P.brickDark, 0x84503c, P.brickRed], roof: P.roofBlue, frame: P.wallCream },
];
const INDUSTRIAL_WALLS = [0x7b7e82, 0x8c8a82, 0x5f6468, 0x6e5a48];
const INDUSTRIAL_ROOF = 0x5a5d60;
const DOOR_COLORS = [0x2f4a3a, 0x6b2a24, 0x1f2a3a, 0x4a3322, 0x232323, 0x3a5a6a];
const SIGN_COLORS = [0x2f4a3a, 0x5a1f22, 0x1f2a3a, 0x232323, 0xd6cab0, 0x7a5a2a];
const AWNING_COLORS = [0x2f5a3a, 0x7a2424, 0x24386a, 0x8a6a2a, 0x3a3a3c];
const GLASS_TONES = [0x26323a, 0x2c3a44, 0x34434d, 0x4b5b64, 0x5a4a3a, 0x2c3a44];
const STONE = 0xcdc8bd;
const HARDSTONE = P.hardstone;
const TRIM_DARK = 0x2e2c2a;

const LANDMARK_COLOR3D = {
  tower: 'brickRed', church: 'stoneGrey', modern: 'skyBlue', museum: 'brickOrange',
  station: 'metalGrey', university: 'woodDark', historic: 'woodMid', mall: 'wallYellow', stadium: 'grassGreen',
};
const LANDMARK_STONE = { university: 'stoneGrey', historic: 'wallCream' };
const ACCENT_COLOR = { museum: 'wallYellow', modern: 'white', mall: 'brickOrange' };

// --- shared materials ------------------------------------------------------------

const brickTexture = createBrickDetailTexture();
brickTexture.repeat.set(2, 2);
const tileTexture = createRoofTileTexture();

const wallMatCache = new Map();
function wallMaterial(hex) {
  let m = wallMatCache.get(hex);
  if (!m) {
    m = BRICKS.has(hex)
      ? habboMaterial(shade(hex, 1.1), { map: brickTexture, side: THREE.DoubleSide })
      : habboMaterial(hex, { side: THREE.DoubleSide });
    m.onBeforeCompile = wallContactOnBeforeCompile;
    wallMatCache.set(hex, m);
  }
  return m;
}
const roofMatCache = new Map();
function roofMaterial(hex) {
  let m = roofMatCache.get(hex);
  if (!m) {
    m = habboMaterial(shade(hex, 1.08), { map: tileTexture, side: THREE.DoubleSide });
    roofMatCache.set(hex, m);
  }
  return m;
}
const flatRoofMaterial = habboMaterial(0x68686a);
const detailMaterial = vcMaterial({ side: THREE.DoubleSide });
const glassMaterial = vcMaterial({ roughness: 0.18, metalness: 0.35 });

// Night glow: window glass carries a per-window rank in uv.x and a marker in
// uv.y (-20..-19 homes, -40..-39 shops); a window lights up once the lit
// fraction passes its rank, so lights come on (and go off) one by one.
const windowGlow = { uNightGlow: { value: 0 }, uLitFrac: { value: 0 }, uShopFrac: { value: 0 } };
glassMaterial.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, windowGlow);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vWinUv;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWinUv = uv;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vWinUv;\nuniform float uNightGlow, uLitFrac, uShopFrac;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (vWinUv.y < -10.0 && uNightGlow > 0.0) {
        bool shop = vWinUv.y < -30.0;
        float rank = vWinUv.x;
        float on = step(rank, shop ? uShopFrac : uLitFrac);
        float v = shop ? vWinUv.y + 40.0 : vWinUv.y + 20.0;
        vec3 warm = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.76, 0.48), fract(rank * 7.13));
        if (!shop && fract(rank * 13.7) > 0.88) warm = vec3(0.5, 0.66, 1.0);
        totalEmissiveRadiance += warm * on * uNightGlow * mix(0.7, 1.0, v) * (shop ? 1.5 : 1.0);
      }`);
};

export function setNightFactor(glow, litFrac, shopFrac = litFrac) {
  windowGlow.uNightGlow.value = glow;
  windowGlow.uLitFrac.value = litFrac;
  windowGlow.uShopFrac.value = shopFrac;
}

// Darkens the bottom metre of walls a little: cheap contact shadow where
// facades meet the street.
function wallContactOnBeforeCompile(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vWallY;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallY = (modelMatrix * vec4(transformed, 1.0)).y;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vWallY;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 1.3, vWallY));');
}

const landmarkMaterials = Object.fromEntries(Object.entries(LANDMARK_COLOR3D).map(([k, key]) => [k, habboMaterial(P[key], { side: THREE.DoubleSide })]));
const landmarkStoneMaterials = Object.fromEntries(Object.entries(LANDMARK_STONE).map(([k, key]) => [k, habboMaterial(P[key], { side: THREE.DoubleSide })]));
const accentMaterials = Object.fromEntries(Object.entries(ACCENT_COLOR).map(([k, key]) => [k, habboMaterial(P[key], { side: THREE.DoubleSide })]));
const corniceMaterial = habboMaterial(P.wallCream, { side: THREE.DoubleSide });
const canopyMaterial = habboMaterial(P.metalGrey, { side: THREE.DoubleSide });
const eaveTrimMaterial = habboMaterial(0x3a3531, { side: THREE.DoubleSide });
const finialMaterial = habboMaterial(0xc9a04a, { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CONE = new THREE.ConeGeometry(1, 1, 8);

const G_DETAIL = 0, G_GLASS = 1, G_WALL = 2, G_ROOF = 3;

// --- optional neighbour lookup for party-wall detection ----------------------------

let buildingMap = null;
export function setBuildingMap(map) {
  buildingMap = map;
}
function mapRef() {
  return buildingMap || (typeof window !== 'undefined' && window.__debug && window.__debug.map) || null;
}

// --- footprint helpers ---------------------------------------------------------

function bboxOf(b) {
  const [minx, miny, maxx, maxy] = b.bounds;
  if (!b._ring) b._ring = outwardEdges(sanitizeFootprint(b.pts).pts);
  return {
    minx, miny, maxx, maxy, w: maxx - minx, d: maxy - miny,
    cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, cz: (miny + maxy) / 2,
    edges: b._ring,
  };
}

// Footprint edges with their outward unit normal (nx, ny) and tangent (tx, ty).
function outwardEdges(ring) {
  let area2 = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    area2 += a[0] * c[1] - c[0] * a[1];
  }
  const sign = area2 >= 0 ? 1 : -1;
  const edges = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    const dx = c[0] - a[0], dy = c[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.05) continue;
    edges.push({ ax: a[0], ay: a[1], bx: c[0], by: c[1], len, tx: dx / len, ty: dy / len, nx: sign * dy / len, ny: -sign * dx / len, party: false });
  }
  edges.area = Math.abs(area2) / 2;
  return edges;
}

// Minimum-area oriented rectangle over the footprint's edge directions; null
// unless the footprint fills most of it (pitched roofs need a rectangle).
const RIDGE_MIN_FILL = 0.85;
function rectangularFrame(edges) {
  let best = null;
  for (const e of edges) {
    const ux = e.tx, uy = e.ty;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of edges) {
      const u = p.ax * ux + p.ay * uy, v = -p.ax * uy + p.ay * ux;
      if (u < u0) u0 = u; if (u > u1) u1 = u;
      if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { ux, uy, u0, u1, v0, v1, area };
  }
  if (!best || edges.area / best.area < RIDGE_MIN_FILL) return null;
  return best;
}

function markPartyWalls(b, edges) {
  if (edges.partyChecked) return;
  const map = mapRef();
  if (!map) return;
  edges.partyChecked = true;
  const [minx, miny, maxx, maxy] = b.bounds;
  const near = map.buildingsNear((minx + maxx) / 2, (miny + maxy) / 2, Math.max(maxx - minx, maxy - miny) / 2 + 2)
    .filter((o) => o !== b && o.pts && o.bounds);
  if (!near.length) return;
  const inside = (x, y) => near.some((o) => x >= o.bounds[0] && x <= o.bounds[2] && y >= o.bounds[1] && y <= o.bounds[3] && pointInPolygon(x, y, o.pts));
  for (const e of edges) {
    const ts = e.len > 3 ? [0.2, 0.5, 0.8] : [0.5];
    let hits = 0;
    for (const t of ts) {
      if (inside(e.ax + e.tx * e.len * t + e.nx * 0.6, e.ay + e.ty * e.len * t + e.ny * 0.6)) hits++;
    }
    e.party = hits * 2 > ts.length;
  }
}

function familyIndexFor(box) {
  const gx = Math.round(box.cx / 20) * 20, gy = Math.round(box.cy / 20) * 20;
  return Math.floor(hash2(gx, gy) * PALETTE_FAMILIES.length);
}

function archetypeOf(b) {
  const t = b.type || 'yes';
  if (t === 'house' || t === 'detached' || t === 'terrace' || t === 'semidetached_house') return 'house';
  if (t === 'apartments' || t === 'residential' || t === 'dormitory' || t === 'school' || t === 'hospital' || t === 'civic' || t === 'public' || t === 'hotel' || t === 'sports_centre') return 'apartments';
  if (t === 'retail' || t === 'commercial' || t === 'office') return 'retail';
  if (t === 'industrial' || t === 'shed' || t === 'garage' || t === 'garages' || t === 'service' || t === 'construction' || t === 'carport' || t === 'guardhouse' || t === 'static_caravan' || t === 'water_tower' || t === 'roof') return 'industrial';
  if (t === 'houseboat') return 'houseboat';
  if (t === 'church' || t === 'cathedral') return 'church';
  if (t === 'yes' && b.h >= 5) return 'retail';
  return 'generic';
}

// --- footprint sanitization ---------------------------------------------------------
// Cleans near-duplicate points, collinear runs and self-intersecting rings (the
// latter fall back to the convex hull) so ExtrudeGeometry triangulates cleanly.
// b.pts itself is never modified (the 2D minimap reads it).

const DEDUP_EPS = 0.02;
const COLLINEAR_EPS = 0.02;
const PARAM_EPS = 1e-7;

function distSq(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function stripClosingDuplicate(pts) {
  if (pts.length > 1 && distSq(pts[0], pts[pts.length - 1]) <= DEDUP_EPS * DEDUP_EPS) return pts.slice(0, -1);
  return pts.slice();
}

function dedupeInterior(open) {
  const out = [];
  for (const p of open) {
    if (out.length === 0 || distSq(out[out.length - 1], p) > DEDUP_EPS * DEDUP_EPS) out.push(p);
  }
  while (out.length > 1 && distSq(out[0], out[out.length - 1]) <= DEDUP_EPS * DEDUP_EPS) out.pop();
  return out;
}

function collapseCollinear(ring) {
  let cur = ring;
  for (let pass = 0; pass < 4; pass++) {
    const n = cur.length;
    if (n < 4) break;
    const next = [];
    let changed = false;
    for (let i = 0; i < n; i++) {
      const prev = cur[(i - 1 + n) % n], p = cur[i], nxt = cur[(i + 1) % n];
      const ex = nxt[0] - prev[0], ey = nxt[1] - prev[1];
      const segLen = Math.hypot(ex, ey);
      if (segLen > 1e-9) {
        const cross = (p[0] - prev[0]) * ey - (p[1] - prev[1]) * ex;
        if (Math.abs(cross) / segLen < COLLINEAR_EPS) { changed = true; continue; }
      }
      next.push(p);
    }
    if (next.length < 3) break;
    cur = next;
    if (!changed) break;
  }
  return cur;
}

function segmentsCross(a, b, c, d) {
  const d1x = b[0] - a[0], d1y = b[1] - a[1];
  const d2x = d[0] - c[0], d2y = d[1] - c[1];
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return false;
  const t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / denom;
  const u = ((c[0] - a[0]) * d1y - (c[1] - a[1]) * d1x) / denom;
  return t > PARAM_EPS && t < 1 - PARAM_EPS && u > PARAM_EPS && u < 1 - PARAM_EPS;
}

function ringSelfIntersects(ring) {
  const n = ring.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = ring[j], d = ring[(j + 1) % n];
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function crossZ(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points) {
  const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const n = pts.length;
  if (n < 3) return pts;
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  const hull = lower.concat(upper);
  return hull.length >= 3 ? hull : pts.slice(0, Math.min(3, pts.length));
}

// Exported so a Node harness can verify this pipeline against citymap.json.
export function sanitizeFootprint(pts) {
  const open = stripClosingDuplicate(pts);
  const deduped = dedupeInterior(open);
  const collinearCleaned = collapseCollinear(deduped);
  const dedupRemoved = open.length - deduped.length;
  const collinearRemoved = deduped.length - collinearCleaned.length;

  let ring = collinearCleaned;
  let hullUsed = false;
  if (ring.length < 3 || ringSelfIntersects(ring)) {
    hullUsed = true;
    const hullSrc = deduped.length >= 3 ? deduped : (open.length >= 3 ? open : ring);
    let hull = convexHull(hullSrc);
    hull = collapseCollinear(hull);
    if (hull.length < 3) {
      const p = hull[0] || open[0] || pts[0];
      const e = 0.5;
      hull = [[p[0] - e, p[1] - e], [p[0] + e, p[1] - e], [p[0] + e, p[1] + e], [p[0] - e, p[1] + e]];
    }
    ring = hull;
  }
  return { pts: ring, neededCleanup: dedupRemoved > 0 || collinearRemoved > 0, hullUsed, dedupRemoved, collinearRemoved };
}

function shapeFromPts(pts) {
  const { pts: ring } = sanitizeFootprint(pts);
  const shape = new THREE.Shape();
  shape.moveTo(ring[0][0], -ring[0][1]);
  for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], -ring[i][1]);
  return shape;
}

function buildMainGeometry(b, depth) {
  const geo = new THREE.ExtrudeGeometry(shapeFromPts(b.pts), { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// --- facade primitives (wall-local: s along edge, y up, d outward) --------------------

function wp(e, s, y, d) {
  return [e.ax + e.tx * s + e.nx * d, y, e.ay + e.ty * s + e.ny * d];
}

const FACE_FRONT = 1, FACE_TOP = 2, FACE_BOTTOM = 4, FACE_SIDES = 8, FACE_ALL = 15;

function wallBox(B, e, s0, s1, y0, y1, d0, d1, color, group = G_DETAIL, faces = FACE_ALL) {
  const n = [e.nx, 0, e.ny], t = [e.tx, 0, e.ty];
  if (faces & FACE_FRONT) B.quadOut(wp(e, s0, y0, d1), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s0, y1, d1), n, color, group);
  if (faces & FACE_TOP) B.quadOut(wp(e, s0, y1, d0), wp(e, s1, y1, d0), wp(e, s1, y1, d1), wp(e, s0, y1, d1), [0, 1, 0], color, group);
  if (faces & FACE_BOTTOM) B.quadOut(wp(e, s0, y0, d0), wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s0, y0, d1), [0, -1, 0], color, group);
  if (faces & FACE_SIDES) {
    B.quadOut(wp(e, s0, y0, d0), wp(e, s0, y0, d1), wp(e, s0, y1, d1), wp(e, s0, y1, d0), [-t[0], 0, -t[2]], color, group);
    B.quadOut(wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s1, y1, d0), t, color, group);
  }
}

function wallQuad(B, e, s0, s1, y0, y1, d, color, group = G_DETAIL, uvs = null) {
  B.quadOut(wp(e, s0, y0, d), wp(e, s1, y0, d), wp(e, s1, y1, d), wp(e, s0, y1, d), [e.nx, 0, e.ny], color, group, uvs);
}

function glowUV(rank, shop = false) {
  const v = shop ? -40 : -20;
  return [rank, v, rank, v, rank, v + 1, rank, v + 1];
}

function addWindow(B, e, c, w, y0, y1, S, seed) {
  const f = 0.07;
  wallQuad(B, e, c - w / 2 - f, c + w / 2 + f, y0 - f, y1 + f, 0.04, S.frame);
  const glass = GLASS_TONES[Math.floor(hash2(seed, y0 * 3.1) * GLASS_TONES.length)];
  wallQuad(B, e, c - w / 2, c + w / 2, y0, y1, 0.056, glass, G_GLASS, glowUV(hash2(seed * 1.31, y0 * 7.7 + c)));
  const tY = y0 + (y1 - y0) * 0.72;
  wallQuad(B, e, c - w / 2, c + w / 2, tY - 0.03, tY + 0.03, 0.06, S.frame);
  if (w > 0.85) wallQuad(B, e, c - 0.03, c + 0.03, y0, tY, 0.06, S.frame);
  wallBox(B, e, c - w / 2 - f - 0.06, c + w / 2 + f + 0.06, y0 - f - 0.07, y0 - f, 0, 0.13, S.sill, G_DETAIL, FACE_FRONT | FACE_TOP);
  if (S.lintel) wallQuad(B, e, c - w / 2 - f - 0.05, c + w / 2 + f + 0.05, y1 + f, y1 + f + 0.16, 0.012, S.lintel);
}

function addDoor(B, e, c, w, S, opts = {}) {
  const h = opts.h ?? 2.2;
  const f = 0.08;
  wallBox(B, e, c - w / 2 - f, c + w / 2 + f, 0.12, h + 0.5 + f, 0, 0.06, S.frame, G_DETAIL, FACE_FRONT | FACE_SIDES | FACE_TOP);
  wallQuad(B, e, c - w / 2, c + w / 2, 0.15, h, 0.065, S.door);
  if (w > 1.3) wallQuad(B, e, c - 0.025, c + 0.025, 0.15, h, 0.07, shade(S.door, 0.7));
  wallQuad(B, e, c - w / 2, c + w / 2, h + 0.08, h + 0.5, 0.065, GLASS_TONES[1], G_GLASS);
  wallBox(B, e, c - w / 2 - 0.2, c + w / 2 + 0.2, 0, 0.15, 0, 0.4, STONE, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_SIDES);
  if (opts.canopy) wallBox(B, e, c - w / 2 - 0.35, c + w / 2 + 0.35, h + 0.62, h + 0.74, 0, 0.9, TRIM_DARK);
}

function addShopfront(B, e, s0, s1, top, S, seed) {
  const span = s1 - s0;
  wallBox(B, e, s0, s1, 0, 0.4, 0, 0.07, HARDSTONE, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_SIDES);
  const frameC = S.shopFrame;
  wallBox(B, e, s0, s1, 0.4, top, 0, 0.05, frameC, G_DETAIL, FACE_FRONT | FACE_SIDES);
  const n = Math.max(1, Math.round(span / 1.9));
  const bw = span / n;
  const doorBay = Math.floor(hash2(seed, 2.2) * n);
  const shopUV = glowUV(hash2(seed, 5.5), true);
  for (let i = 0; i < n; i++) {
    const a = s0 + i * bw + 0.07, b = s0 + (i + 1) * bw - 0.07;
    if (i === doorBay && bw > 1.1) {
      const dc = (a + b) / 2;
      wallQuad(B, e, dc - 0.5, dc + 0.5, 0.05, top - 0.55, 0.056, 0x1c2328, G_GLASS);
      wallQuad(B, e, dc - 0.5, dc + 0.5, top - 0.48, top - 0.07, 0.056, GLASS_TONES[2], G_GLASS, shopUV);
      wallQuad(B, e, a, dc - 0.57, 0.47, top - 0.07, 0.056, GLASS_TONES[3], G_GLASS, shopUV);
      wallQuad(B, e, dc + 0.57, b, 0.47, top - 0.07, 0.056, GLASS_TONES[3], G_GLASS, shopUV);
    } else {
      wallQuad(B, e, a, b, 0.47, top - 0.07, 0.056, GLASS_TONES[(i + Math.floor(seed * 7)) % 4 + 1], G_GLASS, shopUV);
    }
  }
  wallBox(B, e, s0, s1, top, top + 0.5, 0, 0.12, S.sign);
  if (S.awning) {
    const a0 = s0 + 0.15, a1 = s1 - 0.15, ya = top - 0.05, yb = top - 0.6, da = 0.12, db = 1.25;
    const strips = Math.max(1, Math.round((a1 - a0) / 0.45));
    const sw = (a1 - a0) / strips;
    const up = [e.nx * 0.45, 1, e.ny * 0.45];
    for (let i = 0; i < strips; i++) {
      const c = i % 2 ? 0xe3ddd0 : S.awning;
      const p0 = a0 + i * sw, p1 = p0 + sw;
      B.quadOut(wp(e, p0, ya, da), wp(e, p1, ya, da), wp(e, p1, yb, db), wp(e, p0, yb, db), up, c);
      B.quadOut(wp(e, p0, ya, da), wp(e, p1, ya, da), wp(e, p1, yb, db), wp(e, p0, yb, db), [-up[0], -1, -up[2]], shade(c, 0.6));
      wallQuad(B, e, p0, p1, yb - 0.22, yb, db, c);
    }
  }
}

// --- roofs --------------------------------------------------------------------------

function frameMapper(frame) {
  const { ux, uy } = frame;
  const alongU = frame.u1 - frame.u0 >= frame.v1 - frame.v0;
  const toWorld = (u, v, y) => [u * ux - v * uy, y, u * uy + v * ux];
  const R = alongU
    ? { a0: frame.u0, a1: frame.u1, c0: frame.v0, c1: frame.v1, P: (a, c, y) => toWorld(a, c, y), A: [ux, 0, uy], C: [-uy, 0, ux] }
    : { a0: frame.v0, a1: frame.v1, c0: frame.u0, c1: frame.u1, P: (a, c, y) => toWorld(c, a, y), A: [-uy, 0, ux], C: [ux, 0, uy] };
  R.cMid = (R.c0 + R.c1) / 2;
  R.half = (R.c1 - R.c0) / 2;
  R.len = R.a1 - R.a0;
  return R;
}

function sideOpen(edges, dir, minLen) {
  return edges.some((e) => !e.party && e.len >= minLen && e.nx * dir[0] + e.ny * dir[2] > 0.9);
}

function steppedGable(B, R, aEnd, inward, baseY, H, color) {
  const n = R.half * 2 > 6.5 ? 4 : 3;
  const sw = (R.half * 2) / (2 * n + 1);
  const sh = H / (n + 0.5) + 0.22;
  const pts = [[R.c0, baseY]];
  for (let i = 0; i < n; i++) {
    const y = baseY + (i + 1) * sh;
    pts.push([R.c0 + i * sw, y], [R.c0 + (i + 1) * sw, y]);
  }
  const crown = baseY + (n + 1) * sh;
  pts.push([R.cMid - sw / 2, crown], [R.cMid + sw / 2, crown]);
  for (let i = n - 1; i >= 0; i--) {
    const y = baseY + (i + 1) * sh;
    pts.push([R.c1 - (i + 1) * sw, y], [R.c1 - i * sw, y]);
  }
  pts.push([R.c1, baseY]);
  const t = 0.32;
  const outDir = [-R.A[0] * inward, 0, -R.A[2] * inward];
  const a1 = aEnd + inward * t;
  for (let i = 0; i < pts.length; i++) {
    const [c0, y0] = pts[i], [c1, y1] = pts[(i + 1) % pts.length];
    const q = [R.P(aEnd, c0, y0), R.P(aEnd, c1, y1), R.P(a1, c1, y1), R.P(a1, c0, y0)];
    const mid = [(c0 + c1) / 2 - R.cMid, (y0 + y1) / 2];
    const nrm = Math.abs(y1 - y0) < 1e-6 ? [0, y0 > baseY + 0.01 ? 1 : -1, 0] : [R.C[0] * Math.sign(mid[0]), 0, R.C[2] * Math.sign(mid[0])];
    B.quadOut(q[0], q[1], q[2], q[3], nrm, color, G_WALL);
  }
  for (const [a, dir] of [[aEnd, outDir], [a1, [-outDir[0], 0, -outDir[2]]]]) {
    for (let i = 0; i < n; i++) {
      const y = baseY + (i + 1) * sh;
      const yPrev = baseY + i * sh;
      const l0 = R.c0 + i * sw, r0 = R.c1 - i * sw;
      B.quadOut(R.P(a, l0, yPrev), R.P(a, r0, yPrev), R.P(a, r0, y), R.P(a, l0, y), dir, color, G_WALL);
    }
    const yTop = baseY + n * sh;
    B.quadOut(R.P(a, R.cMid - sw / 2, yTop), R.P(a, R.cMid + sw / 2, yTop), R.P(a, R.cMid + sw / 2, crown), R.P(a, R.cMid - sw / 2, crown), dir, color, G_WALL);
  }
  for (let i = 0; i <= n; i++) {
    const y = i < n ? baseY + (i + 1) * sh : crown;
    const spans = i < n ? [[R.c0 + i * sw, R.c0 + (i + 1) * sw], [R.c1 - (i + 1) * sw, R.c1 - i * sw]] : [[R.cMid - sw / 2, R.cMid + sw / 2]];
    for (const [l, r] of spans) {
      B.quadOut(R.P(aEnd - inward * 0.05, l - 0.04, y), R.P(aEnd - inward * 0.05, r + 0.04, y), R.P(a1, r + 0.04, y), R.P(a1, l - 0.04, y), [0, 1, 0], STONE);
    }
  }
}

function addPitchedRoof(B, R, baseY, H, S, opts) {
  const ov = opts.overhang ?? 0.3;
  const ovG = opts.hip ? ov : (opts.gableOverhang ?? 0.12);
  const slope = H / R.half;
  const topY = baseY + H;
  const yE = baseY - ov * slope;
  const th = 0.1;
  const roofC = S.roof;
  const fascia = S.fascia;
  const st = opts.stepped || [false, false];
  const a0 = R.a0 - (st[0] ? -0.18 : ovG), a1 = R.a1 + (st[1] ? -0.18 : ovG);
  const halfO = R.half + ov;
  let r0 = R.a0, r1 = R.a1;
  if (opts.hip) {
    r0 = a0 + halfO;
    r1 = a1 - halfO;
    if (r1 < r0) r0 = r1 = (a0 + a1) / 2;
  } else {
    r0 = a0;
    r1 = a1;
  }
  const slopeLen = Math.hypot(halfO, halfO * slope);
  for (const side of [-1, 1]) {
    const cE = side < 0 ? R.c0 - ov : R.c1 + ov;
    const out = [R.C[0] * side, 1 / Math.max(0.2, slope), R.C[2] * side];
    const E0 = R.P(a0, cE, yE), E1 = R.P(a1, cE, yE), T1 = R.P(r1, R.cMid, topY), T0 = R.P(r0, R.cMid, topY);
    B.quadOut(E0, E1, T1, T0, out, roofC, G_ROOF, [a0, slopeLen, a1, slopeLen, r1, 0, r0, 0]);
    const d = (p) => [p[0], p[1] - th, p[2]];
    B.quadOut(d(E0), d(E1), d(T1), d(T0), [-out[0], -1, -out[2]], shade(roofC, 0.55));
    B.quadOut(d(E0), d(E1), E1, E0, [R.C[0] * side, 0, R.C[2] * side], fascia);
    if (!opts.hip) {
      for (const [a, sgn] of [[a0, -1], [a1, 1]]) {
        const top = R.P(a, R.cMid, topY), eave = R.P(a, cE, yE);
        B.quadOut(eave, top, d(top), d(eave), [R.A[0] * sgn, 0, R.A[2] * sgn], fascia);
      }
    }
  }
  if (opts.hip) {
    for (const [a, r, sgn] of [[a0, r0, -1], [a1, r1, 1]]) {
      const L = R.P(a, R.c0 - ov, yE), Rr = R.P(a, R.c1 + ov, yE), T = R.P(r, R.cMid, topY);
      const endLen = Math.hypot(Math.abs(r - a), H + ov * slope);
      B.triOut(L, Rr, T, [R.A[0] * sgn, 1, R.A[2] * sgn], roofC, G_ROOF, [R.c0, endLen, R.c1, endLen, R.cMid, 0]);
      B.quadOut(R.P(a, R.c0 - ov, yE - th), R.P(a, R.c1 + ov, yE - th), Rr, L, [R.A[0] * sgn, 0, R.A[2] * sgn], fascia);
    }
  } else {
    for (const [a, sgn] of [[R.a0, -1], [R.a1, 1]]) {
      const stepped = opts.stepped && opts.stepped[sgn < 0 ? 0 : 1];
      if (stepped) {
        steppedGable(B, R, a, -sgn, baseY, H, S.wall);
      } else {
        B.triOut(R.P(a, R.c0, baseY), R.P(a, R.c1, baseY), R.P(a, R.cMid, topY), [R.A[0] * sgn, 0, R.A[2] * sgn], S.wall, G_WALL);
      }
    }
  }

  if (opts.chimney) {
    const ca = R.a0 + R.len * (0.2 + 0.6 * opts.chimney.t);
    const cc = R.cMid + opts.chimney.side * Math.min(0.7, R.half * 0.35);
    const yBase = topY - Math.abs(cc - R.cMid) * slope - 0.4;
    const hC = topY + 0.9 - yBase;
    const c = R.P(ca, cc, yBase + hC / 2);
    const ry = Math.atan2(-R.A[2], R.A[0]);
    B.box(c[0], c[1], c[2], 0.6, hC, 0.6, shade(S.wallHex, 0.85), G_DETAIL, 0, ry, 0);
    B.box(c[0], yBase + hC + 0.04, c[2], 0.72, 0.08, 0.72, STONE, G_DETAIL, 0, ry, 0);
  }

  for (const dm of opts.dormers || []) {
    const side = dm.side;
    const dE = R.half * 0.42;
    const cF = (side < 0 ? R.c0 : R.c1) - side * dE;
    const yF = baseY + dE * slope;
    const hD = Math.min(1.45, topY - yF - 0.25);
    if (hD < 0.9) continue;
    const w = dm.w;
    const aL = dm.a - w / 2, aR = dm.a + w / 2;
    const cB = R.cMid;
    const yT = yF + hD;
    const yB = yF - 0.5;
    const outF = [R.C[0] * side, 0, R.C[2] * side];
    B.quadOut(R.P(aL, cF, yB), R.P(aR, cF, yB), R.P(aR, cF, yT), R.P(aL, cF, yT), outF, dm.wall);
    for (const [a, sg] of [[aL, -1], [aR, 1]]) {
      B.quadOut(R.P(a, cF, yB), R.P(a, cB, yB), R.P(a, cB, yT), R.P(a, cF, yT), [R.A[0] * sg, 0, R.A[2] * sg], dm.cheek);
    }
    const ov2 = 0.12;
    const tl = [R.P(aL - ov2, cF + side * ov2, yT), R.P(aR + ov2, cF + side * ov2, yT), R.P(aR + ov2, cB, yT), R.P(aL - ov2, cB, yT)];
    B.quadOut(tl[0], tl[1], tl[2], tl[3], [0, 1, 0], TRIM_DARK);
    const fb = (a, y) => R.P(a, cF + side * ov2, y);
    B.quadOut(fb(aL - ov2, yT - 0.2), fb(aR + ov2, yT - 0.2), fb(aR + ov2, yT), fb(aL - ov2, yT), outF, S.fascia);
    const gw = w - 0.36;
    const gy0 = yF + 0.1, gy1 = yT - 0.32;
    const fp = (a, y, d) => R.P(a, cF + side * d, y);
    B.quadOut(fp(dm.a - gw / 2 - 0.06, gy0 - 0.06, 0.02), fp(dm.a + gw / 2 + 0.06, gy0 - 0.06, 0.02), fp(dm.a + gw / 2 + 0.06, gy1 + 0.06, 0.02), fp(dm.a - gw / 2 - 0.06, gy1 + 0.06, 0.02), outF, S.frame);
    B.quadOut(fp(dm.a - gw / 2, gy0, 0.03), fp(dm.a + gw / 2, gy0, 0.03), fp(dm.a + gw / 2, gy1, 0.03), fp(dm.a - gw / 2, gy1, 0.03), outF, GLASS_TONES[2], G_GLASS, glowUV(hash2(dm.a * 1.7, gy0 * 3.3)));
    B.quadOut(fp(dm.a - 0.03, gy0, 0.035), fp(dm.a + 0.03, gy0, 0.035), fp(dm.a + 0.03, gy1, 0.035), fp(dm.a - 0.03, gy1, 0.035), outF, S.frame);
  }
}

// --- detail geometry per building ---------------------------------------------------

function buildDetailGeometry(b, box, archetype, depth, fine, fine2, wallHex, roofHex, famFrame) {
  const edges = box.edges;
  markPartyWalls(b, edges);
  const B = new GeoBuilder(4);
  const seed = fine * 1000 + fine2 * 37;
  const r = (k) => hash2(seed + k * 13.37, fine2 * 91 + k * 3.3);
  const centre = Math.hypot(box.cx - CITY_CENTRE[0], box.cy - CITY_CENTRE[1]) < CITY_CENTRE_R;
  const industrial = archetype === 'industrial';
  const houseboat = archetype === 'houseboat';
  const brick = BRICKS.has(wallHex);

  const S = {
    wall: wallHex,
    wallHex,
    roof: roofHex,
    frame: industrial ? 0x4a4d50 : (r(1) < 0.8 ? famFrame : P.frameWhite),
    sill: brick ? STONE : shade(wallHex, 0.85),
    lintel: brick ? shade(wallHex, 0.78) : null,
    door: DOOR_COLORS[Math.floor(r(2) * DOOR_COLORS.length)],
    fascia: r(3) < 0.7 ? P.frameWhite : TRIM_DARK,
    sign: SIGN_COLORS[Math.floor(r(4) * SIGN_COLORS.length)],
    shopFrame: r(5) < 0.5 ? 0x2a2b2d : P.frameWhite,
    awning: r(6) < 0.55 ? AWNING_COLORS[Math.floor(r(7) * AWNING_COLORS.length)] : null,
  };

  const floorCount = houseboat ? 1 : Math.min(14, Math.max(1, Math.round(depth / 3)));
  const floorH = depth / floorCount;
  const open = edges.filter((e) => !e.party && e.len >= 1.6);
  const mainEdge = (open.length ? open : edges).slice().sort((p, q) => q.len - p.len)[r(8) < 0.75 || open.length < 2 ? 0 : 1];

  const tallHistoric = centre && r(9) < 0.5;
  let style;
  if (industrial) style = { w: 1.6, bay: 4.5, hRatio: 0.35 };
  else if (archetype === 'apartments') style = { w: 1.3 + r(10) * 0.3, bay: 2.7 + r(11) * 0.5, hRatio: 0.52 };
  else if (houseboat) style = { w: 1.0, bay: 1.7, hRatio: 0.42 };
  else style = { w: tallHistoric ? 1.05 : 1.0 + r(10) * 0.3, bay: 2.1 + r(11) * 0.5, hRatio: tallHistoric ? 0.6 : 0.5 };

  let shopEdge = null;
  if (!industrial && !houseboat && mainEdge && !mainEdge.party && mainEdge.len >= 3.5 && floorH >= 2.6) {
    if (archetype === 'retail' || (centre && r(12) < 0.55)) shopEdge = mainEdge;
  }
  const shopTop = Math.min(floorH - 0.35, 3.2);

  if (!industrial) {
    const plinthH = houseboat ? 0.7 : 0.4;
    const plinthC = houseboat ? 0x2a2f38 : HARDSTONE;
    for (const e of open) wallBox(B, e, 0, e.len, 0, plinthH, 0, 0.035, plinthC, G_DETAIL, FACE_FRONT | FACE_TOP);
  }

  let windows = 0;
  const doorWide = archetype === 'apartments' || archetype === 'retail';
  for (const e of open) {
    const n = Math.max(1, Math.floor((e.len - 0.4) / style.bay));
    const bw = e.len / n;
    let w = Math.min(style.w, bw - 0.55);
    if (w < 0.45) continue;
    const doorHere = e === mainEdge && !shopEdge && !houseboat;
    const doorBay = doorWide ? Math.floor(n / 2) : (r(13) < 0.5 ? 0 : n - 1);
    for (let f = 0; f < floorCount; f++) {
      if (f === 0 && e === shopEdge) continue;
      if (industrial && f < floorCount - 1 && floorCount > 1) continue;
      const winH = Math.min(1.9, Math.max(0.8, floorH * style.hRatio));
      const y0 = f * floorH + Math.max(0.55, (floorH - winH) * 0.55);
      const y1 = Math.min(y0 + winH, (f + 1) * floorH - 0.3);
      if (y1 - y0 < 0.6) continue;
      for (let i = 0; i < n; i++) {
        const c = (i + 0.5) * bw;
        if (f === 0 && doorHere && i === doorBay) {
          const dw = doorWide ? Math.min(1.7, bw - 0.4) : Math.min(1.0, bw - 0.4);
          if (dw > 0.7) addDoor(B, e, c, dw, S, { h: Math.min(2.25, floorH - 0.65), canopy: archetype === 'apartments' });
          continue;
        }
        if (windows >= MAX_WINDOWS) continue;
        if (industrial) {
          wallQuad(B, e, c - w, c + w, y0, y0 + 0.7, 0.03, GLASS_TONES[2], G_GLASS, glowUV(0.3 + hash2(seed + c, y0) * 0.7));
          wallBox(B, e, c - w - 0.05, c + w + 0.05, y0 - 0.06, y0, 0, 0.06, S.frame, G_DETAIL, FACE_FRONT | FACE_TOP);
        } else {
          addWindow(B, e, c, w, y0, y1, S, seed + i * 7.7 + f * 3.1 + e.ax);
        }
        windows++;
      }
    }
    if (industrial && e === mainEdge && e.len > 4) {
      const dw = Math.min(3.5, e.len * 0.4);
      const c = e.len * (0.3 + 0.4 * r(14));
      const dh = Math.min(3.2, depth - 0.5);
      wallBox(B, e, c - dw / 2 - 0.1, c + dw / 2 + 0.1, 0, dh + 0.1, 0, 0.05, 0x3a3c3e, G_DETAIL, FACE_FRONT | FACE_SIDES | FACE_TOP);
      wallQuad(B, e, c - dw / 2, c + dw / 2, 0, dh, 0.055, 0x8a8c8e);
      for (let k = 1; k < 6; k++) wallQuad(B, e, c - dw / 2, c + dw / 2, (dh * k) / 6 - 0.02, (dh * k) / 6 + 0.02, 0.06, 0x6a6c6e);
    } else if (industrial && e === mainEdge) {
      addDoor(B, e, e.len / 2, Math.min(1, e.len - 0.6), S, { h: Math.min(2.1, depth - 0.3) });
    }
  }
  if (shopEdge) addShopfront(B, shopEdge, 0.15, shopEdge.len - 0.15, shopTop, S, seed);

  if (!industrial && archetype !== 'house' && floorCount >= 3 && r(15) < 0.45) {
    for (let f = 1; f < floorCount; f++) {
      for (const e of open) wallBox(B, e, 0, e.len, f * floorH - 0.08, f * floorH + 0.06, 0, 0.04, shade(wallHex, brick ? 1.35 : 0.88), G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
    }
  }

  const frame = rectangularFrame(edges);
  let roofKind = 'flat';
  if (frame && archetype !== 'church') {
    const shortSpan = Math.min(frame.u1 - frame.u0, frame.v1 - frame.v0);
    if ((archetype === 'house' || archetype === 'generic') && shortSpan <= 14) roofKind = 'pitched';
    else if (archetype === 'apartments' && floorCount <= 4 && shortSpan <= 13 && r(16) < 0.55) roofKind = 'pitched';
    else if (archetype === 'retail' && floorCount <= 3 && shortSpan <= 10 && r(16) < 0.6) roofKind = 'pitched';
    else if (industrial && shortSpan <= 24 && shortSpan >= 3 && r(16) < 0.55) roofKind = 'shed';
  }

  if (roofKind === 'pitched' || roofKind === 'shed') {
    const R = frameMapper(frame);
    const pitch = roofKind === 'shed' ? 0.26 : (archetype === 'house' ? 0.8 + r(17) * 0.2 : 0.7 + r(17) * 0.15);
    const H = Math.min(roofKind === 'shed' ? 3 : 7, R.half * Math.tan(pitch));
    const detached = !edges.some((e) => e.party);
    const endsOpen = [sideOpen(edges, [-R.A[0], 0, -R.A[2]], R.half), sideOpen(edges, R.A, R.half)];
    const hip = roofKind === 'pitched' && detached && R.len / (R.half * 2) < 2.6 && r(18) < 0.35;
    const steppedOK = roofKind === 'pitched' && !hip && R.half * 2 <= 8.5 && R.half * 2 >= 4 && (centre ? r(19) < 0.45 : r(19) < 0.12);
    const opts = {
      hip,
      overhang: roofKind === 'shed' ? 0.2 : 0.3,
      stepped: steppedOK ? endsOpen : null,
      chimney: roofKind === 'pitched' && r(20) < 0.6 ? { t: r(21), side: r(22) < 0.5 ? -1 : 1 } : null,
      dormers: [],
    };
    if (roofKind === 'pitched' && H >= 2.1 && R.len >= 4.5) {
      const dormerWall = r(23) < 0.5 ? P.frameWhite : 0x3e4449;
      for (const side of [-1, 1]) {
        const dir = [R.C[0] * side, 0, R.C[2] * side];
        if (!sideOpen(edges, dir, R.len * 0.6) || r(24 + side) > 0.6) continue;
        const count = R.len > 10 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          opts.dormers.push({ side, a: R.a0 + (R.len * (k + 1)) / (count + 1), w: Math.min(2.2, R.len / (count + 1) - 0.6), wall: dormerWall, cheek: dormerWall });
        }
      }
      opts.dormers = opts.dormers.filter((d) => d.w > 1.1);
    }
    addPitchedRoof(B, R, depth, H, S, opts);
  } else if (!houseboat) {
    const copeC = BRICKS.has(wallHex) ? STONE : shade(wallHex, 0.8);
    for (const e of open) wallBox(B, e, 0, e.len, depth - 0.18, depth + 0.3, -0.12, 0.08, copeC, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
    if (floorCount >= 3 && edges.area > 120) {
      const [minx, miny, maxx, maxy] = b.bounds;
      for (let k = 0; k < 2; k++) {
        const x = minx + (maxx - minx) * (0.3 + 0.4 * r(30 + k)), z = miny + (maxy - miny) * (0.3 + 0.4 * r(32 + k));
        if (!pointInPolygon(x, z, b.pts)) continue;
        const sx = 2 + r(34 + k) * 2.5, sz = 2 + r(36 + k) * 2, sy = 1.2 + r(38 + k) * 1.3;
        B.box(x, depth + sy / 2, z, sx, sy, sz, k ? 0x9a9690 : shade(wallHex, 0.9), G_DETAIL, 0, Math.atan2(-edges[0].ty, edges[0].tx), 0);
      }
    }
  } else {
    for (const e of open) wallBox(B, e, 0, e.len, depth - 0.1, depth + 0.08, -0.05, 0.12, 0x3a3c3e, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
  }
  return { geo: B.build(), roofKind };
}

// --- landmarks / churches (unchanged massing, new materials) ------------------------

function buildRidgeGeometry(frame, baseY, ridgeHeight) {
  const { ux, uy } = frame;
  const alongU = frame.u1 - frame.u0 >= frame.v1 - frame.v0;
  const toWorld = (u, v, y) => [u * ux - v * uy, y, u * uy + v * ux];
  let a0, a1, c0, c1;
  if (alongU) { a0 = frame.u0; a1 = frame.u1; c0 = frame.v0; c1 = frame.v1; }
  else { a0 = frame.v0; a1 = frame.v1; c0 = frame.u0; c1 = frame.u1; }
  const Pm = (a, c, y) => (alongU ? toWorld(a, c, y) : toWorld(c, a, y));
  const topY = baseY + ridgeHeight, cMid = (c0 + c1) / 2;
  const A = Pm(a0, c0, baseY), Bp = Pm(a0, c1, baseY), R0 = Pm(a0, cMid, topY);
  const C = Pm(a1, c0, baseY), D = Pm(a1, c1, baseY), R1 = Pm(a1, cMid, topY);
  const verts = [];
  for (const t of [[A, Bp, R0], [D, C, R1], [A, C, R1], [A, R1, R0], [Bp, D, R1], [Bp, R1, R0]]) for (const p of t) verts.push(p[0], p[1], p[2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  geo.addGroup(0, 6, 0);
  geo.addGroup(6, 12, 1);
  return geo;
}

function unit(group, geo, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2) {
  const longX = box.w >= box.d;
  const shortAxis = Math.min(box.w, box.d);
  const sw = Math.min(shortAxis * 0.55, 6);
  const steepleH = depth * 1.8 + 3;
  let x = longX ? box.minx + sw * 0.7 : box.cx;
  let z = longX ? box.cz : box.miny + sw * 0.7;
  if (!pointInPolygon(x, z, box.edges.map((e) => [e.ax, e.ay]))) {
    x = box.edges.reduce((acc, e) => acc + e.ax, 0) / box.edges.length;
    z = box.edges.reduce((acc, e) => acc + e.ay, 0) / box.edges.length;
  }
  unit(group, UNIT_BOX, wallMat, sw, steepleH, sw, x, steepleH / 2, z);
  unit(group, UNIT_BOX, eaveTrimMaterial, sw + 0.3, 0.4, sw + 0.3, x, steepleH - 0.2, z);
  const capH = sw * 1.6;
  unit(group, UNIT_CONE, roofMat, sw * 0.72, capH, sw * 0.72, x, steepleH + capH / 2, z);
  const crossBase = steepleH + capH;
  const crossH = sw * 0.6;
  const barT = Math.max(0.12, sw * 0.08);
  unit(group, UNIT_BOX, finialMaterial, barT, crossH, barT, x, crossBase + crossH / 2, z);
  unit(group, UNIT_BOX, finialMaterial, sw * 0.35, barT, barT, x, crossBase + crossH * 0.62, z);

  if (parts.roof === undefined) {
    const frame = rectangularFrame(box.edges);
    if (frame) {
      const frameShort = Math.min(frame.u1 - frame.u0, frame.v1 - frame.v0);
      parts.roof = buildRidgeGeometry(frame, depth, Math.min(frameShort * 0.55, 9));
    } else {
      parts.roof = null;
    }
  }
  if (parts.roof) group.add(new THREE.Mesh(parts.roof, [wallMat, roofMat]));
}

function addLandmarkDetail(group, b, box, parts, depth, roofMat, fine2) {
  const kind = b.landmarkKind;
  if (kind === 'tower') {
    const s2w = Math.max(1.6, box.w * 0.7), s2d = Math.max(1.6, box.d * 0.7);
    const s3w = Math.max(1.1, box.w * 0.45), s3d = Math.max(1.1, box.d * 0.45);
    const stage2H = TOWER_HEIGHT * 0.17;
    const stage3H = TOWER_HEIGHT * 0.1;
    let y = depth;
    unit(group, UNIT_BOX, roofMat, s2w, stage2H, s2d, box.cx, y + stage2H / 2, box.cz);
    y += stage2H;
    unit(group, UNIT_BOX, roofMat, s3w, stage3H, s3d, box.cx, y + stage3H / 2, box.cz);
    y += stage3H;
    const capRad = Math.max(1.3, (s3w + s3d) / 4.2);
    const capH = TOWER_HEIGHT * 0.1;
    unit(group, UNIT_CONE, landmarkMaterials.station, capRad, capH, capRad, box.cx, y + capH / 2, box.cz);
    y += capH;
    const finialH = TOWER_HEIGHT * 0.035;
    unit(group, UNIT_CONE, finialMaterial, capRad * 0.22, finialH, capRad * 0.22, box.cx, y + finialH / 2, box.cz);
  } else if (kind === 'church') {
    addChurchDetail(group, box, parts, depth, roofMat, landmarkMaterials.station, fine2);
  } else if (kind === 'station') {
    const margin = 2;
    const canopyY = depth + 1.2;
    unit(group, UNIT_BOX, canopyMaterial, box.w + margin * 2, 0.4, box.d + margin * 2, box.cx, canopyY, box.cz);
    const longX = box.w >= box.d;
    const spanLen = (longX ? box.w : box.d) + margin * 2;
    const pillarCount = Math.max(3, Math.min(8, Math.round(spanLen / 8)));
    const edgeOffset = (longX ? box.d : box.w) / 2 + margin - 0.4;
    for (let i = 0; i < pillarCount; i++) {
      const t = pillarCount > 1 ? (i / (pillarCount - 1) - 0.5) : 0;
      const along = t * (spanLen - 0.64);
      for (const side of [-1, 1]) {
        if (longX) unit(group, UNIT_BOX, canopyMaterial, 0.32, canopyY, 0.32, box.cx + along, canopyY / 2, box.cz + side * edgeOffset);
        else unit(group, UNIT_BOX, canopyMaterial, 0.32, canopyY, 0.32, box.cx + side * edgeOffset, canopyY / 2, box.cz + along);
      }
    }
  } else if (kind === 'museum' || kind === 'modern') {
    const bandH = Math.min(2.2, depth * 0.18);
    unit(group, UNIT_BOX, accentMaterials[kind], box.w + 0.3, bandH, box.d + 0.3, box.cx, depth * 0.6, box.cz);
  } else if (kind === 'mall') {
    const bandH = Math.min(3, depth * 0.22);
    unit(group, UNIT_BOX, accentMaterials.mall, box.w + 0.4, bandH, box.d + 0.4, box.cx, depth - bandH * 0.7, box.cz);
  } else if (kind === 'university' || kind === 'historic') {
    unit(group, UNIT_BOX, corniceMaterial, box.w + 0.5, 0.35, box.d + 0.5, box.cx, depth - 0.5, box.cz);
  }
}

function pickColors(b, box, archetype, fine) {
  if (archetype === 'industrial') {
    return { wallHex: INDUSTRIAL_WALLS[Math.floor(fine * INDUSTRIAL_WALLS.length)], roofHex: INDUSTRIAL_ROOF, frame: 0x4a4d50 };
  }
  const fam = PALETTE_FAMILIES[familyIndexFor(box)];
  return { wallHex: fam.wall[Math.floor(fine * fam.wall.length)], roofHex: fam.roof, frame: fam.frame };
}

// Bounded LRU over cached building geometry: evicted entries are disposed and
// rebuilt on demand. (A mesh still on screen just re-uploads its buffers.)
const partLRU = new Map();
function touchParts(b) {
  partLRU.delete(b);
  partLRU.set(b, true);
  while (partLRU.size > PART_CACHE_MAX) {
    const old = partLRU.keys().next().value;
    partLRU.delete(old);
    const parts = old._geo3dParts;
    if (parts) for (const k of Object.keys(parts)) if (parts[k] && parts[k].dispose) parts[k].dispose();
    old._geo3dParts = null;
  }
}

// Massing + rough colours for the far LOD layer (farlod.js).
export function buildingLodStyle(b) {
  const box = bboxOf(b);
  const archetype = archetypeOf(b);
  const fine = hash2(box.cx, box.cy);
  const depth = archetype === 'houseboat' ? Math.min(HOUSEBOAT_MAX_DEPTH, Math.max(1.6, b.h * LEVEL_HEIGHT)) : Math.max(2.4, b.h * LEVEL_HEIGHT);
  const { wallHex, roofHex } = pickColors(b, box, archetype, fine);
  const pitched = archetype === 'house' || (archetype !== 'industrial' && b.h <= 3 && Math.min(box.w, box.d) <= 11);
  return {
    ring: sanitizeFootprint(b.pts).pts,
    depth: pitched ? depth + 1.5 : depth,
    wallHex: BRICKS.has(wallHex) ? shade(wallHex, 0.95) : shade(wallHex, 0.9),
    roofHex: pitched ? shade(roofHex, 0.9) : 0x68686a,
  };
}

export function buildBuildingMesh(b) {
  if (b.landmark && b.name) {
    const model = getLandmarkModel(b.name);
    if (model) {
      const box = bboxOf(b);
      const group = new THREE.Group();
      model.position.x += box.cx;
      model.position.z += box.cy;
      group.add(model);
      return group;
    }
  }

  const box = bboxOf(b);
  const archetype = archetypeOf(b);
  const fine = hash2(box.cx, box.cy);
  const fine2 = hash2(box.cx * 1.7 + 3.1, box.cy * 1.3 - 2.7);

  let depth;
  if (b.landmark && b.landmarkKind === 'tower') depth = TOWER_HEIGHT * 0.6;
  else if (archetype === 'houseboat') depth = Math.min(HOUSEBOAT_MAX_DEPTH, Math.max(1.6, b.h * LEVEL_HEIGHT));
  else depth = Math.max(2.4, b.h * LEVEL_HEIGHT);

  if (!b._geo3dParts) b._geo3dParts = {};
  touchParts(b);
  const parts = b._geo3dParts;
  if (!parts.main) parts.main = buildMainGeometry(b, depth);
  const group = new THREE.Group();

  if (b.landmark) {
    const stone = LANDMARK_STONE[b.landmarkKind] ? landmarkStoneMaterials[b.landmarkKind] : null;
    const base = landmarkMaterials[b.landmarkKind] || wallMaterial(P.brickRed);
    group.add(new THREE.Mesh(parts.main, stone || base));
    addLandmarkDetail(group, b, box, parts, depth, base, fine2);
    return group;
  }

  const { wallHex, roofHex, frame } = pickColors(b, box, archetype, fine);
  const wallMat = wallMaterial(wallHex);
  const roofMat = roofMaterial(roofHex);
  group.add(new THREE.Mesh(parts.main, [flatRoofMaterial, wallMat]));

  if (archetype === 'church') {
    addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2);
    return group;
  }

  if (!parts.detail) parts.detail = buildDetailGeometry(b, box, archetype, depth, fine, fine2, wallHex, roofHex, frame).geo;
  group.add(new THREE.Mesh(parts.detail, [detailMaterial, glassMaterial, wallMat, roofMat]));
  return group;
}
