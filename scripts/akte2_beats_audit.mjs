// Staan de regiebeats van akte 2 (game/js/cutscenes_akte2.js) nog op regels die het script heeft? Een beat met `on:` die geen
// regel meer vindt (de regel is herschreven of door een humorkeuze vervangen) wordt stil overgeslagen: het gebaar of de camera
// valt weg. Alleen lezen.  node scripts/akte2_beats_audit.mjs [--json]
import { readFileSync } from 'node:fs';
import { SPECS_AKTE2 as SPECS } from '../game/js/cutscenes_akte2.js';

const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const SCENES = {
  'M07.intro': ['M07.1'], 'M07.outro': ['M07.3'], 'M08.intro': ['M08.1'], 'M08.outro': ['M08.3'], 'M09.intro': ['M09.1'], 'M09.outro': ['M09.4'],
  'M10.intro': ['M10.1'], 'M11.intro': ['M11.1'], 'M11.outro': ['M11.8'],
};
for (const k of Object.keys(SPECS)) if (/^M\d+\.\d+$/.test(k)) SCENES[k] = [k];
const missing = [];
let n = 0;
for (const [key, spec] of Object.entries(SPECS)) {
  const ids = SCENES[key];
  if (!ids) { missing.push({ key, on: '(geen scene-koppeling)' }); continue; }
  const lines = ids.flatMap((id) => (data.scenes.find((s) => s.id === id) || { lines: [] }).lines).filter((l) => l.channel !== 'app-stil');
  const ons = [];
  const walk = (o) => { if (!o || typeof o !== 'object') return; if (typeof o.on === 'string' && o.on !== 'end') ons.push(o.on); for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v); };
  walk(spec);
  for (const on of ons) { n++; if (!lines.some((l) => l.text.startsWith(on))) missing.push({ key, on }); }
}
for (const m of missing) console.log(`FOUT ${m.key}: geen regel begint met "${m.on}"`);
if (process.argv.includes('--json')) console.log(JSON.stringify(missing));
console.log(`akte2_beats_audit: ${n - missing.length}/${n} beats vinden hun regel`);
process.exit(missing.length ? 1 : 0);
