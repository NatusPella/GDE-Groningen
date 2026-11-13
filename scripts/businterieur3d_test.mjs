// Bus passenger-room LODs (#833): businterieur3d.js draws the seats, poles, handrail and travellers of the
// articulated city bus and the midibus through the windows, at three detail levels. This test builds the real
// vehicle meshes (node3d + models3d_vehicles) and checks the levels, the shared geometry, the travellers and the
// distance thresholds in Node, plus the build budget and the triangle/time measurements the Lead wants.
//   node scripts/businterieur3d_test.mjs   (once: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const B = await import('../game/js/businterieur.js');
const M3 = await import('../game/js/businterieur3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const triangles = (g) => g.attributes.position.count / 3;
const finite = (g) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) return false;
  return true;
};
const insideBody = (g, L) => {
  g.computeBoundingBox();
  const b = g.boundingBox, hl = L.len / 2, hw = L.wid / 2;
  return b.min.x >= -hl && b.max.x <= hl && b.min.z >= -hw && b.max.z <= hw;
};

const BUS_MODEL = { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8 };
const MIDI_MODEL = { name: 'midibus', len: 8.4, wid: 2.3 };
const layouts = [
  ['bus', B.busInterieur(BUS_MODEL.len, BUS_MODEL.wid, { trailer: BUS_MODEL.trailer })],
  ['midibus', B.midibusInterieur(MIDI_MODEL.len, MIDI_MODEL.wid)],
];
const R = M3.BUS_LOD_R;

// --- the distance ladder ----------------------------------------------------------------------
{
  check('LOD: three distance thresholds', Array.isArray(R) && R.length === 3 && R[0] < R[1] && R[1] < R[2], JSON.stringify(R));
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], 2], [R[2] - 0.01, 2], [R[2], -1], [200, -1], [NaN, -1], [Infinity, -1]];
  for (const [distance, lod] of want) check(`LOD: busLodAt(${distance}) = ${lod}`, M3.busLodAt(distance) === lod, String(M3.busLodAt(distance)));
  // nothing is drawn without a threshold, so the far ring stays the only cap on draw calls
  check('LOD: the far radius is the last threshold', R[2] === 85, String(R[2]));
}

// --- the three geometry levels: fewer triangles, finite, inside the bus body -------------------
const rows = [];
const firstBuild = new Array(3).fill(null);
let builds = 0;
for (const [label, L] of layouts) {
  const row = { label, tri: [], ms: [] };
  for (let lod = 0; lod < 3; lod++) {
    const t0 = performance.now();
    const g = M3.buildInrichting(L, lod);
    const ms = performance.now() - t0;
    if (firstBuild[lod] === null) firstBuild[lod] = ms;
    builds++;
    row.tri.push(triangles(g));
    row.ms.push(ms);
    check(`${label}: lod ${lod} finite`, finite(g));
    check(`${label}: lod ${lod} inside the body`, insideBody(g, L), `x/z outside ${L.len} x ${L.wid}`);
    check(`${label}: lod ${lod} one group`, g.groups.length === 1);
  }
  check(`${label}: triangles drop strictly (${row.tri.join(' > ')})`, row.tri[0] > row.tri[1] && row.tri[1] > row.tri[2], row.tri.join(' > '));
  check(`${label}: lod 1 at least 35% fewer triangles`, row.tri[1] <= 0.65 * row.tri[0], `${row.tri[0]} -> ${row.tri[1]}`);
  check(`${label}: lod 2 at least 70% fewer triangles`, row.tri[2] <= 0.3 * row.tri[0], `${row.tri[0]} -> ${row.tri[2]}`);
  rows.push(row);
}
const busLayout = layouts[0][1];

// --- the travellers: more people, more triangles, nothing at all for none ---------------------
{
  const g0 = M3.buildReizigers(busLayout, 0);
  check('travellers: nobody on board draws nothing', triangles(g0) === 0, String(triangles(g0)));
  const g1 = M3.buildReizigers(busLayout, 12);
  const g2 = M3.buildReizigers(busLayout, 24);
  check('travellers: finite', finite(g1) && finite(g2));
  check('travellers: more people, more triangles', triangles(g2) > triangles(g1), `${triangles(g1)} -> ${triangles(g2)}`);
  check('travellers: shared geometry is one group', g1.groups.length === 1);
}

// --- the real bus mesh: one mesh per bus, geometry swapped per level, travellers only nearby ---
// The level is chosen from the player distance (Chebyshev), not the camera distance: cheap, no raycast, intended.
function setup(model) {
  const v = new Vehicle(0, 0, 0, { ...model });
  const mesh = buildVehicleMesh(v);
  const root = new THREE.Group();     // getVehicleMesh only returns a mesh that hangs in a scene
  root.add(mesh);
  const world = { player: { x: 0, y: 0 }, vehicles: [v], coopFigures: {}, coopZitters: [] };
  return { v, mesh, root, world };
}
const tick = (world) => M3.busInterieurKind.tick(1 / 60, world);

