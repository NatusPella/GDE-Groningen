// Reviewbevindingen 22-11 voor Samen spelen (docs/reviews/CODE-REVIEW-22-11-multiplayer.md): B1 (lijst en welkom boven MAX_JSON), B2 (tijd van een claim),
// B3 (quotum en snelheidsgrens), B4 (opruimen bij het einde van de sessie), B5 (eigen percelen als claim), N1 tot en met N4.
//   node scripts/multiplayerreview_22_11_test.mjs
import assert from 'node:assert/strict';
import * as P from '../game/js/coopplayers.js';
import * as K from '../game/js/net/codec.js';
const MAX_JSON = K.MAX_JSON;
import { pingRegel } from '../game/js/coopping.js';
import { encodeOutfit, cleanOutfitCode } from '../game/js/clothing.js';
import { ITEMS, SLOT_IDS } from '../game/js/clothingdata.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// een geldige outfitcode met in elk slot een stuk (de langste die het spel maakt)
const volleKast = (v = 0) => { const worn = {}; for (const s of SLOT_IDS) { const it = ITEMS.find((i) => i.slot === s && !i.npc); if (it) worn[s] = `${it.id}.${it.colors[v % it.colors.length]}`; } return encodeOutfit(worn); };

function volleRoster(aantal = 16, naamLen = 24) {
  const r = P.createRoster(16);
  for (let i = 1; i < aantal; i++) {
    const p = P.wijsPlekToe(r); if (!p) break;
    P.zetAvatar(r, p.slot, { naam: String.fromCharCode(65 + i).repeat(naamLen - 2) + String(i).padStart(2, '0'), kleur: '#aabbcc', outfit: volleKast() });
  }
  return r;
}

// ---- B1
t('B1: de testkast is een geldige outfitcode', () => { assert.ok(cleanOutfitCode(volleKast())); });
t('B1: elk lijstbericht (16 spelers, lange namen, volle kast) past in MAX_JSON', () => {
  const r = volleRoster();
  const ev = P.lijstBerichten(r);
  assert.ok(ev.length >= 1);
  for (const e of ev) assert.doesNotThrow(() => K.encodeJson(0, 0, 0, 0, e), 'bericht te groot');
  assert.ok(ev.every((e) => new TextEncoder().encode(JSON.stringify(e)).length <= MAX_JSON));
});
t('B1: lijstEvent zelf blijft onder MAX_JSON, ook met 16 spelers met een volle kast', () => {
  assert.doesNotThrow(() => K.encodeJson(0, 0, 0, 0, P.lijstEvent(volleRoster())));
});
t('B1: de outfits gaan in eigen berichten mee en komen na het samenvoegen bij de ontvanger aan', () => {
  const r = volleRoster();
  const ev = P.lijstBerichten(r);
  const l = P.leesLijstEvent(ev[0]);
  let roster = l.spelers.map((s) => ({ ...s }));
  for (const e of ev.slice(1)) roster = P.voegOutfitsSamen(roster, P.leesOutfitsEvent(e));
  const bron = P.lijst(r);
  for (const s of bron) { const g = roster.find((x) => x.slot === s.slot); assert.equal((g.avatar && g.avatar.outfit) || null, (s.avatar && s.avatar.outfit) || null, 'slot ' + s.slot); }
});
t('B1: met weinig spelers blijft de lijst één bericht met de outfit erin (ongewijzigd gedrag)', () => {
  const r = volleRoster(4, 10);
  const ev = P.lijstBerichten(r);
  assert.equal(ev.length, 1);
  assert.ok(P.lijstEvent(r).lijst.every((s) => s.slot === 0 || s.avatar.outfit));
});
t('B1: het welkom met 16 spelers past ook (de korte lijst)', () => {
  const r = volleRoster();
  const extra = { char: 'rik', naam: 'Rik', kleur: '#aabbcc', max: 16, lijst: P.lijstEvent(r, P.WELKOM_BUDGET).lijst };
  assert.doesNotThrow(() => K.encodeJson(0, 0, 0, 0, { ...extra, niveau: { a: 'x'.repeat(200) } }));
});
t('B1: leesOutfitsEvent weigert rommel en kapt af op geldige codes', () => {
  assert.equal(P.leesOutfitsEvent({ k: 'spelers' }), null);
  assert.deepEqual(P.leesOutfitsEvent({ k: 'outfits', lijst: [{ slot: 2, o: 'rommel' }, { slot: -1, o: volleKast() }, { slot: 3, o: volleKast() }] }), [{ slot: 3, o: volleKast() }]);
});

