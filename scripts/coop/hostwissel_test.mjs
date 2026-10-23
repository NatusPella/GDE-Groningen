// Samen spelen (#439): het spel overdragen, van begin tot eind zonder Electron. Dezelfde koppeling als in het spel (coopnet.js, hub, sessies,
// coophostwisselnet.js) op een nep-wereld per speler, over een geheugentransport. De route (kamer openen, bij een kamer aansluiten) is hier een
// register in het geheugen: wat voor echt internet nog nodig is (rtcroom met echte brokers en STUN) staat in docs/COOP-OVERDRAGEN.md.
//   node scripts/coop/hostwissel_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as W from '../../game/js/coophostwisselnet.js';
import { createWeatherState, stepWeather } from '../../game/js/weatherstate.js';
import { weerEvent } from '../../game/js/coopweer.js';

let n = 0;
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, calendar: { day: 3 }, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const tekstIn = (w, re) => w.messages.some((m) => re.test(m));

// één avond: de gastheer (Tammo, wereld 0) en drie gasten, met een register van kamers voor de overdracht
function avond({ gasten = 3, weigerKamer = [] } = {}) {
  const links = [], kamers = new Map(); let teller = 0;
  const weer = createWeatherState(7); for (let i = 0; i < 40; i++) stepWeather(weer, 5);
  const hw = mkWorld({ money: 1234, clock: 17.5, wanted: 2, calendar: { day: 12 }, weatherState: weer, mission: { phase: 'active', label: 'Het Loket', index: 3, t: 41 }, kapot: ['kliko@3', 'bord@9', 'stoel@14'] });
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  const werelden = [hw], deps = [];
  const mkDeps = (w, i) => ({
    info: () => INFO,
    verbind: async (kamer) => { const k = kamers.get(kamer); if (!k) throw new Error('geen kamer'); const l = createLink({ latency: 0.04, jitter: 0.01, seed: 31 + links.length }); links.push(l); k.aanvaard(l.a); return l.b; },
    opKamer: async ({ aanvaard }) => { if (weigerKamer.includes(i)) throw new Error('niet bereikbaar'); const kamer = 'KAMER' + (++teller); kamers.set(kamer, { aanvaard }); return { kamer, stop() { kamers.delete(kamer); } }; },
    wacht: () => Promise.resolve(), pogingen: 4, rand: () => 0.31,
    zetOpdracht: (wd, o) => { wd.mission = { phase: o.staat, label: o.id, index: o.stap, t: o.t }; },
    leesKapot: (wd) => wd.kapot || [], zetKapot: (wd, ids) => { wd.kapot = ids.slice(); },
  });
  const maakGast = (i, wens) => {
    const link = createLink({ latency: 0.04, jitter: 0.015, seed: 11 + i * 7 }); links.push(link);
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 50 + i, y: 60, angle: 0, character: 'anita', vx: 0, vy: 0 }, money: 100 + i * 10, clock: 3 + i, calendar: { day: 7 }, wanted: 0 });
    N.startClient(gw, link.b, INFO, { wens });
    W.zetWisselDeps(gw, mkDeps(gw, i + 1)); werelden.push(gw); return gw;
  };
  W.zetWisselDeps(hw, mkDeps(hw, 0));
  for (let i = 0; i < gasten; i++) maakGast(i, i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined);
  const tick = () => { for (const wd of werelden) { if (wd.coopNet) N.tickCoopNet(wd, 1 / 60); wd.time += 1 / 60; } for (const l of links) l.advance(1 / 60); };
  const step = async (secs, voorwaarde) => { const k = Math.round(60 * secs); for (let i = 0; i < k; i++) { tick(); if (i % 3 === 0) await new Promise((r) => setImmediate(r)); if (voorwaarde && voorwaarde()) return true; } return !voorwaarde; };
  return { hw, werelden, gs: werelden.slice(1), links, kamers, step };
}
const rol = (w) => (w.coopNet ? w.coopNet.role : null);
const geen = (...ws) => ws.every((w) => !w.coopHold);
const alsHost = (w) => rol(w) === 'host' && w.coopNet.hub.sessions.size;

