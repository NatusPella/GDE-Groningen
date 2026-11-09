// Carillon in de Martinitoren: the rules of the bell-playing minigame (pure, no
// DOM, no THREE, no audio; node-tested in scripts/carillon_test.mjs). Eight
// bells in a C major scale hang in a row; a tune scrolls towards you as notes
// and you strike the right bell (the keys A S D F J K L ;) when a note is on
// the line. Perfect, good or late counts, a miss breaks the combo. Only old
// folk tunes (public domain); the sounds are made by carillon.js with WebAudio.
import { medalFrom } from './minigamekit.js';

export const BELL_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
export const BELL_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C’'];
const SEMI = [0, 2, 4, 5, 7, 9, 11, 12];
// The tower of the city map (landmark Martinitoren) and the open square 12.5 m north of its
// centre, 3 m from the walls and 14 m from the nearest road (checked in carillon_test.mjs).
export const TOWER = { x: 213.81, y: 9.9 };
export const CARILLON_STAND = { x: TOWER.x, y: TOWER.y + 12.5 };

export const BASE_HZ = 523.25;

export const CARILLON = {
  lead: 2.2, perfect: 0.07, good: 0.15, late: 0.26,
  points: { perfect: 100, good: 60, late: 25 }, comboCap: 4, comboEvery: 8,
};
// accuracy share: bronze, silver, gold
export const MEDAL_AT = [0.5, 0.75, 0.92];
// #800: de stand schaalt de medailledrempels; Standaard geeft exact de oude waarden.
import { scaleTarget } from './difficulty.js';
export const scaledMedalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false) * 1000) / 1000);


// [bell 0..7, length in beats]
const seq = (s) => s.split(' ').map((p) => { const [b, l] = p.split(':'); return [Number(b), l ? Number(l) : 1]; });
export const TUNES = [
  { id: 'broeder', name: 'Broeder Jacob', bpm: 92, notes: seq('0 1 2 0 0 1 2 0 2 3 4:2 2 3 4:2 4:0.5 5:0.5 4:0.5 3:0.5 2 0 4:0.5 5:0.5 4:0.5 3:0.5 2 0 0 4 0:2 0 4 0:2') },
  { id: 'sterretje', name: 'Sterretje', bpm: 88, notes: seq('0 0 4 4 5 5 4:2 3 3 2 2 1 1 0:2 4 4 3 3 2 2 1:2 4 4 3 3 2 2 1:2 0 0 4 4 5 5 4:2 3 3 2 2 1 1 0:2') },
  { id: 'vreugde', name: 'Vreugdelied', bpm: 104, notes: seq('2 2 3 4 4 3 2 1 0 0 1 2 2:1.5 1:0.5 1:2 2 2 3 4 4 3 2 1 0 0 1 2 1:1.5 0:0.5 0:2') },
];

export const bellHz = (bell) => BASE_HZ * Math.pow(2, SEMI[bell] / 12);

export function tuneNotes(tune) {
  const spb = 60 / tune.bpm;
  let beat = 0;
  const out = [];
  for (const [bell, len] of tune.notes) { out.push({ bell, t: CARILLON.lead + beat * spb, state: 'wait', grade: null }); beat += len; }
  return out;
}

export function createCarillon(tuneId) {
  const tune = TUNES.find((t) => t.id === tuneId) || TUNES[0];
  const notes = tuneNotes(tune);
  return {
    tune, notes, t: 0, phase: 'run', score: 0, combo: 0, bestCombo: 0, perfect: 0, good: 0, late: 0, miss: 0, wrong: 0,
    end: notes[notes.length - 1].t + CARILLON.late + 1.2,
  };
}

const multOf = (combo) => Math.min(CARILLON.comboCap, 1 + Math.floor(combo / CARILLON.comboEvery));

// Strike a bell at the current time. Returns the event ({ type: 'hit', grade, ... } or 'stray').
export function strike(st, bell) {
  if (st.phase !== 'run') return null;
  let best = null;
  for (const n of st.notes) {
    if (n.state !== 'wait' || n.bell !== bell) continue;
    const d = Math.abs(st.t - n.t);
    if (d <= CARILLON.late && (!best || d < best.d)) best = { n, d };
  }
  if (!best) { st.wrong++; st.combo = 0; return { type: 'stray', bell }; }
  const grade = best.d <= CARILLON.perfect ? 'perfect' : best.d <= CARILLON.good ? 'good' : 'late';
  best.n.state = 'hit'; best.n.grade = grade;
  st[grade]++;
  st.combo++;
  st.bestCombo = Math.max(st.bestCombo, st.combo);
  const points = CARILLON.points[grade] * multOf(st.combo);
  st.score += points;
  return { type: 'hit', grade, bell, points, combo: st.combo };
}

// presses: bells struck this frame (0..7). Returns events.
export function stepCarillon(st, presses, dt) {
  const ev = [];
  if (st.phase !== 'run') return ev;
  st.t += Number.isFinite(dt) && dt > 0 ? dt : 0;
  for (const b of presses) { const e = strike(st, b); if (e) ev.push(e); }
  for (const n of st.notes) {
    if (n.state === 'wait' && st.t > n.t + CARILLON.late) { n.state = 'miss'; st.miss++; st.combo = 0; ev.push({ type: 'miss', bell: n.bell }); }
  }
  if (st.t >= st.end) { st.phase = 'done'; ev.push({ type: 'done' }); }
  return ev;
}

// Medals go by accuracy (the score also has a combo bonus), with a small
// penalty for stray bells.
export function accuracy(st) {
  return (st.perfect + st.good * 0.6 + st.late * 0.25) / st.notes.length;
}
export const carillonMedal = (st, mode = 'standaard') => medalFrom(accuracy(st) - st.wrong * 0.005, scaledMedalAt(mode));

// A bot that plays the tune with a given skill 0..1 (for the test).
export function botPresses(st, skill, rng) {
  const out = [];
  for (const n of st.notes) {
    if (n.state !== 'wait' || n.bot) continue;
    const jitter = (rng() - 0.5) * 2 * (1 - skill) * 0.3;
    if (st.t >= n.t + jitter) { n.bot = true; if (rng() < 0.35 + 0.65 * skill) out.push(n.bell); }
  }
  return out;
}
