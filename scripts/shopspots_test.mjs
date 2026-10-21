// De koppeling van echte winkels aan panden (game/js/shopspots.js, issue #156):
// een pand met een winkel erin krijgt het type van die winkel, een pand zonder
// niet, en de rang die de gevel en de ruit-shader gebruiken geeft hetzelfde type.
//   node scripts/shopspots_test.mjs
const S = await import('../game/js/shopspots.js');
const K = await import('../game/js/winkelkit.js');
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } };

// rankForType: elk type komt terug als typeOfRank, voor elke seed
for (const t of K.SHOP_KINDS) {
  for (let seed = 0; seed < 50; seed++) {
    const r = K.rankForType(t, seed * 13.7 + 0.3);
    check(r >= 0 && r < 1, `${t}: rang binnen 0..1`);
    check(K.typeOfRank(r) === t, `${t}/${seed}: rang -> type`);
    check(K.facadeLook(r).type === t && K.facadeLook(r).buiten, `${t}: gevel kent type en buitenprop`);
  }
  check(K.rankForType(t, 1.5) === K.rankForType(t, 1.5), `${t}: deterministisch`);
}
check(Number.isFinite(K.rankForType('bestaat-niet', 3)), 'onbekend type geeft toch een rang');

// elk type heeft een eigen patroon in de ruit
const pats = new Set(K.SHOP_KINDS.map((t) => K.WINKEL[t].patroon));
check(pats.size === K.SHOP_KINDS.length, `patronen in de ruit: ${pats.size}`);
const T = K.shaderTable();
check(T.stijl.length === K.SHOP_KINDS.length && T.stijl.every((r) => r.length === 4), 'shadertabel stijl');

// koppeling: twee panden aan een straat
const ring = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const bakkerij = ring(0, 0, 8, 10), buur = ring(8, 0, 16, 10), ver = ring(100, 100, 108, 110);
S.setShopSpots(S.spotsFrom([
  { kind: 'bakery', x: 4, y: 5 }, { kind: 'horeca', x: 12, y: 5 }, { kind: 'bicycle', x: 104, y: 98 },
  { kind: 'x', x: 50, y: 50, wk: 'bloemist' },
], [{ type: 'kapper', x: 30, y: 30 }, { type: 'auto', x: 31, y: 31 }]));
check(S.shopTypeFor(bakkerij) === 'bakker', 'spot in het pand');
check(S.shopTypeFor(buur, { ax: 8, ay: 0, bx: 16, by: 0 }) === null, 'horeca en buurpand: geen type');
check(S.shopTypeFor(ver, { ax: 100, ay: 100, bx: 108, by: 100 }) === 'fietsen', 'spot 2 m voor de voorgevel');
check(S.shopTypeFor(ver, { ax: 100, ay: 110, bx: 108, by: 110 }) === null, 'spot aan de verkeerde kant van het pand');
check(S.shopTypeFor(ring(48, 48, 54, 54)) === 'bloemist', 'wk (type uit shopplaces) wordt gebruikt');
check(S.shopTypeFor(ring(28, 28, 33, 33)) === 'kapper', 'winkel van het spel; autodealer telt niet');
check(S.shopTypeFor(ring(500, 500, 510, 510)) === null, 'leeg gebied');
check(S.setShopSpots([{ x: 1, y: 1, type: 'bestaat-niet' }, { x: NaN, y: 0, type: 'bakker' }]) === 0, 'onbekende types en NaN vallen weg');
check(S.shopTypeFor(bakkerij) === null, 'na het resetten geen spots meer');
S.clearShopSpots();

// elke OSM-soort van de koppeling bestaat in de kit
for (const [k, t] of Object.entries(S.KIT_OF_FACILITY)) check(K.SHOP_KINDS.includes(t), `${k} -> ${t} bestaat`);
for (const [k, t] of Object.entries(S.KIT_OF_GAMESHOP)) check(K.SHOP_KINDS.includes(t), `${k} -> ${t} bestaat`);
console.log(fails ? `${fails} FOUT(EN)` : 'shopspots_test ok');
process.exit(fails ? 1 : 0);
