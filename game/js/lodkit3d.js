// Het centrale LOD-systeem, three.js-kant (besluit eigenaar 23-11: alle modellen krijgen LOD's). Zie lodregistry.js voor de soorten,
// de afstanden en de audit, en lodsimplify.js voor de vereenvoudiging.
//
// API voor elke module die modellen bouwt:
//   makeLodGeometries(kind, name, geometry)         -> [LOD0, LOD1, LOD2...] (BufferGeometry), gecachet en geregistreerd
//   makeLodInstanced(kind, name, geometry, material, cap, { setup }) -> een set InstancedMeshes, één per niveau:
//        set.begin(); set.put(matrix, afstandTotSpeler); ...; set.end();   set.meshes: om aan de scène te hangen
//   makeLodObject(kind, name, object)               -> hangt naast elke mesh van `object` zijn lichtere niveaus; updateLodObjects(camera)
//                                                     (scene3d.js, elke frame) wisselt ze op afstand tot de camera
//   lodForSkinned(kind, name, skinnedMesh)          -> idem voor een gerigd model: LOD1+ zijn vaste meshes in de rustpose (geen botten)
//   setLodPreset(preset)                            -> de afstanden schalen met de grafische stand (gfxprofile.js-sleutels)
// Overgangen: een dither-crossfade op afstand tot de camera (het oude niveau dooft uit met hetzelfde 4x4-patroon waarmee het nieuwe
// opkomt: samen precies één beeld, geen gat en geen dubbel). Hysterese: de CPU deelt een instance in met marge (lodLevelsForFade), dus een
// model op de grens wisselt niet heen en weer; de shader bepaalt per pixel welk niveau zichtbaar is.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildLodChain, buildLodChainGroups, simplifyToTarget } from './lodsimplify.js';
import { LOD_KINDS, lodSpec, lodLevelsForFade, lodScaleFor, registerLodModel } from './lodregistry.js';
import { ensureViewPosition } from './shaderview.js';

let scale = 1;
const bands = new Map(); // `${kind}:${level}:${levels}` -> uniform { value: Vector4 }
export function setLodPreset(preset) {
  scale = lodScaleFor(preset);
  for (const [key, u] of bands) { const [kind, L, n] = key.split(':'); fillBand(u.value, kind, Number(L), Number(n)); }
}
export const lodScale = () => scale;

// De band van niveau L (van n), met de vensters van lodChoice (lodlevels.js): x..y waarin het opkomt (de band rond grens L-1), z..w waarin
// het uitdooft (de band rond grens L, of rond weg). Zelfde patroon en drempel als lod3d.js: het uitdovende niveau houdt bayer < 1 - t.
function fillBand(v, kind, L, n) {
  const s = lodSpec(kind, n, scale);
  const h = s.band / 2, g = s.grenzen;
  const inEdge = L > 0 ? g[L - 1] : null;
  const outEdge = L < g.length ? g[L] : s.weg != null ? s.weg : null;
  v.set(inEdge === null ? -2 : inEdge - h, inEdge === null ? -1 : inEdge + h, outEdge === null ? 1e9 : outEdge - h, outEdge === null ? 1e9 + 1 : outEdge + h);
}
function bandOf(kind, L, n) {
  const key = `${kind}:${L}:${n}`;
  let u = bands.get(key);
  if (!u) { u = { value: new THREE.Vector4() }; fillBand(u.value, kind, L, n); bands.set(key, u); }
  return u;
}

// --- geometrie -------------------------------------------------------------------------------------------------------------------
function plainOf(geometry) {
  const pos = geometry.getAttribute('position');
  const col = geometry.getAttribute('color');
  const P = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i); }
  let C = null;
  if (col) { C = new Float32Array(col.count * 3); for (let i = 0; i < col.count; i++) { C[i * 3] = col.getX(i); C[i * 3 + 1] = col.getY(i); C[i * 3 + 2] = col.getZ(i); } }
  const idx = geometry.getIndex();
  return { position: P, color: C, index: idx ? Uint32Array.from(idx.array) : null };
}
function geometryOf(plain) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(plain.position, 3));
  if (plain.color) g.setAttribute('color', new THREE.BufferAttribute(plain.color, 3));
  g.computeVertexNormals(); // niet geïndexeerd: vlakke normalen, de low-poly look
  g.computeBoundingSphere();
  return g;
}
export const trianglesOf = (g) => (g.index ? g.index.count / 3 : g.getAttribute('position').count / 3);

