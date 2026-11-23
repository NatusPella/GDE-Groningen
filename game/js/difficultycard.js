// De kaart "Hoe pittig moet het zijn?" (#1169): de pure regels en de Nederlandse tekst. Het scherm staat in difficultyui.js.
// De kaart komt bij een NIEUW spel en bij de allereerste start (nog geen save), na de keuzekaart Alleen of Samen
// (launchchoice.js) en voordat het spel begint. Hij heet bewust niet "Hoe wil je spelen?": die naam is van de keuzekaart.
// Geen DOM en geen opslag hier: de keuze gaat als profiel naar difficulty.js, dat savegame.js in de save schrijft.
import { DIFFICULTY, DIFFICULTY_MODES, DIFFICULTY_DEFAULT, LEVEL_TEXT, OPTION_DEFS, OPTION_GROUPS, cleanDifficulty, cleanProfile, optionDef, presetValue } from './difficulty.js';

export const CARD_TEXT = Object.freeze({
  eyebrow: 'Nieuw spel',
  titel: 'Hoe pittig moet het zijn?',
  uitleg: 'Later: Instellingen, Moeilijkheid, Toegankelijkheid.',
  aanbevolen: 'Aanbevolen',
  aanpassen: 'Aanpassen',
  aanpassenUitleg: 'Kies zelf per onderdeel',
  hulp: ['{ARROWS} kiezen', '{ENTER} bevestigen', '{ESC} Standaard kiezen'], // #1227: Esc kiest Standaard, dat zegt de regel nu
  aria: 'Kies hoe pittig het spel is',
  optiesTitel: 'Zelf aanpassen',
  optiesUitleg: 'Elke optie begint op het niveau. Wijzig wat je wilt.',
  optiesHulp: ['{ARROWS} kiezen en veranderen', '{ENTER} volgende waarde', '{ESC} terug'],
  klaar: 'Klaar, start het spel',
  terug: 'Terug',
  niveauAria: 'Niveau',
});

export const LEVEL_KEYS = Object.freeze(['1', '2', '3']); // de toets per niveau, in de volgorde van DIFFICULTY_MODES
export const levelCards = () => DIFFICULTY_MODES.map((id, i) => ({
  id, label: DIFFICULTY[id].label, uitleg: LEVEL_TEXT[id].uitleg, toets: LEVEL_KEYS[i], aanbevolen: id === DIFFICULTY_DEFAULT,
}));

// #1227: per niveau drie meters (tijd, politie, verkeer) met een icoon, een woord en 1 tot 3 blokjes: hoe pittig dat deel is.
// Afgeleid uit de voorinstellingen van de opties zelf, zodat de kaart niet liegt als een preset verandert.
// richting: 1 = een hogere waarde is pittiger, -1 = een lagere waarde is pittiger (minder tijd).
export const LEVEL_METERS = Object.freeze([
  { id: 'tijd', key: 'timeFactor', icoon: 'tijd', label: 'Tijd', richting: -1, woorden: ['ruim', 'gewoon', 'krap'] },
  { id: 'politie', key: 'policeUnits', icoon: 'politie', label: 'Politie', richting: 1, woorden: ['rustig', 'gewoon', 'scherp'] },
  { id: 'verkeer', key: 'trafficDensity', icoon: 'auto', label: 'Verkeer', richting: 1, woorden: ['rustig', 'gewoon', 'druk'] },
]);
export function levelMeters(level) {
  return LEVEL_METERS.map((m) => {
    const waarden = [...new Set(DIFFICULTY_MODES.map((l) => presetValue(l, m.key)))].sort((a, b) => (a - b) * m.richting);
    const i = Math.max(0, waarden.indexOf(presetValue(level, m.key)));
    const n = Math.min(3, i + 1);
    return { id: m.id, icoon: m.icoon, label: m.label, n, woord: m.woorden[n - 1] };
  });
}

// Wat de start vraagt. `testmodus`: een geautomatiseerde run (main.js telt de vlaggen), `vlag`: ?moeilijkheid=
//   'vraag' toont de kaart ook in een testrun (beeld en tests); een niveau (bijv. 'uitdagend') zet dat niveau zonder kaart;
//   anders slaat een testrun de kaart over en is het niveau Standaard (de bestaande tests en de benchmark veranderen niet).
export function difficultyPlan({ testmodus = false, vlag = null } = {}) {
  if (vlag === 'vraag') return { ask: true, level: DIFFICULTY_DEFAULT, reden: 'vlag' };
  if (DIFFICULTY_MODES.includes(vlag)) return { ask: false, level: vlag, reden: 'vlag' };
  if (testmodus) return { ask: false, level: DIFFICULTY_DEFAULT, reden: 'testmodus' };
  return { ask: true, level: DIFFICULTY_DEFAULT, reden: '' };
}

