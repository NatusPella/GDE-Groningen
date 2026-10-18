// Samen spelen (#95): het uitnodigscherm, getekend in de menustijl. De logica en
// teksten staan in lobby.js (getest); de routes in net/rtcroom.js, net/brokers.js
// en de IPC-brug (net/ipctransport.js, desktop/coopcore.cjs). Dit bestand is DOM en
// lijm; het is niet in beeld bekeken. Het wordt ook gebruikt voor het wacht-scherm
// tijdens het spel (opts.start = 'verbroken'). Alleen bereikbaar via ?coop.
//
// hooks: { startHost(transport) -> session, startClient(transport) -> session,
//          joined(rol), disconnect(act, rol), onCode(code), canJoin() -> {ok, reason}, laatsteCode }  (de tweede parameter van start* is de route)
// opts:  { start: 'verbroken', rol: 'host'|'gast', route, session }  (hervatten in het spel)
import { createLobby, reduce, view, ROLES, ROUTES } from './lobby.js';
import { ipcTransport, onlineSupported } from './net/ipctransport.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { MultiSignaler } from './net/brokers.js';
import * as CONFIG from './net/netconfig.js';
import { makeRoom, formatRoom } from './net/sigcrypto.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const newSignaler = () => new MultiSignaler(CONFIG, { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } },
  { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });

export function mountLobby(root, hooks, opts = {}) {
  const direct = onlineSupported();
  const api = direct ? window.gdeDesktop.coop : null;
  let state = createLobby({ direct, rtc: rtcSupported(), laatsteCode: hooks.laatsteCode, start: opts.start, rol: opts.rol });
  state.route = opts.route || null;
  let tr = null, handle = null, session = opts.session || null, joinedOnce = false;

  const set = (ev) => { state = reduce(state, ev); draw(); };

  function draw() {
    const v = view(state);
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(v.code)}</pre>` : '') +
      (v.input ? `<input class="coop-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(v.input.placeholder)}" value="${esc(v.input.value || '')}">` : '') +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="ss-item${b.primary ? ' ss-hero' : ''}" data-act="${b.act}"><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
  }

  function watch(sess, rol) {
    session = sess;
    sess.onstatus = (st) => {
      set({ t: 'status', status: st, reason: sess.rejected });
      if (st === 'ok' && !joinedOnce) { joinedOnce = true; if (hooks.joined) hooks.joined(rol); }
      if (st === 'ok' && opts.start && hooks.resumed) hooks.resumed();
    };
  }
  function cleanup() {
    if (handle && handle.cancel) handle.cancel();
    handle = null;
    if (api && state.route === ROUTES.DIRECT) api.stop();
  }

  // ----- host
  async function hostStart() {
    const resume = !!opts.session;
    if (state.route === ROUTES.DIRECT) {
      tr = ipcTransport(api);
      const r = await api.host();
      if (!r.ok) return set({ t: 'fout', msg: r.text || 'De host kon niet starten.' });
      if (resume) session.rebind(tr); else watch(hooks.startHost(tr, state.route), ROLES.HOST);
      if (resume) watch(session, ROLES.HOST);
      return set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
    }
    const room = makeRoom();
    handle = await hostRoom(room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') set({ t: 'fout', msg: info }); },
    });
    tr = handle.transport;
    if (resume) { session.rebind(tr); watch(session, ROLES.HOST); } else watch(hooks.startHost(tr, state.route), ROLES.HOST);
    set({ t: 'code', code: formatRoom(room) });
  }

  // ----- gast
  async function guestStart() {
    const inv = state.invoer;
    const kan = hooks.canJoin ? hooks.canJoin() : { ok: true };
    if (!kan.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: kan.reason }); }
    if (inv.route === ROUTES.DIRECT) {
      tr = ipcTransport(api);
      const r = await api.join(inv.code);
      if (!r.ok) { set({ t: 'kies', rol: ROLES.GAST }); return set({ t: 'fout', msg: r.reason }); }
      if (hooks.onCode) hooks.onCode(inv.code);
      if (opts.session) { opts.session.rebind(tr); watch(opts.session, ROLES.GAST); } else watch(hooks.startClient(tr, inv.route), ROLES.GAST);
      return;
    }
    handle = await joinRoom(inv.room, {
      signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
      onstate: (s, info) => { if (s === 'fout') { set({ t: 'kies', rol: ROLES.GAST }); set({ t: 'fout', msg: info }); } },
    });
    if (hooks.onCode) hooks.onCode(inv.room.slice(0, 5) + '-' + inv.room.slice(5));
    handle.opened.then((t) => {
      tr = t;
      if (opts.session) { opts.session.rebind(t); watch(opts.session, ROLES.GAST); } else watch(hooks.startClient(t, inv.route), ROLES.GAST);
    }).catch((e) => set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' }));
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'kies-host') set({ t: 'kies', rol: ROLES.HOST });
      else if (a === 'kies-gast') set({ t: 'kies', rol: ROLES.GAST });
      else if (a === 'route-kamer') set({ t: 'route', route: ROUTES.KAMER });
      else if (a === 'route-direct') set({ t: 'route', route: ROUTES.DIRECT });
      else if (a === 'koppel') set({ t: 'invoer', text: input ? input.value : '' });
      else if (a === 'akkoord') {
        set({ t: 'akkoord' });
        if (state.step === 'host-maakt-code') await hostStart();
        else if (state.step === 'verbinden') await guestStart();
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a === 'terug' || a === 'verbreek') {
        cleanup();
        if (hooks.disconnect) hooks.disconnect(a, state.rol);
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
      } else if (a === 'hervat') {
        set({ t: 'hervat' }); // opnieuw uitwisselen met hetzelfde token; toestemming blijft van kracht binnen deze sessie
        if (state.rol === ROLES.HOST) { set({ t: 'akkoord' }); } // geen tweede vraag: dezelfde toestemming
        if (state.step === 'host-maakt-code') await hostStart();
      }
    } catch (e) {
      set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' });
    }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b && root.contains(b)) act(b.dataset.act);
  });
  draw();
  return { event: set, state: () => state, close() { cleanup(); root.innerHTML = ''; } };
}