const chains = new Map(); // `${kind}:${name}` -> [BufferGeometry]
// minCutOverride (24-11): een zwaar model (een dubbeldekker) geeft zelf een snede per niveau op (mesh.userData.lodMinCut), voor de soort-standaard.
export function makeLodGeometries(kind, name, geometry, minCutOverride = null, doel = 0) {
  const key = `${kind}:${name}`;
  let geoms = chains.get(key);
  if (geoms) return geoms;
  const k = LOD_KINDS[kind];
  if (!k) throw new Error(`onbekende LOD-soort: ${kind}`);
  const want = Math.max(1, k.lod.grenzen.length); // zoveel lichtere niveaus vraagt de soort
  const minCut = minCutOverride ? minCutOverride.slice(0, want) : k.minCut.slice(0, want);
  if (geometry.groups && geometry.groups.length > 1) {
    // meerdere materialen (carrosserie, glas, lampen): per groep vereenvoudigd, de groepen blijven bestaan
    const { levels } = buildLodChainGroups(plainOf(geometry), geometry.groups, { minCut });
    // doel: niveau 1 dicht bij dat aantal driehoeken (simplifyToTarget) in plaats van de grove stap van de keten
    const p0 = plainOf(geometry), t1 = doel && simplifyToTarget(p0.position, p0.color, geometry.groups, doel);
    if (t1 && levels.length > 1) levels.splice(1, 1, { geom: t1.geom, groups: t1.groups, tris: t1.tris });
    geoms = [geometry, ...levels.slice(1).map((l) => { const gg = geometryOf(l.geom); for (const gr of l.groups) gg.addGroup(gr.start, gr.count, gr.materialIndex); return gg; })];
  } else {
    const { levels } = buildLodChain(plainOf(geometry), { minCut });
    const p1 = doel && plainOf(geometry), t1 = p1 && p1.position.length && simplifyToTarget(p1.position, p1.color || new Float32Array(p1.position.length), [{ start: 0, count: p1.position.length / 3, materialIndex: 0 }], doel);
    if (t1 && levels.length > 1) levels.splice(1, 1, { geom: t1.geom, tris: t1.tris, cell: 0 });
    geoms = [geometry, ...levels.slice(1).map((l) => geometryOf(l.geom))];
  }
  for (let L = 1; L < geoms.length; L++) geoms[L].userData.shared = true; // gedeeld tussen alle exemplaren: een eigenaar gooit hem niet weg
  chains.set(key, geoms);
  registerLodModel(kind, name, geoms.map(trianglesOf));
  return geoms;
}

