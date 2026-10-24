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
import { arrival, travelOptions, RIDES } from './reiskeuze.js';
import { reisPlace } from './storyreis.js';
import { klokSprongMag, meerSpelers } from './coopgroep.js';

// where the trip ends: the travel step's own place; the guide can point somewhere else for a moment ("first to your garage", #311)
export const destOf = (step, g) => (step && step.goal && step.goal.type === 'reis' && step.goal.at ? reisPlace(step) : g);

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
  if (choice !== 'zelf' && typeof w.clock === 'number' && klokSprongMag(w)) w.clock = (w.clock + a.clockMinutes / 60) % 24; // met meer spelers springt de klok niet (#452)
  if (choice !== 'zelf' && dest) placeParty(w, dest);
  return a;
}

// The player, their vehicle and the companion stand at dest (travel beats, and the retry prompt of missions.js, #214).
export function placeParty(w, dest) {
  const p = w.player;
  p.x = dest.x; p.y = dest.y; p.vx = 0; p.vy = 0;
  // the vehicle comes along (#97): it stands at the goal with you
  if (p.inVehicle) { p.inVehicle.x = dest.x; p.inVehicle.y = dest.y; p.inVehicle.speed = 0; }
  const c = w.companion;
  if (c && c.state !== 'dead' && !meerSpelers(w)) { c.x = dest.x + 1.5; c.y = dest.y; c.vx = 0; c.vy = 0; }
}

// reward for driving yourself is paid on arrival (within `AT_M` of the start)
export const AT_M = 120;
export function selfArrivalMoney(a, dist) {
  return a && a.money > 0 && dist <= AT_M ? a.money : 0;
}

// tickStoryTravel calls ride(option, dest); the ride scene (reisrit.js) wants (world, option, dest): bind the world.
// Passed bare, the ride threw on its first line and a chosen 'Met de trein' did nothing at all (speeltestlus).
export const rideWith = (world, startRide) => (option, dest) => startRide(world, option, dest);

let asking = false;
const pendingSelf = new Map();

// The scene option for riding along: reisrit.js plays it (skip with space).
// Without a stops list the subtitles say "Instappen"/"Onderweg" only.
export function rideOption(beat) {
  const o = travelOptions(beat).options.find((x) => x.id === 'meerijden');
  const ride = RIDES[beat.ride] || RIDES.lift;
  return {
    id: ride.mode === 'auto' ? 'auto' : beat.ride, label: ride.label, etaS: o.clockS, price: 0, lines: [],
    stops: [{ name: beat.from || '', kind: 'halte' }, { name: beat.to || '', kind: 'halte' }],
  };
}

// per frame. ctx: { on, step, state.flags, busy, world, ask(beat)->Promise, ride(optie,dest)->Promise, script }
export function tickStoryTravel(ctx) {
  const { on, step, flags, world: w, ask, script } = ctx;
  if (!on || !step || step.end) return;
  const beat = beatFor(step.id, script);
  const g = destOf(step, w.storyGuide);
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
    if (choice === 'meerijden' && ctx.ride) {
      return Promise.resolve(ctx.ride(rideOption(beat), { x: g.x, y: g.y, name: beat.to })).then((r) => {
        if (r && r.aangekomen) return;
        applyTravel(w, beat, choice, g); // no scene possible: arrive directly
        w.addMessage(`Aangekomen in ${beat.to}`, 4, { kind: 'reis' });
      });
    }
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
