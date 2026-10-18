// Engine + road-noise synthesis for audio.js. One processor renders several
// voices (one output each, so every voice gets its own panner); the player's
// node renders its engine in stereo plus tyre/wind/water noise on a second
// output.
//
// An engine voice is a coherent sum of engine orders (sines at multiples of
// half the firing rate, so harmonics stay locked and never beat), shaped by
// a body and an exhaust formant. Each order drifts slowly in level and the
// odd (half) orders carry per-cylinder variation. On top: exhaust rasp
// (noise gated by the firing waveform itself, so it stays smooth), intake
// whoosh and a faint valvetrain tick. All parameters are slewed.

const TAU = Math.PI * 2;
const MAX_H = 24;
const MAX_F = 4200;

// fpr: firings per crank revolution; odd: half-order level; tilt: order
// roll-off; fc: brightness corner [coasting, full load]; body/exh: formant
// [centre, width, boost] (exhaust centre rises with load by exhRise);
// rasp/intake/mech: layer levels.
const PROFILES = [
  { fpr: 2, idle: 800, red: 6200, odd: 0.1, tilt: 0.75, fc: [450, 1500], body: [150, 110, 0.9], exh: [380, 220, 0.8], exhRise: 180, rasp: 0.2, intake: 0.1, mech: 0.012, jit: 0.002, wobble: 0.006, out: 0.5, crank: 0.6 },
  { fpr: 2, idle: 850, red: 6200, odd: 0.2, tilt: 0.7, fc: [420, 1400], body: [135, 100, 1.0], exh: [330, 200, 0.9], exhRise: 160, rasp: 0.28, intake: 0.1, mech: 0.016, jit: 0.004, wobble: 0.012, out: 0.5, crank: 0.8 },
  { fpr: 3, idle: 600, red: 2300, odd: 0.12, tilt: 0.85, fc: [300, 900], body: [95, 70, 1.0], exh: [260, 160, 0.6], exhRise: 90, rasp: 0.14, intake: 0.06, mech: 0.02, jit: 0.002, wobble: 0.005, out: 0.55, crank: 0.9 },
  // 3: 50cc two-stroke brommer: a round, muffled burble with a little
  // ring-ding at idle, not a buzzsaw (steep roll-off, low corner, faint rasp)
  { fpr: 1, idle: 1700, red: 8000, odd: 0.22, tilt: 1.35, fc: [380, 900], body: [170, 120, 0.8], exh: [420, 200, 0.6], exhRise: 120, rasp: 0.05, intake: 0.04, mech: 0.003, jit: 0.006, wobble: 0.02, out: 0.3, crank: 0.35 },
  { fpr: 2, idle: 900, red: 5500, odd: 0.15, tilt: 0.85, fc: [320, 800], body: [130, 100, 0.6], exh: [300, 160, 0.4], exhRise: 80, rasp: 0.08, intake: 0.03, mech: 0.006, jit: 0.003, wobble: 0.01, out: 0.5, crank: 0.5 },
  { fpr: 4, idle: 750, red: 7000, odd: 0.26, tilt: 0.7, fc: [480, 1700], body: [120, 100, 1.0], exh: [320, 200, 0.9], exhRise: 200, rasp: 0.26, intake: 0.12, mech: 0.01, jit: 0.002, wobble: 0.005, out: 0.5, crank: 0.55 },
  { fpr: 2, idle: 750, red: 4300, odd: 0.08, tilt: 0.8, fc: [380, 1100], body: [140, 110, 0.8], exh: [340, 200, 0.6], exhRise: 120, rasp: 0.15, intake: 0.06, mech: 0.02, jit: 0.002, wobble: 0.005, out: 0.5, crank: 0.8 },
  // 7: e-step hub motor - a clean rising whine, no combustion at all
  { fpr: 2, idle: 2400, red: 48000, odd: 0.35, tilt: 1.7, fc: [2200, 3600], body: [700, 300, 0.4], exh: [1500, 500, 0.5], exhRise: 300, rasp: 0, intake: 0, mech: 0.003, jit: 0, wobble: 0, out: 0.3, crank: 0.05 },
  // 8: sport bike, an inline four: a high, clean scream with a lot of intake
  { fpr: 4, idle: 1300, red: 13000, odd: 0.18, tilt: 0.62, fc: [700, 2600], body: [200, 140, 0.7], exh: [520, 260, 0.9], exhRise: 260, rasp: 0.3, intake: 0.16, mech: 0.02, jit: 0.002, wobble: 0.005, out: 0.5, crank: 0.5 },
  // 9: naked twin, lumpy and throaty
  { fpr: 2, idle: 1200, red: 10000, odd: 0.3, tilt: 0.8, fc: [500, 1800], body: [140, 100, 1.0], exh: [360, 200, 1.0], exhRise: 200, rasp: 0.24, intake: 0.1, mech: 0.012, jit: 0.006, wobble: 0.02, out: 0.5, crank: 0.6 },
  // 10: old-timer single, a slow thump with mechanical clatter
  { fpr: 1, idle: 1000, red: 7500, odd: 0.35, tilt: 0.65, fc: [380, 1200], body: [110, 90, 1.1], exh: [300, 180, 0.8], exhRise: 120, rasp: 0.12, intake: 0.05, mech: 0.02, jit: 0.01, wobble: 0.03, out: 0.5, crank: 0.9 },
  // 11: elektrische auto: een zachtere, lagere whine dan de e-step, geen verbranding
  { fpr: 2, idle: 1800, red: 12000, odd: 0.3, tilt: 1.5, fc: [1200, 2400], body: [400, 250, 0.4], exh: [900, 400, 0.4], exhRise: 200, rasp: 0, intake: 0, mech: 0.003, jit: 0, wobble: 0, out: 0.3, crank: 0.05 },
  // 12: opgevoerde tokkie-auto: hoog, schel en rauw, veel uitlaat
  { fpr: 2, idle: 900, red: 7500, odd: 0.3, tilt: 0.6, fc: [600, 2200], body: [160, 110, 0.8], exh: [450, 260, 1.5], exhRise: 260, rasp: 0.5, intake: 0.12, mech: 0.01, jit: 0.006, wobble: 0.015, out: 0.5, crank: 0.5 },
];

