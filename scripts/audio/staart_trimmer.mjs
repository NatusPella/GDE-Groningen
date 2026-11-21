// Nabewerking voor nieuwe TTS-clips (21-11): knipt een ruis-einde af en geeft een korte fade-out. De eigenaar hoorde in zeven
// Anita- en banterclips een harde burst van ca. 0,2 s (tot -9 dBFS, nulkruising 0,25 tot 0,45) vlak voor het einde, na een stuk
// bijna-stilte dat op de stem volgt (zie scripts/audio/ruisachtig_scan.mjs eindBurst en docs/WITTE-RUIS-21-11.md). De TTS-keten
// (silenceremove op -45 dB) laat zo'n burst staan, want hij is luid. Hier wordt de burst herkend en weggeknipt.
//
//   Puur:  trimRuisEinde(samples, sampleRate) -> { samples, geknipt, burst }   (Float32Array in, Float32Array uit)
//   CLI:   node scripts/audio/staart_trimmer.mjs <in> <uit> [--controle]
//          ffmpeg leest en schrijft (wav of mp3 naar het formaat van <uit>); --controle meldt alleen of er een ruis-einde in zit.
//   Aansluiting in de TTS-scripts: na de post-keten, vóór het wegschrijven van de clip.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eindBurst, EIND } from './ruisachtig_scan.mjs';
import { popBegin } from './pop_begin.mjs';

export const FADE_S = 0.03;     // fade-out op het nieuwe einde
export const NASLEEP_S = 0.04;  // de stem mag zo lang na het laatste stille frame doorklinken

// De stem eindigt waar de stilte voor de burst begint: knip aan het begin van de stilte (plus NASLEEP_S), niet in de stem.
export function trimRuisEinde(x, sr) {
  const e = eindBurst(x, sr);
  if (!e.burst) return { samples: x, geknipt: 0, burst: e };
  const F = Math.floor(sr * EIND.frameS);
  const burstStart = Math.round(e.vanafS / EIND.frameS) * F;
  // terug over de stilte (en de overgangsframes) tot waar de stem ophoudt: het laatste frame boven de stiltegrens voor de burst
  let i = Math.floor(burstStart / F) - 1;
  const grens = 10 ** (EIND.stilteDb / 20);
  const rmsFrame = (k) => { let t = 0; for (let j = 0; j < F; j++) { const v = x[k * F + j]; t += v * v; } return Math.sqrt(t / F); };
  while (i > 0 && rmsFrame(i) < grens) i--;
  const eind = Math.min(burstStart, (i + 1) * F + Math.round(NASLEEP_S * sr));
  const uit = x.slice(0, eind);
  const fade = Math.min(uit.length, Math.round(FADE_S * sr));
  for (let k = 0; k < fade; k++) uit[uit.length - 1 - k] *= k / fade;
  return { samples: uit, geknipt: x.length - uit.length, burst: e };
}

// Het pop-begin: de losse klik op ca. 40 ms (zie pop_begin.mjs) gaat op nul tot net erna, met een korte fade-in op wat volgt.
export const FADE_IN_S = 0.01;
export function trimPopBegin(x, sr) {
  const p = popBegin(x, sr);
  if (!p.pop) return { samples: x, nul: 0, pop: p };
  const tot = Math.min(x.length, Math.round((p.vanMs + 10) / 1000 * sr));   // blok van de klik (5 ms) en de 5 ms erna
  const uit = x.slice();
  uit.fill(0, 0, tot);
  const fade = Math.min(uit.length - tot, Math.round(FADE_IN_S * sr));
  for (let k = 0; k < fade; k++) uit[tot + k] *= k / fade;
  return { samples: uit, nul: tot, pop: p };
}

// Beide nabewerkingen achter elkaar (de volgorde maakt niet uit: de een raakt het begin, de ander het einde)
export function trimClip(x, sr) {
  const a = trimPopBegin(x, sr), b = trimRuisEinde(a.samples, sr);
  return { samples: b.samples, popWeg: a.pop.pop, ruisEindeWeg: b.burst.burst, geknipt: b.geknipt, pop: a.pop, burst: b.burst };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [inn, uit] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const controle = process.argv.includes('--controle');
  if (!inn || (!uit && !controle)) { console.log('gebruik: node scripts/audio/staart_trimmer.mjs <in> <uit> [--controle]'); process.exit(2); }
  const SR = 24000;
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', inn, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4)));
  const r = trimClip(x, SR);
  if (controle) { console.log(`ruis-einde: ${r.burst.burst ? `ja (${r.burst.ms} ms op ${r.burst.vanafS} s, piek ${r.burst.piekDb} dB)` : 'nee'}; pop-begin: ${r.pop.pop ? `ja (${r.pop.piekDb} dB op ${r.pop.vanMs} ms)` : 'nee'}`); process.exit(r.burst.burst || r.pop.pop ? 1 : 0); }
  if (!r.burst.burst && !r.pop.pop) { console.log('geen ruis-einde en geen pop-begin, niets aangepast'); process.exit(0); }
  const codec = /\.mp3$/i.test(uit) ? ['-c:a', 'libmp3lame', '-q:a', '4'] : ['-c:a', 'pcm_s16le'];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0', ...codec, uit], { input: Buffer.from(r.samples.buffer, r.samples.byteOffset, r.samples.byteLength) });
  console.log(`aangepast: ${(r.geknipt / SR * 1000).toFixed(0)} ms ruis-einde weg${r.pop.pop ? ', pop-begin gedempt' : ''}, geschreven naar ${uit}`);
}
