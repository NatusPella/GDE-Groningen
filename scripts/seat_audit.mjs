// Seat QA: builds every drivable vehicle mesh in Node, seats a person on the
// driver and passenger seat from seating3d.js vehicleSeat() exactly as the
// game does, and checks the figure against the model's own geometry:
//   cab      the head sits inside the front glass greenhouse (x and z), the
//            eyes between belt line and roof, the head under the roof
//   reach    the hands are ahead of the hip (on the wheel, not behind it)
//   floor    the feet stay above the sill and inside the body
// Bikes, scooters and boats are checked against the saddle / deck height.
//   node scripts/seat_audit.mjs [--verbose]
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, setHorseMeshBuilder } = await import('../game/js/models3d_vehicles.js');
const { buildHorseMesh } = await import('../game/js/countryside.js');
setHorseMeshBuilder(buildHorseMesh);
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { buildPersonMesh, seatPose, seatedY, standBehindPose, supPose, PERSON_RIG } = await import('../game/js/models3d_people.js');
const { TRAFFIC_MODELS, MOPED_MODEL } = await import('../game/js/vehicle.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
const VERBOSE = process.argv.includes('--verbose');

const car = (name, len, wid, extra = {}) => ({ model: { name, len, wid, color: '#888888', ...extra.model }, ...extra.v });
const CASES = [
  ['hatch', car('hatch', 3.8, 1.7)],
  ['sedan', car('sedan', 4.3, 1.8)],
  ['wagon', car('wagon', 4.5, 1.8)],
  ['van', car('van', 5.0, 2.0)],
  ['sport', car('sport', 4.1, 1.85)],
  ['suv', car('suv', 4.7, 1.95)],
  ['taxi', car('taxi', 4.6, 1.8)],
  ['cashvan', car('cashvan', 5.2, 2.0)],
  ['escort (hero)', car('escort', 4.0, 1.65, { v: { isHeroCar: true } })],
  ['police', car('police', 4.3, 1.8, { v: { isPolice: true } })],
  ['ambulance', car('ambulance', 6.0, 2.0, { v: { isAmbulance: true } })],
  ['foodtruck', car('foodtruck', 5.4, 2.1)],
  ['truck (bakwagen)', car('truck', 8.5, 2.5)],
  ['truck (H8 vet-tanker)', car('truck', 8.5, 2.5, { model: { tank: true } })],
  ['truck (stunt tanker)', car('truck', 6.2, 2.3, { model: { tank: true } })],
  ['trekkerlimo', car('trekkerlimo', 5.6, 2.0)],
  ['tractor', car('tractor', 4.3, 2.3)],
  ['quad', car('quad', 2.1, 1.2)],
  ['bus (gelede)', car('bus', 11.2, 2.55, { v: { isBus: true }, model: { trailer: 6.8 } })],
  ['midibus', car('midibus', 8.4, 2.3, { v: { isBus: true } })],
  ['heli', car('heli', 9, 2.4, { v: { isHeli: true } })],
];

const _v = new THREE.Vector3();
function worldOf(obj, x, y, z) {
  return _v.set(x, y, z).applyMatrix4(obj.matrixWorld).clone();
}

// Vertex bounds of one material group (glass = 1) over all non-wheel body meshes.
function groupBoxes(root, matIndex) {
  const pts = [];
  root.updateMatrixWorld(true);
  const wheels = new Set(root.userData.wheels || []);
  const onWheel = (o) => { for (let p = o.parent; p && p !== root; p = p.parent) if (wheels.has(p)) return true; return false; };
  root.traverse((o) => {
    // the hubcaps (sierdoppen, #205) sit on the wheels and have a second material group of their own: not glass
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry || o.userData.person || onWheel(o)) return;
    const g = o.geometry, pos = g.attributes.position;
    if (!pos) return;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
    for (const gr of groups) {
      if (gr.materialIndex !== matIndex) continue;
      for (let i = gr.start; i < gr.start + gr.count; i++) {
        const k = g.index ? g.index.getX(i) : i;
        pts.push(new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld));
      }
    }
  });
  return pts;
}

