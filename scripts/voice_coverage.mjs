// Lists every spoken line (speech bubble or subtitle) that has no recording,
// per area, and exits 1 when any is missing. Run from anywhere:
//   node scripts/voice_coverage.mjs          summary + missing lines
//   node scripts/voice_coverage.mjs --quiet  summary only
// New spoken tables must be registered in scripts/voicelines_collect.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { collect, isVoiced, missingKeys, manifest, REPO } from './voicelines_collect.mjs';
import { dutchFor, looksFrisian } from '../game/js/subtitles.js';

const quiet = process.argv.includes('--quiet');
const lines = collect();
const areas = new Map();
for (const e of lines) {
  const a = areas.get(e.area) || { total: 0, voiced: 0, missing: [] };
  a.total++;
  if (isVoiced(e)) a.voiced++;
  else a.missing.push(e);
  areas.set(e.area, a);
}
let total = 0, voiced = 0;
const w = Math.max(...[...areas.keys()].map((k) => k.length));
for (const [name, a] of areas) {
  total += a.total; voiced += a.voiced;
  console.log(`${name.padEnd(w)}  ${String(a.voiced).padStart(4)}/${String(a.total).padEnd(4)} ${a.missing.length ? `${a.missing.length} zonder stem` : 'ok'}`);
}
// The new story (game/storydata/script.json): a line flagged `textOnly` is shown as text and needs
// no recording; every other line must resolve in the manifest it names, else it fails.
const scriptFile = path.join(REPO, 'game', 'storydata', 'script.json');
if (fs.existsSync(scriptFile)) {
  const script = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
  const a = { total: 0, voiced: 0, missing: [], textOnly: 0 };
  for (const sc of script.scenes) {
    for (const l of sc.lines) {
      if (l.textOnly) { a.textOnly++; continue; }
      a.total++;
      const key = (l.voice || l.speaker) + '|' + l.text;
      if (l.rec && manifest(l.rec)[key]) a.voiced++;
      else a.missing.push({ manifest: l.rec || 'story', text: l.text, speakers: [l.voice || l.speaker], key });
    }
  }
  areas.set('Nieuw verhaal (script.json)', a);
  total += a.total; voiced += a.voiced;
  console.log(`${'Nieuw verhaal'.padEnd(w)}  ${String(a.voiced).padStart(4)}/${String(a.total).padEnd(4)} ${a.missing.length ? `${a.missing.length} zonder stem` : 'ok'}, ${a.textOnly} alleen tekst (vrijgesteld)`);
}
console.log(`${'Totaal'.padEnd(w)}  ${String(voiced).padStart(4)}/${total}`);
const missing = [...areas.values()].flatMap((a) => a.missing);
if (!quiet) for (const e of missing) console.log(`  [${e.manifest}] ${e.key ? e.speakers.join(', ') : missingKeys(e).join(', ')}: ${e.text}`);
// Frisian lines are double-subtitled: each needs a Dutch line in game/js/subtitles.js (FY).
const untranslated = [...new Set(lines.filter((e) => looksFrisian(e.text) && !dutchFor(e.text)).map((e) => e.text))];
if (untranslated.length) {
  console.log(`Fries zonder Nederlandse ondertitel (game/js/subtitles.js): ${untranslated.length}`);
  for (const t of untranslated) console.log(`  ${t}`);
}
process.exit(missing.length || untranslated.length ? 1 : 0);
