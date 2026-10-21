// Cutscene preview (#209), the pure part: a catalogue of every staged scene,
// its validation status, and the sampling the preview page (game/cutpreview.html,
// cutpreviewui.js) draws and scrubs. No THREE, no DOM, no world: it runs in
// node (scripts/cutpreview_test.mjs) and in the browser without the game.
//
//   const cat = buildCatalog({ script, npcSource });   // [{ id, group, title, status, issues, ... }]
//   const frame = frameAt(entry, t);                    // actors, props, camera, shot at time t
//   const stills = stillTimes(entry);                   // one time per shot (for the screenshot export)
//
// Clipping needs a world (env.solid) and is not checked here; the status says so.
import { compileScene, validateScene } from './cutscript.js';
import { missionScene, SPECS, MORE_SPECS } from './cutscenes_akte1.js';
import './cutscenes_akte2.js';
import './cutscenes_akte3.js';
import './cutscenes_akte4.js';
import { OPENING_ACTS, openingActs, END_CARD, flatScene } from './cutscenes.js';
import { STEPS } from './storyarc_nieuw.js';
import { propFoot } from './cutscenemodels.js';

export const STATUS = { ok: 'ok', warn: 'waarschuwing', error: 'fout' };
export const STATUS_LABEL = { ok: 'In orde', waarschuwing: 'Let op', fout: 'Fout' };
const NOT_CHECKED = 'Botsing met gebouwen is niet gecontroleerd: daar is de wereld voor nodig.';

const SPEAKER_NAME = { T: 'Tammo', A: 'Anita' };
const MAX_STEP = 0.45; // m between two frames of 0.1 s: more is a jump
export const MAX_CAMERA_STILL = 8; // s the camera may hold still (ritme-regel, #136)
const NEAR = 45; // m the camera may stray from the anchor
const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 0 };

