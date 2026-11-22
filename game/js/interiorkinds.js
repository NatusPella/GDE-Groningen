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
  woning:      { label: 'Woning', minW: 2.6, minD: 3.2, h: [2.5, 2.9], open: null, ambience: 'woning', roles: ['bewoner', 'student'] },
  kerk:        { label: 'Kerk', minW: 6, minD: 8, h: [6, 9], open: null, ambience: 'kerk', roles: ['koster', 'bezoeker'] },
  station:     { label: 'Stationshal', minW: 6, minD: 6, h: [4, 6], open: null, ambience: 'station', roles: ['loketmedewerker', 'reiziger'] },
  bibliotheek: { label: 'Bibliotheek', minW: 6, minD: 6, h: [3, 4], open: null, ambience: 'bibliotheek', roles: ['bibliothecaris', 'lezer'] },
  garage:      { label: 'Garage', minW: 5, minD: 6, h: [3.2, 4.5], open: null, ambience: 'garage', roles: ['monteur', 'boer'] },
  publiek:     { label: 'Publiek gebouw', minW: 5, minD: 5, h: [2.8, 3.6], open: null, ambience: 'kantoor', roles: ['baliemedewerker', 'bezoeker', 'sporter', 'trainer', 'arts', 'leraar', 'leerling', 'suppoost', 'museumbezoeker', 'filmbezoeker', 'agent', 'apotheker', 'hotelgast'] },
};
export const KIND_IDS = Object.keys(KINDS);

// r7 (22-11): kleine bijgebouwen als varianten van de soort garage en de portiek van een appartementencomplex als variant van de soort woning.
// Eigen minimale hal en plafond (m): een schuur van 2 bij 2,2 m is nog een kamer, een garagebox is smal en diep. `ceil`: vast plafond (de hal van een schuur is geen kerk).
export const SUB_HALL = {
  'garage:schuur': { minW: 2.0, minD: 2.2, ceil: 2.4 },
  'garage:box': { minW: 2.4, minD: 2.6, ceil: 2.5 }, // the door of a garage box sits in the gable (3 m wide) or in the long side (3 m deep): both work
  'garage:stal': { minW: 3.6, minD: 5, ceil: 3.2 },
  'garage:kas': { minW: 2.4, minD: 3.0, ceil: 2.6 },
  'woning:appartement': { minW: 4, minD: 6 },
};
// the smallest hall of a kind (and its variant)
export const hallMinOf = (kind, sub) => { const s = SUB_HALL[kind + ':' + sub]; const K = KINDS[kind]; return { w: s ? s.minW : K.minW, d: s ? s.minD : K.minD }; };
export const BIJGEBOUW_SUBS = ['schuur', 'box', 'stal', 'kas'];
const BIJGEBOUW_LABELS = { schuur: 'Schuur', box: 'Garagebox', stal: 'Stal', kas: 'Kas' };

