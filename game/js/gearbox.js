// Gearbox for player-driven vehicles: cars, vans, trucks, the bus, the tractor,
// motorbikes and the geared classic moped. Pure maths, no DOM, node-testable.
//
// Three shift modes (setting `shiftMode`): 'auto' (default: the gearbox only
// reports gear and revs, the driving model is untouched), 'manual' (sequential
// up/down, no clutch pedal, the engine is protected against stalling and
// over-revving) and 'clutch' (clutch key too: shifts need it, the engine can
// stall). Each profile lists gear tops as fractions of the vehicle's top speed:
// gear g runs out at tops[g-1] * top, which is where the revs reach the redline.
//
// A position layout is the order the sequential shifter walks through:
// cars N-1-2-3..., motorbikes 1-N-2-3...; N is neutral (0).

export const SHIFT_MODES = ['auto', 'manual', 'clutch'];

const car5 = [0.15, 0.3, 0.48, 0.7, 1.05];
const sport6 = [0.12, 0.22, 0.34, 0.5, 0.72, 1.05];

export const PROFILES = {
  car: { tops: car5, layout: ['N', 1, 2, 3, 4, 5], idle: 800, red: 6200, shiftTime: 0.15, engineBrake: 2.4 },
  hero: { tops: car5, layout: ['N', 1, 2, 3, 4, 5], idle: 850, red: 6200, shiftTime: 0.15, engineBrake: 2.4 },
  sport: { tops: sport6, layout: ['N', 1, 2, 3, 4, 5, 6], idle: 850, red: 7000, shiftTime: 0.14, engineBrake: 2.8 },
  van: { tops: car5, layout: ['N', 1, 2, 3, 4, 5], idle: 750, red: 4300, shiftTime: 0.26, engineBrake: 2.6 },
  truck: { tops: [0.1, 0.2, 0.33, 0.5, 0.75, 1.05], layout: ['N', 1, 2, 3, 4, 5, 6], idle: 600, red: 2500, shiftTime: 0.34, engineBrake: 3.4 },
  bus: { tops: [0.22, 0.45, 0.72, 1.05], layout: ['N', 1, 2, 3, 4], idle: 600, red: 2300, shiftTime: 0.3, engineBrake: 3 },
  tractor: { tops: [0.22, 0.45, 0.72, 1.05], layout: ['N', 1, 2, 3, 4], idle: 700, red: 2400, shiftTime: 0.3, engineBrake: 3 },
  motorSport: { tops: [0.1, 0.18, 0.28, 0.4, 0.62, 1.05], layout: [1, 'N', 2, 3, 4, 5, 6], idle: 1300, red: 13000, shiftTime: 0.08, engineBrake: 2.2, wheelie: 1 },
  motorNaked: { tops: [0.11, 0.2, 0.31, 0.45, 0.68, 1.05], layout: [1, 'N', 2, 3, 4, 5, 6], idle: 1200, red: 10000, shiftTime: 0.1, engineBrake: 2, wheelie: 0.8 },
  motorOld: { tops: [0.13, 0.24, 0.38, 0.56, 0.78, 1.05], layout: [1, 'N', 2, 3, 4, 5, 6], idle: 1000, red: 7500, shiftTime: 0.16, engineBrake: 1.8, wheelie: 0.4 },
  moped: { tops: [0.22, 0.45, 0.72, 1.05], layout: ['N', 1, 2, 3, 4], idle: 1700, red: 8000, shiftTime: 0.12, engineBrake: 1.4, launchRpm: 0.5 },
};

// hysteresis, as the engine sound's automatic always used
const DOWNSHIFT_GAP = 0.04;
// after an automatic shift, a reversal waits this long unless the speed is clearly past the gap
const AUTO_DWELL = 1.2;
const AUTO_DWELL_BREAK = 0.05;
const RPM_FRAC_FLOOR = 0.93;
const LIMITER_HOLD = 0.09;
const STALL_RESTART = 1;
const GRIND_HINT = 0.6;

