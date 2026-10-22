// De ruwe grenzen uit data/cache/grenzen (scripts/world/fetch_grenzen.mjs) omzetten naar het compacte game/grenzen.json (#414).
//   node scripts/world/grenzen.mjs [--uit=game/grenzen.json] [--invoer=data/cache/grenzen] [--tol=12]
// Per laag (provincie, gemeenten, woonplaatsen, wijken, buurten): de ringen naar het spelframe (RD New min de oorsprong van het spel,
// y naar het zuiden: rdnew.js rdToWorld), vereenvoudigd (Douglas-Peucker, tolerantie in meter), kleine eilandjes en gaatjes weg,
// op hele meters afgerond en per ring als verschillen opgeslagen (eerste punt absoluut, de rest dx, dy). Plus een binnenpunt per
// gebied (voor de kaart en voor het ouderschap) en de gemeentecode. game/js/grenzen.js leest dit en doet het punt-in-polygoon.
// De uitvoer is deterministisch: dezelfde invoer geeft dezelfde bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rdToWorld } from '../../game/js/rdnew.js';
import { puntInGebied, bboxVan } from '../../game/js/grenzen.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const INV = path.resolve(ROOT, arg('invoer', 'data/cache/grenzen'));
const UIT = path.resolve(ROOT, arg('uit', 'game/grenzen.json'));
const TOL = { provincie: 40, gemeente: 30, woonplaats: Number(arg('tol', 12)), wijk: 12, buurt: 10 };
const MIN_OPP = { provincie: 20000, gemeente: 20000, woonplaats: 3000, wijk: 1500, buurt: 800 }; // m2: kleinere eilandjes en gaten vallen weg

const lees = (n) => JSON.parse(fs.readFileSync(path.join(INV, n), 'utf8'));

// Douglas-Peucker op een open polylijn (iteratief, geen recursiediepte); geeft de te houden indexen.
export function dp(pts, tol) {
  const n = pts.length;
  const houd = new Uint8Array(n);
  houd[0] = houd[n - 1] = 1;
  const stapel = [[0, n - 1]];
  const t2 = tol * tol;
  while (stapel.length) {
    const [a, b] = stapel.pop();
    let maxD = -1, maxI = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let d2;
      if (l2 === 0) d2 = (px - ax) ** 2 + (py - ay) ** 2;
      else { const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); d2 = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2; }
      if (d2 > maxD) { maxD = d2; maxI = i; }
    }
    if (maxD > t2) { houd[maxI] = 1; stapel.push([a, maxI], [maxI, b]); }
  }
  return pts.filter((_, i) => houd[i]);
}
export const oppervlak = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return s / 2; };

// Een ring: naar het spelframe, hele meters, vereenvoudigd. Geeft null als er niets bruikbaars overblijft.
export function ring(r, tol, minOpp) {
  const uniek = [];
  for (const [x, y] of r) {
    const [wx, wy] = rdToWorld(x, y);
    const q = [Math.round(wx), Math.round(wy)];
    const l = uniek[uniek.length - 1];
    if (!l || l[0] !== q[0] || l[1] !== q[1]) uniek.push(q);
  }
  if (uniek.length > 1 && uniek[0][0] === uniek[uniek.length - 1][0] && uniek[0][1] === uniek[uniek.length - 1][1]) uniek.pop();
  if (uniek.length < 3) return null;
  // een gesloten ring vereenvoudigen: begin bij het punt het verst van het eerste, zo blijven de uiterste punten staan
  let verst = 0, vd = -1;
  for (let i = 1; i < uniek.length; i++) { const d = (uniek[i][0] - uniek[0][0]) ** 2 + (uniek[i][1] - uniek[0][1]) ** 2; if (d > vd) { vd = d; verst = i; } }
  const gedraaid = [...uniek.slice(verst), ...uniek.slice(0, verst)];
  const pts = dp([...gedraaid, gedraaid[0]], tol).slice(0, -1);
  if (pts.length < 3 || Math.abs(oppervlak(pts)) < minOpp) return null;
  return pts;
}

// MultiPolygon (of Polygon) -> [polygoon], polygoon = [buitenring, ...gaten]; kleine delen weg, maar altijd het grootste deel houden.
export function vlak(geom, tol, minOpp) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const uit = [];
  let grootste = null, gOpp = -1;
  for (const p of polys) {
    const buiten = ring(p[0], tol, minOpp);
    if (buiten) { uit.push([buiten, ...p.slice(1).map((h) => ring(h, tol, minOpp * 2)).filter(Boolean)]); continue; }
    const ruw = ring(p[0], tol, 0);
    if (ruw && Math.abs(oppervlak(ruw)) > gOpp) { gOpp = Math.abs(oppervlak(ruw)); grootste = [ruw]; }
  }
  if (!uit.length && grootste) uit.push(grootste);
  return uit;
}

