// Shared bits of the Minigames batch 1 (discgolf.js, pitchputt.js,
// skatepark.js, kartbaan.js). Everything fixed in the world is given as
// WGS84 and goes through the shared projection (rdnew.js), never as
// coordinates of an older frame. No THREE here, so the pure rule files and
// their node tests can import it.
import { wgsToWorld } from './rdnew.js';

// Scene, banner and card of the running game, set by activities.js: a minigame that imports them
// itself would sit in the big import cycle through scene3d/cinematics/hudcards (#108).
export const gameUi = { getScene: () => null, showBanner: () => {}, showCard: () => {} };

export const geo = (lat, lon) => {
  const [x, y] = wgsToWorld(lat, lon);
  return { x, y };
};

// A local frame: u along `rot` from the origin, v to its left (the maths
// angle runs counter-clockwise on the map).
export function frame(origin, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return {
    origin,
    rot,
    toW: (u, v) => ({ x: origin.x + c * u - s * v, y: origin.y + s * u + c * v }),
    toL: (x, y) => ({ u: (x - origin.x) * c + (y - origin.y) * s, v: -(x - origin.x) * s + (y - origin.y) * c }),
  };
}

// Medal 0..3 for a value against [bronze, silver, gold]; `lower`: smaller is better.
export function medalFrom(value, at, lower = false) {
  let m = 0;
  for (let i = 0; i < at.length; i++) if (lower ? value <= at[i] : value >= at[i]) m = i + 1;
  return m;
}

export function fmtTime(s) {
  if (!Number.isFinite(s)) return '-:--.--';
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
}

export const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Wind as the shared little struct: speed m/s and the direction it blows to (rad).
export function windText(wind) {
  const bft = Math.round(Math.sqrt(Math.max(0, wind.speed)) * 1.1);
  return bft < 1 ? 'Windstil' : `Wind ${bft} Bft`;
}

export function newWind(rand = Math.random, max = 5) {
  return { speed: rand() * max, dir: rand() * Math.PI * 2 };
}

// --- HUD board ----------------------------------------------------------------------------------

const CSS = `
#hud .mg-board[hidden] { display: none; }
#hud .mg-board { position: absolute; top: var(--hud-top, 14px); left: 50%; transform: translateX(-50%); min-width: 360px; max-width: min(760px, calc(100vw / var(--ui, 1) - 2 * (var(--hud-edge, 46px) + 360px)), calc(100vw - 32px)); padding: 8px 18px 9px 12px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.9), rgba(24,34,28,0.66) 80%, rgba(24,34,28,0.2)); border-left: 3px solid var(--mg-acc, #6cc070); }
#hud .mg-board small { display: block; font-size: 12px; letter-spacing: 3px; color: var(--mg-acc, #6cc070); }
#hud .mg-board .mg-row { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .mg-board .mg-row b { font-weight: normal; color: #ffd23f; font-size: 24px; }
#hud .mg-board .mg-cells { display: flex; gap: 3px; margin: 5px 0 2px; }
#hud .mg-board .mg-cells i { flex: 1; min-width: 26px; text-align: center; font-style: normal; font-size: 13px; padding: 2px 0; background: rgba(240,237,228,0.1); color: rgba(240,237,228,0.75); }
/* touch: a cell with a key is a button (carillon bells) */
html.touch-play #hud .mg-board .mg-cells i[data-k] { pointer-events: auto; touch-action: none; min-height: 44px; display: flex; align-items: center; justify-content: center; }
#hud .mg-board .mg-cells i.on { background: rgba(255,210,63,0.28); color: #fff; }
#hud .mg-board .mg-cells i.good { color: #5dff7a; }
#hud .mg-board .mg-cells i.bad { color: #ff9a3c; }
/* good and bad also differ by shape, not by colour alone */
#hud .mg-board .mg-cells i.good::before { content: '\\2713\\a0'; }
#hud .mg-board .mg-cells i.bad::before, #hud .mg-board .mg-flash.bad::before { content: '\\2715\\a0'; }
#hud .mg-board .mg-meter { display: flex; align-items: center; gap: 10px; margin: 6px 0 4px; }
#hud .mg-board .mg-meter[hidden] { display: none; }
#hud .mg-board .mg-meter .mg-bar { position: relative; flex: 1; height: 11px; background: rgba(240,237,228,0.16); border-radius: 2px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(240,237,228,0.18); }
#hud .mg-board .mg-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--mg-acc, #6cc070); }
#hud .mg-board .mg-meter em { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1px; background: #f0ede4; box-shadow: 0 0 0 1px rgba(12,20,14,0.7); }
#hud .mg-board .mg-meter-t { min-width: 3.2em; text-align: right; font-size: 14px; letter-spacing: 0.5px; color: #f0ede4; }
#hud .mg-board .mg-extra[hidden] { display: none; }
#hud .mg-board .mg-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .mg-board .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .mg-board .mg-flash { font-size: 22px; letter-spacing: 1.5px; color: #5dff7a; min-height: 1em; }
#hud .mg-board .mg-flash.bad { color: #ff9a3c; }
body.mg-on #hud .hud-speedo, body.mg-on #hud .hud-route, body.mg-on #hud .hud-gps, body.mg-on #hud .hud-place, body.mg-on #hud .phonefeed .pf-card { display: none !important; }
/* smal scherm: de spel-HUD begint rechts van de uitlegkaart (linksboven, 350 px) in plaats van eroverheen (#294) */
@media (max-width: 1500px) { #hud .mg-board { left: calc(var(--hud-edge, 46px) + 372px); transform: none; max-width: calc(100vw / var(--ui, 1) - var(--hud-edge, 46px) - 372px - 330px); } }
@media (max-width: 480px) { #hud .mg-board { top: 64px; left: 50%; transform: translateX(-50%); min-width: 0; max-width: calc(100vw - 32px); } }
`;

