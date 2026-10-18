// Coöp fase 4 (#95): netcode-protocol met een in-memory transport met ruis
// (vertraging, verlies, omwisseling): handshake en betrouwbare gebeurtenissen.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import { Reliable, checkHandshake, seqDiff, seqNewer, REASON_TEXT } from '../game/js/net/protocol.js';
import { encodeJson, decodeJson, T } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = { game: 'gde', proto: 1, version: '0.50.0', tiles: 'abc', story: 'oud' };

t('volgnummers met omslag', () => {
  assert.equal(seqNewer(1, 0xffff), true); assert.equal(seqNewer(0xffff, 1), false);
  assert.equal(seqDiff(5, 3), 2); assert.equal(seqNewer(7, 7), false);
});
t('handshake: elk verschil krijgt een reden en een Nederlandse tekst', () => {
  assert.deepEqual(checkHandshake(INFO, { ...INFO }), { ok: true, reason: null });
  for (const [k, reason] of [['game', 'spel'], ['proto', 'protocol'], ['version', 'versie'], ['tiles', 'tegels'], ['story', 'verhaal']]) {
    const r = checkHandshake(INFO, { ...INFO, [k]: 'x' });
    assert.equal(r.ok, false); assert.equal(r.reason, reason); assert.ok(REASON_TEXT[reason].length > 5);
  }
  assert.equal(checkHandshake(INFO, null).ok, false);
});

// twee Reliable-uiteinden over een lossy link
function run({ loss, jitter, seed, count }) {
  const link = createLink({ latency: 0.04, jitter, loss, seed });
  const A = new Reliable(), B = new Reliable();
  const got = [];
  link.b.onmessage = (bytes) => {
    const m = decodeJson(bytes);
    if (m && m.type === T.EVENT) for (const b of B.receive(m, (x) => link.b.send(x))) got.push(b);
  };
  link.a.onmessage = (bytes) => {
    // ACK heeft geen JSON-body: lees ack-veld uit de header
    const ack = (bytes[9] << 8) | bytes[10];
    if (bytes[2] === T.ACK) A.onAck(ack);
  };
  let now = 0, sent = 0;
  for (let i = 0; i < 4000 && got.length < count; i++) {
    now += 0.01;
    if (sent < count && i % 3 === 0 && A.send({ n: sent }, now, (x) => link.a.send(x))) sent++;
    A.tick(now, (x) => link.a.send(x));
    link.advance(0.01);
  }
  return got.map((g) => g.n);
}
t('betrouwbaar zonder verlies: in volgorde', () => {
  assert.deepEqual(run({ loss: 0, jitter: 0, seed: 1, count: 20 }), [...Array(20).keys()]);
});
t('betrouwbaar met 30% verlies en jitter: alles, in volgorde, zonder dubbelen', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    assert.deepEqual(run({ loss: 0.3, jitter: 0.08, seed, count: 40 }), [...Array(40).keys()], `seed ${seed}`);
  }
});
t('wachtrij loopt vol als de ander niets bevestigt', () => {
  const r = new Reliable({ maxPending: 3 }); const out = [];
  assert.equal(r.send({}, 0, (x) => out.push(x)), true); r.send({}, 0, () => {}); r.send({}, 0, () => {});
  assert.equal(r.send({}, 0, () => {}), false);
});
t('dubbele aflevering wordt genegeerd maar wel bevestigd', () => {
  const r = new Reliable(); const acks = [];
  const msg = decodeJson(encodeJson(T.EVENT, 1, 0, 0, { a: 1 }));
  assert.equal(r.receive(msg, (x) => acks.push(x)).length, 1);
  assert.equal(r.receive(msg, (x) => acks.push(x)).length, 0);
  assert.equal(acks.length, 2);
});
console.log(`net_protocol_test: ${n}/${n} ok`);
