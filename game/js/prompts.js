import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getCamera } from './scene3d.js';
import { getGaragesForRender, garagePrompt } from './garages.js';
import { getHorecaForRender, nearestHorecaSpot, horecaState } from './horeca.js';
import { shopPrimaryPrompt, shopSecondaryPrompts } from './shops.js';
import { vehicleDisplayLabel } from './vehiclenames.js';
import { findEnterableVehicle, distToVehicleBody } from './vehicle.js';
import { findRideableProp } from './rideprops.js';
import { getSettings } from './settings.js';
import { getUiScale } from './uiscale.js';
import { isPhoneOpen } from './phone.js';
import { isPauseMenuOpen } from './pausemenu.js';
import { lineOfSight } from './pedestrians.js';
import { pigeonSpotPrompt, pigeonSpotSecondary } from './pigeonspots.js';
import { sideJobPrompt, sideJobSecondary, sideJobGoal } from './sidejobs.js';
import { stationPrompt, stationSecondary } from './stationtravel.js';

const USES_KEY = 'gte-hint-uses';
const LEARN_USES = 3;
const MASTER_USES = 8;
const KISS_DIST = 1.8;
const KISS_COOLDOWN = 3;
const SECONDARY_INTERVAL = 0.15;
const MAX_SECONDARY = 3;
const MAX_ROWS = 4;

const WEAPON_NAMES = { pistol: 'Pistool', uzi: 'Uzi', shotgun: 'Hagelgeweer' };
const WEAPON_RANGE = { fists: 1.1, pistol: 26, uzi: 20, shotgun: 11 };
let root = null;
let wps = [];
let rowsEl = null;
let rowsKey = '';
let uses = {};
let usesDirty = false;
let saveTimer = 0;
let secondaryTimer = 0;
let secondary = [];
let kissUntil = 0;
let pressFlash = 0;
let prev = { inVehicle: false, mouseDown: false };
let lookAccum = 0;
let lastPrimaryKey = '';
const tmp = new THREE.Vector3();
const camDir = new THREE.Vector3();

function loadUses() {
  try {
    const raw = JSON.parse(localStorage.getItem(USES_KEY) || '{}');
    if (raw && typeof raw === 'object') uses = raw;
  } catch (e) { uses = {}; }
}

function saveUses() {
  usesDirty = false;
  try { localStorage.setItem(USES_KEY, JSON.stringify(uses)); } catch (e) { /* ignore */ }
}

function used(id, n = 1) {
  const cur = uses[id] || 0;
  if (cur >= MASTER_USES + 4) return;
  uses[id] = cur + n;
  usesDirty = true;
}

const count = (id) => uses[id] || 0;
const learning = (id) => count(id) < LEARN_USES;
const mastered = (id) => count(id) >= MASTER_USES;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const MOUSE_SVG = (btn) => '<svg class="hud-mouse" data-btn="' + btn + '" viewBox="0 0 14 20" aria-hidden="true">' +
  '<rect x="1" y="1" width="12" height="18" rx="6" class="m-body"/>' +
  '<path d="M7 1v7M1.4 8h11.2" class="m-seam"/>' +
  '<path d="M7 1.2A5.8 5.8 0 0 0 1.2 7v1H7z" class="m-l"/>' +
  '<path d="M7 1.2A5.8 5.8 0 0 1 12.8 7v1H7z" class="m-r"/>' +
  '<rect x="6" y="3" width="2" height="3.4" rx="1" class="m-w"/>' +
  '</svg>';

const KEY_LABELS = { ' ': 'SPATIE', SPACE: 'SPATIE', SHIFT: 'SHIFT', CTRL: 'CTRL', ESC: 'ESC' };

