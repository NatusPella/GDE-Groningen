// Talk that runs during a mission or a quiet moment of the new story (the telephone briefings and
// the remarks between the pair while they work): a subtitle line with the speaker's name and colour,
// one after the other, never blocking anything. A line with a recording plays it (on the telephone
// channel); a text-only line stays up for its reading time (storytext.js readingTime) and nothing
// is played, so the flow never waits for audio. The talk waits while a cutscene, a phone call or
// the pause menu is up, and a new talk queues behind the one that is running.
//   playTalk(lines, { id, delay, onDone })   lines: storytext.js talkLines()
//   stopTalk()                               drop everything (mission over)
//   updateStoryTalk(dt, world)               story.js calls it every frame
import { createSubtitle } from './subtitleui.js';
import { playCallVoice } from './audio.js';
import { isCinematicActive } from './cinematics.js';
import { isCallActive } from './phonefeed.js';
import { noteSpoken } from './characters.js';
import { readingTime, talkLines } from './storytext.js';
import { getSettings } from './settings.js';
import { lineSchedule } from './dialogueform.js';

const LINE_GAP = 0.25;
const TAIL = 0.35;

let queue = [];
let cur = null;
let subEl = null;
let shown = null;

function element() {
  if (subEl) return subEl;
  subEl = createSubtitle({ id: 'story-talk', speaker: 'st-speaker', line: 'st-line' }); // het gedeelde ondertitelcomponent (subtitleui.js)
  return subEl;
}

function show(line) {
  if (typeof document === 'undefined') return;
  const sub = element();
  if (line && line !== shown) sub.set(line.speaker, line.text);
  shown = line;
  sub.visible(!!line);
}

export function playTalk(lines, { id = '', delay = 0, onDone = null } = {}) {
  if (!lines || !lines.length) { if (onDone) onDone(); return false; }
  queue.push({ id, lines: lines.map((l) => ({ ...l })), i: -1, t: 0, until: delay, onDone, delay });
  return true;
}

export const talkActive = () => !!cur || queue.length > 0;

// debug and the story test: window.__storytalk
if (typeof window !== 'undefined') {
  window.__storytalk = {
    state: () => talkState(),
    // plays a scene of the script as a talk
    play: (id) => playTalk(talkLines(id), { id }),
    stop: () => stopTalk(),
  };
}
export const talkState = () => ({ cur: cur ? { id: cur.id, i: cur.i, line: cur.lines[cur.i] && cur.lines[cur.i].text } : null, queued: queue.map((q) => q.id) });

export function stopTalk() {
  queue = [];
  cur = null;
  show(null);
}

function nextLine(world) {
  cur.i++;
  if (cur.i >= cur.lines.length) {
    const done = cur.onDone;
    cur = null;
    show(null);
    if (done) done();
    return;
  }
  const l = cur.lines[cur.i];
  cur.t = 0;
  const v = l.voice && !l.textOnly && l.channel !== 'radio' ? l.voice : null;
  // a recording that cannot play (muted, the channel is taken) leaves the line as text
  const played = !!(v && playCallVoice(v.src));
  // dialoogvorm (#1134): een regel met {ov}, {cut} of {pause} krijgt zijn eigen timing; zonder vorm blijft alles zoals het was
  const base = played ? Math.max(v.dur + TAIL, 1.4) : readingTime(l.text, getSettings().readingTime); // Leestijd ruim (Instellingen) rekt ook de autopraat op
  // een afkap (cut) werkt alleen op een regel zonder opname: een stem die al klinkt, wordt niet midden in een woord gestopt
  const form = l.form && played && l.form.cut !== undefined ? { ...l.form, cut: undefined } : l.form;
  const sch = form ? lineSchedule({ ...l, form }, base, LINE_GAP) : null;
  cur.until = sch ? sch.untilNextS : base + LINE_GAP;
  noteSpoken(world, l.speaker);
  cur.shownLine = sch && sch.text !== l.text ? { ...l, text: sch.text } : l;
  show(cur.shownLine);
}

export function updateStoryTalk(dt, world) {
  if (typeof document === 'undefined') return;
  if (!cur && !queue.length) { if (shown) show(null); return; }
  // wait while something else has the screen or the phone
  const blocked = isCinematicActive() || isCallActive() || !!world.storyContact;
  if (blocked || world.paused || dt <= 0) { if (shown) show(null); return; }
  if (!cur) {
    cur = queue.shift();
    cur.t = 0;
    cur.until = cur.delay || 0;
    return;
  }
  const line = cur.shownLine || cur.lines[cur.i];
  if (cur.i >= 0 && shown !== line) show(line);
  cur.t += dt;
  if (cur.t >= cur.until) nextLine(world);
}
