// Procedural sample bank: every buffer is synthesized in plain JS (noise,
// oscillators, RBJ biquads, envelopes) the first time it is needed, then
// cached per AudioContext. Beds are rendered as seamless loops.

const TAU = Math.PI * 2;

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

class Biquad {
  constructor(type, f, q, sr) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.sr = sr;
    this.type = type;
    this.set(f, q);
  }
  set(f, q = 0.707) {
    const w = TAU * Math.min(Math.max(f, 10), this.sr * 0.45) / this.sr;
    const cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (this.type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = -2 * cs / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

const bq = (type, f, q, sr) => new Biquad(type, f, q, sr);

function pinkGen(R) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = R() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return o * 0.11;
  };
}

function brownGen(R) {
  let b = 0;
  return () => { b = (b + (R() * 2 - 1) * 0.02) * 0.998; return b * 3.5; };
}

// Adds a decaying excitation into `d` starting at sample s0.
function addDecay(d, s0, len, fn) {
  const end = Math.min(d.length, s0 + len);
  for (let i = Math.max(0, s0); i < end; i++) d[i] += fn(i - s0);
}

function addPartials(d, sr, t0, base, parts, amp = 1, R = null) {
  const s0 = Math.floor(t0 * sr);
  for (const [ratio, a, tau] of parts) {
    const f = base * ratio * (R ? 1 + (R() - 0.5) * 0.01 : 1);
    if (f >= sr * 0.48) continue;
    const w = TAU * f / sr, k = 1 / (tau * sr), ph = R ? R() * TAU : 0;
    addDecay(d, s0, Math.floor(tau * sr * 6), (i) => Math.sin(w * i + ph) * Math.exp(-i * k) * a * amp);
  }
}

function addNoiseBurst(d, sr, t0, R, { type = 'bp', f = 1000, q = 1, tau = 0.02, amp = 1, attack = 0.001, len } = {}) {
  const flt = bq(type, f, q, sr);
  const s0 = Math.floor(t0 * sr), at = Math.max(1, attack * sr), k = 1 / (tau * sr);
  addDecay(d, s0, Math.floor((len ?? tau * 6) * sr), (i) => flt.run(R() * 2 - 1) * amp * Math.min(1, i / at) * Math.exp(-i * k));
}

function addTone(d, sr, t0, dur, R, { f0, f1 = f0, amp = 1, attack = 0.005, release = 0.03, shape = 'sine', vib = 0, vibRate = 6 } = {}) {
  const s0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
  let ph = 0;
  const at = attack * sr, rl = release * sr;
  addDecay(d, s0, n, (i) => {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t) * (1 + vib * Math.sin(TAU * vibRate * i / sr));
    ph += TAU * f / sr;
    const env = Math.min(1, i / at, (n - i) / rl);
    const s = shape === 'saw' ? ((ph / TAU) % 1) * 2 - 1 : Math.sin(ph) + (shape === 'rich' ? 0.3 * Math.sin(ph * 2) + 0.12 * Math.sin(ph * 3) : 0);
    return s * env * amp;
  });
}

// Buzzy source through two moving formants: vowel-ish animal/voice calls.
function addVoiced(d, sr, t0, dur, R, { f0, f1 = f0, fMid, formants, formantsEnd, amp = 1, attack = 0.02, release = 0.05, noise = 0.05, vib = 0, vibRate = 6, am = 0, amRate = 6, q = [4, 6] }) {
  const s0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
  const fa = bq('bp', formants[0], q[0], sr), fb = bq('bp', formants[1], q[1], sr);
  const fe = formantsEnd || formants;
  let ph = 0;
  const at = attack * sr, rl = release * sr;
  addDecay(d, s0, n, (i) => {
    const t = i / n;
    if ((i & 31) === 0) {
      fa.set(formants[0] + (fe[0] - formants[0]) * t, q[0]);
      fb.set(formants[1] + (fe[1] - formants[1]) * t, q[1]);
    }
    let f = fMid !== undefined ? (t < 0.5 ? f0 + (fMid - f0) * t * 2 : fMid + (f1 - fMid) * (t - 0.5) * 2) : f0 + (f1 - f0) * t;
    f *= 1 + vib * Math.sin(TAU * vibRate * i / sr) + (R() - 0.5) * 0.01;
    ph += f / sr;
    const src = ((ph % 1) * 2 - 1) + (R() * 2 - 1) * noise;
    const env = Math.min(1, i / at, (n - i) / rl) * (1 - am * 0.5 * (1 + Math.sin(TAU * amRate * i / sr)));
    return (fa.run(src) + fb.run(src) * 0.7) * env * amp;
  });
}

function normalize(chs, peak) {
  let m = 0;
  for (const d of chs) for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
  if (m < 1e-9) return;
  const k = peak / m;
  for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= k;
}

function fadeEdges(chs, sr, fadeOut = 0.02) {
  const n = Math.floor(fadeOut * sr);
  for (const d of chs) {
    for (let i = 0; i < Math.min(n, d.length); i++) d[d.length - 1 - i] *= i / n;
    for (let i = 0; i < Math.min(32, d.length); i++) d[i] *= i / 32;
  }
}

// Crossfades the rendered overhang back into the head so the loop is seamless.
function loopify(chs, n, xf) {
  return chs.map((d) => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = d[i];
    for (let i = 0; i < xf; i++) {
      const t = i / xf;
      o[i] = d[i] * Math.sin(t * Math.PI / 2) + d[n + i] * Math.cos(t * Math.PI / 2);
    }
    return o;
  });
}

const circ = (t, t0, len) => { let x = Math.abs(t - t0); return Math.min(x, len - x); };

// --- beds ---------------------------------------------------------------

function bedCity(chs, sr, R, len) {
  const cars = Array.from({ length: 7 }, () => ({ t0: R() * len, w: 1.2 + R() * 1.8, a: 0.25 + R() * 0.45, pan: R(), f: 260 + R() * 380 }));
  chs.forEach((d, c) => {
    const br = brownGen(R), lp = bq('lp', 170, 0.7, sr), lp2 = bq('lp', 90, 0.9, sr);
    const bands = cars.map((k) => bq('bp', k.f, 0.9, sr));
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let v = lp.run(br()) * 0.7 + lp2.run(R() * 2 - 1) * 0.5;
      for (let k = 0; k < cars.length; k++) {
        const car = cars[k], x = circ(t, car.t0, len) / car.w;
        if (x > 3) { bands[k].run(0); continue; }
        const pan = c === 0 ? 1 - car.pan * 0.6 : 0.4 + car.pan * 0.6;
        v += bands[k].run(R() * 2 - 1) * Math.exp(-x * x) * car.a * pan;
      }
      d[i] = v;
    }
  });
}

