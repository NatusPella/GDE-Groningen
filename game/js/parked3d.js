import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { UNLIT_LAMP } from './nightlights3d.js';

// Sleeping parked cars (parkedcars.js) drawn as a handful of merged, static
// meshes: every 64 m chunk bakes its cars into one geometry per material
// (a few draw calls for the whole street instead of ~15 per car), with no
// per-frame matrix work. A chunk is rebaked only when a car in it spawns,
// or falls asleep, as a job sliced over frames within a small time budget; a
// car that wakes is collapsed out of its chunk's buffers straight away.

const CHUNK = 64;
const BUILD_BUDGET_MS = 0.9;
const SLICE = 1500; // vertices written between budget checks

const protos = new Map(); // model object -> { parts, shadows }
const chunks = new Map(); // key -> { cars: Set, meshes: [], dirty }
let root = null;

// Vehicle meshes get their own (identical) material instances; the bake
// folds equivalent ones together so a chunk is ~3 draw calls, not 3 per car.
const canon = new Map();
function canonical(m) {
  const key = [m.type, m.color && m.color.getHex(), m.emissive && m.emissive.getHex(), m.roughness, m.metalness,
    m.vertexColors, m.map ? m.map.uuid : '', m.transparent, m.opacity, m.side].join('|');
  let c = canon.get(key);
  if (!c) canon.set(key, c = m);
  return c;
}

const _m = new THREE.Matrix4();
const _car = new THREE.Matrix4();
const _nm = new THREE.Matrix3();

function protoFor(v, buildActor) {
  let p = protos.get(v.model);
  if (p) return p;
  const actor = buildActor(v);
  actor.position.set(0, 0, 0);
  actor.rotation.set(0, 0, 0);
  actor.updateMatrixWorld(true);
  const parts = [], shadows = [];
  const shadowMesh = actor.userData.shadow;
  actor.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    // parked: lamp lenses unlit (index 2 is the vehicles' unshaded lamp material)
    const lamp = Array.isArray(o.material) && o.material[2];
    if (lamp && lamp.isMeshBasicMaterial && lamp.vertexColors) {
      const dim = lamp.clone();
      dim.color.setScalar(UNLIT_LAMP);
      o.material = o.material.slice();
      o.material[2] = dim;
    }
    if (o.parent && o.parent !== actor && !o.parent.visible) return;
    const entry = { geo: o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, matrix: o.matrixWorld.clone(), material: o.material };
    (o === shadowMesh ? shadows : parts).push(entry);
  });
  p = { parts, shadows };
  protos.set(v.model, p);
  return p;
}

// Appends the part's triangles, transformed by `mat`, to the per-material
// buckets (a geometry group maps to material[group.materialIndex]).
// Buckets hold [part, matrix, start, count] runs; meshOf writes them out.
function bake(buckets, part, mat, car) {
  const g = part.geo;
  const mats = Array.isArray(part.material) ? part.material : [part.material];
  const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
  for (const gr of groups) {
    const material = canonical(mats[gr.materialIndex] || mats[0]);
    let b = buckets.get(material);
    if (!b) buckets.set(material, b = { runs: [], n: 0 });
    const count = Math.min(gr.start + gr.count, g.attributes.position.count) - gr.start;
    if (count <= 0) continue;
    b.runs.push([g, mat.clone(), gr.start, count, car]);
    b.n += count;
  }
}

