// Paginascript van de beeldregressie (scripts/kwaliteit/beeldregressie.mjs --run). beeldregressie.mjs plakt hiervoor
// window.__kp (de punten uit camerapunten.json) en scripts/trailer/lib/clip.page.js (vaste tijdstap, settle, cam, png),
// en erachter `return await kpMain();`. Draait via de perf-script-haak van desktop/devtools.js in een --clip-run, dus elk
// beeld is precies het gevraagde formaat (zonder vensterrand) en gaat als <out>/<id>.png naar schijf (gd.clip('png')).
//
// Deterministisch: Math.random met seed (--autoplay=<seed>), klok en weer vast, wereldtijd alleen via advance()/settle()
// (vaste stap van 1/60 s), en een beeld pas als het streamen rond de camera klaar is plus een vast aantal beelden. Elk punt
// draait in een eigen try: een punt dat omvalt, houdt de andere niet tegen. Niets schrijft naar echte opslag (wegwerpprofiel,
// en ?autoplay houdt de opslag in het geheugen); synthetische toetsen gaan via press() (keydown en keyup).

async function kpMain() {
  const K = window.__kp || { punten: [] };
  const uit = { venster: [innerWidth, innerHeight, devicePixelRatio], punten: {}, start: new Date().toISOString() };
  const NA = K.naSettle || 30; // vaste beelden na een rustige wereld
  const want = (p) => !K.only || !K.only.length || K.only.includes(p.id);
  const punten = K.punten.filter(want);
  const meld = (id, r) => { uit.punten[id] = r; logc(id + ': ' + JSON.stringify(r).slice(0, 200)); };
  await loadModules();
  const PM = await import('/js/pausemenu.js');
  const MV = await import('/js/mapview.js');
  let HOME = null; try { HOME = await import('/js/home.js'); } catch (e) { /* geen thuis */ }

  // ---- spel starten zoals de speler: Nieuw spel; het openingsfilmpje levert de filmpjesbeelden ----
  for (let i = 0; i < 40 && !window.__menuStart && !document.body.classList.contains('game-started'); i++) await sleep(500);
  if (window.__menuStart && !document.body.classList.contains('game-started')) window.__menuStart('nieuw');
  for (let i = 0; i < 60 && !document.body.classList.contains('game-started'); i++) await sleep(500);
  const filmpjes = punten.filter((p) => p.soort === 'filmpje').sort((a, b) => a.t - b.t);
  let film = false;
  if (filmpjes.length) for (let i = 0; i < 160 && !film; i++) { film = !!(M.cine.isCinematicActive && M.cine.isCinematicActive()); if (!film) await sleep(250); }
  installVirtualTime();
  window.__clip = clipApi;
  for (const p of filmpjes) {
    const t0 = rt.now();
    try {
      if (!film || !M.cine.isCinematicActive()) throw new Error('geen openingsfilmpje actief');
      M.cine.setCinematicTime(p.t);
      for (let k = 0; k < (p.beelden || 20); k++) await advance({ capture: false });
      await png(p.id);
      meld(p.id, { ok: true, ms: Math.round(rt.now() - t0) });
    } catch (e) { meld(p.id, { ok: false, fout: String(e && e.message || e) }); }
  }
  // de rest van de opening weg, en geen eigen filmpjes van het spel (landmark, wijk) die de camera overnemen
  for (let i = 0; i < 600 && M.cine.isCinematicActive && M.cine.isCinematicActive(); i++) { M.cine.skipAllCinematics(); await advance({ capture: false }); }
  M.set.setSetting('cinematicMoments', false);
  try { M.set.setSetting('showHints', false); } catch (e) { /* oudere instellingen */ }
  world.devInvuln = true;
  weather(K.weer || 'helder');
  clock(K.klok ?? 13);

  const lm = (naam) => (world.map.meta && world.map.meta.landmarks || []).find((l) => l.name === naam);
  const doel = (p) => {
    if (p.doel === 'thuis') { const h = HOME && HOME.homeSpawnPoint ? HOME.homeSpawnPoint() : null; if (h && (h.x || h.y)) return { x: h.x, y: h.y, bron: 'thuis' }; }
    else if (p.doel) { const l = lm(p.doel); if (l) return { x: l.x, y: l.y, bron: 'landmark' }; }
    if (p.terug) return { x: p.terug[0], y: p.terug[1], bron: 'terugval' };
    throw new Error('geen doel voor ' + p.id);
  };
  const rustig = async (label) => { const s = await settle({ frames: 45, max: 2400, label }); for (let k = 0; k < NA; k++) await advance({ capture: false }); return s; };
  const regioVan = (sel) => {
    const el = sel ? document.querySelector(sel) : null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    return { x: r.left / innerWidth, y: r.top / innerHeight, w: r.width / innerWidth, h: r.height / innerHeight };
  };

  for (const p of punten) {
    if (p.soort === 'filmpje') continue;
    const t0 = rt.now();
    try {
      await resetUi();
      releaseCam();
      leave();
      weather(K.weer || 'helder'); clock(K.klok ?? 13);
      let extra = {};
      if (p.soort === 'wereld') {
        const d = p.camAbs ? { x: 0, y: 0, bron: 'absoluut' } : doel(p);
        const c = p.camAbs || [d.x + p.cam[0], d.y + p.cam[1], p.cam[2]];
        const l = p.kijkAbs || [d.x + (p.kijk || [0, 0, 0])[0], d.y + (p.kijk || [0, 0, 0])[1], (p.kijk || [0, 0, 0])[2]];
        placePlayer(c[0], c[1]);
        clearArea(l[0], l[1], 260);
        hud(false);
        cam({ x: c[0], y: c[1], z: groundZ(c[0], c[1]) + c[2] }, { x: l[0], y: l[1], z: groundZ(l[0], l[1]) + l[2] }, p.fov || 55);
        extra = { doel: d.bron, settle: (await rustig(p.id)).frames };
      } else if (p.soort === 'menu' || p.soort === 'kaart') {
        const d = p.soort === 'kaart' ? doel(p) : (p.plek === 'thuis' ? doel({ doel: 'thuis', terug: [101, 77] }) : { x: 101, y: 77 });
        placePlayer(d.x, d.y);
        hud(true);
        await rustig(p.id + ' (wereld eronder)');
        if (p.soort === 'kaart') {
          if (MV.vergeetKaartUitleg) MV.vergeetKaartUitleg();
          PM.openPauseMenu('map');
          for (let k = 0; k < 40; k++) await advance({ capture: false });
          if (MV.kaartUitlegSluiten) MV.kaartUitlegSluiten(); // de uitlegkaart hoort bij de eerste keer, niet bij dit punt
          MV.setMapView(d.x, d.y, p.zoom || 3);
        } else PM.openPauseMenu(p.tab, p.opts || {});
        for (let k = 0; k < (p.beelden || 150); k++) { await advance({ capture: false }); if (k % 10 === 9) await sleep(30); }
      } else if (p.soort === 'rijden') {
        const v = spawn('hero', p.spawn[0], p.spawn[1]);
        clearArea(v.x, v.y, 120, [v]);
        enter(v);
        hud(true);
        extra = { settle: (await rustig(p.id)).frames };
        if (p.regioVanPagina) { extra.regio = regioVan(p.regioVanPagina); if (!extra.regio) throw new Error('regio niet gevonden: ' + p.regioVanPagina); }
      } else if (p.soort === 'laadscherm') {
        const d = doel(p);
        placePlayer(d.x, d.y);
        hud(true);
        await rustig(p.id + ' (wereld eronder)');
        const ls = M.load.startLoadScreen(world, { kind: 'travel', x: d.x, y: d.y });
        // Het echte scherm sluit zelf zodra de plek geladen is (hier al meteen), dus vóór de foto weg. Net als
        // scripts/qa/menufoto.page.js: een kopie van het echte scherm vasthouden, met een vaste balk en stap en
        // zonder animatie, zodat het beeld deterministisch is.
        const LL = await import('/js/loadlogic.js');
        const kloon = ls && ls.el ? ls.el.cloneNode(true) : null;
        if (!kloon) throw new Error('geen laadscherm-element');
        // de opmaak hangt aan #load-screen: de kopie krijgt die id, het echte scherm tijdelijk een andere
        const echtId = ls.el.id; ls.el.id = 'load-screen-echt';
        kloon.id = 'load-screen'; kloon.classList.add('on', 'instant'); kloon.classList.remove('out'); kloon.style.zIndex = '99999';
        const BALK = p.balk != null ? p.balk : 0.55;
        const fill = kloon.querySelector('.ls-bar i'); if (fill) fill.style.transform = 'scaleX(' + BALK + ')';
        const stap = kloon.querySelector('.ls-step'); if (stap && LL.loadStepAt) stap.textContent = LL.loadStepAt(BALK, 'travel').label;
        const stil = document.createElement('style'); stil.textContent = '#load-screen, #load-screen * { animation: none !important; transition: none !important; }';
        document.head.appendChild(stil); document.body.appendChild(kloon);
        ls.el.style.visibility = 'hidden';
        for (let k = 0; k < (p.beelden || 30); k++) await advance({ capture: false });
        await png(p.id);
        kloon.remove(); stil.remove(); ls.el.id = echtId; ls.el.style.visibility = '';
        for (let k = 0; k < 40; k++) await advance({ capture: false });
        meld(p.id, { ok: true, ms: Math.round(rt.now() - t0) });
        continue;
      } else throw new Error('onbekende soort ' + p.soort);
      await png(p.id);
      meld(p.id, { ok: true, ms: Math.round(rt.now() - t0), ...extra, pending: pending().total });
    } catch (e) { meld(p.id, { ok: false, fout: String(e && e.message || e).slice(0, 300) }); }
  }
  try { await resetUi(); } catch (e) { /* klaar */ }
  uit.einde = new Date().toISOString();
  await gd.clip('json', { name: 'camerapunten', data: uit });
  return JSON.stringify({ punten: Object.keys(uit.punten).length, mislukt: Object.entries(uit.punten).filter(([, r]) => !r.ok).map(([id]) => id) });
}