async function t(naam, f) { await f(); n++; }

await t('overdracht aan gast 2: de nieuwe host draait de wereld, de anderen verbinden vanzelf, en geld, gezocht, tijd, weer en opdracht blijven kloppen', async () => {
  const s = avond({ gasten: 3 }); const [g1, g2, g3] = s.gs;
  await s.step(3);
  assert.equal(s.hw.coopRoster.length, 4, 'vier spelers');
  const weerVoor = JSON.stringify(weerEvent(s.hw.weatherState)), klokVoor = s.hw.clock;
  const geld = s.werelden.map((w) => w.money);
  const r = W.biedOver(s.hw, 2); assert.ok(r.ok, 'bieden lukt: ' + JSON.stringify(r));
  assert.ok(s.hw.coopHold, 'wie het spel opende staat stil tot het antwoord er is');
  await s.step(1.5, () => g2.coopWisselUi && g2.coopWisselUi.vraag);
  assert.match(g2.coopWisselUi.vraag.tekst, /wil het spel aan je overdragen.*J = ja, N = nee/, 'de J/N-vraag staat bij de gekozen speler');
  assert.ok(!g1.coopWisselUi || !g1.coopWisselUi.vraag, 'alleen de gekozen speler krijgt de vraag');
  g2.input.s.add('j'); // J
  await s.step(2, () => g1.coopHold && g3.coopHold);
  assert.ok(g1.coopHold && g3.coopHold && /neemt het spel over/.test(g1.coopWisselUi.pauze.tekst), 'bij de anderen staat het spel stil met een melding');
  const klaar = await s.step(25, () => rol(g2) === 'host' && g1.coopNet && g1.coopNet.role === 'client' && g3.coopNet && g3.coopNet.role === 'client' && rol(s.hw) === 'client' && [g1, g3, s.hw].every((w) => w.coopNet.joined));
  assert.ok(klaar, `iedereen is verbonden met de nieuwe host: ${s.werelden.map(rol)}`);
  await s.step(4);
  // wie is wie: gast 2 draait de wereld, de anderen (en wie het spel opende) zijn gast bij hem
  assert.equal(rol(g2), 'host'); assert.equal(g2.coopRole, 'host'); assert.equal(alsHost(g2), 3, 'drie gasten bij de nieuwe host');
  for (const w of [s.hw, g1, g3]) { assert.equal(rol(w), 'client'); assert.equal(w.coopNet.session.status, 'ok', 'sessie ok'); }
  assert.equal(g2.coopNet.hub.roster.spelers.length, 4);
  assert.ok(geen(...s.werelden), 'de pauze is bij iedereen weer weg: ' + s.werelden.map((w) => w.coopHold));
  // niets is verloren
  assert.deepEqual(s.werelden.map((w) => w.money), geld, 'ieders geld is van zichzelf en blijft gelijk');
  assert.equal(g2.wanted, 2, 'gezocht blijft 2'); assert.ok(g2.coopOverdracht.klaar);
  assert.equal(g2.calendar.day, 12, 'dezelfde dag');
  assert.ok(Math.abs(g2.clock - klokVoor) < 1.5, `dezelfde tijd van de dag (${g2.clock} tegen ${klokVoor})`);
  assert.deepEqual(g2.mission, { phase: 'active', label: 'Het Loket', index: 3, t: 41 }, 'de lopende opdracht');
  assert.deepEqual(g2.kapot, ['kliko@3', 'bord@9', 'stoel@14'], 'kapotte objecten');
  const wv = weerEvent(g2.weatherState); assert.equal(JSON.stringify(wv), weerVoor, 'hetzelfde weer');
  // de anderen zien de wereld van de nieuwe host: gezocht en klok volgen hem
  await s.step(4);
  for (const w of [s.hw, g1, g3]) { const sm = w.coopNet.session.world(); assert.ok(sm, 'snapshot'); assert.equal(sm.shared.wanted, 2, 'gezocht bij de gast: ' + w.coopNet.role); }
  assert.ok(tekstIn(g2, /overgenomen/), 'melding bij de nieuwe host'); assert.ok(g2.coopWisselUi.einde);
  // beloningen lopen nu via de nieuwe host naar ieders eigen portemonnee
  const slotVanOud = s.hw.coopNet.session.slot; assert.ok(slotVanOud >= 1, 'wie het spel opende heeft een plek als gast');
  const vooraf = s.hw.money; N.payGuest(g2, 50, slotVanOud); await s.step(1);
  assert.equal(s.hw.money, vooraf + 50, 'wie het spel eerst opende krijgt zijn beloning via de nieuwe host');
  // de wereld van de nieuwe host draait: de klok loopt door voor de nieuwe gasten
  const k0 = s.hw.coopNet.klok.last && s.hw.coopNet.klok.last.t; await s.step(3);
  assert.ok(s.hw.coopNet.klok.last.t > k0, 'de klok van de nieuwe host komt aan');
});

