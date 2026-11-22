// Page half van scripts/screenshotjacht.mjs (desktop --perf-script body): de verkenner. window.__jt = { seed, startNr, stops: [...] } staat ervoor.
// Elke stop is verhaal (een stap via __story.jump), vrij (een plek, drie tijdstippen, lopen en een voertuig, willekeurige camera), binnen (betreedbare
// panden) of menu (pauzemenu, kaart op drie zoomniveaus, radiomelding). Per beeld: console.log('[capture] jpg:<naam>') (het hoofdproces schrijft het JPEG en
// de pixelcijfers) en een '[bot-log] {type:"beeld", ...}'-regel met de metagegevens. Een stop zonder fout eindigt met {type:"stopklaar"}.
// Raakt alleen het wegwerpprofiel: schrijven naar gde-save-v1, gde-settings en gde-prestaties-v1 wordt geblokkeerd; elke keydown krijgt een keyup.
const JT = window.__jt;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const log = (o) => console.log('[bot-log] ' + JSON.stringify(o));
const stap = (tekst) => log({ type: 'voortgang', tekst });
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
function mulberry32(seed) { let st = seed >>> 0; return () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry32(((JT.seed >>> 0) * 2654435761 + (JT.startNr + 1) * 40503) >>> 0);
const pick = (a) => a[Math.floor(R() * a.length)];
const slugF = (s, max = 40) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x';

// niets naar echte opslag
{ const geblokt = new Set(['gde-save-v1', 'gde-settings', 'gde-prestaties-v1']); const si = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (geblokt.has(k)) return; return si.call(this, k, v); }; }

for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) { if (i % 30 === 5) await tap('Enter', 'Enter'); await sleep(100); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu'); const DN = await imp('daynight'); const VH = await imp('vehicle');
const WL = await imp('waterlevels'); const SET = await imp('settings'); const FPm = await imp('firstperson'); const SC = await imp('scene3d');
const SHm = await imp('shops').catch(() => null); const STN = await imp('stationtravel').catch(() => null); const INT = await imp('interiors').catch(() => null);
const IFR = await imp('interiorframe').catch(() => null); const MV = await imp('mapview').catch(() => null); const WP = await imp('worldplaces').catch(() => null);
const WF = await imp('worldframe').catch(() => null);
let skipCine = true; let fixOn = true; let ownTake = false;
const skipper = setInterval(() => { if (skipCine && cine.isCinematicActive()) cine.skipCinematic(); }, 120);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(300); }
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
await sleep(2500);

