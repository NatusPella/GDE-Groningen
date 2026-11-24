// Microanimaties (DS3): de pure helpers achter game/js/ds-micro.css (DESIGN_SYSTEM.md, "Microanimaties (DS3)").
// Geen imports en geen DOM bij het laden, dus de tests in scripts/dsmicro_test.mjs draaien in gewone node. De
// DOM-helpers onderaan doen niets zonder document en slaan alle beweging over bij "Beweging beperken", Rustig
// drukwerk en prefers-reduced-motion (de klassen op <html>, gezet door motion.js).
//
// Samen spelen: animaties zijn lokaal per speler; er wordt niets gesynchroniseerd en geen geluid dubbel gespeeld.

export const STAFFEL_MS = 40;       // --ds-m-staffel: de tussentijd van een lijstrij
export const STAFFEL_MAX = 8;       // hooguit 8 vertraagde rijen (320 ms), daarna komen alle rijen tegelijk
export const MAX_GELIJK = 12;       // prestatiebudget: hooguit 12 rijen of kaartjes met een eigen animatie tegelijk
export const TAB_MS = 150;          // --ds-m-midden: de onderstreping glijdt in 150 ms

const whole = (x) => (Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);

// De staffelstap van rij i (0 tot STAFFEL_MAX) en de vertraging in ms; rustig: nooit een vertraging.
export const staggerStep = (i) => Math.min(whole(i), STAFFEL_MAX);
export const staffelNa = (i, rustig = false) => (rustig ? 0 : staggerStep(i) * STAFFEL_MS);

// De lijst van n rijen: rij i krijgt de klasse en de index, maar alleen de eerste MAX_GELIJK; de rest staat er meteen
// (geen verborgen beginstand, dus nooit een rij die blijft wachten). Bij rustig (geen beweging) krijgt niemand een klasse.
export function rijPlan(n, { rustig = false, max = MAX_GELIJK } = {}) {
  const uit = [];
  for (let i = 0; i < whole(n); i++) {
    const beweegt = !rustig && i < max;
    uit.push({ i, beweegt, klasse: beweegt ? 'ds-m-rij' : '', stap: beweegt ? staggerStep(i) : 0, na: beweegt ? staffelNa(i) : 0 });
  }
  return uit;
}
// Het attribuut voor in een HTML-string: ` class="..." style="--ds-m-i:3"`; klasse is de rest van de klassen van de rij.
export function rijAttr(i, klasse = '', opts = {}) {
  const p = rijPlan(whole(i) + 1, opts)[whole(i)];
  const k = [klasse, p && p.klasse].filter(Boolean).join(' ');
  return { klasse: k, stijl: p && p.beweegt ? `--ds-m-i:${p.stap}` : '' };
}
// Hoe lang het hele staffelen duurt (de laatste rij is klaar): voor een test en voor "overslaan".
export function staffelDuur(n, lang = 250) {
  const p = rijPlan(n).filter((x) => x.beweegt);
  return p.length ? p[p.length - 1].na + lang : 0;
}

// De glijdende onderstreping: x (px vanaf de linkerrand van de tabrij) en de breedte van de actieve tab.
// rects: [{ left, width }] van alle tabs, actief: index, kader: { left } van de tabrij.
export function tabLine(rects, actief, kader = { left: 0 }) {
  const r = rects && rects[actief];
  if (!r) return { x: 0, w: 0 };
  return { x: Math.round((r.left - (kader.left || 0)) * 10) / 10, w: Math.max(0, Math.round(r.width * 10) / 10) };
}

// De zoom van een kader: schermbreedte gedeeld door layoutbreedte; 1 als een van beide ontbreekt (verborgen, geen DOM).
export function tabZoom(schermBreedte, layoutBreedte) {
  const z = schermBreedte / layoutBreedte;
  return Number.isFinite(z) && z > 0.05 ? z : 1;
}

// De randen van een scrollgebied: waar nog inhoud is, vervaagt de rand (data-boven en data-onder).
export function scrollRanden({ scrollTop = 0, clientHeight = 0, scrollHeight = 0 } = {}, marge = 2) {
  const rest = scrollHeight - clientHeight;
  if (rest <= marge) return { boven: false, onder: false };
  return { boven: scrollTop > marge, onder: scrollTop < rest - marge };
}

// Eenmalig: geeft true bij de eerste keer dat een sleutel langskomt (een glans, een stempel, een "nieuw"-glans), daarna false.
export function eenmalig(gezien, sleutel) {
  if (gezien.has(sleutel)) return false;
  gezien.add(sleutel);
  return true;
}

