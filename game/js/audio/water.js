// Watergeluid (#497), uit audio.js gehaald: de zeilboot (het skûtsje) en de roei-
// en peddelboten (kano, kajak, sup, skiff, acht, waterfiets) hebben geen motor,
// maar wel kraken, boeggolven, een wapperend zeil en peddelslagen. De WebAudio-
// bouwstenen en de ruimtelijke uitgang komen via setWaterHost binnen, zodat deze
// module niets uit audio.js importeert en de modulecyclus op 0 blijft (dezelfde
// naad als audio/scenario.js en audio/radio.js).
import { clamp } from '../util.js';
import { hoofdspeler } from '../players.js';

let host = null;
export function setWaterHost(h) { host = h; }

// Canoes, kayaks and pedalos have no engine: paddle strokes or the pedalo's
// wheel instead (updatePaddling).
const HUMAN_BOATS = new Set(['kano', 'kajak', 'waterfiets', 'sup', 'skiff', 'acht']);
export function humanPowered(v) {
  return !!(v && v.isBoat && v.model && HUMAN_BOATS.has(v.model.kind));
}

// Sailing boats (model.sail: the skûtsje) have no engine either: wind in the
// rig, wood and rigging creaking, the bow wash, a luffing sail (updateSailing).
export function sailPowered(v) {
  return !!(v && v.isBoat && v.model && v.model.sail);
}
export const noMotor = (v) => humanPowered(v) || sailPowered(v);

const sailState = new WeakMap();
const SAIL_RANGE = 60;

export function updateSailing(dt, world) {
  if (!host || !host.ready() || world.paused) return;
  const pv = hoofdspeler(world).inVehicle;
  for (const v of world.vehicles) {
    if (!sailPowered(v) || v.wrecked || v.sinking) continue;
    const mine = v === pv;
    if (!mine && host.distToListener(v.x, v.y, 1) > SAIL_RANGE) continue;
    let st = sailState.get(v);
    if (!st) { st = { creak: Math.random() * 2, wash: 0, luff: 0, angle: v.angle, yaw: 0 }; sailState.set(v, st); }
    let da = v.angle - st.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    st.angle = v.angle;
    st.yaw += ((dt > 0 ? Math.abs(da) / dt : 0) - st.yaw) * Math.min(1, dt * 3);
    const speed = Math.abs(v.speed || 0);
    const frac = clamp(speed / 8, 0, 1);
    const k = mine ? 1 : 0.7;
    const out = () => host.spatialOut(v.x, v.y, { ref: 5, rolloff: 1.1, range: SAIL_RANGE, h: 1.2 });
    // the hull and the rigging work in the swell, more so under way and turning
    st.creak -= dt * (0.5 + frac + st.yaw * 2);
    if (st.creak <= 0) {
      st.creak = 1.4 + Math.random() * 2.2;
      const o = out();
      if (o) host.playBuf('creak', { out: o, gain: (0.05 + 0.05 * frac) * k, rate: 0.6 + Math.random() * 0.35, prio: 0 });
    }
    // the bow wash: slaps come quicker and louder with speed
    if (speed > 0.6) {
      st.wash -= dt;
      if (st.wash <= 0) {
        st.wash = (1.1 - 0.7 * frac) * (0.8 + Math.random() * 0.4);
        const o = host.spatialOut(v.x, v.y, { ref: 5, rolloff: 1.1, range: SAIL_RANGE, h: 0.2 });
        if (o) {
          host.playBuf('hull_slap', { out: o, gain: (0.08 + 0.12 * frac) * k, rate: 0.8 + Math.random() * 0.3, prio: 0 });
          host.playNoiseBurst({ duration: 0.5 + frac * 0.4, freq: 900 + frac * 900, freqEnd: 500, q: 0.5, gain: (0.03 + 0.06 * frac) * k, type: 'bandpass', out: o, prio: 0 });
        }
      }
    }
    // a sail that spills its wind (slow, turning, or the mast struck) flaps
    const luffing = (v.sailLuff ?? 0) > 0.35 || st.yaw > 0.25 || speed < 1.5;
    if (luffing) {
      st.luff -= dt;
      if (st.luff <= 0) {
        st.luff = 0.9 + Math.random() * 1.4;
        const o = out();
        if (o) {
          const n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) host.playNoiseBurst({ duration: 0.05 + Math.random() * 0.03, freq: 320 + Math.random() * 260, q: 0.9, gain: 0.07 * k, type: 'bandpass', delay: i * (0.07 + Math.random() * 0.04), out: o, prio: 0 });
        }
      }
    }
  }
}

const paddleState = new WeakMap();
const PADDLE_RANGE = 45;

function paddleStroke(v, st, out, near) {
  const kind = v.model.kind;
  const k = near ? 1 : 0.7;
  if (kind === 'waterfiets') {
    // a blade of the stern wheel slapping in, and now and then the crank
    host.playNoiseBurst({ duration: 0.16, freq: 700 + Math.random() * 300, freqEnd: 260, q: 0.9, gain: 0.16 * k, type: 'bandpass', out });
    if ((st.n = (st.n || 0) + 1) % 4 === 0) host.playTone({ freq: 1900, freqEnd: 1500, type: 'triangle', duration: 0.03, gain: 0.025 * k, filterFreq: 3000, out });
    return;
  }
  // dip (short swish), then the pull through the water
  host.playNoiseBurst({ duration: 0.09, freq: 2600, freqEnd: 900, q: 1.4, gain: 0.07 * k, type: 'bandpass', out });
  host.playNoiseBurst({ duration: 0.42, freq: 900 + Math.random() * 250, freqEnd: 240, q: 0.6, gain: 0.22 * k, type: 'lowpass', delay: 0.07, out });
}

export function updatePaddling(dt, world) {
  if (!host || !host.ready() || world.paused) return;
  const pv = hoofdspeler(world).inVehicle;
  for (const v of world.vehicles) {
    if (!humanPowered(v) || v.wrecked || v.sinking) continue;
    const mine = v === pv;
    const speed = Math.abs(v.speed || 0);
    const pulling = mine ? (v.throttle || 0) !== 0 || speed > 0.4 : speed > 0.3;
    if (!pulling) continue;
    if (!mine && host.distToListener(v.x, v.y, 0.5) > PADDLE_RANGE) continue;
    let st = paddleState.get(v);
    if (!st) { st = { t: Math.random() * 0.5 }; paddleState.set(v, st); }
    const top = v.model.maxSpeed || 2.5;
    const frac = clamp(speed / top, 0, 1);
    const period = v.model.kind === 'waterfiets' ? 0.34 - 0.16 * frac : v.model.kind === 'kajak' ? 0.62 - 0.14 * frac : v.model.kind === 'sup' ? 1.1 - 0.2 * frac : v.model.kind === 'skiff' || v.model.kind === 'acht' ? 1.5 - 0.3 * frac : 0.95 - 0.2 * frac;
    st.t -= dt;
    if (st.t > 0) continue;
    st.t = period * (0.92 + Math.random() * 0.16);
    const out = host.spatialOut(v.x, v.y, { ref: 4, rolloff: 1.2, range: PADDLE_RANGE, h: 0.4 });
    if (out) paddleStroke(v, st, out, mine);
  }
}
