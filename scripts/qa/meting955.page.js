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
    if (!t) { out.stand.m07.weg = s; break; }
    p.x = t.x - 60; p.y = t.y; p.vx = p.vy = 0; // blijf achter hem staan, buiten bereik
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

clearInterval(skipper); clearInterval(clockTik);
console.log(`[meting955] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
