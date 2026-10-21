// De flat inrichten (#206, #359): sommige meubels van furniture.js (lamp, plant, kast, tv, bureau,
// bank en bedden) kunnen op een andere plek staan. Pure regels, geen DOM en geen THREE (scripts/inrichting_test.mjs).
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

// Wandplekken voor de kast en het bureau: aan een muur, met eigen draairichting, blokje
// en gebruikspunt (anders dan de hoeken hierboven die voor kleine meubels zijn).
// Kast: 1,3 m breed, 0,56 diep. Bureau: 1,3 m breed, 0,65 diep.
export const WANDPLEKKEN = {
  k1: { label: 'Westmuur van de woonkamer', x: 0.36, z: 2.6, rot: Math.PI / 2, solid: [0.1, 1.95, 0.66, 3.25], use: { x: 1.15, z: 2.6 } },
  k2: { label: 'Westmuur, naast de lamphoek', x: 0.36, z: 3.7, rot: Math.PI / 2, solid: [0.1, 3.05, 0.66, 4.35], use: { x: 1.15, z: 3.7 } },
  k3: { label: 'Kamer van Tammo, noordmuur', x: 5.3, z: 5.5, rot: 0, solid: [4.65, 5.25, 5.95, 5.83], use: { x: 5.3, z: 6.4 } },
  b1: { label: "Zuidmuur van Tessa's kamer", x: 10.3, z: 8.62, rot: Math.PI, solid: [9.65, 8.3, 10.95, 8.95], use: { x: 10.3, z: 7.8 } },
  b2: { label: 'Zuidmuur, naast het bed', x: 9.0, z: 8.62, rot: Math.PI, solid: [8.35, 8.3, 9.65, 8.95], use: { x: 9.0, z: 7.8 } },
  b3: { label: 'Woonkamer, noordmuur', x: 1.85, z: 0.55, rot: 0, solid: [1.2, 0.2, 2.5, 0.85], use: { x: 1.85, z: 1.5 } },
  t1: { label: 'Woonkamer, noordmuur in het midden', x: 3.7, z: 1.0, rot: 0, solid: [2.8, 0.2, 4.6, 1.35], use: { x: 5.25, z: 1.35 } },
  t2: { label: 'Woonkamer, noordmuur bij de keuken', x: 6.0, z: 1.0, rot: 0, solid: [5.1, 0.2, 6.9, 1.35], use: { x: 7.5, z: 1.35 } },
  t3: { label: 'Woonkamer, noordmuur bij de gang', x: 1.95, z: 1.0, rot: 0, solid: [1.05, 0.2, 2.85, 1.35], use: { x: 3.45, z: 1.35 } },
  b4: { label: 'Kamer van Tammo, noordmuur', x: 5.3, z: 5.55, rot: 0, solid: [4.65, 5.25, 5.95, 5.9], use: { x: 5.3, z: 6.5 } },
};

// De bank (Zitmoi): 2,6 m lang, 1,2 m diep met de rugleuning. Een standplek geeft het midden en de
// draairichting (rot: 0 kijkt naar +z, PI naar de noordmuur, PI/2 naar +x); het blokje, het gebruikspunt
// (waar E het zitten start), de zitplek van de speler, de plek van de ander en de plek waar je opstaat
// rekenen we uit het midden. `kant` is het uiteinde waar je langs de bank loopt: 1 = rechts als je
// erop kijkt (zoals de standaardplek), -1 = links.
const rond = (v) => Math.round(v * 1e4) / 1e4;
function bankPlek(label, x, z, rot, kant) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const wereld = (lx, lz) => ({ x: rond(x + lx * c + lz * s), z: rond(z - lx * s + lz * c) });
  const hoek = [wereld(-1.3, -0.6), wereld(1.3, 0.6)];
  return {
    label, x, z, rot, kant,
    solid: [rond(Math.min(hoek[0].x, hoek[1].x)), rond(Math.min(hoek[0].z, hoek[1].z)), rond(Math.max(hoek[0].x, hoek[1].x)), rond(Math.max(hoek[0].z, hoek[1].z))],
    use: wereld(-1.75 * kant, 0.2),
    seat: wereld(-0.55 * kant, -0.03),
    buur: wereld(0.55 * kant, -0.03),
    sta: wereld(-1.7 * kant, 0.35),
    kijk: { x: rond(Math.sin(rot)), z: rond(Math.cos(rot)) },
  };
}
export const BANKPLEKKEN = {
  s1: bankPlek('Midden van de woonkamer', 3.7, 3.95, Math.PI, 1),
  s2: bankPlek('Zuidmuur van de woonkamer, bij de gang', 4.8, 4.6, Math.PI, 1),
  s3: bankPlek('Zuidmuur van de woonkamer, bij de keuken', 6.6, 4.6, Math.PI, -1),
  s4: bankPlek('Westmuur van de woonkamer', 0.6, 2.3, Math.PI / 2, 1),
};

