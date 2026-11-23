// Dagritmes van de stad (#1314, epic Levende stad): waar een voetganger naartoe loopt hangt af van het uur en de dag.
// 's Ochtends op een werkdag naar werk, school, station en bushalte; tussen de middag naar winkels, horeca en terrassen;
// 's avonds horeca en een rondje door het park; 's nachts naar huis, behalve het uitgaanspubliek bij de uitgaanskernen.
// In het weekend begint de dag later en gaat het meer om winkels, markt en park.
//
// Pure regels, Node-safe, zonder wereld, klok of DOM: pedroutes.js vraagt de soort bestemming en het plan bij aankomst,
// cityprops.js de bezetting van de terrassen, pedestrians.js het uitgaanspubliek. Toeval komt altijd van de aanroeper
// (roll 0..1), zodat scripts/dailyrhythm_test.mjs het hele schema kan narekenen.
// Hoeveel voetgangers er zijn blijft van simlagen.js (tijdFactor); dit bestand zegt alleen waar ze heen gaan en wat ze doen.
//
// Samen spelen: van de wereld van wie het spel opende. De host simuleert de voetgangers op zijn eigen klok en kalenderdag,
// een gast ziet ze via de gewone snapshot (plek, richting, snelheid). Zie docs/COOP-GAST.md, "Levende stad".

// De uitgaanskernen van het centrum ('s nachts is het daar druk, verder is de stad stil). Wereldcoördinaten.
export const NIGHTLIFE_SPOTS = [
  { x: 391.97, y: 116.7, r: 90 },
  { x: 398.36, y: 200.15, r: 80 },
  { x: 161.05, y: 93.31, r: 90 },
];

export const DEST_KINDS = ['werk', 'school', 'station', 'halte', 'winkel', 'horeca', 'park', 'uitgaan', 'huis'];

// Dagdelen in speluren (0..24).
export const DAY_PARTS = ['nacht', 'vroeg', 'ochtendspits', 'ochtend', 'lunch', 'middag', 'avondspits', 'avond', 'laat'];
const PART_END = [5.5, 7, 9.3, 11.5, 13.5, 16.3, 18.5, 22, 24];

const normHour = (h) => (Number.isFinite(h) ? ((h % 24) + 24) % 24 : 12);

export function dayPartOf(hour) {
  const h = normHour(hour);
  for (let i = 0; i < PART_END.length; i++) if (h < PART_END[i]) return DAY_PARTS[i];
  return 'laat';
}

// weekday: 0 zondag .. 6 zaterdag (calendar.js weekdayOf). Na middernacht hoort de nacht nog bij de avond ervoor:
// vrijdagnacht 02.00 is uitgaansnacht van vrijdag, niet een zaterdagochtend.
export const isWeekend = (weekday) => weekday === 0 || weekday === 6;
export function effectiveWeekday(hour, weekday) {
  const wd = Number.isInteger(weekday) ? ((weekday % 7) + 7) % 7 : 3;
  return normHour(hour) < 6 ? (wd + 6) % 7 : wd;
}

// Weekdag van een speldag: dag 1 is vrijdag 14 augustus (calendar.js weekdayOf; de test vergelijkt ze).
export const weekdayOfGameDay = (n) => ((((5 + Math.round(Number.isFinite(n) ? n : 1) - 1) % 7) + 7) % 7);

// De klok uit de wereld, zonder allocatie: speluur (daynight.js), kalenderdag (calendarday.js) en hoe nat het is.
export function readClock(world, out) {
  const h = world && world.dayNight && world.dayNight.hour;
  out.hour = Number.isFinite(h) ? h : 14;
  out.weekday = weekdayOfGameDay(world && world.calendar ? world.calendar.day : 1);
  out.wet = world && world.weather ? world.weather.wet || 0 : 0;
  return out;
}

