// Dieren per streek (#193): welke soorten waar leven, hoeveel per tegel, waar
// ze staan en hoe ze reageren op de speler en voertuigen. Pure data en regels,
// Node-safe, zonder THREE of Math.random: dezelfde tegel geeft altijd dezelfde
// dieren, zodat er niets hoeft te worden opgeslagen. wildlife.js en
// countrylife.js tekenen en laten lopen wat dit plan zegt (lichte instancing,
// een mesh per soort); sfx/ambience.js speelt het geluid via `sound`.
//
// Bloedeloos: dieren rennen, vliegen of duiken weg. Een aangereden dier is
// de zaak van wildlife.js (runOverAnimal), niet van dit plan.

import { mulberry32 } from './rng.js';

// habitat: waar op de tegel het dier staat (weide | water | kust | wad | dijk | stad).
// density: dieren per tegel (1 tegel = TILE_M breed) in de eigen habitat, vóór de streekfactor.
// flee: afstand (m) waarop het wegrent van een lopende speler, en van een voertuig (flee * 1.6 bij snelheid).
// speed: vluchtsnelheid m/s. group: [min, max] per groepje. sound: ambience.js-sleutel of null (nog geen sample).
export const SPECIES = {
  koe: { habitat: 'weide', density: 3, group: [2, 5], flee: 7, speed: 2.2, move: 'lopen', sound: 'cow' },
  schaap: { habitat: 'dijk', density: 5, group: [3, 8], flee: 9, speed: 3.2, move: 'lopen', sound: 'sheep' },
  gans: { habitat: 'weide', density: 4, group: [3, 9], flee: 14, speed: 9, move: 'vliegen', sound: 'duck' },
  meeuw: { habitat: 'kust', density: 4, group: [2, 6], flee: 10, speed: 8, move: 'vliegen', sound: 'seagull' },
  reiger: { habitat: 'water', density: 1, group: [1, 1], flee: 16, speed: 7, move: 'vliegen', sound: null },
  eend: { habitat: 'water', density: 3, group: [2, 5], flee: 6, speed: 4, move: 'zwemmen', sound: 'duck' },
  vis: { habitat: 'water', density: 6, group: [4, 10], flee: 5, speed: 3, move: 'duiken', sound: null },
  zeehond: { habitat: 'wad', density: 2, group: [2, 6], flee: 18, speed: 3.5, move: 'duiken', sound: null },
};
export const SPECIES_IDS = Object.keys(SPECIES);

export const TILE_M = 128;
// Het dichtheidsbudget: hoeveel dieren één tegel er hoogstens heeft, en hoeveel in totaal rond de speler.
export const TILE_BUDGET = 14;
export const TOTAL_BUDGET = { laag: 24, middel: 48, hoog: 80 };
export const DESPAWN_M = 220;

// Per streek (regioleven.js-id's plus stad en wadden): factor op density per soort; ontbrekend = 0.
export const STREEK_MIX = {
  stad: { eend: 1, meeuw: 0.5, reiger: 0.6, vis: 0.8 },
  hogeland: { schaap: 1.4, gans: 1.2, koe: 0.5, meeuw: 0.5, reiger: 0.4 },
  eemsdelta: { meeuw: 1.3, eend: 0.8, reiger: 0.8, vis: 1, schaap: 0.5 },
  wadden: { zeehond: 1.5, meeuw: 1.6, schaap: 0.6, vis: 0.6 },
  westerkwartier: { koe: 1.4, schaap: 0.6, gans: 0.8, reiger: 0.7, eend: 0.8, vis: 0.8 },
  oldambt: { koe: 0.6, gans: 1.4, schaap: 0.5, reiger: 0.4 },
  veenkolonien: { gans: 1, eend: 1.2, reiger: 0.9, vis: 1.2, koe: 0.3 },
  westerwolde: { koe: 1.2, schaap: 0.8, reiger: 0.9, eend: 1, vis: 1, gans: 0.6 },
  lauwerskust: { gans: 1.5, meeuw: 1.2, reiger: 1, eend: 0.8, zeehond: 0.4, vis: 0.8, schaap: 0.7 },
  hunsingo: { schaap: 1.2, gans: 1.1, koe: 0.7, meeuw: 0.6, reiger: 0.5 },
};
export const STREKEN_PLAN = Object.keys(STREEK_MIX);

