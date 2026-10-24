// Streken (cheats): what is unlocked and switched on, per save and for
// good, and what each one does to the game each frame. The list itself is
// cheatlist.js; the pause-menu section cheatsui.js; the switches the
// systems read are cheatmods.js MODS.
//
// - Unlocks: the story (cheatlist.js storyCheatUnlocks) and prestaties,
//   polled once a second; a fresh one shows a HUD card. Kept per save
//   (savegame.js `streken`) and as a lifetime set in the prestaties store,
//   so a new game has them too.
// - Gameplay streken pause during missions, cutscenes, challenges,
//   bijbaantjes and minigames; the cosmetic ones (safe) keep running.
// - Prestaties: none unlock and no lifetime stat moves while a gameplay
//   streek is on.
//   Teleporting, Voertuig hier and the cosmetic ones leave them on.
import { CHEATS, CHEAT_BY_ID, storyCheatUnlocks, cheatUnlocksFromSave } from './cheatlist.js';
import { MODS } from './cheatmods.js';
import { targetMix, stepMix } from './streekverkeer.js';
import { setAchievementGate, isUnlocked, hasUnique, markLifetime } from './achievements.js';
import { getStorySave } from './storyquery.js';
import { getMissionProgress, isMissionActive } from './missionquery.js';
import { isCinematicActive } from './cinematics.js';
import { isActivityActive } from './activities.js';
import { updateDayNight } from './daynight.js';
import { setHeadScale } from './models3d_people.js';
import { showCard } from './hudcards.js';
import { inHomeFlat } from './home.js';
import { resetWalker, resetVehicle, placeCompanion } from './safety.js';
import { isInWater } from './util.js';
import { inDoorRange } from './facilities.js';
import { edgeDistance } from './countryfield.js';
import { roadNear, tilesIn, withTiles } from './tileplace.js';
import { getGarageCatalog, deliverOwnedVehicle } from './ownedvehicles.js';
import { playerBusy } from './busy.js';
import { meerSpelers, cheatsUit, CHEATS_UIT_TEKST } from './coopgroep.js';

const CLOCK = { zomeravond: 20.5, nachtstad: 0.5 };
const FAST_CLOCK = 4; // extra days per day: five times as fast in all
const SLOWMO_MS = 1500;
const CRASH_DROP = 7; // m/s lost in one step: a crash

let world = null;
let unlocked = new Set();
let on = new Set();
let primed = false;
let pollT = 0;
let slowUntil = 0;
let lastSpeed = 0;
let stormForced = false;

export function initCheats(w) {
  world = w;
  resetState(null);
  w.cheatActions = { teleport: (x, y, name, opts) => teleport(w, x, y, name, opts) };
  setAchievementGate(() => achievementsBlocked());
}

function resetState(d) {
  unlocked = new Set(cheatUnlocksFromSave(d));
  on = new Set();
  stormForced = false;
  slowUntil = 0;
  mirrorCanvas(false);
  primed = false;
  pollT = 0;
}

export const isAvailable = (id) => unlocked.has(id) || hasUnique('streken', id);
export const isCheatOn = (id) => on.has(id);

// A gameplay streek is on (paused or not).
export function achievementsBlocked() {
  for (const id of on) if (!CHEAT_BY_ID.get(id).safe) return true;
  return false;
}

// Missions, cutscenes and the like, where only the cosmetic streken run.
export function cheatsBusy(w = world) {
  if (!w) return true;
  return playerBusy(w, ['mission', 'cinematic', 'challenge', 'sideJob', 'heliRun', 'pigeon', 'padel', 'activity', 'train', 'respawn']).busy;
}

export function setCheat(id, value) {
  const c = CHEAT_BY_ID.get(id);
  if (!c || (c.kind && c.kind !== 'toggle') || !isAvailable(id)) return false;
  if (value && cheatsUit(world)) { if (world.addMessage) world.addMessage(CHEATS_UIT_TEKST, 4); return false; } // met meer spelers geen cheats (#452)
  if (value) {
    if (c.group) for (const o of CHEATS) if (o.group === c.group) on.delete(o.id);
    on.add(id);
  } else on.delete(id);
  return true;
}

// --- unlocks ---------------------------------------------------------------------

function pollUnlocks(w) {
  const st = getStorySave();
  const prog = getMissionProgress();
  const done = new Set(st.done), passed = new Set(prog ? prog.completed : []);
  const now = storyCheatUnlocks((id) => done.has(id), (i) => passed.has(i));
  for (const c of CHEATS) if (c.ach && isUnlocked(c.ach)) now.push(c.id);
  for (const id of now) {
    if (unlocked.has(id)) continue;
    unlocked.add(id);
    const fresh = markLifetime('streken', id);
    const c = CHEAT_BY_ID.get(id);
    if (primed && fresh && (c.step || c.ach)) {
      showCard(w, { kind: 'prestatie', kicker: 'Cheat vrijgespeeld', title: c.name, body: 'Pauzemenu › Cheats', duration: 5, key: 'streek-' + id, voice: false });
    }
  }
  primed = true;
}

// --- each frame ------------------------------------------------------------------

