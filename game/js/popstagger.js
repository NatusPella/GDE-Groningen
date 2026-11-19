// Spreads the periodic population work over several frames (efficiency audit):
// cars, bikes, scooters, motors and pedestrians used to land on one frame (a 1-4 ms
// spike). Each slot keeps its own timer with the same period but a different phase.
// Pure: no three.js, no DOM, so scripts/popstagger_test.mjs checks it directly.

// slots: [{ name, period, offset }]. tick(dt) returns the names due this frame, in order.
export function createPopStagger(slots) {
  const timers = slots.map((s) => s.offset || 0);
  return {
    tick(dt) {
      const due = [];
      for (let i = 0; i < slots.length; i++) {
        timers[i] -= dt;
        if (timers[i] <= 0) { timers[i] = slots[i].period; due.push(slots[i].name); }
      }
      return due;
    },
  };
}

// 1.5 s cars (t), bikes +0.3 s, scooters +0.6 s, motors +0.9 s; pedestrians every 2 s, phase 1.2 s (never lands on another slot).
export const POP_SLOTS = [
  { name: 'cars', period: 1.5, offset: 0 },
  { name: 'bikes', period: 1.5, offset: 0.3 },
  { name: 'scooters', period: 1.5, offset: 0.6 },
  { name: 'motors', period: 1.5, offset: 0.9 },
  { name: 'peds', period: 2, offset: 1.2 },
];
