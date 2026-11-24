// Automatische vereenvoudiging voor het centrale LOD-systeem (lodkit3d.js, besluit eigenaar 23-11: alle modellen krijgen LOD's).
// Puur (geen three.js): werkt op platte arrays, zodat scripts/lod_audit_test.mjs het in Node keurt.
//
// Methode: vertexclustering op een raster (Rossignac-Borrel). Elk hoekpunt valt in een cel van `cell` meter; alle hoekpunten van een cel
// worden één punt (het gemiddelde van positie en vertexkleur). Driehoeken waarvan twee hoeken in dezelfde cel vallen, verdwijnen; dubbele
// driehoeken ook. Dat past bij de low-poly stijl: platte vlakken met vertexkleur, geen UV's die moeten blijven kloppen. De kleur wordt
// per cel gemiddeld, dus een rode band op een witte paal wordt bij een grove cel een roze paal: daarom kiest buildLodChain de grofste cel
// die het silhouet (de bounding box) binnen `keepBox` houdt, en geeft een niveau op als het niet genoeg driehoeken scheelt.

// geometry: { position: Float32Array (x,y,z per hoekpunt), color?: Float32Array (r,g,b per hoekpunt), index?: Uint16/32Array }.
export function triCount(g) {
  return g.index ? (g.index.length / 3) | 0 : ((g.position.length / 9) | 0);
}

export function bboxOf(position) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < position.length; i += 3) {
    const x = position[i], y = position[i + 1], z = position[i + 2];
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z;
    if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z;
  }
  return b;
}

