// Collisie-gaten (#502, playtest 27-10): drie plekken waar de speler tegen
// iets onzichtbaars aanliep of door de grond zakte.
//
//   1. Het loket in de binnenstad: de vaste punten van M03 (missions_nieuw.js,
//      LOKET) en de zijmissie Het Loket (Loketgebouw). Op en rond die punten
//      staat geen vast object zonder tekengeometrie: de losse props komen uit
//      cityprops.js (elke prop heeft een geo in de celmesh) en de enige vaste
//      stukken van het hoogtemodel zijn de breekbare ringwanden. De speler
//      loopt met de echte controller van de start naar de rij, dus een
//      onzichtbare muur op de route valt op.
//   2. Het hekje in het buitengebied: een leuning of polderhek staat op de kade
//      (0 m). Wie eronder zwemt (z < -0,4) hoort er niet tegenaan te botsen;
//      op het dek (z = 0) is dezelfde leuning wel vast.
//   3. De sluis: een boot in de kolk zet de speler niet meer op het water onder
//      de brug (waar isInWater 'droog' zegt), maar op de kant. Daarna blijft
//      hij op de grond staan in plaats van erdoorheen te zakken.
//
//   node scripts/collisie_gaten_test.mjs
// Zonder game/world (de provinciebouw) slaat de test zichzelf over, zoals de
// andere wereldtests.
import './node3d.mjs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };

// --- 1. een leuning is alleen vast op het dek ---------------------------------
{
  const { GameMap } = await import('../game/js/mapdata.js');
  const C = await import('../game/js/collision.js');
  const BR = await import('../game/js/bridgerails.js');
  const water = { name: 'proefgracht', pts: [[-20, -10], [20, -10], [20, 10], [-20, 10], [-20, -10]] };
  const bridge = { pts: [[-20, 0], [20, 0]], cat: 'normal', type: 'residential', width: 6, bridge: true };
  const map = new GameMap({ meta: { bounds: [-50, -50, 50, 50], landmarks: [] }, roads: [bridge], buildings: [], water: [water], green: [], trees: [] });
  const rails = BR.railingItems(map, bridge);
  ok(rails.length > 0, 'de proefbrug heeft leuningen');
  const rail = rails.find((r) => Math.abs(r.x) < 0.1) || rails[0];
  // op het dek: de leuning houdt de voet tegen
  const [dx, dy] = C.resolveWalker(rail.x, rail.y, 0.35, map, 0, 0, null, 0, 0);
  ok(Math.hypot(dx - rail.x, dy - rail.y) > 0.2, 'op het dek is de leuning vast', `${(Math.hypot(dx - rail.x, dy - rail.y)).toFixed(2)} m`);
  // eronder (zwemmen in de gracht): dezelfde leuning telt niet
  const [wx, wy] = C.resolveWalker(rail.x, rail.y, 0.35, map, 0, 0, null, -2.3, 0);
  ok(Math.abs(wx - rail.x) < 1e-9 && Math.abs(wy - rail.y) < 1e-9, 'onder de brug botst de zwemmer niet tegen de leuning');
  // en erboven (op een hoger viaduct): ook niet
  const [ax, ay] = C.resolveWalker(rail.x, rail.y, 0.35, map, 0, 0, null, 3, 0);
  ok(Math.abs(ax - rail.x) < 1e-9 && Math.abs(ay - rail.y) < 1e-9, 'op een hoger viaduct telt de leuning eronder niet mee');
}

