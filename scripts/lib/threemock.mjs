// Een minimale THREE-mock voor tests in node zonder gevendorde three (epic Bezit #1095, #1102): scripts/lib/threemock_loader.mjs mapt de CDN-importen van three naar dit bestand.
// Wat er echt is: de scenegraaf (Object3D, Group, Mesh, parent/children, add/remove/traverse/clone), vectoren, Euler, Color, een Float32-positieattribuut per standaardgeometrie
// (gevuld uit de afmetingen: een niet-eindige afmeting geeft NaN in de positie, zodat een test het ziet), dispose-tellers voor geometrie, materiaal en textuur (`stats`), en InstancedMesh.
// Wat NIET echt is: renderen, matrixwiskunde (matrix, quaternion en wereldpositie zijn bijna leeg; alleen de som van de lokale posities), schaduwen, shaders, raycasting, tekenen op canvas.
// Namen die het spel gebruikt maar die hier alleen een lege klasse zijn staan onderaan (STUBS): ze bestaan zodat modules laden, ze doen niets.
export const stats = { geomLive: new Set(), matLive: new Set(), texLive: new Set(), geomDisposed: 0, matDisposed: 0, texDisposed: 0, meshes: 0 };
export const resetStats = () => { stats.geomLive.clear(); stats.matLive.clear(); stats.texLive.clear(); stats.geomDisposed = stats.matDisposed = stats.texDisposed = stats.meshes = 0; };

export const DoubleSide = 2, FrontSide = 0, BackSide = 1, SRGBColorSpace = 'srgb', NoColorSpace = '', RepeatWrapping = 1000, ClampToEdgeWrapping = 1001, NearestFilter = 1003, LinearFilter = 1006;
export const AdditiveBlending = 2, NormalBlending = 1, DynamicDrawUsage = 35048, RedFormat = 1028, RGBAFormat = 1023, UnsignedByteType = 1009, HalfFloatType = 1016, FloatType = 1015;
export const PCFShadowMap = 1, ACESFilmicToneMapping = 4, KeepStencilOp = 7680, ReplaceStencilOp = 7681, EqualStencilFunc = 514, AlwaysStencilFunc = 519, AlwaysDepth = 1, RGBADepthPacking = 3201;