// Prestatiebudget: een lijst met aanvragen om te bewegen, hooguit max tegelijk; de rest krijgt direct de eindstand.
export function budget(aanvragen, max = MAX_GELIJK) {
  return aanvragen.map((a, i) => ({ ...a, beweegt: i < max }));
}

// ---- DOM (alleen in de browser) ----
export function calmState() {
  if (typeof document === 'undefined') return true;
  const c = document.documentElement.classList;
  return c.contains('reduce-motion') || c.contains('rustig-drukwerk');
}

// Zet .on op de wortel in het volgende frame, zodat de beginstand (verborgen) eerst getekend wordt; rustig: direct.
export function afterFrame(el) {
  if (!el) return;
  const list = el.classList ? [el] : [...el]; // één element of een lijst (NodeList)
  if (calmState() || typeof requestAnimationFrame !== 'function') { for (const x of list) x.classList.add('on'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => { for (const x of list) x.classList.add('on'); }));
}

// Na het staffelen weer een gewone rij: de klassen eraf, zodat de eigen overgangen van de rij (hover) terugkomen. De rij staat
// er dan al vol in beeld, dus er verandert niets zichtbaars. ms: hoe lang het staffelen duurt (staffelDuur).
export function rijenKlaar(list, ms) {
  if (typeof setTimeout !== 'function' || !list || !list.length) return;
  setTimeout(() => { for (const x of list) x.classList.remove('ds-m-rij', 'on'); }, ms + 60);
}

// Eén tikje op een getal (.ds-m-tik): de klasse eraf, reflow, erop, zodat de 80 ms-hartslag opnieuw loopt.
export function tikGetal(el) {
  if (!el || calmState()) return;
  el.classList.remove('ds-m-tikt');
  void el.offsetWidth;
  el.classList.add('ds-m-tikt');
}

// Zet de glijdende onderstreping van een .ds-m-tabs onder de actieve tab ([aria-selected="true"]). De eerste meting (en een
// meting na een verborgen paneel) springt er meteen heen; daarna glijdt hij. Pas als er een echte breedte is gemeten krijgt het
// kader .ds-m-tabs--aan: tot dan blijft de eigen onderstreping van de tab (de terugval) staan, dus er is nooit een tab zonder streep.
export function applyTabLine(kader) {
  if (!kader || typeof kader.querySelectorAll !== 'function') return;
  const tabs = [...kader.querySelectorAll('[role="tab"]')];
  const actief = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  if (actief < 0) return;
  const k = kader.getBoundingClientRect();
  // #1200 (beeld 24-11): het menu staat in een stage met CSS-zoom (--mz, kleiner dan 1 onder 1920x1080). getBoundingClientRect
  // meet op het scherm, maar de translate van de streep geldt binnen die zoom: op 1280x720 stond de streep onder Camera terwijl
  // Toegankelijkheid open was. Terug naar de eigen px van het kader (schermbreedte gedeeld door de layoutbreedte).
  const z = tabZoom(k.width, kader.offsetWidth);
  const m = tabLine(tabs.map((t) => t.getBoundingClientRect()), actief, k);
  const x = Math.round(m.x / z * 10) / 10, w = Math.round(m.w / z * 10) / 10;
  if (!(w > 0)) { kader.classList.remove('ds-m-tabs--aan'); delete kader.dataset.lijn; return; } // verborgen: niets te meten
  const line = kader.querySelector('.ds-m-tabs__lijn');
  const eerste = !kader.dataset.lijn;
  if (line && eerste) line.style.transition = 'none';
  kader.style.setProperty('--ds-m-tab-x', `${x}px`);
  kader.style.setProperty('--ds-m-tab-w', String(w));
  kader.dataset.lijn = '1';
  kader.classList.add('ds-m-tabs--aan');
  if (line && eerste) { void line.offsetWidth; line.style.transition = ''; }
}

// Volgt de grootte van een .ds-m-tabs (een paneel dat zichtbaar wordt, een venster dat groeit) en zet de streep bij. Eenmalig per kader.
export function trackTabLine(kader) {
  if (!kader) return;
  applyTabLine(kader);
  if (kader.dataset.lijnVolgt || typeof ResizeObserver === 'undefined') return;
  kader.dataset.lijnVolgt = '1';
  new ResizeObserver(() => applyTabLine(kader)).observe(kader);
}

// Houdt data-boven en data-onder van een scrollgebied bij (voor .ds-m-scrollfade).
export function trackScrollEdges(el) {
  if (!el || typeof el.addEventListener !== 'function') return;
  const update = () => { const r = scrollRanden(el); el.dataset.boven = r.boven ? '1' : '0'; el.dataset.onder = r.onder ? '1' : '0'; };
  el.addEventListener('scroll', update, { passive: true });
  update();
}
