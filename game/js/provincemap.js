// The province's base map on the full map (mapview.js): the pre-rendered
// pyramid of scripts/world/province_map.mjs (z0 160 m a pixel ... z3 20 m),
// loaded tile by tile as the view needs it. Where a level's image is not in
// yet, a coarser one that is stands in; a load asks the caller to redraw.

import { herkleurRaster, piramideVan, KAART_PALET_VERSIE } from './kaartkleuren.js';

let M = null;
let base = 'world/';
const IMGS_MAX = 256; // #1074: ruim boven wat een scherm toont (ca. 60 bladen), daaronder valt het langst ongebruikte weg
const imgs = new Map(); // 'z-tx_ty' -> HTMLImageElement (loading) or, once in, the image or its recoloured canvas
const listeners = new Set();
let queued = false;
// fn() after images came in (once a frame at most): the map redraws its tiles
export function onProvinceMapLoad(fn) { listeners.add(fn); }
function loaded() {
  if (queued) return;
  queued = true;
  const run = () => { queued = false; for (const fn of listeners) fn(); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else setTimeout(run, 16);
}

// meta: index-provincie.json global.map ({ x0, y0, tile, dir, levels }); null = off
export function setProvinceMap(meta, { root = 'world/' } = {}) {
  M = meta && meta.levels && meta.levels.length ? { ...meta, have: meta.levels.map((L) => new Set(L.tiles)) } : null;
  base = root;
  imgs.clear();
}
export const provinceMapOn = () => !!M;

// A pyramid baked before the screen-print palette (21-11) has no meta.palet: its pixels are recoloured once, when a tile comes in
// (kaartkleuren.js herkleurRaster), so the world need not be rebuilt. A rebuilt pyramid carries KAART_PALET_VERSIE and is drawn as is.
export const provinceMapNeedsRecolour = () => !!M && M.palet !== KAART_PALET_VERSIE;
function recoloured(im) {
  if (!provinceMapNeedsRecolour() || typeof document === 'undefined') return im;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    herkleurRaster(d.data, piramideVan(M.palet));
    g.putImageData(d, 0, 0);
    return c;
  } catch (e) { return im; } // no pixel access: the old colours stay rather than no map
}

// The world box the base map covers, or null.
export function provinceMapBounds() {
  if (!M) return null;
  const L = M.levels[M.levels.length - 1];
  return [M.x0, M.y0, M.x0 + L.w * L.m, M.y0 + L.h * L.m];
}

// The level for a scale: the coarsest whose pixel is no bigger than 1.5
// screen pixels (pxPerM: screen pixels a metre), else the finest.
export function levelFor(pxPerM) {
  if (!M) return -1;
  for (let k = 0; k < M.levels.length; k++) if (M.levels[k].m * pxPerM <= 1.5) return k;
  return M.levels.length - 1;
}

function image(k, key) {
  const id = `${M.levels[k].z}-${key}`;
  let im = imgs.get(id);
  if (im) {
    // #1074: LRU, het laatst gebruikte blad achteraan
    imgs.delete(id); imgs.set(id, im);
    return im.tagName === 'CANVAS' || (im.complete && im.naturalWidth) ? im : null;
  }
  if (typeof Image === 'undefined') return null;
  im = new Image();
  im.decoding = 'async';
  im.onload = () => { imgs.set(id, recoloured(im)); loaded(); };
  im.src = `${base}${M.dir}z${M.levels[k].z}-${key}.png`;
  imgs.set(id, im);
  while (imgs.size > IMGS_MAX) imgs.delete(imgs.keys().next().value);
  return null;
}

// #1191: which coarser tile stands in for each loading tile of level `want`: the finest level below it whose tile
// there is in (inLevel(k, key)), clipped to the loading tiles it covers. A level without a tile on that spot has
// nothing to show there, so the search goes on to a coarser one. Pure (the level spans come from M), for the test.
// pending: [[x, y, span], ...] in world metres. Returns [{ k, tx, ty, rects }].
export function fallbackPlan(want, pending, inLevel) {
  if (!M || !pending.length) return [];
  const plan = new Map();
  for (const r of pending) {
    const cx = r[0] + r[2] / 2, cy = r[1] + r[2] / 2;
    for (let k = want - 1; k >= 0; k--) {
      const span = M.tile * M.levels[k].m;
      const tx = Math.floor((cx - M.x0) / span), ty = Math.floor((cy - M.y0) / span);
      const key = `${tx}_${ty}`;
      if (!M.have[k].has(key) || !inLevel(k, key)) continue;
      const id = `${k}-${key}`;
      let p = plan.get(id);
      if (!p) plan.set(id, (p = { k, tx, ty, rects: [] }));
      p.rects.push(r);
      break;
    }
  }
  return [...plan.values()];
}

// Start loading every level coarser than the finest (#1191), so a tile that is still coming in has a near stand-in
// instead of the 160 m mosaic. A few small images; the map asks for it when it opens.
export function preloadProvinceMap() {
  if (!M) return;
  for (let k = 0; k < M.levels.length - 1; k++) for (const key of M.have[k]) image(k, key);
}

// Draw the base map over the world window [x0, x1] x [y0, y1] into a
// world-transformed context.
export function drawProvinceBase(ctx, x0, y0, x1, y1, pxPerM) {
  if (!M) return;
  const want = levelFor(pxPerM);
  const draw = (k) => {
    const L = M.levels[k], span = M.tile * L.m;
    const tx0 = Math.max(0, Math.floor((x0 - M.x0) / span)), ty0 = Math.max(0, Math.floor((y0 - M.y0) / span));
    const tx1 = Math.floor((x1 - M.x0) / span), ty1 = Math.floor((y1 - M.y0) / span);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${tx}_${ty}`;
        if (!M.have[k].has(key)) continue;
        const im = image(k, key);
        if (im) ctx.drawImage(im, M.x0 + tx * span, M.y0 + ty * span, (im.naturalWidth || im.width) * L.m, (im.naturalHeight || im.height) * L.m);
      }
    }
  };
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  // a coarser level first where the wanted one is still loading
  const pending = [];
  {
    const L = M.levels[want], span = M.tile * L.m;
    for (let ty = Math.max(0, Math.floor((y0 - M.y0) / span)); ty <= Math.floor((y1 - M.y0) / span); ty++) {
      for (let tx = Math.max(0, Math.floor((x0 - M.x0) / span)); tx <= Math.floor((x1 - M.x0) / span); tx++) {
        const key = `${tx}_${ty}`;
        if (M.have[want].has(key) && !image(want, key)) pending.push([tx * span + M.x0, ty * span + M.y0, span]);
      }
    }
  }
  // #1191: per loading tile only the finest coarser level that is in, and only inside that tile. Before, every
  // coarser level was drawn over the whole window, the coarsest (160 m a pixel) last and on top: a coarse mosaic
  // with hard square edges over the finer stand-in and over tiles that were already in.
  for (const { k, tx, ty, rects } of fallbackPlan(want, pending, (k, key) => !!image(k, key))) {
    const L = M.levels[k], span = M.tile * L.m;
    const im = image(k, `${tx}_${ty}`);
    if (!im) continue;
    ctx.save();
    ctx.beginPath();
    for (const [px, py, ps] of rects) ctx.rect(px, py, ps, ps);
    ctx.clip();
    ctx.drawImage(im, M.x0 + tx * span, M.y0 + ty * span, (im.naturalWidth || im.width) * L.m, (im.naturalHeight || im.height) * L.m);
    ctx.restore();
  }
  draw(want);
  ctx.restore();
}
