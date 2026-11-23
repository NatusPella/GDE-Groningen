// LOD's voor voertuigmodellen (eis eigenaar 23-11), naast de cabine-LOD van cabin3d.js. Elk voertuig met een romp krijgt bij het
// bouwen twee vereenvoudigde niveaus erbij (models3d_vehicles.js buildVehicleMesh roept attachVehicleLods aan):
//   niveau 0  het volle model (romp, deuren, naden, interieur, losse delen, wielen met spaken)
//   niveau 1  vanaf VOERTUIG_LOD[1].vanaf m: romp + dichte deuren + eenvoudige wielen in één mesh, zonder naden, interieur, losse delen
//   niveau 2  vanaf VOERTUIG_LOD[2].vanaf m: het silhouet van opzij in de hoofdkleur, met vier donkere wielen
// De afstanden staan in het centrale register (propregister.js VOERTUIG_LOD). De overgang is een dither (schermdeur, 4x4 Bayer):
// het nieuwe niveau komt pixel voor pixel binnen terwijl het oude in het complementaire patroon verdwijnt, in LOD_FADE_S seconden.
// De geometrie per niveau is gedeeld per romp (WeakMap op de rompgeometrie); materialen zijn per voertuig (dat waren ze al).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VOERTUIG_LOD } from './propregister.js';

export const LOD_FADE_S = 0.3;
const HYST = 4; // m: een niveau wisselt pas terug als je zoveel dichterbij bent dan de grens
const lodGeos = new WeakMap(); // rompgeometrie -> { l1, l2, tris0 }

// Puur: het niveau bij een afstand, met een drempel van HYST m terug (geen knipperen op de grens).
export function lodNiveau(afstand, vorige = 0, niveaus = VOERTUIG_LOD) {
  let n = 0;
  for (let i = 1; i < niveaus.length; i++) if (afstand >= niveaus[i].vanaf - (vorige >= i ? HYST : 0)) n = i;
  return n;
}

// --- dither in het materiaal -----------------------------------------------------------------------------------------------
const BAYER = 'float lodBayer(vec2 p){ int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y * 4;'
  + ' float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;'
  + ' for (int k = 0; k < 16; k++) if (k == i) return (m[k] + 0.5) / 16.0; return 0.5; }\n';
