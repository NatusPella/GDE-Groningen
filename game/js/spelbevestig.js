// De bevestigingskaart van het Spel-menu (ontwerp Spel-UI 24-11): zegt wat er verandert, wat verloren gaat en wat blijft. De veilige keuze is
// geel en heeft de focus; wat onomkeerbaar is (een save overschrijven of verwijderen, de laatste opslag terugzetten) vraagt vasthouden (600 ms,
// Enter, Spatie, A of de muis). Esc of B kiest altijd de veilige uitweg.
//
// Alleen DOM en toetsen; de beslissing over wat gevaarlijk is staat in spelstatus.js (vraagtVasthouden). Samen spelen: de kaart is lokaal.
import { VASTHOUD_MS } from './spelstatus.js';
import { icoon } from './icons.js';
import { dsButtonKey } from './dsbutton.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let open = null;
export const isBevestigOpen = () => !!open;

const reduced = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// De HTML van de kaart (puur op tekst, voor de test): opties zie toonBevestiging.
function bevestigHtml({ titel, tekst = '', verlies = [], vergelijk = '', acties = [], breed = 760 } = {}) {
  const regel = (r) => `<div class="sp-verlies__regel">${icoon(r.icoon || (r.soort === 'weg' ? 'waarschuwing' : 'vinkje'), { cls: 'sp-ic' })}<b class="${r.soort === 'weg' ? 'sp-slecht' : r.soort === 'blijft' ? 'sp-goed' : ''}">${esc(r.label)}</b><span>${r.html ? r.tekst : esc(r.tekst)}</span></div>`;
  const groepen = [];
  for (const soort of ['weg', 'blijft', 'nieuw']) {
    const rs = verlies.filter((r) => (r.soort || 'nieuw') === soort);
    if (rs.length) groepen.push(`<div class="sp-verlies${soort === 'weg' ? ' sp-verlies--weg' : ''}">${rs.map(regel).join('')}</div>`);
  }
  const knop = (a, i) => dsButtonKey({ label: a.label, toets: a.toets || '', klasse: `ds-z-knop${a.soort === 'veilig' ? '' : a.soort === 'gevaar' ? ' ds-z-knop--gevaar' : ' ds-z-knop--secundair'}${a.vasthouden ? ' sp-vasthoud' : ''}`, attrs: `data-bv="${i}"${a.vasthouden ? ' data-vasthoud="1"' : ''}` });
  const veilig = acties.filter((a) => a.soort !== 'gevaar');
  const gevaar = acties.filter((a) => a.soort === 'gevaar');
  const idx = (a) => acties.indexOf(a);
  return `<div class="sp-scherm" data-bevestig><div class="sp-bevestig" role="alertdialog" aria-modal="true" aria-labelledby="sp-bv-kop" style="width:${breed}px;max-width:calc(100% - 48px)"><h2 class="sp-bevestig__kop" id="sp-bv-kop">${esc(titel)}</h2>` +
    `${tekst ? `<p>${tekst}</p>` : ''}${vergelijk}${groepen.join('')}<div class="sp-bevestig__acties">${veilig.map((a) => knop(a, idx(a))).join('')}<span class="sp-rechts"></span>${gevaar.map((a) => knop(a, idx(a))).join('')}</div></div></div>`;
}

// Toont de kaart over het menu (of het hele scherm). acties: [{ label, soort: 'veilig' | 'neutraal' | 'gevaar', vasthouden, toets, kies() }].
// Geeft een promise terug met de gekozen index, of -1 bij Esc en B. De eerste veilige actie heeft de focus.
export function toonBevestiging(opts, host = document.querySelector('.gm-stage') || document.body) {
  if (open) return Promise.resolve(-1);
  const wrap = document.createElement('div');
  wrap.innerHTML = bevestigHtml(opts);
  const el = wrap.firstElementChild;
  el.style.zIndex = '90';
  host.appendChild(el);
  const acties = opts.acties || [];
  const knoppen = [...el.querySelectorAll('[data-bv]')];
  let hold = null; // { i, t0, raf, knop }
  const vorigeFocus = document.activeElement;
  return new Promise((resolve) => {
    let klaar = false;
    const sluit = (i) => {
      if (klaar) return;
      klaar = true;
      stopHold();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKeyUp, true);
      el.remove();
      open = null;
      try { if (vorigeFocus && vorigeFocus.focus) vorigeFocus.focus({ preventScroll: true }); } catch (e) { /* weg */ }
      if (i >= 0 && acties[i] && acties[i].kies) { try { acties[i].kies(); } catch (e) { console.error('bevestiging', e); } }
      resolve(i);
    };
    function stopHold() {
      if (!hold) return;
      cancelAnimationFrame(hold.raf);
      hold.knop.style.setProperty('--vul', '0%');
      hold = null;
    }
    const startHold = (i) => {
      if (hold) return;
      const knop = knoppen.find((k) => Number(k.dataset.bv) === i);
      if (!knop) return;
      if (reduced()) { knop.style.setProperty('--vul', '100%'); setTimeout(() => sluit(i), 120); return; }
      hold = { i, t0: performance.now(), knop, raf: 0 };
      const tik = () => {
        if (!hold) return;
        const k = Math.min(1, (performance.now() - hold.t0) / VASTHOUD_MS);
        hold.knop.style.setProperty('--vul', `${Math.round(k * 100)}%`);
        if (k >= 1) { const gekozen = hold.i; hold = null; sluit(gekozen); return; }
        hold.raf = requestAnimationFrame(tik);
      };
      hold.raf = requestAnimationFrame(tik);
    };
    const kies = (i) => {
      const a = acties[i];
      if (!a) return;
      if (a.vasthouden) startHold(i); else sluit(i);
    };
    function onKey(e) {
      if (!el.isConnected) return;
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) sluit(-1); return; }
      const f = document.activeElement && knoppen.includes(document.activeElement) ? document.activeElement : null;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat) return;
        kies(Number((f || knoppen[0]).dataset.bv));
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
        e.preventDefault(); e.stopImmediatePropagation();
        const i = f ? knoppen.indexOf(f) : 0;
        const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1;
        knoppen[(i + d + knoppen.length) % knoppen.length].focus({ preventScroll: true });
        return;
      }
      // de menutoetsen horen niet door te lekken naar het menu eronder
      e.stopImmediatePropagation();
    }
    function onKeyUp(e) {
      if (!el.isConnected) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); stopHold(); }
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    for (const k of knoppen) {
      k.addEventListener('pointerdown', (e) => { e.preventDefault(); k.focus({ preventScroll: true }); const i = Number(k.dataset.bv); if (acties[i] && acties[i].vasthouden) startHold(i); });
      k.addEventListener('pointerup', () => stopHold());
      k.addEventListener('pointerleave', () => stopHold());
      k.addEventListener('click', (e) => { e.preventDefault(); const i = Number(k.dataset.bv); if (acties[i] && !acties[i].vasthouden) sluit(i); });
    }
    open = { sluit };
    const eerste = knoppen.find((k) => acties[Number(k.dataset.bv)] && acties[Number(k.dataset.bv)].soort === 'veilig') || knoppen[0];
    if (eerste) eerste.focus({ preventScroll: true });
  });
}
