// Veroverd (#414, #435): de gebieden die je hebt veroverd. Hoort bij het verhaal, dus een tabblad onder Verhaal (eerst een
// weergave van Loopbanen). De gegevens en de tekst komen uit gebiedenui.js; dit bestand tekent het tabblad en bindt de klikken.
// #492: onderaan staat de Beleidswinkel: een klein, lokaal en blijvend voordeel per speler (beleidswinkel.js).
// #906: de kop is een hero met de stand, daaronder de eerstvolgende taken als kaarten, de uitleg
// met de echte aantallen en pas dan de lijst met provincies en gebieden. Kop, stand, taken en
// uitleg zitten samen in één scrolvlak, zodat de taken altijd in beeld beginnen.
import { gebiedenHtml, kiesGebied, reisNaar, volgendeTaken, soortenStand, GEBIEDEN_CSS } from './gebiedenui.js';
import { bekijkIntocht } from './intochten.js';
import { fillBars } from './motion.js';
import { setUserWaypoint, formatDistance } from './routing.js';
import { hoofdspeler } from './players.js';
import { beleidPaneelHtml, koopBeleid } from './beleidswinkel.js';

const bars = new Map();
let cssAan = false;
let sluitMenu = null;
let laatsteTaken = [];

const CSS = `${GEBIEDEN_CSS}
.vo-top { flex: 0 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; padding-top: 28px; }
.vo-top::-webkit-scrollbar { width: 8px; }
.vo-top::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(240, 237, 228, 0.18); }
.vo-top .pm-hero { flex: none; }
.pm-veroverd > .m-main { flex: 1 1 auto; min-height: 180px; }
.vo-hero { margin: 0 24px 16px; }
.vo-hero .pm-hero-t { font-size: 40px; }
.vo-kop { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; }
.vo-kop .m-num { font-size: 30px; }
.vo-uitleg { flex: none; margin: 0 24px 14px; padding: 10px 16px 12px; border-radius: 12px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 0 0 0 1px var(--line); }
.vo-uitleg > b, .vo-volgende > b { display: block; margin-bottom: 2px; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 24px; letter-spacing: 0.04em; }
.vo-soort-kop { margin-top: 4px; }
.vo-soorten { list-style: none; margin: 6px 0 2px; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2px 18px; }
.vo-soorten li { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.35; }
.vo-soorten li .one { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vo-soorten .vo-soort-tel { margin-left: auto; white-space: nowrap; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 18px; letter-spacing: 0.03em; color: var(--g); }
.vo-regel { margin: 6px 0 0; padding: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.4; color: var(--c-mut, rgba(240, 237, 228, 0.72)); max-width: 760px; }
.vo-regel b { font-weight: normal; color: var(--ink, #f0ede4); }
.vo-stats { margin: 0 24px 14px; }
.vo-volgende { margin: 0 24px 16px; padding: 10px 16px 12px; border-radius: 12px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 0 0 0 1px var(--line); }
.vo-volgende > b { margin-bottom: 6px; }
.vo-volgende ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.vo-volgende li { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; padding: 10px 12px 11px; border-radius: 10px; background: rgba(240, 237, 228, 0.05); box-shadow: inset 0 0 0 1px var(--line2); font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.35; }
.vo-volgende .vo-taak-kop { display: flex; align-items: baseline; gap: 8px; width: 100%; min-width: 0; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mut); }
.vo-volgende .vo-taak-kop .one { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vo-volgende .vo-taak-af { flex: none; margin-left: auto; white-space: nowrap; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 18px; letter-spacing: 0.03em; text-transform: none; color: var(--g); }
.vo-volgende li > b { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 22px; line-height: 1.1; letter-spacing: 0.02em; overflow-wrap: anywhere; }
.vo-volgende .mut { color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-volgende .vo-taak-actie { margin-top: 3px; padding: 5px 12px; border-radius: 6px; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.04em; border: 1px solid var(--line2); background: rgba(240, 237, 228, 0.08); color: var(--ink, #f0ede4); cursor: pointer; }
.vo-volgende .vo-taak-actie:hover, .vo-volgende .vo-taak-actie:focus-visible { background: rgba(63, 201, 122, 0.18); border-color: var(--g); outline: none; }
.vo-beleid { margin: 12px 0 4px; padding: 12px 14px 8px; border-radius: 12px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 0 0 0 1px var(--line); }
.vo-beleid h3 { margin: 0 0 2px; font: normal 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.vo-beleid p { margin: 0 0 8px; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.4; color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-beleid .vo-rij { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 10px; margin-top: 6px; padding: 8px 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); box-shadow: inset 0 -1px 0 var(--line); }
.vo-beleid .vo-rij b { flex: 1 1 140px; min-width: 0; font-weight: normal; color: var(--ink, #f0ede4); }
.vo-beleid .vo-rij span { flex: 1 1 160px; min-width: 0; color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-beleid .vo-rij .mut { flex: none; color: var(--g); }
.vo-beleid .vo-rij button { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.04em; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--c-line, rgba(240, 237, 228, 0.3)); background: rgba(240, 237, 228, 0.08); color: inherit; cursor: pointer; }
.vo-beleid .vo-rij button:hover, .vo-beleid .vo-rij button:focus-visible { background: rgba(63, 201, 122, 0.18); border-color: var(--g); outline: none; }
.vo-beleid .vo-rij button:disabled { opacity: 0.55; cursor: default; }
.vo-beleid .vo-beleid-saldo { margin: 0 0 6px; }
.vo-beleid .vo-beleid-melding { margin: 4px 0 6px; color: var(--ink, #f0ede4); }`;

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
function taakKaart(t, world) {
  const p = world ? hoofdspeler(world) : null;
  const af = p && Number.isFinite(t.x) && Number.isFinite(t.y) ? formatDistance(Math.hypot(t.x - p.x, t.y - p.y)) : '';
  const soort = t.soortNaam ? `${esc(t.soortNaam)} · ` : '';
  return `<li><span class="vo-taak-kop"><span class="one">${esc(t.gebied)}</span>${af ? `<span class="vo-taak-af">${esc(af)}</span>` : ''}</span>` +
    `<b>${esc(t.naam)}</b><span class="mut">${soort}${t.klaar} van ${t.totaal} in dit gebied</span>` +
    `<button type="button" class="vo-taak-actie" data-doel="${esc(t.id)}" aria-label="Zet ${esc(t.naam)} als doel op de kaart">Zet als doel</button></li>`;
}

