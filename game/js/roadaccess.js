// How you travel and which roads are for you. The minimap and the big map
// adapt to the travel mode (zoom, what is emphasised, "niet voor jou"), so
// both ask here. Pure: scripts/hud_test.mjs checks the table.
//
// Access comes from the OSM highway type the map keeps (stad.json has no
// access tags yet): walkers and cyclists stay off the trunk roads (the ring,
// autowegen), cars off footways, cycleways, pedestrian streets and steps,
// cyclists off footways and steps. Real access tags (foot/bicycle/
// motor_vehicle=no, bus only, private) come with the province tiles (F0/F1).

import { ACC } from './navgraph.js';

export const MODES = ['lopen', 'fiets', 'auto', 'boot', 'ov', 'lucht'];
export const MODE_LABEL = { lopen: 'Lopen', fiets: 'Fiets', auto: 'Auto', boot: 'Boot', ov: 'OV', lucht: 'Lucht' };

const NO_FOOT = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const NO_BIKE = new Set([...NO_FOOT, 'footway', 'steps']);
const NO_CAR = new Set(['footway', 'cycleway', 'pedestrian', 'steps', 'path', 'bridleway']);

// The mode of the player right now (the train cab counts as OV).
export function travelModeOf(world) {
  if (!world || !world.player) return 'lopen';
  if (world.trainDriving || world.trainCam) return 'ov';
  if (world.pigeonMode || world.heliRun) return 'lucht';
  const v = world.player.inVehicle;
  if (!v) return 'lopen';
  if (v.isHeli) return 'lucht';
  if (v.isBoat) return 'boot';
  if (v.isBike || v._mount) return 'fiets';
  // een e-step is geen brommer: fietspad mag, dus geen fietspadwaarschuwing (#17)
  if (v.isScooter && v.model && !v.model.moped && !v.model.motorbike && !v.model.geared) return 'fiets';
  return 'auto';
}

// Access bits per road (navgraph.js ACC). A
// road carries `acc` when the OSM tags (foot/bicycle/motor_vehicle/access/
// motorroad) differ from what its class implies (scripts/process_osm.py).
export const ACC_BIT = { lopen: ACC.FOOT, fiets: ACC.BIKE, auto: ACC.CAR };

// true: the road is for this mode; false: "niet voor jou"; null: no roads in this mode.
export function roadAllowed(road, mode) {
  if (!road) return null;
  if (typeof road.acc === 'number' && ACC_BIT[mode]) return (road.acc & ACC_BIT[mode]) !== 0;
  const t = road.type || '';
  if (mode === 'lopen') return !NO_FOOT.has(t);
  if (mode === 'fiets') return !NO_BIKE.has(t);
  if (mode === 'auto') return !NO_CAR.has(t) && !road.busOnly && road.cat !== 'foot' && road.cat !== 'cycle';
  return null;
}

// Per mode: the minimap's zoom (px per metre standing still and at speed),
// whether it turns north-up, and what it emphasises.
export const MINIMAP_MODE = {
  lopen: { scale: 1.75, fast: 1.45, emph: 'foot', dimLand: 0 },
  fiets: { scale: 1.45, fast: 1.0, emph: 'cycle', dimLand: 0 },
  auto: { scale: 1.3, fast: 0.55, emph: 'major', dimLand: 0 },
  boot: { scale: 1.1, fast: 0.7, emph: 'water', dimLand: 0.45 },
  ov: { scale: 0.7, fast: 0.32, emph: 'rail', dimLand: 0.35 },
  lucht: { scale: 0.42, fast: 0.24, emph: 'air', dimLand: 0.15 },
};

export function minimapScale(mode, speed, zoom = 1) {
  const m = MINIMAP_MODE[mode] || MINIMAP_MODE.lopen;
  const top = mode === 'lopen' ? 6 : mode === 'fiets' ? 9 : mode === 'lucht' ? 45 : mode === 'ov' ? 35 : 28;
  const k = Math.min(1, Math.abs(speed || 0) / top);
  return (m.scale - (m.scale - m.fast) * k) * zoom;
}

// north-up: 'nooit' turns with the camera, 'lucht' only while flying, 'altijd'
export function northUp(setting, mode) {
  return setting === 'altijd' || (setting === 'lucht' && mode === 'lucht');
}

// The routers' mode names (routing.js) and these.
export const ROUTE_MODE = { lopen: 'walk', fiets: 'bike', auto: 'drive', boot: 'boat', ov: 'ov', lucht: 'fly' };
// What the map plans for (#169): the way you travel now. The loose mode switches
// are gone; another way (riding along, public transport) comes from the
// destination card (ovopties.js), not from a map mode. choice: null, 'zelf' or
// a mode name; the planner gets null (= your own way) unless the choice differs.
export function planModeFor(choice, current) {
  if (!choice || choice === 'zelf' || choice === current || !ROUTE_MODE[choice]) return null;
  return ROUTE_MODE[choice];
}
export const MODE_OF_ROUTE = { walk: 'lopen', bike: 'fiets', drive: 'auto', boat: 'boot', ov: 'ov', fly: 'lucht' };

// Roads where cyclists may ride against the one-way (OSM oneway:bicycle=no is
// the rule on quiet streets in the Netherlands); never on the busy ones.
const BIKE_BOTH_WAYS = new Set(['residential', 'living_street', 'unclassified', 'service', 'track', 'tertiary', 'tertiary_link']);

