// Pure list model and icons of the shop screen (game/js/shoplist.js, shopicons.js):
//   node scripts/shoplist_test.mjs
import {
  itemIcon, itemStatus, shortfall, brokeMessage, refusalMessage, needsConfirm, buyLabel, shopTabs, tabSections, stepTab, keepTab,
  flatItems, keepItem, shortPerk, ICON_IDS,
} from '../game/js/shoplist.js';
import { SHOP_ICONS, shopIconSvg } from '../game/js/shopicons.js';
import { SHOP_KINDS } from '../game/js/winkelkit.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const is = (a, b, name) => ok(a === b, name, `${a} != ${b}`);

// icons: every id has a drawing, every drawing is well-formed
for (const id of ICON_IDS) ok(id in SHOP_ICONS, 'icon drawn: ' + id);
for (const [id, ic] of Object.entries(SHOP_ICONS)) {
  ok(/^[MmLlHhVvZzAaCc0-9 .,\-]+$/.test(ic.d) && ic.d.startsWith('M'), 'path ok: ' + id);
  ok(shopIconSvg(id).includes('<svg') && !shopIconSvg(id).includes('NaN'), 'svg ok: ' + id);
}
ok(shopIconSvg('bestaat-niet') === shopIconSvg('standaard'), 'unknown icon falls back');

