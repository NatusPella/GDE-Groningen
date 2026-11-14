// Pagina-helft van scripts/qa/interieuren_847_shots.mjs (#847): de resterende voertuiginterieurs in
// het echte spel, in één headless Electron. Per categorie: een vrije camerastand rond het GESPAWNDE
// voertuig (met projectie- en camera-duw-controle), de eerste-persoonkant waar die bestaat, de
// LOD-trap en gedeelde geometrie, en de vrachtruimte bij open/dichte/losse deur.
// window.__i847 = { only, settle } staat ervoor. Elk beeld gaat via console.log('[capture] <naam>')
// naar desktop/devtools.js (PNG naast shots.png); metingen en consolefouten komen in
// [i847-check]/[i847-result]-regels. Niets schrijft naar echte opslag (wegwerpprofiel).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const D = window.__debug;
const w = D.world;
const p = w.player;
const map = w.map;
const sc = window.__scene3d;
const CFG = window.__i847 || {};
const ONLY = (CFG.only || '').split(',').filter(Boolean);
const SETTLE = CFG.settle || 7000;
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
const BUI = await imp('businterieur').catch(() => null);
const FP = await imp('firstperson').catch(() => null);
const SEAT = await imp('seating3d').catch(() => null);
const MV = await imp('models3d_vehicles').catch(() => null);
const CIL = await imp('carinteriorlayout').catch(() => null);
const DZ = await imp('vehicledoors').catch(() => null);
const WL = await imp('waterlevels').catch(() => null);
const BT = await imp('boattypes').catch(() => null);
const HF = await imp('heliflight').catch(() => null);
const PF = await imp('planeflight').catch(() => null);
const PC = await imp('planecontrol').catch(() => null);
const AC = await imp('arcadeplane').catch(() => null);
const TF = await imp('trafficfleet').catch(() => null);
const RW = await imp('railway').catch(() => null);
const R3 = await imp('railway3d').catch(() => null);
const AH = await imp('activityhub').catch(() => null);
const WP = await imp('worldplaces').catch(() => null);
const PG = await imp('pedgeom').catch(() => null);
// nieuwe #847-modules (ontbreken nog zolang de units niet klaar zijn: dat melden we als "ontbreekt")
const CL = await imp('cockpitlayout').catch(() => null);
const CI2 = await imp('carinterior').catch(() => null);
const AI2 = await imp('autointerieur').catch(() => null);
const BO = await imp('bootinterieur').catch(() => null);
const BO3 = await imp('bootinterieur3d').catch(() => null);
const VR = await imp('vrachtruimte').catch(() => null);
const VR3 = await imp('vrachtruimte3d').catch(() => null);
const TI = await imp('treininterieur').catch(() => null);

// ---- vaste omstandigheden -----------------------------------------------------------
try {
  const pr = GP.GFX_PRESETS && GP.GFX_PRESETS.hoog;
  if (pr) for (const [k, v] of Object.entries(pr)) ST.setSetting(k, v);
  ST.setSetting('autoResolution', false);
} catch (e) { note('gfx-instellingen: ' + (e && e.message)); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

// ---- helpers (dezelfde opzet als #833: interieur_firstpersoon_shots.page.js) ----------
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
const CAPTURED = []; // elk beeld dat we echt hebben aangevraagd, ook als een stap daarna faalt
const capture = async (name, wait = 550) => { await sleep(wait); fixWorld(); CAPTURED.push(name); console.log('[capture] ' + name); await sleep(450); };
const tri = (g) => {
  if (!g) return 0;
  if (g.index && Number.isFinite(g.index.count)) return Math.round(g.index.count / 3);
  const at = g.attributes && g.attributes.position;
  return at ? Math.round(at.count / 3) : 0;
};
const vector = new sc.THREE.Vector3();
const kijkStand = () => {
  sc.cam.getWorldDirection(vector);
  return { yaw: Math.atan2(vector.z, vector.x), pitch: Math.asin(Math.max(-1, Math.min(1, vector.y))) };
};
const rondHoek = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const waitFor = async (fn, ms = 4000) => {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(80); }
  return null;
};
const framesN = (n) => new Promise((res) => { let i = 0; const f = () => { if (++i >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
const frametijden = async (n = 90) => {
  const t = [];
  let last = performance.now();
  await new Promise((res) => { let i = 0; const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++i < n) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const a = t.slice(3).sort((x, y) => x - y);
  const med = a[Math.floor(a.length / 2)], p95 = a[Math.min(a.length - 1, Math.floor(a.length * 0.95))];
  return { mediaan: +med.toFixed(2), p95: +p95.toFixed(2), gemiddeld: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), frames: a.length };
};

// ---- eerste persoon -----------------------------------------------------------------
const fpOn = () => {
  try { if (FP && typeof FP.firstPersonOn === 'function') return !!FP.firstPersonOn(w); } catch (e) { note('firstPersonOn: ' + e.message); }
  const st = w.firstPersoon;
  return !!(st && typeof st === 'object' && st.on);
};
const fpSet = (aan) => {
  if (!FP) throw new Error('firstperson.js ontbreekt in deze build');
  if (typeof FP.initFirstPerson === 'function') { try { FP.initFirstPerson(w); } catch (e) { /* al gedaan */ } }
  if (typeof FP.setFirstPerson === 'function') { FP.setFirstPerson(w, !!aan); return 'setFirstPerson'; }
  if (typeof FP.toggleFirstPerson === 'function') { if (fpOn() !== !!aan) FP.toggleFirstPerson(w); return 'toggleFirstPerson'; }
  throw new Error('firstperson.js heeft geen setFirstPerson/toggleFirstPerson');
};
const zetPitch = (rad) => {
  if (typeof FP.initFirstPerson === 'function') FP.initFirstPerson(w);
  const st = w.firstPersoon;
  if (!st) return false;
  st.pitch = Math.max(-85 * DEG, Math.min(85 * DEG, rad));
  return true;
};
// een straal vanuit de camera tegen het eigen voertuig: vangt een gat in de binnenhuid op
const rayAfstand = (v, richting, ver = 15) => {
  const R = new sc.THREE.Raycaster();
  R.near = 0.05; R.far = ver;
  R.set(sc.cam.position.clone(), richting.clone().normalize());
  const obj = vehicleMesh(v);
  if (!obj) return null;
  const hits = R.intersectObject(obj, true);
  return hits.length ? +hits[0].distance.toFixed(2) : null;
};
// vloer (recht omlaag), hemel (recht omhoog), zijkant onder de raamlijn en achterwand onder de raamlijn:
// een treffer betekent een dicht paneel tussen oog en buitenwereld; door de ramen hoort niets geraakt
// te worden. Dat beoordelen we op de beelden.
const binnenhuidCheck = (v, schuinGraden = 30) => {
  const yaw = kijkStand().yaw;
  const schuin = schuinGraden * DEG;
  const cs = Math.cos(schuin), sn = Math.sin(schuin);
  const links = new sc.THREE.Vector3(-Math.sin(yaw) * cs, -sn, Math.cos(yaw) * cs);
  const rechts = new sc.THREE.Vector3(Math.sin(yaw) * cs, -sn, -Math.cos(yaw) * cs);
  const achter = new sc.THREE.Vector3(-Math.cos(yaw) * cs, -sn, -Math.sin(yaw) * cs);
  const uit = {
    vloer: rayAfstand(v, new sc.THREE.Vector3(0, -1, 0), 5),
    hemel: rayAfstand(v, new sc.THREE.Vector3(0, 1, 0), 5),
    deurLinks: rayAfstand(v, links, 5),
    deurRechts: rayAfstand(v, rechts, 5),
    achterwandOnderRaam: rayAfstand(v, achter, 12),
  };
  uit.geenTreffer = Object.entries(uit).filter(([, x]) => x === null).map(([k]) => k);
  return uit;
};

// ---- vrije camerastand (filmcamera) -------------------------------------------------
let ownShot = false;
const poseShot = async (name, pose, wait = 1400, opts = {}) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'i847-view', duration: 600, priority: 9, letterbox: false, skippable: false, hidePlayers: !!opts.hide, shot: () => pose });
  await sleep(wait);
  fixWorld();
  const werkelijk = { x: +sc.cam.position.x.toFixed(2), y: +sc.cam.position.z.toFixed(2), h: +sc.cam.position.y.toFixed(2) };
  const info = {
    naam: name,
    bedoeld: { x: +pose.position.x.toFixed(2), y: +pose.position.y.toFixed(2), h: +pose.position.z.toFixed(2) },
    werkelijk,
    verschilM: +Math.hypot(werkelijk.x - pose.position.x, werkelijk.y - pose.position.y).toFixed(2),
    verschilH: +(werkelijk.h - pose.position.z).toFixed(2),
  };
  if (opts.target) {
    const t = opts.target;
    const p3 = new sc.THREE.Vector3(t.x, t.h, t.y).project(sc.cam);
    const dx = t.x - sc.cam.position.x, dy = t.h - sc.cam.position.y, dz = t.y - sc.cam.position.z;
    const afstand = Math.hypot(dx, dy, dz);
    const richting = kijkStand();
    const dot = (dx * Math.cos(richting.yaw) * Math.cos(richting.pitch) + dy * Math.sin(richting.pitch) + dz * Math.sin(richting.yaw) * Math.cos(richting.pitch)) / (afstand || 1);
    info.doel = { afstand: +afstand.toFixed(2), projectie: { x: +p3.x.toFixed(2), y: +p3.y.toFixed(2), inBeeld: Math.abs(p3.x) <= 0.95 && Math.abs(p3.y) <= 0.95 && p3.z < 1 }, kijkDot: +dot.toFixed(2) };
  }
  if (opts.check && !opts.check(info)) {
    cine.skipCinematic();
    await sleep(350);
    ownShot = false;
    return { ...info, overgeslagen: true };
  }
  CAPTURED.push(name);
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  await sleep(350);
  ownShot = false;
  return info;
};
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);

// ---- voertuigen ---------------------------------------------------------------------
const keepStill = new Set();
const spawn = (model, x, y, a, opts = {}) => {
  const v = new VH.Vehicle(x, y, a, { ...model });
  if (opts.isBus) v.isBus = true;
  if (opts.isBoat) v.isBoat = true;
  if (opts.isHeli) v.isHeli = true;
  if (opts.isPlane) v.isPlane = true;
  if (opts.wrecked) v.wrecked = true;
  if (opts.isAmbulance) v.isAmbulance = true;
  if (opts.isPolice) v.isPolice = true;
  if (opts.isCashVan) v.isCashVan = true;
  if (opts.onGround !== undefined) v.onGround = opts.onGround;
  if (opts.z !== undefined) v.z = opts.z;
  if (opts.isBus) v.busRun = { qa: true };
  v.speed = 0; v.driver = null;
  v._qaX = x; v._qaY = y; v._qaA = a;
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
const vehicleMesh = (v) => (sc.actors && sc.actors().vehicles.get ? sc.actors().vehicles.get(v.id) : null);
const meshStand = (v) => {
  const m = vehicleMesh(v);
  if (!m) return { bestaat: false };
  let zichtbaar = true, o = m;
  while (o && o !== sc.scene) { if (!o.visible) zichtbaar = false; o = o.parent; }
  return { bestaat: true, eigenZichtbaar: !!m.visible, ketenZichtbaar: zichtbaar, positie: [+m.position.x.toFixed(1), +m.position.y.toFixed(1), +m.position.z.toFixed(1)], y: +m.position.y.toFixed(2) };
};
const cheb = (x, y) => Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
const chebVan = (v) => Math.max(Math.abs(v.x - p.x), Math.abs(v.y - p.y));

// ---- interieur-detectie: generiek, zonder de nieuwe modules te kennen -----------------
// Een interieur is (a) een mesh/groep met een interieur-achtige naam, (b) een object waarnaar een
// userData-veld van het voertuig of zijn model wijst (cabin, busInt, bootInt, vrachtInt, ...), of
// (c) een mesh met renderOrder 11 (de bestaande interieurs van #833). Zo werkt het harnas ook
// voordat de vier units klaar zijn, en pakt het de nieuwe meshes automatisch.
const INTERIEUR_NAAM = /cabine|interieur|interior|busint|busreiz|vracht|laadruimte|ladingsruimte|koffer|bagage|bootint|roef|stuurhut|trein|wrak|cockpit|dashboard|stuur|stoel/i;
const ketenZichtbaar = (o, stopAt) => {
  let x = o;
  while (x) {
    if (!x.visible) return false;
    if (x === stopAt) return true;
    x = x.parent;
  }
  return true;
};
const triVan = (o) => {
  if (!o) return 0;
  if (o.isMesh) return tri(o.geometry);
  let s = 0;
  o.traverse((c) => { if (c.isMesh) s += tri(c.geometry); });
  return s;
};
const kandidaatMeshes = (root) => {
  if (!root) return [];
  const uit = new Map();
  // Een inzittende (driverFigure/passengerFigure) hangt als volledig persoonmodel onder de auto:
  // dat is geen interieur. Zulke bomen slaan we bij de detectie over, net als de auto-body zelf.
  const GEEN_OBJECT = new Set(['body', 'shadow', 'shadowCasters', 'head', 'helmet', 'prop', 'rotor', 'tail', 'disc', 'lamps', 'wheels', 'busSections', 'busFront', 'busRear', 'driverFigure', 'passengerFigure', 'riderFig', 'isPerson']);
  const figuurWortels = new Set();
  const verzamelFiguren = (o, diep) => {
    if (!o || diep > 10) return;
    const ud = o.userData || {};
    for (const k of Object.keys(ud)) {
      const val = ud[k];
      if (val && val.isObject3D && /figure|rider/i.test(k)) figuurWortels.add(val);
    }
    for (const c of o.children || []) verzamelFiguren(c, diep + 1);
  };
  verzamelFiguren(root, 0);
  const add = (obj, bron) => {
    if (!obj || !obj.isObject3D) return;
    const id = obj.uuid || obj.id;
    const eerder = uit.get(id);
    if (eerder) { if (!eerder.bron.includes(bron)) eerder.bron += '+' + bron; return; }
    uit.set(id, {
      obj, bron, naam: String(obj.name || '') || (obj.isGroup ? '(groep)' : obj.type),
      tri: triVan(obj), geoId: obj.isMesh && obj.geometry ? obj.geometry.id : null,
      renderOrder: obj.renderOrder || 0, zichtbaar: ketenZichtbaar(obj, root),
    });
  };
  const walk = (o, diep) => {
    if (!o || diep > 14 || figuurWortels.has(o)) return;
    const ud = o.userData || {};
    if (o !== root && !o.isBone && !o.isSkinnedMesh && INTERIEUR_NAAM.test(String(o.name || ''))) add(o, 'naam');
    if (o !== root && o.isMesh && o.renderOrder === 11) add(o, 'renderOrder11');
    for (const k of Object.keys(ud)) {
      if (GEEN_OBJECT.has(k)) continue;
      const val = ud[k];
      if (val && val.isObject3D && !figuurWortels.has(val)) add(val, 'ud.' + k);
    }
    for (const c of o.children || []) walk(c, diep + 1);
  };
  walk(root, 0);
  return [...uit.values()];
};
const userDataObjecten = (root) => {
  const uit = [];
  const walk = (o, diep) => {
    if (!o || diep > 6) return;
    const ud = o.userData || {};
    for (const k of Object.keys(ud)) {
      const val = ud[k];
      if (val && val.isObject3D) uit.push({ eigenaar: String(o.name || o.type), key: k, naam: String(val.name || val.type), type: val.type, zichtbaar: !!val.visible });
    }
    for (const c of o.children || []) walk(c, diep + 1);
  };
  walk(root, 0);
  return uit.slice(0, 40);
};
const somZichtbaar = (lijst) => lijst.filter((q) => q.zichtbaar);
const interieurStand = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const k = kandidaatMeshes(mesh);
  const z = somZichtbaar(k);
  return {
    mesh: true,
    kandidaten: k.map((q) => ({ naam: q.naam, bron: q.bron, tri: q.tri, geoId: q.geoId, renderOrder: q.renderOrder, zichtbaar: q.zichtbaar })),
    aantal: k.length,
    zichtbaarAantal: z.length,
    zichtbareDriehoeken: z.reduce((s, q) => s + q.tri, 0),
    namen: [...new Set(k.map((q) => q.naam))].slice(0, 30),
    userData: userDataObjecten(mesh),
  };
};
// lokale doos van een object in de coördinaten van het voertuig (x vooruit, y omhoog, z opzij)
const lokaleBox = (root, object) => {
  try {
    root.updateWorldMatrix(true, true);
    const inv = new sc.THREE.Matrix4().copy(root.matrixWorld).invert();
    const box = new sc.THREE.Box3();
    let any = false;
    object.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const gb = o.geometry.boundingBox.clone();
      gb.applyMatrix4(new sc.THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(gb);
      any = true;
    });
    if (!any) return null;
    const r = (x) => +x.toFixed(2);
    return { min: { x: r(box.min.x), y: r(box.min.y), z: r(box.min.z) }, max: { x: r(box.max.x), y: r(box.max.y), z: r(box.max.z) }, size: { x: r(box.max.x - box.min.x), y: r(box.max.y - box.min.y), z: r(box.max.z - box.min.z) } };
  } catch (e) { note('lokaleBox: ' + (e && e.message)); return null; }
};
const interieurBox = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return null;
  const k = somZichtbaar(kandidaatMeshes(mesh));
  if (!k.length) return null;
  const box = new sc.THREE.Box3();
  let any = false;
  mesh.updateWorldMatrix(true, true);
  const inv = new sc.THREE.Matrix4().copy(mesh.matrixWorld).invert();
  for (const q of k) {
    q.obj.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const gb = o.geometry.boundingBox.clone();
      gb.applyMatrix4(new sc.THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(gb); any = true;
    });
  }
  if (!any) return null;
  const r = (x) => +x.toFixed(2);
  return { min: { x: r(box.min.x), y: r(box.min.y), z: r(box.min.z) }, max: { x: r(box.max.x), y: r(box.max.y), z: r(box.max.z) }, size: { x: r(box.max.x - box.min.x), y: r(box.max.y - box.min.y), z: r(box.max.z - box.min.z) } };
};

