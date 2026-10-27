import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { helipadInfo, DECK_RAISE } from './skyprops.js';
import { pointInPolygon } from './util.js';
import { makeBeamGeometry, makeBeamMaterial, requestSearchlight } from './nightlights3d.js';
import { hoofdspeler } from './players.js';

// 3D side of skyprops.js: the UMCG rooftop helipad, the trauma helicopter
// and hot-air balloons. Meshes are local +X forward like every other actor.

const HELI_RPM = 26;

// Sky props stay readable beyond the ground fog, like skyline landmarks.
function skyFog(m) {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
  float skyFog = min(smoothstep(fogNear, fogFar, vFogDepth), 0.6 + 0.38 * smoothstep(fogFar, fogFar * 3.0, vFogDepth));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, skyFog);
#endif`);
  };
  m.customProgramCacheKey = () => 'skyprop';
  return m;
}
const lambert = (color, opts = {}) => skyFog(new THREE.MeshLambertMaterial({ color, ...opts }));

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
  }));
  s.scale.setScalar(size);
  s.userData.size = size;
  return s;
}

// --- helipad --------------------------------------------------------------

function flatMat(color, offset) {
  return new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 2 });
}

function buildHelipad(pad) {
  const g = new THREE.Group();
  g.position.set(pad.x, pad.roof, pad.y);
  g.rotation.y = -pad.angle;
  const r = pad.r;
  const top = DECK_RAISE;

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(r, r, top + 0.1, 40), new THREE.MeshLambertMaterial({ color: 0x505356 }));
  deck.position.y = (top - 0.1) / 2;
  g.add(deck);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.12, 40, 1, true), new THREE.MeshLambertMaterial({ color: 0xb9bcbf, side: THREE.DoubleSide }));
  edge.position.y = top - 0.02;
  g.add(edge);

  const marks = [];
  const flat = (geo, color, off, y) => {
    const m = new THREE.Mesh(geo, flatMat(color, off));
    marks.push(m.material);
    m.rotation.x = -Math.PI / 2;
    m.position.y = top + y;
    g.add(m);
    return m;
  };
  flat(new THREE.RingGeometry(r - 0.55, r - 0.2, 48), 0xf2f2ee, 2, 0.004);
  flat(new THREE.RingGeometry(r * 0.72, r * 0.8, 48), 0xe8c21a, 2, 0.004);
  // hospital heliport: red H on a white cross
  const cw = r * 0.62, cl = r * 1.2;
  flat(new THREE.PlaneGeometry(cl, cw), 0xf2f2ee, 3, 0.008);
  flat(new THREE.PlaneGeometry(cw, cl), 0xf2f2ee, 3, 0.008);
  const hh = r * 0.66, hw = r * 0.46, st = r * 0.12;
  const H = [[-hw / 2, 0, st, hh], [hw / 2, 0, st, hh], [0, 0, hw, st]];
  for (const [x, z, w, d] of H) {
    const m = flat(new THREE.PlaneGeometry(w, d), 0xc8201a, 4, 0.012);
    m.position.x = x; m.position.z = z;
  }

  // perimeter lights (green), mostly visible at night
  const n = 16, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * (r + 0.15); pos[i * 3 + 1] = top + 0.18; pos[i * 3 + 2] = Math.sin(a) * (r + 0.15);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({
    color: 0x5dff7a, size: 1.2, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  g.add(lights);
  const bulbs = new THREE.InstancedMesh(BULB_GEO, BULB_MAT, n);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < n; i++) bulbs.setMatrixAt(i, mtx.makeTranslation(pos[i * 3], top + 0.07, pos[i * 3 + 2]));
  g.add(bulbs);

  // windsock on the roof beside the deck, inside the footprint
  let sock = null;
  const ca = Math.cos(pad.angle), sa = Math.sin(pad.angle);
  for (const [lx, lz] of [[r + 3, r * 0.6], [-(r + 3), -r * 0.6], [r * 0.6, r + 3], [-r * 0.6, -(r + 3)], [r + 2, 0], [0, r + 2]]) {
    const wx = pad.x + lx * ca - lz * sa, wy = pad.y + lx * sa + lz * ca;
    if (!pointInPolygon(wx, wy, pad.building.pts)) continue;
    sock = buildWindsock();
    sock.position.set(lx, 0, lz);
    g.add(sock);
    break;
  }
  g.userData = { lights, sock, marks };
  return g;
}

