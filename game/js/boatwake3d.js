import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y, inMapWater } from './util.js';

// Boat wakes: foam laid down in the world behind the stern (so it stays where
// the boat was, not glued to the hull), spreading into a Kelvin V with two
// arms that widen and fade (with the faint banding of the transverse waves
// along them), a churned band straight behind the prop, a wide pale slick
// between the arms, and a bow wave that rides up and down with the hull.
// Longer hulls leave longer wakes. Arms die out where they reach a quay or
// bank. Everything sits a few cm above the water's swell and draws after it
// without depth writes, so it never z-fights the surface.

const lifeOf = (v) => Math.min(7, 3.4 + v.model.len * 0.36);
const STEP = 0.6;
const MAX_SAMPLES = 60;
const KELVIN = 0.36; // tan(19.5deg): lateral spread per metre the boat moves on
const MAX_SPREAD = 7;
const LIFT = 0.13;
const RIBBONS = 4;
const VERTS = (MAX_SAMPLES + 1) * 2;

let foamTex = null;

function foamTexture() {
  if (foamTex) return foamTex;
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W, y = H * (0.1 + 0.8 * rnd()), r = 1.2 + rnd() * rnd() * 10;
    const a = 0.2 + rnd() * 0.55;
    for (const dx of [-W, 0, W]) {
      const grd = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  g.globalCompositeOperation = 'destination-in';
  const lin = g.createLinearGradient(0, 0, 0, H);
  lin.addColorStop(0, 'rgba(0,0,0,0)');
  lin.addColorStop(0.28, 'rgba(0,0,0,1)');
  lin.addColorStop(0.72, 'rgba(0,0,0,1)');
  lin.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lin;
  g.fillRect(0, 0, W, H);
  foamTex = new THREE.CanvasTexture(c);
  foamTex.wrapS = THREE.RepeatWrapping;
  foamTex.wrapT = THREE.ClampToEdgeWrapping;
  foamTex.colorSpace = THREE.SRGBColorSpace;
  return foamTex;
}

function foamMaterial() {
  return new THREE.MeshBasicMaterial({
    map: foamTexture(), vertexColors: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8, side: THREE.DoubleSide,
  });
}

function buildTrailMesh() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RIBBONS * VERTS * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RIBBONS * VERTS * 4), 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(RIBBONS * VERTS * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let r = 0; r < RIBBONS; r++) {
    const base = r * VERTS;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, foamMaterial());
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

// Bow wave, in the boat's frame: per stem two thin foam ribbons that start
// at the cutwater, hug the hull while it widens and then peel off aft at a
// shallow angle, fading out. Length, width and opacity scale with speed and
// the foam texture scrolls aft, so a drifting boat shows nothing and a fast
// one throws a crisp, moving wave. Twin-float pedalos get one per float.
const BOW_N = 10;
function bowStems(v) {
  const hl = v.model.len / 2, hw = v.model.wid / 2;
  if (v.model.kind === 'waterfiets') return [{ z: hw - 0.22, hw: 0.22, x: hl * 0.98 }, { z: -(hw - 0.22), hw: 0.22, x: hl * 0.98 }];
  return [{ z: 0, hw: hw * (v.model.kind === 'rubberboot' ? 1 : 0.94), x: hl * 0.99 }];
}

