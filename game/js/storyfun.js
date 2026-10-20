// Story steps around the free-roam extras (storyarc.js): any activity step's
// closing `scene` (where the player is, once the shop or minigame is done), the bumper-car ride
// on the Grote Markt where Tammo corners Durk & Douwe (r-kermis, kermis.js),
// Rotor Roelf with his demo Wieken Wubbo on Eelde, where the H15 flight
// starts (s-proefvlucht: walking up to him plays his `meet` scene) and carbid
// schieten at boer Roelf's, who hides the Eierbal in his melkbus and scares
// the twins off with a knal (s-carbid, carbid.js; far out and without a car,
// Henk drops your own Escapade off for free).
//
// story.js merges FUN_GOALS into its goal types, calls updateStoryFun every
// frame and storyFunDone when a step is done. While such a step is current,
// world.storyActivity is its goal type (kermis.js makes that ride free and
// puts the twins in it). The demo heli is a missionCar, never owned: it
// waits on Roelf's pad with him, is put back there after a wreck, and leaves
// with him once the step is over and the player has walked away (H15,
// helirun.js, flies this same heli). A flight goal with `over` also puts a
// balloon there and counts flying over it (the older demo flight).
// Debug: window.__storyFun.

import { getStat } from './achievements.js';
import { KERMIS } from './kermis.js';
import { CARBID } from './carbid.js';
import { placeOwnedVehicleNear, findParkingSpot, isOwnVehicle } from './ownedvehicles.js';
import { spawnHeroCarNear } from './vehicle.js';
import { flashScreen } from './postfx3d.js';
import { makeHeli, HELI_MODEL, helipadById } from './heliflight.js';
import { playCastScene } from './missionstory.js';
import { playCinematic, isCinematicActive } from './cinematics.js';
import { isMissionActive } from './missionquery.js';
import { isActivityActive } from './activities.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { getScene } from './scene3d.js';
import { DURK_LOOK, DOUWE_LOOK, ROTOR_LOOK } from './storycast.js';
import { STEP_BY_ID } from './storyarc.js';
import { getPadelSpotsForRender } from './padel.js';
import { getTrainTripCount, getStationsForRender, lastTrainArrival } from './stationtravel.js';
import { villageStroll } from './dorpsuitjes.js';
import { refreshDayNight } from './daynight.js';
import { playerBusy } from './busy.js';

const MEET_R = 9;
const HIDEOUT_R = 14;
const HIDEOUT_STILL = 3;
const WALK_UP_R = 45;
const AIR_MIN = 6;
const GONE_R = 50;
const BALLOON_GONE_R = 450;
const ANIM_R = 320;
const SCENE_DELAY = 3.5;
const SCENE_GIVE_UP = 25;
const SCENE_R = 120;
const LIFT_AFTER = 10;
const LIFT_FAR = 800;
const LIFT_NEAR_CAR = 150;
// the balloon H15 chases (helirun.js, variant traumaduif)
const BALLOON_SEED = 1810;
const NAMES = { T: 'Tammo', A: 'Anita', durk: 'Durk', douwe: 'Douwe', rotor: 'Rotor Roelf' };

let world = null;
let demo = null;
let balloon = null;
let pending = null;
let spotTry = -1;
// scenes started, per kind (the story test checks them)
const played = { meet: 0, spot: 0, kermis: 0, carbid: 0, lift: 0, court: 0 };
const COURT_MEET_R = 16;

const groundAt = (w, x, y) => (w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) : 0);
const flightStep = (st) => !!(st && !st.end && st.kind === 'activity' && st.goal && st.goal.type === 'flight');

function person(look, x, y, z, face) {
  const scene = getScene();
  if (!scene) return null;
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.position.set(x, z, y);
  m.rotation.y = -face;
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(m);
  return m;
}

function dropPerson(m) {
  if (!m) return;
  if (m.parent) m.parent.remove(m);
  m.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
}

// --- the demo heli and Rotor Roelf -----------------------------------------------

function demoUsable(w) {
  const v = demo && demo.v;
  return !!(v && !v.wrecked && !v.sinking && w.vehicles.includes(v));
}

