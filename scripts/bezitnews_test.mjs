// Nieuws van het land (#1103): opbrengstverlies per perceel, de dag van gebeurtenissen, de buurman met een keuze, de trekkertrek, opslag en de tekstregels
// (Nederlands, altijd zomer).   node scripts/bezitnews_test.mjs
import assert from 'node:assert/strict';
import * as N from '../game/js/bezitnews.js';
import * as EV from '../game/js/bezitevents.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const findDay = (pred, max = 6000) => { for (let d = 1; d <= max; d++) if (pred(d)) return d; return 0; };

t('verlies per perceel: een stortbui kost 30%, een droogte op zand meer dan op klei, zonder gebeurtenis 1', () => {
  const storm = findDay((d) => EV.activeSpan(EV.EVENT_DEFS.stortbui, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.droogte, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.mierenplaag, 'hogeland', d));
  assert.ok(storm > 0);
  const a = N.lossOfParcel({ id: 'p1', kind: 'a', region: 'hogeland' }, storm);
  assert.ok(Math.abs(a.mult - 0.7) < 0.01, String(a.mult)); assert.match(a.text, /Stortbui/);
  const quiet = findDay((d) => EV.parcelLoss({ id: 'x', kind: 'a', region: 'oldambt', sown: true }, d).loss === 0);
  assert.equal(N.lossOfParcel({ id: 'p1', kind: 'a', region: 'oldambt' }, quiet).mult, 1);
  const dry = findDay((d) => EV.droughtOn('veenkolonien', d) && EV.droughtOn('hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.stortbui, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.stortbui, 'veenkolonien', d) && !EV.activeSpan(EV.EVENT_DEFS.mierenplaag, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.mierenplaag, 'veenkolonien', d), 30000);
  if (dry) assert.ok(N.lossOfParcel({ id: 'p', kind: 'a', region: 'veenkolonien' }, dry).mult < N.lossOfParcel({ id: 'p', kind: 'a', region: 'hogeland' }, dry).mult + 1e-9);
  assert.ok(N.lossOfParcel({ id: 'p1', kind: 'a', region: 'hogeland' }, storm) === N.lossOfParcel({ id: 'p9', kind: 'a', region: 'hogeland' }, storm), 'in de cache: dezelfde streek en dag geven hetzelfde antwoord');
});

t('een dag: weer, vee, machine, inspectie, koeling en buren verschijnen alleen op hun eerste dag, met geld en gevolgen', () => {
  const news = N.newNews();
  const ctx = { regions: ['hogeland', 'oldambt', 'overig'], seed: 'zaad1', machines: [{ id: 'm1', name: 'Wierdetrekker W60', wear: 100, price: 9000 }], herds: [{ id: 'pa', kind: 'melkvee', count: 10, perHa: 5, refPerHa: 2.5 }],
    buildings: [{ id: 'Melk naar kaas', stock: { melk: 1000, kaas: 100 } }], audit: { qAvg: 20, tidyFields: 0.2, staffed: false, dailyRevenue: 100 } };
  let total = { money: 0, infect: 0, breakdown: 0, cooling: 0, lines: 0 };
  for (let d = 1; d <= 3000; d++) { const r = N.processDay(news, d, ctx); total.money += r.money; total.infect += r.infect.length; total.breakdown += r.breakdown.length; total.cooling += r.cooling.length; total.lines += r.lines.length; }
  assert.ok(total.infect > 0, 'ziek vee komt voor'); assert.ok(total.breakdown > 0, 'een versleten machine staat stil'); assert.ok(total.cooling > 0, 'de koeling valt uit');
  assert.ok(total.lines > 50); assert.ok(news.lines.length <= 5, 'hoogstens vijf regels');
  assert.ok(total.money < 0, 'de dierenarts en de boetes kosten geld');
});

t('inspectie met orde geeft lof (een bonus); alles klopt in het Nederlands zonder winter', () => {
  const news = N.newNews(); let bonus = 0;
  for (let d = 1; d <= 4000; d++) { const r = N.processDay(news, d, { regions: [], seed: 's', audit: { qAvg: 100, tidyFields: 1, staffed: true, dailyRevenue: 0 } }); bonus += r.money; }
  assert.ok(bonus > 0);
  for (const l of news.lines) assert.ok(!/\b(winter|sneeuw|ijs|vorst|hagel)/i.test(l.t), l.t);
});

t('de buurman: een scène blijft maximaal drie dagen liggen, de keuze kost hooguit een kleine som, zonder geld geen duur antwoord', () => {
  const news = N.newNews();
  const d0 = findDay((d) => EV.neighborScene(d, 'zaad2'));
  assert.ok(d0 > 0);
  N.processDay(news, d0, { regions: [], seed: 'zaad2' });
  const sv = N.sceneView(news);
  assert.ok(sv && sv.choices.length === 3);
  assert.ok(sv.choices.every((c) => c.cost <= 40));
  const dear = sv.choices.find((c) => c.cost > 0);
  if (dear) assert.equal(N.chooseNeighbor(news, dear.id, 0).why, 'te-weinig-geld');
  const r = N.chooseNeighbor(news, sv.choices[0].id, 100);
  assert.ok(r.ok && r.text.length > 5); assert.equal(N.sceneView(news), null);
  assert.equal(N.chooseNeighbor(news, 'x', 100).why, 'geen-scene');
  N.processDay(news, d0, { regions: [], seed: 'zaad2' }); assert.ok(N.sceneView(news));
  N.processDay(news, d0 + 3, { regions: [], seed: 'zaad-leeg' }); assert.equal(N.sceneView(news), null, 'na drie dagen lost hij zichzelf op');
});

t('trekkertrek: een aanbod bij een dorpsfeest of kermis in een streek van jou, met inleg en prijs', () => {
  const d = findDay((x) => EV.trekkertrekAvailable('hogeland', x));
  assert.ok(d > 0);
  const o = N.pullOffers(['hogeland', 'overig'], d);
  assert.equal(o.length, 1); assert.ok(o[0].classes.length === 2 && o[0].classes[0].top > o[0].classes[0].fee); assert.ok(o[0].rules.length >= 2);
  const none = findDay((x) => !EV.trekkertrekAvailable('hogeland', x));
  assert.deepEqual(N.pullOffers(['hogeland'], none), []);
});

t('opslag: normaliseren begrenst de regels en gooit rommel weg', () => {
  const raw = { lines: Array.from({ length: 20 }, (_, i) => ({ d: i, t: 'x'.repeat(500) })).concat([{ d: 1 }, null]), scene: { id: 'bestaat-niet' }, goodwill: 1e9, seed: '<b>zaad</b>' };
  const x = N.normalizeNews(raw);
  assert.equal(x.lines.length, 5); assert.ok(x.lines[0].t.length <= 200); assert.equal(x.scene, null); assert.equal(x.goodwill, 500); assert.equal(x.seed, 'bzaadb');
  assert.deepEqual(N.normalizeNews(null).lines, []);
});

t('de staat voor de inspectie: onderhoud en verzorgde percelen', () => {
  const a = N.auditState({ businesses: [{ q: 50 }, { q: 100 }], rows: [{ attention: ['braak'] }, { attention: [] }], hasStaff: true });
  assert.equal(a.qAvg, 75); assert.equal(a.tidyFields, 0.5); assert.equal(a.staffed, true);
  assert.equal(N.auditState({}).qAvg, 100);
});

console.log(`bezitnews_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
