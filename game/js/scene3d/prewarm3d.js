// Licht-variant-warmup: elk lit materiaal heeft twee programmavarianten (met en zonder
// het nachtlichtrig); hier staan de stand-ins en de scan die ze vooraf compileren.
// Afgesplitst uit scene3d.js (#497), zonder inhoudelijke wijziging: dezelfde namen,
// dezelfde volgorde, dezelfde commentaren.
//
// De naad naar scene3d.js loopt via bindPrewarmHost() in plaats van een import terug
// (zoals routeribbon3d.js): scene, renderer, camera, postfx en zon komen na init3D
// binnen, dus er is geen modulecyclus.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { isLightRigOn, setLightRigVisible } from '../nightlights3d.js';
import { perfOff } from '../devflags.js';

const host = { scene: null, renderer: null, cam: null, postfx: null, sun: null, gpuBusy: () => false, linked: null };
export function bindPrewarmHost(h) { Object.assign(host, h); }

// Every lit material has two program variants: with the night-light rig and
// without it (nightlights3d dark rig). Each material + mesh layout that shows
// up gets a stand-in on its own layer, compiled for the variant not in use.
// The scene is scanned a slice per frame, compiling goes through
// KHR_parallel_shader_compile (renderer.compile only starts the link), and
// once the programs are linked the stand-ins are drawn once into a 1x1
// scissor of the scene target so the GPU pipeline exists before the rig
// ever switches over. Nothing here blocks on the driver.
const PREWARM_LAYER = 31;
const PREWARM_SLICE = 120;
// once two passes over the scene have found nothing new for this rig variant only a few top-level groups are scanned per frame:
// the full-speed pass walked every node of the scene every ~3 frames (~0.9 ms per frame)
const PREWARM_SLICE_QUIET = 12;
let prewarmFound = 0, prewarmQuiet = 0, prewarmLastVariant = null;
const PREWARM_WAIT_MS = 20000;
const PREWARM_POLL_MS = 250;
// perf-r3 (24-11): hoogstens zoveel stand-ins per batch (was 64): een batch van 44 nieuwe programma's in één beeld liet het
// GPU-proces seconden vastlopen; samen met de compiledosering van scene3d.js (COMPILES_PER_FRAME)
const PREWARM_BATCH_BOOT = 64;
const prewarmBatchSize = () => (perfOff('compiledosis') || (typeof document !== 'undefined' && !!document.getElementById('load-screen')) ? PREWARM_BATCH_BOOT : 8); // achter het laadscherm (#load-screen) de oude 64 (de boot wacht erop), daarna 8
const prewarmed = { true: new Set(), false: new Set() };
const prewarmRoot = new THREE.Group();
const prewarmQueue = [];
let prewarmCursor = 0;
let prewarmBatch = null;
let prewarmCam = null;

function prewarmKind(o) {
  const g = o.geometry;
  let k = g.userData._pwKind;
  if (k === undefined) {
    k = Object.keys(g.attributes).join(',') + (g.morphAttributes.position ? 'M' : '');
    g.userData._pwKind = k;
  }
  return (o.isInstancedMesh ? 'i' : o.isSkinnedMesh ? 'k' : o.isBatchedMesh ? 'b' : o.isSprite ? 's' : o.isPoints ? 'p' : o.isLineSegments ? 'ls' : o.isLine ? 'l' : 'm')
    + (o.instanceColor ? 'c' : '') + k;
}

// A stand-in draws its source's own geometry and material. Once either is
// disposed (a despawned car, a finished spark) the stand-in is dropped:
// drawing it would upload them again with nothing left to free them.
const prewarmDisposed = new WeakSet();
const prewarmWatched = new WeakSet();
function onPrewarmSourceDispose(e) { prewarmDisposed.add(e.target); }
function watchPrewarmSource(res) {
  if (!res) return;
  prewarmDisposed.delete(res);
  if (prewarmWatched.has(res)) return;
  prewarmWatched.add(res);
  res.addEventListener('dispose', onPrewarmSourceDispose);
}
const prewarmProxyDead = (p) => prewarmDisposed.has(p.geometry) || prewarmDisposed.has(p.material);