function placeDemo(w, st) {
  const pad = st.goal.pad ? helipadById(st.goal.pad) : null;
  const [x, y] = pad ? [pad.x, pad.y] : st.goal.heli;
  const z = pad ? pad.z : groundAt(w, x, y);
  const v = makeHeli(x, y, z, -Math.PI / 2, { ...HELI_MODEL, color: '#e8e6e0' });
  v.missionCar = true;
  v.storyDemo = true;
  w.vehicles.push(v);
  const rx = x + 4.2, ry = y + 2.4;
  if (demo && demo.roelf) dropPerson(demo.roelf);
  demo = { v, step: st.id, roelf: person(ROTOR_LOOK, rx, ry, groundAt(w, rx, ry), Math.atan2(y - ry, x - rx)) };
}

// Rotor Roelf takes his heli back once nobody sits in it and the player is away.
function removeDemo(w, why = '') {
  if (!demo) return;
  const v = demo.v;
  if (v && w.player.inVehicle !== v) {
    const i = w.vehicles.indexOf(v);
    if (i >= 0) w.vehicles.splice(i, 1);
    if (w.companion && w.companion.inVehicle === v) { w.companion.inVehicle = null; v.passenger = null; }
  } else if (v) return;
  dropPerson(demo.roelf);
  demo = null;
  if (why) w.addMessage(why, 3.5, { kind: 'tip' });
}

function updateDemo(w, st, dt) {
  if (flightStep(st)) {
    if (!demoUsable(w)) {
      // a wrecked or sunk demo heli: Roelf puts the next one down once you are off it
      const [x, y] = st.goal.heli;
      const old = demo && demo.v;
      const away = !old || (w.player.inVehicle !== old && Math.hypot(w.player.x - x, w.player.y - y) > 30);
      if (away) {
        const again = !!old;
        if (old) { const i = w.vehicles.indexOf(old); if (i >= 0 && old.driver !== 'player') w.vehicles.splice(i, 1); }
        placeDemo(w, st);
        if (again) w.addMessage('Rotor Roelf zet een nieuwe Wieken Wubbo klaar.', 4.5, { kind: 'tip' });
      }
    }
  } else if (demo) {
    const v = demo.v;
    const p = w.player;
    if (!v || p.inVehicle !== v) {
      const far = !v || Math.hypot(p.x - v.x, p.y - v.y) > GONE_R;
      if (far || isMissionActive()) removeDemo(w, v && !v.wrecked ? 'Rotor Roelf vliegt zijn Wieken Wubbo terug naar Eelde' : '');
    }
  }
  if (demo && demo.roelf) {
    demo.roelf.visible = !isCinematicActive();
    if (Math.hypot(w.player.x - demo.roelf.position.x, w.player.y - demo.roelf.position.z) < ANIM_R) animatePersonWalk(demo.roelf, 0, dt);
  }
}

// --- Jelle's balloon in the Oosterpark --------------------------------------------

function placeBalloon(w, st) {
  const [x, y] = st.goal.over;
  const z = groundAt(w, x, y);
  const b = {
    x, y, z, targetZ: z, vz: 0, drift: 0, spin: 0, yaw: 0.4, seed: BALLOON_SEED, phase: 'ground', timer: 0,
    burn: 0, burnLeft: 0, nextBurn: 3, burnSeq: 0, burnDur: 0, age: 0, scripted: true, storyFun: true,
  };
  if (!w.balloons) w.balloons = [];
  w.balloons.push(b);
  const twins = [[DURK_LOOK, 2.3, 0.6], [DOUWE_LOOK, -2.3, -0.4]].map(([look, dx, dy]) => person(look, x + dx, y + dy, groundAt(w, x + dx, y + dy), Math.atan2(-dy, -dx)));
  balloon = { b, twins, step: st.id };
}

function removeBalloon(w) {
  if (!balloon) return;
  const i = w.balloons ? w.balloons.indexOf(balloon.b) : -1;
  if (i >= 0) w.balloons.splice(i, 1);
  for (const m of balloon.twins) dropPerson(m);
  balloon = null;
}

function animateTwins(t, dt, wave) {
  if (!balloon) return;
  balloon.twins.forEach((m, k) => {
    if (!m) return;
    animatePersonWalk(m, 0, dt);
    const ud = m.userData;
    if (wave && ud.armR) ud.armR.rotation.z = 2.5 + Math.sin(t * 5 + k * 1.3) * 0.45;
  });
}

