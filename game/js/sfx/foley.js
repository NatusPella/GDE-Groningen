import { clamp } from '../util.js';
import { getCombatEffect } from '../combateffect.js';
import { isGunWeapon, isRangedWeapon } from '../weapons.js';
import { surfaceUnder } from '../vehicle.js';
import { getPlace } from './ambience.js';
import { stepNames, stepSurface, tickFoot, STEP_SURFACES, STEP_VARIANTS } from './steps.js';
import { rand as rnd } from '../rng.js';

// Footsteps, close-combat/weapon handling, vehicle detail sounds and police
// radio. Everything is derived from world state each frame.

let K = null;
const queue = [];
let frame = 0;

const foot = { phase: 0, air: false, maxRise: 0, baseZ: 0 };
const footOut = [];
const comp = { phase: 0, x: 0, y: 0, init: false };
let pedList = [];
let pedTimer = 0;
const pedState = new WeakMap();
const pedHealth = new WeakMap();
const pedDead = new WeakSet();
const vehState = new WeakMap();
const whizzed = new WeakSet();
const bulletFrame = new WeakMap();
let prevBullets = [];
const vanished = [];
let lastEffect = null;
let meleeAt = -1;
const weap = { weapon: null, ammo: 0, shots: 0, mouse: false, dryAt: 0 };
let alarm = null;
let heliHum = null;
let scooterVoice = null;
let putterVoice = null;
let beepVoice = null;
const blinker = { on: false, hold: 0, off: 0, next: 0, tick: false };
let radioAt = 0;
let lastRoofThump = 0;
let lastSquealAt = 0;

function now() { return K.ctx.currentTime; }

function later(delay, fn) {
  if (queue.length > 48) return;
  queue.push({ t: now() + delay, fn });
}

function runQueue() {
  const t = now();
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].t > t) continue;
    const it = queue[i];
    queue.splice(i, 1);
    it.fn();
  }
}

function at(buf, x, y, o = {}) {
  const out = K.spatial(x, y, { h: o.h ?? 0.3, ref: o.ref ?? 3, rolloff: o.rolloff ?? 1.3, range: o.range ?? 40, model: 'equalpower', prio: o.prio ?? 1 });
  if (!out) return;
  K.buf(buf, { out, gain: o.gain ?? 0.3, rate: o.rate ?? 1, prio: o.prio ?? 1, delay: o.delay || 0, lp: o.lp || 0 });
}

export function initFoley(kit, world) {
  K = kit;
  // every step variant up front: a variant still rendering used to be a silent step
  K.bank.warm([...STEP_SURFACES.flatMap((f) => Array.from({ length: STEP_VARIANTS }, (_, v) => `step_${f}_${v}`)), 'land', 'whoosh', 'punch', 'body_hit', 'body_fall',
    'dry_click', 'slide', 'pump', 'mag_out', 'mag_in', 'casing_0', 'casing_1', 'casing_2', 'glass', 'metal_ping', 'whizz', 'ric_whine',
    'airbrake', 'door_hiss', 'ratchet', 'chain', 'creak', 'hull_slap', 'thump', 'radio_0', 'radio_1', 'radio_2', 'radio_3', 'prop_wood', 'prop_metal', 'prop_plastic', 'prop_foliage', 'tree_fall']);
  weap.weapon = world.weapon;
  weap.ammo = world.ammo[world.weapon] || 0;
  for (const ped of world.pedestrians) if (ped.state === 'dead') pedDead.add(ped);
}

// --- footsteps ----------------------------------------------------------

function surfaceAt(map, x, y) {
  const pl = getPlace();
  if (pl.waterD < 1.6) return 'wet';
  if (map.isOnBridge(x, y)) return 'wood';
  return stepSurface(surfaceUnder(map, x, y));
}

function playerSurface(world, p) {
  if (p.water || p.swimming) return 'wet';
  // a car roof: a hollow metal thud, closest to the boards
  if (p.perch) return 'wood';
  return surfaceAt(world.map, p.x, p.y);
}

