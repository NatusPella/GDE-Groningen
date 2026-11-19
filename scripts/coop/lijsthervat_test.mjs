// Samen spelen (#983): een gast die via de openbare lijst binnenkwam en wegvalt, kan opnieuw verbinden.
// De lobby (game/js/lobbyui.js) draait met een echte hub (net/hub.js) en een echte ClientSession over een
// geheugentransport (net/memtransport.js); alleen de brokers zijn nep. De kamer en het transport komen uit de
// testnaden opts.haalKamer en opts.joinRoom. Gecontroleerd: binnenkomen via de lijst, verbreken, hervatten via de
// bewaarde rij, en dat token, slot en sessie-id gelijk blijven; een mislukte poging, annuleren, een andere host
// en dat er niets in de opslag komt.
//   node scripts/coop/lijsthervat_test.mjs
import assert from 'node:assert/strict';

const sockets = [];
let aanbod = null;
globalThis.WebSocket = class {
  constructor(url) { this.url = url; this.sent = []; this.closed = false; this.readyState = 1; sockets.push(this); setTimeout(() => this.onopen && this.onopen(), 0); }
  send(d) {
    this.sent.push(typeof d === 'string' ? d : Buffer.from(d).toString('latin1'));
    if (typeof d === 'string' && aanbod && this.url.startsWith('wss://tracker')) {
      let m; try { m = JSON.parse(d); } catch (e) { return; }
      if (m.offers && m.offers.length === 0) setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: 'ander', offer_id: 'o' + Math.random(), offer: { type: 'offer', sdp: aanbod() } }) }), 0);
    }
  }
  close() { this.closed = true; this.readyState = 3; }
};
globalThis.RTCPeerConnection = class {
  constructor() { this.iceGatheringState = 'complete'; this.localDescription = null; }
  createDataChannel() { return { close() {} }; }
  async createOffer() { return { type: 'offer', sdp: 'v=0 nep' }; }
  async setLocalDescription(d) { this.localDescription = d; }
  addEventListener() {} removeEventListener() {} close() {}
};
globalThis.window = globalThis;
globalThis.navigator ??= {};
const geheugen = new Map();
globalThis.localStorage = { getItem: (k) => (geheugen.has(k) ? geheugen.get(k) : null), setItem: (k, v) => geheugen.set(k, String(v)), removeItem: (k) => geheugen.delete(k) }; // nooit de echte opslag

const { mountLobby } = await import('../../game/js/lobbyui.js');
const { createLink, makeRng } = await import('../../game/js/net/memtransport.js');
const { HostHub } = await import('../../game/js/net/hub.js');
const { ClientSession } = await import('../../game/js/net/session.js');
const { codeer } = await import('../../game/js/net/serverlijst.js');
const { bronVan } = await import('../../game/js/net/joingate.js');
const { PROTO } = await import('../../game/js/net/protocol.js');
const { VERSION } = await import('../../game/js/version.js');

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const INFO = { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' };
const SIM = { applyInput() {}, snapshot: () => ({ players: [], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }), fullState: () => ({}) };

function fakeRoot() {
  const r = { innerHTML: '', listeners: {}, value: '' };
  r.querySelector = (q) => (q === '.coop-input' ? { value: r.value } : null);
  r.contains = () => true;
  r.addEventListener = (ev, f) => { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); };
  r.click = (act) => (r.listeners.click || []).forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}

