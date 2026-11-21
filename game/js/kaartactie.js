// De actiebalk bij een klik op de kaart (#445). Puur: geen DOM, geen wereld.
// Precies drie hoofdacties met een icoon en een korte tekst: Zet waypoint,
// Reis erheen (met kosten en duur) en Info. Een waypoint dat er al staat wordt
// 'Haal weg'. Zet waypoint is de enige 'zelf gaan'-route (een lijn op de kaart en een baken in de wereld);
// Reis erheen gaat alleen over HOE je reist: trein, bus, taxi, boot (21-11, docs/KAART-POPUPS-21-11.md).
import { MODE_LABEL, OV_MIN_M, WALK_V } from './ovopties.js';

export const ACTIE_IDS = ['waypoint', 'reis', 'info'];
// een klik zo dicht bij het waypoint telt als een klik op het waypoint zelf
export const WAYPOINT_NEAR_M = 30;
export const UITLEG_ID = 'kaart:uitleg';

// iconen (24 px raster), als pad voor een inline svg
// Betekenisnamen (icons.js, Phosphor, ADR 0041).
export const ICONEN = { waypoint: 'plek', haalweg: 'kruis', reis: 'auto', info: 'info', verhaal: 'verhaal' };

// De cijfertoets van een actie op de plekkaart (1 tot 3): een snelkeuze, in de knop zelf getoond. In de reispopup krijgt elke vervoersrij zijn cijfer (1 tot 9).
export const ACTIE_TOETSEN = Object.freeze({ waypoint: '1', haalweg: '1', story: '1', reis: '2', info: '3' });

export const GAST_REIS_MELDING = 'Reizen kan alleen in je eigen spel: je gaat niet mee naar de plek van wie het spel opende. Zet wel een waypoint en ga zelf.';
export const GAST_REIS_KORT = 'Alleen in je eigen spel';

// De vervoerswijzen van Reis erheen, in vaste volgorde. status 'actief': het spel kan dit echt (ovopties.js rekent de route, reisrit.js speelt de rit).
// status 'gepland': nog niet gebouwd (Bezit en de uitbreidingen staan in docs/KAART-POPUPS-21-11.md). Een gepland vervoer staat nooit in de lijst:
// het toevoegen is een regel hier, een route in reisOptiesVoor (reiskaart.js) en een scène in reisrit.js.
export const REIS_MODI = Object.freeze([
  { id: 'trein', icoon: 'trein', status: 'actief' },
  { id: 'bus', icoon: 'bus', status: 'actief' },
  { id: 'taxi', icoon: 'taxi', status: 'actief' },
  { id: 'boot', icoon: 'boot', status: 'actief' },
  { id: 'vlucht', icoon: 'vliegtuig', status: 'gepland' },
  { id: 'eigen', icoon: 'auto', status: 'gepland' },
  { id: 'fiets', icoon: 'fiets', status: 'gepland' },
]);

const mins = (s) => Math.max(1, Math.round(s / 60));
const euro = (n) => (n > 0 ? `€ ${n}` : 'gratis');

// De aanbevolen meerijden-optie, anders de snelste die je kunt betalen.
export function besteRit(opts) {
  const ritten = (opts || []).filter((o) => o.ride);
  return ritten.find((o) => o.aanbevolen) || ritten.filter((o) => o.afford).sort((a, b) => a.etaS - b.etaS)[0] || null;
}

// Staat het waypoint op de plek waar je klikte?
export function opWaypoint(waypoint, spot) {
  return !!(waypoint && spot && Math.hypot(waypoint.x - spot.x, waypoint.y - spot.y) < WAYPOINT_NEAR_M);
}

// De vijf-seconden-check (#445) als pure functie: wat doet een klik op deze plek?
// Een klik zet het waypoint; een tweede klik erop (of dichtbij) haalt hem weg;
// een klik elders vervangt hem, want er is er één tegelijk.
export function klikActie(waypoint, spot) {
  if (opWaypoint(waypoint, spot)) return 'weg';
  return waypoint ? 'vervang' : 'zet';
}

