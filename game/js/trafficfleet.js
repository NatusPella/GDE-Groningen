// What drives around where: the traffic fleet per wijk stereotype. Old
// student bikes and rust buckets in Selwerd and Paddepoel, big dark cars in
// the villa streets of the south, bakfietsen in the Oosterpoort and the
// Schildersbuurt, vans and trucks on the industrial estates, taxis and
// delivery vans in the centre. Pure data and picks: vehicle.js spawns them.
// The street-life layer (streetlifedata.js) adds delivery riders with a big
// bag, bike-share bikes, students moving house and unlit shabby bikes.
import { MODS } from './cheatmods.js';
import { lookModel } from './streekverkeer.js';
import { pickStreetBike, shabbyHasLight, distToCentre, SHARE_TINT } from './streetlifedata.js';

const CAR = {
  hatch: { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 23, turnRate: 3.0 },
  sedan: { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6 },
  wagon: { name: 'wagon', len: 4.5, wid: 1.8, maxSpeed: 32, accel: 8, brake: 23, turnRate: 2.5 },
  van: { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0 },
  sport: { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 42, accel: 12, brake: 27, turnRate: 3.2 },
  suv: { name: 'suv', len: 4.7, wid: 1.95, maxSpeed: 33, accel: 8.5, brake: 22, turnRate: 2.4 },
  roestbak: { name: 'hatch', rusty: true, len: 3.7, wid: 1.65, maxSpeed: 24, accel: 6, brake: 18, turnRate: 2.8 },
  // elektrisch: stil, snelle start, een rijke buurt-favoriet; tokkie: opgevoerd, luid, schreeuwkleuren
  elektrisch: { name: 'hatch', electric: true, len: 4.0, wid: 1.75, maxSpeed: 34, accel: 11, brake: 23, turnRate: 3.0 },
  tokkie: { name: 'hatch', tokkie: true, len: 3.8, wid: 1.72, maxSpeed: 40, accel: 11, brake: 23, turnRate: 3.2 },
  taxi: { name: 'taxi', len: 4.6, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6 },
  delivery: { name: 'van', livery: 'pakket', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0 },
  cashvan: { name: 'cashvan', len: 5.2, wid: 2.0, maxSpeed: 28, accel: 6.8, brake: 19, turnRate: 2.0 },
  truck: { name: 'truck', len: 8.5, wid: 2.5, maxSpeed: 22, accel: 4.5, brake: 14, turnRate: 1.5 },
  newsvan: { name: 'van', livery: 'nieuws', len: 5.0, wid: 2.0, maxSpeed: 27, accel: 7, brake: 19, turnRate: 2.0 },
  ambulance: { name: 'ambulance', len: 6.0, wid: 2.0, maxSpeed: 30, accel: 8, brake: 18, turnRate: 2.6 },
};

export const MIDIBUS_MODEL = { name: 'midibus', len: 8.4, wid: 2.3, maxSpeed: 20, accel: 5, brake: 12, turnRate: 1.3, color: '#132a44' };

const GREYS = ['#c7c9cc', '#23262a', '#e8e6e0', '#4a4d52', '#2f3a52', '#7a1f1f', '#2e4a34', '#8a8d91', '#1b1c1f', '#c7c9cc', '#e8e6e0'];
const FADED = ['#8a6a4a', '#6b7a5a', '#9a9a8a', '#7a4a3a', '#5a6a7a', '#b0a080', '#c9c2a8', '#7a2f2a', '#3f5a7a'];
const EV_COLORS = ['#e8e6e0', '#c7c9cc', '#2f6b8f', '#3d7a5a', '#23262a', '#e8e6e0'];
const TOKKIE_COLORS = ['#e8c93a', '#1f6fd0', '#b01c1c', '#23262a', '#7a2fa0', '#e0701e'];
const POSH = ['#1b1c1f', '#23262a', '#2f3a52', '#4a4d52', '#e8e6e0', '#3a2a2a', '#1b1c1f'];
const VAN_COLORS = ['#e8e6e0', '#d9d9d9', '#c9541e', '#2f5a8f', '#e8e6e0', '#6b6e70'];

