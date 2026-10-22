// Samen spelen, de playtest van 22-10 (#388), zonder Electron:
//   node scripts/coop388_test.mjs
// - de camera van een gast draait met de muis (hij draaide nooit: updateGameplay draait niet voor een gast)
// - niemand deelt een camera meer (het midden tussen twee spelers zette hem verder weg en scheef)
// - Tessa zat vast aan een harde lijn van 38 m (alleen terug lopen kon): nu dezelfde band als de andere spelers (80 m melding, 110 m terugzetten)
// - de pauze van wie het spel opende bevriest Tessa niet meer
// - Tessa gaat niet vanzelf mee als de gastheer instapt: ze leest wat ze moet doen en stapt met E in; blijft ze achter, dan rijdt ze mee
// - een gast kan op de kaart geen ritje of teleport doen (dat verplaatst alleen zijn eigen figuur)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { coopStep } from '../game/js/coopglue.js';
import { gastKijkHoek, MUIS_DRAAI_PER_PX } from '../game/js/coopgast.js';
import { LEASH_DIST } from '../game/js/coop.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });

// de host draait ook "companion.js": Tessa loopt op de invoer van haar speler zolang het spel niet op pauze staat
function avond(gasten = 1) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5 });
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 + i * 7 });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (secs, f) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      if (f) f(k);
      if (!hw.paused && !hw.companion.inVehicle) coopStep(hw.companion, 1 / 60, hw, hw.coopMove || ((q, d) => { q.x += q.vx * d; q.y += q.vy * d; }));
      N.tickCoopNet(hw, 1 / 60);
      for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; }
      hw.time += 1 / 60;
    }
  };
  return { hw, gs, step };
}
const aantal = (w, re) => w.messages.filter((m) => re.test(m)).length;

