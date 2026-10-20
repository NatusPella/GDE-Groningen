// Profile audit (docs/PROVINCIE-PLAN.md 2.11) on the current map: the height
// solver's checks (scripts/world/profile.mjs audit: grade per class, vertical
// curves, steps at joints, clearance per class, steps between overlapping
// ribbons) and the ring's lanes free of solids (ringcheck.js probeRingSolids).
//   node scripts/world/audit_profile.mjs [--strict]
// --strict exits 1 on a grade over the limit, a step at a joint, a car road
// under its clearance or a solid on the ring's lanes.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { audit, printAudit } = await import('./profile.mjs');
const { CAR } = await import('../../game/js/roadprofile.js');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/citymap.json'), 'utf8'));
const rep = audit(data);
printAudit(rep);
// car roads under their clearance (foot and cycle ways under a ring road are
// listed above; the game keeps those paths at street level for now)
const carLow = rep.clearance.filter((q) => CAR.has(q.loCat) || q.loCat === 'rail');
console.log(`car roads and rails under the clearance: ${carLow.length}`);

const P = await import('./pack_tiles.mjs');
const { map } = await P.loadSourcesLaag();
const { probeRingSolids } = await import('../../game/js/ringcheck.js');
await import('../../game/js/player.js');
const hits = probeRingSolids({ map, flitspaalen: [] });
console.log(`ring and numbered roads, solids on the lanes: ${hits.length}`);
if (process.argv.includes('--strict') && (rep.steep.length || rep.joints.length || carLow.length || hits.length)) process.exit(1);