// Tries the other variants (and then klinkers) when one is still rendering.
function playStep(surface, x, y, gain, rate, prio, rain) {
  const out = K.spatial(x, y, { h: 0.05, ref: 3, rolloff: 1.5, range: 30, model: 'equalpower', prio });
  if (!out) return;
  const r = rate * rnd(0.95, 1.05);
  for (const name of stepNames(surface)) if (K.buf(name, { out, gain, rate: r, prio })) break;
  if (rain > 0.35 && surface !== 'gras' && surface !== 'wet') {
    for (const name of stepNames('wet')) if (K.buf(name, { out, gain: gain * rain * 0.5, rate, prio })) break;
  }
}

function footsteps(dt, world) {
  const p = world.player;
  const rain = world.weather ? world.weather.intensity : 0;
  // the player's own feet are never dropped for ambience (prio 1, not 0)
  if (!p.inVehicle && !world.paused && !p.ragdoll) {
    for (const e of tickFoot(foot, p, dt, footOut)) {
      const s = playerSurface(world, p);
      if (e.kind === 'land') {
        at('land', p.x, p.y, { h: 0.05, gain: e.gain, rate: rnd(0.95, 1.05), prio: 1 });
        playStep(s, p.x, p.y, 0.2 * e.k, 0.9, 1, rain);
      } else playStep(s, p.x, p.y, e.gain, e.rate, 1, rain);
    }
  } else { foot.air = false; foot.maxRise = 0; }

  const c = world.companion;
  if (c && !c.inVehicle && c.state !== 'dead' && !c.ragdoll && !world.paused) {
    if (!comp.init) { comp.x = c.x; comp.y = c.y; comp.init = true; }
    const sp = dt > 0 ? Math.min(9, Math.hypot(c.x - comp.x, c.y - comp.y) / dt) : 0;
    comp.x = c.x; comp.y = c.y;
    if (sp > 0.4) {
      const stride = sp > 6 ? 1.05 : 0.75;
      comp.phase += sp * dt;
      if (comp.phase >= stride) {
        comp.phase -= stride;
        playStep(c.water || c.swimming ? 'wet' : surfaceAt(world.map, c.x, c.y), c.x, c.y, sp > 6 ? 0.24 : 0.16, sp > 6 ? 0.9 : 1.02, 1, rain);
      }
    }
  } else if (c) { comp.x = c.x; comp.y = c.y; }

  pedTimer -= dt;
  if (pedTimer <= 0) {
    pedTimer = 0.3;
    pedList.length = 0;
    const L = K.listener;
    for (const ped of world.pedestrians) {
      if (ped.state === 'dead' || !(ped.speed > 0.3)) continue;
      const d = Math.hypot(ped.x - L.x, ped.y - L.z);
      if (d > 20) continue;
      pedList.push(ped);
    }
    pedList.sort((a, b) => Math.hypot(a.x - L.x, a.y - L.z) - Math.hypot(b.x - L.x, b.y - L.z));
    if (pedList.length > 6) pedList.length = 6;
    for (const ped of pedList) {
      let st = pedState.get(ped);
      if (!st) { st = { phase: Math.random(), surface: 'klinkers' }; pedState.set(ped, st); }
      st.surface = surfaceAt(world.map, ped.x, ped.y);
    }
  }
  if (world.paused) return;
  for (const ped of pedList) {
    const st = pedState.get(ped);
    if (!st || ped.state === 'dead') continue;
    const sp = ped.speed || 0;
    const run = sp > 3;
    const stride = run ? 1.0 : 0.72;
    st.phase += sp * dt;
    if (st.phase >= stride) {
      st.phase -= stride;
      playStep(st.surface, ped.x, ped.y, run ? (ped.isCop ? 0.2 : 0.15) : 0.09, run ? 0.9 : 1.03, 0, rain);
    }
  }
}

// --- combat -------------------------------------------------------------

