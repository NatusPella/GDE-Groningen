import { getMissionProgress, setMissionProgress, getMissionDefs } from './missions.js';
import { spawnHeroCarNear } from './vehicle.js';
import { WEAPONS } from './combat.js';
import { isCinematicActive, skipAllCinematics } from './cinematics.js';
import { getShopSave, applyShopSave } from './shops.js';
import { getAchievementSaveData, applyAchievementSaveData, getChallengeRecord, EIERBAL_TOTAL } from './achievements.js';
import { PG_PRIZE, EIERBAL_FIND_PAY, EIERBAL_ALL_BONUS } from './economy.js';
import { getPigeonSaveData, applyPigeonSaveData } from './pigeonmode.js';
import { getSideJobSave, applySideJobSave } from './sidejobs.js';
import { getStorySave, applyStorySave } from './story.js';
import { getPostgameSave, applyPostgameSave } from './postgame.js';
import { applyHomeOnLoad, homeSaveContext } from './home.js';
import { getFurnitureSave, applyFurnitureSave } from './furniture.js';
import { abortHeliRun } from './helirun.js';
import { quitPadel } from './padel.js';
import { stopVillageMini } from './dorpsuitjes.js';
import { quitActivity } from './activities.js';
import { getGoalSave, applyGoalSave } from './goal.js';
import { migrateSave, SAVE_VERSION } from './savemigrate.js';
import { getRadioSave, applyRadioSave } from './radiostations.js';

// the key keeps its old name; the version inside the save is what counts (savemigrate.js)
const KEY = 'gte-save-v1';
const VERSION = SAVE_VERSION;
// a copy of the save as it was before its first migration, and of a save
// from a newer game before this one overwrites it
const BACKUP_KEY = 'gte-save-backup';
// Autosave follows the permanent state, not the clock: a purchase, repair,
// upgrade, finished mission, unlocked achievement or side-job payout marks
// the game dirty (markDirty, or the state check below) and it saves once
// things have been quiet for SAVE_DEBOUNCE seconds.
const SAVE_DEBOUNCE = 2.5;
const STATE_CHECK_S = 1;
const MISSION_SAVE_DELAY = 4;
const TOAST_S = 2.2;

let world = null;
let dirtyIn = -1;
let checkTimer = STATE_CHECK_S;
let lastSig = null;
let lastMissionsDone = 0;
let missionSaveIn = -1;
let toastEl = null;
let toastTimer = 0;
let restoredMoney = -1;

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MIN_RESTORE = 1500;
const START_MONEY = 250;
const JELLE_CHALLENGES = ['bruggen', 'fierljep', 'skutsje'];

// A save whose money got lost (the NaN-money bug stored null): its last good
// amount (moneyBackup) when there is one, else an estimate from what the
// progress paid out minus what was spent in shops and garages. Owned
// vehicles are not subtracted; at least MIN_RESTORE.
export function estimateLostMoney(d) {
  if (Number.isFinite(d.moneyBackup) && d.moneyBackup >= 0) return Math.floor(d.moneyBackup);
  let earned = START_MONEY;
  const defs = getMissionDefs() || [];
  const done = d.missions && Array.isArray(d.missions.completed) ? d.missions.completed : [];
  for (const i of done) earned += num(defs[i] && defs[i].reward, 0);
  const jobs = d.bijbaan && d.bijbaan.jobs;
  if (jobs && typeof jobs === 'object') for (const r of Object.values(jobs)) earned += Math.max(0, num(r && r.earned, 0));
  earned += Math.max(0, num(d.postgame && d.postgame.fjord && d.postgame.fjord.earned, 0));
  for (const id of JELLE_CHALLENGES) {
    const rec = getChallengeRecord(id);
    earned += rec ? num(PG_PRIZE[rec.medal | 0], 0) : 0;
  }
  const eggs = d.prestaties && Array.isArray(d.prestaties.eierballen) ? d.prestaties.eierballen.length : 0;
  earned += eggs * EIERBAL_FIND_PAY + (eggs >= EIERBAL_TOTAL ? EIERBAL_ALL_BONUS : 0);
  const spent = Math.max(0, num(d.stats && d.stats.spent, 0));
  return Math.max(MIN_RESTORE, Math.round((earned - spent) / 10) * 10);
}

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    const m = migrateSave(JSON.parse(raw || 'null'));
    if (!m) return null;
    if (m.from !== VERSION) backupOnce(raw, m.from);
    return m.data;
  } catch (e) {
    return null;
  }
}

function backupOnce(raw, v) {
  try {
    const prev = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    if (prev && prev.v === v) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ v, at: Date.now(), save: raw }));
  } catch (e) { /* no room: the migration still runs */ }
}

// A save written by a newer version of the game: kept aside before this
// version writes its own.
function keepNewerSave() {
  try {
    const raw = localStorage.getItem(KEY);
    const d = JSON.parse(raw || 'null');
    if (d && Number.isInteger(d.v) && d.v > VERSION) backupOnce(raw, d.v);
  } catch (e) { /* ignore */ }
}

export function hasSave() {
  return !!readSave();
}

export function getSaveSummary() {
  const d = readSave();
  if (!d) return null;
  const done = d.missions && Array.isArray(d.missions.completed) ? d.missions.completed.length : 0;
  return { money: num(d.money, 0), missionsDone: done, savedAt: num(d.savedAt, 0), character: d.character === 'anita' ? 'Tessa' : 'Tammo' };
}

