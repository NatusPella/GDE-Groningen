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

t('menu: Land en bedrijf heeft zes onderdelen en de oude Boerderij-id blijft', () => {
  assert.match(src, /\['boerderij', 'Land en bedrijf', '[^']+'\]/);
  assert.match(src, /boerderij: \[\['overzicht', 'Overzicht'\], \['boerderij', 'Boerderij'\], \['bedrijven', 'Bedrijven'\], \['tekoop', 'Te koop'\], \['snack', 'Snackwagen'\], \['club', 'Club'\]\]/);
  assert.match(src, /'bezit', 'Bezit', \['spullen', 'garage', 'boerderij'\]/, 'de railgroep Bezit blijft');
  for (const sub of ['overzicht', 'boerderij', 'bedrijven', 'tekoop', 'snack', 'club']) assert.ok(src.includes(`data-of="boerderij" data-sub="${sub}"`), sub);
});
t('menu: doorverwijzing van de oude en de nieuwe naam, standaard op Boerderij', () => {
  assert.ok(src.includes("if (name === 'bezit') name = 'boerderij'"));
  assert.ok(src.includes("if (id === 'bezit') id = 'boerderij'"));
  assert.ok(src.includes("pref.sub.boerderij || 'boerderij'"), 'wie al boert, ziet zijn boerderij zoals voorheen');
  assert.ok(src.includes('data-goto="boerderij"') && src.includes("act === 'farm') { enterSection('boerderij')"), 'bestaande verwijzingen blijven werken');
});
t('overzicht: leeg bezit geeft een uitleg, geen fout', () => {
  reset();
  const h = U.summaryHtml(ctx(w()));
  assert.ok(h.includes('Overzicht') && h.includes('Nog niets dringends') === false);
  assert.ok(h.includes('Nog geen land') && h.includes('data-leeg="percelen"'), 'de volgende stap staat er');
  assert.ok(/<button[^>]*data-goto-sub="boerderij:tekoop"[^>]*>Koop je eerste perceel<\/button>/.test(h), 'een echte knop naar Te koop (#1246)');
  assert.ok(h.includes('<svg') && !h.includes('Open de kaart en kies de laag'), 'icoon in plaats van de lap uitleg');
  assert.ok(!h.includes('Stel beginner aan') && !h.includes('data-bz-cycle=') && !h.includes('bz-tegel'), 'leeg bezit toont geen personeel, filters of nulltegels (progressive disclosure)');
});
t('overzicht: na een koop staat het perceel in de lijst met stand en Doel', () => {
  reset();
  const world = w();
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const h = U.summaryHtml(ctx(world));
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
  assert.match(U.forSaleHtml({ money: 1, offers: [] }), /Het Noorden is groot/);
  assert.match(U.businessesHtml({ money: 1 }), /Aan de Eems/);
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
  assert.ok(/data-bz(-status)?="reno"/.test(h2) && h2.includes('data-bz="verkoop-pand"'));
  const v = L.verkoopPand(world, 111);
  assert.ok(v.ok && v.refund < r.cost);
});
t('bulkacties: zonder selectie uit, met selectie aan; teksten in het Nederlands', () => {
  reset();
  const world = w();
  L.koopPerceel(world, 'paaaaaaaaaaa1');
  U.ui.sel.clear();
  assert.match(U.summaryHtml(ctx(world)), /data-bz="bulk-zaai"[^>]*disabled/);
  U.ui.sel.add('paaaaaaaaaaa1');
  assert.ok(!/data-bz="bulk-zaai"[^>]*disabled/.test(U.summaryHtml(ctx(world))));
  assert.equal(U.bulkText('bulk-zaai', { done: 2, skipped: { 'niet-zelf': 1 } }), '2 percelen gezaaid; overgeslagen: 1x niet zelf.');
  assert.equal(U.bulkText('bulk-oogst', { done: 1, skipped: {} }), '1 perceel geoogst.');
  U.ui.sel.clear();
});
t('personeel: aanstellen kost niets bij het aanstellen, het loon loopt per dag; handwerk blijft het meest', () => {
  reset();
  const world = w();
  assert.ok(L.huurArbeider(world, 1).ok);
  const h = U.summaryHtml(ctx(world));
  assert.ok(h.includes('1 medewerker') && h.includes('hooguit 80%') && h.includes('data-bz="ontsla"'));
  assert.equal(L.huurArbeider(w(10), 3).ok, false);
});
t('#1246: lege secties zijn een icoon met een knop, geen lap uitleg; tegels dragen een icoon', () => {
  reset();
  const world = w();
  const offer = L.parcelOffer('pbbbbbbbbbbb2');
  if (offer && offer.forSale) L.koopPerceel(world, 'pbbbbbbbbbbb2');
  const h = U.summaryHtml(ctx(world));
  assert.ok(/class="bz-tegel"><small><svg[^>]*bz-tegel-ic/.test(h), 'elke tegel heeft een icoon');
  assert.ok(!/0 medewerkers/.test(h), 'geen regel met nullen bij nul personeel');
  assert.ok(h.includes('Nog niemand in dienst.') && /data-bz="huur"/.test(h), 'één korte regel en de huurknoppen');
  const vee = U.veeHtml(L.getBezit(), [], 0);
  assert.ok(vee.includes('data-leeg="vee"') && vee.includes('data-goto-sub="boerderij:tekoop"') && vee.includes('Koop een weiland'));
  const leegKeten = { id: 'leeg', name: 'Leeg', margin: 0, sourceKg: 0, sourceCount: 0, picked: 0, closedDays: 0, last: null, weakest: null, sources: [], links: [{ id: 'a', label: 'A', role: 'source', owned: false, ownable: false, fill: 0, stock: 0, cap: 1, perDay: 0, trucks: 0, wage: 0, distance: 0, ref: null, options: [] }] };
  const k = U.chainsHtml([leegKeten], 0);
  assert.ok(k.includes('data-leeg="ketens"') && k.includes('data-goto-sub="boerderij:bedrijven"') && !k.includes('bz-schakel'), 'een keten zonder eigen schakel of bron is een lege staat');
  const e = U.emptyState('koe', 'Kop <x>', 'Zin "y"');
  assert.ok(e.includes('Kop &lt;x&gt;') && e.includes('Zin &quot;y&quot;') && !e.includes('<button'), 'zonder knop geen knop, alles ontsnapt');
});
t('vee (#1101): een weiland toont het aanbod, kopen trekt geld af en toont de kudde, verkopen vraagt een tweede druk', () => {
  reset();
  const world = w(50000);
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  let h = U.summaryHtml(ctx(world));
  assert.ok(h.includes('>Vee<') && h.includes('data-bz="koop-vee"') && h.includes('data-sp="melkvee"') && h.includes('nog geen vee'));
  const voor = world.money;
  const r = L.koopVee(world, 'paaaaaaaaaaa1', 'melkvee');
  assert.ok(r.ok, r.text); assert.ok(world.money < voor, 'het geld gaat eraf');
  h = U.summaryHtml(ctx(world));
  assert.ok(h.includes('data-vee="paaaaaaaaaaa1"') && h.includes('Gezond') && h.includes('data-bz="verkoop-vee"') && !h.includes('data-bz="koop-vee"'));
  assert.equal(L.koopVee(world, 'paaaaaaaaaaa1', 'schapen').ok, false, 'een tweede kudde op hetzelfde perceel kan niet');
  U.ui.confirm = 'verkoop-vee:paaaaaaaaaaa1';
  assert.ok(U.summaryHtml(ctx(world)).includes('data-ok="1"'));
  U.ui.confirm = null;
  const na = world.money;
  assert.ok(L.verkoopVee(world, 'paaaaaaaaaaa1').ok); assert.ok(world.money > na, 'de verkoop levert geld op');
  assert.equal(L.verkoopVee(world, 'paaaaaaaaaaa1').ok, false, 'niets meer te verkopen');
});
t('vee: te weinig geld geeft een zin met het tekort en laat het geld staan', () => {
  reset();
  const world = w(60000);
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  world.money = 100;
  const r = L.koopVee(world, 'paaaaaaaaaaa1', 'melkvee');
  assert.equal(r.ok, false); assert.match(r.text, /Je mist nog/); assert.equal(world.money, 100);
  assert.match(U.summaryHtml(ctx(world)), /data-bz="koop-vee"[^>]*disabled/, 'de knop is uit zonder geld');
});
t('filters en sortering: alleen bestaande opties; ongeldige invoer geeft geen fout', () => {
  reset();
  U.ui.sort = 'bestaatniet';
  assert.doesNotThrow(() => U.summaryHtml(ctx(w())));
  U.ui.sort = 'ripe';
});
t('de HTML ontsnapt namen', () => {
  const h = U.forSaleHtml({ money: 1e6, offers: [{ id: 'p1', name: '<img src=x onerror=1>', kindName: 'weide', ha: 1, soilWord: 'goed', dist: 1, price: 1200 }] });
  assert.ok(!h.includes('<img') && h.includes('&lt;img'));
});
// ---- #1103: ketens, prijzen, nieuws, frietwagen en woningen ----
const VIEW = { id: 'kaas', name: 'Melk naar kaas', margin: 0.15, sourceKg: 440, sourceCount: 2, picked: 0, closedDays: 3, last: { net: 12 }, weakest: { kind: 'transport', text: 'Melkvee: te weinig wagens naar de volgende schakel. Stel een chauffeur aan.' },
  sources: [{ id: 'pa', name: 'Weide <b>x</b>', kg: 220, picked: true }],
  links: [{ id: 'melk', label: 'Melkvee', role: 'source', owned: false, ownable: false, fill: 0.5, stock: 10000, cap: 20000, perDay: 6000, trucks: 1, wage: 95, distance: 1200, ref: null, options: [] },
    { id: 'kaasmakerij', label: 'Kaasmakerij', role: 'processor', owned: true, ownable: true, fill: 0.95, stock: 9500, cap: 10000, perDay: 5000, trucks: 0, wage: 0, distance: 0, ref: 1001, options: [{ ref: 1001, label: 'industrie bij Winsum' }] },
    { id: 'verkoop', label: 'Boerderijwinkel of markt', role: 'outlet', owned: false, ownable: true, fill: 0, stock: 0, cap: 1500, perDay: 400, trucks: 0, wage: 0, distance: 0, ref: null, options: [] }] };
t('ketens: schakels met balk, eigen en niet eigen, zwakste schakel, koppelkiezer, wagens en bronnen; alles ontsnapt', () => {
  const h = U.chainsHtml([VIEW], 5000);
  assert.match(h, /data-chain="kaas"/); assert.match(h, /data-bz-bind="kaas\|kaasmakerij" data-bz-cycle="bind:kaas\|kaasmakerij"[^>]*data-cur="1001"/); assert.ok(!/<select/.test(h), 'geen native keuzelijst (#1272)');
  assert.match(h, /data-own="1"/); assert.match(h, /data-own="0"/); assert.match(h, /data-vol="1"/); assert.match(h, /Zwakste schakel: Melkvee/);
  assert.match(h, /extra marge 15%/); assert.match(h, /gesloten keten: 3 dagen/); assert.match(h, /data-bz="wagen-plus"/); assert.match(h, /data-bz="wagen-min"/); assert.match(h, /data-bz="keten-uit"/);
  assert.ok(!h.includes('<b>x</b>') && h.includes('&lt;b&gt;x'));
  assert.match(h, /10\.000 van 20\.000 kg/); assert.match(h, /1\.200 m naar de volgende/);
  assert.equal(U.chainsHtml([], 0), ''); assert.equal(U.chainsHtml(null), '');
});
t('prijzen: een tabel per streek met de beste bovenaan en een productkiezer', () => {
  const board = { product: 'graan', best: { region: 'hogeland' }, auction: { text: 'Veilingdag: graan brengt vandaag 25% meer op.' }, rows: [{ region: 'hogeland', factor: 1.2, price: 0.18, trend: 'op' }, { region: 'oldambt', factor: 0.9, price: 0.13, trend: 'neer' }] };
  const h = U.marketHtml(board, ['graan', 'melk']);
  assert.match(h, /Prijzen vandaag per streek/); assert.match(h, /data-best="1"/); assert.match(h, /Hogeland/); assert.match(h, /data-bz-cycle="product"[^>]*data-cur="graan"/); assert.match(h, /Product: graan/i); assert.ok(!/<select data-bz-product/.test(h)); assert.match(h, /Veilingdag/); assert.match(h, /3% per 1\.000 kg/);
  assert.equal(U.marketHtml(null), '');
});
t('nieuws: hoogstens vijf regels, de buurman met knoppen en de trekkertrek; leeg is rustig', () => {
  const lines = Array.from({ length: 9 }, (_, i) => ({ t: `Regel ${i}`, k: 'weer' }));
  const h = U.newsHtml({ lines, scene: { id: 'heg', text: 'Buurman Hindrik vindt je heg te hoog.', choices: [{ id: 'praat', label: 'Een praatje maken', cost: 0 }, { id: 'knip', label: 'De heg bijknippen', cost: 25 }] }, pull: [{ region: 'hogeland', name: 'Zomerkermis', label: 'Trekkertrek', classes: [{ id: 'licht', label: 'Licht tot 90 pk', fee: 50, top: 250 }] }] });
  assert.equal((h.match(/<li /g) || []).length, 5); assert.match(h, /data-bz="buur"/); assert.match(h, /data-choice="knip"/); assert.match(h, /€\s?25/); assert.match(h, /Trekkertrek bij Zomerkermis in Hogeland/);
  assert.match(U.newsHtml({ lines: [], scene: null, pull: [] }), /het land is rustig/); assert.equal(U.newsHtml(null), '');
});
t('frietwagen: aanbod met het verhaal, bezit met standplaatsen, verkopen vraagt bevestiging', () => {
  const def = { label: 'Frietwagen', story: 'Tessa en Tammo, 24, net afgestudeerd, draaien hem zelf.', price: 7500 };
  const offer = U.mobileHtml([], [{ id: 'frietwagen', ...def }], 10000, 0);
  assert.match(offer, /Frietwagen te koop/); assert.match(offer, /Tessa en Tammo/); assert.match(offer, /data-bz="koop-mobiel"/);
  assert.match(U.mobileHtml([], [{ id: 'frietwagen', ...def }], 100, 0), /disabled/);
  const own = U.mobileHtml([{ id: 'frietwagen', def, spot: 'markt', spotLabel: 'Grote Markt', biz: { q: 90, p: 7500 }, value: 7000, forecast: { revenue: 120 } }], [], 0, 0);
  assert.match(own, /Grote Markt/); assert.match(own, /data-spot="kermis"/); assert.match(own, /data-bz="verkoop-mobiel"/); assert.match(own, /120/);
  U.ui.confirm = 'verkoop-mobiel:frietwagen';
  assert.match(U.mobileHtml([{ id: 'frietwagen', def, spot: 'park', spotLabel: 'Noorderplantsoen', biz: { q: 90, p: 7500 }, value: 1 }], [], 0, 0), /Zeker\?/);
  U.ui.confirm = null;
});
t('woningen: te koop met prijs en plaats, een gekochte woning toont de verhuur', () => {
  const h = U.homesHtml([{ osm: 8589934600, town: { name: 'Winsum' }, row: { m2: 90 }, dist: 120, forSale: true, price: 40000, reason: '' }], 100000);
  assert.match(h, /Woning bij Winsum/); assert.match(h, /data-bz="koop-pand"/); assert.match(h, /verhuurd|Verhuurd|verhuurd/i); assert.equal(U.homesHtml([], 1), '');
  const mine = U.businessesHtml({ mine: [{ osm: 9, kind: { type: 'woning' }, place: 'Winsum', biz: { cls: 'rent', type: 'woning', q: 100, p: 40000, base: 40000, cfg: { vu: 0 } } }], near: [], day: 5 });
  assert.match(mine, /Verhuurd: /);
  const empty = U.businessesHtml({ mine: [{ osm: 9, kind: { type: 'woning' }, place: 'Winsum', biz: { cls: 'rent', type: 'woning', q: 100, p: 40000, base: 40000, cfg: { vu: 9 } } }], near: [], day: 5 });
  assert.match(empty, /Leeg: een nieuwe huurder wordt gezocht/);
});

// Het scherm Land en bedrijf bevroor de pagina: met de index al geladen riep renderBezitPanels via ensureIndex().then(rerender) zichzelf eindeloos aan in microtaken.
// Hier telt een nep-element de aanroepen: na het laden mag één render hoogstens één keer opnieuw tekenen.
await (async () => {
  n++;
  try {
    reset();
    let renders = 0;
    const el = () => ({ _h: '', set innerHTML(v) { this._h = v; if (++renders > 500) throw new Error('microtaaklus: renderBezitPanels herhaalt zichzelf'); }, get innerHTML() { return this._h; }, addEventListener() {} });
    const els = { overzicht: el(), bedrijven: el(), tekoop: el(), snack: null };
    U.renderBezitPanels(els, w());
    for (let i = 0; i < 200; i++) await new Promise((r) => setImmediate(r));
    const settled = renders;
    for (let i = 0; i < 200; i++) await new Promise((r) => setImmediate(r));
    assert.ok(renders <= 500, 'renderBezitPanels blijft zichzelf aanroepen (microtaaklus)');
    assert.equal(renders, settled, 'renderBezitPanels blijft hertekenen');
    assert.ok(settled <= 9, 'te veel hertekeningen: ' + settled);
  } catch (e) { fails++; console.log('FAIL renderBezitPanels: geen eindeloze hertekening', '\n  ', String(e.message).split('\n')[0]); }
})();

t('Overzicht: sorteren en filteren zijn chips die doorschakelen, geen native keuzelijsten (#1245)', () => {
  assert.equal(U.nextOption([['a', 'A'], ['b', 'B'], ['c', 'C']], 'c'), 'a', 'rond aan het eind');
  assert.equal(U.nextOption([['', 'Alles'], ['x', 'X']], ''), 'x');
  const c = U.cycleChip('filter:region', 'Streek', [['', 'Alles'], ['Hogeland', 'Hogeland']], 'Hogeland');
  assert.match(c, /ds-z-chip/); assert.match(c, /Streek: Hogeland/); assert.match(c, /data-bz-cycle="filter:region"/);
  reset();
  const world = w();
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const h = U.summaryHtml(ctx(world));
  assert.ok(!/<select data-bz-(sort|filter)/.test(h), 'geen native select');
  assert.equal((h.match(/data-bz-cycle=/g) || []).length, 4, 'Sorteren, Streek, Soort en Beheer');
});
t('Te koop: laden en leeg zijn twee aparte toestanden (#1251)', () => {
  const laden = U.forSaleHtml({ money: 1, offers: [], laden: true });
  const leeg = U.forSaleHtml({ money: 1, offers: [], laden: false });
  assert.match(laden, /data-leeg="laden"/); assert.match(leeg, /data-leeg="niets"/);
  assert.ok(!/geladen, of er is niets/.test(laden + leeg), 'niet meer een dubbelzinnige zin');
});
t('Bedrijven verwijst naar het tabblad Snackwagen in plaats van zelf te verkopen (#1250)', () => {
  const h = U.snackVerwijsHtml([]);
  assert.match(h, /tabblad Snackwagen/); assert.ok(!/data-bz=/.test(h));
});
console.log(`bezitui_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
