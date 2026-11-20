// Pure rekenregels uit missions.js (ADR 0005): de jachtwachttijd, het vastlopen en het
// opnieuw spawnen van een achtervolgd voertuig, de beloning bij het overslaan van een
// overval en de etappes van de dijkrace. Afgesplitst uit missions.js (#497), zonder
// inhoudelijke wijziging; missions.js exporteert dezelfde namen nog steeds.
import { clamp } from './util.js';

// #591: skipping a heist stage with O pays half the mission reward, the same share a story skip pays.
// The mission stays playable; only the payout is honest about the part that was skipped.
export const HEIST_SKIP_SHARE = 0.5;
export function skipReward(reward) {
  return Math.round(((Number(reward) || 0) * HEIST_SKIP_SHARE) / 5) * 5;
}

// seconds a parked chase target waits for the player to come close before it flees by itself
export const CHASE_WAIT_MAX = 6;
// the wait for a parked target: CHASE_WAIT_MAX s, plus the metres to its `parked` ring at an easy 10 m/s (the bot measured 13 m/s through the city, with a flat tyre on the way)
export function chaseWaitMax(d0, st) {
  return CHASE_WAIT_MAX + Math.max(0, (d0 || 0) - (st.parked || 0)) / 10;
}

// #955: a fleeing vehicle that does not get anywhere (M07's tanker ended up in a dead-end side street by the Eemskanaal and sat
// there for good, the chase timing out as 'escaped') counts as stopped once it has stayed within CHASE_STUCK_RADIUS metres for
// CHASE_STUCK_S seconds. Kept pure so a test can prove the timing; S holds the anchor and the clock.
export const CHASE_STUCK_S = 12;
export const CHASE_STUCK_RADIUS = 6;
// Only counts while a player is close (d metres, given): a tanker at a red light or in a queue while you are still far away is
// waiting, not stuck, and ending the chase then would hand the stage over for free. The clock stands still while you are far.
export const CHASE_STUCK_NEAR = 80;
export function chaseStuckStep(S, v, dt, d) {
  if (!S.stuckAt || Math.hypot(v.x - S.stuckAt.x, v.y - S.stuckAt.y) > CHASE_STUCK_RADIUS) { S.stuckAt = { x: v.x, y: v.y }; S.stuckT = 0; return false; }
  if (Number.isFinite(d) && d > CHASE_STUCK_NEAR) { S.stuckT = 0; return false; }
  S.stuckT = (S.stuckT || 0) + dt;
  return S.stuckT >= CHASE_STUCK_S;
}

// #591: the road under a chase start may not be streamed in when the stage begins. Instead of failing
// the mission at once, the stage waits for it and tries again a few times (a clean failure was an
// unwinnable stage, and the player had done nothing wrong).
export const CHASE_SPAWN_WAIT_S = 8;
export const CHASE_SPAWN_RETRY_S = 0.5;

// What a chase stage does while its target could not spawn yet: 'wait' (no new attempt this frame),
// 'try' (spawn another one) or 'fail' (the road never came). Kept pure so a test can prove the timing.
export function chaseSpawnStep(S, dt) {
  S.spawnT = (S.spawnT || 0) + dt;
  if (S.spawnT > CHASE_SPAWN_WAIT_S) return 'fail';
  if (S.spawnT < (S.spawnTryAt || 0)) return 'wait';
  S.spawnTryAt = S.spawnT + CHASE_SPAWN_RETRY_S;
  return 'try';
}

export const DIJK_CP = 6;             // etappes: de voortgang is de afstand tot de sluis

// De etappe bij een afstand tot de sluis: puur, voor de tussenstand en de test (akte3_test.mjs).
export function dijkEtappe(af, len, cps = DIJK_CP, reach = 16) {
  if (!(len > 0)) return { cp: 0, s: 0, klaar: false };
  const deel = clamp(1 - af / len, 0, 1);
  const klaar = af <= reach;
  const cp = klaar ? cps : Math.min(cps - 1, Math.floor(deel * cps));
  return { cp, s: Math.round((deel * cps - cp) * 1000), klaar };
}