await t('overdracht kan twee keer achter elkaar (en weer terug)', async () => {
  const s = avond({ gasten: 2 }); const [g1, g2] = s.gs; await s.step(2);
  W.biedOver(s.hw, 1); await s.step(1.5, () => g1.coopWisselUi && g1.coopWisselUi.vraag); g1.input.s.add('j');
  assert.ok(await s.step(25, () => rol(g1) === 'host' && rol(s.hw) === 'client' && s.hw.coopNet.joined && g2.coopNet && g2.coopNet.joined), 'eerste overdracht');
  await s.step(3);
  const slotOud = s.hw.coopNet.session.slot;
  assert.ok(W.biedOver(g1, slotOud).ok, 'nu draagt de nieuwe host het weer over'); // wie eerst het spel had krijgt het terug
  await s.step(1.5, () => s.hw.coopWisselUi && s.hw.coopWisselUi.vraag); s.hw.input.s.add('j');
  assert.ok(await s.step(30, () => rol(s.hw) === 'host' && rol(g1) === 'client' && g1.coopNet.joined && g2.coopNet && g2.coopNet.joined), 'terug: ' + s.werelden.map(rol));
  assert.ok(geen(...s.werelden));
});

await t('geweigerd (N): wie het spel opende blijft host, niemand verliest iets en de pauze gaat weg', async () => {
  const s = avond({ gasten: 3 }); const [g1, g2] = s.gs; await s.step(3);
  const hub = s.hw.coopNet.hub;
  W.biedOver(s.hw, 2); await s.step(1.5, () => g2.coopWisselUi && g2.coopWisselUi.vraag);
  g2.input.s.add('n'); await s.step(3);
  assert.equal(rol(s.hw), 'host'); assert.equal(s.hw.coopNet.hub, hub, 'dezelfde hub'); assert.equal(hub.sessions.size, 3, 'alle gasten zijn er nog');
  assert.ok(geen(...s.werelden), 'geen pauze meer'); assert.equal(rol(g2), 'client');
  assert.ok(tekstIn(s.hw, /Jij houdt het spel/), 'melding bij wie het spel opende'); assert.ok(tekstIn(g2, /niet overgenomen/));
  assert.equal(s.hw.money, 1234); assert.equal(s.hw.wanted, 2);
  // opnieuw proberen kan gewoon
  assert.ok(W.biedOver(s.hw, 2).ok, 'daarna kan het opnieuw');
  await s.step(1.5, () => g2.coopWisselUi.vraag); g2.input.s.add('j');
  assert.ok(await s.step(25, () => rol(g2) === 'host' && rol(s.hw) === 'client' && s.hw.coopNet.joined), 'de tweede poging lukt');
});

