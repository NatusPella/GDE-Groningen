// Reizigers op het perron (#198): lage-poly figuren (romp en hoofd) als twee InstancedMeshes,
// zoveel als stationlife.js drukte meldt, alleen bij het station bij de speler.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { currentStation, reizigerPlekken, CROWD_R } from './stationlife.js';

const MAX = 16;
const JAS = [0x3a5f8a, 0x9a4a3a, 0x4d7a4a, 0xc9a23b, 0x6a4a7a, 0x555a60];
let body = null, head = null, shownName = '', shownN = -1;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

function build(scene) {
  body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.1, 0.32), new THREE.MeshLambertMaterial({ color: 0xffffff }), MAX);
  head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: 0xd9b08c }), MAX);
  for (const m of [body, head]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
}

export function updateStationCrowd3D(scene, world, surfaceZ) {
  const cur = currentStation();
  if (!cur || cur.d > CROWD_R) { if (body) body.count = head.count = 0, shownName = ''; return; }
  if (!body) build(scene);
  const n = Math.min(MAX, cur.view.drukte);
  if (cur.station.name === shownName && n === shownN) return;
  shownName = cur.station.name; shownN = n;
  const spots = reizigerPlekken(cur.station, MAX);
  for (let i = 0; i < n; i++) {
    const s = spots[i];
    const z = surfaceZ ? surfaceZ(s.x, s.y) : 0;
    q.setFromAxisAngle(up, -s.face + Math.PI / 2);
    sc.set(1, s.size, 1);
    m4.compose(pos.set(s.x, z + 0.55 * s.size, s.y), q, sc);
    body.setMatrixAt(i, m4);
    body.setColorAt(i, new THREE.Color(JAS[Math.floor(s.hue * JAS.length)]));
    m4.compose(pos.set(s.x, z + 1.25 * s.size, s.y), q, sc);
    head.setMatrixAt(i, m4);
  }
  body.count = head.count = n;
  body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
}
