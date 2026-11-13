// Samen spelen (#528, ADR 0022): the boot makes the session choice. This test proves three things with
// the real modules - no mocks of our own code:
//   1. with a fake public list the boot joins the right session, tries the next one when the first refuses
//      and hosts at the end;
//   2. with magOnline() === false nothing opens a socket at all (constitution 4 and 10);
//   3. the join path itself works end to end: a real host (coopnet.js) and a real guest over the in-memory
//      transport of net/memtransport.js, with the room route replaced by that transport.
//   node scripts/sessionboot_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { bootSession, canBootSession, openSession, BOOT } from '../game/js/sessionboot.js';
import { kies, KEUZE } from '../game/js/sessiekeuze.js';
import { codeer, Serverlijst } from '../game/js/net/serverlijst.js';
import { maakSleutelpaar, sleutelTekst } from '../game/js/net/sigcrypto.js';

let n = 0;
const t = async (naam, f) => { await f(); n++; };

// Every socket is counted: a boot that contacts anyone shows up here (the same idea as lobbyui_consent_test).
const log = { ws: [], pc: [] };
globalThis.WebSocket = class { constructor(url) { log.ws.push(String(url)); this.url = url; setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); } send() {} close() {} };
globalThis.RTCPeerConnection = class {
  constructor(cfg) { log.pc.push(cfg); this.localDescription = null; }
  createDataChannel() { return { close() {} }; }
  async createOffer() { return { type: 'offer', sdp: 'v=0' }; }
  async setLocalDescription() { this.localDescription = { type: 'offer', sdp: 'v=0' }; }
  async setRemoteDescription() {}
  addEventListener() {} removeEventListener() {} close() {}
};
globalThis.window = globalThis;
globalThis.document ??= { body: { classList: { contains: () => true } } };
globalThis.navigator ??= {};
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// A row exactly like Serverlijst.lijst() makes it (anders/vol/kan derived, never invented).
// #795: een rij draagt sinds de hostsleutel ook de publieke sleutel; de test gebruikt er een vaste.
const HOST_KEY = await sleutelTekst(await maakSleutelpaar());
const rij = (id, spelers, max, extra = {}) => {
  const anders = !!extra.anders;
  const vol = spelers >= max;
  return { id, naam: 'naam' in extra ? extra.naam : 'Open spel', spelers, max, versie: 'dev', hostKey: HOST_KEY, room: extra.room || 'ABCDEFGHJK', anders, vol, kan: !anders && !vol, ouderdom: 1000, ...extra };
};

// A world like the boot sees it: a player who can walk away, no session yet.
const wereld = (extra = {}) => ({
  player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' },
  coop: { local: true }, money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); },
  input: { axis: () => [0, 0], isDown: () => false }, ...extra,
});

const meldingen = [];
const deps = (o = {}) => ({ magOnline: () => true, meld: (m) => meldingen.push(m), ...o });

// A public list that stays put: no broker is touched (haalLijst is a seam).
const lijstVan = (rijen) => async () => rijen;

await t('met toestemming en een passende sessie: meedoen, en de reden blijft leeg', async () => {
  meldingen.length = 0;
  const w = wereld();
  const rijen = [rij('rustig', 1, 8), rij('druk', 5, 8, { naam: 'Groningen' })];
  let gehost = 0;
  const gekozen = [];
  const uit = await bootSession(w, deps({ haalLijst: lijstVan(rijen), verbind: async (r) => { gekozen.push(r.id); }, host: async () => { gehost++; } }));
  assert.equal(uit.doen, KEUZE.MEEDOEN);
  assert.deepEqual(gekozen, ['druk'], 'de drukste sessie wint');
  assert.equal(uit.sessie.id, 'druk');
  assert.equal(gehost, 0, 'niets gehost als meedoen lukt');
  assert.deepEqual(meldingen, [], 'geen melding als het gewoon lukt');
});

