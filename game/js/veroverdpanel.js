// Veroverd (#414, #435): de gebieden die je hebt veroverd. Hoort bij het verhaal, dus een tabblad onder Verhaal (eerst een
// weergave van Loopbanen). De gegevens en de tekst komen uit gebiedenui.js; dit bestand tekent het tabblad en bindt de klikken.
// #492: onderaan staat de Beleidswinkel: een klein, lokaal en blijvend voordeel per speler (beleidswinkel.js).
// #906: de kop is een hero met de stand, daaronder de eerstvolgende taken als kaarten, de uitleg
// met de echte aantallen en pas dan de lijst met provincies en gebieden. Kop, stand, taken en
// uitleg zitten samen in één scrolvlak, zodat de taken altijd in beeld beginnen.
import { icoon } from './icons.js';
import { keepFocus } from './focusbehoud.js';
import { gebiedenHtml, kiesGebied, reisNaar, volgendeTaken, soortenStand, GEBIEDEN_CSS } from './gebiedenui.js';
import { bekijkIntocht } from './intochten.js';
import { fillBars } from './motion.js';
import { setUserWaypoint, formatDistance } from './routing.js';
import { hoofdspeler } from './players.js';
import { beleidPaneelHtml, koopBeleid, getBeleid } from './beleidswinkel.js';

const bars = new Map();
let cssAan = false;
let sluitMenu = null;
let laatsteTaken = [];
let tab = 'gebieden'; // het open tabblad: 'gebieden' of 'beleid'
let gekozenGebied = null; // het gebied waarvan de uitleg rechts staat; een nieuwe tekening zet het paneel terug, dus ook dit

// De tabbladen wisselen zonder het paneel opnieuw te tekenen: de focus en de scrolstand van het andere blijven staan.
function zetTab(el, id) {
  if (id !== 'gebieden' && id !== 'beleid') return;
  tab = id;
  for (const t of el.querySelectorAll('[data-vo-tab]')) t.setAttribute('aria-selected', String(t.dataset.voTab === id));
  for (const b of el.querySelectorAll('[data-vo-body]')) b.hidden = b.dataset.voBody !== id;
}

const CSS = `${GEBIEDEN_CSS}
/* #980 fase 3: twee tabbladen (Gebieden, Beleidswinkel). De Beleidswinkel stond onder een gebiedenpaneel van 5000 px en was op 900p niet
   te bereiken; nu heeft hij een eigen tabblad dat zelf scrolt. Gebieden is één scrolvlak: kop, taken, uitleg en dan de lijst. */
.vo-tabs { flex: none; margin: 24px 24px 12px; }
.vo-tabs .ds-z-tab small { font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-hulp); letter-spacing: 0; text-transform: none; }
.vo-gebieden { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; padding-bottom: 24px; }
.vo-gebieden[hidden], .vo-beleidtab[hidden] { display: none; }
.vo-gebieden > .m-main { flex: none; height: clamp(360px, 62vh, 640px); padding: 0 24px; }
.vo-beleidtab { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; padding: 0 24px 28px; }
.vo-beleidtab .bw-beleid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); align-items: start; margin-top: 0; }
.vo-beleidtab .bw-beleid > :not(.bw-rij) { grid-column: 1 / -1; }
.vo-gebieden::-webkit-scrollbar, .vo-beleidtab::-webkit-scrollbar { width: var(--ds-scroll-breed); height: var(--ds-scroll-breed); }
.vo-gebieden::-webkit-scrollbar-thumb, .vo-beleidtab::-webkit-scrollbar-thumb { background: var(--ds-scroll-duim); border: 2px solid var(--ds-scroll-spoor); border-radius: var(--ds-scroll-rond); }
.vo-top { flex: none; padding-top: 0; }
.vo-top .pm-hero { flex: none; }
.vo-hero { margin: 0 24px 16px; }
.vo-hero .pm-hero-t { font-size: 40px; }
.vo-kop { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; }
.vo-kop .m-num { font-size: 30px; }
.vo-uitleg { flex: none; margin: 0 24px 14px; padding: 10px 16px 12px; border-radius: 12px; background: color-mix(in srgb, var(--ink) 4%, transparent); box-shadow: inset 0 0 0 1px var(--line); }
.vo-uitleg > b, .vo-volgende > b { display: block; margin-bottom: 2px; font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 24px; letter-spacing: 0.04em; }
.vo-soort-kop { margin-top: 4px; }
.vo-soorten { list-style: none; margin: 6px 0 2px; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2px 18px; }
.vo-soorten li { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-family: var(--ds-font-zeef-tekst); font-size: max(13px, var(--menu-min, 13px)); line-height: 1.35; }
.vo-soorten li .one { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vo-soorten .vo-soort-tel { margin-left: auto; white-space: nowrap; font-family: var(--ds-font-zeef-kop); font-size: 18px; letter-spacing: 0.03em; color: var(--g); }
.vo-regel { margin: 6px 0 0; padding: 0; font-family: var(--ds-font-zeef-tekst); font-size: max(13px, var(--menu-min, 13px)); line-height: 1.4; color: var(--mut); max-width: 760px; }
.vo-regel b { font-weight: normal; color: var(--ink); }
.vo-stats { margin: 0 24px 14px; }
.vo-volgende { margin: 0 24px 16px; padding: 10px 16px 12px; border-radius: 12px; background: color-mix(in srgb, var(--ink) 4%, transparent); box-shadow: inset 0 0 0 1px var(--line); }
.vo-volgende > b { margin-bottom: 6px; }
.vo-volgende ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
.vo-volgende li { min-width: 0; align-self: start; }
.vo-volgende li .ds-z-kaart__titel { font-size: var(--ds-t-subkop); overflow-wrap: anywhere; }
.vo-volgende li .ds-z-chip { min-height: var(--ds-hoogte-chip); }
.vo-volgende li .ds-z-knop { align-self: stretch; min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
.vo-volgende .mut { color: var(--mut); }
@media (max-height: 820px) { .vo-hero .pm-hero-lead, .vo-hero .vo-kop { display: none; } }`;

