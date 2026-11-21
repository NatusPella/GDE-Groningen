// De trainingsminigames van de voetbalcarrière (#1109, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 5): vijf korte oefeningen op het trainingsveld, puur en deterministisch (scripts/voetbal_training_test.mjs).
// Elke oefening hoort bij een vaardigheid: dribbelslalom (tempo), schotprecisie (schot), pass-parcours (pass), conditiesprint (uithouding) en dekken (verdedigen).
// De oefening levert een score van 0,5 tot 1,5 die `voetbalcarriere.train` omzet in groei (voetbalontwikkeling.trainingXp). Samen spelen: lokaal per speler, geen verlies, een beloning alleen voor de eigen speler.
// Geen DOM en geen THREE: de props staan in voetbaltraining3d.js, de uitvoering in voetbaltrainingrun.js. Het veld: x opzij (rechts positief), z vooruit, in meters.
import { makeRng } from './minigamekit.js';

export const SCORE_MIN = 0.5, SCORE_MAX = 1.5;
export const MAX_DT = 0.1;                                   // een lange frame (tabwissel) telt nooit als een sprong
export const SFX = { kick: 'football_kick', net: 'football_net', post: 'football_post', whistle: 'referee_whistle', done: 'sport_stinger' };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const round2 = (v) => Math.round(v * 100) / 100;
// De invoer van het toetsenbord of de controller, samengevoegd door de uitvoerder: ax (-1 links tot 1 rechts), ay (-1 achter tot 1 vooruit), act (vast), press (net ingedrukt), rel (net losgelaten).
const cleanInput = (i = {}) => ({ ax: clamp(num(i.ax), -1, 1), ay: clamp(num(i.ay), -1, 1), act: !!i.act, press: !!i.press, rel: !!i.rel });

export const DRILLS = [
  { id: 'slalom', focus: 'pace', naam: 'Dribbelslalom', kort: 'Loop om de kegels, steeds aan een andere kant.', keys: [['A', 'D'], 'sturen', ['SPATIE'], 'spurten'] },
  { id: 'schot', focus: 'shot', naam: 'Schotprecisie', kort: 'Vijf schoten op de hoekdoeltjes in het doel.', keys: [['A', 'D', 'W', 'S'], 'richten', ['SPATIE'], 'schieten'] },
  { id: 'pass', focus: 'pass', naam: 'Pass-parcours', kort: 'Speel de bal door zes hoepels.', keys: [['A', 'D'], 'richten', ['SPATIE'], 'passen'] },
  { id: 'conditie', focus: 'stamina', naam: 'Conditiesprint', kort: 'Haal alle punten, houd je adem vol.', keys: [['SPATIE'], 'spurten', ['A', 'D'], 'sturen'] },
  { id: 'dekken', focus: 'defend', naam: 'Een tegen een dekken', kort: 'Blijf dicht op de aanvaller en houd hem uit het doel.', keys: [['A', 'D', 'W', 'S'], 'lopen'] },
];
export const drillFor = (focus) => DRILLS.find((d) => d.focus === focus) || null;
export const drillById = (id) => DRILLS.find((d) => d.id === id) || null;

// De uitslag (0 tot 1) naar de score van de training (0,5 tot 1,5). Een oefening die niet af is levert niets op dan het minimum.
export const scoreFromPerf = (perf) => round2(SCORE_MIN + clamp(num(perf), 0, 1) * (SCORE_MAX - SCORE_MIN));
export const medalOf = (score) => (score >= 1.3 ? 'goud' : score >= 1.0 ? 'zilver' : score >= 0.75 ? 'brons' : '');

