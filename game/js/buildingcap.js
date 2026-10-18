// Height limits per building type (issue #179). Some sources give a building a
// height its footprint and kind do not carry: a 5 m² pier post mapped as
// building=yes gets the default three storeys (a thin red pillar), a 1800 m²
// farm hall mapped as a house gets a 14 m BAG roof and shows five rows of
// flat windows. capBuilding trims `h` (storeys of 3.1 m, the walls) and `hm`
// (metres to the top) to what that kind of building can be, never raising them.
// Pure on a tile row { pts, type, name, h, hm, hsrc }; idempotent. Used by the
// builder (worldbuilder.js buildBuilding) and when a mesh is built (so tiles
// built earlier are covered too).

const LEVEL = 3.1;
// chimneys, masts and silos are tall and slim on purpose
const SLIM_OK = new Set(['tower', 'chimney', 'silo', 'storage_tank', 'mast', 'windmill', 'church', 'chapel', 'cathedral', 'water_tower', 'lighthouse', 'castle', 'apartments']);
const HOUSE_LIKE = new Set(['house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'residential', 'farm', 'farmhouse', 'farm_auxiliary', 'barn', 'stable', 'cowshed', 'livestock', 'outbuilding', 'yes']);
// a house-type outline this big is a farm hall or a barn, not a house (a terrace or an apartment block keeps its storeys)
const FARMISH = new Set(['house', 'detached', 'bungalow', 'farm', 'farmhouse', 'farm_auxiliary', 'barn', 'stable', 'cowshed', 'livestock', 'outbuilding', 'yes']);
const HALL_LIKE = new Set(['industrial', 'warehouse', 'retail', 'commercial', 'shed', 'service', 'storage', 'yes', 'sports_hall', 'garage', 'garages']);

export function ringArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a / 2);
}

// the limits { h, hm } for a row, or null when it needs none
export function heightLimits(b, area = ringArea(b.pts || [])) {
  const type = b.type || 'yes';
  const measured = b.hsrc === '3dbag';
  if (SLIM_OK.has(type)) return null;
  let h = Infinity, hm = Infinity;
  // a footprint of a few square metres: a post, a pump, a kiosk. Without a measured
  // height it is a single storey; with one, up to a small tower's worth
  if (area < 30) {
    if (!measured) { h = 1; hm = 3.2; } else if (b.hm <= 12) return null;
    else if (b.hm / Math.sqrt(area) <= 8) { hm = 12; h = 4; } else return null; // a measured chimney or mast stays
  } else if (HALL_LIKE.has(type) && area >= 1000 && !(type === 'yes' && b.name)) {
    h = 3; hm = 16;
  } else if (FARMISH.has(type) && area >= 500 && !(type === 'yes' && b.name)) {
    // a farm hall, barn or big shed mapped as a house: two storeys of wall, and a roof that stays a roof
    h = 2; hm = 12;
  } else if (HOUSE_LIKE.has(type) && type !== 'yes' && area < 500) {
    h = 4; hm = 14;
  }
  if (h === Infinity) return null;
  return { h, hm };
}

// trims the row in place (the rows are written to tiles as they are: no extra fields)
const done = new WeakSet();
export function capBuilding(b) {
  if (!b || !b.pts || b.pts.length < 3 || done.has(b)) return b;
  done.add(b);
  const lim = heightLimits(b);
  if (!lim) return b;
  if (b.h > lim.h) b.h = lim.h;
  if (b.hm > lim.hm) b.hm = lim.hm;
  if (b.hm !== undefined && b.hm < b.h * LEVEL) b.hm = Math.round(b.h * LEVEL * 10) / 10;
  return b;
}
