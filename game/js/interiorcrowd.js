// How busy an interior is and what the people there do at what time of day (epic Interieurs, #1150, round 4). Pure data and
// small functions, no scene: a bakery is busy at breakfast, a pub at night, an office in office hours, a gym early and after work,
// a home in the evening. The staff are always there (businesses never close, owner decision 21-11); the customers, guests, readers,
// travellers and other visitors come and go with the hour. Deterministic: whether person i is present is a hash of the building seed
// and i against the crowd level of the hour, so every client that has the same game clock sees the same people in the same room.
import { hash2 } from './rng.js';

export const phaseOf = (hour) => { const h = ((hour % 24) + 24) % 24; return h >= 6 && h < 18 ? 'dag' : h >= 18 && h < 23 ? 'avond' : 'nacht'; };

// Key points [hour, level 0..1] per kind (or 'kind:sub' for a refinement), linear in between, from hour 0 to 24.
const CURVES = {
  winkel: [[0, 0.1], [6, 0.15], [8, 0.5], [10, 0.9], [14, 1], [17, 0.9], [19, 0.5], [22, 0.2], [24, 0.1]],
  'winkel:supermarkt': [[0, 0.1], [7, 0.3], [10, 0.7], [12, 0.8], [16, 1], [18, 1], [20, 0.7], [22, 0.3], [24, 0.1]],
  'winkel:bakker': [[0, 0.05], [6, 0.4], [8, 1], [10, 0.8], [13, 0.5], [16, 0.4], [18, 0.2], [24, 0.05]],
  'winkel:kapper': [[0, 0.05], [8, 0.2], [10, 0.8], [14, 1], [17, 0.7], [19, 0.2], [24, 0.05]],
  'winkel:snackbar': [[0, 0.3], [3, 0.1], [11, 0.4], [13, 0.7], [18, 1], [21, 1], [24, 0.3]],
  'winkel:slager': [[0, 0.05], [8, 0.3], [10, 0.8], [12, 1], [15, 0.6], [17, 0.9], [18, 0.2], [24, 0.05]],
  'winkel:kleding': [[0, 0.05], [10, 0.3], [13, 0.8], [15, 1], [17, 0.9], [18, 0.3], [24, 0.05]],
  'winkel:fietsen': [[0, 0.05], [9, 0.3], [12, 0.6], [15, 0.8], [17, 1], [18, 0.3], [24, 0.05]],
  'winkel:bloemist': [[0, 0.05], [8, 0.5], [10, 1], [13, 0.6], [16, 0.9], [18, 0.2], [24, 0.05]],
  'winkel:elektronica': [[0, 0.05], [10, 0.4], [13, 0.9], [16, 1], [18, 0.5], [21, 0.2], [24, 0.05]],
  'winkel:tweedehands': [[0, 0.05], [10, 0.4], [12, 0.8], [14, 1], [17, 0.7], [18, 0.2], [24, 0.05]],
  'winkel:souvenir': [[0, 0.05], [10, 0.3], [12, 1], [15, 1], [17, 0.6], [19, 0.2], [24, 0.05]],
  'winkel:kiosk': [[0, 0.1], [6, 0.4], [8, 1], [11, 0.5], [16, 0.7], [18, 0.9], [22, 0.4], [24, 0.1]],
  'horeca:cafe': [[0, 0.1], [7, 0.3], [10, 1], [12, 0.8], [15, 0.7], [17, 0.9], [19, 0.5], [22, 0.2], [24, 0.1]],
  'garage:werkplaats': [[0, 0.05], [7, 0.2], [8.5, 1], [12, 0.7], [13, 0.9], [17, 0.7], [18, 0.1], [24, 0.05]],
  horeca: [[0, 0.4], [2, 0.1], [6, 0.1], [9, 0.4], [12, 0.8], [15, 0.6], [18, 0.9], [21, 1], [24, 0.4]],
  'horeca:kroeg': [[0, 1], [2, 0.7], [5, 0.1], [14, 0.3], [18, 0.6], [21, 1], [24, 1]],
  'horeca:restaurant': [[0, 0.1], [11, 0.2], [12.5, 1], [14, 0.4], [17, 0.5], [19, 1], [21, 0.8], [23, 0.2], [24, 0.1]],
  kantoor: [[0, 0.05], [7, 0.1], [9, 1], [12, 0.8], [13, 0.9], [17, 0.8], [18.5, 0.15], [24, 0.05]],
  woning: [[0, 0.5], [6, 0.4], [8, 0.2], [12, 0.2], [17, 0.6], [19, 1], [22, 1], [24, 0.5]],
  'woning:studentenkamer': [[0, 0.9], [4, 0.6], [9, 0.3], [13, 0.5], [18, 0.9], [22, 1], [24, 0.9]],
  kerk: [[0, 0.05], [8, 0.2], [10, 1], [12, 0.4], [16, 0.3], [19, 0.7], [21, 0.1], [24, 0.05]],
  station: [[0, 0.1], [5, 0.2], [7, 1], [9, 0.8], [12, 0.5], [16, 0.9], [18, 1], [20, 0.5], [23, 0.2], [24, 0.1]],
  bibliotheek: [[0, 0], [9, 0.2], [11, 0.8], [15, 1], [19, 0.8], [21, 0.2], [24, 0]],
  garage: [[0, 0.05], [7, 0.2], [9, 1], [16, 0.9], [18, 0.2], [24, 0.05]],
  publiek: [[0, 0.05], [8, 0.3], [10, 1], [14, 0.8], [17, 0.3], [20, 0.1], [24, 0.05]],
  'publiek:sportschool': [[0, 0.1], [5, 0.2], [6.5, 0.9], [9, 0.6], [12, 0.4], [16, 0.7], [17.5, 1], [20.5, 0.9], [22, 0.3], [24, 0.1]],
  'publiek:school': [[0, 0], [7.5, 0.3], [8.5, 1], [15, 0.8], [16, 0.2], [24, 0]],
  'publiek:hotel': [[0, 0.3], [7, 0.8], [11, 0.4], [15, 0.9], [19, 0.8], [24, 0.3]],
  // r6 (22-11): de varianten die tot nu toe de curve van hun soort deelden
  'publiek:museum': [[0, 0], [9.5, 0.2], [11, 0.7], [14, 1], [16, 0.8], [17.5, 0.2], [24, 0]],
  'publiek:bioscoop': [[0, 0.05], [12, 0.2], [14, 0.6], [17, 0.5], [19.5, 1], [21.5, 1], [23, 0.4], [24, 0.05]],
  'publiek:ziekenhuis': [[0, 0.15], [7, 0.4], [9, 1], [12, 0.8], [14, 0.9], [17, 0.5], [21, 0.25], [24, 0.15]],
  'publiek:politie': [[0, 0.2], [7, 0.3], [10, 0.8], [14, 0.6], [18, 0.9], [22, 0.5], [24, 0.2]],
  'publiek:apotheek': [[0, 0.05], [8, 0.4], [10, 1], [13, 0.6], [16, 0.9], [18, 0.4], [24, 0.05]],
  'publiek:gemeente': [[0, 0.05], [8, 0.3], [10, 1], [12, 0.7], [15, 0.8], [17, 0.2], [24, 0.05]],
  'kerk:kapel': [[0, 0], [8, 0.1], [10, 0.6], [12, 0.2], [17, 0.3], [20, 0.1], [24, 0]],
  'kerk:gebedshuis': [[0, 0.05], [5, 0.5], [7, 0.3], [12.5, 0.9], [14, 0.3], [18, 0.8], [21, 0.5], [24, 0.05]],
  'garage:magazijn': [[0, 0.05], [6, 0.3], [8, 1], [12, 0.8], [14, 1], [17, 0.6], [19, 0.1], [24, 0.05]],
};
export const crowdCurves = () => CURVES;