function makePrewarmProxy(o, m) {
  const g = o.geometry;
  if (!o.isSprite) watchPrewarmSource(g);
  if (!m.userData.shared) watchPrewarmSource(m);
  const proxy = o.isInstancedMesh ? new THREE.InstancedMesh(g, m, 1)
    : o.isSkinnedMesh ? new THREE.SkinnedMesh(g, m)
      : o.isSprite ? new THREE.Sprite(m)
        : o.isPoints ? new THREE.Points(g, m)
          : o.isLineSegments ? new THREE.LineSegments(g, m)
            : o.isLine ? new THREE.Line(g, m)
              : new THREE.Mesh(g, m);
  // a pool (multidraw3d.js): the program has the batching define; one degenerate range so that the draw is made at all
  if (o.isBatchedMesh) {
    proxy.isBatchedMesh = true;
    proxy._matricesTexture = o._matricesTexture;
    proxy._multiDrawStarts = new Int32Array(1);
    proxy._multiDrawCounts = new Int32Array([3]);
    proxy._multiDrawCount = 1;
  }
  // its own colour buffer: disposing the stand-in frees its instance buffers,
  // and a shared one would leave the real mesh drawing from a deleted buffer
  // (black grass tufts, shrubs and hedges)
  if (o.instanceColor) proxy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
  // own skeleton (and instance buffer): freed after the draw, drawPrewarmBatch
  if (o.isSkinnedMesh) proxy.bind(o.skeleton.clone(), o.bindMatrix);
  // shadow receiving is part of the program key
  proxy.receiveShadow = o.receiveShadow;
  proxy.frustumCulled = false;
  proxy.layers.set(PREWARM_LAYER);
  return proxy;
}

// Queues stand-ins for every material/layout under `root` not yet warmed
// for the rig variant `variant`. Hidden objects (effects that only show up
// later, the moon and stars by day) are warmed for the current variant too,
// since their first appearance would otherwise compile in-frame. A tag per
// object and variant skips objects already seen with the same material.
export function scanForPrewarm(root, variant, hidden = false) {
  hidden = hidden || !root.visible;
  queuePrewarm(root, variant);
  if (hidden) queuePrewarm(root, !variant);
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) scanForPrewarm(kids[i], variant, hidden);
}

function queuePrewarm(o, variant) {
  if (o.isLight) { o.layers.enable(PREWARM_LAYER); return; }
  const tag = variant ? '_pwOn' : '_pwOff';
  const cast = !!o.castShadow;
  if (!o.material || (o[tag] === o.material && o[tag + 'S'] === cast) || !(o.isMesh || o.isPoints || o.isLine || o.isSprite) || (o.isSkinnedMesh && !o.skeleton)) return;
  o[tag] = o.material;
  o[tag + 'S'] = cast;
  const done = prewarmed[variant];
  const kind = prewarmKind(o);
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
    if (!m) continue;
    const key = m.id + '.' + m.version + '|' + kind + (o.receiveShadow ? 'r' : '');
    if (!done.has(key)) {
      done.add(key);
      prewarmQueue.push({ proxy: makePrewarmProxy(o, m), variant });
      prewarmFound++;
    }
    // no depth programs while the preset has shadows off ('laag'): compiling
    // them only competes with the ones that will be drawn
    if (o.castShadow && host.sun.castShadow && (!o.customDepthMaterial || o.userData.pool) && (o.isMesh || o.isLine || o.isPoints)) {
      const dm = o.userData.pool ? o.customDepthMaterial : shadowDepthStandIn(m);
      const dkey = 'D' + dm.id + '|' + kind + (o.receiveShadow ? 'r' : '');
      if (done.has(dkey)) continue;
      done.add(dkey);
      prewarmQueue.push({ proxy: makePrewarmProxy(o, dm), variant });
      prewarmFound++;
    }
  }
}

// The shadow pass draws casters with three's shared depth material, whose
// program also depends on the light counts - so the night rig switching on
// at dusk used to link every depth program in-frame. A stand-in with the
// same program parameters (as WebGLShadowMap.getDepthMaterial sets them for
// PCF shadows) lets the warm-up above compile them for both rig variants.
const _shadowSides = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
const shadowDepthMats = new Map();
function shadowDepthStandIn(m) {
  const side = m.shadowSide != null ? m.shadowSide : _shadowSides[m.side];
  const map = m.map || null;
  const k = side + '|' + (map ? map.id : 0) + '|' + (m.alphaMap ? m.alphaMap.id : 0) + '|' + (m.alphaTest > 0 ? 1 : 0)
    + '|' + (m.displacementMap && m.displacementScale !== 0 ? m.displacementMap.id : 0) + '|' + (m.wireframe ? 1 : 0);
  let d = shadowDepthMats.get(k);
  if (!d) {
    d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side, map, alphaMap: m.alphaMap || null, alphaTest: m.alphaTest, wireframe: !!m.wireframe });
    if (m.displacementMap && m.displacementScale !== 0) Object.assign(d, { displacementMap: m.displacementMap, displacementScale: m.displacementScale, displacementBias: m.displacementBias });
    d.userData.shared = true;
    shadowDepthMats.set(k, d);
  }
  return d;
}

export function toggleLightRig() { setLightRigVisible(!isLightRigOn()); }
export function withLightRig(on, fn) {
  const cur = isLightRigOn();
  setLightRigVisible(on);
  try { return fn(); } finally { setLightRigVisible(cur); }
}

function prewarmCamera() {
  if (!prewarmCam) prewarmCam = new THREE.PerspectiveCamera();
  prewarmCam.copy(host.cam, false);
  prewarmCam.layers.set(PREWARM_LAYER);
  return prewarmCam;
}