function bedWind(chs, sr, R, len) {
  const mods = [1, 2, 3, 5, 7].map((k) => ({ f: k / len, ph: R() * TAU, a: 1 / k }));
  const g = (t) => { let s = 0; for (const m of mods) s += Math.sin(TAU * m.f * t + m.ph) * m.a; return 0.5 + 0.28 * s; };
  chs.forEach((d, c) => {
    const pk = pinkGen(R), band = bq('bp', 400, 0.8, sr), whistle = bq('bp', 1100, 14, sr);
    const off = c * 0.37;
    let gg = 0.5;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      if ((i & 63) === 0) {
        gg = Math.max(0, Math.min(1, g(t + off)));
        band.set(220 + gg * 560, 0.8);
        whistle.set(850 + gg * 800, 14);
      }
      const n = pk();
      d[i] = band.run(n) * (0.35 + gg * 0.9) + whistle.run(n) * gg * gg * gg * 0.9;
    }
  });
}

function bedRain(chs, sr, R) {
  chs.forEach((d) => {
    const hp = bq('hp', 900, 0.7, sr), lp = bq('lp', 7500, 0.7, sr);
    const drop1 = bq('bp', 2600, 2, sr), drop2 = bq('bp', 5200, 3, sr), splat = bq('lp', 700, 0.8, sr);
    for (let i = 0; i < d.length; i++) {
      const w = R() * 2 - 1;
      const imp = R() < 190 / sr ? (R() * R()) * (R() < 0.5 ? -1 : 1) * 8 : 0;
      const imp2 = R() < 45 / sr ? (R() * 2 - 1) * 10 : 0;
      d[i] = lp.run(hp.run(w)) * 0.35 + drop1.run(imp) + drop2.run(imp) * 0.7 + splat.run(imp2) * 0.6;
    }
  });
}

function bedRoof(chs, sr, R, len) {
  const d = chs[0];
  const lp = bq('lp', 1400, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(R() * 2 - 1) * 0.06;
  const drops = Math.floor(len * 75);
  for (let k = 0; k < drops; k++) {
    const s0 = Math.floor(R() * d.length), f = 180 + R() * 520, tau = 0.006 + R() * 0.02, a = 0.2 + R() * R() * 0.8;
    const w = TAU * f / sr, kk = 1 / (tau * sr);
    addDecay(d, s0, Math.floor(tau * 6 * sr), (i) => Math.sin(w * i) * Math.exp(-i * kk) * a);
  }
}

const VOWELS = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [640, 1190], [440, 1020], [390, 1990], [660, 1700]];

function babble(chs, sr, R, len, voices, lpHz, roomy) {
  const tmp = chs.map((d) => new Float32Array(d.length));
  for (let v = 0; v < voices; v++) {
    const pan = R(), base = R() < 0.5 ? 95 + R() * 40 : 170 + R() * 70, amp = 0.5 + R() * 0.5;
    const fa = bq('bp', 500, 5, sr), fb = bq('bp', 1500, 7, sr);
    let t = R() * 0.5, ph = 0;
    const total = tmp[0].length / sr;
    while (t < total) {
      const syl = 0.08 + R() * 0.15, vw = VOWELS[Math.floor(R() * VOWELS.length)];
      fa.set(vw[0] * (0.9 + R() * 0.2), 5); fb.set(vw[1] * (0.9 + R() * 0.2), 7);
      const s0 = Math.floor(t * sr), n = Math.floor(syl * sr), rise = (R() - 0.4) * 0.25;
      for (let i = 0; i < n && s0 + i < tmp[0].length; i++) {
        const u = i / n;
        ph += base * (1 + rise * u) / sr;
        const src = (ph % 1) * 2 - 1 + (R() * 2 - 1) * 0.15;
        const env = Math.sin(Math.PI * u) ** 1.5 * amp;
        const s = (fa.run(src) + fb.run(src) * 0.6) * env;
        tmp[0][s0 + i] += s * (1 - pan * 0.7);
        if (tmp[1]) tmp[1][s0 + i] += s * (0.3 + pan * 0.7);
      }
      t += syl + 0.02 + R() * 0.06 + (R() < 0.12 ? 0.3 + R() * 0.6 : 0);
    }
  }
  tmp.forEach((src, c) => {
    const d = chs[c], lp = bq('lp', lpHz, 0.7, sr);
    const taps = roomy ? [[0.023, 0.35], [0.037, 0.3], [0.053, 0.25], [0.071, 0.18]] : [];
    for (let i = 0; i < d.length; i++) {
      let v = src[i];
      for (const [dt, g] of taps) { const j = i - Math.floor(dt * sr * (1 + c * 0.13)); if (j >= 0) v += src[j] * g; }
      d[i] = lp.run(v) + (R() * 2 - 1) * 0.01;
    }
  });
}

function bedCrickets(chs, sr, R, len) {
  const crickets = Array.from({ length: 5 }, () => {
    const n = 10 + Math.floor(R() * 10);
    return { f: 4200 + R() * 800, period: len / n, pulses: 3 + Math.floor(R() * 2), pp: 0.025 + R() * 0.01, off: R(), a: 0.25 + R() * 0.75, pan: R() };
  });
  chs.forEach((d, c) => {
    const bg = bq('bp', 4600, 6, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let v = bg.run(R() * 2 - 1) * 0.12 * (0.6 + 0.4 * Math.sin(TAU * 30 * t));
      for (const k of crickets) {
        const within = ((t / k.period + k.off) % 1) * k.period;
        const pi = Math.floor(within / k.pp);
        if (pi >= k.pulses) continue;
        const u = (within - pi * k.pp) / (k.pp * 0.6);
        if (u > 1) continue;
        const pan = c === 0 ? 1 - k.pan * 0.7 : 0.3 + k.pan * 0.7;
        v += Math.sin(TAU * k.f * t) * Math.sin(Math.PI * u) * k.a * pan;
      }
      d[i] = v;
    }
  });
}

function bedLap(chs, sr, R, len) {
  const d = chs[0];
  const waves = [0.3, 2.2, 4.1].map((t) => ({ t0: t + R() * 0.4, w: 0.45 + R() * 0.3, a: 0.6 + R() * 0.4 }));
  const lp = bq('lp', 320, 0.8, sr), slosh = bq('bp', 850, 1.2, sr), br = brownGen(R);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let e = 0.18;
    for (const w of waves) { const x = circ(t, w.t0, len) / w.w; e += Math.exp(-x * x) * w.a; }
    d[i] = lp.run(br()) * e * 1.2 + slosh.run(R() * 2 - 1) * e * e * 0.35;
  }
  for (let k = 0; k < 6; k++) {
    const t0 = R() * (len - 0.1);
    addTone(d, sr, t0, 0.03, R, { f0: 650 + R() * 300, f1: 240, amp: 0.25 + R() * 0.2, attack: 0.002, release: 0.02 });
  }
}

// --- one-shots ------------------------------------------------------------

function thump(d, sr, t0, f, tau, amp) {
  const s0 = Math.floor(t0 * sr), k = 1 / (tau * sr);
  let ph = 0;
  addDecay(d, s0, Math.floor(tau * 6 * sr), (i) => { ph += TAU * f * (1 - 0.4 * Math.min(1, i / (tau * 4 * sr))) / sr; return Math.sin(ph) * Math.exp(-i * k) * amp; });
}

