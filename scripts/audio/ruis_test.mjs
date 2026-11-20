// Audio-regressietest voor glitches en ruis (21-11, Nikky: "audio glitches, soms een ruisgeluid"). Draait zonder Electron en
// zonder audio-uitvoer; er wordt niets beluisterd, alleen gemeten. Drie lagen:
//
//  A. alle opnames in game/audio/sfx/manifest.json (ffmpeg decodeert naar 48 kHz, zoals de browser doet): piek (na het
//     spelniveau uit SAMPLE_INFO), niet-eindigheid, gelijkspanning (DC), lange stilte in een lus, en de lusnaad (laatste
//     naar eerste monster) en een harde start of stop bij een eenmalige klank (een tik).
//  B. alle procedurele buffers (sfx/dsp.js) en de motor- en wegsynth (sfx/engineworklet.js) op 44,1, 48 en 96 kHz:
//     dezelfde controles, plus een sprongcontrole (grootste monsterverschil) voor knallen in de synth.
//  C. de pure delen van game/js/audiodiag.js (glitchdetector, veiligParam, latencykeuze, tekstblok).
//
//   node scripts/audio/ruis_test.mjs [--tabel]     (--tabel: print ook de piekentabel van de opnames)
// Zonder ffmpeg wordt laag A overgeslagen (met melding). Uitgang 1 bij de eerste fout.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SFX = path.join(ROOT, 'game', 'audio', 'sfx');
const TABEL = process.argv.includes('--tabel');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const db = (x) => 20 * Math.log10(x + 1e-9);

// Drempels. De piek is vóór het afspeelniveau: een opname mag tot +1 dBFS (Vorbis-overshoot), maar piek x spelniveau blijft onder 1.
export const GRENS = { piekTimesGain: 1.0, rawPiekDb: 1.0, dc: 0.01, lusSprong: 0.03, lusSprongRatio: 10, startStop: 0.05, stilteDb: -60, synthPiek: 1.0, synthSprong: 0.5 };

export function meet(x) {
  let pk = 0, nan = 0, som = 0, e = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (!Number.isFinite(v)) { nan++; continue; }
    if (Math.abs(v) > pk) pk = Math.abs(v);
    som += v; e += v * v;
  }
  return { pk, nan, dc: som / x.length, rms: Math.sqrt(e / x.length) };
}
// de lusnaad: sprong tussen laatste en eerste monster, naast het gemiddelde verschil van twee buurmonsters
export function naad(x, a = 0, b = x.length - 1) {
  let st = 0, c = 0;
  for (let i = a + 1; i < Math.min(x.length, a + 4800); i++) { st += Math.abs(x[i] - x[i - 1]); c++; }
  st /= Math.max(1, c);
  const j = Math.abs(x[a] - x[b]);
  return { jump: j, ratio: j / (st + 1e-6) };
}
export function maxSprong(x) {
  let m = 0;
  for (let i = 1; i < x.length; i++) { const d = Math.abs(x[i] - x[i - 1]); if (d > m) m = d; }
  return m;
}

