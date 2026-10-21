// Page half van scripts/qa/tester_bugs.mjs --check=cutnabij (#136, #147): speelt de intro en afloop van de gekozen missies in
// echte tijd en meet elk frame hoe dicht de échte camera (na de camera-guard van scene3d.js en de blend) bij een figuur staat.
// cutscene_shots zet elke still als harde cut en kan dit dus niet zien; hier speelt de scène zoals een speler hem ziet.
// Opties (--opts): { missions: 'M01,M02,M03', min: 0.9 }. Uitvoer per scène: frames, kleinste afstand, de stukken waarin de camera
// dichter dan `min` meter (horizontaal, camera lager dan 2,4 m) bij een figuur staat, met tijd, afstand en welke.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
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
const sc3 = window.__scene3d;
const root = (await import('/js/scene3d.js')).getScene();
const MIN = TB.min || 0.9;
w.devInvuln = true;
const result = {};
const frameFigures = () => {
  const out = [];
  root.traverse((o) => {
    if (!o.userData || !o.userData.shadow || !o.visible) return;
    for (let q = o.parent; q; q = q.parent) if (!q.visible) return;
    const wp = o.getWorldPosition(new o.position.constructor());
    out.push({ x: wp.x, y: wp.z, n: (o.name || o.type) });
  });
  return out;
};
for (const id of (TB.missions || 'M01,M02,M03').split(',')) {
  const step = SP.STEPS.find((s) => s.id === id || s.mission === id);
  const idx = step ? SP.MISSION_IDS.indexOf(step.mission) : -1;
  if (idx < 0) { result[id] = { fout: 'stap niet gevonden' }; continue; }
  for (const kind of ['intro', 'outro']) {
    for (let i = 0; i < 300 && cine.isCinematicActive(); i++) await sleep(100);
    await sleep(2500);
    const rows = [];
    let ok = false;
    try { ok = kind === 'intro' ? MS.playStoryIntro(w, idx, { stage: idx }) : MS.playStoryOutro(w, idx, { stage: idx }); } catch (e) { result[id + '.' + kind] = { fout: String(e).slice(0, 200) }; continue; }
    const t0 = performance.now();
    let began = false, quiet = 0, frames = 0, minD = 9e9;
    let cur = null;
    for (let i = 0; i < 4000; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const act = cine.isCinematicActive();
      if (act) began = true;
      if (began && !act) { if (++quiet > 20) break; continue; }
      if (!began) { if (i > 120) break; continue; }
      quiet = 0;
      frames++;
      const c = sc3.cam.position;
      if (c.y > 2.4 + (w.player.gz || 0)) continue;
      let best = null;
      for (const f of frameFigures()) {
        const d = Math.hypot(f.x - c.x, f.y - c.z);
        if (best === null || d < best.d) best = { d, n: f.n };
      }
      if (best) {
        minD = Math.min(minD, best.d);
        if (best.d < MIN) {
          const t = (performance.now() - t0) / 1000;
          if (cur && t - cur.t1 < 0.2) { cur.t1 = t; cur.minD = Math.min(cur.minD, best.d); cur.frames++; } else { cur = { t0: +t.toFixed(2), t1: t, minD: best.d, frames: 1, wie: best.n }; rows.push(cur); }
        }
      }
    }
    result[id + '.' + kind] = { gestart: !!ok && began, duur: +((performance.now() - t0) / 1000).toFixed(1), frames, minD: +minD.toFixed(2), nabij: rows.map((r) => ({ t: r.t0, tot: +r.t1.toFixed(2), d: +r.minD.toFixed(2), frames: r.frames, wie: r.wie })) };
    console.log('[tb] ' + id + '.' + kind + ' klaar, min ' + minD.toFixed(2) + ', stukken ' + rows.length);
    if (cine.isCinematicActive()) cine.skipCinematic();
    await sleep(600);
  }
}
return JSON.stringify({ results: result });
