import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Shared materials/palette/geometry helpers for every procedural model, styled
// to match the real Martinitoren GLB (game/models/): architectural low-poly,
// faceted matte PBR, earthy Groningen colours, no outlines. The HABBO_* names
// are kept only so existing model files don't all need renaming.

export const HABBO_PALETTE = {
  woodDark: 0x5a3d26,
  woodMid: 0x8a6440,
  woodLight: 0xb8956a,
  brickRed: 0x8f4634,
  brickOrange: 0xa9623f,
  roofGreen: 0x5b3a2e,
  roofBlue: 0x3e4449,
  wallCream: 0xd6cab0,
  wallPink: 0xc2a293,
  wallMint: 0xa3b2a0,
  wallYellow: 0xcfb46c,
  skyBlue: 0x8a9ea8,
  grassGreen: 0x5f7d45,
  stoneGrey: 0x9a958a,
  glassBlue: 0x51666f,
  metalGrey: 0x7b7e82,
  black: 0x232323,
  white: 0xe6e1d6,
  brickDark: 0x6e3a2c,
  brickBrown: 0x7d4b37,
  brickBuff: 0xb08a5e,
  plasterWhite: 0xe3ddd0,
  roofTerracotta: 0x8a4a33,
  roofSlate: 0x464b52,
  frameWhite: 0xece8de,
  frameGreen: 0x2f4a3a,
  frameRed: 0x6b2a24,
  hardstone: 0x55575a,
  bitumen: 0x4a4a4c,
};
export const HABBO_PALETTE_KEYS = Object.keys(HABBO_PALETTE);

export function randomHabboColor(rng = Math.random) {
  return HABBO_PALETTE[HABBO_PALETTE_KEYS[Math.floor(rng() * HABBO_PALETTE_KEYS.length)]];
}

// --- materials --------------------------------------------------------------

export function habboMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
    ...opts,
  });
}

export function habboFlatMaterial(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

// Vertex-coloured variant: GeoBuilder bakes each part's colour into the
// geometry, so a whole multi-coloured model renders with one material.
export function vcMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
    ...opts,
  });
}

// Geometry/material reused across instances. scene3d's disposeObject should
// skip anything carrying this flag.
export function markShared(resource) {
  resource.userData.shared = true;
  return resource;
}

// --- outlines (retired Habbo look, kept switchable) --------------------------
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
export const OUTLINES_ENABLED = false;
export function buildOutline(geometry, thickness = 0.02) {
  if (!OUTLINES_ENABLED) return new THREE.Object3D();
  const mesh = new THREE.Mesh(geometry, OUTLINE_MAT);
  mesh.scale.setScalar(1 + thickness);
  return mesh;
}

export function habboMesh(geometry, color, opts = {}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, habboMaterial(color, opts));
  group.add(mesh);
  group.add(buildOutline(geometry, opts.outlineThickness ?? 0.02));
  group.userData.mainMesh = mesh;
  return group;
}

// --- GeoBuilder -------------------------------------------------------------
// Accumulates triangles (with baked vertex colour and planar UVs) into a
// handful of material groups and emits one non-indexed BufferGeometry, so a
// model made of dozens of primitives costs one draw call per material.

