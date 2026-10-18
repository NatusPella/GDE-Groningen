// Vangt de TDZ-fout `const gameBusy = gameBusy(world)`: een lokale const/let die zijn eigen
// naam in de initializer leest (en zo de geïmporteerde of buitenste functie overschaduwt)
// geeft "Cannot access before initialization" zodra de functie draait (#105).
//   node scripts/selfref_tdz_test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
// `const x = x(`, `let x = x.foo`: de naam staat als los woord (geen eigenschap) in de eigen initializer
const SELFREF = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*[!(\s]*\1(?![\w$:])\s*[(.[]/;
const STR = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
function findSelfRef(src) {
  const hits = [];
  src.split(/\r?\n/).forEach((l, i) => {
    const code = l.replace(STR, "''").replace(/\/\/.*$/, '');
    const m = SELFREF.exec(code);
    if (m) hits.push({ line: i + 1, name: m[1], text: l.trim().slice(0, 100) });
  });
  return hits;
}

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('MISLUKT: ' + m); } };
ok(findSelfRef('const gameBusy = gameBusy(world);').length === 1, 'const x = x(...) wordt gevonden');
ok(findSelfRef('  let n = n.length;').length === 1, 'let n = n.length wordt gevonden');
ok(findSelfRef('const inGameBusy = gameBusy(world);').length === 0, 'andere naam is goed');
ok(findSelfRef("const a = 'a(b)';").length === 0, 'tekst in string telt niet');
ok(findSelfRef('const m = obj.m(1);').length === 0, 'eigenschap met dezelfde naam is goed');

for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
  for (const h of findSelfRef(readFileSync(path.join(dir, f), 'utf8'))) ok(false, `${f}:${h.line} ${h.name} leest zichzelf in zijn initializer: ${h.text}`);
}
console.log(bad ? `${bad} MISLUKT` : 'selfref_tdz: alles ok');
process.exit(bad ? 1 : 0);