function step(surface) {
  return (chs, sr, R) => {
    const d = chs[0];
    const toe = 0.045 + R() * 0.03;
    const f = 70 + R() * 40;
    switch (surface) {
      case 'klinkers':
        thump(d, sr, 0, f, 0.022, 0.5);
        addNoiseBurst(d, sr, 0, R, { f: 2300 + R() * 800, q: 1.2, tau: 0.006, amp: 1 });
        addNoiseBurst(d, sr, 0.002, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.03, amp: 0.25 });
        addNoiseBurst(d, sr, toe, R, { f: 2800, q: 1.4, tau: 0.005, amp: 0.5 });
        break;
      case 'gras':
        thump(d, sr, 0, f * 0.9, 0.02, 0.35);
        addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 1500, q: 0.7, tau: 0.06, amp: 0.55, attack: 0.012 });
        for (let k = 0; k < 7; k++) addNoiseBurst(d, sr, R() * 0.07, R, { f: 2500 + R() * 2500, q: 3, tau: 0.004, amp: 0.25 + R() * 0.2 });
        break;
      case 'wood': {
        thump(d, sr, 0, f, 0.03, 0.6);
        const m = 210 + R() * 110;
        addNoiseBurst(d, sr, 0, R, { f: m, q: 9, tau: 0.06, amp: 2.2 });
        addNoiseBurst(d, sr, 0, R, { f: m * 2.3, q: 8, tau: 0.035, amp: 1.2 });
        addNoiseBurst(d, sr, 0, R, { f: 1500, q: 1, tau: 0.005, amp: 0.5 });
        addNoiseBurst(d, sr, toe, R, { f: m * 1.1, q: 9, tau: 0.04, amp: 1.1 });
        break;
      }
      case 'wet':
        thump(d, sr, 0, f, 0.02, 0.4);
        addNoiseBurst(d, sr, 0, R, { f: 1200, q: 0.7, tau: 0.06, amp: 0.8, attack: 0.004 });
        for (let k = 0; k < 3; k++) addTone(d, sr, 0.01 + R() * 0.06, 0.015, R, { f0: 500 + R() * 400, f1: 1100 + R() * 500, amp: 0.25, attack: 0.002, release: 0.008 });
        break;
      default:
        thump(d, sr, 0, f, 0.025, 0.7);
        addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 1200, q: 0.7, tau: 0.018, amp: 0.8 });
        addNoiseBurst(d, sr, 0.004, R, { f: 2000, q: 0.9, tau: 0.045, amp: 0.2, attack: 0.01 });
        addNoiseBurst(d, sr, toe, R, { type: 'lp', f: 1600, q: 0.7, tau: 0.012, amp: 0.35 });
    }
  };
}

function glass(chs, sr, R) {
  const d = chs[0];
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2000, q: 0.7, tau: 0.02, amp: 1 });
  addNoiseBurst(d, sr, 0.005, R, { f: 3200, q: 0.8, tau: 0.15, amp: 0.35 });
  for (let k = 0; k < 60; k++) {
    const t = -Math.log(1 - R() * 0.95) * 0.22;
    const f = 2500 + R() * 6500;
    addPartials(d, sr, t, f, [[1, 1, 0.015 + R() * 0.04], [1.53 + R() * 0.3, 0.5, 0.012]], (0.15 + R() * 0.3) * Math.exp(-t * 2.2), R);
  }
}

function casing(chs, sr, R) {
  const d = chs[0];
  const base = 3200 + R() * 1000;
  let t = 0, gap = 0.09 + R() * 0.03, a = 1;
  const n = 3 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    addPartials(d, sr, t, base * (1 + (R() - 0.5) * 0.04), [[1, 1, 0.05], [2.33, 0.6, 0.035], [3.9, 0.4, 0.02]], a, R);
    addNoiseBurst(d, sr, t, R, { type: 'hp', f: 5000, q: 0.7, tau: 0.002, amp: a * 0.5 });
    t += gap; gap *= 0.6; a *= 0.55;
  }
}

function bell(base, decayScale) {
  return (chs, sr, R) => {
    const d = chs[0];
    const parts = [[0.5, 0.35, 4.5], [0.502, 0.2, 4.2], [1, 0.5, 3.0], [1.19, 0.35, 2.2], [1.5, 0.25, 1.8], [2.0, 0.45, 1.6], [2.52, 0.18, 1.0], [2.66, 0.15, 0.9], [3.01, 0.12, 0.7], [4.1, 0.08, 0.45], [5.4, 0.05, 0.3]]
      .map(([r, a, tau]) => [r, a, tau * decayScale]);
    addPartials(d, sr, 0, base, parts, 1, R);
    addNoiseBurst(d, sr, 0, R, { f: base * 6, q: 1, tau: 0.008, amp: 0.3 });
  };
}

function bird(kind) {
  return (chs, sr, R) => {
    const d = chs[0];
    let t = 0.02;
    if (kind === 0) {
      const n = 5 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const dur = 0.06 + R() * 0.12, f0 = 1600 + R() * 1600;
        addTone(d, sr, t, dur, R, { f0, f1: f0 * (0.7 + R() * 0.7), amp: 0.6 + R() * 0.4, attack: 0.01, release: 0.02, shape: 'rich', vib: 0.02, vibRate: 40 });
        t += dur + 0.02 + R() * 0.06;
      }
    } else if (kind === 1) {
      const n = 4 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const dur = 0.04 + R() * 0.03, f0 = 3800 + R() * 1200;
        addTone(d, sr, t, dur, R, { f0, f1: f0 * 0.7, amp: 0.8, attack: 0.003, release: 0.01 });
        t += 0.09 + R() * 0.06;
      }
    } else if (kind === 2) {
      for (let k = 0; k < 3; k++) {
        addTone(d, sr, t, 0.09, R, { f0: 5000, f1: 4800, amp: 0.8, attack: 0.006, release: 0.02 });
        addTone(d, sr, t + 0.11, 0.09, R, { f0: 3700, f1: 3500, amp: 0.7, attack: 0.006, release: 0.02 });
        t += 0.27;
      }
    } else if (kind === 3) {
      const f = 3800 + R() * 900;
      for (let k = 0; k < 18; k++) { addTone(d, sr, t, 0.018, R, { f0: f * 1.1, f1: f * 0.9, amp: 0.7, attack: 0.002, release: 0.006 }); t += 0.028; }
    } else {
      const n = 6 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const dur = 0.03 + R() * 0.06, f0 = 3000 + R() * 4000;
        addTone(d, sr, t, dur, R, { f0, f1: 3000 + R() * 4000, amp: 0.5 + R() * 0.5, attack: 0.004, release: 0.012 });
        t += dur + 0.01 + R() * 0.04;
      }
    }
  };
}

function gull(chs, sr, R) {
  const d = chs[0];
  let t = 0.02, f = 1050 + R() * 200;
  const n = 3 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    const dur = k === 0 ? 0.26 : 0.14 + R() * 0.05;
    addVoiced(d, sr, t, dur, R, { f0: f * 1.05, f1: f * 0.72, formants: [1800, 3000], formantsEnd: [1500, 2600], amp: 1 - k * 0.1, attack: 0.012, release: 0.04, noise: 0.25, q: [3, 4] });
    t += dur + 0.06 + R() * 0.04;
    f *= 0.97;
  }
}