export function updateCheats(dt, w) {
  pollT -= dt;
  if (pollT <= 0) { pollT = 1; pollUnlocks(w); }
  const busy = cheatsBusy(w);
  const uit = cheatsUit(w); // een sessie met meer spelers: alle cheats staan uit, ook de uiterlijk-cheats (#452)
  const live = (id) => !uit && on.has(id) && (CHEAT_BY_ID.get(id).safe || !busy);

  MODS.grav = live('zwaartekracht') ? 0.35 : 1;
  MODS.grip = live('frituurvet') ? 0.3 : 1;
  MODS.turbo = live('turbo');
  MODS.bounce = live('stuiter');
  // traffic: the target mix of the verkeer streek that is on; the factors ramp there, so it dies out
  const tm = targetMix((id) => live(id));
  MODS.fading = stepMix(MODS, tm.mix, dt);
  MODS.look = tm.look;
  MODS.pigeons = live('duivenstorm') ? 5 : 1;
  MODS.gronings = live('gronings');
  setHeadScale(live('grotekoppen') ? 2.1 : 1);
  MODS.pedScale = live('kleinemensjes') ? 0.5 : 1;
  MODS.pigeonScale = live('reuzenduif') ? 6 : 1;
  MODS.alwaysGreen = live('altijdgroen');
  MODS.disco = live('disco');
  MODS.mirror = live('spiegelstad');
  mirrorCanvas(MODS.mirror);

  for (const [id, hour] of Object.entries(CLOCK)) if (live(id)) w.clock = hour;
  if (live('snelletijd')) updateDayNight(dt * FAST_CLOCK, w);
  storm(w, live('storm'));
  if (live('geenpolitie') && w.wanted) { w.wanted = 0; w.wantedDecayTimer = 0; }
  if (live('eeuwig') && w.health > 0) w.health = 100;
  if (live('magazijn') && w.ammo) for (const k of Object.keys(w.ammo)) if (Number.isFinite(w.ammo[k]) && w.ammo[k] < 30) w.ammo[k] = 30;

  // a crash: a big loss of speed in one step
  const v = w.player.inVehicle;
  const speed = v ? Math.abs(v.speed || 0) : 0;
  const now = performance.now();
  if (v && lastSpeed - speed > CRASH_DROP && !v.isBoat && !v.isHeli) {
    if (live('slowmo')) slowUntil = now + SLOWMO_MS;
    if (live('stuiter') && !v.airborne) { v.airborne = true; v.vz = Math.min(9, (lastSpeed - speed) * 0.6); }
  }
  lastSpeed = speed;
  MODS.slow = live('slowmo') && now < slowUntil ? 0.3 : 1;
}

// Spiegelstad: de 3D-weergave gespiegeld; de HUD, de menu's en de tekst erin blijven gewoon leesbaar.
let mirrored = false;
function mirrorCanvas(on) {
  if (on === mirrored || typeof document === 'undefined') return;
  mirrored = on;
  const c = document.getElementById('game3d');
  if (c) c.style.transform = on ? 'scaleX(-1)' : '';
}

function storm(w, want) {
  const wt = w.weather;
  if (!wt) return;
  if (want) {
    if (!wt.active || wt.kind !== 'storm') {
      wt.active = true; wt.kind = 'storm'; wt.elapsed = 0; wt.nextToppleAt = 20;
      w.addMessage('Code rood. Zomer? Ja.', 3);
    }
    wt.peak = 1;
    wt.duration = wt.elapsed + 600;
    stormForced = true;
  } else if (stormForced) {
    stormForced = false;
    if (wt.active) wt.duration = Math.min(wt.duration, wt.elapsed + 12);
  }
}

// --- save ------------------------------------------------------------------------

export function getCheatSave() {
  return { v: 1, unlocked: [...unlocked], on: [...on], used: [] };
}

// d: the save's `streken` (savemigrate.js 3 adds it), save: the whole save.
export function applyCheatSave(d, save) {
  resetState(save);
  if (!d || typeof d !== 'object') return;
  const ids = (list) => (Array.isArray(list) ? list.filter((id) => CHEAT_BY_ID.has(id)) : []);
  for (const id of ids(d.unlocked)) unlocked.add(id);
  for (const id of ids(d.on)) setCheat(id, true);
}

// --- teleport --------------------------------------------------------------------

// Why a jump or a delivery can't happen now, or ''. reis: een snelreis voor jezelf (safehouse-anker), geen cheat: de anderen blijven waar ze zijn (#452).
export function blockedReason(w = world, { vehicleOk = true, reis = false } = {}) {
  const p = w.player;
  if (!reis && cheatsUit(w)) return CHEATS_UIT_TEKST;
  if (cheatsBusy(w)) return w.pigeonMode ? 'Eerst weer mens worden' : 'Niet tijdens een missie of filmpje';
  if (w.wanted > 0) return 'Met de politie op je hielen kan dat niet. Eerst ze kwijt!';
  if (inHomeFlat()) return 'Eerst de flat uit';
  if (p.swimming) return 'Eerst even uit het water klimmen';
  const v = p.inVehicle;
  if (v && !vehicleOk) return 'Stap eerst uit';
  if (v && v.isBoat) return 'Eerst van het water af';
  if (v && v.isHeli) return 'Eerst landen en uitstappen';
  if (v && (v.wrecked || v.sinking)) return 'Dit voertuig gaat nergens meer heen';
  return '';
}

