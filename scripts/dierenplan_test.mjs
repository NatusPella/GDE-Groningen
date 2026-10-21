// Dierenplan (game/js/dierenplan.js, #193): soorten per streek, dichtheidsbudget, vluchtgedrag, determinisme.
import { SPECIES, SPECIES_IDS, STREEK_MIX, STREKEN_PLAN, TILE_BUDGET, TOTAL_BUDGET, DESPAWN_M, tileAnimals, capByBudget, wildlifeLimits, grazerPick, gansKans, fleeFrom, calmed, soundOf } from '../game/js/dierenplan.js';
import { STREKEN } from '../game/js/regioleven.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// elke streek van regioleven.js heeft een mix, plus stad en wadden; alleen bekende soorten
for (const s of STREKEN) ok(STREKEN_PLAN.includes(s.id), 'mix voor streek', s.id);
ok(STREKEN_PLAN.includes('stad') && STREKEN_PLAN.includes('wadden'), 'stad en wadden');
for (const [s, mix] of Object.entries(STREEK_MIX)) for (const [k, f] of Object.entries(mix)) ok(SPECIES[k] && f > 0 && f <= 2, 'bekende soort', `${s} ${k}`);
// elke soort leeft in minstens één streek
for (const k of SPECIES_IDS) ok(STREKEN_PLAN.some((s) => STREEK_MIX[s][k]), 'soort heeft een streek', k);
// de gevraagde soorten staan er
for (const k of ['koe', 'schaap', 'gans', 'meeuw', 'reiger', 'vis', 'zeehond']) ok(SPECIES[k], 'soort ' + k);
ok(STREEK_MIX.wadden.zeehond > 0 && !STREEK_MIX.stad.zeehond, 'zeehonden alleen op de Waddenkust');
ok(!STREEK_MIX.stad.koe && STREEK_MIX.westerkwartier.koe > STREEK_MIX.oldambt.koe, 'koeien op het platteland');

const HAB = { weide: 1, water: 1, kust: 1, wad: 1, dijk: 1, stad: 1 };
const MILD = { weide: 0.25, water: 0.25, kust: 0.25, wad: 0.25, dijk: 0.25, stad: 0.25 };
// determinisme en budget over veel tegels
let withAnimals = 0, total = 0;
for (const s of STREKEN_PLAN) for (let x = 0; x < 20; x++) for (let y = 0; y < 20; y++) {
  const a = tileAnimals(s, x, y, HAB, 4), b = tileAnimals(s, x, y, HAB, 4), c = tileAnimals(s, x, y, MILD, 4);
  ok(JSON.stringify(a) === JSON.stringify(b), 'zelfde tegel, zelfde dieren');
  const sum = a.reduce((t, g) => t + g.n, 0);
  ok(sum <= TILE_BUDGET, 'tegelbudget', `${s} ${x},${y} ${sum}`);
  for (const g of a) ok(SPECIES[g.kind] && STREEK_MIX[s][g.kind] && g.x >= 0 && g.x <= 128 && g.y >= 0 && g.y <= 128 && g.n >= 1, 'geldig groepje');
  if (c.length) withAnimals++;
  total++;
}
ok(withAnimals / total > 0.2 && withAnimals / total < 0.95, 'niet leeg, niet vol', String(withAnimals / total));
ok(tileAnimals('stad', 1, 1, {}).length === 0, 'zonder habitat geen dieren');
ok(tileAnimals('hogeland', 3, 3, { weide: 1 }, 1).every((g) => SPECIES[g.kind].habitat === 'weide'), 'soorten blijven in hun habitat');
// andere seed geeft een andere verdeling
let diff = 0;
for (let x = 0; x < 20; x++) if (JSON.stringify(tileAnimals('wadden', x, 0, HAB, 1)) !== JSON.stringify(tileAnimals('wadden', x, 0, HAB, 2))) diff++;
ok(diff > 3, 'seed verandert verdeling', String(diff));

// totaalbudget per kwaliteit
const groups = Array.from({ length: 60 }, (_, i) => ({ n: 4, x: (i % 10) * 20, y: Math.floor(i / 10) * 20 }));
let prev = 0;
for (const q of ['laag', 'middel', 'hoog']) {
  const { kept, used } = capByBudget(groups, 0, 0, q);
  ok(used <= TOTAL_BUDGET[q] && used > prev, 'totaalbudget ' + q, `${used}`);
  ok(kept.every((g) => Math.hypot(g.x, g.y) <= DESPAWN_M), 'binnen despawn');
  prev = used;
}
const near = capByBudget(groups, 0, 0, 'laag').kept[0];
ok(near.x === 0 && near.y === 0, 'dichtstbij eerst');

