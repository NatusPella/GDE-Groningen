// Samen spelen (#95), getekend in de menustijl (de panelen van het startscherm).
// De logica en teksten staan in lobby.js (getest); dit bestand is DOM en de
// aanroepen naar de IPC-brug (net/ipctransport.js). Alleen bereikbaar via ?coop.
// Wordt ook gebruikt voor het wacht-scherm tijdens het spel (opts.start = 'verbroken').
// hooks: { actie, laatsteCode, start(modus), onSession(role, transport) -> session, enter(role),
//          onCode(code), disconnect(), resumed() }
// opts:  { start: 'verbroken', mode: 'host'|'gast', session }  (hervatten in het spel)
import { createLobby, reduce, view, MODES } from './lobby.js';
import { ipcTransport, onlineSupported } from './net/ipctransport.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountLobby(root, hooks, opts = {}) {
  const online = onlineSupported();
  const api = online ? window.gdeDesktop.coop : null;
  let state = createLobby({ online, actie: hooks.actie, laatsteCode: hooks.laatsteCode, start: opts.start, mode: opts.mode });
  let tr = null, entered = false;

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

  function newTransport() {
    if (tr) tr.dispose();
    tr = ipcTransport(api);
    return tr;
  }
  function watch(session, role) {
    session.onstatus = (st) => {
      set({ t: 'status', status: st, reason: session.rejected });
      if (st !== 'ok') return;
      if (opts.start) { if (hooks.resumed) hooks.resumed(); } else if (!entered && hooks.enter) { entered = true; hooks.enter(role); }
    };
  }

  async function startHost() {
    const t = opts.session ? (tr || newTransport()) : newTransport();
    const r = await api.host();
    if (!r.ok) return set({ t: 'fout', msg: r.text || 'De host kon niet starten.' });
    if (!opts.session) watch(hooks.onSession('host', t), 'host'); else watch(opts.session, 'host');
    set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'kies-alleen') set({ t: 'kies', mode: MODES.ALLEEN });
      else if (a === 'kies-lokaal') set({ t: 'kies', mode: MODES.LOKAAL });
      else if (a === 'kies-host') { set({ t: 'kies', mode: MODES.HOST }); if (state.step === 'host-maakt-code') await startHost(); }
      else if (a === 'kies-gast') set({ t: 'kies', mode: MODES.GAST });
      else if (a === 'start-alleen') hooks.start('alleen');
      else if (a === 'start-lokaal') hooks.start('lokaal');
      else if (a === 'koppel') {
        const code = input ? input.value : '';
        const t = newTransport();
        set({ t: 'verbinden' });
        const r = await api.join(code);
        if (!r.ok) { set({ t: 'kies', mode: MODES.GAST }); return set({ t: 'fout', msg: r.reason }); }
        if (hooks.onCode) hooks.onCode(code.trim());
        if (opts.session) { opts.session.reconnect(t); watch(opts.session, 'client'); } else watch(hooks.onSession('client', t), 'client');
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a === 'terug' || a === 'verbreek') {
        if (api) await api.stop();
        if (hooks.disconnect) hooks.disconnect(a, state.mode);
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
      } else if (a === 'hervat') {
        set({ t: 'hervat' });
        if (state.mode === MODES.HOST && api) await startHost();
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
  return { event: set, state: () => state, close() { if (tr) tr.dispose(); root.innerHTML = ''; } };
}