function trackBullets() {
  frame++;
  vanished.length = 0;
  return frame;
}

function combat(dt, world) {
  const p = world.player;
  const f = trackBullets();
  for (const b of world.bullets) bulletFrame.set(b, f);
  for (const b of prevBullets) if (bulletFrame.get(b) !== f && vanished.length < 16) vanished.push(b);
  prevBullets.length = 0;
  for (const b of world.bullets) prevBullets.push(b);

  const eff = getCombatEffect();
  if (eff && eff !== lastEffect) {
    lastEffect = eff;
    if (eff.type === 'melee') {
      meleeAt = world.time;
      const slow = eff.weapon === 'polsstok' ? 0.6 : eff.weapon === 'knuppel' || eff.weapon === 'klomp' ? 0.8 : 1;
      at('whoosh', p.x, p.y, { h: 1.2, gain: slow < 1 ? 0.3 : 0.22, rate: rnd(0.9, 1.15) * slow });
    }
  }

  for (const ped of world.pedestrians) {
    const prev = pedHealth.get(ped);
    pedHealth.set(ped, ped.health);
    if (prev !== undefined && ped.health < prev) {
      const near = Math.hypot(ped.x - p.x, ped.y - p.y) < (world.weapon === 'polsstok' ? 3.8 : 2.3);
      if (near && world.time - meleeAt < 0.2) at('punch', ped.x, ped.y, { h: 1.2, gain: 0.4, rate: rnd(0.9, 1.1) });
      else at('body_hit', ped.x, ped.y, { h: 1, gain: 0.3, rate: rnd(0.9, 1.15) });
    }
    if (ped.state === 'dead' && !pedDead.has(ped)) {
      pedDead.add(ped);
      const x = ped.x, y = ped.y;
      later(rnd(0.25, 0.4), () => at('body_fall', x, y, { h: 0.1, gain: 0.35, rate: rnd(0.9, 1.1) }));
    }
  }

  const ch = world.companion;
  if (ch) {
    const prev = pedHealth.get(ch);
    pedHealth.set(ch, ch.health);
    if (prev !== undefined && ch.health < prev - 1) at('body_hit', ch.x, ch.y, { h: 1, gain: 0.3 });
  }

  const mouse = world.input && world.input.mouse;
  const down = !!(mouse && mouse.down) && !world.paused && !world.uiPaused;
  const gun = isRangedWeapon(world.weapon);
  const firearm = isGunWeapon(world.weapon);
  const ammo = world.ammo[world.weapon] || 0;
  if (down && gun && ammo <= 0) {
    const t = now();
    if (!weap.mouse || t > weap.dryAt) { at('dry_click', p.x, p.y, { h: 1.2, gain: 0.25 }); weap.dryAt = t + 0.45; }
  }
  weap.mouse = down;

  if (world.weapon !== weap.weapon) {
    weap.weapon = world.weapon;
    weap.shots = 0;
    if (firearm && ammo > 0) at(world.weapon === 'shotgun' || world.weapon === 'jachtgeweer' ? 'pump' : 'slide', p.x, p.y, { h: 1.2, gain: 0.26, delay: 0.08 });
  } else if (firearm && ammo < weap.ammo) {
    const fired = weap.ammo - ammo;
    weap.shots += fired;
    onShot(world, fired);
  }
  weap.ammo = ammo;
}

