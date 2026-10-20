// The wereldbouwer (docs/PROVINCIE-PLAN.md 2.5): one generator that turns a
// source feature into the row the game holds, for every tile of the world.
// The city's packer (scripts/world/pack_tiles.mjs) and the province builders
// (scripts/world/build_corridor.mjs, build_province.mjs) all go through these
// functions; only the adapters that read their source differ (a GameMap row,
// an old Ommeland box, a raw OSM element).
//
// Rules, not zones: a building's height comes from the best evidence there
// is (3D BAG > OSM height > OSM levels > a default per type), a road's class,
// lanes, width, speed and access from its tags, with one cap for village
// streets. Nothing here asks "is this the city?".
import { capBuilding } from './buildingcap.js';
import { wgsToWorld } from './rdnew.js';
import { mappedFromOsm, mappedSignsFromOsm } from './streetfurniture.js';
import { heightOf, levelsFor } from './buildingheights.js';
import { hash2 } from './greenery.js';
import { segDist } from './util.js';
import { ACC } from './navgraph.js';

export const WB_VERSION = 1;
export const LEVEL_M = 3.1;

// ------------------------------------------------------------------ roads

// highway -> class defaults (the same table process_osm.py builds the city with)
export const ROAD_SPEC = {
  motorway: { width: 12, speed: 25, lanes: 2, cat: 'major' },
  motorway_link: { width: 9, speed: 16, lanes: 1, cat: 'major' },
  trunk: { width: 12, speed: 22, lanes: 2, cat: 'major' },
  trunk_link: { width: 9, speed: 16, lanes: 1, cat: 'major' },
  primary: { width: 10, speed: 18, lanes: 2, cat: 'major' },
  primary_link: { width: 7, speed: 13, lanes: 1, cat: 'major' },
  secondary: { width: 9, speed: 16, lanes: 2, cat: 'major' },
  secondary_link: { width: 7, speed: 13, lanes: 1, cat: 'major' },
  tertiary: { width: 8, speed: 14, lanes: 2, cat: 'normal' },
  tertiary_link: { width: 6, speed: 11, lanes: 1, cat: 'normal' },
  residential: { width: 6.5, speed: 11, lanes: 2, cat: 'normal' },
  unclassified: { width: 6, speed: 11, lanes: 2, cat: 'normal' },
  living_street: { width: 5, speed: 7, lanes: 1, cat: 'minor' },
  service: { width: 4, speed: 6, lanes: 1, cat: 'minor' },
  pedestrian: { width: 4, speed: 0, lanes: 0, cat: 'foot' },
  footway: { width: 1.8, speed: 0, lanes: 0, cat: 'foot' },
  steps: { width: 1.8, speed: 0, lanes: 0, cat: 'foot' },
  track: { width: 3, speed: 4, lanes: 1, cat: 'minor' },
  cycleway: { width: 2, speed: 0, lanes: 0, cat: 'cycle' },
};

// AI speed on a village street (the built-up stretch of a country road):
// the 50 and 30 km/h of the kom instead of the class speed
export const VILLAGE_SPEED = {
  trunk: 14, primary: 14, secondary: 14, tertiary: 13, unclassified: 11, residential: 8.5, living_street: 8.5, cycleway: 5,
};

// The lane model (scripts/world/lanemodel.py, docs 2.12), the same numbers.
export const LANE_W = {
  motorway: 3.5, motorway_link: 3.5, trunk: 3.25, trunk_link: 3.25, primary: 3.25, primary_link: 3.0, secondary: 3.0,
  secondary_link: 3.0, tertiary: 3.0, tertiary_link: 2.75, unclassified: 2.75, residential: 2.75, living_street: 2.75,
  service: 2.75, track: 2.75, busway: 3.25,
};
const ONEWAY_EXTRA = {
  motorway: 3.5, motorway_link: 3.0, trunk: 1.0, trunk_link: 1.5, primary: 1.0, primary_link: 1.5, secondary: 2.0,
  secondary_link: 1.6, tertiary: 2.0, tertiary_link: 1.6,
};
const ONEWAY_LANES = { motorway: 2, trunk: 2, primary: 2 };
const DUAL_ALWAYS = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary_link', 'tertiary_link']);

const num = (v) => {
  if (v === undefined || v === null) return null;
  const n = parseInt(parseFloat(String(v).split(';')[0]), 10);
  return Number.isFinite(n) ? n : null;
};
const turnList = (v) => (v ? String(v).split('|').map((s) => s.trim() || 'none') : null);

