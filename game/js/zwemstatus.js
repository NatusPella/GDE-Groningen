// De HUD-stand van het zwembad (#985): puur, geen DOM en geen THREE (scripts/zwemhud_test.mjs). Maakt uit de stand van de zwemrace het model voor de gedeelde strook
// (simhud.js): de stappen (duiken, zwemmen, finish), een meter (de duikbalk met het streepje, daarna je armen), drie cijfers met pictogram (tijd groot, baan,
// afstand) en één zin "wat nu". De regels van de race staan in swimrules.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): duiker (pijl omlaag in golf), zwemmer (golven), finish (vlag), keerpunt (U-bocht), arm.
export const ICOON = {
  duik: 'pijl_omlaag',
  zwem: 'zwemmen',
  vlag: 'vlag',
  keer: 'afslag_links',
};

export const STAPPEN = [
  { id: 'duik', label: 'Duiken', icoon: ICOON.duik },
  { id: 'zwem', label: 'Zwemmen', icoon: ICOON.zwem },
  { id: 'finish', label: 'Finish', icoon: ICOON.vlag },
];

export const UITLEG_ID = 'zwembad';
export const UITLEG = [
  { icoon: ICOON.duik, tekst: '{SPATIE} als de balk bij het streepje is' },
  { icoon: ICOON.zwem, tekst: '{A} en {D} om en om zwemmen' },
  { icoon: ICOON.keer, tekst: '{SPATIE} vlak voor de muur: keerpunt' },
  { icoon: ICOON.vlag, tekst: 'Houd je armen fris: rustig ritme' },
];

export const DUIK_DOEL = 0.52; // de plek van het streepje op de duikbalk (zwembad.js, #615)
export const KEER_AFSTAND = 3; // m voor de muur: vanaf hier wijst de strook op het keerpunt

export const stapVan = (g) => (g.swimFase === 'done' ? 'finish' : g.swimFase === 'swim' ? 'zwem' : 'duik');

// g: { fase ('intro'|'run'|'finish'), swimFase ('block'|'swim'|'done'), tijd (tekst), baan, banen, afstand (m), duik (0..1, de balk), stamina (0..1), moe (bool), muur (m tot de keerwand), flash, slecht, uitleg }
export function zwemHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const opBlok = g.swimFase === 'block';
  const goed = opBlok && Math.abs((g.duik || 0) - DUIK_DOEL) < 0.1;
  const meter = g.swimFase === 'done' ? null : opBlok
    ? { pct: Math.max(0, Math.min(100, (g.duik || 0) * 100)), naam: 'Duikbalk', label: goed ? 'Nu!' : 'Streepje', staat: goed ? 'goed' : '' }
    : { pct: Math.max(0, Math.min(100, (g.stamina || 0) * 100)), naam: 'Je armen', label: g.moe ? 'Moe' : 'Armen', staat: g.moe ? 'laag' : '' };
  const cijfers = [
    { label: 'Tijd', waarde: g.tijd, icoon: I.klok, primair: true },
    { label: 'Baan', waarde: `${Math.min(g.banen, g.baan)}/${g.banen}`, icoon: I.ronde },
    { label: 'Afstand', waarde: `${Math.round(g.afstand || 0)} m`, icoon: I.vlag },
  ];
  return {
    id: 'zwembad', titel: 'Honderd meter', icoon: ICOON.zwem, plek: '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'intro' ? UITLEG : [],
    nu: watNu(g), hulp: '{A}{D} om en om · {SPATIE} duik en keerpunt · {BACKSPACE} stopt', slecht: !!g.slecht || (!!g.moe && !opBlok),
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.fase === 'intro') return 'Op het startblok: even wachten';
  if (g.swimFase === 'block') return '{SPATIE} als de balk bij het streepje is';
  if (g.swimFase === 'done') return 'Aangetikt!';
  if (g.moe) return 'Moe! Rustig aan, ritme vasthouden';
  if (g.muur != null && g.muur <= KEER_AFSTAND) return 'Nu {SPATIE}: keerpunt';
  return '{A} en {D} om en om, rustig ritme';
}

// Wat opspringt: een goede duik (alleen een mooie), een mooi keerpunt. Een mislukte duik of keerpunt springt niet op (de zin staat al in de strook).
export function duikPop(q) { return q >= 0.95 ? { tekst: 'Mooie duik!', geluid: 'ui_verzameld' } : null; }
export function keerPop(flip) { return flip ? { tekst: 'Mooi keerpunt!', geluid: 'ui_verzameld' } : null; }
