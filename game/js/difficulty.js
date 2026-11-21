// #800 (voorstel, nog niet aangesloten): één bron voor drie moeilijkheidsstanden.
// Puur; de integratie in missies/activiteiten en de opslag volgen later. De
// standaardstand is exact het huidige gedrag, zodat aansluiten niets verandert.
import { assistFactors } from './assist.js';

export const DIFFICULTY_MODES = ['ontspannen', 'standaard', 'uitdagend'];
export const DIFFICULTY_DEFAULT = 'standaard';

// time: vermenigvuldigt elke tijdslimiet/venster.
// target: vermenigvuldigt een medaille-/doeldrempel; bij 'lager is beter' (tijd,
// slagen) betekent groter makkelijker, bij 'hoger is beter' (punten) delen we.
export const DIFFICULTY = {
  ontspannen: { label: 'Ontspannen', time: 1.35, target: 1.25, damage: 0.85 },
  standaard: { label: 'Standaard', time: 1, target: 1, damage: 1 },
  uitdagend: { label: 'Uitdagend', time: 0.85, target: 0.8, damage: 1.1 },
};

export function cleanDifficulty(mode) {
  return DIFFICULTY_MODES.includes(mode) ? mode : DIFFICULTY_DEFAULT;
}

export function difficultyFactors(mode) {
  const m = cleanDifficulty(mode);
  const f = { ...DIFFICULTY[m] };
  // #1169: voor het actieve niveau van deze save gelden de eigen aanpassingen van Tijd en Medailles
  // (de lezers geven het niveau door als tekst; zo hoeft geen van die plekken te veranderen).
  if (m === active.level) {
    f.time = activeOptions.timeFactor;
    f.target = activeOptions.targetFactor;
  }
  return f;
}

// Tijdslimiet/venster; null/Infinity/0 (geen limiet) blijven zoals ze zijn.
export function scaleTimeLimit(secs, mode) {
  if (!Number.isFinite(secs) || !(secs > 0)) return secs;
  return Math.round(secs * difficultyFactors(mode).time);
}

// Een medailledrempel of doelwaarde. lowerBetter: tijd, slagen, afstand.
export function scaleTarget(value, mode, lowerBetter = true) {
  if (!Number.isFinite(value)) return value;
  const f = difficultyFactors(mode).target;
  return lowerBetter ? value * f : value / f;
}

// Zoals scaleTarget, maar bij een drempel onder nul (golf: slagen onder par) telt een ruimere
// stand richting nul: minder onder par is makkelijker, niet strenger.
export function scaleTargetSigned(value, mode, lowerBetter = true) {
  if (!Number.isFinite(value)) return value;
  if (lowerBetter && value < 0) return value / difficultyFactors(mode).target;
  return scaleTarget(value, mode, lowerBetter);
}

// Dezelfde schaal, maar afgerond: een negatieve drempel (golf onder par) rondt richting nul,
// zodat een ruimere stand hem minder streng maakt in plaats van strenger.
export function scaleTargetSignedRound(value, mode, lowerBetter = true) {
  const x = scaleTargetSigned(value, mode, lowerBetter);
  if (!Number.isFinite(x)) return x;
  const f = difficultyFactors(mode).target;
  return x < 0 ? (f > 1 ? Math.ceil(x) : Math.floor(x)) : Math.round(x);
}

// Een record-/medaillesleutel per stand. Standaard houdt de bestaande sleutel,
// zodat bestaande records niet verdwijnen; de andere standen krijgen een prefix.
export function difficultyRecordKey(mode, id) {
  const m = cleanDifficulty(mode);
  return m === DIFFICULTY_DEFAULT ? String(id) : `difficulty:${m}:${id}`;
}

// Hulp (#215) stapelt op de moeilijkheidsstand: meer tijd blijft meer tijd.
export function combinedTimeFactor(mode, settings = {}) {
  return difficultyFactors(mode).time * assistFactors(settings).time;
}

