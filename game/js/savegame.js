import { getMissionProgress, setMissionProgress, getMissionDefs } from './missions.js';
import { spawnHeroCarNear } from './vehicle.js';
import { WEAPONS } from './combat.js';
import { isCinematicActive, skipAllCinematics } from './cinematics.js';
import { getShopSave, applyShopSave } from './shops.js';
import { getAchievementSaveData, applyAchievementSaveData, getChallengeRecord, EIERBAL_TOTAL, missieKlaarId } from './achievements.js';
import { PG_PRIZE, EIERBAL_FIND_PAY, EIERBAL_ALL_BONUS } from './economy.js';
import { getPigeonSaveData, applyPigeonSaveData } from './pigeonmode.js';
import { getSideJobSave, applySideJobSave } from './sidejobs.js';
import { getStorySave, applyStorySave } from './story.js';
import { getPostgameSave, applyPostgameSave } from './postgame.js';
import { applyHomeOnLoad, homeSaveContext, getHomeSave } from './home.js';
import { getFurnitureSave, applyFurnitureSave } from './furniture.js';
import { getFinanceSave, applyFinanceSave } from './finance.js';
import { abortHeliRun } from './helirun.js';
import { quitPadel } from './padel.js';
import { stopVillageMini } from './dorpsuitjes.js';
import { quitActivity } from './activities.js';
import { getGoalSave, applyGoalSave } from './goal.js';
import { getCalendarSave, applyCalendarSave } from './calendarday.js';
import { migrateSave, SAVE_VERSION, savedArc, plausiblePos } from './savemigrate.js';
import { getCheatSave, applyCheatSave } from './cheats.js';
import { closeShopMenu } from './shopui.js';
import { quitTrainDrive } from './traindrive.js';
import { statsFromSave } from './world.js';
import { getRadioSave, applyRadioSave } from './radio.js';
import { KEYS, slotKey } from './storagekeys.js';
import { applyGuestChanges, applyGuestStory, applyGuestAchievements } from './coopsave.js';
import { verhaalStatus } from './coopverhaal.js';
import { gebeurtenissenVan, maakBoekhouding } from './coopbeloning.js';
import { getRenderer, afterNextFrame } from './scene3d.js';
import { readSlot, writeSlotRaw, writeThumb, activeSlot, setActive, createSlot, deleteSlot, nameOf, pickActive } from './saveslots.js';
import { maakCheckpoint } from './coopcheckpoint.js';
import { registerSaveGame, registerSaveTimers, registerGastVerhaal, registerGastBoek } from './savehook.js';
import { STEPS, PARTS, stepDone, stepAvailable, nextStoryStep, ARC_ID } from './storyarc.js';

// Several saves (saveslots.js): slot 1 is the old single save under its old key, the version inside
// the save is what counts (savemigrate.js). All reads and writes here go to the active slot.
const VERSION = SAVE_VERSION;
// a copy of the save as it was before its first migration, and of a save
// from a newer game before this one overwrites it
const BACKUP_KEY = KEYS.saveBackup;
// Autosave follows the permanent state, not the clock: a purchase, repair,
// upgrade, finished mission, unlocked achievement or side-job payout marks
// the game dirty (markDirty, or the state check below) and it saves once
// things have been quiet for SAVE_DEBOUNCE seconds.
const SAVE_DEBOUNCE = 2.5;
const STATE_CHECK_S = 1;
const MISSION_SAVE_DELAY = 4;
const TOAST_S = 2.2;

let world = null;
// The slot this tab is playing, fixed when a save is loaded or a game starts: a second tab that
// switches the shared 'active' slot must not make this tab's autosave overwrite that slot.
let boundSlot = 0;
const saveTarget = () => boundSlot || activeSlot();
// follows the shared active slot (after the saves screen or a new game chose it)
export function bindSlot() { boundSlot = activeSlot(); }
let dirtyIn = -1;
let checkTimer = STATE_CHECK_S;
let lastSig = null;
let lastMissionsDone = 0;
let missionSaveIn = -1;
let toastEl = null;
let toastTimer = 0;
let restoredMoney = -1;
// seconds played in this save; counted while the game runs, stored in the save
let playSeconds = 0;

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MIN_RESTORE = 1500;
const START_MONEY = 250;
const JELLE_CHALLENGES = ['bruggen', 'fierljep', 'skutsje'];

