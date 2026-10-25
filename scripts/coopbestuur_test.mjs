// Samen spelen (#434): een gast bestuurt een voertuig, en de politie jaagt ook op een gast.
// game/js/coopbestuur.js (stoel, invoer, uitstappen, wegvallen), coopgezocht.js (gezocht-niveau per speler, doelwit van de politie),
// crime.js (misdaden van een gast op zijn eigen niveau) en coopnet.js (het bericht, het snapshot, gepakt) over een in-memory transport.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as B from '../game/js/coopbestuur.js';
import * as G from '../game/js/coopgezocht.js';
import { reportCrime } from '../game/js/crime.js';
import { wielInvoer } from '../game/js/coopgast.js';
import * as D from '../game/js/vehicledoors.js';
import { seatedOf } from '../game/js/occupants.js';
import { PROTO } from '../game/js/net/protocol.js';
import { CODEC_VERSION } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };

// nepvoertuigen en nephaken (de echte komen uit player.js en vehicle.js: main.js zetBestuurHaken)
const auto = (id, x, y, extra = {}) => ({ id, x, y, angle: 0, speed: 0, halfLen: 2.2, halfWid: 1, model: { len: 4.4 }, ...extra });
let ingevoerd = [], bestuurd = [];
const haken = () => ({
  vind: (x, y, lijst) => lijst.filter((v) => Math.hypot(v.x - x, v.y - y) < 4).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null,
  vindProp: null, rijProp: null,
  misdaad: (w, slot, kind) => reportCrime(w, kind, { dader: slot }),
  enter(l, v) { if (v.driver) return; v.driver = 'player'; v.parked = false; l.inVehicle = v; ingevoerd.push(v.id); },
  exit(l, map, w) { const v = l.inVehicle; v.driver = null; l.inVehicle = null; l.x = v.x + 3; l.y = v.y; },
  drive(l, dt, inv) { const [ax, ay] = inv.axis(); const v = l.inVehicle; v.speed = -ay * 10; v.angle += ax * dt; v.handbrake = inv.isDown(' '); if (!v.handbrake) v.x += v.speed * dt; l.x = v.x; l.y = v.y; l.angle = v.angle; bestuurd.push([ax, ay, v.handbrake]); },
  los: () => ({ ok: true, wacht: false }),
  bijGroep: (w, l) => { l.x = w.player.x + 2; l.y = w.player.y; return true; },
});
const meldingen = [];
const mkWorld = (extra = {}) => ({
  player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', radius: 0.4 },
  coop: { local: false, remote: true, remoteInput: { mx: 0, my: 0, buttons: 0, yaw: 0 } }, coopFigures: {}, vehicles: [], pedestrians: [], money: 0, wanted: 0, time: 0, paused: false,
  coopMeld: (slot, tekst) => meldingen.push([slot, tekst]), messages: [], addMessage(m) { this.messages.push(m); }, ...extra,
});

t('weigerReden: alleen vrije voertuigen, geen vliegtuig, geen verkeer of opdrachtauto', () => {
  assert.equal(B.weigerReden(auto(1, 0, 0)), null);
  assert.equal(B.weigerReden(auto(1, 0, 0, { isBike: true })), null, 'fiets');
  assert.equal(B.weigerReden(auto(1, 0, 0, { isScooter: true })), null, 'scooter');
  assert.equal(B.weigerReden(auto(1, 0, 0, { isBoat: true })), null, 'boot');
  assert.equal(B.weigerReden(auto(1, 0, 0, { isHeli: true })), 'vlieg');
  assert.equal(B.weigerReden(auto(1, 0, 0, { isPlane: true })), 'vlieg');
  assert.equal(B.weigerReden(auto(1, 0, 0, { driver: 'player' })), 'bezet');
  assert.equal(B.weigerReden(auto(1, 0, 0, { passenger: 'companion' })), 'bezet');
  assert.equal(B.weigerReden(auto(1, 0, 0, { road: {} })), 'verkeer');
  for (const k of ['isPolice', 'isBus', 'isHeroCar', 'playerOwned', 'missionCar']) assert.equal(B.weigerReden(auto(1, 0, 0, { [k]: true })), 'niet', k);
});

