
// --- own heli edge cases: exit in the air, load / death / unstuck mid-air, canal ditch, map edge ---
{
  const HF = await imp('heliflight'), SG = await imp('savegame'), SF = await imp('safety'), CB = await imp('combat');
  const mk = async (x, y, label) => {
    tag('heli2-' + label);
    if (p.inVehicle) p.exitVehicle(map, w);
    teleport(x, y); await sleep(1200);
    const gz = map.groundHeightAt(p.x, p.y, 0) || 0;
    const v = HF.makeHeli(p.x + 6, p.y, gz, p.angle);
    v.playerOwned = true; w.vehicles.push(v);
    p.x = v.x; p.y = v.y; p.enterVehicle(v, w);
    down('w'); try { const t9 = performance.now(); while (v.z < gz + 12 && performance.now() - t9 < 12000) await sleep(200); } finally { up('w'); }
    if (!(v.z > gz + 3)) issue('heli', `${label}: did not climb (z ${v.z.toFixed(2)} gz ${gz.toFixed(2)} rotor ${(v.rotor || 0).toFixed(2)} hp ${Math.round(v.health)} dis ${!!v.disabled} lock ${w.startLockUntil > w.time} inV ${p.inVehicle === v} keys ${[...w.input.keys].join('')} fps ${Math.round(1000 * B.frames.n[B.tag] / B.frames.sum[B.tag])} st ${JSON.stringify(window.__heli.state())})`);
    return v;
  };
  const sane = (v, label) => {
    if (!fin(v.x, v.y, v.z, v.vz, v.angle)) issue('NaN', `heli ${label}: ${v.x},${v.y},${v.z}`);
    if (!fin(p.x, p.y, p.gz, p.z)) issue('NaN', `player ${label}`);
  };
  w.devInvuln = true;
  SG.saveGame(w, { toast: false });
  // E in the air keeps you in
  let v = await mk(...P(100, 77), 'exit-air');
  await tap('e'); await sleep(400);
  if (p.inVehicle !== v) issue('heli', 'E in the air let the player out at z ' + v.z.toFixed(1));
  // load mid-air
  tag('heli2-load');
  SG.loadLatestSave(w); await sleep(4000); await quiet();
  sane(v, 'after load');
  if (p.inVehicle) issue('heli', 'still in heli after load');
  if (!v.onGround && w.vehicles.includes(v)) issue('heli', `driverless heli still in the air 4 s after load (z ${v.z.toFixed(1)})`);
  await moved(() => hold(['w'], 900), 'walk after heli load');
  removeVeh(v);
  // death mid-air
  v = await mk(...P(400, 300), 'death');
  w.devInvuln = false; CB.damagePlayer(w, 999);
  for (let i = 0; i < 160 && (w.pendingRespawn || cine.isCinematicActive()); i++) await sleep(250);
  w.devInvuln = true;
  sane(v, 'after death');
  if (p.inVehicle) issue('heli', 'still in heli after death');
  await sleep(2000);
  await moved(() => hold(['w'], 900), 'walk after heli death');
  removeVeh(v);
  // unstuck mid-air
  v = await mk(...P(-300, 500), 'unstuck');
  SF.unstuck(w); await sleep(1500);
  sane(v, 'after unstuck');
  log('heli after unstuck', JSON.stringify(window.__heli.state()), 'inV', !!p.inVehicle, 'pz', p.gz, p.z);
  if (p.inVehicle) { await hold(['s'], 1500); }
  if (p.inVehicle && HF.heliExitBlock(v)) issue('heli', 'after Vastgelopen the heli cannot be left: ' + HF.heliExitBlock(v));
  if (p.inVehicle) p.exitVehicle(map, w);
  removeVeh(v);
  // into the canal
  v = await mk(...P(0, -300), 'canal');
  [v.x, v.y] = P(-33, -259.5); p.x = v.x; p.y = v.y; await sleep(500);
  const t0 = performance.now();
  down('s'); try { while (!v.onGround && !v.sinking && !p.water && performance.now() - t0 < 15000) await sleep(200); } finally { up('s'); }
  await sleep(4000);
  sane(v, 'canal');
  log('heli canal', JSON.stringify({ sinking: !!v.sinking, onGround: v.onGround, surf: v.surfaceKind, inV: !!p.inVehicle, water: !!p.water, z: v.z }));
  if (p.inVehicle === v && v.sinking) issue('heli', 'player still inside a sinking heli after 4 s');
  if (p.water) { p.leaveWater && p.leaveWater(); }
  if (p.inVehicle) p.exitVehicle(map, w);
  removeVeh(v);
  // the map edge: the soft wall turns it back
  const [bx0, by0] = map.meta.bounds;
  const CR = await imp('countryreal');
  const E = CR.REAL.ext || [bx0, by0];
  v = await mk(E[0] + 120, (E[1] + E[3]) / 2 || 0, 'edge');
  v.angle = Math.PI; w.camYaw = Math.PI;
  await hold(['arrowup', 'shift'], 6000);
  sane(v, 'edge');
  if (v.x < E[0] - 400) issue('heli', `flew ${Math.round(E[0] - v.x)} m past the west edge`);
  log('heli edge', Math.round(v.x - E[0]), 'm from the edge');
  await hold(['s'], 8000);
  if (p.inVehicle) p.exitVehicle(map, w);
  removeVeh(v);
  w.devInvuln = false;
}
