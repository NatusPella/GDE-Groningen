// De flat inrichten (#206): sommige meubels van furniture.js kunnen op een andere
// plek staan. Pure regels, geen DOM en geen THREE (scripts/inrichting_test.mjs).
//
// Elk meubel heeft een lijstje plekken (hoeken van de flat, in het vlak van de
// flat: x langs de gevel, z naar binnen). Twee meubels delen nooit een plek, en
// een plek ligt nooit op de vaste meubels van home.js (flat.solids) of in een muur.
// Gekozen plekken gaan mee in het savegame als `plekken` onder `meubels`.

// De hoeken die vrij zijn van vast meubilair. h1 staat standaard de lamp, h4 de plant.
export const PLEKKEN = {
  h1: { label: 'Hoek bij de gang', x: 0.6, z: 4.7 },
  h2: { label: 'Hoek bij het keukenraam', x: 6.3, z: 0.8 },
  h3: { label: 'Hoek bij de keukendeur', x: 6.3, z: 4.6 },
  h4: { label: 'Hoek in de keuken', x: 10.5, z: 4.7 },
  h5: { label: 'Kamer van Tammo', x: 4.0, z: 5.8 },
};

// Welke meubels verplaatsbaar zijn, waarheen, en wat de standaardplek is.
// half: halve breedte van het blokje waar je niet doorheen loopt.
export const VERPLAATSBAAR = {
  lamp: { opties: ['h1', 'h2', 'h3'], standaard: 'h1', half: 0.22 },
  plant: { opties: ['h4', 'h1', 'h2', 'h3', 'h5'], standaard: 'h4', half: 0.32 },
};

export const isVerplaatsbaar = (id) => Object.prototype.hasOwnProperty.call(VERPLAATSBAAR, id);

// Opslag: alleen bekende meubels en plekken die voor dat meubel mogen; de rest valt weg.
export function schoonPlekken(d) {
  const out = {};
  if (!d || typeof d !== 'object') return out;
  const taken = new Set();
  for (const id of Object.keys(VERPLAATSBAAR)) {
    const p = d[id];
    if (typeof p === 'string' && VERPLAATSBAAR[id].opties.includes(p) && !taken.has(p)) { out[id] = p; taken.add(p); }
  }
  return out;
}

// De plek van een meubel nu.
export function plekVan(plekken, id) {
  const v = VERPLAATSBAAR[id];
  return v ? (plekken && plekken[id]) || v.standaard : null;
}

// Ligt er een ander meubel (uit `eigen`) op deze plek?
export function plekBezet(plekken, eigen, id, plek) {
  return [...eigen].some((o) => o !== id && isVerplaatsbaar(o) && plekVan(plekken, o) === plek);
}

// De volgende vrije plek voor dit meubel, of null als er geen is.
export function volgendePlek(plekken, eigen, id) {
  const v = VERPLAATSBAAR[id];
  if (!v) return null;
  const nu = v.opties.indexOf(plekVan(plekken, id));
  for (let k = 1; k <= v.opties.length; k++) {
    const p = v.opties[(nu + k) % v.opties.length];
    if (p !== plekVan(plekken, id) && !plekBezet(plekken, eigen, id, p)) return p;
  }
  return null;
}

// Waar het meubel staat, met het blokje om niet doorheen te lopen, en de
// verschuiving van zijn `at`, `solid` en `use` ten opzichte van de standaardplek.
export function opPlek(id, plek) {
  const v = VERPLAATSBAAR[id];
  const p = PLEKKEN[plek];
  const std = v && PLEKKEN[v.standaard];
  if (!v || !p) return null;
  return { x: p.x, z: p.z, dx: p.x - std.x, dz: p.z - std.z, solid: [p.x - v.half, p.z - v.half, p.x + v.half, p.z + v.half] };
}

// Elke plek ligt binnen de flat (b x d), niet op een vast blokje en niet vlak langs een muur.
export function plekGeldig(plek, flat) {
  const p = PLEKKEN[plek];
  if (!p || !flat) return false;
  const m = 0.3;
  if (p.x < m || p.z < m || p.x > flat.w - m || p.z > flat.d - m) return false;
  for (const [x0, z0, x1, z1] of flat.solids || []) if (p.x > x0 - 0.3 && p.x < x1 + 0.3 && p.z > z0 - 0.3 && p.z < z1 + 0.3) return false;
  for (const [x1, z1, x2, z2] of flat.walls || []) {
    const wx = Math.min(x1, x2), wX = Math.max(x1, x2), wz = Math.min(z1, z2), wZ = Math.max(z1, z2);
    if (p.x > wx - 0.3 && p.x < wX + 0.3 && p.z > wz - 0.3 && p.z < wZ + 0.3) return false;
  }
  return true;
}
