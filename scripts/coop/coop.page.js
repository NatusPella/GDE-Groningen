// Pagina-kant van de coöp-testbank (scripts/coop/testbank.mjs, #95): lopende body van --perf-script.
// window.__coopCfg = { name, role: 'host'|'gast', route: 'direct'|'kamer', code, durationS, viaMenu, expect, program, trackerPort, ... } staat ervoor.
// Doet wat een speler doet: hoofdmenu, 'Samen spelen', knoppen van de lobby, kamer-/koppelcode. Alles komt als
// [bot-log]-regels in het events-bestand van deze instantie; de testbank leest ze.
//
// Na het verbinden loopt een programma van fasen (CFG.program = [[seconden na "iedereen erbij", fase, argumenten], ...]).
// Elke fase is een functie in PHASES; ze loggen wat ze zagen. Een achtergrondmeter logt elke seconde een 'sample'.
// Waar de spelbot nodig is (de host speelt het verhaal), staat zijn code in window.__botMain (testbank voegt bot.page.js toe).
const CFG = window.__coopCfg || {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
const log = (type, data = {}) => console.log('[bot-log] ' + JSON.stringify({ t: Math.round(performance.now() - t0) / 1000, wall: Date.now(), type, who: CFG.name, ...data }));
const imp = (f) => import('/js/' + f + '.js');
window.addEventListener('error', (e) => log('jserror', { msg: String(e.message).slice(0, 160), file: String(e.filename || '').split('/js/').pop(), line: e.lineno, stack: e.error && e.error.stack ? String(e.error.stack).split(String.fromCharCode(10)).slice(0, 4).join(' | ').slice(0, 400) : '' }));
window.addEventListener('unhandledrejection', (e) => log('jserror', { msg: 'belofte afgewezen: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200) }));

// ---- wat verlaat deze pagina? Voor de toestemming: vóór "Akkoord" geen WebSocket, geen RTCPeerConnection, geen fetch naar buiten.
const NET = { ws: [], rtc: 0, fetch: [] };
{
  const WS = window.WebSocket, RTC = window.RTCPeerConnection, F = window.fetch;
  if (WS) window.WebSocket = class extends WS {
    constructor(u, p) {
      NET.ws.push(String(u)); super(u, p);
      // wat komt er van de tracker binnen? (alleen soort en grootte, niet de inhoud)
      this.addEventListener('message', (e) => { let m = null; try { m = JSON.parse(String(e.data)); } catch (er) { /* geen JSON */ } log('ws-in', { len: String(e.data).length, action: m && m.action, offer: !!(m && m.offer), answer: !!(m && m.answer), idOk: !!(m && m.offer_id) }); });
      this.addEventListener('close', () => log('ws-dicht', {}));
      this.addEventListener('error', () => log('ws-fout', {}));
    }
  };
  if (RTC) window.RTCPeerConnection = class extends RTC {
    constructor(...a) {
      NET.rtc++; super(...a);
      // wat gebeurt er met de verbinding? (geen adressen in het log: alleen het soort kandidaat)
      const soort = (c) => { const m = /typ (w+)/.exec(c || ''), ip = /(?:^|s)(d+.d+.d+.d+|[w-]+.local)s+d+s+typ/.exec(c || ''); const adres = ip ? (/^127./.test(ip[1]) ? 'loopback' : /^(10.|192.168.|172.(1[6-9]|2d|3[01]).)/.test(ip[1]) ? 'prive' : /.local$/.test(ip[1]) ? 'mdns' : 'overig') : '?'; return (m ? m[1] : '?') + '/' + adres; };
      this.addEventListener('icecandidate', (e) => log('rtc', { kandidaat: e.candidate ? soort(e.candidate.candidate) : 'klaar' }));
      this.addEventListener('iceconnectionstatechange', () => log('rtc', { ice: this.iceConnectionState }));
      this.addEventListener('signalingstatechange', () => log('rtc', { signaling: this.signalingState }));
      this.addEventListener('datachannel', () => log('rtc', { datakanaal: 'binnen' }));
      this.addEventListener('connectionstatechange', () => log('rtc', { verbinding: this.connectionState }));
    }
  };
  if (F) window.fetch = function (u, ...a) { const s = String(u && u.url || u); if (/^https?:\/\//i.test(s) && !s.startsWith(location.origin)) NET.fetch.push(s.slice(0, 120)); return F.call(this, u, ...a); };
}
const netNow = () => ({ ws: NET.ws.length, rtc: NET.rtc, fetch: NET.fetch.length });

// de IP-route: welke verbindingen meldt het main-proces? (voor het nazoeken van dubbele of verdwenen gasten)
try { if (window.gdeDesktop && window.gdeDesktop.coop) window.gdeDesktop.coop.onEvent((k, pl) => { if (k !== 'msg') log('ipc', { k, id: pl && pl.id, state: pl && pl.state }); }); } catch (e) { /* geen brug */ }
const holdSkip = async (ms = 1400) => { const B = window.__bot; if (B) { B.down(' '); await sleep(ms); B.up(' '); } else { key(' ', 'Space'); await sleep(ms); } };
const W = () => window.__debug && window.__debug.world;
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const panel = () => document.querySelector('.pm-samen');
const title = () => { const p = panel(); const h = p && p.querySelector('.coop-title'); return h ? h.textContent.trim() : ''; };
const buttons = () => [...(panel() ? panel().querySelectorAll('[data-act]') : [])].map((b) => b.dataset.act);
async function until(fn, ms, what) {
  const end = performance.now() + ms;
  while (performance.now() < end) { try { const v = fn(); if (v) return v; } catch (e) { /* nog niet */ } await sleep(150); }
  throw new Error('time-out: ' + what + ' (scherm: ' + title() + ', fout: ' + ((panel() && panel().querySelector('.coop-error') || {}).textContent || '-') + ', knoppen: ' + buttons().join(',') + ')');
}
async function act(name, ms = 8000) {
  await until(() => panel() && panel().querySelector(`[data-act="${name}"]`), ms, 'knop ' + name);
  panel().querySelector(`[data-act="${name}"]`).click();
  await sleep(250);
}
const shot = (name) => { console.log('[capture] ' + name); };
// Escape zoals een speler (één toets via het invoercontract van de spelbot; key() zou window én document raken en dubbel tellen)
const esc = async () => { if (window.__bot) await window.__bot.press('escape', 120); else key('Escape', 'Escape'); };
const openSamen = async () => { // het pauzemenu, onderdeel Samen (zoals een speler)
  await esc();
  await until(() => document.querySelector('.ra[data-goto="samen"]'), 8000, 'rail-knop Samen');
  document.querySelector('.ra[data-goto="samen"]').click();
  await until(() => panel() && !panel().closest('[hidden]'), 5000, 'paneel Samen');
};
// terug het spel in zoals een speler: de knop Doorgaan van het overzicht (Escape in het pauzemenu gaat een stap terug)
const closeMenu = async () => {
  for (let i = 0; i < 6; i++) {
    if (!document.querySelector('#pause-menu.visible')) break; // niet op world.paused: een filmpje pauzeert de wereld ook, en Escape zou dan het menu juist openen
    const resume = [...document.querySelectorAll('#pause-menu [data-action="resume"]')].find((b) => b.offsetParent);
    if (resume) resume.click();
    else { const ov = document.querySelector('#pause-menu .ra[data-goto="overzicht"]'); if (ov && ov.getAttribute('aria-current') !== 'true') ov.click(); else await esc(); }
    await sleep(900);
  }
  log('menu-dicht', { paused: !!(W() || {}).paused, startScherm: !!document.querySelector('#start-screen.visible'), pauzemenu: !!document.querySelector('#pause-menu.visible'), body: document.body.className });
};

// ---- wat deze instantie ziet (elke seconde)
let state = { allIn: false, phase: '' };
// beeldsnelheid van deze pagina: frames per seconde en de langste tussentijd van de laatste seconde
const FPS = { n: 0, t: performance.now(), prev: performance.now(), gap: 0, fps: 0, gapLast: 0 };
const tickFps = (now) => { FPS.n++; const g = now - FPS.prev; FPS.prev = now; if (g > FPS.gap) FPS.gap = g; if (now - FPS.t >= 1000) { FPS.fps = Math.round(FPS.n * 1000 / (now - FPS.t)); FPS.gapLast = Math.round(FPS.gap); FPS.n = 0; FPS.t = now; FPS.gap = 0; } requestAnimationFrame(tickFps); };
requestAnimationFrame(tickFps);
function sampleNow(n) {
  const x = W(); if (!x) return null;
  const b = (o) => (o ? { x: Math.round(o.x * 10) / 10, y: Math.round(o.y * 10) / 10, char: o.character || '' } : null);
  const net = x.coopNet, ses = net && net.session;
  const hm = x.coopHostMissie;
  const cine = document.getElementById('cine');
  return {
    fps: FPS.fps, gap: FPS.gapLast,
    n, ph: state.phase, paused: !!x.paused, uiPaused: !!x.uiPaused, coopHold: !!x.coopHold, hold: !!document.querySelector('.coop-hold'), clock: x.time, uur: x.clock, slot: ses ? ses.slot : (net && net.role === 'host' ? 0 : -1),
    status: ses ? ses.status : (net && net.hub ? [...net.hub.sessions.entries()].map(([s, v]) => s + ':' + v.status).join(',') : null),
    inp: ses && ses.pendingInput ? [Math.round(ses.pendingInput.mx * 100) / 100, Math.round(ses.pendingInput.my * 100) / 100] : null,
    ids: net && net.hub ? [...net.hub.sessions.entries()].map(([s, v]) => s + ':' + (v.link && v.link.id)).join(',') : null,
    rtt: ses ? Math.round(ses.rtt * 1000) : (net && net.hub ? Math.round(Math.max(0, ...[...net.hub.sessions.values()].map((v) => v.rtt)) * 1000) : null),
    desync: x.coopDesync ? x.coopDesync.velden : null, desyncN: x.coopDesync ? x.coopDesync.n : 0, money: x.money, wanted: x.wanted | 0, role: x.coopRole || null,
    me: b(x.player), companion: b(x.companion), cam: x.coopCam ? 1 : 0,
    partners: (x.coopPartners || []).map((p) => [p.slot, p.naam, p.status, Math.round(p.x), Math.round(p.y)]),
    roster: x.coopRoster ? x.coopRoster.map((s) => [s.slot, s.char, s.verbinding]) : null, figuren: Object.keys(x.coopFigures || {}).length,
    sc: x.coopScene ? [x.coopScene.filmpje ? 1 : 0, x.coopScene.pauze ? 1 : 0, x.coopScene.regel ? x.coopScene.regel.tekst.slice(0, 40) : '', x.coopScene.keuze ? x.coopScene.keuze.opties.length : 0] : null, sceneEl: !!document.getElementById('coop-scene'),
    verdiend: x.coopVerdiend || 0, ri: x.coop && x.coop.remoteInput ? [Math.round(x.coop.remoteInput.mx * 100) / 100, Math.round(x.coop.remoteInput.my * 100) / 100, x.coop.remoteInput.buttons | 0] : null,
    hm: hm ? (hm.actief ? hm.label + ' | ' + (hm.stap || '') : '-') : null,
    weer: x.weatherState && x.weatherState.regions ? Object.entries(x.weatherState.regions).map(([id, r]) => id + ':' + r.kind + ':' + Math.round(r.rain * 100)).join(',') : null, wx: x.weather ? [x.weather.kind || '', Math.round((x.weather.intensity || 0) * 100)] : null, pm: (x.coopPingMarks || []).map((m) => m.tekst + '|' + m.naam).join(';'), voert: x.coopInVoertuig ? 1 : 0,
    hostMesh: x.coopHostMeshes || null, hostDbg: x.coopHostDbg || null, extra: x.coopExtraMeshes || null, extraB: x.coopExtraBytes || 0, extraS: x.coopExtra ? [x.coopExtra.voetgangers.size, x.coopExtra.uiterlijk.size, x.coopExtra.dieren.size, x.coopExtra.lichten.size, x.coopExtra.kapot.length] : null,
    hostEnt: x.coopHost ? [x.coopHost.voertuigen.length, x.coopHost.doelen.length, (x.coopHost.voetgangers || []).length] : null,
    vs: x.player && x.player.inVehicle ? [Math.round((x.player.inVehicle.speed || 0) * 10) / 10, x.player.inVehicle.wrecked ? 1 : 0, Math.round(x.player.inVehicle.health ?? -1), x.coopWielSlot ?? null] : null,
    veh: x.player && x.player.inVehicle ? 1 : 0, vehC: x.companion && x.companion.inVehicle ? 1 : 0, nVeh: (x.vehicles || []).length,
    cutscene: !!(cine && cine.classList.contains('on')), camOver: !!x.cameraOverride, cutBezig: x.coopCutBezig ?? null, gate: !!(x.coopStartGateGezien),
    cam3: x.cameraOverride && x.cameraOverride.position ? [Math.round(x.cameraOverride.position.x), Math.round(x.cameraOverride.position.y), Math.round(x.cameraOverride.position.z ?? 0)] : null,
    sub: cine && cine.querySelector('.cine-line') ? cine.querySelector('.cine-line').textContent.slice(0, 50) : '', letterbox: !!(cine && cine.classList.contains('letterbox')),
    story: window.__story && window.__story.mission ? (() => { try { const m = window.__story.mission(); return m && (m.phase || '') + ':' + (m.stage || ''); } catch (e) { return ''; } })() : '',
    net: netNow(),
  };
}
let sampler = null;
function startSampler() {
  let n = 0;
  sampler = setInterval(() => { try { const s = sampleNow(n++); if (s) log('sample', s); } catch (e) { /* even niets */ } }, 1000);
}

// ---------------------------------------------------------------- verbinden (zoals een speler)
async function configureRoute() {
  if (CFG.route !== 'kamer' || !CFG.trackerPort) return;
  // de kamercode-route naar een lokale nep-tracker, zonder STUN (host-kandidaten op de loopback): niets verlaat deze machine
  const nc = await imp('net/netconfig');
  nc.TRACKERS.splice(0, nc.TRACKERS.length, `ws://127.0.0.1:${CFG.trackerPort}`);
  nc.MQTT_BROKERS.splice(0, nc.MQTT_BROKERS.length);
  nc.ICE_SERVERS.splice(0, nc.ICE_SERVERS.length);
  nc.PEERJS.host = '127.0.0.1'; nc.PEERJS.port = 1; nc.PEERJS.secure = false;
  nc.TIMEOUTS.connect = 40000;
  log('route-ingesteld', { trackers: nc.TRACKERS.length, stun: nc.ICE_SERVERS.length });
}

async function toLobby() {
  await until(() => W() && W().player, 90000, 'world (spel geladen)');
  if (CFG.viaMenu) {
    // viaMenu: zoals een speler, met de ingang 'Samen spelen' in het hoofdmenu; het spel start en de lobby staat open
    // pas klikken als het menu zichtbaar is (zoals een speler): wie eerder klikt, krijgt het hoofdmenu later alsnog over het spel heen
    const it = await until(() => document.querySelector('#start-screen.visible .ss-item[data-act="samen"]'), 120000, 'hoofdmenu-ingang Samen spelen');
    await sleep(800);
    log('hoofdmenu', { items: [...document.querySelectorAll('#start-screen .ss-item')].map((e) => e.dataset.act).join(',') });
    shot('hoofdmenu');
    if (CFG.role === 'host' && CFG.hostSave) { // de gastheer heeft al een opgeslagen spel (met 777 euro); het is spel 1 in het scherm Opgeslagen spellen
      const sv = await imp('savegame'); W().money = 777; const okS = sv.saveGame(W(), { toast: false }); W().money = 250;
      log('host-save', { ok: okS, hasSave: sv.hasSave() }); CFG.hostSlot = 1;
    }
    it.click();
    // de menustroom (#95): Samen spelen -> Gastheer worden / Meedoen -> (gastheer) kies een opgeslagen spel of Nieuw spel
    const keuze = await until(() => document.querySelector('#samenkeuze .sk-item'), 8000, 'het scherm Samen spelen (keuze)');
    log('samenkeuze', { knoppen: [...document.querySelectorAll('#samenkeuze .sk-item')].map((b) => b.dataset.act).join(','), tekst: document.querySelector('#samenkeuze').innerText.slice(0, 300) });
    await sleep(1200); // het menu en zijn stijlen laden eerst; dan pas de schermafbeelding
    shot('samenkeuze');
    await sleep(600);
    document.querySelector('#samenkeuze [data-act="' + (CFG.role === 'host' ? 'host' : 'gast') + '"]').click();
    if (CFG.role === 'host') {
      await until(() => document.querySelector('#saveslots .ssl-card'), 8000, 'het scherm Opgeslagen spellen');
      log('spelkeuze', { titel: (document.querySelector('#ssl-title') || {}).textContent, ogen: (document.querySelector('#saveslots .m-eb') || {}).textContent, hint: (document.querySelector('#saveslots .ssl-intro') || {}).textContent, kaarten: [...document.querySelectorAll('#saveslots .ssl-card')].map((c) => c.className + ':' + (c.querySelector('.ssl-nm') || {}).textContent).join(' | ') });
      await sleep(1500);
      shot('spelkeuze');
      await sleep(600);
      if (CFG.hostSlot) { const l = document.querySelector('#saveslots .ssl-main[data-slot="' + CFG.hostSlot + '"]'); log('spelkeuze-laden', { label: (l.querySelector('.ssl-go') || {}).textContent }); l.click(); }
      else document.querySelector('#saveslots .ssl-card.empty [data-do="new"]').click();
    }
    let skipping = !CFG.watchOpening;
    (async () => { // Spatie ingedrukt houden slaat een filmpje over
      while (skipping) {
        if (W() && (W().cameraOverride || (document.getElementById('cine') && document.getElementById('cine').classList.contains('on')))) await holdSkip();
        log('wacht-opening', { cam: !!(W() && W().cameraOverride), cine: document.getElementById('cine') ? document.getElementById('cine').className : '-', paused: !!(W() && W().paused) });
        await sleep(2500);
      }
    })();
    await until(() => panel() && !panel().closest('[hidden]') && buttons().length, 480000, 'lobby na het hoofdmenu (body: ' + document.body.className + ', openSamen: ' + W().openSamenOnStart + ', camOverride: ' + !!W().cameraOverride + ', respawn: ' + !!W().pendingRespawn + ')');
    skipping = false;
    log('menu-lobby', { titel: title(), knoppen: buttons() });
    shot('lobby-start');
  } else {
    // een nieuw spel begint met een opening (een filmpje van minuten, waarin je niet kunt aansluiten: canJoin). Op een drukke computer begint die pas na
    // enkele seconden, ver na het begin van dit script; wacht dus eerst tot het spel echt loopt en de opening is begonnen (of niet komt) en sla hem dan over
    for (let i = 0; i < 100 && !document.body.classList.contains('game-started'); i++) await sleep(300);
    for (let i = 0; i < 50 && !(W().cameraOverride || W().pendingRespawn || (document.getElementById('cine') && document.getElementById('cine').classList.contains('on'))); i++) await sleep(300);
    for (let i = 0; i < 25 && W().paused; i++) { key(' ', 'Space'); await sleep(700); }
    await sleep(1500);
    for (let i = 0; i < 60 && (W().cameraOverride || W().pendingRespawn || document.getElementById('cine') && document.getElementById('cine').classList.contains('on')); i++) { if (i > 6 && i % 4 === 0) { try { window.__story.skip(true); } catch (e) { /* geen verhaal-API */ } } await holdSkip(); await sleep(300); }
    log('speelklaar', { cameraOverride: !!W().cameraOverride, respawn: !!W().pendingRespawn });
    await openSamen();
  }
}

async function connect() {
  await configureRoute();
  await toLobby();
  if (CFG.preSave && CFG.role !== 'host') { // een speler met een eigen save: die bestaat al vóór het aansluiten
    const sv = await imp('savegame'); let ok = null; try { ok = sv.saveGame(W(), { toast: false }); } catch (e) { ok = 'fout ' + e.message; }
    log('voor-save', { ok, hasSave: sv.hasSave(), money: W().money });
  }
  log('start', { role: CFG.role, route: CFG.route, viaMenu: !!CFG.viaMenu, net: netNow() });
  log('scherm', { titel: title(), knoppen: buttons() });
  if (CFG.role === 'host') {
    if (buttons().includes('kies-host')) await act('kies-host');
    log('scherm', { titel: title(), knoppen: buttons(), tekst: panel().innerText.slice(0, 400) });
    await act(CFG.route === 'kamer' ? 'route-kamer' : 'route-direct');
    // toestemming: vóór akkoord is er niets verstuurd
    const voor = netNow();
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 600), knoppen: buttons(), net: voor });
    shot('host-toestemming');
    await sleep(CFG.consentWaitMs || 2500); // en een tijd lang blijft er niets gebeuren
    log('toestemming-wacht', { net: netNow() });
    await act('akkoord');
    const code = await until(() => { const c = panel().querySelector('.coop-code'); return c && c.textContent.trim(); }, 40000, 'code van de host');
    log('code', { code, net: netNow() });
    shot('host-code');
    { const b0 = panel().querySelector('[data-act="start-spel"]'); log('start-alleen', { knop: !!b0, uit: !!(b0 && b0.disabled), tekst: panel().innerText.slice(0, 500) }); } // alleen jij: Spel starten staat uit
    await until(() => title() === 'Je speelt samen', CFG.waitS ? CFG.waitS * 1000 : 120000, 'een gast');
  } else {
    if (buttons().includes('kies-gast')) await act('kies-gast');
    log('scherm', { titel: title(), knoppen: buttons(), tekst: panel().innerText.slice(0, 500) });
    const input = await until(() => panel().querySelector('.coop-input'), 5000, 'invoerveld');
    if (CFG.tekstTest) await PHASES.tekstveld();
    input.value = CFG.code; input.dispatchEvent(new Event('input', { bubbles: true }));
    await act('koppel');
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 600), knoppen: buttons(), net: netNow() });
    await sleep(CFG.consentWaitMs || 2500);
    log('toestemming-wacht', { net: netNow() });
    await act('akkoord');
    await until(() => title() === 'Je speelt samen', 90000, 'verbinding met de host');
  }
  log('verbonden', { titel: title(), tekst: panel().innerText.slice(0, 600), net: netNow() });
  if (CFG.role === 'host' && CFG.maxSpelers) { // meer dan 8 spelers: de knop "Tot 16 spelers" staat in de lobby zodra de eerste gast er is; de rest komt pas daarna
    const knop = await until(() => panel().querySelector(`[data-act="max-${CFG.maxSpelers}"]`), 15000, 'knop max-' + CFG.maxSpelers).catch(() => null);
    if (knop) knop.click(); log('max-knop', { max: CFG.maxSpelers, gevonden: !!knop }); await sleep(400);
  }
  await sleep(1500); // de fade van het binnenkomen is dan voorbij
  shot('lobby-verbonden');
  const gateKnop = CFG.role === 'host' && panel().querySelector('[data-act="start-spel"]');
  log('wachtkamer', { rol: CFG.role, gateKnop: !!gateKnop, gateKnopUit: !!(gateKnop && gateKnop.disabled), tekst: panel().innerText.slice(0, 700) });
  if (CFG.role !== 'host' && W().coopHek) { // de gast wacht in de wachtkamer tot de ander start; het menu sluit dan vanzelf
    log('hek-gast', { tekst: panel().innerText.slice(0, 500), paused: !!W().paused, cam: !!W().cameraOverride, cine: !!(W().cameraOverride) });
    await until(() => !W().coopHek, 600000, 'de ander start het spel');
    log('hek-open-gast', { paused: !!W().paused, menu: !!document.querySelector('#pause-menu.visible') });
    await sleep(1500);
  }
  if (CFG.watchOpening && CFG.role === 'host') return; // de fase 'opening' drukt zelf op Spel starten
  if (gateKnop) { // een nieuw spel: de gastheer start het (zoals een speler); de opening begint daarna, de anderen kijken mee (of de gastheer slaat over)
    if (CFG.gateWachtMs) await sleep(CFG.gateWachtMs); // de gast leest 'Wacht tot ... het spel start' en het menu sluit pas bij het starten
    gateKnop.click(); log('spel-gestart', {});
    let skip = true; (async () => { while (skip) { if (W() && (W().cameraOverride || (document.getElementById('cine') && document.getElementById('cine').classList.contains('on')))) await holdSkip(); await sleep(2500); } })();
    await until(() => !(W().paused), 60000, 'het spel loopt na Spel starten'); // op een drukke computer duurt het laadscherm van de opening soms lang
    await sleep(1500);
    shot('spel-samen');
    setTimeout(() => { skip = false; }, 90000);
    return;
  }
  await closeMenu(); // terug het spel in
  await sleep(1500);
  shot('spel-samen');
}

