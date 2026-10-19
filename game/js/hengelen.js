import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { pushAudioEvent } from './pedestrians.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, geo } from './minigamekit.js';
import { HENGEL_LINES } from './minigamelines3.js';
import { HENGEL, FISH, MEDAL_AT, createHengel, stepHengel, hengelMedal } from './hengelrules.js';

// Hengelen aan het Meerstad-meer: a fishing spot on the quay of the lake in
// Meerstad. [Spatie] casts; when the float dips ("Beet!") hit [Spatie] again
// inside the bite window; striking before the dip scares the fish. Ninety
// seconds, the heaviest catch wins. Free. Rules: hengelrules.js.
// `window.__hengelen` debug. The spot is approximate and not yet checked against
// the Meerstad tiles.
const ACCENT = '#4aa8d8';
const ORIGIN = geo(53.22924, 6.65732); // the first dry ground out from the lake polygon (spotcheck, #222)
const STAND = { x: ORIGIN.x, y: ORIGIN.y };

let game = null;
let board = null;

function say(w, kind, ttl = 0) {
  const list = HENGEL_LINES[kind];
  if (list) bubble(w, { x: STAND.x, y: STAND.y, name: HENGEL_LINES.who, text: pick(list), h: 2.3, tag: 'hengelen', ttl });
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'hengelen');
  if (quit) { w.addMessage('Hengelen gestopt', 2.5); return; }
  const s = g.s;
  const medal = hengelMedal(s.kg);
  const rec = recordChallengeResult(w, 'hengelen', { value: s.kg, medal });
  recordStat(w, 'hengelSessions');
  setStatMax(w, 'hengelBest', s.kg);
  unlockAchievement(w, 'hengel_klaar');
  if (s.catches.includes('karper')) unlockAchievement(w, 'hengel_karper');
  const kg = (v) => v.toFixed(1).replace('.', ',') + ' kg';
  const stats = [['Gewicht', kg(s.kg)], ['Gevangen', String(s.catches.length)], ['Ontsnapt', String(s.lost)], ['Te vroeg', String(s.scared)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KONING VAN HET MEER' : medal ? 'MOOIE VANGST' : 'NIKS AAN DE HAAK', reason: medal ? `${kg(s.kg)} aan de wal gebracht` : 'Wacht tot het dobbertje zakt en sla dan toe', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

function updateGame(w, dt) {
  const g = game, input = w.input, p = w.player;
  p.vx = p.vy = 0; p.speed = 0; p.moving = false;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  let cast = false;
  if (input.wasPressed(' ')) { input.consume(' '); cast = true; }
  for (const e of stepHengel(g.s, { cast }, dt)) {
    if (e.type === 'cast') pushAudioEvent(w, { kind: 'splash', x: STAND.x, y: STAND.y });
    else if (e.type === 'early') { g.flash = { text: 'Te vroeg! De vis schrikt', bad: true, t: 0 }; say(w, 'early'); }
    else if (e.type === 'bite') { g.flash = { text: 'BEET! Nu Spatie!', bad: false, t: 0 }; }
    else if (e.type === 'catch') { const f = FISH.find((x) => x.id === e.fish); g.flash = { text: `${f.name} van ${e.kg.toFixed(1).replace('.', ',')} kg!`, bad: false, t: 0 }; }
    else if (e.type === 'lost') { g.flash = { text: 'Ontsnapt', bad: true, t: 0 }; say(w, 'lost'); }
    else if (e.type === 'done') { end(w); return; }
  }
  if (g.flash && g.flash.text !== 'BEET! Nu Spatie!' && (g.flash.t += dt) > 1.8) g.flash = null;
  if (g.s.phase === 'done') { end(w); return; }
  if (g.s.phase !== 'bite' && g.flash && g.flash.text === 'BEET! Nu Spatie!') g.flash = null;
}

const PHASE_TEXT = { idle: 'Gooi uit met Spatie', cast: 'De lijn zoeft uit...', wait: 'Wacht op het dobbertje...', bite: 'BEET!', scare: 'De vissen zijn gevlucht...' };

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const s = g.s;
  const kg = s.kg.toFixed(1).replace('.', ',');
  const cells = ['idle', 'cast', 'wait', 'bite'].map((ph, i) => ({ t: ['Uitgooien', 'Lijn', 'Wachten', 'Beet'][i], cls: s.phase === ph ? (ph === 'bite' ? 'on good' : 'on') : '' }));
  const row = `<span>Gewicht <b>${kg} kg</b></span><span>Tijd <b>${Math.max(0, Math.ceil(s.left))}</b></span><span>Gevangen <b>${s.catches.length}</b></span><span>Ontsnapt <b>${s.lost}</b></span>`;
  board.set({ row, cells, flash: g.flash ? g.flash.text : PHASE_TEXT[s.phase], bad: !!(g.flash && g.flash.bad), help: `${key('SPATIE')} uitgooien en binnenhalen · ${key('BACKSPACE')} stoppen` });
}

function glyph(ctx) {
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(2.5, -3); ctx.lineTo(2.5, 1); ctx.stroke();
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(2.5, 1.8, 0.8, 0, Math.PI * 2); ctx.fill();
}

function start(w) {
  if (game) return false;
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!board) board = createBoard('HENGELEN MEERSTAD', ACCENT);
  board.show();
  game = { s: createHengel(Math.random), flash: null };
  showCard(w, { kind: 'tip', kicker: 'Hengelen', title: 'Geduld aan het meer', body: '[Spatie] gooit uit. Zakt het dobbertje (Beet!), druk dan meteen weer [Spatie]. Te vroeg trekken schrikt de vis af; grote vissen zijn maar kort aan de haak.', duration: 11, key: 'hengel-help', voice: false });
  say(w, 'start');
  return true;
}

function recText() {
  return recLine(getChallengeRecord('hengelen'), (v) => `${v.toFixed(1).replace('.', ',')} kg`, MEDALS);
}

export const HENGELEN = standActivity({
  id: 'hengelen',
  name: 'Hengelen Meerstad',
  label: 'Hengelen',
  note: 'hengelplek aan het meer in Meerstad: de zwaarste vangst in negentig seconden',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3,
  labelRadius: 160,
  sub: 'Vis aan het meer in Meerstad · gratis',
  hint: 'Loop naar de steiger en druk E',
  ubboSub: 'hengelen aan het meer in Meerstad, gratis',
  where: 'het meer in Meerstad',
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
    state: () => (game ? { phase: game.s.phase, kg: game.s.kg, left: game.s.left } : null),
    finish: () => { if (!game) return false; game.s.phase = 'done'; game.s.kg = 8; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
