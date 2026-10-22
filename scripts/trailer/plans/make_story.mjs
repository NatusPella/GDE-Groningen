// Bouwt het montageplan van de verhaaltrailer uit fragmenten van de opgenomen filmpjes (shots/verhaal.page.js). De stemregels komen uit het
// zijbestand van elke opname (<clip>.json, gebeurtenissen 'voice' met bestand en tijd): elke regel die geheel binnen een fragment valt, wordt
// op dat moment onder het beeld gelegd; een regel die half in het fragment valt, wordt gemeld (kies de snede op een stilte).
//   node scripts/trailer/plans/make_story.mjs <lijst.json> --out=<plan.json>
// lijst.json: zoals make_plan.mjs, maar een shot is { clip, in, dur, label, sfx, cap, noVoices, voiceGain }
import fs from 'node:fs';
import path from 'node:path';
import { loadCijfers } from './cijfers.mjs';

const args = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(args.find((a) => !a.startsWith('--')), 'utf8'));
const cijf = loadCijfers((args.find((a) => a.startsWith('--cijfers=')) || '').slice(10) || list.cijfers);
const out = (args.find((a) => a.startsWith('--out=')) || '--out=plan.json').slice(6);
const clips = [], caps = [], voices = [], sfx = [...(list.sfx || []).map(([kind, at, gain]) => ({ kind, at, gain }))];
let t = 0;
const warn = [];
list.shots.forEach((s, i) => {
  const dur = s.dur ?? (s.beats * 60 / list.bpm);
  clips.push({ src: s.clip, in: s.in || 0, dur, speed: s.speed || 1, label: s.label || s.clip });
  if (i > 0 && !s.noCutSfx && list.cutSfx !== false) sfx.push({ kind: s.cutSfx || list.cutSfx || 'swish', at: +(t - 0.05).toFixed(4), gain: s.cutGain ?? list.cutGain ?? -13 });
  for (const [kind, off, gain] of s.sfx || []) sfx.push({ kind, at: +(t + off).toFixed(4), gain });
  for (const n of s.nums || []) { const c = String(n[0]).startsWith('=') ? { tekst: String(n[0]).slice(1), label: '' } : cijf.get(n[0]); caps.push({ at: +(t + (n[1] ?? 0.4)).toFixed(3), dur: n[2] ?? 2.6, num: c.tekst + (n[4] || ''), label: (n[3] || c.label).toUpperCase(), pos: n[5] || '' }); }
  const sub = (x) => String(x || '').replace(/\{([\w.]+)\}/g, (_, id) => cijf.get(id).tekst);
  if (s.cap) caps.push({ at: +(t + (s.cap[2] ?? 0.3)).toFixed(3), dur: s.cap[3] ?? 1.7, text: sub(s.cap[0]), kicker: sub(s.cap[1]), pos: s.cap[4] || '' });
  const side = path.join(list.clipsDir, s.clip.replace(/\.[^.]+$/, '.json'));
  if (!s.noVoices && fs.existsSync(side)) {
    const ev = (JSON.parse(fs.readFileSync(side, 'utf8')).events || []).filter((e) => e.kind === 'voice');
    for (const e of ev) {
      const a = e.t, b = e.t + (e.dur || 2);
      const start = (s.in || 0), end = start + dur;
      if (a >= start - 0.05 && b <= end + 0.35) { if (e.src) voices.push({ src: e.src.replace('app://game/', ''), at: +(t + (a - start)).toFixed(3), target: list.voiceTarget ?? -15, gain: s.voiceGain ?? 0, text: `${e.speaker}: ${e.text}` }); else warn.push(`geen opname voor "${e.text}" in ${s.clip}`); }
      else if (b > start && a < end) warn.push(`regel half in fragment (${s.clip}, ${a.toFixed(1)}-${b.toFixed(1)} s, fragment ${start}-${end.toFixed(1)}): ${e.speaker}: ${e.text.slice(0, 50)}`);
    }
  }
  t += dur;
});
const plan = {
  name: list.name, clipsDir: list.clipsDir, fps: 60, fadeIn: list.fadeIn ?? 0.3, fadeOut: list.fadeOut ?? 1.0, flash: list.flash || [],
  clips,
  audio: { music: Array.isArray(list.music) ? list.music : [{ ...list.music, at: list.hook || 0 }], voices, sfx, duck: list.duck || { depth: 4, attack: 0.25, release: 0.8, pad: 0.05 }, targetLufs: -14, truePeak: -1.2 },
};
if (list.captionsDir) plan.captions = { shadow: path.join(list.captionsDir, 'captrack-schaduw.mp4'), text: path.join(list.captionsDir, 'captrack-tekst.mp4') };
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
fs.writeFileSync(out.replace(/.json$/, '.captions.json'), JSON.stringify({ total: +t.toFixed(4), items: caps }, null, 1));
console.log(`${out}: ${clips.length} fragmenten, ${t.toFixed(2)} s, ${voices.length} stemregels`);
for (const w of warn) console.log('LET OP: ' + w);
