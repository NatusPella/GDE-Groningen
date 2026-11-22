// De minikaart is aanklikbaar (#985): een tik of klik opent de kaart. Op een telefoon stond de kaart
// achter "Meer" (twee tikken); nu is het wat je ziet ook de weg ernaartoe. De HUD blijft verder
// onaanraakbaar: alleen deze ene plek vangt een klik. Met de muis in het spel (pointer lock) komen
// klikken nooit hier aan, dus een klik tijdens het rijden opent niets.

// el: het element, open(): opent de kaart, blocked(): true als openen nu niet mag (menu al open, scène).
// Verfijning 22-11: een snelle dubbelklik of dubbeltik opende de kaart twee keer (open en weer dicht); binnen COOLDOWN_MS telt van de klikken maar één,
// en een vastgehouden Enter of spatie (herhalende keydown) opent hem ook maar één keer.
export const MINIMAP_COOLDOWN_MS = 350;
export function bindMinimapOpen(el, open, blocked = () => false, now = () => Date.now()) {
  let last = -Infinity;
  const go = (e, klik = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (blocked()) return false;
    if (e && e.repeat) return false;
    if (klik) {
      const t = now();
      if (t - last < MINIMAP_COOLDOWN_MS) return false;
      last = t;
    }
    open();
    return true;
  };
  el.addEventListener('click', (e) => go(e, true));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') go(e);
  });
  return go;
}
