// Samen spelen (#983): de gastheer sluit een verbonden gast niet meer bij het klaarzetten van het volgende aanbod.
// Sinds #589 sluit rtcroom.cancel() ook een open kanaal; lobbyui.openRoom() riep cancel() aan op de vorige handle,
// ook als daar al een gast op zat. Gevolg: elke gast van de kamercode-route viel enkele seconden na het binnenkomen weg
// (ICE: disconnected, dan failed). Hier: nep-WebSocket als tracker, nep-RTCPeerConnection, de echte lobbyui en rtcroom.
//   node scripts/lobbyui_open_kanaal_test.mjs
import assert from 'node:assert/strict';

const pcs = []; const sockets = [];
globalThis.WebSocket = class {
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; sockets.push(this); setTimeout(() => { this.readyState = 1; if (this.onopen) this.onopen(); }, 0); }
  send(t) { this.sent.push(t); } close() { this.readyState = 3; }
};
globalThis.RTCPeerConnection = class {
  constructor(cfg) { this.cfg = cfg; this.closed = false; this.iceGatheringState = 'complete'; this.localDescription = null; pcs.push(this); }
  createDataChannel() { this.ch = { readyState: 'connecting', send() {}, close() { this.readyState = 'closed'; } }; return this.ch; }
  async createOffer() { return { type: 'offer', sdp: 'v=0 nep' }; }
  async setLocalDescription(d) { this.localDescription = d; }
  async setRemoteDescription() { setTimeout(() => { this.ch.readyState = 'open'; if (this.ch.onopen) this.ch.onopen(); }, 5); }
  addEventListener() {} removeEventListener() {}
  close() { this.closed = true; if (this.ch) this.ch.readyState = 'closed'; }
};
globalThis.window = globalThis;
globalThis.navigator ??= {};

const { mountLobby } = await import('../game/js/lobbyui.js');
const { parseRoom, encryptBlob } = await import('../game/js/net/sigcrypto.js');

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, wat) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await tick(10); } throw new Error('time-out: ' + wat); };
function fakeRoot() {
  const r = { innerHTML: '', handlers: [], querySelector: () => null, contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
  r.click = (act) => r.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
const guests = [];
const hooks = { startHost: () => ({ roster: { max: 4, spelers: [] }, vrijePlekken: true }), addGuest: (tr) => guests.push(tr), startClient() {}, setMax: (m) => m };

const root = fakeRoot(); const lobby = mountLobby(root, hooks);
root.click('kies-host'); root.click('route-kamer'); root.click('akkoord');
await until(() => lobby.state().code, 5000, 'de gastheer heeft een kamercode');
const room = parseRoom(lobby.state().code).room;
await until(() => pcs.length === 1 && guests.length === 1, 5000, 'het eerste aanbod staat klaar');
const eerste = pcs[0];

// een gast antwoordt via de tracker: de eerste peerconnection gaat open
const aanbod = sockets.flatMap((s) => s.sent.map((t) => { try { return JSON.parse(t); } catch (e) { return null; } })).find((m) => m && m.offers && m.offers.length);
assert.ok(aanbod, 'het aanbod ging naar de tracker');
const blob = await encryptBlob(room, JSON.stringify({ type: 'answer', sdp: 'v=0 antwoord' }));
for (const s of sockets) if (s.onmessage) s.onmessage({ data: JSON.stringify({ action: 'announce', info_hash: aanbod.info_hash, offer_id: aanbod.offers[0].offer_id, answer: { type: 'answer', sdp: blob } }) });
await until(() => eerste.ch.readyState === 'open', 3000, 'het kanaal van de eerste gast is open');
await until(() => pcs.length >= 2, 3000, 'er staat een nieuw aanbod klaar voor de volgende gast');
await tick(100);
assert.equal(eerste.closed, false, 'de verbonden gast blijft verbonden terwijl het volgende aanbod klaarstaat');
assert.equal(eerste.ch.readyState, 'open');
assert.equal(pcs[1].closed, false, 'het nieuwe aanbod wacht');
lobby.close();
console.log('lobbyui_open_kanaal_test: ok');
process.exit(0);
