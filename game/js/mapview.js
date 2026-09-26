import { drawMapIcon, drawRoute, drawRoadRoute, forEachPoliceUnit, declutter, ROUTE_COLORS, drawSearchArea, getPoliceSearch } from './hud_panel.js';
import { getGaragesForRender } from './garages.js';
import { layerOn, setLayer as storeLayer } from './mapfilters.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender, getShopsDecluttered, SHOP_TYPES } from './shops.js';
import { getOwnedVehiclesForMap } from './ownedvehicles.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getStationsForRender } from './stationtravel.js';
import { getSideJobSpotsForRender } from './sidejobs.js';
import { drawRailsOnMap } from './railway.js';
import { drawCountryBase, drawCountryDetail, villageLabels, MAP_STYLE } from './countrymap.js';
import { ensureCountryEdge } from './countryplan.js';
import { getSettings, onSettingsChange } from './settings.js';
import {
  updateRouting, getActiveRoute, getRouteAhead, setUserWaypoint, clearUserWaypoint, getUserWaypoint, formatDistance,
} from './routing.js';

const PADDING = 0.94;
const ICON = 1.25;
const FONT = '"Bebas Neue", "Arial Narrow", Arial, sans-serif';
const OVERLAY_Z = 15;
const MIN_ZOOM = 0.55;
// the map extends this far past the real data, over the Ommelanden
const COUNTRY_MARGIN = 3200;
const MAX_ZOOM = 12;
const TILE_PX = 512;
const MAX_TILES = 72;
const TILE_BUDGET_MS = 3.5;
const LEVEL_COUNT = 8;
const levelZoom = (L) => Math.SQRT2 ** L;
const MID_ZOOM = 2;
const NEAR_ZOOM = 4;
const DRAG_PX = 4;
const HOVER_PX = 12;
const FOG_CELL = 50;
const FOG_REVEAL = 2;
const FOG_KEY = 'gte-fog';
const FOG_FEATHER = 16; // cells

// city ground and the endless meadows past it share one colour (countrymap.js)
const LAND = MAP_STYLE.meadow;
const GREEN = MAP_STYLE.park;
const COUNTRY = MAP_STYLE.meadow;
const WATER = '#2d6a86';
const WATER_EDGE = '#4a8fae';
const BUILDING = 'rgba(160, 156, 146, 0.62)';
const BUILDING_LANDMARK = 'rgba(214, 205, 180, 0.8)';

const ROAD_COLORS = {
  major: '#f0ede4',
  normal: '#c7c7c2',
  minor: '#8f9095',
  cycle: '#b8703a',
  foot: '#6d6f66',
};
const ROAD_WIDTH_PX = { major: 2.4, normal: 1.4, minor: 1.0, cycle: 0.9, foot: 0.6 };
const ROAD_ORDER = { foot: 0, cycle: 1, minor: 2, normal: 3, major: 4 };

