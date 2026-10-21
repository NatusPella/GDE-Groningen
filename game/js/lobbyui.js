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
import { createLobby, reduce, view, ROLES, ROUTES } from './lobby.js';
import { ipcTransport, listenForGuests, onlineSupported } from './net/ipctransport.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { MultiSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom, formatRoom } from './net/sigcrypto.js';
import { lijst as rosterLijst, charInfo } from './coopplayers.js';
import { meet, beoordeel, foutrapport, verbindingslog } from './net/diagnose.js';
import { maakEnv } from './net/diagnoseenv.js';
import { VERSION } from './version.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });

export function mountLobby(root, hooks, opts = {}) {
  const direct = onlineSupported();
  const api = direct ? window.gdeDesktop.coop : null;
  let state = createLobby({ direct, rtc: rtcSupported(), laatsteCode: hooks.laatsteCode, versie: VERSION, opslaan: !!(typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.saveTextFile), start: opts.start, rol: opts.rol, keuze: opts.keuze, holdNaam: opts.holdNaam, startGate: opts.startGate, spelNaam: opts.spelNaam });
  state.route = opts.route || null;
  if (opts.holdSlot != null) state = reduce(state, { t: 'hold', slot: opts.holdSlot, naam: opts.holdNaam });
  let lastDiag = null;
  let hub = opts.hub || null, session = opts.session || null, handle = null, room = null, stopListen = null, joinedOnce = false, wacht = false;

  const LOGT = { kies: 'rol gekozen', route: 'route gekozen', akkoord: 'toestemming gegeven', code: 'code gemaakt', fout: 'fout', status: 'status', verbinden: 'verbinden', hervat: 'opnieuw verbinden', verbreek: 'verbroken door speler', spelers: 'spelerslijst' };
  // Automatisch herstel (kamercode-route, wachtscherm in het spel): de gastheer zet na een paar seconden zelf een nieuw aanbod klaar onder
  // dezelfde kamercode, de gast voert die code zelf opnieuw in; beide met hetzelfde token, dus dezelfde plek. Een paar pogingen, daarna handmatig.
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
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(v.code)}</pre>` : '') +
      (v.input ? `<input class="coop-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(v.input.placeholder)}" value="${esc(v.input.value || '')}">` : '') +
      wensen +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="${b.primary ? 'm-bp' : 'm-bg'} coop-btn" data-act="${b.act}"${b.disabled ? ' disabled aria-disabled="true"' : ''}><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
  }

  // ----- host
  function onRoster(roster) {
    set({ t: 'spelers', lijst: rosterLijst(roster), max: roster.max });
    if (opts.start && opts.holdSlot != null) { // wacht-scherm: klaar zodra die speler weer meedoet
      const p = roster.spelers.find((x) => x.slot === opts.holdSlot);
      if (p && p.verbinding === 'ok' && hooks.resumed) hooks.resumed();
    }
    if (!joinedOnce && roster.spelers.length > 1) { joinedOnce = true; if (hooks.joined) hooks.joined(ROLES.HOST); }
    if (hub && hub.vrijePlekken && !wacht && state.route === ROUTES.KAMER && !opts.start) openRoom().catch((e) => set({ t: 'fout', msg: e.message }));
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

  // ----- gast
  const nameOf = (char) => (charInfo(char) || {}).naam || '?';
  function watch(sess) {
    session = sess;
    sess.onstatus = (st) => {
      set({ t: 'status', status: st, reason: sess.rejected, ander: sess.remoteVersion, partner: { slot: sess.slot } });
      if (st === 'ok') {
        if (!sess.lijstGezien && sess.welcome && Array.isArray(sess.welcome.lijst)) set({ t: 'spelers', lijst: sess.welcome.lijst, max: sess.welcome.max });
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
      if (b && b.k === 'spelers' && Array.isArray(b.lijst)) sess.lijstGezien = true; if (b && b.k === 'spelers' && Array.isArray(b.lijst)) set({ t: 'spelers', lijst: b.lijst.map((x) => ({ ...x, naam: nameOf(x.char) })), max: b.max }); if (prev) prev(b); };
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
      return bind(tr);
    }
    handle = await joinRoom(inv.room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') { set({ t: 'kies', rol: ROLES.GAST }); set({ t: 'fout', msg: info }); } },
    });
    if (hooks.onCode) hooks.onCode(inv.room.slice(0, 5) + '-' + inv.room.slice(5));
    handle.opened.then(bind).catch((e) => set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' }));
  }

  function cleanup() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    autoTries = AUTO_MAX; // na sluiten geen pogingen meer
    if (handle && handle.cancel) handle.cancel();
    handle = null; wacht = false;
    if (stopListen) { stopListen(); stopListen = null; }
    if (api && state.route === ROUTES.DIRECT && !opts.start) api.stop();
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'start-spel') { if (hooks.startSpel) hooks.startSpel(); }
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
      else if (a === 'koppel') set({ t: 'invoer', text: input ? input.value : '' });
      else if (a === 'akkoord') {
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

  if (hub && opts.start) { const prev = hub.onchange; hub.onchange = (r) => { if (prev) prev(r); onRoster(r); }; }
  if (session && opts.start) watch(session); // wachtscherm van een gast: zodra de verbinding van zelf terugkomt (zelfde token), sluit het scherm
  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b && root.contains(b)) act(b.dataset.act);
  });
  draw();
  if (state.step === 'verbroken') planAuto(AUTO_EERSTE);
  return { event: set, state: () => state, close() { cleanup(); root.innerHTML = ''; } };
}
