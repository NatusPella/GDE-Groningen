// The one talking channel. Every spoken line (cutscenes, calls, car banter,
// bijbaan bosses, reactions, speech bubbles, the night radio) asks here
// before it plays, so two voices never overlap and the most important one
// wins. Pure state, no audio: audio.js plays the clips and sets the clock
// (the AudioContext time); scripts/speech_test.mjs drives it directly.
//
// Rules (ARCHITECTURE.md "Spoken lines"):
// - one line at a time: `begin` grants the channel, `end` frees it, and a
//   line that never reports its end frees it at start + duration.
// - a higher class cuts a lower one off (its `stop` runs) when the newcomer
//   is at least a bijbaan line (any voice cuts the radio) and the one
//   talking is below a phone call; a story line cuts off everything.
//   Everything else waits or drops.
// - a `hold` claims the channel for a whole conversation (story scene,
//   phone call, car banter): lines of that class or lower from anyone else
//   are refused; story, and call/mission over banter, end the hold (its
//   onPreempt runs).
// - after a line the next may only start after a short gap per class
//   (ambient chatter and the radio wait longest).
// - `request` with maxWait queues a line instead of dropping it; `tick`
//   plays queued lines when the channel frees up, most important first.
// - the radio (G-Music jingles, DJ lines) only talks after RADIO_QUIET s of
//   silence; music ducks while anyone talks.

import { SPEECH_PRIO, cutsHold, cutsClip, mayShow } from './hudbus.js';

// the classes, the gaps and the rule of who may cut whom are in hudbus.js (mayShow('speech', ...))
export const PRIO = SPEECH_PRIO;
const TAIL = 0.15;
export const RADIO_QUIET = 2.5;
const MAX_QUEUE = 4;
// Safety net against a hold nobody releases (a cancelled scene, a call
// ended by a path that forgot to release): a hold lasts at most this long,
// and one whose `alive` probe reports false for HOLD_GRACE s is dropped.
const HOLD_MAX = { radio: 30, ambient: 30, react: 30, job: 120, banter: 150, call: 420, mission: 900, story: 1800 };
const HOLD_GRACE = 3;
const CLIP_MAX = 90;

let clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
let cur = null;
let lastEnd = -Infinity;
let holds = new Map();
let queue = [];
let nextId = 1;
const history = [];

export function setSpeechClock(fn) { clock = fn; }

export function resetSpeech() {
  cur = null;
  lastEnd = -Infinity;
  holds = new Map();
  queue = [];
  history.length = 0;
}

function note(ev, cls, extra) {
  history.push({ t: +clock().toFixed(2), ev, cls, ...extra });
  if (history.length > 40) history.shift();
}

function active(now) {
  if (cur && now >= cur.until) {
    lastEnd = cur.until;
    note('timeout', cur.cls);
    cur = null;
  }
  return cur;
}

function strongestHold(owner) {
  let best = null;
  for (const [o, h] of holds) if (o !== owner && (!best || h.prio > best.prio)) best = h;
  return best;
}

export function canSpeak(cls, owner = null) {
  if ((PRIO[cls] ?? PRIO.ambient) === PRIO.story) return true;
  const now = clock();
  const c = active(now);
  return mayShow('speech', {
    cls,
    clip: c ? { prio: c.prio, own: !!(owner && c.owner === owner) } : null,
    hold: strongestHold(owner),
    silentFor: now - lastEnd,
  });
}

// Grants the channel for `dur` seconds (a guess is fine; `extend` corrects
// it once the clip's length is known). Returns a token or null.
export function begin(cls, dur, { stop = null, owner = null } = {}) {
  if (!canSpeak(cls, owner)) return null;
  const p = PRIO[cls] ?? PRIO.ambient;
  const now = clock();
  const c = active(now);
  if (c) {
    cur = null;
    note('cut', c.cls, { by: cls });
    if (c.stop) try { c.stop(); } catch (e) { /* the clip is gone already */ }
  }
  for (const [o, h] of [...holds]) {
    if (o === owner || !cutsHold(p, h)) continue;
    holds.delete(o);
    note('cut-hold', h.cls, { by: cls });
    if (h.onPreempt) try { h.onPreempt(cls); } catch (e) { /* ignore */ }
  }
  const id = nextId++;
  const d = Number.isFinite(dur) && dur > 0 ? Math.min(dur, CLIP_MAX) : 2;
  cur = { id, cls, prio: p, start: now, until: now + d + TAIL, stop, owner };
  note('begin', cls);
  return id;
}

export function extend(id, dur) {
  if (!Number.isFinite(dur) || dur < 0) return;
  if (cur && cur.id === id) cur.until = cur.start + Math.min(dur, CLIP_MAX) + TAIL;
}

