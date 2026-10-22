// Bewaking voor #382: geen coplanaire vlakken met een ander uiterlijk meer in de voertuigmeshes, zoals het
// busbord dat exact op het deurblad lag. Draait scripts/zfight_audit.mjs --vehicles (alle voertuigen, de bus met zijn
// drie borden, politie, ambulance en de bijzondere voertuigen) en eist 0 paren voor alles zonder berijder; de fietsen
// en scooters hebben nog haar- en torsolagen van de berijder die elkaar raken (models3d_people.js), daar telt een
// bovengrens zodat het niet erger wordt.
//   node scripts/vehicle_zfight_test.mjs   (eenmalig: cd desktop && npm run stage)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, 'zfight_audit.mjs'), '--vehicles', '--json', '--top=1'], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (r.status !== 0) { console.log('FAIL: zfight_audit eindigde met', r.status, r.stderr.slice(-500)); process.exit(1); }
const rep = JSON.parse(r.stdout);
const RIDER_MAX = { 'vehicle:bike': 11, 'vehicle:scooter': 15 };
let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const mods = Object.entries(rep.modules);
check('voertuigen gebouwd', mods.length >= 20, 'modules ' + mods.length);
for (const [m, s] of mods) {
  const max = RIDER_MAX[m] ?? 0;
  check(`${m}: coplanaire paren <= ${max}`, s.pairs <= max, `${s.pairs} paren (flush ${s.flush.toFixed(3)} m2, close ${s.close.toFixed(3)} m2)`);
}
check('de bus met borden is erbij', mods.some(([m]) => m === 'vehicle:bus+borden'));
check('geen flush-oppervlak buiten de berijders', mods.every(([m, s]) => /bike|scooter/.test(m) || s.flush === 0));
console.log(bad ? `${bad} mislukt` : `vehicle_zfight_test: ok (${mods.length} voertuigen)`);
process.exit(bad ? 1 : 0);
