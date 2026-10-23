// Samen spelen (#95): signalering via nepbrokers (game/js/net/brokers.js). Geen
// echte sockets: alle "servers" zijn objecten in dit bestand.
import assert from 'node:assert/strict';
import * as B from '../game/js/net/brokers.js';
import { encryptBlob, decryptBlob, topicFor } from '../game/js/net/sigcrypto.js';
import { makeRng } from '../game/js/net/memtransport.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (f, ms = 1500) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('time-out'); await tick(3); } };

const CFG = { TRACKERS: ['wss://t1.test', 'wss://t2.test'], MQTT_BROKERS: ['wss://m1.test/mqtt'], PEERJS: { host: 'p.test', port: 443, path: '/', key: 'k', secure: true } };

// ----- nepnetwerk met een tracker, een MQTT-broker en een PeerJS-server
function fakeNet({ down = [] } = {}) {
  const net = { seen: [], retained: new Map(), trackerOffers: new Map(), subs: [], peers: new Map(), trackerPeers: new Map() };
  const later = (f) => setTimeout(f, 0);
  net.socket = (url) => {
    const ws = { url, onopen: null, onmessage: null, onerror: null, onclose: null, closed: false };
    const deliver = (data) => later(() => { if (!ws.closed && ws.onmessage) ws.onmessage({ data }); });
    ws.close = () => { ws.closed = true; };
    if (down.some((d) => url.startsWith(d))) { later(() => ws.onerror && ws.onerror(new Error('niet bereikbaar'))); ws.send = () => {}; return ws; }
    const kind = url.includes('t1.test') || url.includes('t2.test') ? 'tracker' : url.includes('m1.test') ? 'mqtt' : 'peerjs';
    later(() => ws.onopen && ws.onopen());
    if (kind === 'peerjs') { const id = /id=([^&]+)/.exec(url)[1]; net.peers.set(id, { ws, deliver }); later(() => deliver(JSON.stringify({ type: 'OPEN' }))); }
    ws.send = (data) => {
      net.seen.push({ kind, url, data: typeof data === 'string' ? data : Buffer.from(data).toString('latin1') });
      if (kind === 'tracker') {
        const m = JSON.parse(data);
        const key = url + m.info_hash;
        net.trackerPeers.set(m.peer_id, { deliver, hash: m.info_hash, url });
        deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, interval: 120, complete: 0, incomplete: 1 }));
        if (m.answer) { const to = net.trackerPeers.get(m.to_peer_id); if (to) to.deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: m.offer_id, answer: m.answer })); return; }
        if (m.offers && m.offers.length) {
          net.trackerOffers.set(key, { peer_id: m.peer_id, offer: m.offers[0] });
          for (const [pid, p] of net.trackerPeers) if (pid !== m.peer_id && p.url === url && p.hash === m.info_hash) p.deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: m.offers[0].offer_id, offer: m.offers[0].offer }));
        } else if (net.trackerOffers.has(key)) { const o = net.trackerOffers.get(key); deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: o.peer_id, offer_id: o.offer.offer_id, offer: o.offer.offer })); }
      } else if (kind === 'mqtt') {
        const u8 = new Uint8Array(data);
        const first = u8[0] >> 4;
        if (first === 1) deliver(Uint8Array.from([0x20, 2, 0, 0]));
        else if (first === 8) {
          const tl = (u8[4] << 8) | u8[5]; const topic = new TextDecoder().decode(u8.subarray(6, 6 + tl));
          net.subs.push({ topic, deliver }); deliver(Uint8Array.from([0x90, 3, 0, 1, 0]));
          if (net.retained.has(topic)) deliver(B.mqtt.publish(topic, net.retained.get(topic), true));
        } else if (first === 3) {
          const p = B.mqtt.parse(u8)[0];
          if (u8[0] & 1) { if (p.payload) net.retained.set(p.topic, p.payload); else net.retained.delete(p.topic); }
          for (const s of net.subs) if (s.topic === p.topic && s.deliver !== deliver) s.deliver(B.mqtt.publish(p.topic, p.payload));
        }
      } else {
        const m = JSON.parse(data); const src = /id=([^&]+)/.exec(url)[1];
        if (m.dst && net.peers.has(m.dst)) net.peers.get(m.dst).deliver(JSON.stringify({ ...m, src, dst: undefined }));
      }
    };
    return ws;
  };
  return net;
}

