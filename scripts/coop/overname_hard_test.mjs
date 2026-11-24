// Samen spelen (#1059, #1060): de host valt HARD weg (proces gedood), de overlevenden komen weer in één sessie; split-brain-herstel; de opening is van wie hem zelf start.
// Zelfde harnas als hostwissel_test.mjs (echte netlaag, geheugentransport, een register van kamers), met een poging die blijft hangen, onbereikbare kamers,
// een bezette afgesproken kamer (verhuisd-naar) en een verwijzing.
//   node scripts/coop/overname_hard_test.mjs
// (Zie ook hostwissel_test.mjs.) Samen spelen (#439): het spel overdragen, van begin tot eind zonder Electron. Dezelfde koppeling als in het spel (coopnet.js, hub, sessies,
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
function avond({ gasten = 3, weigerKamer = [], snel = null, zelfde = false, geenKamerBereik = [], hang = 0 } = {}) {
  const links = [], kamers = new Map(), codes = {}; let teller = 0, opv = 0;
  const blokkeer = { aan: false, alleen: null }, verwezen = [], bezet = new Set(), verhuisdMap = new Map(), hangN = {};
  const weer = createWeatherState(7); for (let i = 0; i < 40; i++) stepWeather(weer, 5);
  const hw = mkWorld({ money: 1234, clock: 17.5, wanted: 2, calendar: { day: 12 }, weatherState: weer, mission: { phase: 'active', label: 'Het Loket', index: 3, t: 41, deel: 2, timeLeft: 95 }, kapot: ['kliko@3', 'bord@9', 'stoel@14'] });
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  const werelden = [hw], deps = [];
  const mkDeps = (w, i) => ({
    info: () => INFO,
    onCode: (code) => { codes[i] = code; }, // #983: de laatste code die deze speler bewaart
    verbind: async (kamer) => { if (geenKamerBereik.includes(i) && kamer.startsWith('KAMER')) throw new Error('niet te bereiken'); if (blokkeer.aan || (blokkeer.alleen && blokkeer.alleen(kamer))) throw new Error('geblokkeerd'); const k = kamers.get(kamer); if (!k) { if (verhuisdMap.has(kamer)) throw Object.assign(new Error('verhuisd'), { verhuisd: verhuisdMap.get(kamer) }); throw new Error('geen kamer'); } if ((hangN[i] || 0) < hang) { hangN[i] = (hangN[i] || 0) + 1; return new Promise(() => {}); } /* een poging die nooit terugkomt */ const l = createLink({ latency: 0.04, jitter: 0.01, seed: 31 + links.length }); links.push(l); k.aanvaard(l.a); return l.b; },
    maakKamer: () => 'OPVOLGER' + (++opv), // de kamercodes van de opvolgers (overname bij wegvallen)
    verwijs: async (oud, nieuw) => { verwezen.push([oud, nieuw]); verhuisdMap.set(oud, nieuw); return { stop() { verhuisdMap.delete(oud); } }; },
    opKamer: async ({ aanvaard, kamer: gewenst }) => { if (weigerKamer.includes(i)) throw new Error('niet bereikbaar'); if (gewenst && bezet.has(gewenst)) throw new Error('kamer bezet'); const kamer = gewenst || 'KAMER' + (++teller); kamers.set(kamer, { aanvaard, door: i }); return { kamer, stop() { kamers.delete(kamer); } }; },
    wacht: () => Promise.resolve(), pogingen: 4, rand: () => 0.31,
    // de opdrachtstand (#452): de stage en de tijd gaan mee, net als de wereldhaken dat in het spel doen
    leesOpdracht: (wd) => (wd.mission && wd.mission.phase === 'active' ? { id: wd.mission.label, stap: wd.mission.index, deel: wd.mission.deel || 0, tijd: wd.mission.timeLeft, staat: wd.mission.phase, t: wd.mission.t } : null),
    zetOpdracht: (wd, o) => { wd.mission = { phase: o.staat, label: o.id, index: o.stap, t: o.t, deel: o.deel, timeLeft: o.tijd }; },
    leesKapot: (wd) => wd.kapot || [], zetKapot: (wd, ids) => { wd.kapot = ids.slice(); },
  });
  const maakGast = (i, wens) => {
    const link = createLink({ latency: snel === i ? 0.004 : 0.04, jitter: zelfde ? 0 : 0.015, seed: 11 + i * 7 }); links.push(link);
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 50 + i, y: 60, angle: 0, character: 'anita', vx: 0, vy: 0 }, money: 100 + i * 10, clock: 3 + i, calendar: { day: 7 }, wanted: 0 });
    N.startClient(gw, link.b, INFO, { wens });
    W.zetWisselDeps(gw, mkDeps(gw, i + 1)); werelden.push(gw); return gw;
  };
  W.zetWisselDeps(hw, mkDeps(hw, 0));
  for (let i = 0; i < gasten; i++) maakGast(i, i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined);
  const tick = () => { for (const wd of werelden) { if (wd.coopNet || wd.coopWissel) N.tickCoopNet(wd, 1 / 60); wd.time += 1 / 60; } for (const l of links) l.advance(1 / 60); };
  const step = async (secs, voorwaarde) => { const k = Math.round(60 * secs); for (let i = 0; i < k; i++) { tick(); if (i % 3 === 0) await new Promise((r) => setImmediate(r)); if (voorwaarde && voorwaarde()) return true; } return !voorwaarde; };
  // wie het spel opende valt weg zonder afscheid (geen BYE): zijn verbindingen vallen stil en hij tikt niet meer; `ook` valt tegelijk weg
  const valWeg = (ook = []) => { for (const l of links) l.cut(); for (const w of [hw, ...ook]) { const i = werelden.indexOf(w); if (i >= 0) werelden.splice(i, 1); } };
  return { hw, werelden, gs: werelden.slice(1), links, kamers, codes, step, valWeg, blokkeer, verwezen, bezetStel: (k) => bezet.add(k) };
}
const rol = (w) => (w.coopNet ? w.coopNet.role : null);
const geen = (...ws) => ws.every((w) => !w.coopHold);
const alsHost = (w) => rol(w) === 'host' && w.coopNet.hub.sessions.size;