t('gast (plek 1) stapt in als bestuurder, de host ziet hem, en het voertuig krijgt zijn invoer', () => {
  B.zetBestuurHaken(haken()); ingevoerd = []; bestuurd = [];
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v, auto(6, 50, 50)];
  const r = B.bestuurGebruik(w, 1);
  assert.equal(r.gedaan, true); assert.equal(v.driver, 'player'); assert.equal(v.coopBestuurder, 1);
  assert.equal(w.companion.inVehicle, v); assert.equal(w.companion.coopBestuurt, true); assert.equal(v.passenger, undefined, 'geen bijrijder: de bestuurder');
  assert.deepEqual(B.bestuurdersLijst(w).map((z) => [z.slot, z.stoel, z.voertuig.id]), [[1, 0, 5]], 'de host tekent hem op stoel 0');
  const rec = N.spelerRecord(w, w.companion, 1);
  assert.equal(rec.driver, true); assert.equal(rec.seat, 0); assert.equal(rec.inVeh, true);
  w.coop.remoteInput = { mx: 0.3, my: -1, buttons: 0, yaw: 0 };
  B.bestuurTick(w, 0.1);
  assert.deepEqual(bestuurd[0], [0.3, -1, false], 'stick van de gast');
  assert.ok(v.x > 2, 'het voertuig reed'); assert.equal(w.companion.x, v.x, 'zijn lichaam volgt het voertuig');
  w.coop.remoteInput = { mx: 0, my: 0, buttons: 2, yaw: 0 }; const x0 = v.x;
  B.bestuurTick(w, 0.1);
  assert.equal(v.handbrake, true); assert.equal(v.x, x0, 'handrem: bit 1 van de knoppen');
});

t('een gast stapt in bij een geparkeerde auto aan de stoep; de gastheer ziet dat hij meegaat (#434)', () => {
  B.zetBestuurHaken(haken()); meldingen.length = 0;
  const w = mkWorld(); w.coopRoster = [{ slot: 1, naam: 'Nikky', char: 'anita' }];
  const v = auto(11, 40, 40, { parked: true, parkSlot: { x: 40, y: 40 } }); w.vehicles = [v]; // ver van de gastheer: hij heeft er zelf niets aan
  w.companion.x = 40.6; w.companion.y = 42;
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true);
  assert.equal(v.driver, 'player'); assert.equal(v.coopBestuurder, 1); assert.equal(v.parked, false, 'de auto is van de stoep gehaald');
  assert.ok(w.messages.some((m) => /Nikky stapt in een geparkeerde auto/.test(m)), 'de gastheer wordt niet verrast: ' + w.messages.join(' | '));
  assert.ok(meldingen.some(([s, m]) => s === 1 && /Je rijdt/.test(m)), 'de gast hoort dat hij rijdt');
  const w2 = mkWorld(); w2.vehicles = [auto(12, 40, 40)]; w2.companion.x = 40.6; w2.companion.y = 42;
  B.bestuurGebruik(w2, 1);
  assert.equal(w2.messages.length, 0, 'een gewone auto: geen melding aan de gastheer');
});

