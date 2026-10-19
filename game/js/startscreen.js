import { FLAGS } from './devflags.js';
import { hasSave, readSave, applySave, startNewSlot, getSaveSummary, ensureActiveSlot } from './savegame.js';
import { openSaveSlots, isSaveSlotsOpen } from './saveslotsui.js';
import { VERSION } from './version.js';
import { checkWhatsNew, markVersionSeen, compareVersions } from './whatsnew.js';
import { pointInPolygon } from './util.js';
import { openPauseMenu } from './pausemenu.js';
import { isPauseMenuOpen } from './pausestate.js';
import { getAchievementSummary } from './achievements.js';
import { pendingTrailer } from './trailerstate.js';
// trailer.js (2500 lines) is only loaded when a trailer or benchmark really runs
import { startTheme, stopTheme } from './theme.js';
import { COW_LOADING } from './flavourlines.js';
import { MENU_FRAME_S, getRenderer } from './scene3d.js';
import { isAdvisorSampling, startGfxAdvisor } from './gfxprofile.js';
import { ABOUT_HTML } from './credits.js';
import { startLoadScreen, setLoadTips } from './loadscreen.js';

export const TIPS = [
  'Tip: in Grunn neemt een fietser altijd voorrang, of hij die nou heeft of niet.',
  'Tip: de Martinitoren heet hier gewoon d’Olle Grieze.',
  'Tip: een eierbal eet je warm. Koud is een misdaad, ook in Grunn.',
  'Tip: “Moi” is goeiemorgen, goeiemiddag én goeienavond.',
  'Tip: fatbikes stoppen voor niemand. Echt niemand.',
  'Tip: Esc klapt je telefoon open. Berend Bos heeft altijd wel een klusje.',
  'Tip: regen in Grunn is geen weer, het is een levenshouding.',
  'Tip: V wisselt tijdens het rijden tussen filmcamera’s.',
  'Tip: M opent de kaart. Klik om een bestemming te zetten.',
  'Tip: zie je een duivenbord in de stad? Druk E en word zelf een duif. Poepen mag, ook op de Martinitoren.',
];
// the commentary cows chime in between the tips
COW_LOADING.forEach((t, i) => TIPS.splice(i * 3 + 1, 0, t));
setLoadTips(TIPS);
const TIP_MS = 3800;

let tipTimer = 0;
let fakeTimer = 0;
let progress = 0;
let shown = 0;

function el(id) {
  return document.getElementById(id);
}

function showVersion() {
  const v = document.querySelector('#start-screen .ss-ver');
  if (v && VERSION && VERSION !== 'dev') v.textContent = 'v' + VERSION;
  const b = document.querySelector('#loading .bt-ver');
  if (b) b.textContent = (VERSION && VERSION !== 'dev' ? 'v' + VERSION : 'dev') + ' · NatusPella';
}

// What the boot screen says while the game loads, in Gronings; the phase of
// the actual work decides the first words, the rest rotate.
const BOOT_LINES = [
  'Grunn wordt wakker',
  'De Martini wordt opgepoetst',
  'Eierballen in het vet',
  'Lichten aan, bruggen dicht',
  'De fietsen worden in het gelid gezet',
  'Het Reitdiep wordt even gespoeld',
  'Een bakkie kovvie voor de politie',
];

export function initLoading() {
  showVersion();
  // the fonts load now, so the logo never swaps typefaces mid-animation
  try { if (document.fonts && document.fonts.load) { document.fonts.load('40px "Bebas Neue"'); document.fonts.load('900 40px "Big Shoulders Display"'); } } catch (e) { /* ignore */ }
  const status = document.querySelector('#loading .ld-status');
  if (status) {
    let i = 0;
    const pace = reducedMotion() ? 0 : 250;
    tipTimer = setInterval(() => {
      i = (i + 1) % BOOT_LINES.length;
      status.classList.add('swap');
      setTimeout(() => { status.textContent = BOOT_LINES[i]; status.classList.remove('swap'); }, pace);
    }, 2400);
  }
  fakeTimer = setInterval(() => {
    shown += (Math.max(progress, Math.min(0.92, shown + 0.02)) - shown) * 0.25;
    paint();
  }, 80);
}