// Eén niveau: vertexclustering met celgrootte `cell` (m, of [x, y, z] per as: een smal model als een roeiboot houdt zo zijn breedte). Geeft een niet-geïndexeerde geometrie { position, color? } terug.
export function simplifyClustered(g, cell) {
  const P = g.position, C = g.color || null, I = g.index || null;
  const nVert = P.length / 3;
  const [ix, iy, iz] = Array.isArray(cell) ? cell.map((c) => 1 / c) : [1 / cell, 1 / cell, 1 / cell];
  const cellOf = new Int32Array(nVert);
  const keys = new Map();
  const sum = [];
  // het punt van een cel is het hoekpunt dat het verst van het midden van het model ligt (niet het gemiddelde): zo blijven de buitenkant,
  // de top van een mast en de punt van een boeg staan en krimpt het silhouet niet; de kleur is wel het gemiddelde van de cel
  const box = bboxOf(P);
  const mx = (box[0] + box[3]) / 2, my = (box[1] + box[4]) / 2, mz = (box[2] + box[5]) / 2;
  for (let v = 0; v < nVert; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const k = `${Math.floor(x * ix)},${Math.floor(y * iy)},${Math.floor(z * iz)}`;
    let id = keys.get(k);
    if (id === undefined) { id = sum.length; keys.set(k, id); sum.push([0, 0, 0, 0, 0, 0, 0, -1]); }
    const s = sum[id];
    const far = (x - mx) * (x - mx) + (y - my) * (y - my) + (z - mz) * (z - mz);
    if (far > s[7]) { s[0] = x; s[1] = y; s[2] = z; s[7] = far; }
    if (C) { s[3] += C[v * 3]; s[4] += C[v * 3 + 1]; s[5] += C[v * 3 + 2]; }
    s[6]++;
    cellOf[v] = id;
  }
  const rep = sum.map((s) => [s[0], s[1], s[2], s[3] / s[6], s[4] / s[6], s[5] / s[6]]);
  const nTri = I ? I.length / 3 : nVert / 3;
  const pos = [], col = [];
  const seen = new Set();
  for (let t = 0; t < nTri; t++) {
    const va = I ? I[t * 3] : t * 3, vb = I ? I[t * 3 + 1] : t * 3 + 1, vc = I ? I[t * 3 + 2] : t * 3 + 2;
    const a = cellOf[va], b = cellOf[vb], c = cellOf[vc];
    if (a === b || b === c || a === c) continue; // ingeklapt
    // dezelfde driehoek (in welke draairichting ook die de oorspronkelijke had) maar één keer; de draairichting blijft die van de eerste
    const lo = Math.min(a, b, c), hi = Math.max(a, b, c), mid = a + b + c - lo - hi;
    const key = `${lo},${mid},${hi},${(a === lo && b === mid) || (b === lo && c === mid) || (c === lo && a === mid) ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const id of [a, b, c]) {
      const r = rep[id];
      pos.push(r[0], r[1], r[2]);
      if (C) col.push(r[3], r[4], r[5]);
    }
  }
  return { position: new Float32Array(pos), color: C ? new Float32Array(col) : null, index: null };
}

// De grens van het silhouet: elke as van de bounding box van het niveau is minstens keepBox van het origineel en schuift niet meer dan
// (1 - keepBox) van die as op. Een paal die een kegel wordt mag, een paal die verdwijnt niet.
export function silhouetteKept(orig, simp, keepBox = 0.8) {
  for (let a = 0; a < 3; a++) {
    const e0 = orig[a + 3] - orig[a], e1 = simp[a + 3] - simp[a];
    if (e0 <= 1e-6) continue;
    if (e1 < e0 * keepBox) return false;
    if (Math.abs((simp[a] + simp[a + 3]) / 2 - (orig[a] + orig[a + 3]) / 2) > e0 * (1 - keepBox)) return false;
  }
  return true;
}

// De LOD-keten van één model: [LOD0 (het origineel), LOD1, LOD2]. Per niveau de grofste cel (een deel van de grootste maat van het model,
// `cells`) die het silhouet houdt en minstens `minCut` van de driehoeken van het origineel scheelt. Een niveau dat dat niet haalt, valt
// weg (dan is het model al zo eenvoudig dat een kleiner niveau niets wint). Geeft { levels: [{ geom, tris, cell }], tris0 }.
// de grofste cel (deel van een as) die greedy per niveau mag nemen
export const GREEDY_MAX = [0.14, 0.26];
export const LOD_CELLS = [[0.04, 0.07, 0.1, 0.14, 0.18, 0.24, 0.3], [0.12, 0.16, 0.2, 0.26, 0.32, 0.4]];
// greedy: per niveau de grofste cel die het silhouet nog houdt (voor een deel van een model, zie buildLodChainGroups: daar telt de
// besparing van het geheel); anders de fijnste cel die minCut haalt.
export function buildLodChain(g, { minCut = [0.4, 0.7], keepBox = 0.8, cells = LOD_CELLS, greedy = false } = {}) {
  const tris0 = triCount(g);
  const box = bboxOf(g.position);
  // per as een deel van die as (met een ondergrens van 2% van de grootste maat): een lange, smalle romp wordt in de lengte grof en blijft
  // in de breedte fijn genoeg om zijn breedte te houden
  const size = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]) || 1;
  const axes = [box[3] - box[0], box[4] - box[1], box[5] - box[2]].map((e) => Math.max(e, size * 0.02));
  const levels = [{ geom: g, tris: tris0, cell: 0 }];
  let prev = g;
  for (let L = 0; L < minCut.length; L++) {
    let best = null;
    for (const f of cells[L] || cells[cells.length - 1]) {
      if (greedy && f > GREEDY_MAX[Math.min(L, GREEDY_MAX.length - 1)]) break; // niet grover dan dit: een boot op 40 m blijft een boot
      const s = simplifyClustered(prev, axes.map((e) => e * f));
      const tris = triCount(s);
      if (!tris || !silhouetteKept(box, bboxOf(s.position), keepBox)) break; // grover gaat het silhouet alleen maar verder kwijt
      if (greedy) { if (tris < (best ? best.tris : triCount(prev))) best = { geom: s, tris, cell: size * f }; continue; }
      if (tris <= tris0 * (1 - minCut[L])) { best = { geom: s, tris, cell: size * f }; break; }
    }
    if (!best) break;
    levels.push(best);
    prev = best.geom;
  }
  return { levels, tris0 };
}

// Een model met meerdere materialen (geometry.groups: carrosserie, glas, lampen): elke groep apart vereenvoudigd, zodat een ruit glas blijft.
// groups: [{ start, count, materialIndex }] in indexeenheden (geïndexeerd) of hoekpunten (niet geïndexeerd), zoals three.js ze bijhoudt.
// Een groep die niet lichter kan, houdt zijn grofste niveau; een niveau telt alleen als het hele model minCut haalt.
// Geeft { levels: [{ geom, groups, tris }], tris0 } met geom niet geïndexeerd en groups in hoekpunten.
export function buildLodChainGroups(g, groups, opts = {}) {
  const minCut = opts.minCut || [0.4, 0.7];
  const parts = groups.map((gr) => {
    let sub;
    if (g.index) sub = { position: g.position, color: g.color, index: g.index.subarray(gr.start, gr.start + gr.count) };
    else sub = { position: g.position.subarray(gr.start * 3, (gr.start + gr.count) * 3), color: g.color ? g.color.subarray(gr.start * 3, (gr.start + gr.count) * 3) : null, index: null };
    // een groep die het niet haalt (een kleine ruit), houdt zijn grofste niveau; de eis geldt hieronder voor het hele model
    const chain = buildLodChain(sub, { ...opts, minCut, greedy: true });
    return { gr, chain: chain.levels };
  });
  const tris0 = parts.reduce((a, p) => a + p.chain[0].tris, 0);
  const levels = [];
  const maxLen = Math.max(...parts.map((p) => p.chain.length));
  const hasColor = !!g.color;
  const build = (depth) => {
    const pos = [], col = [], outGroups = [];
    let tris = 0;
    for (const p of parts) {
      const lv = p.chain[Math.min(depth, p.chain.length - 1)];
      const flat = lv.geom.index ? expand(lv.geom) : lv.geom;
      const startV = pos.length / 3;
      for (let i = 0; i < flat.position.length; i++) pos.push(flat.position[i]);
      if (hasColor && flat.color) for (let i = 0; i < flat.color.length; i++) col.push(flat.color[i]);
      outGroups.push({ start: startV, count: flat.position.length / 3, materialIndex: p.gr.materialIndex });
      tris += lv.tris;
    }
    return { geom: { position: new Float32Array(pos), color: hasColor ? new Float32Array(col) : null, index: null }, groups: outGroups, tris };
  };
  levels.push(build(0));
  // elk volgend niveau: de eerste diepte (na de vorige) waarop het hele model de besparing haalt; een tussenstap die het net niet haalt,
  // wordt overgeslagen in plaats van de keten af te breken
  let depth = 0;
  for (let L = 1; L <= minCut.length; L++) {
    const need = tris0 * (1 - minCut[Math.min(L - 1, minCut.length - 1)]);
    let found = null;
    for (let d = depth + 1; d < maxLen; d++) { const lv = build(d); if (lv.tris <= need) { found = lv; depth = d; break; } }
    if (!found) break;
    levels.push(found);
  }
  return { levels, tris0 };
}
function expand(g) {
  const P = g.position, C = g.color, I = g.index;
  const pos = new Float32Array(I.length * 3), col = C ? new Float32Array(I.length * 3) : null;
  for (let i = 0; i < I.length; i++) for (let a = 0; a < 3; a++) { pos[i * 3 + a] = P[I[i] * 3 + a]; if (col) col[i * 3 + a] = C[I[i] * 3 + a]; }
  return { position: pos, color: col, index: null };
}

// Een niveau dat dicht bij een doel in driehoeken uitkomt (24-11, voor zware voertuigen en treinen): per groep vertexclustering met één celgrootte
// (een deel van de grootste maat) die in kleine stappen grover wordt, tot het hele model onder het doel blijft en het silhouet nog klopt.
// Geeft { geom: { position, color, index: null }, groups, tris } of null als het doel niet te halen is zonder het silhouet te verliezen.
export function simplifyToTarget(position, color, groups, doel, keepBox = 0.9) {
  const box = bboxOf(position), size = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]) || 1;
  for (let f = 0.004; f <= 0.12; f *= 1.05) {
    const pos = [], col = [], gr = [];
    for (const g of groups) {
      const sub = { position: position.subarray(g.start * 3, (g.start + g.count) * 3), color: color.subarray(g.start * 3, (g.start + g.count) * 3), index: null };
      const o = simplifyClustered(sub, size * f);
      gr.push({ start: pos.length / 3, count: o.position.length / 3, materialIndex: g.materialIndex });
      for (const v of o.position) pos.push(v);
      for (const v of o.color) col.push(v);
    }
    if (!silhouetteKept(box, bboxOf(pos), keepBox)) return null;
    if (pos.length / 9 <= doel) return { geom: { position: new Float32Array(pos), color: new Float32Array(col), index: null }, groups: gr.filter((x) => x.count), tris: pos.length / 9 };
  }
  return null;
}
