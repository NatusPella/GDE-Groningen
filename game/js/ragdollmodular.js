import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Ragdoll op het skelet van de modulaire mensen (22 botten, ADR 0050; #1350). De ragdoll (ragdoll.js) rekent met 14 deeltjes
// op de maten van het eigen model; dit bestand brengt die deeltjes naar de echte botten van het pack: de wereldrichting van elk lid
// wordt het doel, en elk bot draait met een zwaai (zonder draaiing om de eigen as) van zijn huidige naar die richting. Het
// bekken krijgt een volledig assenstelsel (boven, opzij, voor), zodat iemand op zijn buik of rug ook echt zo ligt.
// Alle functies werken in wereldruimte met de mens zonder schaalverschil tussen de assen (ragdoll.js zet de schaal gelijk).
//
// Opzij-conventie: de mens kijkt langs +X, y omhoog, +z is rechts. De ragdoll noemt het deeltje op +z "L" (zoals het eigen
// model); het bot op +z heet in het pack "R". Daarom wijst deeltjeszijde k (0 = L) naar botzijde 'R'.

const BONE_SIDE = ['R', 'L'];
const ANKLE_ABOVE_SOLE = 0.06;   // m (ongeschaald): de enkel boven de zool, waar het voetbot staat
const HEAD_ABOVE_ORIGIN = 0.13;  // m: het hoofdmidden boven de oorsprong van het hoofdbot
const STERNUM_FWD = 0.13;        // zoals ragdoll.js
const STERNUM_AT = 0.55;         // het borstbeen tussen het bot Torso (0) en Chest (1)

const _v = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector3());
const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qs = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _U = new THREE.Vector3(), _S = new THREE.Vector3(), _F = new THREE.Vector3();
const _cu = new THREE.Vector3(), _cs = new THREE.Vector3(), _cf = new THREE.Vector3();

const bone = (ud, name) => ud.qBones[ud.qIdxBy[name]];
const posOf = (b, out) => { b.updateWorldMatrix(true, false); return b.getWorldPosition(out); };

// Draai bot `b` in wereldruimte met r, om zijn eigen oorsprong.
function rotateWorld(b, r) {
  b.parent.getWorldQuaternion(_qp);
  b.getWorldQuaternion(_qw);
  _qw.premultiply(r);
  b.quaternion.copy(_qp.invert().multiply(_qw));
  b.updateMatrixWorld(true);
}
// Zwaai van wereldrichting `cur` naar `dir` (beide niet genormaliseerd).
function swing(b, cur, dir) {
  if (cur.lengthSq() < 1e-10 || dir.lengthSq() < 1e-10) return;
  rotateWorld(b, _qs.setFromUnitVectors(cur.normalize(), dir.normalize()));
}

// Een assenstelsel (voor, boven, opzij) uit boven en opzij, orthonormaal.
function basis(up, side, out) {
  _cu.copy(up).normalize();
  _cs.copy(side).addScaledVector(_cu, -side.dot(_cu));
  if (_cs.lengthSq() < 1e-8) _cs.set(0, 0, 1).addScaledVector(_cu, -_cu.z);
  _cs.normalize();
  _cf.crossVectors(_cu, _cs);
  return out.makeBasis(_cf, _cu, _cs);
}

// De botten op hun rust (pose van het pack): het vaste vertrekpunt van elke frame, zodat de pose nooit van een clip afhangt.
export function restBones(ud) {
  const rb = ud.qRig.man.bones;
  for (let i = 0; i < ud.qBones.length; i++) { ud.qBones[i].position.fromArray(rb[i].pos); ud.qBones[i].quaternion.fromArray(rb[i].quat); }
}

// Afmetingen van het lijf voor de deeltjes (heupbreedte en schouderbreedte, in eenheden van het model): uit de botten.
export function modularDims(mesh, s) {
  mesh.updateMatrixWorld(true);
  const ud = mesh.userData;
  const hl = posOf(bone(ud, 'UpperLegL'), _v[0]).clone(), hr = posOf(bone(ud, 'UpperLegR'), _v[1]);
  const sl = posOf(bone(ud, 'UpperArmL'), _v[2]).clone(), sr = posOf(bone(ud, 'UpperArmR'), _v[3]);
  return { hipZ: hl.distanceTo(hr) / 2 / s, shZ: sl.distanceTo(sr) / 2 / s };
}

