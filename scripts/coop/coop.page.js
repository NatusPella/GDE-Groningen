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
const log = (type, data = {}) => console.log('[bot-log] ' + JSON.stringify({ t: Math.round(performance.now() - t0) / 1000, type, who: CFG.name, ...data }));
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
    if (!(W() || {}).paused) break;
    const resume = [...document.querySelectorAll('#pause-menu [data-action="resume"]')].find((b) => b.offsetParent);
    if (resume) resume.click();
    else { const ov = document.querySelector('#pause-menu .ra[data-goto="overzicht"]'); if (ov && ov.getAttribute('aria-current') !== 'true') ov.click(); else await esc(); }
    await sleep(900);
  }
  log('menu-dicht', { paused: !!(W() || {}).paused, startScherm: !!document.querySelector('#start-screen.visible'), pauzemenu: !!document.querySelector('#pause-menu.visible'), body: document.body.className });
};

// ---- wat deze instantie ziet (elke seconde)
let state = { allIn: false, phase: '' };
function sampleNow(n) {
  const x = W(); if (!x) return null;
  const b = (o) => (o ? { x: Math.round(o.x * 10) / 10, y: Math.round(o.y * 10) / 10, char: o.character || '' } : null);
  const net = x.coopNet, ses = net && net.session;
  const hm = x.coopHostMissie;
  const cine = document.getElementById('cine');
  return {
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
    hostEnt: x.coopHost ? [x.coopHost.voertuigen.length, x.coopHost.doelen.length, (x.coopHost.voetgangers || []).length] : null,
    veh: x.player && x.player.inVehicle ? 1 : 0, vehC: x.companion && x.companion.inVehicle ? 1 : 0, nVeh: (x.vehicles || []).length,
    cutscene: !!(cine && cine.classList.contains('on')), camOver: !!x.cameraOverride,
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
    it.click();
    let skipping = true;
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
    await act('kies-host');
    log('scherm', { titel: title(), knoppen: buttons() });
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
    await until(() => title() === 'Je speelt samen', CFG.waitS ? CFG.waitS * 1000 : 120000, 'een gast');
  } else {
    await act('kies-gast');
    const input = await until(() => panel().querySelector('.coop-input'), 5000, 'invoerveld');
    input.value = CFG.code; input.dispatchEvent(new Event('input', { bubbles: true }));
    await act('koppel');
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 600), knoppen: buttons(), net: netNow() });
    await sleep(CFG.consentWaitMs || 2500);
    log('toestemming-wacht', { net: netNow() });
    await act('akkoord');
    await until(() => title() === 'Je speelt samen', 90000, 'verbinding met de host');
  }
  log('verbonden', { titel: title(), tekst: panel().innerText.slice(0, 600), net: netNow() });
  await sleep(1500); // de fade van het binnenkomen is dan voorbij
  shot('lobby-verbonden');
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
    await sleep((s - 1) * 1000);
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
  // spelen: de eigen figuur loopt een rondje met de stick; kijk of de host hem volgt
  async loop({ s = 12 }) {
    const B = window.__bot; if (!B) { await sleep(s * 1000); return; }
    const x0 = W().player.x, y0 = W().player.y;
    const end = performance.now() + s * 1000; let k = 0;
    while (performance.now() < end) { const a = (k++ / 20) * Math.PI * 2 / 3; B.stick(Math.cos(a), Math.sin(a)); await sleep(100); }
    B.stick(0, 0);
    log('gelopen', { van: [Math.round(x0), Math.round(y0)], naar: [Math.round(W().player.x), Math.round(W().player.y)] });
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
    if (CFG.role !== 'host') { await sleep(s * 1000); return; }
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
      await sleep(3500);
      const x = W();
      log('filmpje-gast', { sc: x.coopScene || null, sceneEl: !!document.getElementById('coop-scene'), input: x.coopNet && x.coopNet.session ? [x.coopNet.session.pendingInput.mx, x.coopNet.session.pendingInput.my] : null });
      shot('filmpje-gast');
      await sleep((s - 3.5) * 1000 + 2500);
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
    const chip = document.querySelector('.coop-chip');
    log('menushot', { chip: !!chip, chipZichtbaar: !!chip && getComputedStyle(chip).visibility !== 'hidden' });
    shot('g-pauzemenu');
    await sleep(500); await closeMenu();
  },
  // opnieuw aansluiten na het verlaten, via het pauzemenu en de lobby (dezelfde code), zoals een speler
  async opnieuw() {
    if (net()) { log('opnieuw-al-verbonden', {}); return; }
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