// --- A. de opnames ------------------------------------------------------------------------------------
async function opnames() {
  let hasFfmpeg = true;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch (e) { hasFfmpeg = false; }
  if (!hasFfmpeg) { console.log('ruis_test: ffmpeg ontbreekt, laag A (opnames) overgeslagen'); return; }
  const { SAMPLE_INFO } = await import('../../game/js/sfx/samples.js');
  const man = JSON.parse(fs.readFileSync(path.join(SFX, 'manifest.json'), 'utf8')).geluiden;
  const rows = [];
  for (const [k, m] of Object.entries(man)) {
    const f = path.join(SFX, m.bestand);
    const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
    const q = meet(x);
    const gain = (SAMPLE_INFO[k] && SAMPLE_INFO[k].gain) || 1;
    rows.push({ k, loop: !!m.loop, pk: +db(q.pk).toFixed(1), rms: +db(q.rms).toFixed(1), gain });
    ok(x.length > 480, `${k}: niet leeg`);
    ok(q.nan === 0, `${k}: geen NaN`);
    ok(db(q.pk) <= GRENS.rawPiekDb, `${k}: piek ${db(q.pk).toFixed(1)} dBFS is hoogstens +1`);
    ok(q.pk * gain <= GRENS.piekTimesGain, `${k}: piek x spelniveau ${(q.pk * gain).toFixed(2)} blijft onder 1`);
    ok(Math.abs(q.dc) <= GRENS.dc, `${k}: gelijkspanning ${q.dc.toFixed(4)}`);
    if (m.loop) {
      ok(db(q.rms) > GRENS.stilteDb, `${k}: een lus is niet stil (${db(q.rms).toFixed(1)} dB)`);
      const nd = naad(x);
      ok(nd.jump <= GRENS.lusSprong || nd.ratio <= GRENS.lusSprongRatio, `${k}: lusnaad klikt niet (sprong ${nd.jump.toFixed(3)}, ${nd.ratio.toFixed(1)}x een gewone stap)`);
    } else {
      ok(Math.abs(x[0]) <= GRENS.startStop && Math.abs(x[x.length - 1]) <= GRENS.startStop, `${k}: begint en eindigt zonder tik (${x[0].toFixed(3)} / ${x[x.length - 1].toFixed(3)})`);
    }
    // de bandenpiep speelt zijn midden als lus (audio.js startSquealSample: loopStart 0.25 s, loopEnd duur - 0.2 s)
    if (k === 'band_piep_bocht') {
      const d = x.length / 48000, ls = Math.floor(Math.min(0.25, d * 0.2) * 48000), le = Math.floor(Math.max(Math.min(0.25, d * 0.2) + 0.3, d - 0.2) * 48000);
      const nd = naad(x, ls, le);
      ok(nd.jump <= 0.1, `${k}: binnenlus (${ls}..${le}) klikt niet, sprong ${nd.jump.toFixed(3)}`);
    }
  }
  if (TABEL) { rows.sort((a, b) => b.pk - a.pk); console.table(rows.slice(0, 15)); }
  console.log(`ruis_test A: ${rows.length} opnames gemeten (hoogste piek ${rows.reduce((m, r) => Math.max(m, r.pk), -99)} dBFS)`);
}

// --- B. de procedurele bronnen -------------------------------------------------------------------------------
async function procedureel() {
  const dsp = await import('../../game/js/sfx/dsp.js');
  let lopen = 0;
  for (const rate of [44100, 48000, 96000]) {
    for (const name of dsp.bufferNames()) {
      const r = dsp.renderData(name, rate);
      if (!r) continue;
      lopen++;
      for (let c = 0; c < r.chs.length; c++) {
        const x = r.chs[c], q = meet(x);
        const tag = `${name}@${rate}`;
        ok(q.nan === 0, `${tag}: geen NaN`);
        ok(q.pk <= GRENS.synthPiek, `${tag}: piek ${q.pk.toFixed(3)} knipt niet`);
        ok(Math.abs(q.dc) <= GRENS.dc, `${tag}: gelijkspanning ${q.dc.toFixed(4)}`);
        const nd = naad(x);
        ok(nd.jump <= GRENS.lusSprong || nd.ratio <= GRENS.lusSprongRatio, `${tag}: begin en eind sluiten aan (sprong ${nd.jump.toFixed(3)}, ${nd.ratio.toFixed(1)}x een gewone stap)`);
      }
    }
  }
  console.log(`ruis_test B1: ${lopen} procedurele buffers gerenderd (3 samplefrequenties)`);
}

