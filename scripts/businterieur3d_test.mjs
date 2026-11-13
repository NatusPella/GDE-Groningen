// Bus passenger-room LODs (#833, #847): businterieur3d.js draws the seats, poles, handrail and travellers of the
// articulated city bus (front unit and rear unit), the midibus and a wrecked bus through the windows, at three detail
// levels. This test builds the real vehicle meshes (node3d + models3d_vehicles) and checks the levels, the shared
// geometry, the travellers, the trailer that swings with the rear group, the wreck variant (sooty, no travellers,
// see-through glass), the distance thresholds in Node, plus the build budget and the triangle/time measurements.
//   node scripts/businterieur3d_test.mjs   (once: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
const { buildVehicleMesh, setBusRearAngle } = await import('../game/js/models3d_vehicles.js');
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
const insideRoom = (g, x0, x1, wid) => {
  g.computeBoundingBox();
  const b = g.boundingBox, hw = wid / 2;
  return b.min.x >= x0 - 1e-3 && b.max.x <= x1 + 1e-3 && b.min.z >= -hw - 1e-3 && b.max.z <= hw + 1e-3;
};
const sameColor = (g, i, c) => Math.abs(g.attributes.color.getX(i) - c.r) < 0.01 && Math.abs(g.attributes.color.getY(i) - c.g) < 0.01 && Math.abs(g.attributes.color.getZ(i) - c.b) < 0.01;
const trisOf = (g, c) => { const out = []; for (let t = 0; t < triangles(g); t++) if (sameColor(g, t * 3, c)) out.push(t); return out; };

const BUS_MODEL = { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8 };
const MIDI_MODEL = { name: 'midibus', len: 8.4, wid: 2.3 };
const Lbus = B.busInterieur(BUS_MODEL.len, BUS_MODEL.wid, { trailer: BUS_MODEL.trailer });
const Lmidi = B.midibusInterieur(MIDI_MODEL.len, MIDI_MODEL.wid);
const R = M3.BUS_LOD_R;

// --- the distance ladder ----------------------------------------------------------------------
{
  check('LOD: three distance thresholds', Array.isArray(R) && R.length === 3 && R[0] < R[1] && R[1] < R[2], JSON.stringify(R));
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], 2], [R[2] - 0.01, 2], [R[2], -1], [200, -1], [NaN, -1], [Infinity, -1]];
  for (const [distance, lod] of want) check(`LOD: busLodAt(${distance}) = ${lod}`, M3.busLodAt(distance) === lod, String(M3.busLodAt(distance)));
  // nothing is drawn without a threshold, so the far ring stays the only cap on draw calls
  check('LOD: the far radius is the last threshold', R[2] === 85, String(R[2]));
}

// --- the room has two units for the articulated bus, one for the midibus ------------------------
{
  check('layout: the articulated bus has a rear unit', !!Lbus.rear && Lbus.rear !== Lbus, 'rear ontbreekt');
  check('layout: the midibus has one unit', Lbus.rear !== null && Lmidi.rear === null);
  check('layout: the rear unit is bigger than just a bench', Lbus.rear && Lbus.rear.seats.length >= 8, `${Lbus.rear && Lbus.rear.seats.length}`);
  check('layout: more seats than the front unit alone', Lbus.rear && Lbus.seats.length + Lbus.rear.seats.length > Lbus.seats.length);
  check('layout: the rear seats sit in the trailer', Lbus.rear && Lbus.rear.seats.every((s) => s.x > -BUS_MODEL.trailer + 0.3 && s.x < -B.JOINT_GAP));
}

