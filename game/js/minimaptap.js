// De minikaart is aanklikbaar (#985): een tik of klik opent de kaart. Op een telefoon stond de kaart
// achter "Meer" (twee tikken); nu is het wat je ziet ook de weg ernaartoe. De HUD blijft verder
// onaanraakbaar: alleen deze ene plek vangt een klik. Met de muis in het spel (pointer lock) komen
// klikken nooit hier aan, dus een klik tijdens het rijden opent niets.

// el: het element, open(): opent de kaart, blocked(): true als openen nu niet mag (menu al open, scène).
export function bindMinimapOpen(el, open, blocked = () => false) {
  const go = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (blocked()) return false;
    open();
    return true;
  };
  el.addEventListener('click', go);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') go(e);
  });
  return go;
}
