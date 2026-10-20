// Samen spelen (#95): de uitnodiging maakt pas verbinding met openbare servers (STUN, brokers)
// nadat de speler akkoord is gegaan. Alle "netwerk" is hier een teller; er wordt niets echt
// verbonden. De WebSocket en RTCPeerConnection zijn dubbelgangers.
import assert from 'node:assert/strict';

const log = { ws: [], pc: [] };
globalThis.WebSocket = class { constructor(url) { log.ws.push(url); this.url = url; setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); } send() {} close() {} };
globalThis.RTCPeerConnection = class {
  constructor(cfg) { log.pc.push(cfg); this.localDescription = null; }
  createDataChannel() { return { close() {} }; }
  async createOffer() { return { type: 'offer', sdp: 'v=0' }; }
  async setLocalDescription() {}
  addEventListener() {} removeEventListener() {} close() {}
};
globalThis.window = globalThis;
globalThis.navigator ??= {};

const { mountLobby } = await import('../game/js/lobbyui.js');

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function fakeRoot() {
  const r = { innerHTML: '', handlers: [], querySelector: () => null, contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
  r.click = (act) => r.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
const hooks = (extra = {}) => ({ startHost: () => ({ roster: { max: 4, spelers: [] }, vrijePlekken: true }), addGuest() {}, startClient() {}, setMax: (m) => m, ...extra });

await t('geen WebSocket en geen RTCPeerConnection bij openen, kiezen en de route kiezen', async () => {
  const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); await tick();
  assert.equal(lobby.state().step, 'toestemming');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'niets verstuurd voor het akkoord');
  assert.match(root.innerHTML, /STUN|server/i, 'de toestemmingstekst noemt de externe servers');
  lobby.close();
});
await t('terug uit het toestemmingsscherm: nog steeds niets verstuurd', async () => {
  const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); root.click('terug'); await tick();
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0]);
  lobby.close();
});
await t('na akkoord gaat de signalering via de brokers en het STUN-pad van de configuratie', async () => {
  const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); root.click('akkoord'); await tick(60);
  assert.ok(log.ws.length > 0 || log.pc.length > 0, 'pas nu wordt er verbonden');
  for (const u of log.ws) assert.match(u, /^wss:\/\//, 'alleen versleutelde websockets');
  for (const c of log.pc) assert.ok(c.iceServers.every((s) => /^stun:/.test(s.urls)), 'alleen STUN, geen TURN-relay');
  lobby.close();
});
await t('wachtscherm van een gast: komt de verbinding van zelf terug, dan sluit het scherm (anders bleef het spel voor altijd op pauze)', async () => {
  const root = fakeRoot(); let hervat = 0;
  const session = { slot: 1, onstatus: null, onevent: null, welcome: null, rejected: null };
  const lobby = mountLobby(root, { resumed: () => { hervat++; }, disconnect() {} }, { start: 'verbroken', rol: 'gast', route: 'direct', session });
  assert.equal(typeof session.onstatus, 'function', 'het wachtscherm luistert naar de sessie');
  session.onstatus('lost'); assert.equal(lobby.state().step, 'verbroken'); assert.equal(hervat, 0);
  session.onstatus('ok'); assert.equal(hervat, 1, 'terug: het scherm sluit zich');
  lobby.close();
});
await t('Spel verlaten (IP-route): eerst afmelden bij de anderen, dan pas de poort en de verbinding sluiten', async () => {
  const order = [];
  const api = { host: async () => ({ ok: true, online: false, code: 'GDE2-127.0.0.1:41000-AAAAAAAA-0000', lanCode: '' }), join: async () => ({ ok: true }), send() {}, close() {}, setMax: (n) => n, stop: () => { order.push('poort dicht'); }, onEvent: () => () => {} };
  window.gdeDesktop = { coop: api };
  const root = fakeRoot(); const lobby = mountLobby(root, hooks({ disconnect: (a) => order.push('afmelden ' + a) }));
  root.click('kies-host'); root.click('route-direct'); root.click('akkoord'); await tick(60);
  root.click('verbreek'); await tick();
  delete window.gdeDesktop;
  assert.deepEqual(order, ['afmelden verbreek', 'poort dicht'], 'volgorde: ' + order.join(' > '));
  lobby.close();
});
console.log(`lobbyui_consent_test: ${n}/${n} ok`);
process.exit(0); // timers van de signaler niet afwachten
