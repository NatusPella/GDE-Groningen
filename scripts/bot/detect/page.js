// Page-kant van de detectoren en de chaos-verstoringen van de proefspeler (docs/PROEFSPELER.md). run.mjs plakt dit bestand als
// window.__botDetectPage (een uitdrukking, geen module) naast window.__botDetect (detect/dom.mjs, console.mjs, frametijd.mjs);
// bot.page.js roept `Dt = window.__botDetectPage.maak({ ... })` aan, dan `Dt.tick(s)` elke ronde (goedkoop, synchroon) en
// `await Dt.werk(s)` (chaos en de flikkercontrole; geeft true als de bot daarna opnieuw moet plannen) en `Dt.eind()` aan het eind.
// Wat dit logt (alle regels in events.jsonl): detect (dom), console, consoletelling, hitch, hitchtelling, tekst, plekprobe, bereik,
// rivaal, chaos, chaos-herstel, flikker. De pure oordelen zitten in scripts/bot/detect/*.mjs en worden na de run gedaan (droog getest).
// Alles hier is best-effort: een fout in een detector mag de bot nooit stoppen (elke tak in try/catch) en logt hooguit 'detect-fout'.
(function () {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const r1 = (v) => Math.round(v * 10) / 10;

  function maak(ctx) {
    const { B, world, player, CFG, imp } = ctx;
    const D = window.__botDetect;
    if (!D) { B.log('detect', { soort: 'fout', wat: 'window.__botDetect ontbreekt: start via scripts/bot/run.mjs' }); return null; }
    const mem = { domT: -99, gezien: new Set(), domN: 0, tekst: null, plekT: -99, doelSleutel: '', bereikT: -99, rivT: -99, flikN: 0, flikT: -99, chaosKlaar: false, chaosWacht: null, actiefSinds: null, fouten: 0 };
    let S3 = null, TP = null, Un = null, R = null, SG = null, Ch = null;
    const stapId = () => { try { return B.status().story.id || ''; } catch (e) { return ''; } };
    const fout = (wat, e) => { if (mem.fouten++ < 5) B.log('detect-fout', { wat, msg: String(e && e.message || e).slice(0, 160) }); };

    // --- console en frametijd: vanaf de start ---------------------------------------------------------------------------
    const verz = new D.ConsoleVerzamelaar({ log: (t, o) => B.log(t, { ...o, stap: stapId(), plek: plekNu() }), tijd: () => B.time() });
    try { verz.haak(window); } catch (e) { fout('console', e); }
    const hitch = new D.HitchMeter({
      raf: (f) => window.requestAnimationFrame(f),
      log: (t, o) => B.log(t, { ...o }),
      plek: () => { try { const p = B.player; return { x: Math.round(p.x), y: Math.round(p.y), stap: stapId(), v: p.inVehicle ? r1(p.inVehicle.speed || 0) : 0 }; } catch (e) { return null; } },
      pending: () => { try { return S3 && S3.streamPending ? S3.streamPending() : null; } catch (e) { return null; } },
      sectie: () => { try { const h = window.__hitch && window.__hitch.summary && window.__hitch.summary(); const sl = h && h.slow && h.slow[h.slow.length - 1]; return sl && sl.top && sl.top[0] ? String(sl.top[0]).split(' ')[0] : null; } catch (e) { return null; } },
    });
    hitch.start();
    (async () => { try { S3 = await imp('scene3d'); TP = await imp('tileplace'); Un = await imp('util'); R = await imp('routing'); } catch (e) { fout('imports', e); } })();

    function plekNu() { try { return [Math.round(player.x), Math.round(player.y)]; } catch (e) { return null; } }

    // --- verstoringen die al bij de start gelden: klok, weer, invoer ------------------------------------------------------
    function start() {
      try {
        if (Number.isFinite(CFG.klok)) { world.clock = CFG.klok; B.log('perturbatie', { as: 'tijd', klok: CFG.klok }); }
        if (CFG.weer && CFG.weer !== 'helder') {
          const w = world.weather || (world.weather = {});
          const soort = CFG.weer === 'regenbui' ? 'regenbui' : CFG.weer === 'onweer' ? 'onweer' : 'motregen';
          w.active = true; w.kind = soort; w.intensity = CFG.weer === 'regenbui' ? 0.6 : 0.85; w.timer = 1e9; w.duration = 1e9; w.elapsed = 0;
          B.log('perturbatie', { as: 'weer', soort, noot: CFG.weer === 'mist' ? 'mist heeft geen eigen schakelaar in weather.js: gelijkgesteld aan motregen; echt te beoordelen alleen in het spel' : '' });
        }
        if (CFG.invoer === 'controller') { document.documentElement.classList.add('pad-active'); B.log('perturbatie', { as: 'invoer', waarde: 'controller', noot: 'alleen de prompts (pad-active); geen echte controller' }); }
      } catch (e) { fout('start', e); }
    }
    // de klok vastzetten: een dag- of nachtrun blijft dag of nacht
    function klokVast() { if (Number.isFinite(CFG.klok) && Math.abs((world.clock || 0) - CFG.klok) > 0.2) world.clock = CFG.klok; }

    // --- de toestand voor chaos en vergelijking -------------------------------------------------------------------------
    function staat(s) {
      const t = s.target || {};
      return { stap: s.story.id || '', fase: s.mission.stage || '', doelNaam: t.name || '', doelX: t.x, doelY: t.y, afstand: t.distance ?? null, voortgangDone: s.story.done ?? null, voortgangTotal: s.story.total ?? null, geld: Math.round(s.player.money || 0), gezocht: s.wanted || 0, voertuig: s.player.vehicle ? s.player.vehicle.kind : 'te voet', missieActief: !!s.mission.active, fails: s.story.fails || 0, gezondheid: s.player.health, t: s.t };
    }

    // --- de plekprobe: wat staat er om de speler heen (voor wereldcontext en bereikbaarheid) ----------------------------------------
    const ring = (x, y, r, n = 8) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r]);
    function binnenGebouw(x, y) { try { return !!(TP && TP.buildingAt(world.map, x, y)); } catch (e) { return null; } }
    function inWater(x, y) { try { return !!Un.isInWater(world.map, x, y); } catch (e) { return null; } }
    function gebouwNabij(x, y) { if (binnenGebouw(x, y)) return 0; for (const r of [8, 15, 25, 40, 60, 80]) if (ring(x, y, r).some(([a, b]) => binnenGebouw(a, b))) return r; return TP ? 80 : null; }
    function waterNabij(x, y) { if (inWater(x, y)) return 0; for (const r of [10, 25, 50, 100, 200]) if (ring(x, y, r, 12).some(([a, b]) => inWater(a, b))) return r; return Un ? 200 : null; }
    function wegNabij(x, y) { try { const m = world.map; if (!m.nearestRoadPoint) return null; const p = m.nearestRoadPoint(x, y, 60, false); return p ? Math.round(Math.hypot(p.x - x, p.y - y)) : 60; } catch (e) { return null; } }
    function plekProbe(x, y) { return { binnen: binnenGebouw(x, y), gebouwNabijM: gebouwNabij(x, y), waterNabijM: waterNabij(x, y), wegNabijM: wegNabij(x, y) }; }

    // het doel op het land: staat een wandelaar er vrij, en zo niet, waar is de dichtstbijzijnde vrije plek (tot 40 m)
    function bereikProbe(s) {
      const t = s.target; if (!t) return null;
      const vrij = (x, y) => (ctx.footFree ? ctx.footFree(x, y) : true);
      const p = { inWater: inWater(t.x, t.y), inGebouw: binnenGebouw(t.x, t.y), vrij: vrij(t.x, t.y), luchtM: Math.round(Math.hypot(t.x - s.player.x, t.y - s.player.y)) };
      if (!p.vrij) { p.dichtstbijVrijM = null; for (const r of [2, 4, 6, 10, 20, 40]) if (ring(t.x, t.y, r, 12).some(([a, b]) => vrij(a, b) && !inWater(a, b))) { p.dichtstbijVrijM = r; break; } } else p.dichtstbijVrijM = 0;
      try {
        if (R && R.findWalkPath && !s.player.vehicle) { const w = R.findWalkPath(world.map, s.player.x, s.player.y, t.x, t.y); p.routeGevonden = !!w; if (w && w.pts) { let l = 0; for (let i = 1; i < w.pts.length; i++) l += Math.hypot(w.pts[i][0] - w.pts[i - 1][0], w.pts[i][1] - w.pts[i - 1][1]); p.routeLengteM = Math.round(l); } }
      } catch (e) { /* geen route-informatie */ }
      return p;
    }

    // --- tekst: wat de speler leest en hoe lang het in beeld staat ---------------------------------------------------------
    function tekstTick(s) {
      const sub = s.hud && s.hud.subtitle;
      const nu = sub && sub.text ? { bron: sub.source || 'ondertitel', spreker: sub.speaker || '', tekst: sub.text } : null;
      const m = mem.tekst;
      const zelfde = m && nu && m.tekst === nu.tekst && m.spreker === nu.spreker;
      if (m && !zelfde) {
        B.log('tekst', { t: r1(m.t), tot: r1(s.t), bron: m.bron, spreker: m.spreker, tekst: m.tekst.slice(0, 300), stap: m.stap, zichtbaarS: r1(s.t - m.t), x: m.x, y: m.y });
        mem.tekst = null;
      }
      if (nu && !mem.tekst) {
        mem.tekst = { ...nu, t: s.t, stap: s.story.id || '', x: Math.round(s.player.x), y: Math.round(s.player.y) };
        // een nieuwe scene (de vorige regel is meer dan 10 s geleden): meet de plek, voor de wereldcontext-check
        if (s.t - mem.plekT > 10 && TP) { mem.plekT = s.t; B.log('plekprobe', { stap: s.story.id || '', bron: nu.bron, x: Math.round(s.player.x), y: Math.round(s.player.y), tekst: nu.tekst.slice(0, 300), probe: plekProbe(s.player.x, s.player.y) }); }
      }
    }

    // --- tegenstanders (races): snelheid van speler en rivalen elke seconde ---------------------------------------------------
    function rivalTick(s) {
      const race = world.race; if (!race || !Array.isArray(race.rivals) || s.t - mem.rivT < 1) return;
      mem.rivT = s.t;
      const pv = s.player.vehicle ? s.player.vehicle.speed : 0;
      const rivalen = race.rivals.slice(0, 8).map((q) => { const c = q.car || q; return { v: r1(Math.abs(c.speed ?? q.speed ?? 0)), x: Math.round(c.x ?? q.x ?? 0), y: Math.round(c.y ?? q.y ?? 0), voorsprong: Number.isFinite(q.prog) && Number.isFinite(race.playerProg) ? Math.round((q.prog - race.playerProg) * (race.track && race.track.length ? race.track.length : 1)) : undefined }; });
      B.log('rivaal', { stap: s.story.id || '', speler: { v: r1(pv), x: Math.round(s.player.x), y: Math.round(s.player.y) }, rivalen });
    }

    // --- de DOM-audit ----------------------------------------------------------------------------------------------------------
    function domTick(s) {
      if (s.t - mem.domT < 5 || s.blocking.loading) return;
      mem.domT = s.t;
      const snap = D.snapshotDom(document, window);
      const items = D.dedupeDom(D.auditDom(snap)).filter((i) => { const k = i.type + '|' + i.tekst; if (mem.gezien.has(k)) return false; mem.gezien.add(k); return true; });
      if (items.length && mem.domN < 150) { mem.domN++; B.log('detect', { soort: 'dom', stap: s.story.id || '', plek: [Math.round(s.player.x), Math.round(s.player.y)], scherm: [snap.vw, snap.vh], items: items.slice(0, 12) }); }
    }
    // een oogmoment vraagt om een directe audit (de beelden staan er dan ook bij)
    function oogDom(s, shot) {
      try {
        const snap = D.snapshotDom(document, window), items = D.dedupeDom(D.auditDom(snap));
        if (items.length && mem.domN < 150) { mem.domN++; B.log('detect', { soort: 'dom', stap: s.story.id || '', plek: [Math.round(s.player.x), Math.round(s.player.y)], scherm: [snap.vw, snap.vh], shot, items: items.slice(0, 12) }); }
      } catch (e) { fout('oogDom', e); }
    }

    // --- tick: elke ronde van de bot, goedkoop en synchroon ---------------------------------------------------------------
    function tick(s) {
      try { klokVast(); domTick(s); tekstTick(s); rivalTick(s); } catch (e) { fout('tick', e); }
      try {
        const t = s.target, sleutel = t ? `${t.name}|${Math.round(t.x / 5)}|${Math.round(t.y / 5)}` : '';
        if (sleutel && sleutel !== mem.doelSleutel && s.t - mem.bereikT > 5 && !s.blocking.cinematic && !s.blocking.loading) {
          mem.doelSleutel = sleutel; mem.bereikT = s.t;
          B.log('bereik', { stap: s.story.id || '', doel: { x: t.x, y: t.y, naam: t.name || '' }, voertuig: s.player.vehicle ? s.player.vehicle.kind : 'te voet', probe: bereikProbe(s) });
        } else if (!sleutel) mem.doelSleutel = '';
      } catch (e) { fout('bereik', e); }
      // een chaos-verstoring die herstel afwacht
      try { chaosHerstel(s); } catch (e) { fout('herstel', e); }
    }

    // --- chaos: verstoringen midden in een stap ---------------------------------------------------------------------------------
    function herstelOk(c, s) {
      const nu = staat(s);
      if (nu.stap !== c.voor.stap || nu.fails > c.voor.fails) return true;
      if (c.soort === 'sterf') return !s.blocking.respawn && s.player.health > 0 && s.t - c.t > 4;
      if (Number.isFinite(c.voor.afstand) && Number.isFinite(nu.afstand)) return nu.afstand < Math.max(30, c.voor.afstand * 0.8) && s.t - c.t > 8;
      return s.t - c.t > 30 && !!s.mission.active;
    }
    function chaosHerstel(s) {
      const c = mem.chaosWacht; if (!c) return;
      if (herstelOk(c, s)) { B.log('chaos-herstel', { soort: c.soort, na: staat(s), seconden: r1(s.t - c.t) }); mem.chaosWacht = null; }
      else if (s.t - c.t > (CFG.chaosHerstelS || 120)) { B.log('chaos-geen-herstel', { soort: c.soort, na: staat(s) }); mem.chaosWacht = null; }
    }

    async function chaos(s) {
      const c = CFG.chaos; if (!c || mem.chaosKlaar) return false;
      if (!s.mission.active) { mem.actiefSinds = null; return false; }
      if (mem.actiefSinds == null) mem.actiefSinds = s.t;
      if (s.t - mem.actiefSinds < (c.na || 20) || s.blocking.cinematic || s.blocking.banner || s.blocking.talk || s.blocking.respawn) return false;
      const voor = staat(s), basis = { soort: c.soort, stap: s.story.id || '', plek: plekNu(), voor, tekstDoel: s.hud && s.hud.objective || '' };
      mem.chaosKlaar = true;
      try {
        if (c.soort === 'sterf') {
          const v = player.inVehicle; if (v) v.health = 0; player.health = 0;
          await sleep(3000); B.log('chaos', { ...basis, na: staat(B.status()) });
        } else if (c.soort === 'voertuig-uit') {
          if (!player.inVehicle) { B.log('chaos', { ...basis, overgeslagen: 'speler zit niet in een voertuig' }); mem.chaosKlaar = true; return false; }
          B.stick(0, 0); await ctx.keyTap('e', 240); await sleep(1500); B.log('chaos', { ...basis, na: staat(B.status()) });
        } else if (c.soort === 'gebied-uit') {
          B.stick(0, 0); const dx = 600; if (player.inVehicle) { player.inVehicle.x += dx; } player.x += dx; await sleep(2500);
          B.log('chaos', { ...basis, verplaatstM: dx, na: staat(B.status()), noot: 'een sprong van 600 m: een benadering van het gebied verlaten (geen echte wandeling)' });
        } else if (c.soort === 'save-load') {
          if (!SG) SG = await imp('savegame');
          const ok1 = SG.saveGame(world, { toast: false, manual: true }); await sleep(600);
          const info = SG.readSaveInfo(SG.currentSlot());
          const ok2 = info && info.data ? SG.applySave(world, info.data) : false;
          await sleep(3000);
          B.log('chaos', { ...basis, opgeslagen: !!ok1, geladen: !!ok2, na: staat(B.status()), ...(ok2 ? {} : { fout: 'laden mislukte (' + (info && info.state || 'geen save') + ')' }) });
        } else if (c.soort === 'snelreis') {
          if (!Ch) Ch = await imp('cheats');
          const reden = Ch.blockedReason(world, { reis: true });
          B.log('chaos', { ...basis, geweigerd: !!reden, reden: reden || '', na: voor, noot: 'de bot reist niet echt: hij vraagt alleen of het spel de snelreis nu toestaat' });
        } else { B.log('chaos', { ...basis, overgeslagen: 'onbekende verstoring' }); return false; }
      } catch (e) { B.log('chaos', { ...basis, fout: String(e && e.message || e).slice(0, 200) }); }
      if (!['snelreis', 'save-load'].includes(c.soort)) mem.chaosWacht = { soort: c.soort, voor, t: B.time() };
      else if (c.soort === 'save-load') B.log('chaos-herstel', { soort: 'save-load', na: staat(B.status()), seconden: 3 });
      return true;
    }

    // --- flikkercontrole: bij een stilstaande camera a, b (camera een fractie gedraaid) en c (terug) ------------------------------------
    async function flikker(s) {
      if (!CFG.flikker || mem.flikN >= (CFG.flikker || 3) || s.t - mem.flikT < 60 || s.blocking.cinematic || s.blocking.banner || s.blocking.talk || s.blocking.loading || s.blocking.paused) return false;
      if (s.player.vehicle && Math.abs(s.player.vehicle.speed || 0) > 0.3) return false;
      if (ctx.stilS && ctx.stilS() < 3) return false;
      mem.flikT = s.t; mem.flikN++;
      const naam = `${s.story.id || 'x'}-fl${mem.flikN}`;
      const yaw0 = world.camYaw;
      B.stick(0, 0);
      B.shot(`${naam}-a`); await sleep(700);
      if (typeof yaw0 === 'number') world.camYaw = yaw0 + 0.0009;
      await sleep(500); B.shot(`${naam}-b`); await sleep(700);
      if (typeof yaw0 === 'number') world.camYaw = yaw0;
      await sleep(500); B.shot(`${naam}-c`); await sleep(500);
      B.log('flikker', { shot: naam, stap: s.story.id || '', plek: plekNu(), camYaw: typeof yaw0 === 'number' ? yaw0 : null });
      return true;
    }

    async function werk(s) {
      try { if (await chaos(s)) return true; } catch (e) { fout('chaos', e); }
      try { if (await flikker(s)) return true; } catch (e) { fout('flikker', e); }
      return false;
    }

    function eind() {
      try {
        B.log('consoletelling', verz.telSamen());
        B.log('hitchtelling', { ...hitch.telling });
        hitch.stop();
      } catch (e) { fout('eind', e); }
    }

    start();
    return { tick, werk, eind, oogDom, plekProbe, bereikProbe, staat, verz, hitch };
  }

  return { maak };
})()
