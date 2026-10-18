// Samen spelen (#95): de host als ster met 4 tot 8 spelers (game/js/net/hub.js) over in-memory
// transport met verlies en jitter: plekken, figuren, invoer per speler, snapshots voor N lichamen,
// lijst met spelers, vol, weggaan, wegvallen en hervatten van een extra speler, verwijderen.
import assert from 'node:assert/strict';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostHub } from '../game/js/net/hub.js';
import { ClientSession } from '../game/js/net/session.js';
import { leesLijstEvent } from '../game/js/coopplayers.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' };

function room({ max = 4, link = {} } = {}) {
  const log = { inputs: [], joins: [], leaves: [], lost: [], resumed: [], snaps: 0, events: [] };
  const bodies = {};
  const sim = {
    applyInput(slot, i) { log.inputs.push([slot, i.mx]); },
    snapshot() { log.snaps++; return { players: Object.entries(bodies).map(([slot, b]) => ({ slot: +slot, x: b.x, y: b.y, z: 0, angle: 0, alive: true, health: 100 })), shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }; },
    fullState: () => ({}),
  };
  bodies[0] = { x: 0, y: 0 };
  const hub = new HostHub({
    info: INFO, seed: 1, sim, max, caps: ['scene'], rand: makeRng(5),
    onJoin: (s, c) => log.joins.push([s, c]), onLeave: (s, w) => log.leaves.push([s, w]), onLost: (s) => log.lost.push(s), onResumed: (s) => log.resumed.push(s), onEvent: (s, b) => log.events.push([s, b]),
  });
  const clients = [];
  const links = [];
  const add = (wish, seed = clients.length + 10) => {
    const l = createLink({ latency: 0.03, jitter: 0.02, loss: 0, seed, ...link });
    hub.accept(l.a);
    const c = new ClientSession(l.b, { info: { ...INFO, char: wish }, caps: ['scene'] }, makeRng(seed));
    clients.push(c); links.push(l); return c;
  };
  const step = (secs, dt = 1 / 60) => { for (let i = 0; i < secs / dt; i++) { hub.tick(dt); for (const c of clients) c.tick(dt); for (const l of links) l.advance(dt); } };
  return { hub, log, bodies, clients, links, add, step };
}

