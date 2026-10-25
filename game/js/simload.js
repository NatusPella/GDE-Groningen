import { cpuLevel } from './gfxprofile.js';

// Load-adaptive simulation: while adaptive quality reports CPU-bound frames
// (gfxprofile.js cpuLevel 1-2) the city thins out: fewer spawned cars,
// cyclists and walkers, far traffic and walkers think every second or third
// frame (with the skipped time added), far walkers animate at half rate.
// Back to normal as soon as cpuLevel drops. Mission, story, police and
// player vehicles and scripted people are never thinned.

const POP = [1, 0.75, 0.55, 0.4];
const STRIDE = [1, 2, 3, 4];
const FAR_AI = [Infinity, 90, 60, 40];

let frameNo = 0;
let forced = null;

export const simLevel = () => (forced !== null ? forced : cpuLevel());
const popScale = () => POP[simLevel()];
export const scaledTarget = (n) => Math.max(1, Math.round(n * popScale()));
export const farAIDist = () => FAR_AI[simLevel()];
export const nextSimFrame = () => ++frameNo;

// true when this far agent sits this frame out; its dt piles up in _simDt
export function skipFar(o, i, d, dt) {
  const lvl = simLevel();
  if (!lvl || d < FAR_AI[lvl] || (i + frameNo) % STRIDE[lvl] === 0) return false;
  o._simDt = (o._simDt || 0) + dt;
  return true;
}

// the dt to step an agent with: this frame's plus what it skipped
export function takeDt(o, dt) {
  const extra = o._simDt;
  if (!extra) return dt;
  o._simDt = 0;
  return Math.min(0.15, dt + extra);
}

// a vehicle the thinning must never touch
export const keepVehicle = (v) => v.driver === 'player' || v.missionCar || v.isHeroCar || v.isPolice || v.storyCar || v.scripted || v.isFoodtruck || v.racer || v.raceCar || v.cineTemp || v.perfTemp || v.hijacked;

if (typeof window !== 'undefined') window.__simLoad = { level: simLevel, force(l) { forced = l === null || l === undefined ? null : Math.max(0, Math.min(3, l)); } };
