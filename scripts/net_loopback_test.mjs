// Samen spelen (#95): signalering over ECHTE websockets, maar alleen naar een nep-tracker op
// 127.0.0.1 (geen openbare diensten). De host en de gast gebruiken de MultiSignaler met de
// WebSocket van Node; de tracker is hier een minimale WebSocket-server met http-upgrade.
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import * as B from '../game/js/net/brokers.js';
import { encryptBlob, decryptBlob, topicFor } from '../game/js/net/sigcrypto.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };
const waitFor = async (f, ms = 3000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('time-out'); await new Promise((r) => setTimeout(r, 10)); } };

function frame(text) { // server -> client, niet gemaskeerd
  const b = Buffer.from(text); const len = b.length;
  const h = len < 126 ? Buffer.from([0x81, len]) : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255]) : null;
  return Buffer.concat([h, b]);
}
function* readFrames(buf) { // client -> server, gemaskeerd, tekstframes zonder fragmentatie
  let o = 0;
  while (buf.length - o >= 6) {
    const op = buf[o] & 15; let len = buf[o + 1] & 127; let p = o + 2;
    if (len === 126) { len = buf.readUInt16BE(p); p += 2; }
    if (buf.length < p + 4 + len) return o;
    const mask = buf.subarray(p, p + 4); p += 4;
    const out = Buffer.alloc(len); for (let i = 0; i < len; i++) out[i] = buf[p + i] ^ mask[i & 3];
    o = p + len; yield { op, text: out.toString() };
  }
  return o;
}
async function startTracker() {
  const offers = new Map(), peers = new Map(), seen = [];
  const server = http.createServer();
  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
      crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
    let buf = Buffer.alloc(0);
    sock.on('error', () => {});
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const it = readFrames(buf); let r; while (!(r = it.next()).done) {
        if (r.value.op !== 1) continue;
        const m = JSON.parse(r.value.text); seen.push(r.value.text);
        peers.set(m.peer_id, sock);
        sock.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, interval: 120, complete: 0, incomplete: 1 })));
        if (m.answer) { const to = peers.get(m.to_peer_id); if (to) to.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: m.offer_id, answer: m.answer }))); }
        else if (m.offers && m.offers.length) offers.set(m.info_hash, { peer_id: m.peer_id, o: m.offers[0] });
        else if (offers.has(m.info_hash)) { const f = offers.get(m.info_hash); sock.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: f.peer_id, offer_id: f.o.offer_id, offer: f.o.offer }))); }
      }
      buf = buf.subarray(r.value);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, seen, close: () => { server.closeAllConnections(); server.close(); } };
}

await t('host en gast wisselen aanbod en antwoord uit via een echte websocket naar 127.0.0.1, versleuteld', async () => {
  const tr = await startTracker();
  const cfg = { TRACKERS: [`ws://127.0.0.1:${tr.port}`], MQTT_BROKERS: [], PEERJS: null };
  const env = { socket: (url) => { assert.match(url, /^ws:\/\/127\.0\.0\.1:/, 'alleen de lokale nep-tracker'); const ws = new WebSocket(url); return ws; } };
  const room = 'K3J9D8F2MN', topic = await topicFor(room);
  const h = new B.MultiSignaler(cfg, env, { fallbackAfter: 5000, brokerTimeout: 2000 });
  const g = new B.MultiSignaler(cfg, env, { fallbackAfter: 5000, brokerTimeout: 2000 });
  const offer = await encryptBlob(room, JSON.stringify({ type: 'offer', sdp: 'v=0 a=candidate:1 1 udp 1 10.9.8.7 5000 typ host' }));
  let answer = null, gotOffer = null;
  h.host(topic, offer, (b) => { answer = b; });
  await new Promise((r) => setTimeout(r, 60));
  g.join(topic, async (blob, reply) => { gotOffer = blob; reply(await encryptBlob(room, JSON.stringify({ type: 'answer', sdp: 'v=0 antwoord' }))); });
  await waitFor(() => answer);
  assert.equal(gotOffer, offer);
  assert.equal(JSON.parse(await decryptBlob(room, answer)).sdp, 'v=0 antwoord');
  const wire = tr.seen.join('\n');
  assert.ok(!wire.includes('10.9.8.7') && !wire.includes(room), 'de tracker ziet geen IP-adres en geen kamercode');
  h.close(); g.close(); tr.close();
});
console.log(`net_loopback_test: ${n}/${n} ok`);
process.exit(0); // timers van de signaler en open sockets niet afwachten
