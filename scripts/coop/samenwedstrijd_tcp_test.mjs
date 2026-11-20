// Samen wedstrijd (#983, #443, #429): de pannenkoekenwedstrijd met 2 en 4 spelers over echte TCP-verbindingen (127.0.0.1), zonder Electron.
//   node scripts/coop/samenwedstrijd_tcp_test.mjs [--n=2,4]
// De gastheer draait de echte netlaag (coopnet.js) en de echte pannenkoek.js en multiplayerwedstrijd.js; de gasten zijn headless (mockclient.mjs,
// ClientSession) en antwoorden op "Meedoen?" en melden hun punten zoals het spel dat doet (het wedgast-bericht). Per aantal spelers: de
// uitnodiging komt bij elke gast, wie ja zei doet mee en krijgt zijn plek betaald, wie nee zei krijgt niets; een gast die midden in de wedstrijd
// weggaat krijgt niets en de rest loopt door; een gast die later aansluit doet niet meer mee.
import './../node3d.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { assert.ok(!ECHT.test(k), `test leest echte opslag: ${k}`); return mem.has(k) ? mem.get(k) : null; },
    setItem: (k, v) => { assert.ok(!ECHT.test(k), `test schrijft echte opslag: ${k}`); mem.set(k, String(v)); },
    removeItem: (k) => { assert.ok(!ECHT.test(k), `test wist echte opslag: ${k}`); mem.delete(k); },
    clear: () => mem.clear(),
  },
});
// het bord van een minigame zoekt kindelementen: de testomgeving geeft overal een rustig dummy-element terug
const echteMaak = document.createElement.bind(document);
const dummy = () => ({ addEventListener() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, dataset: {}, set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', hidden: true, appendChild() {}, setAttribute() {}, querySelector: dummy, querySelectorAll: () => [], closest: () => null });
document.createElement = (tag) => { const e = echteMaak(tag); e.querySelector = () => dummy(); e.querySelectorAll = () => []; return e; };
document.body = document.createElement('div');

const N = await import('../../game/js/coopnet.js');
const W = await import('../../game/js/multiplayerwedstrijd.js');
const { PANNENKOEK } = await import('../../game/js/pannenkoek.js');
const { listenForGuests } = await import('../../game/js/net/ipctransport.js');
const { setGate } = await import('../../game/js/coopgate.js');
const { startMockGuest } = await import('./mockclient.mjs');

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const AANTALLEN = String(arg('n', '2,4')).split(',').map(Number).filter((x) => x >= 2 && x <= 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(40); } throw new Error('time-out: ' + what); };
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });
const gebeurt = (g, k, van = 0) => g.log.events.slice(van).filter(([, b]) => b.k === k).map(([, b]) => b);