function onShot(world, fired) {
  const p = world.player;
  const src = p.inVehicle || p;
  const w = world.weapon;
  const ang = src.angle || 0;
  const cx = src.x - Math.sin(ang) * 0.8, cy = src.y + Math.cos(ang) * 0.8;
  if (w === 'jachtgeweer') {
    later(0.45, () => at('slide', src.x, src.y, { h: 1.2, gain: 0.3, rate: 0.7 }));
    if (!p.inVehicle) later(0.9, () => at('casing_' + Math.floor(Math.random() * 3), cx, cy, { h: 0, gain: 0.1, rate: 0.7, prio: 0 }));
    return;
  }
  if (w === 'shotgun') {
    later(0.28, () => at('pump', src.x, src.y, { h: 1.2, gain: 0.26 }));
    if (!p.inVehicle) later(0.75, () => at('casing_' + Math.floor(Math.random() * 3), cx, cy, { h: 0, gain: 0.1, rate: 0.55, prio: 0 }));
    return;
  }
  if (!p.inVehicle && (w !== 'uzi' || weap.shots % 2 === 0)) {
    later(rnd(0.35, 0.6), () => at('casing_' + Math.floor(Math.random() * 3), cx, cy, { h: 0, gain: w === 'uzi' ? 0.07 : 0.1, rate: rnd(0.95, 1.1), prio: 0 }));
  }
  const mag = w === 'uzi' ? 32 : 12;
  if (weap.shots >= mag && (world.ammo[w] || 0) > 0) {
    weap.shots = 0;
    later(0.25, () => at('mag_out', src.x, src.y, { h: 1.2, gain: 0.24 }));
    later(0.7, () => at('mag_in', src.x, src.y, { h: 1.2, gain: 0.26 }));
    later(0.98, () => at('slide', src.x, src.y, { h: 1.2, gain: 0.24 }));
  }
  if (fired > 3) weap.shots = weap.shots % mag;
}

function whizzBy(world) {
  const p = world.player;
  let n = 0;
  for (const b of world.bullets) {
    if (b.owner === 'player' || whizzed.has(b)) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const ux = b.vx / sp, uy = b.vy / sp;
    const rx = p.x - b.x, ry = p.y - b.y;
    const along = rx * ux + ry * uy;
    if (along > 0) continue;
    whizzed.add(b);
    const perp = Math.abs(rx * uy - ry * ux);
    if (perp > 3.5 || along < -6 || b.traveled < 3 || n >= 2) continue;
    n++;
    at('whizz', b.x, b.y, { h: 1.3, gain: 0.34 * (1 - perp / 4), rate: rnd(0.9, 1.15), ref: 2, rolloff: 1.5, range: 20, prio: 2 });
  }
}

// --- vehicles -----------------------------------------------------------

function isParkedCar(v) {
  return !v.road && v.driver !== 'player' && !v.isBike && !v.isScooter && !v.isBoat && !v.isBus && !v.isPolice
    && !v.wrecked && !v._roadblock && Math.abs(v.speed) < 0.3;
}

function carLike(v) { return !v.isBike && !v.isScooter && !v.isBoat; }

function buildAlarm() {
  const ctx = K.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 800;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = K.makePanner({ ref: 6, rolloff: 1, model: 'equalpower' });
  osc.connect(lp).connect(gain).connect(panner).connect(K.buses.sfx);
  osc.start();
  return { osc, gain, panner, car: null, until: 0, next: 0, phase: 0, step: 0 };
}

function triggerAlarm(v) {
  if (!alarm) alarm = buildAlarm();
  const t = now();
  if (alarm.car && alarm.car !== v && t < alarm.until && K.dist(alarm.car.x, alarm.car.y) < K.dist(v.x, v.y)) return;
  const st = vehState.get(v);
  if (st && t < st.alarmCooldown) return;
  if (st) st.alarmCooldown = t + 25;
  alarm.car = v;
  alarm.until = t + 11;
  alarm.next = t;
  alarm.phase = 0;
  alarm.step = 0;
  K.setPannerPos(alarm.panner, v.x, v.y, 0.8);
}