export function end(id) {
  if (!cur || cur.id !== id) return;
  note('end', cur.cls);
  cur = null;
  lastEnd = clock();
}

// opts.alive: optional probe; the hold is dropped once it keeps returning false.
export function hold(owner, cls, onPreempt = null, { alive = null } = {}) {
  const p = PRIO[cls] ?? PRIO.ambient;
  const h = strongestHold(owner);
  if (h && h.prio >= p && p !== PRIO.story) return false;
  for (const [o, other] of [...holds]) {
    if (o === owner || !cutsHold(p, other)) continue;
    holds.delete(o);
    note('cut-hold', other.cls, { by: cls });
    if (other.onPreempt) try { other.onPreempt(cls); } catch (e) { /* ignore */ }
  }
  const c = active(clock());
  if (c && c.owner !== owner && cutsClip(p, c)) {
    cur = null;
    note('cut', c.cls, { by: cls });
    if (c.stop) try { c.stop(); } catch (e) { /* ignore */ }
  }
  holds.set(owner, { cls, prio: p, onPreempt, alive, since: clock(), deadSince: null });
  note('hold', cls, { owner });
  return true;
}

export function release(owner) {
  if (!holds.delete(owner)) return;
  note('release', null, { owner });
  if (!cur) lastEnd = Math.max(lastEnd, clock());
}

export const holding = (owner) => holds.has(owner);

// Watchdog (audio.js runs it every few seconds): drops holds that outlived
// HOLD_MAX or whose owner is gone; onPreempt gets 'watchdog'. Returns the
// owners it freed.
export function sweep() {
  const now = clock();
  active(now);
  const freed = [];
  for (const [o, h] of [...holds]) {
    let dead = now - h.since > (HOLD_MAX[h.cls] ?? 300);
    if (!dead && h.alive) {
      let ok = false;
      try { ok = !!h.alive(); } catch (e) { ok = false; }
      if (ok) h.deadSince = null;
      else if (h.deadSince === null) h.deadSince = now;
      else dead = now - h.deadSince >= HOLD_GRACE;
    }
    if (!dead) continue;
    holds.delete(o);
    freed.push(o);
    note('stale-hold', h.cls, { owner: o });
    if (h.onPreempt) try { h.onPreempt('watchdog'); } catch (e) { /* ignore */ }
  }
  if (freed.length && !cur) lastEnd = Math.max(lastEnd, now);
  return freed;
}

// Plays now (play(token) is called), queues (maxWait > 0) or drops.
export function request(cls, dur, play, { maxWait = 0, key = null, owner = null } = {}) {
  const tok = begin(cls, dur, { owner });
  if (tok) { play(tok); return 'play'; }
  if (maxWait <= 0) { note('drop', cls); return 'drop'; }
  const now = clock();
  if (key) queue = queue.filter((q) => q.key !== key);
  queue.push({ cls, prio: PRIO[cls] ?? PRIO.ambient, dur, play, owner, key, expires: now + maxWait, at: now });
  queue.sort((a, b) => b.prio - a.prio || a.at - b.at);
  while (queue.length > MAX_QUEUE) note('drop', queue.pop().cls);
  note('queue', cls);
  return 'queued';
}

export function tick() {
  const now = clock();
  active(now);
  if (!queue.length) return;
  queue = queue.filter((q) => q.expires > now || (note('expire', q.cls), false));
  for (const q of queue) {
    const tok = begin(q.cls, q.dur, { owner: q.owner });
    if (!tok) continue;
    queue.splice(queue.indexOf(q), 1);
    q.play(tok);
    return;
  }
}

// A line is playing right now (holds aside).
export const clipPlaying = () => !!active(clock());

// Anyone talking or holding the channel.
export function talking() {
  return !!active(clock()) || holds.size > 0;
}

// The radio's own voice (jingles, DJ intros) waits for real silence.
export function radioMayTalk() {
  const now = clock();
  return !active(now) && holds.size === 0 && now - lastEnd >= RADIO_QUIET;
}

// 0..1: how far G-Music should duck. Bubbles and radio lines only a little.
export function musicDuck() {
  const c = active(clock());
  let p = c ? c.prio : -1;
  for (const h of holds.values()) p = Math.max(p, h.prio);
  if (p < 0) return 0;
  return p <= PRIO.ambient ? 0.4 : 1;
}

export function speechState() {
  const c = active(clock());
  return {
    talking: c ? c.cls : null,
    until: c ? +c.until.toFixed(2) : null,
    holds: [...holds].map(([o, h]) => `${o}:${h.cls}:${(clock() - h.since).toFixed(0)}s`),
    queue: queue.map((q) => q.cls),
    silentFor: c ? 0 : +(clock() - lastEnd).toFixed(2),
    history: history.slice(-12),
  };
}
