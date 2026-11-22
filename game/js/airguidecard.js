// De routekaart in de lucht (vliegtuig, helikopter, duif, luchtballon; #1038, eigenaar 22-11): één kaart met
//   regel 1 = de PLAATS waar je heen vliegt (nooit de voorwaarde of titel van een missie),
//   regel 2 = de handeling ("Draai om · achter je · Stijg naar 75 m"), rechts afstand en tijd,
//   en een pijl die meedraait met je koers (bij een bocht van meer dan AIR_UTURN_DEG een omdraai-icoon).
// Pure logica bovenop airguide.js, zonder DOM en zonder THREE: scripts/airguidecard_test.mjs.
// Samen spelen: de gids is lokaal per speler; elke speler ziet zijn eigen kaart.
import { airGuide, AIR_STRAIGHT_DEG } from './airguide.js';

// Vanaf deze afwijking (graden) is het geen bocht meer maar "Draai om".
export const AIR_UTURN_DEG = 120;
// Tot deze afwijking houd je alleen "links/rechts aan" in plaats van een bocht te nemen.
export const AIR_KEEP_DEG = 35;
// Titel van de kaart: hooguit zoveel tekens (tekstdieet), daarna een weglatingsteken.
export const AIR_TITLE_MAX = 30;
// Een landingsplek binnen zoveel meter van het doel geeft het doel zijn naam.
export const AIR_MATCH_RADIUS_M = 80;

export function cutTitle(s, max = AIR_TITLE_MAX) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

// De naam van de plek waar je heen vliegt. target: { x, y, name, kind, plek? }; ctx: { pads: [{ x, y, name }],
// placeAt: (x, y) => { place, near } }. De naam van een missie ('mission', 'job') is een titel of voorwaarde en geen plek:
// die komt hier nooit uit, tenzij de aanroeper zegt dat het een echte plek is (target.plek, bijv. een landingsplek of ring).
export function airDestName(target, ctx = {}) {
  if (!target) return 'Je doel';
  const name = String(target.name || '').trim();
  if (target.plek && name) return name;
  const pads = Array.isArray(ctx.pads) ? ctx.pads : [];
  let best = null, bd = AIR_MATCH_RADIUS_M;
  for (const l of pads) {
    const d = Math.hypot(l.x - target.x, l.y - target.y);
    if (d <= bd) { bd = d; best = l; }
  }
  if (best) return best.name || 'Landingsplek';
  if (name && target.kind !== 'mission' && target.kind !== 'job') return name;
  const at = typeof ctx.placeAt === 'function' ? ctx.placeAt(target.x, target.y) : null;
  if (at && at.place) return at.near ? `Bij ${at.place}` : at.place;
  return 'Je doel';
}

// De handeling bij een afwijking van relDeg graden (plus = rechts): één werkwoordstijl, de gebiedende wijs.
export function airAction(relDeg) {
  const abs = Math.abs(relDeg);
  if (abs <= AIR_STRAIGHT_DEG) return 'Houd koers';
  if (abs < AIR_KEEP_DEG) return relDeg > 0 ? 'Rechts aanhouden' : 'Links aanhouden';
  if (abs >= AIR_UTURN_DEG) return 'Draai om';
  return relDeg > 0 ? 'Draai naar rechts' : 'Draai naar links';
}

// Pijl: draait mee met de afwijking (0 = recht vooruit, plus = rechts), of een omdraai-icoon bij een U-bocht.
export function airArrow(relDeg) {
  const uturn = Math.abs(relDeg) >= AIR_UTURN_DEG;
  return { uturn, icon: uturn ? 'omdraaien' : 'pijl_omhoog', deg: uturn ? 0 : relDeg };
}

// De hele kaart. me: { x, y, z, angle, speed }; opts: { alt, need, pads, placeAt }.
// Geeft { title, sub, action, uturn, icon, deg, dist, etaS, key }; key verandert als de handeling of het doel wisselt.
export function airCard(me, target, opts = {}) {
  const g = airGuide(me, target, opts);
  const title = cutTitle(airDestName(target, opts));
  const action = airAction(g.relDeg);
  const arrow = airArrow(g.relDeg);
  const sub = [action, arrow.uturn ? 'achter je' : '', g.altAdvice].filter(Boolean).join(' · ');
  return { title, sub, action, uturn: arrow.uturn, icon: arrow.icon, deg: arrow.deg, dist: g.dist, etaS: g.etaS, key: `${title}|${action}` };
}
