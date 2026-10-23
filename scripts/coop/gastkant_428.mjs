// Coöp-testbank (#428): de twee helften van "de gast ziet wat de host ziet", na elkaar met één Electron tegelijk.
//   gastkant_428_voertuigen.mjs: voertuigen (echt model, kleur, deuken, lampen, wielen, rotor, boten, treinen)
//   gastkant_428_wereld.mjs: voetgangers, dieren, verkeerslichten, kapotte objecten, kermis
// Dezelfde argumenten als de losse scripts: node scripts/coop/gastkant_428.mjs --stage=<gestagede game-map> [--out=<map>]
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = process.argv.slice(2);
const uit = (arg.find((a) => a.startsWith('--out=')) || '').slice(6) || path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
const rest = arg.filter((a) => !a.startsWith('--out='));
let fout = 0;
for (const naam of ['voertuigen', 'wereld']) {
  console.log('== gastkant_428_' + naam);
  const r = spawnSync(process.execPath, [path.join(HERE, `gastkant_428_${naam}.mjs`), ...rest, `--out=${path.join(uit, naam)}`], { stdio: 'inherit' });
  if (r.status) fout = r.status;
}
process.exit(fout);
