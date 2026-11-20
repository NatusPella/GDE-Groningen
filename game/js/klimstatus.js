// De HUD-stand van de klimtoren (#985): puur, geen DOM en geen THREE (scripts/klimhud_test.mjs). Maakt uit de stand van de klim het model voor de gedeelde strook
// (simhud.js): de stappen (start, klimmen, top), een meter voor je armen, drie cijfers met pictogram (hoogte groot, pogingen, tijd) en één zin "wat nu".
// De regels van de klim staan in climbrules.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';
import { WALL } from './climbrules.js';

// Icoonpaden voor de chips (24x24, lijn): grond (mat), klimmer (hand aan greep), top (vlag), magnesium (zakje), hart voor pogingen.
export const ICOON = {
  start: 'plek',
  klim: 'klimmen',
  top: 'vlag',
  magnesium: 'pakket',
  kans: 'hart',
};

export const STAPPEN = [
  { id: 'start', label: 'Start', icoon: ICOON.start },
  { id: 'klim', label: 'Klimmen', icoon: ICOON.klim },
  { id: 'top', label: 'Top', icoon: ICOON.top },
];

export const UITLEG_ID = 'klimtoren';
export const UITLEG = [
  { icoon: ICOON.klim, tekst: 'Houd {A} en {D} allebei vast' },
  { icoon: ICOON.start, tekst: 'Pak de grepen met een ring' },
  { icoon: ICOON.magnesium, tekst: '{SPATIE}: magnesium voor frisse armen' },
  { icoon: ICOON.top, tekst: 'De gele kolom staat boven de top' },
];

export const ARMEN_LAAG = 0.25; // onder dit niveau zijn je armen bijna leeg (klimtoren.js kleurde de balk al zo, #620)

export const stapVan = (g) => (g.klimFase === 'top' ? 'top' : g.grond || g.fase === 'intro' ? 'start' : 'klim');
const meter1 = (m) => `${m.toFixed(1).replace('.', ',')} m`;

// g: { fase ('intro'|'run'|'outro'|'wacht'), klimFase ('climb'|'top'|'over'), grond (bool), hoogte (m), tijd (tekst), kansen (over), armen (0..1), flash, slecht, uitleg }
export function klimHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const laag = (g.armen || 0) < ARMEN_LAAG;
  const meter = { pct: Math.max(0, Math.min(100, (g.armen || 0) * 100)), naam: 'Je armen', label: laag ? 'Bijna leeg' : 'Armen', staat: laag ? 'laag' : '' };
  const cijfers = [
    { label: 'Hoogte', waarde: `${meter1(g.hoogte || 0)} van ${WALL.height}`, icoon: I.hoogte, primair: true },
    { label: 'Pogingen', waarde: String(Math.max(0, g.kansen || 0)), icoon: ICOON.kans },
    { label: 'Tijd', waarde: g.tijd, icoon: I.klok },
  ];
  return {
    id: 'klimtoren', titel: 'Klimtoren', icoon: ICOON.klim, plek: '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'intro' ? UITLEG : [],
    nu: watNu(g), hulp: '{A} + {D} vasthouden · {SPATIE} magnesium · {BACKSPACE} stopt', slecht: !!g.slecht || (laag && g.fase === 'run' && !g.grond),
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.fase === 'wacht') return g.klimFase === 'top' ? 'Boven! Wachten op de anderen' : 'Klaar: wachten op de anderen';
  if (g.fase === 'intro') return 'Pak de eerste grepen';
  if (g.fase === 'outro') return g.klimFase === 'top' ? 'Boven!' : 'Klaar';
  if (g.grond) return 'Houd {A} en {D} vast: omhoog';
  if ((g.armen || 0) < ARMEN_LAAG) return 'Armen leeg: rust of {SPATIE} magnesium';
  return 'Pak de volgende greep met de ring';
}

// Wat opspringt: magnesium (frisse armen) en de top. Een val staat als zin in de strook.
export function magnesiumPop() { return { tekst: 'Frisse armen', geluid: 'ui_verzameld' }; }
export function topPop() { return { tekst: 'Boven!', geluid: 'ui_loopbaan' }; }
