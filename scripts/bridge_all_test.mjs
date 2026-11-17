// #919: "de bruggen zijn volledig transparant" — niet alleen die bij Visvliet. De bestaande
// test (bridge_dek_test) bouwt de bruggen rond één punt; deze loopt de HELE provincie langs en
// controleert per brug op straatniveau of het dek dicht is en boven water ligt.
//
// Waarom dit ertoe doet: een brug die je doorziet is geen detailfout maar een gat in de wereld.
// De fix uit #884/#919 (een eigen dek onder de wegribbon, en de bovenkant boven de waterspiegel)
// moet voor elke brug gelden; met één steekproef weet je dat niet.
//
//   node scripts/bridge_all_test.mjs            (zonder game/world: SKIP)
//   node scripts/bridge_all_test.mjs --steekproef=40   alleen de eerste 40 bruggen
import fs from 'node:fs';
import '../scripts/node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP bridge_all_test: geen game/world met de provincie'); process.exit(0); }

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const MAX = arg('steekproef', Infinity);

const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const RS = await import('../game/js/roadsurface.js');
const G = await import('../game/js/gdt.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
map.tileQueue.run(1e9);
RS.setRoadNetwork(map);

// Alle bruggen op straatniveau in de provincie: de weg is de bron, niet een lijst met namen.
// Een brug met een eigen hoogte (z) is een viaduct en valt buiten deze regel.
// De wegen komen uit de ruimtelijke index (roadsNear), niet uit map.roads: in een gestreamde
// wereld is dat een grid en geen platte lijst. We lopen de hele kaart in blokken van 200 m af.
const alle = [];
const gezien = new Set();
const b = map.meta.bounds;
for (let x = b[0]; x <= b[2]; x += 200) {
  for (let y = b[1]; y <= b[3]; y += 200) {
    for (const r of map.roadsNear(x, y, 150) || []) {
      if (!r || !r.bridge || r.z) continue;
      if (!r.pts || r.pts.length < 2) continue;
      const sleutel = `${r.name || r.type}@${Math.round(r.pts[0][0])},${Math.round(r.pts[0][1])}`;
      if (gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      alle.push(r);
    }
  }
}
const bruggen = Number.isFinite(MAX) ? alle.slice(0, MAX) : alle;

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

ok(bruggen.length > 0, 'er liggen bruggen op straatniveau in de provincie');
console.log(`bridge_all_test: ${bruggen.length} bruggen op straatniveau gevonden`);

let zonderDek = 0, onderWater = 0, teSmal = 0;
for (const r of bruggen) {
  const naam = `${r.name || r.type} @${Math.round(r.pts[0][0])},${Math.round(r.pts[0][1])}`;
  const group = RS.buildRoadGroup(r);
  let core = null;
  group.traverse((o) => { if (o.isMesh && o.userData.roadStructure) core = o; });
  if (!core) { zonderDek++; continue; }
  const cp = core.geometry.attributes.position.array;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < cp.length; i += 3) { minY = Math.min(minY, cp[i]); maxY = Math.max(maxY, cp[i]); }
  // De kern moet onder de weg door steken en de bovenkant boven water hebben, anders
  // dekt het water (dat later getekend wordt) de brug af en lijkt hij doorzichtig.
  if (!(maxY > 0.002)) { onderWater++; continue; }
  if (!(minY < -0.3)) { teSmal++; continue; }
}
ok(zonderDek === 0, `elke brug heeft een eigen dek onder de weg (${zonderDek} zonder)`);
ok(onderWater === 0, `de bovenkant van elk dek ligt boven water (${onderWater} niet)`);
ok(teSmal === 0, `elk dek steekt onder de weg door (${teSmal} niet)`);

if (bad) { console.log(`bridge_all_test: ${bad} van ${n} checks rood`); process.exit(1); }
console.log(`bridge_all_test: ${n} checks groen over ${bruggen.length} bruggen`);
