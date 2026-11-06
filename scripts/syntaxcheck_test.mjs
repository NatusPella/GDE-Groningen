// Test voor scripts/lib/syntaxcheck.mjs: een module met een quotefout (zoals story.js ooit
// had) moet worden afgekeurd, ook als het bestand .js heet; een goede module en een
// CommonJS-bestand moeten slagen.
//   node scripts/syntaxcheck_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkSyntax } from './lib/syntaxcheck.mjs';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('MISLUKT: ' + m); } };

const quoteBug = "import { a } from './a.js';\nexport const css = 'font:bold 13px/1 'Bebas Neue',Arial;';\n";
ok(!checkSyntax('x/fout.js', quoteBug).ok, 'module .js met quotefout wordt afgekeurd');
ok(!checkSyntax('x/fout.mjs', quoteBug).ok, 'module .mjs met quotefout wordt afgekeurd');
ok(checkSyntax('x/goed.js', "import { a } from './a.js';\nexport const css = \"font:bold 13px/1 'Bebas Neue',Arial;\";\n").ok, 'goede module slaagt');
ok(checkSyntax('x/top.mjs', 'const x = await Promise.resolve(1);\nexport default x;\n').ok, 'top-level await in .mjs slaagt');
ok(checkSyntax('desktop/envcompat.js').ok, 'echte CommonJS in desktop/ slaagt');
ok(checkSyntax('x/cjs.js', "const fs = require('fs');\nmodule.exports = { fs };\n").module === false, 'CommonJS is geen module');
// #593: .cjs valt onder dezelfde controle (en de runners scannen ze nu ook)
ok(checkSyntax('desktop/guards.cjs').ok, 'een echt .cjs-bestand slaagt via de CommonJS-route');
const tmp = path.join(os.tmpdir(), `gde-cjs-${process.pid}.cjs`);
fs.writeFileSync(tmp, 'const x = ;\n');
try { ok(!checkSyntax(tmp).ok, 'een .cjs met een syntaxfout wordt afgekeurd'); } finally { fs.rmSync(tmp, { force: true }); }
console.log(bad ? `${bad} MISLUKT` : 'syntaxcheck: alles ok');
process.exit(bad ? 1 : 0);
