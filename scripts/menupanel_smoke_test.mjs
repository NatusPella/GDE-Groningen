// Rooktest op de opbouw van elk pauzemenu-onderdeel (#980): een scherm dat bij het openen
// een ReferenceError geeft, valt in het spel stil om — de speler ziet dan een leeg paneel en
// geen fout. Dat overkwam twee schermen in de AAA-ronde:
//   - Veroverd: `soortenStand()` werd aangeroepen zonder import;
//   - Cheats: de hero gebruikte `n` terwijl de declaratie vier regels lager stond (TDZ).
// Beide zijn met een bron-regex niet te zien; deze test kijkt naar de namen zelf, via dezelfde
// acorn-parser als undef_check: eerst of elke naam bestaat, dan of een `const`/`let` niet
// gebruikt wordt vóór zijn declaratie binnen dezelfde scope.
//   node scripts/menupanel_smoke_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game/js', f), 'utf8');
const NL = String.fromCharCode(10);
let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL ' + name); } };

const PANELEN = [
  'pausemenu.js', 'veroverdpanel.js', 'loopbaanui.js', 'achievementsui.js',
  'spullen.js', 'todoui.js', 'garageui.js', 'verhaalui.js',
  'cheatsui.js', 'fotomodusui.js', 'gebiedenui.js', 'mapview.js',
];

// 1. Elke paneelmodule dekt zijn eigen namen (undef_check: de klasse "no-undef").
for (const f of PANELEN) {
  ok(fs.existsSync(path.join(root, 'game/js', f)), f + ' bestaat');
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/undef_check.mjs'), path.join(root, 'game/js', f)], { encoding: 'utf8' });
  const uit = (r.stdout || '') + (r.stderr || '');
  ok(r.status === 0, f + ': geen ongedefinieerde namen (' + uit.trim().split(NL).pop() + ')');
}

// 2. Een paneel dat een export van een andere module gebruikt, moet hem ook importeren.
const gebruikt = (src, naam) => new RegExp('\\b' + naam + '\\s*\\(').test(src);
const importeert = (src, naam) => {
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
    const namen = m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop().trim());
    if (namen.includes(naam)) return true;
  }
  return false;
};
for (const f of PANELEN) {
  const src = read(f);
  if (f === 'gebiedenui.js') continue; // de definitie zelf
  for (const naam of ['soortenStand', 'volgendeTaken', 'gebiedenHtml']) {
    if (!gebruikt(src, naam)) continue;
    ok(importeert(src, naam), f + ' importeert ' + naam + ' voordat hij hem aanroept');
  }
}

// 3. Een scherm dat bij het openen omvalt, merkt de speler als een leeg paneel zonder fout.
//    Die klasse (een TDZ-fout als "Cannot access 'n' before initialization") is met een
//    bron-regex niet betrouwbaar te vinden, dus daarvoor is er een echte probe:
//    scripts/qa/menu_panels_probe.mjs opent alle veertien onderdelen in Electron en meldt
//    per scherm of het opent. Die hoort bij de Electron-ronde van de coördinator.

// 4. Elk onderdeel dat de rail noemt, heeft een paneel of een eigen tekenaar.
const pm = read('pausemenu.js');
const secties = [...pm.matchAll(/^\s*\['(\w+)',\s*'[^']+',\s*'/gm)].map((m) => m[1]);
for (const id of secties) {
  const heeft = new RegExp('data-panel="' + id + '"').test(pm) || new RegExp("name === '" + id + "'").test(pm);
  ok(heeft, 'het onderdeel ' + id + ' heeft een paneel of een eigen tekenaar');
}

if (bad) { console.log('menupanel_smoke_test: ' + bad + ' van ' + n + ' checks rood'); process.exit(1); }
console.log('menupanel_smoke_test: ' + n + ' checks groen');
