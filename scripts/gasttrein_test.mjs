// Samen met de trein (#436): een gast ziet de trein van de gastheer en de trein is ook voor hem solide.
// De gast speelt de dienstregeling niet (updateRailway draait alleen bij de host); hij zet de wagens waar de host ze heeft
// (zetTreinenVanHost) en duwt zijn eigen lichaam uit een wagen (gastTreinContact). Zonder werelddata, met een eigen spoor:
//   node scripts/gasttrein_test.mjs
import './node3d.mjs';

const pts = [];
for (let i = 0; i <= 100; i++) pts.push([i * 10, 0]);
const route = { name: 'proef', train: 'gtw', pts, stops: [{ s: 100, name: 'A' }, { s: 500, name: 'B' }, { s: 900, name: 'C' }], crossings: [] };
const newMap = () => ({ railRoutes: [route], railLifts: [], levelCrossings: [], meta: { bounds: [[0, -200], [1000, 200]] }, roadsNear: () => [] });
const newWorld = (map) => ({
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null,
  time: 0, clock: 10, money: 200, wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} },
  onRespawn: [], audioEvents: [], particles: [], addMessage() {}, health: 100, armor: 0,
});

const H = await import('../game/js/railway.js');
const G = await import('../game/js/railway.js?gast'); // dezelfde module, een eigen toestand: de wereld van de gast
const hw = newWorld(newMap()), gw = newWorld(newMap());
H.initRailway(hw);
G.initRailway(gw);

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

// --- de gast ziet de trein: de dienstregelingstrein staat waar de gastheer hem heeft
const ht = H.getTrains()[0];
ht.state = 'run'; ht.v = 12; ht.dir = 1; ht.c = 300; ht.target = 2;
H.placeTrain(ht);
const p = H.routePoint(ht.route, ht.c);
G.zetTreinenVanHost([{ route: 0, x: p[0], y: p[1], v: 12 }]);
const gt = G.getTrains()[0];
ok(gt && gt.cars.length >= 2, 'de gast heeft de trein met zijn wagens');
ok(G.getTrains().every((t) => !t.gastWeg), 'de trein van de gastheer is niet verborgen (gastWeg)');
ok(Math.hypot(gt.cars[0].x - ht.cars[0].x, gt.cars[0].y - ht.cars[0].y) < 0.5, 'de wagens staan op de plek van de gastheer');
ok(Math.abs(gt.c - ht.c) < 0.5 && gt.v === 12, 'de plek op de route en de snelheid volgen de gastheer');

// --- een trein die de gastheer zelf bestuurt: de gast ziet hem ook (de host stuurt hem mee, coopnet.js hostTreinen)
// en haalt de nieuwe plek vloeiend in, in plaats van meteen te springen (#434)
const voor = G.getTrains()[0].c;
G.zetTreinenVanHost([{ route: 0, x: 320, y: 0, v: 8 }]);
ok(G.getTrains()[0].dir === 1, 'de rijrichting volgt het teken van de snelheid');
ok(Math.abs(G.getTrains()[0].c - voor) < 1e-9, 'een nieuwe snapshot zet de trein niet meteen ergens anders neer');
G.zetTreinenVanHost([{ route: 0, x: 320, y: 0, v: -8 }]);
ok(G.getTrains()[0].dir === -1, 'een trein die terugrijdt: de richting gaat mee');
// een reeks snapshots van een trein op 20 m/s (20 Hz, 1 m per snapshot): de gast tekent hem gelijkmatig
let doel = 600;
G.zetTreinenVanHost([{ route: 0, x: doel, y: 0, v: 20 }]);
const stappen = [];
let vorigeC = G.getTrains()[0].c;
for (let k = 0; k < 120; k++) {
  if (k % 3 === 0) { doel += 1; G.zetTreinenVanHost([{ route: 0, x: doel, y: 0, v: 20 }]); }
  G.stapTreinenGast(1 / 60);
  const nu = G.getTrains()[0].c;
  stappen.push(nu - vorigeC); vorigeC = nu;
}
const minS = Math.min(...stappen), maxS = Math.max(...stappen);
ok(minS > 0.15, 'geen enkel beeld staat de trein stil', `${minS.toFixed(3)}`);
ok(maxS < 0.5, 'en geen enkel beeld springt hij vooruit', `${maxS.toFixed(3)}`);
ok(Math.abs(vorigeC - doel) < 4, 'de gast blijft bij de gastheer in de buurt', `${(vorigeC - doel).toFixed(2)}`);

// --- tussen twee snapshots door rijdt de trein door: geen "een meter en dan stil" (#434)
G.zetTreinenVanHost([{ route: 0, x: 400, y: 0, v: 20 }]);
const start = G.getTrains()[0].c;
let vorigeT = start, achteruit = 0;
for (let k = 0; k < 20; k++) { G.stapTreinenGast(1 / 60); const nu = G.getTrains()[0].c; if (nu < vorigeT - 1e-9) achteruit++; vorigeT = nu; }
const naC = G.getTrains()[0].c;
ok(naC - start > 5 && naC - start < 9, 'twintig beelden zonder snapshot: de trein rijdt door', `${(naC - start).toFixed(2)}`);
ok(achteruit === 0, 'de trein gaat geen stap terug');

// --- een sprong (de gastheer zette de trein ergens anders neer) is geen rijden: meteen mee
G.zetTreinenVanHost([{ route: 0, x: 700, y: 0, v: 0 }]);
ok(Math.abs(G.getTrains()[0].c - 700) < 0.01, 'een sprong van meer dan 20 m zet de trein meteen goed');

// --- solide: de gast staat op het spoor en wordt opzij gezet, niet door de trein heen
const gp = gw.player;
const car = G.getTrains()[0].cars[1];
gp.x = car.x; gp.y = car.y; gp.gz = car.z || 0; gp.z = 0;
const duw = G.gastTreinContact(gw);
ok(duw > 0, 'op het spoor duwt de trein de gast opzij');
ok(Math.abs(gp.y - car.y) > 1.45 || Math.abs(gp.x - car.x) > car.len / 2, 'de gast staat naast de wagen, niet erin', `${gp.x.toFixed(1)},${gp.y.toFixed(1)}`);
const na = { x: gp.x, y: gp.y };
for (let k = 0; k < 8; k++) G.gastTreinContact(gw);
ok(Math.hypot(gp.x - na.x, gp.y - na.y) < 0.05, 'herhaald duwen laat hem staan (geen schokken)');

// --- naast het spoor, op een viaduct of in een voertuig: geen duw
gp.x = car.x; gp.y = car.y + 8; G.gastTreinContact(gw);
ok(Math.abs(gp.y - (car.y + 8)) < 1e-9, 'naast het spoor wordt niemand geduwd');
gp.x = car.x; gp.y = car.y; gp.gz = (car.z || 0) + 6; G.gastTreinContact(gw);
ok(Math.abs(gp.y - car.y) < 1e-9, 'op een viaduct boven het spoor wordt niemand geduwd');
gp.x = car.x; gp.y = car.y; gp.gz = car.z || 0; gp.inVehicle = {};
G.gastTreinContact(gw);
ok(Math.abs(gp.y - car.y) < 1e-9, 'in een voertuig wordt niemand geduwd');

// --- de treinen van de gastheer die niet in de buurt zijn, blijven verborgen
G.zetTreinenVanHost([]);
ok(G.getTrains().every((t) => t.gastWeg), 'zonder trein van de gastheer tekent de gast niets');

console.log(`${n - fails}/${n} gasttrein ok`);
process.exit(fails ? 1 : 0);