async function motor() {
  const reg = {};
  let cur = 0;
  globalThis.AudioWorkletProcessor = class { constructor() { this.port = { onmessage: null, postMessage() {} }; } };
  globalThis.registerProcessor = (name, cls) => { reg[name] = cls; };
  Object.defineProperty(globalThis, 'currentTime', { get: () => cur, configurable: true });
  const { PROFILE_COUNT } = { PROFILE_COUNT: 13 };
  let blokken = 0;
  for (const rate of [44100, 48000, 96000]) {
    globalThis.sampleRate = rate;
    await import(`../../game/js/sfx/engineworklet.js?r=${rate}`);
    const Proc = reg['gde-engine'];
    for (let kind = 0; kind < PROFILE_COUNT; kind++) {
      const p = new Proc({ processorOptions: { voices: 1, road: false, stereo: true, running: true } });
      const L = new Float32Array(128), R = new Float32Array(128);
      const blok = (up) => { p.onMsg({ type: 'p', v: [up] }); p.process([], [[L, R]]); blokken++; return [L, R]; };
      const seconds = 7;
      const total = Math.floor(seconds * rate / 128);
      const all = [new Float32Array(total * 128), new Float32Array(total * 128)];
      for (let b = 0; b < total; b++) {
        const t = b * 128 / rate;
        // 0-2 s stationair, 2-5 s gas van laag naar hoog en terug, 5-7 s gas los en uitfaden
        let rpm = 800, load = 0.2, gain = 1;
        const spec = { idle: [800, 850, 600, 1700, 900, 750, 750, 2400, 1300, 1200, 1000, 1800, 900][kind], red: [6200, 6200, 2300, 8000, 5500, 7000, 4300, 48000, 13000, 10000, 7500, 12000, 7500][kind] };
        rpm = spec.idle;
        if (t >= 2 && t < 5) { const k = (t - 2) / 3; rpm = spec.idle + (spec.red - spec.idle) * (k < 0.5 ? k * 2 : 2 - k * 2); load = k < 0.5 ? k * 2 : 1; }
        if (t >= 5) { rpm = spec.idle; load = 0; gain = Math.max(0, 1 - (t - 5) / 1.5); }
        cur = t;
        const [l, r] = blok({ i: 0, kind, rpm, load, gain, pitch: 1, muffle: 20000 });
        all[0].set(l, b * 128); all[1].set(r, b * 128);
      }
      for (let c = 0; c < 2; c++) {
        const q = meet(all[c]), tag = `motor ${kind}@${rate} kanaal ${c}`;
        ok(q.nan === 0, `${tag}: geen NaN`);
        ok(q.pk <= GRENS.synthPiek, `${tag}: piek ${q.pk.toFixed(3)} knipt niet`);
        ok(Math.abs(q.dc) <= GRENS.dc, `${tag}: gelijkspanning ${q.dc.toFixed(4)}`);
        ok(maxSprong(all[c]) <= GRENS.synthSprong, `${tag}: geen tik (grootste sprong ${maxSprong(all[c]).toFixed(3)})`);
      }
    }
    // het wegruis (banden, wind, water), een oneindig aanhoudende ruisbron: snelheid, ondergrond en nat
    for (const surface of [0, 1, 2]) for (const wet of [0, 1]) for (const water of [0, 1]) {
      const p = new Proc({ processorOptions: { voices: 0, road: true, stereo: false } });
      const out = new Float32Array(128);
      const total = Math.floor(6 * rate / 128), all = new Float32Array(total * 128);
      for (let b = 0; b < total; b++) {
        const t = b * 128 / rate;
        cur = t;
        p.onMsg({ type: 'p', v: [], road: { speed: Math.min(45, t * 9), surface, wet, wind: 1, gain: 1, free: 0, small: 0, water } });
        p.process([], [out]);
        all.set(out, b * 128);
        blokken++;
      }
      const q = meet(all), tag = `weg surface ${surface} nat ${wet} water ${water}@${rate}`;
      ok(q.nan === 0, `${tag}: geen NaN`);
      ok(q.pk <= GRENS.synthPiek, `${tag}: piek ${q.pk.toFixed(3)} knipt niet`);
      ok(Math.abs(q.dc) <= GRENS.dc, `${tag}: gelijkspanning ${q.dc.toFixed(4)}`);
      ok(maxSprong(all) <= GRENS.synthSprong, `${tag}: geen tik (grootste sprong ${maxSprong(all).toFixed(3)})`);
    }
    // NaN in een doelwaarde (assignFinite) mag de stem niet vergiftigen
    const p = new Proc({ processorOptions: { voices: 1, road: true, stereo: true, running: true } });
    const L = new Float32Array(128), R = new Float32Array(128), W = new Float32Array(128);
    p.onMsg({ type: 'p', v: [{ i: 0, kind: 0, rpm: NaN, load: Infinity, gain: 1, pitch: NaN, muffle: NaN }], road: { speed: NaN, gain: NaN } });
    let nan = 0;
    for (let b = 0; b < 200; b++) { p.process([], [[L, R], [W]]); nan += meet(L).nan + meet(R).nan + meet(W).nan; }
    ok(nan === 0, `motor en weg: NaN-doelwaarden vergiftigen de stem niet@${rate}`);
  }
  console.log(`ruis_test B2: ${blokken} blokken van de motor- en wegsynth gerenderd`);
}