// spot: { x, y, name }, speler: { x, y }, waypoint: het huidige waypoint of null,
// opts: reisOptiesVoor()-uitvoer, fmt: afstandsopmaak (formatDistance), gast: speelt mee als gast
// (reizen verplaatst alleen je eigen figuur, de wereld is van wie het spel opende, #388).
// verhaal: de plek is het verhaaldoel (dan is de eerste actie terug naar het verhaal).
export function actieModel({ spot, speler, waypoint, opts = [], fmt = (m) => `${Math.round(m)} m`, gast = false, verhaal = false }) {
  const afstand = Math.hypot(spot.x - speler.x, spot.y - speler.y);
  const staat = opWaypoint(waypoint, spot);
  const rit = besteRit(opts);
  const acties = [];
  if (staat) acties.push({ id: 'haalweg', icoon: ICONEN.haalweg, label: 'Haal weg', sub: 'Het waypoint verdwijnt van kaart en wereld' });
  else if (verhaal) acties.push({ id: 'story', icoon: ICONEN.verhaal, label: 'Volg het verhaal', sub: 'Je route volgt weer het verhaal' });
  else acties.push({ id: 'waypoint', icoon: ICONEN.waypoint, label: 'Zet waypoint', sub: waypoint ? 'Vervangt je huidige waypoint (er is er één)' : `Een lijn en ${fmt(afstand)} afstand` });
  // geen betaalbaar vervoer: de plekkaart zegt waarom (de popup legt het per vervoerswijze uit), en Zet waypoint blijft de weg
  const geen = rit ? '' : (reisKeuzes(opts, afstand).map((r) => r.disabled).find(Boolean) || '');
  const reis = { id: 'reis', icoon: ICONEN.reis, label: 'Reis erheen', sub: rit ? `${euro(rit.price)} · ${rit.eta || `± ${mins(rit.etaS)} min`}` : (geen || 'Geen vervoer hierheen') };
  if (gast) { reis.disabled = true; reis.reden = GAST_REIS_MELDING; reis.sub = GAST_REIS_KORT; }
  acties.push(reis);
  acties.push({ id: 'info', icoon: ICONEN.info, label: 'Info', sub: `${fmt(afstand)} van je vandaan` });
  for (const a of acties) a.toets = ACTIE_TOETSEN[a.id];
  return { afstand, staat, acties };
}

// Waarom een vervoerswijze er niet is (er is geen route): te dichtbij, of geen verbinding van hier naar daar.
export function geenRoute(id, afstandM) {
  if (afstandM < OV_MIN_M) return 'Te dichtbij: loop of rij zelf';
  return { trein: 'Geen treinverbinding hierheen', bus: 'Geen buslijn hierheen', boot: 'Geen vaarroute hierheen' }[id] || 'Niet beschikbaar';
}

// Per vervoerswijze één zin: wat je krijgt, met de lijnen en overstappen erachter als de route die heeft.
function ritUitleg(o) {
  const wat = {
    trein: 'Van station naar station, met lopen erbij.',
    bus: 'Lopen naar de halte en met de bus naar de halte bij je doel.',
    taxi: 'Hij komt naar je toe en zet je af bij het doel.',
    boot: 'Over het water, van steiger naar steiger.',
  }[o.id] || 'Je zit er zo: de tijd loopt gewoon door.';
  const lijnen = [...new Set((o.lines || []).map((l) => l.name).filter(Boolean))].join(' + ');
  const over = o.transfers ? (o.transfers === 1 ? '1 overstap' : `${o.transfers} overstappen`) : '';
  const extra = [lijnen, over].filter(Boolean).join(' · ');
  return extra ? `${wat} ${extra}.` : wat;
}

