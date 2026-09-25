// Engine + road-noise synthesis for audio.js. One processor renders several
// mono voices (one output each, so every voice gets its own panner); the
// player's node also renders tyre/wind/water noise on an extra output.
//
// An engine is a train of exhaust pulses at the firing rate (cylinders x
// rpm), each cylinder slightly different, shaped by fixed exhaust/intake
// resonances: the harmonics follow the rpm while the formants stay put.

const TAU = Math.PI * 2;

// cyl, fpr: firings per crank revolution; amps: per-cylinder pulse level
// (unequal = rough); res: [freq, q, gain] resonators; lp: brightness range.
const PROFILES = [
  { // 0 generic petrol four
    cyl: 4, fpr: 2, idle: 800, red: 6200, amps: [1, 0.94, 0.97, 0.9], jitter: 0.03, misfire: 0, pw: 0.3,
    res: [[95, 2.5, 0.7], [340, 3, 0.5], [1300, 2, 0.22]], lp: [450, 3600], noise: 0.25, hiss: 0.05, drive: [1.4, 3], wobble: 0.02,
    knock: 0, turbo: 0, gurgle: 0, pops: true, out: 0.55, crank: 0.6,
  },
  { // 1 hero: tired Ford Escort four, uneven cylinders, blowing exhaust
    cyl: 4, fpr: 2, idle: 850, red: 6200, amps: [1, 0.7, 0.92, 0.58], jitter: 0.08, misfire: 0.006, pw: 0.36,
    res: [[80, 3, 0.9], [255, 4, 0.65], [880, 3, 0.4]], lp: [380, 3000], noise: 0.5, hiss: 0.08, drive: [2, 4.5], wobble: 0.06,
    knock: 0, turbo: 0, gurgle: 0, pops: true, out: 0.5, crank: 0.95,
  },
  { // 2 city-bus straight six diesel
    cyl: 6, fpr: 3, idle: 600, red: 2300, amps: [1, 0.97, 0.99, 0.95, 1, 0.96], jitter: 0.025, misfire: 0, pw: 0.24,
    res: [[58, 2, 1], [175, 3, 0.55], [690, 2, 0.3]], lp: [300, 1700], noise: 0.3, hiss: 0.05, drive: [1.6, 2.6], wobble: 0.015,
    knock: 0.7, turbo: 0.05, gurgle: 0, pops: false, out: 0.6, crank: 1.1,
  },
  { // 3 two-stroke brommer: single cylinder, buzzy, four-strokes at idle
    cyl: 1, fpr: 1, idle: 1900, red: 9500, amps: [1], jitter: 0.1, misfire: 0.35, pw: 0.2,
    res: [[430, 4, 0.7], [1450, 5, 0.55], [3100, 3, 0.3]], lp: [1400, 6500], noise: 0.35, hiss: 0.06, drive: [3, 5], wobble: 0.05,
    knock: 0, turbo: 0, gurgle: 0, pops: false, out: 0.42, crank: 0.35,
  },
  { // 4 twin two-stroke outboard, exhausting under water
    cyl: 2, fpr: 2, idle: 900, red: 5500, amps: [1, 0.82], jitter: 0.06, misfire: 0.02, pw: 0.3,
    res: [[110, 3, 0.8], [470, 4, 0.45], [1600, 2, 0.15]], lp: [320, 1900], noise: 0.2, hiss: 0.03, drive: [1.8, 3], wobble: 0.05,
    knock: 0, turbo: 0, gurgle: 0.7, pops: false, out: 0.55, crank: 0.5,
  },
  { // 5 sport/police V8, cross-plane burble
    cyl: 8, fpr: 4, idle: 750, red: 7000, amps: [1, 0.78, 0.95, 0.7, 1, 0.84, 0.9, 0.74], jitter: 0.04, misfire: 0, pw: 0.32,
    res: [[70, 2.5, 0.9], [215, 3, 0.5], [900, 2, 0.3]], lp: [550, 4500], noise: 0.22, hiss: 0.05, drive: [2, 4], wobble: 0.02,
    knock: 0, turbo: 0, gurgle: 0, pops: true, out: 0.5, crank: 0.55,
  },
  { // 6 van four-cylinder diesel
    cyl: 4, fpr: 2, idle: 750, red: 4300, amps: [1, 0.95, 0.98, 0.93], jitter: 0.03, misfire: 0, pw: 0.27,
    res: [[85, 2, 0.8], [300, 3, 0.45], [1100, 2, 0.25]], lp: [380, 2300], noise: 0.28, hiss: 0.05, drive: [1.6, 2.8], wobble: 0.02,
    knock: 0.45, turbo: 0.03, gurgle: 0, pops: false, out: 0.58, crank: 0.9,
  },
];

