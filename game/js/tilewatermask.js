import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y } from './util.js';
import { COUNTRY_UNIFORMS } from './countryfield.js';
import { applyCutMask } from './cutmask3d.js';
import { WATER_BUILDING_CUT } from './water3d.js';

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

// #865: masker met de voeten van gebouwen die in het water staan (werelddata-
// fout: de waterpolygoon ligt over de gebouwvoet). 1 m per texel, een venster
// van 512 m rond de speler; het water weggeknipt in het nabije watermasker en in
// de watermaterialen (water3d.js WATER_BUILDING_CUT). Alleen gebouwen waarvan
// minstens de helft van de voet in water ligt, zodat stadskades en woonboten
// ongemoeid blijven.
export const BUILDING_CUT_N = 512;
export const BUILDING_CUT_CELL = 1;
export const BUILDING_CUT_SIZE = BUILDING_CUT_N * BUILDING_CUT_CELL;
const BUILDING_CUT_RECENTRE = 120;
const BUILDING_CUT_WET = 0.5;
const BUILDING_CUT_SKIP = new Set(['houseboat', 'pier', 'mooring']);

// Even-odd fill of one polygon into a Uint8Array mask (255 inside).
export function fillPolygon(mask, n, x0, y0, cell, pts, value = 255) {
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
      if (i1 >= i0) mask.fill(value, j * n + i0, j * n + i1 + 1);
    }
  }
}

// Rond een net gevulde polygoon de cellen één cel opbllen (droge rand om de voet).
function growMask(mask, n, x0, y0, cell, pts, grow = 1) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of pts) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
  const i0 = Math.max(grow, Math.floor((minx - x0) / cell) - grow), i1 = Math.min(n - 1 - grow, Math.ceil((maxx - x0) / cell) + grow);
  const j0 = Math.max(grow, Math.floor((miny - y0) / cell) - grow), j1 = Math.min(n - 1 - grow, Math.ceil((maxy - y0) / cell) + grow);
  const add = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (!mask[j * n + i]) continue;
    for (let dj = -grow; dj <= grow; dj++) for (let di = -grow; di <= grow; di++) add.push((j + dj) * n + (i + di));
  }
  for (const k of add) mask[k] = 255;
}

function inRing(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}

// Aandeel van de gebouwvoet (hoeken, randmiddens en zwaartepunt) dat in water ligt.
function wetFraction(pts, waters) {
  const cand = [];
  for (const w of waters) { if (w.bounds) cand.push(w); }
  const test = (x, y) => {
    for (const w of cand) {
      const b = w.bounds;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (inRing(x, y, w.pts)) return true;
    }
    return false;
  };
  let wet = 0, tot = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    cx += pts[i][0]; cy += pts[i][1];
    tot++; if (test(a[0], a[1])) wet++;
    tot++; if (test((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) wet++;
  }
  cx /= pts.length; cy /= pts.length;
  tot++; if (test(cx, cy)) wet++;
  return wet / tot;
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
  bakes: 0, farBakes: 0, skipped: 0, deferred: 0, lastMs: 0, lastFarMs: 0, sig: 0, farSig: 0, slowNear: 0, slowFar: 0,
  // #865: gebouwvoeten-in-water (eigen 1 m-masker) en de rect van de nabije waterbake
  bd: null, bdTex: null, bdCuts: 0, bdCX: undefined, bdCY: undefined, bdX0: 0, bdY0: 0, nearX0: 0, nearY0: 0,
  bdWver: -1, bdBver: -1, bdAt: -99, bdBakes: 0, lastBdMs: 0 };

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
  // #865: het gebouwvoet-masker voor de watermaterialen (1 m per texel).
  S.bd = new Uint8Array(BUILDING_CUT_N * BUILDING_CUT_N);
  S.bdTex = new THREE.DataTexture(S.bd, BUILDING_CUT_N, BUILDING_CUT_N, THREE.RedFormat, THREE.UnsignedByteType);
  S.bdTex.unpackAlignment = 1;
  S.bdTex.generateMipmaps = false;
  S.bdTex.minFilter = S.bdTex.magFilter = THREE.LinearFilter;
  S.bdTex.wrapS = S.bdTex.wrapT = THREE.ClampToEdgeWrapping;
  S.bdTex.needsUpdate = true;
  WATER_BUILDING_CUT.uMask.value = S.bdTex;
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
  S.nearX0 = r.x0; S.nearY0 = r.y0;
  S.polys = polys.length;
  S.bakes++;
  S.lastMs = performance.now() - t0;
  COUNTRY_UNIFORMS.uTileWaterRect.value = [r.x0, r.y0, MASK_SIZE, 1];
  if (S.bdCuts > 0) cutNearMaskFromBuildings();
}

