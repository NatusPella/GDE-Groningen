// Transpileert game/js/**/*.ts naar .js (types eraf, verder ongewijzigd), zodat
// het bestaande ESM-pad (browser/Electron, zonder bundler) de .ts-bronnen blijft
// draaien. Geen bundel: imports blijven zoals ze zijn (bijv. './economy.js').
//
//   node scripts/build_ts.mjs            in-place in game/js (dev)
//   node scripts/build_ts.mjs --out DIR  transpileer de .ts in DIR (build/stage)
//   node scripts/build_ts.mjs --drop-ts  verwijder de .ts na transpile (build/stage)
//
// De uitvoer is gegenereerd en staat niet in git; de .ts is de bron van waarheid
// (ADR 0022, zie docs/TYPESCRIPT.md).
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const OUT = arg('--out') ? path.resolve(ROOT, arg('--out')) : path.join(ROOT, 'game', 'js');
const DROP_TS = args.includes('--drop-ts');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const entries = walk(OUT);
if (!entries.length) {
  console.log(`no .ts in ${OUT}`);
  process.exit(0);
}

await build({
  entryPoints: entries,
  outdir: OUT,
  outbase: OUT,
  bundle: false,
  format: 'esm',
  target: 'es2022',
  logLevel: 'info',
});

if (DROP_TS) {
  for (const f of entries) fs.rmSync(f);
  console.log(`dropped ${entries.length} .ts sources from ${OUT}`);
}

console.log(`transpiled ${entries.length} .ts -> ${OUT}`);