const _colorCache = new Map();
function linearRGB(hex) {
  let c = _colorCache.get(hex);
  if (!c) {
    const col = new THREE.Color(hex);
    c = [col.r, col.g, col.b];
    _colorCache.set(hex, c);
  }
  return c;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export function composeMatrix(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export class GeoBuilder {
  constructor(groupCount = 1) {
    this.groups = [];
    for (let i = 0; i < groupCount; i++) this.groups.push({ p: [], c: [], uv: [] });
  }

  _push(g, a, b, c, rgb, uvs) {
    const G = this.groups[g];
    G.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    G.c.push(rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2]);
    if (uvs) {
      G.uv.push(uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5]);
      return;
    }
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    if (Math.abs(ny / nl) > 0.75) {
      G.uv.push(a[0], a[2], b[0], b[2], c[0], c[2]);
    } else {
      const hl = Math.hypot(nx, nz) || 1;
      const tx = -nz / hl, tz = nx / hl;
      G.uv.push(a[0] * tx + a[2] * tz, a[1], b[0] * tx + b[2] * tz, b[1], c[0] * tx + c[2] * tz, c[1]);
    }
  }

  tri(a, b, c, color, group = 0, uvs = null) {
    this._push(group, a, b, c, linearRGB(color), uvs);
  }

  // a,b,c,d counter-clockwise seen from the visible side
  quad(a, b, c, d, color, group = 0, uvs = null) {
    const rgb = linearRGB(color);
    this._push(group, a, b, c, rgb, uvs ? [uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5]] : null);
    this._push(group, a, c, d, rgb, uvs ? [uvs[0], uvs[1], uvs[4], uvs[5], uvs[6], uvs[7]] : null);
  }

  // Same, but fixes the winding so the face points along `out`.
  quadOut(a, b, c, d, out, color, group = 0, uvs = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * out[0] + ny * out[1] + nz * out[2] >= 0) this.quad(a, b, c, d, color, group, uvs);
    else this.quad(a, d, c, b, color, group, uvs ? [uvs[0], uvs[1], uvs[6], uvs[7], uvs[4], uvs[5], uvs[2], uvs[3]] : null);
  }

  triOut(a, b, c, out, color, group = 0, uvs = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * out[0] + ny * out[1] + nz * out[2] >= 0) this.tri(a, b, c, color, group, uvs);
    else this.tri(a, c, b, color, group, uvs && [uvs[0], uvs[1], uvs[4], uvs[5], uvs[2], uvs[3]]);
  }

  // Merges any THREE geometry, transformed by `matrix` (Matrix4 or null).
  // `color` may be fn(x, y, z) -> hex, evaluated at each triangle centroid.
  geo(geometry, matrix, color, group = 0) {
    const src = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = src.attributes.position;
    const uv = src.attributes.uv;
    const colorFn = typeof color === 'function' ? color : null;
    let rgb = colorFn ? null : linearRGB(color);
    const flip = matrix ? matrix.determinant() < 0 : false;
    const p = [0, 0, 0].map(() => new THREE.Vector3());
    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) {
        p[k].fromBufferAttribute(pos, i + k);
        if (matrix) p[k].applyMatrix4(matrix);
      }
      const A = [p[0].x, p[0].y, p[0].z], B = [p[1].x, p[1].y, p[1].z], C = [p[2].x, p[2].y, p[2].z];
      if (colorFn) rgb = linearRGB(colorFn((A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3));
      const uvs = uv ? [uv.getX(i), uv.getY(i), uv.getX(i + 1), uv.getY(i + 1), uv.getX(i + 2), uv.getY(i + 2)] : null;
      if (flip) this._push(group, A, C, B, rgb, uvs && [uvs[0], uvs[1], uvs[4], uvs[5], uvs[2], uvs[3]]);
      else this._push(group, A, B, C, rgb, uvs);
    }
    if (src !== geometry) src.dispose();
    geometry.dispose();
    return this;
  }

  // Axis-aligned-in-local-space box: centre, size, optional rotation.
  box(x, y, z, sx, sy, sz, color, group = 0, rx = 0, ry = 0, rz = 0) {
    return this.geo(new THREE.BoxGeometry(sx, sy, sz), composeMatrix(x, y, z, rx, ry, rz), color, group);
  }

  get triangleCount() {
    return this.groups.reduce((n, g) => n + g.p.length / 9, 0);
  }

  build() {
    const total = this.groups.reduce((n, g) => n + g.p.length / 3, 0);
    const pos = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const col = new Uint8Array(total * 3), nor = new Int8Array(total * 3);
    const geometry = new THREE.BufferGeometry();
    let start = 0;
    this.groups.forEach((g, i) => {
      const count = g.p.length / 3;
      if (!count) return;
      pos.set(g.p, start * 3);
      uv.set(g.uv, start * 2);
      for (let k = 0; k < g.c.length; k++) col[start * 3 + k] = Math.round(g.c[k] * 255);
      geometry.addGroup(start, count, i);
      start += count;
    });
    for (let i = 0; i < pos.length; i += 9) {
      const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
      const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx = Math.round((nx / l) * 127); ny = Math.round((ny / l) * 127); nz = Math.round((nz / l) * 127);
      for (let k = 0; k < 9; k += 3) { nor[i + k] = nx; nor[i + k + 1] = ny; nor[i + k + 2] = nz; }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geometry;
  }
}

// GeoBuilder that also bakes skin weights for a THREE.SkinnedMesh. Set
// `builder.bone` before adding parts: a bone index for rigid parts, or
// fn(x, y, z) -> [boneA, boneB, weightA] evaluated per vertex (bind-pose
// model space) for parts that bend smoothly across a joint.
export class SkinBuilder extends GeoBuilder {
  constructor(groupCount = 1) {
    super(groupCount);
    for (const g of this.groups) { g.si = []; g.sw = []; }
    this.bone = 0;
  }

  _push(g, a, b, c, rgb, uvs) {
    super._push(g, a, b, c, rgb, uvs);
    const G = this.groups[g], spec = this.bone;
    for (const v of [a, b, c]) {
      if (typeof spec === 'number') { G.si.push(spec, 0, 0, 0); G.sw.push(1, 0, 0, 0); continue; }
      const [i0, i1, w0] = spec(v[0], v[1], v[2]);
      G.si.push(i0, i1, 0, 0);
      G.sw.push(w0, 1 - w0, 0, 0);
    }
  }

  // Same as geo(), for one call with a temporary bone spec.
  part(geometry, matrix, color, bone, group = 0) {
    const prev = this.bone;
    this.bone = bone;
    this.geo(geometry, matrix, color, group);
    this.bone = prev;
    return this;
  }

