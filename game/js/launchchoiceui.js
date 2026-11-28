// De startkeuze op het scherm (launchchoice.js is de regel en de tekst): de kaart "Hoe wil je spelen?" met twee grote
// knoppen, en de toestemmingskaart voor Samen spelen. Dezelfde overlay (#online-start, .os-overlay) als de naamkaart,
// dus de bootwachter en de laadschermlaag kennen hem al. Geen netwerk: de kaarten leggen alleen een antwoord vast.
// Toetsen: pijlen en WASD, 1 en 2, Enter of spatie, Escape of Backspace (Alleen). Een controller geeft dezelfde toetsen (input.js).
import { icoon } from './icons.js';
import { keyLabelHtml, keyTextHtml } from './keycap.js';
import { KEUZES, LAUNCH_TEXT, TOESTEMMING_TEKST, toetsActie, rolVoorkeur } from './launchchoice.js';
import { geefToestemming, moetNaamVragen, moetToestemmingVragen } from './onlineconsent.js';
import { openOnlineStart, meerInfoHtml, wieZietWatHtml } from './onlineconsentui.js';
import { getSettings } from './settings.js';
import { trapTabInCard, bewaarFocus } from './listnav.js';
import { knopToets } from './dsbutton.js';
import { menuItems, startFocus, menuToets, uitkomstVan, nieuwSpelPlan, ladenPlan, heldRegels, samenKeuzePlan, samenGekozen } from './hoofdmenu.js';
import { isPauseMenuOpen } from './pausestate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// De keuzekaart. `index` is de knop die de voorselectie heeft (alleen voor data-voorkeur; de focus zet mountStartKeuze).
export function launchChoiceHtml({ index = 0 } = {}) {
  const knoppen = KEUZES.map((c, i) => `<button type="button" class="sk-keuze" data-keuze="${c.id}" data-i="${i}"${i === index ? ' data-voorkeur' : ''} aria-describedby="sk-u-${c.id}" aria-keyshortcuts="${c.toets}">
      <span class="sk-ic">${icoon(c.icoon, { cls: 'sk-icoon' })}</span>
      <span class="sk-label">${esc(c.label)}</span>
      <span class="sk-toets">${keyLabelHtml(c.toets)}</span>
      <span class="sk-uitleg" id="sk-u-${c.id}">${esc(c.uitleg)}</span>
    </button>`).join('');
  return `<section class="os-kaart sk-kaart" role="dialog" aria-modal="true" aria-labelledby="sk-titel">
    <p class="os-eb">${esc(LAUNCH_TEXT.eyebrow)}</p>
    <h2 id="sk-titel">${esc(LAUNCH_TEXT.titel)}</h2>
    <div class="sk-knoppen" role="group" aria-label="${esc(LAUNCH_TEXT.aria)}">${knoppen}</div>
    <p class="sk-hulp">${LAUNCH_TEXT.hulp.map((h) => `<span>${keyTextHtml(esc(h))}</span>`).join('')}</p>
  </section>`;
}