function reducedMotion() {
  return document.documentElement.classList.contains('reduce-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function paint() {
  const fill = document.querySelector('#loading .ld-fill');
  if (fill) fill.style.transform = `scaleX(${Math.min(1, shown).toFixed(3)})`;
  const bar = document.querySelector('#loading .ld-bar');
  if (bar) bar.setAttribute('aria-valuenow', String(Math.round(Math.min(1, shown) * 100)));
}

export function setLoadProgress(p) {
  progress = Math.max(progress, Math.min(1, p));
}

// Lets the browser paint the bar between heavy synchronous boot steps.
export function yieldToPaint() {
  return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
}

// A run that no person sits at (the story test, the smoke test, recordings,
// the benchmark) goes straight on to the menu.
const AUTO = FLAGS.noattract || FLAGS.storytest || FLAGS.stil || FLAGS.trailer || FLAGS.preview || FLAGS.benchmark || FLAGS.perf || FLAGS.spotsonly;

// Fills the bar to 100%, says "Druk op een toets" and waits for the key. The
// boot screen stays up until the menu is there (dismissLoading), so there is
// no black gap between them.
export async function finishLoading() {
  progress = 1;
  shown = 1;
  clearInterval(fakeTimer);
  clearInterval(tipTimer);
  paint();
  const l = el('loading');
  if (!l) return;
  const status = l.querySelector('.ld-status');
  if (status) status.textContent = 'Klaar, Grunn staat te wachten';
  await new Promise((r) => setTimeout(r, 380));
  if (AUTO) return;
  const key = l.querySelector('.bt-key');
  if (key) key.textContent = window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'Tik om te beginnen' : 'Druk op een toets';
  l.classList.add('ready');
  await new Promise((resolve) => {
    const go = (e) => {
      if (e.type === 'keydown' && (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.repeat)) return;
      window.removeEventListener('keydown', go, true);
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('gamepadconnected', go, true);
      clearInterval(pad);
      // this press is only "go on": the menu does not see it
      if (e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); }
      resolve();
    };
    window.addEventListener('keydown', go, true);
    window.addEventListener('pointerdown', go, true);
    const pad = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of pads) if (g && g.buttons.some((b) => b.pressed)) { go({ type: 'pad' }); return; }
    }, 200);
  });
}

// The menu (or the trailer) is up: the boot screen fades away over it.
export function dismissLoading() {
  const l = el('loading');
  if (!l || l.dataset.gone) return;
  l.dataset.gone = '1';
  l.classList.add('done');
  setTimeout(() => { l.style.display = 'none'; }, 800);
}

export function showLoadError(msg) {
  clearInterval(fakeTimer);
  clearInterval(tipTimer);
  document.querySelector('#loading .ld-status') && document.querySelector('#loading .ld-status').classList.remove('swap');
  const status = document.querySelector('#loading .ld-status');
  if (status) {
    status.textContent = 'Fout bij laden: ' + msg;
    status.classList.add('error');
  } else if (el('loading')) el('loading').textContent = 'Fout bij laden: ' + msg;
}


const SHOT_MIN_S = 12;
const SHOT_MAX_S = 16;
const FADE_S = 0.45;
const BLACK_HOLD_S = 0.3;
const LEVEL_H = 3.1;
const SHOT_CLOCKS = [9.5, 12.5, 15, 18.6, 19.3, 20.4, 22.5];
const SHOT_WEATHER = [
  { weight: 30 },
  { weight: 18, overcast: 0.75 },
  { weight: 14, mist: 0.7, overcast: 0.3 },
  { weight: 13, rain: 0.35 },
  { weight: 15, rain: 0.6 },
  { weight: 7, rain: 0.85 },
  { weight: 3, rain: 1, kind: 'storm' },
];

