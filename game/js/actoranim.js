// Animatielaag voor cutscene-acteurs (#136): iedereen in een scène staat niet
// meer stil. Pure logica, zonder three.js: de toestand van een acteur loopt per
// frame door `actor.update(dt)` en levert een `pose` (getallen) op die
// `applyPose(mesh.userData, pose)` op de botten van buildPersonMesh() zet.
//
// Wat erin zit: idle-variatie (ademen, gewicht verplaatsen, rondkijken, handen
// in de zij / over elkaar), gebaren tijdens praten (gekoppeld aan de regeltijd
// van de ondertitel), kijkrichting naar de spreker, lopen langs een pad,
// zitten, reacties (schrikken, lachen, schouderophalen, knikken, zwaaien) en
// omstanders met eenvoudige routines.
//
// ---- Publiek contract voor de regietaal (cutscript.js) -----------------------
//   const stage = createStage({ seed });
//   const a = stage.add('tammo', { x, z, heading, groundY, mesh? });
//   stage.cue('tammo', 'praat', { duur: 3.2, tekst: 'Zeg, wat dacht jij?', tot: 'tessa' });
//   stage.cue('tessa', 'kijk', { naar: 'tammo' });      // of { x, z } of null
//   stage.cue('tammo', 'loop', { pad: [{x,z}, ...], snelheid: 1.4 });
//   stage.cue('tessa', 'zit', { x, z, heading, zithoogte });   stage.cue('tessa', 'sta');
//   stage.cue('tammo', 'reageer', { soort: 'schrik' });  // schrik|lach|schouders|knik|zwaai
//   stage.cue('man1', 'routine', { naam: 'wachten' });   // zie ROUTINES
//   stage.cue('tammo', 'stil');                          // onderbreek praten/lopen/kijken
//   stage.update(dt);                                    // elk frame
//   stage.apply('tammo', mesh);                          // schrijft pose op mesh (positie, kijkrichting, botten)
//   stage.drain() -> [{ id, event: 'aangekomen'|'klaar-met-praten'|'reactie-klaar'|'gaat-zitten'|'staat' }]
// Zonder mesh (tests, voorvertoning) kan `stage.pose(id)` direct gelezen worden.
// Spreker-sync: `praat` mag elk moment starten of stoppen; luisteraars kijken
// vanzelf naar de spreker (stage.listenersLook, standaard aan).
//
// Conventies (zelfde als models3d_people.js): de mesh kijkt langs +X;
// arm/been rotation.z > 0 = naar voren; arm z ~2.75 = boven het hoofd.
// heading = atan2(dz, dx) in wereldcoordinaten; mesh.rotation.y = -heading.
// Gebruik per frame OF animatePersonWalk OF deze laag voor dezelfde mesh.

import { zwemStand, klimStand, sprongStand } from './bewegingrules.js';

const TAU = Math.PI * 2;
export const HIP_Y = 0.93;
const CHEST_Y = 1.07;
export const SEAT_CONTACT = HIP_Y - 0.09;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
const approach = (v, t, step) => (v < t ? Math.min(t, v + step) : Math.max(t, v - step));
const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);

export function makeRng(seed) {
  let s = (Math.floor(finite(seed, 1) * 4294967296) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };

// ---- paden ---------------------------------------------------------------------

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return L;
}

// Punt en looprichting op afstand d langs het pad (vastgeklemd op begin/eind).
export function pointAt(pts, d) {
  if (!pts.length) return { x: 0, z: 0, heading: 0 };
  if (pts.length === 1) return { x: pts[0].x, z: pts[0].z, heading: 0 };
  let rest = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x, dz = pts[i].z - pts[i - 1].z, len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    if (rest <= len || i === pts.length - 1) {
      const k = Math.min(1, rest / len);
      return { x: pts[i - 1].x + dx * k, z: pts[i - 1].z + dz * k, heading: Math.atan2(dz, dx) };
    }
    rest -= len;
  }
  return { x: pts[pts.length - 1].x, z: pts[pts.length - 1].z, heading: 0 };
}

// ---- gebaren bij praten ----------------------------------------------------------

const GESTURES = ['open', 'beide', 'wijs', 'hakken', 'knik', 'schouder'];

