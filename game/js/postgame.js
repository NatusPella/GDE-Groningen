import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { JELLE_LOOK } from './fierljep.js';
import { currentStep, getStorySave } from './story.js';
import { isMissionActive, getActiveRace, buildMissionMarker3D, updateMissionMarker3D } from './missions.js';
import { isCinematicActive, playCinematic, showBanner } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { banterAfter } from './banter.js';
import { JELLE, JELLE_LINES, INTROS } from './pg_lines.js';
import { BRUGGEN } from './pg_bruggenrace.js';
import { FIERLJEP } from './pg_fierljep.js';
import { SKUTSJE } from './pg_skutsje.js';
import { FJORD, fjordSave, applyFjordSave, fjordUpgradeOffers } from './pg_foodtruck.js';
import { PG_PRIZE, FJORD_DAY_PAY, FJORD_DAY_HOUR } from './economy.js';

// The post-game: once the story's ending card has played (story.js, read
// only), Jelle Terpstra challenges Tammo and Anita to three replayable duels
// and the Fjord Frituur becomes theirs. This module is the hub: it places
// the start markers (3D badge, map icon, E prompt), runs one challenge at a
// time, shows Jelle's taunts as voiced subtitles, the result banner and the
// medals and records (achievements.js), and feeds the car banter.
//
// A challenge def (pg_*.js): { id, name, blurb, icon ('jelle' | 'fjord'),
//   jelle (a Jelle figure at the marker), spots(world) -> [{ x, y, name }],
//   reach (m), vehicle (the E prompt needs this vehicle: fn(v) -> bool),
//   need (text when that vehicle is missing), start(run) -> true | reason,
//   update(run, dt), stop(run), hud(run) -> race panel data | null,
//   debugWin(run) }. run: { def, spot, world, t, data, ui } and the helpers
//   below (finish, jelle, say, target). finish(run, result) with result
//   { success, medal 0-3, value (time s or score), lower (true: lower value
//   is better), valueText, reason, stats [[k, v]], reward }.
// main.js: initPostgame, tryPostgameInteract (before the other E handlers),
// updatePostgame. world.challenge is set while one runs (missions, banter,
// helirun keep quiet then); world.challengeHud feeds the race panel
// (hud_panel.js), world.challengeTarget the minimap. window.__postgame (debug).

export const CHALLENGES = [BRUGGEN, FIERLJEP, SKUTSJE, FJORD];
const BY_ID = new Map(CHALLENGES.map((d) => [d.id, d]));
const PRIZE = PG_PRIZE;
const SAY_GAP = 9;

let world = null;
let open = false;
let forced = false;
let openCheckT = 0;
let spots = null;
let run = null;
let state = freshState();
let ui = null;
let sub = null;
let beam = null;

function freshState() {
  return { v: 1, invited: false, seen: [], fjord: null };
}

export function isPostgameOpen() {
  return open;
}

function checkOpen() {
  if (forced) return true;
  try {
    const c = currentStep();
    return !!(c && c.finale && getStorySave().cards.includes(c.end));
  } catch (e) { return false; }
}

// --- markers ------------------------------------------------------------------

const ICON_COLORS = { jelle: '#1d4f9c', fjord: '#2f6fb0' };

function drawGlyph(g, kind, r) {
  g.save();
  g.scale(r / 10, r / 10);
  if (kind === 'jelle') {
    // a pompeblêd: an upside-down heart
    g.fillStyle = '#e8333a';
    g.beginPath();
    g.moveTo(0, -7);
    g.bezierCurveTo(-10, 0, -6, 8, 0, 3.5);
    g.bezierCurveTo(6, 8, 10, 0, 0, -7);
    g.fill();
  } else {
    // a paper cone of fries
    g.fillStyle = '#f2c230';
    for (let i = -2; i <= 2; i++) g.fillRect(i * 2.1 - 0.8, -8 + Math.abs(i) * 1.2, 1.6, 7);
    g.fillStyle = '#f4f1e6';
    g.beginPath();
    g.moveTo(-6, -2); g.lineTo(6, -2); g.lineTo(0, 8); g.closePath();
    g.fill();
  }
  g.restore();
}

