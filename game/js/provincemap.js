// The province's base map on the full map (mapview.js): the pre-rendered
// pyramid of scripts/world/province_map.mjs (z0 160 m a pixel ... z3 20 m),
// loaded tile by tile as the view needs it. Where a level's image is not in
// yet, a coarser one that is stands in; a load asks the caller to redraw.

let M = null;
let base = 'world/';
const imgs = new Map(); // 'z-tx_ty' -> HTMLImageElement (complete or loading)
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
  if (im) return im.complete && im.naturalWidth ? im : null;
  if (typeof Image === 'undefined') return null;
  im = new Image();
  im.decoding = 'async';
  im.onload = loaded;
  im.src = `${base}${M.dir}z${M.levels[k].z}-${key}.png`;
  imgs.set(id, im);
  return null;
}

// Draw the base map over the world window [x0, x1] x [y0, y1] into a
// world-transformed context.
export function drawProvinceBase(ctx, x0, y0, x1, y1, pxPerM) {
  if (!M) return;
  const want = levelFor(pxPerM);
  const draw = (k, only) => {
    const L = M.levels[k], span = M.tile * L.m;
    const tx0 = Math.max(0, Math.floor((x0 - M.x0) / span)), ty0 = Math.max(0, Math.floor((y0 - M.y0) / span));
    const tx1 = Math.floor((x1 - M.x0) / span), ty1 = Math.floor((y1 - M.y0) / span);
    let missing = 0;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${tx}_${ty}`;
        if (!M.have[k].has(key)) continue;
        if (only && !only(tx, ty, span)) continue;
        const im = image(k, key);
        if (!im) { missing++; continue; }
        ctx.drawImage(im, M.x0 + tx * span, M.y0 + ty * span, im.naturalWidth * L.m, im.naturalHeight * L.m);
      }
    }
    return missing;
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
  for (let k = want - 1; k >= 0 && pending.length; k--) {
    draw(k, (tx, ty, span) => {
      const bx = M.x0 + tx * span, by = M.y0 + ty * span;
      return pending.some(([px, py, ps]) => px < bx + span && px + ps > bx && py < by + span && py + ps > by);
    });
  }
  draw(want, null);
  ctx.restore();
}
