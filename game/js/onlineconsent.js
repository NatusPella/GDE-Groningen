// Samen spelen (#530, ADR 0022): the first-start question and the switch in the players
// panel, as pure rules and Dutch texts. The DOM lives in onlineconsentui.js (the first
// start) and coopspelersui.js (the switch); both read and write the same gde-settings key
// onlineMeedoen through here, so no third truth appears.
// No network here: an answer only records a permission. The session itself still starts
// through the lobby (lobbyui.js, coopnet.js), which is the one place that connects.
import { profielNaam, CONSENT_TEXT } from './lobby.js';
import { getSettings, setSetting, magOnline } from './settings.js';

// null means the question was never asked, so it still has to be asked; true and false are
// answers. Null must never read as "yes" (settings.js normalises it the same way).
export const moetVragen = (settings = getSettings()) => settings.onlineMeedoen !== true && settings.onlineMeedoen !== false;

// What the first start shows: a name, and one honest question with two answers.
export const EERSTE_START = {
  titel: 'Meedoen met andere spelers?',
  uitleg: `${CONSENT_TEXT} Je kunt dit later altijd veranderen.`,
  naamLabel: 'Je naam',
  naamHint: 'Leeg mag: dan zien anderen de naam van je figuur.',
  meedoen: 'Meedoen',
  alleen: 'Alleen spelen',
  // #751: een derde weg naast de twee antwoorden: de vraag uitstellen zonder iets te bewaren
  later: 'Later',
};

// The switch in the players panel, with one line of explanation.
export const SCHAKELAAR = {
  label: 'Meedoen met andere spelers',
  uitleg: CONSENT_TEXT,
  aan: 'Je mag nu meedoen. Open Samen spelen om een sessie te openen of aan te sluiten.',
  uitOpenbaar: 'De sessie staat niet meer in de openbare lijst. Wie al meespeelt blijft; nieuwe spelers komen er alleen nog bij met de kamercode.',
  uitSessie: 'Deze sessie blijft besloten: wie al meespeelt blijft, nieuwe spelers komen er alleen nog bij met de kamercode.',
  uitGast: 'Bewaard. Deze sessie loopt nog; de volgende keer dat je het spel opent, speel je alleen.',
  uit: 'Je speelt alleen. Je sessie gaat niet naar buiten.',
};

// An answer from the first-start screen: the name goes through the same filter as the
// profile field (lobby.js), and an empty name means "use the name of your figure".
// Nothing is written when the name is refused, so a typo never turns into a half answer.
export function kiesToestemming(meedoen, naam, { zet = setSetting } = {}) {
  const r = profielNaam(naam);
  if (!r.ok) return { ok: false, error: r.reason };
  zet('onlineNaam', r.naam);
  zet('onlineMeedoen', !!meedoen);
  return { ok: true, meedoen: !!meedoen, naam: r.naam };
}

// The switch. Turning it off records the answer and takes a session that lists itself out
// of the public list (hub.zetOpenbaar(false), net/hub.js): the guests that are already in
// stay, and new players can only come in with the room code. A guest cannot close the host's
// session, so there the answer applies from the next start. Turning it on only records the
// permission and asks for the panel that opens or joins (requestOpenSamen in samenpanel.js);
// connecting stays the lobby's job (lobbyui.js), there is no second network path here.
export function zetMeedoen(aan, { world = null, zet = setSetting, nu = magOnline() } = {}) {
  if (!!aan === nu) return { ok: true, meedoen: nu, veranderd: false, tekst: '' };
  zet('onlineMeedoen', !!aan);
  if (aan) return { ok: true, meedoen: true, veranderd: true, openSamen: true, tekst: SCHAKELAAR.aan };
  const n = world && world.coopNet;
  const hub = n && n.role === 'host' ? n.hub : null;
  const openbaar = !!(hub && hub.openbaar);
  const solo = !!(world && world.coopSolo); // Alleen spelen (#554): geen kamercode en geen medespelers (#580)
  if (openbaar && typeof hub.zetOpenbaar === 'function') hub.zetOpenbaar(false);
  const tekst = openbaar ? SCHAKELAAR.uitOpenbaar : hub && !solo ? SCHAKELAAR.uitSessie : n && n.role === 'client' ? SCHAKELAAR.uitGast : SCHAKELAAR.uit;
  return { ok: true, meedoen: false, veranderd: true, openbaarGesloten: openbaar, tekst };
}

