// Samen spelen (#983, #429, #439): een avond met vier spelers (host + 3 gasten) over de hostwissel heen, zonder Electron.
// Dezelfde koppeling als in het spel (coopnet.js, hub, coophostwisselnet.js) op een nep-wereld per speler, over een geheugentransport.
// hostwissel_test.mjs bewijst de overdracht zelf; deze test bewijst wat een vierspelersavond eromheen eist: beloningen blijven per
// speler en nooit dubbel, ook niet over drie overdrachten en een overname na wegvallen; er is steeds één host met vier unieke plekken;
// een speler die wegvalt of later aansluit kan bij de nieuwe host terecht.
//   node scripts/coop/viersp_hostwissel_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as W from '../../game/js/coophostwisselnet.js';

let n = 0;
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, calendar: { day: 3 }, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const rol = (w) => (w.coopNet ? w.coopNet.role : null);
const geen = (...ws) => ws.every((w) => !w.coopHold);
const verbondenMet = (g, host) => g.coopNet && g.coopNet.role === 'client' && g.coopNet.joined && host.coopNet && host.coopNet.role === 'host' && host.coopNet.hub.sessions.size > 0;

function avond({ gasten = 3, snel = null } = {}) {
  const links = [], kamers = new Map(); let teller = 0, opv = 0;
  const hw = mkWorld({ money: 1000, clock: 17.5, calendar: { day: 12 } });
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  const werelden = [hw];
  const mkDeps = (i) => ({
    info: () => INFO,
    verbind: async (kamer) => { const k = kamers.get(kamer); if (!k) throw new Error('geen kamer'); const l = createLink({ latency: 0.04, jitter: 0.01, seed: 31 + links.length }); links.push(l); k.aanvaard(l.a); return l.b; },
    maakKamer: () => 'OPVOLGER' + (++opv),
    opKamer: async ({ aanvaard, kamer: gewenst }) => { const kamer = gewenst || 'KAMER' + (++teller); kamers.set(kamer, { aanvaard, door: i }); return { kamer, stop() { kamers.delete(kamer); } }; },
    wacht: () => Promise.resolve(), pogingen: 4, rand: () => 0.31,
    leesOpdracht: () => null, zetOpdracht: () => {}, leesKapot: () => [], zetKapot: () => {},
  });
  W.zetWisselDeps(hw, mkDeps(0));
  const maakGast = (i, host = hw) => {
    const link = createLink({ latency: snel === i ? 0.004 : 0.04, jitter: 0.015, seed: 11 + i * 7 }); links.push(link);
    N.addGuest(host, link.a);
    const gw = mkWorld({ player: { x: 50 + i, y: 60, angle: 0, character: 'anita', vx: 0, vy: 0 }, money: 100 + i * 10, clock: 3 + i, calendar: { day: 7 } });
    N.startClient(gw, link.b, INFO, {});
    W.zetWisselDeps(gw, mkDeps(i + 1)); werelden.push(gw); return gw;
  };
  for (let i = 0; i < gasten; i++) maakGast(i);
  const tick = () => { for (const wd of werelden) { if (wd.coopNet || wd.coopWissel) N.tickCoopNet(wd, 1 / 60); wd.time += 1 / 60; } for (const l of links) l.advance(1 / 60); };
  const step = async (secs, voorwaarde) => { const k = Math.round(60 * secs); for (let i = 0; i < k; i++) { tick(); if (i % 3 === 0) await new Promise((r) => setImmediate(r)); if (voorwaarde && voorwaarde()) return true; } return !voorwaarde; };
  const valWeg = (w) => { for (const l of links) l.cut(); const i = werelden.indexOf(w); if (i >= 0) werelden.splice(i, 1); };
  return { hw, werelden, gs: werelden.slice(1), links, kamers, step, valWeg, maakGast };
}
const geef = async (s, w, slotVan) => { const r = W.biedOver(w, slotVan); assert.ok(r.ok, 'bieden: ' + JSON.stringify(r)); const naar = s.werelden.find((x) => x.coopNet && x.coopNet.session && x.coopNet.session.slot === slotVan); await s.step(1.5, () => naar.coopWisselUi && naar.coopWisselUi.vraag); naar.input.s.add('j'); return naar; };
const slotsVan = (host) => host.coopNet.hub.roster.spelers.map((x) => x.slot).sort();
async function t(naam, f) { try { await f(); n++; console.log('ok  ', naam); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n   ')); process.exit(1); } }

await t('vier spelers, drie overdrachten achter elkaar: altijd vier unieke plekken en één host', async () => {
  const s = avond({ gasten: 3 }); await s.step(3);
  assert.deepEqual(slotsVan(s.hw), [0, 1, 2, 3]);
  const g = s.gs;
  const g2 = await geef(s, s.hw, 2);
  assert.ok(await s.step(30, () => rol(g2) === 'host' && [s.hw, g[0], g[2]].every((x) => verbondenMet(x, g2))), 'wissel 1: ' + s.werelden.map(rol));
  await s.step(3);
  assert.equal(slotsVan(g2).length, 4, 'wissel 1: nog vier spelers');
  const g3 = await geef(s, g2, g[2].coopNet.session.slot);
  assert.ok(await s.step(30, () => rol(g3) === 'host' && [s.hw, g[0], g2].every((x) => verbondenMet(x, g3))), 'wissel 2: ' + s.werelden.map(rol));
  await s.step(3);
  const g1 = await geef(s, g3, g[0].coopNet.session.slot);
  assert.ok(await s.step(30, () => rol(g1) === 'host' && [s.hw, g2, g3].every((x) => verbondenMet(x, g1))), 'wissel 3: ' + s.werelden.map(rol));
  await s.step(3);
  assert.equal(s.werelden.filter((w) => rol(w) === 'host').length, 1, 'precies één host');
  assert.equal(slotsVan(g1).length, 4, 'na drie wissels nog vier spelers');
  assert.equal(new Set(s.werelden.map((w) => (w.coopNet.session ? w.coopNet.session.slot : 0))).size, 4, 'vier verschillende plekken');
  assert.ok(geen(...s.werelden));
});

await t('beloning per speler: elke gast krijgt het volle bedrag, nooit dubbel, ook niet na een overdracht', async () => {
  const s = avond({ gasten: 3 }); const [g1, g2, g3] = s.gs; await s.step(3);
  const v = () => s.werelden.map((w) => w.money);
  const v0 = v();
  assert.ok(N.payGuest(s.hw, 50, null, null, 'sessie:opdracht:1'), 'betalen aan iedereen');
  await s.step(1);
  assert.deepEqual(v().slice(1), v0.slice(1).map((x) => x + 50), 'ieder gast +50 (geen delen)');
  N.payGuest(s.hw, 50, null, null, 'sessie:opdracht:1'); await s.step(1);
  assert.deepEqual(v().slice(1), v0.slice(1).map((x) => x + 50), 'dezelfde gebeurtenis geeft niet dubbel');
  const nieuw = await geef(s, s.hw, 2);
  assert.equal(nieuw, g2);
  assert.ok(await s.step(30, () => rol(nieuw) === 'host' && [s.hw, g1, g3].every((x) => verbondenMet(x, nieuw))), 'wissel');
  await s.step(3);
  const v1 = v();
  N.payGuest(nieuw, 50, null, null, 'sessie:opdracht:1'); await s.step(1); // dezelfde gebeurtenis via de nieuwe host
  assert.equal(g1.money, v1[1], 'gast 1 krijgt dezelfde gebeurtenis niet nog eens'); assert.equal(g3.money, v1[3], 'gast 3 idem');
  N.payGuest(nieuw, 50, null, null, 'sessie:opdracht:2'); await s.step(1);
  assert.equal(g1.money, v1[1] + 50, 'een nieuwe gebeurtenis geeft elke gast één keer'); assert.equal(g3.money, v1[3] + 50);
});

await t('de host valt weg: de gast met de beste lijn neemt over, daarna betaalt de nieuwe host per speler', async () => {
  const s = avond({ gasten: 3, snel: 2 }); const [g1, g2, g3] = s.gs; await s.step(14);
  const v0 = [g1.money, g2.money, g3.money];
  s.valWeg(s.hw);
  assert.ok(await s.step(60, () => rol(g3) === 'host' && verbondenMet(g1, g3) && verbondenMet(g2, g3)), 'overname: ' + s.werelden.map(rol));
  await s.step(4);
  N.payGuest(g3, 40, null, null, 'na:val:1'); await s.step(1);
  assert.equal(g1.money, v0[0] + 40); assert.equal(g2.money, v0[1] + 40);
  N.payGuest(g3, 40, null, null, 'na:val:1'); await s.step(1);
  assert.deepEqual([g1.money, g2.money], [v0[0] + 40, v0[1] + 40], 'niemand dubbel');
});

await t('een gast valt weg en een late speler sluit na de overdracht aan bij de nieuwe host', async () => {
  const s = avond({ gasten: 3 }); const [g1, g2, g3] = s.gs; await s.step(3);
  const nieuw = await geef(s, s.hw, 2);
  assert.equal(nieuw, g2);
  assert.ok(await s.step(30, () => rol(nieuw) === 'host' && [s.hw, g1, g3].every((x) => verbondenMet(x, nieuw))), 'wissel');
  await s.step(3);
  const geld3 = g3.money;
  N.stopCoopNet(g3); s.werelden.splice(s.werelden.indexOf(g3), 1); await s.step(4);
  assert.equal(nieuw.coopNet.hub.sessions.size, 2, 'twee gasten blijven over bij de nieuwe host');
  N.payGuest(nieuw, 25, null, null, 'tijdens:weg:1'); await s.step(1);
  assert.equal(g3.money, geld3, 'wie weg is krijgt niets');
  const laat = s.maakGast(7, nieuw); await s.step(8, () => laat.coopNet && laat.coopNet.joined);
  assert.ok(laat.coopNet.joined, 'de late speler zit bij de nieuwe host');
  assert.equal(nieuw.coopNet.hub.sessions.size, 3, 'weer drie gasten');
  const m0 = laat.money; N.payGuest(nieuw, 25, null, null, 'tijdens:weg:2'); await s.step(1);
  assert.equal(laat.money, m0 + 25, 'de late speler krijgt vanaf nu zijn eigen beloning');
});

console.log(`viersp_hostwissel_test: ${n}/4 ok`);
process.exit(0);
