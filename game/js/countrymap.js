import {
  BLOCK, PW, PL, ROAD_IN, ROAD_W, MAIN_HW, MAAR_WATER,
  chash, countryRect, countryMask, edgeDistance, edgeRoad, maarX, maarY, villageOf, ditchRamp, provinceBlock,
} from './countryfield.js';
import { provinceMapBounds } from './provincemap.js';
import { provinceLandAt } from './regions.js';
import { FARM_TYPES, blockPlanCached, blockPlan, villagePlan, ROAD_ROW, TREE_ROW_P } from './countryplan.js';
import { farPropsIn } from './farprops.js';
import { MAP_PALETTE, MINI_PALETTE, mapPhase, applyMapPhase, currentMapPhase } from './mapstyle.js';

// The procedural countryside on the 2D maps (minimap and full map), drawn from
// the same plan as the 3D world: meadows fading in past the city edge, the
// ditch grid and maaren, polder roads, farmsteads, villages, tree rows and
// turbines. What the province's tiles hold is drawn from them. Drawn in world units into a world-transformed
// context; callers cache (mapview tiles) or keep the area small (minimap).

// One land colour for the city and the Ommelanden on each map, so the edge
// of the real data never shows as a seam; the countryside only differs in
// what is drawn on it (ditches, farms, villages). The tables live in
// mapstyle.js; the minimap's matches the city minimap (hud_panel.js).
export const MAP_STYLE = MAP_PALETTE;
export const MINI_STYLE = MINI_PALETTE;

const C = ROAD_IN + ROAD_W / 2;

// A w x h canvas in one colour whose alpha (0-255) is alpha(k) per pixel,
// filled in row bands: step(ms) goes on for about that long, finish() does
// the rest at once (the meadow mask is ~1 M pixels: built in one go it is a
// frame of its own).
function alphaCanvas(w, h, color, alpha) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  let band = null;
  const col = parseInt(color.slice(1), 16);
  const rgb = (col >> 16) | (col & 0xff00) | ((col & 255) << 16);
  const ROWS = 32;
  let y = 0;
  const job = { c, done: false };
  job.step = (ms) => {
    const end = performance.now() + ms;
    while (y < h) {
      const rows = Math.min(ROWS, h - y);
      if (!band || band.height !== rows) band = g.createImageData(w, rows);
      const px = new Uint32Array(band.data.buffer);
      px.fill(0);
      for (let k = 0, o = y * w, n = rows * w; k < n; k++) {
        const a = alpha(o + k);
        if (a > 0) px[k] = rgb | (a << 24);
      }
      g.putImageData(band, 0, y);
      y += rows;
      if (performance.now() > end) break;
    }
    if (y >= h) job.done = true;
    return job.done;
  };
  job.finish = () => { if (!job.done) job.step(Infinity); return c; };
  return job;
}

// Meadow wherever the real data ends (the coverage mask, feathered like
// the ground shader), plain meadow beyond the mask grid. Draw before the
// city's own layers.
const meadowCache = new Map();
function meadowJob(st) {
  const M = countryMask();
  if (!M) return null;
  let j = meadowCache.get(st.meadow);
  if (j && j.mask === M) return j;
  j = alphaCanvas(M.w, M.h, st.meadow, (k) => {
    const t = Math.min(1, Math.max(0, (M.data[k] + 160) / 180));
    return Math.round(255 * t * t * (3 - 2 * t));
  });
  j.mask = M;
  meadowCache.set(st.meadow, j);
  return j;
}
function meadowImage(st) {
  const j = meadowJob(st);
  return j ? j.finish() : null;
}

// The water and meadow images of both maps, built a few ms per frame (on
// the title screen), before the first minimap tile or map view needs them.
export function warmCountryMaps(sliceMs = 4) {
  const jobs = [];
  for (const st of [MINI_STYLE, MAP_STYLE]) jobs.push(meadowJob(st));
  const next = () => {
    const j = jobs.find((q) => q && !q.done);
    if (!j) return;
    j.step(sliceMs);
    requestAnimationFrame(next);
  };
  requestAnimationFrame(next);
}

