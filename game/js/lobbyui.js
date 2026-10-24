// Samen spelen (#95): het uitnodigscherm voor N spelers, getekend in de menustijl. De
// logica en teksten staan in lobby.js (getest); de routes in net/rtcroom.js, net/brokers.js
// en de IPC-brug (net/ipctransport.js, desktop/coopcore.cjs); de spelers in net/hub.js.
// Dit bestand is DOM en lijm; het is niet in beeld bekeken. Het wordt ook gebruikt voor het
// wacht-scherm tijdens het spel (opts.start = 'verbroken'). Alleen bereikbaar via ?coop.
//
// De host houdt de uitnodiging open zolang er plek is: na elke gast die verbindt, wordt er een
// nieuw aanbod klaargezet onder dezelfde kamercode (of luistert de TCP-poort verder).
//
// hooks: { startHost(route, onChange) -> hub, addGuest(transport), startClient(transport, route, wens) -> session,
//          setMax(n), kick(slot), joined(rol), disconnect(act, rol, slot), onCode(code), canJoin() -> {ok, reason}, laatsteCode, resumed() }
// opts:  { start: 'verbroken', rol, route, session (gast), hub (host), holdSlot, holdNaam }  (hervatten in het spel)
//        { adopt: { code, route }, rol, session | hub }  (de sessie loopt al: na het overdragen van het spel kent het paneel rol, kamercode en spelers)
import { createLobby, reduce, view, profielNaam, ROLES, ROUTES } from './lobby.js';
import { getSettings, setSetting } from './settings.js';
import { ipcTransport, listenForGuests, onlineSupported } from './net/ipctransport.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { MultiSignaler, LijstSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom, formatRoom, topicFor } from './net/sigcrypto.js';
import { LIJST, Serverlijst, maakAankondiger, maakId } from './net/serverlijst.js';
import { PROTO } from './net/protocol.js';
import { lijst as rosterLijst, charInfo } from './coopplayers.js';
import { meet, beoordeel, foutrapport, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';
import { VERSION } from './version.js';

const newLijstSignaler = () => new LijstSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } }, { brokerTimeout: CONFIG.TIMEOUTS.broker, interval: LIJST.interval });
const rnd = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; } catch (e) { return Math.random(); } };
// Gemelde sessies (#438) blijven op dit apparaat verborgen: alleen id's, hoogstens 50, en nooit stuk als de opslag ontbreekt
const VERBORGEN_SLEUTEL = 'gde-serverlijst-verborgen';
const leesVerborgen = () => { try { const a = JSON.parse(localStorage.getItem(VERBORGEN_SLEUTEL) || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(-50) : []; } catch (e) { return []; } };
const schrijfVerborgen = (ids) => { try { localStorage.setItem(VERBORGEN_SLEUTEL, JSON.stringify(ids.slice(-50))); } catch (e) { /* geen opslag: dan alleen in dit scherm */ } };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });

export function mountLobby(root, hooks, opts = {}) {
  const direct = onlineSupported();
  const api = direct ? window.gdeDesktop.coop : null;
  const prof = getSettings(); // online-avatar (#455): per apparaat bewaard
  let state = createLobby({ direct, rtc: rtcSupported(), laatsteCode: hooks.laatsteCode, versie: VERSION, lijst: !!opts.lijst, opslaan: !!(typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.saveTextFile), start: opts.start, rol: opts.rol, keuze: opts.keuze, holdNaam: opts.holdNaam, startGate: opts.startGate, spelNaam: opts.spelNaam, onlineNaam: prof.onlineNaam, onlineKleur: prof.onlineKleur });
  state.route = opts.route || null;
  if (opts.holdSlot != null) state = reduce(state, { t: 'hold', slot: opts.holdSlot, naam: opts.holdNaam });
  if (opts.adopt) { // de sessie loopt al (coophostwisselnet.js wisselde hem om): geen beginscherm, wel de kamercode, de spelers en Iedereen stoppen of Spel verlaten
    const host = opts.rol === ROLES.HOST, bron = host ? opts.hub : opts.session;
    const lijst = host ? (bron && bron.roster ? rosterLijst(bron.roster) : []) : (bron && bron.welcome && Array.isArray(bron.welcome.lijst) ? bron.welcome.lijst : []);
    const max = host ? (bron && bron.roster ? bron.roster.max : 0) : (bron && bron.welcome ? bron.welcome.max : 0);
    state = reduce(state, { t: 'adopteer', rol: opts.rol, route: opts.adopt.route, code: opts.adopt.code, lijst, max, slot: host ? 0 : bron && bron.slot });
  }
  let lastDiag = null;
  let hub = opts.hub || null, session = opts.session || null, handle = null, room = null, stopListen = null, joinedOnce = !!opts.adopt, wacht = false;

  const LOGT = { kies: 'rol gekozen', route: 'route gekozen', akkoord: 'toestemming gegeven', code: 'code gemaakt', fout: 'fout', status: 'status', verbinden: 'verbinden', hervat: 'opnieuw verbinden', verbreek: 'verbroken door speler', spelers: 'spelerslijst', 'openbaar-ja': 'sessie openbaar gemaakt', privaat: 'sessie weer privé', 'lijst-go': 'lijst met openbare sessies geopend' };
  // Automatisch herstel (kamercode-route, wachtscherm in het spel): de gastheer zet na een paar seconden zelf een nieuw aanbod klaar onder
  // dezelfde kamercode, de gast voert die code zelf opnieuw in; beide met hetzelfde token, dus dezelfde plek. Een paar pogingen, daarna handmatig.
  let aankondiger = null, luis = null;
  let autoTimer = null, autoTries = 0;
  const AUTO = { eerste: 3000, tussen: 20000, max: 5, ...(opts.auto || {}) };
  const AUTO_EERSTE = AUTO.eerste, AUTO_TUSSEN = AUTO.tussen, AUTO_MAX = AUTO.max;
  function planAuto(ms) {
    if (autoTimer || !opts.start || state.route !== ROUTES.KAMER || autoTries >= AUTO_MAX) return;
    autoTimer = setTimeout(async () => {
      autoTimer = null;
      if (state.step === 'verbonden' || autoTries >= AUTO_MAX) return;
      autoTries++; verbindingslog.add('herstel', `automatische poging ${autoTries}`);
      try {
        if (state.rol === ROLES.HOST) {
          if (state.step === 'verbroken') await act('hervat');
          else if (state.step === 'host-maakt-code') await hostStart();
        } else {
          const code = hooks.laatsteCode || state.caps.laatsteCode;
          if (state.step === 'verbroken') set({ t: 'hervat' });
          if (state.step === 'gast-typt' && code) { set({ t: 'invoer', text: code }); if (state.step === 'toestemming') { set({ t: 'akkoord' }); await guestStart(); } }
        }
      } catch (e) { verbindingslog.add('herstel', 'poging mislukt'); }
      if (state.step !== 'verbonden') planAuto(AUTO_TUSSEN);
    }, ms);
  }
  const set = (ev) => {
    const was = state.step;
    state = reduce(state, ev);
    if (luis && state.step !== 'lijst') stopLuisteren(); // de lijst wordt alleen opgehaald zolang je hem bekijkt
    if (aankondiger && !state.openbaar) stopAankondiging(); // en een sessie staat alleen in de lijst zolang dit scherm hem openbaar houdt
    if (state.step === 'verbroken' && was !== 'verbroken') planAuto(AUTO_EERSTE);
    if (state.step === 'verbonden') autoTries = 0;
    if (LOGT[ev.t]) verbindingslog.add(LOGT[ev.t], ev.t === 'fout' ? ev.msg : ev.t === 'status' ? `${ev.status}${ev.reason ? ' (' + ev.reason + ')' : ''}` : ev.t === 'route' || ev.t === 'kies' ? String(ev.route || ev.rol) : ev.t === 'spelers' ? `${(ev.lijst || []).length} spelers` : '');
    draw();
  };
  async function diagnose() {
    set({ t: 'diag-go' });
    verbindingslog.add('diagnose', 'gestart');
    let beoordeling = null;
    try { const ms = opts.diagMs || 6000;
      beoordeling = beoordeel(await meet(maakEnv({ api, ms }), { limiet: ms * 3 })); } catch (e) { verbindingslog.add('diagnose', 'mislukt'); }
    if (beoordeling) verbindingslog.add('diagnose', beoordeling.items.map((i) => `${i.id}=${i.status}`).join(' '));
    lastDiag = beoordeling;
    set({ t: 'diag-klaar', beoordeling });
  }
  const rapportTekst = () => foutrapport({ beoordeling: lastDiag, log: verbindingslog, versie: VERSION, platform: typeof navigator !== 'undefined' ? navigator.platform : '', stand: `${state.rol || '-'} / ${state.route || '-'} / ${state.step}` });

  function draw() {
    const v = view(state);
    const wensen = v.wensen ? `<div class="coop-wensen" role="group" aria-label="Kies een figuur">${v.wensen.map((w) => `<button type="button" class="m-bg coop-wens" data-act="${w.act}" aria-pressed="${w.gekozen}"><span class="ss-label"><span style="color:${w.kleur}" aria-hidden="true">●</span> ${esc(w.naam)}${w.gekozen ? ' ✓' : ''}</span></button>`).join('')}</div>` : '';
    const sessies = v.sessies ? `<div class="coop-sessies" role="list">${v.sessies.map((x) => `<div class="coop-sessie" role="listitem" style="display:flex;gap:8px;align-items:stretch;margin:6px 0"><button type="button" class="${x.kan ? 'm-bp' : 'm-bg'} coop-btn" data-act="${x.act}" style="flex:1;text-align:left"${x.kan ? '' : ' aria-disabled="true"'}><span class="ss-label">${esc(x.tekst)}</span></button><button type="button" class="m-bt coop-btn" data-act="${x.meld}" aria-label="Melden: ${esc(x.naam)}"><span class="ss-label">Melden</span></button></div>`).join('')}</div>` : '';
    // het kleine formulier voor je online-avatar (#455): naam (hoogstens 16 tekens) en een kleur uit de vaste set
    const prof = v.profiel ? `<div class="coop-profiel" style="display:flex;flex-direction:column;gap:8px;margin:10px 0"><label class="coop-profiel-label" style="display:flex;gap:8px;align-items:center"><span>Online naam</span><input class="coop-profiel-naam" type="text" spellcheck="false" autocomplete="off" maxlength="${v.profiel.maxLength}" placeholder="Je figuur" value="${esc(v.profiel.naam)}" style="min-width:0;flex:1;max-width:260px"></label><div class="coop-kleuren" role="group" aria-label="Kleur" style="display:flex;flex-wrap:wrap;gap:6px">${v.profiel.kleuren.map((c) => `<button type="button" class="m-bg coop-kleur" data-kleur="${c.hex}" aria-pressed="${c.hex === v.profiel.kleur}" title="${esc(c.naam)}"><span class="ss-label"><span style="color:${c.hex}" aria-hidden="true">●</span> ${esc(c.naam)}</span></button>`).join('')}</div><p class="coop-profiel-hint" style="margin:0">${esc(v.profiel.tekst)} Laat je de naam leeg, dan zie je de naam van je figuur.</p>${v.profiel.fout ? `<p class="coop-error" role="alert">${esc(v.profiel.fout)}</p>` : ''}</div>` : '';
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      prof +
      sessies +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(v.code)}</pre>` : '') +
      (v.input ? `<input class="coop-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(v.input.placeholder)}"${v.input.maxLength ? ` maxlength="${v.input.maxLength}"` : ''} value="${esc(v.input.value || '')}">` : '') +
      wensen +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="${b.primary ? 'm-bp' : 'm-bg'} coop-btn" data-act="${b.act}"${b.disabled ? ' disabled aria-disabled="true"' : ''}><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
  }

  // ----- online-avatar (#455): het formulier bewaren in de gewone instellingen
  function bewaarProfiel() {
    const invoer = root.querySelector('.coop-profiel-naam');
    state = reduce(state, { t: 'profiel', naam: invoer ? invoer.value : state.profiel.naam });
    state = reduce(state, { t: 'profiel-klaar' });
    if (!state.profielFout) { setSetting('onlineNaam', state.profiel.naam); setSetting('onlineKleur', state.profiel.kleur); }
    draw();
    return !state.profielFout;
  }

  // ----- host
  function onRoster(roster) {
    set({ t: 'spelers', lijst: rosterLijst(roster), max: roster.max });
    if (opts.start && opts.holdSlot != null) { // wacht-scherm: klaar zodra die speler weer meedoet
      const p = roster.spelers.find((x) => x.slot === opts.holdSlot);
      if (p && p.verbinding === 'ok' && hooks.resumed) hooks.resumed();
    }
    if (!joinedOnce && roster.spelers.length > 1) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.HOST); }
    if (hub && hub.vrijePlekken && !wacht && state.route === ROUTES.KAMER && !opts.start && !opts.adopt) openRoom().catch((e) => set({ t: 'fout', msg: e.message }));
  }
  function ensureHub() {
    if (hub) return hub;
    hub = hooks.startHost(state.route, onRoster);
    return hub;
  }
  async function openRoom() { // een aanbod voor de eerstvolgende gast, onder dezelfde kamercode
    wacht = true;
    if (handle && handle.cancel) handle.cancel();
    room = room || makeRoom();
    handle = await hostRoom(room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => {
        if (s === 'fout') { wacht = false; set({ t: 'fout', msg: info }); }
        if (s === 'open') { wacht = false; if (hub && hub.vrijePlekken) openRoom().catch((e) => set({ t: 'fout', msg: e.message })); }
      },
    });
    hooks.addGuest(handle.transport);
    set({ t: 'code', code: formatRoom(room) });
    if (hub) set({ t: 'spelers', lijst: rosterLijst(hub.roster), max: hub.roster.max });
  }
  async function hostStart() {
    ensureHub();
    if (state.route === ROUTES.DIRECT) {
      if (stopListen) stopListen();
      stopListen = listenForGuests(api, (tr) => hooks.addGuest(tr));
      const r = await api.host(hub.roster.max);
      if (!r.ok) return set({ t: 'fout', msg: r.text || 'Het spel openen lukte niet.' });
      return set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
    }
    await openRoom();
  }

  // ----- openbare sessie (#438): de host kondigt elke 15 s aan zolang dit scherm de sessie openbaar houdt
  async function startAankondiging() {
    stopAankondiging();
    if (!room) return;
    const sig = newLijstSignaler();
    aankondiger = sig;
    const maak = maakAankondiger({ naam: state.openbaarNaam, versie: VERSION, proto: PROTO, room: () => room, id: maakId(rnd),
      hub: () => (hub && hub.roster ? { spelers: Math.max(1, hub.roster.spelers.length), max: hub.roster.max } : null) });
    const topic = await topicFor(LIJST.sleutel);
    if (aankondiger === sig) sig.kondig(topic, maak); // intussen weer privé gemaakt: niets plaatsen
  }
  function stopAankondiging() { const s = aankondiger; aankondiger = null; if (s) { try { s.close(); } catch (e) { /* weg */ } } }
  // Weer privé: de oude kamercode is openbaar geweest en werkt niet meer; wie nog kan aansluiten krijgt een nieuwe
  async function nieuweKamer() {
    room = null; wacht = false;
    if (handle && handle.cancel) handle.cancel();
    handle = null;
    if (hub && hub.vrijePlekken) await openRoom();
  }

  // ----- de lijst met openbare sessies bekijken (#438)
  async function startLuisteren() {
    stopLuisteren();
    const sig = newLijstSignaler(), lijst = new Serverlijst({ proto: PROTO, versie: VERSION, verborgen: leesVerborgen() });
    const l = { sig, lijst, timer: null, laatste: '' };
    luis = l;
    const topic = await topicFor(LIJST.sleutel);
    if (luis !== l) return; // intussen terug: niet verbinden
    sig.luister(topic, (tekst) => lijst.ontvang(tekst));
    const tik = () => {
      if (luis !== l || state.step !== 'lijst') return;
      const nu = lijst.lijst(), json = JSON.stringify(nu);
      if (json !== l.laatste) { l.laatste = json; set({ t: 'lijst-data', lijst: nu }); }
      if (sig.alleFout() && !state.error) set({ t: 'fout', msg: 'Er is geen verbinding met de openbare servers. Controleer je internet en probeer het later opnieuw.' });
    };
    l.timer = setInterval(tik, opts.lijstMs || 2000);
    setTimeout(tik, 400);
  }
  function stopLuisteren() { const l = luis; luis = null; if (l) { clearInterval(l.timer); try { l.sig.close(); } catch (e) { /* weg */ } } }

  // ----- gast
  const nameOf = (char) => (charInfo(char) || {}).naam || '?';
  const naamVan = (p) => (p && p.avatar && p.avatar.naam) || nameOf(p && p.char); // (#455) de online-avatar gaat voor de figuur
  function watch(sess) {
    session = sess;
    sess.onstatus = (st) => {
      set({ t: 'status', status: st, reason: sess.rejected, ander: sess.remoteVersion, partner: { slot: sess.slot } });
      if (st === 'ok') {
        if (!sess.lijstGezien && sess.welcome && Array.isArray(sess.welcome.lijst)) set({ t: 'spelers', lijst: sess.welcome.lijst.map((x) => ({ ...x, naam: naamVan(x) })), max: sess.welcome.max });
        if (!joinedOnce) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.GAST); }
        if (opts.start && hooks.resumed) hooks.resumed();
      }
    };
    const prev = sess.onevent;
    sess.onevent = (b) => {
      if (b && b.k === 'hek') { // de gastheer start het spel (of er was geen wachtkamer): de wachtkamer van de gast sluit
        const was = state.caps.startGate; set({ t: 'gate', aan: !!b.aan });
        if (was && !b.aan && hooks.startSpel) hooks.startSpel();
      }
      if (b && b.k === 'spelers' && Array.isArray(b.lijst)) sess.lijstGezien = true; if (b && b.k === 'spelers' && Array.isArray(b.lijst)) set({ t: 'spelers', lijst: b.lijst.map((x) => ({ ...x, naam: naamVan(x) })), max: b.max }); if (prev) prev(b); };
  }

  async function guestStart() {
    const inv = state.invoer;
    const kan = hooks.canJoin ? hooks.canJoin() : { ok: true };
    if (!kan.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: kan.reason }); }
    const bind = (tr) => { if (opts.session) { opts.session.rebind(tr); watch(opts.session); } else watch(hooks.startClient(tr, inv.route, state.wens)); };
    if (inv.route === ROUTES.DIRECT) {
      const tr = ipcTransport(api, 0);
      const r = await api.join(inv.code);
      if (!r.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: r.reason }); }
      if (hooks.onCode) hooks.onCode(inv.code);
      set({ t: 'laatste-code', code: inv.code });
      return bind(tr);
    }
    handle = await joinRoom(inv.room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') { set({ t: 'kies', rol: ROLES.GAST }); set({ t: 'fout', msg: info }); } },
    });
    if (hooks.onCode) hooks.onCode(inv.room.slice(0, 5) + '-' + inv.room.slice(5));
    set({ t: 'laatste-code', code: inv.room.slice(0, 5) + '-' + inv.room.slice(5) }); // wordt de gast eruit gezet, dan staat de code klaar om opnieuw aan te sluiten
    handle.opened.then(bind).catch((e) => set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' }));
  }

  function cleanup() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    autoTries = AUTO_MAX; // na sluiten geen pogingen meer
    if (handle && handle.cancel) handle.cancel();
    handle = null; wacht = false;
    stopAankondiging(); stopLuisteren();
    if (stopListen) { stopListen(); stopListen = null; }
    if (api && state.route === ROUTES.DIRECT && !opts.start && !opts.adopt) api.stop();
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'start-spel') { if (hooks.startSpel) hooks.startSpel(); if (state.rol === ROLES.HOST) set({ t: 'gate', aan: false }); } // het spel loopt: Spel starten verdwijnt (#434)
      else if (a === 'openbaar') set({ t: 'openbaar-vraag' });
      else if (a === 'openbaar-ja') { set({ t: 'openbaar-ja', naam: input ? input.value : '' }); if (state.openbaar) await startAankondiging(); }
      else if (a === 'openbaar-terug') set({ t: 'openbaar-terug' });
      else if (a === 'privaat') { set({ t: 'privaat' }); await nieuweKamer(); }
      else if (a === 'lijst') set({ t: 'lijst-vraag' });
      else if (a === 'lijst-go') { set({ t: 'lijst-go' }); await startLuisteren(); }
      else if (a === 'lijst-terug') set({ t: 'lijst-terug' });
      else if (a.startsWith('sluit-')) set({ t: 'lijst-kies', i: +a.slice(6) });
      else if (a.startsWith('meld-')) {
        const e = state.lijst[+a.slice(5)];
        if (e && luis) { schrijfVerborgen(luis.lijst.meld(e.id)); luis.laatste = ''; set({ t: 'lijst-data', lijst: luis.lijst.lijst() }); }
      }
      else if (a === 'diag') set({ t: 'diag' });
      else if (a === 'diag-go') await diagnose();
      else if (a === 'diag-terug') set({ t: 'diag-terug' });
      else if (a === 'rapport') { if (navigator.clipboard) await navigator.clipboard.writeText(rapportTekst()); verbindingslog.add('rapport', 'gekopieerd'); set({ t: 'fout', msg: 'Het rapport is gekopieerd. Plak het in een bericht.' }); }
      else if (a === 'logbestand') { const d = window.gdeDesktop; if (d && d.saveTextFile) await d.saveTextFile('GDE-verbindingsrapport.txt', rapportTekst()); }
      else if (a === 'kies-host') set({ t: 'kies', rol: ROLES.HOST });
      else if (a === 'kies-gast') set({ t: 'kies', rol: ROLES.GAST });
      else if (a === 'route-kamer') set({ t: 'route', route: ROUTES.KAMER });
      else if (a === 'route-direct') set({ t: 'route', route: ROUTES.DIRECT });
      else if (a.startsWith('wens-')) set({ t: 'wens', char: a.slice(5) });
      else if (a === 'koppel') { bewaarProfiel(); set({ t: 'invoer', text: input ? input.value : '' }); }
      else if (a === 'akkoord') {
        bewaarProfiel(); // de avatar die anderen straks zien (#455), vóór de verbinding
        set({ t: 'akkoord' });
        if (state.step === 'host-maakt-code') await hostStart();
        else if (state.step === 'verbinden') await guestStart();
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a.startsWith('kick-')) {
        if (hooks.kick) hooks.kick(+a.slice(5));
      } else if (a.startsWith('max-')) {
        const gekozen = hooks.setMax ? hooks.setMax(+a.slice(4)) : +a.slice(4);
        if (api && state.route === ROUTES.DIRECT) api.setMax(gekozen);
        if (hub && state.route === ROUTES.KAMER) onRoster(hub.roster);
      } else if (a === 'terug' || a === 'verbreek') {
        // eerst netjes afmelden (BYE naar de anderen), dan pas de verbinding en de poort sluiten: andersom komt het afmelden nooit aan en houdt de host de plek nog tot de pauze
        if (hooks.disconnect) hooks.disconnect(a, state.rol, opts.holdSlot);
        cleanup();
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
      } else if (a === 'hervat') {
        set({ t: 'hervat' }); // opnieuw uitwisselen; de terugkerende speler vindt zijn plek via zijn token
        if (state.step === 'host-maakt-code') await hostStart();
      }
    } catch (e) {
      set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' });
    }
  }

  if (hub && (opts.start || opts.adopt)) { const prev = hub.onchange; hub.onchange = (r) => { if (prev) prev(r); onRoster(r); }; }
  if (session && (opts.start || opts.adopt)) watch(session); // wachtscherm van een gast: zodra de verbinding van zelf terugkomt (zelfde token), sluit het scherm
  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b && root.contains(b)) act(b.dataset.act);
    const k = e.target.closest && e.target.closest('[data-kleur]');
    if (k && k.dataset && k.dataset.kleur && root.contains(k)) { set({ t: 'profiel', kleur: k.dataset.kleur }); bewaarProfiel(); } // een kleur meteen bewaren
  });
  root.addEventListener('input', (e) => { // tijdens het typen geen nieuwe tekening: anders raakt het veld zijn focus kwijt
    if (e.target && e.target.classList && e.target.classList.contains('coop-profiel-naam')) state = reduce(state, { t: 'profiel', naam: e.target.value });
  });
  root.addEventListener('change', (e) => { if (e.target && e.target.classList && e.target.classList.contains('coop-profiel-naam')) bewaarProfiel(); });
  draw();
  if (state.step === 'verbroken') planAuto(AUTO_EERSTE);
  return { event: set, state: () => state, close() { cleanup(); root.innerHTML = ''; } };
}