const BULB_GEO = new THREE.CylinderGeometry(0.09, 0.11, 0.14, 6);
const BULB_MAT = new THREE.MeshBasicMaterial({ color: 0x3c9d4e });

function buildWindsock() {
  const g = new THREE.Group();
  const poleH = 4.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, poleH, 6), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
  pole.position.y = poleH / 2;
  g.add(pole);
  const pivot = new THREE.Group();
  pivot.position.y = poleH - 0.1;
  g.add(pivot);
  const len = 2.2, bands = 5;
  const geo = new THREE.CylinderGeometry(0.33, 0.13, len, 12, bands, true);
  geo.translate(0, -len / 2, 0);
  geo.rotateZ(Math.PI / 2);
  const cols = [], p = geo.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const band = Math.min(bands - 1, Math.floor((p.getX(i) / len) * bands + 1e-4));
    c.setHex(band % 2 ? 0xf4f2ee : 0xf06a10);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const sock = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  pivot.add(sock);
  g.userData = { pivot, sock };
  return g;
}

// --- helicopter -------------------------------------------------------------
// The UMCG trauma heli (Lifeliner 4) is yellow.

const TH_WHITE = lambert(0xf0efea);
const TH_YELLOW = lambert(0xf0c21a);
const TH_DARK = lambert(0x2a2d31);
const TH_GLASS = lambert(0x1a2838, { emissive: 0x05080c });
const TH_ROTOR = lambert(0x1c1c1e);

function buildHeli() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  const cabin = add(new THREE.CapsuleGeometry(1.0, 2.5, 6, 12), TH_YELLOW, 0.2, 1.5, 0, 0, 0, Math.PI / 2);
  cabin.scale.set(1.08, 1, 0.82);
  add(new THREE.BoxGeometry(3.2, 0.34, 1.7), TH_WHITE, 0.25, 1.28, 0);
  add(new THREE.BoxGeometry(3.4, 0.12, 1.66), TH_DARK, 0.25, 1.05, 0);
  const nose = add(new THREE.SphereGeometry(0.95, 14, 10), TH_GLASS, 1.55, 1.62, 0);
  nose.scale.set(1.05, 0.82, 0.8);
  add(new THREE.BoxGeometry(1.9, 0.55, 1.05), TH_WHITE, -0.2, 2.38, 0);
  add(new THREE.CylinderGeometry(0.3, 0.14, 4.3, 10), TH_YELLOW, -3.6, 1.82, 0, 0, 0, -Math.PI / 2);
  add(new THREE.BoxGeometry(0.5, 0.06, 1.7), TH_WHITE, -4.7, 1.82, 0);
  add(new THREE.BoxGeometry(1.0, 1.35, 0.16), TH_YELLOW, -5.75, 2.3, 0, 0, 0, -0.25);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16), TH_DARK, -5.75, 1.88, 0, Math.PI / 2, 0, 0);
  for (const z of [-0.95, 0.95]) {
    add(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6), TH_DARK, 0.2, 0.07, z, 0, 0, Math.PI / 2);
    for (const x of [-0.8, 1.1]) add(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 5), TH_DARK, x, 0.42, z * 0.85, z > 0 ? 0.3 : -0.3, 0, 0);
  }
  add(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 8), TH_DARK, 0, 2.8, 0);

  const rotor = new THREE.Group();
  rotor.position.set(0, 2.98, 0);
  const bladeGeo = new THREE.BoxGeometry(4.7, 0.05, 0.3);
  bladeGeo.translate(2.35, 0, 0);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(bladeGeo, TH_ROTOR);
    b.rotation.y = (i / 4) * Math.PI * 2;
    rotor.add(b);
  }
  g.add(rotor);
  const discMat = new THREE.MeshBasicMaterial({ color: 0x202224, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.75, 40), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 2.98;
  g.add(disc);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(-5.75, 1.88, 0.17);
  const tb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.03), TH_ROTOR);
  tailRotor.add(tb);
  const tb2 = tb.clone();
  tb2.rotation.z = Math.PI / 2;
  tailRotor.add(tb2);
  g.add(tailRotor);

  const light = (color, size, x, y, z) => {
    const s = glowSprite(color, size);
    s.position.set(x, y, z);
    g.add(s);
    return s;
  };
  const lights = {
    beaconTop: light(0xff2a1a, 2.2, -0.3, 2.72, 0),
    beaconBelly: light(0xff2a1a, 2.0, 0.2, 0.7, 0),
    navL: light(0xff3020, 1.1, 0.3, 1.5, -1.0),
    navR: light(0x30ff60, 1.1, 0.3, 1.5, 1.0),
    strobe: light(0xffffff, 2.4, -6.1, 2.9, 0),
    land: light(0xfff4dc, 2.6, 1.9, 0.75, 0),
  };
  g.userData = { rotor, disc, tailRotor, lights };
  return g;
}

