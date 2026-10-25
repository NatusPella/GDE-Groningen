// De wereld in game/world is een build-artefact en staat niet in git, dus niemand merkt het als hij
// achterloopt. Dat gebeurde op 25-10: de wereld stamde van 18 oktober, van vóór merge_overlays (#314,
// C2), en drie wereldcontroles faalden daardoor (#491) — het leek data, het was een oude build.
//
// Deze test kijkt naar één harde eigenschap van een verse build: elke overlaytegel in
// index-provincie.json is leeg en wijst naar zijn stadstegel ({ ov: 1, in: ... }). Draagt een overlay
// nog zijn eigen rijen, dan is de wereld van vóór de samenvoeging en moet hij opnieuw gestaged worden.
//
//   node scripts/world_versie_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'game', 'world', 'index-provincie.json');
const stadium = path.join(ROOT, 'game', 'world', 'index.json');

if (!fs.existsSync(file)) {
  console.log('SKIP world_versie_test: geen game/world (cd desktop && npm run stage)');
  process.exit(0);
}

let idx;
try {
  idx = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.log('FAIL world_versie_test: index-provincie.json is geen geldige JSON (' + e.message + ')');
  process.exit(1);
}
const tiles = idx.tiles || idx;
const keys = Object.keys(tiles);
const overlays = keys.filter((k) => k.startsWith('o'));
const ongemerged = overlays.filter((k) => !(tiles[k] && tiles[k].ov === 1 && tiles[k].in));

const oud = fs.statSync(file).mtime;
const dagen = (Date.now() - oud.getTime()) / 86400000;

let fails = 0;
if (!keys.length) { console.log('FAIL world_versie_test: de index heeft geen tegels'); fails++; }
if (ongemerged.length) {
  console.log(`FAIL world_versie_test: ${ongemerged.length} van ${overlays.length} overlaytegels is niet samengevoegd ` +
    `(${ongemerged.slice(0, 5).join(', ')}). Deze wereld is van vóór merge_overlays; draai "cd desktop && npm run stage".`);
  fails++;
}
if (dagen > 30) {
  console.log(`LET OP world_versie_test: game/world is ${Math.round(dagen)} dagen oud (${oud.toISOString().slice(0, 10)}); ` +
    'een wereldcontrole op oude data zegt weinig.');
}

if (!fails) {
  console.log(`world_versie_test ok: ${keys.length} tegels, ${overlays.length} overlaytegels allemaal samengevoegd` +
    (fs.existsSync(stadium) ? ', stad-index aanwezig' : ', geen stad-index (kan kloppen)'));
}
process.exit(fails ? 1 : 0);
