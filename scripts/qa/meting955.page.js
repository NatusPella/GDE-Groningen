// Page half of scripts/qa/meting955.mjs (desktop --perf-script body): metingen voor #955.
// M07 (de vluchtende tankwagen zonder speler in de buurt), M09 (instappen bij de deur van Geesjes trekker met scooters erbij)
// en M15 (E-afstand tot het vliegtuig, NaN-scan van de scene). Raakt geen opslag. window.__m955 = { settle, only, m07s }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__m955 || {};
const SETTLE = CFG.settle || 9000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d'); const getScene = SC.getScene;
const M = await imp('missions');
let skipAan = true;
const skipper = setInterval(() => { if (skipAan && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = (uur = 14) => {
  w.clock = uur;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let uur = 14;
fix(uur);
const clockTik = setInterval(() => { w.clock = uur; }, 200);
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
// E vasthouden (de korte handelingen van M06): de pagina zet window.__e
const origDown = w.input.isDown.bind(w.input);
w.input.isDown = (k) => (k === 'e' && window.__e) || origDown(k);
const fps = (ms = 1800) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const out = { fps: {}, fouten: [], beelden: [], stand: {} };
const grab = async (naam) => {
  const f = await fps(1200);
  out.fps[naam] = f;
  console.log('[fps] ' + naam + ' ' + f);
  console.log('[capture] ' + naam);
  out.beelden.push(naam);
  await sleep(500);
};
const wacht = async (fn, maxMs, stap = 100) => { for (let t = 0; t < maxMs; t += stap) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(stap); } return false; };
const zet = async (x, y, angle, ms) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; if (Number.isFinite(angle)) p.angle = angle;
  await sleep(ms || SETTLE);
  let n = 0; while (SC.streamPending().roads > 0 && n++ < 60) await sleep(500);
};
const idxVan = (label) => M.getMissionDefs().findIndex((d) => d.label === label);
const stop = async () => { try { if (M.isMissionActive()) M.cancelActiveMission(w); } catch (e) { /* weg */ } await sleep(800); };
const sectie = async (naam, fn) => {
  if (ONLY && !ONLY.includes(naam)) return;
  try { await fn(); } catch (e) { out.fouten.push(naam + ': ' + (e && e.message || e)); console.log('[fout] ' + naam + ' ' + (e && e.message || e)); }
  await stop();
};
await sleep(2500);
const V = await imp('vehicle');
const RP = await imp('rideprops');
const DR = await imp('vehicledoors');
const BR = await imp('breakables');
const r1 = (n) => Math.round(n * 10) / 10;
const tap = async (k, code) => { tapKey(k, code); await sleep(500); };
const hudPrompt = () => { const el = document.querySelector('.hud-prompts'); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; };

// ---- M07: de vluchtende tankwagen, zonder dat de speler hem raakt -----------------------------------------------
await sectie('m07', async () => {
  const idx = idxVan('Al het vet van Grunn');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, SETTLE + 3000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M07 startte niet');
  await sleep(3000);
  let g = 0; while (M.missionDebug.state().stage < 1 && g++ < 6) { M.missionDebug.complete(w); await sleep(1500); }
  const tr = () => w.vehicles.find((v) => v.chaseTarget);
  await wacht(tr, 15000);
  const t0 = tr();
  if (!t0) throw new Error('geen tankwagen');
  out.stand.m07 = { stage: M.missionDebug.state().stage, start: [r1(t0.x), r1(t0.y)], hl: t0.halfLen, hw: t0.halfWid, spoor: [] };
  // de speler staat op 45 m: dichtbij genoeg om hem te laten vluchten, te ver om hem te raken
  await zet(t0.x - 45, t0.y, 0, 2500);
  let stil = 0, laatst = null;
  for (let s = 0; s < (CFG.m07s || 170); s++) {
    const t = tr();
    if (!t) {
      out.stand.m07.weg = s;
      await sleep(800);
      const sw = M.missionDebug.state();
      out.stand.m07.naWeg = { stage: sw && sw.stage, phase: sw && sw.phase, melding: (document.querySelector('.hud-toast, .hud-msg, #hud-messages') || {}).innerText };
      await grab('m07-gestopt');
      break;
    }
    p.x = t.x - 60; p.y = t.y; p.vx = p.vy = 0; // blijf achter hem staan, buiten bereik
    if (CFG.m07vast && s === 15) { t.road = null; t.speed = 0; out.stand.m07.geforceerdOp = [s, r1(t.x), r1(t.y)]; } // de nagebootste vastloper: de AI laat hem los
    const rij = [s, r1(t.x), r1(t.y), r1(t.speed), Math.round(t.health), r1(t.stuckFor || 0), t.road ? 1 : 0];
    out.stand.m07.spoor.push(rij);
    if (Math.abs(t.speed) < 0.5 && t.road) stil++; else stil = 0;
    if (stil === 12) {
      out.stand.m07.vast = rij;
      const gebouwen = map.buildingsNear(t.x, t.y, 14).map((b) => ({ d: r1(Math.min(...b.pts.map((q) => Math.hypot(q[0] - t.x, q[1] - t.y)))), n: b.pts.length, h: b.h })).sort((a, b) => a.d - b.d).slice(0, 4);
      out.stand.m07.diag = { angle: r1(t.angle), road: t.road && (t.road.id ?? t.road.name ?? 'weg'), oneway: t.road && t.road.oneway, seg: t.segIdx, dir: t.dir, plan: t.plan && t.plan.length, goal: t.aiOpts && t.aiOpts.goal, backOffAt: t.backOffAt, reverseAt: t.reverseAt, wt: r1(w.time), gebouwen };
      await grab('m07-vast');
    }
    const st = M.missionDebug.state();
    if (!st || st.phase !== 'active') { out.stand.m07.eind = st && st.phase; break; }
    if (st.stage >= 2) { out.stand.m07.gestopt = [s, st.stage, r1(t.x), r1(t.y), (w.messages || []).slice(-2).map((q) => q.text || q)]; await grab('m07-gestopt'); break; }
    laatst = rij;
    await sleep(1000);
  }
  out.stand.m07.laatst = laatst;
});

// ---- M09: instappen bij Geesjes trekker met een geparkeerde scooter in de buurt --------------------------------
await sectie('m09', async () => {
  const idx = idxVan('Heel aankomen is ook een kunst');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, SETTLE + 8000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M09 startte niet');
  await sleep(4000);
  const veh = w.vehicles.find((v) => v.missionCar && !v.isPlane);
  if (!veh) throw new Error('geen missievoertuig');
  const props = BR.propsInRadius(veh.x, veh.y, 14, ['bike', 'scooter']).map((q) => ({ kind: q.kind, x: r1(q.x), y: r1(q.y), d: r1(Math.hypot(q.x - veh.x, q.y - veh.y)) }));
  const ander = w.vehicles.filter((v) => v !== veh && Math.hypot(v.x - veh.x, v.y - veh.y) < 14).map((v) => ({ kind: v.isScooter ? 'scooter' : v.isBike ? 'fiets' : 'auto', x: r1(v.x), y: r1(v.y) }));
  const m = { stage: M.missionDebug.state().stage, veh: { x: r1(veh.x), y: r1(veh.y), a: r1(veh.angle), hl: veh.halfLen, hw: veh.halfWid, naam: veh.name, model: veh.model && veh.model.name, driver: veh.driver }, props, ander, deuren: [] };
  out.stand.m09 = m;
  const stoelen = [{ role: 'bestuurder', z: -1 }, { role: 'bijrijder', z: 1 }];
  const c = Math.cos(veh.angle), s = Math.sin(veh.angle);
  for (const st of stoelen) {
    const d = DR.deurVoorStoel(veh, st);
    if (!d) { m.deuren.push({ rol: st.role, geen: true }); continue; }
    const x = veh.x + c * d.x - s * d.z, y = veh.y + s * d.x + c * d.z;
    await zet(x, y, Math.atan2(veh.y - y, veh.x - x), 1500);
    await sleep(700);
    const pr = RP.findRideableProp(x, y);
    const fev = V.findEnterableVehicle(x, y, w.vehicles);
    const rec = { rol: st.role, spot: [r1(x), r1(y)], body: r1(V.distToVehicleBody(veh, x, y)), bijDeur: DR.bijInstapdeur(veh, x, y), prop: pr && { kind: pr.prop.kind, d: r1(pr.dist) }, vindt: fev === veh ? 'trekker' : fev ? 'ander' : null, prompt: hudPrompt() };
    await grab('m09-deur-' + st.role);
    await tap('e', 'KeyE'); await sleep(900);
    rec.binnen = p.inVehicle === veh;
    rec.inAnder = !!p.inVehicle && p.inVehicle !== veh;
    m.deuren.push(rec);
    if (p.inVehicle) p.exitVehicle(map, w);
    await sleep(600);
  }
  // zoals de bot: net naast het midden van de romp, niet bij een deur
  const kant = { x: veh.x - s * (veh.halfWid + 0.6), y: veh.y + c * (veh.halfWid + 0.6) };
  await zet(kant.x, kant.y, 0, 1500);
  m.midden = { body: r1(V.distToVehicleBody(veh, kant.x, kant.y)), bijDeur: DR.bijInstapdeur(veh, kant.x, kant.y), prompt: hudPrompt() };
  await tap('e', 'KeyE'); await sleep(900);
  m.midden.binnen = p.inVehicle === veh;
  m.midden.bericht = (w.messages || []).slice(-2).map((q) => q.text || q);
});

// ---- M15: het vliegtuig bereiken en de NaN-waarschuwing opsporen ------------------------------------------------
await sectie('m15', async () => {
  const idx = idxVan('Laag over het graan');
  const def = M.getMissionDefs()[idx];
  const sp = def.stages[0].strip;
  await zet(def.start.x, def.start.y, sp.heading, SETTLE + 4000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M15 startte niet');
  await sleep(3500);
  const vl = w.vehicles.find((v) => v.isPlane && v.missionCar);
  const m = { stage: M.missionDebug.state().stage, plane: vl && { x: r1(vl.x), y: r1(vl.y), hl: vl.halfLen, hw: vl.halfWid }, speler: [r1(p.x), r1(p.y)], proef: [] };
  out.stand.m15 = m;
  if (!vl) throw new Error('geen vliegtuig');
  const nan = [];
  getScene().traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    let bad = false; const a = pos.array; const stap = Math.max(1, Math.floor(a.length / 6000));
    for (let i = 0; i < a.length; i += stap) if (!Number.isFinite(a[i])) { bad = true; break; }
    if (bad) nan.push({ naam: o.name || o.type, ouder: o.parent && (o.parent.name || o.parent.type), verts: pos.count, pos: [o.position.x, o.position.y, o.position.z].map(r1) });
  });
  m.nan = nan;
  m.vl = { driver: vl.driver, disabled: vl.disabled, wrecked: vl.wrecked, parked: vl.parked, sinking: !!vl.sinking, z: vl.z, gz: vl.groundZ, angle: r1(vl.angle), kan: V.canEnterVehicle(vl) };
  for (const afstand of [15, 10, 8, 6.5, 5, 3]) {
    if (p.inVehicle) p.exitVehicle(map, w);
    const x = vl.x - Math.cos(vl.angle) * afstand, y = vl.y - Math.sin(vl.angle) * afstand;
    await zet(x, y, vl.angle, 1200);
    await tap('e', 'KeyE'); await sleep(900);
    const fev = V.findEnterableVehicle(p.x, p.y, w.vehicles);
    if (afstand === 5) await grab('m15-afstand-5');
    m.proef.push({ afstand, binnen: p.inVehicle === vl, body: r1(V.distToVehicleBody(vl, p.x, p.y)), vindt: fev === vl ? 'vliegtuig' : fev ? 'ander' : null, pz: [r1(p.z), r1(p.gz || 0), r1(vl.z || 0)], prompt: hudPrompt(), talk: !!document.querySelector('#story-talk:not(.hidden)'), cine: cine.isCinematicActive(), mis: M.missionDebug.state() && M.missionDebug.state().stage });
  }
});

// ---- M09 intro: staan er twee trekkers (de echte missietrekker en het trekkerprop van het filmpje)? -------------
await sectie('m09intro', async () => {
  const idx = idxVan('Heel aankomen is ook een kunst');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, SETTLE + 8000);
  skipAan = false;
  // zoals de proefspeler en het F9-paneel: via de verhaalsprong, zodat de gescripte intro met het trekkerprop speelt
  if (!window.__story.jump('M09')) throw new Error('M09-sprong mislukt');
  await sleep(1500);
  if (!M.isMissionActive() && !M.missionDebug.start(w, idx)) throw new Error('M09 startte niet');
  const lijst = () => w.vehicles.filter((v) => Math.hypot(v.x - p.x, v.y - p.y) < 40).map((v) => ({ naam: v.name || '', model: v.model && v.model.name, missie: !!v.missionCar, x: r1(v.x), y: r1(v.y), d: r1(Math.hypot(v.x - p.x, v.y - p.y)), zichtbaar: v.mesh ? v.mesh.visible : null }));
  const m = { tijdlijn: [] };
  out.stand.m09intro = m;
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    // het echte missievoertuig (mesh zichtbaar?) en de props van de scène (cutscript-groep)
    const meshes = [];
    for (const v of w.vehicles) if (v.missionCar) { const mm = SC.getVehicleMesh(v.id); meshes.push({ echt: v.model && v.model.name, driver: v.driver, wr: !!v.wrecked, sk: !!v.sinking, af: Math.round(Math.hypot(v.x - p.x, v.y - p.y)), x: r1(v.x), y: r1(v.y), zichtbaar: mm ? mm.visible : null, hide: !!v.hideInScene }); }
    getScene().traverse((o) => { if (/cutscript/i.test(o.name || '')) { const ks = o.children.map((c) => ({ t: c.type, n: c.children.length, v: c.visible, x: r1(c.position.x), y: r1(c.position.z) })); meshes.push({ groep: o.name, vis: o.visible, ks: ks.slice(0, 14) }); } });
    m.tijdlijn.push({ t: i + 1, cine: cine.isCinematicActive(), speler: [r1(p.x), r1(p.y)], voertuigen: lijst(), meshes: meshes.slice(0, 20) });
    if ([0, 1, 3, 4, 6, 8, 10].includes(i)) await grab('m09intro-t' + (i + 1));
  }
  skipAan = true;
});