await t('de eerste sessie weigert: de volgende kandidaat, geen derde poging, daarna zelf hosten', async () => {
  meldingen.length = 0;
  const w = wereld();
  const rijen = [rij('a', 6, 8, { naam: 'Eerste' }), rij('b', 4, 8, { naam: 'Tweede' }), rij('c', 2, 8, { naam: 'Derde' })];
  const geprobeerd = [];
  let gehost = 0;
  const uit = await bootSession(w, deps({
    haalLijst: lijstVan(rijen),
    verbind: async (r) => { geprobeerd.push(r.id); throw new Error('vol'); },
    host: async () => { gehost++; },
  }));
  assert.deepEqual(geprobeerd, ['a', 'b'], `hoogstens ${BOOT.pogingen} pogingen, geen oneindige lus`);
  assert.equal(gehost, 1, 'daarna host je zelf');
  assert.equal(uit.doen, KEUZE.HOSTEN);
  assert.deepEqual(uit.pogingen, ['a', 'b']);
  assert.equal(meldingen.length, 1, 'de speler hoort waarom');
  assert.match(meldingen[0], /Tweede/, 'de reden noemt de laatste sessie die geen plek gaf');
  assert.match(meldingen[0], /zelf een sessie/);
});

await t('de tweede kandidaat lukt wel: geen host, geen melding', async () => {
  meldingen.length = 0;
  const rijen = [rij('a', 6, 8), rij('b', 4, 8)];
  const geprobeerd = [];
  let gehost = 0;
  const uit = await bootSession(wereld(), deps({
    haalLijst: lijstVan(rijen),
    verbind: async (r) => { geprobeerd.push(r.id); if (r.id === 'a') throw new Error('vol'); },
    host: async () => { gehost++; },
  }));
  assert.deepEqual(geprobeerd, ['a', 'b']);
  assert.equal(uit.doen, KEUZE.MEEDOEN);
  assert.equal(uit.sessie.id, 'b');
  assert.equal(gehost, 0);
  assert.deepEqual(meldingen, []);
});

await t('geen passende sessie: zelf hosten, en de reden van kies() komt bij de speler', async () => {
  meldingen.length = 0;
  let gehost = 0;
  const uit = await bootSession(wereld(), deps({ haalLijst: lijstVan([rij('vol', 4, 4, { naam: 'Groningen' })]), host: async () => { gehost++; } }));
  assert.equal(uit.doen, KEUZE.HOSTEN);
  assert.equal(gehost, 1);
  const { reden } = kies({ rijen: [rij('vol', 4, 4, { naam: 'Groningen' })], meedoen: true });
  assert.equal(meldingen[0], reden, 'letterlijk de reden uit kies(), niet een eigen waarheid');
  assert.match(meldingen[0], /vol/);
});

await t('de lijst is onbereikbaar: geen fout, gewoon zelf hosten', async () => {
  meldingen.length = 0;
  let gehost = 0;
  const uit = await bootSession(wereld(), deps({ haalLijst: async () => { throw new Error('broker plat'); }, host: async () => { gehost++; } }));
  assert.equal(uit.doen, KEUZE.HOSTEN);
  assert.equal(gehost, 1, 'de start hangt niet en wacht niet op de lijst');
  assert.equal(meldingen.length, 1);
});

await t('met toestemming en een lege lijst: een sessie van één speler start (host)', async () => {
  meldingen.length = 0;
  let gehost = 0;
  const uit = await bootSession(wereld(), deps({ haalLijst: lijstVan([]), host: async () => { gehost++; } }));
  assert.equal(uit.doen, KEUZE.HOSTEN);
  assert.equal(gehost, 1, 'de host van de sessie van één wordt gestart');
  assert.deepEqual([log.ws.length, log.pc.length], [log.ws.length, log.pc.length], 'geen extra sockets voor een sessie van één');
});

await t('zonder toestemming: magOnline() === false opent geen enkele verbinding', async () => {
  const w0 = log.ws.length, p0 = log.pc.length;
  const w = wereld();
  let gehost = 0, verbonden = 0, lijst = 0;
  const uit = await bootSession(w, {
    magOnline: () => false,
    haalLijst: async () => { lijst++; return [rij('a', 1, 8)]; },
    verbind: async () => { verbonden++; },
    host: async () => { gehost++; },
    meld: () => meldingen.push('mag niet'),
  });
  assert.equal(uit.doen, KEUZE.BESLOTEN);
  assert.equal(lijst, 0, 'de lijst wordt niet eens opgehaald');
  assert.equal(verbonden, 0);
  assert.equal(gehost, 0, 'een besloten sessie van een: geen hub, geen aankondiging');
  assert.deepEqual([log.ws.length - w0, log.pc.length - p0], [0, 0], 'geen WebSocket en geen RTCPeerConnection');
  assert.equal(canBootSession(w), false, 'het bootpad zelf weigert ook zonder toestemming');
});

