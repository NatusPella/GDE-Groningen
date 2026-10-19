// One style table for the 2D maps (docs: issue #112): the minimap, the full
// map, the province's pre-rendered pyramid (scripts/world/province_map.mjs
// imports this file too) and the sea in regions.js read their colours, road
// widths, draw order and zoom rules from here. No imports and no DOM, so
// Node scripts can load it. Two palettes: "map" (the full map and the
// pyramid, a dark calm land) and "mini" (the minimap, lighter so it reads
// at 150 px). Both share the same keys.

export const MAP_PALETTE = {
  meadow: '#243528', park: '#2f5c36', ditch: '#2d6a86', water: '#2d6a86', waterEdge: '#4a8fae',
  road: '#c7c7c2', major: '#f0ede4', minor: '#8f9095', cycle: '#b8703a', foot: '#6d6f66',
  building: 'rgba(160, 156, 146, 0.62)', church: 'rgba(214, 205, 180, 0.8)', tree: '#1d3a23', village: '#2b4230',
  allot: '#2f4f33', sports: '#2f5c36', business: '#333a36', rail: '#55524c', railTie: '#d8d4c8', turbine: '#e8eae8',
  forest: '#244a2c',
  roadMin: 1.4, majorMin: 2.4,
};
// the minimap matches the city minimap (hud_panel.js): its road colours and
// widths (real width, 3 m at least), cycleways in red, buildings in a varied palette
export const MINI_PALETTE = {
  meadow: '#3e4c39', park: '#5a8445', ditch: '#3a86a8', water: '#3a86a8', waterEdge: '#5aa0c0',
  road: '#a8ada2', major: '#f0ede4', minor: '#a8ada2', cycle: '#c9603f', foot: '#a8ada2',
  building: '#b98a6a', buildings: ['#b98a6a', '#9a8a7a', '#c9a876', '#8a96a0', '#a88a9a'], roadMetres: 3, church: '#8a8474', tree: '#34562c', village: '#4b5c41',
  allot: '#55733f', sports: '#5a8445', business: '#8a96a0', rail: '#55524c', railTie: '#d8d4c8', turbine: '#f0f0ee',
  forest: '#34562c',
  roadMin: 3, majorMin: 3,
};

// travel-mode highlights, the same on every map (the two that draw them)
export const EMPHASIS = { foot: '#d9d4c4', cycle: '#ff8a5c', forbidden: '#d93f3f', bridgeCasing: '#0c140e' };

// the sea outside the coast: the map's water, or the minimap's
export function seaStyle(palette = MAP_PALETTE) { return { fill: palette.water, edge: palette.waterEdge }; }

// draw order of the road classes, bottom to top
export const ROAD_ORDER = { foot: 0, cycle: 1, minor: 2, normal: 3, major: 4 };
// base width in css px on the full map
export const ROAD_WIDTH_PX = { major: 2.4, normal: 1.4, minor: 1.0, cycle: 0.9, foot: 0.6 };

// zoom thresholds of the full map
export const ZOOM = { mid: 2, near: 4, building: 2.8 };

export function roadColor(cat, palette = MAP_PALETTE) {
  return cat === 'normal' ? palette.road : palette[cat] || palette.road;
}

// What the full map draws at a zoom: the one layer rule. Roads below "mid"
// are only the main and normal classes; buildings from "building"; real road
// widths from "near".
export function layersAtZoom(z) {
  return {
    roads: z < ZOOM.mid ? ['major', 'normal'] : ['major', 'normal', 'minor', 'cycle', 'foot'],
    buildings: z >= ZOOM.building,
    bridgeCasing: z >= ZOOM.mid,
    realRoadWidth: z >= ZOOM.near,
    waterEdgePx: z < ZOOM.mid ? 1.2 : 0.8,
    railPx: z < ZOOM.mid ? 1.6 : 2.6,
    normalRoadAlpha: z < ZOOM.mid ? 0.6 : 1,
  };
}

// a road's width in css px on the full map
export function roadWidthPx(cat, z, widthM, cssPerM) {
  const base = ROAD_WIDTH_PX[cat] || 1;
  if (z >= ZOOM.near) return Math.max(base, (widthM || 4) * cssPerM * 0.85);
  return z < ZOOM.mid && cat === 'normal' ? 0.9 : base;
}

