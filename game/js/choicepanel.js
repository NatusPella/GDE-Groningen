// A small text panel at the top centre for the text jobs (casework.js): a
// kicker, the case, up to three numbered answers and one line of key hints.
// The same family as the minigame board (minigamekit.js): one at a time, body
// class `mg-on` takes the speedo and the phone cards out of the way, and
// `world.minigameUntil` (set by the job while it is up) keeps the number keys
// and Space from switching weapons.
import { icoon } from './icons.js';
import { escapeHtml as esc } from './htmlescape.js';
const CSS = `
#hud .cw-panel[hidden] { display: none; }
#hud .cw-panel { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); box-sizing: border-box; width: min(640px, calc(100vw / var(--ui, 1) - 2 * max(var(--hud-edge, 46px) + 370px, var(--hud-c-right, 0px) + 12px)), calc(100vw - 32px)); min-width: min(400px, calc(100vw - 32px)); padding: 10px 18px 12px 14px; color: var(--ds-c-creme); text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-c-glas) 92%, transparent), rgba(24,34,28,0.74) 80%, rgba(24,34,28,0.3)); border-left: 3px solid var(--cw-acc, var(--mk-mission, #e8c93a)); }
#hud .cw-panel small { display: block; font-size: 13px; letter-spacing: 3px; color: var(--cw-acc, var(--mk-mission, #e8c93a)); }
#hud .cw-panel .cw-text { font-size: 19px; line-height: 1.3; margin: 4px 0 2px; }
#hud .cw-panel .cw-rule { font-size: 15px; color: color-mix(in srgb, var(--ds-c-creme) 78%, transparent); font-style: italic; margin: 0 0 6px; }
#hud .cw-panel .cw-opts { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
#hud .cw-panel .cw-opt { display: flex; align-items: center; gap: 10px; font-size: 18px; padding: 3px 8px; background: color-mix(in srgb, var(--ds-c-creme) 8%, transparent); }
#hud .cw-panel .cw-opt .cw-body { display: flex; flex-direction: column; min-width: 0; }
#hud .cw-panel .cw-opt .cw-note { font-size: 13px; color: color-mix(in srgb, var(--ds-c-creme) 72%, transparent); }
#hud .cw-panel .cw-opt .cw-badge { margin-left: auto; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: var(--ds-c-glas); background: var(--mk-ok, #3fc97a); padding: 1px 7px; border-radius: 2px; }
#hud .cw-panel .cw-opt.pick { background: color-mix(in srgb, var(--mk-mission, #e8c93a) 30%, transparent); }
#hud .cw-panel .cw-opt.good { background: color-mix(in srgb, var(--mk-ok, #3fc97a) 22%, transparent); }
#hud .cw-panel .cw-opt.bad { background: color-mix(in srgb, var(--mk-job, #ff9a3c) 22%, transparent); }
#hud .cw-panel .cw-meter { position: relative; height: 10px; margin: 8px 0 3px; background: color-mix(in srgb, var(--ds-c-creme) 16%, transparent); border-radius: 2px; overflow: hidden; }
#hud .cw-panel .cw-meter[hidden] { display: none; }
#hud .cw-panel .cw-meter i { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--ds-c-creme); }
#hud .cw-panel .cw-meter b { position: absolute; top: 0; bottom: 0; background: color-mix(in srgb, var(--mk-ok, #3fc97a) 55%, transparent); }
#hud .cw-panel .cw-flash { font-size: 20px; letter-spacing: 1px; color: var(--mk-ok, #3fc97a); min-height: 1em; margin-top: 3px; }
#hud .cw-panel .cw-flash.bad { color: var(--mk-job, #ff9a3c); }
#hud .cw-panel .cw-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 4px; font: 13px var(--ds-font-tekst); color: color-mix(in srgb, var(--ds-c-creme) 78%, transparent); }
#hud .cw-panel .cw-ic { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 24px; }
#hud .cw-panel .cw-ic .ic { width: 20px; height: 20px; }
/* #985: onder 1100 px past het paneel niet tussen de berichtkolom en zone C: het hangt rechts onder zone C */
@media (max-width: 1100px) and (min-width: 481px) { #hud .cw-panel { left: auto; right: var(--hud-edge, 46px); transform: none; top: calc(var(--hud-tr-bottom, 150px) + 8px); min-width: 0; width: min(460px, calc(100vw / var(--ui, 1) - 2 * var(--hud-edge, 46px))); } }
@media (max-width: 480px) { #hud .cw-panel { top: 64px; } }
html.touch-device #hud .cw-panel .cw-opt { min-height: 44px; box-sizing: border-box; }
/* Zomerse zeefdruk (ADR 0040): papier met inktrand en harde schaduw; de accentkleur blijft de dikke linkerrand. */
#hud .cw-panel { color: var(--ds-c-ink-inkt); text-shadow: none; font-family: var(--ds-font-zeef-tekst); background: var(--ds-c-ink-papier);
  border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-left: 8px solid var(--cw-acc, var(--ds-c-ink-bord)); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); }
#hud .cw-panel small { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: max(13px, calc(13px / var(--ui, 1))); letter-spacing: 0.12em; color: var(--ds-c-ink-bord); }
#hud .cw-panel .cw-text { font-size: 19px; }
#hud .cw-panel .cw-rule { color: var(--ds-c-inkt-zacht); }
#hud .cw-panel .cw-opt { font-family: var(--ds-font-zeef-kop); font-weight: 600; background: var(--ds-c-sel-vlak); border-radius: 3px; }
#hud .cw-panel .cw-opt .cw-note { font-family: var(--ds-font-zeef-tekst); font-size: max(13px, calc(13px / var(--ui, 1))); color: var(--ds-c-inkt-zacht); }
#hud .cw-panel .cw-opt .cw-badge { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: max(13px, calc(13px / var(--ui, 1))); color: var(--ds-c-ink-inkt); background: var(--ds-c-ink-geel); border: 2px solid var(--ds-c-ink-inkt); border-radius: 3px; }
#hud .cw-panel .cw-opt.pick { background: var(--ds-c-ink-geel); box-shadow: inset 0 0 0 2px var(--ds-c-ink-inkt); }
#hud .cw-panel .cw-opt.good { background: var(--ds-c-groen-vlak); color: var(--ds-c-groen-tx); }
#hud .cw-panel .cw-opt.bad { background: var(--ds-c-rood-vlak); color: var(--ds-c-rood-tx); }
#hud .cw-panel .cw-meter { background: var(--ds-c-sel-vlak); border-radius: 3px; box-shadow: inset 0 0 0 2px var(--ds-c-ink-inkt); height: 13px; }
#hud .cw-panel .cw-meter i { background: var(--ds-c-ink-inkt); }
#hud .cw-panel .cw-meter b { background: var(--ds-c-ink-geel); }
#hud .cw-panel .cw-flash { font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-groen-tx); }
#hud .cw-panel .cw-flash.bad { color: var(--ds-c-rood-tx); }
#hud .cw-panel .cw-help { font-family: var(--ds-font-zeef-tekst); font-size: max(13px, calc(13px / var(--ui, 1))); color: var(--ds-c-inkt-zacht); }
#hud .cw-panel .cw-tip { flex-basis: 100%; margin-top: 2px; font-style: italic; }
/* #962: voortgang van een quicktime-stap als stippen: gedaan = vol, nu = dikke rand, nog te gaan = leeg (vorm, niet alleen kleur) */
#hud .cw-panel .cw-pips { display: inline-flex; gap: 6px; margin-left: 10px; vertical-align: middle; }
#hud .cw-panel .cw-pip { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--ds-c-ink-inkt); background: transparent; box-sizing: border-box; }
#hud .cw-panel .cw-pip.is-klaar { background: var(--ds-c-ink-bord); }
#hud .cw-panel .cw-pip.is-nu { border-width: 4px; }
#hud .cw-panel .ds-uitleg { --ds-tx: var(--ds-c-ink-inkt); --ds-tx-zacht: var(--ds-c-inkt-zacht); --ds-selectie: var(--ds-c-ink-bord); display: inline-flex; vertical-align: middle; }
`;