// De reiskeuze: een rij per ACTIEF vervoer (trein, bus, taxi, boot), met een zin, de kosten, de duur, aanbevolen en, als het niet kan, de reden.
// Beschikbaar eerst (aanbevolen bovenaan, dan de snelste), daarna wat te duur of geblokkeerd is, daarna wat er niet is, elk in vaste volgorde.
// Zelf gaan is geen rij: dat is Zet waypoint. Een gast ziet dezelfde rijen, uitgeschakeld. De cijfertoets (1 tot 9) volgt de volgorde van de rijen.
export function reisKeuzes(opts, afstandM, { gast = false } = {}) {
  const rit = besteRit(opts);
  const lijst = REIS_MODI.filter((m) => m.status === 'actief').map((m, i) => {
    const o = (opts || []).find((x) => x.id === m.id && x.ride);
    const basis = { id: m.id, icoon: m.icoon, label: MODE_LABEL[m.id] || m.id, order: i };
    if (!o) return { ...basis, uitleg: '', kosten: '', duur: '', etaS: 0, aanbevolen: false, beschikbaar: false, disabled: gast ? GAST_REIS_KORT : geenRoute(m.id, afstandM), geenRoute: true };
    const reden = gast ? GAST_REIS_KORT : (o.afford ? null : (o.blokkade || 'Te weinig geld'));
    return { ...basis, uitleg: ritUitleg(o), kosten: euro(o.price), duur: o.eta || `± ${mins(o.etaS)} min`, etaS: o.etaS, aanbevolen: !gast && !!rit && rit.id === o.id, beschikbaar: !reden, disabled: reden, geenRoute: false };
  });
  const rang = (r) => (r.beschikbaar ? (r.aanbevolen ? 0 : 1) : r.geenRoute ? 3 : 2);
  lijst.sort((p, q) => rang(p) - rang(q) || p.etaS - q.etaS || p.order - q.order);
  return lijst.map((r, i) => ({ ...r, toets: i < 9 ? String(i + 1) : '' }));
}

// Wat Info laat zien: de plek in woorden en hoe lang je erover doet.
export function infoRegels({ spot, sub = '', afstand, fmt = (m) => `${Math.round(m)} m` }) {
  return [
    [spot.name, sub].filter(Boolean).join(' · '),
    `${fmt(afstand)} · lopen ± ${mins(afstand / WALK_V)} min · rijden ± ${mins(afstand / 12)} min`,
  ].filter(Boolean);
}

// Eerste keer bij de kaart: korte uitleg, te sluiten en terug te vinden met de Hulp-knop op de kaart (21-11) en bij Besturing, Hulp (helpoverview.js).
export const KAART_UITLEG = [
  'Klik op een plek of een icoon en kies: Zet waypoint, Reis erheen of Info.',
  'Er is één waypoint tegelijk. Klik er nog eens op, of kies Haal weg, om hem te wissen.',
  'Reis erheen laat je met de trein, de bus, de taxi of de boot reizen: dat kost tijd en geld. Zet waypoint is zelf gaan: een lijn op de kaart en een baken in de wereld.',
  'De legenda achter Lagen legt elk icoon en elke lijn uit; zet lagen daar aan of uit.',
  'Op de minikaart staat het doel dat je volgt als rond icoon tegen de rand, met de afstand erbij: geel is de route van het verhaal, paars is jouw eigen doel. Een klein rond icoon wacht even.',
];
// Alleen voor een gast in Samen spelen: waypoint kan, reizen niet.
export const GAST_UITLEG = 'In Samen spelen kun je wel een waypoint zetten en zelf gaan, maar niet reizen met trein, bus, taxi of boot: dat kan alleen in je eigen spel.';

// De legenda bovenaan het luik Lagen (#445): wat een klik doet, en dat er één
// waypoint met een lijn en de afstand is. Een gast leest erbij wat wel kan.
export const LEGENDA_UITLEG = [
  'Klik op een icoon of een plek: Zet waypoint, Reis erheen (met kosten en duur) of Info.',
  'Eén waypoint tegelijk, met een lijn en de afstand; nog een klik erop haalt hem weg.',
];
export const GAST_LEGENDA = 'Als gast kun je een waypoint zetten en zelf gaan; reizen met trein, bus, taxi of boot kan alleen in je eigen spel.';
export function legendaRegels({ gast = false } = {}) {
  return gast ? [...LEGENDA_UITLEG, GAST_LEGENDA] : LEGENDA_UITLEG.slice();
}

// De hint bij je eigen plek op de kaart (#445), en de kaart als je op jezelf klikt.
export const HIER_TITEL = 'Je staat hier';
export const HIER_HINT = 'Kies een andere plek of een icoon om een waypoint te zetten of te reizen.';