// Verdeelt gebaren over de regeltijd: bij elke komma/punt/vraagteken/uitroep en
// anders ongeveer elke 1,3 s een gebaar, nooit vlak na elkaar. Deterministisch.
// -> [{ t, dur, kind }] met t in seconden vanaf het begin van de regel.
export function planGestures(tekst, duur, seed = 0) {
  const dur = finite(duur, 0);
  if (!(dur > 0.4)) return [];
  const rng = makeRng(seed + hashStr(String(tekst || '')));
  const text = String(tekst || '');
  const marks = [];
  const n = Math.max(1, text.length);
  for (let i = 0; i < text.length; i++) {
    if (',.?!;:'.includes(text[i]) && i < text.length - 1) marks.push({ t: (i / n) * dur, ch: text[i] });
  }
  const beats = [];
  let last = -9;
  const add = (t, kind) => {
    if (t < 0.15 || t > dur - 0.25 || t - last < 0.9) return;
    beats.push({ t, dur: clamp(0.7 + rng() * 0.4, 0.6, 1.2), kind });
    last = t;
  };
  let prev = null;
  const pick = (ch) => {
    let kind = ch === '?' ? (rng() < 0.5 ? 'open' : 'schouder') : ch === '!' ? (rng() < 0.5 ? 'hakken' : 'wijs') : GESTURES[Math.floor(rng() * GESTURES.length)];
    if (kind === prev) kind = GESTURES[(GESTURES.indexOf(kind) + 1) % GESTURES.length];
    prev = kind;
    return kind;
  };
  add(Math.min(0.3, dur * 0.15), 'knik');
  for (const m of marks) add(m.t, pick(m.ch));
  for (let t = 1.3; t < dur - 0.4; t += 1.3 + rng() * 0.5) if (beats.every((b) => Math.abs(b.t - t) > 0.9)) add(t, pick(''));
  beats.sort((a, b) => a.t - b.t);
  return beats;
}

// ---- pose --------------------------------------------------------------------------

export function neutralPose() {
  return {
    x: 0, y: 0, z: 0, heading: 0,
    pelvisDrop: 0, pelvisZ: 0, pelvisRX: 0, pelvisRY: 0,
    chest: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    armL: { x: 0, z: 0.08, e: 0.15 }, armR: { x: 0, z: 0.08, e: 0.15 },
    legL: { z: 0, k: -0.06 }, legR: { z: 0, k: -0.06 },
  };
}

// Schrijft een pose op de botten van een buildPersonMesh()-mesh (userData).
// Werkt met elk object met rotation.set()/position.set() (dus ook met nepbotten in tests).
export function applyPose(ud, p) {
  if (!ud || !ud.pelvis || !ud.chest || !ud.head) return false;
  ud.pelvis.position.set(0, HIP_Y - p.pelvisDrop, p.pelvisZ);
  ud.pelvis.rotation.set(p.pelvisRX, p.pelvisRY, 0);
  ud.chest.position.set(0, CHEST_Y - HIP_Y, 0);
  ud.chest.rotation.set(p.chest.x, p.chest.y, p.chest.z);
  ud.head.rotation.set(p.head.x, p.head.y, p.head.z);
  const limb = (arm, elbow, a) => { if (arm) arm.rotation.set(a.x, 0, a.z); if (elbow) elbow.rotation.z = a.e; };
  limb(ud.armL, ud.elbowL, p.armL);
  limb(ud.armR, ud.elbowR, p.armR);
  if (ud.legL) { ud.legL.rotation.set(0, 0, p.legL.z); if (ud.kneeL) ud.kneeL.rotation.z = p.legL.k; }
  if (ud.legR) { ud.legR.rotation.set(0, 0, p.legR.z); if (ud.kneeR) ud.kneeR.rotation.z = p.legR.k; }
  return true;
}

function mixLimb(a, b, k) { for (const key of Object.keys(b)) if (typeof b[key] === 'number') a[key] = lerp(a[key], b[key], k); }
// Naar `b` toe op gewicht k (alleen de velden die b noemt).
export function blendPose(a, b, k) {
  if (k <= 0) return a;
  for (const key of Object.keys(b)) {
    const v = b[key];
    if (typeof v === 'number') a[key] = lerp(a[key], v, k);
    else if (v && typeof v === 'object') mixLimb(a[key], v, k);
  }
  return a;
}

// Rustpostures voor idle; elke is een gedeeltelijke pose.
const STANCES = {
  neutraal: {},
  heupen: { armL: { x: -0.25, z: 0.45, e: 1.5 }, armR: { x: 0.25, z: 0.45, e: 1.5 } },
  armenKruis: { armL: { x: -0.3, z: 0.95, e: 1.7 }, armR: { x: 0.3, z: 1.0, e: 1.9 } },
  zakken: { armL: { x: -0.1, z: 0.1, e: 0.35 }, armR: { x: 0.1, z: 0.1, e: 0.35 } },
  zijkantKijk: { armL: { x: 0, z: 0.14, e: 0.25 }, armR: { x: 0, z: 0.14, e: 0.25 } },
};
const STANCE_KEYS = Object.keys(STANCES);