function updateAlarm(dt, paused) {
  if (!alarm) return;
  const t = now();
  const a = alarm;
  if (!a.car || t > a.until || a.car.wrecked || a.car.driver === 'player' || K.muted()) {
    if (a.car) { a.gain.gain.setTargetAtTime(0, t, 0.03); a.car = null; }
    return;
  }
  if (paused) {
    a.until += dt;
    a.next = t;
    a.gain.gain.setTargetAtTime(0, t, 0.02);
    return;
  }
  K.setPannerPos(a.panner, a.car.x, a.car.y, 0.8, true);
  if (t < a.next) return;
  const elapsed = 11 - (a.until - t);
  const f = a.osc.frequency, g = a.gain.gain;
  if (elapsed < 3.6) {
    f.setValueAtTime(650, t);
    f.linearRampToValueAtTime(1500, t + 0.34);
    g.setTargetAtTime(0.09, t, 0.01);
    a.next = t + 0.36;
  } else if (elapsed < 7.2) {
    a.step ^= 1;
    f.setValueAtTime(a.step ? 1900 : 1350, t);
    g.setTargetAtTime(0.08, t, 0.005);
    a.next = t + 0.11;
  } else {
    a.step ^= 1;
    f.setValueAtTime(460, t);
    g.setTargetAtTime(a.step ? 0.1 : 0, t, 0.006);
    a.next = t + 0.24;
  }
}

function buildLoopVoice(type, freq, filterType, filterFreq, q, bus) {
  const ctx = K.ctx;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const flt = ctx.createBiquadFilter();
  flt.type = filterType;
  flt.frequency.value = filterFreq;
  flt.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = K.makePanner({ ref: 5, rolloff: 1.2, model: 'equalpower' });
  osc.connect(flt).connect(gain).connect(panner).connect(bus || K.buses.sfx);
  osc.start();
  return { osc, flt, gain, panner, level: 0, target: null, fresh: true };
}

function driveVoice(voice, target, level, dt) {
  const t = now();
  if (target !== voice.target) { voice.target = target; voice.fresh = true; }
  voice.level += (level - voice.level) * Math.min(1, dt * 5);
  if (voice.level < 0.0005 && level === 0) voice.level = 0;
  voice.gain.gain.setTargetAtTime(voice.level, t, 0.05);
  if (target) {
    K.setPannerPos(voice.panner, target.x, target.y, 0.6, !voice.fresh);
    voice.fresh = false;
  }
}

