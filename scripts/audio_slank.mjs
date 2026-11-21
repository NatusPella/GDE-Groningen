// Pakket slanker (#1070): muziek van 192 naar 128 kbps en de PCM-WAV-barks naar ogg.
//   node scripts/audio_slank.mjs            dry-run: meet en toont de winst, schrijft niets
//   node scripts/audio_slank.mjs --apply    voert het uit (idempotent: wat al klaar is wordt overgeslagen)
// Opties: --kbps=128 (grens en doel voor mp3), --vorbis-q=4 (ogg-kwaliteit voor de barks).
// Regels:
//  - alleen mp3 boven de grens (muziek: gmusic, scenario, theme); stemregels staan al laag en blijven staan
//  - de bestandsnaam en de tags (ID3) blijven; het licentie-manifest (game/audio/sfx/*.json, docs/AUDIO-LICENTIES.md)
//    noemt namen, niet bitrates, en blijft dus kloppen
//  - een nieuwe mp3 wordt alleen gebruikt als hij kleiner is en dezelfde duur heeft (op 0,1 s)
//  - WAV wordt ogg (mono blijft mono); de oude bestandsnaam komt in docs/audio-slank-namen.json als back-up
// Vereist ffmpeg en ffprobe op het pad.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(REPO, 'game', 'audio');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const apply = process.argv.includes('--apply');
const KBPS = +arg('kbps', 128);
const VQ = +arg('vorbis-q', 4);
const MUSIC = /^(gmusic\/[^/]+|scenario\/.+|theme\/.+)\.mp3$/;
const MB = (b) => (b / 1048576).toFixed(1);

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const rel = (f) => path.relative(AUDIO, f).split(path.sep).join('/');
const probe = (f) => {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate,duration:stream=channels,sample_rate', '-of', 'json', f], { encoding: 'utf8' }));
  return { kbps: Math.round(+j.format.bit_rate / 1000), dur: +j.format.duration, ch: j.streams[0].channels, hz: +j.streams[0].sample_rate };
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde_audio_slank_'));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });

const files = walk(AUDIO);
const mp3 = files.filter((f) => MUSIC.test(rel(f)));
const wav = files.filter((f) => f.endsWith('.wav'));

let before = 0, after = 0, done = 0, skipped = 0;
const namen = [];
console.log(`${apply ? 'UITVOEREN' : 'DRY-RUN'}: ${mp3.length} muziekbestanden, ${wav.length} wav-bestanden (doel ${KBPS} kbps, ogg q${VQ})`);

for (const f of mp3) {
  const size = fs.statSync(f).size;
  const p = probe(f);
  if (p.kbps <= KBPS + 8) { skipped++; continue; }
  before += size;
  if (!apply) { after += Math.round(size * KBPS / p.kbps); done++; console.log(`  mp3 ${rel(f)}: ${p.kbps} kbps ${MB(size)} MB -> ca. ${MB(size * KBPS / p.kbps)} MB`); continue; }
  const out = path.join(tmp, 'm.mp3');
  ff(['-i', f, '-vn', '-map_metadata', '0', '-id3v2_version', '3', '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-ar', String(p.hz), out]);
  const ns = fs.statSync(out).size, np = probe(out);
  if (ns >= size || Math.abs(np.dur - p.dur) > 0.1) { console.log(`  mp3 ${rel(f)}: overgeslagen (nieuw ${ns} B, duur ${np.dur} s tegen ${p.dur} s)`); before -= size; skipped++; continue; }
  fs.copyFileSync(out, f);
  after += ns; done++;
  console.log(`  mp3 ${rel(f)}: ${p.kbps} -> ${np.kbps} kbps, ${MB(size)} -> ${MB(ns)} MB`);
}
const mp3Before = before, mp3After = after;

before = 0; after = 0; let wdone = 0;
for (const f of wav) {
  const size = fs.statSync(f).size;
  const dst = f.slice(0, -4) + '.ogg';
  before += size;
  const out = path.join(tmp, 'b.ogg');
  ff(['-i', f, '-vn', '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', String(VQ), out]);
  const ns = fs.statSync(out).size;
  const pw = probe(f), po = probe(out);
  if (Math.abs(pw.dur - po.dur) > 0.1) throw new Error(`${rel(f)}: duur ${pw.dur} s wordt ${po.dur} s`);
  after += ns; wdone++;
  namen.push({ van: 'audio/' + rel(f), naar: 'audio/' + rel(dst), bytesVoor: size, bytesNa: ns });
  if (apply) { fs.copyFileSync(out, dst); fs.unlinkSync(f); }
}
console.log(`mp3: ${done} bestanden, ${skipped} overgeslagen, ${MB(mp3Before)} -> ${MB(mp3After)} MB (${apply ? 'gedaan' : 'schatting'})`);
console.log(`wav: ${wdone} bestanden, ${MB(before)} -> ${MB(after)} MB (${apply ? 'gedaan' : 'gemeten'})`);
console.log(`totaal winst: ${MB(mp3Before - mp3After + before - after)} MB`);
if (apply && namen.length) {
  const f = path.join(REPO, 'docs', 'audio-slank-namen.json');
  const oud = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  fs.writeFileSync(f, JSON.stringify([...oud, ...namen], null, 1) + '\n');
  console.log(`oude namen bewaard in docs/audio-slank-namen.json (${oud.length + namen.length} regels)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