export function isOneway(hw, tags) {
  return tags.junction === 'roundabout' || ['yes', '1', 'true'].includes(tags.oneway) || ((hw === 'motorway' || hw === 'motorway_link') && tags.oneway !== 'no');
}

export function tagWidth(tags) {
  const tw = tags.width || tags.est_width;
  if (!tw) return null;
  const v = parseFloat(String(tw).split(/\s+/)[0].replace(',', '.'));
  return Number.isFinite(v) ? Math.max(2.5, v) : null;
}

const r2 = (v) => Math.round(v * 100) / 100;

// {laneW, lanesFwd, lanesBwd, lanesBoth?, turnFwd?, turnBwd?, lanes, placement?, width, widthSrc}
export function laneFields(hw, tags, defaultWidth, dual = true) {
  const oneway = isOneway(hw, tags);
  const total = num(tags.lanes);
  const fwd = num(tags['lanes:forward']), bwd = num(tags['lanes:backward']), both = num(tags['lanes:both_ways']);
  const lw = LANE_W[hw] !== undefined ? LANE_W[hw] : 3.0;
  const out = { laneW: lw };
  if (oneway) {
    out.lanesFwd = fwd || total || ONEWAY_LANES[hw] || 1;
    out.lanesBwd = 0;
    const t = turnList(tags['turn:lanes'] || tags['turn:lanes:forward']);
    if (t) out.turnFwd = t;
  } else {
    let f, b;
    if (fwd || bwd) { f = fwd || 1; b = bwd || 1; }
    else if (total) { const rest = total - (both || 0); f = Math.max(1, Math.floor((rest + 1) / 2)); b = Math.max(1, Math.floor(rest / 2)); }
    else { f = 1; b = 1; }
    out.lanesFwd = f; out.lanesBwd = b;
    if (both) out.lanesBoth = both;
    for (const [key, k] of [['turn:lanes:forward', 'turnFwd'], ['turn:lanes:backward', 'turnBwd']]) {
      const t = turnList(tags[key]);
      if (t) out[k] = t;
    }
  }
  for (const [k, nk] of [['turnFwd', 'lanesFwd'], ['turnBwd', 'lanesBwd']]) {
    if (k in out && out[k].length !== out[nk]) {
      if (oneway && !(fwd || total) && k === 'turnFwd') out[nk] = out[k].length;
      else delete out[k];
    }
  }
  out.lanes = out.lanesFwd + out.lanesBwd + (both || 0);
  if (tags.placement) out.placement = String(tags.placement);
  const tw = tagWidth(tags);
  if (tw) { out.width = tw; out.widthSrc = 'tag'; }
  else if (oneway && hw in ONEWAY_EXTRA && (DUAL_ALWAYS.has(hw) || dual)) { out.width = r2(out.lanesFwd * lw + ONEWAY_EXTRA[hw]); out.widthSrc = 'lanes'; }
  else if (total) { out.width = Math.max(defaultWidth, r2(out.lanes * 3.1 + 0.6)); out.widthSrc = 'lanes'; }
  else { out.width = defaultWidth; out.widthSrc = 'class'; }
  return out;
}

// OSM landuse to the countryside's land use
export const PARCEL_USE = { farmland: 'akker', meadow: 'weide', orchard: 'boomgaard' };

// the width (m) of an open ditch, drain or brook that OSM gives no width for
export const DITCH_WIDTH = { ditch: 2.4, drain: 1.6, stream: 3 };

