import { getMissionProgress, setMissionProgress } from './missions.js';
import { spawnHeroCarNear } from './vehicle.js';
import { WEAPONS } from './combat.js';
import { isCinematicActive } from './cinematics.js';
import { getShopSave, applyShopSave } from './shops.js';
import { getAchievementSaveData, applyAchievementSaveData } from './achievements.js';

const KEY = 'gte-save-v1';
const VERSION = 1;
const AUTOSAVE_S = 60;
const MISSION_SAVE_DELAY = 4;
const TOAST_S = 2.2;

let world = null;
let autoTimer = AUTOSAVE_S;
let lastMissionsDone = 0;
let missionSaveIn = -1;
let toastEl = null;
let toastTimer = 0;

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function readSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    return d && d.v === VERSION ? d : null;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return !!readSave();
}

export function getSaveSummary() {
  const d = readSave();
  if (!d) return null;
  const done = d.missions && Array.isArray(d.missions.completed) ? d.missions.completed.length : 0;
  return { money: num(d.money, 0), missionsDone: done, savedAt: num(d.savedAt, 0), character: d.character === 'anita' ? 'Anita' : 'Tammo' };
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

function serialize(w) {
  const p = w.player;
  const ammo = {};
  for (const [k, v] of Object.entries(w.ammo || {})) ammo[k] = v === Infinity ? 'inf' : num(v, 0);
  const pos = p.inVehicle && p.inVehicle.isBoat ? null : { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  return {
    v: VERSION,
    savedAt: Date.now(),
    money: Math.max(0, Math.floor(num(w.money, 0))),
    health: clamp(num(w.health, 100), 1, 100),
    armor: clamp(num(w.armor, 0), 0, 100),
    weapon: w.weapon,
    ammo,
    stats: { ...w.stats },
    character: p.character,
    pos,
    missions: getMissionProgress(),
    visitedLandmarks: [...(w.visitedLandmarks instanceof Set ? w.visitedLandmarks : [])],
    shops: getShopSave(),
    prestaties: getAchievementSaveData(),
  };
}

export function saveGame(w = world, { toast = true } = {}) {
  if (!w) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(serialize(w)));
  } catch (e) {
    if (toast) w.addMessage('Opslaan mislukt', 2.5);
    return false;
  }
  autoTimer = AUTOSAVE_S;
  if (toast) showToast();
  return true;
}

function placeAt(w, x, y) {
  const map = w.map;
  const p = w.player;
  const spot = map.findOpenSpawn(x, y, 80) || { x, y };
  const sx = spot.x, sy = spot.y;
  if (p.inVehicle) {
    const v = p.inVehicle;
    v.driver = null;
    v.speed = 0;
    p.inVehicle = null;
  }
  p.x = sx;
  p.y = sy;
  p.vx = 0;
  p.vy = 0;
  const c = w.companion;
  if (c) {
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    const [cx, cy] = map.escapeBuilding(sx + Math.cos(p.angle + Math.PI / 2) * 0.9, sy + Math.sin(p.angle + Math.PI / 2) * 0.9);
    c.x = cx;
    c.y = cy;
    c.vx = 0;
    c.vy = 0;
    if (c.state === 'dead') { c.state = 'alive'; c.health = 100; }
  }
  const idx = w.vehicles.findIndex((v) => v.isHeroCar);
  if (idx >= 0) w.vehicles.splice(idx, 1);
  const hero = spawnHeroCarNear(map, sx, sy);
  if (hero) w.vehicles.push(hero);
}

export function applySave(w, d) {
  if (!w || !d) return false;
  try {
    w.money = Math.max(0, num(d.money, 0));
    w.health = clamp(num(d.health, 100), 1, 100);
    w.armor = clamp(num(d.armor, 0), 0, 100);
    const ammo = {};
    for (const [k, v] of Object.entries(d.ammo || {})) {
      if (!WEAPONS[k]) continue;
      ammo[k] = v === 'inf' ? Infinity : Math.max(0, num(v, 0));
    }
    w.ammo = ammo;
    w.weapon = WEAPONS[d.weapon] && (WEAPONS[d.weapon].ammo === Infinity || ammo[d.weapon] > 0) ? d.weapon : 'fists';
    for (const k of Object.keys(w.stats)) w.stats[k] = Math.max(0, num(d.stats && d.stats[k], w.stats[k]));
    if (d.character === 'tammo' || d.character === 'anita') {
      w.player.character = d.character;
      if (w.companion) w.companion.character = d.character === 'tammo' ? 'anita' : 'tammo';
    }
    if (d.pos && Number.isFinite(d.pos.x) && Number.isFinite(d.pos.y)) placeAt(w, d.pos.x, d.pos.y);
    w.wanted = 0;
    w.wantedDecayTimer = 0;
    w.pendingRespawn = null;
    setMissionProgress(w, d.missions);
    w.visitedLandmarks = new Set(Array.isArray(d.visitedLandmarks) ? d.visitedLandmarks.filter((s) => typeof s === 'string') : []);
    applyShopSave(w, d.shops);
    applyAchievementSaveData(d.prestaties);
    w.loadedFromSave = true;
    w.messages = w.messages.filter((m) => !m.text.startsWith('Je begint bij'));
    lastMissionsDone = w.stats.missionsDone;
    autoTimer = AUTOSAVE_S;
    return true;
  } catch (e) {
    console.error('Save laden mislukt', e);
    return false;
  }
}

export function loadLatestSave(w = world) {
  const d = readSave();
  if (!d || !applySave(w, d)) return false;
  w.addMessage('Laatste save geladen', 3);
  return true;
}

const DISK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 3h13l4 4v14H3V3h1zm2 2v5h10V5H6zm1 9v5h10v-5H7zm7-8h2v3h-2V6z"/></svg>';

function showToast() {
  if (!toastEl) return;
  toastEl.classList.add('visible');
  toastTimer = TOAST_S;
}

export function initSaveGame(w) {
  world = w;
  lastMissionsDone = w.stats.missionsDone;
  const hud = document.getElementById('hud');
  if (hud && !toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'hud-saved';
    toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = DISK_SVG + '<span>Opgeslagen</span>';
    hud.appendChild(toastEl);
  }
}

export function updateSaveGame(dt, w) {
  world = w;
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) toastEl.classList.remove('visible');
  if (!document.body.classList.contains('game-started') || w.paused) return;
  const busy = isCinematicActive() || w.pendingRespawn || w.health <= 0;

  if (w.stats.missionsDone > lastMissionsDone) {
    lastMissionsDone = w.stats.missionsDone;
    missionSaveIn = MISSION_SAVE_DELAY;
  }
  if (missionSaveIn >= 0) {
    missionSaveIn -= dt;
    if (missionSaveIn < 0 && !busy) saveGame(w);
    else if (missionSaveIn < 0) missionSaveIn = 0.5;
  }

  autoTimer -= dt;
  if (autoTimer <= 0) {
    if (busy) autoTimer = 3;
    else saveGame(w);
  }
}
