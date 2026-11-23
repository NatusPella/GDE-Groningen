// Paginascript van de video-QA-opname (scripts/videoqa/opname.mjs plakt hier achter: de bot-vensters, de
// trailerbibliotheek scripts/trailer/lib/clip.page.js en de aanroep van main).
//
// De Spelbot (menselijk profiel, geen cheats) speelt het spel terwijl de wereld met een VASTE tijdstap loopt:
// een pomp zet de virtuele klok elk beeld een stap verder, wacht tot het streamen rond de camera klaar is en
// geeft het beeld aan ffmpeg. De timers van de bot lopen op diezelfde virtuele klok, dus bot en wereld blijven
// gelijk, hoe zwaar de machine ook belast is. Per beeld gaat een regel telemetrie naar een zijbestand
// (rekentijd, tussenbeelden voor streamen, resterend werk), per halve seconde een momentopname van de speler.

async function qaMain() {
  const Q = window.__qaCfg || {};
  const FPS = Q.fps || 30;
  const DT = 1000 / FPS;
  const TARGET = Math.round((Q.seconds || 900) * FPS);
  const SEG = Math.round((Q.segSeconds || 90) * FPS);
  const CRF = Q.crf || 21;
  await loadModules();
  for (let i = 0; i < 40 && !window.__menuStart && !document.body.classList.contains('game-started'); i++) await sleep(500);
  installVirtualTime();
  window.__clip = clipApi;
  let stop = false;
  let botDone = null;
  const tele = [];
  const snaps = [];
  let seg = 0, segFrames = 0, total = 0, chunk = 0, wasted = 0;
  const wall0 = rt.now();
  const flush = async (final) => {
    if (!tele.length && !snaps.length) return;
    await gd.clip('json', { name: 'tele-' + String(chunk++).padStart(3, '0'), data: { rows: tele.splice(0), snaps: snaps.splice(0), cols: ['i', 'updMs', 'extra', 'pend', 'wallMs', 'tris', 'calls'] } });
    if (final) logc('telemetrie klaar');
  };
  const segBegin = async () => { await gd.clip('begin', { name: 'seg' + String(++seg).padStart(2, '0'), crf: CRF, fps: FPS, frag: true }); segFrames = 0; };
  const segEnd = async () => { const r = await gd.clip('end'); logc('segment ' + seg + ': ' + JSON.stringify(r)); };

  function snap() {
    try {
      const B = window.__bot;
      const s = B && B.status ? B.status() : null;
      const sc = window.__scene3d;
      const row = { i: total, t: +(total / FPS).toFixed(2) };
      if (s) {
        Object.assign(row, { gt: +s.t.toFixed(1), story: s.story && s.story.id, stage: s.mission && s.mission.stage, active: s.mission && s.mission.active, cine: !!(s.blocking && s.blocking.cinematic), talk: !!(s.blocking && s.blocking.talk), banner: !!(s.blocking && s.blocking.banner),
          x: Math.round(s.player.x), y: Math.round(s.player.y), veh: s.player.vehicle ? s.player.vehicle.kind : 'voet', v: s.player.vehicle ? +(s.player.vehicle.speed || 0).toFixed(1) : 0,
          goal: s.target ? Math.round(s.target.distance) : null, msg: s.hud && s.hud.messages && s.hud.messages[0] ? String(s.hud.messages[0]).slice(0, 80) : null, wanted: s.wanted || 0 });
      }
      if (sc && sc.renderer) { const inf = sc.renderer.info; row.tris = inf.render.triangles; row.calls = inf.render.calls; row.geo = inf.memory.geometries; }
      snaps.push(row);
    } catch (e) { /* geen momentopname */ }
  }

  // één beeld: wereld een stap verder, wachten tot alles rond de camera binnen is, beeld opnemen
  async function qaFrame() {
    const t0 = rt.now();
    runCallbacks(DT);
    const upd = rt.now() - t0;
    await present();
    let n = 0, p = pending();
    while (p.total > 0 && n < MAX_EXTRA) {
      if (n % 4 === 3) await sleep(16);
      runCallbacks(EXTRA_MS);
      await present();
      n++;
      p = pending();
    }
    ST.vnow -= EXTRA_MS * n;
    const sc = window.__scene3d;
    const inf = sc && sc.renderer ? sc.renderer.info.render : null;
    tele.push([total, +upd.toFixed(1), n, p.total, +(rt.now() - t0).toFixed(1), inf ? inf.triangles : 0, inf ? inf.calls : 0]);
    await gd.clip('frame');
    total++; segFrames++;
    if (total % Math.round(FPS / 2) === 0) snap();
    if (tele.length >= 900) await flush();
  }

  // de bot: zijn eigen paginascript (bot.page.js) als functie; draait naast de pomp
  const botPromise = (async () => { try { return await window.__botMain(); } catch (e) { logc('bot-fout: ' + (e && e.stack || e)); return 'FOUT ' + (e && e.message); } })()
    .then((r) => { botDone = r; logc('bot klaar: ' + String(r).slice(0, 300)); return r; });

  // het spel zelf starten zoals de speler: Nieuw spel in het hoofdmenu
  if (window.__menuStart && !document.body.classList.contains('game-started')) window.__menuStart('nieuw');
  await segBegin();
  logc('opname begint: ' + FPS + ' fps, ' + TARGET + ' beelden, venster ' + innerWidth + 'x' + innerHeight);
  while (!stop && total < TARGET) {
    await qaFrame();
    if (segFrames >= SEG && total < TARGET) { await segEnd(); await segBegin(); }
    if (botDone !== null && total > 0 && !Q.doorNaBot) { // de bot is klaar (verhaal uit of opgegeven): nog 5 s en stoppen
      if (!qaFrame.after) qaFrame.after = total + 5 * FPS;
      if (total >= qaFrame.after) stop = true;
    }
    if (total % (FPS * 30) === 0) logc('voortgang ' + (total / FPS).toFixed(0) + ' s video, ' + ((rt.now() - wall0) / 60000).toFixed(1) + ' min echt');
  }
  stop = true;
  await segEnd();
  snap();
  await flush(true);
  const out = { frames: total, fps: FPS, segments: seg, botDone, wallMin: +((rt.now() - wall0) / 60000).toFixed(1) };
  await gd.clip('json', { name: 'opname', data: out });
  return JSON.stringify(out);
}