// --- the three geometry levels per unit: fewer triangles, finite, inside the room --------------
const units = [
  ['voor', 'front unit', Lbus, -Lbus.len / 2, Lbus.len / 2, (L, lod) => M3.buildInrichting(L, lod)],
  ['achter', 'rear unit', Lbus.rear, Lbus.rear.x0, Lbus.rear.x1, (Rr, lod) => M3.buildAchterInrichting(Rr, lod)],
  ['midibus', 'midibus', Lmidi, -MIDI_MODEL.len / 2, MIDI_MODEL.len / 2, (M, lod) => M3.buildInrichting(M, lod)],
];
const rows = [];
const firstBuild = new Array(3).fill(null);
let builds = 0;
for (const [unit, label, U, x0, x1, build] of units) {
  const row = { unit, label, tri: [], ms: [] };
  for (let lod = 0; lod < 3; lod++) {
    const t0 = performance.now();
    const g = build(U, lod);
    const ms = performance.now() - t0;
    if (firstBuild[lod] === null) firstBuild[lod] = ms;
    builds++;
    row.tri.push(triangles(g));
    row.ms.push(ms);
    check(`${label}: lod ${lod} finite`, finite(g));
    check(`${label}: lod ${lod} inside the room`, insideRoom(g, x0, x1, U.wid), `x/z buiten ${x0}..${x1} x ${U.wid}`);
    check(`${label}: lod ${lod} one group`, g.groups.length === 1);
  }
  check(`${label}: triangles drop strictly (${row.tri.join(' > ')})`, row.tri[0] > row.tri[1] && row.tri[1] > row.tri[2], row.tri.join(' > '));
  check(`${label}: lod 1 at least 35% fewer triangles`, row.tri[1] <= 0.65 * row.tri[0], `${row.tri[0]} -> ${row.tri[1]}`);
  check(`${label}: lod 2 at least 70% fewer triangles`, row.tri[2] <= 0.3 * row.tri[0], `${row.tri[0]} -> ${row.tri[2]}`);
  rows.push(row);
}
const rowVoor = rows[0], rowAchter = rows[1], rowMidi = rows[2];
check('rear unit: same ladder as the front unit (shared cache keys per unit)', rowAchter.tri[0] !== rowVoor.tri[0]);

