// Crashes van 31-10 (0.54.0, rapport-stap M03): een gast stapt in en uit bij de gastheer en het spel valt om.
// Drie fouten, één keten:
//   1. `stapNaastDeur is not a function` in exitVehicle: het lichaam van een gast is bij de gastheer sinds #516 een
//      eigen figuur (world.coopFigures[slot]) en geen Player; coopbestuur.js bestuurt hem via een proxy-object en de
//      haken (main.js) roepen `Player.prototype.exitVehicle.call(l, …)`. Die proxy had de methode niet, dus exitVehicle
//      gooide ná `this.inVehicle = null` en vóór de plek naast de deur.
//   2. Daarna bleef de bestuurdersregel in world.coopRijders staan met een proxy zonder voertuig: de tick las in
//      driveVehicle `null.isPlane` (player.js).
//   3. En de volgende E las in exitVehicle `null.sinking`.
// Deze test speelt die gevallen na met de echte player.js-methoden als haken (zoals main.js ze zet) en eist dat er
// niets throwt en dat de gast netjes naast de deur van zijn stoel staat.
//   node scripts/coopbestuur_crash_test.mjs
import './node3d.mjs'; // player.js/vehicle.js komen via three binnen; zonder deze haak resolvet de CDN-import niet in Node
import assert from 'node:assert/strict';
const { Player } = await import('../game/js/player.js');
const { Vehicle, TRAFFIC_MODELS, findEnterableVehicle } = await import('../game/js/vehicle.js');
const B = await import('../game/js/coopbestuur.js');
const { wielInvoer } = await import('../game/js/coopgast.js');
const { uitstapPunt } = await import('../game/js/vehicledoors.js');

let n = 0;
const t = (naam, f) => { f(); n++; };

// De haken zoals main.js:467 ze zet: de echte methoden van player.js op het lichaam dat coopbestuur.js aanwijst.
// `stap` is de nieuwe haak voor stapNaastDeur (de deur van de stoel, #502).
const haken = () => ({
  vind: findEnterableVehicle, vindProp: null, rijProp: null, trekUit: null,
  enter: (l, v, w) => Player.prototype.enterVehicle.call(l, v, w),
  exit: (l, map, w, th) => Player.prototype.exitVehicle.call(l, map, w, th),
  drive: (l, dt, inv, map, w) => Player.prototype.driveVehicle.call(l, dt, inv, map, w),
  stap: (l, v, map, uit) => Player.prototype.stapNaastDeur.call(l, v, map, uit),
  los: () => ({ ok: true, wacht: false }),
  bijGroep: () => true,
});

// Een platte kaart: geen gebouwen en geen water, dus de deur naast de auto is vrij (net als op een lege weg).
const platteKaart = () => ({ buildingsNear: () => [] });
const sedan = (x = 10, y = 10, angle = 0.4) => new Vehicle(x, y, angle, TRAFFIC_MODELS().find((m) => m.name === 'sedan'));

// De wereld van de gastheer: plek 1 is een eigen figuur (#516), geen Player.
const mkWorld = (v, kaart = platteKaart()) => {
  const w = {
    player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null },
    companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    coop: { local: false }, coopFigures: {}, vehicles: v ? [v] : [], pedestrians: [], map: kaart,
    money: 0, wanted: 0, time: 0, paused: false, audioEvents: [], messages: [],
    coopMeld: () => {}, addMessage(m) { this.messages.push(m); },
  };
  w.coopFigures[1] = { slot: 1, x: v ? v.x - 1.3 : 1, y: v ? v.y : 1, angle: 0, gz: 0, radius: 0.35, vx: 0, vy: 0, char: 'rik', naam: 'Rik', input: { mx: 0, my: 0, buttons: 0, yaw: 0 } };
  return w;
};
// De plek naast de bestuurdersdeur, zoals player.js stapNaastDeur hem rekent (collision.js doet daar niets bij:
// er staan geen gebouwen).
const deurPlek = (v) => {
  const uit = uitstapPunt(v, 'bestuurder');
  const off = v.halfWid + 0.7, nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  return {
    uit, nx, ny, off,
    x: v.x + nx * off * uit.kant + Math.cos(v.angle) * uit.langs,
    y: v.y + ny * off * uit.kant + Math.sin(v.angle) * uit.langs,
  };
};