// ---------------------------------------------------------------- fasen
const net = () => W() && W().coopNet;
const links = () => { // alle transporten van deze instantie (gast: één; host: één per gast)
  const n = net(); if (!n) return [];
  if (n.role === 'client') return n.session ? [n.session.link] : [];
  return [...n.hub.sessions.values()].map((s) => s.link);
};
// netwerksimulatie op de links van deze instantie (beide richtingen): vertraging (s), jitter (s), verlies (0..1), of 'cut'
function simulate(sim) {
  const rnd = () => Math.random();
  for (const link of links()) {
    if (!link.__sim) {
      let inner = link.onmessage;
      const send0 = link.send.bind(link);
      link.__sim = { cfg: {}, send0, inner: () => inner };
      Object.defineProperty(link, 'onmessage', { configurable: true, get: () => (bytes) => {
        const c = link.__sim.cfg; if (c.cut || rnd() < (c.loss || 0)) { link.__sim.dropIn = (link.__sim.dropIn || 0) + 1; return; }
        const d = (c.latency || 0) + rnd() * (c.jitter || 0);
        if (d > 0) setTimeout(() => { if (inner) inner(bytes); }, d * 1000); else if (inner) inner(bytes);
      }, set: (f) => { inner = f; } });
      link.send = (bytes) => {
        const c = link.__sim.cfg; if (c.cut) return true;
        if (rnd() < (c.loss || 0)) { link.__sim.dropOut = (link.__sim.dropOut || 0) + 1; return true; }
        const d = (c.latency || 0) + rnd() * (c.jitter || 0);
        if (d > 0) setTimeout(() => send0(bytes), d * 1000); else send0(bytes);
        return true;
      };
    }
    link.__sim.cfg = sim || {};
  }
  return links().length;
}
const simStats = () => links().map((l) => ({ in: l.__sim ? l.__sim.dropIn || 0 : 0, out: l.__sim ? l.__sim.dropOut || 0 : 0 }));

