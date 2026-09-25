// Sky props audio (see skyprops.js): the trauma helicopter's rotor and the
// hot-air balloon burners. Deliberately soft: a rounded low blade thump
// rather than a buzzy chop, air absorption with distance and Doppler.

const SOUND_C = 343;
const HELI_RANGE = 1400;
const HELI_LEVEL = 0.24;
const BLADE_RATE = 15.5;
const BURNER_RANGE = 650;
const BURNER_LEVEL = 0.32;

let kit = null, ctx = null, noise = null, heli = null;
const burnSeen = new WeakMap();

function brownNoise(seconds) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  // crossfade the loop seam
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[n - fade + i] = d[n - fade + i] * (1 - k) + d[i] * k;
  }
  return buf;
}

function softPulseCurve() {
  const n = 256, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.pow((x + 1) / 2, 2.2);
  }
  return c;
}

function buildHeliVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = 240;
  body.Q.value = 0.4;
  const sub = ctx.createOscillator();
  sub.frequency.value = 46;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.35;

  const chop = ctx.createGain();
  chop.gain.value = 0.25;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = BLADE_RATE;
  const shaper = ctx.createWaveShaper();
  shaper.curve = softPulseCurve();
  const depth = ctx.createGain();
  depth.gain.value = 0.75;
  lfo.connect(shaper).connect(depth).connect(chop.gain);

  const whine = ctx.createOscillator();
  whine.frequency.value = 1320;
  const whineGain = ctx.createGain();
  whineGain.gain.value = 0;

  const air = ctx.createBiquadFilter();
  air.type = 'lowpass';
  air.frequency.value = 2000;
  air.Q.value = 0.3;
  const level = ctx.createGain();
  level.gain.value = 0;
  const panner = kit.makePanner({ ref: 30, rolloff: 1, model: 'equalpower', maxDist: 4000 });

  src.connect(body).connect(chop);
  sub.connect(subGain).connect(chop);
  chop.connect(air);
  whine.connect(whineGain).connect(air);
  air.connect(level).connect(panner).connect(kit.buses.sfx);
  src.start();
  sub.start();
  lfo.start();
  whine.start();
  return { src, body, sub, lfo, whine, whineGain, air, level, panner, active: true };
}

function setT(param, v, tau = 0.12) {
  param.setTargetAtTime(v, ctx.currentTime, tau);
}

// audio frame: (x, height, y); world velocity (vx, vy, vz=climb)
function doppler(x, y, h, vx, vy, vz) {
  const L = kit.listener;
  const dx = x - L.x, dy = h - L.y, dz = y - L.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const radial = (vx * dx + vz * dy + vy * dz) / d;
  return { d, f: SOUND_C / (SOUND_C + Math.max(-120, Math.min(120, radial))) };
}

function updateHeli(world) {
  const h = world.skyHeli;
  const src = h ? doppler(h.x, h.y, h.z + 2, h.vx || 0, h.vy || 0, h.vz || 0) : null;
  const audible = h && h.rotor > 0.02 && src.d < HELI_RANGE;
  if (!audible) {
    if (heli && heli.active) { setT(heli.level.gain, 0, 0.3); heli.active = false; }
    return;
  }
  if (!heli) heli = buildHeliVoice();
  heli.active = true;
  kit.setPannerPos(heli.panner, h.x, h.y, h.z + 2, true);
  const rpm = h.rotor, f = src.f;
  const edge = Math.min(1, (HELI_RANGE - src.d) / 300);
  setT(heli.level.gain, HELI_LEVEL * Math.pow(rpm, 1.5) * edge, 0.2);
  setT(heli.lfo.frequency, BLADE_RATE * (0.35 + 0.65 * rpm) * f, 0.15);
  setT(heli.src.playbackRate, (0.8 + 0.2 * rpm) * f, 0.15);
  setT(heli.body.frequency, 240 * f, 0.15);
  setT(heli.sub.frequency, 46 * (0.6 + 0.4 * rpm) * f, 0.15);
  setT(heli.whine.frequency, 1320 * (0.5 + 0.5 * rpm) * f, 0.2);
  setT(heli.whineGain.gain, 0.02 * rpm * Math.max(0, 1 - src.d / 220), 0.2);
  setT(heli.air.frequency, 320 + 4200 / (1 + src.d / 70), 0.2);
}

function playBurner(b) {
  const h = b.z + 3;
  const L = kit.listener;
  const d = Math.hypot(b.x - L.x, h - L.y, b.y - L.z);
  if (d > BURNER_RANGE) return;
  const t0 = ctx.currentTime, dur = Math.max(0.6, b.burnDur);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.playbackRate.value = 1.6 + Math.random() * 0.3;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 420;
  band.Q.value = 0.5;
  const air = ctx.createBiquadFilter();
  air.type = 'lowpass';
  air.frequency.value = 400 + 3000 / (1 + d / 60);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(BURNER_LEVEL, t0 + 0.14);
  g.gain.setValueAtTime(BURNER_LEVEL * 0.85, t0 + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.45);
  const panner = kit.makePanner({ ref: 25, rolloff: 1, model: 'equalpower', maxDist: 2000 });
  kit.setPannerPos(panner, b.x, b.y, h);
  src.connect(band).connect(air).connect(g).connect(panner).connect(kit.buses.sfx);
  src.start(t0, Math.random() * 2);
  src.stop(t0 + dur + 0.5);
  src.onended = () => { src.disconnect(); band.disconnect(); air.disconnect(); g.disconnect(); panner.disconnect(); };
}

function updateBurners(world) {
  for (const b of world.balloons || []) {
    const seen = burnSeen.get(b);
    if (seen === b.burnSeq) continue;
    burnSeen.set(b, b.burnSeq);
    if (seen !== undefined && b.burnLeft > 0) playBurner(b);
  }
}

export function updateSkySfx(dt, world, k) {
  if (!k || !k.ctx) return;
  if (!kit) { kit = k; ctx = k.ctx; noise = brownNoise(3); }
  updateHeli(world);
  updateBurners(world);
}