// ---- LOD-hulpjes --------------------------------------------------------------------
const lodRadii = (mod, filter = /lod|afstand|radius|_R$|^R$/i) => {
  if (!mod) return null;
  const kandidaten = [];
  for (const [k, val] of Object.entries(mod)) {
    if (!Array.isArray(val) || val.length < 2 || val.length > 4) continue;
    if (!val.every((x) => Number.isFinite(x) && x > 0)) continue;
    if (!val.every((x, i, a) => i === 0 || x > a[i - 1])) continue;
    kandidaten.push({ naam: k, waarden: val.slice() });
  }
  const passend = kandidaten.find((k) => filter.test(k.naam));
  return passend || kandidaten[0] || null;
};
const lodFn = (mod) => {
  if (!mod) return null;
  for (const [k, val] of Object.entries(mod)) if (typeof val === 'function' && /lodat|lod$/i.test(k)) return { naam: k, fn: val };
  return null;
};
const drempelInfo = (mod) => {
  const radii = lodRadii(mod), fn = lodFn(mod);
  return radii || fn ? { radii, fn: fn ? fn.naam : null } : null;
};
// Meetpunten voor de LOD-trap: gebruik de echte niveaufunctie (cabinLodAt, bootLodAt, ...) als die
// bestaat, zodat een maatfactor (grote schepen) of andere drempels niet wordt genegeerd. We zoeken
// per niveau een punt midden in dat niveau en één punt voorbij het verste niveau.
const lodMeetpunten = (mod, { drempels, lengte = null } = {}) => {
  const radii = ((lodRadii(mod) || {}).waarden) || drempels || [20, 50, 80];
  const fnNaam = Object.keys(mod || {}).find((k) => typeof mod[k] === 'function' && /lodat$/i.test(k));
  const fn = fnNaam ? mod[fnNaam] : null;
  const noem = (d) => Math.max(2, Math.round(d));
  const grens = radii[radii.length - 1] * (lengte && lengte > 30 ? Math.max(1, lengte / 30) : 1) * 3 + 40;
  if (!fn) {
    const uit = [noem(radii[0] * 0.4), noem((radii[0] + radii[1]) / 2), noem((radii[1] + radii[2]) / 2), noem(grens)];
    return [...new Set(uit)];
  }
  const punten = [];
  let vorig = null;
  for (let d = 4; d <= grens; d += 2) {
    let l = null;
    try { l = lengte !== null ? fn(d, lengte) : fn(d); } catch (e) { try { l = fn(d); } catch (e2) { l = null; } }
    if (l !== vorig) { punten.push({ d, l }); vorig = l; }
  }
  const uit = [];
  for (const niveau of [0, 1, 2]) {
    const eigen = punten.filter((q) => q.l === niveau);
    if (eigen.length >= 2) uit.push(noem((eigen[0].d + eigen[eigen.length - 1].d) / 2));
    else if (eigen.length === 1) uit.push(noem(eigen[0].d + 2));
  }
  const voorbij = punten.find((q) => q.l === -1 || q.l === null);
  uit.push(noem(voorbij ? voorbij.d + 10 : grens));
  return [...new Set(uit.filter((d) => d > 1))];
};

// ---- vrij punt en vrije camerastand -------------------------------------------------
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
const vierkantPunt = (cx, cy, d, theta) => {
  const ux = Math.cos(theta), uy = Math.sin(theta);
  const k = d / Math.max(Math.abs(ux), Math.abs(uy));
  return { x: cx + ux * k, y: cy + uy * k };
};
const kiesAnker = async (v, d, voorkeurHoeken) => {
  for (const off of kandidaatHoeken(voorkeurHoeken)) {
    const hoek = v.angle + off;
    const q = vierkantPunt(v.x, v.y, d, hoek);
    if (!vrijPunt(q.x, q.y)) continue;
    setAnchor(q.x, q.y, hoek);
    await sleep(240);
    return { x: p.x, y: p.y, hoek, cheb: chebVan(v), vrij: true };
  }
  const q = vierkantPunt(v.x, v.y, d, v.angle);
  setAnchor(q.x, q.y, v.angle);
  await sleep(400);
  return { x: p.x, y: p.y, hoek: v.angle, cheb: chebVan(v), vrij: false };
};
// Een beeld van buiten vanaf een vrije, open stand. basisY is het referentievlak (grond of
// wateroppervlak); camH en lookAtH staan daar bovenop. De filmcamera duwt zich van gebouwen weg:
// een stand die is weggeduwd wordt overgeslagen en een andere hoek geprobeerd.
const schietVrij = async (naam, v, afstanden, voorkeurHoeken, lookAtH, opts = {}) => {
  const fov = opts.fov || 74;
  const basis = opts.basisY !== undefined && opts.basisY !== null ? opts.basisY : gh(v.x, v.y);
  const camH = opts.camH !== undefined ? opts.camH : 1.3;
  const maxDuwh = opts.maxDuwh !== undefined ? opts.maxDuwh : 0.6;
  const probeersels = [];
  const probeer = async (d, off, force) => {
    const hoek = v.angle + off;
    const q = vierkantPunt(v.x, v.y, d, hoek);
    if (!force) {
      if (!vrijPunt(q.x, q.y)) return { reden: 'punt in gebouw' };
      if (!vrijZicht(q.x, q.y, v.x, v.y)) return { reden: 'geen vrij zicht' };
    }
    const pose = {
      position: { x: q.x, y: q.y, z: basis + camH },
      lookAt: { x: v.x, y: v.y, z: basis + lookAtH }, fov, cut: true,
    };
    const info = await poseShot(naam, pose, opts.wait || 950, {
      hide: true,
      target: { x: v.x, y: v.y, h: basis + lookAtH },
      check: (i) => i.verschilH < maxDuwh && !!(i.doel && i.doel.projectie.inBeeld),
    });
    if (info.overgeslagen) return { reden: 'camera weggeduwd', hoogte: info.verschilH, info };
    const cheb = Math.max(Math.abs(q.x - v.x), Math.abs(q.y - v.y));
    info.hoek = +rondHoek(hoek - v.angle).toFixed(2);
    info.cheb = +cheb.toFixed(1);
    info.afstandGezocht = d;
    info.basisY = +basis.toFixed(2);
    info.camH = camH;
    return { info };
  };
  for (const d of afstanden) {
    for (const off of kandidaatHoeken(voorkeurHoeken)) {
      const r = await probeer(d, off, false);
      if (r.info) { r.info.geprobeerd = probeersels; return r.info; }
      probeersels.push({ d, hoek: +rondHoek(off).toFixed(2), reden: r.reden, hoogte: r.hoogte });
    }
  }
  // laatste redmiddel: een stand die niet vrij is toch vastleggen, zodat het beeld bestaat en het
  // probleem zichtbaar is
  for (const d of afstanden) {
    for (const off of kandidaatHoeken(voorkeurHoeken)) {
      const r = await probeer(d, off, true);
      if (r.info) { r.info.geprobeerd = probeersels; r.info.geforceerd = true; return r.info; }
      break;
    }
  }
  return { naam, overgeslagen: true, probeersels };
};

// ---- eerste persoon in een voertuig ------------------------------------------------
const personRoots = () => (sc.scene.children || []).filter((c) => c && c.userData && c.userData.body && c.userData.head);
const findPlayerFig = () => {
  let best = null, bd = 1e9;
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  for (const c of personRoots()) {
    const d = Math.hypot(c.position.x - px, c.position.z - py);
    if (d < bd) { bd = d; best = c; }
  }
  return best && bd < 6 ? best : null;
};
const draaiVoertuig = async (v, dYaw) => {
  v.angle = rondHoek(v.angle + dYaw);
  v._qaA = v.angle;
  w.camYaw = v.angle;
  await sleep(420);
};
const fpStap = async (v, prefix, opts = {}) => {
  const out = { beelden: [], notities: [] };
  if (!FP) { out.ontbreekt = 'firstperson.js ontbreekt in deze build'; return out; }
  if (fpOn()) fpSet(false);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  teleport(v.x, v.y);
  await sleep(350); // eerst een frame: dan staat het spelersfiguur op de nieuwe plek
  const figVoor = findPlayerFig();
  w.camYaw = v.angle;
  p.enterVehicle(v, w);
  if (!p.inVehicle) { v.driver = 'player'; p.inVehicle = v; out.instapTerugval = true; }
  await sleep(opts.wacht || 2200);
  if (!fpOn()) fpSet(true);
  await sleep(1800);
  const basisOptie = opts.basisY;
  const basis = () => (basisOptie !== undefined && basisOptie !== null ? basisOptie() : gh(v.x, v.y));
  const stand = kijkStand();
  const binnen = interieurStand(v);
  out.binnen = {
    fp: fpOn(), inVoertuig: !!p.inVehicle, voertuigId: v.id,
    interieurZichtbaar: binnen.zichtbaarAantal, interieurDriehoeken: binnen.zichtbareDriehoeken,
    interieurNamen: binnen.namen,
    playerMeshGevonden: !!figVoor,
    playerMeshZichtbaar: figVoor ? !!figVoor.visible : null,
    camera: {
      ooghoogte: +(sc.cam.position.y - basis()).toFixed(2),
      horizontaalVanVoertuig: +Math.hypot(sc.cam.position.x - v.x, sc.cam.position.z - v.y).toFixed(2),
      kijkhoek: +rondHoek(stand.yaw).toFixed(3), voertuighoek: +v.angle.toFixed(3),
    },
    box: interieurBox(v),
  };
  out.binnen.stoel = (() => { try { const s = SEAT.vehicleSeat(v, true); return { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), role: s.role }; } catch (e) { return null; } })();
  const shot = async (naam, pitch = 0) => {
    zetPitch(pitch);
    await sleep(420);
    const st = kijkStand();
    const ray = binnenhuidCheck(v, opts.schuin || 30);
    await capture(prefix + '-' + naam);
    const info = {
      naam: prefix + '-' + naam, pitchGraden: +(st.pitch / DEG).toFixed(1), relYaw: +rondHoek(st.yaw - v.angle).toFixed(2),
      ooghoogte: +(sc.cam.position.y - basis()).toFixed(2),
      binnenhuid: ray,
    };
    out.beelden.push(info);
    return info;
  };
  await shot('voor', 0);
  // Diagnose voor de beeldbeoordeling: welke meshes liggen er binnen 1,2 m van de camera (naam,
  // kleur)? Zo benoemen we een onbekend paneel of een verkeerd gekleurde plaat in het beeld.
  out.dichtbijCamera = (() => {
    try {
      const camPos = sc.cam.position.clone();
      const wp = new sc.THREE.Vector3();
      const box = new sc.THREE.Box3();
      const uit = [];
      sc.scene.traverse((o) => {
        if (!o.isMesh || !o.visible || !ketenZichtbaar(o, sc.scene)) return;
        o.getWorldPosition(wp);
        if (wp.distanceTo(camPos) > 6) return;
        box.setFromObject(o);
        const d = box.distanceToPoint(camPos);
        if (d > 1.2) return;
        const mats = (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean);
        uit.push({
          naam: String(o.name || o.type), ouder: o.parent ? String(o.parent.name || o.parent.type) : null,
          afstand: +d.toFixed(2),
          kleuren: mats.map((m) => (m.color ? '#' + m.color.getHexString() : (m.vertexColors ? 'vc' : '?'))),
          tri: o.geometry ? tri(o.geometry) : 0,
        });
      });
      uit.sort((a, b) => a.afstand - b.afstand);
      return uit.slice(0, 30);
    } catch (e) { return [{ fout: String((e && e.message) || e).slice(0, 150) }]; }
  })();
  await shot('dashboard', (opts.dashboardGraden || -28) * DEG);
  await shot('omlaag', (opts.omlaagGraden || -58) * DEG);
  zetPitch(0);
  await draaiVoertuig(v, Math.PI / 2);
  await shot('links', 0);
  await draaiVoertuig(v, -Math.PI);
  await shot('rechts', 0);
  await draaiVoertuig(v, Math.PI / 2);
  await draaiVoertuig(v, Math.PI);
  await shot('achterom', -10 * DEG);
  await draaiVoertuig(v, -Math.PI);
  zetPitch(0);
  if (p.inVehicle) p.exitVehicle(map, w);
  driving = false; hold = null;
  v.speed = 0; v._qaX = v.x; v._qaY = v.y; v._qaA = v.angle;
  keepStill.add(v);
  await sleep(1000);
  fpSet(false);
  await sleep(1200);
  await capture(prefix + '-uit-volgcam');
  out.beelden.push({ naam: prefix + '-uit-volgcam' });
  out.uit = { fp: fpOn(), camAfstand: +Math.hypot(sc.cam.position.x - p.x, sc.cam.position.z - p.y).toFixed(2) };
  return out;
};

