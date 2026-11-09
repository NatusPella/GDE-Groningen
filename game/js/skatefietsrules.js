// Fiets- en step-ronde in het skatepark (#537): pure regels, geen DOM of THREE.
// De speler rijdt op zijn eigen fiets of step door het park; wheelies, sprongetjes
// en stoppies leveren punten. Wie het beste rondje rijdt, haalt een medaille.
//
//   node scripts/skatefiets_test.mjs

import { scaleTarget, scaleTimeLimit } from './difficulty.js';

export const RUN_S = 60;
export const runSeconds = (mode = 'standaard') => scaleTimeLimit(RUN_S, mode); // #800
export const MEDAL_AT = { goud: 650, zilver: 350, brons: 150 };
export const PUNT = { wheelieM: 10, hop: 40, stoppie: 20 };

export function createRun(mode = 'standaard') {
  return { t: 0, score: 0, wheelieM: 0, hops: 0, stoppies: 0, lastHop: false, wasStoppie: false, done: false, cap: runSeconds(mode), mode };
}

// Eén beeld. s: { speed (m/s), wheelie (bool), pitch (rad), hop (bool) }.
export function stepRun(r, dt, s) {
  if (!r || r.done) return r;
  const d = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
  r.t += d;
  const speed = Math.abs(Number.isFinite(s.speed) ? s.speed : 0);
  if (s.wheelie) r.wheelieM += speed * d;
  if (s.hop && !r.lastHop) r.hops++;
  r.lastHop = !!s.hop;
  const stoppie = (Number.isFinite(s.pitch) ? s.pitch : 0) < -0.12 && speed > 2;
  if (stoppie && !r.wasStoppie) r.stoppies++;
  r.wasStoppie = stoppie;
  r.score = Math.round(r.wheelieM * PUNT.wheelieM + r.hops * PUNT.hop + r.stoppies * PUNT.stoppie);
  if (r.t >= (r.cap || RUN_S)) r.done = true;
  return r;
}

export function medalFor(score, mode = 'standaard') {
  const f = (v) => scaleTarget(v, mode, false); // hoger is beter: ontspannen verlaagt de drempel
  if (score >= Math.round(f(MEDAL_AT.goud))) return 'goud';
  if (score >= Math.round(f(MEDAL_AT.zilver))) return 'zilver';
  if (score >= Math.round(f(MEDAL_AT.brons))) return 'brons';
  return null;
}

export function progressText(r) {
  const left = Math.max(0, Math.ceil((r.cap || RUN_S) - r.t));
  return `Fietsronde · ${left} s · ${r.score} punten · wheelie ${Math.round(r.wheelieM)} m · ${r.hops} sprongen · ${r.stoppies} stoppies`;
}