t('geen dubbele bestuurders: een tweede gast en dezelfde gast nog eens', () => {
  B.zetBestuurHaken(haken()); ingevoerd = [];
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v];
  w.coopFigures[2] = { slot: 2, x: 2.5, y: 1, vx: 0, vy: 0, char: 'bram', input: { mx: 0, my: 0, buttons: 0, yaw: 0 } };
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true);
  assert.equal(B.bestuurGebruik(w, 2).gedaan, false, 'de enige auto is bezet: geen bestuurder, de aanroeper probeert meerijden');
  assert.deepEqual(ingevoerd, [5]); assert.equal(v.coopBestuurder, 1);
  const w2 = mkWorld(); const a = auto(7, 2, 1); w2.vehicles = [a]; w2.coopFigures[2] = { slot: 2, x: 2.2, y: 1, vx: 0, vy: 0, char: 'bram' };
  assert.equal(B.bestuurGebruik(w2, 2).gedaan, true);
  assert.equal(w2.coopFigures[2].inVeh, a); assert.equal(w2.coopFigures[2].stoel, 0); assert.equal(w2.coopFigures[2].coopBestuurt, true);
  assert.equal(B.bestuurGebruik(w2, 1).gedaan, false, 'plek 1 ziet geen vrij voertuig meer');
  const r2 = N.spelerRecord(w2, w2.coopFigures[2], 2); assert.deepEqual([r2.driver, r2.seat], [true, 0]);
});

t('uitstappen met E alleen bij bijna stilstand; daarna is de stoel vrij', () => {
  B.zetBestuurHaken(haken()); meldingen.length = 0;
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v];
  B.bestuurGebruik(w, 1); v.speed = 8;
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true); assert.equal(v.driver, 'player', 'te snel: blijft zitten');
  assert.ok(meldingen.some(([s, m]) => s === 1 && /bijna stilstaat/.test(m)));
  v.speed = 0.5; B.bestuurGebruik(w, 1);
  assert.equal(v.driver, null); assert.equal(v.coopBestuurder, null); assert.equal(w.companion.inVehicle, null); assert.equal(w.companion.coopBestuurt, false);
  assert.equal(w.companion.coopUit, true, 'ze loopt weer zelf'); assert.deepEqual(w.coopRijders, {});
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true, 'en kan weer instappen'); assert.equal(v.coopBestuurder, 1);
});

t('de gast valt weg: het voertuig staat stil en de stoel is vrij', () => {
  B.zetBestuurHaken(haken());
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v];
  B.bestuurGebruik(w, 1); v.speed = 12; v.driftX = 2;
  assert.equal(B.bestuurLos(w, 1), true);
  assert.equal(v.speed, 0); assert.equal(v.driver, null); assert.equal(w.companion.inVehicle, null);
  assert.equal(B.bestuurLos(w, 1), false, 'niets meer te doen');
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true, 'iemand anders (of hij zelf) kan weer instappen');
  v.wrecked = true; B.bestuurTick(w, 0.05); assert.equal(w.companion.inVehicle, null, 'kapot: de gast staat buiten');
  assert.equal(v.wreckedByGast, 1, 'het wrak is van de gast: geen getuige voor de host');
  const z = auto(8, 2, 1); const w2 = mkWorld(); w2.vehicles = [z]; B.bestuurGebruik(w2, 1); meldingen.length = 0;
  z.sinking = { phase: 'fall' }; B.bestuurTick(w2, 0.05);
  assert.equal(z.driver, null); assert.equal(z.wreckedByGast, 1, 'ook een zinkend voertuig: het wrak komt later'); assert.ok(meldingen.some(([, m]) => /zinkt/.test(m)));
  const w3 = mkWorld(); const b = auto(9, 2, 1); w3.vehicles = [b]; w3.coopWanted = {}; b.disabled = false; b.wrecked = true; b.wreckedByGast = 1;
  reportCrime(w3, 'pedKill', { vehicle: b }); assert.equal(w3.wanted, 0, 'een ontploffing van het wrak van de gast telt bij de gast');
});

t('een helikopter of vliegtuig: een melding, geen bestuurder', () => {
  B.zetBestuurHaken(haken()); meldingen.length = 0;
  const w = mkWorld(); w.vehicles = [auto(9, 2, 1, { isHeli: true })];
  assert.equal(B.bestuurGebruik(w, 1).gedaan, true);
  assert.ok(meldingen.some(([, m]) => /helikopter/.test(m))); assert.equal(w.companion.coopBestuurt, undefined); assert.equal(w.vehicles[0].driver, undefined);
});

