// The interior kinds (epic Interieurs, #1150) as data: what a building type becomes inside, how big
// the hall must be, when the door is open, what is heard inside and who stands in it. Pure data and
// one resolver; no scene. The layouts that fill a kind are in interiorlayout.js, the shop colours
// come from the winkelkit (winkelkit.js) so the inside matches the shop window (interiorglass.js).
import { WINKEL, SHOP_KINDS } from './winkelkit.js';

// minW / minD: the smallest hall (m) worth walking into; h: ceiling height range (m);
// open: always null (businesses never close, owner decision 21-11); ambience: inside sound bed
// (geluid.js reads the id); roles: who can stand here (interiornpc.js).
export const KINDS = {
  winkel:      { label: 'Winkel', minW: 3.2, minD: 3.5, h: [2.6, 3.4], open: null, ambience: 'winkel', roles: ['winkelier', 'klant'] },
  horeca:      { label: 'Horeca', minW: 4, minD: 5, h: [2.7, 3.6], open: null, ambience: 'horeca', roles: ['barman', 'gast'] },
  kantoor:     { label: 'Kantoor', minW: 4, minD: 5, h: [2.6, 3.2], open: null, ambience: 'kantoor', roles: ['receptionist', 'medewerker'] },
  woning:      { label: 'Woning', minW: 3.4, minD: 4.5, h: [2.5, 2.9], open: null, ambience: 'woning', roles: ['bewoner', 'student'] },
  kerk:        { label: 'Kerk', minW: 6, minD: 8, h: [6, 9], open: null, ambience: 'kerk', roles: ['koster', 'bezoeker'] },
  station:     { label: 'Stationshal', minW: 6, minD: 6, h: [4, 6], open: null, ambience: 'station', roles: ['loketmedewerker', 'reiziger'] },
  bibliotheek: { label: 'Bibliotheek', minW: 6, minD: 6, h: [3, 4], open: null, ambience: 'bibliotheek', roles: ['bibliothecaris', 'lezer'] },
  garage:      { label: 'Garage', minW: 5, minD: 6, h: [3.2, 4.5], open: null, ambience: 'garage', roles: ['monteur'] },
  publiek:     { label: 'Publiek gebouw', minW: 5, minD: 5, h: [2.8, 3.6], open: null, ambience: 'kantoor', roles: ['baliemedewerker', 'bezoeker', 'sporter', 'trainer'] },
};
export const KIND_IDS = Object.keys(KINDS);

// publiek variants (a counter hall with its own props)
export const PUBLIEK_VARIANTS = ['gemeente', 'politie', 'apotheek', 'ziekenhuis', 'school', 'hotel', 'sportschool'];

// Owner decision (21-11): shops, cafes, offices and every other business are ALWAYS open. Only the homes of other people are shut.
export const HORECA_TYPES = ['cafe', 'kroeg', 'restaurant'];

// OSM building type -> interior kind. null = not enterable (a shed, a ruin, a carport).
const BY_TYPE = {
  house: 'woning', detached: 'woning', terrace: 'woning', semidetached_house: 'woning', bungalow: 'woning', residential: 'woning',
  apartments: 'woning', dormitory: 'woning',
  retail: 'winkel', commercial: 'kantoor', office: 'kantoor',
  church: 'kerk', cathedral: 'kerk', chapel: 'kerk',
  train_station: 'station', station: 'station', transportation: 'station',
  library: 'bibliotheek',
  garage: 'garage', garages: 'garage', service: 'garage', industrial: 'garage', warehouse: 'garage', factory: 'garage', workshop: 'garage',
  civic: 'publiek', public: 'publiek', government: 'publiek', hospital: 'publiek', school: 'publiek', hotel: 'publiek',
  university: 'publiek', college: 'publiek', kindergarten: 'publiek', sports_centre: 'publiek', fitness_centre: 'publiek',
};
const PUBLIEK_BY_TYPE = { civic: 'gemeente', public: 'gemeente', government: 'gemeente', hospital: 'ziekenhuis', school: 'school', university: 'school', college: 'school', kindergarten: 'school', hotel: 'hotel', sports_centre: 'sportschool', fitness_centre: 'sportschool' };
// types that never get an interior (the building is no room: sheds, roofs, ruins, farms' barns, towers)
export const NOT_ENTERABLE = new Set(['shed', 'roof', 'carport', 'ruins', 'construction', 'greenhouse', 'barn', 'farm_auxiliary', 'cowshed', 'stable', 'silo', 'water_tower', 'guardhouse', 'static_caravan', 'houseboat', 'tent', 'toilets', 'hut', 'cabin', 'kiosk']);

// a facility (FAC.all row: kind + wk) to an interior kind, for the buildings with a real place in them
export function kindOfFacility(f) {
  if (!f) return null;
  const wk = f.wk;
  if (HORECA_TYPES.includes(wk)) return { kind: 'horeca', sub: wk };
  if (wk && SHOP_KINDS.includes(wk) && wk !== 'kermiskraam') return { kind: 'winkel', sub: wk };
  switch (f.kind) {
    case 'police': return { kind: 'publiek', sub: 'politie' };
    case 'pharmacy': return { kind: 'publiek', sub: 'apotheek' };
    case 'hospital': case 'doctors': case 'gppost': case 'ambulance': return { kind: 'publiek', sub: 'ziekenhuis' };
    case 'car_repair': case 'car': case 'tyres': case 'car_parts': return { kind: 'garage', sub: 'werkplaats' };
    case 'fuel': return { kind: 'winkel', sub: 'kiosk' };
    case 'gym': case 'fitness': case 'fitness_centre': case 'sports_centre': return { kind: 'publiek', sub: 'sportschool' };
    case 'busstation': return { kind: 'station', sub: 'bus' };
    default: return null;
  }
}

// What a building becomes: the shop window type first (the shopfront of that building is of this type),
// then the facility in it, then the OSM building type. { kind, sub } or null.
// `spot`: the kindOfFacility result for the facility inside it, if any.
export function kindOfBuilding(b, spot = null) {
  if (!b || b.landmark || b.rooms || b.interior) return null;
  const t = b.type || 'yes';
  if (NOT_ENTERABLE.has(t)) return null;
  const sf = b.shopFront;
  if (sf && sf.type && sf.type !== 'kermiskraam' && WINKEL[sf.type]) return { kind: 'winkel', sub: sf.type };
  if (spot) return spot;
  const k = BY_TYPE[t];
  if (k) return { kind: k, sub: k === 'publiek' ? PUBLIEK_BY_TYPE[t] || 'gemeente' : (t === 'industrial' || t === 'warehouse' || t === 'factory') ? 'magazijn' : t === 'dormitory' ? 'studentenkamer' : null };
  if (t === 'yes') return (b.h || 0) >= 5 ? { kind: 'kantoor', sub: null } : { kind: 'woning', sub: null };
  return null;
}

// Businesses never close (owner decision): there is no opening hour that keeps the player out.
export const isOpen = () => true;

// Private homes: most doors are locked. A deterministic share stands open (the "open huis"), a
// player-owned or rented home always (Bezit, Homebase: ownedOpen). seed in 0..1.
export const HOME_OPEN_SHARE = 0.22;
export function homeOpen(seed01, owned = false) { return owned || seed01 < HOME_OPEN_SHARE; }

export const labelOf = (kind, sub) => {
  if (kind === 'winkel' && WINKEL[sub]) return WINKEL[sub].label;
  return (KINDS[kind] || { label: 'Gebouw' }).label;
};