class Rng {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  bi() { return this.next() * 2 - 1; }
}

// RBJ band-pass (0 dB peak) / low-pass biquads, transposed direct form II.
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

class EngineVoice {
  constructor(seed, running) {
    this.rng = new Rng(seed);
    this.kind = -1;
    this.mode = running ? RUN : OFF;
    this.t = { rpm: 800, load: 0.2, gain: 0, pitch: 1, bright: 1 };
    this.rpm = 800; this.load = 0.2; this.gain = 0; this.pitch = 1;
    this.phase = 0; this.period = 1; this.cyl = 0; this.since = 1e9; this.amp = 0; this.width = 1; this.skipped = 0;
    this.lp = 0; this.lpK = 0.1; this.knockEnv = 0; this.noiseEnv = 0;
    this.res = [new Biquad(), new Biquad(), new Biquad()];
    this.hissF = new Biquad(); this.knockF = new Biquad(); this.gurgleF = new Biquad();
    this.pops = 0; this.popIn = 0; this.popEnv = 0;
    this.modeT = 0; this.crankDur = 0.6; this.startAt = 0;
    this.wob = 0; this.wobT = 0; this.boost = 0; this.turboPh = 0; this.starterPh = 0;
    this.rpmK = 0; this.flare = 0; this.dcX = 0; this.dcY = 0; this.oX = 0; this.oY = 0;
    this.setKind(0);
  }

  setKind(k) {
    if (k === this.kind || !PROFILES[k]) return;
    this.kind = k;
    const P = this.P = PROFILES[k];
    P.res.forEach(([f, q], i) => this.res[i].set('bp', f, q));
    this.hissF.set('bp', 1800, 0.8);
    this.knockF.set('bp', 2600, 1.2);
    this.gurgleF.set('bp', 260, 1.5);
    this.crankDur = P.crank;
  }

  start(at) { this.mode = CRANK; this.modeT = 0; this.startAt = at; this.pops = 0; }
  stop() { if (this.mode !== OFF) { this.mode = STOPPING; this.modeT = 0; } }

