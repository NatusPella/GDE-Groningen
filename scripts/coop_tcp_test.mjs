// Samen spelen (#95): host en vier headless gasten over ECHTE TCP-verbindingen op 127.0.0.1 (zonder Electron), met
// dezelfde coopcore.cjs als de app en dezelfde koppeling (coopnet.js, net/hub.js, net/ipctransport.js). De gasten
// (scripts/coop/mockclient.mjs) hebben een netwerksimulatie met vertraging en verlies. Dekt: koppelcode en sleutel,
// vier spelers, kabel eruit en weer terug (zelfde plek), vertrek en een nieuwe gast, de vijfde moet wachten.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as N from '../game/js/coopnet.js';
import { listenForGuests } from '../game/js/net/ipctransport.js';
import { startMockGuest } from './coop/mockclient.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));

let n = 0;
const t = async (name, f) => { const r = await f(); n++; if (r) console.log(`  ${name}: ${r}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(50); } throw new Error('time-out: ' + what); };

const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });
const world = { player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false } };

// de host: de TCP-kant van de app (coopcore) achter dezelfde ipc-brug als in Electron (preload.js)
const listeners = new Set();
const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
const api = { send: (id, bytes) => core.send(id, bytes), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
N.startHost(world, INFO, { seed: 3, max: 4 });
listenForGuests(api, (tr) => N.addGuest(world, tr));
const hosted = await core.host({ max: 4 });
assert.ok(hosted.ok && /^GDE2-127\.0\.0\.1:\d+-/.test(hosted.code), 'koppelcode op de loopback');
let last = Date.now();
const timer = setInterval(() => { const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; N.tickCoopNet(world, dt); world.time += dt; world.clock = (world.clock + dt / 60) % 24; }, 16);

const guests = [];
const join = async (netcfg, seed) => { const g = await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: netcfg, seed }); g.input = (tt) => ({ mx: Math.cos(tt), my: Math.sin(tt), run: false, yaw: 0 }); guests.push(g); return g; };

await t('een gast met een verkeerde sleutel wordt geweigerd; met de juiste code komt hij binnen', async () => {
  const slecht = hosted.code.replace(/-([A-Z2-9]{8})-/, '-AAAAAAAA-'); // controlesom klopt dan niet
  await assert.rejects(() => startMockGuest({ stage: path.join(ROOT, 'game'), code: slecht }), /code klopt niet|Dit is geen/);
  const g = await join({ latency: 0.03 }, 1);
  await until(() => g.session.status === 'ok' && g.last(), 8000, 'gast 1 ok');
  assert.equal(g.session.slot, 1);
  assert.equal(world.coopRoster.length, 2);
});

await t('vier spelers over TCP, drie gasten met 80 ms vertraging en 5% verlies', async () => {
  await join({ latency: 0.08, jitter: 0.03, loss: 0.05 }, 2);
  await join({ latency: 0.08, jitter: 0.03, loss: 0.05 }, 3);
  await until(() => guests.every((g) => g.last()), 15000, 'iedereen krijgt snapshots');
  await sleep(6000);
  assert.equal(world.coopRoster.length, 4);
  for (const g of guests) assert.ok(['ok', 'lag'].includes(g.session.status), 'status ' + g.session.status);
  const kinds = {}; for (const [, b] of guests[2].log.events) kinds[b.k] = (kinds[b.k] || 0) + 1;
  assert.ok(kinds.klok && kinds.spelers, 'klok- en spelersberichten komen aan: ' + JSON.stringify(kinds));
  const l = guests[2].last();
  assert.equal(l.players.length, 4, 'de snapshot heeft vier spelers');
  return `slots ${guests.map((g) => g.session.slot).join(',')}, rtt ${(guests[2].session.rtt * 1000).toFixed(0)} ms, ${guests[2].transport.recv} pakketten, ${guests[2].transport.droppedIn} binnenkomend verloren`;
});

await t('de vijfde speler (maximum 4) wordt geweigerd', async () => {
  await join({}, 4); const g = guests.pop();
  await until(() => g.session.status === 'geweigerd', 8000, 'geweigerd');
  assert.ok(['vol', 'gesloten'].includes(g.session.rejected), 'reden: ' + g.session.rejected);
  await g.stop();
});

await t('kabel eruit bij een gast (8 s) en weer erin: de host ziet hem wegvallen en hij komt terug op dezelfde plek', async () => {
  const g = guests[0], slot = g.session.slot;
  g.cut();
  await until(() => world.coopRoster.find((r) => r.slot === slot).verbinding === 'lost', 12000, 'verbinding weg');
  g.restore();
  try { await until(() => world.coopRoster.find((r) => r.slot === slot).verbinding === 'ok', 15000, 'weer verbonden'); } catch (e) { throw new Error(e.message + ' ' + JSON.stringify({ gast: g.session.status, hostses: world.coopNet.hub.status(slot), statussen: g.log.status, tr: g.transport.open, sim: g.sim })); }
  await until(() => g.session.status === 'ok', 5000, 'de gast ziet zichzelf weer verbonden');
  assert.equal(g.session.slot, slot);
  assert.equal(world.coopRoster.length, 4);
  return `statussen van de gast: ${g.log.status.map((s) => s[1]).join(' → ')}`;
});

await t('een gast stopt; de plek komt vrij en een nieuwe gast neemt hem; de host stopt en alle gasten vallen eruit', async () => {
  const weg = guests.splice(1, 1)[0]; const slot = weg.session.slot;
  await weg.stop();
  await until(() => !world.coopRoster.find((r) => r.slot === slot) && core.count() < 3, 10000, 'plek vrij');
  const nieuw = await join({}, 5);
  try { await until(() => nieuw.session.status === 'ok', 10000, 'nieuwe gast'); } catch (e) { throw new Error(e.message + ' ' + JSON.stringify({ st: nieuw.session.status, rej: nieuw.session.rejected, ros: world.coopRoster.map((r) => r.slot + r.verbinding), n: core.count(), pend: world.coopNet.hub.pending.size, ses: [...world.coopNet.hub.sessions.keys()].join(), now: nieuw.session.now, tr: { open: nieuw.transport.open, sent: nieuw.transport.sent, recv: nieuw.transport.recv } })); }
  assert.equal(nieuw.session.slot, slot, 'de nieuwe gast krijgt de vrijgekomen plek');
  N.stopCoopNet(world);
  await sleep(1500);
  for (const g of guests) assert.ok(g.session.status === 'verbroken' || !g.session.joined, 'gast ziet het vertrek van de host: ' + g.session.status);
});

clearInterval(timer);
for (const g of guests) await g.stop();
await core.stop();
console.log(`coop_tcp_test: ${n}/${n} ok`);
process.exit(0);