  build() {
    const geometry = super.build();
    const n = geometry.attributes.position.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    let start = 0;
    for (const g of this.groups) {
      if (!g.p.length) continue;
      si.set(g.si, start * 4);
      sw.set(g.sw, start * 4);
      start += g.p.length / 3;
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    return geometry;
  }
}

// Elliptic loft through rings {y, d, w, x = 0, sq = 1}: d = half depth (x),
// w = half width (z), sq < 1 squares the section off (shoulders, boxy
// clothing). Open-ended; `sides` facets around.
export function loftGeometry(rings, sides = 8, phase = Math.PI / 8) {
  const pos = [];
  const ring = (r) => {
    const out = [];
    for (let i = 0; i < sides; i++) {
      const t = phase + (i / sides) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t), q = r.sq ?? 1;
      const cx = Math.sign(c) * Math.pow(Math.abs(c), q), sz = Math.sign(s) * Math.pow(Math.abs(s), q);
      out.push([(r.x || 0) + cx * r.d * (c > 0 ? (r.front ?? 1) : 1), r.y, sz * r.w]);
    }
    return out;
  };
  const rs = rings.map(ring);
  for (let k = 0; k < rs.length - 1; k++) {
    const A = rs[k], B = rs[k + 1];
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      pos.push(...A[i], ...B[j], ...A[j], ...A[i], ...B[i], ...B[j]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// Tube (low-sided prism) between two 3D points, for frames/rails/limbs.
export function tubeGeometry(a, b, rA, rB = rA, sides = 5) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 0.001;
  const geo = new THREE.CylinderGeometry(rB, rA, len, sides, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(m);
  return geo;
}

// --- canvas textures --------------------------------------------------------

export function createPixelTexture(grid, opts = {}) {
  const pixelSize = opts.pixelSize ?? 4;
  const rows = grid.length, cols = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * pixelSize;
  canvas.height = rows * pixelSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === null || cell === undefined) continue;
      const hex = typeof cell === 'string' ? HABBO_PALETTE[cell] : cell;
      ctx.fillStyle = '#' + (hex ?? 0).toString(16).padStart(6, '0');
      ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createBrickTexture(brickColorKey = 'brickRed', mortarColorKey = 'stoneGrey') {
  const brick = HABBO_PALETTE[brickColorKey];
  const mortar = HABBO_PALETTE[mortarColorKey];
  const rows = 8, cols = 8;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    const offset = (r % 2) * 2;
    for (let c = 0; c < cols; c++) row.push((c + offset) % 4 === 0 ? mortar : brick);
    grid.push(row);
  }
  return createPixelTexture(grid, { pixelSize: 6 });
}

export function createWindowTexture(glassColorKey = 'glassBlue', frameColorKey = 'white') {
  const glass = HABBO_PALETTE[glassColorKey];
  const frame = HABBO_PALETTE[frameColorKey];
  const grid = [
    [frame, frame, frame, frame, frame, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, frame, frame, frame, frame, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, frame, frame, frame, frame, frame],
  ];
  return createPixelTexture(grid, { pixelSize: 5 });
}

function smoothTexture(canvas, anisotropy = 4) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

// Near-white multiplier map: faint stretcher-bond courses with light mortar,
// meant to modulate a material colour a touch brighter than the target brick.
// One tile = 0.5 m x 0.5 m (8 courses, 2 bricks per course).
let brickCanvas = null;
export function createBrickDetailTexture() {
  if (brickCanvas) return smoothTexture(brickCanvas);
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f0ea';
  ctx.fillRect(0, 0, S, S);
  const courseH = S / 8, brickW = S / 2;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 8; r++) {
    const off = (r % 2) * brickW / 2;
    for (let c = -1; c < 3; c++) {
      const v = 212 + Math.floor(rnd() * 26);
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
      ctx.fillRect(c * brickW + off + 2, r * courseH + 2, brickW - 3, courseH - 3);
    }
  }
  brickCanvas = canvas;
  return smoothTexture(canvas);
}

// Roof pan-tile courses; u runs along the ridge, v down the slope. One tile =
// 1 m x 1 m (3 courses).
let roofCanvas = null;
export function createRoofTileTexture() {
  if (roofCanvas) return smoothTexture(roofCanvas);
  const S = 96;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ebe7e2';
  ctx.fillRect(0, 0, S, S);
  const rows = 3, cols = 5;
  const rh = S / rows, cw = S / cols;
  for (let r = 0; r < rows; r++) {
    const g = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
    g.addColorStop(0, '#f2eeea');
    g.addColorStop(0.8, '#d8d2cc');
    g.addColorStop(1, '#a9a39d');
    ctx.fillStyle = g;
    ctx.fillRect(0, r * rh, S, rh);
    ctx.fillStyle = 'rgba(90,80,70,0.25)';
    for (let c = 0; c < cols; c++) ctx.fillRect(c * cw + (r % 2) * cw / 2, r * rh, 2, rh);
  }
  roofCanvas = canvas;
  return smoothTexture(canvas);
}