// ---- M19 perron: staan de reizigers van de aankleding naast het spoor, of erop? ---------------------------------
await sectie('m19perron', async () => {
  const idx = idxVan('Stoom');
  const def = M.getMissionDefs()[idx];
  const RW = await imp('railway');
  await zet(def.start.x, def.start.y, 0, SETTLE + 8000);
  skipAan = false;
  if (!window.__story.jump('M19')) throw new Error('M19-sprong mislukt');
  await sleep(1500);
  if (!M.isMissionActive() && !M.missionDebug.start(w, idx)) throw new Error('M19 startte niet');
  for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(400); }
  await sleep(3000);
  const afstandTotSpoor = (x, y) => { let best = { d: Infinity, naam: '', hoek: 0 }; for (const r of RW.getRoutes()) { const pts = r.pts; for (let i = 1; i < pts.length; i++) { const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay; const L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); const d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (d < best.d) best = { d, naam: r.name, hoek: Math.atan2(dy, dx) }; } } return best; };
  const m = { speler: [r1(p.x), r1(p.y)], hoekSpeler: r1(p.angle), mensen: [], kinderen: [] };
  out.stand.m19perron = m;
  let groep = null;
  for (let i = 0; i < 20 && !groep; i++) { getScene().traverse((o) => { if (o.name === 'mission-dressing-perron') groep = o; }); if (!groep) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(1000); } }
  if (!groep) { const st = M.activeStage(); throw new Error('geen perron-aankleding in de scene; stand ' + JSON.stringify(M.missionDebug.state()) + ' stap ' + (st && (st.kind + ' ' + st.label + ' ' + st.dressing))); }
  groep.updateMatrixWorld(true);
  const wp = new (groep.position.constructor)();
  for (const c of groep.children) { c.getWorldPosition(wp); const sp = afstandTotSpoor(wp.x, wp.z); m.kinderen.push({ n: c.name || c.type, k: c.children.length, x: r1(wp.x), y: r1(wp.z), spoor: r1(sp.d) }); }
  m.dichtstbij = Math.min(...m.kinderen.map((q) => q.spoor));
  m.opHetSpoor = m.kinderen.filter((q) => q.spoor < 2.2).length;
  const sp0 = afstandTotSpoor(p.x, p.y);
  m.spelerSpoor = { d: r1(sp0.d), naam: sp0.naam, hoek: r1(sp0.hoek) };
  // de trein: waar staat hij
  m.treinen = RW.getTrains().filter((t) => t.state === 'mission' || (t.c !== undefined && Math.hypot((t.x || 0) - p.x, (t.y || 0) - p.y) < 200)).slice(0, 4).map((t) => ({ state: t.state, route: t.route && t.route.name, c: r1(t.c || 0) }));
  // de speler staat 15 m van het midden, kijkend naar het perron, op vrije grond (geen gebouw, niet op het spoor)
  const mid = m.kinderen.filter((q) => q.k > 0 && q.spoor < 900).reduce((t, q, i, l) => ({ x: t.x + q.x / l.length, y: t.y + q.y / l.length }), { x: 0, y: 0 });
  m.midden = { x: r1(mid.x), y: r1(mid.y) };
  const PG = await imp('pedgeom');
  const kijk = async (naam, hoeken, afstand) => {
    for (const h of hoeken) {
      const x = mid.x + Math.cos(h) * afstand, y = mid.y + Math.sin(h) * afstand;
      if (PG.isInsideBuilding(map, x, y) || afstandTotSpoor(x, y).d < 3) continue;
      await zet(x, y, Math.atan2(mid.y - y, mid.x - x), 2500);
      await grab(naam + '-' + Math.round(h * 100));
      return h;
    }
    return null;
  };
  const hs = [sp0.hoek + Math.PI / 2, sp0.hoek - Math.PI / 2, sp0.hoek + Math.PI, sp0.hoek];
  m.kijk = [await kijk('m19perron', hs, 15), await kijk('m19perron-ver', hs, 26)];
  skipAan = true;
});