function pickShotWeather(base) {
  let r = Math.random() * SHOT_WEATHER.reduce((sum, k) => sum + k.weight, 0);
  let k = SHOT_WEATHER[0];
  for (const c of SHOT_WEATHER) { r -= c.weight; if (r <= 0) { k = c; break; } }
  const rain = k.rain || 0;
  return {
    ...base,
    active: rain > 0,
    kind: k.kind || (rain > 0.7 ? 'onweer' : rain > 0 ? 'regenbui' : undefined),
    peak: rain,
    intensity: rain,
    overcast: k.overcast || 0,
    mist: k.mist || 0,
    windAngle: Math.random() * Math.PI * 2,
    elapsed: 0,
    duration: Infinity,
  };
}
const EXTRA_SPOTS = [
  { name: 'Hoge der A', x: -471.57, y: 84.51, kind: 'canal' },
  { name: 'Noorderhaven', x: -351.84, y: -72.46, kind: 'canal' },
  { name: 'Reitdiepskade', x: -554.19, y: 57.67, kind: 'canal' },
  { name: 'Herestraat', x: 116.34, y: 178.6, kind: 'street' },
  { name: 'Folkingestraat', x: -62.87, y: 314.41, kind: 'street' },
  { name: 'Poelestraat', x: 349.02, y: 125.46, kind: 'street' },
  { name: 'Turfsingel', x: 371.35, y: -223.21, kind: 'canal' },
];
const BIG_KINDS = new Set(['station', 'stadium', 'mall', 'park', 'garden']);

function roofTop(map, x, y) {
  let top = 0;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, b.landmarkKind === 'tower' ? 100 : Math.max(2.4, (b.h || 3) * LEVEL_H) + 2);
  }
  return top;
}

function clearance(map, x, y, r = 6) {
  let top = roofTop(map, x, y);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    top = Math.max(top, roofTop(map, x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  return top + 5;
}

function roadDirection(map, spot) {
  let best = null, bd = Infinity;
  for (const r of map.roadsNear(spot.x, spot.y, 40)) {
    if (spot.kind !== 'canal' && r.name !== spot.name) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const d = Math.hypot((ax + bx) / 2 - spot.x, (ay + by) / 2 - spot.y);
      if (d < bd && Math.hypot(bx - ax, by - ay) > 4) { bd = d; best = Math.atan2(by - ay, bx - ax); }
    }
  }
  return best ?? Math.random() * Math.PI * 2;
}

// A slow camera move around one highlight; returns pose(t) in map coordinates.
function makeShot(map, spot) {
  const c = { x: spot.x, y: spot.y };
  const dir = Math.random() < 0.5 ? 1 : -1;
  const a0 = Math.random() * Math.PI * 2;
  const kind = spot.kind;
  if (kind === 'tower') {
    const R = 80 + Math.random() * 20, z = 48 + Math.random() * 16;
    return (t) => {
      const a = a0 + dir * t * 0.05;
      return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z + t * 0.4 }, lookAt: { x: c.x, y: c.y, z: 42 }, fov: 52 };
    };
  }
  if (kind === 'street' || kind === 'canal') {
    const h = roadDirection(map, spot);
    const fx = Math.cos(h), fy = Math.sin(h);
    const len = 44;
    let z = 13 + Math.random() * 5;
    for (let s = -0.5; s <= 0.5; s += 0.125) z = Math.max(z, clearance(map, c.x + fx * len * s, c.y + fy * len * s, 3));
    return (t) => {
      const u = t / SHOT_MAX_S - 0.5;
      const px = c.x + fx * len * u, py = c.y + fy * len * u;
      return { position: { x: px, y: py, z: z + t * 0.15 }, lookAt: { x: px + fx * 40, y: py + fy * 40, z: 2 }, fov: 58 };
    };
  }
  const big = BIG_KINDS.has(kind);
  const R = big ? 85 + Math.random() * 25 : 48 + Math.random() * 18;
  const lookZ = big ? 8 : 6;
  let z = (big ? 34 : 24) + Math.random() * 10;
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    z = Math.max(z, clearance(map, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R));
  }
  if (Math.random() < 0.35) {
    const z0 = Math.max(z - 10, clearance(map, c.x + Math.cos(a0) * R, c.y + Math.sin(a0) * R));
    return (t) => {
      const a = a0 + dir * t * 0.025;
      const k = Math.min(1, t / SHOT_MAX_S);
      return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z0 + (z + 18 - z0) * k }, lookAt: { x: c.x, y: c.y, z: lookZ }, fov: 55 };
    };
  }
  return (t) => {
    const a = a0 + dir * t * 0.045;
    return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z + Math.sin(t * 0.13) * 3 }, lookAt: { x: c.x, y: c.y, z: lookZ }, fov: 55 };
  };
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

