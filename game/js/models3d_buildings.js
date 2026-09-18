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
// happens.

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

// Every mesh below reuses one of these - never allocate a material per
// building. Only ~30-100 buildings are ever live at once but they stream
// in/out of view constantly as the player moves, so this runs a lot.
const wallMaterials = PALETTE_FAMILIES.map((f) => f.wall.map((c) => new THREE.MeshLambertMaterial({ color: c })));
const roofMaterials = PALETTE_FAMILIES.map((f) => new THREE.MeshLambertMaterial({ color: f.roof, side: THREE.DoubleSide }));
const industrialWallMaterials = INDUSTRIAL_WALLS.map((c) => new THREE.MeshLambertMaterial({ color: c }));
const industrialRoofMaterial = new THREE.MeshLambertMaterial({ color: INDUSTRIAL_ROOF, side: THREE.DoubleSide });
const landmarkMaterials = Object.fromEntries(Object.entries(LANDMARK_COLOR3D).map(([k, c]) => [k, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })]));
const landmarkStoneMaterials = Object.fromEntries(Object.entries(LANDMARK_STONE).map(([k, c]) => [k, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })]));
const accentMaterials = Object.fromEntries(Object.entries(ACCENT_COLOR).map(([k, c]) => [k, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })]));
const windowBandMaterial = new THREE.MeshLambertMaterial({ color: 0x1b222c, side: THREE.DoubleSide });
const shopfrontMaterial = new THREE.MeshLambertMaterial({ color: 0x17242b, side: THREE.DoubleSide });
const corniceMaterial = new THREE.MeshLambertMaterial({ color: 0xd8cdb0, side: THREE.DoubleSide });
const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x565c53, side: THREE.DoubleSide });

// Shared unit primitives for every small protruding detail (window/shopfront
// bands' end caps aside, this covers cornices, canopies, steeples, tower
// caps) - scaled/positioned per building instead of ever generating new
// geometry for them, so their GPU cost is fixed at two geometries total no
// matter how many buildings are on screen.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CONE = new THREE.ConeGeometry(1, 1, 8);