// één avond: een echte hub (openbaar), een register van de verbindingen en de testnaden van de lobby
async function avond({ naam = 'Zomeravond' } = {}) {
  const links = [], clients = [];
  const hub = new HostHub({ info: INFO, seed: 1, sim: SIM, max: 4, caps: ['scene'], rand: makeRng(5) });
  const hostKey = await hub.ensureHostKey();
  assert.equal(hub.zetOpenbaar(true, naam).ok, true);
  const o = { hub, hostKey, links, clients, gevraagd: [], joins: [], falen: 0, andereHub: null, vertraging: 0 };
  o.step = (secs, dt = 1 / 30) => { for (let i = 0; i < secs / dt; i++) { hub.tick(dt); if (o.andereHub) o.andereHub.tick(dt); for (const c of clients) c.tick(dt); for (const l of links) l.advance(dt); } };
  o.opts = {
    haalKamer: async (id, sleutel) => {
      o.gevraagd.push([id, sleutel]);
      if (o.vertraging) await tick(o.vertraging);
      if (o.falen > 0) { o.falen--; throw new Error('geen antwoord'); }
      return 'ABCDEFGHJK';
    },
    joinRoom: async (kamer) => {
      o.joins.push(kamer);
      const l = createLink({ latency: 0.03, seed: 7 + links.length });
      (o.andereHub || hub).accept(l.a); links.push(l);
      return { opened: Promise.resolve(l.b), cancel() {} };
    },
  };
  o.hooks = () => ({
    startHost: () => hub, addGuest() {}, setMax: (m) => m,
    startClient: (tr) => { const c = new ClientSession(tr, { info: { ...INFO, char: undefined }, caps: ['scene'] }, makeRng(3)); clients.push(c); return c; },
  });
  return o;
}
// een gast komt via de lijst binnen, zoals in het spel (lobbyui.js: lijst -> sluit -> guestStart)
async function komBinnen(o) {
  aanbod = () => codeer({ naam: o.hub.openbaar.naam, spelers: 1, max: 4, versie: VERSION, proto: PROTO, id: o.hub.id, hostKey: o.hostKey, nu: Date.now() });
  const root = fakeRoot();
  const lobby = mountLobby(root, o.hooks(), { lijstMs: 30, ...o.opts });
  root.click('lijst'); root.click('lijst-go'); await tick(200);
  assert.equal(lobby.state().step, 'lijst'); assert.equal(lobby.state().lijst.length, 1);
  root.click('sluit-0'); await tick(30);
  for (let i = 0; i < 20 && !(o.clients[0] && o.clients[0].status === 'ok'); i++) { o.step(0.5); await tick(5); }
  aanbod = null;
  assert.equal(o.clients.length, 1); assert.equal(o.clients[0].status, 'ok', 'de gast is binnen');
  lobby.close();
  return o.clients[0];
}
// het wachtscherm in het spel (coophold.js): een lobby op de lopende sessie
function wachtscherm(o, sess, extra = {}) {
  const root = fakeRoot(); const log = { resumed: 0, disconnect: [] };
  const lobby = mountLobby(root, { laatsteCode: '', resumed: () => { log.resumed++; }, disconnect: (a) => log.disconnect.push(a) }, {
    start: 'verbroken', rol: 'gast', route: 'kamer', session: sess, auto: { eerste: 40, tussen: 60, max: 4 }, ...o.opts, ...extra,
  });
  return { root, lobby, log };
}
const GEEN_AUTO = { auto: { eerste: 100000, tussen: 100000, max: 0 } };
const wachtOp = async (o, f, ms = 3000) => { const tot = Date.now() + ms; while (Date.now() < tot && !f()) { o.step(0.2); await tick(5); } return f(); };

await t('binnenkomen via de lijst bewaart de bron (id, hostsleutel, naam) alleen in het geheugen', async () => {
  const o = await avond(); const sess = await komBinnen(o);
  assert.deepEqual(o.gevraagd[0], [o.hub.id, o.hostKey], 'de kamer is gevraagd met het id en de hostsleutel van de rij');
  assert.deepEqual(bronVan(sess), { id: o.hub.id, hostKey: o.hostKey, naam: 'Zomeravond' });
  assert.ok(![...geheugen.values()].some((v) => v.includes(o.hostKey) || v.includes(o.hub.id)), 'niets van de bron in de opslag');
  assert.equal(bronVan({}), null);
});