// Reacties: schrijven doelwaarden op de pose, gewogen met envelop `w`.
// k = voortgang 0..1 van de reactie, t = seconden sinds start, s = zijde (-1 | 1).
const T = (obj, key, val, w) => { obj[key] = lerp(obj[key], val, w); };
export const REACTIONS = {
  schrik: { dur: 1.1, fn(p, w, k, t) {
    const jerk = Math.exp(-t * 7);
    T(p.chest, 'z', -0.3 - 0.1 * jerk, w); T(p.head, 'z', -0.3, w);
    T(p.armL, 'z', 1.6, w); T(p.armR, 'z', 1.6, w); T(p.armL, 'e', 1.4, w); T(p.armR, 'e', 1.4, w);
    p.pelvisZ += -0.05 * jerk * w; p.pelvisDrop += 0.03 * jerk * w;
    T(p.legL, 'z', -0.12, w); T(p.legR, 'z', 0.18, w);
  } },
  lach: { dur: 1.8, fn(p, w, k, t) {
    const shake = Math.sin(t * 22) * 0.035;
    T(p.chest, 'z', -0.14 + shake, w); T(p.head, 'z', -0.45, w);
    p.chest.x += shake * 1.5 * w;
    T(p.armL, 'z', 0.55, w); T(p.armL, 'e', 1.8, w); T(p.armR, 'z', 0.7, w); T(p.armR, 'e', 1.6, w);
    p.pelvisDrop += 0.012 * w * (1 + Math.sin(t * 22));
  } },
  schouders: { dur: 1.3, fn(p, w, k, t) {
    const up = Math.sin(clamp(k * 1.4, 0, 1) * Math.PI);
    T(p.armL, 'z', 0.3 + 0.1 * up, w); T(p.armR, 'z', 0.3 + 0.1 * up, w);
    T(p.armL, 'x', -0.65, w); T(p.armR, 'x', 0.65, w);
    T(p.armL, 'e', 1.4, w); T(p.armR, 'e', 1.4, w);
    T(p.head, 'x', 0.16, w); T(p.head, 'z', 0.1, w);
    p.pelvisDrop += 0.02 * up * w;
  } },
  knik: { dur: 0.9, fn(p, w, k, t) { p.head.z += Math.sin(clamp(k, 0, 1) * Math.PI * 2) * -0.22 * w; } },
  schud: { dur: 1.1, fn(p, w, k, t) { p.head.y += Math.sin(t * 11) * 0.35 * w; } },
  wijs: { dur: 1.4, fn(p, w, k, t) { T(p.armR, 'z', 1.45, w); T(p.armR, 'e', 0.1, w); T(p.armR, 'x', 0.1, w); p.chest.z += 0.04 * w; } },
  juich: { dur: 1.4, fn(p, w, k, t) { const s = Math.sin(t * 8); T(p.armL, 'z', 2.7 + 0.1 * s, w); T(p.armR, 'z', 2.7 - 0.1 * s, w); T(p.armL, 'e', 0.3, w); T(p.armR, 'e', 0.3, w); T(p.armL, 'x', -0.3, w); T(p.armR, 'x', 0.3, w); p.pelvisDrop += 0.03 * Math.abs(s) * w; p.head.z += -0.15 * w; } },
  zwaai: { dur: 1.8, fn(p, w, k, t) {
    const sway = Math.sin(t * 9);
    T(p.armR, 'z', 2.75, w); T(p.armR, 'x', 0.3 + 0.28 * sway, w); T(p.armR, 'e', 0.45 + 0.2 * sway, w);
    p.head.z += 0.12 * w;
  } },
};

// Vaste houdingen voor animateActor (gedeeltelijke poses).
const HOLD = {
  carry: { armL: { x: -0.2, z: 1.15, e: 1.1 }, armR: { x: 0.2, z: 1.15, e: 1.1 }, chest: { z: -0.04 } },
  lean: { chest: { z: -0.18 }, pelvisZ: -0.06, armL: { z: 0.55, e: 1.3 }, armR: { z: 0.2, e: 0.4 } },
  hips: STANCES.heupen,
  phone: { armR: { x: 0, z: 1.55, e: 2.0 }, head: { z: 0.12 }, armL: { z: 0.35, e: 1.4 } },
  look: { head: { x: 0.04 } },
};

