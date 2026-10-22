// Vrijgezellenfeestjes (#403): een gezellig groepje loopt door de uitgaansgebieden, één in bruidsachtige kleding en de rest gek verkleed in
// hetzelfde thema (hawaï, konijnenoren of tutu's). Ze waggelen een beetje, juichen af en toe en praten in tekst. Pure regels, geen DOM en
// geen THREE (scripts/vrijgezellen_test.mjs): streetlife.js zet ze neer als voetgangers (zoals het kennismakingsgroepje), scene3d.js tekent het
// waggelen en het juichen en models3d_people.js de hoedjes. Alleen tekst; geen merken, geen aanstootgevende kleding, satire zonder leed.

import { lifeDensity } from './streetlifedata.js';

export const MAX_GROEPJES = 2;
export const JUICH_DUUR = 1.7;
export const GROEP_LEDEN = [4, 5]; // de bruid en 3 of 4 gasten

// Een thema voor de gasten: de hoed (models3d_people.js), shirtkleuren, de broek of rok en of er een zonnebril bij hoort.
export const THEMAS = {
  hawaii: { id: 'hawaii', hat: 'krans', hatColor: 0xff7a9a, tops: ['#ff7a3c', '#f2c400', '#e8458b', '#2fb5a8', '#7bd34a'], bottom: 'shorts', bril: true, naam: 'hawaï' },
  konijn: { id: 'konijn', hat: 'konijn', hatColor: 0xf4efe6, tops: ['#f4efe6', '#f7c6d9', '#f4efe6', '#d9e6f4'], bottom: 'jeans', bril: false, naam: 'konijnenoren' },
  tutu: { id: 'tutu', hat: 'tiara', hatColor: 0xf2c400, tops: ['#f7a8cf', '#c99ae6', '#f7a8cf', '#9fd4f2'], bottom: 'skirt', rok: [0xf48fc0, 0xc99ae6, 0xf7a8cf, 0xa9d3f2], bril: false, naam: "tutu's" },
};
export const THEMA_IDS = Object.keys(THEMAS);

// De bruid: wit, een jurk en een sluiertje.
export const BRUID = { clothing: '#f6f3ec', look: { top: 'dress', bottom: 'dress', hat: 'sluier', hatColor: 0xffffff, hairStyle: 'long' } };

// Waar de gasten lopen ten opzichte van de bruid: kant (+1 links, -1 rechts), k keer de gewone afstand en een stuk erachter (m).
export const PLEKKEN = [
  { side: 1, k: 1, back: 0 },
  { side: -1, k: 1, back: 0 },
  { side: 1, k: 1.9, back: 0.7 },
  { side: -1, k: 1.9, back: 0.7 },
];

export const BRUID_LINES = [
  'Nog één keer vrij!',
  'Ik trouw pas zaterdag. Vandaag is het feest.',
  'Jullie zijn gek. Ik hou van jullie.',
  'Wie heeft mijn sluier vast?',
  'Ik wist niet dat ik zo hard kon lachen.',
];
export const GAST_LINES = [
  'Op de aanstaande bruid!',
  'Wij doen vandaag alles, behalve rustig.',
  'Hoera, hoera, ze gaat het doen!',
  'Nog één stukje door de stad, dan eten we wat.',
  'Wiebelen is geen fout, dat is stijl.',
  'Staan jullie ook zo mooi op de foto?',
];
export const JUICH_LINES = ['Hoera!', 'Joehoe!', 'Op de bruid!', 'Wooo!', 'Hiep hiep hoera!'];

// Een gast in dit thema: kleding, uiterlijk (look voor buildPersonMesh) en of het een rok is. i telt de gasten.
export function gastLook(thema, i, rng = Math.random) {
  const t = THEMAS[thema] || THEMAS.hawaii;
  const clothing = t.tops[Math.floor(rng() * t.tops.length)];
  const look = { top: 'tee', bottom: t.bottom, hat: t.hat, hatColor: t.hatColor, glasses: t.bril };
  if (t.rok) { const c = t.rok[(i + Math.floor(rng() * t.rok.length)) % t.rok.length]; look.pants = c; look.skirtColor = c; }
  return { clothing, look };
}

