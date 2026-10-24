// Props that story missions put into the world for a while: Jelle's giant
// flag on d'Olle Grieze (H10), held up by ropes a pigeon can peck loose, and
// the mast and tanned sail of his skûtsje (H14), riding on a boat vehicle.
// World (x, y, height) maps to three.js (x, height, y).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';

let flag = null;
let sail = null;

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ea';
  g.fillRect(0, 0, 256, 384);
  // diagonal blue stripes with red leaves: a friendly nod to the pompeblêd
  g.save();
  g.translate(128, 192);
  g.rotate(-0.62);
  g.fillStyle = '#2553a6';
  for (let k = -5; k <= 5; k += 2) g.fillRect(-400, k * 44 - 22, 800, 44);
  g.restore();
  g.fillStyle = '#c8102e';
  for (const [x, y] of [[60, 70], [190, 120], [80, 210], [200, 280], [70, 330]]) {
    g.beginPath();
    g.moveTo(x, y + 26);
    g.bezierCurveTo(x - 34, y - 2, x - 14, y - 30, x, y - 10);
    g.bezierCurveTo(x + 14, y - 30, x + 34, y - 2, x, y + 26);
    g.fill();
  }
  // a white band along the bottom with Jelle's dedication (H10)
  g.fillStyle = '#f4f2ea';
  g.fillRect(0, 318, 256, 66);
  g.fillStyle = '#141414';
  g.font = 'bold 46px sans-serif';
  g.textAlign = 'center';
  g.fillText('FOAR MEM', 128, 368);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A banner hanging on the tower between heights z0 and z1, centred on (x, y)
// and facing +y; ropes: [{ x, y, z }] knots (glowing targets) holding it.
// The banner is a small Verlet cloth: pinned at the knots it billows in the
// wind, every rope pecked loose lets it sag, and dropFlag() lets it tumble
// down and drape itself over the ground. Fixed steps, so it plays the same
// every time; the story scene steps it (slowed) while the world is paused.
const COLS = 12, ROWS = 14, STEP = 1 / 60;

export function showTowerFlag({ x, y, z0, z1, width, ropes }) {
  clearStoryProps();
  const scene = getScene && getScene();
  if (!scene) return false;
  const group = new THREE.Group();
  group.name = 'story-flag';
  const tex = flagTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(width, z1 - z0, COLS, ROWS);
  const cloth = new THREE.Mesh(geo, mat);
  cloth.frustumCulled = false;
  group.add(cloth);
  const n = (COLS + 1) * (ROWS + 1);
  const pos = new Float32Array(n * 3), prev = new Float32Array(n * 3), pin = new Uint8Array(n);
  const at = (i, j) => j * (COLS + 1) + i;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const k = at(i, j) * 3;
      pos[k] = x - width / 2 + (i / COLS) * width;
      pos[k + 1] = y + 0.05;
      pos[k + 2] = z1 - (j / ROWS) * (z1 - z0);
      prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2];
    }
  }
  const links = [];
  const link = (a, b) => {
    const dx = pos[b * 3] - pos[a * 3], dy = pos[b * 3 + 1] - pos[a * 3 + 1], dz = pos[b * 3 + 2] - pos[a * 3 + 2];
    links.push(a, b, Math.hypot(dx, dy, dz));
  };
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      if (i < COLS) link(at(i, j), at(i + 1, j));
      if (j < ROWS) link(at(i, j), at(i, j + 1));
      if (i < COLS && j < ROWS) { link(at(i, j), at(i + 1, j + 1)); link(at(i + 1, j), at(i, j + 1)); }
    }
  }
  const knotGeo = new THREE.SphereGeometry(0.7, 12, 8);
  const knotMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  // ropes run from each knot back to the tower wall (towards -y)
  const ropeGeo = new THREE.BoxGeometry(0.12, 0.12, 5);
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x6b5a3a });
  const pins = [];
  const knots = ropes.map((r) => {
    const k = new THREE.Group();
    const ball = new THREE.Mesh(knotGeo, knotMat);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.z = -2.5;
    k.add(ball, rope);
    k.position.set(r.x, r.z, r.y);
    group.add(k);
    // the cloth point nearest the knot is held by it
    const i = Math.max(0, Math.min(COLS, Math.round(((r.x - (x - width / 2)) / width) * COLS)));
    const j = Math.max(0, Math.min(ROWS, Math.round(((z1 - r.z) / (z1 - z0)) * ROWS)));
    pins.push(at(i, j));
    pin[at(i, j)] = 1;
    return k;
  });
  // the top edge hangs from a batten until the top ropes go
  scene.add(group);
  flag = { group, cloth, knots, mat, tex, t: 0, acc: 0, cut: 0, fall: -1, base: { x, y, z0, z1, width }, pos, prev, pin, pins, links, n,
    geos: [geo, knotGeo, ropeGeo], mats: [mat, knotMat, ropeMat] };
  writeCloth(flag);
  return true;
}

export function hasTowerFlag() {
  return !!flag;
}

// Samen spelen (#452): de vlag als rekwisiet voor coopextra.js (plek van het midden; staat = breedte in m; z = hoogte van het midden)
export function vlagRekwisieten() {
  if (!flag) return [];
  const f = flagFocus(), p = flag.geos && flag.geos[0] && flag.geos[0].parameters;
  return f ? [{ soort: 'vlag', id: 0, x: f.x, y: f.y, z: f.z, staat: Math.min(255, Math.round((p && p.width) || 6)), klein: !!(flag.fall >= 0) }] : [];
}

// Rope k pecked loose: its knot goes and the banner sags a little further.
export function cutFlagRope(k) {
  if (!flag || !flag.knots[k] || !flag.knots[k].visible) return;
  flag.knots[k].visible = false;
  flag.pin[flag.pins[k]] = 0;
  flag.cut++;
}

