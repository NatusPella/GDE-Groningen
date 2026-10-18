// Coöp online (#95): TCP-kern van het main-proces (desktop/coopcore.cjs), alleen
// op 127.0.0.1 en zonder de router te benaderen (upnp: false). Geen poort 9000.
import assert from 'node:assert/strict';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { createCoopCore, isLanHost } = require('../desktop/coopcore.cjs');
const gameDir = path.join(root, 'game');

let n = 0;
const t = async (name, f) => { await f(); n++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('time-out'); await wait(10); } };

function pair() {
  const ev = { h: [], g: [], hs: [], gs: [] };
  const host = createCoopCore({ gameDir, localIp: '127.0.0.1', upnp: false, emit: (k, p) => (k === 'msg' ? ev.h.push([...p]) : ev.hs.push(p.state)) });
  const guest = createCoopCore({ gameDir, emit: (k, p) => (k === 'msg' ? ev.g.push([...p]) : ev.gs.push(p.state)) });
  return { host, guest, ev };
}

await t('isLanHost: alleen privé IPv4', () => {
  assert.equal(isLanHost('192.168.1.1'), true); assert.equal(isLanHost('8.8.8.8'), false); assert.equal(isLanHost('router.example'), false);
});
await t('host maakt een lokale code zonder de router te benaderen; gast verbindt; berichten heen en terug', async () => {
  const { host, guest, ev } = pair();
  const h = await host.host();
  assert.equal(h.ok, true); assert.equal(h.online, false); assert.match(h.code, /^GDE2-127\.0\.0\.1:4\d{4}-[A-Z2-9]{8}-[0-9A-F]{4}$/);
  const g = await guest.join(h.code); assert.equal(g.ok, true);
  await until(() => ev.hs.includes('open'));
  assert.equal(guest.send(Uint8Array.from([1, 2, 3])), true);
  await until(() => ev.h.length === 1); assert.deepEqual(ev.h[0], [1, 2, 3]);
  assert.equal(host.send(Uint8Array.from([7, 7])), true);
  await until(() => ev.g.length === 1); assert.deepEqual(ev.g[0], [7, 7]);
  await guest.stop(); await until(() => ev.hs.includes('closed')); await host.stop();
});
await t('verkeerde sleutel: host sluit de verbinding en geeft niets door', async () => {
  const { host, ev } = pair();
  const h = await host.host(); const port = Number(/:(\d+)-/.exec(h.code)[1]);
  const s = net.connect(port, '127.0.0.1');
  await new Promise((r) => s.once('connect', r));
  const bad = new TextEncoder().encode('KEY:AAAAAAAA'); const f = new Uint8Array(4 + bad.length); new DataView(f.buffer).setUint32(0, bad.length); f.set(bad, 4);
  s.write(f); s.write(Uint8Array.from([0, 0, 0, 1, 9]));
  await new Promise((r) => s.once('close', r));
  assert.equal(ev.h.length, 0); await host.stop();
});
await t('tweede verbinding terwijl er al een gast is wordt geweigerd', async () => {
  const { host, guest } = pair();
  const h = await host.host(); await guest.join(h.code);
  const other = createCoopCore({ gameDir, emit: () => {} });
  await other.join(h.code);
  await wait(200);
  assert.equal(guest.isConnected(), true); assert.equal(other.isConnected(), false);
  await other.stop(); await guest.stop(); await host.stop();
});
await t('hervatten: na wegvallen kan dezelfde gast opnieuw verbinden', async () => {
  const { host, guest, ev } = pair();
  const h = await host.host(); await guest.join(h.code); await until(() => ev.hs.includes('open'));
  await guest.stop(); await until(() => ev.hs.includes('closed'));
  ev.hs.length = 0;
  const g2 = createCoopCore({ gameDir, emit: () => {} });
  assert.equal((await g2.join(h.code)).ok, true); await until(() => ev.hs.includes('open'));
  await g2.stop(); await host.stop();
});
await t('slechte code en onbereikbare host geven een Nederlandse melding', async () => {
  const g = createCoopCore({ gameDir, emit: () => {} });
  assert.match((await g.join('rommel')).reason, /geen koppelcode/);
  const { host } = pair(); const h = await host.host(); await host.stop(); // poort weer dicht
  const r = await g.join(h.code);
  assert.equal(r.ok, false); assert.match(r.reason, /Geen verbinding met de host/);
});
console.log(`coopcore_test: ${n}/${n} ok`);
