// Page-script van opening_film_beelden.mjs: speelt de openingsfilm en neemt stills (echte tijd) met het shot-id erbij.
const D = window.__debug; const w = D.world;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const CS = window.__cs || {};
const cine = await import('/js/cinematics.js');
const im = await import('/js/intromontage.js');
D.input.canLock = () => false;
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
if (document.pointerLockElement) document.exitPointerLock();
for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(400); }
await sleep(6000);
if (CS.extra === 'sonde') {
  const lm = (w.map.meta.landmarks || []).map((l) => l.name + ':' + Math.round(l.x) + ',' + Math.round(l.y));
  return JSON.stringify({ lm });
}
if (String(CS.extra).startsWith('kaart:')) {
  const [cx, cy, half, step] = CS.extra.slice(6).split(',').map(Number);
  const gr = await import('/js/greenery.js'); const ut = await import('/js/util.js'); const cp = await import('/js/camerapath.js');
  const rows = [];
  for (let y = cy - half; y <= cy + half; y += step) {
    let row = String(Math.round(y)).padStart(6) + ' ';
    for (let x = cx - half; x <= cx + half; x += step) {
      let c = '.';
      if (cp.roofAt(w.map, x, y)) c = 'B';
      else if (w.map.treesNear(x, y, step).some((t) => gr.treeBlocksPoint(t, x, y, 1.6, 0.3))) c = 'T';
      else if (ut.isInWater(w.map, x, y)) c = '~';
      else if (w.map.greenNear(x, y, 0.5).some((g) => x >= g.bounds[0] && x <= g.bounds[2] && y >= g.bounds[1] && y <= g.bounds[3])) c = ',';
      row += c;
    }
    rows.push(row);
  }
  return JSON.stringify({ x0: cx - half, step, rows });
}
const ok = im.playIntroMontage(w, { film: true, startAt: CS.startAt || 0 });
const out = { ok, shots: [] };
await sleep(2500);
const info = window.__introFilm && window.__introFilm();
if (!info) return JSON.stringify({ ok, fout: 'geen film' });
out.starts = info.starts; out.ids = info.ids; out.durs = info.durs;
// regelvast: de tijd van de film staat stil, per monster zetten we hem op de plek en wachten we tot de wereld erbij staat
cine.setCinematicRate(0.002); // bijna stil: de tick van een shot (zitposes) blijft lopen
const want = CS.extra ? String(CS.extra).split(',') : null; // shot-id's; leeg = alle
const fr = CS.fr || [0.2, 0.55, 0.9];
for (let i = 0; i < info.ids.length; i++) {
  if (want && !want.includes(info.ids[i])) continue;
  for (const f of fr) {
    const T = info.starts[i] + info.durs[i] * f;
    cine.setCinematicTime(T - (CS.startAt || 0));
    await sleep(CS.settle || 5500);
    const st = window.__introFilm();
    const name = 'film-' + info.ids[i] + '-' + Math.round(f * 100);
    console.log('[capture] jpg:' + name + '@' + (CS.width || 1920));
    await sleep(700);
    out.shots.push({ name, id: info.ids[i], f, T: Math.round(T * 10) / 10, got: st && st.id });
  }
}
cine.skipCinematic && cine.skipCinematic();
return JSON.stringify(out);