// ---- LOD-metingen op afstand --------------------------------------------------------
const leesInterieur = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const k = kandidaatMeshes(mesh);
  const z = somZichtbaar(k);
  return {
    mesh: true, kandidaten: k.length, zichtbaar: z.length,
    driehoeken: z.reduce((s, q) => s + q.tri, 0),
    geoIds: [...new Set(z.map((q) => q.geoId).filter((x) => x !== null))],
    namen: [...new Set(k.map((q) => q.naam))].slice(0, 20),
  };
};
const meetLod = async (v, afstanden, voorkeur = []) => {
  const uit = [];
  for (const d of afstanden) {
    const anker = await kiesAnker(v, d, d <= 6 ? [0, 0.5, -0.5] : [...voorkeur, 0.62, -0.62, 0.4, -0.4]);
    await sleep(420);
    const chebNu = chebVan(v);
    uit.push({ afstand: d, werkelijkAfstand: +chebNu.toFixed(2), ankerVrij: anker.vrij, ...leesInterieur(v) });
  }
  return uit;
};
const lodOordeel = (metingen) => {
  const tri = metingen.map((m) => m.driehoeken || 0);
  return {
    punten: metingen.map((m) => ({ afstand: m.afstand, werkelijkAfstand: m.werkelijkAfstand, zichtbaar: m.zichtbaar, driehoeken: m.driehoeken })),
    striktAfnemend: tri.every((x, i) => i === 0 || x < tri[i - 1]),
    leegVoorbijVerste: metingen.length >= 2 && tri[tri.length - 1] === 0,
    driehoeken: tri,
  };
};
const gedeeldeGeometrie = (model, x, y, opts = {}) => {
  const v1 = spawn(model, x, y, 0.6, opts);
  const v2 = spawn(model, x + 4.5, y + 2.2, 0.6, opts);
  return { v1, v2 };
};

// ---- land- en waterplekken ----------------------------------------------------------
const OFFSETS = [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7], [8, 6], [-8, 6], [8, -6], [-8, -6], [14, 2], [-14, 2], [14, -2], [-14, -2], [0, 14], [0, -14], [20, 0], [-20, 0]];
const landPlek = (straal = 3, extra = []) => {
  for (const [dx, dy] of [...extra, ...OFFSETS]) {
    const x = GM.x + dx, y = GM.y + dy;
    let vrij = vrijPunt(x, y);
    if (vrij) for (const [sx, sy] of [[0, 0], [straal, 0], [-straal, 0], [0, straal], [0, -straal]]) if (puntInPand(x + sx, y + sy)) { vrij = false; break; }
    if (vrij) return { x, y };
  }
  return { x: GM.x, y: GM.y };
};
// De speler staat na het starten op een willekeurig herkenningspunt; een nieuw voertuig krijgt pas
// een mesh binnen DRAW_DIST van de speler. Daarom eerst naar de Grote Markt (het open testterrein).
const warmGM = async (settle = Math.min(SETTLE, 5000)) => { await go(GM.x, GM.y, 0, settle); };
const waterAt = (x, y) => { try { return WL && WL.waterAt ? WL.waterAt(map, x, y) : null; } catch (e) { return null; } };
const waterPast = (x, y, angle, len, wid) => {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const px = -uy, py = ux;
  for (const [a, b] of [[0, 0], [len / 2, 0], [-len / 2, 0], [len / 4, 0], [-len / 4, 0], [0, wid / 2], [0, -wid / 2], [len / 2, wid / 2], [-len / 2, -wid / 2]]) {
    const q = waterAt(x + ux * a + px * b, y + uy * a + py * b);
    if (!q) return false;
  }
  return true;
};
// Een plek op water waar de boot past: eerst het eigen stadswater (kanalen), en voor de zeeschepen
// het zeewater bij Lauwersoog/Eemshaven/Delfzijl. Geeft { x, y, hoek, water } of null.
// Een plek op water waar de boot past: eerst het eigen stadswater (kanalen), en voor de zeeschepen
// het zeewater bij Lauwersoog/Eemshaven/Delfzijl. Eerst teleporteren we de speler naar het anker en
// wachten we tot de tegels gestreamd zijn; dán scannen we snel (zonder per kandidaatpunt te wachten,
// anders duurt één boot uren). Geeft { x, y, hoek, water } of null.
const zoekWaterPlek = async (len, wid, { zee = false, nav = 1, wacht = 6000 } = {}) => {
  const test = (x, y, hoek) => {
    const q = waterAt(x, y);
    if (!q) return null;
    if (zee) { if (q.kind !== 'zee') return null; }
    else if (!(q.navigable >= nav)) return null;
    if (!waterPast(x, y, hoek, len, wid)) return null;
    return { x, y, hoek, water: { kind: q.kind, level: q.level === undefined ? null : +q.level.toFixed(2), navigable: q.navigable === undefined ? null : q.navigable } };
  };
  const anker = async (x, y, ms) => { await go(x, y, 0, ms); hold = { x, y, a: 0 }; await sleep(900); };
  // De scan zoekt op afstand; de speler (die de LOD en de meshbouw bepaalt) moet daarna naar de
  // gevonden plek, anders valt de boot buiten DRAW_DIST en krijgt hij geen mesh.
  const klaar = async (uit) => {
    if (!uit) return null;
    if (Math.hypot(p.x - uit.x, p.y - uit.y) > 60) await anker(uit.x, uit.y, Math.min(wacht, 3500));
    hold = { x: uit.x, y: uit.y, a: 0 };
    return uit;
  };
  const scanRond = (cx, cy, r0, r1, stap) => {
    for (let r = r0; r <= r1; r += stap) {
      for (let a = 0; a < 6.283; a += 0.2) {
        const uit = test(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a);
        if (uit) return uit;
      }
    }
    return null;
  };
  // 1) zee: eerst naar de havenplaats streamen, dan de zee in scannen
  if (zee && WP) {
    for (const naam of ['Lauwersoog', 'Eemshaven', 'Delfzijl']) {
      let plaats = null;
      try { plaats = WP.worldPlaceNamed(naam) || WP.worldPlaceNamed(naam + ' haven'); } catch (e) { plaats = null; }
      if (!plaats) continue;
      await anker(plaats.x, plaats.y, Math.max(wacht, SETTLE));
      const uit = scanRond(plaats.x, plaats.y, 250, 2600, 100);
      if (uit) { uit.vanaf = naam; return await klaar(uit); }
    }
  }
  // 2) het eigen water: eerst de stad streamen, dan de breedste kanalen scannen
  await anker(GM.x, GM.y, Math.min(wacht, SETTLE));
  const polys = (() => { try { return map.waterNear ? map.waterNear(0, 0, 1800) : []; } catch (e) { return []; } })();
  const groot = [];
  for (const q of polys) {
    if (!q || !q.pts) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const v of q.pts) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); }
    groot.push({ q, x0, y0, x1, y1, opp: (x1 - x0) * (y1 - y0) });
  }
  groot.sort((a, b) => b.opp - a.opp);
  const scanVlak = (g, n) => {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = g.x0 + (g.x1 - g.x0) * (i + 0.5) / n, y = g.y0 + (g.y1 - g.y0) * (j + 0.5) / n;
        if (!waterAt(x, y)) continue;
        for (const hoek of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3]) {
          const uit = test(x, y, hoek);
          if (uit) return uit;
        }
      }
    }
    return null;
  };
  for (const g of groot.slice(0, 20)) {
    const uit = scanVlak(g, 12);
    if (uit) return await klaar(uit);
  }
  // 3) groter water buiten de stad: stroom de breedste plas en scan die
  for (const g of groot.slice(0, 6)) {
    const cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2;
    if (!waterAt(cx, cy)) await anker(cx, cy, Math.min(wacht, 4000));
    const uit = scanVlak(g, 10);
    if (uit) return await klaar(uit);
  }
  return null;
};

// ---- kleine hulpjes per categorie ---------------------------------------------------
const cabinInfo = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const cab = mesh.userData.cabin;
  return {
    mesh: true, cabine: !!cab, zichtbaar: !!(cab && cab.visible), lod: mesh.userData.cabinLod ?? null,
    driehoeken: cab ? tri(cab.geometry) : 0, geoId: cab && cab.geometry ? cab.geometry.id : null,
  };
};
const busInfo = (v) => {
  const mesh = vehicleMesh(v);
  if (!mesh) return { mesh: false };
  const ud = mesh.userData;
  const int = ud.busInt;
  const achter = (m) => (m ? { bestaat: true, zichtbaar: !!m.visible, driehoeken: tri(m.geometry), naam: m.name, geoId: m.geometry ? m.geometry.id : null } : { bestaat: false });
  return {
    mesh: true,
    inrichting: { bestaat: !!int, zichtbaar: !!(int && int.visible), lod: ud.busIntLod ?? null, driehoeken: int ? tri(int.geometry) : 0, geoId: int && int.geometry ? int.geometry.id : null, naam: int ? int.name : null },
    reizigers: { bestaat: !!ud.busPas, zichtbaar: !!(ud.busPas && ud.busPas.visible), driehoeken: ud.busPas ? tri(ud.busPas.geometry) : 0, naam: ud.busPas ? ud.busPas.name : null },
    achter: { inrichting: achter(ud.busIntAchter), lod: ud.busIntAchterLod ?? null, reizigers: ud.busPasAchter ? { bestaat: true, zichtbaar: !!ud.busPasAchter.visible, driehoeken: tri(ud.busPasAchter.geometry), naam: ud.busPasAchter.name } : { bestaat: false } },
    wrak: { naam: int ? int.name : null, achterNaam: ud.busIntAchter ? ud.busIntAchter.name : null },
    achterwagen: !!ud.busRear,
  };
};
const modelVan = (naam, fallback) => {
  const m = VH.TRAFFIC_MODELS().find((q) => q.name === naam);
  return m ? { ...m } : fallback;
};
const vrachtStand = (v) => {
  const st = interieurStand(v);
  const k = st.kandidaten || [];
  const vracht = k.filter((q) => /vracht|laadruimte|ladingsruimte|koffer|bagage|vrachtruimte/i.test(q.naam) || /vracht|laadruimte|koffer/i.test(q.bron));
  return {
    zichtbaar: vracht.some((q) => q.zichtbaar), aantal: vracht.length,
    driehoeken: vracht.filter((q) => q.zichtbaar).reduce((s, q) => s + q.tri, 0),
    namen: [...new Set(vracht.map((q) => q.naam))].slice(0, 12),
    alleInterieursZichtbaar: st.zichtbaarAantal, kandidaten: k.length,
  };
};
const vrachtOpening = (v) => {
  // Eerst de regel van de vrachtruimte-unit zelf: die kent ook de virtuele laaddeur van de
  // vrachtwagen, geldbus en oplegger en het vaste luik van de foodtruck; anders de deurdefinities.
  try {
    if (VR && VR.laadopeningen) {
      const o = VR.laadopeningen(v);
      const deuren = (o.deuren || []).slice();
      return { id: deuren[0] || null, deuren, vasteOpening: !!o.vasteOpening, virtueel: !!(VR.VIRTUELE_LAADDEUR && deuren.includes(VR.VIRTUELE_LAADDEUR)) };
    }
  } catch (e) { note('laadopeningen: ' + (e && e.message)); }
  if (!DZ || !DZ.doorsFor) return null;
  let defs = [];
  try { defs = DZ.doorsFor(v) || []; } catch (e) { return null; }
  const d = defs.find((q) => q.soort === 'klep' || q.soort === 'achterdeur' || q.id === 'klep');
  return d ? { id: d.id, deuren: [d.id], vasteOpening: false, virtueel: false } : null;
};
const vrachtRegel = (v) => { try { return VR && VR.vrachtruimteZichtbaar ? !!VR.vrachtruimteZichtbaar(v) : null; } catch (e) { return null; } };
const zetDeur = (v, id, open, los = false) => {
  if (!DZ || !id) return false;
  try {
    const st = DZ.ensureDoors(v);
    if (open) st.open[id] = 1; else delete st.open[id];
    if (los) st.loose[id] = true; else delete st.loose[id];
    return true;
  } catch (e) { note('zetDeur: ' + (e && e.message)); return false; }
};

