// Samen spelen (#95): WebRTC via kamercode (game/js/net/rtcroom.js) met nep-RTCPeerConnection
// en een nep-signaleerder. Geen echt netwerk, geen echte STUN of brokers.
import assert from 'node:assert/strict';
import { hostRoom, joinRoom } from '../game/js/net/rtcroom.js';
import { HostSession, ClientSession } from '../game/js/net/session.js';
import { decryptBlob } from '../game/js/net/sigcrypto.js';
import { ICE_SERVERS } from '../game/js/net/netconfig.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (f, ms = 2000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('time-out'); await tick(3); } };

// ----- nep-RTCPeerConnection: twee verbinden zodra de een het aanbod en de ander het antwoord kent
const reg = new Map(); let seq = 0;
function makePc(iceServers, log) {
  const id = 'pc' + ++seq;
  const pc = {
    id, iceServers, iceGatheringState: 'complete', ondatachannel: null, channel: null, peer: null, closed: false,
    addEventListener() {}, removeEventListener() {},
    createDataChannel(label, opts) { const ch = mkChannel(); ch.label = label; ch.opts = opts; pc.channel = ch; return ch; },
    async createOffer() { return { type: 'offer', sdp: `v=0 FAKE ${id} candidate srflx 84.1.2.3` }; },
    async createAnswer() { return { type: 'answer', sdp: `v=0 FAKE ${id} answer` }; },
    async setLocalDescription(d) { pc.localDescription = d; },
    async setRemoteDescription(d) {
      const other = /FAKE (pc\d+)/.exec(d.sdp)[1]; pc.peer = reg.get(other);
      if (d.type === 'answer') { // de host: verbinding is er
        pc.peer.peer = pc;
        const a = pc.channel, b = mkChannel(); b.peer = a; a.peer = b; pc.peer.channel = b;
        setTimeout(() => { if (pc.peer.ondatachannel) pc.peer.ondatachannel({ channel: b }); a.readyState = 'open'; b.readyState = 'open'; a.onopen && a.onopen(); b.onopen && b.onopen(); }, 5);
      }
    },
    close() { pc.closed = true; },
  };
  reg.set(id, pc); (log || []).push(pc);
  return pc;
}
function mkChannel() {
  const ch = { readyState: 'connecting', onmessage: null, onopen: null, onclose: null, peer: null, binaryType: '',
    send(b) { const to = ch.peer; setTimeout(() => to.onmessage && to.onmessage({ data: new Uint8Array(b).buffer }), 2); }, close() { ch.readyState = 'closed'; } };
  return ch;
}

// ----- nep-signaleerder: bewaart wat de host zet en geeft het aan de gast; legt vast wat "over de lijn" ging
function hub() {
  const h = { wire: [], offers: new Map(), answers: new Map() };
  h.signaler = () => ({
    host(topic, blob, onAnswer) { h.wire.push(blob); h.offers.set(topic, blob); h.answers.set(topic, onAnswer); },
    join(topic, onOffer) {
      const go = () => { const o = h.offers.get(topic); if (o) onOffer(o, (a) => { h.wire.push(a); h.answers.get(topic)(a); }); else setTimeout(go, 3); };
      go();
    },
    close() { this.closed = true; },
  });
  return h;
}
const TO = { connect: 600, gather: 50, broker: 100, fallbackAfter: 100 };