// Weights per wijk profile (special fleets like ambulances and cash vans
// also get a guaranteed presence in vehicle.js).
const PROFILES = {
  standaard: { car: { hatch: 3, sedan: 2, wagon: 1.6, van: 1, sport: 0.25, suv: 0.6, roestbak: 0.5, taxi: 0.2, delivery: 0.5, truck: 0.15, elektrisch: 0.6, tokkie: 0.35 }, colors: GREYS, bakfiets: 0.06, oldBike: 0.2 },
  student: { car: { roestbak: 4, hatch: 2.5, sedan: 0.6, wagon: 0.4, van: 0.5, taxi: 0.15, delivery: 0.4, elektrisch: 0.25, tokkie: 0.7 }, colors: FADED, bakfiets: 0.03, oldBike: 0.65 },
  chic: { car: { suv: 3, sedan: 3, wagon: 2, sport: 1.2, hatch: 0.7, delivery: 0.3, elektrisch: 2, tokkie: 0.05 }, colors: POSH, bakfiets: 0.18, oldBike: 0.05 },
  bakfiets: { car: { hatch: 2.5, wagon: 2.5, sedan: 1.2, suv: 0.4, van: 0.6, delivery: 0.6, roestbak: 0.3, elektrisch: 1.2, tokkie: 0.15 }, colors: GREYS, bakfiets: 0.32, oldBike: 0.15 },
  industrie: { car: { van: 3.5, truck: 2.2, delivery: 1.5, hatch: 1, sedan: 0.6, wagon: 0.4, tokkie: 0.25, elektrisch: 0.2 }, colors: VAN_COLORS, bakfiets: 0, oldBike: 0.25 },
  centrum: { car: { taxi: 0.9, delivery: 1.6, hatch: 1.8, van: 1, sedan: 1.2, wagon: 0.6, cashvan: 0.08, suv: 0.3, elektrisch: 1, tokkie: 0.2 }, colors: GREYS, bakfiets: 0.15, oldBike: 0.5 },
};

export const TRAFFIC_PROFILES = PROFILES;

// Tijd van de dag (0..24): wie rijdt wanneer. Een vermenigvuldiger op het wijkgewicht van een soort.
const between = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
export function hourFactor(kind, hour) {
  if (!Number.isFinite(hour)) return 1;
  const h = ((hour % 24) + 24) % 24;
  switch (kind) {
    case 'delivery': return between(h, 17, 21) ? 2.2 : between(h, 9, 17) ? 1.2 : between(h, 23, 6) ? 0.2 : 1;
    case 'taxi': return between(h, 22, 5) ? 3 : between(h, 6, 9) ? 1.3 : between(h, 10, 16) ? 0.8 : 1;
    case 'van': case 'truck': return between(h, 6, 17) ? 1.6 : between(h, 22, 5) ? 0.25 : 0.8;
    case 'tokkie': return between(h, 20, 3) ? 2.5 : between(h, 5, 12) ? 0.4 : 1;
    case 'sport': return between(h, 18, 24) ? 1.5 : 1;
    case 'cashvan': return between(h, 8, 16) ? 1 : 0.1;
    case 'hatch': case 'wagon': return between(h, 7, 9) || between(h, 16, 18) ? 1.3 : 1;
    default: return 1;
  }
}