t('te ver weg of de wereld is niet geladen: het voertuig staat stil, na een paar seconden staat de gast bij de groep', () => {
  const h = haken(); h.los = () => ({ ok: false, wacht: false }); B.zetBestuurHaken(h); meldingen.length = 0;
  const w = mkWorld(); const v = auto(5, 300, 0); w.vehicles = [v]; w.companion.x = 300; w.companion.y = 1;
  B.bestuurGebruik(w, 1);
  w.coop.remoteInput = { mx: 0, my: -1, buttons: 0, yaw: 0 };
  for (let k = 0; k < 20; k++) B.bestuurTick(w, 0.1);
  assert.equal(v.x, 300, 'het voertuig stond stil');
  for (let k = 0; k < 30; k++) B.bestuurTick(w, 0.1);
  assert.equal(w.companion.inVehicle, null); assert.equal(v.driver, null);
  assert.ok(Math.hypot(w.companion.x - w.player.x, w.companion.y - w.player.y) < 5, 'bij de groep'); assert.ok(meldingen.some(([, m]) => /Te ver/.test(m)));
});

t('pauze van iedereen: het voertuig rijdt niet', () => {
  B.zetBestuurHaken(haken()); bestuurd = [];
  const w = mkWorld(); w.vehicles = [auto(5, 2, 1)]; B.bestuurGebruik(w, 1);
  w.coopHold = true; assert.equal(B.bestuurTick(w, 0.1), 0); w.coopHold = false;
  w.paused = true; assert.equal(B.bestuurTick(w, 0.1), 0); w.coopDoorloopNu = true; assert.equal(B.bestuurTick(w, 0.1), 1, 'de wereld loopt door achter het menu van de host');
});

t('wielInvoer is dezelfde invoer als bij het stuur van de bijrijder', () => {
  const i = wielInvoer({ mx: 0.5, my: -1, buttons: 3 });
  assert.deepEqual(i.axis(), [0.5, -1]); assert.equal(i.isDown(' '), true); assert.equal(i.isDown('shift'), true);
});

// ---- gezocht-niveau per speler
t('misdaad van een gast telt bij zijn eigen niveau, niet bij dat van de host', () => {
  B.zetBestuurHaken(haken());
  const w = mkWorld(); const v = auto(5, 2, 1, { coopBestuurder: 1, driver: 'player' }); w.vehicles = [v]; w.companion.inVehicle = v; w.companion.coopBestuurt = true;
  w.coopWanted = {};
  assert.equal(reportCrime(w, 'pedKill', { vehicle: v }), true, 'een dode voetganger is ernstig');
  assert.equal(w.wanted, 0, 'de host blijft schoon'); assert.equal(G.wantedVan(w, 1), 0, 'niemand zag het');
  w.pedestrians = [{ x: 10, y: 1, state: 'wander' }];
  reportCrime(w, 'pedKill', { vehicle: v });
  assert.equal(G.wantedVan(w, 1), 1, 'een voetganger dichtbij is getuige'); assert.equal(w.wanted, 0);
  w.pedestrians = []; w.vehicles.push({ isPolice: true, x: 20, y: 0, _sees: true, driver: null }); w.time += 5;
  reportCrime(w, 'pedKill', { vehicle: v });
  assert.equal(G.wantedVan(w, 1), 2, 'een agent die het ziet'); assert.equal(w.wanted, 0);
  reportCrime(w, 'pedKill'); assert.equal(w.wanted >= 0, true);
});

