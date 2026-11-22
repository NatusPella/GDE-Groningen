// De HUD-stand van het reuzenrad Hoogvlieger (#985): puur, geen DOM en geen THREE (scripts/reuzenradhud_test.mjs). Maakt uit de stand van het ritje het model voor de
// gedeelde strook (simhud.js): de stappen (omhoog, top, omlaag), een meter met hoe ver je ritje is, de hoogte groot met je ronde en de tijd die je nog hebt, elk met een
// pictogram, en één zin "wat nu". De regels staan in reuzenradrules.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';
import { LAPS } from './reuzenradrules.js';

// Icoonpaden voor de chips (24x24, lijn): pijl omhoog, uitzicht (oog), pijl omlaag, uitstappen (deur).
const ICOON = {
  omhoog: 'pijl_omhoog',
  top: 'oog',
  omlaag: 'pijl_omlaag',
  uit: 'uitgang',
};

export const STAPPEN = [
  { id: 'omhoog', label: 'Omhoog', icoon: ICOON.omhoog },
  { id: 'top', label: 'Uitzicht', icoon: ICOON.top },
  { id: 'omlaag', label: 'Omlaag', icoon: ICOON.omlaag },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot je voor het eerst de top haalt (dit apparaat).
export const UITLEG_ID = 'reuzenrad';
export const UITLEG = [
  { icoon: ICOON.top, tekst: 'Kijk rond met {MOUSE} of {ARROWS}' },
  { icoon: ICOON.omhoog, tekst: `Het rad draait ${LAPS} rondes` },
  { icoon: ICOON.uit, tekst: '{BACKSPACE}: uitstappen als je beneden bent' },
  { icoon: I.klok, tekst: 'Zo lang duurt je ritje nog' },
];

export const TOP_VANAF = 0.8; // deel van de hoogste stand vanaf waar het "de top" heet

export const stapVan = (g) => ((g.hoogte || 0) >= TOP_VANAF * (g.maxHoogte || 1) ? 'top' : g.stijgt ? 'omhoog' : 'omlaag');
const tijdTekst = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// g: { hoogte (m), maxHoogte (m), stijgt (bool), voortgang (0..1), links (s), ronde (1..LAPS), uitstap (bool: je hebt om uitstappen gevraagd), mag (bool: je hangt onderaan), uitleg }
export function reuzenradHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i === idx ? 'nu' : 'straks' }));
  const links = Math.max(0, Math.ceil(g.links || 0));
  const klem = Math.max(0, Math.min(1, g.voortgang || 0));
  const meter = { pct: klem * 100, naam: 'Je ritje', label: `Ronde ${Math.min(LAPS, Math.max(1, g.ronde || 1))} van ${LAPS}`, staat: '' };
  const cijfers = [
    { label: 'Hoogte', waarde: `${Math.max(0, Math.round(g.hoogte || 0))} m`, icoon: I.hoogte, primair: true },
    { label: 'Nog', waarde: tijdTekst(links), icoon: I.klok },
  ];
  return {
    id: 'reuzenrad', titel: 'Hoogvlieger', icoon: ICOON.top, plek: '', stappen, meter, cijfers, uitleg: g.uitleg ? UITLEG : [],
    nu: watNu(g), hulp: 'Rondkijken met {MOUSE} of {ARROWS} · {BACKSPACE} uitstappen', slecht: false,
  };
}

export function watNu(g) {
  if (g.uitstap) return g.mag ? 'Je stapt nu uit' : 'Je stapt uit zodra je beneden bent';
  if (stapVan(g) === 'top') return 'Op de top: wat een uitzicht!';
  if (g.stijgt) return 'Omhoog: kijk rond met {MOUSE}';
  return g.mag ? 'Beneden: {BACKSPACE} om uit te stappen' : 'Je gaat weer omlaag';
}

// Wat opspringt: de top van elke ronde met zijn hoogte.
export function topPop(hoogte, ronde) { return { tekst: `Op de top: ${Math.round(hoogte)} m`, geluid: ronde >= LAPS ? 'ui_loopbaan' : 'ui_verzameld' }; }
