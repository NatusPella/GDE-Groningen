// De HUD-stand van de rondvaartgids (#985): puur, geen DOM en geen THREE (scripts/rondvaarthud_test.mjs). Maakt uit de stand van een tocht het model voor de gedeelde
// strook (simhud.js): de stappen (instappen, varen, aanleggen), een balk voor het verhaal dat je vertelt of de verhalen van deze tocht, de tevredenheid van de toeristen,
// je tempo en één zin wat nu. De regels (drempels, beoordeling) staan in sidejob_rondvaart.js; dit bestand leest ze alleen.

import { IC } from './simicons.js';

// Icoonpaden voor de chips (24x24, lijn): steiger (paal met plank), boot, anker, vinkje.
export const ICOON = {
  steiger: '<path d="M3 17h18"/><path d="M6 17v3M12 17v3M18 17v3"/><path d="M8 17V8h8v9"/>',
  boot: '<path d="M3 14h18l-3 5H6z"/><path d="M12 14V4l5 6h-5"/>',
  anker: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 14c0 3 3 6 7 6s7-3 7-6"/><path d="M8 10h8"/>',
  klaar: '<path d="M5 12l4 4 10-10"/>',
};

export const STAPPEN = [
  { id: 'instappen', label: 'Instappen', icoon: ICOON.steiger },
  { id: 'varen', label: 'Varen', icoon: ICOON.boot },
  { id: 'aanleggen', label: 'Aanleggen', icoon: ICOON.anker },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot de toeristen voor het eerst aan boord zijn (dit apparaat).
export const UITLEG_ID = 'rondvaart';
export const UITLEG = [
  { icoon: ICOON.steiger, tekst: 'Leg even stil bij de steiger' },
  { icoon: ICOON.boot, tekst: 'Vaar naar de gele kolom' },
  { icoon: ICOON.klaar, tekst: 'Gas eraf bij een bezienswaardigheid' },
  { icoon: ICOON.anker, tekst: 'Aan het eind stilliggen bij de steiger' },
];

export const SLOW = 3.6; // m/s: sneller dan dit horen de toeristen het verhaal niet (zelfde drempel als sidejob_rondvaart.js)

// g: { fase: 'instappen'|'varen'|'aanleggen', steiger, naar, verhalen, verhalenTotaal, tevreden (0..100), snelheid (m/s), tijd (s of null), doelNaam, doelAfstand (m),
//      bijBezienswaardigheid (bool), praat (0..1), instap (0..1), uitleg: bool }
export function rondvaartHudModel(g) {
  if (!g || !g.fase) return null;
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const klem = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  const totaal = Math.max(0, g.verhalenTotaal || 0), gedaan = Math.min(totaal, Math.max(0, g.verhalen || 0));
  let meter = null;
  if (g.fase === 'instappen') meter = { pct: klem(g.instap) * 100, naam: 'Toeristen stappen in', label: `${Math.round(klem(g.instap) * 100)}%` };
  else if (g.fase === 'varen' && g.praat > 0) meter = { pct: klem(g.praat) * 100, naam: 'Verhaal dat je vertelt', label: `verhaal ${Math.round(klem(g.praat) * 100)}%` };
  else if (g.fase === 'varen' && totaal) meter = { pct: (gedaan / totaal) * 100, naam: 'Verhalen verteld', label: `${gedaan} van ${totaal} verhalen` };
  const tevreden = Math.max(0, Math.min(100, Math.round(g.tevreden == null ? 100 : g.tevreden)));
  const primair = { icoon: IC.verhaal, waarde: `${gedaan}/${totaal}`, naam: 'verhalen verteld' };
  const cijfers = [{ icoon: IC.hart, label: 'Tevredenheid toeristen', waarde: `${tevreden}%`, staat: tevreden >= 80 ? 'goed' : tevreden >= 60 ? 'let-op' : 'actie' }];
  if (g.tijd != null) cijfers.push({ icoon: IC.klok, label: 'Tijd over', waarde: `${Math.max(0, Math.ceil(g.tijd))} s`, staat: g.tijd < 20 ? 'let-op' : '' });
  return {
    id: 'rondvaart', titel: 'Rondvaartgids', icoon: ICOON.boot, plek: g.fase === 'instappen' ? (g.steiger || '') : (g.naar || ''), stappen, primair, meter, cijfers, uitleg: g.uitleg ? UITLEG : [],
    nu: watNu(g), hulp: 'Gas eraf bij een bezienswaardigheid · stoten maakt de toeristen minder tevreden', slecht: tevreden < 60 || (g.fase === 'varen' && !!g.bijBezienswaardigheid && (g.snelheid || 0) >= SLOW),
  };
}

export function watNu(g) {
  if (g.fase === 'instappen') return `Leg even stil bij ${g.steiger || 'de steiger'}: de toeristen stappen in`;
  if (g.fase === 'aanleggen') return `Naar ${g.naar || 'de steiger'}: leg stil bij de steiger`;
  if (g.bijBezienswaardigheid) return (g.snelheid || 0) >= SLOW ? `Gas eraf bij ${g.doelNaam}: ze willen het verhaal horen` : `Je vertelt over ${g.doelNaam}`;
  const afstand = g.doelAfstand == null ? '' : ` (${Math.round(g.doelAfstand)} m)`;
  return `Vaar naar ${g.doelNaam || 'de volgende bezienswaardigheid'}${afstand}, rustig aan`;
}

// Wat opspringt: een verhaal dat af is, een gemist verhaal en het einde van de tocht.
export function verhaalPop(naam) { return { tekst: `Verhaal verteld: ${naam}`, geluid: 'ui_verzameld' }; }
export function gemistPop(naam) { return { tekst: `Gemist: ${naam}`, geluid: null }; }
export function tochtPop(alles, verhalen, totaal) { return { tekst: alles ? 'Applaus aan boord!' : `Tocht klaar · ${verhalen} van ${totaal} verhalen`, geluid: alles ? 'ui_verzameld' : 'ui_loopbaan' }; }
