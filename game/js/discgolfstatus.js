// De HUD-stand van discgolf (#985): puur, geen DOM en geen THREE (scripts/discgolfhud_test.mjs). Maakt uit de stand van de ronde het model voor de gedeelde strook
// (simhud.js): de stappen (richten, gooien, uitkomst), de laadmeter met het streepje voor de kracht die de mand haalt, de cijfers (baan, par, worp, afstand,
// wind) en één zin "wat nu". De regels van de worp staan in discgolfrules.js; dit bestand leest ze alleen.

// Icoonpaden voor de chips (24x24, lijn): richten (kruis), disc (ovaal), mand (ketting en schaal), vlag.
import { SIMICOON as I } from './simicoon.js';

export const ICOON = {
  richten: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  disc: '<ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M6 12.5c3 1.5 9 1.5 12 0"/>',
  mand: '<path d="M12 3v8"/><path d="M5 11h14l-2 9H7z"/><path d="M9 11l1 9M15 11l-1 9"/>',
  vlag: '<path d="M6 21V4"/><path d="M6 5h12l-2 4 2 4H6"/>',
};

export const STAPPEN = [
  { id: 'richten', label: 'Richten', icoon: ICOON.richten },
  { id: 'gooien', label: 'Gooien', icoon: ICOON.disc },
  { id: 'uitkomst', label: 'Uitkomst', icoon: ICOON.mand },
];

export const UITLEG_ID = 'discgolf';
export const UITLEG = [
  { icoon: ICOON.richten, tekst: 'A D richten, W S de hoek' },
  { icoon: ICOON.disc, tekst: 'Houd Spatie, laat los om te gooien' },
  { icoon: ICOON.mand, tekst: 'De gele kolom staat boven de mand' },
  { icoon: ICOON.vlag, tekst: 'Minder worpen dan par is goed' },
];

export const stapVan = (fase, laden) => (fase === 'flight' || (fase === 'aim' && laden) ? 'gooien' : fase === 'aim' ? 'richten' : 'uitkomst');

const meterTekst = (v) => `${Math.round(v * 100)}%`;

// g: { modus: 'ronde'|'ctp'|'kies', fase, laden (bool), baan, banen, par, worp, mand (m), wind (tekst), schijf, release, hoek (graden), lading (0..1), doel (0..1|null),
//      cirkel (bool), totaal (tekst), flash, slecht, kiesNaam, kiesNote, ctpWorp, ctpTotaal, afstanden (tekst), uitleg }
export function discgolfHudModel(g) {
  if (!g) return null;
  if (g.modus === 'kies') return { id: 'discgolf', titel: 'Discgolf', icoon: ICOON.disc, plek: g.kiesNaam || '', stappen: [], meter: null, cijfers: [], uitleg: g.uitleg ? UITLEG : [], nu: g.kiesNote || 'Kies een ronde', hulp: 'A D kiezen · Spatie beginnen · Backspace stopt', slecht: false };
  const idx = STAPPEN.findIndex((s) => s.id === stapVan(g.fase, g.laden));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const ctp = g.modus === 'ctp';
  const meter = g.fase === 'aim' ? { pct: Math.max(0, Math.min(100, (g.lading || 0) * 100)), naam: 'Kracht van de worp', label: g.doel ? `Doel ${meterTekst(g.doel)}` : 'Kracht', staat: '' } : null;
  // één primaire waarde (de afstand tot de mand), de rest secundair, elk met een pictogram; de baan staat in het chipje, het totaal springt op bij een baan
  const mand = { label: 'Mand', waarde: `${Math.round(g.mand)} m`, icoon: I.vlag, primair: true };
  const cijfers = ctp
    ? [mand, { label: 'Worp', waarde: `${g.ctpWorp}/${g.ctpTotaal}`, icoon: I.worp }, { label: 'Wind', waarde: g.wind, icoon: I.wind }]
    : [mand, { label: 'Worp', waarde: String(g.worp), icoon: I.worp }, { label: 'Par', waarde: String(g.par), icoon: I.par }, { label: 'Wind', waarde: g.wind, icoon: I.wind }];
  return {
    id: 'discgolf', titel: ctp ? 'Dichtst bij de mand' : 'Discgolf', icoon: ICOON.disc, plek: ctp ? (g.cirkel ? 'In de cirkel' : '') : `Baan ${g.baan}/${g.banen}${g.cirkel ? ' · in de cirkel' : ''}`, stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'aim' ? UITLEG : [],
    nu: watNu(g), hulp: [g.schijf, g.release, g.hoek != null ? `hoek ${Math.round(g.hoek)}°` : '', 'E release', 'F disc'].filter(Boolean).join(' · '), slecht: !!g.slecht,
  };
}

export function watNu(g) {
  if (g.flash) return g.flash;
  if (g.fase === 'wacht') return 'Alle banen af: wachten op de anderen';
  if (g.fase === 'flight') return 'De disc vliegt';
  if (g.fase === 'aim' && g.laden) return g.doel ? `Laat Spatie los rond ${meterTekst(g.doel)}` : 'Laat Spatie los om te gooien';
  if (g.fase === 'aim') return g.cirkel ? 'In de cirkel: zacht en vlak richting de mand' : 'Richt op de gele kolom en houd Spatie';
  return 'Volgende worp komt zo';
}

// Wat opspringt na een baan: de naam met het aantal worpen; onder par of op par klinkt een geluid, erboven niet.
export function baanPop(naam, worpen, par) {
  const goed = worpen <= par;
  return { tekst: `${naam}: ${worpen} worp${worpen === 1 ? '' : 'en'}`, geluid: worpen < par ? 'ui_loopbaan' : goed ? 'ui_verzameld' : null };
}
// Bij dichtst bij de mand: de afstand en de punten van die worp.
export function ctpPop(d, punten) {
  if (d == null) return { tekst: 'Plons: nul punten', geluid: null };
  return { tekst: d === 0 ? `In de mand! ${punten} punten` : `${d.toFixed(1).replace('.', ',')} m: ${punten} punten`, geluid: punten > 0 ? 'ui_verzameld' : null };
}
