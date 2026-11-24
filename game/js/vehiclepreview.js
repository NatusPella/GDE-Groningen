import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildVehicleMesh, releaseVehicleGeometries } from './models3d_vehicles.js';
import { buildWeaponMesh, buildPersonMesh, animatePersonWalk, releasePersonGeometry } from './models3d_people.js';
import { buildProductMesh } from './shopmodels3d.js';
import { buildSpulMesh } from './models3d_spullen.js';
import { buildClothingPreview, turnPreview } from './clothingpreview.js';
import { VERSION } from './version.js';
import { watchContext } from './blackframe.js';
import { KEYS } from './storagekeys.js';
import { previewVehicle } from './garagepics.js';
import { logError } from './errorlog.js';
import { tickVehicleLook } from './vehiclelook3d.js';
import { farmBody } from './farmmodels3d.js';

// 'farm' (farmpics.js: dier, gewasveld, werktuig, gebouw) hoort hier: zonder stond hij er niet in en viel elk boerderijplaatje door naar de
// voertuigbouwer, als auto zonder maat (len en wid undefined): een romp vol NaN en twaalf three.js-waarschuwingen bij Land en bedrijf (beeld 24-11)
export const OBJECT_KINDS = new Set(['weapon', 'person', 'product', 'spul', 'farm', 'piece', 'pieceset', 'piecefig']);
// a person seen from the front, the face turned a little into the screen
// (the model faces its local -x)
export const PORTRAIT_ANGLE = -1.55;

// Rotating 3D previews of vehicles, weapons, people and products.
// spec = { kind, model, color, nameIdx, flags } for a vehicle, or
// { kind: 'weapon', weapon } / { kind: 'person', look, frame } (a person
// appearance, as TAMMO_APPEARANCE; frame 'head' for a portrait) /
// { kind: 'piece', piece } / { kind: 'pieceset', pieces } (een kledingstuk of een set zonder personage, clothingpreview.js) / { kind: 'piecefig', piece, look } (het stuk naast het personage dat het draagt, de kledingwinkel) /
// { kind: 'product', product } (shopmodels3d.js key) / { kind: 'farm', farm } (farmmodels3d.js: dier, gebouw, gewasveld of werktuig van de boerderij) / { kind: 'spul', spul } (models3d_spullen.js,
// the Spullen viewer #1086), framed by bounding box.
//
// createVehiclePreview: its own renderer on its own canvas (the shops).
// createSharedPreview: the same, but drawn by the one shared renderer below
// and copied onto a 2D canvas, so the pause menu's viewers (garage, Verhaal)
// never open a GL context of their own. renderSnapshot: a still image
// from that shared renderer (garage thumbnails, HUD and Verhaal portraits).

function disposeMesh(m) {
  // #796: een preview van een echt voertuig of personage deelt zijn geometrie met de wereld;
  // geef die ref terug in plaats van hem (via de shared-check hieronder) te laten staan.
  releaseVehicleGeometries(m);
  m.traverse((o) => {
    const g = o.geometry;
    if (typeof (g && g.userData && g.userData.personRefs) === 'number') releasePersonGeometry(o);
    else if (g && !(g.userData && g.userData.shared)) g.dispose();
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
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

// A soft contact shadow under a vehicle, so it stands on the panel instead of
// floating: one shared plane and radial-gradient texture, scaled per model and
// turning with it (a child of the mesh). Shared, so disposeMesh leaves it.
let shadowParts = null;
function groundShadow(box) {
  if (!shadowParts) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.62)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    material.userData.shared = true;
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.userData.shared = true;
    shadowParts = { material, geometry };
  }
  const m = new THREE.Mesh(shadowParts.geometry, shadowParts.material);
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  m.scale.set(Math.max(0.6, size.x) * 1.3, 1, Math.max(0.6, size.z) * 1.45);
  m.position.set(mid.x, 0.015, mid.z);
  m.renderOrder = -1;
  return m;
}

// Heeft elke geometrie in de boom eindige posities? (puur op three, getest in scripts/vehiclepreview_nan_test.mjs)
export function meshIsFinite(root) {
  let ok = true;
  root.traverse((o) => {
    const a = ok && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!a || !a.array) return;
    for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) { ok = false; return; }
  });
  return ok;
}
const gemeld = new Set();
function meldKapotVoorbeeld(spec) {
  const m = spec && spec.model, sleutel = `${spec && spec.kind}|${m && m.name}`;
  if (gemeld.has(sleutel)) return;
  gemeld.add(sleutel);
  try { const t = `Voorbeeld van ${sleutel} niet getekend: geometrie met NaN (len ${m && m.len}, wid ${m && m.wid}, vlaggen ${Object.keys((spec && spec.flags) || {}).join(',') || 'geen'})`; logError('warn', t); if (typeof console !== 'undefined') console.warn('[voorbeeld] ' + t); } catch (e) { /* melden is een extraatje */ }
}