// ---------------------------------------------------------------------------------------------
// #1169 Moeilijkheid per save: een niveau (de drie standen hierboven) plus losse opties eronder.
// Eén bron: elke plek in het spel leest een optie met opt('sleutel'), nooit een eigen getal.
// Op Standaard is elke optie exact het gedrag van vóór dit systeem (scripts/difficulty_test.mjs).
//
// Een profiel is { level, custom: { sleutel: waarde } }. `custom` houdt alleen de opties die van het
// niveau afwijken ("Aangepast"). Elke optie heeft een vaste lijst stappen: een waarde buiten die lijst
// (een kapotte save, een handmatig bestand) valt terug op de waarde van het niveau, dus alles blijft
// binnen veilige grenzen. De opslag staat in de savegame (veld `moeilijkheid`, savegame.js); dit
// bestand heeft geen DOM, geen opslag en geen netwerk.
//
// Samen spelen: scope 'wereld' (politie, verkeer) volgt de instelling van wie het spel opende; scope
// 'lokaal' (schade, rij-assist, QTE, hints, geld, wedstrijd) is per speler, uit de eigen save.
// ---------------------------------------------------------------------------------------------
const stap = (v, label) => ({ v, label });

// presets: waarde per niveau [ontspannen, standaard, uitdagend]. 'eigen' = de eigen instelling van dit apparaat
// (Instellingen > Quicktime-events, Rijden, Spel): de speler houdt zijn eigen keuze.
export const OPTION_DEFS = Object.freeze([
  { key: 'policeEscape', groep: 'politie', scope: 'wereld', label: 'Politie kwijtraken', uitleg: 'Hoe lang je uit het zicht moet blijven en hoe lang een ster duurt.',
    stappen: [stap(0.6, 'Veel sneller'), stap(0.8, 'Sneller'), stap(1, 'Gewoon'), stap(1.25, 'Langer'), stap(1.5, 'Veel langer')], presets: [0.8, 1, 1.25] },
  { key: 'policeUnits', groep: 'politie', scope: 'wereld', label: 'Politiemacht', uitleg: 'Hoeveel eenheden er bij een zoekniveau meedoen.',
    stappen: [stap(0.5, 'Half'), stap(0.75, 'Minder'), stap(1, 'Gewoon'), stap(1.25, 'Meer'), stap(1.5, 'Veel meer')], presets: [0.75, 1, 1.25] },
  { key: 'trafficDensity', groep: 'verkeer', scope: 'wereld', label: 'Verkeersdrukte', uitleg: 'Hoeveel auto\'s, fietsen en scooters er rondrijden.',
    stappen: [stap(0.5, 'Rustig'), stap(0.75, 'Minder'), stap(1, 'Gewoon'), stap(1.25, 'Drukker')], presets: [0.75, 1, 1.25] },
  { key: 'vehicleDamage', groep: 'rijden', scope: 'lokaal', label: 'Schade aan je voertuig', uitleg: 'Hoeveel een botsing je voertuig kost.',
    stappen: [stap(0.5, 'De helft'), stap(0.75, 'Minder'), stap(1, 'Gewoon'), stap(1.25, 'Meer')], presets: [0.75, 1, 1.25] },
  { key: 'damageTaken', groep: 'rijden', scope: 'lokaal', label: 'Schade aan jezelf', uitleg: 'Hoeveel klappen, kogels en valpartijen je gezondheid kosten.',
    stappen: [stap(0.5, 'De helft'), stap(0.75, 'Minder'), stap(1, 'Gewoon'), stap(1.25, 'Meer')], presets: [0.75, 1, 1.25] },
  { key: 'driveAssist', groep: 'rijden', scope: 'lokaal', label: 'Rij-assist', uitleg: 'Drifthulp en fietshulp. Eigen = zoals je het bij Instellingen, Rijden hebt gezet.',
    stappen: [stap('eigen', 'Eigen instelling'), stap('aan', 'Altijd aan'), stap('uit', 'Uit')], presets: ['aan', 'eigen', 'eigen'] },
  { key: 'raceAi', groep: 'races', scope: 'lokaal', label: 'Tegenstanders in races', uitleg: 'Hoe hard de computer rijdt in races en op de kartbaan.',
    stappen: [stap(0.9, 'Veel trager'), stap(0.95, 'Trager'), stap(1, 'Gewoon'), stap(1.05, 'Sneller'), stap(1.1, 'Veel sneller')], presets: [0.95, 1, 1.05] },
  { key: 'qte', groep: 'minigames', scope: 'lokaal', label: 'Quicktime-events', uitleg: 'De grootte van de raakzone en de snelheid van de naald. Eigen = Instellingen, Quicktime-events.',
    stappen: [stap('eigen', 'Eigen instelling'), stap('makkelijk', 'Makkelijk'), stap('normaal', 'Normaal'), stap('overslaan', 'Overslaan')], presets: ['makkelijk', 'eigen', 'normaal'] },
  { key: 'timeFactor', groep: 'minigames', scope: 'lokaal', label: 'Tijd in missies en spelletjes', uitleg: 'Hoeveel tijd je krijgt op tijdslimieten.',
    stappen: [stap(0.85, 'Minder tijd'), stap(1, 'Gewoon'), stap(1.2, 'Meer tijd'), stap(1.35, 'Veel meer tijd'), stap(1.7, 'Heel veel tijd')], presets: [1.35, 1, 0.85] },
  { key: 'targetFactor', groep: 'minigames', scope: 'lokaal', label: 'Medailles', uitleg: 'Hoe streng de eisen voor brons, zilver en goud zijn.',
    stappen: [stap(0.8, 'Strenger'), stap(1, 'Gewoon'), stap(1.25, 'Ruimer')], presets: [1.25, 1, 0.8] },
  { key: 'footballAi', groep: 'voetbal', scope: 'lokaal', label: 'Tegenstander in het voetbal', uitleg: 'Hoe slim en snel de computer voetbalt. Volgen = het niveau.',
    stappen: [stap('volg', 'Volg het niveau'), stap('ontspannen', 'Ontspannen'), stap('standaard', 'Standaard'), stap('uitdagend', 'Uitdagend')], presets: ['volg', 'volg', 'volg'] },
  { key: 'footballDuration', groep: 'voetbal', scope: 'lokaal', label: 'Duur van een wedstrijd', uitleg: 'Eigen = wat je op het keuzescherm van de wedstrijd koos.',
    stappen: [stap('eigen', 'Eigen keuze'), stap('kort', 'Kort'), stap('normaal', 'Normaal')], presets: ['eigen', 'eigen', 'eigen'] },
  { key: 'income', groep: 'geld', scope: 'lokaal', label: 'Beloning van missies', uitleg: 'Hoeveel geld een missie, een herhaalde klus en een medaille opleveren. Prijzen in winkels en garages blijven gelijk, zodat de balans niet kantelt.',
    stappen: [stap(0.75, 'Een kwart minder'), stap(0.9, 'Minder'), stap(1, 'Gewoon'), stap(1.15, 'Meer'), stap(1.25, 'Een kwart meer')], presets: [1.15, 1, 0.9] },
  { key: 'hints', groep: 'hulp', scope: 'lokaal', label: 'Hints en tips', uitleg: 'Korte aanwijzingen op het scherm. Eigen = Instellingen, Spel.',
    stappen: [stap('eigen', 'Eigen instelling'), stap('aan', 'Altijd aan'), stap('uit', 'Uit')], presets: ['aan', 'eigen', 'eigen'] },
  { key: 'storyMode', groep: 'hulp', scope: 'lokaal', label: 'Verhaalmodus', uitleg: 'Zonder falen: geen tijdslimiet in missies en quicktime-events lopen vanzelf. Er verdwijnt niets uit het verhaal.',
    stappen: [stap('uit', 'Uit'), stap('aan', 'Aan')], presets: ['uit', 'uit', 'uit'] },
]);

