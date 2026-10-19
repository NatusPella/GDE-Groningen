// Heli-besturing (#166), pure: toetsen zijn aan/uit, dus een tik gaf meteen vol
// gas. Hier loopt elke as op en af naar zijn doel (een tik is een kleine
// beweging, vasthouden is vol) met een zachte curve vlak bij nul. Zonder DOM en
// THREE; heliflight.js (flyHeli) gebruikt het voor de vier assen. Tests:
// scripts/helictl_test.mjs.

export const RAMP = { up: 0.22, down: 0.12 };   // s van 0 naar 1 en terug
const EXPO = 0.35;

// zachte curve: klein bij kleine uitslag, 1 bij volle uitslag, tekenvast
export function expo(x, e = EXPO) {
  return (1 - e) * x + e * x * x * x;
}

// één as, naar target (-1..1); een tegengestelde richting remt met de down-tijd
export function shapeAxis(cur, target, dt, ramp = RAMP) {
  if (target === cur) return cur;
  const growing = Math.abs(target) > Math.abs(cur) && (cur === 0 || Math.sign(target) === Math.sign(cur));
  const rate = dt / (growing ? ramp.up : ramp.down);
  const d = target - cur;
  return Math.abs(d) <= rate ? target : cur + Math.sign(d) * rate;
}

// ctl: { up, yaw, fwd, side } (bewaard op de heli); raw: dezelfde assen, -1/0/1.
// Geeft de gevormde assen; de uitkomst is exact 0 zodra de toets loslaat en uitgelopen is.
export function shapeInputs(ctl, raw, dt) {
  for (const k of ['up', 'yaw', 'fwd', 'side']) ctl[k] = shapeAxis(ctl[k] || 0, raw[k] || 0, dt);
  return { up: expo(ctl.up), yaw: expo(ctl.yaw), fwd: expo(ctl.fwd), side: expo(ctl.side) };
}
