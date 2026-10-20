// Page half van scripts/qa/tester_bugs.mjs --check=caption (#329): de cinematic bij een groot of hoog gebouw (Het Forum,
// Martinitoren, Groninger Museum, ...). Per gebouw wordt de eerste-bezoek-cinematic ('landmark') echt gestart; elke 0,25 s
// meet de pagina waar de camera staat ten opzichte van de gebouwen (onder het dak van een gebouw waar het punt in ligt =
// in het gebouw), welke tekst er in beeld is en waar (#cine-elementen met tekst: rechthoek en of die binnen het beeld valt),
// en bewaart drie beelden. TB.only = ['Forum Groningen', ...] beperkt de lijst, TB.trailer = true speelt ook de trailerbeelden.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player;
const S3 = window.__scene3d;
const cine = await import('/js/cinematics.js');
const att = await import('/js/attention.js');
const util = await import('/js/util.js');
const cam = await import('/js/camerapath.js');
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) {
    const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent));
    if (it) it.click(); else key('Enter', 'Enter');
    await sleep(2500);
    if (!ss.classList.contains('visible')) break;
  } else await sleep(500);
}
// de opening en de start-cinematic weg
for (let i = 0; i < 400; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); if (i > 60 && !cine.isCinematicActive()) break; }
await sleep(4000);
w.devInvuln = true; w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const { THREE } = S3;
const v = new THREE.Vector3();
const map = w.map;
const lms = (map.meta.landmarks || []).filter((l) => l.name);
const names = TB.only || ['Forum Groningen', 'Martinitoren', 'Groninger Museum', 'Euroborg', 'Hoofdstation Groningen', 'Der Aa-kerk', 'Martinikerk', 'Academiegebouw', 'Goudkantoor'];
const results = {};
const textRects = () => {
  const out = [];
  const root = document.getElementById('cine');
  if (!root) return out;
  for (const el of root.querySelectorAll('.cine-kicker,.cine-title,.cine-big,.cine-name,.cine-line,.cine-speaker')) {
    const text = el.textContent.trim();
    if (!text) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    out.push({ klasse: el.className, tekst: text.slice(0, 50), x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.width), h: Math.round(r.height), zichtbaar: cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && r.width > 0 && r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight });
  }
  return out;
};
for (const name of names) {
  const lm = lms.find((l) => l.name === name);
  if (!lm) { results[name] = { fout: 'niet in de kaart' }; continue; }
  if (cine.isCinematicActive()) cine.skipCinematic();
  await sleep(600);
  // de speler op 45 m van het gebouw, op open grond, kijkend naar het gebouw
  let spot = null;
  for (const a of [Math.PI, 0, Math.PI / 2, -Math.PI / 2, 2.4, -2.4]) {
    const q = { x: lm.x + Math.cos(a) * 45, y: lm.y + Math.sin(a) * 45 };
    const o = map.findOpenSpawn ? map.findOpenSpawn(q.x, q.y, 25) : q;
    if (o && cam.roofAt(map, o.x, o.y) === 0 && Math.hypot(o.x - lm.x, o.y - lm.y) < 54) { spot = o; break; }
  }
  if (!spot) spot = { x: lm.x - 45, y: lm.y };
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.angle = Math.atan2(lm.y - spot.y, lm.x - spot.x);
  if (w.visitedLandmarks instanceof Set) w.visitedLandmarks.delete(name); else w.visitedLandmarks = new Set();
  att.resetAttention();
  let on = false;
  for (let i = 0; i < 120; i++) { await sleep(100); if (cine.isCinematicActive('landmark')) { on = true; break; } if (cine.isCinematicActive()) cine.skipCinematic(); att.resetAttention(); if (w.visitedLandmarks instanceof Set) w.visitedLandmarks.delete(name); }
  const rec = { gestart: on, bereik: cam.buildingReach ? cam.buildingReach(map, lm.x, lm.y) : null, frames: [], inGebouw: 0, tekstZichtbaar: false, tekst: [] };
  results[name] = rec;
  if (!on) continue;
  const near = map.buildingsNear(lm.x, lm.y, 120).filter((b) => b.landmark || (b.h || 0) > 6).slice(0, 6).map((b) => ({ bounds: b.bounds.map((q) => Math.round(q)), h: b.h, dak: Math.round((b.h || 3) * 3.1 + 3.5), landmark: !!b.landmark }));
  rec.gebouwen = near;
  const t0 = performance.now();
  let k = 0;
  while (cine.isCinematicActive('landmark') && performance.now() - t0 < 12000) {
    await sleep(250);
    const c = S3.cam; const cp = c.position;
    const roof = cam.roofAt(map, cp.x, cp.z);
    const inside = roof > 0 && cp.y < roof;
    // de kijkrichting: wat zit er voor de camera binnen 3 m? (binnenkant van een gebouw)
    v.set(0, 0, -1).applyQuaternion(c.quaternion);
    const fr = { t: +((performance.now() - t0) / 1000).toFixed(2), x: +cp.x.toFixed(1), y: +cp.z.toFixed(1), h: +cp.y.toFixed(1), dak: +roof.toFixed(1), inGebouw: inside, afstand: +Math.hypot(cp.x - lm.x, cp.z - lm.y).toFixed(1), kijk: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)] };
    rec.frames.push(fr);
    if (inside) rec.inGebouw++;
    const tr = textRects();
    if (tr.length) { rec.tekst = tr; if (tr.some((q) => q.zichtbaar)) rec.tekstZichtbaar = true; }
    if (k < 3 && fr.t > 0.4 + k * 1.3) { console.log('[capture] lm-' + name.replace(/\W+/g, '_') + '-' + k); k++; await sleep(300); }
  }
  rec.duur = +((performance.now() - t0) / 1000).toFixed(1);
  // daarna noemt de HUD de plek op de plaatskaart (die wacht tot de cinematic uit is)
  const t1 = performance.now();
  while (performance.now() - t1 < 8000) {
    await sleep(300);
    const pc = document.querySelector('#hud .hud-place');
    if (pc && pc.classList.contains('on')) { const r = pc.getBoundingClientRect(); rec.plaatskaart = { naam: (pc.querySelector('.pl-name') || {}).textContent, regel: ((pc.querySelector('.pl-line') || {}).textContent || '').slice(0, 40), x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.width), h: Math.round(r.height), opacity: +getComputedStyle(pc).opacity, na: +((performance.now() - t1) / 1000).toFixed(1) }; console.log('[capture] pl-' + name.replace(/W+/g, '_')); await sleep(200); break; }
  }
  console.log('[tb] ' + name + ': ' + rec.frames.length + ' frames, in gebouw ' + rec.inGebouw + ', tekst ' + rec.tekstZichtbaar);
}
return JSON.stringify({ results: { caption: results } });
