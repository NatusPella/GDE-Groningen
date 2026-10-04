
// --- settings, weather/time, combat, swimming, purchases, misc input ---
{
  const PM5 = await imp('pausemenu'), SU5 = await imp('shopui'), SH5 = await imp('shops'), CB5 = await imp('combat');
  const step = async (name, fn) => { tag(name); try { await fn(); } catch (e) { issue('script', `${name}: ${e && e.message}`); } await quiet(); };
  w.devInvuln = true;
  teleport(100, 77); await sleep(1500);

  await step('settings', async () => {
    PM5.openPauseMenu('settings'); await sleep(500);
    const els = [...document.querySelectorAll('#pause-menu [data-setting]')];
    log('settings controls', els.length, els.map((e) => e.dataset.setting).join(','));
    for (const el of els) {
      tag('set:' + el.dataset.setting);
      const fire = () => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      if (el.tagName === 'SELECT') {
        const orig = el.value;
        for (const o of el.options) { el.value = o.value; fire(); await sleep(350); }
        el.value = orig; fire();
      } else if (el.type === 'checkbox') {
        el.checked = !el.checked; fire(); await sleep(400); el.checked = !el.checked; fire();
      } else if (el.type === 'range') {
        const orig = el.value;
        el.value = el.min; fire(); await sleep(250); el.value = el.max; fire(); await sleep(250); el.value = orig; fire();
      } else if (el.tagName === 'BUTTON') {
        el.click(); await sleep(300);
      }
      await sleep(150);
    }
    PM5.closePauseMenu();
    await sleep(1500);
    await moved(() => hold(['w'], 800), 'walk after settings', 0.3);
  });

  await step('night-rain', async () => {
    w.clock = 23; w.weather.active = true; w.weather.intensity = 1; w.weather.duration = 120; w.weather.elapsed = 0;
    await sleep(3000);
    const car = spawnCar(); if (car) await ride(car, 'car (rain, night)', 2000);
    w.clock = 5.5; await sleep(2000);
    w.weather.active = false; w.weather.intensity = 0; w.clock = 12;
    await sleep(1500);
  });

  await step('combat', async () => {
    teleport(100, 77); await sleep(1500);
    for (const k of CB5.WEAPON_KEYS) w.ammo[k] = CB5.WEAPONS[k].ammo === Infinity ? Infinity : 30;
    const rig = (await imp('pedestrians'));
    for (const k of CB5.WEAPON_KEYS) {
      tag('weapon:' + k);
      w.weapon = k;
      const ped = w.pedestrians.filter((q) => q.state !== 'dead').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (ped) { p.angle = Math.atan2(ped.y - p.y, ped.x - p.x); w.camYaw = p.angle; }
      w.input.mouse.down = true;
      try { await sleep(900); } finally { w.input.mouse.down = false; }
      await sleep(900);
      if (!fin(p.x, p.y)) issue('NaN', 'player after ' + k);
    }
    w.weapon = 'fists';
    // shoot from a car
    const car = spawnCar();
    if (car) { p.enterVehicle(car, w); w.weapon = 'uzi'; w.input.mouse.down = true; try { await hold(['w'], 1200); } finally { w.input.mouse.down = false; } if (p.inVehicle) p.exitVehicle(map, w); removeVeh(car); }
    // blow up a car next to you and try to get in the wreck
    const c2 = spawnCar();
    if (c2) {
      VEH.explodeVehicle(c2, w); await sleep(2500);
      p.enterVehicle(c2, w);
      if (p.inVehicle === c2) issue('vehicle', 'could enter a wreck');
      if (p.inVehicle) p.exitVehicle(map, w);
    }
    w.weapon = 'fists'; w.wanted = 0; w.health = 100;
    await sleep(1500);
    await moved(() => hold(['w'], 900), 'walk after combat', 0.3);
  });

  await step('swim', async () => {
    teleport(-33.0, -259.5, false); await sleep(300);
    if (p.enterSwim) p.enterSwim();
    await sleep(500);
    if (!p.water) { log('no swim state at canal spot'); return; }
    await moved(() => hold(['w'], 2000), 'swim', 0.5);
    for (let i = 0; i < 6 && p.water; i++) { await tap('e'); await hold(['w'], 800); }
    log('after swim', JSON.stringify({ water: !!p.water, x: Math.round(p.x), y: Math.round(p.y), gz: p.gz }));
    if (p.water && p.leaveWater) p.leaveWater();
  });

  await step('jump-crouch-kiss', async () => {
    teleport(100, 77); await sleep(1200);
    await tap(' ', 80); await sleep(700);
    down('control'); await sleep(600); up('control');
    await tap('k', 60); await sleep(1500);
    await moved(() => hold(['w'], 900), 'walk after jump/crouch/kiss', 0.3);
  });

  await step('purchases', async () => {
    w.money = 999999;
    const seen = new Set();
    for (const s of SH5.getShopsForRender()) {
      if (seen.has(s.type)) continue; seen.add(s.type);
      tag('buy:' + s.type);
      teleport(s.x, s.y, false); await sleep(900);
      await tap('e'); await sleep(600);
      if (!SU5.isShopOpen()) continue;
      let bought = 0;
      for (const it of [...document.querySelectorAll('#shop-menu .sm-item[aria-disabled="false"]')].slice(0, 6)) {
        if (bought >= 2 || !SU5.isShopOpen()) break;
        it.click(); await sleep(200);
        const b = document.querySelector('#shop-menu .sm-buy');
        if (!b || b.getAttribute('aria-disabled') === 'true') continue;
        const m0 = w.money;
        b.click(); await sleep(250);
        if (b.classList.contains('armed')) { b.click(); await sleep(400); }
        if (w.money !== m0) bought++;
        await quiet(6000);
      }
      log('bought', s.type, bought);
      if (SU5.isShopOpen()) SU5.closeShopMenu();
      await sleep(400); await quiet();
      if (p.inVehicle) p.exitVehicle(map, w);
      await expectClear('buy ' + s.type);
    }
    log('owned', JSON.stringify(SH5.getOwnedEntries().map((o) => o.key)));
  });

  await step('phone-vehicles', async () => {
    // Henk (Telefoon › Contacten) brings a vehicle round
    teleport(100, 77); await sleep(1200);
    PM.openPauseMenu('telefoon', { sub: 'contacten' }); await sleep(400);
    const henk = [...document.querySelectorAll('#pause-menu [data-ph-contact]')].find((b) => /Knalpot/i.test(b.textContent));
    if (!henk) { issue('phone', 'no Garage Knalpot contact'); PM.closePauseMenu(); return; }
    henk.click(); await sleep(1400);
    const acts = [...document.querySelectorAll('#pause-menu [data-ph-act]')];
    log('henk actions', acts.map((a) => a.textContent.trim()).join(' | ').slice(0, 200));
    const bring = acts.find((a) => /^Breng|Bezorgen/.test(a.textContent.trim())) || acts[0];
    if (bring) { bring.click(); await sleep(800); }
    if (PM.isPauseMenuOpen()) PM.closePauseMenu();
    await sleep(3000); await quiet();
    await expectClear('phone vehicles');
  });

  await step('pause-actions', async () => {
    for (const a of ['unstuck', 'home']) {
      tag('pm:' + a);
      PM5.openPauseMenu('game'); await sleep(400);
      const b = document.querySelector(`#pause-menu [data-action="${a}"]`);
      if (!b || b.disabled || b.hidden) { log('no pause action', a); PM5.closePauseMenu(); continue; }
      b.click(); await sleep(800);
      const c = document.querySelector('#pause-menu .pm-confirm button, #pause-menu [data-confirm]');
      if (PM5.isPauseMenuOpen() && c) { c.click(); await sleep(600); }
      if (PM5.isPauseMenuOpen()) PM5.closePauseMenu();
      await sleep(3000); await quiet();
      await expectClear('pause action ' + a);
      await moved(() => hold(['w'], 900), 'walk after pause ' + a, 0.3);
    }
  });
  w.devInvuln = false;
  memSnap('acts2-end');
}