export function drawPostgameMapIcon(ctx, kind, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = ICON_COLORS[kind] || ICON_COLORS.jelle;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawGlyph(ctx, kind, 3.3 * s);
}

function buildBadge(kind, x, y) {
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 20), new THREE.MeshLambertMaterial({ color: new THREE.Color(ICON_COLORS[kind]), transparent: true, opacity: 0.85 }));
  pad.position.y = 0.03;
  group.add(pad);
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = ICON_COLORS[kind]; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f4f2ec'; g.stroke();
  drawGlyph(g, kind, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  badge.scale.set(0.6, 0.6, 1);
  badge.position.y = kind === 'fjord' ? 3.4 : 2.4;
  const y0 = badge.position.y;
  badge.onBeforeRender = () => { badge.position.y = y0 + Math.sin(performance.now() / 650) * 0.06; };
  group.add(badge);
  return group;
}

function buildJelle(map, x, y) {
  const [px, py] = map.escapeBuilding(x + 1.6, y + 0.8, 0.4);
  const m = buildPersonMesh(JELLE_LOOK.shirt, JELLE_LOOK.skin, JELLE_LOOK);
  m.position.set(px, 0, py);
  m.rotation.y = -Math.atan2(y - py, x - px);
  m.userData.speaker = { x: px, y: py, h: 2.2, speechText: '', speechUntil: 0 };
  return m;
}

function placeSpots() {
  const scene = getScene();
  spots = [];
  for (const def of CHALLENGES) {
    let list = [];
    try { list = def.spots(world) || []; } catch (e) { console.error('postgame spots', def.id, e); }
    for (const q of list) {
      const s = { def, x: q.x, y: q.y, name: q.name || def.name, sub: q.sub || def.blurb, data: q };
      s.marker = buildBadge(def.icon, s.x, s.y);
      scene.add(s.marker);
      if (def.jelle) { s.jelle = buildJelle(world.map, s.x, s.y); scene.add(s.jelle); }
      spots.push(s);
    }
  }
}

function removeSpots() {
  if (!spots) return;
  for (const s of spots) {
    s.marker.removeFromParent();
    if (s.jelle) s.jelle.removeFromParent();
  }
  spots = null;
}

export function getPostgameSpotsForRender() {
  if (!open || !spots) return [];
  return spots.map((s) => ({ x: s.x, y: s.y, name: s.name, sub: s.sub, kind: s.def.icon, busy: s.data.busy ? s.data.busy(world) : null }));
}

// --- prompts and starting -----------------------------------------------------

function blockReason(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (isMissionActive() || getActiveRace()) return 'Niet nu: maak eerst je missie af';
  if (w.sideJob && w.sideJob.active) return 'Niet nu: je bent aan het werk';
  return null;
}

function nearestSpot(w) {
  if (!open || !spots || run || w.pigeonMode || w.heliRun || isCinematicActive()) return null;
  const p = w.player;
  let best = null, bd = Infinity;
  for (const s of spots) {
    const reach = s.def.reach || 2.6;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d > reach || d >= bd) continue;
    best = s; bd = d;
  }
  return best;
}

function vehicleProblem(w, s) {
  const v = w.player.inVehicle;
  if (!s.def.vehicle) return v ? 'Stap eerst uit' : null;
  if (!v || !s.def.vehicle(v)) return s.def.need || 'Kom met het juiste voertuig';
  if (Math.abs(v.speed || 0) > 1) return 'Zet hem eerst stil';
  return null;
}

