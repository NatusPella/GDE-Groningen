// Samen spelen (#95): scenario's met een slecht netwerk, zonder Electron. Dezelfde koppeling als in het spel
// (coopnet.js: host, gasten, hub, sessies) over een in-memory transport met vertraging, jitter en pakketverlies:
// vier spelers met een slechte verbinding, wegvallen en terugkomen (zelfde token), een gast die weggaat en een
// nieuwe die zijn plek neemt, de host die stopt, en een afwijking (desync) die hersteld wordt.
// Elke scenario schrijft een regel met de gemeten waarden, zodat het log leest als een testverslag.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';

let n = 0;
const t = (name, f) => { const r = f(); n++; if (r) console.log(`  ${name}: ${r}`); };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, clock: 9, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false }, ...extra });

// netwerk per gast: { latency, jitter, loss }
function sessie(gasten = 3, { net = {}, hostExtra, max } = {}) {
  const hw = mkWorld(hostExtra), holds = [], resumed = [];
  N.startHost(hw, INFO, { seed: 5, max, onHold: (r, slot) => holds.push([r, slot]) });
  const gs = [];
  const sim = { hw, gs, holds, resumed, nu: 0 };
  sim.voegToe = (cfg = net, extra = {}) => {
    const i = gs.length;
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 11 + i, ...cfg });
    N.addGuest(hw, link.a);
    const gw = mkWorld(extra);
    N.startClient(gw, link.b, INFO, { onHold: (r, slot) => holds.push([r + i, slot]) });
    const g = { gw, link, i };
    gs.push(g); return g;
  };
  for (let i = 0; i < gasten; i++) sim.voegToe(Array.isArray(net) ? net[i] : net);
  sim.step = (secs, f) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      if (f) f(k, sim.nu);
      N.tickCoopNet(hw, 1 / 60);
      for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; }
      hw.time += 1 / 60; sim.nu += 1 / 60;
    }
  };
  return sim;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

t('vier spelers op een slecht netwerk (120 ms, 10% verlies): iedereen ziet iedereen, beloningen komen precies één keer aan', () => {
  const s = sessie(3, { net: { latency: 0.12, jitter: 0.05, loss: 0.10 } });
  s.hw.clock = 9;
  let ber = 0, beweeg = 0;
  s.step(4); // eerst laten verbinden
  s.step(30, (k) => {
    s.hw.player.x += 0.1; s.hw.companion.x += 0.06; s.hw.clock += 0.0003;
    if (k > 60 * 24 && k % 10 === 0) for (const g of s.gs) beweeg = Math.max(beweeg, dist(g.gw.companion, s.hw.player)); // tijdens het lopen
    if (k % 180 === 0 && ber < 10) { assert.ok(N.payGuest(s.hw, 10, 1)); ber++; }
  });
  s.step(5); // laatste pakketten laten aankomen
  const [tessa] = s.gs.map((g) => g.gw);
  for (const g of s.gs) assert.ok(['ok', 'lag'].includes(g.gw.coopNet.session.status), 'verbinding houdt stand: ' + g.gw.coopNet.session.status);
  assert.equal(s.hw.coopRoster.length, 4);
  assert.equal(tessa.money, 100, 'tien beloningen van 10, geen dubbele en geen verloren');
  // gedeelde wereld: de positie van Tammo op elke gast ligt dicht bij de host
  assert.ok(beweeg < 4, 'achterstand van Tammo bij de gasten tijdens het lopen (6 m/s): ' + beweeg.toFixed(2) + ' m');
  const fouten = s.gs.map((g) => dist(g.gw.companion, s.hw.player));
  assert.ok(Math.max(...fouten) < 6, 'positie van Tammo bij de gasten: ' + fouten.map((f) => f.toFixed(2)).join(', '));
  for (const g of s.gs) assert.deepEqual(g.gw.coopPartners.map((p) => p.slot).sort(), [0, 1, 2, 3].filter((x) => x !== g.gw.coopNet.session.slot), 'iedereen ziet de drie anderen, ook het rooster klopt (' + JSON.stringify((g.gw.coopRoster || []).map((r) => r.slot)) + ')');
  const klok = s.gs.map((g) => Math.abs(g.gw.clock - s.hw.clock));
  assert.ok(Math.max(...klok) < 0.3, 'speelklok: ' + klok.map((k) => k.toFixed(3)).join(', '));
  assert.ok(!s.gs.some((g) => g.gw.coopDesync), 'geen valse desync door verlies');
  const tr = s.gs.map((g) => `${g.link.net.sent} verstuurd/${g.link.net.dropped} verloren`);
  return `achterstand tijdens lopen max ${beweeg.toFixed(2)} m, in rust ${Math.max(...fouten).toFixed(2)} m, klokverschil max ${Math.max(...klok).toFixed(3)} u, ${tr[0]}`;
});

