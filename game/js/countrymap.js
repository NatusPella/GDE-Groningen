import {
  BLOCK, PW, PL, ROAD_IN, ROAD_W, MAIN_HW, MAAR_WATER,
  chash, countryRect, countryMask, edgeDistance, edgeRoad, maarX, maarY, villageOf, ditchRamp,
  realBlock, urbanWeight,
} from './countryfield.js';
import { EDGE } from './countryedge.js';
import { REAL, RTILE, buildingsInTile, buildingModel, realPlaceLabels } from './countryreal.js';
import { FARM_TYPES, blockPlanCached, blockPlan, villagePlan, turbineRow, turbineValid, isPlanned, pylonsAround, ROAD_ROW, TREE_ROW_P } from './countryplan.js';

// The Ommelanden on the 2D maps (minimap and full map), drawn from the same
// plan as the 3D world: meadows fading in past the city edge, the ditch
// grid and maaren, polder roads and the roads carried on from the city,
// canals, rail lines, farmsteads, villages, the fringe parks and houses,
// tree rows and turbines. Drawn in world units into a world-transformed
// context; callers cache (mapview tiles) or keep the area small (minimap).

// One land colour for the city and the Ommelanden on each map, so the edge
// of the real data never shows as a seam; the countryside only differs in
// what is drawn on it (ditches, farms, villages).
export const MAP_STYLE = {
  meadow: '#243528', park: '#2f5c36', ditch: '#2d6a86', water: '#2d6a86', road: '#c7c7c2', major: '#f0ede4', minor: '#8f9095',
  building: 'rgba(160, 156, 146, 0.62)', church: 'rgba(214, 205, 180, 0.8)', tree: '#1d3a23', village: '#2b4230',
  allot: '#2f4f33', sports: '#2f5c36', business: '#333a36', rail: '#55524c', railTie: '#d8d4c8', turbine: '#e8eae8',
  roadMin: 1.4, majorMin: 2.4,
};
export const MINI_STYLE = {
  meadow: '#3e4c39', park: '#5a8445', ditch: '#3a86a8', water: '#3a86a8', road: '#a8ada2', major: '#f0ede4', minor: '#a8ada2',
  building: '#b98a6a', church: '#8a8474', tree: '#34562c', village: '#4b5c41',
  allot: '#55733f', sports: '#5a8445', business: '#8a96a0', rail: '#55524c', railTie: '#d8d4c8', turbine: '#f0f0ee',
  roadMin: 3, majorMin: 3,
};

const C = ROAD_IN + ROAD_W / 2;

// The real water (countryreal.js distance field) as an image per colour.
const waterCache = new Map();
function realWaterImage(color) {
  const zone = REAL.ready && REAL.waterField;
  if (!zone) return null;
  let c = waterCache.get(color);
  if (c) return c;
  const W = zone;
  c = document.createElement('canvas');
  c.width = W.w; c.height = W.h;
  const g = c.getContext('2d');
  const img = g.createImageData(W.w, W.h);
  const col = parseInt(color.slice(1), 16);
  for (let k = 0; k < W.w * W.h; k++) {
    const d = (W.data[k] - 128) / 4;
    if (d < -8) continue;
    const t = Math.min(1, Math.max(0, (d + 5) / 10));
    img.data[k * 4] = col >> 16; img.data[k * 4 + 1] = (col >> 8) & 255; img.data[k * 4 + 2] = col & 255;
    img.data[k * 4 + 3] = Math.round(255 * t);
  }
  g.putImageData(img, 0, 0);
  waterCache.set(color, c);
  return c;
}

