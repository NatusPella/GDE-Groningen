// Rooktest op de opbouw van elk pauzemenu-onderdeel (#980): een scherm dat bij het openen
// een ReferenceError geeft, valt in het spel stil om — de speler ziet dan een leeg paneel en
// geen fout. Dat overkwam Veroverd: `soortenStand()` werd aangeroepen zonder import. Geen
// enkele bron-regex-test zag dat, want de aanroep stond er netjes.
//
// Deze test laadt elke module die een paneel tekent en controleert dat de namen die hij
// gebruikt ook echt bestaan: geïmporteerd of in het bestand gedefinieerd. Het is de
// statische tegenhanger van de probe die het in de echte app vond, en hij draait in de
// lichte suite.
//   node scripts/menupanel_smoke_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game/js', f), 'utf8');
let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL ' + name); } };

// De modules achter de twaalf pauzemenu-onderdelen, plus wat ze aanroepen.
const PANELEN = [
  'pausemenu.js', 'veroverdpanel.js', 'loopbaanui.js', 'achievementsui.js',
  'spullen.js', 'todoui.js', 'garageui.js', 'verhaalui.js',
  'cheatsui.js', 'fotomodusui.js', 'gebiedenui.js', 'mapview.js',
];

// 1. Elke paneelmodule moet zijn eigen namen dekken: undef_check doet dat per bestand.
for (const f of PANELEN) {
  ok(fs.existsSync(path.join(root, 'game/js', f)), `${f} bestaat`);
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/undef_check.mjs'), path.join(root, 'game/js', f)], { encoding: 'utf8' });
  const uit = `${r.stdout || ''}${r.stderr || ''}`;
  ok(r.status === 0, `${f}: geen ongedefinieerde namen (${uit.trim().split('\n').pop()})`);
}

// 2. Een paneel dat een export van een andere module gebruikt, moet hem ook importeren.
//    Dit is de fout die Veroverd had: de aanroep klopt, de import ontbreekt.
const gebruikt = (src, naam) => new RegExp(`\\b${naam}\\s*\\(`).test(src);
const importeert = (src, naam) => {
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
    const namen = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim());
    if (namen.includes(naam)) return true;
  }
  return false;
};
for (const f of PANELEN) {
  const src = read(f);
  // gebiedenui.js is de DEFINITIE van deze namen; daar hoeft niets geimporteerd te worden.
  if (f === 'gebiedenui.js') continue;
  for (const naam of ['soortenStand', 'volgendeTaken', 'gebiedenHtml']) {
    if (!gebruikt(src, naam)) continue;
    ok(importeert(src, naam), `${f} importeert ${naam} voordat hij hem aanroept`);
  }
}

// 3. Elk onderdeel dat de rail noemt, heeft een paneel in de DOM-opbouw.
const pm = read('pausemenu.js');
const secties = [...pm.matchAll(/^\s*\['(\w+)',\s*'[^']+',\s*'/gm)].map((m) => m[1]);
for (const id of secties) {
  const heeftPaneel = new RegExp(`data-panel="${id}"`).test(pm) || new RegExp(`name === '${id}'`).test(pm);
  ok(heeftPaneel, `het onderdeel ${id} heeft een paneel of een eigen tekenaar`);
}

if (bad) { console.log(`menupanel_smoke_test: ${bad} van ${n} checks rood`); process.exit(1); }
console.log(`menupanel_smoke_test: ${n} checks groen`);