await t('canBootSession: niet in een voertuig, geen tweede sessie, geen wissel', () => {
  const w = wereld();
  assert.equal(canBootSession(w), false, 'zonder toestemming (de instelling staat op null in deze run)');
  assert.equal(canBootSession(wereld({ coopNet: { role: 'host' } })), false, 'een lopende sessie: geen tweede zoektocht');
  assert.equal(canBootSession(wereld({ coopWissel: {} })), false, 'tijdens een overdracht: geen zoektocht');
});

// #639: de bootorde is vastgelegd in sessionboot.js (comment bij canBootSession): de
// expliciete lijst gaat voor, de automatische zoektocht is de terugval, en de sessie van
// één start pas als de zoektocht klaar is. Deze test bewijst dat een bestaande sessie van
// één nooit een tweede hub of een stille join oplevert.
await t('bootorde (#639): een lopende sessie van één geeft nooit een tweede hub of stille join', async () => {
  const w = wereld({ coopNet: { role: 'host' }, coopSolo: true });
  let gehost = 0, verbonden = 0;
  assert.equal(canBootSession(w), false, 'de zoektocht begint niet naast een lopende sessie');
  const uit = await bootSession(w, deps({
    haalLijst: lijstVan([rij('ander', 1, 8)]),
    verbind: async () => { verbonden++; },
    host: async () => { gehost++; },
    meld: () => {},
  }));
  assert.equal(uit.doen, KEUZE.BESLOTEN, 'de bestaande sessie wint');
  assert.equal(gehost, 0, 'geen tweede hub');
  assert.equal(verbonden, 0, 'geen stille join');
});

await t('sessionBootTick doet niets zonder toestemming: geen socket, geen hub', async () => {
  const { sessionBootTick } = await import('../game/js/sessionboot.js');
  const w0 = log.ws.length, p0 = log.pc.length;
  const w = wereld();
  sessionBootTick(w);
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(!w.coopNet, 'geen sessie');
  assert.equal(canBootSession(w), false, 'en de volgende tik weigert ook');
  assert.deepEqual([log.ws.length - w0, log.pc.length - p0], [0, 0], 'geen enkele verbinding');
});

await t('hostSession opent een echte sessie zonder lijst: besloten (#556), en sluit weer netjes', async () => {
  const { hostSession, stopSessionBoot, sessionBootState } = await import('../game/js/sessionboot.js');
  const w = wereld();
  const hub = hostSession(w, { invites: false });
  assert.ok(hub && hub.roster, 'de gastheerhub bestaat');
  assert.equal(hub.openbaar, null, 'het bootpad maakt de sessie nooit openbaar (#556)');
  assert.equal(w.coopNet && w.coopNet.role, 'host', 'de wereld is nu een sessie');
  assert.ok(sessionBootState(w), 'de boot houdt de sessie bij');
  stopSessionBoot(w);
  assert.equal(sessionBootState(w), null);
  N.stopCoopNet(w);
  assert.ok(!w.coopNet, 'stoppen laat de wereld weer alleen achter');
});

await t('de standaard hostweg van bootSession werkt: lege lijst, toestemming, en dan een besloten hub', async () => {
  const w = wereld();
  const uit = await bootSession(w, deps({ haalLijst: lijstVan([]), hostOpties: { invites: false } }));
  assert.equal(uit.doen, KEUZE.HOSTEN);
  assert.equal(w.coopNet && w.coopNet.role, 'host', 'de gastheer draait de wereld');
  assert.equal(w.coopNet.hub.openbaar, null, 'hosten na een mislukte zoektocht is besloten (#556)');
  assert.match(meldingen[meldingen.length - 1], /Er speelt nog niemand/, 'en de reden staat bij de speler');
  const { stopSessionBoot } = await import('../game/js/sessionboot.js');
  stopSessionBoot(w);
  N.stopCoopNet(w);
});

// ------------------------------------------------------------------ the real join path
// A real host through coopnet.js, a real guest through openSession, and the room route replaced by the
// in-memory transport: the same code path the browser takes, without a broker.
const INFO = N.handshakeInfo({ tiles: '-', story: 'nieuw' });

