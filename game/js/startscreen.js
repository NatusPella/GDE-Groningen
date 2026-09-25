import { hasSave, readSave, applySave, clearSave, getSaveSummary } from './savegame.js';
import { VERSION } from './version.js';
import { pointInPolygon } from './util.js';
import { openPauseMenu, isPauseMenuOpen } from './pausemenu.js';
import { getAchievementSummary } from './achievements.js';

const TIPS = [
  'Tip: in Grunn neemt een fietser altijd voorrang, of hij die nou heeft of niet.',
  'Tip: de Martinitoren heet hier gewoon d’Olle Grieze.',
  'Tip: een eierbal eet je warm. Koud is een misdaad, ook in Grunn.',
  'Tip: “Moi” is goeiemorgen, goeiemiddag én goeienavond.',
  'Tip: fatbikes stoppen voor niemand. Echt niemand.',
  'Tip: T pakt je telefoon. Bommen Berend heeft altijd wel een klusje.',
  'Tip: regen in Grunn is geen weer, het is een levenshouding.',
  'Tip: V wisselt tijdens het rijden tussen filmcamera’s.',
  'Tip: M opent de kaart. Klik om een bestemming te zetten.',
  'Tip: in de Duif-modus mag je op alles poepen. Ook op de Martinitoren.',
];
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
}

export function initLoading() {
  showVersion();
  const tip = document.querySelector('#loading .ld-tip');
  if (tip) {
    let i = Math.floor(Math.random() * TIPS.length);
    tip.textContent = TIPS[i];
    tipTimer = setInterval(() => {
      i = (i + 1) % TIPS.length;
      tip.classList.add('swap');
      setTimeout(() => { tip.textContent = TIPS[i]; tip.classList.remove('swap'); }, 250);
    }, TIP_MS);
  }
  fakeTimer = setInterval(() => {
    shown += (Math.max(progress, Math.min(0.92, shown + 0.02)) - shown) * 0.25;
    paint();
  }, 80);
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

// Fills the bar to 100%, holds it briefly so it is seen full, then fades.
export async function finishLoading() {
  progress = 1;
  shown = 1;
  clearInterval(fakeTimer);
  paint();
  await new Promise((r) => setTimeout(r, 380));
  clearInterval(tipTimer);
  const l = el('loading');
  if (!l) return;
  l.classList.add('done');
  setTimeout(() => { l.style.display = 'none'; }, 450);
}

export function showLoadError(msg) {
  clearInterval(fakeTimer);
  clearInterval(tipTimer);
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
  { name: 'Hoge der A', x: -471, y: 76, kind: 'canal' },
  { name: 'Noorderhaven', x: -349, y: -78, kind: 'canal' },
  { name: 'Reitdiepskade', x: -553, y: 48, kind: 'canal' },
  { name: 'Herestraat', x: 114, y: 179, kind: 'street' },
  { name: 'Folkingestraat', x: -67, y: 311, kind: 'street' },
  { name: 'Poelestraat', x: 347, y: 130, kind: 'street' },
  { name: 'Turfsingel', x: 375, y: -216, kind: 'canal' },
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

function summaryText(s) {
  const d = new Date(s.savedAt);
  const when = s.savedAt ? `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : '';
  return [`€${s.money.toLocaleString('nl-NL')}`, `${s.missionsDone} missies`, s.character, when].filter(Boolean).join(' · ');
}

// Title screen over the live city, cycling through highlights. Resolves with
// 'game' (Doorgaan / Nieuw spel) or 'pigeon' (Duif-modus).
export function runStartScreen(world, { render, relocate, tick }) {
  return new Promise((resolve) => {
    const screen = el('start-screen');
    const menu = screen.querySelector('.ss-menu');
    const save = hasSave() ? getSaveSummary() : null;
    const items = [];
    if (save) items.push({ act: 'continue', label: 'Doorgaan', sub: summaryText(save) });
    items.push({ act: 'new', label: 'Nieuw spel', sub: save ? 'Begin opnieuw in Grunn' : 'Moi! Stap in en rij' });
    items.push({ act: 'pigeon', label: 'Duif-modus', sub: 'Vlieg as n duuf over Grunn. Poepen mag.' });
    items.push({ act: 'settings', label: 'Instellingen', sub: 'Geluid, beeld en camera' });
    if (window.gteDesktop && window.gteDesktop.isDesktop) items.push({ act: 'exit', label: 'Afsluiten', sub: 'Tot de volgende keer. Hou dij goud!' });
    const pct = getAchievementSummary().pct;
    const badge = (it) => it.act === 'continue' && pct > 0 ? `<span class="ss-pct" title="Prestaties behaald" style="font-size:0.5em;letter-spacing:1px;margin-left:12px;opacity:0.8;vertical-align:middle">${pct}% voltooid</span>` : '';
    menu.innerHTML = items.map((it, i) =>
      `<button type="button" role="menuitem" class="ss-item" data-i="${i}"><span class="ss-label">${it.label}${badge(it)}</span><small>${it.sub}</small></button>`).join('');
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
      b.querySelector('small').textContent = on ? 'Enter nog een keer: je save wordt gewist' : items.find((it) => it.act === 'new').sub;
    };
    const restoreWorld = () => {
      world.menuCam = false;
      world.clock = homeClock;
      world.weather = homeWeather;
      if (Math.hypot(p.x - home.x, p.y - home.y) > 1) move(home.x, home.y);
    };
    const finish = (mode) => {
      done = true;
      window.removeEventListener('keydown', onKey, true);
      world._menuCamPose = Math.hypot(pose.lookAt.x - p.x, pose.lookAt.y - p.y) < 150 ? pose : null;
      world.cameraOverride = null;
      screen.classList.remove('visible');
      fade.remove();
      resolve(mode);
    };
    const activate = (i) => {
      const it = items[i];
      if (it.act === 'continue') {
        restoreWorld();
        applySave(world, readSave());
        finish('game');
      } else if (it.act === 'new') {
        if (save && !confirmNew) { setConfirm(true); return; }
        restoreWorld();
        clearSave();
        finish('game');
      } else if (it.act === 'pigeon') {
        world.menuCam = false;
        world.clock = homeClock;
        world.weather = homeWeather;
        finish('pigeon');
      } else if (it.act === 'settings') {
        openPauseMenu('settings', { prestart: true, onClose: () => focus(sel) });
      } else if (it.act === 'exit') {
        window.gteDesktop.quit();
      }
    };
    const onKey = (e) => {
      if (isPauseMenuOpen() || done) return;
      const k = e.key;
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
      if (b && !done) activate(Number(b.dataset.i));
    });
    window.addEventListener('keydown', onKey, true);

    screen.classList.add('visible');
    focus(0);

    const loop = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      shotT += dt;
      phaseT += dt;
      if (phase === 'show' && shotT > shotDur) { phase = 'out'; phaseT = 0; fade.style.opacity = '1'; }
      else if (phase === 'out' && phaseT > FADE_S) { cut(); phase = 'black'; phaseT = 0; }
      else if (phase === 'black' && phaseT > BLACK_HOLD_S) { phase = 'show'; phaseT = 0; fade.style.opacity = '0'; }
      pose = shot(shotT);
      world.cameraOverride = { ...pose, cut: true };
      if (tick) { try { tick(dt); } catch (err) { console.error(err); } }
      try { render(dt); } catch (err) { console.error(err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