// A save whose money got lost (the NaN-money bug stored null): its last good
// amount (moneyBackup) when there is one, else an estimate from what the
// progress paid out minus what was spent in shops and garages. Owned
// vehicles are not subtracted; at least MIN_RESTORE.
function estimateLostMoney(d) {
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

// shown once when a save of the first version of the story is opened (#187)
const OUD_GEMIGREERD_TEKST = 'Het oude verhaal is vervangen door het nieuwe. Je geld, spullen, voertuigen, prestaties en instellingen zijn bewaard; het verhaal begint opnieuw bij het begin.';

// The save of a slot (the active one by default), migrated; null when it is empty, broken,
// from a newer game or (readSlot). A broken slot with a recovery
// copy gives the recovery copy.
export function readSave(n = activeSlot()) {
  try {
    const m = readSlot(null, n);
    if (!m.data) return null;
    if (m.from !== VERSION) backupOnce(m.raw, m.from);
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
    const raw = localStorage.getItem(slotKey(saveTarget()));
    const d = JSON.parse(raw || 'null');
    if (d && Number.isInteger(d.v) && d.v > VERSION) backupOnce(raw, d.v);
  } catch (e) { /* ignore */ }
}

export function hasSave() {
  return !!readSave();
}

// Where the story of a save stands: the part, the step to play and how far the part is.
export function storySummary(d) {
  try {
    const done = new Set(d.story && Array.isArray(d.story.done) ? d.story.done : []);
    const passed = new Set(d.missions && Array.isArray(d.missions.completed) ? d.missions.completed : []);
    const isDone = (id) => done.has(id), isPassed = (i) => passed.has(i);
    const nx = nextStoryStep(isDone, isPassed);
    // nextStoryStep gives the step itself, or { end, next } (next: null at the end)
    const step = nx.part ? nx : nx.next || null;
    const part = step ? step.part : nx.end;
    if (!PARTS[part]) return null;
    const inPart = STEPS.map((s, k) => [s, k]).filter(([s]) => s.part === part && stepAvailable(s));
    const n = inPart.filter(([, k]) => stepDone(k, isDone, isPassed)).length;
    return { part: PARTS[part].title, date: PARTS[part].date || '', next: step ? step.title : '', done: n, total: inPart.length, ended: !step };
  } catch (e) {
    return null;
  }
}

// The play time of this session's game in seconds (the dashboard of the pause menu)
export const getPlaySeconds = () => Math.round(playSeconds);

export function getSaveSummary() {
  const d = readSave();
  if (!d) return null;
  const done = d.missions && Array.isArray(d.missions.completed) ? d.missions.completed.length : 0;
  return { slot: activeSlot(), name: nameOf(null, activeSlot()), playSeconds: Math.max(0, num(d.speeltijd, 0)), arc: savedArc(d), money: num(d.money, 0), missionsDone: done, savedAt: num(d.savedAt, 0), character: d.character === 'anita' ? 'Tessa' : 'Tammo', story: storySummary(d), goal: d.doel && typeof d.doel.name === 'string' ? d.doel.name : '' };
}

function clearSave() {
  keepNewerSave();
  try { localStorage.removeItem(slotKey(saveTarget())); } catch (e) { /* ignore */ }
}

// "Nieuw spel": the old saves stay. A new slot is made and becomes the active one; with every
// slot in use the active one is cleared, as before (its recovery copy stays).
export function startNewSlot(name) {
  if (!createSlot(null, name)) clearSave();
  bindSlot();
}

// Switches to another slot and loads it. false (and the old slot stays active) when the slot cannot be loaded.
export function loadSlot(w, n) {
  if (coopSessieLoopt(w)) return false;
  const d = readSave(n);
  if (!d || !w) return false;
  const was = activeSlot();
  setActive(null, n);
  if (!applySave(w, d)) { setActive(null, was); return false; }
  return true;
}

export function ensureActiveSlot() {
  return pickActive(null);
}

function serialize(w) {
  const p = w.player;
  const ammo = {};
  for (const [k, v] of Object.entries(w.ammo || {})) ammo[k] = v === Infinity ? 'inf' : num(v, 0);
  const pos = p.inVehicle && p.inVehicle.isBoat ? null : { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  // de beloningen die deze speler al kreeg (#429): een gast bewaart ze in zijn eigen save, zodat een herhaald bericht na
  // een herstart of een nieuwe verbinding niets dubbel geeft (coopbeloning.js, startClient in coopnet.js)
  const coopIds = w.coopBoek ? w.coopBoek.ids() : [];
  return {
    v: VERSION,
    arc: ARC_ID,
    savedAt: Date.now(),
    speeltijd: Math.round(playSeconds),
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
    financien: getFinanceSave(),
    thuis: getHomeSave(),
    doel: getGoalSave(),
    // the radio, 'on' or 'off'; a save without it starts with the radio on
    radio: getRadioSave(),
    // the streken: unlocked, switched on, used once (cheats.js)
    streken: getCheatSave(),
    // the day of the summer and the special days already announced (calendarday.js)
    kalender: getCalendarSave(w),
    ...(coopIds.length ? { coopGebeurtenissen: coopIds } : {}),
  };
}

export function saveGame(w = world, { toast = true } = {}) {
  if (!w) return false;
  // coöp (#95): de host bewaart zoals altijd; een gast bewaart het verhaal van de host niet,
  // alleen wat hij zelf verdiende komt in zijn eigen save (saveGuestEarnings)
  if (w.coopRole === 'client') return saveGuestEarnings(w);
  keepNewerSave();
  try {
    if (!writeSlotRaw(null, saveTarget(), JSON.stringify(serialize(w)))) throw new Error('write failed');
  } catch (e) {
    if (toast) w.addMessage('Opslaan mislukt', 2.5);
    return false;
  }
  dirtyIn = -1;
  lastSig = stateSignature(w);
  keepThumb(saveTarget(), toast);
  if (toast) showToast();
  return true;
}

// The small screenshot for the savegame card, taken from the last drawn frame. A manual save always
// takes one, the autosave at most once in 45 s; a failure only means a card without picture.
let thumbAt = 0;
let thumbListener = null;
// the savegame screen wants to know when a picture arrives (fn(slot) or null)
export function onThumbKept(fn) { thumbListener = fn; }
function keepThumb(n, force) {
  const now = Date.now();
  if (!force && now - thumbAt < 45000) return;
  thumbAt = now;
  // the canvas holds a frame only right after it was drawn: take the picture then
  afterNextFrame(() => {
    const r = getRenderer();
    const src = r && r.domElement;
    if (!src || !src.width || !src.height) return;
    const c = document.createElement('canvas');
    c.width = 224; c.height = 126;
    const g = c.getContext('2d');
    // cover-crop to 16:9
    const sw = src.width, sh = src.height, want = 16 / 9;
    let cw = sw, ch = sw / want;
    if (ch > sh) { ch = sh; cw = sh * want; }
    g.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, c.width, c.height);
    // a blank buffer gives a flat picture: not worth keeping
    const px = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, sum2 = 0, cnt = 0;
    for (let i = 0; i < px.length; i += 160) { const v = px[i] + px[i + 1] + px[i + 2]; sum += v; sum2 += v * v; cnt++; }
    if (!cnt || sum2 / cnt - (sum / cnt) ** 2 < 40) return;
    if (writeThumb(null, n, c.toDataURL('image/jpeg', 0.6)) && thumbListener) thumbListener(n);
  });
}

// Een gast: de verdiende beloningen erbij in de actieve slot, de rest van die save blijft zoals hij was.
function saveGuestEarnings(w) {
  const earned = w.coopVerdiend || 0;
  try {
    const r = readSlot(null, saveTarget());
    // het verdiende geld en wat de gast zelf kocht of at (#291): zijn eigen geld en spullen in zijn eigen opgeslagen spel,
    // met de ids van de beloningen die hij kreeg (#429): een herhaald bericht geeft daarna nooit twee keer geld
    const ok = r.state === 'ok' || r.state === 'hersteld';
    const ids = w.coopBoek ? w.coopBoek.ids() : [];
    const next = ok ? applyGuestChanges(r.data, serialize(w), earned, ids) : null;
    if (ok && !next) { w.coopVerdiend = 0; return false; } // niets te bewaren (het verdiende geld stond er al in)
    if (!next || !writeSlotRaw(null, saveTarget(), JSON.stringify(next))) return false;
    w.coopVerdiend = 0;
    return true;
  } catch (e) { return false; }
}

// Samen spelen (#429): het verhaal van een gast in zijn eigen opgeslagen spel. Het schrijven is één writeSlotRaw (met teruglezen ter controle
// en herstelkopie) en gebeurt pas bij de uitslag van de gastheer; een crash ervoor laat de oude save heel. Het geld van de overgeslagen
// missies en de prestaties van de meegespeelde opdrachten gaan in dezelfde schrijfbeurt mee en daarna pas in het lopende spel. Het geheugen
// (verhaal, missies, prestaties) volgt pas bij het terugkeren naar het eigen spel (herlaad), zodat een gewone save daarna de sprong niet overschrijft.
const gastData = () => { const r = readSlot(null, saveTarget()); return r.state === 'ok' || r.state === 'hersteld' ? r.data : null; };
registerGastVerhaal({
  status: (w, stap) => verhaalStatus(gastData(), stap),
  schrijf(w, stap) {
    try {
      const r = applyGuestStory(gastData(), stap);
      if (!r) return null;
      const mine = { ...serialize(w), money: Math.max(0, Math.floor(num(w.money, 0))) + r.bonus };
      let next = applyGuestChanges(r.save, mine, 0) || r.save;
      const klaar = r.missies.map(missieKlaarId).filter(Boolean); // zijn eigen prestaties: de opdracht als gedaan (#429)
      next = applyGuestAchievements(next, klaar);
      if (!writeSlotRaw(null, saveTarget(), JSON.stringify(next))) return null;
      if (klaar.length) applyAchievementSaveData(next.prestaties); // meteen ook in zijn lopende spel, anders schrijft de volgende checkpoint het weer weg
      w.money = num(w.money, 0) + r.bonus;
      if (Number.isFinite(w._goodMoney)) w._goodMoney += r.bonus;
      w.coopVerhaalNieuw = true;
      return { status: r.status, overgeslagen: r.overgeslagen.length, bonus: r.bonus };
    } catch (e) { return null; }
  },
  herlaad(w) {
    if (!w.coopVerhaalNieuw) return false;
    w.coopVerhaalNieuw = false;
    const d = gastData();
    if (!d) return false;
    setMissionProgress(w, d.missions);
    applyStorySave(d.story);
    applyAchievementSaveData(d.prestaties); // de prestatie van de meegespeelde opdracht telt ook in zijn eigen spel (#429)
    return true;
  },
});
// De beloningen die deze gast al kreeg staan in zijn eigen save (coopbeloning.js): zijn boek begint ermee (#429).
registerGastBoek(() => gebeurtenissenVan(gastData()));

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
      getMissionProgress(), getStorySave(), getAchievementSaveData(), getPigeonSaveData(), getSideJobSave(), getPostgameSave(), getFurnitureSave(), getGoalSave(), getHomeSave(), getCheatSave(), getRadioSave(),
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
  p.water = null; p.swimming = false; p.swimTilt = 0; p.waterTime = 0;
  p.climb = null; p.climbSpot = null; p.canClimbOut = false;
  p.vault = null; p.perch = null; p.crack = null; p.crouching = false; p.airPose = 0;
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
  // the hero car comes along when a spot near the new position is found; out in the
  // Ommeland (no city street within reach) it stays where it was instead of vanishing
  const hero = spawnHeroCarNear(map, sx, sy);
  if (hero) {
    const idx = w.vehicles.findIndex((v) => v.isHeroCar);
    if (idx >= 0) w.vehicles.splice(idx, 1);
    w.vehicles.push(hero);
  }
}

