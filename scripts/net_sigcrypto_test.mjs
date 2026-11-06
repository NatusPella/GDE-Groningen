// Samen spelen (#95): signalering versleutelen met de kamercode (game/js/net/sigcrypto.js).
import assert from 'node:assert/strict';
import * as C from '../game/js/net/sigcrypto.js';
import { makeRng } from '../game/js/net/memtransport.js';
import { STUN_SERVERS, TRACKERS, MQTT_BROKERS, PEERJS, ICE_SERVERS } from '../game/js/net/netconfig.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };

await t('kamercode: 10 tekens, leesbaar alfabet, formaat XXXXX-XXXXX', () => {
  const r = C.makeRoom(makeRng(3));
  assert.match(r, /^[A-HJ-NP-Z2-9]{10}$/);
  assert.match(C.formatRoom(r), /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  assert.match(C.makeRoom(), /^[A-HJ-NP-Z2-9]{10}$/);
  assert.notEqual(C.makeRoom(), C.makeRoom());
});
await t('parseRoom: streepjes, spaties en kleine letters mogen; fouten in het Nederlands', () => {
  assert.deepEqual(C.parseRoom(' k3j9d-8f2mn '), { ok: true, room: 'K3J9D8F2MN' });
  assert.equal(C.parseRoom('k3j9d8f2mn').ok, true);
  assert.match(C.parseRoom('').reason, /niets/);
  assert.match(C.parseRoom('KORT').reason, /10 tekens/);
  assert.match(C.parseRoom('K3J9D8F2M!').reason, /kamercode/);
});
await t('versleutelen en ontsleutelen met dezelfde code', async () => {
  const blob = await C.encryptBlob('K3J9D8F2MN', JSON.stringify({ type: 'offer', sdp: 'v=0\r\n...' }));
  assert.match(blob, /^[A-Za-z0-9_-]+$/);
  assert.equal(JSON.parse(await C.decryptBlob('K3J9D8F2MN', blob)).type, 'offer');
});
await t('de blob verraadt niets: geen leesbare SDP, elke keer anders', async () => {
  const sdp = 'v=0 a=candidate:1 1 udp 2113937151 192.168.1.5 54321 typ host';
  const a = await C.encryptBlob('K3J9D8F2MN', sdp), b = await C.encryptBlob('K3J9D8F2MN', sdp);
  assert.notEqual(a, b);
  assert.ok(!a.includes('192') && !a.includes('candidate'));
});
await t('verkeerde code, geknoeide of rommelige blob geeft null', async () => {
  const blob = await C.encryptBlob('K3J9D8F2MN', 'geheim');
  assert.equal(await C.decryptBlob('AAAAAAAAAA', blob), null);
  const bad = blob.slice(0, -2) + (blob.endsWith('A') ? 'BB' : 'AA');
  assert.equal(await C.decryptBlob('K3J9D8F2MN', bad), null);
  assert.equal(await C.decryptBlob('K3J9D8F2MN', 'kort'), null);
  assert.equal(await C.decryptBlob('K3J9D8F2MN', '!!!'), null);
});
await t('te grote blobs worden vóór atob/decryptie afgewezen (#589)', async () => {
  const groot = 'A'.repeat(C.MAX_BLOB_CHARS + 1);
  const t0 = Date.now();
  assert.equal(await C.decryptBlob('K3J9D8F2MN', groot), null);
  assert.equal(await C.ontsleutelVoor(null, groot, 'nonce'), null);
  await assert.rejects(() => C.sleutelVanTekst(groot));
  assert.ok(Date.now() - t0 < 1000, 'geen grote base64 gedecodeerd');
});
await t('onderwerp: deterministisch per kamer, 20 bytes hex, onthult de code niet', async () => {
  const a = await C.topicFor('K3J9D8F2MN'), b = await C.topicFor('K3J9D8F2MN'), c = await C.topicFor('ZZZZZZZZZZ');
  assert.equal(a, b); assert.notEqual(a, c); assert.match(a, /^[0-9a-f]{40}$/);
  assert.ok(!a.toLowerCase().includes('k3j9d'));
  assert.equal((await C.topicFor('K3J9D8F2MN', 8)).length, 16);
});
await t('configuratie: meerdere vaste openbare opties, in één bestand', () => {
  assert.ok(STUN_SERVERS.length >= 3 && STUN_SERVERS.every((s) => /^stun:/.test(s)));
  assert.ok(TRACKERS.length >= 2 && TRACKERS.every((s) => /^wss:\/\//.test(s)));
  assert.ok(MQTT_BROKERS.length >= 2 && MQTT_BROKERS.every((s) => /^wss:\/\//.test(s)));
  assert.equal(PEERJS.secure, true); assert.equal(ICE_SERVERS.length, STUN_SERVERS.length);
});
console.log(`net_sigcrypto_test: ${n}/${n} ok`);