t('zwaar verlies (35%) en grote vertraging (300 ms): de sessie leeft, gebeurtenissen komen in volgorde en één keer aan', () => {
  const s = sessie(1, { net: { latency: 0.3, jitter: 0.1, loss: 0.35 } });
  const log = [];
  s.gs[0].gw.addMessage = (m) => log.push(m);
  for (let k = 0; k < 40 && !(s.hw.coopNet.hub.sessions.get(1) && s.hw.coopNet.hub.sessions.get(1).guest); k++) s.step(1); // met 35% verlies duurt het aansluiten even
  for (let i = 0; i < 8; i++) { assert.ok(N.payGuest(s.hw, i + 1, 1)); s.step(1.2); }
  s.step(15);
  assert.equal(s.gs[0].gw.money, 36, 'som van 1 t/m 8, zonder dubbele');
  assert.deepEqual(log.filter((m) => /Beloning/.test(m)).map((m) => +m.replace(/\D/g, '')), [1, 2, 3, 4, 5, 6, 7, 8], 'in volgorde');
  assert.ok(s.gs[0].gw.coopNet.session.status !== 'lost');
  return `status ${s.gs[0].gw.coopNet.session.status}, rtt ${(s.hw.coopNet.hub.sessions.get(1).rtt * 1000).toFixed(0)} ms`;
});

t('wegvallen en terugkomen: pauze voor Tessa, hervatten met hetzelfde token op dezelfde plek, pauze weer weg', () => {
  const s = sessie(2);
  s.hw.coopHoldOpen = 0;
  s.step(3);
  const tessa = s.gs[0];
  tessa.link.cut();
  s.step(7);
  assert.equal(s.hw.coopRoster.find((r) => r.slot === 1).verbinding, 'lost');
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host').map((h) => h[1]), [1], 'de host krijgt de pauze voor Tessa');
  assert.ok(s.holds.some((h) => h[0] === 'client0'), 'Tessa ziet dat de verbinding weg is');
  assert.equal(s.hw.coop.remote, false, 'tijdens het wegvallen speelt de volg-AI Tessa');
  tessa.link.restore();
  s.step(8);
  assert.equal(s.hw.coopRoster.find((r) => r.slot === 1).verbinding, 'ok', 'Tessa is terug');
  assert.equal(tessa.gw.coopNet.session.slot, 1, 'zelfde plek');
  assert.equal(s.hw.coop.remote, true, 'de gast stuurt Tessa weer');
  assert.equal(s.gs[1].gw.coopNet.session.status, 'ok', 'de andere gast merkte niets');
  return `terug na ${(s.nu - 10).toFixed(1)} s van herstel`;
});

t('een gast komt terug met een nieuwe verbinding (ander transport) en zijn token: zelfde plek, geen nieuwe speler', () => {
  const s = sessie(2); s.step(3);
  const g = s.gs[0];
  g.link.cut(); s.step(7);
  const link2 = createLink({ latency: 0.04, seed: 99 });
  N.addGuest(s.hw, link2.a);
  g.link = link2; g.gw.coopNet.session.reconnect(link2.b);
  s.step(6);
  assert.equal(g.gw.coopNet.session.slot, 1);
  assert.equal(s.hw.coopRoster.length, 3, 'geen derde speler erbij');
  assert.equal(s.hw.coopRoster.find((r) => r.slot === 1).verbinding, 'ok');
});

