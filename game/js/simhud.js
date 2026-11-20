// De gedeelde HUD-strook van de light sims (#985, #980): hengelen, krantenwijk en wat er na komt. Eén klein paneel onderin (zone C van de activiteiten): wat je
// doet, de stappen als chips met icoon, een meter (bijvoorbeeld de tijd van een beet), een paar cijfers, één zin "wat nu" en een getal dat opspringt bij een
// succes. Dun gehouden: semantische markup, alle stijl in sim.css met alleen ds-tokens. De gegevens komen van een puur model per sim (hengelstatus.js, enz.);
// dit bestand is alleen DOM en bepaalt niets over het spel. Kleur is nooit de enige betekenis: elke stand heeft een woord en een icoon.
import { sfxLinks } from './latehooks.js';
import { reducedMotion } from './motion.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (pad, cls = 'ds-icoon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pad}</svg>`;

// De sleutel voor de eerste-keer-uitleg per sim: een keer gezien blijft weg (alleen dit apparaat, geen savegame).
export const UITLEG_SLEUTEL = 'gde-sim-uitleg-v1';
export function uitlegGezien(id) {
  try { return typeof localStorage !== 'undefined' && (JSON.parse(localStorage.getItem(UITLEG_SLEUTEL) || '[]') || []).includes(id); } catch (e) { return false; }
}
export function zetUitlegGezien(id) {
  try {
    const lijst = JSON.parse(localStorage.getItem(UITLEG_SLEUTEL) || '[]') || [];
    if (!lijst.includes(id)) { lijst.push(id); localStorage.setItem(UITLEG_SLEUTEL, JSON.stringify(lijst)); }
  } catch (e) { /* geen opslag is geen ramp */ }
}

// De markup van de strook uit een model: puur, zodat een test hem zonder DOM kan nakijken.
// model: { id, titel, icoon, plek, stappen: [{ label, icoon, stand: 'klaar'|'nu'|'straks' }], meter: { pct, label, naam, staat }, cijfers: [{ label, waarde }],
//          nu, hulp, slecht, uitleg: [{ icoon, tekst }] }
export function simHudHtml(m) {
  if (!m) return '';
  const stappen = (m.stappen || []).length
    ? `<ol class="sh-stappen" aria-label="De stappen">${m.stappen.map((s) => `<li data-stand="${esc(s.stand || 'straks')}"${s.stand === 'nu' ? ' aria-current="step"' : ''}><span class="ds-chip">${svg(s.icoon || '', 'ds-chip__icoon')}${esc(s.label)}</span></li>`).join('')}</ol>` : '';
  const meter = m.meter
    ? `<div class="ds-streep sh-meter${m.meter.staat ? ' sh-meter--' + esc(m.meter.staat) : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(m.meter.pct)}" aria-label="${esc(m.meter.naam || 'Voortgang')}" style="--ds-streep-w:${Math.round(m.meter.pct)}%"><span class="ds-streep__baan"><span class="ds-streep__vul"></span></span><span class="ds-streep__label">${esc(m.meter.label || '')}</span></div>` : '';
  const cijfers = (m.cijfers || []).length
    ? `<dl class="sh-cijfers">${m.cijfers.map((c) => `<div><dt class="ds-t-hulp">${esc(c.label)}</dt><dd class="ds-t-cijfer">${esc(c.waarde)}</dd></div>`).join('')}</dl>` : '';
  const uitleg = (m.uitleg || []).length
    ? `<ul class="sh-uitleg" aria-label="Zo werkt het">${m.uitleg.map((u) => `<li><span class="ds-chip">${svg(u.icoon || '', 'ds-chip__icoon')}</span><span class="ds-t-hulp">${esc(u.tekst)}</span></li>`).join('')}</ul>` : '';
  return `<header class="sh-kop">${svg(m.icoon || '', 'ds-icoon sh-icoon')}<span class="sh-titel ds-t-subkop">${esc(m.titel || '')}</span>${m.plek ? `<span class="ds-chip sh-plek">${esc(m.plek)}</span>` : ''}</header>` +
    stappen + meter + cijfers + uitleg + `<p class="ds-t-hulp sh-nu${m.slecht ? ' sh-nu--slecht' : ''}" aria-live="polite">${esc(m.nu || '')}</p>` +
    (m.hulp ? `<p class="ds-t-hulp sh-hulp">${esc(m.hulp)}</p>` : '');
}

let el = null, inhoud = null, pop = null, sleutel = '', popT = 0;

function bouw() {
  if (el || typeof document === 'undefined' || !document.body || !document.createElement) return;
  el = document.createElement('section');
  el.id = 'sh-hud';
  el.className = 'sh-hud ds-kaart';
  el.setAttribute('aria-label', 'Wat je nu doet');
  el.hidden = true;
  inhoud = document.createElement('div');
  inhoud.className = 'sh-inhoud';
  pop = document.createElement('span');
  pop.className = 'sh-pop ds-t-cijfer';
  pop.setAttribute('aria-hidden', 'true');
  el.append(inhoud, pop);
  document.body.appendChild(el);
}

// Elk beeld van de sim: toont of verbergt de strook en schrijft alleen bij een verschil. null verbergt hem.
export function simHudTik(dt, m) {
  if (popT > 0) { popT -= dt; if (popT <= 0 && pop) { pop.classList.remove('sh-pop--aan', 'sh-pop--stil'); pop.textContent = ''; } }
  if (!m) { if (el && !el.hidden) el.hidden = true; sleutel = ''; return; }
  bouw();
  if (!el) return;
  if (el.hidden) el.hidden = false;
  const html = simHudHtml(m);
  if (html === sleutel) return;
  sleutel = html;
  inhoud.innerHTML = html;
  el.dataset.sim = m.id || '';
}

// Een succes: een getal springt op (niet bij verminderde beweging) en het UI-geluid voor iets gelukts klinkt (bestaande bank, geen nieuwe sfx).
export function simHudPop(tekst, geluid = 'ui_verzameld') {
  bouw();
  if (pop && tekst) {
    pop.textContent = tekst;
    pop.classList.remove('sh-pop--aan', 'sh-pop--stil');
    if (reducedMotion()) pop.classList.add('sh-pop--stil');
    else { void pop.offsetWidth; pop.classList.add('sh-pop--aan'); }
    popT = 2.6;
  }
  if (geluid) { try { sfxLinks.uiFx(geluid); } catch (e) { /* geen geluid is geen ramp */ } }
}

export const _simHudEl = () => el;