// Legal access per mode (the navgraph.js ACC bits); null when the class default holds.
export function accessMask(hw, cat, tags) {
  let def;
  if (hw === 'motorway' || hw === 'motorway_link' || hw === 'trunk' || hw === 'trunk_link') def = ACC.CAR | ACC.BUS;
  else if (cat === 'cycle') def = ACC.BIKE;
  else if (cat === 'foot') def = hw === 'pedestrian' ? ACC.FOOT | ACC.BIKE : ACC.FOOT;
  else def = ACC.FOOT | ACC.BIKE | ACC.CAR | ACC.BUS;
  let mask = def;
  const NO = ['no', 'private', 'customers', 'delivery'], YES = ['yes', 'designated', 'permissive'];
  if (tags.motorroad === 'yes') mask &= ~(ACC.FOOT | ACC.BIKE);
  for (const [key, bit] of [['access', ACC.FOOT | ACC.BIKE | ACC.CAR | ACC.BUS], ['vehicle', ACC.BIKE | ACC.CAR | ACC.BUS]]) if (NO.includes(tags[key])) mask &= ~bit;
  for (const [key, bit] of [['foot', ACC.FOOT], ['bicycle', ACC.BIKE], ['motor_vehicle', ACC.CAR | ACC.BUS], ['motorcar', ACC.CAR]]) {
    const v = tags[key];
    if (NO.includes(v)) mask &= ~bit;
    else if (YES.includes(v) && hw !== 'motorway' && hw !== 'motorway_link') mask |= bit;
  }
  if (YES.includes(tags.bus) || YES.includes(tags.psv)) mask |= ACC.BUS;
  return mask === def ? null : mask;
}

const intTag = (tags, k) => { const v = parseInt(String(tags[k] !== undefined ? tags[k] : '0').split(';')[0], 10); return Number.isFinite(v) ? v : 0; };

// One road row. src: { pts, highway, tags?, width?, oneway?, name?, bridge?,
// layer?, osm? }; ctx: { village (a built-up stretch out of town), dual }.
// With tags, the lanes, grade and access come from them; without (the
// Ommeland's compact roads) the source gives width and flags.
export function buildRoad(src, ctx = {}) {
  const hw = src.highway;
  const spec = ROAD_SPEC[hw];
  if (!spec || !src.pts || src.pts.length < 2) return null;
  const tags = src.tags || null;
  const speed = ctx.village && VILLAGE_SPEED[hw] !== undefined ? VILLAGE_SPEED[hw] : spec.speed;
  let width = src.width;
  let lane = null;
  if (tags && (spec.cat === 'major' || spec.cat === 'normal' || spec.cat === 'minor')) {
    lane = laneFields(hw, tags, spec.width, !!ctx.dual);
    if (width === undefined) width = lane.width;
    delete lane.width;
  } else if (width === undefined) width = (tags && tagWidth(tags)) || spec.width;
  const roundabout = !!(tags && tags.junction === 'roundabout');
  const oneway = src.oneway !== undefined ? !!src.oneway : !!(tags && (roundabout || ['yes', '1', 'true'].includes(tags.oneway)));
  let bridge = !!src.bridge;
  if (tags && src.bridge === undefined) {
    bridge = tags.bridge !== undefined && tags.bridge !== 'no';
    if (!bridge && tags.layer !== undefined) bridge = intTag(tags, 'layer') > 0;
  }
  const row = {
    pts: src.pts, cat: spec.cat, type: hw, width, speed, oneway, roundabout,
    name: src.name !== undefined ? src.name : (tags && tags.name) || null, bridge,
  };
  if (src.layer !== undefined) row.layer = src.layer;
  if (tags) {
    const layer = intTag(tags, 'layer');
    if (layer) row.layer = layer;
    if (tags.tunnel === 'yes' || tags.tunnel === 'culvert') row.tunnel = true;
    if (tags.bridge === 'viaduct') row.viaduct = true;
    if (bridge && tags['bridge:movable'] && tags['bridge:movable'] !== 'no') row.movable = tags['bridge:movable'];
    for (const k of ['cutting', 'embankment']) if (tags[k] !== undefined && tags[k] !== 'no') row[k] = true;
    if (tags.ref) row.ref = tags.ref;
    const acc = accessMask(hw, spec.cat, tags);
    if (acc !== null) row.acc = acc;
    if (lane) Object.assign(row, lane);
    if (src.osm !== undefined) row.osm = src.osm;
    // for applyDuals; the packer drops `_` keys
    Object.defineProperty(row, '_tags', { value: tags, enumerable: false, writable: true });
  }
  return row;
}

const CAR = new Set(['major', 'normal', 'minor']);

