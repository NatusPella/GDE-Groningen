// Shared bits of the Minigames batch 1 (discgolf.js, pitchputt.js,
// skatepark.js, kartbaan.js). Everything fixed in the world is given as
// WGS84 and goes through the shared projection (rdnew.js), never as
// coordinates of an older frame. No THREE here, so the pure rule files and
// their node tests can import it.
import { wgsToWorld } from './rdnew.js';
import { GOLF_VORM } from './golficons.js';

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
#hud .mg-board small { display: flex; align-items: center; gap: 6px; font-size: 12px; letter-spacing: 3px; color: var(--mg-acc, #6cc070); }
#hud .mg-board .mg-ic { flex: none; }
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

// --- Per-game HUD theme (#453) -------------------------------------------------------------------
// One table for the HUD of every minigame: its title, its accent (the board's border, title and meters) and its icon.
// The icons are flat low-poly SVG shapes in the design tokens (cream, the greens, the one red) with their own form
// next to the colour, and hidden from screen readers because the title already names the game. No new imagery: a game
// takes an icon that is already there, so the four of this board sit next to the golf set (golficons.js) and games
// that share a kind of play (the water sports) share its icon. A game without a row here keeps the neutral board:
// createBoard(title, accent) still works as before.
const MG_ICONEN = {
  // discgolf: een hoekige schijf (de basket staat op de baan, niet in het bord)
  disc: `<polygon points="4,17 11,14 18,17 12,20" fill="#17301f"/><polygon points="11,5 18,8.5 18,15.5 11,19 4,15.5 4,8.5" fill="#f0ede4"/><polygon points="11,5 18,8.5 11,12" fill="#ffffff"/><polygon points="11,12 18,15.5 11,19" fill="#cfcbbd"/><polygon points="11,12 4,15.5 4,8.5" fill="#d9d5c6"/>`,
  // golf: de vlag in de hole
  vlag: `<ellipse cx="12" cy="20.5" rx="6" ry="2" fill="#17301f"/><polygon points="12,3 12,20 13.2,20 13.2,3" fill="#f0ede4"/><polygon points="13.2,3.5 21,6.8 13.2,10.2" fill="#d93f3f"/><polygon points="13.2,3.5 21,6.8 13.2,6.8" fill="#ec6b5a"/>`,
  // skatepark: een deck met twee wielen
  skate: `<polygon points="3,10 20,7.5 21.5,11.5 4.5,14" fill="#f0ede4"/><polygon points="4.5,14 21.5,11.5 21.5,12.8 4.5,15.3" fill="#cfcbbd"/><polygon points="7,15.3 9.4,15 9.4,18 7,18.3" fill="#17301f"/><polygon points="16,13.6 18.4,13.3 18.4,16.3 16,16.6" fill="#17301f"/>`,
  // karten: de geblokte finishvlag
  kart: `<polygon points="3,2.5 4.6,2.5 4.6,21.5 3,21.5" fill="#cfcbbd"/><polygon points="4.6,3 21,3 21,13.5 4.6,13.5" fill="#f0ede4"/><polygon points="4.6,3 8.7,3 8.7,8.2 4.6,8.2" fill="#17301f"/><polygon points="12.8,3 16.9,3 16.9,8.2 12.8,8.2" fill="#17301f"/><polygon points="8.7,8.2 12.8,8.2 12.8,13.5 8.7,13.5" fill="#17301f"/><polygon points="16.9,8.2 21,8.2 21,13.5 16.9,13.5" fill="#17301f"/>`,
  // de golfset (golficons.js): bal, wedge, putter, zand, water, beurt, oog en winnaar
  ...GOLF_VORM,
};