// The frontmost cluster of glass: triangles whose x spans overlap or lie
// within 0.4 m of each other form one cluster.
function frontGlass(pts) {
  if (!pts.length) return null;
  const tris = [];
  for (let i = 0; i + 2 < pts.length; i += 3) {
    const t = [pts[i], pts[i + 1], pts[i + 2]];
    tris.push({ t, x0: Math.min(...t.map((p) => p.x)), x1: Math.max(...t.map((p) => p.x)) });
  }
  tris.sort((a, b) => b.x1 - a.x1);
  const sel = [tris[0]];
  let lo = tris[0].x0;
  for (const tr of tris.slice(1)) {
    if (tr.x1 < lo - 0.4) break;
    sel.push(tr);
    lo = Math.min(lo, tr.x0);
  }
  return new THREE.Box3().setFromPoints(sel.flatMap((s) => s.t));
}

function bodyBox(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !o.userData.person && !(o.parent && o.parent.userData && o.parent.userData.isPerson)) box.expandByObject(o); });
  return box;
}

function seatFigure(mesh, v, seat) {
  const p = buildPersonMesh(0x5a6470, 0xd9aa82, { seed: 3 });
  p.userData.isPerson = true;
  p.traverse((o) => { o.userData.person = true; });
  if (seat.stand) { if (seat.pose && seat.pose.arms === 'sup') supPose(p, 0); else standBehindPose(p); p.position.set(seat.x, seat.y, seat.z); }
  else { seatPose(p, seat.pose); p.position.set(seat.x, seatedY(p, seat.y), seat.z); }
  p.rotation.y = seat.face || 0;
  (mesh.userData.body || mesh).add(p);
  mesh.updateMatrixWorld(true);
  const ud = p.userData, R = PERSON_RIG;
  const head = worldOf(ud.head, 0, R.HEAD_Y - R.NECK_Y, 0);
  const headTop = worldOf(ud.head, 0, R.HEAD_Y - R.NECK_Y + 0.13, 0);
  const hip = worldOf(ud.pelvis, 0, 0, 0);
  const hands = [ud.elbowL, ud.elbowR].map((e) => worldOf(e, 0, -R.FOREARM, 0));
  const feet = [ud.kneeL, ud.kneeR].map((k) => worldOf(k, 0, -R.SHIN_LEN, 0));
  const knees = [ud.kneeL, ud.kneeR].map((k) => worldOf(k, 0, 0, 0));
  p.removeFromParent();
  return { head, headTop, hip, hands, feet, knees };
}

