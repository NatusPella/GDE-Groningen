// Skatepark: a skateboard, a few ramps and rails, and trick scoring with
// combos. Pure maths, no DOM and no THREE: skatepark.js draws it and feeds it
// the keys; scripts/minigames_test.mjs checks it in node.
//
// The board rides in the park's own frame: u along the long side, v across.
// The ground is a height field made of features: a quarter pipe at each end
// (a circular transition that rises to a lip), kickers, a fun box and rails.
// Riding up a ramp costs speed (gravity along the slope); over a lip the board
// leaves the surface with the speed it had, and in the air you spin (A/D),
// kickflip (E) or heelflip (F) and grab (S). A landing is clean when the board
// has turned a multiple of half a turn and the flip is done; otherwise it is
// a bail and the unbanked chain is gone. Grinds lock on to a rail or a ledge
// and have a balance to hold. Points come per trick, multiplied by the
// number of different tricks in the chain (a repeat counts for less); a
// chain banks after a pause on the ground, like the drift zones.
import { scaleTimeLimit, scaleTarget } from './difficulty.js'; // #800: stand schaalt ronde en medailles

export const G = 9.81;
export const PARK = { hu: 25, hv: 13 };
const DECK = 1.2;
export const RUN_S = 90;
export const MEDAL_AT = [1200, 3200, 6500];

// #800: de moeilijkheidsstand schaalt de ronde en de medailledrempels. Standaard (de standaard)
// geeft exact de oude waarden: 90 seconden en dezelfde drie drempels. De punten zijn 'hoger is
// beter', dus een ruimere stand verlaagt de drempel en een strengere stand verhoogt hem.
export const runSeconds = (mode = 'standaard') => scaleTimeLimit(RUN_S, mode);
export const medalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false)));

export const SKATE = {
  maxPush: 8.4, accel: 5.2, friction: 0.32, brake: 9, turn: 2.5, ollie: 3.5,
  spinRate: 7.2, flipTime: 0.55, spinSlack: 0.75, grace: 1.3, maxMult: 6,
  grindRange: 0.55, balanceRate: 2.6, balanceKick: 6.5, stun: 1.1,
};

export const FEATURES = [
  // quarter pipes at both ends: u0 where the transition starts, u1 the lip
  { type: 'quarter', u0: -21.5, u1: -24.2, v0: -9.5, v1: 9.5, h: 1.6, R: 2.9 },
  { type: 'quarter', u0: 21.5, u1: 24.2, v0: -9.5, v1: 9.5, h: 1.6, R: 2.9 },
  // a kicker on each side of the middle
  { type: 'kicker', u0: 5, u1: 8.2, v0: 6.5, v1: 10.5, h: 0.62 },
  { type: 'kicker', u0: -5, u1: -8.2, v0: -10.5, v1: -6.5, h: 0.62 },
  // the fun box in the middle with ledges on both long sides
  { type: 'box', u0: -3.2, u1: 3.2, v0: -1.6, v1: 1.6, h: 0.55 },
  // two flat rails
  { type: 'rail', u0: 9, v0: -4.5, u1: 17, v1: -4.5, h: 0.5 },
  { type: 'rail', u0: -17, v0: 4.5, u1: -9, v1: 4.5, h: 0.5 },
];

// The surface height under (u, v).
export function surfaceAt(feats, u, v) {
  let z = 0;
  for (const f of feats) {
    if (f.type === 'rail') continue;
    if (v < f.v0 || v > f.v1) continue;
    if (f.type === 'box') {
      if (u >= f.u0 && u <= f.u1) z = Math.max(z, f.h);
    } else if (f.type === 'kicker') {
      const lo = Math.min(f.u0, f.u1), hi = Math.max(f.u0, f.u1);
      if (u < lo || u > hi) continue;
      const k = (u - f.u0) / (f.u1 - f.u0);
      z = Math.max(z, f.h * k * k * (0.6 + 0.4 * k));
    } else if (f.type === 'quarter') {
      // the transition from u0 to the lip at u1, then a coping deck up to the fence
      const sg = Math.sign(f.u1 - f.u0);
      const d = (u - f.u0) * sg;
      if (d < 0 || d > Math.abs(f.u1 - f.u0) + DECK) continue;
      const D = Math.sqrt(f.R * f.R - (f.R - f.h) * (f.R - f.h));
      const dd = Math.min(d, D);
      z = Math.max(z, f.R - Math.sqrt(Math.max(0, f.R * f.R - dd * dd)));
    }
  }
  return z;
}

export function createBoard() {
  return {
    u: 0, v: 0, a: 0, speed: 0, z: 0, vz: 0, grounded: true, spin: 0, flip: null, flipT: 0, grab: 0, grabbed: false,
    grind: null, stun: 0, air: 0, maxZ: 0, takeoffZ: 0, rise: 0, tricks: [], doneFlips: [], lastEvent: null,
    bails: 0, landed: 0, grinds: 0, crouch: 0,
  };
}

