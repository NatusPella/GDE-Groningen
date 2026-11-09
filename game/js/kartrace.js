// Karten in Ulrum: the track, the light kart and the drivers. Pure maths,
// no DOM and no THREE: kartbaan.js draws it and feeds it the keys;
// scripts/minigames_test.mjs checks it in node.
//
// The kart is a light vehicle with the arcade model of the cars: forward
// speed and a sideways slip in its own frame, a grip that falls away while
// you hold the handbrake (Space) into a bend, and a boost when a long enough
// drift ends. Off the asphalt the grass slows you, the tyre wall bounces you
// back. Three AI karts follow a racing line at a speed their skill allows,
// with a small rubber band; the race is three laps with no ghosts.
import { angDiff, clamp } from './minigamekit.js';

// the centreline in the track's own frame (u along the home straight, v across)
export const CONTROL = [
  [-45, 0], [0, 0], [50, 0], [95, -2], [125, 15], [130, 45], [110, 68], [75, 72], [55, 55], [35, 48],
  [15, 62], [-10, 78], [-45, 82], [-80, 70], [-95, 40], [-85, 12],
];
export const TRACK_W = 9;
export const RUNOFF = 3.2;
export const LAPS = 3;
export const LANES = [0, 0, -2.5, 2.5];

export const KART = {
  top: 24, accel: 15.5, brake: 30, reverseTop: 6, coast: 0.28, yaw: 2.15, grip: 9, driftGrip: 1.9,
  driftMin: 9, charge1: 0.8, charge2: 1.7, boost1: 0.9, boost2: 1.6, boostTop: 6.5, grass: 0.55, radius: 0.95,
};

// --- the track ---------------------------------------------------------------------------------

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

export function buildTrack(control = CONTROL, width = TRACK_W, step = 1.5) {
  const n = control.length;
  const dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i + n - 1) % n], p1 = control[i], p2 = control[(i + 1) % n], p3 = control[(i + 2) % n];
    for (let k = 0; k < 24; k++) dense.push(catmull(p0, p1, p2, p3, k / 24));
  }
  // resample evenly
  const pts = [];
  let acc = 0, target = 0;
  pts.push(dense[0]);
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + seg >= target + step) {
      const f = (target + step - acc) / seg;
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      target += step;
    }
    acc += seg;
  }
  const N = pts.length;
  const u = new Float64Array(N), v = new Float64Array(N), ang = new Float64Array(N), s = new Float64Array(N), curv = new Float64Array(N);
  let L = 0;
  for (let i = 0; i < N; i++) {
    u[i] = pts[i][0]; v[i] = pts[i][1];
    s[i] = L;
    const nx = pts[(i + 1) % N];
    L += Math.hypot(nx[0] - pts[i][0], nx[1] - pts[i][1]);
  }
  for (let i = 0; i < N; i++) {
    const a = pts[(i + N - 1) % N], b = pts[(i + 1) % N];
    ang[i] = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  for (let i = 0; i < N; i++) {
    const d = angDiff(ang[(i + 1) % N], ang[(i + N - 1) % N]);
    const ds = s[(i + 1) % N] - s[(i + N - 1) % N] || 2 * step;
    curv[i] = Math.abs(d / Math.abs(ds > 0 ? ds : 2 * step));
  }
  return { N, u, v, ang, s, curv, length: L, hw: width / 2, step: L / N };
}

// Where a point is on the track: nearest centre sample (searched around a hint
// index), the signed offset (positive to the left of travel), the distance
// along the track.
export function locate(track, x, y, hint = -1, window = 40) {
  const { N, u, v } = track;
  let best = -1, bd = Infinity;
  const check = (i) => {
    const d = (u[i] - x) * (u[i] - x) + (v[i] - y) * (v[i] - y);
    if (d < bd) { bd = d; best = i; }
  };
  if (hint < 0) for (let i = 0; i < N; i++) check(i);
  else for (let k = -window; k <= window; k++) check(((hint + k) % N + N) % N);
  const a = track.ang[best];
  const off = -(x - u[best]) * Math.sin(a) + (y - v[best]) * Math.cos(a);
  return { i: best, off, dist: Math.sqrt(bd), s: track.s[best], ang: a };
}

