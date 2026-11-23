// Bedrading van de pop-in-wijzigingen (#1016): elke nieuwe naam in scene3d.js, grass.js en de nieuwe modules is
// gedeclareerd of geïmporteerd. Een (inmiddels teruggedraaide) poging liet `_bPre` ongedefinieerd: `node --check` ziet dat niet, en de
// ReferenceError kwam pas elk beeld in het spel ("Er ging iets mis: _bPre is not defined").
//   node scripts/popin_wiring_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. de statische no-undef-controle op de geraakte bestanden (zelfde als scripts/undef_check.mjs)
const files = ['game/js/scene3d.js', 'game/js/grass.js', 'game/js/edgefade3d.js', 'game/js/popinrules.js', 'game/js/trailer.js'];
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'undef_check.mjs'), ...files.map((f) => path.join(ROOT, f))], { encoding: 'utf8' });
ok(r.status === 0, `undef_check op de pop-in-bestanden: ${(r.stdout + r.stderr).trim().slice(0, 400)}`);

// 2. elke nieuwe naam heeft een declaratie in zijn eigen bestand, en wat scene3d.js gebruikt staat in zijn imports
const scene = read('game/js/scene3d.js');
const declared = (src, name) => new RegExp(`(?:const|let|var|function)\\s+${name}\\b|,\\s*${name}\\s*=`).test(src); // ook \`const a = 1, name = 2\``
for (const name of ['TREE_NEAR_R', 'TREE_FAR_MAT', 'VEH_KEEP_EXTRA']) ok(declared(scene, name), `${name} is gedeclareerd in scene3d.js`);
ok(declared(read('game/js/grass.js'), 'GRASS_PREBUILD'), 'GRASS_PREBUILD is gedeclareerd in grass.js');
for (const [name, from] of [['applyEdgeFade', './edgefade3d.js'], ['edgeFadeClone', './edgefade3d.js'], ['fadeBand', './popinrules.js'], ['loadRadius', './popinrules.js']]) {
  ok(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'${from.replace(/\./g, '\\.')}'`).test(scene), `${name} wordt uit ${from} geïmporteerd`);
}

// 3. de omvangsgrens van scene3d.js (#497) blijft gehaald
ok(scene.split(/\r?\n/).length - (/\n$/.test(scene) ? 1 : 0) < 4500, 'scene3d.js blijft onder 4500 regels');

// 4. de benchmark begint elke shot op een geladen plek (24-11): de poort onder zwart met het laadbudget, zonder meting van de wachttijd
const trailer = read('game/js/trailer.js');
ok(trailer.includes('const benchGate = (now, dt) =>') && trailer.includes('benchGate(now, dt)'), 'trailer.js: benchGate bestaat en wordt in de lus gebruikt');
ok(trailer.includes('cineJumpLoading = true') && trailer.includes('cineJumpLoading = false'), 'trailer.js: de poort zet het laadbudget aan en weer uit');
ok(trailer.includes('!r.gate && st / k > benchMeasureAfter'), 'trailer.js: tijdens de poort worden geen frametijden gemeten');

console.log(`popin_wiring_test: ${n} controles groen`);
