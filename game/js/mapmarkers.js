// Welk Phosphor-icoon bij welke marker hoort (22-11, #1009; ADR 0041, DS3): één tabel voor de kaart, de minikaart en de legenda.
// Node-safe, geen DOM. De waarden zijn betekenisnamen uit iconmap.js (ICON_MAP), nooit een bestandsnaam.
// Een badge (hud_panel.js flatSprite) tekent dit icoon vet in crème of inkt op de categoriekleur; wie hier niet in staat is een
// bewust eigen spelsymbool (EIGEN_SYMBOOL hieronder, met reden) en houdt zijn eigen tekening.
import { PH_SHOP, PH_JOB, PH_GLYPHS, PH_KIND } from './mapglyphs.js';

// De markers met een vaste soort-naam (geen voorvoegsel): diensten, plekken en de wereld.
const MARKER_ICOON = {
  hospital: 'ehbo', politiebureau: 'politie', garage: 'gereedschap', horeca: 'eten', flitspaal: 'camera', eierbalTip: 'ei', cash: 'geld',
  landmark: 'ster', uitkijkpunt: 'verrekijker', beppe: 'stoel', companion: 'speler',
  dorpKlaar: 'vlag', home: 'thuis', homeGarage: 'garage', homeMooring: 'anker', homeHelipad: 'helikopter',
};

// De bijbanen en activiteiten die mapglyphs.js nog geen Phosphor-naam gaf (22-11): de kaart tekende ze met een eigen getekend glyph.
const PH_JOB_EXTRA = {
  krantenwijk: 'krant', rondvaarttour: 'boot', lijn: 'bus', fietssoep: 'kookpot', taxinacht: 'taxi', balenrit: 'tractor', berging: 'auto', schoolrit: 'bus',
  melkrit: 'koe', veerdienst: 'boot', zeeschipwad: 'boot', zeeschipeems: 'boot', strandpost: 'tent', kermisdraai: 'reuzenrad', brugdienst: 'anker',
  vismarktkoerier: 'vis', studentenfeest: 'bier', marktkraam: 'mand', toeristengids: 'kaart', bietenoogst: 'gewas', boerderij: 'boerderij', snackoverlast: 'burger',
};
const PH_ACT_EXTRA = {
  'act-kermis': 'reuzenrad', 'act-hoogvlieger': 'parachute', 'act-drift': 'stuur', 'act-discgolf': 'golf', 'act-pitchputt': 'par', 'act-penalty': 'doel',
  'act-voetbal': 'rennen', 'act-skatepark': 'skate', 'act-zwembad': 'zwembad', 'act-carillon': 'bel', 'act-wandeling': 'wandeling', 'act-regatta': 'zeilboot',
  'act-ringrace': 'ronde', 'act-safehuis': 'sleutel', 'act-vluchtdienst': 'wereldbol', 'act-vaardienst': 'boot',
};

// De voorvoegsels waarvan de soort uit een eigen tabel komt (winkels, bijbanen, activiteiten, het Ommeland).
const PREFIX = [['shop-', (k) => PH_SHOP[k.slice(5)]], ['sj-', (k) => PH_JOB[k.slice(3)] || PH_JOB_EXTRA[k.slice(3)]]];

// De Phosphor-betekenisnaam van een marker, of null als de marker een eigen spelsymbool heeft (of nog geen icoon).
export function markerIcoon(kind) {
  if (MARKER_ICOON[kind]) return MARKER_ICOON[kind];
  if (PH_GLYPHS[kind]) return PH_GLYPHS[kind];
  if (PH_KIND[kind]) return PH_KIND[kind];
  if (PH_ACT_EXTRA[kind]) return PH_ACT_EXTRA[kind];
  for (const [voor, f] of PREFIX) if (kind.startsWith(voor)) return f(kind) || null;
  return null;
}

// De markers die BEWUST een eigen teken houden, met de reden. Dit zijn spelsymbolen met een betekenis die een iconenset niet draagt:
// de richting van de speler, de vorm per medespeler, de doelmarkeringen en de routes, of een vlak met letters.
export const EIGEN_SYMBOOL = {
  player: 'pijl die draait met je richting; een icoon kan niet draaien zonder te veranderen',
  partner: 'vorm en kleur per medespeler (kleurenblind: nooit alleen kleur), zestien vormen',
  userWaypoint: 'de paarse pin van je eigen doel: het ene teken dat altijd paars is en met zijn punt op de plek staat',
  missionIdle: 'de gele ring van een missie die wacht: een doelmarkering, geen plek',
  missionActive: 'de gele ring met stip van je actieve doel; pulseert 250 ms, stil bij Minder beweging',
  waypoint: 'het kleine gele punt van een verhaalstap',
  'police*': 'de blauwe politie-eenheid die beweegt (te voet, fiets, paard, auto); geen plek',
  'sj-target': 'het doel van een bijbaan: een doelmarkering in de kleur van het routedoel, geen plek',
  'sj-dot': 'de stip van een bijbaan onderweg: een doelmarkering, geen plek',
  own: 'je eigen voertuig in de kleur van je voertuig, met het voertuigtype als glyph',
  'perceel-*': 'een perceel is een vlak met een letter voor zijn stand (B, S, P, Z, G, O); de letter is het teken',
  'mi-* / ma-* / mm-*': 'missie- en doelmarkers: ringen, pijlen en nummers uit navtarget.js (GLYPH), al Phosphor waar een glyph past',
};

