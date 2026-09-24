import { hasSave, readSave, applySave, clearSave, getSaveSummary } from './savegame.js';
import { openPauseMenu, isPauseMenuOpen } from './pausemenu.js';

const TIPS = [
  'Tip: in Grunn fiets je altijd voorrang, of je het nou hebt of niet.',
  'Tip: de Martinitoren heet hier gewoon d’Olle Grieze.',
  'Tip: een eierbal eet je warm. Koud is een misdaad, ook in Grunn.',
  'Tip: “Moi” is goeiemorgen, goeiemiddag én goeienavond.',
  'Tip: fatbikes stoppen voor niemand. Echt niemand.',
  'Tip: T pakt je telefoon. Bommen Berend heeft altijd wel een klusje.',
  'Tip: regen in Grunn is geen weer, het is een levenshouding.',
  'Tip: V wisselt tijdens het rijden tussen filmcamera’s.',
  'Tip: M opent de kaart. Klik om een bestemming te zetten.',
];
const TIP_MS = 3800;
const ORBIT_SPEED = 0.045;
const ORBIT_R = 58;

let tipTimer = 0;
let fakeTimer = 0;
let progress = 0;
let shown = 0;

function el(id) {
  return document.getElementById(id);
}

export function initLoading() {
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

export function finishLoading() {
  progress = 1;
  shown = 1;
  paint();
  clearInterval(fakeTimer);
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

// The city streams in around the player and fog closes at ~140 m, so orbit the spawn spot.
function menuOrbitPose(world, t) {
  const p = world.player;
  let c = { x: p.x, y: p.y };
  for (const l of world.map.meta.landmarks || []) {
    if (Math.hypot(l.x - p.x, l.y - p.y) < 90) { c = { x: (l.x + p.x) / 2, y: (l.y + p.y) / 2 }; break; }
  }
  const a = 2.2 + t * ORBIT_SPEED;
  return {
    position: { x: c.x + Math.cos(a) * ORBIT_R, y: c.y + Math.sin(a) * ORBIT_R, z: 30 + Math.sin(t * 0.13) * 4 },
    lookAt: { x: c.x, y: c.y, z: 6 },
    fov: 55,
  };
}

function summaryText(s) {
  const d = new Date(s.savedAt);
  const when = s.savedAt ? `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : '';
  return [`€${s.money.toLocaleString('nl-NL')}`, `${s.missionsDone} missies`, s.character, when].filter(Boolean).join(' · ');
}

// Title screen over the live city; resolves once the player picks Doorgaan or Nieuw spel.
export function runStartScreen(world, { render }) {
  return new Promise((resolve) => {
    const screen = el('start-screen');
    const menu = screen.querySelector('.ss-menu');
    const save = hasSave() ? getSaveSummary() : null;
    const items = [];
    if (save) items.push({ act: 'continue', label: 'Doorgaan', sub: summaryText(save) });
    items.push({ act: 'new', label: 'Nieuw spel', sub: save ? 'Begin opnieuw in Grunn' : 'Moi! Stap in en rij' });
    items.push({ act: 'settings', label: 'Instellingen', sub: 'Geluid, beeld en camera' });
    menu.innerHTML = items.map((it, i) =>
      `<button type="button" role="menuitem" class="ss-item" data-i="${i}"><span class="ss-label">${it.label}</span><small>${it.sub}</small></button>`).join('');
    const buttons = [...menu.querySelectorAll('.ss-item')];
    let sel = 0;
    let confirmNew = false;
    let done = false;
    let t = 0;
    let last = performance.now();

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
    const finish = () => {
      done = true;
      window.removeEventListener('keydown', onKey, true);
      world._menuCamPose = menuOrbitPose(world, t);
      world.cameraOverride = null;
      screen.classList.remove('visible');
      resolve();
    };
    const activate = (i) => {
      const it = items[i];
      if (it.act === 'continue') {
        applySave(world, readSave());
        finish();
      } else if (it.act === 'new') {
        if (save && !confirmNew) { setConfirm(true); return; }
        clearSave();
        finish();
      } else if (it.act === 'settings') {
        openPauseMenu('settings', { prestart: true, onClose: () => focus(sel) });
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
      t += dt;
      world.cameraOverride = menuOrbitPose(world, t);
      try { render(dt); } catch (err) { console.error(err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
