// Samen spelen (#428): de rest van de wereld van de host bij een gast (game/js/coopextra.js): verzamelen, coderen,
// lezen, bijhouden, en over een sessie met verlies. Geen three.js nodig.
import assert from 'node:assert/strict';
import * as X from '../game/js/coopextra.js';
import { encodeExtra, decodeExtra, MAX_EXTRA } from '../game/js/net/codec.js';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostSession, ClientSession, EXTRA_HZ } from '../game/js/net/session.js';
import { checkHandshake, PROTO } from '../game/js/net/protocol.js';
import { pedId } from '../game/js/coopworld.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`);

const ped = (i, extra = {}) => ({ x: 100 + i * 2, y: 200 + i, angle: 0.5, speed: 1.4, health: 30, state: 'wander', clothing: '#b8473a', skin: '#d9aa82', hasBag: i % 3 === 0, isCop: false, _lookSeed: 123.456789 + i, ...extra });
const dier = (i, kind, extra = {}) => ({ kind, x: 110 + i * 3, y: 205 - i * 2, angle: 1.0, speed: 0.6, bobSeed: 1.23456 + i, ...extra });
const wereld = (np = 12, nd = 6) => ({
  time: 100, pedestrians: Array.from({ length: np }, (_, i) => ped(i)),
  wildlife: [dier(0, 'cow', { variant: 'red' }), dier(1, 'sheep'), dier(2, 'duck', { variant: 'swan' }), dier(3, 'dog', { breed: 2, color: 0.5 }), dier(4, 'cat', { variant: 3 }), dier(5, 'pigeon')].slice(0, nd),
});
const BIJ = [{ x: 100, y: 200 }, { x: 120, y: 210 }];
const DEPS = {
  controllers: [{ x: 105, y: 205, t: 3.5 }, { x: 5000, y: 5000, t: 1 }, { x: 140, y: 190, t: 20.25 }],
  gebroken: () => [{ key: 'bin@1000,2000', kind: 'bin', x10: 1000, y10: 2000 }, { key: 'lamp@-55,60', kind: 'lamp', x10: -55, y10: 60 }, { key: 'stunt1-bin-0', kind: 'onbekend', x10: 0, y10: 0 }],
};

t('codec: EXTRA rondreis, grens en rommel', () => {
  const lading = Uint8Array.from({ length: 300 }, (_, i) => i & 255);
  const b = encodeExtra(65535, 9, 0, lading);
  const d = decodeExtra(b);
  assert.equal(d.seq, 65535); assert.deepEqual([...d.payload], [...lading]);
  assert.equal(decodeExtra(b.subarray(0, b.length - 1)), null);
  assert.equal(b.length, 13 + 300);
  assert.equal(encodeExtra(1, 1, 0, new Uint8Array(5000)).length, 13 + MAX_EXTRA, 'een te grote lading wordt afgekapt');
  assert.equal(decodeExtra(new Uint8Array(20)), null);
});

t('verzamelen: dichtbij en soorten; uiterlijk alleen voor nieuwe id\'s', () => {
  const w = wereld(); const g = X.nieuwGeheugen();
  const u = X.verzamelExtra(w, BIJ, g, DEPS);
  assert.equal(u.voetgangers.length, 12);
  assert.equal(u.uiterlijk.length, X.LOOK_PER_BERICHT, 'hoogstens 8 uiterlijken per bericht');
  assert.equal(u.dieren.length, 6);
  assert.equal(u.lichten.length, 2, 'het complex van 5 km weg gaat niet mee');
  assert.deepEqual(u.kapot.map((k) => k.soort), [X.KAPOT_SOORTEN.indexOf('bin'), X.KAPOT_SOORTEN.indexOf('lamp')]);
  const u2 = X.verzamelExtra(w, BIJ, g, DEPS);
  assert.equal(u2.uiterlijk.length, 4, 'de rest volgt in het volgende bericht');
  assert.equal(u2.kapot, null, 'kapotlijst alleen bij een verandering');
  const u3 = X.verzamelExtra(w, BIJ, g, DEPS);
  assert.equal(u3.uiterlijk.length, 0);
  w.time += X.KAPOT_VERVERS + 0.1; // verversen na een paar seconden
  const u4 = X.verzamelExtra(w, BIJ, g, DEPS);
  assert.equal(u4.uiterlijk.length, X.LOOK_PER_BERICHT);
  assert.ok(u4.kapot, 'en de kapotlijst ververst na een paar seconden');
});

