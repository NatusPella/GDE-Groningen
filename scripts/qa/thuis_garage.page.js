// Page half of scripts/qa/thuis_qa.mjs --page=garage (#1335): loopt vanaf de straat de privégarage in (W ingedrukt, echte
// spelerbewegingen en botsingen) en rijdt daarna de Escapade eruit. Meet de baan in het garageframe (u langs de westmuur,
// v richting de poort) en neemt beelden. window.__tq = { settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (k, code, down) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, code, bubbles: true })); };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { key(' ', 'Space', true); key(' ', 'Space', false); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const SC = await imp('scene3d');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const grab = async (name) => { console.log('[capture] ' + name); await sleep(600); };
const out = { stappen: [] };
const home = window.__home.home;
const g = home.garage, d = g.door;
const toUV = (x, y) => { const dx = x - g.pw(0, 0)[0], dy = y - g.pw(0, 0)[1]; return [+(dx * g.U[0] + dy * g.U[1]).toFixed(2), +(dx * g.V[0] + dy * g.V[1]).toFixed(2)]; };
out.deur = { uv: toUV(d.cx, d.cy), breedte: +Math.hypot(d.x2 - d.x1, d.y2 - d.y1).toFixed(2) };
// camera boven de poort, kijkend naar binnen
let cur = null;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.p[0], cur.p[2], cur.p[1]); c.lookAt(cur.l[0], cur.l[2], cur.l[1]); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
const waitStream = async () => { let n = 0; while (SC.streamPending().roads > 0 && n++ < 60) await sleep(500); for (let k = 0; k < 60 && document.getElementById('load-screen'); k++) await sleep(500); };
const sample = (naam) => { const q = p.inVehicle || p; return { naam, uv: toUV(q.x, q.y), z: +(q.z || 0).toFixed(2), poort: +(window.__home.state ? 0 : 0) }; };

// 1. te voet: 10 m voor de poort neerzetten, kijkrichting naar binnen, W ingedrukt
if (p.inVehicle) p.exitVehicle(map, w);
const start = [d.cx + d.nx * 10, d.cy + d.ny * 10];
p.x = start[0]; p.y = start[1]; p.vx = p.vy = 0; p.z = 0;
w.camYaw = Math.atan2(-d.ny, -d.nx);
await sleep(out.settle = (window.__tq && window.__tq.settle) || 6000);
await waitStream();
cur = { p: [d.cx + d.nx * 9 + g.U[0] * 4, d.cy + d.ny * 9 + g.U[1] * 4, 5], l: [d.cx, d.cy, 1] };
await grab('voet-0-straat');
key('w', 'KeyW', true);
const baan = [];
for (let i = 0; i < 24; i++) { await sleep(500); const s = sample('t' + i); baan.push(s.uv.concat(s.z)); if (i === 8) await grab('voet-1-bij-poort'); }
key('w', 'KeyW', false);
cur = { p: [d.cx - d.nx * 4 + g.U[0] * 2, d.cy - d.ny * 4 + g.U[1] * 2, 6], l: [d.cx - d.nx * 8, d.cy - d.ny * 8, 0.5] };
await grab('voet-2-binnen');
out.voetBaan = baan;
out.voetEind = sample('eind');
out.voetBinnen = out.voetEind.uv[1] < out.deur.uv[1] - 2;

// 2. de Escapade eruit
const hero = w.vehicles.find((v) => v.isHeroCar && !v.wrecked);
out.hero = hero ? { uv: toUV(hero.x, hero.y), angle: +hero.angle.toFixed(2), len: hero.model && hero.model.len, wid: hero.model && hero.model.wid } : null;
if (hero) {
  p.x = hero.x; p.y = hero.y;
  try { p.enterVehicle(hero, w); } catch (e) { out.enterFout = String(e); }
  await sleep(1500);
  out.inAuto = !!p.inVehicle;
  w.camYaw = hero.angle;
  key('w', 'KeyW', true);
  const rit = [];
  for (let i = 0; i < 24; i++) { await sleep(500); const q = p.inVehicle || p; rit.push(toUV(q.x, q.y).concat([+(q.speed || 0).toFixed(1)])); if (i === 6) { cur = { p: [d.cx + d.nx * 9, d.cy + d.ny * 9, 5], l: [d.cx, d.cy, 1] }; await grab('auto-1-poort'); } }
  key('w', 'KeyW', false);
  out.rit = rit;
  const q = p.inVehicle || p;
  out.autoEind = toUV(q.x, q.y);
  out.autoBuiten = out.autoEind[1] > out.deur.uv[1] + 2;
}
clearInterval(skipper);
return JSON.stringify(out);
