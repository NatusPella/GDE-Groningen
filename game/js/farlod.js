import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildingLodStyle } from './models3d_buildings.js';
import { perfOff } from './devflags.js';

// Far LOD layer: plain extruded buildings and flat ground (green, paths,
// roads) merged per TILE x TILE metre tile, one draw call per tile and layer.
// Tiles are built incrementally within a per-frame time budget and dropped
// once well outside the view distance. Buildings the detailed streamer shows
// (centre within detailR of the player) are collapsed in the vertex shader;
// ground fragments inside the guaranteed-detailed radius are discarded.

const TILE = 320;
const BUDGET_MS = 2.5;

const shared = {
  uLodPlayer: { value: new THREE.Vector2() },
  uLodDetailR: { value: 140 },
  uLodInnerR: { value: 130 },
  // a streamed tile's flat water is only drawn beyond this radius (see waterStreamMaterial)
  uLodWaterR: { value: 3800 },
  uNightGlow: { value: 0 },
  uLitFrac: { value: 0 },
};

function buildingMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 lodCenter;
uniform vec2 uLodPlayer;
uniform float uLodDetailR;
varying vec3 vFarW;
varying float vFarSeed;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vFarW = (modelMatrix * vec4(transformed, 1.0)).xyz;
vFarSeed = fract(sin(dot(lodCenter, vec2(12.9898, 78.233))) * 43758.5453);
if (distance(lodCenter, uLodPlayer) <= uLodDetailR) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNightGlow, uLitFrac;
varying vec3 vFarW;
varying float vFarSeed;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // flat roofs: panel seams every 24 m and a slightly different tone per panel, so a big hall is no empty grey plane (#260)
  vec3 rn = normalize(cross(dFdx(vFarW), dFdy(vFarW)));
  if (abs(rn.y) > 0.9) {
    vec2 rg = vFarW.xz / 24.0;
    vec2 rfw = max(fwidth(rg), vec2(1e-5));
    vec2 rf = abs(fract(rg - 0.5) - 0.5) / rfw;
    float seam = 1.0 - min(min(rf.x, rf.y), 1.0);
    float fade = 1.0 - smoothstep(0.15, 0.45, max(rfw.x, rfw.y));
    float tone = fract(sin(dot(floor(rg), vec2(12.9898, 78.233))) * 43758.5453);
    diffuseColor.rgb *= (0.93 + 0.14 * tone * fade + 0.07 * (1.0 - fade)) * (1.0 - 0.16 * seam * fade);
  }
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uNightGlow > 0.0) {
  vec3 wn = normalize(cross(dFdx(vFarW), dFdy(vFarW)));
  if (abs(wn.y) < 0.3) {
    vec2 t = normalize(vec2(-wn.z, wn.x));
    vec2 g = vec2(dot(vFarW.xz, t) / 2.6, vFarW.y / 3.1);
    vec2 cell = floor(g), f = fract(g);
    float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.32, f.y) * step(f.y, 0.78);
    float rnd = fract(sin(dot(cell + vFarSeed * 91.0, vec2(41.3, 289.1))) * 15731.743);
    float lit = step(rnd, uLitFrac) * win;
    float blur = smoothstep(0.3, 0.9, max(fwidth(g.x), fwidth(g.y)));
    vec3 warm = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.76, 0.48), fract(rnd * 7.13));
    totalEmissiveRadiance += warm * mix(lit, uLitFrac * 0.2, blur) * uNightGlow * 0.8;
  }
}`);
  };
  return m;
}

function groundMaterial(offset, near = false) {
  const m = new THREE.MeshLambertMaterial({
    vertexColors: true, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 4,
  });
  // near: drawn up to the player too (a streamed tile's green and water have
  // no detailed copy that takes over)
  if (near) return m;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFarXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFarXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uLodPlayer;\nuniform float uLodInnerR;\nvarying vec2 vFarXZ;')
      .replace('void main() {', 'void main() {\nif (distance(vFarXZ, uLodPlayer) < uLodInnerR) discard;');
  };
  return m;
}

// The flat water of a streamed tile (a province tile's row, lying on the ground) is the far picture of water that the
// ground shader and the surface meshes draw themselves: the shader opens the ground over the water within its windows
// (tilewatermask.js: 2 m texels round the player, 8 m texels out to ~4 km) and syncWater (scene3d.js) lays the animated
// surface under it. A flat layer on the ground over that hides the real water: two water layers (#231). So it is
// drawn only beyond what the windows cover (STREAM_WATER_R, a little under half the far mask's 8 km), where nothing else shows water.
export const STREAM_WATER_R = 3800;
export function waterStreamMaterial() {
  const m = groundMaterial(0.3, true);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFarXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFarXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uLodPlayer;\nuniform float uLodWaterR;\nvarying vec2 vFarXZ;')
      .replace('void main() {', 'void main() {\nif (distance(vFarXZ, uLodPlayer) < uLodWaterR) discard;');
  };
  return m;
}

// Offsets stay below the detailed ground decals (green starts at 1).
const MATS = {
  building: buildingMaterial(),
  green: groundMaterial(0.2),
  path: groundMaterial(0.45),
  road: groundMaterial(0.7),
  greenNear: groundMaterial(0.2, true),
  water: groundMaterial(0.3, true),
  waterStream: waterStreamMaterial(),
};
const WATER_FLAT = [44, 74, 78];

const _c = new THREE.Color();
function rgb8(hex) {
  _c.setHex(hex);
  return [Math.round(_c.r * 255), Math.round(_c.g * 255), Math.round(_c.b * 255)];
}

class Buf {
  constructor(Type, cap = 1024) { this.a = new Type(cap); this.n = 0; }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let cap = this.a.length * 2;
    while (cap < this.n + k) cap *= 2;
    const b = new this.a.constructor(cap);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  view() { return this.a.slice(0, this.n); }
}

class MeshBuilder {
  constructor(withCenter) {
    this.pos = new Buf(Float32Array, 4096);
    this.col = new Buf(Uint8Array, 4096);
    this.idx = new Buf(Uint32Array, 4096);
    this.ctr = withCenter ? new Buf(Float32Array, 4096) : null;
  }
  get vertCount() { return this.pos.n / 3; }
  vert(x, y, z, c, cx, cy) {
    this.pos.reserve(3); this.col.reserve(3);
    const p = this.pos, k = this.col;
    p.a[p.n++] = x; p.a[p.n++] = y; p.a[p.n++] = z;
    k.a[k.n++] = c[0]; k.a[k.n++] = c[1]; k.a[k.n++] = c[2];
    if (this.ctr) { this.ctr.reserve(2); this.ctr.a[this.ctr.n++] = cx; this.ctr.a[this.ctr.n++] = cy; }
  }
  tri(a, b, c) {
    this.idx.reserve(3);
    const i = this.idx;
    i.a[i.n++] = a; i.a[i.n++] = b; i.a[i.n++] = c;
  }
  build(normalUp) {
    if (!this.idx.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.view(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.view(), 3, true));
    if (this.ctr) g.setAttribute('lodCenter', new THREE.BufferAttribute(this.ctr.view(), 2));
    if (normalUp) {
      const n = new Int8Array(this.vertCount * 3);
      for (let i = 1; i < n.length; i += 3) n[i] = 127;
      g.setAttribute('normal', new THREE.BufferAttribute(n, 3, true));
    }
    g.setIndex(new THREE.BufferAttribute(this.idx.view(), 1));
    g.computeBoundingSphere();
    return g;
  }
}

function addBuilding(B, b) {
  const s = buildingLodStyle(b);
  const ring = s.ring;
  const n = ring.length;
  if (n < 3) return;
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], c = ring[(i + 1) % n];
    area2 += a[0] * c[1] - c[0] * a[1];
  }
  const pts = area2 > 0 ? ring.slice().reverse() : ring;
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  const wall = rgb8(s.wallHex), roof = rgb8(s.roofHex), y0 = s.base || 0, h = y0 + s.depth;
  const base = B.vertCount;
  for (const [x, y] of pts) B.vert(x, y0, y, wall, cx, cy);
  for (const [x, y] of pts) B.vert(x, h, y, wall, cx, cy);
  for (const [x, y] of pts) B.vert(x, h, y, roof, cx, cy);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    B.tri(base + i, base + j, base + n + i);
    B.tri(base + j, base + n + j, base + n + i);
  }
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const r0 = base + 2 * n;
  for (const [a, b2, c] of tris) {
    const ux = pts[b2][0] - pts[a][0], uz = pts[b2][1] - pts[a][1];
    const vx = pts[c][0] - pts[a][0], vz = pts[c][1] - pts[a][1];
    if (ux * vz - uz * vx < 0) B.tri(r0 + a, r0 + b2, r0 + c);
    else B.tri(r0 + a, r0 + c, r0 + b2);
  }
}

// za/zb: height of a raised ring road (the far view keeps its viaducts up;
// sunken sections stay at street level, where the ground covers them anyway)
function addSegment(B, ax, ay, bx, by, half, c, za = 0, zb = 0) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * half, ny = dx / len * half;
  const i = B.vertCount;
  const ya = Math.max(0, za), yb = Math.max(0, zb);
  B.vert(ax + nx, ya, ay + ny, c);
  B.vert(ax - nx, ya, ay - ny, c);
  B.vert(bx + nx, yb, by + ny, c);
  B.vert(bx - nx, yb, by - ny, c);
  B.tri(i, i + 2, i + 1);
  B.tri(i + 1, i + 2, i + 3);
}

function addPolyGeometry(B, geo, c) {
  const p = geo.attributes.position.array;
  const base = B.vertCount;
  for (let i = 0; i < p.length; i += 3) B.vert(p[i], 0, p[i + 2], c);
  const index = geo.index;
  if (index) {
    const ix = index.array;
    for (let i = 0; i < ix.length; i += 3) B.tri(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
  } else {
    for (let i = 0; i < p.length / 3; i += 3) B.tri(base + i, base + i + 1, base + i + 2);
  }
}

export function createFarLOD(scene, map, opts) {
  const { flatGeometry, colors, sidewalkExtra, roadColorOf } = opts;
  const roadColor = Object.fromEntries(Object.entries(colors.roads).map(([k, hex]) => {
    const a = new THREE.Color(hex), s = new THREE.Color(colors.sidewalk);
    const mixed = (k === 'major' || k === 'normal' || k === 'minor') ? a.lerp(s, 0.3) : a;
    return [k, rgb8(mixed.getHex())];
  }));
  const greenColor = rgb8(colors.green);
  const tintCache = new Map();

  const tiles = new Map();
  let tilesVersion = 0, lastPass = null, passFrame = 0; // idle-pass bookkeeping of update()
  const tileOf = (x, y) => {
    const i = Math.floor(x / TILE), j = Math.floor(y / TILE);
    const key = i + ',' + j;
    let t = tiles.get(key);
    if (!t) {
      t = { key, x0: i * TILE, y0: j * TILE, x1: (i + 1) * TILE, y1: (j + 1) * TILE, buildings: [], segs: [], green: [], meshes: null, job: null };
      tiles.set(key, t);
      tilesVersion++;
    }
    return t;
  };
  for (const b of map.buildings) {
    if (b.landmark || !b.bounds) continue;
    tileOf((b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2).buildings.push(b);
  }
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], c = r.pts[i + 1];
      tileOf((a[0] + c[0]) / 2, (a[1] + c[1]) / 2).segs.push(r, i);
    }
  }
  for (const g of map.green) {
    if (!g.bounds || g.pts.length < 3) continue;
    tileOf((g.bounds[0] + g.bounds[2]) / 2, (g.bounds[1] + g.bounds[3]) / 2).green.push(g);
  }
  if (colors.greenRank) for (const t of tiles.values()) t.green.sort((x, y) => colors.greenRank(x) - colors.greenRank(y));
  const greenOf = colors.greenOf ? (g) => rgb8(colors.greenOf(g)) : () => greenColor;

  const queue = [];
  const root = new THREE.Group();
  root.name = 'farlod';
  scene.add(root);
  let enabled = true;
  const stats = { tiles: 0, visible: 0, triangles: 0, queued: 0, lastBuildMs: 0 };

  function startJob(t) {
    t.job = {
      phase: 0, i: 0,
      bld: new MeshBuilder(true), green: new MeshBuilder(false), path: new MeshBuilder(false), road: new MeshBuilder(false), water: new MeshBuilder(false),
    };
    queue.push(t);
  }

  // Returns true once the tile is complete.
  function stepJob(t, deadline) {
    const J = t.job;
    let k = 0;
    while (true) {
      if ((++k & 7) === 0 && performance.now() > deadline) return false;
      if (J.phase === 0) {
        if (J.i >= t.buildings.length) { J.phase = 1; J.i = 0; continue; }
        addBuilding(J.bld, t.buildings[J.i++]);
      } else if (J.phase === 1) {
        if (J.i >= t.segs.length) { J.phase = 2; J.i = 0; continue; }
        for (let n = 0; n < 16 && J.i < t.segs.length; n++, J.i += 2) {
          const r = t.segs[J.i], s = t.segs[J.i + 1];
          const a = r.pts[s], c = r.pts[s + 1];
          const car = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor';
          const half = r.width / 2 + (car ? sidewalkExtra * 0.6 : 0);
          const tint = roadColorOf && roadColorOf(r);
          let col = roadColor[r.cat] || roadColor.normal;
          if (tint) {
            const key = tint + (car ? 'c' : 'p');
            col = tintCache.get(key);
            if (!col) tintCache.set(key, col = rgb8(new THREE.Color(tint).lerp(new THREE.Color(colors.sidewalk), car ? 0.3 : 0).getHex()));
          }
          addSegment(car ? J.road : J.path, a[0], a[1], c[0], c[1], half, col, r.z ? r.z[s] : 0, r.z ? r.z[s + 1] : 0);
        }
      } else if (J.phase === 2) {
        if (J.i >= t.green.length) { J.phase = 3; J.i = 0; continue; }
        const g = t.green[J.i++];
        addPolyGeometry(J.green, flatGeometry(g), greenOf(g));
      } else if (J.phase === 3) {
        if (!t.water || J.i >= t.water.length) { J.phase = 4; continue; }
        addPolyGeometry(J.water, flatGeometry(t.water[J.i++]), WATER_FLAT);
      } else {
        finishJob(t);
        return true;
      }
    }
  }

  function finishJob(t) {
    const J = t.job;
    t.job = null;
    t.meshes = [];
    for (const [name, B] of [['building', J.bld], ['green', J.green], ['path', J.path], ['road', J.road], ['water', J.water]]) {
      const geo = B.build(name !== 'building');
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, MATS[t.stream && name === 'green' ? 'greenNear' : t.stream && name === 'water' ? 'waterStream' : name]);
      mesh.matrixAutoUpdate = false;
      mesh.userData.tris = geo.index.count / 3;
      root.add(mesh);
      t.meshes.push(mesh);
    }
  }

  function disposeTile(t) {
    if (t.meshes) for (const m of t.meshes) { root.remove(m); m.geometry.dispose(); }
    t.meshes = null;
    t.job = null;
  }

  function rectDist(t, px, py) {
    const dx = Math.max(t.x0 - px, 0, px - t.x1), dy = Math.max(t.y0 - py, 0, py - t.y1);
    return Math.hypot(dx, dy);
  }

  // A pass that left nothing queued is repeated after the focus moved a metre, a setting changed, a tile came or
  // went, or FAR_IDLE_FRAMES frames: the pass walks every tile of the world with a hypot each and sorts the queue.
  const FAR_IDLE_FRAMES = 30;
  function update(px, py, viewDist, visibleDist, detailR) {
    shared.uLodPlayer.value.set(px, py);
    shared.uLodDetailR.value = detailR;
    shared.uLodInnerR.value = detailR - 8;
    const on = viewDist > detailR + 20;
    if (on !== enabled) { enabled = on; root.visible = on; }
    passFrame++;
    if (lastPass && !queue.length && !perfOff('verresync') && passFrame - lastPass.frame < FAR_IDLE_FRAMES && Math.abs(px - lastPass.x) < 1 && Math.abs(py - lastPass.y) < 1
      && lastPass.view === viewDist && lastPass.visible === visibleDist && lastPass.detail === detailR && lastPass.version === tilesVersion) return;
    lastPass = null;
    stats.tiles = stats.visible = stats.triangles = 0;
    if (!on) {
      for (const t of tiles.values()) if (t.meshes || t.job) disposeTile(t);
      queue.length = 0;
      stats.queued = 0;
      return;
    }
    for (const t of tiles.values()) {
      const d = rectDist(t, px, py);
      t.dist = d;
      if (d < viewDist) {
        if (!t.meshes && !t.job) startJob(t);
      } else if (d > viewDist + TILE * 0.5 && (t.meshes || t.job)) {
        disposeTile(t);
      }
      if (t.meshes) {
        const vis = d < visibleDist;
        stats.tiles++;
        for (const m of t.meshes) {
          m.visible = vis;
          if (vis) stats.triangles += m.userData.tris;
        }
        if (vis) stats.visible++;
      }
    }
    for (let i = queue.length - 1; i >= 0; i--) if (!queue[i].job) queue.splice(i, 1);
    queue.sort((a, b) => a.dist - b.dist);
    const hadQueue = queue.length > 0;
    const t0 = performance.now();
    const deadline = t0 + BUDGET_MS;
    while (queue.length && performance.now() < deadline) {
      if (stepJob(queue[0], deadline)) queue.shift();
    }
    stats.queued = queue.length;
    stats.lastBuildMs = performance.now() - t0;
    // a pass that built something shows the new meshes with the next one
    if (!hadQueue) lastPass = { frame: passFrame, x: px, y: py, view: viewDist, visible: visibleDist, detail: detailR, version: tilesVersion };
  }

  // A streamed tile (tileworld.js onTiles: the province's and the
  // proefstrook's tiles) as one more far-LOD tile, built and dropped like
  // the rest; its objects are the rows the tile world's grids hold.
  function addStreamTile(key, x0, y0, size, { buildings = [], roads = [], green = [], water = [] }) {
    const k = 's:' + key;
    if (tiles.has(k)) disposeTile(tiles.get(k));
    const t = { key: k, x0, y0, x1: x0 + size, y1: y0 + size, buildings: [], segs: [], green: [], water: water.filter((w) => w.flat && w.pts.length >= 4), meshes: null, job: null, stream: true };
    for (const b of buildings) if (!b.landmark && b.bounds) t.buildings.push(b);
    for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) t.segs.push(r, i);
    for (const g of green) if (g.bounds && g.pts.length >= 3) t.green.push(g);
    if (colors.greenRank) t.green.sort((x, y) => colors.greenRank(x) - colors.greenRank(y));
    tiles.set(k, t);
    tilesVersion++;
  }
  function dropStreamTile(key) {
    const t = tiles.get('s:' + key);
    if (!t) return;
    disposeTile(t);
    tiles.delete(t.key);
    tilesVersion++;
  }

  function setNight(glow, litFrac) {
    shared.uNightGlow.value = glow;
    shared.uLitFrac.value = litFrac;
  }

  return { update, setNight, stats, root, addStreamTile, dropStreamTile };
}
