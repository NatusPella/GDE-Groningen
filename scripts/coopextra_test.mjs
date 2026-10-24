// Samen spelen (#428): de rest van de wereld van de host bij een gast (game/js/coopextra.js): verzamelen, coderen,
// lezen, bijhouden, en over een sessie met verlies. Geen three.js nodig.
import assert from 'node:assert/strict';
import * as X from '../game/js/coopextra.js';
import { encodeExtra, decodeExtra, MAX_EXTRA } from '../game/js/net/codec.js';
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostSession, ClientSession, EXTRA_HZ } from '../game/js/net/session.js';
import { checkHandshake, PROTO } from '../game/js/net/protocol.js';
import { pedId, kiesVoetgangers } from '../game/js/coopworld.js';

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
  assert.equal(u.voetgangers.length, 3, 'de dode ligt er nog (V_LIGT), alleen wie ver weg is, blijft thuis');
  assert.ok(u.voetgangers.find((p) => p.id === pedId(w.pedestrians[0])).flags & X.V_LIGT, 'een dode ligt op de grond');
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

t('misc: kermis, stuntavond en punten: coderen, lezen en afremmen', () => {
  const stunt = { x: 173.5, y: 108.25, props: [{ kind: 'parasol', x: 180, y: 110, alive: true }, { kind: 'table', x: 150.5, y: 100, alive: false }, { kind: 'kliko', x: 400, y: 100, alive: true }, { kind: 'onzin', x: 175, y: 105, alive: true }] };
  const s = X.leesStunt(X.codeerStunt(stunt));
  assert.equal(s.props.length, 2, 'wat ver weg is of onbekend, gaat niet mee');
  near(s.x, 173.5, 1e-4); assert.equal(s.props[0].kind, 'parasol'); near(s.props[0].x, 180, 0.3); assert.equal(s.props[1].alive, false); near(s.props[1].y, 100, 0.3);
  const volle = { x: 0, y: 0, props: Array.from({ length: 120 }, (_, i) => ({ kind: 'chair', x: (i % 10) - 5, y: Math.floor(i / 10) - 6, alive: true })) };
  assert.ok(X.codeerStunt(volle).length <= 255, 'past in een misc-stukje');
  assert.equal(X.leesStunt(new Uint8Array(4)), null);
  const p = X.leesPunten(X.codeerPunten([{ x: 1.5, y: -2, z: 0.5 }, { x: 10, y: 20 }]));
  assert.equal(p.length, 2); near(p[0].x, 1.5, 1e-6); near(p[1].z, 0, 1e-6);
  assert.equal(X.leesPunten(Uint8Array.of(3, 1, 2)), null);
  const g = X.nieuwGeheugen();
  const bron = { kermis: true, stunt, punten: [{ x: 5, y: 6, z: 0 }] };
  const a = X.maakMisc(bron, g, 10); assert.deepEqual(a.map((m) => m.tag), [X.MISC_KERMIS, X.MISC_STUNT, X.MISC_PUNTEN]);
  assert.equal(X.maakMisc(bron, g, 10.3).length, 0, 'ongewijzigd: niets nieuws binnen anderhalve seconde');
  assert.equal(X.maakMisc({ ...bron, kermis: false }, g, 10.4)[0].data[0], 0, 'een verandering gaat meteen');
  assert.equal(X.maakMisc(bron, g, 12).length, 3, 'en na een tijd ter controle weer alles');
  // over het bericht en de stand: een stukje vervalt als het te lang wegblijft
  const st = X.nieuweStand(); const w = wereld(2, 0);
  const u = X.verzamelExtra(w, BIJ, X.nieuwGeheugen(), { ...DEPS, misc: (bij, gh, nu) => X.maakMisc(bron, gh, nu) });
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(u, BIJ[0])), 20);
  assert.ok(st.misc.has(X.MISC_KERMIS) && st.misc.has(X.MISC_STUNT));
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(X.verzamelExtra(w, BIJ, X.nieuwGeheugen(), DEPS), BIJ[0])), 22);
  assert.ok(st.misc.has(X.MISC_KERMIS), 'blijft staan tot MISC_TTL');
  X.pasExtraToe(st, X.leesExtra(X.codeerExtra(X.verzamelExtra(w, BIJ, X.nieuwGeheugen(), DEPS), BIJ[0])), 25);
  assert.ok(!st.misc.has(X.MISC_KERMIS), 'en daarna is het weg');
});