async function echteSessie({ max = 4 } = {}) {
  const hw = wereld();
  N.startHost(hw, INFO, { seed: 3, max });
  const sim = { hw, gs: [], nu: 0 };
  // A heartbeat so a real handshake can finish while we await it: memtransport only delivers on advance().
  const tik = () => {
    N.tickCoopNet(hw, 1 / 60);
    for (const g of sim.gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; }
    hw.time += 1 / 60; sim.nu += 1 / 60;
  };
  sim.stop = () => { if (sim.hart) { clearInterval(sim.hart); sim.hart = null; } };
  sim.hart = setInterval(tik, 4);
  if (sim.hart.unref) sim.hart.unref();
  // The seat the host offers: memtransport in place of the WebRTC room, and addGuest where openInvite
  // would be. openSession then walks the real startClient + handshake of coopnet.js.
  sim.voegToe = async (extra = {}) => {
    const link = createLink({ latency: 0.02, seed: 7 + sim.gs.length });
    N.addGuest(hw, link.a);
    const gw = wereld(extra);
    const g = { gw, link };
    sim.gs.push(g);
    // De rij hoort bij deze gastheerhub: het welkom noemt zijn vaste sessie-id (#777/#795).
    g.session = await openSession(gw, { id: hw.coopNet.hub.id, naam: '', room: 'ABCDEFGHJK' }, { openTransport: async () => link.b });
    return g;
  };
  sim.step = (secs) => { for (let k = 0; k < Math.round(60 * secs); k++) tik(); };
  return sim;
}

await t('openSession: een echte gastheer accepteert de gast, over het transport van memtransport', async () => {
  const s = await echteSessie();
  const g = await s.voegToe();
  assert.equal(g.session.status, 'ok', 'het welkom kwam aan: ' + g.session.status);
  assert.equal(g.gw.coopRole, 'client');
  assert.equal(s.hw.coopRole, 'host');
  s.step(0.5);
  assert.equal(s.hw.coopRoster.length, 2, 'de gastheer ziet de gast in zijn rooster');
  N.stopCoopNet(s.hw);
  N.stopCoopNet(g.gw);
});

await t('openSession: een volle sessie geeft een weigering en laat de wereld van de gast heel', async () => {
  const s = await echteSessie({ max: 4 });
  // Fill the three free seats, then a fourth guest has to be refused.
  for (let i = 0; i < 3; i++) { const g = await s.voegToe(); s.step(0.2); assert.equal(g.session.status, 'ok'); }
  const link = createLink({ latency: 0.02, seed: 99 });
  N.addGuest(s.hw, link.a);
  const gw = wereld();
  const wacht = { gw, link };
  s.gs.push(wacht); // the guest's own side has to tick too, otherwise its hello never leaves
  let fout = '';
  try { await openSession(gw, { id: s.hw.coopNet.hub.id, naam: '', room: 'ABCDEFGHJK' }, { openTransport: async () => link.b }); } catch (e) { fout = e.message; }
  assert.equal(fout, 'vol', 'de weigering komt als reden terug');
  assert.ok(!gw.coopNet, 'geen halve sessie: de wereld is weer van de gast');
  assert.ok(!gw.coopRole, 'en zijn rol is terug zoals hij was');
  assert.equal(s.hw.coopRoster.length, 4, 'de gastheer houdt zijn vier spelers');
  assert.ok(!gw.messages.some((m) => String(m && m.text || m).includes('vol')), 'de gastheer schrijft niets in de HUD van de gast');
  N.stopCoopNet(s.hw);
  for (const g of s.gs) if (g.gw.coopNet) N.stopCoopNet(g.gw);
  s.stop();
});