// --- C. audiodiag.js ----------------------------------------------------------------------------------
async function diag() {
  const D = await import('../../game/js/audiodiag.js');
  // een hoofdthreadstall van 300 ms: de audioklok loopt gewoon mee (wordt achteraf gelezen): geen glitch
  { let now = 0, audio = 0;
    const d = D.createGlitchDetector({ now: () => now, audio: () => audio });
    d.tick();
    for (let i = 0; i < 10; i++) { now += 16; audio += 0.016; d.tick(); }
    now += 300; audio += 0.3; d.tick();
    ok(d.total() === 0, 'diag: een hoofdthreadstall met een meelopende audioklok is geen glitch'); }
  // de audioklok staat 120 ms stil terwijl de werkelijke tijd doorloopt: een underrun
  { let now = 0, audio = 0;
    const d = D.createGlitchDetector({ now: () => now, audio: () => audio });
    d.tick();
    now += 16; audio += 0.016; d.tick();
    now += 150; audio += 0.03; d.tick();
    ok(d.total() === 1 && d.worst() > 100, 'diag: een achterblijvende audioklok telt als glitch', `${d.total()} ${d.worst()}`);
    ok(d.perMinute() === 1, 'diag: een glitch staat in de laatste minuut');
    now += 61000; audio += 61;
    ok(d.perMinute() === 0, 'diag: na een minuut is de glitch uit het venster'); }
  // een gepauzeerde of verborgen context telt niet, ook niet bij het hervatten
  { let now = 0, audio = 0, run = true;
    const d = D.createGlitchDetector({ now: () => now, audio: () => audio, running: () => run });
    d.tick(); run = false; now += 2000; d.tick(); run = true; now += 16; audio += 0.016; d.tick();
    ok(d.total() === 0, 'diag: gepauzeerd is geen glitch'); }
  // sprong van meer dan 5 s (slaapstand) telt niet
  { let now = 0, audio = 0;
    const d = D.createGlitchDetector({ now: () => now, audio: () => audio });
    d.tick(); now += 20000; d.tick();
    ok(d.total() === 0, 'diag: een sprong van 20 s (slaapstand) is geen glitch'); }
  ok(D.veiligWaarde(NaN, 0.5) === 0.5, 'veiligWaarde: NaN wordt de terugvalwaarde');
  ok(D.veiligWaarde(Infinity, undefined) === null, 'veiligWaarde: zonder terugval wordt het overgeslagen');
  ok(D.veiligWaarde(0.25, 1) === 0.25, 'veiligWaarde: een eindige waarde blijft');
  { const calls = [];
    const param = { set value(v) { calls.push(['value', v]); }, setTargetAtTime(v, t, tau) { calls.push(['tau', v, t, tau]); } };
    ok(D.veiligParam(param, NaN, 0.1) && calls[0][1] === 0.1, 'veiligParam: NaN schrijft de terugval');
    ok(D.veiligParam(param, 0.3, 0, 1, 0.05) && calls[1][0] === 'tau', 'veiligParam: met tau via setTargetAtTime');
    ok(!D.veiligParam(param, NaN, NaN) && calls.length === 2, 'veiligParam: NaN zonder terugval schrijft niets');
    ok(D.guardStand().gevangen >= 2, 'veiligParam: de gevangen waarden zijn geteld'); }
  ok(D.kiesLatencyHint(null) === 'balanced', 'latencyHint: standaard balanced');
  ok(D.kiesLatencyHint({ perMin: 2 }) === 'balanced', 'latencyHint: weinig glitches blijft balanced');
  ok(D.kiesLatencyHint({ perMin: 9 }) === 'playback', 'latencyHint: veel glitches kiest playback');
  const m = D.meetBlok(Float32Array.from([0.5, -1, NaN, 0.25]));
  ok(m.piek === 1 && m.nan === 1, 'meetBlok: piek en NaN');
  const t = D.formatAudioBlok({ ctx: 'running', sampleRate: 48000, baseLatency: 0.01, outputLatency: 0.03, latencyHint: 'balanced', channels: 2, voices: 3, master: 0.55, limiter: { reduction: -0.5 },
    glitchesPerMin: 0, glitchesTotaal: 0, glitchWorst: 0, clips: 0, ingrepen: 0, nans: 0, guard: { gevangen: 0, laatste: null }, notes: [] });
  ok(/\[Geluid\]/.test(t) && /Samplefrequentie: 48000 Hz/.test(t) && /Glitches/.test(t), 'formatAudioBlok: bevat de kernregels');
  ok(/nog niet gemaakt/.test(D.formatAudioBlok({ ctx: null })), 'formatAudioBlok: zonder context');
  console.log('ruis_test C: audiodiag klaar');
}

await opnames();
await procedureel();
await motor();
await diag();
console.log(`ruis_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