t('vier spelers: Tessa op plek 1, de gekozen figuur op 2, de eerste vrije op 3; allemaal met naam en kleur', () => {
  const r = room(); r.add(); r.add('bram'); r.add();
  r.step(2);
  assert.deepEqual(r.clients.map((c) => c.status), ['ok', 'ok', 'ok']);
  assert.deepEqual(r.clients.map((c) => c.slot), [1, 2, 3]);
  assert.deepEqual(r.clients.map((c) => c.welcome.naam), ['Tessa', 'Bram', 'Rik']);
  assert.ok(r.clients.every((c) => /^#[0-9a-f]{6}$/.test(c.welcome.kleur)));
  assert.deepEqual(r.log.joins, [[1, 'anita'], [2, 'bram'], [3, 'rik']]);
});
t('de lijst met spelers bereikt iedereen en wordt gecontroleerd; de gast ziet wie er zijn', () => {
  const r = room(); const got = [];
  const c1 = r.add(); c1.onevent = (b) => { const l = leesLijstEvent(b); if (l) got.push(l); };
  r.add('sanne'); r.step(2);
  const last = got.at(-1);
  assert.deepEqual(last.spelers.map((s) => s.char), ['tammo', 'anita', 'sanne']); assert.equal(last.max, 4);
});
t('invoer en lichamen: elke speler stuurt zijn eigen invoer; elke client ziet alle lichamen', () => {
  const r = room();
  const cs = [r.add(), r.add('bram'), r.add('lotte')];
  r.step(1);
  cs.forEach((c, i) => c.setInput(i === 0 ? 1 : i === 1 ? -1 : 0.5, 0, 0, 0));
  r.step(1);
  for (const c of cs) c.setInput(0, 0, 0, 0);
  const slots = new Set(r.log.inputs.map((x) => x[0]));
  assert.deepEqual([...slots].sort(), [1, 2, 3]);
  assert.ok(r.log.inputs.some(([s, mx]) => s === 1 && mx === 1));
  assert.ok(r.log.inputs.some(([s, mx]) => s === 2 && mx < -0.9));
  assert.ok(r.log.inputs.some(([s, mx]) => s === 3 && Math.abs(mx - 0.5) < 0.02));
  r.bodies[1] = { x: 10, y: 1 }; r.bodies[2] = { x: 20, y: 2 }; r.bodies[3] = { x: 30, y: 3 };
  r.step(1);
  for (const c of cs) { const w = c.world(); assert.deepEqual(w.players.map((p) => p.slot).sort(), [0, 1, 2, 3]); }
});
t('één snapshot per tik voor alle spelers (kosten groeien niet met het aantal gasten)', () => {
  const r = room({ max: 8 }); for (let i = 0; i < 7; i++) r.add(); r.step(2);
  r.log.snaps = 0; r.step(1);
  assert.ok(r.log.snaps <= 61, `snapshots gebouwd: ${r.log.snaps}`);
});
t('vol: de vijfde krijgt "vol"; na verhogen van het maximum tot 8 kan het wel, tot en met acht spelers', () => {
  const r = room(); for (let i = 0; i < 3; i++) r.add(); const vijfde = r.add(); r.step(2);
  assert.equal(vijfde.status, 'geweigerd'); assert.equal(vijfde.rejected, 'vol');
  assert.equal(r.hub.setMax(8), 8);
  const zesde = r.add(); r.step(2); assert.equal(zesde.status, 'ok');
  for (let i = 0; i < 3; i++) r.add();
  const tiende = r.add(); r.step(3);
  assert.equal(r.hub.roster.spelers.length, 8);
  assert.equal(tiende.rejected, 'vol');
  assert.equal(new Set(r.hub.roster.spelers.map((s) => s.char)).size, 8);
});
t('acht spelers over een lijn met 10% verlies en jitter: iedereen blijft verbonden en ziet iedereen', () => {
  const r = room({ max: 8, link: { loss: 0.1, jitter: 0.06 } });
  for (let i = 0; i < 7; i++) r.add(undefined, 100 + i);
  r.bodies[0] = { x: 0, y: 0 }; for (let s = 1; s < 8; s++) r.bodies[s] = { x: s * 5, y: 0 };
  r.step(12);
  assert.ok(r.clients.every((c) => c.status === 'ok'), r.clients.map((c) => c.status).join());
  assert.ok(r.clients.every((c) => c.world() && c.world().players.length === 8));
});
t('weggaan geeft de plek vrij; de volgende krijgt hem; Tessa blijft Tessa', () => {
  const r = room(); const a = r.add(), b = r.add('bram'); r.add('rik'); r.step(2);
  a.leave(); r.step(1);
  assert.deepEqual(r.log.leaves.at(-1), [1, 'weg']);
  const nieuw = r.add('daan'); r.step(2);
  assert.equal(nieuw.slot, 1); assert.equal(nieuw.welcome.naam, 'Tessa');
  assert.equal(b.status, 'ok');
});
t('een extra speler valt weg: de anderen merken niets, alleen zijn plek staat op "weg"; hervatten kan', () => {
  const r = room(); const a = r.add(), b = r.add('bram'); r.step(2);
  const token = b.token;
  r.links[1].set({ loss: 1 }); r.step(6);
  assert.deepEqual(r.log.lost, [2]);
  assert.equal(a.status, 'ok');
  assert.equal(r.hub.roster.spelers.find((s) => s.slot === 2).verbinding, 'lost');
  assert.equal(r.hub.roster.spelers.find((s) => s.slot === 1).verbinding, 'ok');
  r.links[1].set({ loss: 0 }); r.step(4);
  assert.equal(b.status, 'ok'); assert.equal(b.token, token); assert.deepEqual(r.log.resumed, [2]);
  assert.equal(r.hub.roster.spelers.find((s) => s.slot === 2).verbinding, 'ok');
});
t('hervatten over een NIEUWE verbinding (nieuwe code): dezelfde speler krijgt dezelfde plek terug', () => {
  const r = room(); const a = r.add(), b = r.add('bram'); r.step(2);
  const token = b.token;
  r.links[1].cut(); r.step(6);
  assert.equal(r.hub.roster.spelers.find((x) => x.slot === 2).verbinding, 'lost');
  const l2 = createLink({ latency: 0.03, seed: 77 }); r.hub.accept(l2.a); r.links.push(l2);
  b.reconnect(l2.b); r.step(4);
  assert.equal(b.status, 'ok'); assert.equal(b.slot, 2); assert.equal(b.token, token);
  assert.deepEqual(r.hub.roster.spelers.map((x) => x.slot), [0, 1, 2]);
  assert.equal(r.hub.roster.spelers.find((x) => x.slot === 2).verbinding, 'ok'); assert.equal(a.status, 'ok');
});
t('verwijderen: de gast krijgt een bericht en kan weg; de rest speelt door', () => {
  const r = room(); const a = r.add(), b = r.add('bram'); const got = []; b.onevent = (x) => got.push(x.k);
  r.step(2);
  assert.equal(r.hub.kick(2), true); assert.equal(r.hub.kick(7), false);
  r.step(1); assert.ok(got.includes('weg'));
  b.leave(); r.step(1);
  assert.deepEqual(r.hub.roster.spelers.map((s) => s.slot), [0, 1]); assert.equal(a.status, 'ok');
});
t('berichten naar een speler of naar iedereen; events van gasten komen met hun plek aan', () => {
  const r = room(); const a = r.add(), b = r.add(); const ga = [], gb = [];
  a.onevent = (x) => { if (x.k === 'test') ga.push(x.v); }; b.onevent = (x) => { if (x.k === 'test') gb.push(x.v); };
  r.step(2);
  r.hub.announce({ k: 'test', v: 1 }, 2); r.hub.announce({ k: 'test', v: 2 });
  b.sendEvent({ k: 'ping', x: 1, y: 2 });
  r.step(1);
  assert.deepEqual(ga, [2]); assert.deepEqual(gb, [1, 2]);
  assert.deepEqual(r.log.events.filter(([, e]) => e.k === 'ping').map(([s]) => s), [2]);
});
t('verkeerde versie: ook in een sessie met veel spelers geweigerd, zonder plek te verbruiken', () => {
  const r = room();
  const l = createLink({ latency: 0.02 }); r.hub.accept(l.a);
  const c = new ClientSession(l.b, { info: { ...INFO, version: 'oud' } }, makeRng(3)); r.clients.push(c); r.links.push(l);
  r.step(2);
  assert.equal(c.rejected, 'versie'); assert.equal(r.hub.roster.spelers.length, 1);
});
t('sluiten ruimt alles op', () => {
  const r = room(); r.add(); r.add(); r.step(2); r.hub.closeAll(); r.step(1);
  assert.equal(r.hub.sessions.size, 0);
});
console.log(`net_hub_test: ${n}/${n} ok`);
