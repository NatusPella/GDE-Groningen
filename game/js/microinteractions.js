// Microinteracties (DESIGN_SYSTEM.md, "Microinteractions"): de twee dingen die CSS niet alleen kan.
// De rest van de bibliotheek staat in ds-motion.css (.ds-mi-*). Hier geen timers per frame voor
// meldingen: opschuiven() meet één keer en laat de transitie het werk doen; telStap() is een pure
// rekenstap voor een teller die in hooguit 250 ms oploopt en daarna vaststaat.

// De schaal uit ds-tokens.css, in milliseconden; scripts/microinteracties_test.mjs houdt ze gelijk.
export const MI = { snel: 120, normaal: 200, max: 250, verschuiving: 8 };

// "Beweging beperken", Rustig drukwerk en de systeeminstelling: dan staat alles direct op de eindwaarde.
export function bewegingUit() {
  if (typeof document === 'undefined') return true;
  const c = document.documentElement.classList;
  if (c.contains('reduce-motion') || c.contains('rustig-drukwerk')) return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Eén stap van een teller: lineair van `start` naar `doel` in `duur` seconden, daarna precies `doel`.
// getoond = wat nu in beeld staat; dt = frametijd in seconden. Duur 0 (of een bewegingUit()) = meteen klaar.
export function telStap(getoond, doel, start, dt, duur = MI.max / 1000) {
  if (!(duur > 0) || getoond === doel) return doel;
  const snelheid = Math.max(1, Math.abs(doel - start)) / duur;
  const stap = snelheid * Math.max(0, dt);
  const rest = doel - getoond;
  return Math.abs(rest) <= stap ? doel : getoond + Math.sign(rest) * stap;
}

// STAPELEN / OPSCHUIVEN: voert `wijzig` uit (meestal een kind verwijderen) en laat de kinderen die daardoor
// van plek wisselen soepel naar hun nieuwe plek schuiven (FLIP: één meting voor, één na, geen lus).
// Alleen de losse eigenschap `translate` beweegt; bij bewegingUit() gebeurt er niets extra's.
export function opschuiven(container, wijzig) {
  if (!container || bewegingUit()) { wijzig(); return; }
  const voor = new Map();
  for (const k of container.children) voor.set(k, k.getBoundingClientRect().top);
  wijzig();
  // de HUD schaalt met CSS zoom: de gemeten pixels delen door die schaal geeft de lokale offset
  const zoom = container.offsetHeight > 0 ? (container.getBoundingClientRect().height / container.offsetHeight) || 1 : 1;
  const bewogen = [];
  for (const k of container.children) {
    const v = voor.get(k);
    if (v == null) continue;
    const d = (v - k.getBoundingClientRect().top) / zoom;
    if (Math.abs(d) < 1) continue;
    k.style.translate = `0 ${d}px`;
    bewogen.push(k);
  }
  if (!bewogen.length) return;
  requestAnimationFrame(() => {
    for (const k of bewogen) { k.classList.add('ds-mi-schuift'); k.style.translate = ''; }
    setTimeout(() => { for (const k of bewogen) k.classList.remove('ds-mi-schuift'); }, MI.normaal + 50);
  });
}
