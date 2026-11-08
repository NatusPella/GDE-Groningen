import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y } from './util.js';
import { COUNTRY_UNIFORMS } from './countryfield.js';
import { applyCutMask } from './cutmask3d.js';

// The ground shader's view of the province's water. The tiles' water polygons
// (the map's water grid, the one source for boats, swimmers and the surface
// meshes) are rasterised into a mask round the player: within it the ground
// opens over the water (uWaterNear) and paints the water's own tones where it
// is not opened yet. A muddy-dark bed under the opened ground hides the gaps.
// Past that window a second, coarser mask (FAR_CELL m a texel, ~4 km round the
// player) paints the water of every tile that is in, flat on the ground: the
// one water the ground shows at any distance.

export const MASK_N = 1024;
export const MASK_CELL = 2;
export const MASK_SIZE = MASK_N * MASK_CELL;
export const FAR_CELL = 8;
export const FAR_SIZE = MASK_N * FAR_CELL;
// the far mask is moved when the player is this far off its centre
const FAR_RECENTRE = 1200;
// the window is moved when the player is this far off its centre
const RECENTRE = 300;
// #756: na zoveel trage beelden achter elkaar forceert het masker toch een bake
// (een machine met een structurele dt boven 30 ms heeft nooit een rustig beeld)
const SLOW_FORCE_FRAMES = 3;
const BED_Y = WATER_Y - 0.55;

// Even-odd fill of one polygon into a Uint8Array mask (255 inside).
export function fillPolygon(mask, n, x0, y0, cell, pts) {
  let miny = Infinity, maxy = -Infinity;
  for (const p of pts) { if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
  const j0 = Math.max(0, Math.ceil((miny - y0) / cell - 0.5)), j1 = Math.min(n - 1, Math.floor((maxy - y0) / cell - 0.5));
  const xs = [];
  for (let j = j0; j <= j1; j++) {
    const y = y0 + (j + 0.5) * cell;
    xs.length = 0;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const ay = pts[b][1], by = pts[a][1];
      if ((ay > y) === (by > y)) continue;
      xs.push(pts[b][0] + ((pts[a][0] - pts[b][0]) * (y - ay)) / (by - ay));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - x0) / cell - 0.5)), i1 = Math.min(n - 1, Math.floor((xs[k + 1] - x0) / cell - 0.5));
      if (i1 >= i0) mask.fill(255, j * n + i0, j * n + i1 + 1);
    }
  }
}

// The mask of the water polygons round (cx, cy): { x0, y0, mask }.
export function rasterWater(polys, cx, cy, mask = new Uint8Array(MASK_N * MASK_N), cell = MASK_CELL) {
  const size = MASK_N * cell;
  const x0 = cx - size / 2, y0 = cy - size / 2;
  mask.fill(0);
  for (const w of polys) {
    const b = w.bounds;
    if (b && (b[2] < x0 || b[0] > x0 + size || b[3] < y0 || b[1] > y0 + size)) continue;
    fillPolygon(mask, MASK_N, x0, y0, cell, w.pts);
  }
  return { x0, y0, mask };
}

const S = { tex: null, bed: null, cx: 0, cy: 0, ver: -1, on: false, map: null, polys: 0, far: null, fcx: 0, fcy: 0, fver: -1, fat: -99, fpolys: 0,
  // #649: tellers voor de meting: herdraaiingen, overgeslagen (water buiten het
  // venster veranderde) en de tijd van de laatste rasterpas
  // #756: slowNear/slowFar tellen de trage beelden achter elkaar zonder bake
  bakes: 0, farBakes: 0, skipped: 0, deferred: 0, lastMs: 0, lastFarMs: 0, sig: 0, farSig: 0, slowNear: 0, slowFar: 0 };

// Een goedkope vingerafdruk van het water in een venster (#649): alleen als die
// verandert hoeft het masker opnieuw gerasterd te worden; een waterrij die
// ver buiten het venster in- of uitstroomt laat het masker met rust.
function windowWater(map, cx, cy, r) {
  const polys = map.waterNear(cx, cy, r);
  let sig = polys.length;
  for (const w of polys) {
    const b = w.bounds;
    if (!b) continue;
    sig = (sig * 31 + Math.round(b[0] * 8) + Math.round(b[1] * 16) + Math.round(b[2] * 32) + Math.round(b[3] * 64)) | 0;
  }
  return { polys, sig };
}

function init(scene) {
  const data = new Uint8Array(MASK_N * MASK_N);
  S.tex = new THREE.DataTexture(data, MASK_N, MASK_N, THREE.RedFormat, THREE.UnsignedByteType);
  S.tex.unpackAlignment = 1;
  S.tex.generateMipmaps = false;
  S.tex.minFilter = S.tex.magFilter = THREE.LinearFilter;
  S.tex.wrapS = S.tex.wrapT = THREE.ClampToEdgeWrapping;
  COUNTRY_UNIFORMS.uTileWater.value = S.tex;
  S.far = new THREE.DataTexture(new Uint8Array(MASK_N * MASK_N), MASK_N, MASK_N, THREE.RedFormat, THREE.UnsignedByteType);
  S.far.unpackAlignment = 1;
  S.far.generateMipmaps = false;
  S.far.minFilter = S.far.magFilter = THREE.LinearFilter;
  S.far.wrapS = S.far.wrapT = THREE.ClampToEdgeWrapping;
  COUNTRY_UNIFORMS.uTileWaterFar.value = S.far;
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), applyCutMask(new THREE.MeshBasicMaterial({ color: 0x1e2a2c }), null, true));
  bed.position.y = BED_Y;
  bed.renderOrder = 1;
  bed.visible = false;
  bed.matrixAutoUpdate = false;
  scene.add(bed);
  S.bed = bed;
}

