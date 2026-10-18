// Lazy laden (#109): trailer-, intro- en dev-modules mogen niet statisch vanuit
// main.js bereikbaar zijn; ze komen via import() pas bij gebruik.
//   node scripts/lazy_modules_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const LAZY = ['trailer.js', 'trailerplan.js', 'trailerprops.js', 'intromontage.js', 'storydev.js', 'storytest.js', 'testmenu.js', 'playerapi.js', 'profileoverlay.js'];
const STATIC = /^\s*(?:import|export)\s[^'"\n]*?from\s*['"](\.[^'"]+)['"]|^\s*import\s*['"](\.[^'"]+)['"]/gm;

const seen = new Map(); // module -> eerste importeur
const todo = ['main.js'];
seen.set('main.js', null);
while (todo.length) {
  const f = todo.pop();
  const p = path.join(JS, f);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(STATIC)) {
    const rel = path.normalize(m[1] || m[2]);
    const target = path.relative(JS, path.join(JS, path.dirname(f), rel)).split(path.sep).join('/');
    if (!seen.has(target)) { seen.set(target, f); todo.push(target); }
  }
}
let fail = 0;
for (const l of LAZY) {
  if (seen.has(l)) { fail++; console.log(`FAIL ${l} is statisch bereikbaar via ${seen.get(l)}`); }
}
console.log(`${seen.size} modules statisch vanuit main.js; ${fail ? fail + ' FAILED' : 'lazy-lijst ok'}`);
process.exit(fail ? 1 : 0);
