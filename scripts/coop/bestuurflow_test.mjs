// Samen spelen (#434): de hele stroom van een gast in een voertuig, als suite in de testbank en zonder Electron:
// instappen -> een tijdje meerijden -> uitstappen -> weer instappen. De koppeling is de echte (coopnet.js: gastheer
// en gast in één proces over een in-memory transport, net als in het spel) en de haken zijn de echte van main.js
// (Player.prototype.enterVehicle, exitVehicle, driveVehicle en stapNaastDeur op het lichaam dat coopbestuur.js
// aanwijst). Niets nagespeeld, geen browser, geen netwerk, geen echte opslag.
//
// Waarom deze suite: de playtest van 31-10 meldde een crash bij het in- en uitstappen van een gast in een voertuig
// van de gastheer. De directe fout is gerepareerd (5e7f456f: de proxy van een gast miste stapNaastDeur) en
// scripts/coopbestuur_crash_test.mjs speelt die losse gevallen na. Wat er nog niet was, is de stroom als geheel:
// na elke stap moet de wereld nog kloppen. Daarom controleert deze suite na elke stap:
//   1. de rijdersregel van de gastheer (world.coopRijders): geen spookrijder na het uitstappen,
//   2. de gast heeft een lichaam op de plek waar hij uitstapte: niet op (0,0) en niet in de vorige auto,
//   3. de tick erna gooit geen uitzondering (precies de crash die spelers zagen),
//   4. dezelfde stroom voor een tweede voertuigtype: een boot (een gast mag een vrije boot besturen).
//
// Twee stromen, want de playtest noemde "met de gastheer meerijden" én de crash zat in het zelf besturen:
//   A. de gast bestuurt zelf een vrij voertuig (coopbestuur.js, de proxy van #516 en de crash van 5e7f456f);
//   B. de gast rijdt mee in het voertuig van de gastheer (coopnet.js figGebruik/figUit).
//
//   node scripts/coop/bestuurflow_test.mjs     (in de gewone suite via scripts/coopbestuurflow_test.mjs)
import '../node3d.mjs';
import assert from 'node:assert/strict';

// Nooit naar echte opslag schrijven (AGENTS.md, Testen): node3d.mjs geeft een opslag in het geheugen, en deze haak
// eromheen houdt bij of het spel toch een echte sleutel zou willen schrijven (dat hoort niet en is een fout).
const opslagSchrijfsels = [];
{
  const mem = globalThis.localStorage, schrijf = mem.setItem.bind(mem);
  mem.setItem = (k, v) => { if (/^gde-/.test(String(k))) opslagSchrijfsels.push(String(k)); schrijf(k, v); };
}

const { Player } = await import('../../game/js/player.js'); // three.js: pas na de laadhaak van node3d.mjs
const V = await import('../../game/js/vehicle.js');
const B = await import('../../game/js/coopbestuur.js');
const N = await import('../../game/js/coopnet.js');
const { reportCrime } = await import('../../game/js/crime.js');
const { createLink } = await import('../../game/js/net/memtransport.js');
const { BOAT_KINDS } = await import('../../game/js/boattypes.js');

let checks = 0;
let groepen = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
const t = (naam, f) => { f(); groepen++; console.log(`${groepen}. ok   ${naam}`); };

// ------------------------------------------------------------------ de haken van main.js (467), zonder nepversies
// Object.assign laat los/bijGroep staan: die zet coopnet.js zelf bij het laden (losVoor/zetBijGroep).
function zetHaken() {
  B.zetBestuurHaken({
    vind: V.findEnterableVehicle, vindProp: null, rijProp: null, trekUit: null,
    misdaad: (w, slot, kind) => reportCrime(w, kind, { dader: slot }),
    enter: (l, v, w) => Player.prototype.enterVehicle.call(l, v, w),
    exit: (l, map, w, th) => Player.prototype.exitVehicle.call(l, map, w, th),
    drive: (l, dt, inv, map, w) => Player.prototype.driveVehicle.call(l, dt, inv, map, w),
    stap: (l, v, map, uit) => Player.prototype.stapNaastDeur.call(l, v, map, uit),
  });
}

