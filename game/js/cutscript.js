// Cutscene direction language (#136): a scene is data, this module turns it into
// a pure, deterministic sampler. No THREE, no DOM: the host (cutscenehost.js)
// puts the sampled state on meshes, the tests run it in plain node.
//
//   const scene = compileScene(def, { lines, duration });   // throws on a broken scene
//   const s = scene.sample(t, anchor, env);                 // { actors, props, camera, speaker }
//   const a = fitAnchor(scene, anchor, env, { radii });     // the anchor (turned, or moved when radii are given) where nothing stands in a wall
//
// A scene def (all coordinates are LOCAL to the anchor: f = forward, s = left, h = up in m):
//   id, actors: { <id>: { look, at: [f, s], face: deg | 'actor:<id>', anim, speaker, gaze, sit: seat height in m, road: '<prop>' } }
//   crowd: a spectator crowd or a list of them ({ shape: 'line' | 'ring', count, seed, ... }, crowdplan.js; local f/s metres), drawn by cutscenehost.js, never indoors
//   set: 'keuken' | 'kantoor' | 'serverkamer' | 'loket' | 'omakeuken' | 'kroeg' | 'woonkamer' | 'garage' (a built set: the opening's kitchen, the office and the server room of #950/#956), fx: [{ t, fx: 'buzz' | 'door' | 'cups' | 'tablecups' | 'sfx' | 'pulse' | 'naam', ... }] (host effects, see cutscenehost.js)
//   props:  { <id>: { kind, at: [f, s, h], face: deg, hidden, road: true | 'cycle', follows: '<prop>' } }
//           road: het voertuig/de fiets volgt bij de start de echte weg (roadPathDef hieronder; true = berijdbaar,
//           'cycle' = ook fietspad); follows: rijdt met dat voertuig mee op zijn eigen hoogte (de matras op het dak)
//   cues:   [{ t, actor | prop, ...verb }]   verbs, see VERBS
//   shots:  [{ t, shot: 'cut' | 'dolly' | 'orbit' | 'follow', ... }]
// `t` is seconds, or 'L<n>' / 'L<n>+1.5' (relative to the start of spoken line n), or 'end'.
// The spoken lines themselves are never part of a scene: they come from the story data.
//
// Pose-clips (poseclips.js, #955): a cue { t, actor, anim: '<clip>', dur, delay, speed, mirror } plays a keyframe clip on top of the
// base animation (idle, walk, talk); anim: 'stop' releases a held clip; a prop of kind 'kat' takes a cat clip ('kat-zitten' ...). A clip is a
// function of the scene time (no state, no extra network traffic: a guest that plays the same scene sees the same). An unknown clip
// falls back to the base layer.
//
// Animation layer: actoranim.js (animateActor(mesh, { anim, speed, gaze, t, dt }),
// gaze = head yaw in rad, positive = target to the left of the body). The names
// below must equal its ANIMS (scripts/cutscript_test.mjs checks that).

export const ACTOR_ANIMS = ['idle', 'walk', 'run', 'talk', 'wave', 'point', 'shrug', 'nod', 'shake', 'laugh', 'carry', 'lean', 'hips', 'phone', 'cheer', 'clap', 'look', 'ride', 'zwem', 'klim', 'sprong'];
import { propKindIssue, propFoot, CARRY_LOW } from './cutscenemodels.js';
import { CUTSCENE_PROPS } from './propregister.js';
import { calmShots } from './cineshots.js';
import { lightIssues, resolveShotLight } from './shotlight.js';
import { crowdSpecIssue } from './crowdplan.js';
import { isClip, isCatClip, clipLayers, clipDuration, CLIP_STOP } from './poseclips.js';
export const PROP_KINDS = [
  'doos', 'tas', 'bestelbus', 'fiets', 'duif', 'radio', 'bord', 'koffer',
  'bal', 'auto', 'matras', 'bakkie', 'automaat', 'aanhanger', 'trekker', 'politie',
  'duiventil', 'zuil', 'klembord', 'briefje', 'kat', 'botsauto', 'koe', 'snackwagen',
  'tankwagen', 'limo', 'klomp', 'stempel', 'pinpas', 'map', 'bierviltje', 'fotolijst',
  'statief', 'krat', 'pan', 'vuurwerk', 'koelbox', 'jas', 'aktetas', 'hesjes',
  'container', 'scherm', 'prikbord', 'broodtrommel', 'kantoorwagen', 'frituuraanhanger', 'friteuse', 'deken',
  'soepketel', 'mosterdpot', 'kaart', 'hek', 'pinautomaat', 'jerrycan', 'goudbal', 'polsstok',
  'bierglas', 'jeneverglas', 'wijnglas', 'kiosk', 'sticker',
  ...CUTSCENE_PROPS, // de gedeelde props van het register (propregister.js)
];
const VERBS = ['walk', 'anim', 'face', 'gaze', 'carry', 'drop', 'move', 'path', 'spin', 'bob', 'show', 'hide', 'sit'];
export const SHOTS = ['cut', 'dolly', 'orbit', 'follow', 'close', 'reaction', 'ots', 'insert', 'tracking', 'crane', 'handheld', 'push'];
// The host can scale or remove camera shake (a11y.js: Beweging beperken).
let shakeFilter = (a) => a;
export function setShakeFilter(fn) { shakeFilter = typeof fn === 'function' ? fn : (a) => a; }
const WALK_SPEED = 1.4;
const EYE_H = 1.55;

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isVec = (v, n) => Array.isArray(v) && v.length >= n && v.slice(0, n).every(isNum);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const rad = (deg) => (deg * Math.PI) / 180;

// --- timing -----------------------------------------------------------------

// 12, 'L3', 'L3+1.5', 'L3-0.5', 'end' -> seconds (null when the reference does not exist)
export function resolveTime(spec, lines, duration) {
  if (isNum(spec)) return spec;
  if (spec === 'end') return duration;
  const m = typeof spec === 'string' && /^L(\d+)([+-]\d+(?:\.\d+)?)?$/.exec(spec);
  if (!m) return null;
  const l = lines && lines[+m[1]];
  return l ? l.at + (m[2] ? +m[2] : 0) : null;
}

// --- validation -------------------------------------------------------------

