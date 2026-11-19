import { isNeverHidden } from './kaartonthulling.js';
// Te doen en de kaartzoeker lekken geen onbekende streken (#985). De kaart verbergt de naam en de
// activiteiten van een streek die de speler nog niet kent (isAreaHidden, #825); Te doen toonde ze
// wel, met naam en afstand. Deze regel haalt ze uit de lijst, op dezelfde maat als de kaart:
// - missies en het verhaal blijven (de kaart laat missies ook staan: niets is onbereikbaar);
// - de dorpen van het paspoort en het uitkijkpunt blijven: dat zijn de wegen naar een nieuwe streek;
// - het eerbetoon aan de westgrens (om:beppe, #832) blijft: de plek ligt aan de rand van de wereld, in of
//   naast een streek die je nog niet kent, en de kaart laat zijn icoon ook altijd staan (#916);
// - al het andere met een plek in een onbekende streek gaat eruit.
// De lijst zelf staat op één plek (kaartonthulling.js, #990): de kaart en Te doen delen hem.

export function hideUnknownAreas(items, isHidden) {
  if (typeof isHidden !== 'function') return items;
  return items.filter((it) => {
    if (!it || !Number.isFinite(it.x) || !Number.isFinite(it.y)) return true;
    if (isNeverHidden(it)) return true;
    return !isHidden(it.x, it.y);
  });
}
