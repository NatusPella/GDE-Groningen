// Helikopter en vliegtuig met echte opnames (CC0, game/audio/sfx; zie docs/AUDIO-VOERTUIGEN.md): naadloze lussen waarvan niveau en
// afspeelsnelheid de toestand volgen (de koppeling staat in sfx/aircraftmap.js). Ontbreken de opnames, dan blijft de procedurele
// rotor van sfx/sky.js en speelt een vliegtuig de gewone motorsynth (audio.js) zoals voorheen.
//   - helikopter: stationair- en vluchtlaag, afspeelsnelheid = rotortoerental (oplopen en uitlopen), wop-wop bij dalen en schuin vliegen,
//     dof in de cabine, doppler en luchtfilter op afstand (de lagen draaien in sky.js via buildHeliSampleVoice en driveHeliSampleVoice)
//   - vliegtuig: motorstart, stationair, hoge toeren, wind, rollen op baan of gras, overtrekzoemer, landingsgestel, uitlopen van de schroef
// Het vliegtuig van de speler of het dichtstbijzijnde bezette toestel in de buurt klinkt; een langsvliegend toestel krijgt doppler.
import { hoofdspeler } from '../players.js';
import { noMotor } from '../audio/water.js';
import { rotorParams, planeParams, planeRpmTarget, boatParams, rpmStep, dopplerFactor, edge, gearEvent, startNeeded, START_IDLE_AT, START_S } from './aircraftmap.js';

export const HELI_KEYS = ['heli_rotor_stat', 'heli_rotor_vlucht'];
export const PLANE_KEYS = ['vliegtuig_start', 'vliegtuig_stationair', 'vliegtuig_toeren', 'vliegtuig_wind', 'vliegtuig_overtrek', 'vliegtuig_gestel', 'vliegtuig_rol_asfalt', 'vliegtuig_rol_gras'];
export const BOAT_KEYS = ['boot_motor_stat', 'boot_motor_vol'];
const BOAT_LEVEL = 0.75;
const HELI_SAMPLE_LEVEL = 0.85;
const PLANE_LEVEL = 0.8;
const PLANE_RANGE = 1400;

export const keysReady = (kit, keys) => !!(kit && kit.samples && keys.every((k) => kit.samples.has(k)));

function loop(ctx, buf, dest, startRate = 1) {
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true; src.playbackRate.value = startRate;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(g).connect(dest);
  src.start(0, Math.random() * buf.duration);
  return { src, g };
}
const set = (ctx, param, v, tau = 0.12) => param.setTargetAtTime(Number.isFinite(v) ? v : 0, ctx.currentTime, tau);
// Een lusstem die lang stil is, wordt gestopt en afgebroken (audit 21-11): zes plane- en twee boot-lussen liepen anders de hele sessie door
// op gain 0. De stem wordt bij het volgende gebruik opnieuw gebouwd (de lus start toch op een willekeurige plek).
export const STEM_STIL_NA = 20;
function loopsOf(v) { return Object.values(v).filter((x) => x && x.src && x.g); }
function disposeLoops(v) { dispose([...loopsOf(v).flatMap((l) => [l.src, l.g]), ...Object.values(v).filter((x) => x && x.connect && !x.src)]); }
function dispose(nodes) { for (const n of nodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* al gestopt */ } } }

// -- helikopter (aangeroepen door sky.js) -------------------------------------------------------------------------------
export function buildHeliSampleVoice(kit) {
  const ctx = kit.ctx;
  const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 2000; air.Q.value = 0.3;
  const level = ctx.createGain(); level.gain.value = 0;
  const panner = kit.makePanner({ ref: 30, rolloff: 1, model: 'equalpower', maxDist: 4000 });
  air.connect(level).connect(panner).connect(kit.buses.sfx);
  const stat = loop(ctx, kit.samples.buffer('heli_rotor_stat'), air);
  const flight = loop(ctx, kit.samples.buffer('heli_rotor_vlucht'), air);
  return { sample: true, active: true, stat, flight, air, level, panner };
}
export function disposeHeliVoice(v) {
  if (!v) return;
  dispose(v.sample ? [v.stat.src, v.stat.g, v.flight.src, v.flight.g, v.air, v.level, v.panner] : [v.src, v.sub, v.lfo, v.whine, v.level, v.air, v.panner]);
}
// h: de helikopter (rotor, vx, vy, vz, throttle, roll); f en d: doppler en afstand; levelMax het niveau van deze bron
export function driveHeliSampleVoice(kit, voice, h, { f, d, range, levelMax, inside }) {
  const ctx = kit.ctx;
  const speed = Math.hypot(h.vx || 0, h.vy || 0);
  const p = rotorParams({ rotor: h.rotor, speed, vz: h.vz || 0, up: h.throttle || 0, bank: h.roll || 0, inside });
  const fd = inside ? 1 : f;
  set(ctx, voice.level.gain, levelMax * HELI_SAMPLE_LEVEL * p.level * (inside ? 0.8 : edge(d, range)), 0.2);
  set(ctx, voice.stat.src.playbackRate, p.rate * fd, 0.15);
  set(ctx, voice.flight.src.playbackRate, p.flightRate * fd, 0.15);
  set(ctx, voice.stat.g.gain, p.statGain, 0.3);
  set(ctx, voice.flight.g.gain, p.flightGain, 0.3);
  set(ctx, voice.air.frequency, inside ? p.cutoff : Math.min(p.cutoff, 380 + 4200 / (1 + d / 70)), 0.2);
}

