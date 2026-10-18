// Radio records that are made in the game itself: no samples, no files.
// Each record is pattern data (tempo, key, drum / bass / chord / lead
// patterns, sections) and a seed for the melodies. buildScore() turns it into
// a list of note events, renderTrack() into PCM; audio.js wraps that in a WAV
// blob and plays it like any other G-Music record. Node-safe, no DOM.
//
// Patterns are strings of one char per step (16 per bar in 4/4, 12 in 3/4):
//   drums  '.' rest, 'x' hit, 'X' accent; hats also 'r' = a roll of three
//   bass   space-separated tokens, '.' rest or a scale degree above the
//          chord root of that bar (0 = root, 4 = fifth, 7 = octave)
//   lead   rhythm string; the notes are a seeded walk over the scale
// All acts and titles are made up (Constitution 2).

export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

// layers per section: d drums, b bass, c chords, l lead, k kick (drums
// without it drop out, for breakdowns)
const SEC = (name, bars, layers) => ({ name, bars, layers });

export const SYNTH_TRACKS = [
  {
    id: 'Schaduw_op_de_Ring', title: 'Schaduw op de Ring', artist: 'Lil Gracht', genre: 'donkere drill',
    stations: ['gmusic', 'nachtstreek'], time: 'night', seed: 6601,
    bpm: 140, steps: 16, root: 54, scale: 'minor', prog: [0, 0, 5, 4], glide: true, dark: 1,
    drums: { kick: 'x..x......x..x..', snare: '........x.......', hat: 'x.xrx.xrx.xrx.xr' },
    bass: '0 . . 0 . . . . . . 0 . . 4 . .',
    chords: 'hold', sevenths: false,
    lead: { rhythm: 'x...x.x.........', range: [7, 12], voice: 'bell' },
    sections: [SEC('intro', 4, 'cl'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 16, 'dbc'), SEC('couplet2', 16, 'dbcl'), SEC('einde', 8, 'cl')],
  },
  {
    id: 'Grijs_in_de_Grachten', title: 'Grijs in de Grachten', artist: 'De Grauwe Gevels', genre: 'post-punk',
    stations: ['gmusic'], time: 'night', seed: 6602,
    bpm: 148, steps: 16, root: 52, scale: 'minor', prog: [0, 5, 2, 6], dark: 1,
    drums: { kick: 'x...x...x..xx...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    bass: '0 . 0 . 0 . 0 . 4 . 4 . 3 . 3 .',
    chords: 'stab', sevenths: false,
    lead: { rhythm: 'x.xx.xx.x.xx.xx.', range: [7, 13], voice: 'chorus' },
    sections: [SEC('intro', 4, 'db'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 16, 'dbcl'), SEC('brug', 8, 'bl'), SEC('refrein2', 16, 'dbcl'), SEC('einde', 4, 'db')],
  },
  {
    id: 'Razernij_op_de_Zuidersingel', title: 'Razernij op de Zuidersingel', artist: 'DJ Slagroom', genre: 'hardstyle',
    stations: ['gmusic'], time: 'night', seed: 6603,
    bpm: 150, steps: 16, root: 53, scale: 'minor', prog: [0, 0, 5, 6], dark: 1,
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' },
    bass: '. . 0 . . . 0 . . . 0 . . . 0 .',
    chords: 'hold', sevenths: false,
    lead: { rhythm: 'x..x..x.x..x..x.', range: [7, 14], voice: 'screech' },
    sections: [SEC('intro', 4, 'c'), SEC('opbouw', 8, 'cdl'), SEC('breakdown', 8, 'cl'), SEC('drop', 16, 'dbcl'), SEC('breakdown2', 8, 'cl'), SEC('drop2', 16, 'dbcl'), SEC('einde', 4, 'c')],
  },
  {
    id: 'Nachtrit_naar_Hoogkerk', title: 'Nachtrit naar Hoogkerk', artist: 'Mista Mist', genre: 'phonk',
    stations: ['gmusic', 'nachtstreek'], time: 'night', seed: 6604,
    bpm: 130, steps: 16, root: 49, scale: 'phrygian', prog: [0, 0, 1, 0], dark: 1, drive: 3,
    drums: { kick: 'x.....x...x.....', clap: '........x.......', hat: 'x.x.x.x.x.x.xrx.', cow: 'x..x..x...x.x...' },
    bass: '0 . . . . . 0 . . . 0 . . . . .',
    chords: 'hold', sevenths: false,
    lead: { rhythm: 'x..x..x...x.x...', range: [7, 11], voice: 'cow' },
    sections: [SEC('intro', 4, 'cl'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 16, 'dbcl'), SEC('brug', 8, 'cl'), SEC('couplet2', 16, 'dbcl'), SEC('einde', 4, 'cl')],
  },
  {
    id: 'Tranen_om_de_Wierde', title: 'Tranen om de Wierde', artist: 'Marchien van de Wierde', genre: 'levenslied',
    stations: ['nachtstreek', 'gmusic'], time: 'night', seed: 6605,
    bpm: 84, steps: 12, beats: 3, root: 50, scale: 'minor', prog: [0, 5, 3, 4], dark: 0,
    drums: { kick: 'x...........', brush: '....x...x...' },
    bass: '0 . . . . . 4 . . . . .',
    chords: 'oompah', sevenths: false,
    lead: { rhythm: 'x.....x.x.x.', range: [7, 12], voice: 'accordion' },
    sections: [SEC('intro', 4, 'c'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 8, 'dbcl'), SEC('couplet2', 16, 'dbcl'), SEC('refrein2', 8, 'dbcl'), SEC('einde', 4, 'c')],
  },
  {
    id: 'Fluweel_in_Helpman', title: 'Fluweel in Helpman', artist: 'Velvet Veenkoloniën', genre: 'smooth R&B',
    stations: ['nachtstreek', 'gmusic'], time: 'night', seed: 6606,
    bpm: 88, steps: 16, root: 51, scale: 'major', prog: [1, 4, 0, 5], swing: 0.18, sevenths: true, dark: 0,
    drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    bass: '0 . . . . . 0 . . . 4 . . . . .',
    chords: 'hold',
    lead: { rhythm: 'x.....x...x.....', range: [7, 11], voice: 'rhodes' },
    sections: [SEC('intro', 4, 'c'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 16, 'dbcl'), SEC('brug', 8, 'cb'), SEC('refrein2', 16, 'dbcl'), SEC('einde', 4, 'c')],
  },
  {
    id: 'Vrij_met_een_Ijsje', title: 'Vrij met een Ijsje', artist: 'Zonnige Sanne', genre: 'zomerhit',
    stations: ['gmusic'], time: 'day', seed: 6607,
    bpm: 120, steps: 16, root: 55, scale: 'major', prog: [0, 4, 5, 3], dark: 0,
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' },
    bass: '. . 0 . . . 7 . . . 0 . . . 7 .',
    chords: 'stab', sevenths: false,
    lead: { rhythm: 'x..x..x.x..x....', range: [7, 12], voice: 'pluck' },
    sections: [SEC('intro', 4, 'cl'), SEC('couplet', 16, 'dbcl'), SEC('refrein', 16, 'dbcl'), SEC('brug', 8, 'cl'), SEC('refrein2', 16, 'dbcl'), SEC('einde', 4, 'dc')],
  },
];

// what audio.js and musicpick.js see (same shape as a manifest entry)
export function synthRecords() {
  return SYNTH_TRACKS.map((t) => ({ file: t.id + '.synth', stations: t.stations, time: t.time, artist: t.artist, title: t.title }));
}

function rngFor(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function degreeToMidi(track, deg) {
  const sc = SCALES[track.scale];
  const oct = Math.floor(deg / 7);
  return track.root + sc[((deg % 7) + 7) % 7] + 12 * oct;
}

export function trackDuration(track) {
  const beats = track.beats || 4;
  return track.sections.reduce((a, s) => a + s.bars, 0) * beats * 60 / track.bpm;
}

// Note events: { t, dur, v (voice), midi?, vel, slide? }. Drums carry no midi.
export function buildScore(track) {
  const beats = track.beats || 4;
  const steps = track.steps;
  const stepDur = (beats * 60 / track.bpm) / steps;
  const barDur = stepDur * steps;
  const rng = rngFor(track.seed);
  const bassTok = track.bass.split(/\s+/);
  const rhythm = track.lead.rhythm;
  const [lo, hi] = track.lead.range;
  // four 4-bar phrases; sections replay them in order so a refrein comes back
  const phrases = [];
  for (let p = 0; p < 4; p++) {
    let d = lo + 2 + Math.floor(rng() * 3);
    const notes = [];
    for (let b = 0; b < 4; b++) {
      const bar = [];
      for (let s = 0; s < steps; s++) {
        if (rhythm[s] !== 'x') { bar.push(null); continue; }
        const r = rng();
        d += r < 0.3 ? -1 : r < 0.6 ? 1 : r < 0.75 ? -2 : r < 0.9 ? 2 : 0;
        if (d < lo) d = lo + 1;
        if (d > hi) d = hi - 1;
        bar.push(d);
      }
      notes.push(bar);
    }
    phrases.push(notes);
  }
  const ev = [];
  const push = (e) => ev.push(e);
  let bar = 0;
  let prevSub = null;
  for (const sec of track.sections) {
    const L = sec.layers;
    for (let b = 0; b < sec.bars; b++, bar++) {
      const t0 = bar * barDur;
      const chord = track.prog[bar % track.prog.length];
      const pi = Math.floor(bar / 16) % 4, pb = bar % 4;
      const tri = [chord, chord + 2, chord + 4].concat(track.sevenths ? [chord + 6] : []);
      for (let s = 0; s < steps; s++) {
        const sw = track.swing && s % 2 === 1 ? track.swing * stepDur : 0;
        const t = t0 + s * stepDur + sw;
        if (L.includes('d')) {
          const D = track.drums;
          const hit = (k) => D[k] && D[k][s] && D[k][s] !== '.';
          if (hit('kick')) push({ t, dur: 0.3, v: 'kick', vel: D.kick[s] === 'X' ? 1 : 0.9 });
          if (hit('snare')) push({ t, dur: 0.2, v: 'snare', vel: 0.8 });
          if (hit('clap')) push({ t, dur: 0.2, v: 'clap', vel: 0.75 });
          if (hit('brush')) push({ t, dur: 0.2, v: 'brush', vel: 0.5 });
          if (hit('cow')) push({ t, dur: 0.15, v: 'cowdrum', vel: 0.5 });
          if (hit('hat')) {
            if (D.hat[s] === 'r') for (let r = 0; r < 3; r++) push({ t: t + r * stepDur / 3, dur: 0.05, v: 'hat', vel: 0.35 + 0.1 * r });
            else push({ t, dur: 0.06, v: 'hat', vel: D.hat[s] === 'X' ? 0.6 : 0.4 });
          }
        }
        if (L.includes('b') && bassTok[s] && bassTok[s] !== '.') {
          const deg = chord + Number(bassTok[s]);
          const midi = degreeToMidi(track, deg) - 24;
          let n = s + 1;
          while (n < steps && (!bassTok[n] || bassTok[n] === '.')) n++;
          const e = { t, dur: Math.min((n - s) * stepDur, track.glide ? 0.9 : 0.5), v: track.glide || track.drive ? 'sub' : 'bass', midi, vel: 0.9 };
          if (track.glide && prevSub !== null) e.slide = prevSub;
          prevSub = midi;
          push(e);
        }
        if (L.includes('c')) {
          const style = track.chords;
          const beatStep = steps / beats;
          if (style === 'hold' && s === 0) for (const d of tri) push({ t, dur: barDur * 0.98, v: 'pad', midi: degreeToMidi(track, d), vel: 0.35 });
          if (style === 'stab' && s % (steps / 4) === 0 && (steps === 16 ? s % 8 === 0 || s === 6 || s === 14 : true)) for (const d of tri) push({ t, dur: stepDur * 2.5, v: 'stab', midi: degreeToMidi(track, d), vel: 0.3 });
          if (style === 'oompah' && s % beatStep === 0 && s > 0) for (const d of tri) push({ t, dur: beatStep * stepDur * 0.9, v: 'accordion', midi: degreeToMidi(track, d), vel: 0.38 });
        }
        if (L.includes('l') && rhythm[s] === 'x') {
          const deg = phrases[pi][pb][s];
          let n = s + 1;
          while (n < steps && rhythm[n] !== 'x') n++;
          push({ t, dur: Math.min((n - s) * stepDur * 0.95, 1.2), v: track.lead.voice, midi: degreeToMidi(track, deg), vel: 0.5 });
        }
      }
    }
  }
  return { events: ev, duration: bar * barDur, bars: bar, stepDur };
}

// --- voices (sample level) ---------------------------------------------------------------
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function noiseSource(seed) {
  const r = rngFor(seed);
  return () => r() * 2 - 1;
}

// filtered oscillator with an attack / release envelope
function tone(buf, sr, t, dur, midi, o) {
  const i0 = Math.floor(t * sr);
  const rel = o.release === undefined ? 0.08 : o.release;
  const n = Math.min(buf.length - i0, Math.floor((dur + rel) * sr));
  if (n <= 0) return;
  const f = mtof(midi);
  const dets = o.det || [0];
  const ph = dets.map((_, k) => (k * 0.37) % 1);
  const fs = dets.map((d) => f * Math.pow(2, d / 1200));
  const a = o.attack === undefined ? 0.005 : o.attack;
  const k = 1 - Math.exp(-TAU * (o.lp || 4000) / sr);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    let env = tt < a ? tt / a : 1;
    if (o.decay) env *= Math.exp(-tt * o.decay);
    if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / rel);
    let x = 0;
    for (let j = 0; j < dets.length; j++) {
      const fj = fs[j] * (o.vib ? 1 + o.vib * Math.sin(TAU * 5.2 * tt) : 1);
      ph[j] = (ph[j] + fj / sr) % 1;
      const p = ph[j];
      const w = o.wave === 'square' ? (p < 0.5 ? 1 : -1) : o.wave === 'sine' ? Math.sin(TAU * p)
        : o.wave === 'fm' ? Math.sin(TAU * p + (o.fm || 2) * Math.exp(-tt * 6) * Math.sin(TAU * p * 2))
          : 2 * p - 1;
      x += w;
    }
    x /= dets.length;
    y += k * (x - y);
    buf[i0 + i] += (o.lp ? y : x) * env * o.gain;
  }
}

