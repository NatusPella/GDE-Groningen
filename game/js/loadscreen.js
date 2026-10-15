// The load screen (the approved "Laadscherm"): a slow Ken Burns picture of the
// place you are going to, the logo, "Eerder in het verhaal", a "Je gaat verder
// in" card, a tip and a real progress bar with the phase of the work. It
// covers loading a save, fast travel and long jumps (teleport, a long
// respawn); the work it waits for is the city streaming in round the player
// (scene3d.js streamPending). The picture is one of the game's own renders
// (img/laad/), chosen by where you are going.
import { getStoryView } from './story.js';
import { PARTS } from './storyarc.js';
import { getAchievementSummary } from './achievements.js';
import { hudDate } from './hudcalendar.js';
import { streamPending } from './scene3d.js';
import { placeLabel } from './hud_panel.js';
import { LANDMARK_LINES } from './placelines.js';
import { getSettings } from './settings.js';

const IMAGES = { vismarkt: 'Vismarkt in Groningen, overdag', luchtfoto: 'Luchtfoto van de binnenstad', rondvaart: 'Een rondvaartboot op de gracht', kermis: 'De kermis bij avond', ringrace: 'De ringweg', achtervolging: 'Een straat bij nacht', duif: 'Grunn van boven' };
const CITY_IMAGES = ['vismarkt', 'luchtfoto', 'rondvaart', 'duif'];
let tips = [];
export const setLoadTips = (list) => { tips = list.filter((t) => !/^Tip: (Esc|V |M )/.test(t) || true); };

const MIN_SAVE_S = 2.2;
const MIN_TRAVEL_S = 1.4;
const MAX_S = 12;
export const JUMP_M = 700;

let css = false;
let active = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

