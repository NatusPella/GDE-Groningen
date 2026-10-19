// A still of a place in Grunn for the Overzicht hero: the main scene drawn
// once from a fixed camera above the place into a small target, tone mapped
// like the post chain's last pass and cached per place (in memory and in localStorage). Only rendered
// when the menu asks for it, and only for a place inside the streamed area
// around the player (further away the city is not loaded); otherwise the
// cached still or null, and the caller shows its icon tile.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { getRenderer, getScene, getCamera } from './scene3d.js';
import { KEYS } from './storagekeys.js';

const SHOT_W = 300;
const SHOT_H = 170;
const SCALE = 2;
const NEAR_M = 110;
const BACK_M = 46;
const UP_M = 24;
const STORE_KEY = KEYS.placeshots;
const KEEP = 12;

let shots = null;
let target = null;
let ldr = null;
let quad = null;
let shotCam = null;
const pending = new Map();

function load() {
  if (shots) return shots;
  shots = new Map();
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (Array.isArray(d)) for (const [k, url] of d) if (typeof k === 'string' && typeof url === 'string') shots.set(k, url);
  } catch (e) { /* ignore */ }
  return shots;
}

function store() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...shots].slice(-KEEP))); } catch (e) { /* ignore */ }
}

const placeKey = (key, x, y, night) => `${key}@${Math.round(x / 10)},${Math.round(y / 10)}${night ? ':n' : ''}`;

// ACES + sRGB, as the post chain's output pass (postfx3d.js)
const OUTPUT = {
  uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
#include <tonemapping_pars_fragment>
void main() {
  vec3 c = ACESFilmicToneMapping(texture2D(tDiffuse, vUv).rgb);
  gl_FragColor = vec4(clamp(sRGBTransferOETF(vec4(c, 1.0)).rgb, 0.0, 1.0), 1.0);
}`,
};

function shoot(world, x, y) {
  const renderer = getRenderer(), scene = getScene(), cam = getCamera();
  const fx = window.__scene3d && window.__scene3d.postfx;
  // straight-to-canvas preset: materials are built for the screen, a target
  // would compile them all again; keep the icon tile there
  if (!renderer || !scene || !cam || !fx || !fx.sceneTarget) return null;
  const w = SHOT_W * SCALE, h = SHOT_H * SCALE;
  if (!target) {
    target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    ldr = new THREE.WebGLRenderTarget(w, h);
    const mat = new THREE.ShaderMaterial(OUTPUT);
    mat.toneMapped = false;
    quad = new FullScreenQuad(mat);
  }
  if (!shotCam) shotCam = new THREE.PerspectiveCamera(46, SHOT_W / SHOT_H, 0.5, 900);
  const p = world.player;
  // look at the place from the player's side, where the city is streamed in
  let dx = p.x - x, dy = p.y - y;
  const d = Math.hypot(dx, dy);
  if (d < 1) { dx = 1; dy = 0.4; } else { dx /= d; dy /= d; }
  shotCam.position.set(x + dx * BACK_M, UP_M, y + dy * BACK_M);
  shotCam.lookAt(x, 3, y);
  shotCam.layers.mask = cam.layers.mask;
  shotCam.updateMatrixWorld();
  const prevTarget = renderer.getRenderTarget();
  const autoShadow = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  let px;
  try {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, shotCam);
    quad.material.uniforms.tDiffuse.value = target.texture;
    quad.material.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    renderer.setRenderTarget(ldr);
    quad.render(renderer);
    px = new Uint8ClampedArray(w * h * 4);
    renderer.readRenderTargetPixels(ldr, 0, 0, w, h, px);
  } catch (e) {
    px = null;
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.autoUpdate = autoShadow;
  }
  if (!px) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const c2 = canvas.getContext('2d');
  const img = c2.createImageData(w, h);
  // the target's rows run bottom-up
  for (let row = 0; row < h; row++) img.data.set(px.subarray((h - 1 - row) * w * 4, (h - row) * w * 4), row * w * 4);
  c2.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = SHOT_W; out.height = SHOT_H;
  out.getContext('2d').drawImage(canvas, 0, 0, SHOT_W, SHOT_H);
  return out.toDataURL('image/jpeg', 0.82);
}

// The cached still of `key` at (x, y), or null. When there is none and the
// place is near enough, it is rendered shortly after and `cb(url)`
// gets it (the menu is open then, the game does not run).
export function placeShot(world, key, x, y, cb) {
  if (!world || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const night = !!(world.dayNight && world.dayNight.night > 0.5);
  const k = placeKey(key, x, y, night);
  const cache = load();
  if (cache.has(k)) return cache.get(k);
  if (Math.hypot(world.player.x - x, world.player.y - y) > NEAR_M) return null;
  if (pending.has(k)) { pending.get(k).push(cb); return null; }
  pending.set(k, [cb]);
  // two frames later, so the menu itself is on screen first
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const cbs = pending.get(k) || [];
    pending.delete(k);
    // never during play: the menu may have closed in the meantime
    if (!world.paused) return;
    let url = null;
    try { url = shoot(world, x, y); } catch (e) { url = null; }
    if (!url) return;
    cache.delete(k);
    cache.set(k, url);
    while (cache.size > KEEP) cache.delete(cache.keys().next().value);
    store();
    for (const f of cbs) if (f) f(url);
  }));
  return null;
}