function updateBalloon(w, st, dt) {
  if (flightStep(st) && st.goal.over) {
    if (!balloon) placeBalloon(w, st);
    const b = balloon.b;
    // the burner roars now and then: it is being filled for tonight
    b.burnLeft -= dt;
    if (b.burnLeft <= 0 && (b.nextBurn -= dt) <= 0) { b.burnLeft = 2.5; b.nextBurn = 4 + Math.random() * 5; }
    b.burn += ((b.burnLeft > 0 ? 1 : 0) - b.burn) * Math.min(1, dt * 10);
    if (Math.hypot(w.player.x - b.x, w.player.y - b.y) < ANIM_R) animateTwins(w.time, dt, false);
  } else if (balloon) {
    const b = balloon.b;
    if (w.heliRun || isMissionActive() || Math.hypot(w.player.x - b.x, w.player.y - b.y) > BALLOON_GONE_R) removeBalloon(w);
  }
}

// --- scenes ---------------------------------------------------------------------------

// Spotted from the air: a slow orbit round the balloon while Tessa and Tammo
// talk over the headsets, the twins waving up at them.
function playSpotScene(w, st, base) {
  const sc = st.scene || {};
  const [bx, by] = st.goal.over;
  const gz = groundAt(w, bx, by);
  const lines = (sc.lines || []).map(([k, text], i) => ({ speaker: NAMES[k] || k, text, at: 0.9 + i * 2.5, dur: 2.3 }));
  const a0 = Math.atan2(w.player.y - by, w.player.x - bx);
  let last = 0;
  return playCinematic({
    id: 'story-spot', priority: 2, duration: 1.4 + lines.length * 2.5, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: sc.kicker || '', title: 'De ballon', cardFor: 2.4, lines,
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - last));
      last = t;
      animateTwins(t, dt, true);
      const a = a0 + u * 1.1, r = 40 - u * 15;
      return { position: { x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, z: gz + 21 - u * 8 }, lookAt: { x: bx, y: by, z: gz + 5.5 }, fov: 50 };
    },
    onEnd: () => { base.spotted = true; },
  });
}

function updateSpotting(w, st, base) {
  if (base.spotted || base.spotting || !st.goal.over) return;
  const p = w.player, v = p.inVehicle;
  const [bx, by] = st.goal.over;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  const d = Math.hypot(x - bx, y - by);
  const aloft = v && v.isHeli && (v.z || 0) - groundAt(w, x, y) > AIR_MIN;
  if (!(aloft ? d < (st.goal.r || 170) : d < WALK_UP_R)) { spotTry = -1; return; }
  if (spotTry < 0) spotTry = w.time;
  if (!isCinematicActive() && !w.pigeonMode && playSpotScene(w, st, base)) { base.spotting = true; played.spot++; return; }
  // no scene possible for a while: it counts anyway
  if (w.time - spotTry > 6) base.spotted = true;
}

// Rotor Roelf hands over the keys when you walk up to his heli.
function updateMeet(w, st, base) {
  if (base.met || !st.meet || !demoUsable(w)) return;
  const p = w.player, v = demo.v;
  if (p.inVehicle) { if (p.inVehicle === v) base.met = true; return; }
  if (Math.hypot(p.x - v.x, p.y - v.y) > MEET_R || isCinematicActive() || isMissionActive() || w.pigeonMode) return;
  base.met = true;
  const sc = st.meet;
  // the scene has its own Rotor Roelf: the one by the heli steps aside meanwhile (the game is paused)
  if (playCastScene(w, { at: { x: p.x, y: p.y }, lookTo: { x: v.x, y: v.y }, lines: sc.lines, cast: sc.cast || [], props: sc.props || [], kicker: sc.kicker || '' })) {
    played.meet++;
    if (demo.roelf) demo.roelf.visible = false;
  }
}

// Durk & Douwe waiting at the padel court (s-padel `meet`): why they challenge you.
function updateCourtMeet(w, st, base) {
  if (base.met || !st.meet) return;
  const p = w.player;
  if (p.inVehicle || p.swimming || playerBusy(w, ['padel', 'cinematic', 'mission', 'activity', 'pigeon']).busy) return;
  let site = null, bd = COURT_MEET_R;
  for (const s of getPadelSpotsForRender()) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; site = s; }
  }
  if (!site) return;
  base.met = true;
  const sc = st.meet;
  if (playCastScene(w, { at: { x: p.x, y: p.y }, lookTo: { x: site.x, y: site.y }, lines: sc.lines, cast: sc.cast || [], props: sc.props || [], kicker: sc.kicker || '' })) played.court++;
}