function startAir(b, vz, zs) {
  b.grounded = false;
  b.vz = vz;
  b.spin = 0;
  b.flip = null;
  b.flipT = 0;
  b.grab = 0;
  b.grabbed = false;
  b.doneFlips = [];
  b.air = 0;
  b.takeoffZ = zs;
  b.maxZ = b.z;
  b.rise = 0;
}

// --- combos --------------------------------------------------------------------------------------

export function createCombo() {
  return { chain: false, cur: 0, mult: 1, names: new Set(), gap: 0, total: 0, best: 0, tricks: [], count: 0, bails: 0 };
}

export function addTrick(c, name, pts) {
  if (!c.chain) { c.chain = true; c.cur = 0; c.mult = 1; c.names = new Set(); c.tricks = []; c.gap = 0; }
  const fresh = !c.names.has(name);
  c.names.add(name);
  c.mult = Math.min(SKATE.maxMult, Math.max(1, c.names.size));
  const gain = Math.round(pts * (fresh ? 1 : 0.4) * c.mult);
  c.cur += gain;
  c.tricks.push(name);
  c.count++;
  c.gap = 0;
  return gain;
}

export function bankCombo(c) {
  const pts = Math.round(c.cur);
  c.total += pts;
  if (pts > c.best) c.best = pts;
  c.cur = 0; c.chain = false; c.mult = 1; c.names = new Set(); c.gap = 0; c.tricks = [];
  return pts;
}

export function bailCombo(c) {
  const lost = Math.round(c.cur);
  c.cur = 0; c.chain = false; c.mult = 1; c.names = new Set(); c.gap = 0; c.tricks = [];
  c.bails++;
  return lost;
}

// Banks the chain after SKATE.grace seconds on the ground; returns the points banked.
export function tickCombo(c, dt, busy) {
  if (!c.chain) return 0;
  if (busy) { c.gap = 0; return 0; }
  c.gap += dt;
  return c.gap >= SKATE.grace ? bankCombo(c) : 0;
}

export const TRICK_PTS = { ollie: 40, kickflip: 150, heelflip: 150, spin180: 120, spin360: 300, spin540: 560, grab: 70 };

// --- the board -----------------------------------------------------------------------------------

function grindTarget(feats, b) {
  if (b.grounded || b.grind) return null;
  for (const f of feats) {
    let seg = null, h = 0;
    if (f.type === 'rail') { seg = [f.u0, f.v0, f.u1, f.v1]; h = f.h; }
    else if (f.type === 'box') h = f.h;
    else continue;
    const cands = seg ? [seg] : [[f.u0, f.v0, f.u1, f.v0], [f.u0, f.v1, f.u1, f.v1]];
    for (const s of cands) {
      const dx = s[2] - s[0], dy = s[3] - s[1];
      const L = Math.hypot(dx, dy);
      const t = ((b.u - s[0]) * dx + (b.v - s[1]) * dy) / (L * L);
      if (t < 0.02 || t > 0.98) continue;
      const px = s[0] + dx * t, py = s[1] + dy * t;
      if (Math.hypot(b.u - px, b.v - py) > SKATE.grindRange) continue;
      if (b.z < h - 0.18 || b.z > h + 0.5) continue;
      if (b.vz > 3.2) continue;
      const along = Math.cos(b.a) * dx / L + Math.sin(b.a) * dy / L;
      if (Math.abs(along) < 0.82) continue;
      return { f, seg: s, L, dir: along > 0 ? 1 : -1, h, t };
    }
  }
  return null;
}

