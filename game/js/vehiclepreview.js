import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { buildWeaponMesh, buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { buildProductMesh } from './shopmodels3d.js';
import { VERSION } from './version.js';

const OBJECT_KINDS = new Set(['weapon', 'person', 'product']);
// a person seen from the front, the face turned a little into the screen
// (the model faces its local -x)
export const PORTRAIT_ANGLE = -1.55;

// Rotating 3D previews of vehicles, weapons, people and products.
// spec = { kind, model, color, nameIdx, flags } for a vehicle, or
// { kind: 'weapon', weapon } / { kind: 'person', look, frame } (a person
// appearance, as TAMMO_APPEARANCE; frame 'head' for a portrait) /
// { kind: 'product', product } (shopmodels3d.js key), framed by bounding box.
//
// createVehiclePreview: its own renderer on its own canvas (the shops).
// createSharedPreview: the same, but drawn by the one shared renderer below
// and copied onto a 2D canvas, so the pause menu's viewers (garage, Verhaal)
// never open a GL context of their own. renderSnapshot: a still image
// from that shared renderer (garage thumbnails, HUD and Verhaal portraits).

function disposeMesh(m) {
  m.traverse((o) => {
    if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const mat of mats) if (!mat.userData || !mat.userData.shared) { if (mat.map) mat.map.dispose(); mat.dispose(); }
  });
}

function setupScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4f2ec, 0x2a3a2e, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 6, 3);
  scene.add(sun);
  // back light so dark guns and hair read against the dark panel
  const rim = new THREE.DirectionalLight(0xdff4e6, 1.8);
  rim.position.set(-3, 2.5, -5);
  scene.add(rim);
  return { scene, rim, cam: new THREE.PerspectiveCamera(32, 3, 0.1, 100) };
}

// { mesh, body, fit } for a spec, or null. sphereFit: frame vehicles by
// their bounding sphere too (any canvas shape, tall buses and bikes).
function buildObject(spec, sphereFit = false) {
  if (OBJECT_KINDS.has(spec.kind)) {
    const body = spec.kind === 'weapon' ? buildWeaponMesh(spec.weapon)
      : spec.kind === 'person' ? buildPersonMesh(spec.look.shirt, spec.look.skin, spec.look)
        : buildProductMesh(spec.product);
    if (!body) return null;
    const mesh = new THREE.Group();
    mesh.add(body);
    let fit;
    if (spec.kind === 'person') {
      const hs = body.scale.y || 1;
      fit = spec.frame === 'head' ? { c: new THREE.Vector3(0, 1.62 * hs, 0), r: 0.27 * hs } : { c: new THREE.Vector3(0, 0.95 * hs, 0), r: 0.95 * hs };
    } else {
      body.updateMatrixWorld(true);
      const sphere = new THREE.Box3().setFromObject(body).getBoundingSphere(new THREE.Sphere());
      // turn about the model's own middle
      body.position.set(-sphere.center.x, 0, -sphere.center.z);
      fit = { c: new THREE.Vector3(0, sphere.center.y, 0), r: Math.max(0.05, sphere.radius) };
    }
    return { mesh, body, fit };
  }
  const fake = { id: -1 - (spec.nameIdx || 0), model: { ...spec.model, color: spec.color }, isBike: spec.kind === 'bike', isScooter: spec.kind === 'scooter', isBoat: spec.kind === 'boat', isHeli: spec.kind === 'heli', ...(spec.flags || {}), health: 100 };
  const mesh = buildVehicleMesh(fake);
  if (!sphereFit) return { mesh, body: null, fit: null };
  mesh.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere());
  return { mesh, body: null, fit: { c: new THREE.Vector3(0, sphere.center.y, 0), r: Math.max(0.3, sphere.radius * 0.78) } };
}

function frameCamera(cam, spec, fit, zoom) {
  if (fit) {
    const { c, r } = fit;
    const d = (r / Math.sin((cam.fov * Math.PI) / 360)) * 0.95 * zoom / Math.min(1, cam.aspect * 0.9);
    // a portrait looks straight at the face, a full figure from a little above
    cam.position.set(c.x, c.y + d * (spec.frame === 'head' ? 0.08 : 0.28), c.z + d);
    cam.lookAt(c.x, c.y, c.z);
    return;
  }
  const len = (spec.model && spec.model.len) || 4;
  const dist = Math.max(3.2, len * (spec.kind === 'heli' ? 1.15 : 1.55)) * zoom;
  cam.position.set(0, len * 0.42 + 0.6 * zoom, dist);
  cam.lookAt(0, spec.kind === 'heli' ? 1.5 : spec.kind === 'car' ? 0.75 : 0.6, 0);
}