await t('wegvallen en hervatten via de lijst: zelfde token, plek en sessie-id', async () => {
  const o = await avond(); const sess = await komBinnen(o);
  const token = sess.token, slot = sess.slot, sessie = { ...sess.sessie };
  assert.ok(token && slot >= 1 && sessie.id === o.hub.id);
  o.links[0].cut(); o.step(7);
  assert.equal(sess.status, 'lost', 'de gast is weggevallen');
  const w = wachtscherm(o, sess);
  assert.equal(w.lobby.state().step, 'verbroken'); assert.equal(w.lobby.state().bron, true);
  assert.match(w.root.innerHTML, /Opnieuw verbinden/); assert.doesNotMatch(w.root.innerHTML, /Voer de code opnieuw in/);
  const kamers0 = o.joins.length;
  assert.ok(await wachtOp(o, () => sess.status === 'ok'), 'de automatische poging verbindt via de lijst opnieuw');
  assert.equal(o.joins.length, kamers0 + 1, 'één nieuw transport');
  assert.deepEqual(o.gevraagd[1], [o.hub.id, o.hostKey], 'de bewaarde bron wordt gebruikt, geen code');
  assert.equal(sess.token, token, 'zelfde token'); assert.equal(sess.slot, slot, 'zelfde plek'); assert.deepEqual(sess.sessie, sessie, 'zelfde sessie-id');
  assert.equal(o.hub.roster.spelers.filter((s) => s.slot >= 1).length, 1, 'geen tweede speler bij de host');
  await tick(20);
  assert.ok(w.log.resumed > 0, 'het wachtscherm sluit'); assert.deepEqual(w.log.disconnect, []);
  w.lobby.close();
});

await t('een mislukte poging brengt het scherm terug naar verbroken; Opnieuw verbinden probeert het nog eens', async () => {
  const o = await avond(); const sess = await komBinnen(o); const slot = sess.slot, token = sess.token;
  o.links[0].cut(); o.step(7); assert.equal(sess.status, 'lost');
  o.falen = 1; // de eerste poging krijgt geen antwoord van de host
  const w = wachtscherm(o, sess, GEEN_AUTO);
  w.root.click('hervat'); await tick(30);
  assert.equal(w.lobby.state().step, 'verbroken', 'terug voor een volgende poging');
  assert.match(w.root.innerHTML, /Opnieuw verbinden/); assert.match(w.root.innerHTML, /geen antwoord/);
  w.root.click('hervat');
  assert.ok(await wachtOp(o, () => sess.status === 'ok'));
  assert.equal(sess.token, token); assert.equal(sess.slot, slot);
  w.lobby.close();
});

await t('Stoppen tijdens het hervatten: een laat antwoord bouwt geen verbinding meer', async () => {
  const o = await avond(); const sess = await komBinnen(o);
  o.links[0].cut(); o.step(7);
  const w = wachtscherm(o, sess, GEEN_AUTO);
  o.vertraging = 60; const j0 = o.joins.length;
  w.root.click('hervat'); await tick(5);
  assert.equal(w.lobby.state().step, 'verbinden');
  w.root.click('verbreek'); await tick(150);
  assert.equal(o.joins.length, j0, 'geen nieuw transport');
  assert.deepEqual(w.log.disconnect, ['verbreek']);
  w.lobby.close();
});

await t('een kamer van een andere host (ander sessie-id) wordt losgelaten', async () => {
  const o = await avond(); const sess = await komBinnen(o);
  o.links[0].cut(); o.step(7);
  o.andereHub = new HostHub({ info: INFO, seed: 1, sim: SIM, max: 4, caps: ['scene'], rand: makeRng(99) }); // beantwoordt het verzoek met zijn eigen kamer
  assert.notEqual(o.andereHub.id, o.hub.id);
  const w = wachtscherm(o, sess, GEEN_AUTO);
  w.root.click('hervat');
  for (let i = 0; i < 60 && !w.log.disconnect.length; i++) { o.step(0.2); await tick(5); }
  assert.deepEqual(w.log.disconnect, ['verbreek'], 'de verbinding is verbroken');
  assert.match(w.root.innerHTML, /niet bij de sessie/);
  w.lobby.close();
});

console.log(`lijsthervat_test: ${n} onderdelen groen`);
process.exit(0);