// ---- cabine-stap (trekker, heli, vliegtuig, machines) ------------------------------
const cabineStap = async (cfg) => {
  const out = { voertuig: cfg.naam, beelden: [], notities: [], ontbrekend: [] };
  await warmGM();
  const plek = landPlek(cfg.straal || 3, cfg.off || []);
  const v = cfg.maak(plek.x, plek.y, cfg.hoek !== undefined ? cfg.hoek : 0.5);
  const mesh = await waitFor(() => vehicleMesh(v), 9000);
  if (!mesh) { out.fout = 'geen mesh gebouwd (voertuig buiten DRAW_DIST?)'; releaseVehicle(v); return out; }
  await sleep(cfg.wacht || 700);
  out.plek = { x: +plek.x.toFixed(1), y: +plek.y.toFixed(1) };
  out.model = { naam: v.model && v.model.name, len: v.model && v.model.len, wid: v.model && v.model.wid };
  out.klasse = (() => { try { return CIL && CIL.interiorKlasse ? CIL.interiorKlasse(v) : null; } catch (e) { return 'fout: ' + (e && e.message); } })();
  out.hasCarInterior = (() => { try { return CIL && CIL.hasCarInterior ? !!CIL.hasCarInterior(v) : null; } catch (e) { return null; } })();
  out.mesh = meshStand(v);
  out.cabine = cabinInfo(v);
  out.interieur = interieurStand(v);
  out.drempels = drempelInfo(cfg.lodModule);
  if (out.interieur.aantal === 0) out.ontbrekend.push('geen interieurmesh gevonden (module/unit nog niet in deze build?)');
  // buitenbeelden
  for (const b of cfg.buiten) {
    const shot = await schietVrij(cfg.prefix + '-' + b.naam, v, b.afstanden, b.hoeken, b.lookH, b.opts || {});
    if (shot && !shot.overgeslagen) out.beelden.push(shot);
    else out.notities.push(cfg.prefix + '-' + b.naam + ': geen vrije camerastand (' + JSON.stringify(((shot && shot.probeersels) || []).slice(0, 4)) + ')');
  }
  // LOD-trap: punten uit de echte niveaufunctie (of de gebruikelijke afstanden), plus één punt
  // voorbij de verste straal
  const meets = lodMeetpunten(cfg.lodModule, { drempels: cfg.lodFallback || [5, 20, 50, 70] });
  out.lodMeetpunten = meets;
  out.lodMetingen = await meetLod(v, meets, cfg.lodVoorkeur || []);
  out.lodTrap = lodOordeel(out.lodMetingen);
  // gedeelde geometrie: twee dezelfde voertuigen horen dezelfde geo-ids te delen
  if (cfg.delen !== false) {
    const v2 = cfg.maak(plek.x + 4.5, plek.y + 2.2, v.angle);
    if (await waitFor(() => vehicleMesh(v2), 8000)) {
      setAnchor(plek.x + 9, plek.y + 4, v2.angle);
      await sleep(500);
      const a = leesInterieur(v), b = leesInterieur(v2);
      out.deling = { v1: a.geoIds, v2: b.geoIds, gelijk: a.geoIds.length > 0 && b.geoIds.length > 0 && a.geoIds.some((g) => b.geoIds.includes(g)), gedeeldAantal: a.geoIds.filter((g) => b.geoIds.includes(g)).length };
      releaseVehicle(v2);
    } else out.deling = { fout: 'tweede voertuig kreeg geen mesh' };
  }
  if (cfg.fp !== false) out.fp = await fpStap(v, cfg.prefix, cfg.fpOpties || {});
  if (cfg.controle) { try { out.controles = cfg.controle(v); } catch (e) { out.controles = { fout: String((e && e.stack) || e).slice(0, 300) }; } }
  releaseVehicle(v);
  return out;
};

// ---- stap: trekker ----------------------------------------------------------------
async function stapTrekker() {
  const tractor = VH.TRACTOR_MODEL || { name: 'tractor', len: 4.3, wid: 2.3, maxSpeed: 11, accel: 6.5, brake: 11, turnRate: 1.9, color: '#3f7d3a' };
  return cabineStap({
    naam: 'trekker', prefix: '847-trekker', straal: 2.6,
    maak: (x, y, a) => spawn(tractor, x, y, a),
    buiten: [
      { naam: 'driekwart', afstanden: [4.4, 3.8, 5.0], hoeken: [0.62, 0.45, 1.0], lookH: 1.9, opts: { camH: 1.75, fov: 72, maxDuwh: 0.8 } },
      { naam: 'zij', afstanden: [3.8, 3.2, 4.4], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: 1.85, opts: { camH: 1.7, fov: 72, maxDuwh: 0.8 } },
    ],
    lodModule: C3, lodFallback: [5, 20, 50, 70], lodVoorkeur: [0, 0.5, -0.5],
    fpOpties: { dashboardGraden: -26, omlaagGraden: -58 },
    controle: (v) => {
      const box = interieurBox(v);
      const cab = cabinInfo(v);
      return {
        cabine: cab, interieurBox: box,
        cabineInCarrosserie: !box || (box.min.x >= -v.model.len && box.max.x <= v.model.len && Math.abs(box.min.z) <= v.model.wid && Math.abs(box.max.z) <= v.model.wid),
      };
    },
  });
}

// ---- stap: helikopter -------------------------------------------------------------
async function stapHeli() {
  const heliModel = (HF && HF.HELI_MODEL) || { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40, accel: 7, brake: 9, turnRate: 1.5, color: '#c23b2e' };
  return cabineStap({
    naam: 'helikopter', prefix: '847-heli', straal: 4.5, hoek: 0.4,
    maak: (x, y, a) => spawn(heliModel, x, y, a, { isHeli: true, onGround: true, z: gh(x, y) }),
    buiten: [
      { naam: 'driekwart', afstanden: [8, 6.5, 10], hoeken: [0.7, 1.05, 0.45], lookH: 1.6, opts: { camH: 1.8, fov: 70, maxDuwh: 0.9 } },
      { naam: 'zij', afstanden: [7, 9, 6], hoeken: [Math.PI / 2, -Math.PI / 2, 1.3], lookH: 1.55, opts: { camH: 1.7, fov: 70, maxDuwh: 0.9 } },
    ],
    lodModule: C3, lodFallback: [5, 20, 50, 70], lodVoorkeur: [0.4, -0.4],
    fpOpties: { dashboardGraden: -24, omlaagGraden: -55 },
    controle: (v) => {
      const box = interieurBox(v);
      const seat = (() => { try { const s = SEAT.vehicleSeat(v, true); return { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2) }; } catch (e) { return null; } })();
      return { cabine: cabinInfo(v), interieurBox: box, stoel: seat, cockpitBinnenRomp: !box || (Math.abs(box.min.z) <= v.model.wid && Math.abs(box.max.z) <= v.model.wid) };
    },
  });
}

// ---- stap: vliegtuig --------------------------------------------------------------
async function stapVliegtuig() {
  const planeModel = (PF && PF.PLANE_MODEL) || { name: 'plane', len: 8, wid: 10.6, maxSpeed: 70, accel: 14, brake: 10, turnRate: 1, color: '#e9e4d3' };
  return cabineStap({
    naam: 'vliegtuig', prefix: '847-vliegtuig', straal: 5.5, hoek: 0.35,
    maak: (x, y, a) => {
      const v = spawn(planeModel, x, y, a, { isPlane: true, onGround: true, z: gh(x, y) });
      // planeflight.js toont de HUD via planecontrol.planeStatus; die leest v.plane en
      // planecontrol.idlePlane schrijft v.planeCtl.thr. Zonder die twee crasht het
      // vliegtuigpaneel/de AI-tick zodra het toestel in de wereld staat (het spel zet ze
      // alleen bij een echte vliegschool-/Kist Kees-spawn). attachPlane zet ze zoals het spel.
      try {
        if (PC && PC.attachPlane) PC.attachPlane(v, x, y, gh(x, y), a);
        else if (AC && AC.makePlane) { v.plane = AC.makePlane(x, y, gh(x, y), a); v.planeCtl = { thr: 0, flaps: 0, gear: true }; }
      } catch (e) { /* geen vliegstaat */ }
      return v;
    },
    buiten: [
      { naam: 'zij', afstanden: [7, 5.5, 9], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: 1.9, opts: { camH: 2.0, fov: 66, maxDuwh: 1.0 } },
      { naam: 'driekwart', afstanden: [7.5, 6, 9.5], hoeken: [0.7, 1.0, 0.4], lookH: 1.85, opts: { camH: 1.95, fov: 66, maxDuwh: 1.0 } },
    ],
    lodModule: C3, lodFallback: [5, 20, 50, 70], lodVoorkeur: [0.5, -0.5],
    fpOpties: { dashboardGraden: -24, omlaagGraden: -52 },
    controle: (v) => {
      const box = interieurBox(v);
      const rompHalfW = 0.65; // PLANE_HALF_W in seating3d.js: de romp van plane3d.js is 1,3 m breed (wid is de spanwijdte!)
      const cockpitBreedte = box ? Math.max(Math.abs(box.min.z), Math.abs(box.max.z)) * 2 : null;
      return {
        cabine: cabinInfo(v), interieurBox: box,
        rompBreedte: +rompHalfW * 2,
        cockpitBreedte: cockpitBreedte === null ? null : +cockpitBreedte.toFixed(2),
        cockpitNietBrederDanRomp: cockpitBreedte === null ? null : cockpitBreedte <= rompHalfW * 2 + 0.1,
        spanwijdteModel: v.model.wid,
      };
    },
  });
}

// ---- stap: maaidorser en laadmachine ----------------------------------------------
async function stapMachines() {
  const modellen = (VH.MACHINE_MODELLEN) || {
    maaidorser: { name: 'maaidorser', len: 7.4, wid: 3.3, maxSpeed: 7, accel: 3.2, brake: 7, turnRate: 1.0, color: '#c43d2b', offroad: 0.9 },
    laadmachine: { name: 'laadmachine', len: 3.4, wid: 1.8, maxSpeed: 7.5, accel: 5, brake: 9, turnRate: 2.2, color: '#e0a92b', offroad: 0.95 },
  };
  const uit = { machines: {}, beelden: [], notities: [], ontbrekend: [] };
  const doen = async (id, model, band) => {
    const r = await cabineStap({
      naam: id, prefix: '847-' + id, straal: 4.2, hoek: 0.45, off: id === 'maaidorser' ? [[-14, 0], [0, -14]] : [],
      maak: (x, y, a) => spawn(model, x, y, a),
      buiten: [
        { naam: 'dichtbij', afstanden: [5.5, 4.5, 6.5], hoeken: [0.7, 1.0, 0.4], lookH: band.lookH, opts: { camH: band.camH, fov: 70, maxDuwh: 1.0 } },
        { naam: 'zij', afstanden: [4.5, 5.5, 3.8], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: band.lookH, opts: { camH: band.camH, fov: 70, maxDuwh: 1.0 } },
      ],
      lodModule: C3, lodFallback: [5, 20, 50, 70], lodVoorkeur: [0.4, -0.4],
      fpOpties: { dashboardGraden: -24, omlaagGraden: -52 },
      controle: (v) => {
        const box = interieurBox(v);
        const fp = null;
        return {
          cabine: cabinInfo(v), interieurBox: box,
          verwachteCabineHoogte: band.y,
          interieurOpCabineHoogte: box ? (box.max.y >= band.y[0] - 0.3 && box.min.y <= band.y[1] + 0.3) : null,
          interieurY: box ? [box.min.y, box.max.y] : null,
        };
      },
    });
    uit.machines[id] = r;
    uit.beelden.push(...(r.beelden || []));
    uit.notities.push(...(r.notities || []));
    uit.ontbrekend.push(...(r.ontbrekend || []));
  };
  await doen('maaidorser', modellen.maaidorser, { y: [2.65, 3.3], camH: 3.4, lookH: 2.95 });
  await doen('laadmachine', modellen.laadmachine, { y: [1.45, 2.0], camH: 2.2, lookH: 1.75 });
  return uit;
}

