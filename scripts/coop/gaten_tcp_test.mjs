// Coöp-testbank (#95): de gaten van het nalopen voor vrijdag (#365, #367, #369, #371) met echte TCP-verbindingen op
// 127.0.0.1, zonder Electron. De gastheer draait de echte koppeling (coopnet.js, hub, snapshots) achter dezelfde
// coopcore.cjs als de app; drie headless gasten (mockclient.mjs, ClientSession met 60 ms vertraging) lezen wat er
// echt over de lijn komt: de beloning, de uitslag, de meldingen over neergaan en gepakt worden, de momentopname
// (alive) en de roepjes van een andere gast. Wie zijn kabel eruit heeft krijgt geen beloning.
//   node scripts/coop/gaten_tcp_test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as N from '../../game/js/coopnet.js';
import { listenForGuests } from '../../game/js/net/ipctransport.js';
import { pingEvent } from '../../game/js/partnerhud.js';
import { startMockGuest } from './mockclient.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(50); } throw new Error('time-out: ' + what); };
let n = 0;
const t = async (name, f) => { await f(); n++; console.log('  ok ' + name); };

const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });
const world = { player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, messages: [], audioEvents: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false } };

const listeners = new Set();
const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
const api = { send: (id, bytes) => core.send(id, bytes), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
N.startHost(world, INFO, { seed: 3, max: 4 });
listenForGuests(api, (tr) => N.addGuest(world, tr));
const hosted = await core.host({ max: 4 });
assert.ok(hosted.ok, 'de gastheer luistert');
let last = Date.now();
const timer = setInterval(() => { const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; N.tickCoopNet(world, dt); world.time += dt; }, 16);

const guests = [];
const stop = async () => { clearInterval(timer); for (const g of guests) await g.stop(); try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await sleep(300); try { await core.stop(); } catch (e) { /* al weg */ } };
const gebeurt = (g, k, van = 0) => g.log.events.slice(van).filter(([, b]) => b.k === k).map(([, b]) => b);
const evenAantal = (g) => g.log.events.length;

try {
  for (let i = 0; i < 3; i++) guests.push(await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: { latency: 0.06, jitter: 0.01 }, seed: 20 + i, wens: i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined }));
  await until(() => guests.every((g) => g.session.status === 'ok' && g.last()), 15000, 'drie gasten verbonden');
  await sleep(1500);
  assert.equal(world.coopRoster.length, 4);

  await t('#365 beloning: elke gast leest zijn deel (de helft) in het echte bericht', async () => {
    const van = guests.map(evenAantal);
    assert.equal(N.deelMetGasten(world, 1000), 3);
    await until(() => guests.every((g, i) => gebeurt(g, 'beloning', van[i]).length === 1), 4000, 'beloning aangekomen');
    for (const [i, g] of guests.entries()) assert.equal(gebeurt(g, 'beloning', van[i])[0].geld, 500);
  });

  await t('#371 uitslag: gelukt met het deel, mislukt met reden', async () => {
    const van = guests.map(evenAantal);
    world.coopUitslag(true, 'Het Loket', '', 1000); world.coopUitslag(false, 'De Kluis', 'opgepakt door de politie', 0);
    await until(() => guests.every((g, i) => gebeurt(g, 'uitslag', van[i]).length === 2), 4000, 'uitslagen aangekomen');
    for (const [i, g] of guests.entries()) {
      const [ok, mis] = gebeurt(g, 'uitslag', van[i]);
      assert.deepEqual([ok.ok, ok.label, ok.deel], [true, 'Het Loket', 500]);
      assert.deepEqual([mis.ok, mis.label, mis.reden, mis.deel], [false, 'De Kluis', 'opgepakt door de politie', 0]);
    }
  });

  await t('#369 gepakt en neergeslagen: de melding komt aan en de momentopname zegt "niet levend"', async () => {
    const van = guests.map(evenAantal);
    world.pendingRespawn = { busted: true };
    await until(() => guests.every((g, i) => gebeurt(g, 'melding', van[i]).some((b) => /Tammo is door de politie gepakt/.test(b.tekst))), 4000, 'melding gepakt');
    await until(() => guests.every((g) => g.session.world().players.find((p) => p.slot === 0).alive === false), 4000, 'host niet levend in de momentopname');
    world.pendingRespawn = null;
    await until(() => guests.every((g) => g.session.world().players.find((p) => p.slot === 0).alive === true), 4000, 'host weer levend');
    world.companion.state = 'dead';
    await until(() => gebeurt(guests[0], 'melding', van[0]).some((b) => /Je bent geraakt/.test(b.tekst)), 4000, 'Tessa hoort het');
    await until(() => guests.every((g) => g.session.world().players.find((p) => p.slot === 1).alive === false), 4000, 'Tessa niet levend');
    assert.equal(guests.slice(1).some((g, i) => gebeurt(g, 'melding', van[i + 1]).some((b) => /Je bent geraakt/.test(b.tekst))), false, 'alleen Tessa hoort dat');
    world.companion.state = 'alive';
    await until(() => gebeurt(guests[0], 'melding', van[0]).some((b) => /Je staat weer/.test(b.tekst)), 4000, 'Tessa staat weer');
  });

  await t('#367 roepjes: een gast roept, de anderen krijgen het met de plek van de afzender, de gastheer ziet het baken', async () => {
    const van = guests.map(evenAantal); world.audioEvents.length = 0;
    guests[1].session.sendEvent(pingEvent(12, 34, 'gevaar'));
    await until(() => [0, 2].every((i) => gebeurt(guests[i], 'ping', van[i]).length === 1), 4000, 'ping bij de anderen');
    for (const i of [0, 2]) { const p = gebeurt(guests[i], 'ping', van[i])[0]; assert.deepEqual([p.x, p.y, p.soort, p.van], [12, 34, 'gevaar', 2]); }
    await sleep(500);
    assert.equal(gebeurt(guests[1], 'ping', van[1]).length, 0, 'de afzender krijgt zijn eigen roep niet terug');
    await until(() => world.coopPingMarks.length === 1, 3000, 'baken bij de gastheer');
    assert.deepEqual([world.coopPingMarks[0].naam, world.coopPingMarks[0].tekst], ['Bram', 'Help!']);
    assert.deepEqual(world.audioEvents.map((e) => e.kind), ['notify'], 'de gastheer hoort het geluidje');
    assert.match(world.messages.join(' '), /Bram: Help!/);
  });

  await t('#365 wie zijn kabel eruit heeft krijgt niets; de anderen wel', async () => {
    guests[2].cut();
    await until(() => world.coopRoster.find((r) => r.slot === 3).verbinding === 'lost', 20000, 'Lotte als weg gemeld');
    const van = guests.map(evenAantal);
    assert.equal(N.deelMetGasten(world, 200), 2, 'twee gasten betaald');
    await until(() => [0, 1].every((i) => gebeurt(guests[i], 'beloning', van[i]).length === 1), 4000, 'betaald');
    await sleep(500);
    assert.equal(gebeurt(guests[2], 'beloning', van[2]).length, 0);
  });
  console.log(`gaten_tcp_test: ${n}/${n} ok`);
} catch (e) {
  console.error('gaten_tcp_test MISLUKT:', e && e.stack || e);
  process.exitCode = 1;
} finally {
  await stop();
}
process.exit(process.exitCode || 0);