async function t(naam, f) { await f(); n++; }

// ---- #1059: de host valt HARD weg (proces gedood, midden in een bijbaan); de gasten komen weer in één sessie
const gastRol = (w) => (w.coopNet ? w.coopNet.role : 'eigen');
const verbondenMet = (g, host) => g.coopNet && g.coopNet.role === 'client' && g.coopNet.joined && host.coopNet && host.coopNet.role === 'host' && host.coopNet.hub.sessions.size > 0;
const opSlot = (s, slot) => s.gs.find((w) => w.coopNet && w.coopNet.session.slot === slot);
const hosts = (ws) => ws.filter((w) => rol(w) === 'host');
const namenUniek = (w) => { const r = (w.coopRoster || []).map((p) => p.slot); return r.length === new Set(r).size; };

await t('vier spelers, host hard gedood midden in een bijbaan: de drie overlevenden zijn binnen 45 s weer in één sessie, geld en voortgang per speler ongewijzigd', async () => {
  const s = avond({ gasten: 3, snel: 1 }); const [g1, g2, g3] = s.gs; await s.step(14);
  for (const g of s.gs) g.coopBijbaanGast = { id: 'krantenwijk', deelt: true, owner: 1 }; // een bijbaan van een gast loopt bij de host
  const geld = s.gs.map((g) => g.money), t0 = g1.time;
  s.valWeg();
  assert.ok(await s.step(45, () => hosts(s.gs).length === 1 && s.gs.every((g) => rol(g) === 'host' || (g.coopNet && g.coopNet.joined))), 'weer samen: ' + s.gs.map(gastRol));
  await s.step(5);
  const h = hosts(s.gs)[0]; assert.equal(h.coopNet.hub.sessions.size, 2, 'twee gasten bij de nieuwe host'); assert.equal(h.coopNet.hub.roster.spelers.length, 3, 'drie spelers, geen dubbele');
  assert.ok(namenUniek(h), 'geen dubbele spelers'); assert.equal(s.kamers.size, 1, 'één kamer, geen drie losse sessies: ' + [...s.kamers.keys()]);
  assert.deepEqual(s.gs.map((g) => g.money), geld, 'ieders geld is van zichzelf en blijft gelijk'); assert.ok(g1.time - t0 < 90);
  assert.ok(s.gs.every((g) => tekstIn(g, /De bijbaan is gestopt/) || g === h && tekstIn(g, /De bijbaan is gestopt/)), 'een nette melding dat de bijbaan stopt: ' + s.gs.map((g) => g.messages.join('|')).join(' ## '));
  assert.ok(geen(...s.gs)); assert.ok(!s.gs.some((g) => g.coopWissel.solo), 'niemand is tijdelijke host');
});