// -- vliegtuig ----------------------------------------------------------------------------------------------------------
let kit = null, ctx = null, pv = null;   // pv: de stem van het vliegtuig (lui gebouwd)
const st = { v: null, rpm: 0, wasRunning: false, startT: -99, gear: undefined };

function buildPlaneVoice() {
  const B = (k) => kit.samples.buffer(k);
  const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 3000; air.Q.value = 0.3;
  const level = ctx.createGain(); level.gain.value = 0;
  const panner = kit.makePanner({ ref: 25, rolloff: 1, model: 'equalpower', maxDist: 4000 });
  air.connect(level).connect(panner).connect(kit.buses.sfx);
  const gate = ctx.createGain(); gate.gain.value = 1; gate.connect(air);   // de motor valt pas in na het starten
  const windLp = ctx.createBiquadFilter(); windLp.type = 'lowpass'; windLp.frequency.value = 800;
  windLp.connect(air);
  return {
    air, level, panner, gate, windLp, shots: [], stil: 0,
    idle: loop(ctx, B('vliegtuig_stationair'), gate), high: loop(ctx, B('vliegtuig_toeren'), gate),
    wind: loop(ctx, B('vliegtuig_wind'), windLp), asfalt: loop(ctx, B('vliegtuig_rol_asfalt'), air), gras: loop(ctx, B('vliegtuig_rol_gras'), air),
    stall: loop(ctx, B('vliegtuig_overtrek'), air),
  };
}

function shot(key, gain = 1) {
  const buf = kit.samples.buffer(key);
  if (!buf || !pv) return;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(g).connect(pv.air);
  src.start();
  src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (e) { /* weg */ } };
}

export function updateAircraftSfx(dt, world, k) {
  if (!k || !k.ctx) return;
  kit = k; ctx = k.ctx;
  if (keysReady(k, PLANE_KEYS)) updatePlane(dt, world);
  updateBoat(dt, world);
}