export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  length() { return Math.hypot(this.x, this.y); }
}
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; this.isVector3 = true; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  multiply(v) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  fromBufferAttribute(a, i) { this.x = a.array[i * a.itemSize]; this.y = a.array[i * a.itemSize + 1]; this.z = a.array[i * a.itemSize + 2]; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
  crossVectors(a, b) { return this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
  cross(v) { return this.crossVectors(this, v); }
  negate() { return this.multiplyScalar(-1); }
  applyEuler(e) { return this.applyQuaternion(new Quaternion().setFromEuler(e)); }
  applyMatrix4(m) { const e = m.elements, x = this.x, y = this.y, z = this.z, w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]); this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w; this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w; this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w; return this; }
  applyQuaternion(q) {
    const x = this.x, y = this.y, z = this.z, ix = q.w * x + q.y * z - q.z * y, iy = q.w * y + q.z * x - q.x * z, iz = q.w * z + q.x * y - q.y * x, iw = -q.x * x - q.y * y - q.z * z;
    this.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y; this.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z; this.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x; return this;
  }
  toArray() { return [this.x, this.y, this.z]; }
}
export class Vector4 { constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; } set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; } copy(v) { return this.set(v.x, v.y, v.z, v.w); } }
export class Euler {
  // x, y en z melden een wijziging door (zoals three: models3d_people.js koppelt gewrichten met _onChange)
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') { this._x = x; this._y = y; this._z = z; this.order = order; this._cb = () => {}; }
  get x() { return this._x; } set x(v) { this._x = v; this._cb(); }
  get y() { return this._y; } set y(v) { this._y = v; this._cb(); }
  get z() { return this._z; } set z(v) { this._z = v; this._cb(); }
  _onChange(cb) { this._cb = cb; return this; }
  set(x, y, z, order) { this._x = x; this._y = y; this._z = z; if (order) this.order = order; this._cb(); return this; }
  copy(e) { this._x = e._x; this._y = e._y; this._z = e._z; this.order = e.order; this._cb(); return this; }
  clone() { return new Euler(this._x, this._y, this._z, this.order); }
}
export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  copy(q) { return this.set(q.x, q.y, q.z, q.w); }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
  setFromEuler(e) {
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);   // order XYZ (de standaard van three)
    this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3; return this;
  }
  setFromAxisAngle(a, ang) { const h = ang / 2, s = Math.sin(h); this.x = a.x * s; this.y = a.y * s; this.z = a.z * s; this.w = Math.cos(h); return this; }
  multiply(b) { const { x: ax, y: ay, z: az, w: aw } = this; this.x = ax * b.w + aw * b.x + ay * b.z - az * b.y; this.y = ay * b.w + aw * b.y + az * b.x - ax * b.z; this.z = az * b.w + aw * b.z + ax * b.y - ay * b.x; this.w = aw * b.w - ax * b.x - ay * b.y - az * b.z; return this; }
  setFromUnitVectors(a, b) { let r = a.dot(b) + 1; const v = new Vector3(); if (r < 1e-6) { r = 0; if (Math.abs(a.x) > Math.abs(a.z)) v.set(-a.y, a.x, 0); else v.set(0, -a.z, a.y); } else v.crossVectors(a, b); this.x = v.x; this.y = v.y; this.z = v.z; this.w = r; const l = Math.hypot(this.x, this.y, this.z, this.w) || 1; this.x /= l; this.y /= l; this.z /= l; this.w /= l; return this; }
  normalize() { return this; }
  slerp() { return this; }
}
export class Matrix4 {
  constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  identity() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  set(...v) { const e = this.elements; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) e[c * 4 + r] = v[r * 4 + c]; return this; }
  copy(m) { this.elements = m.elements.slice(); return this; }
  clone() { return new Matrix4().copy(this); }
  compose(p, q, s) {
    const { x, y, z, w } = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, e = this.elements;
    e[0] = (1 - (yy + zz)) * s.x; e[1] = (xy + wz) * s.x; e[2] = (xz - wy) * s.x; e[3] = 0; e[4] = (xy - wz) * s.y; e[5] = (1 - (xx + zz)) * s.y; e[6] = (yz + wx) * s.y; e[7] = 0;
    e[8] = (xz + wy) * s.z; e[9] = (yz - wx) * s.z; e[10] = (1 - (xx + yy)) * s.z; e[11] = 0; e[12] = p.x; e[13] = p.y; e[14] = p.z; e[15] = 1; return this;
  }
  makeTranslation(x, y, z) { this.identity(); this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
  makeScale(x, y, z) { this.identity(); this.elements[0] = x; this.elements[5] = y; this.elements[10] = z; return this; }
  makeRotationX(a) { const c = Math.cos(a), s = Math.sin(a); return this.set(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1); }
  makeRotationY(a) { const c = Math.cos(a), s = Math.sin(a); return this.set(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1); }
  makeRotationZ(a) { const c = Math.cos(a), s = Math.sin(a); return this.set(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); }
  makeRotationFromEuler(e) { return this.compose(new Vector3(), new Quaternion().setFromEuler(e), new Vector3(1, 1, 1)); }
  makeRotationFromQuaternion(q) { return this.compose(new Vector3(), q, new Vector3(1, 1, 1)); }
  multiplyMatrices(a, b) {
    const ae = a.elements, be = b.elements, te = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) te[c * 4 + r] = ae[r] * be[c * 4] + ae[4 + r] * be[c * 4 + 1] + ae[8 + r] * be[c * 4 + 2] + ae[12 + r] * be[c * 4 + 3];
    this.elements = te; return this;
  }
  multiply(m) { return this.multiplyMatrices(this, m); }
  premultiply(m) { return this.multiplyMatrices(m, this); }
  setPosition(x, y, z) { if (x.isVector3) { y = x.y; z = x.z; x = x.x; } this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
  determinant() { return this._det(); }
  _det() {
    const m = this.elements, n11 = m[0], n21 = m[1], n31 = m[2], n41 = m[3], n12 = m[4], n22 = m[5], n32 = m[6], n42 = m[7], n13 = m[8], n23 = m[9], n33 = m[10], n43 = m[11], n14 = m[12], n24 = m[13], n34 = m[14], n44 = m[15];
    return n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31)
      + n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
  }
  invert() { return this; }
}
export class Matrix3 { constructor() { this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1]; } }
export class Color {
  constructor(c = 0xffffff, g, b) { this.isColor = true; this.r = 1; this.g = 1; this.b = 1; this.set(c, g, b); }
  set(c, g, b) {
    if (c && c.isColor) return this.copy(c);
    if (g !== undefined) { this.r = c; this.g = g; this.b = b; return this; }
    if (typeof c === 'number') { this.r = ((c >> 16) & 255) / 255; this.g = ((c >> 8) & 255) / 255; this.b = (c & 255) / 255; }
    return this;
  }
  setHex(h) { return this.set(h); } setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color().copy(this); }
  getHex() { return (Math.round(this.r * 255) << 16) | (Math.round(this.g * 255) << 8) | Math.round(this.b * 255); }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  offsetHSL() { return this; } setHSL() { return this; } getHSL(o) { return o || { h: 0, s: 0, l: 0 }; }
}
export class Sphere { constructor(center = new Vector3(), radius = -1) { this.center = center; this.radius = radius; } set(c, r) { this.center.copy(c); this.radius = r; return this; } clone() { return new Sphere(this.center.clone(), this.radius); } }
export class Box3 { constructor() { this.min = new Vector3(Infinity, Infinity, Infinity); this.max = new Vector3(-Infinity, -Infinity, -Infinity); } setFromObject() { return this; } getSize(v) { return v.set(0, 0, 0); } getCenter(v) { return v.set(0, 0, 0); } isEmpty() { return true; } }