// The one-way rows that are one carriageway of a dual road: a one-way way of
// the same name or ref runs the other way within 40 m (lanes.py duals).
export function dualCarriageways(roads) {
  const GD = 50;
  const one = roads.filter((r) => r.oneway && !r.roundabout && CAR.has(r.cat) && (r.name || r.ref));
  const grid = new Map();
  for (const r of one) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      for (let gx = Math.floor(Math.min(a[0], b[0]) / GD); gx <= Math.floor(Math.max(a[0], b[0]) / GD); gx++) {
        for (let gy = Math.floor(Math.min(a[1], b[1]) / GD); gy <= Math.floor(Math.max(a[1], b[1]) / GD); gy++) {
          const k = gx + ',' + gy;
          (grid.get(k) || grid.set(k, []).get(k)).push([r, a, b]);
        }
      }
    }
  }
  const out = new Set();
  for (const r of one) {
    const P = r.pts;
    let i = Math.floor(P.length / 2) - (P.length % 2 === 0 ? 1 : 0);
    i = Math.max(0, Math.min(P.length - 2, i));
    const a = P[i], b = P[i + 1];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (let gx = Math.floor((mx - 40) / GD); gx <= Math.floor((mx + 40) / GD) && !out.has(r); gx++) {
      for (let gy = Math.floor((my - 40) / GD); gy <= Math.floor((my + 40) / GD); gy++) {
        for (const [o, c, d] of grid.get(gx + ',' + gy) || []) {
          if (o === r || !((r.ref && o.ref === r.ref) || (r.name && o.name === r.name))) continue;
          const Lo = Math.hypot(d[0] - c[0], d[1] - c[1]) || 1;
          if (((d[0] - c[0]) * ux + (d[1] - c[1]) * uy) / Lo > -0.7 || segDist(mx, my, c[0], c[1], d[0], d[1]) > 40) continue;
          out.add(r);
        }
      }
    }
  }
  return out;
}

// A dual road's one-way carriageways get the width of their own lanes.
export function applyDuals(roads) {
  const dual = dualCarriageways(roads);
  for (const r of dual) {
    if (!r._tags || r.widthSrc === 'tag') continue;
    const lf = laneFields(r.type, r._tags, ROAD_SPEC[r.type].width, true);
    r.width = lf.width;
    r.widthSrc = lf.widthSrc;
  }
  return dual.size;
}

// ------------------------------------------------------------- buildings

// OSM building tag -> the compact code the Ommeland keeps (fetch_ommeland.py)
export const BUILDING_CODE = {
  house: 1, detached: 1, semidetached_house: 1, terrace: 1, bungalow: 1, residential: 1, apartments: 2, farm: 3, farmhouse: 3,
  barn: 4, farm_auxiliary: 4, cowshed: 4, stable: 4, greenhouse: 5, industrial: 6, warehouse: 6, commercial: 6, retail: 6,
  office: 6, church: 7, chapel: 7, shed: 8, garage: 8, garages: 8, carport: 8, school: 9, houseboat: 10,
};

// Height from the best evidence (docs 0.1): 3D BAG {hmax, hg, h50, roof},
// OSM {h (height), lv (levels), rl (roof levels)}, else the type's levels.
// The keys come in the order the tiles store them; `hasRoof`: the row
// already has a roof type (from the OSM tags), which 3D BAG then leaves.
export function heightFields(bag3d, osm, levels, hasRoof = false) {
  if (bag3d && bag3d.hmax !== undefined && bag3d.hg !== undefined) {
    const f = { hm: r2(bag3d.hmax - bag3d.hg), hmax: bag3d.hmax, hg: bag3d.hg };
    if (bag3d.h50 !== undefined) f.h50 = bag3d.h50;
    if (bag3d.roof && !hasRoof) f.roof = bag3d.roof;
    f.hsrc = '3dbag';
    // the walls and the roof the renderer draws (buildingheights.js)
    const hh = heightOf(osm && osm.roof ? osm : null, bag3d, levels);
    f.eave = hh.eave;
    if (hh.roof) f.rk = hh.roof;
    return f;
  }
  if (osm && osm.h) return { hm: osm.h, hsrc: 'osm_height', eave: osm.h };
  if (osm && osm.lv) return { hm: r2(osm.lv * LEVEL_M + (osm.rl || 0) * LEVEL_M), hsrc: 'osm_levels' };
  return { hm: r2((levels || 1) * LEVEL_M), hsrc: 'default' };
}

const polyArea = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a / 2); };

// What a building is (the form the generators know) from its code, area,
// levels and how built-up the spot is, when the source does not say.
export function formOf({ code = 0, area = 0, levels = 0, urban = 1 }) {
  if (code === 7) return 'church';
  if (code === 8 || code === 10 || (code === 0 && area < 38)) return 'shed';
  if (code === 5) return 'glass';
  if (code === 2 || code === 9 || levels >= 3) return 'block';
  if (code === 6) return 'shed';
  if (code === 4 || (code === 0 && area > 380 && urban < 0.5)) return 'barn';
  if (code === 0 && area > 380) return 'block';
  return 'house';
}