// ---- stap: boten met roef/stuurhut ------------------------------------------------
async function stapBoten() {
  const uit = { boten: {}, beelden: [], notities: [], ontbrekend: [] };
  if (!BT || !BT.BOAT_KINDS) { uit.ontbrekend.push('boattypes.js ontbreekt'); return uit; }
  if (!WL) { uit.ontbrekend.push('waterlevels.js ontbreekt'); return uit; }
  const K = BT.BOAT_KINDS;
  // Per bootsoort te draaien via --only=boot-<soort> (de grote schepen en de kleine boten in
  // aparte rondes: minder beelden per Electron, minder kans op een crash op een volle machine).
  const gevraagd = ONLY.filter((x) => x.startsWith('boot-'));
  const alleSoorten = [
    { id: 'rondvaart', model: K.rondvaart, zee: false, nav: 1, camH: 2.8, lookH: 1.6, afstanden: [11, 9, 13], fp: true },
    { id: 'sloep-roef', model: K.sloep, zee: false, nav: 1, camH: 2.0, lookH: 1.1, afstanden: [7, 6, 8], fp: true, sloepRoef: true },
    { id: 'spits', model: K.spits, zee: false, nav: 3, camH: 4.2, lookH: 2.4, afstanden: [16, 13, 20], fp: true },
    { id: 'kempenaar', model: K.kempenaar, zee: false, nav: 3, camH: 4.2, lookH: 2.4, afstanden: [18, 15, 22], fp: true },
    { id: 'zeeschip', model: K.zeeVracht, zee: true, camH: 7.5, lookH: 5.5, afstanden: [26, 22, 32], fp: true },
    { id: 'sleper', model: K.zeeSleper, zee: true, camH: 6.0, lookH: 4.2, afstanden: [18, 15, 22], fp: true },
  ];
  const soorten = gevraagd.length ? alleSoorten.filter((s) => gevraagd.includes('boot-' + s.id)) : alleSoorten;
  if (!soorten.length) uit.notities.push('geen geldige boot-<soort> in --only (kies uit: ' + alleSoorten.map((s) => 'boot-' + s.id).join(',') + ')');
  for (const s of soorten) {
    const model = s.model;
    if (!model) { uit.notities.push(s.id + ': bootsoort ontbreekt in boattypes.js'); continue; }
    const plek = await zoekWaterPlek(model.len, model.wid, { zee: s.zee, nav: s.nav || 1 });
    if (!plek) { uit.notities.push(s.id + ': geen waterplek gevonden'); continue; }
    let v = spawn(model, plek.x, plek.y, plek.hoek, { isBoat: true });
    if (s.sloepRoef && BT.boatHasCabin && !BT.boatHasCabin(v)) {
      // de sloep heeft alleen bij een deel van de ids een roef: opnieuw tot er een met roef is
      releaseVehicle(v);
      v = null;
      for (let poging = 0; poging < 10 && !v; poging++) {
        const kandidaat = spawn(model, plek.x, plek.y, plek.hoek, { isBoat: true });
        if (BT.boatHasCabin(kandidaat)) v = kandidaat; else releaseVehicle(kandidaat);
      }
      if (!v) { uit.notities.push(s.id + ': geen sloep met roef gevonden'); continue; }
    }
    const mesh = await waitFor(() => vehicleMesh(v), 9000);
    if (!mesh) { uit.notities.push(s.id + ': geen mesh gebouwd'); releaseVehicle(v); continue; }
    await sleep(900);
    const waterY = mesh.position.y;
    const boot = {
      plek: { x: +plek.x.toFixed(1), y: +plek.y.toFixed(1), hoek: +plek.hoek.toFixed(2), van: plek.vanaf || null, water: plek.water },
      model: { naam: model.name, kind: model.kind, len: model.len, wid: model.wid, soort: model.soort || null },
      mesh: meshStand(v), interieur: interieurStand(v), drempels: drempelInfo(BO3),
      heeftRoef: (() => { try { return BT.boatHasCabin ? !!BT.boatHasCabin(v) : null; } catch (e) { return null; } })(),
    };
    if (boot.interieur.aantal === 0) uit.ontbrekend.push(s.id + ': geen interieurmesh gevonden');
    boot.controle = { box: interieurBox(v) };
    boot.controle.binnenRomp = boot.controle.box ? (Math.abs(boot.controle.box.min.z) <= model.wid / 2 + 0.35 && Math.abs(boot.controle.box.max.z) <= model.wid / 2 + 0.35 && boot.controle.box.min.y > -0.2 && boot.controle.box.max.y < 12) : null;
    // buitenbeelden: van opzij en driekwart voor, op het wateroppervlak als basis
    for (const b of [
      { naam: 'zij', afstanden: s.afstanden, hoeken: [Math.PI / 2, -Math.PI / 2, 1.2] },
      { naam: 'driekwart', afstanden: s.afstanden.map((d) => d + 1), hoeken: [0.7, 1.0, 0.45] },
    ]) {
      const shot = await schietVrij('847-boot-' + s.id + '-' + b.naam, v, b.afstanden, b.hoeken, s.lookH, { basisY: waterY, camH: s.camH, fov: 64, maxDuwh: 1.5 });
      if (shot && !shot.overgeslagen) uit.beelden.push(shot);
      else uit.notities.push('847-boot-' + s.id + '-' + b.naam + ': geen vrije camerastand');
    }
    // eigen boot in eerste persoon
    if (s.fp) {
      boot.fp = await fpStap(v, '847-boot-' + s.id, { basisY: () => waterY, dashboardGraden: -20, omlaagGraden: -50, wacht: 2600, schuin: 25 });
      // Voor de Lead: staat het oog bij grote schepen boven de raamband? De omlaag- en
      // achterom-beelden laten dat zien; hier staat het cijfer erbij.
      if (boot.fp && boot.fp.binnen) {
        boot.fpOordeel = {
          ooghoogteBovenWater: boot.fp.binnen.camera.ooghoogte,
          playerMeshZichtbaar: boot.fp.binnen.playerMeshZichtbaar,
          interieurDriehoekenInBeeld: boot.fp.binnen.interieurDriehoeken,
          opmerking: 'ooghoogte t.o.v. het wateroppervlak; raamband en het glasblok van de grote schepen beoordeel je op de omlaag/achterom-beelden',
        };
      }
    }
    // LOD-trap van de roef: de verste straal schaalt met de scheepslengte (bootMaatFactor), dus de
    // meetpunten komen uit de echte bootLodAt(afstand, lengte).
    if (BO3) {
      boot.maatfactor = typeof BO3.bootMaatFactor === 'function' ? +BO3.bootMaatFactor(model.len).toFixed(2) : null;
      boot.versteStraal = boot.maatfactor && BO3.BOOT_LOD_R ? +(BO3.BOOT_LOD_R[2] * boot.maatfactor).toFixed(0) : (BO3.BOOT_LOD_R ? BO3.BOOT_LOD_R[2] : null);
      const meets = lodMeetpunten(BO3, { drempels: [30, 60, 100], lengte: model.len });
      boot.lodMeetpunten = meets;
      boot.lodMetingen = await meetLod(v, meets, [0.4, -0.4]);
      boot.lodTrap = lodOordeel(boot.lodMetingen);
    }
    uit.boten[s.id] = boot;
    releaseVehicle(v);
  }
  return uit;
}

// ---- stap: gelede bus, bus-wrak en midibus ----------------------------------------
async function stapBus() {
  const uit = { beelden: [], notities: [], ontbrekend: [] };
  await warmGM();
  const busModel = modelVan('bus', { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1, color: '#132a44', stripe: '#3fc6d4' });
  const plek = landPlek(3.5, [[-16, 4], [16, -4], [-16, -4]]);
  const bus = spawn(busModel, plek.x, plek.y, 0.55, { isBus: true });
  const mesh = await waitFor(() => vehicleMesh(bus), 9000);
  if (!mesh) { uit.fout = 'geen busmesh'; releaseVehicle(bus); return uit; }
  await sleep(900);
  uit.bus = { plek: { x: +plek.x.toFixed(1), y: +plek.y.toFixed(1) }, model: { len: busModel.len, wid: busModel.wid, trailer: busModel.trailer || 0 }, mesh: meshStand(bus), busInfo: busInfo(bus), interieur: interieurStand(bus), drempels: drempelInfo(BI) };
  const rear = mesh.userData.busRear;
  uit.achterwagen = rear ? {
    bestaat: true,
    kandidaten: kandidaatMeshes(rear).map((q) => ({ naam: q.naam, bron: q.bron, tri: q.tri, geoId: q.geoId, zichtbaar: q.zichtbaar })),
    box: lokaleBox(rear, rear),
    userData: userDataObjecten(rear),
  } : { bestaat: false };
  if (!rear || !uit.achterwagen.kandidaten.length) uit.ontbrekend.push('achterwagen-interieur ontbreekt (of niet gevonden)');
  // buitenbeelden van de achterwagen: van opzij en van achteren, op raamhoogte
  for (const b of [
    { naam: 'achterwagen-zij', afstanden: [9, 7, 11], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2] },
    { naam: 'achterwagen-driekwart', afstanden: [10, 8, 12], hoeken: [Math.PI - 0.6, Math.PI + 0.6, Math.PI] },
    { naam: 'achterwagen-ramen', afstanden: [6, 5, 7], hoeken: [Math.PI / 2, -Math.PI / 2] },
  ]) {
    const shot = await schietVrij('847-bus-' + b.naam, bus, b.afstanden, b.hoeken, 1.6, { camH: 2.1, fov: 70, maxDuwh: 1.0 });
    if (shot && !shot.overgeslagen) uit.beelden.push(shot);
    else uit.notities.push('847-bus-' + b.naam + ': geen vrije camerastand');
  }
  // LOD-trap van de bus (voor- én achterwagen): de afgesproken punten van #833, met de verwachte
  // driehoekaantallen van de bus-unit ernaast (voorunit 816/504/180, achterwagen 554/336/120;
  // reizigers alleen tot 45 m).
  const radii = (BI && Array.isArray(BI.BUS_LOD_R) ? BI.BUS_LOD_R : [20, 45, 85]);
  uit.verwacht = { BUS_LOD_R: radii, driehoeken: { voor: [816, 504, 180], achter: [554, 336, 120] }, reizigersTotM: radii[1] };
  uit.lodMetingen = await meetLod(bus, [10, 30, 60, 90], [0.62, -0.62, 0.4, -0.4, 1.0, -1.0]);
  uit.lodTrap = lodOordeel(uit.lodMetingen);
  // per meting ook het voorste interieur, de achterwagen en de reizigers
  uit.lodPerPunt = [];
  for (const m of uit.lodMetingen) {
    const bi = busInfo(bus);
    uit.lodPerPunt.push({
      afstand: m.afstand,
      verwachtLod: BI && typeof BI.busLodAt === 'function' ? BI.busLodAt(m.werkelijkAfstand) : null,
      voor: bi.inrichting, achter: bi.achter, reizigers: bi.reizigers, reizigersAchter: bi.achter.reizigers,
    });
  }
  uit.lodKlopt = (() => {
    const bij = (d) => uit.lodPerPunt.find((p) => p.afstand === d) || {};
    const verwachtTri = (kant, i) => (uit.verwacht.driehoeken[kant] || [])[i] ?? null;
    const vgl = (gemeten, verwacht) => (verwacht === null || typeof gemeten !== 'number' ? null : gemeten === verwacht);
    return {
      voor0: vgl(bij(10).voor && bij(10).voor.driehoeken, verwachtTri('voor', 0)),
      voor1: vgl(bij(30).voor && bij(30).voor.driehoeken, verwachtTri('voor', 1)),
      voor2: vgl(bij(60).voor && bij(60).voor.driehoeken, verwachtTri('voor', 2)),
      achter0: vgl(bij(10).achter && bij(10).achter.inrichting && bij(10).achter.inrichting.driehoeken, verwachtTri('achter', 0)),
      achter1: vgl(bij(30).achter && bij(30).achter.inrichting && bij(30).achter.inrichting.driehoeken, verwachtTri('achter', 1)),
      achter2: vgl(bij(60).achter && bij(60).achter.inrichting && bij(60).achter.inrichting.driehoeken, verwachtTri('achter', 2)),
      reizigersDichtbij: !!(bij(10).reizigers && bij(10).reizigers.zichtbaar),
      reizigersMidden: !!(bij(30).reizigers && bij(30).reizigers.zichtbaar),
      reizigersVerWeg: !(bij(60).reizigers && bij(60).reizigers.zichtbaar) && !(bij(90).reizigers && bij(90).reizigers.zichtbaar),
      achterReizigersDichtbij: !!(bij(10).achter && bij(10).achter.reizigers && bij(10).achter.reizigers.zichtbaar),
    };
  })();
  // eerste persoon in de bus: achterom en omlaag de passagiersruimte in
  uit.fp = await fpStap(bus, '847-bus', { dashboardGraden: -25, omlaagGraden: -55, wacht: 2800 });
  releaseVehicle(bus);
  // bus-wrak: passagiersruimte kapot, zichtbaar door de gebroken ramen
  const wrak = spawn(busModel, plek.x, plek.y, 0.55, { isBus: true, wrecked: true });
  const wrakMesh = await waitFor(() => vehicleMesh(wrak), 9000);
  if (wrakMesh) {
    await sleep(800);
    uit.wrak = { model: busModel.name, mesh: meshStand(wrak), interieur: interieurStand(wrak), wrakKandidaten: (interieurStand(wrak).kandidaten || []).filter((q) => /wrak|kapot|brand/i.test(q.naam) || /wrak/i.test(q.bron)) };
    // de wrak-meshes van de bus-unit heten businterieur-wrak / businterieur-achter-wrak
    const wrakNamen = (uit.wrak.interieur.kandidaten || []).map((q) => q.naam).filter((n) => /businterieur/.test(n));
    uit.wrak.namen = wrakNamen;
    uit.wrak.verwachteNamen = { voor: 'businterieur-wrak', achter: 'businterieur-achter-wrak', gevonden: wrakNamen, gevondenVoor: wrakNamen.includes('businterieur-wrak'), gevondenAchter: wrakNamen.includes('businterieur-achter-wrak') };
    uit.beelden.push(...(await beeldenVan('847-bus-wrak', wrak, [
      { naam: 'driekwart', afstanden: [8, 6.5, 10], hoeken: [0.7, 1.0, 0.5], lookH: 1.5, opts: { camH: 1.9, fov: 70 } },
      { naam: 'ramen', afstanden: [5.5, 4.5, 7], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: 1.6, opts: { camH: 1.9, fov: 68 } },
    ])));
  }
  releaseVehicle(wrak);
  // midibus (buurtbus): passagiersruimte tot de achterwand
  const midibusModel = (TF && TF.MIDIBUS_MODEL) || { name: 'midibus', len: 8.4, wid: 2.3, maxSpeed: 20, accel: 5, brake: 12, turnRate: 1.3, color: '#132a44' };
  const midi = spawn(midibusModel, plek.x + 2, plek.y + 2, 0.55, { isBus: true });
  const midiMesh = await waitFor(() => vehicleMesh(midi), 9000);
  if (midiMesh) {
    await sleep(800);
    uit.midibus = { model: { len: midibusModel.len, wid: midibusModel.wid }, mesh: meshStand(midi), busInfo: busInfo(midi), interieur: interieurStand(midi) };
    uit.midibus.controle = { box: interieurBox(midi), binnenRomp: (() => { const b = interieurBox(midi); return b ? (Math.abs(b.min.z) <= midibusModel.wid / 2 + 0.2 && Math.abs(b.max.z) <= midibusModel.wid / 2 + 0.2) : null; })() };
    uit.beelden.push(...(await beeldenVan('847-midibus', midi, [
      { naam: 'driekwart', afstanden: [7, 5.5, 9], hoeken: [0.7, 1.0, 0.4], lookH: 1.5, opts: { camH: 1.9, fov: 70 } },
      { naam: 'zij', afstanden: [4.5, 3.8, 5.5], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: 1.5, opts: { camH: 1.9, fov: 70 } },
    ])));
    uit.midibus.fp = await fpStap(midi, '847-midibus', { dashboardGraden: -25, omlaagGraden: -55, wacht: 2400 });
  }
  releaseVehicle(midi);
  return uit;
}
// beelden van buiten voor een los voertuig, met dezelfde vrije-stand-controle
const beeldenVan = async (prefix, v, lijst) => {
  const uit = [];
  for (const b of lijst) {
    const shot = await schietVrij(prefix + '-' + b.naam, v, b.afstanden, b.hoeken, b.lookH, b.opts || {});
    if (shot && !shot.overgeslagen) uit.push(shot);
  }
  return uit;
};

