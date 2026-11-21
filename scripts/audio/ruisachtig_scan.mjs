// Scan van alle clips op ruisachtigheid (21-11, melding eigenaar: "soms hoor ik een white noise in game"). Draait zonder Electron:
// ffmpeg decodeert elke clip naar 22,05 kHz mono; per frame van 1024 monsters meten we het niveau, de spectrale vlakheid
// (geometrisch gemiddelde / rekenkundig gemiddelde van het vermogensspectrum: 1 = witte ruis, dichtbij 0 = een toon), de
// nulkruisingsgraad en hoe toonhoogte-achtig het frame is (genormeerde autocorrelatie, 60 tot 500 Hz). Een frame is ruisachtig
// als het hoorbaar is (boven -50 dBFS), vlak (> 0,35) en geen toonhoogte heeft (< 0,35). Een clip scoort het aandeel ruisframes
// van zijn hoorbare frames; spraak heeft er weinig (alleen sissen), een stemclip met veel ruisframes of een ruisstaart is
// verdacht. Opnames die bedoeld ruis zijn (regen, wind, sis) staan in de groep sfx en zijn alleen informatie.
//
//   node scripts/audio/ruisachtig_scan.mjs [--map=a,b] [--max=n] [--top=60] [--paneel]
//   --paneel schrijft docs/WITTE-RUIS-LUISTER.html (audio-tags per verdacht bestand, om te beluisteren) en docs/witte-ruis-scan.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const SR = 22050, N = 1024, HALF = N / 2;
export const GROEPEN = {
  spraak: ['game/audio/voicelines', 'game/audio/npc', 'game/audio/police', 'game/audio/nieuws'],
  sfx: ['game/audio/sfx'],
  muziek: ['game/audio/gmusic', 'game/audio/scenario', 'game/audio/theme'],
};
export const GRENS = { hoorbaarDb: -50, vlak: 0.35, toon: 0.35, spraakAandeel: 0.6, staartFrames: 8 };

