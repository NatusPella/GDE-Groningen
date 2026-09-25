// Engine + road-noise synthesis for audio.js. One processor renders several
// mono voices (one output each, so every voice gets its own panner); the
// player's node also renders tyre/wind/water noise on an extra output.
//
// An engine voice is a band-limited sum of sine harmonics of half the firing
// rate: even orders are the firing harmonics, odd (half) orders give a mild
// uneven-engine character. A smooth low-pass tilt keeps it round; every
// parameter is slewed so nothing steps or zippers.

const TAU = Math.PI * 2;
const MAX_H = 20;
const MAX_F = 3200;

// fpr: firings per crank revolution; odd: half-order level; tilt: harmonic
// roll-off exponent; fc: low-pass corner [off-throttle, full load] in Hz;
// formant: [centre, width, boost] broad body resonance.
const PROFILES = [
  { fpr: 2, idle: 800, red: 6200, odd: 0.06, tilt: 0.85, fc: [320, 900], formant: [180, 140, 0.5], noise: 0.015, wobble: 0.006, out: 0.5, crank: 0.6 },
  { fpr: 2, idle: 850, red: 6200, odd: 0.16, tilt: 0.8, fc: [300, 850], formant: [160, 130, 0.6], noise: 0.02, wobble: 0.012, out: 0.5, crank: 0.8 },
  { fpr: 3, idle: 600, red: 2300, odd: 0.1, tilt: 0.95, fc: [220, 620], formant: [120, 100, 0.6], noise: 0.02, wobble: 0.005, out: 0.55, crank: 0.9 },
  { fpr: 1, idle: 1900, red: 9500, odd: 0, tilt: 1.0, fc: [650, 1500], formant: [0, 1, 0], noise: 0.01, wobble: 0.008, out: 0.4, crank: 0.35 },
  { fpr: 2, idle: 900, red: 5500, odd: 0.12, tilt: 0.95, fc: [260, 650], formant: [140, 110, 0.4], noise: 0.04, wobble: 0.01, out: 0.5, crank: 0.5 },
  { fpr: 4, idle: 750, red: 7000, odd: 0.2, tilt: 0.8, fc: [300, 950], formant: [150, 130, 0.6], noise: 0.015, wobble: 0.005, out: 0.5, crank: 0.55 },
  { fpr: 2, idle: 750, red: 4300, odd: 0.06, tilt: 0.9, fc: [280, 800], formant: [160, 130, 0.4], noise: 0.02, wobble: 0.005, out: 0.5, crank: 0.8 },
];

class Rng {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  bi() { return this.next() * 2 - 1; }
}

