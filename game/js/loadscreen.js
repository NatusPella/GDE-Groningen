// The load screen (the approved "Laadscherm"): a slow Ken Burns picture of the
// place you are going to, the logo, "Eerder in het verhaal", a "Je gaat verder
// in" card, a tip and a real progress bar with the phase of the work. It
// covers loading a save, fast travel and long jumps (teleport, a long
// respawn); the work it waits for is the city streaming in round the player
// (scene3d.js streamPending). The picture is one of the game's own renders
// (img/laad/), chosen by where you are going.
import { getStoryView } from './storyquery.js';
import { PARTS } from './storyarc.js';
import { hudDate } from './hudcalendar.js';
import { streamPending } from './scene3d.js';
import { placeLabel } from './hud_panel.js';
import { LANDMARK_LINES } from './placelines.js';
import { pictureHtml, missionPicture } from './loadscene.js';
import { JUMP_M as JM, loadKind, stepProgress, startProgress, pickTips, buildLines, LINE_S } from './loadlogic.js';

const CITY_IMAGES = ['vismarkt', 'luchtfoto', 'rondvaart', 'duif'];
let tips = [];
export const setLoadTips = (list) => { tips = [...list]; };
let lastTip = '';

export const JUMP_M = JM;

let css = false;
let active = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

// The picture for a place: the open road in the country, the fair at night,
// the harbours by the water, otherwise one of the city views by name.
export function pickImage(world, place, mission) {
  if (mission) return missionPicture(mission);
  const night = !!(world.dayNight && (world.dayNight.night ?? 0) > 0.5);
  if (place.country) return night ? 'achtervolging' : 'ringrace';
  if (night) return 'kermis';
  if (/haven|kade|diep|gracht|water/i.test(place.name || '')) return 'rondvaart';
  if (/markt|binnenstad|forum|toren|kerk/i.test(place.name || '')) return 'vismarkt';
  return CITY_IMAGES[hash(place.name || '') % CITY_IMAGES.length];
}

function recapText(view) {
  const part = view && view.part && PARTS[view.part] ? PARTS[view.part] : PARTS.kop;
  if (part.recap) {
    const lines = part.recap.filter(([w]) => w !== 'studio').map(([, t]) => t.replace(/^Eerder in GDE\.\s*/, ''));
    return lines.slice(0, 3).join(' ');
  }
  return 'Iemand heeft de Gouden Eierbal gejat. Tammo en Tessa hebben geen cent, wel een droom met een luik, en heel Grunn kijkt mee.';
}

function ensureCss() {
  if (css) return;
  css = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./loadscreen.css', import.meta.url).href;
  document.head.appendChild(link);
}

