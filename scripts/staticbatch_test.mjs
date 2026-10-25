// node scripts/staticbatch_test.mjs: the static batchers (game/js/staticbatch3d.js) without a GL
// context: a cell merged per material into the multi-draw pool, the matrices of a merged cell
// static, the pool drawing only the cells inside the view, a cell let go when its building leaves
// the detail radius, is hidden or has its geometry changed, the per-frame budget, and the
// dev/benchmark counter of draws and CPU time (gfxprofile.js).
import './node3d.mjs';

const THREE = await import('three');
const { createStaticBatcher, drawHub, mergeAtOnce } = await import('../game/js/staticbatch3d.js');
const { noteFrame, noteBatchWork, perfSnapshot, resetPerfCounter, perfCounterOn } = await import('../game/js/gfxprofile.js');

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// --- a little city ---------------------------------------------------------
const scene = new THREE.Scene();
const meshes = new Map();
const hidden = new Set();
const geo = new THREE.BoxGeometry(2, 3, 2);
const wall = new THREE.MeshStandardMaterial({ color: 0x9a6b4a });
const roof = new THREE.MeshStandardMaterial({ color: 0x6b3a2a });
const glass = new THREE.MeshStandardMaterial({ color: 0x224466 });
glass.transparent = true; // never merged

function building(x, y) {
  const b = { bounds: [x - 3, y - 3, x + 3, y + 3] };
  const mesh = new THREE.Group();
  mesh.position.set(x, 0, y);
  mesh.name = 'building';
  mesh.add(new THREE.Mesh(geo, wall));
  const r = new THREE.Mesh(geo, roof);
  r.position.y = 3;
  mesh.add(r);
  const g = new THREE.Mesh(geo, glass);
  g.position.y = 6;
  mesh.add(g);
  scene.add(mesh);
  meshes.set(b, mesh);
  return b;
}

// two 48 m cells of three buildings each
const items = [];
for (const [x, y] of [[0, 0], [10, 0], [20, 0], [60, 0], [70, 0], [80, 0]]) items.push(building(x, y));
scene.updateMatrixWorld(true);

const ctx = (px = 10, py = 0, over = {}) => ({
  scene, meshes, hidden, px, py, detailR: 190, drawDist: 900, withDetail: true, budgetMs: 50, ...over,
});
const makeBatcher = (name, more = {}) => createStaticBatcher({
  name, bake: true,
  eligible: (b, mesh) => !b.landmark && mesh.position.y === 0,
  valid: (b, mesh, c, dist) => dist(b) <= c.detailR - 1,
  ...more,
});
const run = (batcher, n = 30, over) => { for (let i = 0; i < n; i++) batcher.update(ctx(10, 0, over)); };
const hiddenParts = () => [...meshes.values()].flatMap((m) => m.children).filter((c) => !c.visible).length;

resetPerfCounter();

const batcher = makeBatcher('test-batch');
run(batcher, 40);
const info = batcher.info();
ok('the buildings of a cell are merged', info.merged >= 2, `merged ${info.merged}`);
ok('both 48 m cells are merged', info.merged === 2, JSON.stringify(info.detail.slice(0, 3)));
ok('the parts of a merged building are hidden', hiddenParts() === 12, String(hiddenParts()));
ok('the transparent part stays out of the batch', hiddenParts() === 12);

// one bucket per kind of material (colours that only differ are baked into one) instead of one per building
const pool = [...drawHub.pools.values()].find((p) => p.live > 0);
ok('the merged cells went into the multi-draw pool', !!pool && pool.live === 2, pool ? `live ${pool.live}` : 'no pool');
ok('the pool holds one batch material for wall and roof', drawHub.pools.size === 1, String(drawHub.pools.size));
ok('a pooled cell adds no node of its own', !scene.children.some((c) => c.isGroup && c.name.endsWith('es') && c.children.length));
ok('the batcher counts the draw slots it holds', info.slots === 2, String(info.slots));
const root = scene.children.find((c) => c.isGroup && c.name.endsWith('es'));
ok('the batch root keeps its matrix outside the scene walk', !!root && root.matrixAutoUpdate === false && root.matrixWorldAutoUpdate === false);

