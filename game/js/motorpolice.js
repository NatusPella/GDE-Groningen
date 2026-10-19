// A tuned ("opgevoerde") AI brommer that rides past a police unit gets noticed:
// a short remark in the message feed, once per rider, no star and no fine for
// the player (#17). Pure logic apart from reading world.vehicles;
// scripts/motorpolice_test.mjs checks it.
import { MOPED_LEGAL_SPEED } from './motomodels.js';

const NOTICE_M = 35;
export const NOTICE_COOLDOWN_S = 40;
const TEXTS = [
  'Agent ziet een opgevoerde brommer voorbijscheuren',
  'Over de radio: een brommer die veel te hard gaat voor zijn papieren',
  'De politie kijkt een opgevoerde brommer na',
];

// Is this AI vehicle a tuned brommer riding faster than the legal speed?
export function isTunedSpeeder(v) {
  return !!(v && v.isMotor && v.tunedMoped && !v.wrecked && v.driver !== 'player' && Math.abs(v.speed || 0) > MOPED_LEGAL_SPEED * 1.04);
}

// The first tuned speeder within NOTICE_M of a working police unit, or null.
export function spottedTunedMoped(vehicles, radius = NOTICE_M) {
  const r2 = radius * radius;
  for (const c of vehicles || []) {
    if (!c.isPolice || c.wrecked || c.disabled || c.hijacked || c.driver === 'player') continue;
    for (const v of vehicles) {
      if (v._copNoticed || !isTunedSpeeder(v)) continue;
      if ((v.x - c.x) ** 2 + (v.y - c.y) ** 2 <= r2) return v;
    }
  }
  return null;
}

let cool = 0;
let n = 0;
export function resetMotorPolice() { cool = 0; n = 0; }

// Call once per frame; returns the text said (or '').
export function updateMotorPolice(dt, world) {
  if (cool > 0) { cool -= dt; return ''; }
  const v = spottedTunedMoped(world.vehicles);
  if (!v) return '';
  v._copNoticed = true;
  cool = NOTICE_COOLDOWN_S;
  const text = TEXTS[n++ % TEXTS.length];
  if (world.addMessage) world.addMessage(text, 4, { kind: 'politie', key: 'moped-notice' });
  return text;
}