// opts: { kind: 'save' | 'travel' | 'snel', x, y, name, instant, from, mission }
// mission (a key of MISSION_PICTURE) picks that mission's own picture.
// snel is the small hop (fast travel nearby): only the place and the bar.
// Returns { done: Promise, el }. One at a time.
export function startLoadScreen(world, opts = {}) {
  if (active) return active;
  ensureCss();
  const p = world.player;
  const x = Number.isFinite(opts.x) ? opts.x : p.x, y = Number.isFinite(opts.y) ? opts.y : p.y;
  const kind = ['save', 'travel', 'snel'].includes(opts.kind) ? opts.kind : 'travel';
  let place = { name: opts.name || '', country: false, district: '' };
  try { place = { ...place, ...placeLabel(world, x, y) }; } catch (e) { /* the label is a nicety */ }
  const view = (() => { try { return getStoryView(); } catch (e) { return null; } })();
  const date = hudDate(world);
  const img = pickImage(world, place, opts.mission);
  const line = place.line || LANDMARK_LINES[place.name] || '';
  // one short line at a time: where you are going or the story so far, then tips
  const firstSentence = (t) => (t.match(/^.*?[.!?](\s|$)/) || [t])[0].trim();
  const lead = kind === 'save' ? ['Eerder in het verhaal', firstSentence(recapText(view))] : ['Onderweg', line];
  const picked = kind === 'snel' ? [] : pickTips(tips, 3, Math.random, lastTip);
  if (picked.length) lastTip = picked[picked.length - 1];
  const pool = buildLines(kind, lead, picked);

  const el = document.createElement('div');
  el.id = 'load-screen';
  el.className = 'ls ls-' + kind + ' instant';
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-label', 'Laden');
  el.innerHTML =
    pictureHtml(img) +
    '<div class="ls-shade"></div><div class="ls-foot-shade"></div>' +
    '<div class="ls-stage">' +
      '<div class="ls-brand"><div class="gde-logo" aria-hidden="true"><span class="gde-mark">GDE</span><span class="gde-sign">Groningen</span><span class="gde-sub">Zomer vol misdaad</span></div></div>' +
      '<div class="ls-card">' +
        `<span class="ls-kick">${kind === 'save' ? 'Verder in' : 'Naar'}</span>` +
        `<b class="ls-place">${esc(place.name || 'Grunn')}</b>` +
        (date.special ? `<div class="ls-when"><span class="ls-badge">${esc(date.special)}</span></div>` : '') +
      '</div>' +
      '<div class="ls-bottom">' +
        '<div class="ls-tip"><span class="ls-tip-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg></span><div><span></span><p></p></div></div>' +
        '<div class="ls-prog"><div class="ls-bar"><i></i></div></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);
  // the boot screen may still be fading underneath: one bar at a time
  const boot = document.getElementById('loading');
  if (boot) boot.classList.add('ls-over');
  requestAnimationFrame(() => el.classList.add('on'));

  const wasPaused = !!world.uiPaused;
  world.uiPaused = true;
  const fill = el.querySelector('.ls-bar i');
  const lineKick = el.querySelector('.ls-tip div span');
  const lineText = el.querySelector('.ls-tip p');
  const tipBox = el.querySelector('.ls-tip');
  let lineI = -1, lineAt = -1e9;
  const lineS = LINE_S[kind];
  const nextLine = (now) => {
    if (!pool.length) { tipBox.hidden = true; lineAt = Infinity; return; }
    lineI = (lineI + 1) % pool.length;
    lineAt = now;
    lineKick.textContent = pool[lineI][0];
    lineText.textContent = pool[lineI][1];
    tipBox.classList.remove('swap');
    void tipBox.offsetWidth;
    tipBox.classList.add('swap');
  };
  const t0 = performance.now();
  let prog = startProgress();
  let res;
  const done = new Promise((r) => { res = r; });
  const finish = () => {
    world.uiPaused = wasPaused;
    el.classList.remove('on');
    el.classList.add('out');
    setTimeout(() => { el.remove(); }, kind === 'snel' ? 450 : 700);
    active = null;
    res();
  };
  const step = () => {
    if (!el.isConnected) return;
    const now = performance.now();
    const st = streamPending();
    prog = stepProgress(prog, st.buildings + st.roads, (now - t0) / 1000, kind);
    fill.style.transform = `scaleX(${prog.bar.toFixed(3)})`;
    el.setAttribute('aria-valuenow', String(Math.round(prog.bar * 100)));
    if (now - lineAt >= lineS * 1000) nextLine(now);
    if (prog.done) { finish(); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  active = { done, el };
  return active;
}


// A jump of the player (fast travel, teleport) far from where he was: show
// the screen while the city streams in. main.js calls this every frame.
let lastX = null, lastY = 0;
export function watchJumps(world, { swallow = false, hold = false } = {}) {
  const p = world.player;
  // hold: a menu or the map is open, the jump is looked at once it closes
  if (hold && lastX != null) return;
  const moved = lastX == null ? 0 : Math.hypot(p.x - lastX, p.y - lastY);
  lastX = p.x; lastY = p.y;
  if (swallow || active || moved < JUMP_M) return;
  startLoadScreen(world, { kind: loadKind(moved), x: p.x, y: p.y, mission: world.loadMission });
}
export function resetJumpWatch() { lastX = null; }
