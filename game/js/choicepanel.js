// A small text panel at the top centre for the text jobs (casework.js): a
// kicker, the case, up to three numbered answers and one line of key hints.
// The same family as the minigame board (minigamekit.js): one at a time, body
// class `mg-on` takes the speedo and the phone cards out of the way, and
// `world.minigameUntil` (set by the job while it is up) keeps the number keys
// and Space from switching weapons.
const CSS = `
#hud .cw-panel[hidden] { display: none; }
#hud .cw-panel { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); box-sizing: border-box; width: min(640px, calc(100vw / var(--ui, 1) - 2 * (var(--hud-edge, 46px) + 370px)), calc(100vw - 32px)); min-width: min(400px, calc(100vw - 32px)); padding: 10px 18px 12px 14px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.92), rgba(24,34,28,0.74) 80%, rgba(24,34,28,0.3)); border-left: 3px solid var(--cw-acc, #d9a441); }
#hud .cw-panel small { display: block; font-size: 12px; letter-spacing: 3px; color: var(--cw-acc, #d9a441); }
#hud .cw-panel .cw-text { font-size: 19px; line-height: 1.3; margin: 4px 0 2px; }
#hud .cw-panel .cw-rule { font-size: 15px; color: rgba(240,237,228,0.78); font-style: italic; margin: 0 0 6px; }
#hud .cw-panel .cw-opts { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
#hud .cw-panel .cw-opt { display: flex; align-items: center; gap: 10px; font-size: 18px; padding: 3px 8px; background: rgba(240,237,228,0.08); }
#hud .cw-panel .cw-opt .cw-body { display: flex; flex-direction: column; min-width: 0; }
#hud .cw-panel .cw-opt .cw-note { font-size: 13px; color: rgba(240,237,228,0.72); }
#hud .cw-panel .cw-opt .cw-badge { margin-left: auto; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #12200f; background: #5dff7a; padding: 1px 7px; border-radius: 2px; }
#hud .cw-panel .cw-opt.pick { background: rgba(255,210,63,0.3); }
#hud .cw-panel .cw-opt.good { background: rgba(93,255,122,0.22); }
#hud .cw-panel .cw-opt.bad { background: rgba(255,154,60,0.22); }
#hud .cw-panel .cw-meter { position: relative; height: 10px; margin: 8px 0 3px; background: rgba(240,237,228,0.16); border-radius: 2px; overflow: hidden; }
#hud .cw-panel .cw-meter[hidden] { display: none; }
#hud .cw-panel .cw-meter i { position: absolute; top: 0; bottom: 0; width: 3px; background: #f0ede4; }
#hud .cw-panel .cw-meter b { position: absolute; top: 0; bottom: 0; background: rgba(93,255,122,0.55); }
#hud .cw-panel .cw-flash { font-size: 20px; letter-spacing: 1px; color: #5dff7a; min-height: 1em; margin-top: 3px; }
#hud .cw-panel .cw-flash.bad { color: #ff9a3c; }
#hud .cw-panel .cw-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 4px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .cw-panel .hud-key { margin: 0 2px; vertical-align: middle; }
@media (max-width: 480px) { #hud .cw-panel { top: 64px; } }
html.touch-device #hud .cw-panel .cw-opt { min-height: 44px; box-sizing: border-box; }
`;

let cssDone = false;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const keycap = (t) => `<span class="hud-key">${esc(t)}</span>`;

export function createChoicePanel(accent = '#d9a441') {
  if (!cssDone && typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    cssDone = true;
  }
  const root = document.createElement('div');
  root.className = 'cw-panel';
  root.style.setProperty('--cw-acc', accent);
  root.hidden = true;
  root.innerHTML = '<small></small><div class="cw-text"></div><div class="cw-rule" hidden></div><div class="cw-opts"></div><div class="cw-meter" hidden><b></b><i></i></div><div class="cw-flash"></div><div class="cw-help"></div>';
  (document.getElementById('hud') || document.body).appendChild(root);
  const q = (s) => root.querySelector(s);
  const el = { kicker: q('small'), text: q('.cw-text'), rule: q('.cw-rule'), opts: q('.cw-opts'), meter: q('.cw-meter'), zone: q('.cw-meter b'), mark: q('.cw-meter i'), flash: q('.cw-flash'), help: q('.cw-help') };
  let last = '';
  return {
    root,
    get open() { return !root.hidden; },
    show() { root.hidden = false; document.body.classList.add('mg-on'); last = ''; },
    hide() { root.hidden = true; document.body.classList.remove('mg-on'); },
    // { kicker, text, rule, options: [{ key, label, cls }], meter: { v, from, to }, flash, bad, help }
    set(s) {
      const sig = JSON.stringify([s.kicker, s.text, s.rule, s.options, s.meter && [Math.round(s.meter.v * 100), s.meter.from, s.meter.to], s.flash, !!s.bad, s.help]);
      if (sig === last) return;
      last = sig;
      el.kicker.textContent = s.kicker || '';
      el.text.textContent = s.text || '';
      el.rule.hidden = !s.rule;
      el.rule.textContent = s.rule || '';
      el.opts.innerHTML = (s.options || []).map((o) => `<div class="cw-opt ${o.cls || ''}" data-key="${esc(o.key)}">${keycap(o.key)}${o.note ? `<span class="cw-body"><span>${esc(o.label)}</span><span class="cw-note">${esc(o.note)}</span></span>` : `<span>${esc(o.label)}</span>`}${o.badge ? `<span class="cw-badge">${esc(o.badge)}</span>` : ''}</div>`).join('');
      if (s.meter) {
        el.meter.hidden = false;
        el.mark.style.left = `${Math.round(Math.max(0, Math.min(1, s.meter.v)) * 100)}%`;
        el.zone.style.left = `${Math.round((s.meter.from ?? 0) * 100)}%`;
        el.zone.style.width = `${Math.round(((s.meter.to ?? 0) - (s.meter.from ?? 0)) * 100)}%`;
        el.zone.style.display = s.meter.to == null ? 'none' : '';
      } else el.meter.hidden = true;
      el.flash.textContent = s.flash || '';
      el.flash.classList.toggle('bad', !!s.bad);
      el.help.innerHTML = s.help || '';
    },
  };
}
