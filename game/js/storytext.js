// The new story's text (game/storydata/script.json, built from docs/verhaal/nieuw/09-script-akte*.md
// by scripts/build_story_data.mjs) as the game plays it.
//
// A line is `textOnly` when no recording exists for its exact text: it is shown (subtitle, talk
// line, phone card, radio card) with the speaker's name and colour for a readable time and
// nothing is played, so the flow never waits for audio. A line with a recording plays it, found
// under its manifest (`rec`: story, lines or banter) by "<voice name>|<text>".
//
// What this module hands out:
//   storyLines(ids, opts)      cutscene lines [who, text, opts] for missionstory.js (intro, outro, stage scenes)
//   talkLines(id)              lines for storytalk.js, the subtitle talk that runs during a mission
//   radioContacts(step, at)    Radio Nachtstreek fragments for storycontact.js (anchor at 'start' or 'after' a step)
//   appSchedule()/appsAt(step, at)   the silent app texts and the step they arrive on
//   banterExchanges()          banter.js exchanges (the autogesprekken)
//   readingTime(text)          how long a line is up when nothing is played
// Pure apart from the fetch of the data; Node tests call setStoryData().

import { openBank } from './voicebank.js';

const BASE = typeof document !== 'undefined' || typeof location !== 'undefined' ? new URL('../', import.meta.url).href : '';
const DIRS = { story: openBank('story').dir, lines: openBank('lines').dir, banter: openBank('banter').dir };

let data = null;
let byId = new Map();
const manifests = { story: {}, lines: {}, banter: {} };

export function setStoryData(d, m = null) {
  data = d;
  byId = new Map(d.scenes.map((s) => [s.id, s]));
  if (m) Object.assign(manifests, m);
}

export const storyDataReady = () => !!data;

