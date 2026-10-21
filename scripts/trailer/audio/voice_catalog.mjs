// Lijst van alle bestaande stemopnames van het spel (geen nieuwe TTS): per manifest "Spreker|tekst" -> bestand en duur.
//   node scripts/trailer/audio/voice_catalog.mjs [--out=<json>] [--grep=<tekst>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE = path.join(ROOT, 'game', 'audio', 'voicelines');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const rows = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name === 'manifest.json') {
      const m = JSON.parse(fs.readFileSync(f, 'utf8'));
      const rel = path.relative(BASE, dir).split(path.sep).join('/');
      for (const [k, v] of Object.entries(m)) {
        if (!v || typeof v !== 'object' || !v.src) continue;
        const i = k.indexOf('|');
        const src = `audio/voicelines/${rel ? rel + '/' : ''}${v.src}`;
        rows.push({ map: rel, speaker: i > 0 ? k.slice(0, i) : '', text: i > 0 ? k.slice(i + 1) : k, src, dur: v.dur ?? null, exists: fs.existsSync(path.join(ROOT, 'game', src)) });
      }
    }
  }
}
walk(BASE);
const g = opt('grep', '').toLowerCase();
const sel = g ? rows.filter((r) => (r.speaker + ' ' + r.text).toLowerCase().includes(g)) : rows;
if (opt('out', '')) fs.writeFileSync(opt('out', ''), JSON.stringify(rows, null, 1));
for (const r of sel) console.log(`${r.exists ? ' ' : '!'} ${r.map.padEnd(16)} ${r.speaker.padEnd(10)} ${String(r.dur).padStart(5)}s  ${r.text.slice(0, 110)}  [${r.src}]`);
console.log(`${sel.length} van ${rows.length} regels`);