// RBJ band-pass (0 dB peak) / high-pass / low-pass biquads, TDF-II.
class Biquad {
  constructor() { this.b0 = 0; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.z1 = 0; this.z2 = 0; }
  set(type, f, q) {
    const w = TAU * Math.min(f, sampleRate * 0.45) / sampleRate, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
    if (type === 'bp') { this.b0 = al / a0; this.b1 = 0; this.b2 = -al / a0; }
    else if (type === 'hp') { this.b0 = (1 + cs) / 2 / a0; this.b1 = -(1 + cs) / a0; this.b2 = this.b0; }
    else { this.b0 = (1 - cs) / 2 / a0; this.b1 = (1 - cs) / a0; this.b2 = this.b0; }
    this.a1 = -2 * cs / a0; this.a2 = (1 - al) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

const OFF = 0, CRANK = 1, RUN = 2, STOPPING = 3;

function softclip(x) {
  if (x > 3) return 1;
  if (x < -3) return -1;
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}

const slew = (tau) => 1 - Math.exp(-1 / (tau * sampleRate));

class EngineVoice {
  constructor(seed, running) {
    this.rng = new Rng(seed);
    this.kind = -1;
    this.mode = running ? RUN : OFF;
    this.t = { rpm: 800, load: 0.2, gain: 0, pitch: 1 };
    this.rpm = 800; this.load = 0.2; this.gain = 0; this.pitch = 1; this.env = running ? 1 : 0;
    this.theta = 0; this.crankPh = 0; this.starterPh = 0;
    this.w = new Float64Array(MAX_H + 1);
    this.brown = 0; this.nlp = 0;
    this.modeT = 0; this.crankDur = 0.6; this.startAt = 0; this.flare = 0;
    this.wob = 0; this.wobS = 0; this.wobT = 0;
    this.setKind(0);
  }

  setKind(k) {
    if (k === this.kind || !PROFILES[k]) return;
    this.kind = k;
    this.P = PROFILES[k];
    this.crankDur = this.P.crank;
  }

  start(at) { this.mode = CRANK; this.modeT = 0; this.startAt = at; }
  stop() { if (this.mode !== OFF) { this.mode = STOPPING; this.modeT = 0; } }

  // harmonic weights for the block's end state, normalised to unit power
  weights(base, load, rn, out) {
    const P = this.P;
    const fc = P.fc[0] + (P.fc[1] - P.fc[0]) * Math.min(1, load * (0.4 + 0.6 * rn));
    const [F, Fw, Fb] = P.formant;
    let pow = 0;
    for (let k = 1; k <= MAX_H; k++) {
      const f = base * k;
      let w = 0;
      if (f < MAX_F) {
        const r = f / fc, r2 = r * r;
        w = (k % 2 ? P.odd : 1) * Math.pow(k, -P.tilt) / (1 + r2 * r2);
        if (Fb) { const d = (f - F) / Fw; w *= 1 + Fb * Math.exp(-d * d); }
        if (f > MAX_F * 0.7) w *= (MAX_F - f) / (MAX_F * 0.3);
      }
      out[k] = w;
      pow += w * w;
    }
    const norm = pow > 1e-12 ? 1 / Math.sqrt(pow) : 0;
    for (let k = 1; k <= MAX_H; k++) out[k] *= norm;
  }

  render(out, n, dtBlock) {
    const P = this.P, R = this.rng, T = this.t;
    if (this.gain < 1e-5 && (T.gain < 1e-5 || this.mode === OFF)) { this.gain = 0; if (this.mode === STOPPING) this.mode = OFF; return false; }
    if (this.mode === CRANK && currentTime < this.startAt) return false;

    let rpmT = T.rpm, loadT = T.load, envT = 1, rpmTau = 0.12, starter = 0;
    this.wobT -= dtBlock;
    if (this.wobT <= 0) { this.wobT = 0.25 + R.next() * 0.35; this.wob = R.bi(); }
    this.wobS += (this.wob - this.wobS) * Math.min(1, dtBlock * 4);
    const idleish = 1 - Math.min(1, Math.max(0, (T.rpm - P.idle) / P.idle));
    rpmT *= 1 + this.wobS * P.wobble * idleish;

    if (this.mode === CRANK) {
      this.modeT += dtBlock;
      if (this.modeT >= this.crankDur) { this.mode = RUN; this.flare = 1; }
      else { rpmT = 260; loadT = 0.1; envT = 0.35; starter = 1; rpmTau = 0.08; }
    } else if (this.mode === STOPPING) {
      this.modeT += dtBlock;
      rpmT = P.idle * 0.3; loadT = 0; envT = 0; rpmTau = 0.25;
      if (this.env < 0.002) this.mode = OFF;
    } else if (this.mode === OFF) { envT = 0; }
    if (this.flare > 0) {
      rpmT = Math.max(rpmT, P.idle * (1 + 0.6 * this.flare));
      this.flare = Math.max(0, this.flare - dtBlock * 1.5);
    }

    const sr = sampleRate;
    const kr = slew(rpmTau), kl = slew(0.12), kg = slew(0.1), kp = slew(0.15), ke = slew(this.mode === STOPPING ? 0.18 : 0.08);
    // block-end targets for the harmonic weights, approached linearly
    const rpmEnd = this.rpm + (rpmT - this.rpm) * (1 - Math.pow(1 - kr, n));
    const loadEnd = this.load + (loadT - this.load) * (1 - Math.pow(1 - kl, n));
    const pitchEnd = this.pitch + (T.pitch - this.pitch) * (1 - Math.pow(1 - kp, n));
    const baseEnd = Math.max(1, rpmEnd) / 60 * P.fpr * pitchEnd / 2;
    const wEnd = this.wEnd || (this.wEnd = new Float64Array(MAX_H + 1));
    this.weights(baseEnd, loadEnd, rpmEnd / P.red, wEnd);
    const w = this.w, dw = this.dw || (this.dw = new Float64Array(MAX_H + 1));
    for (let k = 1; k <= MAX_H; k++) dw[k] = (wEnd[k] - w[k]) / n;

    let rpm = this.rpm, load = this.load, gain = this.gain, pitch = this.pitch, env = this.env;
    let theta = this.theta, brown = this.brown, nlp = this.nlp;
    const gainT = T.gain, pitchT = T.pitch, phaseK = TAU * P.fpr / 120 / sr, redInv = 1 / P.red;
    const noiseAmt = P.noise, out0 = P.out;
    let active = false;
    for (let i = 0; i < n; i++) {
      rpm += (rpmT - rpm) * kr;
      load += (loadT - load) * kl;
      gain += (gainT - gain) * kg;
      pitch += (pitchT - pitch) * kp;
      env += (envT - env) * ke;
      theta += (rpm > 0 ? rpm : 0) * phaseK * pitch;
      if (theta > TAU) theta -= TAU;
      const s1 = Math.sin(theta), c2 = 2 * Math.cos(theta);
      let sPrev = 0, sCur = s1, y = 0;
      for (let k = 1; k <= MAX_H; k++) {
        w[k] += dw[k];
        y += w[k] * sCur;
        const sNext = c2 * sCur - sPrev;
        sPrev = sCur; sCur = sNext;
      }
      brown = brown * 0.995 + R.bi() * 0.05;
      nlp += (brown - nlp) * 0.05;
      y = y * (0.55 + 0.45 * load) + nlp * noiseAmt * (1 + load) * 6;
      if (starter) {
        this.crankPh += TAU * 9 / sr;
        this.starterPh += TAU * 240 / sr;
        y = y * (0.6 + 0.4 * Math.sin(this.crankPh)) + Math.sin(this.starterPh) * 0.12;
      }
      const loud = (0.5 + 0.5 * Math.min(1, rpm * redInv * 1.4)) * env;
      const v = softclip(y * loud * 0.9) * gain * out0;
      out[i] = v;
      if (v !== 0) active = true;
    }
    for (let k = 1; k <= MAX_H; k++) w[k] = wEnd[k];
    this.rpm = rpm; this.load = load; this.gain = gain; this.pitch = pitch; this.env = env;
    this.theta = theta; this.brown = brown; this.nlp = nlp;
    return active;
  }
}

// Tyres, surface, rain, wind, water and bicycle freewheel for the player:
// all smooth filtered noise with slewed levels.
class RoadVoice {
  constructor() {
    this.rng = new Rng(9137);
    this.t = { speed: 0, surface: 0, wet: 0, wind: 1, gain: 0, free: 0, small: 0, water: 0 };
    this.gain = 0; this.speed = 0; this.wet = 0; this.water = 0; this.cob = 0; this.grass = 0; this.free = 0;
    this.pink = 0; this.pink2 = 0;
    this.roar = new Biquad(); this.rumble = new Biquad(); this.hiss = new Biquad(); this.hissLp = new Biquad();
    this.wind = new Biquad(); this.lap = new Biquad(); this.fwF = new Biquad(); this.grassF = new Biquad();
    this.rumble.set('bp', 110, 0.8); this.hiss.set('hp', 2200, 0.6); this.hissLp.set('lp', 6000, 0.6);
    this.lap.set('bp', 480, 0.9); this.fwF.set('bp', 3000, 3); this.grassF.set('lp', 320, 0.7);
    this.fw = 0; this.fwEnv = 0;
    this.gust = 0; this.gustS = 0; this.gustT = 0; this.lapPh = 0; this.lapPh2 = 0; this.mod = 0; this.modS = 0; this.modT = 0;
    this.roarF = 0; this.windF = 0;
  }

  render(out, n, dtBlock) {
    const T = this.t, R = this.rng;
    if (this.gain < 1e-5 && T.gain < 1e-5) { this.gain = 0; return false; }
    const k = Math.min(1, dtBlock / 0.12);
    this.speed += (T.speed - this.speed) * k;
    this.wet += (T.wet - this.wet) * k * 0.5;
    this.cob += ((T.surface === 1 ? 1 : 0) - this.cob) * k;
    this.grass += ((T.surface === 2 ? 1 : 0) - this.grass) * k;
    this.free += ((T.free > 0 ? 1 : 0) - this.free) * k;
    const s = this.speed;
    const roarF = 200 + Math.min(s, 40) * 12;
    if (Math.abs(roarF - this.roarF) > 3) { this.roarF = roarF; this.roar.set('bp', roarF, 0.6); }
    const windF = 160 + Math.min(s, 45) * 20;
    if (Math.abs(windF - this.windF) > 4) { this.windF = windF; this.wind.set('lp', windF, 0.7); }
    this.gustT -= dtBlock;
    if (this.gustT <= 0) { this.gustT = 0.6 + R.next(); this.gust = R.next(); }
    this.gustS += (this.gust - this.gustS) * Math.min(1, dtBlock * 1.5);
    this.modT -= dtBlock;
    if (this.modT <= 0) { this.modT = 0.08 + R.next() * 0.12; this.mod = R.next(); }
    this.modS += (this.mod - this.modS) * Math.min(1, dtBlock * 8);

    const small = T.small;
    const roarAmp = Math.min(0.6, s * 0.02) * (1 - 0.4 * this.grass) * (small ? 0.35 : 1);
    const rumbleAmp = Math.min(0.5, s * 0.03) * this.cob * (0.7 + 0.3 * this.modS);
    const grassAmp = Math.min(0.5, s * 0.05) * this.grass;
    const windAmp = Math.min(0.8, (s / 30) * (s / 30)) * T.wind * (0.8 + 0.25 * this.gustS);
    const wetAmp = Math.min(1, s * 0.04) * this.wet * 0.14;
    const kg = slew(0.12), kw = slew(0.4);
    let active = false;
    for (let i = 0; i < n; i++) {
      this.gain += (T.gain - this.gain) * kg;
      this.water += (T.water - this.water) * kw;
      const wn = R.bi();
      this.pink = this.pink * 0.97 + wn * 0.03;
      this.pink2 = this.pink2 * 0.8 + wn * 0.2;
      let y = this.roar.run(this.pink2) * roarAmp * 2.2;
      if (rumbleAmp > 0.001) y += this.rumble.run(this.pink2) * rumbleAmp * 2.5;
      if (grassAmp > 0.001) y += this.grassF.run(wn) * grassAmp * 0.5;
      if (wetAmp > 0.0005) y += this.hissLp.run(this.hiss.run(wn)) * wetAmp;
      if (windAmp > 0.001) y += this.wind.run(wn) * windAmp;
      if (this.free > 0.001) {
        this.fw += T.free / sampleRate;
        if (this.fw >= 1) { this.fw -= 1; this.fwEnv = 1; }
        this.fwEnv *= 0.98;
        y += this.fwF.run(wn * this.fwEnv) * 0.9 * this.free;
      }
      if (this.water > 0.001) {
        this.lapPh += TAU * (0.7 + s * 0.2) / sampleRate;
        this.lapPh2 += TAU * (1.3 + s * 0.15) / sampleRate;
        const env = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(this.lapPh)) + 0.25 * (0.5 + 0.5 * Math.sin(this.lapPh2));
        y += (this.lap.run(this.pink2) * 1.4 * env + this.pink * 2 * (0.3 + s * 0.1)) * this.water;
      }
      const v = softclip(y) * this.gain;
      out[i] = v;
      if (v !== 0) active = true;
    }
    return active;
  }
}

class EngineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.voices = Array.from({ length: o.voices || 1 }, (_, i) => new EngineVoice(1234 + i * 7919, !!o.running));
    this.road = o.road ? new RoadVoice() : null;
    this.port.onmessage = (e) => this.onMsg(e.data);
    if (o.init) this.onMsg(o.init);
  }

  onMsg(m) {
    if (m.type === 'p') {
      for (const p of m.v) {
        const voice = this.voices[p.i];
        if (!voice) continue;
        voice.setKind(p.kind);
        Object.assign(voice.t, p);
        if (p.snap) { voice.rpm = p.rpm; voice.load = p.load; voice.pitch = p.pitch || 1; }
      }
      if (m.road && this.road) Object.assign(this.road.t, m.road);
    } else if (m.type === 'start') {
      const voice = this.voices[m.i];
      if (voice) { voice.setKind(m.kind); voice.start(m.at || 0); }
    } else if (m.type === 'run') {
      const voice = this.voices[m.i];
      if (voice) { voice.setKind(m.kind); voice.mode = RUN; }
    } else if (m.type === 'stop') {
      const voice = this.voices[m.i];
      if (voice) voice.stop();
    }
  }

  process(inputs, outputs) {
    const dtBlock = 128 / sampleRate;
    for (let i = 0; i < this.voices.length; i++) {
      const out = outputs[i] && outputs[i][0];
      if (out) this.voices[i].render(out, out.length, dtBlock);
    }
    if (this.road) {
      const out = outputs[this.voices.length] && outputs[this.voices.length][0];
      if (out) this.road.render(out, out.length, dtBlock);
    }
    return true;
  }
}

registerProcessor('gte-engine', EngineProcessor);