// --- the inner shell (#833, #847): only lod 0 gets the inward-facing skin ----------------------
// The bus body is single-sided, so from inside you would see the street and the sky through the backs of
// the floor, roof and side walls. Lod 0 therefore carries a floor, a ceiling, two side walls (the
// sidewalk side split around the doorways) and closing walls, all facing into the room. It is part of the
// same geometry: no extra mesh, no extra draw call, and the back faces are culled from outside. The rear
// unit closes at both ends (the bellows side and the rear wall).
{
  const CEILING = new THREE.Color(0x9aa3ad), WALL = new THREE.Color(0x2a2f36), DARK = new THREE.Color(0x23262b);
  const shellOf = (U, frontWall) => {
    const xFront = U.huid.x0, xRear = U.huid.x1;
    let pieces = 0, x = xRear;
    for (const d of U.doors.slice().sort((a, b) => a - b)) {
      const a = Math.min(d - 0.6, xFront), b = Math.min(d + 0.6, xFront);
      if (a > x) pieces++;
      if (b > x) x = b;
      if (x >= xFront) break;
    }
    if (x < xFront) pieces++;
    return { tris: 8 + pieces * 2 + (frontWall ? 2 : 0), wall: 4 + pieces * 2 + (frontWall ? 2 : 0) };
  };
  const shellChecks = (label, U, frontWall, build = M3.buildInrichting) => {
    const g0 = build(U, 0), g1 = build(U, 1), g2 = build(U, 2);
    const need = shellOf(U, frontWall);
    const ceiling = trisOf(g0, CEILING), wall = trisOf(g0, WALL);
    check(`${label}: shell only on lod 0`, ceiling.length === 2 && wall.length === need.wall && trisOf(g1, CEILING).length + trisOf(g2, CEILING).length + trisOf(g1, WALL).length + trisOf(g2, WALL).length === 0, `ceiling ${ceiling.length} wall ${wall.length} nodig ${need.wall}`);
    const pos = g0.attributes.position, nrm = g0.attributes.normal;
    const xyz = (t, k) => [pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k)];
    check(`${label}: ceiling faces down`, ceiling.every((t) => nrm.getY(t * 3) < -0.9));
    const hw = U.wid / 2 - 0.08, rearX = U.huid.x1, frontX = U.huid.x0;
    let sideIn = true, rearIn = true, frontIn = true, sides = 0, rears = 0, fronts = 0;
    for (const t of wall) {
      const a = xyz(t, 0), b = xyz(t, 1), c = xyz(t, 2);
      const cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
      if (Math.abs(cx - rearX) < 0.01) { rears++; rearIn = rearIn && nrm.getX(t * 3) > 0.9; }
      else if (frontWall && Math.abs(cx - frontX) < 0.01) { fronts++; frontIn = frontIn && nrm.getX(t * 3) < -0.9; }
      else if (Math.abs(Math.abs(cz) - hw) < 0.01) { sides++; sideIn = sideIn && nrm.getZ(t * 3) * Math.sign(cz) < -0.9; }
    }
    check(`${label}: side walls face inward`, sideIn && sides === need.wall - 2 - (frontWall ? 2 : 0), `${sides} van ${need.wall - 2 - (frontWall ? 2 : 0)}`);
    check(`${label}: rear wall faces forward`, rearIn && rears === 2, String(rears));
    if (frontWall) check(`${label}: front wall faces backward (bellows side)`, frontIn && fronts === 2, String(fronts));
    // the floor: two dark triangles at floor height reaching both side walls (the seat legs are dark too, but narrow)
    let floorTris = 0, zMin = Infinity, zMax = -Infinity;
    for (let t = 0; t < triangles(g0); t++) {
      const a = xyz(t, 0), b = xyz(t, 1), c = xyz(t, 2);
      if (Math.abs(a[1] - U.floor) > 1e-5 || Math.abs(b[1] - U.floor) > 1e-5 || Math.abs(c[1] - U.floor) > 1e-5) continue;
      if (!sameColor(g0, t * 3, DARK)) continue;
      const lo = Math.min(a[2], b[2], c[2]), hi = Math.max(a[2], b[2], c[2]);
      if (hi - lo < U.wid - 0.3) continue;
      floorTris++; zMin = Math.min(zMin, lo); zMax = Math.max(zMax, hi);
    }
    check(`${label}: floor spans the room at floor height`, floorTris === 2 && zMin <= -(hw - 0.01) && zMax >= hw - 0.01, `${floorTris} ${zMin}..${zMax}`);
    check(`${label}: shell is ${need.tris} triangles`, ceiling.length + wall.length + floorTris === need.tris, `${ceiling.length + wall.length + floorTris} tegen ${need.tris}`);
  };
  shellChecks('front unit', Lbus, false);
  shellChecks('rear unit', Lbus.rear, true, M3.buildAchterInrichting);
  shellChecks('midibus', Lmidi, false);
}

// --- the travellers: more people, more triangles, nothing at all for none ---------------------
{
  const g0 = M3.buildReizigers(Lbus, 0);
  check('travellers: nobody on board draws nothing', triangles(g0) === 0, String(triangles(g0)));
  const g1 = M3.buildReizigers(Lbus, 12);
  const g2 = M3.buildReizigers(Lbus, 24);
  check('travellers: finite', finite(g1) && finite(g2));
  check('travellers: more people, more triangles', triangles(g2) > triangles(g1), `${triangles(g1)} -> ${triangles(g2)}`);
  check('travellers: shared geometry is one group', g1.groups.length === 1);
  const a1 = M3.buildAchterReizigers(Lbus.rear, 12), a2 = M3.buildAchterReizigers(Lbus.rear, 24);
  check('travellers rear unit: more people, more triangles', triangles(a2) > triangles(a1) && triangles(a1) > 0, `${triangles(a1)} -> ${triangles(a2)}`);
  check('travellers rear unit: inside the trailer', insideRoom(a1, Lbus.rear.x0, Lbus.rear.x1, Lbus.rear.wid));
}

// --- the wreck variant (#847): sooty geometry on its own, finite and inside the room -----------
const wrakTri = [];
for (let lod = 0; lod < 3; lod++) {
  const g = M3.buildWrakInrichting(Lbus, lod);
  wrakTri.push(triangles(g));
  check(`wreck: lod ${lod} finite`, finite(g) && insideRoom(g, -Lbus.len / 2, Lbus.len / 2, Lbus.wid));
  const r = M3.buildWrakInrichting(Lbus.rear, lod, { achter: true });
  check(`wreck rear unit: lod ${lod} finite`, finite(r) && insideRoom(r, Lbus.rear.x0, Lbus.rear.x1, Lbus.rear.wid));
}
check('wreck: its own geometry, not the normal room', wrakTri[0] !== rowVoor.tri[0], `${wrakTri[0]} tegen ${rowVoor.tri[0]}`);
check('wreck: the levels get cheaper too', wrakTri[0] > wrakTri[1] && wrakTri[1] > wrakTri[2], wrakTri.join(' > '));