// Glyph for one control token: a keycap, the WASD cluster, or a mouse icon.
export function glyphHtml(token, opts = {}) {
  let inner;
  if (token === 'WASD') {
    inner = '<span class="hud-wasd"><span class="hud-key">W</span><span class="hud-key">A</span><span class="hud-key">S</span><span class="hud-key">D</span></span>';
  } else if (token === 'LMB' || token === 'RMB' || token === 'MOUSE' || token === 'WHEEL') {
    inner = MOUSE_SVG({ LMB: 'l', RMB: 'r', MOUSE: 'move', WHEEL: 'w' }[token]);
  } else {
    inner = '<span class="hud-key">' + esc(KEY_LABELS[token] || token) + '</span>';
  }
  if (!opts.ring) return inner;
  return '<span class="hud-hold">' + inner +
    '<svg class="hud-hold-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="r-bg"/><circle cx="20" cy="20" r="17" class="r-fg" pathLength="100"/></svg></span>';
}

// Hold-to-interact / cooldown ring around a glyph; p in 0..1.
export function setHoldProgress(el, p) {
  const ring = el && el.querySelector('.r-fg');
  if (!ring) return;
  const v = Math.max(0, Math.min(1, p));
  ring.style.strokeDashoffset = String(100 - v * 100);
  el.querySelector('.hud-hold').classList.toggle('holding', v > 0 && v < 1);
}

export function initPrompts(hudRoot) {
  loadUses();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./prompts.css', import.meta.url).href;
  document.head.appendChild(link);

  root = document.createElement('div');
  root.className = 'hud-prompts';
  for (let i = 0; i < 1 + MAX_SECONDARY; i++) {
    const el = document.createElement('div');
    el.className = 'wp' + (i === 0 ? ' wp-primary' : ' wp-secondary');
    el.innerHTML = '<i class="wp-dot"></i><i class="wp-line"></i><div class="wp-chip"></div>';
    root.appendChild(el);
    wps.push({ el, chip: el.querySelector('.wp-chip'), key: '', shown: false });
  }
  hudRoot.appendChild(root);

  rowsEl = document.createElement('div');
  rowsEl.className = 'hud-ctx';
  rowsEl.setAttribute('aria-live', 'polite');
  hudRoot.appendChild(rowsEl);

  window.addEventListener('pagehide', () => { if (usesDirty) saveUses(); });
}

function hiddenNow(world) {
  if (!getSettings().showHints) return true;
  const b = document.body.classList;
  if (!b.contains('game-started') || b.contains('cine-hide-hud') || b.contains('pigeon-mode')) return true;
  if (world.pigeonMode) return true;
  if (world.cameraOverride || world.uiPaused || world.paused || world.menuCam) return true;
  if (isPhoneOpen() || isPauseMenuOpen()) return true;
  const cine = document.getElementById('cine');
  return !!(cine && cine.classList.contains('active'));
}

export function updatePrompts(dt, world) {
  if (!root) return;
  trackUsage(dt, world);
  saveTimer -= dt;
  if (usesDirty && saveTimer <= 0) { saveTimer = 2; saveUses(); }
  pressFlash = Math.max(0, pressFlash - dt);

  const hidden = hiddenNow(world);
  root.classList.toggle('off', hidden);
  rowsEl.classList.toggle('off', hidden);
  if (hidden) return;

  const primary = findPrimary(world);
  secondaryTimer -= dt;
  if (secondaryTimer <= 0) {
    secondaryTimer = SECONDARY_INTERVAL;
    secondary = findSecondary(world, primary);
  }
  renderWorldPrompts(world, primary);
  renderRows(world, primary);
}

// --- usage tracking (drives the tutorial level of every hint) ---------------

