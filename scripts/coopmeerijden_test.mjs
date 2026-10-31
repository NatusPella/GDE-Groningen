// Meerijden als gast, van instappen tot uitstappen (#525): de hele stroom met een echte gastheer en een echte gast.
//
// De proxy-pariteitstest (coopbestuur_proxy_pariteit_test) bewijst de vorm: elke methode die player.js op het proxy-object
// kan aanroepen staat op de bevroren basis. Deze test bewijst het gedrag: host en gast over het bestaande testtransport
// (net/memtransport.js), de gast drukt E op zijn eigen scherm (coopgastlokaal.js), de gastheer voert het uit met de haken
// die main.js zet (de echte Player-methoden en findEnterableVehicle), en na elke stap geldt: geen exception, de
// rijdersregel (world.coopRijders) is leeg na het uitstappen, de gast staat naast de deur van zijn stoel en niet in het
// voertuig, en elke positie is een getal (de crash van 31-10 liet een NaN achter).
//
// De fout die eraan voorafging: een gast die uitstapt terwijl de gastheer intussen wegvalt, mag niet gooien.
//   node scripts/coopmeerijden_test.mjs
import './node3d.mjs'; // player.js/vehicle.js komen via three binnen

// De repo-regel: een test schrijft nooit naar de echte save, instellingen of prestaties. Alles wat naar die sleutels wil,
// blijft in dit geheugen en telt als fout (onderaan gecontroleerd).
const ECHTE_SLEUTELS = /^gde-(save-v1|settings|prestaties-v1)(-|$)/;
const opslag = new Map(), geblokkeerd = [];
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { if (!ECHTE_SLEUTELS.test(k)) return opslag.get(k) ?? null; geblokkeerd.push(k); return null; },
    setItem: (k, v) => { if (ECHTE_SLEUTELS.test(k)) { geblokkeerd.push('schrijf ' + k); return; } opslag.set(k, String(v)); },
    removeItem: (k) => { if (ECHTE_SLEUTELS.test(k)) { geblokkeerd.push('wis ' + k); return; } opslag.delete(k); },
    clear: () => opslag.clear(),
  },
});

import assert from 'node:assert/strict';
const { createLink } = await import('../game/js/net/memtransport.js');
const N = await import('../game/js/coopnet.js');
const { Player } = await import('../game/js/player.js');
const { Vehicle, TRAFFIC_MODELS, findEnterableVehicle } = await import('../game/js/vehicle.js');
const { updateGastLokaal } = await import('../game/js/coopgastlokaal.js');
const { reportCrime } = await import('../game/js/crime.js');
const { uitstapPunt } = await import('../game/js/vehicledoors.js');
const CB = await import('../game/js/coopbestuur.js');

// ---------------------------------------------------------------- de haken zoals main.js:467 ze zet
// De echte methoden van player.js op het lichaam dat coopbestuur.js aanwijst, en de echte zoekfunctie van vehicle.js.
function hakenZetten() {
  CB.zetBestuurHaken({
    misdaad: (w, slot, kind) => reportCrime(w, kind, { dader: slot }),
    vind: findEnterableVehicle,
    vindProp: null, rijProp: null, trekUit: null,
    enter: (l, v, w) => Player.prototype.enterVehicle.call(l, v, w),
    exit: (l, map, w, th) => Player.prototype.exitVehicle.call(l, map, w, th),
    drive: (l, dt, inv, map, w) => Player.prototype.driveVehicle.call(l, dt, inv, map, w),
    stap: (l, v, map, uit) => Player.prototype.stapNaastDeur.call(l, v, map, uit),
  });
}

// ---------------------------------------------------------------- de wereld
// Een platte kaart: geen gebouwen, geen water. De deur naast de auto is dan vrij, zoals op een lege weg.
const platteKaart = () => ({
  buildingsNear: () => [], roadsNear: () => [], greenNear: () => [], treesNear: () => [], waterNear: () => [],
  isOnBridge: () => false, onCarriageway: () => false, groundHeightAt: () => 0,
});
const sedan = (x, y, angle = 0.4) => new Vehicle(x, y, angle, TRAFFIC_MODELS().find((m) => m.name === 'sedan'));

