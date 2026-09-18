import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// A genuine WebGL 3D view of the exact same world state the 2D canvas game
// draws - same x/y meters, same b.h building heights, same vehicle/pedestrian
// arrays. Nothing about gameplay/physics/collision changes here; this module
// only ever READS world and mirrors it into a Three.js scene with a
// GTA3-style third-person follow camera. World mapping: three.x = world.x,
// three.z = world.y, three.y = up (meters, roughly 3m per building level).

const LEVEL_HEIGHT = 3.1;
const DRAW_DIST = 140;
const UNLOAD_DIST = 175;
const TREE_DIST = 90;

const BUILDING_PALETTE3D = [
  0x66695f, 0x7b7c72, 0x4f544d, 0x3a3d38, 0x969887, 0x232522, 0xb4b2a2, 0x625044,
];
const LANDMARK_COLOR3D = {
  tower: 0x783c28, church: 0x5a5560, modern: 0x3c6e82, museum: 0xb44628,
  station: 0x465a6e, university: 0x503c2d, historic: 0x8c6e32, mall: 0x46648c, stadium: 0x3c7846,
};

let renderer = null, scene = null, cam = null, canvas3 = null;
let active = false;
let followYaw = 0, followDist = 9, followHeight = 5.2;

const buildingMeshes = new Map();
const roadMeshes = new Map();
const greenMeshes = new Map();
const waterMeshes = new Map();
const treeMeshes = new Map();
const vehicleMeshes = new Map();
const pedMeshes = new Map();
let playerMesh = null;
let sun = null;
const camRaycaster = new THREE.Raycaster();
let lastPx = null, lastPy = null;

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

export function init3D() {
  canvas3 = document.getElementById('game3d');
  renderer = new THREE.WebGLRenderer({ canvas: canvas3, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc4e0);
  scene.fog = new THREE.Fog(0x9cc4e0, DRAW_DIST * 0.45, DRAW_DIST * 1.05);

  cam = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.15, DRAW_DIST * 1.4);

  scene.add(new THREE.HemisphereLight(0xdcefff, 0x3f4a38, 3));
  sun = new THREE.DirectionalLight(0xfff2d8, 4.5);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshLambertMaterial({ color: 0x6b6459 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  playerMesh = buildPersonMesh(0x2f5c9e, 0xe0b48a);
  scene.add(playerMesh);

  resize3D();
  window.addEventListener('resize', resize3D);
  window.__scene3d = { scene, cam, renderer };
}

export function resize3D() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}

export function is3DActive() { return active; }

export function set3DActive(on) {
  active = on;
  document.getElementById('game').style.display = on ? 'none' : 'block';
  canvas3.style.display = on ? 'block' : 'none';
}

// --- shape helpers -----------------------------------------------------

function shapeFromPoly(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
  return shape;
}

function buildBuildingMesh(b) {
  if (!b._geo3d) {
    const shape = shapeFromPoly(b.pts);
    // Martinitoren is really ~95m, not "3 building:levels" like its footprint tag says
    const depth = b.landmarkKind === 'tower' ? 95 : Math.max(2.4, b.h * LEVEL_HEIGHT);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    b._geo3d = geo;
  }
  const h = hash2(b.pts[0][0], b.pts[0][1]);
  const color = (b.landmark && LANDMARK_COLOR3D[b.landmarkKind]) ?? BUILDING_PALETTE3D[Math.floor(h * BUILDING_PALETTE3D.length)];
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(b._geo3d, mat);
  return mesh;
}

function buildFlatMesh(poly, color, y) {
  if (!poly._geoFlat) {
    const shape = shapeFromPoly(poly.pts);
    poly._geoFlat = new THREE.ShapeGeometry(shape);
    poly._geoFlat.rotateX(-Math.PI / 2);
  }
  const mesh = new THREE.Mesh(poly._geoFlat, new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = y;
  return mesh;
}

function buildRoadMesh(road) {
  if (!road._geoRoad) {
    const half = road.width / 2;
    const verts = [];
    const idx = [];
    const pts = road.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * half, ny = dx / len * half;
      const base = verts.length / 3;
      verts.push(ax + nx, 0, ay + ny);
      verts.push(ax - nx, 0, ay - ny);
      verts.push(bx + nx, 0, by + ny);
      verts.push(bx - nx, 0, by - ny);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    road._geoRoad = geo;
  }
  const color = road.cat === 'cycle' ? 0xa1402f : road.cat === 'foot' ? 0xa89f8d : road.cat === 'major' ? 0x565c53 : 0x43464c;
  const mesh = new THREE.Mesh(road._geoRoad, new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = 0.03;
  return mesh;
}

function buildTreeMesh(x, y) {
  const h = hash2(x, y);
  const group = new THREE.Group();
  const trunkH = 2.2 + h * 1.2;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, trunkH, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3a28 })
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);
  const r = 1.6 + h * 1.3;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(r, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x3f6b3f })
  );
  canopy.scale.y = 0.85;
  canopy.position.y = trunkH + r * 0.7;
  group.add(canopy);
  group.position.set(x, 0, y);
  return group;
}

