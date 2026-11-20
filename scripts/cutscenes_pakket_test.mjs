// Elke geregisseerde scène past als scenepakket in het gastnet (coopcut.js CUT_MAX_CHARS) (#955 #956, #715):
// pose-clips en regiesjablonen zijn extra cues en shots in de definitie, dus ze tellen mee.
//   node scripts/cutscenes_pakket_test.mjs
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../game/js/cutpreview.js';
import { cutPakket, cutPakketMaat, CUT_MAX_CHARS } from '../game/js/coopcut.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const cat = buildCatalog({ script, npcSource }).filter((e) => e.scene && e.def);
const maten = [];
for (const e of cat) {
  const m = cutPakketMaat(cutPakket({ def: e.def, lines: e.lines, duration: e.duration, anchor: { x: 10.5, y: -4, facing: 1.2, z: 0 }, cine: { id: e.id } }));
  maten.push([e.id, m.tekens]);
  ok(m.past, `scène ${e.id} past in het net (${m.tekens} van ${m.max} tekens)`);
}
maten.sort((a, b) => b[1] - a[1]);
console.log(`cutscenes_pakket_test: ${cat.length} scènes, grootste ${maten.slice(0, 3).map(([id, t]) => id + '=' + t).join(' ')} van ${CUT_MAX_CHARS} tekens`);
if (fails) { console.log(`${fails} of ${n} checks FAILED`); process.exit(1); }
console.log(`cutscenes_pakket_test: ${n} checks ok`);
