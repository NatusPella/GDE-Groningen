// Playtest-simulatie (scripts/coop/playtest_sim.mjs): de fasen van het scenario van de playtest van 23-10, voor één Electron-instantie.
// Wordt vóór coop.page.js gezet; coop.page.js roept window.__coopPhases(ctx) aan en voegt het resultaat aan PHASES toe.
// De instanties lopen gelijk via een sluis (barrière) bij de coördinator: elke stap begint pas als iedereen de vorige klaar heeft
// (of na een time-out). Elke stap logt een 'stap-uitslag' met ok en details; daarnaast logt 'meting' om de 5 s het geheugen,
// de beeldsnelheid, de scene, het berichtvolume en de wereld (zie playtest_sim.mjs voor de beoordeling).
window.__coopPhases = (c) => {
  const { CFG, sleep, log, W, until, act, shot, esc, openSamen, closeMenu, imp, net, PHASES, panel, title, buttons } = c;
  const B = () => window.__bot;
  const haalCache = {};
  const isHost = () => { const n = net(); return !!n && n.role === 'host'; };
  const mijnSlot = () => { const n = net(); return !n ? null : n.role === 'host' ? 0 : (n.session && n.session.slot) ?? null; };
  const J = async (pad) => { try { return await (await fetch(CFG.base + pad)).json(); } catch (e) { return null; } };
  // de sluis: wacht tot alle levende instanties er zijn
  const bar = async (n, ms = 240000) => { const t = performance.now(); const r = await J(`/b?n=${encodeURIComponent(n)}&w=${CFG.name}&ms=${ms}`); log('sluis', { n, wachtS: Math.round((performance.now() - t) / 100) / 10, ...(r || { fout: true }) }); if (!r) await sleep(3000); };
  const zet = async (k, v) => J(`/set?k=${encodeURIComponent(k)}&v=${encodeURIComponent(JSON.stringify(v))}`);
  const haal = async (k) => { const r = await J(`/get?k=${encodeURIComponent(k)}`); return r ? r.v : null; };
  const publiceer = async () => { await zet('slot-' + CFG.name, mijnSlot()); await zet('rol-' + CFG.name, isHost() ? 'host' : 'gast'); };
  const uitslag = (naam, ok, d = {}) => log('stap-uitslag', { naam, ok: !!ok, ...d });
  const pos = (o) => (o ? [Math.round(o.x), Math.round(o.y)] : null);

  // ---- metingen: beeldsnelheid, geheugen, scene, berichtvolume
  const TEL = { in: 0, uit: 0 };
  const lengte = (b) => (b && (b.byteLength ?? b.length)) | 0;
  const wikkel = (l) => {
    if (!l || l.__tel) return; l.__tel = true;
    try {
      const s0 = l.send.bind(l); l.send = (b) => { TEL.uit += lengte(b); return s0(b); };
      let inner = l.onmessage;
      Object.defineProperty(l, 'onmessage', { configurable: true, get: () => (inner ? (b) => { TEL.in += lengte(b); inner(b); } : inner), set: (f) => { inner = f; } });
    } catch (e) { /* geen telling voor deze verbinding */ }
  };
  const alleLinks = () => { const n = net(); if (!n) return []; if (n.role === 'client') return n.session ? [n.session.link] : []; return [...n.hub.sessions.values()].map((s) => s.link); };
  const GAPS = []; let gp = performance.now();
  const tik = (now) => { GAPS.push(now - gp); gp = now; if (GAPS.length > 2000) GAPS.splice(0, 1000); requestAnimationFrame(tik); };
  requestAnimationFrame(tik);
  const pct = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const sceneStand = async () => {
    const S3 = await import('./js/scene3d.js'), sc = S3.getScene(), r = S3.getRenderer(); let meshes = 0, kids = 0; const geos = new Set();
    if (sc) sc.traverse((o) => { kids++; if (o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) { meshes++; if (o.geometry) geos.add(o.geometry); } });
    return { meshes, kinderen: kids, sceneGeos: geos.size, geometrieen: r ? r.info.memory.geometries : null, texturen: r ? r.info.memory.textures : null, programmas: r ? r.info.programs.length : null, calls: r ? r.info.render.calls : null, driehoeken: r ? r.info.render.triangles : null };
  };
  let metN = 0, metingTimer = null, vorigeTel = { in: 0, uit: 0, t: performance.now() };
  const startMeting = () => {
    if (metingTimer) return;
    metingTimer = setInterval(async () => {
      try {
        for (const l of alleLinks()) wikkel(l);
        const nu = performance.now(), dt = (nu - vorigeTel.t) / 1000, g = GAPS.splice(0, GAPS.length).filter((x) => x < 2000);
        const kBin = (TEL.in - vorigeTel.in) / 1024 / dt, kBuit = (TEL.uit - vorigeTel.uit) / 1024 / dt; vorigeTel = { in: TEL.in, uit: TEL.uit, t: nu };
        const w = W(), n = net();
        const gc = typeof window.gc === 'function' && (++metN % 6 === 0); if (gc) window.gc();
        log('meting', {
          gc, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
          fpsMediaan: g.length ? +(1000 / pct(g, 0.5)).toFixed(1) : null, fpsP5: g.length ? +(1000 / pct(g, 0.95)).toFixed(1) : null, langsteMs: g.length ? Math.round(Math.max(...g)) : null,
          kBin: +kBin.toFixed(2), kBuit: +kBuit.toFixed(2), kbs: +(kBin + kBuit).toFixed(2), rol: n ? n.role : null, slot: mijnSlot(), stap: stand.stap, ...(await sceneStand()),
          voertuigen: w ? (w.vehicles || []).length : null, voetgangers: w ? (w.pedestrians || []).length : null, figuren: w ? Object.keys(w.coopFigures || {}).length : null,
          desyncN: w && w.coopDesync ? w.coopDesync.n : 0, dom: document.getElementsByTagName('*').length,
        });
      } catch (e) { /* even niets */ }
    }, 5000);
  };
  const stand = { stap: '' };

  // ---- hulpjes
  // lopen met de stick; bij een muur 70 graden draaien
  const loop = async (s, { rennen = true, hoek = -Math.PI / 2, tot = null } = {}) => {
    const w = W(), b = B(); if (!b) { await sleep(s * 1000); return 0; }
    const p0 = [w.player.x, w.player.y]; let last = p0.slice(), lt = performance.now(); const end = performance.now() + s * 1000;
    if (rennen) b.down('shift'); b.stick(Math.cos(hoek), Math.sin(hoek));
    while (performance.now() < end && !(tot && tot())) {
      await sleep(100);
      if (performance.now() - lt > 1500) { if (Math.hypot(w.player.x - last[0], w.player.y - last[1]) < 3 && !w.paused) { hoek += 1.2; b.stick(Math.cos(hoek), Math.sin(hoek)); } last = [w.player.x, w.player.y]; lt = performance.now(); }
    }
    b.stick(0, 0); if (rennen) b.up('shift');
    return Math.round(Math.hypot(w.player.x - p0[0], w.player.y - p0[1]));
  };
  // alleen voor wie het spel opende: de lichamen van de gasten (Tessa = plek 1 = w.companion, de rest zijn figuren)
  const lichamen = () => { const w = W(), o = []; if (w.companion) o.push({ slot: 1, l: w.companion }); for (const f of Object.values(w.coopFigures || {})) if (f.slot >= 2) o.push({ slot: f.slot, l: f }); return o.sort((a, b) => a.slot - b.slot); };
  const lichaamVan = async (naam) => { const sl = await haal('slot-' + naam); return lichamen().find((o) => o.slot === sl) || null; };
  const plaats = (l, x, y) => { l.x = x; l.y = y; l.vx = 0; l.vy = 0; l.verTijd = 0; l.vastTijd = 0; l.gz = 0; if ('input' in l) l.input = null; };
  const noodMelding = () => { const w = W(); window.__ptMsgs = window.__ptMsgs || []; if (!w.__ptHaak) { const o = w.addMessage.bind(w); w.addMessage = (t, ...a) => { window.__ptMsgs.push(String(t).slice(0, 90)); if (window.__ptMsgs.length > 60) window.__ptMsgs.shift(); return o(t, ...a); }; w.__ptHaak = true; } return window.__ptMsgs; };
  // een geparkeerde auto op een plek (zoals de suite 'bestuur')
  const parkeer = async (x, y) => { const V = await imp('vehicle'), w = W(); const v = new V.Vehicle(x, y, 0, V.MODELS[0]); v.parked = true; w.vehicles.push(v); return v; };

  // ---- de stappen. Elke stap: fn(rol) met rol 'host' (wie het spel opende, nu) of 'gast'; naam voor de uitslag.
  const stap = async (naam, fn) => {
    stand.stap = naam; await publiceer();
    if (naam !== 'opening') await bar('begin-' + naam); // de gasten wachten in de wachtkamer tot de host het spel start: daar geen sluis
    log('stap', { naam, begin: true, rol: isHost() ? 'host' : 'gast', pos: pos(W().player) });
    try { await fn(isHost() ? 'host' : 'gast'); } catch (e) { uitslag(naam, false, { fout: String(e && e.message || e).slice(0, 200) }); }
    await bar('eind-' + naam);
  };

  const S = {
    // 1. samen het openingsfilmpje zien (de host slaat over na 22 s; de gasten kijken en kunnen niet overslaan)
    async opening() {
      await PHASES.opening({ s: 150, skip: true });
    },
    // 2. een eind lopen
    async lopen() {
      const w = W(); const p0 = [w.player.x, w.player.y]; let max = 0; const mt = setInterval(() => { max = Math.max(max, Math.hypot(w.player.x - p0[0], w.player.y - p0[1])); }, 200);
      const m = await loop(30, { hoek: -Math.PI / 2 + (CFG.name === 'gast2' ? 2 : CFG.name === 'gast' ? 1 : 0) }); clearInterval(mt);
      shot('lopen-' + CFG.name);
      uitslag('lopen', Math.max(m, max) >= 12, { m, max: Math.round(max), rol: isHost() ? 'host' : 'gast', paused: !!w.paused, cutscene: !!(w.coopScene && w.coopScene.filmpje) });
    },
    // 3. gast 1 neemt een vrije auto en rijdt (bestuurder); gast 2 en de host kijken
    async gastrijdt() {
      const w = W(), b = B(), ms = noodMelding();
      if (isHost()) {
        const p = w.player, ls = lichamen(); const l1 = ls.find((o) => o.slot === 1), l2 = ls.find((o) => o.slot === 2);
        if (l1) plaats(l1.l, p.x + 14, p.y - 6); if (l2) plaats(l2.l, p.x + 10, p.y + 8);
        const auto = await parkeer((l1 ? l1.l.x : p.x + 14) + 2.4, l1 ? l1.l.y : p.y - 6); let vmax = 0, bestuurder = null, m0 = [auto.x, auto.y], maxM = 0, gezien = 0;
        for (let i = 0; i < 28; i++) { await sleep(1000); vmax = Math.max(vmax, Math.abs(auto.speed || 0)); maxM = Math.max(maxM, Math.hypot(auto.x - m0[0], auto.y - m0[1])); if (auto.coopBestuurder != null) bestuurder = auto.coopBestuurder; if (i === 14) { const z = Object.values(w.coopFigures || {}).filter((f) => f.slot >= 2).length; gezien = z; shot('gastrijdt-host'); } }
        uitslag('gastrijdt', bestuurder === 1 && maxM > 8, { rol: 'host', bestuurder, vmax: Math.round(vmax * 10) / 10, maxM: Math.round(maxM), driver: auto.driver });
        return;
      }
      if (CFG.name === 'gast') {
        await until(() => w.coopHost && (w.coopHost.voertuigen || []).some((v) => Math.hypot(v.x - w.player.x, v.y - w.player.y) < 8), 20000, 'de auto naast je').catch(() => {});
        for (let i = 0; i < 8 && !w.coopBestuurder; i++) { await b.press('e', 150); await sleep(900); }
        const erin = !!w.coopBestuurder; shot('gastrijdt-gast-in');
        const p0 = [w.player.x, w.player.y]; let vmax = 0, last = p0.slice(), lt = performance.now();
        b.stick(0, -1); const t1 = performance.now() + 4500;
        while (performance.now() < t1) { await sleep(100); const nu = performance.now(), d = Math.hypot(w.player.x - last[0], w.player.y - last[1]) / ((nu - lt) / 1000); vmax = Math.max(vmax, d); last = [w.player.x, w.player.y]; lt = nu; }
        b.stick(0.5, -1); await sleep(1500); shot('gastrijdt-gast-rijdt'); b.stick(0, 0); b.down(' '); await sleep(3000); b.up(' ');
        const m = Math.hypot(w.player.x - p0[0], w.player.y - p0[1]);
        for (let i = 0; i < 8 && w.coopBestuurder; i++) { await b.press('e', 150); await sleep(900); }
        uitslag('gastrijdt', erin && m > 8 && !w.coopBestuurder, { rol: 'gast', erin, m: Math.round(m), vmax: Math.round(vmax * 10) / 10, uit: !w.coopBestuurder, meldingen: ms.slice(-3) });
        return;
      }
      // gast 2: ziet gast 1 in de auto
      await sleep(12000); const zit = (w.coopZitters || []).map((z) => [z.slot, z.stoel, z.bestuurder]); shot('gastrijdt-gast2'); await sleep(14000);
      uitslag('gastrijdt', true, { rol: 'gast2', ziet: zit });
    },
    // 4. de host rijdt en de gasten rijden mee als passagier (en stappen uit)
    async passagier() {
      const w = W(), b = B();
      if (isHost()) {
        const p = w.player; for (const o of lichamen()) plaats(o.l, p.x + 1.5 + o.slot, p.y + 1.2);
        await sleep(1500); await PHASES.rit({ s: 34 }); await sleep(2000);
        uitslag('passagier', true, { rol: 'host', inVoertuig: !!(w.player && w.player.inVehicle) });
        return;
      }
      const eerste = performance.now(); let erin = false, zitters = null;
      await PHASES.rit({ s: 34 });
      erin = !!w.coopInVoertuig;
      for (let i = 0; i < 6 && w.coopInVoertuig; i++) { await b.press('e', 150); await sleep(1200); }
      uitslag('passagier', true, { rol: 'gast', wie: CFG.name, wasErin: erin, uitgestapt: !w.coopInVoertuig, zitters: (w.coopZitters || []).length, t: Math.round((performance.now() - eerste) / 1000) });
    },
    // 5. een missie starten en 'Meedoen?' beantwoorden (gast 1: J, gast 2: N)
    async missie() {
      const w = W(), b = B();
      if (isHost()) {
        let id = 'M03', ok = false, st = null; const story = window.__story; const M0 = await imp('missions');
        try { const i = M0.missionIndexById(id); ok = !!M0.missionDebug.start(w, i); } catch (e) { id = 'fout ' + e.message; }
        await sleep(15000); try { st = story.mission(); } catch (e) { st = null; }
        shot('missie-host');
        const M = await imp('missions'); try { M.cancelActiveMission(w); } catch (e) { /* al weg */ }
        await sleep(8000);
        const mee = net() && net().meedoen ? JSON.stringify(net().meedoen).slice(0, 200) : null;
        uitslag('missie', !!ok, { rol: 'host', id, ok, stap: st && (st.phase || '') + ':' + (st.stage || ''), meedoen: mee });
        return;
      }
      const ms = noodMelding(); let u = null;
      for (let i = 0; i < 150 && !u; i++) { u = w.coopUitnodiging; await sleep(200); }
      const uit = u ? { verplicht: !!u.verplicht, label: u.label || '', sec: u.sec ?? u.rest } : null;
      shot('missie-gast-' + CFG.name);
      if (u && !u.verplicht) { await sleep(1500); await b.press(CFG.name === 'gast' ? 'j' : 'n', 120); await sleep(1500); }
      const na = { nee: !!w.coopMeedoenNee, uitnodiging: !!w.coopUitnodiging };
      await sleep(10000);
      const goed = !!u && (u.verplicht || (CFG.name === 'gast' ? !na.nee : na.nee)) && !na.uitnodiging;
      uitslag('missie', goed, { rol: 'gast', wie: CFG.name, uit, na, meldingen: ms.slice(-3) });
    },
    // 6. een gast hengelt (gast 2, aan het water)
    async hengelen() {
      const w = W(), b = B();
      if (isHost()) {
        const { isInWater } = await import('./js/util.js'); const me = w.player; let best = null;
        for (let r = 6; r <= 400 && !best; r += 6) for (let a = 0; a < 6.283 && !best; a += 0.2) { const x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r; if (isInWater(w.map, x, y) && isInWater(w.map, x + Math.cos(a) * 12, y + Math.sin(a) * 12)) best = { x, y, a, r }; }
        log('hengel-water', best || { geen: true });
        if (!best) { uitslag('hengelen', false, { rol: 'host', fout: 'geen water binnen 400 m' }); return; }
        const Ch = await imp('cheats'); const kant = [best.x - Math.cos(best.a) * 3.5, best.y - Math.sin(best.a) * 3.5];
        Ch.verplaatsStil(w, kant[0] - Math.cos(best.a) * 4, kant[1] - Math.sin(best.a) * 4);
        await sleep(6000);
        const g = await lichaamVan('gast2'); if (g) { plaats(g.l, kant[0], kant[1]); }
        for (const o of lichamen()) if (!g || o.slot !== g.slot) plaats(o.l, kant[0] - Math.cos(best.a) * 6 - Math.sin(best.a) * 3 * o.slot, kant[1] - Math.sin(best.a) * 6 + Math.cos(best.a) * 3 * o.slot);
        w.camYaw = best.a; let bezig = null; const t0 = performance.now();
        while (performance.now() - t0 < 36000) { await sleep(1000); const e = g && (w.coopBezigVan || {})[g.slot]; if (e && e.a) bezig = e.a; }
        shot('hengelen-host');
        uitslag('hengelen', bezig === 'hengelen', { rol: 'host', bezig, gastSlot: g ? g.slot : null });
        return;
      }
      if (CFG.name !== 'gast2') { await sleep(20000); const e = Object.values(w.coopBezigVan || {}).map((x) => x.a); shot('hengelen-' + CFG.name); await sleep(15000); uitslag('hengelen', true, { rol: 'gast', wie: CFG.name, ziet: e }); return; }
      await sleep(14000); // de host brengt je naar het water
      const ms = noodMelding(); const t0 = Date.now();
      await b.press('i', 150); await sleep(3000); shot('hengelen-gast-1');
      await sleep(14000); shot('hengelen-gast-2');
      const bezig = Object.keys(w.coopBezigVan || {}).length;
      const tekst = ms.slice(-4);
      await b.press('escape', 120); await sleep(1500);
      uitslag('hengelen', true, { rol: 'gast', meldingen: tekst, eigenBezig: bezig, geld: w.money, lichaamBeweegt: pos(w.player) });
    },
    // 7. een gast winkelt (gast 1)
    async winkel() {
      const w = W(), b = B();
      if (isHost()) {
        const Sh = await imp('shops'), lijst = (Sh.getShopsForRender() || []).filter((x) => ['super', 'snack', 'kleding', 'tabak', 'kapper'].includes(x.type));
        const g = await lichaamVan('gast'); const me = w.player;
        lijst.sort((x, y) => Math.hypot(x.x - me.x, x.y - me.y) - Math.hypot(y.x - me.x, y.y - me.y)); const sh = lijst[0];
        if (!sh) { uitslag('winkel', false, { rol: 'host', fout: 'geen winkel' }); return; }
        const Ch = await imp('cheats'); Ch.verplaatsStil(w, sh.x, sh.y + 3); await sleep(5000);
        for (const o of lichamen()) plaats(o.l, sh.x + (o.slot === (g && g.slot) ? 0 : 3 + o.slot), sh.y + 1.2);
        w.player.x = sh.x - 3; w.player.y = sh.y + 3; log('winkel-host', { winkel: sh.name, soort: sh.type });
        await sleep(32000);
        uitslag('winkel', true, { rol: 'host', winkel: sh.name });
        return;
      }
      if (CFG.name !== 'gast') { await sleep(30000); uitslag('winkel', true, { rol: 'gast', wie: CFG.name }); return; }
      const SH = await imp('shopui'), SV = await imp('savegame'), Sp = await imp('shops'); const ms = noodMelding();
      await sleep(12000); const money0 = w.money, near = Sp.nearestShop(w);
      await b.press('e', 150); await sleep(1500);
      const open = SH.isShopOpen(); shot('winkel-gast');
      let gekocht = null;
      if (open) {
        const items = [...document.querySelectorAll('#shop-menu .sm-item')].filter((x) => x.getAttribute('aria-disabled') !== 'true');
        if (items[0]) { items[0].click(); await sleep(500); const buy = document.querySelector('#shop-menu .sm-buy'); if (buy) { buy.click(); await sleep(700); } }
        gekocht = { uitgegeven: money0 - w.money };
        await b.press('escape', 120); await sleep(900);
      }
      let save = null; try { SV.saveGame(w, { toast: false }); await sleep(300); const d = SV.readSave(); save = d ? { money: d.money } : null; } catch (e) { save = { fout: String(e.message || e) }; }
      uitslag('winkel', open && !SH.isShopOpen(), { rol: 'gast', open, near: near ? near.name + ':' + near.type : null, gekocht, save, meldingen: ms.slice(-3) });
      await sleep(8000);
    },
    // 8. de host opent het pauzemenu en de kaart; de gasten spelen door
    async pauze() {
      const w = W();
      if (isHost()) {
        await sleep(3000); await esc(); await sleep(1500);
        const open1 = !!document.querySelector('#pause-menu.visible'); shot('pauze-menu-host');
        let kaart = false; const knop = document.querySelector('#pause-menu .ra[data-goto="map"]') || document.querySelector('#pause-menu [data-goto="map"]');
        if (knop) { knop.click(); await sleep(1500); kaart = !!document.querySelector('#pause-menu [data-panel="map"]:not([hidden])'); shot('pauze-kaart-host'); }
        await sleep(12000);
        const hold = { paused: !!w.paused, menu: !!document.querySelector('#pause-menu.visible') };
        await closeMenu(); await sleep(2000);
        uitslag('pauze', open1, { rol: 'host', open1, kaart, hold, nu: { paused: !!w.paused } });
        return;
      }
      await sleep(4000);
      const p0 = [w.player.x, w.player.y]; const m = await loop(12, { hoek: Math.PI / 3, rennen: false });
      const ok = m >= 6; shot('pauze-gast-' + CFG.name);
      uitslag('pauze', ok, { rol: 'gast', wie: CFG.name, m, pauzeHost: !!(w.coopScene && w.coopScene.pauze), paused: !!w.paused, start: p0.map(Math.round) });
      await sleep(4000);
    },
    // 9. de host draagt het spel over aan gast 1
    async overdragen() {
      const w = W(); const t0 = performance.now(); const rolVoor = isHost();
      if (rolVoor) {
        const sl = await haal('slot-gast');
        const mm = noodMelding(); mm.length = 0;
        await esc(); await until(() => document.querySelector('.ra[data-goto="spel"]'), 8000, 'rail Spel'); document.querySelector('.ra[data-goto="spel"]').click(); await sleep(400);
        await until(() => document.querySelector('#pause-menu [data-of="spel"][data-subtab="spelers"]'), 8000, 'tab Spelers'); document.querySelector('#pause-menu [data-of="spel"][data-subtab="spelers"]').click(); await sleep(1500);
        const knop = await until(() => document.querySelector(`#pause-menu [data-geef="${sl}"]`), 8000, 'knop Spel overdragen'); shot('overdragen-menu');
        knop.click(); log('overdragen-gevraagd', { slot: sl });
        await sleep(1500); await closeMenu(); await sleep(6000); log('overdragen-na-klik', { meldingen: mm.slice(-4), wissel: !!w.coopWissel, ui: w.coopWisselUi ? JSON.stringify(w.coopWisselUi).slice(0, 200) : null, paused: !!w.paused, inVoertuig: !!(w.player && w.player.inVehicle) });
      } else if (CFG.name === 'gast') {
        const k = await until(() => document.querySelector('.coop-wissel [data-wissel="ja"]'), 40000, 'de vraag Het spel overnemen?'); shot('overdragen-vraag-gast'); await sleep(1200); k.click(); log('overdragen-ja', {});
      }
      // wacht tot de rollen gewisseld zijn: gast = host, host = gast, gast 2 sluit vanzelf aan bij de nieuwe host
      let gewisseld = false;
      for (let i = 0; i < 360 && !gewisseld; i++) {
        const n = net();
        if (CFG.name === 'gast') gewisseld = !!n && n.role === 'host' && !w.coopWissel;
        else if (CFG.name === 'host') gewisseld = !!n && n.role === 'client' && !!n.session && n.session.joined && !w.coopWissel;
        else { if (i % 4 === 0) haalCache.rol = await haal('rol-gast'); gewisseld = haalCache.rol === 'host' && !!n && n.role === 'client' && !!n.session && n.session.joined; }
        if (!gewisseld) await sleep(500);
      }
      await sleep(4000); await publiceer(); shot('overdragen-klaar-' + CFG.name);
      uitslag('overdragen', gewisseld, { rol: isHost() ? 'host' : 'gast', wie: CFG.name, voorHost: rolVoor, naHost: isHost(), slot: mijnSlot(), wachtS: Math.round((performance.now() - t0) / 1000), roster: (w.coopRoster || []).map((r) => [r.slot, r.verbinding]) });
    },
    // 10. de nieuwe host zet iemand eruit (gast 2); die probeert daarna weer aan te sluiten
    async kick() {
      const w = W();
      if (isHost()) {
        const sl = await haal('slot-gast2'); const voor = (w.coopRoster || []).length;
        await esc(); await until(() => document.querySelector('.ra[data-goto="spel"]'), 8000, 'rail Spel'); document.querySelector('.ra[data-goto="spel"]').click(); await sleep(400);
        await until(() => document.querySelector('#pause-menu [data-of="spel"][data-subtab="spelers"]'), 8000, 'tab Spelers'); document.querySelector('#pause-menu [data-of="spel"][data-subtab="spelers"]').click(); await sleep(1500);
        const k = await until(() => document.querySelector(`#pause-menu [data-eruit="${sl}"]`), 8000, 'knop eruit zetten'); shot('kick-menu');
        k.click(); await sleep(600); const k2 = await until(() => document.querySelector(`#pause-menu [data-eruit="${sl}"]`), 4000, 'bevestigen'); k2.click(); await sleep(2500);
        await closeMenu(); await sleep(3000);
        // de code voor het terugkomen: het paneel Samen spelen
        await openSamen(); const code = (panel() && panel().querySelector('.coop-code') || {}).textContent; log('kick-code', { code: !!code, titel: title() }); if (code) await zet('code', code.trim()); shot('kick-samen'); await closeMenu();
        uitslag('kick', (w.coopRoster || []).length < voor, { rol: 'host', voor, na: (w.coopRoster || []).length, code: !!code });
        return;
      }
      if (CFG.name !== 'gast2') { await sleep(25000); uitslag('kick', true, { rol: 'gast', wie: CFG.name, roster: (w.coopRoster || []).length }); return; }
      for (let i = 0; i < 60 && net(); i++) await sleep(500);
      const eruit = !net(); shot('kick-gast2'); log('kick-gast2', { eruit, rol: W().coopRole || null, melding: (window.__ptMsgs || []).slice(-2), titel: document.querySelector('.coop-hold') ? 'hold' : '' });
      await sleep(6000);
      // terug aansluiten met de code van de nieuwe host
      let code = null; for (let i = 0; i < 40 && !code; i++) { code = await haal('code'); await sleep(500); }
      let terug = false, fout = null;
      try {
        if (code) {
          await openSamen(); if (buttons().includes('kies-gast')) await act('kies-gast');
          const input = await until(() => panel().querySelector('.coop-input'), 8000, 'invoerveld'); input.value = code; input.dispatchEvent(new Event('input', { bubbles: true }));
          await act('koppel'); await sleep(2500); await act('akkoord'); await until(() => title() === 'Je speelt samen', 90000, 'opnieuw verbonden'); await sleep(1500); await closeMenu(); terug = true;
        }
      } catch (e) { fout = String(e.message || e).slice(0, 200); }
      await publiceer(); shot('kick-terug-gast2');
      uitslag('kick', eruit && terug, { rol: 'gast', wie: 'gast2', eruit, terug, code: !!code, fout, slot: mijnSlot() });
    },
    // 11. een gast valt weg en komt terug (de oude host, nu een gast)
    async uitval() {
      const wie = (await haal('rol-host')) === 'host' ? 'gast2' : 'host'; // de oude host als de overdracht gelukt is, anders gast 2
      if (CFG.name === wie) { await PHASES.uitval({ s: 9, wie }); const n = net(); uitslag('uitval', !!n && n.session && n.session.status !== 'lost', { rol: 'gast', status: n && n.session ? n.session.status : null, joined: !!(n && n.session && n.session.joined) }); return; }
      const w = W(); let lost = false; const t0 = performance.now();
      while (performance.now() - t0 < 28000) { if ((w.coopRoster || []).some((r) => r.verbinding === 'lost')) lost = true; await sleep(200); }
      uitslag('uitval', lost || !isHost(), { rol: isHost() ? 'host' : 'gast', wie: CFG.name, lostGezien: lost, roster: (w.coopRoster || []).map((r) => [r.slot, r.verbinding]) });
    },
    // 12. vrij rondlopen, ver uit elkaar (losse groepen): de host (nu: wie het spel opende) zet de gasten op 500 m en ver weg
    async vrij() {
      const w = W(), s = CFG.roamS || 600;
      let gasten = [];
      if (isHost()) {
        const Net = await imp('coopnet'), Co = await imp('companion'), p = w.player, map = w.map;
        gasten = lichamen();
        const doelen = [[p.x + 520, p.y], [p.x - 300, p.y + 560], [p.x + 100, p.y - 700]];
        const plek = async (o, d) => {
          plaats(o.l, d[0], d[1]); const t0 = performance.now(); let geladenNa = null;
          while (performance.now() - t0 < 40000) { if (Net.tegelGeladen(w, o.l.x, o.l.y) && w.coopFoci) { geladenNa = Math.round((performance.now() - t0) / 100) / 10; break; } await sleep(200); }
          let m = [o.l.x, o.l.y]; try { const rd = map.roadsNear(o.l.x, o.l.y, 600).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.width >= 3); if (rd.length) m = rd[0].pts[Math.floor(rd[0].pts.length / 2)]; } catch (e) { /* geen wegen */ }
          for (let r = 0, ok = false; r < 120 && !ok; r += 6) for (let k = 0; k < 8 && !ok; k++) { const x = m[0] + Math.cos(k * Math.PI / 4) * r, y = m[1] + Math.sin(k * Math.PI / 4) * r; if (Co.figuurVrij(x, y, w)) { plaats(o.l, x, y); ok = true; } }
          return { slot: o.slot, geladenNa, op: pos(o.l), afHost: Math.round(Math.hypot(o.l.x - p.x, o.l.y - p.y)) };
        };
        const res = []; for (let i = 0; i < gasten.length; i++) res.push(await plek(gasten[i], doelen[i]));
        log('vrij-start', { gasten: res, host: pos(p) });
      }
      await sleep(3000);
      const t0 = performance.now(); let k = 0; const afstanden = []; let terugzet = 0, minAfstand = 1e9;
      const lopen = loop(s, { hoek: [-0.4, 1.9, 4][['host', 'gast', 'gast2'].indexOf(CFG.name)] ?? 0 });
      const meter = (async () => {
        while (performance.now() - t0 < s * 1000) {
          await sleep(30000);
          if (isHost()) {
            const ls = lichamen(), p = w.player; const d = ls.map((o) => Math.round(Math.hypot(o.l.x - p.x, o.l.y - p.y)));
            let mn = 1e9; for (let i = 0; i < ls.length; i++) { mn = Math.min(mn, d[i]); for (let j = i + 1; j < ls.length; j++) mn = Math.min(mn, Math.hypot(ls[i].l.x - ls[j].l.x, ls[i].l.y - ls[j].l.y)); }
            minAfstand = Math.min(minAfstand, mn); afstanden.push(Math.round(mn));
            log('vrij-sample', { t: Math.round((performance.now() - t0) / 1000), afHost: d, minOnderling: Math.round(mn), tegels: w.map && w.map.resident ? w.map.resident.size : null, foci: w.coopFoci ? w.coopFoci.length : 1, voertuigen: w.vehicles.length, voetgangers: w.pedestrians.length, pos: [pos(p), ...ls.map((o) => pos(o.l))] });
          } else log('vrij-sample', { t: Math.round((performance.now() - t0) / 1000), pos: pos(w.player), paused: !!w.paused, coopHold: !!w.coopHold, status: net() && net().session ? net().session.status : null });
          if (++k % 4 === 2) shot('vrij-' + CFG.name + '-' + k);
        }
      })();
      const m = await lopen; await meter;
      uitslag('vrij', m > 50, { rol: isHost() ? 'host' : 'gast', wie: CFG.name, m, minAfstand: isHost() ? Math.round(minAfstand) : null, afstanden, s });
    },
  };

  return {
    async playtest({ stappen = null, roamS = 600 } = {}) {
      CFG.roamS = roamS; startMeting();
      const lijst = (stappen || ['opening', 'lopen', 'gastrijdt', 'passagier', 'missie', 'hengelen', 'winkel', 'pauze', 'overdragen', 'kick', 'uitval', 'vrij']);
      haalCache.rol = null; await publiceer();
      for (const n of lijst) {
        if (n === 'lopen') { await bar('meting-begin'); log('meting-begin', { scene: await sceneStand(), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }); }
        if (!S[n]) { log('stap-onbekend', { n }); continue; }
        await stap(n, S[n]);
      }
      log('meting-eind', { scene: await sceneStand(), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null });
      if (metingTimer) clearInterval(metingTimer);
      await bar('einde');
    },
  };
};
