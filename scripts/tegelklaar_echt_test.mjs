// De definitie van tegel-klaar (tileready.js) over de ECHTE tegelopbouw (tileworld.js, #1354): node scripts/tegelklaar_echt_test.mjs
// Een gestroomde tegel gaat in stukken door de wachtrij (queueTile). Zolang een stuk openstaat is de tegel niet klaar op niveau "colliders"
// (de rijen staan nog niet in de kaart), en pas als de wachtrij leeg is staan zijn gebouwen echt in het raster. Het grootboek en de sensoren
// moeten dat volgen; een tegel mag dus nooit klaar heten terwijl de opbouw nog loopt.
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld } = await import('../game/js/tileworld.js');
const { createTileLedger, regionReadiness, LEVELS } = await import('../game/js/tileready.js');
const { collectReady } = await import('../game/js/readysensors.js');
const { queueNear } = await import('../game/js/benchsettle.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 1 }, meta: {} } }] };
const tw = TileWorld.fromTiles(global, [{ i: 0, j: 0, sections: [{ type: G.SECTION.BUILDINGS, rows: [{ gid: 0, pts: sq(500, 500, 10), type: 'house' }] }] }]);

// een gestroomde tegel met veel gebouwen: meer dan één stuk (ROW_CHUNK)
const [ox, oy] = G.tileOrigin(1, 0);
const rows = [];
for (let k = 0; k < 900; k++) rows.push({ gid: 100 + k, pts: sq(ox + 20 + (k % 30) * 30, oy + 20 + Math.floor(k / 30) * 30, 12), type: 'house' });
const key = G.tileKey(1, 0);
const tile = { i: 1, j: 0, sections: [{ type: G.SECTION.BUILDINGS, rows }] };
const focus = { x: ox + 300, y: oy + 300 };
const near = () => tw.buildingsNear(focus.x, focus.y, 1500).length - 1;

const counts = () => collectReady({ tileQueue: () => queueNear(tw.tileQueue.items, focus, 400) });

ok(counts().total === 0 && regionReadiness(counts()).ready, 'voor de aanvraag: niets open');
const tk = tw.queueTile(tile, key);
ok(tw.tileQueue.items.some((it) => String(it.label).startsWith('add:')), 'de tegel staat als stuk(ken) in de wachtrij');
const c0 = counts();
ok(c0.colliders >= 1 && !regionReadiness(c0).ready && regionReadiness(c0).blocking[0].level === 'colliders', 'met een stuk open: niet klaar, de blokkade is "colliders"', JSON.stringify(c0));
ok(near() === 0, 'en de gebouwen staan inderdaad nog niet in het raster', String(near()));

// het grootboek volgt de wachtrij: data klaar, colliders open
const L = createTileLedger();
L.complete(tk, 'data');
L.open(tk, 'colliders', 'rijen', 0);
ok(!L.ready(tk) && !L.ready(tk, ['colliders']) && L.ready(tk, ['data']), 'grootboek: data klaar, colliders open');

// de wachtrij in kleine hapjes: nooit klaar zolang er een stuk is, en elke tussenstand is consistent
let steps = 0, everReadyEarly = false;
while (tw.tileQueue.items.length && steps < 5000) {
  tw.tileQueue.run(0.05); steps++;
  const c = counts();
  if (tw.tileQueue.items.length && regionReadiness(c).ready) everReadyEarly = true;
  if (!tw.tileQueue.items.length && c.colliders !== 0) everReadyEarly = true;
}
ok(!everReadyEarly, 'tijdens de opbouw heet de tegel nooit klaar, en na de opbouw staat de teller op 0');
ok(steps >= 2, 'de opbouw ging in meerdere stukken (anders bewijst dit niets)', String(steps));
ok(counts().total === 0 && regionReadiness(counts()).ready, 'wachtrij leeg: klaar op alle niveaus die deze sensor kent');
ok(near() >= 850, 'en de gebouwen staan nu echt in het raster (de colliders kloppen)', String(near()));
L.close(tk, 'colliders', 'rijen'); L.complete(tk, 'colliders');
ok(L.level(tk) === LEVELS.indexOf('colliders'), 'grootboek: tot en met colliders');

// een tweede ronde: de tegel wordt weggegooid en opnieuw gevraagd, de sensor ziet het weer
tw.dropTile(tk);
tw.queueTile(tile, key);
ok(counts().colliders >= 1, 'een tegel die opnieuw binnenkomt telt weer als open');
while (tw.tileQueue.items.length) tw.tileQueue.run(1e9);
ok(counts().colliders === 0 && near() >= 850, 'en is daarna weer klaar');

console.log(`${n - fails}/${n} controles in orde`);
process.exit(fails ? 1 : 0);
