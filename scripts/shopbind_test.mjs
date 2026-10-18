// Winkels en horeca in de provincie (game/js/shopbind.js, issue #175): de pure
// koppelingslogica (type, keten, verzonnen naam, gebouw, budget) en het databestand.
//   node scripts/shopbind_test.mjs
import fs from 'node:fs';

const S = await import('../game/js/shopbind.js');
const K = await import('../game/js/winkelkit.js');
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } };

// type uit de tags
check(S.classify({ shop: 'bakery' }).type === 'bakker', 'bakery -> bakker');
check(S.classify({ shop: 'hairdresser' }).type === 'kapper', 'hairdresser -> kapper');
check(S.classify({ amenity: 'fast_food' }).type === 'snackbar', 'fast_food -> snackbar');
check(S.classify({ amenity: 'pub' }).group === 'horeca' && S.classify({ amenity: 'bar' }).type === 'kroeg', 'pub/bar -> kroeg');
check(S.classify({ craft: 'bicycle' }).type === 'fietsen', 'craft bicycle -> fietsen');
check(S.classify({ shop: 'car' }) === null && S.classify({ amenity: 'bench' }) === null && S.classify(null) === null, 'garages en meubilair niet');
for (const t of Object.values(S.SHOP_TYPE)) check(K.SHOP_KINDS.includes(t), `${t} bestaat in de winkelkit`);

// ketens
check(S.isChain({ brand: 'Wat dan ook' }), 'brand-tag is een keten');
check(S.isChain({ name: 'Albert Heijn' }) && S.isChain({ name: "McDonald's" }) && S.isChain({ name: 'Jumbo Smit' }), 'bekende ketens op naam');
check(!S.isChain({ name: 'Bakkerij de Wit' }) && !S.isChain({ name: 'Café de Hoek' }), 'lokale zaken zijn geen keten');

// namen: deterministisch, verzonnen, nooit een keten
const seeds = [], names = new Set();
for (let i = 0; i < 400; i++) seeds.push(S.seedOf(`n${i * 7919}`));
for (const g of [['shop', K.SHOP_KINDS], ['horeca', S.HORECA_KINDS]]) {
  for (const t of g[1]) {
    for (const sd of seeds) {
      const n = S.inventName(g[0], t, sd);
      check(n && n === S.inventName(g[0], t, sd), `${t}: naam deterministisch`);
      if (S.isChain({ name: n })) { check(false, `${t}: verzonnen naam lijkt op een keten: ${n}`); break; }
      names.add(n);
    }
  }
}
check(names.size > 100, `genoeg variatie in namen (${names.size})`);

// meetkunde en gebouwkoppeling
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
check(S.pointInPolygon(5, 5, sq(0, 0, 10)) && !S.pointInPolygon(15, 5, sq(0, 0, 10)), 'punt-in-polygoon');
const B = [{ id: 'a', ring: sq(0, 0, 10) }, { id: 'b', ring: sq(30, 0, 10) }];
check(S.bindBuilding(5, 5, B).id === 'a' && S.bindBuilding(5, 5, B).inside, 'punt in gebouw a');
check(S.bindBuilding(25, 5, B).id === 'b' && !S.bindBuilding(25, 5, B).inside, 'dichtstbijzijnde gebouw b, niet erin');
check(S.bindBuilding(20, 5, B, 5) === null, 'buiten de straal geen gebouw');

// budget: niet meer dan max, deterministisch, gebouwgebonden voor losse, gespreid
const items = [];
for (let i = 0; i < 100; i++) items.push({ x: (i % 10) * 20, y: Math.floor(i / 10) * 20, bid: i % 4 ? 'b' + i : null, key: 'n' + String(i).padStart(3, '0') });
const pick = S.applyBudget(items, 20);
check(pick.length === 20 && new Set(pick.map((p) => p.key)).size === 20, 'budget: precies max, geen dubbelen');
check(JSON.stringify(pick) === JSON.stringify(S.applyBudget(items.slice().reverse(), 20)), 'budget: volgorde-onafhankelijk');
check(S.applyBudget(items.slice(0, 5), 20).length === 5, 'budget: onder de max blijft alles');
const xs = pick.map((p) => p.x), ys = pick.map((p) => p.y);
check(Math.max(...xs) - Math.min(...xs) >= 140 && Math.max(...ys) - Math.min(...ys) >= 140, 'budget: gespreid over de tegel');

// het databestand
const url = new URL('../game/shopplaces.json', import.meta.url);
if (fs.existsSync(url)) {
  const d = JSON.parse(fs.readFileSync(url, 'utf8'));
  check(d.v === 1 && d.types.every((t) => S.KNOWN_TYPES.has(t)), 'bestand: alleen bekende types');
  let n = 0;
  for (const [k, rows] of Object.entries(d.tiles)) {
    check(/^\d+_\d+$/.test(k) && rows.length <= d.budget, `bestand: tegel ${k} binnen budget`);
    for (const r of rows) {
      n++;
      check(r.length === 6 && typeof r[3] === 'string' && !S.isChain({ name: r[3] }), `bestand: rij ${k} heeft een verzonnen naam (${r[3]})`);
      if (fails > 10) break;
    }
  }
  const txt = fs.readFileSync(url, 'utf8');
  check(!/https?:|www\.|@|\+31|phone|opening/i.test(txt), 'bestand: geen websites, e-mail, telefoon of openingstijden');
  console.log(`${n} plekken in het bestand gecontroleerd`);
} else console.log('SKIP bestandscontrole: game/shopplaces.json ontbreekt');

console.log(fails ? `${fails} FAIL` : 'ok');
process.exit(fails ? 1 : 0);