// Gebaren (bovenlijf) tijdens het praten; w = envelop 0..1, k = voortgang, s = zijde.
const GESTURE_FN = {
  open(p, w, k, t, s) {
    const a = s > 0 ? p.armR : p.armL;
    T(a, 'z', 0.95 + 0.25 * Math.sin(k * Math.PI), w); T(a, 'e', 1.2, w); T(a, 'x', 0.25 * s, w);
  },
  beide(p, w, k) {
    const up = Math.sin(k * Math.PI);
    for (const [a, s] of [[p.armL, -1], [p.armR, 1]]) { T(a, 'z', 0.85 + 0.2 * up, w); T(a, 'e', 1.25, w); T(a, 'x', 0.35 * s, w); }
  },
  wijs(p, w, k, t, s) {
    const a = s > 0 ? p.armR : p.armL;
    T(a, 'z', 1.25 + 0.15 * Math.sin(k * Math.PI), w); T(a, 'e', 0.25, w); T(a, 'x', 0.12 * s, w);
    p.chest.z += 0.05 * w;
  },
  hakken(p, w, k, t, s) {
    const a = s > 0 ? p.armR : p.armL;
    const chop = Math.abs(Math.sin(k * Math.PI * 2));
    T(a, 'z', 0.8 + 0.5 * chop, w); T(a, 'e', 1.0, w);
  },
  knik(p, w, k) { p.head.z += Math.sin(k * Math.PI * 2) * -0.14 * w; },
  schouder(p, w, k, t, s) {
    T(p.armL, 'z', 0.4, w); T(p.armR, 'z', 0.4, w); T(p.armL, 'e', 1.0, w); T(p.armR, 'e', 1.0, w);
    p.head.y += 0.08 * s * w;
  },
};

// ---- acteur ---------------------------------------------------------------------------

const GAZE_HEAD_MAX = 0.95;   // rad, hoek waarbij het hoofd niet verder draait
const GAZE_CHEST_SHARE = 0.3; // deel van de hoek dat de romp meedraait
const TURN_RATE = 3.2;        // rad/s lichaamsdraai

function emptyEnv() { return { w: 0, t: 0, dur: 0, kind: null, s: 1 }; }

function createActor(id, opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed : hashStr(String(id));
  const rng = makeRng(seed);
  const a = {
    id, seed, rng,
    x: finite(opts.x), z: finite(opts.z), heading: finite(opts.heading), groundY: finite(opts.groundY),
    time: rng() * 50,
    mode: 'staan',            // staan | lopen | zitten
    gaze: null,               // { x, z } | { actor } | null
    gazeBlend: 0,
    turnBody: opts.turnBody !== false,
    talk: null,               // { t, dur, beats }
    talkBlend: 0,
    react: emptyEnv(),
    walk: null,               // { pts, d, speed, len }
    walkPhase: 0, walkBlend: 0, speed: 0,
    sit: 0, sitTarget: 0, seat: null,
    stance: { from: 'neutraal', to: 'neutraal', k: 1, next: 4 + rng() * 6 },
    glance: { v: 0, target: 0, next: 2 + rng() * 5 },
    routine: null,
    events: [],
    pose: neutralPose(),
    gestureBeat: -1,
    resolve: opts.resolve || null,  // (actor) -> doelpunt voor kijk-naar-acteur, door stage gezet
  };
  return a;
}

function gazePoint(a) {
  const g = a.gaze;
  if (!g) return null;
  if (g.actor) return g.actor.x !== undefined ? { x: g.actor.x, z: g.actor.z } : null;
  return Number.isFinite(g.x) && Number.isFinite(g.z) ? g : null;
}

function look(a, target) { a.gaze = target || null; }

function speak(a, { duur, tekst = '' }) {
  const dur = finite(duur, 0);
  if (!(dur > 0)) { a.talk = null; return; }
  a.talk = { t: 0, dur, beats: planGestures(tekst, dur, a.seed), sideFlip: a.rng() < 0.5 ? -1 : 1 };
  a.gestureBeat = -1;
}

function walkPath(a, pts, speed = 1.4) {
  const path = (pts || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.z));
  if (a.mode === 'zitten' || a.sit > 0.05) standUp(a);
  if (path.length < 1) return false;
  const full = [{ x: a.x, z: a.z }, ...path];
  a.walk = { pts: full, d: 0, speed: clamp(finite(speed, 1.4), 0.3, 6), len: pathLength(full) };
  a.mode = 'lopen';
  return true;
}

function sitDown(a, seat = {}) {
  a.walk = null;
  a.seat = {
    x: finite(seat.x, a.x), z: finite(seat.z, a.z), heading: finite(seat.heading, a.heading),
    top: finite(seat.zithoogte, a.groundY + 0.45),
    from: { x: a.x, z: a.z, heading: a.heading },
  };
  a.mode = 'zitten'; a.sitTarget = 1;
  a.events.push('gaat-zitten');
}