t('autodiefstal door een gast: alleen een auto, en alleen als iemand het ziet', () => {
  B.zetBestuurHaken(haken());
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v]; w.coopWanted = {};
  B.bestuurGebruik(w, 1); assert.equal(G.wantedVan(w, 1), 0, 'niemand zag het');
  const w2 = mkWorld(); w2.vehicles = [auto(5, 2, 1)]; w2.coopWanted = {}; w2.pedestrians = [{ x: 8, y: 1, state: 'wander' }];
  B.bestuurGebruik(w2, 1); assert.equal(G.wantedVan(w2, 1), 1, 'een voetganger zag het'); assert.equal(w2.wanted, 0);
  const w3 = mkWorld(); w3.vehicles = [auto(5, 2, 1, { isBike: true })]; w3.coopWanted = {}; w3.pedestrians = [{ x: 8, y: 1, state: 'wander' }];
  B.bestuurGebruik(w3, 1); assert.equal(G.wantedVan(w3, 1), 0, 'een fiets is geen misdaad');
});

t('doelwit van de politie: hoogste niveau, gelijk is wie al gejaagd werd, anders de host', () => {
  const w = mkWorld(); w.coopWanted = { 1: 0, 2: 0 }; w.coopFigures[2] = { slot: 2, x: 5, y: 5 };
  assert.equal(G.kiesDoelwit(w), null);
  w.coopWanted[1] = 2; assert.deepEqual(G.kiesDoelwit(w), { slot: 1, level: 2 });
  w.wanted = 3; assert.equal(G.kiesDoelwit(w).slot, 0, 'de host heeft meer');
  w.wanted = 2; assert.equal(G.kiesDoelwit(w).slot, 0, 'gelijk: de host');
  w.coopDoelwit = 1; assert.equal(G.kiesDoelwit(w).slot, 1, 'gelijk: wie al gejaagd werd');
  w.coopWanted[2] = 5; w.wanted = 0; assert.equal(G.kiesDoelwit(w).slot, 2);
  assert.equal(G.zichtbaarWanted(w), 5, 'iedereen ziet de sterren van het doelwit');
  const z = mkWorld(); assert.equal(G.zichtbaarWanted(z), 0); z.wanted = 3; assert.equal(G.zichtbaarWanted(z), 3, 'zonder gasten verandert er niets');
});

t('de politie ziet de gast als speler: world.player en world.wanted wisselen tijdelijk, daarna staat alles terug', () => {
  B.zetBestuurHaken(haken());
  const w = mkWorld(); const v = auto(5, 2, 1); w.vehicles = [v]; w.coopWanted = { 1: 3 };
  B.bestuurGebruik(w, 1); w.coopWanted[1] = 3; v.x = 40; v.y = 30; v.speed = 20; // de diefstal telt niet mee
  const host = w.player; let gezien = null;
  const slot = G.politieMetDoelwit(1 / 60, w, (dt, wr) => { gezien = { p: wr.player, wanted: wr.wanted }; wr.wanted = 2; });
  assert.equal(slot, 1); assert.equal(gezien.p.coopSlot, 1); assert.equal(gezien.p.inVehicle, v); assert.equal(gezien.p.x, 40); assert.equal(gezien.wanted, 3);
  assert.equal(w.player, host, 'de host is terug'); assert.equal(w.wanted, 0, 'het niveau van de host is niet aangeraakt'); assert.equal(G.wantedVan(w, 1), 2, 'het niveau van de gast is bijgewerkt (de politie verloor hem een ster)');
  w.coopWanted = {}; w.wanted = 1; let eigen = null;
  assert.equal(G.politieMetDoelwit(1 / 60, w, (dt, wr) => { eigen = wr.player; }), 0); assert.equal(eigen, host, 'host als doelwit: ongewijzigd');
});

t('de politie haalt een gast in: gepakt bij de gast, niet bij de host, zijn voertuig staat stil achter', () => {
  B.zetBestuurHaken(haken());
  const w = mkWorld({ pendingRespawn: null });
  const v = auto(5, 2, 1); w.vehicles = [v]; B.bestuurGebruik(w, 1); v.x = 40; v.y = 30;
  const gepakt = []; w.coopGepakt = (slot, level) => { gepakt.push([slot, level]); B.bestuurLos(w, slot); };
  w.coopWanted = { 1: 4 }; v.speed = 0;
  G.politieMetDoelwit(1 / 60, w, (dt, wr) => { wr.coopGepakt(wr.player.coopSlot, wr.wanted); wr.wanted = 0; });
  assert.deepEqual(gepakt, [[1, 4]]); assert.equal(G.wantedVan(w, 1), 0); assert.equal(w.pendingRespawn, null, 'de host is niet gepakt'); assert.equal(v.driver, null);
});

