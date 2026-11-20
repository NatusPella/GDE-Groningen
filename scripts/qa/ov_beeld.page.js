// Page half of scripts/qa/ov_beeld.mjs (desktop --perf-script body; #985): een bushalte (paal, bord, naam, prompt, menu), een
// busdienst vanaf die halte, een station (prompt, menu) en een treindienst vanaf dat station. Zet de speler zelf neer,
// neemt [capture]-beelden en meet de staat. window.__ov = { settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__ov || {}).settle || 8000;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fix();
let hold = null, done = false, cur = null;
const tick = () => { w.clock = 14; if (hold && !p.inVehicle && !w.trainDriving) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
const grab = async (name, ms = 600) => { await sleep(ms); console.log('[capture] ' + name); await sleep(500); };
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const out = { stappen: [], fouten: [] };
const note = (k, v) => { out.stappen.push([k, v]); };
const prompts = await imp('prompts');
const BH = await imp('bushalte');
const OM = await imp('ovmissie');
const VH = await imp('vehicle');
const BR = await imp('busroutes');
const hudtekst = () => (document.querySelector('#hud') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 400);

// ---------- bushalte ----------
try {
  const lines = VH.getBusLines();
  note('lijnen', lines.length);
  // de halte het dichtst bij de speler (Groningen, de wereld waar het spel begint)
  let best = null, bd = Infinity;
  for (const h of OM.haltesNabij(lines, p.x, p.y, 4000)) { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } }
  if (!best) throw new Error('geen halte binnen 4 km');
  const e = best.ingangen[0];
  const pa = BR.pointAt(e.line, e.line.stops[e.index].s);
  const kx = best.x - Math.sin(pa.heading) * 4.2, ky = best.y + Math.cos(pa.heading) * 4.2;
  note('halte', { naam: best.naam, x: Math.round(best.x), y: Math.round(best.y), afstand: Math.round(bd), lijnen: best.ingangen.length, opties: OM.halteOpties(best).length });
  hold = { x: kx - Math.sin(pa.heading) * 0 + Math.cos(pa.heading) * 3, y: ky + Math.sin(pa.heading) * 3 };
  p.x = hold.x; p.y = hold.y; p.z = gh(p.x, p.y);
  await sleep(SETTLE);
  const z0 = gh(kx, ky);
  // overzicht vanaf de stoep, kijkend naar paal en weg
  cur = { position: { x: kx + Math.sin(pa.heading) * 0 + Math.cos(pa.heading) * 6, y: ky + Math.sin(pa.heading) * 6, z: z0 + 2.0 }, lookAt: { x: kx, y: ky, z: z0 + 1.8 } };
  await grab('halte-paal');
  cur = { position: { x: kx - Math.sin(pa.heading) * 9, y: ky + Math.cos(pa.heading) * 9 + 0, z: z0 + 2.6 }, lookAt: { x: kx, y: ky, z: z0 + 1.6 } };
  await grab('halte-paal-ver');
  const scene = S3.scene;
  let aantal = 0; scene.traverse((o) => { if (o.isInstancedMesh && o.count > 0 && o.geometry.type === 'BoxGeometry') aantal++; });
  note('instancedMeshes met count', aantal);
  cur = null;
  const pr = BH.bushaltePrompt(w);
  note('prompt', pr && { label: pr.label, sub: pr.sub, dim: pr.dim });
  await grab('halte-prompt');
  tapKey('e', 'KeyE');
  await sleep(1200);
  note('menu open', document.body.classList.contains('shop-open'));
  note('menu tekst', (document.querySelector('.sm-panel') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 300));
  await grab('halte-menu');
  // kies de eerste dienst via de knoppen van het menu
  const item = document.querySelector('.sm-item:not([aria-disabled="true"])');
  if (item) item.click();
  await sleep(300);
  const koop = [...document.querySelectorAll('.sm-panel button')].find((b) => /Rijden|Koop|Kies|Start/i.test(b.innerText));
  note('koopknop', koop ? koop.innerText : null);
  if (koop) koop.click();
  await sleep(1500);
  note('na keuze', { sideJob: !!(w.sideJob && w.sideJob.active), shop: document.body.classList.contains('shop-open'), hud: hudtekst() });
  const bus = (w.vehicles || []).find((v) => v.isBus && Math.hypot(v.x - p.x, v.y - p.y) < 30);
  note('bus bij halte', bus ? { afstand: Math.round(Math.hypot(bus.x - p.x, bus.y - p.y)), ref: bus.rideLine ? 'rit' : 'geen' } : null);
  cur = null;
  await grab('halte-dienst-start', 800);
  // instappen en een stuk rijden
  if (bus) {
    hold = null;
    p.enterVehicle ? p.enterVehicle(bus, w) : null;
    await sleep(1500);
    note('in bus', !!p.inVehicle);
    await grab('halte-bus-binnen', 1500);
  }
  tapKey('Backspace', 'Backspace');
  await sleep(500);
} catch (err) { out.fouten.push('bus: ' + (err && err.stack || err)); }