// Everything that can be checked without a world. Returns a list of Dutch-free
// developer messages; empty = fine. opts: lines, duration, maxStill (s), maxShot (s).
export function validateScene(def, opts = {}) {
  const out = [];
  const err = (m) => out.push(m);
  if (!def || typeof def !== 'object') return ['scene is geen object'];
  const lines = opts.lines || null, duration = opts.duration ?? def.duration;
  if (!def.id) err('scene zonder id');
  const actors = def.actors || {}, props = def.props || {};
  for (const [id, a] of Object.entries(actors)) {
    if (!a.look) err(`acteur ${id} zonder look`);
    if (!isVec(a.at, 2)) err(`acteur ${id}: at moet [f, s] zijn`);
    if (a.anim && !ACTOR_ANIMS.includes(a.anim)) err(`acteur ${id}: onbekende anim ${a.anim}`);
    if (a.anim && !ACTOR_ANIMS.includes(a.anim) && isClip(a.anim)) err(`acteur ${id}: een clip hoort in een cue, niet in anim van de acteur`);
    if (a.sit !== undefined && a.sit !== false && !(isNum(a.sit) && a.sit > 0)) err(`acteur ${id}: sit is een zithoogte in m`);
    if (typeof a.face === 'string' && !refOk(a.face, actors, props)) err(`acteur ${id}: face verwijst nergens heen: ${a.face}`);
    if (a.road !== undefined && (typeof a.road !== 'string' || !props[a.road])) err(`acteur ${id}: road verwijst naar een onbekende prop`);
  }
  for (const [id, p] of Object.entries(props)) {
    if (!PROP_KINDS.includes(p.kind)) err(`prop ${id}: onbekende soort ${p.kind}`);
    else { const bad = propKindIssue(p.kind); if (bad) err(`prop ${id}: ${bad}`); }
    if (!isVec(p.at, 2)) err(`prop ${id}: at moet [f, s, h?] zijn`);
    if (p.road !== undefined && ![true, 'road', 'cycle', 'foot'].includes(p.road)) err(`prop ${id}: road is true, 'cycle' of 'foot'`);
    if (p.follows !== undefined && !props[p.follows]) err(`prop ${id}: follows verwijst naar een onbekende prop`);
  }
  if (def.crowd !== undefined) {
    if (def.set) err('crowd hoort buiten, niet in een binnenset');
    for (const c of Array.isArray(def.crowd) ? def.crowd : [def.crowd]) { const bad = crowdSpecIssue(c); if (bad) err(bad); }
  }
  const timeOf = (spec, what) => {
    const t = resolveTime(spec, lines, duration);
    if (t == null || !isNum(t)) { err(`${what}: ongeldige tijd ${JSON.stringify(spec)}`); return null; }
    if (t < 0 || (isNum(duration) && t > duration + 1e-6)) err(`${what}: tijd ${t.toFixed(2)} valt buiten de scène (0-${duration})`);
    return t;
  };
  const cues = def.cues || [];
  cues.forEach((c, i) => {
    const what = `cue ${i}`;
    timeOf(c.t, what);
    if (c.actor && !actors[c.actor]) err(`${what}: onbekende acteur ${c.actor}`);
    if (c.prop && !props[c.prop]) err(`${what}: onbekende prop ${c.prop}`);
    if (!c.actor && !c.prop) err(`${what}: geen acteur of prop`);
    const verbs = VERBS.filter((v) => c[v] !== undefined);
    if (!verbs.length) err(`${what}: geen werkwoord (${VERBS.join('/')})`);
    if (c.walk !== undefined && !c.actor) err(`${what}: walk hoort bij een acteur`);
    if (c.walk !== undefined && !(Array.isArray(c.walk) && c.walk.length && c.walk.every((p) => isVec(p, 2)))) err(`${what}: walk is een lijst [f, s]-punten`);
    if (c.path !== undefined && !(Array.isArray(c.path) && c.path.length >= 2 && c.path.every((p) => isVec(p, 2)))) err(`${what}: path is een lijst van minstens twee punten`);
    if (c.ride !== undefined && c.walk === undefined) err(`${what}: ride hoort bij walk`);
    if (c.speed !== undefined && !(isNum(c.speed) && c.speed > 0)) err(`${what}: speed moet > 0 zijn`);
    if (c.anim !== undefined && c.actor && !ACTOR_ANIMS.includes(c.anim) && !isClip(c.anim) && c.anim !== CLIP_STOP) err(`${what}: onbekende anim ${c.anim}`);
    if (c.anim !== undefined && c.prop && !isCatClip(c.anim) && c.anim !== CLIP_STOP) err(`${what}: een prop kent alleen een kat-clip, geen ${c.anim}`);
    if (c.anim !== undefined && c.prop && isCatClip(c.anim) && props[c.prop] && props[c.prop].kind !== 'kat') err(`${what}: ${c.anim} hoort bij een kat`);
    if (c.anim !== undefined && c.actor && isCatClip(c.anim)) err(`${what}: ${c.anim} hoort bij een kat, niet bij een acteur`);
    if (c.delay !== undefined && !(isNum(c.delay) && c.delay >= 0)) err(`${what}: delay is seconden >= 0`);
    if (c.mirror !== undefined && typeof c.mirror !== 'boolean') err(`${what}: mirror is true of false`);
    if (c.anim !== undefined && c.dur !== undefined && !(isNum(c.dur) && c.dur > 0)) err(`${what}: dur moet > 0 zijn`);
    if (c.sit !== undefined && !c.actor) err(`${what}: sit hoort bij een acteur`);
    if (c.sit !== undefined && typeof c.sit !== 'boolean' && !(isNum(c.sit) && c.sit > 0)) err(`${what}: sit is true, false of een zithoogte`);
    if (typeof c.face === 'string' && !refOk(c.face, actors, props)) err(`${what}: face verwijst nergens heen: ${c.face}`);
    if (typeof c.gaze === 'string' && !['speaker', 'camera'].includes(c.gaze) && !refOk(c.gaze, actors, props)) err(`${what}: gaze verwijst nergens heen: ${c.gaze}`);
    if (c.drop !== undefined && !props[c.drop]) err(`${what}: drop wijst naar onbekende prop ${c.drop}`);
    if (c.carry !== undefined && !props[c.carry]) err(`${what}: carry wijst naar onbekende prop ${c.carry}`);
    if (c.move !== undefined && !isVec(c.move, 2)) err(`${what}: move is [f, s, h?]`);
    if (c.move !== undefined && !(isNum(c.dur) && c.dur > 0)) err(`${what}: move heeft dur > 0 nodig`);
  });
  const shots = def.shots || [];
  if (!shots.length) err('scene heeft geen camera-shots');
  const st = [];
  shots.forEach((s, i) => {
    const what = `shot ${i}`;
    const t = timeOf(s.t, what);
    st.push(t);
    if (!SHOTS.includes(s.shot)) err(`${what}: onbekend type ${s.shot}`);
    for (const k of ['look', 'target']) if (s[k] !== undefined && !targetOk(s[k], actors, props)) err(`${what}: ${k} verwijst nergens heen: ${JSON.stringify(s[k])}`);
    if (s.shot === 'cut' && !(isVec(s.at, 3) || targetOk(s.at, actors, props))) err(`${what}: cut heeft at [f, s, h] nodig`);
    if (s.shot === 'dolly' && !(isVec(s.from, 3) && isVec(s.to, 3))) err(`${what}: dolly heeft from en to [f, s, h] nodig`);
    if (s.shot === 'orbit' && !(isNum(s.radius) && s.radius > 0.3 && s.target !== undefined)) err(`${what}: orbit heeft target en radius > 0.3 nodig`);
    if (s.shot === 'follow' && !(typeof s.target === 'string' && actors[s.target.replace(/^actor:/, '')])) err(`${what}: follow heeft een acteur als target nodig`);
    if (s.shot === 'push') {
      if (!(typeof s.target === 'string')) err(`${what}: push heeft een target nodig`);
      for (const k of ['d0', 'd1']) if (s[k] !== undefined && !(isNum(s[k]) && s[k] >= 0.5 && s[k] <= 40)) err(`${what}: ${k} is een afstand van 0,5 tot 40 m`);
      for (const k of ['fov0', 'fov1']) if (s[k] !== undefined && !(isNum(s[k]) && s[k] >= 14 && s[k] <= 90)) err(`${what}: ${k} buiten 14-90`);
      if (s.ease !== undefined && !['smooth', 'lin', 'in', 'out'].includes(s.ease)) err(`${what}: ease is smooth, lin, in of out`);
    }
    if (s.fov !== undefined && !(isNum(s.fov) && s.fov >= 14 && s.fov <= 90)) err(`${what}: fov buiten 14-90`);
    for (const m of lightIssues(s.light, `${what}: light`)) err(m); // licht per shot (#1323, shotlight.js)
  });
  for (const m of lightIssues(def.light, 'light')) err(m);
  if (shots.length && st[0] !== 0) err('het eerste shot moet op t = 0 beginnen');
  for (let i = 1; i < st.length; i++) if (st[i] != null && st[i - 1] != null && st[i] <= st[i - 1]) err(`shot ${i}: tijden moeten oplopen`);
  // regie-kwaliteit: geen kale lange shots, niemand die te lang stilstaat
  if (isNum(duration) && !out.length) {
    const maxShot = opts.maxShot ?? 10, maxStill = opts.maxStill ?? 9;
    st.forEach((t, i) => { const end = i + 1 < st.length ? st[i + 1] : duration; if (end - t > maxShot && shots[i].shot === 'cut') err(`shot ${i}: ${(end - t).toFixed(1)} s zonder camerabeweging`); });
    const scene = compileScene(def, { lines, duration, skipValidate: true });
    for (const id of Object.keys(actors)) {
      const still = scene.stillStretches(id);
      for (const [a, b] of still) if (b - a > maxStill) err(`acteur ${id} staat ${(b - a).toFixed(1)} s stil (${a.toFixed(1)}-${b.toFixed(1)}) zonder gebaar of beweging`);
    }
  }
  return out;
}

function refOk(ref, actors, props) {
  const m = /^(actor|prop):(.+)$/.exec(ref);
  if (m) return !!(m[1] === 'actor' ? actors : props)[m[2]];
  return !!actors[ref] || !!props[ref];
}

// mid:<a>,<b> or mid:<a>,<b>@<height>
const MID = /^mid:([^,]+),([^@]+?)(?:@([\d.]+))?$/;

function targetOk(t, actors, props) {
  if (isVec(t, 3) || isVec(t, 2)) return true;
  if (typeof t !== 'string') return false;
  if (t === 'speaker') return true;
  const mid = MID.exec(t);
  if (mid) return refOk(mid[1], actors, props) && refOk(mid[2], actors, props);
  return refOk(t.replace(/@[\d.]+$/, ''), actors, props);
}

// --- compile ----------------------------------------------------------------

const stripRef = (r) => r.replace(/^(actor|prop):/, '');