function startPrewarmBatch() {
  const variant = prewarmQueue[0].variant;
  const items = [];
  for (let i = 0; i < prewarmQueue.length && items.length < prewarmBatchSize();) {
    if (prewarmQueue[i].variant !== variant) { i++; continue; }
    const { proxy } = prewarmQueue.splice(i, 1)[0];
    if (!prewarmProxyDead(proxy)) items.push(proxy);
  }
  if (!items.length) return;
  for (const p of items) prewarmRoot.add(p);
  const camera = prewarmCamera();
  // program keys depend on the target (tone mapping / output colour space
  // are only applied to the screen), so compile for the scene target
  const prevTarget = host.renderer.getRenderTarget();
  host.renderer.setRenderTarget(host.postfx.sceneTarget);
  try {
    withLightRig(variant, () => host.renderer.compile(prewarmRoot, camera, host.scene));
  } finally {
    host.renderer.setRenderTarget(prevTarget);
  }
  const programs = new Set();
  for (const p of items) {
    const props = host.renderer.properties.get(p.material);
    if (props.programs) for (const pr of props.programs.values()) programs.add(pr);
  }
  prewarmBatch = { variant, programs, since: performance.now(), nextCheck: performance.now() + 2 * PREWARM_POLL_MS };
}

function drawPrewarmBatch() {
  const camera = prewarmCamera();
  const target = host.postfx.sceneTarget;
  const prevTarget = host.renderer.getRenderTarget();
  const autoShadow = host.renderer.shadowMap.autoUpdate;
  for (const p of [...prewarmRoot.children]) if (prewarmProxyDead(p)) prewarmRoot.remove(p);
  host.scene.add(prewarmRoot);
  host.renderer.shadowMap.autoUpdate = false;
  host.renderer.setRenderTarget(target);
  if (target) { target.scissor.set(0, 0, 1, 1); target.scissorTest = true; } else { host.renderer.setScissor(0, 0, 1, 1); host.renderer.setScissorTest(true); }
  try {
    withLightRig(prewarmBatch.variant, () => host.renderer.render(host.scene, camera));
  } finally {
    if (target) { target.scissorTest = false; target.scissor.set(0, 0, target.width, target.height); } else host.renderer.setScissorTest(false);
    host.renderer.setRenderTarget(prevTarget);
    host.renderer.shadowMap.autoUpdate = autoShadow;
    host.scene.remove(prewarmRoot);
    for (const p of prewarmRoot.children) {
      if (p.isSkinnedMesh) p.skeleton.dispose();
      else if (p.isInstancedMesh) p.dispose();
    }
    prewarmRoot.clear();
  }
}

export function prewarmLightVariants() {
  const variant = !isLightRigOn();
  if (variant !== prewarmLastVariant) { prewarmLastVariant = variant; prewarmQuiet = 0; }
  const kids = host.scene.children;
  for (let i = 0, n = Math.min(prewarmQuiet >= 2 ? PREWARM_SLICE_QUIET : PREWARM_SLICE, kids.length); i < n; i++) {
    if (prewarmCursor >= kids.length) { prewarmCursor = 0; prewarmQuiet = prewarmFound ? 0 : prewarmQuiet + 1; prewarmFound = 0; }
    const o = kids[prewarmCursor++];
    if (o !== prewarmRoot) scanForPrewarm(o, variant);
  }
  if (prewarmBatch) {
    // A completion query is a synchronous round trip to the GPU process that
    // waits out its backlog (later ones in the same task are cheap), so ask
    // only every PREWARM_POLL_MS; ready programs are dropped from the list.
    const now = performance.now();
    const B = prewarmBatch;
    if (now - B.since < PREWARM_WAIT_MS) {
      if (now < B.nextCheck) return;
      B.nextCheck = now + PREWARM_POLL_MS;
      // perf-r3 (24-11, profiel: isReady 133 ms in één beeld): de vraag is een synchrone rondgang naar het GPU-proces die zijn
      // achterstand afwacht. Niet vragen in een beeld waarin het spel net nieuwe programma's liet compileren (dan is die achterstand
      // het grootst) of terwijl de compilewachtrij nog loopt; en via de gedeelde, gedoseerde vraag van scene3d.js (programLinked,
      // COMPLETION_STATUS, hoogstens één rondgang per 25 ms voor alles).
      if (host.gpuBusy() && (B.skips = (B.skips || 0) + 1) <= 4) return; // hoogstens 4 keer (1 s) overslaan: de bootwacht hangt aan deze batch
      for (const p of B.programs) {
        if (!(host.linked ? host.linked(p) : p.isReady())) return;
        B.programs.delete(p);
      }
    }
    drawPrewarmBatch();
    prewarmBatch = null;
  }
  if (prewarmQueue.length) startPrewarmBatch(); // (niet wachten op gpuBusy: de bootwacht (prewarmQueued) liep dan nooit leeg)
}


// Wat er nog te warmen valt: een wachtrij of een lopende batch (voor prewarmBusy en de opruimstap in scene3d.js).
export const prewarmQueued = () => !!(prewarmQueue.length || prewarmBatch);