t('verzamelen: dood, ver weg en vlaggen', () => {
  const w = wereld(4, 0);
  w.pedestrians[0].state = 'dead'; w.pedestrians[1].x = 9000; w.pedestrians[2].greetUntil = 105; w.pedestrians[2].speechText = 'Goedemorgen!'; w.pedestrians[2].speechUntil = 103;
  w.pedestrians[3].party = true; w.pedestrians[3].speed = 3.4;
  const u = X.verzamelExtra(w, BIJ, X.nieuwGeheugen(), DEPS);
  assert.equal(u.voetgangers.length, 2);
  const a = u.voetgangers.find((p) => p.id === pedId(w.pedestrians[2]));
  assert.ok(a.flags & X.V_GROET); assert.ok(a.flags & X.V_SPREEKT); assert.equal(u.spraak[0].tekst, 'Goedemorgen!');
  const b = u.voetgangers.find((p) => p.id === pedId(w.pedestrians[3]));
  assert.ok(b.flags & X.V_FEEST); assert.equal(b.speed, 34);
});

t('coderen en lezen: alles komt precies terug', () => {
  const w = wereld(); w.pedestrians[2].look = { top: 'hoodie', hat: 'cap', hatColor: 0x2a2a2a }; w.pedestrians[2].carry = 'paper'; w.pedestrians[1].isCop = true; w.pedestrians[1].clothing = '#1f3f8f';
  w.pedestrians[0].speechText = 'Moi!'; w.pedestrians[0].speechUntil = 101;
  const g = X.nieuwGeheugen();
  const u = X.verzamelExtra(w, BIJ, g, { ...DEPS, misc: () => [{ tag: X.MISC_KERMIS, data: Uint8Array.of(1, 2, 3) }] });
  const buf = X.codeerExtra(u, BIJ[0]);
  assert.ok(buf.length <= X.MAX_LADING);
  const d = X.leesExtra(buf);
  assert.ok(d, 'leesbaar');
  assert.equal(d.voetgangers.length, 12); near(d.voetgangers[0].speed, 1.4, 0.05);
  const l2 = d.uiterlijk.find((x) => x.id === pedId(w.pedestrians[2]));
  assert.ok(l2, 'de voetganger met een look zit bij de eerste acht');
  assert.deepEqual(l2.look, { top: 'hoodie', hat: 'cap', hatColor: 0x2a2a2a }); assert.equal(l2.draagt, 'paper');
  const l1 = d.uiterlijk.find((x) => x.id === pedId(w.pedestrians[1]));
  assert.ok(l1.agent); assert.equal(l1.kleding, '#1f3f8f');
  const eerste = d.uiterlijk[0], bron = w.pedestrians.find((p) => pedId(p) === eerste.id);
  assert.equal(eerste.huid, bron.skin); assert.equal(eerste.zaad, bron._lookSeed, 'het uiterlijkzaad is bit voor bit gelijk');
  assert.equal(d.dieren.length, 6);
  const koe = d.dieren.find((x) => x.soort === 'cow'); assert.equal(koe.var, 1); near(koe.x, 110, 0.03); near(koe.y, 205, 0.03); near(koe.hoek, 1.0, 0.03); near(koe.bob, Math.floor(1.23456 * 1000) / 1000, 1e-9);
  assert.equal(Math.floor(d.dieren.find((x) => x.soort === 'pigeon').bob * 10) % 4, Math.floor((1.23456 + 5) * 10) % 4, 'duivenvariant blijft gelijk');
  assert.equal(d.dieren.find((x) => x.soort === 'dog').var, 2); near(d.dieren.find((x) => x.soort === 'dog').aux, 128, 1);
  assert.equal(d.lichten.length, 2); near(d.lichten[1].t, 20.25, 0.01);
  assert.deepEqual(d.kapot.map((k) => k.key), ['bin@1000,2000', 'lamp@-55,60']);
  assert.equal(d.spraak[0].tekst, 'Moi!');
  assert.deepEqual([...d.misc[0].data], [1, 2, 3]);
});

