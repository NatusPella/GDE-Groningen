// De HUD-stand van padel (#985): puur, geen DOM en geen THREE (scripts/padelhud_test.mjs). Maakt uit de stand van het potje het model voor de gedeelde strook
// (simhud.js): de stappen (serveren, rally, punt), een meter voor de tijd om te serveren, de cijfers (games, punten, rally) en één zin "wat nu".
// De puntentelling staat in padelrules.js en het bord bovenin; dit bestand leest alleen.
import { SET_GAMES } from './padelrules.js';
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): bal met veer (serveren), twee bogen (rally), vinkje (punt), racket (uitleg).
export const ICOON = {
  serve: '<circle cx="12" cy="8" r="3"/><path d="M12 11v5M9 20h6"/>',
  rally: '<path d="M4 15c3-9 13-9 16 0"/><path d="M4 9c3 9 13 9 16 0"/>',
  punt: '<path d="M5 12l4 4 10-10"/>',
  racket: '<ellipse cx="10" cy="9" rx="5" ry="6"/><path d="M13.5 13.5L20 20"/>',
  ring: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};

export const STAPPEN = [
  { id: 'serve', label: 'Serveren', icoon: ICOON.serve },
  { id: 'rally', label: 'Rally', icoon: ICOON.rally },
  { id: 'punt', label: 'Punt', icoon: ICOON.punt },
];

export const UITLEG_ID = 'padel';
export const UITLEG = [
  { icoon: ICOON.rally, tekst: 'A D W S: loop naar de bal' },
  { icoon: ICOON.ring, tekst: 'Ring groen: de bal is binnen bereik' },
  { icoon: ICOON.racket, tekst: 'Spatie: sla de bal' },
  { icoon: ICOON.punt, tekst: `Eerst naar ${SET_GAMES} games wint` },
];

// Fase van het spel naar de stap: intro telt als serveren (je maakt je klaar).
export const stapVan = (fase) => (fase === 'rally' ? 'rally' : fase === 'point' || fase === 'outro' ? 'punt' : 'serve');
export const SERVE_TIJD = 6; // s: daarna slaat de maat of het spel de serve voor je (de eigen klok in padel.js)

// g: { fase, serveer (bool: jij serveert), phaseT (s), games: [jij, zij], punten: ['15','30'], rally, beste, winnaar (0|1|-1), flash, tijd (tekst), capped, gp, uitleg }
export function padelHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const wacht = g.fase === 'serve' && g.serveer ? Math.max(0, g.phaseT || 0) : null;
  const meter = wacht != null ? { pct: Math.min(100, (wacht / SERVE_TIJD) * 100), naam: 'Tijd om te serveren', label: `${Math.ceil(wacht)} s`, staat: wacht < 2 ? 'laag' : '' } : null;
  // één primaire waarde (de games), de rest secundair, elk met een pictogram
  const cijfers = [
    { label: 'Games', waarde: `${g.games[0]}-${g.games[1]}`, icoon: I.stand, primair: true },
    { label: 'Punt', waarde: `${g.punten[0]}-${g.punten[1]}`, icoon: I.punt },
    { label: 'Rally', waarde: String(g.rally || 0), icoon: I.rally },
  ];
  return {
    id: 'padel', titel: 'Padel', icoon: ICOON.racket, plek: g.capped ? 'Beslissend punt' : '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase !== 'rally' ? UITLEG : [],
    nu: watNu(g), hulp: 'A D W S lopen · Spatie slaat · Backspace geeft op', slecht: g.fase === 'point' && g.winnaar === 1,
  };
}

export function watNu(g) {
  if (g.fase === 'intro') return 'Maak je klaar: het potje begint zo';
  if (g.fase === 'serve') return g.serveer ? 'Jij serveert: druk Spatie' : 'Zij serveren: sta klaar';
  if (g.fase === 'point' || g.fase === 'outro') return g.winnaar === 0 ? 'Punt voor jullie' : 'Punt voor hen';
  if (g.gp) return 'Gouden punt: de volgende punt is de game';
  return g.inBereik ? 'Nu Spatie: de ring is groen' : 'Loop naar de bal tot de ring groen is';
}

// Wat opspringt: een punt van jullie, een lange rally of een game/set.
export function puntPop({ team, gameWon, over, rally, punten }) {
  if (team !== 0) return null;
  if (over) return { tekst: 'Set voor jullie!', geluid: 'ui_loopbaan' };
  if (gameWon) return { tekst: 'Game voor jullie!', geluid: 'ui_loopbaan' };
  if ((rally || 0) >= 6) return { tekst: `Punt na ${rally} slagen`, geluid: 'ui_verzameld' };
  return { tekst: `Punt: ${punten[0]}-${punten[1]}`, geluid: 'ui_verzameld' };
}
