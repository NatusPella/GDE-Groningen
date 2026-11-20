import { hoofdspeler } from './players.js';
import { volgendeTredeRij } from './medalrules.js';
import { getSettings } from './settings.js';
import { cleanDifficulty, difficultyRecordKey, scaleTimeLimit } from './difficulty.js'; // #800: stand en records per stand
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, geo, makeRng } from './minigamekit.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostPunt, wedGastPunt, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './multiplayerwedstrijd.js'; // Samen spelen (#983): de pannenkoekenwedstrijd
import { getPancakeBoatSpot } from './cityprops.js';
import { PANNENKOEK_LINES } from './minigamelines3.js';
import { PAN, TOPPINGS, MEDAL_AT, scaledMedalAt, createPan, usePan, serve, stepPan, goldenNow, pannenkoekMedal } from './pannenkoekrules.js';
import { pushAudioEvent } from './pedgeom.js';

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

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  if (g.online && !quit && !g.gemeld) { // Samen spelen (#983): je punten gaan naar wie het spel opende; die houdt het scorebord
    g.gemeld = true;
    if (g.online === 'host') wedHostPunt(w, 0, Math.max(0, Math.round(g.s.points))); else wedGastPunt(w, 0, Math.max(0, Math.round(g.s.points)));
  }
  game = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'pannenkoek');
  if (g.online) { eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { w.addMessage('Pannenkoeken bakken gestopt', 2.5); return; }
  const s = g.s;
  const mode = cleanDifficulty(getSettings().difficulty);
  const medal = pannenkoekMedal(s.points, mode);
  const rec = recordChallengeResult(w, difficultyRecordKey(mode, 'pannenkoek'), { value: s.points, medal });
  recordStat(w, 'pannenkoekShifts');
  setStatMax(w, 'pannenkoekBest', s.points);
  unlockAchievement(w, 'pannenkoek_klaar');
  if (medal >= 3) unlockAchievement(w, 'pannenkoek_goud');
  const stats = [['Punten', String(s.points)], ['Geserveerd', String(s.served)], ['Goudbruin', String(s.golden)], ['Verbrand', String(s.burnt)], ['Gasten weg', String(s.left_)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  volgendeTredeRij(stats, scaledMedalAt(mode), s.points, { medal, eenheid: 'punten', eenheid1: 'punt' });
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KOK VAN HET SCHIP' : medal ? 'SMAKELIJK' : 'AANGEBRAND', reason: medal ? `${s.served} gasten blij gemaakt` : 'Draai de pannenkoek in het gouden venster en let op de toppings', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

// Online (#983): wie stopt laat de anderen doorbakken; de uitslag en de beloning komen van wie het spel opende (multiplayerwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); } // de host stopt het voor iedereen, een gast alleen voor zichzelf
    w.addMessage('Pannenkoeken bakken gestopt', 2.5);
    return;
  }
  // je eigen record, je dienst en je prestatie tellen gewoon mee
  const mode = cleanDifficulty(getSettings().difficulty);
  recordChallengeResult(w, difficultyRecordKey(mode, 'pannenkoek'), { value: g.s.points, medal: pannenkoekMedal(g.s.points, mode) });
  recordStat(w, 'pannenkoekShifts');
  setStatMax(w, 'pannenkoekBest', g.s.points);
  unlockAchievement(w, 'pannenkoek_klaar');
  if (g.online === 'gast' || !res) return; // een gast: de uitslagkaart en het geld komen van de host
  beloonOnline(w, res);
}
// De beloning van een plek in het eigen geld en de eigen loopbaan (de gasten krijgen de hunne van de host).
function beloonOnline(w, res) {
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'horeca', jij.geld, { xp: jij.xp, n: 1, uniek: 'pannenkoekenschip', deel: false });
  if (jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
}

function updateGame(w, dt) {
  const g = game, input = w.input, p = hoofdspeler(w);
  if (g.online === 'gast' && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true, extern: true }); return; } // de verbinding is weg
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
    if (r.type === 'serve') {
      pushAudioEvent(w, { kind: 'sizzle', strength: 0.7 });
      g.flash = { text: r.fast ? 'Snel geserveerd! Bonus' : 'Geserveerd', bad: false, t: 0 };
    }
  });
  for (const e of stepPan(s, dt)) {
    if (e.type === 'burnt') {
      pushAudioEvent(w, { kind: 'sizzle', strength: 0.4, dur: 0.5 });
      g.flash = { text: 'Aangebrand! Druk de pantoets om te schrapen', bad: true, t: 0 };
    }
    else if (e.type === 'leave') { g.flash = { text: 'Een gast is weggelopen', bad: true, t: 0 }; say(w, 'leave'); }
    else if (e.type === 'guest' && !g.said) { g.said = true; say(w, 'order'); }
  }
  if (g.flash && (g.flash.t += dt) > 1.6) g.flash = null;
  if (s.phase === 'done') end(w);
}

