// Runs regioleven.js in the game: now and then a chance encounter as a
// text card (no voice), and the finds of a streek when you stand on them.
// Quiet during missions, cutscenes and every other busy moment (busy.js).
import { streekAt, rollEncounter, rollGap, findNear, findsOf, SET_VERZAMEL, SET_GEHEIM, ENCOUNTER_REWARD_MAX } from './regioleven.js';
import { recordUnique, hasUnique } from './achievements.js';
import { playerBusy } from './busy.js';
import { showCard } from './hudcards.js';
import { createNieuwsLink, tikNieuws } from './nieuwslink.js';
import { areaOf, partOf, wetOf, rollGebabbel, AREA_NAMES } from './gebabbel.js';

const recent = [];
const recentTalk = [];
let talkNext = false;   // om en om: een ontmoeting, dan opgevangen gebabbel
let gapT = 60, scanT = 0;
let nieuws = null, nieuwsEnv = {}, nieuwsT = 0, nieuwsNow = 0;

// Bronnen van de ticker die niet in de wereld hangen (main.js: de bruggen).
export function setNieuwsBronnen(env) { nieuwsEnv = env || {}; }

const isFound = (f) => hasUnique(f.kind === 'geheim' ? SET_GEHEIM : SET_VERZAMEL, f.id);
const foundIds = () => {
  const out = [];
  for (const s of ['eemsdelta', 'veenkolonien', 'oldambt', 'westerkwartier', 'hogeland']) for (const f of findsOf(s)) if (isFound(f)) out.push(f.id);
  return out;
};

export function updateRegioLeven(dt, w) {
  if (!w || !w.player) return;
  nieuwsNow += dt;
  if (!nieuws) nieuws = createNieuwsLink(1 + Math.floor(Math.random() * 1e6));
  if ((nieuwsT -= dt) <= 0 && !w.paused) {
    nieuwsT = 0.5;
    const sk = streekAt(w.player.x, w.player.y);
    const n = tikNieuws(nieuws, w, nieuwsNow, { regio: 'groningen', plaats: sk ? sk.name : 'Groningen' }, nieuwsEnv);
    if (n && !playerBusy(w).busy) showCard(w, { kind: 'tip', kicker: n.bron, title: n.item.lezer, body: n.item.tekst, duration: 9, key: 'nieuws-' + Math.round(nieuwsNow), voice: false });
  }
  if (playerBusy(w).busy) return;
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
  talkNext = !talkNext;
  if (talkNext) {
    const area = areaOf(s ? s.id : null, p.y);
    const kind = w.weather && w.weather.kind;
    const g = rollGebabbel(area, partOf(hour), wetOf(kind), Math.random, recentTalk);
    if (g) {
      recentTalk.push(g.id);
      if (recentTalk.length > 6) recentTalk.shift();
      showCard(w, { kind: 'tip', kicker: 'Opgevangen in ' + AREA_NAMES[area], title: g.lines[0][0], body: g.lines.map(([who, t]) => (g.lines.length > 1 ? who + ': ' : '') + t).join(' '), duration: 6, key: 'gebabbel-' + g.id, voice: false });
      return;
    }
  }
  const e = rollEncounter(s ? s.id : null, hour, Math.random, recent);
  if (!e) return;
  recent.push(e.id);
  if (recent.length > 4) recent.shift();
  const gift = Math.min(ENCOUNTER_REWARD_MAX, e.reward || 0);
  if (gift > 0 && Number.isFinite(w.money)) w.money += gift;
  showCard(w, { kind: 'tip', kicker: s ? s.name : 'Onderweg', title: e.who, body: e.line + (gift > 0 ? ` (€${gift})` : ''), duration: 6, key: 'ontmoeting-' + e.id, voice: false });
}