export function compileScene(def, opts = {}) {
  const lines = opts.lines || [];
  const duration = opts.duration ?? def.duration ?? (lines.length ? lines[lines.length - 1].at + lines[lines.length - 1].dur + 1 : 10);
  if (!opts.skipValidate) {
    const issues = validateScene(def, { ...opts, duration });
    if (issues.length) throw new Error(`cutscene ${def.id}: ${issues.join('; ')}`);
  }
  const T = (spec) => resolveTime(spec, lines, duration);
  const actors = def.actors || {}, props = def.props || {};
  const cues = (def.cues || []).map((c) => ({ ...c, t: T(c.t) })).sort((a, b) => a.t - b.t);
  // pan-budget (cineshots.js): hooguit één zichtbare pan per scène, de rest een rustige drift
  const shots = calmShots((def.shots || []).map((s) => ({ ...s, t: T(s.t) })).sort((a, b) => a.t - b.t), duration);
  const lightOf = shots.map((s) => resolveShotLight(def.light, s.light));

  // per actor: movement segments [{t0, t1, pts}], anim/gaze/face/carry events
  const track = {};
  for (const [id, a] of Object.entries(actors)) {
    track[id] = { pos0: [a.at[0], a.at[1]], face0: a.face, segs: [], anims: [{ t: 0, v: a.anim || 'idle' }], gazes: [{ t: 0, v: a.gaze ?? null }], faces: [], carries: [], vis: [], sits: [{ t: 0, v: a.sit || 0 }], clips: [] };
  }
  const drops = [];
  const ptrack = {};
  for (const [id, p] of Object.entries(props)) ptrack[id] = { pos0: [p.at[0], p.at[1], p.at[2] ?? 0], hidden0: !!p.hidden, moves: [], spins: [], bobs: [], vis: [], clips: [] };

  for (const c of cues) {
    if (c.actor) {
      const k = track[c.actor];
      if (c.walk) {
        const from = endOf(k);
        const pts = [from, ...c.walk.map((p) => [p[0], p[1]])];
        const len = pathLen(pts);
        const sp = c.speed || (c.anim === 'run' ? 3.2 : WALK_SPEED);
        const t0 = c.t, t1 = t0 + len / sp;
        k.segs.push({ t0, t1, pts, len, speed: sp, run: c.anim === 'run', ride: !!c.ride });
      }
      // a clip plays on top of the base anim; walking, sitting and 'stop' release a held one
      if (c.anim !== undefined && !c.walk && isClip(c.anim)) k.clips.push({ t0: c.t, name: c.anim, dur: c.dur, delay: c.delay, speed: c.speed, mirror: !!c.mirror });
      else if (c.anim === CLIP_STOP) k.clips.push({ t0: c.t, name: null });
      else if (c.anim !== undefined && !c.walk) k.anims.push({ t: c.t, v: c.anim });
      if (c.walk || (c.sit !== undefined && c.sit !== false)) k.clips.push({ t0: c.t, name: null });
      if (c.gaze !== undefined) k.gazes.push({ t: c.t, v: c.gaze });
      if (c.face !== undefined) k.faces.push({ t: c.t, v: c.face });
      if (c.carry !== undefined) k.carries.push({ t: c.t, v: c.carry });
      // show/hide: someone gets into a vehicle (still tracked, so the camera can follow the cab)
      if (c.sit !== undefined) k.sits.push({ t: c.t, v: c.sit === true ? (actors[c.actor].sit || 0.46) : c.sit || 0 });
      if (c.show !== undefined) k.vis.push({ t: c.t, v: true });
      if (c.hide !== undefined) k.vis.push({ t: c.t, v: false });
      if (c.drop !== undefined) { k.carries.push({ t: c.t, v: null }); drops.push({ t: c.t, actor: c.actor, prop: c.drop }); }
    } else if (c.prop) {
      const k = ptrack[c.prop];
      if (c.move) k.moves.push({ t0: c.t, t1: c.t + c.dur, from: null, to: [c.move[0], c.move[1], c.move[2] ?? k.pos0[2]] });
      if (c.path) {
        const pts = c.path.map((p) => [p[0], p[1], p[2] ?? k.pos0[2]]);
        k.moves.push({ t0: c.t, t1: c.t + (c.dur || pathLen(pts) / (c.speed || 3)), path: pts });
      }
      if (c.anim !== undefined) k.clips.push(isCatClip(c.anim) ? { t0: c.t, name: c.anim, dur: c.dur, delay: c.delay, speed: c.speed, mirror: !!c.mirror } : { t0: c.t, name: null });
      if (c.spin !== undefined) k.spins.push({ t: c.t, v: c.spin });
      if (c.bob !== undefined) k.bobs.push({ t: c.t, v: c.bob });
      if (c.show !== undefined) k.vis.push({ t: c.t, v: true });
      if (c.hide !== undefined) k.vis.push({ t: c.t, v: false });
    }
  }

  const last = (arr, t) => { let r = arr[0]; for (const e of arr) { if (e.t <= t + 1e-9) r = e; else break; } return r; };
  const speakerAt = (t) => { const l = lines.find((q) => t >= q.at && t < q.at + q.dur); return l ? l.speaker : null; };
  const actorOfSpeaker = (name) => {
    if (!name) return null;
    for (const [id, a] of Object.entries(actors)) if (id === name || [].concat(a.speaker || []).includes(name)) return id;
    return null;
  };
  // wie de spreker aanspreekt (23-11): de vorige andere spreker, anders de volgende. Een spreker met gaze 'speaker' kijkt naar
  // hem (de luisteraars kijken al naar de spreker); zo praat niemand met zijn hoofd van zijn gesprekspartner af.
  const lineActors = lines.map((l) => actorOfSpeaker(l.speaker));
  const addressee = (t, me) => {
    let li = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].at <= t) li = i;
    for (let i = li - 1; i >= 0; i--) if (lineActors[i] && lineActors[i] !== me) return lineActors[i];
    for (let i = li + 1; i < lines.length; i++) if (lineActors[i] && lineActors[i] !== me) return lineActors[i];
    return null;
  };

  function actorPos(id, t) {
    const k = track[id];
    let p = k.pos0, moving = null;
    for (const s of k.segs) {
      if (t >= s.t1) { p = s.pts[s.pts.length - 1]; continue; }
      if (t >= s.t0) { const q = along(s.pts, (t - s.t0) * s.speed); p = [q.f, q.s]; moving = { a: q.a, speed: s.speed, run: s.run, ride: s.ride }; }
      break;
    }
    return { f: p[0], s: p[1], moving };
  }

  // facing: the heading while walking, then held until the next turn; turns ease over 0.5 s
  function actorFacing(id, t) {
    const k = track[id];
    const m = actorPos(id, t).moving;
    if (m) return m.a;
    const keys = [{ t: 0, v: k.face0 }, ...k.faces];
    for (const s of k.segs) {
      const q = along(s.pts, s.len);
      keys.push({ t: s.t1, v: { heading: q.a } });
      // a face cue given while walking ("draai je naar Mem" on the line he walks in on) holds once he arrives: without this the
      // walk's own end heading won and he talked with his back half turned to the one he addressed (M25.outro, 23-11)
      const during = k.faces.filter((f) => f.t >= s.t0 && f.t < s.t1);
      if (during.length) keys.push({ t: s.t1 + 1e-6, v: during[during.length - 1].v });
    }
    keys.sort((x, y) => x.t - y.t);
    let i = 0;
    while (i + 1 < keys.length && keys[i + 1].t <= t + 1e-9) i++;
    const ang = (key) => {
      const v = key.v;
      if (isNum(v)) return rad(v);
      if (v && v.heading !== undefined) return v.heading;
      if (typeof v === 'string') { const o = pointOf(v, key.t, true); const me = actorPos(id, key.t); return Math.atan2(o.s - me.s, o.f - me.f); }
      return 0;
    };
    const to = ang(keys[i]);
    if (i === 0) return to;
    const from = ang(keys[i - 1]);
    return keys[i].v && keys[i].v.heading !== undefined ? to : from + angDiff(from, to) * ease((t - keys[i].t) / 0.5);
  }

  // a ref or vector -> local {f, s, h}
  // raw: props are taken where they were put (not in a carrier's hands), so turning towards one cannot loop
  function pointOf(ref, t, raw = false) {
    if (isVec(ref, 3)) return { f: ref[0], s: ref[1], h: ref[2] };
    if (isVec(ref, 2)) return { f: ref[0], s: ref[1], h: 0 };
    if (ref === 'speaker') { const id = actorOfSpeaker(speakerAt(t)); if (id) return pointOf(id, t, raw); const ids = Object.keys(actors); return ids.length > 1 ? pointOf(`mid:${ids[0]},${ids[1]}`, t, raw) : pointOf(ids[0], t, raw); }
    const mid = MID.exec(ref);
    if (mid) { const a = pointOf(mid[1], t, raw), b = pointOf(mid[2], t, raw); return { f: (a.f + b.f) / 2, s: (a.s + b.s) / 2, h: mid[3] ? +mid[3] : (a.h + b.h) / 2 }; }
    const hm = /@([\d.]+)$/.exec(ref);
    const id = stripRef(ref.replace(/@[\d.]+$/, ''));
    if (actors[id]) { const p = actorPos(id, t); return { f: p.f, s: p.s, h: hm ? +hm[1] : EYE_H - 0.15 }; }
    if (props[id]) { const p = propState(id, t, raw); return { f: p.f, s: p.s, h: (hm ? +hm[1] : 0.4) + p.h }; }
    return { f: 0, s: 0, h: 0 };
  }

  function propState(id, t, raw = false) {
    const k = ptrack[id], p = props[id];
    let pos = k.pos0.slice(), a = rad(p.face || 0);
    for (const m of k.moves) {
      if (t >= m.t1) { pos = (m.path ? m.path[m.path.length - 1] : m.to).slice(); continue; }
      if (t >= m.t0) {
        const u = (t - m.t0) / (m.t1 - m.t0);
        if (m.path) { const q = along3(m.path, u); pos = [q.f, q.s, q.h]; a = q.a; }
        else pos = pos.map((v, i) => lerp(v, m.to[i], ease(u)));
      }
      break;
    }
    // put down: stays where the carrier stood
    const dr = drops.filter((d) => d.prop === id && d.t <= t + 1e-9).pop();
    if (dr) { const ap = actorPos(dr.actor, dr.t), af = actorFacing(dr.actor, dr.t); pos = [ap.f + Math.cos(af) * 0.5, ap.s + Math.sin(af) * 0.5, 0]; }
    // carried: rides along with the actor's hands (#864: close to the hands, not loose in front of the
    // chest: small flat things at chest height, bags/boxes/suitcases at the carrier's hip height)
    if (!raw) for (const [aid, ak] of Object.entries(track)) {
      const c = last([{ t: 0, v: null }, ...ak.carries], t);
      if (c.v === id) {
        const ap = actorPos(aid, t), af = actorFacing(aid, t);
        const laag = CARRY_LOW.includes(props[id].kind);
        pos = [ap.f + Math.cos(af) * 0.3, ap.s + Math.sin(af) * 0.3, laag ? 0.9 : 0.98];
        a = af;
      }
    }
    const spin = last([{ t: 0, v: 0 }, ...k.spins], t).v;
    const bob = last([{ t: 0, v: 0 }, ...k.bobs], t).v;
    if (spin) a += spin * Math.PI * 2 * t;
    if (bob) pos[2] += Math.sin(t * 5) * bob;
    const vis = last([{ t: 0, v: !k.hidden0 }, ...k.vis], t).v;
    return { f: pos[0], s: pos[1], h: pos[2], a, visible: vis };
  }

  // local -> world
  const world = (anchor, f, s) => {
    const c = Math.cos(anchor.facing), n = Math.sin(anchor.facing);
    return { x: anchor.x + f * c - s * n, y: anchor.y + f * n + s * c };
  };

  const CAM_CLEAR = 1.5, PROP_CLEAR = 0.7;
  function cameraAt(t, anchor, env) {
    let i = 0;
    while (i + 1 < shots.length && shots[i + 1].t <= t + 1e-9) i++;
    const sh = shots[i];
    const end = i + 1 < shots.length ? shots[i + 1].t : duration;
    const u = clamp01((t - sh.t) / Math.max(0.05, end - sh.t));
    let pos, look, fovNow = null;
    const tg = (spec) => pointOf(spec, t);
    switch (sh.shot) {
      case 'cut': {
        pos = isVec(sh.at, 3) ? { f: sh.at[0], s: sh.at[1], h: sh.at[2] } : tg(sh.at);
        look = tg(sh.look ?? 'speaker');
        break;
      }
      case 'dolly': {
        const k = ease(u);
        pos = { f: lerp(sh.from[0], sh.to[0], k), s: lerp(sh.from[1], sh.to[1], k), h: lerp(sh.from[2], sh.to[2], k) };
        look = tg(sh.look ?? 'speaker');
        break;
      }
      case 'orbit': {
        const c = tg(sh.target);
        const a = rad(sh.start ?? 0) + rad(sh.sweep ?? 60) * u;
        const h = lerp(sh.h0 ?? 2, sh.h1 ?? sh.h0 ?? 2, ease(u));
        pos = { f: c.f + Math.cos(a) * sh.radius, s: c.s + Math.sin(a) * sh.radius, h };
        // #734 (F16): een eigen look op een orbit werd genegeerd; gebruik hem nu
        look = sh.look ? tg(sh.look) : { f: c.f, s: c.s, h: c.h };
        break;
      }
      case 'follow': {
        const id = stripRef(sh.target);
        const p = actorPos(id, t), af = actorFacing(id, t);
        const d = sh.dist ?? 3.2;
        pos = { f: p.f - Math.cos(af) * d + Math.cos(af + Math.PI / 2) * (sh.side ?? 0.6), s: p.s - Math.sin(af) * d + Math.sin(af + Math.PI / 2) * (sh.side ?? 0.6), h: sh.h ?? 1.7 };
        look = { f: p.f + Math.cos(af) * 1.5, s: p.s + Math.sin(af) * 1.5, h: EYE_H - 0.15 };
        break;
      }
      // #734 (F16): de ontbrekende shotgrammatica. Alle maten zijn lokaal
      // (f/s/h) en dezelfde als de bestaande typen, zodat host en tests niets
      // extra hoeven te weten.
      case 'close':
      case 'reaction': {
        const id = stripRef(sh.target ?? 'speaker');
        const c = tg(sh.target ?? 'speaker');
        const af = actorFacing(id, t);
        const d = sh.dist ?? (sh.shot === 'close' ? 1.2 : 1.8);
        const side = sh.side ?? (sh.shot === 'close' ? 0.18 : 0.4);
        // #1325: de camera staat VOOR het gezicht (in de kijkrichting), niet erachter: een close-up of reactie toonde het achterhoofd
        pos = { f: c.f + Math.cos(af) * d + Math.cos(af + Math.PI / 2) * side, s: c.s + Math.sin(af) * d + Math.sin(af + Math.PI / 2) * side, h: c.h + (sh.hEye ?? 0.12) };
        look = { f: c.f, s: c.s, h: c.h + 0.02 };
        sh.fov = sh.fov ?? (sh.shot === 'close' ? 30 : 36);
        break;
      }
      case 'ots': {
        const van = stripRef(sh.from ?? 'speaker');
        const naar = stripRef(sh.target ?? 'speaker');
        const a = actorPos(van, t), af = actorFacing(van, t);
        const c = tg(sh.target ?? 'speaker');
        pos = { f: a.f - Math.cos(af) * (sh.dist ?? 1.1) + Math.cos(af + Math.PI / 2) * (sh.side ?? 0.55), s: a.s - Math.sin(af) * (sh.dist ?? 1.1) + Math.sin(af + Math.PI / 2) * (sh.side ?? 0.55), h: EYE_H + 0.12 };
        look = { f: c.f, s: c.s, h: c.h + 0.02 };
        sh.fov = sh.fov ?? 38;
        break;
      }
      case 'insert': {
        const target = sh.at != null ? (isVec(sh.at, 3) ? { f: sh.at[0], s: sh.at[1], h: sh.at[2] } : tg(sh.at)) : tg(sh.target ?? 'speaker');
        pos = { f: target.f - Math.cos(rad(sh.angle ?? 0)) * (sh.dist ?? 1.1), s: target.s - Math.sin(rad(sh.angle ?? 0)) * (sh.dist ?? 1.1), h: target.h + (sh.hEye ?? -0.05) };
        look = sh.look ? tg(sh.look) : target;
        sh.fov = sh.fov ?? 32;
        break;
      }
      case 'tracking': {
        const id = stripRef(sh.target);
        const p = actorPos(id, t), af = actorFacing(id, t);
        const d = sh.dist ?? 4.2, side = sh.side ?? 1.5;
        pos = { f: p.f - Math.cos(af) * d + Math.cos(af + Math.PI / 2) * side, s: p.s - Math.sin(af) * d + Math.sin(af + Math.PI / 2) * side, h: sh.h ?? 1.6 };
        look = { f: p.f, s: p.s, h: EYE_H - 0.15 };
        sh.fov = sh.fov ?? 40;
        break;
      }
      case 'crane': {
        const k = ease(u);
        pos = { f: lerp(sh.from[0], sh.to[0], k), s: lerp(sh.from[1], sh.to[1], k), h: lerp(sh.from[2], sh.to[2], k) };
        look = tg(sh.look ?? sh.target ?? 'speaker');
        break;
      }
      // push: a move along the line to the target (a track-in, a slow zoom, a startled rush, a low angle). angle 0 = in front of the
      // face (face: deg for a prop or a point), d0 -> d1 the distance, fov0 -> fov1 the lens, h0 -> h1 the height, lookH the height looked at
      case 'push': {
        const id = stripRef(String(sh.target).replace(/@[\d.]+$/, ''));
        const c = tg(sh.target);
        const base = actors[id] ? actorFacing(id, t) : rad(sh.face ?? 0);
        const a = base + rad(sh.angle ?? 0);
        const k = sh.ease === 'in' ? u * u : sh.ease === 'out' ? 1 - (1 - u) * (1 - u) : sh.ease === 'lin' ? u : ease(u);
        const d = lerp(sh.d0 ?? 3, sh.d1 ?? sh.d0 ?? 3, k);
        pos = { f: c.f + Math.cos(a) * d, s: c.s + Math.sin(a) * d, h: lerp(sh.h0 ?? 1.5, sh.h1 ?? sh.h0 ?? 1.5, k) };
        look = { f: c.f, s: c.s, h: sh.lookH ?? c.h };
        fovNow = lerp(sh.fov0 ?? sh.fov ?? 38, sh.fov1 ?? sh.fov0 ?? sh.fov ?? 38, k);
        break;
      }
      case 'handheld': {
        const k = ease(u);
        pos = { f: lerp(sh.from[0], sh.to[0], k), s: lerp(sh.from[1], sh.to[1], k), h: lerp(sh.from[2], sh.to[2], k) };
        look = tg(sh.look ?? sh.target ?? 'speaker');
        const amt = shakeFilter(sh.amount ?? 0.035);
        pos.f += Math.sin(t * 2.7) * amt; pos.s += Math.sin(t * 3.1 + 1.2) * amt; pos.h += Math.sin(t * 2.2 + 0.4) * amt * 0.6;
        break;
      }
    }
    if (sh.shake && shakeFilter(sh.shake) > 0) {
      const a = shakeFilter(sh.shake);
      pos = { f: pos.f + Math.sin(t * 1.3) * a, s: pos.s + Math.sin(t * 1.9 + 2) * a, h: pos.h + Math.sin(t * 1.7 + 1) * a * 0.6 };
    }
    // a camera never stands inside a person: pushed out to CAM_CLEAR, away from them (continuous in t)
    if (pos.h < 2.4 && def.set !== 'keuken') for (const id of Object.keys(track)) {
      if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
      const p = actorPos(id, t);
      let dx = pos.f - p.f, ds = pos.s - p.s, d = Math.hypot(dx, ds);
      if (d >= CAM_CLEAR) continue;
      if (d < 0.05) { dx = pos.f - look.f; ds = pos.s - look.s; d = Math.hypot(dx, ds) || 1; }
      pos = { f: p.f + dx / d * CAM_CLEAR, s: p.s + ds / d * CAM_CLEAR, h: pos.h };
    }
    if (def.set !== 'keuken') for (const id of Object.keys(ptrack)) {
      const q = propState(id, t);
      const foot = propFoot(props[id].kind);
      if (foot && q.visible) {
        // a vehicle is a box, not a point: the camera leaves it through the nearest face, as far as it is high
        const c = Math.cos(q.a), sn = Math.sin(q.a), dx0 = pos.f - q.f, ds0 = pos.s - q.s;
        const lx = dx0 * c + ds0 * sn, ls = -dx0 * sn + ds0 * c;
        const hx = foot[0] / 2 + PROP_CLEAR, hs = foot[1] / 2 + PROP_CLEAR;
        if (pos.h > q.h + foot[2] + 0.3 || pos.h < q.h - 0.3 || Math.abs(lx) >= hx || Math.abs(ls) >= hs) continue;
        let nx = lx, ns = ls;
        if (hx - Math.abs(lx) < hs - Math.abs(ls)) nx = (lx < 0 ? -1 : 1) * hx; else ns = (ls < 0 ? -1 : 1) * hs;
        pos = { f: q.f + nx * c - ns * sn, s: q.s + nx * sn + ns * c, h: pos.h };
        continue;
      }
      if (!q.visible || pos.h > q.h + 1.4 || pos.h < q.h - 0.3) continue;
      let dx = pos.f - q.f, ds = pos.s - q.s, d = Math.hypot(dx, ds);
      if (d >= PROP_CLEAR) continue;
      if (d < 0.05) { dx = pos.f - look.f; ds = pos.s - look.s; d = Math.hypot(dx, ds) || 1; }
      pos = { f: q.f + dx / d * PROP_CLEAR, s: q.s + ds / d * PROP_CLEAR, h: pos.h };
    }
    const P = world(anchor, pos.f, pos.s), L = world(anchor, look.f, look.s);
    const z0 = anchor.z || 0;
    let cam = fitCamera({ x: P.x, y: P.y, z: z0 + pos.h }, { x: L.x, y: L.y, z: z0 + look.h }, env);
    // fitCamera may have pulled the camera in from a wall, next to a person: push out again unless that lands in a wall or a prop
    let propsNear = null;
    const propBlocks = (x, y) => {
      if (!propsNear) {
        propsNear = [];
        for (const id of Object.keys(ptrack)) {
          const q = propState(id, t);
          if (!q.visible) continue;
          const foot = propFoot(props[id].kind), W = world(anchor, q.f, q.s);
          const hi = foot ? q.h + foot[2] + 0.3 : q.h + 1.4;
          if (cam.z - z0 > hi || cam.z - z0 < q.h - 0.3) continue;
          propsNear.push({ x: W.x, y: W.y, r: (foot ? Math.max(foot[0], foot[1]) / 2 : 0) + PROP_CLEAR });
        }
      }
      return propsNear.some((q) => Math.hypot(x - q.x, y - q.y) < q.r - 1e-6);
    };
    if (def.set !== 'keuken' && cam.z - z0 < 2.4) for (const id of Object.keys(track)) {
      if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
      const q = actorPos(id, t), W = world(anchor, q.f, q.s);
      const dx = cam.x - W.x, dy = cam.y - W.y, d = Math.hypot(dx, dy);
      if (d >= CAM_CLEAR || d < 0.05) continue;
      const nx = W.x + dx / d * CAM_CLEAR, ny = W.y + dy / d * CAM_CLEAR;
      if (env && env.solid && env.solid(nx, ny, cam.z)) continue;
      if (env && env.clamp) { const c2 = env.clamp(nx, ny, cam.z, 'camera'); if (c2 && (Math.abs(c2.x - nx) > 1e-6 || Math.abs(c2.y - ny) > 1e-6)) continue; }
      if (propBlocks(nx, ny)) continue;
      cam = { ...cam, x: nx, y: ny };
    }
    // still inside someone's personal space (the push out landed in a wall or a prop, so fitCamera had pulled the camera in beside them: a
    // back or a head filled the lens, M02.intro and M03.intro in the real world): the free spot round them nearest to where the shot wanted to be
    if (def.set !== 'keuken' && cam.z - z0 < 2.4) {
      const people = [];
      for (const id of Object.keys(track)) {
        if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
        const q = actorPos(id, t);
        people.push(world(anchor, q.f, q.s));
      }
      const tooClose = (x, y) => people.some((W) => Math.hypot(x - W.x, y - W.y) < CAM_CLEAR - 1e-6);
      if (tooClose(cam.x, cam.y)) {
        const near = people.reduce((b, W) => (!b || Math.hypot(cam.x - W.x, cam.y - W.y) < Math.hypot(cam.x - b.x, cam.y - b.y) ? W : b), null);
        let best = null, bd = Infinity;
        for (const r of [CAM_CLEAR + 0.1, 2.3, 3.2, 4.5]) {
          for (let k = 0; k < 16; k++) {
            const a = k / 16 * Math.PI * 2, x = near.x + Math.cos(a) * r, y = near.y + Math.sin(a) * r;
            if (env && env.solid && env.solid(x, y, cam.z)) continue;
            if (tooClose(x, y) || propBlocks(x, y)) continue;
            if (env && env.clamp) { const c2 = env.clamp(x, y, cam.z, 'camera'); if (c2 && (Math.abs(c2.x - x) > 1e-6 || Math.abs(c2.y - y) > 1e-6)) continue; }
            const d = Math.hypot(x - P.x, y - P.y);
            if (d < bd) { bd = d; best = { x, y }; }
          }
          if (best) break;
        }
        if (best) cam = { ...cam, x: best.x, y: best.y };
      }
    }
    // #858: a camera that the wall guard moved and that ended up right on the subject (a back or a
    // head filling the lens, C00.3) backs off along its own view axis to a normal shot distance, as
    // long as that free spot is not in a wall, a tree or a vehicle. Deterministic: no previous-frame
    // state, and a shot that was authored close (the intended distance is small) is left alone.
    if (!def.set) {
      const intended = { x: P.x, y: P.y, z: z0 + pos.h };
      const subj = { x: L.x, y: L.y, z: z0 + look.h };
      const dSubj = Math.hypot(cam.x - subj.x, cam.y - subj.y, cam.z - subj.z);
      const dWas = Math.hypot(intended.x - subj.x, intended.y - subj.y, intended.z - subj.z);
      const moved = Math.hypot(cam.x - intended.x, cam.y - intended.y) + Math.abs(cam.z - intended.z);
      const want = Math.min(2.6, dWas);
      if (moved > 0.15 && dSubj < want - 0.05) {
        let bx = cam.x - subj.x, by = cam.y - subj.y, bz = cam.z - subj.z;
        const bl = Math.hypot(bx, by, bz) || 1;
        bx /= bl; by /= bl; bz /= bl;
        let best = null;
        for (let k = 1; k <= 16 && !best; k++) {
          const dd = dSubj + (want - dSubj) * (k / 16);
          const c = { x: subj.x + bx * dd, y: subj.y + by * dd, z: subj.z + bz * dd };
          if (env && env.solid && env.solid(c.x, c.y, c.z)) continue;
          if (env && env.tree && env.tree(c.x, c.y, c.z)) continue;
          if (propBlocks(c.x, c.y)) continue;
          if (env && env.clamp) {
            const c2 = env.clamp(c.x, c.y, c.z, 'camera');
            if (c2 && (Math.abs(c2.x - c.x) > 1e-6 || Math.abs(c2.y - c.y) > 1e-6 || Math.abs((c2.z ?? c.z) - c.z) > 1e-6)) continue;
          }
          best = c;
        }
        if (best) cam = best;
      }
      // the same guard can land the camera on somebody's back while the look target (the car) is
      // at a normal distance: keep 2,2 m from every visible actor too when the camera was moved.
      if (moved > 0.15 && cam.z - z0 < 2.4) {
        let near = null, nd = Infinity;
        for (const id of Object.keys(track)) {
          if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
          const q = actorPos(id, t), W = world(anchor, q.f, q.s);
          const d = Math.hypot(cam.x - W.x, cam.y - W.y);
          if (d < nd) { nd = d; near = W; }
        }
        if (near && nd < 1.45) {
          let best = null, bd = Infinity;
          for (const r of [2.2, 2.6, 3.0, 3.6]) {
            for (let k = 0; k < 24; k++) {
              const a = k / 24 * Math.PI * 2, x = near.x + Math.cos(a) * r, y = near.y + Math.sin(a) * r;
              if (env && env.solid && env.solid(x, y, cam.z)) continue;
              if (env && env.tree && env.tree(x, y, cam.z)) continue;
              if (propBlocks(x, y)) continue;
              if (env && env.clamp) {
                const c2 = env.clamp(x, y, cam.z, 'camera');
                if (c2 && (Math.abs(c2.x - x) > 1e-6 || Math.abs(c2.y - y) > 1e-6)) continue;
              }
              const d = Math.hypot(x - cam.x, y - cam.y);
              if (d < bd) { bd = d; best = { x, y }; }
            }
            if (best) break;
          }
          if (best) cam = { ...cam, x: best.x, y: best.y };
        }
      }
    }
    return {
      position: clearOfTrees(cam, { x: L.x, y: L.y, z: z0 + look.h }, env),
      lookAt: { x: L.x, y: L.y, z: z0 + look.h },
      fov: fovNow ?? sh.fov ?? 46, cut: u === 0 || (t - sh.t) < 1 / 30, shotIndex: i,
      // licht per shot (#1323): het eigen licht van het shot of dat van de scène; null = het wereldlicht
      light: lightOf[i] ?? null,
    };
  }

  // the director: everything the host needs to draw frame t
  function sample(t, anchor, env) {
    const speaker = speakerAt(t);
    const speakId = actorOfSpeaker(speaker);
    const outA = {}, outP = {};
    for (const [id, k] of Object.entries(track)) {
      const p = actorPos(id, t);
      const w = fit(world(anchor, p.f, p.s), env);
      const a = actorFacing(id, t) + anchor.facing;
      let anim = last(k.anims, t).v;
      if (p.moving) anim = p.moving.ride ? 'ride' : p.moving.run ? 'run' : 'walk';
      else if (id === speakId && (anim === 'idle')) anim = 'talk';
      const carrying = last([{ t: 0, v: null }, ...k.carries], t).v;
      if (carrying && !p.moving && anim === 'idle') anim = 'carry';
      if (carrying && p.moving && !p.moving.ride) anim = p.moving.run ? 'run' : 'carry';
      // gaze: body-relative head yaw, clamped
      let gaze = 0;
      const g = last(k.gazes, t).v;
      const gt = g === 'speaker' ? (speakId && speakId !== id ? speakId : speakId === id ? addressee(t, id) : null) : g;
      if (gt && gt !== 'camera') {
        const o = pointOf(gt, t);
        gaze = Math.max(-1.0, Math.min(1.0, angDiff(actorFacing(id, t), Math.atan2(o.s - p.s, o.f - p.f))));
      }
      outA[id] = { x: w.x, y: w.y, h: anchor.z || 0, a, anim, speed: p.moving ? p.moving.speed : 0, gaze, look: actors[id].look, speaking: id === speakId, carrying, sit: p.moving ? 0 : last(k.sits, t).v, visible: last([{ t: 0, v: true }, ...k.vis], t).v, clips: clipLayers(k.clips, t) };
    }
    for (const id of Object.keys(ptrack)) {
      const s = propState(id, t);
      const w = fit(world(anchor, s.f, s.s), env);
      outP[id] = { x: w.x, y: w.y, h: (anchor.z || 0) + s.h, a: s.a + anchor.facing, visible: s.visible, kind: props[id].kind, clips: clipLayers(ptrack[id].clips, t) };
    }
    return { actors: outA, props: outP, camera: cameraAt(t, anchor, env), speaker, speakerActor: speakId };
  }

  // [t0, t1] stretches where an actor neither moves nor changes anim nor gaze
  // nor turns; used by the validator to flag people standing around.
  function stillStretches(id) {
    const k = track[id];
    const marks = new Set([0, duration]);
    for (const s of k.segs) { marks.add(s.t0); marks.add(s.t1); }
    for (const e of [...k.anims, ...k.gazes, ...k.faces, ...k.carries, ...k.sits]) if (e.t > 0) marks.add(e.t);
    for (const e of k.clips) { marks.add(e.t0 + (e.delay || 0)); if (e.name) marks.add(Math.min(duration, e.t0 + (e.delay || 0) + clipDuration(e.name, e))); }
    for (const c of cues) if (c.actor === id) marks.add(c.t);
    // speaking counts as life (the talk anim runs), so cut stretches at line edges
    const ts = [...marks].filter((x) => x >= 0 && x <= duration).sort((a, b) => a - b);
    const out = [];
    let from = null;
    for (let i = 0; i + 1 < ts.length; i++) {
      const mid = (ts[i] + ts[i + 1]) / 2;
      const alive = actorPos(id, mid).moving || clipLayers(k.clips, mid).length > 0 || last([{ t: 0, v: true }, ...k.vis], mid).v === false || last(k.anims, mid).v !== 'idle' || last(k.gazes, mid).v === 'speaker' && !!lines.length || (lines.length && actorOfSpeaker(speakerAt(mid)) === id);
      if (alive) { if (from != null) out.push([from, ts[i]]); from = null; } else if (from == null) from = ts[i];
    }
    if (from != null) out.push([from, duration]);
    return out;
  }

  return { id: def.id, duration, lines, sample, stillStretches, shots, cues };
}