// ---- dribbelslalom (tempo) ----
const SL = { cones: 6, gap: 10, first: 12, finish: 74, speed: 6.5, sprint: 8.5, lateral: 5.5, touch: 1.0, pen: 1.5, par: 13, slow: 12, cap: 45 };
function newSlalom() {
  const cones = []; for (let i = 0; i < SL.cones; i++) cones.push({ x: 0, z: SL.first + i * SL.gap, side: i % 2 ? 1 : -1, done: false });
  return { p: { x: 0, z: 0 }, cones, pen: 0, hits: 0, misses: 0 };
}
function stepSlalom(s, inp, dt, ev) {
  const sp = inp.act ? SL.sprint : SL.speed;
  const z0 = s.p.z;
  s.p.x = clamp(s.p.x + inp.ax * SL.lateral * dt, -8, 8);
  s.p.z += sp * dt;
  for (const c of s.cones) {
    if (c.done) continue;
    if (Math.hypot(s.p.x - c.x, s.p.z - c.z) < SL.touch) { s.pen += SL.pen; s.hits++; c.done = true; ev.push('cone'); continue; }
    if (z0 < c.z && s.p.z >= c.z) {
      c.done = true;
      if (Math.sign(s.p.x - c.x) !== c.side) { s.pen += SL.pen; s.misses++; ev.push('wrongside'); } else ev.push('pass');
    }
  }
  if (s.p.z >= SL.finish || s.t >= SL.cap) { s.perf = clamp(1 - (s.t + s.pen - SL.par) / SL.slow, 0, 1); s.done = true; }
}

// ---- schotprecisie (schot) ----
const SH = { cap: 60, shots: 5, w: 7.32, h: 2.44, aimSpeed: 1.1, charge: 0.9, sweet: 0.8, goodR: 0.9, netR: 0.3 };
function newShot(rng) {
  const targets = [];
  const corners = [[-0.8, 0.2], [0.8, 0.2], [-0.8, 0.85], [0.8, 0.85], [0, 0.85]];
  for (let i = 0; i < SH.shots; i++) { const c = corners[Math.floor(rng() * corners.length)]; targets.push({ u: c[0], v: c[1] }); }
  return { aim: { u: 0, v: 0.5 }, charge: 0, taken: 0, targets, scores: [], last: null, rng, pause: 0 };
}
function stepShot(s, inp, dt, ev) {
  if (s.t >= SH.cap) { s.perf = s.scores.reduce((a, b) => a + b, 0) / SH.shots; s.done = true; return; }   // de tijd is om: wat niet geschoten is telt als nul
  if (s.pause > 0) { s.pause -= dt; return; }
  s.aim.u = clamp(s.aim.u + inp.ax * SH.aimSpeed * dt, -1.1, 1.1);
  s.aim.v = clamp(s.aim.v + inp.ay * SH.aimSpeed * dt, 0, 1.1);
  if (inp.act) s.charge = clamp(s.charge + dt / SH.charge, 0, 1);
  if (inp.rel && s.charge > 0.05) {
    const miss = Math.abs(s.charge - SH.sweet);                  // te zacht of te hard: de bal wijkt af
    const ang = s.rng() * Math.PI * 2, mag = miss * 1.6 * s.rng();
    const u = s.aim.u + Math.cos(ang) * mag, v = s.aim.v + Math.sin(ang) * mag * 0.6;
    const t = s.targets[s.taken];
    const d = Math.hypot(u - t.u, (v - t.v) * 0.8);
    const inside = Math.abs(u) <= 1 && v >= 0 && v <= 1;
    const sc = inside ? clamp(1 - d / SH.goodR, 0, 1) : 0;
    s.scores.push(round2(sc)); s.last = { u: round2(u), v: round2(v), d: round2(d), inside };
    ev.push('kick'); ev.push(!inside ? 'miss' : d <= SH.netR ? 'net' : d <= SH.goodR ? 'goal' : 'miss');
    s.taken++; s.charge = 0; s.pause = 0.9;
    if (s.taken >= SH.shots) { s.perf = s.scores.reduce((a, b) => a + b, 0) / SH.shots; s.done = true; }
  }
}

