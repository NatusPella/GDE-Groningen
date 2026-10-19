// randaudit.js, worldedge.js coastKinds / borderByData (#6): pure, with a synthetic edge.
//   node scripts/randaudit_test.mjs
import { auditEdge, walkLine, outwards, lineLen } from '../game/js/randaudit.js';
import { coastKinds, borderByData, edgeRule, EEMS_LON, EEMS_LAT } from '../game/js/worldedge.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

// walkLine / outwards
const line = [[0, 0], [1000, 0]];
const ws = walkLine(line, 250);
ok(ws.length === 4 && ws[1].x === 250 && ws[0].tx === 1, 'walkLine steps along a line');
ok(lineLen([[0, 0], [3, 4]]) === 5, 'lineLen');
const o1 = outwards({ x: 0, y: 0, tx: 1, ty: 0 }, 1, 100), o2 = outwards({ x: 0, y: 0, tx: 1, ty: 0 }, -1, 100);
ok(o1.y === 100 && o2.y === -100, 'outwards follows the side of the line');

// the Eems is told apart from the Wadden
const [ex, ey] = wgsToWorld(53.33, 7.0), [wx, wy] = wgsToWorld(53.47, 6.4);
const coast = coastKinds({ coast: [{ id: 1, kind: 'wad', out: 1, pts: [[ex, ey], [ex + 500, ey]] }, { id: 2, kind: 'wad', out: 1, pts: [[wx, wy], [wx + 500, wy]] }, { id: 3, kind: 'wad', out: 1, pts: [[wx, wy], [wx, wy + 5]] }], border: [] });
ok(coast.coast[0].kind === 'eems' && coast.coast[1].kind === 'wad', 'the Dollard coast is the Eems, the Wadden stay wad');
ok(coastKinds(coast).coast[0].kind === 'eems', 'coastKinds is idempotent');
ok(coastKinds(null) === null && EEMS_LON > 6 && EEMS_LAT > 53, 'coastKinds without a layer');
const [dx, dy] = wgsToWorld(53.30, 6.95);
const boat = coastKinds({ coast: [{ id: 4, kind: 'wad', out: 1, seaM: 1000, pts: [[dx, dy], [dx + 200, dy]] }], border: [] });
ok(boat.coast[0].seaM === 1000, 'other fields of a line survive');
// a boat in front of the Eems coast meets the Grenswacht, not the coast guard
{
  const e = { coast: [{ kind: 'eems', out: 1, seaM: 1000, pts: [[0, 0], [2000, 0]] }], border: [] };
  const r = edgeRule(1000, 900, e, { mode: 'boat' });
  ok(r && r.edge === 'eems' && r.action === 'warn', 'eems line gives the Grenswacht warning');
}

// borderByData: the buffer follows the data
{
  const edge = { coast: [], border: [{ kind: 'duitsland', out: 1, bufferM: 2500, pts: [[0, 0], [1000, 0], [2000, 0], [3000, 0]] }] };
  // data only to 1000 m outside (y < 1000), but 2000 m left of x=2000
  const tileHas = (x, y) => y < 1000 && (x < 2000 || y < 700);
  const cut = borderByData(edge, tileHas, { pieceM: 1000 });
  ok(cut.border.length === 3, 'the border is cut into pieces of about a kilometre');
  ok(cut.border.every((b) => b.kind === 'duitsland' && b.out === 1 && b.pts.length === 2), 'pieces keep kind and side');
  ok(cut.border[0].bufferM === 600, 'buffer = data reach less the margin');
  ok(cut.border[2].bufferM === 300, 'a piece with less data gets a smaller buffer');
  ok(cut.border.every((b) => b.bufferM >= 200 && b.bufferM <= 2500), 'buffers stay between min and the line buffer');
  ok(borderByData(edge, null) === edge && borderByData(null, tileHas) === null, 'without a data test nothing changes');
  const r = edgeRule(500, 650, cut, { mode: 'car' });
  ok(r && r.action === 'back', 'turn-back before the data ends');
  ok(!edgeRule(500, 650, cut, { mode: 'car', onDeck: true }), 'still no turn-back on a bridge deck');
}