// Een platte kaart: geen gebouwen. Met water (voor de boot) is alles binnen de ring water; de gast stapt daar naast
// de romp uit (een boot heeft geen deur), en de kaart moet dan ook een noodplek kunnen geven.
const WATER = { pts: [[-600, -600], [600, -600], [600, 600], [-600, 600]] };
const maakKaart = (water = false) => ({
  buildingsNear: () => [],
  escapeBuilding: (x, y) => [x, y],
  ...(water ? { water: [WATER], waterNear: () => [WATER] } : null),
});

const sedan = (x = 0, y = 0, angle = 0) => new V.Vehicle(x, y, angle, V.TRAFFIC_MODELS().find((m) => m.name === 'sedan'));
const boot = (x = 0, y = 0, angle = 0) => { const v = new V.Vehicle(x, y, angle, BOAT_KINDS.sloep); v.isBoat = true; return v; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const leegInvoer = () => ({ axis: () => [0, 0], isDown: () => false, wasPressed: () => false });
// De invoer van de gast op zijn eigen scherm: gas (my = -1) of de handrem (Spatie).
const gasInvoer = (rem = false) => ({ axis: () => [0, -1], isDown: (k) => k === ' ' && rem, wasPressed: () => false });
const remInvoer = () => ({ axis: () => [0, 0], isDown: (k) => k === ' ', wasPressed: () => false });

function gastWereld() {
  return {
    player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    companion: { x: 1, y: 1, angle: 0, character: 'tammo', vx: 0, vy: 0, radius: 0.4, inVehicle: null },
    coop: { local: true }, coopFigures: {}, vehicles: [], pedestrians: [], money: 0, wanted: 0,
    time: 0, clock: 12, camYaw: 0, paused: false, messages: [], input: leegInvoer(),
    addMessage(m) { this.messages.push(m); },
  };
}

// De wereld van de gastheer met een echte Player (plek 0) en een gast (plek 1) die erover het net bij komt.
function tafel({ voertuig = null, water = false } = {}) {
  const map = maakKaart(water);
  const v = voertuig || (water ? boot() : sedan());
  const host = {
    player: null,
    companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    coop: { local: true }, vehicles: [v], pedestrians: [], wildlife: [], map,
    money: 0, wanted: 0, time: 0, clock: 12, paused: false, camYaw: 0,
    coopFigures: {}, messages: [], audioEvents: [],
    addMessage(m) { this.messages.push(m); },
  };
  host.player = new Player(0, 0, host); host.player.character = 'tammo';
  N.startHost(host, INFO, { seed: 5 });

  const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 });
  N.addGuest(host, link.a);
  const gw = gastWereld();
  N.startClient(gw, link.b, INFO, {});

  // Eén beeld: de gastheer rijdt (als hij een voertuig heeft), dan de koppeling aan beide kanten.
  const stap = (secs, rij = null) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      if (rij) host.player.driveVehicle(1 / 60, rij, map, host);
      N.tickCoopNet(host, 1 / 60);
      if (gw.coopNet) N.tickCoopNet(gw, 1 / 60);
      link.advance(1 / 60);
      host.time += 1 / 60; gw.time += 1 / 60;
    }
  };
  return { host, gw, v, map, stap };
}

// De stand van de gast op de gastheer: zijn figuur, de rijdersregel en (via de snapshot) wat de gast zelf ziet.
const figuur = (host, slot = 1) => host.coopFigures[slot] || null;
const regelVan = (host, slot = 1) => (host.coopRijders || {})[slot] || null;
// Afstand tot de as/midden van het voertuig en aan welke kant van de lengteas het lichaam staat (-1 links, +1 rechts).
const naast = (v, f) => ({
  afstand: Math.hypot(f.x - v.x, f.y - v.y),
  kant: Math.sign((f.x - v.x) * -Math.sin(v.angle) + (f.y - v.y) * Math.cos(v.angle)),
});

