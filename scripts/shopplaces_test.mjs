// De echte winkels en cafés van de hele provincie (shopplaces.json, issue #175) in het spel:
// ze nemen de plek van dezelfde soorten uit facilities.json in (geen dubbele), liggen in
// de gebouwde wereld, buiten water, hangen aan een gebouw op de tegel, en de deuren
// (shops.js placeCountryShops, tegels erbij geladen) landen op open grond met hun
// verzonnen naam. Heeft game/world nodig (desktop stage); anders SKIP.
//   node scripts/shopplaces_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { loadGameWorld } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const root = new URL('../game/', import.meta.url);
await import('../game/js/player.js');
const F = await import('../game/js/countryfield.js');
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
F.setCountryBounds(map.meta.bounds);
ensureCountryEdge(map);
const TP = await import('../game/js/tileplace.js');
const Fac = await import('../game/js/facilities.js');
const SB = await import('../game/js/shopbind.js');
const { isInWater } = await import('../game/js/util.js');
const raw = JSON.parse(fs.readFileSync(new URL('facilities.json', root)));
Fac.initFacilities(map, raw);
const before = Fac.FAC.all.length;
const n = Fac.initShopPlaces(map, JSON.parse(fs.readFileSync(new URL('shopplaces.json', root))));

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; if (fails < 25) console.log('FAIL ' + m); } };

ok(n > 300, `de plaatsen komen in het spel (${n})`);
const sp = Fac.FAC.all.filter((f) => f.sp);
ok(sp.length === n, 'FAC bevat ze allemaal');
// geen dubbele: oude soorten buiten de stad zijn vervangen, en geen twee gelijke soorten op 4 m
ok(!Fac.FAC.all.some((f) => !f.city && !f.sp && SB.REPLACED_KINDS.includes(f.kind)), 'oude soorten buiten de stad zijn vervangen');
const seen = new Set();
for (const f of sp) {
  const k = f.kind + '|' + Math.round(f.x / 4) + '|' + Math.round(f.y / 4);
  ok(!seen.has(k), `geen dubbele ${f.kind} op (${Math.round(f.x)}, ${Math.round(f.y)})`);
  seen.add(k);
  ok(f.own && f.name === f.own && !SB.isChain({ name: f.own }), `verzonnen naam voor ${f.kind}: ${f.own}`);
  ok(!f.city && Fac.inBuiltWorld(map.meta, f.x, f.y, 0), 'in de gebouwde wereld, buiten de stad');
  ok(!isInWater(map, f.x, f.y), `niet in het water (${Math.round(f.x)}, ${Math.round(f.y)})`);
}
ok(Fac.FAC.all.length >= before - 2500 && Fac.FAC.all.length <= before + n, 'het aantal voorzieningen blijft in de orde van grootte');
// de tegel-budgetten blijven staan
const perTile = new Map();
for (const f of sp) { const k = Math.floor(f.x / 1000) + '_' + Math.floor(f.y / 1000); perTile.set(k, (perTile.get(k) || 0) + 1); }
ok([...perTile.values()].every((v) => v <= 2 * 60), 'dichtheid per tegel binnen het budget');

// elke zaak aan een gebouw (op de tegel zelf), op een monster over de provincie, tegels erbij geladen
const withB = sp.filter((f) => f.bid);
ok(withB.length >= sp.length * 0.95, `bijna alle zaken hebben een gebouw in de data (${withB.length}/${sp.length})`);
const sample = withB.filter((_, i) => i % Math.ceil(withB.length / 60) === 0);
const found = await TP.withTiles(map, sample.map((f) => [f.x, f.y]), () => sample.map((f) => !!(TP.buildingAt(map, f.x, f.y, 0) || TP.buildingAt(map, f.x, f.y, 30))), { radius: 160 });
const hit = found.filter(Boolean).length;
ok(hit >= sample.length * 0.9, `de zaken staan bij een gebouw op de tegel (${hit}/${sample.length})`);

// de deuren van de winkels en cafés op de tegels, met de verzonnen naam
let Shops = null;
try { Shops = await import('../game/js/shops.js'); } catch (e) { console.log('SKIP deuren: shops.js laadt niet in Node (' + String(e.message).slice(0, 60) + ')'); }
if (Shops) {
  const kinds = Shops.COUNTRY_SHOP_KINDS;
  const placed = await Fac.placeWithTiles(map, kinds, () => Shops.placeCountryShops(map, [], []), { slice: 6 });
  const mine = placed.filter((s) => s.fixedName);
  ok(mine.length > 20, `deuren met een verzonnen naam (${mine.length} van ${placed.length})`);
  const pos = new Set();
  for (const s of mine) {
    const k = Math.round(s.x / 2) + '|' + Math.round(s.y / 2);
    ok(!pos.has(k), `geen twee deuren op dezelfde plek (${Math.round(s.x)}, ${Math.round(s.y)})`);
    pos.add(k);
    ok(!isInWater(map, s.x, s.y), 'deur niet in water');
    ok(s.fixedName && !SB.isChain({ name: s.fixedName }), 'deur met verzonnen naam');
  }
  const perType = {};
  for (const s of mine) perType[s.type] = (perType[s.type] || 0) + 1;
  console.log('deuren per type: ' + JSON.stringify(perType));
}
console.log(`shopplaces: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