function standUp(a) {
  if (a.mode !== 'zitten') return;
  a.sitTarget = 0;
  a.mode = 'staan';
}

function react(a, kind) {
  const r = REACTIONS[kind];
  if (!r) return false;
  a.react = { w: 0, t: 0, dur: r.dur, kind, s: a.rng() < 0.5 ? -1 : 1 };
  return true;
}

function cancel(a) { a.talk = null; a.walk = null; a.gaze = null; if (a.mode === 'lopen') a.mode = 'staan'; a.react = emptyEnv(); }

// ---- routines voor omstanders -----------------------------------------------------------
// Elke routine is een functie (a, dt, ctx) die opdrachten geeft. ctx.opts = opties uit de cue.
const ROUTINES = {
  // staat te wachten: kijkt af en toe op het horloge of rond
  wachten(a, dt, c) {
    c.t = (c.t || 0) - dt;
    if (c.t > 0) return;
    c.t = 3 + a.rng() * 5;
    const r = a.rng();
    if (r < 0.3) a.gaze = { x: a.x + Math.cos(a.heading + (a.rng() - 0.5) * 2.4) * 8, z: a.z + Math.sin(a.heading + (a.rng() - 0.5) * 2.4) * 8 };
    else if (r < 0.5) react(a, 'schouders');
    else if (r < 0.7) a.gaze = null;
    a.stance.next = Math.min(a.stance.next, 1);
  },
  // houdt een gesprekje met `met` (acteur-id): praat en luistert om en om
  kletsen(a, dt, c) {
    const partner = c.partner || (c.opts.met && c.stage && c.stage.get(c.opts.met));
    if (!partner) return;
    if (!a.gaze) a.gaze = { actor: partner };
    c.t = (c.t || 0) - dt;
    if (c.t > 0) return;
    const turn = 1.6 + a.rng() * 2.4;
    c.t = turn * 2;
    speak(a, { duur: turn, tekst: 'Nou, ja, dat is zo.' });
    // de partner begint als wij klaar zijn: schuif zijn beurt op
    partner.talk = null;
    partner.pendingTalk = { delay: turn + 0.4, duur: turn };
    if (a.rng() < 0.25) react(partner, a.rng() < 0.5 ? 'knik' : 'lach');
  },
  // loopt heen en weer tussen twee punten met pauzes
  patrouille(a, dt, c) {
    const pts = c.opts.pad;
    if (!pts || pts.length < 2) return;
    c.i = c.i || 0;
    if (a.mode === 'lopen' || a.walk) return;
    c.pause = (c.pause === undefined ? 0 : c.pause) - dt;
    if (c.pause > 0) return;
    c.pause = 2 + a.rng() * 3;
    c.i = (c.i + 1) % pts.length;
    walkPath(a, [pts[c.i]], c.opts.snelheid || 1.1);
  },
  // staat te kijken naar een punt/acteur, reageert af en toe
  toekijken(a, dt, c) {
    if (c.opts.naar && !a.gaze) a.gaze = c.opts.naar;
    c.t = (c.t || 4 + a.rng() * 4) - dt;
    if (c.t > 0) return;
    c.t = 5 + a.rng() * 6;
    react(a, a.rng() < 0.5 ? 'knik' : 'schouders');
  },
};

// ---- update -------------------------------------------------------------------------------

