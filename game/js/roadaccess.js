// How you travel and which roads are for you. The minimap and the big map
// adapt to the travel mode (zoom, what is emphasised, "niet voor jou"), so
// both ask here. Pure: scripts/hud_test.mjs checks the table.
//
// Access comes from the OSM highway type the map keeps (citymap.json has no
// access tags yet): walkers and cyclists stay off the trunk roads (the ring,
// autowegen), cars off footways, cycleways, pedestrian streets and steps,
// cyclists off footways and steps. Real access tags (foot/bicycle/
// motor_vehicle=no, bus only, private) come with the province tiles (F0/F1).

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
  return 'auto';
}

// true: the road is for this mode; false: "niet voor jou"; null: no roads in this mode.
export function roadAllowed(road, mode) {
  if (!road) return null;
  const t = road.type || '';
  if (mode === 'lopen') return !NO_FOOT.has(t);
  if (mode === 'fiets') return !NO_BIKE.has(t);
  if (mode === 'auto') return !NO_CAR.has(t) && road.cat !== 'foot' && road.cat !== 'cycle';
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
