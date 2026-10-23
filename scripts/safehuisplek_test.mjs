// Waar een safehouse mag staan (#414, safehuisplek.js), op de echte stadskaart en zonder Electron: elk huisje dat de plaatsing kiest, voldoet aan de eisen van de
// spotcheck (de verhaaltest "all spots reachable": niet in het water, niet in een gebouw, je kunt er weg lopen), het huisje zelf en de plek bij de deur.
//   node scripts/safehuisplek_test.mjs [--list]
// De stad komt uit data/cache/province (zoals de andere stadstests; ontbreekt die, dan SKIP). Het platteland (de Ommelanden, countryplan.js) draait niet in node:
// daar geldt dezelfde code, maar de test controleert alleen de stad; de verhaaltest doet de rest.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadCityWorld } from './lib/loadworld.mjs';
import { isInWater, pointInPolygon } from '../game/js/util.js';
import { inPassage } from '../game/js/passages.js';
import { puntInGebied, ontvouw } from '../game/js/grenzen.js';
import * as P from '../game/js/safehuisplek.js';

const { map } = await loadCityWorld();
const grenzen = ontvouw(JSON.parse(fs.readFileSync(fileURLToPath(new URL('../game/grenzen.json', import.meta.url)), 'utf8')));
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

const D = { isInWater, pointInPolygon, inPassage, provinceLandAt: () => true, puntInGebied, landSolid: null };
const b = (map.meta && map.meta.bounds) || map.bounds;
const inStad = (x, y) => b && x > b[0] + 150 && x < b[2] - 150 && y > b[1] + 150 && y < b[3] - 150;

// De eisen van spotcheck.js spotProblem voor een looppunt, nog eens los opgeschreven (het gebouw, het water en het weglopen).
function probleem(x, y) {
  if (isInWater(map, x, y)) return 'in het water';
  for (const bw of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = bw.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy || !pointInPolygon(x, y, bw.pts)) continue;
    if (inPassage(map, bw, x, y)) continue;
    return 'in een gebouw';
  }
  if (!map.canWalkOut(x, y, 45)) return 'ingesloten, je kunt er niet weg';
  return null;
}

// Alle wijken en woonplaatsen waarvan het binnenpunt in de stad ligt, zoals safehuizen.js ze indeelt.
const gebieden = [...grenzen.wijken, ...grenzen.woonplaatsen].filter((g) => inStad(g.c[0], g.c[1]));
t('er zijn genoeg gebieden in de stadskaart om te testen', () => { assert.ok(gebieden.length >= 8, String(gebieden.length)); });

const plekken = new Map();
for (const g of gebieden) plekken.set(g.id, P.zoekPlek({ x0: g.c[0], y0: g.c[1], ang: 0, grens: g }, map, D, 0.3));
const gevonden = gebieden.filter((g) => plekken.get(g.id));
t('bijna elk gebied in de stad krijgt een huisje (een onbruikbaar huisje hoort uitzondering te zijn)', () => {
  assert.ok(gevonden.length >= gebieden.length * 0.9, `${gevonden.length} van ${gebieden.length}`);
});
t('elk gekozen huisje voldoet aan de spotcheck: het midden, de vier hoeken en de plek bij de deur', () => {
  const slecht = [];
  for (const g of gevonden) {
    const q = plekken.get(g.id);
    const fx = Math.cos(q.ang), fy = Math.sin(q.ang), rx = -fy, ry = fx;
    const punten = { midden: [q.x, q.y], deur: [q.x + fx * P.DEUR_AFSTAND, q.y + fy * P.DEUR_AFSTAND],
      hoek1: [q.x + fx * P.HX + rx * P.HZ, q.y + fy * P.HX + ry * P.HZ], hoek2: [q.x - fx * P.HX - rx * P.HZ, q.y - fy * P.HX - ry * P.HZ] };
    for (const [naam, [x, y]] of Object.entries(punten)) { const w = probleem(x, y); if (w) slecht.push(`${g.naam} ${naam} (${x.toFixed(1)}, ${y.toFixed(1)}): ${w}`); }
  }
  assert.deepEqual(slecht, []);
});
t('de woning blijft bij haar gebied: de plek ligt hooguit 900 m van het binnenpunt of in het gebied zelf', () => {
  for (const g of gevonden) {
    const q = plekken.get(g.id);
    const d = Math.hypot(q.x - g.c[0], q.y - g.c[1]);
    assert.ok(d <= 900 || puntInGebied(g, q.x, q.y), `${g.naam}: ${d.toFixed(0)} m van het binnenpunt`);
  }
});
t('de plekken van de verhaaltest: de twee gemelde huisjes die in een gebouw of ingesloten stonden, staan nu vrij', () => {
  // Safehouse Groningen stond op (-101.9, -321.9) in een gebouw, Safehouse Winschoten op (31600.3, 8139) ingesloten (Winschoten ligt buiten de stadskaart)
  const g = grenzen.woonplaatsen.find((x) => x.naam === 'Groningen');
  const oud = { x: -101.9, y: -321.9 };
  assert.ok(probleem(oud.x, oud.y), 'de oude plek had inderdaad een probleem: ' + probleem(oud.x, oud.y));
  const q = P.zoekPlek({ x0: oud.x, y0: oud.y, ang: 0, grens: g }, map, D, 0);
  assert.ok(q, 'er is een nieuwe plek');
  const door = P.deurVan(q.x, q.y, q.ang);
  assert.equal(probleem(door.x, door.y), null);
  assert.equal(probleem(q.x, q.y), null);
});
t('een plek in het water of in een gebouw wordt nooit gekozen (de eisen zelf)', () => {
  let nat = null;
  for (const w of map.water.slice(0, 40)) {
    const xs = w.pts.map((q) => q[0]), ys = w.pts.map((q) => q[1]);
    for (let i = 1; i < 10 && !nat; i++) for (let j = 1; j < 10 && !nat; j++) {
      const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / 10, y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * j / 10;
      if (isInWater(map, x, y)) nat = [x, y];
    }
    if (nat) break;
  }
  assert.ok(nat, 'een natte plek gevonden');
  assert.equal(P.bruikbaar(map, nat[0], nat[1], D), false, 'water');
  let gebouw = null;
  for (const bw of map.buildingsNear(0, 0, 150)) {
    const cx = bw.pts.reduce((a2, q) => a2 + q[0], 0) / bw.pts.length, cy = bw.pts.reduce((a2, q) => a2 + q[1], 0) / bw.pts.length;
    if (pointInPolygon(cx, cy, bw.pts) && !inPassage(map, bw, cx, cy)) { gebouw = [cx, cy]; break; }
  }
  assert.ok(gebouw, 'een gebouw gevonden');
  assert.equal(P.bruikbaar(map, gebouw[0], gebouw[1], D), false, 'gebouw');
  assert.equal(P.bruikbaar(map, NaN, 0, D), false);
});
t('landSolid (het platteland) wordt gevraagd en kan een plek weigeren', () => {
  const g = gevonden[0];
  const q = plekken.get(g.id);
  assert.equal(P.bruikbaar(map, q.x, q.y, { ...D, landSolid: () => true }), false);
  assert.equal(P.bruikbaar(map, q.x, q.y, { ...D, landSolid: () => false }), true);
});

if (process.argv.includes('--list')) console.log(gebieden.map((g) => `${g.id} ${g.naam}: ${plekken.get(g.id) ? 'plek' : 'GEEN'}`).join('\n'));
console.log(`${n - fails}/${n} geslaagd (${gevonden.length} van ${gebieden.length} gebieden kregen een huisje)`);
process.exit(fails ? 1 : 0);