export class BufferAttribute {
  constructor(array, itemSize, normalized = false) { this.array = array; this.itemSize = itemSize; this.normalized = normalized; this.count = Math.floor(array.length / itemSize); this.needsUpdate = false; this.usage = 35044; }
  setUsage(u) { this.usage = u; return this; }
  setXYZ(i, x, y, z) { this.array[i * 3] = x; this.array[i * 3 + 1] = y; this.array[i * 3 + 2] = z; return this; }
  getX(i) { return this.array[i * this.itemSize]; } setXY(i, x, y) { this.array[i * 2] = x; this.array[i * 2 + 1] = y; return this; } getW(i) { return this.array[i * this.itemSize + 3]; } getY(i) { return this.array[i * this.itemSize + 1]; } getZ(i) { return this.array[i * this.itemSize + 2]; }
}
export class Float32BufferAttribute extends BufferAttribute { constructor(a, n) { super(a instanceof Float32Array ? a : new Float32Array(a), n); } }
export class Uint16BufferAttribute extends BufferAttribute { constructor(a, n) { super(a instanceof Uint16Array ? a : new Uint16Array(a), n); } }
export class Uint32BufferAttribute extends BufferAttribute { constructor(a, n) { super(a instanceof Uint32Array ? a : new Uint32Array(a), n); } }
export class InstancedBufferAttribute extends BufferAttribute {}

