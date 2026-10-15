// Open-wereldleven, batch 1: the pure rules behind the ambient street life.
// Who shows up where and when (density by district and time of day), the
// invented names and colours, the loot and lines. No three.js and no world
// state, so the spawn rules can be tested in node (scripts/streetlife_test.mjs).
// Every name is invented: no real brands, chains or people.

export const NAMES = {
  paper: 'De Reep',
  newsVan: 'Noord-Nieuws',
  bikeShare: 'Wisselwiel',
  bernard: 'Bernhard met de Karretje',
  rowing: 'Roeivereniging',
};

// Delivery chains (invented names, bag colours picked to be nobody's brand).
export const CHAINS = [
  { id: 'happie', name: 'Happie', color: '#9bd630', trim: '#2b3a12' },
  { id: 'flitsmaal', name: 'Flitsmaal', color: '#d6336c', trim: '#3a0f1f' },
  { id: 'gauw', name: 'Gauw Gebracht', color: '#6a3fb5', trim: '#1c1030' },
];
// Wisselwiel bike-share: the front wheel is tinted coral (not blue)
export const SHARE_TINT = '#ff6a4d';

// Where the city is dense. Mirrors pedestrians.js CITY_CENTRE (kept here so
// this file stays free of imports).
export const CENTRE = { x: 191.86, y: 138.11, r: 380 };

export const finite = (...n) => n.every((v) => Number.isFinite(v));

export function distToCentre(x, y) {
  return Math.hypot(x - CENTRE.x, y - CENTRE.y);
}

// 0..1: how much ambient street life belongs here. The centre and the student
// districts are heaviest, the villa streets and estates lighter, the polders
// (and everything beyond the town) get none.
export function lifeDensity(profileKey, d) {
  if (!Number.isFinite(d) || d > 2200) return 0;
  let base = 0.4;
  switch (profileKey) {
    case 'centrum': base = 1; break;
    case 'student': base = 0.9; break;
    case 'bakfiets': base = 0.7; break;
    case 'chic': base = 0.35; break;
    case 'industrie': base = 0.15; break;
    default: base = 0.35;
  }
  if (d < CENTRE.r) base = Math.max(base, 0.9);
  else if (d > 1500) base *= 0.35;
  return base;
}

export function hourOf(world) {
  const h = world && world.dayNight && world.dayNight.hour;
  return Number.isFinite(h) ? h : 14;
}

export const isDinnerTime = (h) => h >= 17 && h < 21.5;
export const isLunchTime = (h) => h >= 11.5 && h < 13.5;
export const isRush = (h) => (h >= 7.5 && h < 9.2) || (h >= 16.3 && h < 18.3);
export const isNight = (h) => h >= 22.5 || h < 6;

// --- bikes ----------------------------------------------------------------------

// Share of the cyclists that are delivery riders with a big cube bag: a few
// all day in the busy parts, many more at dinner time.
export function deliveryChance(profileKey, d, hour) {
  const dens = lifeDensity(profileKey, d);
  if (dens <= 0) return 0;
  let k = 0.05;
  if (isDinnerTime(hour)) k = 0.2;
  else if (isLunchTime(hour)) k = 0.1;
  else if (hour >= 21.5 && hour < 23.5) k = 0.1;
  else if (isNight(hour) || hour < 10) k = 0.02;
  return k * dens;
}

export function sharedBikeChance(profileKey, d) {
  const dens = lifeDensity(profileKey, d);
  if (dens <= 0) return 0;
  return (profileKey === 'centrum' ? 0.12 : profileKey === 'student' ? 0.1 : 0.04) * dens;
}

// Students moving house on a cargo bike with a sofa, mattress or plant.
export function moverChance(profileKey, d, hour) {
  const dens = lifeDensity(profileKey, d);
  if (dens <= 0 || hour < 9 || hour >= 20) return 0;
  return (profileKey === 'student' ? 0.07 : profileKey === 'bakfiets' ? 0.04 : profileKey === 'centrum' ? 0.02 : 0.005) * dens;
}

export const BIKE_LOADS = ['sofa', 'matras', 'plant', 'kasten'];

// Extra cyclists to add to the target: rush hours and dinner in the busy parts.
export function bikeBoost(profileKey, d, hour) {
  const dens = lifeDensity(profileKey, d);
  if (dens < 0.5) return 0;
  let n = 0;
  if (isRush(hour)) n += 4;
  if (isDinnerTime(hour)) n += 4;
  if (profileKey === 'student') n += 2;
  return Math.round(n * dens);
}

// A variant for trafficfleet.pickBikeVariant, or null for "not one of ours".
export function pickStreetBike(profileKey, d, hour, rng = Math.random) {
  const r = rng();
  const dc = deliveryChance(profileKey, d, hour);
  if (r < dc) {
    const chain = CHAINS[Math.floor(rng() * CHAINS.length)];
    return { type: 'delivery', chain };
  }
  const mc = moverChance(profileKey, d, hour);
  if (r < dc + mc) return { type: 'mover', load: BIKE_LOADS[Math.floor(rng() * BIKE_LOADS.length)] };
  if (r < dc + mc + sharedBikeChance(profileKey, d)) return { type: 'share' };
  return null;
}

// A shabby student bike: most have no light at all.
export function shabbyHasLight(profileKey, rng = Math.random) {
  return rng() > (profileKey === 'student' || profileKey === 'centrum' ? 0.75 : 0.4);
}

// --- water ----------------------------------------------------------------------

