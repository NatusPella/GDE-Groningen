// Welke stationparen geven een echte treinrit en welke vallen terug op de oude korte scène? (#926)
//   node scripts/treinrit_stations_test.mjs
// Op de echte kaart (stad + provincielijnen, zoals main.js ze koppelt): voor elk paar stations plant planTrainTrip een reis; elke reis
// moet een treinstuk op een echt spoor hebben (treinStukken) en lang genoeg zijn (ritKanEcht), anders ziet de speler de plaatjesscène.
import fs from 'node:fs';
import './node3d.mjs';
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP treinrit_stations_test.mjs: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const F = await import('../game/js/countryfield.js');
F.setCountryBounds(map.meta.bounds);
const { applyCityRoutes } = await import('../game/js/corridorrail.js');
applyCityRoutes(map, JSON.parse(fs.readFileSync(new URL('provincie-land.json', root), 'utf8')));
const RW = await import('../game/js/railway.js');
const P = await import('../game/js/ritpad.js');
const { planTrainTrip } = await import('../game/js/routing.js');
RW.initRailway({ map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, time: 0, clock: 10, addMessage() {} });
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i ? ' (' + i + ')' : ''}`); } };

const spoor = RW.getRoutes();
ok(spoor.length >= 4, 'de spoorroutes zijn er', String(spoor.length));
const namen = new Map();
for (const s of (map.stations || []).concat(map.countryStations || [])) if (s && Number.isFinite(s.x) && !namen.has(s.name)) namen.set(s.name, s);
const stations = [...namen.values()];
ok(stations.length >= 10, 'de stations zijn er', String(stations.length));
let paren = 0, geenReis = 0, terugval = [], metOverstap = 0;
for (const A of stations) for (const B of stations) {
  if (A === B) continue;
  const trip = planTrainTrip(map, [A.x, A.y], [B.x, B.y]);
  if (!trip) { geenReis++; continue; } // geen verbinding: de speler krijgt dan geen treinoptie, dus ook geen rit
  paren++;
  const stukken = P.treinStukken(trip.legs, spoor);
  if (!P.ritKanEcht('trein', { stukken })) terugval.push(`${A.name} > ${B.name}`);
  else if (!stukken.enkel) metOverstap++;
}
console.log(`  ${stations.length} stations, ${paren} paren met een reis (${metOverstap} met overstap), ${geenReis} zonder verbinding`);
if (terugval.length) console.log(`  terugval op de oude scène: ${terugval.slice(0, 12).join(' | ')}${terugval.length > 12 ? ` (+${terugval.length - 12})` : ''}`);
ok(paren >= 20, 'er zijn genoeg treinreizen om te keuren', String(paren));
ok(terugval.length === 0, 'elke treinreis tussen twee stations heeft een echt spoor voor de rit', `${terugval.length} paren`);
console.log(fails ? `${fails} van ${n} mislukt` : `treinrit_stations_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