// De deeltjes uit de pose van dit moment (de laatste frame van de animatie). I = de deeltjesnummers van ragdoll.js, p = Float32Array.
export function captureModular(mesh, p, s, I) {
  mesh.updateMatrixWorld(true);
  const ud = mesh.userData;
  const put = (i, v) => { p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; };
  const w = (name, out) => posOf(bone(ud, name), out);
  for (let k = 0; k < 2; k++) {
    const sd = BONE_SIDE[k];
    put(I.HL + k, w('UpperLeg' + sd, _v[0]));
    put(I.KL + k, w('LowerLeg' + sd, _v[1]));
    // de enkel: een stukje van de voetzool naar de knie
    w('Foot' + sd, _v[2]);
    _v[3].subVectors(w('LowerLeg' + sd, _v[1]), _v[2]).normalize().multiplyScalar(ANKLE_ABOVE_SOLE * s).add(_v[2]);
    put(I.AL + k, _v[3]);
    put(I.SL + k, w('UpperArm' + sd, _v[0]));
    put(I.EL + k, w('LowerArm' + sd, _v[1]));
    put(I.WL + k, w('Wrist' + sd, _v[2]));
  }
  // de kop: het midden boven het hoofdbot, langs de nek
  w('Head', _v[0]); w('Neck', _v[1]);
  _v[2].subVectors(_v[0], _v[1]).normalize().multiplyScalar(HEAD_ABOVE_ORIGIN * s).add(_v[0]);
  put(I.HD, _v[2]);
  // het borstbeen: tussen romp en borst, een stuk naar voren (voor = boven x opzij)
  w('Torso', _v[0]); w('Chest', _v[1]);
  _v[0].lerp(_v[1], STERNUM_AT);
  _U.set(p[I.SL * 3] + p[I.SR * 3] - p[I.HL * 3] - p[I.HR * 3], p[I.SL * 3 + 1] + p[I.SR * 3 + 1] - p[I.HL * 3 + 1] - p[I.HR * 3 + 1], p[I.SL * 3 + 2] + p[I.SR * 3 + 2] - p[I.HL * 3 + 2] - p[I.HR * 3 + 2]);
  _S.set(p[I.HL * 3] - p[I.HR * 3], p[I.HL * 3 + 1] - p[I.HR * 3 + 1], p[I.HL * 3 + 2] - p[I.HR * 3 + 2]);
  basis(_U, _S, _m);
  _F.copy(_cf);
  _v[0].addScaledVector(_F, STERNUM_FWD * s);
  put(I.ST, _v[0]);
}

