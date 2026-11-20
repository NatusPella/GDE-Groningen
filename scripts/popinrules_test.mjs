// Pure regels tegen pop-in (#1016): zachte rand, laadstraal voorbij de tekenstraal, band in camera-afstand.
//   node scripts/popinrules_test.mjs
import assert from 'node:assert/strict';
import { edgeFadeAmount, edgeFadeKeep, ditherKept, bayer4, loadRadius, fadeBand, loadCoversView, REBUILD_STEP_M } from '../game/js/popinrules.js';

import { prefetchExtra, prefetchWanted, prefetchOrder, PREFETCH_EXTRA_MAX } from '../game/js/buildingprefetch.js';
import { createStreamAhead, advanceStreamAhead } from '../game/js/streambudget.js';

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
// de regel zelf: zonder marge zou een ding dat de camera nog ziet (camera-afstand < eind) buiten de lijst vallen
ok(130 < fadeBand(130)[1] + 4 + 8, 'zonder de marge (130) valt een zichtbaar ding buiten de lijst bij een herbouwstap');

// voorladen van gebouwen: in rust de vaste marge, snel vooruit meer, nooit achter de speler
ok(prefetchExtra(0) === 0 && prefetchExtra(15) === 0, 'stilstand en wandelen: geen extra marge');
ok(prefetchExtra(90) === PREFETCH_EXTRA_MAX, 'bij 30 m/s het plafond');
ok(prefetchExtra(500) === PREFETCH_EXTRA_MAX, 'nooit meer dan het plafond');
ok(prefetchExtra(40) > 0 && prefetchExtra(40) < prefetchExtra(80), 'de marge groeit met de snelheid');
ok(!prefetchWanted(100, 50, 140, 30, 90), 'binnen de ring is niet aan het voorladen');
ok(prefetchWanted(160, -50, 140, 30, 0), 'de vaste marge geldt ook achter de speler');
ok(!prefetchWanted(200, -50, 140, 30, 90), 'achter de speler geen extra marge');
ok(prefetchWanted(200, 50, 140, 30, 90), 'vooruit wel');
ok(!prefetchWanted(200, 50, 140, 30, 0), 'zonder snelheid niet verder dan de vaste marge');
ok(!prefetchWanted(300, 50, 140, 30, 90), 'ook vooruit niet voorbij de extra marge');
{
  const s = createStreamAhead();
  for (let i = 0; i < 120; i++) advanceStreamAhead(s, i * 0.5, 0, 1 / 60); // 30 m/s langs +x
  const mk = (x, y) => ({ bounds: [x - 5, y - 5, x + 5, y + 5] });
  const list = [mk(230, 0), mk(-190, 0), mk(180, 0), mk(60, 0)];
  const out = prefetchOrder(list, 60, 0, 100, 30, s, (b) => b === list[3], []);
  ok(out.length >= 2, 'er zijn kandidaten');
  ok(out.some((o) => o.b === list[0]) && out.some((o) => o.b === list[2]), 'vooruit liggende gebouwen voorbij de vaste marge doen mee');
  ok(!out.some((o) => o.b === list[1]), 'wat ver achter ligt niet');
  ok(!out.some((o) => o.b === list[3]), 'skip() sluit gebouwen uit');
  ok(out.every((o, i) => i === 0 || out[i - 1].rank <= o.rank), 'gesorteerd op rang');
}

console.log(`popinrules_test: ${n} controles groen`);
