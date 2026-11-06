// De repl-opruiming van desktop/clipvideo.js (#593 punt 12): oude cmd-N.js en
// res-N.json van een afgebroken run moeten bij de start verdwijnen, anders voert
// de volgende run een vorige opdracht uit. De regex matchte letterlijke d's.
//   node scripts/clipvideo_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { REPL_ENTRY } = require('../desktop/clipvideo.js');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

ok(REPL_ENTRY.test('cmd-1.js'), 'cmd-1.js wordt opgeruimd');
ok(REPL_ENTRY.test('cmd-42.js'), 'cmd-42.js wordt opgeruimd');
ok(REPL_ENTRY.test('res-7.json'), 'res-7.json wordt opgeruimd');
ok(REPL_ENTRY.test('quit'), 'quit wordt opgeruimd');
ok(!REPL_ENTRY.test('cmd-d.js'), 'cmd-d.js is geen echte opdracht');
ok(!REPL_ENTRY.test('res-d.json'), 'res-d.json is geen echt resultaat');
ok(!REPL_ENTRY.test('cmd-1.js.bak'), 'een ander bestand blijft staan');
ok(!REPL_ENTRY.test('mijn-cmd-1.js'), 'alleen de vaste namen');

const src = fs.readFileSync(path.join(ROOT, 'desktop', 'clipvideo.js'), 'utf8');
ok(!/cmd-d\+/.test(src) && !/res-d\+/.test(src), 'de oude d+-regex staat niet meer in de bron');
ok(/REPL_ENTRY\.test\(f\)/.test(src), 'setupRepl gebruikt het patroon');

console.log(`clipvideo_test: ${n} checks ok`);