let state = null;
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .mapview-overlay {
      position: fixed;
      inset: 4vh 4vw;
      display: none;
      flex-direction: column;
      background: radial-gradient(ellipse at center, #17301f 0%, #0c140e 100%);
      border: 2px solid #1e9e56;
      border-radius: 8px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
      z-index: ${OVERLAY_Z};
      pointer-events: none;
      font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: #f2f2f2;
      overflow: hidden;
    }
    .mapview-overlay.open { display: flex; }
    .mapview-overlay.embedded {
      position: absolute; inset: 0; z-index: auto;
      border: none; border-radius: 0; box-shadow: none; background: transparent;
    }
    .mapview-overlay.embedded .mapview-title, .mapview-overlay.embedded .mapview-footer { display: none; }
    .mapview-canvas:focus { outline: none; }
    .mapview-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      letter-spacing: 1px;
      font-weight: bold;
      color: #3fc97a;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
      border-bottom: 1px solid rgba(63, 201, 122, 0.35);
      pointer-events: auto;
    }
    .mapview-title { font-size: 20px; white-space: nowrap; }
    .mapview-search { position: relative; flex: 1; max-width: 340px; min-width: 140px; }
    .mapview-search input {
      width: 100%;
      box-sizing: border-box;
      font: 15px 'Arial Narrow', Arial, sans-serif;
      letter-spacing: 0.3px;
      color: #f0ede4;
      background: rgba(12, 20, 14, 0.85);
      border: 1px solid rgba(63, 201, 122, 0.6);
      border-radius: 4px;
      padding: 6px 10px;
      outline: none;
    }
    .mapview-search input:focus { border-color: #3fc97a; box-shadow: 0 0 0 2px rgba(63, 201, 122, 0.3); }
    .mapview-search input::placeholder { color: rgba(240, 237, 228, 0.5); }
    .mapview-results {
      position: absolute;
      left: 0; right: 0; top: calc(100% + 4px);
      margin: 0; padding: 4px 0; list-style: none;
      background: rgba(12, 20, 14, 0.96);
      border: 1px solid rgba(63, 201, 122, 0.6);
      border-radius: 4px;
      z-index: 2;
      text-shadow: none;
    }
    .mapview-results[hidden] { display: none; }
    .mapview-results li {
      display: flex; justify-content: space-between; gap: 10px;
      padding: 5px 10px; cursor: pointer;
      font: 15px 'Arial Narrow', Arial, sans-serif; color: #f0ede4; letter-spacing: 0.3px;
    }
    .mapview-results li[aria-selected="true"], .mapview-results li:hover { background: #0f5c30; }
    .mapview-results .kind { color: #3fc97a; font-size: 13px; }
    .mapview-results .empty { color: rgba(240, 237, 228, 0.6); cursor: default; }
    .mapview-btn {
      font: inherit; font-size: 15px; letter-spacing: 1px; white-space: nowrap;
      color: #0c140e; background: #1e9e56; border: none; border-radius: 4px;
      padding: 6px 12px; cursor: pointer;
    }
    .mapview-btn:hover { background: #3fc97a; }
    .mapview-btn.ghost { color: #f0ede4; background: transparent; border: 1px solid rgba(63, 201, 122, 0.6); }
    .mapview-btn.ghost:hover { border-color: #3fc97a; color: #3fc97a; }
    .mapview-btn[hidden] { display: none; }
    .mapview-btn:focus-visible { outline: 3px solid #f0ede4; outline-offset: 2px; }
    .mapview-route { margin-left: auto; font-size: 16px; color: #f0ede4; white-space: nowrap; }
    .mapview-route .user { color: ${ROUTE_COLORS.user}; }
    .mapview-route .mission { color: ${ROUTE_COLORS.mission}; }
    .mapview-route .job { color: ${ROUTE_COLORS.job}; }
    .mapview-footer {
      padding: 6px 14px;
      font: 13px 'Arial Narrow', Arial, sans-serif;
      letter-spacing: 0.3px;
      color: rgba(240, 237, 228, 0.75);
      border-top: 1px solid rgba(63, 201, 122, 0.35);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mapview-footer b { color: #3fc97a; font-weight: normal; }
    .mapview-body { position: relative; flex: 1; min-height: 0; display: flex; }
    .mapview-canvas {
      flex: 1; min-width: 0; height: 100%; display: block;
      pointer-events: auto; cursor: crosshair; touch-action: none;
    }
    .mapview-canvas.dragging { cursor: grabbing; }
    .mapview-canvas.pointing { cursor: pointer; }
    .mapview-zoom {
      position: absolute; left: 12px; bottom: 44px;
      display: flex; flex-direction: column; gap: 4px; pointer-events: auto;
    }
    .mapview-zoom button {
      width: 30px; height: 30px; font: bold 20px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: #3fc97a; background: rgba(12, 20, 14, 0.85);
      border: 1px solid rgba(63, 201, 122, 0.6); border-radius: 4px; cursor: pointer; line-height: 1;
    }
    .mapview-zoom button:hover { border-color: #3fc97a; background: #0f5c30; }
    .mapview-tooltip {
      position: absolute; pointer-events: none;
      background: rgba(12, 20, 14, 0.92);
      border: 1px solid rgba(63, 201, 122, 0.6);
      border-radius: 4px; padding: 3px 8px; font-size: 14px; letter-spacing: 0.3px; color: #f2f2f2;
      transform: translate(12px, -50%); white-space: nowrap; display: none;
    }
    .mapview-tooltip .sub { color: #3fc97a; margin-left: 6px; }
    .mapview-legend {
      flex: 0 0 auto; width: 176px; margin: 12px 12px 12px 0; padding: 10px 12px;
      align-self: flex-start; max-height: calc(100% - 24px); overflow-y: auto;
      background: rgba(12, 20, 14, 0.8);
      border: 1px solid rgba(63, 201, 122, 0.35); border-radius: 4px; pointer-events: auto;
    }
    .mapview-legend h3 { margin: 0 0 2px; font-size: 16px; font-weight: bold; letter-spacing: 1px; color: #3fc97a; }
    .mapview-legend .hint { margin: 0 0 6px; font: 11px 'Arial Narrow', Arial, sans-serif; color: rgba(240, 237, 228, 0.55); }
    .mapview-legend ul { list-style: none; margin: 0; padding: 0; }
    .mapview-legend li {
      display: flex; align-items: center; gap: 8px; font-size: 14px; letter-spacing: 0.3px; line-height: 1;
      padding: 3px 4px; margin: 0 -4px; border-radius: 3px; user-select: none;
    }
    .mapview-legend li[role="checkbox"] { cursor: pointer; }
    .mapview-legend li[role="checkbox"]:hover { background: rgba(63, 201, 122, 0.12); }
    .mapview-legend li[role="checkbox"]:focus-visible { outline: 2px solid #f0ede4; }
    .mapview-legend li[aria-checked="false"] > canvas, .mapview-legend li[aria-checked="false"] > span:not(.chk) { opacity: 0.4; }
    .mapview-legend .chk {
      margin-left: auto; flex: 0 0 16px; width: 16px; height: 16px; box-sizing: border-box; border-radius: 3px;
      border: 2px solid rgba(240, 237, 228, 0.6); display: flex; align-items: center; justify-content: center;
      transition: background 0.12s, border-color 0.12s;
    }
    .mapview-legend li[aria-checked="true"] .chk { background: #3fc97a; border-color: #3fc97a; }
    .mapview-legend li[aria-checked="true"] .chk::after {
      content: ''; width: 4px; height: 8px; margin-top: -2px; border: solid #0c140e; border-width: 0 2px 2px 0; transform: rotate(45deg);
    }
    .mapview-legend .all { margin: 0 0 8px; font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240, 237, 228, 0.55); }
    .mapview-legend .all button { background: none; border: 0; padding: 0; font: inherit; color: #3fc97a; cursor: pointer; text-decoration: underline; }
    .mapview-legend .all button:focus-visible { outline: 2px solid #f0ede4; }
    .mapview-legend canvas { width: 24px; height: 24px; flex: 0 0 24px; }
    .mapview-legend .note { color: rgba(240, 237, 228, 0.55); font-size: 12px; }
    @media (max-width: 900px) { .mapview-footer { display: none; } }
    @media (max-width: 700px) { .mapview-legend { display: none; } .mapview-title { display: none; } }
  `;
  document.head.appendChild(style);
}

function fillPoly(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function normalize(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function setLayer(key, on) {
  storeLayer(key, on);
  if (key === 'buildings') clearTiles();
  state.dirty = true;
}

// --- fog of war -------------------------------------------------------------

function initFog(world) {
  const [minx, miny, maxx, maxy] = world.map.meta.bounds;
  const w = Math.ceil((maxx - minx) / FOG_CELL), h = Math.ceil((maxy - miny) / FOG_CELL);
  const bits = new Uint8Array(Math.ceil((w * h) / 8));
  try {
    const raw = localStorage.getItem(FOG_KEY);
    const m = raw && /^(\d+)x(\d+):(.*)$/.exec(raw);
    if (m && +m[1] === w && +m[2] === h) {
      const bin = atob(m[3]);
      for (let i = 0; i < Math.min(bin.length, bits.length); i++) bits[i] = bin.charCodeAt(i);
    }
  } catch (e) { /* ignore */ }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const fctx = canvas.getContext('2d');
  const img = fctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = 12;
    img.data[i * 4 + 1] = 20;
    img.data[i * 4 + 2] = 14;
    // the unexplored tint fades out smoothly over the outer ~800 m of the
    // map, so zoomed out it never reads as a dark square against the Ommelanden
    const cx = i % w, cy = (i - cx) / w;
    const edge = Math.min(1, (Math.min(cx, cy, w - 1 - cx, h - 1 - cy) + 0.5) / FOG_FEATHER);
    img.data[i * 4 + 3] = bits[i >> 3] & (1 << (i & 7)) ? 0 : Math.round(130 * edge * edge * (3 - 2 * edge));
  }
  fctx.putImageData(img, 0, 0);
  state.fog = { w, h, minx, miny, bits, canvas, fctx, img, cell: -1, saveAt: 0, dirtySave: false };
  window.addEventListener('beforeunload', saveFog);
}

function saveFog() {
  const f = state && state.fog;
  if (!f || !f.dirtySave) return;
  f.dirtySave = false;
  try {
    let bin = '';
    for (let i = 0; i < f.bits.length; i++) bin += String.fromCharCode(f.bits[i]);
    localStorage.setItem(FOG_KEY, `${f.w}x${f.h}:${btoa(bin)}`);
  } catch (e) { /* ignore */ }
}

function updateFog(world) {
  const f = state.fog;
  const cx = Math.floor((world.player.x - f.minx) / FOG_CELL), cy = Math.floor((world.player.y - f.miny) / FOG_CELL);
  const key = cy * f.w + cx;
  if (key !== f.cell) {
    f.cell = key;
    let changed = false;
    for (let dy = -FOG_REVEAL; dy <= FOG_REVEAL; dy++) {
      for (let dx = -FOG_REVEAL; dx <= FOG_REVEAL; dx++) {
        if (dx * dx + dy * dy > FOG_REVEAL * FOG_REVEAL + 0.5) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
        const i = y * f.w + x;
        if (f.bits[i >> 3] & (1 << (i & 7))) continue;
        f.bits[i >> 3] |= 1 << (i & 7);
        f.img.data[i * 4 + 3] = 0;
        changed = true;
      }
    }
    if (changed) {
      f.fctx.putImageData(f.img, 0, 0);
      f.dirtySave = true;
      state.dirty = true;
    }
  }
  const now = performance.now();
  if (f.dirtySave && now > f.saveAt) {
    f.saveAt = now + 3000;
    saveFog();
  }
}

export function getDiscoveredRatio() {
  const f = state && state.fog;
  if (!f) return 0;
  let n = 0;
  for (let i = 0; i < f.w * f.h; i++) if (f.bits[i >> 3] & (1 << (i & 7))) n++;
  return n / (f.w * f.h);
}

// --- view transform ---------------------------------------------------------

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = state.canvas.getBoundingClientRect();
  state.dpr = dpr;
  state.cw = Math.max(1, rect.width);
  state.ch = Math.max(1, rect.height);
  state.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  state.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  state.compose.width = state.canvas.width;
  state.compose.height = state.canvas.height;
  const [minx, miny, maxx, maxy] = state.real;
  const base = Math.min(state.cw / (maxx - minx), state.ch / (maxy - miny)) * PADDING;
  if (base !== state.baseScale || dpr !== state.tileDpr) {
    state.baseScale = base;
    state.tileDpr = dpr;
    clearTiles();
  }
  if (state.cx == null) {
    state.cx = (minx + maxx) / 2;
    state.cy = (miny + maxy) / 2;
  }
  updateTransform();
}

function updateTransform() {
  const [minx, miny, maxx, maxy] = state.bounds;
  state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom));
  state.cx = Math.max(minx, Math.min(maxx, state.cx));
  state.cy = Math.max(miny, Math.min(maxy, state.cy));
  state.scale = state.baseScale * state.zoom;
  state.ox = state.cw / 2 - state.cx * state.scale;
  state.oy = state.ch / 2 - state.cy * state.scale;
  state.dirty = true;
}

function toScreen(x, y) {
  return [x * state.scale + state.ox, y * state.scale + state.oy];
}

function toWorld(sx, sy) {
  return [(sx - state.ox) / state.scale, (sy - state.oy) / state.scale];
}

function zoomAt(factor, sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor));
  const s = state.baseScale * state.zoom;
  state.cx = wx - (sx - state.cw / 2) / s;
  state.cy = wy - (sy - state.ch / 2) / s;
  updateTransform();
}

function centreOn(x, y, minZoom) {
  state.cx = x;
  state.cy = y;
  if (minZoom) state.zoom = Math.max(state.zoom, minZoom);
  updateTransform();
}

function viewRect(marginPx = 0) {
  const m = marginPx / state.scale;
  const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(state.cw, state.ch);
  return [x0 - m, y0 - m, x1 + m, y1 + m];
}

// --- tile cache -------------------------------------------------------------

function clearTiles() {
  if (state) {
    state.level0 = false;
    for (const t of state.tiles.values()) if (state.pool.length < 8) state.pool.push(t.canvas);
    state.tiles.clear();
    state.dirty = true;
  }
}

function levelFor(zoom) {
  for (let L = 0; L < LEVEL_COUNT; L++) if (levelZoom(L) >= zoom * 0.95) return L;
  return LEVEL_COUNT - 1;
}

function tileWorldSize(L) {
  return TILE_PX / (state.baseScale * levelZoom(L) * state.tileDpr);
}

function renderTile(L, tx, ty) {
  const z = levelZoom(L);
  const s = state.baseScale * z * state.tileDpr;
  const tws = TILE_PX / s;
  const [minx, miny, maxx, maxy] = state.bounds;
  const wx0 = minx + tx * tws, wy0 = miny + ty * tws;
  let canvas = state.pool.pop();
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = TILE_PX;
  }
  const c = canvas.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, TILE_PX, TILE_PX);
  c.setTransform(s, 0, 0, s, -wx0 * s, -wy0 * s);
  const [rx0, ry0, rx1, ry1] = state.real;
  c.fillStyle = LAND;
  if (wx0 < rx1 && wx0 + tws > rx0 && wy0 < ry1 && wy0 + tws > ry0) {
    c.fillRect(Math.max(rx0, wx0), Math.max(ry0, wy0), Math.min(rx1, wx0 + tws) - Math.max(rx0, wx0), Math.min(ry1, wy0 + tws) - Math.max(ry0, wy0));
  }
  drawCountryBase(c, wx0, wy0, wx0 + tws, wy0 + tws, MAP_STYLE);

  // the city data only exists inside the real bounds
  const qx0 = Math.max(wx0, rx0 - 50), qy0 = Math.max(wy0, ry0 - 50), qx1 = Math.min(wx0 + tws, rx1 + 50), qy1 = Math.min(wy0 + tws, ry1 + 50);
  const view = qx0 < qx1 && qy0 < qy1 ? state.map.queryView(qx0, qy0, qx1, qy1) : { roads: [], buildings: [], water: [], green: [], trees: [] };
  const cssPerM = state.baseScale * z;
  const px = (n) => n / cssPerM;

  c.fillStyle = GREEN;
  for (const g of view.green) fillPoly(c, g.pts);

  c.fillStyle = WATER;
  c.strokeStyle = WATER_EDGE;
  c.lineWidth = px(z < MID_ZOOM ? 1.2 : 0.8);
  c.lineJoin = 'round';
  for (const w of view.water) {
    fillPoly(c, w.pts);
    if (w.pts.length >= 3) c.stroke();
  }

  if (z >= NEAR_ZOOM && layerOn('buildings')) {
    for (const b of view.buildings) {
      c.fillStyle = b.landmark ? BUILDING_LANDMARK : BUILDING;
      fillPoly(c, b.pts);
    }
  }

  const roads = view.roads.filter((r) => {
    if (r.pts.length < 2) return false;
    if (z < MID_ZOOM) return r.cat === 'major' || r.cat === 'normal';
    return true;
  }).sort((a, b) => ROAD_ORDER[a.cat] - ROAD_ORDER[b.cat]);
  c.lineCap = 'round';
  for (const r of roads) {
    const base = ROAD_WIDTH_PX[r.cat] || 1;
    const wpx = z >= NEAR_ZOOM ? Math.max(base, (r.width || 4) * cssPerM * 0.85) : z < MID_ZOOM && r.cat === 'normal' ? 0.9 : base;
    c.beginPath();
    c.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) c.lineTo(r.pts[i][0], r.pts[i][1]);
    if (r.bridge && z >= MID_ZOOM) {
      c.strokeStyle = '#0c140e';
      c.lineWidth = px(wpx + 2);
      c.stroke();
    }
    c.strokeStyle = ROAD_COLORS[r.cat] || ROAD_COLORS.normal;
    c.globalAlpha = z < MID_ZOOM && r.cat === 'normal' ? 0.6 : 1;
    c.lineWidth = px(wpx);
    c.stroke();
    c.globalAlpha = 1;
  }
  drawCountryDetail(c, wx0, wy0, wx0 + tws, wy0 + tws, cssPerM, MAP_STYLE);
  drawRailsOnMap(c, state.map, wx0, wy0, wx0 + tws, wy0 + tws, px(z < MID_ZOOM ? 1.6 : 2.6));
  return canvas;
}

function tileKey(L, tx, ty) {
  return L * 1e6 + tx * 1000 + ty;
}

function visibleTiles(L) {
  const tws = tileWorldSize(L);
  const [minx, miny, maxx, maxy] = state.bounds;
  const nx = Math.ceil((maxx - minx) / tws), ny = Math.ceil((maxy - miny) / tws);
  const [x0, y0, x1, y1] = viewRect();
  const out = [];
  const tx0 = Math.max(0, Math.floor((x0 - minx) / tws)), tx1 = Math.min(nx - 1, Math.floor((x1 - minx) / tws));
  const ty0 = Math.max(0, Math.floor((y0 - miny) / tws)), ty1 = Math.min(ny - 1, Math.floor((y1 - miny) / tws));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) out.push([tx, ty]);
  return { tws, out };
}

// The overview tiles over the real map at once; the countryside ones
// arrive through fillTiles within its time budget.
function ensureLevel0() {
  const tws = tileWorldSize(0);
  const [minx, miny, maxx, maxy] = state.bounds;
  const [rx0, ry0, rx1, ry1] = state.real;
  const nx = Math.ceil((maxx - minx) / tws), ny = Math.ceil((maxy - miny) / tws);
  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const ax = minx + tx * tws, ay = miny + ty * tws;
      if (ax > rx1 || ax + tws < rx0 || ay > ry1 || ay + tws < ry0) continue;
      const k = tileKey(0, tx, ty);
      if (!state.tiles.has(k)) state.tiles.set(k, { canvas: renderTile(0, tx, ty), used: 0, L: 0 });
    }
  }
}

function evictTiles() {
  if (state.tiles.size <= MAX_TILES) return;
  const list = [...state.tiles.entries()].filter(([, t]) => t.L !== 0).sort((a, b) => a[1].used - b[1].used);
  for (let i = 0; i < list.length && state.tiles.size > MAX_TILES; i++) {
    state.tiles.delete(list[i][0]);
    if (state.pool.length < 8) state.pool.push(list[i][1].canvas);
  }
}

function drawTiles(ctx, L, list, tws) {
  const [minx, miny] = state.bounds;
  for (const [tx, ty] of list) {
    const t = state.tiles.get(tileKey(L, tx, ty));
    if (!t) continue;
    t.used = state.frame;
    const x0 = Math.round(((minx + tx * tws) * state.scale + state.ox) * state.dpr);
    const y0 = Math.round(((miny + ty * tws) * state.scale + state.oy) * state.dpr);
    const x1 = Math.round(((minx + (tx + 1) * tws) * state.scale + state.ox) * state.dpr);
    const y1 = Math.round(((miny + (ty + 1) * tws) * state.scale + state.oy) * state.dpr);
    ctx.drawImage(t.canvas, x0, y0, x1 - x0, y1 - y0);
  }
}

// Renders missing tiles for the current level within a time budget; returns true when all are ready.
function fillTiles(L) {
  const { out } = visibleTiles(L);
  const missing = out.filter(([tx, ty]) => !state.tiles.has(tileKey(L, tx, ty)));
  if (!missing.length) return true;
  const [ccx, ccy] = [state.cx, state.cy];
  const tws = tileWorldSize(L);
  const [minx, miny] = state.bounds;
  missing.sort((a, b) => {
    const da = (minx + (a[0] + 0.5) * tws - ccx) ** 2 + (miny + (a[1] + 0.5) * tws - ccy) ** 2;
    const db = (minx + (b[0] + 0.5) * tws - ccx) ** 2 + (miny + (b[1] + 0.5) * tws - ccy) ** 2;
    return da - db;
  });
  const t0 = performance.now();
  let done = 0;
  for (const [tx, ty] of missing) {
    if (done > 0 && performance.now() - t0 > TILE_BUDGET_MS) break;
    const r0 = performance.now();
    state.tiles.set(tileKey(L, tx, ty), { canvas: renderTile(L, tx, ty), used: state.frame, L });
    state.perf.tileRenderMs = performance.now() - r0;
    done++;
  }
  evictTiles();
  return done === missing.length;
}

// --- static overlay (labels + static icons), rebuilt with the view ---------

function textBox(cx, cy, w, h, angle) {
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const hw = (w * c + h * s) / 2, hh = (w * s + h * c) / 2;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

function collides(boxes, b) {
  for (const o of boxes) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
  return false;
}

function drawLabel(ctx, text, x, y, color, align) {
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function roadRuns(road) {
  const p = road.pts;
  const runs = [];
  let start = 0, len = 0, prevA = null;
  for (let i = 0; i < p.length - 1; i++) {
    const dx = p[i + 1][0] - p[i][0], dy = p[i + 1][1] - p[i][1];
    const a = Math.atan2(dy, dx);
    let turn = prevA == null ? 0 : Math.abs(a - prevA);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    if (turn > 0.35) {
      runs.push({ a: p[start], b: p[i], len });
      start = i;
      len = 0;
    }
    len += Math.hypot(dx, dy);
    prevA = a;
  }
  runs.push({ a: p[start], b: p[p.length - 1], len });
  return runs;
}

function drawStreetNames(ctx, boxes) {
  const [x0, y0, x1, y1] = viewRect(-20);
  const roads = state.map.queryView(x0, y0, x1, y1).roads;
  const fontPx = state.zoom >= 8 ? 14 : 12;
  ctx.font = `${fontPx}px ${FONT}`;
  const cands = [];
  for (const r of roads) {
    if (!r.name || r.cat === 'foot') continue;
    if (r.cat === 'cycle' && state.zoom < 8) continue;
    if (r._labelRun === undefined) {
      let best = null;
      for (const run of roadRuns(r)) if (!best || run.len > best.len) best = run;
      r._labelRun = best;
    }
    const best = r._labelRun;
    if (!best) continue;
    const mx = (best.a[0] + best.b[0]) / 2, my = (best.a[1] + best.b[1]) / 2;
    if (mx < x0 || mx > x1 || my < y0 || my > y1) continue;
    const chord = Math.hypot(best.b[0] - best.a[0], best.b[1] - best.a[1]) * state.scale;
    cands.push({ r, mx, my, chord, a: best.a, b: best.b, pri: ROAD_ORDER[r.cat] });
  }
  cands.sort((p, q) => q.pri - p.pri || q.chord - p.chord);
  const placedByName = new Map();
  let widthCache = state.textWidths.get(fontPx);
  if (!widthCache) state.textWidths.set(fontPx, widthCache = new Map());
  let placed = 0;
  for (const c of cands) {
    if (placed >= 110) break;
    let w = widthCache.get(c.r.name);
    if (w === undefined) { w = ctx.measureText(c.r.name).width; widthCache.set(c.r.name, w); }
    if (c.chord < w + 14) continue;
    const [sx, sy] = toScreen(c.mx, c.my);
    const prev = placedByName.get(c.r.name);
    if (prev && prev.some(([px, py]) => (px - sx) ** 2 + (py - sy) ** 2 < 320 * 320)) continue;
    let ang = Math.atan2(c.b[1] - c.a[1], c.b[0] - c.a[0]);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    const box = textBox(sx, sy, w + 6, fontPx + 2, ang);
    if (collides(boxes, box)) continue;
    boxes.push(box);
    if (!prev) placedByName.set(c.r.name, [[sx, sy]]); else prev.push([sx, sy]);
    placed++;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.textBaseline = 'middle';
    drawLabel(ctx, c.r.name, 0, 1, c.r.cat === 'major' ? '#f0ede4' : 'rgba(240, 237, 228, 0.85)', 'center');
    ctx.restore();
  }
}

function drawStaticOverlay(ctx) {
  const hover = [];
  const boxes = [];
  const z = state.zoom;
  const onScreen = (sx, sy, m = 20) => sx > -m && sy > -m && sx < state.cw + m && sy < state.ch + m;

  if (layerOn('landmark')) {
    ctx.font = '14px ' + FONT;
    ctx.textBaseline = 'middle';
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      const w = ctx.measureText(l.name).width;
      boxes.push([sx - 7, sy - 8, sx + 11 + w, sy + 8]);
      hover.push({ sx, sy, name: l.name, sub: 'Bezienswaardigheid', teleport: { x: l.x, y: l.y, name: l.name } });
    }
  }

  // villages out in the Ommelanden
  {
    const [vx0, vy0, vx1, vy1] = viewRect(60);
    ctx.font = `${z < MID_ZOOM ? 12 : 14}px ${FONT}`;
    ctx.textBaseline = 'middle';
    for (const v of villageLabels(vx0, vy0, vx1, vy1)) {
      const [sx, sy] = toScreen(v.x, v.y);
      const label = v.name.toUpperCase();
      const w = ctx.measureText(label).width;
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (collides(boxes, box)) continue;
      boxes.push(box);
      drawLabel(ctx, label, sx, sy, 'rgba(240, 237, 228, 0.8)', 'center');
      hover.push({ sx, sy, name: v.name, sub: 'Dorp in het Ommeland' });
    }
  }

  if (layerOn('wijken') && z < 6) {
    ctx.font = `${z < MID_ZOOM ? 12 : 15}px ${FONT}`;
    ctx.textBaseline = 'middle';
    const alpha = z < 3 ? 0.55 : 0.55 - (z - 3) * 0.12;
    for (const p of state.map.meta.neighbourhoodPoints || []) {
      const [sx, sy] = toScreen(p.x, p.y);
      if (!onScreen(sx, sy, 80)) continue;
      const label = p.name.toUpperCase();
      const w = ctx.measureText(label).width;
      const box = [sx - w / 2 - 2, sy - 8, sx + w / 2 + 2, sy + 8];
      if (collides(boxes, box)) continue;
      boxes.push(box);
      drawLabel(ctx, label, sx, sy, `rgba(240, 237, 228, ${alpha.toFixed(2)})`, 'center');
      hover.push({ sx, sy, name: p.name, sub: 'Wijk', teleport: { x: p.x, y: p.y, name: p.name } });
    }
  }

  if (layerOn('streets') && z >= NEAR_ZOOM) drawStreetNames(ctx, boxes);

  if (layerOn('horeca') && z >= MID_ZOOM) {
    const cellPx = z >= NEAR_ZOOM * 2 ? 0.1 : z >= NEAR_ZOOM ? 18 : 34;
    for (const h of declutter(getHorecaForRender(), cellPx / state.scale)) {
      const [sx, sy] = toScreen(h.x, h.y);
      if (!onScreen(sx, sy)) continue;
      drawMapIcon(ctx, 'horeca', sx, sy, ICON, { t: 0 });
      hover.push({ sx, sy, name: h.name || 'Horeca', sub: 'Horeca' });
    }
  }
  if (layerOn('flitspaal') && z >= MID_ZOOM) {
    for (const f of state.world.flitspaalen || []) {
      const [sx, sy] = toScreen(f.x, f.y);
      if (!onScreen(sx, sy)) continue;
      drawMapIcon(ctx, 'flitspaal', sx, sy, ICON, { t: 0 });
      hover.push({ sx, sy, name: 'Flitspaal' });
    }
  }
  if (layerOn('landmark')) {
    ctx.font = '14px ' + FONT;
    ctx.textBaseline = 'middle';
    for (const l of state.map.meta.landmarks || []) {
      const [sx, sy] = toScreen(l.x, l.y);
      if (!onScreen(sx, sy, 120)) continue;
      drawMapIcon(ctx, 'landmark', sx, sy, ICON, { t: 0 });
      drawLabel(ctx, l.name, sx + 9, sy + 1, '#f5f0e6', 'left');
    }
  }
  state.staticHover = hover;
}

function compose() {
  const t0 = performance.now();
  const c = state.composeCtx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, state.compose.width, state.compose.height);
  c.fillStyle = COUNTRY;
  c.fillRect(0, 0, state.compose.width, state.compose.height);
  c.imageSmoothingEnabled = true;

  if (!state.level0) { state.level0 = true; ensureLevel0(); }
  const L = levelFor(state.zoom);
  const ready = fillTiles(L);
  const { tws, out } = visibleTiles(L);
  if (!ready) {
    const v0 = visibleTiles(0);
    drawTiles(c, 0, v0.out, v0.tws);
  }
  drawTiles(c, L, out, tws);

  if (getSettings().showFog) {
    const f = state.fog;
    const [sx, sy] = toScreen(f.minx, f.miny);
    const size = FOG_CELL * state.scale * state.dpr;
    c.drawImage(f.canvas, sx * state.dpr, sy * state.dpr, f.w * size, f.h * size);
  }

  const t1 = performance.now();
  c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawStaticOverlay(c);
  state.perf.tilesMs = t1 - t0;
  state.perf.overlayMs = performance.now() - t1;
  state.dirty = !ready;
  state.perf.composeMs = performance.now() - t0;
}

// --- dynamic layer ----------------------------------------------------------

function drawDynamicMarkers(ctx, world) {
  const t = performance.now() / 1000;
  const hover = [];
  const z = state.zoom;
  const icon = (layer, kind, x, y, name, opts, sub) => {
    if (layer && !layerOn(layer)) return;
    const [sx, sy] = toScreen(x, y);
    if (sx < -20 || sy < -20 || sx > state.cw + 20 || sy > state.ch + 20) return;
    drawMapIcon(ctx, kind, sx, sy, ICON, { t, ...opts });
    if (name) hover.push({ sx, sy, name, sub });
  };

  drawFullRoute(ctx, world, t);

  for (const g of getGaragesForRender()) icon('garage', 'garage', g.x, g.y, g.name || 'Garage');

  const m = world.mission;
  const job = world.sideJob && world.sideJob.active ? world.sideJob : null;
  if (job) {
    for (const d of job.dots) icon(null, 'sj-dot', d.x, d.y, d.label || job.label);
    if (job.marker) icon(null, 'sj-target', job.marker.x, job.marker.y, job.label, {}, job.goal ? job.goal.label : 'Klus');
  }
  if (m && m.marker && m.phase !== 'cooldown' && layerOn('mission') && !job) {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), ICON);
      for (const w of wps) icon(null, 'waypoint', w.x, w.y, 'Checkpoint');
    }
    icon(null, m.phase === 'active' ? 'missionActive' : 'missionIdle', m.marker.x, m.marker.y,
      m.label || 'Missie', {}, m.phase === 'active' ? 'Missiedoel' : 'Missie starten');
  }

  for (const o of getOwnedVehiclesForMap(world)) icon('car', 'own', o.x, o.y, 'Jouw ' + o.label, { vkind: o.kind, color: o.color });
  for (const sh of getShopsDecluttered(z >= NEAR_ZOOM ? 1 : 26 / state.scale)) icon(SHOP_TYPES[sh.type].group, 'shop-' + sh.type, sh.x, sh.y, sh.name, {}, SHOP_TYPES[sh.type].label);
  for (const ps of getPigeonSpotsForRender()) icon('duif', 'pigeon', ps.x, ps.y, ps.name, {}, 'Word een duif');
  for (const sj of getSideJobSpotsForRender()) icon('bijbaan', 'sj-' + sj.job.id, sj.x, sj.y, sj.job.name, {}, 'Bijbaantje: ' + sj.job.blurb.toLowerCase());
  for (const st of getStationsForRender()) icon('trein', 'station', st.x, st.y, st.name, {}, 'Reizen met de trein');

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) icon('companion', 'companion', c.x, c.y, c.character === 'tammo' ? 'Tammo' : 'Anita', {}, 'Maat');

  const search = getPoliceSearch(world);
  if (search) {
    const [sx, sy] = toScreen(search.x, search.y);
    drawSearchArea(ctx, sx, sy, search.r * state.scale, t);
  }
  forEachPoliceUnit(world, (x, y) => icon(null, 'police', x, y, 'Politie'));

  const wp = getUserWaypoint();
  if (wp) icon(null, 'userWaypoint', wp.x, wp.y, 'Bestemming', {}, wp.name ? `${wp.name} · klik of rechtsklik om te wissen` : 'klik of rechtsklik om te wissen');

  icon(null, 'player', world.player.x, world.player.y, 'Jij', { angle: world.player.angle });
  state.dynHover = hover;
}

// GTA-style GPS line over the whole route, thick enough to read at every
// zoom level; without a road route (boat, off the network) a dashed line
// points straight at the destination instead.
function drawFullRoute(ctx, world, t) {
  const route = getActiveRoute();
  if (!route) return;
  const color = ROUTE_COLORS[route.kind] || ROUTE_COLORS.user;
  const width = Math.max(4, Math.min(9, 3 + state.zoom * 0.7));
  const ahead = getRouteAhead(Infinity);
  if (ahead && ahead.length > 1) {
    const pts = [[world.player.x, world.player.y], ...ahead].map(([x, y]) => toScreen(x, y));
    drawRoadRoute(ctx, pts, color, width);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 14]);
    ctx.lineDashOffset = -t * 18;
    ctx.lineWidth = Math.max(1.5, width * 0.35);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.stroke();
    ctx.restore();
    return;
  }
  const tg = route.target;
  if (!tg) return;
  const [ax, ay] = toScreen(world.player.x, world.player.y);
  const [bx, by] = toScreen(tg.x, tg.y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.setLineDash([8, 7]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.8)';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function niceScale(maxPx) {
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000];
  let best = steps[0];
  for (const s of steps) if (s * state.scale <= maxPx) best = s;
  return best;
}

function drawChrome(ctx) {
  const x = 22, y = 24;
  ctx.save();
  ctx.translate(state.cw - 30, y + 6);
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 20, 14, 0.85)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(63, 201, 122, 0.6)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(5, 2);
  ctx.lineTo(0, -1);
  ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fillStyle = '#3fc97a';
  ctx.fill();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f0ede4';
  ctx.fillText('N', 0, 9);
  ctx.restore();

  const meters = niceScale(130);
  const w = meters * state.scale;
  const by = state.ch - 18;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 20, 14, 0.75)';
  ctx.fillRect(x - 8 + 46, by - 18, w + 60, 26);
  ctx.strokeStyle = '#f0ede4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 46, by - 5);
  ctx.lineTo(x + 46, by);
  ctx.lineTo(x + 46 + w, by);
  ctx.lineTo(x + 46 + w, by - 5);
  ctx.stroke();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#f0ede4';
  ctx.fillText(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, x + 52 + w, by + 3);
  ctx.restore();
}

// --- search -----------------------------------------------------------------

function buildSearchIndex(world) {
  const entries = [];
  const byName = new Map();
  for (const r of world.map.roads) {
    if (!r.name || r.pts.length < 2) continue;
    let len = 0;
    for (let i = 1; i < r.pts.length; i++) len += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
    const cur = byName.get(r.name);
    if (!cur || len > cur.len) byName.set(r.name, { r, len });
  }
  for (const [name, { r }] of byName) {
    const mid = r.pts[Math.floor(r.pts.length / 2)];
    const prev = r.pts[Math.max(0, Math.floor(r.pts.length / 2) - 1)];
    entries.push({ label: name, kind: 'Straat', pri: 2, x: (mid[0] + prev[0]) / 2, y: (mid[1] + prev[1]) / 2, zoom: 7 });
  }
  for (const l of world.map.meta.landmarks || []) entries.push({ label: l.name, kind: 'Bezienswaardigheid', pri: 0, x: l.x, y: l.y, zoom: 6 });
  for (const p of world.map.meta.neighbourhoodPoints || []) entries.push({ label: p.name, kind: 'Wijk', pri: 1, x: p.x, y: p.y, zoom: 4 });
  for (const h of world.map.meta.horeca || []) if (h.name) entries.push({ label: h.name, kind: 'Horeca', pri: 3, x: h.x, y: h.y, zoom: 8 });
  for (const g of getGaragesForRender()) entries.push({ label: g.name, kind: 'Garage', pri: 4, x: g.x, y: g.y, zoom: 7 });
  for (const sh of getShopsForRender()) entries.push({ label: sh.name, kind: SHOP_TYPES[sh.type].label, pri: 3, x: sh.x, y: sh.y, zoom: 8 });
  for (const sj of getSideJobSpotsForRender()) entries.push({ label: sj.job.name, kind: 'Bijbaantje', pri: 1, x: sj.x, y: sj.y, zoom: 8 });
  for (const st of getStationsForRender()) entries.push({ label: st.name, kind: 'Treinstation', pri: 0, x: st.x, y: st.y, zoom: 7 });
  for (const e of entries) {
    e.norm = normalize(e.label);
    e.compact = e.norm.replace(/ /g, '');
  }
  return entries;
}

function search(q) {
  const n = normalize(q);
  if (!n) return [];
  const res = [];
  for (const e of state.searchIndex) {
    let score;
    if (e.norm.startsWith(n)) score = 0;
    else if ((' ' + e.norm).includes(' ' + n)) score = 1;
    else if (e.norm.includes(n)) score = 2;
    else if (e.compact.includes(n.replace(/ /g, ''))) score = 3;
    else continue;
    res.push({ e, score });
  }
  res.sort((a, b) => a.score - b.score || a.e.pri - b.e.pri || a.e.label.length - b.e.label.length);
  return res.slice(0, 8).map((r) => r.e);
}

function renderResults() {
  const ul = state.results;
  const q = state.searchInput.value;
  state.found = search(q);
  state.sel = state.found.length ? Math.min(state.sel, state.found.length - 1) : -1;
  ul.innerHTML = '';
  if (!q.trim()) { ul.hidden = true; return; }
  if (!state.found.length) {
    ul.innerHTML = '<li class="empty">Niets gevonden</li>';
    ul.hidden = false;
    return;
  }
  state.found.forEach((e, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === state.sel));
    const a = document.createElement('span');
    a.textContent = e.label;
    const b = document.createElement('span');
    b.className = 'kind';
    b.textContent = e.kind;
    li.append(a, b);
    li.addEventListener('mousedown', (ev) => { ev.preventDefault(); chooseResult(e); });
    ul.appendChild(li);
  });
  ul.hidden = false;
}

function chooseResult(e) {
  const map = state.map;
  const spot = map.nearestRoadPoint(e.x, e.y, 120) || { x: e.x, y: e.y };
  setUserWaypoint(spot.x, spot.y, e.label);
  centreOn(spot.x, spot.y, e.zoom);
  state.searchInput.value = '';
  state.results.hidden = true;
  state.searchInput.blur();
}

// --- interaction ------------------------------------------------------------

function nearestHover(sx, sy) {
  let best = null, bestD2 = HOVER_PX * HOVER_PX;
  for (const list of [state.dynHover, state.staticHover]) {
    for (const h of list || []) {
      const d2 = (h.sx - sx) ** 2 + (h.sy - sy) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = h; }
    }
    if (best) return best;
  }
  return null;
}

function streetAt(wx, wy, radiusM) {
  let best = null, bestD2 = radiusM * radiusM;
  for (const r of state.map.roadsNear(wx, wy, radiusM)) {
    if (!r.name) continue;
    const p = r.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 1e-9 ? ((wx - ax) * dx + (wy - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d2 = (ax + dx * t - wx) ** 2 + (ay + dy * t - wy) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = r.name; }
    }
  }
  return best;
}

function wijkAt(wx, wy) {
  let best = null, bestD2 = Infinity;
  for (const p of state.map.meta.neighbourhoodPoints || []) {
    const d2 = (p.x - wx) ** 2 + (p.y - wy) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p.name; }
  }
  return best;
}

function updateTooltip(sx, sy) {
  const tip = state.tooltip;
  const h = nearestHover(sx, sy);
  state.canvas.classList.toggle('pointing', !!h);
  let main = '', sub = '';
  if (h) {
    main = h.name;
    sub = h.sub || '';
  } else {
    const [wx, wy] = toWorld(sx, sy);
    const [minx, miny, maxx, maxy] = state.real;
    if (wx < minx || wy < miny || wx > maxx || wy > maxy) {
      const v = villageLabels(wx - 150, wy - 150, wx + 150, wy + 150).find((q) => Math.hypot(q.x - wx, q.y - wy) < q.r);
      main = v ? v.name : 'Ommeland';
      sub = v ? 'Dorp in het Ommeland' : '';
    } else {
      main = streetAt(wx, wy, Math.max(4, 10 / state.scale)) || '';
      sub = wijkAt(wx, wy) || '';
      if (!main) { main = sub; sub = ''; }
    }
  }
  if (!main) { tip.style.display = 'none'; return; }
  tip.textContent = main;
  if (sub) {
    const s = document.createElement('span');
    s.className = 'sub';
    s.textContent = sub;
    tip.appendChild(s);
  }
  tip.style.left = sx + 'px';
  tip.style.top = sy + 'px';
  tip.style.display = 'block';
}

function teleportTo(world, target) {
  const vehicle = world.player.inVehicle;
  if (vehicle && vehicle.isBoat) {
    world.addMessage('Met een boot kun je niet teleporteren', 2.5);
    return;
  }
  const spot = world.map.findOpenSpawn(target.x, target.y, 400) || { x: target.x, y: target.y };
  const sx = spot.x, sy = spot.y;
  if (vehicle) {
    vehicle.x = sx;
    vehicle.y = sy;
    vehicle.speed = 0;
  }
  world.player.x = sx;
  world.player.y = sy;
  world.addMessage(`Geteleporteerd naar ${target.name}`, 3);
  if (closeHandler) closeHandler();
  else closeMap();
}

function handleClick(world, sx, sy, shift) {
  const h = nearestHover(sx, sy);
  const [wx, wy] = toWorld(sx, sy);
  if (shift) {
    if (h && h.teleport) teleportTo(world, h.teleport);
    else teleportTo(world, { x: wx, y: wy, name: streetAt(wx, wy, 60) || wijkAt(wx, wy) || 'deze plek' });
    return;
  }
  const wp = getUserWaypoint();
  if (wp) {
    const [px, py] = toScreen(wp.x, wp.y);
    if ((px - sx) ** 2 + ((py - 8) - sy) ** 2 < 14 * 14) {
      clearUserWaypoint();
      updateTooltip(sx, sy);
      return;
    }
  }
  const spot = state.map.nearestRoadPoint(wx, wy, 60);
  const x = spot && Math.hypot(spot.x - wx, spot.y - wy) < 30 ? spot.x : wx;
  const y = spot && Math.hypot(spot.x - wx, spot.y - wy) < 30 ? spot.y : wy;
  const name = (h && h.name !== 'Jij' ? h.name : null) || streetAt(x, y, 40) || wijkAt(x, y) || '';
  setUserWaypoint(x, y, name);
}

function canvasPos(e) {
  const r = state.canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function handleKeys(dt, world) {
  const input = world.input;
  if (document.activeElement === state.searchInput) return;
  let px = 0, py = 0;
  if (input.isDown('a') || input.isDown('arrowleft')) px -= 1;
  if (input.isDown('d') || input.isDown('arrowright')) px += 1;
  if (input.isDown('w') || input.isDown('arrowup')) py -= 1;
  if (input.isDown('s') || input.isDown('arrowdown')) py += 1;
  if (px || py) {
    const speed = 700 * dt / state.scale;
    state.cx += px * speed;
    state.cy += py * speed;
    updateTransform();
  }
  if (input.wasPressed(' ')) centreOn(world.player.x, world.player.y, 3);
}

// --- lifecycle --------------------------------------------------------------

const LEGEND = [
  { kind: 'player', label: 'Jij' },
  { kind: 'userWaypoint', label: 'Jouw bestemming', note: 'altijd zichtbaar' },
  { kind: 'route', label: 'Route', note: 'altijd zichtbaar' },
  { kind: 'companion', label: 'Maat', layer: 'companion' },
  { kind: 'own', label: 'Jouw voertuigen', note: 'auto, fiets, e-step, boot', layer: 'car' },
  { kind: 'missionIdle', label: 'Missie', note: 'start, doel en checkpoints', layer: 'mission' },
  { kind: 'garage', label: 'Garage en pomp', note: 'rij naar binnen: repareren, spuiten, opvoeren, wrakken', layer: 'garage' },
  { kind: 'horeca', label: 'Horeca', layer: 'horeca' },
  { kind: 'shop-kleding', label: 'Winkels', note: 'kleding, kapper, loten, super, snacks (eten = gezondheid)', layer: 'shops' },
  { kind: 'shop-fietsen', label: 'Voertuigwinkels', note: 'fietsen, auto\'s, tuning, boten', layer: 'shopsVoertuigen' },
  { kind: 'shop-wapens', label: 'Wapens & pandjeshuis', note: 'wapens, munitie en vesten', layer: 'shopsWapens' },
  { kind: 'pigeon', label: 'Duiven', note: 'word een duif', layer: 'duif' },
  { kind: 'sj-taxi', label: 'Bijbaantjes', note: 'bezorgen, taxi, bus, rondvaart, fietsdepot, verhuizen', layer: 'bijbaan' },
  { kind: 'station', label: 'Treinstation', note: 'reizen met de trein', layer: 'trein' },
  { kind: 'flitspaal', label: 'Flitspaal', layer: 'flitspaal' },
  { kind: 'landmark', label: 'Bezienswaardigheid', layer: 'landmark' },
  { kind: 'text-street', label: 'Straatnamen', layer: 'streets' },
  { kind: 'text-wijk', label: 'Wijknamen', layer: 'wijken' },
  { kind: 'buildings', label: 'Gebouwen', layer: 'buildings' },
];

function drawLegendIcon(ctx, kind) {
  if (kind === 'route') {
    drawRoadRoute(ctx, [[3, 16], [11, 10], [21, 12]], ROUTE_COLORS.user, 3.5);
    drawRoadRoute(ctx, [[3, 21], [21, 19]], ROUTE_COLORS.mission, 3.5);
  } else if (kind === 'userWaypoint') {
    drawMapIcon(ctx, 'userWaypoint', 12, 20, ICON, { t: 0 });
  } else if (kind === 'text-street' || kind === 'text-wijk') {
    ctx.font = `${kind === 'text-wijk' ? 11 : 13}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = kind === 'text-wijk' ? 'rgba(240, 237, 228, 0.6)' : '#f0ede4';
    ctx.fillText(kind === 'text-wijk' ? 'WIJK' : 'Abc', 12, 13);
  } else if (kind === 'buildings') {
    ctx.fillStyle = BUILDING;
    ctx.fillRect(5, 6, 8, 7);
    ctx.fillRect(14, 9, 6, 10);
    ctx.fillRect(4, 15, 8, 5);
  } else {
    drawMapIcon(ctx, kind, 12, 12, ICON, { t: 0 });
  }
}

function buildLegend(root) {
  const dpr = window.devicePixelRatio || 1;
  const list = document.createElement('ul');
  for (const row of LEGEND) {
    const li = document.createElement('li');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 24 * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLegendIcon(ctx, row.kind);
    const span = document.createElement('span');
    span.textContent = row.label;
    if (row.kind === 'companion') state.legendMaat = span;
    li.append(cv, span);
    if (row.note) {
      const n = document.createElement('span');
      n.className = 'note';
      n.textContent = row.note;
      span.append(document.createElement('br'), n);
    }
    if (row.layer) {
      li.setAttribute('role', 'checkbox');
      li.tabIndex = 0;
      li.setAttribute('aria-checked', String(layerOn(row.layer)));
      li.title = 'Klik om aan/uit te zetten (kaart en minimap)';
      const box = document.createElement('span');
      box.className = 'chk';
      box.setAttribute('aria-hidden', 'true');
      li.appendChild(box);
      li.dataset.layer = row.layer;
      const toggle = () => {
        const on = !layerOn(row.layer);
        setLayer(row.layer, on);
        li.setAttribute('aria-checked', String(on));
      };
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', (e) => {
        if (e.target !== li || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
    }
    list.appendChild(li);
  }
  root.innerHTML = '<h3>LEGENDA</h3><p class="hint">Vink aan wat je op de kaart en de minimap wilt zien.</p>' +
    '<p class="all"><button type="button" data-all="1">Alles aan</button> · <button type="button" data-all="0">Alles uit</button></p>';
  for (const b of root.querySelectorAll('[data-all]')) {
    b.addEventListener('click', () => {
      const on = b.dataset.all === '1';
      for (const li of list.querySelectorAll('li[data-layer]')) {
        setLayer(li.dataset.layer, on);
        li.setAttribute('aria-checked', String(on));
      }
    });
  }
  root.appendChild(list);
}

function openMap(world) {
  ensureCountryEdge(world.map);
  state.open = true;
  state.overlay.classList.add('open');
  sizeCanvas();
  ensureLevel0();
  state.dirty = true;
  const c = world.companion;
  if (state.legendMaat) state.legendMaat.textContent = c ? `Maat (${c.character === 'tammo' ? 'Tammo' : 'Anita'})` : 'Maat';
}

function closeMap() {
  state.open = false;
  state.overlay.classList.remove('open');
  state.tooltip.style.display = 'none';
  state.drag = null;
  state.canvas.classList.remove('dragging');
  state.searchInput.blur();
  state.results.hidden = true;
}

function updateHeader() {
  const route = getActiveRoute();
  const wp = getUserWaypoint();
  state.clearBtn.hidden = !wp;
  let html = '';
  if (route) {
    const label = route.kind === 'user' ? 'Bestemming' : route.kind === 'job' ? 'Klus' : 'Missie';
    html = `<span class="${route.kind}">${label}: ${formatDistance(route.remaining)}</span>`;
  }
  if (html !== state.routeHtml) {
    state.routeHtml = html;
    state.routeEl.innerHTML = html;
  }
}

function render(world) {
  const t0 = performance.now();
  state.frame++;
  if (state.dirty) compose();
  const { ctx } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.drawImage(state.compose, 0, 0);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawDynamicMarkers(ctx, world);
  drawChrome(ctx);
  updateHeader();
  const ms = performance.now() - t0;
  const perf = state.perf;
  perf.frameMs = ms;
  perf.maxMs = Math.max(perf.maxMs, ms);
  perf.avgMs = perf.avgMs * 0.95 + ms * 0.05;
}

export function initMapView(world) {
  if (state) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'mapview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Kaart van Groningen');
  overlay.innerHTML =
    '<div class="mapview-header"><span class="mapview-title">KAART VAN GRONINGEN</span>' +
    '<div class="mapview-search"><input type="search" placeholder="Zoek straat of plek…" aria-label="Zoek straat of plek" autocomplete="off" spellcheck="false">' +
    '<ul class="mapview-results" role="listbox" hidden></ul></div>' +
    '<button type="button" class="mapview-btn" data-act="centre">Centreer op mij</button>' +
    '<button type="button" class="mapview-btn ghost" data-act="clear" hidden>Bestemming wissen</button>' +
    '<span class="mapview-route"></span></div>' +
    '<div class="mapview-body"><canvas class="mapview-canvas"></canvas>' +
    '<div class="mapview-zoom"><button type="button" data-act="in" aria-label="Inzoomen">+</button><button type="button" data-act="out" aria-label="Uitzoomen">−</button></div>' +
    '<div class="mapview-tooltip"></div><aside class="mapview-legend"></aside></div>' +
    '<div class="mapview-footer"><b>Klik</b> bestemming zetten · <b>Rechtsklik</b> wissen · <b>Shift+klik</b> teleporteren · ' +
    '<b>Scroll / + −</b> zoomen · <b>Slepen / WASD</b> verschuiven · <b>Spatie</b> centreren · <b>Del</b> bestemming wissen · <b>Q / E</b> tabblad · <b>M / Esc</b> sluiten</div>';
  document.body.appendChild(overlay);

  const compose = document.createElement('canvas');
  state = {
    open: false,
    world,
    map: world.map,
    real: world.map.meta.bounds,
    bounds: world.map.meta.bounds.map((v, i) => v + (i < 2 ? -COUNTRY_MARGIN : COUNTRY_MARGIN)),
    overlay,
    canvas: overlay.querySelector('canvas'),
    tooltip: overlay.querySelector('.mapview-tooltip'),
    searchInput: overlay.querySelector('.mapview-search input'),
    results: overlay.querySelector('.mapview-results'),
    clearBtn: overlay.querySelector('[data-act="clear"]'),
    routeEl: overlay.querySelector('.mapview-route'),
    routeHtml: null,
    compose,
    composeCtx: compose.getContext('2d'),
    tiles: new Map(),
    textWidths: new Map(),
    pool: [],
    baseScale: 0,
    tileDpr: 0,
    zoom: 1,
    cx: null,
    cy: null,
    scale: 1,
    ox: 0,
    oy: 0,
    cw: 1,
    ch: 1,
    dpr: window.devicePixelRatio || 1,
    dirty: true,
    frame: 0,
    staticHover: [],
    dynHover: [],
    drag: null,
    found: [],
    sel: -1,
    legendMaat: null,
    perf: { composeMs: 0, frameMs: 0, avgMs: 0, maxMs: 0 },
  };
  state.ctx = state.canvas.getContext('2d');
  state.canvas.tabIndex = -1;
  state.searchIndex = buildSearchIndex(world);
  initFog(world);
  buildLegend(overlay.querySelector('.mapview-legend'));
  onSettingsChange((s, key) => { if (key === 'showFog') state.dirty = true; });

  overlay.addEventListener('mousedown', (e) => e.stopPropagation());

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'centre') centreOn(world.player.x, world.player.y, 3);
    else if (act === 'clear') clearUserWaypoint();
    else if (act === 'in') zoomAt(1.6, state.cw / 2, state.ch / 2);
    else if (act === 'out') zoomAt(1 / 1.6, state.cw / 2, state.ch / 2);
  });

  const si = state.searchInput;
  for (const type of ['keydown', 'keyup', 'keypress']) {
    si.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type !== 'keydown') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!state.found.length) return;
        state.sel = (state.sel + (e.key === 'ArrowDown' ? 1 : -1) + state.found.length) % state.found.length;
        renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = state.found[Math.max(0, state.sel)];
        if (pick) chooseResult(pick);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (si.value) { si.value = ''; renderResults(); } else si.blur();
      }
    });
  }
  si.addEventListener('input', () => { state.sel = 0; renderResults(); });
  si.addEventListener('focus', () => { world.input.reset(); si.select(); renderResults(); });
  si.addEventListener('blur', () => { state.results.hidden = true; });

  const cv = state.canvas;
  cv.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (document.activeElement === si) si.blur();
    const [sx, sy] = canvasPos(e);
    state.drag = { sx, sy, cx: state.cx, cy: state.cy, moved: false };
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.open) return;
    const [sx, sy] = canvasPos(e);
    const d = state.drag;
    // released outside the window (no mouseup arrives): stop dragging instead
    // of leaving the map glued to the cursor
    if (d && !(e.buttons & 1)) { endDrag(); return; }
    if (d) {
      if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) > DRAG_PX) {
        d.moved = true;
        cv.classList.add('dragging');
        state.tooltip.style.display = 'none';
      }
      if (d.moved) {
        state.cx = d.cx - (sx - d.sx) / state.scale;
        state.cy = d.cy - (sy - d.sy) / state.scale;
        updateTransform();
      }
      return;
    }
    if (e.target === cv) updateTooltip(sx, sy);
  });
  const endDrag = () => {
    state.drag = null;
    cv.classList.remove('dragging');
  };
  window.addEventListener('blur', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); });
  // capture phase: the pause menu stops mouseup from bubbling to window
  window.addEventListener('mouseup', (e) => {
    const d = state.drag;
    if (!d || e.button !== 0) return;
    endDrag();
    if (!d.moved && state.open) {
      const [sx, sy] = canvasPos(e);
      handleClick(world, sx, sy, e.shiftKey);
    }
  }, true);
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!state.open || !getUserWaypoint()) return;
    clearUserWaypoint();
    const [sx, sy] = canvasPos(e);
    updateTooltip(sx, sy);
  });
  cv.addEventListener('mouseleave', () => { state.tooltip.style.display = 'none'; });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const [sx, sy] = canvasPos(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-dy * 0.0018), sx, sy);
    state.tooltip.style.display = 'none';
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (!state.open || e.target === si) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      clearUserWaypoint();
      return;
    }
    const zin = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
    const zout = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract';
    if (!zin && !zout) return;
    e.preventDefault();
    zoomAt(zin ? 1.35 : 1 / 1.35, state.cw / 2, state.ch / 2);
  });

  window.addEventListener('resize', () => {
    if (!state.open) return;
    sizeCanvas();
    ensureLevel0();
  });
}

export function isMapOpen() {
  return !!(state && state.open);
}

let closeHandler = null;

export function setMapCloseHandler(fn) {
  closeHandler = fn;
}

// Re-parents the map UI into a host element (the pause menu's Kaart panel).
export function mountMapView(host) {
  if (!state || !host) return;
  state.overlay.classList.add('embedded');
  host.appendChild(state.overlay);
}

export function setMapActive(world, on) {
  if (!state || on === state.open) return;
  if (on) {
    openMap(world);
    centreOn(world.player.x, world.player.y, 2);
    state.canvas.focus({ preventScroll: true });
  } else closeMap();
}

export function getMapViewStats() {
  if (!state) return null;
  return { ...state.perf, zoom: state.zoom, tiles: state.tiles.size, level: levelFor(state.zoom) };
}

export function setMapView(x, y, zoom) {
  if (!state) return;
  if (zoom) state.zoom = zoom;
  centreOn(x, y);
}

export function updateMapView(dt, world) {
  if (!state) return;
  updateFog(world);
  updateRouting(dt, world);
  if (!state.open) return;
  handleKeys(dt, world);
  render(world);
}