function trackUsage(dt, world) {
  const input = world.input;
  if (!input || !document.body.classList.contains('game-started')) return;
  const inV = !!world.player.inVehicle;
  const pressed = (k) => input.wasPressed(k);

  if (pressed('m')) used('map');
  if (pressed('t')) used('phone');
  if (world.paused || world.uiPaused) { prev.mouseDown = input.mouse.down; return; }

  if (world.pigeonMode) { prev.mouseDown = input.mouse.down; return; }

  if (inV && !prev.inVehicle) used('enter');
  if (!inV && prev.inVehicle) used('exit');
  prev.inVehicle = inV;
  const swim = !!world.player.swimming;
  if (swim) used('swim', 0.02);
  if (prev.swimming && !swim && world.player.water !== 'fall') used('climb');
  prev.swimming = swim;

  if (pressed('e') || pressed('f')) pressFlash = 0.22;
  if (pressed('c')) used('switch');
  if (pressed('v')) used('cinecam');
  for (let i = 1; i <= 4; i++) if (pressed(String(i))) used('weapon');
  if (input.mouse.down && !prev.mouseDown) used(world.weapon === 'fists' ? 'punch' : 'shoot');
  prev.mouseDown = input.mouse.down;

  if (inV) {
    if (pressed('w') || pressed('s') || pressed('arrowup') || pressed('arrowdown')) used('drive');
    if (pressed(' ')) used('handbrake');
    if (pressed('h')) used('horn');
    if (pressed('q') || input.mouse.middleDown) used('lookback');
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(pressed)) used('move');
  lookAccum += Math.abs(input.mouse.dx || 0);
  if (lookAccum > 500) { lookAccum = 0; used('look'); }
  if (pressed('shift') && world.player.moving) used('sprint');
  if (pressed(' ')) used('jump');
  if (pressed('control')) used('crouch');
}

// --- world-anchored prompts -------------------------------------------------

function vehicleVerb(v) {
  const moving = Math.abs(v.speed || 0) > 0.3;
  const occupied = v.isBoat ? moving : !v.isHeroCar && !!v.road;
  // your own ride (hero car, bought, rented, job vehicle) is never theft
  if (v.isHeroCar || v.playerOwned || v.missionCar) return { label: v.isBoat ? 'Aan boord' : v.isBike || v.isScooter ? 'Opstappen' : 'Instappen' };
  if (v.isPolice) return { label: 'Jatten', steal: true };
  if (v.parked) return { label: v.isBus ? 'Bus jatten' : 'Auto jatten', steal: true };
  if (v.isBoat) return occupied ? { label: 'Kapen', steal: true } : { label: 'Aan boord' };
  if (v.isBike) return occupied ? { label: 'Fiets jatten', steal: true } : { label: 'Opstappen' };
  if (v.isScooter) return occupied ? { label: 'Jatten', steal: true } : { label: 'Opstappen' };
  if (v.isBus) return occupied ? { label: 'Bus kapen', steal: true } : { label: 'Instappen' };
  return occupied ? { label: 'Jatten', steal: true } : { label: 'Instappen' };
}

function vehicleName(v) {
  if (v.isHeroCar) return 'Jouw ouwe Fjord Escapade';
  if (v.playerOwned) return 'Jouw ' + vehicleDisplayLabel(v);
  return vehicleDisplayLabel(v);
}

function doorAnchor(v, p) {
  if (v.isBike || v.isScooter) return { x: v.x, y: v.y, h: 1.25 };
  const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  const side = (p.x - v.x) * nx + (p.y - v.y) * ny >= 0 ? 1 : -1;
  const fwd = v.halfLen * 0.18;
  return {
    x: v.x + nx * side * v.halfWid + Math.cos(v.angle) * fwd,
    y: v.y + ny * side * v.halfWid + Math.sin(v.angle) * fwd,
    h: v.isBus ? 1.7 : v.isBoat ? 1.0 : 1.2,
  };
}


function facing(world) {
  const cam = getCamera();
  if (cam) {
    cam.getWorldDirection(camDir);
    const l = Math.hypot(camDir.x, camDir.z) || 1;
    return { fx: camDir.x / l, fy: camDir.z / l };
  }
  return { fx: Math.cos(world.player.angle), fy: Math.sin(world.player.angle) };
}

function angleOff(p, x, y) {
  const a = Math.atan2(y - p.y, x - p.x) - p.angle;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

function pedInReach(world, range, cone) {
  const p = world.player;
  let best = null, bestD = range;
  for (const ped of world.pedestrians || []) {
    if (ped.state === 'dead') continue;
    const dx = ped.x - p.x, dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > bestD || d < 0.01) continue;
    if (angleOff(p, ped.x, ped.y) > cone) continue;
    bestD = d; best = ped;
  }
  return best;
}