await t('host en gast verbinden via de kamercode; het kanaal is onbetrouwbaar en ongeordend', async () => {
  const h = hub(), pcs = [], states = [];
  const host = await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO, onstate: (s) => states.push('h:' + s) });
  const guest = await joinRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO, onstate: (s) => states.push('g:' + s) });
  const gt = await guest.opened;
  await waitFor(() => host.transport.isOpen() && gt.isOpen());
  assert.deepEqual(pcs[0].channel.opts, { ordered: false, maxRetransmits: 0 });
  assert.ok(states.includes('h:open') && states.includes('g:open'));
  const got = []; gt.onmessage = (b) => got.push([...b]);
  host.transport.send(Uint8Array.from([1, 2, 3]));
  await waitFor(() => got.length);
  assert.deepEqual(got[0], [1, 2, 3]);
});
await t('de uitnodiging wacht langer dan de verbindingstijd: de vriend heeft tijd om de code over te nemen', async () => {
  const h = hub(), pcs = [], states = [];
  const TW = { ...TO, connect: 150, wait: 1500 };
  const host = await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TW, onstate: (s, i) => states.push([s, i]) });
  await new Promise((r) => setTimeout(r, 400)); // langer dan connect: bij één timer was de uitnodiging nu verlopen
  assert.ok(!states.some((s) => s[0] === 'fout'), 'nog geen foutmelding terwijl de vriend de code overneemt');
  const guest = await joinRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TW });
  const gt = await guest.opened;
  await waitFor(() => host.transport.isOpen() && gt.isOpen());
  assert.ok(states.some((s) => s[0] === 'open'));
});
await t('de openbare STUN-servers uit de configuratie gaan naar WebRTC', async () => {
  const h = hub(), pcs = [];
  await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO });
  assert.deepEqual(pcs[0].iceServers, ICE_SERVERS);
  assert.ok(pcs[0].iceServers.every((s) => /^stun:/.test(s.urls)));
});
await t('over de lijn gaan alleen versleutelde blobs (geen SDP, geen kandidaten)', async () => {
  const h = hub(), pcs = [];
  const host = await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO });
  const guest = await joinRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO });
  await guest.opened;
  assert.equal(h.wire.length, 2);
  for (const w of h.wire) assert.ok(!/FAKE|candidate|srflx|84\.1\.2\.3/.test(w));
  assert.match(await decryptBlob('K3J9D8F2MN', h.wire[0]), /srflx/);
  host.cancel();
});
await t('een antwoord met een verkeerde kamercode of geknoeid bericht wordt genegeerd', async () => {
  const h = hub(), pcs = [], states = [];
  const sig = h.signaler();
  const host = await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: sig, timeouts: TO, onstate: (s) => states.push(s) });
  const topic = [...h.answers.keys()][0], answer = h.answers.get(topic);
  const { encryptBlob } = await import('../game/js/net/sigcrypto.js');
  await answer(await encryptBlob('ZZZZZZZZZZ', JSON.stringify({ type: 'answer', sdp: 'v=0 FAKE pc99' })));
  await answer('rommel');
  await answer(await encryptBlob('K3J9D8F2MN', JSON.stringify({ type: 'offer', sdp: 'v=0 FAKE pc99' })));
  await tick(30);
  assert.ok(!states.includes('verbinden'));
  host.cancel();
});
await t('geen verbinding binnen de tijd: Nederlandse foutmelding en alles wordt opgeruimd', async () => {
  const h = hub(), pcs = [], states = [];
  const sig = h.signaler();
  await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: sig, timeouts: { ...TO, connect: 40 }, onstate: (s, info) => states.push([s, info]) });
  await waitFor(() => states.some((s) => s[0] === 'fout'));
  assert.match(states.find((s) => s[0] === 'fout')[1], /geen verbinding/i);
  assert.equal(sig.closed, true); assert.equal(pcs[0].closed, true);
});
await t('de gast krijgt een melding bij een beschadigd aanbod', async () => {
  const states = [];
  const sig = { join(topic, onOffer) { onOffer('rommel', () => {}); }, host() {}, close() { this.closed = true; } };
  await joinRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice), signaler: sig, timeouts: TO, onstate: (s, i) => states.push([s, i]) });
  await waitFor(() => states.some((s) => s[0] === 'fout'));
  assert.match(states.find((s) => s[0] === 'fout')[1], /kamercode/);
});
await t('de spelsessie draait over het kanaal: handshake, invoer en toestand', async () => {
  const h = hub(), pcs = [];
  const host = await hostRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO });
  const guest = await joinRoom('K3J9D8F2MN', { pcFactory: (ice) => makePc(ice, pcs), signaler: h.signaler(), timeouts: TO });
  const gt = await guest.opened; await waitFor(() => host.transport.isOpen());
  const INFO = { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' };
  const inputs = [];
  const sim = { applyInput(s, i) { inputs.push(i); }, snapshot: () => ({ players: [{ slot: 0, x: 1, y: 2, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: 5, wanted: 0, clock: 1 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }), fullState: () => ({}) };
  const hs = new HostSession(host.transport, { info: INFO, seed: 1, sim }), cs = new ClientSession(gt, { info: INFO });
  cs.setInput(1, 0, 0, 0);
  for (let i = 0; i < 90; i++) { hs.tick(1 / 30); cs.tick(1 / 30); await tick(4); }
  assert.equal(cs.status, 'ok'); assert.ok(inputs.length > 5); assert.equal(cs.world().shared.money, 5);
});
console.log(`net_rtcroom_test: ${n}/${n} ok`);