// The picture for a place: the open road in the country, the fair at night,
// the harbours by the water, otherwise one of the city views by name.
export function pickImage(world, place) {
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

function storyPct(view) {
  if (!view || !view.total) return 0;
  return Math.max(0, Math.min(100, Math.round((view.done / view.total) * 100)));
}

function ensureCss() {
  if (css) return;
  css = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./loadscreen.css', import.meta.url).href;
  document.head.appendChild(link);
}

// opts: { kind: 'save' | 'travel', x, y, name, instant }
// Returns { done: Promise, el }. One at a time.
export function startLoadScreen(world, opts = {}) {
  if (active) return active;
  ensureCss();
  const kind = opts.kind === 'save' ? 'save' : 'travel';
  const p = world.player;
  const x = Number.isFinite(opts.x) ? opts.x : p.x, y = Number.isFinite(opts.y) ? opts.y : p.y;
  let place = { name: opts.name || '', country: false, district: '' };
  try { place = { ...place, ...placeLabel(world, x, y) }; } catch (e) { /* the label is a nicety */ }
  const view = (() => { try { return getStoryView(); } catch (e) { return null; } })();
  const date = hudDate(world);
  const ach = (() => { try { return getAchievementSummary(); } catch (e) { return { done: 0, total: 0 }; } })();
  const img = pickImage(world, place);
  const line = place.line || LANDMARK_LINES[place.name] || '';
  const tip = tips.length ? tips[Math.floor(Math.random() * tips.length)] : '';

  const el = document.createElement('div');
  el.id = 'load-screen';
  el.className = 'ls' + (opts.instant || kind === 'save' ? ' instant' : '');
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-label', 'Laden');
  const time = world.dayNight ? `${String(Math.floor(((world.dayNight.hour % 24) + 24) % 24)).padStart(2, '0')}:${String(Math.floor((((world.dayNight.hour % 24) + 24) % 24) % 1 * 60)).padStart(2, '0')}` : '';
  el.innerHTML =
    `<img class="ls-bg" src="img/laad/${img}.jpg" alt="${esc(IMAGES[img])}" decoding="async">` +
    '<div class="ls-shade"></div><div class="ls-foot-shade"></div>' +
    '<div class="ls-stage">' +
      '<div class="ls-brand"><div class="gde-logo" aria-hidden="true"><span class="gde-mark">GDE</span><span class="gde-sign">Groningen</span><span class="gde-sub">Zomer vol misdaad</span></div></div>' +
      `<div class="ls-recap"><span>${kind === 'save' ? 'Eerder in het verhaal' : 'Onderweg'}</span><p>${esc(kind === 'save' ? recapText(view) : (line || 'Even geduld, de stad bouwt zich op.'))}</p></div>` +
      '<div class="ls-card">' +
        `<span class="ls-kick">${kind === 'save' ? 'Je gaat verder in' : 'Je gaat naar'}</span>` +
        `<b class="ls-place">${esc(place.name || 'Grunn')}</b>` +
        `<div class="ls-when"><span>${esc([date.short, time].filter(Boolean).join(' · '))}</span>${date.special ? `<span class="ls-badge">${esc(date.special)}</span>` : ''}</div>` +
        '<i class="ls-rule"></i>' +
        '<div class="ls-stats">' +
          `<div><b class="g">${storyPct(view)}%</b><span>Verhaal</span></div>` +
          `<div><b>€ ${Math.max(0, Math.floor(world.money || 0)).toLocaleString('nl-NL')}</b><span>Op zak</span></div>` +
          `<div><b>${ach.done}/${ach.total}</b><span>Prestaties</span></div>` +
        '</div>' +
      '</div>' +
      '<div class="ls-bottom">' +
        `<div class="ls-tip"><span class="ls-tip-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg></span><div><span>Wist je dat</span><p>${esc(tip.replace(/^Tip: /, ''))}</p></div></div>` +
        '<div class="ls-prog"><div class="ls-phase"><svg class="ls-spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/></svg><b>De stad wordt opgebouwd</b><small></small></div>' +
        '<div class="ls-bar"><i></i></div></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));

  const wasPaused = !!world.uiPaused;
  world.uiPaused = true;
  const fill = el.querySelector('.ls-bar i');
  const phaseB = el.querySelector('.ls-phase b');
  const phaseS = el.querySelector('.ls-phase small');
  const t0 = performance.now();
  const min = (kind === 'save' ? MIN_SAVE_S : MIN_TRAVEL_S) * 1000;
  let total = 0, shown = 0, calm = 0, frames = 0;
  let res;
  const done = new Promise((r) => { res = r; });
  const finish = () => {
    world.uiPaused = wasPaused;
    el.classList.remove('on');
    el.classList.add('out');
    setTimeout(() => { el.remove(); }, 700);
    active = null;
    res();
  };
  const step = () => {
    if (!el.isConnected) return;
    const now = performance.now();
    const st = streamPending();
    const pending = st.buildings + st.roads;
    frames++;
    // the first frames have not looked at the new place yet
    if (frames > 3) total = Math.max(total, pending);
    const k = frames <= 3 ? 0 : total ? 1 - pending / total : 1;
    shown = Math.max(shown, Math.min(1, k));
    const timeK = Math.min(1, (now - t0) / min);
    const bar = Math.min(shown, 0.04 + timeK * 0.96);
    fill.style.transform = `scaleX(${bar.toFixed(3)})`;
    el.setAttribute('aria-valuenow', String(Math.round(bar * 100)));
    const roads = st.buildings === 0 && st.roads > 0;
    const text = frames <= 3 || pending > 0 ? (roads ? 'De straten worden uitgerold' : 'De stad wordt opgebouwd') : 'Het licht gaat aan';
    if (phaseB.textContent !== text) phaseB.textContent = text;
    const small = pending > 0 && total ? `${total - pending} / ${total} gebouwen en wegen` : '';
    if (phaseS.textContent !== small) phaseS.textContent = small;
    calm = frames > 3 && pending === 0 ? calm + 1 : 0;
    if ((now - t0 >= min && calm >= 12) || now - t0 > MAX_S * 1000) { fill.style.transform = 'scaleX(1)'; finish(); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  active = { done, el };
  return active;
}

export const loadScreenActive = () => !!active;

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
  startLoadScreen(world, { kind: 'travel', x: p.x, y: p.y });
}
export function resetJumpWatch() { lastX = null; }