// Mirrors the order player.js resolves an E press in (kissing is K now): the
// nearest vehicle; clicks come next.
function findPrimary(world) {
  const p = world.player;
  const job = sideJobPrompt(world);
  if (job) return job;
  const gar = garagePrompt(world);
  if (gar) return gar;
  const shop = shopPrimaryPrompt(world);
  if (shop) return shop;
  if (p.inVehicle) return null;
  if (p.swimming) {
    if (!p.canClimbOut) return null;
    return { id: 'climb', x: p.x, y: p.y, h: 0.6, key: 'E', label: 'Eruit klimmen', sub: learning('climb') ? 'Klim de kade weer op' : '', learn: learning('climb'), ring: true };
  }
  const duif = pigeonSpotPrompt(world);
  if (duif) return duif;
  const trein = stationPrompt(world);
  if (trein) return trein;
  const food = nearestHorecaSpot(world);
  if (food) {
    const st = horecaState(world, food);
    const name = food.name || 'Kroeg';
    if (st === 'ready') return { id: 'food-' + name, x: food.x, y: food.y, h: 2.75, key: 'E', label: 'Iets bestellen', sub: `${name}: hapje + drankje, +15 gezondheid`, ring: true };
    return { id: 'food-' + name, x: food.x, y: food.y, h: 2.75, key: 'E', label: 'Iets bestellen', sub: st === 'broke' ? 'Te weinig geld (min. €12)' : 'Even laten zakken...', ring: true, dim: true };
  }
  const c = world.companion;
  const kissable = c && c.state !== 'dead' && !c.inVehicle && Math.hypot(c.x - p.x, c.y - p.y) <= KISS_DIST;
  const kissReady = world.time >= kissUntil;
  if (kissable && kissReady && world.input && world.input.wasPressed('k')) {
    kissUntil = world.time + KISS_COOLDOWN;
    used('kiss');
  }
  const facingC = kissable && angleOff(p, c.x, c.y) < (learning('kiss') ? 1.4 : 0.8);
  const v = findEnterableVehicle(p.x, p.y, world.vehicles);
  const pr = findRideableProp(p.x, p.y);
  if (pr && (!v || pr.dist < distToVehicleBody(v, p.x, p.y))) {
    const scooter = pr.prop.kind === 'scooter';
    const label = scooter ? 'Scooter jatten' : 'Fiets jatten';
    const sub = pr.prop.locked ? 'Op slot: even het slot kraken' : scooter ? 'Staat gewoon los geparkeerd' : 'Staat niet eens op slot';
    return { id: 'prop-' + pr.prop.key, x: pr.prop.x, y: pr.prop.y, h: 1.25, key: 'E', label, sub, ring: true, steal: true };
  }
  if (v) {
    const verb = vehicleVerb(v);
    const a = doorAnchor(v, p);
    const learn = learning('enter');
    let sub = vehicleName(v);
    if (learn) sub = verb.steal ? 'Sleur de bestuurder eruit en rij weg' : 'Stap in en rij weg, niemand die het ziet';
    return { id: 'veh-' + v.id + verb.label, ...a, key: 'E', label: verb.label, sub, learn, ring: true, steal: !!verb.steal };
  }
  if (facingC && kissReady) {
    const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
    return { id: 'kiss-' + name, x: c.x, y: c.y, h: 1.55, key: 'K', label: 'Kusje', sub: learning('kiss') ? `Geef ${name} een smakkerd: +25 gezondheid` : name, learn: learning('kiss'), ring: true, cooldown: 0 };
  }
  if (facingC) {
    const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
    return { id: 'kiss-' + name, x: c.x, y: c.y, h: 1.55, key: 'K', label: 'Kusje', sub: 'Even bijkomen...', ring: true, cooldown: (kissUntil - world.time) / KISS_COOLDOWN, dim: true };
  }
  const weapon = world.weapon || 'fists';
  if (weapon === 'fists') {
    const ped = pedInReach(world, 1.5, Math.PI / 3);
    if (ped) return { id: 'punch-' + (ped.id ?? ''), x: ped.x, y: ped.y, h: 1.75, key: 'LMB', label: 'Slaan', sub: ped.isCop ? 'Een agent? Durf je dat?' : learning('punch') ? 'Klik om uit te delen' : '', learn: learning('punch'), danger: true };
  } else if (world.wanted > 0 && (world.ammo[weapon] || 0) > 0) {
    const ped = pedInReach(world, Math.min(18, WEAPON_RANGE[weapon] || 15), 0.12);
    if (ped) return { id: 'shoot-' + (ped.id ?? ''), x: ped.x, y: ped.y, h: 1.75, key: 'LMB', label: 'Schieten', sub: WEAPON_NAMES[weapon], danger: true };
  }
  return null;
}