// De twee bedden (Sloapstee) gaan samen: elk blijft in zijn eigen kamer (Tammo links, Tessa rechts van
// de scheidingsmuur), alleen de kop gaat naar de zuid- of de noordmuur. 0,95 x 2,0 m, rot PI = kop
// naar de zuidmuur. `use` is de plek naast het bed waar E het slapen start.
function bedPlek(label, tammoZuid, tessaZuid) {
  const bed = (x, zuid) => ({ x, z: zuid ? 7.95 : 6.25, rot: zuid ? Math.PI : 0, solid: [rond(x - 0.475), zuid ? 6.9 : 5.25, rond(x + 0.475), zuid ? 8.95 : 7.25] });
  const t = bed(6.6, tammoZuid), s = bed(7.8, tessaZuid);
  t.use = { x: 5.65, z: tammoZuid ? 7.3 : 6.9 };
  s.use = { x: 8.75, z: tessaZuid ? 7.3 : 6.9 };
  return { label, bedden: [t, s] };
}
export const BEDPLEKKEN = {
  d1: bedPlek('Koppen tegen de zuidmuur', true, true),
  d2: bedPlek('Koppen tegen de noordmuur', false, false),
  d3: bedPlek('Tammo met de kop naar het zuiden, Tessa naar het noorden', true, false),
  d4: bedPlek('Tammo met de kop naar het noorden, Tessa naar het zuiden', false, true),
};

// De losse blokjes van home.js (flat.solids) die bank en bedden vervangen zodra ze zijn bezorgd; die
// vallen weg zodat het meubel op zijn nieuwe plek niet tegen een spookblokje loopt.
export const STOCK_BLOKJES = {
  bank: [[2.4, 3.35, 5.0, 4.55]],
  bed: [[6.1, 6.9, 7.1, 8.95], [7.3, 6.9, 8.3, 8.95]],
};
export function zonderStock(solids, bezit) {
  const weg = new Set();
  for (const id of Object.keys(STOCK_BLOKJES)) if (bezit && bezit.has(id)) for (const b of STOCK_BLOKJES[id]) weg.add(b.join());
  return (solids || []).filter((b) => !weg.has(b.join()));
}

// Welke meubels verplaatsbaar zijn, waarheen, en wat de standaardplek is.
// half: halve breedte van het blokje waar je niet doorheen loopt.
export const VERPLAATSBAAR = {
  bank: { opties: ['s1', 's2', 's3', 's4'], standaard: 's1', bankplek: true },
  bed: { opties: ['d1', 'd2', 'd3', 'd4'], standaard: 'd1', bedplek: true },
  lamp: { opties: ['h1', 'h2', 'h3', 'h4', 'h5'], standaard: 'h1', half: 0.22 },
  plant: { opties: ['h4', 'h1', 'h2', 'h3', 'h5'], standaard: 'h4', half: 0.32 },
  kast: { opties: ['k1', 'k2', 'k3'], standaard: 'k1', wand: true },
  tv: { opties: ['t1', 't2', 't3'], standaard: 't1', wand: true },
  bureau: { opties: ['b1', 'b2', 'b3', 'b4'], standaard: 'b1', wand: true },
};

