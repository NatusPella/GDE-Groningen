// Page half van scripts/qa/hertest_lijst.mjs (desktop --perf-script body): werkt een lijst hertestpunten af en maakt per punt
// 1-3 beelden. window.__hl = { items: [...] } staat ervoor. Elk item:
//   { issue, naam, soort: 'plek' | 'menu' | 'hud' | 'js', klok?, weer?, dag?, ... }
//   plek: { waar: 'stad' | 'plaats:Usquert' | 'landmark:Martinitoren' | [x, y], dx?, dy?, speler?: true,
//           cams: [{ naam, afstand, hoogte, hoek (graden, 0 = oost), fov?, doelHoogte? }] }  (camera kijkt naar het punt)
//   menu: { tab, sub? }                                  (het echte pauzemenu in de draaiende wereld)
//   hud:  { waar?, wanted?, voertuig?: true, snelheid? }  (HUD te voet of in een voertuig)
//   js:   { doe: '<code>' }                              (async body met H in scope; H.shot(naam) maakt een beeld)
// weer: 'helder' | 'bewolkt' | 'mist' | 'regen'; klok in uren; dag zet de kalenderdag vast (verhaal klemt hem anders).
// Beelden: '[capture] <issue>-<naam>' -> <smoke>-<issue>-<naam>.png. Eén item dat omvalt houdt de rest niet tegen.
// Alleen het wegwerpprofiel wordt geraakt; elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__hl || { items: [] };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
// filmpjes van het spel gaan weg, behalve onze eigen camera en wat een item zelf wil zien (H.film(true), bv. een taxirit)
let hlCam = null, filmMag = false;
const skipper = setInterval(() => { if (cine.isCinematicActive() && !hlCam && !filmMag) cine.skipCinematic(); }, 150);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const DN = await imp('daynight'); const { P } = await imp('worldframe');
let SHUI = null; try { SHUI = await imp('shopui'); } catch (e) { /* geen winkel-ui */ }
const beat = setInterval(() => console.error('[hertest-lijst] hartslag ' + Math.round(performance.now() / 1000)), 10000);
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global).catch(() => ({ places: [] }));
const stad = P(100, 77);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);

