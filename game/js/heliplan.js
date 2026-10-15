// The flight plan of a heli run (helirun.js) as plain data and math, so a
// Node test (scripts/heli_sim.mjs) can fly it with the real flight model
// (heliflight.js flyHeli) and a scripted pilot. No DOM, no three.js.
//
// A run is a list of legs, flown in one Wieken Wubbo:
//   cruise  (story) the autopilot lifts off at Eelde and heads north; a cut to the city
//   pad     land on a helipad (`pad`: 'umcg'); the touchdown ends the leg
//   pickup  (story) parked on the UMCG deck: Dokter Dijkstra climbs in with the lier
//   rings   fly through `rings` in order ({ x, y, z }); a skipped ring counts as missed
//   catch   hold station beside the balloon's basket for CATCH.need seconds
//
// makePlan(variant, pads) -> { variant, legs }   pads: { umcg: { x, y, deck }, eelde: {...} }
// legTarget(plan, st, b) -> { x, y, z, r, kind, label }   where the arrow points
// passRing(leg, st, pos) -> 'hit' | 'miss' | null
// catchCheck(pos, vel, b) -> { zone, bump, okZ, okLat, okV, dz, lat }
// stepBalloon(b, dt), launchBalloon(b)
// assist(v, keys, tgt, dt, mode)   the steering and height help (keys: a Set of held keys)
// pilotKeys(v, tgt, mode) -> Set   a simple pilot for the test and the debug autopilot

import { PO, PA, PL } from './worldframe.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const RING_R = 11;
// Jelle's balloon stands in the Oosterpark (storyarc.js H14 radio) and drifts towards Ten Boer
export const BALLOON_AT = { ...PO(1593, -466) };
const BALLOON_A = PA(1593, -466, Math.atan2(-0.5, 0.86));
export const BALLOON_DIR = { x: Math.cos(BALLOON_A), y: Math.sin(BALLOON_A) };
export const BALLOON_SPEED = 3;
export const BALLOON_CRUISE = 62;
const BALLOON_RISE = 2.6;
export const CATCH = { near: 9, far: 24, dz: 4.5, rel: 4, need: 4, bump: 7.5 };
export const CRUISE_S = 9;
// where the cut after the cruise puts the heli: this far south of the UMCG, at this height
export const ENTRY = { back: 1000, z: 70 };

// the standalone Ballonjacht: a tour over Stad first, as before (heights in m)
const TOUR = PL([
  [560, -420, 62], [300, -640, 55], [133, -719, 45], [-120, -560, 60], [-190, -250, 72],
  [-143, -32, 58], [40, -20, 52], [300, 40, 66], [620, -130, 60], [980, -300, 64], [1300, -420, 66],
]);

function ringsBetween(a, b, n, heights, sway) {
  const out = [];
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1);
    const s = Math.sin(u * Math.PI * 2) * sway;
    out.push({ x: a.x + dx * u + nx * s, y: a.y + dy * u + ny * s, z: heights[(i - 1) % heights.length] });
  }
  return out;
}

function faceRings(rings, from) {
  let p = from;
  for (const r of rings) { r.yaw = Math.atan2(r.y - p.y, r.x - p.x); p = r; }
  return rings;
}

export function makePlan(variant, pads) {
  const umcg = pads.umcg;
  const toBalloon = { x: BALLOON_AT.x - BALLOON_DIR.x * 60, y: BALLOON_AT.y - BALLOON_DIR.y * 60 };
  if (variant === 'traumaduif') {
    const rings = faceRings(ringsBetween(umcg, toBalloon, 4, [52, 60, 66, 64], 55), umcg);
    return {
      variant,
      legs: [
        { kind: 'cruise' },
        { kind: 'pad', pad: 'umcg', why: 'spoed', label: 'Spoedje: land op de H van het UMCG' },
        { kind: 'pickup' },
        { kind: 'rings', rings, label: 'Door de ringen, naar de ballon' },
        { kind: 'catch', label: 'Naast de mand: Tammo aan het touw' },
        { kind: 'pad', pad: 'umcg', why: 'home', label: 'Terug naar het UMCG: land op de H' },
      ],
    };
  }
  const tour = TOUR.map(([x, y, z]) => ({ x, y, z }));
  return {
    variant,
    legs: [
      { kind: 'rings', rings: faceRings(tour, umcg), label: 'Vlieg door de ringen' },
      { kind: 'catch', label: 'Koppelen: naast de mand' },
      { kind: 'pad', pad: 'umcg', why: 'home', label: 'Terug naar het UMCG: land op de H' },
    ],
  };
}

// The point beside the basket the heli wants to be at (the side it is on).
export function catchSpot(b, pos) {
  const nx = -BALLOON_DIR.y, ny = BALLOON_DIR.x;
  const side = (pos.x - b.x) * nx + (pos.y - b.y) * ny >= 0 ? 1 : -1;
  const mid = (CATCH.near + CATCH.far) / 2;
  return { x: b.x + nx * mid * side, y: b.y + ny * mid * side, z: b.z + 1 };
}

