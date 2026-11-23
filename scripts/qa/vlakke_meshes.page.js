// Page-script voor scripts/qa/cutscene_shots.mjs (--page=vlakke_meshes.page.js --spot=x,y): welke platte, lage meshes liggen rond
// de plek, en wie heeft ze in de scène gehangen? Voor losse vlakken op straat die geen bekende bron hebben (AI-tells 23-11: het groene
// vierkant op de Grote Markt in m10-intro, docs/AI-TELLS-BEELD-23-11.md). Werkwijze: Object3D.add wordt gevolgd (met stack), de speler
// gaat 900 m weg en weer terug zodat de wereld rond de plek opnieuw wordt opgebouwd, en daarna komt per mesh binnen 10 m die niet
// hoger is dan 0,8 m: maat, aantal hoekpunten, materiaal en kleur, de ouderketen en (als hij opnieuw is gemaakt) de aanroeper.
//   node scripts/qa/cutscene_shots.mjs --page=vlakke_meshes.page.js --spot=200.8,45.4 --out=<map>   uitvoer: regels [vlak] in run.log
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const CS = window.__cs || {};
const spot = CS.spot || { x: 200.8, y: 45.4 };
D.input.canLock = () => false;
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
w.clock = 14;
const born = new WeakMap();
const add0 = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...objs) {
  for (const o of objs) if (o && o.isMesh) born.set(o, (new Error().stack || '').split('\n').slice(2, 8).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/js\//, '')).join(' < '));
  return add0.apply(this, objs);
};
const goto = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; };
let at = { x: spot.x + 900, y: spot.y };
const hold = setInterval(() => goto(at.x, at.y), 100);
await sleep(7000);
at = spot;
await sleep(CS.settle || 9000);
const scene = window.__scene3d.scene;
scene.updateMatrixWorld(true);
const out = [];
const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
scene.traverse((o) => {
  if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position || !o.visible) return;
  box.setFromObject(o); box.getCenter(c); box.getSize(s);
  if (!Number.isFinite(c.x)) return;
  const d = Math.hypot(c.x - spot.x, c.z - spot.y);
  if (d > 10 || box.max.y > 0.8 || box.min.y < -0.5 || s.y > 0.3) return;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  const chain = [];
  for (let q = o; q && chain.length < 6; q = q.parent) chain.push(q.name || q.type);
  out.push({ d: +d.toFixed(2), c: [c.x, c.z, c.y].map((v) => +v.toFixed(2)), maat: [s.x, s.z, s.y].map((v) => +v.toFixed(2)), hoekpunten: o.geometry.attributes.position.count, geo: o.geometry.type, mat: m && m.type, kleur: m && m.color && m.color.getHexString(), textuur: !!(m && m.map), keten: chain.join(' > '), userData: JSON.stringify(o.userData).slice(0, 160), aanroeper: born.get(o) || null });
});
THREE.Object3D.prototype.add = add0;
clearInterval(hold);
out.sort((a, b) => a.d - b.d);
for (const r of out.slice(0, 60)) console.log('[vlak] ' + JSON.stringify(r));
return JSON.stringify({ results: { vlakke_meshes: { spot, n: out.length, lijst: out.slice(0, 60) } } });
