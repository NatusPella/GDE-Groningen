// Samen spelen (#438): de lobby voor openbare sessies (game/js/lobbyui.js) met een nep-WebSocket en een nep-RTCPeerConnection.
// Er wordt niets echt verbonden. Controleert vooral: geen verbinding vóór de toestemming, standaard privé, en wat er over de lijn gaat.
import assert from 'node:assert/strict';

const sockets = [];
let aanbod = null; // de aankondiging die de nepsracker aan een luisteraar teruggeeft
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

const { mountLobby } = await import('../game/js/lobbyui.js');
const { codeer, schoonNaam } = await import('../game/js/net/serverlijst.js');
const { PROTO } = await import('../game/js/net/protocol.js');
const { VERSION } = await import('../game/js/version.js');

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
function fakeRoot() {
  const r = { innerHTML: '', handlers: [], value: '', querySelector: (q) => (q === '.coop-input' ? { value: r.value } : null), contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
  r.click = (act) => r.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
// De hub van een sessie (#450): hij houdt de naam, een vast id en het echte aantal spelers vast; de lobby plaatst de regel.
const hub = (naam = null) => {
  const h = { id: 'hubbhubhub', openbaar: null, opOpenbaar: null, roster: { max: 4, spelers: [{ slot: 0, verbinding: 'ok' }] }, vrijePlekken: true };
  h.publiek = () => (h.openbaar ? { id: h.id, naam: h.openbaar, spelers: Math.max(1, h.roster.spelers.filter((s) => s.verbinding !== 'lost').length), max: h.roster.max } : null);
  h.zetOpenbaar = (aan, n) => {
    if (!aan) { const was = !!h.openbaar; h.openbaar = null; if (was && h.opOpenbaar) h.opOpenbaar(null); return { ok: true, openbaar: false }; }
    const r = schoonNaam(n); if (!r.ok) return { ok: false, reason: r.reason };
    h.openbaar = r.naam; if (h.opOpenbaar) h.opOpenbaar(h.publiek());
    return { ok: true, openbaar: true, naam: r.naam, id: h.id };
  };
  if (naam) h.openbaar = naam;
  return h;
};
const hooks = (extra = {}) => ({ startHost: () => hub(), addGuest() {}, startClient() {}, setMax: (m) => m, ...extra });
const start = () => sockets.length;
const nieuw = (van) => sockets.slice(van);
const alleVerzonden = (van) => nieuw(van).flatMap((s) => s.sent).join('\n');
const ROOM = 'K3J9D8F2MN';

await t('de lijst bekijken: niets verbonden bij openen, kiezen en annuleren; pas na akkoord, en dan alleen luisteren (niets plaatsen)', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  assert.match(root.innerHTML, /Openbare sessies/);
  root.click('lijst'); await tick();
  assert.equal(lobby.state().step, 'lijst-vraag'); assert.equal(start(), s0, 'geen verbinding voor de toestemming');
  assert.match(root.innerHTML, /openbare servers/);
  root.click('lijst-terug'); await tick(); assert.equal(lobby.state().step, 'start'); assert.equal(start(), s0);
  root.click('lijst'); root.click('lijst-go'); await tick(60);
  assert.equal(lobby.state().step, 'lijst'); assert.ok(start() > s0, 'nu pas verbonden');
  for (const s of nieuw(s0)) assert.match(s.url, /^wss:\/\//);
  assert.ok(nieuw(s0).every((s) => s.sent.every((d) => typeof d !== 'string' || !/"v":1/.test(d))), 'een luisteraar plaatst niets');
  const mqtt = nieuw(s0).filter((s) => !s.url.includes('tracker'));
  assert.ok(mqtt.every((s) => s.sent.every((d) => (d.charCodeAt(0) >> 4) !== 3)), 'geen MQTT-publicatie door een luisteraar');
  root.click('lijst-terug'); await tick();
  assert.ok(nieuw(s0).every((s) => s.closed), 'terug uit de lijst sluit alle verbindingen');
  lobby.close();
});
await t('de lijst toont sessies, markeert een andere versie, verbergt een gemelde en laat je aansluiten met de gewone toestemming', async () => {
  geheugen.clear();
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks(), { lijstMs: 30 });
  const nu = () => Date.now();
  const lijst = [
    { naam: 'Zomeravond', room: ROOM, id: 'aaaaaaaaaa', versie: VERSION, proto: PROTO },
    { naam: 'Oud spel', room: 'A2B3C4D5E6', id: 'bbbbbbbbbb', versie: '0.1.0', proto: PROTO },
  ];
  let i = 0;
  aanbod = () => { const e = lijst[i++ % lijst.length]; return codeer({ naam: e.naam, spelers: 2, max: 4, versie: e.versie, proto: e.proto, room: e.room, id: e.id, nu: nu() }); };
  root.click('lijst'); root.click('lijst-go'); await tick(200);
  assert.equal(lobby.state().step, 'lijst');
  const l = lobby.state().lijst; assert.equal(l.length, 2, JSON.stringify(l));
  assert.match(root.innerHTML, /Zomeravond · 2 van 4 spelers/); assert.match(root.innerHTML, /Andere versie: niet aan te sluiten/); assert.match(root.innerHTML, /Melden/);
  const kan = l.findIndex((x) => x.kan), anders = l.findIndex((x) => x.anders);
  root.click('sluit-' + anders); assert.equal(lobby.state().step, 'lijst', 'een andere versie sluit niet aan'); assert.match(root.innerHTML, /andere versie/);
  const naamVan = l[kan].naam;
  // melden: verdwijnt en blijft weg (ook bij de volgende aankondiging), en wordt onthouden
  root.click('meld-' + kan); await tick(120);
  assert.ok(!lobby.state().lijst.some((x) => x.naam === naamVan), 'gemeld: weg uit de lijst');
  assert.deepEqual(JSON.parse(geheugen.get('gde-serverlijst-verborgen')), ['aaaaaaaaaa']);
  aanbod = null; root.click('lijst-terug'); await tick();
  // opnieuw openen: de gemelde blijft verborgen
  aanbod = () => codeer({ naam: 'Zomeravond', spelers: 2, max: 4, versie: VERSION, proto: PROTO, room: ROOM, id: 'aaaaaaaaaa', nu: nu() });
  root.click('lijst'); root.click('lijst-go'); await tick(200);
  assert.equal(lobby.state().lijst.length, 0, 'onthouden dat deze gemeld is');
  aanbod = () => codeer({ naam: 'Tweede spel', spelers: 1, max: 4, versie: VERSION, proto: PROTO, room: 'D2B3C4D5E6', id: 'cccccccccc', nu: nu() });
  root.click('lijst-terug'); root.click('lijst'); root.click('lijst-go'); await tick(200); assert.equal(lobby.state().lijst.length, 1);
  const s1 = start(); root.click('sluit-0');
  assert.equal(lobby.state().step, 'toestemming'); assert.equal(lobby.state().invoer.room, 'D2B3C4D5E6'); assert.equal(lobby.state().rol, 'gast');
  assert.match(root.innerHTML, /Akkoord en verbinden/); assert.equal(start(), s1, 'aansluiten vraagt eerst de gewone toestemming');
  assert.ok(nieuw(s0).every((s) => s.closed), 'de lijst luistert niet meer');
  aanbod = null; lobby.close();
});
await t('geen enkele broker bereikbaar: de lijst zegt dat in gewone taal', async () => {
  const root = fakeRoot();
  const echt = globalThis.WebSocket;
  globalThis.WebSocket = class { constructor(url) { this.url = url; setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); } send() {} close() {} };
  const lobby = mountLobby(root, hooks(), { lijstMs: 30 });
  root.click('lijst'); root.click('lijst-go'); await tick(250);
  globalThis.WebSocket = echt;
  assert.match(root.innerHTML, /geen verbinding met de openbare servers/);
  lobby.close();
});
await t('host: standaard privé; de knop vraagt eerst toestemming; er wordt niets van de lijst geplaatst voor het akkoord', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); root.click('akkoord'); await tick(80);
  assert.equal(lobby.state().step, 'host-wacht'); assert.equal(lobby.state().openbaar, false);
  assert.match(root.innerHTML, /Maak deze sessie openbaar/);
  assert.ok(!/gde\/lijst/.test(alleVerzonden(s0)), 'een privé sessie plaatst niets op de lijst');
  root.click('openbaar'); await tick(40);
  assert.equal(lobby.state().step, 'openbaar-vraag'); assert.match(root.innerHTML, /IP-adres/); assert.match(root.innerHTML, /weer privé maken/);
  assert.ok(!/gde\/lijst/.test(alleVerzonden(s0)) && !alleVerzonden(s0).includes('Zomeravond'), 'ook in de vraag nog niets');
  root.click('openbaar-terug'); await tick(); assert.equal(lobby.state().openbaar, false);
  lobby.close();
});
await t('host: een verboden naam wordt geweigerd en er gaat niets over de lijn', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); root.click('akkoord'); await tick(80);
  root.click('openbaar'); root.value = 'Kanker'; root.click('openbaar-ja'); await tick(80);
  assert.equal(lobby.state().openbaar, false); assert.match(root.innerHTML, /kan niet/);
  assert.ok(!alleVerzonden(s0).includes('Kanker'));
  lobby.close();
});
await t('host: akkoord zet de sessie openbaar (naam, spelers, versie, kamercode, geen IP-adres); weer privé stopt het en geeft een nieuwe kamercode', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-host'); root.click('route-kamer'); root.click('akkoord'); await tick(80);
  const codeVoor = lobby.state().code;
  root.click('openbaar'); root.value = 'Zomeravond'; root.click('openbaar-ja'); await tick(100);
  assert.equal(lobby.state().openbaar, true); assert.equal(lobby.state().step, 'host-wacht');
  assert.match(root.innerHTML, /Sessie weer privé maken/); assert.match(root.innerHTML, /staat openbaar in de lijst/);
  const lijstSockets = nieuw(s0).filter((s) => s.sent.some((d) => d.includes('Zomeravond')));
  assert.ok(lijstSockets.length >= 1, 'de aankondiging is geplaatst');
  const tekst = lijstSockets.flatMap((s) => s.sent).filter((d) => d.includes('Zomeravond')).join('\n');
  assert.ok(tekst.includes(codeVoor.replace('-', '')) , 'met de kamercode');
  assert.ok(tekst.includes(VERSION), 'met de versie');
  assert.ok(tekst.includes('"i":"hubbhubhub"') || tekst.includes('hubbhubhub'), 'met het vaste id van de sessie (#450)');
  assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(tekst.replace(new RegExp(VERSION.replace(/\./g, '\\.'), 'g'), '')), 'geen IP-adres');
  const s1 = start();
  root.click('privaat'); await tick(150);
  assert.equal(lobby.state().openbaar, false); assert.match(root.innerHTML, /Maak deze sessie openbaar/);
  assert.ok(lijstSockets.every((s) => s.closed), 'de aankondiging stopt');
  assert.notEqual(lobby.state().code, codeVoor, 'een nieuwe kamercode: de openbare werkt niet meer');
  assert.ok(start() > s1, 'er staat een nieuw aanbod klaar onder de nieuwe code');
  assert.ok(!nieuw(s1).some((s) => s.sent.some((d) => d.includes('Zomeravond'))), 'daarna geen aankondiging meer');
  lobby.close();
});
await t('host: stoppen of het scherm sluiten haalt de sessie meteen uit de lijst', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks({ disconnect() {} }));
  root.click('kies-host'); root.click('route-kamer'); root.click('akkoord'); await tick(80);
  root.click('openbaar'); root.value = 'Zomeravond'; root.click('openbaar-ja'); await tick(100);
  const ann = nieuw(s0).filter((s) => s.sent.some((d) => d.includes('Zomeravond')));
  assert.ok(ann.length >= 1);
  lobby.close();
  assert.ok(ann.every((s) => s.closed), 'sluiten stopt de aankondiging');
  const root2 = fakeRoot(); const l2 = mountLobby(root2, hooks({ disconnect() {} }));
  root2.click('kies-host'); root2.click('route-kamer'); root2.click('akkoord'); await tick(80);
  root2.click('openbaar'); root2.value = 'Weer een naam'; root2.click('openbaar-ja'); await tick(100);
  const ann2 = nieuw(s0).filter((s) => s.sent.some((d) => d.includes('Weer een naam')));
  root2.click('terug'); await tick(20);
  assert.equal(l2.state().openbaar, false); assert.ok(ann2.every((s) => s.closed));
  l2.close();
});
await t('een lopende openbare sessie (#450): het paneel opnieuw openen plaatst dezelfde regel, met hetzelfde id en dezelfde kamercode', async () => {
  const h = hub('Zomeravond'); // de hub van de sessie die al loopt: openbaar, met een vast id
  const s0 = start(); const root = fakeRoot();
  const lobby = mountLobby(root, hooks({ startHost: () => h }), { adopt: { code: 'K3J9D-8F2MN', route: 'kamer' }, rol: 'host', hub: h });
  await tick(120);
  assert.equal(lobby.state().openbaar, true, 'het paneel leest de openbare regel uit de hub');
  assert.match(root.innerHTML, /Sessie weer privé maken/);
  const ann = nieuw(s0).filter((x) => x.sent.some((d) => d.includes('Zomeravond')));
  assert.ok(ann.length >= 1, 'de lopende sessie staat meteen weer in de lijst');
  const tekst = ann.flatMap((x) => x.sent).join('\n');
  assert.ok(tekst.includes(h.id), 'met het vaste id: dezelfde regel in de lijst');
  assert.ok(tekst.includes('K3J9D8F2MN'), 'met de kamercode van de lopende sessie');
  // weer privé: de hub gaat uit en de aankondiging stopt
  root.click('privaat'); await tick(150);
  assert.equal(h.openbaar, null, 'de hub weet het ook'); assert.equal(lobby.state().openbaar, false);
  assert.ok(ann.every((x) => x.closed), 'de aankondiging stopt');
  lobby.close();
});
await t('de kamercode invoeren werkt nog als voorheen', async () => {
  const root = fakeRoot(); const lobby = mountLobby(root, hooks());
  root.click('kies-gast'); root.value = 'K3J9D-8F2MN'; root.click('koppel');
  assert.equal(lobby.state().step, 'toestemming'); assert.equal(lobby.state().invoer.room, ROOM);
  lobby.close();
});
await t('met keuze gast en lijst (uit het hoofdmenu) begint de lobby met de toestemming voor de lijst, zonder verbinding', async () => {
  const s0 = start(); const root = fakeRoot(); const lobby = mountLobby(root, hooks(), { keuze: 'gast', lijst: true });
  assert.equal(lobby.state().step, 'lijst-vraag'); assert.equal(start(), s0);
  root.click('lijst-terug'); assert.equal(lobby.state().step, 'gast-typt');
  lobby.close();
});

console.log(`lobbyui_serverlijst_test: ${n}/${n} ok`);
process.exit(0);