// De plek (hoek of wand) met zijn naam.
export const plekInfo = (plek) => PLEKKEN[plek] || WANDPLEKKEN[plek] || BANKPLEKKEN[plek] || BEDPLEKKEN[plek] || null;

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

// Ligt er een ander meubel (uit `eigen`) op deze plek of zo dicht erbij dat de blokjes overlappen?
export function plekBezet(plekken, eigen, id, plek) {
  const r = opPlek(id, plek);
  return [...eigen].some((o) => {
    if (o === id || !isVerplaatsbaar(o)) return false;
    const q = plekVan(plekken, o);
    if (q === plek) return true;
    const t = opPlek(o, q);
    return !!(r && t && r.solids.some((a) => t.solids.some((b) => overlap(a, b))));
  });
}

const overlap = (a, b, m = 0.05) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;

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
// Wandmeubels geven ook hun draairichting `rot` en gebruikspunt `use` mee.
export function opPlek(id, plek) {
  const v = VERPLAATSBAAR[id];
  if (!v) return null;
  if (v.bankplek) {
    const p = BANKPLEKKEN[plek], std = BANKPLEKKEN[v.standaard];
    if (!p) return null;
    return { x: p.x, z: p.z, rot: p.rot, dx: p.x - std.x, dz: p.z - std.z, solid: p.solid, solids: [p.solid], use: p.use, seat: p.seat, buur: p.buur, sta: p.sta, kijk: p.kijk };
  }
  if (v.bedplek) {
    const p = BEDPLEKKEN[plek];
    if (!p) return null;
    const [t, s] = p.bedden;
    return { x: t.x, z: t.z, rot: t.rot, dx: 0, dz: 0, solid: t.solid, solids: [t.solid, s.solid], bedden: p.bedden };
  }
  if (v.wand) {
    const p = WANDPLEKKEN[plek], std = WANDPLEKKEN[v.standaard];
    if (!p) return null;
    return { x: p.x, z: p.z, rot: p.rot, dx: p.x - std.x, dz: p.z - std.z, solid: p.solid, solids: [p.solid], use: p.use };
  }
  const p = PLEKKEN[plek];
  const std = PLEKKEN[v.standaard];
  if (!p) return null;
  const solid = [p.x - v.half, p.z - v.half, p.x + v.half, p.z + v.half];
  return { x: p.x, z: p.z, dx: p.x - std.x, dz: p.z - std.z, solid, solids: [solid] };
}

// Elke plek ligt binnen de flat (b x d), niet op een vast blokje en niet vlak langs een muur.
// Wandplekken staan juist tegen een muur: daar telt alleen dat het blokje binnen de flat blijft,
// geen vast blokje raakt, geen muur kruist en het gebruikspunt vrij is.
export function plekGeldig(plek, flat) {
  if (WANDPLEKKEN[plek]) return wandGeldig(WANDPLEKKEN[plek], flat);
  if (BANKPLEKKEN[plek]) return wandGeldig(BANKPLEKKEN[plek], flat);
  if (BEDPLEKKEN[plek]) return BEDPLEKKEN[plek].bedden.every((b) => wandGeldig(b, flat));
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

function wandGeldig(p, flat) {
  if (!flat) return false;
  const [x0, z0, x1, z1] = p.solid;
  if (x0 < 0 || z0 < 0 || x1 > flat.w || z1 > flat.d) return false;
  for (const o of flat.solids || []) if (overlap(p.solid, o, 0)) return false;
  for (const [ax, az, bx, bz] of flat.walls || []) {
    // een muur is een dun lijntje: het blokje mag er langs staan (<= 0,06 erin), niet doorheen
    const wx = Math.min(ax, bx), wX = Math.max(ax, bx), wz = Math.min(az, bz), wZ = Math.max(az, bz);
    if (x0 + 0.06 < wX && x1 - 0.06 > wx && z0 + 0.06 < wZ && z1 - 0.06 > wz) return false;
  }
  const u = p.use;
  for (const [a, b, c, d] of flat.solids || []) if (u.x > a - 0.2 && u.x < c + 0.2 && u.z > b - 0.2 && u.z < d + 0.2) return false;
  return true;
}