export class BufferGeometry {
  constructor() { this.isBufferGeometry = true; this.attributes = {}; this.index = null; this.userData = {}; this.boundingSphere = null; this.boundingBox = null; this.drawRange = { start: 0, count: Infinity }; this.groups = []; this.disposed = false; stats.geomLive.add(this); }
  setAttribute(n, a) { this.attributes[n] = a; return this; }
  getAttribute(n) { return this.attributes[n]; }
  hasAttribute(n) { return !!this.attributes[n]; }
  deleteAttribute(n) { delete this.attributes[n]; return this; }
  setIndex(i) { this.index = Array.isArray(i) ? new Uint32BufferAttribute(i, 1) : i; return this; }
  setDrawRange(s, c) { this.drawRange = { start: s, count: c }; return this; }
  computeVertexNormals() { return this; } computeBoundingSphere() { this.boundingSphere = new Sphere(new Vector3(), 1); return this; } computeBoundingBox() { this.boundingBox = new Box3(); return this; }
  applyMatrix4(m) { const p = this.attributes.position; if (p) { const v = new Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); p.setXYZ(i, v.x, v.y, v.z); } } return this; }
  translate(x, y, z) { return this.applyMatrix4(new Matrix4().makeTranslation(x, y, z)); }
  scale(x, y, z) { return this.applyMatrix4(new Matrix4().makeScale(x, y, z)); }
  rotateX(a) { return this.applyMatrix4(new Matrix4().makeRotationX(a)); } rotateY(a) { return this.applyMatrix4(new Matrix4().makeRotationY(a)); } rotateZ(a) { return this.applyMatrix4(new Matrix4().makeRotationZ(a)); }
  center() { return this; }
  toNonIndexed() {
    if (!this.index) return this;
    const g = new BufferGeometry(), idx = this.index.array;
    for (const [name, a] of Object.entries(this.attributes)) { const out = new Float32Array(idx.length * a.itemSize); for (let i = 0; i < idx.length; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.array[idx[i] * a.itemSize + k]; g.setAttribute(name, new BufferAttribute(out, a.itemSize)); }
    g.userData = { ...this.userData }; return g;
  } addGroup(s, c, m) { this.groups.push({ start: s, count: c, materialIndex: m }); }
  clone() { const g = new this.constructor(); Object.assign(g.attributes, this.attributes); g.index = this.index; return g; }
  dispose() { if (!this.disposed) { this.disposed = true; stats.geomDisposed++; } stats.geomLive.delete(this); }
}
// een standaardgeometrie: de afmetingen worden bewaard en het positieattribuut krijgt NaN zodra een afmeting niet eindig is
const primitive = (name, verts, keys) => class extends BufferGeometry {
  constructor(...p) {
    super();
    this.type = name; this.parameters = {}; keys.forEach((k, i) => { this.parameters[k] = p[i]; });
    const bad = p.slice(0, keys.length).some((v) => typeof v === 'number' && !Number.isFinite(v));
    const arr = new Float32Array(verts * 3);
    arr.fill(bad ? NaN : 0);
    this.setAttribute('position', new BufferAttribute(arr, 3));
    this.setAttribute('normal', new BufferAttribute(new Float32Array(verts * 3), 3));
    this.setAttribute('uv', new BufferAttribute(new Float32Array(verts * 2), 2));
    this.setIndex(new Uint16BufferAttribute(Array.from({ length: Math.floor(verts / 3) * 3 }, (_, i) => i), 1));
  }
};
export const BoxGeometry = primitive('BoxGeometry', 24, ['width', 'height', 'depth']);
export const PlaneGeometry = primitive('PlaneGeometry', 4, ['width', 'height']);
export const CylinderGeometry = primitive('CylinderGeometry', 24, ['radiusTop', 'radiusBottom', 'height', 'radialSegments']);
export const ConeGeometry = primitive('ConeGeometry', 20, ['radius', 'height', 'radialSegments']);
export const SphereGeometry = primitive('SphereGeometry', 40, ['radius', 'widthSegments', 'heightSegments']);
export const OctahedronGeometry = primitive('OctahedronGeometry', 24, ['radius', 'detail']);
export const IcosahedronGeometry = primitive('IcosahedronGeometry', 60, ['radius', 'detail']);
export const DodecahedronGeometry = primitive('DodecahedronGeometry', 36, ['radius', 'detail']);
export const TorusGeometry = primitive('TorusGeometry', 48, ['radius', 'tube', 'radialSegments', 'tubularSegments']);
export const CircleGeometry = primitive('CircleGeometry', 16, ['radius', 'segments']);
export const RingGeometry = primitive('RingGeometry', 32, ['innerRadius', 'outerRadius', 'thetaSegments']);
export const CapsuleGeometry = primitive('CapsuleGeometry', 48, ['radius', 'length']);
export const LatheGeometry = primitive('LatheGeometry', 24, []);
export const ShapeGeometry = primitive('ShapeGeometry', 12, []);
// een echte (kale) extrusie: voor- en achtervlak als waaier, de zijkanten als vlakken; zonder afschuining of gaten (de mock rekent geen bevel)
export class ExtrudeGeometry extends BufferGeometry {
  constructor(shape, opts = {}) {
    super();
    const pts = (shape && shape.points && shape.points.length >= 3 ? shape.points : [[0, 0], [1, 0], [1, 1]]), d = Number.isFinite(opts.depth) ? opts.depth : 1, pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (let i = 1; i < pts.length - 1; i++) { tri([...pts[0], 0], [...pts[i], 0], [...pts[i + 1], 0]); tri([...pts[0], d], [...pts[i + 1], d], [...pts[i], d]); }
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; tri([...a, 0], [...b, 0], [...b, d]); tri([...a, 0], [...b, d], [...a, d]); }
    this.type = 'ExtrudeGeometry'; this.parameters = { shape, options: opts };
    this.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    this.setAttribute('normal', new BufferAttribute(new Float32Array(pos.length), 3));
    this.setAttribute('uv', new BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  }
}

