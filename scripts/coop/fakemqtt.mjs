// Samen spelen-testbank (#983): een nep-MQTT-broker op 127.0.0.1 voor de openbare sessielijst en de kamercode-route
// (MQTT 3.1.1 over een WebSocket, zoals net/brokers.js MqttBackend het spreekt). Alleen voor tests: geen echte
// dienst, niets verlaat deze machine. Kan: CONNECT, SUBSCRIBE (exact of met #-slot), PUBLISH (QoS 0, retain; een leeg
// vastgehouden bericht wist), PINGREQ. `gezien` bewaart de onderwerpen en de payloadlengtes, zodat de testbank kan
// controleren dat er geen IP-adres en geen kamercode in een lijstbericht stond.
import http from 'node:http';
import crypto from 'node:crypto';

function wsFrame(buf) { // server -> client, binair, niet gemaskeerd
  const len = buf.length;
  const h = len < 126 ? Buffer.from([0x82, len]) : len < 65536 ? Buffer.from([0x82, 126, len >> 8, len & 255]) : Buffer.concat([Buffer.from([0x82, 127]), (() => { const x = Buffer.alloc(8); x.writeBigUInt64BE(BigInt(len)); return x; })()]);
  return Buffer.concat([h, buf]);
}
function readWs(buf) { // client -> server: gemaskeerde frames
  const frames = []; let o = 0;
  while (buf.length - o >= 2) {
    const op = buf[o] & 15; let len = buf[o + 1] & 127; let p = o + 2;
    if (len === 126) { if (buf.length < p + 2) break; len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) { if (buf.length < p + 8) break; len = Number(buf.readBigUInt64BE(p)); p += 8; }
    const masked = (buf[o + 1] & 128) !== 0;
    if (buf.length < p + (masked ? 4 : 0) + len) break;
    let out;
    if (masked) { const mask = buf.subarray(p, p + 4); p += 4; out = Buffer.alloc(len); for (let i = 0; i < len; i++) out[i] = buf[p + i] ^ mask[i & 3]; }
    else out = buf.subarray(p, p + len);
    p += len; o = p; frames.push({ op, data: out });
  }
  return { frames, rest: o };
}
const varlen = (n) => { const out = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0); return Buffer.from(out); };
const pkt = (first, body) => Buffer.concat([Buffer.from([first]), varlen(body.length), body]);
const strBuf = (s) => { const b = Buffer.from(s); return Buffer.concat([Buffer.from([b.length >> 8, b.length & 255]), b]); };
const passt = (filter, topic) => (filter.endsWith('#') ? topic.startsWith(filter.slice(0, -1)) : filter === topic);

export async function startFakeMqtt() {
  const retained = new Map(); // onderwerp -> payload (Buffer)
  const subs = new Set(); // { sock, filter }
  const sockets = new Set();
  const gezien = []; // { topic, bytes, retain }
  const server = http.createServer();
  const stuur = (sock, topic, payload) => { if (!sock.destroyed) sock.write(wsFrame(pkt(0x30, Buffer.concat([strBuf(topic), payload])))); };
  server.on('upgrade', (req, sock) => {
    sockets.add(sock);
    const key = req.headers['sec-websocket-key'];
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
      crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
    let buf = Buffer.alloc(0);
    sock.on('error', () => {});
    sock.on('close', () => { sockets.delete(sock); for (const s of [...subs]) if (s.sock === sock) subs.delete(s); });
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const r = readWs(buf); buf = buf.subarray(r.rest);
      for (const f of r.frames) {
        if (f.op === 8) { sock.end(); return; }
        if (f.op !== 2 && f.op !== 1) continue;
        // één MQTT-pakket (de client stuurt er één per frame)
        const u = f.data; let o = 1, mult = 1, len = 0, b;
        do { b = u[o++]; len += (b & 127) * mult; mult *= 128; } while (b & 128 && o < u.length);
        const body = u.subarray(o, o + len); const type = u[0] >> 4;
        if (type === 1) sock.write(wsFrame(Buffer.from([0x20, 2, 0, 0]))); // CONNACK
        else if (type === 12) sock.write(wsFrame(Buffer.from([0xd0, 0]))); // PINGRESP
        else if (type === 8) { // SUBSCRIBE
          const id = body.subarray(0, 2); const tl = (body[2] << 8) | body[3]; const filter = body.subarray(4, 4 + tl).toString();
          subs.add({ sock, filter });
          sock.write(wsFrame(Buffer.concat([Buffer.from([0x90, 3]), id, Buffer.from([0])]))); // SUBACK
          for (const [t, p] of retained) if (passt(filter, t)) stuur(sock, t, p);
        } else if (type === 3) { // PUBLISH
          const retain = (u[0] & 1) === 1; const tl = (body[0] << 8) | body[1];
          const topic = body.subarray(2, 2 + tl).toString(); const payload = Buffer.from(body.subarray(2 + tl));
          gezien.push({ topic, bytes: payload.length, retain, tekst: payload.length <= 4000 ? payload.toString() : '' });
          if (retain) { if (payload.length) retained.set(topic, payload); else retained.delete(topic); }
          if (payload.length) for (const s of subs) if (s.sock !== sock && passt(s.filter, topic)) stuur(s.sock, topic, payload);
        }
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, gezien, retained, close: () => { for (const s of sockets) { try { s.destroy(); } catch (e) { /* weg */ } } server.close(); } };
}
