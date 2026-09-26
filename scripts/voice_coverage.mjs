// Lists every spoken line (speech bubble or subtitle) that has no recording,
// per area, and exits 1 when any is missing. Run from anywhere:
//   node scripts/voice_coverage.mjs          summary + missing lines
//   node scripts/voice_coverage.mjs --quiet  summary only
// New spoken tables must be registered in scripts/voicelines_collect.mjs.
import { collect, isVoiced, missingKeys } from './voicelines_collect.mjs';

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
console.log(`${'Totaal'.padEnd(w)}  ${String(voiced).padStart(4)}/${total}`);
const missing = [...areas.values()].flatMap((a) => a.missing);
if (!quiet) for (const e of missing) console.log(`  [${e.manifest}] ${missingKeys(e).join(', ')}: ${e.text}`);
process.exit(missing.length ? 1 : 0);
