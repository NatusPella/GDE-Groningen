// Real facilities (game/facilities.json, facilities.js) everywhere you can
// play: every point on a grid over the city and the real Ommelanden has a
// hospital / GP post / doctor and a police station within reach, every site
// a death or an arrest can lead to puts the player on a valid spot
// (spotcheck.js) with the Escapade parked by the road, and the names are
// invented (kind + place), never a business name.
//   node scripts/facilities_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

// the far corners of the real Ommelanden (past Roden, past Ten Boer)
const MAX_MEDICAL = 11000;
const MAX_POLICE = 14000;
const STEP = 250;

const root = new URL('../game/', import.meta.url);
await import('../game/js/player.js');
// the tiles as the game has them (the placements read their buildings and roads), the whole old area in
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const F = await import('../game/js/countryfield.js');
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
F.setCountryBounds(map.meta.bounds);
const Fac = await import('../game/js/facilities.js');
const tilesLoaded = await loadArea(T, Fac.DOOR_BOX);
ensureCountryEdge(map);
const raw = JSON.parse(fs.readFileSync(new URL('facilities.json', root)));
Fac.initFacilities(map, raw);
const { respawnArrival } = await import('../game/js/respawn.js');
const { spotProblem } = await import('../game/js/spotcheck.js');
const { buildingAt: tileBuildingAt, waterGap } = await import('../game/js/tileplace.js');
const buildingAt = (x, y, m) => (tileBuildingAt(map, x, y, m) ? 1 : -1);
const { isInWater } = await import('../game/js/util.js');
console.log(`${tilesLoaded} tiles of the old area in`);

let fails = 0;
const fail = (msg) => { fails++; console.log('FAIL ' + msg); };

// the layer
if (raw.crs !== 'EPSG:4326') fail('facilities.json is not in lat/lon');
console.log(`${Fac.FAC.all.length} facilities in the built world: ` + [...Fac.FAC.byKind].map(([k, v]) => `${k} ${v.length}`).join(', '));
for (const k of ['police', 'doctors', 'hospital', 'fuel', 'car_repair', 'parking', 'supermarket']) if (!Fac.facilitiesOf(k).length) fail(`no ${k} in the built world`);

// names: invented from kind + place, no business names
const LABELS = /^(UMCG|Ziekenhuis|Huisartsenpost|Huisartsenpraktijk|Ambulancepost|Politiebureau|Politiepost|Brandweerkazerne|Apotheek|Pomp & Poets|Garage Knalpot|Taxistandplaats|Busstation|Parkeerplaats|Parkeergarage)\b/;
const seen = new Set();
for (const f of Fac.FAC.all) {
  if (!f.name) continue;
  if (!LABELS.test(f.name)) fail(`odd name "${f.name}" (${f.kind})`);
  if (seen.has(f.name)) fail(`name twice: ${f.name}`);
  seen.add(f.name);
}

// the grid: city map plus the real Ommelanden
const boxes = [map.meta.bounds, Fac.DOOR_BOX];
let worstMed = { d: 0 }, worstPol = { d: 0 }, n = 0;
for (const [x0, y0, x1, y1] of boxes) {
  for (let x = x0; x <= x1; x += STEP) {
    for (let y = y0; y <= y1; y += STEP) {
      n++;
      const m = Fac.nearestFacility('medical', x, y), p = Fac.nearestFacility('police', x, y);
      const dm = m ? Math.hypot(m.x - x, m.y - y) : Infinity, dp = p ? Math.hypot(p.x - x, p.y - y) : Infinity;
      if (dm > worstMed.d) worstMed = { d: dm, x, y, to: m && m.name };
      if (dp > worstPol.d) worstPol = { d: dp, x, y, to: p && p.name };
    }
  }
}
console.log(`grid ${n} points: farthest medical ${Math.round(worstMed.d)} m (${Math.round(worstMed.x)}, ${Math.round(worstMed.y)} -> ${worstMed.to}), police ${Math.round(worstPol.d)} m (${Math.round(worstPol.x)}, ${Math.round(worstPol.y)} -> ${worstPol.to})`);
if (worstMed.d > MAX_MEDICAL) fail(`medical too far: ${Math.round(worstMed.d)} m`);
if (worstPol.d > MAX_POLICE) fail(`police too far: ${Math.round(worstPol.d)} m`);