// One step of the board. inp: { push 0..1, brake 0..1, steer -1..1, spin -1..1,
// ollie, kick, heel, grab } (ollie/kick/heel are one-frame presses).
// Returns events [{ type: 'trick'|'bail'|'land'|'air'|'grind'|'bump', ... }].
export function stepBoard(b, inp, dt, feats = FEATURES, combo = null) {
  const ev = [];
  if (b.stun > 0) {
    b.stun -= dt;
    b.speed *= Math.exp(-dt * 3);
    inp = { push: 0, brake: 0, steer: 0, spin: 0 };
    if (b.stun <= 0) { b.stun = 0; }
  }
  // grinding
  if (b.grind) {
    const g = b.grind;
    g.t += dt;
    const dx = g.seg[2] - g.seg[0], dy = g.seg[3] - g.seg[1];
    g.s += g.dir * Math.max(3, Math.abs(b.speed)) * dt / g.L;
    b.u = g.seg[0] + dx * g.s; b.v = g.seg[1] + dy * g.s;
    b.z = g.h;
    // balance: it drifts to the side it leans to; steer against it
    g.balV += Math.sign(g.bal || g.lean) * SKATE.balanceRate * dt + (inp.steer || 0) * SKATE.balanceKick * dt;
    g.bal += g.balV * dt;
    g.bal = Math.max(-1.2, Math.min(1.2, g.bal));
    if (Math.abs(g.bal) >= 1) {
      // off the rail: a bail
      b.grind = null;
      startAir(b, 0.5, b.z);
      b.z = g.h;
      b.flip = null;
      b.bailAir = true;
      ev.push({ type: 'grindfall', t: g.t });
    } else if (g.s >= 1 || g.s <= 0 || inp.ollie) {
      // the end of the rail or a pop out: the grind counts
      const pts = Math.round(60 + 110 * g.t);
      ev.push({ type: 'trick', name: 'grind', pts, t: g.t });
      b.grinds++;
      b.grind = null;
      startAir(b, inp.ollie ? 3.4 : 1.6, b.z);
      b.speed = Math.max(3.5, Math.abs(b.speed));
      b.a = Math.atan2(dy, dx) + (g.dir > 0 ? 0 : Math.PI);
      b.tricks.push('grind');
    }
    return ev;
  }

  if (b.grounded) {
    // push, brake, steer
    if (inp.push > 0 && b.stun <= 0) b.speed = Math.min(SKATE.maxPush, b.speed + SKATE.accel * inp.push * dt);
    else b.speed *= Math.exp(-SKATE.friction * dt);
    if (inp.brake > 0) b.speed = b.speed > 0 ? Math.max(0, b.speed - SKATE.brake * inp.brake * dt) : Math.min(0, b.speed + SKATE.brake * inp.brake * dt);
    const tr = SKATE.turn * Math.min(1, Math.abs(b.speed) / 3.2) * Math.sign(b.speed || 1);
    b.a += (inp.steer || 0) * tr * dt;
    // the slope under the heading: speed is along the surface, the planar move is its cosine
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    const z0 = surfaceAt(feats, b.u, b.v);
    const slope = (surfaceAt(feats, b.u + ca * 0.2, b.v + sa * 0.2) - surfaceAt(feats, b.u - ca * 0.2, b.v - sa * 0.2)) / 0.4;
    const norm = Math.sqrt(1 + slope * slope);
    b.speed -= G * (slope / norm) * dt;
    // an ollie
    if (inp.ollie && b.stun <= 0) {
      const lift = SKATE.ollie + 0.06 * Math.abs(b.speed) + Math.max(0, b.rise) * 0.35;
      b.speed = b.speed / norm;
      startAir(b, lift, z0);
      ev.push({ type: 'air', pop: true });
    }
    if (b.grounded) {
      const planar = (b.speed / norm) * dt;
      const nu = b.u + ca * planar, nv = b.v + sa * planar;
      const zn = surfaceAt(feats, nu, nv);
      if (zn > z0 + 0.22 && zn > b.z + 0.22) {
        // the wall of a box from the side: stop dead
        b.speed *= 0.15;
        ev.push({ type: 'bump' });
      } else {
        b.u = nu; b.v = nv;
        const rate = Math.max(-9, Math.min(7, (zn - b.z) / dt));
        const prev = b.rise;
        b.rise = b.rise * 0.6 + rate * 0.4;
        const lip = prev > 1 && rate < prev * 0.45 - 0.2;
        if ((lip || zn < b.z - 0.04) && Math.abs(b.speed) > 2.2 && b.z > 0.12) {
          // over a lip, or off a ledge
          b.speed = b.speed / norm;
          startAir(b, lip ? Math.min(7, prev) : Math.max(-9, rate), b.z);
          ev.push({ type: 'air', lip: lip && prev > 1.5 });
        } else b.z = zn;
      }
    }
    // the fence
    if (Math.abs(b.u) > PARK.hu) { b.u = Math.sign(b.u) * PARK.hu; b.speed *= -0.25; ev.push({ type: 'bump' }); }
    if (Math.abs(b.v) > PARK.hv) { b.v = Math.sign(b.v) * PARK.hv; b.a = -b.a; b.speed *= 0.5; ev.push({ type: 'bump' }); }
    if (b.grounded) b.z = surfaceAt(feats, b.u, b.v);
    return ev;
  }

  // in the air
  b.air += dt;
  b.vz -= G * dt;
  b.z += b.vz * dt;
  b.maxZ = Math.max(b.maxZ, b.z);
  const ca = Math.cos(b.a), sa = Math.sin(b.a);
  b.u += ca * b.speed * dt; b.v += sa * b.speed * dt;
  b.a += (inp.steer || 0) * 0.5 * dt;
  b.speed *= Math.exp(-0.02 * dt);
  if (Math.abs(b.u) > PARK.hu) { b.u = Math.sign(b.u) * PARK.hu; b.speed *= -0.2; }
  if (Math.abs(b.v) > PARK.hv) { b.v = Math.sign(b.v) * PARK.hv; b.speed *= 0.6; }
  if (!b.bailAir) {
    b.spin += (inp.spin || 0) * SKATE.spinRate * dt;
    if (b.flip) {
      b.flipT += dt;
      if (b.flipT >= SKATE.flipTime) { b.doneFlips.push(b.flip); b.flip = null; b.flipT = 0; }
    } else if (b.z > 0.22) {
      if (inp.kick) { b.flip = 'kickflip'; b.flipT = 0; }
      else if (inp.heel) { b.flip = 'heelflip'; b.flipT = 0; }
    }
    if (inp.grab) { b.grab += dt; if (b.grab > 0.28 && !b.grabbed) { b.grabbed = true; ev.push({ type: 'trick', name: 'grab', pts: TRICK_PTS.grab }); } }
    else b.grab = 0;
    // a rail or ledge to grind
    const gt = grindTarget(feats, b);
    if (gt) {
      b.grind = { f: gt.f, seg: gt.seg, L: gt.L, dir: gt.dir, h: gt.h, s: gt.t, t: 0, bal: (Math.random() - 0.5) * 0.3, lean: Math.random() < 0.5 ? -1 : 1, balV: 0 };
      b.z = gt.h; b.vz = 0;
      b.speed = Math.max(3.4, Math.abs(b.speed));
      // lock onto the rail's heading
      b.a = Math.atan2(gt.seg[3] - gt.seg[1], gt.seg[2] - gt.seg[0]) + (gt.dir > 0 ? 0 : Math.PI);
      b.spin = 0;
      ev.push({ type: 'grind' });
      return ev;
    }
  }
  // landing
  const zs = surfaceAt(feats, b.u, b.v);
  if (b.z <= zs && b.vz <= 0) {
    b.z = zs;
    const turns = b.spin / Math.PI;
    const off = Math.abs(turns - Math.round(turns)) * Math.PI;
    const bad = b.bailAir || !!b.flip || off > SKATE.spinSlack;
    b.grounded = true;
    b.vz = 0;
    if (bad) {
      b.bails++;
      b.stun = SKATE.stun;
      b.speed *= 0.3;
      ev.push({ type: 'bail', why: b.bailAir ? 'rail' : b.flip ? 'flip' : 'spin' });
    } else {
      b.landed++;
      const n = Math.abs(Math.round(turns));
      const list = [];
      if (b.air > 0.18 || b.maxZ - b.takeoffZ > 0.2) list.push(['ollie', TRICK_PTS.ollie]);
      for (const f of b.doneFlips) list.push([f, TRICK_PTS[f]]);
      if (n >= 1) list.push([`spin${Math.min(3, n) * 180}`, TRICK_PTS['spin' + Math.min(3, n) * 180]]);
      const height = b.maxZ - Math.max(b.takeoffZ, zs);
      const heightBonus = height > 0.7 ? Math.round(70 * (height - 0.7)) : 0;
      ev.push({ type: 'land', tricks: list, height, heightBonus, air: b.air });
    }
    b.spin = 0; b.flip = null; b.flipT = 0; b.doneFlips = []; b.bailAir = false;
  }
  return ev;
}

