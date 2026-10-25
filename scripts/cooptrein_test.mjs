// Samen met de trein (#492): een gast stapt bij de gastheer als passagier in, blijft aan een wagen hangen (ook als de trein
// rijdt), wordt er niet uit geduwd en stapt bij stilstand weer uit. Stoppen, wegvallen en late instap ruimen de crew op.
//   node scripts/cooptrein_test.mjs
import './node3d.mjs';

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

const C = await import('../game/js/cooptrein.js');
const T = await import('../game/js/treincoop.js');
const U = await import('../game/js/companion.js'); // stepCompanion laat een meerijdende gast staan

// een trein zoals railway.js hem maakt: twee wagens, een machinist aan de knoppen (state 'player')
const newTrein = () => ({
  state: 'player', v: 0, dir: 1, cfg: { label: 'GTW', height: 3.2 }, halfLen: 26,
  cars: [{ x: 0, y: 0, angle: 0, len: 17, z: 0 }, { x: -18.5, y: 0, angle: 0, len: 17, z: 0 }],
});
const newWorld = (berichten) => ({
  trainDriving: null, player: { x: 0, y: 0, gz: 0, z: 0, radius: 0.35, character: 'tammo' },
  companion: { x: 0, y: 0, gz: 0, z: 0, vx: 0, vy: 0, radius: 0.35, state: 'ok' },
  coop: { remote: true }, coopFigures: {}, map: { escapeBuilding: (x, y) => [x, y] },
  time: 0, addMessage() {}, audioEvents: [], particles: [], vehicles: [], pedestrians: [],
  coopMeld: (slot, tekst) => berichten.push({ slot, tekst }),
  coopTreinMeld: (slot, aan, rol) => berichten.push({ slot, aan, rol }),
});

// --- zonder gastheer in de trein gebeurt er niets
{
  const b = [], w = newWorld(b), t = newTrein();
  w.companion.x = 1;
  ok(C.treinGebruik(w, 1).gedaan === false, 'zonder gastheer in de trein stapt een gast niet in');
  ok(C.lichaamPlek(w, 1) === null, 'en er is geen wagen om aan te hangen');
  w.trainDriving = t;
  w.companion.x = 60; // ver van de trein
  ok(C.treinGebruik(w, 1).gedaan === false && t.crew == null, 'ver van de trein is E geen instappen');
  t.v = 12;
  ok(C.treinGebruik(w, 1).gedaan === false, 'een rijdende trein ver weg claimt E niet: E blijft voor een auto of het meerijden');
}

// --- instappen: de gastheer is de machinist, de gast passagier
const b1 = [], w = newWorld(b1), t = newTrein();
w.trainDriving = t;
w.companion.x = 3; w.companion.y = 0;
const r1 = C.treinGebruik(w, 1);
ok(r1.gedaan === true && r1.rol === 'passagier', 'de gast stapt in als passagier');
ok(T.roleOf(t.crew, 0) === 'machinist', 'de gastheer is de machinist');
ok(T.roleOf(t.crew, 1) === 'passagier', 'de gast is passagier');
ok(b1.some((m) => m.slot === 1 && m.aan === true && m.rol === 'passagier'), 'de gast hoort dat hij meerijdt');
ok(w.companion.coopTrein === true, 'zijn lichaam hangt aan de wagen');
const plek0 = C.lichaamPlek(w, 1);
ok(plek0 && Math.hypot(w.companion.x - plek0.x, w.companion.y - plek0.y) < 1e-9, 'meteen op de wagen');
ok(t.crew.passagiers.includes(1), 'de crew kent hem als passagier');

