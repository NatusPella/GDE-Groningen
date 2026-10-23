// Een melding terwijl het pauzemenu of de kaart open staat (#435): de kaartjes van de HUD wachten dan tot je het menu sluit, dus
// "waarom mag dit niet" kwam pas na Escape. Hier staat de tekst direct onderin het menu, kort, en ze komt niet nog eens als kaartje.
const TOON = 3.5;       // s
const MAX = 3;          // tegelijk zichtbaar
let rij = [];

// Pure: de lijst na het toevoegen (zelfde tekst ververst de tijd in plaats van te stapelen) en na het verlopen.
export function voegToe(lijst, tekst, nu) {
  const t = String(tekst || '').trim();
  if (!t) return lijst;
  const rest = lijst.filter((m) => m.tekst !== t);
  return [...rest, { tekst: t, tot: nu + TOON }].slice(-MAX);
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
  el.replaceChildren(...rij.map((m) => { const d = document.createElement('div'); d.textContent = m.tekst; d.style.cssText = 'max-width:min(720px,90vw);padding:10px 18px;border-radius:8px;background:rgba(12,20,14,0.94);color:#f0ede4;box-shadow:0 0 0 1px rgba(240,237,228,0.2);font:bold 22px "Arial Narrow",Arial,sans-serif;'; return d; }));
  if (!rij.length && timer) { clearInterval(timer); timer = null; }
}
export function menuMelding(tekst) {
  if (!menuOpen()) return false;
  rij = voegToe(rij, tekst, Date.now() / 1000);
  teken();
  if (!timer) timer = setInterval(teken, 400);
  return true;
}