function radio(chs, sr, R, len) {
  const d = chs[0];
  const hp = bq('hp', 450, 0.7, sr), lp = bq('lp', 2700, 0.7, sr), hiss = bq('hp', 1500, 0.7, sr);
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2200, q: 0.7, tau: 0.02, amp: 0.5 });
  addTone(d, sr, 0.005, 0.045, R, { f0: 1400, amp: 0.35, attack: 0.002, release: 0.005 });
  let t = 0.1;
  const end = len - 0.3;
  const base = 105 + R() * 50;
  while (t < end) {
    const syl = 0.06 + R() * 0.1, vw = VOWELS[Math.floor(R() * VOWELS.length)];
    addVoiced(d, sr, t, Math.min(syl, end - t), R, { f0: base * (1 + (R() - 0.5) * 0.3), f1: base * (0.9 + R() * 0.3), formants: vw, amp: 0.9, attack: 0.008, release: 0.015, noise: 0.3, q: [4, 5] });
    t += syl + (R() < 0.15 ? 0.12 + R() * 0.12 : 0.015 + R() * 0.03);
  }
  addNoiseBurst(d, sr, end + 0.05, R, { type: 'hp', f: 1500, q: 0.7, tau: 0.05, amp: 0.45, attack: 0.004, len: 0.15 });
  for (let i = 0; i < d.length; i++) {
    const q = Math.round(d[i] * 24) / 24;
    d[i] = lp.run(hp.run(q)) + hiss.run(R() * 2 - 1) * (i / sr < end + 0.05 ? 0.035 : 0);
  }
}

function thunder(close) {
  return (chs, sr, R, len) => {
    const d = chs[0];
    const br = brownGen(R), lp = bq('lp', 400, 0.7, sr), mid = bq('bp', 900, 0.8, sr);
    const swells = Array.from({ length: 7 }, (_, k) => ({ t0: 0.15 + R() * 3.5 * (k / 6 + 0.1), w: 0.25 + R() * 0.9, a: (0.5 + R() * 0.5) * Math.exp(-k * 0.2) }));
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      if ((i & 255) === 0) lp.set(700 * Math.exp(-t * 0.5) + 140, 0.7);
      let e = 0;
      for (const s of swells) { const x = (t - s.t0) / s.w; e += Math.exp(-x * x) * s.a; }
      e = e * Math.exp(-t / 2.8) + 0.08 * Math.exp(-t / 1.5);
      const n = br();
      d[i] = lp.run(n) * e * 1.6 + mid.run(R() * 2 - 1) * e * 0.25 * Math.exp(-t * 1.2);
    }
    if (close) {
      addNoiseBurst(d, sr, 0.01, R, { f: 1500, q: 0.6, tau: 0.12, amp: 1.2 });
      addNoiseBurst(d, sr, 0.0, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.03, amp: 0.8 });
    }
  };
}

const S = {};
const def = (name, dur, gen, o = {}) => { S[name] = { dur, gen, ch: o.ch || 1, rate: o.rate || 0, loop: o.loop || 0, peak: o.peak ?? 0.9 }; };

def('bed_city', 8, bedCity, { ch: 2, rate: 22050, loop: 0.6 });
def('bed_wind', 10, bedWind, { ch: 2, rate: 22050, loop: 0.8 });
def('bed_rain', 6, bedRain, { ch: 2, loop: 0.4 });
def('bed_roof', 5, bedRoof, { rate: 22050, loop: 0.3 });
def('bed_crowd', 8, (c, sr, R, l) => babble(c, sr, R, l, 9, 3200, true), { ch: 2, rate: 22050, loop: 0.6 });
def('bed_terrace', 7, (c, sr, R, l) => babble(c, sr, R, l, 4, 2600, true), { ch: 2, rate: 22050, loop: 0.5 });
def('bed_crickets', 6, bedCrickets, { ch: 2, loop: 0.05 });
def('bed_lap', 6, bedLap, { rate: 22050, loop: 0.4 });

