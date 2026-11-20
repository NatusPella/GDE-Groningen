// Pure regels tegen pop-in (#1016): zachte rand, laadstraal voorbij de tekenstraal, band in camera-afstand.
//   node scripts/popinrules_test.mjs
import assert from 'node:assert/strict';
import { edgeFadeAmount, edgeFadeKeep, ditherKept, bayer4, loadRadius, fadeBand, loadCoversView, REBUILD_STEP_M } from '../game/js/popinrules.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// de rand: 0 voor de start, 1 na het eind, lineair ertussen
ok(edgeFadeAmount(100, 114, 126) === 0, 'voor de band niets uitgedoofd');
ok(edgeFadeAmount(130, 114, 126) === 1, 'voorbij de band alles weg');
ok(Math.abs(edgeFadeAmount(120, 114, 126) - 0.5) < 1e-9, 'halverwege de band de helft');
ok(edgeFadeKeep(120, 114, 126) === 0.5, 'keep is 1 - amount');
ok(edgeFadeAmount(5, 10, 10) === 0 && edgeFadeAmount(15, 10, 10) === 1, 'een band zonder breedte is een harde rand, zonder NaN');

// de dither houdt over een 4x4-blok ongeveer de behoudfractie over en is monotoon in de afstand
for (const d of [114, 117, 120, 123, 126]) {
  let kept = 0;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) if (ditherKept(d, 114, 126, x, y)) kept++;
  ok(Math.abs(kept / 16 - edgeFadeKeep(d, 114, 126)) <= 1 / 8 + 1e-9, `dither bij ${d} m houdt ${kept}/16`);
}
let prev = 17;
for (let d = 112; d <= 128; d++) {
  let kept = 0;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) if (ditherKept(d, 114, 126, x, y)) kept++;
  ok(kept <= prev, 'meer afstand houdt nooit meer pixels over');
  prev = kept;
}
const vals = new Set();
for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { const b = bayer4(x, y); ok(b >= 0 && b < 1, 'bayer in [0,1)'); vals.add(b.toFixed(4)); }
ok(vals.size >= 8, 'de dither heeft genoeg niveaus');

// laadstraal: voorbij de tekenstraal met minstens de herbouwstap
ok(loadRadius(130) === 130 + REBUILD_STEP_M, 'laadstraal = teken + herbouwstap');
ok(loadRadius(130, 8, 20) === 158, 'extra marge (vooruitkijken) komt erbij');
ok(loadRadius(130, -5, -5) === 130, 'negatieve marges tellen niet');

// band: eindigt vóór de tekenstraal zodat de camera achter het aandachtspunt hem niet te laat ziet
const [s, e] = fadeBand(130);
ok(s === 114 && e === 126, 'band 114-126 bij 130 m');
const [fs, fe] = fadeBand(260, 24);
ok(fs === 232 && fe === 256, 'verre kronen: bredere band');
ok(loadCoversView(130) && loadCoversView(260, 8, 4, 24), 'de laadstraal dekt alles wat de band nog toont');
ok(!loadCoversView(130, -50, 4, 12) || true, 'een negatieve stap mag niet crashen');
// de regel zelf: zonder marge zou een ding dat de camera nog ziet (camera-afstand < eind) buiten de lijst vallen
ok(130 < fadeBand(130)[1] + 4 + 8, 'zonder de marge (130) valt een zichtbaar ding buiten de lijst bij een herbouwstap');

console.log(`popinrules_test: ${n} controles groen`);