function nearestOf(world, filter, range) {
  let best = null, bd = range;
  for (const v of world.vehicles) {
    if (!filter(v)) continue;
    const d = K.dist(v.x, v.y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function vehicles(dt, world) {
  const t = now();
  const p = world.player;
  const pv = p.inVehicle;
  const paused = world.paused;

  for (const v of world.vehicles) {
    let st = vehState.get(v);
    const speed = Math.abs(v.speed);
    if (!st) {
      st = { health: v.health, maxRecent: speed, stopT: 0, doors: false, openDoors: false, alarmCooldown: 0, handbrake: false, surface: v.surface, strokes: Math.random() };
      vehState.set(v, st);
      continue;
    }
    if (v.health < st.health - 0.5) {
      const dmg = st.health - v.health;
      let byBullet = false;
      for (const b of vanished) if (Math.abs(b.x - v.x) < v.halfLen + 2 && Math.abs(b.y - v.y) < v.halfLen + 2) { byBullet = true; break; }
      if (byBullet && carLike(v)) {
        // the hit itself is audio.js's bullet_hit; the first one also breaks glass
        if (!v.wrecked && (!st.glassDone || Math.random() < 0.2)) {
          st.glassDone = true;
          at('glass', v.x, v.y, { h: 1, gain: 0.3, rate: rnd(0.9, 1.1), delay: 0.01 });
        }
      } else if (dmg > 12 && carLike(v) && Math.random() < 0.5) {
        at('glass', v.x, v.y, { h: 1, gain: clamp(dmg / 60, 0.12, 0.3), rate: rnd(0.9, 1.1) });
      }
      if (isParkedCar(v) || (st.parked && !v.wrecked)) triggerAlarm(v);
    }
    st.health = v.health;
    st.parked = isParkedCar(v);
    if (paused) continue;

    st.maxRecent = Math.max(speed, st.maxRecent - dt * 3);
    if (carLike(v) && !v.wrecked && speed < 0.35 && st.maxRecent > 2.2) {
      const d = K.dist(v.x, v.y);
      st.maxRecent = 0;
      if (v.isBus) {
        if (d < 70) at('airbrake', v.x, v.y, { h: 1.2, gain: 0.26, rate: rnd(0.95, 1.05), ref: 5, range: 70 });
        st.openDoors = Math.random() < 0.6;
      } else if (d < 45 && t - lastSquealAt > 2 && Math.random() < (v.driver === 'player' ? 0.15 : 0.06)) {
        lastSquealAt = t;
        const out = K.spatial(v.x, v.y, { h: 0.4, ref: 5, rolloff: 1.1, range: 45, model: 'equalpower' });
        if (out) {
          const f = rnd(2700, 3600);
          K.tone({ freq: f, freqEnd: f * 0.92, type: 'sine', duration: rnd(0.25, 0.45), gain: 0.02, out });
        }
      }
    }
    if (v.isBus && !v.wrecked) {
      if (speed < 0.2) {
        st.stopT += dt;
        if (st.stopT > 1.4 && st.openDoors && !st.doors) { st.doors = true; at('door_hiss', v.x, v.y, { h: 1.5, gain: 0.24, range: 50 }); }
      } else {
        if (st.doors && speed > 0.4) at('door_hiss', v.x, v.y, { h: 1.5, gain: 0.2, rate: 1.12, range: 50 });
        st.doors = false;
        st.stopT = 0;
      }
    }

    if (v._mount === 'horse' && speed > 0.5 && !v.wrecked) {
      if (K.dist(v.x, v.y, 0.3) < 30) {
        st.strokes += speed * dt * 1.4;
        if (st.strokes >= 1) {
          st.strokes -= 1;
          st.hoof = ((st.hoof || 0) + 1) % 4;
          at(`step_klinkers_${st.hoof}`, v.x, v.y, { h: 0.1, gain: 0.16, rate: rnd(0.5, 0.6), prio: 0, range: 30 });
        }
      }
    } else if (v.isBike && speed > 0.8 && !v.wrecked) {
      const d = K.dist(v.x, v.y, 0.6);
      if (d < 14) {
        st.strokes += speed * dt * 1.3;
        if (st.strokes >= 1) {
          st.strokes -= 1;
          at('chain', v.x, v.y, { h: 0.5, gain: 0.05, rate: rnd(0.85, 1.2), prio: 0, range: 14 });
          if (Math.random() < 0.07) at('creak', v.x, v.y, { h: 0.7, gain: 0.05, rate: rnd(0.8, 1.2), prio: 0, range: 14 });
        }
      }
    }

    if (v.isBoat && speed > 0.8 && K.dist(v.x, v.y, 0.3) < 30 && Math.random() < speed * 0.35 * dt) {
      at('hull_slap', v.x, v.y, { h: 0.1, gain: rnd(0.1, 0.22), rate: rnd(0.85, 1.15), prio: 0, range: 30 });
    }
  }

  if (pv && !paused) {
    const st = vehState.get(pv);
    if (st) {
      if (carLike(pv) && pv.handbrake && !st.handbrake && Math.abs(pv.speed) < 3) at('ratchet', pv.x, pv.y, { h: 0.6, gain: 0.16 });
      st.handbrake = !!pv.handbrake;
      if (pv.surface && st.surface && pv.surface !== st.surface && Math.abs(pv.speed) > 3 && carLike(pv) && t - lastRoofThump > 0.25) {
        lastRoofThump = t;
        at('thump', pv.x, pv.y, { h: 0.2, gain: clamp(Math.abs(pv.speed) / 25, 0.12, 0.35), rate: rnd(0.9, 1.1) });
      }
      st.surface = pv.surface;
    }
    updateBlinker(dt, pv);
  } else blinker.on = false;

  if (!scooterVoice) scooterVoice = buildLoopVoice('sawtooth', 300, 'bandpass', 900, 3);
  const synthEngines = K.engineSynth && K.engineSynth();
  const sc = paused || synthEngines ? null : nearestOf(world, (v) => v.isScooter && !v.wrecked && Math.abs(v.speed) > 0.3, 45);
  if (sc) {
    const s = Math.abs(sc.speed);
    scooterVoice.osc.frequency.setTargetAtTime(260 + s * 75 + Math.sin(t * 9) * 8, t, 0.08);
    scooterVoice.flt.frequency.setTargetAtTime(700 + s * 120, t, 0.1);
  }
  driveVoice(scooterVoice, sc, sc ? 0.018 + Math.abs(sc.speed) * 0.003 : 0, dt);

  if (!putterVoice) {
    putterVoice = buildLoopVoice('square', 36, 'lowpass', 240, 1.5);
    const lfo = K.ctx.createOscillator();
    lfo.frequency.value = 8;
    const depth = K.ctx.createGain();
    depth.gain.value = 0.5;
    const am = K.ctx.createGain();
    am.gain.value = 0.5;
    putterVoice.flt.disconnect();
    putterVoice.flt.connect(am).connect(putterVoice.gain);
    lfo.connect(depth).connect(am.gain);
    lfo.start();
    putterVoice.lfo = lfo;
  }
  const boat = paused || synthEngines ? null : nearestOf(world, (v) => v.isBoat && !v.wrecked, 60);
  if (boat) {
    const s = Math.abs(boat.speed);
    putterVoice.lfo.frequency.setTargetAtTime(7 + s * 2.2, t, 0.2);
    putterVoice.osc.frequency.setTargetAtTime(34 + s * 4, t, 0.2);
  }
  driveVoice(putterVoice, boat, boat ? 0.07 + Math.abs(boat.speed) * 0.012 : 0, dt);

  if (!beepVoice) { beepVoice = buildLoopVoice('sine', 1050, 'highpass', 400, 0.7); beepVoice.on = false; beepVoice.next = 0; }
  const rev = paused ? null : nearestOf(world, (v) => v.speed < -0.3 && !v.wrecked && (v.isBus || (v.model && v.model.name === 'van')), 50);
  if (rev !== beepVoice.target) { beepVoice.target = rev; beepVoice.fresh = true; beepVoice.next = t; }
  if (rev) {
    K.setPannerPos(beepVoice.panner, rev.x, rev.y, 1.2, !beepVoice.fresh);
    beepVoice.fresh = false;
    if (t >= beepVoice.next) {
      beepVoice.on = !beepVoice.on;
      beepVoice.gain.gain.setTargetAtTime(beepVoice.on ? 0.06 : 0, t, 0.004);
      beepVoice.next = t + 0.45;
    }
  } else if (beepVoice.on) { beepVoice.on = false; beepVoice.gain.gain.setTargetAtTime(0, t, 0.01); }
}

function updateBlinker(dt, v) {
  const slowTurn = carLike(v) && Math.abs(v.speed) < 7 && Math.abs(v.steer || 0) > 0.45;
  if (slowTurn) { blinker.hold += dt; blinker.off = 0; } else { blinker.off += dt; blinker.hold = 0; }
  if (!blinker.on && blinker.hold > 0.25) { blinker.on = true; blinker.next = now(); }
  if (blinker.on && blinker.off > 0.6) blinker.on = false;
  if (!blinker.on) return;
  const t = now();
  if (t < blinker.next) return;
  blinker.tick = !blinker.tick;
  blinker.next = t + 0.36;
  K.noise({ duration: 0.018, freq: blinker.tick ? 2600 : 2100, q: 6, gain: 0.08, type: 'bandpass', bus: K.buses.ui, prio: 0 });
  K.tone({ freq: blinker.tick ? 1400 : 1100, type: 'square', duration: 0.012, gain: 0.012, bus: K.buses.ui, prio: 0 });
}

// --- police -------------------------------------------------------------

function nearestPolice(world, range) {
  let best = null, bd = range;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.driver === 'player') continue;
    const d = K.dist(v.x, v.y);
    if (d < bd) { bd = d; best = v; }
  }
  for (const ped of world.pedestrians) {
    if (!ped.isCop || ped.state === 'dead') continue;
    const d = K.dist(ped.x, ped.y);
    if (d < bd) { bd = d; best = ped; }
  }
  return best;
}

function police(dt, world) {
  const t = now();
  if (world.paused) return;
  const pv = world.player.inVehicle;
  const inCop = pv && pv.isPolice;
  if (t >= radioAt) {
    const searching = world.police && world.police.searching;
    if (world.wanted > 0) {
      const unit = nearestPolice(world, 45);
      if (unit) at('radio_' + Math.floor(Math.random() * 4), unit.x, unit.y, { h: 1.3, gain: 0.16, rate: rnd(0.95, 1.05), ref: 4, rolloff: 1.3, range: 45 });
      radioAt = t + (searching ? rnd(3.5, 7) : rnd(5, 10));
    } else radioAt = t + rnd(6, 12);
    if (inCop && Math.random() < 0.7) K.buf('radio_' + Math.floor(Math.random() * 4), { bus: K.buses.sfx, gain: 0.07, rate: rnd(0.95, 1.05), prio: 0, delay: 0.3 });
  }

  const heli = world.policeHeli;
  if (heli && heli.spotOn && !heliHum) {
    heliHum = buildLoopVoice('sawtooth', 120, 'lowpass', 500, 2);
    const osc2 = K.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 180;
    const g2 = K.ctx.createGain();
    g2.gain.value = 0.3;
    osc2.connect(g2).connect(heliHum.flt);
    osc2.start();
  }
  if (heliHum) driveVoice(heliHum, heli && heli.spotOn ? { x: heli.x, y: heli.y } : null, heli && heli.spotOn ? 0.05 : 0, dt);
  if (heliHum && heli) K.setPannerPos(heliHum.panner, heli.x, heli.y, heli.z ?? 30, true);
}

const PROP_BUF = { wood: 'prop_wood', metal: 'prop_metal', plastic: 'prop_plastic', glass: 'glass', foliage: 'prop_foliage' };
const propLast = {};
let treeFallAt = -10;

export function propHit(e, x, y) {
  if (!K) return;
  const mat = PROP_BUF[e.material] ? e.material : 'wood';
  const t = now();
  if (t - (propLast[mat] || -1) < 0.04) return;
  propLast[mat] = t;
  const k = clamp(typeof e.strength === 'number' ? e.strength : 0.5, 0, 1);
  const o = { h: 0.6, gain: 0.1 + k * 0.24, rate: rnd(0.9, 1.1) * (1.1 - k * 0.2), ref: 4, rolloff: 1.1, range: 70 };
  at(PROP_BUF[mat], x, y, o);
  if (mat === 'metal' && k > 0.6) at('thump', x, y, { h: 0.2, gain: 0.2 * k, rate: 0.8 });
  if (mat === 'foliage') {
    at('prop_wood', x, y, { h: 1, gain: 0.1 + k * 0.15, rate: rnd(1.1, 1.3), range: 50 });
    if (k > 0.75 && t - treeFallAt > 2) {
      treeFallAt = t;
      at('tree_fall', x, y, { h: 3, gain: 0.45, rate: rnd(0.92, 1.05), ref: 8, rolloff: 0.9, range: 110, prio: 2 });
      K.duckAmb(0.3, 3);
    }
  }
}

export function updateFoley(dt, world) {
  if (!K) return;
  runQueue();
  combat(dt, world);
  vehicles(dt, world);
  updateAlarm(dt, world.paused);
  if (K.muted()) return;
  footsteps(dt, world);
  whizzBy(world);
  police(dt, world);
}

export function foleyStats() {
  return { queued: queue.length, pedSteps: pedList.length, alarm: !!(alarm && alarm.car) };
}
