// De kaart "Hoe pittig moet het zijn?" op het scherm (#1169; difficultycard.js is de regel en de tekst). Dezelfde overlay als de
// startkeuze (#online-start, .os-overlay): de bootwachter en de laadschermlaag kennen hem, en de stijl (DS3: toets in de knop,
// zichtbare focus, microanimatie uit bij Beweging beperken) komt uit onlineconsent.css (.dk-*). Toetsen: zie levelKeyAction en
// optionsKeyAction; een controller geeft dezelfde toetsen (input.js). Geen netwerk, geen opslag: het antwoord is een profiel.
import { keyLabelHtml, keyTextHtml } from './keycap.js';
import { icoon } from './icons.js';
import { trapTabInCard } from './listnav.js';
import { DIFFICULTY_DEFAULT, cleanProfile, setActiveDifficulty, difficultySummary } from './difficulty.js';
import { escapeHtml as esc } from './htmlescape.js';
import {
  CARD_TEXT, OPTION_DEFS, OPTION_GROUPS, levelCards, levelMeters, levelKeyAction, optionsKeyAction, stepDraft, draftLabel, draftLevel, difficultyPlan, needsDifficultyCard,
} from './difficultycard.js';

const helpHtml = (lijst) => `<p class="sk-hulp">${lijst.map((h) => `<span>${keyTextHtml(esc(h))}</span>`).join('')}</p>`;

// #1227: tijd, politie en verkeer per niveau als icoon, woord en blokjes (vorm en woord naast kleur; het woord leest de schermlezer)
function metersHtml(level) {
  const rij = (m) => `<span class="dk-meter" data-n="${m.n}">${icoon(m.icoon)}<span class="dk-meter-l">${esc(m.label)}</span><span class="dk-blok" aria-hidden="true"><i></i><i></i><i></i></span><span class="dk-meter-w">${esc(m.woord)}</span></span>`;
  return `<span class="dk-meters">${levelMeters(level).map(rij).join('')}</span>`;
}

// De niveau-weergave: drie knoppen met een korte beschrijving en daaronder "Aanpassen".
export function levelViewHtml(profile) {
  const p = cleanProfile(profile);
  const knoppen = levelCards().map((c, i) => `<button type="button" class="sk-keuze dk-keuze" data-niveau="${c.id}" data-i="${i}"${c.id === p.level ? ' data-voorkeur' : ''} aria-describedby="dk-u-${c.id}" aria-keyshortcuts="${c.toets}">
      <span class="sk-toets">${keyLabelHtml(c.toets)}</span>
      <span class="sk-label">${esc(c.label)}</span>
      ${c.aanbevolen ? `<span class="dk-tag">${esc(CARD_TEXT.aanbevolen)}</span>` : ''}
      <span class="sk-uitleg" id="dk-u-${c.id}">${esc(c.uitleg)}</span>
      ${metersHtml(c.id)}
    </button>`).join('');
  return `<section class="os-kaart sk-kaart dk-kaart" role="dialog" aria-modal="true" aria-labelledby="dk-titel" aria-describedby="dk-intro">
    <p class="os-eb">${esc(CARD_TEXT.eyebrow)}</p>
    <h2 id="dk-titel">${esc(CARD_TEXT.titel)}</h2>
    <p class="os-uitleg" id="dk-intro">${esc(CARD_TEXT.uitleg)}</p>
    <div class="sk-knoppen dk-knoppen" role="group" aria-label="${esc(CARD_TEXT.aria)}">${knoppen}</div>
    <div class="os-knoppen dk-onder"><button type="button" class="os-knop os-alleen dk-aanpassen" data-aanpassen data-i="3" aria-keyshortcuts="4">${esc(CARD_TEXT.aanpassen)} <span class="sk-toets-in">${keyLabelHtml('4')}</span><span class="dk-aanpassen-u">${esc(CARD_TEXT.aanpassenUitleg)}</span></button></div>
    ${helpHtml(CARD_TEXT.hulp)}
  </section>`;
}

