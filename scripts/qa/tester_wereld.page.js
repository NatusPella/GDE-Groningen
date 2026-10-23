// Page half van scripts/qa/tester_bugs.mjs --check=wereld: de wereld-glitches van #436 in een echt Electron-venster.
// --opts='{"deel":"trein|fiets|taxi|bord|vogel|bus|brug"}'. Elk deel meet met __debug en geeft JSON terug; beelden via [capture].
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug;
const world = D.world;
const deel = (window.__tb && window.__tb.deel) || 'trein';
const out = { deel };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) {
    if (window.__menuStart) window.__menuStart('nieuw');
    await sleep(2500);
    if (!ss.classList.contains('visible')) break;
  } else await sleep(500);
}
for (let i = 0; i < 90 && !document.body.classList.contains('game-started'); i++) await sleep(500);
await sleep(6000);
// de opening van een nieuw spel is een filmpje: sla over zolang het loopt
for (let i = 0; i < 40; i++) {
  const C = await import('./js/cinematics.js');
  if (!C.isCinematicActive()) break;
  C.skipAllCinematics();
  await sleep(600);
}
{ const C = await import('./js/cinematics.js'); setInterval(() => { try { C.skipAllCinematics(); } catch { /* geen filmpje */ } }, 400); }
await sleep(1500);
const shot = async (naam) => { await sleep(700); console.log('[capture] ' + naam); await sleep(900); };
const frames = (ms, f) => new Promise((res) => { const t0 = performance.now(); let last = t0; const rec = []; const step = (now) => { rec.push(f(now, now - last)); last = now; if (now - t0 < ms) requestAnimationFrame(step); else res(rec); }; requestAnimationFrame(step); });

if (deel === 'trein') {
  const R = await import('./js/railway.js');
  const trains = R.getTrains();
  out.treinen = trains.length;
  // een rijdende trein op de kaart: zet hem midden op zijn lijn, op kruissnelheid, en de speler ernaast
  const t = trains.find((q) => /Assen/.test(q.route.name)) || trains[0];
  const stops = t.route.stops;
  t.dir = 1; t.c = Math.min(t.route.len * 0.4, 3000);
  t.target = stops.findIndex((s) => s.s > t.c + 800); if (t.target < 0) t.target = stops.length - 1;
  t.state = 'run'; t.v = t.cfg.vmax;
  const pt = R.routePoint(t.route, t.c + 200);
  out.trein = { naam: t.route.name, c: t.c, v: t.v, target: t.target, x: pt[0], y: pt[1] };
  world.player.x = pt[0] + 25; world.player.y = pt[1] + 25;
  await sleep(9000);
  const rec = await frames(12000, (now, dt) => {
    const c = t.cars[0];
    return [dt, c.x, c.y, t.v, performance.now()];
  });
  const dts = rec.map((r) => r[0]).slice(2);
  out.frames = dts.length;
  out.dtMax = Math.max(...dts);
  out.dtGem = dts.reduce((a, b) => a + b, 0) / dts.length;
  out.dtOver25 = dts.filter((d) => d > 25).length;
  const sec = []; let acc = 0, idx = 0;
  for (const d of dts) { acc += d; (sec[idx] = sec[idx] || []).push(Math.round(d)); if (acc >= 1000) { acc = 0; idx++; } }
  out.perSeconde = sec.map((a) => ({ n: a.length, max: Math.max(...a), over25: a.filter((d) => d > 25).length }));
  // verschil tussen de afgelegde weg per frame en v*dt
  let maxErr = 0, sum = 0, n = 0;
  for (let i = 3; i < rec.length; i++) {
    const step = Math.hypot(rec[i][1] - rec[i - 1][1], rec[i][2] - rec[i - 1][2]);
    const want = Math.abs(rec[i][3]) * rec[i - 1][0] / 1000;
    if (rec[i][3] > 1) { maxErr = Math.max(maxErr, Math.abs(step - want)); sum += Math.abs(step - want); n++; }
  }
  out.eind = { state: t.state, c: t.c, v: t.v, target: t.target, dir: t.dir, paused: world.paused, tijd: world.time };
  out.stapFoutMax = maxErr; out.stapFoutGem = n ? sum / n : 0;
  await shot('trein-' + t.route.name.replace(/\s+/g, '_'));
}
return JSON.stringify({ results: { wereld: out } });
