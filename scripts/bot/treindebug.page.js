// Meting: staat het treininterieur in de scene? (node scripts/bot/run.mjs --page=scripts/bot/treindebug.page.js --slot)
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot, world = B.world, player = B.player;
const RW = await imp('railway'), R3 = await imp('railway3d');
for (let i = 0; i < 400; i++) { const s = B.status(); if (s.blocking.cinematic || s.blocking.banner) { B.down(' '); await sleep(2300); B.up(' '); } else if (!s.blocking.loading && i > 5) break; await sleep(250); }
world.devInvuln = true;
let t = null;
for (let p = 0; p < 60 && !t; p++) { t = RW.getTrains().find((q) => (q.state === 'dwell' || q.state === 'parked') && !(q.route.stops[q.target] || {}).offmap); if (!t) await sleep(1000); }
const [cx, cy] = RW.routePoint(t.route, t.c);
player.x = cx; player.y = cy;
await sleep(6000);
t = RW.getTrains().find((q) => (q.state === 'parked' || q.state === 'dwell') && Math.hypot(...RW.routePoint(q.route, q.c).map((v, k) => v - (k ? cy : cx))) < 150) || t;
const [bx, by] = RW.routePoint(t.route, t.c + (t.halfLen - 3));
player.x = bx; player.y = by;
await sleep(500); await B.press('e'); await sleep(1500);
await B.press('c'); await sleep(1500);
const views = R3.getTrainViews();
const v = views.get(t);
const out = { driving: !!world.trainDriving, inside: world.trainCam && world.trainCam.inside, eye: world.trainCam && world.trainCam.eye, hasView: !!v, tcFlag: v && v.tc };
if (v) {
  out.cars = v.cars.map((g) => ({ vis: g.visible, pos: [g.position.x, g.position.y, g.position.z].map((n) => +n.toFixed(1)), kids: g.children.map((c) => `${c.type}:${c.visible}:${c.userData.interieur ? 'INT' : ''}`).slice(-4) }));
  const g0 = v.cars[0];
  const it = g0.children.find((c) => c.userData.interieur);
  if (it) { const m = it.children[0]; out.intMesh = { vis: m.visible, tris: m.geometry.attributes.position.count, mats: Array.isArray(m.material) ? m.material.length : 1, parentVis: it.visible, groupVis: g0.visible }; }
}
const S3 = await imp('scene3d');
const cam = S3.getCamera();
out.cam = [cam.position.x, cam.position.y, cam.position.z].map((n) => +n.toFixed(2));
out.camNear = cam.near; out.camFar = cam.far;
if (v) {
  const g0 = v.cars[0];
  const it = g0.children.find((c) => c.userData.interieur);
  if (it) {
    const m = it.children[0];
    m.updateWorldMatrix(true, false);
    const e = m.matrixWorld.elements;
    out.worldPos = [e[12], e[13], e[14]].map((n) => +n.toFixed(2));
    m.geometry.computeBoundingBox();
    out.bbox = [m.geometry.boundingBox.min, m.geometry.boundingBox.max].map((b) => [b.x, b.y, b.z].map((n) => +n.toFixed(1)));
    out.sceneHas = (function f(o) { return o === m || o.children.some(f); })(S3.getScene());
    out.mat0 = { type: m.material[0].type, vc: m.material[0].vertexColors, vis: m.material[0].visible, col: m.material[0].color.getHexString() };
    out.layers = m.layers.mask; out.camLayers = cam.layers.mask;
    out.ro = m.renderOrder;
  }
}
// waar liggen punten van het binnenste in de camera?
{
  const g0 = v.cars[0];
  const it = g0.children.find((c) => c.userData.interieur);
  const m = it.children[0];
  const V3 = cam.position.constructor;
  cam.updateMatrixWorld(true);
  m.updateWorldMatrix(true, false);
  const probe = {};
  for (const [name, p] of Object.entries({ vloer: [7, 0.75, 0], dash: [8.4, 1.2, 0], plafond: [7, 3.2, 0], wand: [6, 1.5, 1.35] })) {
    const w = new V3(p[0], p[1], p[2]).applyMatrix4(m.matrixWorld);
    const c = w.clone().applyMatrix4(cam.matrixWorldInverse);
    const ndc = w.clone().project(cam);
    probe[name] = { world: [w.x, w.y, w.z].map((n) => +n.toFixed(1)), view: [c.x, c.y, c.z].map((n) => +n.toFixed(1)), ndc: [ndc.x, ndc.y, ndc.z].map((n) => +n.toFixed(2)) };
  }
  out.probe = probe;
  out.camMatrix = Array.from(cam.matrixWorld.elements).map((n) => +n.toFixed(2));
}
// proef: een gewone rode doos als kind van de wagen, vlak voor de ogen van de machinist, en een als kind van de scene
{
  const g0 = v.cars[0];
  const sh = g0.children.find((c) => !c.userData.interieur && c.isMesh);
  const M = sh.material.constructor;
  const mk = () => { const b = new sh.constructor(sh.geometry, new M({ color: 0xff0000 })); b.scale.set(0.02, 0.02, 0.02); return b; };
  const b1 = mk(); b1.scale.set(0.1, 0.1, 0.1); b1.position.set(8.4, 1.6, 0); b1.visible = true; g0.add(b1);
  const S = (await imp('scene3d')).getScene();
  const b2 = mk(); b2.scale.set(0.1, 0.1, 0.1); const eye = world.trainCam.eye.position; b2.position.set(eye.x - 3, eye.z, eye.y); S.add(b2);
  out.boxGeo = [sh.geometry.type, sh.geometry.parameters && [sh.geometry.parameters.width, sh.geometry.parameters.height, sh.geometry.parameters.depth]];
  await sleep(1200);
  B.shot('dbg-dozen');
  g0.remove(b1); S.remove(b2);
}
// van buiten kijken naar het binnenste: een vaste camera opzij van de cabinewagen (de override vastgezet tegen de cinematics)
{
  const car = t.cars[0], a = car.angle;
  const at = (lx, lz) => ({ x: car.x + lx * Math.cos(a) - lz * Math.sin(a), y: car.y + lx * Math.sin(a) + lz * Math.cos(a) });
  const pos = at(2, 10), look = at(2, 0);
  const pose = { position: { x: pos.x, y: pos.y, z: 6 }, lookAt: { x: look.x, y: look.y, z: 1.5 }, fov: 60, cut: true };
  Object.defineProperty(world, 'cameraOverride', { get: () => pose, set: () => {}, configurable: true });
  await sleep(1500);
  B.shot('dbg-buiten-op-binnenste');
  delete world.cameraOverride; world.cameraOverride = null;
}
// proef: de materialen van het binnenste vervangen door effen rood, dubbelzijdig
{
  const g0 = v.cars[0];
  const it = g0.children.find((c) => c.userData.interieur);
  const m = it.children[0];
  const M = m.material[0].constructor;
  const old = m.material;
  m.material = new M({ color: 0xff0000, side: 2 });
  await sleep(1200);
  B.shot('dbg-rood');
  // en weer: de schil terug
  for (const ch of g0.children) if (!ch.userData.interieur) ch.visible = true;
  it.visible = false;
  await sleep(800);
  B.shot('dbg-schil-terug');
  m.material = old; it.visible = true;
}
return JSON.stringify({ result: 'KLAAR', reason: JSON.stringify(out) });
