// Pagina-helft voor scripts/qa/boerderij_beeld.mjs --page=trekker_cam.page.js (trekkercamera, derde persoon): zet een trekker, een maaidorser,
// een bus en (als controle) een sedan op het erf, stapt erin en neemt per voertuig een beeld van de volgcamera. Logt de camerastand in de
// lokale as van het voertuig (lx, lz, hoogte boven de wielen) naast het dak, zodat 'binnen of achter de cabine' met getallen te zien is.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const PRE = (window.__bd && window.__bd.prefix) || 'x';
const imp = (f) => import('/js/' + f + '.js');
const uit = { stand: [], fouten: [] };
window.addEventListener('error', (e) => uit.fouten.push('error: ' + e.message));
const cine = await imp('cinematics');
const DN = await imp('daynight');
const RD = await imp('rdnew');
const PC = await imp('percelen');
const VEH = await imp('vehicle');
const VK = await imp('vaultkit');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(300); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
const [ex, ey] = RD.wgsToWorld(PC.erfDef(PC.START_ERF).lat, PC.erfDef(PC.START_ERF).lon);
const shot = async (naam, ms = 1500) => { await sleep(ms); console.log('[capture] ' + PRE + '-' + naam); await sleep(900); };
const teleport = (x, y, a) => { p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.angle = a; w.camYaw = a; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0; };
try {
  teleport(ex, ey + 45, 0);
  await sleep(9000);
  const lijst = [
    ['trekker', VEH.TRACTOR_MODEL],
    ['trekker-klein', VEH.MACHINE_MODELLEN['trekker-klein']],
    ['maaidorser', VEH.MACHINE_MODELLEN.maaidorser],
    ['bus', VEH.TRAFFIC_MODELS().find((m) => m.name === 'bus')],
    ['sedan', VEH.TRAFFIC_MODELS().find((m) => m.name === 'sedan')],
  ];
  for (const [naam, model] of lijst) {
    if (!model) { uit.fouten.push('geen model ' + naam); continue; }
    if (p.inVehicle) p.exitVehicle(map, w);
    const x = ex + 8, y = ey + 45, a = 0;
    teleport(x - 6, y, a);
    const v = new VEH.Vehicle(x, y, a, { ...model });
    v.z = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
    w.vehicles.push(v);
    await sleep(800);
    p.enterVehicle(v, w);
    await sleep(3500);
    w.camYaw = a;
    await sleep(1500);
    const c = S3.cam.position, cs = Math.cos(v.angle), sn = Math.sin(v.angle);
    const dx = c.x - v.x, dz = c.z - v.y;
    uit.stand.push({ naam, binnen: p.inVehicle === v, len: v.model.len, wid: v.model.wid, dak: +VK.vehicleHeight(v).toFixed(2), lx: +(dx * cs + dz * sn).toFixed(2), lz: +(-dx * sn + dz * cs).toFixed(2), camHoogte: +(c.y - (v.z || 0)).toFixed(2), near: +S3.cam.near.toFixed(2) });
    await shot(naam, 300);
    p.exitVehicle(map, w);
    w.vehicles.splice(w.vehicles.indexOf(v), 1);
  }
} catch (e) { uit.fouten.push('script: ' + String((e && e.stack) || e).slice(0, 400)); }
clearInterval(skipper);
return JSON.stringify(uit);