  render(out, n, dtBlock) {
    const P = this.P, R = this.rng, T = this.t;
    if (this.gain < 1e-5 && (T.gain < 1e-5 || this.mode === OFF)) { this.gain = 0; if (this.mode === STOPPING) this.mode = OFF; return false; }
    if (this.mode === CRANK && currentTime < this.startAt) return false;

    // block-rate targets
    let rpmT = T.rpm, loadT = T.load, gainT = T.gain;
    let rpmTau = 0.07, misfire = P.misfire, starter = 0;
    const idleish = 1 - Math.min(1, Math.max(0, (T.rpm - P.idle) / (P.idle * 1.5)));
    this.wobT -= dtBlock;
    if (this.wobT <= 0) { this.wobT = 0.12 + R.next() * 0.25; this.wob = R.bi(); }
    rpmT *= 1 + this.wob * P.wobble * idleish;

    if (this.mode === CRANK) {
      this.modeT += dtBlock;
      const u = this.modeT / this.crankDur;
      if (u >= 1) { this.mode = RUN; this.modeT = 0; this.flare = 1; this.rpm = P.idle * 0.9; }
      else {
        rpmT = 200 + 70 * Math.sin(this.modeT * 9) + 40 * u; loadT = 0.12; rpmTau = 0.03; misfire = 0.85;
        starter = 1;
        if (u > 0.75 && R.next() < 0.3) misfire = 0.4;
      }
    } else if (this.mode === STOPPING) {
      this.modeT += dtBlock;
      rpmT = 0; loadT = 0; rpmTau = 0.18; misfire = 0.5 + this.modeT;
      if (this.rpm < 90) { this.mode = OFF; }
    } else if (this.mode === OFF) { gainT = 0; rpmT = 0; }
    if (this.flare > 0) {
      rpmT = Math.max(rpmT, P.idle * (1 + 1.3 * this.flare));
      this.flare = Math.max(0, this.flare - dtBlock * 1.6);
      loadT = Math.max(loadT, 0.5 * this.flare);
    }

    const sr = sampleRate;
    const kr = 1 - Math.exp(-1 / (rpmTau * sr));
    const kl = 1 - Math.exp(-1 / (0.04 * sr));
    const kg = 1 - Math.exp(-1 / (0.03 * sr));
    const kp = 1 - Math.exp(-1 / (0.05 * sr));
    const redInv = 1 / P.red, lpLo = P.lp[0], lpSpan = P.lp[1] - P.lp[0];
    const ga = P.res[0][2] * 3, gb = P.res[1][2] * 3, gc = P.res[2][2] * 2.5;
    const noiseAmt = P.noise, hissAmt = P.hiss * 4, fpr = P.fpr, jitter = P.jitter;
    const dLo = P.drive[0], dSpan = P.drive[1] - P.drive[0];
    const pitchT = T.pitch, turbo = P.turbo, gurgle = P.gurgle, out0 = P.out;
    const [r0, r1, r2] = this.res, hf = this.hissF;
    const phaseK = fpr / 60 / sr;
    let rpmS = this.rpm, load = this.load, gain = this.gain, pitch = this.pitch;
    let phase = this.phase, period = this.period, since = this.since, amp = this.amp, width = this.width;
    let lp = this.lp, lpK = this.lpK, dcX = this.dcX, dcY = this.dcY, oX = this.oX, oY = this.oY;
    let noiseEnv = this.noiseEnv, knockEnv = this.knockEnv, popEnv = this.popEnv;
    let rs = R.s;
    let drive = 1, driveNorm = 1;
    let active = false;

    for (let i = 0; i < n; i++) {
      rpmS += (rpmT - rpmS) * kr;
      load += (loadT - load) * kl;
      gain += (gainT - gain) * kg;
      pitch += (pitchT - pitch) * kp;
      const rpm = rpmS > 0 ? rpmS : 0;
      const rn = rpm * redInv;
      rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0;
      const wn = rs / 2147483648 - 1;

      phase += rpm * phaseK * pitch / period;
      if (phase >= 1) {
        phase -= 1;
        R.s = rs;
        this.cyl = (this.cyl + 1) % P.cyl;
        period = 1 + R.bi() * jitter * (0.4 + (1 - load) * 0.6);
        let a = P.amps[this.cyl] * (1 + R.bi() * jitter * 2);
        const lowLoadMiss = P.cyl === 1 ? misfire * (1 - Math.min(1, load * 1.6)) : misfire;
        if (R.next() < lowLoadMiss) { a *= this.mode === CRANK ? 0.3 : 0.08; this.skipped++; }
        else { if (this.skipped) a *= 1 + Math.min(2, this.skipped) * 0.35; this.skipped = 0; }
        amp = a * (0.35 + 0.65 * load);
        since = 0;
        const periodSec = 60 / Math.max(60, rpm * fpr * pitch);
        width = Math.max(0.0006, Math.min(0.012, P.pw * periodSec)) * sr;
        knockEnv = P.knock * (0.55 + 0.45 * (1 - load)) * (this.mode === RUN ? 1 : 0.2);
        noiseEnv = 1;
        if (this.pops > 0 && --this.popIn <= 0) {
          popEnv = 0.9 + R.next() * 1.4;
          this.pops--;
          this.popIn = 2 + Math.floor(R.next() * 12);
        }
        rs = R.s;
      }
      const u = since / width;
      since++;
      let pulse = 0;
      if (u < 1) pulse = Math.sin(Math.PI * u) * amp;
      else if (u < 2.2) pulse = -0.38 * Math.sin(Math.PI * (u - 1) / 1.2) * amp;

      noiseEnv *= 0.9985;
      const hp = pulse - dcX + 0.996 * dcY;
      dcX = pulse; dcY = hp;
      const x = hp + wn * noiseAmt * ((pulse < 0 ? -pulse : pulse) * (0.6 + load) + 0.05 * noiseEnv * amp);

      let pop = 0;
      if (popEnv > 0.001) { pop = popEnv * (wn * 0.8 + 0.5); popEnv *= 0.9975; }

      if ((i & 15) === 0) {
        const cutoff = lpLo + lpSpan * Math.min(1, (0.25 + 0.75 * load) * (0.3 + rn));
        lpK = 1 - Math.exp(-TAU * cutoff / sr);
        drive = dLo + dSpan * load;
        driveNorm = 1 / softclip(drive);
      }
      lp += (x - lp) * lpK;
      const sp = lp + pop;
      let y = lp * 0.55 + r0.run(sp) * ga + r1.run(sp) * gb + r2.run(x + pop) * gc + pop * 0.5;
      y += hf.run(wn) * hissAmt * (0.3 + load) * rn;

      if (knockEnv > 0.001) {
        y += this.knockF.run(wn) * knockEnv * 2.2;
        knockEnv *= 0.9945;
      }
      if (turbo) {
        this.boost += (load * rn - this.boost) * 0.00004;
        this.turboPh += TAU * (1800 + 5200 * this.boost) / sr;
        y += Math.sin(this.turboPh) * turbo * this.boost;
      }
      if (gurgle) y += this.gurgleF.run(wn) * gurgle * (0.3 + (pulse < 0 ? -pulse : pulse)) * 1.2;
      if (starter) {
        this.starterPh += TAU * (330 + 30 * Math.sin(this.modeT * 9)) / sr;
        const s = Math.sin(this.starterPh);
        y += (s + 0.3 * Math.sign(s)) * 0.12 + wn * 0.03;
      }

      y = softclip(y * drive) * driveNorm;
      const yo = y - oX + 0.995 * oY;
      oX = y; oY = yo;
      const v = yo * gain * out0;
      out[i] = v;
      if (v !== 0) active = true;
    }
    R.s = rs;
    this.rpm = rpmS; this.load = load; this.gain = gain; this.pitch = pitch;
    this.phase = phase; this.period = period; this.since = since; this.amp = amp; this.width = width;
    this.lp = lp; this.lpK = lpK; this.dcX = dcX; this.dcY = dcY; this.oX = oX; this.oY = oY;
    this.noiseEnv = noiseEnv; this.knockEnv = knockEnv; this.popEnv = popEnv;
    return active;
  }
}

