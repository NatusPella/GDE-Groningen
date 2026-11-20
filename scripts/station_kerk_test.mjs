// Een station is geen kerk (Veendam): het stationsmodel had een zadeldaktoren op een puntdak, het silhouet van een kerk.
// Bewaakt: het station van Veendam is in landmarkkits.json een station (geen kerk), geen enkele kerk- of kapelkit staat binnen
// 100 m van een stationskit, en het stationsmodel is laag, heeft geen toren en geen puntdak. Pure test, geen wereld nodig.
//   node scripts/station_kerk_test.mjs
import fs from 'node:fs';
import './node3d.mjs';

const K = await import('../game/js/landmarkkit.js');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const kits = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url), 'utf8')).items;
const stations = kits.filter((i) => i.k === 'station');
const kerken = kits.filter((i) => i.k === 'church' || i.k === 'chapel');
const veendam = stations.filter((i) => i.n === 'Veendam');
check(veendam.length >= 1, 'Veendam heeft een stationskit');
check(veendam.some((i) => Math.hypot(i.x - 21637, i.y - 12464) < 5), 'de stationskit van Veendam staat bij het stationsgebouw (21637, 12464)');

for (const s of stations) {
  for (const c of kerken) check(Math.hypot(c.x - s.x, c.y - s.y) > 100, `kerkkit ${c.n || '(naamloos)'} staat op station ${s.n}`);
  const p = K.landmarkParams(s);
  check(p && p.kit === 'hall' && p.type === 'station', `${s.n}: het station wordt een stationsmodel`);
  if (!p) continue;
  check(p.roof === 'flat', `${s.n}: een station heeft een plat dak, geen puntdak met toren`);
  const g = K.landmarkGeometry({ ...p }, K.LOD_FULL);
  check(g.height < 12, `${s.n}: het station is laag (${g.height.toFixed(1)} m), geen torenhoogte`);
}

if (fails.length) { console.error(`station_kerk_test: ${fails.length} fout(en)`); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log(`station_kerk_test: ok (${stations.length} stations, ${kerken.length} kerkkits, Veendam bewaakt)`);
