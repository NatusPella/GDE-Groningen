// Pagina-helft van scripts/qa/interieur_firstpersoon_shots.mjs (#833): de voertuiginterieurs op LOD's
// (personenauto en stadsbus) en de eerste-persooncamera, in het echte spel. window.__ifs = { only, settle }
// staat ervoor. Elk beeld gaat via console.log('[capture] <naam>') naar desktop/devtools.js (PNG naast
// shots.png); de metingen en consolefouten komen in [ifs-check]/[ifs-result]-regels terecht.
// Niets schrijft naar echte opslag (wegwerpprofiel); één Electron, daarna sluit het harnas hem.
const D = window.__debug;
const w = D.world;
const p = w.player;
const map = w.map;
const sc = window.__scene3d;
const CFG = window.__ifs || {};
const ONLY = (CFG.only || '').split(',').filter(Boolean);
const SETTLE = CFG.settle || 8000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const stapAan = (id) => !ONLY.length || ONLY.includes(id);

// ---- fouten en waarschuwingen -------------------------------------------------------
const issues = [];
const note = (m) => issues.push({ t: Math.round(performance.now()), m: String(m).slice(0, 240) });
const origErr = console.error.bind(console), origWarn = console.warn.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
console.warn = (...a) => { const s = a.map(String).join(' '); if (/nan|infinity/i.test(s)) note('console.warn: ' + s); origWarn(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => note('promise: ' + ((e.reason && e.reason.message) || e.reason)));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const ST = await imp('settings');
const GP = await imp('gfxprofile');
const VH = await imp('vehicle');
const C3 = await imp('cabin3d').catch(() => null);
const BI = await imp('businterieur3d').catch(() => null);
const FP = await imp('firstperson').catch(() => null);
const SEAT = await imp('seating3d').catch(() => null);
const MV = await imp('models3d_vehicles').catch(() => null);
const CIL = await imp('carinteriorlayout').catch(() => null);
const BUI = await imp('businterieur').catch(() => null);
const PG = await imp('pedgeom').catch(() => null);   // isInsideBuilding: punt-in-pand-test voor vrije camerastanden

// vaste omstandigheden, zoals de README-beelden: voorinstelling Hoog, geen dynamische resolutie
try {
  const pr = GP.GFX_PRESETS && GP.GFX_PRESETS.hoog;
  if (pr) for (const [k, v] of Object.entries(pr)) ST.setSetting(k, v);
  ST.setSetting('autoResolution', false);
} catch (e) { note('gfx-instellingen: ' + e.message); }

w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

// ---- helpers ------------------------------------------------------------------------
const GM = { x: 200.8, y: 45.4 };
const DEG = Math.PI / 180;
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const nearestRoadHeading = (x, y, R = 80) => {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : [])) for (let i = 0; i < rd.pts.length - 1; i++) {
    const a = rd.pts[i], b = rd.pts[i + 1];
    const d = Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y);
    if (!best || d < best.d) best = { d, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
};
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = gh(x, y);
};
let hold = null, done = false, driving = false;
const tick = () => {
  if (hold && !driving && !PM.isPauseMenuOpen()) {
    p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0;
    if (hold.a !== undefined) { p.angle = hold.a; w.camYaw = hold.a; }
  }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const go = async (x, y, a = 0, settle = SETTLE) => {
  fixWorld(); teleport(x, y); hold = { x, y, a };
  await sleep(settle * 0.6); teleport(x, y); await sleep(settle * 0.4);
};
const setAnchor = (x, y, a) => {
  fixWorld();
  hold = { x, y, a };
  p.x = x; p.y = y; p.vx = p.vy = 0; p.gz = gh(x, y);
  if (a !== undefined) { p.angle = a; w.camYaw = a; }
};
// een beeld zoals de andere QA-scripts: [capture] laat devtools.js de PNG schrijven
const capture = async (name, wait = 600) => { await sleep(wait); fixWorld(); console.log('[capture] ' + name); await sleep(500); };
let ownShot = false;
// vaste camerastand via de filmcamera; geeft de stand terug die de camera echt had (de filmcamera
// duwt zich van muren en gebouwen weg, dus een bedoelde stand is niet altijd de getekende stand)
const poseShot = async (name, pose, wait = 1500, opts = {}) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'ifs-view', duration: 600, priority: 9, letterbox: false, skippable: false, hidePlayers: !!opts.hide, shot: () => pose });
  await sleep(wait);
  fixWorld();
  const werkelijk = { x: +sc.cam.position.x.toFixed(2), y: +sc.cam.position.z.toFixed(2), h: +sc.cam.position.y.toFixed(2) };
  const info = { naam: name, bedoeld: { x: +pose.position.x.toFixed(2), y: +pose.position.y.toFixed(2), h: +pose.position.z.toFixed(2) }, werkelijk, verschilM: +Math.hypot(werkelijk.x - pose.position.x, werkelijk.y - pose.position.y).toFixed(2), verschilH: +(werkelijk.h - pose.position.z).toFixed(2) };
  // projecteer het doel (het midden van de carrosserie) naar het scherm: dan weet je of het voertuig
  // echt in beeld staat en niet door de botsingsbescherming van de filmcamera is weggeduwd
  if (opts.target) {
    const t = opts.target;
    const p3 = new sc.THREE.Vector3(t.x, t.h, t.y).project(sc.cam);
    const dx = t.x - sc.cam.position.x, dy = t.h - sc.cam.position.y, dz = t.y - sc.cam.position.z;
    const afstand = Math.hypot(dx, dy, dz);
    const richting = kijkStand();
    const dot = (dx * Math.cos(richting.yaw) * Math.cos(richting.pitch) + dy * Math.sin(richting.pitch) + dz * Math.sin(richting.yaw) * Math.cos(richting.pitch)) / (afstand || 1);
    info.doel = { afstand: +afstand.toFixed(2), projectie: { x: +p3.x.toFixed(2), y: +p3.y.toFixed(2), inBeeld: Math.abs(p3.x) <= 0.95 && Math.abs(p3.y) <= 0.95 && p3.z < 1 }, kijkDot: +dot.toFixed(2) };
  }
  // een stand die de botsingsbescherming heeft weggeduwd is geen eerlijk beeld: overslaan en een andere hoek proberen
  if (opts.check && !opts.check(info)) {
    cine.skipCinematic();
    await sleep(400);
    ownShot = false;
    return { ...info, overgeslagen: true };
  }
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  await sleep(400);
  ownShot = false;
  return info;
};
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
const leaveStart = async () => {
  const ss = document.getElementById('start-screen');
  for (let i = 0; i < 4 && ss && ss.classList.contains('visible'); i++) { await tap('Enter', 'Enter', 120); await sleep(4000); }
};
const waitFor = async (fn, ms = 4000) => {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(80); }
  return null;
};
const framesN = (n) => new Promise((res) => { let i = 0; const f = () => { if (++i >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
const frametijden = async (n = 120) => {
  const t = [];
  let last = performance.now();
  await new Promise((res) => { let i = 0; const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++i < n) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const a = t.slice(3).sort((x, y) => x - y);
  const med = a[Math.floor(a.length / 2)], p95 = a[Math.min(a.length - 1, Math.floor(a.length * 0.95))];
  return { mediaan: +med.toFixed(2), p95: +p95.toFixed(2), gemiddeld: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), frames: a.length };
};
const tri = (g) => {
  if (!g) return -1;
  if (g.index && Number.isFinite(g.index.count)) return Math.round(g.index.count / 3);
  const at = g.attributes && g.attributes.position;
  return at ? Math.round(at.count / 3) : -1;
};
const vector = new sc.THREE.Vector3();
const kijkStand = () => {
  sc.cam.getWorldDirection(vector);
  return { yaw: Math.atan2(vector.z, vector.x), pitch: Math.asin(Math.max(-1, Math.min(1, vector.y))) };
};
const rondHoek = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const personRoots = () => sc.scene.children.filter((c) => c && c.userData && c.userData.body && c.userData.head);
const findPlayerFig = () => {
  let best = null, bd = 1e9;
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  for (const c of personRoots()) {
    const d = Math.hypot(c.position.x - px, c.position.z - py);
    if (d < bd) { bd = d; best = c; }
  }
  return best && bd < 6 ? best : null;
};
const figInfo = (fig) => (fig ? { gevonden: true, zichtbaar: !!fig.visible, schaduwZichtbaar: !!(fig.userData.shadow && fig.userData.shadow.visible), afstand: +Math.hypot(fig.position.x - (p.inVehicle ? p.inVehicle.x : p.x), fig.position.z - (p.inVehicle ? p.inVehicle.y : p.y)).toFixed(2) } : { gevonden: false });
const fpOn = () => {
  try { if (FP && typeof FP.firstPersonOn === 'function') return !!FP.firstPersonOn(w); } catch (e) { note('firstPersonOn: ' + e.message); }
  const st = w.firstPersoon;
  return !!(st && typeof st === 'object' && st.on);
};
const fpSet = (aan) => {
  if (!FP) throw new Error('firstperson.js ontbreekt in deze build');
  if (typeof FP.setFirstPerson === 'function') { FP.setFirstPerson(w, !!aan); return 'setFirstPerson'; }
  if (typeof FP.toggleFirstPerson === 'function') { if (fpOn() !== !!aan) FP.toggleFirstPerson(w); return 'toggleFirstPerson'; }
  throw new Error('firstperson.js heeft geen setFirstPerson/toggleFirstPerson');
};
// de kijkhoek staat op world.firstPersoon.pitch (firstperson.js); scene3d.js leest die elk beeld
const zetPitch = (rad) => {
  if (typeof FP.initFirstPerson === 'function') FP.initFirstPerson(w);
  const st = w.firstPersoon;
  if (!st) return false;
  st.pitch = Math.max(-85 * DEG, Math.min(85 * DEG, rad));
  return true;
};
// muisLOOK voeden zoals de speler het doet: dx/dy in pixels, met dezelfde gevoeligheid als de
// volgcam (0,0025 rad per pixel). lookActive wordt tijdelijk waar (in een test is de muis niet
// gevangen). De duur is ruim genoeg voor alle pixels: de teller gaat met vaste stappen en wat
// tijdens het tekenen van een frame binnenkomt wordt aan het eind van dat frame weer op nul gezet.
const feedLook = async (px, py = 0) => {
  if (!px && !py) return;
  const inp = D.input, orig = inp.lookActive;
  inp.lookActive = () => true;
  const stapDx = 20, stapDy = 20;
  let links = Math.abs(px), boven = Math.abs(py);
  const sx = Math.sign(px), sy = Math.sign(py);
  const iv = setInterval(() => {
    if (links > 0) { const d = Math.min(stapDx, links); inp.mouse.dx += sx * d; links -= d; }
    if (boven > 0) { const d = Math.min(stapDy, boven); inp.mouse.dy += sy * d; boven -= d; }
  }, 8);
  const ticks = Math.max(Math.abs(px) / stapDx, Math.abs(py) / stapDy, 0);
  await sleep(ticks * 10 + 350);
  clearInterval(iv); inp.lookActive = orig; inp.mouse.dx = 0; inp.mouse.dy = 0;
};
// in een voertuig draait de eerste-persooncamera op de voertuighoek + lookYaw; die hoek volgt uit
// muis-dx, dus we draaien in een lus tot de gemeten kijkrichting klopt (de stand is van buitenaf
// niet te zetten, alleen via dezelfde muisweg die de speler gebruikt)
const draaiInVoertuig = async (doelRelYaw, basisYaw, label) => {
  let laatste = 0;
  for (let ronde = 0; ronde < 8; ronde++) {
    const nu = rondHoek(kijkStand().yaw - basisYaw);
    laatste = nu;
    const verschil = rondHoek(doelRelYaw - nu);
    if (Math.abs(verschil) < 0.12) break;
    await feedLook(verschil / 0.0025);
    await sleep(300);
  }
  const nu = rondHoek(kijkStand().yaw - basisYaw);
  return { beeld: label, doel: +doelRelYaw.toFixed(2), bereikt: +nu.toFixed(2), gelukt: Math.abs(rondHoek(nu - doelRelYaw)) < 0.3 };
};
// een straal vanuit de camera tegen de eigen auto/bus: vangt een gat in de binnenhuid op
const rayAfstand = (richting, ver = 15) => {
  const R = new sc.THREE.Raycaster();
  R.near = 0.05; R.far = ver;
  R.set(sc.cam.position.clone(), richting.clone().normalize());
  const obj = (p.inVehicle ? sc.actors().vehicles.get(p.inVehicle.id) : null);
  if (!obj) return null;
  const hits = R.intersectObject(obj, true);
  return hits.length ? +hits[0].distance.toFixed(2) : null;
};
// Toets alleen de dichte panelen van de binnenhuid: vloer (recht omlaag), hemel (recht omhoog), de
// deur/zijwand onder de raamlijn (schuin omlaag opzij) en de achterwand onder de raamlijn (schuin
// omlaag achteruit). Door de ramen heen hoort niets geraakt te worden; dat beoordelen we op de beelden.
// Een treffer betekent: er zit iets dichts (vloer, wand, stoel) tussen oog en buitenwereld.
const binnenhuidCheck = (soort) => {
  const yaw = kijkStand().yaw;
  const schuin = (soort === 'bus' ? 25 : 35) * DEG;
  const cs = Math.cos(schuin), sn = Math.sin(schuin);
  const links = new sc.THREE.Vector3(-Math.sin(yaw) * cs, -sn, Math.cos(yaw) * cs);
  const rechts = new sc.THREE.Vector3(Math.sin(yaw) * cs, -sn, -Math.cos(yaw) * cs);
  const achter = new sc.THREE.Vector3(-Math.cos(yaw) * cs, -sn, -Math.sin(yaw) * cs);
  const uit = {
    vloer: rayAfstand(new sc.THREE.Vector3(0, -1, 0), soort === 'bus' ? 4 : 3),
    hemel: rayAfstand(new sc.THREE.Vector3(0, 1, 0), soort === 'bus' ? 4 : 3),
    deurLinks: rayAfstand(links, soort === 'bus' ? 4 : 3),
    deurRechts: rayAfstand(rechts, soort === 'bus' ? 4 : 3),
    achterwandOnderRaam: rayAfstand(achter, soort === 'bus' ? 18 : 3),
  };
  uit.geenTreffer = Object.entries(uit).filter(([, v]) => v === null).map(([k]) => k);
  return uit;
};

// ---- voertuigen in de scene --------------------------------------------------------
const keepStill = new Set();
const spawn = (model, x, y, a) => {
  const v = new VH.Vehicle(x, y, a, { ...model });
  v.speed = 0; v._qaX = x; v._qaY = y; v._qaA = a;
  w.vehicles.push(v);
  keepStill.add(v);
  return v;
};
const releaseVehicle = (v) => {
  keepStill.delete(v);
  const i = w.vehicles.indexOf(v);
  if (i >= 0) w.vehicles.splice(i, 1);
};
const keepInterval = setInterval(() => {
  for (const v of keepStill) {
    if (!Number.isFinite(v._qaX)) continue;
    v.x = v._qaX; v.y = v._qaY; v.angle = v._qaA; v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  }
}, 25);
const vehicleMesh = (v) => sc.actors().vehicles.get(v.id);
// Staat het voertuig nog in de wereld en is zijn mesh (via alle ouders) zichtbaar? Zo niet, dan zegt
// een leeg beeld niets over het interieur maar over het harnas (bijv. een auto die is opgeruimd).
const meshStand = (v) => {
  const m = vehicleMesh(v);
  if (!m) return { bestaat: false };
  let zichtbaar = true, o = m;
  while (o && o !== sc.scene) { if (!o.visible) zichtbaar = false; o = o.parent; }
  return { bestaat: true, eigenZichtbaar: !!m.visible, ketenZichtbaar: zichtbaar, positie: [+m.position.x.toFixed(1), +m.position.y.toFixed(1), +m.position.z.toFixed(1)] };
};
const cabinInfo = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const cab = mesh.userData.cabin;
  return {
    mesh: true, cabine: !!cab, zichtbaar: !!(cab && cab.visible), lod: mesh.userData.cabinLod ?? null,
    driehoeken: cab ? tri(cab.geometry) : -1, cabMeshId: cab ? cab.id : null, geoId: cab && cab.geometry ? cab.geometry.id : null,
    binneninCamera: !!(mesh.userData.interior && mesh.userData.interior.visible),
  };
};
const busInfo = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const ud = mesh.userData;
  const inrichting = ud.busInt;
  return {
    mesh: true,
    inrichting: { bestaat: !!inrichting, zichtbaar: !!(inrichting && inrichting.visible), lod: ud.busIntLod ?? null, driehoeken: inrichting ? tri(inrichting.geometry) : -1, geoId: inrichting && inrichting.geometry ? inrichting.geometry.id : null, meshId: inrichting ? inrichting.id : null },
    reizigers: { bestaat: !!ud.busPas, zichtbaar: !!(ud.busPas && ud.busPas.visible), driehoeken: ud.busPas ? tri(ud.busPas.geometry) : -1 },
  };
};
// hoeveel (en welke) interieurmeshes hangen er onder één voertuig
const interieurMeshes = (mesh) => {
  const uit = [];
  const walk = (o, diep) => {
    if (!o || !o.children || diep > 8) return;
    for (const c of o.children) { if (c.name === 'cabine' || c.name === 'businterieur' || c.name === 'busreizigers' || c.name === 'interieur-vast') uit.push(c); walk(c, diep + 1); }
  };
  walk(mesh, 0);
  return uit;
};
const cheb = (x, y) => Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
const CAB_R = Array.isArray(C3 && C3.CABIN_LOD_R) ? C3.CABIN_LOD_R : null;
const BUS_R = Array.isArray(BI && BI.BUS_LOD_R) ? BI.BUS_LOD_R : null;
const CAR_MAX_R = CAB_R ? CAB_R[2] : (C3 && C3.CABIN_R) || 25;
const BUS_MAX_R = BUS_R ? BUS_R[2] : (BI && BI.INT_R) || 18;
const niveauAuto = (d) => (C3 && typeof C3.cabinLodAt === 'function' ? C3.cabinLodAt(d) : null);
const niveauBus = (d) => (BI && typeof BI.busLodAt === 'function' ? BI.busLodAt(d) : null);

// Punt-in-pand en vrij zicht: de camera's van de buitenronde moeten op open grond staan en vrij zicht
// op het voertuig hebben, anders duwt de botsingsbescherming van de filmcamera de stand omhoog (een
// beeld vanaf een dak is geen eerlijk interieurbeeld).
const puntInPand = (x, y) => {
  try { if (PG && typeof PG.isInsideBuilding === 'function') return !!PG.isInsideBuilding(map, x, y); } catch (e) { /* geen test */ }
  try { if (typeof map.buildingsNear === 'function') { for (const b of map.buildingsNear(x, y, 1)) { const q = b.bounds; if (q && x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]) return true; } } } catch (e) { /* geen index */ }
  return false;
};
const vrijPunt = (x, y) => !puntInPand(x, y) && !puntInPand(x + 0.8, y) && !puntInPand(x - 0.8, y) && !puntInPand(x, y + 0.8) && !puntInPand(x, y - 0.8);
const vrijZicht = (x0, y0, x1, y1) => {
  for (let i = 1; i <= 20; i++) { const t = i / 21; if (puntInPand(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
};
const kandidaatHoeken = (voorkeur) => {
  const uit = [];
  for (const off of voorkeur) for (const teken of [1, -1]) uit.push(off * teken);
  for (let i = 1; i <= 12; i++) uit.push(i * Math.PI / 12, -i * Math.PI / 12);
  return [...new Set(uit.map((x) => +x.toFixed(3)))];
};
// Chebyshev-afstand tussen de speler en een voertuig: precies de maat die syncCabins gebruikt
const chebVan = (v) => Math.max(Math.abs(v.x - p.x), Math.abs(v.y - p.y));
// Een punt op de Chebyshev-cirkel (vierkant) op afstand d van het voertuig, in richting theta.
// Zo is de afstand die syncCabins ziet exact d, ongeacht de hoek.
const vierkantPunt = (cx, cy, d, theta) => {
  const ux = Math.cos(theta), uy = Math.sin(theta);
  const k = d / Math.max(Math.abs(ux), Math.abs(uy));
  return { x: cx + ux * k, y: cy + uy * k };
};
// Kies een ankerpunt (de spelerpositie die de LOD bepaalt) op exact Chebyshev-afstand d, op open grond.
const kiesAnker = async (v, d, voorkeurHoeken) => {
  for (const off of kandidaatHoeken(voorkeurHoeken)) {
    const hoek = v.angle + off;
    const q = vierkantPunt(v.x, v.y, d, hoek);
    if (!vrijPunt(q.x, q.y)) continue;
    setAnchor(q.x, q.y, hoek);
    await sleep(240);
    return { x: p.x, y: p.y, hoek, cheb: chebVan(v), vrij: true };
  }
  // geen open punt gevonden: meet toch, maar meld het
  const q = vierkantPunt(v.x, v.y, d, v.angle);
  setAnchor(q.x, q.y, v.angle);
  await sleep(400);
  return { x: p.x, y: p.y, hoek: v.angle, cheb: chebVan(v), vrij: false };
};
// Een beeld van buiten vanaf een vrije, open stand: eerst een hoek/afstand zoeken waar de camera op
// de grond blijft (geen dak) en het voertuig in beeld staat; pas dan vastleggen. Zo is elk buitenbeeld
// bruikbaar voor het oordeel en liegt de afstand niet.
const schietVrij = async (naam, v, afstanden, voorkeurHoeken, lookAtH, fov = 74) => {
  const probeersels = [];
  for (const d of afstanden) {
    for (const off of kandidaatHoeken(voorkeurHoeken)) {
      const hoek = v.angle + off;
      const q = vierkantPunt(v.x, v.y, d, hoek);
      if (!vrijPunt(q.x, q.y)) { probeersels.push({ d, hoek: +rondHoek(off).toFixed(2), reden: 'punt in gebouw' }); continue; }
      if (!vrijZicht(q.x, q.y, v.x, v.y)) { probeersels.push({ d, hoek: +rondHoek(off).toFixed(2), reden: 'geen vrij zicht' }); continue; }
      const ghDoel = gh(v.x, v.y);
      const pose = {
        position: { x: q.x, y: q.y, z: gh(q.x, q.y) + 1.3 },
        lookAt: { x: v.x, y: v.y, z: ghDoel + lookAtH }, fov, cut: true,
      };
      const info = await poseShot(naam, pose, 950, {
        hide: true,
        target: { x: v.x, y: v.y, h: ghDoel + lookAtH },
        check: (i) => i.verschilH < 0.6 && !!(i.doel && i.doel.projectie.inBeeld),
      });
      if (!info.overgeslagen) {
        const cheb = Math.max(Math.abs(q.x - v.x), Math.abs(q.y - v.y));
        info.hoek = +rondHoek(hoek - v.angle).toFixed(2);
        info.cheb = +cheb.toFixed(1);
        info.afstandGezocht = d;
        info.lodBijAfstand = v.isBus ? niveauBus(cheb) : niveauAuto(cheb);
        info.geprobeerd = probeersels;
        info.mesh = meshStand(v);
        return info;
      }
      probeersels.push({ d, hoek: +rondHoek(off).toFixed(2), reden: 'camera weggeduwd', hoogte: info.verschilH });
    }
  }
  // laatste redmiddel: een stand die niet vrij is (of door de guard is weggeduwd) toch vastleggen, zodat
  // het beeld bestaat en het probleem zichtbaar is; het beeld krijgt dan geforceerd: true
  for (const d of afstanden) {
    for (const off of kandidaatHoeken(voorkeurHoeken)) {
      const hoek = v.angle + off;
      const q = vierkantPunt(v.x, v.y, d, hoek);
      const ghDoel = gh(v.x, v.y);
      const pose = {
        position: { x: q.x, y: q.y, z: gh(q.x, q.y) + 1.3 },
        lookAt: { x: v.x, y: v.y, z: ghDoel + lookAtH }, fov, cut: true,
      };
      const info = await poseShot(naam, pose, 950, { hide: true, target: { x: v.x, y: v.y, h: ghDoel + lookAtH } });
      if (!info.overgeslagen) {
        info.hoek = +rondHoek(hoek - v.angle).toFixed(2);
        info.cheb = +Math.max(Math.abs(q.x - v.x), Math.abs(q.y - v.y)).toFixed(1);
        info.afstandGezocht = d;
        info.lodBijAfstand = v.isBus ? niveauBus(info.cheb) : niveauAuto(info.cheb);
        info.geprobeerd = probeersels;
        info.geforceerd = true;
        info.mesh = meshStand(v);
        return info;
      }
      break;
    }
  }
  return { naam, overgeslagen: true, probeersels };
};
const wachtOpLod = async (v, verwacht, soort, ms = 2500) => {
  const lees = () => (soort === 'bus' ? busInfo(v) : cabinInfo(v));
  const klaar = (i) => {
    if (soort === 'bus') {
      if (!i.mesh) return false;
      if (verwacht < 0) return !i.inrichting.zichtbaar;
      return i.inrichting.zichtbaar && i.inrichting.lod === verwacht && i.inrichting.driehoeken > 0;
    }
    if (!i.mesh) return false;
    if (verwacht < 0) return !i.zichtbaar;
    return i.zichtbaar && i.lod === verwacht && i.driehoeken > 0;
  };
  const gezien = await waitFor(() => (klaar(lees()) ? lees() : null), ms);
  return gezien || lees();
};
// De figuren in de buurt van de speler/het voertuig: is het eigen figuur (dezelfde referentie)
// zichtbaar, en wie staan er nog meer in de buurt (metgezel, voetgangers)? Het eigen lichaam hoort
// in eerste persoon weg te zijn; een metgezel of voorbijganger in beeld is de wereld, geen fout.
const figurenRond = (straal = 8) => {
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  const uit = [];
  for (const c of personRoots()) {
    const d = Math.hypot(c.position.x - px, c.position.z - py);
    if (d > straal) continue;
    const comp = w.companion;
    const isMetgezel = !!(comp && Math.hypot(c.position.x - comp.x, c.position.z - comp.y) < 1.5);
    uit.push({ isSpeler: c === state.playerMesh, isMetgezel, zichtbaar: !!c.visible, afstand: +d.toFixed(2) });
  }
  return uit;
};

// ---- stap: personenauto op afstand (LOD-trap + beelden) -----------------------------
const state = {};
async function stapAuto() {
  const out = { afstanden: [], beelden: [], notities: [] };
  const rd = nearestRoadHeading(GM.x, GM.y, 250);
  if (!rd) throw new Error('geen weg bij de Grote Markt');
  if (!state.warmed) { await go(rd.x, rd.y, rd.a, SETTLE); state.warmed = true; }
  state.road = rd;
  const model = VH.TRAFFIC_MODELS().find((m) => m.name === 'sedan');
  if (!model) throw new Error('geen sedan-model in TRAFFIC_MODELS');
  const cx = rd.x + Math.cos(rd.a) * 4, cy = rd.y + Math.sin(rd.a) * 4;
  const car = spawn(model, cx, cy, rd.a);
  state.car = car; state.carModel = model;
  const mesh = await waitFor(() => vehicleMesh(car), 6000);
  out.auto = { id: car.id, model: car.model.name, len: car.model.len, wid: car.model.wid, mesh: !!mesh, meshStand: meshStand(car) };
  out.lod = CAB_R ? { CABIN_LOD_R: CAB_R, niveauFunctie: typeof C3.cabinLodAt === 'function' } : { CABIN_R: CAR_MAX_R, opmerking: 'geen CABIN_LOD_R: oude enkelvoudige cabine' };
  // de meetafstanden komen uit de echte drempels: één punt per niveau, één voorbij de verste straal,
  // plus net binnen en net buiten elke grens. De vaste punten (5/20/50/70) zijn afgesproken; wijkt de
  // trap in de code af, dan leiden we ze uit de constanten af en zeggen we dat in de json.
  const vasteAuto = [5, 20, 50, 70];
  const verwachtAuto = [0, 1, 2, -1];
  const vastKlopt = CAB_R && vasteAuto.every((d, i) => niveauAuto(d) === verwachtAuto[i]);
  const vereist = vastKlopt ? vasteAuto : (CAB_R ? [Math.max(2, Math.round(CAB_R[0] * 0.357)), Math.round((CAB_R[0] + CAB_R[1]) / 2), Math.round((CAB_R[1] + CAB_R[2]) / 2), CAB_R[2] + 6] : [5, 18, 60, 90]);
  out.vasteAfstanden = { gebruikt: vereist, afgesproken: vasteAuto, klopt: !!vastKlopt };
  const meets = [...vereist];
  const drempels = CAB_R || [CAR_MAX_R];
  for (const t of drempels) meets.push(Math.max(1, +(t - 1).toFixed(1)), +(t + 1).toFixed(1));   // 1 m marge: geen jitter aan de grens
  const punten = [...new Set(meets.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  out.meetpunten = { vereist, punten };
  const g = gh(car.x, car.y);
  const doel = { x: car.x, y: car.y, h: g + 0.95 };
  // ---- 1) afstandsmetingen: anker op exact Chebyshev-d, wachten tot syncCabins het juiste niveau heeft,
  // daarna pas lezen. Zo meet je niet vóór de volgende update3D en klopt de afstand met wat het spel ziet.
  for (const d of punten) {
    const anker = await kiesAnker(car, d, d <= 6 ? [0, 0.5, -0.5, 1.0, -1.0] : [0, 0.4, -0.4, 0.9, -0.9, 1.4, -1.4]);
    await sleep(420);                                  // nog een paar frames settling
    const cheb = chebVan(car);
    const verwacht = niveauAuto(cheb);
    const info = await wachtOpLod(car, verwacht, 'auto', 2500);
    out.afstanden.push({
      afstand: d, werkelijkAfstand: +cheb.toFixed(2), niveau: verwacht, verwachtZichtbaar: verwacht >= 0,
      anker: { hoek: +rondHoek(anker.hoek - car.angle).toFixed(2), vrij: anker.vrij },
      ...info,
    });
  }
  // ---- 2) beelden van buiten: de camera staat rond de GESP AWNDE auto en kijkt naar het midden van de
  // carrosserie. De stand is een vrij punt op Chebyshev-afstand d, zodat beeld en LOD-meting dezelfde
  // afstand hebben; de filmcamera mag zich niet omhoog duwen (dan volgt een andere hoek). De projectie
  // van het doel in result.json bewijst dat de auto in beeld staat.
  const dichtbij = async (naam, afstanden, voorkeur) => {
    const shot = await schietVrij(naam, car, afstanden, voorkeur, 0.95, 74);
    if (!shot.overgeslagen) out.beelden.push(shot);
    else out.notities.push(naam + ': geen vrije camerastand (' + JSON.stringify(shot.probeersels.slice(0, 4)) + ')');
    return shot;
  };
  // dichtbij: driekwart voor en een echt zijaanzicht, op raamhoogte (~1,2 m), door de ruiten
  await dichtbij('auto-dichtbij-driekwart', [4.2, 3.8, 4.6], [0.62, 0.45, 1.0]);
  await dichtbij('auto-dichtbij-zij', [3.4, 3.0, 3.8], [Math.PI / 2, -Math.PI / 2, 1.2]);
  // op de LOD-afstanden: driekwart van voren en van opzij; de afstand mag een paar meter schuiven als
  // er anders geen vrije stand is (de gemeten Chebyshev-afstand en het niveau staan in de json)
  const afstandKandidaten = (d) => (d <= 6 ? [d, d - 1, d + 1] : [d, d - 2, d + 2]);
  for (const d of vereist) {
    const shot = await schietVrij('auto-' + d + 'm-driekwart', car, afstandKandidaten(d), [0.62, 0.4, -0.62, 0, 1.0], 0.95, 74);
    if (!shot.overgeslagen) out.beelden.push(shot); else out.notities.push('auto-' + d + 'm-driekwart: geen vrije stand');
    if (d >= 20) {
      const zij = await schietVrij('auto-' + d + 'm-zij', car, afstandKandidaten(d), [Math.PI / 2, -Math.PI / 2, 1.2, -1.2], 0.95, 74);
      if (!zij.overgeslagen) out.beelden.push(zij); else out.notities.push('auto-' + d + 'm-zij: geen vrije stand');
    }
  }
  // ---- 3) deelt de geometrie per niveau, en hangt er maar één cabine per auto?
  const ankerDeling = await kiesAnker(car, 20, [0.4, -0.4, 0]);
  const car2 = spawn(model, car.x + 5, car.y + 2, car.angle);
  await waitFor(() => { const i = cabinInfo(car2); return i.cabine ? i : null; }, 4000);
  await sleep(500);
  const i2 = cabinInfo(car2), i1 = cabinInfo(car);
  out.deling = { auto1Geo: i1.geoId, auto2Geo: i2.geoId, auto1Niveau: i1.lod, auto2Niveau: i2.lod, gelijk: i1.geoId !== null && i1.geoId === i2.geoId, cabMeshesAuto1: interieurMeshes(vehicleMesh(car) || {}).filter((m) => m.name === 'cabine').length, cabMeshesAuto2: interieurMeshes(vehicleMesh(car2) || {}).filter((m) => m.name === 'cabine').length, anker: ankerDeling.hoek };
  releaseVehicle(car2);
  // ---- 4) oordeel over de trap
  const bij = (d) => out.afstanden.find((r) => r.afstand === d) || {};
  const [t0, t1, t2, t9] = vereist.map((d) => bij(d));
  out.lodTrap = {
    punten: vereist.map((d) => ({ afstand: d, werkelijkAfstand: bij(d).werkelijkAfstand, niveau: bij(d).niveau, lod: bij(d).lod, zichtbaar: !!bij(d).zichtbaar, driehoeken: bij(d).driehoeken })),
    striktAfnemend: t0.driehoeken > t1.driehoeken && t1.driehoeken > t2.driehoeken,
    leegVoorbijVerste: !t9.zichtbaar,
    niveauKlopt: [t0, t1, t2].every((q) => q.zichtbaar && q.lod === q.niveau) && t9.niveau === -1 && !t9.zichtbaar,
    driehoeken: { lod0: t0.driehoeken, lod1: t1.driehoeken, lod2: t2.driehoeken },
    verhoudingen: {
      lod1VanLod0: t0.driehoeken > 0 ? +(t1.driehoeken / t0.driehoeken).toFixed(2) : null,
      lod2VanLod1: t1.driehoeken > 0 ? +(t2.driehoeken / t1.driehoeken).toFixed(2) : null,
    },
    bovengrens: { lod0Max: 1200, lod0Ok: t0.driehoeken > 0 && t0.driehoeken <= 1200, lod2Klein: t2.driehoeken > 0 && t2.driehoeken <= 400 },
  };
  if (CAB_R) {
    out.drempels = CAB_R.map((t) => {
      const bin = bij(t - 1) || {}, buiten = bij(t + 1) || {};
      return { grens: t, binnen: { werkelijkAfstand: bin.werkelijkAfstand, niveau: niveauAuto(bin.werkelijkAfstand ?? 0), lod: bin.lod, tri: bin.driehoeken, zichtbaar: bin.zichtbaar }, buiten: { werkelijkAfstand: buiten.werkelijkAfstand, niveau: niveauAuto(buiten.werkelijkAfstand ?? 0), lod: buiten.lod, tri: buiten.driehoeken, zichtbaar: buiten.zichtbaar }, wisselt: bin.lod !== buiten.lod || bin.zichtbaar !== buiten.zichtbaar };
    });
  }
  out.cameraDuwnotities = out.beelden.filter((b) => b.verschilH > 1 || b.verschilM > 1.5).map((b) => b.naam + ': ' + (b.verschilM > 1.5 ? b.verschilM + ' m zijwaarts ' : '') + (b.verschilH > 1 ? b.verschilH + ' m omhoog' : ''));
  out.beeldControle = out.beelden.map((b) => ({ naam: b.naam, inBeeld: b.doel && b.doel.projectie.inBeeld, kijkDot: b.doel && b.doel.kijkDot, afstand: b.doel && b.doel.afstand, hoogteVerschil: b.verschilH, mesh: b.mesh }));
  return out;
}

// ---- stap: stadsbus (passagiersruimte, LOD, reizigers) -----------------------------
async function stapBus() {
  const out = { afstanden: [], beelden: [], notities: [] };
  const rd = state.road || nearestRoadHeading(GM.x, GM.y, 250);
  if (!rd) throw new Error('geen weg bij de Grote Markt');
  if (!state.warmed) { await go(rd.x, rd.y, rd.a, SETTLE); state.warmed = true; }
  state.road = rd;
  const model = VH.TRAFFIC_MODELS().find((m) => m.name === 'bus');
  if (!model) throw new Error('geen bus-model in TRAFFIC_MODELS');
  const bx = rd.x + Math.cos(rd.a) * 30 - Math.sin(rd.a) * 2.4;
  const by = rd.y + Math.sin(rd.a) * 30 + Math.cos(rd.a) * 2.4;
  const bus = spawn(model, bx, by, rd.a);
  // de buspopulatie ruimt bussen zonder dienst op als de speler ver weg staat (buspop.js); deze
  // testbus is geen lijndienst, dus we zetten een (nep)dienst neer zodat hij blijft staan
  bus.busRun = { qa: true };
  state.bus = bus;
  const mesh = await waitFor(() => vehicleMesh(bus), 6000);
  out.bus = { id: bus.id, model: bus.model.name, len: bus.model.len, wid: bus.model.wid, trailer: bus.model.trailer || 0, mesh: !!mesh, meshStand: meshStand(bus) };
  out.lod = BUS_R ? { BUS_LOD_R: BUS_R, niveauFunctie: typeof BI.busLodAt === 'function' } : { INT_R: BUS_MAX_R, opmerking: 'geen BUS_LOD_R: oude enkelvoudige binnenruimte' };
  const vasteBus = [10, 30, 60, 90];
  const verwachtBus = [0, 1, 2, -1];
  const vastKlopt = BUS_R && vasteBus.every((d, i) => niveauBus(d) === verwachtBus[i]);
  const vereist = vastKlopt ? vasteBus : (BUS_R ? [Math.round(BUS_R[0] * 0.5), Math.round((BUS_R[0] + BUS_R[1]) / 2), Math.round((BUS_R[1] + BUS_R[2]) / 2), BUS_R[2] + 6] : [10, 30, 60, 90]);
  out.vasteAfstanden = { gebruikt: vereist, afgesproken: vasteBus, klopt: !!vastKlopt };
  const meets = [...vereist];
  const drempels = BUS_R || [BUS_MAX_R];
  for (const t of drempels) meets.push(Math.max(1, +(t - 1).toFixed(1)), +(t + 1).toFixed(1));   // 1 m marge: geen jitter aan de grens
  const punten = [...new Set(meets.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  out.meetpunten = { vereist, punten };
  const g = gh(bus.x, bus.y);
  for (const d of punten) {
    const anker = await kiesAnker(bus, d, d <= 6 ? [0, 0.6, -0.6, 1.0, -1.0] : [0.62, -0.62, 0.4, -0.4, 1.0, -1.0]);
    await sleep(420);
    const cheb = chebVan(bus);
    const verwacht = niveauBus(cheb);
    const info = await wachtOpLod(bus, verwacht, 'bus', 2500);
    out.afstanden.push({
      afstand: d, werkelijkAfstand: +cheb.toFixed(2), niveau: verwacht, verwachtZichtbaar: verwacht >= 0,
      anker: { hoek: +rondHoek(anker.hoek - bus.angle).toFixed(2), vrij: anker.vrij },
      ...info,
    });
  }
  const dichtbij = async (naam, afstanden, voorkeur) => {
    const shot = await schietVrij(naam, bus, afstanden, voorkeur, 1.4, 72);
    if (!shot.overgeslagen) out.beelden.push(shot);
    else out.notities.push(naam + ': geen vrije camerastand (' + JSON.stringify(shot.probeersels.slice(0, 4)) + ')');
    return shot;
  };
  // dichtbij: driekwart voor (voorruit + zijkant) en een echt zijaanzicht op raamhoogte
  await dichtbij('bus-dichtbij-driekwart', [7, 6, 8], [0.7, 0.45, 1.0]);
  await dichtbij('bus-dichtbij-zij', [bus.model.wid / 2 + 3.2, bus.model.wid / 2 + 2.6, bus.model.wid / 2 + 4], [Math.PI / 2, -Math.PI / 2, 1.2]);
  // op de LOD-afstanden: driekwart van voren en van opzij (reizigers alleen dichtbij). De afstand mag
  // een paar meter schuiven als er anders geen vrije stand is; de gemeten afstand staat in de json.
  const afstandKandidaten = (d) => (d <= 12 ? [d, d - 1, d + 1] : [d, d - 2, d + 2]);
  for (const d of vereist) {
    const shot = await schietVrij('bus-' + d + 'm-driekwart', bus, afstandKandidaten(d), [0.62, 0.4, -0.62, 0, 1.0], 1.4, 72);
    if (!shot.overgeslagen) out.beelden.push(shot); else out.notities.push('bus-' + d + 'm-driekwart: geen vrije stand');
    const zij = await schietVrij('bus-' + d + 'm-zij', bus, afstandKandidaten(d), [Math.PI / 2, -Math.PI / 2, 1.2, -1.2], 1.4, 72);
    if (!zij.overgeslagen) out.beelden.push(zij); else out.notities.push('bus-' + d + 'm-zij: geen vrije stand');
  }
  const bij = (d) => out.afstanden.find((r) => r.afstand === d) || {};
  const [b0, b1, b2, b9] = vereist.map((d) => bij(d));
  const reiz = (x) => !!(x.reizigers && x.reizigers.zichtbaar);
  out.lodTrap = {
    punten: vereist.map((d) => ({ afstand: d, werkelijkAfstand: bij(d).werkelijkAfstand, niveau: bij(d).niveau, lod: bij(d).inrichting && bij(d).inrichting.lod, zichtbaar: !!(bij(d).inrichting && bij(d).inrichting.zichtbaar), driehoeken: bij(d).inrichting && bij(d).inrichting.driehoeken, reizigers: !!(bij(d).reizigers && bij(d).reizigers.zichtbaar) })),
    striktAfnemend: (b0.inrichting.driehoeken || 0) > (b1.inrichting.driehoeken || 0) && (b1.inrichting.driehoeken || 0) > (b2.inrichting.driehoeken || 0),
    leegVoorbijVerste: !(b9.inrichting && b9.inrichting.zichtbaar),
    niveauKlopt: [b0, b1, b2].every((q) => q.inrichting && q.inrichting.zichtbaar && q.inrichting.lod === q.niveau) && b9.niveau === -1 && !(b9.inrichting && b9.inrichting.zichtbaar),
    driehoeken: { lod0: b0.inrichting.driehoeken, lod1: b1.inrichting.driehoeken, lod2: b2.inrichting.driehoeken },
    reizigersDichtbij: reiz(b0), reizigersMidden: reiz(b1), reizigersVer: reiz(b2),
    meshes: interieurMeshes(vehicleMesh(bus) || {}).map((m) => m.name),
  };
  if (BUS_R) {
    out.drempels = BUS_R.map((t) => {
      const bin = bij(t - 1) || {}, buiten = bij(t + 1) || {};
      return { grens: t, binnen: { werkelijkAfstand: bin.werkelijkAfstand, niveau: niveauBus(bin.werkelijkAfstand ?? 0), lod: bin.inrichting && bin.inrichting.lod, tri: bin.inrichting && bin.inrichting.driehoeken, zichtbaar: bin.inrichting && bin.inrichting.zichtbaar }, buiten: { werkelijkAfstand: buiten.werkelijkAfstand, niveau: niveauBus(buiten.werkelijkAfstand ?? 0), lod: buiten.inrichting && buiten.inrichting.lod, tri: buiten.inrichting && buiten.inrichting.driehoeken, zichtbaar: buiten.inrichting && buiten.inrichting.zichtbaar }, wisselt: (bin.inrichting && bin.inrichting.lod) !== (buiten.inrichting && buiten.inrichting.lod) || (bin.inrichting && bin.inrichting.zichtbaar) !== (buiten.inrichting && buiten.inrichting.zichtbaar) };
    });
  }
  out.cameraDuwnotities = out.beelden.filter((b) => b.verschilH > 1 || b.verschilM > 1.5).map((b) => b.naam + ': ' + (b.verschilM > 1.5 ? b.verschilM + ' m zijwaarts ' : '') + (b.verschilH > 1 ? b.verschilH + ' m omhoog' : ''));
  out.beeldControle = out.beelden.map((b) => ({ naam: b.naam, inBeeld: b.doel && b.doel.projectie.inBeeld, kijkDot: b.doel && b.doel.kijkDot, afstand: b.doel && b.doel.afstand, hoogteVerschil: b.verschilH, mesh: b.mesh }));
  return out;
}

// ---- stap: eerste persoon te voet --------------------------------------------------
async function stapVoet() {
  const out = { module: !!FP };
  if (!FP) { out.overgeslagen = 'firstperson.js ontbreekt in deze build'; return out; }
  if (typeof FP.initFirstPerson === 'function') { try { FP.initFirstPerson(w); } catch (e) { out.initFout = String(e.message); } }
  if (fpOn()) fpSet(false);
  const rd = nearestRoadHeading(GM.x, GM.y, 250);
  if (rd && !state.warmed) { await go(rd.x, rd.y, rd.a, SETTLE); state.warmed = true; }
  await go(GM.x, GM.y, 0.3, SETTLE);
  setAnchor(GM.x, GM.y, 0.3);
  await sleep(700);
  const figVoor = findPlayerFig();
  state.playerMesh = figVoor;                     // referentie: later controleren we déze mesh, niet "iemand in de buurt"
  out.voor = { fp: fpOn(), figuur: figInfo(figVoor), isPlayerMesh: !!figVoor, camAfstand: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2) };
  fpSet(true);
  await sleep(1500);
  const g = gh(p.x, p.y);
  const stand = kijkStand();
  out.aan = { methode: 'setFirstPerson', fp: fpOn(), stand: w.firstPersoon ? { on: w.firstPersoon.on, pitch: +w.firstPersoon.pitch.toFixed(3) } : null };
  out.camera = {
    ooghoogte: +(sc.cam.position.y - g).toFixed(2),
    horizontaalVanSpeler: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2),
    kijkhoek: +rondHoek(stand.yaw).toFixed(3), camYaw: +(w.camYaw ?? 0).toFixed(3), pitch: +stand.pitch.toFixed(3),
  };
  // het eigen figuur: dezelfde referentie als vóór het aanzetten, plus alle andere figuren in de buurt
  const fig = state.playerMesh;
  out.figuur = {
    gevonden: !!fig,
    playerMeshZichtbaar: fig ? !!fig.visible : null,
    playerMeshSchaduwZichtbaar: fig && fig.userData.shadow ? !!fig.userData.shadow.visible : null,
    anderen: figurenRond(10).filter((f) => !f.isSpeler),
  };
  out.beelden = [];
  for (const [naam, delta, pitch] of [['voor', 0, 0], ['links', Math.PI / 2, 0], ['rechts', -Math.PI / 2, 0], ['omlaag', 0, -60 * DEG]]) {
    setAnchor(GM.x, GM.y, 0.3 + delta);
    zetPitch(pitch);
    await sleep(650);
    await capture('fp-voet-' + naam);
    out.beelden.push({ naam: 'fp-voet-' + naam, kijkhoek: +rondHoek(kijkStand().yaw).toFixed(3), pitch: +kijkStand().pitch.toFixed(3) });
  }
  zetPitch(0);
  // ---- muisLOOK echt testen: de tick mag world.camYaw niet terugzetten, dus hold even weg; de
  // spellogica leest mouse.dx/dy zoals bij een gevangen muis (lookActive tijdelijk waar).
  hold = null;
  p.vx = p.vy = 0;
  w.camYaw = 0.3;
  zetPitch(0);
  await sleep(350);
  const y0 = kijkStand();
  await feedLook((Math.PI / 2) / 0.0025);          // +90 graden: dx > 0 draait linksom (tegen de klok)
  await sleep(350);
  const y1 = kijkStand();
  const muis = {
    dx: { voor: +y0.yaw.toFixed(3), na: +y1.yaw.toFixed(3), delta: +rondHoek(y1.yaw - y0.yaw).toFixed(3), verwacht: 1.57, camYawNa: +(w.camYaw ?? 0).toFixed(3), gelukt: Math.abs(rondHoek(y1.yaw - y0.yaw)) > 1.2 },
  };
  // dy: muis omlaag (positieve dy) hoort de blik omlaag te zetten, dus de kijkrichting-pitch negatief
  w.camYaw = 0.3;
  zetPitch(0);
  await sleep(300);
  const p0 = kijkStand().pitch;
  await feedLook(0, 600);
  await sleep(350);
  const p1 = kijkStand().pitch;
  muis.dy = { voor: +p0.toFixed(3), na: +p1.toFixed(3), delta: +(p1 - p0).toFixed(3), standPitch: w.firstPersoon ? +w.firstPersoon.pitch.toFixed(3) : null, dyPositiefKijktOmlaag: p1 < p0 - 0.05, gelukt: Math.abs(p1 - p0) > 0.3 };
  muis.verwacht = { dxPositief: 'kijkt linksom (+yaw)', dyPositief: 'kijkt omlaag (pitch < 0)' };
  out.muisLook = muis;
  // ---- terugval-oog zonder eigen figuur (fiets): de camera moet op ooghoogte boven de fietser staan,
  // niet op de kaart-y of een dubbele hoogte (bugfix in firstpersoncam.js)
  const bikeModel = (VH.TRAFFIC_MODELS() || []).find((m) => m.name === 'bike');
  if (bikeModel) {
    const fiets = spawn(bikeModel, GM.x + 4, GM.y - 4, 0.4);
    await sleep(900);
    teleport(fiets.x, fiets.y);
    p.enterVehicle(fiets, w);
    keepStill.delete(fiets);
    await sleep(1800);
    const gFiets = gh(fiets.x, fiets.y);
    const camFiets = { x: sc.cam.position.x, y: sc.cam.position.z, h: sc.cam.position.y };
    const standFiets = kijkStand();
    out.fiets = {
      fp: fpOn(), inVoertuig: !!p.inVehicle, isBike: !!(p.inVehicle && p.inVehicle.isBike),
      ooghoogte: +(camFiets.h - gFiets).toFixed(2),
      horizontaalVanFiets: +Math.hypot(camFiets.x - fiets.x, camFiets.y - fiets.y).toFixed(2),
      opSpelerpositie: +Math.hypot(camFiets.x - p.x, camFiets.y - p.y).toFixed(2),
      kijkhoek: +rondHoek(standFiets.yaw).toFixed(3), fietsHoek: +fiets.angle.toFixed(3),
      playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null,
      ooghoogteKlopt: Math.abs((camFiets.h - gFiets) - 1.62) < 0.45,
    };
    await capture('fp-fiets-voor');
    out.beelden.push({ naam: 'fp-fiets-voor', kijkhoek: +rondHoek(kijkStand().yaw).toFixed(3) });
    if (p.inVehicle) p.exitVehicle(map, w);
    fiets.speed = 0; fiets._qaX = fiets.x; fiets._qaY = fiets.y; fiets._qaA = fiets.angle;
    keepStill.add(fiets);
    await sleep(1200);
    releaseVehicle(fiets);
  } else {
    out.fiets = { overgeslagen: 'geen fietsmodel' };
  }
  // terug naar de vaste stand voor het uit-beeld
  zetPitch(0);
  setAnchor(GM.x, GM.y, 0.3);
  await sleep(400);
  fpSet(false);
  await sleep(1400);
  setAnchor(GM.x, GM.y, 0.3);
  await sleep(800);
  await capture('fp-voet-uit-volgcam');
  out.beelden.push({ naam: 'fp-voet-uit-volgcam' });
  out.uit = {
    fp: fpOn(),
    playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null,
    figuur: figInfo(state.playerMesh),
    camAfstand: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2),
    camHoogte: +(sc.cam.position.y - g).toFixed(2),
  };
  return out;
}

// ---- stap: eerste persoon in de auto (dichte cabine: vloer, wanden, achterwand) ----
async function stapAutoInterieur() {
  const out = { module: !!FP };
  if (!FP) { out.overgeslagen = 'firstperson.js ontbreekt in deze build'; return out; }
  const car = state.car;
  if (!car) { out.fout = 'geen auto uit de vorige stap'; return out; }
  if (fpOn()) fpSet(false);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  // naar de auto en instappen; de auto mag nu rijden (uit de keepStill-lus)
  teleport(car.x, car.y);
  w.camYaw = car.angle;
  p.enterVehicle(car, w);
  keepStill.delete(car);
  car.speed = 0;
  await sleep(2500);
  if (!fpOn()) fpSet(true);
  await sleep(2000);
  const mesh = vehicleMesh(car);
  const ci = cabinInfo(car);
  const intGroep = mesh && mesh.userData.interior;
  const statisch = intGroep && intGroep.children && intGroep.children.find((c) => c.name === 'interieur-vast');
  const fig = state.playerMesh;
  out.binnen = {
    fp: fpOn(), inVoertuig: !!p.inVehicle, autoId: car.id,
    gedetailleerdInterieurZichtbaar: !!(intGroep && intGroep.visible),
    interieurMeshes: intGroep ? intGroep.children.filter((c) => c.isMesh).length : 0,
    interieurDriehoekenVast: statisch ? tri(statisch.geometry) : -1,
    cabine: { zichtbaar: ci.zichtbaar, driehoeken: ci.driehoeken, lod: ci.lod },
    playerMeshZichtbaar: fig ? !!fig.visible : null,
    anderen: figurenRond(8).filter((f) => !f.isSpeler),
    camera: { ooghoogte: +(sc.cam.position.y - gh(car.x, car.y)).toFixed(2), horizontaalVanAuto: +Math.hypot(sc.cam.position.x - car.x, sc.cam.position.z - car.y).toFixed(2), kijkhoek: +rondHoek(kijkStand().yaw).toFixed(3), autoHoek: +car.angle.toFixed(3) },
  };
  out.beelden = [];
  hold = null;
  w.camYaw = car.angle;
  await sleep(800);
  // vooruit, iets omlaag (dashboard en stuur), 60 graden omlaag (voeten/vloer), 90 links, 90 rechts en
  // 180 achterom: de binnenhuid moet de auto dichtmaken (geen straat door de vloer, geen lucht door het
  // dak), het eigen lichaam blijft weg. De lage schuine stand toetst alleen de dichte panelen.
  const shotInfo = async (naam, pitch = 0) => {
    zetPitch(pitch);
    await sleep(450);
    const stand = kijkStand();
    const ray = binnenhuidCheck('auto');
    await capture('fp-auto-' + naam);
    const info = {
      naam: 'fp-auto-' + naam, pitchGraden: +(stand.pitch / DEG).toFixed(1), relYaw: +rondHoek(stand.yaw - car.angle).toFixed(2),
      playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null,
      anderen: figurenRond(8).filter((f) => !f.isSpeler), binnenhuid: ray,
    };
    out.beelden.push(info);
    return info;
  };
  await shotInfo('voor', 0);
  await shotInfo('dashboard', -28 * DEG);
  await shotInfo('omlaag', -60 * DEG);
  zetPitch(0);
  // 90 graden links en rechts via dezelfde muisweg als de speler (lookYaw is niet van buiten te zetten)
  out.draaien = [];
  out.draaien.push(await draaiInVoertuig(Math.PI / 2, car.angle, 'links'));
  await shotInfo('links', 0);
  out.draaien.push(await draaiInVoertuig(-Math.PI / 2, car.angle, 'rechts'));
  await shotInfo('rechts', 0);
  out.draaien.push(await draaiInVoertuig(Math.PI, car.angle, 'achterom'));
  await shotInfo('achterom', -10 * DEG);
  out.draaien.push(await draaiInVoertuig(0, car.angle, 'terug-naar-voor'));
  // 2 s gas geven in eerste persoon, met een beeld halverwege
  zetPitch(0);
  await sleep(400);
  key('keydown', 'w', 'KeyW');
  await sleep(1300);
  const snelheidTijdens = car.speed;
  await capture('fp-auto-gas');
  out.beelden.push({ naam: 'fp-auto-gas', snelheid: +snelheidTijdens.toFixed(2) });
  await sleep(500);
  key('keyup', 'w', 'KeyW');
  await sleep(400);
  out.rijden = { snelheidTijdensGas: +snelheidTijdens.toFixed(2), snelheidNaGas: +car.speed.toFixed(2) };
  // uit de auto, eerste persoon uit, gewone volgcam
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  car.speed = 0; car._qaX = car.x; car._qaY = car.y; car._qaA = car.angle;
  keepStill.add(car);
  await sleep(1200);
  fpSet(false);
  await sleep(1400);
  await capture('fp-auto-uit-volgcam');
  out.beelden.push({ naam: 'fp-auto-uit-volgcam' });
  out.uit = { fp: fpOn(), playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null, figuur: figInfo(state.playerMesh), camAfstand: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2) };
  return out;
}

// ---- stap: eerste persoon in de stadsbus (passagiersruimte) -----------------------
async function stapBusInterieur() {
  const out = { module: !!FP };
  if (!FP) { out.overgeslagen = 'firstperson.js ontbreekt in deze build'; return out; }
  const bus = state.bus;
  if (!bus) { out.fout = 'geen bus uit de vorige stap'; return out; }
  if (fpOn()) fpSet(false);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  // de buspopulatie kan een niet-dienstbus hebben opgeruimd; zet hem dan terug op zijn eigen plek
  const zorgBus = () => {
    if (w.vehicles.indexOf(bus) < 0) { w.vehicles.push(bus); keepStill.add(bus); }
    bus.busRun = bus.busRun || { qa: true };
  };
  zorgBus();
  if (!vehicleMesh(bus)) await waitFor(() => vehicleMesh(bus), 5000);
  teleport(bus.x, bus.y);
  w.camYaw = bus.angle;
  p.enterVehicle(bus, w);
  keepStill.delete(bus);
  bus.speed = 0;
  await sleep(2600);
  zorgBus();
  if (!fpOn()) fpSet(true);
  await sleep(2000);
  const mesh = vehicleMesh(bus);
  const bi = busInfo(bus);
  const fig = state.playerMesh;
  out.binnen = {
    fp: fpOn(), inVoertuig: !!p.inVehicle, busId: bus.id, isBus: !!bus.isBus,
    inrichting: bi.inrichting, reizigers: bi.reizigers,
    playerMeshZichtbaar: fig ? !!fig.visible : null,
    anderen: figurenRond(10).filter((f) => !f.isSpeler),
    camera: { ooghoogte: +(sc.cam.position.y - gh(bus.x, bus.y)).toFixed(2), horizontaalVanBus: +Math.hypot(sc.cam.position.x - bus.x, sc.cam.position.z - bus.y).toFixed(2), kijkhoek: +rondHoek(kijkStand().yaw).toFixed(3), busHoek: +bus.angle.toFixed(3) },
    meshes: interieurMeshes(mesh || {}).map((m) => m.name),
  };
  out.beelden = [];
  hold = null;
  w.camYaw = bus.angle;
  await sleep(800);
  const shotInfo = async (naam, pitch = 0) => {
    zetPitch(pitch);
    await sleep(450);
    const stand = kijkStand();
    const ray = binnenhuidCheck('bus');
    zorgBus();
    const nu = busInfo(bus);
    await capture('fp-bus-' + naam);
    const info = {
      naam: 'fp-bus-' + naam, pitchGraden: +(stand.pitch / DEG).toFixed(1), relYaw: +rondHoek(stand.yaw - bus.angle).toFixed(2),
      inrichtingZichtbaar: !!(nu.inrichting && nu.inrichting.zichtbaar), inrichtingLod: nu.inrichting && nu.inrichting.lod,
      reizigersZichtbaar: !!(nu.reizigers && nu.reizigers.zichtbaar),
      playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null, anderen: figurenRond(10).filter((f) => !f.isSpeler), binnenhuid: ray,
    };
    out.beelden.push(info);
    return info;
  };
  await shotInfo('voor', 0);
  await shotInfo('omlaag', -55 * DEG);
  await shotInfo('achterom', 0);
  await shotInfo('achterom-omlaag', -30 * DEG);
  zetPitch(0);
  // ook echt achterom draaien via de muisweg (lookYaw), en dan nog een beeld omlaag de bus in
  out.draaien = [];
  out.draaien.push(await draaiInVoertuig(Math.PI, bus.angle, 'achterom'));
  await shotInfo('gedraaid-achterom', -30 * DEG);
  zetPitch(0);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  bus.speed = 0; bus._qaX = bus.x; bus._qaY = bus.y; bus._qaA = bus.angle;
  keepStill.add(bus);
  await sleep(1200);
  fpSet(false);
  await sleep(1400);
  await capture('fp-bus-uit-volgcam');
  out.beelden.push({ naam: 'fp-bus-uit-volgcam' });
  out.uit = { fp: fpOn(), playerMeshZichtbaar: state.playerMesh ? !!state.playerMesh.visible : null, figuur: figInfo(state.playerMesh), camAfstand: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2) };
  return out;
}

// ---- stap: prestatie (draw calls, frametijd, bouwtijd) ------------------------------
const renderTeller = () => {
  const R = sc.renderer;
  if (R.__ifsOrigRender) return R.__ifsTeller;
  const orig = R.render;
  const st = { mode: 'aan', calls: 0, tris: 0, renders: 0 };
  const verberg = () => {
    const uit = [];
    for (const mesh of sc.actors().vehicles.values()) {
      const ud = mesh && mesh.userData;
      if (!ud) continue;
      for (const k of ['cabin', 'busInt', 'busPas']) {
        const m = ud[k];
        if (m && m.visible) { uit.push(m); m.visible = false; }
      }
    }
    return uit;
  };
  const toon = (uit) => { for (const m of uit) m.visible = true; };
  const wrapper = function (...a) {
    let verborgen = null;
    if (st.mode === 'uit' && a[0] === sc.scene) verborgen = verberg();
    const r = orig.apply(this, a);
    if (verborgen) toon(verborgen);
    if (a[0] === sc.scene) { st.calls += R.info.render.calls; st.tris += R.info.render.triangles; st.renders++; }
    return r;
  };
  R.render = wrapper;
  R.__ifsOrigRender = orig;
  R.__ifsTeller = st;
  return st;
};
const tel = renderTeller();
const telReset = () => { tel.calls = 0; tel.tris = 0; tel.renders = 0; };
const telLees = () => ({ calls: +(tel.calls / Math.max(1, tel.renders)).toFixed(2), tris: +(tel.tris / Math.max(1, tel.renders)).toFixed(1), renders: tel.renders });
const interieursZichtbaar = () => {
  let cabin = 0, busInt = 0, busPas = 0, voertuigen = 0, maxPerVoertuig = 0;
  const details = [];
  for (const v of w.vehicles) {
    const mesh = vehicleMesh(v);
    if (!mesh) continue;
    const ud = mesh.userData;
    if (ud.cabin && ud.cabin.visible) cabin++;
    if (ud.busInt && ud.busInt.visible) busInt++;
    if (ud.busPas && ud.busPas.visible) busPas++;
    const n = interieurMeshes(mesh).length;
    if (n > 0) {
      voertuigen++;
      if (n > maxPerVoertuig) maxPerVoertuig = n;
      details.push({ id: v.id, model: v.model.name, d: +cheb(v.x, v.y).toFixed(1), meshes: n });
    }
  }
  return { cabin, busInt, busPas, voertuigen, maxPerVoertuig, details: details.slice(0, 24) };
};
// Welke interieurmeshes worden in dit beeld echt getekend? Dat zijn de meshes waarvan de hele keten
// zichtbaar is én die binnen de frustum van de camera vallen. Alleen die kosten draw calls; de rest
// wordt door de actor-culling overgeslagen. Zo is het verschil met interieurs aan/uit te verklaren.
const interieursInBeeld = () => {
  const frustum = new sc.THREE.Frustum().setFromProjectionMatrix(new sc.THREE.Matrix4().multiplyMatrices(sc.cam.projectionMatrix, sc.cam.matrixWorldInverse));
  const ketenZichtbaar = (m) => {
    let o = m;
    while (o && o !== sc.scene) { if (!o.visible) return false; o = o.parent; }
    return true;
  };
  const lijst = [];
  let calls = 0, trisTotaal = 0;
  for (const mesh of sc.actors().vehicles.values()) {
    const ud = mesh && mesh.userData;
    if (!ud) continue;
    for (const k of ['cabin', 'busInt', 'busPas']) {
      const m = ud[k];
      if (!m || !m.visible || !ketenZichtbaar(m)) continue;
      if (!frustum.intersectsObject(m)) continue;
      const t = tri(m.geometry);
      calls++;
      if (t > 0) trisTotaal += t;
      lijst.push({ soort: k, driehoeken: t });
    }
  }
  return { calls, driehoeken: trisTotaal, meshes: lijst };
};
const bouwtijden = () => {
  const uit = {};
  try {
    const model = state.carModel || VH.TRAFFIC_MODELS().find((m) => m.name === 'sedan');
    const v = new VH.Vehicle(0, 0, 0, { ...model });
    const seat = SEAT.vehicleSeat(v, true), romp = MV.carBodyFit(v), klasse = CIL.interiorKlasse(v);
    uit.cabine = {};
    for (const lod of [0, 1, 2]) {
      const geo = [];
      const t0 = performance.now();
      for (let i = 0; i < 3; i++) geo.push(C3.buildCabinGeometry(seat, v.model.len, v.model.wid, klasse, romp, lod));
      const ms = (performance.now() - t0) / 3;
      uit.cabine[lod] = { ms: +ms.toFixed(3), driehoeken: tri(geo[geo.length - 1]) };
      for (const g of geo) if (g && g.dispose) g.dispose();
    }
  } catch (e) { uit.cabineFout = String((e && e.message) || e).slice(0, 200); }
  try {
    const model = VH.TRAFFIC_MODELS().find((m) => m.name === 'bus');
    const L = BUI.busInterieur(model.len, model.wid, { trailer: model.trailer || 0 });
    uit.busInrichting = {};
    for (const lod of [0, 1, 2]) {
      const geo = [];
      const t0 = performance.now();
      for (let i = 0; i < 3; i++) geo.push(BI.buildInrichting(L, lod));
      const ms = (performance.now() - t0) / 3;
      uit.busInrichting[lod] = { ms: +ms.toFixed(3), driehoeken: tri(geo[geo.length - 1]) };
      for (const g of geo) if (g && g.dispose) g.dispose();
    }
    const rg = [];
    const t0 = performance.now();
    for (let i = 0; i < 3; i++) rg.push(BI.buildReizigers(L, 20, []));
    uit.busReizigers = { ms: +((performance.now() - t0) / 3).toFixed(3), driehoeken: tri(rg[rg.length - 1]) };
    for (const g of rg) if (g && g.dispose) g.dispose();
  } catch (e) { uit.busFout = String((e && e.message) || e).slice(0, 200); }
  return uit;
};

async function stapPrestatie() {
  const out = {};
  if (fpOn()) fpSet(false);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false;
  const rd = state.road || nearestRoadHeading(GM.x, GM.y, 250);
  if (rd && !state.warmed) { await go(rd.x, rd.y, rd.a, SETTLE); state.warmed = true; }
  await go(GM.x, GM.y, 0, SETTLE);
  hold = { x: GM.x, y: GM.y, a: 0 };
  w.camYaw = 0;
  // een drukke straat: een rij auto's en een bus binnen de LOD-stralen, allemaal stil
  const model = state.carModel || VH.TRAFFIC_MODELS().find((m) => m.name === 'sedan');
  const busModel = VH.TRAFFIC_MODELS().find((m) => m.name === 'bus');
  const proef = [];
  for (const [dx, dy] of [[8, 2], [12, -4], [22, 6], [35, -8], [48, 10], [62, -6]]) proef.push(spawn(model, GM.x + dx, GM.y + dy, 0.4));
  const proefBus = spawn(busModel, GM.x + 18, GM.y - 6, 1.0);
  state.perfVoertuigen = [...proef, proefBus];
  out.opzet = { autos: proef.length, bussen: 1, positie: { x: GM.x, y: GM.y } };
  await waitFor(() => (interieursZichtbaar().cabin + interieursZichtbaar().busInt) >= 4, 6000);
  await sleep(800);
  out.interieurs = interieursZichtbaar();
  out.stralen = { auto: CAR_MAX_R, bus: BUS_MAX_R };
  // draw calls en driehoeken: met interieurs en met de interieurmeshes tijdelijk verborgen
  // hoeveel interieurmeshes er in dit beeld écht getekend worden (frustum + actor-culling)
  out.interieursInBeeld = interieursInBeeld();
  tel.mode = 'aan'; telReset();
  await framesN(60);
  const aan = telLees();
  const inBeeldVoorUit = out.interieursInBeeld;
  tel.mode = 'uit'; telReset();
  await framesN(60);
  const uit = telLees();
  tel.mode = 'aan'; telReset();
  out.render = {
    metInterieurs: aan, zonderInterieurs: uit,
    verschilCalls: +(aan.calls - uit.calls).toFixed(2),
    verschilTris: +(aan.tris - uit.tris).toFixed(1),
    verklaarbaar: {
      getekendInBeeld: inBeeldVoorUit.calls, getekendeDriehoeken: inBeeldVoorUit.driehoeken,
      zichtbaarInWereld: out.interieurs.cabin + out.interieurs.busInt + out.interieurs.busPas,
      maxPerVoertuig: out.interieurs.maxPerVoertuig,
      opmerking: 'het verschil hoort gelijk te zijn aan de interieurmeshes die in dit beeld vallen; de rest wordt door de actor-culling overgeslagen',
    },
    verschilKlopt: Math.abs((aan.calls - uit.calls) - inBeeldVoorUit.calls) <= 1.5,
    verschilTrisKlopt: Math.abs((aan.tris - uit.tris) - inBeeldVoorUit.driehoeken) <= 60,
  };
  // frametijd: derde persoon tegenover eerste persoon, te voet en in een auto
  out.frametijd = {};
  hold = { x: GM.x, y: GM.y, a: 0 };
  await sleep(600);
  out.frametijd.voetDerde = await frametijden(120);
  if (FP && typeof FP.setFirstPerson === 'function') {
    fpSet(true); await sleep(1200);
    out.frametijd.voetEerste = await frametijden(120);
    out.frametijd.voetFpStand = fpOn();
    fpSet(false); await sleep(1000);
    const auto = proef[0];
    teleport(auto.x, auto.y);
    w.camYaw = auto.angle;
    p.enterVehicle(auto, w);
    keepStill.delete(auto);
    driving = false; hold = null;
    auto.speed = 0;
    await sleep(1800);
    out.frametijd.autoDerde = await frametijden(120);
    fpSet(true); await sleep(1200);
    out.frametijd.autoEerste = await frametijden(120);
    out.frametijd.autoFpStand = fpOn();
    fpSet(false); await sleep(800);
    if (p.inVehicle) p.exitVehicle(map, w);
    driving = false; hold = null;
    auto.speed = 0; auto._qaX = auto.x; auto._qaY = auto.y; auto._qaA = auto.angle;
    keepStill.add(auto);
    await sleep(1000);
  } else {
    out.frametijd.overgeslagen = 'firstperson.js ontbreekt in deze build';
  }
  out.frametijdOordeel = (() => {
    const f = out.frametijd;
    if (!f.voetEerste || !f.autoEerste) return null;
    // Let op: dit zijn twee verschillende beelden (derde persoon kijkt naar de speler, eerste persoon
    // de straat in) en deze headless machine is niet representatief voor een spelers-pc. De cijfers
    // zijn een indicatie, geen harde prestatievergelijking; de draw-callmeting hierboven is dat wel.
    return {
      indicatief: true,
      voetVerschilMediaan: +(f.voetEerste.mediaan - f.voetDerde.mediaan).toFixed(2),
      autoVerschilMediaan: +(f.autoEerste.mediaan - f.autoDerde.mediaan).toFixed(2),
      eerstePersoonNietTrager: f.voetEerste.mediaan <= f.voetDerde.mediaan + 1.0 && f.autoEerste.mediaan <= f.autoDerde.mediaan + 1.0,
    };
  })();
  out.bouwtijd = bouwtijden();
  // opruimen
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  for (const v of state.perfVoertuigen) releaseVehicle(v);
  state.perfVoertuigen = [];
  return out;
}

// ---- uitvoeren ---------------------------------------------------------------------
const resultaat = {
  build: {
    eerstePersoon: FP ? Object.keys(FP) : null,
    cabinLod: C3 ? { CABIN_LOD_R: C3.CABIN_LOD_R || null, CABIN_R: C3.CABIN_R ?? null, cabinLodAt: typeof C3.cabinLodAt === 'function' } : null,
    busLod: BI ? { BUS_LOD_R: BI.BUS_LOD_R || null, INT_R: BI.INT_R ?? null, busLodAt: typeof BI.busLodAt === 'function' } : null,
  },
  instellingen: (() => { try { const st = ST.getSettings(); return { quality: st.quality, drawDistance: st.drawDistance, shadows: st.shadows, autoResolution: st.autoResolution, firstPersoon: st.firstPersoon }; } catch (e) { return { fout: e.message }; } })(),
  stappen: {},
};
const draai = async (id, fn) => {
  const i0 = issues.length;
  const t0 = performance.now();
  try {
    const r = await fn();
    resultaat.stappen[id] = { duurS: +((performance.now() - t0) / 1000).toFixed(1), ...r, meldingen: issues.slice(i0).map((x) => x.m) };
  } catch (e) {
    resultaat.stappen[id] = { fout: String((e && e.stack) || e).slice(0, 500), meldingen: issues.slice(i0).map((x) => x.m) };
  }
  console.log('[ifs-check] ' + id + ' ' + JSON.stringify(resultaat.stappen[id]).slice(0, 1500));
};

await leaveStart();
if (stapAan('auto')) await draai('auto', stapAuto);
if (stapAan('bus')) await draai('bus', stapBus);
if (stapAan('voet')) await draai('voet', stapVoet);
if (stapAan('autointerieur')) await draai('autointerieur', stapAutoInterieur);
if (stapAan('businterieur')) await draai('businterieur', stapBusInterieur);
if (stapAan('prestatie')) await draai('prestatie', stapPrestatie);

// opruimen: eerste persoon uit, geen testvoertuigen in de wereld, teller terug
try { if (fpOn()) fpSet(false); } catch (e) { note('fp uit: ' + e.message); }
if (p.inVehicle) p.exitVehicle(map, w);
done = true; hold = null; driving = false;
clearInterval(skipper); clearInterval(keepInterval);
if (sc.renderer.__ifsOrigRender) { sc.renderer.render = sc.renderer.__ifsOrigRender; delete sc.renderer.__ifsOrigRender; delete sc.renderer.__ifsTeller; }
console.error = origErr; console.warn = origWarn;
resultaat.meldingen = issues;
return JSON.stringify({ stappen: resultaat.stappen, build: resultaat.build, instellingen: resultaat.instellingen, meldingen: issues });
