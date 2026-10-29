// POC: transpileert game/js/**/*.ts naar .js (types eraf, verder ongewijzigd),
// zodat het bestaande ESM-pad (browser/Electron, zonder bundler) de .ts-bronnen
// blijft draaien. Geen bundel: imports blijven zoals ze zijn (bijv. './economy.js').
//
// Standaard in-place (de .js komen naast de .ts), want de importers zeggen al
// './flitspaalrules.js'; die hoeven zo niet te veranderen. TS_OUT wijst ergens
// anders heen als je de uitvoer apart wilt zien.
//
// Let op: dit is de POC-stap, geen productiekeuze. Waar de tooling en de
// uitvoer wonen hoort in een ADR (zie docs/TYPESCRIPT-POC.md).
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'game', 'js');
const OUT = process.env.TS_OUT || SRC;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const entries = walk(SRC);
await build({
  entryPoints: entries,
  outdir: OUT,
  outbase: SRC,
  bundle: false,
  format: 'esm',
  target: 'es2022',
  logLevel: 'info',
});

console.log(`transpiled ${entries.length} .ts -> ${OUT}`);
