// Buiten beeld, buiten het werk: voertuigen, mensen, dieren en vaste groepen die buiten het
// zicht (plus het bereik van hun schaduw) vallen, slaan het beeld over. Afgesplitst uit
// scene3d.js (#497), zonder inhoudelijke wijziging: dezelfde namen, dezelfde volgorde,
// dezelfde commentaren.
//
// De naad naar scene3d.js loopt via bindCullHost() in plaats van een import terug (zoals
// routeribbon3d.js en prewarm3d.js): scene, camera, de actorkaarten en de zonrichting komen
// na init3D binnen, dus er is geen modulecyclus.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { perfOff } from '../devflags.js';
import { actorShadowReach } from '../shadowsnap.js';

const host = { scene: null, cam: null, vehicleMeshes: null, pedMeshes: null, wildlifeMeshes: null, sunDir: null };
export function bindCullHost(h) { Object.assign(host, h); }

// Vehicles, people and animals are ~55% of the scene's nodes (each ~30 to 60),
// and three walks all of them every frame: the matrices, then the frustum test
// of every mesh, in the main pass and again in the shadow pass. Most of them
// are behind or beside the camera. Those out of the view (plus the reach of
// their shadow) sit the frame out as hidden groups, so skipHiddenMatrixWalk
// leaves their matrices alone too; they are shown again right after the render.
const _cullFrustum = new THREE.Frustum();
const _cullProj = new THREE.Matrix4();
const _cullSphere = new THREE.Sphere();
const _cullBox = new THREE.Box3();
const _cullPos = new THREE.Vector3();
export const culledActors = [];
function actorRadius(mesh) {
  // the farthest corner of the box at build time from the group's origin; cached
  _cullBox.setFromObject(mesh);
  _cullPos.copy(mesh.position);
  const b = _cullBox, p = _cullPos;
  const dx = Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x));
  const dy = Math.max(Math.abs(b.min.y - p.y), Math.abs(b.max.y - p.y));
  const dz = Math.max(Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z));
  return Math.hypot(dx, dy, dz) + 1.5;
}
function cullActorCache(cache, reach, kind) {
  for (const mesh of cache.values()) {
    if (!mesh.visible || mesh.parent !== host.scene) continue;
    const ud = mesh.userData;
    if (ud.cullR === undefined) ud.cullR = actorRadius(mesh);
    ud.cullKind = kind;
    _cullSphere.center.copy(mesh.position);
    _cullSphere.radius = ud.cullR + reach;
    if (_cullFrustum.intersectsSphere(_cullSphere)) {
      ud.offscreen = false;
      // what a seen actor keeps hidden (a driver's figure, lamps that are off, a holstered weapon) is not walked either
      const kids = mesh.children;
      for (let i = 0; i < kids.length; i++) kids[i].matrixWorldAutoUpdate = kids[i].visible;
      continue;
    }
    ud.offscreen = true;
    mesh.visible = false;
    culledActors.push(mesh);
  }
}
export function cullOffscreenActors() {
  if (perfOff('actoren')) return;
  host.cam.updateMatrixWorld();
  _cullProj.multiplyMatrices(host.cam.projectionMatrix, host.cam.matrixWorldInverse);
  _cullFrustum.setFromProjectionMatrix(_cullProj);
  const reach = actorShadowReach(host.sunDir);
  cullActorCache(host.vehicleMeshes, reach, 'voertuig');
  cullActorCache(host.pedMeshes, reach, 'persoon');
  cullActorCache(host.wildlifeMeshes, reach, 'dier');
  if (!perfOff('groepen')) cullOffscreenGroups();
  if (window.__perfVerify) verifyCull();
}
// the counters of route verify (scripts/perf/routes.js, kept on window): what was cut is looked at again with an exact box
// the box of what shows: nodes that are hidden (and what hangs on them) do not count, the root's own flag is the cull's
const _vbox = new THREE.Box3();
function expandVisible(o, box, root) {
  if (!root && !o.visible) return;
  o.updateWorldMatrix(false, false);
  const g = o.geometry;
  if (g && o.isMesh && o.layers.test(host.cam.layers)) {
    if (!g.boundingBox) g.computeBoundingBox();
    _vbox.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    box.union(_vbox);
  }
  for (let i = 0; i < o.children.length; i++) expandVisible(o.children[i], box, false);
}
// a group kept out of the shadow pass for lying outside the sun's shadow box: the exact box of its casters must lie outside it too
function expandCasters(o, box) {
  o.updateWorldMatrix(false, false);
  const g = o.geometry;
  if (g && o.isMesh && o.castShadow) {
    if (!g.boundingBox) g.computeBoundingBox();
    _vbox.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    box.union(_vbox);
  }
  for (let i = 0; i < o.children.length; i++) expandCasters(o.children[i], box);
}
export function verifyShadowBox(c, frustum) {
  const V = window.__perfVerify;
  V.boxChecked = (V.boxChecked || 0) + 1;
  _cullBox.makeEmpty();
  expandCasters(c, _cullBox);
  if (!_cullBox.isEmpty() && frustum.intersectsBox(_cullBox)) { V.boxBad = (V.boxBad || 0) + 1; if (V.bad.length < 12) V.bad.push(['schaduwbereik', c.name || c.type, Math.round(c.position.x), Math.round(c.position.z)]); }
}
function verifyCull() {
  const V = window.__perfVerify;
  if (!V) return;
  const sphere = new THREE.Sphere();
  for (const m of culledActors) {
    V.checked++;
    _cullBox.makeEmpty();
    expandVisible(m, _cullBox, true);
    if (_cullBox.isEmpty()) continue;
    // an exact box against the camera's frustum, with no margin: nothing that shows may be cut
    if (_cullFrustum.intersectsBox(_cullBox)) {
      V.actors++;
      const k = m.userData.cullKind || '?';
      V.kinds[k] = (V.kinds[k] || 0) + 1;
      if (V.bad.length < 24) {
        const b = _cullBox, p = m.position;
        const r = Math.hypot(Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x)), Math.max(Math.abs(b.min.y - p.y), Math.abs(b.max.y - p.y)), Math.max(Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z)));
        let n = 0, hid = 0; m.traverse((o) => { n++; if (!o.visible) hid++; });
        V.bad.push(['actor', k, Math.round(p.x), Math.round(p.z), 'r', +r.toFixed(1), 'cullR', +m.userData.cullR.toFixed(1), 'schaal', +m.scale.x.toFixed(2), 'knopen', n, 'verborgen', hid, 'doos', [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((q) => +q.toFixed(1)).join('x'), Object.keys(m.userData).slice(0, 5).join('/')]);
      }
    }
  }
  for (const g of culledGroups) {
    V.checked++;
    _cullBox.makeEmpty();
    expandVisible(g, _cullBox, true);
    if (!_cullBox.isEmpty() && _cullFrustum.intersectsBox(_cullBox)) { V.groups++; if (V.bad.length < 12) V.bad.push(['group', g.name || g.type, Math.round(g.position.x), Math.round(g.position.z)]); }
  }
  void sphere;
}
export function restoreCulledActors() {
  for (let i = 0; i < culledActors.length; i++) culledActors[i].visible = true;
  culledActors.length = 0;
  for (let i = 0; i < culledGroups.length; i++) culledGroups[i].visible = true;
  culledGroups.length = 0;
}