{
  const { v, mesh, world } = setup(BUS_MODEL);
  tick(world);
  const int = mesh.userData.busInt, pas = mesh.userData.busPas;
  check('sync: interior built next to the player', !!int && int.visible && mesh.userData.busIntLod === 0, String(mesh.userData.busIntLod));
  check('sync: actual mesh, no separate LOD mesh', int === mesh.userData.busInt && int.parent === mesh);
  check('sync: draw style', int.name === 'businterieur' && int.userData.noBatch === true && int.castShadow === false);
  check('sync: lod 0 geometry matches buildInrichting', triangles(int.geometry) === rows[0].tri[0], `${triangles(int.geometry)} tegen ${rows[0].tri[0]}`);
  check('sync: travellers nearby', !!pas && pas.visible && pas.name === 'busreizigers' && pas.castShadow === false);
  check('sync: travellers use the shared draw style', !!pas && pas.userData.noBatch === true);
  const pasTri = pas ? triangles(pas.geometry) : 0;
  const tri0 = triangles(int.geometry) + pasTri;
  check('sync: one interior mesh and one traveller mesh', mesh.children.filter((c) => c.name === 'businterieur').length === 1 && mesh.children.filter((c) => c.name === 'busreizigers').length === 1);
  // a quiet frame changes nothing (stable mesh and geometry, no rebuild)
  tick(world);
  check('sync: a steady frame keeps the mesh', mesh.userData.busInt === int && int.geometry.userData.shared === true);
  // mid distance: lod 1 keeps the travellers, swaps only the interior geometry
  world.player.x = 30;
  tick(world);
  check('sync: 30 m is lod 1', mesh.userData.busIntLod === 1, String(mesh.userData.busIntLod));
  check('sync: same mesh at lod 1', mesh.userData.busInt === int);
  check('sync: lod 1 geometry', triangles(int.geometry) === rows[0].tri[1], `${triangles(int.geometry)} tegen ${rows[0].tri[1]}`);
  check('sync: lod 1 keeps the travellers', !!mesh.userData.busPas && mesh.userData.busPas.visible);
  // far: only seat blocks, no travellers
  world.player.x = 60;
  tick(world);
  check('sync: 60 m is lod 2', mesh.userData.busIntLod === 2, String(mesh.userData.busIntLod));
  check('sync: lod 2 geometry', triangles(int.geometry) === rows[0].tri[2], `${triangles(int.geometry)} tegen ${rows[0].tri[2]}`);
  check('sync: no travellers far away', !mesh.userData.busPas);
  const tri2 = triangles(int.geometry);
  check('sync: drawn triangles drop per level', tri0 > rows[0].tri[1] + pasTri && rows[0].tri[1] + pasTri > tri2, `${tri0} > ${rows[0].tri[1] + pasTri} > ${tri2}`);
  // beyond the last threshold: hidden, and nothing is built
  world.player.x = R[2];
  tick(world);
  check('sync: hidden beyond the far radius', !int.visible, `op ${R[2]} m`);
  check('sync: no travellers beyond the far radius', !mesh.userData.busPas);
  // chebyshev distance: 50 m sideways is as far as 50 m ahead
  world.player.x = 0; world.player.y = 50;
  tick(world);
  check('sync: square (Chebyshev) distance sideways', mesh.userData.busIntLod === 2, String(mesh.userData.busIntLod));
  // back close: lod 0 again, travellers return
  world.player.x = 10; world.player.y = 0;
  tick(world);
  check('sync: back to lod 0', mesh.userData.busIntLod === 0 && mesh.userData.busInt.visible);
  check('sync: travellers return', !!mesh.userData.busPas && mesh.userData.busPas.visible);
  // a NaN position must hide the room instead of crashing (the story test fails on NaN)
  const ox = v.x;
  v.x = NaN;
  tick(world);
  check('sync: NaN position hides the room', !int.visible);
  v.x = ox;
  tick(world);
  check('sync: a real position shows the room again', int.visible);
}

// --- shared geometry between two buses of the same size and level -----------------------------
{
  const a = setup(BUS_MODEL), b = setup(BUS_MODEL);
  tick(a.world);
  tick(b.world);
  const ga = a.mesh.userData.busInt && a.mesh.userData.busInt.geometry;
  const gb = b.mesh.userData.busInt && b.mesh.userData.busInt.geometry;
  check('shared: two buses of the same size share the interior geometry', !!ga && ga === gb);
  check('shared: it is marked shared', !!ga && ga.userData.shared === true);
  tick(a.world);
  tick(b.world);
  a.world.player.x = 30; b.world.player.x = 30;
  tick(a.world); tick(b.world);
  check('shared: lod 1 geometry is shared too', a.mesh.userData.busInt.geometry === b.mesh.userData.busInt.geometry);
  check('shared: lod 1 differs from lod 0', a.mesh.userData.busInt.geometry !== ga);
}