// What the boat spawner should pick instead of the default mix, or null.
// ctx: { hour, d (to centre), profile, wide (a broad channel), width (mean, m, optional), have: {skiff, acht, sup} }
export function pickWaterLife(rng, ctx) {
  const dens = lifeDensity(ctx.profile, ctx.d);
  if (dens <= 0 || isNight(ctx.hour)) return null;
  const have = ctx.have || {};
  const early = (ctx.hour >= 6 && ctx.hour < 10.5) || (ctx.hour >= 17 && ctx.hour < 20.5);
  // rowing wants room: not in the narrow inner canals
  const rowOk = ctx.d > 150 && (ctx.width === undefined || ctx.width >= 12);
  const r = rng();
  if (rowOk && have.acht < 1 && ctx.wide && r < (early ? 0.07 : 0.025)) return 'acht';
  if (rowOk && have.skiff < 2 && r < (early ? 0.2 : 0.08)) return 'skiff';
  const day = ctx.hour >= 10 && ctx.hour < 19.5;
  if (have.sup < 3 && rng() < (day ? 0.22 : 0.05) * Math.min(1, dens + 0.2)) return 'sup';
  return null;
}

// --- people on foot -------------------------------------------------------------

// Chance that a quay or street slot of this kind is created: heavy in the
// centre, light further out, nothing in the polders.
export function slotChance(kind, profileKey, d) {
  const dens = lifeDensity(profileKey, d);
  if (dens <= 0) return 0;
  const centre = d < CENTRE.r;
  switch (kind) {
    case 'seller': return centre ? 0.22 : d < 900 ? 0.05 : 0;
    case 'beggar': return centre ? 0.18 : d < 900 ? 0.05 : 0;
    case 'magnet': return centre ? 0.5 : d < 1100 ? 0.2 : 0;
    default: return 0;
  }
}

export const CARRIED = ['sofa', 'matras', 'plant'];

export function moverWalkerChance(profileKey, d, hour) {
  return moverChance(profileKey, d, hour) * 0.8;
}

// --- the news van ---------------------------------------------------------------

export function newsVanWanted(hour, d) {
  return d < 1400 && hour >= 8 && hour < 21;
}

// --- magnet fishing ---------------------------------------------------------------

export const GRENADE_REWARD = 120;
export const GRENADE_CHANCE = 0.07;
export const MAGNET_JUNK = [
  { name: 'een fietsslot', value: 0 },
  { name: 'een verroeste fietsbel', value: 0 },
  { name: 'een kapotte fietspomp', value: 0 },
  { name: 'een hoefijzer', value: 2 },
  { name: 'een bos oude sleutels', value: 0 },
  { name: 'een winkelwagentje (maar dan een klein stuk)', value: 0 },
  { name: 'een blikje', value: 0 },
  { name: 'een gouden oorbel? Nee, messing', value: 1 },
  { name: 'een zwaar stuk schroot', value: 3 },
  { name: 'een fietswiel zonder fiets', value: 1 },
];

export function rollMagnet(rng = Math.random) {
  if (rng() < GRENADE_CHANCE) return { grenade: true, name: 'een oude granaat', value: 0 };
  const j = MAGNET_JUNK[Math.floor(rng() * MAGNET_JUNK.length)];
  return { grenade: false, name: j.name, value: j.value };
}

// --- lines (text only: no recordings, no voice) -------------------------------------

export const SELLER_LINES = [
  'De Reep! Nieuwe De Reep!',
  'De Reep, twee euro, goed voor de stad!',
  'Even kijken in De Reep?',
  'Verse De Reep, nog warm van de pers!',
];
export const SELLER_BUY = [
  'De Reep: "Studenten klagen over te weinig fietsenrekken" (en die staan vol).',
  'De Reep: "Grote Markt nog steeds in het midden, aldus onderzoek".',
  'De Reep: "Weerbericht: ja". Verder een kruiswoordpuzzel die je niet af krijgt.',
  'De Reep: "Eenden eisen meer broodkruimels". Fijn dat iemand het opschrijft.',
];
export const BEGGAR_ASK = ['Heb je een muntje voor me?', 'Een euro voor een broodje?', 'Sorry dat ik het vraag, een muntje misschien?'];
export const BEGGAR_THANKS = ['Dankjewel, fijne dag nog!', 'Zo, dankjewel. Goed van je.', 'Dank je. Mooi weer, hè?', 'Lief van je. Pas op je fiets!'];
export const BEGGAR_NO_COIN = 'Geen kleingeld bij je. Je knikt vriendelijk terug.';

// Bernhard: a lookalike-in-style (cap, long coat, cart), not a real person.
// The hook is a small errand for later: his cart was borrowed by students.
export const BERNARD_LINES = [
  'Moi. Bernhard. Van de Karretje. Dat staat er ook echt op.',
  'Dat karretje heb ik al twintig jaar. Wat erin zit gaat niemand wat aan.',
  'Gisteren hebben studenten mijn tweede karretje geleend. "Even naar de Oosterpoort", zeiden ze.',
  'Als je een karretje met een rode wimpel ziet: zeg maar dat Bernhard het terug wil. Er zit mijn thermosfles in.',
  'Ik zit hier al langer dan die fietsenstalling. Zeg maar gerust dat ik de buurt ken.',
];

export const GRENADE_FOUND = 'Een oude granaat! Niet aan komen. Meld het bij de politie.';
export const GRENADE_REPORTED = 'De politie sluit het gebied af en neemt de granaat mee. Dankjewel voor het melden!';
