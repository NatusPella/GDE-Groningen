// Seat QA: builds every drivable vehicle mesh in Node, seats a person on the
// driver and passenger seat from seating3d.js vehicleSeat() exactly as the
// game does, and checks the figure against the model's own geometry:
//   cab      the head sits inside the front glass greenhouse (x and z), the
//            eyes between belt line and roof, the head under the roof
//   reach    the hands are ahead of the hip (on the wheel, not behind it)
//   floor    the feet stay above the sill and inside the body
// Bikes, scooters and boats are checked against the saddle / deck height.
//   node scripts/seat_audit.mjs [--verbose] [--modulair]
// --modulair: dezelfde controles met een modulaire mens (Quaternius, ADR 0050; man en vrouw om en om) op de stoel via
// seating3d.js placeSeatedLocal, zoals de spelerfase (?mensen=q3) hem neerzet: zit- of rijclip, zitvlak op de zitting.
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
const VERBOSE = process.argv.includes("--verbose");
const MODULAR = process.argv.includes('--modulair');
let M = null, placeSeatedLocal = null, SADDLE_BELOW_HIP = 0.17, wheelPoseFor = null;
if (MODULAR) {
  const fs = await import('node:fs');
  M = await import('../game/js/modularpeople.js');
  for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
  ({ placeSeatedLocal, SADDLE_BELOW_HIP } = await import('../game/js/seating3d.js'));
  await import('../game/js/autointerieur.js');   // registreert het stuur voor placeSeatedLocal
  const { cabinWheelPose } = await import('../game/js/cabin3d.js');
  const { interiorKlasse } = await import('../game/js/carinteriorlayout.js');
  const { isCockpitKlasse } = await import('../game/js/cockpitlayout.js');
  const { carBodyFit } = await import('../game/js/models3d_vehicles.js');
  wheelPoseFor = (v, seat) => { const k = interiorKlasse(v); if (k === 'heli' || k === 'vliegtuig' || v.isBoat) return null; return cabinWheelPose(seat, v.model.len, v.model.wid, k, isCockpitKlasse(k) ? null : carBodyFit(v), v.model.name || ''); };
}
let modN = 0;
// --modulair: de kleinste marge per maat tot zijn grens over alle stoelen (eis coördinator 23-11: binnen de grenzen MET marge)
const margins = {};
const noteMargin = (name, arr, lo, hi, label) => { for (const a of [].concat(arr)) { const m = Math.min(a - lo, hi - a); if (!margins[name] || m < margins[name].m) margins[name] = { m, a, label }; } };

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

