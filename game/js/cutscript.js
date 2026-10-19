// Cutscene direction language (#136): a scene is data, this module turns it into
// a pure, deterministic sampler. No THREE, no DOM: the host (cutscenehost.js)
// puts the sampled state on meshes, the tests run it in plain node.
//
//   const scene = compileScene(def, { lines, duration });   // throws on a broken scene
//   const s = scene.sample(t, anchor, env);                 // { actors, props, camera, speaker }
//   const a = fitAnchor(scene, anchor, env);                // the anchor (turned) where nothing stands in a wall
//
// A scene def (all coordinates are LOCAL to the anchor: f = forward, s = left, h = up in m):
//   id, actors: { <id>: { look, at: [f, s], face: deg | 'actor:<id>', anim, speaker, gaze, sit: seat height in m } }
//   set: 'keuken' (the kitchen set of the opening, built by the host), fx: [{ t, fx: 'buzz' | 'door' | 'cups' | 'tablecups' | 'sfx' | 'pulse', ... }] (host effects, see cutscenehost.js)
//   props:  { <id>: { kind, at: [f, s, h], face: deg, hidden } }
//   cues:   [{ t, actor | prop, ...verb }]   verbs, see VERBS
//   shots:  [{ t, shot: 'cut' | 'dolly' | 'orbit' | 'follow', ... }]
// `t` is seconds, or 'L<n>' / 'L<n>+1.5' (relative to the start of spoken line n), or 'end'.
// The spoken lines themselves are never part of a scene: they come from the story data.
//
// Animation layer: actoranim.js (animateActor(mesh, { anim, speed, gaze, t, dt }),
// gaze = head yaw in rad, positive = target to the left of the body). The names
// below must equal its ANIMS (scripts/cutscript_test.mjs checks that).

