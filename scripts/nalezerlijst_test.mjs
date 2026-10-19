// Test voor scripts/nalezerlijst.mjs: de lijst voor de nalezer is gevuld en schrijft niets weg.
//   node scripts/nalezerlijst_test.mjs
import { build, gronings, fries, FRIES_RE } from './nalezerlijst.mjs';
import { collectTexts } from './text_audit.mjs';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };
const r = build();
ok(r.g > 1000 && r.g === gronings().length, 'Groningse regels gevonden');
ok(fries().every(([, t]) => FRIES_RE.test(t)), 'Friese kandidaten hebben een Fries kenmerk');
ok(/\| 1 \|/.test(r.md) && /Oordeel/.test(r.md), 'tabel met kolom Oordeel');
ok(!/de Grunn\b/.test(r.md.replace(/nooit "de Grunn"/g, '')), "geen 'de Grunn' in de lijst");
const files = new Set(collectTexts().map((i) => i.file));
ok(files.has('desktop/main.js'), 'tekstaudit leest desktop/main.js');
console.log(failed ? `${failed} mislukt` : 'nalezerlijst_test ok');
process.exit(failed ? 1 : 0);
