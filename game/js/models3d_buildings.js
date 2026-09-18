import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Replaces the old one-flat-box-per-building placeholder. Buildings read as
// belonging to one street block via a two-step hash: a COARSE hash of the
// footprint centroid rounded to a 20m grid cell picks a shared palette
// "family" (a few closely related brick/roof tones) for every building on
// that block, then a FINE hash of the building's own exact centroid picks
// the specific shade within that family plus small per-building jitter
// (roof height, window row offset) - so a row of neighbours shares
// materials but each one still reads as its own building. See
// buildBuildingMesh below and familyIndexFor/pickMaterials for where this
// happens. Round 2 keeps this hashing system untouched and reuses it for
// the new facade color-banding (a second, less-emphasized shade from the
// SAME family/fine index, not a new hash key) so block cohesion holds.

const LEVEL_HEIGHT = 3.1;
const TOWER_HEIGHT = 95;
const HOUSEBOAT_MAX_DEPTH = 3.5;

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// Extends the same muted satellite-derived palette render2.js uses for the
// 2D view (BUILDING_PALETTE there, BUILDING_PALETTE3D in the old scene3d.js
// placeholder) into families of related tones instead of one flat color.
const PALETTE_FAMILIES = [
  { wall: [0x8a6b52, 0x7d6049, 0x967357, 0x6f5540], roof: 0x3a3d38 },
  { wall: [0x969887, 0x878972, 0x7b7c72, 0xa3a496], roof: 0x4f544d },
  { wall: [0x66695f, 0x54574e, 0x74776b, 0x494c45], roof: 0x232522 },
  { wall: [0xb4b2a2, 0xc4c2b0, 0xa39f8c, 0x9b9884], roof: 0x625044 },
  { wall: [0x9c7a5c, 0x8a6a4e, 0xae8a68, 0x7a5c42], roof: 0x5c4632 },
];
const INDUSTRIAL_WALLS = [0x6c6c66, 0x5c5c57, 0x7a7a72, 0x50504b];
const INDUSTRIAL_ROOF = 0x3d3d38;
const LANDMARK_COLOR3D = {
  tower: 0x783c28, church: 0x5a5560, modern: 0x3c6e82, museum: 0xb44628,
  station: 0x465a6e, university: 0x503c2d, historic: 0x8c6e32, mall: 0x46648c, stadium: 0x3c7846,
};
const LANDMARK_STONE = { university: 0xcfc3a0, historic: 0xd9cdae };
const ACCENT_COLOR = { museum: 0xe0a23a, modern: 0xdfe4e6, mall: 0xe3c23c };
// Per-landmark-kind PBR finish - glass/steel modern buildings (station,
// modern, museum, mall) read glossier/slightly metallic, masonry ones
// (tower, church, university, historic) stay matte like real stone/brick.
const LANDMARK_FINISH = {
  tower: { roughness: 0.82, metalness: 0 },
  church: { roughness: 0.85, metalness: 0 },
  modern: { roughness: 0.2, metalness: 0.3 },
  museum: { roughness: 0.4, metalness: 0.35 },
  station: { roughness: 0.3, metalness: 0.25 },
  university: { roughness: 0.85, metalness: 0 },
  historic: { roughness: 0.75, metalness: 0.05 },
  mall: { roughness: 0.5, metalness: 0.15 },
  stadium: { roughness: 0.5, metalness: 0.1 },
};

