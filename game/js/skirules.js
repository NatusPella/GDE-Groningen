// Waterskibaan Grunopark: the rules of the water-skiing minigame (pure, no DOM,
// no THREE; node-tested in scripts/minigames2_test.mjs). A boat tows you along
// a 480 m stretch of the lake on a 14 m rope. A and D lean you out to the side
// (the rope pulls you back), Space pops you over the wake for a jump when you
// cross it, in the air A and D spin and E grabs the ski. Swing wide round the
// buoys, keep the jumps clean, don't fall: three falls end the run.
import { clamp } from './minigamekit.js';

export const SKI = {
  len: 480, rope: 14, boatSpeed: 11, rampT: 4, halfWidth: 26,
  swing: 7, swingLen: 55, wakeAt: 7, pull: 1.1, damp: 0.9, steer: 13,
  jumpBuffer: 0.4, gate: { every: 60, first: 50, side: 14, tol: 2 },
  gravity: 9.8, spinRate: 4.2, fallT: 1.8, tries: 3, ropeMax: 22,
};
// points: bronze, silver, gold
import { scaleTarget } from './difficulty.js';
export const MEDAL_AT = [650, 1300, 2200];
export const scaledMedalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false))); // #800
export const skiMedal = (p, mode = 'standaard') => { const at = scaledMedalAt(mode); return p >= at[2] ? 3 : p >= at[1] ? 2 : p >= at[0] ? 1 : 0; };

export const boatLat = (s) => SKI.swing * Math.sin(s / SKI.swingLen);

export function makeGates(len = SKI.len) {
  const out = [];
  let side = 1;
  for (let s = SKI.gate.first; s < len - 20; s += SKI.gate.every) { out.push({ s, side, done: false, hit: null }); side = -side; }
  return out;
}

export function createSki() {
  return {
    phase: 'ready', t: 0, sB: SKI.rope, vB: 0, sS: 0, px: 0, vx: 0, z: 0, vz: 0, air: 0, airT: 0, spin: 0, grab: false, jumpIn: 0, rel: 0,
    fall: 0, falls: 0, cool: 0, score: 0, mult: 1, gates: makeGates(), gateHits: 0, jumps: 0, bestAir: 0, lastClean: false, flash: null, crossed: false, dist: 0,
  };
}

const ridgeSide = (rel) => Math.sign(rel);

// inp: { steer: -1..1, jump, grab, spin: -1..1 }; returns events.
export function stepSki(st, inp, dt) {
  const ev = [];
  if (st.phase === 'done' || st.phase === 'over') return ev;
  inp = { steer: 0, jump: false, grab: false, spin: 0, ...inp };
  st.t += dt;
  // the boat: a ramp up, then steady
  const target = st.phase === 'ready' ? 0 : SKI.boatSpeed;
  if (st.phase === 'ready' && st.t >= 0.6) st.phase = 'run';
  st.vB += (target - st.vB) * Math.min(1, dt / (SKI.rampT / 3));
  st.sB += st.vB * dt;
  st.sS = st.sB - SKI.rope;
  st.dist = Math.max(0, st.sS);
  const bl = boatLat(st.sS);
  if (st.fall > 0) {
    st.fall -= dt;
    st.px += (bl - st.px) * Math.min(1, dt * 3);
    st.vx = 0; st.z = 0; st.vz = 0; st.air = 0; st.spin = 0;
    st.rel = st.px - bl;
    if (st.fall <= 0) st.rel = st.px - bl;
    checkEnd(st, ev);
    return ev;
  }
  st.cool = Math.max(0, (st.cool || 0) - dt);
  if (inp.jump) st.jumpIn = SKI.jumpBuffer;
  else st.jumpIn = Math.max(0, st.jumpIn - dt);
  const rel0 = st.px - bl;
  const grounded = st.air === 0;
  if (grounded) {
    st.vx += (inp.steer * SKI.steer - SKI.pull * rel0 - SKI.damp * st.vx) * dt;
  } else {
    st.vx += (-SKI.damp * 0.3 * st.vx) * dt;
  }
  st.px += st.vx * dt;
  const rel = st.px - bl;
  // across the wake
  const crossed = Math.abs(rel0) < SKI.wakeAt && Math.abs(rel) >= SKI.wakeAt || Math.abs(rel0) >= SKI.wakeAt && Math.abs(rel) < SKI.wakeAt;
  const outward = Math.abs(rel) > Math.abs(rel0);
  if (grounded && crossed && outward && Math.abs(st.vx) > 3) {
    if (st.jumpIn > 0 && st.cool <= 0) {
      st.vz = 3.6 + 0.35 * Math.abs(st.vx);
      st.air = 1; st.z = 0.01; st.airT = 0; st.spin = 0; st.grab = false; st.jumpIn = 0;
      st.jumps++;
      ev.push({ type: 'jump', power: st.vz });
    } else {
      ev.push({ type: 'bump' });
    }
  }
  if (st.air) {
    st.airT += dt;
    st.vz -= SKI.gravity * dt;
    st.z += st.vz * dt;
    st.spin += (inp.spin || 0) * SKI.spinRate * dt;
    if (inp.grab && !st.grab && st.z > 0.4) { st.grab = true; ev.push({ type: 'grab' }); }
    if (st.z <= 0 && st.vz < 0) land(st, ev);
  }
  st.rel = st.px - bl;
  // the lake edge and the rope
  if (Math.abs(st.px) > SKI.halfWidth) fall(st, ev, 'oever');
  else if (Math.abs(st.rel) > SKI.ropeMax && st.air === 0) fall(st, ev, 'touw');
  // buoys
  for (const g of st.gates) {
    if (g.done || st.sS < g.s) continue;
    g.done = true;
    const lat = st.px * g.side;
    if (lat >= SKI.gate.side - SKI.gate.tol) {
      g.hit = true;
      st.gateHits++;
      const pts = 120 * st.mult;
      st.score += pts;
      ev.push({ type: 'gate', points: pts, side: g.side });
    } else { g.hit = false; ev.push({ type: 'miss', side: g.side }); }
  }
  st.score = Math.max(0, st.score);
  checkEnd(st, ev);
  return ev;
}