export function toestemmingHtml() {
  const T = TOESTEMMING_TEKST;
  return `<section class="os-kaart sk-kaart" role="dialog" aria-modal="true" aria-labelledby="st-titel">
    <p class="os-eb">${esc(T.eyebrow)}</p>
    <h2 id="st-titel">${esc(T.titel)}</h2>
    <label class="os-consent"><input type="checkbox" class="m-sw os-consent-vink"> <span>${esc(T.consent)}</span></label>
    <p class="os-lead">${esc(T.info)}</p>${wieZietWatHtml()}
    <p class="os-fout" role="alert" hidden>Vink eerst het akkoord aan om verder te gaan.</p>
    <div class="os-knoppen">
      <button type="button" class="os-knop os-doorgaan" data-geef aria-keyshortcuts="Enter">${esc(T.geef)} <span class="sk-toets-in">${keyTextHtml('{ENTER}')}</span></button>
      <button type="button" class="os-knop os-alleen" data-terug aria-keyshortcuts="Escape">${esc(T.terug)} <span class="sk-toets-in">${keyTextHtml('{ESC}')}</span></button>
    </div>
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

// Resolvet met 'alleen' of 'samen'. Geen time-out: de kaart wacht op de speler (de bootwachter staat stil zolang #online-start bestaat).
export function openLaunchChoice({ index = 0 } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve('alleen');
  const el = backdrop();
  el.innerHTML = launchChoiceHtml({ index });
  const knoppen = [...el.querySelectorAll('.sk-keuze')];
  let nu = Math.min(Math.max(index, 0), knoppen.length - 1);
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const zet = (i) => { nu = i; knoppen[i].focus(); };
  const sluit = (modus) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    klaar(modus);
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { // aria-modal: Tab blijft op de kaart
      const v = trapTabInCard(knoppen, document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); nu = knoppen.indexOf(v); }
      return;
    }
    const i = knoppen.indexOf(document.activeElement);
    const a = toetsActie(e.key, i < 0 ? nu : i);
    if (!a) return; // de rest blijft gewoon werken
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (a.focus != null) zet(a.focus); else if (a.kies) sluit(a.kies);
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.sk-keuze') : null;
    if (b) sluit(b.dataset.keuze);
  });
  knoppen.forEach((b, i) => b.addEventListener('mouseenter', () => zet(i))); // de muis volgt de focus: de knop onder de muis is de gekozen knop
  open = { promise, el };
  zet(nu);
  return promise;
}

// Het hoofdmenu (ontwerp Spel-UI 24-11, hoofdmenu.js is de regel): Doorgaan met het laatste spel als held, Nieuw spel, Opgeslagen spellen, Samen
// spelen, Instellingen en Afsluiten. Resolvet met 'alleen' of 'samen', net als de keuzekaart die hij vervangt; Nieuw spel en Opgeslagen spellen
// leggen eerst de plek vast voor de boot (startNewSlot, markStay) en geven dan 'alleen'. Een bestaande save wordt hier nooit gewijzigd of gewist.
const DESKTOP_HM = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

export function hoofdmenuHtml({ items, summary, thumb, melding = '', versie = '' } = {}) {
  const regels = heldRegels(summary);
  const ic = (n, cls = 'sp-ic') => icoon(n, { cls });
  const held = items.find((x) => x.held);
  const heldHtml = held.id === 'doorgaan' && regels
    ? `<button type="button" class="sp-doorgaan" data-hm="doorgaan" data-i="0"><div class="sp-thumb${thumb ? '' : ' sp-thumb--leeg'}"${thumb ? ` style="background-image:url('${thumb}')"` : ''}></div><span class="sp-doorgaan__body"><span class="sp-doorgaan__kop"><span>Doorgaan</span>${knopToets('ENTER')}</span><span class="sp-doorgaan__regel"><b>${esc(regels.naam)}</b> · ${esc(regels.wie)}</span>${regels.stap ? `<span class="sp-doorgaan__regel">${esc(regels.stap)}</span>` : ''}<span class="sp-doorgaan__regel">${esc(regels.meta)}</span></span></button>`
    : `<button type="button" class="sp-doorgaan sp-doorgaan--groot" data-hm="nieuw" data-i="0"><span class="sp-doorgaan__body"><span class="sp-doorgaan__kop"><span>Nieuw spel</span>${knopToets('ENTER')}</span><span class="sp-doorgaan__regel">${esc(held.uitleg)}</span></span></button>`;
  const rij = (x, i) => `<button type="button" class="sp-keuze" data-hm="${x.id}" data-i="${i}">${ic(x.icoon)}<span><b>${esc(x.label)}</b><span>${esc(x.uitleg)}</span></span>${x.meta ? `<span class="sp-hulp">${esc(x.meta)}</span>` : `<span class="sp-keuze__toets" aria-hidden="true">${keyLabelHtml(String(i + 1))}</span>`}</button>`;
  const rest = items.map((x, i) => [x, i]).filter(([x]) => !x.held);
  return `<div class="gm gm-zeef sp-hm-wrap"><div class="gm-stage ds-zeef"><aside class="sp-menu" role="dialog" aria-modal="true" aria-label="Hoofdmenu">` +
    `<div class="sp-logo"><span class="sp-logo__mark">GDE</span><div><span class="sp-logo__sign">Groningen</span><small>Zomer vol misdaad</small></div></div>${heldHtml}` +
    `<div class="sp-keuzes" role="menu">${rest.map(([x, i]) => rij(x, i)).join('')}</div><p class="sp-hulp sp-hm-melding" role="status" data-hm-melding>${esc(melding)}</p>` +
    `<div class="sp-menu__hints"><div class="hints"><span>${keyTextHtml('{ARROWS} kiezen')}</span><span>${keyTextHtml('{ENTER} doen')}</span></div></div>` +
    `<div class="sp-menu__voet"><span class="sp-pegi" aria-label="Vanaf 18 jaar">18</span><span>${esc(versie)}</span></div></aside></div></div>`;
}

// De zware modules (opslag, opgeslagen spellen, versie) komen pas als het menu opent: dit bestand blijft lichtgewicht voor de tests (launchchoice_test).
export async function openHoofdmenu({ index = 0 } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return 'alleen';
  const [SG, S, UI, MM, VV] = await Promise.all([import('./savegame.js'), import('./saveslots.js'), import('./saveslotsui.js'), import('./menumodels.js'), import('./version.js')]);
  const { hasSave, getSaveSummary, startNewSlot } = SG;
  const { listSlots, freeSlot, readThumb, markStay } = S;
  const openSaveSlots = UI.openSaveSlots;
  if (open) return open.promise;
  // dezelfde keuze als de boot straks maakt (laatst bewaarde plek, een verse plek of een gekozen plek), zodat de held het spel toont dat Doorgaan opent
  try { SG.ensureLatestSlot(); } catch (e) { /* geen opslag: het menu toont dan Nieuw spel */ }
  const heeftSave = (() => { try { return hasSave(); } catch (e) { return false; } })();
  const summary = heeftSave ? (() => { try { return getSaveSummary(); } catch (e) { return null; } })() : null;
  const aantal = (() => { try { return listSlots(null).length; } catch (e) { return 0; } })();
  const metSave = heeftSave && !!summary;
  const items = menuItems({ heeftSave: metSave, desktop: !!DESKTOP_HM, aantal });
  const thumb = summary ? readThumb(null, summary.slot) : '';
  const el = backdrop();
  el.classList.add('sp-hm');
  el.innerHTML = hoofdmenuHtml({ items, summary, thumb, versie: MM.versionLabel(VV.VERSION) });
  const knoppen = [...el.querySelectorAll('[data-hm]')].sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i));
  const melding = el.querySelector('[data-hm-melding]');
  let nu = startFocus(items, getSettings().startKeuze);
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const zet = (i) => { nu = i; knoppen.forEach((b, k) => b.setAttribute('aria-current', String(k === i))); knoppen[i].focus({ preventScroll: true }); };
  const zegt = (t) => { melding.textContent = t || ''; };
  const sluit = (modus) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    klaar(modus);
  };
  // wat de boot straks doet met de keuze voor Samen spelen: een gekozen plek blijft de plek, Nieuw spel een verse plek (nooit een overschrijving)
  const gekozenSamen = (keuze) => {
    // staat er al een verse plek klaar (Nieuw spel gekozen, daarna Terug uit naam, akkoord of sessiekeuze), dan komt er geen tweede bij
    const heeft = (metSave || aantal > 0) && !SG.isFreshStart();
    const g = samenGekozen(keuze, { heeftSave: heeft, vrijePlek: !!freeSlot(null) });
    if (g.actie === 'vol') { zegt(g.tekst); zet(nu); return; }
    if (g.actie === 'nieuwe-plek' && !startNewSlot()) { zegt('Er kon geen nieuwe plek worden gemaakt; je spellen zijn niet veranderd.'); zet(nu); return; }
    // een verse plek van een eerdere keuze (Terug uit de sessiekeuze) mag de boot niet als "Nieuw spel" op deze plek laten beginnen: de gekozen plek is een bestaand spel
    if (g.soort === 'plek') { S.clearFresh(null); markStay(null, g.n); }
    if (g.soort === 'geen') { zet(nu); return; }
    sluit('samen');
  };
  const doe = (id) => {
    if (id === 'doorgaan') { sluit(uitkomstVan(id)); return; }
    if (id === 'samen') {
      // 28-11: eerst de opslagkeuze (lokaal, er gaat niets over het netwerk), daarna naam, akkoord en de sessiekeuze (launchchoice.js askLaunchChoice)
      const plan = samenKeuzePlan({ aantal: listSlots(null).length, rol: rolVoorkeur(getSettings()) });
      if (plan.actie === 'nieuw') { gekozenSamen('nieuw'); return; }
      openSaveSlots({
        mode: 'start', pick: true, nieuwEerst: true, eyebrow: plan.eyebrow, titel: plan.titel, hint: plan.hint, loadLabel: plan.loadLabel,
        onPick: (n) => gekozenSamen(n),
        onNew: () => gekozenSamen('nieuw'),
        onClose: () => zet(nu),
      });
      return;
    }
    if (id === 'nieuw') {
      const plan = nieuwSpelPlan({ heeftSave: metSave || (aantal > 0 && !SG.isFreshStart()), vrijePlek: !!freeSlot(null) });
      if (plan.actie === 'vol') { zegt(plan.tekst); return; }
      if (plan.actie === 'nieuwe-plek' && !startNewSlot()) { zegt('Er kon geen nieuwe plek worden gemaakt; je spellen zijn niet veranderd.'); return; }
      sluit('alleen');
      return;
    }
    if (id === 'laden') {
      openSaveSlots({
        mode: 'start', solo: true, eyebrow: 'Hoofdmenu', titel: 'Opgeslagen spellen',
        onLoad: (n) => { const p = ladenPlan(n); if (p.actie === 'stay') markStay(null, p.n); sluit('alleen'); },
        onNew: () => { if ((metSave || (aantal > 0 && !SG.isFreshStart())) && !startNewSlot()) { zegt('Er kon geen nieuwe plek worden gemaakt; je spellen zijn niet veranderd.'); return; } sluit('alleen'); },
        onClose: () => zet(nu),
      });
      return;
    }
    if (id === 'instellingen') {
      import('./pausemenu.js').then((m) => m.openPauseMenu('settings', { prestart: true, onClose: () => zet(nu) })).catch((e) => { console.warn('instellingen vanuit het hoofdmenu', e); zegt('Instellingen openen lukte niet.'); });
      return;
    }
    if (id === 'afsluiten' && DESKTOP_HM && DESKTOP_HM.quit) DESKTOP_HM.quit();
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isPauseMenuOpen() || document.getElementById('saveslots')) return; // Instellingen en Opgeslagen spellen hebben hun eigen toetsen
    const a = menuToets(e.key, nu, items);
    if (!a) { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); } return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (a.focus != null) zet(a.focus); else if (a.kies) doe(a.kies);
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => { const b = e.target && e.target.closest ? e.target.closest('[data-hm]') : null; if (b) { zet(Number(b.dataset.i)); doe(b.dataset.hm); } });
  knoppen.forEach((b, i) => b.addEventListener('mouseenter', () => { if (!isPauseMenuOpen()) zet(i); }));
  open = { promise, el };
  zet(Math.min(Math.max(nu, 0), knoppen.length - 1));
  return promise;
}

// Resolvet met true (akkoord, bewaard in gde-settings) of false (Terug naar de keuzekaart). Alleen na Samen zonder bewaarde toestemming.
export function openToestemming({ zet = undefined } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(false);
  const terugFocus = bewaarFocus(); // de knop die de kaart opende krijgt de focus terug
  const el = backdrop();
  el.innerHTML = toestemmingHtml();
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const sluit = (ok) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    terugFocus();
    klaar(ok);
  };
  const vink = el.querySelector('.os-consent-vink');
  const fout = el.querySelector('.os-fout');
  const geef = () => {
    if (!vink.checked) { fout.hidden = false; vink.focus(); return; }
    geefToestemming(zet ? { zet } : {});
    sluit(true);
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { // aria-modal: Tab blijft op de kaart
      const v = trapTabInCard([...el.querySelectorAll('.os-consent-vink, .os-info summary, [data-geef], [data-terug]')], document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (e.target && e.target.closest && e.target.closest('input[type="text"]')) return;
      e.preventDefault(); e.stopPropagation(); sluit(false);
      return;
    }
    // #1225 (hertest 24-11): Enter staat als toets in de knop Akkoord, dus Enter doet dat ook vanaf de schakelaar (een knop of Meer info doet zelf)
    if (e.key === 'Enter' && !e.repeat) {
      if (e.target && e.target.closest && e.target.closest('button, summary')) return;
      e.preventDefault(); e.stopPropagation(); geef();
    }
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-geef], [data-terug]') : null;
    if (!t) return;
    if (t.hasAttribute('data-terug')) sluit(false); else geef();
  });
  open = { promise, el };
  vink.focus();
  return promise;
}

// De poort voor alles wat met Samen spelen begint buiten de keuzekaart (het hoofdmenu, het paneel in het pauzemenu): is er nog
// geen naam, dan de kaart met naam en akkoord; is alleen het akkoord weg, dan alleen de toestemmingskaart. Resolvet true als de
// speler klaar is (of al klaar was), false bij Terug. Wie al een naam en akkoord heeft ziet niets.
export async function ensureSamenProfile() {
  const s = () => getSettings();
  if (moetNaamVragen(s())) { if (!(await openOnlineStart({ terug: true }))) return false; }
  if (moetToestemmingVragen(s())) { if (!(await openToestemming())) return false; }
  return !moetNaamVragen(s()) && !moetToestemmingVragen(s());
}