// Which profile a vehicle gets, or null for vehicles without a gearbox
// (bicycles, electric steps, boats, helicopters, horses, the quad).
export function profileFor(v) {
  if (!v || v.isBoat || v.isHeli || v._mount) return null;
  const m = v.model || {};
  if (m.motorbike) return m.motorbike === 'naked' ? 'motorNaked' : m.motorbike === 'old' ? 'motorOld' : 'motorSport';
  if (v.isBike) return null;
  if (v.isScooter) return m.geared ? 'moped' : null;
  if (v.isBus || m.name === 'bus' || m.name === 'midibus') return 'bus';
  const n = m.name;
  if (n === 'quad') return null;
  if (m.electric) return null; // elektrisch: geen versnellingsbak
  if (n === 'tractor') return 'tractor';
  if (n === 'truck' || n === 'foodtruck' || n === 'cashvan') return 'truck';
  if (n === 'van') return 'van';
  if (n === 'sport' || n === 'police' || v.isPolice) return 'sport';
  if (v.isHeroCar || n === 'escort') return 'hero';
  return 'car';
}

export function createGearbox(profileId) {
  const p = PROFILES[profileId];
  if (!p) return null;
  const first = p.layout.indexOf(1);
  return {
    id: profileId, p, pos: first, gear: 1,
    rpm: p.idle, free: p.idle, shiftT: 0, autoT: 0, autoDir: 0, limiterT: 0, stallT: 0, grindT: 0, refuseT: 0, upT: 0,
    torque: 1, engineBrake: 0, shiftLight: false, limiter: false, stalled: false, reverse: false,
    mode: 'auto', clutchIn: false,
  };
}

export function gearAt(p, pos) {
  const t = p.layout[pos];
  return t === 'N' ? 0 : t;
}

// Speed fraction of the top speed at which a gear's revs reach the redline.
function wheelRpm(gb, gear, frac) {
  const p = gb.p;
  if (gear < 1) return p.idle;
  return Math.max(p.idle, p.red * RPM_FRAC_FLOOR * frac / p.tops[gear - 1]);
}

// Power over the rev range: weak under idle+, full from half the range, a
// slight drop towards the redline, nothing on the limiter.
export function torqueCurve(r) {
  if (r >= 1) return 0;
  if (r < 0.14) return 0.32;
  if (r < 0.5) return 0.32 + 0.74 * (r - 0.14) / 0.36;
  if (r < 0.86) return 1.06;
  return 1.06 - 0.31 * (r - 0.86) / 0.14;
}

// The gear the automatic would pick at this speed fraction.
export function autoGear(p, frac, current) {
  let g = Math.min(Math.max(current, 1), p.tops.length);
  while (g < p.tops.length && frac > p.tops[g - 1]) g++;
  while (g > 1 && frac < p.tops[g - 2] - DOWNSHIFT_GAP) g--;
  return g;
}

// Whether the speed is well past the shift point of the gear the automatic wants to leave.
function autoGearClear(p, frac, from, dir) {
  return dir < 0 ? frac < p.tops[from - 2] - DOWNSHIFT_GAP - AUTO_DWELL_BREAK : frac > p.tops[from - 1] + AUTO_DWELL_BREAK;
}

// One sequential shift. dir +1 up, -1 down. Returns 'ok', 'grind' (clutch
// mode without the clutch in), 'refuse' (a downshift that would over-rev) or
// 'none' (already at the end).
export function shift(gb, dir, frac) {
  if (!gb || gb.mode === 'auto') return 'none';
  const p = gb.p;
  const np = gb.pos + (dir > 0 ? 1 : -1);
  if (np < 0 || np >= p.layout.length) return 'none';
  if (gb.mode === 'clutch' && !gb.clutchIn) {
    gb.grindT = GRIND_HINT;
    return 'grind';
  }
  const g = gearAt(p, np);
  if (dir < 0 && g >= 1 && wheelRpm(gb, g, frac) > p.red * 0.98) {
    gb.refuseT = GRIND_HINT;
    return 'refuse';
  }
  gb.pos = np;
  gb.gear = g;
  gb.shiftT = p.shiftTime;
  gb.upT = dir > 0 ? p.shiftTime : 0;
  return 'ok';
}

