// Statische telling van herhaalde losse meshes (#1039): zoekt in de runtime-modules van de stad naar lussen die per ronde een
// `new THREE.Mesh(` maken en toevoegen, zonder InstancedMesh of samenvoegen in dezelfde lus. Elke treffer is een kandidaat voor
// instancing of mergeGeometries (een drawcall per exemplaar). Het is een richtlijn, geen meting: de echte maat is renderer.info.render.calls
// met PERF_DIAG. Gebruik: node scripts/perf/meshloopscan.mjs [--top=30] [--all] [bestand ...]
// Zonder --all vallen missie-, binnen- en minigamemodules af (die staan niet in het stadsbeeld).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOOP = /\bfor\s*\(|\.forEach\(/;
export const SKIP = /mission|missie|sidejob|heist|trailer|padel|voetbal|penalty|home3d|intro|museum|vliegschool|stunt|race|kart|pigeon|coop|beppe|radiostudio|police|thuis3d|treininterieur|tuningshowroom|waterski|werf3d|wachtprops/;

// Alle (bestand, regel, lusregel) waarbij de 6 regels vanaf de lus een nieuwe mesh toevoegen en niets instanced of samengevoegd wordt.
export function scanSource(src, file = '?') {
  const L = src.split('\n');
  const out = [];
  for (let i = 0; i < L.length; i++) {
    if (!LOOP.test(L[i]) || /^\s*\/\//.test(L[i])) continue;
    const win = L.slice(i, i + 6).join('\n');
    if (/new THREE\.Mesh\(/.test(win) && /\.add\(/.test(win) && !/InstancedMesh|mergeGeometries/.test(win)) out.push({ file, line: i + 1, text: L[i].trim().slice(0, 110) });
  }
  return out;
}

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (p.endsWith('.js')) acc.push(p);
  }
  return acc;
}

export function scanTree({ all = false, files = null } = {}) {
  const list = files || walk(path.join(ROOT, 'game', 'js'));
  const hits = [];
  for (const f of list) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    if (!all && SKIP.test(rel)) continue;
    hits.push(...scanSource(fs.readFileSync(f, 'utf8'), rel));
  }
  return hits;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const top = +((args.find((a) => a.startsWith('--top=')) || '--top=30').slice(6));
  const files = args.filter((a) => !a.startsWith('--')).map((f) => path.resolve(f));
  const hits = scanTree({ all: args.includes('--all'), files: files.length ? files : null });
  const per = new Map();
  for (const h of hits) per.set(h.file, (per.get(h.file) || 0) + 1);
  console.log(`${hits.length} lussen met losse meshes in ${per.size} bestanden`);
  for (const [f, n] of [...per].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(String(n).padStart(4), f);
}