// De controles die na elke stap gelden. `na` is de naam van de stap, voor de foutmelding.
function wereldKlopt(host, v, { na, rijdt = false }) {
  const f = figuur(host);
  ok(f, `${na}: de gast heeft een figuur op de gastheer`);
  ok(Number.isFinite(f.x) && Number.isFinite(f.y), `${na}: de gast heeft een geldige plek (${f.x}, ${f.y})`);
  ok(Number.isFinite(f.gz) || f.gz === undefined, `${na}: en een geldige hoogte`); // undefined: hij is nog nergens ingestapt
  ok(Math.hypot(f.x, f.y) > 1, `${na}: de gast staat niet op (0,0) maar op (${f.x.toFixed(2)}, ${f.y.toFixed(2)})`);
  ok(v.driver === 'player' || v.driver === null, `${na}: geen AI-bestuurder in het voertuig (${v.driver})`);
  if (rijdt) ok(regelVan(host), `${na}: de rijdersregel van de gastheer bestaat`);
  else {
    ok(!regelVan(host), `${na}: geen spookrijder in world.coopRijders`);
    ok(!f.coopBestuurt, `${na}: de gast denkt niet meer dat hij rijdt`);
    ok(!f.inVeh, `${na}: de gast zit niet meer in een voertuig`);
    ok(!v.coopBestuurder, `${na}: de stoel van de gast is vrij`);
    ok(v.driver === null, `${na}: niemand bestuurt het voertuig meer (${v.driver})`);
    ok(f.inVeh !== v, `${na}: en hij zit niet in de vorige auto`);
  }
}

// De tick erna: precies de crash die spelers zagen (een rijdersregel of een lichaam zonder voertuig in
// player.js). Een uitzondering hier is de fout, dus niet wegvangen maar laten vallen met de stap erbij.
function tickErna(t, na) {
  try { t.stap(0.5); } catch (e) { throw new Error(`${na}: de tick erna gooit een uitzondering: ${e && e.message}`); }
}

// ------------------------------------------------------------------ A. de gast bestuurt zelf een auto
t('A: een gast stapt in, rijdt, stapt uit en stapt weer in (auto)', () => {
  zetHaken();
  const tafelA = tafel();
  const { host, gw, v } = tafelA;
  tafelA.stap(2); // de gast is verbonden

  // De auto naast de gast: hij komt naast de gastheer binnen (binnen een paar meter), dus de auto zetten we bij hem.
  const f0 = figuur(host);
  v.x = f0.x + 1.4; v.y = f0.y; v.angle = 0; v.speed = 0;
  ok(V.distToVehicleBody(v, f0.x, f0.y) < V.ENTER_REACH, 'de gast staat bij de vrije auto');

  // ---- instappen
  ok(N.gastGebruik(gw), 'de E van de gast gaat naar de gastheer');
  tafelA.stap(0.6);
  eq(v.driver, 'player', 'de gast is de bestuurder (driver player, dus geen verkeersAI)');
  eq(v.coopBestuurder, 1, 'en het voertuig weet welke plek hem bestuurt');
  eq(figuur(host).inVeh, v, 'zijn lichaam zit in de auto');
  eq(figuur(host).coopBestuurt, true, 'en hij bestuurt hem');
  eq(regelVan(host).v, v, 'de gastheer houdt een rijdersregel bij');
  eq(host.coopFigures[1].x, v.x, 'het lichaam volgt het voertuig');
  eq(gw.coopInVoertuig, true, 'de gast ziet in zijn snapshot dat hij meerijdt');
  eq(gw.coopBestuurder, true, 'en dat hij zelf rijdt');
  ok(gw.messages.some((m) => /Je rijdt/.test(m)), 'de gast hoort dat hij rijdt');

  // ---- meerijden
  const x0 = v.x, y0 = v.y, t0 = host.time;
  gw.input = gasInvoer();
  tafelA.stap(3);
  const reed = Math.hypot(v.x - x0, v.y - y0);
  ok(reed > 4, `de auto reed weg (${reed.toFixed(1)} m)`);
  ok(Math.abs(v.speed) > 2, `met snelheid (${v.speed.toFixed(1)} m/s)`);
  ok(Math.abs(figuur(host).x - v.x) < 1e-9 && Math.abs(figuur(host).y - v.y) < 1e-9, 'de gast zit op de plek van de auto');
  ok(host.time > t0, 'de klok van de gastheer liep door');
  wereldKlopt(host, v, { na: 'A meerijden', rijdt: true });

  // ---- uitstappen (bijna stilstand: eerst remmen)
  gw.input = remInvoer();
  tafelA.stap(3);
  ok(Math.abs(v.speed) <= 2, `de auto staat bijna stil (${v.speed.toFixed(2)} m/s)`);
  const plekUit = { x: v.x, y: v.y };
  ok(N.gastGebruik(gw), 'de E van de gast komt aan bij de gastheer');
  tafelA.stap(0.5);
  wereldKlopt(host, v, { na: 'A uitstappen' });
  const f = figuur(host);
  const { afstand, kant } = naast(v, f);
  ok(afstand > v.halfWid + 0.4, `hij staat naast de auto, niet erin (${afstand.toFixed(2)} m van het midden)`);
  ok(afstand < v.halfWid + 3, `en niet meters verderop (${afstand.toFixed(2)} m)`);
  eq(kant, -1, 'aan de chauffeurskant (links, waar zijn deur zit)');
  ok(Math.hypot(f.x - plekUit.x, f.y - plekUit.y) < 5, 'vlak bij waar hij uitstapte');
  eq(f.stoel, undefined, 'en zijn stoel is weer vrij');
  ok(f.x !== 0 || f.y !== 0, 'niet terug naar het nulpunt');
  eq(gw.coopInVoertuig, false, 'de gast ziet in zijn snapshot dat hij weer buiten staat');
  eq((gw.coopZitters || []).filter((z) => z.slot === 1).length, 0, 'en dat hij niet meer op een stoel zit');
  tickErna(tafelA, 'A uitstappen');

  // ---- weer instappen
  v.x = f.x + 1.2; v.y = f.y; v.angle = 0; v.speed = 0; // dezelfde auto, waar hij nu staat
  ok(N.gastGebruik(gw), 'de tweede E komt aan');
  tafelA.stap(0.6);
  eq(v.coopBestuurder, 1, 'de gast bestuurt dezelfde auto weer');
  eq(figuur(host).inVeh, v, 'en zit er weer in');
  eq(regelVan(host).slot, 1, 'met een nieuwe rijdersregel');
  eq(gw.coopBestuurder, true, 'de gast weet het ook');
  tickErna(tafelA, 'A weer instappen');
  wereldKlopt(host, v, { na: 'A weer instappen', rijdt: true });
  eq(host.coopRijders[1].slot, 1, 'de rijdersregel wijst naar dezelfde gast');
});

