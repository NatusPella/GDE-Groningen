// Story dev panel (?dev, desktop --dev; loaded by main.js only then). F9
// opens it: chapter select with the right save state, objective/win/lose,
// teleport to the next objective, time scale, invulnerability and the money
// timeline. Everything goes through window.__story (story.js). The last row
// previews the special-gameplay modules (helirun.js, fierljep.js).

import { STEPS, stepAvailable } from './storyarc.js';
import { cheatsUit, CHEATS_UIT_TEKST } from './coopgroep.js';

let world = null;
let root = null;
let open = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function css() {
  const st = document.createElement('style');
  st.textContent = `
#story-dev{position:fixed;top:12px;right:12px;z-index:60;font:13px/1.35 system-ui,sans-serif;color:#eee}
#story-dev .sd-badge{background:#b8322a;color:#fff;border-radius:6px;padding:3px 8px;font-weight:700;cursor:pointer;float:right}
#story-dev .sd-panel{clear:both;margin-top:6px;width:320px;background:rgba(14,16,20,.94);border:1px solid #444;border-radius:10px;padding:10px;display:none}
#story-dev.open .sd-panel{display:block}
#story-dev select,#story-dev button{font:inherit;background:#23262d;color:#eee;border:1px solid #555;border-radius:6px;padding:4px 7px;margin:2px 0;cursor:pointer}
#story-dev button:hover{background:#343844}
#story-dev .sd-row{display:flex;gap:4px;flex-wrap:wrap;margin:5px 0}
#story-dev select{flex:1;min-width:0;max-width:100%}
#story-dev .sd-status{white-space:pre-line;color:#cfd3da;font-size:12px;margin-bottom:6px}
#story-dev .sd-on{background:#1e6e3e}
#story-dev pre{max-height:180px;overflow:auto;font-size:11px;background:#111;padding:6px;border-radius:6px;margin:4px 0 0}`;
  document.head.appendChild(st);
}

function build() {
  root = document.createElement('div');
  root.id = 'story-dev';
  const opts = STEPS.map((s) => `<option value="${s.id}"${stepAvailable(s) ? '' : ' disabled'}>${esc(s.id)} · ${esc(s.title)}${stepAvailable(s) ? '' : ' (nog niet gebouwd)'}</option>`).join('');
  root.innerHTML = `<div class="sd-badge" title="F9">DEV</div><div class="sd-panel">
    <div class="sd-status"></div>
    <div class="sd-row"><select data-jump-sel>${opts}</select><button data-a="jump">Spring</button></div>
    <div class="sd-row"><button data-a="complete">Doel voltooien</button><button data-a="win">Missie winnen</button><button data-a="lose">Missie verliezen</button></div>
    <div class="sd-row"><button data-a="teleport">Naar volgend doel</button><button data-a="skip">Stap overslaan</button><button data-a="money">+€500</button></div>
    <div class="sd-row"><button data-t="1">Tijd ×1</button><button data-t="2">×2</button><button data-t="4">×4</button><button data-a="invuln">Onkwetsbaar</button></div>
    <div class="sd-row"><button data-a="timeline">Geld-tijdlijn</button><button data-a="night">Nacht</button><button data-a="day">Dag</button></div>
    <div class="sd-row"><button data-a="heli">Heli-ronde</button><button data-a="vault">Fierljep</button><button data-a="vaultfail">Fierljep (mis)</button></div>
    <pre hidden></pre></div>`;
  document.body.appendChild(root);
  for (const t of ['mousedown', 'mouseup', 'click', 'wheel', 'keydown']) root.addEventListener(t, (e) => e.stopPropagation());
  root.querySelector('.sd-badge').addEventListener('click', () => setOpen(!open));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.t) { world.devTimeScale = Number(b.dataset.t); refresh(); return; }
    act(b.dataset.a);
  });
}

function act(a) {
  if (cheatsUit(world)) { if (world.addMessage) world.addMessage(CHEATS_UIT_TEKST, 4); setOpen(false); return; } // het paneel stond al open toen iemand aansloot (#452)
  const S = window.__story;
  const pre = root.querySelector('pre');
  if (a === 'jump') S.jump(root.querySelector('[data-jump-sel]').value);
  else if (a === 'complete') S.complete();
  else if (a === 'win') S.win();
  else if (a === 'lose') S.lose();
  else if (a === 'teleport') S.teleport();
  else if (a === 'skip') { if (!S.skip(true)) S.complete(); }
  else if (a === 'money') world.money += 500;
  else if (a === 'invuln') world.devInvuln = !world.devInvuln;
  else if (a === 'night' || a === 'day') { world.clock = a === 'night' ? 21.5 : 12; }
  else if (a === 'heli') { setOpen(false); window.__heliRun && window.__heliRun.start('ballonjacht'); }
  else if (a === 'vault' || a === 'vaultfail') { setOpen(false); window.__fierljep && window.__fierljep.debugVault({ fail: a === 'vaultfail', slowmo: true }); }
  else if (a === 'timeline') {
    const t = S.timeline();
    pre.hidden = !pre.hidden;
    pre.textContent = t.rows.map((r) => `${r.id.padEnd(15)} ${r.built ? ' ' : '·'} €${String(r.before).padStart(5)} ${r.cost ? '-' + r.cost : ''}${r.pay ? ' +' + r.pay : ''}`).join('\n') + `\nlaagste marge €${t.low}, eind €${t.end}`;
  }
  refresh();
}

function refresh() {
  if (!root || !open) return;
  const S = window.__story;
  const c = S.current();
  const m = S.mission();
  root.querySelector('.sd-status').textContent =
    `Stap: ${c ? (c.end ? `einde ${c.end} (wordt vervolgd)` : `${c.id} · ${c.title}`) : '-'}\n` +
    `Missie: ${m ? `#${m.index} ${m.phase}${m.phase === 'active' && m.stage >= 0 ? ` · stage ${m.stage}` : ''}` : '-'}\n` +
    `Geld €${Math.round(world.money)} · ${world.dayNight ? world.dayNight.label : ''} · tijd ×${world.devTimeScale || 1}${world.devInvuln ? ' · onkwetsbaar' : ''}`;
  root.querySelector('[data-a="invuln"]').classList.toggle('sd-on', !!world.devInvuln);
  for (const b of root.querySelectorAll('[data-t]')) b.classList.toggle('sd-on', Number(b.dataset.t) === (world.devTimeScale || 1));
}

function setOpen(v) {
  if (v && cheatsUit(world)) { if (world.addMessage) world.addMessage(CHEATS_UIT_TEKST, 4); v = false; } // met meer spelers geen dev-paneel (#452)
  open = v;
  world.devPanelOpen = open;
  root.classList.toggle('open', open);
  if (open && document.pointerLockElement) document.exitPointerLock();
  const c = open && window.__story.current();
  if (c && c.id) root.querySelector('[data-jump-sel]').value = c.id;
  refresh();
}

export function initStoryDev(w) {
  world = w;
  css();
  build();
  const canLock = w.input.canLock;
  w.input.canLock = () => !open && (!canLock || canLock());
  window.addEventListener('keydown', (e) => { if (e.key === 'F9') { e.preventDefault(); setOpen(!open); } });
  setInterval(refresh, 500);
}
