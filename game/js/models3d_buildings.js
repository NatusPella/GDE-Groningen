import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, vcMaterial, GeoBuilder, createBrickDetailTexture, createRoofTileTexture, composeMatrix } from './pixelart3d.js';
import { getLandmarkModel } from './landmarkmodels.js';
import { hasLandmarkModel, buildLandmarkGeometry, LANDMARK_MATERIALS, setLandmarkNight } from './landmarks3d.js';
import { facadeLook } from './winkelkit.js';
import { capBuilding, ringArea } from './buildingcap.js';
import { glassMaterial, setGlassNight, paneUV, PANE_HOME, PANE_GROUND, PANE_SHOP, PANE_OFFICE } from './interiorglass.js';
import { pointInPolygon, segDist as segDistXY, WATER_Y } from './util.js';
import { passagesOf, doorsOf } from './passages.js';
import { applyPortalCut, buildPassageTunnels } from './portalcut3d.js';
import { buildMuseumInterior } from './museum3d.js';
import { buildInteriorOf } from './interieur3d.js';
import { marktKind, buildMarktGroup } from './marktgebouwen.js';
import { hash2 } from './rng.js';

// Procedural Groningen buildings. Geometry bakes absolute world coordinates
// (x, height, map-y) and is cached per building on b._geo3dParts: the wall
// extrusion plus one merged "detail" geometry (windows, doors, shopfronts,
// roofs, dormers, chimneys) drawn with four shared materials. Facade detail
// follows the real footprint edges; edges that touch a neighbouring building
// (party walls) get none, so terraces show their fronts and gables instead.