t('te lang weg (over het hervatvenster): de plek komt vrij en een nieuwe gast neemt hem; de rest speelt door', () => {
  const s = sessie(2); s.step(3);
  s.gs[0].link.cut();
  s.step(130); // RESUME_WINDOW = 120 s
  assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 2], 'plek 1 is vrij');
  const nieuw = s.voegToe(); s.step(5);
  assert.equal(nieuw.gw.coopNet.session.slot, 1, 'de nieuwe gast krijgt de vrije plek (Tessa)');
  assert.equal(nieuw.gw.player.character, 'anita');
  assert.equal(s.gs[1].gw.coopNet.session.status, 'ok');
  assert.equal(s.hw.coopRoster.length, 3);
});

t('gast gaat weg, een nieuwe komt: plekken en figuren kloppen, de rest merkt niets; daarna stopt de host en iedereen valt terug op zichzelf', () => {
  const s = sessie(3); s.step(3);
  N.stopCoopNet(s.gs[1].gw); s.step(3);
  assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 1, 3]);
  const nieuw = s.voegToe(); s.step(5);
  assert.equal(nieuw.gw.coopNet.session.slot, 2, 'de nieuwe krijgt de laagste vrije plek');
  assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 1, 2, 3]);
  assert.deepEqual(nieuw.gw.coopPartners.map((p) => p.slot).sort(), [0, 1, 3]);
  N.stopCoopNet(s.hw);
  for (let k = 0; k < 60 * 12; k++) for (const g of s.gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); }
  const ok = s.gs.filter((g) => g.gw.coopNet && g.gw.coopNet.session.status === 'ok');
  assert.equal(ok.length, 0, 'na het vertrek van de host speelt niemand nog "samen"');
});

t('desync: een gast met een afwijkende stand krijgt na drie hashes een hersync, ook op een netwerk met verlies', () => {
  const s = sessie(2, { net: { latency: 0.08, jitter: 0.03, loss: 0.1 }, hostExtra: { wanted: 3, mission: { phase: 'active', index: 4 } } });
  s.step(12);
  const gw = s.gs[0].gw;
  assert.equal(gw.coopDesync, undefined, 'geen alarm bij een gelijke stand');
  gw.wanted = 0;
  const n = gw.coopNet; const echt = n.session.world.bind(n.session);
  n.session.world = () => { const w = echt(); return w && { ...w, mission: { ...w.mission, stage: 9 } }; };
  s.hw.wanted = 5;
  s.step(30);
  assert.ok(gw.coopDesync, 'afwijking gezien');
  assert.equal(gw.wanted, 5, 'na de hersync heeft de gast het wanted van de host');
  assert.equal(s.gs[1].gw.coopDesync, undefined, 'de andere gast heeft geen afwijking');
  return `velden ${gw.coopDesync.velden.join(',')}`;
});

t('de gedeelde klok springt mee als de host slaapt (grote sprong) en loopt anders zacht', () => {
  const s = sessie(1, { hostExtra: { clock: 10 } }); s.step(5);
  s.hw.clock = 22; s.step(8);
  assert.ok(Math.abs(s.gs[0].gw.clock - 22) < 0.5, 'gast sprong mee: ' + s.gs[0].gw.clock);
  s.hw.clock = 2; s.step(8); // over middernacht
  const d = Math.abs(((s.gs[0].gw.clock - 2 + 36) % 24) - 12);
  assert.ok(d < 0.5, 'over middernacht: ' + s.gs[0].gw.clock);
});

t('het maximum: een vijfde gast bij maximum 4 wordt netjes geweigerd; na een vrije plek lukt het wel', () => {
  const s = sessie(4, { max: 4 }); s.step(4);
  assert.equal(s.gs[3].gw.coopNet.session.rejected, 'vol');
  N.stopCoopNet(s.gs[1].gw); s.step(3);
  const nieuw = s.voegToe(); s.step(5);
  assert.equal(nieuw.gw.coopNet.session.status, 'ok');
});

console.log(`coop_scenarios_test: ${n}/${n} ok`);
