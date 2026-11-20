// De HUD-stand van de bus-bijbaan, stadsbus lijn 3 (#985): puur, geen DOM en geen THREE (scripts/bushud_test.mjs). Maakt uit de stand van een rondje het model voor de
// gedeelde strook (simhud.js): de stappen (rijden, halte, vertrek), een meter voor de haltes die je gehaald hebt, het schema groot (op tijd, te laat, te vroeg) met de
// halte en je comfort, elk met een pictogram, en één zin "wat nu". De dienstregeling en de drempels staan in sidejob_bus.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): bus (voorkant), halte (paal met bord), vertrek (pijl).
export const ICOON = {
  bus: '<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 11h14M8 20v-3M16 20v-3"/><circle cx="8.5" cy="14" r=".8"/><circle cx="15.5" cy="14" r=".8"/>',
  halte: '<path d="M8 21V4"/><rect x="8" y="4" width="8" height="5" rx="1"/><path d="M5 21h6"/>',
  vertrek: '<path d="M4 12h14"/><path d="M13 7l5 5-5 5"/>',
};

export const STAPPEN = [
  { id: 'rijden', label: 'Rijden', icoon: ICOON.bus },
  { id: 'halte', label: 'Halte', icoon: ICOON.halte },
  { id: 'vertrek', label: 'Vertrek', icoon: ICOON.vertrek },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot je voor het eerst bij een halte stopt (dit apparaat).
export const UITLEG_ID = 'bus';
export const UITLEG = [
  { icoon: ICOON.bus, tekst: 'Rijd naar de halte bij de gele kolom' },
  { icoon: ICOON.halte, tekst: 'Sta stil: de passagiers stappen in en uit' },
  { icoon: I.klok, tekst: 'Niet te vroeg weg: wacht op de dienstregeling' },
  { icoon: ICOON.vertrek, tekst: 'Rij het rondje rustig, geen schokken' },
];

export const EARLY_OK = 12; // s: zo veel eerder dan de dienstregeling mag je vertrekken (sidejob_bus.js)
export const LATE_OK = 10;  // s: zo veel te laat telt nog als op tijd (sidejob_bus.js)
export const NABIJ = 40;    // m: vanaf hier wijst de strook op het remmen

// De tekst voor het schema: afwijking in seconden (positief is te laat).
export function schemaTekst(afwijking) {
  const s = Math.round(Math.abs(afwijking));
  if (afwijking > LATE_OK) return `${s} s te laat`;
  if (afwijking < -EARLY_OK) return `${s} s vroeg`;
  return 'Op tijd';
}

// g: { fase: 'rijden'|'halte'|'vertrek', halte (naam), gedaan (haltes gehaald), totaal, afwijking (s, + is te laat), comfort (0..100), afstand (m tot de halte), snelheid (m/s),
//      wacht (s tot vertrek, bij vertrek), deuren (s, bij halte), uitleg }
export function busHudModel(g) {
  if (!g || !g.fase) return null;
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const totaal = Math.max(1, g.totaal || 1), gedaan = Math.max(0, Math.min(totaal, g.gedaan || 0));
  const meter = { pct: (gedaan / totaal) * 100, naam: 'Haltes gehaald', label: `${gedaan} van ${totaal}`, staat: '' };
  const comfort = Math.max(0, Math.min(100, Number.isFinite(g.comfort) ? g.comfort : 100));
  const cijfers = [{ label: 'Schema', waarde: schemaTekst(g.afwijking || 0), icoon: I.klok, primair: true }, { label: 'Comfort', waarde: `${Math.round(comfort)}%`, icoon: I.punt }];
  return {
    id: 'bus', titel: 'Stadsbus lijn 3', icoon: ICOON.bus, plek: g.halte || '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'rijden' && gedaan === 0 ? UITLEG : [],
    nu: watNu(g), hulp: 'Stop bij de halte · O sluit de deuren', slecht: g.afwijking > LATE_OK || comfort < 50,
  };
}

export function watNu(g) {
  if (g.fase === 'vertrek') return g.wacht != null ? `Voor op schema: wacht nog ${Math.max(1, Math.ceil(g.wacht))} s` : 'Deuren dicht: rijden maar';
  if (g.fase === 'halte') return g.deuren != null ? `Deuren open: nog ${Math.max(1, Math.ceil(g.deuren))} s` : 'Passagiers stappen in en uit';
  if ((g.comfort ?? 100) < 50) return 'De passagiers klagen: rij rustiger';
  if (g.afwijking > LATE_OK) return `Je bent ${Math.round(g.afwijking)} s te laat: rij door`;
  if (g.afstand != null && g.afstand < NABIJ) return (g.snelheid || 0) > 0.8 ? `Rem af: stop bij ${g.halte}` : `Sta stil bij ${g.halte}`;
  return `Rij naar ${g.halte} (gele kolom)`;
}

// Wat opspringt bij een halte: op tijd of hoeveel te laat. Alleen op tijd klinkt.
export function haltePop(naam, afwijking) {
  return afwijking <= LATE_OK ? { tekst: `${naam}: op tijd`, geluid: 'ui_verzameld' } : { tekst: `${naam}: ${Math.round(afwijking)} s te laat`, geluid: null };
}