const timers = {}; // echte timers; elke test sluit zijn signaler
async function exchange(net, room = 'K3J9D8F2MN', opts = {}) {
  const topic = await topicFor(room);
  const env = { socket: net.socket, rand: makeRng(7) };
  const h = new B.MultiSignaler(CFG, env, { fallbackAfter: 300, brokerTimeout: 200, ...opts });
  const g = new B.MultiSignaler(CFG, { ...env, rand: makeRng(9) }, { fallbackAfter: 300, brokerTimeout: 200, ...opts });
  const offerBlob = await encryptBlob(room, JSON.stringify({ type: 'offer', sdp: 'v=0 a=candidate:1 1 udp 1 192.168.1.5 5000 typ host' }));
  let answerGot = null, offerGot = null;
  h.host(topic, offerBlob, (b) => { answerGot = b; });
  await tick(20);
  g.join(topic, async (blob, reply) => { offerGot = blob; reply(await encryptBlob(room, JSON.stringify({ type: 'answer', sdp: 'v=0 answer' }))); });
  await waitFor(() => answerGot);
  const out = { offerGot, answerGot, room, offerBlob };
  h.close(); g.close();
  return out;
}

await t('MQTT-codec: rondreis, retain, meerdere pakketten in een frame, rommel', () => {
  const p = B.mqtt.publish('gde/coop/abc/o', 'blob', true);
  assert.equal(p[0] & 1, 1);
  assert.deepEqual(B.mqtt.parse(p), [{ type: 'publish', topic: 'gde/coop/abc/o', payload: 'blob' }]);
  const two = new Uint8Array([...Uint8Array.from([0x20, 2, 0, 0]), ...B.mqtt.publish('x', 'y')]);
  assert.deepEqual(B.mqtt.parse(two).map((x) => x.type), ['connack', 'publish']);
  assert.deepEqual(B.mqtt.parse(Uint8Array.from([0x30, 200, 1])), [], 'afgekapt');
  const big = B.mqtt.publish('t', 'x'.repeat(300)); assert.equal(B.mqtt.parse(big)[0].payload.length, 300);
  assert.deepEqual(B.mqtt.parse(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])), []);
});
await t('alle routes beschikbaar: aanbod en antwoord komen aan, versleuteld', async () => {
  const net = fakeNet();
  const r = await exchange(net);
  assert.equal(r.offerGot, r.offerBlob);
  const ans = JSON.parse(await decryptBlob(r.room, r.answerGot));
  assert.equal(ans.type, 'answer');
});
await t('de brokers zien alleen versleutelde blobs, nooit de kamercode of het IP-adres', async () => {
  const net = fakeNet();
  const r = await exchange(net);
  const all = net.seen.map((s) => s.data).join('\n');
  assert.ok(!all.includes('192.168.1.5') && !all.includes('candidate') && !all.includes(r.room));
  assert.ok(all.includes(r.offerBlob.slice(0, 20)), 'het aanbod ging wel (versleuteld) over de lijn');
});
await t('alleen trackers bereikbaar', async () => {
  const r = await exchange(fakeNet({ down: ['wss://m1.test'] }));
  assert.ok(r.answerGot);
});
await t('alleen MQTT bereikbaar', async () => {
  const r = await exchange(fakeNet({ down: ['wss://t1.test', 'wss://t2.test'] }));
  assert.ok(r.answerGot);
});
await t('geen enkele broker bereikbaar: PeerJS-terugval springt in', async () => {
  const net = fakeNet({ down: ['wss://t1.test', 'wss://t2.test', 'wss://m1.test'] });
  const r = await exchange(net);
  assert.ok(r.answerGot);
  assert.ok(net.seen.some((s) => s.kind === 'peerjs'), 'PeerJS is gebruikt');
});
await t('PeerJS wordt niet gebruikt als een broker werkt', async () => {
  const net = fakeNet();
  await exchange(net);
  assert.ok(!net.seen.some((s) => s.kind === 'peerjs'));
});
await t('verkeerde kamercode: de gast vindt het aanbod niet en kan het niet ontsleutelen', async () => {
  const net = fakeNet(); const room = 'K3J9D8F2MN';
  const h = new B.MultiSignaler(CFG, { socket: net.socket, rand: makeRng(1) }, { fallbackAfter: 300, brokerTimeout: 200 });
  h.host(await topicFor(room), await encryptBlob(room, 'aanbod'), () => {});
  await tick(20);
  let got = null;
  const g = new B.MultiSignaler(CFG, { socket: net.socket, rand: makeRng(2) }, { fallbackAfter: 300, brokerTimeout: 200 });
  g.join(await topicFor('ZZZZZZZZZZ'), (b) => { got = b; });
  await tick(150);
  assert.equal(got, null, 'ander onderwerp, geen aanbod');
  assert.equal(await decryptBlob('ZZZZZZZZZZ', await encryptBlob(room, 'aanbod')), null);
  h.close(); g.close();
});
await t('sluiten ruimt het vastgehouden MQTT-aanbod op', async () => {
  const net = fakeNet({ down: ['wss://t1.test', 'wss://t2.test'] });
  const topic = await topicFor('K3J9D8F2MN');
  const h = new B.MultiSignaler(CFG, { socket: net.socket, rand: makeRng(1) }, { fallbackAfter: 500, brokerTimeout: 200 });
  h.host(topic, 'blob', () => {}); await tick(30);
  assert.equal(net.retained.get(`gde/coop/${topic}/o`), 'blob');
  h.close(); await tick(10);
  assert.equal(net.retained.has(`gde/coop/${topic}/o`), false);
});
await t('een broker die wegvalt terwijl de host wacht, wordt opnieuw verbonden en het aanbod staat er weer (de duurtest-review: de status bleef stil op ok)', async () => {
  const net = fakeNet(); const sockets = [];
  const socket = (u) => { const w = net.socket(u); sockets.push(w); return w; };
  const snel = { setTimeout: (f, ms) => setTimeout(f, ms / 200), clearTimeout, setInterval: (f, ms) => setInterval(f, ms / 200), clearInterval }; // de wachttijd van 2 s wordt 10 ms
  const topic = await topicFor('R7R7R7R7R7');
  const b = new B.MqttBackend({ url: 'wss://m1.test/mqtt', socket, timers: snel, rand: makeRng(3) });
  const stat = []; b.onstatus = (nm, st) => stat.push(st);
  b.host(topic, 'blob', () => {}, 40000); await waitFor(() => b.status === 'ok');
  net.retained.clear(); net.subs.length = 0; // de broker startte opnieuw op en weet niets meer
  sockets[0].onclose();
  assert.equal(b.status, 'bezig', 'niet langer ok: er wordt hersteld');
  await waitFor(() => net.retained.get(`gde/coop/${topic}/o`) === 'blob' && b.status === 'ok');
  assert.equal(sockets.length, 2); assert.deepEqual(stat, ['ok', 'bezig', 'ok']);
  assert.equal(b.ivs.length, 1, 'geen dubbele ping-timers na het herstel');
  // een broker die blijft wegblijven geeft het na een paar pogingen op (dan springt de terugval in)
  const dood = new B.MqttBackend({ url: 'wss://m1.test/mqtt', socket: (u) => { const w = net.socket(u); sockets.push(w); return w; }, timers: snel, rand: makeRng(4) });
  dood.host(topic, 'blob', () => {}, 40000); await waitFor(() => dood.status === 'ok');
  dood.open = () => { const w = { send() {}, close() {}, readyState: 1 }; setTimeout(() => w.onerror && w.onerror(new Error('weg')), 0); return w; }; // elke nieuwe poging mislukt
  dood.ws.onclose();
  await waitFor(() => dood.status === 'fout', 3000);
  b.close(); dood.close();
});
console.log(`net_brokers_test: ${n}/${n} ok`);
