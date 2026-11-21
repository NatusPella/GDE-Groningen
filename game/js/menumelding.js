// Een melding terwijl het pauzemenu of de kaart open staat (#435): de kaartjes van de HUD wachten dan tot je het menu sluit, dus
// "waarom mag dit niet" kwam pas na Escape. Hier staat de tekst direct onderin het menu, kort, en ze komt niet nog eens als kaartje.
import { DURATION_CLASSES } from './noticetiming.js';
import { noticeBar } from './melding.js'; // het gedeelde aflopende balkje
const TOON = DURATION_CLASSES.kort; // s: de korte klas, met het balkje
const MAX = 3;          // tegelijk zichtbaar
let rij = [];
let teller = 0;

// Pure: de lijst na het toevoegen (zelfde tekst ververst de tijd in plaats van te stapelen) en na het verlopen.
export function voegToe(lijst, tekst, nu) {
  const t = String(tekst || '').trim();
  if (!t) return lijst;
  const rest = lijst.filter((m) => m.tekst !== t);
  return [...rest, { tekst: t, tot: nu + TOON, id: ++teller }].slice(-MAX);
}
export const verloop = (lijst, nu) => lijst.filter((m) => m.tot > nu);

const menuOpen = () => typeof document !== 'undefined' && !!document.querySelector('#pause-menu.visible');

let el = null, timer = null;
function teken() {
  if (typeof document === 'undefined') return;
  rij = verloop(rij, Date.now() / 1000);
  if (!el) {
    el = document.createElement('div'); el.id = 'menu-meldingen'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;';
    document.body.appendChild(el);
  }
  // Elke melding houdt zijn eigen element tot hij verloopt, zodat het balkje doorloopt (geen herstart bij elke teken)
  el.replaceChildren(...rij.map((m) => { if (m.el) return m.el; const d = document.createElement('div'); d.textContent = m.tekst; m.el = d; d.style.cssText = 'position:relative;max-width:min(720px,90vw);padding:10px 18px;border-radius:var(--ds-r,8px);background:var(--ds-zeef-bg,#f3ead2);color:var(--ds-zeef-tx,#1d1b17);border:var(--ds-lijn-zeef,3px) solid var(--ds-c-ink-inkt,#1d1b17);box-shadow:var(--ds-schaduw-hard-klein,3px 3px 0 #1d1b17);font:800 22px var(--ds-font-zeef-kop,"Arial Narrow"),Arial,sans-serif;'; noticeBar(d, { duur: TOON }); return d; }));
  if (!rij.length && timer) { clearInterval(timer); timer = null; }
}
export function menuMelding(tekst) {
  if (!menuOpen()) return false;
  rij = voegToe(rij, tekst, Date.now() / 1000);
  teken();
  if (!timer) timer = setInterval(teken, 400);
  return true;
}