function updatePlane(dt, world) {
  const me = hoofdspeler(world);
  const mine = me && me.inVehicle && me.inVehicle.isPlane ? me.inVehicle : null;
  const L = kit.listener;
  let best = mine, bd = Infinity;
  if (!best) {
    for (const v of world.vehicles || []) {
      if (!v.isPlane || !v.driver || v.wrecked || v.sinking) continue;
      const d = Math.hypot(v.x - L.x, v.y - L.z);
      if (d < bd && d < PLANE_RANGE) { bd = d; best = v; }
    }
  }
  if (!best && st.v && st.rpm > 0.02) best = st.v;   // de schroef draait na
  if (!best) {
    if (pv && pv.active) { set(ctx, pv.level.gain, 0, 0.3); pv.active = false; pv.stil = 0; }
    if (pv && (pv.stil += dt) > STEM_STIL_NA) { disposeLoops(pv); pv = null; }
    st.v = null; st.rpm = 0; st.wasRunning = false;
    return;
  }
  const v = best;
  if (v !== st.v) { st.v = v; st.rpm = 0; st.wasRunning = false; st.gear = undefined; }
  if (!pv) pv = buildPlaneVoice();
  pv.active = true;

  const running = !!v.driver && !v.wrecked && !v.sinking;
  const speed = Math.abs(v.speed || 0);
  const vmax = (v.model && v.model.maxSpeed) || 70;
  const p = v.plane || {};
  const now = ctx.currentTime;
  if (startNeeded(st.wasRunning, running, speed)) { st.startT = now; shot('vliegtuig_start', 0.9); }
  st.wasRunning = running;
  const thr = world.paused ? 0 : v.throttle || 0;
  st.rpm = rpmStep(st.rpm, planeRpmTarget({ running, throttle: thr, speed, vmax }), Math.min(dt, 0.1));
  const inside = v === mine;
  const q = planeParams({ rpm: st.rpm, speed, vmax, onGround: !!v.onGround, surface: v.surface, stalled: !!p.stalled, airborne: !!v.airborne, inside });

  const ge = gearEvent(st.gear, v.gear !== false, v.airborne);
  if (ge) shot('vliegtuig_gestel', 0.8);
  st.gear = v.gear !== false;

  const dop = inside ? { d: Math.hypot(v.x - L.x, v.y - L.z), f: 1 }
    : dopplerFactor({ x: v.x, y: v.y, h: (v.z || 0) + 1.5 }, { x: v.vx || 0, y: v.vy || 0, h: v.vz || 0 }, { x: L.x, h: L.y, y: L.z });
  kit.setPannerPos(pv.panner, v.x, v.y, (v.z || 0) + 1.5, true);
  const f = dop.f;
  const gated = (now - st.startT < START_IDLE_AT && thr < 0.1) ? 0 : 1;   // eerst de startklank, dan valt de motor in
  set(ctx, pv.gate.gain, gated, 0.35);
  set(ctx, pv.level.gain, PLANE_LEVEL * Math.max(q.level, now - st.startT < START_S ? 1 : 0) * (world.paused ? 0.4 : 1) * (inside ? 0.85 : edge(dop.d, PLANE_RANGE)), 0.2);
  set(ctx, pv.idle.g.gain, q.idleGain, 0.15);
  set(ctx, pv.idle.src.playbackRate, q.idleRate * f, 0.12);
  set(ctx, pv.high.g.gain, q.highGain, 0.15);
  set(ctx, pv.high.src.playbackRate, q.highRate * f, 0.12);
  set(ctx, pv.wind.g.gain, q.windGain, 0.2);
  set(ctx, pv.wind.src.playbackRate, q.windRate * f, 0.2);
  set(ctx, pv.windLp.frequency, q.windCutoff, 0.2);
  set(ctx, pv.asfalt.g.gain, q.rollAsfaltGain * 0.8, 0.12);
  set(ctx, pv.gras.g.gain, q.rollGrasGain * 0.8, 0.12);
  set(ctx, pv.asfalt.src.playbackRate, q.rollRate, 0.15);
  set(ctx, pv.gras.src.playbackRate, q.rollRate, 0.15);
  set(ctx, pv.stall.g.gain, q.stallGain * 0.5, 0.08);
  set(ctx, pv.air.frequency, inside ? q.cutoff : Math.min(q.cutoff, 450 + 6000 / (1 + dop.d / 80)), 0.2);
}

// -- motorboot van de speler: stationair en vol gas kruisen op het toerental (de synth van audio.js zwijgt dan voor de boot) -------------------
let bv = null;
const boatSt = { v: null };
export function motorBoat(v) { return !!(v && v.isBoat && !v.wrecked && !v.sinking && !noMotor(v)); }
function updateBoat(dt, world) {
  if (!keysReady(kit, BOAT_KEYS)) return;
  const me = hoofdspeler(world);
  const v = me && me.inVehicle && motorBoat(me.inVehicle) ? me.inVehicle : null;
  if (!v) {
    if (bv && boatSt.v) { set(ctx, bv.level.gain, 0, 0.4); boatSt.v = null; bv.stil = 0; }
    if (bv && (bv.stil = (bv.stil || 0) + dt) > STEM_STIL_NA) { disposeLoops(bv); bv = null; }
    return;
  }
  if (!bv) {
    const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 3000;
    const level = ctx.createGain(); level.gain.value = 0;
    const panner = kit.makePanner({ ref: 10, rolloff: 1.2, model: 'equalpower', maxDist: 600 });
    air.connect(level).connect(panner).connect(kit.buses.sfx);
    bv = { air, level, panner, idle: loop(ctx, kit.samples.buffer('boot_motor_stat'), air), full: loop(ctx, kit.samples.buffer('boot_motor_vol'), air) };
  }
  boatSt.v = v;
  kit.setPannerPos(bv.panner, v.x, v.y, 0.8, true);
  const q = boatParams({ speed: v.speed || 0, vmax: (v.model && v.model.maxSpeed) || 14, throttle: world.paused ? 0 : v.throttle || 0, inside: false });
  set(ctx, bv.level.gain, BOAT_LEVEL * (world.paused ? 0.4 : 1), 0.2);
  set(ctx, bv.idle.g.gain, q.idleGain, 0.15);
  set(ctx, bv.idle.src.playbackRate, q.idleRate, 0.12);
  set(ctx, bv.full.g.gain, q.fullGain, 0.15);
  set(ctx, bv.full.src.playbackRate, q.fullRate, 0.12);
  set(ctx, bv.air.frequency, q.cutoff, 0.2);
}
