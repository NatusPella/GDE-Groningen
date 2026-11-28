// #492: de Beleidswinkel. Na het verhaal (en tijdens het spel) koop je met eigen geld één keer een
// gemeentelijk beleid dat de wereld of je eigen economie blijvend beïnvloedt. Klein, veilig en per speler:
// de aankoop staat in je eigen opslag (gde-beleid-v1), nooit in een savegame of in de wereld van een ander.
//
// Drie maatregelen, elk met een echte haak in het spel:
//  - flits: 25% lagere verkeersboetes (trafficlaw.js `charge`);
//  - subsidie: 5% meer loon per bijbaanronde (sidejobs.js `basisFor`);
//  - markt: de Vismarkt is elke dag marktdag, dus de snackwagen is er drukker (pg_foodtruck.js).
// De regels zijn puur; alleen `koopBeleid` en `laad`/`bewaar` raken opslag of geld aan, met een opslag-
// parameter zodat de tests geen echte localStorage nodig hebben.
import { icoon } from './icons.js';
import { KEYS } from './storagekeys.js';
import { betaal } from './economy.js';
import { euro } from './geldtekst.js';
import { escapeHtml as escHtml } from './htmlescape.js';

export const BELEID = [
  { id: 'flits', naam: 'Soepel flitsbeleid', prijs: 250, tekst: 'Verkeersboetes zijn 25% lager.', effect: 'boete' },
  { id: 'subsidie', naam: 'Bijbaansubsidie', prijs: 350, tekst: 'Elke bijbaanronde betaalt 5% meer.', effect: 'loon' },
  { id: 'markt', naam: 'Altijd marktdag', prijs: 300, tekst: 'De Vismarkt is elke dag marktdag: de snackwagen is er drukker.', effect: 'markt' },
];
const BY_ID = new Map(BELEID.map((b) => [b.id, b]));
export const beleidVan = (id) => BY_ID.get(id) || null;
export const BELEID_OPSLAG = KEYS.beleid || 'gde-beleid-v1';

// Een lege stand of een stand uit opslag: alleen bekende id's, geen dubbele.
export function normaliseerBeleid(raw) {
  const d = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  const gekocht = d && Array.isArray(d.gekocht) ? [...new Set(d.gekocht.filter((id) => BY_ID.has(id)))] : [];
  return { v: 1, gekocht };
}
export const heeftBeleid = (staat, id) => !!(staat && Array.isArray(staat.gekocht) && staat.gekocht.includes(id));
// Koopt één maatregel in een stand: geeft { ok, prijs, staat } terug; dubbel kopen kan niet.
export function koopBeleidRegel(staat, id) {
  const b = beleidVan(id);
  if (!b || heeftBeleid(staat, id)) return { ok: false, prijs: 0, staat };
  return { ok: true, prijs: b.prijs, staat: { ...normaliseerBeleid(staat), gekocht: [...normaliseerBeleid(staat).gekocht, id] } };
}

// ---- de haken in het spel (per speler: dit is de stand van dit apparaat) ----
let staat = null;
let opslagOverride = null;
const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};
export function initBeleid({ opslag: st } = {}) {
  if (st !== undefined) opslagOverride = st;
  staat = null;
}
export function getBeleid() {
  if (staat) return staat;
  let raw = null;
  try { const st = opslag(); raw = st ? st.getItem(BELEID_OPSLAG) : null; } catch (e) { raw = null; }
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { raw = null; } }
  staat = normaliseerBeleid(raw);
  return staat;
}
function bewaar() {
  try { const st = opslag(); if (st) st.setItem(BELEID_OPSLAG, JSON.stringify(getBeleid())); } catch (e) { /* zonder opslag geldt de stand van deze sessie */ }
}
export const beleidActief = (id) => heeftBeleid(getBeleid(), id);
export const beleidBoetekorting = () => (beleidActief('flits') ? 0.25 : 0);
export const beleidBijbaanfactor = () => (beleidActief('subsidie') ? 1.05 : 1);
export const beleidMarktdag = () => beleidActief('markt');

// De rijen voor de winkel (Veroverd > Beleidswinkel).
// `geld` is het saldo van de speler: een maatregel is alleen betaalbaar als dat genoeg is (nooit vast true).
export function beleidOffers(geld = 0) {
  const st = getBeleid();
  const saldo = Number(geld) || 0;
  return BELEID.map((b) => ({ ...b, gekocht: heeftBeleid(st, b.id), betaalbaar: saldo >= b.prijs }));
}
const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