// Samen spelen: zolang er een sessie loopt wordt er niets geladen, want dat vervangt geld en wereld onder de sessie (#452).
export const COOP_LADEN_TEKST = 'Samen spelen loopt nog. Stop eerst de sessie om een ander spel te laden.';
export const COOP_NIEUW_TEKST = 'Samen spelen loopt nog. Stop eerst de sessie om een nieuw spel te beginnen.';
export const COOP_WISSEN_TEKST = 'Samen spelen loopt nog. Stop eerst de sessie om dit spel te verwijderen.';
export const coopSessieLoopt = (w) => !!(w && w.coopNet);

export function applySave(w, d) {
  if (!w || !d) return false;
  if (coopSessieLoopt(w)) return false;
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
    // a shop menu (the village quiz is one) or a train drive would go on against the loaded state
    closeShopMenu({ save: false });
    quitTrainDrive(w);
    w.cameraOverride = null;
    w.minigameUntil = 0;
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
    w.weapon = WEAPONS[d.weapon] && (WEAPONS[d.weapon].ammo === Infinity || Number.isFinite(ammo[d.weapon])) ? d.weapon : 'fists';
    for (const k of Object.keys(w.stats)) delete w.stats[k];
    Object.assign(w.stats, statsFromSave(d.stats));
    if (d.character === 'tammo' || d.character === 'anita') {
      w.player.character = d.character;
      if (w.companion) w.companion.character = d.character === 'tammo' ? 'anita' : 'tammo';
    }
    if (plausiblePos(d.pos)) placeAt(w, d.pos.x, d.pos.y);
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
    applyFinanceSave(d.financien, w.money);
    applyGoalSave(d.doel);
    applyRadioSave(d.radio);
    applyCheatSave(d.streken, d);
    applyCalendarSave(w, d.kalender);
    applyHomeOnLoad(w, d);
    // de beloningen die al in deze save staan (#429): wie later weer aansluit telt ze niet nog eens
    const coopIds = gebeurtenissenVan(d);
    w.coopBoek = coopIds.length ? maakBoekhouding(coopIds) : null;
    playSeconds = Math.max(0, num(d.speeltijd, 0));
    w.loadedFromSave = true;
    w.loadCount = (w.loadCount || 0) + 1;
    // a save of the first version of the story (savemigrate.js, migration 9): say what stayed and what starts over
    if (d.oudGemigreerd) {
      w.addMessage(OUD_GEMIGREERD_TEKST, 14);
      saveSoon(3);
    }
    w.messages = w.messages.filter((m) => !m.text.startsWith('Je begint bij'));
    restoredMoney = lost ? w.money : -1;
    if (lost) saveSoon(3);
    lastMissionsDone = w.stats.missionsDone;
    dirtyIn = -1;
    lastSig = null;
    bindSlot();
    return true;
  } catch (e) {
    console.error('Save laden mislukt', e);
    return false;
  }
}