// --- the real bus mesh: one mesh per unit, geometry swapped per level, travellers only nearby ---
// The level is chosen from the player distance (Chebyshev), not the camera distance: cheap, no raycast, intended.
function setup(model, { wrecked = false, onBoard = null } = {}) {
  const v = new Vehicle(0, 0, 0, { ...model });
  if (wrecked) v.wrecked = true;
  if (onBoard != null) v.busBediend = { ride: { onBoard } };
  const mesh = buildVehicleMesh(v);
  const root = new THREE.Group();     // getVehicleMesh only returns a mesh that hangs in a scene
  root.add(mesh);
  const world = { player: { x: 0, y: 0 }, vehicles: [v], coopFigures: {}, coopZitters: [] };
  return { v, mesh, root, world };
}
const tick = (world) => M3.busInterieurKind.tick(1 / 60, world);
// a fresh articulated bus needs its front room, rear room and two traveller meshes: two build calls (#833 budget)
const settle = (world, n = 3) => { for (let i = 0; i < n; i++) tick(world); };
const rearOf = (mesh) => mesh.userData.busRear;

{
  const { v, mesh, world } = setup(BUS_MODEL);
  settle(world);
  const int = mesh.userData.busInt, pas = mesh.userData.busPas;
  const rear = rearOf(mesh), rearInt = mesh.userData.busIntAchter, rearPas = mesh.userData.busPasAchter;
  check('sync: interior built next to the player', !!int && int.visible && mesh.userData.busIntLod === 0, String(mesh.userData.busIntLod));
  check('sync: actual mesh, no separate LOD mesh', int === mesh.userData.busInt && int.parent === mesh);
  check('sync: draw style', int.name === 'businterieur' && int.userData.noBatch === true && int.castShadow === false);
  check('sync: lod 0 geometry matches buildInrichting', triangles(int.geometry) === rowVoor.tri[0], `${triangles(int.geometry)} tegen ${rowVoor.tri[0]}`);
  check('sync: travellers nearby', !!pas && pas.visible && pas.name === 'busreizigers' && pas.castShadow === false);
  check('sync: travellers use the shared draw style', !!pas && pas.userData.noBatch === true);
  // the rear unit: its own mesh, hanging on the trailer group so it swings with the joint (#847)
  check('sync: rear room built', !!rearInt && rearInt.visible && mesh.userData.busIntAchterLod === 0);
  check('sync: rear room hangs on the trailer group', !!rear && rearInt.parent === rear, 'niet aan busRear');
  check('sync: rear draw style', rearInt.name === 'businterieur-achter' && rearInt.userData.noBatch === true && rearInt.castShadow === false);
  check('sync: rear lod 0 geometry', triangles(rearInt.geometry) === rowAchter.tri[0], `${triangles(rearInt.geometry)} tegen ${rowAchter.tri[0]}`);
  check('sync: rear travellers nearby', !!rearPas && rearPas.visible && rearPas.name === 'busreizigers-achter' && rearPas.parent === rear);
  const tri0 = triangles(int.geometry) + triangles(pas.geometry) + triangles(rearInt.geometry) + triangles(rearPas.geometry);
  check('sync: one interior mesh and one traveller mesh per unit',
    mesh.children.filter((c) => c.name === 'businterieur').length === 1 && mesh.children.filter((c) => c.name === 'busreizigers').length === 1 &&
    rear.children.filter((c) => c.name === 'businterieur-achter').length === 1 && rear.children.filter((c) => c.name === 'busreizigers-achter').length === 1);
  // a quiet frame changes nothing (stable mesh and geometry, no rebuild)
  tick(world);
  check('sync: a steady frame keeps the mesh', mesh.userData.busInt === int && int.geometry.userData.shared === true);
  // the trailer swings: the rear room rides along with the trailer group
  mesh.updateMatrixWorld(true);
  const p1 = new THREE.Vector3(-3, 0, 0); rearInt.localToWorld(p1);
  setBusRearAngle(mesh, 0, 0.5);
  mesh.updateMatrixWorld(true);
  const p2 = new THREE.Vector3(-3, 0, 0); rearInt.localToWorld(p2);
  check('sync: the rear room swings with the trailer', Math.abs(rear.rotation.y + 0.5) < 1e-9 && p1.distanceTo(p2) > 0.5, `rot ${rear.rotation.y}`);
  setBusRearAngle(mesh, 0, 0);
  // mid distance: lod 1 keeps the travellers, swaps only the interior geometry of both units
  world.player.x = 30;
  settle(world, 1);
  check('sync: 30 m is lod 1', mesh.userData.busIntLod === 1 && mesh.userData.busIntAchterLod === 1, `${mesh.userData.busIntLod}/${mesh.userData.busIntAchterLod}`);
  check('sync: same meshes at lod 1', mesh.userData.busInt === int && mesh.userData.busIntAchter === rearInt);
  check('sync: lod 1 geometry both units', triangles(int.geometry) === rowVoor.tri[1] && triangles(rearInt.geometry) === rowAchter.tri[1]);
  check('sync: lod 1 keeps the travellers', !!mesh.userData.busPas && mesh.userData.busPas.visible && !!mesh.userData.busPasAchter && mesh.userData.busPasAchter.visible);
  // far: only seat blocks, no travellers
  world.player.x = 60;
  tick(world);
  check('sync: 60 m is lod 2', mesh.userData.busIntLod === 2 && mesh.userData.busIntAchterLod === 2);
  check('sync: lod 2 geometry', triangles(int.geometry) === rowVoor.tri[2] && triangles(rearInt.geometry) === rowAchter.tri[2]);
  check('sync: no travellers far away', !mesh.userData.busPas && !mesh.userData.busPasAchter);
  check('sync: drawn triangles drop per level', tri0 > rowVoor.tri[1] + rowAchter.tri[1] && rowVoor.tri[1] + rowAchter.tri[1] > rowVoor.tri[2] + rowAchter.tri[2]);
  // beyond the last threshold: hidden, and nothing is built
  world.player.x = R[2];
  tick(world);
  check('sync: hidden beyond the far radius', !int.visible && !rearInt.visible, `op ${R[2]} m`);
  // chebyshev distance: 50 m sideways is as far as 50 m ahead
  world.player.x = 0; world.player.y = 50;
  tick(world);
  check('sync: square (Chebyshev) distance sideways', mesh.userData.busIntLod === 2, String(mesh.userData.busIntLod));
  // back close: lod 0 again, travellers return
  world.player.x = 10; world.player.y = 0;
  settle(world, 2);
  check('sync: back to lod 0', mesh.userData.busIntLod === 0 && mesh.userData.busInt.visible && mesh.userData.busIntAchter.visible);
  check('sync: travellers return', !!mesh.userData.busPas && mesh.userData.busPas.visible && !!mesh.userData.busPasAchter);
  // a NaN position must hide the rooms instead of crashing (the story test fails on NaN)
  const ox = v.x;
  v.x = NaN;
  tick(world);
  check('sync: NaN position hides the rooms', !int.visible && !rearInt.visible);
  v.x = ox;
  settle(world, 1);
  check('sync: a real position shows the rooms again', int.visible && rearInt.visible);
}