function sub(buf, sr, t, dur, midi, o) {
  const i0 = Math.floor(t * sr);
  const n = Math.min(buf.length - i0, Math.floor((dur + 0.05) * sr));
  const f = mtof(midi), f0 = o.slide !== undefined ? mtof(o.slide) : f;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    const fr = f + (f0 - f) * Math.exp(-tt * 18);
    ph = (ph + fr / sr) % 1;
    let env = Math.min(1, tt / 0.004) * Math.exp(-tt * (o.decay || 1.6));
    if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / 0.05);
    buf[i0 + i] += Math.tanh(Math.sin(TAU * ph) * (o.drive || 1.6)) * env * o.gain;
  }
}

function kick(buf, sr, t, o) {
  const i0 = Math.floor(t * sr);
  const len = o.len || 0.28;
  const n = Math.min(buf.length - i0, Math.floor(len * sr));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    ph += (o.f1 + (o.f0 - o.f1) * Math.exp(-tt * o.sweep)) / sr;
    const env = Math.min(1, tt / 0.002) * Math.exp(-tt * o.decay);
    buf[i0 + i] += Math.tanh(Math.sin(TAU * ph) * o.drive) * env * o.gain;
  }
}

function noiseHit(buf, sr, t, o, nz) {
  const i0 = Math.floor(t * sr);
  const n = Math.min(buf.length - i0, Math.floor(o.len * sr));
  let lp = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    const x = nz();
    lp += (o.hp ? 0.6 : 0.25) * (x - lp);
    let s = o.hp ? x - lp : lp;
    if (o.body) { ph += o.body / sr; s += Math.sin(TAU * ph) * o.bodyGain * Math.exp(-tt * 30); }
    buf[i0 + i] += s * Math.exp(-tt * o.decay) * o.gain;
  }
}