// publiek variants (a counter hall with its own props)
export const PUBLIEK_VARIANTS = ['gemeente', 'politie', 'apotheek', 'ziekenhuis', 'school', 'hotel', 'sportschool', 'museum', 'bioscoop'];
export const PUBLIEK_LABELS = { gemeente: 'Gemeentehuis', politie: 'Politiebureau', apotheek: 'Apotheek', ziekenhuis: 'Ziekenhuis', school: 'School', hotel: 'Hotel', sportschool: 'Sportschool', museum: 'Museum', bioscoop: 'Bioscoop' };

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
  university: 'publiek', college: 'publiek', kindergarten: 'publiek', sports_centre: 'publiek', sports_hall: 'publiek', fitness_centre: 'publiek',
  museum: 'publiek', cinema: 'publiek',
  // r6 (audit 22-11): boerderijen en villa's zijn woningen, een hangaar of manege een magazijn, een rekencentrum een kantoor, een gebedshuis een kerk
  farm: 'woning', villa: 'woning', chalet: 'woning', hangar: 'garage', riding_hall: 'garage', data_center: 'kantoor',
  religious: 'kerk', monastery: 'kerk', mosque: 'kerk', synagogue: 'kerk', temple: 'kerk',
  // r7 (22-11): bijgebouwen die een kamer hebben (schuur, stal, kas, garagebox) zijn betreedbaar; zie bijgebouwSub
  shed: 'garage', outbuilding: 'garage', hut: 'garage', cabin: 'garage', boathouse: 'garage', barn: 'garage', farm_auxiliary: 'garage', cowshed: 'garage', stable: 'garage',
  livestock: 'garage', sty: 'garage', agricultural: 'garage', greenhouse: 'garage',
};
// the variant of the bijgebouw types (the rest of the garage types keeps its own sub or none)
const BIJGEBOUW_BY_TYPE = { shed: 'schuur', outbuilding: 'schuur', hut: 'schuur', cabin: 'schuur', boathouse: 'schuur', barn: 'stal', farm_auxiliary: 'stal', cowshed: 'stal', stable: 'stal', livestock: 'stal', sty: 'stal', agricultural: 'stal', greenhouse: 'kas', garage: 'box', garages: 'box' };
const PRAYER_HOUSES = new Set(['religious', 'monastery', 'mosque', 'synagogue', 'temple']);
const PUBLIEK_BY_TYPE = { civic: 'gemeente', public: 'gemeente', government: 'gemeente', hospital: 'ziekenhuis', school: 'school', university: 'school', college: 'school', kindergarten: 'school', hotel: 'hotel', sports_centre: 'sportschool', sports_hall: 'sportschool', fitness_centre: 'sportschool', museum: 'museum', cinema: 'bioscoop' };
// types that never get an interior (the building is no room: sheds, roofs, ruins, farms' barns, towers)
// r7: de schuren, stallen, kassen en boothuizen zijn eruit (nu variant van garage); wat hier blijft heeft echt geen kamer: dak, carport, ruine, bouwplaats,
// silo, toren, tent, toilet, wachthuisje, caravan, woonboot, kiosk, tank, duiventil, bunker, molen, tribune, gemaal, transformatorhuisje.
export const NOT_ENTERABLE = new Set(['roof', 'carport', 'ruins', 'construction', 'silo', 'water_tower', 'guardhouse', 'static_caravan', 'houseboat', 'tent', 'toilets', 'kiosk',
  'storage_tank', 'dugout', 'dovecote', 'bunker', 'windmill', 'bell_tower', 'tower', 'tech_cab', 'transformer_tower',
  'gazebo', 'railway_car', 'grandstand', 'dock', 'poldergemaal', 'pumping_station', 'pavilion']);
// the reason a type stays shut (audit and docs)
export const NOT_ENTERABLE_WHY = {
  roof: 'alleen een dak', carport: 'open, geen wanden', ruins: 'ruine', construction: 'bouwplaats', silo: 'opslag zonder kamer', water_tower: 'toren zonder kamer', guardhouse: 'wachthuisje van een paar vierkante meter',
  static_caravan: 'caravan', houseboat: 'woonboot: ligt op het water', tent: 'tent', toilets: 'toiletgebouwtje', kiosk: 'kiosk te klein voor een hal', storage_tank: 'tank', dugout: 'dug-out', dovecote: 'duiventil', bunker: 'bunker, dicht',
  windmill: 'molen, eigen interieur nodig', bell_tower: 'klokkentoren', tower: 'toren', tech_cab: 'techniekkastje', transformer_tower: 'transformatorhuisje', gazebo: 'prieel, open', railway_car: 'wagon', grandstand: 'tribune, open', dock: 'kade', poldergemaal: 'gemaal, machines', pumping_station: 'gemaal, machines', pavilion: 'open paviljoen',
};

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
    case 'museum': return { kind: 'publiek', sub: 'museum' };
    case 'cinema': return { kind: 'publiek', sub: 'bioscoop' };
    case 'school': return { kind: 'publiek', sub: 'school' };
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
  if (k) return { kind: k, sub: k === 'publiek' ? PUBLIEK_BY_TYPE[t] || 'gemeente' : t === 'chapel' ? 'kapel' : PRAYER_HOUSES.has(t) ? 'gebedshuis' : (t === 'industrial' || t === 'warehouse' || t === 'factory' || t === 'hangar' || t === 'riding_hall') ? 'magazijn' : t === 'dormitory' ? 'studentenkamer' : t === 'apartments' && ringArea(b.pts) >= APPARTEMENT_MIN_AREA ? 'appartement' : (BIJGEBOUW_BY_TYPE[t] && t !== 'garage' && t !== 'garages') ? BIJGEBOUW_BY_TYPE[t] : null };
  if (t === 'yes') return untypedKind(b);
  return null;
}

