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
//   streek is on, or for the rest of the session after "Geld uit de muur".
//   Teleporting and the cosmetic ones leave them on.
import { CHEATS, CHEAT_BY_ID, storyCheatUnlocks, cheatUnlocksFromSave } from './cheatlist.js';
import { MODS } from './cheatmods.js';
import { setAchievementGate, isUnlocked, hasUnique, markLifetime } from './achievements.js';
import { getStorySave } from './story.js';
import { getMissionProgress, isMissionActive } from './missions.js';
import { isCinematicActive } from './cinematics.js';
import { isActivityActive } from './activities.js';
import { updateDayNight } from './daynight.js';
import { setHeadScale } from './models3d_people.js';
import { showCard } from './hudcards.js';
import { inHomeFlat } from './home.js';
import { resetWalker, resetVehicle, placeCompanion } from './safety.js';
import { isInWater } from './util.js';
import { REAL, inRealExtent } from './countryreal.js';
import { edgeDistance } from './countryfield.js';
import { realRoadNear } from './ommelandplace.js';
import { getOwnedEntries, spawnOwnedEntry, spawnStockVehicle, VEHICLE_STOCK } from './shops.js';
import { spawnHeroCarNear } from './vehicle.js';
import { propBlocked } from './parkedcars.js';

const CLOCK = { zomeravond: 20.5, nachtstad: 0.5 };
const FAST_CLOCK = 4; // extra days per day: five times as fast in all
const SLOWMO_MS = 1500;
const CRASH_DROP = 7; // m/s lost in one step: a crash
const HERO_MODEL = { len: 4, wid: 1.65 };

let world = null;
let unlocked = new Set();
let on = new Set();
let usedOnce = new Set();
let tainted = false;
let primed = false;
let pollT = 0;
let slowUntil = 0;
let lastSpeed = 0;
let stormForced = false;
let tempVehicle = null;

export function initCheats(w) {
  world = w;
  resetState(null);
  w.cheatActions = { teleport: (x, y, name) => teleport(w, x, y, name) };
  setAchievementGate(() => achievementsBlocked());
}

function resetState(d) {
  unlocked = new Set(cheatUnlocksFromSave(d));
  on = new Set();
  usedOnce = new Set();
  primed = false;
  pollT = 0;
}

export const isAvailable = (id) => unlocked.has(id) || hasUnique('streken', id);
export const isCheatOn = (id) => on.has(id);
export const wasUsed = (id) => usedOnce.has(id);

// A gameplay streek is on (paused or not), or money was taken this session.
export function achievementsBlocked() {
  if (tainted) return true;
  for (const id of on) if (!CHEAT_BY_ID.get(id).safe) return true;
  return false;
}

// Missions, cutscenes and the like, where only the cosmetic streken run.
export function cheatsBusy(w = world) {
  if (!w) return true;
  return isMissionActive() || isCinematicActive() || !!w.challenge || !!(w.sideJob && w.sideJob.active) || !!w.heliRun ||
    !!w.pigeonMode || !!w.padelGame || isActivityActive() || !!w.trainDriving || !!w.pendingRespawn;
}

export function setCheat(id, value) {
  const c = CHEAT_BY_ID.get(id);
  if (!c || (c.kind && c.kind !== 'toggle') || !isAvailable(id)) return false;
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
      showCard(w, { kind: 'prestatie', kicker: 'Streek vrijgespeeld', title: c.name, body: 'Pauzemenu › Streken', duration: 5, key: 'streek-' + id, voice: false });
    }
  }
  primed = true;
}

// --- each frame ------------------------------------------------------------------

export function updateCheats(dt, w) {
  pollT -= dt;
  if (pollT <= 0) { pollT = 1; pollUnlocks(w); }
  const busy = cheatsBusy(w);
  const live = (id) => on.has(id) && (CHEAT_BY_ID.get(id).safe || !busy);

  MODS.grav = live('zwaartekracht') ? 0.35 : 1;
  MODS.grip = live('frituurvet') ? 0.3 : 1;
  MODS.turbo = live('turbo');
  MODS.bounce = live('stuiter');
  MODS.cars = live('geenverkeer') || live('fietsenstad') ? 0 : 1;
  MODS.bikes = live('geenverkeer') ? 0 : live('fietsenstad') ? 3 : 1;
  MODS.pigeons = live('duivenstorm') ? 5 : 1;
  MODS.gronings = live('gronings');
  setHeadScale(live('grotekoppen') ? 2.1 : 1);

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
  MODS.slow = now < slowUntil && !busy ? 0.3 : 1;
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
  return { v: 1, unlocked: [...unlocked], on: [...on], used: [...usedOnce] };
}

