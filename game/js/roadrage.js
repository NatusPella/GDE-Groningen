import { ejectDriver } from './pedestrians.js';
import { lineOfSight } from './pedgeom.js';
import { walkPed } from './sidejobkit.js';
import { damagePlayer, WEAPONS } from './combat.js';
import { knockFx } from './knockfx3d.js';
import { getSettings } from './settings.js';
import { dropWeapon } from './weapondrops.js';
import { isCinematicActive } from './cinematics.js';
import { isMissionActive } from './missions.js';
import { isActivityActive } from './activities.js';
import { inHomeFlat } from './home.js';
import { RAGE, RAGE_TEXT, levelOf, rageChance, mayRage, rollWeapon, hitDamage, yields, givesUp } from './roadragerules.js';
import { playerBusy } from './busy.js';

// Verkeersruzie (rules in roadragerules.js, issue #44): after a hard bump or
// long honking an ordinary driver may get out, shout, and swing at you with
// his fists or something cartoonish from the boot. No blood, small hits that
// stop when you are low, and a policeman on foot comes to calm him down. Hit
// him hard enough and he gives up and drops what he carries (weapondrops.js).
// Nothing is saved. `window.__roadrage` debug.
const S = { fight: null, since: 1e9 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let world = null;

export function initRoadRage(w) {
  world = w;
  S.fight = null;
  S.since = 1e9;
  window.__roadrage = {
    state: () => ({ phase: S.fight && S.fight.phase, armed: S.fight && S.fight.weapon, since: S.since, level: levelOf(getSettings().ruzie) }),
    // forces a fight with the nearest ordinary car (tests); weapon: a key or null
    start: (weapon = null) => {
      const v = w.vehicles.find((c) => eligible(c) && dist(c, w.player) < 60);
      return v ? begin(w, v, weapon || undefined) : false;
    },
    abort: () => end(w, true),
  };
}

function busy(w) {
  return playerBusy(w, ['cinematic', 'mission', 'sideJob', 'activity', 'challenge', 'race', 'padel']).busy || inHomeFlat()
    || (typeof document !== 'undefined' && document.body.classList.contains('hud-call-on'));
}

// An ordinary traffic car with an ordinary driver: no police, buses, bikes,
// mission cars or anything the player owns.
function eligible(v) {
  if (!v || v.wrecked || v.disabled || v.sinking || v.parked || v.hijacked || v.carjacked || v.driverOut) return false;
  if (v.driver || v.castDriver || v.racer || v.countryDrive || !v.road) return false;
  if (v.isPolice || v.isBus || v.isBike || v.isScooter || v.isBoat || v.isHeli || v.isAmbulance || v.isHeroCar || v.missionCar || v.playerOwned) return false;
  return true;
}

function say(ped, text, secs = 2.6) {
  ped.speechText = text;
  ped.speechUntil = world.time + secs;
}

function swing(f, w, hitAfter) {
  const spec = f.weapon ? WEAPONS[f.weapon] : null;
  const squirt = f.weapon === 'waterpistool';
  f.ped.attackFx = squirt
    ? { type: 'squirt', start: w.time, weapon: f.weapon }
    : { type: 'melee', start: w.time, side: Math.random() < 0.5 ? -1 : 1, swing: spec && spec.swing ? spec.swing : 'jab', weapon: f.weapon || 'fists' };
  f.hitAt = w.time + hitAfter;
}

function begin(w, v, forceWeapon) {
  if (S.fight) return false;
  const level = levelOf(getSettings().ruzie) || 1;
  const weapon = forceWeapon !== undefined ? forceWeapon : rollWeapon(level);
  S.fight = { v, ped: null, weapon, phase: 'stop', t: 0, hitAt: 0, cop: null, bonked: false, armedSaid: false, level };
  return true;
}

function releaseCar(f, driverBack) {
  const v = f.v;
  v.driverOut = false;
  v.waitTimer = 0;
  // a driver who does not come back leaves the car as it stands, like one that burned out
  if (!driverBack) v.road = null;
}

function end(w, silent = false) {
  const f = S.fight;
  if (!f) return;
  if (f.v) { f.v.driverOut = false; f.v.waitTimer = 0; }
  if (f.ped) {
    f.ped.rager = false;
    f.ped.heldWeapon = null;
    f.ped.attackFx = null;
    if (f.ped.state === 'guard') f.ped.state = 'wander';
  }
  if (f.cop && f.cop.state === 'guard') { f.cop.state = 'wander'; f.cop.guard = null; }
  S.fight = null;
  if (!silent) S.since = 0;
}

// He loses what he carries where he stands.
function dropHeld(f) {
  const ped = f.ped;
  if (!f.weapon) return;
  dropWeapon(world, f.weapon, ped.x, ped.y, ped.gz || 0);
  world.addMessage(RAGE_TEXT.drop(f.weapon), 4);
  f.weapon = null;
  ped.heldWeapon = null;
}

function yieldFight(w, f) {
  const ped = f.ped;
  dropHeld(f);
  ped.attackFx = null;
  if (ped.state !== 'dead' && !ped.ragdoll) {
    say(ped, pick(RAGE_TEXT.yield));
    knockFx(w, ped.x, ped.y, { k: 0.5, gz: ped.gz });
    ped.koUntil = w.time + 0.1;
    ped.groggyUntil = w.time + 3;
    ped.state = 'flee';
    ped.fleeFrom = null;
    ped.fleeJitter = (Math.random() - 0.5) * 0.8;
    ped.fleeSpeed = 3.6;
    ped.stateUntil = w.time + 8;
  }
  releaseCar(f, false);
  f.v.driverOut = false;
  S.fight = null;
  ped.rager = false;
  S.since = 0;
}

function copNearby(w, f) {
  for (const c of w.pedestrians) {
    if (!c.isCop || c.state === 'dead' || c.ragdoll || c.scene || c.state === 'seek') continue;
    if (dist(c, f.ped) < RAGE.copSight && lineOfSight(w.map, c.x, c.y, f.ped.x, f.ped.y)) return c;
  }
  return null;
}

export function updateRoadRage(dt, w) {
  if (!dt || w.paused || !w.player || !w.map) return;
  world = w;
  S.since += dt;
  const p = w.player;
  const f = S.fight;
  if (!f) {
    detect(w);
    return;
  }
  f.t += dt;
  const v = f.v;
  // the car stands still while its driver is out
  v.waitTimer = 2;
  if (f.phase === 'stop' && (v.wrecked || v.disabled || v.sinking)) { end(w); return; }

  if (f.phase === 'stop') {
    if (Math.abs(v.speed) < 0.8 || f.t > RAGE.stopWait) {
      const ped = ejectDriver(w, { vehicle: v, calm: true });
      if (!ped) { end(w); return; }
      f.ped = ped;
      ped.rager = true;
      ped.state = 'guard';
      ped.guard = { x: ped.stepOut ? ped.stepOut.tx : ped.x, y: ped.stepOut ? ped.stepOut.ty : ped.y, angle: Math.atan2(p.y - ped.y, p.x - ped.x) };
      ped.heldWeapon = f.weapon;
      v.driverOut = true;
      f.phase = 'out';
      f.t = 0;
      say(ped, pick(f.trigger === 'horn' ? RAGE_TEXT.horn : RAGE_TEXT.out), 3);
      w.addMessage(RAGE_TEXT.start(!!f.weapon), 4, { kind: 'gevaar', key: 'verkeersruzie' });
    }
    return;
  }

  const ped = f.ped;
  const gone = !ped || !w.pedestrians.includes(ped);
  if (gone) { releaseCar(f, false); end(w); return; }
  if (p.dead || w.pendingRespawn || busy(w) || w.wanted > 0) {
    if (f.phase !== 'back') { f.phase = 'back'; f.t = 0; }
  }
  if (f.phase !== 'arrested' && yields(ped)) { yieldFight(w, f); return; }

  const d = dist(p, ped);
  const pv = p.inVehicle;

  // police on foot step in after a moment
  if (f.phase !== 'back' && f.phase !== 'arrested' && !f.cop && f.t > RAGE.copDelay) {
    const cop = copNearby(w, f);
    if (cop) { f.cop = cop; say(cop, pick(RAGE_TEXT.copStop), 3); }
  }
  if (f.cop && f.phase !== 'arrested') {
    if (f.cop.state === 'dead' || f.cop.ragdoll || !w.pedestrians.includes(f.cop)) f.cop = null;
    else if (walkPed(w, f.cop, ped.x, ped.y, RAGE.copSpeed, dt, RAGE.arrestReach)) {
      // taken away: whatever he carried is confiscated
      f.weapon = null;
      ped.heldWeapon = null;
      ped.attackFx = null;
      ped.guard = { x: ped.x, y: ped.y, angle: ped.angle };
      ped.state = 'guard';
      say(f.cop, RAGE_TEXT.copCalm, 3.5);
      w.addMessage(RAGE_TEXT.arrested, 4);
      f.phase = 'arrested';
      f.t = 0;
    }
  }

  switch (f.phase) {
    case 'out': {
      ped.guard.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
      ped.angle = ped.guard.angle;
      if (f.t >= RAGE.outDelay) { f.phase = 'charge'; f.t = 0; if (f.weapon && !f.armedSaid) { f.armedSaid = true; say(ped, pick(RAGE_TEXT.armed), 2.6); } }
      break;
    }
    case 'charge': {
      if (givesUp(f.t, d)) { f.phase = 'back'; f.t = 0; say(ped, pick(RAGE_TEXT.back)); break; }
      const reach = f.weapon === 'waterpistool' ? RAGE.waterRange : pv ? pv.halfWid + 1.1 : RAGE.reach;
      if (walkPed(w, ped, p.x, p.y, RAGE.chargeSpeed, dt, reach)) { f.phase = 'fight'; f.t = 0; f.hitAt = 0; ped.attackFx = null; }
      break;
    }
    case 'fight': {
      ped.guard = { x: ped.x, y: ped.y, angle: Math.atan2(p.y - ped.y, p.x - ped.x) };
      ped.angle = ped.guard.angle;
      const reach = f.weapon === 'waterpistool' ? RAGE.waterRange : pv ? pv.halfWid + 1.1 : RAGE.reach;
      if (givesUp(f.t + (f.chargeT || 0), d)) { f.phase = 'back'; f.t = 0; ped.attackFx = null; say(ped, pick(RAGE_TEXT.back)); break; }
      if (d > reach + 1.2) { f.phase = 'charge'; f.chargeT = (f.chargeT || 0) + f.t; f.t = 0; break; }
      if (!f.hitAt || (w.time >= f.hitAt + RAGE.hitEvery)) {
        swing(f, w, RAGE.windup);
        f.landed = false;
        if (Math.random() < 0.5) say(ped, pick(RAGE_TEXT.hit), 1.4);
      } else if (!f.landed && w.time >= f.hitAt) {
        f.landed = true;
        if (pv) {
          if (!f.bonked) { f.bonked = true; w.addMessage(RAGE_TEXT.bonk, 3); }
        } else if (d <= reach + 0.5) {
          const spec = f.weapon ? WEAPONS[f.weapon] : null;
          const dmg = hitDamage(spec ? spec.damage : 0, f.level, w.health);
          if (f.weapon === 'waterpistool') {
            if (!f.bonked) { f.bonked = true; w.addMessage(RAGE_TEXT.squirt, 3); }
            if (dmg > 0) damagePlayer(w, 1);
          } else if (dmg > 0) {
            damagePlayer(w, dmg);
            const dx = (p.x - ped.x) / (d || 1), dy = (p.y - ped.y) / (d || 1);
            p.hitReact = { t: w.time, dx, dy, k: 0.8 };
            p.x += dx * 0.35; p.y += dy * 0.35;
          }
        }
      }
      break;
    }
    case 'arrested': {
      if (f.t >= RAGE.arrestHold) {
        const i = w.pedestrians.indexOf(ped);
        if (i >= 0) w.pedestrians.splice(i, 1);
        releaseCar(f, false);
        end(w);
      }
      break;
    }
    case 'back': {
      if (walkPed(w, ped, v.x, v.y, RAGE.returnSpeed, dt, v.halfWid + 1.4) || f.t > 12 || dist(ped, v) > RAGE.giveUpDist * 2) {
        const i = w.pedestrians.indexOf(ped);
        if (i >= 0) w.pedestrians.splice(i, 1);
        ped.rager = false;
        releaseCar(f, true);
        end(w);
      }
      break;
    }
    default:
      break;
  }
}


// A hard bump or a long honk, and the dice.
function detect(w) {
  const p = w.player;
  const level = levelOf(getSettings().ruzie);
  const may = mayRage({ busy: busy(w), dead: p.dead || w.pendingRespawn, wanted: w.wanted || 0, since: S.since, time: w.time || 0, level });
  const pv = p.inVehicle;
  for (const v of w.vehicles) {
    if (v === pv) continue;
    // a honk edge is noticed even while a fight cannot start, so it is not rolled late
    const hornEdge = v.horn && !v._rageHorn;
    v._rageHorn = !!v.horn;
    if (!may || !eligible(v)) continue;
    if (Math.abs(v.x - p.x) > RAGE.maxDist || Math.abs(v.y - p.y) > RAGE.maxDist) continue;
    if (w.time - (v._rageRoll ?? -1e9) < RAGE.vehicleCooldown) continue;
    let trigger = null, closing = 0;
    if (pv && v.hitThisFrame && v.hitImpactSpeed >= RAGE.crashMinSpeed && Math.hypot(v.hitX - pv.x, v.hitY - pv.y) < pv.halfLen + 2.5) { trigger = 'crash'; closing = v.hitImpactSpeed; }
    else if (hornEdge && dist(v, p) < 22) trigger = 'horn';
    if (!trigger) continue;
    v._rageRoll = w.time;
    if (Math.random() >= rageChance(trigger, level, closing)) continue;
    if (begin(w, v)) { S.fight.trigger = trigger; return; }
  }
}