export function drawCountryBase(ctx, x0, y0, x1, y1, st) {
  const M = countryMask();
  const r = countryRect();
  const G = M ? [M.x0, M.y0, M.x0 + M.w * M.cell, M.y0 + M.h * M.cell] : [r.cx - r.hx, r.cy - r.hy, r.cx + r.hx, r.cy + r.hy];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.rect(G[0], G[1], G[2] - G[0], G[3] - G[1]);
  ctx.clip('evenodd');
  ctx.fillStyle = st.meadow;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  const img = meadowImage(st);
  if (img && !(x1 < G[0] || x0 > G[2] || y1 < G[1] || y0 > G[3])) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, G[0], G[1], G[2] - G[0], G[3] - G[1]);
    ctx.restore();
  }
}

// Everything on the meadows. pxPerM: screen pixels per metre (detail level).
export function drawCountryDetail(ctx, x0, y0, x1, y1, pxPerM, st) {
  // never loop over more than the countryside anyone can reach
  const rr = countryRect(), LIM = 7000;
  const E = provinceMapBounds() || [Infinity, Infinity, -Infinity, -Infinity];
  x0 = Math.max(x0, Math.min(E[0], rr.cx - rr.hx - LIM)); y0 = Math.max(y0, Math.min(E[1], rr.cy - rr.hy - LIM));
  x1 = Math.min(x1, Math.max(E[2], rr.cx + rr.hx + LIM)); y1 = Math.min(y1, Math.max(E[3], rr.cy + rr.hy + LIM));
  if (x0 >= x1 || y0 >= y1) return;
  // nothing to draw when the whole window lies deep inside the real data
  let outside = false;
  for (let gx = 0; gx <= 4 && !outside; gx++) for (let gy = 0; gy <= 4; gy++) if (edgeDistance(x0 + ((x1 - x0) * gx) / 4, y0 + ((y1 - y0) * gy) / 4) > -Math.max(x1 - x0, y1 - y0) / 4 - 60) { outside = true; break; }
  if (!outside) return;
  const px = (n) => n / pxPerM;
  ctx.save();
  ctx.lineCap = 'butt';
  const bx0 = Math.floor(x0 / BLOCK), bx1 = Math.floor(x1 / BLOCK), by0 = Math.floor(y0 / BLOCK), by1 = Math.floor(y1 / BLOCK);
  const seg = (ax, ay, bx, by) => {
    if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) return;
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  };
  // long grid lines in pieces, only out in the country
  const segOut = (ax, ay, bx, by, step = 120, notReal = false) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const qx = ax + (bx - ax) * t0, qy = ay + (by - ay) * t0, rx = ax + (bx - ax) * t1, ry = ay + (by - ay) * t1;
      const mx = (qx + rx) / 2, my = (qy + ry) / 2;
      if (edgeDistance(mx, my) < 5 || !provinceLandAt(mx, my)) continue; // none over the sea or beyond the border (#233)
      if (notReal && provinceBlock(Math.floor(mx / BLOCK), Math.floor(my / BLOCK))) continue;
      seg(qx, qy, rx, ry);
    }
  };

  // thin ditches (fading in near the city like the real ones)
  if (pxPerM > 0.3) {
    ctx.strokeStyle = st.ditch;
    ctx.lineWidth = Math.max(px(0.7), 1.5);
    ctx.globalAlpha = Math.min(1, (pxPerM - 0.3) * 2);
    ctx.beginPath();
    for (let bx = bx0; bx <= bx1; bx++) {
      for (let by = by0; by <= by1; by++) {
        const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
        const W = (a, b) => (rot ? [bx * BLOCK + b, by * BLOCK + a] : [bx * BLOCK + a, by * BLOCK + b]);
        for (let col = 1; col < BLOCK / PW; col++) {
          const hS = chash(col + bx * 131 + 5, by * 977 + 61);
          for (let b = 0; b < BLOCK; b += 80) {
            const [mx, my] = W(col * PW, b + 40);
            if (hS >= ditchRamp(mx, my) || edgeDistance(mx, my) < 0 || !provinceLandAt(mx, my)) continue;
            const [ax, ay] = W(col * PW, b), [cx, cy] = W(col * PW, b + 80);
            seg(ax, ay, cx, cy);
          }
          const c0 = col - 1;
          const off = chash(c0 + bx * 131 + by * 977, rot ? 18 : 17) * PL;
          for (let row = 1; row * PL - off < BLOCK; row++) {
            const b = row * PL - off;
            if (b <= 0) continue;
            const [mx, my] = W(c0 * PW + PW / 2, b);
            if (chash(c0 * 31 + bx * 7 + row * 131, by * 977 + 71) >= ditchRamp(mx, my) || edgeDistance(mx, my) < 0 || !provinceLandAt(mx, my)) continue;
            const [ax, ay] = W(c0 * PW, b), [cx, cy] = W(col * PW, b);
            seg(ax, ay, cx, cy);
          }
        }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // main ditches and maaren; faint when zoomed far out, so the polder grid
  // doesn't turn the Ommelanden into a blue pattern next to the city
  ctx.globalAlpha = Math.min(1, Math.max(0.5, pxPerM * 1.6));
  ctx.strokeStyle = st.ditch;
  ctx.lineWidth = Math.max(px(0.9), MAIN_HW * 1.6);
  ctx.beginPath();
  for (let bx = bx0; bx <= bx1 + 1; bx++) segOut(bx * BLOCK, y0, bx * BLOCK, y1);
  for (let by = by0; by <= by1 + 1; by++) segOut(x0, by * BLOCK, x1, by * BLOCK);
  ctx.stroke();
  // open water (maaren) as solid as the city's water; only the ditch grid fades
  ctx.globalAlpha = 1;
  ctx.strokeStyle = st.water;
  ctx.lineWidth = Math.max(px(1.6), MAAR_WATER * 2);
  ctx.beginPath();
  for (let bx = bx0; bx <= bx1 + 1; bx++) if (maarX(bx)) segOut(bx * BLOCK, y0, bx * BLOCK, y1, 120, true);
  for (let by = by0; by <= by1 + 1; by++) if (maarY(by)) segOut(x0, by * BLOCK, x1, by * BLOCK, 120, true);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // tree rows along polder roads and strip boundaries
  if (pxPerM > 0.55) {
    ctx.strokeStyle = st.tree;
    ctx.lineWidth = Math.max(px(1.2), 4);
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let bx = bx0; bx <= bx1; bx++) {
      for (let by = by0; by <= by1; by++) {
        for (const s of [0, 1]) {
          if (!edgeRoad(bx, by, s) || !ROAD_ROW(bx, by, s)) continue;
          for (const o of [ROAD_IN - 1.4, ROAD_IN + ROAD_W + 1.6]) {
            if (s === 0) segOut(bx * BLOCK + o, by * BLOCK, bx * BLOCK + o, (by + 1) * BLOCK, 60);
            else segOut(bx * BLOCK, by * BLOCK + o, (bx + 1) * BLOCK, by * BLOCK + o, 60);
          }
        }
        const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
        for (let col = 1; col < BLOCK / PW; col++) {
          if (chash(col + bx * 131 + 900, by * 977 + (rot ? 7 : 3)) >= TREE_ROW_P) continue;
          const a = col * PW + 2;
          if (rot) segOut(bx * BLOCK, by * BLOCK + a, (bx + 1) * BLOCK, by * BLOCK + a, 60);
          else segOut(bx * BLOCK + a, by * BLOCK, bx * BLOCK + a, (by + 1) * BLOCK, 60);
        }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // villages: the ground of the wierde first
  const villages = [];
  for (let bx = bx0 - 1; bx <= bx1 + 1; bx++) for (let by = by0; by <= by1; by++) { const v = villageOf(bx, by); if (v && provinceLandAt(v.x, v.y)) villages.push(v); }
  ctx.fillStyle = st.village;
  for (const v of villages) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, v.r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }

  // polder roads
  ctx.strokeStyle = st.road;
  ctx.lineWidth = Math.max(px(st.roadMin * 0.8), ROAD_W);
  ctx.beginPath();
  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      if (edgeRoad(bx, by, 0)) segOut(bx * BLOCK + C, by * BLOCK, bx * BLOCK + C, (by + 1) * BLOCK, 60);
      if (edgeRoad(bx, by, 1)) segOut(bx * BLOCK, by * BLOCK + C, (bx + 1) * BLOCK, by * BLOCK + C, 60);
    }
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  // farmsteads and village houses
  const detail = pxPerM > 0.18;
  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      if (edgeDistance(bx * BLOCK + BLOCK / 2, by * BLOCK + BLOCK / 2) < -BLOCK) continue;
      const P = detail ? blockPlan(bx, by) : blockPlanCached(bx, by);
      if (!P) continue;
      ctx.fillStyle = st.building;
      for (const f of P.farms) {
        if (!provinceLandAt(f.x, f.y)) continue;
        if (!detail) { ctx.fillRect(f.x - 12, f.y - 12, 24, 24); continue; }
        for (const b of f.boxes.slice(0, FARM_TYPES[f.type].boxes.length)) ctx.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
      }
      if (P.gas) { ctx.fillStyle = st.business; ctx.fillRect(P.gas.box[0], P.gas.box[1], P.gas.box[2] - P.gas.box[0], P.gas.box[3] - P.gas.box[1]); }
    }
  }
  for (const v of villages) {
    if (pxPerM > 0.25) {
      const V = villagePlan(v);
      ctx.fillStyle = st.building;
      for (const h of V.houses) rotRect(ctx, h.x, h.y, 8, 9, h.angle);
    }
    ctx.fillStyle = st.church;
    ctx.fillRect(v.x - 13, v.y - 5.5, 26, 11);
  }

  // the wind turbines of the province's tiles
  if (pxPerM > 0.08) {
    ctx.strokeStyle = st.turbine;
    ctx.lineWidth = Math.max(px(1.2), 2);
    ctx.beginPath();
    const L = Math.max(px(5), 14);
    for (const t of farPropsIn(x0 - 60, y0 - 60, x1 + 60, y1 + 60).turbines) {
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
        ctx.moveTo(t[0], t[1]);
        ctx.lineTo(t[0] + Math.cos(a) * L, t[1] + Math.sin(a) * L);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function rotRect(ctx, x, y, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  ctx.beginPath();
  for (const [u, v] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) ctx.lineTo(x + u * c - v * s, y + u * s + v * c);
  ctx.fill();
}

// Village names for map labels in a window: [{ name, x, y }].
export function villageLabels(x0, y0, x1, y1) {
  const out = [];
  // procedural villages only as far out as anyone can reach
  const rr = countryRect(), LIM = 16000;
  x0 = Math.max(x0, rr.cx - LIM); y0 = Math.max(y0, rr.cy - LIM);
  x1 = Math.min(x1, rr.cx + LIM); y1 = Math.min(y1, rr.cy + LIM);
  for (let bx = Math.floor(x0 / BLOCK) - 1; bx <= Math.floor(x1 / BLOCK); bx++) {
    for (let by = Math.floor(y0 / BLOCK); by <= Math.floor(y1 / BLOCK); by++) {
      const v = villageOf(bx, by);
      if (v && v.x > x0 && v.x < x1 && v.y > y0 && v.y < y1) out.push({ name: villagePlan(v).name, x: v.x, y: v.y, r: v.r });
    }
  }
  return out;
}

// Minimap entry (replaces the old flat meadow + ditch grid). The country
// layer is static, so it is drawn into world-aligned tiles once per zoom step
// and blitted (drawing it live cost a fifth of a frame over the Ommeland).
// A missing tile shows the plain meadow and is built in idle time between
// frames: built inside the frame, a tile near the city edge cost up to 8 ms
// (30+ ms on a slow laptop CPU) right after a jump or a zoom step.
const MINI_TILE_PX = 256, MINI_PAD_PX = 6, MINI_TILES_MAX = 56;
// an idle slice shorter than this starts no further tile (the first always runs)
const MINI_IDLE_MS = 6;
const miniTiles = new Map();
const miniQueue = new Map();
let miniIdle = 0;

// Day or night colours for both maps from the game clock; the minimap's
// tiles are rebuilt when it flips. Returns the phase ('dag' or 'nacht').
export function syncMapPhase(world) {
  if (applyMapPhase(mapPhase(world && world.dayNight ? world.dayNight.hour : undefined))) { miniTiles.clear(); miniQueue.clear(); }
  return currentMapPhase();
}

function buildMiniTile(key, tx, ty, T, scale, pxPerM) {
  const pad = MINI_PAD_PX / scale;
  const c = document.createElement('canvas');
  c.width = c.height = MINI_TILE_PX + MINI_PAD_PX * 2;
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, -(tx * T - pad) * scale, -(ty * T - pad) * scale);
  const x0 = tx * T - pad * 2, y0 = ty * T - pad * 2, x1 = (tx + 1) * T + pad * 2, y1 = (ty + 1) * T + pad * 2;
  drawCountryBase(g, x0, y0, x1, y1, MINI_STYLE);
  drawCountryDetail(g, x0, y0, x1, y1, pxPerM, MINI_STYLE);
  miniTiles.set(key, c);
  while (miniTiles.size > MINI_TILES_MAX) miniTiles.delete(miniTiles.keys().next().value);
}

function buildQueuedTiles(deadline) {
  miniIdle = 0;
  let n = 0;
  for (const [key, a] of miniQueue) {
    if (n && deadline.timeRemaining() < MINI_IDLE_MS) break;
    miniQueue.delete(key);
    if (!miniTiles.has(key)) buildMiniTile(key, ...a);
    n++;
  }
  if (miniQueue.size) scheduleMiniTiles();
}

function scheduleMiniTiles() {
  if (miniIdle) return;
  // a CPU-bound frame rate leaves no idle time: then one tile per 200 ms
  if (typeof requestIdleCallback === 'function') miniIdle = requestIdleCallback(buildQueuedTiles, { timeout: 200 });
  else miniIdle = setTimeout(() => buildQueuedTiles({ timeRemaining: () => 0 }), 50);
}

function miniTile(tx, ty, lvl, T, scale, pxPerM, build) {
  const key = tx + ',' + ty + ',' + lvl;
  const c = miniTiles.get(key);
  if (c) { miniTiles.delete(key); miniTiles.set(key, c); return c; }
  if (build && !miniQueue.has(key)) miniQueue.set(key, [tx, ty, T, scale, pxPerM]);
  return null;
}

// While the minimap zooms (it does with speed) the tiles of the new zoom step
// are built in idle time; until they are all there, the last complete step
// is drawn underneath, scaled, so the Ommeland never drops to plain meadow.
let fullLvl = null;
function drawLevel(ctx, x0, y0, x1, y1, lvl, dev, pxPerM, build) {
  const scale = 2 ** (lvl / 2);
  const T = MINI_TILE_PX / scale;
  // a hair of overlap so the rotated tiles never show a seam
  const e = 0.6 / dev;
  let missing = 0;
  for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) {
    for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
      const c = miniTile(tx, ty, lvl, T, scale, pxPerM * scale / dev, build);
      if (!c) { missing++; continue; }
      const sp = MINI_PAD_PX - e * scale;
      ctx.drawImage(c, sp, sp, MINI_TILE_PX + 2 * e * scale, MINI_TILE_PX + 2 * e * scale, tx * T - e, ty * T - e, T + 2 * e, T + 2 * e);
    }
  }
  return missing;
}

export function drawCountryMinimap(ctx, x0, y0, x1, y1, pxPerM = 1.2) {
  const m = ctx.getTransform();
  const dev = Math.hypot(m.a, m.b) || 1;
  // zoom steps of a half octave, drawn at the next step up
  const lvl = Math.ceil(Math.log2(dev) * 2);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  // only the tiles this view still lacks are queued
  miniQueue.clear();
  if (fullLvl !== null && fullLvl !== lvl) drawLevel(ctx, x0, y0, x1, y1, fullLvl, dev, pxPerM, false);
  if (!drawLevel(ctx, x0, y0, x1, y1, lvl, dev, pxPerM, true)) fullLvl = lvl;
  if (miniQueue.size) scheduleMiniTiles();
  ctx.restore();
}
