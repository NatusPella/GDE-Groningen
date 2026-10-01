
// --- own heli: take off, fly, hover, land on the ground, land on the home deck and park ---
{
  tag('heli-own');
  const HF = await imp('heliflight');
  w.devInvuln = true;
  const home = await imp('home');
  const hs = home.homeSpawnPoint();
  teleport(hs.x + 40, hs.y - 30); await sleep(1500);
  const gz = map.groundHeightAt(p.x, p.y, 0) || 0;
  const v = HF.makeHeli(p.x + 6, p.y, gz, p.angle);
  v.playerOwned = true; v.bhTemp = true;
  w.vehicles.push(v);
  p.x = v.x; p.y = v.y;
  p.enterVehicle(v, w);
  if (p.inVehicle !== v) issue('heli', 'could not enter own heli');
  const st = () => window.__heli.state() || {};
  down('w'); try { const t9 = performance.now(); while (v.z < gz + 30 && performance.now() - t9 < 12000) await sleep(200); } finally { up('w'); }
  log('heli after climb', JSON.stringify(st()));
  if (!(v.z > gz + 3)) issue('heli', `did not climb: z ${v.z} ground ${gz}`);
  const x0 = v.x, y0 = v.y;
  await hold(['arrowup'], 2500);
  if (Math.hypot(v.x - x0, v.y - y0) < 5) issue('heli', 'did not fly forward');
  await hold(['d'], 800);
  await hold([' '], 1500);
  // descend to the ground
  const t0 = performance.now();
  down('s'); try { while (!v.onGround && performance.now() - t0 < 20000) await sleep(200); } finally { up('s'); }
  await sleep(1000);
  log('heli landed', JSON.stringify(st()), 'inV', p.inVehicle === v, 'in world', w.vehicles.includes(v), 'wrecked', !!v.wrecked, 'sinking', !!v.sinking, 'xyz', Math.round(v.x), Math.round(v.y), v.z.toFixed(1));
  if (!v.onGround) issue('heli', 'did not land within 20 s holding S ' + JSON.stringify(st()));
  const blk = HF.heliExitBlock(v);
  if (!blk && p.inVehicle) { p.exitVehicle(map, w); await sleep(400); if (p.inVehicle) issue('heli', 'exit failed on the ground'); await moved(() => hold(['w'], 800), 'walk after heli'); }
  else log('heli exit blocked on ground:', blk, JSON.stringify(st()));
  if (!fin(p.x, p.y, p.gz, p.z)) issue('NaN', 'player after heli exit');
  // home deck landing: start right above the pad
  tag('heli-deck');
  const pad = window.__heli.pads().find((q) => q.id === 'home');
  if (!pad) issue('heli', 'no home pad registered');
  else {
    if (p.inVehicle !== v) { p.x = v.x; p.y = v.y; p.enterVehicle(v, w); }
    v.x = pad.x; v.y = pad.y; v.z = pad.z + 14; v.onGround = false; v.airborne = true; v.vx = 0; v.vy = 0; v.vz = 0; v.speed = 0; v.driftX = 0; v.driftY = 0; v.rotor = 1;
    p.x = v.x; p.y = v.y;
    await sleep(800);
    const t1 = performance.now();
    down('s'); try { while (!v.onGround && performance.now() - t1 < 20000) await sleep(200); } finally { up('s'); }
    await sleep(1200);
    const s2 = st();
    log('heli on deck', JSON.stringify(s2));
    if (!v.onGround || s2.pad !== 'home') issue('heli', 'deck landing failed ' + JSON.stringify(s2));
    if (Math.abs(v.z - pad.z) > 0.6) issue('heli', `deck height ${v.z} vs pad ${pad.z}`);
    await tap('e'); await sleep(3000); await quiet();
    log('after E on deck', JSON.stringify({ inV: !!p.inVehicle, x: Math.round(p.x), y: Math.round(p.y), gz: p.gz, z: p.z, heli: st(), flat: home.inHomeFlat && home.inHomeFlat() }));
    if (!fin(p.x, p.y, p.gz, p.z)) issue('NaN', 'player after deck park');
    if (p.inVehicle) { issue('heli', 'E on the home deck did not let the player out: ' + HF.heliExitBlock(v)); }
    await moved(() => hold(['w'], 800), 'walk after deck park', 0.2);
    if (window.__home && window.__home.leave) { window.__home.leave(); await sleep(2500); await quiet(); }
  }
  if (p.inVehicle) p.exitVehicle(map, w);
  removeVeh(v);
  w.devInvuln = false;
}
