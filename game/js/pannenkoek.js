import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, geo } from './minigamekit.js';
import { getPancakeBoatSpot } from './cityprops.js';
import { PANNENKOEK_LINES } from './minigamelines3.js';
import { PAN, TOPPINGS, MEDAL_AT, createPan, usePan, serve, stepPan, goldenNow, pannenkoekMedal } from './pannenkoekrules.js';

// Pannenkoekenschip De Gouden Pan (the moored boat of the city props, #23):
// you are the cook for two minutes. [1] [2] [3] pour batter, flip and plate
// (flip inside the golden window); [Q] [W] [E] [R] serve the plate to the guest
// who wants stroop, spek, appel or kaas. Not golden is worth half. Free.
// Rules: pannenkoekrules.js. `window.__pannenkoek` debug.
const ACCENT = mgThema('pannenkoek').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
// the quay opposite the moored boat of the city props (#23); until the props are
// placed, or when no quay was found, the Oosterhaven quay
const FALLBACK = geo(53.2188, 6.582);
const place = () => { const b = getPancakeBoatSpot(); return b ? b.quay : FALLBACK; };
const PAN_KEYS = ['1', '2', '3'];
const TOP_KEYS = ['q', 'w', 'e', 'r'];

let game = null;
let board = null;

function say(w, kind, ttl = 0) {
  const list = PANNENKOEK_LINES[kind];
  if (list) bubble(w, { x: place().x, y: place().y, name: PANNENKOEK_LINES.who, text: pick(list), h: 2.3, tag: 'pannenkoek', ttl });
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'pannenkoek');
  if (quit) { w.addMessage('Pannenkoeken bakken gestopt', 2.5); return; }
  const s = g.s;
  const medal = pannenkoekMedal(s.points);
  const rec = recordChallengeResult(w, 'pannenkoek', { value: s.points, medal });
  recordStat(w, 'pannenkoekShifts');
  setStatMax(w, 'pannenkoekBest', s.points);
  unlockAchievement(w, 'pannenkoek_klaar');
  if (medal >= 3) unlockAchievement(w, 'pannenkoek_goud');
  const stats = [['Punten', String(s.points)], ['Geserveerd', String(s.served)], ['Goudbruin', String(s.golden)], ['Verbrand', String(s.burnt)], ['Gasten weg', String(s.left_)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KOK VAN HET SCHIP' : medal ? 'SMAKELIJK' : 'AANGEBRAND', reason: medal ? `${s.served} gasten blij gemaakt` : 'Draai de pannenkoek in het gouden venster en let op de toppings', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

function updateGame(w, dt) {
  const g = game, input = w.input, p = w.player;
  p.vx = p.vy = 0; p.speed = 0; p.moving = false;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const s = g.s;
  PAN_KEYS.forEach((k, i) => {
    if (!input.wasPressed(k)) return;
    input.consume(k);
    const r = usePan(s, i);
    if (r.type === 'plate') g.flash = { text: r.golden ? 'Goudbruin! +15' : 'Niet goudbruin: halve waarde', bad: !r.golden, t: 0 };
    else if (r.type === 'raw') g.flash = { text: 'Te vroeg gedraaid: rauw', bad: true, t: 0 };
    else if (r.type === 'full') g.flash = { text: 'Het bord is vol: serveer eerst', bad: true, t: 0 };
  });
  TOP_KEYS.forEach((k, i) => {
    if (!input.wasPressed(k)) return;
    input.consume(k);
    const top = TOPPINGS[i].id;
    const gi = s.guests.findIndex((q) => q.topping === top);
    if (gi < 0) { g.flash = { text: `Niemand wil ${TOPPINGS[i].name}`, bad: true, t: 0 }; return; }
    if (!s.plate.length) { g.flash = { text: 'Geen pannenkoek op het bord', bad: true, t: 0 }; return; }
    const r = serve(s, gi, top);
    if (r.type === 'serve') g.flash = { text: r.fast ? 'Snel geserveerd! Bonus' : 'Geserveerd', bad: false, t: 0 };
  });
  for (const e of stepPan(s, dt)) {
    if (e.type === 'burnt') g.flash = { text: 'Aangebrand! Druk de pantoets om te schrapen', bad: true, t: 0 };
    else if (e.type === 'leave') { g.flash = { text: 'Een gast is weggelopen', bad: true, t: 0 }; say(w, 'leave'); }
    else if (e.type === 'guest' && !g.said) { g.said = true; say(w, 'order'); }
  }
  if (g.flash && (g.flash.t += dt) > 1.6) g.flash = null;
  if (s.phase === 'done') end(w);
}

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const s = g.s;
  const cells = s.pans.map((p, i) => {
    let t = `Pan ${i + 1}<br>leeg`, cls = '';
    if (p.state === 'cooking') {
      const gold = goldenNow(p);
      t = `Pan ${i + 1}<br>${gold ? 'DRAAI!' : p.age < PAN.cookT ? 'bakt' : 'te lang'}`;
      cls = gold ? 'on good' : p.age > PAN.cookT ? 'bad' : 'on';
    } else if (p.state === 'burnt') { t = `Pan ${i + 1}<br>verbrand`; cls = 'bad'; }
    return { t, cls };
  });
  const want = s.guests.map((q) => `${TOPPINGS.find((x) => x.id === q.topping).name} ${Math.ceil(q.patience)}`).join(' · ') || 'niemand';
  const row = `<span>Punten <b>${s.points}</b></span><span>Tijd <b>${Math.max(0, Math.ceil(s.left))}</b></span><span>Bord <b>${s.plate.length}</b></span><span>Gasten: ${want}</span>`;
  board.set({ row, cells, flash: g.flash ? g.flash.text : '', bad: !!(g.flash && g.flash.bad), help: `${key('1')}${key('2')}${key('3')} pan · ${key('Q')} stroop ${key('W')} spek ${key('E')} appel ${key('R')} kaas · ${key('BACKSPACE')} stoppen` });
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8742a';
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
}

function start(w) {
  if (game) return false;
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!board) board = createBoard('pannenkoek');
  board.show();
  game = { s: createPan(Math.random), flash: null, said: false };
  showCard(w, { kind: 'tip', kicker: 'Pannenkoekenschip', title: 'Twee minuten bakken', body: '[1] [2] [3]: beslag in de pan, en draai als hij goudbruin is. Serveer met [Q] stroop, [W] spek, [E] appel, [R] kaas aan de gast die dat wil.', duration: 11, key: 'pannenkoek-help', voice: false });
  say(w, 'start');
  return true;
}

function recText() {
  return recLine(getChallengeRecord('pannenkoek'), (v) => `${Math.round(v)} punten`, MEDALS);
}

export const PANNENKOEK = standActivity({
  id: 'pannenkoek',
  name: 'Pannenkoekenschip De Gouden Pan',
  label: 'Pannenkoekenschip',
  note: 'pannenkoekenschip bij het pannenkoekenschip: bak en serveer, tegen de klok',
  accent: ACCENT,
  stand: () => place(),
  origin: () => place(),
  useRadius: 3,
  labelRadius: 140,
  sub: 'Bak pannenkoeken op het schip · gratis',
  hint: 'Loop naar de loopplank en druk E',
  ubboSub: 'pannenkoeken bakken op het schip, gratis',
  where: 'het pannenkoekenschip aan de kade',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick: () => updateHud(),
  camera: () => {},
  debug: (w) => ({
    spot: () => ({ ...place() }),
    start: () => start(w),
    state: () => (game ? { points: game.s.points, left: game.s.left, served: game.s.served } : null),
    finish: () => { if (!game) return false; game.s.phase = 'done'; game.s.points = 500; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