function buildPersonMesh(shirt, skin) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.75, 3, 6),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  body.position.y = 0.9;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 7),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.55;
  group.add(head);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  nose.position.set(0.2, 1.55, 0);
  group.add(nose);
  return group;
}

function wheel() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10),
    new THREE.MeshLambertMaterial({ color: 0x161616 })
  );
  m.rotation.z = Math.PI / 2;
  return m;
}

function buildVehicleMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2, hw = wid / 2;

  if (v.isBike || v.isScooter) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: v.model.color || 0x222222 }));
    frame.position.y = 0.55;
    group.add(frame);
    const w1 = wheel(), w2 = wheel();
    w1.scale.setScalar(0.7); w2.scale.setScalar(0.7);
    w1.position.set(hl * 0.8, 0.32, 0);
    w2.position.set(-hl * 0.8, 0.32, 0);
    group.add(w1, w2);
    const rider = buildPersonMesh(v.model.rider || 0x2f5c8a, 0xe0b48a);
    rider.scale.setScalar(0.95);
    rider.position.y = -0.05;
    group.add(rider);
  } else if (v.isBoat) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, wid), new THREE.MeshLambertMaterial({ color: v.model.color || 0x8a5a3c }));
    hull.position.y = 0.25;
    group.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.35, 0.5, wid * 0.8), new THREE.MeshLambertMaterial({ color: 0xe8e6de }));
    cabin.position.set(hl * 0.1, 0.75, 0);
    group.add(cabin);
  } else {
    const bodyH = v.isBus ? 2.6 : 1.15;
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, bodyH, wid), new THREE.MeshLambertMaterial({ color: v.model.color || 0x888888 }));
    body.position.y = bodyH / 2 + 0.35;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(len * (v.isBus ? 0.85 : 0.55), bodyH * 0.7, wid * 0.92),
      new THREE.MeshLambertMaterial({ color: 0x9fc2d8, transparent: true, opacity: 0.75 })
    );
    cabin.position.set(v.isBus ? 0 : hl * 0.05, bodyH + 0.35 + (bodyH * 0.7) / 2 - 0.05, 0);
    group.add(cabin);
    const wheelY = 0.36;
    for (const sx of [hl * 0.65, -hl * 0.65]) {
      for (const sz of [hw - 0.15, -(hw - 0.15)]) {
        const w = wheel();
        w.position.set(sx, wheelY, sz);
        group.add(w);
      }
    }
    if (v.isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, wid * 0.7), new THREE.MeshLambertMaterial({ color: 0x1c1c1c, emissive: 0x2244ff, emissiveIntensity: 0.6 }));
      bar.position.set(0.1, bodyH + 0.35 + 0.08, 0);
      group.add(bar);
    }
  }
  return group;
}

// --- per-frame sync ------------------------------------------------------

function syncBuildings(world, px, py) {
  const view = world.map.buildingsNear(px, py, DRAW_DIST);
  const seen = new Set();
  for (const b of view) {
    const dx = b.bounds[0] - px, dy = b.bounds[1] - py;
    if (Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - px, (b.bounds[1] + b.bounds[3]) / 2 - py) > DRAW_DIST) continue;
    seen.add(b);
    if (!buildingMeshes.has(b)) {
      const mesh = buildBuildingMesh(b);
      scene.add(mesh);
      buildingMeshes.set(b, mesh);
    }
  }
  for (const [b, mesh] of buildingMeshes) {
    if (seen.has(b)) continue;
    const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
    if (Math.hypot(cx - px, cy - py) > UNLOAD_DIST) {
      scene.remove(mesh);
      mesh.material.dispose();
      buildingMeshes.delete(b);
    }
  }
}

function syncFlat(items, cache, color, y, px, py) {
  const seen = new Set();
  for (const poly of items) {
    seen.add(poly);
    if (!cache.has(poly)) {
      const mesh = buildFlatMesh(poly, color, y);
      scene.add(mesh);
      cache.set(poly, mesh);
    }
  }
  for (const [poly, mesh] of cache) {
    if (seen.has(poly)) continue;
    scene.remove(mesh);
    mesh.material.dispose();
    cache.delete(poly);
  }
}

function syncRoads(world, px, py) {
  const view = world.map.roadsNear(px, py, DRAW_DIST);
  const seen = new Set();
  for (const r of view) seen.add(r);
  for (const r of view) {
    if (!roadMeshes.has(r)) {
      const mesh = buildRoadMesh(r);
      scene.add(mesh);
      roadMeshes.set(r, mesh);
    }
  }
  for (const [r, mesh] of roadMeshes) {
    if (seen.has(r)) continue;
    scene.remove(mesh);
    mesh.material.dispose();
    roadMeshes.delete(r);
  }
}