// ---- over het net: het bericht E van de gast, het snapshot en gepakt
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
function sessie(hostExtra = {}) {
  const hw = mkWorld(hostExtra); hw.coop = { local: true }; hw.input = { axis: () => [0, 0], isDown: () => false };
  N.startHost(hw, INFO, { seed: 5 });
  const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 });
  N.addGuest(hw, link.a);
  const gw = mkWorld(); gw.coop = { local: true }; gw.money = 1000; gw.input = { axis: () => [0, 0], isDown: () => false, wasPressed: () => false };
  N.startClient(gw, link.b, INFO, {});
  const step = (secs, f) => { for (let k = 0; k < 60 * secs; k++) { if (f) f(k); N.tickCoopNet(hw, 1 / 60); if (gw.coopNet) N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; } };
  return { hw, gw, step };
}

t('over het net: E bij een vrij voertuig zet de gast als bestuurder; de gast ziet dat hij stuurt; E bij stilstand zet hem eruit', () => {
  B.zetBestuurHaken(haken());
  const s = sessie({ vehicles: [auto(5, 2, 1)] });
  s.step(2);
  assert.equal(s.hw.coop.remote, true, 'de gast stuurt zijn invoer');
  assert.equal(N.gastGebruik(s.gw), true); s.step(1);
  const v = s.hw.vehicles[0];
  assert.equal(v.coopBestuurder, 1); assert.equal(s.hw.companion.coopBestuurt, true);
  assert.equal(s.gw.coopInVoertuig, true); assert.equal(s.gw.coopBestuurder, true, 'de gast weet dat hij bestuurder is (Spatie is de handrem)');
  assert.ok(s.gw.messages.some((m) => /Je rijdt/.test(m)), 'melding bij de gast');
  N.gastGebruik(s.gw); s.step(1);
  assert.equal(v.coopBestuurder, null); assert.equal(s.gw.coopBestuurder, false);
});

t('over het net: gast weg of host stopt: het voertuig staat stil en is vrij', () => {
  B.zetBestuurHaken(haken());
  const s = sessie({ vehicles: [auto(5, 2, 1)] }); s.step(2);
  N.gastGebruik(s.gw); s.step(1);
  const v = s.hw.vehicles[0]; v.speed = 9; assert.equal(v.coopBestuurder, 1);
  assert.equal(N.removeGuest(s.hw, 1), true); s.step(2);
  assert.equal(v.speed, 0); assert.equal(v.driver, null); assert.equal(v.coopBestuurder, null);
});

t('over het net: iedereen ziet de sterren van het doelwit; de gast die gepakt wordt betaalt een boete in zijn eigen spel', () => {
  B.zetBestuurHaken(haken());
  const s = sessie({ vehicles: [auto(5, 2, 1)] }); s.step(2);
  N.gastGebruik(s.gw); s.step(1);
  s.hw.coopWanted[1] = 3; s.step(1);
  assert.equal(s.gw.wanted, 3, 'de gast ziet zijn drie sterren in zijn snapshot'); assert.equal(s.hw.wanted, 0);
  s.step(6);
  const geld = s.gw.money;
  G.politieMetDoelwit(1 / 60, s.hw, (dt, wr) => { wr.coopGepakt(wr.player.coopSlot, wr.wanted); });
  s.step(1);
  assert.ok(s.gw.money < geld && s.gw.money >= 0, 'boete: ' + s.gw.money); assert.ok(s.gw.messages.some((m) => /Gepakt/.test(m)));
  assert.equal(G.wantedVan(s.hw, 1), 0); assert.equal(s.hw.companion.coopBestuurt, false, 'uit het voertuig');
  s.step(1); assert.equal(s.gw.wanted, 0);
});