// a few known places
const near = (kind, x, y) => Fac.nearestFacility(kind, x, y);
const expect = [
  ['medical', 797.97, -183.93, /^UMCG$/],
  ['police', 487.26, 425.18, /Groningen Centrum/],
  ['police', 1931.4, -9027.27, /Bedum/],
  ['police', -2602.1, -12339.71, /Winsum/],
  ['medical', -10732.8, -3017.02, /Zuidhorn/],
];
for (const [k, x, y, re] of expect) {
  const f = near(k, x, y);
  if (!f || !re.test(f.name)) fail(`${k} at (${x}, ${y}): ${f ? f.name : 'none'}, want ${re}`);
}

// every reachable site: a valid spot, the car by the road
const world = { map, vehicles: [], time: 0, player: { x: 0, y: 0, inVehicle: null } };
const sites = [...Fac.reachableFacilities('medical'), ...Fac.reachableFacilities('police')];
let cars = 0;
const t0 = performance.now();
for (const s of sites) {
  // the game streams the tiles round the arrival in; the placement reads them
  await map.prefetchPoints([[s.x, s.y]], { radius: 300 });
  const plan = respawnArrival(world, s);
  const p = plan.player;
  const why = spotProblem(map, { x: p.x, y: p.y, mode: 'walk' });
  const at = s.umcg && map.meta.hospital ? map.meta.hospital : s;
  const d = Math.hypot(p.x - at.x, p.y - at.y);
  if (why) fail(`${s.name}: spawn (${Math.round(p.x)}, ${Math.round(p.y)}) ${why}`);
  if (d > 150) fail(`${s.name}: spawn ${Math.round(d)} m from the building`);
  if (plan.car) {
    cars++;
    const c = plan.car;
    if (buildingAt(c.x, c.y, 0) >= 0 || isInWater(map, c.x, c.y) || waterGap(map, c.x, c.y, 3) > -0.5) fail(`${s.name}: car in a building or the water`);
  }
  if (!Number.isFinite(p.angle)) fail(`${s.name}: no facing`);
}
console.log(`${sites.length} respawn sites (${Math.round(performance.now() - t0)} ms), ${cars} with the car at the kerb`);
if (cars < sites.length * 0.8) fail(`car placed at only ${cars}/${sites.length} sites`);
for (const s of sites) console.log(`  ${s.kind.padEnd(9)} ${s.name}`);

// garages and fuel stations out in the Ommelanden (garages.js)
{
  const { initGarages, initCountryGarages, getGaragesForRender } = await import('../game/js/garages.js');
  initGarages(world);
  initCountryGarages(world);
  const all = getGaragesForRender();
  const [bx0, by0, bx1, by1] = map.meta.bounds;
  const country = all.filter((g) => g.x < bx0 || g.x > bx1 || g.y < by0 || g.y > by1);
  const pomp = country.filter((g) => g.kind === 'pomp').length;
  console.log(`garages: ${all.length}, ${country.length} in the Ommelanden (${pomp} fuel stations)`);
  if (country.length < 10 || pomp < 5) fail('too few Ommeland garages / fuel stations');
  for (const g of country) {
    const why = spotProblem(map, { x: g.x, y: g.y, mode: 'drive' });
    if (why) fail(`${g.name}: ${why}`);
    if (!/^(Garage Knalpot|Pomp & Poets) \S/.test(g.name)) fail(`garage name "${g.name}"`);
  }
}

