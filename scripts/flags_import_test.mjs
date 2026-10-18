// Vangt een bestand dat FLAGS (devflags.js) leest zonder het te importeren: een
// ReferenceError die `node --check` niet ziet (storytest.js, #166).
//   node scripts/flags_import_test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
let bad = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith('.js') && n !== 'devflags.js')) {
  const src = readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  if (!/\bFLAGS\./.test(src)) continue;
  if (!/import\s*\{[^}]*\bFLAGS\b[^}]*\}\s*from\s*['"]\.\/devflags\.js['"]/.test(src)) { bad++; console.log(`MISLUKT: ${f} gebruikt FLAGS zonder import uit ./devflags.js`); }
}
console.log(bad ? `${bad} MISLUKT` : 'flags_import: alles ok');
process.exit(bad ? 1 : 0);