// Wat een tegel aan habitats heeft: { weide, water, kust, wad, dijk, stad } als 0..1 aandelen.
// Soorten verschijnen alleen in hun habitat; de som over een tegel blijft onder TILE_BUDGET.
export function tileAnimals(streek, tileX, tileY, habitats = {}, seed = 1) {
  const mix = STREEK_MIX[streek] || STREEK_MIX.stad;
  const rng = mulberry32(((tileX * 73856093) ^ (tileY * 19349663) ^ (seed * 83492791)) >>> 0);
  const out = [];
  let left = TILE_BUDGET;
  for (const id of SPECIES_IDS) {
    const sp = SPECIES[id];
    const share = Math.max(0, Math.min(1, habitats[sp.habitat] || 0));
    const f = mix[id] || 0;
    // eerst de rng aftrekken, zodat een soort toevoegen de rest van de tegel niet verschuift
    const rollCount = rng(), rollSize = rng(), px = rng(), py = rng();
    if (!share || !f) continue;
    const expected = sp.density * f * share;
    if (rollCount > Math.min(0.95, expected / 2)) continue;     // de meeste tegels hebben maar een of twee soorten
    const size = Math.round(sp.group[0] + rollSize * (sp.group[1] - sp.group[0]));
    const n = Math.min(left, size);
    if (n <= 0) continue;
    left -= n;
    out.push({ kind: id, n, x: px * TILE_M, y: py * TILE_M, habitat: sp.habitat, move: sp.move });
  }
  return out;
}

// Beperk een lijst groepjes rond de speler tot het totaalbudget van het kwaliteitsprofiel,
// dichtstbij eerst. groups: [{ n, x, y }] in wereldmeters.
export function capByBudget(groups, px, py, quality = 'hoog') {
  const cap = TOTAL_BUDGET[quality] || TOTAL_BUDGET.hoog;
  const sorted = groups.slice().sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  const kept = [];
  let used = 0;
  for (const g of sorted) {
    if (Math.hypot(g.x - px, g.y - py) > DESPAWN_M) continue;
    if (used + g.n > cap) continue;
    kept.push(g);
    used += g.n;
  }
  return { kept, used };
}

// Schrikt een dier op? mover: { x, y, speed, kind: 'speler' | 'voertuig' }. Geeft null of een vluchtvector
// (eenheidsrichting weg van de mover) en de snelheid. Een stilstaande speler schrikt niet verder dan de helft.
export function fleeFrom(kind, ax, ay, mover) {
  const sp = SPECIES[kind];
  if (!sp || !mover) return null;
  const dx = ax - mover.x, dy = ay - mover.y;
  const d = Math.hypot(dx, dy);
  const moving = (mover.speed || 0) > 0.5;
  let reach = sp.flee;
  if (mover.kind === 'voertuig') reach *= moving ? 1.6 : 0.5;
  else if (!moving) reach *= 0.5;
  else if (mover.speed > 5) reach *= 1.3;
  if (d >= reach) return null;
  const ux = d > 1e-6 ? dx / d : 1, uy = d > 1e-6 ? dy / d : 0;
  const urgency = 1 - d / reach;
  return { ux, uy, speed: sp.speed * (0.6 + 0.4 * urgency), move: sp.move };
}

// Een dier komt weer tot rust: wanneer het ver genoeg weg is, of na hold seconden.
export const CALM_AFTER = 6;
export function calmed(sinceFleeing, distToMover, kind) {
  const sp = SPECIES[kind];
  return !sp || sinceFleeing > CALM_AFTER || distToMover > sp.flee * 2.5;
}

// Geluid: de ambience.js-sleutel voor een soort of null. Zeehond en vis zijn stil tot er een sample voor is.
export const soundOf = (kind) => (SPECIES[kind] ? SPECIES[kind].sound : null);

// --- aansluiting op wildlife.js ------------------------------------------------------------
// wildlife.js houdt per soort een limiet rond de speler aan. De streek en het kwaliteitsprofiel
// schalen die limieten: meer meeuwen aan de kust, koeien in het Westerkwartier, minder op een
// zwakke machine. De som blijft hierdoor onder het totaalbudget van het profiel.
const LIMIET_KIND = { seagull: ['meeuw'], grazer: ['koe', 'schaap'], duck: ['eend', 'gans'] };
export function wildlifeLimits(streek, quality, base) {
  const mix = STREEK_MIX[streek] || STREEK_MIX.stad;
  const q = (TOTAL_BUDGET[quality] || TOTAL_BUDGET.hoog) / TOTAL_BUDGET.hoog;
  const out = { ...base };
  for (const [kind, soorten] of Object.entries(LIMIET_KIND)) {
    if (base[kind] == null) continue;
    const f = Math.max(...soorten.map((s) => mix[s] || 0));
    const streekF = Math.max(0.25, Math.min(1.6, f));
    out[kind] = Math.max(1, Math.round(base[kind] * streekF * Math.max(0.4, q)));
  }
  return out;
}

// Koe of schaap voor een nieuwe weide, naar de streekmix. roll: 0..1.
export function grazerPick(streek, roll) {
  const mix = STREEK_MIX[streek] || STREEK_MIX.stad;
  const k = (mix.koe || 0) + 0.0001, s = (mix.schaap || 0) + 0.0001;
  return roll < k / (k + s) ? 'cow' : 'sheep';
}

// Kans dat een nieuwe weide een ganzenvlucht krijgt in plaats van vee: naar de gans-factor van de streek.
export function gansKans(streek) {
  const mix = STREEK_MIX[streek] || STREEK_MIX.stad;
  return Math.min(0.6, (mix.gans || 0) * 0.3);
}