if (typeof fetch === 'function' && BASE) {
  fetch(BASE + 'storydata/script.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setStoryData(d); }).catch(() => {});
  for (const k of Object.keys(DIRS)) manifests[k] = openBank(k).entries;
}

export const scene = (id) => byId.get(id) || null;

if (typeof window !== 'undefined') {
  window.__storytext = {
    ready: () => !!data,
    counts: () => (data ? { scenes: data.scenes.length, lines: data.scenes.reduce((a, s) => a + s.lines.length, 0) } : null),
    talk: (id) => talkLines(id),
  };
}

// How long a line stays up when nothing is spoken: reading time, a bit slower than the recorded pace.
export function readingTime(text) {
  return Math.max(2.2, Math.min(8, 1.3 + String(text || '').length * 0.058));
}

// { src, dur } of the recording of a line (src absolute), or null for a text-only line.
function lineVoice(l) {
  if (!l || l.textOnly || !l.rec) return null;
  const v = manifests[l.rec] && manifests[l.rec][(l.voice || l.speaker) + '|' + l.text];
  return v ? { src: DIRS[l.rec] + v.src, dur: v.dur } : null;
}


// The banter manifest's recording of "<speaker>|<text>" with its src relative to the story voice folder
// (audio/voicelines/story/), for a cutscene that only knows story and lines.
export function storyDirRecording(speaker, text) {
  const v = manifests.banter[speaker + '|' + text];
  return v ? { src: '../banter/' + v.src, dur: v.dur } : null;
}

const NAMECARD = { 'duivenmelker bert': 'bert', 'durk & douwe': 'durk', 'jelle terpstra': 'jelle', 'mevrouw hoving': 'bewaarder', sjabbe: 'sjabbe', tessa: 'anita', tammo: 'tammo', berend: 'berend', rikus: 'rikus' };

// The CHARACTERS key whose name card the scene's regie announces for this speaker ("Naamkaart: SJABBE."), or null.
function cardKeys(sc) {
  const out = {};
  for (const r of sc.regie || []) {
    const m = /Naamkaart(?: voor)?:? ([A-ZÄËÏÖÜ&.,' ]+?)(?:\.|\)|,? in beeld|$)/.exec(r);
    if (!m) continue;
    const key = NAMECARD[m[1].trim().toLowerCase()];
    if (key) out[key === 'anita' ? 'A' : key === 'tammo' ? 'T' : key] = key;
    if (m[1].trim().toLowerCase() === 'durk & douwe') out.douwe = null;
  }
  return out;
}

// The speaker keys of the script (script.json `key`) become the keys of missionstory.js: T and A stay,
// Rikus on the radio is the narrator V, the mission's own NPC is N.
const whoOf = (l, npc) => (l.key === 'rikus' && l.channel === 'radio' ? 'V' : l.key === npc ? 'N' : l.key);

// Lines of one or more scenes (ids), optionally a slice [from, to) of the joined lines, as
// [who, text, opts] for missionstory.js timeline(): opts { tag, radio, phone, card, clue, textOnly }.
export function storyLines(ids, { npc = null, from = 0, to = Infinity, channels = null } = {}) {
  const out = [];
  for (const id of [].concat(ids)) {
    const sc = scene(id);
    if (!sc) continue;
    const cards = cardKeys(sc);
    const carded = new Set();
    for (const l of sc.lines) {
      if (l.channel === 'app-stil') continue;
      if (channels && !channels.includes(l.channel)) continue;
      const who = whoOf(l, npc);
      const o = { tag: l.tag };
      if (l.channel === 'radio') o.radio = true;
      if (l.channel === 'telefoon') o.phone = true;
      if (l.textOnly) o.textOnly = true;
      if (cards[l.key] && !carded.has(l.key)) { carded.add(l.key); o.card = cards[l.key]; }
      if (l.text === '"Tige tank! – J."') o.clue = true;
      out.push([who, l.text, o]);
    }
  }
  return out.slice(from, to);
}

// All lines of scenes as plain objects (speaker id for the colour, the recording or null).
export function talkLines(ids, { from = 0, to = Infinity } = {}) {
  const out = [];
  for (const id of [].concat(ids)) {
    const sc = scene(id);
    if (!sc) continue;
    for (const l of sc.lines) {
      if (l.channel === 'app-stil') continue;
      out.push({ speaker: l.voice || l.speaker, text: l.text, voice: lineVoice(l), channel: l.channel, textOnly: !!l.textOnly });
    }
  }
  return out.slice(from, to);
}

// Radio Nachtstreek fragments hung on a step: [{ lines: [[key, text, { tag }]], caller }] for storycontact.js
export function radioContacts(step, at) {
  if (!data) return [];
  return data.scenes.filter((s) => s.kind === 'radio' && s.anchor && s.anchor.step === step && s.anchor.at === at).map((s) => ({
    id: s.id,
    lines: s.lines.filter((l) => l.channel !== 'app-stil').map((l) => [l.key, l.text, { tag: l.tag }]),
  }));
}

// The silent app texts reach the player on the step they are about. Two sources:
//  - app-stil lines inside a mission scene (Mem's texts in M07.3, M10.4, M11.6, M16.6, M18.4, M21.2, Tammo's in T1):
//    on the scene's own step, after it (EMBEDDED_AT: 'start' where the text opens the step);
//  - the app scenes (A1.1-A5.2, anchored after a step): normally all after that step, but spread over the steps
//    they are about with APP_SCHEDULE: scene id -> per line [step, 'start' | 'after'].
// An app line whose text is already delivered from a mission scene is dropped, so nothing arrives twice.
const EMBEDDED_AT = { 'M21.2': 'start' };
const APP_SCHEDULE = {
  'A1.1': [['M02', 'after'], ['M03', 'after'], ['M05', 'start'], ['M06', 'start'], ['M03', 'start']],
  'A2.1': [['M07', 'after'], ['M10', 'after'], ['M10', 'after'], ['M11', 'after'], ['M11', 'after'], ['M08', 'start']],
  'A3.1': [['M15', 'after'], ['M15', 'after'], ['M16', 'after'], ['M16', 'after'], ['M16', 'after']],
  'A4.1': [['M19', 'after'], ['M19', 'after'], ['M19', 'after'], ['M19', 'after']],
};
const NAMES = { TESSA: 'Tessa', TAMMO: 'Tammo', MEM: 'Mem', RIKUS: 'Rikus', JELLE: 'Jelle', SJOERD: 'Sjoerd', SJABBE: 'Sjabbe', HENK: 'Henk', BEREND: 'Berend' };

// Every silent app text of the script with the step and moment it is due: [{ step, at, from, text }]
export function appSchedule() {
  if (!data) return [];
  const out = [];
  const embedded = new Set();
  for (const s of data.scenes) {
    if (s.kind === 'app') continue;
    for (const l of s.lines) if (l.channel === 'app-stil' && s.step) { embedded.add(l.text); out.push({ step: s.step, at: EMBEDDED_AT[s.id] || 'after', from: NAMES[l.from] || l.from, text: l.text }); }
  }
  for (const s of data.scenes) {
    if (s.kind !== 'app') continue;
    s.lines.filter((l) => l.channel === 'app-stil').forEach((l, k) => {
      if (embedded.has(l.text)) return;
      const sched = APP_SCHEDULE[s.id];
      const [st, when] = sched ? sched[k] || [] : [s.anchor && s.anchor.step, s.anchor && s.anchor.at];
      if (st && when) out.push({ step: st, at: when, from: NAMES[l.from] || l.from, text: l.text });
    });
  }
  return out;
}

// The silent app texts due at `step` ('start' or 'after'): [{ from: 'Tessa', text }]. Never read aloud.
export function appsAt(step, at) {
  return appSchedule().filter((a) => a.step === step && a.at === at).map((a) => ({ from: a.from, text: a.text }));
}

// --- banter -----------------------------------------------------------------------------------------

// where a banter pool is heard: after the first mission of the act it follows, until the next act starts
const POOL_GATE = { B1: { until: 'M07' }, B2: { needs: 'M07', until: 'M12' }, B3: { needs: 'M12', until: 'M17' }, B4: { needs: 'M17', until: 'M22' }, B5: { needs: 'M22', until: 'M26' } };
// the exchanges of a pool (the script lists them one after the other)
const POOL_SPLIT = { B1: [2, 3, 5, 4] };

function chunk(lines, sizes) {
  if (sizes) {
    const out = [];
    let i = 0;
    for (const n of sizes) { out.push(lines.slice(i, i + n)); i += n; }
    if (i < lines.length) out.push(lines.slice(i));
    return out;
  }
  // no split given: a new exchange starts where Tammo speaks after Tessa and the one before has two lines at least
  const out = [];
  let cur = [];
  for (const l of lines) {
    if (cur.length >= 2 && l[0] === 'T' && cur[cur.length - 1][0] === 'A') { out.push(cur); cur = []; }
    cur.push(l);
  }
  if (cur.length) out.push(cur);
  return out;
}

// banter.js exchanges for the new arc: the autogesprekken of the script. The pools [B1]-[B5] are
// idle chit-chat in the car (gated per act); an "Autogesprek" scene of a mission is heard in the
// first shared ride after that mission. Lines [speaker 'T' | 'A', text, tag].
export function banterExchanges() {
  if (!data) return [];
  const out = [];
  for (const s of data.scenes) {
    if (s.kind !== 'banter') continue;
    const lines = s.lines.filter((l) => l.key === 'T' || l.key === 'A').map((l) => [l.key, l.text, l.tag]);
    if (!lines.length) continue;
    if (s.pool) {
      chunk(lines, POOL_SPLIT[s.pool]).forEach((ex, i) => out.push({ id: `n-${s.pool}-${i}`, trigger: 'idle', ...(POOL_GATE[s.pool] || {}), lines: ex }));
    } else {
      out.push({ id: `n-${s.id}`, trigger: `after:${s.step}:pass`, lines });
    }
  }
  return out;
}