function bboxOf(b) {
  const [minx, miny, maxx, maxy] = b.bounds;
  return {
    minx, miny, maxx, maxy, w: maxx - minx, d: maxy - miny,
    cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, cz: -(miny + maxy) / 2,
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

function shapeFromPts(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
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
// regardless of footprint complexity.
function buildBandGeometry(box, thickness, outset = 0.06) {
  const x0 = box.minx - outset, x1 = box.maxx + outset;
  const z0 = -(box.maxy + outset), z1 = -(box.miny - outset);
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
// end caps). Winding per axis case below is hand-verified (cross product)
// to face outward; every roof-ish material is also set to DoubleSide above
// as a belt-and-suspenders safety net since these are small stylized caps,
// not load-bearing geometry.
function buildRidgeGeometry(box, baseY, ridgeHeight) {
  const { minx, miny, maxx, maxy, w, d } = box;
  const topY = baseY + ridgeHeight;
  const verts = [];
  const push = (p) => verts.push(p[0], p[1], p[2]);
  if (w >= d) {
    const x0 = minx, x1 = maxx, z0 = -maxy, z1 = -miny, zMid = (z0 + z1) / 2;
    const A = [x0, baseY, z0], B = [x0, baseY, z1], R0 = [x0, topY, zMid];
    const C = [x1, baseY, z0], D = [x1, baseY, z1], R1 = [x1, topY, zMid];
    for (const t of [[A, B, R0], [D, C, R1], [A, C, R1], [A, R1, R0], [B, D, R1], [B, R1, R0]]) for (const p of t) push(p);
  } else {
    const x0 = minx, x1 = maxx, z0 = -maxy, z1 = -miny, xMid = (x0 + x1) / 2;
    const A = [x0, baseY, z0], B = [x1, baseY, z0], P0 = [xMid, topY, z0];
    const C = [x0, baseY, z1], D = [x1, baseY, z1], P1 = [xMid, topY, z1];
    for (const t of [[A, P0, B], [C, D, P1], [A, C, P1], [A, P1, P0], [B, P1, D], [B, P0, P1]]) for (const p of t) push(p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
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

function addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2) {
  const longX = box.w >= box.d;
  const shortAxis = Math.min(box.w, box.d);
  const sw = Math.min(shortAxis * 0.55, 6);
  const steepleH = depth * 1.8 + 3;
  const x = longX ? box.minx + sw * 0.7 : box.cx;
  const z = longX ? box.cz : -box.miny - sw * 0.7;

  const steeple = new THREE.Mesh(UNIT_BOX, wallMat);
  steeple.scale.set(sw, steepleH, sw);
  steeple.position.set(x, steepleH / 2, z);
  group.add(steeple);

  const capH = sw * 1.1;
  const cap = new THREE.Mesh(UNIT_CONE, roofMat);
  cap.scale.set(sw * 0.75, capH, sw * 0.75);
  cap.position.set(x, steepleH + capH / 2, z);
  group.add(cap);

  if (!parts.roof) {
    const ridgeH = Math.min(0.7 + fine2 * 0.6, shortAxis * 0.35, 2.4);
    parts.roof = buildRidgeGeometry(box, depth, ridgeH);
  }
  group.add(new THREE.Mesh(parts.roof, roofMat));
}

function addLandmarkDetail(group, b, box, parts, depth, roofMat, fine2) {
  const kind = b.landmarkKind;
  if (kind === 'tower') {
    const rad = Math.max(2, Math.min(box.w, box.d) * 0.35);
    const capH = 14;
    const cap = new THREE.Mesh(UNIT_CONE, roofMat);
    cap.scale.set(rad, capH, rad);
    cap.position.set(box.cx, depth + capH / 2, box.cz);
    group.add(cap);
  } else if (kind === 'church') {
    addChurchDetail(group, box, parts, depth, roofMat, roofMat, fine2);
  } else if (kind === 'station') {
    const margin = 2;
    const canopy = new THREE.Mesh(UNIT_BOX, canopyMaterial);
    canopy.scale.set(box.w + margin * 2, 0.4, box.d + margin * 2);
    canopy.position.set(box.cx, depth + 1.2, box.cz);
    group.add(canopy);
  } else if (kind === 'museum' || kind === 'modern') {
    const bandH = Math.min(2.2, depth * 0.18);
    const band = new THREE.Mesh(UNIT_BOX, accentMaterials[kind]);
    band.scale.set(box.w + 0.3, bandH, box.d + 0.3);
    band.position.set(box.cx, depth * 0.6, box.cz);
    group.add(band);
  } else if (kind === 'mall') {
    const bandH = Math.min(3, depth * 0.22);
    const band = new THREE.Mesh(UNIT_BOX, accentMaterials.mall);
    band.scale.set(box.w + 0.4, bandH, box.d + 0.4);
    band.position.set(box.cx, depth - bandH * 0.7, box.cz);
    group.add(band);
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
  if (b.landmark && b.landmarkKind === 'tower') depth = TOWER_HEIGHT;
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
    group.add(new THREE.Mesh(parts.roof, roofMat));
  } else if (archetype === 'apartments') {
    if (!parts.band) parts.band = buildBandGeometry(box, 0.18);
    const floorCount = Math.min(9, Math.max(1, Math.round(depth / LEVEL_HEIGHT)));
    const jitter = (fine2 - 0.5) * LEVEL_HEIGHT * 0.3;
    for (let i = 1; i < floorCount; i++) {
      const band = new THREE.Mesh(parts.band, windowBandMaterial);
      band.position.y = i * LEVEL_HEIGHT + jitter;
      group.add(band);
    }
  } else if (archetype === 'retail') {
    if (!parts.band) parts.band = buildBandGeometry(box, Math.min(3, Math.max(1.2, depth - 0.3)), 0.09);
    group.add(new THREE.Mesh(parts.band, shopfrontMaterial));
  } else if (archetype === 'church') {
    addChurchDetail(group, box, parts, depth, wallMat, roofMat, fine2);
  }
  // industrial/houseboat/generic: plain box is the whole point, nothing more to add.

  return group;
}