// ---------------------------------------------------------------- #428: gevallen mensen, wapens, deuren, bruggen en sluizen, sprekers
t('gevallen en dode mensen, wie ertoe doet, wapen en gevecht', () => {
  const w = wereld(5, 0);
  w.pedestrians[0].ragdoll = { t: 99 };                                  // omgevallen: ligt
  w.pedestrians[1].state = 'dead'; w.pedestrians[1].deadUntil = 120;      // dood
  w.pedestrians[2].heldWeapon = 'knuppel'; w.pedestrians[2].attackFx = { type: 'melee', swing: 'bat', start: 99.8 };
  w.pedestrians[3].x = 100 + 95; w.pedestrians[3].y = 200; w.pedestrians[3].missionCrowd = true;  // 95 m: net buiten het gewone bereik, maar telt mee
  w.pedestrians[4].x = 100 + 95; w.pedestrians[4].y = 205;               // gewoon en te ver
  w.pedestrians[3].hitReact = { t: 99.9, dx: 1, dy: 0, k: 0.7 };
  const g = X.nieuwGeheugen();
  const u = X.verzamelExtra(w, [{ x: 100, y: 200 }], g, DEPS);
  const vl = (i) => (u.voetgangers.find((p) => p.id === pedId(w.pedestrians[i])) || {}).flags;
  assert.ok(vl(0) & X.V_LIGT, 'omgevallen'); assert.ok(vl(1) & X.V_LIGT, 'dood');
  assert.ok((vl(2) & X.V_WAPEN) && (vl(2) & X.V_AANVAL), 'wapen en klap');
  assert.ok(vl(3) !== undefined, 'iemand van een opdracht op 95 m komt mee'); assert.ok(vl(3) & X.V_GERAAKT, 'en wordt geraakt');
  assert.equal(vl(4), undefined, 'een gewone voetganger op 95 m niet');
  const mp = u.misc.find((m) => m.tag === X.MISC_PEDS); assert.ok(mp, 'het wapen gaat mee als stukje');
  const px = X.leesPeds(mp.data); const e = px.get(pedId(w.pedestrians[2]));
  assert.deepEqual(e, { wapen: 'knuppel', fx: 'melee', swing: 'bat' });
  // de snapshot (coopworld.js) kiest dezelfde mensen
  const wl = require_kies(w);
  assert.deepEqual(wl.sort(), [0, 1, 2, 3].map((i) => pedId(w.pedestrians[i])).sort());
});
function require_kies(w) { return kiesVoetgangers(w, [{ x: 100, y: 200 }]).map(({ p }) => pedId(p)); }

t('deuren: masker per voertuig, coderen, lezen', () => {
  const v1 = { id: 7, x: 105, y: 205, model: { name: 'sedan' }, doors: { open: { vl: 1 }, want: { vl: 1, ar: 1 }, loose: {}, hold: {}, dmg: {} } };
  const v2 = { id: 8, x: 108, y: 205, model: { name: 'hatch' } };                       // geen deurstand: dicht
  const v3 = { id: 9, x: 5000, y: 5000, model: { name: 'sedan' }, doors: { open: { vl: 1 }, want: {}, loose: {}, hold: {}, dmg: {} } }; // ver weg
  const l = X.deurMasker({ vehicles: [v1, v2, v3] }, [{ x: 100, y: 200 }]);
  assert.equal(l.length, 1); assert.equal(l[0].id, 7); assert.equal(l[0].mask, 0b1001, 'voordeur links (0) en rechtsachter (3)');
  const m = X.leesDeuren(X.codeerDeuren(l)); assert.equal(m.get(7), 0b1001);
  assert.equal(X.leesDeuren(Uint8Array.of(2, 0, 7)), null, 'afgekapt');
  assert.equal(X.codeerDeuren([]).length, 1, 'geen open deuren: één byte');
});

t('bruggen en sluizen: coderen, lezen, alleen wat beweegt', () => {
  const brug = (state, open, boom, x = 100) => ({ state, open, boom, x, y: 200 });
  const sl = { x: 130, y: 205, state: 'opening', at: 1, gate: [0.25, 0.5], level: -1.234 };
  const l = X.maakWereldLijst([brug('closed', 0, 0), brug('opening', 0.4, 1), brug('open', 1, 1, 9000)], [sl, { ...sl, x: 8000 }], [{ x: 100, y: 200 }]);
  assert.equal(l.length, 2, 'een gesloten brug, een verre brug en een verre sluis blijven thuis');
  const r = X.leesWereld(X.codeerWereld(l));
  assert.equal(r.length, 2);
  assert.equal(r[0].soort, X.WERELD_BRUG); assert.equal(r[0].staat, 'opening'); near(r[0].a, 0.4, 0.005); near(r[0].b, 1, 0.005);
  assert.equal(r[1].soort, X.WERELD_SLUIS); assert.equal(r[1].staat, 'opening'); assert.equal(r[1].kant, 1); near(r[1].a, 0.25, 0.005); near(r[1].b, 0.5, 0.005); near(r[1].peil, -1.23, 0.01);
  assert.equal(X.leesWereld(Uint8Array.of(1, 0, 0)), null, 'te kort');
  assert.equal(X.leesWereld(Uint8Array.of(0)).length, 0, 'leeg mag');
});