for (const s of ['klinkers', 'asfalt', 'gras', 'wood', 'wet']) for (let v = 0; v < 4; v++) def(`step_${s}_${v}`, 0.22, step(s));
def('land', 0.3, (c, sr, R) => { thump(c[0], sr, 0, 62, 0.06, 1); addNoiseBurst(c[0], sr, 0, R, { type: 'lp', f: 800, q: 0.7, tau: 0.04, amp: 0.8 }); step('klinkers')([c[0].subarray(Math.floor(0.06 * sr))], sr, R); });
def('whoosh', 0.24, (c, sr, R) => {
  const d = c[0], f = bq('bp', 500, 1.4, sr), n = d.length;
  for (let i = 0; i < n; i++) { const u = i / n; if ((i & 31) === 0) f.set(500 + 1300 * Math.sin(Math.PI * Math.min(1, u * 1.3)), 1.4); d[i] = f.run(R() * 2 - 1) * Math.sin(Math.PI * u) ** 2; }
});
def('punch', 0.2, (c, sr, R) => { thump(c[0], sr, 0, 95, 0.05, 1); addNoiseBurst(c[0], sr, 0, R, { f: 1800, q: 0.9, tau: 0.012, amp: 0.8 }); addNoiseBurst(c[0], sr, 0, R, { type: 'lp', f: 600, q: 0.7, tau: 0.04, amp: 0.5 }); });
def('body_hit', 0.18, (c, sr, R) => { thump(c[0], sr, 0, 120, 0.035, 0.8); addNoiseBurst(c[0], sr, 0, R, { f: 700, q: 1, tau: 0.025, amp: 1 }); addNoiseBurst(c[0], sr, 0, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.003, amp: 0.4 }); });
def('body_fall', 0.7, (c, sr, R) => {
  const d = c[0], t2 = 0.13 + R() * 0.05;
  thump(d, sr, 0, 75, 0.06, 0.6); addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 500, q: 0.7, tau: 0.05, amp: 0.5 });
  thump(d, sr, t2, 60, 0.09, 1); addNoiseBurst(d, sr, t2, R, { type: 'lp', f: 700, q: 0.7, tau: 0.06, amp: 0.7 });
  addNoiseBurst(d, sr, 0, R, { f: 2500, q: 0.8, tau: 0.15, amp: 0.12, attack: 0.03 });
});
const click = (d, sr, R, t, f, a) => { addNoiseBurst(d, sr, t, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.003, amp: a }); addNoiseBurst(d, sr, t, R, { f, q: 12, tau: 0.015, amp: a * 2.5 }); };
def('dry_click', 0.1, (c, sr, R) => { click(c[0], sr, R, 0, 3800, 1); click(c[0], sr, R, 0.035, 3300, 0.5); });
def('mag_out', 0.25, (c, sr, R) => { click(c[0], sr, R, 0, 2600, 0.8); addNoiseBurst(c[0], sr, 0.01, R, { f: 1800, q: 1, tau: 0.04, amp: 0.4, attack: 0.01 }); addNoiseBurst(c[0], sr, 0.02, R, { f: 2400, q: 15, tau: 0.05, amp: 1 }); });
def('mag_in', 0.25, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { f: 1600, q: 1, tau: 0.03, amp: 0.4, attack: 0.02 }); click(c[0], sr, R, 0.05, 3100, 1); thump(c[0], sr, 0.05, 180, 0.02, 0.5); });
def('slide', 0.35, (c, sr, R) => {
  const d = c[0], f = bq('bp', 1200, 1.3, sr), n = Math.floor(0.07 * sr);
  for (let i = 0; i < n; i++) { if ((i & 31) === 0) f.set(1200 + 1200 * i / n, 1.3); d[i] += f.run(R() * 2 - 1) * 0.5 * Math.sin(Math.PI * i / n); }
  click(d, sr, R, 0.12, 2700, 1); addPartials(d, sr, 0.12, 4300, [[1, 0.3, 0.03]]); thump(d, sr, 0.12, 200, 0.02, 0.4);
});
def('pump', 0.5, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { f: 900, q: 1.2, tau: 0.04, amp: 0.6, attack: 0.03 });
  click(d, sr, R, 0.1, 1600, 0.8); thump(d, sr, 0.1, 140, 0.03, 0.6);
  addNoiseBurst(d, sr, 0.2, R, { f: 1100, q: 1.2, tau: 0.035, amp: 0.55, attack: 0.03 });
  click(d, sr, R, 0.3, 1900, 1); thump(d, sr, 0.3, 120, 0.04, 0.8);
});
for (let v = 0; v < 3; v++) def(`casing_${v}`, 0.55, casing);
def('glass', 1.4, glass);
def('metal_ping', 0.4, (c, sr, R) => { const b = 1100 + R() * 500; addPartials(c[0], sr, 0, b, [[1, 1, 0.09], [2.76, 0.6, 0.06], [5.4, 0.35, 0.03]], 1, R); addNoiseBurst(c[0], sr, 0, R, { f: 2500, q: 1, tau: 0.01, amp: 0.8 }); });
def('whizz', 0.32, (c, sr, R) => {
  const d = c[0], f = bq('bp', 4000, 3, sr), n = d.length;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if ((i & 31) === 0) f.set(4000 * Math.pow(0.3, u), 3);
    const env = u < 0.38 ? (u / 0.38) ** 2 : Math.exp(-(u - 0.38) * 9);
    ph += TAU * 1400 * Math.pow(0.43, u) / sr;
    d[i] = (f.run(R() * 2 - 1) * 1.4 + Math.sin(ph) * 0.3) * env;
  }
});
def('ric_whine', 0.6, (c, sr, R) => { addTone(c[0], sr, 0.004, 0.55, R, { f0: 3400 + R() * 600, f1: 1500, amp: 0.7, attack: 0.004, release: 0.25, vib: 0.02, vibRate: 30 }); addNoiseBurst(c[0], sr, 0, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.008, amp: 1 }); });
def('thunder_0', 7, thunder(true), { rate: 22050 });
def('thunder_1', 7, thunder(false), { rate: 22050 });
def('thunder_2', 7, thunder(false), { rate: 22050 });
def('bell_big', 7, bell(146.8, 1), { rate: 22050 });
def('bell_carillon', 3.5, bell(523.25, 0.45), { rate: 22050 });
for (let v = 0; v < 5; v++) def(`bird_${v}`, 1.4, bird(v));
for (let v = 0; v < 2; v++) def(`gull_${v}`, 1.6, gull);
def('cow', 2.1, (c, sr, R) => addVoiced(c[0], sr, 0.02, 2.0, R, { f0: 108, fMid: 124, f1: 92, formants: [300, 800], formantsEnd: [420, 1050], amp: 1, attack: 0.25, release: 0.45, noise: 0.12, vib: 0.01, vibRate: 5, q: [3, 4] }), { rate: 22050 });
def('sheep', 1.0, (c, sr, R) => addVoiced(c[0], sr, 0.02, 0.9, R, { f0: 290, f1: 260, formants: [700, 1700], amp: 1, attack: 0.03, release: 0.2, noise: 0.1, vib: 0.05, vibRate: 7, am: 0.6, amRate: 7, q: [3, 5] }), { rate: 22050 });
def('duck', 0.5, (c, sr, R) => { for (const t of [0.01, 0.2]) addVoiced(c[0], sr, t, 0.12, R, { f0: 270, f1: 215, formants: [1100, 2400], amp: 1, attack: 0.006, release: 0.04, noise: 0.25, q: [2, 4] }); }, { rate: 22050 });
def('pigeon', 1.3, (c, sr, R) => { let t = 0.02; for (const [dur, f] of [[0.35, 390], [0.22, 340], [0.3, 330]]) { addVoiced(c[0], sr, t, dur, R, { f0: f, f1: f * 0.88, formants: [400, 800], amp: 1, attack: 0.06, release: 0.08, noise: 0.03, am: 0.6, amRate: 24, q: [2, 3] }); t += dur + 0.08; } }, { rate: 22050 });
def('flutter', 0.75, (c, sr, R) => { for (let k = 0; k < 9; k++) addNoiseBurst(c[0], sr, k / 13, R, { f: 1100 + R() * 400, q: 0.8, tau: 0.018, amp: 1 - k * 0.08, attack: 0.006 }); });
def('dog', 0.45, (c, sr, R) => addVoiced(c[0], sr, 0.005, 0.16, R, { f0: 430, f1: 280, formants: [900, 1800], amp: 1, attack: 0.004, release: 0.08, noise: 0.45, q: [2, 3] }), { rate: 22050 });
def('cat', 0.95, (c, sr, R) => addVoiced(c[0], sr, 0.01, 0.85, R, { f0: 520, fMid: 760, f1: 470, formants: [600, 1800], formantsEnd: [700, 1100], amp: 1, attack: 0.07, release: 0.2, noise: 0.06, vib: 0.015, vibRate: 6, q: [3, 5] }), { rate: 22050 });
def('heron', 0.7, (c, sr, R) => addVoiced(c[0], sr, 0.02, 0.55, R, { f0: 360, f1: 230, formants: [900, 1900], amp: 1, attack: 0.02, release: 0.2, noise: 0.5, q: [2, 3] }), { rate: 22050 });
def('seal', 1.6, (c, sr, R) => addVoiced(c[0], sr, 0.03, 1.4, R, { f0: 150, fMid: 205, f1: 120, formants: [450, 1000], formantsEnd: [350, 800], amp: 1, attack: 0.18, release: 0.4, noise: 0.18, vib: 0.03, vibRate: 5, q: [3, 4] }), { rate: 22050 });
for (let v = 0; v < 4; v++) def(`radio_${v}`, 1.6 + v * 0.3, radio, { rate: 22050 });
def('airbrake', 0.9, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { type: 'hp', f: 2500, q: 0.7, tau: 0.25, amp: 0.8, attack: 0.008, len: 0.85 }); addNoiseBurst(c[0], sr, 0, R, { f: 5000, q: 1, tau: 0.2, amp: 0.4, len: 0.85 }); addNoiseBurst(c[0], sr, 0, R, { type: 'lp', f: 500, q: 0.7, tau: 0.06, amp: 0.6 }); });
def('door_hiss', 0.85, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { type: 'hp', f: 3000, q: 0.7, tau: 0.3, amp: 0.6, attack: 0.03, len: 0.6 }); thump(c[0], sr, 0.55, 90, 0.04, 0.8); addNoiseBurst(c[0], sr, 0.55, R, { type: 'lp', f: 700, q: 0.7, tau: 0.03, amp: 0.6 }); });
def('ratchet', 0.5, (c, sr, R) => { let t = 0, g = 0.03; for (let k = 0; k < 8; k++) { click(c[0], sr, R, t, 3300, 0.6); t += g; g *= 1.08; } thump(c[0], sr, t, 150, 0.03, 0.5); });
def('chain', 0.06, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { f: 5000, q: 6, tau: 0.006, amp: 1 }); addNoiseBurst(c[0], sr, 0, R, { type: 'hp', f: 4000, q: 0.7, tau: 0.002, amp: 0.5 }); });
def('creak', 0.4, (c, sr, R) => {
  const d = c[0], f0 = 900 + R() * 500, n = Math.floor(0.35 * sr), bp = bq('bp', f0, 6, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / n; ph += TAU * f0 * (1 + 0.05 * Math.sin(u * 17)) / sr; const stick = 0.5 + 0.5 * Math.sin(TAU * 55 * i / sr); d[i] = bp.run(Math.sin(ph) * stick + (R() - 0.5) * 0.3) * Math.sin(Math.PI * u); }
});
def('hull_slap', 0.4, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { type: 'lp', f: 350, q: 0.7, tau: 0.06, amp: 1, attack: 0.004 }); addNoiseBurst(c[0], sr, 0.01, R, { f: 1500, q: 0.8, tau: 0.09, amp: 0.4, attack: 0.01 }); });
def('thump', 0.35, (c, sr, R) => {
  thump(c[0], sr, 0, 55, 0.08, 1);
  const d = c[0], bp = bq('bp', 1200, 1, sr), n = Math.floor(0.25 * sr);
  for (let i = 0; i < n; i++) d[i] += bp.run(R() * 2 - 1) * 0.3 * Math.exp(-i / (0.1 * sr)) * (0.5 + 0.5 * Math.sin(TAU * 30 * i / sr));
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2500, q: 0.7, tau: 0.004, amp: 0.4 });
});
def('clink', 0.5, (c, sr, R) => { for (const t of [0, 0.07 + R() * 0.03]) addPartials(c[0], sr, t, 3000 + R() * 600, [[1, 1, 0.15], [1.52, 0.6, 0.1], [2.6, 0.35, 0.06]], t ? 0.6 : 1, R); });
def('spray', 1.4, (c, sr, R) => { for (let k = 0; k < 6; k++) click(c[0], sr, R, k * 0.05, 2200 + R() * 800, 0.4); addNoiseBurst(c[0], sr, 0.32, R, { f: 6000, q: 0.7, tau: 0.5, amp: 0.8, attack: 0.03, len: 1.05 }); });
def('cashreg', 0.9, (c, sr, R) => { addNoiseBurst(c[0], sr, 0, R, { f: 2500, q: 1, tau: 0.05, amp: 0.7 }); click(c[0], sr, R, 0.03, 2000, 0.5); addPartials(c[0], sr, 0.08, 2093, [[1, 1, 0.6], [2.4, 0.4, 0.3], [4.1, 0.2, 0.15]], 0.9, R); });
def('rack', 0.55, (c, sr, R) => { click(c[0], sr, R, 0, 1900, 1); thump(c[0], sr, 0, 160, 0.03, 0.6); addNoiseBurst(c[0], sr, 0.08, R, { f: 1500, q: 1.2, tau: 0.04, amp: 0.4, attack: 0.02 }); click(c[0], sr, R, 0.2, 2400, 0.9); });

