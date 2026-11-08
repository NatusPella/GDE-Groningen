// Bewaakt dat elk lokaal require() uit de main-process in de verpakte app zit: een bestand dat
// hier ontbreekt laat de geïnstalleerde app bij het starten crashen (0.58.0: guards.cjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(ROOT, 'desktop', 'main.js'), 'utf8');
const files = pkg.build.files;
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
for (const m of main.matchAll(/require\('\.\/([^']+)'\)/g)) {
  const f = m[1];
  ok(files.includes(f), `${f} staat in build.files (main.js require)`);
  ok(fs.existsSync(path.join(ROOT, 'desktop', f)), `${f} bestaat in desktop/`);
}
ok(files.includes('main.js'), 'main.js staat in build.files');
console.log(fails ? `desktop_packaging_test: ${fails} fout` : `desktop_packaging_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
