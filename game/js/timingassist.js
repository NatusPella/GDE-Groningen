// #957: de timing-balken (stagetiming.js, heist.js) waren te streng: de groene zone was
// smal en de naald snel, ook op de ontspannen stand. Deze module maakt de zone ruimer en
// koppelt de ruimte aan de gekozen moeilijkheidsstand en aan de hulp uit Instellingen
// (assist.js). Puur: geen DOM, geen THREE, geen klok. scripts/timingassist_test.mjs test
// de regels; de balken zelf tekenen alleen wat hier uit komt.
import { cleanDifficulty, difficultyFactors } from './difficulty.js';
import { assistFactors } from './assist.js';

// De basis: 30% ruimer dan de oude zone. Een stand of hulp maakt het daarbovenop ruimer;
// 'uitdagend' (0,85) houdt de zone iets smaller dan de basis, maar nooit smaller dan vroeger.
const BASE_GRACE = 1.3;
const MAX_GRACE = 2.1;
export const MIN_ZONE = 0.14;   // breedte op de balk (0..1): hieronder is mikken niet meer te doen
const MAX_ZONE = 0.82;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const getal = (v, d) => (Number.isFinite(v) ? v : d);

// Hoeveel ruimer de zone is: de stand (ontspannen/standaard/uitdagend) maal de hulptijd.
// Ontspannen + hulp komt op de bovengrens; uitdagend blijft op de basis of iets smaller.
export function timingGrace(mode = 'standaard', settings = {}) {
  const stand = difficultyFactors(cleanDifficulty(mode)).time;
  const hulp = assistFactors(settings).time;
  return clamp(BASE_GRACE * stand * hulp, 1, MAX_GRACE);
}

// Een groene zone [van, tot] op 0..1, verbreed rond hetzelfde midden. De zone blijft
// binnen de balk en houdt een minimum- en maximumbreedte, zodat hij nooit buiten beeld
// valt of de hele balk wordt.
export function widenZone(zone, grace = BASE_GRACE) {
  const [van, tot] = Array.isArray(zone) && Number.isFinite(zone[0]) && Number.isFinite(zone[1])
    ? [Math.min(zone[0], zone[1]), Math.max(zone[0], zone[1])]
    : [0.4, 0.6];
  const mid = (van + tot) / 2;
  // verbreden, nooit versmallen: een factor onder 1 laat de zone staan (een misser mag
  // een volgende poging niet strenger maken, #962)
  const breed = clamp(Math.max(tot - van, (tot - van) * getal(grace, BASE_GRACE)), MIN_ZONE, MAX_ZONE);
  let lo = mid - breed / 2, hi = mid + breed / 2;
  if (lo < 0.02) { hi += 0.02 - lo; lo = 0.02; }
  if (hi > 0.98) { lo -= hi - 0.98; hi = 0.98; }
  return [Math.max(0.02, lo), Math.min(0.98, hi)];
}

// Een venster in seconden binnen een ronde van `len` seconden (bijbaanregels.js: de
// kermisdraai). Verbreedt rond hetzelfde midden en blijft binnen de ronde.
export function widenWindow(win, len, grace = BASE_GRACE) {
  const totaal = Math.max(0.001, getal(len, 0.001));
  const [van, span] = Array.isArray(win) && Number.isFinite(win[0]) && Number.isFinite(win[1])
    ? [win[0], win[1]]
    : [totaal * 0.4, totaal * 0.2];
  const mid = van + span / 2;
  const breed = clamp(span * getal(grace, BASE_GRACE), totaal * 0.14, totaal * 0.82);
  let lo = mid - breed / 2;
  if (lo < 0) lo = 0;
  if (lo > totaal - breed) lo = Math.max(0, totaal - breed);
  return [lo, breed];
}

// De hulptekst bij de balk: zegt in gewone taal dat de zone ruimer is, zonder de speler
// met getallen lastig te vallen. Leeg als er geen extra ruimte is.
export function graceHint(grace) {
  if (!(grace > BASE_GRACE + 0.001)) return '';
  return 'De groene zone is ruimer';
}
