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
import { pickHint, situation, parseSeen, serializeSeen } from './hintkit.js';

const KEY_TOKEN = /\{(\w+)\}/g;
const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plainKeys = (t) => t.replace(KEY_TOKEN, (m, k) => keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
const htmlKeys = (t) => t.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyphHtml(part) : escHtml(part))).join('');

let seen = load();
let playT = 0;
let lastAt = -Infinity;
let inT = 0;
let was = '';

function load() {
  try { return parseSeen(localStorage.getItem(KEYS.hintsGezien)); } catch (e) { return new Set(); }
}

function resetContextHints() {
  seen = new Set();
  try { localStorage.removeItem(KEYS.hintsGezien); } catch (e) { /* ignore */ }
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
  showCard(w, { kind: 'tip', kicker: 'Uitleg', title: h.title, body: plainKeys(h.body), bodyHtml: htmlKeys(h.body), key: 'hint-' + h.id, important: true, voice: false, duration: 8 });
  seen.add(h.id);
  try { localStorage.setItem(KEYS.hintsGezien, serializeSeen(seen)); } catch (e) { /* memory only */ }
  lastAt = playT;
}

if (typeof window !== 'undefined') window.__contextHints = { seen: () => [...seen], reset: resetContextHints };
