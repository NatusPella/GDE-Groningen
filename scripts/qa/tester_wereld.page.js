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
if (deel === 'gans') {
  // staat de gans op zijn poten? onderkant romp en poten in meters boven het gras, met de hoogte die animateGans geeft
  const W = await import('./js/wildlife.js');
  const THREE = window.__scene3d.THREE;
  const m = W.buildWildlifeMesh3D({ kind: 'gans' });
  W.animateWildlifeMesh3D(m, { kind: 'gans', speed: 0, bobSeed: 0.3, stride: 0 }, 1);
  m.updateMatrixWorld(true);
  const rij = [];
  m.traverse((o) => { if (o.isMesh) { const g = o.geometry; g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld); rij.push([o.isSkinnedMesh ? 'romp' : 'poot', +b.min.y.toFixed(3), +b.max.y.toFixed(3)]); } });
  out.gans = { schaal: m.scale.x, y: m.position.y, delen: rij };
  // een gans op een stuk gras voor de speler, een rustige en een opgeschrikte
  const p = world.player;
  const mkGans = (dx, dy, vlucht) => ({ kind: 'gans', x: p.x + dx, y: p.y + dy, angle: p.angle || 0, speed: vlucht ? 3.2 : 0, stride: 0, bobSeed: Math.random(), fleeT: vlucht ? 1e6 : 0, wanderTarget: { x: p.x + dx, y: p.y + dy }, waypointTimer: 1e6, homeX: p.x + dx, homeY: p.y + dy, homeRadius: 1, stateTimer: 1e6 });
  const g1 = mkGans(Math.cos(p.angle || 0) * 5, Math.sin(p.angle || 0) * 5, false);
  const g2 = mkGans(Math.cos((p.angle || 0) + 0.4) * 7, Math.sin((p.angle || 0) + 0.4) * 7, true);
  world.wildlife = (world.wildlife || []).concat([g1, g2]);
  out.speler = { x: p.x, y: p.y, angle: p.angle };
  await sleep(1500);
  await shot('gans');
}
if (deel === 'bord') {
  // de bordenatlassen (plaatsnaamborden, wegwijzers, portaalborden): bevat elke getekende cel inkt, en wat staat er op?
  const WP = await import('./js/worldplaces.js');
  const S3 = window.__scene3d;
  const towns = (WP.worldTownSigns() || []).filter((t) => t.kind === 'village' || t.kind === 'town').slice(0, 400);
  out.plaatsen = towns.length;
  const stap = Math.max(1, Math.floor(towns.length / 8));
  const res = [];
  for (let i = 0; i < towns.length && res.length < 8; i += stap) {
    const t = towns[i];
    const rp = world.map.nearestRoadPoint(t.x + 700, t.y, 600, true);
    world.player.x = rp ? rp.x : t.x + 700; world.player.y = rp ? rp.y : t.y;
    await sleep(5000);
    const stat = { plaats: t.n || t.name, kind: t.kind, borden: 0, leeg: 0, meshes: [] };
    S3.scene.traverse((o) => {
      if (!o.isMesh || !/^furniture:(boards|signs)$/.test(o.name)) return;
      const img = o.material.map && o.material.map.image;
      const uv = o.geometry.attributes.uv;
      const pos = o.geometry.attributes.position;
      if (!img || !uv) return;
      const cols = o.name.endsWith('boards') ? 4 : 4, rows = 16;
      const cw = img.width / cols, ch = img.height / rows;
      const g = img.getContext('2d');
      const seen = new Set();
      for (let q = 0; q + 5 < uv.count; q += 6) {
        let u = 9, v = 9; for (let z = 0; z < 6; z++) { u = Math.min(u, uv.getX(q + z)); v = Math.min(v, uv.getY(q + z)); }
        if (Math.hypot(pos.getX(q) - world.player.x, pos.getZ(q) - world.player.y) > 250) continue;
        const col = Math.floor(u * cols + 1e-4), row = Math.round((1 - v) * rows) - 1;
        if (col === 3 && row === 15) continue;
        const key = col + "," + row; if (seen.has(key)) continue; seen.add(key);
        const px = g.getImageData(col * cw, row * ch, cw, ch).data;
        const kleuren = new Map();
        for (let k = 0; k < px.length; k += 16) { const c = px[k] + ',' + px[k + 1] + ',' + px[k + 2] + ',' + px[k + 3]; kleuren.set(c, (kleuren.get(c) || 0) + 1); }
        stat.borden++;
        if (kleuren.size < 6) { stat.leeg++; if (stat.meshes.length < 4) stat.meshes.push([o.name, col, row, [...kleuren.keys()].slice(0, 3).join('|')].join(' ')); }
      }
    });
    res.push(stat);
    if (res.length === 2) await shot('bord-' + stat.plaats);
  }
  out.res = res;
}
if (deel === 'auto') {
  // wat staat er om de speler heen en wie kan er niet in? (E: findEnterableVehicle)
  const Vh = await import('./js/vehicle.js');
  const PC = await import('./js/parkedcars.js');
  await sleep(10000);
  const alle = [...world.vehicles, ...PC.sleepingParkedCars(world)];
  const tel = {}; const voorbeeld = [];
  for (const v of alle) {
    const kleur = String(v.model && v.model.color || '?').toLowerCase();
    const sleutel = [v.isPolice ? 'politie' : v.isBus ? 'bus' : v.isBoat ? 'boot' : v.isBike ? 'fiets' : v.isScooter ? 'scooter' : 'auto', v.driver ? 'driver=' + v.driver : 'vrij', v.parked ? 'geparkeerd' : v.road ? 'verkeer' : 'los', v.disabled ? 'kapot' : ''].join(' ');
    // staat de speler ernaast: kan E hem pakken?
    const p = world.player; const was = [p.x, p.y, p.gz, p.z];
    p.x = v.x; p.y = v.y;
    const f = Vh.findEnterableVehicle(p.x, p.y, alle.filter((q) => !q.sleeping), 1.8);
    p.x = was[0]; p.y = was[1];
    const ok = f === v;
    tel[sleutel + (ok ? ' OK' : ' NIET')] = (tel[sleutel + (ok ? ' OK' : ' NIET')] || 0) + 1;
    if (!ok && voorbeeld.length < 20) voorbeeld.push([sleutel, kleur, v.model && v.model.name, Math.round(v.x), Math.round(v.y), 'wakker=' + world.vehicles.includes(v), 'gevonden=' + (f ? f.id : null)].join(' | '));
  }
  out.aantal = alle.length; out.tel = tel; out.voorbeeld = voorbeeld;
}
if (deel === 'taxi') {
  const V = await import('./js/models3d_vehicles.js');
  // de stad in: waar de taxi's rijden (het begin van een nieuw spel is dat al)
  out.speler = { x: world.player.x, y: world.player.y };
  const taxis = () => world.vehicles.filter((v) => v.isTaxi);
  out.taxis0 = taxis().length;
  const log = []; let keer = 0, zonder = 0, flips = 0, vorige = null;
  const t0 = performance.now();
  while (performance.now() - t0 < (window.__tb.maxS - 40) * 1000) {
    if (window.__reklametaxi && !(window.__reklametaxi.staat().taxi)) window.__reklametaxi.nu();
    const s = window.__reklametaxi ? window.__reklametaxi.staat() : null;
    if (s && s.taxi != null) {
      const v = world.vehicles.find((q) => q.id === s.taxi);
      const mesh = v ? V.getVehicleMesh(v.id) : null;
      const kind = mesh ? mesh.children.filter((c) => c.isGroup).length : -1;
      const toestand = s.bord ? 'bord' : mesh ? 'geen-bord-wel-mesh' : 'geen-mesh';
      if (toestand !== vorige) { flips++; if (log.length < 40) log.push([Math.round(performance.now() - t0), s.taxi, toestand, v ? Math.round(Math.hypot(v.x - world.player.x, v.y - world.player.y)) : null, v ? Math.round(v.speed * 10) / 10 : null].join(' ')); vorige = toestand; }
      keer++; if (!s.bord) zonder++;
    } else vorige = null;
    await sleep(100);
  }
  out.metingen = keer; out.zonderBord = zonder; out.wissels = flips; out.log = log;
}
return JSON.stringify({ results: { wereld: out } });
