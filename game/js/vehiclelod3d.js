// LOD's voor voertuigmodellen (eis eigenaar 23-11), aangesloten op het centrale LOD-systeem (docs/LOD-SYSTEEM-23-11.md): de opgave is
// die van de soort 'vehicle' in lodregistry.js (grenzen, band, weg, meeschalend met de stand via lodkit3d.js lodScale), de overgang
// is de DitherLOD van lod3d.js (zelfde lodChoice en hetzelfde 4x4-ditherpatroon als de rest van het spel), en elk gebouwd model komt
// in het register (registerLodModel) en dus in scripts/lod_audit_test.mjs. Naast de cabine-LOD van cabin3d.js.
//
// Wat hier voertuigspecifiek is, is de geometrie per niveau (models3d_vehicles.js buildVehicleMesh roept attachVehicleLods aan):
//   niveau 0  het volle model (romp, deuren met naden en interieur, losse delen, wielen met spaken)
//   niveau 1  romp + dichte deuren + eenvoudige wielen in één mesh, zonder naden, interieur, losse delen en kleine driehoekjes
//   niveau 2  het silhouet van opzij in de hoofdkleur met vier wielblokken
// De niveaus hangen onder de romp, dus ze hellen en veren mee. De delen van niveau 0 met een gedeeld materiaal (naden, interieur,
// wieldoppen) worden per object geschakeld (VoertuigLOD); de rest via de materialen per voertuig (DitherLOD).
// Boten krijgen hun LOD's in buildBoatMesh van het centrale systeem zelf (soort 'boat'), niet hier.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { DitherLOD } from './lod3d.js';
import { lodSpec, registerLodModel, LOD_KINDS } from './lodregistry.js';
import { lodScale } from './lodkit3d.js';
import { buildLodChainGroups, simplifyToTarget } from './lodsimplify.js';

const lodGeos = new WeakMap(); // rompgeometrie -> { l1, l2, tris }

