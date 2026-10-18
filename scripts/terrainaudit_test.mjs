// Pure tests of the deck terrain and the height audit (#78):  node scripts/terrainaudit_test.mjs
import './node3d.mjs';

const D = await import('../game/js/deckterrain.js');
const A = await import('../game/js/terrainaudit.js');
const T = await import('../game/js/terrainraster.js');
const { GameMap } = await import('../game/js/mapdata.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;

// a river valley (2 m deep, banks with a 20% slope) across x = 150 .. 250; a dyke at x = 400 (+4 m)
const ground = (x) => (x > 150 && x < 250 ? -Math.min(2, 0.2 * Math.min(Math.abs(x - 150), Math.abs(x - 250))) : x > 380 && x < 420 ? 4 * (1 - Math.abs(x - 400) / 20) : 0);
const field = (x) => ground(x);

// samplePolyline
{
  const S = A.samplePolyline([[0, 0], [25, 0], [25, 5]], 10);
  ok(S.length === 4 && near(S[1][2], 10, 1e-6) && near(S[2][2], 20, 1e-6), 'samples every step along the bend', S.length);
  ok(near(S[S.length - 1][2], 30, 1e-6) && S[S.length - 1][0] === 25 && S[S.length - 1][1] === 5, 'the last sample is the end', JSON.stringify(S));
  ok(S.every((p, i) => i === 0 || p[2] > S[i - 1][2]), 'arc positions grow');
}

// arcPosition
{
  const pts = [[0, 0], [100, 0], [100, 100]];
  const cum = [0, 100, 200];
  ok(near(D.arcPosition(pts, cum, 50, 5), 50) && near(D.arcPosition(pts, cum, 95, 60), 160) && near(D.arcPosition(pts, cum, -30, 0), 0), 'arc position of a point, clamped past the ends');
}

// a bridge over the valley keeps to the line between its ends
const bridge = { pts: [[100, 0], [300, 0]], bridge: true };
const dt = (x, r = bridge) => D.deckTerrainAt(r, x, 0, field);
ok(near(dt(100), 0) && near(dt(300), 0), 'the ends of a deck are the ground there (no step to the street)');
ok(near(dt(200), 0), 'over the valley the deck does not sink with it', dt(200));
ok(!D.isDeckRoad({ pts: [[0, 0], [1, 0]] }) && D.isDeckRoad({ pts: [[0, 0], [1, 0]], tunnel: true }), 'only bridges and tunnels are decks');

// a bridge over a dyke follows it, less the deadband; a tunnel through it likewise
const over = { pts: [[300, 0], [500, 0]], bridge: true };
ok(near(dt(400, over), 4 - D.DECK_DEADBAND) && dt(350, over) <= 0.0001, 'over the dyke the deck rises with the crest', dt(400, over));
const tun = { pts: [[300, 0], [500, 0]], tunnel: true };
ok(near(dt(400, tun), 4 - D.DECK_DEADBAND), 'a tunnel through the dyke follows it too');

// the cache follows the field: an end on a tile that arrives later
{
  const r = { pts: [[0, 0], [100, 0]], bridge: true };
  let h = 0; const f = (x) => (x > 50 ? h : 0);
  ok(near(D.deckTerrainAt(r, 100, 0, f, f(100), 0), 0), 'ends read while the far tile is missing');
  h = 3;
  ok(near(D.deckTerrainAt(r, 100, 0, f, f(100), 1), 3), 'a new raster count renews the ends');
}

// audit of a road
{
  const flat = A.auditRoad({ pts: [[0, 0], [100, 0]] }, () => 1);
  ok(flat.maxGrade === 0 && flat.tears.length === 0 && flat.deck === null, 'a road over level ground: no grade, no tear');
  const dyke = A.auditRoad({ pts: [[300, 0], [500, 0]] }, field);
  ok(near(dyke.maxGrade, 0.2, 0.01) && dyke.tears.length === 0, 'a dyke road: 20% grade, but the ground is smooth (no tear)', JSON.stringify(dyke.tears));
  const cut = A.auditRoad({ pts: [[0, 0], [100, 0]] }, (x) => (x > 50 ? 5 : 0));
  ok(cut.tears.length === 1 && near(cut.tears[0].step, 5), 'a 5 m step between two samples is a tear');
  const b = A.auditRoad(bridge, field);
  ok(b.deck && b.deck.grade < 0.001 && near(b.deck.valley, 2, 0.01) && b.deck.below <= 0.0001, 'the deck over the valley is level, 2 m above the water bed', JSON.stringify(b.deck));
  const steep = A.auditRoad({ pts: [[100, 0], [300, 0]], bridge: true }, (x) => (x > 200 ? 20 : 0));
  ok(steep.deck && steep.deck.step >= 0, 'a deck audit returns its numbers');
}

// per streek
{
  const roads = [{ pts: [[0, 0], [100, 0]] }, { pts: [[300, 0], [500, 0]] }, { pts: [[1000, 0], [1100, 0]], bridge: true }, { pts: [[5000, 5], [5100, 5]] }];
  const R = A.auditStreken(roads, field, (x) => (x < 2000 ? 'a' : null));
  ok(R.a.roads === 3 && R.a.decks === 1 && R.overig.roads === 1, 'roads are grouped by streek, the rest is overig');
  ok(R.a.steep === 1 && R.a.maxGrade > 0.19 && R.a.tears === 0, 'the dyke road counts as steep, not as torn');
}

// the game map: a bridge over the valley stays level and joins the street
{
  const map = new GameMap({ meta: { bounds: [0, -50, 600, 50] }, roads: [
    { pts: [[0, 0], [100, 0]], cat: 'normal', type: 'residential', width: 6 },
    { pts: [[100, 0], [300, 0]], cat: 'normal', type: 'primary', width: 8, z: [3, 3], bridge: true },
    { pts: [[300, 0], [600, 0]], cat: 'normal', type: 'residential', width: 6 },
  ], buildings: [], water: [], green: [], trees: [] });
  const vals = new Float32Array(60 * 4);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 60; i++) vals[j * 60 + i] = ground(i * 10 + 5);
  map.terrain = new T.TerrainField(); map.terrain.add('v', T.encodeTerrainRaster({ x0: 0, y0: -20, cell: 10, w: 60, h: 4, values: vals }));
  map.terrainOn = true;
  const st = { z: 3, ribbon: null };
  map.surfaceAt(110, 0, st);
  const ribbon = st.ribbon;
  const zs = [];
  for (const x of [110, 150, 200, 250, 290]) { const s = { z: 3, ribbon }; map.surfaceAt(x, 0, s); zs.push(s.z); }
  ok(ribbon && zs.every((z) => near(z, zs[0], 0.5)), 'on the bridge the height stays level over the valley', zs.join(' '));
  ok(near(map.groundHeightAt(200, 0, 3), zs[2], 0.3), 'groundHeightAt on the deck agrees with surfaceAt', `${map.groundHeightAt(200, 0, 3)} ${zs[2]}`);
  const wet = map.groundHeightAt(200, 20, 0);
  ok(wet < -1.5, 'beside the bridge the ground is the valley', wet);
}

console.log(`${n - fails}/${n} terrainaudit checks passed`);
process.exit(fails ? 1 : 0);