// mode 0 = geen dither; 1 = zichtbaar waar bayer < fade (binnenkomend); 2 = zichtbaar waar bayer >= fade (vertrekkend)
export function ditherMaterial(mat) {
  if (mat.userData.lodDither) return mat.userData.lodDither;
  const u = { uLodFade: { value: 1 }, uLodMode: { value: 0 } };
  const vorige = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    if (vorige) vorige(shader, r);
    shader.uniforms.uLodFade = u.uLodFade;
    shader.uniforms.uLodMode = u.uLodMode;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uLodFade; uniform float uLodMode;\n' + BAYER + 'void main() {\n  if (uLodMode > 0.5) { float lb = lodBayer(gl_FragCoord.xy); if (uLodMode < 1.5 ? lb >= uLodFade : lb < uLodFade) discard; }');
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + '|lodDither';
  mat.userData.lodDither = u;
  mat.needsUpdate = true;
  return u;
}

// --- geometrie per niveau ----------------------------------------------------------------------------------------------------
function trisOf(geo, matrix = null) {
  // niet-geïndexeerd met kleur en groepen (GeoBuilder): [{ a, b, c, rgb, group }]
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, c = g.attributes.color, out = [];
  if (!p) return out;
  const groepVan = (i) => { for (const gr of g.groups || []) if (i >= gr.start && i < gr.start + gr.count) return gr.materialIndex; return 0; };
  const v = new THREE.Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    const pts = [0, 1, 2].map((k) => { v.fromBufferAttribute(p, i + k); if (matrix) v.applyMatrix4(matrix); return [v.x, v.y, v.z]; });
    out.push({ pts, rgb: c ? [c.getX(i), c.getY(i), c.getZ(i)] : [0.5, 0.5, 0.5], group: groepVan(i) });
  }
  return out;
}
function build(tris, groepen = 3) {
  const per = Array.from({ length: groepen }, () => ({ p: [], c: [] }));
  for (const t of tris) { const G = per[Math.min(t.group, groepen - 1)]; for (const q of t.pts) { G.p.push(...q); G.c.push(...t.rgb); } }
  const g = new THREE.BufferGeometry(), P = [], C = [];
  let start = 0;
  per.forEach((G, i) => { if (!G.p.length) return; P.push(...G.p); C.push(...G.c); g.addGroup(start, G.p.length / 3, i); start += G.p.length / 3; });
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals();
  g.userData.shared = true;
  return g;
}
function eenvoudigWiel(w, parentInv) {
  // een achthoekige cilinder op de plek van het wiel, donker met een lichte velg-dop
  const m = new THREE.Matrix4().multiplyMatrices(parentInv, w.matrixWorld);
  const r = (w.geometry.boundingSphere || (w.geometry.computeBoundingSphere(), w.geometry.boundingSphere)).radius * 0.82;
  const cyl = new THREE.CylinderGeometry(r, r, 0.22, 8).rotateX(Math.PI / 2).toNonIndexed(); // CylinderGeometry is geïndexeerd
  const tris = [];
  const p = cyl.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) tris.push({ pts: [0, 1, 2].map((k) => { v.fromBufferAttribute(p, i + k).applyMatrix4(m); return [v.x, v.y, v.z]; }), rgb: [0.012, 0.012, 0.013], group: 0 });
  return tris;
}
function silhouet(tris, kleur) {
  // de hoogste punten per stuk lengte, van opzij gezien; dat profiel geëxtrudeerd over 92 % van de breedte
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const t of tris) for (const q of t.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2]); }
  const N = 10, top = new Array(N).fill(0.3);
  for (const t of tris) for (const q of t.pts) { const i = Math.min(N - 1, Math.max(0, Math.floor(((q[0] - x0) / (x1 - x0)) * N))); top[i] = Math.max(top[i], q[1]); }
  const shape = new THREE.Shape();
  shape.moveTo(x0, 0.3);
  for (let i = 0; i < N; i++) shape.lineTo(x0 + ((i + 0.5) / N) * (x1 - x0), top[i]);
  shape.lineTo(x1, 0.3);
  const breed = (z1 - z0) * 0.92;
  const g0 = new THREE.ExtrudeGeometry(shape, { depth: breed, bevelEnabled: false }).translate(0, 0, (z0 + z1) / 2 - breed / 2);
  const g = g0.index ? g0.toNonIndexed() : g0;
  const p = g.attributes.position, uit = [];
  for (let i = 0; i < p.count; i += 3) uit.push({ pts: [0, 1, 2].map((k) => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)]), rgb: kleur, group: 0 });
  // vier donkere wielblokken
  const wr = 0.32;
  for (const x of [x0 + (x1 - x0) * 0.2, x1 - (x1 - x0) * 0.2]) for (const z of [z0 + 0.05, z1 - 0.05]) {
    const b = new THREE.BoxGeometry(wr * 2, wr * 2, 0.2).translate(x, wr, z).toNonIndexed(), bp = b.attributes.position; // Box is geïndexeerd
    for (let i = 0; i < bp.count; i += 3) uit.push({ pts: [0, 1, 2].map((k) => [bp.getX(i + k), bp.getY(i + k), bp.getZ(i + k)]), rgb: [0.012, 0.012, 0.013], group: 0 });
  }
  return uit;
}
function hoofdkleur(tris) {
  const n = new Map();
  for (const t of tris) {
    if (t.group !== 0) continue;
    const [a, b, c] = t.pts, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const opp = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
    const k = t.rgb.map((x) => x.toFixed(3)).join(',');
    n.set(k, (n.get(k) || 0) + opp);
  }
  const best = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0].split(',').map(Number) : [0.5, 0.5, 0.5];
}