// Gunshots: a supersonic crack, the chamber's mid-range bark, a chest-deep
// thump and the street throwing it back. Each variant gets its own seed.
function gunshot({ crack = 1, bark = 1, barkF = 1100, low = 1, lowF = 70, tail = 1, tailT = 0.22, mech = 0.4 }) {
  return (chs, sr, R) => {
    const d = chs[0];
    addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 4200, q: 0.7, tau: 0.0025, amp: 1.4 * crack });
    addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2200, q: 0.7, tau: 0.009, amp: 0.9 * crack });
    addNoiseBurst(d, sr, 0.0008, R, { f: barkF * (0.9 + R() * 0.2), q: 0.8, tau: 0.028, amp: 1.2 * bark });
    addNoiseBurst(d, sr, 0.001, R, { type: 'lp', f: 900, q: 0.7, tau: 0.05, amp: 1.1 * low });
    thump(d, sr, 0, lowF * (0.92 + R() * 0.16), 0.08, 1.3 * low);
    addNoiseBurst(d, sr, 0.012, R, { type: 'lp', f: 1600, q: 0.6, tau: tailT, amp: 0.3 * tail, attack: 0.01, len: tailT * 5 });
    if (mech) click(d, sr, R, 0.05 + R() * 0.02, 3200, 0.25 * mech);
  };
}
for (let v = 0; v < 3; v++) def(`gun_pistol_${v}`, 1.0, gunshot({}));
for (let v = 0; v < 3; v++) def(`gun_uzi_${v}`, 0.45, gunshot({ crack: 1.1, bark: 0.8, barkF: 1500, low: 0.55, lowF: 95, tail: 0.5, tailT: 0.08, mech: 0.2 }));
for (let v = 0; v < 2; v++) def(`gun_shotgun_${v}`, 1.5, gunshot({ crack: 0.9, bark: 1.3, barkF: 700, low: 1.6, lowF: 52, tail: 1.6, tailT: 0.32, mech: 0 }));
// slap-back off the facades of a street canyon
def('gun_echo', 1.6, (c, sr, R) => {
  const d = c[0];
  let t = 0.07 + R() * 0.03, a = 0.55;
  for (let k = 0; k < 7; k++) {
    addNoiseBurst(d, sr, t, R, { type: 'lp', f: 2600 - k * 280, q: 0.6, tau: 0.03 + k * 0.012, amp: a, attack: 0.003 });
    thump(d, sr, t, 60, 0.05, a * 0.5);
    t += 0.08 + R() * 0.09;
    a *= 0.62;
  }
  addNoiseBurst(d, sr, 0.1, R, { type: 'lp', f: 700, q: 0.6, tau: 0.4, amp: 0.25, attack: 0.05, len: 1.4 });
}, { rate: 22050 });