await t('hangende poging: de eerste poging naar de opvolger komen nooit terug; de gast laat ze los, probeert opnieuw en wordt geen eigen host', async () => {
  const s = avond({ gasten: 3, snel: 0, hang: 1 }); const [g1, g2, g3] = s.gs; await s.step(14);
  const rang = g2.coopWissel.herstel.laatst.rang.map((r) => r.slot); assert.equal(rang[0], g1.coopNet.session.slot);
  s.valWeg();
  assert.ok(await s.step(80, () => rol(g1) === 'host' && verbondenMet(g2, g1) && verbondenMet(g3, g1)), 'iedereen bij de opvolger: ' + s.gs.map(gastRol));
  await s.step(3); assert.equal(hosts(s.gs).length, 1, 'precies één host'); assert.equal(s.kamers.size, 1);
});

await t('afgesproken kamer bezet: de opvolger opent een verse kamer en zet een verwijzing (verhuisd-naar); de anderen volgen die en blijven geen eigen host', async () => {
  const s = avond({ gasten: 3, snel: 0 }); const [g1, g2, g3] = s.gs; await s.step(14);
  const rang = g2.coopWissel.herstel.laatst.rang; assert.equal(rang[0].slot, g1.coopNet.session.slot);
  const bezetKamer = rang[0].kamer; s.bezetStel(bezetKamer);
  s.valWeg();
  assert.ok(await s.step(80, () => rol(g1) === 'host' && verbondenMet(g2, g1) && verbondenMet(g3, g1)), 'iedereen bij de opvolger: ' + s.gs.map(gastRol));
  assert.ok(s.verwezen.length >= 1 && s.verwezen[0][0] === bezetKamer, 'de verwijzing staat onder de afgesproken code: ' + JSON.stringify(s.verwezen));
  assert.equal(hosts(s.gs).length, 1, 'precies één host');
});

await t('split-brain: alle kamers zijn eerst onbereikbaar, dus elke gast wordt na zijn beurt host van een eigen sessie; zodra de rechtmatige opvolger bereikbaar is voegen de anderen zich bij hem', async () => {
  const s = avond({ gasten: 3, snel: 0 }); const [g1, g2, g3] = s.gs; await s.step(14);
  const rang = g2.coopWissel.herstel.laatst.rang.map((r) => r.slot); const eerste = opSlot(s, rang[0]);
  s.blokkeer.aan = true; const geld = s.gs.map((g) => g.money);
  s.valWeg();
  assert.ok(await s.step(160, () => hosts(s.gs).length === 3), 'eerst: drie losse sessies (de bekende fout): ' + s.gs.map(gastRol));
  assert.ok(s.gs.every((g) => g.coopNet.hub.sessions.size === 0), 'alle drie zijn leeg');
  assert.ok(!eerste.coopWissel.solo, 'de rechtmatige opvolger is geen tijdelijke host'); assert.ok(s.gs.filter((g) => g !== eerste).every((g) => g.coopWissel.solo), 'de anderen zijn tijdelijk');
  s.blokkeer.aan = false; // het netwerk is weer goed
  assert.ok(await s.step(90, () => hosts(s.gs).length === 1 && rol(eerste) === 'host' && s.gs.filter((g) => g !== eerste).every((g) => verbondenMet(g, eerste))), 'weer één sessie bij de rechtmatige opvolger: ' + s.gs.map(gastRol));
  await s.step(4); assert.equal(eerste.coopNet.hub.roster.spelers.length, 3, 'drie spelers, niemand dubbel'); assert.ok(namenUniek(eerste));
  assert.deepEqual(s.gs.map((g) => g.money), geld, 'geld per speler ongewijzigd'); assert.ok(geen(...s.gs));
  assert.ok(s.gs.filter((g) => g !== eerste).every((g) => tekstIn(g, /heeft het spel overgenomen\. Je speelt weer mee/)), 'melding');
  assert.ok(s.gs.every((g) => !g.coopWissel.solo), 'het herstel is klaar');
});

