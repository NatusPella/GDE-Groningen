// De actiebalk bij een klik op de kaart (#445). Puur: geen DOM, geen wereld.
// Precies drie hoofdacties met een icoon en een korte tekst: Zet waypoint,
// Reis erheen (met kosten en duur) en Info. Een waypoint dat er al staat wordt
// 'Haal weg'. Reizen is een eigen, uitgelegde stap: Snel reizen (kost tijd en
// geld) of Zelf gaan (een waypoint en zelf rijden), nooit allebei tegelijk.
import { UITLEG } from './reiskeuze.js';
import { WALK_V } from './ovopties.js';

export const ACTIE_IDS = ['waypoint', 'reis', 'info'];
// een klik zo dicht bij het waypoint telt als een klik op het waypoint zelf
export const WAYPOINT_NEAR_M = 30;
export const UITLEG_ID = 'kaart:uitleg';

// iconen (24 px raster), als pad voor een inline svg
export const ICONEN = {
  waypoint: 'M12 2a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z',
  haalweg: 'M5 5l14 14M19 5L5 19',
  reis: 'M3 15l2-6h14l2 6v3h-2.5a2 2 0 0 1-4 0h-5a2 2 0 0 1-4 0H3zm4-5.5L6 13h12l-1-3.5z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 4h2v2h-2zm0 4h2v6h-2z',
  verhaal: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zm3 3v2h8V7z',
};

export const GAST_REIS_MELDING = 'Reizen kan alleen in je eigen spel. Zet wel een waypoint en ga zelf.';

const mins = (s) => Math.max(1, Math.round(s / 60));
const euro = (n) => (n > 0 ? `€ ${n}` : 'gratis');

// De aanbevolen meerijden-optie, anders de snelste die je kunt betalen.
export function besteRit(opts) {
  const ritten = (opts || []).filter((o) => o.ride);
  return ritten.find((o) => o.aanbevolen) || ritten.filter((o) => o.afford).sort((a, b) => a.etaS - b.etaS)[0] || null;
}

// Zelf gaan: de duur van de rit zelf (rijden), anders een schatting op de afstand.
export function zelfSeconden(afstandM, opts) {
  const auto = (opts || []).find((o) => o.id === 'auto');
  if (auto && auto.etaS) return auto.etaS;
  return afstandM / (afstandM > 600 ? 12 : WALK_V);
}

// Staat het waypoint op de plek waar je klikte?
export function opWaypoint(waypoint, spot) {
  return !!(waypoint && spot && Math.hypot(waypoint.x - spot.x, waypoint.y - spot.y) < WAYPOINT_NEAR_M);
}

// spot: { x, y, name }, speler: { x, y }, waypoint: het huidige waypoint of null,
// opts: reisOpties()-uitvoer, fmt: afstandsopmaak (formatDistance), gast: speelt mee als gast
// (reizen verplaatst alleen je eigen figuur, de wereld is van wie het spel opende, #388).
// verhaal: de plek is het verhaaldoel (dan is de eerste actie terug naar het verhaal).
export function actieModel({ spot, speler, waypoint, opts = [], fmt = (m) => `${Math.round(m)} m`, gast = false, verhaal = false }) {
  const afstand = Math.hypot(spot.x - speler.x, spot.y - speler.y);
  const staat = opWaypoint(waypoint, spot);
  const rit = besteRit(opts);
  const zelfS = zelfSeconden(afstand, opts);
  const acties = [];
  if (staat) acties.push({ id: 'haalweg', icoon: ICONEN.haalweg, label: 'Haal weg', sub: 'Het waypoint verdwijnt van kaart en wereld' });
  else if (verhaal) acties.push({ id: 'story', icoon: ICONEN.verhaal, label: 'Volg het verhaal', sub: 'Je route volgt weer het verhaal' });
  else acties.push({ id: 'waypoint', icoon: ICONEN.waypoint, label: 'Zet waypoint', sub: waypoint ? 'Vervangt je huidige waypoint (er is er één)' : `Een lijn en ${fmt(afstand)} afstand` });
  const reis = { id: 'reis', icoon: ICONEN.reis, label: 'Reis erheen', sub: rit ? `${euro(rit.price)} · ${rit.eta || `± ${mins(rit.etaS)} min`}` : `Zelf gaan · ± ${mins(zelfS)} min` };
  if (gast) { reis.disabled = true; reis.reden = GAST_REIS_MELDING; reis.sub = 'Alleen in je eigen spel'; }
  acties.push(reis);
  acties.push({ id: 'info', icoon: ICONEN.info, label: 'Info', sub: `${fmt(afstand)} van je vandaan` });
  return { afstand, staat, acties, zelfS };
}

// De reiskeuze op de kaart: per keuze één zin, de kosten, de duur en de aanbevolen markering.
// Snel reizen heeft een rij per vervoerswijze; Zelf gaan is er altijd (gratis, met een waypoint).
export function reisKeuzes(opts, afstandM, { gast = false } = {}) {
  const rit = besteRit(opts);
  const rijen = [];
  for (const o of (opts || []).filter((x) => x.ride)) {
    rijen.push({
      id: o.id, soort: 'snel', label: `Snel reizen · ${o.label.toLowerCase()}`,
      uitleg: UITLEG.meerijden, kosten: euro(o.price), duur: o.eta || `± ${mins(o.etaS)} min`,
      aanbevolen: !!rit && rit.id === o.id, disabled: gast ? GAST_REIS_MELDING : (o.afford ? null : 'Te weinig geld'),
    });
  }
  rijen.push({
    id: 'zelf', soort: 'zelf', label: 'Zelf gaan',
    uitleg: 'Je zet een waypoint en rijdt of loopt zelf. Dat kan ook in Samen spelen.',
    kosten: 'gratis', duur: `± ${mins(zelfSeconden(afstandM, opts))} min`,
    aanbevolen: !rit, disabled: null,
  });
  return rijen;
}

// Wat Info laat zien: de plek in woorden en hoe lang je erover doet.
export function infoRegels({ spot, sub = '', afstand, fmt = (m) => `${Math.round(m)} m` }) {
  return [
    [spot.name, sub].filter(Boolean).join(' · '),
    `${fmt(afstand)} · lopen ± ${mins(afstand / WALK_V)} min · rijden ± ${mins(afstand / 12)} min`,
  ].filter(Boolean);
}

// Eerste keer bij de kaart: korte uitleg, te sluiten en terug te vinden bij Besturing, Hulp (helpoverview.js).
export const KAART_UITLEG = [
  'Klik op een plek of een icoon en kies: Zet waypoint, Reis erheen of Info.',
  'Er is één waypoint tegelijk. Klik er nog eens op, of kies Haal weg, om hem te wissen.',
  'Reis erheen is snel reizen: dat kost tijd en geld. Zelf gaan zet een waypoint en je rijdt of loopt zelf.',
];

