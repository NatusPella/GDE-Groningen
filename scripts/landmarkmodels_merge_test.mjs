// Het Martinitorenmodel (game/models/martinitoren.glb) komt binnen als 70 losse meshes; landmarkmodels.js voegt ze bij het laden
// samen tot één mesh per materiaal. Deze test parseert de echte GLB en toetst: zes meshes (draw calls) in plaats van 70, evenveel
// driehoeken, dezelfde omvang, eindige posities; en een gespiegeld onderdeel houdt zijn voorkant naar buiten.
//   node scripts/landmarkmodels_merge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { mergeByMaterial } = await import('../game/js/landmarkmodels.js');
const fails = [];
const buf = fs.readFileSync(new URL('../game/models/martinitoren.glb', import.meta.url));
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
const tris = (root) => { let n = 0, meshes = 0; root.traverse((o) => { if (o.isMesh) { meshes++; n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { n, meshes }; };
const before = tris(gltf.scene);
const box0 = new THREE.Box3().setFromObject(gltf.scene, true);
const merged = mergeByMaterial(gltf.scene);
const after = tris(merged);
const box1 = new THREE.Box3().setFromObject(merged, true);
console.log(`Martinitoren: ${before.meshes} meshes -> ${after.meshes}, ${before.n} -> ${after.n} driehoeken`);
if (after.meshes > 6) fails.push(`${after.meshes} meshes na samenvoegen (verwacht hoogstens 6)`);
if (after.n !== before.n) fails.push(`driehoeken ${before.n} -> ${after.n}`);
if (box0.min.distanceTo(box1.min) > 1e-3 || box0.max.distanceTo(box1.max) > 1e-3) fails.push('omvang veranderd');
merged.traverse((o) => { if (o.isMesh) for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) { fails.push('niet-eindige positie'); break; } });
// gespiegeld onderdeel: de normaal van de driehoek blijft naar buiten (+y) wijzen
const g = new THREE.Group();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial());
quad.scale.set(-1, 1, 1);
g.add(quad);
const m = mergeByMaterial(g).children[0].geometry.attributes.position;
const a = new THREE.Vector3().fromBufferAttribute(m, 0), b = new THREE.Vector3().fromBufferAttribute(m, 1), c = new THREE.Vector3().fromBufferAttribute(m, 2);
const nrm = b.sub(a).cross(c.sub(a));
if (!(nrm.y > 0)) fails.push('gespiegeld onderdeel keert zijn voorkant naar binnen');
for (const f of fails) console.log('FAIL', f);
console.log(fails.length ? `${fails.length} fouten` : 'ok');
process.exit(fails.length ? 1 : 0);