// Is the road one-way for this mode? Walkers ignore it, cyclists on quiet streets too.
export function oneWayFor(road, mode) {
  if (!road || !road.oneway) return false;
  if (mode === 'lopen') return false;
  if (mode === 'fiets') return !!road.roundabout || !BIKE_BOTH_WAYS.has(road.type || '');
  return true;
}

// Moving on a road that is not for you is possible, but an offence: the kind
// is the word on the warning card. 'snelweg' (walking or cycling on the
// motorways and the ring), 'fietspad' (a car on a cycle path), 'voetpad' (a
// car or bike on a footway or steps). null: nothing wrong.
export function offenceOf(road, mode) {
  if (!road || roadAllowed(road, mode) !== false) return null;
  if (mode === 'auto') return road.cat === 'cycle' || road.type === 'cycleway' ? 'fietspad' : 'voetpad';
  return NO_FOOT.has(road.type || '') ? 'snelweg' : 'voetpad';
}

// --- cycling over the Grote Markt (feedback 15 oktober: nobody knew where a bike may go) ---------------
// The square's pedestrian ways are open to cyclists, at walking pace. The ways
// that cross it are painted as a bike route (dashed edge lines and a bike
// symbol on the cobbles, roadsurface.js) and each entrance carries a "fietsroute"
// sign (marktfiets.js); the first time you ride on it a hint says so, and on a
// market day (dinsdag, vrijdag, zaterdag, daytime) that you get off.
export const MARKT = { name: 'Grote Markt', x: 100.63, y: 76.18, reach: 140, minLen: 20, laneHalf: 0.95, hint: 'marktfiets' };

const lenOf = (road) => {
  let l = 0;
  for (let i = 0; i < road.pts.length - 1; i++) l += Math.hypot(road.pts[i + 1][0] - road.pts[i][0], road.pts[i + 1][1] - road.pts[i][1]);
  return l;
};

// Is this one of the ways across the Grote Markt that carries the bike route?
export function isMarktFietsRoad(road, len = null) {
  if (!road || road.name !== MARKT.name || road.type !== 'pedestrian' || road.z || !road.pts || road.pts.length < 2) return false;
  const l = len == null ? lenOf(road) : len;
  if (l < MARKT.minLen) return false;
  const a = road.pts[0], b = road.pts[road.pts.length - 1];
  return Math.hypot((a[0] + b[0]) / 2 - MARKT.x, (a[1] + b[1]) / 2 - MARKT.y) <= MARKT.reach;
}

// What stands on the square and keeps the painted route off a way (#327): the bumper-car tent of the kermis (always there; kermis.js
// takes its place from here) and the café terraces, the tables and parasols round a horeca spot (cityprops.js findTerraceSpot: up to 7 m).
export const KERMIS_TENT = { x: 173.32, y: 108.21, rot: -0.0164, hu: 10, hv: 6 };
const TENT_PAD = 4.5, TERRACE_R = 9;
export function marktFietsBlocked(horeca, x, y) {
  const c = Math.cos(KERMIS_TENT.rot), s = Math.sin(KERMIS_TENT.rot);
  const u = (x - KERMIS_TENT.x) * c + (y - KERMIS_TENT.y) * s, v = -(x - KERMIS_TENT.x) * s + (y - KERMIS_TENT.y) * c;
  if (Math.abs(u) < KERMIS_TENT.hu + TENT_PAD && Math.abs(v) < KERMIS_TENT.hv + TENT_PAD) return true;
  for (const h of horeca || []) if (Math.abs(h.x - x) < TERRACE_R && Math.abs(h.y - y) < TERRACE_R && Math.hypot(h.x - x, h.y - y) < TERRACE_R) return true;
  return false;
}

// The stretches of a bike-route way (arc length s0 to s1 along it) that are free of the tent and the terraces, at least `min` m long.
export function marktFietsSpans(road, horeca, s0, s1, min = 6) {
  const out = [];
  let acc = 0, start = null, last = null;
  const step = (s, x, y) => {
    if (s < s0 || s > s1) return;
    const blocked = marktFietsBlocked(horeca, x, y);
    if (!blocked && start === null) start = s;
    if (blocked && start !== null) { if (last - start >= min) out.push([start, last]); start = null; }
    if (!blocked) last = s;
  };
  for (let i = 0; i < road.pts.length - 1; i++) {
    const a = road.pts[i], b = road.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(l / 0.5));
    for (let k = 0; k < n; k++) step(acc + (l * k) / n, a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n);
    acc += l;
  }
  if (start !== null && last - start >= min) out.push([start, last]);
  return out;
}

export const isMarktDay = (weekday, hour) => [2, 5, 6].includes(weekday) && hour >= 8 && hour < 18;

// The one-time hint for a cyclist on the square; null for anyone else.
export function marktFietsHint(mode, road, { weekday = -1, hour = 12 } = {}) {
  if (mode !== 'fiets' || !road || road.name !== MARKT.name) return null;
  if (isMarktDay(weekday, hour)) return 'Marktdag op de Grote Markt: stap af en loop met je fiets door de kramen.';
  return 'Fietsen mag over de Grote Markt, rustig aan. Volg het fietssymbool op de klinkers.';
}