// ---- pass-parcours (pass) ----
const PA = { cap: 60, passes: 6, hoop: 1.6, max: 32, charge: 1.0, turn: 1.4 };
function newPass(rng) {
  const hoops = []; let b = { x: 0, z: 0 };
  for (let i = 0; i < PA.passes; i++) {
    const side = i % 2 ? 1 : -1;
    const h = { x: clamp(b.x + side * (6 + rng() * 5), -14, 14), z: b.z + 9 + rng() * 9, hit: null };
    hoops.push(h); b = { x: h.x, z: h.z };
  }
  return { ball: { x: 0, z: 0 }, hoops, i: 0, angle: 0, charge: 0, rng, hits: 0, scores: [], last: null, pause: 0 };
}
function stepPass(s, inp, dt, ev) {
  if (s.t >= PA.cap) { s.perf = s.scores.reduce((a, b) => a + b, 0) / PA.passes; s.done = true; return; }
  if (s.pause > 0) { s.pause -= dt; return; }
  s.angle = clamp(s.angle + inp.ax * PA.turn * dt, -1.2, 1.2);   // 0 is recht vooruit
  if (inp.act) s.charge = clamp(s.charge + dt / PA.charge, 0, 1);
  if (inp.rel && s.charge > 0.05) {
    const dist = s.charge * PA.max, jit = (s.rng() - 0.5) * 0.12 * dist;
    const a = s.angle + jit * 0.05;
    const to = { x: s.ball.x + Math.sin(a) * dist, z: s.ball.z + Math.cos(a) * dist + jit * 0.3 };
    const h = s.hoops[s.i], d = Math.hypot(to.x - h.x, to.z - h.z);
    const sc = clamp(1 - Math.max(0, d - PA.hoop) / 5, 0, 1);
    h.hit = d <= PA.hoop; if (h.hit) s.hits++;
    s.scores.push(round2(sc)); s.last = { x: round2(to.x), z: round2(to.z), d: round2(d) };
    ev.push('kick'); ev.push(h.hit ? 'net' : 'miss');
    s.ball = { x: to.x, z: to.z }; s.i++; s.charge = 0; s.pause = 0.8;
    if (s.i >= PA.passes) { s.perf = s.scores.reduce((a, b) => a + b, 0) / PA.passes; s.done = true; }
    else { const nx = s.hoops[s.i]; nx.z = Math.max(nx.z, s.ball.z + 7); s.angle = 0; }   // de volgende hoepel ligt altijd voor de bal
  }
}

// ---- conditiesprint (uithouding) ----
const CO = { points: 8, gap: 14, jog: 4.2, sprint: 8.2, drain: 0.24, regain: 0.16, blown: 2.8, back: 0.3, par: 18, slow: 22, cap: 60, lane: 3 };
function newConditie() {
  const pts = []; for (let i = 0; i < CO.points; i++) pts.push({ x: 0, z: (i + 1) * CO.gap, done: false });
  return { p: { x: 0, z: 0 }, pts, stamina: 1, blown: false, blowns: 0, offLane: 0 };
}
function stepConditie(s, inp, dt, ev) {
  let sp = CO.jog;
  if (s.blown) { sp = CO.blown; s.stamina = clamp(s.stamina + CO.regain * dt, 0, 1); if (s.stamina >= CO.back) s.blown = false; }
  else if (inp.act && s.stamina > 0) { sp = CO.sprint; s.stamina = clamp(s.stamina - CO.drain * dt, 0, 1); if (s.stamina <= 0) { s.blown = true; s.blowns++; ev.push('puffed'); } }
  else s.stamina = clamp(s.stamina + CO.regain * dt, 0, 1);
  s.p.x = clamp(s.p.x + inp.ax * 4 * dt, -CO.lane, CO.lane);
  s.p.z += sp * dt;
  for (const pt of s.pts) if (!pt.done && s.p.z >= pt.z) { pt.done = true; ev.push('point'); }
  if (s.pts.every((q) => q.done) || s.t >= CO.cap) { s.perf = clamp(1 - (s.t - CO.par) / CO.slow, 0, 1); s.done = true; }
}

