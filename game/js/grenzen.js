// De echte grenzen van de provincie Groningen (#414): het compacte game/grenzen.json lezen en punt-in-polygoon doen.
// Pure regels, geen DOM, geen netwerk: het bestand komt uit scripts/world/grenzen.mjs (dat de ruwe PDOK- en CBS-gegevens van
// scripts/world/fetch_grenzen.mjs omzet) en wordt door gebiedenbronnen.js geladen. Hiërarchie: provincie > gemeente > woonplaats,
// en gemeente > wijk > buurt. Coördinaten zijn spelframe-meters (rdnew.js rdToWorld).
//
// Formaat van een gebied in het bestand: { id, naam, gm?, wk?, c: [x, y] (een punt erbinnen), p: [polygoon] }, een polygoon is
// [buitenring, ...gaten] en een ring is een platte lijst [x0, y0, dx1, dy1, ...]: het eerste punt absoluut, de rest als verschil.

export const GRENS_LAGEN = ['gemeenten', 'woonplaatsen', 'wijken', 'buurten'];

export function ontvouwRing(vlak) {
  const uit = [];
  let x = 0, y = 0;
  for (let i = 0; i + 1 < vlak.length; i += 2) {
    x = i ? x + vlak[i] : vlak[i];
    y = i ? y + vlak[i + 1] : vlak[i + 1];
    uit.push([x, y]);
  }
  return uit;
}

export function bboxVan(g) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of g.p) for (const [x, y] of p[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

// Even-odd: ligt (x, y) binnen deze ring?
export function puntInRing(x, y, r) {
  let bin = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) bin = !bin;
  }
  return bin;
}

// Ligt (x, y) in het gebied: binnen een buitenring en niet in een gat daarvan.
export function puntInGebied(g, x, y) {
  const b = g.b;
  if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) return false;
  for (const p of g.p) {
    if (!puntInRing(x, y, p[0])) continue;
    let gat = false;
    for (let k = 1; k < p.length; k++) if (puntInRing(x, y, p[k])) { gat = true; break; }
    if (!gat) return true;
  }
  return false;
}

const ontvouwGebied = (g) => {
  const uit = { id: g.id, naam: g.naam, c: g.c, p: g.p.map((poly) => poly.map(ontvouwRing)) };
  if (g.gm) uit.gm = g.gm;
  if (g.wk) uit.wk = g.wk;
  uit.b = bboxVan(uit);
  return uit;
};

// Het bestand (al als object) naar gebruiksklare gebieden met uitgepakte ringen en een omhullende doos. Kapotte of oude
// bestanden geven null: de spelcode valt dan terug op de wijkpunten van stad.json.
export function ontvouw(data) {
  if (!data || typeof data !== 'object' || data.v !== 1 || !data.provincie || !Array.isArray(data.gemeenten)) return null;
  const uit = { jaar: data.jaar || 0, bron: Array.isArray(data.bron) ? data.bron : [], provincie: ontvouwGebied(data.provincie) };
  for (const l of GRENS_LAGEN) uit[l] = (Array.isArray(data[l]) ? data[l] : []).filter((g) => g && g.id && g.naam && Array.isArray(g.p) && g.p.length).map(ontvouwGebied);
  return uit;
}

// Het gebied van een laag waar (x, y) in ligt, of null. Overlappen twee gebieden een beetje (door het vereenvoudigen), dan wint het
// gebied met het dichtstbijzijnde binnenpunt.
export function gebiedIn(laag, x, y) {
  let best = null, bd = Infinity;
  for (const g of laag) {
    if (!puntInGebied(g, x, y)) continue;
    const d = (g.c[0] - x) ** 2 + (g.c[1] - y) ** 2;
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

// Alle lagen in één keer voor een plek: { provincie, gemeente, woonplaats, wijk, buurt } met het gebied of null.
export function grensVan(grenzen, x, y) {
  if (!grenzen || !Number.isFinite(x) || !Number.isFinite(y)) return { provincie: null, gemeente: null, woonplaats: null, wijk: null, buurt: null };
  return {
    provincie: puntInGebied(grenzen.provincie, x, y) ? grenzen.provincie : null,
    gemeente: gebiedIn(grenzen.gemeenten, x, y),
    woonplaats: gebiedIn(grenzen.woonplaatsen, x, y),
    wijk: gebiedIn(grenzen.wijken, x, y),
    buurt: gebiedIn(grenzen.buurten, x, y),
  };
}
