// Fiets- en step-ronde in het skatepark (#537): de speler blijft op zijn eigen
// fiets of step en rijdt een minuut door het park; wheelies, sprongetjes en
// stoppies leveren punten. De regels staan in skatefietsrules.js; dit bestand is
// de glue (meldingen, medaille en de wereldhaak).
import { hoofdspeler } from './players.js';
import { showBanner } from './cinematics.js';
import { recordChallengeResult, getChallengeRecord, MEDALS } from './achievements.js';
import { getSettings } from './settings.js';
import { cleanDifficulty, difficultyRecordKey } from './difficulty.js'; // #800
import { createRun, stepRun, medalFor, progressText, RUN_S } from './skatefietsrules.js';

const PARK = { x: 0, y: 0 }; // gevuld door start(): de plek van de ingang
const REACH = 120; // m van de ingang waarbinnen de ronde telt
let run = null;
let nextMsg = 0;

export const skatefietsRun = () => run;

function invoer(w) {
  const p = hoofdspeler(w);
  const v = p.inVehicle;
  if (!v || !(v.isBike || v.isScooter)) return null;
  const ws = v.wheelieState || {};
  return {
    speed: Math.abs(v.speed || 0),
    wheelie: !!ws.up,
    pitch: Number.isFinite(v.pitch) ? v.pitch : 0,
    hop: !!ws.hop,
    v,
  };
}

export function startSkatefiets(w, at) {
  const i = invoer(w);
  if (!i) { w.addMessage('Stap op je fiets of step om de fietsronde te doen.', 3); return false; }
  if (run) return false;
  run = createRun(cleanDifficulty(getSettings().difficulty));
  PARK.x = at.x; PARK.y = at.y;
  nextMsg = 0;
  w.addMessage('Fietsronde! Wheelies, sprongen en stoppies tellen. Een minuut.', 4);
  return true;
}

export function endSkatefiets(w, reason = '') {
  if (!run) return;
  const r = run;
  run = null;
  const mode = cleanDifficulty(getSettings().difficulty);
  const medal = medalFor(r.score, mode);
  const key = difficultyRecordKey(mode, 'skatefiets');
  const best = getChallengeRecord(key);
  recordChallengeResult(w, key, { value: r.score, medal });
  const stats = [['Punten', String(r.score)], ['Wheelie', `${Math.round(r.wheelieM)} m`], ['Sprongen', String(r.hops)], ['Stoppies', String(r.stoppies)]];
  if (best && best.best != null && r.score > best.best) stats.push(['Record', 'nieuw!']);
  showBanner({ kind: 'pass', title: 'Fietsronde', reason: reason || (medal ? `Medaille: ${MEDALS[medal].toLowerCase()}` : 'Geen medaille dit keer'), reward: 0, stats });
}

// Elk frame na de speler-update (main.js).
export function updateSkatefiets(w, dt) {
  if (!run) return;
  const i = invoer(w);
  if (!i) { endSkatefiets(w, 'Je stapte af.'); return; }
  if (Math.hypot(i.v.x - PARK.x, i.v.y - PARK.y) > REACH) { endSkatefiets(w, 'Je reed het park uit.'); return; }
  stepRun(run, dt, i);
  if (run.t >= nextMsg) {
    nextMsg = run.t + 10;
    w.addMessage(progressText(run), 2.5);
  }
  if (run.done) endSkatefiets(w, '');
}