// The city archetype (models3d_buildings.js archetypeOf reads `type`) for a
// form. keepRural: a farmhouse, barn, greenhouse or church out in the polder
// returns null, for a caller that still has a countryside model for it
// (none does now); a tile has no other model, so it gets a type of its own.
export function cityTypeOf(form, { code = 0, urban = 1, hip = false, row = false, levels = 0, keepRural = false } = {}) {
  if (code === 7 || form === 'church') return keepRural ? null : 'church';
  if (form === 'house') {
    if (keepRural && ((code === 3 && urban < 0.35) || (hip && urban < 0.35 && !row))) return null;
    return row ? 'terrace' : 'house';
  }
  if (form === 'block') {
    if (code === 2 || levels >= 3) return 'apartments';
    if (code === 9) return 'school';
    return 'yes';
  }
  if (form === 'shed') return code === 6 ? 'industrial' : 'garage';
  if (keepRural) return null;
  if (form === 'barn') return 'farm_auxiliary';
  if (form === 'glass') return 'greenhouse';
  return 'yes';
}

// Storeys for the generators' 3.1 m levels from a wall height; a shed or
// hall has taller storeys. 'yes' (a generic block) is capped at four.
export function levelsOf(type, wall) {
  const lv = type === 'garage' || type === 'industrial' ? Math.max(1, Math.round(wall / 3.6)) : Math.max(1, Math.round(wall / 3.1));
  return type === 'yes' ? Math.min(4, lv) : lv;
}

// One building row. src: { pts, code?, tag?, form?, levels? (OSM), height?
// (OSM, m), roofLevels?, roofShape?, wall? (m, a modelled wall), roofH?,
// hip?, row?, urban?, tint?, roofTint?, name?, bag3d? }.
export function buildBuilding(src, ctx = {}) {
  if (!src.pts || src.pts.length < 3) return null;
  const code = src.code !== undefined ? src.code : BUILDING_CODE[src.tag] || 0;
  const urban = src.urban !== undefined ? src.urban : 1;
  const area = src.area !== undefined ? src.area : polyArea(src.pts);
  const osmLv = src.levels || 0;
  const roofH = src.roofH !== undefined ? src.roofH : 0;
  let type, h;
  if (src.tag !== undefined && src.wall === undefined) {
    // an OSM outline keeps its own tag (models3d_buildings.js archetypeOf
    // reads it); storeys from the levels, else the height, else 2 for a
    // house and 3 for the rest (as process_osm.py)
    type = src.tag === 'yes' || !src.tag ? 'yes' : src.tag;
    h = osmLv ? Math.max(1, osmLv) : src.height ? Math.max(1, Math.round((src.height - roofH) / LEVEL_M)) : type === 'house' || type === 'detached' ? 2 : 3;
  } else {
    const form = src.form || formOf({ code, area, levels: osmLv, urban });
    type = cityTypeOf(form, { code, urban, hip: !!src.hip, row: !!src.row, levels: osmLv, keepRural: !!ctx.keepRural });
    if (!type) return null;
    // the wall: modelled by the source, else from the levels, else the form's
    const wall = src.wall !== undefined ? src.wall : osmLv ? osmLv * LEVEL_M : form === 'block' ? 3 * LEVEL_M : form === 'barn' ? 4.4 : form === 'shed' ? 3 : 2 * LEVEL_M;
    h = levelsOf(type, wall);
  }
  const b = { pts: src.pts, h, type, name: src.name !== undefined ? src.name : '' };
  if (src.tint !== undefined) b.tint = src.tint;
  if (src.roofTint !== undefined) b.roofTint = src.roofTint;
  const hf = heightFields(src.bag3d, { h: src.height, lv: osmLv, rl: src.roofLevels }, b.h);
  // a modelled wall + roof is the best guess there is without data
  if (hf.hsrc === 'default' && src.wall !== undefined) hf.hm = r2(src.wall + roofH);
  b.hm = hf.hm;
  b.hsrc = hf.hsrc;
  // a measured building: its walls in storeys, its roof (buildingheights.js)
  if (hf.eave !== undefined) b.h = levelsFor(hf.eave);
  if (hf.rk) b.rk = hf.rk;
  b.roof = src.roofShape || (src.hip ? 'hipped' : roofH > 0 ? 'gabled' : 'flat');
  return capBuilding(b);
}