// Real roads, water, rails and buildings in the window.
const ROAD_ORDER = [7, 6, 5, 2, 4, 3, 1];
function drawReal(ctx, x0, y0, x1, y1, pxPerM, st) {
  if (!REAL.ready) return;
  const E = REAL.ext;
  if (x1 < E[0] || x0 > E[2] || y1 < E[1] || y0 > E[3]) return;
  const px = (n) => n / pxPerM;
  const img = realWaterImage(st.water);
  if (img) {
    const W = REAL.waterField;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, W.x0, W.y0, W.w * W.cell, W.h * W.cell);
    ctx.restore();
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = st.water;
  for (const w of REAL.waterways) {
    if (!w.box) w.box = boxOf(w.pts, w.hw);
    if (w.box[2] < x0 || w.box[0] > x1 || w.box[3] < y0 || w.box[1] > y1) continue;
    ctx.lineWidth = Math.max(px(1), w.hw * 2);
    line(ctx, w.pts);
  }
  if (pxPerM > 0.2) {
    ctx.fillStyle = st.building;
    for (let tx = Math.floor(x0 / RTILE); tx <= Math.floor(x1 / RTILE); tx++) {
      for (let ty = Math.floor(y0 / RTILE); ty <= Math.floor(y1 / RTILE); ty++) {
        const L = buildingsInTile(tx, ty);
        if (!L) continue;
        for (const i of L) {
          if (pxPerM < 0.5 && REAL.bw[i] * REAL.bl[i] < 60) continue;
          rotRect(ctx, REAL.bx[i], REAL.by[i], REAL.bw[i], REAL.bl[i], REAL.ba[i]);
        }
      }
    }
  }
  for (const k of ROAD_ORDER) {
    if (k === 7 && pxPerM < 0.12) continue;
    const major = k <= 4;
    ctx.strokeStyle = major ? st.major : k >= 6 ? st.minor : st.road;
    for (const r of REAL.roads) {
      if (r.kind !== k) continue;
      if (!r.box) r.box = boxOf(r.pts, r.w);
      if (r.box[2] < x0 || r.box[0] > x1 || r.box[3] < y0 || r.box[1] > y1) continue;
      ctx.lineWidth = Math.max(px(major ? st.majorMin : st.roadMin * (k === 7 ? 0.7 : 1)), r.w);
      line(ctx, r.pts);
    }
  }
  ctx.fillStyle = st.church;
  for (const c of REAL.churches) if (c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1) ctx.fillRect(c.x - 11, c.y - 5, 22, 10);
  ctx.restore();
}
function boxOf(P, m) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a - m, b - m, c + m, d + m];
}
function line(ctx, P) {
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  ctx.stroke();
}

