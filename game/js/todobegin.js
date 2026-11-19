// #813: de selectie voor "Begin hier" in Te doen. Puur, zodat de UI-glue
// (todoui.js) niet nodig is om hem te testen.
export function beginHierItems(items, speler, aantal = 3) {
  const p = speler || { x: 0, y: 0 };
  const seen = new Set();
  const out = (Array.isArray(items) ? items : [])
    // alleen dingen die nu kunnen: 'later' (verder in het verhaal) en 'slot'
    // (nog niet vrijgespeeld) horen hier niet en zouden ook kunnen lekken
    .filter((it) => it && it.goal && it.status !== 'klaar' && it.status !== 'later' && it.status !== 'slot' && Number.isFinite(it.dist))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    .filter((it) => {
      if (seen.has(it.key)) return false;
      seen.add(it.key);
      return true;
    });
  if (!Number.isFinite(aantal)) return out;
  const top = out.slice(0, Math.max(0, aantal | 0));
  // #990: een rij met pin (een nieuwe streek ontdekken) blijft in beeld, ook als hij ver weg ligt: hij
  // neemt de plek van de laatste kaart. Hoe dichtbij de rest ook is, de speler ziet waar hij kan ontdekken.
  const pin = out.find((it) => it.pin);
  if (pin && top.length && !top.includes(pin)) top[top.length - 1] = pin;
  return top;
}

export function beginHierCount(items, speler) {
  return beginHierItems(items, speler, Infinity).length;
}