// ---------------------------------------------- water, rail, green, POIs

export function buildWater(src) {
  if (!src.pts || src.pts.length < 4) return null;
  return { pts: src.pts, name: src.name || null };
}

export function buildRail(src) {
  if (!src.pts || src.pts.length < 2) return null;
  return { pts: src.pts, service: src.service || null };
}

const GREEN = new Set(['park', 'garden', 'playground', 'pitch', 'dog_park', 'grass', 'forest', 'meadow', 'cemetery']);
export function buildGreen(src) {
  if (!src.pts || src.pts.length < 4 || !GREEN.has(src.kind)) return null;
  return { pts: src.pts, kind: src.kind };
}

// A point of interest as the facilities layer keeps it (kind, place, street);
// no business names (docs 4.3).
export function buildPoi(src) {
  if (!Number.isFinite(src.x) || !src.kind) return null;
  return { x: src.x, y: src.y, kind: src.kind, place: src.place || '', street: src.street || '' };
}

// ------------------------------------------------- furniture and greenery

// Hooks for the scatter rules (docs 2.14, 2.15): a function per kind gets
// the tile's rows and returns extra rows ({ kind, x, y, a?, ... }). The
// furniture and tree work (F1c) registers here; the builder runs them in
// registration order, so a tile stays deterministic.
const HOOKS = { furniture: [], greenery: [] };
export function registerHook(kind, fn) {
  if (!HOOKS[kind]) throw new Error(`unknown hook ${kind}`);
  HOOKS[kind].push(fn);
}
export function runHooks(kind, tile) {
  const out = [];
  for (const fn of HOOKS[kind] || []) for (const r of fn(tile) || []) out.push(r);
  return out;
}

// --------------------------------------------------------- OSM adapter

const HIDDEN = (tags) => tags['bridge:support'] || tags.location === 'underground'
  || (intTag(tags, 'layer') < 0 && !['surface', 'overground', 'roof', 'rooftop'].includes(tags.location));

// Points every `spacing` m along a line, the remainder carried over a vertex
// (process_osm.py sample_along)
function sampleAlong(P, spacing) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-6) continue;
    let d = carry;
    while (d < len) { out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]); d += spacing; }
    carry = d - len;
  }
  return out;
}
export const TREE_ROW_SPACING = 6;

const project = (g) => g.map(([lat, lon]) => wgsToWorld(lat, lon).map((v) => Math.round(v * 100) / 100));
const closed = (P) => P.length > 3 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1];