// Gewichten per dagdeel (niet genormaliseerd; een soort zonder plekken in de buurt valt weg).
//                werk school station halte winkel horeca park uitgaan huis
const W = (werk, school, station, halte, winkel, horeca, park, uitgaan, huis) => ({ werk, school, station, halte, winkel, horeca, park, uitgaan, huis });
const WEEKDAY = {
  nacht:        W(0.3, 0,   0.3, 0,   0,   0.5, 0,   3,   4),
  vroeg:        W(4,   0.5, 3,   2.5, 0.3, 0.3, 0.4, 0,   0.5),
  ochtendspits: W(5,   3,   3.5, 3,   0.5, 0.4, 0.3, 0,   0.3),
  ochtend:      W(2,   1,   1.2, 1.2, 3,   1,   1,   0,   0.8),
  lunch:        W(0.8, 0.6, 0.6, 0.6, 2.5, 4,   1.5, 0,   0.5),
  middag:       W(1.2, 0.8, 1,   1,   3.5, 1.8, 1.5, 0,   0.8),
  avondspits:   W(0.6, 0.3, 3,   3,   2,   1.5, 0.8, 0.2, 3.5),
  avond:        W(0.2, 0,   0.6, 0.6, 0.6, 4,   2,   1.2, 2),
  laat:         W(0,   0,   0.5, 0.3, 0,   1.5, 0.3, 3,   3.5),
};
const WEEKEND = {
  nacht:        W(0,   0,   0.3, 0,   0,   0.6, 0,   4,   3.5),
  vroeg:        W(0.6, 0,   0.8, 0.6, 0.6, 0.4, 1.2, 0,   1.5),
  ochtendspits: W(0.6, 0,   1,   1,   2,   1,   2,   0,   1.5),
  ochtend:      W(0.4, 0,   1,   1,   4,   1.5, 2.5, 0,   1),
  lunch:        W(0.3, 0,   0.8, 0.8, 4,   4,   2.5, 0,   0.6),
  middag:       W(0.3, 0,   1,   1,   4.5, 2.5, 3,   0,   0.8),
  avondspits:   W(0.2, 0,   1.5, 1.5, 1.5, 3,   1.5, 0.5, 2),
  avond:        W(0,   0,   0.6, 0.6, 0.3, 4.5, 1.5, 2,   1.5),
  laat:         W(0,   0,   0.4, 0.3, 0,   1.5, 0.2, 4,   2.5),
};

export function destWeights(hour, weekday) {
  const part = dayPartOf(hour);
  return (isWeekend(effectiveWeekday(hour, weekday)) ? WEEKEND : WEEKDAY)[part];
}

// De soort bestemming. avail(kind) -> true als er plekken van die soort in de buurt zijn (standaard alles).
// roll 0..1 van de aanroeper. Zonder enige beschikbare soort: null (de aanroeper valt terug op een straatwandeling).
export function pickDestKind(hour, weekday, roll, avail = null) {
  const w = destWeights(hour, weekday);
  let total = 0;
  for (let i = 0; i < DEST_KINDS.length; i++) { const k = DEST_KINDS[i]; if (w[k] > 0 && (!avail || avail(k))) total += w[k]; }
  if (total <= 0) return null;
  let r = Math.max(0, Math.min(0.999999, Number.isFinite(roll) ? roll : 0)) * total;
  for (let i = 0; i < DEST_KINDS.length; i++) {
    const k = DEST_KINDS[i];
    if (!(w[k] > 0) || (avail && !avail(k))) continue;
    r -= w[k];
    if (r < 0) return k;
  }
  return null;
}

// Looptempo: in de spits haast, 's avonds slenteren.
const PACE = { nacht: 1.05, vroeg: 1.1, ochtendspits: 1.18, ochtend: 1, lunch: 1, middag: 0.96, avondspits: 1.1, avond: 0.9, laat: 0.95 };
export function paceFor(hour, weekday) {
  const p = PACE[dayPartOf(hour)] || 1;
  return isWeekend(effectiveWeekday(hour, weekday)) ? Math.min(p, 1) * 0.96 : p;
}

// Bezetting van de terrasstoelen (0..1): leeg in de ochtend, vol tussen de middag en 's avonds, regen jaagt ze binnen.
const TERRACE = { nacht: 0.05, vroeg: 0, ochtendspits: 0.05, ochtend: 0.22, lunch: 0.6, middag: 0.48, avondspits: 0.55, avond: 0.75, laat: 0.45 };
export function terraceShare(hour, weekday, wet = 0) {
  const part = dayPartOf(hour);
  let s = TERRACE[part] ?? 0.3;
  if (isWeekend(effectiveWeekday(hour, weekday)) && part !== 'nacht' && part !== 'vroeg') s = Math.min(0.9, s + 0.15);
  const w = Math.max(0, Math.min(1, Number(wet) || 0));
  return s * (1 - 0.8 * w);
}