// ------------------------------------------------------------------ B. de gast rijdt mee met de gastheer
t('B: een gast stapt in bij de gastheer, rijdt mee, stapt uit en weer in', () => {
  zetHaken();
  const tafelB = tafel();
  const { host, gw, v } = tafelB;
  tafelB.stap(2);

  // De gastheer stapt in de auto (de echte Player-methode) en de gast staat ernaast.
  Player.prototype.enterVehicle.call(host.player, v, host);
  eq(host.player.inVehicle, v, 'de gastheer zit achter het stuur');
  eq(v.driver, 'player', 'en de auto is van hem');
  ok(Math.hypot(figuur(host).x - v.x, figuur(host).y - v.y) <= N.FIGUUR_INSTAP_AFSTAND, 'de gast staat dichtbij genoeg om mee te rijden');

  // ---- instappen (meerijden)
  ok(N.gastGebruik(gw), 'de E van de gast komt aan');
  tafelB.stap(0.5);
  eq(figuur(host).inVeh, v, 'de gast rijdt mee');
  eq(figuur(host).coopVoertuig, true, 'op een eigen stoel');
  ok(!figuur(host).coopBestuurt, 'maar hij bestuurt niet');
  ok(!regelVan(host), 'de rijdersregel is alleen voor wie zelf stuurt');
  eq(gw.coopInVoertuig, true, 'de gast ziet dat hij meerijdt');

  // ---- meerijden: de gastheer rijdt
  const x0 = v.x, y0 = v.y;
  tafelB.stap(3, { axis: () => [0, -1], isDown: () => false, wasPressed: () => false });
  ok(Math.hypot(v.x - x0, v.y - y0) > 4, `de auto reed weg (${Math.hypot(v.x - x0, v.y - y0).toFixed(1)} m)`);
  ok(figuur(host).inVeh === v, 'de gast zit er nog in');
  ok(Math.abs(figuur(host).x - v.x) < 1e-9, 'en op de plek van de auto');

  // ---- uitstappen (remmen tot stilstand)
  tafelB.stap(3, remInvoer());
  ok(Math.abs(v.speed) <= 2, `de auto staat bijna stil (${v.speed.toFixed(2)} m/s)`);
  const plekUit = { x: v.x, y: v.y };
  ok(N.gastGebruik(gw), 'de E van de gast komt aan');
  tafelB.stap(0.5);
  eq(figuur(host).inVeh, null, 'de gast is uitgestapt');
  eq(figuur(host).coopVoertuig, false, 'en hoort niet meer bij het voertuig');
  eq(host.player.inVehicle, v, 'de gastheer zit er nog in');
  eq(v.driver, 'player', 'en blijft de bestuurder');
  ok(!regelVan(host), 'geen rijdersregel voor een meerijder');
  const f = figuur(host);
  ok(Math.hypot(f.x, f.y) > 1, `de gast staat niet op (0,0) maar op (${f.x.toFixed(2)}, ${f.y.toFixed(2)})`);
  ok(f.x !== v.x || f.y !== v.y, 'en niet meer in de auto (daar stapte hij uit)');
  const afstand = Math.hypot(f.x - v.x, f.y - v.y);
  ok(afstand > v.halfWid + 1 && afstand < v.halfWid + 3.5, `naast de auto (${afstand.toFixed(2)} m van het midden)`);
  ok(Math.hypot(f.x - plekUit.x, f.y - plekUit.y) < 5, 'vlak bij waar hij uitstapte');
  eq(gw.coopInVoertuig, false, 'de gast ziet dat hij weer buiten staat');
  tickErna(tafelB, 'B uitstappen');
  ok(Math.hypot(f.x, f.y) > 1, 'de gast staat na de tick nog steeds op zijn eigen plek');

  // ---- weer instappen
  ok(N.gastGebruik(gw), 'de tweede E komt aan');
  tafelB.stap(0.5);
  eq(figuur(host).inVeh, v, 'de gast rijdt weer mee');
  ok(!figuur(host).coopBestuurt, 'nog steeds als bijrijder');
  eq(gw.coopInVoertuig, true, 'de gast ziet het');
  tickErna(tafelB, 'B weer instappen');
  ok(figuur(host).inVeh === v, 'en zit er na de tick nog in');
});