const WIJK_PROFILE = {
  Selwerd: 'student', Selwerderwijk: 'student', Paddepoel: 'student', 'Paddepoel-Noord': 'student', 'Paddepoel-Zuid': 'student',
  Studentenbuurt: 'student', Bernoullipleinbuurt: 'student', Oppenheimbuurt: 'student', Professorenbuurt: 'student', Reitdiepswaard: 'student',
  Sterrebosbuurt: 'chic', Zuiderpark: 'chic', Oranjebuurt: 'chic', Grunobuurt: 'chic', 'De Linie': 'chic', Europapark: 'chic',
  Noorderplantsoenbuurt: 'chic',
  Oosterpoort: 'bakfiets', Schildersbuurt: 'bakfiets', Rivierenbuurt: 'bakfiets', Herewegbuurt: 'bakfiets', Zeeheldenbuurt: 'bakfiets',
  Hortusbuurt: 'bakfiets', Kostverloren: 'bakfiets', Florabuurt: 'bakfiets', Tuinwijk: 'bakfiets', Concordiabuurt: 'bakfiets', Ebbingekwartier: 'bakfiets',
  'Martini Trade Park': 'industrie', Eemskanaal: 'industrie', Hoendiep: 'industrie', Peizerweg: 'industrie', Suikerfabriekterrein: 'industrie',
  Cortinghborg: 'industrie', Metalenkwartier: 'industrie', 'Kop van Oost': 'industrie', Westerhaven: 'industrie',
  Binnenstad: 'centrum', 'Binnenstad-Oost': 'centrum', 'A-kwartier': 'centrum', Stationsgebied: 'centrum', Bisschopskwartier: 'centrum',
};

const profileCache = new Map();

// Nearest named buurt decides (the map only has polygons for the municipality).
export function wijkProfileAt(map, x, y) {
  const k = Math.floor(x / 60) + ',' + Math.floor(y / 60);
  let p = profileCache.get(k);
  if (p) return p;
  let best = null, bd = Infinity;
  for (const h of (map.meta && map.meta.neighbourhoodPoints) || []) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) { bd = d; best = h; }
  }
  const name = best && bd < 1100 * 1100 ? best.name : '';
  p = { key: WIJK_PROFILE[name] || 'standaard', wijk: name };
  p.def = PROFILES[p.key];
  profileCache.set(k, p);
  return p;
}

function weighted(rng, table) {
  let sum = 0;
  for (const k in table) sum += table[k];
  let r = rng() * sum;
  for (const k in table) {
    r -= table[k];
    if (r <= 0) return k;
  }
  return Object.keys(table)[0];
}

// { kind, model } for a traffic car spawned around (x, y).
export function pickTrafficCar(map, x, y, rng = Math.random, ctx = {}) {
  const prof = wijkProfileAt(map, x, y).def;
  const table = {};
  for (const k in prof.car) table[k] = prof.car[k] * hourFactor(k, ctx.hour);
  const kind = weighted(rng, table);
  return { kind, model: lookModel(carModel(kind, rng, prof.colors), MODS.look, rng) };
}

export function carModel(kind, rng = Math.random, colors = GREYS) {
  const base = CAR[kind] || CAR.hatch;
  let color = colors[Math.floor(rng() * colors.length)];
  if (kind === 'elektrisch') color = EV_COLORS[Math.floor(rng() * EV_COLORS.length)];
  else if (kind === 'tokkie') color = TOKKIE_COLORS[Math.floor(rng() * TOKKIE_COLORS.length)];
  else if (kind === 'taxi') color = rng() < 0.7 ? '#1b1c1f' : '#e8e6e0';
  else if (kind === 'delivery') color = rng() < 0.5 ? '#e0701e' : '#e8c93a';
  else if (kind === 'cashvan') color = '#5b625d';
  else if (kind === 'newsvan') color = '#f2f0ea';
  else if (kind === 'ambulance') color = '#f1d21c';
  else if (kind === 'truck') color = VAN_COLORS[Math.floor(rng() * VAN_COLORS.length)];
  else if (kind === 'van' && colors !== VAN_COLORS) color = VAN_COLORS[Math.floor(rng() * VAN_COLORS.length)];
  return { ...base, color };
}

// Flags the rest of the game reads off a traffic car of this kind.
export function applyFleetFlags(v, kind) {
  v.fleetKind = kind;
  if (kind === 'taxi') v.isTaxi = true;
  else if (kind === 'ambulance') v.isAmbulance = true;
  else if (kind === 'cashvan') v.isCashVan = true;
  else if (kind === 'newsvan') v.isNewsVan = true;
}