// De opties-weergave: elke optie een rij met de waarde van dit concept, onderaan "Klaar".
export function optionsViewHtml(profile) {
  const p = cleanProfile(profile);
  let i = 0;
  const groups = OPTION_GROUPS.map(([id, naam]) => {
    const rijen = OPTION_DEFS.filter((d) => d.groep === id).map((d) => {
      const custom = Object.prototype.hasOwnProperty.call(p.custom, d.key);
      const html = `<button type="button" class="dk-rij" data-optie="${d.key}" data-i="${i}"${custom ? ' data-custom' : ''} aria-describedby="dk-ru-${d.key}">
        <span class="dk-rij-naam">${esc(d.label)}<span class="dk-rij-u" id="dk-ru-${d.key}">${esc(d.uitleg)}</span></span>
        <span class="dk-rij-waarde"><span class="dk-chev">${icoon('terug')}</span><output>${esc(draftLabel(p, d.key))}</output><span class="dk-chev">${icoon('volgende')}</span></span>
      </button>`;
      i++;
      return html;
    }).join('');
    return rijen ? `<p class="dk-groep">${esc(naam)}</p>${rijen}` : '';
  }).join('');
  return `<section class="os-kaart sk-kaart dk-kaart dk-opties" role="dialog" aria-modal="true" aria-labelledby="dk-titel" aria-describedby="dk-intro">
    <p class="os-eb">${esc(difficultySummary(p))}</p>
    <h2 id="dk-titel">${esc(CARD_TEXT.optiesTitel)}</h2>
    <p class="os-uitleg" id="dk-intro">${esc(CARD_TEXT.optiesUitleg)}</p>
    <div class="dk-lijst" role="group" aria-label="${esc(CARD_TEXT.optiesTitel)}">${groups}</div>
    <div class="os-knoppen"><button type="button" class="os-knop os-doorgaan dk-klaar" data-klaar data-i="${OPTION_DEFS.length}">${esc(CARD_TEXT.klaar)}</button></div>
    ${helpHtml(CARD_TEXT.optiesHulp)}
  </section>`;
}

let open = null; // één kaart tegelijk
function backdrop() {
  const el = document.createElement('div');
  el.id = 'online-start';
  el.className = 'os-overlay';
  document.body.appendChild(el);
  return el;
}

// Resolvet met het gekozen profiel ({ level, custom }). Geen time-out: de kaart wacht op de speler.
export function openDifficultyCard({ profile = { level: DIFFICULTY_DEFAULT } } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(cleanProfile(profile));
  let draft = cleanProfile(profile);
  const el = backdrop();
  let view = 'niveau';
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const items = () => [...el.querySelectorAll('[data-i]')];
  const zet = (i) => { const b = items()[i]; if (b) b.focus(); };
  const huidig = () => { const b = items().indexOf(document.activeElement); return b < 0 ? 0 : b; };
  const toon = (v, focusAt) => {
    view = v;
    el.innerHTML = v === 'niveau' ? levelViewHtml(draft) : optionsViewHtml(draft);
    if (focusAt != null) zet(focusAt);
  };
  const sluit = (p) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    klaar(cleanProfile(p));
  };
  const pickLevel = (level) => { draft = draftLevel(draft, level); sluit(draft); };
  const changeOption = (optie, s) => {
    draft = stepDraft(draft, optie, s);
    const i = huidig();
    toon('opties', i);
  };
  const rijIndex = (i) => items()[i] && items()[i].dataset.optie;
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { // aria-modal: Tab blijft op de kaart
      const v = trapTabInCard(items(), document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); }
      return;
    }
    let a;
    const i = huidig();
    if (view === 'niveau') a = levelKeyAction(e.key, i);
    else a = optionsKeyAction(e.key, i, OPTION_DEFS.length);
    if (!a) return; // de rest blijft gewoon werken
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat && a.stap == null && a.focus == null) return;
    if (a.focus != null) zet(a.focus);
    else if (a.kies) pickLevel(a.kies);
    else if (a.aanpassen) toon('opties', 0);
    else if (a.stap != null) changeOption(rijIndex(i), a.stap);
    else if (a.klaar) sluit(draft);
    else if (a.terug) toon('niveau', 3);
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-i]') : null;
    if (!t) return;
    if (t.dataset.niveau) pickLevel(t.dataset.niveau);
    else if (t.hasAttribute('data-aanpassen')) toon('opties', 0);
    else if (t.hasAttribute('data-klaar')) sluit(draft);
    else if (t.dataset.optie) changeOption(t.dataset.optie, 'rond');
  });
  el.addEventListener('mouseover', (e) => { const t = e.target && e.target.closest ? e.target.closest('[data-i]') : null; if (t && document.activeElement !== t) t.focus(); }); // de muis volgt de focus
  open = { promise, el };
  toon('niveau', 1); // voorselectie: Standaard
  return promise;
}

// De hele vraag voor een nieuw spel: slaat zichzelf over in een testrun (het niveau is dan Standaard of de vlag) en zet de
// uitkomst als actieve moeilijkheid, zodat de eerste save hem meeschrijft (savegame.js).
export async function askNewGameDifficulty({ plan, fresh = false, hasSave = false, open: openCard = openDifficultyCard } = {}) {
  const p = plan || difficultyPlan();
  if (!needsDifficultyCard({ fresh, hasSave })) return null;
  const profile = p.ask ? await openCard({ profile: { level: p.level } }) : { level: p.level, custom: {} };
  return setActiveDifficulty(profile);
}