t('een gastfiguur met inVehicle: null krijgt een rij-opdracht: geen crash, de regel ruimt zichzelf op', () => {
  B.zetBestuurHaken(haken());
  const v = sedan(); const w = mkWorld(v);
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true, 'de gast stapt in');
  const r = w.coopRijders[1];
  assert.ok(r, 'de gastheer houdt een bestuurdersregel bij');
  // De toestand van na de oude crash: exitVehicle zette inVehicle al op null en gooide daarna op stapNaastDeur.
  r.proxy.inVehicle = null;
  const f = w.coopFigures[1];
  assert.equal(f.coopBestuurt, true, 'de gast denkt nog dat hij rijdt');
  assert.doesNotThrow(() => B.bestuurTick(w, 1 / 60), 'de tick van coopbestuur.js leest null.isPlane'); // fout 1
  assert.equal(B.bestuurderVan(w, 1), null, 'de regel is opgeruimd');
  assert.equal(f.coopBestuurt, false);
  assert.equal(f.inVeh, null, 'de gast staat weer buiten');
  assert.equal(v.driver, null, 'de auto is vrij');
  assert.equal(v.coopBestuurder, null);
  // hij staat waar de bestuurdersregel hem achterliet: bij de auto (klaar neemt de proxy-plek over), niet in de lucht
  assert.ok(Math.hypot(f.x - v.x, f.y - v.y) < 1, `naast de auto (${f.x.toFixed(2)}, ${f.y.toFixed(2)})`);
  assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.gz), 'en met een geldige plek');
});

t('een gast die naast zijn wagen staat en E geeft: geen crash (null.sinking), gewoon niets aan de hand', () => {
  B.zetBestuurHaken(haken());
  const v = sedan(); const w = mkWorld(v);
  B.bestuurGebruik(w, 1);
  w.coopRijders[1].proxy.inVehicle = null; // dezelfde stale toestand, nu via de E van de gast (coopnet.js gebruikGast)
  assert.doesNotThrow(() => B.bestuurGebruik(w, 1), 'exitVehicle leest null.sinking'); // fout 2
  assert.equal(B.bestuurderVan(w, 1), null);
  assert.equal(w.coopFigures[1].coopBestuurt, false);
  // en de losse gevallen: rijden en uitstappen op een lichaam zonder voertuig doen niets
  const leeg = { x: 3, y: 4, angle: 0, gz: 0, radius: 0.35, inVehicle: null };
  assert.doesNotThrow(() => haken().drive(leeg, 1 / 60, wielInvoer({ mx: 1, my: -1, buttons: 0 }), w.map, w));
  assert.doesNotThrow(() => haken().exit(leeg, w.map, w));
  assert.deepEqual([leeg.x, leeg.y], [3, 4], 'hij blijft staan waar hij staat');
});