// ---------- station ----------
try {
  hold = null;
  if (p.inVehicle) { p.exitVehicle(map, w); }
  if (w.sideJob && w.sideJob.active) { const sj = await imp('sidejobs'); sj.quitSideJob && sj.quitSideJob(); }
  const ST = await imp('stationtravel');
  const stations = ST.getStationsForRender();
  note('stations', stations.length);
  let s = stations.find((q) => /Groningen$/.test(q.name) || /Hoofdstation|Groningen/.test(q.name)) || stations[0];
  note('station', { naam: s.name, x: Math.round(s.x), y: Math.round(s.y), opties: OM.stationOpties(s).map((o) => o.tekst + ' ' + o.haltes + ' haltes spoor ' + o.spoor) });
  p.x = s.x + 0.6; p.y = s.y + 1.2; p.z = gh(p.x, p.y);
  hold = { x: p.x, y: p.y };
  await sleep(SETTLE);
  cur = { position: { x: s.x + 5, y: s.y + 6, z: gh(s.x, s.y) + 2.4 }, lookAt: { x: s.x, y: s.y, z: gh(s.x, s.y) + 1.3 } };
  await grab('station-automaat');
  cur = null;
  const spr = ST.stationPrompt(w);
  note('station prompt', spr && { label: spr.label, sub: spr.sub, dim: spr.dim });
  await grab('station-prompt');
  tapKey('e', 'KeyE');
  await sleep(1200);
  note('station menu open', document.body.classList.contains('shop-open'));
  note('station menu', (document.querySelector('.sm-panel') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 600));
  await grab('station-menu');
  const tab = [...document.querySelectorAll('.sm-panel button, .sm-panel [role=tab]')].find((b) => /Zelf de trein/i.test(b.innerText));
  note('tab', tab ? tab.innerText.replace(/s+/g, ' ') : null);
  if (tab) { tab.click(); await sleep(600); }
  await grab('station-menu-dienst');
  const items = [...document.querySelectorAll('.sm-item')];
  const dienst = items.find((i) => /Noorderspoor naar/.test(i.innerText));
  note('dienst-item', dienst ? dienst.innerText.replace(/\s+/g, ' ').slice(0, 120) : null);
  if (dienst) dienst.click();
  await sleep(300);
  const knop = [...document.querySelectorAll('.sm-panel button')].find((b) => /Rijden|Koop|Kies/i.test(b.innerText));
  note('station koopknop', knop ? knop.innerText : null);
  if (knop) knop.click();
  await sleep(2500);
  hold = null;
  const MC = await imp('machinist');
  const svc = MC.getService();
  note('na dienstkeuze', { trainDriving: !!w.trainDriving, dienst: !!svc, finished: svc ? svc.finished : null, haltes: svc ? svc.plan.map((q) => q.name) : null, wanted: w.wanted, hud: hudtekst() });
  await grab('station-dienst-cabine', 1500);
  await sleep(7000);
  await grab('station-regelkaart', 500);
  // een stuk gas geven: de trein moet bewegen
  const t = w.trainDriving;
  if (t) {
    const c0 = t.c;
    D.input.keys && (D.input.keys['w'] = true);
    for (let i = 0; i < 8; i++) { tapKey('w', 'KeyW'); await sleep(100); }
    t.ctl && (t.ctl.throttle = true);
    await sleep(6000);
    note('trein', { c0: Math.round(c0), c1: Math.round(t.c), v: +t.v.toFixed(1) });
    await grab('station-trein-rijdt', 500);
  }
} catch (err) { out.fouten.push('station: ' + (err && err.stack || err)); }
done = true;
clearInterval(skipper);
return JSON.stringify(out);
