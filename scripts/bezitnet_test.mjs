// Het transport van de Bezit-claims (#1104) met drie instanties (host + twee gasten) over een nep-netwerk met omgekeerde en door elkaar gehusselde levering, aansluiten
// en wegvallen, de oude client die het bericht negeert, en het bewijs dat de dagtik niet dubbel telt bij een hostwissel en niet bij een gast draait.
//   node scripts/bezitnet_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as N from '../game/js/bezitnet.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import { encodeIds } from '../game/js/bezitcoop.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const ID = (i) => 'p' + i.toString(16).padStart(12, '0');

// een nep-netwerk: elke wereld heeft een transport; berichten komen in een rij en worden in een vaste volgorde afgeleverd (heen, omgekeerd of gehusseld)
function netwerk(order = 'fifo') {
  const queue = [], worlds = new Map(), tr = new Map();
  const add = (slot, role) => {
    const w = { coopRoster: [{ slot: 0, naam: 'Host' }, { slot: 1, naam: 'Lotte' }, { slot: 2, naam: 'Zoe' }], money: 0, msgs: [], addMessage(x) { this.msgs.push(x); } };
    worlds.set(slot, w);
    tr.set(slot, role === 'host'
      ? { role: 'host', toGuest: (s, body) => queue.push({ to: s, from: 0, body }), guests: () => [...worlds.keys()].filter((k) => k !== 0) }
      : { role: 'client', toHost: (body) => queue.push({ to: 0, from: slot, body }), guests: () => [] });
    return w;
  };
  const flush = () => {
    let guard = 0;
    while (queue.length && guard++ < 1000) {
      const batch = queue.splice(0, queue.length);
      const ordered = order === 'omgekeerd' ? batch.reverse() : order === 'husselen' ? batch.map((m, i) => [(i * 7919) % 13, m]).sort((a, b) => a[0] - b[0]).map((x) => x[1]) : batch;
      for (const m of ordered) N.handleBezit(worlds.get(m.to), m.body, m.from, tr.get(m.to));
    }
  };
  const ensure = (slot) => N.ensureBezitNet(worlds.get(slot), tr.get(slot));
  return { worlds, tr, add, flush, ensure, queue };
}
const claimsOf = (w) => w.bezitNet.net.claims;