t('sprekers zonder voetganger: naam en tekst komen mee, binnen de grenzen', () => {
  const sp = [{ x: 101, y: 201, h: 2.3, female: false, speechName: 'Kermisbaas Jan', speechText: 'Kom maar binnen, joh!', speechUntil: 105 },
    { x: 0, y: 0, follow: { x: 103, y: 202 }, h: 2.2, female: true, speechName: 'Hilje', speechText: 'Moi! ' + 'x'.repeat(200), speechUntil: 105 },
    { x: 9000, y: 9000, speechText: 'ver weg', speechUntil: 105 }, { x: 100, y: 200, speechText: 'verlopen', speechUntil: 90 }];
  const l = X.maakSprekersLijst(sp, 100, [{ x: 100, y: 200 }]);
  assert.equal(l.length, 2); assert.equal(l[1].x, 103, 'volgt de voetganger'); assert.equal(l[1].tekst.length, X.SPRAAK_MAX_TEKENS);
  const r = X.leesSprekers(X.codeerSprekers(l));
  assert.equal(r.length, 2); assert.equal(r[0].naam, 'Kermisbaas Jan'); assert.equal(r[0].tekst, 'Kom maar binnen, joh!'); assert.equal(r[1].vrouw, true); near(r[0].h, 2.3, 0.06);
  assert.ok(X.codeerSprekers(l).length <= 255, 'past in één stukje');
  assert.equal(X.leesSprekers(Uint8Array.of(1, 0, 0)), null);
});

t('alles in één bericht: de nieuwe stukjes gaan mee, komen aan, en blijven binnen het budget', () => {
  const w = wereld(12, 6); w.pedestrians[2].heldWeapon = 'pistol'; w.pedestrians[3].state = 'dead';
  w.vehicles = [{ id: 7, x: 105, y: 205, model: { name: 'sedan' }, doors: { open: { vl: 1 }, want: { vl: 1 }, loose: {}, hold: {}, dmg: {} } }];
  w.extraSpeakers = [{ x: 101, y: 201, h: 2.3, speechName: 'Kermisbaas Jan', speechText: 'Kom maar binnen, joh!', speechUntil: 105 }];
  const deps = { ...DEPS, wereld: (bij) => X.maakWereldLijst([{ state: 'booms', open: 0, boom: 0.5, x: 110, y: 205 }], [], bij), sprekers: (bij, nu) => X.maakSprekersLijst(w.extraSpeakers, nu, bij) };
  const g = X.nieuwGeheugen(); const st = X.nieuweStand();
  const buf = X.codeerExtra(X.verzamelExtra(w, BIJ, g, deps), BIJ[0]);
  assert.ok(buf.length <= X.MAX_LADING, 'binnen het pakket: ' + buf.length);
  const b = X.leesExtra(buf); assert.ok(b, 'leesbaar');
  X.pasExtraToe(st, b, 10);
  for (const tag of [X.MISC_PEDS, X.MISC_DEUREN, X.MISC_WERELD, X.MISC_SPREKERS]) assert.ok(st.misc.has(tag), 'stukje ' + tag);
  assert.equal(X.leesDeuren(st.misc.get(X.MISC_DEUREN).data).get(7), 1);
  // niets veranderd: binnen MISC_EVERY geen nieuwe stukjes (bandbreedte)
  w.time = 100.5; const klein = X.codeerExtra(X.verzamelExtra(w, BIJ, g, deps), BIJ[0]);
  assert.ok(klein.length < buf.length - 20, 'volgende keer zonder de stukjes: ' + klein.length + ' < ' + buf.length);
  // de deur gaat dicht en er is geen wapen meer: één leeg stukje zodat de gast het weet
  w.vehicles[0].doors.want.vl = 0; w.vehicles[0].doors.open.vl = 0; w.pedestrians[2].heldWeapon = null; w.time = 100.6;
  const u = X.verzamelExtra(w, BIJ, g, deps);
  const d = u.misc.find((m) => m.tag === X.MISC_DEUREN); assert.ok(d && X.leesDeuren(d.data).size === 0, 'leeg stukje voor de deuren');
  assert.ok(u.misc.find((m) => m.tag === X.MISC_PEDS && X.leesPeds(m.data).size === 0), 'leeg stukje voor de wapens');
  w.time = 102; const u2 = X.verzamelExtra(w, BIJ, g, deps);
  assert.ok(!u2.misc.find((m) => m.tag === X.MISC_DEUREN), 'en daarna niets meer');
});

