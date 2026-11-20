// Camera-lean in bochten en een kleine FOV-opening bij driften (game feel, #985). Pure regels,
// Node-safe, zonder THREE; scene3d.js draait de rol na cam.lookAt en telt `fov` bij de snelheids-FOV.
// `fx` is effectsFor() uit a11ylogic.js: bij Beweging beperken is alles 0. Geen allocaties per frame:
// stepLean hergebruikt zijn toestandsobject.

import { stepFov } from './gamefeel.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const LEAN_MAX = { car: 0.03, bike: 0.07, other: 0.02 }; // rad (ca. 1,7, 4 en 1,1 graden)
export const DRIFT_FOV_MAX = 3;                                   // graden extra tijdens een slip
const LEAN_RATE = 5;                                              // per seconde naar het doel toe
const LEAN_YAW_FULL = 1.1;                                        // rad/s gierhoek waarbij de rol vol is
const LEAN_SPEED_FROM = 3, LEAN_SPEED_TO = 18;                    // m/s: stapvoets geen lean, snel vol
const SLIP_FROM = 0.2, SLIP_TO = 0.7;                             // rad

export function makeLean() { return { roll: 0, fov: 0, angle: null }; }

function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

// kind: 'car' | 'bike' | 'other'; angle: de koers van het voertuig (rad); speed in m/s; slip in rad.
// Zonder voertuig (kind '') loopt alles zacht terug naar 0. Geeft de toestand (roll in rad, fov in graden).
export function stepLean(l, kind, angle, speed, slip, dt, fx = { cameraSway: 1 }) {
  if (!(dt > 0)) return l;
  let goalRoll = 0, goalFov = 0;
  if (kind && fx.cameraSway && Number.isFinite(angle)) {
    if (l.angle != null) {
      const yawRate = wrap(angle - l.angle) / dt;
      const sp = Math.abs(speed) || 0;
      const sk = clamp((sp - LEAN_SPEED_FROM) / (LEAN_SPEED_TO - LEAN_SPEED_FROM), 0, 1);
      const max = LEAN_MAX[kind] || LEAN_MAX.other;
      // de koers neemt toe (rechtsaf): roll > 0; scene3d.js rolt de camera mee de bocht in
      goalRoll = clamp(yawRate / LEAN_YAW_FULL, -1, 1) * sk * max;
    }
    if (kind === 'car') goalFov = DRIFT_FOV_MAX * clamp((Math.abs(slip || 0) - SLIP_FROM) / (SLIP_TO - SLIP_FROM), 0, 1) * clamp((Math.abs(speed) - 8) / 8, 0, 1);
    l.angle = angle;
  } else l.angle = null;
  const k = 1 - Math.exp(-LEAN_RATE * dt);
  l.roll += (goalRoll - l.roll) * k;
  l.fov += (goalFov - l.fov) * k;
  if (Math.abs(l.roll) < 1e-5) l.roll = 0;
  if (l.fov < 1e-3) l.fov = 0;
  return l;
}

// Alles van de camera-feel in één aanroep voor scene3d.js: snelheids-FOV (gamefeel.js), lean en drift-FOV.
// Rolt de camera mee (cam.rotateZ) en geeft de extra FOV in graden. Niet in cutscenes (valid), niet te voet.
export function stepCamFeel(l, cam, pv, valid, dt, fx) {
  l.speedFov = stepFov(l.speedFov || 0, valid || !pv || pv.isBoat ? 0 : pv.speed || 0, dt, fx);
  const kind = valid || !pv || pv.isBoat || pv.isHeli || pv.isPlane ? '' : pv.isBike || pv.isScooter ? 'bike' : 'car';
  stepLean(l, kind, pv ? pv.angle : 0, pv ? pv.speed || 0 : 0, pv ? pv.slipAngle || 0 : 0, dt, fx);
  if (l.roll) cam.rotateZ(-l.roll);
  return l.speedFov + l.fov;
}
