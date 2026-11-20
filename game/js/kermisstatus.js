// De HUD-stand van de botsauto's op de kermis (#985): puur, geen DOM en geen THREE (scripts/kermishud_test.mjs). Maakt uit de stand van het ritje het model voor de
// gedeelde strook (simhud.js): de stappen (bel, botsen, afstappen), een meter met de tijd van het ritje, je punten groot met je reeks en de tijd die je nog hebt, elk met
// een pictogram, en één zin "wat nu". De regels van de botsingen staan in kermis.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): bel, botsauto (auto met paal), afstappen (deur).
export const ICOON = {
  bel: '<path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z"/><path d="M10 20h4"/>',
  auto: '<path d="M4 17v-4l2-3h12l2 3v4z"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/><path d="M12 10V4"/>',
  uit: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>',
  reeks: '<path d="M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"/><path d="M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"/>',
};

export const STAPPEN = [
  { id: 'intro', label: 'Bel', icoon: ICOON.bel },
  { id: 'ride', label: 'Botsen', icoon: ICOON.auto },
  { id: 'outro', label: 'Afstappen', icoon: ICOON.uit },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot je voor het eerst een auto raakt (dit apparaat).
export const UITLEG_ID = 'botsauto';
export const UITLEG = [
  { icoon: ICOON.auto, tekst: 'W gas, S achteruit, A en D sturen' },
  { icoon: ICOON.bel, tekst: 'Bots de auto in de gele kolom' },
  { icoon: ICOON.reeks, tekst: 'In de flank of van achteren geeft meer punten' },
  { icoon: ICOON.uit, tekst: 'Backspace: uitstappen' },
];

export const REEKS_TIJD = 2.2; // s: binnen zo lang na een botsing telt de volgende bij je reeks (kermis.js)

const tijdTekst = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// g: { fase ('intro'|'ride'|'outro'), links (s), duur (s), score, reeks, flash, slecht, uitleg }
export function kermisHudModel(g) {
  if (!g) return null;
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const links = Math.max(0, Math.ceil(g.links || 0));
  const meter = { pct: Math.max(0, Math.min(100, ((g.links || 0) / (g.duur || 1)) * 100)), naam: 'Tijd van het ritje', label: tijdTekst(links), staat: g.fase === 'ride' && links <= 10 ? 'laag' : '' };
  const cijfers = [{ label: 'Punten', waarde: String(g.score || 0), icoon: I.plaats, primair: true }];
  if ((g.reeks || 0) > 1) cijfers.push({ label: 'Reeks', waarde: String(g.reeks), icoon: ICOON.reeks });
  return {
    id: 'botsauto', titel: 'Botsauto’s', icoon: ICOON.auto, plek: '', stappen, meter, cijfers, uitleg: g.uitleg ? UITLEG : [],
    nu: watNu(g), hulp: 'W S gas · A D sturen · Backspace uitstappen', slecht: !!g.slecht,
  };
}

export function watNu(g) {
  if (g.fase === 'intro') return 'Wacht op de bel';
  if (g.fase === 'outro') return 'Afstappen!';
  if ((g.reeks || 0) > 1) return `Reeks ${g.reeks}: bots door voor meer punten`;
  return 'Bots de auto met de gele kolom: in de flank of van achteren';
}

// Wat opspringt: de punten van een botsing met waar je hem raakte (en je reeks).
export function botsPop(flank, pts, reeks) {
  const waar = flank === 'flank' ? 'In de flank' : flank === 'kont' ? 'Van achteren' : 'Kop op kop';
  return { tekst: `${waar}! +${pts}${reeks > 1 ? ` · reeks ${reeks}` : ''}`, geluid: flank === 'kop' ? null : 'ui_verzameld' };
}