// Bouwt (of hergebruikt) de LOD-geometrie en hangt de twee niveaus aan het voertuig. null als er geen romp is.
export function attachVehicleLods(group) {
  const body = group.userData.body || group.children.find((c) => c.isMesh && Array.isArray(c.material));
  if (!body || !Array.isArray(body.material) || group.userData.lods) return null;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
  let set = lodGeos.get(body.geometry);
  if (!set) {
    const romp = trisOf(body.geometry);
    const extra = [];
    const dicht = group.userData.deurenDicht;
    if (dicht) extra.push(...trisOf(dicht.geometry));
    const wielen = [];
    for (const w of group.userData.wheels || []) wielen.push(...eenvoudigWiel(w, inv));
    // kleine en dunne driehoekjes (naden, handvatten, bouten, meters op het dashboard) vallen op 35 m weg
    const grof = (t) => { const [a, b, c] = t.pts, e = [[a, b], [b, c], [c, a]].map(([p, q]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const opp = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
      return opp >= 0.0006 && opp / Math.max(...e) >= 0.01; };
    const l1 = build([...romp, ...extra].filter(grof).concat(wielen));
    const l2 = build(silhouet([...romp, ...extra], hoofdkleur(romp)), 1);
    let tris0 = 0;
    group.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) tris0 += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    set = { l1, l2, tris0: Math.round(tris0) };
    lodGeos.set(body.geometry, set);
  }
  const mats = body.material;
  const m1 = new THREE.Mesh(set.l1, mats.map((m) => m.clone()));
  const m2 = new THREE.Mesh(set.l2, [mats[0].clone()]);
  for (const m of [m1, m2]) { m.visible = false; m.name = m === m1 ? 'lod1' : 'lod2'; m.castShadow = false; m.userData.noBatch = true; body.add(m); }
  group.userData.lods = { niveau: 0, doel: 0, fade: 1, body, mats, m1, m2, tris: [set.tris0, set.l1.attributes.position.count / 3, set.l2.attributes.position.count / 3] };
  return group.userData.lods;
}

// De delen van niveau 0 die bij een vereenvoudigd niveau verdwijnen (de romp zelf wordt onzichtbaar via zijn materiaal, zodat
// kinderen als de politielampen en de deur-rig blijven hangen).
function detailDelen(group) {
  const ud = group.userData, uit = [...(ud.wheels || [])];
  for (const k of ['deurenDicht', 'interieurSimpel']) if (ud[k]) uit.push(ud[k]);
  for (const c of ud.body ? ud.body.children : []) if (c.name === 'naden') uit.push(c);
  if (ud.loose) for (const p of Object.values(ud.loose)) if (p && p.isMesh) uit.push(p);
  return uit;
}
const ONZICHTBAAR = (() => { const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); m.userData.shared = true; return m; })();
function zetNiveau(group, lod, n) {
  const ud = group.userData;
  lod.body.material = n === 0 ? lod.mats : [ONZICHTBAAR, ONZICHTBAAR, ONZICHTBAAR];
  for (const d of detailDelen(group)) d.visible = n === 0 && (d !== ud.deurenDicht || !ud.doorRig);
  lod.m1.visible = n === 1;
  lod.m2.visible = n === 2;
}
function zetDither(mats, mode, fade) {
  for (const m of Array.isArray(mats) ? mats : [mats]) { const u = ditherMaterial(m); u.uLodMode.value = mode; u.uLodFade.value = fade; }
}
const objVan = (lod, n) => (n === 0 ? lod.mats : n === 1 ? lod.m1.material : lod.m2.material);

// Eén keer per frame: kies per voertuig het niveau bij de afstand tot de camera en laat de overgang lopen.
export function updateVehicleLods(meshes, cx, cy, cz, dt) {
  for (const group of meshes.values ? meshes.values() : meshes) {
    const lod = group.userData && group.userData.lods;
    if (!lod || !group.visible) continue;
    const p = group.position;
    const afstand = Math.hypot(p.x - cx, p.y - cy, p.z - cz);
    // een open deur of de cabine van dichtbij houdt het volle model
    const doel = group.userData.doorRig && group.userData.doorRig.group.visible && afstand < 40 ? 0 : lodNiveau(afstand, lod.niveau);
    if (doel !== lod.doel && lod.fade >= 1) { lod.van = lod.niveau; lod.doel = doel; lod.fade = 0; }
    if (lod.fade < 1) {
      lod.fade = Math.min(1, lod.fade + dt / LOD_FADE_S);
      // beide niveaus zichtbaar, in complementaire patronen
      zetNiveau(group, lod, lod.van);
      if (lod.doel === 0) { lod.body.material = lod.mats; for (const d of detailDelen(group)) d.visible = true; } else if (lod.doel === 1) lod.m1.visible = true; else lod.m2.visible = true;
      zetDither(objVan(lod, lod.van), 2, lod.fade);
      zetDither(objVan(lod, lod.doel), 1, lod.fade);
      if (lod.fade >= 1) {
        lod.niveau = lod.doel;
        zetDither(objVan(lod, lod.van), 0, 1);
        zetDither(objVan(lod, lod.doel), 0, 1);
        zetNiveau(group, lod, lod.niveau);
      }
    }
  }
}

// Zet een voertuig direct op een niveau, zonder overgang (contactblad, tests, cutscenes die een vast beeld willen).
export function zetLodNiveau(group, n) {
  const lod = group.userData && group.userData.lods;
  if (!lod) return;
  lod.niveau = lod.doel = n;
  lod.fade = 1;
  zetNiveau(group, lod, n);
}