export const MG_THEMA = {
  discgolf: { titel: 'DISCGOLF STADSPARK', accent: '#f08a2e', icoon: 'disc' },
  pitchputt: { titel: 'PITCH & PUTT', accent: '#46b36a', icoon: 'vlag' },
  skatepark: { titel: 'SKATEPARK STADSPARK', accent: '#e8523a', icoon: 'skate' },
  kartbaan: { titel: 'KARTEN IN ULRUM', accent: '#f2b82a', icoon: 'kart' },
  // de toren: wie boven is wint (kroon)
  klimtoren: { titel: 'KLIMTOREN ZERNIKE', accent: '#d9455f', icoon: 'winnaar' },
  // het water: baantjes, skiën, hengelen, zeilen en de rondvaart delen het golf-icoon van de golven
  zwembad: { titel: 'ZWEMBAD HET NATTE PAPIER', accent: '#2fc4c9', icoon: 'water' },
  waterski: { titel: 'WATERSKIBAAN GRUNOPARK', accent: '#1f9e86', icoon: 'water' },
  hengelen: { titel: 'HENGELEN', accent: '#7aa63a', icoon: 'water' },
  regatta: { titel: 'ZEILREGATTA', accent: '#3f8fa0', icoon: 'water' },
  vaardienst: { titel: 'RONDVAART', accent: '#cf7f5a', icoon: 'water' },
  // de pan: een ronde koek (de bal)
  pannenkoek: { titel: 'PANNENKOEKENSCHIP DE GOUDEN PAN', accent: '#b8792a', icoon: 'bal' },
  // op weg: de wandeling en het carillon gaan om de beurt verder (de pijl)
  wandeling: { titel: 'WANDELING WINSUM', accent: '#a3c94a', icoon: 'beurt' },
  carillon: { titel: 'CARILLON MARTINITOREN', accent: '#c9a227', icoon: 'beurt' },
  // het luchtruim: de school en de rondvlucht kijken van boven (het oog)
  vliegschool: { titel: 'VLIEGSCHOOL DE WINDWIJZER', accent: '#d9d4be', icoon: 'oog' },
  vluchtdienst: { titel: 'VLUCHT', accent: '#8fb04a', icoon: 'oog' },
  // de arena en de machinist: een wedstrijd met een uitslag (de kroon en de finishvlag)
  pvparena: { titel: 'PVP-ARENA', accent: '#c9568a', icoon: 'winnaar' },
  machinist: { titel: 'MACHINIST', accent: '#b3b3a2', icoon: 'kart' },
};

export function mgIcoon(naam, px = 16) {
  const v = MG_ICONEN[naam];
  if (!v) return '';
  return `<svg class="mg-ic" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${v}</svg>`;
}

// The HUD theme of an activity, or null for one that has none (yet).
export const mgThema = (id) => MG_THEMA[id] || null;

// A board at the top centre for one game: title, a row of figures, optional
// cells (a scorecard) and meter, a flash line and one line of key hints.
// Leave `accent` out and pass an id from MG_THEMA for the game's own title, colour and icon.
export function createBoard(title, accent) {
  const thema = MG_THEMA[title];
  const titel = thema ? thema.titel : title;
  const kleur = thema ? thema.accent : accent;
  if (!cssDone && typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    cssDone = true;
  }
  const root = document.createElement('div');
  root.className = 'mg-board';
  root.style.setProperty('--mg-acc', kleur || '#6cc070');
  if (thema) root.dataset.mg = title;
  root.hidden = true;
  root.innerHTML = `<small>${thema ? mgIcoon(thema.icoon) : ''}<span>${titel}</span></small><div class="mg-row"></div><div class="mg-cells" hidden></div><div class="mg-extra" hidden></div><div class="mg-meter" hidden><span class="mg-bar"><i></i><em></em></span><span class="mg-meter-t"></span></div><div class="mg-flash"></div><div class="mg-help"></div>`;
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

// How much of the remaining distance one frame covers: `k` is the fraction at
// 60 frames per second, scaled to `dt` seconds. A pause or a hitch counts for
// at most a quarter second, so the camera glides on instead of jumping; the
// same elapsed time gives the same pose on a fast and a slow screen (#436).
export function easeStep(k, dt = 1 / 60) {
  const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 1 / 60;
  return 1 - Math.pow(1 - clamp(k, 0.001, 0.999), d * 60);
}

// Ease a camera pose onto a target one. `k` is the fraction per frame at 60 fps
// and the step is scaled to the frame time in `state.dt` (the game stores it in
// its update), so the camera follows per second instead of per frame.
export function easeCamera(state, pos, at, k = 0.12) {
  if (!state.cam) state.cam = { pos: { ...pos }, at: { ...at } };
  const f = easeStep(k, state.dt);
  for (const key2 of ['x', 'y', 'z']) {
    state.cam.pos[key2] += (pos[key2] - state.cam.pos[key2]) * f;
    state.cam.at[key2] += (at[key2] - state.cam.at[key2]) * f;
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
