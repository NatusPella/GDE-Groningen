// Moeilijkheid bij Samen spelen is een gezamenlijke keuze, geen hostrecht (besluit eigenaar 22-11; #1169, #452).
// Wat van jezelf is (schade, hulp, quicktime-events, geld, tijd, medailles, boete) wijzig je altijd zelf, zonder iemand te vragen.
// Wat van de wereld is (politie en verkeer, `scope: 'wereld'`) verandert voor iedereen: met meer spelers vraagt het akkoord van de groep
// (J of N, geen antwoord is nee) via dezelfde stemming als slapen (`groepAkkoord`, soort 'moeilijkheid'). Alleen is het meteen.
// Een gast kan geen stemming starten (de wereld loopt bij een ander): hij krijgt een melding, de opener legt het de groep voor.
// Pure regels, geen DOM en geen netwerk.
import { OPTION_DEFS, optionDef, presetValue, getDifficultyProfile, DIFFICULTY_MODES } from './difficulty.js';
import { groepAkkoord, isGast, meerSpelers } from './coopgroep.js';

export const WORLD_OPTIONS = Object.freeze(OPTION_DEFS.filter((d) => d.scope === 'wereld').map((d) => d.key));

export const WORLD_GUEST_TEXT = 'De moeilijkheid van de wereld bepaalt de groep. Vraag het aan wie het spel opende; die legt het iedereen voor.';

// Raakt deze wijziging de wereld? change = { type: 'option', key } | { type: 'level', naar } | { type: 'reset' }.
export function touchesWorld(change, profile = getDifficultyProfile()) {
  if (!change) return false;
  if (change.type === 'option') { const d = optionDef(change.key); return !!d && d.scope === 'wereld'; }
  if (change.type === 'level') {
    if (!DIFFICULTY_MODES.includes(change.naar) || change.naar === profile.level) return false;
    return WORLD_OPTIONS.some((k) => presetValue(change.naar, k) !== presetValue(profile.level, k) || Object.prototype.hasOwnProperty.call(profile.custom || {}, k));
  }
  if (change.type === 'reset') return WORLD_OPTIONS.some((k) => Object.prototype.hasOwnProperty.call(profile.custom || {}, k));
  return false;
}

// Voer `apply` uit zodra de groep akkoord is. Geeft true als de wijziging meteen of na een lopende stemming doorgaat, false als ze wordt geweigerd.
export function changeWithGroup(world, change, apply, profile = getDifficultyProfile()) {
  if (!touchesWorld(change, profile) || !meerSpelers(world)) { apply(); return true; }
  if (isGast(world) || typeof world.coopVraag !== 'function') {
    if (world && world.addMessage) world.addMessage(WORLD_GUEST_TEXT, 5);
    return false;
  }
  return groepAkkoord(world, 'moeilijkheid', null, apply);
}