// vluchtgedrag
const f1 = fleeFrom('koe', 5, 0, { x: 0, y: 0, speed: 3, kind: 'speler' });
ok(f1 && f1.ux === 1 && f1.uy === 0 && f1.speed > 0, 'koe rent van de speler af');
ok(fleeFrom('koe', 20, 0, { x: 0, y: 0, speed: 3, kind: 'speler' }) === null, 'ver weg schrikt niet');
ok(fleeFrom('koe', 5, 0, { x: 0, y: 0, speed: 0, kind: 'speler' }) === null, 'stilstaande speler schrikt niet dichtbij niet-genoeg');
ok(fleeFrom('gans', 15, 0, { x: 0, y: 0, speed: 15, kind: 'voertuig' }) !== null, 'voertuig schrikt verder');
ok(fleeFrom('gans', 15, 0, { x: 0, y: 0, speed: 0, kind: 'voertuig' }) === null, 'geparkeerd voertuig niet');
ok(fleeFrom('zeehond', 10, 0, { x: 0, y: 0, speed: 2, kind: 'speler' }).move === 'duiken', 'zeehond duikt');
ok(fleeFrom('draak', 1, 1, { x: 0, y: 0, speed: 3, kind: 'speler' }) === null, 'onbekende soort');
ok(fleeFrom('koe', 0, 0, { x: 0, y: 0, speed: 3, kind: 'speler' }).ux === 1, 'op dezelfde plek: geen NaN');
for (const k of SPECIES_IDS) for (let d = 0; d < 30; d += 3) {
  const f = fleeFrom(k, d, 0, { x: 0, y: 0, speed: 6, kind: 'speler' });
  ok(!f || (Number.isFinite(f.speed) && f.speed > 0 && f.speed <= SPECIES[k].speed), 'vluchtsnelheid', `${k} ${d}`);
}
ok(calmed(7, 1, 'koe') && calmed(1, 100, 'koe') && !calmed(1, 3, 'koe'), 'tot rust komen');
// geluid
ok(soundOf('koe') === 'cow' && soundOf('schaap') === 'sheep' && soundOf('meeuw') === 'seagull' && soundOf('zeehond') === 'seal' && soundOf('reiger') === 'heron' && soundOf('vis') === 'fish' && soundOf('xyz') === null, 'geluid');
// aansluiting op wildlife.js: limieten volgen streek en kwaliteit
{
  const base = { seagull: 7, grazer: 3, duck: 6, pigeon: 14, cat: 2, dog: 3 };
  const wad = wildlifeLimits('wadden', 'hoog', base), wk = wildlifeLimits('westerkwartier', 'hoog', base), laag = wildlifeLimits('wadden', 'laag', base);
  ok(wad.seagull > wk.seagull, 'meer meeuwen op de Waddenkust');
  ok(wk.grazer > wad.grazer, 'meer grazers in het Westerkwartier');
  ok(laag.seagull < wad.seagull, 'lage kwaliteit heeft minder dieren');
  ok(wad.pigeon === 14 && wad.cat === 2 && wad.dog === 3, 'stadsdieren onaangeroerd');
  for (const s of STREKEN_PLAN) for (const q of ['laag', 'middel', 'hoog']) { const l = wildlifeLimits(s, q, base); ok(l.seagull >= 1 && (l.grazer >= 1 || s === 'stad') && l.duck >= 1, 'minstens een', s + q); }
  ok(grazerPick('westerkwartier', 0.2) === 'cow' && grazerPick('hogeland', 0.9) === 'sheep', 'koe of schaap naar streek');
  ok(wildlifeLimits('onbekend', 'hoog', base).seagull >= 1, 'onbekende streek valt terug op stad');
  ok(wildlifeLimits('stad', 'hoog', base).grazer === 0 && wildlifeLimits('onbekend', 'laag', base).grazer === 0, 'de stad heeft geen vee (#330)');
}
ok(gansKans('oldambt') > gansKans('stad') && gansKans('stad') === 0 && gansKans('hogeland') <= 0.6, 'ganzen op het land naar streek');
console.log(`dierenplan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
