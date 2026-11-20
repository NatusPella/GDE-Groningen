// Rekwisieten van vaste missieplannen tegen de tegels (21-11): de containerterminal van M13
// (containerplan.js) stond met de kraan 128 m van de kade in een weiland en twee containers op de Synergieweg.
// Telt per prop: op een rijbaan, in een gebouw of water, en de kraan te ver van water.
//
//   node scripts/world/mission_prop_audit.mjs [--strict] [--list]
//
// Draait het missiedeel van world_audit.mjs (zelfde tegelindex en drempels); zonder tegels: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit, CAPS } from './world_audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(ROOT, 'game/world');
if (!fs.existsSync(path.join(out, 'index-provincie.json'))) { console.log('SKIP geen game/world met de provinciegegevens'); process.exit(0); }
const R = await runAudit(out);
const keys = Object.keys(CAPS).filter((k) => k.startsWith('mission'));
let bad = 0;
console.log(`missieprops geteld: ${R.total.missionProps || 0}`);
for (const k of keys) {
  const v = R.counts[k] || 0;
  console.log(`${k.padEnd(28)} ${v}`);
  if (process.argv.includes('--list')) for (const s of R.samples[k] || []) console.log('   ' + JSON.stringify(s));
  if (v > CAPS[k]) bad++;
}
if (process.argv.includes('--strict') && bad) { console.log('TE VEEL missieprops op weg, in gebouw of ver van water'); process.exit(1); }
