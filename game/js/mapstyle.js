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