t('garagepoort van de host, en een stukje dat deze versie niet kent', () => {
  const l = X.maakWereldLijst([], [], [{ x: 100, y: 200 }], { x: 110, y: 205, open: 0.75 });
  assert.equal(l.length, 1); assert.equal(l[0].soort, X.WERELD_GARAGE);
  const r = X.leesWereld(X.codeerWereld(l)); assert.equal(r[0].soort, X.WERELD_GARAGE); near(r[0].a, 0.75, 0.005);
  assert.equal(X.maakWereldLijst([], [], [{ x: 100, y: 200 }], { x: 110, y: 205, open: 0 }).length, 0, 'dicht: niets te melden');
  assert.equal(X.maakWereldLijst([], [], [{ x: 100, y: 200 }], { x: 9000, y: 205, open: 1 }).length, 0, 'ver weg: niets te melden');
  // een nieuwere host kent een stukje (tag 99) dat deze gast niet kent: het mag de rest niet breken
  const w = wereld(2, 0); const g = X.nieuwGeheugen();
  const u = X.verzamelExtra(w, BIJ, g, { ...DEPS, misc: () => [{ tag: 99, data: Uint8Array.of(1, 2, 3) }] });
  const b = X.leesExtra(X.codeerExtra(u, BIJ[0])); assert.ok(b && b.misc.some((m) => m.tag === 99), 'wordt gelezen');
  const st = X.nieuweStand(); X.pasExtraToe(st, b, 5); assert.equal(st.voetgangers.size, 2, 'en de rest komt gewoon aan');
  assert.equal(X.leesDeuren(Uint8Array.of(0)).size, 0); assert.equal(X.leesPeds(Uint8Array.of(0)).size, 0);
  assert.equal(X.leesPeds(Uint8Array.of(1, 0, 5, 200, 1, 2)), null, 'een wapennaam die langer is dan het stukje: afgewezen');
});

t('een reuzenvogel bij een gast is uitgesloten (#433)', () => {
  for (const k of X.DIER_SOORTEN) { const max = X.DIER_MAX_SCHAAL[k]; assert.ok(max > 0 && max <= 3.5, `${k} heeft een grens`); }
  assert.equal(X.veiligeDierSchaal('pigeon', 6), 1, 'een duif wordt bij een gast nooit 6 maal');
  assert.equal(X.veiligeDierSchaal('seagull', 1), 1);
  assert.equal(X.veiligeDierSchaal('duck', 3.1), 3.1, 'de zwaan houdt zijn eigen bouw');
  assert.equal(X.veiligeDierSchaal('duck', 12), 3.1);
  assert.equal(X.veiligeDierSchaal('cow', NaN), 1, 'een ongeldige schaal valt terug op de eigen bouw');
  assert.equal(X.veiligeDierSchaal('cow', 0), 1);
  assert.equal(X.veiligeDierSchaal('draak', 1), null, 'een onbekende soort wordt niet getekend');
});

// ----- #452: tijdelijke rekwisieten en de lijst met doelen
const rek = (i, extra = {}) => ({ x: 100 + i * 3, y: 200 + (i % 5), z: 1.5, hoek: i * 0.3, staat: i % 4, id: i, soort: X.REKW_SOORTEN[i % X.REKW_SOORTEN.length], ...extra });

