// Page half van scripts/qa/tester_bugs.mjs --check=intro (#321): de camera van "Nieuw spel" tot het eind van de
// opening, elk frame gemeten. Draait met GDE_MENU_TEST=1, dus het script krijgt het hoofdmenu zelf en kan
// "Nieuw spel" kiezen nadat de recorder staat. Per frame: cameraplek en kijkrichting, of de camera onder een dak of in een
// gebouw staat (roofAt van de kaart) en hoe ver de kijkrichting is gedraaid ten opzichte van het vorige frame.
// Een draai van meer dan 35 graden in één frame zonder geplande cut heet een flip; een camera in een gebouw wordt
// in een eigen lijst bewaard. Uitvoer: __tb.summary (JSON in de laatste [perf-script]-regel).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const cam = await import('/js/camerapath.js');
const S3 = window.__scene3d;
const rec = [];
let stop = false;
const tmp = new S3.THREE.Vector3();
let prev = null;
const cineEl = () => document.getElementById('cine');
const cineMod = await import('/js/cinematics.js');
const CIDS = ['start', 'story-opening', 'story-opening-trailer', 'story-opening-keuken', 'story-opening-verhuisdag', 'landmark', 'wijk', 'mission-intro', 'mission-scene', 'intro-out'];
const cidNow = () => CIDS.find((c) => cineMod.isCinematicActive(c)) || '';
const subNow = () => { const l = document.querySelector('#cine .cine-line'); return l ? l.textContent.trim().slice(0, 40) : ''; };
const loop = (now) => {
  if (stop) return;
  const c = S3.cam;
  tmp.set(0, 0, -1).applyQuaternion(c.quaternion);
  const p = c.position;
  const roof = cam.roofAt(w.map, p.x, p.z);
  const e = cineEl();
  const o = w.cameraOverride;
  const f = { t: Math.round(now), x: +p.x.toFixed(2), y: +p.z.toFixed(2), h: +p.y.toFixed(2), dx: +tmp.x.toFixed(3), dy: +tmp.z.toFixed(3), dz: +tmp.y.toFixed(3), fov: +c.fov.toFixed(1), roof: +roof.toFixed(1), cine: !!(e && e.classList.contains('active')), ov: !!o, cut: !!(o && o.cut), up: +(c.up ? c.up.y : 1).toFixed(2), cid: cidNow(), sub: subNow() };
  if (prev) {
    const dot = Math.max(-1, Math.min(1, f.dx * prev.dx + f.dy * prev.dy + f.dz * prev.dz));
    f.turn = +(Math.acos(dot) * 180 / Math.PI).toFixed(1);
    f.move = +Math.hypot(f.x - prev.x, f.y - prev.y, f.h - prev.h).toFixed(2);
  }
  prev = f;
  rec.push(f);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// Nieuw spel kiezen
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
const t0 = performance.now();
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) {
    const it = (window.__menuStart ? { click: () => window.__menuStart('nieuw') } : null);
    if (it) it.click(); else key('Enter', 'Enter');
    await sleep(2500);
    if (!ss.classList.contains('visible')) break;
  } else await sleep(500);
}
const tStart = performance.now();
console.log('[tb] nieuw spel gekozen na ' + Math.round(tStart - t0) + ' ms');
// vang elke 1,5 s een beeld zolang er een cinematic loopt (de eerste 60 s), plus bij elke flip
let nShots = 0, lastShot = 0, lastFlip = 0;
let doneAt = 0;
const MAX = (TB.maxS || 150) * 1000;
while (performance.now() - tStart < MAX) {
  await sleep(100);
  const fr = rec[rec.length - 1];
  if (!fr) continue;
  const now = performance.now();
  const flip = fr.turn > 35 && !fr.cut;
  if ((flip && now - lastFlip > 700 && nShots < 40) || (fr.cine && now - lastShot > (TB.every || 1500) && nShots < 40)) {
    console.log('[capture] ' + (flip ? 'flip' : 'tb') + String(nShots).padStart(2, '0') + '-t' + Math.round((now - tStart) / 100) / 10);
    nShots++; lastShot = now; if (flip) lastFlip = now;
    await sleep(350);
  }
  // klaar: de opening-cinematic is geweest en het beeld is 6 s lang weer het volgbeeld
  const active = rec.slice(-60).some((q) => q.cine);
  if (active) doneAt = 0; else if (rec.some((q) => q.cine) && !doneAt) doneAt = now; else if (doneAt && now - doneAt > 6000) break;
}
stop = true;
const startedAt = rec.findIndex((q) => q.t >= tStart);
const frames = rec.slice(Math.max(0, startedAt));
const inside = frames.filter((q) => q.roof > 0 && q.h < q.roof);
const flips = frames.filter((q) => q.turn > 35);
const jumps = frames.filter((q) => q.move > 25);
const summary = {
  frames: frames.length, secs: Math.round((frames[frames.length - 1].t - frames[0].t) / 100) / 10,
  cineFrames: frames.filter((q) => q.cine).length,
  inBuilding: inside.length, inBuildingSample: inside.slice(0, 12),
  flips: flips.length, flipSample: flips.slice(0, 12),
  jumps: jumps.length, jumpSample: jumps.slice(0, 12),
};
// compact bewaren voor latere analyse (de console-regels van gewone logs halen de driver niet): [t, x, y, h, dx, dy, dz, fov, dak, cine, override, cut]
summary.frames = frames.map((q) => [q.t, q.x, q.y, q.h, q.dx, q.dy, q.dz, q.fov, q.roof, q.cine ? 1 : 0, q.ov ? 1 : 0, q.cut ? 1 : 0, q.cid, q.sub]);
return JSON.stringify({ results: { intro: summary } });