// --- the midibus has its own, smaller room ----------------------------------------------------
{
  const midi = setup(MIDI_MODEL);
  tick(midi.world);
  const midInt = midi.mesh.userData.busInt;
  check('midibus: room built', !!midInt && midInt.visible && midi.mesh.userData.busIntLod === 0);
  check('midibus: own geometry (smaller than the city bus)', triangles(midInt.geometry) === rows[1].tri[0], `${triangles(midInt.geometry)} tegen ${rows[1].tri[0]}`);
  check('midibus: travellers on board', !!midi.mesh.userData.busPas && midi.mesh.userData.busPas.visible);
  midi.world.player.x = 50;                     // lod 2 for the bus too (45..85)
  tick(midi.world);
  check('midibus: lod 2 at 50 m without travellers', midi.mesh.userData.busIntLod === 2 && !midi.mesh.userData.busPas);
  midi.world.player.x = R[2] + 1;
  tick(midi.world);
  check('midibus: hidden beyond the far radius', !midi.mesh.userData.busInt.visible);
}

// --- build budget: at most BUS_BUILD_BUDGET new geometries per call ---------------------------
{
  const models = [
    { name: 'bus', len: 12.0, wid: 2.5, trailer: 5.0 },
    { name: 'bus', len: 12.2, wid: 2.5, trailer: 5.2 },
    { name: 'midibus', len: 8.6, wid: 2.4 },
  ];
  const items = models.map((m) => setup(m));
  const world = { player: { x: 0, y: 0 }, vehicles: items.map((i) => i.v), coopFigures: {}, coopZitters: [] };
  const built = () => items.filter((i) => i.mesh.userData.busInt).length;
  tick(world);
  check('budget: the first call builds one bus (two geometries)', built() === 1, String(built()));
  // deliberately hidden for one frame: the two buses that are not built yet draw nothing this frame and get
  // their turn in the next call, so a street full of buses never builds everything at once (#833)
  check('budget: the buses that are not built yet draw nothing', items.filter((i) => !i.mesh.userData.busInt || !i.mesh.userData.busInt.visible).length === 2, String(items.filter((i) => !i.mesh.userData.busInt || !i.mesh.userData.busInt.visible).length));
  tick(world);
  check('budget: the second call builds the next bus', built() === 2, String(built()));
  tick(world);
  check('budget: the third call builds the last bus', built() === 3, String(built()));
  check('budget: every bus has its own geometry', new Set(items.map((i) => i.mesh.userData.busInt.geometry)).size === 3);
}

// --- measurements: triangles per level, first build time, sum of the three levels --------------
console.log('bus passenger-room LOD measurements (triangles per level; first build in ms):');
for (const r of rows) console.log(`  ${r.label.padEnd(8)} ${String(r.tri[0]).padStart(4)} > ${String(r.tri[1]).padStart(4)} > ${String(r.tri[2]).padStart(4)}  sum ${String(r.tri[0] + r.tri[1] + r.tri[2]).padStart(4)}  ${r.ms.map((m) => m.toFixed(3) + ' ms').join(' | ')}`);
console.log(`  first build per level: lod0 ${firstBuild[0].toFixed(3)} ms, lod1 ${firstBuild[1].toFixed(3)} ms, lod2 ${firstBuild[2].toFixed(3)} ms, sum ${(firstBuild[0] + firstBuild[1] + firstBuild[2]).toFixed(3)} ms (${builds} geometries)`);
const worst1 = Math.max(...rows.map((r) => r.tri[1] / r.tri[0]));
const worst2 = Math.max(...rows.map((r) => r.tri[2] / r.tri[0]));
console.log(`  worst ratio: lod1 ${(100 * (1 - worst1)).toFixed(1)}% fewer, lod2 ${(100 * (1 - worst2)).toFixed(1)}% fewer`);
const travellerTri = triangles(M3.buildReizigers(busLayout, 16));
const drawn = rows.map((r) => [r.tri[0] + travellerTri, r.tri[1] + travellerTri, r.tri[2]]);
console.log(`  drawn per level with 16 travellers: ${drawn[0].join(' > ')} (bus), ${drawn[1].join(' > ')} (midibus); sum of the three levels: ${drawn[0].reduce((a, b) => a + b, 0)} / ${drawn[1].reduce((a, b) => a + b, 0)}`);

console.log(bad ? `${bad} mislukt` : 'businterieur3d_test: ok');
process.exit(bad ? 1 : 0);
