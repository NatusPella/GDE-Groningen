// Het Peerd van Ome Loeks (game/js/flavour.js, issue #172) staat op een vaste
// plek: het midden van een rotonde van de stadskaart, dezelfde positie in elke
// build en elke nacht, ook zonder dat er tegels geladen zijn.
//   node scripts/peerd_test.mjs
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../game/js/flavour.js', import.meta.url), 'utf8');
const m = /export const PEERD_SPOT = (\{[^}]*\});/.exec(src);
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
check(!!m, 'PEERD_SPOT is een vaste constante');
const spot = m ? Function(`return ${m[1]}`)() : { x: 0, y: 0 };
check(Number.isFinite(spot.x) && Number.isFinite(spot.y) && Number.isFinite(spot.angle), 'PEERD_SPOT is volledig');

// geen seed, nacht of tegelvolgorde in de keuze van de plek
const place = /function placePeerd\(\) \{([\s\S]*?)\n\}/.exec(src);
check(place && !/F\.night|Math\.random|islands|list\[/.test(place[1]), 'placePeerd hangt niet van nacht, toeval of tegels af');

// de plek is het midden van een echte rotonde (zoals de kaart ze kent)
const { loadStadData } = await import('./lib/loadworld.mjs');
const map = await loadStadData();
let best = Infinity, ring = null;
for (const r of map.roads) {
  if (!r.roundabout || r.z) continue;
  let x = 0, y = 0;
  for (const q of r.pts) { x += q[0]; y += q[1]; }
  x /= r.pts.length; y /= r.pts.length;
  const d = Math.hypot(x - spot.x, y - spot.y);
  if (d < best) { best = d; ring = r; }
}
check(ring && best < 2, `PEERD_SPOT ligt ${best.toFixed(1)} m van het midden van een rotonde`);
if (ring) {
  const rad = ring.pts.reduce((s, q) => s + Math.hypot(q[0] - spot.x, q[1] - spot.y), 0) / ring.pts.length;
  check(rad >= 7 && rad <= 60, `de rotonde heeft ruimte voor een beeld (straal ${rad.toFixed(1)})`);
}
// de kaart wordt in elke build gelijk ingelezen: twee keer lezen geeft dezelfde plek
check(JSON.stringify(Function(`return ${/export const PEERD_SPOT = (\{[^}]*\});/.exec(src)[1]}`)()) === JSON.stringify(spot), 'twee keer lezen geeft dezelfde plek');

console.log(fails.length ? 'FAIL\n' + fails.join('\n') : `ok (${ring && ring.name ? ring.name : 'rotonde'} op ${spot.x}, ${spot.y})`);
process.exit(fails.length ? 1 : 0);
