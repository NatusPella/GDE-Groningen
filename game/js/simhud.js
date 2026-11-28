// De gedeelde HUD-strook van de light sims (#985, #980): hengelen, krantenwijk en wat er na komt. Eén klein paneel onderin (zone C van de activiteiten): wat je
// doet, de stappen als chips met icoon, een meter (bijvoorbeeld de tijd van een beet), een paar cijfers, één zin "wat nu" en een getal dat opspringt bij een
// succes. Dun gehouden: semantische markup, alle stijl in sim.css met alleen ds-tokens. De gegevens komen van een puur model per sim (hengelstatus.js, enz.);
// dit bestand is alleen DOM en bepaalt niets over het spel. Kleur is nooit de enige betekenis: elke stand heeft een woord en een icoon.
import { sfxLinks } from './latehooks.js';
import { readList } from './opslaglezen.js';
import { reducedMotion } from './motion.js';
import { icoon } from './icons.js';
import { uitlegModel, uitlegHtml, uitlegIconenAan, uitlegInstellingSleutel, zetUitlegGlyph, startUitleg } from './uitleg.js';
import { escapeHtml as esc } from './htmlescape.js';

// Een pictogram is een betekenisnaam uit iconmap.js (Phosphor, ADR 0041); een ruw lijnpad (<path ...>) blijft werken voor de modellen van ronde 1.
const svg = (pad, cls = 'ds-icoon') => (typeof pad === 'string' && pad && !pad.includes('<') ? icoon(pad, { cls }) : `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pad}</svg>`);

// De sleutel voor de eerste-keer-uitleg per sim: een keer gezien blijft weg (alleen dit apparaat, geen savegame).
const UITLEG_SLEUTEL = 'gde-sim-uitleg-v1';
export function uitlegGezien(id) {
  try { return typeof localStorage !== 'undefined' && readList(localStorage.getItem(UITLEG_SLEUTEL)).includes(id); } catch (e) { return false; }
}
export function zetUitlegGezien(id) {
  try {
    const lijst = readList(localStorage.getItem(UITLEG_SLEUTEL)); // een kapot bewaard object herstelt zich zo, in plaats van de uitleg elke keer terug te laten komen
    if (!lijst.includes(id)) { lijst.push(id); localStorage.setItem(UITLEG_SLEUTEL, JSON.stringify(lijst)); }
  } catch (e) { /* geen opslag is geen ramp */ }
}

// De markup van de strook uit een model: puur, zodat een test hem zonder DOM kan nakijken. Volgorde en gewicht: de kop (klein, gedempt), de stappen (alleen de huidige met
// woord), de ene primaire waarde (groot, met pictogram), de meter, één zin "wat nu" (de enige tekst die opvalt), dan de secundaire waarden (klein, gedempt, met pictogram).
// model: { id, titel, icoon, plek, stappen: [{ label, icoon, stand: 'klaar'|'nu'|'straks' }], primair: { icoon, waarde, naam }, meter: { pct, label, naam, staat: 'laag'|'goed' },
//          cijfers: [{ icoon, label, waarde, staat: 'goed'|'let-op'|'actie' }], nu, hulp, slecht, uitleg: [{ icoon, tekst }] }
// Een model mag de primaire waarde ook als cijfer met `primair: true` aanleveren; hij wordt hier de ene grote waarde en dan blijft het label van de meter staan.
// Toetsen staan in de tekst als {SPATIE}, {E}, {WASD}: de strook toont ze als toetsplaatje (en een controller als zijn knop). De echte glyphHtml (prompts.js) wordt
// in het spel nagelaadd; zonder die (een test) valt het terug op het canonieke .hud-key-plaatje.
let glyph = (token) => `<span class="hud-key" data-gk="${esc(token)}">${esc(token)}</span>`;
let glyphVer = 0;
const zetGlyph = (fn) => { if (typeof fn === 'function') { glyph = fn; glyphVer++; zetUitlegGlyph(fn); } };
const tekstHtml = (t) => esc(t == null ? '' : t).replace(/\{([A-Z0-9]+)\}/g, (_, k) => glyph(k));

