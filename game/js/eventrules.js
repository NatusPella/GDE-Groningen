// Open-wereld events, batch 2 (summer only): a light earthquake, blue-green
// algae in the lakes, the Gronings Ontzet fireworks and the German tourists on
// the bloemetjesmarkt. Pure rules (no DOM, no THREE): worldevents.js plays them,
// scripts/events_test.mjs tests them. All names and lines are invented.
//
// The earthquake is a quiet, respectful side line: a short rumble, a shaking
// picture, a few startled people, one Kiekdoar line. Nothing breaks, nobody is
// hurt, no jokes about damage. The one company in the news line is fictional.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const hash01 = (n) => {
  let h = (Math.imul(Math.floor(n) | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

// --- the earthquake ----------------------------------------------------------------------------

export const QUAKE = {
  gap: [420, 980],
  first: [300, 600],
  duration: [5, 8],
  magnitude: [1.6, 3.1],
  maxShake: 0.075,
  reactRadius: 45,
  reactors: 4,
  bikeRadius: 55,
  alarms: 2,
};

export function rollQuakeGap(rng = Math.random, first = false) {
  const [a, b] = first ? QUAKE.first : QUAKE.gap;
  return a + rng() * (b - a);
}

// May a quake start now? Never over a scene, a minigame, a fight or a call.
export function mayQuake(s) {
  if (!s) return false;
  if (s.cinematic || s.minigame || s.paused || s.dead || s.indoors || s.heliRun || s.pigeon) return false;
  if (s.wanted > 0 || s.call || s.mission || s.sideJob) return false;
  return true;
}

export function rollQuake(rng = Math.random) {
  const [d0, d1] = QUAKE.duration, [m0, m1] = QUAKE.magnitude;
  const mag = Math.round((m0 + rng() * (m1 - m0)) * 10) / 10;
  return { dur: d0 + rng() * (d1 - d0), mag };
}

// 0..1 over the quake: a quick rise, a rumbling plateau, a slow fade.
export function quakeEnvelope(t, dur) {
  if (!(dur > 0) || t < 0 || t >= dur) return 0;
  const k = t / dur;
  if (k < 0.12) return k / 0.12;
  if (k < 0.45) return 1 - (k - 0.12) * 0.25;
  return 0.92 * Math.pow(1 - (k - 0.45) / 0.55, 1.7);
}

// Camera shake in metres at game time `time` for amplitude `amp` (0..1 x maxShake).
export function quakeJitter(time, amp) {
  const a = clamp(amp, 0, 1) * QUAKE.maxShake;
  const t = time * 31;
  return { x: Math.sin(t) * a, y: Math.sin(t * 1.37 + 1.1) * a * 0.55, z: Math.cos(t * 0.83 + 0.4) * a };
}

// How strongly the picture shakes for magnitude `mag`: a 3.1 is the full shake, a 1.6 about half.
export const quakeStrength = (mag) => clamp(0.35 + (mag - 1.5) * 0.4, 0.3, 1);

// What a parked bike does: a small rattle around its own heading.
export function bikeWobble(time, amp, seed = 0) {
  return Math.sin(time * 38 + seed * 7.3) * 0.035 * clamp(amp, 0, 1);
}

export const QUAKE_BARKS = [
  'Voelde je dat ook?',
  'Is dat een vrachtwagen? Er rijdt niks.',
  'De kopjes trilden. Alles goed bij jullie?',
  'Dat was geen donder.',
  'Even stil. Hoorde je dat?',
  'Mijn fiets rammelde zelf. Dat is nieuw.',
];

// Kiekdoar: one calm line, no damage, no blame. `{m}` = the magnitude.
export const QUAKE_NEWS = [
  'Lichte aardbeving in het Hogeland, kracht {m}. Geen schade gemeld. Delfstof Noord volgt de metingen.',
  'Even getril in Grunn en omgeving: aardbeving van {m}. Geen schade of gewonden gemeld.',
  'Kort getril onder de Stad, kracht {m}. Alles in orde, laat de meldkamer weten.',
];
export const quakeNewsText = (m, rng = Math.random) => QUAKE_NEWS[Math.floor(rng() * QUAKE_NEWS.length)].replace('{m}', String(m).replace('.', ','));

// --- blue-green algae -----------------------------------------------------------------------------

export const ALGAE = {
  minArea: 18000,
  patchesPerLake: 4,
  radius: [9, 20],
  speed: 0.62,
  staminaDrain: 2.6,
  hurtPerS: 1.2,
  hurtFloor: 40,
  nearSign: 55,
};

// Some summer days have algae in the big lakes, the same for the whole day.
export const algaeDay = (day) => hash01((day | 0) * 7919 + 17) < 0.5;
// The first algae day from `day` on (for the debug hook and the tests).
export function nextAlgaeDay(day) {
  for (let d = day | 0; d < (day | 0) + 40; d++) if (algaeDay(d)) return d;
  return day | 0;
}

// Patches of a lake: `lake` = { id, bounds: [minx, miny, maxx, maxy], area }, `inWater(x, y)`
// tells whether a point is water. Deterministic for the lake and the day.
export function algaePatches(lake, day, inWater) {
  if (!lake || !(lake.area >= ALGAE.minArea) || !algaeDay(day)) return [];
  const [x0, y0, x1, y1] = lake.bounds;
  const out = [];
  for (let k = 0, tries = 0; out.length < ALGAE.patchesPerLake && tries < 80; tries++, k++) {
    const r = ALGAE.radius[0] + hash01(lake.id * 131 + day * 17 + k * 3 + 1) * (ALGAE.radius[1] - ALGAE.radius[0]);
    const x = x0 + hash01(lake.id * 977 + day * 31 + tries * 5 + 2) * (x1 - x0);
    const y = y0 + hash01(lake.id * 541 + day * 13 + tries * 7 + 3) * (y1 - y0);
    const ring = [[0, 0], [r * 0.8, 0], [-r * 0.8, 0], [0, r * 0.8], [0, -r * 0.8]];
    if (!ring.every(([dx, dy]) => inWater(x + dx, y + dy))) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r)) continue;
    out.push({ x, y, r, lake: lake.id });
  }
  return out;
}