export const OPTION_KEYS = Object.freeze(OPTION_DEFS.map((d) => d.key));
export const OPTION_GROUPS = Object.freeze([
  ['politie', 'Politie'], ['verkeer', 'Verkeer'], ['rijden', 'Rijden en schade'], ['races', 'Races'],
  ['minigames', 'Minigames en medailles'], ['voetbal', 'Voetbal'], ['geld', 'Geld'], ['hulp', 'Hulp'],
]);
const DEF_BY_KEY = Object.freeze(Object.fromEntries(OPTION_DEFS.map((d) => [d.key, d])));
const LEVEL_INDEX = { ontspannen: 0, standaard: 1, uitdagend: 2 };

// De uitleg per niveau voor de kaart "Hoe pittig moet het zijn?" (spelertekst, Nederlands).
export const LEVEL_TEXT = Object.freeze({
  ontspannen: { naam: 'Ontspannen', uitleg: 'Meer tijd, ruimere medailles, minder schade en een rustiger politiekorps. Voor wie vooral het verhaal wil beleven.' },
  standaard: { naam: 'Standaard', uitleg: 'Zoals het spel bedoeld is. De beste plek om te beginnen.' },
  uitdagend: { naam: 'Uitdagend', uitleg: 'Minder tijd, strengere medailles, drukker verkeer en een scherpere politie. Voor wie het spannend wil houden.' },
});

