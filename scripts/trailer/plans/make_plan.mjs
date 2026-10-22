// Bouwt een montageplan (JSON voor montage.mjs) uit een compacte lijst, op de maat van de muziek.
//   node scripts/trailer/plans/make_plan.mjs <lijst.json> --out=<plan.json>
// lijst.json:
//   { "name": "...", "clipsDir": "...", "bpm": 135.469, "hook": 3.5433,                 // hook = seconden vóór de muziek (hele maten)
//     "music": { "file": "...", "from": 74.05, "gain": -3, "fadeOut": 2 },
//     "shots": [ { "clip": "g00-hook.mp4", "in": 0, "beats": 8, "label": "hook", "sfx": [["riser", 0.5, -9]] }, ... ],   // beats: duur in tellen (1 tel = 60/bpm s)
//     "sfx": [["impact", 3.5433, -4]], "voices": [...], "cutSfx": "swish", "cutGain": -12 }
// Bij elke snede (behalve de eerste) komt automatisch het effect cutSfx (een zoef), tenzij een shot "noCutSfx" heeft.
import fs from 'node:fs';
import path from 'node:path';
import { loadCijfers } from './cijfers.mjs';

const args = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(args.find((a) => !a.startsWith('--')), 'utf8'));
const cijf = loadCijfers((args.find((a) => a.startsWith('--cijfers=')) || '').slice(10) || list.cijfers);
const out = (args.find((a) => a.startsWith('--out=')) || '--out=plan.json').slice(6);
const beat = 60 / list.bpm;
const clips = [], caps = [], sfx = [...(list.sfx || []).map(([kind, at, gain]) => ({ kind, at, gain }))];
let t = 0;
list.shots.forEach((s, i) => {
  const dur = s.beats ? s.beats * beat : s.dur;
  clips.push({ src: s.clip, in: s.in || 0, dur, speed: s.speed || 1, label: s.label || s.clip });
  if (i > 0 && !s.noCutSfx && list.cutSfx !== false) sfx.push({ kind: s.cutSfx || list.cutSfx || 'swish', at: +(t - 0.05).toFixed(4), gain: s.cutGain ?? list.cutGain ?? -12 });
  for (const [kind, off, gain] of s.sfx || []) sfx.push({ kind, at: +(t + off).toFixed(4), gain });
  for (const n of s.nums || []) { const c = String(n[0]).startsWith('=') ? { tekst: String(n[0]).slice(1), label: '' } : cijf.get(n[0]); caps.push({ at: +(t + (n[1] ?? 0.4)).toFixed(3), dur: n[2] ?? 2.6, num: c.tekst + (n[4] || ''), label: (n[3] || c.label).toUpperCase(), pos: n[5] || '' }); }
  const sub = (x) => String(x || '').replace(/\{([\w.]+)\}/g, (_, id) => cijf.get(id).tekst);
  if (s.cap) caps.push({ at: +(t + (s.cap[2] ?? 0.3)).toFixed(3), dur: s.cap[3] ?? 1.7, text: sub(s.cap[0]), kicker: sub(s.cap[1]), pos: s.cap[4] || '' });
  t += dur;
});
const plan = {
  name: list.name, clipsDir: list.clipsDir, fps: 60, fadeIn: list.fadeIn ?? 0.3, fadeOut: list.fadeOut ?? 1.0, flash: list.flash || [],
  clips,
  audio: {
    music: [{ ...list.music, at: list.hook || 0 }],
    voices: list.voices || [], sfx, duck: list.duck || { depth: 4, attack: 0.25, release: 0.7, pad: 0.05 },
    targetLufs: -14, truePeak: -1.2,
  },
};
if (list.captionsDir) plan.captions = { shadow: path.join(list.captionsDir, 'captrack-schaduw.mp4'), text: path.join(list.captionsDir, 'captrack-tekst.mp4') };
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
fs.writeFileSync(out.replace(/.json$/, '.captions.json'), JSON.stringify({ total: +t.toFixed(4), items: caps }, null, 1));
console.log(`${out}: ${clips.length} clips, ${t.toFixed(2)} s (${(t / beat).toFixed(1)} tellen, ${(t / beat / 4).toFixed(1)} maten)`);
