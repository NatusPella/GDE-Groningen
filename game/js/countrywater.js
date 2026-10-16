import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y, setExtraWater } from './util.js';
import { COUNTRY_UNIFORMS, SHORE_RW, rectOutside, realWater, countryBounds, realZone } from './countryfield.js';
import { EDGE, wideWaterAt, openWater, canalGridSnapshot, countryWater } from './countryedge.js';
import { setCountryWaterKind } from './waterlevels.js';
import { runGeo, geoWorkerActive, onGeoFallback } from './geojobs.js';
import { setWaterQuery } from './geokernels.js';
import { REAL } from './countryreal.js';
import { sharedWaterMaterial } from './water3d.js';
import { setCountryClearance } from './waterindex.js';
import { applyCutMask } from './cutmask3d.js';

// The Ommeland canals, maren and lakes as the city's water: past the map
// rectangle the real open water (countryreal.js distance field, and the
// lines of the narrower canals and maren, countryedge.js) gets the
// shared water3d surface at WATER_Y over a muddy bank basin, merged per prop
// chunk (one water + one basin draw per chunk with water). The ground shader
// opens over it within uWaterNear and paints it beyond, the ditches stay
// painted. A flat bed under the open water hides streaming gaps.

const BED_Y = WATER_Y - 0.55;

// The geometry is built per chunk (countrywatergeo.js) in the geometry
// worker, which gets the water field and the canal lines once.
let execEdge = null;
function readyExec() {
  if (execEdge === EDGE.ready) return;
  execEdge = EDGE.ready;
  if (geoWorkerActive()) {
    const z = realZone();
    const grid = (G) => ({ ...G, data: G.data.slice() });
    runGeo('waterInit', { bounds: countryBounds(), zone: { ...z, water: grid(z.water), urban: grid(z.urban) }, canals: canalGridSnapshot() });
  }
}
onGeoFallback(() => setWaterQuery(openWater));

function wrap(part, attrs) {
  const geo = new THREE.BufferGeometry();
  for (const [name, size] of attrs) geo.setAttribute(name, new THREE.BufferAttribute(part[name], size));
  geo.setIndex(new THREE.BufferAttribute(part.index, 1));
  return geo;
}

let W = null;
function init(group) {
  const bankMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), applyCutMask(new THREE.MeshBasicMaterial({ color: 0x1e2a2c }), null, true));
  bed.position.y = BED_Y;
  bed.renderOrder = 1;
  bed.visible = false;
  bed.matrixAutoUpdate = false;
  group.add(bed);
  W = { group, bankMat, bed, chunks: 0, tris: 0 };
  setExtraWater(wideWaterAt);
  setCountryClearance(countryClearance);
  setCountryWaterKind(countryWater);
}

function dropMeshes(ch) {
  if (!ch.waterMeshes) return;
  for (const m of ch.waterMeshes) { W.group.remove(m); m.geometry.dispose(); }
  ch.waterMeshes = null;
}

// Rebuilds a prop chunk's water from its tiles (mid: per tile tier); the old
// meshes stay until the new ones arrive.
export function rebuildChunkWater(ch, group, T, isMid) {
  if (!W) init(group);
  if (!REAL.ready) { dropMeshes(ch); return; }
  readyExec();
  const token = ch.waterToken = (ch.waterToken || 0) + 1;
  const tiles = [...ch.tiles].map((t) => ({ tx: t.tx, ty: t.ty, mid: isMid(t) }));
  runGeo('waterChunk', { tiles, T }, (r) => {
    if (ch.waterToken !== token) return;
    dropMeshes(ch);
    if (!r) return;
    const meshes = [];
    const water = new THREE.Mesh(wrap(r.water, [['position', 3], ['aEdge', 1], ['aFlow', 2]]), sharedWaterMaterial());
    water.position.y = WATER_Y;
    meshes.push(water);
    if (r.bank) {
      const basin = new THREE.Mesh(wrap(r.bank, [['position', 3], ['color', 3], ['normal', 3]]), W.bankMat);
      basin.receiveShadow = true;
      meshes.push(basin);
    }
    for (const m of meshes) {
      m.geometry.boundingSphere = ch.sphere.clone();
      m.userData.shared = true;
      m.userData.kind = 'country:water';
      m.updateMatrix();
      m.matrixAutoUpdate = false;
      W.group.add(m);
    }
    ch.waterMeshes = meshes;
  });
}

export function dropChunkWater(ch) {
  ch.waterToken = (ch.waterToken || 0) + 1;
  if (W) dropMeshes(ch);
}

// Per frame: where the ground opens over the water, and the bed under it.
export function updateCountryWater(px, py, radius, time) {
  const u = COUNTRY_UNIFORMS.uWaterNear.value;
  u[0] = px; u[1] = py; u[2] = W ? radius : 0; u[3] = time % 1000;
  if (!W) return;
  const on = radius > 0 && REAL.ready;
  W.bed.visible = on;
  if (on) {
    W.bed.position.set(px, BED_Y, py);
    W.bed.scale.set(radius * 2 + 40, 1, radius * 2 + 40);
    W.bed.updateMatrix();
  }
}

// Free water for boats (waterindex.js): past the map edge the open-water
// distance, inside city water by the edge cityShoreFix.
export function countryClearance(x, y, d) {
  if (d >= 0) return cityShoreFix(x, y, d);
  return rectOutside(x, y) > -3 ? openClearance(x, y) - SHORE_RW : -1;
}

// The water field is a 10 m raster, so a canal not much wider than a cell
// gets shallow valleys between the cell centres: water on both sides, but
// near enough to "shore" that a boat's hull can't cross them. A real
// distance-to-shore has no such valley unless it is a pinch between two
// banks (then it is a crest the other way), so a valley across one of four
// directions is lifted toward its sides, by at most SEAM_LIFT.
const SEAM_S = 4;
const SEAM_LIFT = 1.5;
const SEAM_DIRS = [[1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]];
function openClearance(x, y) {
  const f = openWater(x, y);
  if (f <= SHORE_RW) return f;
  let out = f;
  for (const [ux, uy] of SEAM_DIRS) {
    const a = openWater(x + ux * SEAM_S, y + uy * SEAM_S);
    if (a <= f) continue;
    const b = openWater(x - ux * SEAM_S, y - uy * SEAM_S);
    if (b <= f) continue;
    const pa = openWater(x - uy * SEAM_S, y + ux * SEAM_S), pb = openWater(x + uy * SEAM_S, y - ux * SEAM_S);
    if (pa < f - 0.5 && pb < f - 0.5) continue;
    out = Math.max(out, Math.min(a, b, f + SEAM_LIFT));
  }
  return out;
}

// City water vertices by the map edge where the canal carries on: the
// distance to shore follows the field instead of the cut along the edge.
export function cityShoreFix(x, y, d) {
  if (!REAL.ready || rectOutside(x, y) < -30) return d;
  const rw = realWater(x, y);
  if (rw <= SHORE_RW || -rectOutside(x, y) > d + 0.5) return d;
  return Math.min(24, Math.max(d, rw - SHORE_RW));
}

export function countryWaterStats(chunks) {
  let meshes = 0, tris = 0;
  for (const ch of chunks) for (const m of ch.waterMeshes || []) { meshes++; tris += m.geometry.index.count / 3; }
  return { meshes, tris };
}
