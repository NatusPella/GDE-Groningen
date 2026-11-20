// De HUD-stand van de wandeling in Winsum (#985): puur, geen DOM en geen THREE (scripts/wandelhud_test.mjs). Maakt uit de stand van de wandeling het model voor de
// gedeelde strook (simhud.js): de stappen (lopen, stempelen, klaar), een meter met de stempels die je hebt, de afstand tot de volgende post groot met je tempo en je
// tijd, elk met een pictogram, en één zin "wat nu" (met de windrichting). De regels staan in wandelrules.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): lopende voeten (lopen), stempel, vlag (klaar).
export const ICOON = {
  lopen: '<path d="M8 20c-1.5 0-2-1-2-2.5 0-2 1-4 2.5-4S11 16 11 17.5 10 20 8 20z"/><path d="M16 12c-1.5 0-2-1-2-2.5 0-2 1-4 2.5-4S19 8 19 9.5 18 12 16 12z"/>',
  stempel: '<path d="M9 14V9a3 3 0 1 1 6 0v5"/><path d="M6 14h12v3H6z"/><path d="M5 21h14"/>',
  klaar: '<path d="M6 21V4"/><path d="M6 5h12l-2 4 2 4H6"/>',
};

export const STAPPEN = [
  { id: 'lopen', label: 'Lopen', icoon: ICOON.lopen },
  { id: 'stempelen', label: 'Stempelen', icoon: ICOON.stempel },
  { id: 'klaar', label: 'Klaar', icoon: ICOON.klaar },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot je voor het eerst een stempel haalt (dit apparaat).
export const UITLEG_ID = 'wandeling';
export const UITLEG = [
  { icoon: ICOON.lopen, tekst: 'Loop naar de gele kolom' },
  { icoon: ICOON.stempel, tekst: 'Kom dicht bij de post voor een stempel' },
  { icoon: I.tempo, tekst: 'Een vlot tempo geeft een medaille' },
  { icoon: ICOON.klaar, tekst: 'Een voertuig telt niet: stap uit' },
];

export const STAMP_R = 22;   // m: zo dichtbij is een stempel (wandelrules.js)
export const NABIJ = 80;     // m: vanaf hier wijst de strook op het stempelen

export const WINDSTREKEN = ['oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest', 'noord', 'noordoost'];
export const strek = (a) => WINDSTREKEN[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];

const tijdTekst = (s) => `${Math.floor(s / 60)}:${(Math.floor(s) % 60).toString().padStart(2, '0')}`;
const afstandTekst = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);

// g: { fase ('walk'|'done'), stempels, totaal, post (naam van de volgende), afstand (m), richting (rad), tempo (m/s), tijd (s), opvoertuig (bool), flash, uitleg }
export function wandelHudModel(g) {
  if (!g) return null;
  const klaar = g.fase === 'done';
  const dichtbij = !klaar && g.afstand != null && g.afstand < NABIJ;
  const idx = klaar ? 2 : dichtbij ? 1 : 0;
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const totaal = Math.max(1, g.totaal || 1), n = Math.max(0, Math.min(totaal, g.stempels || 0));
  const meter = { pct: (n / totaal) * 100, naam: 'Stempels', label: `${n} van ${totaal}`, staat: '' };
  const cijfers = [
    { label: 'Volgende post', waarde: g.afstand == null ? '-' : afstandTekst(g.afstand), icoon: I.vlag, primair: true },
    { label: 'Tempo', waarde: `${(g.tempo || 0).toFixed(1).replace('.', ',')} m/s`, icoon: I.tempo },
    { label: 'Tijd', waarde: tijdTekst(g.tijd || 0), icoon: I.klok },
  ];
  return {
    id: 'wandeling', titel: 'Wandeling Winsum', icoon: ICOON.lopen, plek: klaar ? '' : (g.post || ''), stappen, meter, cijfers, uitleg: g.uitleg && n === 0 ? UITLEG : [],
    nu: watNu(g), hulp: 'Loop naar de gele kolom · Backspace stopt', slecht: !!g.opvoertuig,
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.opvoertuig) return 'Stap uit: in een voertuig telt niets';
  if (g.fase === 'done') return 'Alle stempels: goed gelopen';
  if (g.afstand != null && g.afstand < NABIJ) return `Bijna bij ${g.post}: nog ${Math.max(0, Math.round(g.afstand - STAMP_R))} m voor de stempel`;
  return `Loop naar ${g.post}${g.richting == null ? '' : ` (${strek(g.richting)})`}`;
}

// Wat opspringt: een stempel met zijn nummer, of de laatste.
export function stempelPop(n, van, naam) {
  return n >= van ? { tekst: `Alle ${van} stempels!`, geluid: 'ui_loopbaan' } : { tekst: `Stempel ${n}/${van}: ${naam}`, geluid: 'ui_verzameld' };
}
