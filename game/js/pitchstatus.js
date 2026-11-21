// De HUD-stand van pitch & putt (#985): puur, geen DOM en geen THREE (scripts/pitchhud_test.mjs). Maakt uit de stand van de ronde het model voor de gedeelde strook
// (simhud.js): de stappen (richten, slaan, uitkomst), de krachtmeter met het streepje voor de kracht die de vlag haalt, de cijfers (baan, par, slag, afstand, club,
// ondergrond, totaal) en één zin "wat nu" (op de green de helling). Alleen voor één speler op dit scherm; met meer spelers houdt het bord de scoretabel.

// Icoonpaden voor de chips (24x24, lijn): richten (kruis), golfbal met slag (bal), vlag bij de hole, vlag.
import { SIMICOON as I } from './simicoon.js';

const ICOON = {
  richten: 'doel',
  bal: 'golf',
  vlag: 'vlag',
};

export const STAPPEN = [
  { id: 'richten', label: 'Richten', icoon: ICOON.richten },
  { id: 'slaan', label: 'Slaan', icoon: ICOON.bal },
  { id: 'uitkomst', label: 'Uitkomst', icoon: ICOON.vlag },
];

export const UITLEG_ID = 'pitchputt';
export const UITLEG = [
  { icoon: ICOON.richten, tekst: '{A}{D} richten, {SHIFT} voor fijn' },
  { icoon: ICOON.bal, tekst: 'Houd {SPATIE}, laat los om te slaan' },
  { icoon: ICOON.vlag, tekst: 'De gele kolom staat boven de vlag' },
  { icoon: ICOON.vlag, tekst: 'Op de green: let op de helling' },
];

export const stapVan = (fase, laden) => (fase === 'ball' || (fase === 'aim' && laden) ? 'slaan' : fase === 'aim' ? 'richten' : 'uitkomst');
const procent = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

// g: { fase, laden, putten (bool), baan, banen, par, slag, vlag (m), club, zand (bool), lading (0..1), doel (0..1), totaal (tekst), flash, slecht, helling (tekst), uitleg }
export function pitchHudModel(g) {
  if (!g) return null;
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g.fase, g.laden));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const meter = g.fase === 'aim' ? { pct: Math.max(0, Math.min(100, (g.lading || 0) * 100)), naam: 'Kracht van de slag', label: `Doel ${procent(g.doel || 0)}`, staat: (g.lading || 0) > (g.doel || 0) + 0.12 ? 'laag' : '' } : null;
  // één primaire waarde (de afstand tot de vlag), de rest secundair, elk met een pictogram; baan en club staan in het chipje
  const cijfers = [
    { label: 'Vlag', waarde: `${g.vlag < 10 ? g.vlag.toFixed(1).replace('.', ',') : Math.round(g.vlag)} m`, icoon: I.vlag, primair: true },
    { label: 'Slag', waarde: String(g.slag), icoon: I.worp }, { label: 'Par', waarde: String(g.par), icoon: I.par },
  ];
  return {
    id: 'pitchputt', titel: g.putten ? 'Putten' : 'Pitch & putt', icoon: ICOON.bal, plek: `Baan ${g.baan}/${g.banen} · ${g.zand ? 'zand' : g.club}`, stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'aim' ? UITLEG : [],
    nu: watNu(g), hulp: '{A}{D} richten · {SPATIE} kracht · {BACKSPACE} stopt', slecht: !!g.slecht,
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.fase === 'wacht') return 'Alle banen af: wachten op de anderen';
  if (g.fase === 'ball') return 'De bal rolt';
  if (g.fase === 'aim' && g.laden) return (g.lading || 0) > (g.doel || 0) + 0.12 ? 'Te hard: laat los' : `Laat {SPATIE} los rond ${procent(g.doel || 0)}`;
  if (g.fase === 'aim') return g.putten ? (g.helling || 'Richt op de vlag') : g.zand ? 'Uit het zand: meer spreiding' : 'Mik op de gele kolom en houd {SPATIE}';
  return 'Volgende slag komt zo';
}

// Wat opspringt na een baan: de naam met het aantal slagen; onder par of op par klinkt een geluid, erboven niet.
export function baanPop(naam, slagen, par) {
  return { tekst: `${naam}: ${slagen} slag${slagen === 1 ? '' : 'en'}`, geluid: slagen < par ? 'ui_loopbaan' : slagen === par ? 'ui_verzameld' : null };
}
