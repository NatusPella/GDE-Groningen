// Talk that runs during a mission or a quiet moment of the new story (the telephone briefings and
// the remarks between the pair while they work): a subtitle line with the speaker's name and colour,
// one after the other, never blocking anything. A line with a recording plays it (on the telephone
// channel); a text-only line stays up for its reading time (storytext.js readingTime) and nothing
// is played, so the flow never waits for audio. The talk waits while a cutscene, a phone call or
// the pause menu is up, and a new talk queues behind the one that is running.
//   playTalk(lines, { id, delay, onDone })   lines: storytext.js talkLines()
//   stopTalk()                               drop everything (mission over)
//   updateStoryTalk(dt, world)               story.js calls it every frame
import { paintSpeaker } from './speakers.js';
import { setDualText } from './subtitles.js';
import { playCallVoice } from './audio.js';
import { isCinematicActive } from './cinematics.js';
import { isCallActive } from './phonefeed.js';
import { noteSpoken } from './characters.js';
import { readingTime } from './storytext.js';

const LINE_GAP = 0.25;
const TAIL = 0.35;

let queue = [];
let cur = null;
let subEl = null;
let shown = null;

function element() {
  if (subEl) return subEl;
  subEl = document.createElement('div');
  subEl.id = 'story-talk';
  subEl.setAttribute('aria-live', 'polite');
  Object.assign(subEl.style, {
    position: 'fixed', left: '50%', bottom: '27vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)',
    textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff',
    letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none',
    opacity: '0', transition: 'opacity 0.25s', zIndex: '40',
  });
  subEl.innerHTML = '<span class="st-speaker" style="font-weight:bold;margin-right:6px"></span><span class="st-line"></span>';
  document.body.appendChild(subEl);
  return subEl;
}

function show(line) {
  if (typeof document === 'undefined') return;
  const el = element();
  if (line && line !== shown) {
    paintSpeaker(el.querySelector('.st-speaker'), line.speaker);
    setDualText(el.querySelector('.st-line'), line.text);
  }
  shown = line;
  el.style.opacity = line ? '1' : '0';
}

export function playTalk(lines, { id = '', delay = 0, onDone = null } = {}) {
  if (!lines || !lines.length) { if (onDone) onDone(); return false; }
  queue.push({ id, lines: lines.map((l) => ({ ...l })), i: -1, t: 0, until: delay, onDone, delay });
  return true;
}

export const talkActive = () => !!cur || queue.length > 0;
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
  cur.until = (played ? Math.max(v.dur + TAIL, 1.4) : readingTime(l.text)) + LINE_GAP;
  noteSpoken(world, l.speaker);
  show(l);
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
  if (cur.i >= 0 && shown !== cur.lines[cur.i]) show(cur.lines[cur.i]);
  cur.t += dt;
  if (cur.t >= cur.until) nextLine(world);
}