export const optionDef = (key) => DEF_BY_KEY[key] || null;

// Opties die pas ingaan bij de volgende missie, race of wedstrijd (een lopende start leest ze eenmalig): de menu's zeggen dat erbij.
export const OPTIONS_NEXT_START = Object.freeze(new Set(['timeFactor', 'targetFactor', 'raceAi', 'storyMode', 'footballAi', 'footballDuration']));

// De waarde die een niveau aan een optie geeft (de bron van de voorinstellingen).
export function presetValue(level, key) {
  const d = DEF_BY_KEY[key];
  if (!d) return undefined;
  return d.presets[LEVEL_INDEX[cleanDifficulty(level)]];
}

// Is dit een geldige waarde (een van de stappen) voor deze optie?
export function validOptionValue(key, value) {
  const d = DEF_BY_KEY[key];
  return !!d && d.stappen.some((s) => s.v === value);
}

// Een profiel uit onbekende invoer: een onbekend niveau wordt Standaard, een onbekende sleutel of waarde valt weg,
// en een waarde die gelijk is aan die van het niveau telt niet als "aangepast".
export function cleanProfile(raw) {
  const level = cleanDifficulty(raw && typeof raw === 'object' ? raw.level : undefined);
  const custom = {};
  const src = raw && typeof raw === 'object' && raw.custom && typeof raw.custom === 'object' ? raw.custom : {};
  for (const key of OPTION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    if (validOptionValue(key, src[key]) && src[key] !== presetValue(level, key)) custom[key] = src[key];
  }
  return { level, custom };
}

// Alle opties van een profiel: de waarde van het niveau, met `custom` erover.
export function resolveOptions(profile) {
  const p = cleanProfile(profile);
  const out = {};
  for (const key of OPTION_KEYS) out[key] = Object.prototype.hasOwnProperty.call(p.custom, key) ? p.custom[key] : presetValue(p.level, key);
  return out;
}

export const isCustomProfile = (profile) => Object.keys(cleanProfile(profile).custom).length > 0;

// De verdienste mag niet kantelen (balans, Bezit-balans): de beloningsfactor blijft binnen 0,75 en 1,25 en prijzen
// zijn geen optie. Dit is de laatste grens, ook als een stap ooit wordt toegevoegd.
export const INCOME_RANGE = Object.freeze([0.75, 1.25]);

// --- de actieve stand van dit spel (per save; savegame.js zet hem bij laden en bij een nieuw spel) ---
let active = { level: DIFFICULTY_DEFAULT, custom: {} };
let activeOptions = resolveOptions(active);
const listeners = new Set();

export function getDifficulty() {
  return { level: active.level, label: DIFFICULTY[active.level].label, custom: { ...active.custom }, aangepast: Object.keys(active.custom).length > 0, options: { ...activeOptions } };
}
export const getDifficultyProfile = () => ({ level: active.level, custom: { ...active.custom } });
export const getDifficultyLevel = () => active.level;

// Eén optie van de actieve stand. Een onbekende sleutel geeft undefined (een tikfout valt dan op).
export function opt(key) { return activeOptions[key]; }

function notify(prevLevel) { for (const cb of listeners) { try { cb(getDifficulty(), prevLevel); } catch (e) { /* een luisteraar mag het spel niet breken */ } } }