export function postgamePrompt(w) {
  const s = nearestSpot(w);
  if (!s) return null;
  const why = blockReason(w) || vehicleProblem(w, s);
  const rec = getChallengeRecord(s.def.id);
  const medal = rec && rec.medal ? ` · jouw beste: ${MEDALS[rec.medal].toLowerCase()}` : '';
  return { id: 'pg-' + s.def.id + s.x, x: s.x, y: s.y, h: s.def.icon === 'fjord' ? 3 : 2.6, key: 'E', label: s.def.verb ? s.def.verb(s) : s.name, sub: why || (s.def.promptSub ? s.def.promptSub(s, w) : s.sub + medal), ring: true, dim: !!why };
}

export function postgameSecondary(w) {
  if (!open || !spots || run || w.pigeonMode || w.heliRun) return [];
  const p = w.player;
  const out = [];
  for (const s of spots) {
    if (Math.abs(s.x - p.x) > 30 || Math.abs(s.y - p.y) > 30) continue;
    if (!!s.def.vehicle !== !!p.inVehicle && s.def.icon !== 'fjord') continue;
    out.push({ id: 'pg2-' + s.def.id + s.x, x: s.x, y: s.y, h: 2.4, label: s.name, sub: s.def.icon === 'fjord' ? 'Parkeer de Fjord Frituur hier en druk E' : 'Uitdaging van Jelle: loop erheen en druk E', kind: 'place' });
  }
  return out;
}

// Runs before the shop/horeca/player E handlers (main.js).
export function tryPostgameInteract(w) {
  const input = w.input;
  if (run && run.def.keys) run.def.keys(run, input);
  if (!input || isShopOpen() || isCinematicActive() || run) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestSpot(w);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w) || vehicleProblem(w, s);
  if (why) { w.addMessage(why, 2.5); return true; }
  startChallenge(s);
  return true;
}

function startChallenge(s) {
  const def = s.def;
  const r = { def, spot: s, world, t: 0, data: {}, ui: ensureUi(), lastSay: -99, done: false };
  let ok;
  try { ok = def.start(r); } catch (e) { console.error('postgame start', def.id, e); ok = 'Er ging iets mis bij het klaarzetten'; }
  if (ok !== true) {
    world.addMessage(typeof ok === 'string' ? ok : 'Dat lukt nu even niet', 3);
    try { def.stop(r); } catch (e) { /* ignore */ }
    return false;
  }
  run = r;
  world.challenge = { id: def.id, name: def.name };
  ui.root.hidden = false;
  ui.root.dataset.kind = def.icon;
  ui.title.textContent = def.name;
  if (!state.seen.includes(def.id) && INTROS[def.id]) {
    state.seen.push(def.id);
    playIntro(def, s);
  } else if (def.jelle) jelle(r, 'greet');
  return true;
}

function playIntro(def, s) {
  const names = { J: JELLE, T: 'Tammo', A: 'Anita' };
  let at = 0.6;
  const lines = INTROS[def.id].map(([k, text]) => {
    const dur = Math.max(2.2, Math.min(5, 1 + text.length * 0.05));
    const l = { speaker: names[k], text, at, dur };
    at += dur + 0.2;
    return l;
  });
  const a0 = Math.atan2(world.player.y - s.y, world.player.x - s.x) + 0.6;
  playCinematic({
    id: 'pg-intro', priority: 2, duration: at + 0.4, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: def.icon === 'fjord' ? 'Na het verhaal' : 'Revanche', title: def.name, cardFor: 2.6, lines,
    shot: (u) => {
      const a = a0 + u * 0.7;
      return { position: { x: s.x + Math.cos(a) * 7, y: s.y + Math.sin(a) * 7, z: 3.2 }, lookAt: { x: s.x, y: s.y, z: 1.4 }, fov: 50 };
    },
  });
}

// --- helpers for the challenges --------------------------------------------------

// A voiced subtitle (lines manifest); lines never overlap and queue briefly.
export function say(r, speaker, text, prio = false) {
  if (!r || !text) return false;
  if (!prio && r.t - r.lastSay < SAY_GAP) return false;
  r.lastSay = r.t;
  showSub(speaker, text);
  const v = lineVoiceFor(speaker, text);
  if (v) playLineVoice(v.src, v.dur);
  return true;
}

