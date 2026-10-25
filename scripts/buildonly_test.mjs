// De lijst build-only modules (scripts/lib/buildonly.mjs, #103) klopt met de importgrafiek:
// elk genoemd bestand bestaat, wordt door het spel nooit geladen, en geen meegeleverde
// module importeert er een. Nieuwe bouw-only modules moeten op de lijst of in KEEP (met reden).
//   node scripts/buildonly_test.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import { BUILD_ONLY } from './lib/buildonly.mjs';

// bouw-only volgens de grafiek maar bewust niet uitgesloten
const KEEP = {
  'cooproles.js': 'coop (#95) wordt nog aangesloten',
  'coopstate.js': 'coop (#95) wordt nog aangesloten',
  'treincoop.js': 'coop (#444): de rollen in de trein, wordt nog aangesloten op de coöp-laag',
  'cutpreview.js': 'game/cutpreview.html is een meegeleverde ontwikkelpagina',
  'cutpreviewui.js': 'game/cutpreview.html is een meegeleverde ontwikkelpagina',
};

const report = JSON.parse(execFileSync(process.execPath, ['scripts/dead_code.mjs', '--json'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
const byName = new Map(report.map((r) => [r.file.replace('game/js/', ''), r]));
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

for (const f of BUILD_ONLY) {
  const r = byName.get(f);
  ok(fs.existsSync('game/js/' + f), `${f} bestaat`);
  ok(r && r.kind === 'bouw-only', `${f} is bouw-only volgens dead_code (nu: ${r && r.kind})`);
  for (const u of (r ? r.users : []).filter((x) => x.startsWith('game/js/'))) ok(BUILD_ONLY.includes(u.replace('game/js/', '')) || KEEP[u.replace('game/js/', '')], `${f} wordt geïmporteerd door meegeleverde module ${u}`);
}
for (const r of report.filter((x) => x.kind === 'bouw-only')) {
  const f = r.file.replace('game/js/', '');
  ok(BUILD_ONLY.includes(f) || KEEP[f], `${f} is bouw-only maar staat niet in BUILD_ONLY of KEEP`);
}
for (const f of Object.keys(KEEP)) ok(byName.has(f), `KEEP-bestand ${f} bestaat nog`);
console.log(fails ? `buildonly_test: ${fails} fouten` : `buildonly_test: ok (${BUILD_ONLY.length} uitgesloten, ${Object.keys(KEEP).length} bewust meegeleverd)`);
process.exit(fails ? 1 : 0);
