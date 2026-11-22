// Klimtoren Zernike: the rules of the climbing tower (pure, no DOM, no THREE;
// node-tested in scripts/minigames2_test.mjs). A 12 m wall of coloured holds.
// Hold A to reach and grip with the left hand, D for the right: a hand
// reaches for 0.7 s and then grips the next hold above; let go of a key and
// that hand lets go. With both hands on the wall and both keys held, the lower
// hand climbs up by itself, slower than a hand the player moves (#978: holding
// on is the game, not letting go); the two hands never take the same hold.
// Never let go with both hands. Gripping drains the arms, a big hold rests
// them, Space chalks the hands once. A fall onto the mat costs four seconds and
// a try; three falls end the climb. Medals by time.
import { makeRng, clamp } from './minigamekit.js';

// autoReach: the reach of a hand that climbs on because both keys are held
// (slower than reachT, so a hand the player moves himself is quicker)
export const WALL = { height: 12, halfWidth: 1.6, rowGap: 0.6, reachT: 0.7, autoReach: 1.2, reachUp: 0.85, reachSide: 1.7, minUp: 0.25, tries: 3, penalty: 4 };
export const ARMS = { both: 0.065, one: 0.16, rest: 0.07, chalk: 0.35, fallBelow: 0 };
// seconds to the top: bronze, silver, gold
export const MEDAL_AT = [80, 48, 30];
import { scaleTarget } from './difficulty.js'; // #800
export const scaledMedalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, true)));
export const climbMedal = (t, mode = 'standaard') => { const at = scaledMedalAt(mode); return !Number.isFinite(t) ? 0 : t <= at[2] ? 3 : t <= at[1] ? 2 : t <= at[0] ? 1 : 0; };

const COLORS = [0xe8523a, 0xf0c030, 0x3a8fe0, 0x6cc070, 0xc060d0, 0xf08a30];

// The holds, the same every time: three or four per row, one in four is a big
// jug that rests the arms. [{ h, x, big, color }] sorted by height.
export function makeHolds(seed = 7) {
  const rng = makeRng(seed);
  const out = [];
  for (let h = 0.7; h <= WALL.height - 0.4; h += WALL.rowGap) {
    const n = 3 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = -WALL.halfWidth + ((i + 0.5 + (rng() - 0.5) * 0.7) / n) * WALL.halfWidth * 2;
      out.push({ h: Math.round((h + (rng() - 0.5) * 0.16) * 100) / 100, x: Math.round(x * 100) / 100, big: rng() < 0.25, color: COLORS[Math.floor(rng() * COLORS.length)] });
    }
  }
  return out.sort((a, b) => a.h - b.h || a.x - b.x);
}
export const TOP_HOLD = { h: WALL.height, x: 0, big: true, color: 0xffd23f, top: true };

export function createClimb(holds = makeHolds()) {
  return {
    holds: [...holds, TOP_HOLD],
    hands: { a: { state: 'free', hold: null, t: 0, target: null, wasDown: false, auto: false }, d: { state: 'free', hold: null, t: 0, target: null, wasDown: false, auto: false } },
    ground: true, body: 0, arms: 1, chalk: 1, t: 0, time: 0, falls: 0, phase: 'ready', penalty: 0, best: 0, grips: 0, fell: 0, chalked: false,
  };
}

const handH = (st, k) => (st.hands[k].hold ? st.hands[k].hold.h : null);
const other = (k) => (k === 'a' ? 'd' : 'a');

// The hold a hand would take next: above its own hold (or the ground), within
// reach of the other hand, the lowest sensible one. Only a hand that really
// holds or grips counts as the reference (a hand in 'miss' hangs in the air),
// and the other hand's grip and the hold it is reaching for are both off
// limits: two hands on one hold look wrong and leave the climber no way up
// (#978).
export function nextHold(st, k) {
  const you = st.hands[other(k)];
  const anchor = you.state === 'grip' ? you.hold : you.state === 'reach' ? you.target : null;
  const ref = anchor || { h: st.body + 1.0, x: 0 };
  const min = anchor ? anchor.h + 0.35 : WALL.minUp;
  let best = null;
  for (const h of st.holds) {
    if (h === you.hold || h === you.target || h.h < min || h.h > ref.h + WALL.reachUp || Math.abs(h.x - ref.x) > WALL.reachSide) continue;
    if (st.ground && h.h > 2.4) continue;
    if (!best || h.h < best.h - 0.01 || (Math.abs(h.h - best.h) <= 0.01 && Math.abs(h.x - ref.x) < Math.abs(best.x - ref.x))) best = h;
  }
  return best;
}

export function startClimb(st) {
  if (st.phase === 'ready') st.phase = 'climb';
}