// De deeltjes naar de botten. yaw = de hoek waarmee de mens in de wereld staat (mesh.rotation.y = -yaw): de wereldpose blijft dezelfde,
// maar de botten staan zo ten opzichte van de kijkrichting, zodat een overgang terug naar een animatie geen draai maakt.
export function writeModular(mesh, p, s, I, yaw) {
  const ud = mesh.userData;
  restBones(ud);
  mesh.rotation.set(0, -yaw, 0);
  mesh.scale.setScalar(s);
  mesh.updateMatrixWorld(true);
  const at = (i, out) => out.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
  const L = (name) => bone(ud, name);
  const hips = L('Hips');

  // 1. het bekken: het lijf (boven = heupen naar schouders, opzij = linker naar rechter heup van het pack) naar het assenstelsel van de deeltjes
  const hipMid = _v[6].copy(at(I.HL, _v[0])).add(at(I.HR, _v[1])).multiplyScalar(0.5);
  const shMid = _v[7].copy(at(I.SL, _v[0])).add(at(I.SR, _v[1])).multiplyScalar(0.5);
  _U.subVectors(shMid, hipMid);
  _S.subVectors(at(I.HL, _v[0]), at(I.HR, _v[1]));
  basis(_U, _S, _m2);   // gewenst
  const ul = L('UpperLegL'), ur = L('UpperLegR');
  const legMid = (out) => out.copy(posOf(ul, _v[0])).add(posOf(ur, _v[1])).multiplyScalar(0.5);
  const armMid = (out) => out.copy(posOf(L('UpperArmL'), _v[0])).add(posOf(L('UpperArmR'), _v[1])).multiplyScalar(0.5);
  mesh.updateMatrixWorld(true);
  const lm = legMid(_v[4]).clone();
  const cu = armMid(_v[5]).sub(lm);
  const cs = _v[2].copy(posOf(ur, _v[2])).sub(posOf(ul, _v[3]));
  basis(cu, cs, _m);   // huidig
  _q.setFromRotationMatrix(_m2.multiply(_m.invert()));
  rotateWorld(hips, _q);

  // 2. de heupen op hun plek: de groep schuift zo dat het midden van de bovenbenen op het midden van de heupdeeltjes ligt
  mesh.updateMatrixWorld(true);
  legMid(_v[4]);
  mesh.position.add(_v[2].subVectors(hipMid, _v[4]));
  mesh.updateMatrixWorld(true);

  // 3. de nek: van de schouders naar het hoofdmidden
  const head = at(I.HD, _v[0]).sub(shMid);
  swing(L('Neck'), _v[1].subVectors(posOf(L('Head'), _v[2]), posOf(L('Neck'), _v[3])), head);

  // 4. armen en benen: richting per lid, dan de voet
  for (let k = 0; k < 2; k++) {
    const sd = BONE_SIDE[k];
    const ua = L('UpperArm' + sd), la = L('LowerArm' + sd), wr = L('Wrist' + sd);
    swing(ua, _v[0].subVectors(posOf(la, _v[1]), posOf(ua, _v[2])), _v[3].subVectors(at(I.EL + k, _v[4]), at(I.SL + k, _v[5])));
    swing(la, _v[0].subVectors(posOf(wr, _v[1]), posOf(la, _v[2])), _v[3].subVectors(at(I.WL + k, _v[4]), at(I.EL + k, _v[5])));
    const ul2 = L('UpperLeg' + sd), ll = L('LowerLeg' + sd), ft = L('Foot' + sd);
    swing(ul2, _v[0].subVectors(posOf(ll, _v[1]), posOf(ul2, _v[2])), _v[3].subVectors(at(I.KL + k, _v[4]), at(I.HL + k, _v[5])));
    // de scheen: van de knie naar de voetzool in rust (de voet hangt niet aan het onderbeen)
    const sh = ud.qRig.shin[sd];
    mesh.updateMatrixWorld(true);
    ll.getWorldQuaternion(_qw);
    _v[0].fromArray(sh.axis).applyQuaternion(_qw);
    swing(ll, _v[0], _v[3].subVectors(at(I.AL + k, _v[4]), at(I.KL + k, _v[5])));
    // de voet: de zool onder de enkel, met zijn bovenkant naar de knie
    mesh.updateMatrixWorld(true);
    const ank = at(I.AL + k, _v[0]), kn = at(I.KL + k, _v[1]);
    const down = _v[2].subVectors(ank, kn).normalize();
    const sole = _v[3].copy(ank).addScaledVector(down, ANKLE_ABOVE_SOLE * s);
    ft.parent.worldToLocal(sole);
    ft.position.copy(sole);
    ft.updateMatrixWorld(true);
    // het voetbot staat in rust plat (bovenkant = +y van de wereld)
    swing(ft, _v[4].set(0, 1, 0), _v[2].negate());
  }
  mesh.updateMatrixWorld(true);
}

// Een pose vastleggen: de quaternions van alle botten.
export function snapshotPose(ud) {
  const out = new Float32Array(ud.qBones.length * 4);
  ud.qBones.forEach((b, i) => b.quaternion.toArray(out, i * 4));
  return out;
}

// Na de ragdoll: een overgang naar de animatie (modularpeople.js animateModular mengt qBlendFrom in 0,3 s), of de botten in rust.
export function releaseModular(mesh, from) {
  const ud = mesh.userData;
  if (from) ud.qBlendFrom = { q: from, t: 0, dur: 0.3 };
  else restBones(ud);
}
