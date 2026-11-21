// Wereld in beeld voor de beeldronde 21-11 (page-script voor scripts/qa/menufoto.mjs --page=beeldronde_wereld.page.js).
// window.__mf.sets: station, brug, sloot, bord, eerste, fiets, vaar, lucht, kleur. Elke set draait in een eigen try; alle plekken
// worden tijdens de run uit de wereld zelf gezocht (plaatsen, landmarks, wegen met brug, waterpolygonen, props). Raakt alleen het wegwerpprofiel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__mf || { size: '1920x1080', sets: [] };
const SIZE = CFG.size; const BR = SIZE.split('x')[0];
const wil = (s) => CFG.sets.includes(s);
const fouten = []; const noteer = (soort, m) => { if (fouten.length < 80) fouten.push(soort + ': ' + String(m).slice(0, 300)); };
window.addEventListener('error', (e) => noteer('onerror', (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => noteer('promise', e.reason && (e.reason.stack || e.reason.message || e.reason)));
const ce = console.error.bind(console); console.error = (...a) => { noteer('console.error', a.map(String).join(' ')); ce(...a); };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const done = []; const notities = {};
for (let i = 0; i < 240 && !(document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  await sleep(1000);
}
await sleep(2500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const DN = await imp('daynight'); const VEH = await imp('vehicle'); const UT = await imp('util'); const SC = await imp('scene3d');
const { P } = await imp('worldframe');
const skipper = setInterval(() => { for (let i = 0; i < 10 && cine.isCinematicActive(); i++) cine.skipCinematic(); }, 150);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
if (w.paused) { tap(' ', 'Space'); await sleep(600); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const vast = () => { w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
vast(); setInterval(vast, 800);
const gh = (x, y) => { try { return map.groundHeightAt(x, y, 0) || 0; } catch (e) { return 0; } };
const cap = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name + '-' + BR); await sleep(800); done.push(name); };
function camUitLazy() { return camUit(); }
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT'); noteer(naam, e && (e.stack || e.message)); } camUitLazy(); };
const teleport = async (x, y, ms = 7000) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(x, y);
  for (let i = 0; i < 40 && !document.getElementById('load-screen'); i++) await sleep(100);
  for (let i = 0; i < 300 && document.getElementById('load-screen'); i++) await sleep(100);
  await sleep(ms);
  let n = 0; while (SC.streamPending && SC.streamPending().roads > 0 && n++ < 40) await sleep(500);
};
let camPose = null;
const cam = (x, y, z, lx, ly, lz, fov = 60) => { camPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true }; cine.startCameraTake('qa-vrij', () => camPose, { letterbox: false, hideHud: false }); };
const camUit = () => { try { cine.stopCameraTake('qa-vrij'); } catch (e) { /* geen take */ } camPose = null; };
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
// Diagnose #1057, stap 2: dezelfde plek zonder cameratake (de gewone volgcamera), midden in de kerk en 40 m ernaast.
const out = [];
await probeer('usquert', async () => {
  const X = 2769.7, Y = -20431.3;
  await teleport(X, Y, 9000);
  await cap('v1-in-de-kerk', 1500);
  out.push({ cam: [SC.getCamera().position.x, SC.getCamera().position.y, SC.getCamera().position.z].map((v) => +v.toFixed(1)) });
  await teleport(X + 45, Y + 25, 6000);
  await cap('v2-naast-de-kerk', 1500);
  out.push({ cam: [SC.getCamera().position.x, SC.getCamera().position.y, SC.getCamera().position.z].map((v) => +v.toFixed(1)) });
});
clearInterval(skipper);
return JSON.stringify({ size: SIZE, done, out, fouten });