// shops out in the Ommelanden (shops.js): at real shops of the matching
// kind, door on open ground, named after the village
{
  const S = await import('../game/js/shops.js');
  const country = S.placeCountryShops(map);
  const byType = {};
  for (const s of country) byType[s.type] = (byType[s.type] || 0) + 1;
  console.log(`${country.length} shops in the Ommelanden ${JSON.stringify(byType)}`);
  if (!byType.super || !byType.snack || country.length < 15) fail('too few Ommeland shops');
  for (const s of country) {
    const why = spotProblem(map, { x: s.x, y: s.y, mode: 'walk' });
    if (why) fail(`${s.type} ${s.wijk}: ${why}`);
    if (!Fac.FAC.all.some((f) => !f.city && Math.hypot(f.x - s.x, f.y - s.y) < 60)) fail(`${s.type} ${s.wijk}: no real shop near`);
    if (!s.wijk) fail(`${s.type} at (${Math.round(s.x)}, ${Math.round(s.y)}): no village name`);
  }
}

// cafés out in the Ommelanden (horeca.js), invented names only
{
  const H = await import('../game/js/horeca.js');
  H.initHoreca(world);
  H.initCountryHoreca(world);
  const country = H.getHorecaForRender().filter((h) => h.place);
  console.log(`${country.length} cafés in the Ommelanden`);
  if (country.length < 10) fail('too few Ommeland cafés');
  for (const h of country) {
    const why = spotProblem(map, { x: h.x, y: h.y, mode: 'walk' });
    if (why) fail(`café ${h.place}: ${why}`);
  }
}

// parking: bays on the real lots and lanes (parkinglots.js), cars in them
// (parkedcars.js), and your own car parked in one (ownedvehicles.js)
{
  const L = await import('../game/js/parkinglots.js');
  const P = await import('../game/js/parkedcars.js');
  const t1 = performance.now();
  let lots = 0, bays = 0, bad = 0, laneBays = 0;
  for (const f of Fac.facilitiesOf(['parking', 'streetpark'])) {
    if (!f.poly) continue;
    const B = L.lotBays(map, f);
    if (B.length) lots++;
    bays += B.length;
    for (const b of B) if ((F.edgeDistance(b.x, b.y) > 0 && buildingAt(b.x, b.y, 0) >= 0) || isInWater(map, b.x, b.y)) bad++;
  }
  for (const l of Fac.FAC.lanes) laneBays += L.laneBays(map, l).length;
  console.log(`parking: ${bays} bays on ${lots} lots, ${laneBays} along parking lanes (${Math.round(performance.now() - t1)} ms)`);
  if (lots < 100 || bays < 2000) fail('too few parking bays');
  if (bad) fail(`${bad} bays in a building or the water`);
  // a lot out in the Ommelanden: parked cars in its bays
  const lot = Fac.facilitiesOf('parking').filter((f) => !f.city && f.poly && L.lotBays(map, f).length >= 10)[0];
  if (!lot) fail('no Ommeland lot with bays');
  else {
    const w2 = { map, vehicles: [], time: 0, player: { x: lot.x, y: lot.y, inVehicle: null }, input: null };
    for (let k = 0; k < 300; k++) { if (k % 50 === 0) P.manageParkedCars(w2); P.tickParkedCars(w2); w2.time += 1 / 60; }
    const inLot = [...P.sleepingParkedCars(w2), ...w2.vehicles].filter((v) => L.lotBays(map, lot).some((b) => Math.hypot(b.x - v.x, b.y - v.y) < 0.1)).length;
    console.log(`${lot.name || 'lot'} (${Math.round(lot.x)}, ${Math.round(lot.y)}): ${inLot} of ${L.lotBays(map, lot).length} bays taken`);
    if (!inLot) fail('no parked cars in the Ommeland lot');
    const O = await import('../game/js/ownedvehicles.js');
    const spot = O.findParkingSpot(w2, lot.x, lot.y, { len: 4, wid: 1.65, name: 'escort' }, { outOfView: false });
    console.log(`your car near that lot: ${spot ? (spot.bay ? 'in a bay' : 'at the kerb') : 'nowhere'}`);
    if (!spot || !spot.bay) fail('own car not parked in a lot bay');
  }
}

console.log(fails ? `${fails} FAILED` : 'facilities ok');
process.exit(fails ? 1 : 0);