// ---- M26 plein: staan de jurytafel, kramen en het publiek op het plein, of in een gebouw? ----------------------------
await sectie('m26plein', async () => {
  const idx = idxVan('Ontzet, net als in 1672');
  const def = M.getMissionDefs()[idx];
  const PG = await imp('pedgeom');
  await zet(def.start.x, def.start.y, 0, SETTLE + 8000);
  skipAan = false;
  if (!window.__story.jump('M26')) throw new Error('M26-sprong mislukt');
  await sleep(1500);
  if (!M.isMissionActive() && !M.missionDebug.start(w, idx)) throw new Error('M26 startte niet');
  const m = { staptijd: [] };
  out.stand.m26plein = m;
  let groep = null;
  const vind = () => { groep = null; getScene().traverse((o) => { if (o.name === 'mission-dressing-plein') groep = o; }); return groep; };
  for (let i = 0; i < 14 && !vind(); i++) {
    for (let j = 0; j < 30 && cine.isCinematicActive(); j++) { cine.skipCinematic(); await sleep(400); }
    const st = M.activeStage();
    m.staptijd.push({ i, kind: st && st.kind, label: st && st.label, dressing: st && st.dressing });
    if (st && st.dressing === 'plein') { await sleep(1500); if (vind()) break; }
    M.missionDebug.complete(w); await sleep(1800);
  }
  for (let j = 0; j < 30 && cine.isCinematicActive(); j++) { cine.skipCinematic(); await sleep(400); }
  await sleep(2500);
  if (!vind()) throw new Error('geen plein-aankleding in de scene');
  groep.updateMatrixWorld(true);
  const wp = new (groep.position.constructor)();
  m.speler = [r1(p.x), r1(p.y)];
  m.kinderen = [];
  for (const c of groep.children) { c.getWorldPosition(wp); m.kinderen.push({ n: c.name || c.type, k: c.children.length, x: r1(wp.x), y: r1(wp.z), inGebouw: PG.isInsideBuilding(map, wp.x, wp.z) }); }
  const vast = m.kinderen.filter((q) => q.k > 0 || q.n);
  m.inGebouw = m.kinderen.filter((q) => q.inGebouw).length;
  const mid = m.kinderen.filter((q) => q.k > 0 && Math.abs(q.x) > 1).reduce((t, q, i, l) => ({ x: t.x + q.x / l.length, y: t.y + q.y / l.length }), { x: 0, y: 0 });
  m.midden = { x: r1(mid.x), y: r1(mid.y) };
  const kijk = async (naam, afstand) => {
    for (let k = 0; k < 8; k++) {
      const h = k * Math.PI / 4;
      const x = mid.x + Math.cos(h) * afstand, y = mid.y + Math.sin(h) * afstand;
      if (PG.isInsideBuilding(map, x, y)) continue;
      await zet(x, y, Math.atan2(mid.y - y, mid.x - x), 2500);
      await grab(naam + '-' + k);
      return k;
    }
    return null;
  };
  m.kijk = [await kijk('m26plein', 16), await kijk('m26plein-ver', 30)];
  skipAan = true;
});

