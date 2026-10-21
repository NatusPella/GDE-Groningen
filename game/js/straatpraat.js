import { areaOf, partOf, wetOf, rollGebabbel, AREA_NAMES } from './gebabbel.js';
import { streekAt } from './regioleven.js';
// Gesprekken van voorbijgangers in beeld (#190): twee wandelaars die dicht bij
// elkaar lopen praten tegen elkaar in een tekstbel boven hun hoofd, een enkele
// wandelaar mompelt een regel. De tekst komt uit gebabbel.js (per streek, dagdeel
// en weer); er is geen stem, een bel speelt alleen een opname af als die bestaat.
// Het plan en de keuze van de sprekers zijn puur (hieronder); tikStraatpraat
// hangt eraan in het spel (regiolevenrt.js).

export const HEAR_MIN = 4, HEAR_MAX = 20;   // m van de speler: te dichtbij is opdringerig, te ver is onleesbaar
export const PAIR_MAX = 7;                  // m tussen twee sprekers
export const GAP_MIN = 14, GAP_MAX = 34;    // s tussen twee gesprekken

// Leestijd van één regel in seconden.
export const lineTime = (text) => Math.min(5, Math.max(2.4, 0.9 + String(text).length * 0.055));

// Een plan: per regel wie (0 of 1), de tekst, wanneer (s na het begin) en hoe lang.
// De eerste spreker in het gesprek is 0, de tweede 1, een derde label valt op 0.
export function planGesprek(g) {
  const labels = [];
  const out = [];
  let at = 0;
  for (const [who, text] of g.lines) {
    let i = labels.indexOf(who);
    if (i < 0) { labels.push(who); i = labels.length - 1; }
    const dur = lineTime(text);
    out.push({ who: Math.min(i, 1), text, at, dur });
    at += dur + 0.4;
  }
  return { id: g.id, parties: Math.min(labels.length, 2), lines: out, total: at };
}

// Kan deze voorbijganger meepraten?
export function canTalk(p, now = 0) {
  return !!p && p.state === 'wander' && !p.isCop && !p.scene && !p.ragdoll && !p.pose && !p.hideMesh && !p.missionCrowd
    && !(p.speechText && now < (p.speechUntil || 0));
}

// Zoek sprekers: een paar op hooguit PAIR_MAX m van elkaar, of één ped, binnen gehoorafstand
// van de speler. peds: de wereldlijst; (px, py): de speler. Geeft [a, b] of [a] of null.
export function pickTalkers(peds, px, py, now = 0, wantPair = true, rng = Math.random) {
  const near = [];
  for (const p of peds) {
    if (!canTalk(p, now)) continue;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d >= HEAR_MIN && d <= HEAR_MAX) near.push(p);
  }
  if (!near.length) return null;
  if (wantPair) {
    const pairs = [];
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      if (Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y) <= PAIR_MAX) pairs.push([near[i], near[j]]);
    }
    if (pairs.length) return pairs[Math.floor(rng() * pairs.length) % pairs.length];
  }
  return [near[Math.floor(rng() * near.length) % near.length]];
}

// --- in het spel ----------------------------------------------------------------------------------

let gapT = 8;
let run = null;          // { plan, peds, t }
const recent = [];

export function straatpraatState() { return { gapT, run: run && { id: run.plan.id, t: run.t }, recent: recent.slice() }; }
export function resetStraatpraat() { gapT = 8; run = null; recent.length = 0; }

// Een gesprek loopt; de ene regel na de andere. Stopt als een spreker iets anders gaat doen.
function stepRun(dt, w) {
  run.t += dt;
  for (const p of run.peds) if (!p || p.state !== 'wander' || p.ragdoll || p.scene || p.isCop) { run = null; return; }
  for (const l of run.plan.lines) {
    if (run.t >= l.at && !l.said) {
      l.said = true;
      const ped = run.peds[Math.min(l.who, run.peds.length - 1)];
      ped.speechText = l.text;
      ped.speechUntil = w.time + l.dur;
    }
  }
  if (run.t > run.plan.total + 0.5) run = null;
}

// Eén tik. Rustig tijdens opdrachten en filmpjes (de aanroeper checkt playerBusy).
export function tikStraatpraat(dt, w, rng = Math.random) {
  if (run) { stepRun(dt, w); return; }
  if ((gapT -= dt) > 0) return;
  gapT = GAP_MIN + rng() * (GAP_MAX - GAP_MIN);
  const p = w.player;
  const talkers = pickTalkers(w.pedestrians || [], p.x, p.y, w.time, true, rng);
  if (!talkers) { gapT = 5; return; }
  const s = streekAt(p.x, p.y);
  const area = areaOf(s ? s.id : null, p.y);
  const hour = Number.isFinite(w.clock) ? w.clock : 12;
  const g = rollGebabbel(area, partOf(hour), wetOf(w.weather && w.weather.kind), rng, recent, talkers.length > 1 ? 2 : 1);
  if (!g) return;
  recent.push(g.id);
  if (recent.length > 8) recent.shift();
  const plan = planGesprek(g);
  run = { plan, peds: talkers.length > 1 ? talkers : [talkers[0]], t: 0 };
  // een gesprek met twee sprekers had twee peds nodig; één ped zegt dan alleen de eerste regel
  if (plan.parties > run.peds.length) plan.lines = plan.lines.slice(0, 1), plan.total = plan.lines[0].dur;
  for (const l of plan.lines) l.said = false;
}

export { AREA_NAMES };