function updateActor(a, dt) {
  const step = clamp(finite(dt, 0), 0, 0.1);
  a.time += step;
  const p = neutralPose();
  const t = a.time;

  if (a.routine && ROUTINES[a.routine.name]) ROUTINES[a.routine.name](a, step, a.routine.ctx);
  if (a.pendingTalk) {
    a.pendingTalk.delay -= step;
    if (a.pendingTalk.delay <= 0) { speak(a, { duur: a.pendingTalk.duur, tekst: 'Ja, maar ja.' }); a.pendingTalk = null; }
  }

  // bewegen: pad volgen
  if (a.walk) {
    const w = a.walk;
    w.d = Math.min(w.len, w.d + w.speed * step);
    const pt = pointAt(w.pts, w.d);
    const want = pt.heading;
    a.heading = a.heading + clamp(wrapAngle(want - a.heading), -TURN_RATE * 1.6 * step, TURN_RATE * 1.6 * step);
    a.x = pt.x; a.z = pt.z;
    a.speed = approach(a.speed, w.speed, step * 6);
    if (w.d >= w.len - 1e-6) { a.walk = null; a.mode = 'staan'; a.events.push('aangekomen'); }
  } else a.speed = approach(a.speed, finite(a.drivenSpeed, 0), step * (a.drivenSpeed ? 6 : 8));
  a.walkBlend = approach(a.walkBlend, Math.min(1, a.speed / 1.0), step * 5);
  a.walkPhase = (a.walkPhase + TAU * Math.min(2.1, 0.42 + 0.3 * a.speed) * step * Math.min(1, a.speed / 0.25)) % TAU;

  // zitten: positie naar de stoel, houding erin
  const prevSit = a.sit;
  a.sit = approach(a.sit, a.sitTarget, step / 0.7);
  if (a.seat && a.sit > 0) {
    const k = smooth(a.sit);
    const sx = a.mode === 'zitten' || a.sitTarget > 0 ? a.seat.x : a.x;
    if (a.sitTarget > 0) {
      a.x = lerp(a.seat.from.x, sx, k); a.z = lerp(a.seat.from.z, a.seat.z, k);
      a.heading += wrapAngle(a.seat.heading - a.heading) * Math.min(1, step * 5);
    }
  }
  if (prevSit > 0 && a.sit === 0 && a.sitTarget === 0) { a.seat = null; a.events.push('staat'); }

  // kijkrichting
  const gp = gazePoint(a);
  let rel = 0;
  if (gp) {
    rel = wrapAngle(Math.atan2(gp.z - a.z, gp.x - a.x) - a.heading);
    // lichaam draait mee als het doel ver opzij ligt (niet tijdens lopen/zitten)
    if (a.turnBody && a.mode === 'staan' && !a.walk && Math.abs(rel) > (a.gaze && a.gaze.actor ? 0.4 : 1.0)) {
      a.heading += clamp(rel, -TURN_RATE * step, TURN_RATE * step);
      rel = wrapAngle(Math.atan2(gp.z - a.z, gp.x - a.x) - a.heading);
    }
  }
  a.gazeBlend = approach(a.gazeBlend, gp ? 1 : 0, step * 4);
  a.gazeRel = lerp(a.gazeRel || 0, clamp(rel, -GAZE_HEAD_MAX / (1 - GAZE_CHEST_SHARE), GAZE_HEAD_MAX / (1 - GAZE_CHEST_SHARE)), Math.min(1, step * 8));

  // idle-houdingen
  const st = a.stance;
  st.k = Math.min(1, st.k + step / 1.2);
  st.next -= step;
  if (st.next <= 0 && a.mode === 'staan' && !a.talk) {
    st.from = st.to;
    st.to = STANCE_KEYS[Math.floor(a.rng() * STANCE_KEYS.length)];
    st.k = 0; st.next = 6 + a.rng() * 9;
  }
  const g = a.glance;
  g.next -= step;
  if (g.next <= 0) { g.target = (a.rng() - 0.5) * 1.1; g.next = 2.5 + a.rng() * 5; if (a.rng() < 0.4) g.target = 0; }
  g.v = lerp(g.v, g.target, Math.min(1, step * 2.5));

  // basis: staan (idle)
  const idleW = (1 - a.walkBlend) * (1 - smooth(a.sit));
  const breath = Math.sin(t * 1.7), shift = Math.sin(t * 0.33);
  p.pelvisZ = 0.022 * shift * idleW; p.pelvisRX = 0.035 * shift * idleW;
  p.chest.z = -0.012 * breath * idleW; p.chest.x = -0.03 * shift * idleW;
  p.head.y = (a.directGaze !== undefined ? 0 : g.v * (1 - a.gazeBlend)) * idleW;
  p.armL.z += 0.02 * breath; p.armR.z += 0.02 * breath;
  const stFrom = STANCES[st.from] || {}, stTo = STANCES[st.to] || {};
  const stk = smooth(st.k);
  blendPose(p, stFrom, idleW * (1 - stk));
  blendPose(p, stTo, idleW * stk);
  // gewicht op één been
  const lean = Math.sin(t * 0.33);
  p.legL.k -= 0.03 + 0.14 * Math.max(0, -lean) * idleW;
  p.legR.k -= 0.03 + 0.14 * Math.max(0, lean) * idleW;

  // vaste houding van animateActor (lean, hips, phone, ...)
  a.holdK = approach(a.holdK || 0, a.hold ? 1 : 0, step * 4);
  if (a.hold && a.holdK > 0) blendPose(p, HOLD[a.hold], smooth(a.holdK) * idleW);

  // lopen
  const w = a.walkBlend;
  if (w > 0) {
    const ph = a.walkPhase, sp = a.speed;
    const amp = 0.42 * w + 0.1 * Math.min(1, sp / 3), c = Math.max(0, Math.cos(ph + 0.5)), c2 = Math.max(0, Math.cos(ph + Math.PI + 0.5));
    const walkPose = neutralPose();
    walkPose.legL.z = amp * Math.sin(ph); walkPose.legR.z = -amp * Math.sin(ph);
    walkPose.legL.k = -(0.08 + 0.95 * Math.pow(c, 1.5)); walkPose.legR.k = -(0.08 + 0.95 * Math.pow(c2, 1.5));
    walkPose.armL.z = -0.3 * Math.sin(ph); walkPose.armR.z = 0.3 * Math.sin(ph);
    walkPose.armL.e = 0.12 + 0.35 * Math.max(0, Math.sin(-ph)); walkPose.armR.e = 0.12 + 0.35 * Math.max(0, Math.sin(ph));
    walkPose.chest.y = -0.2 * Math.sin(ph); walkPose.pelvisRY = 0.1 * Math.sin(ph);
    walkPose.pelvisDrop = -0.018 * Math.cos(2 * ph);
    walkPose.chest.z = -0.03;
    blendPose(p, walkPose, w);
  }

  // zitten
  const sk = smooth(a.sit);
  if (sk > 0) {
    const sitPose = neutralPose();
    sitPose.chest.z = -0.05; sitPose.head.z = 0.03;
    sitPose.legL.z = 1.5; sitPose.legR.z = 1.5; sitPose.legL.k = -1.55; sitPose.legR.k = -1.5;
    sitPose.armL = { x: -0.05, z: 0.4, e: 1.05 }; sitPose.armR = { x: 0.05, z: 0.4, e: 1.05 };
    blendPose(p, sitPose, sk);
  }

  // kijken: hoofd (en deel romp) naar het doel
  if (a.gazeBlend > 0) {
    const gb = smooth(a.gazeBlend);
    const total = -a.gazeRel;   // rotation.y > 0 draait naar -heading
    const chestY = total * GAZE_CHEST_SHARE, headY = total - chestY;
    p.chest.y += chestY * gb * (1 - w);
    p.head.y += headY * gb;
    p.head.x += 0.0;
  }

  if (a.directGaze !== undefined) p.head.y += -a.directGaze;

  // praten: envelop + gebaar
  if (a.talk) {
    a.talk.t += step;
    if (a.talk.t >= a.talk.dur) { a.talk = null; a.events.push('klaar-met-praten'); }
  }
  a.talkBlend = approach(a.talkBlend, a.talk ? 1 : 0, step * 5);
  if (a.talkBlend > 0) {
    const tb = smooth(a.talkBlend);
    const tt = a.talk ? a.talk.t : 0;
    // kleine kopbeweging in de spreektempo
    p.head.z += (Math.sin(tt * 5.3) * 0.035 + Math.sin(tt * 2.1) * 0.03) * tb;
    p.head.x += Math.sin(tt * 3.1 + 1) * 0.03 * tb;
    if (a.talk) {
      for (let i = 0; i < a.talk.beats.length; i++) {
        const b = a.talk.beats[i];
        if (tt >= b.t && tt < b.t + b.dur) {
          const k = (tt - b.t) / b.dur, env = Math.sin(k * Math.PI);
          const side = (i % 2 ? -1 : 1) * a.talk.sideFlip;
          GESTURE_FN[b.kind](p, Math.min(1, env * 1.4) * tb * (1 - w) * (1 - sk * 0.5), k, tt - b.t, side);
          break;
        }
      }
    }
  }

  // reactie
  if (a.react.kind) {
    const r = a.react;
    r.t += step;
    const k = r.t / r.dur;
    if (k >= 1) { a.events.push('reactie-klaar'); a.react = emptyEnv(); }
    else {
      const env = smooth(Math.min(1, r.t / 0.12)) * smooth(Math.min(1, (r.dur - r.t) / 0.35));
      REACTIONS[r.kind].fn(p, env * (1 - w * 0.5), k, r.t, r.s);
    }
  }

  // wereldpositie
  p.x = a.x; p.z = a.z; p.heading = a.heading;
  p.y = lerp(a.groundY, a.seat ? a.seat.top - SEAT_CONTACT : a.groundY, sk);
  a.pose = p;
  return p;
}