function inFront(world, x, y, f) {
  const dx = x - world.player.x, dy = y - world.player.y;
  const d = Math.hypot(dx, dy) || 1;
  return { d, dot: (dx * f.fx + dy * f.fy) / d };
}

function findSecondary(world, primary) {
  const p = world.player;
  const f = facing(world);
  const out = [];
  const add = (c, maxD) => {
    const { d, dot } = inFront(world, c.x, c.y, f);
    if (d > maxD || dot < -0.1) return;
    if (d > 3 && c.kind !== 'mission' && !lineOfSight(world.map, p.x, p.y, c.x, c.y)) return;
    c.score = d * (1.6 - dot);
    out.push(c);
  };
  const inV = p.inVehicle;
  for (const g of getGaragesForRender()) {
    add({ id: 'g' + g.x + g.y, x: g.x, y: g.y, h: 4.4, label: g.name, sub: inV ? 'Rij naar binnen en druk R: repareren, spuiten, opvoeren' : 'Kom met een voertuig', kind: 'place' }, inV ? 45 : 20);
  }
  if (!inV && world.money >= 12) {
    const spots = getHorecaForRender();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (Math.abs(s.x - p.x) > 12 || Math.abs(s.y - p.y) > 12) continue;
      if (world.time - s.lastUsed < 60) continue;
      add({ id: 'h' + i, x: s.x, y: s.y, h: 1.9, label: s.name || 'Kroeg', sub: 'Loop erheen en druk E voor een hapje', kind: 'place' }, 10);
    }
  }
  for (const c of shopSecondaryPrompts(world)) add(c, 14);
  for (const c of pigeonSpotSecondary(world)) add(c, 18);
  for (const c of sideJobSecondary(world)) add(c, c.maxD || 20);
  for (const c of stationSecondary(world)) add(c, 22);
  const m = world.mission;
  if (m && (m.phase === 'idle') && m.label && !(world.sideJob && world.sideJob.active)) {
    add({ id: 'mis', x: m.marker.x, y: m.marker.y, h: 3.2, label: 'Missie: ' + m.label, sub: 'Loop of rij de marker in', kind: 'mission' }, 60);
  }
  const g = world.storyGuide;
  const onMarker = m && m.phase === 'idle' && Math.hypot(m.marker.x - g?.x, m.marker.y - g?.y) < 4;
  if (g && !onMarker && !(m && m.phase === 'active') && !(world.sideJob && world.sideJob.active)) {
    add({ id: 'story', x: g.x, y: g.y, h: 3.2, label: g.name, sub: 'Volgende stap in het verhaal', kind: 'mission' }, 80);
  }
  if (!inV && learning('enter') && !primary) {
    for (const v of world.vehicles) {
      if (v.isHeroCar && !v.wrecked && !v.driver) add({ id: 'hero' + v.id, x: v.x, y: v.y, h: 1.6, label: 'Jouw ouwe Escapade', sub: 'Loop erheen, dan E', kind: 'place' }, 40);
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, MAX_SECONDARY);
}

function project(x, y, h) {
  const cam = getCamera();
  if (!cam) return null;
  tmp.set(x, h, y).project(cam);
  if (tmp.z > 1 || tmp.z < -1) return null;
  const sx = (tmp.x + 1) * 0.5 * window.innerWidth;
  const sy = (1 - tmp.y) * 0.5 * window.innerHeight;
  if (sx < -40 || sx > window.innerWidth + 40 || sy < -40 || sy > window.innerHeight + 40) return null;
  return { sx, sy };
}