// ---- iemand uit een voertuig trekken (#459): de gast vraagt, de host controleert en doet het
const sedan = (id, extra = {}) => auto(id, 0, 0, { x: 0, y: 0, angle: 0, model: { name: 'sedan', len: 4.3, wid: 1.8 }, ...extra });
const bijrijdersdeur = [0.645, 1.32], achterdeur = [-0.602, 1.32]; // de instappunten naast de deuren

t('een gast opent de bijrijdersdeur met E en trekt de AI-passagier er met de tweede E uit (#459)', () => {
  let geplukt = null;
  const h = haken();
  h.trekUit = (w, v, rol) => { geplukt = [v.id, rol]; seatedOf(v).passengers = []; return { ped: {} }; };
  B.zetBestuurHaken(h); meldingen.length = 0;
  const w = mkWorld();
  const v = sedan(71, { driver: 'ai', road: {} }); w.vehicles = [v];
  seatedOf(v).passengers = [{ slot: 'front', seed: 3 }];
  w.companion.x = bijrijdersdeur[0]; w.companion.y = bijrijdersdeur[1];
  assert.equal(B.trekGast(w, 1), true);
  assert.equal(v.doors.want.vr, 1, 'de deur gaat open');
  assert.match(meldingen.pop()[1], /opent de bijrijdersdeur/, 'de gast hoort welke deur opengaat');
  assert.equal(geplukt, null, 'nog niemand eruit: eerst de deur');
  for (let i = 0; i < 30; i++) D.stepDoors(v.doors, 1 / 60);
  meldingen.length = 0;
  assert.equal(B.trekGast(w, 1), true);
  assert.deepEqual(geplukt, [71, 'bijrijder'], 'de bestaande trek-actie (ejectPassenger)');
  assert.match(meldingen.pop()[1], /trekt de passagier/);
  B.zetBestuurHaken({ trekUit: null });
});

t('trekken kan alleen bij een bezette passagiersdeur van een stilstaand voertuig binnen bereik (#459)', () => {
  B.zetBestuurHaken({ ...haken(), trekUit: () => ({ ped: {} }) }); meldingen.length = 0;
  const w = mkWorld();
  const leeg = sedan(72, { driver: 'ai', road: {} }); // niemand op de bijrijdersstoel
  seatedOf(leeg).passengers = [];
  w.vehicles = [leeg]; w.companion.x = bijrijdersdeur[0]; w.companion.y = bijrijdersdeur[1];
  assert.equal(B.trekGast(w, 1), false, 'een lege stoel: het gewone gebruik gaat door');
  const ver = sedan(73, { x: 40, y: 40, driver: 'ai', road: {} }); seatedOf(ver).passengers = [{ slot: 'front' }];
  w.vehicles = [ver];
  assert.equal(B.trekGast(w, 1), false, 'te ver van de deur');
  const rijdend = sedan(74, { x: 0, y: 0, speed: 4, driver: 'ai', road: {} }); seatedOf(rijdend).passengers = [{ slot: 'front' }];
  w.vehicles = [rijdend]; w.companion.x = bijrijdersdeur[0]; w.companion.y = bijrijdersdeur[1];
  assert.equal(B.trekGast(w, 1), false, 'een rijdend voertuig geeft niemand vrij');
  const bestuurder = sedan(75, { driver: 'ai', road: {} }); bestuurder.doors = D.makeDoorState(); bestuurder.doors.open.vl = 1;
  w.vehicles = [bestuurder]; w.companion.x = 0.645; w.companion.y = -1.32;
  assert.equal(B.trekGast(w, 1), false, 'de bestuurdersdeur is geen passagiersdeur');
  assert.equal(B.trekGast(w, 0), false, 'de gastheer zelf gebruikt zijn eigen E');
  B.zetBestuurHaken({ trekUit: null });
});

