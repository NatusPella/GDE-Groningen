// De HUD-stand van het skatepark (#985): puur, geen DOM en geen THREE (scripts/skatehud_test.mjs). Maakt uit de stand van de run het model voor de gedeelde strook
// (simhud.js): wat je doet (duwen, truc in de lucht, grind) als chips, een meter (de tijd van de run, tijdens een grind je balans), de score (groot) en de keten
// met pictogram, en één zin "wat nu". De regels staan in skatetricks.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): board met wielen (duwen), pijl omhoog met bocht (truc), rail met streepjes (grind), balans.
export const ICOON = {
  duw: '<path d="M3 14h18"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/><path d="M12 4v7M9 7l3-3 3 3"/>',
  truc: '<path d="M5 18c2-8 6-12 14-12"/><path d="M15 3l4 3-3 4"/>',
  grind: '<path d="M3 12h18"/><path d="M6 12v6M12 12v6M18 12v6"/><path d="M9 7l3-3 3 3"/>',
  keten: '<path d="M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"/><path d="M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"/>',
};

export const STAPPEN = [
  { id: 'duw', label: 'Duwen', icoon: ICOON.duw },
  { id: 'truc', label: 'Truc', icoon: ICOON.truc },
  { id: 'grind', label: 'Grind', icoon: ICOON.grind },
];

export const UITLEG_ID = 'skatepark';
export const UITLEG = [
  { icoon: ICOON.duw, tekst: '{W} duwt, {S} remt' },
  { icoon: ICOON.truc, tekst: '{SPATIE} ollie, {E} kickflip, {F} heelflip' },
  { icoon: ICOON.grind, tekst: 'Spring op een rail en houd je balans' },
  { icoon: ICOON.keten, tekst: 'Een keten telt pas als je landt' },
];

export const BALANS_GEVAAR = 0.65; // vanaf hier val je bijna (skatepark.js kleurde de balk al zo, #619)

export const stapVan = (g) => (g.grind ? 'grind' : g.grond === false ? 'truc' : 'duw');
const getal = (n) => Math.round(n).toLocaleString('nl-NL');
const tijdTekst = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// g: { fase ('intro'|'run'|'outro'), links (s), duur (s), score, keten (punten van de lopende keten), mult, ketenAan (bool), grond (bool), grind: { bal } of null, flash, slecht, uitleg }
export function skateHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i === idx ? 'nu' : 'straks' }));
  const links = Math.max(0, Math.ceil(g.links || 0));
  const meter = g.grind
    ? { pct: Math.max(0, Math.min(100, (0.5 + g.grind.bal / 2.4) * 100)), naam: 'Balans', label: Math.abs(g.grind.bal) > BALANS_GEVAAR ? 'Bijna gevallen' : 'Balans', staat: Math.abs(g.grind.bal) > BALANS_GEVAAR ? 'laag' : '' }
    : { pct: Math.max(0, Math.min(100, ((g.links || 0) / (g.duur || 1)) * 100)), naam: 'Tijd van de ronde', label: tijdTekst(links), staat: links <= 10 && g.fase === 'run' ? 'laag' : '' };
  const cijfers = [{ label: 'Score', waarde: getal(g.score || 0), icoon: I.plaats, primair: true }];
  if (g.ketenAan) cijfers.push({ label: 'Keten', waarde: `${getal(g.keten || 0)} x${g.mult || 1}`, icoon: ICOON.keten });
  return {
    id: 'skatepark', titel: 'Skatepark', icoon: ICOON.duw, plek: g.run || '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'intro' ? UITLEG : [],
    nu: watNu(g), hulp: '{W} duwen · {A}{D} sturen · {SPATIE} ollie · {E} kickflip · {F} heelflip · {S} grab', slecht: !!g.slecht || (!!g.grind && Math.abs(g.grind.bal) > BALANS_GEVAAR),
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.fase === 'intro') return 'Daar gaan we: duw met W';
  if (g.fase === 'outro') return 'Tijd!';
  if (g.grind) return g.grind.bal > 0.1 ? 'Je leunt rechts: stuur links' : g.grind.bal < -0.1 ? 'Je leunt links: stuur rechts' : 'Grind! Houd het midden';
  if (g.grond === false) return 'In de lucht: draai met {A} of {D} en land netjes';
  return g.ketenAan ? 'Land en blijf rijden: de keten telt dan' : 'Duw met {W} en spring met {SPATIE} bij een helling of rail';
}

// Wat opspringt: een truc met zijn punten en een opgeslagen keten. Een val springt niet op (de zin staat in de strook).
export function trucPop(namen, punten) { return { tekst: `${namen} +${getal(punten)}`, geluid: 'ui_verzameld' }; }
export function ketenPop(punten) { return { tekst: `Keten opgeslagen +${getal(punten)}`, geluid: 'ui_loopbaan' }; }
