// Travel beat views (#97): pure text and state for the briefing line, the choice
// panel, the HUD line while travelling and the messages. No DOM; reispanel.js
// draws them, hudbus.js (kind 'reis') decides when they may show.
import { travelOptions, RIDES, selfReward } from './reiskeuze.js';
import { travelSeconds, classOf, duurTekst } from './reistijd.js';
import { wantsExplain } from './hudtext.js';

const km = (m0) => { const m = Number.isFinite(+m0) ? Math.max(0, +m0) : 0; return m < 10000 ? (m / 1000).toFixed(1).replace('.', ',') : String(Math.round(m / 1000)); };
// hoe je zelf gaat, in de woorden van de briefing (de trekker heet geen auto)
const SELF_WOORD = { auto: 'met de auto', trekker: 'met de trekker', fiets: 'met de fiets', lopen: 'lopend', boot: 'met de boot', bus: 'met de bus', trein: 'met de trein' };

// "Naar Zoutkamp · 30 km · ± 23 min met de auto · ± 10 min met de bus"
export function briefingLine(beat) {
  const parts = [`Naar ${beat.to}`, `${km(beat.length)} km`, `± ${duurTekst(travelSeconds(beat.length, beat.selfMode || 'auto'))} ${SELF_WOORD[beat.selfMode || 'auto'] || 'met de auto'}`];
  const ride = RIDES[beat.ride];
  if (ride && beat.ride !== 'lift') parts.push(`± ${duurTekst(travelSeconds(beat.length, ride.mode))} ${ride.label.toLowerCase()}`);
  return parts.join(' · ');
}

// state for createChoicePanel().set(); `pick` is the highlighted option id
// seen (hudtext.js): the help line shows the first times only; the rule is the distance.
export const TRAVEL_HELP_ID = 'reis:help';
export function panelState(beat, pick, seen = {}) {
  const r = travelOptions(beat);
  const keys = { meerijden: '1', zelf: '2', overslaan: '3' };
  // #1214: een getal per optie (de duur), "gratis" zeggen we niet bij elke regel; de winst staat alleen bij zelf gaan en alleen als die er is
  const lengte = Number.isFinite(+beat.length) ? +beat.length : 0;
  const options = r.options.map((o) => ({
    key: keys[o.id], label: [o.label, o.eta, o.id === 'zelf' && selfReward(lengte) > 0 ? `+ € ${selfReward(lengte)}` : ''].filter(Boolean).join(' · '), note: o.uitleg, badge: o.id === r.def ? 'aanbevolen' : '', cls: o.id === (pick || r.def) ? 'pick' : '',
  }));
  return {
    kicker: 'REIZEN',
    text: `Naar ${beat.to}`,
    rule: lengte > 0 ? `${km(lengte)} km` : '', // geen lengte bekend: geen regel in plaats van "0,0 km"
    options,
    help: wantsExplain(seen, TRAVEL_HELP_ID) ? 'Snel reizen kost tijd, zelf gaan niet' : '',
  };
}

// key (1/2/3) -> option id among the options the beat has
export function pickFromKey(beat, key) {
  const id = { 1: 'meerijden', 2: 'zelf', 3: 'overslaan' }[key];
  return travelOptions(beat).options.some((o) => o.id === id) ? id : null;
}

// gamepad: d-pad up/down moves the pick through the options the beat has
export function cyclePick(beat, pick, dir) {
  const ids = travelOptions(beat).options.map((o) => o.id);
  const i = Math.max(0, ids.indexOf(pick));
  return ids[(i + (dir < 0 ? -1 : 1) + ids.length) % ids.length];
}

// the HUD line while driving: remaining distance and ETA
export function hudLine(remaining, mode = 'auto') {
  if (!(remaining > 0)) return '';
  return `${km(remaining)} km · ± ${duurTekst(travelSeconds(remaining, mode))}`;
}

// should the travel prompt show? (the next step is a jump, or the player is a
// jump away from where the mission starts)
export function shouldPrompt(distanceToStart) {
  return classOf(distanceToStart).beat;
}

// message for hudbus kind 'reis'
export function arrivalMessage(beat) {
  return { kind: 'reis', text: `Aangekomen in ${beat.to}` };
}