function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-veroverd';
  el.textContent = CSS;
  document.head.appendChild(el);
}

// De Beleidswinkel (beleidswinkel.js): saldo, knoppen die uitgaan bij te weinig geld en de laatste melding.
let beleidMelding = '';
let beleidWereld = null;
const beleidHtml = () => beleidPaneelHtml(beleidWereld ? beleidWereld.money || 0 : 0, beleidMelding);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// #906: één taak als kaart: het gebied en de soort boven, de taaknaam, de afstand vanaf hier en
// één knop die het als doel op de kaart zet. Alleen wat volgendeTaken() al geeft, geen nieuwe data.
const PIN = icoon('plek', { cls: 'ds-z-chip__icoon' }); // F6: Phosphor via icons.js
function taakKaart(t, world, eerste) {
  const p = world ? hoofdspeler(world) : null;
  const af = p && Number.isFinite(t.x) && Number.isFinite(t.y) ? formatDistance(Math.hypot(t.x - p.x, t.y - p.y)) : '';
  const soort = t.soortNaam ? `${esc(t.soortNaam)} · ` : '';
  const pct = t.totaal > 0 ? Math.min(100, Math.round((t.klaar / t.totaal) * 100)) : 0;
  return `<li class="ds-zeef ds-z-kaart"><div class="ds-z-kaart__kop"><span class="ds-z-kaart__voet">${esc(t.gebied)}</span>${af ? `<span class="ds-z-chip">${PIN}${esc(af)}</span>` : ''}</div>` +
    `<div class="ds-z-kaart__titel">${esc(t.naam)}</div><div class="ds-z-kaart__voet">${soort}in dit gebied</div>` +
    `<div class="ds-z-balk" style="--ds-z-w:${pct}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${t.klaar} van ${t.totaal}</span></div>` +
    `<button type="button" class="ds-z-knop${eerste ? '' : ' ds-z-knop--secundair'}" data-doel="${esc(t.id)}" aria-label="Zet ${esc(t.naam)} als doel op de kaart">Zet als doel</button></li>`;
}

