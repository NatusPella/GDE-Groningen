// De "Te zien: …"-regel op de wijkkaart noemt alleen bezienswaardigheden van de wijk zelf (#725):
// de echte buurtgrens uit game/grenzen.json beslist, niet de dichtstbijzijnde buurtpunt binnen 700 m.
//   node scripts/wijk_highlights_test.mjs
// 1. elke highlight van elke wijkkaart ligt binnen de buurt van die kaart en is een bekend landmark;
// 2. de oude regel (dichtstbijzijnde buurtpunt) zou in deze data minstens één landmark van een
//    andere buurt noemen, en die staat nu niet meer op de kaart;
// 3. zonder geladen grenzen valt de kaart terug op die oude regel (geen crash, wel een highlight).
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../game/', import.meta.url);
const { ontvouw, gebiedIn, puntInGebied } = await import('../game/js/grenzen.js');
const CI = await import('../game/js/cinematics.js');

const stad = JSON.parse(fs.readFileSync(new URL('stad.json', root), 'utf8'));
const grenzen = ontvouw(JSON.parse(fs.readFileSync(new URL('grenzen.json', root), 'utf8')));
const pts = stad.meta.neighbourhoodPoints || [];
const landmarks = stad.meta.landmarks || [];
const world = { map: { meta: { neighbourhoodPoints: pts, landmarks } } };

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const buurtVan = (p) => gebiedIn(grenzen.buurten || [], p.x, p.y) || gebiedIn(grenzen.wijken || [], p.x, p.y);

// --- 1. every highlight lies in the card's own buurt
CI.setCinematicLinks({ getGrenzen: () => grenzen });
let cards = 0, shown = 0;
for (const p of pts) {
  const buurt = buurtVan(p);
  if (!buurt) continue;
  const hi = CI.wijkHighlights(world, p.name);
  cards++;
  if (hi.length > 3) fail(`${p.name}: ${hi.length} highlights (max 3)`);
  if (new Set(hi).size !== hi.length) fail(`${p.name}: duplicate highlight`);
  for (const name of hi) {
    shown++;
    const l = landmarks.find((lm) => lm.name === name);
    if (!l) { fail(`${p.name}: '${name}' is no landmark of the map`); continue; }
    if (!puntInGebied(buurt, l.x, l.y)) fail(`${p.name}: '${name}' lies outside its buurt ${buurt.naam}`);
  }
}

// --- 2. the old rule's wrong highlight is gone
const nearestName = (l) => {
  let best = null, bestD2 = Infinity;
  for (const q of pts) { const d2 = (q.x - l.x) ** 2 + (q.y - l.y) ** 2; if (d2 < bestD2) { bestD2 = d2; best = q; } }
  return { name: best && best.name, d2: bestD2 };
};
let wrongBefore = 0;
for (const p of pts) {
  const buurt = buurtVan(p);
  if (!buurt) continue;
  const hi = CI.wijkHighlights(world, p.name);
  for (const l of landmarks) {
    const n = nearestName(l);
    if (n.name !== p.name || n.d2 >= 700 * 700) continue;
    if (puntInGebied(buurt, l.x, l.y)) continue;
    wrongBefore++;
    if (hi.includes(l.name)) fail(`${p.name}: old neighbour '${l.name}' still on the card`);
  }
}
if (!wrongBefore) fail('no wrong-highlight case in this data: the test proves nothing');

// --- 3. fallback without grenzen: the old nearest-point rule, no crash
CI.setCinematicLinks({ getGrenzen: () => null });
let fallback = 0;
for (const p of pts) fallback += CI.wijkHighlights(world, p.name).length;
if (!fallback) fail('without grenzen the card lost its highlights entirely');

console.log(`wijk highlights: ${cards} cards, ${shown} highlights, ${wrongBefore} old wrong ones now filtered, ${fallback} on the fallback rule`);
console.log(fails ? `${fails} failure(s)` : 'wijk highlights: ok');
process.exit(fails ? 1 : 0);
