// Places of the tile world (docs/PROVINCIE-PLAN.md 2.6: "wijken worden
// plaats + wijk"): the towns, villages, hamlets and their districts of the
// layers next to the city (index-corridor.json global.places, from the
// cached place nodes by scripts/world/build_corridor.mjs). Where the old
// Ommeland data has no village (ommelandplace.js), this names the spot.

// how far a place's name reaches from its node, by kind
const REACH = { city: 4500, town: 1700, village: 800, hamlet: 350, industrial: 2500 };
const DISTRICT_REACH = 900;

const PLACES = { list: [], seats: [], districts: [] };

export function setWorldPlaces(list) {
  PLACES.list = Array.isArray(list) ? list : [];
  PLACES.seats = PLACES.list.filter((p) => REACH[p.kind] !== undefined);
  PLACES.districts = PLACES.list.filter((p) => p.of && (p.kind === 'suburb' || p.kind === 'quarter' || p.kind === 'neighbourhood'));
}

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