// Een wereld zoals het spel hem heeft: een echt lichaam (Player), een kaart, een invoer en een meldingenlijst.
function wereld(map, x = 10, y = 10) {
  const w = {
    player: new Player(x, y), companion: null, coop: { local: true }, vehicles: [], pedestrians: [], map,
    money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, paused: false, audioEvents: [], messages: [],
    addMessage(m) { this.messages.push(m); }, coopMeld() {},
  };
  return w;
}

// De gast: zijn eigen scherm en zijn eigen toetsen. E, W (gas) en de rest komen hier vandaan.
function gastWereld(map) {
  const w = wereld(map, 0, 0);
  const toetsen = new Set();
  w.input = {
    axis: () => [0, toetsen.has('s') ? 1 : toetsen.has('w') ? -1 : 0],
    isDown: (k) => toetsen.has(k),
    wasPressed: (k) => toetsen.has(k),
    consume: (k) => toetsen.delete(k),
    lookActive: () => false, mouse: { dx: 0, dy: 0 },
  };
  w.toetsen = toetsen;
  return w;
}

const INFO = N.handshakeInfo({ tiles: 'test', story: 'oud' });

// Een sessie: de gastheer in dit proces, de gast over het bestaande testtransport. De tijd loopt aan beide kanten gelijk,
// zoals in het spel, en de tikken gaan allebei elke frame.
function sessie({ kaart = platteKaart(), net = {} } = {}) {
  hakenZetten();
  const hw = wereld(kaart), gw = gastWereld(kaart);
  const meldingen = [];
  hw.coopMeld = (slot, tekst) => meldingen.push([slot, tekst]);
  gw.coopMeld = (slot, tekst) => meldingen.push([slot, tekst]);
  N.startHost(hw, INFO, { seed: 5 });
  const link = createLink({ latency: 0.03, jitter: 0.01, seed: 11, ...net });
  N.addGuest(hw, link.a);
  N.startClient(gw, link.b, INFO, {});
  const s = { hw, gw, link, meldingen, frames: 0 };
  s.step = (secs) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      N.tickCoopNet(hw, 1 / 60);
      if (gw.coopNet) N.tickCoopNet(gw, 1 / 60);
      link.advance(1 / 60);
      hw.time += 1 / 60; gw.time += 1 / 60;
      s.frames++;
    }
  };
  // E (of een andere toets) op het scherm van de gast: de fase van coopgastlokaal.js draait één frame met die toets.
  s.druk = (toets = 'e') => {
    gw.toetsen.add(toets);
    let r = false;
    try { r = updateGastLokaal(gw, 1 / 60); } finally { gw.toetsen.delete(toets); }
    return r;
  };
  s.verbind = () => { for (let k = 0; k < 240 && !(gw.coopNet && gw.coopNet.session.slot === 1); k++) s.step(1 / 60); };
  s.figuur = () => hw.coopFigures[1];
  s.rijders = () => hw.coopRijders || {};
  return s;
}

// De plek naast de deur van de bestuurdersstoel, zoals player.js stapNaastDeur hem rekent (collision.js doet er niets bij:
// de kaart is plat).
const deurPlek = (v) => {
  const uit = uitstapPunt(v, 'bestuurder');
  const off = v.halfWid + 0.7, nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  return { uit, x: v.x + nx * off * uit.kant + Math.cos(v.angle) * uit.langs, y: v.y + ny * off * uit.kant + Math.sin(v.angle) * uit.langs };
};

