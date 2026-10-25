import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { iconDisc, activityBlock } from './activitykit.js';
import { isShopOpen } from './shopui.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, fmtTime } from './minigamekit.js';
import { WANDEL_LINES } from './minigamelines3.js';
import { registerQuitHook } from './busy.js';
import { STAMPS, routePoints, routeLength, createWalk, stepWalk, averagePace, walkMedal, nextTarget, PACE_MEDAL_AT } from './wandelrules.js';

// Wandeling Winsum (the Pieterpad at Winsum): an activity that does NOT take
// over the player. E at the first stamp post starts the walk; you walk (or
// run) yourself to the five posts in order while the board shows the next
// post and the distance. Time runs, distance on foot counts for the average
// pace that decides the medal; in a vehicle nothing counts, so stepping out
// is part of the walk. Backspace stops. Free. Rules: wandelrules.js.
// `window.__wandeling` debug. The stamp coordinates are approximate and not
// yet checked against the tiles round Winsum.
const ACCENT = mgThema('wandeling').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const USE_RADIUS = 3;
const PTS = routePoints();
const START = { x: PTS[0].x, y: PTS[0].y };

let run = null;
let board = null;
let hudT = 0;

const say = (w, kind, ttl = 0) => {
  const list = WANDEL_LINES[kind];
  if (list) bubble(w, { x: START.x, y: START.y, name: WANDEL_LINES.who, text: pick(list), h: 2.3, tag: 'wandeling', ttl });
};

const compass = (a) => ['oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest', 'noord', 'noordoost'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];

function finish(w, { quit = false } = {}) {
  const r = run;
  if (!r) return;
  run = null;
  w.wandelingActief = false;
  if (board) board.hide();
  clearBubbles(w, 'wandeling');
  if (quit) { w.addMessage('Wandeling gestopt', 2.5); return; }
  const s = r.s;
  const medal = walkMedal(s);
  const rec = recordChallengeResult(w, 'wandeling', { value: s.t, medal, lower: true });
  recordStat(w, 'wandelingen');
  setStatMax(w, 'wandelAfstand', Math.round(s.dist));
  unlockAchievement(w, 'wandel_klaar');
  if (medal >= 3) unlockAchievement(w, 'wandel_goud');
  const stats = [['Tijd', fmtTime(s.t)], ['Afstand', `${(s.dist / 1000).toFixed(1).replace('.', ',')} km`], ['Tempo', `${averagePace(s).toFixed(1).replace('.', ',')} m/s`], ['Stempels', `${s.stamps.length}/${s.pts.length}`]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'SNELSTE WANDELAAR' : 'ALLE STEMPELS', reason: medal ? 'Gewandeld langs de dijk bij Winsum' : 'Loop een stuk sneller voor een medaille', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', 4.5);
}

function start(w) {
  if (run) return false;
  if (!board) board = createBoard('wandeling');
  board.show();
  run = { s: createWalk(PTS), flash: null, hint: '' };
  // De wandeling neemt de speler niet over (active: false), maar een controller en de tastbare knoppen moeten
  // hem wel kunnen stoppen: de indeling 'minigame' zet B op Backspace. Zie gamepad.js en touchlogic.js.
  w.wandelingActief = true;
  showCard(w, { kind: 'tip', kicker: 'Wandeling', title: 'Pieterpad bij Winsum', body: 'Loop in volgorde langs de vijf stempelposten. Lopend tellen tijd en afstand; in een voertuig telt niets. [Backspace] stopt.', duration: 11, key: 'wandel-help', voice: false });
  say(w, 'start');
  return true;
}

function updateHud() {
  if (!run || !board) return;
  const s = run.s;
  const cells = s.pts.map((q, i) => ({ t: `${i + 1}`, cls: i < s.next ? 'good' : i === s.next ? 'on' : '' }));
  const tgt = run.tgt;
  const row = `<span>Tijd <b>${fmtTime(s.t)}</b></span><span>Afstand <b>${(s.dist / 1000).toFixed(2).replace('.', ',')} km</b></span><span>Tempo <b>${averagePace(s).toFixed(1).replace('.', ',')} m/s</b></span>${tgt ? `<span>${tgt.name}: ${Math.round(tgt.dist)} m ${compass(tgt.bearing)}</span>` : ''}`;
  board.set({ row, cells, flash: run.flash ? run.flash.text : run.mounted ? 'Stap uit: in een voertuig telt niets' : '', bad: !!run.mounted, help: `Loop naar de volgende post · ${key('BACKSPACE')} stoppen` });
}

function tick(dt, w) {
  if (!run) return;
  if (w.pendingRespawn || w.input.wasPressed('backspace')) { w.input.consume('backspace'); finish(w, { quit: true }); return; }
  const p = w.player;
  run.mounted = !!(p.inVehicle || p.swimming);
  if (run.mounted) { run.s.t += dt; run.s.last = null; } else {
    for (const e of stepWalk(run.s, { x: p.x, y: p.y }, dt)) {
      if (e.type === 'stamp') { run.flash = { text: `Stempel ${e.n}/${e.of}: ${e.name}`, t: 0 }; if (e.n === 2) say(w, 'stamp', 3.5); }
    }
  }
  run.tgt = nextTarget(run.s, { x: p.x, y: p.y });
  if (run.flash && (run.flash.t += dt) > 2.5) run.flash = null;
  if (run.s.phase === 'done') { finish(w); return; }
  if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(); }
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(0, -2.2, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0, -1.2); ctx.lineTo(0, 1.4); ctx.moveTo(0, 1.4); ctx.lineTo(-1.5, 3); ctx.moveTo(0, 1.4); ctx.lineTo(1.5, 3); ctx.moveTo(-1.6, 0); ctx.lineTo(1.6, 0); ctx.stroke();
}

