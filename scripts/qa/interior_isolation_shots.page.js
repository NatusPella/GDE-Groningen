// Pagina-helft van scripts/qa/interior_isolation_shots.mjs (binnenruimte-isolatie, 22-11): beelden en metingen binnen een paar
// gebouwen (winkel, café, kantoor, woning...), in de loketset en in de flat. Per ruimte twee beelden: met de snede aan en met hem
// uit, met een rood proefblok (een wereldmateriaal met applyInteriorCut) midden in de ruimte: aan moet het blok weg zijn.
// window.__iso = { settle } staat ervoor. Beelden via console.log('[capture] <naam>'); niets schrijft naar echte opslag.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const D = window.__debug;
const w = D.world;
const p = w.player;
const map = w.map;
const sc = window.__scene3d;
const SETTLE = (window.__iso && window.__iso.settle) || 3500;
const imp = (f) => import('/js/' + f + '.js');
const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
window.addEventListener('error', (e) => note('error: ' + e.message));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };

const PM = await imp('pausemenu');
const DN = await imp('daynight');
const ST = await imp('settings');
const GP = await imp('gfxprofile');
const INT = await imp('interiors');
const CUT = await imp('interiorcut3d');
const VOL = await imp('interiorvolume');
const ISO = await imp('interiorisolation');
const SS = await imp('stagesets');
const HM = await imp('home');
const FAC = await imp('facilities');
const THREE = sc.THREE;

try { const pr = GP.GFX_PRESETS && GP.GFX_PRESETS.hoog; if (pr) for (const [k, v] of Object.entries(pr)) ST.setSetting(k, v); ST.setSetting('autoResolution', false); } catch (e) { note('gfx: ' + e.message); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const CAPTURED = [];
const capture = async (name, wait = 900) => { await sleep(wait); fixWorld(); CAPTURED.push(name); console.log('[capture] ' + name); await sleep(500); };
let hold = null, done = false;
const tick = () => {
  if (hold && !PM.isPauseMenuOpen()) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; if (hold.a !== undefined) { p.angle = hold.a; w.camYaw = hold.a; } }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const teleport = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(x, y); };

// het proefblok: een wereldmateriaal dat de snede kent (zoals meubilair, bomen en stadsprops)
const blokMat = CUT.applyInteriorCut(new THREE.MeshStandardMaterial({ color: 0xff2020, roughness: 0.6 }));
const bokken = [];
const zetBlok = (x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), blokMat);
  m.position.set(x, z + 1.1, y);
  m.name = 'isolatie-proefblok';
  sc.scene.add(m); bokken.push(m);
};
const ruimBlokken = () => { for (const m of bokken) { sc.scene.remove(m); m.geometry.dispose(); } bokken.length = 0; };
const snede = (aan) => { CUT.CUT_UNIFORMS.uIntN.value = aan ? Math.min(VOL.interiorVolumes().length, 6) : 0; };

const resultaat = { ruimten: [], vol: null };
const volStand = () => VOL.interiorVolumes().map((v) => ({ id: v.id, z0: +v.z0.toFixed(2), z1: +v.z1.toFixed(2), hu: v.rect ? +v.rect.hu.toFixed(2) : null, hv: v.rect ? +v.rect.hv.toFixed(2) : null }));