export const pointAt = (track, s, lane = 0) => {
  const i = (((Math.round(s / track.step)) % track.N) + track.N) % track.N;
  const a = track.ang[i];
  return { x: track.u[i] - Math.sin(a) * lane, y: track.v[i] + Math.cos(a) * lane, ang: a, i };
};

// --- the kart ---------------------------------------------------------------------------------

export function createKart(track, i, { skill = 1, name = '', player = false } = {}) {
  // two by two on the grid, behind the start line: the player on pole
  const row = Math.floor(i / 2), side = i % 2 === 0 ? -1.6 : 1.6;
  const back = 5 + row * 6.4 + (i % 2) * 2.2;
  const p = pointAt(track, track.length - back, side);
  return {
    i, name, player, skill, u: p.x, v: p.y, a: p.ang, f: 0, l: 0, yaw: 0, drift: 0, driftT: 0, boostT: 0, boostLvl: 0, steerS: 0,
    idx: p.i, off: side, prog: -back, lap: 0, lapTimes: [], lapStart: 0, finished: false, finishT: 0, grass: false, bump: 0, lane: LANES[i] ?? 0, laneT: 0, lastS: track.length - back, hit: 0, drifts: 0, boosts: 0, bumps: 0,
  };
}

// inp: { throttle -1..1, steer -1..1 (positive to the left of the kart), drift bool }
export function stepKart(k, inp, dt, track) {
  const loc = locate(track, k.u, k.v, k.idx);
  k.idx = loc.i; k.off = loc.off;
  const out = Math.abs(loc.off);
  k.grass = out > track.hw;
  let top = KART.top * (k.grass ? KART.grass : 1);
  if (k.boostT > 0) { top += KART.boostTop; k.boostT -= dt; }
  const events = [];
  // throttle and brake
  const th = inp.throttle || 0;
  if (th > 0) k.f += KART.accel * th * Math.max(0, 1 - Math.max(0, k.f) / top) * dt * (k.boostT > 0 ? 1.8 : 1);
  else if (th < 0) k.f = k.f > 0.4 ? Math.max(0, k.f + KART.brake * th * dt) : Math.max(-KART.reverseTop, k.f + KART.accel * 0.6 * th * dt);
  if (k.f > top) k.f -= (k.f - top) * 2.2 * dt;
  k.f -= (k.f * KART.coast * 0.1 + Math.sign(k.f) * (k.grass ? 3.2 : 0.7)) * dt * (th > 0 ? 0.4 : 1);
  if (Math.abs(k.f) < 0.05 && th === 0) k.f = 0;
  // drift
  const steer = clamp(inp.steer || 0, -1, 1);
  if (inp.drift && !k.drift && k.f > KART.driftMin && Math.abs(steer) > 0.25) { k.drift = Math.sign(steer); k.driftT = 0; k.drifts++; events.push({ type: 'drift' }); }
  if (k.drift) {
    if (!inp.drift || k.f < KART.driftMin * 0.7) {
      const lvl = k.driftT >= KART.charge2 ? 2 : k.driftT >= KART.charge1 ? 1 : 0;
      if (lvl) { k.boostT = lvl === 2 ? KART.boost2 : KART.boost1; k.boostLvl = lvl; k.boosts++; events.push({ type: 'boost', lvl }); }
      k.drift = 0; k.driftT = 0;
    } else k.driftT += dt;
  }
  // yaw: a kart turns less at speed; in a drift it holds an arc you can tighten or open
  const fast = Math.abs(k.f);
  let yawT = steer * KART.yaw * (1 - 0.38 * Math.min(1, fast / KART.top)) * Math.min(1, fast / 3.5) * (k.f < 0 ? -1 : 1);
  if (k.drift) yawT = k.drift * 1.55 + steer * 0.75 * 0.9;
  k.yaw += (yawT - k.yaw) * Math.min(1, dt * (k.drift ? 5 : 9));
  const dpsi = k.yaw * dt;
  k.a += dpsi;
  // rotate the velocity into the new frame, then the tyres grip
  const c = Math.cos(dpsi), s = Math.sin(dpsi);
  const f2 = k.f * c + k.l * s, l2 = -k.f * s + k.l * c;
  k.f = f2; k.l = l2;
  const grip = k.drift ? KART.driftGrip : KART.grip;
  const lBefore = k.l;
  k.l *= Math.exp(-grip * dt);
  k.f -= Math.abs(lBefore - k.l) * 0.12 * Math.sign(k.f || 1);
  // move
  const ca = Math.cos(k.a), sa = Math.sin(k.a);
  k.u += (ca * k.f - sa * k.l) * dt;
  k.v += (sa * k.f + ca * k.l) * dt;
  // the tyre wall beyond the run-off
  const loc2 = locate(track, k.u, k.v, k.idx, 8);
  const lim = track.hw + RUNOFF;
  if (Math.abs(loc2.off) > lim) {
    const sign = loc2.off > 0 ? 1 : -1;
    const over = Math.abs(loc2.off) - lim;
    // back towards the centre along the normal
    k.u += Math.sin(loc2.ang) * sign * over; k.v -= Math.cos(loc2.ang) * sign * over;
    const vn = (-Math.sin(loc2.ang) * (ca * k.f - sa * k.l) + Math.cos(loc2.ang) * (sa * k.f + ca * k.l)) * sign;
    if (vn > 0.5) { k.f *= 0.55; k.l *= 0.3; k.bump = 0.25; k.bumps++; events.push({ type: 'wall', speed: vn }); }
    if (k.drift) { k.drift = 0; k.driftT = 0; }
  }
  if (k.bump > 0) k.bump -= dt;
  if (k.hit > 0) k.hit -= dt;
  return events;
}