// radix-2 FFT in place op re/im (lengte N)
const COS = new Float64Array(HALF), SIN = new Float64Array(HALF), HANN = new Float64Array(N);
for (let i = 0; i < HALF; i++) { COS[i] = Math.cos(2 * Math.PI * i / N); SIN[i] = -Math.sin(2 * Math.PI * i / N); }
for (let i = 0; i < N; i++) HANN[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
const REV = new Uint16Array(N);
for (let i = 0; i < N; i++) { let r = 0, x = i; for (let b = 0; b < 10; b++) { r = (r << 1) | (x & 1); x >>= 1; } REV[i] = r; }
export function fft(re, im) {
  for (let i = 0; i < N; i++) { const j = REV[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1, step = N / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half;
        const tr = re[b] * COS[k] - im[b] * SIN[k], ti = re[b] * SIN[k] + im[b] * COS[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
}

const re = new Float64Array(N), im = new Float64Array(N);
// één frame: { db, vlak, zcr, toon }
export function meetFrame(x, o) {
  let e = 0, zc = 0;
  for (let i = 0; i < N; i++) { const v = x[o + i]; e += v * v; re[i] = v * HANN[i]; im[i] = 0; if (i && (v >= 0) !== (x[o + i - 1] >= 0)) zc++; }
  const rms = Math.sqrt(e / N), db = 20 * Math.log10(rms + 1e-9);
  if (db < GRENS.hoorbaarDb) return { db, vlak: 0, zcr: zc / N, toon: 0 };
  fft(re, im);
  let som = 0, logsom = 0;
  for (let k = 2; k < HALF; k++) { const p = re[k] * re[k] + im[k] * im[k] + 1e-20; som += p; logsom += Math.log(p); }
  const bins = HALF - 2, vlak = Math.exp(logsom / bins) / (som / bins);
  // toonhoogte: genormeerde autocorrelatie, lag 44 (500 Hz) tot 368 (60 Hz)
  let toon = 0;
  if (e > 0) for (let lag = 44; lag <= 368; lag += 2) { let c = 0, e2 = 0; for (let i = 0; i + lag < N; i += 2) { c += x[o + i] * x[o + i + lag]; e2 += x[o + i + lag] * x[o + i + lag]; } const r = c / Math.sqrt(e * e2 + 1e-20) * 1; if (r > toon) toon = r; }
  return { db, vlak, zcr: zc / N, toon };
}
export const isRuisFrame = (f) => f.db >= GRENS.hoorbaarDb && f.vlak > GRENS.vlak && f.toon < GRENS.toon;

// Ruis-einde (21-11, de eigenaar hoorde dit in zes clips): een korte, harde burst (ca. 0,2 s, tot -9 dBFS rms, nulkruising 0,25 tot 0,45)
// vlak voor het einde van het bestand, na een stuk bijna-stilte (onder -45 dB) dat op de stem volgt, en daarna digitale stilte.
// Het is geen sis van een woord: dat staat midden in de stem en wordt niet voorafgegaan door stilte. Gemeten op 20 ms-frames.
export const EIND = { frameS: 0.02, venster: 0.7, burstDb: -25, burstZcr: 0.2, minFrames: 5,   /* harde frames: minFrames - 1 of meer */ stilteDb: -45, minStilte: 3 };
export function eindBurst(x, sr = SR) {
  const F = Math.floor(sr * EIND.frameS), n = Math.floor(x.length / F);
  const db = new Float32Array(n), zcr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let e = 0, z = 0;
    for (let j = 0; j < F; j++) { const v = x[i * F + j]; e += v * v; if (j && (v >= 0) !== (x[i * F + j - 1] >= 0)) z++; }
    db[i] = 20 * Math.log10(Math.sqrt(e / F) + 1e-9); zcr[i] = z / F;
  }
  // het laatste frame dat geen digitale stilte is
  let end = n - 1;
  while (end > 0 && db[end] < -90) end--;
  const start = Math.max(0, n - Math.ceil(EIND.venster / EIND.frameS));
  // de burst: harde, ruisachtig kruisende frames die bij het einde horen (gaten van hooguit 3 frames, ook digitale stilte, mogen)
  let b0 = -1, harde = 0, gat = 0;
  for (let i = end; i >= start; i--) {
    if (db[i] > EIND.burstDb && zcr[i] > EIND.burstZcr) { b0 = i; harde++; gat = 0; }
    else if (b0 === -1 ? end - i > 6 : ++gat > 3) break;
  }
  if (b0 === -1 || harde < EIND.minFrames - 1) return { burst: false, harde, ms: 0 };
  // de stilte voor de burst: maximaal 2 overgangsframes, daarna minstens minStilte frames onder de stiltegrens
  let i = b0 - 1, over = 0;
  while (i >= 0 && over < 2 && db[i] >= EIND.stilteDb) { over++; i--; }
  let stil = 0;
  for (; i >= 0 && db[i] < EIND.stilteDb; i--) stil++;
  const burst = stil >= EIND.minStilte && harde >= EIND.minFrames - 1;
  let piek = -200; for (let k = b0; k <= end; k++) piek = Math.max(piek, db[k]);
  return { burst, harde, stilteFrames: stil, ms: Math.round((end - b0 + 1) * EIND.frameS * 1000), piekDb: +piek.toFixed(1), vanafS: +(b0 * EIND.frameS).toFixed(2) };
}

export function scoreClip(x) {
  let actief = 0, ruis = 0, staart = 0, langste = 0, run = 0;
  const frames = Math.floor(x.length / N);
  const flags = [];
  for (let f = 0; f < frames; f++) {
    const m = meetFrame(x, f * N);
    const act = m.db >= GRENS.hoorbaarDb, r = isRuisFrame(m);
    if (act) actief++;
    if (r) { ruis++; run++; if (run > langste) langste = run; } else run = 0;
    flags.push(r);
  }
  for (let f = frames - 1; f >= 0 && flags[f]; f--) staart++;
  return { frames, actief, aandeel: actief ? ruis / actief : 0, staart, langste, sec: x.length / SR, eind: eindBurst(x) };
}

function* bestanden(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* bestanden(p);
    else if (/\.(mp3|wav|ogg)$/i.test(e.name)) yield p;
  }
}

function decodeer(f) {
  try {
    const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-t', '40', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
    return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4)));
  } catch (e) { return null; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const TOP = Number(arg('top', '60')), MAX = Number(arg('max', '0')) || Infinity;
  const gekozen = arg('map', '') ? { eigen: arg('map', '').split(',') } : GROEPEN;
  const uit = {};
  for (const [groep, dirs] of Object.entries(gekozen)) {
    const lijst = [];
    let k = 0;
    for (const d of dirs) for (const f of bestanden(path.join(ROOT, d))) { if (k++ < MAX) lijst.push(f); }
    lijst.sort((a, b) => /anita/i.test(b) - /anita/i.test(a));   // eerst alle Anita-clips (de bekende fouten zijn vooral Anita)
    const rijen = [];
    for (const f of lijst) {
      const x = decodeer(f);
      if (!x || x.length < N * 4) continue;
      const s = scoreClip(x);
      rijen.push({ f: path.relative(ROOT, f).replace(/\\/g, '/'), ...s });
    }
    // spraak en muziek: verdacht = veel ruisframes of een ruisstaart; sfx: alleen de hoogste scores ter informatie
    // de volledige gerangschikte lijst voor de spraakgroep: eerst de clips met een ruis-einde, dan op aandeel ruisframes (vanaf 8 procent)
    uit[groep + '_lijst'] = rijen.filter((r) => r.eind.burst || r.aandeel >= 0.08).sort((x, y) => (y.eind.burst - x.eind.burst) || y.aandeel - x.aandeel)
      .map((r) => ({ f: r.f, sec: +r.sec.toFixed(2), aandeel: +r.aandeel.toFixed(3), staart: r.staart, eind: r.eind }));
    const verdacht = rijen.filter((r) => (groep === 'sfx' ? r.aandeel > 0.5 : r.aandeel > GRENS.spraakAandeel || r.staart >= GRENS.staartFrames || r.eind.burst)).sort((a, b) => (b.eind.burst - a.eind.burst) || b.aandeel - a.aandeel || b.staart - a.staart);
    // het paneel toont altijd de ruisachtigste clips van de groep, ook als er geen over de grens zijn: dan is dat de lijst om te beluisteren
    const ranglijst = [...rijen].sort((x, y) => (y.aandeel + Math.min(y.staart, 20) / 40) - (x.aandeel + Math.min(x.staart, 20) / 40));
    uit[groep] = { gemeten: rijen.length, verdacht: verdacht.length, top: (verdacht.length >= 10 ? verdacht : ranglijst).slice(0, TOP) };
    console.log(`${groep}: ${rijen.length} clips gemeten, ${verdacht.length} verdacht (aandeel ruisframes > ${GRENS.spraakAandeel} of ruisstaart >= ${GRENS.staartFrames} frames; sfx: > 0,5)`);
    for (const r of uit[groep].top.slice(0, 15)) console.log(`  ${r.f}  aandeel ${r.aandeel.toFixed(2)}, staart ${r.staart}, ${r.sec.toFixed(1)} s`);
  }
  if (process.argv.includes('--paneel')) {
    fs.writeFileSync(path.join(ROOT, 'docs', 'witte-ruis-scan.json'), JSON.stringify(uit, null, 1));
    process.exit(0);   // het luisterpaneel maakt scripts/audio/witte_ruis_rapport.mjs (met de bronnen erbij)
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let h = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Witte ruis: luisterpaneel</title><style>body{font:14px system-ui;max-width:900px;margin:2em auto;padding:0 1em}h2{margin-top:2em}li{margin:.6em 0;list-style:none}audio{display:block;width:100%;margin-top:2px}small{color:#555}</style></head><body>\n<h1>Witte ruis: luisterpaneel</h1>\n<p>Gemaakt met <code>node scripts/audio/ruisachtig_scan.mjs --paneel</code>. Luister of er onverwacht witte ruis (sissen zonder stem of geluid) in zit. Opent vanuit de map docs; de paden verwijzen naar ../game/audio.</p>\n`;
    for (const [groep, d] of Object.entries(uit)) {
      h += `<h2>${esc(groep)} (${d.verdacht} verdacht van ${d.gemeten})</h2><ul>\n`;
      for (const r of d.top) h += `<li>${esc(r.f)} <small>ruisframes ${(r.aandeel * 100).toFixed(0)}%, ruisstaart ${r.staart} frames, ${r.sec.toFixed(1)} s</small><audio controls preload="none" src="../${esc(r.f)}"></audio></li>\n`;
      h += '</ul>\n';
    }
    fs.writeFileSync(path.join(ROOT, 'docs', 'WITTE-RUIS-LUISTER.html'), h + '</body></html>\n');
    console.log('docs/WITTE-RUIS-LUISTER.html en docs/witte-ruis-scan.json geschreven');
  }
}