// --- geometrie per niveau ----------------------------------------------------------------------------------------------------
function trisOf(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, c = g.attributes.color, out = [];
  if (!p) return out;
  const groepVan = (i) => { for (const gr of g.groups || []) if (i >= gr.start && i < gr.start + gr.count) return gr.materialIndex; return 0; };
  for (let i = 0; i + 2 < p.count; i += 3) {
    out.push({ pts: [0, 1, 2].map((k) => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)]), rgb: c ? [c.getX(i), c.getY(i), c.getZ(i)] : [0.5, 0.5, 0.5], group: groepVan(i) });
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
const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
function eenvoudigWiel(w, parentInv) {
  // een achthoekige cilinder op de plek van het wiel
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
  const N = 10, top = new Array(N).fill(0.3), zmax = new Array(N).fill(0);
  for (const t of tris) for (const q of t.pts) { const i = Math.min(N - 1, Math.max(0, Math.floor(((q[0] - x0) / (x1 - x0)) * N))); top[i] = Math.max(top[i], q[1]); zmax[i] = Math.max(zmax[i], Math.abs(q[2] - (z0 + z1) / 2)); }
  // de breedte van de romp: de mediaan van de breedste plek per stuk lengte, zodat spiegels (een bus) het blok niet breder maken
  const half = zmax.slice().sort((p, q) => p - q)[Math.floor(N / 2)];
  z0 = (z0 + z1) / 2 - half; z1 = z0 + half * 2;
  const shape = new THREE.Shape();
  shape.moveTo(x0, 0.3);
  for (let i = 0; i < N; i++) shape.lineTo(x0 + ((i + 0.5) / N) * (x1 - x0), top[i]);
  shape.lineTo(x1, 0.3);
  const breed = (z1 - z0) * 0.92;
  const g0 = new THREE.ExtrudeGeometry(shape, { depth: breed, bevelEnabled: false }).translate(0, 0, (z0 + z1) / 2 - breed / 2);
  const g = g0.index ? g0.toNonIndexed() : g0;
  const p = g.attributes.position, uit = [];
  for (let i = 0; i < p.count; i += 3) uit.push({ pts: [0, 1, 2].map((k) => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)]), rgb: kleur, group: 0 });
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
// kleine en dunne driehoekjes (naden, handvatten, bouten, meters op het dashboard) vallen op niveau 1 weg
function grof(t) {
  const [a, b, c] = t.pts, e = [[a, b], [b, c], [c, a]].map(([p, q]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const opp = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
  return opp >= 0.0006 && opp / Math.max(...e) >= 0.01;
}
// haalt niveau 1 de minCut van de soort niet (een klein model als de heli), dan vereenvoudigt het centrale systeem hem verder
// Niveau 1 van een zwaar model (24-11). Een model kan er drie meegeven; de volgorde als er meer dan een staat (docs/LOD-SYSTEEM-23-11.md,
// scripts/vehiclelod_volgorde_test.mjs): 1. group.userData.lodRomp (een eigen eenvoudig gebouwde romp: de bus, de trein; die is niveau 1),
// 2. group.userData.lodDoel (een bovengrens in driehoeken, simplifyToTarget van lodsimplify.js), 3. group.userData.lodMax (een bovengrens in
// driehoeken, de fijnste cel van het centrale systeem die eronder blijft). Een model zonder een van de drie volgt de minCut van de soort.
export function lod1Bron(ud) {
  const u = ud || {};
  if (u.lodRomp) return 'lodRomp';
  if (u.lodDoel > 0) return 'lodDoel';
  if (u.lodMax > 0) return 'lodMax';
  return null;
}
// doel: simplifyToTarget (kleine stappen in de celgrootte, silhouet bewaakt)
function totDoel(l1, doel) {
  const r = simplifyToTarget(l1.attributes.position.array, l1.attributes.color.array, l1.groups, doel);
  if (!r) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(r.geom.position, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(r.geom.color, 3));
  for (const x of r.groups) g.addGroup(x.start, x.count, x.materialIndex);
  g.computeVertexNormals();
  g.userData.shared = true;
  return g;
}
// max: de fijnste cel van het centrale systeem (lodsimplify) waarmee niveau 1 onder de grens komt: zo houdt het zoveel mogelijk van het silhouet
function totMax(l1, max) {
  const P0 = l1.attributes.position.array, C0 = l1.attributes.color.array;
  let best = null;
  for (const f of [0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.07, 0.085, 0.1, 0.12, 0.14]) {
    const { levels } = buildLodChainGroups({ position: P0, color: C0, index: null }, l1.groups, { minCut: [0.01], cells: [[f]] });
    const lv = levels[1];
    if (!lv) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(lv.geom.position, 3));
    if (lv.geom.color) g.setAttribute('color', new THREE.BufferAttribute(lv.geom.color, 3));
    for (const gr of lv.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.computeVertexNormals();
    g.userData.shared = true;
    best = g;
    if (triCount(g) <= max) break;
  }
  return best;
}
function genoegMinder(l1, t0, doel = 0, max = 0) {
  if (doel && triCount(l1) > doel) { const g = totDoel(l1, doel); if (g) return g; }
  else if (!doel && max && triCount(l1) > max) { const g = totMax(l1, max); if (g) return g; }
  const need = Math.max(LOD_KINDS.vehicle.minCut[0], doel ? 1 - doel / Math.max(1, triCount(l1)) : 0);
  if (1 - triCount(l1) / t0 >= need && (!doel || triCount(l1) <= doel)) return l1;
  const P = l1.attributes.position.array, C = l1.attributes.color.array;
  const { levels } = buildLodChainGroups({ position: P, color: C, index: null }, l1.groups, { minCut: [need, Math.max(LOD_KINDS.vehicle.minCut[1], need)] });
  for (const lv of levels.slice(1)) {
    const flat = lv.geom;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(flat.position, 3));
    if (flat.color) g.setAttribute('color', new THREE.BufferAttribute(flat.color, 3));
    for (const gr of lv.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.computeVertexNormals();
    g.userData.shared = true;
    if (1 - triCount(g) / t0 >= LOD_KINDS.vehicle.minCut[0] && (!doel || triCount(g) <= doel)) return g;
  }
  return l1;
}

// De delen van niveau 0 met een gedeeld materiaal (naden, interieur, wieldoppen): die schakelt VoertuigLOD per object.
function gedeeldeDelen(group) {
  const ud = group.userData, uit = [];
  if (ud.interieurSimpel) uit.push(ud.interieurSimpel);
  for (const c of ud.body ? ud.body.children : []) if (c.name === 'naden') uit.push(c);
  for (const w of ud.wheels || []) for (const c of w.children) if (c.isMesh) uit.push(c); // wieldoppen
  return uit;
}

// De DitherLOD van het centrale systeem, met de delen van niveau 0 die niet via een eigen materiaal te schakelen zijn.
class VoertuigLOD extends DitherLOD {
  constructor(spec, levels, delen) { super(spec, levels); this.delen = delen; this.syncDelen(); }
  update(camera, dist) {
    super.update(camera, dist);
    if (this.delen) this.syncDelen();
  }
  syncDelen() {
    // alleen wat deze LOD zelf verborg komt terug (een wieldop die bij eigen velgen al weg was, blijft weg)
    const c = this.choice, l0 = !c || c.a === 0 || c.b === 0;
    for (const d of this.delen) {
      if (l0) { if (d.userData.lodVerborgen) { d.visible = true; d.userData.lodVerborgen = false; } } else if (d.visible) { d.visible = false; d.userData.lodVerborgen = true; }
    }
  }
}

// Bouwt (of hergebruikt) de LOD-geometrie en hangt de niveaus aan het voertuig. null als er geen romp is.
export function attachVehicleLods(group, naam = 'voertuig') {
  const body = group.userData.body || group.children.find((c) => c.isMesh && Array.isArray(c.material));
  if (!body || !Array.isArray(body.material) || group.userData.lods) return null;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
  let set = lodGeos.get(body.geometry);
  if (!set) {
    // een voertuig met een eigen eenvoudig gebouwde romp (userData.lodRomp: de bus) gebruikt die voor niveau 1; anders de vereenvoudigde romp
    const eigen1 = group.userData.lodRomp ? trisOf(group.userData.lodRomp) : null;
    const romp = trisOf(body.geometry);
    const extra = group.userData.deurenDicht ? trisOf(group.userData.deurenDicht.geometry) : [];
    const wielen = [];
    for (const w of group.userData.wheels || []) wielen.push(...eenvoudigWiel(w, inv));
    let t0 = 0;
    group.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position && !o.name.startsWith('lod')) t0 += triCount(o.geometry); });
    const ud = group.userData; // lod1Bron: lodRomp, dan lodDoel, dan lodMax
    const l1 = eigen1 ? build(eigen1.concat(wielen)) : genoegMinder(build([...romp, ...extra].filter(grof).concat(wielen)), t0, ud.lodDoel || 0, ud.lodMax || 0);
    const l2 = build(silhouet([...romp, ...extra], hoofdkleur(romp)), 1);
    set = { l1, l2, tris: [Math.round(t0), triCount(l1), triCount(l2)] };
    lodGeos.set(body.geometry, set);
  }
  const mats = body.material;
  const m1 = new THREE.Mesh(set.l1, mats.map((m) => m.clone()));
  const m2 = new THREE.Mesh(set.l2, [mats[0].clone()]);
  for (const m of [m1, m2]) { m.name = m === m1 ? 'lod1' : 'lod2'; m.castShadow = false; m.userData.noBatch = true; body.add(m); }
  // niveau 0: alle materialen van dit voertuig (romp, glas, lampen; wielen en losse delen delen ze), behalve die van de lichtere niveaus
  const eigen = new Set();
  group.traverse((o) => { if (!o.isMesh || o === m1 || o === m2) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (mats.includes(m)) eigen.add(m); });
  const spec = lodSpec('vehicle', 3, lodScale());
  const lod = new VoertuigLOD(spec, [[...eigen], m1.material, m2.material], gedeeldeDelen(group));
  lod.name = 'lod:vehicle';
  group.add(lod);
  registerLodModel('vehicle', `${naam}:${set.tris[0]}`, set.tris);
  group.userData.lods = { lod, body, mats, m1, m2, tris: set.tris };
  return group.userData.lods;
}
// Zet een voertuig vast op een afstand (contactblad, tests): het niveau dat het centrale systeem daar kiest.
export function zetLodAfstand(group, d) {
  const l = group.userData && group.userData.lods;
  if (l) l.lod.update(null, d);
}