// ---- stap: trein-LOD (niet-besuurde trein in de buurt) -----------------------------
async function stapTrein() {
  const uit = { beelden: [], notities: [], ontbrekend: [] };
  if (!RW || !RW.getTrains) { uit.ontbrekend.push('railway.js/getTrains ontbreekt'); return uit; }
  const treinen = RW.getTrains() || [];
  if (!treinen.length) { uit.notities.push('geen treinen in deze wereld'); return uit; }
  const heeftDeelbaarPaar = (q) => {
    const cars = (q.cars || []).filter((c) => c.seg && c.seg.kind === 'car');
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) if (cars[i].seg.len === cars[j].seg.len && (cars[i].seg.cab || 0) === (cars[j].seg.cab || 0)) return true;
    return false;
  };
  const t = treinen.find((q) => q.cars && q.cars.length >= 2 && heeftDeelbaarPaar(q)) || treinen.find((q) => q.cars && q.cars.length >= 2) || treinen[0];
  uit.trein = { wagens: t.cars ? t.cars.length : 0, staatVoor: t.state, label: t.cfg && t.cfg.label };
  uit.drempels = drempelInfo(TI) || drempelInfo(R3);
  if (!R3 || !R3.getTrainViews) uit.notities.push('railway3d.getTrainViews ontbreekt: kan het interieur niet rechtstreeks lezen (beelden zeggen genoeg)');
  const bewaard = { state: t.state, timer: t.timer, target: t.target };
  const magBevriezen = t.state !== 'player' && t.state !== 'mission';
  if (magBevriezen) { t.state = 'dwell'; t.timer = 1e9; }
  const mid = t.cars[t.cars.length >> 1];
  const railY = RW.railZ ? RW.railZ(mid.x, mid.y) : 0;
  uit.wagen = { x: +mid.x.toFixed(1), y: +mid.y.toFixed(1), angle: +mid.angle.toFixed(2), railY: +railY.toFixed(2) };
  // een vrije plek naast de baan, en daar de speler neerzetten zodat de tegels streamen en de treinview bouwt
  let naast = null;
  for (const d of [8, 10, 12, 15, 20]) {
    for (const off of [Math.PI / 2, -Math.PI / 2, 0.4, -0.4]) {
      const q = { x: mid.x + Math.cos(mid.angle + off) * d, y: mid.y + Math.sin(mid.angle + off) * d };
      if (vrijPunt(q.x, q.y) && vrijZicht(q.x, q.y, mid.x, mid.y)) { naast = { ...q, d, off }; break; }
    }
    if (naast) break;
  }
  if (naast) { await go(naast.x, naast.y, 0, Math.max(SETTLE, 9000)); hold = { x: naast.x, y: naast.y, a: 0 }; }
  else { await go(mid.x + 6, mid.y + 6, 0, Math.max(SETTLE, 9000)); naast = { x: mid.x + 6, y: mid.y + 6, d: 8, off: 0.3 }; }
  await sleep(1500);
  const views = R3 && R3.getTrainViews ? R3.getTrainViews() : null;
  const view = views && views.get ? views.get(t) : null;
  const leesTrein = () => {
    if (!view || !view.group) return { kandidaten: 0, zichtbaar: 0, driehoeken: 0, namen: [], lodMeshes: [] };
    const k = kandidaatMeshes(view.group);
    const z = k.filter((q) => q.zichtbaar);
    // de LOD-meshes van de trein-unit zelf (per wagen), als de module die kan geven
    let lodMeshes = [];
    try {
      if (TI && typeof TI.lodInterieurVan === 'function') {
        lodMeshes = TI.lodInterieurVan(view).filter(Boolean).map((m, i) => ({
          wagen: i, naam: m.name, tri: tri(m.geometry), geoId: m.geometry ? m.geometry.id : null,
          zichtbaar: ketenZichtbaar(m, view.group), lod: TI.treinLodAt ? null : null,
        }));
      }
    } catch (e) { /* geen LOD-meshes */ }
    return {
      kandidaten: k.length, zichtbaar: z.length, driehoeken: z.reduce((s, q) => s + q.tri, 0),
      lodDriehoeken: lodMeshes.filter((m) => m.zichtbaar).reduce((s, m) => s + m.tri, 0),
      lodMeshes,
      meshes: k.map((q) => ({ naam: q.naam, bron: q.bron, tri: q.tri, geoId: q.geoId, zichtbaar: q.zichtbaar })),
    };
  };
  uit.view = { bestaat: !!view, wagens: view && view.cars ? view.cars.length : 0 };
  uit.interieur = leesTrein();
  if (!uit.interieur.kandidaten) uit.ontbrekend.push('geen treininterieur-mesh gevonden (LOD-unit nog niet in deze build, of trein te ver?)');
  // buitenbeelden op raamhoogte (vloer ~1,1 m boven de rail, raamband 2,0-3,2 m boven de rail)
  const standen = [...(naast ? [{ x: naast.x, y: naast.y }] : []), { x: mid.x + Math.cos(mid.angle + Math.PI / 2) * 10, y: mid.y + Math.sin(mid.angle + Math.PI / 2) * 10 }, { x: mid.x + Math.cos(mid.angle - Math.PI / 2) * 10, y: mid.y + Math.sin(mid.angle - Math.PI / 2) * 10 }];
  for (let i = 0; i < standen.length; i++) {
    const q = standen[i];
    if (!vrijPunt(q.x, q.y) || !vrijZicht(q.x, q.y, mid.x, mid.y)) continue;
    const info = await poseShot('847-trein-ramen-' + (i + 1), {
      position: { x: q.x, y: q.y, z: railY + 2.8 },
      lookAt: { x: mid.x, y: mid.y, z: railY + 2.4 }, fov: 72, cut: true,
    }, 1200, { hide: true, target: { x: mid.x, y: mid.y, h: railY + 2.4 }, check: (j) => j.verschilH < 0.8 && !!(j.doel && j.doel.projectie.inBeeld) });
    if (!info.overgeslagen) uit.beelden.push(info);
    if (uit.beelden.length >= 2) break;
  }
  // LOD-trap van de trein-LOD: TREIN_LOD_R = [70, 150] met twee niveaus (lod0 tot 70 m, lod1 tot
  // 150 m, daarna verborgen). We meten op een punt midden in elk niveau en voorbij de verste straal,
  // met de verwachting uit treinLodAt ernaast (geen "strikt afnemend over vier punten").
  const radii = TI && Array.isArray(TI.TREIN_LOD_R) ? TI.TREIN_LOD_R : [70, 150];
  const verwachtLod = (d) => (TI && typeof TI.treinLodAt === 'function' ? TI.treinLodAt(d) : (d < radii[0] ? 0 : d < radii[1] ? 1 : -1));
  const meets = [Math.max(12, Math.round(radii[0] * 0.4)), Math.round((radii[0] + radii[1]) / 2), radii[1] + 30];
  uit.drempels = uit.drempels || { radii: { naam: 'TREIN_LOD_R', waarden: radii }, fn: TI && TI.treinLodAt ? 'treinLodAt' : null };
  uit.lodMeetpunten = meets;
  uit.lodMetingen = [];
  for (const d of meets) {
    const q = { x: mid.x + Math.cos(mid.angle + Math.PI / 2) * d, y: mid.y + Math.sin(mid.angle + Math.PI / 2) * d };
    setAnchor(q.x, q.y, 0);
    await sleep(900);
    const lees = leesTrein();
    uit.lodMetingen.push({ afstand: d, verwachtLod: verwachtLod(d), ankerVrij: vrijPunt(q.x, q.y), ...lees });
  }
  uit.lodTrap = {
    punten: uit.lodMetingen.map((m) => ({ afstand: m.afstand, verwachtLod: m.verwachtLod, lodDriehoeken: m.lodDriehoeken, zichtbareLodMeshes: (m.lodMeshes || []).filter((x) => x.zichtbaar).length })),
    dichtbijNiveau0: (() => { const m = uit.lodMetingen[0] || {}; return m.verwachtLod === 0 && (m.lodDriehoeken || 0) > 0; })(),
    middenNiveau1: (() => { const a = uit.lodMetingen[0] || {}, b = uit.lodMetingen[1] || {}; return b.verwachtLod === 1 && (b.lodDriehoeken || 0) > 0 && (b.lodDriehoeken || 0) < (a.lodDriehoeken || 0); })(),
    leegVoorbijVerste: (() => { const m = uit.lodMetingen[2] || {}; return m.verwachtLod === -1 && (m.lodDriehoeken || 0) === 0; })(),
    gedeeldeGeometrie: (() => {
      const ids = ((uit.lodMetingen[1] && uit.lodMetingen[1].lodMeshes) || uit.lodMetingen[0] && uit.lodMetingen[0].lodMeshes || []).filter((m) => m.zichtbaar && m.geoId !== null).map((m) => m.geoId);
      const dubbel = ids.filter((g, i) => ids.indexOf(g) !== i);
      return { geoIds: ids, gedeeldPaar: dubbel.length > 0 };
    })(),
  };
  // gedeelde geometrie ook direct: dezelfde wagen tweemaal bouwen levert dezelfde cache-inhoud
  if (TI && typeof TI.buildCarLodGeometry === 'function' && t.cfg && t.cars && t.cars.length) {
    try {
      const lay = (await import('/js/treinlayout.js')).trainLayout(t.cfg);
      const paren = [];
      const cars = t.cars.map((c, i) => ({ c, cl: lay[i] })).filter((x) => x.c && x.c.seg && x.c.seg.kind === 'car' && x.cl);
      for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) if (cars[i].c.seg.len === cars[j].c.seg.len && (cars[i].c.seg.cab || 0) === (cars[j].c.seg.cab || 0)) paren.push([cars[i], cars[j]]);
      if (paren.length) {
        const [a, b] = paren[0];
        const ga = TI.buildCarLodGeometry(t.cfg, a.c.seg, a.cl, 1);
        const gb = TI.buildCarLodGeometry(t.cfg, b.c.seg, b.cl, 1);
        uit.geometrieBouw = { paren: paren.length, triA: tri(ga), triB: tri(gb), gelijkeInhoud: tri(ga) === tri(gb) };
        if (ga && ga.dispose) ga.dispose();
        if (gb && gb.dispose && gb !== ga) gb.dispose();
      } else uit.geometrieBouw = { paren: 0, opmerking: 'geen twee gelijke wagens in deze trein' };
    } catch (e) { uit.geometrieBouw = { fout: String((e && e.message) || e).slice(0, 150) }; }
  }
  if (magBevriezen) { t.state = bewaard.state; t.timer = bewaard.timer; t.target = bewaard.target; }
  return uit;
}

// ---- stap: wrakken van auto's en bestelbus ----------------------------------------
async function stapWrak() {
  const uit = { beelden: [], notities: [], ontbrekend: [] };
  await warmGM();
  const gevallen = [
    { id: 'sedan', model: modelVan('sedan', { name: 'sedan', len: 4.3, wid: 1.8 }) },
    { id: 'bestelbus', model: modelVan('van', { name: 'van', len: 5.0, wid: 2.0 }) },
    { id: 'vrachtwagen', model: { name: 'truck', len: 8.5, wid: 2.5, maxSpeed: 22, accel: 4.5, brake: 14, turnRate: 1.5 } },
  ];
  let off = 0;
  for (const g of gevallen) {
    const plek = landPlek(2.5, [[off, 0], [-off, 6]]);
    off += 6;
    const v = spawn(g.model, plek.x, plek.y, 0.5, { wrecked: true });
    const mesh = await waitFor(() => vehicleMesh(v), 9000);
    if (!mesh) { uit.notities.push(g.id + ': geen wreckmesh'); releaseVehicle(v); continue; }
    await sleep(700);
    const st = interieurStand(v);
    const cab = mesh.userData.cabin;
    // Het kapotte interieur van cabin3d (#847) zit in de gewone interieurmesh userData.cabin (met
    // een eigen wrakgeometrie), niet in een apart genoemd mesh. Het opengezette glas is aan de
    // materialen van de carrosserie te zien: doorzichtig met een lage dekking.
    let glasOpen = 0;
    mesh.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && m.transparent && m.opacity !== undefined && m.opacity <= 0.25) glasOpen++;
    });
    const vrachtKandidaat = (st.kandidaten || []).find((q) => q.bron.includes('ud.vrachtruimte')) || null;
    const wrak = {
      model: g.model.name, mesh: meshStand(v), interieur: st,
      cabine: { bestaat: !!cab, zichtbaar: !!(cab && cab.visible), driehoeken: cab ? tri(cab.geometry) : 0, geoId: cab && cab.geometry ? cab.geometry.id : null },
      vrachtruimte: vrachtKandidaat,
      wrakKandidaten: (st.kandidaten || []).filter((q) => /wrak|kapot|brand/i.test(q.naam) || /wrak/i.test(q.bron) || /ud\.cabin/.test(q.bron)),
      glasOpenMaterialen: glasOpen,
      box: interieurBox(v),
    };
    wrak.wrakvariantGevonden = !!(cab && cab.visible && cab.geometry && (st.kandidaten || []).some((q) => q.bron.includes('ud.cabin')));
    if (!wrak.wrakvariantGevonden) uit.ontbrekend.push(g.id + ': geen zichtbare wrakcabine (userData.cabin) gevonden');
    if (!glasOpen) uit.notities.push(g.id + ': geen geopend glasmateriaal gevonden (het wrakglas hoort doorzichtig te zijn)');
    if (!wrak.interieur.zichtbaarAantal) uit.ontbrekend.push(g.id + ': interieur niet zichtbaar in de wrakmesh');
    // hetzelfde model zonder wrak ernaast: de wrakgeometrie hoort een eigen, andere geometrie te zijn
    const vNorm = spawn(g.model, plek.x - 4.5, plek.y + 2.2, 0.5, {});
    if (await waitFor(() => vehicleMesh(vNorm), 8000)) {
      setAnchor(plek.x, plek.y + 8, 0.5);
      await sleep(500);
      const normCab = vehicleMesh(vNorm) && vehicleMesh(vNorm).userData.cabin;
      wrak.verschiltVanNormale = {
        normaalTri: normCab ? tri(normCab.geometry) : 0,
        normaalGeoId: normCab && normCab.geometry ? normCab.geometry.id : null,
        wrakTri: wrak.cabine.driehoeken, wrakGeoId: wrak.cabine.geoId,
        verschillend: !!(wrak.cabine.geoId !== null && normCab && normCab.geometry && wrak.cabine.geoId !== normCab.geometry.id),
      };
      releaseVehicle(vNorm);
    }
    // twee dezelfde wrakken: de kapotte geometrie hoort gedeeld te zijn
    const v2 = spawn(g.model, plek.x + 4.5, plek.y + 2.2, 0.5, { wrecked: true });
    if (await waitFor(() => vehicleMesh(v2), 8000)) {
      setAnchor(plek.x + 9, plek.y + 4, 0.5);
      await sleep(500);
      const a = leesInterieur(v), b = leesInterieur(v2);
      wrak.deling = { v1: a.geoIds, v2: b.geoIds, gedeeldAantal: a.geoIds.filter((x) => b.geoIds.includes(x)).length, gelijk: a.geoIds.some((x) => b.geoIds.includes(x)) };
      releaseVehicle(v2);
    }
    uit.beelden.push(...(await beeldenVan('847-wrak-' + g.id, v, [
      { naam: 'driekwart', afstanden: [4.2, 3.6, 5], hoeken: [0.65, 0.5, 1.0], lookH: 1.0, opts: { camH: 1.5, fov: 70, maxDuwh: 0.9 } },
      { naam: 'zij', afstanden: [3.4, 2.8, 4], hoeken: [Math.PI / 2, -Math.PI / 2, 1.2], lookH: 1.0, opts: { camH: 1.45, fov: 70, maxDuwh: 0.9 } },
    ])));
    uit.gevallen = uit.gevallen || {};
    uit.gevallen[g.id] = wrak;
    releaseVehicle(v);
  }
  return uit;
}