// --- clipping: keep the set out of buildings -------------------------------------
// env (all optional, supplied by the host from the world):
//   solid(x, y, z) -> true when the point is inside a building or wall
//   clamp(x, y, z, kind) -> { x, y, z } the point moved into the allowed space; kind 'actor' | 'prop' | 'camera'
//                           (the flat upstairs: inside its walls and above the cutaway)
//   tree(x, y, z) -> true when a tree trunk or crown covers that point (#955): a camera
//                    in a tree steps out of it and the anchor turns away from it
function fit(p, env) {
  if (!env || !env.clamp) return p;
  const q = env.clamp(p.x, p.y, 0, 'actor');
  return q ? { x: q.x, y: q.y } : p;
}

// #955: a camera that sits inside a tree (the M02 establishing shot could stand in a
// street tree: trunk and branches filled the frame) steps out through the nearest
// side: first towards the subject (a tighter shot with the same framing), then up
// out of the crown. A crown that still hangs between camera and subject is left out
// of the drawn trees by the host (scene3d.js), so the view stays free.
function clearOfTrees(pos, look, env) {
  if (!env || !env.tree || !env.tree(pos.x, pos.y, pos.z)) return pos;
  for (let k = 1; k <= 6; k++) {
    const u = k / 6 * 0.55;
    const q = { x: pos.x + (look.x - pos.x) * u, y: pos.y + (look.y - pos.y) * u, z: pos.z + (look.z - pos.z) * u * 0.55 };
    // niet in de persoon van het onderwerp stappen: een camera hoort op minstens 1,6 m te blijven
    if (Math.hypot(q.x - look.x, q.y - look.y, (q.z - look.z) * 0.5) < 1.6) break;
    if (!env.tree(q.x, q.y, q.z)) return q;
  }
  for (let k = 1; k <= 8; k++) {
    const z = pos.z + k * 0.7;
    if (!env.tree(pos.x, pos.y, z)) return { ...pos, z };
  }
  return pos;
}

