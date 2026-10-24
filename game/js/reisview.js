// Travel beat views (#97): pure text and state for the briefing line, the choice
// panel, the HUD line while travelling and the messages. No DOM; reispanel.js
// draws them, hudbus.js (kind 'reis') decides when they may show.
import { travelOptions, RIDES } from './reiskeuze.js';
import { travelSeconds, classOf } from './reistijd.js';
import { wantsExplain } from './hudtext.js';

const km = (m) => (m < 10000 ? (m / 1000).toFixed(1).replace('.', ',') : String(Math.round(m / 1000)));
const mins = (s) => Math.max(1, Math.round(s / 60));

// "Naar Zoutkamp · 30 km · ± 23 min met de auto · ± 10 min met de bus"
export function briefingLine(beat) {
  const parts = [`Naar ${beat.to}`, `${km(beat.length)} km`, `± ${mins(travelSeconds(beat.length, beat.selfMode || 'auto'))} min met de auto`];
  const ride = RIDES[beat.ride];
  if (ride && beat.ride !== 'lift') parts.push(`± ${mins(travelSeconds(beat.length, ride.mode))} min ${ride.label.toLowerCase()}`);
  return parts.join(' · ');
}

// state for createChoicePanel().set(); `pick` is the highlighted option id
// seen (hudtext.js): the help line shows the first times only; the rule is the distance.
export const TRAVEL_HELP_ID = 'reis:help';
export function panelState(beat, pick, seen = {}) {
  const r = travelOptions(beat);
  const keys = { meerijden: '1', zelf: '2', overslaan: '3' };
  const options = r.options.map((o) => ({
    key: keys[o.id], label: `${o.label} · ${o.kosten} · ${o.eta}`, note: o.uitleg, badge: o.id === r.def ? 'aanbevolen' : '', cls: o.id === (pick || r.def) ? 'pick' : '',
  }));
  return {
    kicker: 'REIZEN',
    text: `Naar ${beat.to}`,
    rule: `${km(beat.length)} km`,
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
  return `${km(remaining)} km · ± ${mins(travelSeconds(remaining, mode))} min`;
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