// Zet het hele profiel (laden van een save, kaart bij een nieuw spel). Geeft het schone profiel terug.
export function setActiveDifficulty(profile) {
  const prev = active.level, next = cleanProfile(profile);
  const same = prev === next.level && JSON.stringify(active.custom) === JSON.stringify(next.custom);
  active = next;
  activeOptions = resolveOptions(active);
  if (!same) notify(prev);
  return getDifficultyProfile();
}
// Een ander niveau kiezen wist de eigen aanpassingen (een niveau is een voorinstelling); hetzelfde niveau doet niets.
export function setActiveLevel(level) {
  const l = cleanDifficulty(level);
  if (l === active.level) return getDifficultyProfile();
  return setActiveDifficulty({ level: l, custom: {} });
}
// Eén optie afwijkend van het niveau zetten; de waarde van het niveau zelf haalt de aanpassing weg.
export function setActiveOption(key, value) {
  if (!validOptionValue(key, value)) return false;
  setActiveDifficulty({ level: active.level, custom: { ...active.custom, [key]: value } });
  return true;
}
export function resetActiveOptions() { return setActiveDifficulty({ level: active.level, custom: {} }); }
export function onDifficultyChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// Een profiel uit de savegame: een save zonder veld krijgt `legacyLevel` (het niveau dat dit apparaat tot nu toe had, in
// de praktijk Standaard) en geen aanpassingen.
export const profileFromSave = (raw, legacyLevel = DIFFICULTY_DEFAULT) => (raw && typeof raw === 'object' ? cleanProfile(raw) : { level: cleanDifficulty(legacyLevel), custom: {} });

// --- de koppelingen die de gameplay gebruikt (alle met dezelfde standaardwaarden bij Standaard) ---
export const policeEscapeFactor = () => activeOptions.policeEscape;
export const trafficFactor = () => activeOptions.trafficDensity;
export const vehicleDamageFactor = () => activeOptions.vehicleDamage;
export const damageTakenFactor = () => activeOptions.damageTaken;
export const raceSkillFactor = () => activeOptions.raceAi;
export const incomeFactor = () => Math.min(INCOME_RANGE[1], Math.max(INCOME_RANGE[0], activeOptions.income));
export const storyModeOn = () => activeOptions.storyMode === 'aan';

// Een beloning in euro (missie, klus, medaille) met de inkomensfactor, afgerond op hele euro's. Op Standaard onveranderd.
export function scaleIncome(amount) {
  const f = incomeFactor();
  return f === 1 || !Number.isFinite(amount) ? amount : Math.round(amount * f);
}

// 'eigen' (de instelling van dit apparaat) of een vaste waarde. Verhaalmodus zet quicktime-events op overslaan.
export function qteChoice(own) {
  if (storyModeOn()) return 'overslaan';
  const o = activeOptions.qte;
  return o === 'eigen' ? own : o;
}
// true/false voor een aan/uit-instelling met 'eigen' als terugval op de instelling van het apparaat.
export function toggleChoice(key, own) {
  const o = activeOptions[key];
  return o === 'aan' ? true : o === 'uit' ? false : own;
}
// Het niveau voor het voetbal: 'volg' is het niveau van de save.
export const footballLevel = () => (activeOptions.footballAi === 'volg' ? active.level : activeOptions.footballAi);
export const footballDuration = (own) => (activeOptions.footballDuration === 'eigen' ? own : activeOptions.footballDuration);

// Politiemacht: het aantal eenheden schaalt, maar zodra het niveau eenheden kent blijft er minstens één (nooit een lege jacht).
export function scaleUnits(base) {
  if (!(base > 0)) return base;
  const f = activeOptions.policeUnits;
  return f === 1 ? base : Math.max(1, Math.round(base * f));
}

// De tekst onder de knoppen: het niveau en of er iets is aangepast ("Standaard · aangepast").
export function difficultySummary(profile = getDifficultyProfile()) {
  const p = cleanProfile(profile);
  return `${DIFFICULTY[p.level].label}${Object.keys(p.custom).length ? ' · aangepast' : ''}`;
}

