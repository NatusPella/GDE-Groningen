import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { geometryFromPlain } from './geoplain.js';
import { registerKernels } from './geojobs.js';
import { setCountryBounds } from './countryfield.js';
import { slimWorkerMap } from './mapdata.js';
import { loadMapAuto } from './tileworld.js';
import { setRoadNetwork, roadSurfaceGeometries, roadKey } from './roadsurface.js';
import { terrainArrays } from './terrain3d.js';
import { structureArrays, overpassDeckArrays, structureTransfer } from './roadstructures3d.js';
import { shoreParts } from './quaywalls.js';
import { adoptSideSpans } from './movablebridges.js';

// Geometry jobs that run in the geometry worker (geoworker.js) or, as a
// fallback, on the main thread (geojobs.js): data in, typed arrays out. Only
// three's math and buffer classes, never the scene or the DOM. Every kernel
// returns { result, transfer }.

// --- city street props (cityprops.js) ---------------------------------------

const attrOf = (a) => a && new THREE.BufferAttribute(a.array, a.itemSize, a.normalized);

// Colours bake into each proto; GeoBuilder.geo re-colours uniformly, so
// instances are merged by copying attributes instead. geos: plain attribute
// sets, items: [geo index, matrix elements].
function mergeInstances(geos, items) {
  let total = 0;
  for (const [gi] of items) total += geos[gi].position.array.length / 3;
  if (!total) return null;
  const pos = new Float32Array(total * 3), nor = new Int8Array(total * 3), col = new Uint8Array(total * 3), uvs = new Uint16Array(total * 2);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), m = new THREE.Matrix4();
  const attrs = geos.map((g) => g && { P: attrOf(g.position), N: attrOf(g.normal), C: attrOf(g.color), U: attrOf(g.uv) });
  let o = 0;
  for (const [gi, el] of items) {
    const { P, N, C, U } = attrs[gi];
    m.fromArray(el);
    nm.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      n.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(nm).normalize();
      nor[o * 3] = Math.round(n.x * 127); nor[o * 3 + 1] = Math.round(n.y * 127); nor[o * 3 + 2] = Math.round(n.z * 127);
      col[o * 3] = C.array[i * 3]; col[o * 3 + 1] = C.array[i * 3 + 1]; col[o * 3 + 2] = C.array[i * 3 + 2];
      uvs[o * 2] = Math.round(U.array[i * 2] * 65535); uvs[o * 2 + 1] = Math.round(U.array[i * 2 + 1] * 65535);
      o++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeBoundingSphere();
  const s = g.boundingSphere;
  return { pos, nor, col, uvs, sphere: [s.center.x, s.center.y, s.center.z, s.radius] };
}

function cityMerge({ geos, lists }) {
  const out = lists.map((items) => mergeInstances(geos, items));
  const transfer = [];
  for (const r of out) if (r) transfer.push(r.pos.buffer, r.nor.buffer, r.col.buffer, r.uvs.buffer);
  return { result: out, transfer };
}

// --- city road surfaces (roadsurface.js) ----------------------------------

// A BufferGeometry as plain data and back (attributes, index, groups,
// bounding sphere); the arrays move as transferables.
function plainGeometry(g, transfer) {
  if (!g) return null;
  const attrs = {};
  for (const k in g.attributes) {
    const a = g.attributes[k];
    attrs[k] = { array: a.array, itemSize: a.itemSize, normalized: a.normalized };
    transfer.push(a.array.buffer);
  }
  if (g.index) transfer.push(g.index.array.buffer);
  const s = g.boundingSphere;
  return { attrs, index: g.index ? g.index.array : null, groups: g.groups.map((q) => ({ ...q })), sphere: s ? [s.center.x, s.center.y, s.center.z, s.radius] : null };
}
// worker side: its own copy of the map, from the same files, with the roads
// the main thread has dropped since (home.js) taken out the same way
const RD = { byKey: null, map: null };
async function roadInit({ url, keys }) {
  const map = await loadMapAuto(url, null, { pool: false });
  adoptSideSpans(map.roads); // the same movable side spans as the main thread, so the shores draw no static deck under them
  const want = new Set(keys);
  for (let i = map.roads.length - 1; i >= 0; i--) {
    const r = map.roads[i];
    if (want.has(roadKey(r))) continue;
    map.roads.splice(i, 1);
    for (const arr of map.roadGrid.map.values()) { const j = arr.indexOf(r); if (j >= 0) arr.splice(j, 1); }
  }
  slimWorkerMap(map);
  setRoadNetwork(map);
  RD.map = map;
  RD.byKey = new Map(map.roads.map((r) => [roadKey(r), r]));
  let missing = 0;
  for (const k of keys) if (!RD.byKey.has(k)) missing++;
  return { result: { roads: map.roads.length, missing }, transfer: [] };
}

// struct: also the civil works (roadstructures3d.js), once per road
function roadGeo({ key, detail, struct }) {
  const r = RD.byKey && RD.byKey.get(key);
  if (!r) return { result: null, transfer: [] };
  const g = roadSurfaceGeometries(r, detail);
  const transfer = [];
  const result = { sidewalk: plainGeometry(g.sidewalk, transfer), road: plainGeometry(g.road, transfer), mark: plainGeometry(g.mark, transfer) };
  if (struct) {
    const elev = RD.map.elev;
    result.struct = !elev || !elev.has ? null : structureTransfer(r.z ? structureArrays(r, RD.map) : overpassDeckArrays(r, RD.map), transfer);
  }
  return { result, transfer };
}

// --- city shores (quaywalls.js), on the worker's map -------------------------

function shoreInit({ bounds }) {
  setCountryBounds(bounds);
  return { result: true, transfer: [] };
}

// wi: the polygon's place in map.water (both maps come from the same file);
// its point count and first point make sure it is the same one
function shore({ wi, n, x, y, waterY, withApron }) {
  const poly = RD.map && RD.map.water[wi];
  if (!poly || poly.pts.length !== n || poly.pts[0][0] !== x || poly.pts[0][1] !== y) return { result: null, transfer: [] };
  const s = shoreParts(poly, RD.map, waterY, withApron);
  const transfer = [];
  return { result: { parts: s.parts.map((q) => ({ kind: q.kind, geo: plainGeometry(q.geo, transfer) })), seats: s.seats, hulls: s.hulls }, transfer };
}

// --- terrain (terrain3d.js), while the game loads ----------------------------

function terrain({ bounds, water }) {
  const T = terrainArrays(bounds, water);
  return { result: T, transfer: [T.positions.buffer, T.normals.buffer, ...T.tiles.map((t) => t.index.buffer)] };
}

export const KERNELS = { cityMerge, roadInit, roadGeo, shoreInit, shore, terrain };
registerKernels(KERNELS);
export { geometryFromPlain };