function bake(cx, cy, polys) {
  const t0 = performance.now();
  const r = rasterWater(polys, cx, cy, S.tex.image.data);
  S.tex.needsUpdate = true;
  S.cx = cx; S.cy = cy;
  S.polys = polys.length;
  S.bakes++;
  S.lastMs = performance.now() - t0;
  COUNTRY_UNIFORMS.uTileWaterRect.value = [r.x0, r.y0, MASK_SIZE, 1];
}

// The wide mask: the water of every tile in, ~4 km round (cx, cy).
function bakeFar(cx, cy, polys) {
  const t0 = performance.now();
  const r = rasterWater(polys, cx, cy, S.far.image.data, FAR_CELL);
  S.far.needsUpdate = true;
  S.fcx = cx; S.fcy = cy;
  S.fpolys = polys.length;
  S.farBakes++;
  S.lastFarMs = performance.now() - t0;
  COUNTRY_UNIFORMS.uTileWaterFarRect.value = [r.x0, r.y0, FAR_SIZE, 1];
}

// Per frame: the mask round the player, where the ground opens over the
// water (radius 0 when the countryside is idle) and the bed under it.
export function updateTileWater(map, scene, px, py, radius, time, dt = 0) {
  if (!S.tex) init(scene);
  const u = COUNTRY_UNIFORMS.uWaterNear.value;
  const on = radius > 0 && !!map && !!map.waterNear;
  const r = on ? Math.min(radius, MASK_SIZE / 2 - RECENTRE - 20) : 0;
  u[0] = px; u[1] = py; u[2] = r; u[3] = time % 1000;
  S.bed.visible = on;
  if (!on) { COUNTRY_UNIFORMS.uTileWaterRect.value[3] = 0; COUNTRY_UNIFORMS.uTileWaterFarRect.value[3] = 0; S.ver = -1; S.fver = -1; return; }
  const ver = map._waterVer || 0;
  const moved = Math.abs(px - S.cx) > RECENTRE || Math.abs(py - S.cy) > RECENTRE;
  // Een traag vorig beeld (dt > 30 ms): de rasterpas van 5-25 ms niet bovenop een
  // hapering stapelen; de volgende rustige frame haalt hem in (#649).
  const calm = !(dt > 0.03);
  let baked = false;
  const nearForced = S.ver < 0 || moved;
  const staleNear = nearForced || ver !== S.ver;
  // #756: een machine die structureel boven 30 ms blijft (zuinig-stand, 30 fps)
  // heeft nooit een rustig beeld. Tel de trage beelden en forceer de bake dan
  // alsnog, met een eigen cadans van 0,5 s zodat de rasterpas niet elke frame
  // opnieuw op een hapering stapelt.
  if (calm) S.slowNear = 0;
  else if (staleNear) S.slowNear++;
  const forceNear = !calm && staleNear && S.slowNear >= SLOW_FORCE_FRAMES && time - (S.at || 0) > 0.5;
  if ((calm || forceNear) && staleNear) {
    const near = windowWater(map, px, py, MASK_SIZE * 0.75);
    if (nearForced || forceNear || near.sig !== S.sig) {
      if (nearForced || forceNear || time - (S.at || 0) > 1) { // cadans: hooguit 1x per seconde
        bake(px, py, near.polys);
        S.sig = near.sig;
        S.ver = ver;
        S.at = time;
        S.slowNear = 0;
        baked = true;
      }
    } else {
      // het water in het venster is niet veranderd: geen herdraai (#649)
      S.ver = ver;
      S.skipped++;
    }
  } else if (!calm && staleNear) S.deferred++;
  // Het verre masker: alleen als het water in dat venster echt veranderde, op
  // zijn eigen cadans, en nooit in hetzelfde beeld als het nabije masker.
  const farMoved = Math.abs(px - S.fcx) > FAR_RECENTRE || Math.abs(py - S.fcy) > FAR_RECENTRE;
  const farForced = S.fver < 0 || farMoved;
  const staleFar = farForced || ver !== S.fver;
  if (calm) S.slowFar = 0;
  else if (staleFar) S.slowFar++;
  const forceFar = !calm && staleFar && S.slowFar >= SLOW_FORCE_FRAMES && time - S.fat > 0.5;
  if (!baked && (calm || forceFar) && staleFar) {
    const far = windowWater(map, px, py, FAR_SIZE * 0.75);
    if (farForced || forceFar || far.sig !== S.farSig) {
      if (farForced || forceFar || time - S.fat > 4) {
        bakeFar(px, py, far.polys);
        S.farSig = far.sig;
        S.fver = ver;
        S.fat = time;
        S.slowFar = 0;
      }
    } else {
      S.fver = ver;
      S.skipped++;
    }
  } else if (!calm && staleFar) S.deferred++;
  S.bed.position.set(px, BED_Y, py);
  S.bed.scale.set(r * 2 + 40, 1, r * 2 + 40);
  S.bed.updateMatrix();
}

export function tileWaterStats() {
  return { polys: S.polys, window: S.tex ? MASK_SIZE : 0, farPolys: S.fpolys, farWindow: S.far ? FAR_SIZE : 0,
    bakes: S.bakes, farBakes: S.farBakes, skipped: S.skipped, deferred: S.deferred, lastMs: S.lastMs, lastFarMs: S.lastFarMs };
}
