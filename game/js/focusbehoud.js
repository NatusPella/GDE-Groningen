// De focus blijft staan als een lijst opnieuw wordt getekend (controller-review 22-11, #1011): een paneel dat zijn innerHTML vervangt na een klik
// (Koop, Dempen, Verder) haalt het gefocuste element uit de pagina, en de focus valt dan op body. Met een controller begint de D-pad dan weer
// bovenaan de lijst, na elke handeling. Dit bewaart de focus aan de hand van de data-attributen (zelfde idee als rerenderTodo in pausemenu.js)
// en zet hem na het tekenen terug op hetzelfde element, of op de dichtstbijzijnde buur als dat element weg is.
// De logica is puur (objecten met tagName, attributes en classList): scripts/focusbehoud_test.mjs test haar zonder DOM.

const esc = (v) => String(v).replace(/["\\]/g, '\\$&');

/** De selector die een element herkent na het opnieuw tekenen: tag, id en alle data-attributen; zonder die de eerste klassen. */
export function focusSelector(el) {
  if (!el || !el.tagName) return '';
  const tag = String(el.tagName).toLowerCase();
  const attrs = [...(el.attributes || [])];
  const data = attrs.filter((a) => /^data-/.test(a.name) && a.name !== 'data-search');
  let sel = tag;
  if (el.id) sel += '#' + String(el.id).replace(/[^\w-]/g, '');
  for (const a of data) sel += `[${a.name}="${esc(a.value)}"]`;
  if (!data.length && !el.id) {
    const kl = [...(el.classList || [])].filter((c) => /^[\w-]+$/.test(c) && !/^(sel|on|open|focus|is-|active)/.test(c)).slice(0, 2);
    for (const c of kl) sel += '.' + c;
  }
  return sel;
}

/** Een handtekening van de gefocuste plek: de selector en het volgnummer onder de elementen met dezelfde selector in het paneel. */
export function focusHandtekening(scope, el) {
  if (!scope || !el) return null;
  const sel = focusSelector(el);
  if (!sel) return null;
  const rest = [...scope.querySelectorAll(sel)];
  const n = rest.indexOf(el);
  return { sel, n: n < 0 ? 0 : n };
}

/** Na het tekenen: het element met dezelfde handtekening, of de dichtstbijzijnde (zelfde plek in de lijst, daarna de laatste). */
export function herstelDoel(scope, h) {
  if (!scope || !h) return null;
  const rest = [...scope.querySelectorAll(h.sel)].filter((e) => !e.disabled);
  if (!rest.length) return null;
  return rest[Math.min(h.n, rest.length - 1)];
}

/**
 * Vóór het opnieuw tekenen aanroepen; geeft een functie voor erna. Alleen als de focus in het paneel stond en nu weg is
 * (op body) zet het hem terug: een focus die al ergens anders staat blijft ongemoeid.
 */
export function bewaarFocus(scope, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !scope || !doc.activeElement || doc.activeElement === doc.body || !scope.contains || !scope.contains(doc.activeElement)) return () => {};
  const h = focusHandtekening(scope, doc.activeElement);
  if (!h) return () => {};
  return () => {
    const nu = doc.activeElement;
    if (nu && nu !== doc.body) return; // de focus staat al ergens: niet stelen
    const doel = herstelDoel(scope, h);
    if (doel && doel.focus) doel.focus({ preventScroll: true });
  };
}