const near = (w) => !run && !w.player.inVehicle && !w.player.swimming && Math.hypot(w.player.x - START.x, w.player.y - START.y) < USE_RADIUS;
const recText = () => {
  const r = getChallengeRecord('wandeling');
  return r && r.best != null ? `Record: ${fmtTime(r.best)}${r.medal ? ' · ' + MEDALS[r.medal].toLowerCase() : ''}` : null;
};

// de wandeling meldt zich als niet-actief (hij neemt de speler niet over), dus quitActivity slaat hem over:
// een eigen quit-hook laat de duif (en andere modi) een lopende wandeling toch netjes stoppen (#241)
registerQuitHook((w) => { if (run) finish(w, { quit: true }); });

export const WANDELING = {
  id: 'wandeling',
  layer: 'wandeling',
  legend: { kind: 'act-wandeling', label: 'Wandeling Winsum', note: 'Pieterpad bij Winsum: vijf stempelposten, tegen de klok' },
  init(w) {
    w.wandelingActief = false;
    window.__wandeling = {
      spot: () => ({ ...START }),
      route: () => PTS.map((q) => ({ id: q.id, x: q.x, y: q.y })),
      length: () => routeLength(PTS),
      start: () => start(w),
      state: () => (run ? { next: run.s.next, stamps: run.s.stamps.length, dist: run.s.dist, t: run.s.t } : null),
      quit: () => { if (!run) return false; finish(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'wandeling', name: 'Wandeling Winsum', x: START.x, y: START.y }],
  prompt(w) {
    if (!near(w) || isShopOpen()) return null;
    const why = activityBlock(w);
    return { id: 'wandeling', x: START.x, y: START.y, h: 2.2, key: 'E', label: 'Wandeling Winsum', sub: why || recText() || 'Vijf stempelposten langs de dijk · gratis', ring: true, dim: !!why };
  },
  secondary(w) {
    if (run || w.player.inVehicle || Math.hypot(w.player.x - START.x, w.player.y - START.y) > 160) return [];
    return [{ id: 'wandeling-2', x: START.x, y: START.y, h: 2.2, label: 'Wandeling Winsum', sub: 'Loop naar de eerste paal en druk E', kind: 'place' }];
  },
  interact(w) {
    if (!near(w)) return false;
    const why = activityBlock(w);
    if (why) { w.addMessage(why, 2.5); return true; }
    start(w);
    return true;
  },
  // the walk never takes over the player, so it is not an "active" minigame
  active: () => false,
  quit: (w) => { if (run) finish(w, { quit: true }); },
  update: () => {},
  tick,
  camera: () => {},
  icon(ctx, s) {
    iconDisc(ctx, s, ACCENT);
    ctx.save();
    ctx.scale(s, s);
    glyph(ctx);
    ctx.restore();
  },
  mapSub: () => recText() || 'Pieterpad bij Winsum',
  ubbo(w) {
    return { name: 'Wandeling Winsum', sub: 'vijf stempelposten langs de dijk, gratis', dist: Math.hypot(START.x - w.player.x, START.y - w.player.y), x: START.x, y: START.y, play: 'wandeling', where: 'Winsum', hint: 'loop naar de eerste paal en druk E' };
  },
};
