// De HUD-stand van het hengelen (#985): puur, geen DOM en geen THREE (scripts/hengelhud_test.mjs). Maakt uit de toestand van een hengelronde het model voor de
// gedeelde strook (simhud.js): de stappen (uitgooien, wachten, beet, binnenhalen), de beetmeter, de cijfers van de sessie en één zin "wat nu".
// De regels van het hengelen zelf staan in hengelrules.js; dit bestand leest ze alleen.

import { IC } from './simicons.js';

// Icoonpaden voor de chips (24x24, lijn): lijn met haak, dobber, uitroep, vis.
const ICOON = {
  hengel: '<path d="M4 20L15 5"/><path d="M15 5c4 0 5 4 5 8"/><circle cx="20" cy="15" r="1.4"/>',
  uit: '<path d="M4 20L15 5"/><path d="M15 5c3 1 5 4 5 7"/>',
  wacht: '<circle cx="12" cy="13" r="5"/><path d="M12 3v5"/><path d="M7 13h10"/>',
  beet: '<path d="M12 4v10"/><circle cx="12" cy="19" r="1.6"/>',
  vis: '<path d="M4 12c3-5 9-6 13-1l3-3v8l-3-3c-4 5-10 4-13-1z"/><circle cx="8.5" cy="11" r="0.8"/>',
};

// De vier stappen van een worp. 'haal' is het korte binnenhalen na een vangst (hengelen.js: haalT).
export const STAPPEN = [
  { id: 'uit', label: 'Uitgooien', icoon: ICOON.uit },
  { id: 'wacht', label: 'Wachten', icoon: ICOON.wacht },
  { id: 'beet', label: 'Beet', icoon: ICOON.beet },
  { id: 'haal', label: 'Binnenhalen', icoon: ICOON.vis },
];

// Welke stap hoort bij de fase van stepHengel (idle, cast, wait, bite, scare) en het binnenhalen.
export function stapVan(fase, haal) {
  if (haal) return 'haal';
  if (fase === 'wait') return 'wacht';
  if (fase === 'bite') return 'beet';
  return 'uit'; // idle, cast en scare: klaar voor of bezig met de worp
}

const kgTekst = (v) => v.toFixed(v < 1 ? 2 : 1).replace('.', ',') + ' kg';
const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');

// De zin onderin: wat moet je nu doen? De beet is de enige waarbij haast is.
function watNu(fase, haal, flashSlecht) {
  if (haal) return 'Je haalt de vis binnen';
  if (fase === 'bite') return 'Nu {SPATIE}: haal binnen!';
  if (fase === 'wait') return 'Wacht. Nog niet trekken';
  if (fase === 'cast') return 'De lijn zoeft uit';
  if (fase === 'scare') return 'De vissen zijn gevlucht: even wachten';
  return flashSlecht ? 'Gooi opnieuw uit met {SPATIE}' : 'Gooi uit met {SPATIE}';
}

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot de eerste worp (hengelen.js zet hem daarna op gezien).
export const UITLEG_ID = 'hengelen';
export const UITLEG = [
  { icoon: ICOON.uit, tekst: '{SPATIE}: gooi uit' },
  { icoon: ICOON.wacht, tekst: 'Wacht op het dobbertje' },
  { icoon: ICOON.beet, tekst: 'Zakt hij? Meteen {SPATIE}' },
  { icoon: ICOON.vis, tekst: 'Te vroeg trekken jaagt de vis weg' },
];

// g: { mode: 'vrij'|'wedstrijd', fase, haal, bijt (s over), beetTotaal (s), vangsten, soorten, kg, kas (euro), plek, left (s, alleen wedstrijd),
//      tuig: { hengel, aas }, flash: { text, bad }, uitleg: bool }
export function hengelHudModel(g) {
  if (!g) return null;
  const stap = stapVan(g.fase, g.haal);
  const idx = STAPPEN.findIndex((s) => s.id === stap);
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const bijt = g.fase === 'bite' && g.beetTotaal > 0 ? Math.max(0, Math.min(1, g.bijt / g.beetTotaal)) : null;
  const meter = bijt === null ? null : { pct: bijt * 100, naam: 'Tijd om binnen te halen', label: `${(Math.max(0, g.bijt)).toFixed(1).replace('.', ',')} s`, staat: bijt < 0.35 ? 'laag' : '' };
  const wed = g.mode === 'wedstrijd';
  // één primaire waarde: het gewicht (daar gaat het om); de rest klein met pictogram, en alleen wat nu relevant is
  const primair = { icoon: IC.gewicht, waarde: kgTekst(g.kg || 0), naam: wed ? 'Gewicht' : 'Gewicht gevangen' };
  const cijfers = wed
    ? [{ icoon: IC.klok, label: 'Tijd over', waarde: `${Math.max(0, Math.ceil(g.left || 0))} s`, staat: (g.left || 0) <= 15 ? 'let-op' : '' }, { icoon: IC.vis, label: 'Gevangen', waarde: String(g.vangsten || 0) }]
    : [{ icoon: IC.vis, label: 'Vangsten', waarde: `${g.vangsten || 0}` }, { icoon: IC.euro, label: 'Visboer', waarde: euro(g.kas || 0) }];
  const flash = g.flash && !g.flash.bad ? g.flash.text : '';
  return {
    id: 'hengelen', titel: wed ? 'Hengelwedstrijd' : 'Hengelen', icoon: ICOON.hengel, plek: g.plek || '',
    stappen, primair, meter, cijfers, uitleg: g.uitleg ? UITLEG : [],
    nu: (flash && stap !== 'beet' ? flash + ' · ' : '') + watNu(g.fase, g.haal, !!(g.flash && g.flash.bad)),
    hulp: [...(!wed && g.tuig ? [`Hengel: ${g.tuig.hengel} · aas: ${g.tuig.aas}`] : []), '{SPATIE} uitgooien en binnenhalen · {BACKSPACE} stoppen'],
    slecht: !!(g.flash && g.flash.bad) || g.fase === 'scare',
  };
}