function buildBowMesh(v) {
  const stems = bowStems(v);
  const ribbons = stems.length * 2;
  const verts = ribbons * (BOW_N + 1) * 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(verts * 4), 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(verts * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let r = 0; r < ribbons; r++) {
    const base = r * (BOW_N + 1) * 2;
    for (let k = 0; k < BOW_N; k++) { const q = base + k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, foamMaterial());
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  mesh.userData.stems = stems;
  return mesh;
}

function updateBow(mesh, v, time, light, spd) {
  const stems = mesh.userData.stems;
  const hl = v.model.len / 2;
  const k = Math.min(1, spd / Math.max(2, v.model.maxSpeed || 5));
  const reach = hl * (0.7 + 0.9 * k) + spd * 0.35;
  const g = mesh.geometry;
  const P = g.attributes.position.array, C = g.attributes.color.array, U = g.attributes.uv.array;
  const flow = time * (0.6 + spd * 0.35);
  let vi = 0;
  for (const st of stems) {
    for (const side of [1, -1]) {
      for (let i = 0; i <= BOW_N; i++) {
        const t = i / BOW_N;
        const s = t * reach;
        const hug = st.hw * Math.pow(Math.min(1, s / (hl * 0.55)), 0.6);
        const peel = Math.max(0, s - hl * 0.35) * (0.22 + 0.2 * k);
        const inner = hug + peel + 0.02;
        const w = (0.06 + 0.36 * t) * (0.5 + 0.9 * k);
        const x = st.x - s;
        const a = Math.min(1, t * 7) * Math.pow(1 - t, 1.3) * (0.4 + 0.75 * k) * (0.85 + 0.15 * Math.sin(flow * 3 + i));
        P[vi * 3] = x; P[vi * 3 + 1] = 0; P[vi * 3 + 2] = st.z + side * (inner - w * 0.25);
        P[vi * 3 + 3] = x; P[vi * 3 + 4] = 0; P[vi * 3 + 5] = st.z + side * (inner + w);
        for (const o of [0, 4]) { C[vi * 4 + o] = light; C[vi * 4 + o + 1] = light; C[vi * 4 + o + 2] = light * 1.02; C[vi * 4 + o + 3] = a; }
        const u = s / 1.3 + flow + (side > 0 ? 0 : 0.37);
        U[vi * 2] = u; U[vi * 2 + 1] = 0.08; U[vi * 2 + 2] = u; U[vi * 2 + 3] = 0.92;
        vi += 2;
      }
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.color.needsUpdate = true;
  g.attributes.uv.needsUpdate = true;
}

// Free water beside (x, y) along (nx, ny), in whole metres up to MAX_SPREAD.
function reachToShore(map, x, y, nx, ny) {
  for (let d = 1; d <= MAX_SPREAD; d++) {
    if (!inMapWater(map, x + nx * d, y + ny * d)) return d - 0.6;
  }
  return MAX_SPREAD + 2;
}

const wakes = new Map();

function wakeFor(scene, v) {
  let w = wakes.get(v.id);
  if (w && (w.kind !== v.model.kind || w.len !== v.model.len)) {
    // a rental swaps the model after spawning
    scene.remove(w.bow);
    w.bow.geometry.dispose();
    w.bow.material.dispose();
    w.bow = buildBowMesh(v);
    w.kind = v.model.kind;
    w.len = v.model.len;
    scene.add(w.bow);
  }
  if (!w) {
    w = { samples: [], dist: 0, trail: buildTrailMesh(), bow: buildBowMesh(v), kind: v.model.kind, len: v.model.len };
    scene.add(w.trail);
    scene.add(w.bow);
    wakes.set(v.id, w);
  }
  return w;
}

function dispose(scene, w) {
  for (const m of [w.trail, w.bow]) {
    scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
}

// Writes one ribbon: `row(i)` returns [cx, cy, nx, ny, inner, outer, alpha, u]
// for sample i (0 = newest, at the stern); unused rows collapse to nothing.
function writeRibbon(w, r, count, row, light) {
  const g = w.trail.geometry;
  const P = g.attributes.position.array, C = g.attributes.color.array, U = g.attributes.uv.array;
  const y = WATER_Y + (w.lift || 0) + LIFT + r * 0.004;
  let last = null;
  for (let i = 0; i <= MAX_SAMPLES; i++) {
    const vi = r * VERTS + i * 2;
    const q = i < count ? row(i) : null;
    if (q) last = q;
    const [cx, cy, nx, ny, inner, outer, a, u] = q || last || [0, 0, 0, 0, 0, 0, 0, 0];
    const alpha = q ? a : 0;
    P[vi * 3] = cx + nx * inner; P[vi * 3 + 1] = y; P[vi * 3 + 2] = cy + ny * inner;
    P[vi * 3 + 3] = cx + nx * outer; P[vi * 3 + 4] = y; P[vi * 3 + 5] = cy + ny * outer;
    for (const k of [0, 4]) { C[vi * 4 + k] = light; C[vi * 4 + k + 1] = light; C[vi * 4 + k + 2] = light * 1.02; C[vi * 4 + k + 3] = alpha; }
    U[vi * 2] = u; U[vi * 2 + 1] = 0; U[vi * 2 + 2] = u; U[vi * 2 + 3] = 1;
  }
}

function updateWake(w, v, map, time, light) {
  const LIFE = lifeOf(v);
  const spd = v.wrecked || v.sinking ? 0 : Math.abs(v.speed);
  const hx = Math.cos(v.angle), hy = Math.sin(v.angle);
  const hl = v.model.len / 2, hw = v.model.wid / 2;
  const back = v.speed >= 0 ? 1 : -1;
  const ex = v.x - hx * hl * 0.9 * back, ey = v.y - hy * hl * 0.9 * back;
  const S = w.samples;
  while (S.length && time - S[S.length - 1].t > LIFE) S.pop();
  if (spd > 0.4) {
    const head = S[0];
    const step = head ? Math.hypot(ex - head.x, ey - head.y) : STEP;
    if (step >= STEP) {
      w.dist += step;
      const nx = -hy, ny = hx;
      S.unshift({ x: ex, y: ey, nx, ny, t: time, spd, d: w.dist, limL: reachToShore(map, ex, ey, nx, ny), limR: reachToShore(map, ex, ey, -nx, -ny) });
      if (S.length > MAX_SAMPLES) S.pop();
    }
  }
  // live head at the stern so the foam starts right at the hull
  const pts = spd > 0.4
    ? [{ x: ex, y: ey, nx: -hy, ny: hx, t: time, spd, d: w.dist + (S[0] ? Math.hypot(ex - S[0].x, ey - S[0].y) : 0), limL: S[0] ? S[0].limL : 4, limR: S[0] ? S[0].limR : 4 }, ...S]
    : S;
  const count = Math.min(pts.length, MAX_SAMPLES + 1);
  // on the water at its own peil (a lake above the boezem, a lock's kolk) the wake lies with the surface (#299)
  w.lift = v._lift || 0;
  // paddle and pedal craft leave a faint wake and no propeller churn
  const soft = v.model.kind === 'kano' || v.model.kind === 'kajak' || v.model.kind === 'waterfiets' || v.model.kind === 'sup' || v.model.kind === 'skiff' || v.model.kind === 'acht';
  const strength = (s) => Math.min(1, s / 3.5) * (soft ? 0.45 : 1);
  for (const side of [1, -1]) {
    writeRibbon(w, side > 0 ? 0 : 1, count, (i) => {
      const p = pts[i];
      const age = time - p.t;
      const lim = side > 0 ? p.limL : p.limR;
      const want = hw * 0.75 + Math.min(MAX_SPREAD, KELVIN * p.spd * age * 1.1);
      const off = Math.min(want, lim);
      const shore = want > lim ? Math.max(0, 1 - (want - lim) / 1.2) : 1;
      const width = 0.35 + age * 0.45 + p.spd * 0.04;
      const fade = Math.pow(Math.max(0, 1 - age / LIFE), 1.8);
      // the transverse waves show as soft bands along the arm
      const band = 0.72 + 0.28 * Math.sin(p.d * 1.7 - age * 2.2);
      const a = fade * shore * strength(p.spd) * 0.78 * band * (i === 0 ? 0.6 : 1);
      return [p.x, p.y, p.nx * side, p.ny * side, off - width * 0.5, off + width * 0.5, a, p.d / 4.5 + side * 0.31];
    }, light);
  }
  writeRibbon(w, 2, count, (i) => {
    const p = pts[i];
    const age = time - p.t;
    const churnLife = LIFE * 0.5;
    const half = hw * 0.6 + age * (0.35 + p.spd * 0.05);
    const fade = Math.pow(Math.max(0, 1 - age / churnLife), 1.3);
    const lim = Math.min(p.limL, p.limR) + 0.5;
    return [p.x, p.y, p.nx, p.ny, -Math.min(half, lim), Math.min(half, lim), fade * strength(p.spd) * (soft ? 0.3 : 0.85), p.d / 2.6 + 0.5];
  }, light);
  // the pale slick between the arms, wider and longer-lived than the churn
  writeRibbon(w, 3, count, (i) => {
    const p = pts[i];
    const age = time - p.t;
    const half = hw * 0.9 + age * (0.22 + p.spd * 0.05);
    const fade = Math.pow(Math.max(0, 1 - age / LIFE), 1.2) * Math.min(1, age * 2 + 0.2);
    const lim = Math.min(p.limL, p.limR) + 0.3;
    return [p.x, p.y, p.nx, p.ny, -Math.min(half, lim), Math.min(half, lim), fade * strength(p.spd) * 0.22, p.d / 7 + 0.2];
  }, light);
  const g = w.trail.geometry;
  g.attributes.position.needsUpdate = true;
  g.attributes.color.needsUpdate = true;
  g.attributes.uv.needsUpdate = true;
  w.trail.visible = S.length > 0;

  const bowOn = spd > 0.6 && v.speed > 0;
  w.bow.visible = bowOn;
  if (bowOn) {
    const seed = (v.id || 0) * 1.7;
    const heave = v._buoyY != null ? v._buoyY : Math.sin(time * 1.6 + seed) * 0.03;
    w.bow.position.set(v.x, WATER_Y + w.lift + LIFT + 0.015 + heave * 0.8, v.y);
    w.bow.rotation.y = -v.angle;
    updateBow(w.bow, v, time, light, spd);
  }
}

// boatHasMesh(v): only boats the scene is actually drawing get a wake.
export function syncBoatWakes3D(scene, world, boatHasMesh, night = 0) {
  const light = 0.3 + 0.7 * (1 - night);
  const seen = new Set();
  const px = world.player.x, py = world.player.y;
  for (const v of world.vehicles) {
    if (!v.isBoat || !boatHasMesh(v)) continue;
    if (Math.abs(v.x - px) > 220 || Math.abs(v.y - py) > 220) continue;
    const w = wakes.get(v.id);
    if (!w && (v.wrecked || Math.abs(v.speed) < 0.4)) continue;
    seen.add(v.id);
    updateWake(wakeFor(scene, v), v, world.map, world.time, light);
  }
  for (const [id, w] of wakes) {
    if (seen.has(id)) continue;
    dispose(scene, w);
    wakes.delete(id);
  }
}