// Meadow wherever the real data ends (the coverage mask, feathered like
// the ground shader), plain meadow beyond the mask grid. Draw before the
// city's own layers.
const meadowCache = new Map();
function meadowImage(st) {
  const M = countryMask();
  if (!M) return null;
  let c = meadowCache.get(st.meadow);
  if (c && c.mask === M) return c;
  c = document.createElement('canvas');
  c.width = M.w; c.height = M.h;
  const g = c.getContext('2d');
  const img = g.createImageData(M.w, M.h);
  const col = parseInt(st.meadow.slice(1), 16);
  for (let k = 0; k < M.w * M.h; k++) {
    const d = M.data[k];
    const t = Math.min(1, Math.max(0, (d + 160) / 180));
    img.data[k * 4] = col >> 16; img.data[k * 4 + 1] = (col >> 8) & 255; img.data[k * 4 + 2] = col & 255;
    img.data[k * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
  g.putImageData(img, 0, 0);
  c.mask = M;
  meadowCache.set(st.meadow, c);
  return c;
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
  const E = REAL.ready ? REAL.ext : [Infinity, Infinity, -Infinity, -Infinity];
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
      if (edgeDistance(mx, my) < 5) continue;
      if (REAL.ready && (notReal ? realBlock(Math.floor(mx / BLOCK), Math.floor(my / BLOCK)) : urbanWeight(mx, my) > 0.5)) continue;
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
            if (hS >= ditchRamp(mx, my) || edgeDistance(mx, my) < 0 || urbanWeight(mx, my) > 0.5) continue;
            const [ax, ay] = W(col * PW, b), [cx, cy] = W(col * PW, b + 80);
            seg(ax, ay, cx, cy);
          }
          const c0 = col - 1;
          const off = chash(c0 + bx * 131 + by * 977, rot ? 18 : 17) * PL;
          for (let row = 1; row * PL - off < BLOCK; row++) {
            const b = row * PL - off;
            if (b <= 0) continue;
            const [mx, my] = W(c0 * PW + PW / 2, b);
            if (chash(c0 * 31 + bx * 7 + row * 131, by * 977 + 71) >= ditchRamp(mx, my) || edgeDistance(mx, my) < 0 || urbanWeight(mx, my) > 0.5) continue;
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
  ctx.globalAlpha = Math.min(1, Math.max(0.35, pxPerM * 1.6));
  ctx.strokeStyle = st.ditch;
  ctx.lineWidth = Math.max(px(0.9), MAIN_HW * 1.6);
  ctx.beginPath();
  for (let bx = bx0; bx <= bx1 + 1; bx++) segOut(bx * BLOCK, y0, bx * BLOCK, y1);
  for (let by = by0; by <= by1 + 1; by++) segOut(x0, by * BLOCK, x1, by * BLOCK);
  ctx.stroke();
  ctx.strokeStyle = st.water;
  ctx.lineWidth = Math.max(px(1.6), MAAR_WATER * 2);
  ctx.beginPath();
  for (let bx = bx0; bx <= bx1 + 1; bx++) if (maarX(bx)) segOut(bx * BLOCK, y0, bx * BLOCK, y1, 120, true);
  for (let by = by0; by <= by1 + 1; by++) if (maarY(by)) segOut(x0, by * BLOCK, x1, by * BLOCK, 120, true);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // canals carried on from the city
  ctx.strokeStyle = st.water;
  for (const c of EDGE.canals) {
    ctx.lineWidth = c.hw * 2;
    ctx.lineCap = c.pond ? 'round' : 'butt';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(c.a[0], c.a[1]);
    ctx.lineTo(c.m[0], c.m[1]);
    ctx.lineTo(c.b[0], c.b[1]);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

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
  for (let bx = bx0 - 1; bx <= bx1 + 1; bx++) for (let by = by0; by <= by1; by++) { const v = villageOf(bx, by); if (v) villages.push(v); }
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

  drawReal(ctx, x0, y0, x1, y1, pxPerM, st);

  // rail lines leaving the map (the city layer draws the part inside)
  ctx.save();
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    const w = Math.max(px(pass ? 0.9 : 2.6), pass ? 1.2 : 3.2);
    ctx.strokeStyle = pass ? st.railTie : st.rail;
    ctx.lineWidth = w;
    ctx.setLineDash(pass ? [w * 1.4, w * 1.4] : []);
    ctx.beginPath();
    for (const [a, b] of EDGE.rails) seg(a[0], a[1], b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();

  // roads carried on from the city (from their start under the city road)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const k of EDGE.connectors) {
    const major = k.cat === 'major';
    ctx.strokeStyle = major ? st.major : k.cat === 'minor' ? st.minor : st.road;
    for (let i = 0; i < k.pts.length - 1; i++) {
      const a = k.pts[i], b = k.pts[i + 1];
      ctx.lineWidth = Math.max(px(major ? st.majorMin : st.roadMin), (k.ws[i] + k.ws[i + 1]) / 2);
      ctx.beginPath();
      seg(a[0], a[1], b[0], b[1]);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  // fringe parks, business halls and ribbon houses
  for (const f of EDGE.features) {
    const q = f.rect;
    if (q[2] < x0 || q[0] > x1 || q[3] < y0 || q[1] > y1) continue;
    ctx.fillStyle = st[f.kind === 'allot' ? 'allot' : f.kind === 'sports' ? 'sports' : 'business'];
    ctx.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]);
    if (pxPerM > 0.4) {
      ctx.fillStyle = st.building;
      for (const b of f.boxes) ctx.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    }
  }
  if (pxPerM > 0.25) {
    ctx.fillStyle = st.building;
    for (const h of EDGE.houses) {
      if (h.x < x0 - 10 || h.x > x1 + 10 || h.y < y0 - 10 || h.y > y1 + 10) continue;
      rotRect(ctx, h.x, h.y, 8, 9, h.angle);
    }
  }

  // farmsteads and village houses
  const detail = pxPerM > 0.18;
  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      if (edgeDistance(bx * BLOCK + BLOCK / 2, by * BLOCK + BLOCK / 2) < -BLOCK) continue;
      const P = detail ? blockPlan(bx, by) : blockPlanCached(bx, by);
      if (!P) continue;
      ctx.fillStyle = st.building;
      for (const f of P.farms) {
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

  // turbines and mills (only where the plan is already known)
  if (pxPerM > 0.08) {
    const M = BLOCK * 3;
    ctx.strokeStyle = st.turbine;
    ctx.lineWidth = Math.max(px(1.2), 2);
    ctx.beginPath();
    for (let my = Math.floor(y0 / M); my <= Math.floor(y1 / M); my++) {
      for (let mx = Math.floor(x0 / M); mx <= Math.floor(x1 / M); mx++) {
        for (const t of turbineRow(mx, my)) {
          if (t.x0 < x0 - 60 || t.x0 > x1 + 60 || t.y0 < y0 - 60 || t.y0 > y1 + 60) continue;
          if (!isPlanned(t.x0, t.y0) || !turbineValid(t)) continue;
          const L = Math.max(px(5), 14);
          for (let k = 0; k < 3; k++) {
            const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
            ctx.moveTo(t.x, t.y);
            ctx.lineTo(t.x + Math.cos(a) * L, t.y + Math.sin(a) * L);
          }
        }
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
const PLACE_RANK = { town: 0, village: 1, suburb: 2, hamlet: 3, quarter: 4 };
export function villageLabels(x0, y0, x1, y1) {
  const out = realPlaceLabels(x0, y0, x1, y1).sort((a, b) => PLACE_RANK[a.kind] - PLACE_RANK[b.kind]);
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

// Minimap entry (replaces the old flat meadow + ditch grid).
export function drawCountryMinimap(ctx, x0, y0, x1, y1, pxPerM = 1.2) {
  drawCountryBase(ctx, x0, y0, x1, y1, MINI_STYLE);
  drawCountryDetail(ctx, x0, y0, x1, y1, pxPerM, MINI_STYLE);
}