// ------------------------------------------------------------------ C. hetzelfde met een boot (tweede voertuigtype)
// Een boot is het tweede type omdat vehicleregister.js hem voor een gast openstelt (bestuur 'gast'). Een helikopter
// en een vliegtuig mogen niet (weigerReden: 'vlieg'), dus die vallen af. Een boot heeft geen deur: hij vaart op het
// water, dus de gast stapt naast de romp uit (collision.js findExitSpot zoekt eerst een droge oever en komt anders
// naast de boot uit). Daarom toetst deze stap dezelfde punten, maar met de afstand tot de romp als maat.
t('C: de hele stroom ook met een boot (geen deur: naast de romp)', () => {
  zetHaken();
  const tafelC = tafel({ water: true });
  const { host, gw, v } = tafelC;
  tafelC.stap(2);
  ok(v.isBoat, 'een boot');

  const f0 = figuur(host);
  v.x = f0.x + 2; v.y = f0.y; v.angle = 0; v.speed = 0;
  ok(N.gastGebruik(gw), 'de E van de gast komt aan');
  tafelC.stap(0.6);
  eq(v.coopBestuurder, 1, 'de gast bestuurt de boot');
  eq(v.driver, 'player', 'met de spelersbesturing (geen AI)');
  eq(figuur(host).inVeh, v, 'en zit erin');
  eq(gw.coopBestuurder, true, 'de gast weet het');

  const x0 = v.x, y0 = v.y;
  gw.input = gasInvoer();
  tafelC.stap(3);
  ok(Math.hypot(v.x - x0, v.y - y0) > 2, `de boot voer weg (${Math.hypot(v.x - x0, v.y - y0).toFixed(1)} m)`);
  wereldKlopt(host, v, { na: 'C varen', rijdt: true });

  gw.input = remInvoer();
  tafelC.stap(4);
  ok(Math.abs(v.speed) <= 2, `de boot ligt bijna stil (${v.speed.toFixed(2)} m/s)`);
  ok(N.gastGebruik(gw), 'de E van de gast komt aan');
  tafelC.stap(0.5);
  wereldKlopt(host, v, { na: 'C uitstappen' });
  const f = figuur(host);
  const { afstand } = naast(v, f);
  ok(afstand > v.halfWid + 0.4, `hij staat naast de romp (${afstand.toFixed(2)} m van het midden)`);
  ok(afstand < v.halfLen + 2, `en bij de boot, niet ergens anders (${afstand.toFixed(2)} m)`);
  ok(Math.hypot(f.x, f.y) > 1, 'niet op (0,0)');
  eq(gw.coopInVoertuig, false, 'de gast ziet dat hij weer buiten staat');
  tickErna(tafelC, 'C uitstappen');

  v.x = f.x + 1.5; v.y = f.y; v.angle = 0; v.speed = 0;
  ok(N.gastGebruik(gw), 'de tweede E komt aan');
  tafelC.stap(0.6);
  eq(v.coopBestuurder, 1, 'de gast bestuurt de boot weer');
  eq(figuur(host).inVeh, v, 'en zit er weer in');
  tickErna(tafelC, 'C weer instappen');
  wereldKlopt(host, v, { na: 'C weer instappen', rijdt: true });
});

