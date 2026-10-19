import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed } from './minigamekit.js';
import { CARILLON_LINES } from './minigamelines3.js';
import { pushAudioEvent } from './pedgeom.js';
import { TOWER, CARILLON_STAND, BELL_KEYS, BELL_NAMES, TUNES, CARILLON, MEDAL_AT, createCarillon, stepCarillon, bellHz, carillonMedal, accuracy } from './carillonrules.js';

// Carillon in de Martinitoren: at the foot of the tower on the Grote Markt the
// carillonneur lets you play the bells. Pick a tune with Q/E, press Spatie, then
// strike the bell that lights up (A S D F J K L ;) on the beat. Only old folk
// tunes; the bell sound is the tower's sample from the sfx layer. Free.
// Rules: carillonrules.js. `window.__carillon` debug.
// the pitch of the 'bell_carillon' sample (sfx/dsp.js)
const BELL_REF_HZ = 523.25;
const ACCENT = '#d9b44a';
const ORIGIN = TOWER;
const STAND = CARILLON_STAND;

let game = null;
let board = null;

// A bell: the tower's own bell sample (sfx layer) at the pitch of this bell.
export function playBell(w, bell, vel = 1) {
  pushAudioEvent(w, { kind: 'bell_note', x: w.player.x, y: w.player.y, rate: bellHz(bell) / BELL_REF_HZ, gain: vel });
}

