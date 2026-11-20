// Samen spelen (#983): twee gasten die tegelijk met dezelfde kamercode aansluiten krijgen hetzelfde aanbod; de ene wint en de
// andere wacht tevergeefs. De gast doet dan zelf een tweede poging (met het nieuwe aanbod) in plaats van "Er kwam geen
// verbinding tot stand" te tonen. Nep-WebSocket als tracker, nep-RTCPeerConnection, de echte lobbyui en rtcroom.
//   node scripts/lobbyui_gast_poging_test.mjs
import assert from 'node:assert/strict';

const pcs = []; const sockets = []; let kanaalOpen = false;
globalThis.WebSocket = class {
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; sockets.push(this); setTimeout(() => { this.readyState = 1; if (this.onopen) this.onopen(); }, 0); }
  send(t) { this.sent.push(t); } close() { this.readyState = 3; }
};
globalThis.RTCPeerConnection = class {
  constructor() { this.closed = false; this.iceGatheringState = 'complete'; pcs.push(this); }
  async setRemoteDescription() {}
  async createAnswer() { return { type: 'answer', sdp: 'v=0 antwoord' }; }
  async setLocalDescription(d) { this.localDescription = d; if (kanaalOpen && this.ondatachannel) setTimeout(() => { const ch = { readyState: 'open', send() {}, close() {} }; this.ondatachannel({ channel: ch }); if (ch.onopen) ch.onopen(); }, 5); }
  addEventListener() {} removeEventListener() {}
  close() { this.closed = true; }
};
globalThis.window = globalThis;
globalThis.navigator ??= {};

const CONFIG = await import('../game/js/net/netconfig.js');
CONFIG.TIMEOUTS.connect = 400; CONFIG.TIMEOUTS.fallbackAfter = 60000;
const { mountLobby } = await import('../game/js/lobbyui.js');
const { encryptBlob, topicFor } = await import('../game/js/net/sigcrypto.js');

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, wat) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await tick(10); } throw new Error('time-out: ' + wat); };
const CODE = 'K3J9D8F2MN';
const root = { innerHTML: '', handlers: [], querySelector: (q) => (q === '.coop-input' ? { value: 'K3J9D-8F2MN' } : null), contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
root.click = (act) => root.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
const sessies = [];
const hooks = { startHost() {}, addGuest() {}, startClient: (tr) => { const s = { onstatus: null, status: 'ok', link: tr }; sessies.push(s); return s; }, setMax: (m) => m };
const lobby = mountLobby(root, hooks);
root.click('kies-gast'); root.click('koppel'); root.click('akkoord');

// een tracker-aanbod voor elke socket die de gast opent (de gast vraagt met numwant en geen offers)
const geefAanbod = async (van) => {
  const hash = (() => { for (const s of sockets.slice(van)) for (const t of s.sent) { try { const m = JSON.parse(t); if (m.info_hash) return m.info_hash; } catch (e) { /* geen json */ } } return null; })();
  assert.ok(hash, 'de gast vroeg de tracker om een aanbod');
  const blob = await encryptBlob(CODE, JSON.stringify({ type: 'offer', sdp: 'v=0 aanbod' }));
  for (const s of sockets.slice(van)) if (s.onmessage) s.onmessage({ data: JSON.stringify({ action: 'announce', info_hash: hash, offer_id: 'o' + van, peer_id: 'hostpeer', offer: { type: 'offer', sdp: blob } }) });
};
await until(() => sockets.length > 0 && sockets.some((s) => s.sent.length), 3000, 'eerste poging');
await geefAanbod(0); // het aanbod dat al aan een andere gast ging: geen kanaal
const na1 = sockets.length;
await until(() => sockets.length > na1 && sockets.slice(na1).some((s) => s.sent.length), 3000, 'een tweede poging na de time-out');
assert.equal(sessies.length, 0, 'nog niet verbonden');
assert.ok(!/geen verbinding tot stand/i.test(lobby.state().error || ''), 'de speler kreeg de foutmelding niet te zien');
kanaalOpen = true;
await geefAanbod(na1); // het nieuwe aanbod van de host
await until(() => sessies.length === 1, 3000, 'verbonden bij de tweede poging');
assert.ok(!lobby.state().error, 'geen foutmelding');
lobby.close();
console.log('lobbyui_gast_poging_test: ok');
process.exit(0);