// --- what is outside the view is not drawn ---------------------------------
const cam = new THREE.PerspectiveCamera(60, 1.6, 0.5, 2000);
cam.position.set(10, 40, -60);
cam.lookAt(10, 0, 20);
cam.updateMatrixWorld();
pool.select(cam);
const inView = pool._multiDrawCount;
cam.lookAt(10, 0, -300); // turned around: the cells are behind the camera
cam.updateMatrixWorld();
pool.select(cam);
ok('the cells in front of the camera are drawn', inView === 2, String(inView));
ok('a cell wholly outside the view is not drawn', pool._multiDrawCount === 0, String(pool._multiDrawCount));

// --- a cell lets go --------------------------------------------------------
// its geometry changed in place (a knocked-out crash barrier)
meshes.get(items[0]).children[0].geometry.userData.batchVer = 1;
run(batcher, 10);
ok('a changed geometry lets its cell go', batcher.info().merged === 1, String(batcher.info().merged));
ok('and its parts are visible again', hiddenParts() === 6, String(hiddenParts()));
meshes.get(items[0]).children[0].geometry.userData.batchVer = 0;

run(batcher, 40);
ok('the cell is merged again after the change', batcher.info().merged === 2, String(batcher.info().merged));
hidden.add(items[1]);
run(batcher, 10);
const hiddenMesh = meshes.get(items[1]);
ok('a hidden building leaves the batch', hiddenMesh.children.every((c) => c.visible) && hiddenParts() === 10, JSON.stringify({ parts: hiddenParts(), own: hiddenMesh.children.map((c) => c.visible) }));
ok('the other buildings of its cell stay merged', batcher.info().merged === 2, String(batcher.info().merged));
hidden.clear();

run(batcher, 40);
ok('and it comes back when the building shows again', batcher.info().merged === 2, String(batcher.info().merged));
run(batcher, 10, { px: 1000, py: 1000 });
ok('a cell past the detail radius lets go', batcher.info().merged === 0, String(batcher.info().merged));
ok('its parts are visible again', hiddenParts() === 0, String(hiddenParts()));
ok('the pool has no cells left', [...drawHub.pools.values()].every((p) => p.live === 0));
ok('the batcher counts no draw slots', batcher.info().slots === 0, String(batcher.info().slots));

// a cell outside the detail radius is never merged, however long it runs
const buildsBefore = batcher.info().builds;
run(batcher, 20, { px: 1000, py: 1000 });
ok('nothing merges far outside the radius', batcher.info().merged === 0 && batcher.info().builds === buildsBefore, `${batcher.info().merged} ${batcher.info().builds}/${buildsBefore}`);

// --- the budget ------------------------------------------------------------
const slow = makeBatcher('test-budget');
for (let i = 0; i < 10; i++) slow.update(ctx(10, 0, { budgetMs: 0 }));
ok('without a budget a cell is started but not finished', slow.info().merged === 0 && !!slow.info().job, JSON.stringify({ merged: slow.info().merged, job: slow.info().job }));
run(slow, 40);
ok('and it finishes once there is budget', slow.info().merged === 2, String(slow.info().merged));
slow.clear();
ok('clear gives every building back', slow.info().merged === 0 && hiddenParts() === 0, `${slow.info().merged} ${hiddenParts()}`);