// ---- toneel: meerdere acteurs, de plek waar de regietaal tegenaan praat -------------------------

export function createStage(opts = {}) {
  const actors = new Map();
  const stage = {
    listenersLook: opts.listenersLook !== false,
    add(id, o = {}) {
      const a = createActor(id, { seed: opts.seed !== undefined ? opts.seed + hashStr(id) : undefined, ...o });
      a.stage = stage;
      actors.set(id, a);
      return a;
    },
    remove(id) { actors.delete(id); },
    get(id) { return actors.get(id) || null; },
    ids() { return [...actors.keys()]; },
    cue(id, command, args = {}) {
      const a = actors.get(id);
      if (!a) return false;
      const resolveTarget = (t) => {
        if (!t) return null;
        if (typeof t === 'string') { const o = actors.get(t); return o ? { actor: o } : null; }
        return t;
      };
      switch (command) {
        case 'kijk': look(a, resolveTarget(args.naar)); return true;
        case 'praat':
          speak(a, args);
          a.talkTo = args.tot || null;
          if (args.tot) look(a, resolveTarget(args.tot));
          if (stage.listenersLook) for (const [oid, o] of actors) if (o !== a && (!args.tot || oid === args.tot || o.routine === null) && !o.talk && o.mode !== 'lopen') { if (!o.lockGaze) look(o, { actor: a }); }
          return true;
        case 'loop': return walkPath(a, args.pad, args.snelheid);
        case 'zit': sitDown(a, args); return true;
        case 'sta': standUp(a); return true;
        case 'reageer': return react(a, args.soort);
        case 'routine':
          if (!ROUTINES[args.naam]) return false;
          a.routine = { name: args.naam, ctx: { opts: args, stage, t: 0 } };
          return true;
        case 'stil': cancel(a); a.routine = null; return true;
        default: return false;
      }
    },
    update(dt) { for (const a of actors.values()) updateActor(a, dt); },
    pose(id) { const a = actors.get(id); return a ? a.pose : null; },
    // Zet positie, richting en botten van de acteur op een mesh.
    apply(id, mesh) {
      const a = actors.get(id);
      if (!a || !mesh) return false;
      const p = a.pose;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = -p.heading;
      return applyPose(mesh.userData, p);
    },
    drain() {
      const out = [];
      for (const [id, a] of actors) { for (const event of a.events) out.push({ id, event }); a.events.length = 0; }
      return out;
    },
  };
  return stage;
}