// Round 2: MeshStandardMaterial (was MeshLambertMaterial) so walls actually
// react to roughness/metalness under the scene's HemisphereLight+
// DirectionalLight instead of shading flat - brick/stucco/stone stay matte
// (high roughness), modern glass-and-steel landmarks read glossier (low
// roughness, a little metalness). Small helper keeps the many instances
// below terse.
const stdMat = (color, roughness, metalness = 0, extra) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// Every mesh below reuses one of these - never allocate a material per
// building. Only ~30-100 buildings are ever live at once but they stream
// in/out of view constantly as the player moves, so this runs a lot.
const wallMaterials = PALETTE_FAMILIES.map((f) => f.wall.map((c) => stdMat(c, 0.88)));
const roofMaterials = PALETTE_FAMILIES.map((f) => stdMat(f.roof, 0.78, 0, { side: THREE.DoubleSide }));
const industrialWallMaterials = INDUSTRIAL_WALLS.map((c) => stdMat(c, 0.55, 0.25));
const industrialRoofMaterial = stdMat(INDUSTRIAL_ROOF, 0.5, 0.3, { side: THREE.DoubleSide });
const landmarkMaterials = Object.fromEntries(Object.entries(LANDMARK_COLOR3D).map(([k, c]) => {
  const f = LANDMARK_FINISH[k] || { roughness: 0.8, metalness: 0 };
  return [k, stdMat(c, f.roughness, f.metalness, { side: THREE.DoubleSide })];
}));
const landmarkStoneMaterials = Object.fromEntries(Object.entries(LANDMARK_STONE).map(([k, c]) => [k, stdMat(c, 0.8, 0, { side: THREE.DoubleSide })]));
const accentMaterials = Object.fromEntries(Object.entries(ACCENT_COLOR).map(([k, c]) => [k, stdMat(c, 0.3, 0.2, { side: THREE.DoubleSide })]));
// A vertical wall lit only by HemisphereLight + one DirectionalLight goes
// near-black whenever it faces away from the sun (extremely common up close,
// e.g. first-person-adjacent camera facing straight at a shaded facade) - if
// the window/shopfront detail were just a slightly different shade of the
// same wall-color family, it would vanish into that same near-black exactly
// when it matters most. `emissive` makes these read as lit windows
// regardless of ambient light/facing direction (also just a nicer "living
// city at any hour" look) - kept modest so it reads as windows, not a glow.
// Low roughness + a touch of metalness on top of that gives the glass pane
// itself a faint sheen instead of the same matte response as brick.
const windowBandMaterial = stdMat(0x1b222c, 0.3, 0.1, { emissive: 0xffcf80, emissiveIntensity: 0.4, side: THREE.DoubleSide });
const shopfrontMaterial = stdMat(0x17242b, 0.25, 0.1, { emissive: 0xffcf80, emissiveIntensity: 0.5, side: THREE.DoubleSide });
const corniceMaterial = stdMat(0xd8cdb0, 0.75, 0, { side: THREE.DoubleSide });
const canopyMaterial = stdMat(0x565c53, 0.5, 0.2, { side: THREE.DoubleSide });
// Round 2 additions: a dark gutter/eave trim strip, a near-black door-recess
// box, and a small gilded accent for spire/cross finials.
const eaveTrimMaterial = stdMat(0x2b2a26, 0.55, 0.3, { side: THREE.DoubleSide });
const doorMaterial = stdMat(0x110d0a, 0.95, 0, { side: THREE.DoubleSide });
const finialMaterial = stdMat(0xcfa227, 0.35, 0.55, { side: THREE.DoubleSide });

// Shared unit primitives for every small protruding detail (window/shopfront
// bands' end caps aside, this covers cornices, canopies, steeples, tower
// caps, door insets, eave trim, tower stages, finials) - scaled/positioned
// per building instead of ever generating new geometry for them, so their
// GPU cost is fixed at two geometries total no matter how many buildings or
// how much extra per-archetype detail is on screen.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CONE = new THREE.ConeGeometry(1, 1, 8);

function bboxOf(b) {
  const [minx, miny, maxx, maxy] = b.bounds;
  return {
    minx, miny, maxx, maxy, w: maxx - minx, d: maxy - miny,
    cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, cz: (miny + maxy) / 2,
  };
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
  if (t === 'industrial' || t === 'shed' || t === 'garage' || t === 'garages' || t === 'service' || t === 'construction' || t === 'carport' || t === 'guardhouse' || t === 'static_caravan' || t === 'water_tower') return 'industrial';
  if (t === 'houseboat') return 'houseboat';
  if (t === 'church' || t === 'cathedral') return 'church';
  if (t === 'yes' && b.h >= 5) return 'retail';
  return 'generic';
}