export function renderVeroverdPanel(el, sluit = null, world = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  beleidWereld = world;
  zetCss();
  const teken = () => {
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
      `<div class="pm-hero-meta vo-kop">${g.totaal}</div></section>`;
    const stats = `<div class="pm-stats vo-stats">` +
      `<span class="pm-stat" data-tone="accent"><b>${s.klaar}</b><span>van ${s.totaal} gebieden veroverd</span><span class="m-bar${s.klaar ? ' on' : ''}"><i data-bar="vo-gebieden" data-w="${s.pct}"></i></span></span>` +
      `<span class="pm-stat"><b>${s.kaartGedaan}</b><span>van ${s.kaartTotaal} buurten op de kaart verkend (${s.kaartPct}%)</span><span class="m-bar${s.kaartGedaan ? ' on' : ''}"><i data-bar="vo-kaart" data-w="${s.kaartPct}"></i></span></span>` +
      volgendeStats(taken) + `</div>`;
    // #906: de eerstvolgende taken staan direct in beeld als kaarten, met per kaart één actie:
    // een doel op de kaart zetten. De gegevens komen uit volgendeTaken(), dezelfde bron als "Te doen".
    const nogTitel = taken.length && Number.isFinite(taken[0].totaal)
      ? '<b>Nog ' + Math.max(0, taken[0].totaal - taken[0].klaar) + ' taken tot de titel van ' + esc(taken[0].gebied) + '.</b> ' : '';
    const voetnoot = `<p class="vo-regel">${nogTitel}Je volgende taak staat ook in <b>Te doen</b>; daar zie je hem met de afstand vanaf hier.</p>`;
    const volgende = taken.length
      ? '<section class="vo-volgende" aria-label="Eerstvolgende taken"><b>Eerstvolgende taken</b><ol>' + taken.map((t) => taakKaart(t, world)).join('') + '</ol>' + voetnoot + '</section>'
      : '<section class="vo-volgende" aria-label="Eerstvolgende taken"><b>Eerstvolgende taken</b><p class="vo-regel">Alles wat meetelt is gedaan. De titels staan hierboven.</p></section>';
    // #676/#906: wat er meetelt met de echte aantallen erbij, en wat bewust niet (de catalogusregel).
    const stand = soortenStand();
    const soortRijen = stand.length
      ? '<ul class="vo-soorten">' + stand.map((r) => `<li><span class="one">${esc(r.naam)}</span><span class="vo-soort-tel">${r.klaar} van ${r.totaal}</span></li>`).join('') + '</ul>' : '';
    const regel = '<section class="vo-uitleg" aria-label="Wat telt mee"><b>Wat telt mee</b>' +
      (soortRijen ? '<p class="vo-regel vo-soort-kop">Per soort, met wat je al deed:</p>' : '') + soortRijen +
      '<p class="vo-regel"><b>Wat telt mee:</b> missies, 39 van de 47 bijbanen, 50 minigame-plekken, vondsten en geheimen. ' +
      'Eierballen, losse geheimen, postgame, lucht en dorpsuitjes tellen bewust niet mee; die staan in hun eigen lijst.</p></section>';
    // #906: de kop, de stand, de taken en de uitleg staan samen in één scrolvlak boven de lijst,
    // zodat de taken altijd in beeld beginnen (en op 720p niet onder de vouw verdwijnen).
    el.innerHTML = `<div class="vo-top">${hero}${stats}${volgende}${regel}</div>` +
      `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}${beleidHtml()}</aside></div>`;
    fillBars(el, bars);
  };
  teken();
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  let gebied = null;
  const kies = (id) => {
    if (!id || id === gebied) return;
    gebied = id;
    for (const b of el.querySelectorAll('[data-gebied]')) { const aan = b.dataset.gebied === id; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
    el.querySelector('.lb-pane').innerHTML = kiesGebied(id) + beleidHtml();
    queueMicrotask(() => fillBars(el, bars));
  };
  el.addEventListener('click', (e) => {
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
