// Pariteit van het hoogtemodel voor het spoor (#314 C2b, elevation.js): de spoorliften
// komen nu uit het railraster in plaats van uit de hele railsarray. Deze test bouwt
// hetzelfde hoogtemodel twee keer (andere invoegvolgorde van de rails) en vergelijkt de
// railsegmenten met een onafhankelijke berekening uit de array: geen segment zoek, geen
// andere z, geen andere volgorde-afhankelijkheid.
//   node scripts/elevation_rail_parity_test.mjs
import './node3d.mjs';
const { GameMap } = await import('../game/js/mapdata.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const RAIL_STEP = 4; // elevation.js RAIL_STEP; de test rekent de segmenten zelf na
const rail = (pts, z, extra = {}) => ({ pts, z, ...extra });
const data = (rails) => ({
  meta: { bounds: [-300, -300, 300, 300] },
  // één gewone weg: buildElevation stopt vroeg als er helemaal geen wegen zijn
  roads: [{ pts: [[-250, -150], [0, -150], [250, -150]], z: [0, 4, 0], cat: 'normal', type: 'residential', width: 6, name: 'Straat' }],
  buildings: [], water: [], green: [], trees: [], railLifts: [], rails,
});
const sig = (s) => [s.ax, s.ay, s.bx, s.by, +s.za.toFixed(3), +s.zb.toFixed(3)].join(',');
const railSegs = (map) => map.elev.segs.filter((s) => s.rail).map(sig).sort();

const A = rail([[-200, 0], [-100, 0], [0, 0], [100, 0], [200, 0]], [0, 0, 2.5, 5.5, 3, 0]);
const B = rail([[0, -200], [0, -100], [0, 0], [0, 100], [0, 200]], [0, 0, 0, 1.2, 4.8, 0]);
const map1 = new GameMap(data([A, B]));
const map2 = new GameMap(data([B, A])); // andere volgorde in de array en dus in het raster

ok(map1.railGrid && map1.railGrid.map.size > 0, 'de kaart bouwt een railraster');
const segs1 = railSegs(map1), segs2 = railSegs(map2);
ok(segs1.length > 0, 'het hoogtemodel heeft railsegmenten', String(segs1.length));
ok(JSON.stringify(segs1) === JSON.stringify(segs2), 'dezelfde segmenten bij een andere invoegvolgorde');

// onafhankelijk: dezelfde formule als elevation.js addRailLifts, maar over de array
const verwacht = [];
for (const r of [A, B]) {
  const P = r.pts, Z = r.z;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.5) continue;
    const m = Math.max(1, Math.ceil(L / RAIL_STEP));
    for (let k = 0; k < m; k++) {
      const ax = x0 + (x1 - x0) * k / m, ay = y0 + (y1 - y0) * k / m;
      const bx = x0 + (x1 - x0) * (k + 1) / m, by = y0 + (y1 - y0) * (k + 1) / m;
      const za = Z[i] + (Z[i + 1] - Z[i]) * k / m;
      const zb = Z[i] + (Z[i + 1] - Z[i]) * (k + 1) / m;
      if (za < 0.05 && zb < 0.05) continue;
      verwacht.push([ax, ay, bx, by, +za.toFixed(3), +zb.toFixed(3)].join(','));
    }
  }
}
ok(JSON.stringify(verwacht.sort()) === JSON.stringify(segs1), 'de rasterweg geeft dezelfde segmenten als de array-formule', `${verwacht.length} vs ${segs1.length}`);

// en het model antwoordt op de spoorhoogte: boven de brug is de grond het dek
const deck = map1.elev.segs.find((s) => s.rail && s.deck);
ok(!!deck, 'een hoog spoor levert een deksegment');
if (deck) {
  const z = Math.min(deck.za, deck.zb);
  ok(Math.abs(map1.groundHeightAt((deck.ax + deck.bx) / 2, (deck.ay + deck.by) / 2, z) - z) < 0.6, 'de hoogtevraag volgt het spoorprofiel');
}

console.log(`elevation_rail_parity_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);