function say(w, kind, ttl = 0) {
  const list = CARILLON_LINES[kind];
  if (!list) return;
  bubble(w, { x: STAND.x, y: STAND.y, name: CARILLON_LINES.who, text: pick(list), h: 2.3, tag: 'carillon', ttl });
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'carillon');
  if (quit) { w.addMessage('Klokkenspel gestopt', 2.5); return; }
  const s = g.s;
  const medal = carillonMedal(s);
  const rid = 'carillon-' + s.tune.id;
  const rec = recordChallengeResult(w, rid, { value: s.score, medal });
  recordStat(w, 'carillonTunes');
  setStatMax(w, 'carillonBest', s.score);
  unlockAchievement(w, 'carillon_klaar');
  if (medal >= 3) unlockAchievement(w, 'carillon_goud');
  const pct = Math.round(accuracy(s) * 100);
  const stats = [['Deuntje', s.tune.name], ['Score', s.score.toLocaleString('nl-NL')], ['Nauwkeurig', `${pct}%`], ['Langste reeks', String(s.bestCombo)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'STADSBEIERAARD' : medal ? 'MOOI GESPEELD' : 'NOG EEN KEER', reason: medal ? `${s.tune.name} over de Grote Markt` : 'Let op de lichtgevende klok en sla op de tel', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

function updateGame(w, dt) {
  const g = game, input = w.input;
  const p = w.player;
  p.vx = p.vy = 0; p.speed = 0; p.moving = false;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  if (g.phase === 'pick') {
    if (input.wasPressed('q') || input.wasPressed('arrowleft')) { input.consume('q'); input.consume('arrowleft'); g.pick = (g.pick + TUNES.length - 1) % TUNES.length; }
    if (input.wasPressed('e') || input.wasPressed('arrowright')) { input.consume('e'); input.consume('arrowright'); g.pick = (g.pick + 1) % TUNES.length; }
    if (input.wasPressed(' ') || input.wasPressed('enter')) { input.consume(' '); input.consume('enter'); g.phase = 'play'; g.s = createCarillon(TUNES[g.pick].id); say(w, 'start'); }
    return;
  }
  const presses = [];
  BELL_KEYS.forEach((k, i) => { if (input.wasPressed(k)) { input.consume(k); presses.push(i); } });
  for (const b of presses) playBell(w, b);
  const ev = stepCarillon(g.s, presses, dt);
  for (const e of ev) {
    if (e.type === 'hit') g.flash = { text: e.grade === 'perfect' ? `Precies! +${e.points}` : e.grade === 'good' ? `Goed +${e.points}` : `Laat +${e.points}`, bad: false };
    else if (e.type === 'miss') g.flash = { text: 'Gemist', bad: true };
    else if (e.type === 'stray') g.flash = { text: 'Verkeerde klok', bad: true };
  }
  if (g.s.phase === 'done') end(w);
}

function updateHud() {
  const g = game;
  if (!g || !board) return;
  if (g.phase === 'pick') {
    const t = TUNES[g.pick];
    const r = getChallengeRecord('carillon-' + t.id);
    board.set({ row: `<span>Deuntje <b>${t.name}</b></span><span>${r && r.best != null ? 'Record ' + Math.round(r.best) : 'Nog geen record'}</span>`, flash: '', help: `${key('Q')}${key('E')} kiezen · ${key('SPATIE')} spelen · ${key('BACKSPACE')} stoppen` });
    return;
  }
  const s = g.s;
  // the next unresolved note decides which bell lights up
  const next = s.notes.find((n) => n.state === 'wait');
  const cells = BELL_NAMES.map((nm, i) => {
    const lit = next && next.bell === i && next.t - s.t < 0.9;
    const cls = lit ? (Math.abs(next.t - s.t) <= CARILLON.good ? 'on good' : 'on') : '';
    return { t: `${nm}<br>${BELL_KEYS[i].toUpperCase()}`, cls, key: BELL_KEYS[i] };
  });
  const row = `<span>Score <b>${s.score}</b></span><span>Reeks <b>${s.combo}</b></span><span>Gemist <b>${s.miss}</b></span>`;
  const left = next ? Math.max(0, next.t - s.t) : 0;
  board.set({ row, cells, meter: { v: next ? 1 - Math.min(1, left / 2) : 1, mark: null, color: ACCENT }, flash: g.flash ? g.flash.text : s.t < 1.8 ? 'Luister naar de toren...' : '', bad: !!(g.flash && g.flash.bad), help: `${key('A')}${key('S')}${key('D')}${key('F')}${key('J')}${key('K')}${key('L')}${key(';')} klokken · ${key('BACKSPACE')} stoppen` });
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.moveTo(-2.6, 2.4); ctx.quadraticCurveTo(-2.6, -2.4, 0, -2.6); ctx.quadraticCurveTo(2.6, -2.4, 2.6, 2.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 3.2, 0.7, 0, Math.PI * 2); ctx.fill();
}

function start(w) {
  if (game) return false;
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!board) board = createBoard('CARILLON MARTINITOREN', ACCENT);
  board.show();
  game = { phase: 'pick', pick: 0, s: null, flash: null };
  showCard(w, { kind: 'tip', kicker: 'Carillon', title: 'Klokken in de Martinitoren', body: 'Kies een deuntje met [Q] en [E] en druk [Spatie]. Sla de lichtgevende klok aan op de tel: [A] [S] [D] [F] [J] [K] [L] [;].', duration: 11, key: 'carillon-help', voice: false });
  say(w, 'welcome');
  return true;
}

function recText() {
  const rs = TUNES.map((t) => recLine(getChallengeRecord('carillon-' + t.id), (v) => `${Math.round(v)} punten`, MEDALS)).filter(Boolean);
  return rs.length ? rs[0] : null;
}

export const CARILLON_GAME = standActivity({
  id: 'carillon',
  name: 'Carillon Martinitoren',
  label: 'Klokkenspel',
  note: 'klokkenspel bij de Martinitoren: speel een oud deuntje op de klokken',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3,
  labelRadius: 140,
  sub: 'Speel de klokken van de Martinitoren · gratis',
  hint: 'Loop naar de torenvoet en druk E',
  ubboSub: 'klokken spelen in de Martinitoren, gratis',
  where: 'de Martinitoren',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick: () => updateHud(),
  camera: () => {},
  debug: (w) => ({
    spot: () => ({ ...STAND }),
    start: () => start(w),
    state: () => (game ? { phase: game.phase, score: game.s ? game.s.score : 0 } : null),
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
