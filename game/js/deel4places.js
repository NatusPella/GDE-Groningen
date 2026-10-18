// Where the provincial missions of the new story (akte 2 to 5, storyarc_nieuw.js) happen: real
// places of the province by name, as { x, y } in world metres. The province's own place list
// (worldplaces.js, from the tiles) wins where it has the place; the rest is a lat/lon fixed here.
// The lat/lon are rounded to a few hundred metres: a stage target is snapped to the nearest road
// where the map has one and uses a wide radius. Not yet looked at in the game (see the issues).
import { wgsToWorld } from './rdnew.js';
import { worldPlaceNamed } from './worldplaces.js';

// name -> [lat, lon]
export const PLACE_LATLON = {
  Warffum: [53.3967, 6.5617], Usquert: [53.4036, 6.611], Uithuizen: [53.4033, 6.6753], Winsum: [53.3306, 6.5214],
  Zoutkamp: [53.3314, 6.2975], Lauwersoog: [53.4082, 6.205], Noordpolderzijl: [53.4147, 6.4108],
  Eemshaven: [53.44, 6.835], Delfzijl: [53.3317, 6.9167], Dollard: [53.29, 7.08],
  Winschoten: [53.1433, 7.0333], Veendam: [53.1058, 6.8808], Stadskanaal: [52.9892, 6.9544],
  'Ter Apel': [52.8767, 7.0617], Bourtange: [53.0072, 7.1953], Zuidhorn: [53.2467, 6.4025],
  Hoogkerk: [53.2, 6.5], Sellingen: [52.9544, 7.1033], Leek: [53.1633, 6.3767],
};

// places fixed in world metres (landmarkkit.js has the vesting's church and mill)
export const PLACE_XY = { 'Vesting Bourtange': [42430, 22740] };

// { x, y } of a named place, or null for a name nobody knows
export function placePoint(name) {
  const w = worldPlaceNamed(name);
  if (w && Number.isFinite(w.x) && Number.isFinite(w.y)) return { x: w.x, y: w.y };
  if (PLACE_XY[name]) return { x: PLACE_XY[name][0], y: PLACE_XY[name][1] };
  const ll = PLACE_LATLON[name];
  if (!ll) return null;
  const [x, y] = wgsToWorld(ll[0], ll[1]);
  return { x, y };
}

// a point `off` metres from a place (east, south), for the several spots of one mission
export function placeSpot(name, off = [0, 0]) {
  const p = placePoint(name);
  return p ? { x: p.x + off[0], y: p.y + off[1] } : null;
}