// --- de echte wereld ----------------------------------------------------------
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) {
  console.log('SKIP collisie_gaten_test: geen game/world met de provincie');
  console.log(`${n} checks, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}
const map = T.world;
const { buildingAt } = await import('../game/js/tileplace.js');
const { isInWater } = await import('../game/js/util.js');
const C = await import('../game/js/collision.js');
const E = await import('../game/js/elevation.js');
const CP = await import('../game/js/cityprops.js');
const SK = await import('../game/js/sidejobkit.js');

// De vaste punten uit missions_nieuw.js (LOKET): de rij op de Grote Markt bij
// het Stadhuis, loket A en de zijdeur bij loket C. De start van M03 is
// loketAt(-10, 14).
const LOKET = { rij: [108, 108], A: [108, 96], C: [114, 122] };
const M03_START = [98, 122];

// roadSpot uit missions.js: het dichtstbijzijnde pad, of een vrije plek ernaast
function roadSpot(x, y) {
  const p = map.nearestRoadPoint(x, y, 120) || { x, y };
  return map.isOpenSpot(p.x, p.y) ? p : (map.findOpenSpawn(p.x, p.y, 200) || p);
}

// De krioelende stad: de losse props van cityprops.js. Alle soorten hieronder
// krijgen een geo in de celmesh (cityprops.js buildCellMeshes -> registerItems);
// een prop die hier niet in staat zou een botsvolume zonder tekening zijn.
const DRAWN_KINDS = new Set(['bench', 'bin', 'bike', 'chair', 'table', 'parasol', 'stall', 'nietje', 'planter', 'zuil', 'container', 'bollard', 'scooter', 'kliko', 'abri', 'elecbox', 'signpost', 'stoepbord', 'kiosk', 'rail']);
CP.initCityProps({ map, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [], time: 0 });
const CELL = CP.CLUTTER_CELL;
function cityPropsNear(x, y, r) {
  const out = [];
  for (let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx++) {
    for (let gy = Math.floor((y - r) / CELL); gy <= Math.floor((y + r) / CELL); gy++) {
      for (const p of CP.cellPropSpots(map, gx, gy)) if (Math.hypot(p.x - x, p.y - y) <= r) out.push(p);
    }
  }
  return out;
}
function ringWallsNear(x, y, r) {
  const out = [];
  if (!map.elev || !map.elev.has) return out;
  for (let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx++) {
    for (let gy = Math.floor((y - r) / CELL); gy <= Math.floor((y + r) / CELL); gy++) {
      for (const w of E.breakableWallsIn(map.elev, gx * CELL, gy * CELL, CELL)) if (Math.hypot(w.x - x, w.y - y) <= r) out.push(w);
    }
  }
  return out;
}

// De speler loopt met de echte controller van de start naar een doel. Alle
// props in de cellen eromheen doen als vaste posten mee (strenger dan het
// spel: lichte dingen als fietsen worden normaal omvergelopen).
const walkProps = new Set();
async function walkTo(start, target) {
  const { Player } = await import('../game/js/player.js');
  const { addStaticCollider } = await import('../game/js/breakables.js');
  for (const p of cityPropsNear(target.x, target.y, 22).concat(cityPropsNear(start.x, start.y, 12))) {
    const key = `${p.kind}:${p.x.toFixed(2)}:${p.y.toFixed(2)}`;
    if (walkProps.has(key)) continue;
    walkProps.add(key);
    addStaticCollider('post', p.x, p.y, p.r || 0.15, p.half || 0, p.axis || 0);
  }
  const p = new Player(start.x, start.y);
  p.radius = 0.35;
  p.angle = Math.atan2(target.y - start.y, target.x - start.x);
  const st = { down: new Set(), pressed: new Set(), ay: 0 };
  const input = { st, wasPressed: (k) => st.pressed.has(k), isDown: (k) => st.down.has(k), axis: () => [0, st.ay], lookActive: () => false, mouse: { dx: 0, dy: 0, down: false, rightDown: false, wheel: 0 } };
  const world = { input, map, vehicles: [], time: 0, camYaw: p.angle, audioEvents: [], pedestrians: [], companion: null, health: 100, armor: 0, ammo: {}, weapon: null, particles: [] };
  let best = Infinity;
  for (let i = 0; i < 600; i++) {
    st.ay = -1; st.pressed = new Set();
    p.update(1 / 60, world);
    world.time += 1 / 60;
    world.audioEvents.length = 0;
    best = Math.min(best, Math.hypot(p.x - target.x, p.y - target.y));
  }
  return best;
}

const start = roadSpot(M03_START[0], M03_START[1]);
for (const [key, [lx, ly]] of Object.entries(LOKET)) {
  const target = roadSpot(lx, ly);
  // geen vast stuk van het hoogtemodel (ringmuur) op de plek zelf
  const walls = ringWallsNear(target.x, target.y, 0.8);
  ok(walls.length === 0, `loket ${key}: geen ringmuur zonder tekengeometrie op de plek`, `${walls.length} wanden`);
  // elke prop dichtbij is een bekende, getekende soort
  const near = cityPropsNear(target.x, target.y, 1.6);
  ok(near.every((p) => DRAWN_KINDS.has(p.kind)), `loket ${key}: alleen getekende props dichtbij`, near.filter((p) => !DRAWN_KINDS.has(p.kind)).map((p) => p.kind).join(','));
  // en de speler komt er met de echte controller
  const d = await walkTo(start, target);
  ok(d < 1.2, `loket ${key}: de speler bereikt de plek`, `dichtstbij ${d.toFixed(2)} m`);
}

// De zijmissie Het Loket staat bij het Loketgebouw (Zernike); ook daar geen
// vaste rommel zonder tekening.
const loketJob = SK.namedBuildingSpot(map, 'Loketgebouw');
ok(!!loketJob, 'zijmissie Het Loket: het Loketgebouw staat in de kaart');
if (loketJob) {
  ok(map.isOpenSpot(loketJob.x, loketJob.y), 'zijmissie Het Loket: de plek is begaanbaar');
  ok(ringWallsNear(loketJob.x, loketJob.y, 0.8).length === 0, 'zijmissie Het Loket: geen ringmuur op de plek');
  const near = cityPropsNear(loketJob.x, loketJob.y, 1.2);
  ok(near.every((p) => DRAWN_KINDS.has(p.kind)), 'zijmissie Het Loket: alleen getekende props dichtbij');
}

// --- 3. de sluis: de kant op, niet het water onder de brug --------------------
const { Player } = await import('../game/js/player.js');
// De twee sluizen uit de klacht: de kolk in het Woldmeer (onder een brug) en
// de Zeesluis van Delfzijl (M14). Beide uit game/sluizen.json.
const LOCKS = [
  { name: 'Woldmeer', x: 6425.5, y: -1611.1, a: 1.55 },
  { name: 'Zeesluis Delfzijl', x: 24815.6, y: -11673, a: 1.045 },
  { name: 'Robbengatsluis', x: -24849.3, y: -20669.8, a: 0 },
];
for (const lock of LOCKS) {
  await loadArea(T, [lock.x - 260, lock.y - 260, lock.x + 260, lock.y + 260]);
  const v = { x: lock.x, y: lock.y, angle: lock.a, halfWid: 1.1, halfLen: 3, isBoat: true, z: 0 };
  const [sx, sy] = C.findExitSpot(v, 0.35, map);
  const dry = !map.inWaterRaw(sx, sy);
  ok(dry, `sluis ${lock.name}: de uitstapplek ligt op de kant, niet op het water`, `${sx.toFixed(1)},${sy.toFixed(1)}`);
  ok(Math.hypot(sx - lock.x, sy - lock.y) <= 10.1, `sluis ${lock.name}: de kant is binnen bereik`, `${Math.hypot(sx - lock.x, sy - lock.y).toFixed(1)} m`);
  ok(!buildingAt(map, sx, sy), `sluis ${lock.name}: de uitstapplek staat niet in een pand`);
  // de speler zelf: een tel later nog op de grond, niet in het water
  const p = new Player(sx, sy);
  p.radius = 0.35;
  const st = { down: new Set(), pressed: new Set(), ay: 0 };
  const input = { st, wasPressed: (k) => st.pressed.has(k), isDown: (k) => st.down.has(k), axis: () => [0, st.ay], lookActive: () => false, mouse: { dx: 0, dy: 0, down: false, rightDown: false, wheel: 0 } };
  const world = { input, map, vehicles: [], time: 0, camYaw: 0, audioEvents: [], pedestrians: [], companion: null, health: 100, armor: 0, ammo: {}, weapon: null, particles: [] };
  for (let i = 0; i < 60; i++) { st.pressed = new Set(); p.update(1 / 60, world); world.time += 1 / 60; world.audioEvents.length = 0; }
  ok(p.water === null && p.z > -0.05 && Math.abs(p.gz) < 0.51, `sluis ${lock.name}: de speler zakt niet door de grond`, `z=${p.z.toFixed(2)} gz=${p.gz.toFixed(2)} water=${p.water}`);
  ok(!isInWater(map, p.x, p.y, p.gz + p.z), `sluis ${lock.name}: de speler staat droog`);
}

// De plek waar de klacht het vaakst opdook: de rij van M03 naast het Stadhuis.
// De dichtstbijzijnde vaste prop is een fietsnietje (getekend); dat is geen
// onzichtbare muur, maar wel het ding waar je langs schuurt.
{
  const target = roadSpot(LOKET.rij[0], LOKET.rij[1]);
  let best = null;
  for (const p of cityPropsNear(target.x, target.y, 4)) {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (!best || d < best.d) best = { d, kind: p.kind };
  }
  console.log(`(loket rij: dichtstbijzijnde prop ${best ? `${best.kind} op ${best.d.toFixed(2)} m` : 'geen'})`);
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