function syncTrees(world, px, py) {
  const view = world.map.treesNear(px, py, TREE_DIST);
  const seen = new Set();
  for (const t of view) {
    seen.add(t);
    if (!treeMeshes.has(t)) {
      const mesh = buildTreeMesh(t[0], t[1]);
      scene.add(mesh);
      treeMeshes.set(t, mesh);
    }
  }
  for (const [t, mesh] of treeMeshes) {
    if (seen.has(t)) continue;
    scene.remove(mesh);
    for (const child of mesh.children) child.material.dispose();
    treeMeshes.delete(t);
  }
}

function syncActors(list, cache, builder, idOf) {
  const seen = new Set();
  for (const item of list) {
    const id = idOf(item);
    seen.add(id);
    if (!cache.has(id)) {
      const mesh = builder(item);
      scene.add(mesh);
      cache.set(id, mesh);
    }
  }
  for (const [id, mesh] of cache) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    cache.delete(id);
  }
}

export function update3D(dt, world) {
  if (!active) return;
  const player = world.player;

  syncBuildings(world, player.x, player.y);
  syncFlat(world.map.greenNear(player.x, player.y, DRAW_DIST), greenMeshes, 0x5c8a4d, 0.015, player.x, player.y);
  syncFlat(world.map.waterNear(player.x, player.y, DRAW_DIST), waterMeshes, 0x2f6f9e, 0.01, player.x, player.y);
  syncRoads(world, player.x, player.y);
  syncTrees(world, player.x, player.y);

  syncActors(
    world.vehicles.filter((v) => !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) < DRAW_DIST),
    vehicleMeshes,
    buildVehicleMesh,
    (v) => v.id
  );
  for (const v of world.vehicles) {
    const mesh = vehicleMeshes.get(v.id);
    if (mesh) {
      mesh.position.set(v.x, 0, v.y);
      mesh.rotation.y = -v.angle;
    }
  }

  syncActors(
    world.pedestrians.filter((p) => p.state !== 'dead' && Math.hypot(p.x - player.x, p.y - player.y) < DRAW_DIST),
    pedMeshes,
    (p) => buildPersonMesh(p.clothing ? colorFromHex(p.clothing) : 0xcaa46a, p.skin ? colorFromHex(p.skin) : 0xe0b48a),
    (p) => p
  );
  for (const p of world.pedestrians) {
    const mesh = pedMeshes.get(p);
    if (mesh) {
      mesh.position.set(p.x, 0, p.y);
      mesh.rotation.y = -p.angle;
    }
  }

  playerMesh.visible = !player.inVehicle;
  if (!player.inVehicle) {
    playerMesh.position.set(player.x, 0, player.y);
    playerMesh.rotation.y = -player.angle;
  }

  // third-person follow: smoothly settle behind whatever the player is
  // currently facing (on foot or driving), GTA3-style - with a wall-aware
  // pull-in so the camera never ends up clipped inside a building, and an
  // instant snap on teleport (respawn/mission warp) instead of a long lerp
  // that would otherwise glide the camera straight through geometry
  const targetAngle = player.inVehicle ? player.inVehicle.angle : player.angle;
  followYaw += normalizeAngleDelta(-targetAngle - followYaw) * Math.min(1, dt * 5);

  const eyeX = player.x, eyeY = 1.3, eyeZ = player.y;
  let desiredX = player.x - Math.cos(targetAngle) * followDist;
  let desiredZ = player.y - Math.sin(targetAngle) * followDist;
  let desiredY = followHeight;

  const dx = desiredX - eyeX, dy = desiredY - eyeY, dz = desiredZ - eyeZ;
  const fullDist = Math.hypot(dx, dy, dz) || 1;
  camRaycaster.set(new THREE.Vector3(eyeX, eyeY, eyeZ), new THREE.Vector3(dx / fullDist, dy / fullDist, dz / fullDist));
  camRaycaster.far = fullDist;
  camRaycaster.near = 0.1;
  const hits = camRaycaster.intersectObjects(Array.from(buildingMeshes.values()), false);
  if (hits.length) {
    const d = Math.max(1.2, hits[0].distance - 0.4);
    const t = d / fullDist;
    desiredX = eyeX + dx * t;
    desiredY = eyeY + dy * t;
    desiredZ = eyeZ + dz * t;
  }

  const teleported = lastPx !== null && Math.hypot(player.x - lastPx, player.y - lastPy) > 15;
  const lerpT = teleported ? 1 : Math.min(1, dt * 6);
  cam.position.x += (desiredX - cam.position.x) * lerpT;
  cam.position.y += (desiredY - cam.position.y) * lerpT;
  cam.position.z += (desiredZ - cam.position.z) * lerpT;
  lastPx = player.x; lastPy = player.y;
  cam.lookAt(player.x, 1.3, player.y);

  sun.position.set(player.x + 120, 180, player.y + 60);
  sun.target.position.set(player.x, 0, player.y);

  renderer.render(scene, cam);
}

function colorFromHex(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function normalizeAngleDelta(a) {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}