export function dropFlag() {
  if (!flag || flag.fall >= 0) return;
  flag.fall = 0;
  flag.pin.fill(0);
  for (const k of flag.knots) k.visible = false;
}

// Where the banner is now (its middle), for the cameras following it down.
export function flagFocus() {
  if (!flag) return null;
  const p = flag.pos, n = flag.n;
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < n; k++) { x += p[k * 3]; y += p[k * 3 + 1]; z += p[k * 3 + 2]; }
  return { x: x / n, y: y / n, z: z / n };
}

// The knots still holding it (for the establishing shot).
export function flagKnotsFocus() {
  if (!flag) return null;
  const live = flag.knots.filter((k) => k.visible);
  if (!live.length) return flagFocus();
  const s = live.reduce((a, k) => ({ x: a.x + k.position.x, y: a.y + k.position.z, z: a.z + k.position.y }), { x: 0, y: 0, z: 0 });
  return { x: s.x / live.length, y: s.y / live.length, z: s.z / live.length };
}

function stepCloth(f) {
  const { pos, prev, pin, links, n, base } = f;
  const falling = f.fall >= 0;
  const t = f.t;
  const gust = falling ? 1.2 : 2.4 + Math.sin(t * 0.7) * 1.3 + Math.sin(t * 2.3) * 0.6;
  const damp = falling ? 0.975 : 0.985;
  for (let k = 0; k < n; k++) {
    if (pin[k]) continue;
    const q = k * 3;
    const x = pos[q], y = pos[q + 1], z = pos[q + 2];
    const vx = (x - prev[q]) * damp, vy = (y - prev[q + 1]) * damp, vz = (z - prev[q + 2]) * damp;
    prev[q] = x; prev[q + 1] = y; prev[q + 2] = z;
    const ripple = Math.sin(t * 3.1 + x * 0.4 + z * 0.25);
    const ax = Math.sin(t * 0.9 + z * 0.1) * 0.8;
    const ay = gust * (0.6 + 0.4 * ripple);
    const az = -9.8 * (falling ? 0.55 : 1);
    pos[q] = x + vx + ax * STEP * STEP;
    pos[q + 1] = y + vy + ay * STEP * STEP;
    pos[q + 2] = z + vz + az * STEP * STEP;
  }
  for (let it = 0; it < 4; it++) {
    for (let c = 0; c < links.length; c += 3) {
      const a = links[c], b = links[c + 1], rest = links[c + 2];
      const qa = a * 3, qb = b * 3;
      const dx = pos[qb] - pos[qa], dy = pos[qb + 1] - pos[qa + 1], dz = pos[qb + 2] - pos[qa + 2];
      const len = Math.hypot(dx, dy, dz) || 1e-6;
      const d = (len - rest) / len;
      const wa = pin[a] ? 0 : pin[b] ? 1 : 0.5, wb = pin[b] ? 0 : pin[a] ? 1 : 0.5;
      pos[qa] += dx * d * wa; pos[qa + 1] += dy * d * wa; pos[qa + 2] += dz * d * wa;
      pos[qb] -= dx * d * wb; pos[qb + 1] -= dy * d * wb; pos[qb + 2] -= dz * d * wb;
    }
  }
  for (let k = 0; k < n; k++) {
    const q = k * 3;
    // the tower wall behind the banner, and the ground it settles on
    if (pos[q + 2] > 2 && Math.abs(pos[q] - base.x) < base.width * 0.7 && pos[q + 1] < base.y) pos[q + 1] = base.y;
    if (pos[q + 2] < 0.06) {
      pos[q + 2] = 0.06;
      prev[q] += (pos[q] - prev[q]) * 0.6;
      prev[q + 1] += (pos[q + 1] - prev[q + 1]) * 0.6;
      prev[q + 2] = pos[q + 2];
    }
  }
}

function writeCloth(f) {
  const attr = f.cloth.geometry.attributes.position;
  const a = attr.array, p = f.pos;
  for (let k = 0; k < f.n; k++) {
    a[k * 3] = p[k * 3];
    a[k * 3 + 1] = p[k * 3 + 2];
    a[k * 3 + 2] = p[k * 3 + 1];
  }
  attr.needsUpdate = true;
}


export function clearSkutsjeSail() {
  if (!sail) return;
  sail.group.removeFromParent();
  for (const g of sail.geos) g.dispose();
  for (const m of sail.mats) m.dispose();
  sail = null;
}

function updateSail(dt) {
  const q = sail;
  q.t += dt;
  const v = q.v;
  q.group.position.set(v.x, 0.35 + (v.z || 0), v.y);
  q.group.rotation.y = -v.angle;
  q.cloth.rotation.y = 0.25 + Math.sin(q.t * 0.7) * 0.05;
  q.pennant.rotation.y = Math.sin(q.t * 4) * 0.3;
  if (v.wrecked || v.sinking) clearSkutsjeSail();
}

export function updateStoryProps(dt) {
  if (sail) updateSail(dt);
  if (!flag) return;
  const f = flag;
  f.acc = Math.min(f.acc + dt, STEP * 6);
  while (f.acc >= STEP) {
    f.acc -= STEP;
    f.t += STEP;
    if (f.fall >= 0) f.fall += STEP;
    stepCloth(f);
  }
  writeCloth(f);
  if (f.fall > 90) clearStoryProps();
}

export function clearStoryProps() {
  if (!flag) return;
  flag.group.removeFromParent();
  for (const g of flag.geos) g.dispose();
  for (const m of flag.mats) m.dispose();
  flag.tex.dispose();
  flag = null;
}