// Uitgaanspubliek: donderdag (studentenavond), vrijdag en zaterdag vol, de rest van de week een derde minder.
export function nightlifeScale(hour, weekday) {
  const part = dayPartOf(hour);
  if (part !== 'avond' && part !== 'laat' && part !== 'nacht') return 0;
  const wd = effectiveWeekday(hour, weekday);
  const busy = wd === 4 || wd === 5 || wd === 6;
  if (part === 'avond') return normHour(hour) < 21 ? 0 : busy ? 0.6 : 0.3;
  return busy ? 1 : 0.65;
}

// Wat iemand doet bij aankomst. r: [r0, r1, r2] toeval 0..1. ctx: { terrace (vrije terrasstoel dichtbij), bench (vrije bank),
// bike (geparkeerde fiets dichtbij), building (een pand dichtbij), companion (loopt met iemand) }.
// -> { act: 'binnen' | 'terras' | 'bank' | 'fiets' | 'telefoon' | 'praten' | 'wachten', dur (s) }
const ENTER = { werk: 0.85, school: 0.85, winkel: 0.65, horeca: 0.4, huis: 0.8, station: 0.5, halte: 0, park: 0, uitgaan: 0.25 };
const SIT_BENCH = { nacht: 0.03, vroeg: 0.05, ochtendspits: 0.04, ochtend: 0.25, lunch: 0.45, middag: 0.4, avondspits: 0.15, avond: 0.3, laat: 0.1 };
const PHONE = { nacht: 0.5, vroeg: 0.35, ochtendspits: 0.55, ochtend: 0.4, lunch: 0.35, middag: 0.35, avondspits: 0.5, avond: 0.3, laat: 0.45 };
const BIKE_LOCK_CHANCE = 0.22;
export function arrivalPlan(hour, weekday, kind, r = [], ctx = {}) {
  const part = dayPartOf(hour);
  const r0 = r[0] ?? 0.5, r1 = r[1] ?? 0.5, r2 = r[2] ?? 0.5;
  // eerst de fiets op slot (wie vlak bij een rek aankomt), daarna gaat hij alsnog naar binnen of blijft hij
  if (ctx.bike && ctx.building && r2 < BIKE_LOCK_CHANCE && part !== 'nacht') return { act: 'fiets', dur: 2.5 + r1 * 2 };
  if ((kind === 'horeca' || kind === 'uitgaan') && ctx.terrace) {
    const share = terraceShare(hour, weekday);
    if (r0 < Math.min(0.85, share + 0.15)) return { act: 'terras', dur: 45 + r1 * 120 };
  }
  const enter = ctx.building ? (ENTER[kind] ?? 0.2) : 0;
  if (r0 < enter) return { act: 'binnen', dur: 0.6 + r1 * 1.2 };
  if (ctx.bench && r1 < (SIT_BENCH[part] ?? 0.2) * (kind === 'park' ? 1.8 : 1)) return { act: 'bank', dur: 20 + r2 * 60 };
  if (ctx.companion && r2 < talkChance(hour)) return { act: 'praten', dur: 8 + r1 * 14 };
  if (r2 < (PHONE[part] ?? 0.4)) return { act: 'telefoon', dur: 4 + r1 * 8 };
  return { act: 'wachten', dur: kind === 'halte' ? 15 + r1 * 25 : 4 + r1 * 8 };
}

// Twee die samen lopen en stilstaan, praten met elkaar (gebaren, naar elkaar toe gedraaid).
const TALK = { nacht: 0.7, vroeg: 0.2, ochtendspits: 0.15, ochtend: 0.5, lunch: 0.7, middag: 0.6, avondspits: 0.4, avond: 0.8, laat: 0.85 };
export const talkChance = (hour) => TALK[dayPartOf(hour)] ?? 0.5;

// Een korte beschrijving per uur (voor de beeldpagina en de test): de drie zwaarste soorten.
export function topKinds(hour, weekday, n = 3) {
  const w = destWeights(hour, weekday);
  return DEST_KINDS.filter((k) => w[k] > 0).sort((a, b) => w[b] - w[a] || DEST_KINDS.indexOf(a) - DEST_KINDS.indexOf(b)).slice(0, n);
}