// Progress along the track: distance driven this lap round, unwrapped.
export function updateProgress(k, track, t) {
  const loc = locate(track, k.u, k.v, k.idx, 12);
  const prevLap = Math.floor(k.prog / track.length);
  let d = loc.s - k.lastS;
  if (d > track.length / 2) d -= track.length;
  else if (d < -track.length / 2) d += track.length;
  k.prog += d;
  k.lastS = loc.s;
  const lap = Math.floor(k.prog / track.length);
  if (lap > prevLap && lap >= 1 && !k.finished) {
    k.lapTimes.push(t - k.lapStart);
    k.lapStart = t;
    k.lap = lap;
    if (lap >= LAPS) { k.finished = true; k.finishT = t; }
    return { lap, time: k.lapTimes[k.lapTimes.length - 1] };
  }
  return null;
}

// Karts push each other apart and swap a part of their speed.
export function collideKarts(karts) {
  let hits = 0;
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.u - a.u, dy = b.v - a.v;
      const d = Math.hypot(dx, dy);
      const min = KART.radius * 2;
      if (d >= min || d < 1e-4) continue;
      hits++;
      const nx = dx / d, ny = dy / d;
      const push = (min - d) / 2;
      a.u -= nx * push; a.v -= ny * push; b.u += nx * push; b.v += ny * push;
      const va = { x: Math.cos(a.a) * a.f - Math.sin(a.a) * a.l, y: Math.sin(a.a) * a.f + Math.cos(a.a) * a.l };
      const vb = { x: Math.cos(b.a) * b.f - Math.sin(b.a) * b.l, y: Math.sin(b.a) * b.f + Math.cos(b.a) * b.l };
      const rel = (vb.x - va.x) * nx + (vb.y - va.y) * ny;
      if (rel < 0) {
        const j2 = -(1 + 0.35) * rel / 2;
        va.x -= j2 * nx; va.y -= j2 * ny; vb.x += j2 * nx; vb.y += j2 * ny;
        for (const [k, vv] of [[a, va], [b, vb]]) {
          const ca = Math.cos(k.a), sa = Math.sin(k.a);
          k.f = ca * vv.x + sa * vv.y; k.l = -sa * vv.x + ca * vv.y;
          k.hit = 0.3;
        }
      }
    }
  }
  return hits;
}