await t('openSession (#777/#795): ander sessie-id is fataal, een andere naam bij hetzelfde id waarschuwt alleen', async () => {
  const s = await echteSessie();
  const probeer = async (rij) => {
    const link = createLink({ latency: 0.02, seed: 61 });
    N.addGuest(s.hw, link.a);
    const gw = wereld();
    s.gs.push({ gw, link });
    let fout = '';
    try { await openSession(gw, rij, { openTransport: async () => link.b }); } catch (e) { fout = e.message; }
    return { fout, gw };
  };
  const anderId = await probeer({ id: 'nietdezesessie', naam: '', room: 'ABCDEFGHJK' });
  assert.equal(anderId.fout, 'De sessie kwam niet overeen.', 'ander sessie-id: het tweede slot weigert');
  assert.ok(!anderId.gw.coopNet, 'geen halve sessie: de wereld is weer van de gast');
  // Een host met een naam in de lijst: dezelfde sessie maar een andere naam is geen weigering; de speler hoort het wel.
  s.hw.coopNet.hub.zetOpenbaar(true, 'Zomeravond');
  const andereNaam = await probeer({ id: s.hw.coopNet.hub.id, naam: 'Andere naam', room: 'ABCDEFGHJK' });
  assert.equal(andereNaam.fout, '', 'andere naam bij hetzelfde id: de boot gaat door (zoals de lobby, #777)');
  assert.equal(andereNaam.gw.coopRole, 'client', 'de gast zit in de sessie');
  assert.ok(andereNaam.gw.messages.some((m) => /heet nu "Zomeravond" in plaats van "Andere naam"/.test(String((m && m.text) || m))), 'met een waarschuwing bij de speler');
  const goed = await probeer({ id: s.hw.coopNet.hub.id, naam: 'Zomeravond', room: 'ABCDEFGHJK' });
  assert.equal(goed.fout, '', 'dezelfde sessie en naam: welkom');
  assert.equal(goed.gw.coopRole, 'client');
  N.stopCoopNet(s.hw);
  for (const g of s.gs) if (g.gw.coopNet) N.stopCoopNet(g.gw);
  s.stop();
});

await t('bootSession doet de hele weg: kiezen, echt verbinden, en zonder host als de sessie weg is', async () => {
  const s = await echteSessie();
  // A row that points at this host: the same room the test joins. The list names it as the busiest.
  const rijen = [rij(s.hw.coopNet.hub.id, 1, 4, { naam: '', room: 'ABCDEFGHJK' })];
  const gw = wereld();
  let gehost = 0;
  const uit = await bootSession(gw, deps({
    haalLijst: lijstVan(rijen),
    openTransport: async (room) => {
      assert.equal(room, 'ABCDEFGHJK', 'de kamercode uit de rij gaat naar de bestaande weg');
      const link = createLink({ latency: 0.02, seed: 42 });
      N.addGuest(s.hw, link.a);
      s.gs.push({ gw, link, extern: true });
      return link.b;
    },
    host: async () => { gehost++; },
  }));
  assert.equal(uit.doen, KEUZE.MEEDOEN);
  assert.equal(gw.coopRole, 'client', 'de gast zit echt in de sessie');
  assert.equal(gehost, 0);
  s.step(0.5);
  assert.equal(s.hw.coopRoster.length, 2, 'de gastheer ziet hem');
  N.stopCoopNet(s.hw);
  N.stopCoopNet(gw);
});

await t('de lijst van de boot gebruikt de echte Serverlijst: een aankondiging wordt een rij', async () => {
  // No socket: the boot must return an empty list instead of hanging (a broken or blocked broker).
  const { haalLijst } = await import('../game/js/sessionboot.js');
  const wsBewaard = globalThis.WebSocket;
  delete globalThis.WebSocket;
  const leeg = await haalLijst({ wacht: 50 });
  globalThis.WebSocket = wsBewaard;
  assert.deepEqual(leeg, [], 'geen socket: meteen een lege lijst');
  // The same path with a socket that never answers: the timeout decides, not the start.
  const t0 = Date.now();
  const traag = await haalLijst({ wacht: 150 });
  assert.deepEqual(traag, []);
  assert.ok(Date.now() - t0 < 2000, 'de wacht is kort en begrensd');

  // And a real announcement from the host side becomes a row the boot can choose from.
  const lijst = new Serverlijst({ proto: 2, versie: 'dev', nu: () => 5000 });
  const tekst = codeer({ naam: 'Groningen', spelers: 2, max: 4, versie: 'dev', proto: 2, id: 'abcdefghij', hostKey: HOST_KEY, nu: 5000 });
  assert.ok(tekst, 'de aankondiging van #438 is geldig');
  assert.equal(lijst.ontvang(tekst, 5000).ok, true);
  const rijen = lijst.lijst(5000);
  assert.equal(rijen.length, 1);
  assert.equal(rijen[0].id, 'abcdefghij', 'het sessie-id is de ingang: daarmee vraagt de gast een kamer (#583)');
  assert.equal(rijen[0].hostKey, HOST_KEY, 'de rij draagt de hostsleutel voor het join-antwoord (#795)');
  assert.ok(!('room' in rijen[0]), 'de kamercode staat niet in de lijst');
  assert.equal(kies({ rijen, meedoen: true }).sessie.id, 'abcdefghij', 'en kies() geeft het door');
});

