// The game's calendar: one Groningen summer, 2026 (docs/verhaal/KALENDER.md).
// Day 1 is vrijdag 14 augustus (the Kop, KEI-week), Gronings Ontzet is day 15
// (vrijdag 28 augustus), the epilogue is on vrijdag 11 september (EPILOGUE_DAY) and the
// astronomical summer ends after dinsdag 22 september, day 40. After that the
// date stops and the days keep counting: "Nazomer · dag 41". It stays summer.
//
// Pure: no DOM, no game state (calendarday.js keeps today's date on the world,
// saves it and drives the HUD). node scripts/calendar_test.mjs tests it.
import { STEPS, PARTS } from './storyarc.js';
import { REGIO_EVENTS } from './regioleven.js';

export const YEAR = 2026;
const AUG = 7;
const START_DATE = 14;
export const LAST_SUMMER_DAY = 40;
export const ONTZET_DAY = 15;
// the epilogue is vrijdag 11 september (docs/verhaal/nieuw)
export const EPILOGUE_DAY = 29;
// from 1 september the sun stays where it was that day
const SUN_HOLD_DAY = 19;

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const WD_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MON_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const utc = (n) => new Date(Date.UTC(YEAR, AUG, START_DATE + n - 1));
// day number of a date in this summer: day(8, 28) = 15
export const day = (month, date) => Math.round((Date.UTC(YEAR, month - 1, date) - Date.UTC(YEAR, AUG, START_DATE)) / 864e5) + 1;

export const weekdayOf = (n) => utc(n).getUTCDay();
export const isNazomer = (n) => n > LAST_SUMMER_DAY;