// Where a step is done: the bumper-car ride's payoff at the booth (the twins,
// dizzy, then off on their one fatbike), or Roelf and Hilje at the churn after
// carbid schieten (the Eierbal goes into the melkbus, a knal sends the twins off).
function playDoneScene(w, st) {
  const sc = st.scene;
  const carbid = st.goal.type === 'carbid';
  // other activities (the bike shop, the tuning garage, the boat rental) play where the player is
  const at = carbid || st.goal.type === 'kermis' ? (carbid ? CARBID : KERMIS).spots()[0] : { x: w.player.x, y: w.player.y };
  if (!sc || !at || Math.hypot(w.player.x - at.x, w.player.y - at.y) > SCENE_R) return true;
  // a scene at an hour of its own (the sunset at the Hoge der A)
  if (sc.clock != null && Math.abs(((w.clock - sc.clock + 36) % 24) - 12) > 0.5) { w.clock = sc.clock; refreshDayNight(w); }
  const lookTo = sc.look ? { x: at.x + sc.look[0], y: at.y + sc.look[1] } : null;
  let banged = false;
  const update = sc.knal ? (t, dt, cur) => {
    if (banged || !cur || cur.text !== sc.knal) return;
    banged = true;
    CARBID.knal(w);
    flashScreen(true);
  } : null;
  const ok = playCastScene(w, { at: { x: at.x, y: at.y }, facing: carbid ? CARBID.field().rot : sc.face ?? null, lookTo, lines: sc.lines, cast: sc.cast || [], props: sc.props || [], kicker: sc.kicker || '', update });
  // the scene has its own Roelf and Hilje: the ones in the field step aside meanwhile (the game is paused)
  if (ok && carbid) CARBID.farmersVisible(false);
  return ok;
}

// Far from Roelf's and nothing to drive: Henk brings your own Escapade, free.
function updateLift(w, st, base) {
  if (base.lifted || w.time - (base.since ?? w.time) < LIFT_AFTER || isCinematicActive() || isMissionActive() || w.pigeonMode || w.wanted > 0) return;
  base.lifted = true;
  liftNow(w, st);
}

function liftNow(w, st) {
  const at = CARBID.spots()[0];
  const p = w.player;
  if (!at || !st.goal.lift || Math.hypot(p.x - at.x, p.y - at.y) < LIFT_FAR) return false;
  const own = (v) => v && !v.wrecked && !v.sinking && !v.isBoat && !v.isHeli && !v.isBike && !v.isScooter && isOwnVehicle(v);
  if (own(p.inVehicle) || w.vehicles.some((v) => own(v) && Math.hypot(v.x - p.x, v.y - p.y) < LIFT_NEAR_CAR)) return false;
  let car = w.vehicles.find((v) => v.isHeroCar && !v.wrecked && !v.sinking);
  let spot = car ? placeOwnedVehicleNear(w, car, p.x, p.y) : null;
  if (!car) {
    const s = findParkingSpot(w, p.x, p.y, { len: 4.0, wid: 1.65, name: 'escort' });
    car = s && spawnHeroCarNear(w.map, s.x, s.y);
    if (car) {
      for (const v of w.vehicles) if (v.isHeroCar && v.wrecked) v.isHeroCar = false;
      car.x = s.x; car.y = s.y; car.angle = s.angle; car.speed = 0;
      car.z = w.map.spawnZ ? w.map.spawnZ(s.x, s.y) : 0;
      w.vehicles.push(car);
      spot = s;
    }
  }
  if (!spot) return false;
  played.lift++;
  const [from, text] = st.goal.lift;
  if (w.phoneNotifications) w.phoneNotifications.push({ from, text, duration: 6, story: true });
  w.addMessage('Je Escapade staat om de hoek: hij staat op je kaart', 5, { kind: 'tip' });
  return true;
}

