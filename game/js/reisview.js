// Travel beat views (#97): pure text and state for the briefing line, the choice
// panel, the HUD line while travelling and the messages. No DOM; reispanel.js
// draws them, hudbus.js (kind 'reis') decides when they may show.
import { travelOptions, RIDES, selfReward } from './reiskeuze.js';
import { travelSeconds, classOf, duurTekst } from './reistijd.js';
import { wantsExplain } from './hudtext.js';

// Een ontbrekende of ongeldige afstand geeft een lege tekst, nooit 'NaN km' (#1214).
const heeftAfstand = (m) => Number.isFinite(+m) && +m > 0;
const km = (m0) => { if (!heeftAfstand(m0)) return ''; const m = +m0; return m < 10000 ? (m / 1000).toFixed(1).replace('.', ',') : String(Math.round(m / 1000)); };
// hoe je zelf gaat, in de woorden van de briefing (de trekker heet geen auto)
const SELF_WOORD = { auto: 'met de auto', trekker: 'met de trekker', fiets: 'met de fiets', lopen: 'lopend', boot: 'met de boot', bus: 'met de bus', trein: 'met de trein' };

// "Naar Zoutkamp · 30 km · ± 23 min met de auto · ± 10 min met de bus"
export function briefingLine(beat) {
  const parts = [`Naar ${beat.to}`];
  if (heeftAfstand(beat.length)) parts.push(`${km(beat.length)} km`, `± ${duurTekst(travelSeconds(beat.length, beat.selfMode || 'auto'))} ${SELF_WOORD[beat.selfMode || 'auto'] || 'met de auto'}`);
  const ride = RIDES[beat.ride];
  if (heeftAfstand(beat.length) && ride && beat.ride !== 'lift') parts.push(`± ${duurTekst(travelSeconds(beat.length, ride.mode))} ${ride.label.toLowerCase()}`);
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
  const bekend = heeftAfstand(lengte);
  const options = r.options.map((o) => ({
    key: keys[o.id], label: [o.label, bekend ? o.eta : '', o.id === 'zelf' && bekend && selfReward(lengte) > 0 ? `+ € ${selfReward(lengte)}` : ''].filter(Boolean).join(' · '), note: o.uitleg, badge: o.id === r.def ? 'aanbevolen' : '', cls: o.id === (pick || r.def) ? 'pick' : '',
  }));
  return {
    kicker: 'REIZEN',
    text: `Naar ${beat.to}`,
    rule: bekend ? `${km(lengte)} km` : '', // geen lengte bekend: geen regel in plaats van "0,0 km"
    options,
    help: wantsExplain(seen, TRAVEL_HELP_ID) ? 'De klok loopt altijd door' : '',
  };
}

// #1216 (hertest 24-11): de reisvraag tekent dezelfde reiskaart als Reis erheen op de grote kaart (kaartactieui.js reisKaartHtml): kop, rijen
// met icoon, uitleg, duur en cijfertoets, en onderaan de knop met Enter erin. Dit is het model daarvoor; puur (scripts/reisview_test.mjs).
const RIT_ICOON = { trein: 'trein', bus: 'bus', boot: 'boot', heli: 'vliegtuig', lift: 'auto' };
const ZELF_ICOON = { auto: 'auto', trekker: 'auto', fiets: 'fiets', lopen: 'lopen', boot: 'boot', bus: 'bus', trein: 'trein' };
export function reisKaartModel(beat, pick, seen = {}) {
  const r = travelOptions(beat);
  const keys = { meerijden: '1', zelf: '2', overslaan: '3' };
  const lengte = Number.isFinite(+beat.length) ? +beat.length : 0;
  const bekend = heeftAfstand(lengte);
  const gekozen = pick || r.def;
  const icoonVan = (o) => (o.id === 'meerijden' ? RIT_ICOON[beat.ride] || 'auto' : o.id === 'zelf' ? ZELF_ICOON[beat.selfMode || 'auto'] || 'auto' : 'volgende');
  const rijen = r.options.map((o) => ({
    id: o.id, icoon: icoonVan(o), label: o.label, uitleg: o.uitleg,
    kosten: o.id === 'zelf' && bekend && selfReward(lengte) > 0 ? `+ € ${selfReward(lengte)}` : '',
    duur: bekend ? o.eta : '', aanbevolen: o.id === r.def, toets: keys[o.id], disabled: null,
  }));
  const keuze = rijen.find((x) => x.id === gekozen);
  return {
    hud: true, kicker: 'Reizen', titel: `Naar ${beat.to}`, naam: '', afstand: bekend ? `${km(lengte)} km` : '',
    uitleg: wantsExplain(seen, TRAVEL_HELP_ID) ? 'De klok loopt altijd door.' : '',
    rijen, gekozen, melding: '', reis: { label: keuze ? keuze.label.replace(/ ·.*$/, '') : 'Kies' }, terug: null,
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

// Pijl omhoog of omlaag (en W of S) verplaatst de keuze, net als D-pad omhoog en omlaag op een controller: -1, 1 of null.
// Eerst kon een toetsenbordspeler alleen 1, 2 of 3 of Enter op de standaard drukken en dus niet door de lijst lopen (22-11).
export function pickDirFromKey(key) {
  const k = String(key);
  if (k === 'ArrowUp' || k === 'w' || k === 'W') return -1;
  if (k === 'ArrowDown' || k === 's' || k === 'S') return 1;
  return null;
}

// Toetsenbord, gelijk aan het pad (#97): Tab (met Shift terug) verplaatst de markering, 1/2/3 kiezen meteen, Enter of spatie bevestigt de markering,
// Escape sluit (de standaardkeuze). Bewust geen pijlen of WASD: het paneel hangt in het spel en die toetsen sturen te voet en in een voertuig. Geeft { markeer: id }, { kies: id }, { sluit: true } of null (de toets is niet van het paneel).
export function keyAction(beat, pick, key, shift = false) {
  const k = String(key);
  if (k === 'Tab') return { markeer: cyclePick(beat, pick, shift ? -1 : 1) };
  const direct = pickFromKey(beat, k);
  if (direct) return { kies: direct };
  if (k === 'Enter' || k === ' ') return { kies: pick };
  if (k === 'Escape') return { sluit: true };
  return null;
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