// Feeds a step's events to the combo; returns { gained, banked, bailed } for the HUD.
export function scoreEvents(combo, ev) {
  let gained = 0, bailed = 0;
  const names = [];
  for (const e of ev) {
    if (e.type === 'trick') { gained += addTrick(combo, e.name, e.pts); names.push(e.name); }
    else if (e.type === 'land') {
      for (const [n, p] of e.tricks) { gained += addTrick(combo, n, p); names.push(n); }
      if (e.heightBonus) { combo.cur += e.heightBonus * combo.mult; gained += e.heightBonus * combo.mult; names.push('hoogte'); }
    } else if (e.type === 'bail' || e.type === 'grindfall') {
      if (e.type === 'bail') bailed += bailCombo(combo);
      else combo.gap = 0;
    }
  }
  return { gained, bailed, names };
}

export const skateMedal = (score, mode = 'standaard') => {
  const at = medalAt(mode);
  let m = 0;
  for (let i = 0; i < at.length; i++) if (score >= at[i]) m = i + 1;
  return m;
};

export const TRICK_NAMES = {
  ollie: 'Ollie', kickflip: 'Kickflip', heelflip: 'Heelflip', spin180: 'Spin 180', spin360: 'Spin 360', spin540: 'Spin 540', grab: 'Grab', grind: 'Grind', hoogte: 'Hoge lucht',
};