const inCountry = (x, y) => inDoorRange(x, y) && edgeDistance(x, y) > 40;

function roadAngle(road, x, y) {
  const pts = road && road.pts;
  if (!pts || pts.length < 2) return null;
  let best = Infinity, ang = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    const d = (mx - x) ** 2 + (my - y) ** 2;
    if (d < best) { best = d; ang = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); }
  }
  return ang;
}

// The nearest road (city or Ommeland) to a map click, else dry open ground.
export function teleportSpot(map, x, y, car) {
  if (inCountry(x, y)) {
    const q = roadNear(map, x, y, 900);
    if (q) return { x: q.x, y: q.y, angle: Math.atan2(q.uy, q.ux) };
    if (!isInWater(map, x, y)) return { x, y, angle: null };
  }
  const road = map.nearestRoadPoint(x, y, 600, car, true);
  if (road && !road.road.bridge && Math.hypot(road.x - x, road.y - y) < 400) {
    const s = map.findOpenSpawn(road.x, road.y, 60, car);
    if (s) return { x: s.x, y: s.y, angle: roadAngle(s.road || road.road, s.x, s.y) };
  }
  const s = map.findOpenSpawn(x, y, 800, car);
  if (s) return { x: s.x, y: s.y, angle: roadAngle(s.road, s.x, s.y) };
  if (!isInWater(map, x, y)) return { x, y, angle: null };
  return null;
}

function teleport(w, x, y, name, opts = null) {
  const why = blockedReason(w, { reis: !!(opts && opts.reis) });
  if (why) { w.addMessage(why, 3); return false; }
  // far from here the tiles round the target are not in yet: they come first,
  // then the same jump (the road and the open spot are picked from them)
  if (!tilesIn(w.map, [[x, y]], 400)) {
    withTiles(w.map, [[x, y]], () => teleportNow(w, x, y, name), { radius: 400, token: 'teleport' }).catch(() => {});
    return true;
  }
  return teleportNow(w, x, y, name);
}

function teleportNow(w, x, y, name, stil = false) {
  const p = w.player, v = p.inVehicle, map = w.map;
  const spot = teleportSpot(map, x, y, !!(v && !v.isBike && !v.isScooter));
  if (!spot) { w.addMessage('Daar kun je niet staan', 3); return false; }
  const angle = Number.isFinite(spot.angle) ? spot.angle : p.angle;
  const gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
  if (v) {
    const [vx, vy] = map.escapeBuilding(spot.x, spot.y, (v.halfWid || 1) + 0.4);
    resetVehicle(v, vx, vy, angle, gz);
    v.road = null;
    p.x = v.x; p.y = v.y; p.angle = angle; p.gz = gz; p.z = 0; p.vz = 0;
  } else {
    resetWalker(p, spot.x, spot.y, gz);
    p.angle = angle;
  }
  w.camYaw = p.angle;
  if (!meerSpelers(w)) placeCompanion(w, p.x, p.y, p.angle); // met meer spelers reis je alleen zelf; de anderen blijven (#452)
  lastSpeed = 0;
  if (!stil) w.addMessage(`Je staat nu ${name ? 'bij ' + name : 'ergens anders'}`, 3, { kind: 'tip' });
  return true;
}

// Samen spelen (#439): de nieuwe host komt op de plek waar het spel stond (coophostwisselwereld.js), met de tegels erbij en zonder streken-melding.
export function verplaatsStil(w, x, y) {
  if (!w || !w.map || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (!tilesIn(w.map, [[x, y]], 400)) { withTiles(w.map, [[x, y]], () => teleportNow(w, x, y, '', true), { radius: 400, token: 'overdracht' }).catch(() => {}); return true; }
  return teleportNow(w, x, y, '', true);
}

// --- voertuig hier ---------------------------------------------------------------

// What the picker offers: your garage, and with Showroom the rest of the
// stock too (the garage catalog of ownedvehicles.js). [{ id, label, kind, own }]
export function spawnChoices(w = world) {
  const showroom = isAvailable('alles');
  return getGarageCatalog(w)
    .filter((e) => e.owned || showroom)
    .map((e) => ({ id: e.id, label: e.hero ? 'Fjord Escapade' : e.label, kind: e.spec.kind, own: !!e.owned }));
}

// The same delivery as the garage and the phone, only free, at once and next
// to you (ownedvehicles.js deliverOwnedVehicle).
export function spawnVehicleHere(id, w = world) {
  if (!isAvailable('voertuig')) return { ok: false, text: 'Nog op slot' };
  const why = blockedReason(w);
  if (why) return { ok: false, text: why };
  if (!spawnChoices(w).some((c) => c.id === id)) return { ok: false, text: 'Dat voertuig heb je niet' };
  const res = deliverOwnedVehicle(w, id, { here: true });
  if (res.ok) lastSpeed = 0;
  return res;
}
