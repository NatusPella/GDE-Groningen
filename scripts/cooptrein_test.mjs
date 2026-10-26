// Samen met de trein (#492): de eerste gast is conducteur, de volgende passagiers; ze hangen aan een wagen (ook als de trein
// rijdt), worden er niet uit geduwd en stappen bij stilstand weer uit. Stoppen, wegvallen en late instap ruimen de crew op.
// De conducteur bedient O (deuren) en K (waakzaamheid) via de host; elk crewlid krijgt de beloning van de dienst.
//   node scripts/cooptrein_test.mjs
import './node3d.mjs';

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

const C = await import('../game/js/cooptrein.js');
const T = await import('../game/js/treincoop.js');
const U = await import('../game/js/companion.js'); // stepCompanion laat een meerijdende gast staan
const N = await import('../game/js/coopnet.js'); // de host-haak van de conducteur en de beloning per crewlid (#492)
const M = await import('../game/js/machinist.js'); // dienstBeloning: de gastheer en de crew (#492)
const L = await import('../game/js/treinlayout.js'); // de indeling, de reizigers en het lopen (#492)
const LL = await import('../game/js/loopbaanlive.js'); // het loon en de punten van de conducteur (#492)
const TC = await import('../game/js/treincontrole.js'); // de rust na een ronde (#492)
const LB = await import('../game/js/loopbaan.js');
const { createLink } = await import('../game/js/net/memtransport.js');

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

// --- instappen: de gastheer is de machinist, de eerste gast conducteur en de tweede passagier (#492)
const b1 = [], w = newWorld(b1), t = newTrein();
w.trainDriving = t;
w.companion.x = 3; w.companion.y = 0;
const r1 = C.treinGebruik(w, 1);
ok(r1.gedaan === true && r1.rol === 'conducteur', 'de eerste gast stapt in als conducteur');
ok(T.roleOf(t.crew, 0) === 'machinist', 'de gastheer is de machinist');
ok(T.roleOf(t.crew, 1) === 'conducteur', 'de gast is conducteur');
ok(b1.some((m) => m.slot === 1 && m.aan === true && m.rol === 'conducteur'), 'de gast hoort dat hij conducteur is');
ok(b1.some((m) => m.slot === 1 && m.tekst === C.TREIN_TEKST.conducteur), 'met de uitleg van O en K');
ok(w.companion.coopTrein === true, 'zijn lichaam hangt aan de wagen');
const plek0 = C.lichaamPlek(w, 1);
ok(plek0 && Math.hypot(w.companion.x - plek0.x, w.companion.y - plek0.y) < 1e-9, 'meteen op de wagen');
ok(t.crew.conducteur === 1, 'de crew kent hem als conducteur');
// de tweede gast: de conducteurplek is bezet, dus passagier
w.coopFigures[2] = { slot: 2, x: 3, y: 0, gz: 0, z: 0, vx: 0, vy: 0 };
const r1b = C.treinGebruik(w, 2);
ok(r1b.gedaan === true && r1b.rol === 'passagier', 'de tweede gast is passagier');
ok(T.roleOf(t.crew, 2) === 'passagier' && T.roleOf(t.crew, 1) === 'conducteur', 'de conducteur blijft conducteur');
ok(b1.some((m) => m.slot === 2 && m.rol === 'passagier'), 'de tweede gast hoort zijn rol');

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
ok(C.treinTick(w) === 2, 'treinTick telt de meerijders');
ok(T.roleOf(t.crew, 0) === 'machinist' && w.companion.coopTrein === true, 'de gastheer blijft machinist');

// de metgezel loopt niet weg uit de trein: stepCompanion laat zijn plek met rust
w.companion.vx = 5; w.companion.vy = 3;
const xVoor = w.companion.x;
U.updateCompanion(1 / 60, w);
ok(w.companion.vx === 0 && w.companion.vy === 0, 'de metgezel krijgt geen eigen snelheid');
ok(Math.abs(w.companion.x - xVoor) < 1e-9, 'en blijft op de wagen staan');