// [r, g, b, a 0..255] for the pyramid's raster
export function toRgba(color, alpha = 255) {
  if (color[0] === '#') return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), alpha];
  const m = /rgba?\(([^)]+)\)/.exec(color).slice(1)[0].split(',').map(Number);
  return [m[0], m[1], m[2], m.length > 3 ? Math.round(m[3] * 255) : alpha];
}

// --- day and night ---------------------------------------------------------
// At night the maps step down: the land and water darker, roads and
// buildings less so (they have to stay readable), everything a touch blue.
// A palette changes in place (the renderers hold the objects) and only when
// the phase flips, so the caches that depend on it are flushed once.
const NIGHT_FACTOR = {
  meadow: 0.58, park: 0.6, ditch: 0.62, water: 0.62, waterEdge: 0.7, forest: 0.6, tree: 0.7, village: 0.65, allot: 0.62, sports: 0.6, business: 0.7,
  road: 0.78, major: 0.86, minor: 0.78, cycle: 0.82, foot: 0.8, rail: 0.85, railTie: 0.7, turbine: 0.7,
  building: 0.75, church: 0.78,
};
const NIGHT_BLUE = 1.12;

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
// scale a '#rrggbb' or 'rgba(...)' colour by k, blue a little less dimmed
export function shade(color, k) {
  const [r, g, b, a] = toRgba(color, 255);
  const out = [clamp8(r * k), clamp8(g * k), clamp8(b * k * NIGHT_BLUE)];
  if (color[0] === '#') return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${out.join(', ')}, ${+(a / 255).toFixed(2)})`;
}

export function nightPalette(day) {
  const out = { ...day };
  for (const [key, k] of Object.entries(NIGHT_FACTOR)) if (typeof day[key] === 'string') out[key] = shade(day[key], k);
  if (day.buildings) out.buildings = day.buildings.map((c) => shade(c, NIGHT_FACTOR.building));
  return out;
}

// 'dag' or 'nacht' for a clock hour; dusk and dawn count as night (the
// world's lights are on by then)
const NIGHT_FROM = 20.5, NIGHT_TO = 6;
export function mapPhase(hour) {
  if (typeof hour !== 'number' || !Number.isFinite(hour)) return 'dag';
  const h = ((hour % 24) + 24) % 24;
  return h >= NIGHT_FROM || h < NIGHT_TO ? 'nacht' : 'dag';
}

let phase = 'dag';
// The province base map is a pre-rendered pyramid in day colours: at night it
// is drawn through this canvas filter instead (roughly the palette's land factor).
const NIGHT_BASE_FILTER = 'brightness(0.6) saturate(0.9)';
export function baseFilter() { return phase === 'nacht' ? NIGHT_BASE_FILTER : 'none'; }

const DAY = { map: { ...MAP_PALETTE }, mini: { ...MINI_PALETTE } };
export function currentMapPhase() { return phase; }
// switch both palettes in place; true when it changed
export function applyMapPhase(next) {
  if (next === phase) return false;
  phase = next;
  Object.assign(MAP_PALETTE, next === 'nacht' ? nightPalette(DAY.map) : DAY.map);
  Object.assign(MINI_PALETTE, next === 'nacht' ? nightPalette(DAY.mini) : DAY.mini);
  return true;
}

// --- minimap lines ---------------------------------------------------------
// Minimum on-screen width (px) per road class, so a road stays one clean line
// at any minimap scale instead of a hairline, and the small classes step back
// when the map is zoomed out (fewer lines, a calmer picture).
const MINI_ROAD_MIN_PX = { major: 2.4, normal: 1.8, minor: 1.4, cycle: 1.3, foot: 1.0 };
// scale (px a metre) under which cycleways and footpaths fade out
const MINI_SMALL_FADE = { from: 1.0, to: 0.6 };

// { widthM, alpha } of a road on the minimap at a scale (px a metre)
export function miniRoadStyle(cat, widthM, scale) {
  const minPx = MINI_ROAD_MIN_PX[cat] || MINI_ROAD_MIN_PX.normal;
  const w = Math.max(widthM || 0, MINI_PALETTE.roadMetres, minPx / Math.max(scale, 0.05));
  let alpha = 1;
  if (cat === 'foot' || cat === 'cycle') {
    const { from, to } = MINI_SMALL_FADE;
    alpha = Math.max(0, Math.min(1, (scale - to) / (from - to)));
  }
  return { widthM: w, alpha };
}