// Tyres, surface, rain, wind, water and bicycle freewheel for the player.
class RoadVoice {
  constructor() {
    this.rng = new Rng(9137);
    this.t = { speed: 0, surface: 0, wet: 0, wind: 1, gain: 0, free: 0, small: 0, water: 0 };
    this.speed = 0; this.gain = 0; this.wet = 0; this.water = 0;
    this.pink = 0; this.pink2 = 0;
    this.roar = new Biquad(); this.body = new Biquad(); this.click = new Biquad(); this.hiss = new Biquad();
    this.wind = new Biquad(); this.lap = new Biquad(); this.fwF = new Biquad(); this.rustle = new Biquad();
    this.body.set('bp', 115, 3); this.click.set('bp', 750, 2.5); this.hiss.set('hp', 3200, 0.7);
    this.lap.set('bp', 520, 1.2); this.fwF.set('bp', 3600, 9); this.rustle.set('hp', 2000, 0.7);
    this.cob = 0; this.cobEnv = 0; this.cobAmp = 0; this.fw = 0; this.fwEnv = 0;
    this.gust = 0; this.gustT = 0; this.lapPh = 0; this.lapPh2 = 0;
    this.roarF = 0; this.windF = 0;
  }

  render(out, n, dtBlock) {
    const T = this.t, R = this.rng;
    if (this.gain < 1e-5 && T.gain < 1e-5) { this.gain = 0; return false; }
    const s = T.speed;
    const roarF = 220 + Math.min(s, 40) * 16;
    if (Math.abs(roarF - this.roarF) > 4) { this.roarF = roarF; this.roar.set('bp', roarF, 0.7); }
    const windF = 180 + Math.min(s, 45) * 28;
    if (Math.abs(windF - this.windF) > 6) { this.windF = windF; this.wind.set('lp', windF, 0.9); }
    this.gustT -= dtBlock;
    if (this.gustT <= 0) { this.gustT = 0.4 + R.next(); this.gust = R.next(); }

    const surf = T.surface;
    const small = T.small;
    const roarAmp = Math.min(0.9, s * 0.03) * (surf === 2 ? 0.6 : surf === 3 ? 0.8 : 1) * (small ? 0.35 : 1);
    const cobRate = surf === 1 ? s / 0.2 : surf === 2 ? s * 1.4 : 0;
    const cobAmp = surf === 1 ? Math.min(1, s * 0.09) : surf === 2 ? Math.min(0.8, s * 0.1) : 0;
    const windAmp = Math.min(1.3, (s / 28) * (s / 28)) * T.wind;
    const wetAmp = Math.min(1, s * 0.05) * T.wet;
    const kg = 1 - Math.exp(-1 / (0.06 * sampleRate));
    const kw = 1 - Math.exp(-1 / (0.3 * sampleRate));
    let active = false;
    for (let i = 0; i < n; i++) {
      this.gain += (T.gain - this.gain) * kg;
      this.water += (T.water - this.water) * kw;
      const wn = R.bi();
      this.pink = this.pink * 0.97 + wn * 0.03;
      this.pink2 = this.pink2 * 0.8 + wn * 0.2;
      let y = this.roar.run(this.pink2) * roarAmp * 2.2;

      if (cobRate > 0) {
        this.cob += cobRate / sampleRate * (0.7 + R.next() * 0.6);
        if (this.cob >= 1) { this.cob -= 1; this.cobEnv = 1; this.cobAmp = 0.4 + R.next() * 0.6; }
        this.cobEnv *= surf === 1 ? 0.994 : 0.998;
        const e = this.cobEnv * this.cobAmp;
        const imp = e * (surf === 1 ? wn * 0.6 + 0.4 : wn);
        y += (this.body.run(imp) * 2.6 + this.click.run(imp * wn) * (surf === 1 ? 1.2 : 0.2)) * cobAmp;
        if (surf === 2) y += this.rustle.run(wn) * 0.08 * cobAmp;
      }
      if (wetAmp > 0.001) y += this.hiss.run(wn) * wetAmp * (0.6 + 0.4 * Math.abs(this.pink) * 8) * 0.3;
      if (windAmp > 0.001) y += this.wind.run(wn) * windAmp * (0.75 + 0.35 * this.gust);

      if (T.free > 0) {
        this.fw += T.free / sampleRate;
        if (this.fw >= 1) { this.fw -= 1; this.fwEnv = 1; }
        this.fwEnv *= 0.985;
        y += this.fwF.run(wn * this.fwEnv) * 3;
      }
      if (this.water > 0.001) {
        this.lapPh += TAU * (0.9 + s * 0.3) / sampleRate;
        this.lapPh2 += TAU * (1.7 + s * 0.2) / sampleRate;
        const env = 0.35 + 0.4 * Math.max(0, Math.sin(this.lapPh)) + 0.25 * Math.max(0, Math.sin(this.lapPh2));
        y += (this.lap.run(this.pink2) * 2 * env + this.pink * 3 * (0.3 + s * 0.12)) * this.water;
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
    } else if (m.type === 'pop') {
      const voice = this.voices[m.i];
      if (voice && voice.P.pops && voice.mode === RUN) { voice.pops = m.n; voice.popIn = 2; }
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