// ---- M19 instappen: kan een mens de museumtrein in (E bij de kop), en wat doet de kaartautomaat? ---------------------
await sectie('m19board', async () => {
  const idx = idxVan('Stoom');
  const def = M.getMissionDefs()[idx];
  const RW = await imp('railway');
  await zet(def.start.x, def.start.y, 0, SETTLE + 8000);
  skipAan = false;
  if (!window.__story.jump('M19')) throw new Error('M19-sprong mislukt');
  await sleep(1500);
  if (!M.isMissionActive() && !M.missionDebug.start(w, idx)) throw new Error('M19 startte niet');
  for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(400); }
  for (let i = 0; i < 30 && !(M.missionDebug.state() && M.missionDebug.state().stage >= 1); i++) { M.missionDebug.complete(w); await sleep(1500); }
  await sleep(2500);
  const m = { stand: M.missionDebug.state(), pogingen: [], tijd: [] };
  out.stand.m19board = m;
  const trein = RW.getTrains().find((t) => t.state === 'mission' || t.state === 'parked');
  if (!trein) throw new Error('geen museumtrein in de wereld');
  const kop = (t) => { const e = []; for (const end of [1, -1]) e.push({ end, p: RW.routePoint(t.route, t.c + end * (t.halfLen - 3)) }); return e; };
  m.trein = { state: trein.state, type: trein.type, route: trein.route && trein.route.name, c: r1(trein.c), kop: kop(trein).map((q) => ({ end: q.end, x: r1(q.p[0]), y: r1(q.p[1]) })) };
  // naast de kop staan, zoals een mens, en E drukken
  for (const q of kop(trein)) {
    for (const afstand of [1.5, 3.5]) {
      if (p.inVehicle) p.exitVehicle(map, w);
      if (w.trainDriving) { try { (await imp('traindrive')).quitTrainDrive(w); } catch (e) { /* weg */ } }
      await zet(q.p[0] + afstand, q.p[1] + 1, 0, 1500);
      const pr = hudPrompt();
      await tap('e', 'KeyE'); await sleep(1200);
      m.pogingen.push({ kop: q.end, afstand, spot: [r1(q.p[0] + afstand), r1(q.p[1] + 1)], prompt: pr, binnen: !!w.trainDriving, bericht: (w.messages || []).slice(-2).map((x) => x.text || x) });
      if (w.trainDriving) break;
    }
    if (w.trainDriving) break;
  }
  m.binnen = !!w.trainDriving;
  await grab('m19board-na-e');
  // de speler zelf op de plek van het doel, een halve minuut: blijft hij leven (de proefspeler stierf daar twee keer)?
  if (w.trainDriving) { try { (await imp('traindrive')).quitTrainDrive(w); } catch (e) { /* weg */ } }
  const tg = M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target;
  await zet(tg ? tg.x : p.x, tg ? tg.y : p.y, 0, 1500);
  for (let i = 0; i < 30; i++) { await sleep(1000); const tr = RW.getTrains().filter((t) => Math.hypot((t.cars && t.cars[0] ? t.cars[0].x : 0) - p.x, (t.cars && t.cars[0] ? t.cars[0].y : 0) - p.y) < 150).map((t) => ({ s: t.state, v: r1(t.v || 0) })); m.tijd.push({ t: i, hp: Math.round(p.health), dood: p.state, treinen: tr.slice(0, 3) }); if (p.health <= 0) break; }
  skipAan = true;
});

clearInterval(skipper); clearInterval(clockTik);
console.log(`[meting955] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