// Elke positie die het spel leest, is een getal: de crash van 31-10 liet een NaN achter in het lichaam van de gast.
// gz bestaat pas als de gast een keer uitgestapt is; is hij er, dan moet hij een getal zijn.
const eindig = (s, waar, { figuur = true } = {}) => {
  const f = s.figuur(), hw = s.hw;
  const velden = [['gastheer.x', hw.player.x], ['gastheer.y', hw.player.y], ['eigen.x', s.gw.player.x], ['eigen.y', s.gw.player.y]];
  if (figuur && f) {
    velden.push(['gast.x', f.x], ['gast.y', f.y], ['gast.hoek', f.angle]);
    if ('gz' in f) velden.push(['gast.gz', f.gz]);
  }
  for (const [naam, w] of velden) assert.ok(Number.isFinite(w), `${waar}: ${naam} is ${w}`);
  for (const v of hw.vehicles) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${waar}: voertuig ${v.id} staat op (${v.x}, ${v.y})`);
    assert.ok(Number.isFinite(v.angle) && Number.isFinite(v.speed || 0), `${waar}: voertuig ${v.id} heeft hoek ${v.angle} en snelheid ${v.speed}`);
  }
  for (const r of Object.values(s.rijders())) {
    assert.ok(Number.isFinite(r.proxy.x) && Number.isFinite(r.proxy.y), `${waar}: de rijdersregel van plek ${r.slot} heeft een proxy op (${r.proxy.x}, ${r.proxy.y})`);
  }
};

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`  ok  ${naam}`); };

// ---------------------------------------------------------------- 1. de hele stroom
t('een gast stapt in bij de gastheer, rijdt een paar frames en stapt naast de deur weer uit', () => {
  const s = sessie();
  s.verbind();
  const f = s.figuur();
  assert.ok(f, 'de gastheer houdt een figuur bij voor plek 1');
  const v = sedan(f.x + 1.6, f.y);
  v.parked = true;
  s.hw.vehicles.push(v);
  s.step(0.3);
  eindig(s, 'voor het instappen');

  // instappen: E op het scherm van de gast, uitgevoerd door de gastheer
  assert.doesNotThrow(() => s.druk('e'), 'instappen mag niet gooien');
  s.step(0.5);
  const r = s.rijders()[1];
  assert.ok(r, 'de gastheer houdt een rijdersregel bij voor de gast');
  assert.equal(r.v, v, 'de regel hoort bij de auto waarin hij stapte');
  assert.equal(f.inVeh, v, 'de gast zit in het voertuig');
  assert.equal(f.coopBestuurt, true, 'de gast bestuurt');
  assert.equal(v.driver, 'player', 'de auto rijdt als een speler, niet als verkeer');
  assert.equal(v.coopBestuurder, 1, 'de schade en de misdaad zijn van de gast');
  assert.equal(r.proxy.inVehicle, v, 'de proxy zit in dezelfde auto');
  eindig(s, 'na het instappen');

  // rijden: de stick van de gast, de tick van de gastheer
  const x0 = v.x, y0 = v.y;
  s.gw.toetsen.add('w');
  s.step(1.5);
  s.gw.toetsen.delete('w');
  s.step(0.4);
  const gereden = Math.hypot(v.x - x0, v.y - y0);
  assert.ok(gereden > 2, `de auto rijdt met de invoer van de gast (${gereden.toFixed(2)} m)`);
  assert.ok(Math.hypot(f.x - v.x, f.y - v.y) < 1e-6, 'de figuur van de gast staat op de auto');
  eindig(s, 'tijdens het rijden');

  // uitstappen: eerst tot stilstand, dan E
  for (let i = 0; i < 120 && Math.abs(v.speed || 0) > 0.2; i++) s.step(1 / 60);
  v.speed = 0;
  s.step(0.2);
  assert.doesNotThrow(() => s.druk('e'), 'uitstappen mag niet gooien (stapNaastDeur)');
  s.step(0.3);
  assert.deepEqual(Object.keys(s.rijders()), [], 'de rijdersregel is opgeruimd');
  assert.equal(f.inVeh, null, 'de gast staat buiten');
  assert.equal(f.coopBestuurt, false);
  assert.equal(f.coopVoertuig, false);
  assert.equal(v.driver, null, 'de auto is vrij');
  assert.equal(v.coopBestuurder, null);
  assert.equal(v.speed || 0, 0, 'de auto staat stil');
  // naast de deur van zijn stoel, niet in het voertuig
  const p = deurPlek(v);
  assert.ok(p.uit, 'een sedan heeft een bestuurdersdeur');
  assert.ok(Math.hypot(f.x - p.x, f.y - p.y) < 1e-9, `de gast staat naast de deur (${f.x.toFixed(2)}, ${f.y.toFixed(2)}) in plaats van (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.ok((f.x - v.x) * p.uit.kant * -Math.sin(v.angle) + (f.y - v.y) * p.uit.kant * Math.cos(v.angle) > 0, 'aan de kant van zijn eigen deur');
  assert.ok(Math.hypot(f.x - v.x, f.y - v.y) > v.halfWid, 'buiten de auto, niet in het midden');
  assert.equal(f.gz, v.z || 0, 'op de hoogte van de auto');
  eindig(s, 'na het uitstappen');

  // en de gast ziet het ook: zijn eigen scherm meldt dat hij weer buiten staat
  s.step(0.5);
  assert.equal(s.gw.coopInVoertuig, false, 'de gast ziet zichzelf buiten het voertuig');
  assert.equal(s.gw.coopBestuurder, false);
});