// d: the save's `streken` (savemigrate.js 3 adds it), save: the whole save.
export function applyCheatSave(d, save) {
  resetState(save);
  tainted = false;
  if (!d || typeof d !== 'object') return;
  const ids = (list) => (Array.isArray(list) ? list.filter((id) => CHEAT_BY_ID.has(id)) : []);
  for (const id of ids(d.unlocked)) unlocked.add(id);
  for (const id of ids(d.used)) usedOnce.add(id);
  for (const id of ids(d.on)) setCheat(id, true);
}

// --- teleport --------------------------------------------------------------------

// Why a jump or a delivery can't happen now, or ''.
export function blockedReason(w = world, { vehicleOk = true } = {}) {
  const p = w.player;
  if (cheatsBusy(w)) return w.pigeonMode ? 'Eerst weer mens worden' : 'Niet tijdens een missie of filmpje';
  if (inHomeFlat()) return 'Eerst de flat uit';
  if (p.swimming) return 'Eerst even uit het water klimmen';
  const v = p.inVehicle;
  if (v && !vehicleOk) return 'Stap eerst uit';
  if (v && v.isBoat) return 'Eerst van het water af';
  if (v && v.isHeli) return 'Eerst landen en uitstappen';
  if (v && (v.wrecked || v.sinking)) return 'Dit voertuig gaat nergens meer heen';
  return '';
}

const inCountry = (x, y) => REAL.ready && inRealExtent(x, y) && edgeDistance(x, y) > 40;

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
    const q = realRoadNear(x, y, 900);
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

function teleport(w, x, y, name) {
  const why = blockedReason(w);
  if (why) { w.addMessage(why, 3); return false; }
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
  placeCompanion(w, p.x, p.y, p.angle);
  lastSpeed = 0;
  w.addMessage(`Je staat nu ${name ? 'bij ' + name : 'ergens anders'}`, 3, { kind: 'tip' });
  return true;
}

// --- voertuig hier ---------------------------------------------------------------

// What the picker offers: your own vehicles, and with Showroom the rest of
// the stock too. [{ id, label, kind, own }]
export function spawnChoices(w = world) {
  const out = [{ id: 'hero', label: 'Fjord Escapade', kind: 'car', own: true }];
  const have = new Set();
  for (const o of getOwnedEntries()) {
    have.add(o.key);
    out.push({ id: o.key, label: o.spec.label || o.key, kind: o.spec.kind, own: true });
  }
  if (isAvailable('alles')) {
    for (const [key, spec] of Object.entries(VEHICLE_STOCK)) if (!have.has(key)) out.push({ id: key, label: spec.label || key, kind: spec.kind, own: false });
  }
  return out;
}

function clearOfVehicles(w, x, y, r, ignore) {
  for (const o of w.vehicles) {
    if (o === ignore || o.wrecked) continue;
    const rr = r + (o.halfLen || 2) + 0.4;
    if (Math.abs(o.x - x) < rr && Math.abs(o.y - y) < rr && Math.hypot(o.x - x, o.y - y) < rr) return false;
  }
  return true;
}

const solid = (map, x, y, m) => {
  const [ex, ey] = map.escapeBuilding(x, y, m);
  return Math.hypot(ex - x, ey - y) > 0.05;
};

// Right where you stand, else a little to the side: dry and level for a
// car or bike, open water for a boat, room for the rotor for the heli.
export function vehicleSpot(w, kind, model, ignore = null) {
  const map = w.map, p = w.player;
  const len = model.len || 4, wid = model.wid || 1.7, half = len / 2;
  const gz = (p.gz || 0);
  const radii = kind === 'boat' ? [0, 3, 6, 10, 15, 20, 28, 36, 45] : kind === 'heli' ? [0, 6, 10, 14, 19, 25, 32] : [0, 2.5, 4, 6, 8, 11, 15, 20];
  for (const r of radii) {
    const n = r ? 12 : 1;
    for (let i = 0; i < n; i++) {
      const a = p.angle + Math.PI / 2 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (Math.PI * 2 / n);
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      const angle = p.angle;
      const fx = Math.cos(angle) * half, fy = Math.sin(angle) * half;
      if (kind === 'boat') {
        if (isInWater(map, x, y) && isInWater(map, x + fx, y + fy) && isInWater(map, x - fx, y - fy) && clearOfVehicles(w, x, y, half, ignore)) return { x, y, angle };
        continue;
      }
      if (isInWater(map, x, y) || isInWater(map, x + fx, y + fy) || isInWater(map, x - fx, y - fy)) continue;
      if (map.groundHeightAt && Math.abs((map.groundHeightAt(x, y, gz) || 0) - gz) > 0.8) continue;
      if (kind === 'heli') {
        if (solid(map, x, y, 8) || !clearOfVehicles(w, x, y, 7, ignore)) continue;
        if (map.treesNear && map.treesNear(x, y, 7).some((t) => Math.hypot((t.x ?? t[0]) - x, (t.y ?? t[1]) - y) < 7)) continue;
        return { x, y, angle };
      }
      if (solid(map, x, y, wid / 2 + 0.3) || solid(map, x + fx, y + fy, wid / 2 + 0.2) || solid(map, x - fx, y - fy, wid / 2 + 0.2)) continue;
      if (!clearOfVehicles(w, x, y, half, ignore)) continue;
      if (propBlocked(x, y, angle, { len, wid })) continue;
      return { x, y, angle };
    }
  }
  return null;
}