await t('split-brain met een gast bij de tijdelijke host: die gast gaat mee (hw-verbind) en niemand blijft achter', async () => {
  const s = avond({ gasten: 3, snel: 0 }); const [g1, g2, g3] = s.gs; await s.step(14);
  const rang = g2.coopWissel.herstel.laatst.rang.map((r) => r.slot); const eerste = opSlot(s, rang[0]), tweede = opSlot(s, rang[1]), derde = opSlot(s, rang[2]);
  const kamer0 = g2.coopWissel.herstel.laatst.rang[0].kamer; s.blokkeer.alleen = (kamer) => kamer === kamer0; // alleen de kamer van de eerste is onbereikbaar
  s.valWeg();
  // de tweede wordt host van een eigen sessie en de derde sluit daar aan; de eerste staat ernaast
  assert.ok(await s.step(160, () => rol(eerste) === 'host' && rol(tweede) === 'host' && verbondenMet(derde, tweede)), 'twee sessies: ' + s.gs.map(gastRol));
  s.blokkeer.alleen = null;
  assert.ok(await s.step(90, () => hosts(s.gs).length === 1 && rol(eerste) === 'host' && [tweede, derde].every((g) => verbondenMet(g, eerste))), 'een sessie bij de rechtmatige opvolger: ' + s.gs.map(gastRol));
  await s.step(3); assert.equal(eerste.coopNet.hub.roster.spelers.length, 3); assert.ok(namenUniek(eerste));
});

await t('een echte sessie blijft heel: een tijdelijke host geeft na SOLO_MAX_S niet meer op, en de eerste van de lijst zoekt nooit', async () => {
  const s = avond({ gasten: 2, snel: 0 }); const [g1, g2] = s.gs; await s.step(14); s.blokkeer.aan = true; s.valWeg();
  assert.ok(await s.step(120, () => hosts(s.gs).length === 2), 'twee eigen sessies: ' + s.gs.map(gastRol));
  const tijdelijk = s.gs.find((g) => g.coopWissel.solo), eerste = s.gs.find((g) => !g.coopWissel.solo); assert.ok(tijdelijk && eerste);
  tijdelijk.coopWissel.solo.sinds -= 400; await s.step(2); assert.ok(!tijdelijk.coopWissel.solo, 'na SOLO_MAX_S is het zijn spel'); s.blokkeer.aan = false; await s.step(30);
  assert.equal(hosts(s.gs).length, 2, 'blijft zoals het is');
});

await t('de opdracht van de vorige speler kan niet hervat worden: een nette melding in het Nederlands, geen spookstaat', async () => {
  const { pasMomentopnameToe } = W; const { maakMomentopname } = await import('../../game/js/coophostwissel.js');
  const mom = maakMomentopname({ tijd: { dag: 12, uur: 17.5 }, spelers: [{ slot: 0, x: 0, y: 0 }], opdracht: { id: 'Het Loket', stap: 3, deel: 1, tijd: 50, staat: 'active', t: 5 } });
  const w = mkWorld({ calendar: { day: 1 }, police: {} });
  const u = pasMomentopnameToe(w, mom, { zetOpdracht: () => false }, { slot: 1, eigenKlokWeer: true, eigenPlek: true });
  assert.equal(u.opdracht, false); assert.ok(tekstIn(w, /De opdracht van de vorige speler kon niet verder/), w.messages.join('|')); assert.ok(!w.mission || w.mission.phase !== 'active');
  const w2 = mkWorld({ calendar: { day: 1 }, police: {} });
  const u2 = pasMomentopnameToe(w2, mom, { zetOpdracht: (wd, o) => { wd.mission = { phase: 'active', label: o.id }; return true; } }, { slot: 1, eigenKlokWeer: true, eigenPlek: true });
  assert.equal(u2.opdracht, true); assert.equal(w2.mission.label, 'Het Loket'); assert.ok(!tekstIn(w2, /kon niet verder/));
});