export function legTarget(plan, st, b, pads, pos) {
  const leg = plan.legs[st.leg];
  if (!leg) return null;
  if (leg.kind === 'rings') {
    const r = leg.rings[st.ring];
    if (r) return { x: r.x, y: r.y, z: r.z, r: RING_R, kind: 'ring', label: `Ring ${st.ring + 1}/${leg.rings.length}` };
    return { x: b.x, y: b.y, z: b.z + 1, r: CATCH.far, kind: 'balloon', label: 'De ballon' };
  }
  if (leg.kind === 'catch') {
    const s = catchSpot(b, pos || b);
    return { ...s, r: 6, kind: 'balloon', label: 'De mand' };
  }
  if (leg.kind === 'pad' || leg.kind === 'pickup') {
    const p = pads[leg.pad || 'umcg'];
    return { x: p.x, y: p.y, z: p.deck, r: p.r || 6, kind: 'pad', label: leg.kind === 'pad' ? 'Helidek UMCG' : '' };
  }
  return null;
}

// A ring is hit by flying through its hoop; it is missed once the heli is
// past it (beyond its plane) or already close to the ring after it.
export function passRing(leg, st, pos) {
  const r = leg.rings[st.ring];
  if (!r) return null;
  const d = Math.hypot(pos.x - r.x, pos.y - r.y, pos.z - r.z);
  if (d <= RING_R) return 'hit';
  const along = (pos.x - r.x) * Math.cos(r.yaw) + (pos.y - r.y) * Math.sin(r.yaw);
  const nxt = leg.rings[st.ring + 1];
  if (Math.hypot(pos.x - r.x, pos.y - r.y) < 45 && along > 6) return 'miss';
  if (nxt && Math.hypot(pos.x - nxt.x, pos.y - nxt.y) < Math.hypot(pos.x - r.x, pos.y - r.y) * 0.5 && along > 0) return 'miss';
  return null;
}

export function launchBalloon(b) {
  b.phase = 'rise';
  b.t = 0;
}