function land(st, ev) {
  const turns = st.spin / Math.PI;
  const off = Math.abs(turns - Math.round(turns));
  const clean = off < 0.28;
  const air = st.airT;
  st.bestAir = Math.max(st.bestAir, air);
  st.air = 0; st.z = 0; st.vz = 0;
  if (!clean) { st.spin = 0; fall(st, ev, 'landing'); return; }
  const spins = Math.round(Math.abs(turns));
  let pts = Math.round(air * 50 + spins * 100 + (st.grab ? 60 : 0));
  st.lastClean = true;
  pts *= st.mult;
  st.score += pts;
  if (st.mult < 3) st.mult++;
  st.cool = 1.5;
  ev.push({ type: 'land', points: pts, air, spins, grab: st.grab, mult: st.mult });
  st.spin = 0; st.grab = false;
}

function fall(st, ev, why) {
  st.falls++;
  st.fall = SKI.fallT;
  st.score = Math.max(0, st.score - 50);
  st.mult = 1;
  st.air = 0; st.z = 0; st.vz = 0; st.vx = 0; st.spin = 0; st.grab = false;
  ev.push({ type: 'fall', why, falls: st.falls });
  if (st.falls >= SKI.tries) { st.phase = 'over'; ev.push({ type: 'over' }); }
}

function checkEnd(st, ev) {
  if (st.phase === 'run' && st.sS >= SKI.len) {
    st.phase = 'done';
    st.score += Math.round(st.dist / 4);
    ev.push({ type: 'finish', score: st.score });
  }
}

export const finalScore = (st) => Math.round(st.score);

// A bot for the tests: leans out to the next buoy, back to the middle otherwise, jumps at the wake.
export function botInput(st, skill = 1, rng = Math.random) {
  const inp = { steer: 0, jump: false, grab: false, spin: 0 };
  const bl = boatLat(st.sS);
  const gate = st.gates.find((g) => !g.done);
  let want = bl;
  if (gate && gate.s - st.sS < 32 * skill + 8) want = gate.side * (SKI.gate.side + 2.5);
  const err = want - st.px;
  inp.steer = clamp(err / 4, -1, 1);
  const rel = st.px - bl;
  const gateNear = gate && gate.s - st.sS < 30;
  if (skill >= 0.8 && !gateNear && st.air === 0 && Math.abs(rel) > SKI.wakeAt - 3.5 && Math.abs(rel) < SKI.wakeAt + 1) inp.jump = true;
  if (st.air) {
    inp.grab = skill >= 0.9;
    const turns = st.spin / Math.PI;
    const wantSpin = Math.round(turns + (st.vz > 0 ? 1.0 : 0));
    const goal = skill >= 0.9 && st.vz > 2.5 ? wantSpin : Math.round(turns);
    inp.spin = clamp((goal - turns) * 2, -1, 1);
  }
  return inp;
}