// Een modulaire mens op de stoel: placeSeatedLocal speelt een tijdje de zit- of rijclip, dan dezelfde punten als hieronder uit
// zijn eigen botten (hoofd 9 cm boven het hoofdbot, handen = polsen, voeten = voetbotten, knieën = onderbeen).
function seatFigureModular(mesh, v, seat) {
  const p = M.buildModularPerson(100 + modN, { female: modN++ % 2 === 1, nominal: true });   // de gemiddelde mens: lengte en bouw uit het zaad (personSize) wijken een paar graden af
  p.userData.isPerson = true;
  p.traverse((o) => { o.userData.person = true; });
  const host = mesh.userData.body || mesh;
  host.userData.vehicleRef = v;   // zodat placeSeatedLocal het echte stuur van dit voertuig vindt (autointerieur.js)
  host.add(p);
  for (let i = 0; i < 90; i++) placeSeatedLocal(p, seat, i / 60);
  mesh.updateMatrixWorld(true);
  const B = p.userData.qBones, I = p.userData.qIdx, bn = (n) => B[p.userData.qRig.man.bones.findIndex((b) => b.name === n)];
  const w = (b, dy = 0) => { const q = new THREE.Vector3(); b.getWorldPosition(q); q.y += dy; return q; };
  const head = w(B[I.head], 0.09), headTop = w(B[I.head], 0.24), hip = w(bn('Hips'));
  const hands = [w(bn('WristL')), w(bn('WristR'))], feet = [w(B[I.footL]), w(B[I.footR])], knees = [w(B[I.loL]), w(B[I.loR])];
  // het zitvlak: het laagste punt van het lijf binnen 15 cm (in het grondvlak) van de heup en onder de heup; de zitting: seat.y
  // in de assen van het voertuig (een fietser: het zadel, SADDLE_BELOW_HIP onder de heup van het eigen model)
  const body = p.userData.body, g = body.geometry, v3 = new THREE.Vector3();
  let butt = Infinity;
  for (let i = 0; i < g.attributes.position.count; i++) {
    v3.fromBufferAttribute(g.attributes.position, i); body.applyBoneTransform(i, v3); v3.applyMatrix4(body.matrixWorld);
    // alleen het zitvlak: onder en achter de heup (de dijen lopen naar voren), het voertuig staat recht (hoek 0)
    // voor of achter in de assen van de mens zelf (een passagier kan achteruit zitten)
    const lv = p.worldToLocal(v3.clone()), lh = p.worldToLocal(hip.clone());
    if (lv.y < lh.y && lv.y > lh.y - 0.2 / (p.scale.y || 1) && lv.x < lh.x + 0.03 && Math.abs(lv.z - lh.z) < 0.15) butt = Math.min(butt, v3.y);
  }
  const seatW = worldOf(mesh.userData.body || mesh, seat.x, seat.rider ? seat.y + PERSON_RIG.HIP_Y - SADDLE_BELOW_HIP : seat.y, seat.z), seatY = seatW.y;
  const deg = (x) => x * 180 / Math.PI;
  const ang3 = (a, b, c) => deg(a.clone().sub(b).angleTo(c.clone().sub(b)));   // hoek bij b
  const knee = (k) => ang3(w(B[k ? I.upR : I.upL]), w(B[k ? I.loR : I.loL]), feet[k]);
  // in de assen van de mens: x voor, y op
  const loc = (q) => p.worldToLocal(q.clone());
  const hipL = loc(hip), neckL = loc(w(bn('Neck')));
  const backDeg = deg(Math.atan2(-(neckL.x - hipL.x), neckL.y - hipL.y));   // + = achterover
  const thigh = (k) => { const a = loc(w(B[k ? I.upR : I.upL])), b = loc(w(B[k ? I.loR : I.loL])); return deg(Math.atan2(b.y - a.y, Math.abs(b.x - a.x))); };
  // heuphoek in het zijaanzicht (de assen van de mens, z weggelaten): tussen rug (heup naar nek) en dij
  const flat = (q) => { const l = loc(q); l.z = 0; return l; };
  const hipAng = (k) => ang3(flat(w(bn('Neck'))), flat(w(B[k ? I.upR : I.upL])), flat(w(B[k ? I.loR : I.loL])));
  const elbow = (k) => ang3(w(bn(k ? 'UpperArmR' : 'UpperArmL')), w(bn(k ? 'LowerArmR' : 'LowerArmL')), w(bn(k ? 'WristR' : 'WristL')));
  // de handpalm (7,5 cm voorbij de pols) tegen de rand van het echte stuur
  let wheelGap = null;
  if (seat.pose && seat.pose.arms === 'wheel' && wheelPoseFor) {
    const wp = wheelPoseFor(v, seat);
    if (wp) {
      const c = worldOf(host, wp.x, wp.y, wp.z);
      const n = new THREE.Vector3(Math.cos(wp.tilt || 0), Math.sin(wp.tilt || 0), 0).transformDirection(host.matrixWorld);   // as van het wiel
      wheelGap = [0, 1].map((k) => {
        const wr = w(bn(k ? 'WristR' : 'WristL')), lo = w(bn(k ? 'LowerArmR' : 'LowerArmL'));
        const palm = wr.clone().add(wr.clone().sub(lo).normalize().multiplyScalar(0.075));
        const d = palm.clone().sub(c), axial = d.dot(n), radial = d.clone().addScaledVector(n, -axial).length();
        return Math.hypot(axial, radial - (wp.r || 0.19));
      });
    }
  }
  p.removeFromParent();
  return { head, headTop, hip, hands, feet, knees, butt, seatY, seatX: seatW.x, kneeDeg: [knee(0), knee(1)], backDeg, thighDeg: [thigh(0), thigh(1)], hipDeg: [hipAng(0), hipAng(1)], elbowDeg: [elbow(0), elbow(1)], wheelGap, modular: true };
}