// The balloon: on the ground until launched, then up to cruise height and off
// towards Ten Boer at walking pace, bobbing a little.
export function stepBalloon(b, dt) {
  b.age = (b.age || 0) + dt;
  b.vx = 0; b.vy = 0;
  if (b.phase === 'ground' || !b.phase) return;
  b.t = (b.t || 0) + dt;
  const want = (b.ground || 0) + BALLOON_CRUISE + Math.sin(b.t * 0.21) * 5;
  if (b.z < want - 0.5) b.z = Math.min(want, b.z + BALLOON_RISE * dt);
  else b.z += (want - b.z) * Math.min(1, dt * 0.6);
  const k = clamp(b.t / 12, 0, 1);
  b.vx = BALLOON_DIR.x * BALLOON_SPEED * k;
  b.vy = BALLOON_DIR.y * BALLOON_SPEED * k;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

// pos/vel of the heli; the basket hangs at b.z, the heli wants b.z + 1 beside it.
export function catchCheck(pos, vel, b) {
  const lat = Math.hypot(pos.x - b.x, pos.y - b.y);
  const dz = pos.z - (b.z + 1);
  const rel = Math.hypot(vel.x - (b.vx || 0), vel.y - (b.vy || 0));
  const okZ = Math.abs(dz) < CATCH.dz, okLat = lat > CATCH.near && lat < CATCH.far, okV = rel < CATCH.rel;
  const bump = lat < CATCH.bump && dz > -6 && dz < 20;
  return { zone: okZ && okLat && okV, bump, okZ, okLat, okV, dz, lat, rel };
}

// Help that keeps the flight doable without taking it over:
//   steer   no A/D held while flying: the nose turns towards the target
//   height  no Space/Ctrl held and the target is near: ease to its height
//   station (catch) no W/S held near the balloon: drift along with it
// mode: 'rings' | 'catch' | 'pad'
export function assist(v, keys, tgt, dt, mode, b = null) {
  if (!tgt || v.onGround) return;
  const dx = tgt.x - v.x, dy = tgt.y - v.y, d = Math.hypot(dx, dy);
  const turning = keys.has('a') || keys.has('d') || keys.has('arrowleft') || keys.has('arrowright');
  if (!turning && d > 4) {
    const err = wrap(Math.atan2(dy, dx) - v.angle);
    const moving = keys.has('w') || keys.has('arrowup') || keys.has('shift') || Math.hypot(v.vx || 0, v.vy || 0) > 4;
    if (moving && Math.abs(err) < 2.0) v.angle = wrap(v.angle + clamp(err * 1.4, -0.75, 0.75) * dt);
  }
  const vertical = keys.has(' ') || keys.has('control');
  if (!vertical) {
    // a pad: down to a little above the deck once over it, the last bit is Ctrl
    const want = mode === 'pad' ? (d < 30 ? tgt.z + 6 : Math.max(tgt.z + 25, v.z)) : tgt.z;
    const reach = mode === 'pad' ? 120 : mode === 'catch' ? 80 : 260;
    if (d < reach && Math.abs(want - v.z) > 0.3) v.z += clamp((want - v.z) * 0.9, -3.5, 3.5) * dt;
  }
  if (mode === 'catch' && b && !(keys.has('w') || keys.has('s'))) {
    if (Math.hypot(b.x - v.x, b.y - v.y) < 60) { v.x += (b.vx || 0) * dt; v.y += (b.vy || 0) * dt; }
  }
}

// A plain pilot: turn to the target, go when it is ahead, brake near it,
// climb/sink to its height, Ctrl over a pad. Good enough to prove a leg is flyable.
export function pilotKeys(v, tgt, mode) {
  const keys = new Set();
  if (!tgt) return keys;
  const dx = tgt.x - v.x, dy = tgt.y - v.y, d = Math.hypot(dx, dy);
  const err = wrap(Math.atan2(dy, dx) - v.angle);
  const fwdV = (v.vx || 0) * Math.cos(v.angle) + (v.vy || 0) * Math.sin(v.angle);
  if (v.onGround) { keys.add(' '); return keys; }
  if (Math.abs(err) > 0.25 && d > 6) keys.add(err > 0 ? 'd' : 'a');
  const stopAt = mode === 'pad' ? 4 + fwdV * fwdV / 14 : mode === 'catch' ? 3 + fwdV * fwdV / 14 : 0;
  if (Math.abs(err) < 0.9) {
    if (d > stopAt + 1) keys.add('w');
    else if (fwdV > 1.5) keys.add('s');
  }
  if (d > 400 && Math.abs(err) < 0.3) keys.add('shift');
  const want = mode === 'pad' ? (d < Math.max(6, (tgt.r || 6) * 0.8) ? -1e9 : Math.max(tgt.z + 25, Math.min(v.z, tgt.z + 40))) : tgt.z;
  if (want - v.z > 2) keys.add(' ');
  else if (want - v.z < -2) keys.add('control');
  return keys;
}

export function newRunState() {
  return { leg: 0, ring: 0, ringsHit: 0, ringsMissed: 0, catchP: 0, bumps: 0, bumpCd: 0, legT: 0, check: null };
}

// One step of the plan after the heli moved: rings, the catch, a touchdown on
// the right pad. Returns this step's events ([kind, detail]); the leg index
// moves on by itself, except 'cruise' and 'pickup' (the caller times those
// and calls nextLeg).
export function advance(plan, st, v, b, dt) {
  const ev = [];
  const leg = plan.legs[st.leg];
  if (!leg) return ev;
  st.legT += dt;
  const pos = { x: v.x, y: v.y, z: v.z };
  if (leg.kind === 'rings') {
    const r = passRing(leg, st, pos);
    if (r) {
      if (r === 'hit') st.ringsHit++; else st.ringsMissed++;
      ev.push([r === 'hit' ? 'ring' : 'miss', st.ring]);
      st.ring++;
      if (st.ring >= leg.rings.length) { ev.push(['leg', leg.kind]); nextLeg(st); }
    }
  } else if (leg.kind === 'catch') {
    st.bumpCd -= dt;
    const c = catchCheck(pos, { x: v.vx || 0, y: v.vy || 0 }, b);
    st.check = c;
    if (c.bump && st.bumpCd <= 0) {
      st.bumpCd = 2;
      st.bumps++;
      st.catchP = Math.max(0, st.catchP - 2);
      const a = Math.atan2(v.y - b.y, v.x - b.x);
      v.x = b.x + Math.cos(a) * (CATCH.near + 1); v.y = b.y + Math.sin(a) * (CATCH.near + 1);
      ev.push(['bump', st.bumps]);
    }
    st.catchP = clamp(st.catchP + (c.zone ? dt : -dt * 0.4), 0, CATCH.need);
    if (st.catchP >= CATCH.need) { ev.push(['caught']); ev.push(['leg', leg.kind]); nextLeg(st); }
  } else if (leg.kind === 'pad') {
    if (v.onGround && v.landPad && v.landPad.id === leg.pad) { ev.push(['landed', leg.why]); ev.push(['leg', leg.kind]); nextLeg(st); }
  }
  return ev;
}

export function nextLeg(st) {
  st.leg++;
  st.ring = 0;
  st.legT = 0;
  st.catchP = 0;
  st.check = null;
}

export const legMode = (leg) => (!leg ? null : leg.kind === 'catch' ? 'catch' : leg.kind === 'rings' ? 'rings' : 'pad');