class Rng {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  bi() { return this.next() * 2 - 1; }
}

// RBJ band-pass (0 dB peak) / high-pass / low-pass biquads, TDF-II.
class Biquad {
  constructor() { this.b0 = 0; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.z1 = 0; this.z2 = 0; this.f = 0; }
  set(type, f, q) {
    this.f = f;
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
const bump = (f, c, w) => { const d = (f - c) / w; return Math.exp(-d * d); };
const DELAY = 64;

class EngineVoice {
  constructor(seed, running, stereo) {
    this.rng = new Rng(seed);
    this.stereo = stereo;
    this.kind = -1;
    this.mode = running ? RUN : OFF;
    this.t = { rpm: 800, load: 0.2, gain: 0, pitch: 1, muffle: 20000 };
    this.rpm = 800; this.load = 0.2; this.gain = 0; this.pitch = 1; this.env = running ? 1 : 0;
    this.theta = 0; this.cam = 0; this.crankPh = 0; this.starterPh = 0; this.starterEnv = 0;
    this.w = new Float64Array(MAX_H + 1); this.wEnd = new Float64Array(MAX_H + 1); this.dw = new Float64Array(MAX_H + 1);
    this.drift = new Float64Array(MAX_H + 1); this.driftT = new Float64Array(MAX_H + 1);
    this.jn = 0; this.jn2 = 0; this.nlp = 0;
    this.raspF = new Biquad(); this.intakeF = new Biquad(); this.mechF = new Biquad();
    this.mufL = new Biquad(); this.mufR = new Biquad(); this.mufF = 0;
    this.mechF.set('bp', 3600, 2);
    this.dl = new Float32Array(DELAY); this.dlI = 0;
    this.modeT = 0; this.crankDur = 0.6; this.startAt = 0; this.flare = 0;
    this.wob = 0; this.wobS = 0; this.wobT = 0; this.driftClock = 0;
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

  // order weights at the block's end state, normalised to unit power
  weights(base, load, rn, out) {
    const P = this.P;
    const fc = P.fc[0] + (P.fc[1] - P.fc[0]) * Math.pow(Math.min(1, load), 0.8) * (0.45 + 0.55 * Math.min(1, rn));
    const exC = P.exh[0] + P.exhRise * load, [bC, bW, bB] = P.body, [, eW, eB] = P.exh;
    const odd = P.odd * (1 + 0.5 * (1 - load));
    let pow = 0;
    for (let k = 1; k <= MAX_H; k++) {
      const f = base * k;
      let w = 0;
      if (f < MAX_F) {
        const r = f / fc, r2 = r * r;
        w = (k % 2 ? odd : 1) * Math.pow(k, -P.tilt) / (1 + r2 * r2);
        w *= 1 + bB * bump(f, bC, bW) + eB * (0.5 + 0.5 * load) * bump(f, exC, eW);
        w *= 1 + this.drift[k] * (k % 2 ? 0.45 : 0.18);
        if (f > MAX_F * 0.75) w *= (MAX_F - f) / (MAX_F * 0.25);
      }
      out[k] = w;
      pow += w * w;
    }
    const norm = pow > 1e-12 ? 1 / Math.sqrt(pow) : 0;
    for (let k = 1; k <= MAX_H; k++) out[k] *= norm;
  }

  render(outs, n, dtBlock) {
    const P = this.P, R = this.rng, T = this.t;
    if (this.gain < 1e-5 && (T.gain < 1e-5 || this.mode === OFF)) { this.gain = 0; if (this.mode === STOPPING) this.mode = OFF; return false; }
    if (this.mode === CRANK && currentTime < this.startAt) return false;

    let rpmT = T.rpm, loadT = T.load, envT = 1, rpmTau = 0.11, starter = 0;
    this.wobT -= dtBlock;
    if (this.wobT <= 0) { this.wobT = 0.25 + R.next() * 0.35; this.wob = R.bi(); }
    this.wobS += (this.wob - this.wobS) * Math.min(1, dtBlock * 4);
    const idleish = 1 - Math.min(1, Math.max(0, (T.rpm - P.idle) / P.idle));
    rpmT *= 1 + this.wobS * P.wobble * idleish;

    // slow, independent level drift per order: organic without beating
    this.driftClock -= dtBlock;
    if (this.driftClock <= 0) {
      this.driftClock = 0.12;
      for (let k = 1; k <= MAX_H; k++) this.driftT[k] = R.bi();
    }
    for (let k = 1; k <= MAX_H; k++) this.drift[k] += (this.driftT[k] - this.drift[k]) * Math.min(1, dtBlock * 3);

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
    const rpmEnd = this.rpm + (rpmT - this.rpm) * (1 - Math.pow(1 - kr, n));
    const loadEnd = this.load + (loadT - this.load) * (1 - Math.pow(1 - kl, n));
    const pitchEnd = this.pitch + (T.pitch - this.pitch) * (1 - Math.pow(1 - kp, n));
    const rnEnd = rpmEnd / P.red;
    const baseEnd = Math.max(1, rpmEnd) / 60 * P.fpr * pitchEnd / 2;
    const w = this.w, wEnd = this.wEnd, dw = this.dw;
    this.weights(baseEnd, loadEnd, rnEnd, wEnd);
    for (let k = 1; k <= MAX_H; k++) dw[k] = (wEnd[k] - w[k]) / n;

    // block-rate noise layer filters follow rpm/load
    const raspC = 700 + 900 * loadEnd + 500 * Math.min(1, rnEnd);
    if (Math.abs(raspC - this.raspF.f) > 20) this.raspF.set('bp', raspC, 0.9);
    const inC = 450 + 1100 * Math.min(1, rnEnd);
    if (Math.abs(inC - this.intakeF.f) > 20) this.intakeF.set('bp', inC, 1.1);
    const muf = Math.min(18000, T.muffle || 18000);
    const doMuf = muf < 17000;
    if (doMuf && Math.abs(muf - this.mufF) > this.mufF * 0.03) { this.mufF = muf; this.mufL.set('lp', muf, 0.6); this.mufR.set('lp', muf, 0.6); }
    const raspAmt = P.rasp * Math.pow(loadEnd, 1.3) * (0.35 + 0.65 * Math.min(1, rnEnd)) * 3;
    const inAmt = P.intake * loadEnd * Math.min(1, rnEnd * 1.3) * 2.5;
    const mechAmt = P.mech * (0.4 + Math.min(1, rnEnd)) * 3;
    const lite = !this.stereo;

    let rpm = this.rpm, load = this.load, gain = this.gain, pitch = this.pitch, env = this.env;
    let theta = this.theta, cam = this.cam, jn = this.jn, jn2 = this.jn2, nlp = this.nlp;
    const gainT = T.gain, pitchT = T.pitch, phaseK = TAU * P.fpr / 120 / sr, redInv = 1 / P.red, jit = P.jit;
    const out0 = P.out, L = outs[0], Rt = outs[1] || null, dl = this.dl;
    const raspF = this.raspF, intakeF = this.intakeF, mechF = this.mechF;
    let dlI = this.dlI;
    let active = false;
    for (let i = 0; i < n; i++) {
      rpm += (rpmT - rpm) * kr;
      load += (loadT - load) * kl;
      gain += (gainT - gain) * kg;
      pitch += (pitchT - pitch) * kp;
      env += (envT - env) * ke;
      const wn = R.bi();
      // combustion-to-combustion speed variation: band-limited (~20 Hz) jitter
      jn += (wn - jn) * 0.0026; jn2 += (jn - jn2) * 0.0026;
      const dth = (rpm > 0 ? rpm : 0) * phaseK * pitch * (1 + jn2 * jit * 40 * (1 + idleish));
      theta += dth;
      if (theta > TAU) theta -= TAU;
      const s1 = Math.sin(theta), c2 = 2 * Math.cos(theta);
      let sPrev = 0, sCur = s1, core = 0;
      for (let k = 1; k <= MAX_H; k++) {
        w[k] += dw[k];
        core += w[k] * sCur;
        const sNext = c2 * sCur - sPrev;
        sPrev = sCur; sCur = sNext;
      }
      core *= 0.55 + 0.45 * load;
      // exhaust rasp: noise gated by the positive half of the firing wave
      const gate = core > 0 ? core : 0;
      const rasp = raspAmt > 0.001 ? raspF.run(wn) * gate * raspAmt : 0;
      nlp += (wn - nlp) * 0.02;
      let intake = 0, mech = 0;
      if (!lite) {
        intake = inAmt > 0.001 ? intakeF.run(wn) * inAmt : 0;
        cam += dth * 0.5 / P.fpr;
        if (cam > TAU) cam -= TAU;
        const c = 0.5 + 0.5 * Math.cos(cam * 2);
        mech = mechF.run(wn) * c * c * c * c * mechAmt;
      }
      this.starterEnv += (starter - this.starterEnv) * 0.0008;
      if (this.starterEnv > 1e-4) {
        const se = this.starterEnv;
        this.crankPh += TAU * 9 / sr;
        this.starterPh += TAU * 240 / sr;
        core = core * (1 - 0.4 * se + 0.4 * se * Math.sin(this.crankPh)) + Math.sin(this.starterPh) * 0.1 * se;
      }
      const loud = (0.5 + 0.5 * Math.min(1, rpm * redInv * 1.4)) * env * gain * out0;
      let l = core + rasp * 0.9 + intake * 1.2 + mech + nlp * 0.02;
      if (Rt) {
        // a few samples of inter-channel delay on the core gives width;
        // rasp and intake lean to opposite sides (exhaust rear, intake front)
        const delayed = dl[(dlI + DELAY - 18) & (DELAY - 1)];
        dl[dlI] = core; dlI = (dlI + 1) & (DELAY - 1);
        let r = core * 0.6 + delayed * 0.4 + rasp * 1.1 + intake * 0.8 + mech * 0.6;
        if (doMuf) { l = this.mufL.run(l); r = this.mufR.run(r); }
        L[i] = softclip(l * loud * 0.9);
        Rt[i] = softclip(r * loud * 0.9);
      } else {
        if (doMuf) l = this.mufL.run(l);
        L[i] = softclip(l * loud * 0.9);
      }
      if (L[i] !== 0) active = true;
    }
    for (let k = 1; k <= MAX_H; k++) w[k] = wEnd[k];
    this.rpm = rpm; this.load = load; this.gain = gain; this.pitch = pitch; this.env = env;
    this.theta = theta; this.cam = cam; this.jn = jn; this.jn2 = jn2; this.nlp = nlp; this.dlI = dlI;
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

// A NaN target would poison the voice's state for good and, summed into the
// master bus, silence the whole game: non-finite numbers are dropped.
function assignFinite(dst, src) {
  for (const k in src) {
    const x = src[k];
    if (typeof x !== 'number' || Number.isFinite(x)) dst[k] = x;
  }
}

function finiteOut(out, n) {
  for (const ch of out) for (let j = 0; j < n; j += 16) if (!Number.isFinite(ch[j])) return false;
  for (const ch of out) if (!Number.isFinite(ch[n - 1])) return false;
  return true;
}

class EngineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.opts = o;
    this.voices = Array.from({ length: o.voices || 1 }, (_, i) => new EngineVoice(1234 + i * 7919, !!o.running, !!o.stereo));
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
        assignFinite(voice.t, p);
        if (p.snap) { voice.rpm = p.rpm; voice.load = p.load; voice.pitch = p.pitch || 1; }
      }
      if (m.road && this.road) assignFinite(this.road.t, m.road);
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
      const out = outputs[i];
      if (!out || !out[0]) continue;
      this.voices[i].render(out, out[0].length, dtBlock);
      if (!finiteOut(out, out[0].length)) {
        for (const ch of out) ch.fill(0);
        this.voices[i] = new EngineVoice(1234 + i * 7919, !!this.opts.running, !!this.opts.stereo);
      }
    }
    if (this.road) {
      const out = outputs[this.voices.length] && outputs[this.voices.length][0];
      if (out) {
        this.road.render(out, out.length, dtBlock);
        if (!finiteOut([out], out.length)) { out.fill(0); this.road = new RoadVoice(); }
      }
    }
    return true;
  }
}

registerProcessor('gde-engine', EngineProcessor);