// Een compleet groepje: thema en per lid de rol, kleding, look en plek (de bruid is het eerste lid en de leider).
export function maakGroep(rng = Math.random, kies = null) {
  const thema = THEMAS[kies] ? kies : THEMA_IDS[Math.floor(rng() * THEMA_IDS.length)];
  const aantal = GROEP_LEDEN[0] + Math.floor(rng() * (GROEP_LEDEN[1] - GROEP_LEDEN[0] + 1));
  const leden = [{ rol: 'bruid', clothing: BRUID.clothing, look: { ...BRUID.look }, side: 0, k: 1, back: 0 }];
  for (let i = 0; i < aantal - 1; i++) leden.push({ rol: 'gast', ...gastLook(thema, i, rng), ...PLEKKEN[i % PLEKKEN.length] });
  return { thema, leden };
}

// --- wanneer --------------------------------------------------------------------------------------
// weekday: 0 zondag .. 6 zaterdag (calendar.js weekdayOf); -1 als het niet bekend is. Vooral vrijdag- en zaterdagavond en
// -middag in het centrum en de studentenwijken; verder bijna nooit.
export function weekendFactor(weekday, hour) {
  if (!Number.isFinite(hour)) return 0;
  if (weekday === 5 || weekday === 6) {
    if (hour >= 17 && hour < 24) return 1;
    if (hour >= 13 && hour < 17) return 0.5;
    return 0;
  }
  if (weekday === 0) return hour >= 13 && hour < 18 ? 0.25 : 0;
  if (weekday === 4) return hour >= 19 && hour < 23 ? 0.2 : 0; // donderdagavond: de studenten
  return 0;
}

export function vrijgezellenKans(profileKey, d, hour, weekday) {
  if (profileKey !== 'centrum' && profileKey !== 'student') return 0;
  const dens = lifeDensity(profileKey, d);
  if (!(dens > 0)) return 0;
  const base = profileKey === 'centrum' ? 0.05 : 0.025;
  return base * dens * weekendFactor(weekday, hour);
}

// Hoeveel groepjes tegelijk: één, en op een drukke avond twee.
export const maxGroepjes = (weekday, hour) => (weekendFactor(weekday, hour) >= 1 ? MAX_GROEPJES : 1);

// --- waggelen en juichen ------------------------------------------------------------------------
export const WAGGEL = { hoek: 0.075, zij: 0.1, freq: 2.3, tempo: 0.82 };

// De zijwaartse kanteling (rad) en de zijwaartse verschuiving (m) van een waggelende lopende figuur op tijd t.
export function waggel(t, seed = 0, snelheid = 1.2) {
  const f = Math.min(1, Math.max(0, (snelheid || 0) / 1.0));
  const ph = t * WAGGEL.freq * Math.PI * 2 / 2.3 + seed * 6.283;
  return { kantel: Math.sin(ph) * WAGGEL.hoek * f, zij: Math.sin(ph * 0.5 + 1) * WAGGEL.zij * f };
}

// Wanneer de volgende juichpartij is (s): na 7 tot 16 s.
export const volgendeJuich = (nu, rng = Math.random) => nu + 7 + rng() * 9;

// Hoe ver de armen omhoog staan (0..1) midden in een juichbeurt: loopt zacht in en uit.
export function juichSterkte(nu, tot, duur = JUICH_DUUR) {
  const over = tot - nu;
  if (!(over > 0) || !(duur > 0)) return 0;
  const k = over / duur;
  return Math.min(1, k * 5, (1 - k) * 5 + 0.0001);
}

// De arm- en lichaamshoek bij het juichen op tijd t en sterkte k: de armen gaan om en om omhoog.
export function juichHoek(t, k) {
  const sw = Math.sin(t * 11);
  return { links: 2.5 + 0.35 * sw, rechts: 2.5 - 0.35 * sw, spring: Math.abs(Math.sin(t * 5.5)) * 0.07 * k, k };
}