let cssDone = false;
export const keycap = (t) => `<span class="hud-key">${esc(t)}</span>`;

export function createChoicePanel(accent = 'var(--mk-mission, #e8c93a)') {
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
    // { kicker, text, rule, options: [{ key, label, cls }], meter: { v, from, to }, flash, bad, help, nr }
    set(s) {
      const sig = JSON.stringify([s.kicker, s.text, s.rule, s.options, s.meter && [Math.round(s.meter.v * 100), s.meter.from, s.meter.to], s.flash, !!s.bad, s.help, s.nr]);
      if (sig === last) return;
      last = sig;
      // de ronde van een timing (#525): de gast leest hem via de DOM en stuurt hem met zijn druk mee
      if (s.nr > 0) root.dataset.rond = String(s.nr);
      else delete root.dataset.rond;
      el.kicker.textContent = s.kicker || '';
      el.text.textContent = s.text || '';
      el.rule.hidden = !s.rule;
      el.rule.textContent = s.rule || '';
      el.opts.innerHTML = (s.options || []).map((o) => `<div class="cw-opt ${o.cls || ''}" data-key="${esc(o.key)}">${o.icon ? `<span class="cw-ic">${icoon(o.icon, { maat: 'm' })}</span>` : keycap(o.key)}${o.note ? `<span class="cw-body"><span>${esc(o.label)}</span><span class="cw-note">${esc(o.note)}</span></span>` : `<span>${esc(o.label)}</span>`}${o.badge ? `<span class="cw-badge">${esc(o.badge)}</span>` : ''}</div>`).join('');
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