// ---- omgeving: tijd en weer ----
const WEER = { helder: { kind: 'helder' }, motregen: { kind: 'motregen', intensity: 0.3, wet: 0.4, overcast: 0.6 }, regenbui: { kind: 'regenbui', intensity: 0.6, wet: 0.8, overcast: 0.8 }, mist: { kind: 'helder', mist: 0.7, overcast: 0.3 } };
let env = { clock: 13, weather: 'helder' };
const setWeather = () => { const W = WEER[env.weather] || WEER.helder; w.weather = { active: W.kind !== 'helder', timer: 1e9, kind: W.kind, peak: W.intensity || 0, intensity: W.intensity || 0, wet: W.wet || 0, overcast: W.overcast || 0, mist: W.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; };
const setEnv = (clock, weer) => { env = { clock, weather: weer || 'helder' }; w.clock = clock; setWeather(); if (DN.refreshDayNight) DN.refreshDayNight(w); };
setInterval(() => { if (fixOn) { w.clock = env.clock; setWeather(); } }, 500);

const gh = (x, y) => { try { return map.groundHeightAt(x, y, 0) || 0; } catch (e) { return 0; } };
const body = () => p.inVehicle || p;
const kindOf = (v) => (v.isBike ? 'fiets' : v.isScooter ? 'scooter' : (v.model && v.model.name) || v.name || 'voertuig');
let cur = { stop: '', camera: 'derde', scherm: 'wereld' };
let NR = JT.startNr;

// ---- beeld ----
async function fpsMeet(ms = 500) {
  let n = 0; const t0 = performance.now();
  await new Promise((res) => { const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return +(n / ((performance.now() - t0) / 1000)).toFixed(1);
}
const zichtTekst = () => (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700);
async function shot(soort, plaats, extra = {}) {
  await sleep(extra.wacht ?? 450);
  const fps = await fpsMeet(500);
  const b = body(); const nr = ++NR;
  const naam = `${String(nr).padStart(4, '0')}_${slugF(soort, 16)}_${slugF(plaats, 40)}`;
  console.log('[capture] jpg:' + naam);
  await sleep(750);
  log({ type: 'beeld', naam, bestand: naam + '.jpg', nr, soort, plaats, stop: cur.stop, pos: [Math.round(b.x), Math.round(b.y)], uur: +(w.clock || 0).toFixed(1), weer: env.weather,
    voertuig: extra.voertuig || (p.inVehicle ? kindOf(p.inVehicle) : 'lopen'), missie: cur.missie || null, stap: cur.stap || null, camera: cur.camera,
    scherm: extra.scherm || cur.scherm || 'wereld', fps, tekst: zichtTekst(), verwachtAnders: !!extra.verwachtAnders, plaatsNaam: WP && WP.nearestWorldPlace ? ((WP.nearestWorldPlace(b.x, b.y) || {}).name || null) : null });
}

// ---- camera: derde persoon, eerste persoon, hoog ----
function stopTake() { if (ownTake) { try { cine.stopCameraTake('jt-hoog'); } catch (e) { /* geen take */ } ownTake = false; } }
function camera(mode) {
  cur.camera = mode;
  if (mode === 'hoog') {
    SET.setSetting('firstPersoon', false); FPm.syncFirstPerson(w);
    cine.startCameraTake('jt-hoog', () => { const b = body(); const a = b.angle || 0; const z = (b.gz || 0) + (b.z || 0); return { position: { x: b.x - Math.cos(a) * 30, y: b.y - Math.sin(a) * 30, z: z + 26 }, lookAt: { x: b.x + Math.cos(a) * 10, y: b.y + Math.sin(a) * 10, z }, fov: 55, cut: true }; }, { letterbox: false });
    ownTake = true;
  } else {
    stopTake();
    SET.setSetting('firstPersoon', mode === 'eerste'); FPm.syncFirstPerson(w);
  }
}

// ---- bewegen ----
async function teleportTo(x, y, { settle = 4500, open = true, hoek = null } = {}) {
  stap(`teleport naar ${Math.round(x)},${Math.round(y)}`);
  if (cine.isCinematicActive()) cine.skipCinematic();
  if (p.inVehicle) { try { p.exitVehicle(map, w); } catch (e) { /* al uit */ } }
  const s = open && map.findOpenSpawn ? (map.findOpenSpawn(x, y, 80) || { x, y }) : { x, y };
  p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(s.x, s.y); w.wanted = 0;
  if (hoek !== null) { p.angle = hoek; w.camYaw = hoek; }
  for (let i = 0; i < 40 && !document.getElementById('load-screen'); i++) await sleep(100);
  stap('teleport: laadscherm gezien of niet');
  for (let i = 0; i < 300 && document.getElementById('load-screen'); i++) await sleep(100);
  stap('teleport: geladen');
  await sleep(settle);
  for (let n = 0; SC.streamPending && SC.streamPending().roads > 0 && n < 30; n++) await sleep(400);
  stap('teleport: gestreamd');
  p.x = s.x; p.y = s.y; p.gz = gh(s.x, s.y);
  return s;
}
function snapRoad(x, y, Rr) {
  let best = null;
  for (const rd of ((map.roadsNear && map.roadsNear(x, y, Rr)) || [])) {
    if (!rd.pts) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), naam: rd.name || rd.ref || '' };
    }
  }
  return best;
}
function waterNabij(x, y, maxR = 200) {
  for (let r = 0; r <= maxR; r += 25) for (let k = 0; k < (r ? 12 : 1); k++) {
    const a = (k / 12) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    const poly = WL.waterPolyAt(map, px, py, 0); if (poly) return { poly, x: px, y: py };
  }
  return null;
}
const AUTOS = () => VH.TRAFFIC_MODELS().filter((m) => /hatch|sedan|wagon|van|sport/.test(m.name));
async function weg(v) {
  if (!v) return;
  try { if (p.inVehicle === v) p.exitVehicle(map, w); } catch (e) { /* al uit */ }
  const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1);
}
// zet een voertuig bij de speler en stap in; soort: auto, fiets, trekker, boot. Geeft { v, soort } of null (met reden in 'reden').
async function neemVoertuig(soort, plekInfo) {
  const b = p; const sn = snapRoad(b.x, b.y, 120);
  const x0 = sn ? sn.x : b.x + 3, y0 = sn ? sn.y : b.y, a0 = sn ? sn.a : (b.angle || 0);
  let v = null;
  if (soort === 'boot') {
    const wn = waterNabij(b.x, b.y, 220); if (!wn) return { reden: 'geen water' };
    v = VH.spawnBoatOnWater(map, wn.poly, R, { near: [wn.x, wn.y], min: 0, max: 500 });
    if (!v) return { reden: 'geen boot geplaatst' };
    v.perfTemp = true; if (!w.vehicles.includes(v)) w.vehicles.push(v);
  } else if (soort === 'fiets') { v = VH.makeTwoWheeler('bike', x0, y0, a0, null, R); v.speed = 0; w.vehicles.push(v); }
  else if (soort === 'trekker') { v = new VH.Vehicle(x0, y0, a0, { ...VH.TRACTOR_MODEL }); v.speed = 0; w.vehicles.push(v); }
  else { const mod = pick(AUTOS()); v = new VH.Vehicle(x0, y0, a0, { ...mod }); v.speed = 0; w.vehicles.push(v); }
  v.perfTemp = true;
  p.x = v.x; p.y = v.y; p.enterVehicle(v, w);
  await sleep(900);
  return { v, soort };
}
async function rijd(ms = 1400) { key('keydown', 'w', 'KeyW'); await sleep(ms); key('keyup', 'w', 'KeyW'); await sleep(250); }