// ---------------------------------------------------------------- 2. meerijden als passagier
t('een gast rijdt mee als passagier in de auto van de gastheer en stapt weer uit', () => {
  const s = sessie();
  s.verbind();
  const hw = s.hw, f = s.figuur();
  const v = sedan(hw.player.x, hw.player.y + 2, 0);
  v.parked = true;
  hw.vehicles.push(v);
  // de gastheer stapt zelf in (de echte Player, zoals in het spel)
  hw.player.enterVehicle(v, hw);
  assert.equal(hw.player.inVehicle, v);
  s.step(0.3);
  f.x = v.x + 1.4; f.y = v.y; // de gast staat bij de auto
  s.step(0.2);
  eindig(s, 'voor het meerijden');
  assert.doesNotThrow(() => s.druk('e'), 'meerijden mag niet gooien');
  s.step(0.4);
  assert.equal(f.inVeh, v, 'de gast rijdt mee in de auto van de gastheer');
  assert.ok(!s.rijders()[1], 'een passagier is geen bestuurder: geen rijdersregel');
  assert.equal(v.driver, 'player', 'de gastheer rijdt');
  eindig(s, 'tijdens het meerijden');
  // uitstappen: E, de auto staat stil
  assert.doesNotThrow(() => s.druk('e'), 'uitstappen als passagier mag niet gooien');
  s.step(0.4);
  assert.equal(f.inVeh, null, 'de gast staat weer naast de auto');
  assert.ok(Math.hypot(f.x - v.x, f.y - v.y) > v.halfWid, 'buiten de auto');
  assert.deepEqual(Object.keys(s.rijders()), [], 'geen rijdersregel achtergebleven');
  eindig(s, 'na het meerijden');
  hw.player.exitVehicle(hw.map, hw);
  assert.equal(hw.player.inVehicle, null);
});

// ---------------------------------------------------------------- 3. de host valt weg tijdens het uitstappen
t('de gastheer valt weg terwijl de gast uitstapt: geen exception, geen halve toestand', () => {
  const s = sessie();
  s.verbind();
  const f = s.figuur();
  const v = sedan(f.x + 1.6, f.y);
  v.parked = true;
  s.hw.vehicles.push(v);
  s.step(0.3);
  s.druk('e');
  s.step(0.5);
  assert.ok(s.rijders()[1], 'de gast zit in de auto');
  eindig(s, 'voor het wegvallen');
  // de gast drukt E en de kabel gaat er meteen uit: het bericht is weg, de sessie valt na 5 s weg
  assert.doesNotThrow(() => { s.druk('e'); s.link.cut(); }, 'uitstappen precies op het moment dat de verbinding wegvalt');
  assert.doesNotThrow(() => s.step(7), 'de tikken na het wegvallen mogen niet gooien');
  assert.equal(s.gw.coopNet.session.status, 'lost', 'de gast merkt dat de gastheer weg is');
  assert.equal(s.hw.coopRoster.find((x) => x.slot === 1).verbinding, 'lost');
  // de gastheer ruimt de stoel op (bestuurLos via onLost): geen rijdersregel, geen wrak van een proxy
  assert.deepEqual(Object.keys(s.rijders()), [], 'de rijdersregel is opgeruimd');
  assert.equal(f.inVeh, null, 'de gast staat buiten');
  assert.equal(f.coopBestuurt, false);
  assert.equal(v.coopBestuurder, null, 'de auto is vrij');
  assert.equal(v.driver, null);
  eindig(s, 'na het wegvallen');
  const p = deurPlek(v);
  assert.ok(Math.hypot(f.x - p.x, f.y - p.y) < 1e-9, 'de gastheer zet hem naast de deur van zijn stoel, niet in de auto');
});