await t('nette overdracht midden in een bijbaan: de baan stopt met een melding (geen stille stop)', async () => {
  const s = avond({ gasten: 2 }); const [g1, g2] = s.gs; await s.step(3);
  g2.coopBijbaanGast = { id: 'krantenwijk', deelt: true, owner: 1 };
  assert.ok(W.biedOver(s.hw, 1).ok); await s.step(1.5, () => g1.coopWisselUi && g1.coopWisselUi.vraag); g1.input.s.add('j');
  assert.ok(await s.step(30, () => rol(g1) === 'host' && verbondenMet(s.hw, g1) && verbondenMet(g2, g1)), 'overdracht klaar: ' + s.werelden.map(gastRol));
  assert.ok(tekstIn(g2, /De bijbaan is gestopt, want het spel wisselt van speler/), 'melding bij wie meedeed: ' + g2.messages.join('|'));
});

await t('de opening is van wie hem zelf start: met medespelers of midden in een overname wacht hij (#1060)', async () => {
  const { openingBlockers, groepInSpel } = await import('../../game/js/openingstart.js');
  const s = avond({ gasten: 1 }); await s.step(2);
  assert.ok(groepInSpel(s.hw), 'een host met een medespeler'); assert.ok(!groepInSpel(mkWorld()), 'een speler alleen');
  const basis = { started: true, client: false, gate: false, missionActive: false, cinematicActive: false, startActive: false, sinceCinematicS: 99, narrativeBusy: false, pigeon: false, respawn: false, dataReady: true };
  assert.deepEqual(openingBlockers(basis), []); assert.ok(openingBlockers({ ...basis, groep: true }).length === 1);
  assert.ok(groepInSpel({ coopWissel: { val: {} } }), 'midden in een overname');
});

await t('wie net host werd door een overname speelt zijn eigen opening niet, ook niet voor de anderen er weer zijn (#1059, testbank ov3 24-11)', async () => {
  // In drie echte vensters werd de opvolger host en had hij een paar seconden nog geen gasten: groepInSpel was onwaar, de opening van
  // zijn eigen nieuwe spel speelde (klok naar 05:45, speler naar zijn nieuwe thuis) en de groep kwam daarna binnen in die wereld.
  const { groepInSpel } = await import('../../game/js/openingstart.js');
  const s = avond({ gasten: 2 }); await s.step(14);
  s.valWeg();
  let gezien = 0, leeg = 0, vrij = 0;
  await s.step(45, () => {
    const h = hosts(s.gs)[0]; if (!h) return false;
    gezien++; if (h.coopNet.hub.sessions.size === 0) { leeg++; if (!groepInSpel(h)) vrij++; }
    return s.gs.every((g) => rol(g) === 'host' || (g.coopNet && g.coopNet.joined));
  });
  assert.ok(gezien > 0 && leeg > 0, 'de opvolger was even host zonder gasten (' + gezien + '/' + leeg + ')');
  assert.equal(vrij, 0, 'in die tijd hield groepInSpel de opening tegen');
  const h = hosts(s.gs)[0]; assert.ok(groepInSpel(h), 'met de groep erbij ook');
  N.stopCoopNet(h); assert.ok(!groepInSpel(h), 'na het stoppen van die sessie mag zijn eigen opening weer');
});

console.log(`overname_hard_test: ${n}/10 ok`);
process.exit(0);