export class Texture {
  constructor(image) { this.isTexture = true; this.image = image; this.colorSpace = ''; this.needsUpdate = false; this.wrapS = this.wrapT = 1001; this.userData = {}; this.repeat = new Vector2(1, 1); this.offset = new Vector2(); stats.texLive.add(this); }
  dispose() { stats.texDisposed++; stats.texLive.delete(this); }
  clone() { return new this.constructor(this.image); }
}
export class CanvasTexture extends Texture {}
export class DataTexture extends Texture { constructor(data, w, h) { super({ data, width: w, height: h }); } }
export class Material {
  constructor(p = {}) { this.isMaterial = true; this.userData = {}; this.defines = {}; this.uniforms = {}; this.envMapIntensity = 1; this.color = new Color(p.color !== undefined ? p.color : 0xffffff); this.map = p.map || null; this.side = p.side || 0; this.transparent = !!p.transparent; this.opacity = p.opacity === undefined ? 1 : p.opacity; this.visible = true; this.depthWrite = true; this.depthTest = true; this.needsUpdate = false; Object.assign(this, p, { color: this.color }); stats.matLive.add(this); }
  dispose() { stats.matDisposed++; stats.matLive.delete(this); }
  clone() { const m = new this.constructor(); m.color.copy(this.color); m.map = this.map; m.side = this.side; m.transparent = this.transparent; m.opacity = this.opacity; return m; }
  onBeforeCompile() {}
}
export class MeshBasicMaterial extends Material {}
export class MeshLambertMaterial extends Material {}
export class MeshStandardMaterial extends Material {}
export class MeshDepthMaterial extends Material {}
export class LineBasicMaterial extends Material {}
export class PointsMaterial extends Material {}
export class SpriteMaterial extends Material {}
export class ShaderMaterial extends Material { constructor(p = {}) { super(p); this.defines = { ...(p.defines || {}) }; this.uniforms = p.uniforms || {}; } }

export class Object3D {
  constructor() {
    this.isObject3D = true; this.name = ''; this.parent = null; this.children = []; this.visible = true; this.userData = {};
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion();
    this.matrix = new Matrix4(); this.matrixWorld = new Matrix4(); this.matrixAutoUpdate = true; this.castShadow = false; this.receiveShadow = false; this.frustumCulled = true; this.renderOrder = 0; this.layers = { set() {}, enable() {}, mask: 1 };
  }
  add(...os) { for (const o of os) { if (!o || o === this) continue; if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); } return this; }
  remove(...os) { for (const o of os) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } } return this; }
  removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
  clear() { for (const c of this.children) c.parent = null; this.children.length = 0; return this; }
  traverse(f) { f(this); for (const c of this.children.slice()) c.traverse(f); }
  traverseVisible(f) { if (!this.visible) return; f(this); for (const c of this.children.slice()) c.traverseVisible(f); }
  getObjectByName(n) { let r = null; this.traverse((o) => { if (!r && o.name === n) r = o; }); return r; }
  updateMatrix() {} updateMatrixWorld() {} updateWorldMatrix() {} lookAt() {} rotateX(a) { this.rotation.x += a; return this; } rotateY(a) { this.rotation.y += a; return this; } rotateZ(a) { this.rotation.z += a; return this; }
  translateX(d) { this.position.x += d; return this; } translateY(d) { this.position.y += d; return this; } translateZ(d) { this.position.z += d; return this; }
  getWorldPosition(v) { v.set(0, 0, 0); for (let o = this; o; o = o.parent) v.add(o.position); return v; }
  getWorldQuaternion(q) { return q; } getWorldDirection(v) { return v.set(0, 0, 1); } localToWorld(v) { return v; } worldToLocal(v) { return v; }
  copy(src) { this.name = src.name; this.position.copy(src.position); this.rotation.copy(src.rotation); this.scale.copy(src.scale); this.visible = src.visible; this.castShadow = src.castShadow; this.receiveShadow = src.receiveShadow; this.userData = { ...src.userData }; return this; }
  clone(recursive = true) { const c = new this.constructor(); c.copy(this); if (recursive) for (const ch of this.children) c.add(ch.clone(true)); return c; }
}
export class Group extends Object3D { constructor() { super(); this.isGroup = true; } }
export class Scene extends Object3D { constructor() { super(); this.isScene = true; this.background = null; this.fog = null; } }
export class Mesh extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new MeshBasicMaterial()) { super(); this.isMesh = true; this.geometry = geometry; this.material = material; stats.meshes++; }
  copy(src) { super.copy(src); this.geometry = src.geometry; this.material = src.material; return this; }
  clone(recursive = true) { const c = new this.constructor(this.geometry, this.material); c.copy(this); if (recursive) for (const ch of this.children) c.add(ch.clone(true)); return c; }
}
export class SkinnedMesh extends Mesh { constructor(g, m) { super(g, m); this.isSkinnedMesh = true; this.skeleton = null; } bind(s) { this.skeleton = s; } }
export class Bone extends Object3D { constructor() { super(); this.isBone = true; } }
export class Skeleton { constructor(bones = []) { this.bones = bones; } dispose() {} }
export class LineSegments extends Mesh { constructor(g, m) { super(g, m); this.isLineSegments = true; this.isMesh = false; } }
export class Line extends LineSegments { constructor(g, m) { super(g, m); this.isLine = true; } }
export class Points extends Mesh { constructor(g, m) { super(g, m); this.isPoints = true; this.isMesh = false; } }
export class Sprite extends Object3D { constructor(m = new SpriteMaterial()) { super(); this.isSprite = true; this.material = m; } }
export class InstancedMesh extends Mesh {
  constructor(g, m, count) { super(g, m); this.isInstancedMesh = true; this.count = count; this.instanceMatrix = new BufferAttribute(new Float32Array(count * 16), 16); this.instanceColor = null; }
  setMatrixAt(i, m) { for (let k = 0; k < 16; k++) this.instanceMatrix.array[i * 16 + k] = m.elements[k]; }
  setColorAt(i, c) { if (!this.instanceColor) this.instanceColor = new BufferAttribute(new Float32Array(this.count * 3), 3); this.instanceColor.setXYZ(i, c.r, c.g, c.b); }
  getMatrixAt(i, m) { for (let k = 0; k < 16; k++) m.elements[k] = this.instanceMatrix.array[i * 16 + k]; }
  dispose() {}
}
export class Light extends Object3D { constructor(c = 0xffffff, i = 1) { super(); this.isLight = true; this.color = new Color(c); this.intensity = i; } }
export class AmbientLight extends Light {} export class PointLight extends Light {} export class DirectionalLight extends Light { constructor(c, i) { super(c, i); this.target = new Object3D(); this.shadow = { camera: {}, mapSize: new Vector2() }; } }
export class HemisphereLight extends Light {} export class SpotLight extends Light {}
export class PerspectiveCamera extends Object3D { constructor() { super(); this.isCamera = true; } updateProjectionMatrix() {} }
export class Camera extends PerspectiveCamera {}
export class Fog { constructor(c, n, f) { this.color = new Color(c); this.near = n; this.far = f; } }

