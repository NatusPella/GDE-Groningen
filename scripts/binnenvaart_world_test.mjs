// De kades van De Drie Zusters op de echte kaart (#1376, W3): komt een spits van 38,5 m van elke kade naar elke andere?
//   node scripts/binnenvaart_world_test.mjs
// Draait hull_route_audit --kind=spits per overtocht; heeft game/world met de provinciewereld nodig, zonder dat SKIP.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { findWorld } from './lib/worldlocator.mjs';
import { overtochten, kadeById } from '../game/js/binnenvaartrules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!findWorld(root)) { console.log('SKIP geen game/world met de provincie'); process.exit(0); }
let fails = 0, n = 0;
for (const o of overtochten()) {
  const a = kadeById(o.van).water, b = kadeById(o.naar).water;
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'hull_route_audit.mjs'), a.x, a.y, b.x, b.y, '--kind=spits'], { encoding: 'utf8', env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  n++;
  const goed = r.status === 0 && /dichte plekken waar de romp niet door kan: 0/.test(out) && !/GEEN ROUTE/.test(out);
  if (!goed) { fails++; console.log(`FAIL ${o.id}: ${out.split('\n').slice(-4).join(' | ')}`); }
}
console.log(`binnenvaart_world_test: ${n - fails}/${n} overtochten varen door voor een spits`);
process.exit(fails ? 1 : 0);