let cssDone = false;
let inputMod = null;

export const key = (t) => `<span class="hud-key">${t}</span>`;

// A board at the top centre for one game: title, a row of figures, optional
// cells (a scorecard) and meter, a flash line and one line of key hints.
export function createBoard(title, accent) {
  if (!cssDone && typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    cssDone = true;
  }
  const root = document.createElement('div');
  root.className = 'mg-board';
  root.style.setProperty('--mg-acc', accent);
  root.hidden = true;
  root.innerHTML = `<small>${title}</small><div class="mg-row"></div><div class="mg-cells" hidden></div><div class="mg-extra" hidden></div><div class="mg-meter" hidden><span class="mg-bar"><i></i><em></em></span><span class="mg-meter-t"></span></div><div class="mg-flash"></div><div class="mg-help"></div>`;
  (document.getElementById('hud') || document.body).appendChild(root);
  const q = (s) => root.querySelector(s);
  const el = { row: q('.mg-row'), cells: q('.mg-cells'), extra: q('.mg-extra'), meter: q('.mg-meter'), bar: q('.mg-meter i'), mark: q('.mg-meter em'), meterT: q('.mg-meter-t'), flash: q('.mg-flash'), help: q('.mg-help') };
  let last = '';
  // a cell with `key` sends that key while touched
  const tapFor = (e, type) => {
    const c = e.target.closest && e.target.closest('i[data-k]');
    if (!c) return;
    e.preventDefault();
    // input.js only loads in the browser (the rule tests import this file)
    inputMod = inputMod || import('./input.js');
    inputMod.then((m) => m.sendKey(type, c.dataset.k, 'touch'));
  };
  el.cells.addEventListener('pointerdown', (e) => tapFor(e, 'keydown'));
  el.cells.addEventListener('pointerup', (e) => tapFor(e, 'keyup'));
  el.cells.addEventListener('pointercancel', (e) => tapFor(e, 'keyup'));
  return {
    root,
    show() { root.hidden = false; document.body.classList.add('mg-on', 'mg-board'); last = ''; },
    hide() { root.hidden = true; document.body.classList.remove('mg-on', 'mg-board'); cancelStopAsk(); },
    // { row: html, cells: [{ t, cls }], extra: html (een blok onder de cellen, bv. een scorebord), meter: { v, mark, color, text }, flash, bad, help: html }
    set(s) {
      const sig = JSON.stringify([s.row, s.cells, s.extra, s.meter && [Math.round(s.meter.v * 100), s.meter.mark != null ? Math.round(s.meter.mark * 100) : -1, s.meter.color, s.meter.text], s.flash, !!s.bad, s.help]);
      if (sig === last) return;
      last = sig;
      el.row.innerHTML = s.row || '';
      if (s.cells) {
        el.cells.hidden = false;
        el.cells.innerHTML = s.cells.map((c) => `<i class="${c.cls || ''}"${c.key ? ` data-k="${c.key}"` : ''}>${c.t}</i>`).join('');
      } else { el.cells.hidden = true; el.cells.innerHTML = ''; } // .mg-cells heeft display:flex: hidden alleen verbergt niets, dus ook leegmaken
      if (s.extra) { el.extra.hidden = false; el.extra.innerHTML = s.extra; } else { el.extra.hidden = true; el.extra.innerHTML = ''; }
      if (s.meter) {
        el.meter.hidden = false;
        el.meterT.textContent = s.meter.text || '';
        el.meterT.style.display = s.meter.text ? '' : 'none';
        el.bar.style.width = `${Math.round(clamp(s.meter.v, 0, 1) * 100)}%`;
        el.bar.style.background = s.meter.color || '';
        el.mark.style.display = s.meter.mark == null ? 'none' : '';
        if (s.meter.mark != null) el.mark.style.left = `${Math.round(clamp(s.meter.mark, 0, 1) * 100)}%`;
      } else el.meter.hidden = true;
      el.flash.textContent = s.flash || '';
      el.flash.classList.toggle('bad', !!s.bad);
      el.help.innerHTML = s.help || '';
    },
  };
}