// A camera that sits in a wall is moved into free space. #858: first straight back along the view
// axis (away from what it looks at, so the shot keeps its distance and the subject stays in
// frame), then to the side, and only as a last resort towards what it looks at or over the roof.
// The old order pulled the camera towards the subject and put a back or a head in the lens in
// C00.3. Returns {x, y, z}.
export function fitCamera(pos, look, env) {
  if (!env) return pos;
  let p = pos;
  if (env.clamp) { const q = env.clamp(p.x, p.y, p.z, 'camera'); if (q) p = { x: q.x, y: q.y, z: q.z ?? p.z }; }
  if (!env.solid || !env.solid(p.x, p.y, p.z)) return p;
  const free = (x, y, z) => !env.solid(x, y, z) && !(env.tree && env.tree(x, y, z));
  const clampOk = (x, y, z) => {
    if (!env.clamp) return true;
    const q = env.clamp(x, y, z, 'camera');
    return !q || (Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 1e-6 && Math.abs((q.z ?? z) - z) < 1e-6);
  };
  // 1. back along the horizontal view axis: the same shot, further away. Keep the camera height.
  const dx = p.x - look.x, dy = p.y - look.y, dl = Math.hypot(dx, dy);
  if (dl > 1e-6) {
    const ux = dx / dl, uy = dy / dl;
    for (let d = 0.6; d <= 12; d += 0.6) {
      const c = { x: p.x + ux * d, y: p.y + uy * d, z: p.z };
      if (free(c.x, c.y, c.z) && clampOk(c.x, c.y, c.z)) return c;
    }
  }
  // 2. sideways: out through the nearest free side, still looking at the same subject.
  if (dl > 1e-6) {
    const ux = dx / dl, uy = dy / dl;
    for (let d = 0.6; d <= 10; d += 0.6) {
      for (const side of [1, -1]) {
        const c = { x: p.x - uy * d * side, y: p.y + ux * d * side, z: p.z };
        if (free(c.x, c.y, c.z) && clampOk(c.x, c.y, c.z)) return c;
      }
    }
  }
  // 3. the old last resort: in towards what it looks at (a tighter shot), if that is free.
  let found = null;
  for (let k = 1; k <= 8 && !found; k++) {
    const u = k / 8 * 0.85;
    const c = { x: p.x + (look.x - p.x) * u, y: p.y + (look.y - p.y) * u, z: p.z + (look.z - p.z) * u * 0.5 };
    if (free(c.x, c.y, c.z)) found = c;
  }
  if (!found) { found = { ...p }; for (let k = 0; k < 12 && !free(found.x, found.y, found.z); k++) found.z += 1.5; }
  return found;
}