export function loadLatestSave(w = world) {
  const d = readSave();
  if (!d || !applySave(w, d)) return false;
  w.addMessage('Laatste savegame geladen', 3);
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
  // a phone kills a backgrounded app without warning: save when the page goes to the background (#227)
  if (!hiddenSaveBound && typeof document !== 'undefined') {
    hiddenSaveBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && world && document.body.classList.contains('game-started')) saveGame(world, { toast: false });
    });
  }
}
let hiddenSaveBound = false;

// Samen spelen (#448): elke speler (ook een gast, in zijn eigen save) schrijft zijn voortgang elke minuut en na elke gelukte opdracht weg,
// ook achter het pauzemenu; een sessie die wegvalt of crasht kost dan hooguit een minuut.
const coopCheckpoint = maakCheckpoint();
function coopCheckpointTik(dt, w) {
  if (!w.coopRole) { coopCheckpoint.reset(); return; }
  coopCheckpoint.opdrachtGelukt(w.stats ? w.stats.missionsDone : 0);
  const bezig = isCinematicActive() || w.pendingRespawn || w.health <= 0;
  if (coopCheckpoint.tik(dt, bezig)) saveGame(w, { toast: false });
}

export function updateSaveGame(dt, w) {
  world = w;
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) toastEl.classList.remove('visible');
  if (!document.body.classList.contains('game-started')) return;
  coopCheckpointTik(dt, w);
  if (w.paused) return;
  if (restoredMoney >= 0) {
    w.addMessage(`We hebben je geld hersteld: €${restoredMoney.toLocaleString('nl-NL')}`, 6, { key: 'money-restored' });
    restoredMoney = -1;
  }
  if (w.coopRole === 'client' && w.coopVerdiend > 0 && !w.paused) saveGuestEarnings(w);
  playSeconds += dt;
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

registerSaveGame(saveGame);
registerSaveTimers(markDirty, saveSoon);
