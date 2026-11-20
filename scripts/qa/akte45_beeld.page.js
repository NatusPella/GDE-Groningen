// Page half of scripts/qa/akte45_beeld.mjs (desktop --perf-script body): missies stap voor stap in beeld (akte 4 t/m 6, bijbanen).
// Per stap met een doel: de speler (of zijn voertuig) wordt een stuk voor het doel gezet, kijkend naar het doel, en dan volgt een beeld.
// Dressing- en wachtgroepen in de scene worden gelogd. Raakt geen opslag. window.__ak = { settle, only, missies:[{id,label,uur,afstand,hoek,hoek2,max}] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__ak || {};
const SETTLE = CFG.settle || 9000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const UT = await imp('util');
const inWater = (x, y) => { try { return !!UT.isInWater(map, x, y); } catch (e) { return null; } };
const DN = await imp('daynight');
const SC = await imp('scene3d');
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
w.input.isDown = (k) => (k === 'e' && window.__e) || (window.__keys && window.__keys.has(k)) || origDown(k);
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
out.fps0 = await fps(2500);
console.log('[fps] start ' + out.fps0 + ' visibility=' + document.visibilityState);


const zv = async (x, y, a, ms) => { const v = p.inVehicle; if (v) { v.x = x; v.y = y; v.angle = a; v.speed = 0; v.vx = 0; v.vy = 0; } p.x = x; p.y = y; if (Number.isFinite(a)) p.angle = a; p.vx = p.vy = 0; if (!v) { try { p.z = w.map.groundHeightAt(x, y, 40) || 0; p.vz = 0; } catch (e) { /* weg */ } } await sleep(ms || SETTLE); let n = 0; while (SC.streamPending().roads > 0 && n++ < 60) await sleep(500); };
const gh0 = (x, y) => { try { return w.map.groundHeightAt(x, y, 40) || 0; } catch (e) { return 0; } };
const groepen = () => { const r = []; SC.getScene().traverse((o) => { if (o.name && /^(mission-dressing|wait-|wachtprop|mission-wait)/.test(o.name)) r.push(o.name + ':' + o.children.length); }); return r; };
await sleep(2500);
out.fps0 = await fps(2500);
const lijst = CFG.missies || [];
for (const m of lijst) {
  await sectie(m.id, async () => {
    uur = m.uur || 14; fix(uur);
    const idx = (m.raster || m.pg) ? 0 : idxVan(m.label);
    if (idx < 0) throw new Error('niet gevonden: ' + m.label);
    const def = M.getMissionDefs()[idx];
    if (m.raster) {
      // kaartje van water (W) en land (.) om een punt (4 m per vakje, noord boven); m.raster = { x, y, r }
      await zet(m.raster.x, m.raster.y, 0, SETTLE + 3000);
      const regels = []; const R = m.raster.r || 60;
      for (let yy = m.raster.y + R; yy >= m.raster.y - R; yy -= 4) { let r = ''; for (let xx = m.raster.x - R; xx <= m.raster.x + R; xx += 4) r += (Math.abs(xx - m.raster.x) < 2 && Math.abs(yy - m.raster.y) < 2) ? 'D' : inWater(xx, yy) ? 'W' : '.'; regels.push(r); }
      out.stand[m.id] = { raster: regels };
      return;
    }
    if (m.pg) { // een uitdaging van Na het verhaal (Elf Bruggenrace): start, race en finish
      const PG = window.__postgame; if (!PG) throw new Error('geen __postgame');
      PG.unlock(); await sleep(800);
      const spot = PG.spots().find((q) => q.id === m.pg);
      if (!spot) throw new Error('spot ontbreekt: ' + m.pg);
      out.stand[m.id] = { spot };
      await zet(spot.x, spot.y, 0, SETTLE + 3000);
      PG.unlock();
      if (!PG.start(m.pg)) throw new Error('startte niet');
      await sleep(2500); out.stand[m.id].start = PG.state();
      await grab(m.id + '-start');
      const pose = (ch, cd, chh) => { const bx = (p.inVehicle || p).x, by = (p.inVehicle || p).y; return { position: { x: bx + Math.cos(ch) * cd, y: by + Math.sin(ch) * cd, z: gh0(bx, by) + chh }, lookAt: { x: bx, y: by, z: gh0(bx, by) + 1 }, fov: 60, cut: true }; };
      let ci = 0;
      for (const [ch, cd, chh] of (m.cams || [[0.8, 16, 6], [3.9, 14, 5]])) {
        const ps = pose(ch, cd, chh); cine.startCameraTake('qa-vrij', () => ps, { letterbox: false, hideHud: false });
        await sleep(2000); await grab(m.id + '-start-c' + (++ci));
      }
      cine.stopCameraTake('qa-vrij');
      window.__keys = new Set(['w']);
      await sleep(9000); out.stand[m.id].race = PG.state(); out.stand[m.id].boot = { x: Math.round((p.inVehicle || p).x), y: Math.round((p.inVehicle || p).y), inBoot: !!p.inVehicle };
      await grab(m.id + '-race');
      window.__keys = new Set();
      PG.win(); await sleep(2500);
      await grab(m.id + '-finish');
      await sleep(3000);
      await grab(m.id + '-finish-2');
      return;
    }
    if (m.dest && def.dest) { // missies zonder stappen (M08: fatbikes): de aankomst met Oma Trijntje bekijken
      await zet(def.start.x, def.start.y, 0, SETTLE + 3000);
      if (!M.missionDebug.start(w, idx)) throw new Error(m.id + ' startte niet');
      await sleep(2500); await grab(m.id + '-start');
      const t = { x: def.dest.x, y: def.dest.y };
      out.stand[m.id] = { dest: [Math.round(t.x), Math.round(t.y)], water: inWater(t.x, t.y) };
      await zv(t.x - 14, t.y, 0, 5000);
      let ci = 0;
      for (const [ch, cd, chh] of (m.cams || [[0.8, 12, 4]])) {
        const pose = { position: { x: t.x + Math.cos(ch) * cd, y: t.y + Math.sin(ch) * cd, z: gh0(t.x, t.y) + chh }, lookAt: { x: t.x, y: t.y, z: gh0(t.x, t.y) + 1.5 }, fov: 60, cut: true };
        cine.startCameraTake('qa-vrij', () => pose, { letterbox: false, hideHud: false });
        await sleep(2500); await grab(m.id + '-dest-c' + (++ci));
      }
      cine.stopCameraTake('qa-vrij');
      return;
    }
    await zet(def.start.x - 4, def.start.y, 0, SETTLE + 3000);
    if (!M.missionDebug.start(w, idx)) throw new Error(m.id + ' startte niet');
    await sleep(3000);
    out.stand[m.id] = { stappen: [] };
    const maxS = m.max || 8; const afstand = m.afstand || 12;
    let prev = { x: def.start.x, y: def.start.y };
    for (let k = 0; k < maxS; k++) {
      const s = M.missionDebug.state(); if (!s || s.phase !== 'active') break;
      const sd = def.stages ? def.stages[s.stage] : null; if (!sd) break;
      let t = s.stageInfo && s.stageInfo.target;
      if (!t && sd.kind === 'board') { // het voertuig van de missie: het dichtstbijzijnde bij de speler
        const vs = (w.vehicles || []).filter((v) => v && Number.isFinite(v.x) && Math.hypot(v.x - p.x, v.y - p.y) < 80).sort((q, r) => Math.hypot(q.x - p.x, q.y - p.y) - Math.hypot(r.x - p.x, r.y - p.y));
        if (vs[0]) { t = { x: vs[0].x, y: vs[0].y }; sd.__vnaam = vs[0].name || vs[0].kind || ''; }
      }
      const rec = { vnaam: sd.__vnaam || null, stage: s.stage, kind: sd.kind, label: (sd.label || '').slice(0, 50), dressing: sd.dressing || null, set: sd.set || null, target: t || null, groepen: null };
      if (t && sd.kind !== 'scene' && sd.kind !== 'board') {
        // een holdstap: de speler staat op het doel; een goto: een stuk voor het doel, aan de kant waar hij vandaan komt
        const dx = prev.x - t.x, dy = prev.y - t.y, dl = Math.hypot(dx, dy);
        const af = sd.kind === 'hold' ? 0 : afstand;
        const sx = dl > 2 ? t.x + dx / dl * af : t.x + af, sy = dl > 2 ? t.y + dy / dl * af : t.y;
        await zv(sx, sy, Math.atan2(t.y - sy, t.x - sx), 4500);
        await sleep(1500);
      } else await sleep(2500);
      rec.groepen = groepen();
      { // staat de aankleding op het droge? (de wereldpositie van elk onderdeel tegen water en gebouw)
        let gr = null; SC.getScene().traverse((o) => { if (o.name && o.name.startsWith('mission-dressing')) gr = o; });
        if (gr) { const V = gr.position.constructor; let nat = 0, geb = 0; const natN = [];
          for (const c of gr.children) { const q = c.getWorldPosition(new V()); if (!(Math.abs(q.x) + Math.abs(q.z) > 0.01)) continue; if (inWater(q.x, q.z)) { nat++; natN.push(c.name || c.type); } try { if (w.map.buildingsNear(q.x, q.z, 0.3).some((b) => UT.pointInPolygon(q.x, q.z, b.pts))) geb++; } catch (e) { /* weg */ } }
          rec.dressingCheck = { delen: gr.children.length, inWater: nat, inGebouw: geb, natNamen: natN.slice(0, 8) }; }
      }
      if (t) { let n = 0; const r = sd.radius || 7; for (let q = 0; q < 8; q++) if (inWater(t.x + Math.cos(q * 0.785) * r * 0.7, t.y + Math.sin(q * 0.785) * r * 0.7)) n++; rec.water = { doel: inWater(t.x, t.y), ring: n + '/8' }; }
      out.stand[m.id].stappen.push(rec);
      await grab(m.id + '-s' + s.stage + '-' + sd.kind);
      // vrije camera (cine.startCameraTake) schuin van boven, op het doel gericht; alleen voor stappen met een doel
      if (t && sd.kind !== 'scene') {
        const cams = m.cams || [[0.8, 24, 10], [3.9, 18, 5]];
        let ci = 0;
        for (const [ch, cd, chh] of cams) {
          const pose = { position: { x: t.x + Math.cos(ch) * cd, y: t.y + Math.sin(ch) * cd, z: chh }, lookAt: { x: t.x, y: t.y, z: 1.5 }, fov: 60, cut: true };
          cine.startCameraTake('qa-vrij', () => pose, { letterbox: false, hideHud: false });
          await sleep(2500);
          await grab(m.id + '-s' + s.stage + '-' + sd.kind + '-c' + (++ci));
        }
        cine.stopCameraTake('qa-vrij');
      }
      if (sd.kind === 'board' && !p.inVehicle && t) { // instappen zoals een speler (E): het dichtstbijzijnde voertuig
        const v = (w.vehicles || []).filter((q) => q && Number.isFinite(q.x)).sort((q, r) => Math.hypot(q.x - t.x, q.y - t.y) - Math.hypot(r.x - t.x, r.y - t.y))[0];
        if (v) { try { p.enterVehicle(v, w); } catch (e) { out.fouten.push('enter: ' + e.message); } await sleep(2500); await grab(m.id + '-s' + s.stage + '-in-voertuig'); }
      }
      if (m.banner && s.stage === (m.bannerStage || 0)) { // spandoek: van voor (kant van het doel) en van achter
        let gr = null; SC.getScene().traverse((o) => { if (o.name && o.name.startsWith('mission-dressing')) gr = o; });
        if (gr) {
          const V = gr.position.constructor; const ws = gr.children.map((c) => { const q = c.getWorldPosition(new V()); return { q, d: Math.hypot(q.x - t.x, q.z - t.y), n: c.name || c.type }; });
          const b = ws.filter((c) => Math.abs(c.d - m.banner) < 2.5).sort((c1, c2) => Math.abs(c1.d - m.banner) - Math.abs(c2.d - m.banner))[0];
          out.stand[m.id].banner = b ? { x: Math.round(b.q.x), y: Math.round(b.q.z), d: +b.d.toFixed(1), n: b.n } : null;
          if (b) {
            const ux = (b.q.x - t.x) / b.d, uy = (b.q.z - t.y) / b.d;
            for (const [naam, sg] of [['voor', -1], ['achter', 1]]) {
              const pose = { position: { x: b.q.x + ux * sg * 11, y: b.q.z + uy * sg * 11, z: gh0(b.q.x, b.q.z) + 3 }, lookAt: { x: b.q.x, y: b.q.z, z: gh0(b.q.x, b.q.z) + 4 }, fov: 55, cut: true };
              cine.startCameraTake('qa-vrij', () => pose, { letterbox: false, hideHud: false });
              await sleep(2500); await grab(m.id + '-spandoek-' + naam);
            }
            cine.stopCameraTake('qa-vrij');
          }
        }
      }
      if (t) prev = { x: t.x, y: t.y };
      let g = 0; const huidig = s.stage;
      while (g++ < 5) { { const s1 = M.missionDebug.state(); if (!s1 || s1.phase !== 'active' || s1.stage !== huidig) break; } M.missionDebug.complete(w); await sleep(1800); const s2 = M.missionDebug.state(); if (!s2 || s2.phase !== 'active' || s2.stage !== huidig) break; }
      if (!M.missionDebug.state() || M.missionDebug.state().phase !== 'active') break;
      await sleep(2500);
    }
  });
}
clearInterval(skipper); clearInterval(clockTik);
console.log('[akte45] beelden ' + out.beelden.length + ', fouten ' + out.fouten.length);
return JSON.stringify({ results: out });