// --- the drivers ------------------------------------------------------------------------------

// What an AI kart presses: follow a line a little to the side of the centre at
// the speed the next bends allow.
export function aiInput(k, track, opts = {}) {
  const skill = (opts.skill ?? k.skill) * (opts.band ?? 1);
  const look = 6.5 + Math.max(0, k.f) * 0.5;
  const here = locate(track, k.u, k.v, k.idx, 20);
  // a kart just ahead: go round it, and never faster than it when close behind
  let shift = 0, cap = 99;
  if (opts.others) {
    const ca = Math.cos(k.a), sa = Math.sin(k.a);
    for (const o of opts.others) {
      if (o === k) continue;
      const dx = o.u - k.u, dy = o.v - k.v;
      const ahead = dx * ca + dy * sa, lat = -dx * sa + dy * ca;
      if (ahead > 0 && ahead < 10 && Math.abs(lat) < 2.4) {
        shift = (Math.abs(k.lane + k.avoid - (k.off + lat)) < 0 ? 0 : -(lat >= 0 ? 1 : -1)) * 2.6;
        if (ahead < 4.5 && Math.abs(lat) < 1.5) cap = Math.min(cap, Math.max(2, o.f));
      }
    }
  }
  k.avoid = (k.avoid || 0) + (shift - (k.avoid || 0)) * Math.min(1, (opts.dt || 1 / 60) * 3);
  const lane = clamp(k.lane + k.avoid, -track.hw + 1.2, track.hw - 1.2);
  const tgt = pointAt(track, here.s + look, lane);
  const want = Math.atan2(tgt.y - k.v, tgt.x - k.u);
  const steer = clamp(angDiff(want, k.a) * 2.4, -1, 1);
  // the sharpest bend in the next stretch sets the speed
  let worst = 0;
  const ahead = Math.round((14 + Math.max(0, k.f) * 1.3) / track.step);
  for (let q = 0; q <= ahead; q += 2) worst = Math.max(worst, track.curv[(here.i + q) % track.N]);
  const vCorner = worst > 0.002 ? Math.sqrt((12.5 * skill) / worst) : 99;
  const vt = Math.min(KART.top * 0.97 * skill, vCorner, cap);
  const err = vt - k.f;
  const throttle = err > 0 ? clamp(err * 0.5, 0, 1) : clamp(err * 0.35, -1, 0);
  return { throttle, steer, drift: false };
}

// A bot that drives the player's kart like a good player: the line, plus a
// drift on long bends (for the tests).
export function bestInput(k, track) {
  const i = aiInput({ ...k, lane: 0 }, track, { skill: 1.08 });
  const here = locate(track, k.u, k.v, k.idx, 20);
  const ahead = Math.round((18 + Math.max(0, k.f)) / track.step);
  let c = 0;
  for (let q = 0; q <= ahead; q += 2) c = Math.max(c, track.curv[(here.i + q) % track.N]);
  return { ...i, drift: c > 0.022 && k.f > 14 && Math.abs(i.steer) > 0.35 };
}

import { positionMedalFor } from './medalrules.js'; // #800
export const positionMedal = (pos, mode = 'standaard') => positionMedalFor(pos, mode);

// Race order: finishers by finish time, the rest by distance driven.
export function rankKarts(karts) {
  return [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishT - b.finishT;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.prog - a.prog;
  });
}

export const bestLap = (k) => (k.lapTimes.length ? Math.min(...k.lapTimes) : null);