// A text bubble over somebody (no voice): replaces their earlier one.
export function bubble(w, { x, y, name, text, female = false, h = 2.1, ttl = 0, follow = null, tag = 'mg' }) {
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].mgTag === tag && sp[i].speechName === name) sp.splice(i, 1);
  sp.push({ x, y, h, follow: follow || undefined, female, speechName: name, speechText: text, speechUntil: w.time + (ttl || Math.max(2.6, 1.2 + text.length * 0.06)), mgTag: tag });
}

export function clearBubbles(w, tag) {
  if (w.extraSpeakers) w.extraSpeakers = w.extraSpeakers.filter((e) => e.mgTag !== tag);
}

export const pick = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

// Backspace or the pad's B stops any of the games at once; Esc asks "Stoppen?"
// first (a second Esc or Enter confirms, Space carries on).
let stopAsk = null;
function cancelStopAsk() {
  if (!stopAsk) return;
  clearTimeout(stopAsk.timer);
  stopAsk.el.remove();
  stopAsk = null;
}
export function stopPressed(input) {
  if (input.wasPressed('backspace')) { input.consume('backspace'); cancelStopAsk(); return true; }
  if (stopAsk) {
    for (const k of ['escape', 'enter']) {
      if (input.wasPressed(k)) { input.consume(k); cancelStopAsk(); return true; }
    }
    if (input.wasPressed(' ')) { input.consume(' '); cancelStopAsk(); }
  } else if (input.wasPressed('escape') && typeof document !== 'undefined') {
    input.consume('escape');
    const el = document.createElement('div');
    el.className = 'mg-stopask';
    el.setAttribute('role', 'alertdialog');
    el.style.cssText = 'position:fixed;left:50%;top:38%;transform:translateX(-50%);z-index:60;background:rgba(10,12,18,.92);color:#fff;padding:14px 22px;border-radius:12px;font:600 18px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none';
    el.innerHTML = 'Stoppen?<br><small style="font-weight:400">Esc of Enter = stoppen &middot; Spatie = doorgaan</small>';
    document.body.appendChild(el);
    stopAsk = { el, timer: setTimeout(cancelStopAsk, 5000) };
  }
  return false;
}

// Ease a camera pose onto a target one.
export function easeCamera(state, pos, at, k = 0.12) {
  if (!state.cam) state.cam = { pos: { ...pos }, at: { ...at } };
  for (const key2 of ['x', 'y', 'z']) {
    state.cam.pos[key2] += (pos[key2] - state.cam.pos[key2]) * k;
    state.cam.at[key2] += (at[key2] - state.cam.at[key2]) * k;
  }
  return { position: { ...state.cam.pos }, lookAt: { ...state.cam.at } };
}

// Deterministic random for the rule tests.
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