export const ACTOR_ANIMS = ['idle', 'walk', 'run', 'talk', 'wave', 'point', 'shrug', 'nod', 'shake', 'laugh', 'carry', 'lean', 'hips', 'phone', 'cheer', 'look', 'ride', 'zwem', 'klim', 'sprong'];
export const PROP_KINDS = ['doos', 'tas', 'bestelbus', 'fiets', 'duif', 'radio', 'bord', 'koffer', 'bal', 'auto', 'matras', 'bakkie', 'automaat', 'aanhanger', 'trekker', 'politie', 'duiventil', 'zuil', 'klembord', 'kat'];
export const VERBS = ['walk', 'anim', 'face', 'gaze', 'carry', 'drop', 'move', 'path', 'spin', 'bob', 'show', 'hide', 'sit'];
export const SHOTS = ['cut', 'dolly', 'orbit', 'follow'];
// The host can scale or remove camera shake (a11y.js: Beweging beperken).
let shakeFilter = (a) => a;
export function setShakeFilter(fn) { shakeFilter = typeof fn === 'function' ? fn : (a) => a; }
export const WALK_SPEED = 1.4;
export const EYE_H = 1.55;

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
    if (a.sit !== undefined && a.sit !== false && !(isNum(a.sit) && a.sit > 0)) err(`acteur ${id}: sit is een zithoogte in m`);
    if (typeof a.face === 'string' && !refOk(a.face, actors, props)) err(`acteur ${id}: face verwijst nergens heen: ${a.face}`);
  }
  for (const [id, p] of Object.entries(props)) {
    if (!PROP_KINDS.includes(p.kind)) err(`prop ${id}: onbekende soort ${p.kind}`);
    if (!isVec(p.at, 2)) err(`prop ${id}: at moet [f, s, h?] zijn`);
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
    if (c.anim !== undefined && !ACTOR_ANIMS.includes(c.anim)) err(`${what}: onbekende anim ${c.anim}`);
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
    if (s.fov !== undefined && !(isNum(s.fov) && s.fov >= 14 && s.fov <= 90)) err(`${what}: fov buiten 14-90`);
  });
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
  const shots = (def.shots || []).map((s) => ({ ...s, t: T(s.t) })).sort((a, b) => a.t - b.t);

  // per actor: movement segments [{t0, t1, pts}], anim/gaze/face/carry events
  const track = {};
  for (const [id, a] of Object.entries(actors)) {
    track[id] = { pos0: [a.at[0], a.at[1]], face0: a.face, segs: [], anims: [{ t: 0, v: a.anim || 'idle' }], gazes: [{ t: 0, v: a.gaze ?? null }], faces: [], carries: [], vis: [], sits: [{ t: 0, v: a.sit || 0 }] };
  }
  const drops = [];
  const ptrack = {};
  for (const [id, p] of Object.entries(props)) ptrack[id] = { pos0: [p.at[0], p.at[1], p.at[2] ?? 0], hidden0: !!p.hidden, moves: [], spins: [], bobs: [], vis: [] };

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
      if (c.anim !== undefined && !c.walk) k.anims.push({ t: c.t, v: c.anim });
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
    for (const s of k.segs) { const q = along(s.pts, s.len); keys.push({ t: s.t1, v: { heading: q.a } }); }
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
    // carried: rides along with the actor's hands
    if (!raw) for (const [aid, ak] of Object.entries(track)) {
      const c = last([{ t: 0, v: null }, ...ak.carries], t);
      if (c.v === id) {
        const ap = actorPos(aid, t), af = actorFacing(aid, t);
        pos = [ap.f + Math.cos(af) * 0.35, ap.s + Math.sin(af) * 0.35, 1.0];
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
    let pos, look;
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
        look = { f: c.f, s: c.s, h: c.h };
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
    }
    if (sh.shake && shakeFilter(sh.shake) > 0) {
      const a = shakeFilter(sh.shake);
      pos = { f: pos.f + Math.sin(t * 1.3) * a, s: pos.s + Math.sin(t * 1.9 + 2) * a, h: pos.h + Math.sin(t * 1.7 + 1) * a * 0.6 };
    }
    // a camera never stands inside a person: pushed out to CAM_CLEAR, away from them (continuous in t)
    if (pos.h < 2.4 && !def.set) for (const id of Object.keys(track)) {
      if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
      const p = actorPos(id, t);
      let dx = pos.f - p.f, ds = pos.s - p.s, d = Math.hypot(dx, ds);
      if (d >= CAM_CLEAR) continue;
      if (d < 0.05) { dx = pos.f - look.f; ds = pos.s - look.s; d = Math.hypot(dx, ds) || 1; }
      pos = { f: p.f + dx / d * CAM_CLEAR, s: p.s + ds / d * CAM_CLEAR, h: pos.h };
    }
    if (!def.set) for (const id of Object.keys(ptrack)) {
      const q = propState(id, t);
      if (!q.visible || pos.h > q.h + 1.4 || pos.h < q.h - 0.3) continue;
      let dx = pos.f - q.f, ds = pos.s - q.s, d = Math.hypot(dx, ds);
      if (d >= PROP_CLEAR) continue;
      if (d < 0.05) { dx = pos.f - look.f; ds = pos.s - look.s; d = Math.hypot(dx, ds) || 1; }
      pos = { f: q.f + dx / d * PROP_CLEAR, s: q.s + ds / d * PROP_CLEAR, h: pos.h };
    }
    const P = world(anchor, pos.f, pos.s), L = world(anchor, look.f, look.s);
    const z0 = anchor.z || 0;
    let cam = fitCamera({ x: P.x, y: P.y, z: z0 + pos.h }, { x: L.x, y: L.y, z: z0 + look.h }, env);
    // fitCamera may have pulled the camera in from a wall, next to a person: push out again unless that lands in a wall
    if (!def.set && cam.z - z0 < 2.4) for (const id of Object.keys(track)) {
      if (last([{ t: 0, v: true }, ...track[id].vis], t).v === false) continue;
      const q = actorPos(id, t), W = world(anchor, q.f, q.s);
      const dx = cam.x - W.x, dy = cam.y - W.y, d = Math.hypot(dx, dy);
      if (d >= CAM_CLEAR || d < 0.05) continue;
      const nx = W.x + dx / d * CAM_CLEAR, ny = W.y + dy / d * CAM_CLEAR;
      if (env && env.solid && env.solid(nx, ny, cam.z)) continue;
      if (env && env.clamp) { const c2 = env.clamp(nx, ny, cam.z, 'camera'); if (c2 && (Math.abs(c2.x - nx) > 1e-6 || Math.abs(c2.y - ny) > 1e-6)) continue; }
      cam = { ...cam, x: nx, y: ny };
    }
    return {
      position: cam, lookAt: { x: L.x, y: L.y, z: z0 + look.h },
      fov: sh.fov ?? 46, cut: u === 0 || (t - sh.t) < 1 / 30, shotIndex: i,
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
      const gt = g === 'speaker' ? (speakId && speakId !== id ? speakId : null) : g;
      if (gt && gt !== 'camera') {
        const o = pointOf(gt, t);
        gaze = Math.max(-1.0, Math.min(1.0, angDiff(actorFacing(id, t), Math.atan2(o.s - p.s, o.f - p.f))));
      }
      outA[id] = { x: w.x, y: w.y, h: anchor.z || 0, a, anim, speed: p.moving ? p.moving.speed : 0, gaze, look: actors[id].look, speaking: id === speakId, carrying, sit: p.moving ? 0 : last(k.sits, t).v, visible: last([{ t: 0, v: true }, ...k.vis], t).v };
    }
    for (const id of Object.keys(ptrack)) {
      const s = propState(id, t);
      const w = fit(world(anchor, s.f, s.s), env);
      outP[id] = { x: w.x, y: w.y, h: (anchor.z || 0) + s.h, a: s.a + anchor.facing, visible: s.visible, kind: props[id].kind };
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
    for (const c of cues) if (c.actor === id) marks.add(c.t);
    // speaking counts as life (the talk anim runs), so cut stretches at line edges
    const ts = [...marks].filter((x) => x >= 0 && x <= duration).sort((a, b) => a - b);
    const out = [];
    let from = null;
    for (let i = 0; i + 1 < ts.length; i++) {
      const mid = (ts[i] + ts[i + 1]) / 2;
      const alive = actorPos(id, mid).moving || last([{ t: 0, v: true }, ...k.vis], mid).v === false || last(k.anims, mid).v !== 'idle' || last(k.gazes, mid).v === 'speaker' && !!lines.length || (lines.length && actorOfSpeaker(speakerAt(mid)) === id);
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
function fit(p, env) {
  if (!env || !env.clamp) return p;
  const q = env.clamp(p.x, p.y, 0, 'actor');
  return q ? { x: q.x, y: q.y } : p;
}

// A camera that sits in a wall is moved into free space: clamped, then pulled towards what it
// looks at, then lifted over the roof. Returns {x, y, z}.
export function fitCamera(pos, look, env) {
  if (!env) return pos;
  let p = pos;
  if (env.clamp) { const q = env.clamp(p.x, p.y, p.z, 'camera'); if (q) p = { x: q.x, y: q.y, z: q.z ?? p.z }; }
  if (env.solid && env.solid(p.x, p.y, p.z)) {
    let found = null;
    for (let k = 1; k <= 8 && !found; k++) {
      const u = k / 8 * 0.85;
      const c = { x: p.x + (look.x - p.x) * u, y: p.y + (look.y - p.y) * u, z: p.z + (look.z - p.z) * u * 0.5 };
      if (!env.solid(c.x, c.y, c.z)) found = c;
    }
    if (!found) { found = { ...p }; for (let k = 0; k < 12 && env.solid(found.x, found.y, found.z); k++) found.z += 1.5; }
    p = found;
  }
  return p;
}

// The anchor, turned in steps of 30 degrees (the smallest turn that is clean), so that no actor, prop or
// camera of the scene stands inside a building. Without env.solid the anchor stays.
export function fitAnchor(scene, anchor, env) {
  if (!env || !env.solid || env.clamp) return anchor;
  const score = (a) => {
    let bad = 0;
    for (let t = 0; t <= scene.duration; t += 0.6) {
      const s = scene.sample(t, a);
      for (const o of Object.values(s.actors)) if (o.visible !== false && env.solid(o.x, o.y, (a.z || 0) + 0.9)) bad += 2;
      for (const o of Object.values(s.props)) if (o.visible && env.solid(o.x, o.y, o.h + 0.4)) bad += 1;
      const c = s.camera.position;
      if (env.solid(c.x, c.y, c.z)) bad += 1;
    }
    return bad;
  };
  let best = anchor, bestScore = score(anchor);
  for (const k of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) {
    if (bestScore === 0) break;
    const a = { ...anchor, facing: anchor.facing + k * Math.PI / 6 };
    const sc = score(a) + Math.abs(k) * 0.01;
    if (sc < bestScore) { best = a; bestScore = sc; }
  }
  return best;
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
