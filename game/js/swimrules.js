// Zwembad Het Natte Papier: the rules of the swimming minigame (pure, no DOM,
// no THREE; node-tested in scripts/minigames2_test.mjs). Four lengths of a
// 25 m pool after a dive from the block. A and D alternate for the strokes
// (the rhythm is the skill: about every 0.55 s), Space dives well when the
// marker is in the green and flips the turns at the wall. Medals by time.
import { clamp } from './minigamekit.js';
// #800: de stand schaalt de medailledrempels; Standaard geeft exact de oude waarden.
import { scaleTarget } from './difficulty.js';
export const scaledMedalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, true)));


export const POOL = { len: 25, width: 12.5, lanes: 5, lengths: 4, lane: 2 };
export const SWIM = {
  idealGap: 0.55,
  impulse: 0.7,
  drag: 0.5,
  quad: 0.11,
  staminaPerStroke: 0.009,
  staminaRest: 0.03,
  tired: 0.25,
  diveCycle: 1.4,
  diveGreen: [0.42, 0.62],
  turnWindow: 1.6,
  turnLoss: 0.8,
};
// seconds for the 100 m: bronze, silver, gold
export const MEDAL_AT = [100, 76, 64];

export const swimMedal = (t, mode = 'standaard') => { const at = scaledMedalAt(mode); return !Number.isFinite(t) ? 0 : t <= at[2] ? 3 : t <= at[1] ? 2 : t <= at[0] ? 1 : 0; };

export function createSwim() {
  return {
    phase: 'block', t: 0, time: 0, x: 0, dir: 1, length: 0, dist: 0, v: 0, stamina: 1, lastKey: null, lastAt: -9, gap: 0,
    quality: 0, glide: 0, dive: null, flipped: false, turnLoss: 0, strokes: 0, flips: 0, turns: 0, flops: false, flash: null,
  };
}

// The dive marker swings 0..1..0; Space stops it.
export const diveMarker = (t) => 0.5 - 0.5 * Math.cos((t / SWIM.diveCycle) * Math.PI * 2);
export const diveQuality = (m) => {
  const [a, b] = SWIM.diveGreen;
  if (m >= a && m <= b) return 1;
  const off = m < a ? a - m : m - b;
  return clamp(1 - off * 3, 0, 0.9);
};

// The quality of one stroke: right key, right rhythm. The same key twice flails.
export function strokeQuality(gap, sameKey) {
  if (sameKey) return 0.12;
  const e = Math.abs(gap - SWIM.idealGap) / SWIM.idealGap;
  return clamp(1 - (e - 0.08) * 3, 0.05, 1);
}

// inp: { dive, stroke: 'a'|'d'|null, flip }; returns the events of this step.
export function stepSwim(st, inp, dt) {
  const ev = [];
  st.t += dt;
  if (st.phase === 'block') {
    if (inp.dive) {
      const q = diveQuality(diveMarker(st.t));
      st.quality = q;
      st.phase = 'swim';
      st.glide = 0.6 + q * 0.9;
      st.v = q >= 0.95 ? 3.2 : 1.4 + q * 1.6;
      st.flops = q < 0.5;
      st.time = 0;
      ev.push({ type: 'dive', q });
    }
    return ev;
  }
  if (st.phase !== 'swim') return ev;
  st.time += dt;
  if (st.turnLoss > 0) { st.turnLoss -= dt; st.v = Math.max(st.v, 0.4); }
  // strokes
  if (inp.stroke && st.glide <= 0 && st.turnLoss <= 0) {
    const gap = st.time - st.lastAt;
    const q = strokeQuality(gap, st.lastKey === inp.stroke);
    const fresh = st.stamina < SWIM.tired ? 0.5 : 1;
    st.v += SWIM.impulse * q * fresh;
    st.stamina = clamp(st.stamina - SWIM.staminaPerStroke * (gap < 0.4 ? 3 : 1), 0, 1);
    st.lastKey = inp.stroke;
    st.lastAt = st.time;
    st.gap = gap;
    st.strokes++;
    ev.push({ type: 'stroke', q });
  } else if (st.time - st.lastAt > 0.9) {
    st.stamina = clamp(st.stamina + SWIM.staminaRest * dt, 0, 1);
  }
  if (st.glide > 0) st.glide -= dt;
  // the water pushes back
  st.v = Math.max(0, st.v - (SWIM.drag * st.v + SWIM.quad * st.v * st.v) * dt * (st.glide > 0 ? 0.35 : 1));
  const ds = st.v * dt;
  st.x += st.dir * ds;
  st.dist += ds;
  // the wall: a flip turn if Space was pressed within the window, else a plain turn
  const toWall = st.dir > 0 ? POOL.len - st.x : st.x;
  if (inp.flip && toWall <= SWIM.turnWindow) st.flipped = true;
  if (toWall <= 0) {
    st.length++;
    st.x = st.dir > 0 ? POOL.len : 0;
    if (st.length >= POOL.lengths) {
      st.phase = 'done';
      ev.push({ type: 'finish', time: st.time });
      return ev;
    }
    st.dir *= -1;
    const flip = st.flipped;
    if (flip) { st.v = Math.max(st.v, 2.6); st.flips++; ev.push({ type: 'turn', flip: true }); }
    else { st.v = Math.min(st.v, 0.8); st.turnLoss = SWIM.turnLoss; ev.push({ type: 'turn', flip: false }); }
    st.turns++;
    st.flipped = false;
    st.glide = flip ? 0 : 0.35;
    ev.push({ type: 'length', n: st.length });
  }
  return ev;
}

// A bot for the tests: perfect rhythm with a chosen error, flips at the wall.
export function botInput(st, dt, skill = 1, rng = Math.random) {
  const inp = { dive: false, stroke: null, flip: false };
  if (st.phase === 'block') {
    const m = diveMarker(st.t);
    inp.dive = skill >= 0.9 ? diveQuality(m) >= 1 : st.t > 0.3;
    return inp;
  }
  const toWall = st.dir > 0 ? POOL.len - st.x : st.x;
  if (skill >= 0.8 && toWall < 1.2) inp.flip = true;
  const gap = st.time - st.lastAt;
  const want = SWIM.idealGap * (1 + (1 - skill) * (rng() * 1.4 - 0.5));
  if (gap >= want && st.glide <= 0 && st.turnLoss <= 0) inp.stroke = st.lastKey === 'a' ? 'd' : 'a';
  return inp;
}