function cowbell(buf, sr, t, dur, midi, gain) {
  const i0 = Math.floor(t * sr);
  const n = Math.min(buf.length - i0, Math.floor(Math.max(dur, 0.25) * sr));
  const f = mtof(midi);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    p1 = (p1 + f / sr) % 1; p2 = (p2 + f * 1.48 / sr) % 1;
    const x = (p1 < 0.5 ? 1 : -1) + (p2 < 0.5 ? 1 : -1);
    buf[i0 + i] += x * 0.5 * Math.exp(-tt * 14) * gain;
  }
}

const voiceOf = {
  bell: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi + 12, { wave: 'fm', fm: 1.5, decay: 3, release: 0.4, gain: 0.2, lp: 5000 }),
  chorus: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', det: [-12, 9], lp: 2600, release: 0.12, gain: 0.17 }),
  screech: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', det: [-25, 0, 25], lp: 5200, release: 0.05, gain: 0.14, vib: 0.004 }),
  cow: (b, sr, e) => cowbell(b, sr, e.t, e.dur, e.midi + 24, 0.14),
  accordion: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', det: [-8, 8], lp: 1700, attack: 0.04, release: 0.1, gain: e.v === 'accordion' ? 0.14 : 0.17, vib: 0.003 }),
  rhodes: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'fm', fm: 1.2, decay: 1.5, release: 0.3, gain: 0.22, lp: 3200 }),
  pluck: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', det: [-6, 6], decay: 7, lp: 4200, release: 0.05, gain: 0.2 }),
  pad: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', det: [-9, 9], lp: 900, attack: 0.15, release: 0.25, gain: 0.07 }),
  stab: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'square', det: [-7, 7], lp: 1800, decay: 4, release: 0.05, gain: 0.07 }),
  bass: (b, sr, e) => tone(b, sr, e.t, e.dur, e.midi, { wave: 'saw', lp: 700, release: 0.05, gain: 0.3 }),
};

