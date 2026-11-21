// Het menu Land en bedrijf (#1099): de structuur in pausemenu.js (onderdelen, doorverwijzing van de oude Boerderij), de HTML van Overzicht,
// Bedrijven en Te koop, de bevestiging bij kopen en verkopen, dichte takken met uitleg en bulkacties.   node scripts/bezitui_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject. Geen DOM: de HTML komt uit pure functies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as U from '../game/js/bezitui.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490]] };
const BFILE = { v: 1, types: ['retail', 'church', 'industrial'], rows: [[111, 220150, 590150, 400, 0, 6, 0], [222, 220160, 590160, 900, 1, 12, 1], [333, 220170, 590170, 2000, 2, 8, 0]] };
const st = nep();
const reset = () => { const s = nep(); L.initBezit({ opslag: s }); BL.initBoerderij({ opslag: s }); L.setIndexForTest(FILE, BFILE); L.setClaimLookup(null); GT.resetUnlockGate(); U.ui.confirm = null; U.ui.msg = ''; };
const w = (money = 100000) => ({ money, addMessage() {} });
const src = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
const ctx = (world) => ({ bezit: L.getBezit(), farm: BL.getBoerderij(), money: world.money, day: 0 });

t('menu: Land en bedrijf heeft vier onderdelen en de oude Boerderij-id blijft', () => {
  assert.match(src, /\['boerderij', 'Land en bedrijf', '[^']+'\]/);
  assert.match(src, /boerderij: \[\['overzicht', 'Overzicht'\], \['boerderij', 'Boerderij'\], \['bedrijven', 'Bedrijven'\], \['tekoop', 'Te koop'\]\]/);
  assert.match(src, /'bezit', 'Bezit', \['spullen', 'garage', 'boerderij'\]/, 'de railgroep Bezit blijft');
  for (const sub of ['overzicht', 'boerderij', 'bedrijven', 'tekoop']) assert.ok(src.includes(`data-of="boerderij" data-sub="${sub}"`), sub);
});
t('menu: doorverwijzing van de oude en de nieuwe naam, standaard op Boerderij', () => {
  assert.ok(src.includes("if (name === 'bezit') name = 'boerderij'"));
  assert.ok(src.includes("if (id === 'bezit') id = 'boerderij'"));
  assert.ok(src.includes("pref.sub.boerderij || 'boerderij'"), 'wie al boert, ziet zijn boerderij zoals voorheen');
  assert.ok(src.includes('data-goto="boerderij"') && src.includes("act === 'farm') { enterSection('boerderij')"), 'bestaande verwijzingen blijven werken');
});
t('overzicht: leeg bezit geeft een uitleg, geen fout', () => {
  reset();
  const h = U.overviewHtml(ctx(w()));
  assert.ok(h.includes('Overzicht') && h.includes('Nog niets dringends') === false);
  assert.ok(h.includes('Stel beginner aan'), 'personeel aanstellen');
});
t('overzicht: na een koop staat het perceel in de lijst met stand en Doel', () => {
  reset();
  const world = w();
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const h = U.overviewHtml(ctx(world));
  assert.ok(h.includes('data-row="paaaaaaaaaaa1"') && h.includes('data-bz="doel"') && h.includes('3 ha') && h.includes('Zelf'));
  assert.ok(h.includes('Percelen') && h.includes('Hectare'));
});
t('te koop: lijst met prijs en Doel; kopen vraagt een bevestiging (tweede druk)', () => {
  reset();
  const world = w();
  const offers = [L.parcelOffer('pbbbbbbbbbbb2')].map((o) => ({ ...o, dist: 120 }));
  let h = U.forSaleHtml({ money: world.money, offers });
  assert.ok(h.includes('data-bz="koop-perceel"') && h.includes('data-bz="doel-perceel"') && h.includes('120 m'));
  assert.ok(!h.includes('data-ok="1"'));
  U.ui.confirm = 'koop-perceel:pbbbbbbbbbbb2';
  h = U.forSaleHtml({ money: world.money, offers });
  assert.ok(h.includes('data-ok="1"') && h.includes('Zeker') === false && h.includes('Voor €'));
  U.ui.confirm = null;
});
t('te weinig geld: de koopknop staat uit', () => {
  reset();
  const o = { ...L.parcelOffer('pbbbbbbbbbbb2'), dist: 5 };
  assert.match(U.forSaleHtml({ money: 10, offers: [o] }), /data-bz="koop-perceel"[^>]*disabled/);
});
t('dichte takken: uitleg in plaats van een leeg scherm', () => {
  reset();
  let act = 1;
  GT.setUnlockGate(GT.makeActGate(() => act));
  assert.match(U.forSaleHtml({ money: 1, offers: [] }), /akte 2/);
  assert.match(U.businessesHtml({ money: 1 }), /akte 3/);
  act = 3;
  assert.ok(!/Nog dicht/.test(U.businessesHtml({ money: 1, mine: [], near: [] })));
  GT.resetUnlockGate();
});
t('bedrijven: koopbare panden dichtbij met prijs, een kerk is niet te koop met reden, de bevestiging werkt', () => {
  reset();
  const near = L.buildingsNear(220150, 590150, 300);
  assert.equal(near.length, 3);
  const kerk = near.find((o) => o.osm === 222);
  assert.equal(kerk.forSale, false); assert.match(kerk.reason, /monument|Niet te koop/);
  const winkel = near.find((o) => o.osm === 111);
  assert.ok(winkel.forSale && winkel.price > 0);
  const h = U.businessesHtml({ money: 1e6, mine: [], near });
  assert.ok(h.includes('data-bz="koop-pand"') && h.includes('Niet te koop'));
  const world = w(1e6);
  const r = L.koopPand(world, 111);
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(world.money < 1e6);
  const mine = L.myBusinesses();
  assert.equal(mine.length, 1);
  const h2 = U.businessesHtml({ money: world.money, mine, near: L.buildingsNear(220150, 590150, 300) });
  assert.ok(h2.includes('data-bz="reno"') && h2.includes('data-bz="verkoop-pand"'));
  const v = L.verkoopPand(world, 111);
  assert.ok(v.ok && v.refund < r.cost);
});
t('bulkacties: zonder selectie uit, met selectie aan; teksten in het Nederlands', () => {
  reset();
  const world = w();
  L.koopPerceel(world, 'paaaaaaaaaaa1');
  U.ui.sel.clear();
  assert.match(U.overviewHtml(ctx(world)), /data-bz="bulk-zaai"[^>]*disabled/);
  U.ui.sel.add('paaaaaaaaaaa1');
  assert.ok(!/data-bz="bulk-zaai"[^>]*disabled/.test(U.overviewHtml(ctx(world))));
  assert.equal(U.bulkText('bulk-zaai', { done: 2, skipped: { 'niet-zelf': 1 } }), '2 percelen gezaaid; overgeslagen: 1x niet zelf.');
  assert.equal(U.bulkText('bulk-oogst', { done: 1, skipped: {} }), '1 perceel geoogst.');
  U.ui.sel.clear();
});
t('personeel: aanstellen kost niets bij het aanstellen, het loon loopt per dag; handwerk blijft het meest', () => {
  reset();
  const world = w();
  assert.ok(L.huurArbeider(world, 1).ok);
  const h = U.overviewHtml(ctx(world));
  assert.ok(h.includes('1 medewerker') && h.includes('hooguit 80%') && h.includes('data-bz="ontsla"'));
  assert.equal(L.huurArbeider(w(10), 3).ok, false);
});
t('filters en sortering: alleen bestaande opties; ongeldige invoer geeft geen fout', () => {
  reset();
  U.ui.sort = 'bestaatniet';
  assert.doesNotThrow(() => U.overviewHtml(ctx(w())));
  U.ui.sort = 'ripe';
});
t('de HTML ontsnapt namen', () => {
  const h = U.forSaleHtml({ money: 1e6, offers: [{ id: 'p1', name: '<img src=x onerror=1>', kindName: 'weide', ha: 1, soilWord: 'goed', dist: 1, price: 1200 }] });
  assert.ok(!h.includes('<img') && h.includes('&lt;img'));
});
console.log(`bezitui_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