// A raw OSM element (Overpass JSON: `geometry` [{lat, lon}] or the slim
// caches' `g` [[lat, lon]]) as features: [{ kind, row }]. ctx: { urbanAt(x, y)
// (0..1), village(x, y), signs (keep mapped signals, signs, crossings, gates), bag3d(pts, tags) (the 3D BAG record of a building:
// { hmax, hg, h50?, roof? }, scripts/world/bag3d.mjs) }.
export function fromOsm(el, ctx = {}) {
  const tags = el.tags || {};
  const g = el.g || (el.geometry ? el.geometry.filter(Boolean).map((p) => [p.lat, p.lon]) : null);
  const out = [];
  if (el.type === 'node' && tags.natural === 'tree' && el.lat !== undefined) {
    const [x, y] = wgsToWorld(el.lat, el.lon);
    out.push({ kind: 'trees', row: [Math.round(x * 100) / 100, Math.round(y * 100) / 100] });
    return out;
  }
  // mapped street furniture (docs 2.14), in the rows the game keeps
  // (streetfurniture.js mappedFromOsm: { k, pts, v?, h?, osm })
  if (el.type === 'node' && el.lat !== undefined) {
    for (const row of mappedFromOsm([el])) out.push({ kind: 'furniture', row });
    // signals, signs, crossings and gates (ctx.signs: the province's tiles)
    if (ctx.signs) for (const row of mappedSignsFromOsm(el)) out.push({ kind: 'furniture', row });
    return out;
  }
  if (!g || g.length < 2) return out;
  if ((tags.barrier || tags.traffic_calming) && tags.building === undefined && !tags.highway) {
    for (const row of mappedFromOsm([{ ...el, geometry: g.map(([lat, lon]) => ({ lat, lon })) }], { hedges: true })) out.push({ kind: 'furniture', row });
    if (tags.barrier !== 'hedge') return out;
  }
  const P = project(g);
  // a tree row (an avenue, a hedge of trees): a tree every 6 m along it, as process_osm.py does for the city
  if (tags.natural === 'tree_row') {
    // (rowSeed: the row's own seed, so the greenery hook gives it one species)
    const rowSeed = hash2(P[0][0], P[0][1]);
    for (const [x, y] of sampleAlong(P, TREE_ROW_SPACING)) { const t = [Math.round(x * 10) / 10, Math.round(y * 10) / 10]; t.rowSeed = rowSeed; out.push({ kind: 'trees', row: t }); }
    return out;
  }
  if (tags.building !== undefined) {
    if (!closed(P) || HIDDEN(tags)) return out;
    const lv = num(tags['building:levels']);
    const h = parseFloat(String(tags.height || '').replace(',', '.'));
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const row = buildBuilding({
      pts: P, tag: tags.building, levels: lv ? Math.max(1, lv) : 0, height: Number.isFinite(h) && h > 0 ? h : undefined,
      roofLevels: num(tags['roof:levels']) || 0, roofShape: tags['roof:shape'], name: tags.name || null,
      urban: ctx.urbanAt ? ctx.urbanAt(c[0], c[1]) : 1,
      bag3d: ctx.bag3d ? ctx.bag3d(P, tags) : undefined,
    });
    if (row) { if (el.id !== undefined) row.osm = el.id; out.push({ kind: 'buildings', row }); }
    return out;
  }
  if (tags.highway && ROAD_SPEC[tags.highway]) {
    const mid = P[Math.floor(P.length / 2)];
    const row = buildRoad({ pts: P, highway: tags.highway, tags, osm: el.id }, { village: ctx.village ? ctx.village(mid[0], mid[1]) : false });
    if (row) out.push({ kind: 'roads', row });
    return out;
  }
  if (tags.railway === 'rail' && !['abandoned', 'disused'].includes(tags.usage)) {
    const row = buildRail({ pts: P, service: tags.service });
    if (row) out.push({ kind: 'rails', row });
    return out;
  }
  if ((tags.natural === 'water' || tags.waterway === 'riverbank') && closed(P)) {
    if (intTag(tags, 'layer') < 0 || tags.covered === 'yes') return out;
    const row = buildWater({ pts: P, name: tags.name });
    if (row) out.push({ kind: 'water', row });
    return out;
  }
  if (tags.waterway === 'canal' || tags.waterway === 'river') {
    const w = parseFloat(String(tags.width || '').replace(',', '.'));
    // (fixed: the width is mapped; else it is a guess that derive_tiles.mjs trims round the footprints on the bank)
    out.push({ kind: 'waterways', row: { pts: P, hw: (Number.isFinite(w) && w > 0 ? w : tags.waterway === 'canal' ? 14 : 10) / 2, name: tags.name || null, fixed: Number.isFinite(w) && w > 0 } });
    return out;
  }
  // ditches, drains and brooks: the real ones, 1037 km in the province (the polder's painted ditches are a hash and know nothing of them).
  // A culvert or a covered stretch is no open water: the road over it stays whole (markDryRoad needs no help), the ditch has no ribbon there.
  if (DITCH_WIDTH[tags.waterway] && !tags.tunnel && tags.covered !== 'yes' && ctx.ditches !== false) {
    const w = parseFloat(String(tags.width || '').replace(',', '.'));
    out.push({ kind: 'waterways', row: { pts: P, hw: (Number.isFinite(w) && w > 0 ? Math.min(w, 12) : DITCH_WIDTH[tags.waterway]) / 2, name: tags.name || null, fixed: true, ditch: true } });
    return out;
  }
  // the land use the countryside's fences and herds follow: arable (no fence, no herd) and pasture (fenced, grazed)
  const use = PARCEL_USE[tags.landuse];
  if (use && closed(P) && ctx.parcels !== false) {
    const A = Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    if (A >= 2000) out.push({ kind: 'parcels', row: { pts: P, use } });
  }
  const gk = tags.leisure || tags.landuse;
  if (gk && closed(P)) {
    const row = buildGreen({ pts: P, kind: gk });
    if (row) out.push({ kind: 'green', row });
  }
  return out;
}