// One of Jelle's lines for this challenge and moment (pg_lines.js).
export function jelle(r, kind, prio = false) {
  const set = kind === 'greet' ? JELLE_LINES.greet : (JELLE_LINES[r.def.id] || {})[kind];
  if (!set || !set.length) return false;
  const k = (r.data['_' + kind] = ((r.data['_' + kind] ?? Math.floor(Math.random() * set.length)) + 1) % set.length);
  return say(r, JELLE, set[k], prio);
}

export function finish(r, res) {
  if (!r || r.done) return;
  r.done = true;
  const def = r.def;
  const w = world;
  let rec = null;
  if (res.value != null && !res.aborted) rec = recordChallengeResult(w, def.id, { value: res.value, medal: res.medal | 0, lower: !!res.lower });
  const medal = res.medal | 0;
  const prize = res.reward != null ? res.reward : PRIZE[medal];
  if (prize > 0) w.money += prize;
  if (!res.aborted) {
    if (res.success || medal > 0) unlockAchievement(w, `${def.id}_klaar`);
    if (medal >= 3) unlockAchievement(w, `${def.id}_goud`);
    if (def.jelle && res.success) checkJelleAll();
    const stats = [...(res.stats || [])];
    if (medal) stats.push(['Medaille', MEDALS[medal]]);
    if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
    showBanner({
      kind: res.success ? 'pass' : 'fail', title: res.title || (res.success ? 'UITDAGING GEWONNEN' : def.jelle ? 'JELLE WINT' : 'DIENST VOORBIJ'),
      reason: res.reason || '', reward: prize, stats,
    });
    if (def.jelle) jelle(r, res.success ? 'win' : 'lose', true);
    banterAfter(`after:${def.banter || def.id}:${res.success ? 'pass' : 'fail'}`);
  } else if (res.reason) w.addMessage(res.reason, 3);
  stopRun();
}

function checkJelleAll() {
  const all = CHALLENGES.filter((d) => d.jelle).every((d) => {
    const rec = getChallengeRecord(d.id);
    return rec && rec.medal >= 2;
  });
  if (all) unlockAchievement(world, 'jelle_alles');
}

function stopRun() {
  const r = run;
  run = null;
  if (!r) return;
  try { r.def.stop(r); } catch (e) { console.error('postgame stop', e); }
  world.challenge = null;
  world.challengeHud = null;
  world.challengeTarget = null;
  world.challengeHoldPlayer = false;
  if (ui) { ui.root.hidden = true; ui.slot.innerHTML = ''; ui.rows.innerHTML = ''; }
  setTarget(null);
}

export function abortChallenge(reason = '') {
  if (!run) return false;
  finish(run, { aborted: true, reason });
  return true;
}

// The next objective: the minimap target (+ route through `path`) and a
// beam in the world, like a mission checkpoint.
export function setTarget(t) {
  if (!world) return;
  world.challengeTarget = t ? { x: t.x, y: t.y, path: t.path || [] } : null;
  if (!t) { if (beam) beam.visible = false; return; }
  if (!beam) {
    beam = buildMissionMarker3D();
    getScene().add(beam);
  }
  beam.visible = true;
  beam.position.set(t.x, t.z || 0, t.y);
}

export function isChallengeActive(id) {
  return !!run && (!id || run.def.id === id);
}

// --- HUD: a small panel for the minigames and the subtitles -------------------------

