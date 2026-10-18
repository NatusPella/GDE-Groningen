// Runs regioleven.js in the game: now and then a chance encounter as a
// text card (no voice), and the finds of a streek when you stand on them.
// Quiet during missions, cutscenes and every other busy moment (busy.js).
import { streekAt, rollEncounter, rollGap, findNear, findsOf, SET_VERZAMEL, SET_GEHEIM, ENCOUNTER_REWARD_MAX } from './regioleven.js';
import { recordUnique, hasUnique } from './achievements.js';
import { playerBusy } from './busy.js';
import { showCard } from './hudcards.js';

const recent = [];
let gapT = 60, scanT = 0;

const isFound = (f) => hasUnique(f.kind === 'geheim' ? SET_GEHEIM : SET_VERZAMEL, f.id);
const foundIds = () => {
  const out = [];
  for (const s of ['eemsdelta', 'veenkolonien', 'oldambt', 'westerkwartier', 'hogeland']) for (const f of findsOf(s)) if (isFound(f)) out.push(f.id);
  return out;
};

export function updateRegioLeven(dt, w) {
  if (!w || !w.player || playerBusy(w).busy) return;
  const p = w.player;
  const moving = p.inVehicle ? Math.abs(p.inVehicle.speed || 0) > 0.5 : (p.speed || 0) > 0.3;
  if ((scanT -= dt) <= 0) {
    scanT = 0.5;
    const f = findNear(p.x, p.y, foundIds());
    if (f && recordUnique(w, f.kind === 'geheim' ? SET_GEHEIM : SET_VERZAMEL, f.id)) {
      showCard(w, { kind: 'prestatie', kicker: f.kind === 'geheim' ? 'Geheim gevonden' : 'Gevonden', title: f.name, body: f.text, duration: 6, key: 'streek-' + f.id, voice: false });
    }
  }
  if (!moving) return;
  if ((gapT -= dt) > 0) return;
  gapT = rollGap();
  const hour = Number.isFinite(w.clock) ? w.clock : 12;
  const s = streekAt(p.x, p.y);
  const e = rollEncounter(s ? s.id : null, hour, Math.random, recent);
  if (!e) return;
  recent.push(e.id);
  if (recent.length > 4) recent.shift();
  const gift = Math.min(ENCOUNTER_REWARD_MAX, e.reward || 0);
  if (gift > 0 && Number.isFinite(w.money)) w.money += gift;
  showCard(w, { kind: 'tip', kicker: s ? s.name : 'Onderweg', title: e.who, body: e.line + (gift > 0 ? ` (€${gift})` : ''), duration: 6, key: 'ontmoeting-' + e.id, voice: false });
}
