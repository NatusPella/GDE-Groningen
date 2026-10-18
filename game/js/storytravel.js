// Hooks the travel beats (reisbeats.js, reiskeuze.js) into the story director (#97).
// Behind ?reizen and only in the new arc. story.js calls tickStoryTravel() once a
// frame for the current step; everything it decides is in the pure functions below.
//
// A beat is offered once per step (flag 'reis:<id>' in the save's story flags, so
// no new storage key): when the step has a beat, the player is more than a jump
// away from where it starts, and nothing else holds the screen. A step that is
// already near its start is marked as handled without asking.
import { REISBEATS, beatFor } from './reisbeats.js';
import { needsBeat } from './reistijd.js';
import { arrival } from './reiskeuze.js';

export const REIS_FLAG = (id) => `reis:${id}`;

// 'vraag' | 'sla-over' | null
export function decideTravel({ on, beat, handled, busy, dist }) {
  if (!on || !beat || handled) return null;
  if (busy || !(dist >= 0)) return null;
  return needsBeat(dist) ? 'vraag' : 'sla-over';
}

// What the world does for a choice. Pure over a small world-like object:
// { player, companion, clock, money, addMessage } -> returns the effects it applied.
export function applyTravel(w, beat, choice, dest) {
  const a = arrival(beat, choice);
  if (!a) return null;
  // driving yourself runs on the game clock; the others add the real time
  if (choice !== 'zelf' && typeof w.clock === 'number') w.clock = (w.clock + a.clockMinutes / 60) % 24;
  if (choice !== 'zelf' && dest) {
    const p = w.player;
    p.x = dest.x; p.y = dest.y; p.vx = 0; p.vy = 0;
    const c = w.companion;
    if (c && c.state !== 'dead') { c.x = dest.x + 1.5; c.y = dest.y; c.vx = 0; c.vy = 0; }
  }
  return a;
}

// reward for driving yourself is paid on arrival (within `AT_M` of the start)
export const AT_M = 120;
export function selfArrivalMoney(a, dist) {
  return a && a.money > 0 && dist <= AT_M ? a.money : 0;
}

let asking = false;
const pendingSelf = new Map();

// per frame. ctx: { on, step, state.flags, busy, world, ask(beat)->Promise, script, fade(on) }
export function tickStoryTravel(ctx) {
  const { on, step, flags, world: w, ask, script } = ctx;
  if (!on || !step || step.end) return;
  const beat = beatFor(step.id, script);
  const g = w.storyGuide;
  // reward when the self-driven trip arrives
  const pend = pendingSelf.get(step.id);
  if (pend && g) {
    const d = Math.hypot(g.x - w.player.x, g.y - w.player.y);
    const m = selfArrivalMoney(pend, d);
    if (m) { w.money += m; w.addMessage(`Zelf gereden: €${m}`, 3, { kind: 'geld' }); pendingSelf.delete(step.id); }
  }
  if (asking || !beat || !g) return;
  const dist = Math.hypot(g.x - w.player.x, g.y - w.player.y);
  const d = decideTravel({ on, beat, handled: flags.has(REIS_FLAG(step.id)), busy: ctx.busy, dist });
  if (d === 'sla-over') { flags.add(REIS_FLAG(step.id)); return; }
  if (d !== 'vraag') return;
  asking = true;
  Promise.resolve(ask(beat)).then((choice) => {
    flags.add(REIS_FLAG(step.id));
    const a = applyTravel(w, beat, choice, g);
    if (!a) return;
    if (choice === 'zelf') pendingSelf.set(step.id, a);
    else {
      for (const l of a.subtitles) w.addMessage(l, 4);
      w.addMessage(`Aangekomen in ${beat.to}`, 4, { kind: 'reis' });
    }
  }).finally(() => { asking = false; });
}

export const hasBeat = (id) => !!REISBEATS[id];