// inp: { a, d: key held; chalk: Space pressed this step }
export function stepClimb(st, inp, dt) {
  const ev = [];
  if (st.phase !== 'climb') return ev;
  inp = inp || {};
  // een hapering (tabblad weg, laden) is hooguit een kwart seconde: geen val of sprong door een grote dt
  dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
  st.t += dt;
  st.time += dt;
  if (inp.chalk && !st.chalked) { st.chalked = true; st.arms = clamp(st.arms + ARMS.chalk, 0, 1); ev.push({ type: 'chalk' }); }
  let gripped = 0, freshGrip = false;
  for (const k of ['a', 'd']) {
    const hd = st.hands[k], down = !!inp[k];
    if (hd.state === 'grip' && !down) { hd.state = 'free'; hd.hold = null; hd.t = 0; hd.auto = false; ev.push({ type: 'let-go', hand: k }); }
    else if (hd.state === 'free' && down && !hd.wasDown) { hd.state = 'reach'; hd.t = 0; hd.auto = false; hd.target = nextHold(st, k); if (!hd.target) { hd.state = 'miss'; ev.push({ type: 'no-hold', hand: k }); } }
    else if (hd.state === 'reach') {
      if (!down) { hd.state = 'free'; hd.t = 0; hd.target = null; hd.auto = false; }
      else {
        hd.t += dt;
        if (hd.t >= (hd.auto ? WALL.autoReach : WALL.reachT)) {
          hd.state = 'grip';
          hd.hold = hd.target;
          hd.target = null;
          hd.auto = false;
          freshGrip = true;
          st.grips++;
          ev.push({ type: 'grip', hand: k, hold: hd.hold });
        }
      }
    } else if (hd.state === 'miss') {
      if (!down) hd.state = 'free';
      else { const t = nextHold(st, k); if (t) { hd.state = 'reach'; hd.t = 0; hd.auto = false; hd.target = t; } else hd.hold = null; }
    }
    hd.wasDown = down;
    if (hd.state === 'grip') gripped++;
  }
  // the arms
  const both = gripped === 2, bigBoth = both && st.hands.a.hold.big && st.hands.d.hold.big;
  const bigOne = gripped >= 1 && ((st.hands.a.hold && st.hands.a.hold.big) || (st.hands.d.hold && st.hands.d.hold.big));
  if (!st.ground) {
    if (bigBoth) st.arms = clamp(st.arms + ARMS.rest * dt, 0, 1);
    else if (both) st.arms = clamp(st.arms - ARMS.both * (bigOne ? 0.5 : 1) * dt, 0, 1);
    else if (gripped === 1) st.arms = clamp(st.arms - ARMS.one * (bigOne ? 0.55 : 1) * dt, 0, 1);
  }
  // the body hangs below the higher hand
  const hs = ['a', 'd'].map((k) => handH(st, k)).filter((v) => v != null);
  if (hs.length) {
    const target = Math.max(0, Math.max(...hs) - 1.15 - (hs.length === 1 ? 0.15 : 0));
    st.body += (target - st.body) * Math.min(1, dt * 6);
    st.best = Math.max(st.best, Math.max(...hs));
  }
  st.ground = st.body < 0.25;
  if (!st.ground && (gripped === 0 || st.arms <= 0)) return fall(st, ev, gripped === 0 ? 'let-go' : 'arms');
  if (hs.length && Math.max(...hs) >= WALL.height - 0.01) {
    st.phase = 'top';
    st.time += st.penalty;
    ev.push({ type: 'top', time: st.time });
    return ev;
  }
  // Both hands on the wall and both keys held: the lower hand moves up by
  // itself, so holding A and D climbs (the help says to hold them, #978).
  // It works from the mat too, otherwise two low holds leave the climber
  // standing there. Two big holds are the resting place: there the climber
  // hangs on until the arms are full again and only then climbs on.
  // (not in the step a hand just gripped: that would snatch the hand away from
  // a player who is about to move it himself)
  if (!freshGrip && inp.a && inp.d && st.hands.a.state === 'grip' && st.hands.d.state === 'grip') {
    const A = st.hands.a, D = st.hands.d;
    if (!(A.hold.big && D.hold.big && st.arms < 1)) {
      const k = A.hold.h <= D.hold.h ? 'a' : 'd', hd = st.hands[k];
      const t = nextHold(st, k);
      hd.t = 0;
      hd.target = t;
      hd.auto = !!t;
      if (t) { hd.state = 'reach'; ev.push({ type: 'reach', hand: k, auto: true }); }
      else { hd.hold = null; hd.state = 'miss'; ev.push({ type: 'no-hold', hand: k, auto: true }); }
    }
  }
  return ev;
}

function fall(st, ev, why) {
  st.falls++;
  st.fell = st.body;
  st.penalty += WALL.penalty;
  ev.push({ type: 'fall', why, height: st.body, falls: st.falls });
  // the hands are off the wall; a key that is still held grips again (wasDown
  // false), otherwise a fall with A and D held would leave the climber stuck
  for (const k of ['a', 'd']) st.hands[k] = { state: 'free', hold: null, t: 0, target: null, wasDown: false, auto: false };
  st.ground = true; st.body = 0; st.arms = 1; st.chalked = false;
  if (st.falls >= WALL.tries) { st.phase = 'over'; st.time += st.penalty; ev.push({ type: 'over' }); }
  return ev;
}

// A bot for the tests: reaches with the free hand while the other holds, lets go
// of the lower hand once both grip, and rests on big holds when the arms are low.
export function botInput(st, rest = 0.5) {
  const inp = { a: false, d: false, chalk: false };
  if (!st.ground && st.arms < 0.4 && !st.chalked) inp.chalk = true;
  const A = st.hands.a, D = st.hands.d;
  const both = A.state === 'grip' && D.state === 'grip';
  const resting = both && A.hold.big && D.hold.big && st.arms < rest;
  const lower = both ? (A.hold.h <= D.hold.h ? 'a' : 'd') : null;
  for (const k of ['a', 'd']) {
    const h = st.hands[k], o = st.hands[k === 'a' ? 'd' : 'a'];
    if (h.state === 'grip') inp[k] = !(lower === k && !resting);
    else if (h.state === 'reach') inp[k] = true;
    else if (h.wasDown && h.state === 'free') inp[k] = false;
    else inp[k] = st.ground ? (k === 'a' || o.state === 'grip') : o.state === 'grip' && !resting;
  }
  return inp;
}