// --- shared geometry between two buses of the same size and level -----------------------------
{
  const a = setup(BUS_MODEL, { onBoard: 24 }), b = setup(BUS_MODEL, { onBoard: 24 });
  settle(a.world); settle(b.world);
  const ga = a.mesh.userData.busInt && a.mesh.userData.busInt.geometry;
  const gb = b.mesh.userData.busInt && b.mesh.userData.busInt.geometry;
  check('shared: two buses of the same size share the interior geometry', !!ga && ga === gb);
  check('shared: it is marked shared', !!ga && ga.userData.shared === true);
  check('shared: the rear unit is shared too', !!a.mesh.userData.busIntAchter && a.mesh.userData.busIntAchter.geometry === b.mesh.userData.busIntAchter.geometry);
  check('shared: the rear unit has its own geometry', !!a.mesh.userData.busIntAchter && a.mesh.userData.busIntAchter.geometry !== ga);
  if (a.mesh.userData.busPas) check('shared: the traveller geometry is shared too', a.mesh.userData.busPas.geometry === b.mesh.userData.busPas.geometry);
  a.world.player.x = 30; b.world.player.x = 30;
  settle(a.world, 1); settle(b.world, 1);
  check('shared: lod 1 geometry is shared too', a.mesh.userData.busInt.geometry === b.mesh.userData.busInt.geometry);
  check('shared: lod 1 differs from lod 0', a.mesh.userData.busInt.geometry !== ga);
  check('shared: lod 1 rear geometry is shared too', a.mesh.userData.busIntAchter.geometry === b.mesh.userData.busIntAchter.geometry);
}

