// Drift zones: three big roundabouts where drifting counts. Drive into a zone
// in a car, hold the handbrake into a bend, keep your foot down and chain
// slides; the run ends when you leave the zone, crash for good or after 90
// seconds. Points, combos and the multiplier are drift.js; medals (bronze,
// silver, gold) pay a prize once per tier and keep a record per zone. A small
// chip shows the running score anywhere you drift. Not a minigame that takes
// over the player (the car keeps driving): the activity hub hands it the
// map icon, the "doen en beleven" list and Ubbo's rows. `window.__drift` debug.
import { createDrift, stepDrift, driftMedal } from './drift.js';
import { recordChallengeResult, getChallengeRecord, recordStat, unlockAchievement, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { createRecorder, recordGhost, finishGhost, ghostAt, loadGhost, saveGhost } from './ghostreplay.js';
import { showGhostCar } from './ghostmesh.js';
import { KEYS } from './storagekeys.js';
import { loopbaanVerdien } from './loopbaanlive.js';

const DRIFT_ZONES = [
  { id: 'oost', name: 'Rotonde Oost', x: 1997, y: 666, r: 78, spot: { x: 2016.3, y: 722.6 } },
  { id: 'station', name: 'Stationsrotonde', x: -52, y: 1730, r: 58, spot: { x: -48, y: 1705 } },
  { id: 'hoendiep', name: 'Rotonde Hoendiep', x: -1392, y: 929, r: 60, spot: { x: -1364, y: 936.5 } },
];
export const DRIFT_MEDAL_AT = [1500, 3500, 7000];
const PRIZE = [0, 25, 60, 120];
const MAX_RUN = 90;
const EXIT_GRACE = 3;
const ACCENT = '#e8523a';

const drift = createDrift();
let run = null;
let outside = 0;
let lastVehicle = null;
let lastHealth = 100;
let chip = null;
let chipKey = '';
let world = null;

function driftEligible(v) {
  return !!v && !v.isBoat && !v.isHeli && !v.isBus && !v.isBike && !v.isScooter && !v.wrecked && !(v.model && (v.model.motorbike || v.model.name === 'tractor' || v.model.name === 'quad'));
}

const zoneAt = (x, y) => DRIFT_ZONES.find((z) => Math.hypot(x - z.x, y - z.y) <= z.r) || null;

function ensureChip() {
  if (chip || typeof document === 'undefined') return chip;
  chip = document.createElement('div');
  chip.id = 'drift-chip';
  chip.setAttribute('role', 'status');
  chip.hidden = true;
  document.body.appendChild(chip);
  return chip;
}

function showChip(html, key) {
  const c = ensureChip();
  if (!c) return;
  if (key === chipKey) return;
  chipKey = key;
  if (!html) { c.hidden = true; return; }
  c.innerHTML = html;
  c.hidden = false;
}

function best(zone) {
  const r = getChallengeRecord('drift-' + zone.id);
  return r && r.best != null ? r : null;
}

// localStorage can be blocked (tests, private windows): then there is no ghost
function ghostStore() {
  try { return localStorage; } catch { return { getItem: () => null, setItem: () => {} }; }
}

function startRun(w, zone) {
  run = { zone, score: 0, time: 0, rec: createRecorder(), ghost: loadGhost(ghostStore(), 'drift-' + zone.id, KEYS.ghosts) };
  outside = 0;
  w.driftRun = zone.id;
  const rec = best(zone);
  showCard(w, { kind: 'tip', kicker: 'Driftzone', title: zone.name, body: `Handrem de bocht in, gas erop en blijf glijden.${rec ? ` Record: ${rec.best} punten.` : ''}`, duration: 5, key: 'drift-start-' + zone.id, voice: false });
}

function finalize(w, why) {
  if (!run) return;
  let pts = run.score;
  if (drift.chain) { pts += Math.round(drift.cur); }
  const zone = run.zone;
  const rec0 = run.rec;
  run = null;
  showGhostCar(null);
  w.driftRun = null;
  drift.cur = 0; drift.chain = false; drift.mult = 1; drift.t = 0; drift.flips = 0; drift.sign = 0; drift.active = false;
  if (pts < 50) return;
  const id = 'drift-' + zone.id;
  const prev = (getChallengeRecord(id) || {}).medal || 0;
  const medal = driftMedal(pts, DRIFT_MEDAL_AT);
  const rec = recordChallengeResult(w, id, { value: pts, medal });
  const ghostSaved = saveGhost(ghostStore(), id, finishGhost(rec0, pts, { higher: true }), KEYS.ghosts);
  recordStat(w, 'driftRuns');
  if (medal >= 3) unlockAchievement(w, 'drift_goud');
  if (pts >= 5000) unlockAchievement(w, 'drift_5000');
  const prize = loopbaanVerdien(w, 'race', Math.max(0, (PRIZE[medal] || 0) - (PRIZE[prev] || 0)), { xp: 6 + medal * 2, n: 1, uniek: id }); // samen spelen (#365), loopbaan (#381)
  const lines = [`${pts} punten${medal ? ' · ' + MEDALS[medal].toLowerCase() : ''}`];
  if (rec && rec.newBest) lines.push('nieuw record');
  if (ghostSaved) lines.push('spookauto bewaard');
  if (prize) lines.push(`+€${prize}`);
  showCard(w, { kind: why === 'crash' ? 'fail' : 'prestatie', kicker: 'Driftzone: ' + zone.name, title: why === 'crash' ? 'Tegen de muur, maar wel gepunt' : 'Mooie slip', body: lines.join(' · '), duration: 6, key: 'drift-end-' + zone.id + '-' + pts, voice: false });
}

function tick(dt, w) {
  world = w;
  const v = w.player && w.player.inVehicle;
  if (!driftEligible(v) || w.paused || !dt) {
    if (run) finalize(w, 'uit');
    if (!v || !driftEligible(v)) { drift.cur = 0; drift.chain = false; drift.active = false; drift.mult = 1; }
    showChip('', '');
    lastVehicle = v || null;
    return;
  }
  if (v !== lastVehicle) { lastVehicle = v; lastHealth = v.health; }
  const crashed = v.health < lastHealth - 0.01;
  lastHealth = v.health;
  const res = stepDrift(drift, { slip: v.slipAngle || 0, speed: Math.abs(v.speed || 0), dt, crashed });
  if (run) {
    run.score += res.banked;
    run.time += dt;
    recordGhost(run.rec, run.time, v.x, v.y, v.angle);
    const gp = run.ghost ? ghostAt(run.ghost, run.time) : null;
    showGhostCar(gp ? { x: gp.x, y: gp.y, z: v.z, a: gp.a } : null);
    const here = zoneAt(v.x, v.y);
    outside = here && here === run.zone ? 0 : outside + dt;
    if (activityBlock(w) || w.pendingRespawn) finalize(w, 'uit');
    else if (res.crashed && run.score + drift.cur < 1) finalize(w, 'crash');
    else if (outside > EXIT_GRACE || run.time > MAX_RUN) finalize(w, 'tijd');
  } else if (!activityBlock(w)) {
    const z = zoneAt(v.x, v.y);
    if (z && Math.abs(v.speed) > 3) startRun(w, z);
  }
  const pts = Math.round((run ? run.score : 0) + (drift.chain ? drift.cur : 0));
  if (drift.chain || run) {
    const left = run ? Math.max(0, Math.ceil(MAX_RUN - run.time)) : 0;
    const mult = drift.chain ? drift.mult : 1;
    const key = `${pts}|${mult}|${left}|${drift.active ? 1 : 0}`;
    if (key !== chipKey) showChip(`<span class="dc-k">${run ? 'DRIFT · ' + run.zone.name : 'DRIFT'}</span><b class="dc-p">${pts.toLocaleString('nl-NL')}</b><span class="dc-m${drift.active ? ' on' : ''}">x${mult}</span>${run ? `<span class="dc-t">${left}s</span>` : ''}`, key);
  } else showChip('', '');
}

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, Math.PI * 0.2, Math.PI * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath();
  ctx.moveTo(1.9, -2.4); ctx.lineTo(3.6, -0.6); ctx.lineTo(0.9, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function bestOverall() {
  let m = 0, b = null;
  for (const z of DRIFT_ZONES) {
    const r = best(z);
    if (r) { m = Math.max(m, r.medal || 0); b = Math.max(b || 0, r.best); }
  }
  return { medal: m, best: b };
}

export const DRIFT_ZONE = {
  id: 'drift',
  layer: 'drift',
  legend: { kind: 'act-drift', label: 'Driftzone', note: 'rotondes om te driften: handrem, gas en een lange slip' },
  init(w) {
    world = w;
    window.__drift = {
      zones: () => DRIFT_ZONES.map((z) => ({ ...z })),
      state: () => ({ ...drift, run: run ? { zone: run.zone.id, score: run.score, time: run.time } : null }),
      feed: (inp) => stepDrift(drift, inp),
    };
  },
  spots: () => DRIFT_ZONES.map((z) => ({ id: 'drift-' + z.id, name: z.name, x: z.spot.x, y: z.spot.y, mode: 'drive' })),
  prompt: () => null,
  secondary(w) {
    const v = w.player && w.player.inVehicle;
    if (run || !driftEligible(v)) return [];
    const out = [];
    for (const z of DRIFT_ZONES) {
      if (Math.hypot(v.x - z.x, v.y - z.y) > z.r + 90) continue;
      const rec = best(z);
      out.push({ id: 'drift-' + z.id, x: z.x, y: z.y, h: 3, label: 'Driftzone: ' + z.name, sub: rec ? `Record: ${rec.best} punten` : 'Handrem, gas en een lange slip', kind: 'place' });
    }
    return out;
  },
  interact: () => false,
  active: () => false,
  quit: (w) => { if (run) finalize(w, 'uit'); },
  update() {},
  tick,
  icon: drawIcon,
  mapSub(s) {
    const z = DRIFT_ZONES.find((q) => 'drift-' + q.id === s.id);
    const rec = z && best(z);
    return rec ? `Driftzone · record ${rec.best} punten${rec.medal ? ' (' + MEDALS[rec.medal].toLowerCase() + ')' : ''}` : 'Driftzone: handrem, gas en een lange slip';
  },
  ubbo(w) {
    let near = DRIFT_ZONES[0], nd = Infinity;
    for (const z of DRIFT_ZONES) {
      const d = Math.hypot(z.x - w.player.x, z.y - w.player.y);
      if (d < nd) { nd = d; near = z; }
    }
    const b = bestOverall();
    return { name: 'Driftzone', sub: b.medal ? `record: ${MEDALS[b.medal].toLowerCase()}` : 'handrem en gas op de rotondes', dist: nd, x: near.spot.x, y: near.spot.y, play: 'drift', where: near.name, hint: 'rijd de rotonde op, handrem de bocht in en houd gas' };
  },
  bestOverall,
};
