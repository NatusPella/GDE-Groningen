// Places of the tile world (docs/PROVINCIE-PLAN.md 2.6: "wijken worden
// plaats + wijk"): the towns, villages, hamlets and their districts of the
// layers next to the city (index-corridor.json global.places, from the
// cached place nodes by scripts/world/build_corridor.mjs). Where the old
// Ommeland data has no village (ommelandplace.js), this names the spot.

// how far a place's name reaches from its node, by kind
const REACH = { city: 4500, town: 1700, village: 800, hamlet: 350, industrial: 2500 };
const DISTRICT_REACH = 900;

const PLACES = { list: [], seats: [], districts: [], signs: [] };

// what a motorway gantry can sign to: cities and towns (streetfurniture.js
// destinationFor): a city weighs more, nothing beyond 45 km
const SIGN_KINDS = { city: 0.12, town: 0 };

export function setWorldPlaces(list) {
  PLACES.list = Array.isArray(list) ? list : [];
  PLACES.seats = PLACES.list.filter((p) => REACH[p.kind] !== undefined);
  PLACES.signs = PLACES.seats.filter((p) => SIGN_KINDS[p.kind] !== undefined && p.name)
    .map((p) => ({ n: p.name, x: p.x, y: p.y, w: SIGN_KINDS[p.kind], scale: 40000, max: 45000 }));
  PLACES.districts = PLACES.list.filter((p) => p.of && (p.kind === 'suburb' || p.kind === 'quarter' || p.kind === 'neighbourhood'));
}

// gantry destinations from the province data, or null when there are none
export const worldSignPlaces = () => (PLACES.signs.length ? PLACES.signs : null);

export const worldPlacesReady = () => PLACES.seats.length > 0;

// { place, district, near } at (x, y): in a place's reach its name (and the
// nearest district of it within 900 m), else the nearest place within 5 km
// with near: true; null without places.
export function worldPlaceAt(x, y) {
  if (!PLACES.seats.length) return null;
  let best = null, bs = Infinity, nearest = null, nd = Infinity;
  for (const p of PLACES.seats) {
    const d = Math.hypot(p.x - x, p.y - y);
    // inside the reach, the smaller place wins over the town round it
    const s = d / REACH[p.kind];
    if (s < 1 && s < bs) { bs = s; best = p; }
    if (d < nd) { nd = d; nearest = p; }
  }
  // a district within reach names its town, also where the town's own node is far
  let district = null, dd = DISTRICT_REACH;
  for (const q of PLACES.districts) {
    if (best && q.of !== best.name) continue;
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < dd) { dd = d; district = q; }
  }
  if (!best && district) return { place: district.of, district: district.name, near: false };
  if (!best) return { place: nearest && nd < 5000 ? nearest.name : '', district: '', near: true };
  return { place: best.name, district: district ? district.name : '', near: false };
}

// The zoom (map zoom: 1 = the city's extent) from which a place's name shows on
// the full map, and the minimap's reach in metres, by kind.
const LABEL = {
  city: { zoom: 0, mm: 40000, rank: 0 }, town: { zoom: 0, mm: 14000, rank: 1 }, industrial: { zoom: 0.6, mm: 6000, rank: 2 },
  village: { zoom: 0.8, mm: 3500, rank: 3 }, hamlet: { zoom: 2.4, mm: 1500, rank: 4 },
  suburb: { zoom: 3, mm: 2200, rank: 5 }, quarter: { zoom: 4, mm: 1500, rank: 6 }, neighbourhood: { zoom: 5, mm: 1200, rank: 7 },
};

// Names to write in the window [x0, x1] x [y0, y1]: [{ name, kind, x, y, rank, zoom, mm }],
// most important first; the caller keeps the labels clear of each other.
export function worldPlaceLabels(x0, y0, x1, y1) {
  const out = [];
  for (const p of PLACES.list) {
    const L = LABEL[p.kind];
    if (!L || !p.name || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    out.push({ name: p.name, kind: p.kind, x: p.x, y: p.y, rank: L.rank, zoom: L.zoom, mm: L.mm, pop: p.pop || 0 });
  }
  return out.sort((a, b) => a.rank - b.rank || b.pop - a.pop);
}
