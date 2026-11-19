// #492: de Beleidswinkel. Na het verhaal (en tijdens het spel) koop je met eigen geld één keer een
// gemeentelijk beleid dat de wereld of je eigen economie blijvend beïnvloedt. Klein, veilig en per speler:
// de aankoop staat in je eigen opslag (gde-beleid-v1), nooit in een savegame of in de wereld van een ander.
//
// Drie maatregelen, elk met een echte haak in het spel:
//  - flits: 25% lagere verkeersboetes (trafficlaw.js `charge`);
//  - subsidie: 5% meer loon per bijbaanronde (sidejobs.js `basisFor`);
//  - markt: de Vismarkt is elke dag marktdag, dus de Fjord Frituur is er drukker (pg_foodtruck.js).
// De regels zijn puur; alleen `koopBeleid` en `laad`/`bewaar` raken opslag of geld aan, met een opslag-
// parameter zodat de tests geen echte localStorage nodig hebben.
import { KEYS } from './storagekeys.js';
import { betaal } from './economy.js';
import { euro } from './geldtekst.js';

export const BELEID = [
  { id: 'flits', naam: 'Soepel flitsbeleid', prijs: 250, tekst: 'Verkeersboetes zijn 25% lager.', effect: 'boete' },
  { id: 'subsidie', naam: 'Bijbaansubsidie', prijs: 350, tekst: 'Elke bijbaanronde betaalt 5% meer.', effect: 'loon' },
  { id: 'markt', naam: 'Altijd marktdag', prijs: 300, tekst: 'De Vismarkt is elke dag marktdag: de Fjord Frituur is er drukker.', effect: 'markt' },
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
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// De tekst van het paneel: saldo bovenaan, per rij een knop die uit staat als je het niet kunt betalen
// (met het bedrag dat nog mist), en de laatste melding in het paneel zelf (de HUD zit achter het menu).
export function beleidPaneelHtml(geld = 0, melding = '') {
  const rijen = beleidOffers(geld).map((b) => {
    const actie = b.gekocht ? '<span class="mut">Aangenomen</span>'
      : b.betaalbaar ? `<button type="button" data-beleid="${escHtml(b.id)}">${euro(b.prijs)} kopen</button>`
        : `<button type="button" data-beleid="${escHtml(b.id)}" disabled>${euro(b.prijs)} kopen</button><span class="mut">nog ${euro(b.prijs - (Number(geld) || 0))} nodig</span>`;
    return `<div class="vo-rij"><b>${escHtml(b.naam)}</b><span>${escHtml(b.tekst)}</span>${actie}</div>`;
  }).join('');
  const meld = melding ? `<p class="vo-beleid-melding" role="status">${escHtml(melding)}</p>` : '';
  return `<section class="vo-beleid" aria-label="Beleidswinkel"><h3>Beleidswinkel</h3><p>Koop één keer een gemeentelijke maatregel die blijft: van lagere boetes tot een drukkere markt. Het is van jou, in je eigen opslag.</p>` +
    `<p class="vo-beleid-saldo">Je saldo: <b>${euro(geld)}</b></p>${meld}${rijen}</section>`;
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