// ---- stop: verhaal ----
async function verhaalStop(S) {
  fixOn = false; skipCine = false; camera('derde');
  cur = { stop: S.id, camera: 'derde', scherm: 'wereld', missie: S.kind === 'mission' ? S.stap : null, stap: S.stap };
  const ST = window.__story;
  if (document.body.classList.contains('hud-card-on') || w.paused) { for (let i = 0; i < 4 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); } }
  const ok = ST.jump(S.stap);
  if (!ok) { log({ type: 'stopfout', stop: S.id, fout: `sprong naar ${S.stap} gaf false (stap niet beschikbaar?)` }); skipCine = true; return; }
  await sleep(3800);
  const scherm = () => (cine.isCinematicActive() ? 'cutscene' : w.paused ? 'gepauzeerd' : 'wereld');
  await shot('verhaal', S.stap + '-begin', { scherm: scherm() });
  await sleep(7000);
  await shot('verhaal', S.stap + '-midden', { scherm: scherm() });
  for (let i = 0; i < 12 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(300); }
  let tp = false; try { tp = ST.teleport(); } catch (e) { tp = false; }
  await sleep(4500);
  await shot('verhaal', S.stap + '-doel', { scherm: scherm(), verwachtAnders: !!tp });
  if (S.kind === 'mission') {
    for (let i = 0; i < 12 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(300); }
    try { ST.objective(); } catch (e) { /* geen doel */ }
    await sleep(3500);
    try { ST.win(); } catch (e) { /* geen missie meer */ }
    await sleep(5500);
    await shot('verhaal', S.stap + '-eind', { scherm: scherm(), verwachtAnders: true });
  }
  for (let i = 0; i < 12 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(300); }
  skipCine = true; fixOn = true;
}

