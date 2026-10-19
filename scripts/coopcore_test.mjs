// Samen spelen (#95): TCP-kern van het main-proces (desktop/coopcore.cjs) met meerdere gasten,
// alleen op 127.0.0.1 en zonder de router te benaderen (upnp: false). Geen poort 9000.
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

function mkHost() {
  const ev = { msgs: [], states: [], conns: [] };
  const host = createCoopCore({ gameDir, localIp: '127.0.0.1', upnp: false, emit: (k, p) => { if (k === 'msg') ev.msgs.push([p.id, [...p.data]]); else if (k === 'state') ev.states.push([p.id, p.state]); else if (k === 'conn') ev.conns.push(p.id); } });
  return { host, ev };
}
function mkGuest() {
  const ev = { msgs: [], states: [] };
  const guest = createCoopCore({ gameDir, emit: (k, p) => { if (k === 'msg') ev.msgs.push([...p.data]); else if (k === 'state') ev.states.push(p.state); } });
  return { guest, ev };
}

await t('isLanHost: alleen privé IPv4', () => {
  assert.equal(isLanHost('192.168.1.1'), true); assert.equal(isLanHost('8.8.8.8'), false); assert.equal(isLanHost('router.example'), false);
});
await t('host maakt een lokale code zonder de router te benaderen; gast verbindt; berichten heen en terug met id', async () => {
  const { host, ev } = mkHost(); const { guest, ev: ge } = mkGuest();
  const h = await host.host();
  assert.equal(h.ok, true); assert.equal(h.online, false); assert.match(h.code, /^GDE2-127\.0\.0\.1:4\d{4}-[A-Z2-9]{8}-[0-9A-F]{4}$/);
  assert.equal((await guest.join(h.code)).ok, true);
  await until(() => ev.conns.length === 1); assert.deepEqual(ev.conns, [1]);
  assert.equal(guest.send(0, Uint8Array.from([1, 2, 3])), true);
  await until(() => ev.msgs.length === 1); assert.deepEqual(ev.msgs[0], [1, [1, 2, 3]]);
  assert.equal(host.send(1, Uint8Array.from([7, 7])), true);
  await until(() => ge.msgs.length === 1); assert.deepEqual(ge.msgs[0], [7, 7]);
  await guest.stop(); await until(() => ev.states.some((s) => s[1] === 'closed')); await host.stop();
});
await t('vier spelers tegelijk: drie gasten met eigen id, berichten blijven bij de juiste gast', async () => {
  const { host, ev } = mkHost(); const h = await host.host({ max: 4 });
  const gs = [mkGuest(), mkGuest(), mkGuest()];
  for (const g of gs) assert.equal((await g.guest.join(h.code)).ok, true);
  await until(() => ev.conns.length === 3); assert.deepEqual([...ev.conns].sort(), [1, 2, 3]);
  gs.forEach((g, i) => g.guest.send(0, Uint8Array.from([10 + i])));
  await until(() => ev.msgs.length === 3);
  assert.equal(new Set(ev.msgs.map((m) => m[0])).size, 3);
  host.send(2, Uint8Array.from([99]));
  await wait(150);
  const got = gs.map((g) => g.ev.msgs.length);
  assert.equal(got.reduce((a, b) => a + b, 0), 1, 'alleen één gast krijgt het bericht');
  assert.equal(host.count(), 3);
  for (const g of gs) await g.guest.stop();
  await host.stop();
});
await t('vol: de vijfde verbinding wordt geweigerd; met een hoger maximum kan het wel (tot acht)', async () => {
  const { host, ev } = mkHost(); const h = await host.host({ max: 4 });
  const gs = [mkGuest(), mkGuest(), mkGuest()];
  for (const g of gs) await g.guest.join(h.code);
  await until(() => host.count() === 3);
  const extra = mkGuest(); await extra.guest.join(h.code); await wait(200);
  assert.equal(host.count(), 3); assert.equal(extra.guest.isConnected(), false);
  const h8 = await host.host({ max: 8 });
  const acht = []; for (let i = 0; i < 7; i++) { const g = mkGuest(); await g.guest.join(h8.code); acht.push(g); }
  await until(() => host.count() === 7, 4000);
  const achtste = mkGuest(); await achtste.guest.join(h8.code); await wait(200);
  assert.equal(host.count(), 7);
  for (const g of [...gs, ...acht, extra, achtste]) await g.guest.stop();
  await host.stop();
});
await t('een gast valt weg: de anderen blijven; de host kan één gast sluiten', async () => {
  const { host, ev } = mkHost(); const h = await host.host();
  const a = mkGuest(), b = mkGuest(); await a.guest.join(h.code); await b.guest.join(h.code);
  await until(() => ev.conns.length === 2);
  await a.guest.stop(); await until(() => ev.states.some((s) => s[1] === 'closed'));
  assert.equal(host.count(), 1);
  host.close(2); await until(() => b.ev.states.includes('closed'));
  await host.stop();
});
await t('verkeerde sleutel: host sluit de verbinding en geeft niets door', async () => {
  const { host, ev } = mkHost();
  const h = await host.host(); const port = Number(/:(\d+)-/.exec(h.code)[1]);
  const s = net.connect(port, '127.0.0.1');
  await new Promise((r) => s.once('connect', r));
  const bad = new TextEncoder().encode('KEY:AAAAAAAA'); const f = new Uint8Array(4 + bad.length); new DataView(f.buffer).setUint32(0, bad.length); f.set(bad, 4);
  s.write(f); s.write(Uint8Array.from([0, 0, 0, 1, 9]));
  await new Promise((r) => s.once('close', r));
  assert.equal(ev.msgs.length, 0); assert.equal(ev.conns.length, 0); await host.stop();
});
await t('hervatten: na wegvallen kan dezelfde gast opnieuw verbinden', async () => {
  const { host, ev } = mkHost(); const { guest } = mkGuest();
  const h = await host.host(); await guest.join(h.code); await until(() => ev.conns.length === 1);
  await guest.stop(); await until(() => ev.states.some((s) => s[1] === 'closed'));
  const g2 = mkGuest();
  assert.equal((await g2.guest.join(h.code)).ok, true); await until(() => ev.conns.length === 2);
  await g2.guest.stop(); await host.stop();
});
await t('slechte code en onbereikbare host geven een Nederlandse melding', async () => {
  const g = mkGuest().guest;
  assert.match((await g.join('rommel')).reason, /geen koppelcode/);
  const { host } = mkHost(); const h = await host.host(); await host.stop();
  const r = await g.join(h.code);
  assert.equal(r.ok, false); assert.match(r.reason, /Geen verbinding met de gastheer/);
});
console.log(`coopcore_test: ${n}/${n} ok`);
