import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { setCountryBounds, setRealZone } from './countryfield.js';
import { tileWater, chunkWaterArrays, canalWaterFrom, openWaterFrom } from './countrywatergeo.js';
import { loadMap, slimWorkerMap } from './mapdata.js';
import { setRoadNetwork, roadSurfaceGeometries, roadKey } from './roadsurface.js';
import { terrainArrays } from './terrain3d.js';

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

// --- Ommeland water (countrywater.js) ---------------------------------------

// worker side: the field and canal snapshot arrive once (waterInit); the
// per-tile results are kept for the last 160 tiles (about the streamed ring)
const W = { open: null, cache: new Map() };
const CACHE_MAX = 160;

function waterInit({ bounds, zone, canals }) {
  setCountryBounds(bounds);
  setRealZone(zone);
  W.open = openWaterFrom(canalWaterFrom({ grid: new Map(canals.grid), cell: canals.cell }));
  W.cache.clear();
  return { result: true, transfer: [] };
}

function tileWaterCached(open, t, T) {
  const key = t.tx * 100003 + t.ty + (t.mid ? 0.5 : 0);
  let w = W.cache.get(key);
  if (w === undefined) {
    w = tileWater(open, t.tx, t.ty, T, t.mid);
    W.cache.set(key, w);
    if (W.cache.size > CACHE_MAX) W.cache.delete(W.cache.keys().next().value);
  }
  return w;
}

function waterChunk({ tiles, T }) {
  const r = chunkWaterArrays(tiles, (t) => tileWaterCached(W.open, t, T));
  const transfer = [];
  if (r) for (const part of [r.water, r.bank]) if (part) for (const k in part) transfer.push(part[k].buffer);
  return { result: r, transfer };
}

// main-thread fallback: the live openWater (countryedge.js) instead of a snapshot
export function setWaterQuery(fn) {
  W.open = fn;
  W.cache.clear();
}

// --- city road surfaces (roadsurface.js) ----------------------------------

// A BufferGeometry as plain data and back (attributes, index, groups,
// bounding sphere); the arrays move as transferables.
export function plainGeometry(g, transfer) {
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
export function geometryFromPlain(p) {
  if (!p) return null;
  const g = new THREE.BufferGeometry();
  for (const k in p.attrs) { const a = p.attrs[k]; g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized)); }
  if (p.index) g.setIndex(new THREE.BufferAttribute(p.index, 1));
  for (const q of p.groups) g.addGroup(q.start, q.count, q.materialIndex);
  if (p.sphere) g.boundingSphere = new THREE.Sphere(new THREE.Vector3(p.sphere[0], p.sphere[1], p.sphere[2]), p.sphere[3]);
  return g;
}

// worker side: its own copy of the map, from the same files, with the roads
// the main thread has dropped since (home.js) taken out the same way
const RD = { byKey: null };
async function roadInit({ url, keys }) {
  const map = await loadMap(url);
  const want = new Set(keys);
  for (let i = map.roads.length - 1; i >= 0; i--) {
    const r = map.roads[i];
    if (want.has(roadKey(r))) continue;
    map.roads.splice(i, 1);
    for (const arr of map.roadGrid.map.values()) { const j = arr.indexOf(r); if (j >= 0) arr.splice(j, 1); }
  }
  slimWorkerMap(map);
  setRoadNetwork(map);
  RD.byKey = new Map(map.roads.map((r) => [roadKey(r), r]));
  let missing = 0;
  for (const k of keys) if (!RD.byKey.has(k)) missing++;
  return { result: { roads: map.roads.length, missing }, transfer: [] };
}

function roadGeo({ key, detail }) {
  const r = RD.byKey && RD.byKey.get(key);
  if (!r) return { result: null, transfer: [] };
  const g = roadSurfaceGeometries(r, detail);
  const transfer = [];
  return { result: { sidewalk: plainGeometry(g.sidewalk, transfer), road: plainGeometry(g.road, transfer), mark: plainGeometry(g.mark, transfer) }, transfer };
}

// --- terrain (terrain3d.js), while the game loads ----------------------------

function terrain({ bounds, water }) {
  const T = terrainArrays(bounds, water);
  return { result: T, transfer: [T.positions.buffer, T.normals.buffer, ...T.tiles.map((t) => t.index.buffer)] };
}

export const KERNELS = { cityMerge, waterInit, waterChunk, roadInit, roadGeo, terrain };