export function patchAt(patches, x, y) {
  for (const p of patches) if (Math.hypot(p.x - x, p.y - y) <= p.r) return p;
  return null;
}

// The cost of swimming through a patch: slower, tires sooner, a little health
// (never below hurtFloor: it makes you get out, not die).
export function algaeEffect(onPatch) {
  return onPatch
    ? { speed: ALGAE.speed, staminaDrain: ALGAE.staminaDrain, hurtPerS: ALGAE.hurtPerS, hurtFloor: ALGAE.hurtFloor }
    : { speed: 1, staminaDrain: 1, hurtPerS: 0, hurtFloor: 0 };
}

export function algaeHurt(health, dt, eff) {
  if (!(eff.hurtPerS > 0) || !(health > eff.hurtFloor)) return health;
  return Math.max(eff.hurtFloor, health - eff.hurtPerS * dt);
}

export const ALGAE_SIGN = ['NIET ZWEMMEN', 'Blauwalg in het water'];
export const ALGAE_NEWS = 'Blauwalg in de plassen rond Grunn: zwemmen wordt afgeraden. Let op de borden langs de waterkant.';
export const ALGAE_SWIM_MSG = 'Blauwalg! Je wordt er beroerd van. Zwem terug naar de kant.';

// --- the Ontzet fireworks -------------------------------------------------------------------------

export const SHOW = { from: 21.5, to: 23.5, range: 2800, launchSpread: 45, minH: 70, maxH: 135, finaleAt: 0.88 };
const PALETTE = [[1, 0.35, 0.3], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.6, 1, 0.5], [1, 1, 1], [1, 0.55, 0.9], [0.75, 0.55, 1]];

// { on, progress } at clock hour `h` on Gronings Ontzet.
export function showState(h, ontzet) {
  if (!ontzet || !Number.isFinite(h)) return { on: false, progress: 0 };
  const hh = h < 4 ? h + 24 : h;
  if (hh < SHOW.from || hh >= SHOW.to) return { on: false, progress: 0 };
  return { on: true, progress: (hh - SHOW.from) / (SHOW.to - SHOW.from) };
}

// Seconds to the next shell: calm at first, a barrage at the finale.
export function shellGap(progress, rng = Math.random) {
  const fin = progress >= SHOW.finaleAt;
  return fin ? 0.18 + rng() * 0.3 : 1.1 + rng() * 1.9;
}

// One shell over `centre` { x, y }: where it goes up, how high it bursts, its colour and kind.
export function makeShell(rng, centre, progress = 0.5) {
  const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * SHOW.launchSpread;
  const fin = progress >= SHOW.finaleAt;
  const kind = rng() < 0.22 ? 'willow' : rng() < 0.4 ? 'ring' : 'peony';
  return {
    x: centre.x + Math.cos(a) * r,
    y: centre.y + Math.sin(a) * r,
    h: SHOW.minH + rng() * (SHOW.maxH - SHOW.minH) * (fin ? 1.1 : 1),
    rise: 1.0 + rng() * 0.5,
    color: PALETTE[Math.floor(rng() * PALETTE.length)],
    kind,
    n: kind === 'ring' ? 26 : 34,
    big: fin || rng() < 0.18,
  };
}

// The bang arrives later the further away you are (shortened to stay playable).
export const soundLag = (dist) => clamp(dist / 343, 0, 2.2);

// --- German tourists on the bloemetjesmarkt ----------------------------------------------------------

export const TOURISTS = { max: 12, radius: 230, from: 9, to: 19, spawnGap: 5 };

export function touristTarget({ market, hour, nearCentre }) {
  if (!market || !nearCentre || !(hour >= TOURISTS.from && hour < TOURISTS.to)) return 0;
  const peak = hour >= 11 && hour < 16;
  return peak ? TOURISTS.max : Math.round(TOURISTS.max * 0.6);
}

export const GERMAN_LINES = [
  'Pardon, waar is hier de toren? Wij zijn uit Duitsland.',
  'Zoveel bloemen! En overal fietsen.',
  'Nog een plantje? De koffer is al vol.',
  'Kijk, een eierbal. Die proberen we.',
  'Waar staat onze bus ook alweer?',
  'Heerlijk, dit weer. Hier is het altijd zomer!',
  'Twee koffie, alsjeblieft. En een stuk taart.',
  'Hoe zeg je hier "goedendag"? Moi?',
  'Wat zijn de straten vol fietsen!',
  'Ik wilde maar één bloem kopen.',
  'Prachtig hier. En zo gezellig.',
  'Mogen we een foto maken?',
];
export const GERMAN_HELLO = ['Goedendag! Spreekt u Duits?', 'Moi! Zeiden we dat goed?', 'Pardon, hebben jullie hier pannenkoeken?'];
export const TOURIST_SHIRTS = ['#e8d84a', '#4aa0d8', '#e8643a', '#7ac060', '#f0f0e8', '#d86aa0'];
export const TOURIST_HATS = [0xd8c060, 0xe8e8e0, 0x5a8ac0, 0xc0603a];

export function touristGroup(rng = Math.random) {
  const size = 2 + Math.floor(rng() * 2);
  return { size, shirt: TOURIST_SHIRTS[Math.floor(rng() * TOURIST_SHIRTS.length)], hat: TOURIST_HATS[Math.floor(rng() * TOURIST_HATS.length)] };
}
