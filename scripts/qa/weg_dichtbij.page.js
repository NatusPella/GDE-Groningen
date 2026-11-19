// Page half of scripts/qa/weg_dichtbij.mjs (desktop --perf-script body; #883): per plek een straatbeeld en een luchtbeeld
// van de weg bij de speler, plus een meting van de gerenderde scene: welke meshes liggen op wegniveau binnen R m van de speler
// (naam, zichtbaar, materiaal) en of de far-LOD de weg daar tekent. window.__wd = { plekken: [{ naam, x, y, snapR, road }], settle, R }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__wd;
const SETTLE = CFG.settle || 9000;
const R = CFG.R || 30;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fix();
let hold = null, done = false, cur = null;
const tick = () => { w.clock = 14; if (hold) { if (p.inVehicle) p.exitVehicle(map, w); p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
// verberg het laadscherm en de HUD: alleen de wereld in beeld
for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && el.tagName !== 'SCRIPT') el.style.display = 'none';
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
w.cinematicHidePlayers = true;
const grab = async (name) => { console.log('[capture] ' + name); await sleep(450); };

function snapRoad(x, y, Rr, road) {
  let best = null;
  const rows = (map.roadsNear ? map.roadsNear(x, y, Rr) : []) || [];
  for (const rd of rows) {
    if (road && rd.name !== road && rd.ref !== road) continue;
    if (rd.bridge && !CFG.brug) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 6) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), name: rd.name || rd.ref || '', cat: rd.cat, width: rd.width, bridge: !!rd.bridge, nPts: rd.pts.length };
    }
  }
  return best;
}
const chain = (o) => { const n = []; for (let q = o; q && q !== S3.scene; q = q.parent) n.push(q.name || q.type); return n.slice(0, 4).join('<'); };
const visibleDeep = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
function measure(px, py) {
  const rows = [];
  const box = new S3.THREE.Box3();
  S3.scene.updateMatrixWorld(true);
  S3.scene.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints)) return;
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    if (!(box.min.x === box.min.x)) return;
    if (box.max.x < px - R || box.min.x > px + R || box.max.z < py - R || box.min.z > py + R) return;
    if (box.min.y > 0.6) return; // alleen wat op wegniveau begint
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    rows.push({
      n: o.name || '', t: o.isInstancedMesh ? 'inst' : 'mesh', ch: chain(o.parent),
      vis: visibleDeep(o), ymin: +box.min.y.toFixed(2), ymax: +box.max.y.toFixed(2),
      sz: [+(box.max.x - box.min.x).toFixed(0), +(box.max.z - box.min.z).toFixed(0)],
      mat: m ? { type: m.type, name: m.name || '', dt: m.depthTest, dw: m.depthWrite, tr: m.transparent, op: m.opacity, po: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : 0, side: m.side, col: m.color ? m.color.getHexString() : null } : null,
      ro: o.renderOrder, fc: o.frustumCulled,
    });
  });
  return rows;
}
const out = { dpr: devicePixelRatio, plekken: [] };
await sleep(2000);
for (const q of CFG.plekken) {
  const rep = { naam: q.naam };
  out.plekken.push(rep);
  try {
    fix();
    hold = { x: q.x, y: q.y };
    await sleep(SETTLE * 0.7);
    // de tegels rond een ver punt stromen binnen: wacht tot er een weg is (hoogstens 90 s)
    let sn = snapRoad(q.x, q.y, q.snapR || 300, q.road);
    for (let k = 0; k < 90 && !sn; k++) { await sleep(1000); sn = snapRoad(q.x, q.y, q.snapR || 300, q.road); }
    if (!sn) { rep.fout = 'geen weg binnen ' + (q.snapR || 300); continue; }
    Object.assign(rep, { weg: sn.name, cat: sn.cat, breed: sn.width, brug: sn.bridge, at: [Math.round(sn.x), Math.round(sn.y)], dSnap: Math.round(sn.d) });
    hold = { x: sn.x, y: sn.y };
    p.angle = sn.a;
    fix();
    await sleep(SETTLE);
    // wacht tot alle wegen binnen DRAW_DIST gebouwd zijn (hoogstens 90 s) en meet hoe lang dat duurde
    const tw = performance.now();
    while (SC.streamPending().roads > 0 && performance.now() - tw < 90000) await sleep(500);
    for (let k = 0; k < 120 && document.getElementById('load-screen'); k++) await sleep(500); // het laadscherm van de sprong moet weg zijn
    rep.wachtS = Math.round((performance.now() - tw) / 100) / 10;
    await sleep(1500);
    const gz = map.groundHeightAt ? map.groundHeightAt(sn.x, sn.y, 0) || 0 : 0;
    const cx = Math.cos(sn.a), cy = Math.sin(sn.a);
    rep.gz = gz;
    rep.dists = S3.dists();
    rep.batches = S3.batches();
    rep.stream = SC.streamPending();
    rep.sync = { ...SC.roadSyncStats };
    rep.laadscherm = !!document.getElementById('load-screen'); // staat het laadscherm van de sprong er nog (dan ziet de speler de wereld nog niet)?
    rep.scene = measure(sn.x, sn.y);
    // de wegen binnen DRAW_DIST: staat hun gedetailleerde geometrie klaar, of is het een 'heavy' weg (scene3d.js syncRoads)?
    rep.wegen = (map.roadsNear(sn.x, sn.y, rep.dists.DRAW_DIST) || []).map((r) => {
      const b = r.bounds || [sn.x, sn.y, sn.x, sn.y];
      const d = Math.hypot(Math.max(b[0] - sn.x, 0, sn.x - b[2]), Math.max(b[1] - sn.y, 0, sn.y - b[3]));
      return { n: r.name || r.ref || '', cat: r.cat, brug: !!r.bridge, z: !!r.z, d: Math.round(d), geoRoad: !!r._geoRoad, struct: r._geoStruct === undefined ? 'undef' : (r._geoStruct ? 'ja' : 'null'), over: r._geoOverDeck === undefined ? 'undef' : 'x', pend: !!r._geoPending, main: !!r._geoMain, mq: r._geoMarkQ };
    }).sort((a, b) => a.d - b.d);
    // het verloop: blijft het aantal te bouwen wegen hangen?
    rep.serie = [];
    for (let k = 0; k < 6; k++) { await sleep(2000); rep.serie.push({ roads: SC.streamPending().roads, hb: SC.roadSyncStats.heavyBuilt, hd: SC.roadSyncStats.heavyDeferred, built: SC.roadSyncStats.built, rdr: S3.dists().roadDetailR }); }
    const tag = 'wd-' + q.naam;
    // straatbeeld: 1,7 m boven de weg, 8 m achter het punt, vooruit kijkend
    const straat = { position: { x: sn.x - cx * 8, y: sn.y - cy * 8, z: gz + 1.7 }, lookAt: { x: sn.x + cx * 40, y: sn.y + cy * 40, z: gz } };
    cur = straat;
    await sleep(1500); await grab(tag + '-straat');
    cur = { position: { x: sn.x - cx * 30, y: sn.y - cy * 30, z: gz + 18 }, lookAt: { x: sn.x + cx * 20, y: sn.y + cy * 20, z: gz } };
    await sleep(1500); await grab(tag + '-hoog');
    // zonder far-LOD: laat zien wat het gedetailleerde wegdek alleen doet
    if (q.zonderLod && S3.farLod && S3.farLod.root) {
      S3.farLod.root.visible = false; cur = straat; await sleep(1200); await grab(tag + '-straat-zonderlod'); S3.farLod.root.visible = true;
    }
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 400); }
}
hold = null; done = true; clearInterval(skipper);
return JSON.stringify(out);