// Moet de kaart nu? Alleen als het spel een NIEUW spel begint: een verse plek (na "Nieuw spel") of de allereerste start zonder save.
export const needsDifficultyCard = ({ fresh = false, hasSave = false } = {}) => !!fresh || !hasSave;

// Toetsen op de niveau-weergave. index: 0..2 de niveaus, 3 = "Aanpassen". Geeft { focus }, { kies }, { aanpassen: true } of null.
// Pijlen en WASD verplaatsen de focus, 1 tot 3 kiezen meteen, 4 opent Aanpassen, Enter en spatie kiezen de knop met focus,
// Escape en Backspace kiezen Standaard (de terugweg is het gewone spel).
export function levelKeyAction(key, index = 0) {
  const n = DIFFICULTY_MODES.length + 1;
  const k = String(key);
  if (['ArrowLeft', 'ArrowUp', 'a', 'A', 'w', 'W'].includes(k)) return { focus: (index + n - 1) % n };
  if (['ArrowRight', 'ArrowDown', 'd', 'D', 's', 'S'].includes(k)) return { focus: (index + 1) % n };
  const direct = LEVEL_KEYS.indexOf(k);
  if (direct >= 0) return { kies: DIFFICULTY_MODES[direct] };
  if (k === '4') return { aanpassen: true };
  if (k === 'Enter' || k === ' ') {
    const i = ((index % n) + n) % n;
    return i === DIFFICULTY_MODES.length ? { aanpassen: true } : { kies: DIFFICULTY_MODES[i] };
  }
  if (k === 'Escape' || k === 'Backspace') return { kies: DIFFICULTY_DEFAULT };
  return null;
}

// Toetsen op de opties-weergave. index: 0..count-1 de opties, count = "Klaar". Omhoog en omlaag (en W en S) verplaatsen de focus,
// links en rechts (A en D) veranderen de waarde, Enter en spatie gaan naar de volgende waarde (of sluiten bij Klaar), Escape gaat terug.
export function optionsKeyAction(key, index = 0, count = OPTION_DEFS.length) {
  const n = count + 1;
  const k = String(key);
  if (['ArrowUp', 'w', 'W'].includes(k)) return { focus: (index + n - 1) % n };
  if (['ArrowDown', 's', 'S'].includes(k)) return { focus: (index + 1) % n };
  if (index >= count) {
    if (k === 'Enter' || k === ' ') return { klaar: true };
  } else {
    if (['ArrowLeft', 'a', 'A'].includes(k)) return { stap: -1 };
    if (['ArrowRight', 'd', 'D'].includes(k)) return { stap: 1 };
    if (k === 'Enter' || k === ' ') return { stap: 'rond' };
  }
  if (k === 'Escape' || k === 'Backspace') return { terug: true };
  return null;
}

// Een optie één stap verder in het concept (een profiel). 'rond' gaat na de laatste stap terug naar de eerste.
// Geeft een nieuw, schoon profiel: een stap die gelijk is aan het niveau telt niet als aangepast.
export function stepDraft(profile, key, stap) {
  const def = optionDef(key);
  const p = cleanProfile(profile);
  if (!def) return p;
  const cur = Object.prototype.hasOwnProperty.call(p.custom, key) ? p.custom[key] : presetValue(p.level, key);
  const i = Math.max(0, def.stappen.findIndex((s) => s.v === cur));
  const next = stap === 'rond' ? (i + 1) % def.stappen.length : Math.min(def.stappen.length - 1, Math.max(0, i + stap));
  return cleanProfile({ level: p.level, custom: { ...p.custom, [key]: def.stappen[next].v } });
}

export const draftValue = (profile, key) => {
  const p = cleanProfile(profile);
  return Object.prototype.hasOwnProperty.call(p.custom, key) ? p.custom[key] : presetValue(p.level, key);
};
export const draftLabel = (profile, key) => {
  const def = optionDef(key);
  const v = draftValue(profile, key);
  const s = def && def.stappen.find((x) => x.v === v);
  return s ? s.label : '';
};

// Een ander niveau kiezen in het concept wist de aanpassingen (een niveau is een voorinstelling).
export const draftLevel = (profile, level) => (cleanDifficulty(level) === cleanProfile(profile).level ? cleanProfile(profile) : { level: cleanDifficulty(level), custom: {} });

export { OPTION_DEFS, OPTION_GROUPS };
