// Test voor scripts/import_check.mjs met synthetische foutgevallen en goede gevallen.
//   node scripts/import_check_test.mjs
import path from 'node:path';
import { checkSources, parseModule, sanitize } from './import_check.mjs';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('MISLUKT: ' + m); } };
const P = (f) => path.resolve('/synth', f);
const run = (files) => checkSources(new Map(Object.entries(files).map(([k, v]) => [P(k), v])));
const kinds = (files) => run(files).map((p) => p.kind);

const lib = [
  'export function a() {}',
  'export const b = 1;',
  'const c = 2, d = 3;',
  'export { c, d as dd };',
  "export { z as zz } from './other.js';",
  "export * from './star.js';",
  'export default function () {}',
].join('\n');
const other = 'export const z = 1;';
const star = 'export const s1 = 1; export class S2 {}';

// goede gevallen
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import def, { a, b, c as cc, dd, zz, s1, S2 } from './lib.js'; a(b); cc(dd, zz, s1, S2, def);" }).length === 0, 'geldige imports geven niets');
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import * as ns from './lib.js'; ns.a();" }).length === 0, 'namespace-import is goed');
ok(kinds({ 'cjs.js': "module.exports = { x: 1 };", 'm.js': "import { x } from './cjs.js';" }).length === 0, 'CommonJS-doel wordt niet op namen gecontroleerd');
ok(kinds({ 'm.js': "import { x } from 'three';\nimport fs from 'node:fs';" }).length === 0, 'pakketimports worden genegeerd');

// 1. ontbrekende export / bestand
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import { nope } from './lib.js';" }).join() === 'ontbrekende-export', 'niet-geëxporteerde naam');
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import { c } from './lib.js';" }).length === 0, 'export { c } maakt c beschikbaar');
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import { d } from './lib.js';" }).join() === 'ontbrekende-export', 'export { d as dd } verbergt de naam d');
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import { z } from './lib.js';" }).join() === 'ontbrekende-export', 're-export als zz verbergt z');
ok(kinds({ 'lib.js': lib, 'other.js': other, 'star.js': star, 'm.js': "import { s2 } from './lib.js';" }).join() === 'ontbrekende-export', 'hoofdlettergevoelig via export *');
ok(kinds({ 'm.js': "import { a } from './weg.js';" }).join() === 'ontbrekend-bestand', 'ontbrekend bestand');

// 2. overschaduwing met lezing vóór de declaratie
const tdzSelf = "import { gameBusy } from './busy.js';\nexport function f(w) {\n  const gameBusy = gameBusy(w);\n  return gameBusy;\n}";
ok(kinds({ 'busy.js': 'export const gameBusy = (w) => !!w;', 'm.js': tdzSelf }).join() === 'overschaduwde-import', 'const gameBusy = gameBusy(...)');
const tdzLater = "import { helper } from './h.js';\nexport function f() {\n  helper();\n  const helper = 3;\n  return helper;\n}";
ok(kinds({ 'h.js': 'export const helper = () => 1;', 'm.js': tdzLater }).join() === 'overschaduwde-import', 'lezing vóór lokale declaratie');
const shadowOk = "import { helper } from './h.js';\nexport function f() {\n  const helper2 = helper();\n  return helper2;\n}\nexport function g() {\n  const helper = 3;\n  return helper;\n}";
ok(kinds({ 'h.js': 'export const helper = () => 1;', 'm.js': shadowOk }).length === 0, 'overschaduwing in een ander blok zonder eerdere lezing is goed');
const closureOk = "import { helper } from './h.js';\nexport function f() {\n  const use = () => helper();\n  const helper = 3;\n  return use;\n}";
ok(kinds({ 'h.js': 'export const helper = () => 1;', 'm.js': closureOk }).length === 0, 'lezing in een closure telt niet (geen directe TDZ)');
ok(kinds({ 'h.js': 'export const helper = 1;', 'm.js': "import { helper } from './h.js';\n// const helper = helper(1);\nconst s = 'const helper = helper(2)';" }).length === 0, 'commentaar en strings tellen niet');

// 3. dubbele import
ok(kinds({ 'h.js': 'export const x = 1;', 'm.js': "import { x } from './h.js';\nimport { x } from './h.js';" }).join() === 'dubbele-import', 'dubbele import van dezelfde naam');
ok(kinds({ 'h.js': 'export const x = 1;', 'g.js': 'export const y = 1;', 'm.js': "import { x } from './h.js';\nimport { y as x } from './g.js';" }).join() === 'dubbele-import', 'twee imports met dezelfde lokale naam');

// parser
ok(sanitize("const a = 'x/*'; // c\nconst b = /[/]'/g;").includes('const b ='), 'sanitize houdt code over');
ok(parseModule("export const { p, q: r } = obj;").exports.has('r'), 'export met destructuring');

console.log(bad ? `${bad} MISLUKT` : 'import_check: alles ok');
process.exit(bad ? 1 : 0);
