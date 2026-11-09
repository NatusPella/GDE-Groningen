// Het Pannenkoekenschip (minigames batch 3): the rules of the pancake-boat
// minigame (pure, no DOM, no THREE; node-tested in scripts/minigames3_test.mjs).
// You are the cook on an invented pancake boat. Three pans: pour batter, flip
// when the pancake is golden (inside the window), plate it. Guests order a
// pancake with a topping and lose patience; serve the plate that matches. Two
// minutes; medals on points; a pancake that is not golden is worth half. Guests that leave unserved cost a few points.
import { medalFrom } from './minigamekit.js';

export const PAN = { pans: 3, cookT: 6, goldenT: 2.2, burnT: 9.5, plateMax: 4, duration: 120, orderEvery: 7.5, patience: 24, maxGuests: 5 };
export const TOPPINGS = [
  { id: 'stroop', name: 'stroop' },
  { id: 'spek', name: 'spek' },
  { id: 'appel', name: 'appel' },
  { id: 'kaas', name: 'kaas' },
];
export const POINTS = { serve: 60, fast: 25, golden: 15, leave: -20, burnt: -10, raw: -5 };
import { scaleTarget } from './difficulty.js';
export const MEDAL_AT = [400, 700, 1000];
export const scaledMedalAt = (mode = 'standaard') => MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false))); // #800
export const pannenkoekMedal = (p, mode = 'standaard') => medalFrom(p, scaledMedalAt(mode));

export function createPan(rand) {
  return {
    t: 0, left: PAN.duration, rand, phase: 'run', points: 0, served: 0, left_: 0, burnt: 0, raw: 0, nextOrder: 1.5,
    pans: Array.from({ length: PAN.pans }, () => ({ state: 'empty', age: 0 })),
    plate: [], guests: [], flash: null, golden: 0,
  };
}

export const goldenNow = (pan) => pan.state === 'cooking' && pan.age >= PAN.cookT && pan.age <= PAN.cookT + PAN.goldenT;

// act on a pan: pour when empty, flip-and-plate when cooking.
export function usePan(st, i) {
  const pan = st.pans[i];
  if (!pan || st.phase !== 'run') return { type: 'none' };
  if (pan.state === 'empty') { pan.state = 'cooking'; pan.age = 0; return { type: 'pour', pan: i }; }
  if (pan.state === 'burnt') { pan.state = 'empty'; pan.age = 0; return { type: 'scrape', pan: i }; }
  if (pan.state === 'cooking') {
    if (pan.age < PAN.cookT) { pan.state = 'empty'; st.raw++; st.points += POINTS.raw; return { type: 'raw', pan: i }; }
    if (st.plate.length >= PAN.plateMax) return { type: 'full', pan: i };
    const golden = goldenNow(pan);
    pan.state = 'empty'; pan.age = 0;
    st.plate.push({ golden });
    if (golden) { st.golden++; st.points += POINTS.golden; }
    return { type: 'plate', pan: i, golden };
  }
  return { type: 'none' };
}

// serve the plate's oldest pancake to guest g with the given topping choice
export function serve(st, g, topping) {
  const guest = st.guests[g];
  if (!guest || !st.plate.length) return { type: 'none' };
  if (guest.topping !== topping) return { type: 'wrong', want: guest.topping };
  const cake = st.plate.shift();
  st.guests.splice(g, 1);
  st.served++;
  const fast = guest.patience > PAN.patience * 0.5;
  st.points += (cake.golden ? POINTS.serve : POINTS.serve / 2) + (fast ? POINTS.fast : 0);
  return { type: 'serve', fast, topping };
}

export function stepPan(st, dt) {
  const ev = [];
  if (st.phase !== 'run') return ev;
  st.t += dt;
  st.left -= dt;
  for (let i = 0; i < st.pans.length; i++) {
    const pan = st.pans[i];
    if (pan.state !== 'cooking') continue;
    pan.age += dt;
    if (pan.age > PAN.burnT) { pan.state = 'burnt'; st.burnt++; st.points += POINTS.burnt; ev.push({ type: 'burnt', pan: i }); }
  }
  for (let i = st.guests.length - 1; i >= 0; i--) {
    const g = st.guests[i];
    g.patience -= dt;
    if (g.patience <= 0) { st.guests.splice(i, 1); st.left_++; st.points += POINTS.leave; ev.push({ type: 'leave', topping: g.topping }); }
  }
  if (st.left > 8) {
    st.nextOrder -= dt;
    if (st.nextOrder <= 0 && st.guests.length < PAN.maxGuests) {
      st.nextOrder = PAN.orderEvery * (0.75 + st.rand() * 0.5);
      const top = TOPPINGS[Math.floor(st.rand() * TOPPINGS.length)].id;
      st.guests.push({ topping: top, patience: PAN.patience });
      ev.push({ type: 'guest', topping: top });
    }
  }
  if (st.left <= 0) { st.phase = 'done'; st.points = Math.max(0, st.points); ev.push({ type: 'done' }); }
  return ev;
}

// A bot: skill 0..1 is how reliably it flips in the golden window.
export function botPan(st, skill, rand) {
  const acts = [];
  st.pans.forEach((p, i) => {
    if (p.state === 'empty' || p.state === 'burnt') acts.push(['pan', i]);
    else if (p.state === 'cooking' && p.age >= PAN.cookT + (1 - skill) * PAN.burnT * 0.8 * rand()) acts.push(['pan', i]);
  });
  if (st.plate.length && st.guests.length) acts.push(['serve', 0, st.guests[0].topping]);
  return acts.slice(0, 2);
}