// ---- stop: vrij verkennen ----
async function zoekBrug(nth) {
  const kand = ['Groningen', 'Haren', 'Delfzijl', 'Zuidhorn', 'Winsum', 'Veendam'].map((n) => WP && WP.worldPlaces ? null : null);
  void kand;
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global.places);
  const namen = ['Groningen', 'Haren', 'Delfzijl', 'Zuidhorn', 'Winsum', 'Veendam'];
  for (let k = 0; k < namen.length; k++) {
    const pl = idx.find((q) => q.name === namen[(nth + k) % namen.length]); if (!pl) continue;
    await teleportTo(pl.x, pl.y, { settle: 3500 });
    for (let dx = -1500; dx <= 1500; dx += 300) for (let dy = -1500; dy <= 1500; dy += 300) {
      for (const r of (map.roadsNear(pl.x + dx, pl.y + dy, 180) || [])) {
        if (!r || !r.bridge || r.tunnel || !r.pts || r.pts.length < 2) continue;
        const m = r.pts[Math.floor(r.pts.length / 2)];
        return { x: m[0], y: m[1], naam: r.name || 'brug', a: Math.atan2(r.pts[1][1] - r.pts[0][1], r.pts[1][0] - r.pts[0][0]) };
      }
    }
  }
  return null;
}
async function vrijStop(S) {
  fixOn = true; skipCine = true; cur = { stop: S.id, camera: 'derde', scherm: 'wereld' };
  let pl = S.plek; let naam = pl.naam;
  if (pl.zoek === 'brug') { const b = await zoekBrug(pl.nth || 0); if (!b) { log({ type: 'stopfout', stop: S.id, fout: 'geen brug gevonden' }); return; } pl = { ...pl, x: b.x, y: b.y, a: b.a }; naam = 'brug-' + slugF(b.naam, 20); }
  else if (pl.zoek === 'station') {
    const lijst = (STN && STN.getStationsForRender()) || []; if (!lijst.length) { log({ type: 'stopfout', stop: S.id, fout: 'geen stations' }); return; }
    const s = lijst[Math.floor(R() * lijst.length)]; pl = { ...pl, x: s.x, y: s.y }; naam = 'station-' + slugF(s.name || '', 20);
  }
  const sn0 = null; void sn0;
  setEnv(S.tijden[0], S.weer[0]);
  const s = await teleportTo(pl.x, pl.y, { settle: 4000 });
  const sn = snapRoad(s.x, s.y, 160);
  if (sn && pl.typ !== 'boerderij') { p.x = sn.x; p.y = sn.y; p.gz = gh(sn.x, sn.y); p.angle = sn.a; w.camYaw = sn.a; await sleep(1500); }
  const heeftWater = !!waterNabij(p.x, p.y, 220);
  const A = { stad: ['auto', 'fiets'], wijk: ['fiets', 'auto'], dorp: ['auto', 'fiets'], boerderij: ['trekker', 'auto'], kust: [heeftWater ? 'boot' : 'auto', 'fiets'], bourtange: ['fiets', 'auto'], brug: [heeftWater ? 'boot' : 'auto', 'auto'], station: ['fiets', 'auto'] }[pl.typ] || ['auto', 'fiets'];
  for (let t = 0; t < 3; t++) {
    setEnv(S.tijden[t], S.weer[t]);
    // lopen
    await weg(p.inVehicle);
    if (sn) { p.x = sn.x; p.y = sn.y; p.gz = gh(sn.x, sn.y); }
    camera(S.camera[t]); await sleep(1400);
    await shot('vrij', `${naam}-lopen-t${t}`, { verwachtAnders: t > 0 });
    // voertuig
    const kies = A[t % 2];
    const r = await neemVoertuig(kies, pl);
    if (!r || !r.v) { log({ type: 'notitie', stop: S.id, tekst: `voertuig ${kies} niet mogelijk: ${r && r.reden}` }); continue; }
    camera(S.camera[(t + 1) % 3]);
    if (kies !== 'boot') await rijd(1800); else { key('keydown', 'w', 'KeyW'); await sleep(1500); key('keyup', 'w', 'KeyW'); }
    await shot('vrij', `${naam}-${kies}-t${t}`, { voertuig: kies, verwachtAnders: true });
    await weg(r.v);
  }
  camera('derde'); setEnv(13, 'helder');
}