// Alleen zodat modules laden: lege klassen en tabellen, zonder gedrag.
const stub = (name) => ({ [name]: class { constructor(...a) { this.args = a; } dispose() {} } })[name];
export const WebGLRenderer = stub('WebGLRenderer'), WebGLRenderTarget = stub('WebGLRenderTarget'), PMREMGenerator = stub('PMREMGenerator'), Raycaster = stub('Raycaster'), Ray = stub('Ray'), Frustum = stub('Frustum'),
  BatchedMesh = stub('BatchedMesh'), SplineCurve = stub('SplineCurve'), CatmullRomCurve3 = stub('CatmullRomCurve3'), Colors = {};
export class Shape {
  constructor(points) { this.points = (points || []).map((p) => [p.x, p.y]); this.holes = []; }
  moveTo(x, y) { this.points = [[x, y]]; return this; } lineTo(x, y) { this.points.push([x, y]); return this; }
  quadraticCurveTo(cx, cy, x, y) { this.points.push([x, y]); return this; } bezierCurveTo(a, b, c, d, x, y) { this.points.push([x, y]); return this; } closePath() { return this; }
  absarc(x, y, r) { this.points.push([x + r, y]); return this; } getPoints() { return this.points.map(([x, y]) => new Vector2(x, y)); }
}
export const ShapeUtils = { triangulateShape: () => [], area: () => 0, isClockWise: () => false };
export const UniformsUtils = { clone: (o) => ({ ...o }), merge: (a) => Object.assign({}, ...a) };
export const UniformsLib = new Proxy({}, { get: () => ({}) });
export const ShaderChunk = new Proxy({}, { get: () => '' });
export const MathUtils = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t, degToRad: (d) => d * Math.PI / 180, radToDeg: (r) => r * 180 / Math.PI, euclideanModulo: (n, m) => ((n % m) + m) % m, generateUUID: () => 'mock-uuid' };
export class GLTFLoader { load(url, ok, prog, err) { if (err) err(new Error('threemock: geen GLTFLoader')); } }