// --- the midibus has its own, smaller room and no trailer group -------------------------------
{
  const midi = setup(MIDI_MODEL);
  settle(midi.world);
  const midInt = midi.mesh.userData.busInt;
  check('midibus: room built', !!midInt && midInt.visible && midi.mesh.userData.busIntLod === 0);
  check('midibus: no rear unit', midi.mesh.userData.busRear === undefined && midi.mesh.userData.busIntAchter === undefined);
  check('midibus: own geometry (smaller than the city bus)', triangles(midInt.geometry) === rowMidi.tri[0], `${triangles(midInt.geometry)} tegen ${rowMidi.tri[0]}`);
  check('midibus: travellers on board', !!midi.mesh.userData.busPas && midi.mesh.userData.busPas.visible);
  midi.world.player.x = 50;                     // lod 2 for the bus too (45..85)
  tick(midi.world);
  check('midibus: lod 2 at 50 m without travellers', midi.mesh.userData.busIntLod === 2 && !midi.mesh.userData.busPas);
  midi.world.player.x = R[2] + 1;
  tick(midi.world);
  check('midibus: hidden beyond the far radius', !midi.mesh.userData.busInt.visible);
}

// --- the wreck (#847): built, its own shared geometry, no travellers, see-through glass -------
{
  const glassOf = (mesh) => {
    const out = [];
    mesh.traverse((o) => { if (o.isMesh && Array.isArray(o.material) && o.material.length >= 2 && o.material[1]) out.push(o.material[1]); });
    return out;
  };
  const a = setup(BUS_MODEL, { wrecked: true });
  settle(a.world);
  const int = a.mesh.userData.busInt, rearInt = a.mesh.userData.busIntAchter;
  check('wreck: a wrecked bus gets a room', !!int && int.visible && !!rearInt && rearInt.visible);
  check('wreck: its own geometry, not the normal room', !!int && triangles(int.geometry) === wrakTri[0], `${int && triangles(int.geometry)} tegen ${wrakTri[0]}`);
  check('wreck: no travellers at all', !a.mesh.userData.busPas && !a.mesh.userData.busPasAchter);
  const glas = glassOf(a.mesh);
  check('wreck: the blind windows are made see-through', glas.length > 0 && glas.every((m) => m.transparent === true && m.opacity < 0.5 && m.depthWrite === false), `${glas.length} glasmaterialen`);
  const b = setup(BUS_MODEL, { wrecked: true });
  settle(b.world);
  check('wreck: the wreck geometry is shared between wrecks', a.mesh.userData.busInt.geometry === b.mesh.userData.busInt.geometry);
  check('wreck: the rear wreck geometry is shared too', a.mesh.userData.busIntAchter.geometry === b.mesh.userData.busIntAchter.geometry);
  a.world.player.x = 30;
  tick(a.world);
  check('wreck: the wreck also has middle and far levels', a.mesh.userData.busIntLod === 1 && triangles(a.mesh.userData.busInt.geometry) === wrakTri[1]);
  a.world.player.x = 60;
  tick(a.world);
  check('wreck: far level is blocks', a.mesh.userData.busIntLod === 2 && triangles(a.mesh.userData.busInt.geometry) === wrakTri[2]);
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
  check('budget: the first call builds one bus (front and rear room)', built() === 1, String(built()));
  // deliberately hidden for one frame: the buses that are not built yet draw nothing this frame and get their
  // turn in the next call, so a street full of buses never builds everything at once (#833)
  check('budget: the buses that are not built yet draw nothing', items.filter((i) => !i.mesh.userData.busInt || !i.mesh.userData.busInt.visible).length === 2, String(items.filter((i) => !i.mesh.userData.busInt || !i.mesh.userData.busInt.visible).length));
  tick(world);
  check('budget: the next call finishes the travellers of the first bus', !!items[0].mesh.userData.busPas && !!items[0].mesh.userData.busPasAchter && built() === 1, `pas ${!!items[0].mesh.userData.busPas} built ${built()}`);
  tick(world);
  check('budget: then the next bus gets its rooms', built() === 2, String(built()));
  tick(world);
  check('budget: and its travellers', !!items[1].mesh.userData.busPas && !!items[1].mesh.userData.busPasAchter && built() === 2);
  tick(world);
  check('budget: the last bus is built after that (single unit: room and travellers in one call)', built() === 3, String(built()));
  check('budget: every bus has its own geometry', new Set(items.map((i) => i.mesh.userData.busInt.geometry)).size === 3);
  // the travellers come after the rooms; still at most two new geometries per call
  const before = items.map((i) => !!i.mesh.userData.busPas);
  tick(world);
  const after = items.map((i) => !!i.mesh.userData.busPas);
  check('budget: travellers come in later calls', after.filter(Boolean).length >= before.filter(Boolean).length && after.includes(true));
  settle(world, 4);
  check('budget: every bus ends up with its travellers', items.every((i) => !!i.mesh.userData.busPas), JSON.stringify(after));
}