// The anchor, turned in steps of 30 degrees (the smallest turn that is clean), so that no actor, prop or
// camera of the scene stands inside a building. Without env.solid the anchor stays.
// opts.radii (metres, closest first) is for a scene that may play anywhere (the opening: nobody stands in it, #321):
// when no turn is clean, the anchor moves to the closest free ground (opts.ground(x, y) -> true) where one is, turned
// in 60-degree steps. The camera guard lifts a camera inside a building over its roof (scene3d.js), which looks like
// a flip: straight up 70 m and down at the street. A scene that starts beside a tower has no clean turn.
function anchorScore(scene, a, env, step = 0.6) {
  let bad = 0;
  for (let t = 0; t <= scene.duration; t += step) {
    const s = scene.sample(t, a);
    for (const o of Object.values(s.actors)) if (o.visible !== false && env.solid(o.x, o.y, (a.z || 0) + 0.9)) bad += 2;
    for (const o of Object.values(s.props)) if (o.visible && env.solid(o.x, o.y, o.h + 0.4)) bad += 1;
    const c = s.camera.position;
    if (env.solid(c.x, c.y, c.z)) bad += 1;
    // #955: a camera in a tree weighs as much as a camera in a wall: the anchor turns or
    // moves to free ground instead of starting the scene inside a crown
    if (env.tree && env.tree(c.x, c.y, c.z)) bad += 3;
  }
  return bad;
}

