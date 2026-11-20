// Page half voor scripts/qa/mensen_beeld.mjs --page=modellen_beeld.page.js (desktop --perf-script body, #985): close-ups van Tammo en Tessa uit meerdere hoeken
// (voor, schuin, zij, achter, laag, hoog) in stand, tijdens het lopen en zittend (zoals in een auto), om gaten en clipping in het model te zien (muts zonder
// binnenkant, haar dat in het hoofd steekt, kraag, oren, handen). De figuren staan los van het spel, 6 m voor de speler; de camera is een cinematic-stand.
// window.__mensenOnly = ['tammo', 'tessa'] kiest personages, ['stand', 'loop', 'zit'] kiest standen. Opnamen: shots-<personage>-<stand>-<hoek>.png.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const raf = () => new Promise((r) => requestAnimationFrame(r));
const out = { fouten: [], opnamen: 0 };
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) { if (i % 30 === 5) await tap('Enter', 'Enter'); await sleep(100); }
const D = window.__debug, w = D && D.world, p = w && w.player;
if (!p) return JSON.stringify({ results: { modellen: { fouten: ['geen speler'] } } });
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 10 && cine.isCinematicActive(); i++) { key('keydown', ' ', 'Space'); await sleep(2500); key('keyup', ' ', 'Space'); await sleep(1500); }
await sleep(3000);
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); }
const sc = window.__scene3d;
const M = await import('/js/models3d_people.js');
const ONLY = window.__mensenOnly || [];
const ON = (id) => !ONLY.length || ONLY.includes(id);

// naar een open plek te voet (de opening begint op een boot): naast de dichtstbijzijnde voetganger
if (p.inVehicle) p.exitVehicle(w.map, w);
{
  const q = (w.pedestrians || []).filter((o) => o.state !== 'dead' && !o.isCop).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (q) { p.x = q.x - Math.cos(q.angle) * 2; p.y = q.y - Math.sin(q.angle) * 2; p.angle = q.angle; p.gz = w.map.groundHeightAt ? w.map.groundHeightAt(p.x, p.y, 0) || 0 : 0; p.z = 0; p.vx = p.vy = 0; await sleep(6000); }
}
const gz = w.map.groundHeightAt ? w.map.groundHeightAt(p.x, p.y, 0) || 0 : 0;
const H = p.angle + Math.PI / 2; // de figuur kijkt dwars op de kijkrichting van de speler; de camera draait er zelf omheen
const base = { x: p.x + Math.cos(p.angle) * 6, y: p.y + Math.sin(p.angle) * 6 };
let pose = null;
const cam = () => { if (!cine.isCinematicActive()) cine.playCinematic({ id: 'modellen-view', duration: 600000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose }); };
// hoek: azimut ten opzichte van de kijkrichting van de figuur (0 = van voren, 90 = zijkant rechts, 180 = achter), hoogte en afstand in m, focus op hoogte f
const view = (az, dist, camY, focusY, fov = 30) => {
  const a = H + az * Math.PI / 180;
  pose = { position: { x: base.x + Math.cos(a) * dist, y: base.y + Math.sin(a) * dist, z: gz + camY }, lookAt: { x: base.x, y: base.y, z: gz + focusY }, fov, cut: true };
};
const HEADS = [['voor', 8, 0.8, 1.65, 1.62], ['schuin', 40, 0.8, 1.65, 1.62], ['zij', 90, 0.8, 1.65, 1.62], ['achter', 180, 0.8, 1.65, 1.62], ['schuinachter', 145, 0.8, 1.65, 1.62], ['laag', 25, 0.7, 1.0, 1.62], ['hoog', 25, 0.7, 2.3, 1.55]];
const cap = async (name) => { await sleep(350); console.log('[capture] ' + name); out.opnamen++; await sleep(450); };
const frames = async (secs, fn) => { let t = 0, last = performance.now(); while (t < secs) { await raf(); const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt; if (fn) fn(dt, t); } };

const LOOKS = { tammo: M.TAMMO_APPEARANCE, tessa: M.ANITA_APPEARANCE };
cam();
for (const [naam, ap] of Object.entries(LOOKS)) {
  if (!ON(naam)) continue;
  const mesh = M.buildPersonMesh(ap.shirt, ap.skin, ap);
  mesh.position.set(base.x, gz, base.y);
  mesh.rotation.y = -H;
  sc.scene.add(mesh);
  if (ON('stand')) {
    for (const [hoek, az, d, cy, fy] of HEADS) {
      view(az, d, cy, fy, 30);
      await frames(0.5, (dt) => M.animatePersonWalk(mesh, 0, dt));
      await cap(`${naam}-stand-${hoek}`);
    }
  }
  if (ON('loop')) {
    for (const [hoek, az, d, cy, fy, fov] of [['zij', 90, 3.2, 1.0, 0.95, 38], ['schuin', 40, 1.0, 1.0, 1.55, 32], ['achter', 160, 1.0, 1.0, 1.55, 32]]) {
      view(az, d, cy, fy, fov);
      await frames(1.3, (dt) => M.animatePersonWalk(mesh, 1.4, dt));
      await frames(0.2, (dt) => { M.animatePersonWalk(mesh, 1.4, dt); });
      console.log('[capture] ' + `${naam}-loop-${hoek}`); out.opnamen++;
      await frames(0.4, (dt) => M.animatePersonWalk(mesh, 1.4, dt));
    }
  }
  if (ON('zit')) {
    M.seatPose(mesh); mesh.position.y = gz + M.seatedY(mesh, 0.45);
    for (const [hoek, az, d, cy, fy, fov] of [['schuin', 40, 1.2, 1.0, 1.15, 38], ['zij', 90, 1.4, 0.9, 1.05, 38], ['voor', 8, 1.0, 1.0, 1.4, 34]]) {
      view(az, d, cy, fy, fov);
      await frames(0.4, () => M.seatPose(mesh));
      await cap(`${naam}-zit-${hoek}`);
    }
  }
  sc.scene.remove(mesh);
  M.releasePersonGeometry(mesh);
}
if (cine.isCinematicActive()) cine.skipCinematic();
w.cameraOverride = null;
console.log('[modellen] opnamen ' + out.opnamen);
return JSON.stringify({ results: { modellen: out } });
