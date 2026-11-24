// Te koop en Bedrijven (24-11): items, filters, sorteren, de vergelijking met ±, de bevestiging (vasthouden boven €1.000), lege staten en het pandbeheer.   node scripts/bezitkoop_test.mjs
import assert from 'node:assert/strict';
import * as K from '../game/js/bezitkoop.js';
import * as BD from '../game/js/bezitbedrijven.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const perceel = (id, price, dist, o = {}) => ({ id, name: `Wei bij Dorkwerd (K${id})`, kindName: 'weide', ha: 1.5, soilWord: 'goed', price, forSale: true, parcel: { x: 10, y: 10 }, shape: null, dist, ...o });
const pand = (osm, price, dist, type = 'winkel', cls = 'shop') => ({ osm, price, forSale: true, kind: { type, cls }, row: { m2: 100, x: 5, y: 5 }, town: { name: 'Zuidhorn' }, dist });
const items = (money = 18450) => K.koopItems({ offers: [perceel('11', 2700, 1400), perceel('22', 4200, 900, { forSale: false }), perceel('33', 2500, 1500)], panden: [pand(7, 38500, 2100)], woningen: [pand(9, 49950, 500, 'woning', 'rent')], money, owned: 2 });

t('items: wat niet te koop is valt weg, de kadastrale code ook, wat je niet kunt betalen weet wat je mist', () => {
  const i = items();
  assert.equal(i.length, 5 - 1);
  assert.ok(!i.some((x) => /\(K/.test(x.naam)), 'geen code in de naam');
  assert.equal(K.schoneNaam('Terpweide bij Leegkerk (K6899)'), 'Terpweide bij Leegkerk');
  const duur = i.find((x) => x.key === 'b:7');
  assert.equal(duur.kan, false); assert.equal(duur.mist, 38500 - 18450);
  assert.equal(i.find((x) => x.key === 'p:11').kan, true);
});
t('items: het rendement staat alleen bij een echt getal, een perceel met ±', () => {
  const i = items();
  const p = i.find((x) => x.key === 'p:11');
  assert.ok(p.rend && p.rend.perDag > 0 && p.rend.terug > 0);
  assert.equal(K.koopItems({ offers: [perceel('99', 0, 1)], money: 1 })[0].rend, null);
});
t('filters en sorteren: soort, snelst terug, goedkoopst, dichtbij', () => {
  const i = items();
  assert.deepEqual(K.filter(i, 'land').map((x) => x.key).sort(), ['p:11', 'p:33']);
  assert.deepEqual(K.filter(i, 'woningen').map((x) => x.key), ['b:9']);
  assert.equal(K.filter(i, 'alles').length, i.length);
  assert.deepEqual(K.sorteer(i, 'prijs').map((x) => x.price), [2500, 2700, 38500, 49950]);
  assert.equal(K.sorteer(i, 'afstand')[0].key, 'b:9');
  const terug = K.sorteer(K.filter(i, 'land'), 'terug');
  assert.ok(terug[0].rend.terug <= terug[1].rend.terug);
});
t('lijst en detail: stappers (geen chips), een kaart, twee bonnen en de gele Kopen; je mist wat je niet kunt betalen', () => {
  const h = K.koopHtml({ items: items(), sel: 'p:11', soort: 'alles', sort: 'prijs', money: 18450, totaal: 12 });
  assert.match(h, /ds-z-stapper/); assert.match(h, /data-kp="soort"/); assert.match(h, /data-kp="sort"/); assert.ok(!/ds-z-chip/.test(h));
  assert.match(h, /bz-kaartvlak/); assert.match(h, /<button type="button" class="ds-z-knop" data-kp="koop" data-key="p:11">Kopen<\/button>/);
  assert.match(h, /Je geld erna/); assert.match(h, /€15\.750/); assert.match(h, /± \d+ dagen|Terugverdiend in \(±\)/);
  assert.match(h, /je mist €20\.050/); assert.match(h, /4 van 12/); assert.match(h, /nog te duur/);
  assert.equal((h.match(/class="ds-z-knop" data-kp="koop"/g) || []).length, 1, 'één gele knop');
});
t('kopen zonder geld: de knop is uit met de reden', () => {
  const h = K.koopHtml({ items: items(100), sel: 'p:11', money: 100 });
  assert.match(h, /data-kp="koop" data-key="p:11" disabled/); assert.match(h, /Je mist nog/);
});
t('bevestiging: boven €1.000 vasthouden (met uitleg voor toets en controller), eronder direct; het dagbedrag erna met ±', () => {
  const i = items().find((x) => x.key === 'p:11');
  const houd = K.bevestigHtml(i, { money: 18450, dagNu: 559 });
  assert.match(houd, /data-houd="p:11"/); assert.match(houd, /Houd vast om te kopen/); assert.match(houd, /data-gk="ENTER"/); assert.match(houd, /data-gk="A"/); assert.match(houd, /controller/); assert.match(houd, /twee keer/);
  assert.match(houd, /Je dagbedrag erna \(±\)/); assert.match(houd, /Je houdt over[\s\S]*€15\.750/);
  assert.ok(!/data-kp="koop-ok"/.test(houd), 'geen directe koop bij een groot bedrag');
  const klein = K.bevestigHtml({ ...i, price: 900 }, { money: 5000, dagNu: 10 });
  assert.match(klein, /data-kp="koop-ok"/); assert.ok(!/data-houd/.test(klein));
  assert.ok(!/Je dagbedrag/.test(K.bevestigHtml({ ...i, rend: null }, { money: 5000, dagNu: 10 })), 'zonder rendement geen dagbedrag erna');
  assert.equal(K.HOUD_VANAF, 1000); assert.equal(K.HOUD_MS, 600);
});
t('lege staten: niets in de buurt heeft een knop naar de kaart, een lege filter vraagt een andere soort', () => {
  assert.match(K.koopHtml({ items: [], money: 1 }), /Niets te koop in de buurt[\s\S]*data-goto="map"/);
  assert.match(K.koopHtml({ items: items(), soort: 'woningen', money: 1 }).replace(/b:9/g, ''), /bz-md|Niets bij deze filter/);
  assert.match(K.leegHtml(true), /Niets bij deze filter/); assert.ok(!/data-goto/.test(K.leegHtml(true)));
});

const biz = (o = {}) => ({ id: 1, type: 'winkel', cls: 'shop', m2: 140, p: 84000, base: 84000, q: 74, cfg: {}, ...o });
const mine = (o = {}) => [{ osm: 1, row: { x: 1, y: 1 }, kind: { type: 'winkel', cls: 'shop' }, biz: biz(o), place: 'Hoogkerk' }];
t('bedrijven: lijst met per dag (±), detail met renovatie als volgende stap, bon, onderhoud en verkoop; klanten en tevredenheid ontbreken', () => {
  const h = BD.bedrijvenHtml({ mine: mine(), renoHtml: () => '<button class="ds-z-knop" data-bz="reno">Renovatie</button>', verkoopHtml: () => '<button data-bz="verkoop-pand">Verkopen</button>' });
  assert.match(h, /Winkel bij Hoogkerk/); assert.match(h, /Beste volgende stap/); assert.match(h, /data-bz="reno"/); assert.match(h, /Netto per dag \(±\)/); assert.match(h, /Onderhoud/); assert.match(h, /data-bz="verkoop-pand"/);
  assert.match(h, /data-goto-sub="boerderij:tekoop"/);
  assert.ok(!/Klanten|Tevredenheid/.test(h), 'geen verzonnen klanten of tevredenheid');
  const ok = BD.bedrijvenHtml({ mine: mine({ q: 100 }) });
  assert.match(ok, /Dit pand is in orde/); assert.ok(!/data-bz="reno"/.test(ok));
  assert.equal(BD.bedrijvenHtml({ mine: [] }), '');
});
t('bedrijven: een woning geeft huur min belasting; zonder waarde geen cijfers', () => {
  const c = BD.pandCijfers({ type: 'woning', cls: 'rent', p: 50000, q: 100 }, 0, 120);
  assert.equal(c.omzet, 120); assert.ok(c.netto < 120 && c.opex === 0);
  assert.equal(BD.pandCijfers({ p: 0 }), null); assert.equal(BD.pandCijfers(null), null);
  assert.equal(BD.pandCijfers({ type: 'x', cls: 'mobile', p: 100, q: 100 }), null);
});

console.log(`bezitkoop_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