export function clearSave() {
  keepNewerSave();
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
    money: Math.max(0, Math.floor(num(w.money, num(w._goodMoney, 0)))),
    moneyBackup: Math.max(0, Math.floor(num(w._goodMoney, num(w.money, 0)))),
    health: clamp(num(w.health, 100), 1, 100),
    armor: clamp(num(w.armor, 0), 0, 100),
    weapon: w.weapon,
    ammo,
    stats: { ...w.stats },
    character: p.character,
    pos,
    // 'busy' (a mission, bijbaan or challenge running): loading keeps pos;
    // otherwise the game continues at home (home.js)
    ctx: homeSaveContext(w),
    missions: getMissionProgress(),
    story: getStorySave(),
    visitedLandmarks: [...(w.visitedLandmarks instanceof Set ? w.visitedLandmarks : [])],
    shops: getShopSave(),
    prestaties: getAchievementSaveData(),
    duif: getPigeonSaveData(),
    bijbaan: getSideJobSave(),
    postgame: getPostgameSave(),
    meubels: getFurnitureSave(),
    doel: getGoalSave(),
    // the radio station you chose; an older save without it starts on G-Music
    radio: getRadioSave(),
  };
}

export function saveGame(w = world, { toast = true } = {}) {
  if (!w) return false;
  keepNewerSave();
  try {
    localStorage.setItem(KEY, JSON.stringify(serialize(w)));
  } catch (e) {
    if (toast) w.addMessage('Opslaan mislukt', 2.5);
    return false;
  }
  dirtyIn = -1;
  lastSig = stateSignature(w);
  if (toast) showToast();
  return true;
}

export function markDirty() {
  dirtyIn = SAVE_DEBOUNCE;
}

// Everything that should survive a reload, without positions and other
// values that change all the time.
function stateSignature(w) {
  try {
    const sh = getShopSave();
    const vehicles = (sh.vehicles || []).map((o) => [o.key, o.color, o.upgrades, !!o.lost]);
    return JSON.stringify([sh.outfit, sh.ownedOutfits, sh.hair, sh.heroColor, sh.heroUpgrades, vehicles,
      getMissionProgress(), getStorySave(), getAchievementSaveData(), getPigeonSaveData(), getSideJobSave(), getPostgameSave(), getFurnitureSave(), getGoalSave(),
      w.visitedLandmarks instanceof Set ? w.visitedLandmarks.size : 0, w.stats.missionsDone]);
  } catch (e) {
    return lastSig;
  }
}

// Save shortly, once no cutscene or respawn is running (after a respawn).
export function saveSoon(delay = 1.5) {
  missionSaveIn = missionSaveIn >= 0 ? Math.min(missionSaveIn, delay) : delay;
}

function placeAt(w, x, y) {
  const map = w.map;
  const p = w.player;
  const spot = map.findOpenSpawn(x, y, 80) || map.findOpenSpawn(x, y, 800) || { x, y };
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
  p.z = 0;
  p.vz = 0;
  p.gz = 0;
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
  const m = d.v !== VERSION && migrateSave(d);
  if (m) d = m.data;
  try {
    // a running scene (train trip, intro) would otherwise finish against the loaded state
    skipAllCinematics();
    if (w.pigeonMode && w.pigeonActions) w.pigeonActions.stop();
    // a heli run, padel match or minigame would keep holding the player
    abortHeliRun();
    quitPadel(w);
    stopVillageMini();
    quitActivity(w);
    const lost = !(typeof d.money === 'number' && Number.isFinite(d.money)) && ('money' in d);
    w.money = lost ? estimateLostMoney(d) : Math.max(0, num(d.money, 0));
    w._goodMoney = w.money;
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
    applyStorySave(d.story);
    w.visitedLandmarks = new Set(Array.isArray(d.visitedLandmarks) ? d.visitedLandmarks.filter((s) => typeof s === 'string') : []);
    applyShopSave(w, d.shops);
    applyAchievementSaveData(d.prestaties);
    applyPigeonSaveData(d.duif);
    applySideJobSave(w, d.bijbaan);
    applyPostgameSave(d.postgame);
    applyFurnitureSave(d.meubels);
    applyGoalSave(d.doel);
    applyRadioSave(d.radio);
    applyHomeOnLoad(w, d);
    w.loadedFromSave = true;
    w.loadCount = (w.loadCount || 0) + 1;
    w.messages = w.messages.filter((m) => !m.text.startsWith('Je begint bij'));
    restoredMoney = lost ? w.money : -1;
    if (lost) saveSoon(3);
    lastMissionsDone = w.stats.missionsDone;
    dirtyIn = -1;
    lastSig = null;
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

const DISK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5 9-10"/></svg>';

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
  if (restoredMoney >= 0) {
    w.addMessage(`We hebben je geld hersteld: €${restoredMoney.toLocaleString('nl-NL')}`, 6, { key: 'money-restored' });
    restoredMoney = -1;
  }
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

  checkTimer -= dt;
  if (checkTimer <= 0) {
    checkTimer = STATE_CHECK_S;
    const sig = stateSignature(w);
    if (lastSig === null) lastSig = sig;
    else if (sig !== lastSig) { lastSig = sig; markDirty(); }
  }
  if (dirtyIn >= 0) {
    dirtyIn -= dt;
    if (dirtyIn < 0) {
      if (busy) dirtyIn = 1;
      else saveGame(w);
    }
  }
}
