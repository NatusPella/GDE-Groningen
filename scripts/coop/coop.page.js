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
// BEZIT-STAP-BEGIN (scripts/coop/bezitstap_test.mjs draait deze functie met nepmodules; de keuring staat in scripts/coop/bezitstap_check.mjs)
// Suite 'alles', stap 'bezit' (epic Bezit): de host koopt een snackwagen en zet hem op 'park', de gast koopt de plek 'dorp', gast2 werkt een dag mee in de wagen van de host.
// Het testprofiel is een wegwerpprofiel: de poort en de verhaalfasen gaan open en het geld wordt aangevuld. Wat elk venster zag gaat terug als data voor keurBezitStap.
async function bezitAlles({ me, imp, sleep, W, wait = 5000 }) {
  const w = W();
  const [SL, L, N, GT, SS] = await Promise.all([imp('snacklive'), imp('bezitlive'), imp('bezitnet'), imp('bezitgate'), imp('snackstory')]);
  GT.setGateProgress(() => ({ dev: true })); SS.setSnackFlagProvider(null);
  w.money = Math.max(Number(w.money) || 0, 60000);
  const t = N.sessionTransport(w);
  if (!t) return { skip: true, reden: 'geen sessie' };
  N.ensureBezitNet(w, t);                                               // iedereen meldt zich bij het bezitkanaal, ook wie niets koopt
  await sleep(1500);
  const uit = { me, acties: [] };
  if (me === 'host') {
    uit.acties.push(SL.buyVan(w).ok, SL.koopVergunning(w, 'park').ok, SL.placeVan('park').ok);
  } else if (me === 'gast') {
    uit.acties.push(SL.koopVergunning(w, 'dorp').ok);
  }
  await sleep(wait);                                                    // de claims reizen via de host naar iedereen
  if (me === 'gast2') {
    const geld = w.money;
    uit.werk = SL.workAlong(w, 'park', 6);
    uit.loon = Math.round(w.money - geld);
  }
  await sleep(wait);                                                    // het werkbericht reist via de host naar de eigenaar
  const c = w.bezitNet && w.bezitNet.net.claims;
  uit.claims = c ? { eigen: c.mineSpots(), anderen: c.listSpots().map((x) => x.spot + ':' + x.name) } : null;
  if (me === 'host') {
    const S = L.snackState(), day = L.calToday();
    uit.bonus = { werkDag: S.gw.work.park === undefined ? -1 : S.gw.work.park, dag: day, mod: S.ev.mods.some((m) => m.k === 'omzet' && m.mult > 1) };
  }
  return uit;
}
// BEZIT-STAP-END
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
// 22-11 (#1011): de Samen-wizard heeft eerst 'Wie ben jij?' (wie-verder) en dan de keuze van de wijze (host: wijze-prive, gast: wijze-code); de testbank neemt ze zoals een speler
async function wizard(wijze) {
  for (let i = 0; i < 6; i++) {
    const b = buttons();
    if (b.includes('wie-verder')) { log('wie-ben-jij', { titel: title(), tekst: panel().innerText.slice(0, 300) }); shot('wie-' + CFG.role); await act('wie-verder'); continue; }
    if (b.includes('wijze-' + wijze)) { await act('wijze-' + wijze); return; }
    if (b.includes('route-direct') || b.includes('route-kamer') || (title() !== 'Wie ben jij?' && panel() && panel().querySelector('.coop-input'))) return;
    await sleep(400);
  }
}
const shot = (name) => { console.log('[capture] ' + name); };
// Escape zoals een speler (één toets via het invoercontract van de spelbot; key() zou window én document raken en dubbel tellen)
const esc = async () => { if (window.__bot) await window.__bot.press('escape', 120); else key('Escape', 'Escape'); };
const openSamen = async () => { // het pauzemenu, onderdeel Samen (zoals een speler)
  await esc();
  await until(() => document.querySelector('.ra[data-goto="spel"]'), 8000, 'rail-knop Spel');
  document.querySelector('.ra[data-goto="spel"]').click(); await sleep(400); await until(() => document.querySelector('#pause-menu [data-of="spel"][data-subtab="samen"]'), 8000, 'tabblad Samen spelen'); document.querySelector('#pause-menu [data-of="spel"][data-subtab="samen"]').click();
  await until(() => panel() && !panel().closest('[hidden]'), 5000, 'paneel Samen');
};
// terug het spel in zoals een speler: de knop Doorgaan van het overzicht (Escape in het pauzemenu gaat een stap terug)
const closeMenu = async () => {
  for (let i = 0; i < 6; i++) {
    if (!document.querySelector('#pause-menu.visible')) break; // niet op world.paused: een filmpje pauzeert de wereld ook, en Escape zou dan het menu juist openen
    const resume = [...document.querySelectorAll('#pause-menu [data-action="resume"]')].find((b) => b.offsetParent);
    if (resume) resume.click();
    else { const ov = document.querySelector('#pause-menu .ra[data-goto="spel"]'); if (ov && ov.getAttribute('aria-current') !== 'true') ov.click(); else await esc(); }
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
// Het wachtscherm van Samen spelen (#636/#639): één overlay-component met .cp-overlay.
// De oude class .coop-hold bestaat niet meer; deze helper houdt de checks gelijk aan de code.
const HOUD_SEL = '.coop-hold, .cp-overlay';
const houdOpen = () => !!document.querySelector(HOUD_SEL);
function sampleNow(n) {
  const x = W(); if (!x) return null;
  const b = (o) => (o ? { x: Math.round(o.x * 10) / 10, y: Math.round(o.y * 10) / 10, char: o.character || '' } : null);
  const net = x.coopNet, ses = net && net.session;
  const hm = x.coopHostMissie;
  const cine = document.getElementById('cine');
  return {
    fps: FPS.fps, gap: FPS.gapLast,
    n, ph: state.phase, paused: !!x.paused, uiPaused: !!x.uiPaused, coopHold: !!x.coopHold, hold: houdOpen(), clock: x.time, uur: x.clock, slot: ses ? ses.slot : (net && net.role === 'host' ? 0 : -1),
    status: ses ? ses.status : (net && net.hub ? [...net.hub.sessions.entries()].map(([s, v]) => s + ':' + v.status).join(',') : null),
    inp: ses && ses.pendingInput ? [Math.round(ses.pendingInput.mx * 100) / 100, Math.round(ses.pendingInput.my * 100) / 100] : null,
    ids: net && net.hub ? [...net.hub.sessions.entries()].map(([s, v]) => s + ':' + (v.link && v.link.id)).join(',') : null,
    rtt: ses ? Math.round(ses.rtt * 1000) : (net && net.hub ? Math.round(Math.max(0, ...[...net.hub.sessions.values()].map((v) => v.rtt)) * 1000) : null),
    desync: x.coopDesync ? x.coopDesync.velden : null, desyncN: x.coopDesync ? x.coopDesync.n : 0, money: x.money, wanted: x.wanted | 0, role: x.coopRole || null,
    me: b(x.player), companion: b(x.companion), f1: b(x.coopFigures && x.coopFigures[1]), /* f1: de figuur van de gast op de host (sinds #516 geen companion meer) */ cam: x.coopCam ? 1 : 0,
    partners: (x.coopPartners || []).map((p) => [p.slot, p.naam, p.status, Math.round(p.x), Math.round(p.y)]),
    roster: x.coopRoster ? x.coopRoster.map((s) => [s.slot, s.char, s.verbinding]) : null, figuren: Object.keys(x.coopFigures || {}).length,
    sc: x.coopScene ? [x.coopScene.filmpje ? 1 : 0, x.coopScene.pauze ? 1 : 0, x.coopScene.regel ? x.coopScene.regel.tekst.slice(0, 40) : '', x.coopScene.keuze ? x.coopScene.keuze.opties.length : 0] : null, sceneEl: !!document.getElementById('coop-scene'),
    verdiend: x.coopVerdiend || 0,
    // #516/#502: de invoer van een gast staat op zijn eigen figuur (coopFigures[slot].input);
    // world.coop.remoteInput wordt sindsdien niet meer gevuld. De oude bron blijft als terugval.
    ri: (() => {
      const f = x.coopFigures && x.coopFigures[1];
      const r = (f && f.input) || (x.coop && x.coop.remoteInput);
      return r ? [Math.round((r.mx || 0) * 100) / 100, Math.round((r.my || 0) * 100) / 100, r.buttons | 0] : null;
    })(),
    hm: hm ? (hm.actief ? hm.label + ' | ' + (hm.stap || '') : '-') : null,
    weer: x.weatherState && x.weatherState.regions ? Object.entries(x.weatherState.regions).map(([id, r]) => id + ':' + r.kind + ':' + Math.round(r.rain * 100)).join(',') : null, wx: x.weather ? [x.weather.kind || '', Math.round((x.weather.intensity || 0) * 100)] : null, pm: (x.coopPingMarks || []).map((m) => m.tekst + '|' + m.naam).join(';'), voert: x.coopInVoertuig ? 1 : 0,
    hostMesh: x.coopHostMeshes || null, hostDbg: x.coopHostDbg || null, deuren: x.coopDeurenDbg ?? null, geluid: [x.coopHoornDbg || 0, x.coopSirenDbg || 0], extraDbg: x.coopExtraDbg || null, extra: x.coopExtraMeshes || null, extraB: x.coopExtraBytes || 0, extraS: x.coopExtra ? [x.coopExtra.voetgangers.size, x.coopExtra.uiterlijk.size, x.coopExtra.dieren.size, x.coopExtra.lichten.size, x.coopExtra.kapot.length] : null,
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
  nc.MQTT_BROKERS.splice(0, nc.MQTT_BROKERS.length, ...(CFG.mqttPort ? [`ws://127.0.0.1:${CFG.mqttPort}`] : [])); // de lijst-suite (#983): een nep-MQTT-broker voor de openbare sessielijst
  nc.ICE_SERVERS.splice(0, nc.ICE_SERVERS.length);
  nc.PEERJS.host = '127.0.0.1'; nc.PEERJS.port = 1; nc.PEERJS.secure = false;
  nc.TIMEOUTS.connect = 40000;
  log('route-ingesteld', { trackers: nc.TRACKERS.length, stun: nc.ICE_SERVERS.length });
}

// 22-11 (#1120): de kaart met naam en akkoord (onlineconsentui.js), ingevuld zoals een speler
async function vulNaamkaart() {
  const veld = document.querySelector('.os-naam');
  veld.value = CFG.role === 'host' ? 'Bouwer' : 'Gastspeler';
  veld.dispatchEvent(new Event('input', { bubbles: true }));
  const vink = document.querySelector('.os-consent-vink'); if (vink && !vink.checked) vink.click();
  await sleep(300);
  log('naamkaart', { naam: veld.value, vink: !!(vink && vink.checked) });
  shot('naamkaart-' + CFG.role);
  document.querySelector('.os-kaart [data-doorgaan]').click();
  await sleep(600);
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
    // 22-11 (#1120): bij het eerste Samen spelen komt eerst de kaart met naam en akkoord (onlineconsentui.js); de testbank vult hem zoals een speler
    const eerst = await until(() => document.querySelector('.os-kaart') || document.querySelector('#samenkeuze .sk-item'), 8000, 'de naamkaart of het scherm Samen spelen (keuze)');
    if (eerst.closest && eerst.closest('.os-kaart') || eerst.classList.contains('os-kaart')) await vulNaamkaart();
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
    // 22-11 (#1120): zonder naam en akkoord toont het onderdeel Samen eerst de naamkaart (samenpanel.js); zonder die stap vond de testbank geen knoppen
    const kaart = await until(() => document.querySelector('.os-kaart') || buttons().length, 8000, 'de naamkaart of de knoppen van Samen spelen').catch(() => null);
    if (kaart && kaart.classList && kaart.classList.contains('os-kaart')) { await vulNaamkaart(); await until(() => buttons().length, 8000, 'knoppen van Samen spelen na de naamkaart'); }
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
    await wizard('prive');
    // 22-11 (multiplayerwizardui.js): de kamercode heet in de wizard 'Open je spel' (host-open, die route-kamer aanroept); route-kamer zelf staat er niet meer
    if (CFG.route === 'kamer') { await until(() => buttons().includes('host-open') || buttons().includes('route-kamer'), 8000, 'knop host-open of route-kamer'); await act(buttons().includes('host-open') ? 'host-open' : 'route-kamer'); }
    else await act('route-direct');
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
    await wizard(CFG.lijst ? 'lijst' : 'code');
    if (CFG.lijst) { // #983: de sessie openbaar maken (alleen de naam, geen kamercode); gasten komen via de lijst
      await act('openbaar'); const inv = await until(() => panel().querySelector('.coop-input'), 5000, 'naamveld van de openbare sessie');
      inv.value = 'Testspel'; inv.dispatchEvent(new Event('input', { bubbles: true }));
      await act('openbaar-ja'); log('openbaar', { titel: title(), tekst: panel().innerText.slice(0, 400), net: netNow() }); shot('host-openbaar');
    }
    { const b0 = panel().querySelector('[data-act="start-spel"]'); log('start-alleen', { knop: !!b0, uit: !!(b0 && b0.disabled), tekst: panel().innerText.slice(0, 500) }); } // alleen jij: Spel starten staat uit
    await until(() => title() === 'Je speelt samen', CFG.waitS ? CFG.waitS * 1000 : 120000, 'een gast');
  } else {
    if (buttons().includes('kies-gast')) await act('kies-gast');
    await wizard(CFG.lijst ? 'lijst' : 'code'); // (#1059) eerst 'Wie ben jij?' (wie-verder): zonder die klik is er geen kamercodeveld
    log('scherm', { titel: title(), knoppen: buttons(), tekst: panel().innerText.slice(0, 500) });
    if (CFG.lijst) { // #983: via de openbare sessielijst in plaats van de kamercode in te typen
      await act('lijst');
      log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 600), knoppen: buttons(), net: netNow() });
      await sleep(CFG.consentWaitMs || 2500);
      log('toestemming-wacht', { net: netNow() });
      await act('lijst-go');
      await until(() => panel().querySelector('[data-act="sluit-0"]'), 60000, 'een rij in de openbare lijst');
      log('lijst-rij', { tekst: panel().innerText.slice(0, 500), net: netNow() }); shot('gast-lijst');
      await act('sluit-0');
      if (panel().querySelector('[data-act="akkoord"]')) await act('akkoord');
    } else {
    const input = await until(() => panel().querySelector('.coop-input'), 5000, 'invoerveld');
    if (CFG.tekstTest) await PHASES.tekstveld();
    input.value = CFG.code; input.dispatchEvent(new Event('input', { bubbles: true }));
    await act('koppel');
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 600), knoppen: buttons(), net: netNow() });
    await sleep(CFG.consentWaitMs || 2500);
    log('toestemming-wacht', { net: netNow() });
    await act('akkoord');
    }
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
    setTimeout(async () => { try { await until(() => W().coopStartMeting && W().coopStartMeting.klaar, 90000, 'start-meting'); const m = W().coopStartMeting; log('start-meting', { samenvatting: m.samenvatting, stappen: m.stappen, events: m.events.slice(0, 40) }); } catch (e) { /* geen meting */ } }, 0); // #1011: wat zet de gastheer stil na Spel starten
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
// samen-qa 24-11: hulpjes voor de fasen qa* (een klok per fase, de figuur van de gast bij de gastheer, de gastheer in de snapshot bij de gast)
let qaStart = 0;
const qaT0 = () => qaStart;
const qaKlok = () => { qaStart = performance.now(); const t0 = qaStart; return (sec) => sleep(Math.max(0, sec * 1000 - (performance.now() - t0))); };
const qaR = (v) => Math.round(v * 10) / 10;
const qaGastFig = () => Object.values((W() || {}).coopFigures || {}).find((f) => f && f.slot >= 1) || null;
const qaIk = async () => (await imp('spelersregister')).hoofdspeler(W());
const qaHost = () => { try { const s = W().coopNet.session.world(); return s ? (s.players || []).find((p) => p.slot === 0) || null : null; } catch (e) { return null; } };
const qaMsgs = () => { const w = W(); window.__qaMsgs = window.__qaMsgs || []; if (!w.__qaHaak) { const o = w.addMessage.bind(w); w.addMessage = (t, ...a) => { window.__qaMsgs.push(String(t)); return o(t, ...a); }; w.__qaHaak = true; } return window.__qaMsgs; };
// opzij: een beetje schuin, anders staat het doel precies achter de eigen figuur (de camera kijkt over de schouder)
const qaKijk = (x, y, opzij = 0.45) => { const w = W(), me = w.lokaalLichaam || w.player; if (me && Number.isFinite(x) && Number.isFinite(y)) w.camYaw = Math.atan2(y - me.y, x - me.x) + opzij; };
// een plek waar een voetganger kan staan (pedestrians.js walkerSpotClear), in ringen rond x, y
const qaVrij = async (x, y) => {
  const P = await imp('pedestrians'), map = W().map;
  for (let r = 0; r <= 24; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (P.walkerSpotClear(map, px, py)) return { x: px, y: py }; if (r === 0) break; }
  return { x, y };
};
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
  // boten en treinen bij de gast (#428): zoek water en spoor rond de gast; de gescripte gastheer zet de gast en de voertuigen erheen; daarna beeld en meting
  async zoek428({ soort = 'water' }) {
    const w = W(); const me = w.player; window.__k428 = window.__k428 || {};
    if (soort === 'water') {
      const { isInWater } = await import('./js/util.js'); let best = null;
      // breed water: 40 m door in de kijkrichting en 10 m opzij; anders (verder zoeken) het eerste water met 14 m erachter
      const breed = (x, y, a) => [0, 10, 20, 30, 40].every((d) => isInWater(w.map, x + Math.cos(a) * d, y + Math.sin(a) * d)) && [-10, 10].every((l) => isInWater(w.map, x + Math.cos(a) * 30 - Math.sin(a) * l, y + Math.sin(a) * 30 + Math.cos(a) * l));
      for (let r = 8; r <= 500 && !best; r += 8) for (let a = 0; a < 6.283 && !best; a += 0.2) { const x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r; if (breed(x, y, a)) best = { x, y, a, r, breed: true }; }
      for (let r = 4; r <= 120 && !best; r += 3) for (let a = 0; a < 6.283 && !best; a += 0.15) { const x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r; if (isInWater(w.map, x, y) && isInWater(w.map, x + Math.cos(a) * 14, y + Math.sin(a) * 14)) best = { x, y, a, r }; }
      if (best) best.zet = [best.x - Math.cos(best.a) * 5, best.y - Math.sin(best.a) * 5];
      window.__k428.water = best; log('zoek428-water', best || { geen: true }); // de gastheer brengt de gast erheen (de plek van de gast is van de gastheer)
    } else if (soort === 'brug') { // een beweegbare brug en een sluis in de buurt (de gescripte gastheer laat ze bewegen)
      const M = await import('./js/movablebridges.js'), S = await import('./js/sluizen.js'); let best = null, sl = null;
      for (const b of M.getMovableBridges()) { const d = Math.hypot(b.x - me.x, b.y - me.y); if (d < 3000 && (!best || d < best.d)) best = { soort: 'brug', x: b.x, y: b.y, d, naam: b.name, len: b.len }; }
      for (const l of S.getSluizen()) { const d = Math.hypot(l.x - me.x, l.y - me.y); if (d < 6000 && (!sl || d < sl.d)) sl = { soort: 'sluis', x: l.x, y: l.y, d, naam: l.name }; }
      if (best) best.zet = [best.x + 14, best.y + 14];
      window.__k428.brug = best; log('zoek428-brug', { brug: best, sluis: sl, aantal: [M.getMovableBridges().length, S.getSluizen().length] });
    } else {
      const R = await import('./js/railway.js'); const routes = R.getRoutes(); let best = null;
      routes.forEach((rt, idx) => { for (let c = 0; c < rt.len; c += 8) { const p = R.routePoint(rt, c), d = Math.hypot(p[0] - me.x, p[1] - me.y); if (!best || d < best.d) best = { idx, c, d, x: p[0], y: p[1], len: rt.len, naam: rt.name }; } });
      let kruis = null; // liever een overweg erbij (slagbomen): de dichtstbijzijnde binnen 900 m
      routes.forEach((rt, idx) => { for (const rc of rt.crossings || []) { const p = R.routePoint(rt, rc.s), d = Math.hypot(p[0] - me.x, p[1] - me.y); if (d < 900 && (!kruis || d < kruis.d)) kruis = { idx, c: rc.s, d, x: p[0], y: p[1], len: rt.len, naam: rt.name, overweg: true }; } });
      if (kruis) best = kruis;
      if (best) { const rt = routes[best.idx], c0 = Math.max(0, best.c - 400), pts = []; for (let c = c0; c <= Math.min(rt.len, best.c + 400); c += 6) pts.push(R.routePoint(rt, c).map((v) => Math.round(v * 100) / 100)); best.c0 = c0; best.pts = pts; }
      if (best) { const rt = routes[best.idx], a = R.routePoint(rt, best.c), b = R.routePoint(rt, best.c + 4), ang = Math.atan2(b[1] - a[1], b[0] - a[0]); best.zet = [a[0] - Math.sin(ang) * 11, a[1] + Math.cos(ang) * 11]; }
      window.__k428.spoor = best; log('zoek428-spoor', best ? { ...best, aantalRoutes: routes.length, treinen: R.getTrains().length } : { geen: true });
    }
  },
  async toon428({ soort = 'water', naam = 'toon', n = 3 }) {
    const w = W(); const me = w.player; const doel = (window.__k428 || {})[soort];
    if (!doel) { log('toon428', { soort, geen: true }); return; }
    const a0 = soort === 'water' ? doel.a : Math.atan2(doel.y - me.y, doel.x - me.x);
    const R = await import('./js/railway.js');
    for (let i = 0; i < n; i++) {
      w.camYaw = a0 + (i === 1 ? 0.6 : i === 2 ? -0.6 : 0); await sleep(1200); shot(naam + '-' + i);
      const treinen = R.getTrains().filter((t) => !t.gastWeg && Math.hypot(t.cars[0].x - me.x, t.cars[0].y - me.y) < 300).map((t) => ({ route: R.getRoutes().indexOf(t.route), c: Math.round(t.c), v: Math.round(t.v * 10) / 10, dir: t.dir, state: t.state, auto: t.cars.length, auto0: [t.cars[0].x, t.cars[0].y, t.cars[0].z].map((v) => Math.round(v * 10) / 10) }));
      log('toon428', { soort, i, ik: [Math.round(me.x), Math.round(me.y)], pos: w.coopHostPos || null, treinen, boomMax: (R.getLevelCrossings() || []).map((c) => Math.round(c.boom * 100) / 100).filter((b) => b > 0), deuren: w.coopDeurenDbg || null,
        bruggen: soort === 'brug' ? (await import('./js/movablebridges.js')).getMovableBridges().filter((b) => b.state !== 'closed' || b.open > 0).map((b) => [b.state, Math.round(b.open * 100) / 100, Math.round(b.boom * 100) / 100, Math.round(b.x), Math.round(b.y)]) : null });
      await sleep(400);
    }
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
    await until(() => document.querySelector('.ra[data-goto="spel"]'), 8000, 'rail-knop Spel');
    document.querySelector('.ra[data-goto="spel"]').click(); await sleep(400); await until(() => document.querySelector('#pause-menu [data-of="spel"][data-subtab="samen"]'), 8000, 'tabblad Samen spelen'); document.querySelector('#pause-menu [data-of="spel"][data-subtab="samen"]').click(); await sleep(400); await until(() => document.querySelector('#pause-menu [data-of="samen"][data-subtab="spelers"]'), 8000, 'tabblad Spelers'); document.querySelector('#pause-menu [data-of="samen"][data-subtab="spelers"]').click();
    await sleep(1200);
    const p = document.querySelector('#pause-menu [data-of="samen"][data-sub="spelers"]');
    const rail = document.querySelector('#pause-menu .pm-rail .pm-game'), opsl = document.querySelector('#pause-menu [data-action="save"]');
    const first = document.querySelector('#pause-menu .pm-game .ra'), second = document.querySelectorAll('#pause-menu .pm-game .ra')[1];
    log('spelersmenu', { zichtbaar: !!p && !p.hidden, rijen: p ? p.querySelectorAll('.cs-rij').length : 0, roep: p ? p.querySelectorAll('[data-ping]').length : 0,
      rail: rail ? [rail.scrollHeight, rail.clientHeight] : null, opslaan: opsl ? Math.round(opsl.getBoundingClientRect().bottom) : null, venster: [innerWidth, innerHeight], raHoogte: first && second ? Math.round(second.getBoundingClientRect().top - first.getBoundingClientRect().top) : null, coop: document.getElementById('pause-menu').dataset.coop,
      css: first ? { hoogte: getComputedStyle(first).height, raH: getComputedStyle(document.querySelector('#pause-menu .pm-rail')).getPropertyValue('--ra-h'), lettergrootte: getComputedStyle(first).fontSize, zoom: getComputedStyle(document.getElementById('pause-menu')).zoom, spHoogte: getComputedStyle(document.querySelector('#pause-menu .pm-rail-sp')).height, mt: getComputedStyle(document.getElementById('pause-menu')).getPropertyValue('--mt') } : null });
    shot(name); await sleep(500); await closeMenu();
  },
  // #1011: een bijbaan door een gast, in een echte sessie. De gast (args.wie) staat bij het startpunt en drukt E; de anderen
  // krijgen "Meedoen?" en zeggen J. Gelogd: wie meedoet, de stand van de baan en het geld per speler (elke meedoende krijgt het volle bedrag).
  async gastbijbaan({ s = 45, wie = 'gast', id = 'krantenwijk', beloon = 0, bied = 0 }) {
    const w = W(); const SJ = await import('./js/sidejobs.js'); const CB = await import('./js/coopbijbaan.js'); let beloond = false, wisselBod = false, wisselJ = false;
    const spot = SJ.getSideJobSpotsForRender().find((x) => x.job && x.job.id === id);
    const geld0 = w.money | 0; let jGestuurd = false, deelde = false, verzoek = false; const slotVan = { gast: 1, gast2: 2, gast3: 3 }[wie] || 1;
    log('gastbijbaan-begin', { wie: CFG.name, spot: spot ? [Math.round(spot.x), Math.round(spot.y)] : null, geld: geld0 });
    if (!spot) { await sleep(s * 1000); return; }
    const t0 = performance.now(); let laatsteLog = 0;
    while (performance.now() - t0 < s * 1000) {
      const G = w.coopBijbaanGast;
      // de plek van een gast is van de gastheer: de host zet de figuur van de gast bij het startpunt (de gast loopt er zelf niet heen)
      if (CFG.role === 'host' && performance.now() - t0 < 9000) { const f = (w.coopFigures || {})[slotVan]; if (f) { f.x = spot.x + 0.8; f.y = spot.y; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; } }
      if (CFG.name === wie && !verzoek && performance.now() - t0 > 6000) { key('e', 'KeyE'); verzoek = true; log('gastbijbaan-e', { wie: CFG.name, pos: [Math.round(w.player.x), Math.round(w.player.y)], spot: [Math.round(spot.x), Math.round(spot.y)], msg: (w.messages || []).slice(-2).map((m) => m.text || m) }); }
      if (CFG.name !== wie && CFG.role !== 'host' && !jGestuurd && G && G.uitn) { key('j', 'KeyJ'); jGestuurd = true; log('gastbijbaan-j', { wie: CFG.name, uitn: G.uitn.label }); }
      // #1011: de ronde afronden zoals sidejobs.js completeRound het doet (de plek van de starter is de eigenaar): wie krijgt de beloning, over het echte netwerk?
      if (beloon && CFG.role === 'host' && !beloond && performance.now() - t0 > 28000) { beloond = true; const st = CB.staatVan(w.coopNet, slotVan); const ja = Object.entries((st && st.keuze) || {}).filter(([, v]) => v === 'ja').map(([k]) => +k); const ok = CB.bijbaanBeloning(w, id, beloon, null, 0, null, slotVan); log('gastbijbaan-beloning', { ok, ja, basis: beloon }); CB.bijbaanEind(w, 'ok', slotVan); }
      // #1011: hostwissel midden in de baan (route 'kamer'): de host biedt het spel aan plek 1 aan, die zegt J; de rest verbindt opnieuw bij de nieuwe host
      if (bied && CFG.role === 'host' && !wisselBod && performance.now() - t0 > bied * 1000) { wisselBod = true; const HW = await import('./js/coophostwisselnet.js'); log('overdracht-bod', { r: HW.biedOver(w, 1), rol: w.coopNet && w.coopNet.role }); }
      if (bied && CFG.name === 'gast' && !wisselJ) { const u = w.coopWisselUi; if (u && u.vraag) { wisselJ = true; key('j', 'KeyJ'); log('overdracht-j', { vraag: u.vraag.tekst }); } }
      if (G && G.deelt) deelde = true;
      if (performance.now() - laatsteLog > 3000) { laatsteLog = performance.now(); log('gastbijbaan-stand', { wie: CFG.name, rol: w.coopNet ? w.coopNet.role : null, slot: w.coopNet && w.coopNet.session ? w.coopNet.session.slot : (w.coopNet && w.coopNet.role === 'host' ? 0 : null), spelers: (w.coopRoster || []).length, wissel: !!(w.coopWisselUi && (w.coopWisselUi.vraag || w.coopWisselUi.pauze)), deelt: !!(G && G.deelt), uitn: !!(G && G.uitn), baan: G && G.id, sideJob: w.sideJob ? { actief: !!w.sideJob.active, naam: w.sideJob.name || null } : null, geld: w.money | 0 }); }
      await sleep(500);
    }
    shot('gastbijbaan');
    log('gastbijbaan-eind', { wie: CFG.name, deelde, geldWinst: (w.money | 0) - geld0 });
  },
  // #1011: plaatsborden omver en de wereld van de host bij de gasten: de host breekt borden en banken om zich heen, de gasten melden de kapot-lijst (EXTRA) en wat ze van verkeer en voetgangers zien
  async bordenkapot({ s = 20 }) {
    const w = W(), B = await import('./js/breakables.js'); const p = w.player;
    if (CFG.role === 'host') {
      for (const f of Object.values(w.coopFigures || {})) { f.x = p.x + 3; f.y = p.y + 1; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; } // de gasten staan na de baan nog bij het startpunt: weer naast de host
      await sleep(3000);
      const kandidaten = B.propsInRadius(p.x, p.y, 120, ['placesign', 'wegwijzer', 'bench', 'bin', 'lamp']).filter((q) => /^[a-z]+@-?\d+,-?\d+$/.test(q.key)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3);
      const gebroken = kandidaten.filter((q) => B.breakPropByKey(q.key, q.x, q.y, 1, 0)).map((q) => q.key);
      log('borden-host', { kandidaten: kandidaten.map((q) => q.key), gebroken, voertuigen: (w.vehicles || []).length, peds: (w.pedestrians || []).length });
      await sleep(s * 1000); return;
    }
    await sleep(Math.min(16, s - 4) * 1000);
    const e = w.coopExtra;
    log('borden-gast', { kapot: e ? e.kapot.map((k) => [k.key, B.isPropBroken(k.key)]) : null, voetgangers: e ? e.voetgangers.size : null, dieren: e ? e.dieren.size : null, hostMesh: w.coopHostMeshes || null, extraMeshes: w.coopExtraMeshes || null, lokaalVoertuigen: (w.vehicles || []).length, lokaalPeds: (w.pedestrians || []).length });
    shot('borden-gast'); await sleep(4000);
  },
  // #1061: Fatbikes ontwijken (M08) samen, in echte vensters. De host springt naar M08 en laat de spelbot de baan lopen (de groep loopt hem samen te voet);
  // de gasten zeggen J bij "Meedoen?". Elk venster logt elke 3 s zijn eigen ontweek-regel uit het HUD (tellers per speler) en of er een opdracht loopt.
  async fatbikes({ s = 150 }) {
    const w = W(); const t0 = performance.now(); let jGestuurd = false;
    const hudRegel = () => { const m = /Ontweken: (\d+)[^\n]*?Geraakt (\d+)\/(\d+)/.exec(document.body.innerText || ''); return m ? { ontweken: +m[1], geraakt: +m[2], grens: +m[3] } : null; };
    const opdracht = () => { const m = CFG.role === 'host' ? w.mission : (w.coopMissie || w.coopHostMissie); return m ? { actief: CFG.role === 'host' ? m.phase === 'active' : !!m.actief, label: m.label || null, tekst: String(m.progressText || m.tekst || '').slice(0, 120) } : null; };
    if (CFG.role === 'host') {
      window.__botCfg = { part: 'all', from: 'M08', until: 'M09', maxGameS: 3600, maxWallS: Math.max(60, s - 12), stuckS: 45, shots: 12, speed: 1, waitS: 60, invulnerable: !!CFG.invuln };
      log('fatbikes-bot', {});
      window.__botMain().then((r) => log('fatbikes-bot-einde', { r }), (e) => log('fatbikes-bot-fout', { msg: String(e && e.message || e) }));
    }
    while (performance.now() - t0 < s * 1000) {
      try {
        if (CFG.role !== 'host' && !jGestuurd) { const u = w.coopUitnodiging; if (u) { key('j', 'KeyJ'); jGestuurd = true; log('fatbikes-j', { wie: CFG.name, stap: u.stap || null }); } }
        log('fatbikes-stand', { wie: CFG.name, rol: CFG.role, opdracht: opdracht(), hud: hudRegel(), geld: w.money | 0, gezondheid: Math.round(w.health || 0), speler: w.player ? [Math.round(w.player.x), Math.round(w.player.y)] : null });
      } catch (e) { log('fatbikes-fout', { msg: String(e && e.message || e) }); }
      await sleep(3000);
    }
    shot('fatbikes-' + CFG.name);
  },
  // #1061: de penaltyserie Euroborg (#981) als punt-wedstrijd. De host staat bij de spelerspoort en drukt E (uitnodiging); de gasten zeggen J. Iedereen schiet zijn eigen vijf
  // penalty's via het debug-handvat window.__penalty op zijn eigen scherm; de host houdt de ranglijst. Gelogd: de eigen reeks (vijf beurten) en de uitslag van de host.
  async penaltyserie({ s = 90 }) {
    const w = W(); const B = window.__bot; const t0 = performance.now();
    const P = () => window.__penalty;
    const schiet = async (naam) => {
      const g = { genomen: 0, goals: 0, schoten: [] }; let laatste = null;
      for (let i = 0; i < 400 && performance.now() - t0 < (s - 4) * 1000; i++) {
        const st = P() && P().state();
        if (st) { laatste = st; if (st.fase === 'richten' && st.genomen < 5) { P().aim(0.4 * (st.genomen % 2 ? 1 : -1), 0.9); P().shoot(); await sleep(400); } }
        else if (laatste) break;
        await sleep(250);
      }
      if (laatste) { g.genomen = laatste.genomen; g.goals = laatste.goals; g.schoten = laatste.schoten || []; }
      log('pen-reeks', { wie: naam, ...g });
    };
    if (CFG.role === 'host') {
      const p = w.player; const sp = P() && P().spot();
      if (!sp) { log('pen-geen-poort'); await sleep(s * 1000); return; }
      p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0;
      await sleep(7000);
      for (let i = 0; i < 6 && !(w.coopNet && w.coopNet.wed && w.coopNet.wed.u); i++) { if (B) await B.press('e', 150); else key('e', 'KeyE'); await sleep(1000); }
      log('pen-uitnodiging', { wed: !!(w.coopNet && w.coopNet.wed && w.coopNet.wed.u), gasten: (w.coopRoster || []).filter((x) => x.slot > 0).length });
      await sleep(5000);
      await schiet('host');
      const w2 = performance.now(); while (performance.now() - w2 < 40000 && !(w.coopNet.wed && w.coopNet.wed.uitslag)) await sleep(500);
      const wed = w.coopNet.wed || {};
      log('pen-uitslag', { rijen: wed.uitslag ? wed.uitslag.rijen : null, jij: wed.uitslag ? wed.uitslag.jij : null, geld: w.money | 0 });
      shot('pen-uitslag-host');
    } else {
      await until(() => w.coopWedGast && w.coopWedGast.uitn, 60000, 'uitnodiging penaltyserie');
      log('pen-uitnodiging-gast', { label: w.coopWedGast.uitn.label });
      await sleep(700);
      if (B) await B.press('j', 150); else key('j', 'KeyJ');
      await until(() => P() && P().state(), 25000, 'eigen penaltyserie');
      const geld0 = w.money | 0;
      await schiet(CFG.name);
      const w3 = performance.now(); while (performance.now() - w3 < 30000 && !w.coopWedGast.uitslag) await sleep(500);
      log('pen-uitslag-gast', { uitslag: w.coopWedGast.uitslag ? { rijen: (w.coopWedGast.uitslag.rijen || []).length, jij: w.coopWedGast.uitslag.jij || null } : null, geldErbij: (w.money | 0) - geld0 });
      shot('pen-uitslag-' + CFG.name);
    }
  },
  // #1061: de duifmodus (de duivenspot) van de host: alleen de host heeft de gids (#pigeon-guide, de doelen en de pijl). De host stapt in de duif bij het eerste duivenspot; elke gast
  // logt of de gids bij hem zichtbaar is (hoort niet), of hij de duif van de host als dier ziet, en of zijn eigen duifmodus uit staat.
  async duivenspot({ s = 40 }) {
    const w = W(); const guide = () => { const e = document.getElementById('pigeon-guide'); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
    if (CFG.role === 'host') {
      const PS = await imp('pigeonspots'), PM = await imp('pigeonmode');
      const spot = PS.getPigeonSpotsForRender()[0];
      if (!spot) { log('duif-geen-spot'); await sleep(s * 1000); return; }
      w.player.x = spot.x + 0.6; w.player.y = spot.y; w.player.vx = 0; w.player.vy = 0;
      await sleep(6000);
      let r = null; try { r = PM.startPigeonMode(w, spot); } catch (e) { r = 'fout ' + e.message; }
      await sleep(4000);
      log('duif-host', { gestart: r, actief: PM.isPigeonActive(), gids: guide(), spot: [Math.round(spot.x), Math.round(spot.y)] });
      shot('duif-host'); await sleep((s - 14) * 1000);
      try { PM.stopPigeonMode(w); } catch (e) { /* al gestopt */ }
      await sleep(2000);
      log('duif-host-na', { actief: PM.isPigeonActive() });
    } else {
      await sleep(14000);
      const e = w.coopExtra; const duiven = e && e.dieren ? [...e.dieren.values()].filter((d) => d && (d.soort === 'pigeon' || d.kind === 'pigeon' || d.s === 'pigeon')).length : null;
      log('duif-gast', { gids: guide(), pigeonMode: !!w.pigeonMode, duivenZichtbaar: duiven, hostFig: !!(w.coopFigures && w.coopFigures[0]) || !!w.coopHost });
      shot('duif-gast-' + CFG.name); await sleep((s - 16) * 1000);
    }
  },
  // #1061: een echt plaatsbord of een wegwijzer omver (de testbank brak eerder alleen lampen, die in dezelfde kapot-lijst staan). De host zoekt het dichtstbijzijnde bord, loopt erheen,
  // breekt het; de gasten melden of dezelfde sleutel bij hen kapot staat.
  async plaatsbord({ s = 24 }) {
    const w = W(), B = await import('./js/breakables.js'); const p = w.player;
    if (CFG.role === 'host') {
      const lijst = B.propsInRadius(p.x, p.y, 900, ['placesign', 'wegwijzer']).filter((q) => /^[a-z]+@-?\d+,-?\d+$/.test(q.key)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const q = lijst[0];
      if (!q) { log('bord-geen', { straal: 900 }); await sleep(s * 1000); return; }
      p.x = q.x + 2; p.y = q.y; p.vx = 0; p.vy = 0;
      for (const f of Object.values(w.coopFigures || {})) { f.x = q.x + 3; f.y = q.y + 1; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; }
      await sleep(5000);
      const gebroken = B.breakPropByKey(q.key, q.x, q.y, 1, 0);
      log('bord-host', { key: q.key, soort: q.key.split('@')[0], gebroken: !!gebroken, nu: B.isPropBroken(q.key) });
      shot('bord-host'); await sleep((s - 5) * 1000);
    } else {
      await sleep(Math.min(16, s - 4) * 1000);
      const e = w.coopExtra;
      const borden = e ? e.kapot.filter((k) => /^(placesign|wegwijzer)@/.test(k.key)).map((k) => [k.key, B.isPropBroken(k.key)]) : null;
      log('bord-gast', { borden, kapot: e ? e.kapot.length : null });
      shot('bord-gast-' + CFG.name); await sleep(4000);
    }
  },
  // #1061: hostwissel tijdens een filmpje: de host speelt een filmpje en biedt het spel aan plek 1 aan (moet weigeren met "Wacht tot het filmpje voorbij is."); na het filmpje
  // biedt hij opnieuw aan en de gast zegt J. Gelogd: de weigering, de tekst, en het antwoord na het filmpje.
  async filmpjewissel({ s = 12 }) {
    const w = W(); const HW = await imp('coophostwisselnet');
    if (CFG.role === 'host') {
      const C = await imp('cinematics');
      let ok = null; try { ok = C.playCinematic({ id: 'coop-test-wissel', priority: 5, duration: s, letterbox: true, skippable: false, lines: [{ speaker: 'Tammo', text: 'Een proeffilmpje: de overdracht moet even wachten.' }] }); } catch (e) { ok = 'fout ' + e.message; }
      await sleep(3000);
      const weiger = HW.biedOver(w, 1);
      log('wissel-tijdens-filmpje', { ok, actief: C.isCinematicActive(), weiger: { ok: weiger && weiger.ok, tekst: weiger && weiger.tekst } });
      shot('wissel-filmpje-host');
      const t1 = performance.now(); while (C.isCinematicActive() && performance.now() - t1 < (s + 8) * 1000) await sleep(250);
      await sleep(2500);
      const na = HW.biedOver(w, 1);
      log('wissel-na-filmpje', { actief: C.isCinematicActive(), ok: na && na.ok, tekst: na && na.tekst, rol: w.coopNet && w.coopNet.role });
    } else {
      let j = false; const t0 = performance.now();
      while (performance.now() - t0 < (s + 40) * 1000) {
        const u = w.coopWisselUi; if (CFG.name === 'gast' && !j && u && u.vraag) { j = true; key('j', 'KeyJ'); log('wissel-j', { vraag: u.vraag.tekst, filmpjeGast: !!(w.coopScene && w.coopScene.filmpje) }); }
        await sleep(300);
      }
    }
  },
  // #1061: het keuzescherm Besloten spelen (pauzemenu, Spel, Samen spelen) buiten een sessie. Alleen na 'stopHost' (de host zit dan niet meer in een sessie): de drie keuzekaarten
  // moeten binnen het scherm blijven en hun titels mogen niet afgekapt zijn (scrollWidth tegen clientWidth).
  async besloten() {
    if (CFG.role !== 'host') { await sleep(8000); return; }
    if (net()) { log('besloten-in-sessie', {}); return; }
    await openSamen(); await sleep(1500);
    const kaarten = [...document.querySelectorAll('#pause-menu .pm-hub-keuze')];
    const titel = (k) => k.querySelector('.pm-hub-kt');
    log('besloten-hub', {
      venster: [innerWidth, innerHeight],
      kaarten: kaarten.map((k) => { const r = k.getBoundingClientRect(), t = titel(k); return { act: k.dataset.act, label: t ? t.textContent.trim() : '', binnen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, titelAfgekapt: !!t && t.scrollWidth > t.clientWidth + 1, kaartAfgekapt: k.scrollWidth > k.clientWidth + 1 || k.scrollHeight > k.clientHeight + 1 }; }),
    });
    shot('besloten-hub'); await sleep(600);
    const b = document.querySelector('#pause-menu .pm-hub-keuze[data-keuze="besloten"]');
    if (b) { b.click(); await sleep(1200); shot('besloten-na'); log('besloten-klik', { tekst: (document.querySelector('#pause-menu .pm-samen') || { innerText: '' }).innerText.slice(0, 240) }); }
    await closeMenu();
  },
  // #1011 (privacy): een directe code (GDE2-...) of een IP-adres mag niet in de opslag van de speler staan
  async opslagcheck() {
    let dump = ''; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); dump += k + '=' + localStorage.getItem(k) + '|'; } } catch (e) { dump = ''; }
    log('opslagcheck', { sleutels: dump.split('|').filter(Boolean).map((l) => l.split('=')[0]), gde2: /GDE2-/.test(dump), ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(dump), lengte: dump.length });
    await sleep(500);
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
    log('uitval-midden', { hold: houdOpen(), uiPaused: !!(W() || {}).coopHold, paused: !!(W() || {}).paused, status: net() && net().session ? net().session.status : null });
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
    log('uitval-host', { hold: houdOpen(), uiPaused: !!W().coopHold, paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
    shot('uitval-host-hold');
    await sleep(21000);
    log('uitval-host-na', { hold: houdOpen(), uiPaused: !!W().coopHold, paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
  },
  // de verbinding van de gast gaat dicht (TCP weg): wachtscherm, 'Opnieuw verbinden', de code opnieuw invoeren, akkoord: zoals een speler
  async herverbind({ wie = 'gast' }) {
    if (CFG.name !== wie) { await sleep(28000); return; }
    const ses = net() && net().session;
    if (!ses) { log('herverbind-geen-sessie', {}); return; }
    ses.link.close();
    const hold = () => document.querySelector(HOUD_SEL); // het element zelf: knop() zoekt er de knoppen in (houdOpen() geeft alleen een boolean)
    await until(hold, 20000, 'wachtscherm na het sluiten van de verbinding');
    log('herverbind-hold', { hold: true, paused: !!W().paused, coopHold: !!W().coopHold, status: ses.status });
    shot('herverbind-hold');
    const knop = (act) => hold() && hold().querySelector('[data-act="' + act + '"]');
    await until(() => knop('hervat'), 5000, 'knop Opnieuw verbinden'); knop('hervat').click(); await sleep(400);
    const veld = await until(() => hold().querySelector('.coop-input'), 5000, 'invoerveld voor de code');
    log('herverbind-code', { voorgevuld: veld.value === CFG.code });
    veld.value = CFG.code; veld.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => knop('koppel'), 5000, 'knop koppel'); knop('koppel').click(); await sleep(400);
    // De toestemmingsknop is er met opzet niet bij het hervatten: coophold.js opent het wachtscherm met
    // start:'verbroken', lobbyui.js zet daarmee consented, en lobby.js slaat de stap 'toestemming' dan
    // over (hasConsent). Al één keer toegestemd in deze sessie. Alleen als de knop er wél is, klikken we.
    const akkoord = knop('akkoord');
    log('herverbind-toestemming', { knop: !!akkoord });
    if (akkoord) { shot('herverbind-toestemming'); akkoord.click(); }
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
      if (houdOpen()) z.holdGezien = true;
      if (x.paused && x.coopHold) z.pauzeGezien = true;
      if ((x.coopRoster || []).some((r) => r.slot === 1 && r.verbinding === 'lost')) z.lostGezien = true;
      await sleep(200);
    }
    log('herverbind-host', { ...z, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]), hold: houdOpen(), paused: !!W().paused });
    log('herverbind-host-na', { hold: houdOpen(), paused: !!W().paused, roster: (W().coopRoster || []).map((r) => [r.slot, r.verbinding]) });
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
    { // wat de gast zelf aan voertuigen heeft (niet van de gastheer): soort, afstand, snelheid en of er een beeld voor is (#428: lokaal verzonnen?)
      const S3 = await import('./js/scene3d.js'), p = w.player, soort = {}; let nabij = 0, stilNabij = 0, metBeeld = 0;
      for (const v of w.vehicles || []) { const k = v.isBoat ? 'boot' : v.isBike ? 'fiets' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : v.isCop ? 'politie' : v.parked ? 'geparkeerd' : v.ai || v.driver ? 'verkeer' : 'auto'; const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < 150) { nabij++; soort[k] = (soort[k] || 0) + 1; if (Math.abs(v.speed || 0) < 0.1) stilNabij++; if (S3.getVehicleMesh && S3.getVehicleMesh(v.id)) metBeeld++; } }
      const pos = () => (w.vehicles || []).filter((v) => Math.hypot(v.x - p.x, v.y - p.y) < 150).map((v) => [v.id, v.x, v.y]); const p0 = pos(); await sleep(3000); const p1 = new Map(pos().map((r) => [r[0], r])); let bewogen = 0; for (const r of p0) { const q = p1.get(r[0]); if (q && Math.hypot(q[1] - r[1], q[2] - r[2]) > 0.5) bewogen++; }
      log('w428-lokaalvoertuigen', { bewogen, van: p0.length, totaal: (w.vehicles || []).length, nabij, stilNabij, metBeeld, soort, hostVoertuigen: w.coopHostMeshes ? w.coopHostMeshes[0] : null });
    }
    log('w428', {
      meshes: w.coopExtraMeshes || null, hostMesh: w.coopHostMeshes || null, bytes: w.coopExtraBytes || 0, dbg: w.coopExtraDbg || null,
      stand: e ? [e.voetgangers.size, e.uiterlijk.size, e.dieren.size, e.lichten.size, e.kapot.length, e.spraak.size] : null,
      lichtT: [0, 1, 2, 3, 4].map((i) => (cs[i] ? Math.round(cs[i].t * 10) / 10 : null)), lichtC: [0, 1, 2, 3, 4].map((i) => (cs[i] ? Math.round(cs[i].cycle * 10) / 10 : null)), lichtHost: e ? [0, 1, 2, 3, 4].map((i) => (e.lichten.get(i) ? e.lichten.get(i).t : null)) : null,
      kapot: (e ? e.kapot : []).map((k) => [k.key, B.isPropBroken(k.key)]), lokaalPeds: (w.pedestrians || []).length, lokaalDieren: (w.wildlife || []).length, lokaalVoertuigen: (w.vehicles || []).length,
      sprekers: (w.extraSpeakers || []).length, misc: e ? [...e.misc.keys()] : null,
    });
    for (let i = 0; i < rond; i++) { w.camYaw = i * Math.PI * 2 / rond; await sleep(500); shot(naam + '-' + i); await sleep(300); }
  },
  // samen spelen (#428, duurtest): geheugen, scene en tabellen van de gast, elke `elke` seconden, `s` seconden lang (de gastheer laat voertuigen en voetgangers verlopen)
  async duurmeting({ s = 60, elke = 5 }) {
    if (CFG.role === 'host') { await sleep(s * 1000); return; }
    const w = W(), S3 = await import('./js/scene3d.js');
    const t0 = Date.now();
    while (Date.now() - t0 < s * 1000) {
      const sc = S3.getScene(), r = S3.getRenderer(), ses = w.coopNet && w.coopNet.session, e = w.coopExtra;
      let kids = 0; const mats = new Set(), geos = new Set(); if (sc) sc.traverse((o) => { kids++; if (o.geometry) geos.add(o.geometry); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m); });
      let gc = false; if (typeof window.gc === 'function') { window.gc(); gc = true; }
      log('duur', {
        t: Math.round((Date.now() - t0) / 1000), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, gc,
        geometries: r ? r.info.memory.geometries : null, textures: r ? r.info.memory.textures : null, programs: r ? r.info.programs.length : null, calls: r ? r.info.render.calls : null,
        sceneKinderen: kids, sceneMaterialen: mats.size, sceneGeometrieen: geos.size,
        hostMesh: w.coopHostMeshes || null, extraMesh: w.coopExtraMeshes || null, figuren: Object.keys(w.coopFigures || {}).length,
        stand: e ? [e.voetgangers.size, e.uiterlijk.size, e.spraak.size, e.dieren.size, e.lichten.size, e.misc.size, e.kapot.length] : null,
        snaps: ses ? ses.buf.snaps.length : null, relP: ses ? ses.rel.pending.length : null, relA: ses ? ses.rel.ahead.size : null, looks: ses && ses.looks ? ses.looks.size : null,
        sprekers: (w.extraSpeakers || []).length, status: ses ? ses.status : null, bubbels: document.querySelectorAll('.speech-bubble, .bubble').length, domEls: document.getElementsByTagName('*').length,
      });
      await sleep(elke * 1000);
    }
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
  // #434: vloeiend bewegen bij de gast: per beeld de plek van een voertuig, een voetganger en het lichaam van de gastheer zoals ze getekend worden,
  // en de snelheid tussen twee beelden (stappen per rAF). Een goed tempo heeft geen stilstand en geen sprongen.
  async gloed({ s = 12, naam = 'gloed' }) {
    const w = W();
    if (CFG.role === 'host') { await sleep(s * 1000); return; }
    const reeks = { auto: [], ped: [], host: [] };
    let vorige = performance.now(); const eind = vorige + s * 1000;
    await new Promise((res) => {
      const f = (nu) => {
        const dt = (nu - vorige) / 1000; vorige = nu;
        const h = w.coopHost;
        const v = h && h.voertuigen.find((q) => q.id === 100), p = h && h.voetgangers[0], c = w.companion;
        if (dt > 0.001) { if (v) reeks.auto.push([v.x, v.y, dt]); if (p) reeks.ped.push([p.x, p.y, dt, p.id]); if (c) reeks.host.push([c.x, c.y, dt]); }
        if (nu < eind) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    const stat = (r) => {
      const v = []; for (let i = 1; i < r.length; i++) { if (r[i][3] !== undefined && r[i][3] !== r[i - 1][3]) continue; v.push(Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]) / r[i][2]); }
      const gesorteerd = [...v].sort((a, b) => a - b), med = gesorteerd[Math.floor(v.length / 2)] || 0;
      const dts = r.map((x) => x[2]).sort((a, b) => a - b);
      return { n: v.length, med: +med.toFixed(2), stil: v.filter((x) => x < 0.25 * med).length, sprong: v.filter((x) => x > 2.5 * med).length, p5: +(gesorteerd[Math.floor(v.length * 0.05)] / (med || 1)).toFixed(2), p95: +(gesorteerd[Math.floor(v.length * 0.95)] / (med || 1)).toFixed(2), maxDt: +(dts[dts.length - 1] * 1000).toFixed(0) };
    };
    log(naam, { auto: stat(reeks.auto), ped: stat(reeks.ped), host: stat(reeks.host) });
  },
  // #434: de camera van de gast kijkt omhoog en omlaag met de muis (hoogte van de camera ten opzichte van het hoofd van de figuur, in graden)
  async gastpitch() {
    const w = W();
    if (CFG.role === 'host') { await sleep(6000); return; }
    const S = await import('./js/scene3d.js'), cam = S.getCamera();
    const m = w.input.mouse, was = m.locked; m.locked = true; // een echte vergrendelde muis kan een test niet krijgen: de pagina meldt hem als vergrendeld
    const hoek = () => { const p = w.player, dx = cam.position.x - p.x, dz = cam.position.z - p.y, dy = cam.position.y - ((p.gz || 0) + 1.3); return Math.round(Math.atan2(dy, Math.hypot(dx, dz)) * 1800 / Math.PI) / 10; };
    await sleep(500); const a0 = hoek();
    for (let i = 0; i < 24; i++) { window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 30, clientX: 400, clientY: 300 })); await sleep(40); }
    await sleep(500); const a1 = hoek();
    for (let i = 0; i < 48; i++) { window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: -30, clientX: 400, clientY: 300 })); await sleep(40); }
    await sleep(500); const a2 = hoek();
    for (let i = 0; i < 60 && Math.abs(hoek() - a0) > 2; i++) { window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: hoek() < a0 ? 12 : -12, clientX: 400, clientY: 300 })); await sleep(60); } // terug naar de gewone stand voor de beelden erna
    m.locked = was;
    log('gastpitch', { a0, a1, a2, lookActief: !!w.input.lookActive() });
  },
  // #434: springen en bukken van de gast: de hoogte en de bukvlag van zijn eigen lichaam (komt van de gastheer terug), en wat de gastheer ervan ziet
  async gastspring() {
    const w = W(), B = window.__bot;
    if (CFG.role === 'host' || !B) { await sleep(5000); return; }
    let zmax = 0, hoog = 0; const t1 = performance.now() + 1400;
    B.down(' '); await sleep(120); B.up(' ');
    while (performance.now() < t1) { const z = w.player.z || 0; zmax = Math.max(zmax, z); if (z > 0.05) hoog++; await sleep(16); }
    B.down('control'); await sleep(900); const buk = !!w.player.crouching; const bukCompanion = !!(w.companion && w.companion.crouching); B.up('control'); await sleep(600);
    for (let i = 0; i < 30 && w.player.crouching; i++) await sleep(100); // de bukvlag komt via de gastheer terug: onder belasting (veel headless spelers) duurt dat langer dan 600 ms
    log('gastspring', { zmax: Math.round(zmax * 100) / 100, hoog, buk, na: !!w.player.crouching, zNa: w.player.z || 0, bukCompanion });
  },
  // #434: de gast stapt zelf in een vrij voertuig van de gastheer (E), rijdt (stick), remt (Spatie) en stapt uit (E); wat hij en de host ervan zien
  async gastbestuur({ s = 16 }) {
    const w = W(), B = window.__bot;
    if (CFG.role === 'host' || !B) { await sleep(s * 1000); return; }
    const msgs = []; const am = w.addMessage; w.addMessage = function (t, ...r) { msgs.push(String(t).slice(0, 70)); return am.call(this, t, ...r); };
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    for (let i = 0; i < 60 && !(w.coopHost && w.coopHost.voertuigen.some((v) => v.id === 198)); i++) await sleep(250); // de auto van de gastheer staat naast je
    log('gastbestuur-auto', { gezien: !!(w.coopHost && w.coopHost.voertuigen.some((v) => v.id === 198)), t: sec() });
    for (let i = 0; i < 20 && !w.coopBestuurder; i++) { await B.press('e', 150); await sleep(900); }
    await sleep(600);
    log('gastbestuur-in', { bestuurder: !!w.coopBestuurder, inVoertuig: !!w.coopInVoertuig, zitters: (w.coopZitters || []).map((z) => [z.slot, z.stoel, z.bestuurder]), meldingen: msgs.slice(-3), t: sec() });
    shot('gastbestuur-in'); await sleep(500);
    const p0 = [w.player.x, w.player.y]; let vmax = 0, last = [w.player.x, w.player.y], lt = performance.now();
    B.stick(0, -1); const t1 = performance.now() + 3200;
    while (performance.now() < t1) { await sleep(100); const nu = performance.now(), d = Math.hypot(w.player.x - last[0], w.player.y - last[1]) / ((nu - lt) / 1000); vmax = Math.max(vmax, d); last = [w.player.x, w.player.y]; lt = nu; }
    const afstand = Math.hypot(w.player.x - p0[0], w.player.y - p0[1]);
    log('gastbestuur-rijdt', { m: Math.round(afstand * 10) / 10, vmax: Math.round(vmax * 10) / 10, bestuurder: !!w.coopBestuurder, t: sec() });
    shot('gastbestuur-rijdt');
    B.stick(0, 0); B.down(' '); await sleep(2600);
    const q0 = [w.player.x, w.player.y]; await sleep(800); const na = Math.hypot(w.player.x - q0[0], w.player.y - q0[1]) / 0.8;
    B.up(' ');
    log('gastbestuur-remt', { snelheid: Math.round(na * 10) / 10, t: sec() });
    for (let i = 0; i < 8 && w.coopBestuurder; i++) { await B.press('e', 150); await sleep(900); }
    await sleep(500);
    log('gastbestuur-uit', { bestuurder: !!w.coopBestuurder, inVoertuig: !!w.coopInVoertuig, meldingen: msgs.slice(-3), t: sec() });
    w.addMessage = am;
  },
  // #443: een race tegen elkaar (kartbaan, Karten in Ulrum): de gast krijgt Meedoen?, zegt ja (J), rijdt mee met de stick (een eenvoudige bot met de
  // vertraagde positie van zijn eigen kart), kijkt naar de uitslag en vraagt een rematch; in die tweede race stopt hij na `stop` seconden (Backspace)
  async wedstrijd({ s = 300, stop = 20 }) {
    const w = W(), B = window.__bot;
    if (CFG.role === 'host' || !B) { await sleep(s * 1000); return; }
    const K = await import('./js/kartrace.js'), T = (await import('./js/kartbaanspoor.js')).KARTBAAN_TRACK;
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    const kaart = () => { const e = document.querySelector('.wed-kaart'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; };
    const bord = () => { const e = document.querySelector('.mg-board'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 420) : ''; };
    const msgs = []; const am = w.addMessage; w.addMessage = function (t, ...r) { msgs.push(String(t).slice(0, 90)); return am.call(this, t, ...r); };
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const geld0 = w.money || 0;
    const race = async (nr, stopNa) => {
      await until(() => w.coopWedGast && w.coopWedGast.uitn, 90000, 'uitnodiging');
      log('wed-uitnodiging', { nr, tekst: kaart(), msgs: msgs.slice(-2), t: sec() }); shot(`wed${nr}-uitnodiging`); await sleep(700);
      await B.press('j', 150);
      await until(() => w.coopWedGast.spiegel, 25000, 'start');
      const sp = w.coopWedGast.spiegel, n0 = sp.laatste, tStart = performance.now();
      log('wed-start', { nr, karts: sp.karts.map((k) => k.name), eigen: sp.karts[0].name, t: sec(), wedstrijdVlag: !!w.coopWedstrijd });
      const m = { frames: 0, gemeten: 0, sprong: 0, stil: 0, vmax: 0, bord: [], fasen: [], plaats: [], stap: [] }; const gedaan = {};
      let last = [sp.karts[0].u, sp.karts[0].v, sp.karts[1].u, sp.karts[1].v], lt = sp.klok, fase = '', k = 0;
      while (w.coopWedGast.spiegel === sp) {
        await raf(); k++;
        const me = sp.karts[0], nu = sp.klok, dt = nu - lt; lt = nu; // de speltijd van het scherm, niet die van de browser: alleen beelden waarin het spel liep
        if (sp.phase !== fase) { fase = sp.phase; m.fasen.push([fase, Math.round(sp.raceT * 10) / 10, sec()]); }
        if (sp.phase === 'grid') B.stick(0, 0);
        else if (k % 3 === 0) {
          if (me.finished) B.stick(0, 0);
          else { const inp = K.bestInput(me, T); B.stick(inp.steer, -inp.throttle); if (inp.drift) B.down(' '); else B.up(' '); } // de goede bot: de lijn en een drift in lange bochten (Spatie)
        }
        if (sp.phase === 'race' || sp.phase === 'finish') {
          m.frames++;
          const step = Math.hypot(me.u - last[0], me.v - last[1]) + 0, v = Math.abs(me.f);
          if (dt > 0 && dt < 0.2 && sp.raceT > 8) { m.gemeten++; if (step / dt > 1.6 * (v + 3)) m.sprong++; if (v > 6 && step < 0.002) m.stil++; }
          m.vmax = Math.max(m.vmax, v);
          const o = sp.karts[1]; const s2 = Math.hypot(o.u - last[2], o.v - last[3]); if (dt > 0 && dt < 0.2 && s2 / dt > 1.6 * (Math.abs(o.f) + 3)) m.sprong++;
        }
        last = [me.u, me.v, sp.karts[1].u, sp.karts[1].v];
        if (sp.phase === 'grid' && sp.lights >= 2 && !gedaan.grid) { gedaan.grid = 1; log('wed-grid', { nr, lights: sp.lights, bord: bord() }); shot(`wed${nr}-grid`); }
        if (sp.phase === 'race' && sp.raceT > 14 && !gedaan.a) { gedaan.a = 1; m.bord.push(bord()); shot(`wed${nr}-race-a`); }
        if (sp.phase === 'race' && sp.raceT > 40 && !gedaan.b && nr === 1) { gedaan.b = 1; m.bord.push(bord()); shot(`wed${nr}-race-b`); }
        if (me.finished && !gedaan.fin) { gedaan.fin = 1; m.bord.push(bord()); shot(`wed${nr}-finish`); }
        if (stopNa != null && sp.phase === 'race' && sp.raceT > stopNa) { log('wed-stop', { nr, raceT: Math.round(sp.raceT * 10) / 10, bord: bord() }); B.stick(0, 0); await B.press('backspace', 150); await sleep(800); break; }
        if ((performance.now() - tStart) / 1000 > 200) throw new Error('de race duurt te lang');
      }
      B.stick(0, 0); B.up(' ');
      const ontvangen = sp.laatste - n0, duur = (performance.now() - tStart) / 1000;
      log('wed-einde', { nr, duur: Math.round(duur), momentopnamenPerS: Math.round(ontvangen / duur * 10) / 10, frames: m.frames, gemeten: m.gemeten, sprong: m.sprong, stil: m.stil, vmax: Math.round(m.vmax * 10) / 10, fasen: m.fasen, bord: m.bord, eigenAf: !!sp.karts[0].finished, ronden: sp.karts[0].lapTimes.length, lap: sp.karts[0].lap, vlag: !!w.coopWedstrijd, kaartNaStop: kaart() });
      return sp;
    };
    const sp1 = await race(1, null);
    await until(() => w.coopWedGast.uitslag, 15000, 'uitslag');
    await sleep(1800);
    log('wed-uitslag', { kaart: kaart(), geldErbij: (w.money || 0) - geld0, msgs: msgs.slice(-4), t: sec() }); shot('wed1-uitslag'); await sleep(500);
    await B.press('j', 150); await sleep(700);
    log('wed-rematch-gevraagd', { nogmaals: !!w.coopWedGast.nogmaals, kaart: kaart() });
    const sp2 = await race(2, stop);
    await sleep(2500);
    log('wed-gestopt', { vrij: !w.coopWedGast.spiegel, vlag: !!w.coopWedstrijd, camera: !!w.cameraOverride, msgs: msgs.slice(-3), t: sec() }); shot('wed2-gestopt');
    w.addMessage = am;
    if (sp2) await sleep(10000);
  },
  // #443: golf tegen elkaar: de gast krijgt Meedoen?, zegt ja (J), speelt zijn zes banen op zijn eigen scherm (de slagen via het debug-handvat van pitchputt.js, op
  // de kracht die de baan vraagt), kijkt naar de stand en de uitslag; in de tweede ronde stopt hij na `stopBaan` banen (Backspace)
  async golfgast({ s = 420, stopBaan = 2 }) {
    const w = W(), B = window.__bot, pp = window.__pitchputt;
    if (CFG.role === 'host' || !B || !pp) { await sleep(s * 1000); return; }
    const P = await import('./js/puttinglogic.js');
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    const kaart = () => { const e = document.querySelector('.wed-kaart'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; };
    const bord = () => { const e = document.querySelector('.mg-board'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : ''; };
    const msgs = []; const am = w.addMessage; w.addMessage = function (t, ...r) { msgs.push(String(t).slice(0, 90)); return am.call(this, t, ...r); };
    const geld0 = w.money || 0;
    const ronde = async (nr, stopNaBaan) => {
      await until(() => w.coopWedGast && w.coopWedGast.uitn, 150000, 'uitnodiging');
      log('golf-uitnodiging', { nr, tekst: kaart(), t: sec() }); shot(`golf${nr}-uitnodiging`); await sleep(700);
      await B.press('j', 150);
      await until(() => w.coopWedGast.score && pp.state(), 30000, 'start');
      await sleep(1500);
      const G = w.coopWedGast;
      log('golf-start', { nr, holes: pp.holes().length, banen: G.score.banen, venueGast: G.score.v, vlag: !!w.coopWedstrijd, speler: [Math.round(w.player.x), Math.round(w.player.y)], baan1: pp.holes()[0].tee, t: sec() });
      const m = { slagen: 0, bord: [], kaarten: [], wacht: false }; const gedaan = {}; let hole = 0, stopt = false;
      const tStart = performance.now();
      while (G.score && !stopt) {
        const st = pp.state(); if (!st) break;
        if (st.hole !== hole) { m.kaarten.push([hole, st.card.strokes]); hole = st.hole; }
        if (st.phase === 'wacht') { if (!gedaan.w) { gedaan.w = 1; m.wacht = true; m.bord.push(bord()); shot(`golf${nr}-wacht`); } }
        else if (st.phase === 'aim') {
          if (!gedaan.a) { gedaan.a = 1; m.bord.push(bord()); shot(`golf${nr}-baan1`); }
          if (stopNaBaan != null && st.hole >= stopNaBaan) { log('golf-stop', { nr, hole: st.hole, bord: bord() }); await B.press('backspace', 150); await sleep(1500); stopt = true; break; }
          const h = pp.holes()[st.hole], dist = Math.hypot(h.cup.x - st.lie.x, h.cup.y - st.lie.y);
          if (pp.shoot(st.mode === 'putt' ? P.straightPower(dist) : P.powerForCarry(dist))) m.slagen++;
          if (st.hole === 2 && !gedaan.b) { gedaan.b = 1; await sleep(1800); m.bord.push(bord()); shot(`golf${nr}-baan3`); }
        } else if (st.phase === 'holeDone') pp.skip();
        await sleep(250);
        if ((performance.now() - tStart) / 1000 > 300) throw new Error('de ronde duurt te lang');
      }
      log('golf-einde', { nr, slagen: m.slagen, banen: m.kaarten.length + (m.wacht ? 1 : 0), wacht: m.wacht, bord: m.bord, kaarten: m.kaarten, stopt, duur: Math.round((performance.now() - tStart) / 1000), t: sec() });
      return stopt;
    };
    const stopte1 = await ronde(1, null);
    await until(() => w.coopWedGast.uitslag, 400000, 'uitslag');
    await sleep(1800);
    log('golf-uitslag', { kaart: kaart(), geldErbij: (w.money || 0) - geld0, msgs: msgs.slice(-4), t: sec() }); shot('golf1-uitslag'); await sleep(500);
    await B.press('j', 150); await sleep(700);
    log('golf-rematch-gevraagd', { nogmaals: !!w.coopWedGast.nogmaals });
    await ronde(2, stopBaan);
    await sleep(3000);
    log('golf-gestopt', { vrij: !w.coopWedGast.score, vlag: !!w.coopWedstrijd, camera: !!w.cameraOverride, spel: pp.state(), msgs: msgs.slice(-3), t: sec() }); shot('golf2-gestopt');
    w.addMessage = am;
    await sleep(8000);
  },
  // #443 (suite 'wedstrijd'): de host in Electron rijdt een race tegen twee headless gasten (testbank.mjs wedBot): E bij de kassa, de uitnodiging, de race
  // met een bot op de toetsen, de uitslag en de beloning, een rematch (J) die de host na 18 s stopt (Backspace)
  async wedhost({ s = 230 }) {
    if (CFG.role !== 'host') { await sleep(s * 1000); return; }
    const w = W(), B = window.__bot, kb = window.__kartbaan, p = w.player;
    const K = await import('./js/kartrace.js'), T = (await import('./js/kartbaanspoor.js')).KARTBAAN_TRACK;
    if (!kb) { log('wedhost-geen-kartbaan'); await sleep(s * 1000); return; }
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const kaart = () => { const e = document.querySelector('.wed-kaart'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; };
    const bord = () => { const e = document.querySelector('.mg-board'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 420) : ''; };
    const keys = {}; const orig = w.input.isDown.bind(w.input); w.input.isDown = (k) => (k in keys ? keys[k] : orig(k));
    const msgs = []; const am = w.addMessage; w.addMessage = function (t, ...r) { msgs.push(String(t).slice(0, 90)); return am.call(this, t, ...r); };
    const spot = kb.spot();
    p.x = spot.x; p.y = spot.y; p.vx = 0; p.vy = 0;
    await sleep(9000); // de gasten komen mee (de band), de tegels laden
    log('wedhost-kassa', { gasten: (w.coopRoster || []).filter((x) => x.slot > 0).length, afstand: Math.round(Math.hypot(w.companion.x - p.x, w.companion.y - p.y)), t: sec() }); shot('wedhost-kassa');
    const geld0 = w.money || 0;
    const race = async (nr, stopNa) => {
      for (let i = 0; i < 4 && !(w.coopNet.wed && w.coopNet.wed.u); i++) { await B.press('e', 150); await sleep(900); }
      await sleep(1200); log('wedhost-uitnodiging', { nr, kaart: kaart(), wed: !!(w.coopNet.wed && w.coopNet.wed.u), t: sec() }); await sleep(800); shot(`wedhost${nr}-uitnodiging`);
      for (let i = 0; i < 160 && !kb.online(); i++) await sleep(150);
      if (!kb.online()) { log('wedhost-geen-start', { nr, msgs: msgs.slice(-3) }); return null; }
      const tStart = performance.now(), m = { frames: 0, fasen: [], bord: [], gast: [], tot: 0 }; const gedaan = {}; let acc = 0, fase = '';
      log('wedhost-start', { nr, online: kb.online(), karts: [0, 1, 2, 3].map((i) => kb.kart(i).name), companionVast: !!w.companion.coopWedstrijd, t: sec() });
      while (kb.online()) {
        await raf(); m.frames++;
        const me = kb.kart(0), st = kb.state(); if (!st) break;
        if (st.phase !== fase) { fase = st.phase; m.fasen.push([fase, Math.round(st.raceT * 10) / 10, sec()]); }
        const inp = st.phase === 'race' && !me.finished ? K.aiInput(me, T, { skill: 0.9, others: [0, 1, 2, 3].map((i) => kb.kart(i)), dt: 0.05 }) : { throttle: 0, steer: 0, drift: false };
        acc += Math.abs(inp.steer); const druk = acc >= 1; if (druk) acc -= 1; // stuurt met de toetsen: A of D in een deel van de beelden
        keys.w = inp.throttle > 0.15; keys.s = inp.throttle < -0.15; keys.d = druk && inp.steer > 0; keys.a = druk && inp.steer < 0; keys.arrowup = false; keys.arrowdown = false; keys.arrowleft = false; keys.arrowright = false; keys[' '] = false;
        if (st.phase === 'grid' && st.lights >= 2 && !gedaan.g) { gedaan.g = 1; m.bord.push(bord()); shot(`wedhost${nr}-grid`); }
        if (st.phase === 'race' && st.raceT > 14 && !gedaan.a) { gedaan.a = 1; m.bord.push(bord()); shot(`wedhost${nr}-race-a`); }
        if (st.phase === 'race' && st.raceT > 45 && !gedaan.b && nr === 1) { gedaan.b = 1; m.bord.push(bord()); m.gast = st.karts.map((k) => [k.name, Math.round(k.prog), !!k.finished, Math.round(k.f)]); shot(`wedhost${nr}-race-b`); }
        if (me.finished && !gedaan.f) { gedaan.f = 1; m.bord.push(bord()); shot(`wedhost${nr}-finish`); }
        if (stopNa != null && st.phase === 'race' && st.raceT > stopNa) { for (const k of Object.keys(keys)) keys[k] = false; log('wedhost-stop', { nr, raceT: Math.round(st.raceT * 10) / 10, bord: bord() }); await B.press('backspace', 150); await sleep(1500); break; }
        if ((performance.now() - tStart) / 1000 > 230) throw new Error('de race duurt te lang');
      }
      for (const k of Object.keys(keys)) delete keys[k];
      log('wedhost-einde', { nr, duur: Math.round((performance.now() - tStart) / 1000), frames: m.frames, fasen: m.fasen, bord: m.bord, gast: m.gast, online: kb.online(), camera: !!w.cameraOverride, t: sec() });
    };
    await race(1, null);
    await sleep(2500);
    const wed = w.coopNet.wed; log('wedhost-uitslag', { kaart: kaart(), geldErbij: (w.money || 0) - geld0, msgs: msgs.slice(-4), rijen: wed && wed.uitslag ? wed.uitslag.rijen : null, jij: wed && wed.uitslag ? wed.uitslag.jij : null, lichamenVrij: !w.companion.coopWedstrijd && !Object.values(w.coopFigures || {}).some((f) => f.coopWedstrijd), t: sec() }); shot('wedhost1-uitslag');
    for (let i = 0; i < 40 && !Object.keys(wed.opnieuw || {}).length; i++) await sleep(250);
    log('wedhost-rematch-verzoek', { willen: Object.keys(wed.opnieuw || {}), kaart: kaart(), msgs: msgs.slice(-3) });
    await B.press('j', 150); await sleep(600);
    await race(2, 18);
    await sleep(3000);
    log('wedhost-gestopt', { online: kb.online(), vrij: !w.companion.coopWedstrijd, camera: !!w.cameraOverride, msgs: msgs.slice(-3), geldTotaal: (w.money || 0) - geld0, t: sec() }); shot('wedhost2-gestopt');
    w.addMessage = am; w.input.isDown = orig;
  },
  // #434: wat de gast ziet van wie er meerijdt, en het wapen en de aanval van de gastheer; camera naar het voertuig of de gastheer
  async zit({ s = 8, naam = 'zit', kijk = 'zelf', pitch = null }) {
    const w = W();
    if (CFG.role === 'host') { await sleep(s * 1000); return; }
    await sleep(s * 1000 / 2);
    if (pitch != null) { // de camera kijkt schuin omlaag, zodat de zitters in beeld komen
      const S = await import('./js/scene3d.js'), cam = S.getCamera(), m = w.input.mouse, was = m.locked; m.locked = true;
      const hoek = () => { const p = w.player, dx = cam.position.x - p.x, dz = cam.position.z - p.y, dy = cam.position.y - ((p.gz || 0) + 1.3); return Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI; };
      for (let i = 0; i < 80 && Math.abs(hoek() - pitch) > 3; i++) { window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: hoek() < pitch ? 12 : -12, clientX: 400, clientY: 300 })); await sleep(50); }
      m.locked = was; await sleep(400);
    }
    const c = w.companion; if (c && kijk === 'host') w.camYaw = Math.atan2(c.y - w.player.y, c.x - w.player.x);
    await sleep(s * 1000 / 2);
    // de tijdlijn schuift onder belasting op: wacht op de staat die dit beeld moet laten zien in plaats van op de klok
    if (naam === 'auto') for (let i = 0; i < 80 && !(w.coopZitters || []).some((z) => z.stoel >= 1); i++) await sleep(250);
    if (naam === 'fiets') for (let i = 0; i < 120 && !(w.coopZitters || []).some((z) => z.stoel === 0); i++) await sleep(250);
    const guns = []; { const SC = (await import('./js/scene3d.js')).getScene(); if (SC) SC.traverse((o) => { if (o.userData && o.userData.gunKey) guns.push(o.userData.gunKey); }); } // modellen met een wapen in de hand
    const fietsen = []; { const SC = (await import('./js/scene3d.js')).getScene(); if (SC) SC.traverse((o) => { if (o.userData && o.userData.riderLegs && o.userData.wheels) fietsen.push([o, o.userData.pedalPhase || 0]); }); await sleep(350); } // de trappers van de fietsen in beeld
    const pedaal = fietsen.map(([o, p0]) => Math.abs((o.userData.pedalPhase || 0) - p0) > 0.05);
    log(naam, { guns, pedaal, zitters: (w.coopZitters || []).map((z) => [z.slot, z.voertuig, z.stoel, z.bestuurder]), dbg: w.coopZittersDbg ?? null, inVoertuig: !!w.coopInVoertuig, wapen: c ? c.coopWapen || '' : null, fx: c && c.coopFx ? c.coopFx.type : null, hostZichtbaar: c ? c.coopVoertuig : null });
    for (let i = 0; i < (kijk === 'host' ? 4 : 1); i++) { shot(kijk === 'host' ? naam + '-' + i : naam); await sleep(350); } // bij een aanval meer beelden vlak na elkaar
    await sleep(600);
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
  // samen spelen, spelers uit elkaar (#429): twee figuren lopen 500 m en ver weg (Delfzijl) los van de gastheer; de gastheer laadt en bevolkt de wereld
  // rond hen (coopfoci.js), zet ze niet terug, en meet beeldsnelheid, tegels en geheugen met en zonder die extra foci
  async uitelkaar({ s = 20 }) {
    if (CFG.role !== 'host') { await sleep((s * 2 + 70) * 1000); return; }
    const Co = await imp('companion'), Net = await imp('coopnet'), Wd = await imp('coopworld'), w = W(), map = w.map, p = w.player;
    const figs = Object.values(w.coopFigures || {}).filter((f) => f.slot >= 2);
    log('uitelkaar-start', { slots: figs.map((f) => f.slot), host: [Math.round(p.x), Math.round(p.y)] });
    if (figs.length < 2) return;
    const fps = (ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; const d = performance.now() - t0; if (d >= ms) res(Math.round(n / (d / 1000) * 10) / 10); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const heap = () => Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / 1e6);
    const stand = () => ({ tegels: map.resident ? map.resident.size : null, tegelMB: map.store ? Math.round(map.store.residentBytes / 1e5) / 10 : null, heapMB: heap(), voertuigen: w.vehicles.length, voetgangers: w.pedestrians.length, dieren: (w.wildlife || []).length, foci: w.coopFoci ? w.coopFoci.length : 1 });
    await sleep(2000);
    const basis = { fps: await fps(5000), ...stand() }; log('uitelkaar-basis', basis);
    // een droge plek bij een weg in de buurt van het doel; wacht tot de wereld daar geladen is
    const plaats = async (f, doel) => {
      f.x = doel[0]; f.y = doel[1]; f.vx = 0; f.vy = 0; f.verTijd = 0; f.vastTijd = 0; f.gz = 0; f.input = null;
      const t0 = performance.now(); let geladenNa = null;
      while (performance.now() - t0 < 40000) { if (Net.tegelGeladen(w, f.x, f.y) && w.coopFoci) { geladenNa = Math.round((performance.now() - t0) / 100) / 10; break; } await sleep(200); }
      for (let k = 0; k < 8; k++) { await sleep(250); const info = w.coopFociInfo; log('uitelkaar-dbg', { slot: f.slot, x: Math.round(f.x), y: Math.round(f.y), wacht: !!f.wacht, verTijd: f.verTijd, los: Net.losVoor(w, f.slot, f.x, f.y), geladen: Net.tegelGeladen(w, f.x, f.y), bediend: info ? [...info.bediend] : null, buiten: info ? [...info.buiten] : null, foci: info ? info.foci.map((q) => [Math.round(q.x), Math.round(q.y), q.slots.join('+')]) : null }); }
      let m = [f.x, f.y];
      try { const rd = map.roadsNear(f.x, f.y, 600).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.width >= 3); if (rd.length) m = rd[0].pts[Math.floor(rd[0].pts.length / 2)]; } catch (e) { /* geen wegen */ }
      let gezet = false;
      for (let r = 0; r < 120 && !gezet; r += 6) for (let k = 0; k < 8 && !gezet; k++) { const x = m[0] + Math.cos(k * Math.PI / 4) * r, y = m[1] + Math.sin(k * Math.PI / 4) * r; if (Co.figuurVrij(x, y, w)) { f.x = x; f.y = y; gezet = true; } }
      f.vastTijd = 0; f.verTijd = 0;
      return { geladenNa, gezet, op: [Math.round(f.x), Math.round(f.y)], afstandHost: Math.round(Math.hypot(f.x - p.x, f.y - p.y)) };
    };
    const [a, b] = figs;
    log('uitelkaar-a', { slot: a.slot, ...await plaats(a, [p.x + 500, p.y]) });
    log('uitelkaar-b', { slot: b.slot, ...await plaats(b, [23100, -12200]) }); // Delfzijl: de brug Midscheeps
    const rondom = (f) => ({ voertuigen: w.vehicles.filter((v) => Math.hypot(v.x - f.x, v.y - f.y) <= 150 && !v.wrecked).length, voetgangers: w.pedestrians.filter((q) => Math.hypot(q.x - f.x, q.y - f.y) <= 70).length, dieren: (w.wildlife || []).filter((q) => Math.hypot(q.x - f.x, q.y - f.y) <= 150).length });
    try { // de bevolkingsroutines los aanroepen: ze horen verkeer rond de groep te zetten
      const V = await imp('vehicle'), fa = { x: a.x, y: a.y }, nabij = () => w.vehicles.filter((v) => Math.hypot(v.x - fa.x, v.y - fa.y) <= 170).length;
      const v0 = nabij(); V.manageTrafficPopulation(w, { target: 12, spawnMin: 12, focus: fa });
      const kand = map.roadsNear(fa.x, fa.y, 170).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.width >= 3 && !r.busOnly); const cats = {}; for (const r of map.roadsNear(fa.x, fa.y, 170)) cats[r.cat + ':' + (r.width >= 3 ? 'w' : 'n')] = (cats[r.cat + ':' + (r.width >= 3 ? 'w' : 'n')] || 0) + 1;
      try { // waarom spawnt er niets? dezelfde stappen als manageTrafficPopulation, met een teller per afwijzing
        const TF = await imp('trafficfleet'), TR = await imp('vehicle/traffic'); const t = { poging: 0, geenModel: 0, nietBruikbaar: 0, teDichtbij: 0, teVer: 0, bezet: 0, ok: 0, nan: 0 }; const ds = [];
        for (let q = 0; q < 48 && kand.length; q++) {
          t.poging++; const road = kand[Math.floor(Math.random() * kand.length)]; const mid = road.pts[Math.floor(road.pts.length / 2)];
          const pick = TF.pickTrafficCar(map, mid[0], mid[1], Math.random, { hour: 8 }); if (!pick || !pick.model) { t.geenModel++; continue; }
          if (!TR.canUseRoad({ model: pick.model }, road)) { t.nietBruikbaar++; continue; }
          const v = V.spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, false, pick.model); const d = Math.hypot(v.x - fa.x, v.y - fa.y);
          if (!Number.isFinite(d)) { t.nan++; continue; } if (ds.length < 8) ds.push(Math.round(d));
          if (d < 12) t.teDichtbij++; else if (d > 170) t.teVer++; else t.ok++;
        }
        log('uitelkaar-dbg-spawn', { ...t, ds });
      } catch (e) { log('uitelkaar-dbg-spawn', { fout: String(e && e.stack || e).slice(0, 300) }); }
      log('uitelkaar-dbg-kand', { kand: kand.length, cats, tijd: w.time, hoofd: [Math.round(p.x), Math.round(p.y)], fa: [Math.round(fa.x), Math.round(fa.y)], pedView: !!w.pedView });
      log('uitelkaar-dbg-verkeer', { voor: v0, na: nabij(), wegen: map.roadsNear(fa.x, fa.y, 170).length, foci: w.coopFoci ? w.coopFoci.length : 1 });
    } catch (e) { log('uitelkaar-dbg-verkeer', { fout: String(e && e.stack || e) }); }
    const t0 = performance.now(); let minA = 0, minB = 0, teruggezet = false;
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    for (let i = 0; i < s; i++) {
      await sleep(1000);
      if (Math.hypot(a.x - p.x, a.y - p.y) < 60 || Math.hypot(b.x - p.x, b.y - p.y) < 60) teruggezet = true;
      const ra = rondom(a), rb = rondom(b);
      minA = Math.max(minA, ra.voertuigen + ra.voetgangers); minB = Math.max(minB, rb.voertuigen + rb.voetgangers); // het meeste dat rond de speler werd gezien (de naam minA bleef): verkeer rond een losse speler is dun en schommelt
      if (i % 5 === 4) log('uitelkaar-sample', { t: Math.round((performance.now() - t0) / 1000), a: ra, b: rb, ...stand(), wachtA: !!a.wacht, wachtB: !!b.wacht });
    }
    const ents = Wd.verzamelEntiteiten(w, [p, a, b]);
    const dichtbij = (f) => ents.filter((e) => Math.hypot(e.x - f.x, e.z - f.y) <= 150).length;
    log('uitelkaar-meet', { s, teruggezet, afA: Math.round(Math.hypot(a.x - ax, a.y - ay)), afB: Math.round(Math.hypot(b.x - bx, b.y - by)), minA, minB, snapshot: ents.length, snapshotRondA: dichtbij(a), snapshotRondB: dichtbij(b), snapshotRondHost: ents.filter((e) => Math.hypot(e.x - p.x, e.z - p.y) <= 150).length, fociN: w.coopFoci ? w.coopFoci.length : 1, rondA: rondom(a), rondB: rondom(b) });
    const meet = { fps: await fps(5000), ...stand() }; log('uitelkaar-last', meet);
    // B: bij de groep komen
    log('uitelkaar-bijgroep', { gelukt: Net.bijGroepHost(w, a.slot), afstand: Math.round(Math.hypot(a.x - p.x, a.y - p.y)) });
    // beide spelers lopen terug naar de gastheer: de extra foci verdwijnen
    b.x = p.x + 3; b.y = p.y; a.x = p.x - 3; a.y = p.y;
    await sleep(2500);
    log('uitelkaar-uit', { bTerugNa: 0, fociN: w.coopFoci ? w.coopFoci.length : 1 });
    await sleep(2000);
    log('uitelkaar-na', { fps: await fps(5000), ...stand() });
  },
  // samen spelen (#434): twee gasten (headless, plek 1 en 2) stappen als bestuurder in een geparkeerde auto naast hen en rijden; de host ziet ze zitten,
  // een voetganger en een getuige voor de auto geven de gast een gezocht-niveau (niet de host), de politie jaagt op hem en pakt hem (boete bij de gast)
  async bestuur({ s = 60 }) {
    if (CFG.role !== 'host') { await sleep((s + 10) * 1000); return; }
    const V = await imp('vehicle'), Pd = await imp('pedestrians'), Zt = await imp('coopzitten3d'), w = W(), p = w.player;
    const hostWanted0 = w.wanted | 0;
    const gasten = [{ naam: 'tessa', slot: 1, l: w.companion }, ...Object.values(w.coopFigures || {}).filter((f) => f.slot >= 2).map((f) => ({ naam: 'fig' + f.slot, slot: f.slot, l: f }))];
    log('bestuur-start', { gasten: gasten.map((g) => [g.naam, g.slot, !!g.l]), remote: !!(w.coop && w.coop.remote), host: [Math.round(p.x), Math.round(p.y)] });
    // een geparkeerde auto naast elke gast; een derde auto en een helikopter bij de eerste, voor de weigeringen
    const maak = (x, y, extra = {}) => { const v = new V.Vehicle(x, y, 0, V.MODELS[0]); v.parked = true; Object.assign(v, extra); w.vehicles.push(v); return v; };
    const auto = {};
    for (const g of gasten) { g.l.x = g.slot === 1 ? p.x + 14 : p.x - 30; g.l.y = p.y - 6; /* twee groepjes ver uit elkaar, zodat hun auto's de politie niet in de weg staan */ g.l.vx = 0; g.l.vy = 0; auto[g.slot] = maak(g.l.x + 2.4, g.l.y); }
    const heli = maak(p.x + 6, p.y + 14, { isHeli: true, onGround: true });
    await sleep(1500);
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    let gevolgd = null, politie0 = 0, maxPolitie = 0, peds = 0, gepakt = 0; const berichten = [];
    const am = w.addMessage; w.addMessage = function (t, ...r) { try { if (r[1] && r[1].kind === 'politie') berichten.push([sec(), String(t).slice(0, 60), w.wanted | 0]); } catch (e) { /* alleen meten */ } return am.call(this, t, ...r); };
    const orig = w.coopGepakt; if (orig) w.coopGepakt = (slot, lvl) => { gepakt++; log('bestuur-gepakt', { t: sec(), slot, lvl }); return orig(slot, lvl); };
    const meet = (extra = {}) => {
      const rij = {}; for (const g of gasten) { const v = auto[g.slot]; rij[g.slot] = { x: Math.round(v.x), y: Math.round(v.y), sp: Math.round((v.speed || 0) * 10) / 10, drv: v.driver, b: v.coopBestuurder ?? null, hp: Math.round(v.health), hb: !!v.handbrake, inV: !!(g.l.inVehicle || g.l.inVeh), bt: !!g.l.coopBestuurt }; }
      const dg = gasten.find((g) => g.slot === w.coopDoelwit), a = dg ? (dg.l.inVehicle || dg.l.inVeh || dg.l) : auto[1], cops = w.vehicles.filter((v) => v.isPolice && !v.wrecked && !v.hijacked), dmin = cops.length ? Math.min(...cops.map((v) => Math.hypot(v.x - a.x, v.y - a.y))) : null;
      return { t: sec(), rij, wanted: w.wanted | 0, coopWanted: { ...(w.coopWanted || {}) }, doel: w.coopDoelwit, cops: cops.length, copMin: dmin == null ? null : Math.round(dmin), zitters: Zt.aantalZitters(), hostIn: !!p.inVehicle, ...extra };
    };
    // de host kijkt mee: 9 m achter de auto van Tessa, zodat de schermafbeeldingen de bestuurder in de auto laten zien
    const volg = setInterval(() => { const a = auto[1]; if (!a || !(a.driver === 'player')) return; p.x = a.x - Math.cos(a.angle) * 9; p.y = a.y - Math.sin(a.angle) * 9; p.vx = 0; p.vy = 0; w.camYaw = a.angle; }, 200);
    // een voetganger vooruit en een getuige ernaast, zodat de auto van Tessa iemand aanrijdt (en iemand het ziet)
    const lokaas = setInterval(() => {
      const a = auto[1]; if (!a || a.driver !== 'player' || Math.abs(a.speed) < 4 || peds >= 6) return;
      const hx = Math.cos(a.angle), hy = Math.sin(a.angle);
      const maakPed = (d, zij) => { const q = new Pd.Pedestrian(a.x + hx * d - hy * zij, a.y + hy * d + hx * zij, 0); q.state = 'idle'; w.pedestrians.push(q); peds++; return q; };
      if (!w.pedestrians.some((q) => !q.isCop && Math.hypot(q.x - (a.x + hx * 14), q.y - (a.y + hy * 14)) < 6)) { maakPed(14, 0); maakPed(16, 9); }
    }, 700);
    let genomen = {};
    const shots = [];
    const eind = performance.now() + s * 1000;
    while (performance.now() < eind) {
      // met een ster blijft een auto die stilstaat voor de politie een tijd ongemoeid (zoals bij de host); drie sterren houden hem erop zodat de politie komt en pakt
      if (sec() > 6 && sec() < 85 && !gepakt) for (const g of gasten) if (((w.coopWanted || {})[g.slot] | 0) < 3 && ((w.coopWanted || {})[g.slot] | 0) > 0) w.coopWanted[g.slot] = 3;
      const m = meet();
      log('bestuur-sample', m);
      if (!genomen.instap && auto[1].driver === 'player' && auto[1].coopBestuurder === 1) { genomen.instap = true; const a = auto[1]; p.x = a.x - 3.2; p.y = a.y - 9; w.camYaw = Math.PI / 2; await sleep(700); shot('bestuur-instap'); log('bestuur-instap', meet()); }
      if (!genomen.rijdt && auto[1].driver === 'player' && Math.abs(auto[1].speed) > 8) { genomen.rijdt = true; await sleep(500); shot('bestuur-rijdt'); log('bestuur-rijdt', meet()); }
      if (!genomen.gezocht && (w.coopWanted || {})[1] > 0) { genomen.gezocht = true; shot('bestuur-gezocht'); log('bestuur-gezocht', meet()); }
      if (!genomen.politie && (m.cops > 0) && auto[1].driver === 'player') { genomen.politie = true; await sleep(800); shot('bestuur-politie'); log('bestuur-politie', meet()); }
      if (gepakt && !genomen.gepakt) { genomen.gepakt = true; await sleep(600); shot('bestuur-gepakt'); log('bestuur-na-gepakt', meet()); }
      maxPolitie = Math.max(maxPolitie, m.cops);
      await sleep(1000);
    }
    clearInterval(volg); clearInterval(lokaas);
    w.addMessage = am;
    log('bestuur-eind', { ...meet(), berichten, gepakt, maxPolitie, peds, hostWanted0, heli: { driver: heli.driver, b: heli.coopBestuurder ?? null }, killed: (w.stats && w.stats.pedKills) | 0 });
  },
  // #525: een gast rijdt mee en stapt weer uit, van instappen tot uitstappen, met de echte koppeling, de echte haken van
  // main.js en de echte Player-methoden. De gastheer zet een vrije auto naast de gast; de headless gast drukt E (in),
  // rijdt een stuk en drukt E (uit). Na elke stap: geen jserror, geen NaN in een positie, een lege rijdersregel na het
  // uitstappen en de gast naast de deur van zijn stoel in plaats van in de auto.
  // De pure variant zonder Electron staat in scripts/coopmeerijden_test.mjs.
  async meerijden({ s = 60 }) {
    if (CFG.role !== 'host') { await sleep((s + 10) * 1000); return; }
    const V = await imp('vehicle'), D = await imp('vehicledoors'), w = W();
    const fig = (w.coopFigures || {})[1];
    if (!fig) { log('meerijden-geen-gast', { figuren: Object.keys(w.coopFigures || {}) }); await sleep(s * 1000); return; }
    // een vrije auto naast de gast; hij staat stil en is van niemand
    const model = V.TRAFFIC_MODELS().find((m) => m.name === 'sedan') || V.TRAFFIC_MODELS()[0];
    const auto = new V.Vehicle(fig.x + 2.6, fig.y, 0.4, model);
    auto.parked = true;
    w.vehicles.push(auto);
    await sleep(800);
    const num = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : String(x));
    const eindig = () => {
      const velden = { gx: fig.x, gy: fig.y, gz: fig.gz, ghoek: fig.angle, vx: auto.x, vy: auto.y, vhoek: auto.angle, vsnelheid: auto.speed || 0 };
      const slecht = Object.entries(velden).filter(([, v]) => !Number.isFinite(v)).map(([k, v]) => k + '=' + v);
      for (const r of Object.values(w.coopRijders || {})) if (!Number.isFinite(r.proxy.x) || !Number.isFinite(r.proxy.y)) slecht.push('proxy(' + r.slot + ')=' + r.proxy.x + ',' + r.proxy.y);
      return slecht;
    };
    const meet = (fase) => {
      const r = (w.coopRijders || {})[1] || null;
      const uit = D.uitstapPunt(auto, 'bestuurder');
      const off = auto.halfWid + 0.7, nx = -Math.sin(auto.angle), ny = Math.cos(auto.angle);
      const dx = uit ? auto.x + nx * off * uit.kant + Math.cos(auto.angle) * uit.langs : auto.x;
      const dy = uit ? auto.y + ny * off * uit.kant + Math.sin(auto.angle) * uit.langs : auto.y;
      return {
        fase, t: Math.round(performance.now() / 100) / 10,
        rijders: Object.keys(w.coopRijders || {}).map(Number), regel: !!r, inVeh: !!fig.inVeh, bestuurt: !!fig.coopBestuurt, voertuig: !!fig.coopVoertuig,
        drv: auto.driver ?? null, b: auto.coopBestuurder ?? null, snelheid: Math.round((auto.speed || 0) * 10) / 10,
        fig: [num(fig.x), num(fig.y)], auto: [num(auto.x), num(auto.y)],
        deur: [num(dx), num(dy)], deurAfstand: Math.round(Math.hypot(fig.x - dx, fig.y - dy) * 100) / 100, uitAfstand: Math.round(Math.hypot(fig.x - auto.x, fig.y - auto.y) * 100) / 100,
        halfWid: auto.halfWid, gz: num(fig.gz), z: num(auto.z || 0), nan: eindig(),
      };
    };
    log('meerijden-auto', { id: auto.id, fig: [num(fig.x), num(fig.y)], auto: [num(auto.x), num(auto.y)], model: model.name });
    const t0 = performance.now(), sec = () => Math.round((performance.now() - t0) / 100) / 10;
    let ingestapt = false, gereden = 0, uitgestapt = false, p0 = null;
    const reeks = [];
    while (performance.now() - t0 < s * 1000) {
      const m = meet('meten'); reeks.push(m); log('meerijden-sample', m);
      if (!ingestapt && m.regel && m.inVeh && m.bestuurt) { ingestapt = true; p0 = [auto.x, auto.y]; log('meerijden-in', m); shot('meerijden-in'); }
      if (ingestapt && p0 && !uitgestapt) gereden = Math.max(gereden, Math.hypot(auto.x - p0[0], auto.y - p0[1]));
      if (ingestapt && !uitgestapt && !m.inVeh && !m.regel && m.deurAfstand < 1) { uitgestapt = true; log('meerijden-uit', { ...m, gereden: Math.round(gereden * 10) / 10 }); shot('meerijden-uit'); }
      if (uitgestapt && sec() > 12) break;
      await sleep(500);
    }
    const eind = meet('eind');
    log('meerijden-eind', { ...eind, ingestapt, uitgestapt, gereden: Math.round(gereden * 10) / 10, nanSamples: reeks.filter((m) => m.nan.length).length, samples: reeks.length });
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
  // Suite 'alles' (docs/COOP-SWEEP-21-11.md): een korte, dekkende stap per systeem. Elke stap logt 'alles-<stap>' met wat dit venster zag;
  // de testbank keurt dat per stap. Systemen van een epic die nog niet in de gestagede game staan worden gelogd als { skip: true }.
  async allesstap({ stap, wie = 'gast', s = 8 }) {
    const w = W();
    const uit = (data) => log('alles-' + stap, { rol: CFG.role, ...data });
    try {
      if (stap === 'ping') { // kaartping: een gast roept (9, Kijk daar), de anderen zien een baken
        if (CFG.name === wie) key('9', 'Digit9');
        await sleep(s * 1000);
        uit({ marks: (W().coopPingMarks || []).length, teksten: (W().coopPingMarks || []).map((m) => m.tekst) });
      } else if (stap === 'waypoint') { // een waypoint is per speler: wat de gast kiest staat niet bij de anderen
        const G = await imp('goal');
        if (CFG.name === wie) G.setGoal({ kind: 'place', name: 'Alles-test', x: W().player.x + 150, y: W().player.y + 150 }, { quiet: true });
        await sleep(s * 1000);
        const g = G.getGoal && G.getGoal();
        uit({ heeftDoel: !!(g && g.name === 'Alles-test') });
      } else if (stap === 'zinnen') { // snelle zinnen (#1159, opt-in): een gast zegt "Dank je!", de anderen zien de regel; een gedempte speler niet
        const S2 = await imp('settings'), N2 = await imp('coopnet');
        S2.setSetting('samenZinnen', true);
        const gezien = [], am = w.addMessage;
        w.addMessage = function (m, ...r) { gezien.push(String(m)); return am && am.call(this, m, ...r); };
        if (CFG.name === wie) N2.sayPhrase(W(), 'dank');
        await sleep(s * 1000);
        w.addMessage = am; S2.setSetting('samenZinnen', false);
        uit({ regels: gezien.filter((m) => /Dank je/.test(m)) });
      } else if (stap === 'doel') { // een doel delen (#1159, opt-in): de gast deelt zijn doel met iedereen; de anderen krijgen een voorstel (J of N), zijn eigen doel verandert niet
        const S3 = await imp('settings'), N3 = await imp('coopnet');
        S3.setSetting('samenZinnen', true);
        if (CFG.name === wie) N3.shareGoal(W(), { x: W().player.x + 120, y: W().player.y + 120 }, 'iedereen');
        await sleep(s * 1000);
        const v = N3.goalProposal(W());
        S3.setSetting('samenZinnen', false);
        uit({ voorstel: !!v, x: v ? Math.round(v.x) : null });
      } else if (stap === 'outfit') { // kleding: de outfit-code in de spelerslijst (epic Kleding)
        let C = null; try { C = await imp('clothing'); } catch (e) { /* nog niet gemerged */ }
        if (!C) return uit({ skip: true, reden: 'clothing.js ontbreekt' });
        // ronde 4: de gast kiest een ander postuur (breed) en meldt dat zoals het pashokje doet; de anderen moeten die code in hun spelerslijst zien
        if (CFG.name === wie) { C.setBody('tammo', 'breed'); C.setBody('anita', 'breed'); C.emitLocalOutfitChange(); }
        await sleep(s * 1000);
        uit({ codes: (W().coopRoster || []).map((r) => (r.avatar && r.avatar.outfit) || null), eigen: C.localOutfitCode ? C.localOutfitCode() : null });
      } else if (stap === 'tuning') { // tuning: onderdelen van een eigen auto komen mee in het bezorg-bericht (#1158)
        const T = await imp('tuningplan');
        await sleep(s * 1000);
        uit({ onderdelen: Array.isArray(T.PARTS) ? T.PARTS.length : 0, bezorgVeld: !!(await imp('coopbezit')).TUNING_VELD, skip: !(await imp('coopbezit')).TUNING_VELD, reden: 'coopbezit.js kent het tuning-veld niet' });
      } else if (stap === 'bezit') { // bezit: host en gast kopen verschillend, zien elkaars plekken, gast2 werkt mee in de wagen van de host (epic Bezit)
        let B = null; try { B = await imp('bezitnet'); } catch (e) { /* nog niet gemerged */ }
        if (!B) return uit({ skip: true, reden: 'bezitnet.js ontbreekt' });
        uit(await bezitAlles({ me: CFG.name, imp, sleep, W, wait: Math.max(2000, s * 1000 / 2) }));
      } else if (stap === 'radio') { // de zender in een gedeeld voertuig (radiogroup.js, 22-11): alleen zinvol als iemand meerijdt; anders logt hij zit false
        const N4 = await imp('coopnet'), RC = await imp('radiochannels');
        const open = RC.CHANNELS.filter((c) => !c.unlock).map((c) => c.id);
        let gedeeld = null;
        if (CFG.name === wie) gedeeld = N4.shareTune(W(), 'wierde');
        await sleep(s * 1000);
        const R4 = W().coopRadioGroep || null;
        uit({ gedeeld, groep: N4.groupTune(W(), open), bestuurder: R4 && R4.bestuurder ? R4.bestuurder.id : null, zit: !!W().coopInVoertuig || !!(W().player && W().player.inVehicle) });
      } else if (stap === 'geld') { // geld per speler: elk venster houdt zijn eigen saldo
        const g0 = w.money | 0; await sleep(s * 1000);
        uit({ voor: g0, na: W().money | 0 });
      } else uit({ onbekend: true });
    } catch (e) { uit({ fout: String(e && e.message || e) }); }
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
    // geen permanent label meer (#377): niets van de spelerslijst ligt over het menu; Spelers is een tabblad onder Samen spelen (#434)
    const lijst = document.getElementById('coop-spelers');
    const rail = document.querySelector('#pause-menu [data-of="samen"][data-subtab="spelers"]');
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
    await act('kies-gast'); await wizard('code'); // (#1059) ook bij opnieuw aansluiten staat 'Wie ben jij?' ertussen
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
      setTimeout(async () => { try { await until(() => W().coopStartMeting && W().coopStartMeting.klaar, 90000, 'start-meting'); const m = W().coopStartMeting; log('start-meting', { samenvatting: m.samenvatting, stappen: m.stappen, events: m.events.slice(0, 40) }); } catch (e) { /* geen meting */ } }, 0); // #1011: wat zet de gastheer stil na Spel starten
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
      { // samen-qa 24-11: hoe zit de gast erin, gezien door de gastheer (zitpose op het modulaire model)
        const vv = w.player.inVehicle, zit = Object.values(w.coopFigures || {}).filter((f) => f && f.inVeh && f.inVeh === vv).map((f) => [f.slot, f.stoel]);
        log('gastrit-host-ziet-gast', { zit, binnen: !!w.firstPerson }); if (vv) { w.camYaw = (vv.angle || 0) + Math.PI * 0.75; await sleep(700); } shot('gastrit-host-ziet-gast');
      }
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
  // ---- samen-qa 24-11 (testbank --suite=samenqa): wat op 23-11 alleen puur getest was, in twee echte vensters. Elke fase legt
  // vast wat de gastheer deed en wat de gast zag, met een schermafbeelding van beide kanten (qa-<fase>-host / qa-<fase>-gast).
  // Mensen: de gastheer en de gast staan tegenover elkaar (modulaire mensen, kleding uit de kledingcode van de avatar).
  async qamensen({ s = 14 }) {
    const w = W(), tot = qaKlok();
    if (CFG.role === 'host') {
      const p = w.player, g = qaGastFig();
      if (g) { g.x = p.x + 3.2; g.y = p.y + 0.4; g.vx = 0; g.vy = 0; g.verTijd = 0; g.vastTijd = 0; }
      await tot(3); if (g) qaKijk(g.x, g.y);
      await tot(5);
      const labels = []; // het naamlabel boven de figuur van de gast (avatarlabel3d.js makeLabel): waar en hoe groot in de wereld
      try { const SC = (await imp('scene3d')).getScene(); if (SC) SC.traverse((o) => { if (o.isSprite && o.renderOrder === 10 && o.parent) { const THREE = o.constructor; const wp = o.getWorldPosition(new o.position.constructor()), ws = o.getWorldScale(new o.position.constructor()), pw = o.parent.getWorldScale(new o.position.constructor()); labels.push({ pos: [qaR(wp.x), qaR(wp.y), qaR(wp.z)], schaal: [qaR(ws.x * 100) / 100, qaR(ws.y * 100) / 100], ouderSchaal: qaR(pw.x * 100) / 100, ouder: o.parent.type, gastXY: g ? [qaR(g.x), qaR(g.y)] : null }); } }); } catch (e) { labels.push({ fout: e.message }); }
      log('qa-mensen-label', { labels: labels.slice(0, 4) });
      log('qa-mensen-host', { gast: g ? { char: g.char || null, outfit: !!(g.avatar && g.avatar.outfit) } : null, roster: (w.coopRoster || []).map((r) => ({ slot: r.slot, char: r.char, outfit: r.avatar && r.avatar.outfit ? String(r.avatar.outfit).slice(0, 40) : null })) });
      shot('qa-mensen-host');
    } else {
      await tot(5);
      const h = qaHost(); if (h) qaKijk(h.x, h.y);
      await tot(7);
      const me = await qaIk();
      const c = w.companion; // op een gast is de gastheer world.companion (coopclient.js bodyFor): met welk model en welk label?
      log('qa-mensen-gast-host', { companion: c ? { character: c.character || null, coopChar: c.coopChar || null, opHost: h ? qaR(Math.hypot(c.x - h.x, c.y - h.y)) : null } : null, figuren: Object.keys(w.coopFigures || {}) });
      log('qa-mensen-gast', { host: h ? { afstand: qaR(Math.hypot(h.x - me.x, h.y - me.y)) } : null, roster: (w.coopRoster || []).map((r) => ({ slot: r.slot, char: r.char, outfit: r.avatar && r.avatar.outfit ? String(r.avatar.outfit).slice(0, 40) : null })) });
      shot('qa-mensen-gast');
    }
    await tot(s);
  },
  // Groepswarp (groepwarp.js): M11 (een warp of reisscène: storytravel.placeParty), M20 (landing na de sprong: warpGasten) en
  // M06 (de vluchtboot: gastenMeeAanBoord). De gastheer meet in dezelfde tik waar de gast staat, dus niet de band van 110 m.
  async qaboot(a) { return PHASES.qawarp({ ...a, alleenBoot: true }); }, // alleen M06 (de vluchtboot), vanaf het beginpunt: een warp laadt een tweede stuk wereld
  async qawarp({ s = 60, alleenBoot = false }) {
    const w = W(), tot = qaKlok(), b = alleenBoot ? -18 : 0; // b: de boot meteen, zonder de twee warps ervoor
    if (CFG.role === 'host') {
      const ST = await imp('storytravel'), GW = await imp('groepwarp'), S = await imp('shops'), p = w.player;
      const winkels = (S.getShopsForRender() || []).map((q) => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) })).filter((o) => o.d > 300 && o.d < 900).sort((a, b) => a.d - b.d);
      await tot(3); // de gast legt eerst zijn plek vast
      let dest = { x: p.x, y: p.y };
      if (!alleenBoot) {
      dest = await qaVrij(winkels.length ? winkels[0].q.x : p.x + 500, winkels.length ? winkels[0].q.y : p.y);
      const g0 = qaGastFig(), voor = g0 ? qaR(Math.hypot(g0.x - dest.x, g0.y - dest.y)) : null;
      ST.placeParty(w, dest);
      const g1 = qaGastFig();
      log('qa-warp-m11-host', { dest: [Math.round(dest.x), Math.round(dest.y)], gastVoor: voor, gastNa: g1 ? qaR(Math.hypot(g1.x - dest.x, g1.y - dest.y)) : null, host: qaR(Math.hypot(p.x - dest.x, p.y - dest.y)) });
      await tot(6); if (g1) qaKijk(g1.x, g1.y); await tot(7); shot('qa-warp-m11-host');
      await tot(14);
      const land = await qaVrij(p.x + 16, p.y + 8);
      p.x = land.x; p.y = land.y; p.vx = 0; p.vy = 0;
      const n20 = GW.warpGasten(w, land), g2 = qaGastFig();
      log('qa-warp-m20-host', { n: n20, gastAfstand: g2 ? qaR(Math.hypot(g2.x - land.x, g2.y - land.y)) : null });
      await tot(19); if (g2) qaKijk(g2.x, g2.y); await tot(20); shot('qa-warp-m20-host');
      }
      await tot(24 + b);
      const boten = (w.vehicles || []).filter((v) => v && v.isBoat && !v.driver && !v.wrecked && !v.sinking).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      let boot = boten[0] && Math.hypot(boten[0].x - p.x, boten[0].y - p.y) < 400 ? boten[0] : null, gemaakt = false;
      if (!boot) { // geen boot in de buurt: een rubberboot als die van M06 (heist.js GETAWAY_BOAT) op het dichtstbijzijnde brede water
        const { isInWater } = await import('./js/util.js'), V = await imp('vehicle'), BT = await imp('boattypes');
        let wp = null;
        for (let r = 6; r <= 600 && !wp; r += 6) for (let a = 0; a < 6.283 && !wp; a += 0.12) { const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if ([0, 4, 8].every((d) => isInWater(w.map, x + Math.cos(a) * d, y + Math.sin(a) * d)) && isInWater(w.map, x - Math.sin(a) * 3, y + Math.cos(a) * 3) && isInWater(w.map, x + Math.sin(a) * 3, y - Math.cos(a) * 3)) wp = { x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 4, a }; }
        if (wp) { boot = new V.Vehicle(wp.x, wp.y, wp.a, { ...BT.BOAT_KINDS.rubberboot, maxSpeed: 7.5, accel: 3.2, color: '#1c1f22', cabin: '#d9412b' }); boot.isBoat = true; boot.missionCar = true; boot.speed = 0; w.vehicles.push(boot); gemaakt = true; }
      }
      if (!boot) log('qa-warp-m06-host', { geenBoot: true, voertuigen: (w.vehicles || []).length });
      else {
        const afstand = Math.round(Math.hypot(boot.x - p.x, boot.y - p.y));
        p.x = boot.x; p.y = boot.y; p.vx = 0; p.vy = 0;
        const g = qaGastFig(); if (g) { g.x = boot.x + 4; g.y = boot.y + 2; g.vx = 0; g.vy = 0; }
        await sleep(2500);
        if (p.water) { p.water = null; p.swimming = false; p.z = 0; }
        if (p.inVehicle !== boot) p.enterVehicle(boot, w);
        const n06 = GW.gastenMeeAanBoord(w), g3 = qaGastFig();
        log('qa-warp-m06-host', { n: n06, afstand, gemaakt, hostInBoot: p.inVehicle === boot, gast: g3 ? { inBoot: g3.inVeh === boot, stoel: g3.stoel ?? null } : null, model: boot.model && boot.model.name });
        await tot(36 + b); qaKijk(boot.x + 6, boot.y + 6); shot('qa-warp-m06-host');
        await tot(46 + b);
        // terug aan wal (handBack 'moor'): wie in de boot zat stapt mee uit
        p.exitVehicle(w.map, w); p.x = dest.x; p.y = dest.y; p.water = null; p.swimming = false;
        const nUit = GW.warpGasten(w, dest, { alleen: (l) => l.inVeh === boot }), g4 = qaGastFig();
        log('qa-warp-m06-uit-host', { n: nUit, gastUit: g4 ? !g4.inVeh : null, afstand: g4 ? qaR(Math.hypot(g4.x - dest.x, g4.y - dest.y)) : null });
      }
    } else {
      const msgs = qaMsgs(), me = await qaIk(), p0 = [me.x, me.y];
      let h = null;
      if (!alleenBoot) {
      await tot(5);
      h = qaHost();
      log('qa-warp-m11-gast', { verplaatst: qaR(Math.hypot(me.x - p0[0], me.y - p0[1])), afstandHost: h ? qaR(Math.hypot(h.x - me.x, h.y - me.y)) : null, meldingen: msgs.slice(-3) });
      if (h) qaKijk(h.x, h.y); await tot(7.5); shot('qa-warp-m11-gast');
      await tot(19); h = qaHost();
      log('qa-warp-m20-gast', { afstandHost: h ? qaR(Math.hypot(h.x - me.x, h.y - me.y)) : null, meldingen: msgs.slice(-3) });
      if (h) qaKijk(h.x, h.y); await tot(20.5); shot('qa-warp-m20-gast');
      }
      await tot(34 + b); h = qaHost();
      log('qa-warp-m06-gast', { inVoertuig: !!w.coopInVoertuig, afstandHost: h ? qaR(Math.hypot(h.x - me.x, h.y - me.y)) : null, meldingen: msgs.slice(-3) });
      if (h) qaKijk(h.x, h.y); await tot(36.5 + b); shot('qa-warp-m06-gast');
      await tot(52 + b);
      log('qa-warp-m06-uit-gast', { inVoertuig: !!w.coopInVoertuig, zwemt: !!(me.swimming || me.water), meldingen: msgs.slice(-3) });
    }
    await tot(s);
  },
  // Provinciedieren en de wolf (ADR 0053): de gastheer zet een wolf naast de gast (hij richt zich op de dichtstbijzijnde speler), daarna een
  // tweede naast zichzelf. Schade per speler: de gast neemt zijn eigen beet uit de aanvalsstand in het dierbericht (coopextra3d.js).
  async qadier({ s = 34 }) {
    const w = W(), tot = qaKlok();
    const wolf = (x, y) => ({ kind: 'wolf', x, y, angle: 0, speed: 0, stride: 0, bobSeed: 1, wanderTarget: { x, y }, homeX: x, homeY: y, homeRadius: 40, waypointTimer: 2, state: 'zwerf', howled: true, tracks: true, bites: 0, biteT: 0 });
    if (CFG.role === 'host') {
      const p = w.player, g = qaGastFig(); if (!w.wildlife) w.wildlife = [];
      if (!g) { log('qa-wolf-host', { geenGast: true }); await tot(s); return; }
      const plek = await qaVrij(p.x + 14, p.y); // dichtbij genoeg voor een beeld, de gast blijft de dichtstbijzijnde speler
      g.x = plek.x; g.y = plek.y; g.vx = 0; g.vy = 0; g.verTijd = 0; g.vastTijd = 0;
      await tot(2);
      const a = wolf(g.x + 7, g.y + 2); w.wildlife.push(a); qaKijk(g.x, g.y, 0.15);
      const st = [];
      for (let i = 0; i < 20; i++) { await sleep(500); st.push([a.state, a.bites || 0, qaR(Math.hypot(a.x - g.x, a.y - g.y))]); if (i === 2) shot('qa-wolf1-host'); if (i === 5) shot('qa-wolf1-host-b'); }
      log('qa-wolf1-host', { verloop: st.filter((x, i) => i % 3 === 0), beten: a.bites || 0 });
      a.gone = true;
      await tot(16);
      const hp0 = w.health, b = wolf(p.x + 6, p.y + 1); w.wildlife.push(b);
      for (let i = 0; i < 16; i++) { await sleep(500); if (i < 8) qaKijk(b.x, b.y, 0.3); if (i === 3) shot('qa-wolf2-host'); }
      log('qa-wolf2-host', { hpVoor: Math.round(hp0), hpNa: Math.round(w.health), beten: b.bites || 0, staat: b.state });
      b.gone = true; w.health = Math.max(w.health, hp0);
    } else {
      const hp0 = w.health, wolven = () => (w.coopExtra && w.coopExtra.dieren ? [...w.coopExtra.dieren.values()].filter((d) => d && d.soort === 'wolf') : []);
      let gezien = 0, aanval = 0;
      for (let i = 0; i < 26; i++) { await sleep(500); const l = wolven(); if (l.length) gezien++; if (l.some((d) => d.aux === 2)) aanval++; if (l[0] && i < 12) qaKijk(l[0].x, l[0].y, 0.25); if (i === 3) shot('qa-wolf1-gast'); if (i === 6) shot('qa-wolf1-gast-b'); }
      log('qa-wolf1-gast', { hpVoor: Math.round(hp0), hpNa: Math.round(w.health), wolfGezien: gezien, aanvalsstand: aanval });
      await tot(26);
      const hp1 = w.health;
      log('qa-wolf2-gast', { hp: Math.round(hp1), wolven: wolven().map((d) => [d.aux, qaR(d.x), qaR(d.y)]) });
      w.health = Math.max(w.health, hp0);
    }
    await tot(s);
  },
  // Levende stad (#1314-#1316): de gastheer zet de klok op 15 uur en start een straatgebeurtenis; de gast staat naast hem en ziet de figuren,
  // tekstballonnen en de rekwisieten (kraam, ijscokar, gitaarkoffer) via het EXTRA-bericht.
  async qastad({ s = 24 }) {
    const w = W(), tot = qaKlok();
    if (CFG.role === 'host') {
      const p = w.player, g = qaGastFig(), SE = await imp('streeteventlive');
      w.clock = 15;
      if (g) { g.x = p.x + 2.5; g.y = p.y + 1; g.vx = 0; g.vy = 0; }
      await tot(2);
      let ev = null; const geprobeerd = [];
      for (const id of ['ijscokar', 'muzikant', 'kraampje', 'toeristen', 'parkeerruzie', 'lekkeband', 'hond']) { geprobeerd.push(id); try { ev = SE.forceStreetEvent(w, id); } catch (e) { log('qa-stad-fout', { id, msg: e.message }); } if (ev) break; }
      window.__qaEv = ev ? { x: ev.x, y: ev.y } : null;
      log('qa-stad-host', { ev: ev ? ev.id : null, geprobeerd, afstand: ev ? qaR(Math.hypot(ev.x - p.x, ev.y - p.y)) : null, rollen: ev ? ev.rollen.length : 0, props: ev ? (ev.props || []).length : 0, klok: w.clock, stats: SE.streetEventStats() });
      if (ev) { const bij = await qaVrij(ev.x + 9, ev.y + 5); p.x = bij.x; p.y = bij.y; p.vx = 0; p.vy = 0; if (g) { g.x = bij.x + 1.5; g.y = bij.y + 2; g.vx = 0; g.vy = 0; } } // beide spelers op een paar meter van de scène
      await tot(8); if (ev) qaKijk(ev.x, ev.y, 0.2); await tot(10); shot('qa-stad-host');
      await tot(16);
      log('qa-stad-host-na', { stats: SE.streetEventStats(), spraak: (w.pedestrians || []).filter((q) => q.eventActor && q.speechText).map((q) => q.speechText).slice(0, 3) });
    } else {
      const EX = await imp('coopextra');
      await tot(9);
      const st = w.coopExtra, m = st && st.misc && (st.misc.get(EX.MISC_REKWISIETEN) || st.misc.get(EX.MISC_REKWISIETEN2));
      const rekw = st && m ? EX.standRekwisieten(st, m.at) : [];
      const straat = rekw.filter((r) => ['kraampje', 'ijscokar', 'gitaarkoffer'].includes(r.soort));
      const spraak = st && st.spraak ? [...st.spraak.values()].map((x) => x.tekst).filter(Boolean).slice(0, 5) : [];
      log('qa-stad-gast', { rekwisieten: rekw.map((r) => r.soort), straat: straat.map((r) => [r.soort, qaR(r.x), qaR(r.y)]), spraak, klok: Math.round((w.clock || 0) * 10) / 10, voetgangers: st && st.voetgangers ? st.voetgangers.size : null });
      const doel = straat[0] || qaHost(); if (doel) qaKijk(doel.x, doel.y, 0.2);
      await tot(11); shot('qa-stad-gast');
    }
    await tot(s);
  },
  // Bushaltes (#bushaltes-23-11): de gastheer zoekt een lijnbus die een halte nadert en zet beide spelers naast het stoppunt; de gast ziet de bus
  // uit de snapshot stoppen (knipperlicht, stilstand) en tekent zelf de in- en uitstappers (boarding3d.js).
  async qahalte({ s = 60 }) {
    const w = W(), tot = qaKlok(), IN = await imp('boarding3d');
    if (CFG.role === 'host') {
      const p = w.player, BS = await imp('busstop');
      let bus = null, ronde = 0, nadLog = []; const fasen = {};
      while (!bus && performance.now() < qaT0() + 36000) {
        ronde++;
        for (const v of w.vehicles || []) if (v && v.busRun) { const k = (v.halteStaat && v.halteStaat.fase) || 'geen'; fasen[k] = (fasen[k] || 0) + 1; }
        const nad = (w.vehicles || []).filter((v) => v && v.busRun && v.halteStaat && v.halteStaat.fase === 'nadering' && v.halteStaat.stop);
        nadLog = nad.map((v) => Math.round(BS.halteAfstand(v.busRun, v.halteStaat.stop)));
        const staat = (w.vehicles || []).find((v) => v && v.busRun && v.halteStaat && v.halteStaat.fase === 'staan' && v.halteStaat.stop); // een bus die al bij een halte staat: meteen erheen
        if (staat && performance.now() > qaT0() + 25000) { bus = { v: staat, d: 0 }; break; } // pas als er na 25 s geen naderende bus is
        bus = nad.map((v) => ({ v, d: BS.halteAfstand(v.busRun, v.halteStaat.stop) })).filter((o) => o.d > 25 && o.d < 90).sort((a, b) => b.d - a.d)[0] || null; // ver genoeg weg: dan zie je hem aankomen en stoppen
        if (!bus) await sleep(400);
      }
      if (!bus) { log('qa-halte-host', { geenBus: true, rondes: ronde, fasen, naderingD: nadLog, bussen: (w.vehicles || []).filter((v) => v && v.busRun).map((v) => ({ afstand: Math.round(Math.hypot(v.x - p.x, v.y - p.y)), v: qaR(v.speed || 0), lijn: v.busRun.line && v.busRun.line.name || null, live: !!v.liveId })) }); await tot(s); return; }
      const v = bus.v, c = Math.cos(v.angle || 0), sn = Math.sin(v.angle || 0);
      const stop = { x: v.x + c * bus.d, y: v.y + sn * bus.d };
      const plek = { x: stop.x - sn * 8 + c * 6, y: stop.y + c * 8 + sn * 6 };
      p.x = plek.x; p.y = plek.y; p.vx = 0; p.vy = 0;
      const g = qaGastFig(); if (g) { g.x = plek.x + c * 2; g.y = plek.y + sn * 2; g.vx = 0; g.vy = 0; }
      window.__qaHalte = stop;
      log('qa-halte-host-bus', { d: Math.round(bus.d), alle: nadLog, snelheid: qaR(v.speed || 0), fase: v.halteFase, lijn: v.busRun.line && v.busRun.line.name || null, t: qaR((performance.now() - qaT0()) / 1000) });
      const verloop = []; let maxWissel = 0, beeld = 0;
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        qaKijk(v.x, v.y);
        const ist = IN.instapStats(); maxWissel = Math.max(maxWissel, ist.wissels);
        if (i % 4 === 0) verloop.push([qaR(v.speed || 0), v.halteFase, v.indForce || '-', v.deurenDicht ? 'dicht' : 'open', ist.wissels, ist.wachtend]);
        if (v.halteFase === 'staan' && beeld === 0) { beeld = 1; await sleep(1200); shot('qa-halte-host-staan'); }
        if (v.halteFase === 'invoegen' && beeld === 1) { beeld = 2; shot('qa-halte-host-invoegen'); }
      }
      if (!beeld) shot('qa-halte-host-staan');
      log('qa-halte-host', { verloop, maxWissel });
    } else {
      await tot(1);
      const me = await qaIk(); const bussen = () => ((w.coopHost && w.coopHost.voertuigen) || []).filter((x) => x.soort === 'bus').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      const verloop = []; let maxWissel = 0, stil = 0, knipper = 0, beeld = 0;
      for (let i = 0; i < 100 && performance.now() < qaT0() + (s - 3) * 1000; i++) {
        await sleep(500);
        const b = bussen()[0], ist = IN.instapStats(); maxWissel = Math.max(maxWissel, ist.wissels);
        if (b) { qaKijk(b.x, b.y); if (Math.abs(b.snelheid) < 0.3 && Math.hypot(b.x - me.x, b.y - me.y) < 40) stil++; if (b.ind) knipper++; }
        if (i % 4 === 0) verloop.push(b ? [qaR(b.snelheid), b.ind || '-', qaR(Math.hypot(b.x - me.x, b.y - me.y)), ist.wissels, ist.wachtend] : ['geen bus', ist.wissels, ist.wachtend]);
        if (ist.wissels > 0 && beeld === 0) { beeld = 1; await sleep(600); shot('qa-halte-gast-instappers'); }
      }
      if (!beeld) shot('qa-halte-gast-instappers');
      log('qa-halte-gast', { verloop, maxWissel, stilTellen: stil, knipperTellen: knipper });
    }
    await tot(s);
  },
  // Raakbevestiging voor de kogel van een gast (#1290): de gastheer zet een geparkeerde auto 7 m voor de gast; de gast schiet met een pistool
  // (eigen patronen). De gastheer rekent de kogel uit en stuurt 'raak'; de gast tekent de streepjes (world.hitMark).
  async qatreffer({ s = 16 }) {
    const w = W(), tot = qaKlok();
    if (CFG.role === 'host') {
      const g = qaGastFig(); let raak = 0; const oud = w.coopRaak;
      if (typeof oud === 'function') w.coopRaak = (...a) => { raak++; return oud(...a); };
      const auto = g ? (w.vehicles || []).filter((v) => v && !v.driver && !v.isBoat && !v.isBus && !v.isTrain && !v.isHeli && !v.isPlane && !v.isBike && !v.wrecked && !v.isPolice).sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0] : null;
      if (auto) { const plek = await qaVrij(g.x + 7, g.y); auto.x = plek.x; auto.y = plek.y; auto.speed = 0; window.__qaAuto = auto; }
      const p = w.player; p.x = g ? g.x - 3 : p.x; p.y = g ? g.y + 3 : p.y;
      await tot(4);
      const meet = { kogels: 0, wapens: null, knop: 0, hoek: null, gastAfstand: null }; let geschoten = false;
      for (let i = 0; i < 90; i++) { // wat de gastheer van de aanval van de gast ziet: invoer, zijn wapenstand en de kogels met een dader
        const kog = (w.bullets || []).filter((b) => b && b.dader).length; meet.kogels = Math.max(meet.kogels, kog);
        const lijst = w.coopWapens; if (lijst) meet.wapens = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(lijst).map(([k, v]) => [k, { w: v.w, n: v.n, teller: v.teller }]))));
        const inp = g && g.input;
        if (inp && ((inp.buttons | 0) & 16)) { meet.knop++; meet.hoek = qaR(inp.yaw || 0); }
        if (g && auto) meet.gastAfstand = qaR(Math.hypot(auto.x - g.x, auto.y - g.y));
        if (kog && !geschoten) { geschoten = true; if (auto) qaKijk(auto.x, auto.y, 0.3); shot('qa-treffer-host'); }
        await sleep(100);
      }
      if (!geschoten) { if (auto) qaKijk(auto.x, auto.y, 0.3); shot('qa-treffer-host'); }
      log('qa-treffer-host-meting', { ...meet, autoHoek: g && auto ? qaR(Math.atan2(auto.y - g.y, auto.x - g.x)) : null });
      await tot(s - 2);
      if (typeof oud === 'function') w.coopRaak = oud;
      log('qa-treffer-host', { auto: !!auto, raakBerichten: raak, autoSchade: auto ? Math.round(auto.health ?? auto.hp ?? -1) : null, gastWapen: g ? g.coopWapen || '' : null });
    } else {
      await tot(3);
      if (!w.ammo) w.ammo = {};
      w.ammo.pistol = 60; w.weapon = 'pistol';
      await tot(5);
      const me = await qaIk(); const auto = ((w.coopHost && w.coopHost.voertuigen) || []).filter((x) => x.soort !== 'bus').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (auto) qaKijk(auto.x, auto.y, 0); // recht op de auto: de gast schiet waar zijn camera heen kijkt
      const mark0 = w.hitMark ? w.hitMark.at : null, ammo0 = w.ammo.pistol;
      const inp = w.input; let shotGemaakt = false;
      for (let i = 0; i < 18; i++) { if (inp && inp.mouse) inp.mouse.down = true; await sleep(100); if (i === 9 && !shotGemaakt) { shotGemaakt = true; shot('qa-treffer-gast'); } }
      if (inp && inp.mouse) inp.mouse.down = false;
      await sleep(900);
      const m = w.hitMark;
      log('qa-treffer-gast', { auto: auto ? qaR(Math.hypot(auto.x - me.x, auto.y - me.y)) : null, wapen: w.weapon, patronen: [ammo0, w.ammo.pistol], raakNieuw: !!(m && m.at !== mark0), mark: m ? { at: qaR(m.at || 0), kind: m.kind || null } : null });
      shot('qa-treffer-gast-na');
      w.weapon = 'fists';
    }
    await tot(s);
  },
  // Meerijden en de zitpose (modulaire mensen, coopzitten3d.js): de gastheer stapt in een geparkeerde auto, de gast stapt in via dezelfde weg als E
  // (coopnet.js figGebruik), beide kanten leggen vast hoe de ander zit; daarna rijdt de gastheer een stukje en stapt de gast weer uit.
  async qazit({ s = 40 }) {
    const w = W(), tot = qaKlok();
    if (CFG.role === 'host') {
      const p = w.player, g = qaGastFig(), N = await imp('coopnet');
      const auto = (w.vehicles || []).filter((v) => v && !v.driver && !v.isBoat && !v.isBus && !v.isTrain && !v.isHeli && !v.isPlane && !v.isBike && !v.isScooter && !v.wrecked && !v.isPolice && !v.missionCar).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!auto || !g) { log('qa-zit-host', { geenAuto: !auto, geenGast: !g }); await tot(s); return; }
      p.x = auto.x + 2; p.y = auto.y; g.x = auto.x - 2; g.y = auto.y; g.vx = 0; g.vy = 0;
      await sleep(1200);
      p.enterVehicle(auto, w);
      await sleep(800);
      const ok = N.figGebruik(w, g.slot);
      log('qa-zit-host', { hostIn: p.inVehicle === auto, gastIn: ok, stoel: g.stoel ?? null, model: auto.model && auto.model.name, plekken: N.figuurPlekken(auto) });
      await tot(6); qaKijk(auto.x, auto.y, 0.9); await tot(7.5); shot('qa-zit-host');
      w.firstPerson = false;
      await tot(16); // de gastheer rijdt een stukje
      const B = window.__bot; if (B) { B.stick(0, -1); await sleep(1500); B.stick(0, 0); B.down(' '); await sleep(1500); B.up(' '); }
      await tot(22); shot('qa-zit-host-rijdt');
      await tot(28);
      auto.speed = 0; const uit = N.figGebruik(w, g.slot);
      log('qa-zit-host-uit', { gastUit: uit, inVeh: !!g.inVeh });
      await tot(31); p.exitVehicle(w.map, w);
    } else {
      await tot(6);
      const h = qaHost(); if (h) qaKijk(h.x, h.y, 0.9);
      log('qa-zit-gast', { inVoertuig: !!w.coopInVoertuig, zitters: (w.coopZitters || []).map((z) => [z.slot, z.voertuig, z.stoel, z.bestuurder]) });
      await tot(8); shot('qa-zit-gast');
      await tot(22); shot('qa-zit-gast-rijdt');
      await tot(30);
      log('qa-zit-gast-uit', { inVoertuig: !!w.coopInVoertuig });
    }
    await tot(s);
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
  // #983: een taxi- of treinrit (lokale scène van wie rijdt, reisrit.js) terwijl anderen meespelen. wie = 'host' of 'gast': die instantie
  // start de rit via de kaartopties (reiskaart -> reisrit.startMeerijden, de gast direct: de kaart weigert hem met ALLEEN_EIGEN_SPEL);
  // alle anderen kijken en loggen elke 2 s de figuur van de rijder, de verbinding en de beeldsnelheid.
  async ritreis({ wie = 'host', soort = 'taxi', naar = 'Winsum', s = 100 }) {
    const w0 = W(); const t0 = performance.now(); const jezelf = CFG.name === wie;
    const rijderSlot = wie === 'host' ? 0 : 1;
    const figuurVan = () => { // de figuur van de rijder in dit spel
      const x = W();
      if (rijderSlot === 0) return x.coopRole === 'client' ? (x.companion || null) : null;
      return x.coopFigures && x.coopFigures[1] ? x.coopFigures[1] : null;
    };
    const waarneem = (tag) => { const x = W(), f = figuurVan(), ses = net() && net().session; log('rit-zie', { tag, wie, f: f ? [Math.round(f.x), Math.round(f.y), Number.isFinite(f.x) && Number.isFinite(f.y)] : null, partners: (x.coopPartners || []).map((p) => [p.slot, p.status, Math.round(p.x), Math.round(p.y)]), status: ses ? ses.status : 'host', fps: FPS.fps, gap: FPS.gapLast, paused: !!x.paused, ui: !!x.uiPaused, cine: !!x.cameraOverride }); };
    if (!jezelf) { while (performance.now() - t0 < s * 1000) { waarneem('kijk'); await sleep(2000); } return; }
    const RK = await imp('reiskaart'), RR = await imp('reisrit');
    const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
    const dest = index.places.find((q) => q.name === naar);
    if (!dest) { log('rit-eigen', { fout: 'plaats niet gevonden: ' + naar }); await sleep(s * 1000); return; }
    w0.money = Math.max(w0.money, 900);
    const opts = RK.reisOptiesVoor(w0, { x: dest.x, y: dest.y, name: dest.name }); const o = opts.find((q) => q.id === soort);
    if (!o) { log('rit-eigen', { fout: 'geen optie ' + soort }); await sleep(s * 1000); return; }
    const voor = { x: Math.round(w0.player.x), y: Math.round(w0.player.y) };
    let res = null; const t1 = performance.now();
    RR.startMeerijden(w0, o, { x: dest.x, y: dest.y, name: dest.name }).then((r) => { res = r; });
    while (!res && performance.now() - t1 < 80000) { waarneem('rij'); await sleep(2000); }
    log('rit-eigen', { soort, naar, res, duurS: Math.round((performance.now() - t1) / 100) / 10, voor, na: { x: Math.round(w0.player.x), y: Math.round(w0.player.y) }, afstandDoel: Math.round(Math.hypot(w0.player.x - dest.x, w0.player.y - dest.y)) });
    while (performance.now() - t0 < s * 1000) { waarneem('na'); await sleep(2000); }
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

// extra fasen van de playtest-simulatie (scripts/coop/playtest.phases.js, alleen als de coördinator die voor dit bestand zet)
if (window.__coopPhases) Object.assign(PHASES, window.__coopPhases({ CFG, sleep, log, W, key, until, act, shot, esc, openSamen, closeMenu, imp, net, PHASES, panel, title, buttons, wizard }));

// ---------------------------------------------------------------- hoofdprogramma
try {
  startSampler();
  if (CFG.role !== 'host' && (CFG.program || []).some((p) => p[1] === 'qamensen')) { // samen-qa: de gast draagt iets anders dan de gastheer, zodat de kledingcode zichtbaar meereist
    try {
      const C = await imp('clothing'), D = await imp('clothingdata');
      const top = D.ITEMS.find((it) => it.slot === 'top' && it.colors.length > 1 && !Object.values(C.wornPieces('tammo')).some((p) => String(p).startsWith(it.id + '.')));
      const stuk = top ? top.id + '.' + top.colors[top.colors.length - 1] : null;
      if (stuk) { C.givePiece('tammo', stuk); C.wearPiece('tammo', stuk); }
      C.takeOffSlot('tammo', 'head');
      log('qa-kleding-gast', { stuk, code: C.localOutfitCode() });
    } catch (e) { log('qa-kleding-gast', { fout: e.message }); }
  }
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