const LEVEL_HEIGHT = 3.1;
const TOWER_HEIGHT = 95;
const HOUSEBOAT_MAX_DEPTH = 4.2, HOUSEBOAT_MIN_DEPTH = 2.6;
// Houseboats are built from y=0 like any building, then the whole group is
// sunk so the hull sits HOUSEBOAT_DRAFT deep in the canal.
const HOUSEBOAT_DRAFT = 0.3;
export const HOUSEBOAT_BASE_Y = WATER_Y - HOUSEBOAT_DRAFT;
const HOUSEBOAT_HULL_H = 0.85;
const HOUSEBOAT_WALLS = [0x6b8a5a, 0x3f6f8a, 0x8a5a3c, 0xd6cab0, 0xcfb46c, 0x5b3a2e, 0xa3b2a0, 0x2f4a3a];
const CITY_CENTRE = { x: 100.63, y: 76.18 };
const CITY_CENTRE_R = 650;
const PART_CACHE_MAX = 800;
const MAX_WINDOWS = 420;


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
    applyPortalCut(m);
    wallMatCache.set(hex, m);
  }
  return m;
}
// No street-contact darkening: a houseboat's walls start below street level.
const boatWallMatCache = new Map();
function houseboatWallMaterial(hex) {
  let m = boatWallMatCache.get(hex);
  if (!m) boatWallMatCache.set(hex, m = habboMaterial(hex, { side: THREE.DoubleSide }));
  return m;
}
const roofMatCache = new Map();
function roofMaterial(hex) {
  let m = roofMatCache.get(hex);
  if (!m) {
    m = applyPortalCut(habboMaterial(shade(hex, 1.08), { map: tileTexture, side: THREE.DoubleSide }));
    roofMatCache.set(hex, m);
  }
  return m;
}
// Near-white multiplier for flat roofs, 8 m per tile (extrusion cap UVs are in
// metres): rolled bitumen strips with laps, soft weathering blotches, grit.
function createFlatRoofTexture() {
  const S = 256, M = S / 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  let s = 918273;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = '#e4e4e4';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S, y = rnd() * S, rad = 14 + rnd() * 60;
    const dark = rnd() < 0.55;
    const a = 0.05 + rnd() * 0.08;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, dark ? `rgba(40,40,44,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  for (let y = 0; y < S; y += M) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, y, S, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y + 1, S, 3);
    const lap = Math.floor(rnd() * S);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(lap, y, 1, M);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(lap + 1, y, 3, M);
  }
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 22 + (rnd() < 0.02 ? 26 : 0);
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.repeat.set(1 / 8, 1 / 8);
  return tex;
}
const flatRoofTexture = createFlatRoofTexture();
const FLAT_ROOF_TONES = [0x747478, 0x5e5f63, 0x7e7a73, 0x6c6e6a];
const flatRoofMaterials = FLAT_ROOF_TONES.map((c) => habboMaterial(c, { map: flatRoofTexture }));
const detailMaterial = vcMaterial({ side: THREE.DoubleSide });

export function setNightFactor(glow, litFrac, shopFrac = litFrac, officeFrac = litFrac) {
  setGlassNight(glow, litFrac, shopFrac, officeFrac);
  setLandmarkNight(glow);
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

// every material a building mesh draws with gets its passage openings cut
for (const m of [...flatRoofMaterials, detailMaterial, glassMaterial, ...LANDMARK_MATERIALS, ...Object.values(landmarkMaterials),
  ...Object.values(landmarkStoneMaterials), ...Object.values(accentMaterials), corniceMaterial, canopyMaterial, eaveTrimMaterial, finialMaterial]) applyPortalCut(m);

// The lined passages through `b` (portalcut3d.js), cached with its parts.
function addPassages(group, b, parts, depth) {
  if (b.rooms) {
    if (!parts.interior) parts.interior = b.interior ? buildInteriorOf(b) : buildMuseumInterior(b);
    group.add(parts.interior);
    return;
  }
  const map = mapRef();
  if (!map || !map.buildingsNear) return;
  if (parts.tunnel === undefined) {
    const mesh = buildPassageTunnels(b, passagesOf(map, b), depth, 0, doorsOf(map, b));
    parts.tunnel = mesh ? mesh.geometry : null;
    parts.tunnelMat = mesh ? mesh.material : null;
  }
  if (parts.tunnel) { const t = new THREE.Mesh(parts.tunnel, parts.tunnelMat); t.userData.noBatch = true; group.add(t); }
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CONE = new THREE.ConeGeometry(1, 1, 8);

const G_DETAIL = 0, G_GLASS = 1, G_WALL = 2, G_ROOF = 3;

// --- optional neighbour lookup for party-wall detection ----------------------------

let buildingMap = null;
export function setBuildingMap(map) {
  buildingMap = map;
}
// the map the buildings belong to
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
    // what the looks are seeded with: the centre in the frame they were first
    // made in (b.sd, scripts/world/rebase_data.py), so every facade stays
    sx: b.sd ? b.sd[0] : (minx + maxx) / 2, sy: b.sd ? b.sd[1] : (miny + maxy) / 2,
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
  const inside = (x, y) => near.find((o) => x >= o.bounds[0] && x <= o.bounds[2] && y >= o.bounds[1] && y <= o.bounds[3] && pointInPolygon(x, y, o.pts));
  for (const e of edges) {
    const ts = e.len > 3 ? [0.2, 0.5, 0.8] : [0.5];
    let hits = 0, top = Infinity;
    for (const t of ts) {
      const o = inside(e.ax + e.tx * e.len * t + e.nx * 0.6, e.ay + e.ty * e.len * t + e.ny * 0.6);
      if (o) { hits++; top = Math.min(top, o.landmark ? Infinity : Math.max(2.4, o.h * LEVEL_HEIGHT) + (o.lift || 0)); }
    }
    e.party = hits * 2 > ts.length;
    // the lowest neighbour's roof along a party wall: above it the wall shows
    if (e.party) e.partyTop = top;
  }
}

function familyIndexFor(box) {
  const gx = Math.round(box.sx / 20) * 20, gy = Math.round(box.sy / 20) * 20;
  return Math.floor(hash2(gx, gy) * PALETTE_FAMILIES.length);
}

// a big building=construction outline is a building site, not a hall: a low sand pad with containers and heaps
const isBuildingSite = (b) => b.type === 'construction' && ringArea(b.pts || []) > 1500;
const SITE_ROOF_TONE = 0x9a8f78;
const siteRoofMaterial = habboMaterial(SITE_ROOF_TONE, { map: flatRoofTexture });
applyPortalCut(siteRoofMaterial);

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

// Exported so a Node harness can verify this pipeline against the city map.
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
  return addFoundation(geo, b);
}

// --- facade primitives (wall-local: s along edge, y up, d outward) --------------------

function wp(e, s, y, d) {
  return [e.ax + e.tx * s + e.nx * d, y, e.ay + e.ty * s + e.ny * d];
}

const FACE_FRONT = 1, FACE_TOP = 2, FACE_BOTTOM = 4, FACE_SIDES = 8, FACE_ALL = 15, FACE_BACK = 16;

function wallBox(B, e, s0, s1, y0, y1, d0, d1, color, group = G_DETAIL, faces = FACE_ALL) {
  const n = [e.nx, 0, e.ny], t = [e.tx, 0, e.ty];
  if (faces & FACE_FRONT) B.quadOut(wp(e, s0, y0, d1), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s0, y1, d1), n, color, group);
  if (faces & FACE_TOP) B.quadOut(wp(e, s0, y1, d0), wp(e, s1, y1, d0), wp(e, s1, y1, d1), wp(e, s0, y1, d1), [0, 1, 0], color, group);
  if (faces & FACE_BOTTOM) B.quadOut(wp(e, s0, y0, d0), wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s0, y0, d1), [0, -1, 0], color, group);
  if (faces & FACE_BACK) B.quadOut(wp(e, s1, y0, d0), wp(e, s0, y0, d0), wp(e, s0, y1, d0), wp(e, s1, y1, d0), [-n[0], 0, -n[2]], color, group);
  if (faces & FACE_SIDES) {
    B.quadOut(wp(e, s0, y0, d0), wp(e, s0, y0, d1), wp(e, s0, y1, d1), wp(e, s0, y1, d0), [-t[0], 0, -t[2]], color, group);
    B.quadOut(wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s1, y1, d0), t, color, group);
  }
}

function wallQuad(B, e, s0, s1, y0, y1, d, color, group = G_DETAIL, uvs = null) {
  B.quadOut(wp(e, s0, y0, d), wp(e, s1, y0, d), wp(e, s1, y1, d), wp(e, s0, y1, d), [e.nx, 0, e.ny], color, group, uvs);
}

function edgePaneUV(e, rank, kind, w, h, bay) {
  return paneUV(rank, kind, w, h, e.tx, e.ty, e.nx, e.ny, bay);
}

function addWindow(B, e, c, w, y0, y1, S, seed) {
  const f = 0.07;
  wallQuad(B, e, c - w / 2 - f, c + w / 2 + f, y0 - f, y1 + f, 0.03, S.frame);
  const glass = GLASS_TONES[Math.floor(hash2(seed, y0 * 3.1) * GLASS_TONES.length)];
  wallQuad(B, e, c - w / 2, c + w / 2, y0, y1, 0.045, glass, G_GLASS, edgePaneUV(e, hash2(seed * 1.31, y0 * 7.7 + c), y0 < 2 ? PANE_GROUND : PANE_HOME, w, y1 - y0));
  const tY = y0 + (y1 - y0) * 0.72;
  wallQuad(B, e, c - w / 2, c + w / 2, tY - 0.03, tY + 0.03, 0.06, S.frame);
  if (w > 0.85) wallQuad(B, e, c - 0.03, c + 0.03, y0, tY, 0.06, S.frame);
  wallBox(B, e, c - w / 2 - f - 0.06, c + w / 2 + f + 0.06, y0 - f - 0.07, y0 - f, 0, 0.13, S.sill, G_DETAIL, FACE_FRONT | FACE_TOP);
  if (S.lintel) wallQuad(B, e, c - w / 2 - f - 0.05, c + w / 2 + f + 0.05, y1 + f, y1 + f + 0.16, 0.025, S.lintel);
}

function addDoor(B, e, c, w, S, opts = {}) {
  const h = opts.h ?? 2.2;
  const f = 0.08;
  wallBox(B, e, c - w / 2 - f, c + w / 2 + f, 0.12, h + 0.5 + f, 0, 0.05, S.frame, G_DETAIL, FACE_FRONT | FACE_SIDES | FACE_TOP);
  wallQuad(B, e, c - w / 2, c + w / 2, 0.15, h, 0.065, S.door);
  if (w > 1.3) wallQuad(B, e, c - 0.025, c + 0.025, 0.15, h, 0.08, shade(S.door, 0.7));
  wallQuad(B, e, c - w / 2, c + w / 2, h + 0.08, h + 0.5, 0.065, GLASS_TONES[1], G_GLASS);
  wallBox(B, e, c - w / 2 - 0.2, c + w / 2 + 0.2, 0, 0.15, 0, 0.4, STONE, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_SIDES);
  if (opts.canopy) wallBox(B, e, c - w / 2 - 0.35, c + w / 2 + 0.35, h + 0.62, h + 0.74, 0, 0.9, TRIM_DARK);
}

function addShopfront(B, e, s0, s1, top, S, seed) {
  const span = s1 - s0;
  wallBox(B, e, s0, s1, 0, 0.4, 0, 0.075, HARDSTONE, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_SIDES);
  const frameC = S.shopFrame;
  wallBox(B, e, s0, s1, 0.4, top, 0, 0.04, frameC, G_DETAIL, FACE_FRONT | FACE_SIDES);
  const n = Math.max(1, Math.round(span / 1.9));
  const bw = span / n;
  const doorBay = Math.floor(hash2(seed, 2.2) * n);
  const shopRank = hash2(seed, 5.5);
  // gevelreclame en markies van hetzelfde winkeltype als het interieur in de ruit (winkelkit.js)
  const look = facadeLook(shopRank);
  const shopUV = (s0, s1, y0, y1, bay) => wallQuad(B, e, s0, s1, y0, y1, 0.055, GLASS_TONES[(bay + Math.floor(seed * 7)) % 4 + 1], G_GLASS, edgePaneUV(e, shopRank, PANE_SHOP, s1 - s0, y1 - y0, bay));
  for (let i = 0; i < n; i++) {
    const a = s0 + i * bw + 0.07, b = s0 + (i + 1) * bw - 0.07;
    if (i === doorBay && bw > 1.1) {
      const dc = (a + b) / 2;
      shopUV(dc - 0.5, dc + 0.5, 0.05, top - 0.55, i);
      shopUV(dc - 0.5, dc + 0.5, top - 0.48, top - 0.07, i);
      shopUV(a, dc - 0.57, 0.47, top - 0.07, i + 3);
      shopUV(dc + 0.57, b, 0.47, top - 0.07, i + 5);
    } else {
      shopUV(a, b, 0.47, top - 0.07, i);
    }
  }
  wallBox(B, e, s0, s1, top, top + 0.5, 0, 0.12, look.sign);
  if (look.awning) {
    const a0 = s0 + 0.15, a1 = s1 - 0.15, ya = top - 0.05, yb = top - 0.6, da = 0.12, db = 1.25;
    const strips = Math.max(1, Math.round((a1 - a0) / 0.45));
    const sw = (a1 - a0) / strips;
    const up = [e.nx * 0.45, 1, e.ny * 0.45];
    for (let i = 0; i < strips; i++) {
      const c = i % 2 ? 0xe3ddd0 : look.awning;
      const p0 = a0 + i * sw, p1 = p0 + sw;
      B.quadOut(wp(e, p0, ya, da), wp(e, p1, ya, da), wp(e, p1, yb, db), wp(e, p0, yb, db), up, c);
      B.quadOut(wp(e, p0, ya - 0.03, da), wp(e, p1, ya - 0.03, da), wp(e, p1, yb - 0.03, db), wp(e, p0, yb - 0.03, db), [-up[0], -1, -up[2]], shade(c, 0.6));
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
      // caps sit 4 cm above the step tops; coplanar they z-fought
      const yc = y + 0.04;
      B.quadOut(R.P(aEnd - inward * 0.05, l - 0.04, yc), R.P(aEnd - inward * 0.05, r + 0.04, yc), R.P(a1, r + 0.04, yc), R.P(a1, l - 0.04, yc), [0, 1, 0], STONE);
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
    B.quadOut(fp(dm.a - gw / 2, gy0, 0.03), fp(dm.a + gw / 2, gy0, 0.03), fp(dm.a + gw / 2, gy1, 0.03), fp(dm.a - gw / 2, gy1, 0.03), outF, GLASS_TONES[2], G_GLASS, paneUV(hash2(dm.a * 1.7, gy0 * 3.3), PANE_HOME, gw, gy1 - gy0, R.A[0], R.A[2], outF[0], outF[2]));
    B.quadOut(fp(dm.a - 0.03, gy0, 0.035), fp(dm.a + 0.03, gy0, 0.035), fp(dm.a + 0.03, gy1, 0.035), fp(dm.a - 0.03, gy1, 0.035), outF, S.frame);
  }
}

// --- flat roof clutter ---------------------------------------------------------------

const ROOF_PATCH = [0x4e4f53, 0x7a7a7d, 0x5f5b56, 0x6a6c6e];

const segDist = (x, z, e) => segDistXY(x, z, e.ax, e.ay, e.bx, e.by);

// Everything sits on a base below the roof top (yb) so nothing is coplanar with
// it; loose surface quads float >= 3.5 cm above it.
function addFlatRoofDetail(B, b, edges, open, depth, floorCount, archetype, wallHex, copeC, r) {
  const A = edges.area;
  if (A < 8) return;
  const site = isBuildingSite(b);
  let e0 = edges[0];
  for (const e of edges) if (e.len > e0.len) e0 = e;
  const tx = e0.tx, ty = e0.ty, ry = Math.atan2(-ty, tx);
  const [minx, miny, maxx, maxy] = b.bounds;
  const cx = (minx + maxx) / 2, cz = (miny + maxy) / 2;
  let a0 = Infinity, a1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const e of edges) {
    const dx = e.ax - cx, dz = e.ay - cz;
    const a = dx * tx + dz * ty, c = -dx * ty + dz * tx;
    a0 = Math.min(a0, a); a1 = Math.max(a1, a); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
  }
  const toW = (a, c) => [cx + a * tx - c * ty, cz + a * ty + c * tx];
  const yb = depth - 0.05;
  const big = floorCount >= 3 || A > 90;
  // a hall or warehouse (thousands of m2) has a roof to match: more patches, units, skylights and seams, and bigger (#260)
  const huge = A > 1500;
  const hs = huge ? Math.min(2.4, 1 + Math.sqrt(A / 4000)) : 1;

  const pad = b.helipad && mapRef() && mapRef().meta.helipad;
  const clearAt = (x, z, m) => pointInPolygon(x, z, b.pts) && edges.every((e) => segDist(x, z, e) >= m) && !(pad && Math.hypot(x - pad.x, z - pad.y) < pad.r + 2.5);
  const fits = (a, c, ha, hc, m) => {
    for (const sa of [-1, 0, 1]) for (const sc of [-1, 0, 1]) {
      const [x, z] = toW(a + sa * ha, c + sc * hc);
      if (!clearAt(x, z, m)) return false;
    }
    return true;
  };
  const free = (list, a, c, ha, hc, pad) => list.every((q) => a + ha + pad <= q[0] || a - ha - pad >= q[1] || c + hc + pad <= q[2] || c - hc - pad >= q[3]);
  const placed = [], patches = [];
  let k = 200;
  const spot = (ha, hc, m, pad = 0.45, list = placed, tries = 10) => {
    const spanA = a1 - a0 - 2 * (ha + m), spanC = c1 - c0 - 2 * (hc + m);
    if (spanA < 0 || spanC < 0) { k += tries * 2; return null; }
    for (let t = 0; t < tries; t++) {
      const a = a0 + ha + m + r(k++) * spanA, c = c0 + hc + m + r(k++) * spanC;
      if (free(list, a, c, ha, hc, pad) && fits(a, c, ha, hc, m)) {
        list.push([a - ha, a + ha, c - hc, c + hc]);
        return { a, c };
      }
    }
    return null;
  };
  const rbox = (a, c, y0, sa, sy, sc, color) => {
    const [x, z] = toW(a, c);
    B.box(x, y0 + sy / 2, z, sa, sy, sc, color, G_DETAIL, 0, ry, 0);
  };
  const flat = (a, c, ha, hc, y, color) => {
    const p = (sa, sc) => { const [x, z] = toW(a + sa * ha, c + sc * hc); return [x, y, z]; };
    B.quadOut(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), [0, 1, 0], color, G_DETAIL);
  };

  if (site) {
    // containers (some stacked), heaps of sand and gravel, a few lamps: a site seen from above is busy
    const COLORS = [0x2f5d8a, 0xb5451b, 0xd9d3c3, 0x3f7a4f, 0xc9a227, 0x6b6e72];
    const nBox = Math.min(90, Math.floor(A / 350));
    for (let i = 0; i < nBox; i++) {
      const s = spot(3, 1.2, 1.5, 0.8, placed, 12);
      if (!s) continue;
      const col = COLORS[Math.floor(r(120 + i) * COLORS.length)];
      rbox(s.a, s.c, yb, 6, 2.6, 2.4, col);
      if (r(160 + i) < 0.3) rbox(s.a, s.c, yb + 2.6, 6, 2.6, 2.4, COLORS[Math.floor(r(200 + i) * COLORS.length)]);
    }
    const nHeap = Math.min(40, Math.floor(A / 1200));
    for (let i = 0; i < nHeap; i++) {
      const rad = 3 + r(240 + i) * 5, h = 1.5 + r(280 + i) * 2;
      const s = spot(rad, rad, 1.5, 0.6, placed, 10);
      if (!s) continue;
      const [x, z] = toW(s.a, s.c);
      B.geo(new THREE.ConeGeometry(rad, h, 7), composeMatrix(x, depth + h / 2 - 0.05, z, 0, r(320 + i) * 6.28, 0), r(360 + i) < 0.5 ? 0xb7a77f : 0x7d7f82, G_DETAIL);
    }
    const nLamp = Math.min(30, 2 + Math.floor(A / 3000));
    for (let i = 0; i < nLamp; i++) {
      const s = spot(0.3, 0.3, 1.5, 0.6, placed, 8);
      if (!s) continue;
      rbox(s.a, s.c, yb, 0.25, 9, 0.25, 0x4a4d50);
      rbox(s.a, s.c, yb + 9, 1.2, 0.3, 0.5, 0xd8d6c8);
    }
    return;
  }

  // darker, dirtier band where the membrane runs up against the parapet
  const band = r(50) < 0.5 ? 0x55565a : 0x505154;
  for (const e of edges) wallBox(B, e, 0, e.len, yb, depth + 0.03, -0.5, -0.02, band, G_DETAIL, FACE_TOP);

  const nPatch = Math.min(4 + (huge ? Math.floor(A / 1500) : 0), huge ? 40 : 4, Math.floor(A / 45) + (r(51) < 0.55 ? 1 : 0) + (huge ? Math.floor(A / 1500) : 0));
  for (let i = 0; i < nPatch; i++) {
    const ha = (0.6 + r(52 + i) * 1.4) * hs * (huge ? 2 : 1), hc = (0.5 + r(56 + i) * 1.0) * hs * (huge ? 2 : 1);
    const s = spot(ha, hc, 0.6, 0.2, patches, 4);
    if (s) flat(s.a, s.c, ha, hc, depth + 0.045 + 0.015 * (i % 8), ROOF_PATCH[Math.floor(r(60 + i) * ROOF_PATCH.length)]);
  }

  const rail = floorCount >= 5 && r(61) < 0.45;
  const m = rail ? 1.15 : 0.4;
  if (rail) {
    for (const e of open) {
      if (e.len < 3.5) continue;
      const s0 = 0.9, s1 = e.len - 0.9;
      const mid = wp(e, (s0 + s1) / 2, 0, -0.9), end0 = wp(e, s0, 0, -0.9), end1 = wp(e, s1, 0, -0.9);
      if (![mid, end0, end1].every((p) => pointInPolygon(p[0], p[2], b.pts))) continue;
      const rc = 0xb4b8bb;
      wallBox(B, e, s0, s1, depth + 1.0, depth + 1.05, -0.93, -0.88, rc, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
      wallBox(B, e, s0, s1, depth + 0.5, depth + 0.54, -0.92, -0.89, rc, G_DETAIL, FACE_FRONT | FACE_TOP);
      const posts = Math.max(1, Math.round((s1 - s0) / 2.4));
      for (let i = 0; i <= posts; i++) {
        const s = s0 + ((s1 - s0) * i) / posts;
        wallBox(B, e, s - 0.03, s + 0.03, yb, depth + 1.05, -0.94, -0.88, rc, G_DETAIL, FACE_FRONT | FACE_SIDES);
      }
    }
  }

  // stair / lift housing on taller blocks
  if (floorCount >= 4 && A > 90 && r(62) < 0.8) {
    const ha = 1.2 + r(63) * 0.6, hc = 1.1 + r(64) * 0.5, h = 2.3 + r(65) * 0.4;
    const s = spot(ha, hc, m + 0.3, 0.8);
    if (s) {
      rbox(s.a, s.c, yb, ha * 2, h + 0.05, hc * 2, shade(wallHex, BRICKS.has(wallHex) ? 0.95 : 0.9));
      rbox(s.a, s.c, depth + h - 0.04, ha * 2 + 0.16, 0.18, hc * 2 + 0.16, copeC);
      rbox(s.a - ha * 0.35, s.c - hc - 0.01, yb, 0.9, 2.1, 0.1, 0x3b3f44);
      placed.push([s.a - ha - 0.6, s.a + ha + 0.6, s.c - hc - 1.4, s.c + hc + 0.6]);
    }
  }

  if (A > 18 && r(66) < 0.75) {
    const s = spot(0.55, 0.55, m);
    if (s) {
      rbox(s.a, s.c, yb, 0.95, 0.42, 0.95, 0x8c8f93);
      rbox(s.a, s.c, depth + 0.34, 1.1, 0.08, 1.1, r(67) < 0.5 ? 0xb3b6ba : 0x6f7377);
    }
  }

  // solar panel rows on ballast frames
  const solarChance = archetype === 'house' || archetype === 'apartments' ? 0.45 : 0.3;
  if (A > 30 && r(68) < solarChance) {
    const tilt = (r(69) < 0.5 ? 1 : -1) * (0.22 + r(70) * 0.12);
    const pitch = 1.8 + r(71) * 0.4;
    let rows = 0;
    const cols = [];
    for (let c = c0 + m + 0.6; c <= c1 - m - 0.6 && rows < 8; c += pitch) {
      let run = null;
      const flush = () => {
        if (run && run.n >= 2) cols.push({ c, a: run.a, n: run.n });
        run = null;
      };
      for (let a = a0 + m + 0.5; a <= a1 - m - 0.5; a += 1.0) {
        if (fits(a, c, 0.5, 0.55, m) && free(placed, a, c, 0.5, 0.55, 0.3)) {
          if (!run) run = { a, n: 0 };
          run.n++;
        } else flush();
      }
      flush();
      if (cols.length && cols[cols.length - 1].c === c) rows++;
    }
    for (const q of cols.slice(0, 14)) {
      const len = q.n * 1.0 - 0.06, am = q.a - 0.5 + q.n * 0.5;
      const [x, z] = toW(am, q.c);
      B.geo(new THREE.BoxGeometry(len, 0.05, 1.0), composeMatrix(x, depth + 0.4, z, tilt, ry, 0, 1, 1, 1, 'YXZ'), 0x1d2940, G_DETAIL);
      const lo = Math.sign(tilt) * 0.38;
      rbox(am, q.c + lo, yb, len, 0.33, 0.06, 0x9a9ea2);
      rbox(am, q.c - lo, yb, len, 0.55, 0.06, 0x9a9ea2);
      placed.push([am - len / 2, am + len / 2, q.c - 0.55, q.c + 0.55]);
    }
  }

  const nHvac = big ? Math.min(huge ? 4 + Math.floor(A / 800) : 4, huge ? 40 : 4, 1 + Math.floor(A / 160) + (r(72) < 0.4 ? 1 : 0)) : (A > 25 && r(73) < 0.3 ? 1 : 0);
  for (let i = 0; i < nHvac; i++) {
    const ha = (0.55 + r(74 + i) * 0.35) * hs, hc = (0.4 + r(78 + i) * 0.2) * hs, h = (0.75 + r(82 + i) * 0.4) * hs;
    const s = spot(ha, hc, m);
    if (!s) continue;
    rbox(s.a, s.c, yb, ha * 2, h + 0.05, hc * 2, i % 2 ? 0xd2d4d4 : 0xbfc3c5);
    rbox(s.a, s.c, depth + h - 0.02, ha * 1.4, 0.06, hc * 1.4, 0x3a3c3e);
    const dLen = 1.5 + r(86 + i) * 3;
    const dir = r(90 + i) < 0.5 ? -1 : 1;
    const da = s.a + dir * (ha + dLen / 2);
    if (fits(da, s.c, dLen / 2, 0.2, m) && free(placed, da, s.c, dLen / 2, 0.2, 0.15)) {
      rbox(da, s.c, yb, dLen, 0.42, 0.34, 0xa6aaae);
      rbox(da + dir * (dLen / 2 - 0.15), s.c, yb, 0.42, 0.95, 0.42, 0xa6aaae);
      placed.push([da - dLen / 2, da + dLen / 2, s.c - 0.2, s.c + 0.2]);
    }
  }

  if (A > 30 && r(94) < 0.55) {
    const n = Math.min(8 + (huge ? Math.floor(A / 1000) : 0), huge ? 40 : 8, Math.floor(A / 45));
    let prev = null;
    for (let i = 0; i < n; i++) {
      let s = null;
      if (prev) {
        const a = prev.a + 2.3;
        if (fits(a, prev.c, 0.5, 0.5, m) && free(placed, a, prev.c, 0.5, 0.5, 0.4)) {
          s = { a, c: prev.c };
          placed.push([a - 0.5, a + 0.5, prev.c - 0.5, prev.c + 0.5]);
        }
      }
      if (!s) s = spot(0.5, 0.5, m, 0.5, placed, 6);
      if (!s) break;
      prev = s;
      rbox(s.a, s.c, yb, 1.0, 0.33, 1.0, 0xd6d6d1);
      const [x, z] = toW(s.a, s.c);
      B.geo(new THREE.SphereGeometry(0.44, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(x, depth + 0.28, z, 0, ry + Math.PI / 6, 0, 1, 0.5, 1), 0xc4ccd0, G_DETAIL);
    }
  }

  const nVent = Math.min(big ? 3 : 4, 1 + Math.floor(A / 40));
  for (let i = 0; i < nVent; i++) {
    const s = spot(0.1, 0.1, m, 0.3, placed, 4);
    if (!s) continue;
    const [x, z] = toW(s.a, s.c);
    const h = 0.4 + r(96 + i) * 0.5, rad = r(97 + i) < 0.7 ? 0.06 : 0.1;
    B.geo(new THREE.CylinderGeometry(rad, rad, h + 0.05, 6, 1, true), composeMatrix(x, yb + (h + 0.05) / 2, z), 0x3c3e41, G_DETAIL);
    B.geo(new THREE.CylinderGeometry(rad * 1.6, rad * 1.6, 0.05, 6, 1), composeMatrix(x, depth + h + 0.06, z), 0x55585b, G_DETAIL);
  }

  if (archetype === 'apartments' ? r(101) < 0.45 : r(101) < 0.12) {
    const s = spot(0.35, 0.35, m, 0.3, placed, 5);
    if (s) {
      const [x, z] = toW(s.a, s.c);
      rbox(s.a, s.c, yb, 0.06, 0.95, 0.06, 0x7a7d80);
      B.geo(new THREE.CylinderGeometry(0.4, 0.1, 0.1, 8, 1), composeMatrix(x, depth + 0.95, z, 1.05, ry + r(102) * Math.PI * 2, 0, 1, 1, 1, 'YXZ'), 0xe6e6e1, G_DETAIL);
    }
  }

  const nDrain = A > 40 ? 2 : 1;
  for (let i = 0; i < nDrain; i++) {
    const s = spot(0.15, 0.15, 0.55, 0.3, placed, 4);
    if (s) rbox(s.a, s.c, yb, 0.3, 0.13, 0.3, 0x2f3033);
  }

  if (huge) {
    // skylights, and panel seams over the whole roof, so a hall is not one blank plate from above (#260)
    const nSky = Math.min(48, Math.floor(A / 700));
    for (let i = 0; i < nSky; i++) {
      const s = spot(1.6 * hs, 0.7 * hs, m, 1.2, placed, 8);
      if (!s) continue;
      rbox(s.a, s.c, yb, 3.2 * hs, 0.34, 1.4 * hs, 0x8d979d);
      rbox(s.a, s.c, depth + 0.3, 3.0 * hs, 0.06, 1.2 * hs, 0xb7c3ca);
    }
    // thin lighter lines along the long axis, in pieces that fit inside the outline
    const piece = 14;
    let seams = 0;
    for (let c = c0 + m + 1; c <= c1 - m - 1 && seams < 500; c += 7) {
      for (let a = a0 + m + 1; a + piece <= a1 - m - 1 && seams < 500; a += piece + 1.5) {
        const mid = a + piece / 2;
        if (!fits(mid, c, piece / 2, 0.05, m) || !free(placed, mid, c, piece / 2, 0.05, 0.1)) continue;
        flat(mid, c, piece / 2, 0.05, depth + 0.04, 0x6a6e73);
        seams++;
      }
    }
  }
}

// --- detail geometry per building ---------------------------------------------------

function buildDetailGeometry(b, box, archetype, depth, fine, fine2, wallHex, roofHex, famFrame) {
  const edges = box.edges;
  markPartyWalls(b, edges);
  const B = new GeoBuilder(4);
  const seed = fine * 1000 + fine2 * 37;
  const r = (k) => hash2(seed + k * 13.37, fine2 * 91 + k * 3.3);
  const centre = Math.hypot(box.cx - CITY_CENTRE.x, box.cy - CITY_CENTRE.y) < CITY_CENTRE_R;
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
    const plinthH = houseboat ? HOUSEBOAT_HULL_H : 0.4;
    const plinthC = houseboat ? 0x2a2f38 : HARDSTONE;
    for (const e of open) wallBox(B, e, 0, e.len, 0, plinthH, 0, 0.035, plinthC, G_DETAIL, FACE_FRONT | FACE_TOP);
    if (houseboat) {
      for (const e of edges) {
        wallBox(B, e, -0.08, e.len + 0.08, plinthH - 0.1, plinthH, 0, 0.1, 0x8a6440, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
        wallBox(B, e, 0, e.len, HOUSEBOAT_DRAFT + 0.03, HOUSEBOAT_DRAFT + 0.15, 0, 0.045, 0x6e2e26, G_DETAIL, FACE_FRONT);
      }
    }
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
          wallQuad(B, e, c - w, c + w, y0, y0 + 0.7, 0.03, GLASS_TONES[2], G_GLASS, edgePaneUV(e, 0.3 + hash2(seed + c, y0) * 0.7, PANE_OFFICE, 2 * w, 0.7));
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
      wallBox(B, e, c - dw / 2 - 0.1, c + dw / 2 + 0.1, 0, dh + 0.1, 0, 0.04, 0x3a3c3e, G_DETAIL, FACE_FRONT | FACE_SIDES | FACE_TOP);
      wallQuad(B, e, c - dw / 2, c + dw / 2, 0, dh, 0.055, 0x8a8c8e);
      for (let k = 1; k < 6; k++) wallQuad(B, e, c - dw / 2, c + dw / 2, (dh * k) / 6 - 0.02, (dh * k) / 6 + 0.02, 0.07, 0x6a6c6e);
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
  // the roof the data knows (3D BAG b3_dak_type, OSM roof:shape; b.rk from
  // scripts/world/building_heights.mjs) wins over the guess by type
  const known = b.rk;
  if (frame && archetype !== 'church') {
    const shortSpan = Math.min(frame.u1 - frame.u0, frame.v1 - frame.v0);
    if (known === 'flat') roofKind = 'flat';
    else if ((known === 'gable' || known === 'hip' || known === 'mansard') && shortSpan <= 16) roofKind = 'pitched';
    else if ((known === 'shed' || known === 'sawtooth') && shortSpan <= 24 && shortSpan >= 3) roofKind = 'shed';
    else if (known) roofKind = 'flat';
    else if ((archetype === 'house' || archetype === 'generic') && shortSpan <= 14) roofKind = 'pitched';
    else if (archetype === 'apartments' && floorCount <= 4 && shortSpan <= 13 && r(16) < 0.55) roofKind = 'pitched';
    else if (archetype === 'retail' && floorCount <= 3 && shortSpan <= 10 && r(16) < 0.6) roofKind = 'pitched';
    else if (industrial && shortSpan <= 24 && shortSpan >= 3 && r(16) < 0.55) roofKind = 'shed';
  }

  if (roofKind === 'pitched' || roofKind === 'shed') {
    const R = frameMapper(frame);
    const pitch = roofKind === 'shed' ? 0.26 : (archetype === 'house' ? 0.8 + r(17) * 0.2 : 0.7 + r(17) * 0.15);
    // a measured ridge (b.hm over the walls) sets the roof's height
    const measured = b.hm && roofKind === 'pitched' ? b.hm - depth : null;
    const H = measured !== null ? Math.max(0.4, Math.min(8, measured)) : Math.min(roofKind === 'shed' ? 3 : 7, R.half * Math.tan(pitch));
    const detached = !edges.some((e) => e.party);
    const endsOpen = [sideOpen(edges, [-R.A[0], 0, -R.A[2]], R.half), sideOpen(edges, R.A, R.half)];
    const hip = roofKind === 'pitched' && (known === 'hip' || (!known && detached && R.len / (R.half * 2) < 2.6 && r(18) < 0.35));
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
    const metalTrim = !BRICKS.has(wallHex) && r(40) < 0.4;
    const copeC = metalTrim ? (r(41) < 0.5 ? 0xa9adb1 : 0x4a4d50) : BRICKS.has(wallHex) ? shade(STONE, 0.94 + r(41) * 0.1) : shade(wallHex, 0.8);
    const copeTop = depth + (metalTrim ? 0.16 + r(42) * 0.08 : 0.24 + r(42) * 0.14);
    const copeIn = metalTrim ? -0.07 : -0.1 - r(43) * 0.06;
    // parapet: inner face so it isn't see-through from the roof side, and
    // stretched past both ends so outside corners close without a notch
    // (the overlap is same-colour, so no visible z-fight); the inner face
    // starts at the roof, lower parts would sit inside the building anyway
    for (const e of open) {
      const ext = 0.1;
      wallBox(B, e, -ext, e.len + ext, depth - 0.18, copeTop, copeIn, 0.08, copeC, G_DETAIL, FACE_FRONT | FACE_TOP | FACE_BOTTOM);
      wallBox(B, e, -ext, e.len + ext, depth, copeTop, copeIn, 0.08, copeC, G_DETAIL, FACE_BACK);
    }
    addFlatRoofDetail(B, b, edges, open, depth, floorCount, archetype, wallHex, copeC, r);
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
    // the band is the bounding box: only where that is the footprint itself
    let a = 0;
    for (let i = 0, n = b.pts.length; i < n; i++) { const p = b.pts[i], q = b.pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
    if (Math.abs(a) / 2 < box.w * box.d * 0.85) return;
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
  if (archetype === 'houseboat') {
    return { wallHex: HOUSEBOAT_WALLS[Math.floor(fine * HOUSEBOAT_WALLS.length)], roofHex: 0x3a3b3d, frame: 0xece8de };
  }
  const fam = PALETTE_FAMILIES[familyIndexFor(box)];
  // a building that comes with its own colours (the real Ommeland's, drawn
  // as boxes further out) takes the nearest of the city's, so the materials
  // stay the city's few and the two look alike
  if (b.tint !== undefined) {
    return { wallHex: nearestHex(PALETTE_WALLS, b.tint), roofHex: b.roofTint !== undefined ? nearestHex(PALETTE_ROOFS, b.roofTint) : fam.roof, frame: fam.frame };
  }
  return { wallHex: fam.wall[Math.floor(fine * fam.wall.length)], roofHex: fam.roof, frame: fam.frame };
}
const PALETTE_WALLS = [...new Set(PALETTE_FAMILIES.flatMap((f) => f.wall))];
const PALETTE_ROOFS = [...new Set(PALETTE_FAMILIES.map((f) => f.roof))];
function nearestHex(list, hex) {
  let best = list[0], bd = Infinity;
  for (const c of list) {
    const dr = ((c >> 16) & 255) - ((hex >> 16) & 255), dg = ((c >> 8) & 255) - ((hex >> 8) & 255), db = (c & 255) - (hex & 255);
    const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
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

// Facades standing at (or over) the water get a foundation wall down below
// the waterline, a hand's width inside the facade so it never lies in the
// plane of a quay wall.
const FOUNDATION_Y = WATER_Y - 0.5;
const FOUNDATION_INSET = 0.08;
const BY_WATER_R = 0.8;
const isWet = (map, e, s, d) => map.inWaterRaw(e.ax + e.tx * s + e.nx * d, e.ay + e.ty * s + e.ny * d);
export function buildingFoundation(b) {
  if (b._foundation !== undefined) return b._foundation;
  const map = mapRef();
  if (!map || !map.inWaterRaw || archetypeOf(b) === 'houseboat') return (b._foundation = null);
  const edges = bboxOf(b).edges;
  const wet = edges.map((e) => {
    const n = Math.max(1, Math.round(e.len));
    for (let i = 0; i < n; i++) {
      const s = ((i + 0.5) / n) * e.len;
      if (isWet(map, e, s, 0.3) || isWet(map, e, s, 1.0)) return true;
    }
    return false;
  });
  if (!wet.some(Boolean)) return (b._foundation = null);
  // a wall of a waterside building running along the waterline, the water
  // just beside it rather than in front: it stands over the quay or bank
  // sloping down to it
  edges.forEach((e, i) => {
    if (wet[i]) return;
    const n = Math.max(1, Math.round(e.len));
    for (let k = 0; k < n && !wet[i]; k++) {
      const s = ((k + 0.5) / n) * e.len, d = 0.3 - BY_WATER_R;
      wet[i] = isWet(map, e, s, d) || isWet(map, e, s - BY_WATER_R, 0.3) || isWet(map, e, s + BY_WATER_R, 0.3);
    }
  });
  return (b._foundation = { y: FOUNDATION_Y, edges, wet });
}

function addFoundation(geo, b) {
  const f = buildingFoundation(b);
  if (!f) return geo;
  const { edges, wet, y } = f, N = edges.length;
  // inset ring corners (mitred), corner i between edges i-1 and i
  const corner = edges.map((e, i) => {
    const p = edges[(i + N - 1) % N];
    const mx = p.nx + e.nx, my = p.ny + e.ny, k = 1 + p.nx * e.nx + p.ny * e.ny;
    const s = k > 0.25 ? FOUNDATION_INSET / k : FOUNDATION_INSET;
    return k > 0.25 ? [e.ax - mx * s, e.ay - my * s] : [e.ax - e.nx * s, e.ay - e.ny * s];
  });
  const pos = [], nor = [], uv = [];
  for (let i = 0; i < N; i++) {
    if (!wet[i]) continue;
    const e = edges[i], a = corner[i], c = corner[(i + 1) % N];
    const quad = [[a, y], [c, y], [c, 0], [a, y], [c, 0], [a, 0]];
    for (const [[x, z], h] of quad) {
      pos.push(x, h, z);
      nor.push(e.nx, 0, e.ny);
      uv.push((x - a[0]) * e.tx + (z - a[1]) * e.ty, h);
    }
  }
  const base = geo.attributes, n0 = base.position.count, n1 = pos.length / 3;
  const join = (attr, extra, size) => {
    const out = new Float32Array((n0 + n1) * size);
    out.set(attr.array);
    out.set(extra, n0 * size);
    return new THREE.BufferAttribute(out, size);
  };
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', join(base.position, pos, 3));
  out.setAttribute('normal', join(base.normal, nor, 3));
  out.setAttribute('uv', join(base.uv, uv, 2));
  // extrusion groups: caps (flat roof) then sides (walls); the foundation joins the walls
  for (const g of geo.groups) out.addGroup(g.start, g.materialIndex === 1 ? n0 + n1 - g.start : g.count, g.materialIndex);
  geo.dispose();
  return out;
}

// Height of the bottom of the walls (the foundation's foot by the water).
export function buildingBase(b) {
  if (archetypeOf(b) === 'houseboat') return HOUSEBOAT_BASE_Y;
  const f = buildingFoundation(b);
  return f ? f.y : 0;
}

// Massing + rough colours for the far LOD layer (farlod.js).
export function buildingLodStyle(b) {
  const box = bboxOf(b);
  const archetype = archetypeOf(b);
  const fine = hash2(box.sx, box.sy);
  const depth = archetype === 'houseboat' ? Math.min(HOUSEBOAT_MAX_DEPTH, Math.max(HOUSEBOAT_MIN_DEPTH, b.h * LEVEL_HEIGHT)) : Math.max(2.4, b.h * LEVEL_HEIGHT) + (b.lift || 0);
  const { wallHex, roofHex } = pickColors(b, box, archetype, fine);
  const pitched = b.rk ? (b.rk === 'gable' || b.rk === 'hip' || b.rk === 'mansard') && Math.min(box.w, box.d) <= 16
    : archetype === 'house' || (archetype !== 'industrial' && archetype !== 'houseboat' && b.h <= 3 && Math.min(box.w, box.d) <= 11);
  return {
    ring: sanitizeFootprint(b.pts).pts,
    base: archetype === 'houseboat' ? HOUSEBOAT_BASE_Y : 0,
    depth: pitched ? depth + (b.hm && b.hm > depth + 0.8 ? Math.min(8, b.hm - depth) * 0.6 : 1.5) : depth,
    wallHex: BRICKS.has(wallHex) ? shade(wallHex, 0.95) : shade(wallHex, 0.9),
    roofHex: pitched ? shade(roofHex, 0.9) : 0x68686a,
  };
}

export function buildBuildingMesh(b) {
  capBuilding(b); // heights the footprint and kind can carry (buildingcap.js, issue #179)
  if (b.landmark && b.name) {
    const model = getLandmarkModel(b.name);
    if (model) {
      const box = bboxOf(b);
      const group = new THREE.Group();
      model.position.x += box.cx;
      model.position.z += box.cy;
      group.add(model);
      if (!b._geo3dParts) b._geo3dParts = {};
      addPassages(group, b, b._geo3dParts, Math.max(2.4, b.h * LEVEL_HEIGHT));
      return group;
    }
  }

  // Grote Markt / Vismarkt: own models and the historic facades (marktgebouwen.js)
  if (marktKind(b)) {
    const box = bboxOf(b);
    markPartyWalls(b, box.edges);
    if (!b._geo3dParts) b._geo3dParts = {};
    touchParts(b);
    const group = buildMarktGroup(b, b._geo3dParts, sanitizeFootprint(b.pts).pts, box.edges);
    if (group) {
      addPassages(group, b, b._geo3dParts, Math.max(2.4, b.h * LEVEL_HEIGHT));
      return group;
    }
  }

  if (hasLandmarkModel(b)) {
    const box = bboxOf(b);
    markPartyWalls(b, box.edges);
    if (!b._geo3dParts) b._geo3dParts = {};
    touchParts(b);
    const parts = b._geo3dParts;
    if (parts.landmark === undefined) parts.landmark = buildLandmarkGeometry(b, sanitizeFootprint(b.pts).pts, box.edges);
    if (parts.landmark) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(parts.landmark, LANDMARK_MATERIALS));
      addPassages(group, b, parts, Math.max(2.4, b.h * LEVEL_HEIGHT));
      return group;
    }
  }

  const box = bboxOf(b);
  const archetype = archetypeOf(b);
  const fine = hash2(box.sx, box.sy);
  const fine2 = hash2(box.sx * 1.7 + 3.1, box.sy * 1.3 - 2.7);

  let depth;
  if (b.landmark && b.landmarkKind === 'tower') depth = TOWER_HEIGHT * 0.6;
  else if (archetype === 'houseboat') depth = Math.min(HOUSEBOAT_MAX_DEPTH, Math.max(HOUSEBOAT_MIN_DEPTH, b.h * LEVEL_HEIGHT));
  else if (isBuildingSite(b)) depth = 0.35 + (b.lift || 0);
  else depth = Math.max(2.4, b.h * LEVEL_HEIGHT) + (b.lift || 0);

  if (!b._geo3dParts) b._geo3dParts = {};
  touchParts(b);
  const parts = b._geo3dParts;
  if (!parts.main) parts.main = buildMainGeometry(b, depth);
  const group = new THREE.Group();
  if (archetype === 'houseboat') group.position.y = HOUSEBOAT_BASE_Y;

  if (b.landmark) {
    const stone = LANDMARK_STONE[b.landmarkKind] ? landmarkStoneMaterials[b.landmarkKind] : null;
    const base = landmarkMaterials[b.landmarkKind] || wallMaterial(P.brickRed);
    group.add(new THREE.Mesh(parts.main, stone || base));
    addLandmarkDetail(group, b, box, parts, depth, base, fine2);
    addPassages(group, b, parts, depth);
    return group;
  }

  const { wallHex, roofHex, frame } = pickColors(b, box, archetype, fine);
  const wallMat = archetype === 'houseboat' ? houseboatWallMaterial(wallHex) : wallMaterial(wallHex);
  const roofMat = roofMaterial(roofHex);
  const flatRoofMat = isBuildingSite(b) ? siteRoofMaterial : flatRoofMaterials[Math.floor(hash2(fine * 7.1, fine2 * 3.3) * flatRoofMaterials.length)];
  group.add(new THREE.Mesh(parts.main, [flatRoofMat, wallMat]));

  if (archetype !== 'houseboat') addPassages(group, b, parts, depth);
  if (archetype === 'church') {
    addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2);
    return group;
  }

  if (!parts.detail) parts.detail = buildDetailGeometry(b, box, archetype, depth, fine, fine2, wallHex, roofHex, frame).geo;
  const detail = new THREE.Mesh(parts.detail, [detailMaterial, glassMaterial, wallMat, roofMat]);
  group.add(detail);
  group.userData.facadeDetail = detail;
  return group;
}