// Pointer drag rotates, wheel zooms; auto-rotation resumes after a moment.
function bindDrag(canvas, p) {
  canvas.addEventListener('pointerdown', (e) => { p.drag = { x: e.clientX, a: p.angle }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (p.drag) p.angle = p.drag.a + (e.clientX - p.drag.x) * 0.012; });
  const up = () => { p.drag = null; p.idleAt = performance.now() + 2500; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    p.zoom = Math.max(0.55, Math.min(1.8, p.zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
  }, { passive: false });
}

// opts.pixelRatio: backing pixels per CSS px. opts.interactive: drag to
// rotate, wheel to zoom. Renders only while shown and while active() says
// so; dispose() frees the GL context.
export function createVehiclePreview(canvas, { interactive = false, active = () => true, pixelRatio = () => devicePixelRatio } = {}) {
  const p = { renderer: null, scene: null, cam: null, rim: null, mesh: null, body: null, key: '', raf: 0, angle: 0.6, zoom: 1, drag: null, idleAt: 0, spec: null, dead: false, fit: null, last: 0 };

  function tick() {
    if (p.dead || !p.mesh || !active()) { p.raf = 0; return; }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = pixelRatio();
    if (w && h && (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr))) {
      p.renderer.setPixelRatio(pr);
      p.renderer.setSize(w, h, false);
      p.cam.aspect = w / h;
      p.cam.updateProjectionMatrix();
    }
    const now = performance.now();
    const dt = Math.min(0.1, (now - (p.last || now)) / 1000);
    p.last = now;
    if (!p.drag && now > p.idleAt) p.angle += dt * 0.75;
    p.mesh.rotation.y = p.angle;
    if (p.spec.kind === 'person') animatePersonWalk(p.body, 0, dt);
    frameCamera(p.cam, p.spec, p.fit, p.zoom);
    p.renderer.render(p.scene, p.cam);
    p.raf = requestAnimationFrame(tick);
  }

  function show(spec) {
    const key = spec ? JSON.stringify(spec) : '';
    if (key === p.key && (p.raf || !spec)) return;
    p.key = key;
    if (p.mesh) { p.scene.remove(p.mesh); disposeMesh(p.mesh); p.mesh = null; }
    p.spec = spec;
    if (!spec) {
      canvas.classList.remove('on');
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      return;
    }
    canvas.classList.add('on');
    if (!p.renderer) {
      try {
        p.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch (err) {
        canvas.classList.remove('on');
        return;
      }
      p.renderer.outputColorSpace = THREE.SRGBColorSpace;
      Object.assign(p, setupScene());
    }
    p.rim.visible = OBJECT_KINDS.has(spec.kind);
    const o = buildObject(spec);
    if (!o) { show(null); return; }
    p.mesh = o.mesh;
    p.body = o.body;
    p.fit = o.fit;
    p.scene.add(p.mesh);
    p.last = 0;
    if (!p.raf) p.raf = requestAnimationFrame(tick);
  }

  if (interactive) bindDrag(canvas, p);

  return {
    show,
    // drop the shown model (the renderer stays for the next one)
    clear() { show(null); },
    // resume after active() was false for a while
    wake() { if (p.mesh && !p.raf && !p.dead) p.raf = requestAnimationFrame(tick); },
    dispose() {
      p.dead = true;
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      if (p.mesh) { disposeMesh(p.mesh); p.mesh = null; }
      if (p.renderer) { p.renderer.dispose(); p.renderer.forceContextLoss(); p.renderer = null; }
    },
  };
}

// --- the shared renderer --------------------------------------------------------------

let gl = null;
let glFailed = false;

function sharedGl() {
  if (gl || glFailed) return gl;
  try {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    gl = { renderer, canvas, ...setupScene() };
  } catch (err) {
    glFailed = true;
  }
  return gl;
}

// Renders `mesh` at w x h backing pixels into the shared canvas.
function renderShared(mesh, spec, fit, w, h, zoom) {
  const g = sharedGl();
  if (!g) return null;
  if (g.canvas.width !== w || g.canvas.height !== h) g.renderer.setSize(w, h, false);
  g.cam.aspect = w / h;
  g.cam.updateProjectionMatrix();
  g.rim.visible = OBJECT_KINDS.has(spec.kind);
  frameCamera(g.cam, spec, fit, zoom);
  g.scene.add(mesh);
  g.renderer.render(g.scene, g.cam);
  g.scene.remove(mesh);
  return g.canvas;
}

// Same API as createVehiclePreview, drawn through the shared renderer onto
// `canvas` (a plain 2D canvas). dispose() frees only the model.
export function createSharedPreview(canvas, { interactive = false, active = () => true, pixelRatio = () => Math.min(1.5, devicePixelRatio), angle = 0.6 } = {}) {
  const p = { mesh: null, body: null, fit: null, key: '', raf: 0, angle, zoom: 1, drag: null, idleAt: 0, spec: null, dead: false, last: 0, ctx: canvas.getContext('2d') };

  function tick() {
    if (p.dead || !p.mesh || !active()) { p.raf = 0; return; }
    const pr = pixelRatio();
    const w = Math.round(canvas.clientWidth * pr), h = Math.round(canvas.clientHeight * pr);
    if (!w || !h) { p.raf = requestAnimationFrame(tick); return; }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const now = performance.now();
    const dt = Math.min(0.1, (now - (p.last || now)) / 1000);
    p.last = now;
    if (!p.drag && now > p.idleAt) p.angle += dt * 0.75;
    p.mesh.rotation.y = p.angle;
    if (p.spec.kind === 'person') animatePersonWalk(p.body, 0, dt);
    const src = renderShared(p.mesh, p.spec, p.fit, w, h, p.zoom);
    p.ctx.clearRect(0, 0, w, h);
    if (src) p.ctx.drawImage(src, 0, 0);
    p.raf = requestAnimationFrame(tick);
  }

  function show(spec) {
    const key = spec ? JSON.stringify(spec) : '';
    if (key === p.key && (p.raf || !spec)) return;
    p.key = key;
    if (p.mesh) { disposeMesh(p.mesh); p.mesh = null; }
    p.spec = spec;
    if (!spec || !sharedGl()) {
      canvas.classList.remove('on');
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      p.ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const o = buildObject(spec, true);
    if (!o) { show(null); return; }
    canvas.classList.add('on');
    p.mesh = o.mesh;
    p.body = o.body;
    p.fit = o.fit;
    p.last = 0;
    if (!p.raf) p.raf = requestAnimationFrame(tick);
  }

  if (interactive) bindDrag(canvas, p);

  return {
    show,
    clear() { show(null); },
    wake() { if (p.mesh && !p.raf && !p.dead) p.raf = requestAnimationFrame(tick); },
    // turn the model by hand (keyboard)
    turn(da) { p.angle += da; p.idleAt = performance.now() + 2500; },
    dispose() {
      p.dead = true;
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      if (p.mesh) { disposeMesh(p.mesh); p.mesh = null; }
    },
  };
}

// --- snapshots ----------------------------------------------------------------------

const shots = new Map();
const queue = [];
let pumping = false;
const SHOT_BUDGET_MS = 6;

function shoot(spec, w, h, angle) {
  const o = buildObject(spec, true);
  if (!o) return '';
  o.mesh.rotation.y = angle;
  const src = renderShared(o.mesh, spec, o.fit, w, h, 1);
  // read back in the same task as the render (no preserveDrawingBuffer)
  const url = src ? src.toDataURL('image/png') : '';
  disposeMesh(o.mesh);
  return url;
}

// Snapshots asked for with { keep: true } (the HUD portraits) are also kept
// in localStorage for this game version, so a new session shows them
// without a render (one shot costs 10 to 50 ms on a slow CPU). A model
// change ships with a new version; source runs ('dev') keep nothing.
const KEEP_KEY = 'gte-snapshots';
const KEEP_MAX = 8;
let kept = null;
function keptShots() {
  if (kept) return kept;
  kept = { v: VERSION, shots: {} };
  if (VERSION === 'dev') return kept;
  try {
    const d = JSON.parse(localStorage.getItem(KEEP_KEY) || 'null');
    if (d && d.v === VERSION && d.shots && typeof d.shots === 'object') kept.shots = d.shots;
  } catch (e) { /* ignore */ }
  return kept;
}
function keepShot(key, url) {
  const k = keptShots();
  if (VERSION === 'dev' || !url || k.shots[key] === url) return;
  delete k.shots[key];
  k.shots[key] = url;
  const keys = Object.keys(k.shots);
  for (let i = 0; i < keys.length - KEEP_MAX; i++) delete k.shots[keys[i]];
  try { localStorage.setItem(KEEP_KEY, JSON.stringify(k)); } catch (e) { /* ignore */ }
}

function pump() {
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < SHOT_BUDGET_MS) {
    const job = queue.shift();
    if (!shots.has(job.key)) {
      shots.set(job.key, shoot(job.spec, job.w, job.h, job.angle));
      if (job.keep) keepShot(job.key, shots.get(job.key));
    }
    for (const cb of job.cbs) cb(shots.get(job.key));
  }
  if (queue.length) requestAnimationFrame(pump);
  else pumping = false;
}

// A still image (data URL, '' when WebGL is unavailable) of `spec` at w x h
// pixels, cached for the session. Rendered a few per frame: `cb` gets the URL
// (right away when cached); the return value is the cached URL or null.
// keep: also across sessions (see keepShot).
export function renderSnapshot(spec, w, h, cb = null, { angle = 0.6, keep = false } = {}) {
  if (!spec) return null;
  const key = `${w}x${h}@${angle}|${JSON.stringify(spec)}`;
  if (!shots.has(key) && keep && keptShots().shots[key]) shots.set(key, keptShots().shots[key]);
  if (shots.has(key)) { if (cb) cb(shots.get(key)); return shots.get(key); }
  const job = queue.find((j) => j.key === key);
  if (job) { if (cb) job.cbs.push(cb); job.keep = job.keep || keep; return null; }
  queue.push({ key, spec, w, h, angle, keep, cbs: cb ? [cb] : [] });
  if (!pumping) { pumping = true; requestAnimationFrame(pump); }
  return null;
}
