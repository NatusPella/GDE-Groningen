// #589 (codebase-review multiplayer/netwerk): levensduur en misbruik van de
// host/guest-verbinding. Een kick is blijvend (late HELLO's en een oude verbinding
// komen er niet terug), een verbinding die blijft weigeren gaat dicht in plaats van
// WELCOME's te blijven sturen, een gast met een structureel volle wachtrij wordt
// netjes losgelaten, en het transport gaat bij vertrek/kick echt dicht.
//   node scripts/net_lifecycle_test.mjs
import assert from 'node:assert/strict';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostHub } from '../game/js/net/hub.js';
import { ClientSession, SLUIT_NA_MS, REJECTED_MAX, OVERFLOW_MAX_S } from '../game/js/net/session.js';
import { T, encodeJson } from '../game/js/net/codec.js';

let n = 0, fails = 0;
const t = async (name, f) => {
  try { await f(); n++; console.log(`ok ${name}`); }
  catch (e) { fails++; console.log(`FAIL ${name}: ${(e && e.stack) || e}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const INFO = { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' };

function room({ max = 4 } = {}) {
  const log = { leaves: [] };
  const sim = {
    applyInput() {},
    snapshot() { return { players: [{ slot: 0, x: 0, y: 0, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }; },
    fullState: () => ({}),
  };
  const hub = new HostHub({
    info: INFO, seed: 1, sim, max, caps: ['scene'], rand: makeRng(5),
    onLeave: (slot, why) => log.leaves.push([slot, why]),
  });
  const clients = [], links = [];
  const add = (wish) => {
    const l = createLink({ latency: 0.02, jitter: 0, seed: clients.length + 10 });
    hub.accept(l.a);
    const c = new ClientSession(l.b, { info: { ...INFO, char: wish }, caps: ['scene'] }, makeRng(clients.length + 10));
    clients.push(c); links.push(l); return c;
  };
  const step = (secs, dt = 1 / 60) => { for (let i = 0; i < secs / dt; i++) { hub.tick(dt); for (const c of clients) c.tick(dt); for (const l of links) l.advance(dt); } };
  const hostSes = (slot = 1) => hub.sessions.get(slot) || [...hub.sessions.values()][0] || null;
  return { hub, log, clients, links, add, step, hostSes };
}
const hello = (body) => encodeJson(T.HELLO, 0, 0, 0, body);

await t('een gekickte gast krijgt op dezelfde verbinding geen tweede plek; daarna gaat de verbinding dicht', async () => {
  const r = room(); const a = r.add(), b = r.add('bram'); r.step(2);
  const ses = r.hostSes(1);
  assert.ok(ses && ses.guest, 'de gast zit op plek 1');
  r.hub.kick(1);
  // de gekickte client negeert het weg-bericht en stuurt een geldige hello met zijn eigen token
  r.links[0].b.send(hello({ ...INFO, caps: [], token: a.token }));
  r.step(0.5);
  assert.equal(r.hub.sessions.get(1), ses, 'dezelfde sessie, geen nieuwe kennismaking');
  assert.equal(r.hub.roster.spelers.filter((s) => s.slot >= 1).length, 2, 'geen extra plek');
  assert.equal(b.status, 'ok', 'de rest speelt door');
  // de gastheer laat de plek los; een late hello op de oude verbinding doet niets meer
  r.hub.release(1);
  r.links[0].b.send(hello({ ...INFO, caps: [], token: a.token }));
  assert.equal(r.hub.sessions.has(1), false);
  assert.equal(r.hub.pending.size, 0);
  await wait(SLUIT_NA_MS + 100);
  assert.equal(r.links[0].a.isOpen(), false, 'de oude verbinding is gesloten');
  assert.equal(b.status, 'ok');
});

await t('een verbinding die blijft weigeren wordt begrensd en daarna gesloten', async () => {
  const r = room();
  const l = createLink({ latency: 0.01, seed: 7 }); r.hub.accept(l.a);
  const c = new ClientSession(l.b, { info: { ...INFO, version: 'oud' } }, makeRng(7));
  r.clients.push(c); r.links.push(l);
  r.hub.tick(1 / 60); c.tick(1 / 60); l.advance(1 / 60);
  const ses = [...r.hub.pending][0];
  assert.ok(ses, 'de verbinding wacht op een plek');
  // een kwaadwillende blijft HELLO's sturen; een gewone ClientSession stopt na de eerste weigering
  for (let i = 0; i < 6; i++) { l.b.send(hello({ ...INFO, version: 'oud' })); l.advance(0.02); r.hub.tick(1 / 60); }
  assert.equal(ses.gesloten, true, 'na vijf mislukte kennismakingen gaat de verbinding dicht');
  assert.ok(ses.rejected.length <= REJECTED_MAX, `rejected blijft begrensd (${ses.rejected.length})`);
  assert.deepEqual([...new Set(ses.rejected)], ['versie']);
  await wait(SLUIT_NA_MS + 100);
  r.hub.tick(1 / 60);
  assert.equal(r.hub.pending.size, 0, 'de hub ruimt de gesloten verbinding op');
});

await t('een spelende gast die blijft HELLO-en kost geen WELCOME en groeit rejected niet', async () => {
  const r = room(); const c = r.add(); r.step(2);
  const ses = [...r.hub.sessions.values()][0];
  const voor = ses.rejected.length;
  for (let i = 0; i < 12; i++) r.links[0].b.send(hello({ ...INFO, caps: [], token: c.token }));
  r.step(0.5);
  assert.equal(ses.rejected.length, voor, 'geen nieuwe afwijzingen');
  assert.equal(ses.badHellos, 0);
  assert.equal(c.status, 'ok');
  assert.equal(r.hub.sessions.size, 1);
});

await t('vertrek en closeAll sluiten het transport echt', async () => {
  const r = room(); const c = r.add(); r.step(2);
  c.leave();
  r.step(0.2); // het BYE-bericht komt aan; de host laat de plek los
  assert.equal(r.hub.sessions.size, 0);
  await wait(SLUIT_NA_MS + 100);
  assert.equal(r.links[0].a.isOpen(), false, 'de gast sluit zijn kant');
  assert.equal(r.links[0].b.isOpen(), false, 'en de host ook');

  const r2 = room(); r2.add(); r2.add('bram'); r2.step(2);
  r2.hub.closeAll();
  await wait(SLUIT_NA_MS + 100);
  assert.ok(r2.links.every((l) => !l.a.isOpen() && !l.b.isOpen()), 'alles dicht na closeAll');
});

await t('een gast met een structureel volle wachtrij wordt losgelaten, niet stil vergeten', async () => {
  const r = room(); const c = r.add(); r.step(2);
  const ses = [...r.hub.sessions.values()][0];
  const warns = []; const orig = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    for (let i = 0; i < 40; i++) r.hub.announce({ k: 'test', i });
    assert.equal(ses.rel.pending.length, ses.rel.maxPending, 'de wachtrij zit vol');
    assert.ok(ses.dropped >= 1, 'weggevallen berichten worden geteld');
    // geen enkel ACK meer: de wachtrij blijft vol en de host verbreekt na OVERFLOW_MAX_S
    for (let i = 0; i < Math.ceil(OVERFLOW_MAX_S * 60) + 60; i++) r.hub.tick(1 / 60);
    assert.equal(r.hub.sessions.size, 0, 'de host heeft de gast met een afscheid laten gaan');
    assert.equal(r.hub.roster.spelers.filter((s) => s.slot >= 1).length, 0);
    assert.ok(warns.some((w) => /wachtrij/.test(w)), warns.join(' | '));
  } finally { console.warn = orig; }
  await wait(SLUIT_NA_MS + 100);
  assert.equal(r.links[0].a.isOpen(), false, 'de verbinding is opgeruimd');
});

console.log(`net_lifecycle_test: ${n}/${n + fails} ok`);
if (fails) process.exit(1);
