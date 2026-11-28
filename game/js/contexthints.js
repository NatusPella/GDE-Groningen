// Contextual hints (#201): the first time in a vehicle kind or a minigame, one
// short text card, each once per device (gde-hints-gezien). The rules are in
// hintkit.js; this wires them to the world and shows the card the way
// onboarding.js does. Off with Instellingen › Weergave › "Uitleg voor nieuwe spelers".
import { showCard, cardsBusy } from './hudcards.js';
import { mayStart } from './narrative.js';
import { isCinematicActive } from './cinematics.js';
import { isPauseMenuOpen } from './pausestate.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName, tokenKey } from './controls.js';
import { glyphHtml } from './prompts.js';
import { KEYS } from './storagekeys.js';
import { playerBusy } from './busy.js';
import { pickHint, pickSamenHint, situation, parseSeen, serializeSeen, widgetNodig } from './hintkit.js';
import { openerNaam } from './coopplayers.js';
import { uitlegBlok, zetUitlegGlyph, startUitleg } from './uitleg.js';
import { HINT_UITLEG, uitlegDef } from './uitlegdata.js';
import { escapeHtml as escHtml } from './htmlescape.js';

const KEY_TOKEN = /\{(\w+)\}/g;
const plainKeys = (t) => t.replace(KEY_TOKEN, (m, k) => keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
const htmlKeys = (t) => t.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyphHtml(part) : escHtml(part))).join('');

// #989: de kaart van een voertuig of minigame met uitleg in iconen en een korte lus; de oude tekst blijft als 'Meer uitleg' staan.
// Zonder uitleg-data voor dit hint-id, of met Instellingen › Uitleg met iconen uit, is het de gewone tekstkaart.
function iconenBody(h) {
  const ref = HINT_UITLEG[h.id];
  const def = typeof ref === 'string' ? uitlegDef(ref) : ref ? { id: h.id, ...ref } : null;
  if (!def) return '';
  zetUitlegGlyph(glyphHtml);
  startUitleg();
  return uitlegBlok({ ...def, titel: '', meer: h.body }, { compact: true, titel: false });
}

let seen = load();
let playT = 0;
let lastAt = -Infinity;
let inT = 0;
let was = '';

function load() {
  try { return parseSeen(localStorage.getItem(KEYS.hintsGezien)); } catch (e) { return new Set(); }
}

export function resetContextHints() {
  seen = new Set();
  try { localStorage.removeItem(KEYS.hintsGezien); } catch (e) { /* ignore */ }
}

// #987: de eerste-keer-uitleg als regelwidget deelt de gezien-lijst met de kaarten: één regel tegelijk, pas als de speler
// de handeling nodig heeft, en na de eerste echte handeling blijft hij stil (widgetUitlegKlaar).
export const widgetUitlegNodig = (id) => widgetNodig(seen, id);
export function widgetUitlegKlaar(id) {
  if (!widgetNodig(seen, id)) return;
  seen.add(id);
  try { localStorage.setItem(KEYS.hintsGezien, serializeSeen(seen)); } catch (e) { /* memory only */ }
}

export function updateContextHints(dt, w) {
  if (!document.body.classList.contains('game-started') || w.paused || isPauseMenuOpen()) return;
  const st = situation(w);
  playT += dt;
  const now = st.minigame ? 'm:' + st.minigame : st.vehicle ? 'v:' + st.vehicle : '';
  inT = now && now === was ? inT + dt : 0;
  was = now;
  if (!now || isCinematicActive()) return;
  // a mission's own staging or a minigame's own screen has the player's attention: only the hint for that minigame itself passes
  const busy = !st.minigame && playerBusy(w, ['sideJob', 'challenge', 'race', 'padel', 'activityGame', 'heliRun', 'pigeon']).busy;
  const h = pickHint(st, seen, { playT, lastAt, inT }, { enabled: getSettings().onboardingTips !== false, busy });
  if (!h || cardsBusy() || !mayStart('card')) return;
  const iconen = iconenBody(h);
  showCard(w, { kind: 'tip', kicker: 'Uitleg', title: h.title, body: plainKeys(h.body), bodyHtml: iconen || htmlKeys(h.body), key: 'hint-' + h.id, important: true, voice: false, duration: iconen ? 11 : 8 });
  seen.add(h.id);
  try { localStorage.setItem(KEYS.hintsGezien, serializeSeen(seen)); } catch (e) { /* memory only */ }
  lastAt = playT;
}

// Samen spelen: de rolkaart en daarna de roepjes, voor wie het spel opende én voor een gast (een gast draait updateContextHints
// niet). Aangeroepen vanuit coophud.js, elke frame zolang er een sessie is. Eén kaart tegelijk, elk één keer per apparaat.
let samenT = 0;
let samenAt = -Infinity;
let samenLast = 0;
export function updateSamenHints(w) {
  const nu = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  const dt = Math.min(1, Math.max(0, nu - samenLast));
  samenLast = nu;
  if (!w || !w.coopNet || w.coopSolo || !document.body.classList.contains('game-started') || isPauseMenuOpen()) return;
  const rol = w.coopRole === 'client' ? (w.coopNet.joined ? 'gast' : null) : w.coopRole === 'host' ? 'host' : null;
  const spelers = Array.isArray(w.coopRoster) ? w.coopRoster.length : 0;
  if (!rol || spelers < 2) { samenT = 0; return; }
  samenT += dt;
  if (isCinematicActive() || w.cameraOverride) return;
  const st = { rol, spelers, dead: !!(w.health <= 0 || w.pendingRespawn), paused: !!w.paused, wanted: w.wanted || 0 };
  const h = pickSamenHint(st, seen, { sessieT: samenT, sinds: samenT - samenAt }, { enabled: getSettings().onboardingTips !== false });
  if (!h || cardsBusy() || !mayStart('card')) return;
  const body = h.body.replace('{OPENER}', openerNaam(w.coopRoster));
  showCard(w, { kind: 'tip', kicker: 'Samen spelen', title: h.title, body: plainKeys(body), bodyHtml: htmlKeys(body), key: 'hint-' + h.id, important: true, voice: false, duration: 9 });
  seen.add(h.id);
  try { localStorage.setItem(KEYS.hintsGezien, serializeSeen(seen)); } catch (e) { /* memory only */ }
  samenAt = samenT;
}

if (typeof window !== 'undefined') window.__contextHints = { seen: () => [...seen], reset: resetContextHints };
