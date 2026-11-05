import { hoofdspeler } from './players.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { DUO } from './ommelandlines.js';

// Voiced speech bubbles for the Ommeland extras: a bubble with the
// speaker's name over a figure (world.extraSpeakers, scene3d.js) and the
// recording from the lines manifest on the speech.js 'react' class. DUO
// lines are said by the companion (the one you don't play), or by the
// player when the companion is not around. A line the voice channel can't
// take yet is retried for a few seconds.

const pending = [];

const nameOf = (c) => (c === 'anita' ? 'Anita' : 'Tammo');

export function duoSpeaker(w) {
  const c = w.companion, p = hoofdspeler(w);
  if (c && c.state !== 'dead' && Math.hypot(c.x - p.x, c.y - p.y) < 25) return { name: nameOf(c.character), follow: c.inVehicle || c };
  return { name: nameOf(p.character), follow: p.inVehicle || p };
}

// who: a speaker name or DUO; at: { x, y } of the figure (or an object that
// moves); h: bubble height. Returns the seconds the line takes.
export function speak(w, who, text, at = null, { h = 2.2, name = true } = {}) {
  let speaker = who, follow = at;
  if (who === DUO) {
    const d = duoSpeaker(w);
    speaker = d.name;
    follow = d.follow;
  }
  const v = lineVoiceFor(speaker, text);
  const dur = Math.max(2.6, Math.min(7, 1 + text.length * 0.06), v ? v.dur + 0.4 : 0);
  if (follow) {
    const list = w.extraSpeakers || (w.extraSpeakers = []);
    const sp = { x: follow.x, y: follow.y, h, follow, speechText: text, speechUntil: w.time + dur, ...(name ? { speechName: speaker } : {}) };
    list.push(sp);
  }
  if (v && !playLineVoice(v.src, v.dur, 'react')) pending.push({ src: v.src, dur: v.dur, until: w.time + 3 });
  return dur;
}

export function updateTalk(w) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const q = pending[i];
    if (w.time > q.until || playLineVoice(q.src, q.dur, 'react')) pending.splice(i, 1);
  }
}

