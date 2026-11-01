// The `timing` stage of a stages mission (missions.js): a short run of timing presses on the same panel as
// the `choice` stage (choicepanel.js), so a story peak is played and not only watched. Used by the new arc:
//   M18 the server room    slip past the cameras: press when the sweep is in the dark zone
//   M20 the moat           the fierljep duel with Durk and Douwe: run-up, grab, climb (the best of the rounds counts)
//   M21 Tessa's wagons     jump from wagon to wagon of the moving goods train
//
// st { kind: 'timing', kicker, help, rounds: [round], failAt, failText, goodAt, tagGood, tagLow }
//   round { text, speed (sweeps per second), zone: [from, to] (0-1 on the bar), ok, bad (replies shown after the press) }
//   failAt: this many misses end the mission with failText; omitted: a miss only costs (the story goes on)
//   goodAt: hits needed for tagGood, fewer give tagLow (tags land in chain.tags, see missions.js consequenceAdjust)
// Space, E or F press. Nothing here imports game code but the panel; the stage state lives in S (missions.js).
import { createChoicePanel, keycap } from './choicepanel.js';
import { neemPaneelDruk } from './coopgast.js'; // de toets van een gast bij de gastheer (#525)

const REPLY_S = 1.5;
let panel = null;
const ensure = () => panel || (panel = createChoicePanel('#7fb6e6'));

export function closeTiming() {
  if (panel) panel.hide();
}

export function enterTiming(S, st, on) {
  // a round with zoneIf gets a wider zone when that choice was made (M26: the ally of M23 closes the street the surest)
  S.rounds = on && st && st.rounds.some((r) => r.zoneIf)
    ? st.rounds.map((r) => (r.zoneIf && on(r.zoneIf) ? { ...r, zone: [r.zone[0] - 0.09, r.zone[1] + 0.09], ok: r.okIf || r.ok } : r))
    : null;
  S.ti = 0;
  S.hits = 0;
  S.miss = 0;
  S.tphase = 'ask';
  S.needleT = 0;
  S.replyT = 0;
  S.treply = null;
}

// where the needle is (0-1) after `t` seconds of this round
export const needleAt = (round, t) => 0.5 + 0.5 * Math.sin(t * (round.speed || 0.7) * Math.PI * 2 - Math.PI / 2);
export const inZone = (round, v) => v >= round.zone[0] && v <= round.zone[1];

// The rules, without the panel: one frame. `press` is true when a key was hit this frame.
// Returns 'done', { fail: reason } or null; S.tphase is 'ask' or 'reply' (S.treply is the line to show).
export function stepTiming(st, S, press, dt) {
  const round = (S.rounds || st.rounds)[Math.min(S.ti, st.rounds.length - 1)];
  if (S.tphase === 'ask') {
    S.needleT += dt;
    if (!press) return null;
    const hit = inZone(round, needleAt(round, S.needleT));
    if (hit) S.hits++; else S.miss++;
    S.treply = { text: (hit ? round.ok : round.bad) || '', bad: !hit };
    S.tphase = 'reply';
    S.replyT = REPLY_S;
    S.pendingFail = st.failAt && S.miss >= st.failAt ? st.failText || 'het lukte niet' : null;
    return null;
  }
  S.replyT -= dt;
  if (S.replyT > 0) return null;
  if (S.pendingFail) return { fail: S.pendingFail };
  S.ti++;
  S.tphase = 'ask';
  S.needleT = 0;
  return S.ti >= st.rounds.length ? 'done' : null;
}

// the tag a finished stage earns: enough hits is good
export function timingTag(st, S) {
  if (!st.tagGood && !st.tagLow) return null;
  return S.hits >= (st.goodAt ?? st.rounds.length) ? st.tagGood || null : st.tagLow || null;
}

function paint(st, S, round) {
  const reply = S.tphase === 'reply' ? S.treply : null;
  ensure().set({
    kicker: `${st.kicker || 'Timing'} · ${Math.min(S.ti + 1, st.rounds.length)} VAN ${st.rounds.length}`,
    text: round.text,
    rule: '',
    options: [],
    meter: { v: needleAt(round, S.needleT), from: round.zone[0], to: round.zone[1] },
    flash: reply ? reply.text : '',
    bad: !!reply && reply.bad,
    help: reply ? '' : `${keycap('SPATIE')} ${st.help || 'druk als de streep in het groen is'}`,
  });
}

// per frame while the stage runs (missions.js). Returns 'done', { fail: reason } or null.
export function updateTiming(dt, world, st, S) {
  const p = ensure();
  if (!p.open) p.show();
  world.minigameUntil = world.time + 0.25;
  let press = false;
  if (S.tphase === 'ask') {
    // Samen spelen (#525): een gast ziet de balk en drukt mee; zijn druk komt uit de wachtrij van de gastheer. Hij
    // telt alleen als treffer als hij hier aankomt terwijl de naald in het groen staat, dus de klok van de gastheer is
    // de baas (netwerklatentie kan een goede druk van een gast net naast het groen laten vallen).
    if (neemPaneelDruk(world, 'timing').length) press = true;
    for (const k of [' ', 'e', 'f']) if (world.input.wasPressed(k)) { world.input.consume(k); press = true; }
  }
  const r = stepTiming(st, S, press, dt);
  if (r) { closeTiming(); return r; }
  paint(st, S, (S.rounds || st.rounds)[Math.min(S.ti, st.rounds.length - 1)]);
  return null;
}