// The scene waits for the ride's result card; the step's done text follows it.
function updatePending(w) {
  if (!pending) return;
  const finish = () => { const f = pending.after; pending = null; if (f) f(); };
  if (pending.playing) {
    if (isCinematicActive()) return;
    if (pending.step.goal.type === 'carbid') CARBID.farmersVisible(true);
    finish();
    return;
  }
  if (w.time > pending.until) { finish(); return; }
  if (w.time < pending.at || isCinematicActive() || isActivityActive() || isMissionActive() || w.pigeonMode || w.pendingRespawn) return;
  if (playDoneScene(w, pending.step) && isCinematicActive()) { pending.playing = true; const k = pending.step.goal.type; played[k] = (played[k] || 0) + 1; }
  else finish();
}

// --- "Even onderduiken" (r-trein): the player's pick of storyarc.js HIDEOUTS ---------------

// Where an option is: its station, or the nearest walkable point to its spot
// (the Noorderplantsoen's landmark lies in the pond).
const hideoutAt = new Map();
function hideoutSpot(o) {
  if (hideoutAt.has(o.id)) return hideoutAt.get(o.id);
  let at = null;
  if (o.at === 'station') {
    const s = getStationsForRender().find((q) => q.name === o.station) || getStationsForRender()[0];
    at = s ? { x: s.x, y: s.y } : null;
  } else if (world && world.map) {
    const rp = world.map.nearestRoadPoint(o.at[0], o.at[1], 160, false, true);
    at = rp ? { x: rp.x, y: rp.y } : { x: o.at[0], y: o.at[1] };
  }
  if (at) hideoutAt.set(o.id, at);
  return at;
}

// Every option with its spot, for the map (world.storyChoices) and the route.
export function hideoutChoices(st) {
  return st.goal.options.map((o) => { const s = hideoutSpot(o); return s ? { id: o.id, x: s.x, y: s.y, name: o.name, short: o.short } : null; }).filter(Boolean);
}

// The step as it played out: the scene and done text of the option picked
// (the first one when the step was completed another way).
export function hideoutStep(st, base) {
  const o = st.goal.options.find((q) => q.id === (base && base.choice)) || st.goal.options[0];
  return { ...st, done: o.done || st.done, scene: o.scene ? { ...o.scene, clock: o.clock, look: o.look } : null, choice: o.id };
}

// The train only counts out in the Ommeland: off at a village, a short walk
// to its first uitje, and the scene plays there. A trip within Stad doesn't.
let stroll = null;
function trainHideout(b) {
  const arr = lastTrainArrival();
  if (!arr || !arr.village) {
    b.trips = getTrainTripCount();
    world.addMessage('Dat is nog Stad. Kies een dorp in het Ommeland.', 5);
    return false;
  }
  if (!stroll || stroll.village !== arr.name) {
    const s = villageStroll(world, arr.name);
    if (!s) return true;
    stroll = { ...s, village: arr.name };
    world.addMessage(`${arr.name}. Even het dorp in, naar ${s.label}. Hier zoekt niemand ons.`, 5);
  }
  const p = world.player;
  const v = p.inVehicle;
  if (isCinematicActive() || (v && Math.abs(v.speed || 0) > HIDEOUT_STILL) || Math.hypot((v || p).x - stroll.x, (v || p).y - stroll.y) > HIDEOUT_R) return false;
  stroll = null;
  return true;
}

// --- story.js hooks -----------------------------------------------------------------

