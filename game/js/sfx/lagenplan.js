// Het laagplan van de omgeving (#988, audit 21-11): per omgeving welke lagen er horen te klinken, de nieuwe lagen (haven, spoor,
// verkeer overdag), de occlusie binnen en buiten en een kleine levende variatie. Zuivere getallen, zonder Web Audio
// (scripts/lagenplan_test.mjs). sfx/ambience.js past de uitkomst toe op zijn lagen (beds).
// Alleen bestaande opnames: boot_motor_stat (havenbrom), scheepshoorn_op, trein_hoorn_kort/lang, stad_nacht_nl (verkeer op afstand).

const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0);   // NaN wordt 0, nooit een NaN-versterking
const num = (x, d = 0) => (Number.isFinite(x) ? x : d);

// De audit: welke lagen (beds van ambience.js, of een gebeurtenis na een !) per omgeving klinken. De test eist dat elke
// sleutel een bed is en dat elke omgeving minstens drie lagen heeft; "ontbrak" noteert wat de audit van 21-11 vond.
export const OMGEVING_LAGEN = {
  'stad-dag': ['city', 'stadsvogels', 'crowd', 'terrace', 'stadNacht', '!bird', '!clink'],
  'stad-nacht': ['city', 'stadNacht', 'crowd', 'terrace', 'crickets'],
  dorp: ['vogels', 'insecten', 'polder', 'wind', '!bird', '!animals'],
  ommeland: ['polder', 'riet', 'vogels', 'insecten', 'wind', 'kikkers', '!animals'],
  water: ['lap', 'riet', 'kust', '!gull', 'kikkers'],
  haven: ['haven', 'lap', 'industrie', 'kust', '!gull', '!scheepshoorn'],
  spoor: ['wind', 'polder', '!treinhoorn'],
  binnen: ['binnen', 'roof'],
  regen: ['regenLicht', 'regenBui', 'regenPlens', 'regenAuto', 'roof', 'wind'],
  kermis: ['kermis', 'crowd', 'terrace'],
};
// (verkeer overdag is de bestaande laag stadNacht op een lager niveau: verkeerDagNiveau)
export const ONTBRAK_21_11 = ['haven', '!treinhoorn', '!scheepshoorn'];

// Een haven: water dichtbij en loodsen, kranen of kades erbij (industrie), of het water van de Eemsdelta. Niveau 0 tot 1.
// f: { industrial, waterD, streek, coast, sea, closed }
export function havenNiveau(f) {
  const wd = Number.isFinite(f.waterD) ? f.waterD : Infinity;
  const kade = clamp01(1 - wd / 60);
  let n = clamp01(num(f.industrial) * 1.5) * kade;
  if (f.streek === 'eemsdelta') n = Math.max(n, clamp01(1 - wd / 90) * 0.6);
  if (f.sea) n = 0;   // op open water bromt er geen haven
  return n * (f.closed ? 0.4 : 1);
}
export const HAVEN_PEAK = 0.075;            // een verre scheepsbrom, ver onder de omgevingslagen
export const HAVEN_LP = 650;                // dof: een brom op honderden meters

// Het spoor: een trein op de achtergrond is er niet als lus. Dichtbij het spoor (railD in m, 0 tot 1) horen we af en toe
// een verre treinhoorn (treinHoornPauze).
export function spoorNiveau(railD, closed = false) {
  const d = Number.isFinite(railD) ? railD : Infinity;
  return clamp01(1 - d / 90) * (closed ? 0.4 : 1);
}
// de pauze (s) tot de volgende verre treinhoorn: dichter bij het spoor vaker, 's nachts zeldzamer, nooit bij veel regen
export function treinHoornPauze(railD, night = 0, rain = 0, r = 0.5) {
  const n = spoorNiveau(railD);
  r = clamp01(num(r, 0.5));
  if (n < 0.1 || rain > 0.7) return 25 + r * 20;
  return (70 + r * 90) / n * (1 + clamp01(night) * 1.2);
}

// verkeer overdag: dezelfde opname als 's nachts (stad_nacht_nl, verkeer op afstand) op 30 procent, alleen waar het druk is
export function verkeerDagNiveau(traffic, density, day, rural, cabin = 1) {
  return (0.02 + num(traffic) * 0.06 + num(density) * 0.02) * clamp01(day) * (1 - 0.9 * clamp01(rural)) * num(cabin, 1);
}

// Een zeldzame scheepshoorn in de haven: pauze (s) tot de volgende, op afstand (m) en richting uit het water.
export function scheepshoornPauze(haven, r = 0.5) {
  haven = clamp01(haven);
  return haven < 0.3 ? 40 : (120 + clamp01(num(r, 0.5)) * 180) / haven;
}

// Occlusie binnen en buiten: wat een bed krijgt als de luisteraar in een gesloten voertuig of in de flat zit. Het buitengeluid
// wordt dof en zachter; het binnengeluid (binnen, dak, autoregen) en een open voertuig blijven. Geeft { gain, lp } (lp in Hz).
export const OCCLUSIE_BINNEN = new Set(['binnen', 'roof', 'regenAuto']);
export function occlusie({ closed = false, indoors = false } = {}, key = '') {
  if (OCCLUSIE_BINNEN.has(key)) return { gain: 1, lp: 20000 };
  if (indoors) return { gain: 0.35, lp: 900 };
  if (closed) return { gain: 1, lp: 1800 };   // de cabine dempt de hoge tonen; het niveau doet 'cabin' in ambience.js al
  return { gain: 1, lp: 20000 };
}

// een kleine, trage variatie in het niveau (de laag ademt): geen rechte lijn. t in s, key bepaalt periode en fase (6 tot 17 s), diepte 0 tot 0,3
export function bedWobble(t, key, depth = 0.08) {
  key = String(key == null ? '' : key);
  t = num(t, 0);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const period = 6 + ((h >>> 0) % 1000) / 1000 * 11;
  const phase = (((h >>> 10) >>> 0) % 1000) / 1000 * Math.PI * 2;
  return 1 + clamp01(depth / 0.3) * 0.3 * Math.sin((t / period) * Math.PI * 2 + phase);
}
// een lus start met een kleine toonhoogtespreiding (+-1,5 procent), per start anders
export function bedStartRate(r = 0.5, spread = 0.015) {
  return 1 + (clamp01(r) * 2 - 1) * spread;
}

// gelijk-vermogen-kruisfade: x 0..1 -> { a, b } met a^2 + b^2 = 1 (voor twee lagen die in elkaar overgaan)
export function crossfade(x) {
  const t = clamp01(x) * Math.PI / 2;
  return { a: Math.cos(t), b: Math.sin(t) };
}
