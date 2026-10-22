// The ground of ?terrain (#269): where the AHN relief stands above the flat ground (a dyke, a wierde, a hill, the old city's mound),
// a patch of terrain rises from it. The flat ground (terrain3d.js, y = -0.05) stays under everything; a patch covers only the cells
// whose corners rise above RELIEF_MIN and meets the flat ground where the relief is 0, so the world is exactly as flat as before
// wherever the relief is. One patch per raster (a 1 km tile); it comes with the tile and goes with it.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createTerrainMaterial } from './terrain3d.js';

export const RELIEF_MIN = 0.04;     // m: a cell whose corners are all below this stays flat ground
const LIFT = -0.1;                  // m under the relief: roads and paths laid on it (drawn between their vertices, the ground bulges over them) stay in sight

// The patch of one decoded raster R (terrainraster.js: x0, y0, cell, w, h, z) over the field it belongs to, as plain arrays, or
// null where nothing rises. `wet(x, y)` tells water: no ground there. The heights are the field's (bilinear), so the patches of
// neighbouring tiles meet; the normals come from the same field.
export function reliefPatchArrays(field, R, { wet = null, minRelief = RELIEF_MIN } = {}) {
  const nx = R.w + 1, ny = R.h + 1;
  const h = new Float32Array(nx * ny);
  let any = false;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = field.at(R.x0 + i * R.cell, R.y0 + j * R.cell);
    h[j * nx + i] = v;
    if (v >= minRelief) any = true;
  }
  if (!any) return null;
  const used = new Int32Array(nx * ny).fill(-1);
  const positions = [], normals = [], indices = [];
  const vert = (i, j) => {
    const k = j * nx + i;
    if (used[k] >= 0) return used[k];
    const x = R.x0 + i * R.cell, y = R.y0 + j * R.cell, e = R.cell;
    // the slope over one cell either side: the normal of the smooth ground
    const dx = (field.at(x + e, y) - field.at(x - e, y)) / (2 * e), dz = (field.at(x, y + e) - field.at(x, y - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    used[k] = positions.length / 3;
    positions.push(x, h[k], y);
    normals.push(-dx / l, 1 / l, -dz / l);
    return used[k];
  };
  for (let j = 0; j < R.h; j++) for (let i = 0; i < R.w; i++) {
    const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], d = h[(j + 1) * nx + i + 1];
    if (Math.max(a, b, c, d) < minRelief) continue;
    if (wet && wet(R.x0 + (i + 0.5) * R.cell, R.y0 + (j + 0.5) * R.cell)) continue;
    const va = vert(i, j), vb = vert(i + 1, j), vc = vert(i, j + 1), vd = vert(i + 1, j + 1);
    // (the diagonal follows the steeper pair, so a dyke ridge is not cut)
    if (Math.abs(a - d) <= Math.abs(b - c)) indices.push(va, vc, vd, va, vd, vb);
    else indices.push(va, vc, vb, vb, vc, vd);
  }
  if (!indices.length) return null;
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

// The patches that are drawn: a Group in the scene, patches by raster key. `sync(world)` builds what arrived and drops what left,
// a few per call.
export class ReliefPatches {
  constructor(scene, { perCall = 2 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'reliefpatches';
    this.group.position.y = LIFT - 0.05;     // (the flat ground sits at -0.05)
    scene.add(this.group);
    this.patches = new Map();
    this.perCall = perCall;
    // the ground's shader with a depth bias: roads laid on the relief (their own base, a few cm off the bilinear ground) win
    this.material = createTerrainMaterial();
    this.material.polygonOffset = true;
    this.material.polygonOffsetFactor = 2;
    this.material.polygonOffsetUnits = 4;
  }

  // how many of the eight tiles round a raster are in: the edge of a patch reads the heights of its neighbours, so it is made again
  // when one more comes (a patch beside a tile that is not there yet falls to 0 at that edge)
  neighbours(field, key) {
    const [i, j] = key.split(',').map(Number);
    let n = 0;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) if ((di || dj) && field.rasters.has(`${i + di},${j + dj}`)) n++;
    return n;
  }

  drop(key) {
    const p = this.patches.get(key);
    if (p && p.mesh) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); }
    this.patches.delete(key);
  }

  sync(world) {
    const field = world.map.terrain;
    if (!field) return 0;
    let built = 0;
    for (const [key, R] of field.rasters) {
      if (built >= this.perCall) break;
      const have = this.patches.get(key), nb = this.neighbours(field, key);
      if (have && have.nb >= nb) continue;
      if (have) this.drop(key);
      built++;
      const A = reliefPatchArrays(field, R, { wet: (x, y) => world.map.inWaterRaw(x, y) });
      if (!A) { this.patches.set(key, { mesh: null, nb }); continue; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(A.positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(A.normals, 3));
      geo.setIndex(new THREE.BufferAttribute(A.indices, 1));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.receiveShadow = true;
      mesh.userData.isTerrain = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      this.patches.set(key, { mesh, nb });
    }
    // a tile that left
    for (const key of [...this.patches.keys()]) if (!field.rasters.has(key)) this.drop(key);
    return built;
  }
}