// { n, weekday, short: 'Vr 28 aug', long: 'Vrijdag 28 augustus', dayLabel: 'dag 15', nazomer }
// After the summer: short 'Wo · nazomer', long 'Woensdag, nazomer · dag 41'.
export function formatDay(n) {
  const d = utc(n), wd = d.getUTCDay();
  const weekday = WEEKDAYS[wd];
  const Weekday = weekday[0].toUpperCase() + weekday.slice(1);
  if (isNazomer(n)) {
    return { n, weekday, nazomer: true, short: `${WD_SHORT[wd]} · nazomer`, dayLabel: `dag ${n}`, long: `${Weekday}, nazomer · dag ${n}` };
  }
  return {
    n, weekday, nazomer: false, date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()],
    short: `${WD_SHORT[wd]} ${d.getUTCDate()} ${MON_SHORT[d.getUTCMonth()]}`,
    dayLabel: `dag ${n}`,
    long: `${Weekday} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
  };
}

// --- the story on the calendar ------------------------------------------------------

// The day each story step plays (August). The parts start on their date card
// (PARTS.date: Kop 14, Romp 18, Staart 24 augustus) and end the day before
// the next one. A step not listed here (a new one)
// gets the day of the step before it.
// The story (storyarc_nieuw.js, docs/verhaal/nieuw 00-OVERZICHT "Kalender"): August dates;
// the epilogue E is on vrijdag 11 september (EPILOGUE_DAY).
const STEP_DATES = {
  'M00': 14, 'M01': 14, 'M02': 15, 'M03': 15, 'M04': 16, 'M05': 16, 'M06': 17,
  'M07': 18, 'M08': 18, 'T1': 18, 'M09': 19, 'M10': 19, 'T2': 20, 'M11': 20,
  'M12': 21, 'M13': 21, 'M14': 22, 'T3': 22, 'M15': 22, 'M16': 22,
  'M17': 24, 'M18': 24, 'M19': 24, 'T4': 25, 'M20': 25, 'M21': 25,
  'M22': 26, 'M23': 27, 'M24': 27, 'M25': 27, 'M26': 28,
};

// Deel 4 "Nazomer" (docs/verhaal/KALENDER.md, Deel 4): day numbers, not August
// dates. The first night of a night mission is its day (the clock after midnight
// is the next day, within the bounds of the next step). Days 41+ are
// "nazomer · dag N". Planned data: the steps are not all built yet; the order
// here is the default build order (a region played in another order gets the
// later of its own day and today, see storyBounds). Weekdays (2026): 33 di,
// 37 za, 40 di, 41 wo, 43 vr, 44 za, 45 zo, 46 ma, 51 za.
export const DEEL4_STEP_DAYS = {
  // F4a: Stad and ring 1. Hogeland: voorronde 1 on za 19 (kermis Uithuizen); Eemsdelta: voorronde 2 on di 22 (the last summer day)
  'O1': day(9, 15), 'O2': day(9, 16), 'O3': day(9, 16), 'O4': day(9, 17), 'n-trekkertrek': day(9, 17), 'O5': day(9, 18),
  'O6': day(9, 19), 'n-warffum': day(9, 19), 'n-delfzijl': day(9, 20), 'O7': day(9, 20), 'O8': day(9, 20), 'O9': day(9, 21),
  'O10': day(9, 22), 'n-woonschip': day(9, 22),
  // F4b: ring 2, nazomer from day 41. Wadkust: voorronde 3 on vr 25 (havenfeest); Westerkwartier: voorronde 4 on zo 27 (O18)
  'n-zoutkamp': day(9, 23), 'O11': day(9, 23), 'O12': day(9, 23), 'O13': day(9, 24), 'O14': day(9, 25), 'n-kotter': day(9, 25),
  'n-zuidhorn': day(9, 25), 'O15': day(9, 26), 'O16': day(9, 26), 'O17': day(9, 27), 'O18': day(9, 27), 'n-schuur': day(9, 27),
  // F4c: ring 3 and 4. Oldambt: voorronde 5 on di 29 (kermis Winschoten); Veenkoloniën: voorronde 6 on vr 2; Westerwolde: the finale on za 3
  'n-winschoten': day(9, 28), 'O19': day(9, 28), 'O20': day(9, 29), 'O21': day(9, 29), 'O22': day(9, 29),
  'n-beerta': day(9, 29), 'n-aanbod': day(9, 29), 'n-ruzie': day(9, 29),
  'n-veendam': day(9, 30), 'O23': day(9, 30), 'O24': day(9, 30), 'O25': day(9, 30), 'O26': day(10, 1), 'O27': day(10, 2),
  'n-brugwachter': day(10, 2), 'n-westerwolde': day(10, 2),
  'O28': day(10, 3), 'O29': day(10, 3), 'O30': day(10, 3), 'O31': day(10, 3), 'O32': day(10, 3), 'n-boshut': day(10, 3),
};
// the seven voorrondes of the Ommelander Ronde, in the order they are won by default
export const VOORRONDE_STEPS = ['O6', 'O10', 'O14', 'O18', 'O22', 'O27', 'O31'];

// Deel 4 "Nazomer" of the story (docs/verhaal/nieuw/DEEL4.md): after the epilogue, still summer (before 22 september)
export const NAZOMER_STEP_DAYS = { M27: day(9, 14), M28: day(9, 15), M29: day(9, 17), T5: day(9, 19), M30: day(9, 19) };

export const STEP_DAY = new Map();
{
  let last = 1;
  for (const s of STEPS) {
    if (STEP_DATES[s.id] != null) last = day(8, STEP_DATES[s.id]);
    else if (s.id === 'E') last = EPILOGUE_DAY;
    else if (NAZOMER_STEP_DAYS[s.id] != null) last = NAZOMER_STEP_DAYS[s.id];
    else if (DEEL4_STEP_DAYS[s.id] != null) last = DEEL4_STEP_DAYS[s.id];
    STEP_DAY.set(s.id, last);
  }
}
export const partStartDay = (part) => {
  const [date, month] = PARTS[part].date.split(' ');
  const m = MONTHS.indexOf(month);
  return day(m >= 0 ? m + 1 : 8, parseInt(date, 10));
};

// The days a story view (story.js getStoryView, or { id } / { end, finale })
// allows: the current step's day at the earliest (the story moves the date on),
// the next step's day at the latest (a night can bring the next day, but the
// story waits for nobody: Ontzet is always on 28 augustus). Past the finale the
// summer is open.
export function storyBounds(view) {
  if (!view) return { min: 1, max: 1 };
  if (view.end) {
    if (view.finale) return { min: EPILOGUE_DAY, max: Infinity };
    const last = [...STEPS].reverse().find((s) => s.part === view.part);
    const d = last ? STEP_DAY.get(last.id) : 1;
    return { min: d, max: d };
  }
  const min = STEP_DAY.get(view.id) ?? 1;
  const k = STEPS.findIndex((s) => s.id === view.id);
  const next = k >= 0 && k + 1 < STEPS.length ? STEP_DAY.get(STEPS[k + 1].id) : ONTZET_DAY;
  // Ontzet waits for nobody: nothing before it runs past 28 augustus (the new arc's epilogue comes after it)
  return { min, max: Math.max(min, min <= ONTZET_DAY ? Math.min(next, ONTZET_DAY) : next) };
}

export const clampDay = (n, b) => Math.max(b.min, Math.min(b.max, Math.max(1, Math.floor(n) || 1)));

// A save from before the calendar: the day of the step it continues at
// (savemigrate.js savedStoryStep: a step, or { end, finale }).
export function dayForSavedStep(step) {
  if (!step) return 1;
  if (step.end) return storyBounds({ end: true, part: step.end, finale: !!step.finale }).min;
  return STEP_DAY.get(step.id) ?? 1;
}

// --- the sun -------------------------------------------------------------------------

// Solar declination (degrees) on day n. The nazomer holds: from 1 september
// on the sun stays where it was that day, so the light never turns autumn.
export function sunDeclinationDeg(n) {
  const k = Math.min(Math.max(1, n), SUN_HOLD_DAY);
  const doy = Math.round((Date.UTC(YEAR, AUG, START_DATE + k - 1) - Date.UTC(YEAR, 0, 1)) / 864e5) + 1;
  return 23.44 * Math.sin((2 * Math.PI * (284 + doy)) / 365);
}

// --- special days ----------------------------------------------------------------------

// id: stable (saved in the seen list); from/to: day numbers (to inclusive),
// or weekdays [0-6] for a weekly one; rank: which one the HUD shows when
// several fall on one day; card: [title, body] for "Vandaag in Grunn" (once,
// the first morning), none for a small day (only the HUD badge); icon: a
// CAL_ICONS key; open: false = planned (Deel 4), not shown yet.
const SPECIAL_BASE = [
  { id: 'ontzet', name: 'Gronings Ontzet', from: day(8, 28), to: day(8, 28), rank: 10, icon: 'vlag',
    card: ['Gronings Ontzet', 'In 1672 hield Stad stand tegen Bommen Berend. Vlaggen op de Grote Markt, en vanavond vuurwerk.'] },
  { id: 'kei', name: 'KEI-week', from: day(8, 14), to: day(8, 17), rank: 6, icon: 'kei',
    card: ['KEI-week', 'Duizenden nieuwe Stadjers zoeken hun groepje. Rij rustig door de binnenstad en het Plantsoen.'] },
  { id: 'noorderzon', name: 'Noorderzon', from: day(8, 20), to: day(8, 30), rank: 7, icon: 'ster',
    card: ['Noorderzon', 'Elf dagen theater en muziek in het Noorderplantsoen. Tot laat lampjes in de bomen.'] },
  { id: 'kermis', name: 'Zomerkermis', from: day(8, 21), to: day(8, 30), rank: 8, icon: 'rad',
    card: ['Zomerkermis', 'Tot en met 30 augustus staat de kermis de hele dag op de Grote Markt, niet alleen \'s avonds.'] },
  { id: 'bloemetjesmarkt', name: 'Bloemetjesmarkt', from: day(9, 12), to: day(9, 12), rank: 7, icon: 'bloem',
    card: ['Bloemetjesmarkt', 'De nazomereditie: de hele dag bloemen op de Grote Markt. De binnenstad staat vol touringcars.'] },
  { id: 'suiker', name: 'Suikercampagne', from: day(9, 15), to: day(9, 15), rank: 5, icon: 'biet',
    card: ['De suikercampagne begint', 'Bij Hoogkerk ruikt het weer naar suiker. Op de polderwegen rijden de bietenwagens.'] },
  { id: 'laatstezomerdag', name: 'Laatste zomerdag', from: LAST_SUMMER_DAY, to: LAST_SUMMER_DAY, rank: 9, icon: 'zon',
    card: ['De laatste zomerdag', 'Morgen begint de nazomer. In Grunn houdt die aan.'] },
  // the weekly market on the Grote Markt and the Vismarkt: dinsdag, vrijdag, zaterdag
  { id: 'markt', name: 'Marktdag', weekdays: [2, 5, 6], rank: 1, icon: 'kraam' },
  // Deel 4 "Nazomer" (docs/verhaal/KALENDER.md): on the calendar, not in the game yet. Days 41+ show as "nazomer · dag N".
  { id: 'borgfeest', name: 'Tuinfeest in de Menkemaborg', from: day(9, 18), to: day(9, 18), rank: 5, icon: 'ster', open: false,
    card: ['Tuinfeest in de Menkemaborg', 'Lampjes langs de gracht. Ubbo zoekt zijn jury. Jij bent niet uitgenodigd.'] },
  { id: 'uithuizenkermis', name: 'Kermis in Uithuizen', from: day(9, 19), to: day(9, 20), rank: 6, icon: 'rad', open: false,
    card: ['Kermis in Uithuizen', 'Botsauto\'s en zweefmolen op het dorpsveld. De eerste voorronde van de Ommelander Ronde.'] },
  { id: 'jaarmarkt', name: 'Jaarmarkt in de Eemsdelta', from: day(9, 22), to: day(9, 22), rank: 5, icon: 'kraam', open: false,
    card: ['Jaarmarkt in de Eemsdelta', 'Kramen langs het Damsterdiep in Appingedam. De sluiswachter meldt alleen.'] },
  { id: 'havenfeest', name: 'Havenfeest in Lauwersoog', from: day(9, 25), to: day(9, 25), rank: 6, icon: 'vlag', open: false,
    card: ['Havenfeest in Lauwersoog', 'Vlaggetjes op de pier. De laatste boot naar Schier vaart om 19:05.'] },
  { id: 'trekkertrek', name: 'Trekkertrek in het Westerkwartier', from: day(9, 26), to: day(9, 26), rank: 6, icon: 'trekker', open: false,
    card: ['Trekkertrek in het Westerkwartier', 'De finale op het sportveld bij Niekerk. Wie het verst trekt, wint.'] },
  { id: 'zuidhornkermis', name: 'Kermis in Zuidhorn', from: day(9, 26), to: day(9, 27), rank: 6, icon: 'rad', open: false,
    card: ['Kermis in Zuidhorn', 'Het is geen Uithuizen, maar het draait. Zondag is er een rally.'] },
  { id: 'nienoord', name: 'Open dag in Nienoord', from: day(9, 27), to: day(9, 27), rank: 5, icon: 'bloem', open: false,
    card: ['Open dag in park Nienoord', 'Het Rijtuigenhuis is open. De koetsen staan klaar, de paarden ook.'] },
  { id: 'oogstfeest', name: 'Oogstfeest in Beerta', from: day(9, 28), to: day(9, 30), rank: 6, icon: 'aar', open: false,
    card: ['Oogstfeest in Beerta', 'Trekkerparade en combineshow. Het laatste graan is binnen.'] },
  { id: 'oldambtkermis', name: 'Kermis in Winschoten', from: day(9, 29), to: day(10, 4), rank: 6, icon: 'rad', open: false,
    card: ['Kermis in Winschoten', 'Een week kermis aan de rand van het graan. Durk en Douwe zijn er ook.'] },
  { id: 'stoomtrein', name: 'Jaarmarkt en stoomtreindag in Stadskanaal', from: day(10, 1), to: day(10, 1), rank: 5, icon: 'trein', open: false,
    card: ['Stoomtreindag in Stadskanaal', 'Een museumtrein langs de kanaalwijken, vandaag gratis. Elke brug gaat open.'] },
  { id: 'vesting', name: 'Vestingdag in Westerwolde', from: day(10, 3), to: day(10, 3), rank: 9, icon: 'vlag', open: false,
    card: ['Vestingdag in Westerwolde', 'Kartonnen kanonnen op de wallen. Berend speelt weer de belegeraar.'] },
];
// The new arc names the introweek and the festival with invented names (constitutie 2), moves
// the Winschoten kermis to za 22 - zo 23 augustus and adds the Beleg van Bourtange.
const SPECIAL_NIEUW = {
  kei: { name: 'Kiezelweek', card: ['Kiezelweek', 'Duizenden nieuwe Stadjers zoeken hun groepje. Rij rustig door de binnenstad en het Plantsoen.'] },
  noorderzon: { name: 'Plantsoenfestijn', card: ['Plantsoenfestijn', 'Elf dagen theater en muziek in het Noorderplantsoen. Tot laat lampjes in de bomen.'] },
  oldambtkermis: { from: day(8, 22), to: day(8, 23), open: true },
};
// the regional summer events (regioleven.js), as month/date turned into day numbers
const REGIO_SPECIALS = REGIO_EVENTS.map((e) => ({ id: e.id, name: e.name, from: day(e.month, e.date), to: day(e.toMonth || e.month, e.toDate || e.date), rank: e.rank, icon: e.icon, card: e.card }));
export const SPECIAL_DAYS = [
  ...SPECIAL_BASE.map((s) => (SPECIAL_NIEUW[s.id] ? { ...s, ...SPECIAL_NIEUW[s.id] } : s)),
  ...REGIO_SPECIALS,
  { id: 'beleg', name: 'Beleg van Bourtange', from: day(8, 25), to: day(8, 25), rank: 9, icon: 'vlag',
    card: ['Beleg van Bourtange', 'De vesting speelt het beleg na, met kartonnen kanonnen op de wallen. Om negen uur begint het.'] },
];
const SPECIAL_BY_ID = new Map(SPECIAL_DAYS.map((s) => [s.id, s]));
export const specialById = (id) => SPECIAL_BY_ID.get(id) || null;

const on = (s, n) => (s.weekdays ? s.weekdays.includes(weekdayOf(n)) : n >= s.from && n <= s.to);
const shown = (s, all) => all || s.open !== false;

// The special days on day n, most important first.
export function specialsOn(n, { all = false } = {}) {
  return SPECIAL_DAYS.filter((s) => shown(s, all) && on(s, n)).sort((a, b) => b.rank - a.rank);
}
// The HUD's special day for day n: { id, name, icon, card } or null.
export function specialDay(n) {
  const s = specialsOn(n)[0];
  return s ? { id: s.id, name: s.name, icon: s.icon, card: s.card || null, small: !s.card } : null;
}
export const dayOfSummer = (n) => n;
export const weekdayShort = (n) => WD_SHORT[weekdayOf(n)];
export const isSpecial = (id, n) => { const s = SPECIAL_BY_ID.get(id); return !!s && on(s, n); };

// The card for day n: the most important special day with a card not seen yet.
export function cardFor(n, seen = []) {
  return specialsOn(n).find((s) => s.card && !seen.includes(s.id)) || null;
}

// The coming special days from day n on (n itself included while it lasts),
// without the weekly market: [{ s, from, label }] for the pause menu.
export function upcomingSpecials(n, count = 4) {
  return SPECIAL_DAYS.filter((s) => shown(s) && !s.weekdays && s.to >= n)
    .sort((a, b) => Math.max(a.from, n) - Math.max(b.from, n) || b.rank - a.rank)
    .slice(0, count)
    .map((s) => ({ s, from: s.from, label: periodLabel(s, n) }));
}

// "vandaag", "morgen", "vr 28 aug", "t/m zo 30 aug"
export function periodLabel(s, n) {
  const f = (k) => formatDay(k).short.toLowerCase();
  if (s.from <= n) return s.to > n ? `nu, t/m ${f(s.to)}` : 'vandaag';
  const start = s.from === n + 1 ? 'morgen' : f(s.from);
  return s.to > s.from ? `${start} t/m ${f(s.to)}` : start;
}

// Small 24x24 icons (filled paths) for the HUD badge, the card and the agenda.
export const CAL_ICONS = {
  zon: '<circle cx="12" cy="12" r="4.6"/><path d="M11 1.5h2v4h-2zM11 18.5h2v4h-2zM1.5 11h4v2h-4zM18.5 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4L17 8.4z"/>',
  vlag: '<path d="M5 2h2v20H5zM8 3h12l-3 4.5L20 12H8z"/>',
  kei: '<path d="M12 3 1.5 8.5 12 14l8.5-4.45V16h2V8.5zM5.5 12.2V16c0 2 3 3.8 6.5 3.8s6.5-1.8 6.5-3.8v-3.8L12 15.6z"/>',
  ster: '<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/>',
  rad: '<path fill-rule="evenodd" d="M12 2a9 9 0 0 0-1 17.94V21H7v1.5h10V21h-4v-1.06A9 9 0 0 0 12 2zm0 2a7 7 0 0 1 6.93 6H13.7A2 2 0 0 0 13 9.3V4.07A7 7 0 0 1 12 4zm-1 .07V9.3a2 2 0 0 0-.7.7H5.07A7 7 0 0 1 11 4.07zM5.07 12h5.23a2 2 0 0 0 .7.7v5.23A7 7 0 0 1 5.07 12zm7.93.7a2 2 0 0 0 .7-.7h5.23A7 7 0 0 1 13 17.93z"/>',
  bloem: '<path d="M12 2.5a3 3 0 0 1 3 3 3 3 0 0 1 3.5 4.8A3 3 0 0 1 15 15a3 3 0 0 1-2 .9V22h-2v-6.1a3 3 0 0 1-2-.9 3 3 0 0 1-3.5-4.7A3 3 0 0 1 9 5.5a3 3 0 0 1 3-3zm0 6.3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
  biet: '<path d="M8 2c1.5 0 2.7 1 3.3 2.4C12 3 13.4 2 15 2c-.2 2-1.3 3.4-2.6 4A6 6 0 0 1 18 12c0 4.5-3.5 8.5-6 10-2.5-1.5-6-5.5-6-10a6 6 0 0 1 5.4-6C10 5.4 8.3 4 8 2z"/>',
  kraam: '<path d="M2 4h20l-1.5 6h-17zM4 11h2v9h12v-9h2v11H4zM8 14h8v4H8z"/>',
  aar: '<path d="M11 2h2v20h-2zM12 6c2-2 4.5-2.5 6-2-.5 2.5-3 4.5-6 4.5zm0 0C10 4 7.5 3.5 6 4c.5 2.5 3 4.5 6 4.5zm0 5c2-2 4.5-2.5 6-2-.5 2.5-3 4.5-6 4.5zm0 0c-2-2-4.5-2.5-6-2 .5 2.5 3 4.5 6 4.5z"/>',
  trekker: '<path fill-rule="evenodd" d="M5 4h7l1.5 6H18V7h2v3.6a3.5 3.5 0 0 1 1.5 2.9h-2a1.5 1.5 0 0 0-3 0v.5h-4.6A5 5 0 0 0 4 11.3V4zm2 2v4h4.5l-1-4zM7.5 12a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM18 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>',
  trein: '<path fill-rule="evenodd" d="M6 2h12a2 2 0 0 1 2 2v12a3 3 0 0 1-2.4 2.9L19.5 22h-2.3l-1.7-3h-7l-1.7 3H4.5l1.9-3.1A3 3 0 0 1 4 16V4a2 2 0 0 1 2-2zm0 3v5h12V5zm1.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
};
export const calIcon = (key, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" aria-hidden="true">${CAL_ICONS[key] || CAL_ICONS.zon}</svg>`;