t('de gast stapt uit en staat naast de deur van zijn stoel (de this-binding van de haak)', () => {
  B.zetBestuurHaken(haken());
  const v = sedan(); const w = mkWorld(v);
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true);
  const proxy = w.coopRijders[1].proxy;
  assert.equal(typeof proxy.stapNaastDeur, 'function', 'de proxy is geen Player: hij krijgt de methode van de haak');
  const f = w.coopFigures[1];
  v.speed = 0;
  assert.doesNotThrow(() => B.bestuurGebruik(w, 1), 'stapNaastDeur is not a function'); // fout 3
  const p = deurPlek(v);
  assert.ok(p.uit, 'een sedan heeft een bestuurdersdeur');
  assert.ok(Math.hypot(f.x - p.x, f.y - p.y) < 1e-9, `naast de deur (${f.x.toFixed(2)}, ${f.y.toFixed(2)}) in plaats van (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.ok((f.x - v.x) * p.nx + (f.y - v.y) * p.ny < 0, 'aan de kant van zijn eigen deur, niet aan de andere flank');
  assert.equal(f.gz, v.z || 0); assert.equal(f.inVeh, null); assert.equal(f.coopBestuurt, false);
  assert.deepEqual([f.vx, f.vy], [0, 0], 'hij staat stil');
});

t('een lichaam zonder stapNaastDeur komt via de haak toch buiten: de gewone uitstapplek', () => {
  B.zetBestuurHaken(haken());
  const v = sedan(); const w = mkWorld(v);
  const f = w.coopFigures[1];
  // precies het geval uit het rapport: de figuur zelf (geen Player-methode) met een voertuig erin
  const figuur = { x: f.x, y: f.y, angle: 0, gz: 0, radius: 0.35, inVehicle: v, diveOut() {} };
  assert.equal(typeof figuur.stapNaastDeur, 'undefined');
  v.driver = 'player';
  assert.doesNotThrow(() => haken().exit(figuur, w.map, w));
  assert.equal(figuur.inVehicle, null, 'hij is uitgestapt');
  // zonder de methode valt exitVehicle terug op collision.js findExitSpot: de flank van de auto, links
  const afstand = Math.hypot(figuur.x - v.x, figuur.y - v.y);
  assert.ok(Math.abs(afstand - (v.halfWid + 0.7)) < 1e-9, `buiten de auto (${afstand.toFixed(2)} m), niet in het midden`);
  assert.ok((figuur.x - v.x) * Math.sin(v.angle) - (figuur.y - v.y) * Math.cos(v.angle) > 0, 'aan de linkerkant (de chauffeurskant)');
});

t('een motor die zijn gast afgooit: exitVehicle binnen driveVehicle ruimt de regel op zonder te throwen', () => {
  B.zetBestuurHaken(haken());
  // een motorscooter met een tweetakt-er: een klapper gooit de rijder eraf (player.js driveVehicle roept this.exitVehicle)
  const motor = new Vehicle(20, 20, 0, { ...TRAFFIC_MODELS().find((m) => m.name === 'scooter'), motorbike: 'naked' });
  const w = mkWorld(motor);
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true, 'de gast stapt op');
  motor.speed = 20; motor.crashed = true;
  assert.doesNotThrow(() => B.bestuurTick(w, 1 / 60), 'de geneste exit-aanroep op de proxy');
  assert.equal(B.bestuurderVan(w, 1), null, 'de regel is opgeruimd');
  assert.equal(w.coopFigures[1].inVeh, null, 'de gast staat weer naast de motor');
  assert.equal(motor.coopBestuurder, null, 'de motor is vrij');
});

t('de gastheer zelf verandert niet: plek 0 is en blijft een echte Player', () => {
  B.zetBestuurHaken(haken());
  const v = sedan(); const w = mkWorld(v);
  const p = new Player(w.player.x, w.player.y, w); p.character = 'tammo';
  w.player = p;
  assert.equal(p instanceof Player, true);
  // op de grond: rijden doet niets en laat hem staan
  assert.doesNotThrow(() => p.driveVehicle(1 / 60, wielInvoer({ mx: 1, my: -1, buttons: 0 }), w.map, w));
  assert.deepEqual([p.x, p.y], [0, 0]);
  assert.equal(p.inVehicle, null);
  // in de auto en er weer uit: dezelfde deur als bij de gast
  p.enterVehicle(v, w);
  assert.equal(p.inVehicle, v);
  const positie = { x: p.x, y: p.y };
  p.exitVehicle(w.map, w);
  const d = deurPlek(v);
  assert.equal(p.inVehicle, null);
  assert.ok(Math.hypot(p.x - d.x, p.y - d.y) < 1e-9, `de host stapt ook naast de deur uit (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.ok(Math.hypot(p.x - positie.x, p.y - positie.y) > 0.5, 'en niet op zijn oude plek');
});

console.log(`coopbestuur_crash_test: ${n} groepen ok`);
