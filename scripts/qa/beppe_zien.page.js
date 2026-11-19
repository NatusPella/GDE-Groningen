// Page half of scripts/qa/beppe_zien.mjs (desktop --perf-script body; #916, #832): zet de speler bij het eerbetoon aan de
// westgrens en neemt straatbeelden van het bankje, het Kollum-bord en het huis met de tuin, en een tweede reeks vanaf 150 m.
// Meet ook of de groep 'beppe-tribute' in de scene staat, binnen 150 m van de speler, en of de speler er heen kan lopen
// zonder dat de randbewaking hem terugzet. window.__bz = { settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__bz || {};
const SETTLE = CFG.settle || 9000;
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
for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && el.tagName !== 'SCRIPT') el.style.display = 'none';
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
w.cinematicHidePlayers = true;
const grab = async (name) => { console.log('[capture] ' + name); await sleep(450); };
const fps = async (ms = 2500) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const out = { fps0: await fps(), stappen: [] };
console.log('[fps] ' + out.fps0 + ' visibility=' + document.visibilityState);

// de plek, zoals het spel hem zelf bepaalt
let spots = null;
for (let i = 0; i < 60 && !spots; i++) { if (window.__beppe) { window.__beppe.place(); spots = window.__beppe.spots(); } if (!spots) await sleep(1000); }
if (!spots) { clearInterval(skipper); done = true; return JSON.stringify({ fout: 'geen plek bepaald' }); }
const site = window.__beppe.site();
const o = site.out, ox = o.x, oy = o.y;
out.spots = { border: site.border, bench: site.bench, sign: site.sign, house: site.house, gardenBench: site.gardenBench, out: o, side: site.side, shift: site.shift };
const meet = (px, py) => {
  const g = S3.scene.getObjectByName('beppe-tribute');
  const r = { groep: !!g, zichtbaar: false, meshes: 0, dichtstbij: null, grondHuis: gh(site.house.x, site.house.y), grondBank: gh(site.bench.x, site.bench.y) };
  if (g) {
    let vis = true; for (let q = g; q; q = q.parent) if (!q.visible) vis = false;
    r.zichtbaar = vis;
    g.traverse((m) => { if (m.isMesh) r.meshes++; });
    let best = 1e9;
    for (const s of [site.bench, site.sign, site.house, site.gardenBench]) best = Math.min(best, Math.hypot(s.x - px, s.y - py));
    r.dichtstbij = Math.round(best);
  }
  return r;
};
const zetOp = async (x, y, ms) => {
  hold = { x, y }; fix(); await sleep(ms || SETTLE);
  let n = 0; while (SC.streamPending().roads > 0 && n++ < 120) await sleep(500);
  for (let k = 0; k < 60 && document.getElementById('load-screen'); k++) await sleep(500);
  await sleep(1500);
};
const shot = async (naam, px, py, cx, cy, dz, lx, ly, ldz) => {
  hold = { x: px, y: py };
  cur = { position: { x: cx, y: cy, z: gh(cx, cy) + dz }, lookAt: { x: lx, y: ly, z: gh(lx, ly) + ldz } };
  await sleep(2500);
  const rep = { naam, fps: await fps(1500), ...meet(px, py), stream: SC.streamPending(), laadscherm: !!document.getElementById('load-screen') };
  out.stappen.push(rep);
  await grab(naam);
};

const B = site.bench, G = site.gardenBench, H = site.house, bd = site.border;
const front = { x: Math.cos(H.a), y: Math.sin(H.a) };
// 1. dichtbij, op straathoogte: de speler komt uit Groningen en loopt naar de grens
await zetOp(B.x - ox * 8, B.y - oy * 8);
await shot('bankje', B.x - ox * 8, B.y - oy * 8, B.x - ox * 8, B.y - oy * 8, 1.7, B.x, B.y, 0.6);
await shot('bord-en-grens', B.x - ox * 10, B.y - oy * 10, B.x - ox * 10, B.y - oy * 10, 1.7, bd.x + ox * 25, bd.y + oy * 25, 1.0);
await shot('bord-dichtbij', B.x - ox * 14, B.y - oy * 14, B.x - ox * 14, B.y - oy * 14, 1.7, site.sign.x, site.sign.y, 2.2);
const lat = { x: -front.y, y: front.x };
await zetOp(H.x + front.x * 14, H.y + front.y * 14);
await shot('huis-hoog', H.x + front.x * 14, H.y + front.y * 14, H.x + front.x * 22 + lat.x * 8, H.y + front.y * 22 + lat.y * 8, 20, H.x, H.y, 0);
await shot('huis-voor', H.x + front.x * 14, H.y + front.y * 14, H.x + front.x * 14 + lat.x * 7, H.y + front.y * 14 + lat.y * 7, 1.7, H.x, H.y, 1.8);
await shot('tuinbankje', G.x + front.x * 3, G.y + front.y * 3, G.x + front.x * 3 + 0.5, G.y + front.y * 3, 1.7, H.x, H.y, 1.5);
// 2. vanaf 150 m op de weg (de speler komt uit Groningen) en vanaf 150 m bij het huis
const f150 = { x: bd.x - ox * 150, y: bd.y - oy * 150 };
await zetOp(f150.x, f150.y);
await shot('150m-weg', f150.x, f150.y, f150.x, f150.y, 1.7, bd.x + ox * 30, bd.y + oy * 30, 1.5);
await shot('150m-hoog', f150.x, f150.y, f150.x - ox * 6, f150.y - oy * 6, 14, bd.x + ox * 22, bd.y + oy * 22, 1.0);
const h150 = { x: H.x + front.x * 150, y: H.y + front.y * 150 };
await zetOp(h150.x, h150.y);
await shot('150m-huis', h150.x, h150.y, h150.x, h150.y, 1.7, H.x, H.y, 3);

// 3. de route: loop van 150 m voor de grens naar het huis met stapjes van 1,2 m; de randbewaking zet de speler terug als
// hij de rand niet toestaat
cur = null; hold = null;
const route = { start: f150, terugGezet: 0, bereikt: false, eind: null };
p.x = f150.x; p.y = f150.y; await sleep(500);
const n = Math.ceil(Math.hypot(H.x - f150.x, H.y - f150.y) / 1.2);
for (let k = 1; k <= n; k++) {
  const t = k / n;
  const tx = f150.x + (H.x - f150.x) * t, ty = f150.y + (H.y - f150.y) * t;
  p.x = tx; p.y = ty; p.vx = p.vy = 0;
  await sleep(40);
  if (Math.hypot(p.x - tx, p.y - ty) > 3) { route.terugGezet++; route.eersteTerugzet = route.eersteTerugzet || { k, tx: Math.round(tx), ty: Math.round(ty), naar: [Math.round(p.x), Math.round(p.y)] }; }
}
route.eind = [Math.round(p.x), Math.round(p.y)];
route.bereikt = Math.hypot(p.x - H.x, p.y - H.y) < 6;
out.route = route;
out.kaart = { marker: window.__beppe.spots().marker };
hold = null; done = true; clearInterval(skipper);
return JSON.stringify(out);