// ---- gewone panden: de eerste vier verschillende soorten binnen een straal rond de Grote Markt ----
const GM = { x: 200.8, y: 45.4 };
teleport(GM.x, GM.y); hold = { x: GM.x, y: GM.y, a: 0 };
await sleep(SETTLE);
const gezien = new Set();
const kandidaten = [];
for (const b of map.buildingsNear(GM.x, GM.y, 260)) { if (b.entrance) kandidaten.push(b); }
const wil = ['winkel', 'horeca', 'kantoor', 'woning'];
for (const b of kandidaten) {
  if (gezien.size >= wil.length) break;
  let sp = null;
  try { sp = INT.binnenplekInPand(w, b); } catch (e) { note('binnenplek: ' + e.message); }
  if (!sp) continue;
  const plan = INT.livePlanOf(b);
  if (!plan || gezien.has(plan.kind)) { continue; }
  gezien.add(plan.kind);
  const naam = plan.kind + (plan.sub ? '-' + plan.sub : '');
  p.x = sp.x; p.y = sp.y; p.gz = gh(sp.x, sp.y); p.vx = p.vy = 0;
  if (sp.angle !== undefined) { p.angle = sp.angle; w.camYaw = sp.angle; }
  hold = { x: sp.x, y: sp.y, a: p.angle };
  await sleep(SETTLE);
  const f = plan.frame, H = plan.hall;
  const midU = (H.u0 + H.u1) / 2, midV = (H.v0 + H.v1) / 2;
  const mx = f.ox + f.tx * midU - f.nx * midV, my = f.oy + f.ty * midU - f.ny * midV;
  const grond = gh(f.ox, f.oy);
  zetBlok(mx, my, grond);
  // vlak naast de speler een tweede blok, zodat hij er zeker in beeld staat
  zetBlok(sp.x + Math.cos(p.angle) * 2.2, sp.y + Math.sin(p.angle) * 2.2, grond);
  snede(true);
  await capture(`binnen-${naam}-snede-aan`);
  snede(false);
  await capture(`binnen-${naam}-snede-uit`);
  snede(true);
  ruimBlokken();
  resultaat.ruimten.push({ naam, volumes: volStand(), binnen: !!INT.insideInterior(), uIntN: CUT.CUT_UNIFORMS.uIntN.value });
}

// ---- de loketset (binnenset in de open wereld) ----
hold = null;
teleport(GM.x + 60, GM.y + 60); await sleep(SETTLE);
let set = null;
try { set = SS.buildStageSet(w, 'loket', { x: p.x, y: p.y, angle: 0 }); } catch (e) { note('loketset: ' + e.message); }
if (set) {
  hold = { x: p.x, y: p.y, a: 0 };
  const cam = SS.stageSetCamera(set);
  if (cam) w.cameraOverride = cam;
  const bx = set.layout.x + 2.5, by = set.layout.y + 0.5;
  zetBlok(bx, by, set.base || 0);
  snede(true); await capture('loketset-snede-aan', 1500);
  snede(false); await capture('loketset-snede-uit', 1500);
  snede(true);
  resultaat.ruimten.push({ naam: 'loketset', volumes: volStand(), uIntN: CUT.CUT_UNIFORMS.uIntN.value });
  ruimBlokken();
  w.cameraOverride = null;
  SS.disposeStageSet(set);
  await sleep(500);
  resultaat.naSet = volStand();
} else note('loketset niet gebouwd');

// ---- de flat in Paddepoel ----
hold = null;
try {
  const home = HM.getHome();
  if (home) {
    teleport(home.icon.x, home.icon.y); hold = { x: home.icon.x, y: home.icon.y, a: 0 };
    await sleep(SETTLE * 1.5);
    const was = w.input.wasPressed.bind(w.input), consume = w.input.consume ? w.input.consume.bind(w.input) : () => {};
    w.input.wasPressed = (k) => k === 'e';
    let ok = false;
    try { ok = HM.tryHomeInteract(w); } catch (e) { note('flat: ' + e.message); }
    w.input.wasPressed = was; w.input.consume = consume;
    await sleep(SETTLE);
    resultaat.flat = { interact: ok, binnen: HM.inHomeFlat() };
    hold = null;
    await capture('flat-binnen', 1500);
  } else note('geen home');
} catch (e) { note('flat: ' + e.message); }

done = true; hold = null;
console.error = origErr;
resultaat.meldingen = issues;
resultaat.beelden = CAPTURED;
return JSON.stringify(resultaat);