// Flattened, inlined transform of one run into the output arrays.
function writeRun(run, at, pos, nrm, col, uv) {
  const [g, m, start, count] = run;
  const e = m.elements;
  _nm.getNormalMatrix(m);
  const n = _nm.elements;
  const P = g.attributes.position.array, N = g.attributes.normal && g.attributes.normal.array;
  const C = g.attributes.color, U = g.attributes.uv && g.attributes.uv.array;
  // colours are baked as normalized bytes (the vehicle builders' own format)
  const cs = C ? C.itemSize : 0, CA = C && C.array, cm = C && !C.normalized ? 255 : 1;
  for (let k = 0; k < count; k++) {
    const i = start + k, o = at + k;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    pos[o * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
    pos[o * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    pos[o * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    if (N) {
      const a = N[i * 3], b = N[i * 3 + 1], c = N[i * 3 + 2];
      let nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm[o * 3] = nx / l; nrm[o * 3 + 1] = ny / l; nrm[o * 3 + 2] = nz / l;
    } else nrm[o * 3 + 1] = 1;
    if (CA) { col[o * 3] = CA[i * cs] * cm; col[o * 3 + 1] = CA[i * cs + 1] * cm; col[o * 3 + 2] = CA[i * cs + 2] * cm; }
    else { col[o * 3] = 255; col[o * 3 + 1] = 255; col[o * 3 + 2] = 255; }
    if (U) { uv[o * 2] = U[i * 2]; uv[o * 2 + 1] = U[i * 2 + 1]; }
  }
}

function newMesh(buckets, cast) {
  const mats = [...buckets.keys()];
  if (!mats.length) return null;
  let n = 0;
  for (const m of mats) n += buckets.get(m).n;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(n * 3), 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const runs = [];
  let at = 0;
  mats.forEach((m, i) => {
    const b = buckets.get(m);
    g.addGroup(at, b.n, i);
    for (const run of b.runs) { runs.push([run, at]); at += run[3]; }
  });
  const mesh = new THREE.Mesh(g, mats.length === 1 ? mats[0] : mats);
  mesh.castShadow = cast;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.matrixWorldAutoUpdate = false;
  mesh.updateMatrixWorld(true);
  return { mesh, runs };
}

// Generator: fills the chunk's new buffers slice by slice, then swaps them in.
function* bakeJob(chunk, buildActor) {
  const body = new Map(), shade = new Map();
  for (const v of chunk.cars) {
    if (!protos.has(v.model)) yield 'proto';
    const p = protoFor(v, buildActor);
    _car.makeRotationY(-v.angle).setPosition(v.x, 0, v.y);
    for (const part of p.parts) bake(body, part, _m.multiplyMatrices(_car, part.matrix), v);
    for (const part of p.shadows) bake(shade, part, _m.multiplyMatrices(_car, part.matrix), v);
  }
  const built = [newMesh(body, true), newMesh(shade, false)].filter(Boolean);
  const ranges = new Map();
  for (const { mesh, runs } of built) {
    const a = mesh.geometry.attributes;
    for (const [run, at] of runs) {
      for (let k = 0; k < run[3]; k += SLICE) {
        const sub = [run[0], run[1], run[2] + k, Math.min(SLICE, run[3] - k)];
        writeRun(sub, at + k, a.position.array, a.normal.array, a.color.array, a.uv.array);
        yield 'slice';
      }
      const car = run[4];
      if (!ranges.has(car)) ranges.set(car, []);
      ranges.get(car).push([mesh, at, run[3]]);
    }
    mesh.geometry.computeBoundingSphere();
  }
  if (built[1]) built[1].mesh.renderOrder = 1;
  for (const m of chunk.meshes) { root.remove(m); m.geometry.dispose(); }
  chunk.meshes = built.map((b) => b.mesh);
  for (const m of chunk.meshes) root.add(m);
  chunk.ranges = ranges;
  // cars that left while this job ran
  for (const car of [...ranges.keys()]) if (!chunk.cars.has(car)) collapse(chunk, car);
}

// Degenerates a car's triangles in place: gone this frame, no rebake needed.
function collapse(chunk, car) {
  const list = chunk.ranges && chunk.ranges.get(car);
  if (!list) return;
  for (const [mesh, at, count] of list) {
    const attr = mesh.geometry.attributes.position, p = attr.array;
    const x = p[at * 3], y = p[at * 3 + 1], z = p[at * 3 + 2];
    for (let i = at; i < at + count; i++) { p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; }
    attr.needsUpdate = true;
  }
  chunk.ranges.delete(car);
}

const keyOf = (v) => Math.floor(v.x / CHUNK) + ',' + Math.floor(v.y / CHUNK);

export function syncParkedLayer(scene, sleeping, buildActor, player, drawDist) {
  if (!root) { root = new THREE.Group(); root.name = 'parked-cars'; root.matrixAutoUpdate = false; scene.add(root); }
  const seen = new Set();
  for (const v of sleeping) {
    if (Math.abs(v.x - player.x) > drawDist || Math.abs(v.y - player.y) > drawDist) continue;
    const key = v._chunkKey || (v._chunkKey = keyOf(v));
    seen.add(v);
    let c = chunks.get(key);
    if (!c) chunks.set(key, c = { cars: new Set(), meshes: [], ranges: null, job: null, dirty: true });
    if (!c.cars.has(v)) { c.cars.add(v); c.dirty = true; c.job = null; }
  }
  for (const [key, c] of chunks) {
    for (const v of c.cars) {
      if (seen.has(v)) continue;
      c.cars.delete(v);
      v._chunkKey = null;
      collapse(c, v);
    }
    if (!c.cars.size) {
      for (const m of c.meshes) { root.remove(m); m.geometry.dispose(); }
      chunks.delete(key);
    }
  }
  const until = performance.now() + BUILD_BUDGET_MS;
  let protoBuilt = false;
  for (const c of chunks.values()) {
    if (!c.dirty) continue;
    if (!c.job) c.job = bakeJob(c, buildActor);
    while (performance.now() < until) {
      const step = c.job.next();
      if (step.done) { c.job = null; c.dirty = false; break; }
      // a fresh model prototype is a full mesh build: at most one per frame
      if (step.value === 'proto') { if (protoBuilt) break; protoBuilt = true; }
    }
    if (performance.now() >= until) break;
  }
}