const f2 = (n) => (n >= 0 ? ' ' : '') + n.toFixed(2);
let problems = 0;
function check(label, v, driver) {
  v.id = 1; v.x = 0; v.y = 0; v.angle = 0;
  const mesh = buildVehicleMesh(v);
  mesh.updateMatrixWorld(true);
  const seat = vehicleSeat(v, driver);
  const body = bodyBox(mesh);
  const glass = frontGlass(groupBoxes(mesh, 1));
  const f = seatFigure(mesh, v, seat);
  const issues = [];
  if (glass && !v.isBike && !v.isScooter && !v.isBoat) {
    const gz = Math.max(Math.abs(glass.min.z), Math.abs(glass.max.z));
    if (f.head.x < glass.min.x - 0.35 || f.head.x > glass.max.x + 0.05) issues.push(`head x ${f.head.x.toFixed(2)} outside cab glass x ${glass.min.x.toFixed(2)}..${glass.max.x.toFixed(2)}`);
    if (Math.abs(f.head.z) > gz) issues.push(`head z ${f.head.z.toFixed(2)} outside glass ±${gz.toFixed(2)}`);
    if (f.head.y < glass.min.y) issues.push(`eyes ${f.head.y.toFixed(2)} below window line ${glass.min.y.toFixed(2)}`);
    if (f.headTop.y > glass.max.y + 0.12) issues.push(`head top ${f.headTop.y.toFixed(2)} through roof ${glass.max.y.toFixed(2)}`);
    if (glass.max.y - f.headTop.y > 0.75) issues.push(`head ${f.headTop.y.toFixed(2)} sunk far below roof ${glass.max.y.toFixed(2)}`);
  }
  if (seat.horse) {
    // barrel of countryside.js' horse: centre y 1.33, half height 0.33, half width ~0.27
    const barrelHalf = (y) => (Math.abs(y - 1.33) >= 0.33 ? 0 : 0.27 * Math.sqrt(1 - ((y - 1.33) / 0.33) ** 2));
    if (Math.abs(f.hip.y - 1.78) > 0.12) issues.push(`hip y ${f.hip.y.toFixed(2)} not on the saddle`);
    if (f.hip.x < -0.74 || f.hip.x > 0.4 || Math.abs(f.hip.z) > 0.05) issues.push(`hip x ${f.hip.x.toFixed(2)} off the back`);
    for (const pt of [...f.knees, ...f.feet]) {
      if (Math.abs(pt.z) < barrelHalf(pt.y) + 0.03) issues.push(`leg point (${pt.y.toFixed(2)}, z ${pt.z.toFixed(2)}) inside the barrel`);
    }
    for (const ft of f.feet) {
      if (ft.y < 0.6 || ft.y > 1.3) issues.push(`foot y ${ft.y.toFixed(2)} not hanging along the flank`);
      if (Math.abs(ft.z) > 0.6) issues.push(`foot z ${ft.z.toFixed(2)} sticking out`);
    }
    if (f.feet[0].z * f.feet[1].z >= 0) issues.push('both legs on one side (not astride)');
  } else if (!v.isBike && !v.isScooter) {
    if (driver && !v.isBoat && Math.min(...f.hands.map((h) => h.x)) < f.hip.x + 0.15) issues.push('hands not ahead of the hip');
    for (const ft of f.feet) {
      if (ft.y < (v.isBoat ? -0.3 : 0.25)) issues.push(`foot y ${ft.y.toFixed(2)} below the floor`);
      if (ft.x > body.max.x - 0.05 || ft.x < body.min.x) issues.push(`foot x ${ft.x.toFixed(2)} outside the body`);
    }
  }
  if (!seat.horse && (f.hip.x > body.max.x || f.hip.x < body.min.x || Math.abs(f.hip.z) > Math.max(body.max.z, -body.min.z))) issues.push('hip outside the body');
  problems += issues.length ? 1 : 0;
  const tag = `${label.padEnd(24)} ${driver ? 'driver ' : 'passngr'}`;
  const nums = `seat(${f2(seat.x)},${f2(seat.y)},${f2(seat.z)}) head(${f2(f.head.x)},${f2(f.head.y)},${f2(f.head.z)})` + (glass ? ` glass x${f2(glass.min.x)}..${f2(glass.max.x)} y${f2(glass.min.y)}..${f2(glass.max.y)}` : '');
  console.log(`${issues.length ? 'FAIL' : 'ok  '} ${tag} ${VERBOSE || issues.length ? nums : ''}`);
  for (const i of issues) console.log('       - ' + i);
}

for (const [label, v] of CASES) for (const d of [true, false]) check(label, { ...v, model: { ...v.model } }, d);
const twoWheel = TRAFFIC_MODELS().filter((m) => m.name === 'bike' || m.name === 'scooter');
const seen = new Set();
for (const m of twoWheel) {
  const label = m.name === 'bike' ? (m.fat ? 'fatbike' : 'bike') : 'step';
  if (seen.has(label)) continue;
  seen.add(label);
  check(label, { model: { ...m }, isBike: m.name === 'bike', isScooter: m.name === 'scooter' }, true);
  check(label, { model: { ...m }, isBike: m.name === 'bike', isScooter: m.name === 'scooter' }, false);
}
check('brommer', { model: { ...MOPED_MODEL }, isScooter: true }, true);
check('brommer', { model: { ...MOPED_MODEL }, isScooter: true }, false);
const HORSE = { name: 'horse', len: 2.4, wid: 0.75, maxSpeed: 9.2, accel: 3.2, brake: 6, turnRate: 3.2, color: '#6b3f22', rider: '#1c3fae', coat: 0 };
for (const d of [true, false]) check('politiepaard', { model: { ...HORSE }, isBike: true, _mount: 'horse' }, d);
for (const [k, m] of Object.entries(BOAT_KINDS)) for (const d of [true, false]) check('boat ' + k, { model: { ...m }, isBoat: true }, d);
check('politieboot', { model: { ...BOAT_KINDS.sloep, cabin: '#12294f' }, isBoat: true, isPolice: true }, true);
console.log(problems ? `\n${problems} seat(s) with problems` : '\nall seats ok');
process.exitCode = problems ? 1 : 0;