// Een punt binnen het gebied: het zwaartepunt als dat erin ligt, anders het binnenste punt van een raster (op hele meters).
export function binnenpunt(polys) {
  const g = { p: polys };
  let sx = 0, sy = 0, sa = 0;
  const grootste = [...polys].sort((a, b) => Math.abs(oppervlak(b[0])) - Math.abs(oppervlak(a[0])))[0][0];
  for (let i = 0; i < grootste.length; i++) {
    const [x1, y1] = grootste[i], [x2, y2] = grootste[(i + 1) % grootste.length];
    const c = x1 * y2 - x2 * y1;
    sx += (x1 + x2) * c; sy += (y1 + y2) * c; sa += c;
  }
  const c = sa ? [Math.round(sx / (3 * sa)), Math.round(sy / (3 * sa))] : grootste[0];
  if (puntInGebied(g, c[0], c[1])) return c;
  const b = bboxVan(g);
  let best = null, bd = Infinity;
  for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
    const x = Math.round(b[0] + (b[2] - b[0]) * i / 40), y = Math.round(b[1] + (b[3] - b[1]) * j / 40);
    if (!puntInGebied(g, x, y)) continue;
    const d = (x - c[0]) ** 2 + (y - c[1]) ** 2;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best || grootste[0];
}

// ring -> platte lijst: eerste punt absoluut, de rest als verschil met het vorige
export const delta = (r) => { const uit = []; let px = 0, py = 0; r.forEach(([x, y], i) => { uit.push(i ? x - px : x, i ? y - py : y); px = x; py = y; }); return uit; };
const inpak = (polys) => polys.map((p) => p.map(delta));

export function laag(naam, features, soort, maak) {
  const uit = [];
  for (const f of features) {
    const polys = vlak(f.geometry, TOL[soort], MIN_OPP[soort]);
    if (!polys.length) continue;
    uit.push({ ...maak(f.properties), c: binnenpunt(polys), p: inpak(polys), _polys: polys });
  }
  uit.sort((a, b) => a.id.localeCompare(b.id));
  console.log(`${naam}: ${uit.length} gebieden, ${uit.reduce((s, g) => s + g.p.reduce((a, p) => a + p.reduce((b, r) => b + r.length / 2, 0), 0), 0)} punten`);
  return uit;
}

export function main() {
  const bron = lees('bron.json');
  const prov = laag('provincie', lees('provincie.json').features, 'provincie', (p) => ({ id: p.identificatie, naam: p.naam }));
  const gem = laag('gemeenten', lees('gemeenten.json').features, 'gemeente', (p) => ({ id: p.identificatie, naam: p.naam }));
  const gemIds = new Set(gem.map((g) => g.id));
  const wpl = laag('woonplaatsen', lees('woonplaatsen.json').features, 'woonplaats', (p) => ({ id: 'WP' + String(p.identificatie).padStart(4, '0'), naam: p.woonplaats, gm: 'GM' + String(p.bronhouder_identificatie).padStart(4, '0') }));
  const wijk = laag('wijken', lees('wijken.json').features, 'wijk', (p) => ({ id: p.statcode, naam: p.statnaam, gm: p.gm_code }));
  const buurt = laag('buurten', lees('buurten.json').features, 'buurt', (p) => ({ id: p.statcode, naam: p.statnaam, gm: p.gm_code }));
  for (const g of [...wpl, ...wijk, ...buurt]) if (!gemIds.has(g.gm)) console.log('LET OP: onbekende gemeente', g.gm, g.id, g.naam);

  // buurten horen bij een wijk: het wijkpunt waar het binnenpunt van de buurt in ligt
  for (const b of buurt) {
    const w = wijk.find((x) => x.gm === b.gm && puntInGebied({ p: x._polys }, b.c[0], b.c[1]));
    if (w) b.wk = w.id;
  }
  const strip = (l) => l.map(({ _polys, ...rest }) => rest);
  const uitvoer = {
    v: 1, jaar: bron.cbsJaar, opgehaald: String(bron.opgehaald).slice(0, 10),
    bron: ['Kadaster, PDOK Bestuurlijke Gebieden (provincie en gemeenten)', 'Kadaster, BAG woonplaatsen', `CBS, Gebiedsindelingen ${bron.cbsJaar} (wijken en buurten)`],
    frame: 'spelframe (rdnew.js rdToWorld), hele meters, ringen als verschillen',
    provincie: strip(prov)[0], gemeenten: strip(gem), woonplaatsen: strip(wpl), wijken: strip(wijk), buurten: strip(buurt),
  };
  fs.writeFileSync(UIT, JSON.stringify(uitvoer));
  console.log(`geschreven: ${path.relative(ROOT, UIT)} (${(fs.statSync(UIT).size / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