// Advance the gearbox. in: { speed (signed m/s), top (m/s), throttle (-1..1), mode, clutchIn }.
// Fills gb.rpm, gb.gear, gb.torque (0..1 factor on the engine's pull), gb.engineBrake
// (extra m/s2 of braking off the throttle), gb.shiftLight, gb.limiter, gb.stalled.
export function stepGearbox(gb, inp, dt) {
  const p = gb.p;
  const mode = SHIFT_MODES.includes(inp.mode) ? inp.mode : 'auto';
  if (mode !== gb.mode) {
    gb.mode = mode;
    if (mode !== 'auto') { gb.pos = Math.max(0, p.layout.indexOf(gb.gear)); if (gb.pos < 0) gb.pos = p.layout.indexOf(1); }
    gb.stallT = 0;
    gb.stalled = false;
    if (mode === 'clutch' && Math.abs(inp.speed) < 0.5 && p.layout.includes('N')) { gb.pos = p.layout.indexOf('N'); gb.gear = 0; }
  }
  gb.clutchIn = mode === 'clutch' && !!inp.clutchIn;
  const speed = inp.speed, abs = Math.abs(speed);
  const frac = inp.top > 0 ? abs / inp.top : 0;
  const thr = inp.throttle;
  gb.shiftT = Math.max(0, gb.shiftT - dt);
  gb.upT = Math.max(0, gb.upT - dt);
  gb.autoT = Math.max(0, gb.autoT - dt);
  gb.limiterT = Math.max(0, gb.limiterT - dt);
  gb.grindT = Math.max(0, gb.grindT - dt);
  gb.refuseT = Math.max(0, gb.refuseT - dt);
  gb.reverse = speed < -0.2 || (thr < 0 && abs < 0.3);

  if (mode === 'auto') {
    if (gb.reverse) {
      gb.gear = 1;
    } else {
      let g = autoGear(p, frac, gb.gear);
      // speed hovering on a shift point (hills, grass, traffic) must not flip the gear back and forth
      const dir = Math.sign(g - gb.gear);
      if (dir && dir === -gb.autoDir && gb.autoT > 0 && !autoGearClear(p, frac, gb.gear, dir)) g = gb.gear;
      else if (dir) { gb.autoDir = dir; gb.autoT = AUTO_DWELL; }
      gb.gear = g;
    }
    gb.pos = Math.max(0, p.layout.indexOf(gb.gear));
    let rpm = wheelRpm(gb, gb.reverse ? 1 : gb.gear, frac);
    if (gb.reverse) rpm = p.idle + (p.red * 0.7 - p.idle) * Math.min(1, abs / (inp.top * 0.25));
    else if (gb.gear === 1 && thr > 0 && abs < 4) rpm = Math.max(rpm, p.idle + (p.launchRpm ? p.red * p.launchRpm : 700) * (1 - abs / 4));
    gb.rpm = rpm;
    gb.torque = 1;
    gb.engineBrake = 0;
    gb.limiter = false;
    gb.stalled = false;
    gb.shiftLight = rpm >= p.red * 0.88;
    return gb;
  }

  const gear = gearAt(p, gb.pos);
  gb.gear = gear;
  const engaged = gear >= 1 && !gb.clutchIn;
  let rpm;
  if (gb.stalled) {
    gb.stallT -= dt;
    rpm = 0;
    if (gb.stallT <= 0 && (gb.clutchIn || gear === 0 || mode !== 'clutch')) { gb.stalled = false; rpm = p.idle; }
    gb.torque = 0; gb.engineBrake = 0; gb.limiter = false; gb.shiftLight = false;
    gb.rpm = rpm; gb.free = rpm;
    return gb;
  }
  if (gb.reverse) {
    // reverse is automatic: the revs follow the wheels
    rpm = p.idle + (p.red * 0.7 - p.idle) * Math.min(1, abs / (inp.top * 0.25));
    if (thr < 0 && abs < 4) rpm = Math.max(rpm, p.idle + 700 * (1 - abs / 4));
    gb.free = rpm;
    gb.rpm = rpm;
    gb.torque = 1;
    gb.engineBrake = 0;
    gb.limiter = false;
    gb.shiftLight = false;
    return gb;
  }

  if (engaged) {
    rpm = wheelRpm(gb, gear, frac);
    const raw = p.red * RPM_FRAC_FLOOR * frac / p.tops[gear - 1];
    // slipping clutch: a standing start or a lazy gear lifts the revs until the wheels catch up
    if (thr > 0 && (mode === 'manual' || gear === 1)) {
      const target = p.launchRpm || 0.5;
      const v0 = Math.max(0.1, target / RPM_FRAC_FLOOR * p.tops[gear - 1] * inp.top);
      const k = Math.min(1, abs / v0);
      const slip = p.idle + (p.red * target - p.idle) * Math.min(1, thr) * (1 - k * k);
      rpm = Math.max(rpm, slip);
    }
    if (mode === 'clutch' && raw < p.idle * 0.8 && !(gear === 1 && thr > 0.4)) {
      gb.stalled = true;
      gb.stallT = STALL_RESTART;
      gb.torque = 0; gb.engineBrake = 0; gb.rpm = 0; gb.free = 0; gb.shiftLight = false; gb.limiter = false;
      return gb;
    }
    gb.free = rpm;
  } else {
    // neutral or the clutch in: the engine revs freely
    const target = thr > 0 ? p.idle + (p.red * 0.97 - p.idle) * Math.min(1, thr) : p.idle;
    const rate = p.red * (thr > 0 ? 1.7 : 1.1);
    gb.free += Math.max(-rate * dt, Math.min(rate * dt, target - gb.free));
    rpm = gb.free;
  }

  const r = rpm / p.red;
  if (rpm >= p.red && thr > 0) gb.limiterT = LIMITER_HOLD;
  gb.limiter = gb.limiterT > 0;
  if (gb.limiter) rpm = Math.min(rpm, p.red * (0.985 - 0.015 * Math.random()));
  gb.rpm = rpm;
  gb.shiftLight = r >= 0.88;

  if (!engaged || gb.shiftT > 0 || gb.limiter) {
    gb.torque = 0;
  } else {
    gb.torque = torqueCurve(r);
  }
  // off the throttle: engine braking, stronger in the low gears and with the revs
  if (engaged && thr <= 0) {
    const n = p.tops.length;
    const lowGear = n > 1 ? 1.4 - 0.9 * (gear - 1) / (n - 1) : 1;
    gb.engineBrake = p.engineBrake * Math.min(1, Math.max(0, r - 0.1) / 0.6) * lowGear;
  } else gb.engineBrake = 0;
  return gb;
}

// How a bike's front wheel may lift under power: strong in the low gears, wide open.
export function wheelieLift(gb, frac, throttle) {
  if (!gb || !gb.p.wheelie || gb.gear < 1 || gb.gear > 2 || throttle < 0.9 || frac > 0.35 || gb.torque < 0.7) return 0;
  return gb.p.wheelie * (gb.gear === 1 ? 1 : 0.55);
}

// What the HUD shows of a gearbox.
export function gearboxReadout(gb) {
  return { mode: gb.mode, layout: gb.p.layout, pos: gb.pos, gear: gb.gear, shiftLight: gb.shiftLight, limiter: gb.limiter, stalled: gb.stalled, grind: gb.grindT > 0, refuse: gb.refuseT > 0, clutchIn: gb.clutchIn };
}
