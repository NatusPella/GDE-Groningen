// De POI-lagen van de stad in de tegelindex (#314, stap B6; docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md 4.5).
// De plaatsen van map.meta (winkels, horeca, garages, buurtpunten, pois per soort, ...) staan als
// rijen in de POIS-sectie van de tegel van hun punt (game/js/poisections.js). Deze module legt per
// lijst vast welke tegels die lijst dragen, zodat een lezer (shops.js, horeca.js, ...) alleen die
// tegels hoeft te vragen in plaats van de hele set. De rijen blijven de bron: joinMeta() geeft uit
// de tegels van een laag dezelfde lijst terug.
//
//   poiLayers(split) -> { layers: { naam: { n, rest, tiles } }, rest }
//   poiLayerTiles(index, naam) -> de tegelssleutels van die laag (leeg als de wereld ze niet heeft)
//
// split is de uitkomst van splitMeta(); index is de index.json van de wereld (`index.pois`).
// `n` is het aantal rijen in de tegels, `rest` het aantal plaatsen van die lijst dat in de globale
// laag bleef (poiRest, buiten de stadstegels): samen is dat de hele lijst van de meta. Een losse
// plaats (hospital, helipad: poiLists -1) heeft `n` 1 en in zijn rij `_n` -1; een lezer vraagt hem met
// facilities.js poiLayerPlace, een lijst met poiLayerPlaces.

// per lijst van de meta het aantal rijen in de tegels en de tegels die ze dragen (gesorteerd).
// Elke lijst uit poiLists staat erin, ook een lege: een lezer weet dan dat de soort bestaat.
export function poiLayers(split) {
  const meta = (split && split.meta) || {};
  const counts = meta.poiLists || {};
  const layers = {}, seen = new Map();
  for (const name of Object.keys(counts)) { layers[name] = { n: 0, rest: 0, tiles: [] }; seen.set(name, new Set()); }
  for (const [key, rows] of (split && split.rows) || []) {
    for (const row of rows) {
      const tiles = seen.get(row._l);
      if (!tiles) continue; // (a row of a list that is not in poiLists: not ours)
      tiles.add(key);
      layers[row._l].n++;
    }
  }
  for (const row of meta.poiRest || []) if (layers[row._l]) layers[row._l].rest++;
  for (const [name, tiles] of seen) layers[name].tiles = [...tiles].sort();
  return { layers, rest: (meta.poiRest || []).length };
}

// de tegels van een laag uit de index van de wereld; een wereld zonder poi-index geeft geen tegels
export function poiLayerTiles(index, name) {
  const layer = index && index.pois && index.pois.layers && index.pois.layers[name];
  return layer ? layer.tiles.slice() : [];
}