await t('geen antwoord binnen 20 s: de overdracht mislukt en wie het spel opende blijft host', async () => {
  const s = avond({ gasten: 3 }); const g2 = s.gs[1]; await s.step(3);
  W.biedOver(s.hw, 2); await s.step(25);
  assert.equal(rol(s.hw), 'host'); assert.equal(s.hw.coopNet.hub.sessions.size, 3); assert.ok(geen(...s.werelden));
  assert.ok(tekstIn(s.hw, /duurde te lang/), 'time-out gemeld'); assert.ok(!g2.coopWisselUi.vraag, 'de vraag is weg');
  assert.equal(rol(g2), 'client'); assert.equal(g2.coopNet.session.status, 'ok');
});

await t('de nieuwe host is niet bereikbaar (kamer openen mislukt): de oude host blijft host, de rest gaat verder', async () => {
  const s = avond({ gasten: 3, weigerKamer: [2] }); const [g1, g2, g3] = s.gs; await s.step(3);
  W.biedOver(s.hw, 2); await s.step(1.5, () => g2.coopWisselUi && g2.coopWisselUi.vraag); g2.input.s.add('j');
  await s.step(8);
  assert.equal(rol(s.hw), 'host'); assert.equal(s.hw.coopNet.hub.sessions.size, 3); assert.ok(geen(...s.werelden), 'pauze weg: ' + s.werelden.map((w) => w.coopHold));
  assert.ok(tekstIn(s.hw, /niet bereikbaar/), 'melding bij wie het spel opende'); assert.ok(tekstIn(g2, /kunnen jou niet bereiken/));
  for (const w of [g1, g2, g3]) assert.equal(w.coopNet.session.status, 'ok', 'iedereen speelt door');
  assert.ok(tekstIn(g1, /Het spel gaat door/) || !g1.coopWisselUi.pauze, 'de rest hoort dat het doorgaat');
});

await t('de gekozen speler valt weg tijdens de overdracht: de oude host blijft host en de rest verder', async () => {
  const s = avond({ gasten: 3 }); const [g1, g2] = s.gs; await s.step(3);
  W.biedOver(s.hw, 2); await s.step(1.5, () => g2.coopWisselUi && g2.coopWisselUi.vraag); g2.input.s.add('j');
  await s.step(0.15); // pauze staat aan
  s.links[1].cut(); // de verbinding van gast 2 valt weg (de volgorde van links: gast 0, 1, 2)
  await s.step(25, () => !s.hw.coopHold && !(s.hw.coopWissel.oud && s.hw.coopWissel.oud.bezig));
  await s.step(1); assert.equal(rol(s.hw), 'host'); assert.ok(geen(s.hw, g1), 'de pauze is weg bij de anderen'); assert.ok(tekstIn(s.hw, /Jij houdt het spel/));
  assert.equal(g1.coopNet.session.status === 'ok' || g1.coopNet.session.status === 'lag', true);
});

await t('een speler in een voertuig of een filmpje: de overdracht wordt niet gestart', async () => {
  const s = avond({ gasten: 2 }); await s.step(2);
  s.hw.player.inVehicle = { x: 0, y: 0 };
  assert.equal(W.biedOver(s.hw, 1).ok, false); assert.ok(tekstIn(s.hw, /Stap eerst uit/)); s.hw.player.inVehicle = null;
  s.hw.coopNet.sceneNu = { filmpje: true };
  assert.equal(W.biedOver(s.hw, 1).ok, false); assert.ok(tekstIn(s.hw, /filmpje/)); s.hw.coopNet.sceneNu = null;
  assert.equal(W.biedOver(s.hw, 0).ok, false, 'niet aan jezelf'); assert.equal(W.biedOver(s.hw, 9).ok, false, 'niet aan een onbekende plek');
  assert.equal(W.biedOver(s.gs[0], 0).ok, false, 'alleen wie het spel opende');
  assert.ok(!s.hw.coopHold && !s.hw.coopWissel.oud);
});

console.log(`hostwissel_test: ${n}/7 ok`);
process.exit(0);