// --- a batcher without the pool draws loose meshes -------------------------
const loose = makeBatcher('test-loose', { pool: false });
const looseScene = new THREE.Scene();
const looseMeshes = new Map();
for (const [x, y] of [[200, 200], [210, 200], [220, 200]]) {
  const b = { bounds: [x - 3, y - 3, x + 3, y + 3] };
  const mesh = new THREE.Group();
  mesh.position.set(x, 0, y);
  mesh.add(new THREE.Mesh(geo, wall));
  mesh.add(new THREE.Mesh(geo, roof));
  looseScene.add(mesh);
  looseMeshes.set(b, mesh);
}
looseScene.updateMatrixWorld(true);
for (let i = 0; i < 30; i++) loose.update({ scene: looseScene, meshes: looseMeshes, hidden: null, px: 210, py: 200, detailR: 190, drawDist: 900, withDetail: true, budgetMs: 50 });
const looseGroup = looseScene.children.find((c) => c.isGroup && c.name.endsWith('es'));
ok('without the pool a cell is a mesh of its own', !!looseGroup && looseGroup.children.length >= 1, looseGroup ? String(looseGroup.children.length) : 'none');
ok('such a cell keeps its matrix out of the walk', !!looseGroup && looseGroup.matrixWorldAutoUpdate === false && looseGroup.children.every((m) => m.matrixAutoUpdate === false && m.matrixWorldAutoUpdate === false));
const before = looseGroup.children.map((m) => m.matrixWorld.elements.slice());
looseScene.updateMatrixWorld();
ok('and its matrix did not change', JSON.stringify(looseGroup.children.map((m) => m.matrixWorld.elements.slice())) === JSON.stringify(before));
ok('and it is counted as a draw slot', loose.info().slots >= 1, String(loose.info().slots));
loose.clear();

// --- mergeAtOnce (scripts/perf/geocheck) -----------------------------------
const atOnce = mergeAtOnce([...looseMeshes.entries()].map(([b, mesh]) => ({ b, mesh })), true);
ok('mergeAtOnce builds the same buckets in one call', atOnce.buckets.size >= 1 && [...atOnce.buckets.values()].every((bk) => bk.idx > 0));

// --- the counter (dev/benchmark) -------------------------------------------
delete globalThis.__gfxPerfAan;
ok('the counter is off for a player', !perfCounterOn());
resetPerfCounter();
noteBatchWork(5, 0.4);
noteFrame(16, 7);
ok('and it records nothing then', perfSnapshot() === null);

globalThis.__gfxPerfAan = true; // ?dev, ?benchmark and ?perf do the same, a run can set the window flag
ok('a dev run switches the counter on', perfCounterOn());
// a renderer that resets its counters per render, as three does: the frame sums them
const renderer = { info: { render: { calls: 0 } }, render(n) { this.info.render.calls = n; } };
globalThis.window.__scene3d = { renderer };
for (let f = 0; f < 40; f++) {
  batcher.update(ctx(10, 0));
  renderer.render(200 + f);
  renderer.render(2);
  noteFrame(16.7, 9.5);
}
const snap = perfSnapshot();
ok('the counter keeps a window of frames', snap && snap.frames === 40, snap ? String(snap.frames) : 'null');
ok('it adds up the draws of every render of the frame', snap.draws[39] === 241, String(snap.draws[39]));
ok('it reads the main-thread CPU time', snap.cpu[39] === 9.5, String(snap.cpu[39]));
ok('it counts the work of the static batches', snap.batchMeshes[39] > 0 && snap.batchMs[39] > 0, JSON.stringify({ meshes: snap.batchMeshes[39], ms: Math.round(snap.batchMs[39] * 1000) / 1000 }));
ok('and the averages are on window.__gfxPerf', globalThis.window.__gfxPerf && globalThis.window.__gfxPerf.frames === 40 && globalThis.window.__gfxPerf.avgDraws > 200,
  globalThis.window.__gfxPerf ? JSON.stringify({ frames: globalThis.window.__gfxPerf.frames, avgDraws: globalThis.window.__gfxPerf.avgDraws }) : 'none');
const again = perfSnapshot();
ok('a snapshot is a copy', again.draws !== snap.draws && again.draws[0] === snap.draws[0]);
resetPerfCounter();
ok('resetting stops it', perfSnapshot() === null);
globalThis.__gfxPerfAan = false;

process.exit(fail ? 1 : 0);
