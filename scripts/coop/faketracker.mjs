// Coöp-testbank (#95): een nep-tracker op 127.0.0.1 voor de kamercode-route (BitTorrent-trackerprotocol over een
// WebSocket, zoals net/brokers.js TrackerBackend het spreekt). Geen openbare dienst: host en gast wisselen hun
// versleutelde WebRTC-aanbod en -antwoord uit via deze server, daarna loopt het datakanaal rechtstreeks over de
// loopback. `seen` bewaart wat de tracker te zien kreeg, zodat de testbank kan controleren dat er geen IP-adres en
// geen kamercode in zat.
import http from 'node:http';
import crypto from 'node:crypto';

function frame(text) { // server -> client, niet gemaskeerd
  const b = Buffer.from(text); const len = b.length;
  const h = len < 126 ? Buffer.from([0x81, len]) : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255]) : Buffer.concat([Buffer.from([0x81, 127]), (() => { const x = Buffer.alloc(8); x.writeBigUInt64BE(BigInt(len)); return x; })()]);
  return Buffer.concat([h, b]);
}
// client -> server: gemaskeerde frames; geeft { frames: [{op, text}], rest: aantal verwerkte bytes }
function readFrames(buf) {
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
    p += len; o = p; frames.push({ op, text: out.toString() });
  }
  return { frames, rest: o };
}

export async function startFakeTracker() {
  const offers = new Map(), peers = new Map(), seen = [], trace = [];
  const sockets = new Set(); let sid = 0; const t0 = Date.now(); const ts = () => ((Date.now() - t0) / 1000).toFixed(1);
  const server = http.createServer();
  server.on('upgrade', (req, sock) => {
    sockets.add(sock); const me = ++sid; sock.__id = me; trace.push(`${ts()} s${me} open`);
    const key = req.headers['sec-websocket-key'];
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
      crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
    let buf = Buffer.alloc(0);
    sock.on('error', () => {});
    sock.on('close', (err) => { sockets.delete(sock); trace.push(`${ts()} s${me} dicht${err ? ' (fout)' : ''}`); });
    sock.on('end', () => trace.push(`${ts()} s${me} einde van de andere kant`));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const r = readFrames(buf); buf = buf.subarray(r.rest);
      for (const f of r.frames) {
        if (f.op === 8) { sock.end(); return; }
        if (f.op !== 1) continue;
        let m; try { m = JSON.parse(f.text); } catch (e) { continue; }
        seen.push(f.text); trace.push(`${ts()} s${me} bericht ${m.answer ? 'antwoord' : m.offers && m.offers.length ? 'aanbod' : 'vraag'} van ${String(m.peer_id).slice(0, 4)}`);
        peers.set(m.peer_id, sock);
        sock.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, interval: 120, complete: 0, incomplete: 1 })));
        if (m.answer) { const to = peers.get(m.to_peer_id); trace.push(`${ts()} antwoord voor ${String(m.to_peer_id).slice(0, 4)}: ontvanger ${to ? `s${to.__id} ${to.destroyed ? 'dicht' : 'open'}` : 'onbekend'}, peers ${[...peers.entries()].map(([k, v]) => k.slice(0, 4) + '=s' + v.__id).join(',')}`); if (to) to.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: m.offer_id, answer: m.answer }))); }
        else if (m.offers && m.offers.length) offers.set(m.info_hash, { peer_id: m.peer_id, o: m.offers[0] });
        else if (offers.has(m.info_hash)) { const o = offers.get(m.info_hash); offers.delete(m.info_hash); /* een echte tracker geeft een aanbod aan één speler: twee die tegelijk aansluiten (overdragen) krijgen elk een eigen aanbod */ sock.write(frame(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: o.peer_id, offer_id: o.o.offer_id, offer: o.o.offer }))); }
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, seen, trace, close: () => { for (const s of sockets) { try { s.destroy(); } catch (e) { /* weg */ } } server.close(); } };
}