// the crowd level (0..1) of a kind (and its sub) at an hour
export function crowdAt(kind, sub, hour) {
  const c = (sub && CURVES[kind + ':' + sub]) || CURVES[kind] || CURVES.winkel;
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < c.length; i++) {
    if (h <= c[i][0]) { const a = c[i - 1], b = c[i], t = b[0] === a[0] ? 1 : (h - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; }
  }
  return c[c.length - 1][1];
}

// the roles that are always there (staff and whoever is being served: they do not come and go with the crowd)
export const ALWAYS_THERE = new Set(['winkelier', 'barman', 'receptionist', 'loketmedewerker', 'baliemedewerker', 'bibliothecaris', 'monteur', 'kapper', 'bakker', 'knipklant', 'koster', 'serveerster', 'trainer', 'agent', 'apotheker']);

// the rank (0..1) of person i of a building: stable, the same on every client
export const rankOf = (seed, i) => hash2((seed % 100003) * 0.0071 + 5.3, i * 2.17 + 0.9);

// is person i (of this role) present at this crowd level? Staff always; the rest when their rank is below the level, with the
// first of them always there while the level is above 0.15 (so a quiet room is not empty at midday)
export function presentAt(role, seed, i, level, firstGuest = false) {
  if (ALWAYS_THERE.has(role)) return true;
  if (firstGuest && level > 0.15) return true;
  return rankOf(seed, i) < level;
}