// --- crossfade -------------------------------------------------------------------------------------------------------------------
const FADE_KEY = '|lodfade';
// Een kloon van `mat` die op niveau L van `kind` in- en uitdooft. Gedeelde klonen per (materiaal, soort, niveau): het programma is per
// materiaalsoort hetzelfde (de sleutel krijgt '|lodfade'), alleen de uniform verschilt.
const fadeMats = new WeakMap();
export function lodFadeMaterial(mat, kind, L, n) {
  let per = fadeMats.get(mat);
  if (!per) { per = new Map(); fadeMats.set(mat, per); }
  const key = `${kind}:${L}:${n}`;
  let m = per.get(key);
  if (m) return m;
  m = mat.clone();
  const band = bandOf(kind, L, n);
  const prev = mat.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(m, shader, r);
    shader.uniforms.uLodBand = band;
    ensureViewPosition(shader);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform vec4 uLodBand;
float lodBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float lodBayer4(vec2 a) { return lodBayer2(0.5 * a) * 0.25 + lodBayer2(a); }
void main() {
  float lodD = length(vViewPosition);
  float lodB = lodBayer4(gl_FragCoord.xy);
  float lodIn = clamp((lodD - uLodBand.x) / max(1e-3, uLodBand.y - uLodBand.x), 0.0, 1.0);
  float lodOut = 1.0 - clamp((lodD - uLodBand.z) / max(1e-3, uLodBand.w - uLodBand.z), 0.0, 1.0);
  if (lodB < 1.0 - lodIn || lodB >= lodOut) discard;`);
  };
  const base = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
  m.customProgramCacheKey = () => (base ? base() : '') + FADE_KEY;
  per.set(key, m);
  return m;
}

// --- instanced -------------------------------------------------------------------------------------------------------------------
export function makeLodInstanced(kind, name, geometry, material, cap, { setup = null } = {}) {
  const geoms = makeLodGeometries(kind, name, geometry);
  const meshes = geoms.map((g, L) => {
    const m = new THREE.InstancedMesh(g, geoms.length > 1 || LOD_KINDS[kind].lod.weg != null ? lodFadeMaterial(material, kind, L, geoms.length) : material, cap);
    m.count = 0;
    m.frustumCulled = false;
    m.name = `lod:${kind}:${name}:${L}`;
    m.userData.lodLevel = L;
    if (setup) setup(m, L);
    return m;
  });
  return {
    kind, name, meshes, cap,
    begin() { for (const m of meshes) m.count = 0; },
    // d: afstand tot de speler (m). Een instance in een crossfade-band komt in beide niveaus.
    put(matrix, d) {
      const ls = lodLevelsForFade(kind, d, { levels: meshes.length, scale });
      for (const L of ls) { const m = meshes[L]; if (m.count < cap) m.setMatrixAt(m.count++, matrix); }
      return ls.length > 0;
    },
    end() { for (const m of meshes) m.instanceMatrix.needsUpdate = true; },
    count() { return meshes.reduce((a, m) => a + m.count, 0); },
  };
}

// --- losse modellen --------------------------------------------------------------------------------------------------------------
const live = new Set();
const _wp = new THREE.Vector3();
function levelMeshes(kind, name, mesh, geometry) {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  // een mesh met een textuur of meerdere materialen: de clustering raakt de UV's kwijt, dus geen lichtere geometrie; wel de cull-afstand
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const plain = mats.every((x) => x && !x.map && !x.alphaMap && !x.normalMap);
  // zelfde naam, andere vorm (een variant, een langere boot): een eigen keten. Sleutel: aantal hoekpunten en de maten op 1 cm.
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bb = geometry.boundingBox, dim = (a, b) => Math.round((a - b) * 100);
  const key = `${name}:${geometry.getAttribute('position').count}:${dim(bb.max.x, bb.min.x)}x${dim(bb.max.y, bb.min.y)}x${dim(bb.max.z, bb.min.z)}`;
  const geoms = plain ? makeLodGeometries(kind, key, geometry, mesh.userData.lodMinCut || null, mesh.userData.lodDoel || 0) : (registerLodModel(kind, key + ':textuur', [trianglesOf(geometry)]), [geometry]);
  // een model dat zijn eigen eenvoudige niveau 1 meebrengt (userData.lodRomp, zelfde materiaalgroepen): dat vervangt de vereenvoudiging van de keten
  if (mesh.userData.lodRomp && geoms.length > 1) geoms[1] = mesh.userData.lodRomp;
  const out = [mesh];
  const fadeOf = (L) => (Array.isArray(mesh.material) ? mats.map((x) => lodFadeMaterial(x, kind, L, geoms.length)) : lodFadeMaterial(mat, kind, L, geoms.length));
  if (geoms.length > 1 || LOD_KINDS[kind].lod.weg != null) mesh.material = fadeOf(0);
  for (let L = 1; L < geoms.length; L++) {
    // een gerigd model: de lichtere niveaus zijn vaste meshes in de rustpose (botten zijn op afstand niet te zien);
    // three r160 leidt skinning af van het object (isSkinnedMesh), dus het materiaal kan gedeeld blijven
    const m = new THREE.Mesh(geoms[L], fadeOf(L));
    m.name = `lod:${kind}:${name}:${L}`;
    m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
    m.castShadow = mesh.castShadow; m.receiveShadow = mesh.receiveShadow;
    m.visible = false;
    if (mesh.parent) mesh.parent.add(m);
    out.push(m);
  }
  return out;
}
// object: een Object3D met (een of meer) meshes. Geeft het object terug; updateLodObjects schakelt de niveaus.
export function makeLodObject(kind, name, object) {
  const entries = [];
  const meshes = [];
  object.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && !o.name.startsWith('lod:')) meshes.push(o); });
  meshes.forEach((m, i) => { if (m.parent) entries.push(levelMeshes(kind, `${name}#${i}`, m, m.geometry)); });
  object.userData.lod = { kind, entries, level: 0 };
  live.add(object);
  return object;
}
export function lodForSkinned(kind, name, skinned) {
  const holder = skinned.parent || skinned;
  const entries = skinned.parent ? [levelMeshes(kind, name, skinned, skinned.geometry)] : [];
  holder.userData.lod = { kind, entries, level: 0 };
  live.add(holder);
  return holder;
}
export function releaseLodObject(object) { live.delete(object); }

// Elke frame (scene3d.js): per los model de afstand tot de camera en welke niveaus zichtbaar zijn (in de crossfade-band twee).
export function updateLodObjects(camera) {
  for (const o of live) {
    // niet meer in een scène (een trein die wegreed, een boot die verdween): uit de lijst
    let root = o;
    while (root.parent) root = root.parent;
    if (!root.isScene) { live.delete(o); continue; }
    if (!o.visible) continue;
    const lod = o.userData.lod;
    o.getWorldPosition(_wp);
    const d = _wp.distanceTo(camera.position);
    for (const levels of lod.entries) {
      const on = lodLevelsForFade(lod.kind, d, { levels: levels.length, scale, slack: 0 });
      for (let L = 0; L < levels.length; L++) levels[L].visible = on.includes(L);
    }
  }
}
export const lodObjectCount = () => live.size;