// The same for the static groups at the top of the scene (a building, a landmark, a stretch of road, a
// water polygon: ~600 groups, a quarter of the nodes): a group whose nodes are all frozen (freezeStatic) and plain
// meshes has a fixed bounding sphere, worked out once (again when its number of children changes, and
// now and then), and sits the main pass out while it is outside the view. The shadow pass still walks
// it: a building behind the camera shadows the street in front of it (hookShadowPass).
const groupCull = new WeakMap();
export const culledGroups = [];
const GROUP_CULL_AGE = 300;
const GROUP_CULL_BUDGET_MS = 1;
// only the kinds that are final once built: a pooled effect that is frozen and moved by hand (fx3d.js) must never be cut by a stale sphere
const GROUP_CULL_NAMES = new Set(['building', 'landmark', 'road', 'water']);
function cullableGroup(o) {
  if (o.isLight || o.isCamera || o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh || o.isSkinnedMesh || o.matrixAutoUpdate) return false;
  if (o.isMesh && (o.frustumCulled === false || !o.geometry)) return false;
  for (let i = 0; i < o.children.length; i++) if (!cullableGroup(o.children[i])) return false;
  return true;
}
// The loose groups at the top of the scene without a name (the ticket machines of ~190 stations, street furniture, small props: ~900 of the
// ~3800 nodes projected a frame, 80% of them outside the view) keep matrixAutoUpdate on, so they are not final the way the named kinds are.
// One is cut only after two measurements, GROUP_CULL_AGE frames apart, saw the same local transforms (a sprite's bob is left out), and only
// while the group itself stands where it did; its sphere has a margin of LOOSE_MARGIN for what moves a little inside (?perfoff=losgroepen).
const LOOSE_MARGIN = 3;
function looseGroupOk(o, top) {
  if (o.isLight || o.isCamera || o.isPoints || o.isLine || o.isInstancedMesh || o.isSkinnedMesh || o.isBone) return false;
  if (o.isMesh && (o.frustumCulled === false || !o.geometry)) return false;
  if (!o.isSprite && Object.prototype.hasOwnProperty.call(o, 'onBeforeRender')) return false;
  if (top && o.userData.shadowCasters !== undefined) return false;
  for (let i = 0; i < o.children.length; i++) if (!looseGroupOk(o.children[i], false)) return false;
  return true;
}
function looseStamp(o) {
  let s = o.children.length * 1.37 + (o.visible ? 1 : 0.5);
  if (!o.isSprite) {
    const p = o.position, q = o.quaternion, c = o.scale;
    s += p.x * 1.1 + p.y * 1.3 + p.z * 1.7 + q.x * 2.1 + q.y * 2.3 + q.z * 2.9 + q.w * 3.1 + c.x * 0.7 + c.y * 0.9 + c.z * 1.1;
  }
  for (let i = 0; i < o.children.length; i++) s += looseStamp(o.children[i]) * 0.5;
  return s;
}
function groupCullInfo(c) {
  let k = groupCull.get(c);
  if (k && k.n === c.children.length && ++k.age <= GROUP_CULL_AGE) return k;
  if (!k) groupCull.set(c, k = { n: -1, age: 0, sphere: null, loose: c.name === '', stamp: NaN, stable: 0, at: null });
  k.n = c.children.length; k.age = 0; k.sphere = null;
  if (k.loose) {
    if (c.children.length && looseGroupOk(c, true)) {
      const st = looseStamp(c);
      k.stable = st === k.stamp ? k.stable + 1 : 0;
      k.stamp = st;
      if (k.stable >= 1) {
        c.updateWorldMatrix(true, true);
        _cullBox.makeEmpty();
        _cullBox.setFromObject(c);
        if (!_cullBox.isEmpty()) {
          k.sphere = _cullBox.getBoundingSphere(new THREE.Sphere());
          k.sphere.radius += LOOSE_MARGIN;
          k.at = [c.position.x, c.position.y, c.position.z, c.quaternion.y, c.scale.x];
        }
      }
    } else { k.stamp = NaN; k.stable = 0; }
    return k;
  }
  if (c.children.length && !c.userData.shadowCasters && cullableGroup(c)) {
    _cullBox.makeEmpty();
    _cullBox.setFromObject(c);
    if (!_cullBox.isEmpty()) { k.sphere = _cullBox.getBoundingSphere(new THREE.Sphere()); k.sphere.radius += 1; }
  }
  return k;
}
// the bounding sphere of a top-level group that is known and still right (the shape cullOffscreenGroups keeps), or null
export function knownGroupSphere(c) {
  const k = groupCull.get(c);
  if (!k || !k.sphere || k.n !== c.children.length) return null;
  if (k.loose && !(c.position.x === k.at[0] && c.position.y === k.at[1] && c.position.z === k.at[2] && c.quaternion.y === k.at[3] && c.scale.x === k.at[4])) return null;
  return k.sphere;
}
function cullOffscreenGroups() {
  const kids = host.scene.children;
  const deadline = performance.now() + GROUP_CULL_BUDGET_MS;
  let working = true;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (!c.visible || !(GROUP_CULL_NAMES.has(c.name) || (c.name === '' && c.isGroup && !perfOff('losgroepen')))) continue;
    let k = groupCull.get(c);
    if (!k || k.n !== c.children.length || k.age > GROUP_CULL_AGE) {
      // the groups are looked through a few at a time: one that is not known yet is drawn as before
      if (working && performance.now() < deadline) k = groupCullInfo(c); else { if (performance.now() >= deadline) working = false; continue; }
    } else k.age++;
    if (k.sphere && !_cullFrustum.intersectsSphere(k.sphere) && (!k.loose || (c.position.x === k.at[0] && c.position.y === k.at[1] && c.position.z === k.at[2] && c.quaternion.y === k.at[3] && c.scale.x === k.at[4]))) { c.visible = false; culledGroups.push(c); }
  }
}