t('de camera van een gast draait met de muis: rechts is met de klok mee, links ertegen, rond de cirkel', () => {
  assert.ok(Math.abs(gastKijkHoek(0, 100) - 100 * MUIS_DRAAI_PER_PX) < 1e-12);
  assert.ok(gastKijkHoek(0, -100) < 0);
  assert.ok(Math.abs(gastKijkHoek(3.1, 100)) < Math.PI, 'blijft binnen -π..π');
  assert.equal(gastKijkHoek(1, 0), 1, 'zonder beweging blijft hij staan');
  assert.equal(gastKijkHoek(NaN, 10) > 0, true, 'een onbekende hoek breekt niets'); assert.equal(gastKijkHoek(0.5, NaN), 0.5); assert.equal(gastKijkHoek(0.5, 10, NaN) > 0.5, true);
  assert.ok(Math.abs(gastKijkHoek(0, 100, 0.3) - 100 * MUIS_DRAAI_PER_PX * 0.3) < 1e-12, 'ingezoomd draait hij langzamer');
  assert.match(bron('player.js'), new RegExp(`MOUSE_TURN_PER_PX = ${MUIS_DRAAI_PER_PX}`), 'dezelfde snelheid als op de grond in player.js');
  const l = bron('coopgastlokaal.js');
  assert.match(l, /world\.camYaw = gastKijkHoek\(/, 'updateGastLokaal draait voor een gast elke frame');
  assert.match(l, /lookActive/, 'alleen als de muis de camera bestuurt');
  assert.match(l, /!world\.cameraOverride/, 'niet tijdens een filmpje');
});

t('niemand deelt een camera: ook Tessa en wie het spel opende hebben hun eigen', () => {
  assert.equal(N.CAMERA_DELEN, false);
  const s = avond(2); s.step(3);
  for (const w of [s.hw, ...s.gs.map((g) => g.gw)]) assert.equal(w.coopCam, null);
});

t('Tessa kan verder dan 38 m: geen harde lijn meer; na 80 m een melding, na 110 m (4 s) bij de groep gezet', () => {
  const s = avond(); s.step(3);
  const g = s.gs[0].gw, c = s.hw.companion;
  assert.equal(s.hw.coop.leash, Infinity, 'de lijn staat uit in een sessie');
  s.hw.player.x = 0; s.hw.player.y = 0; c.x = 0; c.y = 0;
  g.input.axis = () => [0, -1]; // vooruit (camera yaw 0: wereld +x)
  g.input.isDown = (k) => k === 'shift'; // rennen: 5,6 m/s
  let max = 0;
  s.step(21, () => { max = Math.max(max, Math.hypot(c.x - s.hw.player.x, c.y - s.hw.player.y)); });
  assert.ok(max > LEASH_DIST * 2, 'ze loopt veel verder dan de oude 38 m: ' + max.toFixed(0));
  assert.equal(aantal(g, /Blijf bij de groep/), 1, 'één melding bij 80 m');
  g.input.axis = () => [0, 0];
  s.step(8);
  assert.ok(Math.hypot(c.x - s.hw.player.x, c.y - s.hw.player.y) < 5, 'weer bij de groep: ' + c.x);
  assert.equal(aantal(g, /Je staat weer bij de groep/), 1);
  // een sprong van de gastheer (snelreizen, teleport): meteen mee
  s.hw.player.x = 5000; s.hw.player.y = 0; s.step(1.2);
  assert.ok(Math.hypot(c.x - 5000, c.y) < 5, 'Tessa is meegesprongen: ' + c.x);
  // lokaal (twee spelers op één scherm) houdt de oude lijn
  const lokaal = mkWorld({ coop: { local: true } }); lokaal.player.x = 0; lokaal.companion.x = 100; lokaal.companion.y = 0; lokaal.coop.remote = true; lokaal.coop.remoteInput = { mx: 0, my: 0, buttons: 0, yaw: 0 };
  coopStep(lokaal.companion, 1 / 60, lokaal, () => {}); assert.ok(lokaal.companion.x <= LEASH_DIST + 0.01, 'zonder sessie: de oude lijn');
});

t('de pauze van wie het spel opende bevriest Tessa niet: ze loopt door; het wachtscherm bij wegvallen pauzeert wel', () => {
  const s = avond(2); s.step(3);
  const [tessa, bram] = s.gs.map((g) => g.gw), c = s.hw.companion, f = s.hw.coopFigures[2];
  tessa.input.axis = () => [0, -1]; bram.input.axis = () => [0, -1];
  s.hw.paused = true; // pauzemenu, kaart of winkel van de gastheer (updateGameplay staat stil)
  const c0 = c.x, f0 = f.x;
  s.step(2);
  assert.ok(c.x - c0 > 5, 'Tessa loopt door: ' + (c.x - c0).toFixed(1)); assert.ok(f.x - f0 > 5, 'en de derde speler ook');
  s.hw.coopHold = true; const c1 = c.x; s.step(1);
  assert.ok(Math.abs(c.x - c1) < 0.5, 'bij het wachtscherm wacht iedereen');
  s.hw.coopHold = false; s.hw.paused = false;
  tessa.input.axis = () => [0, 0]; s.step(1);
  assert.equal(N.stapMetgezelInPauze(s.hw, 1 / 60), false, 'zonder pauze doet de functie niets (updateGameplay stapt haar)');
  const c2 = { ...c }; s.hw.paused = true; s.hw.companion.state = 'dead'; N.stapMetgezelInPauze(s.hw, 1 / 60); assert.equal(c.x, c2.x, 'een neergeslagen Tessa blijft liggen');
});

t('de gastheer stapt in: Tessa gaat niet vanzelf mee, leest wat ze moet doen en stapt met E in; wie achterblijft rijdt mee', () => {
  const s = avond(); s.step(3);
  const g = s.gs[0].gw, c = s.hw.companion;
  const auto = { id: 7, x: 3, y: 0, angle: 0, speed: 0, halfWid: 1, model: { len: 4 } };
  s.hw.vehicles = [auto]; s.hw.player.inVehicle = auto; s.hw.player.x = 3; s.step(1);
  assert.equal(aantal(g, /Tammo zit in een voertuig\. Druk bij het voertuig op E om mee te rijden\./), 1, 'één melding, alleen voor Tessa');
  assert.equal(c.inVehicle, undefined, 'ze zit er niet vanzelf in');
  s.step(2); assert.equal(aantal(g, /zit in een voertuig/), 1, 'niet steeds opnieuw');
  s.hw.player.inVehicle = null; s.step(0.5); s.hw.player.inVehicle = auto; s.step(0.5);
  assert.equal(aantal(g, /zit in een voertuig/), 2, 'wel bij een volgende keer instappen');
  // de gastheer rijdt snel weg en Tessa blijft te voet achter: na een paar seconden zit ze mee (geen eindeloos terugzetten)
  auto.speed = 20; c.x = -60; c.y = 0;
  s.step(6, () => { auto.x += 20 / 60; s.hw.player.x = auto.x; });
  assert.equal(c.inVehicle, auto, 'ze rijdt mee'); assert.equal(auto.passenger, 'companion'); assert.match(g.messages.join(' '), /Je rijdt mee/);
  // niet geschikt: ze wordt bij de groep gezet
  const heli = { id: 8, x: 500, y: 0, angle: 0, speed: 0, isHeli: true }; c.inVehicle = null; auto.passenger = null; s.hw.player.inVehicle = heli; s.hw.player.x = 500; c.x = 300; c.y = 0;
  s.step(4.5); assert.equal(c.inVehicle, null, 'niet in een helikopter'); assert.ok(Math.hypot(c.x - 500, c.y) < 5);
  const c1 = bron('companion.js');
  assert.match(c1, /c\.coopUit = !!\(world\.coop && world\.coop\.remote\)/, 'companion.js: een echte speler stapt zelf in');
  assert.match(c1, /Je kunt alleen meerijden als de ander in een voertuig zit/, 'E bij een geparkeerd voertuig geeft een melding');
});

t('een gast kan op de kaart geen ritje of teleport doen', () => {
  const m = bron('mapview.js');
  assert.equal((m.match(/world\.coopRole === 'client' && world\.coopNet\) \{ world\.addMessage\(ALLEEN_EIGEN_SPEL/g) || []).length, 2, 'ritje en teleport');
});

console.log(`coop388_test: ${n}/${n} ok`);