// ---- dekken (verdedigen) ----
const DE = { dur: 24, near: 2.0, speed: 5.6, goalZ: 16, adv: 2.2, lat: 4.2, maxThrough: 4 };
function newDekken(rng) {
  return { p: { x: 0, z: 6 }, a: { x: 0, z: 0, dir: 1, turn: 0.8 }, rng, near: 0, through: 0, goalZ: DE.goalZ };
}
function stepDekken(s, inp, dt, ev) {
  const a = s.a;
  s.p.x = clamp(s.p.x + inp.ax * DE.speed * dt, -10, 10);
  s.p.z = clamp(s.p.z + inp.ay * DE.speed * dt, -4, DE.goalZ + 2);
  a.turn -= dt;
  if (a.turn <= 0) { a.dir = s.rng() < 0.5 ? -1 : 1; a.turn = 0.5 + s.rng() * 0.9; }
  const d = Math.hypot(s.p.x - a.x, s.p.z - a.z);
  a.x = clamp(a.x + a.dir * DE.lat * dt, -9, 9);
  a.z += (d < 1.6 ? -0.8 : DE.adv) * dt;                          // wie dicht op hem zit, houdt hem op
  if (a.z < 0) a.z = 0;
  if (d <= DE.near) s.near += dt;
  if (a.z >= DE.goalZ) { s.through++; a.x = 0; a.z = 0; ev.push('through'); }
  if (s.t >= DE.dur) {
    s.perf = clamp((s.near / DE.dur) * 1.4, 0, 1) * 0.7 + clamp(1 - s.through / DE.maxThrough, 0, 1) * 0.3;
    s.done = true;
  }
}

// ---- gedeelde draad ----
export function newDrill(id, seed = 1) {
  const d = drillById(id);
  if (!d) return null;
  const rng = makeRng((Number(seed) | 0) + id.length * 7919);
  const base = { id, focus: d.focus, t: 0, done: false, perf: null, ev: [] };
  if (id === 'slalom') return { ...base, ...newSlalom() };
  if (id === 'schot') return { ...base, ...newShot(rng) };
  if (id === 'pass') return { ...base, ...newPass(rng) };
  if (id === 'conditie') return { ...base, ...newConditie() };
  return { ...base, ...newDekken(rng) };
}
const STEPS = { slalom: stepSlalom, schot: stepShot, pass: stepPass, conditie: stepConditie, dekken: stepDekken };
// Eén stap: geeft de gebeurtenissen van deze stap (strings) terug. Na `done` doet een stap niets meer.
export function stepDrill(s, input, dt) {
  const ev = [];
  if (!s || s.done) return ev;
  const d = clamp(num(dt), 0, MAX_DT);
  s.t += d;
  STEPS[s.id](s, cleanInput(input), d, ev);
  if (s.done) ev.push('done');
  return ev;
}
export const drillScore = (s) => (s && s.done ? scoreFromPerf(s.perf) : null);
// De gebeurtenis van een stap naar een bestaande sfxEvent-sleutel, of null (stil).
export function sfxFor(ev) {
  return ev === 'kick' ? SFX.kick : ev === 'net' || ev === 'goal' ? SFX.net : ev === 'done' ? SFX.done : ev === 'cone' || ev === 'wrongside' || ev === 'puffed' || ev === 'through' ? SFX.whistle : null;
}
// De regel voor het bord: voortgang per oefening.
export function drillStatus(s) {
  if (!s) return '';
  if (s.id === 'slalom') return `Kegel ${Math.min(SL.cones, s.cones.filter((c) => c.done).length + 1)}/${SL.cones} · ${s.t.toFixed(1)} s${s.pen ? ` +${s.pen.toFixed(1)}` : ''}`;
  if (s.id === 'schot') return `Schot ${Math.min(SH.shots, s.taken + 1)}/${SH.shots}`;
  if (s.id === 'pass') return `Pass ${Math.min(PA.passes, s.i + 1)}/${PA.passes} · hoepels ${s.hits}`;
  if (s.id === 'conditie') return `Punt ${Math.min(CO.points, s.pts.filter((q) => q.done).length + 1)}/${CO.points} · ${s.t.toFixed(1)} s${s.blown ? ' · buiten adem' : ''}`;
  return `Nog ${Math.max(0, Math.ceil(DE.dur - s.t))} s · doorgebroken ${s.through}`;
}
export const CONST = { SL, SH, PA, CO, DE };