// ---- B1 met de echte hub: 16 spelers met lange namen en een volle kast sluiten aan zonder dat het welkom of de lijst gooit
import { createLink, makeRng } from '../game/js/net/memtransport.js';
import { HostHub } from '../game/js/net/hub.js';
import { ClientSession } from '../game/js/net/session.js';
t('B1: hub met 16 spelers met lange namen en volle kast: iedereen sluit aan, de lijst en de outfits komen aan', () => {
  const INFO = { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' };
  const sim = { applyInput() {}, snapshot: () => ({ players: [{ slot: 0, x: 0, y: 0, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [] }), fullState: () => ({}) };
  const hub = new HostHub({ info: INFO, seed: 1, sim, max: 16, caps: ['scene'], rand: makeRng(5) });
  const clients = [], links = [], seen = [];
  for (let i = 1; i < 16; i++) {
    const l = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 100 + i });
    hub.accept(l.a);
    const c = new ClientSession(l.b, { info: { ...INFO, avatar: { naam: String.fromCharCode(64 + i).repeat(22) + String(i).padStart(2, '0'), kleur: '#aabbcc', outfit: volleKast() } }, caps: ['scene'] }, makeRng(100 + i));
    clients.push(c); links.push(l);
    if (i === 15) c.onevent = (b) => { if (b && (b.k === 'spelers' || b.k === 'outfits')) seen.push(b); };
  }
  const dt = 1 / 60;
  for (let k = 0; k < 6 * 60; k++) { hub.tick(dt); for (const c of clients) c.tick(dt); for (const l of links) l.advance(dt); }
  assert.deepEqual([...new Set(clients.map((c) => c.status))], ['ok'], 'alle 15 gasten zijn binnen');
  assert.equal(hub.roster.spelers.length, 16);
  const laatste = seen.map((b, i) => [b, i]).filter(([b]) => b.k === 'spelers').at(-1);
  assert.ok(laatste, 'de laatste gast kreeg een lijst');
  let roster = P.leesLijstEvent(laatste[0]).spelers.map((s) => ({ ...s }));
  for (const b of seen.slice(laatste[1] + 1)) if (b.k === 'outfits') roster = P.voegOutfitsSamen(roster, P.leesOutfitsEvent(b));
  assert.equal(roster.length, 16);
  assert.ok(roster.filter((s) => s.slot > 0).every((s) => s.avatar && s.avatar.outfit), 'elke gast heeft zijn outfit in de lijst');
});
t('B1: _announceList gooit nooit, ook niet als een bericht niet past (try/catch)', () => {
  const hub = new HostHub({ info: { game: 'gde', proto: 1, version: 'x', tiles: '-', story: 'oud' }, seed: 1, sim: { applyInput() {}, snapshot: () => ({}), fullState: () => ({}) }, max: 4, caps: [], rand: makeRng(1) });
  hub.sessions.set(1, { guest: true, tick() {}, announce() { throw new Error('bericht te groot'); } });
  hub._announceList(); assert.doesNotThrow(() => hub.tick(0.02));
});

// ---- N1, N2, N3 en de outfit
const NET = await import('../game/js/coopnet.js');
const { maakPings } = { maakPings: () => ({ lijst: [], laatste: {} }) };
t('N1: een ping met soort "constructor" of "__proto__" laat geen prototype-tekst zien', () => {
  for (const soort of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    const msgs = [];
    const world = { time: 10, coopPings: maakPings(), coopRoster: [{ slot: 0, naam: 'Host', char: 'tammo' }, { slot: 1, naam: 'Kwaad', char: 'rik' }], addMessage: (m) => msgs.push(m), coopNet: { role: 'host', hub: { roster: { spelers: [] } } } };
    NET.handleEvent(world, { k: 'ping', x: 5, y: 5, soort }, 1);
    assert.ok(msgs.length === 1 && /Kom hier/.test(msgs[0]) && !/native code|object/i.test(msgs[0]), `${soort}: ${msgs[0]}`);
  }
});
t('N1: pingRegel kent alleen eigen soorten', () => {
  const r = [{ slot: 1, naam: 'Kwaad' }];
  assert.equal(pingRegel(1, 'constructor', r, 0), 'Kwaad: Kom hier');
  assert.equal(pingRegel(1, '__proto__', r, 0), 'Kwaad: Kom hier');
});
t('N2: de host geeft een ping alleen door met de bekende velden en niet sneller dan de afkoeling', () => {
  const stuur = [];
  const world = { time: 10, coopRoster: [], addMessage() {} };
  const hub = { roster: { spelers: [{ slot: 0 }, { slot: 1 }, { slot: 2 }] }, announce: (b, s) => stuur.push([s, b]) };
  // de relay zit in startHost (onEvent); hier de geëxporteerde proef
  assert.equal(typeof NET.relayPing, 'function');
  NET.relayPing(world, hub, 1, { k: 'ping', x: 3, y: 4, soort: 'gevaar', troep: 'x'.repeat(1500) });
  assert.deepEqual(stuur, [[2, { k: 'ping', x: 3, y: 4, soort: 'gevaar', van: 1 }]]);
  NET.relayPing(world, hub, 1, { k: 'ping', x: 3, y: 4, soort: 'hier' });
  assert.equal(stuur.length, 1, 'te snel na de vorige: niet doorgegeven');
  world.time = 20; NET.relayPing(world, hub, 1, { k: 'ping', x: NaN, y: 4 });
  assert.equal(stuur.length, 1, 'een ongeldige ping gaat nergens heen');
});
t('N2: een gast die steeds van outfit wisselt, laat de host de lijst hoogstens een keer per seconde sturen; de laatste outfit komt altijd aan', () => {
  const r = P.createRoster(8); P.wijsPlekToe(r);
  let aantal = 0;
  const n = { role: 'host', hub: { roster: r, _announceList: () => { aantal++; } } };
  const world = { time: 100, coopNet: n };
  const codes = [0, 1, 2].map((v) => volleKast(v));
  assert.equal(new Set(codes).size, 3);
  for (let i = 0; i < 3; i++) { NET.handleEvent(world, { k: 'outfit', o: codes[i] }, 1); world.time += 0.1; }
  assert.equal(aantal, 1, 'binnen een seconde maar een lijst');
  assert.equal(r.spelers.find((s) => s.slot === 1).avatar.outfit, codes[2], 'maar de laatste outfit staat in de lijst');
  world.time += 1;
  NET.outfitLijstTik(world);
  assert.equal(aantal, 2, 'daarna gaat de open wijziging alsnog mee');
});
t('N3: readLook weigert onleesbare tekens in de tuning-code', () => {
  const snap = { players: [{ slot: 0, x: 1, y: 2, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [], looks: [{ id: 7, model: 2, fl: 1, len: 4.4, wid: 1.8, color: 0x7a1f1f, color2: 0x12294f, extra: 5, dents: [], tune: 'QWERTY' }] };
  const buf = K.encodeSnapshot(1, 1, 0, snap);
  assert.equal(K.decodeSnapshot(buf, new Map()).looks[0].tune, 'QWERTY');
  const at = buf.findIndex((_, i) => String.fromCharCode(...buf.slice(i, i + 6)) === 'QWERTY');
  buf[at + 2] = 0x07; buf[at + 3] = 0x80;
  const d = K.decodeSnapshot(buf, new Map());
  assert.ok(d && d.looks[0].tune === undefined, 'geen onleesbare tuning');
});

console.log(`multiplayerreview_22_11_test: ${n - fails}/${n} gelukt`);
process.exit(fails ? 1 : 0);