// --- measurements: triangles per level, first build time, sum of the levels -------------------
console.log('bus passenger-room LOD measurements (triangles per level; first build in ms):');
for (const r of rows) console.log(`  ${r.label.padEnd(12)} ${String(r.tri[0]).padStart(4)} > ${String(r.tri[1]).padStart(4)} > ${String(r.tri[2]).padStart(4)}  sum ${String(r.tri[0] + r.tri[1] + r.tri[2]).padStart(4)}  ${r.ms.map((m) => m.toFixed(3) + ' ms').join(' | ')}`);
console.log(`  wreck        ${String(wrakTri[0]).padStart(4)} > ${String(wrakTri[1]).padStart(4)} > ${String(wrakTri[2]).padStart(4)}  (front unit, soot variant)`);
console.log(`  first build per level: lod0 ${firstBuild[0].toFixed(3)} ms, lod1 ${firstBuild[1].toFixed(3)} ms, lod2 ${firstBuild[2].toFixed(3)} ms, sum ${(firstBuild[0] + firstBuild[1] + firstBuild[2]).toFixed(3)} ms (${builds} geometries)`);
const travellerTri = triangles(M3.buildReizigers(Lbus, 16));
const travellerTriAchter = triangles(M3.buildAchterReizigers(Lbus.rear, 8));
const drawn = rows.map((r) => [r.tri[0] + travellerTri, r.tri[1] + travellerTri, r.tri[2]]);
console.log(`  front + rear unit together: ${rowVoor.tri[0] + rowAchter.tri[0]} > ${rowVoor.tri[1] + rowAchter.tri[1]} > ${rowVoor.tri[2] + rowAchter.tri[2]} triangles`);
console.log(`  drawn per level with 16 travellers per unit: front ${drawn[0].join(' > ')}; rear +${travellerTriAchter}; midibus ${drawn[2].join(' > ')}`);
console.log(`  draw calls per articulated bus at lod 0/1: 4 (two rooms + two traveller meshes); at lod 2: 2; beyond ${R[2]} m: 0`);

console.log(bad ? `${bad} mislukt` : 'businterieur3d_test: ok');
process.exit(bad ? 1 : 0);