// --- uitstappen: niet bij snelheid, wel bij bijna stilstand (naast de wagen)
const r2 = C.treinGebruik(w, 1);
ok(r2.gedaan === true && T.roleOf(t.crew, 1) === 'conducteur', 'bij snelheid blijft de gast zitten');
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

// --- weer instappen (de conducteurplek is vrij) en dan stopt de gastheer: de crew gaat weg
w.companion.x = carUit.x; w.companion.y = carUit.y;
ok(C.treinGebruik(w, 1).gedaan === true && T.roleOf(t.crew, 1) === 'conducteur', 'weer ingestapt als conducteur');
ok(C.treinStop(w, t) === 2 && t.crew === null, 'de gastheer stopt: de crew is opgeruimd');
ok(w.companion.coopTrein === false, 'de gast staat weer naast de wagen');
ok(b1.some((m) => m.slot === 1 && m.aan === false), 'en hij hoort het');
ok(C.treinTick(w) === 0, 'zonder crew hangt er niemand aan de trein');

// --- late instap: de dienst loopt al
{
  const b = [], w2 = newWorld(b), t2 = newTrein();
  w2.trainDriving = t2; t2.v = 0;
  t2.crew = T.newCrew(); T.board(t2.crew, 0); T.board(t2.crew, 1, 'conducteur'); t2.crew.service = true; // 1 zit al als conducteur
  w2.coopFigures[2] = { slot: 2, x: 1, y: 0, gz: 0, z: 0, vx: 0, vy: 0 };
  const r = C.treinGebruik(w2, 2);
  ok(r.gedaan === true && !T.roleOf(t2.crew, 2), 'een late gast stapt niet in tijdens een dienst');
  ok(b.some((m) => m.slot === 2 && m.tekst === C.TREIN_TEKST.dienst), 'met de melding dat de dienst bezig is');
  // de echte dienstvlag staat op de trein (machinist.js), niet alleen op de testcrew
  t2.crew.service = false; t2.service = true;
  const rv = C.treinGebruik(w2, 2);
  ok(rv.gedaan === true && !T.roleOf(t2.crew, 2), 'de dienstvlag op de trein weigert de late gast ook');
  t2.service = false;

  // --- de gast valt weg: hij gaat uit de crew en staat naast de wagen
  t2.crew.service = false;
  ok(C.treinGebruik(w2, 2).gedaan === true && T.roleOf(t2.crew, 2) === 'passagier', 'zonder dienst stapt hij wel in');
  ok(w2.coopFigures[2].coopTrein === true, 'de figuur hangt aan de wagen');
  C.treinTick(w2);
  const p2 = C.lichaamPlek(w2, 2);
  ok(p2 && Math.hypot(w2.coopFigures[2].x - p2.x, w2.coopFigures[2].y - p2.y) < 1e-9, 'de figuur staat op zijn eigen wagen');
  ok(C.treinUit(w2, 2) === true && !T.roleOf(t2.crew, 2), 'de gast valt weg: uit de crew');
  ok(w2.coopFigures[2].coopTrein === false, 'en zijn figuur staat weer naast de wagen');
  ok(T.roleOf(t2.crew, 0) === 'machinist' && T.roleOf(t2.crew, 1) === 'conducteur', 'de anderen blijven aan boord');
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

// --- O en K van de conducteur (#492): de host zet een vlag voor machinist.js en traindrive.js; een passagier mag het niet
{
  const b = [], w3 = newWorld(b), t3 = newTrein();
  w3.trainDriving = t3; w3.coopNet = { role: 'host' };
  t3.crew = T.newCrew(); T.board(t3.crew, 0); T.board(t3.crew, 1, 'conducteur'); T.board(t3.crew, 2);
  ok(N.handleEvent(w3, { k: 'trein', a: 'deur' }, 1) === true && w3.coopTreinDeur === true, 'O van de conducteur zet de deurvlag');
  // machinist.js en traindrive.js nemen die vlag over als de gewone O en K (broncheck in coopgaten_test)
  ok(!w3.coopTreinWaak && N.handleEvent(w3, { k: 'trein', a: 'waak' }, 1) === true && w3.coopTreinWaak === true, 'K van de conducteur zet de waakvlag');
  w3.coopTreinDeur = false; w3.coopTreinWaak = false;
  ok(N.handleEvent(w3, { k: 'trein', a: 'deur' }, 2) === true && w3.coopTreinDeur === false, 'een passagier mag de deuren niet');
  ok(b.some((m) => m.slot === 2 && m.tekst === C.TREIN_TEKST.geenRol), 'en hoort waarom');
  ok(N.handleEvent(w3, { k: 'trein', a: 'waak' }, 2) === true && w3.coopTreinWaak === false, 'en de waakzaamheid ook niet');
  t3.crew.conducteur = null;
  ok(N.handleEvent(w3, { k: 'trein', a: 'deur' }, 2) === true && w3.coopTreinDeur === false, 'zonder conducteur mag een passagier het nog niet');
  ok(N.handleEvent(w3, { k: 'trein', a: 'deur' }, 0) === false, 'de gastheer stuurt zijn eigen O niet als bericht');
  ok(N.handleEvent(w3, { k: 'trein', a: 'onzin' }, 1) === false, 'een onbekende actie telt niet');
  w3.trainDriving = null;
  ok(N.handleEvent(w3, { k: 'trein', a: 'deur' }, 1) === false, 'zonder trein van de gastheer gebeurt er niets');
  ok(C.treinStop(w3, t3) === 1 && w3.coopTreinDeur === false && w3.coopTreinWaak === false, 'de dienst stopt: de vlaggen zijn leeg');
}

// --- de beloning per crewlid (#492): de gastheer houdt zijn bedrag, elk crewlid krijgt het volle bedrag en de XP
{
  const gedeeld = [];
  const crew = T.newCrew(); T.board(crew, 0); T.board(crew, 1, 'conducteur'); T.board(crew, 2);
  const w4 = { trainDriving: { crew }, money: 0, addMessage() {}, coopDeel: (bedrag, info) => { gedeeld.push({ bedrag, info }); return 2; } };
  const betaald = M.dienstBeloning(w4, 120, 40);
  ok(betaald > 0 && w4.money === betaald, 'de gastheer houdt zijn eigen loopbaanVerdien-bedrag');
  ok(gedeeld.length === 1, 'één coopDeel per dienst');
  ok(gedeeld[0].bedrag === betaald, 'met het bedrag dat de gastheer kreeg');
  ok(gedeeld[0].info.vak === 'trein' && gedeeld[0].info.xp === 40 && gedeeld[0].info.basis === 120, 'met het vak, de XP en het basisbedrag');
  ok(JSON.stringify(gedeeld[0].info.slots) === '[1,2]', 'alleen de crew, zonder de gastheer', JSON.stringify(gedeeld[0].info.slots));
  ok(!gedeeld[0].info.slots.includes(0), 'de gastheer zit niet in de lijst');
  // zonder crew deelt hij niets; een gast die niet meereden heeft, komt er niet in
  const w5 = { trainDriving: { crew: null }, money: 0, addMessage() {}, coopDeel: () => { throw new Error('geen betaling zonder crew'); } };
  ok(M.dienstBeloning(w5, 120, 40) > 0 && w5.money > 0, 'zonder crew betaalt de gastheer alleen zichzelf');
}

// --- de echte sessie: de conducteur krijgt het volle bedrag, een gast buiten de crew niets (#492)
{
  const mkWorld = (extra = {}) => ({
    player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' },
    coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); },
    input: { wasPressed: () => false, isDown: () => false, axis: () => [0, 0] }, ...extra,
  });
  const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
  const hw = mkWorld();
  N.startHost(hw, INFO, { seed: 5, max: 4 });
  const link = createLink({ latency: 0.02, jitter: 0, loss: 0, seed: 3 });
  N.addGuest(hw, link.a);
  const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
  N.startClient(gw, link.b, INFO);
  const step = (secs) => { for (let k = 0; k < Math.round(60 * secs); k++) { N.tickCoopNet(hw, 1 / 60); if (gw.coopNet) N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); gw.time += 1 / 60; hw.time += 1 / 60; } };
  step(3);
  const crew = T.newCrew(); T.board(crew, 0); T.board(crew, 1, 'conducteur');
  hw.trainDriving = { state: 'player', crew };
  // de O en K van de conducteur gaan echt over de lijn naar de gastheer (#492)
  hw.coopTreinDeur = false; hw.coopTreinWaak = false;
  N.gastTrein(gw, 'deur');
  step(1);
  ok(hw.coopTreinDeur === true, 'de O van de conducteur komt bij de gastheer aan');
  N.gastTrein(gw, 'waak');
  step(1);
  ok(hw.coopTreinWaak === true, 'de K van de conducteur ook');
  hw.coopTreinDeur = false; hw.coopTreinWaak = false;
  const betaald = M.dienstBeloning(hw, 120, 40);
  step(1);
  ok(betaald > 0 && hw.money === betaald, 'de gastheer verdient de dienst');
  ok(gw.money === betaald && gw.coopVerdiend === betaald, 'de conducteur krijgt het volle bedrag in zijn eigen geld', `${gw.money} / ${betaald}`);
  const voor = gw.money;
  T.leave(crew, 1); // hij stapt uit: geen crewlid meer
  M.dienstBeloning(hw, 120, 0);
  step(1);
  ok(gw.money === voor, 'wie niet in de crew zit krijgt niets');
  ok(hw.money > betaald, 'de gastheer houdt zijn eigen bedrag');
  N.stopCoopNet(hw);
}

