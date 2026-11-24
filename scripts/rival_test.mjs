// De concurrent Us Mem Snacks (rival.js): start, uitbreiden, overnames, bod, gebeurtenissen en afloop, deterministisch.   node scripts/rival_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../game/js/rival.js';
import { SPOT_IDS, permitPrice } from '../game/js/pitch.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('Us Mem begint met de beste plekken van de stad, drie panden en een kleine keten', () => {
  const r = R.newRival();
  assert.deepEqual(r.spots, ['markt', 'station', 'oosterpoort', 'stadion']);
  assert.equal(r.pand, 3); assert.equal(r.chain, 1);
  assert.equal(R.RIVAL_NAME, 'Us Mem Snacks'); assert.ok(R.holds(r, 'markt') && !R.holds(r, 'dorp'));
});
t('aandeel: jouw plekken tegenover de zijne', () => {
  const r = R.newRival();
  assert.equal(R.shareOf(0, r), 0); assert.equal(R.shareOf(4, r), 0.5); assert.equal(R.shareOf(12, r), 0.75);
  assert.equal(R.shareOf(0, { spots: [] }), 0);
});
t('overname: prijs naar je naam, hij verliest de plek en wordt gemener, te weinig geld mislukt', () => {
  const r = R.newRival();
  assert.ok(R.askPrice('markt', 0) > R.askPrice('markt', 100));
  assert.equal(R.askPrice('markt', 100), Math.round(permitPrice('markt', 0) * 1.6 / 50) * 50);
  const no = R.acquireSpot(r, 'markt', 100, 50);
  assert.equal(no.ok, false); assert.equal(no.why, 'te-weinig-geld'); assert.equal(no.ask, R.askPrice('markt', 50));
  const ok = R.acquireSpot(r, 'markt', 1e6, 50);
  assert.ok(ok.ok && !R.holds(ok.r, 'markt') && ok.r.mood === r.mood + 25 && ok.r.bought === 1 && ok.price === R.askPrice('markt', 50));
  assert.equal(R.acquireSpot(r, 'dorp', 1e6).why, 'niet-van-hem');
  assert.equal(r.spots.length, 4);                       // het oude object blijft ongemoeid
});
t('uitbreiden: de beste vrije plek, nooit een plek van jou, tot zijn doelaandeel (6 van 16)', () => {
  let r = R.newRival();
  const taken = (id) => id === 'martini';                // van jou
  for (let d = 1; d <= 400; d++) r = R.stepRival(r, d, { taken });
  assert.equal(r.spots.length, Math.round(16 * R.TARGET_SHARE));
  assert.ok(!R.holds(r, 'martini'));
  assert.ok(r.spots.includes('reitdiep') || r.spots.includes('park') || r.spots.includes('haren'));    // de beste vrije plekken gaan eerst
  assert.ok(r.pand > 3 && r.chain === 4);
  assert.equal(new Set(r.spots).size, r.spots.length);
});
t('hij is niet sneller dan elke negen dagen en pakt niet meer als de plekken op zijn', () => {
  let r = R.newRival(), last = 0; const gaps = [];
  for (let d = 1; d <= 200; d++) { const m = R.stepRival(r, d, {}); if (m.spots.length > r.spots.length) { gaps.push(d - last); last = d; } r = m; }
  assert.ok(gaps.length >= 1 && gaps.every((g) => g >= R.EXPAND_MIN));
  const all = R.stepRival({ ...R.newRival(), spots: [...SPOT_IDS] }, 60, { taken: () => false });
  assert.equal(all.spots.length, 16);
});
t('stemming zakt per dag maar blijft minstens 5', () => {
  let r = { ...R.newRival(), mood: 40 };
  for (let d = 1; d <= 30; d++) r = R.stepRival(r, d, { taken: () => true });
  assert.equal(r.mood, 5);
});
t('een bod op je beste plek: elke 18 tot 25 dagen, 1,8 tot 2,2 maal de vergunning, nooit op een plek die hij al heeft', () => {
  const r = { ...R.newRival(), lastOffer: 0 };
  assert.equal(R.offerOn(r, 5, [{ id: 'dorp', paid: 2000 }]), null);                 // te vroeg
  assert.equal(R.offerOn(r, 40, []), null);                                           // niets van jou
  const o = R.offerOn(r, 40, [{ id: 'dorp', paid: 2000 }, { id: 'park', paid: 4000 }]);
  assert.equal(o.id, 'park'); assert.ok(o.price >= permitPrice('park', 0) * 1.75 && o.price <= permitPrice('park', 0) * 2.25); assert.ok(/Jelle/.test(o.text));
  assert.equal(R.offerOn(R.noteOffer(r, 40), 45, [{ id: 'park' }]), null);
  assert.equal(R.offerOn(r, 40, [{ id: 'markt' }]), null);                            // die plek is van hem
  assert.equal(JSON.stringify(R.offerOn(r, 40, [{ id: 'park' }])), JSON.stringify(R.offerOn(r, 40, [{ id: 'park' }])));
});
t('kans op een gebeurtenis: begrensd, hoger bij een boze Us Mem, lager met bescherming', () => {
  const r = R.newRival();
  assert.ok(R.eventChance({ ...r, mood: 100 }) > R.eventChance({ ...r, mood: 0 }));
  assert.ok(R.eventChance(r, { protect: 0.5 }) < R.eventChance(r, {}));
  assert.ok(R.eventChance({ ...r, mood: 100 }, { share: 0.9 }) <= 0.22);
  assert.ok(R.eventChance({ ...r, mood: 0 }) >= 0.05 * 0.99);
});
t('gebeurtenissen over 400 dagen: hooguit één tegelijk, rust van drie dagen, alle soorten komen voor, nooit zonder wagen', () => {
  let r = { ...R.newRival(), mood: 60 }; const count = {}; let prev = -99, total = 0;
  const wagons = [{ id: 'own', spot: 'dorp' }, { id: 'w1', spot: 'leek' }];
  for (let d = 1; d <= 400; d++) {
    const e = R.rollEvent(r, d, { wagons, hasFleet: true, share: 0.5 });
    if (!e) continue;
    assert.ok(d - prev >= R.EVENT_COOLDOWN || prev < 0); prev = d; total++;
    count[e.kind] = (count[e.kind] || 0) + 1; r = R.noteEvent(r, d);
    assert.ok(e.choices.length >= 2 && e.text.length > 20 && e.deadline >= d + 3 && wagons.some((w) => w.id === e.wagon));
  }
  assert.ok(total > 15 && total < 120, String(total));
  assert.ok(Object.keys(count).length === 6, JSON.stringify(count));
  assert.equal(R.rollEvent(r, 50, { wagons: [], hasFleet: true }), null);
  assert.equal(R.rollEvent(r, 50, { wagons, pending: true }), null);
  for (let d = 1; d <= 100; d++) assert.notEqual((R.rollEvent(r, d, { wagons, hasFleet: false }) || {}).kind, 'overkoop');
});
t('een gebeurtenis is deterministisch', () => {
  const a = [], b = [];
  for (let d = 1; d <= 60; d++) { a.push(R.rollEvent({ ...R.newRival(), mood: 60 }, d, { wagons: [{ id: 'own', spot: 'dorp' }] })); b.push(R.rollEvent({ ...R.newRival(), mood: 60 }, d, { wagons: [{ id: 'own', spot: 'dorp' }] })); }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
t('de afloop: de goedkoopste keuze is de standaard, reparatie en reactie helpen, nooit negatief geld', () => {
  const st = { kind: 'storing', wagon: 'own', day: 5 };
  assert.equal(R.outcome(st, 'repareer', 5).cost, 350);
  const wacht = R.outcome(st, 'wacht', 5); assert.equal(wacht.cost, 0); assert.ok(wacht.mods[0].until === 6 && wacht.mods[0].mult === 0.3);
  assert.equal(R.outcome(st, null, 5).choice, 'wacht');                 // na de deadline: de goedkoopste
  const rec = { kind: 'recensie', wagon: 'own', day: 5 };
  assert.ok(R.outcome(rec, 'actie', 5).repTemp.d > R.outcome(rec, 'negeer', 5).repTemp.d);
  assert.ok(R.outcome(rec, 'reageer', 5).repTemp.d > R.outcome(rec, 'negeer', 5).repTemp.d);
  const war = { kind: 'oorlog', wagon: 'own', day: 5, depth: 0.2 };
  assert.equal(R.outcome(war, 'meeprijzen', 5).war.matched, true); assert.equal(R.outcome(war, 'negeer', 5).war.matched, false);
  assert.equal(R.outcome(war, 'reclame', 5).war.softened, true); assert.equal(R.outcome(war, 'reclame', 5).war.until, 13);
  assert.equal(R.outcome({ kind: 'overkoop', wagon: 'w1' }, 'loon', 5).wageUp.pct, 20);
  assert.equal(R.outcome({ kind: 'overkoop', wagon: 'w1' }, 'laatgaan', 5).leave, 'w1');
  assert.equal(R.outcome({ kind: 'pech', wagon: 'own' }, 'sleep', 5).mods[0].k, 'dicht');
  for (const k of Object.keys(R.CHOICES)) for (const c of R.CHOICES[k]) assert.ok(c.cost >= 0);
});
t('geen geweld en geen winterwoorden in de zinnen; Nederlands', () => {
  const all = Object.values(R.QUOTES).flat().concat(Object.values(R.CHOICES).flat().map((c) => c.label), Object.values(R.EVENT_KINDS).map((e) => e.label)).join(' ');
  assert.ok(!/(geweld|slaan|vuur|brand|bom|dood|doden|bloed|mes|wapen)/i.test(all));
  assert.ok(!/hagel|sneeuw|winter|vorst/i.test(all));
});
t('normalizeRival: rommel wordt gezuiverd, onbekende plekken vallen weg', () => {
  const r = R.normalizeRival({ spots: ['markt', 'zzz', 'markt', 'dorp'], pand: -5, chain: 99, mood: 'x', lastExpand: 7.4 });
  assert.deepEqual(r.spots, ['markt', 'dorp']); assert.equal(r.pand, 0); assert.equal(r.chain, 4); assert.equal(r.lastExpand, 7);
  assert.deepEqual(R.normalizeRival(null).spots, R.OPENING_SPOTS);
});
t('bronregels: geen Math.random, geen fetch', () => {
  const src = fs.readFileSync(new URL('../game/js/rival.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|document\.|localStorage/.test(src));
});
console.log(`rival_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