t('rekwisieten: rondreis van plek, hoek, staat, klein en kleur', () => {
  const lijst = X.verzamelRekwisieten(BIJ, () => [rek(0, { klein: true }), rek(1, { kleur: '#3a7fd5' }), rek(2, { z: 12.3 })]);
  assert.equal(lijst.length, 3);
  const stukken = X.codeerRekwisieten(lijst); assert.equal(stukken.length, 1); assert.ok(stukken[0].length <= 255);
  const l = X.leesRekwisieten(stukken[0]); assert.equal(l.length, 3);
  const a = l.find((r) => r.id === 0), b = l.find((r) => r.id === 1), c = l.find((r) => r.id === 2);
  assert.equal(a.soort, 'laser'); assert.ok(a.klein); near(a.x, 100, 0.03); near(a.y, 200, 0.03); near(a.z, 1.5, 0.06); near(a.hoek, 0, 0.03);
  assert.equal(b.soort, 'zekering'); assert.equal(b.kleur, '#3a7fd5'); assert.equal(b.staat, 1); assert.ok(!b.klein);
  near(c.z, 12.3, 0.06); near(b.hoek, 0.3, 0.03);
});

t('rekwisieten: budget van 40, de dichtstbijzijnde eerst, ver weg valt af', () => {
  const veel = Array.from({ length: 90 }, (_, i) => rek(i, { x: 100 + i * 2, y: 200 }));
  veel.push(rek(95, { x: 9000, y: 9000 }));
  const lijst = X.verzamelRekwisieten(BIJ, () => veel);
  assert.equal(lijst.length, X.MAX_REKWISIETEN);
  assert.ok(lijst.every((r) => Math.hypot(r.x - 100, r.y - 200) <= X.REKW_RADIUS + 25), 'alles binnen bereik van een speler');
  const nu = lijst.map((r) => Math.min(...BIJ.map((b) => Math.hypot(r.x - b.x, r.y - b.y))));
  for (let i = 1; i < nu.length; i++) assert.ok(nu[i] >= nu[i - 1] - 1e-9, 'oplopend naar afstand');
  const wel = X.verzamelRekwisieten(BIJ, () => veel.filter((r) => r.x < 400));
  const stukken = X.codeerRekwisieten(wel);
  assert.ok(stukken.length <= 2 && stukken.every((s) => s.length <= 255));
  const terug = stukken.flatMap((s) => X.leesRekwisieten(s));
  assert.ok(terug.length >= 30, `bijna alles past in twee stukken (${terug.length})`);
  const kleurig = X.verzamelRekwisieten(BIJ, () => Array.from({ length: 60 }, (_, i) => rek(i, { kleur: 0xff0000 })));
  assert.ok(X.codeerRekwisieten(kleurig).every((s) => s.length <= 255), 'ook met kleur nooit meer dan 255 bytes');
});

t('rekwisieten: register, een falende bron en een bron zonder bekende soort', () => {
  X.wisRegistratie();
  X.registreerRekwisieten('wapendrop', () => [{ x: 105, y: 205, id: 7 }]);
  X.registreerRekwisieten('kapot', () => { throw new Error('stuk'); });
  X.registreerRekwisieten('onbekend', () => [{ x: 105, y: 205 }]);
  X.registreerRekwisieten('spijkermat', () => [{ x: 106, y: 205, hoek: 1 }, { x: NaN, y: 1 }]);
  const lijst = X.verzamelRekwisieten(BIJ);
  assert.deepEqual(lijst.map((r) => r.soort).sort(), [X.REKW_SOORTEN.indexOf('wapendrop'), X.REKW_SOORTEN.indexOf('spijkermat')].sort());
  X.registreerRekwisieten('wapendrop', null);
  assert.equal(X.verzamelRekwisieten(BIJ).length, 1, 'afmelden werkt');
  X.wisRegistratie();
  assert.equal(X.verzamelRekwisieten(BIJ).length, 0);
});

