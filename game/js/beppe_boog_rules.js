// Pure rules of the Beppe arc (issue #1063): the phase of the house (closed,
// alive, memory), derived from the story state and a few per-save marks; which
// scene or visit comes next; the conversation runner; the memory notes and the
// rare echoes. No THREE, no DOM, no clock: scripts/beppe_boog_test.mjs imports it.
//
// The arc, in the story chain:
//   M01 done        the house opens (visitUnlocked): Tammo invites you.
//   first visit     the first time you go in: Beppe, Tammo and Tessa (the scene
//                   FIRST_VISIT); Tessa meets her. Marks 'eerste'.
//   M03 / M06       a text nudge when you have not been (twice at most).
//   death           derived: she is there for two or three visits. M06 is done AND you
//                   have been in twice (the meeting plus one return), or M04 is done AND
//                   you have been in three times, or M08 is done whatever happened (the
//                   story must go on). She never dies right after the first meeting. It is a
//                   function of the story state and the marks, never stored.
//   news            once, when the death point is passed while you play, and
//                   you are outside the house: a text from Tante Aaltje.
//   farewell        the first visit afterwards: the empty house (FAREWELL_SCENE).
//   memory          after that: the house stays open as a memory.
// A save that is already past the death point is simply in the memory phase: no
// news and no farewell scene (the marks are set silently, beppe_binnen.js).

import { STEPS, stepDone } from './storyarc.js';
import { visitUnlocked, eligible, pickBeat, pickNote, pickTip } from './beppe_visit_rules.js';
import {
  FIRST_VISIT, GREETING, GOODBYE, MEMORY, ECHOES, NUDGE,
} from './beppe_boog_texts.js';

export const STEP = { unlock: 'M01', nudge1: 'M03', death: 'M06', deathEarly: 'M04', deathFallback: 'M08' };
export const MARK = { set: 'beppe', first: 'eerste', news: 'nieuws', farewell: 'afscheid', echo: (id) => `echo:${id}`, nudge: (n) => `wenk:${n}`, visit: (n) => `bezoek${n}` };
export const MAX_VISIT_MARKS = 4;
export const MAX_ALIVE_VISITS = 3;

// A story snapshot like in beppe_visit_rules.js: { done, completed }.
function reached(snap, id) {
  const k = STEPS.findIndex((s) => s.id === id);
  if (k < 0) return false;
  const done = new Set(snap && Array.isArray(snap.done) ? snap.done : []);
  const passed = new Set(snap && Array.isArray(snap.completed) ? snap.completed : []);
  for (let i = k; i < STEPS.length; i++) if (stepDone(i, (x) => done.has(x), (m) => passed.has(m))) return true;
  return false;
}
export const stepReached = reached;

// The marks of one save: a Set of strings (the per-save set 'beppe').
const has = (marks, id) => !!marks && typeof marks.has === 'function' && marks.has(id);
export function visitsDone(marks) {
  let n = 0;
  for (let i = 1; i <= MAX_VISIT_MARKS; i++) if (has(marks, MARK.visit(i))) n = i;
  return n;
}
export const nextVisitMark = (marks) => (visitsDone(marks) < MAX_VISIT_MARKS ? MARK.visit(visitsDone(marks) + 1) : null);

// 'dicht' | 'levend' | 'herinnering'
export function arcPhase(snap, marks) {
  if (!visitUnlocked(snap)) return 'dicht';
  // she is there for two or three visits (the meeting with Tessa, one or two short ones), then comes the farewell
  const v = visitsDone(marks);
  const dead = reached(snap, STEP.deathFallback)
    || (reached(snap, STEP.death) && has(marks, MARK.first) && v >= 2)
    || (reached(snap, STEP.deathEarly) && has(marks, MARK.first) && v >= MAX_ALIVE_VISITS);
  return dead ? 'herinnering' : 'levend';
}

// Which scene plays when the player goes in now: 'eerste' (the first visit),
// 'afscheid' (the first visit after the news), or null (a normal visit).
export function sceneOnEnter(phase, marks) {
  if (phase === 'levend' && !has(marks, MARK.first)) return 'eerste';
  if (phase === 'herinnering' && !has(marks, MARK.farewell)) return 'afscheid';
  return null;
}

// A text nudge while she is alive and the player has not been (or only once).
export function nudgeDue(snap, marks, phase) {
  if (phase !== 'levend') return null;
  const v = visitsDone(marks);
  if (v === 0 && reached(snap, STEP.nudge1) && !has(marks, MARK.nudge(1))) return { key: MARK.nudge(1), ...NUDGE.first };
  if (v < 2 && reached(snap, STEP.death) && !has(marks, MARK.nudge(2))) return { key: MARK.nudge(2), ...NUDGE.second };
  return null;
}

// The echoes: one is due when its step is done and it has not been told in this save.
export function echoDue(snap, marks, phase) {
  if (phase !== 'herinnering') return null;
  for (const e of ECHOES) if (reached(snap, e.step) && !has(marks, MARK.echo(e.id))) return e;
  return null;
}

// --- the conversation runner ---------------------------------------------------------
// A script is a list of beats; a choice beat opens its options and the chosen reply
// plays before the rest. current() is the beat on screen, advance() goes on (a choice
// beat waits for choose(i)), done is true after the last beat.
export function createRunner(script) {
  const queue = (Array.isArray(script) ? script : []).map((b) => b);
  let cur = queue.shift() || null;
  const log = [];
  const api = {
    get done() { return cur == null; },
    current: () => cur,
    isChoice: () => !!(cur && cur.choice),
    log,
    advance() {
      if (!cur || cur.choice) return false;
      log.push(cur);
      cur = queue.shift() || null;
      return true;
    },
    choose(i) {
      if (!cur || !cur.choice || !cur.choice[i]) return false;
      log.push({ picked: i, label: cur.choice[i].label });
      queue.unshift(...(cur.choice[i].reply || []));
      cur = queue.shift() || null;
      return true;
    },
  };
  return api;
}

// A normal visit while she lives: a greeting by visit count and by who is playing,
// one remark by act, time and weather, a tip on every other visit, a goodbye.
// Deterministic in (day, visit); `last` avoids the same remark twice.
export function aliveVisit(ctx, { day = 0, visit = 0, last = '' } = {}, snap = null) {
  const g = visit >= 4 ? GREETING.often : GREETING.second;
  const ask = ctx.who === 'anita' ? GREETING.askTammo : GREETING.askTessa;
  const hash = ((day * 31 + visit * 17) >>> 0);
  const first = visit % 2 === 0 ? g : ask;
  const beats = [{ who: 'beppe', text: first[hash % first.length] }];
  const note = pickNote(ctx, { day, visit, last });
  if (note) beats.push({ who: 'beppe', text: note.text, id: note.id });
  if (visit % 2 === 1) {
    const tip = pickTip(ctx, { day, visit: visit + 1, last: '' });
    if (tip) beats.push({ who: 'beppe', text: tip.text, id: tip.id });
  }
  beats.push({ who: 'beppe', text: GOODBYE[(hash >> 2) % GOODBYE.length] });
  return beats;
}

// The memory notes: "wat Beppe zou zeggen", by act, who plays, time and weather.
export const pickMemory = (ctx, st) => pickBeat(MEMORY, ctx, st);
export const memoryEligible = (ctx) => eligible(MEMORY, ctx);

