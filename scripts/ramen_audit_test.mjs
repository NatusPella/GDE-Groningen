// De ramen dichtbij (#1016): de wereldaudit haalt de dekking (zonder wereld: SKIP) en scene3d.js gebruikt de regels van lodstable.js.
//   node scripts/ramen_audit_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. scene3d.js: elke regel van de ramen dichtbij is bedraad
const src = fs.readFileSync(path.join(ROOT, 'game/js/scene3d.js'), 'utf8');
for (const name of ['boundsDist', 'facadeFloor', 'buildRank', 'nearUrgent', 'ringFloor']) {
  ok(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from './lodstable.js'`).test(src), `${name} wordt uit lodstable.js geimporteerd`);
  ok(src.split(name).length > 2, `${name} wordt in scene3d.js gebruikt`);
}
ok(/facadeFloor\(facadeDetailDist \* facadeSpeedScale\(focusSpeed\)\)/.test(src), 'de gevelafstand met snelheid gaat door facadeFloor');
ok(/hystVisible\(det\.visible, boundsDist\(/.test(src), 'de kozijnen schakelen op de afstand tot de gevel, niet het middelpunt');
ok(/nearUrgent\(m\[4\], nearBuilt\)/.test(src), 'nabije gebouwen worden boven het budget gebouwd');

// 2. de wereldaudit (alleen met een gebouwde wereld)
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/world/ramen_audit.mjs'), '--strict', '--min=0.99'], { encoding: 'utf8', cwd: ROOT });
const out = (r.stdout || '') + (r.stderr || '');
if (/^SKIP/m.test(out)) console.log(out.trim().split('\n').find((l) => l.startsWith('SKIP')));
else {
  ok(r.status === 0, `ramen_audit --strict faalde:\n${out}`);
  const m = /dekking ([\d.]+)%/.exec(out);
  ok(m && Number(m[1]) >= 99, 'dekking van gevelvlakken met raamdata >= 99%');
  ok(/gevelvlakken met raamdata [1-9]\d*/.test(out), 'de steekproef is niet leeg');
}
console.log(`ramen_audit_test: ${n} controles groen`);