export function renderTrack(track, sr = 22050) {
  const score = buildScore(track);
  const buf = new Float32Array(Math.ceil((score.duration + 1.5) * sr));
  const nz = noiseSource(track.seed ^ 0x9e3779b9);
  const hard = track.genre === 'hardstyle';
  for (const e of score.events) {
    const g = e.vel;
    switch (e.v) {
      case 'kick': kick(buf, sr, e.t, hard ? { f0: 220, f1: 52, sweep: 14, decay: 5, drive: 4, len: 0.4, gain: 0.8 * g } : { f0: 150, f1: 48, sweep: 28, decay: 9, drive: 1.8, len: 0.28, gain: 0.8 * g }); break;
      case 'snare': noiseHit(buf, sr, e.t, { len: 0.2, decay: 18, hp: false, gain: 0.35 * g, body: 190, bodyGain: 0.3 }, nz); break;
      case 'clap': noiseHit(buf, sr, e.t, { len: 0.18, decay: 22, hp: true, gain: 0.45 * g }, nz); break;
      case 'brush': noiseHit(buf, sr, e.t, { len: 0.16, decay: 16, hp: true, gain: 0.2 * g }, nz); break;
      case 'hat': noiseHit(buf, sr, e.t, { len: 0.06, decay: 70, hp: true, gain: 0.3 * g }, nz); break;
      case 'cowdrum': cowbell(buf, sr, e.t, 0.2, 80, 0.08); break;
      case 'sub': sub(buf, sr, e.t, e.dur, e.midi, { slide: e.slide, gain: 0.55 * g, drive: track.drive || 1.6, decay: track.genre === 'hardstyle' ? 0.5 : 1.6 }); break;
      default: if (voiceOf[e.v]) voiceOf[e.v](buf, sr, e); break;
    }
  }
  // master: soft clip, normalise, short fades
  let peak = 0;
  for (let i = 0; i < buf.length; i++) { buf[i] = Math.tanh(buf[i] * 1.2); const a = Math.abs(buf[i]); if (a > peak) peak = a; }
  const norm = peak > 0 ? 0.89 / peak : 1;
  const fi = Math.floor(0.005 * sr), fo = Math.floor(1.2 * sr);
  for (let i = 0; i < buf.length; i++) {
    let g = norm;
    if (i < fi) g *= i / fi;
    const left = buf.length - i;
    if (left < fo) g *= left / fo;
    buf[i] *= g;
  }
  return buf;
}

// 16 bit mono WAV bytes
export function toWav(samples, sr = 22050) {
  const n = samples.length;
  const out = new Uint8Array(44 + n * 2);
  const dv = new DataView(out.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return out;
}
