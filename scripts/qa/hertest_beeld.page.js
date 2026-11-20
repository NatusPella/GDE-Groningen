// Page half van scripts/qa/hertest_beeld.mjs (desktop --perf-script body): beeldrun voor de hertest-top-30 (docs/HERTEST-TRIAGE.md).
// window.__ht = { only: ['brug','water',...], plekken: {...} }. Elk beeld gaat via console.log('[capture] <naam>') naar devtools.js
// (shots-<naam>.png naast shots.png). Metingen komen in het JSON-resultaat. Wegwerpprofiel, niets naar echte opslag.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) { await tap('Enter', 'Enter'); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map; const sc = window.__scene3d;
const CFG = window.__ht || { only: [] };
const ON = (id) => !CFG.only.length || CFG.only.includes(id);
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
for (let i = 0; i < 10 && cine.isCinematicActive(); i++) { key('keydown', ' ', 'Space'); await sleep(2500); key('keyup', ' ', 'Space'); await sleep(1500); }
await sleep(3000);
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); }
const { isInWater } = await imp('util');
const VH = await imp('vehicle');
const DN = await imp('daynight');
const PG = await imp('pedgeom').catch(() => null);
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const out = { stappen: {} };
const note = (id, o) => { out.stappen[id] = Object.assign(out.stappen[id] || {}, o); };
const cap = async (name, wait = 1800) => { await sleep(wait); fixWorld(); console.log('[capture] ' + name); await sleep(600); };
const jump = async (x, y, settle = 5000) => {
  camOff();
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !document.getElementById('load-screen'); i++) await sleep(100);
  for (let i = 0; i < 400 && document.getElementById('load-screen'); i++) await sleep(100);
  await sleep(settle);
  p.x = x; p.y = y; p.gz = gh(x, y);
  fixWorld();
};
// de cinematics-laag wist world.cameraOverride zodra er geen filmpje loopt: een vaste stand gaat dus via een eigen cinematic (shot geeft de pose)
let curPose = null;
const cam = (x, y, z, lx, ly, lz, fov = 60) => {
  curPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
  if (!cine.isCinematicActive()) cine.playCinematic({ id: 'ht-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => curPose });
};
const camOff = () => { curPose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
const spawn = (model, x, y, a) => { const v = new VH.Vehicle(x, y, a, { ...model }); v.speed = 0; w.vehicles.push(v); return v; };
const hold = new Set();
const press = (k, c) => { key('keydown', k, c); hold.add([k, c]); };
const releaseAll = () => { for (const [k, c] of hold) key('keyup', k, c); hold.clear(); };
const modelOf = (name, nth = 0) => VH.TRAFFIC_MODELS().filter((m) => m.name === name)[nth];
const buildingNear = (x, y, r) => (map.buildingsNear ? map.buildingsNear(x, y, r).length : 0);
const wet = (x, y) => !!isInWater(map, x, y);
const heading = (dx, dy) => Math.atan2(dy, dx);
const pts = { visvlietBrug: [-20762, -5195], zuidhornStation: [-10616, -3026], warffumStation: [-188, -18992], noordStation: [-582, -1173], bourtange: [42473, 22807], marum: [-19954, 8661], usquert: [2776, -20413] };

try {
  // ---- #884 brug bij Visvliet --------------------------------------------------------------
  if (ON('brug')) {
    const [bx, by] = pts.visvlietBrug;
    await jump(bx, by, 6000);
    const z = gh(bx, by);
    cam(bx + 40, by - 40, z + 30, bx, by, z, 60); await cap('ht884-brug-schuin');
    cam(bx + 14, by + 0, z + 5, bx - 4, by - 8, z + 1.5, 70); await cap('ht884-brug-dek');
    cam(bx - 6, by - 12, z - 0.5, bx, by, z + 1, 80); await cap('ht884-brug-onder');
    note('brug', { z: +z.toFixed(2), waterOpBrug: wet(bx, by) });
  }
  // ---- water en kade: #918 #936 #949 -------------------------------------------------------
  if (ON('water')) {
    const [cx, cy] = pts.visvlietBrug;
    const sites = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071]];
    await jump(cx + 300, cy + 300, 5000);
    for (let ox = -500; ox <= 500 && sites.length < 3; ox += 8) for (let oy = -500; oy <= 500 && sites.length < 3; oy += 8) {
      const x = cx + ox, y = cy + oy;
      if (wet(x, y) || buildingNear(x, y, 12)) continue;
      for (const [dx, dy] of dirs) {
        let edge = null;
        for (let d = 1; d <= 60; d += 1) { if (wet(x + dx * d, y + dy * d)) { edge = d; break; } if (buildingNear(x + dx * d, y + dy * d, 6)) break; }
        if (edge === null || edge < 40) continue; // lange aanloop nodig voor de snelle proef
        if (!wet(x + dx * (edge + 4), y + dy * (edge + 4)) || !wet(x + dx * (edge + 2), y + dy * (edge + 2))) continue; // geen smal slootje
        let schoon = true;
        for (let d = -8; d < edge; d += 2) if (wet(x + dx * d, y + dy * d) || buildingNear(x + dx * d, y + dy * d, 4)) { schoon = false; break; }
        if (!schoon) continue;
        sites.push({ x, y, dx, dy, edge }); break;
      }
    }
    note('water', { gevonden: sites.length, sites: sites.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), edge: s.edge })) });
    let n = 0;
    for (const s of sites.slice(0, 2)) {
      n++;
      const ex = s.x + s.dx * s.edge, ey = s.y + s.dy * s.edge;
      await jump(ex - s.dx * 5, ey - s.dy * 5, 5000);
      const z = gh(ex, ey);
      // luchtbeeld en laag beeld van de oever (#918: gras over water)
      cam(ex - s.dx * 14 + 6, ey - s.dy * 14 - 6, z + 14, ex, ey, z, 60); await cap(`ht918-oever${n}-lucht`);
      cam(ex - s.dx * 6, ey - s.dy * 6, z + 1.6, ex + s.dx * 6, ey + s.dy * 6, z, 70); await cap(`ht918-oever${n}-laag`);
      camOff();
      // #936: rustig tegen de oever (start 2,5 m voor de rand: blijft onder 9 m/s) en #949: snel eroverheen
      for (const [soort, voor] of [['rustig', 2.5], ['snel', 40]]) {
        if (p.inVehicle) p.exitVehicle(map, w);
        const sx = ex - s.dx * voor, sy = ey - s.dy * voor;
        await jump(sx, sy, 3500);
        const car = spawn(modelOf('hatch', 0), sx, sy, heading(s.dx, s.dy));
        p.enterVehicle(car, w);
        w.camYaw = car.angle;
        await sleep(700);
        press('w', 'KeyW');
        const tr = [];
        const t0 = performance.now();
        let shot1 = false, shot2 = false;
        while (performance.now() - t0 < 9000) {
          await sleep(250);
          const t = (performance.now() - t0) / 1000;
          const dEdge = (car.x - ex) * s.dx + (car.y - ey) * s.dy; // >0: voorbij de rand
          tr.push({ t: +t.toFixed(1), v: +car.speed.toFixed(1), voorbijRand: +dEdge.toFixed(1), inWater: wet(car.x, car.y), z: +(car.z || 0).toFixed(2), vis: !!(sc.actors().vehicles.get(car.id) && sc.actors().vehicles.get(car.id).visible) });
          if (soort === 'snel' && !shot1 && dEdge > 1) { shot1 = true; await cap(`ht949-${n}-${soort}-over-de-rand`, 300); }
          if (t > 4 && !shot2) { shot2 = true; await cap(`ht936-${n}-${soort}-na-4s`, 100); }
        }
        releaseAll();
        await cap(`ht936-${n}-${soort}-eind`, 300);
        note('water', { ['proef' + n + soort]: { eind: tr[tr.length - 1], max: Math.max(...tr.map((q) => q.voorbijRand)), traject: tr.filter((_, i) => i % 4 === 0) } });
        if (p.inVehicle) p.exitVehicle(map, w);
        const i = w.vehicles.indexOf(car); if (i >= 0) w.vehicles.splice(i, 1);
      }
    }
  }
  // ---- #970 politieauto/auto door gebouwmuur -------------------------------------------------
  if (ON('muur')) {
    const [cx, cy] = pts.usquert;
    await jump(cx, cy, 6000);
    const bl = [];
    for (let r = 20; r <= 200 && bl.length < 3; r += 20) for (const b of (map.buildingsNear ? map.buildingsNear(cx, cy, r) : [])) {
      if (bl.includes(b) || !b.pts || b.pts.length < 4) continue;
      const bb = b.bounds || b.bbox; // gebruik het midden van de eerste wand
      const a0 = b.pts[0], a1 = b.pts[1];
      const mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2;
      const len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      if (len < 4) continue;
      let nx = -(a1[1] - a0[1]) / len, ny = (a1[0] - a0[0]) / len;
      // buitenkant: een punt op 2 m dat NIET in het pand ligt
      if (PG && PG.isInsideBuilding(map, mx + nx * 2, my + ny * 2)) { nx = -nx; ny = -ny; }
      if (PG && PG.isInsideBuilding(map, mx + nx * 2, my + ny * 2)) continue;
      let vrij = true;
      for (let d = 2; d < 14; d += 2) if (PG && PG.isInsideBuilding(map, mx + nx * d, my + ny * d)) vrij = false;
      if (!vrij) continue;
      bl.push(b); b._qa = { mx, my, nx, ny };
    }
    note('muur', { panden: bl.length });
    let k = 0;
    for (const b of bl) {
      k++;
      const { mx, my, nx, ny } = b._qa;
      const sx = mx + nx * 12, sy = my + ny * 12;
      await jump(sx, sy, 3500);
      const car = spawn(k === 1 ? VH.POLICE_MODEL : modelOf('sedan', 0), sx, sy, heading(-nx, -ny));
      if (k === 1) car.isPolice = true;
      p.enterVehicle(car, w); w.camYaw = car.angle;
      await sleep(600);
      press('w', 'KeyW');
      let binnen = 0, maxDiep = 0;
      for (let i = 0; i < 24; i++) {
        await sleep(250);
        if (PG && PG.isInsideBuilding(map, car.x, car.y)) binnen++;
        maxDiep = Math.max(maxDiep, -((car.x - mx) * nx + (car.y - my) * ny));
      }
      releaseAll();
      await cap(`ht970-muur${k}-${k === 1 ? 'politie' : 'sedan'}`, 200);
      note('muur', { ['pand' + k]: { soort: k === 1 ? 'politie' : 'sedan', binnenFrames: binnen, maxDiepteIn: +maxDiep.toFixed(2), eind: [Math.round(car.x), Math.round(car.y)], hp: car.health } });
      p.exitVehicle(map, w);
      const i = w.vehicles.indexOf(car); if (i >= 0) w.vehicles.splice(i, 1);
    }
  }
  // ---- #923 #547 #942: de Knakker (hatch) van buiten, binnen en na schade ---------------------
  if (ON('knakker')) {
    const [cx, cy] = pts.usquert;
    await jump(cx + 30, cy + 10, 5000);
    const z = gh(cx + 30, cy + 10);
    const car = spawn(modelOf('hatch', 0), cx + 30, cy + 10, 0.4);
    const stil = setInterval(() => { car.speed = 0; }, 30);
    await sleep(1500);
    const vx = car.x, vy = car.y;
    cam(vx + 3.6, vy - 3.6, z + 2.2, vx, vy, z + 0.9, 45); await cap('ht923-knakker-schuin');
    cam(vx + 1.2, vy - 2.6, z + 1.35, vx, vy, z + 1.0, 55); await cap('ht923-knakker-raam');
    cam(vx, vy, z + 3.2, vx, vy + 0.01, z, 50); await cap('ht923-knakker-boven');
    camOff();
    // binnenin: eerste persoon
    p.enterVehicle(car, w); w.camYaw = car.angle;
    await sleep(1200);
    const FP = await imp('firstperson').catch(() => null);
    if (FP && FP.setFirstPerson) { FP.setFirstPerson(w, true); await sleep(1200); await cap('ht547-knakker-binnen'); FP.setFirstPerson(w, false); }
    await sleep(500);
    p.exitVehicle(map, w);
    // schade: 80% weg, daarna schuin beeld (interieur moet meebewegen)
    car.health = 22;
    try { car.dents = car.dents || []; } catch (e) { /* */ }
    for (let i = 0; i < 3; i++) VH.vehicleHitBody(car, car.x, car.y, 1, 0, w);
    car.roll = 0.06; car.pitch = 0.05;
    await sleep(1200);
    cam(vx + 3.6, vy - 3.6, z + 2.2, vx, vy, z + 0.9, 45); await cap('ht942-knakker-schade-schuin');
    cam(vx + 1.2, vy - 2.6, z + 1.35, vx, vy, z + 1.0, 55); await cap('ht942-knakker-schade-raam');
    clearInterval(stil);
    note('knakker', { hp: car.health });
    const i = w.vehicles.indexOf(car); if (i >= 0) w.vehicles.splice(i, 1);
    camOff();
  }
  // ---- stations: #961 #927 ------------------------------------------------------------------
  if (ON('station')) {
    for (const [naam, [sx, sy]] of [['zuidhorn', pts.zuidhornStation], ['warffum', pts.warffumStation], ['noord', pts.noordStation]]) {
      await jump(sx, sy, 6500);
      const z = gh(sx, sy);
      cam(sx + 30, sy - 30, z + 32, sx, sy, z, 60); await cap(`ht961-${naam}-lucht`);
      cam(sx + 10, sy - 10, z + 7, sx, sy, z + 1, 65); await cap(`ht961-${naam}-perron`);
      camOff(); await cap(`ht961-${naam}-speler`);
      note('station', { [naam]: { x: Math.round(p.x), y: Math.round(p.y), z: +gh(p.x, p.y).toFixed(2) } });
    }
  }
  // ---- UI: #965 Spel > Overzicht, #977 kaart bij Marum ----------------------------------------------
  if (ON('ui')) {
    const PM = await imp('pausemenu');
    PM.openPauseMenu('spel', { sub: 'overzicht' });
    await sleep(1500);
    await cap('ht965-spel-overzicht-boven', 300);
    const root = document.getElementById('pause-menu');
    const tabs = root.querySelector('.pm-tabs, .pm-subtabs, [role=tablist]');
    const hero = root.querySelector('.pm-hero, h1, .ds-hero');
    const scrollers = [...root.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    note('ui', { scrollers: scrollers.map((e) => e.className + ':' + e.scrollHeight + '/' + e.clientHeight).slice(0, 4), tabsRect: tabs ? tabs.getBoundingClientRect().toJSON() : null, heroRect: hero ? hero.getBoundingClientRect().toJSON() : null, heroTekst: hero ? hero.textContent.trim().slice(0, 60) : null });
    for (const e of scrollers.slice(0, 2)) e.scrollTop = 120;
    await sleep(500);
    note('ui', { heroNaScroll: hero ? hero.getBoundingClientRect().toJSON() : null, tabsNaScroll: tabs ? tabs.getBoundingClientRect().toJSON() : null });
    await cap('ht965-spel-overzicht-gescrold', 300);
    PM.closePauseMenu && PM.closePauseMenu();
    await sleep(600);
  }
  if (ON('kaart')) {
    const PM = await imp('pausemenu');
    const MV = await imp('mapview');
    const [mx, my] = pts.marum;
    await jump(mx, my, 6000);
    PM.openPauseMenu('map');
    await sleep(2500);
    for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent) && b.getClientRects().length) b.click();
    await sleep(800);
    const st = [];
    for (const z of [6, 20, 60]) {
      MV.setMapView(mx, my, z);
      await sleep(3500);
      st.push(MV.getMapViewStats());
      await cap('ht977-kaart-marum-z' + z, 300);
    }
    note('kaart', { stats: st });
    PM.closePauseMenu();
    await sleep(600);
  }
  // ---- #937 #921: laden van wereld bij hoge snelheid (hapering) ---------------------------------------
  if (ON('stream')) {
    const [sx, sy] = [-14000, 2500]; // platteland ten westen van de stad, rijrichting oost (naar stad en dorpen)
    await jump(sx, sy, 6000);
    const a = 0.0, v = 55;
    const car = spawn(modelOf('sport', 0), sx, sy, a);
    p.enterVehicle(car, w); w.camYaw = a;
    await sleep(1500);
    const ft = []; let last = performance.now(); let run = true; let tAcc = 0;
    const lopen = { x: sx, y: sy };
    const stap = () => {
      const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
      lopen.x += Math.cos(a) * v * dt; lopen.y += Math.sin(a) * v * dt;
      car.x = lopen.x; car.y = lopen.y; car.angle = a; car.speed = v; car.driftX = car.driftY = 0; car.yawVel = 0;
      tAcc += dt; ft.push({ t: +tAcc.toFixed(2), ms: +(dt * 1000).toFixed(1), x: Math.round(car.x) });
      if (run) requestAnimationFrame(stap);
    };
    requestAnimationFrame(stap);
    let k = 0;
    while (tAcc < 40) { await sleep(5000); k++; await cap('ht937-stream-' + k, 100); }
    run = false;
    const ms = ft.map((q) => q.ms).sort((x, y) => x - y);
    const pct = (q) => ms[Math.min(ms.length - 1, Math.floor(ms.length * q))];
    note('stream', { frames: ft.length, mediaan: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: ms[ms.length - 1], boven50: ms.filter((m) => m > 50).length, boven100: ms.filter((m) => m > 100).length, grootste: ft.filter((q) => q.ms > 80).slice(0, 12), afstandM: Math.round(lopen.x - sx) });
    p.exitVehicle(map, w);
    const i = w.vehicles.indexOf(car); if (i >= 0) w.vehicles.splice(i, 1);
  }
  // ---- #539 groene plaat bij Garage Knalpot ----------------------------------------------------------
  if (ON('garage')) {
    const GA = await imp('garages');
    await jump(201, 45, 4000);
    const site = GA.nearestRepairSite(201, 45);
    note('garage', { site: site ? { x: Math.round(site.x), y: Math.round(site.y), keys: Object.keys(site).slice(0, 12) } : null });
    if (site) {
      await jump(site.x + 8, site.y + 8, 6000);
      const z = gh(site.x, site.y);
      cam(site.x + 28, site.y - 28, z + 22, site.x, site.y, z + 1, 60); await cap('ht539-garage-lucht');
      cam(site.x + 14, site.y - 3, z + 2.5, site.x, site.y, z + 1.5, 70); await cap('ht539-garage-straat');
      cam(site.x - 12, site.y + 12, z + 3, site.x, site.y, z + 1.5, 70); await cap('ht539-garage-achter');
      camOff(); await cap('ht539-garage-speler', 600);
    }
  }
  // ---- #954 het uitkijkpunt bij Bourtange (E-prompt) ----------------------------------------------------
  if (ON('uitkijk')) {
    const EX = await imp('explorationlive');
    const pts2 = (map.meta && map.meta.uitkijkpunten) || [];
    note('uitkijk', { aantal: pts2.length, streken: pts2.map((u) => u.streek) });
    const u = pts2.find((q) => q.streek === 'westerwolde') || null;
    if (u) {
      await jump(u.x, u.y, 7000);
      note('uitkijk', { punt: { x: Math.round(u.x), y: Math.round(u.y), naam: u.naam }, speler: [Math.round(p.x), Math.round(p.y)], prompt: EX.viewpointPrompt(w) });
      await cap('ht954-uitkijk-prompt', 800);
      await tap('e', 'KeyE', 120); await sleep(1200);
      note('uitkijk', { gebruikt: EX.isViewpointUsed(u), naPrompt: EX.viewpointPrompt(w) });
      await cap('ht954-uitkijk-na-e', 300);
    }
  }
  // ---- #540 camera bij trekker en bus ----------------------------------------------------------------
  if (ON('camera')) {
    const [cx, cy] = pts.usquert;
    const soorten = [['trekker', VH.TRACTOR_MODEL], ['bus', modelOf('bus', 0)]];
    for (const [naam, model] of soorten) {
      await jump(cx + 120, cy + 60, 4500);
      const r = (() => { let best = null; for (const rd of (map.roadsNear ? map.roadsNear(p.x, p.y, 80) : [])) for (let i = 0; i < rd.pts.length - 1; i++) { const a = rd.pts[i], b = rd.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - p.x, (a[1] + b[1]) / 2 - p.y); if (!best || d < best.d) best = { d, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; } return best; })();
      const bx = r ? r.x : p.x, by = r ? r.y : p.y, ba = r ? r.a : 0;
      const v = spawn(model, bx, by, ba);
      p.enterVehicle(v, w); w.camYaw = ba;
      await sleep(2500);
      const meet = [];
      const dist = () => { const q = sc.cam.position; return +Math.hypot(q.x - v.x, q.z - v.y).toFixed(2); };
      meet.push({ t: 0, afstand: dist(), hoogte: +(sc.cam.position.y - (v.z || 0)).toFixed(2) });
      await cap('ht540-' + naam + '-stil', 200);
      press('w', 'KeyW');
      for (let i = 1; i <= 8; i++) { await sleep(1000); meet.push({ t: i, v: +v.speed.toFixed(1), afstand: dist(), hoogte: +(sc.cam.position.y - (v.z || 0)).toFixed(2) }); }
      await cap('ht540-' + naam + '-rijdend', 200);
      // een bocht: de camera moet blijven volgen
      key('keydown', 'a', 'KeyA'); await sleep(1500); key('keyup', 'a', 'KeyA');
      meet.push({ t: 'bocht', afstand: dist(), hoogte: +(sc.cam.position.y - (v.z || 0)).toFixed(2) });
      await cap('ht540-' + naam + '-bocht', 200);
      releaseAll();
      note('camera', { [naam]: meet, lengte: model.len });
      p.exitVehicle(map, w);
      const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1);
    }
  }
  // ---- Bourtange uitkijkpunt #954 ------------------------------------------------------------
  if (ON('bourtange')) {
    const [bx, by] = pts.bourtange;
    await jump(bx, by, 7000);
    const z = gh(bx, by);
    cam(bx + 40, by - 40, z + 45, bx, by, z, 60); await cap('ht954-bourtange-lucht');
    camOff(); await cap('ht954-bourtange-speler');
    const sp = (map.lookouts || map.uitkijk || null);
    note('bourtange', { kandidaten: Object.keys(map).filter((k) => /uitkijk|lookout|view/i.test(k)) });
  }
  // ---- #969 de koeienmissie: is de schuur te zien en herkenbaar? ----------------------------------------------
  if (ON('koe')) {
    const K = await imp('pg_koe');
    const PGm = window.__postgame;
    PGm.unlock();
    const tbX = 0, tbY = 0;
    let S = K.getKoeSites(map);
    if (!S) { const t0 = Date.now(); S = await Promise.race([K.prepareKoeSites(map), sleep(40000).then(() => null)]); note('koe', { sitesMs: Date.now() - t0 }); }
    note('koe', { sites: !!S });
    if (S) {
      await jump(S.farm.x, S.farm.y, 6000);
      let gestart = false;
      // zoals een speler: bij het erf staan en E drukken (de koe staat niet in de lijst van `start` voor het harnas; PGm.start('koe') gaf false)
      for (let i = 0; i < 6 && !gestart; i++) { PGm.unlock(); await sleep(2500); note('koe', { spots: PGm.spots().map((q) => q.id) }); p.x = S.farm.x + 0.5; p.y = S.farm.y + 0.5; await tap('e', 'KeyE', 200); await sleep(2000); gestart = !!PGm.state(); }
      await sleep(5000);
      const doel = K.koeBarnTarget(S);
      note('koe', { gestart, state: PGm.state(), farm: [Math.round(S.farm.x), Math.round(S.farm.y)], schuur: doel && [Math.round(doel.x), Math.round(doel.y)], afstand: Math.round(S.dist) });
      await cap('ht969-erf-start', 500);
      note('koe', { doelmarker: w.challengeTarget ? { x: Math.round(w.challengeTarget.x), y: Math.round(w.challengeTarget.y) } : null, berichten: (w.hud && w.hud.messages ? w.hud.messages : []).slice(-3) });
      // van de weg af, 70 m en 25 m van de schuur, dan een luchtbeeld
      const a = S.hide.a + Math.PI; // van het erf af gekeken? de schuur kijkt naar de boerderij: de weg ligt aan die kant
      await jump(S.hide.x + Math.cos(S.hide.a) * 80, S.hide.y + Math.sin(S.hide.a) * 80, 8000);
      const z = gh(S.hide.x, S.hide.y);
      cam(S.hide.x + Math.cos(S.hide.a) * 70, S.hide.y + Math.sin(S.hide.a) * 70, z + 3, S.hide.x, S.hide.y, z + 3, 60); await cap('ht969-schuur-70m');
      cam(S.hide.x + Math.cos(S.hide.a) * 22, S.hide.y + Math.sin(S.hide.a) * 22, z + 2.5, S.hide.x, S.hide.y, z + 2, 65); await cap('ht969-schuur-22m');
      cam(S.hide.x + 120, S.hide.y - 120, z + 90, S.hide.x, S.hide.y, z, 55); await cap('ht969-schuur-lucht');
      camOff(); await cap('ht969-schuur-speler', 600);
      try { PGm.abort(); } catch (e) { /* weg */ }
    }
  }
  // ---- #933 politie buiten de stad: gaat er spontaan politie rijden bij 0 sterren? -----------------------------
  if (ON('politie')) {
    const [cx, cy] = pts.usquert;
    await jump(cx + 1500, cy + 500, 6000);
    w.wanted = 0;
    const tel = []; let max = 0;
    for (let i = 0; i < 18; i++) { await sleep(5000); const n = (w.vehicles || []).filter((v) => v.isPolice && !v.isBoat && Math.hypot(v.x - p.x, v.y - p.y) < 500).length; tel.push(n); max = Math.max(max, n); }
    note('politie', { wanted: w.wanted, tellingElke5s: tel, max });
    await cap('ht933-platteland-90s', 300);
  }
  // ---- #933 met sterren: komt er dan wel politie, en hoeveel in de stad bij 0 sterren? --------------------------
  if (ON('politie2')) {
    const [cx, cy] = pts.usquert;
    const tel = (r) => (w.vehicles || []).filter((v) => v.isPolice && !v.isBoat && Math.hypot(v.x - p.x, v.y - p.y) < r).length;
    // stad, 0 sterren: 60 s op de Grote Markt
    await jump(0, 0, 6000);
    w.wanted = 0;
    const stad = [];
    for (let i = 0; i < 12; i++) { await sleep(5000); stad.push(tel(500)); }
    note('politie2', { stad0sterren: stad, stadMax: Math.max(...stad) });
    await cap('ht933-stad-0-sterren', 300);
    // platteland, 2 sterren
    await jump(cx + 1500, cy + 500, 6000);
    w.wanted = 2;
    const land = [];
    for (let i = 0; i < 12; i++) { await sleep(5000); w.wanted = Math.max(w.wanted, 2); land.push(tel(500)); }
    note('politie2', { platteland2sterren: land, landMax: Math.max(...land) });
    await cap('ht933-platteland-2-sterren', 300);
    w.wanted = 0;
  }
  // ---- #930 route naar de kerk van Usquert: over de weg, niet over het kerkhof ----------------------------------
  if (ON('kerk')) {
    const RT = await imp('routing');
    const HP = await imp('herkenningspunten');
    const kerk = HP.HERKENNINGSPUNTEN.find((q) => /Usquert/.test(q.naam) && q.soort === 'church');
    note('kerk', { kerk: kerk && { x: kerk.x, y: kerk.y, naam: kerk.naam } });
    if (kerk) {
      await jump(kerk.x - 160, kerk.y + 60, 7000);
      let rt = null;
      for (const kind of ['walk', 'drive']) {
        RT.setUserWaypoint(kerk.x, kerk.y, kerk.naam);
        for (let i = 0; i < 80; i++) { const rs = RT.getRoutes(); rt = rs.length ? rs[rs.length - 1] : null; const e = rt && rt.pts && rt.pts[rt.pts.length - 1]; if (e && Math.hypot(e[0] - kerk.x, e[1] - kerk.y) < 150) break; rt = null; await sleep(250); }
        const pts2 = rt && (rt.pts || rt.points) || [];
        let kerkhof = 0, gebouw = 0;
        for (let i = 0; i < pts2.length - 1; i++) {
          const a = pts2[i], b = pts2[i + 1];
          if (RT.lineHitsCemetery(map, a[0], a[1], b[0], b[1])) kerkhof++;
          if (RT.lineHitsBuilding(map, a[0], a[1], b[0], b[1])) gebouw++;
        }
        note('kerk', { [kind]: { punten: pts2.length, segmentenOverKerkhof: kerkhof, segmentenDoorGebouw: gebouw, laatste: pts2.length ? pts2[pts2.length - 1].map((n) => Math.round(n)) : null } });
        break;
      }
      const z = gh(kerk.x, kerk.y);
      cam(kerk.x - 20, kerk.y + 10, z + 110, kerk.x - 20, kerk.y + 10, z, 55); await cap('ht930-kerk-route-lucht', 2500);
      cam(kerk.x - 60, kerk.y + 25, z + 6, kerk.x, kerk.y, z + 3, 65); await cap('ht930-kerk-route-grond', 1500);
      camOff();
      RT.clearUserWaypoint();
    }
  }
  // ---- #850 het vliegtuigpaneel bij aanraakbediening (start met --formaat=800x360 --touch) ------------------------
  if (ON('touchvlieg')) {
    await jump(1764 + 25, 9959 + 60, 6000);
    const kist = (w.vehicles || []).filter((v) => v.isPlane).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    note('touchvlieg', { kist: !!kist, venster: [window.innerWidth, window.innerHeight], touchUi: !!document.querySelector('#touch-ui, #touch-controls') });
    if (kist) {
      p.x = kist.x + 4; p.y = kist.y + 4; p.enterVehicle(kist, w);
      await sleep(3500);
      const el = document.querySelector('.hud-instr');
      const r = el && el.getBoundingClientRect();
      const knoppen = [...document.querySelectorAll('.t-btn')].filter((b) => b.getClientRects().length).map((b) => { const q = b.getBoundingClientRect(); return { t: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 16), r: [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)] }; });
      const over = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
      const pr = r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null;
      note('touchvlieg', { paneel: pr, plane: document.body.classList.contains('plane-flying'), knoppen: knoppen.slice(0, 24), overlap: pr ? knoppen.filter((k) => over(pr, k.r) > 0).map((k) => k.t + ':' + over(pr, k.r)) : [], labelPx: el ? [...el.querySelectorAll('*')].map((n) => parseFloat(getComputedStyle(n).fontSize)).filter((n) => n > 0).reduce((m, n) => Math.min(m, n), 99) : null });
      await cap('ht850-vliegtuigpaneel-touch', 800);
    }
  }
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 700); }
releaseAll();
camOff();
return JSON.stringify(out);
