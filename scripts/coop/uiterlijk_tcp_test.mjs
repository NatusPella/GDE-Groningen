// Coöp-testbank (#1157 e.a.): kleding en interieurs met echte TCP-verbindingen op 127.0.0.1, zonder Electron.
// De gastheer draait de echte koppeling (coopnet.js, hub) achter dezelfde coopcore.cjs als de app; twee headless gasten (mockclient.mjs) praten het echte protocol.
//   - kleding: een gast stuurt zijn outfitcode (k outfit); de host zet hem in de spelerslijst en de tweede gast leest hem daar; een ongeldige code verandert niets.
//   - voetbal: de ratings van een gast reizen mee in het wedgast-antwoord J; dat staat in scripts/coop/samenwedstrijd_tcp_test.mjs en scripts/coopwedstrijd_voetbal_test.mjs.
//   - interieurs: er bestaat geen interieurbericht op de lijn; host en gast bouwen dezelfde kamer uit hetzelfde gebouw (deterministisch, geen verkeer).
//   node scripts/coop/uiterlijk_tcp_test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as N from '../../game/js/coopnet.js';
import { listenForGuests } from '../../game/js/net/ipctransport.js';
import { encodeOutfit } from '../../game/js/clothing.js';
import { planInterior, interiorSeed } from '../../game/js/interiorrules.js';
import { building } from '../interior_fixtures.mjs';
import { mulberry32 } from '../../game/js/rng.js';
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
N.startHost(world, INFO, { seed: 5, max: 3 });
listenForGuests(api, (tr) => N.addGuest(world, tr));
const hosted = await core.host({ max: 3 });
assert.ok(hosted.ok, 'de gastheer luistert');
let last = Date.now();
const timer = setInterval(() => { const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; N.tickCoopNet(world, dt); world.time += dt; }, 16);

const guests = [];
const stop = async () => { clearInterval(timer); for (const g of guests) await g.stop(); try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await sleep(300); try { await core.stop(); } catch (e) { /* al weg */ } };
const evSoorten = (g) => new Set(g.log.events.map(([, b]) => b.k));

try {
  for (let i = 0; i < 2; i++) guests.push(await startMockGuest({ stage: path.join(ROOT, 'game'), code: hosted.code, net: { latency: 0.05, jitter: 0.01 }, seed: 30 + i, wens: i === 0 ? 'bram' : 'lotte' }));
  await until(() => guests.every((g) => g.session.status === 'ok' && g.last()), 15000, 'twee gasten verbonden');
  await sleep(1000);
  assert.equal(world.coopRoster.length, 3);

  await t('kleding: de outfitcode van een gast staat in de spelerslijst van de host en van de andere gast; een onzincode verandert niets', async () => {
    const code = encodeOutfit({ body: 'breed' });
    assert.ok(code, 'een geldige code');
    guests[0].session.sendEvent({ k: 'outfit', o: 'onzin' });
    guests[0].session.sendEvent({ k: 'outfit', o: code });
    const outfitVan = (lijst, slot) => ((lijst || []).find((x) => x.slot === slot) || {}).avatar;
    await until(() => (outfitVan(world.coopRoster, 1) || {}).outfit === code, 5000, 'code bij de host');
    await until(() => guests[1].log.events.some(([, b]) => b.k === 'spelers' && (outfitVan(b.lijst, 1) || {}).outfit === code), 5000, 'code bij de tweede gast');
    assert.equal((outfitVan(world.coopRoster, 2) || {}).outfit || null, null, 'de ander is niet veranderd');
  });

  await t('interieurs: host en gast bouwen dezelfde kamer uit hetzelfde gebouw en er is geen interieurbericht op de lijn', async () => {
    const { b, spot } = building('woning', null, 9, 13, mulberry32(8));
    const host = planInterior(JSON.parse(JSON.stringify(b)), { spot }), gast = planInterior(JSON.parse(JSON.stringify(b)), { spot });
    assert.equal(host.seed, gast.seed); assert.equal(host.seed, interiorSeed(b));
    assert.equal(JSON.stringify(host), JSON.stringify(gast));
    for (const g of guests) assert.ok(![...evSoorten(g)].some((k) => /interi|kamer|room/i.test(k)), 'geen interieurverkeer');
  });
  console.log(`uiterlijk_tcp_test: ${n}/${n} ok`);
} catch (e) {
  console.error('uiterlijk_tcp_test MISLUKT:', e && e.stack || e);
  process.exitCode = 1;
} finally {
  await stop();
}
process.exit(process.exitCode || 0);