t('een gast trekt een medespeler van de achterbank, maar niet op passief (#447)', () => {
  B.zetBestuurHaken(haken()); meldingen.length = 0;
  const w = mkWorld();
  const v = sedan(76, { driver: 'player' }); w.vehicles = [v];
  v.doors = D.makeDoorState(); v.doors.open.ar = 1; // de achterdeur staat al open
  w.coopFigures[2] = { slot: 2, x: 0, y: 0, inVeh: v, stoel: 2 };
  w.coopFigures[3] = { slot: 3, x: achterdeur[0], y: achterdeur[1], gz: 0, radius: 0.4 };
  w.coopPvp = { actief: {} }; // iedereen passief (de standaard)
  assert.equal(B.trekGast(w, 3), true);
  assert.equal(w.coopFigures[2].inVeh, v, 'passief: hij blijft zitten');
  assert.match(meldingen.pop()[1], /passief/);
  w.coopPvp = { actief: { 2: true, 3: true } }; meldingen.length = 0;
  assert.equal(B.trekGast(w, 3), true);
  const f = w.coopFigures[2];
  assert.equal(f.inVeh, null); assert.equal(f.stoel, undefined); assert.equal(f.coopVoertuig, false);
  assert.ok(Math.hypot(f.x - achterdeur[0], f.y - achterdeur[1]) < 0.01, 'hij staat naast de open deur');
  assert.ok(meldingen.some(([s, t]) => s === 2 && /uit het voertuig getrokken/.test(t)), 'de medespeler hoort het zelf');
});

t('over het net: E van de gast bij een passagiersdeur komt als begrensd trekbericht bij de host (#459)', () => {
  let geplukt = null;
  B.zetBestuurHaken({ ...haken(), trekUit: (w, v, rol) => { geplukt = [v.id, rol]; seatedOf(v).passengers = []; return { ped: {} }; } });
  const s = sessie({ vehicles: [sedan(91, { driver: 'ai', road: {} })] });
  s.step(2);
  const v = s.hw.vehicles[0];
  seatedOf(v).passengers = [{ slot: 'front', seed: 3 }];
  s.hw.player.x = 8; s.hw.player.y = 8; // de gastheer staat naast de auto
  s.hw.companion.x = bijrijdersdeur[0]; s.hw.companion.y = bijrijdersdeur[1];
  const verzonden = [], send = s.gw.coopNet.session.sendEvent.bind(s.gw.coopNet.session);
  s.gw.coopNet.session.sendEvent = (b) => { verzonden.push(b); return send(b); };
  assert.equal(N.gastGebruik(s.gw), true);
  s.gw.coopNet.session.sendEvent = send;
  assert.deepEqual(verzonden, [{ k: 'trek' }], 'een gewoon bericht zonder gegevens van de gast');
  s.step(0.1);
  assert.equal(v.doors.want.vr, 1, 'de eerste E opent de bijrijdersdeur');
  assert.ok(s.gw.messages.some((m) => /opent de bijrijdersdeur/.test(m)), 'de gast hoort welke deur opengaat');
  for (let i = 0; i < 30; i++) D.stepDoors(v.doors, 1 / 60);
  s.hw.time += 1; // hetzelfde bericht meteen nog eens is begrensd (coopnet.js TREK_WACHT_S)
  N.gastGebruik(s.gw); s.step(0.1);
  assert.deepEqual(geplukt, [91, 'bijrijder'], 'de tweede E trekt de passagier eruit');
  B.zetBestuurHaken({ trekUit: null });
});

t('formaat: PROTO en CODEC_VERSION zijn niet veranderd', () => {
  assert.equal(PROTO, 2); assert.equal(CODEC_VERSION, 2);
});

console.log(`coopbestuur_test: ${n} groepen ok`);