async function ronde(spelers) {
  const t0 = Date.now(), gasten = spelers - 1;
  const world = {
    map: {}, onRespawn: [], player: { x: 0, y: 0, z: 0, angle: 0, character: 'tammo', vx: 0, vy: 0, speed: 0, inVehicle: null, exitVehicle() {} },
    companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true },
    vehicles: [], pedestrians: [], wildlife: [], stats: {}, money: 0, wanted: 0, time: 0, clock: 12, meldingen: [],
    input: { wasPressed: () => false, consume() {}, axis: () => [0, 0], isDown: () => false }, addMessage(t) { this.meldingen.push(t); },
  };
  const listeners = new Set();
  const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
  const api = { send: (id, bytes) => core.send(id, bytes), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  N.startHost(world, INFO, { seed: 5, max: 4, scene: () => ({ filmpje: false, pauze: false, regel: null, keuze: null }) });
  listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max: 4 });
  ok(hosted.ok, `${spelers}: de gastheer luistert`);
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    world.time += dt;
    N.tickCoopNet(world, dt);
  }, 16);
  const guests = [];
  const stop = async () => { clearInterval(timer); try { PANNENKOEK.quit(world); } catch (e) { /* al weg */ } for (const g of guests) { try { await g.stop(); } catch (e) { /* al weg */ } } try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await sleep(300); try { await core.stop(); } catch (e) { /* al weg */ } };
  const nieuweGast = async (i) => {
    const g = await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: { latency: 0.05, jitter: 0.01 }, seed: 60 + i });
    g.input = () => ({ mx: 0, my: 0, run: false, yaw: 0 });
    guests.push(g);
    return g;
  };
  // de host bakt zijn twee minuten snel af (zonder iets te doen: nul punten)
  const hostBakt = () => { for (let i = 0; i < 130 && PANNENKOEK.active(); i++) { world.time += 1; PANNENKOEK.update(1, world); } };
  try {
    setGate(false);
    for (let i = 0; i < gasten; i++) await nieuweGast(i);
    await until(() => guests.every((g) => g.session.status === 'ok' && g.last()), 20000, 'alle gasten verbonden');
    await sleep(800);
    ok(world.coopRoster.length === spelers, `${spelers}: de lijst telt ${spelers} spelers`);

    // wedstrijd 1: de laatste gast zegt nee, de anderen ja
    const nee = guests[guests.length - 1], ja = guests.slice(0, -1);
    const van = guests.map((g) => g.log.events.length);
    ok(W.wedNodigUit(world, 'pannenkoek').reden === 'uitgenodigd', `${spelers}: de uitnodiging gaat uit`);
    await until(() => guests.every((g, i) => gebeurt(g, 'wed', van[i]).some((b) => b.f === 'uit')), 8000, 'elke gast krijgt Meedoen?');
    for (const g of ja) g.session.sendEvent({ k: 'wedgast', a: 'ja' });
    nee.session.sendEvent({ k: 'wedgast', a: 'nee' });
    await until(() => PANNENKOEK.active(), 25000, 'de wedstrijd begint bij de host');
    await until(() => ja.every((g, i) => gebeurt(g, 'wed', van[i]).some((b) => b.f === 'start' && b.punt === 1)), 8000, 'wie ja zei krijgt de start');
    ok(!gebeurt(nee, 'wed', van[guests.length - 1]).some((b) => b.f === 'start'), `${spelers}: wie nee zei krijgt geen start`);
    ok(true, `${spelers}: de host bakt mee`);
    // de gasten melden hun punten (hoe hoger de plek, hoe meer punten); de host bakt af
    ja.forEach((g, i) => g.session.sendEvent({ k: 'wedgast', a: 'punt', b: 0, p: 100 + 100 * i }));
    await sleep(300);
    hostBakt();
    await until(() => ja.every((g, i) => gebeurt(g, 'beloning', van[i]).length >= 1), 15000, 'elke gast die meedeed is betaald');
    const geld = ja.map((g, i) => gebeurt(g, 'beloning', van[i]).reduce((a, b) => a + (b.geld || 0), 0));
    ok(geld.every((x) => x > 0), `${spelers}: wie meedeed krijgt geld (${geld.join(', ')})`);
    if (ja.length >= 2) ok(geld[ja.length - 1] > geld[0], `${spelers}: de hoogste punten krijgen het meest (${geld.join(', ')})`);
    await sleep(500);
    ok(gebeurt(nee, 'beloning', van[guests.length - 1]).length === 0, `${spelers}: wie nee zei krijgt niets`);

    // wedstrijd 2 (alleen met meer dan twee spelers): een gast gaat weg midden in de wedstrijd, de rest loopt door
    if (gasten >= 2) {
      const weg = guests[0], blijf = guests[1];
      const van2 = guests.map((g) => g.log.events.length);
      await sleep(11000); // de vorige uitslag en rematch-tijd ruimen op
      ok(W.wedNodigUit(world, 'pannenkoek').reden === 'uitgenodigd', `${spelers}: tweede uitnodiging`);
      await until(() => guests.every((g, i) => gebeurt(g, 'wed', van2[i]).some((b) => b.f === 'uit')), 8000, 'tweede uitnodiging komt aan');
      weg.session.sendEvent({ k: 'wedgast', a: 'ja' }); blijf.session.sendEvent({ k: 'wedgast', a: 'ja' });
      for (const g of guests.slice(2)) g.session.sendEvent({ k: 'wedgast', a: 'nee' });
      await until(() => PANNENKOEK.active(), 25000, 'tweede wedstrijd begint');
      await sleep(500);
      weg.session.sendEvent({ k: 'wedgast', a: 'weg' }); // hij stopt
      blijf.session.sendEvent({ k: 'wedgast', a: 'punt', b: 0, p: 250 });
      await sleep(300);
      hostBakt();
      await until(() => gebeurt(blijf, 'beloning', van2[1]).length >= 1, 15000, 'wie bleef is betaald');
      await sleep(500);
      ok(gebeurt(weg, 'beloning', van2[0]).length === 0, `${spelers}: wie wegging krijgt niets`);
    }

    // later aansluiten (alleen als er een plek vrij is): wie na de start aanklopt doet niet meer mee
    if (spelers < 4) {
      await sleep(11000);
      const vast = guests.filter((g) => g.session.status === 'ok');
      const vanV = vast.map((g) => g.log.events.length);
      ok(W.wedNodigUit(world, 'pannenkoek').reden === 'uitgenodigd', `${spelers}: derde uitnodiging`);
      await until(() => vast.every((g, i) => gebeurt(g, 'wed', vanV[i]).some((b) => b.f === 'uit')), 8000, 'derde uitnodiging komt aan');
      for (const g of vast) g.session.sendEvent({ k: 'wedgast', a: 'ja' });
      await until(() => PANNENKOEK.active(), 25000, 'derde wedstrijd begint');
      const laat = await nieuweGast(9);
      await until(() => laat.session.status === 'ok' && laat.last(), 20000, 'late gast verbonden');
      laat.session.sendEvent({ k: 'wedgast', a: 'ja' }); // te laat
      await sleep(1500);
      ok(!gebeurt(laat, 'wed').some((b) => b.f === 'start'), `${spelers}: een late gast krijgt geen start`);
      vast.forEach((g) => g.session.sendEvent({ k: 'wedgast', a: 'punt', b: 0, p: 120 }));
      await sleep(300);
      hostBakt();
      await sleep(1500);
      ok(gebeurt(laat, 'beloning').length === 0, `${spelers}: een late gast krijgt niets`);
    }
    console.log(`  ${spelers} spelers over TCP: ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } finally { await stop(); }
}

try {
  for (const n of AANTALLEN) await ronde(n);
  console.log(`samenwedstrijd_tcp_test: ${checks} controles ok (spelers: ${AANTALLEN.join(', ')})`);
} catch (e) { console.error('samenwedstrijd_tcp_test MISLUKT:', e && e.stack || e); process.exitCode = 1; }
process.exit(process.exitCode || 0);