// icon choice per kind of item
is(itemIcon({ id: 'f-krentenbol', label: 'Krentenbol' }), 'eten', 'krentenbol');
is(itemIcon({ id: 'f-koffie', label: 'Koude bak koffie' }), 'drank', 'koffie');
is(itemIcon({ id: 'w-pistol', label: 'Pistool "Klapperman"' }), 'wapen', 'pistool');
is(itemIcon({ id: 'armor-100', label: 'Kogelwerend vest' }), 'vest', 'vest');
is(itemIcon({ id: 'x', label: 'Racebanden' }), 'band', 'banden');
is(itemIcon({ id: 'x', label: 'Turbo "Tinus"' }), 'tuning', 'turbo');
is(itemIcon({ id: 'x', label: 'Kraskaart' }), 'kras', 'kraskaart');
is(itemIcon({ id: 'x', label: 'Vuurwerkpijlen "Sterrenregen"' }), 'knaller', 'vuurwerk');
is(itemIcon({ id: 'x', label: 'Honkbalknuppel "Stadjer Slugger"' }), 'knuppel', 'knuppel');
is(itemIcon({ id: 'x', label: 'Zeven versnellingen' }), 'fiets', 'versnellingen');
is(itemIcon({ id: 'x', label: 'Mysterie' }, 'kleding'), 'kleding', 'shop fallback');
is(itemIcon({ id: 'x', label: 'Mysterie' }, 'onbekend'), 'standaard', 'last fallback');
is(itemIcon({ id: 'x', label: 'Mysterie' }, '', 'Eten & drinken'), 'eten', 'section fallback');
// every real item of the stock lands on a drawn icon, and all shop types have one
// shops.js pulls in three.js from a CDN, so the stock is read as text from its source (the shop types are in shopdata.js)
import fs from 'node:fs';
const src = ['shops.js', 'shopdata.js'].flatMap((f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8').split(/\r?\n/));
const labels = (re) => src.map((l) => (l.match(re) || [])[1]).filter(Boolean);
const shopTypes = labels(/^  (\w+): \{ color: '#/);
ok(shopTypes.length >= 15, 'found the shop types', String(shopTypes.length));
for (const t of shopTypes) ok(itemIcon({ id: 'q', label: 'Q' }, t) in SHOP_ICONS && itemIcon({ id: 'q', label: 'Q' }, t) !== 'standaard', 'shop icon: ' + t);
for (const k of SHOP_KINDS) ok(itemIcon({ id: 'q', label: 'Q' }, k) !== 'standaard', 'winkelkit icon: ' + k);
const stock = labels(/^  \{ key: '[^']+', label: '([^']+)'/);
ok(stock.length >= 12, 'found the weapons', String(stock.length));
for (const l of stock) ok(itemIcon({ id: 'q', label: l }, 'wapens') in SHOP_ICONS, 'weapon icon: ' + l);
is(itemIcon({ id: 'a', label: 'Pistool "Klapperman"' }, 'wapens'), 'wapen', 'pistool');
is(itemIcon({ id: 'a', label: 'Bezem "Zaterdagochtend"' }, 'wapens'), 'knuppel', 'bezem');
is(itemIcon({ id: 'a', label: 'Carbidbus "Oudjoar"' }, 'wapens'), 'knaller', 'carbid');
for (const l of ['Stadjer classic', 'Boer op zundag', 'Keuningsdag', 'Corpsbal', 'Zwart incognito', 'Wadloper', 'Noorderzon']) is(itemIcon({ id: 'o', label: l }, 'kleding'), 'kleding', 'outfit icon: ' + l);
for (const l of ['Racebanden', 'Zeven versnellingen', 'Opgevoerde accu', 'Sportuitlaat', 'Grote remschijven', 'Opgevoerde motor', 'Sportremmen', 'Brede banden', 'Sperdifferentieel', 'Groot roer', 'Carbon peddels']) ok(itemIcon({ id: 'u', label: l }, 'tuning') in SHOP_ICONS, 'upgrade icon: ' + l);

// status
const S = (it, money = 100) => itemStatus(it, money).id;
is(S({ price: 50 }), 'koop', 'can buy');
is(S({ price: 150 }), 'duur', 'too dear by money');
is(S({ price: 150, disabled: 'Te weinig geld' }), 'duur', 'too dear by flag');
is(S({ price: 50, disabled: 'Heb je al' }), 'heb', 'owned');
is(S({ price: 0, disabled: 'Heb je al aan' }), 'heb', 'worn');
is(S({ price: 0, disabled: 'Heeft deze kleur al' }), 'heb', 'same colour');
is(S({ price: 0, disabled: 'Al gedaan' }), 'heb', 'done');
is(S({ price: 0, disabled: 'Nog op slot' }), 'slot', 'locked');
is(S({ price: 0, disabled: 'Zak zit vol' }), 'nu', 'full');
is(S({ income: 40 }), 'verkoop', 'sell');
is(S({ price: 0 }), 'gratis', 'free');
is(S({ plain: true }), 'kies', 'choice');
ok(itemStatus({ price: 50 }, 100).buyable && !itemStatus({ price: 150 }, 100).buyable && !itemStatus({ disabled: 'Heb je al' }, 100).buyable, 'buyable flags');
is(itemStatus({ price: 0, tag: 'Van jou', disabled: 'x' }, 0).label, 'Van jou', 'tag Van jou');
is(itemStatus({ price: 50, disabled: 'Te weinig geld' }, 0).label, 'Te duur', 'label te duur');

// feedback on too little money
is(shortfall({ price: 150 }, 100), 50, 'shortfall');
is(shortfall({ price: 50 }, 100), 0, 'no shortfall');
is(shortfall({ income: 40, price: 0 }, 0), 0, 'sale has none');
is(shortfall({ price: 99.5 }, 0), 100, 'rounds up');
ok(brokeMessage({ price: 1250 }, 0).includes('€1.250') && brokeMessage({ price: 1250 }, 0).includes('Te weinig geld'), 'broke message names the gap', brokeMessage({ price: 1250 }, 0));
ok(brokeMessage({ price: 10 }, 20).startsWith('Te weinig geld'), 'broke message w/o gap');
ok(refusalMessage({ label: 'Pet', price: 50, disabled: 'Heb je al' }, 100).includes('heb je al'), 'refusal owned');
ok(refusalMessage({ label: 'Pet', price: 500, disabled: 'Te weinig geld' }, 100).includes('€400'), 'refusal broke');
is(refusalMessage({ label: 'Pet', disabled: 'Zak zit vol' }, 100), 'Zak zit vol', 'refusal passes reason');

// buy flow
ok(!needsConfirm({ price: 50 }, 1000), 'cheap: no confirm');
ok(needsConfirm({ price: 1000 }, 99999), 'dear: confirm');
ok(needsConfirm({ price: 400 }, 600), 'big share: confirm');
ok(!needsConfirm({ price: 400 }, 5000), 'small share: none');
ok(needsConfirm({ price: 5, confirmText: 'Zeker?' }, 999), 'confirmText');
is(buyLabel({ price: 120 }, 'wapens'), 'Kopen voor €120', 'buy label');
is(buyLabel({ price: 120 }, 'tuning'), 'Betalen €120', 'tuning label');
is(buyLabel({ price: 120 }, 'wapens', true), 'Zeker? Nog eens: €120', 'armed label');
is(buyLabel({ income: 30 }, 'pand'), 'Verkopen voor €30', 'sell label');
is(buyLabel({ price: 0 }, 'x'), 'Kiezen', 'free label');
is(buyLabel({ price: 5, disabled: 'Heb je al' }, 'x'), 'Heb je al', 'disabled label');

// tabs
const it = (id, extra = {}) => ({ id, label: id, price: 5, ...extra });
const SECS = [{ title: 'Wapens', items: [it('a'), it('b', { disabled: 'Heb je al' })] }, { title: 'Leeg', items: [] }, { title: 'Vesten', items: [it('c')] }];
const tabs = shopTabs(SECS);
is(tabs.map((t) => t.id).join(), 's0,s1,alles', 'tab ids skip empty sections, Alles last');
is(tabs[2].count, 3, 'alles counts'); is(tabs[2].owned, 1, 'alles owned'); is(tabs[0].label, 'Wapens', 'tab label');
is(shopTabs([SECS[0]]).length, 0, 'one section: no tabs');
is(shopTabs([]).length, 0, 'none: no tabs');
is(tabSections(SECS, 'alles').length, 2, 'alles shows non-empty'); is(tabSections(SECS, 's1')[0].title, 'Vesten', 'tab shows its section');
is(tabSections(SECS, 's9').length, 2, 'bad tab falls back'); is(tabSections(SECS, undefined).length, 2, 'no tab');
is(stepTab(tabs, 's0', 1), 's1', 'next'); is(stepTab(tabs, 'alles', 1), 's0', 'wraps forward'); is(stepTab(tabs, 's0', -1), 'alles', 'wraps back');
is(stepTab([], 'x', 1), 'alles', 'no tabs'); is(stepTab(tabs, 'weg', 1), 's1', 'vanished tab');
is(keepTab(tabs, 's1'), 's1', 'keep'); is(keepTab(tabs, 's7'), 's0', 'drop: first tab'); is(keepTab(tabs, ''), 's0', 'open on the first section'); is(keepTab([], ''), 'alles', 'no tabs');
is(flatItems(tabSections(SECS, 'alles')).length, 3, 'flat');

// selection
const items = [it('a', { disabled: 'Heb je al' }), it('b'), it('c', { story: 'ok' })];
is(keepItem(items, 'b'), 'b', 'keeps'); is(keepItem(items, 'zz'), 'c', 'story item first'); is(keepItem(items.slice(0, 2), null), 'b', 'first buyable');
is(keepItem([items[0]], null), 'a', 'only disabled'); is(keepItem([], 'a'), null, 'empty');

// short property
is(shortPerk({ desc: 'Betrouwbaar, handzaam. Luid genoeg' }), 'Betrouwbaar, handzaam', 'first sentence');
is(shortPerk({ desc: 'x', effect: '+50 pantser' }), '+50 pantser', 'effect first');
ok(shortPerk({ desc: 'a'.repeat(80) }).length <= 54, 'truncated');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