function updateHud(w) {
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
  const online = g.online ? wedScoreRijen(w) : [];
  const stand = online.length ? `<span>${online.map((r) => `${r.weg ? '<s>' : ''}${r.naam}${r.weg ? '</s>' : ''}`).join(' · ')}</span>` : '';
  const row = `${stand}<span>Punten <b>${s.points}</b></span><span>Tijd <b>${Math.max(0, Math.ceil(s.left))}</b></span><span>Bord <b>${s.plate.length}</b></span><span>Gasten: ${want}</span>`;
  board.set({ row, cells, flash: g.flash ? g.flash.text : '', bad: !!(g.flash && g.flash.bad), help: `${key('1')}${key('2')}${key('3')} pan · ${key('Q')} stroop ${key('W')} spek ${key('E')} appel ${key('R')} kaas · ${key('BACKSPACE')} stoppen` });
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8742a';
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
}

function start(w, { online = null } = {}) {
  if (game) return false;
  const p = hoofdspeler(w);
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!board) board = createBoard('pannenkoek');
  board.show();
  const mode = cleanDifficulty(getSettings().difficulty);
  // Samen spelen (#983): dezelfde bestellingen en dezelfde twee minuten voor iedereen (vaste zaadwaarde, geen stand-schaal)
  const s0 = createPan(online ? makeRng(983 + 17) : Math.random);
  s0.left = online ? PAN.duration : scaleTimeLimit(PAN.duration, mode); // #800: de stand schaalt de twee minuten
  game = { s: s0, flash: null, said: false, online };
  showCard(w, { kind: 'tip', kicker: 'Pannenkoekenschip', title: 'Twee minuten bakken', body: '[1] [2] [3]: beslag in de pan, en draai als hij goudbruin is. Serveer met [Q] stroop, [W] spek, [E] appel, [R] kaas aan de gast die dat wil.', duration: 11, key: 'pannenkoek-help', voice: false });
  say(w, 'start');
  return true;
}

// Met gasten in de sessie is het Pannenkoekenschip een wedstrijd tegen elkaar (Meedoen? J/N); nog eens E start meteen (#983).
function startOfUitnodigen(w) {
  const uit = wedNodigUit(w, 'pannenkoek');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  return start(w);
}

function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) updateHud(w);
  return true;
}
registreerWedstrijd('pannenkoek', {
  naam: 'Pannenkoekenschip De Gouden Pan', soort: 'punt', vak: 'horeca',
  opties: () => ({ beurten: 1, naEerste: 60, format: (p) => `${Math.round(p).toLocaleString('nl-NL')} punten` }), // 60 s: wie nog bakt mag afmaken
  start: (w) => start(w, { online: 'host' }),
  plek: () => ({ ...place() }),
  gastPlek: (w, x, y) => !game && !hoofdspeler(w).inVehicle && Math.hypot(x - place().x, y - place().y) < 4.5, // een gast vraagt het bij de loopplank
  eind: (w, res) => {
    if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true });
    else if (res) beloonOnline(w, res); // de host was al klaar: alleen zijn beloning miste nog
  },
  solo: (w) => start(w),
});
zetWedGastHaken('pannenkoek', {
  dichtbij: (w) => !game && !hoofdspeler(w).inVehicle && Math.hypot(hoofdspeler(w).x - place().x, hoofdspeler(w).y - place().y) < 3,
  start: (w) => start(w, { online: 'gast' }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

function recText() {
  return recLine(getChallengeRecord(difficultyRecordKey(cleanDifficulty(getSettings().difficulty), 'pannenkoek')), (v) => `${Math.round(v)} punten`, MEDALS);
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
  start: (w) => startOfUitnodigen(w),
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick: (dt, w) => updateHud(w),
  camera: () => {},
  debug: (w) => ({
    spot: () => ({ ...place() }),
    start: () => start(w),
    state: () => (game ? { points: game.s.points, left: game.s.left, served: game.s.served } : null),
    finish: () => { if (!game) return false; game.s.phase = 'done'; game.s.points = 500; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});