// --- 60 tikken meerijden met een rijdende trein: het lichaam blijft bij de wagen, zonder eigen snelheid
w.player.x = 500; w.player.y = 500; // het lichaam van de gastheer staat in de cabine, niet op de wagen van de gast
let vorige = w.companion.x, maxAf = 0;
for (let k = 0; k < 60; k++) {
  for (const car of t.cars) car.x += 0.2; // 12 m/s bij 60 beelden
  t.v = 12;
  C.treinTick(w);
  const p = C.lichaamPlek(w, 1);
  maxAf = Math.max(maxAf, Math.hypot(w.companion.x - p.x, w.companion.y - p.y));
}
ok(maxAf <= 2, '60 tikken: het lichaam blijft binnen 2 m van de wagen', maxAf.toFixed(2));
ok(w.companion.x - vorige > 10, 'het lichaam rijdt mee met de trein', (w.companion.x - vorige).toFixed(1));
ok(w.companion.vx === 0 && w.companion.vy === 0, 'zonder eigen snelheid');
ok(w.player.x === 500 && w.player.y === 500, 'de gastheer zelf blijft waar hij is');
ok(C.treinTick(w) === 1, 'treinTick telt de meerijder');
ok(T.roleOf(t.crew, 0) === 'machinist' && w.companion.coopTrein === true, 'de gastheer blijft machinist');

// de metgezel loopt niet weg uit de trein: stepCompanion laat zijn plek met rust
w.companion.vx = 5; w.companion.vy = 3;
const xVoor = w.companion.x;
U.updateCompanion(1 / 60, w);
ok(w.companion.vx === 0 && w.companion.vy === 0, 'de metgezel krijgt geen eigen snelheid');
ok(Math.abs(w.companion.x - xVoor) < 1e-9, 'en blijft op de wagen staan');

// --- uitstappen: niet bij snelheid, wel bij bijna stilstand (naast de wagen)
const r2 = C.treinGebruik(w, 1);
ok(r2.gedaan === true && T.roleOf(t.crew, 1) === 'passagier', 'bij snelheid blijft de gast zitten');
ok(b1.some((m) => m.slot === 1 && m.tekst === C.TREIN_TEKST.wacht), 'met de melding: wacht tot de trein stilstaat');
t.v = 0;
const carUit = t.cars[0];
const r3 = C.treinGebruik(w, 1);
ok(r3.gedaan === true && !T.roleOf(t.crew, 1), 'bij stilstand stapt de gast uit');
ok(w.companion.coopTrein === false, 'zijn lichaam hangt niet meer aan de wagen');
ok(b1.some((m) => m.slot === 1 && m.aan === false), 'de gast hoort dat hij niet meer meerijdt');
const afUit = Math.hypot(w.companion.x - carUit.x, w.companion.y - carUit.y);
ok(Math.abs(w.companion.y - carUit.y) > 1.4 || Math.abs(w.companion.x - carUit.x) > carUit.len / 2, 'hij staat naast de wagen, niet erin', `${w.companion.x.toFixed(1)},${w.companion.y.toFixed(1)}`);
ok(T.roleOf(t.crew, 0) === 'machinist', 'de gastheer is nog steeds machinist');

// --- weer instappen en dan stopt de gastheer: de crew gaat weg
w.companion.x = carUit.x; w.companion.y = carUit.y;
ok(C.treinGebruik(w, 1).gedaan === true && T.roleOf(t.crew, 1) === 'passagier', 'weer ingestapt');
ok(C.treinStop(w, t) === 1 && t.crew === null, 'de gastheer stopt: de crew is opgeruimd');
ok(w.companion.coopTrein === false, 'de gast staat weer naast de wagen');
ok(b1.some((m) => m.slot === 1 && m.aan === false), 'en hij hoort het');
ok(C.treinTick(w) === 0, 'zonder crew hangt er niemand aan de trein');