// --- r7: panden zonder OSM-type (47% van de panden) -----------------------------------------------------------------------
// Alleen eigenschappen van het pand zelf (voetafdruk, hoogte): die zijn op elke client gelijk en hangen niet af van welke tegels er al geladen zijn.
export const APPARTEMENT_MIN_AREA = 220; // m2: een complex met een portiek (kleinere 'apartments' blijven een gewone woning)
export const BEDRIJFSHAL_MIN_AREA = 700;  // m2: een laag, groot pand zonder type is een bedrijfshal (magazijn), geen woning
export function ringArea(pts) {
  if (!pts || pts.length < 4) return 0;
  let a = 0;
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(a) / 2;
}
// langste zijde in meters (de rij sluit zichzelf)
export function longestEdge(pts) {
  let m = 0;
  for (let i = 0; i < pts.length - 1; i++) m = Math.max(m, Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
  return m;
}
// kind of an untyped building: office from 5 m up, a big low one a hall, the rest a home (small ones fall back to bijgebouwSub, see fallbackKinds)
export function untypedKind(b) {
  if ((b.h || 0) >= 5) return { kind: 'kantoor', sub: null };
  if (ringArea(b.pts) >= BEDRIJFSHAL_MIN_AREA && (b.hm || 0) <= 12) return { kind: 'garage', sub: 'magazijn' };
  return { kind: 'woning', sub: null };
}
// the bijgebouw variant of a small building without a type: a long narrow one is a garage box, the rest a shed
export function bijgebouwSub(b) {
  const area = ringArea(b.pts), len = longestEdge(b.pts);
  const aspect = area > 0 ? len * len / area : 1;
  return aspect >= 1.7 && area >= 14 && area <= 45 ? 'box' : 'schuur';
}
// What a building becomes when the primary kind does not fit the hall: a small one is a bijgebouw (shed, garage box) instead of nothing.
// Ordered list of { kind, sub }; empty when there is nothing sensible. Deterministic from the building alone.
export function fallbackKinds(b, primary) {
  if (!primary || b.landmark || b.rooms || b.interior) return [];
  const t = b.type || 'yes';
  const list = (sub) => (sub === 'schuur' ? [{ kind: 'garage', sub }] : [{ kind: 'garage', sub }, { kind: 'garage', sub: 'schuur' }]); // a box that does not fit is still a shed
  if (primary.kind === 'woning' && t === 'yes') return list(bijgebouwSub(b));
  if (primary.kind === 'garage' && (primary.sub === 'magazijn' || primary.sub === null) && (t !== 'yes' || ringArea(b.pts) < 100)) return list(BIJGEBOUW_BY_TYPE[t] || (t === 'yes' ? bijgebouwSub(b) : 'schuur'));
  return [];
}

// Businesses never close (owner decision): there is no opening hour that keeps the player out.
export const isOpen = () => true;

// Private homes: most doors are locked. A deterministic share stands open (the "open huis"), a
// player-owned or rented home always (Bezit, Homebase: ownedOpen). seed in 0..1.
export const HOME_OPEN_SHARE = 0.22;
export function homeOpen(seed01, owned = false) { return owned || seed01 < HOME_OPEN_SHARE; }

export const labelOf = (kind, sub) => {
  if (kind === 'winkel' && WINKEL[sub]) return WINKEL[sub].label;
  if (kind === 'publiek' && PUBLIEK_LABELS[sub]) return PUBLIEK_LABELS[sub];
  if (kind === 'kerk' && sub === 'kapel') return 'Kapel';
  if (kind === 'kerk' && sub === 'gebedshuis') return 'Gebedshuis';
  if (kind === 'garage' && BIJGEBOUW_LABELS[sub]) return BIJGEBOUW_LABELS[sub];
  if (kind === 'woning' && sub === 'appartement') return 'Appartementencomplex';
  return (KINDS[kind] || { label: 'Gebouw' }).label;
};
