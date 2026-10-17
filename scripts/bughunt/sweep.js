
// --- sweep: a grid over the city and the Ommelanden, plus named places ---
{
  tag('sweep-init');
  for (let i = 0; i < 40 && (cine.isCinematicActive() || w.paused); i++) await sleep(250);
  log('start paused', JSON.stringify(await pausedWhy()), Math.round(p.x), Math.round(p.y));
  w.devInvuln = true;
  memSnap('start');
  const [bx0, by0, bx1, by1] = map.meta.bounds;
  const pts = [];
  const NX = window.__bhNX || 6, NY = window.__bhNY || 5;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) pts.push(['grid' + i + j, bx0 + (bx1 - bx0) * (i + 0.5) / NX, by0 + (by1 - by0) * (j + 0.5) / NY]);
  for (const l of (map.meta.landmarks || [])) pts.push(['lm:' + l.name, l.x, l.y]);
  const E = (await imp('provincemap')).provinceMapBounds();
  if (E) for (const [fx, fy] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.05], [0.05, 0.5], [0.95, 0.5], [0.5, 0.95]]) pts.push(['om' + fx + fy, E[0] + (E[2] - E[0]) * fx, E[1] + (E[3] - E[1]) * fy]);
  for (const s of (map.countryStations || [])) pts.push(['st:' + s.name, s.x, s.y]);
  const home = await imp('home');
  const hs = home.homeSpawnPoint();
  pts.push(['home', hs.x, hs.y]);
  pts.push(['museum', ...P(52.4, 799.0), false]);
  const lim = window.__bhLimit || 999;
  for (const [name, x, y, open] of pts.slice(0, lim)) {
    tag(name);
    R.points++;
    const s = teleport(x, y, open !== false);
    await sleep(2200);
    if (!fin(p.x, p.y)) { issue('NaN', 'player after teleport ' + name); continue; }
    if (await moved(() => hold(['w'], 1100), 'walk?', 0) < 0.6) await moved(() => hold(['s'], 1100), 'walk (W and S)');
    const car = spawnCar();
    if (car) await ride(car, 'car');
    const bike = spawnBike();
    await ride(bike, 'bike', 2200);
    const boat = spawnBoat();
    if (boat) { teleport(boat.x, boat.y, false); await ride(boat, 'boat', 1500); }
    if (R.points % 8 === 0) memSnap(name);
  }
  memSnap('sweep-end');
  // back to the first few spots: memory should not keep climbing
  for (const [name, x, y] of pts.slice(0, 4)) { tag('revisit-' + name); teleport(x, y); await sleep(2500); }
  memSnap('revisit');
  w.devInvuln = false;
}
