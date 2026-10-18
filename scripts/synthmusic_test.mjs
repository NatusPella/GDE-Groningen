// Checks the pattern data of the radio's self-made records (game/js/synthmusic.js):
// tempo, key, length, no silence, deterministic, made-up names, Dutch.
//   node scripts/synthmusic_test.mjs
import * as S from '../game/js/synthmusic.js';
import * as M from '../game/js/musicpick.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const TEMPO = { 'donkere drill': [138, 146], 'post-punk': [130, 165], hardstyle: [145, 155], phonk: [120, 145], levenslied: [70, 100], 'smooth R&B': [70, 100], zomerhit: [110, 130] };
// real names that must never show up (Constitution 2)
const BANNED = /(drake|kanye|eminem|spotify|youtube|tiktok|joy division|the cure|headhunterz|andr[eé] hazes|frans bauer|ed sheeran|beyonc)/i;
const ids = new Set();
const SR = 11025;

ok(S.SYNTH_TRACKS.length >= 7, 'at least seven records');
ok(new Set(S.SYNTH_TRACKS.map((t) => t.genre)).size === Object.keys(TEMPO).length, 'one record per genre');

for (const t of S.SYNTH_TRACKS) {
  const tag = t.id;
  ok(!ids.has(t.id), `${tag}: unique id`); ids.add(t.id);
  ok(/^[A-Za-z0-9_]+$/.test(t.id) && t.id.replace(/_/g, ' ') === t.title.replace(/[^A-Za-z0-9 ]/g, ''), `${tag}: id follows the title`);
  ok(!BANNED.test(t.title + t.artist), `${tag}: made-up names`);
  ok(TEMPO[t.genre] && t.bpm >= TEMPO[t.genre][0] && t.bpm <= TEMPO[t.genre][1], `${tag}: tempo ${t.bpm} for ${t.genre}`);
  ok(S.SCALES[t.scale] && t.root >= 40 && t.root <= 64, `${tag}: key`);
  ok(Number.isInteger(t.seed), `${tag}: seed`);
  const steps = t.steps, beats = t.beats || 4;
  ok(steps === beats * 4, `${tag}: steps per bar`);
  for (const [k, p] of Object.entries(t.drums)) ok(p.length === steps && /^[.xXr]+$/.test(p), `${tag}: drum pattern ${k}`);
  ok(t.bass.split(/\s+/).length === steps, `${tag}: bass pattern length`);
  ok(t.lead.rhythm.length === steps && t.lead.range[0] < t.lead.range[1], `${tag}: lead pattern`);
  ok(t.prog.length >= 2 && t.prog.every((d) => d >= 0 && d < 7), `${tag}: progression`);
  ok(t.stations.every((s) => M.MUSIC_STATIONS.includes(s)) && ['any', 'day', 'night'].includes(t.time), `${tag}: station and time`);

  const dur = S.trackDuration(t);
  ok(dur >= 95 && dur <= 210, `${tag}: length ${dur.toFixed(1)} s`);
  const score = S.buildScore(t);
  ok(Math.abs(score.duration - dur) < 1e-6, `${tag}: score length matches`);
  const pcs = new Set(S.SCALES[t.scale].map((x) => (x + t.root) % 12));
  const pitched = score.events.filter((e) => e.midi !== undefined);
  ok(pitched.length > 50 && pitched.every((e) => pcs.has(((e.midi % 12) + 12) % 12)), `${tag}: every note is in the key`);
  ok(score.events.every((e) => e.t >= 0 && e.t < dur + 0.01 && Number.isFinite(e.dur) && e.dur > 0), `${tag}: event times`);
  ok(score.events.some((e) => e.v === 'kick' || e.v === 'brush'), `${tag}: has a beat`);

  const a = S.renderTrack(t, SR);
  const b = S.renderTrack(t, SR);
  ok(a.length === b.length && a.every((x, i) => x === b[i]), `${tag}: same seed, same audio`);
  let peak = 0, bad = 0;
  for (const x of a) { if (!Number.isFinite(x)) bad++; else if (Math.abs(x) > peak) peak = Math.abs(x); }
  ok(bad === 0, `${tag}: no NaN`);
  ok(peak > 0.5 && peak <= 0.9, `${tag}: peak ${peak.toFixed(2)}`);
  let silent = 0;
  for (let w = 0; w + 1 <= Math.floor(a.length / SR) - 2; w++) {
    let s = 0;
    for (let i = w * SR; i < (w + 1) * SR; i++) s += a[i] * a[i];
    if (Math.sqrt(s / SR) < 0.02) silent++;
  }
  ok(silent === 0, `${tag}: no silent second`, silent);
  console.log(`${tag}: ${t.genre}, ${t.bpm} BPM, ${dur.toFixed(0)} s, ${score.events.length} events`);
}

// they fit the radio's picker
const recs = S.synthRecords().map(M.normalizeTrack);
ok(recs.every(Boolean) && recs.length === S.SYNTH_TRACKS.length, 'records normalise');
ok(recs.every((r) => r.id && r.artist), 'records have id and act');
const wav = S.toWav(new Float32Array(100), SR);
ok(wav.length === 244 && String.fromCharCode(...wav.slice(0, 4)) === 'RIFF', 'wav header');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
