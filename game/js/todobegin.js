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
  return out.slice(0, Math.max(0, aantal | 0));
}

export function beginHierCount(items, speler) {
  return beginHierItems(items, speler, Infinity).length;
}
