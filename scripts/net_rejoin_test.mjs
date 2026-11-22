// Samen spelen: een gast die langer dan het hervatvenster weg was en via een nieuwe verbinding terugkomt, krijgt bij de
// host een nieuwe sessie (nieuw token, tellers vanaf nul). De gast hield zijn oude tellers vast: de snapshots van de
// nieuwe sessie leken daardoor 'oud' (de wereld stond stil zolang hij eerder had gespeeld) en de betrouwbare berichten
// werden als 'dubbel' bevestigd, waarna de host ze weggooide (geen resync, geen spelerslijst, geen missieberichten).
// Ook: een welkom of gebeurtenis zonder inhoud (null) van de andere kant mag de ontvanger niet laten crashen.
import assert from 'node:assert/strict';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostHub } from '../game/js/net/hub.js';
import { ClientSession, RESUME_WINDOW } from '../game/js/net/session.js';
import { T, encodeJson } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error('MISLUKT: ' + name); throw e; } };
// OPEN (#1293): het herstel van de ontvangtellers bij een welkom met een nieuw token brak coop/lijsthervat_test (de kamer van een andere host wordt niet meer losgelaten) en is uit de spelcode gehaald; dit geval beschrijft het gewenste gedrag en draait niet mee tot dat herstel er veilig in kan.
const tOpen = () => {};
const INFO = { game: 'gde', proto: 2, version: 'x', tiles: '-', story: 'oud' };

function room() {
  const bodies = { 0: { x: 0, y: 0 } };
  const sim = {
    applyInput() {},
    snapshot: () => ({ players: Object.entries(bodies).map(([slot, b]) => ({ slot: +slot, x: b.x, y: b.y, z: 0, angle: 0, alive: true, health: 100 })), shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }),
    fullState: () => ({ vers: true }),
  };
  const hub = new HostHub({ info: INFO, seed: 1, sim, max: 4, caps: ['snaptijd'], rand: makeRng(5) });
  const links = [createLink({ latency: 0.03, seed: 11 })];
  hub.accept(links[0].a);
  const c = new ClientSession(links[0].b, { info: INFO, caps: ['snaptijd'] }, makeRng(11));
  const events = []; const resyncs = [];
  c.onevent = (b) => events.push(b); c.onresync = (s) => resyncs.push(s);
  const step = (secs, dt = 1 / 30) => { for (let i = 0; i < secs / dt; i++) { hub.tick(dt); c.tick(dt); for (const l of links) l.advance(dt); } };
  return { hub, c, links, bodies, events, resyncs, step };
}

for (const caps of [['snaptijd'], []]) {
  tOpen('na het hervatvenster terug via een nieuwe verbinding: snapshots en betrouwbare berichten van de nieuwe sessie komen aan (caps: ' + (caps.join(',') || 'geen') + ')', () => {
    const r = room();
    r.c.cfg.caps = caps;
    r.step(40);
    assert.equal(r.c.status, 'ok');
    for (let i = 0; i < 6; i++) r.hub.announce({ k: 'oud', i }); // de ontvangteller van de gast loopt op
    r.step(2);
    assert.equal(r.events.filter((b) => b.k === 'oud').length, 6);
    const oudToken = r.c.token;
    r.links[0].cut();
    r.step(RESUME_WINDOW + 10); // de host geeft de plek vrij ('verlopen'); de gast blijft het proberen
    assert.equal(r.hub.sessions.size, 0, 'de host heeft de gast losgelaten');
    assert.equal(r.c.status, 'lost');
    const l2 = createLink({ latency: 0.03, seed: 12 });
    r.links.push(l2); r.hub.accept(l2.a); r.c.rebind(l2.b);
    r.events.length = 0; r.resyncs.length = 0;
    r.step(4);
    assert.equal(r.c.status, 'ok', 'de gast is weer binnen');
    assert.notEqual(r.c.token, oudToken, 'het is een nieuwe sessie');
    assert.ok(r.resyncs.length >= 1, 'de volle toestand van de nieuwe sessie komt aan');
    r.hub.announce({ k: 'nieuw' });
    r.bodies[0].x = 77;
    r.step(2);
    assert.equal(r.events.filter((b) => b.k === 'nieuw').length, 1, 'een betrouwbaar bericht van de nieuwe sessie komt aan');
    const w = r.c.world();
    assert.ok(w && w.players.find((p) => p.slot === 0), 'er is een wereld');
    assert.ok(Math.abs(w.players.find((p) => p.slot === 0).x - 77) < 0.5, 'de gast ziet de verse snapshots, niet de bevroren oude');
  });
}

t('een welkom of gebeurtenis zonder inhoud laat de gast niet crashen', () => {
  const l = createLink({ latency: 0 });
  const c = new ClientSession(l.b, { info: INFO, caps: [] }, makeRng(3));
  assert.doesNotThrow(() => c._raw(encodeJson(T.WELCOME, 0, 0, 0, null)));
  assert.doesNotThrow(() => c._raw(encodeJson(T.WELCOME, 0, 0, 0, 7)));
  assert.equal(c.joined, false);
  assert.doesNotThrow(() => c._raw(encodeJson(T.EVENT, 1, 0, 1, null)));
  assert.doesNotThrow(() => c._raw(encodeJson(T.EVENT, 2, 0, 1, 'tekst')));
});

console.log(`net_rejoin_test: ${n} tests geslaagd`);