// klok en weer vasthouden zolang een item loopt
const WEER = {
  helder: { kind: 'helder', overcast: 0, mist: 0, intensity: 0, wet: 0 },
  bewolkt: { kind: 'helder', overcast: 0.8, mist: 0.1, intensity: 0, wet: 0 },
  mist: { kind: 'helder', overcast: 0.4, mist: 0.9, intensity: 0, wet: 0 },
  regen: { kind: 'regenbui', overcast: 0.8, mist: 0.2, intensity: 0.6, wet: 0.7, active: true, peak: 0.6 },
};
let vast = { klok: 14, weer: 'helder' };
const zetVast = () => {
  const s = WEER[vast.weer] || WEER.helder;
  w.clock = vast.klok;
  w.weather = { active: !!s.active, timer: 1e9, kind: s.kind, peak: s.peak || 0, intensity: s.intensity, wet: s.wet, overcast: s.overcast, mist: s.mist, windAngle: 0.9, elapsed: 30, duration: Infinity };
  w.mist = s.mist; w.overcast = s.overcast;
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const houd = setInterval(zetVast, 400);
let dagVast = false, dagOud = null;
const zetDag = (n) => {
  if (!w.calendar) return;
  if (n == null) { if (dagVast) { Object.defineProperty(w.calendar, 'day', { value: dagOud, writable: true, enumerable: true, configurable: true }); dagVast = false; } return; }
  if (!dagVast) dagOud = w.calendar.day;
  Object.defineProperty(w.calendar, 'day', { get: () => n, set: () => {}, enumerable: true, configurable: true }); dagVast = true;
};

const waarNaar = (waar) => {
  if (!waar || waar === 'stad') return stad.slice();
  if (Array.isArray(waar)) return waar.slice();
  const [soort, ...rest] = String(waar).split(':'); const naam = rest.join(':').toLowerCase();
  if (soort === 'plaats') { const q = index.places.find((x) => x.name.toLowerCase() === naam); if (q) return [q.x, q.y]; }
  if (soort === 'landmark') { const l = (map.meta.landmarks || []).find((x) => x.name.toLowerCase() === naam) || (map.meta.landmarks || []).find((x) => x.name.toLowerCase().includes(naam)); if (l) return [l.x, l.y]; }
  throw new Error('plek niet gevonden: ' + waar);
};
const camOff = () => { hlCam = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
const cam = (x, y, z, lx, ly, lz, fov = 60) => {
  hlCam = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
  if (!cine.isCinematicActive()) cine.playCinematic({ id: 'hl-view', duration: 3600, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => hlCam });
};
const jump = async (x, y, settle = 5000) => {
  camOff(); if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 450 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y);
};
const sluit = async () => {
  for (let i = 0; i < 2; i++) { tap('Escape', 'Escape'); await sleep(300); }
  try { PM.closePauseMenu(); } catch (e) { /* niet open */ }
  try { if (SHUI) SHUI.closeShopMenu({ save: false }); } catch (e) { /* niet open */ }
  await sleep(400);
};
const rapport = [];
let huidig = null;
const shot = async (naam, wacht = 1200) => {
  await sleep(wacht);
  const n = String(huidig.issue) + '-' + String(naam).replace(/[^\w.-]+/g, '_');
  console.log('[capture] ' + n); huidig.beelden.push(n); await sleep(800);
};
const zichtbaar = (re) => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.offsetParent !== null && re.test(e.textContent || '')).slice(0, 6).map((e) => e.textContent.trim().slice(0, 100));
const H = { D, w, p, map, P, stad, gh, imp, sleep, tap, key, cine, PM, jump, cam, camOff, sluit, waarNaar, zichtbaar, get shot() { return shot; }, film: (aan) => { filmMag = !!aan; }, noteer: (t) => huidig.notities.push(String(t)), meet: (k, v) => { huidig.meting[k] = v; } };
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const draaiItem = async (it) => {
  vast = { klok: it.klok != null ? it.klok : 14, weer: it.weer || 'helder' }; zetVast();
  zetDag(it.dag != null ? it.dag : null);
  if (it.soort === 'plek') {
    const [bx, by] = waarNaar(it.waar);
    const x = bx + (it.dx || 0), y = by + (it.dy || 0);
    await jump(x, y, it.settle || 6000);
    const gz = gh(x, y);
    huidig.meting.plek = [Math.round(x), Math.round(y), +gz.toFixed(1)];
    if (it.speler) { camOff(); await shot('speler', 1500); }
    for (const c of it.cams || []) {
      const a = (c.hoek || 0) * Math.PI / 180, r = c.afstand != null ? c.afstand : 40;
      const cx = x + (c.ox || 0) + Math.cos(a) * r, cy = y + (c.oy || 0) + Math.sin(a) * r;
      const cz = (c.absoluut ? 0 : Math.max(gz, gh(cx, cy))) + (c.hoogte != null ? c.hoogte : 30);
      cam(cx, cy, cz, x + (c.ox || 0), y + (c.oy || 0), gz + (c.doelHoogte || 0), c.fov || 60);
      await shot(c.naam || 'cam', c.wacht || 3500);
    }
    camOff();
  } else if (it.soort === 'menu') {
    PM.openPauseMenu(it.tab, it.sub ? { sub: it.sub } : {}); await shot(it.naam || it.tab, it.wacht || 2200);
    if (it.scroll) { const sc = document.querySelector('#pause-menu .pm-body, #pause-menu [data-scroll], #pause-menu'); if (sc) sc.scrollTop = sc.scrollHeight; await shot((it.naam || it.tab) + '-onder', 900); }
    await sluit();
  } else if (it.soort === 'hud') {
    const [x, y] = waarNaar(it.waar); await jump(x, y, it.settle || 4000);
    let v = null;
    if (it.voertuig) {
      const VEH = await imp('vehicle'); const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
      v = pt && VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, false, null);
      if (v) { v.road = null; v.perfTemp = true; w.vehicles.push(v); p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(900); } else H.noteer('geen voertuig');
    }
    const sp = v ? setInterval(() => { v.speed = it.snelheid || 0; }, 50) : null;
    w.wanted = it.wanted || 0;
    await shot(it.naam || 'hud', it.wacht || 2500);
    w.wanted = 0; if (sp) clearInterval(sp);
    if (v) { p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); }
  } else if (it.soort === 'js') {
    await new AsyncFunction('H', it.doe)(H);
  } else throw new Error('onbekende soort ' + it.soort);
};

for (const it of CFG.items) {
  huidig = { issue: it.issue, naam: it.naam || '', soort: it.soort, beelden: [], notities: [], meting: {}, ok: true };
  console.error('[hertest-lijst] item ' + it.issue + ' ' + (it.naam || ''));
  const t0 = performance.now();
  try { await Promise.race([draaiItem(it), sleep((it.limietS || 120) * 1000).then(() => { throw new Error('tijdslimiet item'); })]); } catch (e) { huidig.ok = false; huidig.fout = String(e && e.message || e).slice(0, 300); }
  filmMag = false;
  try { camOff(); await sluit(); w.wanted = 0; } catch (e) { /* opruimen */ }
  huidig.ms = Math.round(performance.now() - t0);
  rapport.push(huidig);
  console.log('[hertest-lijst] ' + JSON.stringify(huidig));
}
zetDag(null);
clearInterval(houd); clearInterval(beat); clearInterval(skipper);
return JSON.stringify({ items: rapport });