// ---- stap: vrachtruimtes en kofferbakken ------------------------------------------
async function stapVracht() {
  const uit = { voertuigen: {}, beelden: [], notities: [], ontbrekend: [] };
  await warmGM();
  if (!VR3 && !VR) uit.ontbrekend.push('vrachtruimte.js/vrachtruimte3d.js ontbreken nog in deze build');
  const vanModel = modelVan('van', { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 38, accel: 7, brake: 19, turnRate: 2.0 });
  const specs = [
    { id: 'bestelbus', model: vanModel },
    { id: 'ambulance', model: { name: 'ambulance', len: 6.0, wid: 2.0, maxSpeed: 30, accel: 8, brake: 18, turnRate: 2.6, color: '#f1d21c' }, opts: { isAmbulance: true } },
    { id: 'vrachtwagen', model: { name: 'truck', len: 8.5, wid: 2.5, maxSpeed: 22, accel: 4.5, brake: 14, turnRate: 1.5, color: '#7a5a3a' } },
    { id: 'foodtruck', model: { name: 'foodtruck', len: 5.4, wid: 2.1, maxSpeed: 34, accel: 6.5, brake: 14, turnRate: 2, color: '#2f6fb0' } },
    { id: 'cashvan', model: { name: 'cashvan', len: 5.2, wid: 2.0, maxSpeed: 28, accel: 6.8, brake: 19, turnRate: 2.0, color: '#d9d9d9' }, opts: { isCashVan: true } },
    { id: 'kofferbak', model: modelVan('wagon', { name: 'wagon', len: 4.5, wid: 1.8 }), kofferbak: true },
  ];
  let off = 0;
  for (const s of specs) {
    const plek = landPlek(2.8, [[off, 0], [-off, 7], [0, off]]);
    off += 5;
    const v = spawn(s.model, plek.x, plek.y, 0.5, s.opts || {});
    const mesh = await waitFor(() => vehicleMesh(v), 9000);
    if (!mesh) { uit.notities.push(s.id + ': geen mesh'); releaseVehicle(v); continue; }
    await sleep(800);
    const opening = vrachtOpening(v);
    // De camera-afstand is ten opzichte van het voertuigmidden: bij een vrachtwagen (8,5 m) moet je
    // dus verder weg staan dan de halve lengte, anders sta je in de bak.
    const achterAfstand = +(s.model.len / 2 + 4).toFixed(1);
    const rij = {
      model: s.model.name, mesh: meshStand(v),
      soort: (() => { try { return VR && VR.vrachtruimteSoort ? VR.vrachtruimteSoort(v) : null; } catch (e) { return null; } })(),
      meting: (() => { try { return VR3 && VR3.vrachtruimteMeting ? VR3.vrachtruimteMeting(v) : (VR && VR.vrachtruimteMeting ? VR.vrachtruimteMeting(v) : null); } catch (e) { return null; } })(),
      deur: opening ? { id: opening.id, deuren: opening.deuren, vasteOpening: opening.vasteOpening, virtueel: opening.virtueel } : null,
      kofferbak: !!s.kofferbak, drempels: drempelInfo(VR3),
      staten: {},
    };
    const stand3d = () => { try { return VR3 && VR3.vrachtruimteStand ? VR3.vrachtruimteStand(v) : null; } catch (e) { return null; } };
    if ((!opening || !opening.id) && !(opening && opening.vasteOpening)) uit.notities.push(s.id + ': geen (achter)deur/klep gevonden (open/los kan niet worden gezet)');
    const camera = (naam) => schietVrij('847-vracht-' + s.id + '-' + naam, v, [achterAfstand, achterAfstand - 1.2, achterAfstand + 1.2], [Math.PI, Math.PI - 0.55, Math.PI + 0.55], s.kofferbak ? 1.0 : 1.15, { camH: 1.6, fov: 68, maxDuwh: 0.9 });
    // Het luik van de foodtruck zit op de RECHTERFLANK (vaste opening in het model): van achteren kijk
    // je er langszij langs, dus daarvoor een beeld opzij en eentje dichtbij.
    const zijCamera = (naam, afstanden = [s.model.len / 2 + 2.5, s.model.len / 2 + 1.8, s.model.len / 2 + 3.2]) => schietVrij('847-vracht-' + s.id + '-' + naam, v, afstanden, [Math.PI / 2], 1.62, { camH: 1.75, fov: 66, maxDuwh: 0.9 });
    // 1) dicht
    await sleep(400);
    rij.staten.dicht = { ...vrachtStand(v), regel: vrachtRegel(v), stand3d: stand3d() };
    const dicht = await camera('dicht');
    if (dicht && !dicht.overgeslagen) uit.beelden.push(dicht);
    if (s.id === 'foodtruck') {
      const zij = await zijCamera('luik-zij');
      if (zij && !zij.overgeslagen) uit.beelden.push(zij);
      const dichtbij = await zijCamera('luik-dichtbij', [3.2, 2.6, 4]);
      if (dichtbij && !dichtbij.overgeslagen) uit.beelden.push(dichtbij);
    }
    const deurId = opening && opening.id;
    const vasteOpening = !!(opening && opening.vasteOpening);
    if (deurId && !vasteOpening) {
      // 2) open
      zetDeur(v, deurId, true, false);
      await sleep(900);
      rij.staten.open = { ...vrachtStand(v), regel: vrachtRegel(v), stand3d: stand3d() };
      const open = await camera('open');
      if (open && !open.overgeslagen) uit.beelden.push(open);
      // 3) los/ontbrekend
      zetDeur(v, deurId, true, true);
      await sleep(1100);
      rij.staten.los = { ...vrachtStand(v), regel: vrachtRegel(v), stand3d: stand3d() };
      const los = await camera('los');
      if (los && !los.overgeslagen) uit.beelden.push(los);
      // zichtbaarheidsregel: bij dichte deur hoort de laadruimte verborgen te zijn, bij open/los zichtbaar
      rij.zichtbaarheidsregel = {
        dichtVerborgen: rij.staten.dicht && rij.staten.dicht.zichtbaar === false,
        openZichtbaar: rij.staten.open && rij.staten.open.zichtbaar === true,
        losZichtbaar: rij.staten.los && rij.staten.los.zichtbaar === true,
        regelKloptDicht: rij.staten.dicht.regel === false,
        regelKloptOpen: rij.staten.open.regel === true,
        regelKloptLos: rij.staten.los.regel === true,
      };
      if (!rij.zichtbaarheidsregel.dichtVerborgen) uit.notities.push(s.id + ': gemeten laadruimte lijkt zichtbaar bij dichte deur');
      if (!rij.zichtbaarheidsregel.openZichtbaar) uit.notities.push(s.id + ': gemeten laadruimte niet zichtbaar bij open deur');
      if (!rij.zichtbaarheidsregel.losZichtbaar) uit.notities.push(s.id + ': gemeten laadruimte niet zichtbaar bij losse deur');
      // opruimen: deur weer dicht
      zetDeur(v, deurId, false, false);
    } else {
      rij.staten.open = null; rij.staten.los = null;
      rij.zichtbaarheidsregel = vasteOpening
        ? { vasteOpening: true, altijdZichtbaar: !!(rij.staten.dicht && rij.staten.dicht.zichtbaar) }
        : { geenOpening: true };
    }
    uit.voertuigen[s.id] = rij;
    releaseVehicle(v);
  }
  return uit;
}