const OLD_BIKE_COLORS = ['#5a3a2a', '#4a4d52', '#6b2a24', '#2f3b2a', '#7a6a5a', '#1c1c1c'];
const RIDERS = ['#2f5c8a', '#7a2e2e', '#3f6b3f', '#c9a227', '#6a2e8a', '#2b2b2b', '#d0457a'];

// null: a regular bike from vehicle.js' own pool. ctx.hour (0..24) steers the
// time-of-day mix (more delivery riders at dinner time).
export function pickBikeVariant(map, x, y, rng = Math.random, ctx = {}) {
  const prof = wijkProfileAt(map, x, y);
  const def = prof.def;
  const rider = RIDERS[Math.floor(rng() * RIDERS.length)];
  const hour = Number.isFinite(ctx.hour) ? ctx.hour : 14;
  const d = distToCentre(x, y);
  const street = pickStreetBike(prof.key, d, hour, rng);
  if (street && street.type === 'delivery') {
    return { name: 'bike', delivery: street.chain.id, bag: street.chain.color, bagTrim: street.chain.trim, len: 1.8, wid: 0.5, maxSpeed: 6.4, accel: 3.2, brake: 5, turnRate: 4.2, color: '#23262a', rider: street.chain.color };
  }
  if (street && street.type === 'mover') {
    return { name: 'bike', cargo: true, load: street.load, len: 2.55, wid: 0.72, maxSpeed: 4.4, accel: 2.0, brake: 4.6, turnRate: 3.0, color: ['#2f4a3a', '#1c1c1c', '#23324a', '#6b2a24'][Math.floor(rng() * 4)], rider };
  }
  if (street && street.type === 'share') {
    return { name: 'bike', share: true, tint: SHARE_TINT, len: 1.75, wid: 0.5, maxSpeed: 5.0, accel: 2.7, brake: 5, turnRate: 4.4, color: '#c9ccd0', rider };
  }
  if (rng() < def.bakfiets) {
    return { name: 'bike', cargo: true, len: 2.55, wid: 0.72, maxSpeed: 5.2, accel: 2.4, brake: 5, turnRate: 3.2, color: ['#2f4a3a', '#1c1c1c', '#23324a', '#6b2a24'][Math.floor(rng() * 4)], rider };
  }
  if (rng() < 0.12) {
    return { name: 'bike', senior: true, old: true, len: 1.75, wid: 0.5, maxSpeed: 5.2, accel: 1.6, brake: 5, turnRate: 3.6, color: '#c9ccd0', rider: '#8a8f94' };
  }
  if (rng() < def.oldBike) {
    return { name: 'bike', old: true, noLight: !shabbyHasLight(prof.key, rng), len: 1.75, wid: 0.5, maxSpeed: 5.4, accel: 2.8, brake: 5, turnRate: 4.4, color: OLD_BIKE_COLORS[Math.floor(rng() * OLD_BIKE_COLORS.length)], rider };
  }
  return null;
}

// Hoeveel auto's een stuk weg aankan (#265): het doelaantal van manageTrafficPopulation is een vast getal, ook in een gehucht met
// twee korte wegen. Dan komen er dertig auto's op één kruising samen, die in een wachtkring raken (de lus-doorbreker laat ze door
// elkaar heen rijden). Eén auto per roadM meter begaanbare weg binnen het spawnbereik, nooit meer dan het vaste doel, minstens
// minCars zodat een eenzame weg niet uitgestorven is. lengthM: som van de weglengtes binnen het spawnbereik.
export function roadCapacityTarget(lengthM, target = 30, { roadM = 70, minCars = 4 } = {}) {
  if (!Number.isFinite(lengthM) || lengthM < 0) return target;
  return Math.max(Math.min(minCars, target), Math.min(target, Math.ceil(lengthM / roadM)));
}

// Som van de lengtes (m) van de wegsegmenten waarvan het midden binnen radius van (x, y) ligt; roads: [{ pts: [[x, y], ...] }].
export function roadLengthWithin(roads, x, y, radius) {
  let len = 0;
  for (const r of roads) {
    const P = r.pts || [];
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1];
      if (Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y) <= radius) len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
  }
  return len;
}