// ---- stop: binnen ----
async function binnenStop(S) {
  fixOn = true; skipCine = true; cur = { stop: S.id, camera: 'derde', scherm: 'interieur' }; setEnv(14, 'helder');
  if (!SHm || !INT || !IFR) { log({ type: 'stopfout', stop: S.id, fout: 'shops/interiors/interiorframe ontbreekt' }); return; }
  const shops = SHm.getShopsForRender().filter((s) => !/wapens|heli|boot/.test(s.type));
  const volgorde = shops.map((s, i) => [S.r[i % S.r.length] + i * 1e-6, s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).filter((_, i) => i % (S.delen || 1) === (S.deel || 0));
  let gedaan = 0; const geprobeerd = [];
  for (const s of volgorde) {
    if (gedaan >= S.aantal) break;
    try {
      camera('derde');
      await teleportTo(s.x, s.y, { settle: 3000, open: false });
      // kandidaten: de panden rondom de winkel met een bruikbaar plan; pinInterior geeft het plan zonder dat het pand live hoeft te zijn
      const kand = [];
      for (const b of (map.buildingsNear(s.x, s.y, 40) || [])) { let pl = null; try { pl = INT.pinInterior(b); } catch (e) { pl = null; } if (pl && pl.layout && pl.frame) kand.push({ b, pl, d: Math.hypot(pl.frame.ox - s.x, pl.frame.oy - s.y) }); }
      kand.sort((a, c) => a.d - c.d);
      if (!kand.length) { geprobeerd.push(s.type + ': geen pand met plan'); continue; }
      for (const hit of kand.slice(0, 2)) {
        if (gedaan >= S.aantal) break;
        try {
          // naar de voordeur (buiten): binnen 24 m bouwt het spel het interieur
          const [bx, by] = IFR.toWorld(hit.pl.frame, 0, -2);
          stap(`binnen: naar de deur van een ${hit.pl.kind || '?'} bij ${s.type}`);
          p.x = bx; p.y = by; p.vx = p.vy = 0; p.gz = gh(bx, by);
          let live = null;
          for (let poging = 0; poging < 10 && !live; poging++) { await sleep(700); live = INT.livePlanOf(hit.b); }
          if (!live) { geprobeerd.push(`${s.type}/${hit.pl.kind}: niet live`); INT.releaseInterior(hit.b); continue; }
          const use = (live.layout && live.layout.use) || [];
          const sp = use.find((u) => ['kopen', 'bestellen', 'balie', 'kappen'].includes(u.id)) || use[0];
          if (!sp) { geprobeerd.push(`${s.type}/${hit.pl.kind}: geen plek`); INT.releaseInterior(hit.b); continue; }
          const [ix, iy] = IFR.toWorld(live.frame, sp.u, sp.v);
          p.x = ix; p.y = iy; p.vx = p.vy = 0; p.gz = gh(ix, iy);
          await sleep(1800);
          const ins = INT.insideInterior();
          if (!ins) { geprobeerd.push(`${s.type}/${hit.pl.kind}: speler niet binnen`); INT.releaseInterior(hit.b); continue; }
          const nm = `${ins.kind || hit.pl.kind}-${slugF(s.street || s.wijk || s.type, 20)}`;
          cur.scherm = 'interieur';
          await shot('binnen', nm + '-derde', { scherm: 'interieur:' + ins.kind });
          camera('eerste'); await sleep(900);
          await shot('binnen', nm + '-eerste', { scherm: 'interieur:' + ins.kind, verwachtAnders: true });
          camera('derde');
          gedaan++;
          // eerst naar buiten (de voordeur), dan pas ver weg: een teleport vanuit het pand liep eenmaal vast
          stap('binnen: naar buiten'); p.x = bx; p.y = by; p.vx = p.vy = 0; p.gz = gh(bx, by); await sleep(1500);
          INT.releaseInterior(hit.b);
        } catch (e2) { log({ type: 'notitie', stop: S.id, tekst: 'interieur-fout ' + String(e2 && e2.message).slice(0, 160) }); }
      }
    } catch (e) { log({ type: 'notitie', stop: S.id, tekst: 'interieur-fout ' + String(e && e.message).slice(0, 160) }); }
  }
  log({ type: 'notitie', stop: S.id, tekst: `interieurs gelukt: ${gedaan}; mislukt: ${geprobeerd.slice(0, 40).join('; ')}` });
  camera('derde');
}

// ---- stop: menu's en schermen ----
async function menuStop(S) {
  fixOn = true; skipCine = true; cur = { stop: S.id, camera: 'derde', scherm: 'menu' }; setEnv(14, 'helder'); camera('derde');
  const open = async (naam, opts) => { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); await sleep(400); PM.openPauseMenu(naam, opts); await sleep(1300); };
  const sluit = async () => { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); await sleep(500); };
  await teleportTo(R() * 0 + (WF && WF.P ? WF.P(100, 77)[0] : 0), WF && WF.P ? WF.P(100, 77)[1] : 0, { settle: 5000 });
  // radiomelding bij het instappen
  { const r = await neemVoertuig('auto'); if (r && r.v) { await sleep(300); await shot('menu', 'radio-melding-instappen', { scherm: 'radio-melding', wacht: 200 }); await sleep(2500); await shot('menu', 'radio-melding-later', { scherm: 'radio-melding', wacht: 200 }); await weg(r.v); } }
  for (const sec of ['spel', 'verhaal', 'todo', 'loopbaan', 'map', 'spullen', 'garage', 'boerderij', 'veroverd', 'prestaties', 'fotos', 'settings', 'streken']) {
    try { await open(sec); cur.scherm = 'pauzemenu:' + sec; await shot('menu', 'pauze-' + sec, { scherm: 'pauzemenu:' + sec, verwachtAnders: true });
      // tabbladen met Q/E: spullen (kleding), garage (tuning), loopbaan, Bezit, instellingen
      if (['spullen', 'garage', 'loopbaan', 'boerderij', 'settings', 'verhaal'].includes(sec)) {
        const nTabs = document.querySelectorAll(`[data-of="${sec}"][data-subtab]`).length || (sec === 'spullen' || sec === 'garage' ? 4 : 0);
        for (let k = 1; k < Math.min(nTabs, 7); k++) { await tap('e', 'KeyE'); await sleep(900); await shot('menu', `pauze-${sec}-tab${k}`, { scherm: `pauzemenu:${sec}:tab${k}`, verwachtAnders: true }); }
      }
    } catch (e) { log({ type: 'stopfout', stop: S.id, fout: sec + ': ' + String(e && e.stack || e).slice(0, 200) }); }
    await sluit();
  }
  // kaart op drie zoomniveaus
  try {
    await open('map'); await sleep(1500);
    const b = body();
    for (const z of [0.6, 2.5, 9]) { MV.setMapView(b.x, b.y, z); await sleep(2200); await shot('menu', `kaart-zoom-${z}`, { scherm: 'kaart:zoom' + z, verwachtAnders: true }); }
  } catch (e) { log({ type: 'stopfout', stop: S.id, fout: 'kaart: ' + String(e && e.stack || e).slice(0, 200) }); }
  await sluit();
  cur.scherm = 'wereld';
  await shot('menu', 'terug-in-het-spel', { scherm: 'hud', verwachtAnders: true });
}

for (const S of JT.stops) {
  log({ type: 'stop', stop: S.id });
  if (JT.testCrash && S.id === JT.testCrash) { await sleep(500); location.reload(); await sleep(60000); } // proef van het crashpad (JACHT_TEST_CRASH=<stop-id>)
  try {
    if (S.soort === 'verhaal') await verhaalStop(S);
    else if (S.soort === 'vrij') await vrijStop(S);
    else if (S.soort === 'binnen') await binnenStop(S);
    else if (S.soort === 'menu') await menuStop(S);
  } catch (e) {
    log({ type: 'stopfout', stop: S.id, fout: String(e && e.stack || e).slice(0, 500) });
    try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); stopTake(); skipCine = true; fixOn = true; if (p.inVehicle) p.exitVehicle(map, w); } catch (e2) { /* verder */ }
  }
  log({ type: 'stopklaar', stop: S.id });
}
clearInterval(skipper); stopTake();
return JSON.stringify({ klaar: JT.stops.length, beelden: NR - JT.startNr });
