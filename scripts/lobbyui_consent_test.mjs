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
const { makeRoom, formatRoom } = await import('../game/js/net/sigcrypto.js');

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function fakeRoot() {
  const r = { innerHTML: '', handlers: [], querySelector: () => null, contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
  r.click = (act) => r.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  // het vinkje "Niet meer vragen" (#526): een change zoals de browser hem geeft
  r.check = (aan) => r.handlers.forEach((h) => h({ target: { checked: aan, classList: { contains: (c) => c === 'coop-consent-vink' } } }));
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
// (#526) één toestemming per sessie: de tweede route in dezelfde sessie komt niet meer op het scherm, maar er
// gaat ook niets naar buiten vóór die eerste toestemming. Dat is dezelfde eigenschap, in de nieuwe vorm.
await t('één toestemming per sessie: de tweede route vraagt niets meer en verstuurt nog steeds niets zonder akkoord (#526)', async () => {
  const w0 = log.ws.length, p0 = log.pc.length;
  const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); await tick();
  assert.equal(lobby.state().step, 'methode');
  assert.deepEqual([log.ws.length, log.pc.length], [w0, p0], 'nog niets verstuurd');
  root.click('route-kamer'); await tick();
  assert.equal(lobby.state().step, 'toestemming');
  assert.equal(lobby.state().consented, false);
  assert.deepEqual([log.ws.length, log.pc.length], [w0, p0], 'de eerste route wacht op het akkoord');
  root.click('akkoord'); await tick(60);
  const na = log.ws.length + log.pc.length;
  assert.ok(na > w0 + p0, 'na het akkoord begint de eerste route');
  // terug naar het beginscherm en een tweede route in dezelfde sessie: geen scherm en geen wachttijd
  lobby.event({ t: 'verbreek' });
  root.click('kies-host'); root.click('route-direct'); await tick(80);
  assert.notEqual(lobby.state().step, 'toestemming', 'de tweede route vraagt het niet nog een keer');
  lobby.close();
});
await t('"Niet meer vragen" (#526): het vinkje plus akkoord bewaart de keuze op dit apparaat, en alleen dan', async () => {
  const geheugen = new Map();
  globalThis.localStorage = { getItem: (k) => (geheugen.has(k) ? geheugen.get(k) : null), setItem: (k, v) => geheugen.set(k, String(v)), removeItem: (k) => geheugen.delete(k) };
  const { getSettings, setSetting } = await import('../game/js/settings.js');
  // zonder vinkje: het scherm komt één keer per sessie en er wordt niets bewaard
  const r1 = fakeRoot(); const l1 = mountLobby(r1, hooks());
  r1.click('kies-host'); r1.click('route-kamer'); assert.match(r1.innerHTML, /coop-consent-vink/);
  assert.match(r1.innerHTML, /Niet meer vragen/);
  r1.click('akkoord'); await tick(40);
  assert.equal(getSettings().multiplayerConsentRemembered, false, 'zonder vinkje niets bewaard');
  l1.close();
  // met vinkje: de keuze gaat naar de gewone instellingen (gde-settings), pas na het akkoord
  const r2 = fakeRoot(); const l2 = mountLobby(r2, hooks());
  r2.click('kies-host'); r2.click('route-kamer');
  assert.equal(getSettings().multiplayerConsentRemembered, false, 'het vinkje alleen bewaart nog niets');
  r2.check(true); assert.equal(l2.state().consentRemember, true);
  r2.click('akkoord'); await tick(40);
  assert.equal(getSettings().multiplayerConsentRemembered, true, 'na het akkoord bewaard');
  assert.match(geheugen.get('gde-settings') || '', /multiplayerConsentRemembered/);
  l2.close();
  // een volgende sessie op dit apparaat slaat het scherm over en gaat meteen door, zonder iets te versturen vooraf
  setSetting('multiplayerConsentRemembered', true);
  const w0 = log.ws.length, p0 = log.pc.length;
  const r3 = fakeRoot(); const l3 = mountLobby(r3, hooks());
  assert.equal(l3.state().consentSaved, true, 'de lobby leest de keuze uit de gewone instellingen');
  r3.click('kies-host'); r3.click('route-kamer'); await tick(60);
  assert.notEqual(l3.state().step, 'toestemming', 'geen scherm meer op dit apparaat');
  assert.ok(log.ws.length + log.pc.length > w0 + p0, 'en de route begint, want de speler ging hier al eens akkoord');
  l3.close();
  setSetting('multiplayerConsentRemembered', false); // de test laat geen keuze achter
  delete globalThis.localStorage;
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
await t('Verbinding testen: vóór "Test starten" geen verkeer; daarna een uitslag in gewone taal, een rapport zonder adressen en terug naar het scherm waar je was', async () => {
  const w0 = log.ws.length, p0 = log.pc.length;
  const root = fakeRoot(); const lobby = mountLobby(root, hooks(), { diagMs: 30 });
  root.click('kies-gast'); root.click('diag'); await tick();
  assert.equal(lobby.state().step, 'diag-vraag'); assert.match(root.innerHTML, /openbare servers/);
  assert.equal(log.ws.length, w0, 'geen WebSocket voor de toestemming'); assert.equal(log.pc.length, p0, 'geen RTCPeerConnection voor de toestemming');
  root.click('diag-terug'); assert.equal(lobby.state().step, 'gast-typt');
  root.click('diag'); root.click('diag-go'); await tick(150);
  assert.equal(lobby.state().step, 'diag-uit'); assert.ok(log.ws.length > w0, 'nu pas contact met de brokers');
  assert.match(root.innerHTML, /Servers voor de kamercode/); assert.match(root.innerHTML, /Foutrapport kopiëren/);
  let gekopieerd = '';
  Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText: async (t) => { gekopieerd = t; } }, configurable: true });
  root.click('rapport'); await tick();
  assert.match(gekopieerd, /verbindingsrapport/); assert.ok(!/d+.d+.d+.d+/.test(gekopieerd), 'geen IP-adressen in het rapport');
  root.click('diag-terug'); assert.equal(lobby.state().step, 'gast-typt');
  lobby.close();
});
await t('automatisch herstel (kamercode): de gast en de gastheer proberen het zelf opnieuw, zonder klik', async () => {
  const gast = mountLobby(fakeRoot(), hooks({ laatsteCode: formatRoom(makeRoom()) }), { start: 'verbroken', rol: 'gast', route: 'kamer', auto: { eerste: 15, tussen: 40, max: 3 } });
  const wGast0 = log.ws.length;
  assert.equal(gast.state().step, 'verbroken');
  await tick(120);
  assert.notEqual(gast.state().step, 'verbroken', 'de gast probeert zelf opnieuw te verbinden'); assert.ok(log.ws.length > wGast0, 'er is een nieuwe signalering gestart');
  gast.close();
  let nieuw = 0;
  const host = mountLobby(fakeRoot(), hooks({ startHost: () => { nieuw++; return { roster: { max: 4, spelers: [] }, vrijePlekken: true }; } }), { start: 'verbroken', rol: 'host', route: 'kamer', hub: { roster: { max: 4, spelers: [] }, vrijePlekken: true }, auto: { eerste: 15, tussen: 40, max: 3 } });
  await tick(120);
  assert.notEqual(host.state().step, 'verbroken', 'de gastheer zet zelf een nieuw aanbod klaar');
  host.close();
});
await t('automatisch herstel doet niets bij de IP-route (de code verandert dan) en stopt na sluiten', async () => {
  const gast = mountLobby(fakeRoot(), hooks({ laatsteCode: 'GDE2-127.0.0.1:41000-AAAAAAAA-0000' }), { start: 'verbroken', rol: 'gast', route: 'direct', auto: { eerste: 10, tussen: 20, max: 3 } });
  await tick(80); assert.equal(gast.state().step, 'verbroken'); gast.close();
  const g2 = mountLobby(fakeRoot(), hooks({ laatsteCode: formatRoom(makeRoom()) }), { start: 'verbroken', rol: 'gast', route: 'kamer', auto: { eerste: 60, tussen: 60, max: 3 } });
  g2.close(); await tick(120); assert.equal(g2.state().step, 'verbroken', 'na sluiten geen poging meer');
});
console.log(`lobbyui_consent_test: ${n}/${n} ok`);
process.exit(0); // timers van de signaler niet afwachten