// ------------------------------------------------------------------ D. waarom geen helikopter of vliegtuig
// Een derde en vierde voertuigtype voegen hier niets toe: de vlucht heeft een eigen simulator (heliflight.js,
// planeflight.js) die de gastheer per frame zelf draait en die de invoer van de gast niet kent; de regel in
// vehicleregister.js zet ze daarom op 'nee' (coopbestuur.js weigerReden: 'vlieg'). Wat deze suite dan wél moet
// vastleggen, is dat zo'n weigering geen crash en geen half ingestapte gast achterlaat: de E valt terug op meerijden,
// er komt een melding, en de wereld is daarna nog heel.
t('D: een helikopter of vliegtuig weigert de gast netjes (geen halve instap, geen crash)', () => {
  zetHaken();
  const heli = new V.Vehicle(0, 0, 0, { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40, accel: 7, brake: 9, turnRate: 1.5 });
  heli.isHeli = true;
  const tafelD = tafel({ voertuig: heli });
  const { host, gw, v } = tafelD;
  tafelD.stap(2);
  const f0 = figuur(host);
  v.x = f0.x + 1.2; v.y = f0.y; v.angle = 0;
  ok(B.magBesturen(v, 1) === false, 'de regel van het register weigert de gast in een helikopter');
  ok(N.gastGebruik(gw), 'de E komt aan, maar er gebeurt niets');
  tafelD.stap(0.5);
  eq(v.coopBestuurder, undefined, 'de gast zit niet achter de stuurknuppel');
  ok(!figuur(host).coopBestuurt, 'en denkt dat ook niet');
  ok(!figuur(host).inVeh, 'hij zit nergens in');
  ok(gw.messages.some((m) => /helikopter of vliegtuig/.test(m)), 'hij krijgt de uitleg uit BESTUUR_TEKST.vlieg');
  tickErna(tafelD, 'D helikopter');
  wereldKlopt(host, v, { na: 'D helikopter' });
});

// ------------------------------------------------------------------ geen echte opslag
// De opslag onder Node is die van scripts/node3d.mjs: een Map in het geheugen, nooit de schijf. Wat het spel bij het
// laden zelf doet (storagekeys.js zet eenmalig de migratie-vlag) is geen testschrijfactie; de sleutels die AGENTS.md
// noemt (de save, de instellingen en de prestaties) mogen hier nooit langskomen.
const beschermd = opslagSchrijfsels.filter((k) => /^gde-(save-v1|settings|prestaties-v1)$/.test(k));
eq(beschermd.length, 0, 'de suite schrijft nooit naar de save, de instellingen of de prestaties: ' + beschermd.join(', '));
console.log(`\ncoop/bestuurflow_test: ${groepen} stromen, ${checks} controles ok`);