// Designsysteem (ADR 0040, #999): elke maatregel is een zeefdrukkaart op papier, met het gevolg
// (prijs, saldo, saldo erna) als kassabonregels vóór de knop, een statuschip met pictogram en bij te weinig
// geld een probleemkaart met de oplossing. De opmaak staat hier, naast de tekst die ze beschrijft; de
// tokens en bouwstenen komen uit ds-tokens.css en ds-components.css (.ds-z-*).
const ICOON = {
  ok: icoon('vinkje', { cls: 'ds-z-chip__icoon' }),
  nee: icoon('waarschuwing', { cls: 'ds-z-chip__icoon' }),
  kan: icoon('afspelen', { cls: 'ds-z-chip__icoon' }),
};
const BELEID_CSS = `
.bw-beleid { margin: var(--ds-s-3) 0 var(--ds-s-1); display: flex; flex-direction: column; gap: var(--ds-s-3); font-family: var(--ds-font-zeef-tekst); }
.bw-beleid h3 { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); letter-spacing: var(--ds-ls-label); text-transform: uppercase; }
.bw-beleid p { margin: 0; color: var(--ds-zeef-tx); max-width: 60ch; }
.bw-beleid .bw-saldo { display: flex; align-items: baseline; gap: var(--ds-s-2); }
.bw-beleid .bw-saldo b { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); letter-spacing: var(--ds-ls-label); }
.bw-beleid .bw-melding { padding: var(--ds-s-2) var(--ds-s-3); border: var(--ds-lijn-dik) solid var(--ds-c-ink-bord); background: var(--ds-c-sel-vlak); color: var(--ds-zeef-tx); }
.bw-beleid .bw-rij { gap: var(--ds-s-2); padding: var(--ds-s-3) var(--ds-s-4); }
.bw-beleid .bw-rij .ds-z-kaart__kop { margin: calc(-1 * var(--ds-s-3)) calc(-1 * var(--ds-s-4)) 0; }
.bw-beleid .bw-acties { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
.bw-beleid .bw-mist b { color: var(--ds-c-rood-tx); }
.bw-beleid .bw-probleem { padding: var(--ds-s-3) var(--ds-s-4); gap: var(--ds-s-2); }
.bw-beleid .bw-probleem-kop { display: flex; align-items: center; gap: var(--ds-s-2); }
.bw-beleid .bw-probleem .ds-z-knop { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
`;
let cssAan = false;
function zetBeleidCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-beleid';
  el.textContent = BELEID_CSS;
  document.head.appendChild(el);
  // de oplossing van een callout: ga naar de knop van de maatregel die je nu wel kunt betalen
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-beleid-ga]') : null;
    if (!t) return;
    const knop = document.querySelector(`[data-beleid="${CSS.escape(t.dataset.beleidGa)}"]`);
    if (knop) { knop.scrollIntoView({ block: 'nearest' }); knop.focus({ preventScroll: true }); }
  });
}

// De regels van een bon: wat het kost, wat je hebt en wat er overblijft (of wat er mist).
export function beleidBon(prijs, geld) {
  const saldo = heel(geld);
  const p = heel(prijs);
  return { prijs: p, saldo, na: Math.max(0, saldo - p), mist: Math.max(0, p - saldo) };
}