function park(w, v, spot) {
  v.x = spot.x; v.y = spot.y; v.angle = spot.angle;
  v.speed = 0; v.throttle = 0; v.steer = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  v.road = null; v.parked = false; v.driver = null; v.horn = false;
  v.homeStored = false; v.homeSlot = null;
  if (!v.isBoat && !v.isHeli) { v.z = w.map.spawnZ ? w.map.spawnZ(spot.x, spot.y) : 0; v.vz = 0; v.airborne = false; }
  if (!w.vehicles.includes(v)) w.vehicles.push(v);
}

export function spawnVehicleHere(id, w = world) {
  const why = blockedReason(w, { vehicleOk: false });
  if (why) return { ok: false, text: why };
  const choice = spawnChoices(w).find((c) => c.id === id);
  if (!choice) return { ok: false, text: 'Dat voertuig heb je niet' };
  const map = w.map;
  let v = null, spot = null;
  if (id === 'hero') {
    v = w.vehicles.find((x) => x.isHeroCar && !x.wrecked) || null;
    spot = vehicleSpot(w, 'car', HERO_MODEL, v);
    if (!spot) return { ok: false, text: 'Hier past geen auto. Ga op een open plek staan' };
    if (!v) {
      v = spawnHeroCarNear(map, spot.x, spot.y);
      if (!v) return { ok: false, text: 'De Escapade komt hier niet' };
      for (const o of w.vehicles) if (o.isHeroCar && o.wrecked) o.isHeroCar = false;
    }
    park(w, v, spot);
  } else {
    const spec = VEHICLE_STOCK[id];
    const kind = spec ? spec.kind : choice.kind;
    const o = choice.own ? getOwnedEntries().find((x) => x.key === id) : null;
    const old = o && o.v && w.vehicles.includes(o.v) && !o.lost && !o.v.wrecked ? o.v : null;
    spot = vehicleSpot(w, kind, (spec && spec.model) || HERO_MODEL, old);
    if (!spot) {
      return { ok: false, text: kind === 'boat' ? 'Een boot kan alleen op het water. Ga aan de kant staan' : kind === 'heli' ? 'Te weinig ruimte voor de rotor. Zoek een open plek' : 'Hier past hij niet. Ga op een open plek staan' };
    }
    if (old) { v = old; park(w, v, spot); }
    else if (o) v = spawnOwnedEntry(w, o, spot.x, spot.y, spot.angle);
    else {
      if (tempVehicle && !tempVehicle.driver && tempVehicle.driver !== 'player') {
        const i = w.vehicles.indexOf(tempVehicle);
        if (i >= 0) w.vehicles.splice(i, 1);
      }
      v = tempVehicle = spawnStockVehicle(w, id, spot.x, spot.y, spot.angle);
    }
    if (!v) return { ok: false, text: 'Hier kan dat voertuig niet komen' };
    if (!v.isBoat && !v.isHeli) { v.x = spot.x; v.y = spot.y; v.angle = spot.angle; }
  }
  const p = w.player;
  p.enterVehicle(v, w);
  if (p.inVehicle === v) { p.x = v.x; p.y = v.y; p.angle = v.angle; }
  w.camYaw = v.angle;
  lastSpeed = 0;
  return { ok: true, text: `${choice.label} staat klaar` };
}

// --- geld uit de muur ------------------------------------------------------------

export function takeMoney(w = world) {
  if (!isAvailable('geld')) return { ok: false, text: 'Nog op slot' };
  if (usedOnce.has('geld')) return { ok: false, text: 'De muur is leeg. Eén keer per spel' };
  w.money += 1000;
  usedOnce.add('geld');
  tainted = true;
  w.addMessage('€ 1000 uit de muur', 3, { kind: 'geld' });
  return { ok: true, text: '€ 1000 erbij. Prestaties staan uit tot je een save laadt.' };
}

export function isTainted() {
  return tainted;
}
