// Bedrading van de soepele streaming (#1016, #1052, #1008): de statische no-undef-controle op alle geraakte bestanden (de les van
// `_bPre`: `node --check` ziet een ongedeclareerde naam niet), en dat elk systeem zijn tijd bij de gedeelde planner vraagt.
//   node scripts/streamsoepel_wiring_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const files = ['scene3d.js', 'main.js', 'grass.js', 'farlod.js', 'tileplace.js', 'tilestream.js', 'tileworld.js', 'streamplanner.js', 'lodstable.js', 'placementurgency.js',
  'roadbudget.js', 'routing.js', 'containerplan.js', 'missions_nieuw.js', 'pedroutes.js', 'streetfurniture3d.js', 'trafficlights.js', 'streekplekken3d.js', 'waterplekken3d.js'].map((f) => 'game/js/' + f);
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'undef_check.mjs'), ...files.map((f) => path.join(ROOT, f))], { encoding: 'utf8' });
ok(r.status === 0, `undef_check op de geraakte bestanden: ${(r.stdout + r.stderr).trim().slice(0, 600)}`);

const scene = read('game/js/scene3d.js'), main = read('game/js/main.js'), grass = read('game/js/grass.js'), far = read('game/js/farlod.js');
// elk systeem vraagt zijn tijd aan de planner, in zijn eigen klasse, en meldt wat het uitgaf
for (const [cls, n1] of [['building', 2], ['road', 2], ['actors', 3], ['far', 1]]) {
  ok((scene.match(new RegExp(`plan\\.grant\\('${cls}'`, 'g')) || []).length >= n1, `scene3d.js vraagt '${cls}' aan de planner (${n1}x of vaker)`);
  ok(new RegExp(`plan\\.spend\\('${cls}'`).test(scene), `scene3d.js meldt de uitgave van '${cls}'`);
}
ok(/planner\.beginFrame\(/.test(main) && /planner\.grant\('tile'/.test(main) && /planner\.spend\('tile'/.test(main), 'main.js begint de frame en vraagt de tegeltijd');
ok(/grant\('ground'/.test(grass) && /spend\('ground'/.test(grass), 'grass.js vraagt zijn tijd aan de planner');
ok(/createCooler/.test(grass) && /createCooler/.test(far), 'gras en de verre laag ruimen met vertraging op');
// de ring met uitzonderingen
ok(/uLodKeep/.test(far) && /uLodKeepN/.test(far) && /keepFar/.test(far), 'farlod.js kent de uitzonderingen op de ring (shader)');
ok(/selectRing\(/.test(scene) && /createRingSmoother\(/.test(scene) && /ringKeep/.test(scene), 'scene3d.js kiest de ring met uitzonderingen en de smoother');
ok(/perfOff\('ringuitzondering'\)/.test(scene) && /perfOff\('kozijnfade'\)/.test(scene) && /perfOff\('ringsnelheid'\)/.test(scene) && /perfOff\('planner'\)/.test(main), 'elke nieuwe regel heeft een perfoff-schakelaar voor een A/B in Electron');
// de kozijnfade en hysterese
ok(/hystVisible\(/.test(scene) && /applyEdgeFade\(m, 1e9/.test(scene) && /reducedMotion\(\)/.test(scene), 'kozijnen: hysterese en zachte rand, met verminderde beweging');
// de omvangsgrens van scene3d.js (#497)
ok(scene.split(/\r?\n/).length - (/\n$/.test(scene) ? 1 : 0) < 4500, 'scene3d.js blijft onder 4500 regels');

console.log(`streamsoepel_wiring_test: ${n} controles groen`);
