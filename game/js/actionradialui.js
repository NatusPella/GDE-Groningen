// Het acties-wiel op het scherm (22-11): tekent de stand van actionradial.js. Alleen DOM; de regels staan in actionradial.js en controls.js (getest).
// De onderdelen staan op een cirkel, bovenaan begint de eerste, zoals de stick ze kiest. De gekozen heeft de DS3-focusring; een klik
// met de muis kiest ook. Onderin staan de toetsen in de knop-stijl (glyphHtml): A kiest, B sluit, LB en RB bladeren. Niet in beeld bekeken.
import { glyphHtml } from './keycap.js';
import { onRadialChange, radialPick, radialIsOpen, radialStep, radialChoose, closeRadial } from './actionradial.js';
import { icoon } from './icons.js';
import { escapeHtml as esc } from './htmlescape.js';


const CSS = `
#pad-wiel { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 730; box-sizing: border-box; width: min(440px, 94vw); padding: var(--ds-s-4); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-body); pointer-events: auto; }
#pad-wiel h3 { margin: 0 0 var(--ds-s-2); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); letter-spacing: var(--ds-ls-label); text-align: center; }
#pad-wiel .pw-ring { position: relative; width: min(360px, 80vw); height: min(300px, 62vw); margin: 0 auto; }
#pad-wiel .pw-knop { position: absolute; transform: translate(-50%, -50%); min-width: 7.5em; min-height: var(--ds-doel-aanraken); padding: 0 var(--ds-s-3); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: transparent; color: inherit; font: inherit; cursor: pointer; }
#pad-wiel .pw-knop:hover, #pad-wiel .pw-knop.pw-sel { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); }
#pad-wiel .pw-knop.pw-sel { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
#pad-wiel .pw-midden { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: var(--ds-t-hulp); text-align: center; max-width: 8em; }
#pad-wiel .pw-voet { margin-top: var(--ds-s-3); padding-top: var(--ds-s-2); border-top: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); font-size: var(--ds-t-hulp); display: flex; flex-wrap: wrap; gap: var(--ds-s-3); justify-content: center; align-items: center; }
#pad-wiel .pw-lijst { display: flex; flex-direction: column; gap: var(--ds-s-1); margin: 0 auto; max-height: min(320px, 56vh); overflow-y: auto; }
#pad-wiel .pw-rij { display: flex; align-items: center; gap: var(--ds-s-3); min-height: var(--ds-doel-aanraken); padding: 0 var(--ds-s-3); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
#pad-wiel .pw-rij:hover, #pad-wiel .pw-rij.pw-sel { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); }
#pad-wiel .pw-rij.pw-sel { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
#pad-wiel .pw-rij.pw-actief { font-weight: 800; }
#pad-wiel .pw-rij.pw-uit { opacity: 0.55; cursor: default; }
#pad-wiel .pw-rij .pw-naam { flex: 1; }
#pad-wiel .pw-rij .pw-sub { font-size: var(--ds-t-hulp); }
`;

let el = null, styled = false;

function ensureStyle() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style'); s.id = 'style-padwiel'; s.textContent = CSS; document.head.appendChild(s);
}

const rowHtml = (it, i, sel) => {
  const cls = `pw-rij${sel === i ? ' pw-sel' : ''}${it.active ? ' pw-actief' : ''}${it.disabled ? ' pw-uit' : ''}`;
  const ic = it.icon ? icoon(it.icon, { maat: 'm' }) : '';
  const check = it.active ? ' <span aria-hidden="true">●</span>' : '';
  return `<button type="button" class="${cls}" data-pw="${i}"${it.disabled ? ' aria-disabled="true"' : ''}${it.active ? ' aria-current="true"' : ''}>${ic}<span class="pw-naam">${esc(it.label)}${check}</span>${it.sub ? `<span class="pw-sub">${esc(it.sub)}</span>` : ''}</button>`;
};

export function radialHtml(m) {
  const n = m.items.length;
  if (m.layout === 'lijst') {
    const pagina = m.pages > 1 ? `<span>${glyphHtml('Q')}${glyphHtml('E')} pagina ${m.page + 1} van ${m.pages}</span>` : '';
    return `<h3>${esc(m.title)}</h3><div class="pw-lijst" role="list">${m.items.map((it, i) => rowHtml(it, i, m.sel)).join('')}</div>` +
      `<div class="pw-voet"><span>${glyphHtml('ENTER')} kiest</span><span>${glyphHtml('ESC')} sluit</span>${pagina}</div>`;
  }
  const knoppen = m.items.map((it, i) => {
    const a = (Math.PI * 2 / n) * i;
    const x = 50 + Math.sin(a) * 38, y = 50 - Math.cos(a) * 40;
    return `<button type="button" class="pw-knop${m.sel === i ? ' pw-sel' : ''}" data-pw="${i}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">${esc(it.label)}</button>`;
  }).join('');
  const pagina = m.pages > 1 ? `<span>${glyphHtml('Q')}${glyphHtml('E')} pagina ${m.page + 1} van ${m.pages}</span>` : '';
  return `<h3>${esc(m.title)}</h3><div class="pw-ring">${knoppen}<div class="pw-midden">${m.sel < 0 ? 'Kies met de stick' : ''}</div></div>` +
    `<div class="pw-voet"><span>${glyphHtml('ENTER')} kiest</span><span>${glyphHtml('ESC')} sluit</span>${pagina}</div>`;
}

function draw(m) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  if (!m.open) { if (el) el.style.display = 'none'; return; }
  ensureStyle();
  if (!el) {
    el = document.createElement('div'); el.id = 'pad-wiel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Acties-wiel');
    // de voetknoppen lezen de menu-indeling: A is Enter, B is Esc, LB en RB zijn Q en E
    el.dataset.padCtx = 'menu';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-pw]'); if (b && radialIsOpen()) radialPick(Number(b.getAttribute('data-pw'))); });
  }
  el.style.display = '';
  el.innerHTML = radialHtml(m);
}

// Het toetsenbord: pijlen kiezen, Enter bevestigt, Escape sluit (het zenderwiel na N vasthouden). Een toets van de controller (__gde 'pad') hoort
// bij gamepad.js en gaat hier niet langs. Het voertuig blijft bestuurbaar: alleen deze toetsen worden hier opgevangen.
function onKey(e) {
  if (!radialIsOpen() || e.__gde === 'pad') return;
  const k = String(e.key || '').toLowerCase();
  const dir = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' }[k];
  if (!dir && k !== 'enter' && k !== 'escape') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.type !== 'keydown') return;
  if (dir) radialStep(dir); else if (k === 'enter') radialChoose(); else closeRadial();
}

let ready = false;
// Eenmalig: het wiel tekent zichzelf zodra actionradial.js opent, bladert of een keuze verandert. De keuze zelf (de toets sturen) doet gamepad.js.
export function initActionRadialUi() {
  if (ready) return;
  ready = true;
  onRadialChange(draw);
  if (typeof window !== 'undefined' && window.addEventListener) { window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true); }
}