export const FUN_GOALS = {
  hideout: {
    begin: (st, b) => { b.trips = getTrainTripCount(); b.choice = null; stroll = null; },
    met: (st, b) => {
      if (b.choice) return true;
      if (getTrainTripCount() > (b.trips ?? Infinity) && trainHideout(b)) { b.choice = 'trein'; return true; }
      const p = world && world.player;
      if (!p || isMissionActive() || world.pigeonMode || isCinematicActive()) return false;
      const v = p.inVehicle;
      if (v && Math.abs(v.speed || 0) > HIDEOUT_STILL) return false;
      const x = v ? v.x : p.x, y = v ? v.y : p.y;
      for (const o of st.goal.options) {
        if (o.at === 'station') continue;
        const s = hideoutSpot(o);
        if (s && Math.hypot(s.x - x, s.y - y) < (o.r || HIDEOUT_R)) { b.choice = o.id; return true; }
      }
      return false;
    },
    place: (st) => {
      if (stroll) return { x: stroll.x, y: stroll.y, name: stroll.label };
      const p = world.player;
      let best = null, bd = Infinity;
      for (const c of hideoutChoices(st)) {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
  },
  kermis: {
    begin: (st, b) => { b.rides = getStat('botsautoRides'); },
    met: (st, b) => getStat('botsautoRides') > (b.rides ?? Infinity),
    place: () => { const s = KERMIS.spots()[0]; return s ? { x: s.x, y: s.y } : null; },
  },
  carbid: {
    begin: (st, b) => { b.games = getStat('carbidGames'); b.since = world ? world.time : 0; b.lifted = false; },
    met: (st, b) => getStat('carbidGames') > (b.games ?? Infinity),
    place: () => { const s = CARBID.spots()[0]; return s ? { x: s.x, y: s.y } : null; },
  },
  flight: {
    begin: (st, b) => { b.spotted = false; b.spotting = false; b.met = false; },
    met: (st, b) => (st.goal.over ? !!b.spotted : !!b.met),
    place: (st) => {
      const v = world && world.player.inVehicle;
      if (v && v.isHeli && st.goal.over) return { x: st.goal.over[0], y: st.goal.over[1] };
      return demo && demo.v ? { x: demo.v.x, y: demo.v.y } : { x: st.goal.heli[0], y: st.goal.heli[1] };
    },
  },
};

export function initStoryFun(w) {
  world = w;
  window.__storyFun = {
    state: () => ({ activity: world.storyActivity || null, demo: demo && demo.v ? { x: demo.v.x, y: demo.v.y, z: demo.v.z, owned: !!demo.v.playerOwned, mine: world.player.inVehicle === demo.v } : null, balloon: balloon ? { x: balloon.b.x, y: balloon.b.y } : null, pending: !!pending, played: { ...played } }),
    demo: () => (demo ? demo.v : null),
    // the s-carbid lift right now (far out, nothing to drive): true when the Escapade was dropped off
    lift: (id = 's-carbid') => { const st = STEP_BY_ID.get(id); return !!(st && st.goal && st.goal.lift) && liftNow(world, st); },
    // the twins' challenge at the nearest padel court (s-padel)
    court: () => {
      const sc = STEP_BY_ID.get('s-padel').meet, p = world.player;
      const site = getPadelSpotsForRender().reduce((a, q) => (!a || Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? q : a), null);
      const ok = !!site && playCastScene(world, { at: { x: p.x, y: p.y }, lookTo: { x: site.x, y: site.y }, lines: sc.lines, cast: sc.cast || [], kicker: sc.kicker || '' });
      if (ok) played.court++;
      return ok;
    },
    // replay a step's scene where it plays ('r-kermis': the booth, 's-proefvlucht': the balloon, 's-carbid': the churn)
    scene: (id) => {
      const st = STEP_BY_ID.get(id);
      if (!st || !st.goal) return false;
      if (st.goal.type === 'flight') return st.goal.over ? playSpotScene(world, st, {}) : false;
      return playDoneScene(world, st);
    },
  };
}

// step: story.js's current step (or { end }), base: its per-step goal state.
export function updateStoryFun(dt, w, step, base) {
  world = w;
  const st = step && !step.end ? step : null;
  w.storyActivity = st && st.kind === 'activity' && st.goal ? st.goal.type : null;
  // all the onderduik options on the map, not only the one the route takes
  w.storyChoices = st && st.goal && st.goal.type === 'hideout' ? hideoutChoices(st) : null;
  updateDemo(w, st, dt);
  updateBalloon(w, st, dt);
  if (flightStep(st) && base) {
    updateMeet(w, st, base);
    updateSpotting(w, st, base);
  }
  if (st && st.kind === 'activity' && st.goal && st.goal.type === 'carbid' && base) updateLift(w, st, base);
  if (st && st.kind === 'activity' && st.goal && st.goal.type === 'padel' && base) updateCourtMeet(w, st, base);
  updatePending(w);
}

// A step is done (not skipped): its scene follows once the minigame's result
// card is gone, then `after` (the step's done text). False: no scene.
export function storyFunDone(w, step, after = null) {
  if (!(step && step.scene && step.goal && step.goal.type !== 'flight')) return false;
  pending = { step, at: w.time + SCENE_DELAY, until: w.time + SCENE_GIVE_UP, after, playing: false };
  return true;
}

// A scene of ours is still to come: story.js holds the next step's text until it is over.
export function storyFunBusy() {
  return !!pending;
}
