// Zoekt module-niveau caches (Map/Set/{}) in game/js die alleen groeien: geen clear/delete,
// geen size-controle en geen reset in hetzelfde bestand (21-11, inefficientie D).
//   node scripts/perf/cachescan.mjs [--all]
// Zoeklicht: een cache met een beperkte sleutelruimte (soorten, tegelsleutels van de stad) is
// geen lek. Kijk naar de sleutel: groeit hij met tijd, positie of aantal spelers, dan wel.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rows = [];
for (const f of walk(path.join(REPO, 'game', 'js')).filter((p) => p.endsWith('.js'))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/^(?:export )?(?:const|let) (\w*(?:[cC]ache|[mM]emo|[sS]een|[rR]egistry|[bB]y[A-Z]\w*|[iI]ndex)\w*) = new (Map|Set)\(\)/gm)) {
    const n = esc(m[1]);
    const shrinks = new RegExp(`\\b${n}\\.(clear|delete)\\(`).test(s) || new RegExp(`\\b${n} = new (Map|Set)\\(`).test(s.replace(m[0], ''));
    const bounded = new RegExp(`\\b${n}\\.size\\b`).test(s);
    const writes = (s.match(new RegExp(`\\b${n}\\.(set|add)\\(`, 'g')) || []).length;
    if (!shrinks && !bounded && writes) rows.push({ file: path.relative(REPO, f).split(path.sep).join('/'), name: m[1], kind: m[2], writes });
  }
}
console.log(`${rows.length} caches zonder clear/delete/size/reset:`);
for (const r of rows) console.log(`  ${r.file}  ${r.name} (${r.kind}, ${r.writes} schrijfplekken)`);