t('lezen: willekeurige rommel levert null of iets geldigs, nooit een fout', () => {
  const w = wereld(); const u = X.verzamelExtra(w, BIJ, X.nieuwGeheugen(), DEPS);
  const base = X.codeerExtra(u, BIJ[0]);
  let s = 99; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < 3000; i++) {
    const b = base.slice(); for (let j = 0; j < 5; j++) b[Math.floor(rnd() * b.length)] = Math.floor(rnd() * 256);
    X.leesExtra(b); X.leesExtra(b.subarray(0, Math.floor(rnd() * b.length)));
  }
  assert.equal(X.leesExtra(new Uint8Array(3)), null);
});

t('bijhouden: stand, verlopen en een tweede bericht', () => {
  const w = wereld(); const g = X.nieuwGeheugen(); const st = X.nieuweStand();
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(X.verzamelExtra(w, BIJ, g, DEPS), BIJ[0])), 10);
  assert.equal(st.voetgangers.size, 12); assert.equal(st.dieren.size, 6); assert.equal(st.kapot.length, 2); assert.equal(st.lichten.size, 2);
  w.pedestrians.length = 6; w.wildlife.length = 3; // weg uit bereik
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(X.verzamelExtra(w, BIJ, g, DEPS), BIJ[0])), 10.2);
  assert.equal(st.voetgangers.size, 12, 'even blijven staan');
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(X.verzamelExtra(w, BIJ, g, DEPS), BIJ[0])), 11.6);
  assert.equal(st.voetgangers.size, 6); assert.equal(st.dieren.size, 3);
  assert.equal(st.kapot.length, 2, 'de kapotlijst blijft tot een nieuwe komt');
  assert.ok(X.standVers(st, 12)); assert.ok(!X.standVers(st, 20));
});

t('lichtverschil: cyclisch', () => {
  near(X.lichtVerschil(47, 1, 48), 2, 1e-9); near(X.lichtVerschil(1, 47, 48), -2, 1e-9); near(X.lichtVerschil(10, 10.3, 48), 0.3, 1e-9);
});

t('over een sessie met verlies: de gast krijgt de stand en herstelt na verloren berichten', () => {
  const link = createLink({ latency: 0.04, loss: 0.25, seed: 11 });
  const w = wereld(); const geh = new Map();
  const sim = { applyInput() {}, snapshot() { return { players: [{ slot: 0, x: 100, y: 200, z: 0, angle: 0, alive: true, health: 100 }] }; }, fullState() { return {}; },
    extra(slot) { if (!geh.has(slot)) geh.set(slot, X.nieuwGeheugen()); return X.codeerExtra(X.verzamelExtra(w, BIJ, geh.get(slot), DEPS), BIJ[0]); } };
  const rand = makeRng(5);
  const INFO = { game: 'gde', proto: PROTO, version: '1', tiles: 'a', story: 's' };
  const host = new HostSession(link.a, { info: INFO, seed: 1, sim }, rand);
  const client = new ClientSession(link.b, { info: INFO }, rand);
  const st = X.nieuweStand(); let aantal = 0;
  client.onextra = (b) => { aantal++; X.pasExtraToe(st, X.leesExtra(b), client.now); };
  for (let i = 0; i < 60 * 8; i++) { host.tick(1 / 60); client.tick(1 / 60); link.advance(1 / 60); }
  assert.equal(client.status, 'ok');
  assert.ok(aantal >= 8 * EXTRA_HZ * 0.4, `genoeg berichten (${aantal})`);
  assert.equal(st.voetgangers.size, 12); assert.equal(st.uiterlijk.size, 12, 'alle uiterlijken zijn aangekomen ondanks verlies');
  assert.equal(st.kapot.length, 2);
});

t('een oude gast (proto 1) wordt niet toegelaten tot een host met proto 2', () => {
  assert.equal(PROTO, 2);
  assert.equal(checkHandshake({ game: 'gde', proto: 2, version: '1', tiles: 'a', story: 's' }, { game: 'gde', proto: 1, version: '1', tiles: 'a', story: 's' }).reason, 'protocol');
});

console.log(`coopextra_test: ${n}/${n} ok`);
