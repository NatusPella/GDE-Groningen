// Page half of scripts/qa/brug_beeld.mjs (desktop --perf-script body; #235): per brug beelden op vaste camerastanden voor
// flikkering en glitches. Elke stand komt drie keer: a (de stand), b (dezelfde stand 4 cm verschoven) en c (weer a).
// Het verschil a-c is de ruis van water en verkeer; a-b boven die ruis is z-fighting of een LOD-wissel op die plek.
// Per beweegbare brug ook een reeks tijdens het openen en sluiten vanaf één vaste stand.
// window.__bb = { bruggen: [{ naam, x, y }], afstanden, delta, settle, alleenLijst } staat ervoor. Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = (window.__menuStart ? { click: () => window.__menuStart('nieuw') } : null);
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__bb || { bruggen: [] };
const SETTLE = CFG.settle || 4500;
const DIST = CFG.afstanden || [25, 60, 150, 350];
const DELTA = CFG.delta || 0.04;
const issues = [];
const origErr = console.error.bind(console);
console.error = (...a) => { issues.push('console.error: ' + a.map(String).join(' ').slice(0, 200)); origErr(...a); };
const cine = await imp('cinematics');
const DN = await imp('daynight');
const MB = await imp('movablebridges');
const TP = await imp('tileplace');
const WL = await imp('waterlevels');
if (CFG.alleenLijst) {
  const lijst = MB.getMovableBridges().map((b) => ({ naam: b.name, kind: b.kind, x: Math.round(b.x), y: Math.round(b.y), len: Math.round(b.len) }));
  return JSON.stringify({ beweegbaar: lijst });
}
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
let hold = null, done = false;
const tick = () => { w.clock = 14; if (hold) { if (p.inVehicle) p.exitVehicle(map, w); p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
// De camera staat vast: renderer.render zet hem vlak voor elke tekenbeurt op `cur` (de cinematic-camera van het spel
// tilt zichzelf over gebouwen en duwt zich van muren, dus die staat niet stil). De speler staat op de camerapositie en
// kijkt dezelfde kant op, zodat streaming, LOD en cullen van het spel op de goede plek zitten.
const S3 = window.__scene3d;
let cur = null;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
{ const ss = document.querySelector('#start-screen'); if (ss) ss.style.display = 'none'; } // het titelscherm blijft soms over het spel hangen
if (!CFG.hud) for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && !(el.tagName === 'SCRIPT')) el.style.display = 'none';
w.cinematicHidePlayers = true;
const grab = async (name) => { console.log('[capture] ' + name); await sleep(450); };
const zet = (pose) => { cur = pose; hold = { x: pose.position.x, y: pose.position.y }; p.angle = Math.atan2(pose.lookAt.y - pose.position.y, pose.lookAt.x - pose.position.x); };
const start = async (pose) => { zet(pose); await sleep(2600); };
const stop = async () => { await sleep(100); };
const shift = (pose, d) => ({ position: { x: pose.position.x + d, y: pose.position.y + d, z: pose.position.z + d }, lookAt: pose.lookAt });
const trio = async (name, pose) => {
  await start(pose);
  await grab(`${name}-a`);
  cur = shift(pose, DELTA); await sleep(500);
  await grab(`${name}-b`);
  cur = pose; await sleep(500);
  await grab(`${name}-c`);
  await stop();
};
const lenOf = (r) => r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1]), 0);
const results = [];
await sleep(3000);
// losse plekken (geen brug): een schuin luchtbeeld op 70 m en een straatbeeld op 18 m, voor controles van water, gebouwen en hekken
for (const q of CFG.plekken || []) {
  const rep = { naam: q.naam, x: q.x, y: q.y };
  results.push(rep);
  try {
    hold = { x: q.x, y: q.y };
    await sleep(SETTLE);
    // (met ?terrain staat de grond op het reliëf: de vraag begint daar, niet op 0)
    const gz = map.groundHeightAt ? map.groundHeightAt(q.x, q.y, map.terrainOn ? map.terrainAt(q.x, q.y) + 0.5 : 0) || 0 : 0;
    const tag = `bb-plek-${(q.naam || 'plek').replace(/[^\w]+/g, '_')}`;
    await start({ position: { x: q.x + 45, y: q.y - 45, z: gz + 55 }, lookAt: { x: q.x, y: q.y, z: gz } });
    await grab(`${tag}-hoog`);
    // een schuin beeld van 200 m af, laag: het reliëf tegen de horizon
    zet({ position: { x: q.x + 140, y: q.y - 140, z: gz + 22 }, lookAt: { x: q.x, y: q.y, z: gz + 2 } });
    await sleep(2500);
    await grab(`${tag}-ver`);
    zet({ position: { x: q.x + 16, y: q.y - 8, z: gz + 3 }, lookAt: { x: q.x, y: q.y, z: gz + 1 } });
    await sleep(1500);
    await grab(`${tag}-straat`);
    // q.rond: vier horizonbeelden op 4 m hoogte (noord, oost, zuid, west): ligt er ergens land of een muur waar water hoort te zijn
    if (q.rond) for (const [naam, hx, hy] of [['n', 0, -1], ['o', 1, 0], ['z', 0, 1], ['w', -1, 0]]) {
      zet({ position: { x: q.x, y: q.y, z: 4 }, lookAt: { x: q.x + hx * 600, y: q.y + hy * 600, z: 2 } });
      await sleep(1800);
      await grab(`${tag}-rond-${naam}`);
    }
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
for (const b of CFG.bruggen) {
  const rep = { naam: b.naam, x: b.x, y: b.y };
  results.push(rep);
  try {
    hold = { x: b.x, y: b.y };
    await sleep(SETTLE);
    const near = map.roadsNear(b.x, b.y, 6) || [];
    const road = near.find((q) => q.bridge && q.pts.length >= 2 && (!b.naam || b.naam === '-' || q.name === b.naam)) || near.find((q) => q.bridge);
    if (!road) { rep.fout = 'brug niet gevonden'; continue; }
    const P = road.pts, a = P[0], e = P[P.length - 1], m = P[Math.floor(P.length / 2)];
    const ux = e[0] - a[0], uy = e[1] - a[1], L = Math.hypot(ux, uy) || 1, dx = ux / L, dy = uy / L, nx = -dy, ny = dx;
    const zs = road.z ? road.z : null, zm = zs ? zs[Math.floor(zs.length / 2)] : 0;
    Object.assign(rep, { lengte: Math.round(lenOf(road)), zMidden: +zm.toFixed(2), beweegbaar: road.movable || null, klasse: road.cat, breedte: road.width });
    const tag = `bb-${String(results.length).padStart(2, '0')}-${(b.naam || 'brug').replace(/[^\w]+/g, '_')}`;
    hold = { x: m[0], y: m[1] };
    let zijde = null;
    // 1. schuin langs het water (loodrecht op de brug is het uitzicht vrij), op vier afstanden, hoog genoeg om het dek te zien;
    // van de vier kandidaten (twee kanten, twee schuine stand) de met de minste gebouwen in de zichtlijn
    for (const d of DIST) {
      let best = null;
      for (const sn of [1, -1]) for (const sa of [0.25, -0.25]) {
        const px = m[0] + nx * d * sn * 0.97 + dx * d * sa, py = m[1] + ny * d * sn * 0.97 + dy * d * sa;
        let blok = (TP.buildingAt(map, px, py, 3) ? 99 : 0) + (WL.waterAt(map, px, py) ? 0 : 4); // (boven het water staan geen bomen in de weg)
        for (let k = 1; k <= 24; k++) { const t = k / 25; if (TP.buildingAt(map, px + (m[0] - px) * t, py + (m[1] - py) * t)) blok++; }
        if (!best || blok < best.blok) best = { px, py, blok, sn, sa };
      }
      rep['blok' + d] = best.blok;
      if (d === DIST[1] || !zijde) zijde = best;
      if (!CFG.alleenReeks) await trio(`${tag}-schuin${d}`, { position: { x: best.px, y: best.py, z: zm + 2 + d * 0.18 }, lookAt: { x: m[0], y: m[1], z: zm }});
    }
    // 2. bestuurdersoog: op het dek, vooruit kijkend, vijf plekken langs de brug
    const half = Math.min(L / 2, 40);
    if (!CFG.alleenReeks) for (const s of [-half * 0.9, -half * 0.45, 0, half * 0.45, half * 0.9]) {
      const ox = m[0] + dx * s, oy = m[1] + dy * s;
      await trio(`${tag}-dek${Math.round(s)}`, { position: { x: ox, y: oy, z: zm + 1.7 }, lookAt: { x: ox + dx * 30, y: oy + dy * 30, z: zm + 0.4 }});
    }
    // 3. onder het dek, van het water of de weg eronder
    if (!CFG.alleenReeks) await trio(`${tag}-onder`, { position: { x: m[0] + nx * 14, y: m[1] + ny * 14, z: 1.6 }, lookAt: { x: m[0], y: m[1], z: Math.max(zm - 0.5, 1.5) }});
    // 4. beweegbaar: een reeks tijdens het openen en sluiten, één vaste stand
    const mb = MB.getMovableBridges().find((q) => q.r === road);
    if (mb) {
      if (p.inVehicle) p.exitVehicle(map, w);
      hold = null;
      p.x = mb.x - mb.uy * (mb.half + 6); p.y = mb.y + mb.ux * (mb.half + 6);
      // b.cam = { a, n, z }: een eigen stand voor een brug waar de gekozen stand door een boom of gebouw kijkt (langs het dek, opzij, hoogte)
      const side = b.cam
        ? { position: { x: m[0] + dx * b.cam.a + nx * b.cam.n, y: m[1] + dy * b.cam.a + ny * b.cam.n, z: zm + b.cam.z }, lookAt: { x: m[0], y: m[1], z: zm + 1 } }
        : { position: { x: m[0] + nx * 36 * zijde.sn + dx * 36 * zijde.sa, y: m[1] + ny * 36 * zijde.sn + dy * 36 * zijde.sa, z: zm + 9 }, lookAt: { x: m[0], y: m[1], z: zm + 1.5 }};
      const reeks = [];
      await start(side);
      await grab(`${tag}-reeks0-dicht`);
      MB.requestOpening(mb, null, true, false);
      const t1 = performance.now();
      // de hint van de brug ('Brug gaat open') staat een paar seconden op de HUD: met --hud een beeld zodra hij 'warn' is
      for (let i = 0; i < 100 && mb.state !== 'warn' && mb.state !== 'booms'; i++) await sleep(50);
      await sleep(600);
      await grab(`${tag}-reeks1a-waarschuwing`);
      const gezien = new Set();
      const staat = [];
      rep.log = [];
      const lg = () => { rep.log.push(`${Math.round((performance.now() - t1) / 1000)}s ${mb.state} open=${mb.open.toFixed(2)} boten=${mb.boats.size} manual=${mb.manual}`); };
      while (performance.now() - t1 < 90000 && mb.state !== 'open') {
        for (const q of [0.15, 0.4, 0.7, 0.92]) if (mb.state === 'opening' && mb.open >= q && !gezien.has('o' + q)) { gezien.add('o' + q); staat.push({ q, open: +mb.open.toFixed(2) }); await grab(`${tag}-reeks1-openen${Math.round(q * 100)}`); }
        await sleep(120); if (rep.log.length < 120 && Math.round((performance.now() - t1) / 1000) !== rep._l) { rep._l = Math.round((performance.now() - t1) / 1000); lg(); }
      }
      rep.open = mb.state === 'open';
      await sleep(900);
      await grab(`${tag}-reeks2-open`);
      const t2 = performance.now();
      while (performance.now() - t2 < 90000 && mb.state !== 'closed') {
        for (const q of [0.7, 0.4, 0.15]) if (mb.state === 'closing' && mb.open <= q && !gezien.has('c' + q)) { gezien.add('c' + q); staat.push({ q, open: +mb.open.toFixed(2) }); await grab(`${tag}-reeks3-sluiten${Math.round(q * 100)}`); }
        await sleep(120); if (rep.log.length < 240 && Math.round((performance.now() - t1) / 1000) !== rep._l) { rep._l = Math.round((performance.now() - t1) / 1000); lg(); }
      }
      rep.dichtGegaan = mb.state === 'closed';
      await sleep(1000);
      await grab(`${tag}-reeks4-dicht`);
      await stop();
      rep.reeks = staat;
    }
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
hold = null; done = true;
clearInterval(skipper);
return JSON.stringify({ bruggen: results, fouten: issues.slice(0, 20) });