const PHASES = {
  // kijken: elke seconde een sample staat al; hier alleen wachten
  async wacht({ s = 10 }) { await sleep(s * 1000); },
  async kijk({ s = 10 }) { await sleep(s * 1000); }, // zelfde als wacht, onder een eigen fasenaam (de testbank leest er de invoer van een andere speler in)
  async shot({ name }) { shot(name); await sleep(600); },
  // vier schermafbeeldingen rondom de gast, om de voertuigen van de gastheer als modellen te zien (coopentities3d.js)
  async kijk({ naam = 'kijk' }) { const w = W(); for (let i = 0; i < 4; i++) { w.camYaw = i * Math.PI / 2; await sleep(500); shot(naam + '-' + i); await sleep(300); } },
  // water zoeken (#428): het dichtstbijzijnde water rond de gast, als plek voor de boten van de gescripte gastheer; daarna kijkt de camera erheen
  async water({ naam = 'water' }) {
    const w = W(); const { isInWater } = await import('./js/util.js');
    const me = w.player; let best = null;
    for (let r = 4; r <= 90 && !best; r += 3) for (let a = 0; a < 6.283 && !best; a += 0.15) { const x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r; if (isInWater(w.map, x, y) && isInWater(w.map, x + Math.cos(a) * 6, y + Math.sin(a) * 6)) best = { x, y, a, r }; }
    log('water', best || { geen: true });
    if (best) { w.camYaw = Math.atan2(best.y - me.y, best.x - me.x); await sleep(6000); shot(naam); await sleep(600); }
  },
  // de spelerslijst bij Tab (#377): Tab vasthouden, schermafbeelding, loslaten
  async tab({ name = 'g-tab' }) {
    for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true }));
    await sleep(900);
    const el = document.getElementById('coop-spelers');
    log('tab', { zichtbaar: !!el && getComputedStyle(el).display !== 'none', rijen: el ? el.querySelectorAll('.cs-rij').length : 0, tekst: el ? el.innerText.slice(0, 300) : '' });
    shot(name); await sleep(500);
    for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', code: 'Tab', bubbles: true }));
    await sleep(400);
    log('tab-los', { zichtbaar: !!el && getComputedStyle(el).display !== 'none' });
  },
  // het onderdeel Spelers in het pauzemenu (#377)
  async spelersmenu({ name = 'g-spelersmenu' }) {
    await esc();
    await until(() => document.querySelector('.ra[data-goto="spelers"]'), 8000, 'rail-knop Spelers');
    document.querySelector('.ra[data-goto="spelers"]').click();
    await sleep(1200);
    const p = document.querySelector('#pause-menu [data-panel="spelers"]');
    const rail = document.querySelector('#pause-menu .pm-rail .pm-game'), opsl = document.querySelector('#pause-menu [data-action="save"]');
    const first = document.querySelector('#pause-menu .pm-game .ra'), second = document.querySelectorAll('#pause-menu .pm-game .ra')[1];
    log('spelersmenu', { zichtbaar: !!p && !p.hidden, rijen: p ? p.querySelectorAll('.cs-rij').length : 0, roep: p ? p.querySelectorAll('[data-ping]').length : 0,
      rail: rail ? [rail.scrollHeight, rail.clientHeight] : null, opslaan: opsl ? Math.round(opsl.getBoundingClientRect().bottom) : null, venster: [innerWidth, innerHeight], raHoogte: first && second ? Math.round(second.getBoundingClientRect().top - first.getBoundingClientRect().top) : null, coop: document.getElementById('pause-menu').dataset.coop,
      css: first ? { hoogte: getComputedStyle(first).height, raH: getComputedStyle(document.querySelector('#pause-menu .pm-rail')).getPropertyValue('--ra-h'), lettergrootte: getComputedStyle(first).fontSize, zoom: getComputedStyle(document.getElementById('pause-menu')).zoom, spHoogte: getComputedStyle(document.querySelector('#pause-menu .pm-rail-sp')).height, mt: getComputedStyle(document.getElementById('pause-menu')).getPropertyValue('--mt') } : null });
    shot(name); await sleep(500); await closeMenu();
  },
  // bij een slecht netwerk spelen: alleen op de aangegeven instanties (args.wie)
  async netsim({ s = 20, latency = 0.12, jitter = 0.05, loss = 0.1, wie = null }) {
    if (wie && !wie.includes(CFG.name)) { await sleep(s * 1000); return; }
    const n = simulate({ latency, jitter, loss });
    log('netsim', { aan: true, links: n, latency, jitter, loss });
    await sleep(s * 1000 / 2); shot('netsim');
    await sleep(s * 1000 / 2);
    log('netsim', { aan: false, drops: simStats() });
    simulate({});
  },
  // kabel eruit: s seconden niets; daarna weer verbinden zoals een speler (de gast doet 'Opnieuw verbinden' als dat nodig is)
  async uitval({ s = 8, wie = 'gast', herstel = 'vanzelf' }) {
    if (CFG.name !== wie) { await sleep((s + 20) * 1000); return; }
    simulate({ cut: true });
    log('uitval', { begin: true, s });
    await sleep(s * 1000);
    log('uitval-midden', { hold: !!document.querySelector('.coop-hold'), uiPaused: !!(W() || {}).coopHold, paused: !!(W() || {}).paused, status: net() && net().session ? net().session.status : null });
    shot('uitval-hold');
    simulate({});
    log('uitval', { begin: false });
    if (herstel === 'vanzelf') await sleep(20000);
    shot('uitval-terug');
  },
  // de host kijkt wat er gebeurt als een gast wegvalt
  async uitvalHost({ s = 8, wie = 'gast' }) {
    if (CFG.role !== 'host') { await sleep((s + 20) * 1000); return; }
    // de fasen van gast en gastheer lopen niet gelijk (een rit duurt soms langer): wacht tot de speler echt als weg te boek staat (de gast sluit zijn verbinding 8 s)
    { const w0 = performance.now(); while (performance.now() - w0 < (s + 40) * 1000 && !(W().coopRoster || []).some((r) => r.slot === 1 && r.verbinding === 'lost')) await sleep(200); }
    await sleep(500);
    log('uitval-host', { hold: !!document.querySelector('.coop-hold'), uiPaused: !!W().coopHold, paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
    shot('uitval-host-hold');
    await sleep(21000);
    log('uitval-host-na', { hold: !!document.querySelector('.coop-hold'), uiPaused: !!W().coopHold, paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
  },
  // de verbinding van de gast gaat dicht (TCP weg): wachtscherm, 'Opnieuw verbinden', de code opnieuw invoeren, akkoord: zoals een speler
  async herverbind({ wie = 'gast' }) {
    if (CFG.name !== wie) { await sleep(28000); return; }
    const ses = net() && net().session;
    if (!ses) { log('herverbind-geen-sessie', {}); return; }
    ses.link.close();
    const hold = () => document.querySelector('.coop-hold');
    await until(hold, 20000, 'wachtscherm na het sluiten van de verbinding');
    log('herverbind-hold', { hold: true, paused: !!W().paused, coopHold: !!W().coopHold, status: ses.status });
    shot('herverbind-hold');
    const knop = (act) => hold() && hold().querySelector('[data-act="' + act + '"]');
    await until(() => knop('hervat'), 5000, 'knop Opnieuw verbinden'); knop('hervat').click(); await sleep(400);
    const veld = await until(() => hold().querySelector('.coop-input'), 5000, 'invoerveld voor de code');
    log('herverbind-code', { voorgevuld: veld.value === CFG.code });
    veld.value = CFG.code; veld.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => knop('koppel'), 5000, 'knop koppel'); knop('koppel').click(); await sleep(400);
    await until(() => knop('akkoord'), 5000, 'toestemming bij het opnieuw verbinden'); shot('herverbind-toestemming'); knop('akkoord').click();
    await until(() => !hold(), 30000, 'wachtscherm sluit na het opnieuw verbinden');
    await sleep(1500);
    log('herverbind-klaar', { hold: !!hold(), paused: !!W().paused, status: ses.status, slot: ses.slot, coopNet: !!net() });
    shot('herverbind-klaar');
  },
  async herverbindHost() {
    if (CFG.role !== 'host') { await sleep(28000); return; }
    // het opnieuw verbinden gaat snel: kijk elke 200 ms of het wachtscherm, de pauze en "weggevallen" voorbijkomen
    const z = { holdGezien: false, pauzeGezien: false, lostGezien: false };
    const end = performance.now() + 24000;
    while (performance.now() < end) {
      const x = W();
      if (document.querySelector('.coop-hold')) z.holdGezien = true;
      if (x.paused && x.coopHold) z.pauzeGezien = true;
      if ((x.coopRoster || []).some((r) => r.slot === 1 && r.verbinding === 'lost')) z.lostGezien = true;
      await sleep(200);
    }
    log('herverbind-host', { ...z, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]), hold: !!document.querySelector('.coop-hold'), paused: !!W().paused });
    log('herverbind-host-na', { hold: !!document.querySelector('.coop-hold'), paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
  },
  // een afwijking op één gast: de snapshot klopt niet met de hash van de host
  async desync({ s = 25, wie = 'gast' }) {
    if (CFG.name !== wie || !net() || net().role !== 'client') { await sleep(s * 1000); return; }
    const ses = net().session; const echt = ses.world.bind(ses);
    let hersync = 0; const rs = ses.requestResync.bind(ses); ses.requestResync = () => { hersync++; rs(); };
    ses.world = () => { const w = echt(); return w && { ...w, mission: { ...(w.mission || {}), stage: 9 } }; };
    W().wanted = 0;
    log('desync-ingebracht', { wanted: W().wanted });
    await sleep(s * 1000);
    ses.world = echt; ses.requestResync = rs;
    const d = W().coopDesync;
    log('desync-uitkomst', { hersync, desync: d ? d.velden : null, wanted: W().wanted });
    // na het weghalen van de afwijking moet er weer rust zijn
    await sleep(12000);
    log('desync-rust', { desync: W().coopDesync ? W().coopDesync.velden : null });
  },
  // de host betaalt een gast; de gast houdt het in zijn eigen save
  async betaal({ geld = 250 }) {
    if (CFG.role !== 'host') { await sleep(4000); return; }
    const C = await imp('coopnet');
    const ok = C.payGuest(W(), geld, 1);
    log('betaald', { ok, geld });
    await sleep(3000);
  },
  // samen spelen (#428): de rest van de wereld van de host bij de gast (voetgangers, dieren, lichten, kapotte objecten). stap 'props': kies een paar
  // props bij de gast (de testbank vertelt de nep-host dat ze kapot zijn); stap 'kijk': meet wat de gast tekent en maak schermafbeeldingen.
  async wereld428({ stap = 'kijk', naam = 'w428', rond = 4 }) {
    const w = W();
    if (CFG.role === 'host') { await sleep(4000); return; }
    const B = await import('./js/breakables.js'), T = await import('./js/trafficlights.js');
    if (stap === 'props') {
      const alle = B.findProps(w.player.x, w.player.y, 45), soorten = {};
      for (const p of alle) soorten[p.kind] = (soorten[p.kind] || 0) + 1;
      const lijst = alle.filter((p) => ['bench', 'bin', 'chair', 'table', 'parasol', 'bike', 'stall', 'lamp', 'tree'].includes(p.kind) && /^[a-z]+@-?\d+,-?\d+$/.test(p.key)).sort((a, b) => Math.hypot(a.x - w.player.x, a.y - w.player.y) - Math.hypot(b.x - w.player.x, b.y - w.player.y)).slice(0, 4);
      log('w428-props', { keys: lijst.map((p) => ({ key: p.key, x10: Math.round(p.x * 10), y10: Math.round(p.y * 10) })), alle: alle.length, soorten });
      return;
    }
    const cs = T.getTrafficControllers();
    const e = w.coopExtra;
    log('w428', {
      meshes: w.coopExtraMeshes || null, hostMesh: w.coopHostMeshes || null, bytes: w.coopExtraBytes || 0,
      stand: e ? [e.voetgangers.size, e.uiterlijk.size, e.dieren.size, e.lichten.size, e.kapot.length, e.spraak.size] : null,
      lichtT: [0, 1, 2, 3, 4].map((i) => (cs[i] ? Math.round(cs[i].t * 10) / 10 : null)), lichtC: [0, 1, 2, 3, 4].map((i) => (cs[i] ? Math.round(cs[i].cycle * 10) / 10 : null)), lichtHost: e ? [0, 1, 2, 3, 4].map((i) => (e.lichten.get(i) ? e.lichten.get(i).t : null)) : null,
      kapot: (e ? e.kapot : []).map((k) => [k.key, B.isPropBroken(k.key)]), lokaalPeds: (w.pedestrians || []).length, lokaalDieren: (w.wildlife || []).length, lokaalVoertuigen: (w.vehicles || []).length,
      sprekers: (w.extraSpeakers || []).length, misc: e ? [...e.misc.keys()] : null,
    });
    for (let i = 0; i < rond; i++) { w.camYaw = i * Math.PI * 2 / rond; await sleep(500); shot(naam + '-' + i); await sleep(300); }
  },
  // samen spelen (#388): de camera van de gast draait met de muis (hij draaide nooit omdat updateGameplay niet draait voor een gast)
  async gastcamera() {
    const w = W();
    if (CFG.role === 'host') { await sleep(6000); return; }
    const m = w.input.mouse, was = m.locked;
    const y0 = w.camYaw; m.locked = true; // een echte vergrendelde muis kan een test niet krijgen: de pagina meldt hem als vergrendeld
    for (let i = 0; i < 20; i++) { window.dispatchEvent(new MouseEvent('mousemove', { movementX: 40, movementY: 0, clientX: 400, clientY: 300 })); await sleep(50); }
    await sleep(200);
    const y1 = w.camYaw; m.locked = was;
    log('gastcamera', { yaw0: Math.round(y0 * 1000) / 1000, yaw1: Math.round(y1 * 1000) / 1000, lookActief: !!w.input.lookActive() });
    shot('gastcamera');
  },
  // samen spelen (#388): de gast rent van de gastheer weg (ver voorbij de oude lijn van 38 m) en wordt na de waarschuwing bij de groep gezet;
  // of de gast loopt door terwijl het spel van de gastheer op pauze staat
  async gastloop({ s = 30, naam = 'gastloop', rennen = true }) {
    const B = window.__bot, w = W();
    if (CFG.role === 'host' || !B) { await sleep(s * 1000); return; }
    const afstand = () => Math.hypot(w.player.x - w.companion.x, w.player.y - w.companion.y);
    const p0 = [w.player.x, w.player.y];
    let max = 0; const end = performance.now() + s * 1000;
    if (rennen) B.down('shift');
    let hoek = -Math.PI / 2, last = [w.player.x, w.player.y], lastT = performance.now(); B.stick(Math.cos(hoek), Math.sin(hoek));
    while (performance.now() < end) { // staat de gast tegen een gebouw of water, dan draait hij 70 graden door (de wereld verandert)
      max = Math.max(max, afstand()); await sleep(100);
      if (performance.now() - lastT > 1500) { if (Math.hypot(w.player.x - last[0], w.player.y - last[1]) < 3) { hoek += 1.2; B.stick(Math.cos(hoek), Math.sin(hoek)); } last = [w.player.x, w.player.y]; lastT = performance.now(); }
    }
    B.stick(0, 0); if (rennen) B.up('shift');
    log(naam, { max: Math.round(max), einde: Math.round(afstand()), verplaatst: Math.round(Math.hypot(w.player.x - p0[0], w.player.y - p0[1])), pauzeHost: !!(w.coopScene && w.coopScene.pauze) });
  },
  // spelen: de eigen figuur loopt een rondje met de stick; kijk of de host hem volgt
  async loop({ s = 12 }) {
    const B = window.__bot; if (!B) { await sleep(s * 1000); return; }
    const x0 = W().player.x, y0 = W().player.y;
    const end = performance.now() + s * 1000; let k = 0;
    while (performance.now() < end) { const a = (k++ / 20) * Math.PI * 2 / 3; B.stick(Math.cos(a), Math.sin(a)); await sleep(100); }
    B.stick(0, 0);
    log('gelopen', { van: [Math.round(x0), Math.round(y0)], naar: [Math.round(W().player.x), Math.round(W().player.y)] });
  },
  // samen spelen (#366): de figuren van plek 2 en hoger lopen op de echte wereld tegen een gebouw en een gracht aan en dwalen weg:
  // nooit in een gebouw of in het water, en te ver weg wordt na een paar seconden bij de groep gezet (stepFigures/bandFiguren in coopnet.js)
  async figuren({ s = 10 }) {
    if (CFG.role !== 'host') { await sleep((3 * s + 6) * 1000); return; }
    const Co = await imp('companion'), U = await imp('util'), w = W(), map = w.map, p = w.player;
    const figs = Object.values(w.coopFigures || {}).filter((f) => f.slot >= 2);
    log('figuren-start', { slots: figs.map((f) => f.slot), host: [Math.round(p.x), Math.round(p.y)] });
    if (!figs.length) return;
    const stuur = (f, dx, dy) => { const d = Math.hypot(dx, dy) || 1; const inv = { mx: dy / d, my: -dx / d, yaw: 0, buttons: 1 }; Object.defineProperty(f, 'input', { configurable: true, get: () => inv, set: () => {} }); }; // camerahoek 0: wereld-x = -my, wereld-y = mx; de gast zelf stuurt elke 50 ms nul
    const los = (f) => { delete f.input; f.input = null; };
    const vrij = (x, y) => Co.figuurVrij(x, y, w);
    const nat = (x, y) => { try { return !!map.waterNear(x, y, 0.5).length; } catch (e) { return false; } };
    const lijn = (a, b) => { for (let i = 1; i <= 40; i++) { const x = a[0] + (b[0] - a[0]) * i / 40, y = a[1] + (b[1] - a[1]) * i / 40; if (nat(x, y)) return true; } return false; };
    // een gebouw: een droge startplek in een kring om een gebouw bij de gastheer, lopend naar het midden
    const run = async (naam, f, start, doel, sec) => {
      f.x = start[0]; f.y = start[1]; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; f.gz = p.gz || 0;
      const x0 = f.x, y0 = f.y; let binnen = 0, inWater = 0, minD = 1e9, maxHost = 0, teruggezet = false; const end = performance.now() + sec * 1000;
      while (performance.now() < end) {
        stuur(f, doel[0] - f.x, doel[1] - f.y); await sleep(100);
        if (!vrij(f.x, f.y)) binnen++;
        if (U.isInWater(map, f.x, f.y)) inWater++;
        minD = Math.min(minD, Math.hypot(doel[0] - f.x, doel[1] - f.y)); maxHost = Math.max(maxHost, Math.hypot(f.x - p.x, f.y - p.y));
      }
      los(f); log(naam, { slot: f.slot, van: [Math.round(x0), Math.round(y0)], naar: [Math.round(f.x), Math.round(f.y)], gelopen: Math.round(Math.hypot(f.x - x0, f.y - y0)), binnen, inWater, minD: Math.round(minD * 10) / 10, maxHost: Math.round(maxHost) });
    };
    const f1 = figs[0], f2 = figs[1] || figs[0];
    // 1. een gebouw
    let gek = null;
    for (const b of map.buildingsNear(p.x, p.y, 60).slice().sort((a, c) => Math.hypot((a.bounds[0] + a.bounds[2]) / 2 - p.x, (a.bounds[1] + a.bounds[3]) / 2 - p.y) - Math.hypot((c.bounds[0] + c.bounds[2]) / 2 - p.x, (c.bounds[1] + c.bounds[3]) / 2 - p.y))) {
      const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2, R = Math.hypot(b.bounds[2] - b.bounds[0], b.bounds[3] - b.bounds[1]) / 2;
      for (let k = 0; k < 8 && !gek; k++) { const a = k * Math.PI / 4, st = [cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7)]; if (vrij(st[0], st[1]) && Math.hypot(st[0] - p.x, st[1] - p.y) < 90) gek = { st, doel: [cx, cy] }; }
      if (gek) break;
    }
    log('figuren-gebouw', { gevonden: !!gek });
    if (gek) await run('figuur-gebouw', f1, gek.st, gek.doel, s);
    // 2. het water: een gracht of vaart bij de gastheer
    let nt = null;
    try {
      for (const poly of map.waterNear(p.x, p.y, 90)) {
        const P = poly.pts, c = [P.reduce((q, v) => q + v[0], 0) / P.length, P.reduce((q, v) => q + v[1], 0) / P.length];
        for (const v of P.filter((_, i) => i % Math.max(1, Math.floor(P.length / 40)) === 0)) {
          const d = Math.hypot(v[0] - c[0], v[1] - c[1]) || 1, st = [v[0] + (v[0] - c[0]) / d * 6, v[1] + (v[1] - c[1]) / d * 6];
          if (vrij(st[0], st[1]) && Math.hypot(st[0] - p.x, st[1] - p.y) < 90 && lijn(st, c)) { nt = { st, doel: c }; break; }
        }
        if (nt) break;
      }
    } catch (e) { log('figuren-water-fout', { msg: String(e && e.message || e) }); }
    log('figuren-water', { gevonden: !!nt });
    if (nt) await run('figuur-water', f2, nt.st, nt.doel, s);
    // 3. wegdwalen: een kleine 60 m van de gastheer en dan rechtdoor weg; na ~110 m en een paar seconden zet de gastheer hem terug
    let weg = null;
    for (let k = 0; k < 8 && !weg; k++) { const a = k * Math.PI / 4, st = [p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60]; if (vrij(st[0], st[1])) weg = { st, dir: [Math.cos(a), Math.sin(a)] }; }
    if (weg) {
      const f = f1; f.x = weg.st[0]; f.y = weg.st[1]; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; f.gz = p.gz || 0;
      let maxD = 0, terug = null; const end = performance.now() + 22000, t0 = performance.now();
      while (performance.now() < end) {
        stuur(f, weg.dir[0], weg.dir[1]); await sleep(100);
        const d = Math.hypot(f.x - p.x, f.y - p.y); maxD = Math.max(maxD, d);
        if (maxD > 100 && d < 8 && !terug) terug = Math.round((performance.now() - t0) / 100) / 10;
      }
      los(f); log('figuur-weg', { maxD: Math.round(maxD), terugNa: terug, eind: Math.round(Math.hypot(f.x - p.x, f.y - p.y)) });
    } else log('figuur-weg', { geenStart: true });
    for (const f of figs) los(f);
  },
  // aanraakbediening (--url-flags=touch=1): met de duim op de stick, eerst half, dan vol, dan rennen met de sprinttoets
  async touch({ s = 12 }) {
    const left = document.querySelector('#touch-ui .t-left');
    const cls = document.documentElement.className;
    if (!left) { log('touch', { ui: false, cls }); await sleep(s * 1000); return; }
    left.setPointerCapture = () => {};
    const ev = (type, x, y) => left.dispatchEvent(new PointerEvent(type, { pointerId: 77, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
    const R = (await imp('touchlogic')).STICK_RADIUS || 60;
    log('touch', { ui: true, cls, speelknoppen: [...document.querySelectorAll('#touch-ui .t-btn')].map((b) => b.textContent.trim()).join('|'), radius: R });
    shot('touch-ui');
    ev('pointerdown', 150, 450);
    ev('pointermove', 150 + R * 0.5, 450); await sleep(s * 250);
    log('touch-half', { axis: W().input && W().input.padAxis ? W().input.padAxis.slice() : null });
    ev('pointermove', 150 + R, 450); await sleep(s * 250);
    log('touch-vol', { axis: W().input && W().input.padAxis ? W().input.padAxis.slice() : null });
    ev('pointermove', 150, 450 - R); await sleep(s * 250);
    ev('pointerup', 150, 450); await sleep(s * 250);
    log('touch-los', { axis: W().input && W().input.padAxis ? W().input.padAxis.slice() : null });
  },
  // een ritje: de host zet een voertuig naast zich neer (cheat 'voertuig hier' of een voertuig in de buurt), stapt in en rijdt; Tessa (de gast)
  // stapt via de volg-AI als passagier mee. De gasten kijken: staat Tessa als passagier, rijdt het voertuig mee, stapt ze weer uit?
  async rit({ s = 24 }) {
    if (CFG.role !== 'host') { // Tessa gaat niet meer vanzelf mee (#388): zodra de host in een voertuig zit stapt de gast zelf in met E
      const t0 = performance.now(); let gedrukt = 0, erin = false;
      while (performance.now() - t0 < s * 1000) {
        const p = (W().coopPartners || []).find((q) => q.slot === 0);
        if (p && /voertuig|rijdt/.test(p.status) && !W().coopInVoertuig && !W().companion.inVehicle && window.__bot && gedrukt < 8) { await window.__bot.press('e', 150); gedrukt++; await sleep(1500); } else await sleep(500);
        erin = erin || !!W().coopInVoertuig;
      }
      log('rit-gast', { gedrukt, erin });
      return;
    }
    const w = W(), B = window.__bot;
    let via = '';
    const voorLijst = new Set(w.vehicles || []);
    try {
      const Ch = await imp('cheats');
      const keuzes = Ch.spawnChoices(w) || [];
      const kies = keuzes.find((c) => c.kind === 'car') || keuzes[0];
      const res = kies ? Ch.spawnVehicleHere(kies.id, w) : { ok: false, text: 'geen keuze' };
      log('rit-spawn', { keuzes: keuzes.length, kies: kies && kies.id, res: { ok: res.ok, text: res.text } });
      if (res.ok) via = 'cheat';
    } catch (e) { log('rit-spawn', { fout: String(e.message || e) }); }
    if (!via) {
      const v = (w.vehicles || []).filter((x) => x && !x.isBoat && !x.isHeli && !x.wrecked).sort((a, b) => Math.hypot(a.x - w.player.x, a.y - w.player.y) - Math.hypot(b.x - w.player.x, b.y - w.player.y))[0];
      if (v) { w.player.x = v.x - 2.5; w.player.y = v.y; via = 'dichtstbij'; }
    }
    await sleep(1500);
    const voor = w.player.inVehicle ? 1 : 0;
    // naast het dichtstbijzijnde voertuig gaan staan (de bezorging zet het niet altijd binnen bereik)
    const nieuw = (w.vehicles || []).find((x) => x && !voorLijst.has(x) && !x.wrecked); // het zojuist bezorgde voertuig, anders het dichtstbijzijnde
    const dicht = () => nieuw && (w.vehicles || []).includes(nieuw) ? nieuw : (w.vehicles || []).filter((x) => x && !x.isBoat && !x.isHeli && !x.wrecked && !x.isPolice).sort((a2, b2) => Math.hypot(a2.x - w.player.x, a2.y - w.player.y) - Math.hypot(b2.x - w.player.x, b2.y - w.player.y))[0];
    const v0 = dicht(); log('rit-voertuig', { afstand: v0 ? Math.round(Math.hypot(v0.x - w.player.x, v0.y - w.player.y)) : null, soort: v0 && v0.model ? v0.model.name || v0.model.id || '' : '' });
    for (let i = 0; i < 8 && !w.player.inVehicle; i++) {
      const v = dicht(); if (v && Math.hypot(v.x - w.player.x, v.y - w.player.y) > 3.5) { w.player.x = v.x - Math.cos(v.angle || 0) * 0; w.player.y = v.y + 2.2; }
      await B.press('e', 150); await sleep(900);
    }
    log('rit-in', { via, ingestapt: !!w.player.inVehicle, voor, tessa: !!w.companion.inVehicle });
    const tw = performance.now();
    for (let i = 0; i < 40 && !w.companion.inVehicle; i++) await sleep(300); // Tessa loopt via de volg-AI naar het voertuig
    log('rit-passagier', { tessa: !!w.companion.inVehicle, host: !!w.player.inVehicle, wachtS: Math.round((performance.now() - tw) / 100) / 10 });
    shot('rit-host');
    if (w.player.inVehicle) {
      const x0 = w.player.x, y0 = w.player.y;
      B.stick(0, -1); await sleep(6000); B.stick(0, 0); await sleep(1200);
      log('rit-gereden', { m: Math.round(Math.hypot(w.player.x - x0, w.player.y - y0)), tessa: !!w.companion.inVehicle });
      shot('rit-host-onderweg');
      await B.press('e', 150); await sleep(2500);
      log('rit-uit', { host: !!w.player.inVehicle, tessa: !!w.companion.inVehicle });
    } else await sleep(6000);
  },
  // een filmpje op de host (een korte cutscene): de gast hoort het, ziet de laag met balken en tekst, wacht en loopt daarna weer
  async filmpje({ s = 8 }) {
    if (CFG.role === 'host') {
      const C = await imp('cinematics');
      let ok = null; try { ok = C.playCinematic({ id: 'coop-test', priority: 5, duration: s - 1, letterbox: true, skippable: false, lines: [{ speaker: 'Tammo', text: 'Dit is een proeffilmpje, kijk even mee.' }] }); } catch (e) { ok = 'fout ' + e.message; }
      log('filmpje', { ok, actief: C.isCinematicActive() });
      await sleep(3000); shot('filmpje-host');
      await sleep((s - 3) * 1000);
      log('filmpje-na', { actief: C.isCinematicActive() });
    } else {
      // de fasen van de host duren soms langer dan gepland (een rit): de gast wacht tot het filmpje echt begint
      const w0 = performance.now(); while (!(W().coopScene && W().coopScene.filmpje) && performance.now() - w0 < (s + 12) * 1000) await sleep(200);
      await sleep(1500);
      const x = W();
      log('filmpje-gast', { sc: x.coopScene || null, sceneEl: !!document.getElementById('coop-scene'), input: x.coopNet && x.coopNet.session ? [x.coopNet.session.pendingInput.mx, x.coopNet.session.pendingInput.my] : null });
      shot('filmpje-gast');
      const w1 = performance.now(); while (W().coopScene && W().coopScene.filmpje && performance.now() - w1 < (s + 6) * 1000) await sleep(200);
      await sleep(2500);
      log('filmpje-gast-na', { sc: W().coopScene || null, sceneEl: !!document.getElementById('coop-scene') });
    }
  },
  // de gast verlaat het spel via het menu (zoals een speler)
  async verlaat({ wie = 'gast2' }) {
    if (CFG.name !== wie) { await sleep(6000); return; }
    await openSamen();
    shot('voor-verlaten');
    await act('verbreek');
    await sleep(2500);
    log('verlaten', { coopNet: !!net(), role: W().coopRole || null, money: W().money, pos: W().player ? [Math.round(W().player.x), Math.round(W().player.y)] : null });
    await closeMenu();
  },
  // het pauzemenu open terwijl je samen speelt: ligt het partnerlabel er niet overheen? (alleen een schermafbeelding en een controle)
  async menushot() {
    await openSamen(); await sleep(900);
    // geen permanent label meer (#377): niets van de spelerslijst ligt over het menu; het onderdeel Spelers staat in de rail
    const lijst = document.getElementById('coop-spelers');
    const rail = document.querySelector('#pause-menu [data-goto="spelers"]');
    log('menushot', { chip: true, chipZichtbaar: !!(lijst && getComputedStyle(lijst).display !== 'none') || !!document.querySelector('.coop-chip'), railSpelers: !!rail && !rail.hidden });
    shot('g-pauzemenu');
    await sleep(500); await closeMenu();
  },
  // opnieuw aansluiten na het verlaten, via het pauzemenu en de lobby (dezelfde code), zoals een speler
  async opnieuw() {
    if (net()) { log('opnieuw-al-verbonden', {}); return; }
    // een nieuw spel van de gast zonder opening: na het verlaten speelt zijn eigen verhaal de opening (de gast speelde hem niet, de gastheer wel); een speler wacht of slaat hem over, anders weigert canJoin
    try { const c = await import('/js/cinematics.js'); if (c.isCinematicActive()) { log('opnieuw-opening-over', { id: c.cinematicState().id }); c.skipAllCinematics(); await until(() => !W().cameraOverride && !c.isCinematicActive(), 8000, 'eigen opening overgeslagen'); } } catch (e) { log('opnieuw-opening-fout', { msg: String(e && e.message) }); }
    await openSamen();
    await act('kies-gast');
    const input = await until(() => panel().querySelector('.coop-input'), 5000, 'invoerveld');
    input.value = CFG.code; input.dispatchEvent(new Event('input', { bubbles: true }));
    await act('koppel'); await act('akkoord');
    await until(() => title() === 'Je speelt samen', 60000, 'opnieuw verbonden met de host');
    await sleep(1500);
    await closeMenu();
    log('opnieuw-klaar', { role: W().coopRole || null, slot: net() && net().session ? net().session.slot : null, paused: !!W().paused });
  },
  // de host stopt de sessie via het menu ('Iedereen stoppen')
  async stopHost() {
    if (CFG.role !== 'host') { await sleep(6000); return; }
    await openSamen();
    shot('voor-stoppen');
    await act('verbreek');
    await sleep(2500);
    log('gestopt', { coopNet: !!net(), role: W().coopRole || null });
    await closeMenu();
  },
  // wat gebeurt er met de eigen save tijdens een sessie? Een host bewaart zoals altijd; een gast bewaart alleen zijn beloningen (savegame.js)
  async opgeslagen() {
    const sv = await imp('savegame'); const w = W();
    const hadSave = sv.hasSave(), voor = hadSave ? (sv.readSave() || {}).money : null;
    let ok = null; try { ok = sv.saveGame(w, { toast: false }); } catch (e) { ok = 'fout: ' + e.message; }
    await sleep(300);
    const d = sv.readSave();
    log('save', { role: w.coopRole || null, hadSave, ok, money: w.money, verdiend: w.coopVerdiend || 0, saveMoneyVoor: voor, saveMoney: d ? d.money : null, saveChar: d ? d.character : null });
  },
  // de opening van een nieuw spel samen (#95): de gastheer drukt op Spel starten, alle spelers zien dezelfde scènes
  async opening({ s = 180, skip = false }) {
    const C = await imp('cinematics');
    const B = window.__bot;
    const cineOn = () => { const c = document.getElementById('cine'); return !!(c && c.classList.contains('on')) || C.isCinematicActive(); };
    const t0o = performance.now(); let eerste = null, gezien = 0, geprobeerd = false, overgeslagen = null;
    if (CFG.role === 'host') {
      // het hek: een tijd lang gebeurt er niets, ook al zijn alle spelers er
      await sleep(7000);
      log('gate-wacht', { cine: cineOn(), paused: !!W().paused, cam: !!W().cameraOverride, knop: !!panel().querySelector('[data-act="start-spel"]') });
      shot('gate-host');
      panel().querySelector('[data-act="start-spel"]').click(); log('spel-gestart', {});
    } else {
      await closeMenu(); // de gast kijkt vanuit het spel mee; hij wacht tot de gastheer start (hij begint niet zelf)
      log('gate-gast', { cine: cineOn(), cam: !!W().cameraOverride, bezig: W().coopCutBezig ?? null });
    }
    const end = performance.now() + s * 1000; let n = 0, laatsteSub = '', uitSinds = null, keuken = 0;
    while (performance.now() < end) {
      const on = cineOn();
      const x = W();
      // de gast telt alleen de scène van de gastheer (zijn eigen start-filmpje telt niet)
      if (on && eerste == null && (CFG.role === 'host' || x.coopCutBezig != null)) { eerste = (performance.now() - t0o) / 1000; log('opening-begin', { na: eerste, cutBezig: x.coopCutBezig ?? null, wachtte: eerste }); }
      if (CFG.role === 'gast' && !net() && eerste != null) { log('opening-weg', { net: false }); break; } // de gastheer stopte: de gast speelt weer zijn eigen spel
      if (on) gezien += 0.25;
      if (on && x.cameraOverride && x.cameraOverride.position && x.cameraOverride.position.z > 300) { if (!keuken) keuken = performance.now(); else if (keuken > 0 && performance.now() - keuken > 4000) { keuken = -1; shot('opening-' + CFG.role + '-keuken'); } } // de keuken (tweede scène) van binnen
      const c = document.getElementById('cine'); const sub = c && c.querySelector('.cine-line') ? c.querySelector('.cine-line').textContent : '';
      if (sub && sub !== laatsteSub) { laatsteSub = sub; log('opening-regel', { sub: sub.slice(0, 60), cam: x.cameraOverride && x.cameraOverride.position ? [Math.round(x.cameraOverride.position.x), Math.round(x.cameraOverride.position.y), Math.round(x.cameraOverride.position.z ?? 0)] : null, bezig: x.coopCutBezig ?? null }); }
      if (on && gezien >= 8 && !geprobeerd) {
        geprobeerd = true; shot('opening-' + CFG.role + '-8s');
        if (CFG.role === 'gast') { // een gast kan niet overslaan: Spatie ingedrukt houden doet niets (de meting loopt intussen door)
          (async () => { if (B) { B.down(' '); await sleep(2200); B.up(' '); } log('gast-probeert-over', { nogActief: cineOn(), bezig: W().coopCutBezig ?? null }); })();
        }
      }
      if (skip && CFG.role === 'host' && on && gezien >= 22 && !overgeslagen) { shot('opening-host-voor-overslaan'); log('host-slaat-over'); await holdSkip(2200); overgeslagen = performance.now(); }
      if (overgeslagen && !cineOn() && performance.now() - overgeslagen > 800) { log('na-overslaan', { cine: cineOn(), cam: !!W().cameraOverride, bezig: W().coopCutBezig ?? null, sceneEl: !!document.getElementById('coop-scene'), paused: !!W().paused }); break; }
      if (CFG.role === 'gast' && skip && geprobeerd && !cineOn()) { log('na-overslaan', { cine: false, cam: !!W().cameraOverride, bezig: W().coopCutBezig ?? null, sceneEl: !!document.getElementById('coop-scene'), paused: !!W().paused }); break; }
      if (on) uitSinds = null; else if (uitSinds == null) uitSinds = performance.now();
      if (!skip && geprobeerd && eerste != null && !on && uitSinds != null && performance.now() - uitSinds > 6000 && gezien > 20) { log('opening-klaar', { cam: !!W().cameraOverride, bezig: W().coopCutBezig ?? null, paused: !!W().paused }); break; }
      await sleep(250);
    }
    log('cut-spoor', { spoor: (W().coopCutSpoor || []).map((r) => [Math.round((r[0] - 1792519000000) / 100) / 10, ...r.slice(1)]) });
    log('opening-einde', { gezien, eerste, cine: cineOn() });
    shot('opening-' + CFG.role + '-einde');
  },
  // een tekstveld neemt alle toetsen en plakken aan (#315): echte toetsaanslagen via het hoofdproces
  async tekstveld() {
    const inp = await until(() => panel().querySelector('.coop-input'), 8000, 'invoerveld');
    // het klembord is van het hele systeem: wat erin stond zetten we na de test terug
    let oud = ''; try { oud = await window.gdeDesktop.clipboard.readText(); } catch (e) { /* geen brug */ }
    inp.focus(); inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
    // het klembord vullen via het hoofdproces en teruglezen: het is van het hele systeem en een andere instantie kan er even tussen zitten
    const zetKlembord = async (t) => { for (let i = 0; i < 5; i++) { console.log('[clipboard-set] ' + t); for (let j = 0; j < 8; j++) { await sleep(250); let g = ''; try { g = await window.gdeDesktop.clipboard.readText(); } catch (e) { /* geen brug */ } if (g === t) return true; } } log('klembord-niet-gezet', { gewenst: t }); return false; };
    const send = async (ev) => { console.log('[sendinput] ' + JSON.stringify(ev)); await sleep(60); };
    const typ = async (ch, code) => { await send({ type: 'keyDown', keyCode: code }); await send({ type: 'char', keyCode: ch }); await send({ type: 'keyUp', keyCode: code }); };
    for (const [ch, code] of [['w', 'W'], ['a', 'A'], ['s', 'S'], ['d', 'D'], [' ', 'Space'], ['e', 'E']]) await typ(ch, code);
    for (let i = 0; i < 40 && inp.value !== 'wasd e'; i++) await sleep(250); // onder belasting komen de toetsen soms seconden later aan
    const na = inp.value, pos = W().player ? [W().player.x, W().player.y] : null;
    log('tekstveld-typen', { waarde: na, focus: document.activeElement === inp, pos });
    // plakken met Ctrl+V (het klembord zet het hoofdproces)
    inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
    for (let poging = 0; poging < 3 && inp.value !== '127.0.0.1:41234-ABC'; poging++) { // een andere instantie kan het klembord even gebruiken
      inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
      await zetKlembord('127.0.0.1:41234-ABC');
      await send({ type: 'keyDown', keyCode: 'V', modifiers: ['control'] }); await send({ type: 'keyUp', keyCode: 'V', modifiers: ['control'] });
      for (let i = 0; i < 16 && inp.value !== '127.0.0.1:41234-ABC'; i++) await sleep(250);
    }
    log('tekstveld-plakken', { waarde: inp.value });
    // rechtermuisknop-menu: Plakken
    inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
    await zetKlembord('kamer-xyz');
    const r = inp.getBoundingClientRect();
    await send({ type: 'mouseDown', x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2), button: 'right', clickCount: 1 });
    await send({ type: 'mouseUp', x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2), button: 'right', clickCount: 1 });
    for (let i = 0; i < 20 && !document.querySelector('.tfmenu-gde'); i++) await sleep(250); // onder belasting komt een muisgebeurtenis soms seconden later
    const menu = document.querySelector('.tfmenu-gde');
    log('tekstveld-menu', { menu: !!menu, items: menu ? [...menu.querySelectorAll('button')].map((b) => b.textContent).join(',') : '' });
    shot('tekstveld-menu');
    const plak = menu && [...menu.querySelectorAll('button')].find((b) => b.textContent === 'Plakken');
    if (plak) plak.click();
    for (let i = 0; i < 16 && inp.value !== 'kamer-xyz'; i++) await sleep(250);
    if (inp.value !== 'kamer-xyz' && plak) { await zetKlembord('kamer-xyz'); inp.focus(); inp.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 10 })); await sleep(300); const p2 = [...document.querySelectorAll('.tfmenu-gde button')].find((b) => b.textContent === 'Plakken'); if (p2) p2.click(); await sleep(700); log('tekstveld-menu-opnieuw', { waarde: inp.value }); }
    log('tekstveld-menu-plakken', { waarde: inp.value });
    inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (oud && oud.indexOf(String.fromCharCode(10)) < 0 && oud.indexOf(String.fromCharCode(13)) < 0) console.log('[clipboard-set] ' + oud); // het klembord van vóór de test terug
  },
  // #291: winkelen door een gast. De host zet zich bij een winkel (de gast staat ernaast), de gast drukt E en koopt met zijn eigen geld;
  // bij een wapenwinkel of autodealer krijgt hij een melding en opent er niets.
  async gastwinkel({ s = 50 }) {
    const w = W(), B = window.__bot;
    const naarWinkel = async (types, naam) => {
      const S = await imp('shops');
      const lijst = (S.getShopsForRender() || []).filter((x) => types.includes(x.type));
      lijst.sort((a, b) => Math.hypot(a.x - w.player.x, a.y - w.player.y) - Math.hypot(b.x - w.player.x, b.y - w.player.y));
      const sh = lijst[0];
      if (!sh) { log('winkel-host', { naam, fout: 'geen winkel van dit soort', types }); return null; }
      w.player.x = sh.x; w.player.y = sh.y + 1.2; w.companion.x = sh.x + 0.8; w.companion.y = sh.y + 1.2; // Tessa (de gast) ernaast
      log('winkel-host', { naam, winkel: sh.name, soort: sh.type, n: lijst.length });
      return sh;
    };
    if (CFG.role === 'host') {
      window.__startPos = { x: w.player.x, y: w.player.y }; // hier begint de rit later weer (open ruimte, geen winkeldeur)
      await sleep(1000);
      await naarWinkel(['super', 'snack', 'kleding', 'tabak', 'kapper'], 'toegestaan');
      await sleep(22000);
      await naarWinkel(['wapens', 'auto', 'fietsen', 'pand'], 'niet-toegestaan');
      await sleep(20000);
      return;
    }
    // de gast
    const SH = await imp('shopui'), SV = await imp('savegame'), S = await imp('shops');
    window.__gastMsgs = window.__gastMsgs || [];
    if (!w.__msgHaak) { const o = w.addMessage.bind(w); w.addMessage = (t, ...a) => { window.__gastMsgs.push(String(t)); return o(t, ...a); }; w.__msgHaak = true; }
    await sleep(6000);
    const money0 = w.money, near = S.nearestShop(w);
    log('winkel-gast-voor', { money: money0, near: near ? near.name + ':' + near.type : null, pos: [Math.round(w.player.x), Math.round(w.player.y)], rol: w.coopRole });
    await B.press('e', 150); await sleep(1500);
    const open = SH.isShopOpen();
    log('winkel-gast-open', { open, tekst: open ? (document.querySelector('#shop-menu') || {}).innerText && document.querySelector('#shop-menu').innerText.slice(0, 160) : '' });
    shot('winkel-gast-open');
    let gekocht = null;
    if (open) {
      const items = [...document.querySelectorAll('#shop-menu .sm-item')].filter((b) => b.getAttribute('aria-disabled') !== 'true');
      log('winkel-gast-items', { n: items.length, eerste: items[0] && items[0].innerText.slice(0, 60) });
      if (items[0]) { items[0].click(); await sleep(500); const buy = document.querySelector('#shop-menu .sm-buy'); if (buy) { buy.click(); await sleep(600); if (SH.isShopOpen() && buy && !buy.disabled) { buy.click(); await sleep(600); } } }
      gekocht = { money: w.money, uitgegeven: money0 - w.money };
      await B.press('escape', 120); await sleep(800);
    }
    const na = { open: SH.isShopOpen(), money: w.money };
    // het geld en de aankoop staan in zijn eigen opgeslagen spel (zijn eigen save, niet die van de host)
    let save = null; try { SV.saveGame(w, { toast: false }); await sleep(300); const d = SV.readSave(); save = d ? { money: d.money, health: d.health } : null; } catch (e) { save = { fout: String(e.message || e) }; }
    log('winkel-gast-na', { ...na, gekocht, save, rol: w.coopRole });
    await sleep(16000 - 0);
    // de wapenwinkel: een melding, geen menu
    await sleep(2000);
    const near2 = S.nearestShop(w); window.__gastMsgs.length = 0;
    await B.press('e', 150); await sleep(1200);
    log('winkel-gast-verboden', { near: near2 ? near2.name + ':' + near2.type : null, open: SH.isShopOpen(), meldingen: window.__gastMsgs.slice(-4) });
    shot('winkel-gast-verboden');
    if (SH.isShopOpen()) { await B.press('escape', 120); await sleep(500); }
  },
  // #291: een rit samen. De host stapt in, Tessa (de gast) rijdt mee; de host geeft het stuur (Y), de gast stuurt, geeft het terug (Y),
  // stapt uit (E) en weer in (E).
  async gastrit({ s = 70 }) {
    const w = W(), B = window.__bot;
    if (CFG.role === 'host') {
      const v0 = (w.vehicles || []).length;
      const S = await imp('shops');
      const winkels = S.getShopsForRender() || [];
      const winkelAfstand = (x, y) => winkels.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, q.y - y)), 1e9);
      const voorLijst = new Set(w.vehicles || []);
      // terug naar het beginpunt (geen winkeldeur in de buurt: E opent daar het menu in plaats van het voertuig) en daar een voertuig bezorgen
      if (window.__startPos) { w.player.x = window.__startPos.x; w.player.y = window.__startPos.y; w.companion.x = w.player.x + 1.2; w.companion.y = w.player.y + 1.2; await sleep(1500); }
      let kies = null, via = '';
      try {
        const Ch = await imp('cheats'); const keuzes = Ch.spawnChoices(w) || [];
        const k = keuzes.find((c) => c.kind === 'car') || keuzes[0];
        const res = k ? Ch.spawnVehicleHere(k.id, w) : { ok: false };
        if (res.ok) { via = 'cheat'; await sleep(1200); kies = (w.vehicles || []).find((x) => x && !voorLijst.has(x) && !x.wrecked) || null; }
      } catch (e) { /* hieronder: bestaand voertuig */ }
      if (!kies) { kies = (w.vehicles || []).filter((x) => x && !x.isBoat && !x.isHeli && !x.isPlane && !x.wrecked && !x.isPolice && !x.isBus && !x.isBike && !x.isScooter && !x.driver).sort((p, q) => Math.hypot(p.x - w.player.x, p.y - w.player.y) - Math.hypot(q.x - w.player.x, q.y - w.player.y))[0] || null; via = kies ? 'bestaand' : ''; if (kies) { w.player.x = kies.x; w.player.y = kies.y + 2.4; w.companion.x = kies.x + 1.2; w.companion.y = kies.y + 2.4; } }
      log('gastrit-voertuig', { via, gevonden: !!kies, winkelAfstand: kies ? Math.round(winkelAfstand(kies.x, kies.y)) : null, afstandHost: kies ? Math.round(Math.hypot(kies.x - w.player.x, kies.y - w.player.y) * 10) / 10 : null });
      await sleep(1500);
      const dicht = () => (kies && (w.vehicles || []).includes(kies) ? kies : (w.vehicles || []).filter((x) => x && !x.isBoat && !x.isHeli && !x.wrecked && !x.isPolice).sort((p, q) => Math.hypot(p.x - w.player.x, p.y - w.player.y) - Math.hypot(q.x - w.player.x, q.y - w.player.y))[0]);
      for (let i = 0; i < 8 && !w.player.inVehicle; i++) { const v = dicht(); if (v && Math.hypot(v.x - w.player.x, v.y - w.player.y) > 3.5) { w.player.x = v.x; w.player.y = v.y + 2.2; w.companion.x = v.x + 1; w.companion.y = v.y + 2.2; } await B.press('e', 150); await sleep(900); }
      for (let i = 0; i < 40 && !w.companion.inVehicle; i++) await sleep(300);
      log('gastrit-host-in', { via, host: !!w.player.inVehicle, tessa: !!w.companion.inVehicle, voertuigen: [v0, (w.vehicles || []).length] });
      shot('gastrit-host-in');
      await sleep(4000);
      const v = w.player.inVehicle;
      // geef het stuur (Y); de host doet zelf niets meer met de stick
      await B.press('y', 120); await sleep(1500);
      log('gastrit-wiel-gegeven', { wielSlot: w.coopWielSlot ?? null });
      const p0 = v ? [v.x, v.y] : null;
      let maxM = 0, maxV = 0; for (let i = 0; i < 90; i++) { if (v && p0) { maxM = Math.max(maxM, Math.hypot(v.x - p0[0], v.y - p0[1])); maxV = Math.max(maxV, Math.abs(v.speed || 0)); } await sleep(100); } // de gast stuurt: vooruit
      log('gastrit-gereden-door-gast', { m: Math.round(maxM * 10) / 10, maxSnelheid: Math.round(maxV * 10) / 10, snelheid: v ? Math.round(v.speed * 10) / 10 : null, wielSlot: w.coopWielSlot ?? null });
      shot('gastrit-onderweg-host');
      await sleep(6000); // de gast geeft het terug (Y) en remt; de host staat stil
      log('gastrit-wiel-terug', { wielSlot: w.coopWielSlot ?? null, snelheid: v ? Math.round(v.speed * 10) / 10 : null });
      // de host rijdt zelf een stukje (het stuur is weer van hem)
      const q0 = v ? [v.x, v.y] : null;
      B.stick(0, -1); await sleep(1200); B.stick(0, 0); B.down(' '); await sleep(1500); B.up(' '); await sleep(3300); // kort: een crash tegen een muur werpt de bestuurder uit het voertuig
      log('gastrit-host-reed-zelf', { m: v && q0 ? Math.round(Math.hypot(v.x - q0[0], v.y - q0[1])) : null, snelheid: v ? Math.round(v.speed * 10) / 10 : null });
      await sleep(20000); // de gast probeert uit te stappen tijdens het rijden, stapt uit (E) bij stilstand en weer in (E)
      log('gastrit-eind-host', { host: !!w.player.inVehicle, tessa: !!w.companion.inVehicle, coopUit: !!w.companion.coopUit });
      await B.press('e', 150); await sleep(1500);
      return;
    }
    // de gast
    window.__gastMsgs = window.__gastMsgs || [];
    if (!w.__msgHaak) { const o = w.addMessage.bind(w); w.addMessage = (t, ...a) => { window.__gastMsgs.push(String(t)); return o(t, ...a); }; w.__msgHaak = true; }
    const t0 = performance.now(); const sec = () => Math.round((performance.now() - t0) / 100) / 10;
    for (let i = 0; i < 80 && !w.coopInVoertuig; i++) { // Tessa gaat niet meer vanzelf mee (#388): zodra de host in het voertuig zit stapt de gast in met E
      const p = (w.coopPartners || []).find((q) => q.slot === 0);
      if (p && /voertuig|rijdt/.test(p.status) && i % 7 === 0) await B.press('e', 150);
      await sleep(300);
    }
    log('gastrit-gast-in', { inVoertuig: !!w.coopInVoertuig, t: sec() });
    await sleep(5000);
    // de host geeft het stuur: de gast hoort het en stuurt vooruit
    for (let i = 0; i < 40 && !w.coopWiel; i++) await sleep(250);
    log('gastrit-gast-wiel', { wiel: !!w.coopWiel, meldingen: window.__gastMsgs.slice(-3), t: sec() });
    shot('gastrit-gast-wiel');
    // kort en rustig (een crash tegen een muur kost de bestuurder zijn leven): vooruit, een bocht, remmen met handrem
    B.stick(0, -1); await sleep(1100);
    shot('gastrit-gast-stuurt');
    B.stick(0.4, -1); await sleep(500);
    B.stick(0, 1); B.down(' '); await sleep(4500); B.up(' '); B.stick(0, 0);
    await sleep(1500);
    log('gastrit-gast-gestuurd', { wiel: !!w.coopWiel, input: w.coopNet && w.coopNet.session ? w.coopNet.session.pendingInput.buttons : null });
    await B.press('y', 120); await sleep(1500); // het stuur terug
    log('gastrit-gast-wiel-terug', { wiel: !!w.coopWiel, meldingen: window.__gastMsgs.slice(-3) });
    // de host rijdt zelf een stukje en staat daarna stil: dan stapt de gast uit (E) en weer in (E)
    await sleep(14000);
    window.__gastMsgs.length = 0;
    await B.press('e', 150); await sleep(2000);
    log('gastrit-gast-uit', { inVoertuig: !!w.coopInVoertuig, meldingen: window.__gastMsgs.slice(-3), t: sec() });
    shot('gastrit-gast-uit');
    await sleep(3000);
    await B.press('e', 150); await sleep(2500); // weer in
    log('gastrit-gast-weer-in', { inVoertuig: !!w.coopInVoertuig, meldingen: window.__gastMsgs.slice(-3), t: sec() });
    shot('gastrit-gast-weer-in');
    await sleep(3000);
  },
  // de spelbot speelt het verhaal (alleen de host); de gasten lopen mee
  async verhaal({ s = 1500, until = 'T1', speed = 1 }) {
    const args = { until };
    if (CFG.role === 'host') {
      window.__botCfg = { part: 'all', until: args.until || 'T1', maxGameS: Math.max(3600, s * Math.max(1, speed) * 1.2), maxWallS: s, stuckS: 45, shots: 40, speed: speed || 1, waitS: 60, invulnerable: !!CFG.invuln };
      log('verhaal-begin', {});
      const r = await window.__botMain();
      log('verhaal-einde', { r });
    } else await PHASES.volg({ s, tot: 'weg' });
  },
  // een gast loopt achter Tammo aan (de metgezel op deze client), zoals een speler die meespeelt
  async volg({ s = 600, tot = 'tijd' }) {
    const B = window.__bot; const end = performance.now() + s * 1000; let n = 0, ver = 0;
    const L = await imp('botlogic');
    while (performance.now() < end) {
      const w = W();
      if (tot === 'weg' && !net()) break;
      const tam = w.companion, me = w.player;
      if (B && tam && me) {
        const d = Math.hypot(tam.x - me.x, tam.y - me.y);
        if (d > 4 && d < 600 && !w.paused && !w.uiPaused) {
          const [x, y] = L.footStick(L.headingTo({ x: me.x, y: me.y }, { x: tam.x, y: tam.y }), w.camYaw || 0);
          B.stick(x, y); if (d > 14) B.down('shift'); else B.up('shift');
        } else { B.stick(0, 0); B.up('shift'); }
        ver = Math.max(ver, d);
      }
      if (n % 160 === 159 && (CFG.shotsN = (CFG.shotsN || 0) + 1) <= 14) shot('volg-' + CFG.shotsN); // om de ~40 s: wat ziet de gast?
      if (++n % 40 === 0) log('volg', { d: tam && me ? Math.round(Math.hypot(tam.x - me.x, tam.y - me.y)) : null, stap: W().coopHostMissie ? W().coopHostMissie.label : null });
      await sleep(250);
    }
    if (B) { B.stick(0, 0); B.up('shift'); }
    log('volg-einde', { net: !!net(), maxAfstand: Math.round(ver) });
  },
};