const CSS = `
#pg-panel[hidden] { display: none; }
#pg-panel { position: fixed; left: 14px; top: 40%; min-width: 220px; max-width: min(340px, calc(100vw - 32px)); padding: 10px 14px 12px; z-index: 5;
  font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; pointer-events: none;
  background: linear-gradient(160deg, rgba(10,18,34,0.84), rgba(10,18,34,0.55)); border-left: 4px solid #3d7fd9; border-radius: 0 6px 6px 0; box-shadow: 0 4px 18px rgba(0,0,0,0.35); }
#pg-panel[data-kind="fjord"] { border-left-color: #f2c230; }
#pg-panel .pg-title { font-size: 24px; letter-spacing: 2.5px; color: #8fb8f0; line-height: 1; }
#pg-panel[data-kind="fjord"] .pg-title { color: #f2c230; }
#pg-panel .pg-rows div { display: flex; justify-content: space-between; gap: 14px; margin-top: 3px; font-size: 16px; letter-spacing: 1px; color: rgba(240,237,228,0.75); }
#pg-panel .pg-rows b { font-weight: normal; font-size: 21px; color: #f0ede4; }
#pg-panel .pg-slot:empty { display: none; }
#pg-panel .pg-slot { margin-top: 8px; font: 15px/1.35 'Arial Narrow', Arial, sans-serif; letter-spacing: .3px; }
#pg-panel .pg-help { margin-top: 6px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
#pg-panel .pg-bar { position: relative; height: 16px; margin-top: 6px; background: rgba(240,237,228,0.14); border-radius: 8px; overflow: hidden; }
#pg-panel .pg-bar i { position: absolute; top: 0; bottom: 0; background: rgba(93,255,122,0.45); }
#pg-panel .pg-bar i.gold { background: rgba(255,210,63,0.8); }
#pg-panel .pg-bar u { position: absolute; top: -2px; bottom: -2px; width: 4px; margin-left: -2px; background: #fff; box-shadow: 0 0 6px #fff; text-decoration: none; }
#pg-panel .pg-order { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
#pg-panel .pg-order span { padding: 3px 8px; border-radius: 4px; background: rgba(242,194,48,0.18); border: 1px solid rgba(242,194,48,0.45); }
#pg-panel .pg-order span.ok { background: rgba(93,255,122,0.2); border-color: rgba(93,255,122,0.6); }
#pg-panel .pg-order span.bad { background: rgba(255,90,60,0.25); border-color: rgba(255,90,60,0.7); }
#pg-panel .pg-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 10px; margin-top: 8px; font-size: 13px; color: rgba(240,237,228,0.85); }
#pg-panel .pg-menu kbd { display: inline-block; min-width: 16px; padding: 0 4px; margin-right: 4px; text-align: center; border-radius: 3px; background: rgba(240,237,228,0.2); font: inherit; }
#pg-panel .pg-patience { height: 5px; margin-top: 6px; border-radius: 3px; background: linear-gradient(90deg, #5dff7a, #f2c230); }
#pg-sub { position: fixed; left: 50%; bottom: 22vh; transform: translateX(-50%); width: min(86vw, 760px); text-align: center; z-index: 40; pointer-events: none;
  font: clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif; color: #fff; letter-spacing: .3px; text-shadow: 0 1px 3px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.6); opacity: 0; transition: opacity .25s; }
#pg-sub b { margin-right: 6px; }
@media (max-width: 480px) { #pg-panel { top: auto; bottom: 30vh; } }
`;

