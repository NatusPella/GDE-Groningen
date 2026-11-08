// #497: de blobschaduw-pool die uit scene3d.js is getild (scene/blobschaduw.js), met een nep-THREE als
// host: deelt de geometrie/materialen, maakt de pool en vult de instanced matrices uit de scène.
//   node scripts/blobschaduw_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from '../game/js/scene/blobschaduw.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

function nepTHREE() {
  let texture = null, geo = null, mat = null;
  class Layers { set(n) { this.layer = n; } }
  class Obj {
    constructor() { this.position = { set: (x, y, z) => { this.pos = [x, y, z]; } }; this.scale = { set: (x, y, z) => { this.sch = [x, y, z]; } }; this.layers = new Layers(); this.userData = {}; this.visible = true; this.parent = null; this.children = []; }
    add(o) { o.parent = this; this.children.push(o); }
  }
  class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; this.matrixWorld = { toArray: (arr, o) => { arr[o] = 1; } }; } }
  class PlaneGeometry { constructor(w, h) { this.w = w; this.h = h; geo = this; } rotateX() { this.rot = true; return this; } }
  class MeshBasicMaterial { constructor(o) { Object.assign(this, o); mat = this; } }
  class CanvasTexture { constructor(c) { this.canvas = c; texture = this; } }
  class InstancedMesh extends Obj {
    constructor(g, m, cap) { super(); this.geometry = g; this.material = m; this.cap = cap; this.count = 0; this.instanceMatrix = { array: new Float32Array(cap * 16), needsUpdate: false, setUsage(u) { this.usage = u; } }; }
  }
  return { THREE: { PlaneGeometry, MeshBasicMaterial, CanvasTexture, Mesh, InstancedMesh, DynamicDrawUsage: 'dynamic' }, geo: () => geo, mat: () => mat, texture: () => texture };
}
function nepCanvas(w = 64, h = 64) {
  return { width: w, height: h, getContext() { return { createRadialGradient: () => ({ addColorStop() {} }), fillStyle: '', fillRect() {} }; } };
}

const scene = { children: [], add(o) { o.parent = this; this.children.push(o); } };
const gedeeld = { geo: [], mat: [] };
const T = nepTHREE();
B.setBlobHost({ THREE: T.THREE, get scene() { return scene; }, addShared: (g, m) => { gedeeld.geo.push(g); gedeeld.mat.push(m); }, maakCanvas: nepCanvas });

t('#497: addBlobShadow maakt één gedeelde geometrie en materiaal en zet de schaduw op zijn plek', () => {
  const parent = new T.THREE.Mesh(null, null);
  const sh = B.addBlobShadow(parent, 2, 3, 0.5);
  assert.deepEqual(sh.pos, [0.5, 0.02, 0]);
  assert.deepEqual(sh.sch, [2, 1, 3]);
  assert.equal(sh.renderOrder, 1);
  assert.equal(parent.userData.shadow, sh);
  assert.equal(parent.children[0], sh);
  assert.equal(gedeeld.geo.length, 1, 'één gedeelde geometrie');
  assert.equal(gedeeld.mat.length, 1, 'één gedeeld materiaal');
  assert.ok(T.geo().rot, 'de plak ligt plat (rotateX)');
  assert.ok(T.mat().transparent && T.mat().polygonOffset && T.mat().polygonOffsetFactor === -10);
  assert.equal(T.mat().map.canvas.width, 64);
});

t('#497: initBlobPool maakt één InstancedMesh en is idempotent', () => {
  const p1 = B.initBlobPool(), p2 = B.initBlobPool();
  assert.equal(p1, p2);
  assert.equal(scene.children.includes(p1), true, 'de pool staat in de scène');
  assert.equal(p1.frustumCulled, false);
  assert.equal(p1.count, 0);
  assert.equal(p1.instanceMatrix.usage, 'dynamic');
  assert.equal(p1.userData.shared, true);
  assert.equal(typeof p1.onBeforeRender, 'function');
  assert.equal(B.blobPoolGrootte(), 768);
});

t('#497: fillBlobPool legt de zichtbare schaduwen in de instanced matrix en verbergt ze op de renderlaag', () => {
  const parent = new T.THREE.Mesh(null, null);
  scene.add(parent);
  const sh = B.addBlobShadow(parent, 2, 3);
  B.fillBlobPool();
  assert.equal(sh.layers.layer, 30, 'de schaduw gaat naar de verborgen laag');
  const pool = scene.children.find((c) => c.name === 'blob-instances');
  assert.equal(pool.count, 1);
  assert.equal(pool.instanceMatrix.array[0], 1, 'de wereldmatrix is overgenomen');
  assert.equal(pool.instanceMatrix.needsUpdate, true);
  parent.visible = false;
  B.fillBlobPool();
  assert.equal(pool.count, 0, 'een verborgen ouder telt niet mee');
  assert.equal(sh.layers.layer, 30, 'een verborgen schaduw blijft op de verborgen laag (niet getekend)');
});

t('#497: de A/B-schakelaar zet de pool uit en de schaduwen terug op de gewone laag', () => {
  const pool = scene.children.find((c) => c.name === 'blob-instances');
  B.zetBlobPool(false);
  B.fillBlobPool();
  assert.equal(pool.count, 0);
  const sh = scene.children.find((c) => c.userData && c.userData.shadow).userData.shadow;
  assert.equal(sh.layers.layer, 0);
  B.zetBlobPool(true);
});

t('#497: scene3d.js gebruikt de module, met de scène als getter, en heeft geen tweede kopie', () => {
  const s = bron('scene3d.js');
  assert.match(s, /from '\.\/scene\/blobschaduw\.js'/);
  assert.match(s, /get scene\(\) \{ return scene; \}/, 'de host leest de scène pas als init3D hem zet');
  assert.match(s, /setBlobPool: \(on\) => \{ zetBlobPool\(on\); \}/);
  assert.doesNotMatch(s, /function addBlobShadow\(/);
  assert.doesNotMatch(s, /function initBlobPool\(/);
  assert.doesNotMatch(s, /const BLOB_SHADOW_GEO/);
  // De drie doesNotMatch-checks hierboven zijn de echte structurele bewaking (geen
  // tweede kopie van de blobschaduwcode); de regelteller is alleen een groeigrens.
  // De basis (4144 regels) had maar 16 regels marge en de bugfixronde #748-#796
  // voegde er ~77 toe (29 bomen, 48 scenegeheugen), dus de grens staat ruimer.
  assert.ok(s.split('\n').length < 4300, 'scene3d.js is korter dan 4300 regels');
});

console.log(`blobschaduw_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