export function fitAnchor(scene, anchor, env, opts = {}) {
  if (!env || !env.solid || env.clamp) return anchor;
  const score = (a, step) => anchorScore(scene, a, env, step);
  let best = anchor, bestScore = score(anchor);
  for (const k of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) {
    if (bestScore === 0) break;
    const a = { ...anchor, facing: anchor.facing + k * Math.PI / 6 };
    const sc = score(a) + Math.abs(k) * 0.01;
    if (sc < bestScore) { best = a; bestScore = sc; }
  }
  if (bestScore < 1 || !opts.radii || !opts.radii.length) return best;
  // no clean turn: the closest free ground that has one (a coarser time step keeps the search cheap)
  const dirs = opts.dirs || 8;
  for (const r of opts.radii) {
    let ring = null, ringScore = Infinity;
    for (let d = 0; d < dirs; d++) {
      const ang = d / dirs * Math.PI * 2;
      const x = anchor.x + Math.cos(ang) * r, y = anchor.y + Math.sin(ang) * r;
      if (opts.ground && !opts.ground(x, y)) continue;
      for (const k of [0, 2, -2, 4, -4, 6]) {
        const a = { ...anchor, x, y, facing: anchor.facing + k * Math.PI / 6 };
        const sc = score(a, 1) + Math.abs(k) * 0.01;
        if (sc < ringScore) { ring = a; ringScore = sc; }
        if (sc < 0.1) break;
      }
      if (ringScore < 0.1) break;
    }
    if (ring && ringScore < bestScore) { best = ring; bestScore = ringScore; }
    if (bestScore < 1) break;
  }
  return best;
}

// --- road following for cutscene vehicles and cyclists (#862, #863) -----------------
// A driving vehicle in a cutscene is authored in the anchor frame (f forward, s left), which says
// nothing about the real road. At scene start its path is replaced by a route along the road
// polylines of the map (map.nearestRoadPoint(x, y, radius, drivable) and, when present,
// map.roadsNear(x, y, radius)), in the direction the scene authored. Cast members with
// `road: '<prop id>'` (the hidden driver/passengers) get the same waypoints, so a follow shot keeps
// aiming at the vehicle; a prop with `follows: '<prop id>'` rides along at its own height (the
// mattress on the Escapade). Cyclists (`road: 'cycle'`) get a short route and disappear after it,
// instead of standing still in a riding pose for the rest of the scene. Pure: computed once per
// scene, never per frame; without road data the definition is left alone.

const round2 = (v) => Math.round(v * 100) / 100;

function roadClosest(road, x, y) {
  const pts = road && road.pts;
  if (!Array.isArray(pts) || pts.length < 2) return null;
  let best = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px - x, py - y);
    if (!best || d < best.d) {
      const l = Math.sqrt(l2) || 1;
      best = { seg: i, t, d, x: px, y: py, dir: { x: dx / l, y: dy / l }, segLen: l };
    }
  }
  return best;
}

// The road polyline turned so that it is travelled in the direction of `heading` from `at`.
function orientRoad(road, heading, at) {
  if (!road || !Array.isArray(road.pts) || road.pts.length < 2) return null;
  let pts = road.pts.map((q) => [q[0], q[1]]);
  let start = roadClosest({ pts }, at.x, at.y);
  if (!start) return null;
  if (start.dir.x * heading.x + start.dir.y * heading.y < 0) {
    pts = pts.reverse();
    start = roadClosest({ pts }, at.x, at.y);
    if (!start) return null;
  }
  return { road: { ...road, pts }, src: road, start };
}

// The next road at the end of this one (a corner), chosen by distance and by how well it continues
// the heading. Roads that only touch at the vertex are found through roadsNear; without it a
// nearestRoadPoint probe ahead is the fallback.
function nextRoad(map, p, heading, drivable, exclude) {
  const cands = [];
  if (typeof map.roadsNear === 'function') for (const r of map.roadsNear(p.x, p.y, 30)) if (r && r !== exclude) cands.push(r);
  if (!cands.length && typeof map.nearestRoadPoint === 'function') {
    const rp = map.nearestRoadPoint(p.x, p.y, 30, drivable);
    if (rp && rp.road && rp.road !== exclude) cands.push(rp.road);
  }
  let best = null;
  for (const road of cands) {
    const c = roadClosest(road, p.x, p.y);
    if (!c || c.d > 16) continue;
    const dot = Math.abs(c.dir.x * heading.x + c.dir.y * heading.y);
    // a corner can be square: allow a perpendicular road at a junction, but prefer one that
    // continues the heading (a crossing should go straight, not turn off at random).
    if (dot < 0.05 && c.d > 4) continue;
    const score = c.d * 2 + (1 - dot) * 3;
    if (!best || score < best.score) best = { road, score };
  }
  return best ? best.road : null;
}

function followRoute(map, startW, heading, length, step, drivable) {
  if (typeof map.nearestRoadPoint !== 'function') return null;
  const rp = map.nearestRoadPoint(startW.x, startW.y, 60, drivable);
  if (!rp || !rp.road) return null;
  let oriented = orientRoad(rp.road, heading, startW);
  if (!oriented) return null;
  let road = oriented.road, roadSrc = oriented.src, seg = oriented.start.seg, t = oriented.start.t;
  let headingNow = heading;
  const out = [{ x: oriented.start.x, y: oriented.start.y }];
  let travelled = 0, guard = 0;
  while (travelled < length - 1e-6 && guard++ < 2000) {
    const pts = road.pts;
    const ax = pts[seg][0], ay = pts[seg][1], bx = pts[seg + 1][0], by = pts[seg + 1][1];
    const dx = bx - ax, dy = by - ay, segLen = Math.hypot(dx, dy) || 1e-9;
    const remain = (1 - t) * segLen;
    if (remain > 1e-6) {
      const want = Math.min(step, length - travelled, remain);
      t += want / segLen;
      travelled += want;
      out.push({ x: ax + dx * t, y: ay + dy * t });
      headingNow = { x: dx / segLen, y: dy / segLen };
    } else if (seg + 1 < pts.length - 1) {
      seg += 1; t = 0;
    } else {
      const end = { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] };
      const next = nextRoad(map, end, headingNow, drivable, roadSrc);
      if (!next) break;
      oriented = orientRoad(next, headingNow, end);
      if (!oriented) break;
      road = oriented.road; roadSrc = oriented.src; seg = oriented.start.seg; t = oriented.start.t;
    }
  }
  return out.length >= 2 ? out : null;
}