function chipHtml(c, primary) {
  const glyph = primary && c.key ? '<span class="wp-glyph">' + glyphHtml(c.key, { ring: c.ring }) + '</span>' : '<i class="wp-tick"></i>';
  return glyph + '<span class="wp-text"><b>' + esc(c.label) + '</b>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span>';
}

function placeWp(slot, c, primary, hold = null) {
  if (!c) {
    if (slot.shown) { slot.el.classList.remove('in'); slot.shown = false; }
    return;
  }
  const pos = project(c.x, c.y, c.h);
  if (!pos) {
    if (slot.shown) { slot.el.classList.remove('in'); slot.shown = false; }
    return;
  }
  const key = c.id + '|' + c.label + '|' + c.sub + '|' + (c.learn ? 1 : 0);
  if (key !== slot.key) {
    slot.key = key;
    slot.chip.innerHTML = chipHtml(c, primary);
    slot.el.dataset.kind = c.kind || (c.danger ? 'danger' : c.steal ? 'steal' : 'act');
    slot.el.classList.toggle('wp-learn', !!c.learn);
    slot.w = 0;
  }
  slot.el.classList.toggle('dim', !!c.dim);
  if (!slot.w) slot.w = slot.chip.offsetWidth + 40;
  // screen px -> px inside the zoomed #hud
  const ui = getUiScale();
  const w = slot.w * ui;
  const flip = slot.el.classList.contains('flip');
  if (!flip && pos.sx + w > window.innerWidth - 12 * ui) slot.el.classList.add('flip');
  else if (flip && pos.sx + w < window.innerWidth - 60 * ui) slot.el.classList.remove('flip');
  slot.el.style.transform = `translate3d(${(pos.sx / ui).toFixed(1)}px, ${(pos.sy / ui).toFixed(1)}px, 0)`;
  if (!slot.shown) {
    slot.shown = true;
    void slot.el.offsetWidth;
    slot.el.classList.add('in');
  }
  if (primary && c.ring) {
    const p = c.cooldown > 0 ? 1 - c.cooldown : hold != null ? hold : pressFlash > 0 ? 1 - pressFlash / 0.22 : 0;
    setHoldProgress(slot.chip, p);
  }
}

let heldPrimary = null;
let heldAt = 0;

function renderWorldPrompts(world, primary) {
  const now = performance.now();
  if (world.player.inVehicle) heldPrimary = null;
  if (primary) { heldPrimary = primary; heldAt = now; }
  else if (heldPrimary && now - heldAt < 150) primary = heldPrimary;
  const hold = typeof world.promptHold === 'number' && primary && primary.steal ? world.promptHold : null;
  const pk = primary ? primary.id : '';
  if (pk !== lastPrimaryKey) {
    lastPrimaryKey = pk;
    if (primary) { wps[0].el.classList.remove('in'); wps[0].shown = false; }
  }
  placeWp(wps[0], primary, true, hold);
  const sec = secondary.filter((s) => !primary || Math.hypot(s.x - primary.x, s.y - primary.y) > 1.5);
  for (let i = 0; i < MAX_SECONDARY; i++) placeWp(wps[i + 1], sec[i] || null, false);
}

// --- compact context stack (bottom right) -----------------------------------

function tut(id, keys, label, desc) {
  return { id, keys, label, desc, kind: 'tut' };
}

