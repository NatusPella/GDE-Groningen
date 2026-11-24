// Moeilijkheid bij Samen spelen is een gezamenlijke keuze, geen hostrecht (besluit eigenaar 22-11; #1169, #452).
// Wat van jezelf is (schade, hulp, quicktime-events, geld, tijd, medailles, boete) wijzig je altijd zelf, zonder iemand te vragen.
// Wat van de wereld is (politie en verkeer, `scope: 'wereld'`) verandert voor iedereen: met meer spelers vraagt het akkoord van de groep
// (J of N, geen antwoord is nee) via dezelfde stemming als slapen (`groepAkkoord`, soort 'moeilijkheid'). Alleen is het meteen.
// Een gast mag het ook voorstellen (#1169, elke speler is gelijkwaardig): zijn eigen deel verandert meteen, en de waarden voor de wereld
// gaan als voorstel naar wie het spel opende (bericht `moeilijkheidverzoek`, coopnet.js). Die legt het de groep voor; de opener stemt
// zelf ook mee en de gast die het vroeg telt als ja. Pure regels, geen DOM en geen netwerk.
import { OPTION_DEFS, optionDef, presetValue, getDifficultyProfile, DIFFICULTY_MODES, resolveOptions, validOptionValue, setActiveOption } from './difficulty.js';
import { groepAkkoord, isGast, meerSpelers } from './coopgroep.js';

export const WORLD_OPTIONS = Object.freeze(OPTION_DEFS.filter((d) => d.scope === 'wereld').map((d) => d.key));

export const WORLD_GUEST_TEXT = 'De moeilijkheid van de wereld bepaalt de groep. Vraag het aan wie het spel opende; die legt het iedereen voor.';
export const WORLD_GUEST_SENT = 'Je eigen deel is aangepast. Politie en verkeer leg je de groep voor: iedereen stemt met J of N.';

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

// Het voorstel van een gast: de wereldwaarden van zijn profiel NA zijn eigen wijziging. Bij een optie alleen die optie, bij een niveau of
// herstel alle wereldopties. { sleutel: waarde } of null als de wijziging de wereld niet raakt.
export function worldProposal(change, profileAfter = getDifficultyProfile()) {
  if (!change) return null;
  const keys = change.type === 'option' ? WORLD_OPTIONS.filter((k) => k === change.key) : change.type === 'level' || change.type === 'reset' ? WORLD_OPTIONS : [];
  if (!keys.length) return null;
  const r = resolveOptions(profileAfter);
  const out = {};
  for (const k of keys) out[k] = r[k];
  return out;
}

// Wat de opener met een voorstel van het net doet: alleen wereldopties, alleen geldige stappen, en alleen wat anders is dan nu.
// Een onbekende sleutel, een vreemde waarde of een voorstel dat niets verandert geeft null (dan is er niets om over te stemmen).
export function cleanWorldProposal(raw, profile = getDifficultyProfile()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const nu = resolveOptions(profile);
  const out = {};
  for (const k of WORLD_OPTIONS) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    const v = raw[k];
    if (validOptionValue(k, v) && v !== nu[k]) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

// Na een ja van de groep: de wereldopties van de opener op de voorgestelde waarden.
export function applyWorldProposal(opties, set = setActiveOption) {
  let n = 0;
  for (const k of WORLD_OPTIONS) if (opties && Object.prototype.hasOwnProperty.call(opties, k) && set(k, opties[k])) n++;
  return n;
}

// Voor de melding bij de opener: "Politie kwijtraken: Langer · Verkeersdrukte: Rustig".
export function describeWorldProposal(opties) {
  return WORLD_OPTIONS.filter((k) => opties && Object.prototype.hasOwnProperty.call(opties, k)).map((k) => {
    const d = optionDef(k), s = d.stappen.find((x) => x.v === opties[k]);
    return `${d.label}: ${s ? s.label : opties[k]}`;
  }).join(' · ');
}

// Voer `apply` uit zodra de groep akkoord is. Geeft true als de wijziging meteen of na een lopende stemming doorgaat, false als ze wordt geweigerd.
// Een gast past zijn eigen deel meteen aan en stuurt de wereldwaarden als voorstel (world.coopMoeilijkheidVoorstel, coopnet.js).
export function changeWithGroup(world, change, apply, profile = getDifficultyProfile()) {
  if (!touchesWorld(change, profile) || !meerSpelers(world)) { apply(); return true; }
  if (isGast(world)) {
    apply();
    const voorstel = worldProposal(change);
    const sent = !!voorstel && typeof world.coopMoeilijkheidVoorstel === 'function' && !!world.coopMoeilijkheidVoorstel(voorstel);
    if (world.addMessage) world.addMessage(sent ? WORLD_GUEST_SENT : WORLD_GUEST_TEXT, 5);
    return sent;
  }
  if (typeof world.coopVraag !== 'function') {
    if (world && world.addMessage) world.addMessage(WORLD_GUEST_TEXT, 5);
    return false;
  }
  return groepAkkoord(world, 'moeilijkheid', null, apply);
}