for (const order of ['fifo', 'omgekeerd', 'husselen']) {
  t(`drie instanties (${order}): twee gasten claimen hetzelfde perceel, iedereen komt tot dezelfde winnaar`, () => {
    const net = netwerk(order);
    const host = net.add(0, 'host'), g1 = net.add(1, 'client'), g2 = net.add(2, 'client');
    const o0 = net.ensure(0), o1 = net.ensure(1), o2 = net.ensure(2);
    net.flush();
    o1.net.announce({ id: ID(1), action: 'claim' }, 20);
    o2.net.announce({ id: ID(1), action: 'claim' }, 10);                 // Zoe was eerder
    net.flush();
    assert.equal(claimsOf(host).lookup(ID(1)).name, 'Zoe');
    assert.equal(claimsOf(g1).lookup(ID(1)).name, 'Zoe');
    assert.equal(claimsOf(g2).lookup(ID(1)), null, 'Zoe ziet haar eigen claim als van haarzelf');
    assert.ok(claimsOf(g2).has(ID(1)));
  });
}
t('host en gast kopen verschillend en zien elkaars omtrek', () => {
  const net = netwerk('husselen');
  const host = net.add(0, 'host'), g1 = net.add(1, 'client'), g2 = net.add(2, 'client');
  const o0 = net.ensure(0), o1 = net.ensure(1); net.ensure(2); net.flush();
  o0.net.announce({ id: ID(5), action: 'claim' }, 5);
  o1.net.announce({ id: ID(6), action: 'claim' }, 6);
  net.flush();
  assert.deepEqual(claimsOf(g2).list().map((c) => c.id).sort(), [ID(5), ID(6)]);
  assert.deepEqual(claimsOf(host).list().map((c) => c.id), [ID(6)]);
  assert.deepEqual(claimsOf(g1).list().map((c) => c.id), [ID(5)]);
  assert.equal(claimsOf(g2).lookup(ID(6)).name, 'Lotte');
});
t('loslaten wordt doorgegeven', () => {
  const net = netwerk();
  net.add(0, 'host'); const g1 = net.add(1, 'client'); const g2 = net.add(2, 'client');
  net.ensure(0); const o1 = net.ensure(1); net.ensure(2); net.flush();
  o1.net.announce({ id: ID(7), action: 'claim' }, 1); net.flush();
  assert.ok(claimsOf(g2).lookup(ID(7)));
  o1.net.announce({ id: ID(7), action: 'release' }, 2); net.flush();
  assert.equal(claimsOf(g2).lookup(ID(7)), null);
});
t('aansluiten: een late gast meldt zijn bezit en krijgt dat van de anderen', () => {
  const net = netwerk();
  net.add(0, 'host'); net.add(1, 'client');
  const o0 = net.ensure(0), o1 = net.ensure(1); net.flush();
  o0.net.announce({ id: ID(10), action: 'claim' }, 1);
  o1.net.announce({ id: ID(11), action: 'claim' }, 2); net.flush();
  const g2 = net.add(2, 'client');
  // de late gast heeft al eigen bezit in zijn eigen spel
  const o2 = net.ensure(2);
  o2.net.claims.apply({ id: ID(12), action: 'claim', from: 'me', t: 3 });
  net.queue.push({ to: 0, from: 2, body: { k: 'bezit', a: 'hello', ids: encodeIds([ID(12)]) } });
  net.flush();
  assert.deepEqual(claimsOf(g2).list().map((c) => c.id).sort(), [ID(10), ID(11)]);
  assert.equal(claimsOf(net.worlds.get(0)).lookup(ID(12)).name, 'Zoe');
  assert.equal(claimsOf(net.worlds.get(1)).lookup(ID(12)).name, 'Zoe', 'de andere gast hoort het ook');
});
t('wegvallen: de claims van een gast verdwijnen overal; die van anderen blijven', () => {
  const net = netwerk();
  net.add(0, 'host'); net.add(1, 'client'); net.add(2, 'client');
  const o0 = net.ensure(0), o1 = net.ensure(1); net.ensure(2); net.flush();
  o1.net.announce({ id: ID(20), action: 'claim' }, 1); o0.net.announce({ id: ID(21), action: 'claim' }, 2); net.flush();
  const dropped = N.dropSlot(net.worlds.get(0), 1, net.tr.get(0)); net.flush();
  assert.equal(dropped, 1);
  assert.equal(claimsOf(net.worlds.get(2)).lookup(ID(20)), null);
  assert.ok(claimsOf(net.worlds.get(2)).lookup(ID(21)));
});
t('een oude client of een bericht zonder sessie: genegeerd, geen fout', () => {
  assert.equal(N.bezitEvent({}, { k: 'bezit', a: 'claim', id: ID(1) }, 1), false);
  const net = netwerk(); net.add(0, 'host'); net.ensure(0);
  for (const body of [null, {}, { k: 'bezit' }, { k: 'bezit', a: 'claim', id: 'x' }, { k: 'bezit', a: 'raar' }, { k: 'bezit', a: 'sync', ids: 5 }]) assert.doesNotThrow(() => N.handleBezit(net.worlds.get(0), body, 1, net.tr.get(0)));
  assert.equal(claimsOf(net.worlds.get(0)).size(), 0);
});
t('berichten blijven klein: een sync van 150 ID\'s past ruim in MAX_JSON (2048)', () => {
  const ids = Array.from({ length: N.SYNC_CHUNK }, (_, i) => ID(i + 1));
  assert.ok(JSON.stringify({ k: 'bezit', a: 'sync', from: 's1', name: 'Lotte', color: '#ffffff', ids: encodeIds(ids) }).length < 1500);
});
t('coopnet.js: de sleutel bezit is aangesloten en een vertrek ruimt claims op (broncontrole)', () => {
  const src = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  assert.ok(src.includes("case 'bezit': return bezitEvent(world, body, van);") && src.includes('bezitLeave(world, slot)'));
});

// ---- de dagtik: per speler, niet dubbel bij een hostwissel, niet bij een gast ----
t('dagtik: dezelfde dag telt een keer, een stap terug (hostwissel) telt niet dubbel, een sprong vooruit rekent de gemiste dagen een keer af', () => {
  const store = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
  L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store });
  L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 0, 0, 800]], rows: [['paaaaaaaaaaa1', 100, 100, 300, 0, 0, 90, 90]] });
  const w = { money: 1e6, addMessage() {}, calendar: { day: 5 } };
  assert.ok(L.koopPerceel(w, 'paaaaaaaaaaa1').ok);
  const farm = BL.getBoerderij();
  farm.uren = 24 * 5; L.dagTik(w);                                      // legt de dag vast
  const days = () => L.getBezit().x.lastDay;
  assert.equal(days(), 5);
  farm.uren = 24 * 6; const r1 = L.dagTik(w);
  assert.equal(r1.days, 1); assert.equal(days(), 6);
  assert.equal(L.dagTik(w), null, 'dezelfde dag: niets');
  farm.uren = 24 * 5; assert.equal(L.dagTik(w), null, 'een klok die terugspringt (hostwissel): niets en geen dubbel tellen');
  assert.equal(days(), 6);
  farm.uren = 24 * 9; const r2 = L.dagTik(w);
  assert.equal(r2.days, 3); assert.equal(days(), 9);
});
t('dagtik: een gast draait hem niet (main.js: het gastpad komt eerder terug; broncontrole)', () => {
  const src = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  const guest = src.indexOf("world.coopRole === 'client' && world.coopNet && world.coopNet.joined) { updateGastLokaal");
  const tick = src.indexOf('bezitDagTik(world)');
  assert.ok(guest > 0 && tick > guest, 'het gastpad staat vóór de dagtik');
  const guestLine = src.slice(guest, src.indexOf('\n', guest));
  assert.ok(!guestLine.includes('bezitDagTik') && guestLine.includes('return; }'), 'het gastpad keert terug zonder de dagtik');
});

console.log(`bezitnet_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