t('doelen: rondreis, label bijgesneden, budget en vals bericht', () => {
  const doelen = [{ id: 1, x: 500, y: 600, soort: 'doel', label: 'Naar de Grote Markt' }, { id: 2, x: 120, y: 205, soort: 'controle', label: 'Controlepunt é' }, { id: 3, x: 90, y: 190, soort: 'inbraak', label: 'x'.repeat(100) }];
  const lijst = X.verzamelDoelen(BIJ, () => doelen);
  assert.deepEqual(lijst.map((d) => d.id), [2, 3, 1], 'dichtstbijzijnde eerst; ook ver weg gaat mee');
  const b = X.codeerDoelen(lijst); assert.ok(b.length <= 255);
  const l = X.leesDoelen(b); assert.equal(l.length, 3);
  assert.equal(l[0].soort, 'controle'); assert.equal(l[0].label, 'Controlepunt é'); assert.equal(l[1].soort, 'inbraak'); assert.equal(l[1].label.length, X.DOEL_LABEL_BYTES);
  near(l[2].x, 500, 0.001); assert.equal(l[2].label, 'Naar de Grote Markt');
  const veel = X.verzamelDoelen(BIJ, () => Array.from({ length: 30 }, (_, i) => ({ id: i, x: i * 10, y: 0, label: 'doel ' + i })));
  assert.equal(veel.length, X.MAX_DOELEN);
  assert.ok(X.codeerDoelen(veel).length <= 255);
  assert.equal(X.leesDoelen(Uint8Array.of(0)).length, 0);
  assert.equal(X.leesDoelen(Uint8Array.of(1, 0, 0, 0, 0, 0)), null, 'te kort: afgewezen');
  assert.equal(X.leesDoelen(Uint8Array.of(99)), null, 'te veel doelen: afgewezen');
  let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < 3000; i++) { const z = b.slice(); for (let j = 0; j < 4; j++) z[Math.floor(rnd() * z.length)] = Math.floor(rnd() * 256); X.leesDoelen(z); X.leesDoelen(z.subarray(0, Math.floor(rnd() * z.length))); }
  const rk = X.codeerRekwisieten(X.verzamelRekwisieten(BIJ, () => [rek(0), rek(1), rek(2)]))[0];
  for (let i = 0; i < 3000; i++) { const z = rk.slice(); for (let j = 0; j < 4; j++) z[Math.floor(rnd() * z.length)] = Math.floor(rnd() * 256); X.leesRekwisieten(z); X.leesRekwisieten(z.subarray(0, Math.floor(rnd() * z.length))); }
});

t('over het net: gast ziet rekwisieten en doelen; een oudere gast negeert de tags', () => {
  X.wisRegistratie();
  X.registreerRekwisieten('heist', () => [rek(0, { soort: 'laser' }), rek(1, { soort: 'kluis' })]);
  X.registreerDoelen(() => [{ id: 1, x: 300, y: 300, soort: 'doel', label: 'Kluis' }, { id: 2, x: 110, y: 205, soort: 'controle', label: 'Punt' }]);
  const w = wereld(3, 0); const g = X.nieuwGeheugen();
  const u = X.verzamelExtra(w, BIJ, g, DEPS);
  const buf = X.codeerExtra(u, BIJ[0]); assert.ok(buf.length <= X.MAX_LADING);
  const d = X.leesExtra(buf); const tags = d.misc.map((m) => m.tag);
  assert.ok(tags.includes(X.MISC_REKWISIETEN) && tags.includes(X.MISC_DOELEN) && !tags.includes(X.MISC_REKWISIETEN2));
  const st = X.nieuweStand(); X.pasExtraToe(st, d, 10);
  assert.deepEqual(X.standRekwisieten(st, 10.5).map((r) => r.soort).sort(), ['kluis', 'laser']);
  assert.deepEqual(X.standDoelen(st, 10.5).map((r) => r.label), ['Punt', 'Kluis']);
  assert.equal(X.standDoelen(st, 20).length, 0, 'verlopen: weg');
  assert.deepEqual(X.gastDoelen({ time: 10.5, coopExtra: st }).map((x) => x.label), ['Punt', 'Kluis']);
  assert.deepEqual(X.gastDoelen({ time: 10, coopExtra: X.nieuweStand(), coopHost: { doelen: [{ x: 5, y: 6 }, { x: 7, y: 8 }] } }), [{ id: 0, soort: 'doel', x: 5, y: 6, label: '' }], 'oudere host: het ene doel uit de snapshot');
  // een oudere gast: kent de tags niet en leest de rest gewoon (zelfde EXTRA-formaat; PROTO en versie blijven)
  assert.equal(X.EXTRA_VERSIE, 1); const oudeGast = (x) => x.misc.filter((m) => m.tag <= X.MISC_SPREKERS);
  assert.ok(oudeGast(d).length < d.misc.length); const st2 = X.nieuweStand(); X.pasExtraToe(st2, { ...d, misc: oudeGast(d) }, 1); assert.equal(st2.voetgangers.size, 3);
  // alles weg: een leeg bericht ruimt de gast op
  X.wisRegistratie(); w.time += 2;
  const u2 = X.verzamelExtra(w, BIJ, g, DEPS);
  const d2 = X.leesExtra(X.codeerExtra(u2, BIJ[0])); X.pasExtraToe(st, d2, 12);
  assert.equal(X.standRekwisieten(st, 12).length, 0); assert.equal(X.standDoelen(st, 12).length, 0);
  X.wisRegistratie();
});


console.log(`coopextra_test: ${n}/${n} ok`);
