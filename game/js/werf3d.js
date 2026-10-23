// Scheepswerf De Kielhaal in beeld (#398): de helling, het schip dat erop ligt en van de kade glijdt, de plons en de watertong
// die over de kade spoelt. Eén groep, alleen gebouwd zolang de speler in de buurt is (werflive.js bepaalt dat), met het schip uit
// de gedeelde, samengevoegde geometrie van models3d_vehicles.js (één tekenaanroep voor het hele schip). De tijdlijn en de golf
// komen uit werf.js; hier staat alleen wat bij het tekenen hoort. Geen geluid hier: dat doet werflive.js.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SCHIP, HELLING, WATERVLAK, N, KOERS, naarWereld, schipOp, golfDiepte, frontOp, GOLF, T_PLONS } from './werf.js';
import { buildShipMesh } from './models3d_vehicles.js';
import { BOAT_KINDS } from './boattypes.js';

const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const GRID_Q = 20, GRID_L = 26, L_HALF = 85;

let obj = null; // { group, schip, slede, golf, golfGeo, schuim, spuit, ringen, ground[] }

function bouw(scene, ground) {
  const group = new THREE.Group();
  const kade = naarWereld(0, 0);
  const g0 = ground(kade.x, kade.y);

  // De helling: een betonnen wig (hoogte HELLING.helling per meter landinwaarts) met stalen rails en dwarsbalken. De groep draait zo
  // dat lokaal +x landinwaarts is (-N) en +z langs de kade.
  const helling = new THREE.Group();
  helling.position.set(kade.x, g0, kade.y);
  helling.rotation.y = Math.atan2(N.y, -N.x);
  const shape = new THREE.Shape();
  shape.moveTo(-1, -0.4); shape.lineTo(HELLING.lengte, -0.4); shape.lineTo(HELLING.lengte, HELLING.helling * HELLING.lengte); shape.lineTo(0, 0); shape.closePath();
  const wig = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 112, bevelEnabled: false }), mat(0x8c8f91, { side: THREE.DoubleSide }));
  wig.position.z = -56;
  helling.add(wig);
  for (let l = -48; l <= 48; l += 12) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(HELLING.lengte + 1, 0.22, 0.5), mat(0x4a4d50));
    const hoek = Math.atan(HELLING.helling);
    rail.position.set(HELLING.lengte / 2, HELLING.helling * HELLING.lengte / 2 + 0.12, l);
    rail.rotation.z = hoek;
    helling.add(rail);
  }
  for (let q = 2; q < HELLING.lengte; q += 3.5) {
    const balk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 104), mat(0x6b5a44));
    balk.position.set(q, HELLING.helling * q + 0.05, 0);
    helling.add(balk);
  }
  group.add(helling);

  // Het schip (gedeelde geometrie) met zijn slede: balken onder de romp, alleen zolang het schip op de helling ligt.
  const schip = buildShipMesh({ id: -398, model: BOAT_KINDS[SCHIP.model], isBoat: true });
  schip.rotation.order = 'YXZ';
  const slede = new THREE.Group();
  for (let x = -34; x <= 34; x += 11.3) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, SCHIP.breedte * 0.8), mat(0x3d3f42));
    b.position.set(x, -SCHIP.kiel + 0.5, 0);
    slede.add(b);
  }
  schip.add(slede);
  group.add(schip);

  // De watertong over de kade: een raster in werfassen waarvan de hoogte per beeld volgt uit golfDiepte.
  const golfGeo = new THREE.PlaneGeometry(1, 1, GRID_Q, GRID_L);
  const pos = golfGeo.attributes.position, ground2 = new Float32Array(pos.count), qs = new Float32Array(pos.count), ls = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const ix = i % (GRID_Q + 1), iy = Math.floor(i / (GRID_Q + 1));
    const q = (ix / GRID_Q) * GOLF.reik, l = (iy / GRID_L - 0.5) * 2 * L_HALF;
    const w = naarWereld(l, q);
    qs[i] = q; ls[i] = l; ground2[i] = ground(w.x, w.y);
    pos.setXYZ(i, w.x, ground2[i] - 0.4, w.y);
  }
  golfGeo.computeVertexNormals();
  const golf = new THREE.Mesh(golfGeo, mat(0x3f8fb0, { transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
  golf.frustumCulled = false;
  group.add(golf);

  // Het schuim van het golffront, het opspattende water langs de romp en de kringen op het water.
  const schuim = new THREE.Mesh(new THREE.PlaneGeometry(2 * L_HALF * 0.8, 4), mat(0xf4fbff, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  schuim.rotation.order = 'YXZ';
  schuim.rotation.x = -Math.PI / 2;
  schuim.frustumCulled = false;
  group.add(schuim);
  const spuit = new THREE.Mesh(new THREE.PlaneGeometry(SCHIP.lengte * 0.9, 1), mat(0xe9f6ff, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  spuit.frustumCulled = false;
  group.add(spuit);
  const ringen = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), mat(0xeaf6ff, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    group.add(m);
    return m;
  });
  scene.add(group);
  return { group, schip, slede, golf, golfGeo, schuim, spuit, ringen, ground2, qs, ls, g0 };
}

function weg(scene) {
  if (!obj) return;
  scene.remove(obj.group);
  obj.group.traverse((o) => { if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose(); });
  obj = null;
}

// state: world.werf van werflive.js: { zichtbaar, u (seconden sinds het begin van de lancering, of null), schipWeg }
export function updateWerf3D(scene, state, ground) {
  if (!state || !state.zichtbaar) { weg(scene); return; }
  if (!obj) obj = bouw(scene, ground);
  const { schip, slede } = obj;
  const u = state.u == null ? 0 : state.u;
  const pose = schipOp(u);
  schip.visible = !state.schipWeg;
  const p = naarWereld(0, pose.q);
  schip.position.set(p.x, WATERVLAK + pose.dy, p.y);
  schip.rotation.y = -KOERS;
  schip.rotation.x = pose.rol;
  schip.rotation.z = pose.stamp;
  slede.visible = pose.fase === 'wacht' || pose.fase === 'glijdt' || (pose.fase === 'valt' && pose.dy > 3);

  // de golf: de hoogte van het raster volgt uit golfDiepte zolang ze loopt; daarna zakt het raster onder de grond
  const x = u - T_PLONS;
  const pos = obj.golfGeo.attributes.position;
  const loopt = state.u != null && x > 0 && x < 18;
  if (loopt || obj.golfActief) {
    for (let i = 0; i < pos.count; i++) {
      const d = loopt ? golfDiepte(obj.qs[i], obj.ls[i], x) : 0;
      const w = naarWereld(obj.ls[i], obj.qs[i]);
      // (waar de golf uitdooft zakt het raster zacht onder de grond: geen losse blauwe plakken)
      const f = Math.min(1, d / 0.3), glad = f * f * (3 - 2 * f);
      pos.setXYZ(i, w.x, obj.ground2[i] + 0.12 + d - 0.52 * (1 - glad), w.y);
    }
    pos.needsUpdate = true;
    obj.golfActief = loopt;
  }
  obj.golf.visible = loopt;

  // schuimrand op het front
  const f = frontOp(x);
  const sw = naarWereld(0, Math.min(f, GOLF.reik));
  obj.schuim.visible = x > 0 && f < GOLF.reik && state.u != null;
  obj.schuim.position.set(sw.x, obj.g0 + 0.2 + golfDiepte(Math.min(f, GOLF.reik) * 0.9, 0, x), sw.y);
  obj.schuim.rotation.y = Math.atan2(N.y, -N.x) + Math.PI / 2;
  obj.schuim.material.opacity = Math.max(0, 0.75 * (1 - x / 6));

  // het water dat langs de romp opspat bij de plons (x in 0 tot 4 s)
  const s = naarWereld(0, pose.q + (pose.rol > 0 ? -SCHIP.breedte * 0.5 : 0) - 1);
  obj.spuit.visible = state.u != null && x > -0.2 && x < 4.5;
  if (obj.spuit.visible) {
    const hoogte = Math.max(0.2, 11 * Math.sin(Math.min(1, Math.max(0, x + 0.2) / 1.6) * Math.PI * 0.5) * Math.max(0, 1 - x / 4.4));
    obj.spuit.scale.set(1, hoogte, 1);
    obj.spuit.position.set(s.x, WATERVLAK + hoogte / 2, s.y);
    obj.spuit.rotation.y = -KOERS;
    obj.spuit.material.opacity = 0.7 * Math.max(0, 1 - x / 4.5);
  }
  // kringen
  const m = naarWereld(0, -4);
  obj.ringen.forEach((r, i) => {
    const t = x - i * 0.7;
    r.visible = state.u != null && t > 0 && t < 7;
    if (!r.visible) return;
    const rad = 6 + 14 * t;
    r.scale.set(rad, rad, rad);
    r.position.set(m.x, WATERVLAK + 0.1 + i * 0.01, m.y);
    r.material.opacity = 0.6 * (1 - t / 7);
  });
}