// ---------------------------------------------------------------- 4. weer terug, en dan stopt de host
t('de gast komt terug, stapt weer in, en de gastheer stopt het spel: geen exception', () => {
  const s = sessie();
  s.verbind();
  const f = s.figuur();
  const v = sedan(f.x + 1.6, f.y);
  v.parked = true;
  s.hw.vehicles.push(v);
  s.step(0.3);
  s.druk('e');
  s.step(0.4);
  assert.ok(s.rijders()[1]);
  // kabel eruit en terug: de gast komt met hetzelfde token terug op zijn plek
  s.link.cut();
  assert.doesNotThrow(() => s.step(7), 'wegvallen tijdens het rijden');
  assert.deepEqual(Object.keys(s.rijders()), [], 'de rijdersregel is opgeruimd');
  s.link.restore();
  assert.doesNotThrow(() => s.step(8), 'terugkomen mag niet gooien');
  assert.equal(s.gw.coopNet.session.status, 'ok', 'de gast is terug');
  eindig(s, 'na het terugkomen');
  // weer instappen (E) en dan stopt de gastheer met het spel terwijl de gast rijdt
  assert.doesNotThrow(() => s.druk('e'), 'weer instappen');
  s.step(0.5);
  assert.ok(s.rijders()[1], 'de gast rijdt weer');
  assert.doesNotThrow(() => N.stopCoopNet(s.hw), 'de gastheer stopt het spel');
  assert.doesNotThrow(() => s.step(1), 'de gasters kant na het stoppen');
  assert.deepEqual(Object.keys(s.rijders()), [], 'geen rijdersregel na het stoppen');
  assert.equal(v.coopBestuurder, null);
  assert.equal(s.gw.coopNet === null || s.gw.coopNet.session.status !== 'ok', true, 'de gast speelt weer in zijn eigen spel');
  eindig(s, 'na het stoppen van de gastheer', { figuur: false }); // de gastheer heeft zijn figuren opgeruimd
  assert.ok(Number.isFinite(s.gw.player.x) && Number.isFinite(s.gw.player.y), 'de gast staat op zijn eigen plek van voor de sessie');
  assert.equal(s.gw.player.inVehicle ?? null, null, 'en niet in een voertuig van de gastheer');
});

// ---------------------------------------------------------------- 5. rijden zonder invoer en een gast die zijn wagen kwijt is
t('een rijdersregel zonder voertuig (de oude crash) ruimt zichzelf op zonder te gooien', () => {
  const s = sessie();
  s.verbind();
  const f = s.figuur();
  const v = sedan(f.x + 1.6, f.y);
  v.parked = true;
  s.hw.vehicles.push(v);
  s.step(0.3);
  s.druk('e');
  s.step(0.4);
  const r = s.rijders()[1];
  assert.ok(r);
  // precies de toestand van na de crash van 31-10: exitVehicle zette inVehicle op null en gooide daarna
  r.proxy.inVehicle = null;
  assert.doesNotThrow(() => s.step(0.2), 'de tick leest null.isPlane');
  assert.deepEqual(Object.keys(s.rijders()), [], 'de regel is opgeruimd');
  assert.equal(f.coopBestuurt, false);
  eindig(s, 'na de halve toestand');
});

// ---------------------------------------------------------------- de opslagregel
// De test blokkeert de echte save, instellingen en prestaties: een schrijfpoging is een fout, een leespoging krijgt niets.
assert.deepEqual(geblokkeerd.filter((k) => /^(schrijf|wis) /.test(k)), [], 'de test heeft nooit naar de echte save, instellingen of prestaties geschreven');
assert.ok(geblokkeerd.length >= 2, `de echte sleutels zijn echt geblokkeerd (${geblokkeerd.length} leespogingen kregen null)`);
console.log(`coopmeerijden_test: ${n} groepen ok (${opslag.size} eigen opslagsleutels, ${geblokkeerd.length} geblokkeerde leespogingen, 0 schrijfacties)`);