// De tekst van het paneel: saldo bovenaan, per maatregel een bon met knop die uit staat als je het niet kunt
// betalen (met het bedrag dat nog mist en een uitweg), en de laatste melding in het paneel zelf (de HUD zit
// achter het menu).
export function beleidPaneelHtml(geld = 0, melding = '') {
  zetBeleidCss();
  const offers = beleidOffers(geld);
  const eerste = offers.find((b) => !b.gekocht && b.betaalbaar);
  const rijen = offers.map((b) => {
    const bon = beleidBon(b.prijs, geld);
    const klasse = b.gekocht ? 'ds-z-kaart--selectie' : b.betaalbaar ? '' : 'ds-z-kaart--probleem';
    const chip = b.gekocht ? `<span class="ds-z-chip ds-z-chip--succes">${ICOON.ok}Aangenomen</span>`
      : b.betaalbaar ? `<span class="ds-z-chip ds-z-chip--primair">${ICOON.kan}Kan nu</span>`
        : `<span class="ds-z-chip ds-z-chip--probleem">${ICOON.nee}Te duur</span>`;
    const regel = (naam, bedrag) => `<div class="ds-z-bon__regel"><span>${naam}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${bedrag}</span></div>`;
    const bonHtml = b.gekocht ? ''
      : `<div class="ds-z-bon bw-bon">${regel('Prijs', euro(bon.prijs))}${regel('Op zak', euro(bon.saldo))}` +
        (bon.mist > 0 ? `<div class="ds-z-bon__totaal bw-mist"><span>Je mist</span><span class="ds-z-bon__stippen"></span><b>${euro(bon.mist)}</b></div>` : `<div class="ds-z-bon__totaal"><span>Na aankoop</span><span class="ds-z-bon__stippen"></span><b>${euro(bon.na)}</b></div>`) + '</div>';
    let onder = '';
    if (!b.gekocht && !b.betaalbaar) {
      const alt = offers.find((x) => !x.gekocht && x.betaalbaar);
      onder = `<div class="ds-z-kaart ds-z-kaart--probleem ds-z-kaart--recht bw-probleem" role="group"><div class="ds-z-kaart__tekst bw-probleem-kop">${ICOON.nee}<b>Te weinig geld</b></div>` +
        `<div class="ds-z-kaart__tekst">Je hebt nog ${euro(bon.mist)} nodig. Bijverdienen kan met een bijbaan: kijk in het menu onder Loopbanen of Activiteiten.</div>` +
        (alt ? `<div class="ds-z-kaart__voet"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-beleid-ga="${escHtml(alt.id)}">Bekijk ${escHtml(alt.naam)} (${euro(alt.prijs)})</button></div>` : '') + '</div>';
    }
    const knop = b.gekocht ? ''
      : `<div class="bw-acties"><button type="button" class="ds-z-knop${b === eerste ? '' : ' ds-z-knop--secundair'}" data-beleid="${escHtml(b.id)}"${b.betaalbaar ? '' : ' disabled'}>${euro(b.prijs)} kopen</button></div>`;
    return `<div class="bw-rij ds-zeef ds-z-kaart ${klasse}" data-beleid-rij="${escHtml(b.id)}"><div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel">${escHtml(b.naam)}</span>${chip}</div>` +
      `<div class="ds-z-kaart__tekst">${escHtml(b.tekst)}</div>${bonHtml}${onder}${knop}</div>`;
  }).join('');
  const meld = melding ? `<p class="vo-beleid-melding bw-melding" role="status">${escHtml(melding)}</p>` : '';
  return `<section class="bw-beleid ds-zeef" aria-label="Beleidswinkel"><h3>Beleidswinkel</h3><p>Koop één keer een gemeentelijke maatregel die blijft: van lagere boetes tot een drukkere markt. Het is van jou, in je eigen opslag.</p>` +
    `<p class="bw-saldo">Je saldo: <b>${euro(geld)}</b></p>${meld}${rijen}</section>`;
}
// Koopt in de wereld: geld eraf en de stand erbij. De melding doet de aanroeper (het paneel), zodat
// de winkel en een eventuele andere plek dezelfde tekst niet dubbel tonen.
export function koopBeleid(world, id) {
  const b = beleidVan(id);
  if (!b) return 'Onbekend beleid';
  const st = getBeleid();
  if (heeftBeleid(st, id)) return 'Dat heb je al';
  if (!world || (world.money || 0) < b.prijs) return `Te weinig geld: ${euro(b.prijs)}`;
  if (!betaal(world, b.prijs)) return `Te weinig geld: ${euro(b.prijs)}`;
  staat = koopBeleidRegel(st, id).staat;
  bewaar();
  return `${b.naam} aangenomen! ${b.tekst}`;
}
// Voor de save van een gast of een nieuwe wereld: de stand meegeven/terugzetten.
export function getBeleidSave() { return { ...getBeleid(), gekocht: [...getBeleid().gekocht] }; }
export function applyBeleidSave(d) { staat = normaliseerBeleid(d); bewaar(); }
export function resetBeleidVoorTest(st = null) { staat = null; opslagOverride = st; }