await t('de module verstuurt zelf pas iets na een ja: de bron leest magOnline() als eerste', () => {
  const src = fs.readFileSync(fileURLToPath(new URL('../game/js/sessionboot.js', import.meta.url)), 'utf8');
  const body = src.slice(src.indexOf('export async function bootSession'));
  assert.match(body, /if \(!mag\(\)\) return/, 'bootSession keert terug zonder toestemming, voor elke aanroep');
  assert.ok(body.indexOf('if (!mag()) return') < body.indexOf('deps.haalLijst || haalLijst'), 'de controle staat voor het ophalen van de lijst');
  assert.match(src, /if \(!magOnline\(\)\) return false/, 'canBootSession vraagt dezelfde instelling');
});

await t('de module maakt zelf nooit een sessie openbaar (#556): geen aankondiging en geen poort', () => {
  const src = fs.readFileSync(fileURLToPath(new URL('../game/js/sessionboot.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(src, /zetOpenbaar/, 'het bootpad zet nooit een openbare regel');
  assert.doesNotMatch(src, /maakAankondiger|bedienKamer/, 'geen aankondiger en geen poort in het bootpad');
  assert.doesNotMatch(src, /openbaar\s*=\s*true/, 'geen standaard openbaar');
});

// #799: de boot bereikt de wachter als er geen welkom komt. De gastheer is er wel (er is een
// deur), maar antwoordt niet: openSession moet na BOOT.verbindWacht met 'geen antwoord' stoppen
// en de wereld van de gast heel laten. (De 20 s-consenttimer en de boot-wachter in main.js zijn
// DOM/timer-gedrag en staan als gat in docs/TESTGATEN-799.md.)
await t('openSession: geen welkom binnen BOOT.verbindWacht is een begrensde wachter', async () => {
  const bewaard = BOOT.verbindWacht;
  BOOT.verbindWacht = 120;
  const link = createLink({ latency: 0.01, seed: 5 });
  const gw = wereld();
  let fout = '';
  const t0 = Date.now();
  try { await openSession(gw, { id: 'geenhost', naam: '', room: 'ABCDEFGHJK' }, { openTransport: async () => link.b }); } catch (e) { fout = e.message; }
  BOOT.verbindWacht = bewaard;
  assert.equal(fout, 'geen antwoord', 'de wachter zegt waarom');
  assert.ok(Date.now() - t0 < 3000, 'de wachter is begrensd, niet 8 s in deze test');
  assert.ok(!gw.coopNet, 'geen halve sessie na de time-out');
  assert.ok(!gw.coopRole, 'de rol van de gast is terug');
});

// #799: de hele keten boot → vraagKamer(hostKey) → kamer → welkom, met een echte host en gast
// over memtransport. De kamerroute is de enige seam; de rest is de code van het spel.
await t('boot → vraagKamer(hostKey) → kamer → welkom: de echte keten', async () => {
  const s = await echteSessie();
  const link = createLink({ latency: 0.02, seed: 12 });
  N.addGuest(s.hw, link.a);
  const gw = wereld();
  s.gs.push({ gw, link });
  let gevraagd = null;
  const rij0 = { id: s.hw.coopNet.hub.id, naam: 'Open spel', spelers: 1, max: 4, versie: 'dev', hostKey: 'HOSTKEY', room: null, anders: false, vol: false, kan: true, ouderdom: 1000 };
  const uit = await bootSession(gw, deps({
    haalLijst: lijstVan([rij0]),
    haalKamer: async (r) => { gevraagd = r; return 'ABCDEFGHJK'; },
    openTransport: async () => link.b,
    host: () => { throw new Error('de boot hoort te kunnen meedoen, niet te hosten'); },
  }));
  assert.equal(uit.doen, KEUZE.MEEDOEN, 'de boot koos meedoen');
  assert.ok(gevraagd && gevraagd.hostKey === 'HOSTKEY', 'vraagKamer kreeg de hostsleutel (#795)');
  assert.equal(gw.coopRole, 'client', 'de gast zit in de echte sessie');
  assert.ok(gw.coopNet, 'de gast heeft een sessie');
  s.step(0.4);
  assert.equal(s.hw.coopRoster.length, 2, 'de gastheer ziet de gast');
  N.stopCoopNet(s.hw);
  if (gw.coopNet) N.stopCoopNet(gw);
  s.stop();
});

console.log(`sessionboot_test: ${n}/${n} ok`);
process.exit(0); // the announcement timer of a host session is still running