// Just enough Markdown for CHANGELOG.md: version headings, section headings,
// bullets (with wrapped continuation lines) and paragraphs. The title, the
// intro and an empty [Unreleased] section are left out. `fresh` marks the
// versions newer than the one last played (see whatsnew.js).
function changelogHtml(md, fresh = () => false) {
  const out = [];
  let block = null; // { kind: 'p' | 'li', text }
  let inList = false;
  let started = false;
  const flush = () => {
    if (!block) return;
    if (block.kind === 'li') {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(block.text)}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${inline(block.text)}</p>`);
    }
    block = null;
  };
  const closeList = () => { flush(); if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const ver = line.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?/);
    if (ver) {
      closeList();
      started = true;
      if (ver[1].toLowerCase() === 'unreleased') { started = false; continue; }
      const date = ver[2] ? new Date(ver[2]).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const isNew = fresh(ver[1]);
      out.push(`<h3${isNew ? ' class="ss-news-new"' : ''}>Versie ${esc(ver[1])}${date ? `<small>${esc(date)}</small>` : ''}${isNew ? '<span class="ss-news-tag">Nieuw sinds je vorige keer</span>' : ''}</h3>`);
      continue;
    }
    if (!started) continue;
    const sec = line.match(/^###\s+(.+)/);
    if (sec) { closeList(); out.push(`<h4>${inline(sec[1])}</h4>`); continue; }
    const li = line.match(/^\s*[-*]\s+(.+)/);
    if (li) { flush(); block = { kind: 'li', text: li[1] }; continue; }
    if (!line.trim()) { flush(); continue; }
    if (block) block.text += ' ' + line.trim();
    else { if (inList) { out.push('</ul>'); inList = false; } block = { kind: 'p', text: line.trim() }; }
  }
  closeList();
  return out.join('');
}

// since: the version last played; null marks only the newest version
let newsSince;
let changelogCache = null;
function loadChangelog() {
  if (!changelogCache) {
    let first = null;
    const fresh = newsSince === undefined ? () => false
      : (v) => {
        if (first === null) first = v;
        return newsSince ? compareVersions(v, newsSince) > 0 : v === first;
      };
    changelogCache = fetch('./CHANGELOG.md', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((md) => changelogHtml(md, fresh))
      .catch(() => { changelogCache = null; return '<p>De lijst met wijzigingen kon niet worden geladen.</p>'; });
  }
  return changelogCache;
}

function summaryText(s) {
  const d = new Date(s.savedAt);
  const when = s.savedAt ? `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : '';
  return [`€${s.money.toLocaleString('nl-NL')}`, `${s.missionsDone} missies`, s.character, when].filter(Boolean).join(' · ');
}

// After the attract intro: the logo appears big in the middle, then glides
// and shrinks into its place before the menu fades in (CSS .ss-handoff).
function logoIn(screen) {
  const logo = screen.querySelector('.ss-logo .gde-logo');
  screen.classList.add('ss-handoff');
  setTimeout(() => screen.classList.remove('ss-handoff'), 2600);
  if (!logo || !logo.animate) return;
  const r = logo.getBoundingClientRect();
  const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
  const big = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(1.45)`;
  logo.animate([
    { transform: big, opacity: 0 },
    { transform: big, opacity: 1, offset: 0.2 },
    { transform: big, opacity: 1, offset: 0.55, easing: 'cubic-bezier(0.6, 0, 0.25, 1)' },
    { transform: 'none', opacity: 1 },
  ], { duration: 1800, fill: 'backwards' });
}

// Title screen over the live city, cycling through highlights. Resolves with
// 'game' (Doorgaan / Nieuw spel).
export function runStartScreen(world, { render, relocate, tick }) {
  return new Promise((resolve) => {
    const screen = el('start-screen');
    const menu = screen.querySelector('.ss-menu');
    ensureActiveSlot();
    const save = hasSave() ? getSaveSummary() : null;
    const items = [];
    if (save) items.push({ act: 'continue', label: 'Doorgaan', sub: summaryText(save) });
    items.push({ act: 'new', label: 'Nieuw spel', sub: save ? 'Begin opnieuw in Grunn' : 'Moi! Stap in en rij' });
    items.push({ act: 'samen', label: 'Samen spelen', sub: 'Met een vriend of vriendin, tot 4 spelers' });
    items.push({ act: 'saves', label: 'Opgeslagen spellen', sub: 'Kies, hernoem, exporteer of verwijder je savegames' });
    items.push({ act: 'news', label: 'Wat is er nieuw', sub: 'Alle versies en wijzigingen' });
    items.push({ act: 'settings', label: 'Instellingen', sub: 'Geluid, beeld en camera' });
    items.push({ act: 'about', label: 'Over', sub: 'Credits, licenties en privacy' });
    if (window.gdeDesktop && window.gdeDesktop.isDesktop) items.push({ act: 'exit', label: 'Afsluiten', sub: 'Tot de volgende keer. Hou dij goud!' });
    const pct = getAchievementSummary().pct;
    const st = save && save.story;
    const heroSub = st ? [save.name, st.part, st.ended ? 'verhaal uit' : '', pct > 0 ? `${pct}% prestaties` : ''].filter(Boolean).join(' · ') : save ? summaryText(save) : '';
    const itemHtml = (it, i) => {
      if (it.act === 'continue') {
        const prog = st && st.total ? Math.round((st.done / st.total) * 100) : null;
        return `<button type="button" role="menuitem" class="ss-item ss-hero" data-act="continue" data-i="${i}"><span class="ss-label">${it.label}</span><small>${heroSub}</small>` +
          (prog != null ? `<span class="ss-prog"><span class="m-bar"><i style="width:${prog}%"></i></span><span class="bebas">${prog}%</span></span>` : '') + '</button>';
      }
      return `<button type="button" role="menuitem" class="ss-item" data-act="${it.act}" data-i="${i}"><span class="ss-label">${it.label}</span><small>${it.sub}</small></button>`;
    };
    menu.innerHTML = items.map(itemHtml).join('');
    // where the save picks up, right of the menu
    const saveCard = screen.querySelector('.ss-save');
    if (saveCard) {
      saveCard.hidden = !save;
      if (save) {
        const title = st && st.next ? st.next : save.goal || (st ? st.part : 'Grunn');
        const d = save.savedAt ? new Date(save.savedAt) : null;
        const ago = d ? Math.round((Date.now() - d.getTime()) / 60000) : -1;
        const agoText = ago < 0 ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `opgeslagen ${ago} min geleden` : `opgeslagen ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
        saveCard.innerHTML = `<span class="m-eb">Je gaat verder als ${esc(save.character)}</span><span class="big${title.length > 22 ? ' long' : ''}">${esc(title)}</span>` +
          (save.goal && save.goal !== title ? `<span class="line">Doel: ${esc(save.goal)}</span>` : st ? `<span class="line">${esc(st.part)}${st.date ? ' · ' + esc(st.date) : ''}</span>` : '') +
          `<span class="meta">${[`€${save.money.toLocaleString('nl-NL')}`, `${save.missionsDone} missies`, agoText].filter(Boolean).join(' · ')}</span>`;
      }
    }
    const buttons = [...menu.querySelectorAll('.ss-item')];
    let sel = 0;
    let confirmNew = false;
    let done = false;
    let last = performance.now();

    const map = world.map;
    const p = world.player;
    const home = { x: p.x, y: p.y };
    const homeClock = world.clock;
    const homeWeather = world.weather;
    const move = relocate || ((x, y) => { p.x = x; p.y = y; });
    const spots = [...(map.meta.landmarks || []), ...EXTRA_SPOTS];
    let bag = [];
    let lastSpot = null;
    const nextSpot = () => {
      if (!bag.length) {
        bag = shuffle(spots);
        if (bag[0] === lastSpot && bag.length > 1) bag.push(bag.shift());
      }
      lastSpot = bag.shift();
      return lastSpot;
    };
    let shot = makeShot(map, { x: home.x, y: home.y, kind: 'spawn' });
    let shotT = 0;
    let shotDur = SHOT_MIN_S + Math.random() * (SHOT_MAX_S - SHOT_MIN_S);
    let phase = 'show';
    let phaseT = 0;
    let pose = shot(0);
    world.menuCam = true;

    const fade = document.createElement('div');
    fade.className = 'ss-fade';
    fade.style.cssText = `position:fixed;inset:0;z-index:19;background:#05080a;opacity:0;pointer-events:none;transition:opacity ${FADE_S}s ease`;
    document.body.appendChild(fade);

    const cut = () => {
      const spot = nextSpot();
      move(spot.x, spot.y);
      world.clock = SHOT_CLOCKS[Math.floor(Math.random() * SHOT_CLOCKS.length)];
      if (homeWeather) world.weather = pickShotWeather(homeWeather);
      shot = makeShot(map, spot);
      shotT = 0;
      shotDur = SHOT_MIN_S + Math.random() * (SHOT_MAX_S - SHOT_MIN_S);
    };

    const focus = (i) => {
      sel = (i + buttons.length) % buttons.length;
      if (confirmNew && items[sel].act !== 'new') setConfirm(false);
      buttons.forEach((b, j) => b.classList.toggle('sel', j === sel));
      buttons[sel].focus({ preventScroll: true });
    };
    const setConfirm = (on) => {
      confirmNew = on;
      const b = buttons[items.findIndex((it) => it.act === 'new')];
      b.classList.toggle('confirm', on);
      b.querySelector('.ss-label').textContent = on ? 'Zeker weten?' : 'Nieuw spel';
      b.querySelector('small').textContent = on ? 'Enter nog een keer: je savegame wordt gewist' : items.find((it) => it.act === 'new').sub;
    };
    const restoreWorld = () => {
      world.menuCam = false;
      world.clock = homeClock;
      world.weather = homeWeather;
      if (Math.hypot(p.x - home.x, p.y - home.y) > 1) move(home.x, home.y);
    };
    const finish = (mode) => {
      done = true;
      news.hidden = true;
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('gde-benchmark', onBenchmark);
      world._menuCamPose = Math.hypot(pose.lookAt.x - p.x, pose.lookAt.y - p.y) < 150 ? pose : null;
      world.cameraOverride = null;
      screen.classList.remove('visible');
      fade.remove();
      resolve(mode);
    };
    const startNew = () => {
      startTheme();
      restoreWorld();
      startNewSlot();
      finish('game');
    };
    const continueGame = () => {
      startTheme();
      restoreWorld();
      applySave(world, readSave());
      // the load screen covers the menu until the city round the save has streamed in
      startLoadScreen(world, { kind: 'save' });
      finish('game');
    };
    const activate = (i) => {
      const it = items[i];
      if (it.act !== 'news' && it.act !== 'about') news.hidden = true;
      if (it.act === 'continue') {
        continueGame();
      } else if (it.act === 'samen') {
        // het spel start zoals altijd (Doorgaan, of een nieuw spel zonder savegame); daarna staat de lobby klaar (main.js)
        world.openSamenOnStart = true;
        if (save) continueGame(); else startNew();
      } else if (it.act === 'saves') {
        openSaveSlots({ mode: 'start', onLoad: continueGame, onNew: () => startNew(), onClose: () => {
          // Doorgaan shows the save as it was when the menu opened: rebuild the menu when saves changed
          const now = hasSave() ? getSaveSummary() : null;
          if (!done && JSON.stringify(now && [now.slot, now.savedAt, now.name]) !== JSON.stringify(save && [save.slot, save.savedAt, save.name])) location.reload();
          else focus(sel);
        } });
      } else if (it.act === 'new') {
        if (save && !confirmNew) { setConfirm(true); return; }
        startNew();
      } else if (it.act === 'news') {
        openNews();
      } else if (it.act === 'about') {
        openAbout();
      } else if (it.act === 'settings') {
        openPauseMenu('settings', { prestart: true, onClose: () => focus(sel) });
      } else if (it.act === 'exit') {
        window.gdeDesktop.quit();
      }
    };
    const news = screen.querySelector('.ss-news');
    const newsBody = news.querySelector('.ss-news-body');
    const newsTitle = news.querySelector('h2');
    const showPanel = (title) => {
      newsTitle.textContent = title;
      news.setAttribute('aria-label', title);
      news.hidden = false;
      newsBody.scrollTop = 0;
      newsBody.focus({ preventScroll: true });
    };
    const openNews = () => {
      showPanel('Wat is er nieuw');
      loadChangelog().then((html) => { if (!news.hidden && newsTitle.textContent === 'Wat is er nieuw') newsBody.innerHTML = html; });
    };
    const openAbout = () => {
      showPanel('Over GDE');
      newsBody.innerHTML = ABOUT_HTML;
    };
    const closeNews = () => {
      news.hidden = true;
      focus(sel);
    };
    news.querySelector('.ss-news-close').addEventListener('click', closeNews);
    const onKey = (e) => {
      if (isPauseMenuOpen() || isSaveSlotsOpen() || done || trailerOn) return;
      if (e.target && e.target.closest && e.target.closest('#gfx-advice')) return;
      const k = e.key;
      if (!news.hidden) {
        const page = newsBody.clientHeight * 0.85;
        if (k === 'Escape' || k === 'Backspace' || k === 'Enter') closeNews();
        else if (k === 'ArrowDown' || k === 's' || k === 'S') newsBody.scrollBy({ top: 60 });
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') newsBody.scrollBy({ top: -60 });
        else if (k === 'PageDown' || k === ' ') newsBody.scrollBy({ top: page });
        else if (k === 'PageUp') newsBody.scrollBy({ top: -page });
        else return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (k === 'ArrowDown' || k === 's' || k === 'S') focus(sel + 1);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') focus(sel - 1);
      else if (k === 'Enter' || k === ' ') { if (!e.repeat) activate(sel); }
      else if (k === 'Escape' && confirmNew) setConfirm(false);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    menu.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.ss-item');
      if (b && Number(b.dataset.i) !== sel) focus(Number(b.dataset.i));
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('.ss-item');
      if (b && !done) { focus(Number(b.dataset.i)); activate(sel); }
    });
    window.addEventListener('keydown', onKey, true);

    // trailer.js: the attract intro / ?trailer before the menu, and the
    // benchmark from Instellingen; the loop below idles while it runs
    const env = { tick, render, relocate: move };
    let trailerOn = false;
    const showMenu = (fromTrailer) => {
      screen.classList.add('visible');
      if (!fromTrailer && el('loading') && !el('loading').dataset.gone && !AUTO) { screen.classList.add('ss-slide'); setTimeout(() => screen.classList.remove('ss-slide'), 1200); }
      dismissLoading();
      if (fromTrailer) logoIn(screen);
      focus(0);
    };
    const backHome = () => {
      move(home.x, home.y);
      world.clock = homeClock;
      world.weather = homeWeather;
      shot = makeShot(map, { x: home.x, y: home.y, kind: 'spawn' });
      shotT = 0;
      phase = 'show';
      pose = shot(0);
      fade.style.opacity = '0';
    };
    const benchmark = async (fromGame) => {
      if (trailerOn) return;
      trailerOn = true;
      screen.classList.remove('visible');
      news.hidden = true;
      const T = await import('./trailer.js');
      let next = 'back';
      for (;;) {
        const res = await T.runBenchmarkSuite(world, env);
        if (res.aborted) break;
        next = await T.showBenchmarkResults(res);
        if (next !== 'again') break;
      }
      await T.fadeOutTrailer(false, backHome);
      stopTheme();
      trailerOn = false;
      const cont = items.findIndex((it) => it.act === 'continue');
      // the result and its one-click preset wait in Instellingen > Beeld
      if (fromGame && cont >= 0) {
        if (next === 'settings') world.openSettingsOnStart = 'video';
        activate(cont);
        return;
      }
      showMenu(false);
      if (next === 'settings') openPauseMenu('settings', { prestart: true, sub: 'video', onClose: () => focus(sel) });
    };
    const onBenchmark = () => benchmark(false);
    window.addEventListener('gde-benchmark', onBenchmark);
    // after an update the menu opens on "Wat is er nieuw"
    const update = FLAGS.storytest ? null : checkWhatsNew(VERSION);
    if (update) { newsSince = update.since; changelogCache = null; }
    markVersionSeen(VERSION);
    const intro = pendingTrailer();
    const playIntro = async () => {
      trailerOn = true;
      dismissLoading();
      if (intro.mode === 'benchmark') { trailerOn = false; benchmark(!!intro.fromGame); return; }
      const T = await import('./trailer.js');
      const res = await T.runTrailer(world, { ...intro, env });
      if (intro.mode === 'opname' && !res.aborted && window.gdeDesktop && window.gdeDesktop.isDesktop) { window.gdeDesktop.quit(); return; }
      if (res.continuation) {
        shot = res.continuation;
        shotT = 0;
        shotDur = SHOT_MAX_S;
        phase = 'show';
        pose = shot(0);
        trailerOn = false;
        showMenu(true);
        await T.fadeOutTrailer(true);
      } else {
        await T.fadeOutTrailer(false, backHome);
        trailerOn = false;
        showMenu(true);
      }
    };
    if (intro) playIntro();
    else {
      showMenu(false);
      startGfxAdvisor(getRenderer().getContext());
      if (update) {
        const n = items.findIndex((it) => it.act === 'news');
        focus(n);
        openNews();
      }
    }

    let renderDt = 0;
    const loop = (now) => {
      if (done) return;
      if (trailerOn) { last = now; requestAnimationFrame(loop); return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      renderDt += dt;
      shotT += dt;
      phaseT += dt;
      if (phase === 'show' && shotT > shotDur) { phase = 'out'; phaseT = 0; fade.style.opacity = '1'; }
      else if (phase === 'out' && phaseT > FADE_S) { cut(); phase = 'black'; phaseT = 0; }
      else if (phase === 'black' && phaseT > BLACK_HOLD_S) { phase = 'show'; phaseT = 0; fade.style.opacity = '0'; }
      pose = shot(shotT);
      world.cameraOverride = { ...pose, cut: true };
      // the menu covers part of the city, the settings sheet most of it; the
      // first-run check measures at full rate
      const every = isAdvisorSampling() ? 0 : MENU_FRAME_S[isPauseMenuOpen() ? 2 : 1];
      if (renderDt >= every) {
        const step = Math.min(0.1, renderDt);
        renderDt = 0;
        if (tick) { try { tick(step); } catch (err) { console.error(err); } }
        try { render(step); } catch (err) { console.error(err); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