// { berend: { name: 'Berend Bos' }, ... } from the text of missionstory.js (the real looks need THREE).
export function npcNamesFromSource(src) {
  const looks = {};
  for (const m of String(src).matchAll(/^ {2}(\w+): \{.*?name: '([^']+)'/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };
  return looks;
}

// The lines of script scenes the way missionstory.js times them without recordings:
// reading time, 0.6 s lead, 0.1 s between. Returns { lines, total }.
export function linesOf(script, ids, looks = {}, slice = null) {
  const out = [];
  let t = 0.6;
  for (const id of ids) {
    const sc = script.scenes.find((s) => s.id === id);
    if (!sc) continue;
    for (const l of slice ? sc.lines.slice(slice[0], slice[1]) : sc.lines) {
      if (l.channel === 'app-stil') continue;
      const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
      out.push({ speaker: SPEAKER_NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
      t += dur + 0.1;
    }
  }
  return { lines: out, total: t + 0.3 };
}

// The lines of an evening at home the way story.js (story-wait) and storyeikea.js (story-eikea) time them without
// recordings: 2.2 s lead, reading time per line, 0.25 s between. Returns { lines, total } like linesOf.
function homeLinesOf(script, id, looks = {}) {
  const sc = script.scenes.find((s) => s.id === id);
  const out = [];
  let t = 2.2;
  for (const l of (sc && sc.lines) || []) {
    if (l.channel === 'app-stil') continue;
    const dur = Math.max(1.6, Math.min(5, 0.8 + l.text.length * 0.055));
    out.push({ speaker: SPEAKER_NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
    t += dur + 0.25;
  }
  return { lines: out, total: t + 0.4 };
}

// 'M26.4#7-14' -> ['M26.4'], lines 7 to 13: a stage scene that plays a slice of a script scene (missions_akte5.js script { from, to })
export function sliceOf(key) {
  const m = /^(.+)#(\d+)-(\d+)$/.exec(key);
  return m ? { id: m[1], from: +m[2], to: +m[3] } : null;
}

// 'M08.intro' -> ['M08.1'] through the story steps; 'M01.3' (no suffix) is a script scene itself.
export function sceneIdsFor(key, steps = STEPS) {
  const sl = sliceOf(key);
  if (sl) return [sl.id];
  const m = /^(\w+)\.(intro|outro)$/.exec(key);
  if (!m) return [key];
  const step = steps.find((s) => s.id === m[1]);
  return (step && step.story && step.story[m[2]]) || [];
}

// Pure checks on top of validateScene: timing and sampling. Returns { issues, warnings }.
function checkSampling(def, lines, duration) {
  const issues = [], warnings = [];
  let scene;
  try { scene = compileScene(def, { lines, duration }); } catch (e) { return { issues: [String(e.message || e)], warnings, scene: null }; }
  let finite = true, near = true, maxStep = 0, prev = null, stillFrom = 0, longestStill = 0, stillAt = 0;
  const shots = new Set();
  for (let t = 0; t <= duration; t += 0.1) {
    const s = scene.sample(t, ANCHOR);
    const c = s.camera;
    for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
    if (Math.hypot(c.position.x - ANCHOR.x, c.position.y - ANCHOR.y) > NEAR) near = false;
    for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze]) if (!Number.isFinite(v)) finite = false;
    if (prev) for (const [id, a] of Object.entries(s.actors)) {
      const p = prev.actors[id];
      if (a.anim === 'ride' || (p && p.anim === 'ride')) continue;
      maxStep = Math.max(maxStep, Math.hypot(a.x - p.x, a.y - p.y));
    }
    shots.add(c.shotIndex);
    if (prev) {
      const pc = prev.camera;
      const d = Math.hypot(c.position.x - pc.position.x, c.position.y - pc.position.y, c.position.z - pc.position.z) + Math.hypot(c.lookAt.x - pc.lookAt.x, c.lookAt.y - pc.lookAt.y, c.lookAt.z - pc.lookAt.z) + Math.abs(c.fov - pc.fov);
      if (c.shotIndex !== pc.shotIndex || d > 0.004) { if (t - stillFrom > longestStill) { longestStill = t - stillFrom; stillAt = stillFrom; } stillFrom = t; }
    }
    prev = s;
  }
  if (duration - stillFrom > longestStill) { longestStill = duration - stillFrom; stillAt = stillFrom; }
  if (longestStill > MAX_CAMERA_STILL) issues.push(`ritme: de camera staat ${longestStill.toFixed(1)} s stil (vanaf ${stillAt.toFixed(1)} s), maximaal ${MAX_CAMERA_STILL} s`);
  if (!finite) issues.push('timing: een positie of camerawaarde is geen getal');
  if (!near) issues.push(`camera: verder dan ${NEAR} m van de plek`);
  if (maxStep >= MAX_STEP) warnings.push(`timing: iemand springt ${maxStep.toFixed(2)} m in 0,1 s`);
  if (shots.size < Math.min(4, Math.max(1, lines.length))) warnings.push(`camera: maar ${shots.size} verschillende shots`);
  return { issues, warnings, scene, rhythm: { longestStill, stillAt, shots: shots.size } };
}

function entryFor({ id, group, title, def, lines, duration, missing }) {
  const issues = [], warnings = [];
  if (missing) issues.push(...missing.map((m) => `ontbrekende acteur: ${m}`));
  let scene = null, rhythm = null;
  if (def) {
    for (const m of validateScene(def, { lines, duration })) issues.push(m);
    if (!issues.length) {
      const r = checkSampling(def, lines, duration);
      issues.push(...r.issues);
      warnings.push(...r.warnings);
      scene = r.scene;
      rhythm = r.rhythm || null;
    }
  } else if (!missing) issues.push('scene is niet te bouwen');
  const status = issues.length ? STATUS.error : warnings.length ? STATUS.warn : STATUS.ok;
  return { id, group, title, status, issues, warnings, note: NOT_CHECKED, def, lines, duration, scene, rhythm, shots: scene ? scene.shots || [] : [] };
}

// Names in a spec's cast without a look in the NPC table: the reason missionScene gives null.
function missingCast(key, looks) {
  const spec = SPECS[key] || MORE_SPECS[key];
  if (!spec) return null;
  const out = [];
  for (const [id, c] of Object.entries(spec.cast || {})) if (!looks[c.key]) out.push(`${id} (${c.key})`);
  return out.length ? out : null;
}

// opts: script (script.json), npcSource (text of missionstory.js) or looks.
export function buildCatalog({ script, npcSource = '', looks = null }) {
  const L = looks || npcNamesFromSource(npcSource);
  const out = [];
  // the opening: three acts on the C00 lines
  const open = linesOf(script, ['C00.1', 'C00.2', 'C00.3'], L);
  const acts = openingActs(open.lines);
  OPENING_ACTS.forEach((def, i) => {
    const a = acts.find((x) => x.def === def);
    out.push(entryFor({ id: def.id, group: 'Opening', title: `Opening, deel ${i + 1}`, def, lines: a ? a.lines : [], duration: a ? a.duration : 10 }));
  });
  out.push(entryFor({ id: END_CARD.id, group: 'Opening', title: 'Eindkaart (Wordt vervolgd)', def: END_CARD, lines: [], duration: 6.5 }));
  // the missions of the new story
  const keys = [...new Set([...Object.keys(SPECS), ...Object.keys(MORE_SPECS)])].sort();
  for (const key of keys) {
    const ids = sceneIdsFor(key);
    const missing = missingCast(key, L);
    const sl = sliceOf(key);
    const { lines, total } = linesOf(script, ids, L, sl ? [sl.from, sl.to] : null);
    if (!ids.length || !lines.length) {
      out.push(entryFor({ id: key, group: 'Missies', title: key, def: null, lines: [], duration: 0 }));
      out[out.length - 1].issues = ['geen scriptregels voor ' + (ids.join(', ') || key)];
      continue;
    }
    const def = missing ? null : missionScene(key, lines, { looks: L });
    out.push(entryFor({ id: key, group: 'Missies', title: key, def, lines, duration: total, missing }));
  }
  // the evenings at home, generated from the lines (flatScene): only M06.0 is one in the story today, the other two
  // variants (EIKEA, a quiet evening) borrow its lines to show the staging
  const home = homeLinesOf(script, 'M06.0', L);
  if (home.lines.length > 2) {
    for (const [id, variant, title] of [['M06.0', 'wachten', 'Thuisavond: wachten tot middernacht (M06.0)'], ['story-eikea', 'eikea', 'Thuisavond: meubels in elkaar (voorbeeldregels M06.0)'], ['story-avond', 'avond', 'Thuisavond: een rustige avond (voorbeeldregels M06.0)']]) {
      out.push(entryFor({ id, group: 'Thuisavonden', title, def: flatScene(variant, home.lines), lines: home.lines, duration: home.total }));
    }
  }
  return out;
}

export function summary(cat) {
  const n = { ok: 0, waarschuwing: 0, fout: 0 };
  for (const e of cat) n[e.status]++;
  return n;
}

// One frame to draw: actors and props (x, y in the anchor's world), the camera, the shot and the speaker.
export function frameAt(entry, t) {
  if (!entry || !entry.scene) return null;
  const tt = Math.max(0, Math.min(entry.duration, t));
  const s = entry.scene.sample(tt, ANCHOR);
  const line = entry.lines.find((l) => tt >= l.at && tt < l.at + l.dur) || null;
  return { t: tt, anchor: ANCHOR, actors: s.actors, props: s.props, camera: s.camera, shot: s.camera.shotIndex, speaker: line ? line.speaker : null, text: line ? line.text : '' };
}

// The start time of every shot (and the last frame of the scene as a closing still): the moments for the screenshot export.
export function stillTimes(entry) {
  if (!entry || !entry.scene) return [];
  const times = [];
  let lastShot = -1;
  for (let t = 0; t <= entry.duration; t += 0.1) {
    const s = entry.scene.sample(t, ANCHOR).camera.shotIndex;
    if (s !== lastShot) { times.push(Math.round((t + 0.2) * 10) / 10); lastShot = s; }
  }
  return times.map((t) => Math.min(t, entry.duration));
}

// File name of a still: 'M01.intro-shot03-t12.4.png'
export function stillName(id, shotIndex, t) {
  return `${id}-shot${String(shotIndex).padStart(2, '0')}-t${t.toFixed(1)}.png`;
}

// The world rectangle that frames everything a scene has on stage over its whole length (for the top-down view).
export function sceneBounds(entry, step = 0.5) {
  if (!entry || !entry.scene) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (let t = 0; t <= entry.duration; t += step) {
    const s = entry.scene.sample(t, ANCHOR);
    for (const a of Object.values(s.actors)) add(a.x, a.y);
    for (const p of Object.values(s.props)) add(p.x, p.y);
    add(s.camera.position.x, s.camera.position.y);
  }
  const pad = 3;
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

// What the camera sees, without a renderer (the preview's camera view): every actor (a 1.75 m column) and prop (its footprint box
// or a small block) in normalised screen coordinates (-1..1, y up) for the camera of `frame`, nearest last so the caller can paint
// back to front. Pure perspective, no occlusion and no buildings. `speakerInFrame` is true when the speaker's column is on screen.
const ACTOR_H = 1.75, ACTOR_W = 0.5;
export function projectFrame(entry, frame, aspect = 16 / 9) {
  if (!frame) return null;
  const c = frame.camera;
  // three space: X = x, Y = z (up), Z = y
  const P = [c.position.x, c.position.z, c.position.y];
  let f = [c.lookAt.x - P[0], c.lookAt.z - P[1], c.lookAt.y - P[2]];
  const fl = Math.hypot(...f) || 1;
  f = f.map((v) => v / fl);
  let r = [-f[2], 0, f[0]]; // cross(forward, up)
  const rl = Math.hypot(...r) || 1;
  r = r.map((v) => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const th = Math.tan((c.fov * Math.PI) / 360);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const pt = (x, y, z) => {
    const v = [x - P[0], z - P[1], y - P[2]];
    const zc = dot(v, f);
    if (zc < 0.1) return null;
    return { x: dot(v, r) / (zc * th * aspect), y: dot(v, u) / (zc * th), d: zc };
  };
  const figures = [];
  const add = (id, kind, x, y, z0, z1, hw, speaking) => {
    const a = pt(x, y, z0), b = pt(x, y, z1), l = pt(x, y, (z0 + z1) / 2);
    if (!a || !b || !l) return;
    const w = (hw / (l.d * th * aspect));
    const out = Math.abs(l.x) - w > 1 || Math.max(a.y, b.y) < -1 || Math.min(a.y, b.y) > 1;
    figures.push({ id, kind, x: l.x, w, yBottom: a.y, yTop: b.y, d: l.d, speaking: !!speaking, inFrame: !out });
  };
  const def = (entry && entry.def) || {};
  for (const [id, p] of Object.entries(frame.props || {})) {
    if (p.visible === false) continue;
    const kind = def.props && def.props[id] ? def.props[id].kind : '';
    const foot = propFoot(kind);
    add(id, 'prop', p.x, p.y, p.h || 0, (p.h || 0) + (foot ? foot[2] : 0.6), foot ? Math.max(foot[0], foot[1]) / 2 : 0.3, false);
  }
  for (const [id, a] of Object.entries(frame.actors || {})) {
    if (a.visible === false) continue;
    const speaking = frame.speaker && def.actors && def.actors[id] && [].concat(def.actors[id].speaker || []).includes(frame.speaker);
    add(id, 'actor', a.x, a.y, 0, ACTOR_H, ACTOR_W / 2, speaking);
  }
  figures.sort((p, q) => q.d - p.d);
  const speakers = figures.filter((q) => q.speaking);
  return { figures, horizon: Math.tan(Math.asin(Math.max(-1, Math.min(1, f[1])))) / th, speakerInFrame: speakers.length ? speakers.some((q) => q.inFrame) : null };
}