// #865: knip de watercellen onder de gebouwvoeten uit het zojuist gerasterde
// nabije watermasker, zodat de grond daar dicht blijft (geen water op het erf).
function cutNearMaskFromBuildings() {
  if (!S.bd || !S.tex || !S.bdCuts) return;
  const nd = S.tex.image.data;
  const x0 = S.nearX0, y0 = S.nearY0;
  for (let j = 0; j < BUILDING_CUT_N; j++) {
    for (let i = 0; i < BUILDING_CUT_N; i++) {
      if (!S.bd[j * BUILDING_CUT_N + i]) continue;
      const wx = S.bdX0 + (i + 0.5) * BUILDING_CUT_CELL, wy = S.bdY0 + (j + 0.5) * BUILDING_CUT_CELL;
      const ni = Math.round((wx - x0) / MASK_CELL - 0.5), nj = Math.round((wy - y0) / MASK_CELL - 0.5);
      if (ni < 0 || nj < 0 || ni >= MASK_N || nj >= MASK_N) continue;
      nd[nj * MASK_N + ni] = 0;
    }
  }
  S.tex.needsUpdate = true;
}

// #865: zoek rond de speler gebouwen waarvan de voet in water ligt en bak hun
// voeten in het masker (voor het wateroppervlak) en knip ze uit het nabije
// watermasker (voor de grond). Water wegknippen op de voet + 1 m, zodat een huis
// in de Woldmeer geen water door de gevel of over het erf krijgt.
export function bakeBuildingCuts(map, px, py, time = 0) {
  if (!map || !S.bd || typeof map.buildingsNear !== 'function') return 0;
  const t0 = performance.now();
  const half = BUILDING_CUT_SIZE / 2;
  const x0 = px - half, y0 = py - half;
  S.bd.fill(0);
  S.bdCuts = 0;
  S.bdCX = px; S.bdCY = py; S.bdX0 = x0; S.bdY0 = y0;
  S.bdWver = map._waterVer || 0;
  S.bdBver = map._buildingVer || 0;
  S.bdAt = time;
  S.bdBakes++;
  const list = map.buildingsNear(px, py, half - 8) || [];
  if (!list.length) { S.bdTex.needsUpdate = true; WATER_BUILDING_CUT.uRect.value.set(x0, y0, 1 / BUILDING_CUT_SIZE, 0); S.lastBdMs = performance.now() - t0; return 0; }
  const waters = (map.waterNear ? map.waterNear(px, py, half) : []) || [];
  // Goedkope voorzeef: alleen gebouwen waarvan het zwaartepunt binnen de bounds
  // van een waterrij ligt, hoeven de volledige voetproef te ondergaan. Scheelt op
  // een drukke stad veel werk bij het hercontrole­ren tijdens het streamen.
  const nearWaterBox = (b) => {
    const P = b.pts;
    let cx = 0, cy = 0;
    for (const q of P) { cx += q[0]; cy += q[1]; }
    cx /= P.length; cy /= P.length;
    for (const w of waters) { const bb = w.bounds; if (bb && cx >= bb[0] && cx <= bb[2] && cy >= bb[1] && cy <= bb[3]) return true; }
    return false;
  };
  for (const b of list) {
    const P = b.pts;
    if (!P || P.length < 3) continue;
    if (BUILDING_CUT_SKIP.has(b.type)) continue;
    if (!nearWaterBox(b)) continue;
    if (wetFraction(P, waters) < BUILDING_CUT_WET) continue;
    fillPolygon(S.bd, BUILDING_CUT_N, x0, y0, BUILDING_CUT_CELL, P);
    growMask(S.bd, BUILDING_CUT_N, x0, y0, BUILDING_CUT_CELL, P, 1);
    S.bdCuts++;
  }
  S.bdTex.needsUpdate = true;
  WATER_BUILDING_CUT.uRect.value.set(x0, y0, 1 / BUILDING_CUT_SIZE, 0);
  if (S.bdCuts > 0 && S.tex) cutNearMaskFromBuildings();
  S.lastBdMs = performance.now() - t0;
  return S.bdCuts;
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
  // #865: de gebouwvoeten in het water (eigen 1 m-masker, apart venster).
  // R2: ook opnieuw bepalen als water of gebouwen later binnenstromen. De
  // zeewaterrijen van seatiles.js komen pas ná de eerste aankomst bij de kust in
  // het raster (addWaterPatches verhoogt _waterVer) en de gebouwgrid vult zich per
  // tegel (_buildingVer). Zonder deze hercontrole bleef de flat in de Eemshaven
  // buiten de selectie: het eerste masker zag nog geen zeewater onder de voet.
  const bdMoved = S.bdCX === undefined || Math.abs(px - S.bdCX) > BUILDING_CUT_RECENTRE || Math.abs(py - S.bdCY) > BUILDING_CUT_RECENTRE;
  const bdStale = ver !== S.bdWver || (map._buildingVer || 0) !== S.bdBver;
  if (bdMoved || (bdStale && time - (S.bdAt || 0) > 1)) {
    bakeBuildingCuts(map, px, py, time);
  } else if (baked && S.bdCuts > 0) cutNearMaskFromBuildings();
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
    bakes: S.bakes, farBakes: S.farBakes, skipped: S.skipped, deferred: S.deferred, lastMs: S.lastMs, lastFarMs: S.lastFarMs,
    buildingCuts: S.bdCuts, bdBakes: S.bdBakes, lastBdMs: S.lastBdMs, bdWindow: S.bd ? BUILDING_CUT_SIZE : 0 };
}