// Fallback when one road cannot be followed: snap every sampled authored point to its nearest road.
function snapRoute(map, world, drivable, step = 2.5) {
  const out = [];
  for (let i = 1; i < world.length; i++) {
    const a = world[i - 1], b = world[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
      const rp = map.nearestRoadPoint(x, y, 60, drivable);
      if (!rp) continue;
      const q = { x: rp.x, y: rp.y };
      const prev = out[out.length - 1];
      if (!prev || Math.hypot(q.x - prev.x, q.y - prev.y) > 0.5) out.push(q);
    }
  }
  return out.length >= 2 ? out : null;
}

// Returns a new def with the road-bound props (and their passengers, followers and riders) on the
// road, or null when there is nothing to snap. `opts.duration` keeps a hide cue inside the scene.
export function roadPathDef(def, at, map, opts = {}) {
  if (!def || !def.props || !map || typeof map.nearestRoadPoint !== 'function' || !at) return null;
  const out = JSON.parse(JSON.stringify(def));
  const arrays = ['cues', 'open', 'beats'].map((k) => out[k]).filter((a) => Array.isArray(a));
  const pathCue = (prop, actor = null) => {
    for (const arr of arrays) for (const q of arr) {
      if (!q || (actor ? q.actor !== actor : q.prop !== prop)) continue;
      if (Array.isArray(q.path) && q.path.length >= 2) return q;
    }
    return null;
  };
  const walkCue = (actor) => {
    for (const arr of arrays) for (const q of arr) if (q && q.actor === actor && Array.isArray(q.walk) && q.walk.length) return q;
    return null;
  };
  const c = Math.cos(at.facing), sn = Math.sin(at.facing);
  const toW = (f, s) => ({ x: at.x + f * c - s * sn, y: at.y + f * sn + s * c });
  const toL = (x, y) => ({ f: (x - at.x) * c + (y - at.y) * sn, s: -(x - at.x) * sn + (y - at.y) * c });
  const duration = Number.isFinite(opts.duration) ? opts.duration : Infinity;
  const roadIds = Object.keys(out.props).filter((id) => out.props[id] && out.props[id].road);
  const snapped = {};
  const roadDone = new Set();
  let changed = false;
  for (const id of roadIds) {
    const p = out.props[id];
    const drivable = p.road !== 'cycle' && p.road !== 'foot';
    const q = pathCue(id);
    if (!q) {
      // a parked vehicle that is only placed: put it on the nearest road, nothing moves
      const w = toW(p.at[0], p.at[1]);
      const rp = map.nearestRoadPoint(w.x, w.y, 40, drivable);
      if (rp && Math.hypot(rp.x - w.x, rp.y - w.y) < 25) {
        const l = toL(rp.x, rp.y);
        p.at[0] = round2(l.f); p.at[1] = round2(l.s);
        roadDone.add(id);
        changed = true;
      }
      continue;
    }
    const path = q.path;
    const baseH = path[0][2] ?? p.at[2] ?? 0;
    const world = path.map((pt) => toW(pt[0], pt[1]));
    let len = 0;
    for (let i = 1; i < world.length; i++) len += Math.hypot(world[i].x - world[i - 1].x, world[i].y - world[i - 1].y);
    if (len < 0.5) continue;
    const hx = world[world.length - 1].x - world[0].x;
    const hy = world[world.length - 1].y - world[0].y;
    const hl = Math.hypot(hx, hy) || 1;
    const heading = { x: hx / hl, y: hy / hl };
    // a cyclist only has to leave the frame; cars drive the authored distance
    let length = len;
    if (!drivable) length = Math.min(length, opts.rideLen ?? 70);
    if (typeof p.roadLen === 'number' && p.roadLen > 0) length = Math.min(length, p.roadLen);
    let roadPts = followRoute(map, world[0], heading, length, opts.step ?? 2.5, drivable);
    if (!roadPts) roadPts = snapRoute(map, world, drivable, opts.step ?? 2.5);
    if (!roadPts || roadPts.length < 2) continue;
    let pts = roadPts.map((r) => { const l = toL(r.x, r.y); return [round2(l.f), round2(l.s), baseH]; });
    pts = pts.filter((pt, i) => i === 0 || Math.hypot(pt[0] - pts[i - 1][0], pt[1] - pts[i - 1][1]) > 0.05);
    if (pts.length < 2) continue;
    q.path = pts;
    p.at = p.at.length > 2 ? [pts[0][0], pts[0][1], p.at[2]] : [pts[0][0], pts[0][1]];
    snapped[id] = pts;
    roadDone.add(id);
    changed = true;
    // #863: after its short route the cyclist (and the bike) leave the scene instead of standing
    // still in a riding pose. Only inside the scene; the validator rejects cues after the end.
    if (!drivable && typeof q.t === 'number') {
      let route = 0;
      for (let i = 1; i < pts.length; i++) route += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const endT = q.t + route / (q.speed || 3) + 0.8;
      if (endT < duration - 0.1) {
        const cues = out.cues || (out.cues = []);
        cues.push({ t: endT, prop: id, hide: true });
        for (const aid of Object.keys(out.actors || {})) if (out.actors[aid].road === id) cues.push({ t: endT, actor: aid, hide: true });
      }
    }
  }
  // hidden drivers/passengers follow the vehicle's road route
  for (const aid of Object.keys(out.actors || {})) {
    const link = out.actors[aid].road;
    if (typeof link !== 'string' || !snapped[link]) continue;
    const pts = snapped[link];
    out.actors[aid].at = [pts[0][0], pts[0][1]];
    const w = walkCue(aid);
    if (w) w.walk = pts.slice(1).map((pt) => [pt[0], pt[1]]);
    else (out.cues || (out.cues = [])).push({ t: 0, actor: aid, walk: pts.slice(1).map((pt) => [pt[0], pt[1]]) });
    changed = true;
  }
  // a prop that rides along with another prop (the mattress on the Escapade)
  for (const id of Object.keys(out.props)) {
    const p = out.props[id];
    if (!p || typeof p.follows !== 'string') continue;
    const target = out.props[p.follows];
    if (!target || !roadDone.has(p.follows)) continue;
    const pts = snapped[p.follows];
    const h = p.at[2] ?? 0;
    if (pts) {
      const tq = pathCue(p.follows);
      const q = pathCue(id);
      const path = pts.map((pt) => [pt[0], pt[1], h]);
      if (q) {
        q.path = path;
        if (tq) { q.t = tq.t; q.speed = tq.speed; q.dur = tq.dur; }
      } else if (tq) (out.cues || (out.cues = [])).push({ t: tq.t, prop: id, path, speed: tq.speed, dur: tq.dur });
      p.at = [pts[0][0], pts[0][1], h];
    } else {
      p.at = [target.at[0], target.at[1], h];
    }
    changed = true;
  }
  return changed ? out : null;
}

// --- geometry helpers ---------------------------------------------------------

function endOf(k) {
  const s = k.segs[k.segs.length - 1];
  return s ? s.pts[s.pts.length - 1] : k.pos0;
}
function pathLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}
function along(pts, d) {
  let i = 1, acc = 0;
  for (; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= acc + seg || i === pts.length - 1) {
      const u = seg > 1e-9 ? Math.min(1, (d - acc) / seg) : 1;
      const a = pts[i - 1], b = pts[i];
      return { f: lerp(a[0], b[0], u), s: lerp(a[1], b[1], u), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    acc += seg;
  }
  return { f: pts[0][0], s: pts[0][1], a: 0 };
}
function along3(pts, u) {
  const len = pathLen(pts);
  const q = along(pts, len * clamp01(u));
  // height: interpolate on the same fraction
  let acc = 0, h = pts[0][2];
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len * u <= acc + seg || i === pts.length - 1) { h = lerp(pts[i - 1][2], pts[i][2], seg > 1e-9 ? clamp01((len * u - acc) / seg) : 1); break; }
    acc += seg;
  }
  return { ...q, h };
}

// Map points the camera looks at (and stands at) along a compiled scene, a few per shot,
// for playCinematic's prewarm / registerShots (#157, #20).
export function shotPoints(scene, anchor, duration, step = 2) {
  const out = [], seen = new Set();
  const add = (v) => {
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return;
    const k = Math.round(v.x / 25) + ',' + Math.round(v.y / 25);
    if (!seen.has(k)) { seen.add(k); out.push({ x: v.x, y: v.y }); }
  };
  try {
    for (let t = 0; t <= duration + 1e-6; t += step) {
      const c = scene.sample(Math.min(t, duration), anchor).camera;
      add(c.lookAt); add(c.position);
    }
  } catch (e) { /* a sample failure only means less prewarm */ }
  return out.slice(0, 24);
}
