// Travel beat views (#97): pure text and state for the briefing line, the choice
// panel, the HUD line while travelling and the messages. No DOM; reispanel.js
// draws them, hudbus.js (kind 'reis') decides when they may show.
import { travelOptions, RIDES } from './reiskeuze.js';
import { travelSeconds, classOf } from './reistijd.js';

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
export function panelState(beat, pick) {
  const r = travelOptions(beat);
  const keys = { meerijden: '1', zelf: '2', overslaan: '3' };
  const options = r.options.map((o) => ({
    key: keys[o.id], label: `${o.label} (${o.eta})`, cls: o.id === (pick || r.def) ? 'pick' : '',
  }));
  return {
    kicker: 'REIZEN',
    text: `Naar ${beat.to}`,
    rule: briefingLine(beat),
    options,
    help: r.required ? 'Kies hoe je gaat' : 'Kies hoe je gaat, of rij gewoon zelf',
  };
}

// key (1/2/3) -> option id among the options the beat has
export function pickFromKey(beat, key) {
  const id = { 1: 'meerijden', 2: 'zelf', 3: 'overslaan' }[key];
  return travelOptions(beat).options.some((o) => o.id === id) ? id : null;
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