function ensureUi() {
  if (ui) return ui;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'pg-panel';
  root.hidden = true;
  root.innerHTML = '<div class="pg-title"></div><div class="pg-rows"></div><div class="pg-slot"></div>';
  document.body.appendChild(root);
  const s = document.createElement('div');
  s.id = 'pg-sub';
  s.setAttribute('aria-live', 'polite');
  s.innerHTML = '<b></b><span></span>';
  document.body.appendChild(s);
  ui = {
    root, title: root.querySelector('.pg-title'), rows: root.querySelector('.pg-rows'), slot: root.querySelector('.pg-slot'), sub: s, rowsKey: '', slotKey: '',
    setRows(list) {
      const html = list.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
      if (html !== this.rowsKey) { this.rowsKey = html; this.rows.innerHTML = html; }
    },
    setSlot(html) {
      if (html !== this.slotKey) { this.slotKey = html; this.slot.innerHTML = html; }
    },
  };
  return ui;
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const SPEAKER_COLORS = { [JELLE]: '#8fb8f0', Tammo: '#7fc3ff', Anita: '#ff8f7a' };
function showSub(speaker, text) {
  const el = ensureUi().sub;
  el.firstChild.textContent = speaker + ':';
  el.firstChild.style.color = SPEAKER_COLORS[speaker] || '#fff';
  el.lastChild.textContent = text;
  el.style.opacity = '1';
  sub = { left: Math.max(2.4, Math.min(6, 1 + text.length * 0.06)) };
}

function updateSub(dt) {
  if (!sub) return;
  sub.left -= dt;
  const hide = sub.left <= 0 || isCinematicActive();
  if (hide) { ui.sub.style.opacity = '0'; if (sub.left <= 0) sub = null; }
  else ui.sub.style.opacity = '1';
}

// --- per frame --------------------------------------------------------------------

function invite() {
  if (state.invited || isCinematicActive() || !world.phoneNotifications) return;
  state.invited = true;
  world.phoneNotifications.push({ from: JELLE, text: 'Moai, Grinzers. Revanche? Alve brêgen, in fierljep-duel en in skûtsje-sprint. Myn stipkes steane op jimme kaart.', duration: 9 });
  world.phoneNotifications.push({ from: 'Anita', text: 'En de Fjord Frituur is van ons! Hij staat in de garage. Parkeer hem bij de drukte en open het luik.', duration: 8 });
}

// The Fjord Frituur keeps earning while you're away: a daily wage each morning.
let lastClock = null;
function dayWage(w) {
  const c = w.clock;
  if (!Number.isFinite(c)) return;
  const prev = lastClock;
  lastClock = c;
  if (!open || prev == null || !(prev < FJORD_DAY_HOUR && c >= FJORD_DAY_HOUR && c - prev < 1)) return;
  w.money += FJORD_DAY_PAY;
  if (w.phoneNotifications) w.phoneNotifications.push({ from: 'Fjord Frituur', text: `Goeiemorgen! Gisteren lekker gedraaid: €${FJORD_DAY_PAY} dagomzet op de rekening.`, duration: 6 });
}

export function updatePostgame(dt, w) {
  world = w;
  if ((openCheckT -= dt) <= 0) {
    openCheckT = 1;
    const now = checkOpen();
    if (now !== open) {
      open = now;
      w.postgame = open;
      if (open && !spots && document.body.classList.contains('game-started')) placeSpots();
      if (!open) { stopRun(); removeSpots(); }
    }
    if (open && !spots && document.body.classList.contains('game-started')) placeSpots();
    if (open && spots && document.body.classList.contains('game-started')) invite();
  }
  updateSub(dt);
  dayWage(w);
  for (const d of CHALLENGES) if (d.idle) d.idle(w, dt);
  if (beam && beam.visible) updateMissionMarker3D(beam, w.time, 'active');
  if (spots) {
    const p = w.player;
    for (const s of spots) {
      const busy = !!run;
      s.marker.visible = !busy;
      if (s.jelle) {
        s.jelle.visible = !busy;
        if (!busy && Math.abs(s.jelle.position.x - p.x) < 50 && Math.abs(s.jelle.position.z - p.y) < 50) {
          animatePersonWalk(s.jelle, 0, dt);
          const d = Math.hypot(s.x - p.x, s.y - p.y);
          if (d < 9 && !s.greeted && !p.inVehicle) {
            s.greeted = true;
            const sp = s.jelle.userData.speaker;
            sp.speechText = JELLE_LINES.greet[Math.floor(Math.random() * JELLE_LINES.greet.length)];
            sp.speechUntil = w.time + 3.2;
            const list = w.extraSpeakers || (w.extraSpeakers = []);
            if (!list.includes(sp)) list.push(sp);
            const v = lineVoiceFor(JELLE, sp.speechText);
            if (v) playLineVoice(v.src, v.dur);
          } else if (d > 25) s.greeted = false;
        }
      }
    }
  }
  if (!run) return;
  const r = run;
  if (!isCinematicActive('pg-intro') || r.def.duringIntro) {
    r.t += dt;
    try { r.def.update(r, dt); } catch (e) { console.error('postgame update', e); finish(r, { aborted: true, reason: 'Uitdaging afgebroken' }); return; }
  }
  if (run === r) w.challengeHud = r.def.hud ? r.def.hud(r) : null;
}

export function initPostgame(w) {
  world = w;
  w.postgameActions = { offers: postgameOffers, upgrades: () => (open ? fjordUpgradeOffers(world) : []), active: () => (run ? run.def.name : ''), stop: () => abortChallenge('Uitdaging gestopt') };
  w.onRespawn.push((ww, { busted }) => {
    if (run) finish(run, { success: false, medal: 0, reason: busted ? 'Opgepakt: de uitdaging is voorbij' : 'Je bent dood: de uitdaging is voorbij', stats: [] });
  });
  if (typeof window !== 'undefined') window.__postgame = debugApi;
}

// Ubbo (phone.js) lists the challenges and the Fjord Frituur spots.
function postgameOffers(w = world) {
  if (!open || !spots) return [];
  const p = w.player;
  const seen = new Set();
  const out = [];
  for (const s of spots) {
    const key = s.def.id;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (seen.has(key)) {
      const o = out.find((q) => q.id === key);
      if (d < o.dist) Object.assign(o, { x: s.x, y: s.y, dist: d, where: s.name });
      continue;
    }
    seen.add(key);
    const rec = getChallengeRecord(key);
    out.push({ id: key, name: s.def.name, blurb: s.def.blurb, x: s.x, y: s.y, dist: d, where: s.name, medal: rec && rec.medal ? MEDALS[rec.medal] : '' });
  }
  return out;
}

// --- save --------------------------------------------------------------------------

export function getPostgameSave() {
  return { ...state, fjord: fjordSave() };
}

export function applyPostgameSave(d) {
  state = freshState();
  if (d && typeof d === 'object' && d.v === 1) {
    state.invited = !!d.invited;
    state.seen = Array.isArray(d.seen) ? d.seen.filter((id) => BY_ID.has(id)) : [];
  }
  applyFjordSave(d && d.fjord);
  if (run) stopRun();
}

// --- debug -------------------------------------------------------------------------

const debugApi = {
  open: () => open,
  unlock: () => { forced = true; openCheckT = 0; return true; },
  spots: () => (spots || []).map((s) => ({ id: s.def.id, x: Math.round(s.x), y: Math.round(s.y), name: s.name })),
  start: (id, k = 0) => {
    const list = (spots || []).filter((s) => s.def.id === id);
    const s = list[k] || list[0];
    if (!s || run) return false;
    const p = world.player;
    if (p.inVehicle && !(s.def.vehicle && s.def.vehicle(p.inVehicle))) p.exitVehicle(world.map, world);
    if (s.def.vehicle && !(p.inVehicle && s.def.vehicle(p.inVehicle)) && s.def.debugVehicle) s.def.debugVehicle(world, s);
    else if (!s.def.vehicle && !p.inVehicle) { p.x = s.x + 0.5; p.y = s.y + 0.5; }
    return startChallenge(s);
  },
  win: () => { if (!run || !run.def.debugWin) return false; run.def.debugWin(run); return true; },
  abort: () => abortChallenge('Uitdaging afgebroken (debug)'),
  state: () => (run ? { id: run.def.id, t: Math.round(run.t * 10) / 10, data: run.def.debugState ? run.def.debugState(run) : null } : null),
  record: (id) => getChallengeRecord(id),
  stat: (k, n) => recordStat(world, k, n),
  save: getPostgameSave,
};
