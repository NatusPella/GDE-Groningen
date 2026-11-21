// De tv-overlay van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): een klein DOM-laagje boven de wereld met de ondertitel van het commentaar, de veldradar, het HERHALING-label en de grote kaarten van de
// uitzending (opstelling bij de aftrap, rustpauze met statistieken, eindsamenvatting met Man van de match). De inhoud komt van voetbalpresentatie.js (puur en getest); de stijl van voetbaltv.css (alleen
// ds-tokens). Niets neemt een klik (pointer-events: none); de toetsen lopen via voetbal.js. Zonder document (node) doet dit bestand niets, zodat de rooktest en de pure tests gewoon laden.
import { keyTextHtml } from './keycap.js';

export function makeTvLayer() {
  if (typeof document === 'undefined') return { zet() {}, weg() {} };
  const root = document.createElement('div');
  root.className = 'vbtv';
  root.setAttribute('aria-live', 'off');
  root.innerHTML = '<div class="vbtv-radar ds-z-kaart" hidden></div><div class="vbtv-herhaling ds-z-waarde" hidden>Herhaling</div><div class="vbtv-paneel ds-z-kaart" hidden></div><p class="vbtv-ondertitel" hidden></p>';
  (document.getElementById('hud') || document.body).appendChild(root);
  const el = { radar: root.querySelector('.vbtv-radar'), herhaling: root.querySelector('.vbtv-herhaling'), paneel: root.querySelector('.vbtv-paneel'), onder: root.querySelector('.vbtv-ondertitel') };
  const last = { radar: null, paneel: null, onder: null, hint: null };
  const zetHtml = (sleutel, node, html) => { if (last[sleutel] === html) return; last[sleutel] = html; node.hidden = !html; node.innerHTML = html || ''; };
  return {
    // s: { radar: html | null, paneel: html | null, hint: toetstekst | null, ondertitel: html | null, herhaling: bool }
    zet(s) {
      zetHtml('radar', el.radar, s.radar || null);
      zetHtml('paneel', el.paneel, s.paneel ? `${s.paneel}${s.hint ? `<p class="vbtv-hint">${keyTextHtml(s.hint)}</p>` : ''}` : null);
      zetHtml('onder', el.onder, s.ondertitel || null);
      el.herhaling.hidden = !s.herhaling;
    },
    weg() { root.remove(); },
  };
}