function buildBeam() {
  const geo = makeBeamGeometry(20);
  geo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(geo, makeBeamMaterial(0xfff4e0));
  beam.frustumCulled = false;
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({
    map: glowTexture(), color: 0xfff1d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  spot.rotation.x = -Math.PI / 2;
  return { beam, spot };
}

// Rotor downwash: dust blown outward over the deck / ground.
const DUST_N = 48;
function buildDust() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DUST_N * 4), 4));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.2, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false,
  }));
  pts.frustumCulled = false;
  pts.userData = { vel: new Float32Array(DUST_N * 3), life: new Float32Array(DUST_N), max: new Float32Array(DUST_N), next: 0, acc: 0 };
  return pts;
}

// --- balloons -------------------------------------------------------------

const PROFILE = [[1.3, 0], [2.6, 1.2], [4.6, 3.2], [6.3, 5.6], [7.3, 8.0], [7.5, 9.8], [7.1, 11.6], [6.1, 13.2], [4.4, 14.6], [2.3, 15.5], [0.02, 15.9]];
const GORES = 24;

function mulberry(seed) {
  let a = Math.floor(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function balloonPalette(r) {
  const base = r();
  const n = 2 + Math.floor(r() * 3);
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = (base + i / n + (r() - 0.5) * 0.08) % 1;
    const s = 0.65 + r() * 0.3, l = 0.42 + r() * 0.2;
    out.push(new THREE.Color().setHSL(h, s, l));
  }
  if (r() < 0.45) out[1 % n] = new THREE.Color(0xf4f1ea);
  return out;
}

function buildEnvelopeGeometry(seed) {
  const r = mulberry(seed);
  const curve = new THREE.SplineCurve(PROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.LatheGeometry(curve.getPoints(22), GORES).toNonIndexed();
  geo.computeVertexNormals();
  const pal = balloonPalette(r);
  const kind = Math.floor(r() * 5);
  const trim = r() < 0.5 ? new THREE.Color(0x1d1f24) : pal[0];
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3);
  const height = PROFILE[PROFILE.length - 1][1];
  for (let i = 0; i < p.count; i += 3) {
    let ax = 0, ay = 0, az = 0;
    for (let k = 0; k < 3; k++) { ax += p.getX(i + k); ay += p.getY(i + k); az += p.getZ(i + k); }
    const u = ay / 3 / height;
    const ang = (Math.atan2(az, ax) + Math.PI * 2) % (Math.PI * 2);
    const gore = Math.floor((ang / (Math.PI * 2)) * GORES) % GORES;
    let c;
    if (kind === 0) c = pal[gore % pal.length];
    else if (kind === 1) c = pal[Math.floor(u * 7) % pal.length];
    else if (kind === 2) c = pal[Math.floor(u * 9 + (gore % 2) * 0.5) % pal.length];
    else if (kind === 3) c = u > 0.35 && u < 0.72 ? pal[(gore + Math.floor(u * 12)) % 2] : pal[pal.length - 1];
    else c = pal[Math.floor(gore / 2 + u * 7) % pal.length];
    if (u < 0.08 || u > 0.94) c = trim;
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

const WICKER = lambert(0xa27d4c);
const WICKER_RIM = lambert(0x5c4328);
const BURNER = lambert(0x3a3c40);
const CABLE = new THREE.LineBasicMaterial({ color: 0x2b2620 });
const ENV_Y = 4.2;

function buildBalloon(b) {
  const g = new THREE.Group();
  const envMat = lambert(0xffffff, { vertexColors: true, emissive: 0x000000 });
  const env = new THREE.Mesh(buildEnvelopeGeometry(b.seed), envMat);
  env.position.y = ENV_Y;
  g.add(env);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), WICKER);
  basket.position.y = 0.55;
  g.add(basket);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.3), WICKER_RIM);
  rim.position.y = 1.12;
  g.add(rim);
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.35, 8), BURNER);
  burner.position.y = 2.25;
  g.add(burner);
  const verts = [];
  for (const [x, z] of [[0.65, 0.55], [-0.65, 0.55], [0.65, -0.55], [-0.65, -0.55]]) {
    verts.push(x, 1.15, z, x * 0.35, 2.2, z * 0.35);
    verts.push(x * 0.35, 2.2, z * 0.35, x * 1.6, ENV_Y + 0.2, z * 1.9);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.add(new THREE.LineSegments(lg, CABLE));

  const flameGeo = new THREE.ConeGeometry(0.28, 1.6, 10, 1, true);
  flameGeo.translate(0, 0.8, 0);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({
    color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  flame.position.y = 2.45;
  g.add(flame);
  const glow = glowSprite(0xff9a3c, 5);
  glow.position.y = 3.4;
  g.add(glow);
  g.userData = { envMat, flame, glow, owned: [env.geometry, envMat, basket.geometry, rim.geometry, burner.geometry, lg, flameGeo, flame.material, glow.material] };
  return g;
}

// A balloon for the load-time warm-up (scene3d.js queueWarmup): its programs
// otherwise link on the frame the first balloon appears (0.4 s on an M1).
// The materials are kept, so the programs stay alive between balloons.
export function buildBalloonWarmup() {
  const g = buildBalloon({ seed: 7 });
  g.traverse((o) => { if (o.material) o.material.userData.shared = true; });
  return g;
}

// --- per-frame sync -------------------------------------------------------

let root = null, padMesh = null, heliMesh = null, beam = null, dust = null;
const balloonMeshes = new Map();
const _v = new THREE.Vector3(), _q = new THREE.Vector3();

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function blink(t, period, on, phase = 0) {
  return ((t + phase) % period) < on ? 1 : 0;
}

function updateHeli3D(world, pad, dt) {
  const h = world.skyHeli;
  if (!h) {
    if (heliMesh) heliMesh.visible = false;
    beam.beam.visible = beam.spot.visible = false;
    dust.visible = false;
    return;
  }
  if (!heliMesh) { heliMesh = buildHeli(); root.add(heliMesh); }
  const m = heliMesh, ud = m.userData;
  m.visible = true;
  m.position.set(h.x, h.z, h.y);
  m.rotation.set(h.bank, -h.heading, h.pitch, 'YZX');
  h.rotorAngle = (h.rotorAngle + dt * HELI_RPM * h.rotor) % (Math.PI * 2);
  ud.rotor.rotation.y = h.rotorAngle;
  ud.tailRotor.rotation.z = h.rotorAngle * 4.3;
  ud.disc.material.opacity = Math.max(0, h.rotor - 0.35) * 0.28;
  ud.disc.rotation.z = h.rotorAngle;

  const night = world.dayNight ? world.dayNight.night : 0;
  const t = world.time, L = ud.lights, on = h.rotor > 0.05 || !h.parked;
  const vis = 0.35 + night * 0.9;
  const setL = (s, k) => { s.visible = k > 0.01; s.material.opacity = Math.min(1, k); s.scale.setScalar(s.userData.size * (0.55 + 0.6 * night)); };
  setL(L.beaconTop, on ? blink(t, 1.1, 0.12) * vis : 0);
  setL(L.beaconBelly, on ? blink(t, 1.1, 0.12, 0.55) * vis : 0);
  setL(L.strobe, on ? (blink(t, 1.4, 0.06) + blink(t, 1.4, 0.06, 1.25)) * vis : 0);
  setL(L.navL, on ? night * 0.9 : 0);
  setL(L.navR, on ? night * 0.9 : 0);
  setL(L.land, h.searchlight * 0.95);

  // searchlight from under the nose onto the pad
  const sl = h.searchlight;
  beam.beam.visible = beam.spot.visible = sl > 0.02;
  if (sl > 0.02) {
    L.land.getWorldPosition(_v);
    // down-forward at ~35 degrees, swinging onto the pad on short final
    const reach = Math.max(4, h.z) / Math.tan(0.6);
    const k = smoothstep(230, 110, Math.hypot(h.x - pad.x, h.y - pad.y));
    const tx = h.x + Math.cos(h.heading) * reach, ty = h.y + Math.sin(h.heading) * reach;
    const ty3 = 0.08 + (pad.deck + 0.06 - 0.08) * k;
    _q.set(tx + (pad.x - tx) * k, ty3, ty + (pad.y - ty) * k);
    const len = _v.distanceTo(_q);
    const spread = 0.075;
    beam.beam.position.copy(_v);
    beam.beam.lookAt(_q);
    beam.beam.scale.set(len * spread, len * spread, len);
    beam.beam.material.uniforms.uOpacity.value = 0.2 * sl;
    beam.spot.position.set(_q.x, ty3, _q.z);
    beam.spot.scale.setScalar(Math.max(2.5, len * spread * 1.2));
    beam.spot.material.opacity = 0.2 * sl * Math.min(1, 70 / len);
    requestSearchlight(_v.x, _v.y, _v.z, _q.x, _q.y, _q.z, len * spread * 1.2, sl * smoothstep(260, 140, Math.hypot(h.x - hoofdspeler(world).x, h.y - hoofdspeler(world).y)));
  }
  updateDust(h, dt);
}

function updateDust(h, dt) {
  const ud = dust.userData;
  const pos = dust.geometry.attributes.position.array, col = dust.geometry.attributes.color.array;
  let alive = false;
  if (h.downwash > 0.02 && dt > 0) {
    ud.acc += dt * 30 * h.downwash;
    while (ud.acc >= 1) {
      ud.acc -= 1;
      const i = ud.next;
      ud.next = (ud.next + 1) % DUST_N;
      const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * 2.5;
      pos[i * 3] = h.x + Math.cos(a) * rr; pos[i * 3 + 1] = h.groundZ + 0.3; pos[i * 3 + 2] = h.y + Math.sin(a) * rr;
      const sp = (4 + Math.random() * 4) * (0.5 + 0.5 * h.downwash);
      ud.vel[i * 3] = Math.cos(a) * sp; ud.vel[i * 3 + 1] = 0.3 + Math.random() * 0.8; ud.vel[i * 3 + 2] = Math.sin(a) * sp;
      ud.life[i] = ud.max[i] = 1.1 + Math.random() * 1.1;
    }
  }
  for (let i = 0; i < DUST_N; i++) {
    if (ud.life[i] <= 0) { col[i * 4 + 3] = 0; continue; }
    alive = true;
    ud.life[i] -= dt;
    const k = Math.max(0, ud.life[i] / ud.max[i]);
    pos[i * 3] += ud.vel[i * 3] * dt; pos[i * 3 + 1] += ud.vel[i * 3 + 1] * dt; pos[i * 3 + 2] += ud.vel[i * 3 + 2] * dt;
    const drag = Math.max(0, 1 - dt * 1.2);
    ud.vel[i * 3] *= drag; ud.vel[i * 3 + 2] *= drag;
    col[i * 4] = 0.72; col[i * 4 + 1] = 0.68; col[i * 4 + 2] = 0.6; col[i * 4 + 3] = 0.3 * k * (1 - k) * 4 * 0.6;
  }
  dust.visible = alive;
  if (alive) {
    dust.geometry.attributes.position.needsUpdate = true;
    dust.geometry.attributes.color.needsUpdate = true;
  }
}

function updatePad3D(world, pad) {
  if (!padMesh) { padMesh = buildHelipad(pad); root.add(padMesh); }
  const night = world.dayNight ? world.dayNight.night : 0;
  const ud = padMesh.userData;
  ud.lights.material.opacity = 0.12 + night * 0.88;
  ud.lights.material.size = 0.6 + night * 0.8;
  if (ud.night !== night) {
    ud.night = night;
    for (const m of ud.marks) m.emissive.copy(m.color).multiplyScalar(0.3 * night);
  }
  if (ud.sock) {
    const w = world.weather || { windAngle: 0, intensity: 0 };
    const strength = Math.min(1, 0.4 + w.intensity * 0.8);
    const flutter = Math.sin(world.time * 5.3) * 0.05 + Math.sin(world.time * 8.9) * 0.03;
    const p = ud.sock.userData.pivot;
    p.rotation.y = -w.windAngle + pad.angle + flutter;
    ud.sock.userData.sock.rotation.z = -(1 - strength) * 1.1 - flutter * 0.5;
  }
}

function updateBalloons3D(world, dt) {
  const list = world.balloons || [];
  const night = world.dayNight ? world.dayNight.night : 0;
  const seen = new Set(list);
  for (const [b, mesh] of balloonMeshes) {
    if (seen.has(b)) continue;
    root.remove(mesh);
    for (const o of mesh.userData.owned) o.dispose();
    balloonMeshes.delete(b);
  }
  for (const b of list) {
    let m = balloonMeshes.get(b);
    if (!m) { m = buildBalloon(b); root.add(m); balloonMeshes.set(b, m); }
    m.position.set(b.x, b.z, b.y);
    m.rotation.y = b.yaw;
    const ud = m.userData;
    const flick = b.burn * (0.85 + 0.15 * Math.sin(world.time * 37 + b.seed) * Math.sin(world.time * 23));
    ud.flame.visible = ud.glow.visible = flick > 0.02;
    ud.flame.material.opacity = 0.85 * flick;
    ud.flame.scale.set(1, 0.6 + flick * 0.6, 1);
    ud.glow.material.opacity = flick * (0.4 + night * 0.6);
    ud.glow.scale.setScalar(3 + flick * 2 + night * 1.5);
    ud.envMat.emissive.setRGB(1, 0.5, 0.18).multiplyScalar(flick * (0.05 + night * 0.22));
  }
}

export function updateSkyProps3D(world, scene, animDt) {
  if (!scene || !world.map) return;
  if (!root) {
    root = new THREE.Group();
    root.name = 'skyprops';
    scene.add(root);
    const b = buildBeam();
    beam = b;
    root.add(b.beam, b.spot);
    dust = buildDust();
    root.add(dust);
  }
  const pad = helipadInfo(world.map);
  if (pad) {
    updatePad3D(world, pad);
    updateHeli3D(world, pad, animDt);
  }
  updateBalloons3D(world, animDt);
}