export function simHudHtml(m) {
  if (!m) return '';
  let metLabel = !m.primair;
  if (!m.primair && (m.cijfers || []).some((c) => c.primair)) {
    const p = m.cijfers.find((c) => c.primair);
    m = { ...m, primair: { icoon: p.icoon, waarde: p.waarde, naam: p.label }, cijfers: m.cijfers.filter((c) => c !== p) };
    metLabel = true;
  }
  const stappen = (m.stappen || []).length
    ? `<ol class="sh-stappen" aria-label="De stappen">${m.stappen.map((s) => `<li data-stand="${esc(s.stand || 'straks')}"${s.stand === 'nu' ? ' aria-current="step"' : ''}><span class="ds-z-chip">${svg(s.icoon || '', 'ds-z-chip__icoon')}<span class="sh-stap">${esc(s.label)}</span></span></li>`).join('')}</ol>` : '';
  const primair = m.primair
    ? `<div class="sh-primair" role="group" aria-label="${esc(m.primair.naam || '')}: ${esc(m.primair.waarde)}"><span class="sh-primair__badge">${svg(m.primair.icoon || '', 'ds-icoon sh-primair__icoon')}</span><span class="sh-primair__tekst"><span class="ds-t-label sh-primair__naam">${esc(m.primair.naam || '')}</span><span class="sh-groot${String(m.primair.waarde).length > 7 ? ' sh-groot--lang' : ''}">${esc(m.primair.waarde)}</span></span></div>` : '';
  const meter = m.meter
    ? `<div class="ds-z-balk ds-z-balk--rij sh-meter${m.meter.staat ? ' sh-meter--' + esc(m.meter.staat) : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(m.meter.pct)}" aria-label="${esc(m.meter.naam || 'Voortgang')}" style="--ds-z-w:${Math.round(m.meter.pct)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span>${m.meter.label && (metLabel || m.meter.toon) ? `<span class="ds-z-balk__label">${esc(m.meter.label)}</span>` : ''}</div>` : '';
  const cijfers = (m.cijfers || []).length
    ? `<ul class="sh-cijfers" aria-label="Details">${m.cijfers.map((c) => `<li${c.staat ? ' data-staat="' + esc(c.staat) + '"' : ''} title="${esc(c.label)}" aria-label="${esc(c.label)}: ${esc(c.waarde)}">${svg(c.icoon || '', 'ds-icoon ds-icoon--klein sh-cijfer__icoon')}<span class="sh-cijfer__naam">${esc(c.label)}</span> <span class="sh-waarde">${esc(c.waarde)}</span></li>`).join('')}</ul>` : '';
  // #989: de eerste-keer-uitleg als stappen met een groot icoon of toetsplaatje en een korte lus (uitleg.js); uit in Instellingen = de oude regels
  const iconen = (m.uitleg || []).length && uitlegIconenAan() ? uitlegModel(m.uitleg, { id: m.id, titel: 'Zo werkt het', controller: m.controller }) : null;
  if (iconen) startUitleg();
  const uitleg = iconen ? uitlegHtml(iconen, { compact: true })
    : (m.uitleg || []).length
    ? `<ul class="sh-uitleg" aria-label="Zo werkt het">${m.uitleg.map((u) => `<li><span class="ds-z-chip">${svg(u.icoon || '', 'ds-z-chip__icoon')}</span><span class="ds-t-hulp">${tekstHtml(u.tekst)}</span></li>`).join('')}</ul>` : '';
  return `<header class="sh-kop">${svg(m.icoon || '', 'ds-icoon ds-icoon--klein sh-icoon')}<span class="sh-titel ds-t-label">${esc(m.titel || '')}</span>${m.plek ? `<span class="ds-z-chip sh-plek">${esc(m.plek)}</span>` : ''}</header>` +
    stappen + primair + meter + `<p class="sh-nu${m.slecht ? ' sh-nu--slecht' : ''}" aria-live="polite">${tekstHtml(m.nu || '')}</p>` + cijfers + uitleg +
    (m.uitleg && m.uitleg.length ? [].concat(m.hulp || []) : []).map((t) => `<p class="ds-t-hulp sh-hulp">${tekstHtml(t)}</p>`).join('');
}

// #804: het model is data; zijn JSON-vingerafdruk (plus de toetsplaatjes-versie) is een veelvoud goedkoper dan de hele HTML-string met esc, svg en icoon elk beeld.
export function modelSleutel(m) { try { return glyphVer + '|' + ((m && m.uitleg && m.uitleg.length) ? uitlegInstellingSleutel() : '') + '|' + JSON.stringify(m); } catch (e) { return null; } }
let el = null, inhoud = null, pop = null, sleutel = '', popT = 0;

function bouw() {
  if (el || typeof document === 'undefined' || !document.body || !document.createElement) return;
  el = document.createElement('section');
  el.id = 'sh-hud';
  el.className = 'sh-hud ds-z-kaart ds-z-kaart--recht';
  el.setAttribute('aria-label', 'Wat je nu doet');
  el.hidden = true;
  inhoud = document.createElement('div');
  inhoud.className = 'sh-inhoud';
  pop = document.createElement('span');
  pop.className = 'sh-pop ds-t-cijfer';
  pop.setAttribute('aria-hidden', 'true');
  el.appendChild(inhoud);
  // in #hud: dan geldt de schaal (--ui, Tekstgrootte) ook voor de strook; zonder #hud (test, web zonder HUD) op de body
  const hud = document.getElementById ? document.getElementById('hud') : null;
  (hud || document.body).appendChild(el);
  (hud || document.body).appendChild(pop);
  try { import('./prompts.js').then((m) => zetGlyph(m.glyphHtml)).catch(() => {}); } catch (e) { /* geen toetsplaatje is geen ramp */ } // het getal staat los van de kaart: het blijft ook staan als de strook net verdwijnt (einde van een ronde)
}

// Elk beeld van de sim: toont of verbergt de strook en schrijft alleen bij een verschil. null verbergt hem.
let laatsteTik = 0;
export function simHudTik(dt, m) {
  // de sims geven dt = 0 mee: dan meten we zelf, zodat het opspringende getal na 2,6 s weggaat (ook bij verminderde beweging)
  const nu = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!(dt > 0)) dt = laatsteTik ? Math.min(0.25, Math.max(0, (nu - laatsteTik) / 1000)) : 0;
  laatsteTik = nu;
  if (popT > 0) { popT -= dt; if (popT <= 0 && pop) { pop.classList.remove('sh-pop--aan', 'sh-pop--stil'); pop.textContent = ''; } }
  if (!m) { if (el && !el.hidden) el.hidden = true; sleutel = ''; return; }
  bouw();
  if (!el) return;
  if (el.hidden) el.hidden = false;
  const mk = modelSleutel(m);
  if (mk !== null && mk === sleutel) return;
  sleutel = mk;
  inhoud.innerHTML = simHudHtml(m);
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

