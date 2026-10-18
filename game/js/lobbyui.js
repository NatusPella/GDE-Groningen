// Coöp-lobby (#95), getekend in de menustijl (de panelen van het startscherm).
// De logica en teksten staan in lobby.js (getest); dit bestand is DOM en de
// aanroepen naar de IPC-brug (net/ipctransport.js). Alleen bereikbaar via ?coop.
// hooks: { startLocal(src), onSession(role, transport, src) -> session, enter(role, src), disconnect(), hasCoopSave, hasSoloSave }
import { createLobby, reduce, view, MODES } from './lobby.js';
import { ipcTransport, onlineSupported } from './net/ipctransport.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountLobby(root, hooks) {
  const online = onlineSupported();
  const api = online ? window.gdeDesktop.coop : null;
  let state = createLobby({ online, hasCoopSave: !!hooks.hasCoopSave, hasSoloSave: !!hooks.hasSoloSave });
  let tr = null;

  const set = (ev) => { state = reduce(state, ev); draw(); };

  function draw() {
    const v = view(state);
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(v.code)}</pre>` : '') +
      (v.input ? `<input class="coop-input" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(v.input.placeholder)}">` : '') +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="ss-item${b.primary ? ' ss-hero' : ''}" data-act="${b.act}"><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
  }

  function newTransport() {
    if (tr) { tr.dispose(); }
    tr = ipcTransport(api);
    return tr;
  }
  let entered = false;
  function watch(session, role, src) {
    session.onstatus = (st) => {
      set({ t: 'status', status: st, reason: session.rejected });
      if (st === 'ok' && !entered && hooks.enter) { entered = true; hooks.enter(role, src); }
    };
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'kies-lokaal') set({ t: 'kies', mode: MODES.LOKAAL });
      else if (a === 'kies-host') set({ t: 'kies', mode: MODES.HOST });
      else if (a === 'kies-gast') set({ t: 'kies', mode: MODES.GAST });
      else if (a.startsWith('bewaar-')) {
        const src = a.slice(7);
        set({ t: 'bewaar', src });
        if (state.mode === MODES.HOST) {
          const t = newTransport();
          const r = await api.host();
          if (!r.ok) return set({ t: 'fout', msg: r.text || 'De host kon niet starten.' });
          watch(hooks.onSession('host', t, src), 'host', src);
          set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
        }
      } else if (a === 'start-lokaal') hooks.startLocal(state.save);
      else if (a === 'koppel') {
        const t = newTransport();
        set({ t: 'verbinden' });
        const r = await api.join(input ? input.value : '');
        if (!r.ok) { set({ t: 'terug' }); set({ t: 'kies', mode: MODES.GAST }); return set({ t: 'fout', msg: r.reason }); }
        watch(hooks.onSession('client', t, null), 'client', null);
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a === 'terug' || a === 'verbreek') {
        if (api) await api.stop();
        if (hooks.disconnect) hooks.disconnect();
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
      } else if (a === 'hervat') {
        set({ t: 'hervat' });
        if (state.mode === MODES.HOST && api) {
          const r = await api.host();
          if (r.ok) set({ t: 'code', code: r.code, lanCode: r.lanCode, note: r.online ? '' : r.text });
        }
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