function contextRows(world, primary) {
  const p = world.player;
  const rows = [];
  const job = sideJobGoal(world);
  if (job) rows.push({ id: 'sidejob', keys: [], label: job.label, desc: job.desc, kind: 'goal' });
  if (world.wanted > 0) {
    const searching = !!(world.police && world.police.searching);
    rows.push({
      id: 'wanted', keys: [], label: 'Ontsnap aan de politie', kind: 'goal',
      desc: searching ? 'Ze zijn je kwijt: blijf uit het zicht' : p.inVehicle ? 'Of laat je bak spuiten bij Spuit & Klaar' : 'Pak een bak en smeer hem',
    });
  }

  const armed = world.weapon && world.weapon !== 'fists';
  if (p.inVehicle) {
    rows.push(tut('drive', ['WASD'], 'Gas & sturen', 'W gas, S remmen en achteruit, A/D sturen'));
    rows.push(tut('handbrake', [' '], 'Handrem', 'Spatie in een bocht = driften'));
    rows.push(tut('horn', ['H'], 'Toeter', 'Aan de kant, fietsers!'));
    rows.push(tut('cinecam', ['V'], 'Filmcamera', 'Wissel naar filmische shots'));
    rows.push(tut('lookback', ['Q'], 'Achterom kijken', 'Houd Q of de middelste muisknop vast'));
    rows.push(tut('exit', ['E'], 'Uitstappen', 'Laat de bak gewoon staan'));
    if (armed) rows.push(tut('shoot', ['LMB'], 'Schieten', 'Vuren vanuit de auto'));
  } else if (p.swimming) {
    rows.push(tut('swim', ['WASD'], 'Zwemmen', 'Zwem de kant op die je kijkt'));
    rows.push(tut('swimfast', ['SHIFT'], 'Snel zwemmen', 'Kost adem, dus niet te lang'));
    if (p.canClimbOut) rows.push(tut('climb', ['E'], 'Eruit klimmen', 'Klim de kade op'));
  } else {
    rows.push(tut('move', ['WASD'], 'Lopen', 'W vooruit, S achteruit, A/D opzij'));
    rows.push(tut('look', ['MOUSE'], 'Rondkijken', 'Muis draait de camera om je heen'));
    if (p.moving) rows.push(tut('sprint', ['SHIFT'], 'Rennen', 'Houd Shift ingedrukt'));
    rows.push(tut('jump', [' '], 'Springen', 'Over hekjes en paaltjes'));
    if (armed) {
      rows.push(tut('shoot', ['LMB'], 'Schieten', 'Je schiet waar de camera kijkt'));
      rows.push(tut('weapon', ['1-4'], 'Wapen', '1 vuisten, 2 pistool, 3 uzi, 4 hagelgeweer, of scrollen'));
    } else if (world.wanted > 0) {
      rows.push(tut('punch', ['LMB'], 'Slaan', 'Vuisten eerst, vragen later'));
    }
    rows.push(tut('crouch', ['CTRL'], 'Bukken', 'Langzaam en klein'));
  }
  rows.push(tut('map', ['M'], 'Kaart', 'Zet een bestemming'));
  rows.push(tut('phone', ['T'], 'Telefoon', 'Missies, contacten en Sikkom'));

  const out = [];
  let learnShown = false;
  for (const r of rows) {
    if (primary && primary.key === 'E' && r.keys[0] === 'E') continue;
    if (r.kind === 'tut') {
      if (mastered(r.id)) continue;
      r.learn = !learnShown && learning(r.id);
      if (r.learn) learnShown = true;
    }
    out.push(r);
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

function rowHtml(r) {
  const glyphs = r.keys.map((k) => glyphHtml(k)).join('');
  const cls = 'ctx-row' + (r.learn ? ' learn' : '') + (r.kind === 'goal' ? ' goal' : '');
  const lead = r.kind === 'goal' ? '<span class="ctx-star">★</span>' : '<span class="ctx-glyphs">' + glyphs + '</span>';
  const desc = (r.learn || r.kind === 'goal') && r.desc ? '<small>' + esc(r.desc) + '</small>' : '';
  return '<div class="' + cls + '">' + lead + '<span class="ctx-text"><b>' + esc(r.label) + '</b>' + desc + '</span></div>';
}

function renderRows(world, primary) {
  const rows = contextRows(world, primary);
  const key = rows.map((r) => r.id + (r.learn ? '!' : '') + r.label + (r.desc || '')).join('|');
  if (key === rowsKey) return;
  rowsKey = key;
  rowsEl.innerHTML = rows.map(rowHtml).join('');
  rowsEl.classList.toggle('quiet', rows.length > 0 && !rows.some((r) => r.learn || r.kind === 'goal'));
}

export function resetHintProgress() {
  uses = {};
  saveUses();
  rowsKey = '';
}
