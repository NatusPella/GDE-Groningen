// Tekstmassa van de boerderijschermen (eigenaar 22-11: minder lappen tekst, meer beeld): zichtbare tekens per tab en per tekstblok.
// Zichtbaar = de markup zonder tags en zonder de inhoud van <details> (uitleg op verzoek) en zonder verborgen/aria-only plaatjes.
//   node scripts/boerderij_tekstmassa_test.mjs          (toetst de limieten)
//   node scripts/boerderij_tekstmassa_test.mjs --rapport (drukt de tabel voor docs/BOERDERIJ-VISUEEL-22-11.md)
import assert from 'node:assert/strict';
import './node3d.mjs';
const Live = await import('../game/js/boerderijlive.js');
const PC = await import('../game/js/percelen.js');
const { renderBoerderijPanel } = await import('../game/js/boerderijui.js');

const RAPPORT = process.argv.includes('--rapport');
// Limieten (tekens zichtbare tekst per tab) in een gevulde boerderij: elk scherm is beeld-eerst, de rest zit in Details.
export const LIMIET = { perceel: 1400, percelen: 1800, erf: 1000, gewas: 1700, machines: 1800, kas: 700, bank: 550 }; // kas 600 naar 700 (bezit-ui 24-11: de kas kreeg een kaart met uitleg, 655 tekens gemeten)
// Een lang tekstblok (p of rij) boven deze lengte is een lap.
export const LAP = 160;

const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
Live.zetBoerderijVoorTest(null, nepOpslag());
const handlers = {};
const el = { innerHTML: '', dataset: {}, addEventListener: (k, f) => { handlers[k] = f; }, querySelector: () => null, querySelectorAll: () => [] };
const world = { money: 400000, clock: 8, addMessage() {} };
const klik = (data) => handlers.click({ target: { closest: (sel) => {
  const m = { '[data-pc]': 'pc', '[data-bd]': 'bd', '[data-bd-gewas]': 'bdGewas', '[data-mc]': 'mc' }[sel];
  return m && data[m] ? { dataset: data } : null;
} } });
const koop = (d) => { klik(d); klik(d); };

export const zichtbaar = (html) => html.replace(/<details[\s\S]*?<\/details>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
// Losse tekstblokken: de inhoud van p, h-kopjes en spans zonder kinderen, voor de lijst "lappen".
const blokken = (html) => (html.replace(/<details[\s\S]*?<\/details>/g, ' ').match(/<(p|span|small|li|h\d)\b[^>]*>[^<]*(?:<(?:b|em|strong)>[^<]*<\/(?:b|em|strong)>[^<]*)*<\/\1>/g) || [])
  .map((x) => zichtbaar(x)).filter(Boolean);

// Een gevulde boerderij: extra percelen en erven, machines en werktuigen, een lening, wat opslag.
renderBoerderijPanel(el, world);
for (const id of PC.PERCEEL_IDS.slice(0, 4)) koop({ pc: 'koop', soort: 'perceel', id });
for (const id of (PC.ERF_IDS || []).slice(0, 2)) koop({ pc: 'koop', soort: 'erf', id });
for (const id of ['trekker-klein', 'maaidorser', 'aanhanger', 'ploeg-3']) { try { koop({ mc: 'koop-cat', type: id }); } catch (e) { /* ontbrekend */ } }

const TABS = ['perceel', 'percelen', 'erf', 'gewas', 'machines', 'kas', 'bank'];
export const meet = () => {
  const uit = {};
  for (const id of TABS) {
    klik({ bd: id });
    const html = el.innerHTML;
    const tekst = zichtbaar(html);
    uit[id] = { tekens: tekst.length, lappen: blokken(html).filter((x) => x.length > LAP), details: (html.match(/<details/g) || []).length, plaatjes: (html.match(/data-fp="/g) || []).length };
  }
  return uit;
};
const tekstArg = process.argv.find((a) => a.startsWith('--tekst='));
if (tekstArg) { klik({ bd: tekstArg.slice(8) }); console.log(zichtbaar(el.innerHTML)); process.exit(0); }
// De schermen van Land en bedrijf (bezitui.js, pure HTML): alleen meten en een ruim plafond tegen terugval (de vormgeving ervan volgt in een eigen ronde).
const U = await import('../game/js/bezitui.js');
const L = await import('../game/js/bezitlive.js');
const GT = await import('../game/js/bezitgate.js');
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490]] };
const BFILE = { v: 1, types: ['retail', 'church', 'industrial'], rows: [[111, 220150, 590150, 400, 0, 6, 0], [222, 220160, 590160, 900, 1, 12, 1], [333, 220170, 590170, 2000, 2, 8, 0]] };
export const BEZIT_LIMIET = { overzicht: 1200, bedrijven: 700, tekoop: 500 };
export const meetBezit = () => {
  const op = nepOpslag();
  L.initBezit({ opslag: op }); Live.initBoerderij({ opslag: op }); L.setIndexForTest(FILE, BFILE); L.setClaimLookup(null); GT.resetUnlockGate();
  const w2 = { money: 1e6, addMessage() {} };
  L.koopPerceel(w2, 'paaaaaaaaaaa1'); L.koopPand(w2, 111);
  const ctx = { bezit: L.getBezit(), farm: Live.getBoerderij(), money: w2.money, day: 0 };
  const offers = [{ ...L.parcelOffer('pbbbbbbbbbbb2'), dist: 120 }];
  const htmls = { overzicht: U.summaryHtml(ctx), bedrijven: U.businessesHtml({ money: w2.money, mine: L.myBusinesses(), near: L.buildingsNear(220150, 590150, 300) }), tekoop: U.forSaleHtml({ money: w2.money, offers }) };
  return Object.fromEntries(Object.entries(htmls).map(([k, h]) => [k, { tekens: zichtbaar(h).length, lappen: blokken(h).filter((x) => x.length > LAP) }]));
};
const m = meet();
const mb = meetBezit();
if (RAPPORT) {
  for (const id of TABS) console.log(`${id.padEnd(10)} ${String(m[id].tekens).padStart(5)} tekens  lappen ${m[id].lappen.length}  details ${m[id].details}  plaatjes ${m[id].plaatjes}`);
  for (const id of Object.keys(mb)) console.log(('bezit:' + id).padEnd(16) + String(mb[id].tekens).padStart(5) + ' tekens  lappen ' + mb[id].lappen.length);
  for (const id of TABS) for (const l of m[id].lappen) console.log(`  lap in ${id} (${l.length}): ${l.slice(0, 90)}...`);
  process.exit(0);
}
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
for (const id of TABS) {
  t(`tekstmassa ${id}: <= ${LIMIET[id]} tekens`, () => assert.ok(m[id].tekens <= LIMIET[id], `${m[id].tekens} tekens`));
  t(`tekstmassa ${id}: geen lap boven ${LAP} tekens`, () => assert.equal(m[id].lappen.length, 0, m[id].lappen.map((x) => x.slice(0, 60)).join(' | ')));
}
for (const id of Object.keys(mb)) t('tekstmassa Land en bedrijf ' + id + ': <= ' + BEZIT_LIMIET[id] + ' tekens', () => assert.ok(mb[id].tekens <= BEZIT_LIMIET[id], mb[id].tekens + ' tekens'));
t('Machines, Erf, Gewas en Percelen tonen plaatjes (data-fp)', () => { for (const id of ['machines', 'erf', 'gewas', 'percelen']) assert.ok(m[id].plaatjes > 0, id); });
console.log(`boerderij_tekstmassa_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
