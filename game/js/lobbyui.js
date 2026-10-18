// Coöp-lobby (#95), getekend in de menustijl (menu.css, de panelen van het
// startscherm). De logica en teksten staan in lobby.js (getest); dit bestand
// is alleen DOM en de aanroepen naar rtc.js. Alleen bereikbaar via ?coop.
import { createLobby, reduce, view, MODES } from './lobby.js';
import { hostStart, guestJoin, rtcSupported } from './net/rtc.js';
import { formatForDisplay } from './net/signal.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// root: element om in te tekenen. hooks: { startLocal(), onTransport(role, transport), close() }
export function mountLobby(root, hooks) {
  let state = createLobby();
  let host = null, guest = null;

  const set = (ev) => { state = reduce(state, ev); draw(); };

  function draw() {
    const v = view(state);
    root.innerHTML =
      `<h3 class="coop-title">${esc(v.title)}</h3>` +
      v.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
      (v.code ? `<pre class="coop-code" tabindex="0" aria-label="Jouw code">${esc(formatForDisplay(v.code))}</pre>` : '') +
      (v.input ? `<textarea class="coop-input" rows="4" spellcheck="false" placeholder="${esc(v.input.placeholder)}"></textarea>` : '') +
      (v.error ? `<p class="coop-error" role="alert">${esc(v.error)}</p>` : '') +
      `<div class="coop-btns">${v.buttons.map((b) => `<button type="button" class="ss-item${b.primary ? ' ss-hero' : ''}" data-act="${b.act}"><span class="ss-label">${esc(b.label)}</span></button>`).join('')}</div>`;
  }

  async function act(a) {
    const input = root.querySelector('.coop-input');
    try {
      if (a === 'kies-lokaal') set({ t: 'kies', mode: MODES.LOKAAL });
      else if (a === 'start-lokaal') { if (hooks.startLocal) hooks.startLocal(); }
      else if (a === 'kies-host') {
        set({ t: 'kies', mode: MODES.HOST });
        if (!rtcSupported()) return set({ t: 'fout', msg: 'Online spelen werkt hier niet.' });
        host = await hostStart(); set({ t: 'code', code: host.code });
      } else if (a === 'kies-gast') set({ t: 'kies', mode: MODES.GAST });
      else if (a === 'koppel') {
        const text = input ? input.value : '';
        if (state.mode === MODES.HOST && host) {
          const r = await host.acceptAnswer(text);
          if (!r.ok) return set({ t: 'fout', msg: r.reason });
          set({ t: 'verbinden' });
          host.transport.onopen = () => hooks.onTransport('host', host.transport);
        } else if (state.mode === MODES.GAST) {
          const r = await guestJoin(text);
          if (!r.ok) return set({ t: 'fout', msg: r.reason });
          guest = r; set({ t: 'code', code: r.code });
          r.opened.then((tr) => hooks.onTransport('gast', tr));
        }
      } else if (a === 'kopieer') {
        if (state.code && navigator.clipboard) await navigator.clipboard.writeText(state.code);
      } else if (a === 'terug' || a === 'verbreek') {
        if (host) { host.cancel(); host = null; } if (guest) { guest.cancel(); guest = null; }
        set({ t: a === 'terug' ? 'terug' : 'verbreek' });
        if (a === 'verbreek' && hooks.disconnect) hooks.disconnect();
      } else if (a === 'hervat') set({ t: 'hervat' });
    } catch (e) {
      set({ t: 'fout', msg: e && e.message ? e.message : 'Er ging iets mis.' });
    }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (b && root.contains(b)) act(b.dataset.act);
  });
  draw();
  return { event: set, state: () => state, close() { if (host) host.cancel(); if (guest) guest.cancel(); root.innerHTML = ''; } };
}