// --- late instap: de dienst loopt al
{
  const b = [], w2 = newWorld(b), t2 = newTrein();
  w2.trainDriving = t2; t2.v = 0;
  t2.crew = T.newCrew(); T.board(t2.crew, 0); T.board(t2.crew, 1); t2.crew.service = true; // 1 zit al als passagier
  w2.coopFigures[2] = { slot: 2, x: 1, y: 0, gz: 0, z: 0, vx: 0, vy: 0 };
  const r = C.treinGebruik(w2, 2);
  ok(r.gedaan === true && !T.roleOf(t2.crew, 2), 'een late gast stapt niet in tijdens een dienst');
  ok(b.some((m) => m.slot === 2 && m.tekst === C.TREIN_TEKST.dienst), 'met de melding dat de dienst bezig is');

  // --- de gast valt weg: hij gaat uit de crew en staat naast de wagen
  t2.crew.service = false;
  ok(C.treinGebruik(w2, 2).gedaan === true && T.roleOf(t2.crew, 2) === 'passagier', 'zonder dienst stapt hij wel in');
  ok(w2.coopFigures[2].coopTrein === true, 'de figuur hangt aan de wagen');
  C.treinTick(w2);
  const p2 = C.lichaamPlek(w2, 2);
  ok(p2 && Math.hypot(w2.coopFigures[2].x - p2.x, w2.coopFigures[2].y - p2.y) < 1e-9, 'de figuur staat op zijn eigen wagen');
  ok(C.treinUit(w2, 2) === true && !T.roleOf(t2.crew, 2), 'de gast valt weg: uit de crew');
  ok(w2.coopFigures[2].coopTrein === false, 'en zijn figuur staat weer naast de wagen');
  ok(T.roleOf(t2.crew, 0) === 'machinist' && T.roleOf(t2.crew, 1) === 'passagier', 'de anderen blijven aan boord');
}

// --- de trein zelf: een meerijdende gast wordt niet uit de wagen geduwd (gastTreinContact en resolveContacts)
const route = { name: 'proef', train: 'gtw', pts: Array.from({ length: 101 }, (_, i) => [i * 10, 0]), stops: [{ s: 100, name: 'A' }, { s: 500, name: 'B' }, { s: 900, name: 'C' }], crossings: [] };
const R = await import('../game/js/railway.js?cooptrein');
const rw = {
  map: { railRoutes: [route], railLifts: [], levelCrossings: [], meta: { bounds: [[0, -200], [1000, 200]] }, roadsNear: () => [] },
  vehicles: [], pedestrians: [], player: { x: 2000, y: 2000, gz: 0, z: 0, radius: 0.35 }, companion: null,
  time: 0, clock: 10, money: 200, wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} },
  onRespawn: [], audioEvents: [], particles: [], addMessage() {}, health: 100, armor: 0,
};
R.initRailway(rw);
const rt = R.getTrains()[0];
rt.state = 'run'; rt.v = 12; rt.dir = 1; rt.c = 300; rt.target = 2;
R.placeTrain(rt);
rt.gastWeg = false; // een gast speelt geen dienstregeling: de wagens staan waar de host ze heeft
const car = rt.cars[1];
const gp = rw.player;
gp.x = car.x; gp.y = car.y; gp.gz = car.z || 0; gp.z = 0;
rw.coopTrein = { aan: true, rol: 'passagier' };
ok(R.gastTreinContact(rw) === 0, 'gastTreinContact laat een meerijdende gast staan');
ok(Math.abs(gp.x - car.x) < 1e-9 && Math.abs(gp.y - car.y) < 1e-9, 'en hij staat nog op dezelfde plek');
rw.coopTrein = null;
ok(R.gastTreinContact(rw) > 0, 'zonder de crew duwt de trein hem wel opzij');

// resolveContacts (de host): een figuur met coopTrein blijft staan
rt.state = 'dwell'; rt.timer = 1e9; rt.v = 0; rt.target = 1; rt.c = 500;
R.placeTrain(rt);
const hc = rt.cars[0];
rw.player.x = 2000; rw.player.y = 2000;
rw.companion = { x: hc.x, y: hc.y, gz: hc.z || 0, z: 0, radius: 0.35, state: 'ok', vx: 0, vy: 0, water: false, coopTrein: true };
rw.time += 1 / 60;
R.updateRailway(1 / 60, rw);
ok(Math.abs(rw.companion.x - hc.x) < 1e-9 && Math.abs(rw.companion.y - hc.y) < 1e-9, 'resolveContacts laat een crew-passagier staan');
rw.companion.coopTrein = false;
rw.time += 1 / 60;
R.updateRailway(1 / 60, rw);
ok(Math.hypot(rw.companion.x - hc.x, rw.companion.y - hc.y) > 0.5, 'zonder de crew duwt de wagen hem weg');

console.log(`${n - fails}/${n} cooptrein ok`);
process.exit(fails ? 1 : 0);