// --- de conducteur loopt en controleert (#492): T, WASD, E bij een zittende reiziger, vijf per ronde
{
  const cfg = {
    label: 'GTW', height: 3.2, front: 'gtw', doubleDeck: false,
    segments: [{ kind: 'car', len: 17, cab: 1 }, { kind: 'car', len: 17, cab: -1 }],
  };
  const trein = () => ({
    state: 'player', v: 0, dir: 1, c: 40, route: {}, cfg, halfLen: 26,
    cars: [
      { x: 0, y: 0, angle: 0, len: 17, z: 0, seg: cfg.segments[0] },
      { x: -18.5, y: 0, angle: 0, len: 17, z: 0, seg: cfg.segments[1] },
    ],
  });
  const nepInvoer = () => {
    const pressed = new Set(), down = new Set();
    return {
      mouse: { dx: 0, dy: 0, locked: false }, lookActive: () => false,
      wasPressed: (k) => pressed.has(k), isDown: (k) => down.has(k),
      consume: (k) => pressed.delete(k), pressed, down,
    };
  };
  const gt = trein();
  const gb = [], gw = newWorld(gb);
  gw.coopTrein = { aan: true, rol: 'conducteur', treinId: 0 };
  gw.input = nepInvoer();
  gw.money = 0;
  const zendingen = [];
  gw.coopTreinWalkMeld = (w, walk) => { zendingen.push(walk); return true; };
  C.zetTreinBron(() => ({ treinen: [gt], routes: [gt.route] }));
  LL.zetProfielVoorTest(LB.nieuwProfiel(), null); // het loon van de conducteur, nooit naar de echte opslag

  // T: de conducteur staat op en ziet de wagen van binnen
  gw.input.pressed.add('t');
  ok(C.gastTreinTik(gw, 1 / 60) === true, 'T opent de loopstand voor de conducteur');
  ok(gw.trainWalk && gw.trainWalk.car === 0 && gw.trainWalk.gast === true, 'hij staat in de eerste wagen');
  ok(L.canStand(L.trainLayout(cfg)[gw.trainWalk.car], gw.trainWalk.lx, gw.trainWalk.lz), 'op een plek waar je kunt staan');
  ok(gw.trainCam && gw.trainCam.inside === true && gw.trainCam.eye && gw.trainCam.eye.interior === true, 'de camera staat binnen in de trein');
  ok(gw.trainCam.model && gw.trainCam.model.len === 17 && gw.trainCam.eye.fov === 72, 'met het model van de wagen en dezelfde kijkhoek als de machinist');
  ok(gb.some((m) => m.tekst === C.TREIN_TEKST.lopen), 'en hij hoort wat hij kan doen');

  // lopen over het gangpad: het lichaam gaat mee en de positie gaat naar de gastheer
  const lx0 = gw.trainWalk.lx;
  gw.input.down.add('w');
  for (let k = 0; k < 20; k++) C.gastTreinTik(gw, 0.1);
  gw.input.down.delete('w');
  ok(gw.trainWalk.lx > lx0 + 1, 'W loopt naar voren door het gangpad', (gw.trainWalk.lx - lx0).toFixed(2));
  ok(gw.trainWalk.lz === 0 && L.canStand(L.trainLayout(cfg)[0], gw.trainWalk.lx, gw.trainWalk.lz), 'en blijft in het gangpad');
  const eigen = L.carPoint(gt.cars[0], gw.trainWalk.lx, gw.trainWalk.lz);
  ok(Math.hypot(gw.player.x - eigen.x, gw.player.y - eigen.y) < 1e-9, 'het eigen lichaam staat op de vloer van de wagen');
  ok(zendingen.some((z) => z && z.car === 0 && Number.isFinite(z.lx)), 'de looppositie gaat naar de gastheer');
  ok(gw.trainCam.eye.position.z > 1.5, 'de ogen zitten boven de vloer', String(gw.trainCam.eye.position.z));

  // vijf reizigers controleren: elk een antwoord, de teller loopt, de vijfde betaalt één keer
  const cl = L.trainLayout(cfg)[0];
  const pax = L.passengers(cl, C.reizigerSeed(gt, 0)).seated;
  ok(pax.length >= 6, 'er zitten genoeg reizigers in de wagen', String(pax.length));
  const loon = LL.loopbaanLoon('trein', 45);
  for (let i = 0; i < 5; i++) {
    gw.trainWalk.lx = pax[i].x; gw.trainWalk.lz = pax[i].z;
    gw.input.pressed.add('e');
    C.gastTreinTik(gw, 1 / 60);
  }
  ok(gw.money === loon, 'na vijf reizigers volgt het loon in zijn eigen geld', `${gw.money} / ${loon}`);
  ok(gw.trainControle.rondes === 1, 'de ronde is geteld');
  ok(gb.some((m) => /^Kaartjes gecontroleerd: €/.test(m.tekst)), 'met een melding van het loon');
  // een zesde reiziger betaalt niet meteen opnieuw: eerst de rust
  gw.trainWalk.lx = pax[5].x; gw.trainWalk.lz = pax[5].z;
  gw.input.pressed.add('e');
  C.gastTreinTik(gw, 1 / 60);
  ok(gw.money === loon, 'de zesde controle betaalt niet nog eens');
  ok(gw.trainControle.n === 0, 'binnen de rust begint de volgende ronde niet');
  ok(gb.some((m) => m.tekst === C.TREIN_TEKST.rust), 'met de melding van de rust');
  gw.time = TC.CONTROLE_RUST_S + 1;
  gw.input.pressed.add('e');
  C.gastTreinTik(gw, 1 / 60);
  ok(gw.trainControle.n === 1, 'na de rust telt de volgende ronde vanaf één');

  // een passagier loopt niet en controleert niet
  gw.coopTrein.rol = 'passagier';
  ok(C.gastControleer(gw) === false && gw.money === loon, 'een passagier controleert geen kaartjes');
  C.gastWalkStop(gw, true);
  gw.input.pressed.add('t');
  ok(C.gastTreinTik(gw, 1 / 60) === false && !gw.trainWalk, 'en opent met T geen loopstand');
  ok(gb.some((m) => m.tekst === C.TREIN_TEKST.geenConducteur), 'met de melding dat alleen de conducteur dat doet');

  // T nog eens: terug op zijn plek; de gastheer hoort dat de walkstand weg is
  gw.coopTrein.rol = 'conducteur';
  gw.input.pressed.add('t');
  C.gastTreinTik(gw, 1 / 60);
  ok(gw.trainWalk && gw.trainCam && gw.trainCam.inside, 'de conducteur loopt weer');
  zendingen.length = 0;
  gw.input.pressed.add('t');
  C.gastTreinTik(gw, 1 / 60);
  ok(!gw.trainWalk && !gw.trainCam, 'T nog eens: terug op zijn plek, zonder treincamera');
  ok(zendingen.length === 1 && zendingen[0] === null, 'de gastheer hoort dat de looppositie weg is');
  ok(gb.some((m) => m.tekst === C.TREIN_TEKST.stoppen), 'met een melding');

  // uitstappen of wegvallen: het trein-bericht zet de walkstand uit
  gw.input.pressed.add('t');
  C.gastTreinTik(gw, 1 / 60);
  gw.coopNet = { role: 'client' };
  ok(N.handleEvent(gw, { k: 'trein', aan: false }, 0) === true, 'de gastheer meldt dat hij uitstapt');
  ok(!gw.coopTrein && !gw.trainWalk && !gw.trainCam, 'wegvallen of uitstappen ruimt de walkstand en de camera op');

  // de gastheer ziet de conducteur in de juiste wagen
  const ht = trein();
  const hb = [], hw = newWorld(hb);
  hw.trainDriving = ht; hw.coopNet = { role: 'host' };
  ht.crew = T.newCrew(); T.board(ht.crew, 0); T.board(ht.crew, 1, 'conducteur');
  ok(N.handleEvent(hw, { k: 'trein', a: 'walk', car: 1, lx: 0.2, lz: 0.1, yaw: 1.2 }, 1) === true, 'de looppositie komt bij de gastheer aan');
  C.treinTick(hw);
  const hp = L.carPoint(ht.cars[1], 0.2, 0.1);
  ok(Math.hypot(hw.companion.x - hp.x, hw.companion.y - hp.y) < 1e-9, 'het lichaam staat in de wagen uit het bericht');
  ok(Math.abs(hw.companion.angle - (ht.cars[1].angle + 1.2)) < 1e-9, 'met de kijkrichting van de conducteur');
  ok(hw.companion.coopTrein === true, 'en hangt aan de trein');
  ok(N.handleEvent(hw, { k: 'trein', a: 'walk', car: 1, lx: 99, lz: 99, yaw: 0 }, 1) === true, 'een ongeldige plek wordt ontvangen');
  ok(hw.coopTreinWalk[1].lx === 0.2, 'maar niet overgenomen');
  ok(N.handleEvent(hw, { k: 'trein', a: 'walk', weg: 1 }, 1) === true && !hw.coopTreinWalk[1], 'de gastheer ruimt de looppositie op');
  ok(N.handleEvent(hw, { k: 'trein', a: 'walk', car: 0, lx: -2, lz: 0, yaw: 0 }, 2) === false, 'wie niet in de crew zit krijgt geen plek');
  C.treinUit(hw, 1, ht);
  ok(!hw.coopTreinWalk || !hw.coopTreinWalk[1], 'uitstappen ruimt de looppositie op');
  C.zetTreinBron(null);
  LL.zetProfielVoorTest(null, null);
}

console.log(`${n - fails}/${n} cooptrein ok`);
process.exit(fails ? 1 : 0);