// ---- stap: prestatie (draw calls, frametijd, bouwtijd per module) ------------------
const tel = { mode: 'aan', calls: 0, tris: 0, renders: 0, lijst: [] };
const telInstalleer = () => {
  const R = sc.renderer;
  if (R.__i847OrigRender) return;
  const orig = R.render;
  const wrapper = function (...a) {
    let verborgen = null;
    if (tel.mode === 'uit' && a[0] === sc.scene) {
      verborgen = [];
      for (const o of tel.lijst) { if (o.visible) { verborgen.push([o, true]); o.visible = false; } else verborgen.push([o, false]); }
    }
    const r = orig.apply(this, a);
    if (verborgen) for (const [o, vis] of verborgen) o.visible = vis;
    if (a[0] === sc.scene) { tel.calls += R.info.render.calls; tel.tris += R.info.render.triangles; tel.renders++; }
    return r;
  };
  R.render = wrapper;
  R.__i847OrigRender = orig;
};
const telReset = () => { tel.calls = 0; tel.tris = 0; tel.renders = 0; };
const telLees = () => ({ calls: +(tel.calls / Math.max(1, tel.renders)).toFixed(2), tris: +(tel.tris / Math.max(1, tel.renders)).toFixed(1), renders: tel.renders });
const interieursInBeeld = () => {
  const frustum = new sc.THREE.Frustum().setFromProjectionMatrix(new sc.THREE.Matrix4().multiplyMatrices(sc.cam.projectionMatrix, sc.cam.matrixWorldInverse));
  const lijst = [];
  let calls = 0, trisTotaal = 0;
  for (const v of w.vehicles) {
    const mesh = vehicleMesh(v);
    if (!mesh) continue;
    for (const q of kandidaatMeshes(mesh)) {
      if (!q.zichtbaar || !q.obj.isMesh) continue;
      if (!frustum.intersectsObject(q.obj)) continue;
      calls++; trisTotaal += q.tri;
      lijst.push({ soort: q.naam, driehoeken: q.tri });
    }
  }
  return { calls, driehoeken: trisTotaal, meshes: lijst.slice(0, 24) };
};
// Eén bouwer een paar keer aanroepen en de gemiddelde tijd meten; een fout in de signaturen komt
// als "fout" in de json en niet als crash van de hele ronde.
const meetBouw = (naam, fn, herhalingen = 3) => {
  try {
    const t0 = performance.now();
    let r = null;
    for (let i = 0; i < herhalingen; i++) r = fn();
    const ms = (performance.now() - t0) / herhalingen;
    const uit = { naam, ms: +ms.toFixed(3) };
    if (r && r.isBufferGeometry) uit.driehoeken = tri(r);
    else if (r && Array.isArray(r.delen)) uit.delen = r.delen.length;
    else if (r && r.layout) uit.velden = Object.keys(r.layout).slice(0, 8);
    else if (r && typeof r === 'object') uit.velden = Object.keys(r).slice(0, 10);
    else uit.waarde = typeof r;
    return uit;
  } catch (e) { return { naam, fout: String((e && e.message) || e).slice(0, 160) }; }
};
const proefVoertuig = (model, extra = {}) => { const v = new VH.Vehicle(0, 0, 0, { ...model }); Object.assign(v, extra); return v; };
// Bouwtijd per nieuwe module, met de echte signaturen (de vier units leveren die zelf aan):
// cockpitlayout.cockpitLayout(klasse, seat, len, wid, naam), bootinterieur.bootInterieur(v) +
// bootinterieur3d.buildBootInterieur(layout, lod), vrachtruimte.vrachtruimteIndeling(v)/
// vrachtruimteDelen(v,{lod}), businterieur.busInterieur(...) + businterieur3d-builders.
const bouwTijden847 = () => {
  const uit = { cabinLods: cabinBouwPerKlasse() };
  const cabinProef = [
    ['trekker', (VH.TRACTOR_MODEL || { name: 'tractor', len: 4.3, wid: 2.3 }), {}],
    ['heli', (HF && HF.HELI_MODEL) || { name: 'heli', len: 8.8, wid: 2.1 }, { isHeli: true }],
    ['vliegtuig', (PF && PF.PLANE_MODEL) || { name: 'plane', len: 8, wid: 10.6 }, { isPlane: true }],
    ['machine', (VH.MACHINE_MODELLEN && VH.MACHINE_MODELLEN.maaidorser) || { name: 'maaidorser', len: 7.4, wid: 3.3 }, {}],
  ];
  // cockpitlayout: de pure cockpitindeling per klasse
  if (CL && typeof CL.cockpitLayout === 'function') {
    uit.cockpit = {};
    for (const [klasse, model, extra] of cabinProef) {
      const v = proefVoertuig(model, extra);
      const seat = SEAT && SEAT.vehicleSeat ? (() => { try { return SEAT.vehicleSeat(v, true); } catch (e) { return null; } })() : null;
      uit.cockpit[klasse] = meetBouw('cockpitLayout-' + klasse, () => CL.cockpitLayout(klasse, seat, v.model.len, v.model.wid, v.model.name));
    }
  }
  // boten: pure indeling en de 3D-bouwer per LOD (inclusief het eigen-boot-detail)
  if (BO && typeof BO.bootInterieur === 'function' && BT && BT.BOAT_KINDS) {
    uit.boot = {};
    for (const id of ['sloep', 'rondvaart', 'spits', 'kempenaar', 'zeeVracht', 'zeeSleper']) {
      const model = BT.BOAT_KINDS[id];
      if (!model) continue;
      const v = proefVoertuig(model, { isBoat: true });
      let layout = null;
      const puur = meetBouw('bootInterieur-' + id, () => { layout = BO.bootInterieur(v); return layout; });
      uit.boot[id] = { puur };
      if (layout && BO3 && typeof BO3.buildBootInterieur === 'function') {
        for (const lod of [0, 1, 2, BO3.BOOT_EIGEN_LOD || 3]) uit.boot[id]['lod' + lod] = meetBouw('buildBootInterieur-' + id + '-' + lod, () => BO3.buildBootInterieur(layout, lod));
      }
    }
  }
  // vrachtruimtes: pure indeling + de losse delen per LOD
  if (VR) {
    uit.vracht = {};
    const vrachtProef = [
      ['bestelbus', modelVan('van', { name: 'van', len: 5.0, wid: 2.0 }), {}],
      ['ambulance', { name: 'ambulance', len: 6.0, wid: 2.0 }, { isAmbulance: true }],
      ['vrachtwagen', { name: 'truck', len: 8.5, wid: 2.5 }, {}],
      ['foodtruck', { name: 'foodtruck', len: 5.4, wid: 2.1 }, {}],
      ['cashvan', { name: 'cashvan', len: 5.2, wid: 2.0 }, { isCashVan: true }],
      ['kofferbak', modelVan('wagon', { name: 'wagon', len: 4.5, wid: 1.8 }), {}],
    ];
    for (const [id, model, extra] of vrachtProef) {
      const v = proefVoertuig(model, extra);
      const rij = { soort: (() => { try { return VR.vrachtruimteSoort(v); } catch (e) { return null; } })() };
      if (typeof VR.vrachtruimteIndeling === 'function') rij.puur = meetBouw('vrachtruimteIndeling-' + id, () => VR.vrachtruimteIndeling(v));
      if (typeof VR.vrachtruimteDelen === 'function') {
        rij.delen = {};
        for (const lod of [0, 1, 2]) rij.delen[lod] = meetBouw('vrachtruimteDelen-' + id + '-' + lod, () => VR.vrachtruimteDelen(v, { lod }));
      }
      if (typeof VR.vrachtruimteMeting === 'function') { try { rij.meting = VR.vrachtruimteMeting(v); } catch (e) { /* geen meting */ } }
      uit.vracht[id] = rij;
    }
  }
  // bus: indeling, inrichting en de achterwagen/wrak-bouwers per LOD
  if (BUI && typeof BUI.busInterieur === 'function' && BI) {
    const model = modelVan('bus', { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1 });
    try {
      const L = BUI.busInterieur(model.len, model.wid, { trailer: model.trailer || 0 });
      uit.bus = { inrichting: {}, achter: {}, wrak: {} };
      if (typeof BI.buildInrichting === 'function') for (const lod of [0, 1, 2]) uit.bus.inrichting[lod] = meetBouw('buildInrichting-' + lod, () => BI.buildInrichting(L, lod));
      if (typeof BI.buildAchterInrichting === 'function') {
        const R = L.achterwagen || L.achter || L.trailer || L;
        for (const lod of [0, 1, 2]) uit.bus.achter[lod] = meetBouw('buildAchterInrichting-' + lod, () => BI.buildAchterInrichting(R, lod));
      }
      if (typeof BI.buildWrakInrichting === 'function') for (const lod of [0, 1, 2]) uit.bus.wrak[lod] = meetBouw('buildWrakInrichting-' + lod, () => BI.buildWrakInrichting(L, lod));
      if (typeof BI.buildReizigers === 'function') uit.bus.reizigers = meetBouw('buildReizigers', () => BI.buildReizigers(L, 20, []));
    } catch (e) { uit.bus = { fout: String((e && e.message) || e).slice(0, 160) }; }
  }
  // trein-LOD: de exportbare radii/functies van de treininterieur-module (de LOD-bouwer zelf zit in
  // het sync-pad; die meten we niet los, want hij hangt aan de treinview)
  if (TI) uit.trein = { radii: TI.TREIN_LOD_R || TI.LOD_R || null, functies: Object.keys(TI).filter((k) => typeof TI[k] === 'function' && /lod|build/i.test(k)).slice(0, 8) };
  return uit;
};
const cabinBouwPerKlasse = () => {
  const uit = {};
  if (!C3 || !C3.buildCabinGeometry || !SEAT || !MV) return { overgeslagen: 'cabin3d/seating3d/models3d_vehicles ontbreken' };
  const proef = [
    ['trekker', VH.TRACTOR_MODEL || { name: 'tractor', len: 4.3, wid: 2.3 }],
    ['heli', (HF && HF.HELI_MODEL) || { name: 'heli', len: 8.8, wid: 2.1 }],
    ['vliegtuig', (PF && PF.PLANE_MODEL) || { name: 'plane', len: 8, wid: 10.6 }],
    ['machine', (VH.MACHINE_MODELLEN && VH.MACHINE_MODELLEN.maaidorser) || { name: 'maaidorser', len: 7.4, wid: 3.3 }],
  ];
  for (const [klasse, model] of proef) {
    try {
      const v = new VH.Vehicle(0, 0, 0, { ...model });
      if (klasse === 'heli') v.isHeli = true;
      if (klasse === 'vliegtuig') v.isPlane = true;
      const seat = SEAT.vehicleSeat(v, true);
      const romp = MV.carBodyFit ? MV.carBodyFit(v) : null;
      const k = CIL && CIL.interiorKlasse ? CIL.interiorKlasse(v) : klasse;
      const per = {};
      for (const lod of [0, 1, 2]) {
        const t0 = performance.now();
        let geo = null;
        for (let i = 0; i < 3; i++) geo = C3.buildCabinGeometry(seat, v.model.len, v.model.wid, k, romp, lod);
        per[lod] = { ms: +((performance.now() - t0) / 3).toFixed(3), driehoeken: tri(geo) };
        if (geo && geo.dispose) geo.dispose();
      }
      uit[klasse] = { klasse: k, lods: per, trapKlopt: per[0].driehoeken > per[1].driehoeken && per[1].driehoeken > per[2].driehoeken };
    } catch (e) { uit[klasse] = { fout: String((e && e.message) || e).slice(0, 200) }; }
  }
  return uit;
};
async function stapPrestatie() {
  const uit = { beelden: [], notities: [] };
  if (p.inVehicle) p.exitVehicle(map, w);
  await go(GM.x, GM.y, 0, SETTLE);
  hold = { x: GM.x, y: GM.y, a: 0 };
  w.camYaw = 0;
  await sleep(600);
  const proef = [];
  const bij = (model, dx, dy, a, opts) => { const v = spawn(model, GM.x + dx, GM.y + dy, a, opts || {}); proef.push(v); return v; };
  bij(modelVan('sedan', { name: 'sedan', len: 4.3, wid: 1.8 }), 8, 2, 0.4);
  bij(modelVan('van', { name: 'van', len: 5.0, wid: 2.0 }), 14, -5, 0.4);
  bij(modelVan('bus', { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1 }), 22, 6, 1.0, { isBus: true });
  bij(VH.TRACTOR_MODEL || { name: 'tractor', len: 4.3, wid: 2.3 }, 27, -6, 0.5);
  bij((VH.MACHINE_MODELLEN && VH.MACHINE_MODELLEN.maaidorser) || { name: 'maaidorser', len: 7.4, wid: 3.3 }, 33, 8, 0.6);
  bij((TF && TF.MIDIBUS_MODEL) || { name: 'midibus', len: 8.4, wid: 2.3 }, -10, -8, 0.6, { isBus: true });
  bij({ name: 'truck', len: 8.5, wid: 2.5 }, -18, 6, 0.5);
  await waitFor(() => proef.every((v) => vehicleMesh(v)), 9000);
  await sleep(1200);
  uit.opzet = { voertuigen: proef.length, positie: { x: GM.x, y: GM.y } };
  uit.interieurs = { perVoertuig: [], totaalKandidaten: 0, totaalZichtbaar: 0 };
  tel.lijst = [];
  const gezien = new Set();
  for (const v of proef) {
    const mesh = vehicleMesh(v);
    if (!mesh) continue;
    const k = kandidaatMeshes(mesh);
    uit.interieurs.perVoertuig.push({ model: v.model && v.model.name, kandidaten: k.length, zichtbaar: k.filter((q) => q.zichtbaar).length, driehoeken: k.filter((q) => q.zichtbaar).reduce((s, q) => s + q.tri, 0), namen: [...new Set(k.map((q) => q.naam))].slice(0, 12) });
    uit.interieurs.totaalKandidaten += k.length;
    uit.interieurs.totaalZichtbaar += k.filter((q) => q.zichtbaar).length;
    for (const q of k) if (q.zichtbaar && q.obj && !gezien.has(q.obj.uuid || q.obj.id)) { gezien.add(q.obj.uuid || q.obj.id); tel.lijst.push(q.obj); }
  }
  uit.inBeeld = interieursInBeeld();
  telInstalleer();
  // draw calls: alle interieurs aan tegen alle interieurs uit (dezelfde stand, dezelfde frames)
  framesN(3);
  tel.mode = 'aan'; telReset();
  await framesN(45);
  const aan = telLees();
  tel.mode = 'uit'; telReset();
  await framesN(45);
  const zonder = telLees();
  tel.mode = 'aan'; telReset();
  uit.render = {
    metInterieurs: aan, zonderInterieurs: zonder,
    verschilCalls: +(aan.calls - zonder.calls).toFixed(2),
    verschilTris: +(aan.tris - zonder.tris).toFixed(1),
    verklaarbaar: { getekendInBeeld: uit.inBeeld.calls, getekendeDriehoeken: uit.inBeeld.driehoeken, interieurGroepen: tel.lijst.length },
    verschilKlopt: Math.abs((aan.calls - zonder.calls) - uit.inBeeld.calls) <= Math.max(2, uit.inBeeld.calls * 0.35),
  };
  uit.frametijd = await frametijden(90);
  uit.frametijdOordeel = { indicatief: true, opmerking: 'headless op een belaste machine: ruwe indicatie, geen spelers-pc' };
  // bouwtijd per module (nieuwe en bestaande interieurs), met de echte signaturen van de units
  uit.bouwtijd = bouwTijden847();
  // opruimen
  for (const v of proef) releaseVehicle(v);
  hold = { x: GM.x, y: GM.y, a: 0 };
  return uit;
}

// ---- uitvoeren ---------------------------------------------------------------------
const leaveStart = async () => {
  const ss = document.getElementById('start-screen');
  for (let i = 0; i < 4 && ss && ss.classList.contains('visible'); i++) { await tap('Enter', 'Enter', 120); await sleep(3500); }
};
const beelNamenVan = (o, uit = []) => {
  if (!o || typeof o !== 'object') return uit;
  if (Array.isArray(o)) { for (const x of o) beelNamenVan(x, uit); return uit; }
  if (typeof o.naam === 'string' && /^847-/.test(o.naam)) uit.push(o.naam);
  for (const v of Object.values(o)) beelNamenVan(v, uit);
  return uit;
};
const alleBeelden = [];
const resultaat = {
  build: {
    modules: {
      cockpitlayout: !!CL, carinterior: !!CI2, autointerieur: !!AI2, bootinterieur: !!BO, bootinterieur3d: !!BO3,
      vrachtruimte: !!VR, vrachtruimte3d: !!VR3, treininterieur: !!TI, cabin3d: !!C3, businterieur3d: !!BI,
      firstperson: !!FP, railway3d: !!R3, activityhub: !!AH,
    },
    cabinLod: C3 ? { CABIN_LOD_R: C3.CABIN_LOD_R || null, cabinLodAt: typeof C3.cabinLodAt === 'function' } : null,
    busLod: BI ? { BUS_LOD_R: BI.BUS_LOD_R || null, busLodAt: typeof BI.busLodAt === 'function' } : null,
    bootLod: drempelInfo(BO3),
    vrachtLod: drempelInfo(VR3),
    treinLod: drempelInfo(TI) || drempelInfo(R3),
    newKinds: { boot: !!(BO3 && BO3.bootInterieurKind), vracht: !!(VR3 && VR3.vrachtruimteKind) },
  },
  instellingen: (() => { try { const st = ST.getSettings(); return { quality: st.quality, drawDistance: st.drawDistance, shadows: st.shadows, autoResolution: st.autoResolution, firstPersoon: st.firstPersoon }; } catch (e) { return { fout: (e && e.message) || String(e) }; } })(),
  stappen: {},
};
// Als de Lead de nieuwe wereld-ticks (nog) niet in main.js heeft geregistreerd, draaien we ze hier
// zelf, zodat de beelden het interieur toch tonen. Is de kind wél geregistreerd, dan doen we niets
// (geen dubbele tick).
const eigenKinds = [];
if (AH && typeof AH.activityKinds === 'function') {
  for (const kind of [(BO3 && BO3.bootInterieurKind), (VR3 && VR3.vrachtruimteKind)]) {
    if (!kind || !kind.tick) continue;
    let bekend = false;
    try { bekend = AH.activityKinds().includes(kind.id); } catch (e) { bekend = false; }
    if (!bekend) eigenKinds.push(kind);
  }
}
if (eigenKinds.length) {
  let laatste = performance.now();
  const eigenTick = () => {
    const nu = performance.now();
    const dt = Math.min(0.05, (nu - laatste) / 1000);
    laatste = nu;
    for (const kind of eigenKinds) { try { kind.tick(dt, w); } catch (e) { note(kind.id + '-tick: ' + ((e && e.message) || e)); } }
    if (!done) requestAnimationFrame(eigenTick);
  };
  requestAnimationFrame(eigenTick);
}
const draai = async (id, fn) => {
  const i0 = issues.length;
  const t0 = performance.now();
  try {
    const r = await fn();
    const namen = beelNamenVan(r);
    for (const n of namen) if (!alleBeelden.includes(n)) alleBeelden.push(n);
    resultaat.stappen[id] = { duurS: +((performance.now() - t0) / 1000).toFixed(1), ...r, beelden: namen, meldingen: issues.slice(i0).map((x) => x.m) };
  } catch (e) {
    resultaat.stappen[id] = { fout: String((e && e.stack) || e).slice(0, 700), meldingen: issues.slice(i0).map((x) => x.m) };
  }
  console.log('[i847-check] ' + id + ' ' + JSON.stringify(resultaat.stappen[id]).slice(0, 1800));
};

await leaveStart();
if (stapAan('trekker')) await draai('trekker', stapTrekker);
if (stapAan('heli')) await draai('heli', stapHeli);
if (stapAan('vliegtuig')) await draai('vliegtuig', stapVliegtuig);
if (stapAan('machines')) await draai('machines', stapMachines);
if (stapAan('wrak')) await draai('wrak', stapWrak);
if (stapAan('vracht')) await draai('vracht', stapVracht);
if (stapAan('bus')) await draai('bus', stapBus);
if (stapAan('trein')) await draai('trein', stapTrein);
// boten lopen ook als alleen losse bootsoorten zijn gevraagd (--only=boot-zeeschip)
const botenAan = stapAan('boten') || ONLY.some((x) => x.startsWith('boot-'));
if (botenAan) await draai('boten', stapBoten);
if (stapAan('prestatie')) await draai('prestatie', stapPrestatie);

// opruimen: eerste persoon uit, geen testvoertuigen in de wereld, teller terug
try { if (fpOn()) fpSet(false); } catch (e) { note('fp uit: ' + (e && e.message)); }
if (p.inVehicle) p.exitVehicle(map, w);
for (const v of [...keepStill]) releaseVehicle(v);
done = true; hold = null; driving = false;
clearInterval(skipper); clearInterval(keepInterval);
if (sc.renderer.__i847OrigRender) { sc.renderer.render = sc.renderer.__i847OrigRender; delete sc.renderer.__i847OrigRender; }
console.error = origErr; console.warn = origWarn;
resultaat.meldingen = issues;
resultaat.beelden = [...new Set([...CAPTURED, ...alleBeelden])];
return JSON.stringify({ stappen: resultaat.stappen, build: resultaat.build, instellingen: resultaat.instellingen, meldingen: issues, beelden: resultaat.beelden });