// Bullet impacts per surface.
for (let v = 0; v < 3; v++) def(`imp_stone_${v}`, 0.35, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2500, q: 0.7, tau: 0.004, amp: 1 });
  addNoiseBurst(d, sr, 0, R, { f: 1800 + R() * 900, q: 1.2, tau: 0.018, amp: 0.9 });
  thump(d, sr, 0, 140, 0.02, 0.4);
  for (let k = 0; k < 7; k++) addNoiseBurst(d, sr, 0.02 + R() * 0.2, R, { f: 2500 + R() * 3500, q: 3, tau: 0.004, amp: 0.25 + R() * 0.25 });
});
for (let v = 0; v < 3; v++) def(`imp_metal_${v}`, 0.6, (c, sr, R) => {
  const d = c[0], b = 1400 + R() * 1400;
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 3500, q: 0.7, tau: 0.003, amp: 1 });
  addPartials(d, sr, 0.001, b, [[1, 1, 0.12], [2.41, 0.6, 0.08], [3.93, 0.4, 0.05], [5.2, 0.25, 0.03]], 0.8, R);
  thump(d, sr, 0, 180, 0.015, 0.3);
});
def('imp_dirt', 0.3, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 90, 0.03, 0.7);
  addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 1100, q: 0.7, tau: 0.03, amp: 1 });
  for (let k = 0; k < 5; k++) addNoiseBurst(d, sr, 0.03 + R() * 0.15, R, { type: 'lp', f: 1800, q: 0.8, tau: 0.006, amp: 0.3 });
});
def('imp_wood', 0.35, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { f: 650 + R() * 200, q: 5, tau: 0.03, amp: 1.4 });
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2000, q: 0.7, tau: 0.005, amp: 0.8 });
  for (let k = 0; k < 6; k++) addNoiseBurst(d, sr, 0.01 + R() * 0.12, R, { f: 1800 + R() * 2500, q: 4, tau: 0.005, amp: 0.3 });
});
def('imp_water', 0.5, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 1500, q: 0.7, tau: 0.02, amp: 0.7 });
  addTone(d, sr, 0.01, 0.12, R, { f0: 900 + R() * 300, f1: 300, amp: 0.5, attack: 0.003, release: 0.04 });
  for (let k = 0; k < 4; k++) addTone(d, sr, 0.06 + R() * 0.2, 0.05, R, { f0: 600 + R() * 500, f1: 1200, amp: 0.2, attack: 0.003, release: 0.02 });
});

def('prop_wood', 0.6, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { f: 1800, q: 0.8, tau: 0.01, amp: 1 });
  thump(d, sr, 0, 110, 0.05, 0.8);
  addNoiseBurst(d, sr, 0, R, { f: 420, q: 6, tau: 0.07, amp: 1.6 });
  for (let k = 0; k < 9; k++) addNoiseBurst(d, sr, 0.01 + R() * 0.18, R, { f: 1500 + R() * 2500, q: 4, tau: 0.006, amp: 0.3 + R() * 0.3 });
  thump(d, sr, 0.2 + R() * 0.08, 80, 0.06, 0.6);
});
def('prop_metal', 0.9, (c, sr, R) => {
  const d = c[0], b = 280 + R() * 200;
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 2000, q: 0.7, tau: 0.008, amp: 1 });
  addPartials(d, sr, 0, b, [[1, 1, 0.35], [2.32, 0.7, 0.25], [3.9, 0.45, 0.15], [5.6, 0.3, 0.08], [7.1, 0.2, 0.05]], 0.8, R);
  thump(d, sr, 0, 90, 0.06, 0.6);
  const bend = bq('bp', 900, 4, sr), n = Math.floor(0.3 * sr), s0 = Math.floor(0.05 * sr);
  for (let i = 0; i < n && s0 + i < d.length; i++) { if ((i & 31) === 0) bend.set(900 - 500 * i / n, 4); d[s0 + i] += bend.run(R() * 2 - 1) * 0.35 * Math.sin(Math.PI * i / n); }
});
def('prop_plastic', 0.55, (c, sr, R) => {
  const d = c[0];
  let t = 0;
  for (let k = 0; k < 6; k++) { addNoiseBurst(d, sr, t, R, { f: 900 + R() * 900, q: 3, tau: 0.02, amp: 1 - k * 0.12 }); thump(d, sr, t, 200 + R() * 120, 0.015, 0.4); t += 0.04 + R() * 0.07; }
});
def('prop_foliage', 0.9, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { type: 'hp', f: 1800, q: 0.7, tau: 0.25, amp: 0.8, attack: 0.03, len: 0.85 });
  for (let k = 0; k < 5; k++) addNoiseBurst(d, sr, R() * 0.3, R, { f: 2200 + R() * 2000, q: 5, tau: 0.005, amp: 0.6 });
  addNoiseBurst(d, sr, 0.02, R, { f: 1300, q: 1.5, tau: 0.012, amp: 0.8 });
  thump(d, sr, 0.02, 120, 0.03, 0.5);
});
def('tree_fall', 3.6, (c, sr, R) => {
  const d = c[0], n = Math.floor(1.6 * sr), bp = bq('bp', 380, 8, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / n; ph += TAU * (160 + 90 * u) / sr; const stick = (Math.sin(TAU * (18 + u * 30) * i / sr) > 0.2 ? 1 : 0.2); d[i] += bp.run(Math.sin(ph) * stick + (R() - 0.5) * 0.4) * Math.min(1, u * 4) * 0.8; }
  for (let k = 0; k < 14; k++) addNoiseBurst(d, sr, 1.2 + R() * 0.45, R, { f: 1500 + R() * 2500, q: 3, tau: 0.008, amp: 0.4 + R() * 0.5 });
  addNoiseBurst(d, sr, 1.5, R, { type: 'hp', f: 1400, q: 0.7, tau: 0.35, amp: 0.7, attack: 0.05, len: 1.4 });
  thump(d, sr, 1.75, 48, 0.25, 1.4);
  addNoiseBurst(d, sr, 1.75, R, { type: 'lp', f: 400, q: 0.7, tau: 0.3, amp: 1.2 });
}, { rate: 22050 });

// Sheet metal folding: a body thud, a dense burst of buckling clicks that
// thins out, inharmonic panel modes, and a bent-metal groan.
function crunch(chs, sr, R) {
  const d = chs[0];
  thump(d, sr, 0, 70 + R() * 20, 0.09, 1.1);
  addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 900, q: 0.8, tau: 0.07, amp: 1 });
  addNoiseBurst(d, sr, 0, R, { f: 1700, q: 0.9, tau: 0.05, amp: 0.8 });
  let t = 0;
  for (let k = 0; k < 42; k++) {
    t += 0.002 + R() * 0.012 * (1 + k / 14);
    addNoiseBurst(d, sr, t, R, { f: 900 + R() * 3800, q: 2 + R() * 5, tau: 0.003 + R() * 0.008, amp: (0.9 - k / 60) * (0.4 + R() * 0.6) });
  }
  const b = 170 + R() * 160;
  addPartials(d, sr, 0.004, b, [[1, 0.5, 0.22], [2.31, 0.4, 0.16], [3.87, 0.3, 0.11], [5.9, 0.2, 0.07], [8.3, 0.12, 0.05]], 0.6, R);
  const bend = bq('bp', 700, 5, sr), n = Math.floor(0.35 * sr), s0 = Math.floor(0.04 * sr);
  for (let i = 0; i < n && s0 + i < d.length; i++) { if ((i & 31) === 0) bend.set(700 - 380 * i / n, 5); d[s0 + i] += bend.run(R() * 2 - 1) * 0.5 * Math.sin(Math.PI * i / n); }
}
for (let v = 0; v < 3; v++) def(`crunch_${v}`, 0.9, crunch);