// { mesh, body, fit } for a spec, or null. sphereFit: frame vehicles by
// their bounding sphere too (any canvas shape, tall buses and bikes).
function buildObject(spec, sphereFit = false) {
  if (spec.kind === 'piece' || spec.kind === 'pieceset' || spec.kind === 'piecefig') return buildClothingPreview(spec); // kleding: alleen het stuk, geen personage (clothingpreview.js)
  if (OBJECT_KINDS.has(spec.kind)) {
    const body = spec.kind === 'weapon' ? buildWeaponMesh(spec.weapon)
      : spec.kind === 'person' ? buildPersonMesh(spec.look.shirt, spec.look.skin, spec.look)
        : spec.kind === 'spul' ? buildSpulMesh(spec.spul)
          : spec.kind === 'farm' ? farmBody(spec.farm)
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
  const mesh = buildVehicleMesh(previewVehicle(spec));
  // vangnet (beeld 24-11): een voertuig met een kapotte maat (NaN in de romp) tekenen we niet, want NaN in geometrie laat de verhaaltest falen;
  // de kaart houdt dan zijn icoon en het foutlog zegt welk model het was
  if (!meshIsFinite(mesh)) { meldKapotVoorbeeld(spec); disposeMesh(mesh); return null; }
  // spec.tune: de uiterlijk-tuning (vehiclelook.js); het voorbeeld laat de underglow altijd zien (alsof het nacht is)
  if (spec.tune) tickVehicleLook(mesh, 0, 1);
  const live = spec.tune ? mesh : null;
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  if (!box.isEmpty()) mesh.add(groundShadow(box));
  if (!sphereFit) return { mesh, body: null, fit: null, live };
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  // turn about the model's own middle (a bus with its trailer is built from its front axle)
  const pivot = new THREE.Group();
  mesh.position.set(-sphere.center.x, 0, -sphere.center.z);
  pivot.add(mesh);
  return { mesh: pivot, body: null, fit: { c: new THREE.Vector3(0, sphere.center.y, 0), r: Math.max(0.3, sphere.radius * 0.78) }, live };
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
    turnPreview(p.mesh, p.angle);
    if (p.live) tickVehicleLook(p.live, now / 1000, 1, true); // de lucht van een snackwagen drijft
    if (p.spec.kind === 'person' || p.spec.kind === 'piecefig') animatePersonWalk(p.body, 0, dt);
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
    p.live = o.live || null;
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
let glRetryAt = 0;
// een mislukte context is niet voorgoed (#435: voorbeelden 'weg'): na een korte pauze proberen we het opnieuw, zodat
// een tijdelijke fout (te veel contexten, een herstart van de GPU) de voorbeelden niet de rest van de sessie weglaat
const GL_RETRY_MS = 2000;

function sharedGl() {
  if (gl) return gl;
  if (glFailed && performance.now() < glRetryAt) return null;
  try {
    const canvas = document.createElement('canvas');
    watchContext(canvas, 'voorbeelden');
    // verloren context (#435): de gedeelde renderer valt weg en wordt bij de volgende vraag opnieuw gemaakt;
    // plaatjes die leeg of zwart uitvielen worden dan ook opnieuw getekend
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (gl && gl.canvas === canvas) { gl = null; forgetBlankShots(); } });
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    gl = { renderer, canvas, ...setupScene() };
    glFailed = false;
  } catch (err) {
    glFailed = true;
    glRetryAt = performance.now() + GL_RETRY_MS;
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
// speed: radians per second of the turn; fps: a cap on the frames drawn (the
// garage cards turn at 30). onFirstFrame: called once, when the first frame of
// a shown model has been drawn (the garage hides its fallback picture then).
export function createSharedPreview(canvas, { interactive = false, active = () => true, pixelRatio = () => Math.min(1.5, devicePixelRatio), angle = 0.6, speed = 0.75, fps = 0, zoom = 1, onFirstFrame = null } = {}) {
  const p = { mesh: null, body: null, fit: null, key: '', raf: 0, angle, zoom, drag: null, idleAt: 0, spec: null, dead: false, last: 0, drawn: 0, onFirstFrame, ctx: canvas.getContext('2d') };
  const minGap = fps ? 1000 / fps - 3 : 0;

  function tick() {
    if (p.dead || !p.mesh || !active()) { p.raf = 0; return; }
    if (minGap && performance.now() - p.drawn < minGap) { p.raf = requestAnimationFrame(tick); return; }
    const pr = pixelRatio();
    const w = Math.round(canvas.clientWidth * pr), h = Math.round(canvas.clientHeight * pr);
    if (!w || !h) { p.raf = requestAnimationFrame(tick); return; }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const now = performance.now();
    const dt = Math.min(0.1, (now - (p.last || now)) / 1000);
    p.last = now;
    p.drawn = now;
    if (!p.drag && now > p.idleAt) p.angle += dt * speed;
    turnPreview(p.mesh, p.angle);
    if (p.spec.kind === 'person' || p.spec.kind === 'piecefig') animatePersonWalk(p.body, 0, dt);
    const src = renderShared(p.mesh, p.spec, p.fit, w, h, p.zoom);
    p.ctx.clearRect(0, 0, w, h);
    if (src) {
      p.ctx.drawImage(src, 0, 0);
      if (p.onFirstFrame) { const cb = p.onFirstFrame; p.onFirstFrame = null; cb(); }
    }
    p.raf = requestAnimationFrame(tick);
  }

  function show(spec) {
    const key = spec ? JSON.stringify(spec) : '';
    if (key === p.key && (p.raf || !spec)) { if (spec) p.onFirstFrame = onFirstFrame; return; }
    p.key = key;
    p.onFirstFrame = onFirstFrame;
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
    // back to the front view and the starting zoom (Spullen viewer, #1086)
    reset() { p.angle = angle; p.zoom = zoom; p.idleAt = performance.now() + 2500; },
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
const SHOTS_MAX = 200; // review 22-11 N5: de garagekaarten en portretten bleven de hele sessie als data-URL staan; de oudste gaan eruit (een volgende vraag tekent opnieuw)
function rememberShot(key, url) {
  shots.delete(key);
  shots.set(key, url);
  while (shots.size > SHOTS_MAX) shots.delete(shots.keys().next().value);
}
const shotGroups = new Map(); // group -> keys asked for with that group (releaseSnapshots)
// a still that came out empty (no WebGL at that moment) is not kept: the next ask draws it again
function forgetBlankShots() { for (const [k, v] of shots) if (!v) shots.delete(k); }
const queue = [];
let pumping = false;
const SHOT_BUDGET_MS = 6;

function shoot(spec, w, h, angle, zoom = 1) {
  if (!sharedGl()) return '';
  const o = buildObject(spec, true);
  if (!o) return '';
  turnPreview(o.mesh, angle);
  const src = renderShared(o.mesh, spec, o.fit, w, h, zoom);
  // read back in the same task as the render (no preserveDrawingBuffer)
  const url = src ? src.toDataURL('image/png') : '';
  disposeMesh(o.mesh);
  return url;
}

// Snapshots asked for with { keep: true } (the HUD portraits) are also kept
// in localStorage for this game version, so a new session shows them
// without a render (one shot costs 10 to 50 ms on a slow CPU). A model
// change ships with a new version; source runs ('dev') keep nothing.
const KEEP_KEY = KEYS.snapshots;
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

// Shots render in idle time between frames, not inside one: the first shot
// also creates the shared renderer and compiles its shaders (33-55 ms on a
// slow CPU). A shot waits for an idle period long enough to hold it, or for
// the timeout when the game never leaves one.
const IDLE_TIMEOUT_MS = 500;
const MIN_IDLE_MS = 8;
function idle(fn) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(() => fn(null), 16);
}

function pump(deadline) {
  const t0 = performance.now();
  let n = 0;
  while (queue.length) {
    const left = deadline && !deadline.didTimeout ? deadline.timeRemaining() : Infinity;
    if (n ? performance.now() - t0 >= SHOT_BUDGET_MS || left < MIN_IDLE_MS : left < MIN_IDLE_MS) break;
    const job = queue.shift();
    if (!shots.has(job.key)) {
      let url;
      try { url = shoot(job.spec, job.w, job.h, job.angle, job.zoom); } catch (e) { url = ''; } // review 22-11 N4: een foute spec mag de rij niet voorgoed laten vastlopen
      // een leeg plaatje nooit bewaren: de volgende vraag tekent het opnieuw (na een herstelde context)
      if (url) rememberShot(job.key, url);
      if (job.keep && url) keepShot(job.key, url);
    }
    for (const cb of job.cbs) cb(shots.has(job.key) ? shots.get(job.key) : '');
    n++;
  }
  if (queue.length) idle(pump);
  else pumping = false;
}

// A still image (data URL, '' when WebGL is unavailable) of `spec` at w x h
// pixels, cached for the session. Rendered in idle time (see pump): `cb` gets the URL
// (right away when cached); the return value is the cached URL or null.
// keep: also across sessions (see keepShot).
export function renderSnapshot(spec, w, h, cb = null, { angle = 0.6, keep = false, group = '', zoom = 1, prio = false } = {}) {
  if (!spec) return null;
  const key = `${w}x${h}@${angle}${zoom === 1 ? '' : 'z' + zoom}|${JSON.stringify(spec)}`;
  if (group) { let g = shotGroups.get(group); if (!g) shotGroups.set(group, g = new Set()); g.add(key); }
  if (!shots.has(key) && keep && keptShots().shots[key]) rememberShot(key, keptShots().shots[key]);
  if (shots.has(key)) { if (cb) cb(shots.get(key)); return shots.get(key); }
  const job = queue.find((j) => j.key === key);
  if (job) {
    if (cb) job.cbs.push(cb);
    job.keep = job.keep || keep;
    if (prio) { queue.splice(queue.indexOf(job), 1); queue.unshift(job); } // prio: wat nu in beeld staat komt vooraan (de garagelijst, #999)
    return null;
  }
  const nieuw = { key, spec, w, h, angle, zoom, keep, group, cbs: cb ? [cb] : [] };
  if (prio) queue.unshift(nieuw); else queue.push(nieuw);
  if (!pumping) { pumping = true; idle(pump); }
  return null;
}

// Drops the snapshots of `group` that are still waiting (the garage closed
// before its cards were all drawn); finished ones stay cached.
// Gives the finished stills of `group` back (the Spullen gallery closed): their keys leave the cache, so a closed menu holds no
// pictures. A key another group also asked for is drawn again on its next ask: one shot, never a GL context.
export function releaseSnapshots(group) {
  const g = shotGroups.get(group);
  if (!g) return 0;
  let n = 0;
  for (const key of g) if (shots.delete(key)) n++;
  shotGroups.delete(group);
  return n;
}

export function cancelSnapshots(group) {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].group === group) queue.splice(i, 1);
}