// --- footprint sanitization ------------------------------------------------
// Real OSM building footprints occasionally carry defects that make THREE's
// earcut-style cap triangulation (ExtrudeGeometry -> ShapeUtils.triangulateShape,
// used below via buildMainGeometry) misbehave into a wrong-looking sliver,
// spike or self-crossing edge WITHOUT ever throwing or producing NaN:
//   (a) consecutive near-duplicate points (near-zero-length edges)
//   (b) runs of 3+ collinear points (contribute nothing to the silhouette)
//   (c) genuine self-intersecting ("bowtie") rings - a real, rare OSM error
// (a)/(b) are cleaned below; (c), and anything left with under 3 usable
// points, falls back to the convex hull of the cleaned point set - a hull
// is never self-intersecting and always triangulates cleanly. b.pts itself
// is left untouched (mapview.js's 2D minimap and hud_panel.js's minimap
// dot both still read the original ring directly), so all of this only
// ever affects the local copy used to build this building's 3D geometry.
// Buildings are built once and cached (b._geo3dParts, see buildBuildingMesh
// below and scene3d.js's buildingMeshes map), so this one-off per-building
// cost is fine even though it's O(n^2) in footprint point count.
const DEDUP_EPS = 0.02; // meters - collapse points closer together than this
const COLLINEAR_EPS = 0.02; // meters - perpendicular deviation below which a vertex sits "on" the line through its neighbours
const PARAM_EPS = 1e-7; // parametric slack for the segment-intersection test below, so a shared endpoint between adjacent edges never counts as a crossing