// Dutch thumb-bell: a short, bright double "ting-ting"; two clean strikes on the dome,
// each a ringing fundamental with inharmonic metal overtones.
def('bikebell', 0.9, (c, sr, R) => {
  const d = c[0], f = 2900 + R() * 150;
  let t = 0;
  for (let k = 0; k < 2; k++) {
    addPartials(d, sr, t, f, [[1, 1, 0.22], [1.51, 0.4, 0.14], [2.48, 0.3, 0.09], [3.7, 0.15, 0.04]], k ? 0.85 : 1, R);
    addNoiseBurst(d, sr, t, R, { type: 'hp', f: 5000, q: 0.7, tau: 0.002, amp: 0.25 });
    t += 0.17;
  }
});

// Cartoony body squelch: a soft thud, a lowpassed slap, a wobbling downward
// squish and a few bubbly pops. Everything sits under ~2.6 kHz so it stays
// round and wet rather than piercing.
function squelch(chs, sr, R) {
  const d = chs[0];
  thump(d, sr, 0, 62 + R() * 12, 0.07, 1);
  addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 700, q: 0.8, tau: 0.06, amp: 1.1 });
  addNoiseBurst(d, sr, 0.005, R, { f: 1100 + R() * 300, q: 1.2, tau: 0.03, amp: 0.55 });
  const bp = bq('bp', 900, 3, sr), n = Math.floor(0.34 * sr), s0 = Math.floor(0.03 * sr);
  for (let i = 0; i < n && s0 + i < d.length; i++) {
    const u = i / n;
    if ((i & 31) === 0) bp.set(950 - 600 * u + 120 * Math.sin(u * 23), 3);
    const wob = 0.55 + 0.45 * Math.sin(TAU * (14 + 10 * u) * i / sr);
    d[s0 + i] += bp.run(R() * 2 - 1) * 1.1 * wob * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u);
  }
  let t = 0.08;
  for (let k = 0; k < 5; k++) {
    t += 0.03 + R() * 0.07;
    addTone(d, sr, t, 0.05 + R() * 0.03, R, { f0: 520 + R() * 380, f1: 180 + R() * 90, amp: 0.22 + R() * 0.18, attack: 0.003, release: 0.02 });
  }
  const lp = bq('lp', 2600, 0.7, sr);
  for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
}
for (let v = 0; v < 3; v++) def(`squelch_${v}`, 0.75, squelch, { peak: 0.8 });
def('gore_splat', 0.22, (c, sr, R) => {
  const d = c[0];
  thump(d, sr, 0, 110, 0.03, 0.6);
  addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 1100, q: 0.8, tau: 0.035, amp: 1 });
  addTone(d, sr, 0.02, 0.06, R, { f0: 420 + R() * 200, f1: 170, amp: 0.3, attack: 0.003, release: 0.02 });
}, { peak: 0.7 });
// Cartoon "seeing stars" after a knockdown: a little rising-and-falling
// glockenspiel twinkle.
def('dizzy', 0.9, (c, sr, R) => {
  const d = c[0];
  let t = 0;
  for (const f of [1568, 2093, 1760, 2349, 1976]) {
    addPartials(d, sr, t, f * (1 + (R() - 0.5) * 0.02), [[1, 1, 0.16], [2.76, 0.25, 0.05]], 0.5, R);
    t += 0.095;
  }
}, { peak: 0.6 });
def('poof', 0.45, (c, sr, R) => {
  const d = c[0];
  addNoiseBurst(d, sr, 0, R, { type: 'lp', f: 900, q: 0.7, tau: 0.05, amp: 1 });
  addNoiseBurst(d, sr, 0, R, { f: 1400, q: 0.9, tau: 0.08, amp: 0.6, attack: 0.004 });
  thump(d, sr, 0, 150, 0.03, 0.5);
  addTone(d, sr, 0, 0.12, R, { f0: 380, f1: 900, amp: 0.3, attack: 0.004, release: 0.05 });
}, { peak: 0.7 });

export const BUFFER_NAMES = Object.keys(S);

export function variantsOf(prefix) {
  return Object.keys(S).filter((n) => n.startsWith(prefix + '_'));
}

export function renderData(name, ctxRate) {
  const s = S[name];
  if (!s) return null;
  const sr = s.rate || ctxRate;
  const n = Math.floor(s.dur * sr);
  const xf = Math.floor(s.loop * sr);
  const R = mulberry(hash(name));
  let chs = Array.from({ length: s.ch }, () => new Float32Array(n + xf));
  s.gen(chs, sr, R, s.dur);
  if (xf) chs = loopify(chs, n, xf);
  else fadeEdges(chs, sr);
  normalize(chs, s.peak);
  return { sr, chs };
}

// Buffers are rendered in a worker when possible so no frame ever blocks on
// synthesis; get() returns null until a buffer has arrived.
export function createBank(ctx, { sync = false } = {}) {
  const cache = new Map();
  const pending = new Set();
  let worker = null;
  const store = (name, sr, chs) => {
    const buf = ctx.createBuffer(chs.length, chs[0].length, sr);
    chs.forEach((d, i) => buf.getChannelData(i).set(d));
    cache.set(name, buf);
  };
  if (!sync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./dspworker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const { name, sr, chs } = e.data;
        pending.delete(name);
        if (chs) store(name, sr, chs);
      };
      worker.onerror = () => { worker = null; pending.clear(); };
    } catch (e) {
      worker = null;
    }
  }
  const request = (name) => {
    if (cache.has(name) || pending.has(name) || !S[name]) return;
    if (worker) {
      pending.add(name);
      worker.postMessage({ name, rate: ctx.sampleRate });
    } else {
      const r = renderData(name, ctx.sampleRate);
      store(name, r.sr, r.chs);
    }
  };
  return {
    get(name) { const b = cache.get(name); if (b) return b; request(name); return cache.get(name) || null; },
    warm(names) { for (const n of names) request(n); },
    pending() { return pending.size; },
    size() { return cache.size; },
    has(name) { return cache.has(name); },
    close() { if (worker) worker.terminate(); worker = null; },
  };
}

// Stereo impulse response: exponentially decaying decorrelated noise that
// darkens over time, with a few discrete early reflections.
export function buildImpulse(ctx, seconds, { decay = 2.5, early = [], damp = 0.2, seed = 1 } = {}) {
  const sr = ctx.sampleRate, n = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(2, n, sr);
  const R = mulberry(seed);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const k = Math.min(0.95, damp + t * 0.7);
      lp = lp * k + (R() * 2 - 1) * (1 - k);
      d[i] = lp * Math.pow(1 - t, decay) * (1 + k * 2);
    }
    for (const [dt, g] of early) {
      const j = Math.floor(dt * sr * (1 + c * 0.07));
      if (j < n) d[j] += g * (c ? -1 : 1);
    }
    for (let i = 0; i < 64 && i < n; i++) d[i] *= i / 64;
  }
  let e = 0;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) e += d[i] * d[i]; }
  const k = 1 / Math.sqrt(e / 2 + 1e-9) * 0.6;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= k; }
  return buf;
}

// Hooks for sfx/fxbank.js (extra one-shots in their own file): the same
// building blocks and the sample registry. BUFFER_NAMES above is a snapshot;
// bufferNames() sees later registrations too.
export const dspKit = { addNoiseBurst, addPartials, addTone, addVoiced, addDecay, thump, click, bq, hash };
export function defSample(name, dur, gen, o = {}) { def(name, dur, gen, o); }
export function bufferNames() { return Object.keys(S); }
