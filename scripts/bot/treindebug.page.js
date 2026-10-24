// Meting: staat het treininterieur in beeld? (node scripts/bot/run.mjs --page=scripts/bot/treindebug.page.js --slot)
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot, world = B.world, player = B.player;
const RW = await imp('railway'), R3 = await imp('railway3d'), S3 = await imp('scene3d');
for (let i = 0; i < 400; i++) { const s = B.status(); if (s.blocking.cinematic || s.blocking.banner) { B.down(' '); await sleep(2300); B.up(' '); } else if (!s.blocking.loading && i > 5) break; await sleep(250); }
world.devInvuln = true;
world.wanted = 0;
let t = null;
for (let p = 0; p < 60 && !t; p++) { t = RW.getTrains().find((q) => (q.state === 'dwell' || q.state === 'parked') && !(q.route.stops[q.target] || {}).offmap); if (!t) await sleep(1000); }
const [cx, cy] = RW.routePoint(t.route, t.c);
player.x = cx; player.y = cy;
await sleep(6000);
t = RW.getTrains().find((q) => (q.state === 'parked' || q.state === 'dwell') && Math.hypot(...RW.routePoint(q.route, q.c).map((v, k) => v - (k ? cy : cx))) < 150) || t;
const [bx, by] = RW.routePoint(t.route, t.c + (t.halfLen - 3));
player.x = bx; player.y = by;
await sleep(500); await B.press('e'); await sleep(1500);
// overdag
const dag = () => { if (world.dayNight) { world.dayNight.hour = 12; world.dayNight.night = 0; } world.clock = 12; };
dag();
const out = { driving: !!world.trainDriving };
await B.press('c'); await sleep(1200); dag();
B.shot('dbg-A-cabine-dag');
await B.press('c'); await sleep(300);
await B.press('t'); await sleep(800); dag();
const walk = world.trainWalk;
out.walk = walk && { car: walk.car, lx: walk.lx, lz: walk.lz, yaw: walk.yaw };
walk.yaw = world.trainDriving.cab > 0 ? Math.PI : 0;
B.down('w'); await sleep(2500); B.up('w'); await sleep(500); dag();
B.shot('dbg-B-lopen-dag');
out.walk2 = { car: walk.car, lx: +walk.lx.toFixed(2), lz: +walk.lz.toFixed(2) };
const v = R3.getTrainViews().get(t);
const g = v.cars[walk.car];
const it = g.children.find((c) => c.userData.interieur);
const m = it.children[0];
// proef C: effen rood, een enkel materiaal
const old = m.material;
m.material = new old[0].constructor({ color: 0xff0000, side: 2 });
await sleep(1000); dag();
B.shot('dbg-C-rood');
m.material = old;
// proef E: het binnenste los aan de scene hangen met de pose van de wagen
{
  const sc = S3.getScene(), car = world.trainDriving.cars[walk.car];
  g.remove(it); sc.add(it);
  it.position.set(car.x, car.z || 0, car.y); it.rotation.order = 'YZX'; it.rotation.set(0, -car.angle, car.pitch || 0);
  out.carMat = Array.from(g.matrixWorld.elements).map((n) => +n.toFixed(2)); out.carVis = g.visible; out.gAuto = g.matrixWorldAutoUpdate; out.grpAuto = v.group.matrixWorldAutoUpdate; out.grpVis = v.group.visible; out.parentIsScene = v.group.parent === sc;
  await sleep(1000); dag();
  B.shot('dbg-E-los');
  sc.remove(it); g.add(it); it.position.set(0, 0, 0); it.rotation.set(0, 0, 0);
}
{
  const tt = world.trainDriving, mid = tt.cars[tt.cars.length >> 1];
  { let val = true; const stacks = []; Object.defineProperty(v.group, 'visible', { get: () => val, set: (x) => { if (!x && stacks.length < 2) stacks.push(new Error().stack.split('\n').slice(2, 5).join(' | ')); val = x; }, configurable: true }); v.group.visible = true; await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => requestAnimationFrame(r)); out.stacks = stacks; }
  out.sf = world.streamFocus && [world.streamFocus.x, world.streamFocus.y]; out.gw = String(tt.gastWeg); out.halfLen = tt.halfLen; out.vd = world.viewDist; out.co = String(world.cameraOverride);
  const samples = [];
  for (let i = 0; i < 12; i++) { samples.push(v.group.visible ? 1 : 0); await new Promise((r) => requestAnimationFrame(r)); }
  out.near = { gast: tt.gastWeg, mid: [mid.x, mid.y].map((n) => +n.toFixed(1)), pl: [player.x, player.y].map((n) => +n.toFixed(1)), samples: samples.join(''), sameT: R3.getTrainViews().has(tt), cnt: R3.getTrainViews().size, st: tt.state, vis: v.group.visible, shellVis: g.children.filter((c) => !c.userData.interieur).map((c) => c.visible ? 1 : 0).join('') };
}
// proef D: de geometrie van de schil in plaats van het binnenste
out.mesh = { vis: m.visible, tris: m.geometry.attributes.position.count, attrs: Object.keys(m.geometry.attributes), hasNaN: Array.from(m.geometry.attributes.position.array).some((n) => !Number.isFinite(n)), pos: m.geometry.attributes.position.array.slice(0, 9) };
const cam = S3.getCamera();
out.cam = [cam.position.x, cam.position.y, cam.position.z].map((n) => +n.toFixed(2));
out.eye = world.trainCam.eye && [world.trainCam.eye.position.x, world.trainCam.eye.position.y, world.trainCam.eye.position.z].map((n) => +n.toFixed(2));
return JSON.stringify({ result: 'KLAAR', reason: JSON.stringify(out) });