export function renderVeroverdPanel(el, sluit = null, world = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  beleidWereld = world;
  zetCss();
  const teken = () => {
    // een koop in de Beleidswinkel tekent alles opnieuw: de scrolstand van beide tabbladen blijft staan en de gekozen
    // gebiedskaart wordt weer gelezen als "niets gekozen", anders deed een klik op hetzelfde gebied daarna niets (verfijnronde 22-11)
    const scrol = {};
    for (const b of el.querySelectorAll('[data-vo-body]')) scrol[b.dataset.voBody] = b.scrollTop;
    gekozenGebied = null;
    const g = gebiedenHtml();
    const s = g.stats || { klaar: 0, totaal: 0, pct: 0, kaartGedaan: 0, kaartTotaal: 0, kaartPct: 0 };
    const taken = volgendeTaken(3);
    laatsteTaken = taken;
    // #906: de kop zegt waar je staat in gewone taal; de exacte stand staat er als woorden naast,
    // en één zin zegt wat veroveren oplevert.
    const titel = s.totaal && s.klaar >= s.totaal ? 'Heel Grunn is van jou' : s.klaar > 0 ? 'Je bent op weg' : 'Nog niets veroverd';
    const hero = `<section class="pm-hero vo-hero" aria-label="Veroverd"><div class="pm-hero-h"><span class="m-eb">Veroverd</span><span class="pm-badge" data-tone="ok">${s.pct}% van Grunn</span></div>` +
      `<h2 class="pm-hero-t">${esc(titel)}</h2>` +
      `<p class="pm-hero-lead">Doe alles wat er in een gebied te doen is, dan is het van jou: een titel, geld en een vlag op de kaart. Je hoeft niemand kwaad te doen.</p>` +
      // #999 (24-11): "Gebieden: 0 van 72 veroverd" stond hier en in de eerste tegel eronder; met tegels staat het alleen daar
      (s.totaal ? '' : `<div class="pm-hero-meta vo-kop">${g.totaal}</div>`) + '</section>';
    // #1269: zonder gebieden (nog niet geladen) zijn "0 van 0"-tegels leeg gepraat: ze komen er niet
    const stats = `<div class="pm-stats vo-stats">` + (!s.totaal ? '' :
      `<span class="pm-stat" data-tone="accent"><b>${s.klaar}</b><span>van ${s.totaal} gebieden veroverd</span><span class="m-bar${s.klaar ? ' on' : ''}"><i data-bar="vo-gebieden" data-w="${s.pct}"></i></span></span>` +
      `<span class="pm-stat"><b>${s.kaartGedaan}</b><span>van ${s.kaartTotaal} buurten op de kaart verkend (${s.kaartPct}%)</span><span class="m-bar${s.kaartGedaan ? ' on' : ''}"><i data-bar="vo-kaart" data-w="${s.kaartPct}"></i></span></span>`) +
      (s.totaal || taken.length ? volgendeStats(taken) : '') + `</div>`;
    // #906: de eerstvolgende taken staan direct in beeld als kaarten, met per kaart één actie:
    // een doel op de kaart zetten. De gegevens komen uit volgendeTaken(), dezelfde bron als "Te doen".
    const nogTitel = taken.length && Number.isFinite(taken[0].totaal)
      ? '<b>Nog ' + Math.max(0, taken[0].totaal - taken[0].klaar) + ' taken tot de titel van ' + esc(taken[0].gebied) + '.</b> ' : '';
    const voetnoot = `<p class="vo-regel">${nogTitel}Je volgende taak staat ook in <b>Te doen</b>; daar zie je hem met de afstand vanaf hier.</p>`;
    const volgende = taken.length
      ? '<section class="vo-volgende" aria-label="Eerstvolgende taken"><b>Eerstvolgende taken</b><ol>' + taken.map((t, i) => taakKaart(t, world, i === 0)).join('') + '</ol>' + voetnoot + '</section>'
      : '<section class="vo-volgende" aria-label="Eerstvolgende taken"><b>Eerstvolgende taken</b><p class="vo-regel">' + (s.totaal ? 'Alles wat meetelt is gedaan. De titels staan hierboven.' : 'Zodra de gebieden geladen zijn, staat hier je eerstvolgende taak.') + '</p></section>';
    // #676/#906: wat er meetelt met de echte aantallen erbij, en wat bewust niet (de catalogusregel).
    const stand = soortenStand();
    const soortRijen = stand.length
      ? '<ul class="vo-soorten">' + stand.map((r) => `<li><span class="one">${esc(r.naam)}</span><span class="vo-soort-tel">${r.klaar} van ${r.totaal}</span></li>`).join('') + '</ul>' : '';
    const regel = '<section class="vo-uitleg" aria-label="Wat telt mee"><b>Wat telt mee</b>' +
      (soortRijen ? '<p class="vo-regel vo-soort-kop">Per soort, met wat je al deed:</p>' : '') + soortRijen +
      '<p class="vo-regel">Dit telt mee: missies, 39 van de 47 bijbanen, 50 minigame-plekken, vondsten en geheimen. ' +
      'Eierballen, losse geheimen, postgame, lucht en dorpsuitjes tellen bewust niet mee; die staan in hun eigen lijst.</p></section>';
    // #906: de kop, de stand, de taken en de uitleg staan samen in één scrolvlak boven de lijst,
    // zodat de taken altijd in beeld beginnen (en op 720p niet onder de vouw verdwijnen).
    // #980 fase 3: Gebieden en de Beleidswinkel zijn twee tabbladen (Q en E wisselen ze, net als elders in het menu).
    const aangenomen = getBeleid().gekocht.length;
    const tabKnop = (id, label, extra = '') => `<button type="button" role="tab" class="ds-z-tab" data-vo-tab="${id}" aria-selected="${tab === id}">${label}${extra}</button>`;
    // #1269: zonder geladen gebieden geen leeg kaartvlak (een lege lijst met een scheidingslijn en nog eens "wordt nog
    // ingeladen"): de regel bij de eerstvolgende taken zegt al wat er komt
    const kaartVlak = g.lijst
      ? `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}</aside></div>`
      : '';
    const restore = keepFocus(el); // een maatregel kopen tekent het paneel opnieuw: de focus blijft op dezelfde knop (22-11)
    el.innerHTML = `<div class="vo-tabs ds-z-tabs ds-zeef" role="tablist" aria-label="Veroverd">${tabKnop('gebieden', 'Gebieden')}${tabKnop('beleid', 'Beleidswinkel', aangenomen ? ` <small>${aangenomen} aangenomen</small>` : '')}</div>` +
      `<div class="vo-gebieden" data-vo-body="gebieden"${tab === 'gebieden' ? '' : ' hidden'}><div class="vo-top">${hero}${stats}${volgende}${regel}</div>` +
      `${kaartVlak}</div>` +
      `<div class="vo-beleidtab" data-vo-body="beleid"${tab === 'beleid' ? '' : ' hidden'}>${beleidHtml()}</div>`;
    fillBars(el, bars);
    restore();
    for (const b of el.querySelectorAll('[data-vo-body]')) if (scrol[b.dataset.voBody]) b.scrollTop = scrol[b.dataset.voBody];
  };
  teken();
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  const kies = (id) => {
    if (!id || id === gekozenGebied) return;
    gekozenGebied = id;
    for (const b of el.querySelectorAll('[data-gebied]')) { const aan = b.dataset.gebied === id; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
    el.querySelector('.lb-pane').innerHTML = kiesGebied(id);
    queueMicrotask(() => fillBars(el, bars));
  };
  el.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-vo-tab]');
    if (tb) { zetTab(el, tb.dataset.voTab); return; }
    // #492: een maatregel kopen in de Beleidswinkel; daarna tekent het paneel opnieuw.
    const b = e.target.closest('[data-beleid]');
    if (b) {
      const melding = koopBeleid(world, b.dataset.beleid);
      beleidMelding = melding;
      if (world && world.addMessage) world.addMessage(melding, 3);
      teken();
      return;
    }
    // #906: één klik op een taakkaart zet die plek als doel op de kaart (dezelfde route als de kaart).
    const d = e.target.closest('[data-doel]');
    if (d) {
      const t = laatsteTaken.find((x) => x.id === d.dataset.doel);
      if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
        setUserWaypoint(t.x, t.y, t.naam);
        d.textContent = 'Doel staat op de kaart'; // de knop zegt zelf dat het gelukt is, naast de melding
        d.setAttribute('aria-disabled', 'true');
        if (world && world.addMessage) world.addMessage(`Route naar ${t.naam} staat op de kaart.`, 3);
      }
      return;
    }
    const r = e.target.closest('[data-reis]');
    if (r) { reisNaar(r.dataset.reis, r, sluitMenu); return; }
    // #708: de intocht terugkijken vanuit Veroverd
    const i = e.target.closest('[data-intocht]');
    if (i) { bekijkIntocht(i.dataset.intocht); return; }
    const g2 = e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
  el.addEventListener('focusin', (e) => {
    const g2 = e.target.closest && e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
}

// De derde stat: hoeveel taken er nog tot de titel van het eerste gebied. Zonder taken blijft het
// bij een eerlijke regel in plaats van een leeg getal.
function volgendeStats(lijst) {
  if (!lijst.length) return `<span class="pm-stat"><b>0</b><span>taken tot de volgende titel</span></span>`;
  const t = lijst[0];
  const nog = Math.max(0, (Number.isFinite(t.totaal) ? t.totaal : 0) - t.klaar);
  return `<span class="pm-stat"><b>${nog}</b><span>taken tot de titel van ${esc(t.gebied)}</span></span>`;
}
