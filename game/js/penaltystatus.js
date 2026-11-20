// De HUD-stand van de penaltyserie (#981): puur, geen DOM en geen THREE (scripts/penalty_test.mjs). Maakt uit de stand van de serie het model voor de gedeelde strook
// (simhud.js): de stappen (richten, schieten, uitkomst), de krachtmeter met het streepje voor de zuiverste kracht, het aantal doelpunten als ene primaire waarde,
// het schot en de gemiste kansen als cijfers, en één zin "wat nu". De regels staan in penaltyrules.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';
import { SCHOTEN, KRACHT_DOEL, UITKOMSTEN } from './penaltyrules.js';

export const ICOON = {
  richten: 'doel',
  schieten: 'worp',
  uitkomst: 'punt',
  score: 'plaats',
};

export const STAPPEN = [
  { id: 'richten', label: 'Richten', icoon: ICOON.richten },
  { id: 'schieten', label: 'Schieten', icoon: ICOON.schieten },
  { id: 'uitkomst', label: 'Uitkomst', icoon: ICOON.uitkomst },
];

export const UITLEG_ID = 'penalty';
export const UITLEG = [
  { icoon: ICOON.richten, tekst: '{A}{D} links en rechts, {W}{S} hoog en laag' },
  { icoon: ICOON.schieten, tekst: 'Houd {SPATIE}, laat los bij het streepje' },
  { icoon: ICOON.uitkomst, tekst: 'Naast, over of tegen de paal telt niet' },
  { icoon: ICOON.score, tekst: 'Vijf schoten: hoe meer doelpunten, hoe beter de medaille' },
];

export const stapVan = (fase, laden) => (fase === 'schot' || fase === 'uitkomst' ? 'uitkomst' : laden ? 'schieten' : 'richten');
const procent = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

// g: { fase ('intro'|'richten'|'schot'|'uitkomst'|'klaar'), laden (bool), lading (0..1), schot (1..5), goals, gemist, laatste (uitkomstsleutel of null), tekst, uitleg }
export function penaltyHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g.fase, g.laden));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const meter = g.fase === 'richten' ? { pct: Math.max(0, Math.min(100, (g.lading || 0) * 100)), naam: 'Kracht van het schot', label: `Doel ${procent(KRACHT_DOEL)}`, staat: (g.lading || 0) > KRACHT_DOEL + 0.1 ? 'laag' : '' } : null;
  const cijfers = [
    { label: 'Doelpunten', waarde: `${g.goals || 0} van ${SCHOTEN}`, icoon: ICOON.score, primair: true },
    { label: 'Schot', waarde: `${Math.min(SCHOTEN, g.schot || 1)} van ${SCHOTEN}`, icoon: I.ronde },
    { label: 'Gemist', waarde: String(g.gemist || 0), icoon: I.punt },
  ];
  const slecht = !!g.laatste && !(UITKOMSTEN[g.laatste] || {}).goed && g.fase === 'uitkomst';
  return {
    id: 'penalty', titel: 'Penaltyserie', icoon: ICOON.schieten, plek: 'Euroborg', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'richten' ? UITLEG : [],
    nu: watNu(g), hulp: '{A}{D}{W}{S} richten · {SPATIE} kracht · {BACKSPACE} stopt', slecht,
  };
}

export function watNu(g) {
  if (g.tekst) return g.tekst;
  if (g.fase === 'intro') return 'Leg de bal op de stip';
  if (g.fase === 'klaar') return 'De serie zit erop';
  if (g.fase === 'schot') return 'De bal is onderweg';
  if (g.fase === 'uitkomst') return (UITKOMSTEN[g.laatste] || {}).tekst || '';
  if (g.laden) return (g.lading || 0) > KRACHT_DOEL + 0.1 ? 'Te hard: laat los' : `Laat {SPATIE} los rond ${procent(KRACHT_DOEL)}`;
  return 'Richt in het doel en houd {SPATIE}';
}

// Wat opspringt na een schot: de uitkomst; een doelpunt met het geluid van iets gelukts, de rest klinkt niet.
export function schotPop(uitkomst, goals) {
  const u = UITKOMSTEN[uitkomst];
  if (!u) return null;
  return { tekst: u.goed ? `${u.tekst} ${goals} van ${SCHOTEN}` : u.tekst, geluid: u.goed ? (goals >= SCHOTEN ? 'ui_loopbaan' : 'ui_verzameld') : null };
}