function distSq(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

// Strips the single standard OSM closed-ring duplicate (last point == first)
// if present. THREE's own triangulateShape already strips exactly this one
// internally (removeDupEndPts), so doing it here too is just so this
// module's own before/after point counts reflect genuine interior defects,
// not the expected closure convention every footprint already follows.
function stripClosingDuplicate(pts) {
  if (pts.length > 1 && distSq(pts[0], pts[pts.length - 1]) <= DEDUP_EPS * DEDUP_EPS) return pts.slice(0, -1);
  return pts.slice();
}

// Collapses consecutive points (cyclically - the wrap-around edge counts
// too) closer together than DEDUP_EPS. Called after stripClosingDuplicate,
// so every removal here is a genuine interior duplicate/zero-length edge.
function dedupeInterior(open) {
  const out = [];
  for (const p of open) {
    if (out.length === 0 || distSq(out[out.length - 1], p) > DEDUP_EPS * DEDUP_EPS) out.push(p);
  }
  while (out.length > 1 && distSq(out[0], out[out.length - 1]) <= DEDUP_EPS * DEDUP_EPS) out.pop();
  return out;
}

// Drops any vertex whose perpendicular deviation from the line through its
// immediate neighbours is below COLLINEAR_EPS - it lies on that line, so it
// contributes nothing to the silhouette and is pure triangulation risk.
// Runs several passes so a whole run of 3+ collinear points collapses down
// to just its two endpoints; never drops below a triangle.
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

// Exact parametric segment-intersection test (not a sign heuristic): true
// only for a genuine transversal crossing strictly inside BOTH segments
// (0 < t < 1 and 0 < u < 1) - a shared endpoint between adjacent ring edges
// lands at t or u == 0/1 and is excluded by construction.
function segmentsCross(a, b, c, d) {
  const d1x = b[0] - a[0], d1y = b[1] - a[1];
  const d2x = d[0] - c[0], d2y = d[1] - c[1];
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return false; // parallel/collinear - not a transversal crossing
  const t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / denom;
  const u = ((c[0] - a[0]) * d1y - (c[1] - a[1]) * d1x) / denom;
  return t > PARAM_EPS && t < 1 - PARAM_EPS && u > PARAM_EPS && u < 1 - PARAM_EPS;
}

// O(n^2) over every non-adjacent edge pair - footprints are small (well
// under 50 points typically, rarely into the low hundreds), and this only
// ever runs once per building thanks to the buildBuildingMesh cache.
function ringSelfIntersects(ring) {
  const n = ring.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // shares a vertex with edge i via the wrap-around, not a real crossing
      const c = ring[j], d = ring[(j + 1) % n];
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function crossZ(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// Standard monotone-chain convex hull - never self-intersecting, always
// triangulates cleanly. Used as the safe substitute silhouette for any
// footprint too broken to trust to ExtrudeGeometry's triangulator; this
// makes an already-malformed OSM building render as its convex hull instead
// of its broken exact footprint, which at building scale is unnoticeable.
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

// Cleans a raw footprint ring (b.pts, as-is - untouched by this function)
// for safe triangulation. Never throws and never returns fewer than 3
// points. Exported only so a Node harness can verify/count this pipeline
// directly against the shipped citymap.json without duplicating the logic.
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
      // Last-ditch fallback for a footprint with under 3 distinct points
      // even before any of this - a tiny square so callers always get a
      // safely-triangulable ring. Not hit by any real citymap.json building
      // (see verification), but keeps this function total.
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

// A thin quad-strip ring around the footprint's bounding box (not the exact
// polygon - real OSM footprints run up to 500+ vertices, and this geometry
// is reused, just translated in Y, once per floor line, so following the
// exact perimeter would multiply an already-large main extrusion by every
// floor). Built as an uncapped 4-segment ring, a small margin outside the
// wall, so it protrudes just enough to read as a "string course"/window-
// band line of real geometry (no texture) at a fixed, tiny triangle cost
// regardless of footprint complexity. Reused as-is for eave trim and the
// apartment facade color band (different thickness/outset per caller).
function buildBandGeometry(box, thickness, outset = 0.06) {
  const x0 = box.minx - outset, x1 = box.maxx + outset;
  const z0 = box.miny - outset, z1 = box.maxy + outset;
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  const verts = [], idx = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [ax, az] = corners[i], [bx, bz] = corners[i + 1];
    const base = verts.length / 3;
    verts.push(ax, 0, az, ax, thickness, az, bx, thickness, bz, bx, 0, bz);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Gabled roof cap: a triangular prism whose ridge runs along the LONGER
// axis of the footprint's bounding box (two slanted quads + two triangular
// end caps - real gable-end walls, not just a ridge line). Winding per axis
// case below is hand-verified (cross product) to face outward; every
// roof-ish material is also set to DoubleSide above as a belt-and-suspenders
// safety net since these are small stylized caps, not load-bearing geometry.
// The two end-cap triangles (verts 0-5) and the four roof-slant triangles
// (verts 6-17) are split into geometry groups so callers that want a real
// brick gable end under a tiled roof can pass `[wallMat, roofMat]` to the
// Mesh constructor - callers that pass a single material (e.g. the church's
// plain roof) are unaffected, three.js ignores groups without an array.
function buildRidgeGeometry(box, baseY, ridgeHeight) {
  const { minx, miny, maxx, maxy, w, d } = box;
  const topY = baseY + ridgeHeight;
  const verts = [];
  const push = (p) => verts.push(p[0], p[1], p[2]);
  if (w >= d) {
    const x0 = minx, x1 = maxx, z0 = miny, z1 = maxy, zMid = (z0 + z1) / 2;
    const A = [x0, baseY, z0], B = [x0, baseY, z1], R0 = [x0, topY, zMid];
    const C = [x1, baseY, z0], D = [x1, baseY, z1], R1 = [x1, topY, zMid];
    for (const t of [[A, B, R0], [D, C, R1], [A, C, R1], [A, R1, R0], [B, D, R1], [B, R1, R0]]) for (const p of t) push(p);
  } else {
    const x0 = minx, x1 = maxx, z0 = miny, z1 = maxy, xMid = (x0 + x1) / 2;
    const A = [x0, baseY, z0], B = [x1, baseY, z0], P0 = [xMid, topY, z0];
    const C = [x0, baseY, z1], D = [x1, baseY, z1], P1 = [xMid, topY, z1];
    for (const t of [[A, P0, B], [C, D, P1], [A, C, P1], [A, P1, P0], [B, P1, D], [B, P0, P1]]) for (const p of t) push(p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  geo.addGroup(0, 6, 0);
  geo.addGroup(6, 12, 1);
  return geo;
}

function pickMaterials(b, box, archetype, fine) {
  if (b.landmark) {
    const stone = (b.landmarkKind === 'university' || b.landmarkKind === 'historic') ? landmarkStoneMaterials[b.landmarkKind] : null;
    const base = landmarkMaterials[b.landmarkKind] || wallMaterials[0][0];
    return { wallMat: stone || base, roofMat: base };
  }
  if (archetype === 'industrial') {
    return { wallMat: industrialWallMaterials[Math.floor(fine * industrialWallMaterials.length)], roofMat: industrialRoofMaterial };
  }
  const familyIdx = familyIndexFor(box);
  const fam = PALETTE_FAMILIES[familyIdx];
  return { wallMat: wallMaterials[familyIdx][Math.floor(fine * fam.wall.length)], roofMat: roofMaterials[familyIdx] };
}

// Ground-level door recess, roughly centered on whichever bbox face runs
// along the footprint's LONGER axis (the "street-facing" side, absent real
// street-adjacency data) - a small near-black inset box straddling the wall
// plane, matte so it reads as a shadowed opening rather than another glossy
// surface. `sideFine` (a hash decorrelated from the material-shade pick)
// chooses which of the two long faces gets the door, for variety.
function addDoorInset(group, box, sideFine) {
  const longX = box.w >= box.d;
  const span = longX ? box.w : box.d;
  if (span < 3) return;
  const doorW = Math.min(1.7, span * 0.24);
  const doorH = 2.3;
  const outset = 0.15;
  const door = new THREE.Mesh(UNIT_BOX, doorMaterial);
  if (longX) {
    door.scale.set(doorW, doorH, outset * 2);
    const z = sideFine < 0.5 ? box.miny - outset : box.maxy + outset;
    door.position.set(box.cx, doorH / 2, z);
  } else {
    door.scale.set(outset * 2, doorH, doorW);
    const x = sideFine < 0.5 ? box.minx - outset : box.maxx + outset;
    door.position.set(x, doorH / 2, box.cy);
  }
  group.add(door);
}

// Thin dark trim ring right under the roofline/parapet - the single
// cheapest "this building has a finished edge, not just an extruded box"
// cue available (real eaves/gutters read as a dark line exactly here).
function addEaveTrim(group, box, parts, depth) {
  if (!parts.eave) parts.eave = buildBandGeometry(box, 0.14, 0.1);
  const eave = new THREE.Mesh(parts.eave, eaveTrimMaterial);
  eave.position.y = depth - 0.14;
  group.add(eave);
}

function addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2) {
  const longX = box.w >= box.d;
  const shortAxis = Math.min(box.w, box.d);
  const sw = Math.min(shortAxis * 0.55, 6);
  const steepleH = depth * 1.8 + 3;
  const x = longX ? box.minx + sw * 0.7 : box.cx;
  const z = longX ? box.cz : box.miny + sw * 0.7;

  const steeple = new THREE.Mesh(UNIT_BOX, wallMat);
  steeple.scale.set(sw, steepleH, sw);
  steeple.position.set(x, steepleH / 2, z);
  group.add(steeple);

  const capH = sw * 1.1;
  const cap = new THREE.Mesh(UNIT_CONE, roofMat);
  cap.scale.set(sw * 0.75, capH, sw * 0.75);
  cap.position.set(x, steepleH + capH / 2, z);
  group.add(cap);

  // Small gilded cross/finial on the spire tip - two thin crossed boxes,
  // 24 triangles total, but it is the single strongest "this is a church,
  // not a tower" silhouette cue a steeple can have.
  const crossBase = steepleH + capH;
  const crossH = sw * 0.85;
  const barT = Math.max(0.12, sw * 0.1);
  const vBar = new THREE.Mesh(UNIT_BOX, finialMaterial);
  vBar.scale.set(barT, crossH, barT);
  vBar.position.set(x, crossBase + crossH / 2, z);
  group.add(vBar);
  const hBar = new THREE.Mesh(UNIT_BOX, finialMaterial);
  hBar.scale.set(sw * 0.5, barT, barT);
  hBar.position.set(x, crossBase + crossH * 0.6, z);
  group.add(hBar);

  if (!parts.roof) {
    const ridgeH = Math.min(0.7 + fine2 * 0.6, shortAxis * 0.35, 2.4);
    parts.roof = buildRidgeGeometry(box, depth, ridgeH);
  }
  group.add(new THREE.Mesh(parts.roof, roofMat));
}

function addLandmarkDetail(group, b, box, parts, depth, roofMat, fine2) {
  const kind = b.landmarkKind;
  if (kind === 'tower') {
    // Instead of one box+cap, taper the top of the shaft through two
    // narrowing box stages (matching Martinitoren's real silhouette: a
    // square brick shaft narrowing in stages toward the top) before the
    // cone spire and a small gilded finial - `depth` for tower landmarks is
    // already reduced to a fraction of TOWER_HEIGHT (see buildBuildingMesh)
    // specifically to leave room for these stages while keeping roughly the
    // same overall height as before.
    const s2w = Math.max(1.6, box.w * 0.7), s2d = Math.max(1.6, box.d * 0.7);
    const s3w = Math.max(1.1, box.w * 0.45), s3d = Math.max(1.1, box.d * 0.45);
    const stage2H = TOWER_HEIGHT * 0.17;
    const stage3H = TOWER_HEIGHT * 0.1;
    let y = depth;
    const stage2 = new THREE.Mesh(UNIT_BOX, roofMat);
    stage2.scale.set(s2w, stage2H, s2d);
    stage2.position.set(box.cx, y + stage2H / 2, box.cz);
    group.add(stage2);
    y += stage2H;
    const stage3 = new THREE.Mesh(UNIT_BOX, roofMat);
    stage3.scale.set(s3w, stage3H, s3d);
    stage3.position.set(box.cx, y + stage3H / 2, box.cz);
    group.add(stage3);
    y += stage3H;
    const capRad = Math.max(1.3, (s3w + s3d) / 4.2);
    const capH = TOWER_HEIGHT * 0.1;
    const cap = new THREE.Mesh(UNIT_CONE, roofMat);
    cap.scale.set(capRad, capH, capRad);
    cap.position.set(box.cx, y + capH / 2, box.cz);
    group.add(cap);
    y += capH;
    const finialH = TOWER_HEIGHT * 0.035;
    const finial = new THREE.Mesh(UNIT_CONE, finialMaterial);
    finial.scale.set(capRad * 0.22, finialH, capRad * 0.22);
    finial.position.set(box.cx, y + finialH / 2, box.cz);
    group.add(finial);
  } else if (kind === 'church') {
    addChurchDetail(group, box, parts, depth, roofMat, roofMat, fine2);
  } else if (kind === 'station') {
    const margin = 2;
    const canopyY = depth + 1.2;
    const canopy = new THREE.Mesh(UNIT_BOX, canopyMaterial);
    canopy.scale.set(box.w + margin * 2, 0.4, box.d + margin * 2);
    canopy.position.set(box.cx, canopyY, box.cz);
    group.add(canopy);

    // Repeating support pillars along both long edges under the canopy -
    // real station train sheds read unmistakably from the row of columns,
    // not from the flat canopy slab alone. Plain boxes (cheapest primitive
    // available) read fine as steel supports at this scale/distance.
    const longX = box.w >= box.d;
    const spanLen = (longX ? box.w : box.d) + margin * 2;
    const pillarCount = Math.max(3, Math.min(8, Math.round(spanLen / 8)));
    const edgeOffset = (longX ? box.d : box.w) / 2 + margin - 0.4;
    const pillarSize = 0.32;
    for (let i = 0; i < pillarCount; i++) {
      const t = pillarCount > 1 ? (i / (pillarCount - 1) - 0.5) : 0;
      const along = t * (spanLen - pillarSize * 2);
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(UNIT_BOX, canopyMaterial);
        pillar.scale.set(pillarSize, canopyY, pillarSize);
        if (longX) pillar.position.set(box.cx + along, canopyY / 2, box.cz + side * edgeOffset);
        else pillar.position.set(box.cx + side * edgeOffset, canopyY / 2, box.cz + along);
        group.add(pillar);
      }
    }
  } else if (kind === 'museum' || kind === 'modern') {
    const bandH = Math.min(2.2, depth * 0.18);
    const band = new THREE.Mesh(UNIT_BOX, accentMaterials[kind]);
    band.scale.set(box.w + 0.3, bandH, box.d + 0.3);
    band.position.set(box.cx, depth * 0.6, box.cz);
    group.add(band);
    // Slim roofline accent trim - a second, thinner band right at the top
    // edge gives the glass-box massing a finished cap instead of a bare
    // extrusion edge.
    if (!parts.topcap) parts.topcap = buildBandGeometry(box, 0.22, 0.08);
    const topcap = new THREE.Mesh(parts.topcap, accentMaterials[kind]);
    topcap.position.y = depth - 0.22;
    group.add(topcap);
  } else if (kind === 'mall') {
    const bandH = Math.min(3, depth * 0.22);
    const band = new THREE.Mesh(UNIT_BOX, accentMaterials.mall);
    band.scale.set(box.w + 0.4, bandH, box.d + 0.4);
    band.position.set(box.cx, depth - bandH * 0.7, box.cz);
    group.add(band);
    // Small entrance canopy jutting off the shorter face - breaks up the
    // big-box mall silhouette with a porte-cochere cue.
    const canopyW = Math.min(box.w, box.d) * 0.4;
    const canopy = new THREE.Mesh(UNIT_BOX, canopyMaterial);
    canopy.scale.set(canopyW, 0.35, canopyW * 0.6);
    canopy.position.set(box.cx, depth * 0.35, box.miny - canopyW * 0.3);
    group.add(canopy);
  } else if (kind === 'university' || kind === 'historic') {
    const cornice = new THREE.Mesh(UNIT_BOX, corniceMaterial);
    cornice.scale.set(box.w + 0.5, 0.35, box.d + 0.5);
    cornice.position.set(box.cx, depth - 0.5, box.cz);
    group.add(cornice);
  }
  // stadium: the brief's per-kind design list doesn't call out a shape for
  // it, so it keeps the plain landmark-tinted extrusion only.
}

export function buildBuildingMesh(b) {
  const box = bboxOf(b);
  const archetype = archetypeOf(b);
  const fine = hash2(box.cx, box.cy);
  const fine2 = hash2(box.cx * 1.7 + 3.1, box.cy * 1.3 - 2.7);

  let depth;
  if (b.landmark && b.landmarkKind === 'tower') depth = TOWER_HEIGHT * 0.6;
  else if (archetype === 'houseboat') depth = Math.min(HOUSEBOAT_MAX_DEPTH, Math.max(1.6, b.h * LEVEL_HEIGHT));
  else depth = Math.max(2.4, b.h * LEVEL_HEIGHT);

  if (!b._geo3dParts) b._geo3dParts = {};
  const parts = b._geo3dParts;
  if (!parts.main) parts.main = buildMainGeometry(b, depth);

  const { wallMat, roofMat } = pickMaterials(b, box, archetype, fine);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(parts.main, wallMat));

  if (b.landmark) {
    addLandmarkDetail(group, b, box, parts, depth, roofMat, fine2);
  } else if (archetype === 'house') {
    if (!parts.roof) {
      const shortAxis = Math.min(box.w, box.d);
      const ridgeH = Math.min(0.9 + fine2 * 1.1, Math.max(0.4, shortAxis * 0.6), 3.2);
      parts.roof = buildRidgeGeometry(box, depth, ridgeH);
    }
    group.add(new THREE.Mesh(parts.roof, [wallMat, roofMat]));
    addEaveTrim(group, box, parts, depth);
    addDoorInset(group, box, fine2);
  } else if (archetype === 'apartments') {
    if (!parts.band) parts.band = buildBandGeometry(box, 0.18);
    if (!parts.colorBand) parts.colorBand = buildBandGeometry(box, 0.5, 0.03);
    const floorCount = Math.min(9, Math.max(1, Math.round(depth / LEVEL_HEIGHT)));
    const jitter = (fine2 - 0.5) * LEVEL_HEIGHT * 0.3;
    // Facade color banding: every 3rd floor line gets a broader band in a
    // DIFFERENT shade from the same coarse-hash family (never a foreign
    // color), so blocks still cohere while each apartment building reads
    // less like one flat-tinted slab.
    const familyIdx = familyIndexFor(box);
    const famWalls = PALETTE_FAMILIES[familyIdx].wall;
    const shadeIdx = Math.floor(fine * famWalls.length);
    const bandMat = wallMaterials[familyIdx][(shadeIdx + 2) % famWalls.length];
    for (let i = 1; i < floorCount; i++) {
      const band = new THREE.Mesh(parts.band, windowBandMaterial);
      band.position.y = i * LEVEL_HEIGHT + jitter;
      group.add(band);
      if (i % 3 === 0) {
        const colorBand = new THREE.Mesh(parts.colorBand, bandMat);
        colorBand.position.y = i * LEVEL_HEIGHT + jitter - 0.6;
        group.add(colorBand);
      }
    }
    addEaveTrim(group, box, parts, depth);
    addDoorInset(group, box, fine2);
  } else if (archetype === 'retail') {
    if (!parts.band) parts.band = buildBandGeometry(box, Math.min(3, Math.max(1.2, depth - 0.3)), 0.09);
    group.add(new THREE.Mesh(parts.band, shopfrontMaterial));
    addEaveTrim(group, box, parts, depth);
    addDoorInset(group, box, fine2);
  } else if (archetype === 'church') {
    addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2);
    addEaveTrim(group, box, parts, depth);
    addDoorInset(group, box, fine2);
  }
  // industrial/houseboat/generic: plain box is the whole point, nothing more to add.

  return group;
}