// ---- contract met cutscript.js (cutscenehost): per mesh een eigen acteur ----------------------
// De host zet positie en rotatie; deze functie poseert alleen botten (kop, romp, ledematen).
export const ANIMS = ['idle', 'walk', 'run', 'talk', 'wave', 'point', 'shrug', 'nod', 'shake', 'laugh', 'carry', 'lean', 'hips', 'phone', 'cheer', 'look', 'ride', 'zwem', 'klim', 'sprong'];
const LOOPED = { wave: 'zwaai', point: 'wijs', shrug: 'schouders', nod: 'knik', shake: 'schud', laugh: 'lach', cheer: 'juich' };
const meshActors = new WeakMap();

export function animateActor(mesh, o = {}) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.pelvis) return false;
  let a = meshActors.get(mesh);
  if (!a) {
    a = createActor('mesh', { seed: finite(ud.lookSeed, Math.random()) });
    a.stance.next = 1e9;
    meshActors.set(mesh, a);
  }
  const anim = ANIMS.includes(o.anim) ? o.anim : 'idle';
  const speed = Math.max(0, finite(o.speed));
  a.drivenSpeed = speed > 0.05 ? speed : 0;
  a.directGaze = clamp(finite(o.gaze), -1, 1);
  a.hold = HOLD[anim] ? anim : null;
  if (anim === 'hips') a.hold = 'hips';
  if (anim === 'talk' && !a.talk) speak(a, { duur: 5, tekst: 'Praten, praten, kijk. Ja!' });
  if (anim !== 'talk' && a.talk) a.talk = null;
  if (anim !== a.lastAnim) { a.react = emptyEnv(); a.lastAnim = anim; }
  if (LOOPED[anim] && !a.react.kind) react(a, LOOPED[anim]);
  const p = updateActor(a, o.dt);
  // zit/fiets: de host regelt dat; hier alleen botten
  if (anim === 'ride') {
    p.legL.z = 0.9; p.legR.z = 0.5; p.legL.k = -1.1; p.legR.k = -0.5;
    p.armL.z = 1.0; p.armR.z = 1.0; p.armL.e = 0.4; p.armR.e = 0.4; p.chest.z = -0.15;
  }
  // bewegingsvormen (bewegingrules.js, #207): de host zet positie en kanteling, hier alleen de botten
  const tt = finite(o.t);
  if (anim === 'zwem') blendPose(p, zwemStand(tt), 1);
  else if (anim === 'klim') blendPose(p, klimStand(tt), 1);
  else if (anim === 'sprong') blendPose(p, sprongStand((tt % 1.2) / 1.2), 1);
  applyPose(ud, p);
  a.events.length = 0;
  return true;
}
