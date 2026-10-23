// Pure list models of the garage and Prestaties sections (game/js/menumodels.js):
//   node scripts/menumodels_test.mjs
import {
  garageCategory, garageGroup, garageShown, garageSections, garageTabCounts, cycleOption, keepSelection, stepSelection,
  GARAGE_FILTERS, GARAGE_SORTS, achPct, achNear, achDone, achCategoryOrder, achCategoryPct, achWhen, ringDash, versionLabel,
} from '../game/js/menumodels.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const same = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, JSON.stringify(a));

const V = [
  { id: 'a', model: 'Zebra', owned: true, topSpeed: 120, spec: { price: 900 } },
  { id: 'b', model: 'Aap', owned: false, locked: false, topSpeed: 160, price: 500, spec: {} },
  { id: 'c', model: 'Mus', owned: false, locked: true, topSpeed: 90, spec: { unlock: 'x' } },
  { id: 'd', model: 'Fiets', owned: true, topSpeed: 30, spec: { kind: 'bike' } },
  { id: 'e', model: 'Bus', owned: false, kind: 'bus', topSpeed: 80, price: 100, spec: {} },
  { id: 'f', model: 'Heli', owned: false, locked: true, topSpeed: 200, spec: { kind: 'heli' } },
  { id: 'g', model: 'Bakkie', owned: false, topSpeed: 100, price: 300, spec: { type: 'Bestelbus' } },
];
const view = (o = {}) => ({ cat: 'all', filter: 'all', sort: 'naam', ...o });

ok(garageCategory(V[0]) === 'autos', 'auto');
ok(garageCategory(V[2]) === 'speciaal', 'unlock is speciaal');
ok(garageCategory(V[3]) === 'fietsen', 'fiets');
ok(garageCategory(V[4]) === 'bussen' && garageCategory(V[6]) === 'bussen', 'bus and big type');
ok(garageCategory(V[5]) === 'luchtvaart', 'heli beats the rest');
ok(garageCategory({ spec: { kind: 'boat' } }) === 'boten' && garageCategory({}) === 'autos', 'boat, empty');
ok(garageGroup(V[0]) === 'owned' && garageGroup(V[1]) === 'sale' && garageGroup(V[2]) === 'locked', 'groups');

same(garageShown(V, view()).map((e) => e.id), ['d', 'a', 'b', 'g', 'e', 'f', 'c'], 'owned, sale, locked; by name within');
same(garageShown(V, view({ sort: 'prijs' })).filter((e) => garageGroup(e) === 'sale').map((e) => e.id), ['e', 'g', 'b'], 'by price');
same(garageShown(V, view({ sort: 'snelheid' })).map((e) => e.id).slice(0, 2), ['a', 'd'], 'by speed, fastest first');
same(garageShown(V, view({ filter: 'locked' })).map((e) => e.id), ['f', 'c'], 'filter');
same(garageShown(V, view({ cat: 'bussen', filter: 'sale' })).map((e) => e.id), ['g', 'e'], 'category and filter');
same(garageShown(V, view({ cat: 'boten' })), [], 'empty selection');
ok(V[0].id === 'a', 'input list is not reordered');
same(garageShown(V, view({ sort: 'nonsense' })).map((e) => e.id), garageShown(V, view()).map((e) => e.id), 'unknown sort falls back to name');

same(garageSections(garageShown(V, view())).map((s) => [s.group, s.items.length]), [['owned', 2], ['sale', 3], ['locked', 2]], 'sections');
same(garageSections(garageShown(V, view({ filter: 'owned' }))).map((s) => s.group), ['owned'], 'empty groups dropped');

const tabs = garageTabCounts(V);
same(tabs.map((t) => t.id), ['autos', 'bussen', 'fietsen', 'luchtvaart', 'speciaal', 'all'], 'tabs without empty categories');
ok(tabs.at(-1).total === 7 && tabs.at(-1).owned === 2, 'all tab counts');

ok(cycleOption(GARAGE_SORTS, 'naam') === 'prijs' && cycleOption(GARAGE_SORTS, 'snelheid') === 'naam', 'sort cycles and wraps');
ok(cycleOption(GARAGE_FILTERS, 'locked') === 'all' && cycleOption(GARAGE_FILTERS, 'zzz') === 'all', 'filter wraps, unknown starts over');

const shown = garageShown(V, view());
ok(keepSelection(shown, 'a') === 'a', 'selection kept');
ok(keepSelection(shown, 'zzz') === 'd' && keepSelection(shown, null) === 'd', 'selection falls to the first');
ok(keepSelection([], 'a') === null, 'nothing to select');
ok(stepSelection(shown, 'd', 1) === 'a' && stepSelection(shown, 'd', -1) === 'c' && stepSelection(shown, 'c', 1) === 'd', 'step wraps');
ok(stepSelection(shown, null, 1) === 'd' && stepSelection([], 'a', 1) === null, 'step without selection');

// Prestaties
const A = [
  { id: 1, unlocked: true, at: 100 }, { id: 2, unlocked: true, at: 300 }, { id: 3, unlocked: false, progress: { cur: 5, goal: 10 } },
  { id: 4, unlocked: false, progress: { cur: 9, goal: 10 } }, { id: 5, unlocked: false, hidden: true, progress: { cur: 5, goal: 10 } },
  { id: 6, unlocked: false, progress: { cur: 0, goal: 10 } }, { id: 7, unlocked: true },
];
ok(achPct({ progress: { cur: 15, goal: 10 } }) === 100 && achPct({}) === 0 && achPct({ progress: { cur: 1, goal: 0 } }) === 0, 'percentage is clamped');
same(achNear(A).map((a) => a.id), [4, 3], 'near: started, visible, furthest first');
same(achDone(A).map((a) => a.id), [2, 1, 7], 'done: newest first, undated last');
same(achCategoryOrder(A).map((a) => a.id).slice(0, 3), [1, 2, 7], 'category: done first (stable)');
same(achCategoryOrder([A[2], A[3]]).map((a) => a.id), [4, 3], 'category: by progress');
ok(achCategoryPct({ items: [], done: 0 }) === 0 && achCategoryPct({ items: [1, 2, 3], done: 1 }) === 33, 'category percentage');
const DAY = 86400000, now = Date.UTC(2026, 5, 10, 12);
const when = (ago) => achWhen(now - ago, now, 0, () => 'datum');
ok(when(3600000) === 'vandaag' && when(DAY) === 'gisteren' && when(3 * DAY) === '3 dagen geleden' && when(7 * DAY) === 'datum', 'when');
ok(achWhen(Date.UTC(2026, 5, 9, 23, 30), Date.UTC(2026, 5, 10, 0, 30), -120, () => 'd') === 'vandaag', 'when respects the local day');

const rd = ringDash(50, 40);
ok(Math.abs(rd.dash * 2 - rd.circ) < 0.02 && rd.pct === 50, 'ring half');
ok(ringDash(150).dash === ringDash(100).circ && ringDash(-5).dash === 0 && ringDash(NaN).pct === 0, 'ring clamps');
ok(versionLabel('0.35.0') === 'GDE Groningen v0.35.0' && versionLabel('v1.2.3') === 'GDE Groningen v1.2.3', 'version label');
ok(versionLabel('dev') === 'GDE Groningen · ontwikkelversie' && versionLabel('') === versionLabel('dev'), 'version label of a dev build');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