// auditEdge on a clean synthetic edge
{
  const edge = coastKinds({ seaM: 3000, coast: [{ kind: 'wad', out: 1, pts: [[0, 0], [20000, 0]] }], border: [{ kind: 'duitsland', out: 1, bufferM: 800, pts: [[0, 5000], [10000, 5000]] }] });
  const props = ['rand_grenspost', 'rand_slagboom', 'rand_bord', 'rand_grenswachtboot', 'rand_boei', 'rand_mistbank', 'rand_kustwachtboot', 'rand_wegversperring', 'rand_neef', 'rand_hunebed'];
  const a = auditEdge(edge, { propKinds: props, tileHas: () => true, step: 500 });
  ok(a.issues.length === 0, 'a clean edge has no issues: ' + a.issues.join('; '));
  ok(a.coast.wad.n === 1 && a.border.duitsland.km === 10, 'tallies');
  ok(a.stats.border.firesOnLine === 0 && a.stats.border.backOk > 0, 'border fires only past the buffer');
  const missing = auditEdge(edge, { propKinds: props.filter((p) => p !== 'rand_grenspost'), tileHas: () => true });
  ok(missing.issues.some((s) => s.includes('rand_grenspost')), 'a prop that does not build is reported');
  const void_ = auditEdge(edge, { propKinds: props, tileHas: () => false });
  ok(void_.issues.some((s) => s.includes('zonder kaartdata')), 'a turn-back in front of a void is reported');
  const unk = auditEdge({ coast: [], border: [{ kind: 'belgie', pts: [[0, 0], [100, 0]] }] }, {});
  ok(unk.issues.some((s) => s.includes('belgie: geen omkeerscène')), 'an edge kind without a scene is reported');
}

// regions.js hands the edge layer to the game (it was never set before #6)
{
  const R = await import('../game/js/regions.js');
  ok(R.regionEdgeLayer() === null, 'no province layer, no edge layer');
  const ring = [[0, 0], [5000, 0], [5000, 5000], [0, 5000]];
  R.setRegionData({ outline: [ring], edge: { coast: [{ id: 1, kind: 'wad', out: 1, pts: [[0, 0], [5000, 0]] }], border: [{ kind: 'duitsland', out: 1, bufferM: 2500, pts: [[5000, 0], [5000, 5000]] }] } }, (x) => x < 5800);
  const e = R.regionEdgeLayer();
  ok(e && e.coast.length === 1 && e.border.length >= 1 && e.border[0].bufferM < 2500, 'setRegionData gives the cut edge layer');
  R.setRegionData(null);
  ok(R.regionEdgeLayer() === null, 'and clears it again');
}

// Rottum (forbidden nature) and Schiermonnikoog (the ferry) get their own sea scenes
{
  const mk = (la, lo) => { const [x, y] = wgsToWorld(la, lo); return { kind: 'wad', out: 1, pts: [[x, y], [x + 400, y]] }; };
  const e = coastKinds({ coast: [mk(53.55, 6.55), mk(53.49, 6.18), mk(53.45, 6.60)], border: [] });
  ok(e.coast[0].kind === 'rottum' && e.coast[1].kind === 'schier' && e.coast[2].kind === 'wad', 'Rottum and Schiermonnikoog coast chains get their kind');
  const a = auditEdge(e, { propKinds: ['rand_natuurbord', 'rand_boei', 'rand_mistbank', 'rand_veerboot', 'rand_grenswachtboot', 'rand_kustwachtboot', 'rand_grenspost', 'rand_slagboom', 'rand_bord', 'rand_wegversperring', 'rand_neef', 'rand_hunebed'], tileHas: () => true });
  ok(!a.issues.some((s) => s.includes('rottum') || s.includes('schier')), 'both kinds have a text and a scene: ' + a.issues.join('; '));
}

console.log(bad ? `${bad} of ${n} failed` : 'all passed');
process.exit(bad ? 1 : 0);
