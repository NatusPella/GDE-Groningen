// De duif zet zowel x als y van de speler (een regel `pl.x = ... P.x` was weg, #166)
// en zet de vlieghoogte voor breakables.js footKicks. Brontest: pigeonmode.js trekt three binnen.
//   node scripts/pigeon_sync_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js', 'pigeonmode.js'), 'utf8');
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('MISLUKT: ' + m); } };
ok(/pl\.x\s*=\s*lastSet\.x\s*=\s*P\.x\s*;/.test(src), 'updatePigeonMode zet pl.x = lastSet.x = P.x');
ok(/pl\.y\s*=\s*lastSet\.y\s*=\s*P\.y\s*;/.test(src), 'updatePigeonMode zet pl.y = lastSet.y = P.y');
ok((src.match(/world\.pigeonAlt\s*=/g) || []).length === 1, 'world.pigeonAlt wordt op één plek gezet');
console.log(bad ? `${bad} MISLUKT` : 'pigeon_sync: alles ok');
process.exit(bad ? 1 : 0);