// ---------------------------------------------------------------- hoofdprogramma
try {
  startSampler();
  await connect();
  state.allIn = true;
  // wachten tot iedereen erbij is (de host ziet het in zijn lijst, een gast in de lijst van de host)
  const expect = CFG.expect || (CFG.role === 'host' ? 2 : 2);
  if (expect > 2) {
    await until(() => (W().coopRoster || []).length >= expect, CFG.joinWaitS ? CFG.joinWaitS * 1000 : 150000, `alle ${expect} spelers in de lijst`);
  }
  const T0 = performance.now();
  log('allen-erbij', { expect, roster: (W().coopRoster || []).length });
  const program = CFG.program && CFG.program.length ? CFG.program : [[0, 'wacht', { s: CFG.durationS || 20 }]];
  const results = {};
  for (const [at, name, args] of program) {
    const wait = at * 1000 - (performance.now() - T0);
    if (wait > 0) await sleep(wait);
    if (!PHASES[name]) { log('fase-onbekend', { name }); continue; }
    state.phase = name;
    log('fase', { name, begin: true, args });
    try { await PHASES[name](args || {}); log('fase', { name, begin: false }); results[name] = 'ok'; }
    catch (e) { log('fase-fout', { name, msg: String(e && e.message || e) }); results[name] = 'FOUT'; }
  }
  state.phase = '';
  await sleep(1500);
  if (sampler) clearInterval(sampler);
  log('einde', { ok: true });
  return JSON.stringify({ result: 'KLAAR', role: CFG.role, fasen: results });
} catch (e) {
  if (sampler) clearInterval(sampler);
  log('fout', { msg: String(e && e.message || e) });
  shot('fout');
  return JSON.stringify({ result: 'FOUT', role: CFG.role, reason: String(e && e.message || e) });
}