function seatFigure(mesh, v, seat) {
  if (MODULAR) return seatFigureModular(mesh, v, seat);
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
  if (f.modular && !seat.stand || (f.modular && seat.rider)) {
    // eis 23-11: zitvlak op de zitting (minder dan 5 cm ertussen), rug rechtop (hoofd boven de heup), knieën gebogen bij een stoel
    // een fietser: de heup boven het zadel (de benen hangen langs het zadel, het zitvlak is daar niet te meten)
    if (seat.rider) f.butt = f.hip.y - 0.065;
    if (Math.abs(f.butt - f.seatY) > 0.05) issues.push(`zitvlak ${f.butt.toFixed(2)} niet op de zitting ${f.seatY.toFixed(2)} (${((f.butt - f.seatY) * 100).toFixed(0)} cm)`);
    if (!seat.rider && Math.abs(f.hip.x - f.seatX) > 0.15) issues.push(`heup ${((f.hip.x - f.seatX) * 100).toFixed(0)} cm voor de zitting (de stoel en het stuur van dit voertuig passen niet bij elkaar)`);
    if (f.head.y - f.hip.y < 0.5 || Math.abs(f.head.x - f.hip.x) > 0.3) issues.push(`rug niet rechtop (hoofd ${(f.head.y - f.hip.y).toFixed(2)} m boven en ${(f.head.x - f.hip.x).toFixed(2)} m voor de heup)`);
    // eis 23-11 (referentie autozit): rug 15-30 graden achterover, heuphoek 90-115, dijen -5 tot 35 graden, knie 105-135, ellebogen
    // 115-150 met de handpalm minder dan 3 cm van de rand van het echte stuur; fiets: romp voorover, knie onderaan 140-170
    const r0 = (a) => a.map((x) => x.toFixed(0)).join('/');
    const out = (arr, lo, hi) => arr.some((a) => a < lo || a > hi);
    const carSeat = !seat.horse && !seat.rider && seat.pose && !seat.pose.splay && (seat.pose.arms === 'wheel' || seat.pose.arms === 'lap');
    const lbl = label + (driver ? ' bestuurder' : ' passagier');
    if (carSeat) {
      noteMargin('rug', f.backDeg, 15, 30, lbl); noteMargin('heup', f.hipDeg, 90, 115, lbl); noteMargin('dij', f.thighDeg, -5, 35, lbl); noteMargin('knie', f.kneeDeg, 105, 135, lbl);
      if (seat.pose.arms === 'wheel') noteMargin('elleboog', f.elbowDeg, 115, 150, lbl);
      if (VERBOSE) console.log(`       rug ${f.backDeg.toFixed(0)} heup ${r0(f.hipDeg)} dij ${r0(f.thighDeg)} knie ${r0(f.kneeDeg)}` + (seat.pose.arms === 'wheel' ? ` elleboog ${r0(f.elbowDeg)}` : ''));
      if (f.backDeg < 15 || f.backDeg > 30) issues.push(`rug ${f.backDeg.toFixed(0)} graden achterover (15-30)`);
      if (out(f.hipDeg, 90, 115)) issues.push(`heuphoek ${r0(f.hipDeg)} graden (90-115)`);
      if (out(f.thighDeg, -5, 35)) issues.push(`dij ${r0(f.thighDeg)} graden boven horizontaal (-5 tot 35)`);
      if (out(f.kneeDeg, 105, 135)) issues.push(`knie ${r0(f.kneeDeg)} graden (105-135)`);
      if (seat.pose.arms === 'wheel') {
        if (out(f.elbowDeg, 115, 150)) issues.push(`elleboog ${r0(f.elbowDeg)} graden (115-150)`);
        if (f.wheelGap && f.wheelGap.some((g2) => g2 > 0.03)) issues.push(`hand ${f.wheelGap.map((g2) => (g2 * 100).toFixed(0)).join('/')} cm van het stuur (< 3)`);
      }
    }
    if (seat.rider) {
      // trappers (modularpeople.js PEDAL_R): het been onderaan de slag 135-172 graden, het andere (bovenaan) niet dichter dan 70
      const kLo = Math.max(...f.kneeDeg), kHi = Math.min(...f.kneeDeg);
      noteMargin('fietser romp', -f.backDeg, 8, 50, lbl); noteMargin('fietser knie', kLo, 135, 172, lbl); noteMargin('fietser knie boven', kHi, 70, 172, lbl);
      if (f.backDeg > -8 || f.backDeg < -50) issues.push(`fietser: romp ${(-f.backDeg).toFixed(0)} graden voorover (8-50)`);
      if (kLo < 135 || kLo > 172) issues.push(`fietser: knie onderaan ${kLo.toFixed(0)} graden (135-172)`);
      if (kHi < 70) issues.push(`fietser: knie bovenaan ${kHi.toFixed(0)} graden (minstens 70)`);
    }
    if (seat.pose && seat.pose.arms === 'rail' && !seat.stand) noteMargin('achterop knie', f.kneeDeg, 70, 100, lbl);
    if (seat.pose && seat.pose.arms === 'rail' && !seat.stand && out(f.kneeDeg, 70, 100)) issues.push(`achterop: knie ${r0(f.kneeDeg)} graden (70-100)`);
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
if (MODULAR) console.log('\nkleinste marge tot de grens (graden): ' + Object.entries(margins).map(([k, v]) => `${k} ${v.m.toFixed(1)} (${v.a.toFixed(0)}, ${v.label})`).join('; '));
console.log(problems ? `\n${problems} seat(s) with problems` : '\nall seats ok');
process.exitCode = problems ? 1 : 0;
