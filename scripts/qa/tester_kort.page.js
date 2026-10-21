// Page half van scripts/qa/tester_bugs.mjs --check=kort (#352): de scènes die bij het spelen een korte of generieke regie krijgen
// (quickScene in cutscenes_akte1.js): de solo-rit van M21, de herhaalde vraag (short intro), de ene regel van een replay (short outro)
// en het paar op het dek van een boot. Elk geval draait in echte tijd door missionstory.js, met beelden op vaste momenten.
// Opties (--opts): { cases: 'm21,kort,replay,dek', missions: 'M05,M09' }. Uitvoer: per geval of de scène begon, hoe lang hij duurde en
// de afstand van de dichtstbijzijnde figuur tot de echte camera.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent)); if (it) it.click(); else key('Enter', 'Enter'); }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(3000);
const SP = await import('/js/storyarc.js');
const MS = await import('/js/missionstory.js');
const VH = await import('/js/vehicle.js');
const BT = await import('/js/boattypes.js');
const WL = await import('/js/waterlevels.js');
const root = (await import('/js/scene3d.js')).getScene();
const sc3 = window.__scene3d;
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const wanted = new Set((TB.cases || 'm21,kort,replay,dek').split(','));
const result = {};
const figures = () => {
  const out = [];
  root.traverse((o) => {
    if (!o.userData || !o.userData.shadow || !o.visible) return;
    for (let q = o.parent; q; q = q.parent) if (!q.visible) return;
    const wp = o.getWorldPosition(new o.position.constructor());
    out.push({ x: wp.x, y: wp.z });
  });
  return out;
};
const idxOf = (id) => { const st = SP.STEPS.find((s) => s.id === id || s.mission === id); return st ? SP.MISSION_IDS.indexOf(st.mission) : -1; };
const settle = async () => { for (let i = 0; i < 400 && cine.isCinematicActive(); i++) await sleep(100); await sleep(1500); };
// speelt een scène in echte tijd en maakt beelden op de gevraagde seconden na het begin
async function play(name, start, shotsAt = [2, 6]) {
  await settle();
  let ok = false;
  try { ok = start(); } catch (e) { result[name] = { fout: String(e && e.stack || e).slice(0, 300) }; return; }
  const t0 = performance.now();
  let began = false, quiet = 0, minD = 9e9, frames = 0, sId = '';
  const todo = [...shotsAt];
  for (let i = 0; i < 6000; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const act = cine.isCinematicActive();
    if (act) began = true;
    if (began && !act) { if (++quiet > 20) break; continue; }
    if (!began) { if (i > 150) break; continue; }
    quiet = 0; frames++;
    const t = (performance.now() - t0) / 1000;
    const c = sc3.cam.position;
    if (c.y < 2.4 + (p.gz || 0)) for (const f of figures()) minD = Math.min(minD, Math.hypot(f.x - c.x, f.y - c.z));
    if (todo.length && t >= todo[0]) { const at = todo.shift(); console.log('[capture] ' + name + '-t' + at); await sleep(350); }
  }
  result[name] = { gestart: !!ok && began, duur: +((performance.now() - t0) / 1000).toFixed(1), frames, minD: +minD.toFixed(2) };
  console.log('[tk] ' + name + ' ' + JSON.stringify(result[name]));
  if (cine.isCinematicActive()) cine.skipCinematic();
  await sleep(800);
}

// 1. de solo-rit van M21 (een eigen spec: de bakkie rijdt, de stemmen zitten erin)
if (wanted.has('m21')) { const i = idxOf('M21'); await play('M21-intro', () => MS.playStoryIntro(w, i, { stage: i }), [1, 6, 12, 20]); }

// 2. de herhaalde vraag van een missie (short intro) en de ene regel van een replay (short outro)
for (const id of (TB.missions || 'M05,M09,M17').split(',')) {
  const i = idxOf(id);
  if (i < 0) { result[id] = { fout: 'stap niet gevonden' }; continue; }
  if (wanted.has('kort')) await play(id + '-kort', () => MS.playStoryIntro(w, i, { stage: i, short: true }), [1.2]);
  if (wanted.has('replay')) await play(id + '-replay', () => MS.playStoryOutro(w, i, { stage: i, short: true }), [1.2]);
}

// 3. het paar op het dek van een boot: een sloep op het eerste water dat we vinden (intro en outro van M17, de bootmissie)
if (wanted.has('dek')) {
  let spot = null;
  for (let r = 10; r < 500 && !spot; r += 12) for (let k = 0; k < 24 && !spot; k++) {
    const a = k / 24 * Math.PI * 2, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (WL.waterAt(map, x, y) && WL.waterAt(map, x + 6, y) && WL.waterAt(map, x - 6, y) && WL.waterAt(map, x, y + 6) && WL.waterAt(map, x, y - 6)) spot = { x, y };
  }
  if (!spot) result.dek = { fout: 'geen water gevonden' };
  else {
    p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
    const boat = new VH.Vehicle(spot.x, spot.y, 0.4, { ...BT.BOAT_KINDS.sloep });
    boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
    p.enterVehicle(boat, w);
    await sleep(2500);
    const i = idxOf('M17');
    await play('M17-dek-intro', () => MS.playStoryIntro(w, i, { stage: i }), [2, 8]);
    await play('M17-dek-outro', () => MS.playStoryOutro(w, i, { stage: i }), [2, 6]);
    await play('M17-dek-kort', () => MS.playStoryIntro(w, i, { stage: i, short: true }), [1.2]);
    result.dekPlek = spot;
  }
}
return JSON.stringify({ results: result });
