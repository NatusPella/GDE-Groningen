// De vaarnetwerkgraaf en de route-audit (#184): bestaat er een doorgaande
// vaarroute van de binnenstad naar de Waddenzee, de Dollard en het Lauwersmeer,
// en welke obstakels liggen erop?
//
//   node scripts/world/vaarnet.mjs                 audit (klassen 3 en 4)
//   node scripts/world/vaarnet.mjs --write         ook game/vaarnet.json schrijven
//   node scripts/world/vaarnet.mjs --strict        exit 1 zonder route voor klasse 3
//   node scripts/world/vaarnet.mjs --class 2,3,4   andere klassen
//
// Bron: de waterpolygonen en bruggen van de provincietegels (game/world, niet
// in git: `npm run stage`) plus de stad uit de OSM-tegelbouw (loadworld.mjs). Het water wordt
// op een raster van CELL m gezet; een cel is open voor een klasse waar de
// polygon breed en diep genoeg is (nav, waterlevels.js). Obstakels per cel:
// vaste bruggen (doorvaarthoogte tegen de hoogte van de boot), beweegbare
// bruggen (openen vanzelf, brugstatus), sluizen (poorten en wachttijd). De
// zee heeft geen waterpolygoon (alleen de kustlijn, regions.js): een
// vaarweg die binnen SEA_REACH m van de kust komt, telt als zeetoegang.
import fs from 'node:fs';
import '../node3d.mjs';
import { loadProvinceVaar } from './vaarnet_data.mjs';
import { effectiveNav, linkPolygon, gatPolygon, passBridge, classOfKind, airOfKind, lockPassage, STREET_CLEAR, LAKE_BARGE_AREA } from '../../game/js/vaarnet.js';
import { polyArea, MAIN_WATERWAYS, BRIDGE_DECK_T, BOEZEM_Y } from '../../game/js/waterlevels.js';
import { worldToWgs } from '../../game/js/rdnew.js';
import { createWaterIndex } from '../../game/js/waterindex.js';
import { outsideDist } from '../../game/js/worldedge.js';

export const CELL = 5;
export const SEA_REACH = 250;
const CS = 256; // cellen per brok
// de klasse en de boot waarmee ze worden gecontroleerd
export const CLASS_KIND = { 1: 'kano', 2: 'sloep', 3: 'rondvaart', 4: 'binnenvaart' };

const X0 = -29000, Y0 = -37000, X1 = 46000, Y1 = 46500;
const GW = Math.ceil((X1 - X0) / CELL), GH = Math.ceil((Y1 - Y0) / CELL);
const NCX = Math.ceil(GW / CS), NCY = Math.ceil(GH / CS);

// ------------------------------------------------------------------ raster

export class Raster {
  constructor() { this.chunks = new Array(NCX * NCY).fill(null); this.obs = new Map(); this.list = []; this.rings = new Map(); this.dammen = []; }
  // ligt de cel op een dam (game/vaarnet_fixes.json `dammen`: [x, y, straal, naam]): land dat closeGaps niet tot water mag maken (#349)
  onDam(cx, cy) {
    if (!this.dammen.length) return false;
    const [x, y] = cellXY(cx, cy);
    for (const d of this.dammen) if (Math.hypot(x - d[0], y - d[1]) <= d[2]) return true;
    return false;
  }
  chunk(cx, cy, make = false) {
    const k = (cy >> 8) * NCX + (cx >> 8);
    return this.chunks[k] || (make ? (this.chunks[k] = new Uint8Array(CS * CS)) : null);
  }
  // bit 0-2 nav, bit 3 eigen peil (meerpeil), bit 4 Lauwersmeer
  get(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return 0;
    const c = this.chunk(cx, cy);
    return c ? c[((cy & 255) << 8) | (cx & 255)] : 0;
  }
  nav(cx, cy) { return this.get(cx, cy) & 7; }
  put(cx, cy, v) {
    const c = this.chunk(cx, cy, true), i = ((cy & 255) << 8) | (cx & 255);
    const o = c[i];
    c[i] = Math.max(o & 7, v & 7) | (o & ~7) | (v & ~7);
  }
  // de cel is geen water meer (een afgemeerde woonboot)
  clear(cx, cy) {
    const c = this.chunk(cx, cy);
    if (c) c[((cy & 255) << 8) | (cx & 255)] = 0;
  }
}
export const cellOf = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
export const cellXY = (cx, cy) => [X0 + (cx + 0.5) * CELL, Y0 + (cy + 0.5) * CELL];
const id = (cx, cy) => cy * GW + cx;

export function fillPolygon(R, pts, v) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  for (let gy = Math.max(0, Math.floor((y0 - Y0) / CELL)); gy <= Math.min(GH - 1, Math.floor((y1 - Y0) / CELL)); gy++) {
    const y = Y0 + (gy + 0.5) * CELL, xs = [];
    for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
      if ((pts[k][1] > y) !== (pts[j][1] > y)) xs.push(pts[k][0] + ((pts[j][0] - pts[k][0]) * (y - pts[k][1])) / (pts[j][1] - pts[k][1]));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      for (let gx = Math.max(0, Math.ceil((xs[q] - X0) / CELL - 0.5)); gx <= Math.min(GW - 1, Math.floor((xs[q + 1] - X0) / CELL - 0.5)); gx++) R.put(gx, gy, v);
    }
  }
}

// Een woonboot ligt vast in het water en een romp past er niet doorheen: de cellen binnen margin m van de omtrek
// gaan dicht, zodat de route er omheen loopt of het smalle water sluit (#343). De marge is de halve diagonaal van een cel
// (3,54 m): geen stap van de route tussen twee open cellen kan dan nog door de woonboot lopen. De omtrek zelf blijft bewaard (R.rings,
// per blok van 16 m) voor ringNear: de vereenvoudigde lijn van een tak mag er ook niet overheen.
export const HOUSEBOAT_M = 3.6;
const RING_BLOCK = 16;
export function ringNear(R, x, y, m) {
  const bx = Math.floor(x / RING_BLOCK), by = Math.floor(y / RING_BLOCK);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const list = R.rings.get((bx + a) * 100003 + by + b);
    if (!list) continue;
    for (const ring of list) if (ringDist(ring, x, y) <= m) return true;
  }
  return false;
}
function ringDist(ring, x, y) {
  let d2 = Infinity, inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = ring[j][0], ay = ring[j][1], bx = ring[i][0], by = ring[i][1];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
    const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    d2 = Math.min(d2, (ax + ex * t - x) ** 2 + (ay + ey * t - y) ** 2);
  }
  return inside ? 0 : Math.sqrt(d2);
}
export function blockRing(R, ring, margin = HOUSEBOAT_M) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  for (let bx = Math.floor((x0 - 1) / RING_BLOCK); bx <= Math.floor((x1 + 1) / RING_BLOCK); bx++) {
    for (let by = Math.floor((y0 - 1) / RING_BLOCK); by <= Math.floor((y1 + 1) / RING_BLOCK); by++) {
      const k = bx * 100003 + by;
      (R.rings.get(k) || R.rings.set(k, []).get(k)).push(ring);
    }
  }
  const [ca, cb] = cellOf(x0 - margin - CELL, y0 - margin - CELL), [cc, cd] = cellOf(x1 + margin + CELL, y1 + margin + CELL);
  let n = 0;
  for (let gy = Math.max(0, cb); gy <= Math.min(GH - 1, cd); gy++) for (let gx = Math.max(0, ca); gx <= Math.min(GW - 1, cc); gx++) {
    if (!R.get(gx, gy)) continue;
    const [px, py] = cellXY(gx, gy);
    if (ringDist(ring, px, py) <= margin) { R.clear(gx, gy); n++; }
  }
  return n;
}

// De hoogte van het dek (z langs de weg, zoals de stad ze heeft) op het punt van de weg het dichtst bij (x, y); null zonder profiel.
export function deckZAt(pts, z, x, y) {
  if (!z || z.length !== pts.length) return null;
  let best = Infinity, bz = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) { best = d; bz = z[i] + (z[i + 1] - z[i]) * t; }
  }
  return bz;
}

// een obstakel op de open cellen binnen r m van de punten; met `zAt` onthoudt het de dekhoogte per cel (clearOf)
function stamp(R, pts, r, ob, zAt = null) {
  const n = R.list.length;
  R.list.push({ id: n, ...ob });
  const cells = zAt ? [] : null;
  if (cells) R.list[n].cells = cells;
  const step = CELL / 2, rc = Math.ceil(r / CELL);
  let any = false;
  const seen = new Set();
  const stampAt = (x, y) => {
    const [cx, cy] = cellOf(x, y);
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) {
      const gx = cx + a, gy = cy + b;
      const [px, py] = cellXY(gx, gy);
      if (Math.hypot(px - x, py - y) > r) continue;
      const k = id(gx, gy);
      if (seen.has(k)) continue;
      seen.add(k);
      // een beweegbare brug wint van een vaste in dezelfde cel: de opritten en het fietspad van een beweegbare brug zijn in OSM soms een aparte, vaste brug
      if (!R.obs.has(k) || ob.kind === 'sluis' || (ob.kind === 'beweegbaar' && R.list[R.obs.get(k)].kind === 'vast')) R.obs.set(k, n);
      if (cells) cells.push([k, zAt(px, py)]);
      if (R.nav(gx, gy) >= 2) any = true;
    }
  };
  if (pts.length === 1) stampAt(pts[0][0], pts[0][1]);
  for (let i = 0; i + 1 < pts.length; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], L = Math.hypot(dx, dy), m = Math.max(1, Math.ceil(L / step));
    for (let s = 0; s <= m; s++) stampAt(pts[i][0] + dx * s / m, pts[i][1] + dy * s / m);
  }
  if (!any) R.list.pop();
  return any ? n : -1;
}

// de cellen van een polygon horen bij een obstakel (de sluiskolk)
function fillObs(R, pts, n) {
  const tmp = new Raster();
  fillPolygon(tmp, pts, 7);
  for (let ci = 0; ci < tmp.chunks.length; ci++) {
    const ch = tmp.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) if (ch[i]) { const k = id(bx + (i & 255), by + (i >> 8)); if (!R.obs.has(k)) R.obs.set(k, n); }
  }
}

// ------------------------------------------------------------------ data

// houseboats: de woonboten van de provincietegels sluiten hun cellen (alleen de route van het vaarnet, vaarnet_graph.mjs: de
// audit en de gaten van vaarnet_fixes.json blijven wat ze waren). gameWater: het raster van het spel zelf (vaarnet_graph.mjs): alleen water waar een polygon of een gatenstuk van het spel
// water heeft; het verbreden en dichten hieronder maakt anders water van land waar een romp niet door kan (#343)
export async function buildRaster({ worldDir, city = true, fixesOn = !process.argv.includes('--no-fixes'), gatenOn = !process.argv.includes('--fixes'), gameWater = false, houseboats = false } = {}) {
  const P = loadProvinceVaar(worldDir);
  const cityMap = city ? await (await import('../lib/loadworld.mjs')).loadCityData({ extras: false }) : { water: [], roads: [], meta: {} };
  const water = [...P.water, ...cityMap.water.map((w) => ({ ...w, tile: 'stad', lock: false }))];
  // de oppervlakte per naam (een groot meer is vaak in stukken getekend)
  const byName = new Map();
  for (const w of water) if (w.kind === 'meer' && w.name) byName.set(w.name, (byName.get(w.name) || 0) + polyArea(w.pts));
  const R = new Raster();
  const navPolys = []; // de polygonen van het raster, voor de lijn van een tak (vaarnet_graph.mjs dryAt)
  for (const w of water) {
    if (w.pts.length < 3) continue;
    const eff = effectiveNav(w, w.name ? byName.get(w.name) || 0 : polyArea(w.pts));
    if (eff < 2) continue;
    let v = eff;
    if (w.lv !== undefined && w.lv > -2.0) v |= 8;
    if (/lauwersmeer/i.test(w.name || '')) v |= 16;
    if ((MAIN_WATERWAYS.test(w.name || '') && (w.nav ?? 0) >= 3) || eff >= 4) v |= 32;
    fillPolygon(R, w.pts, v);
    navPolys.push({ pts: w.pts });
  }
  // de verbindingen die een gat in het water dichten (game/vaarnet_fixes.json); met --no-fixes weggelaten
  const fixFile = fixesOn ? JSON.parse(fs.readFileSync(new URL('../../game/vaarnet_fixes.json', import.meta.url))) : { links: [], gaten: [] };
  R.dammen = fixFile.dammen || [];
  for (const l of fixFile.links || []) { fillPolygon(R, linkPolygon(l), 4 | 32); navPolys.push({ pts: linkPolygon(l) }); }
  if (gatenOn) for (const g of [...(fixFile.gaten || []), ...(fixFile.verbindingen || []), ...(fixFile.sluisgaten || []), ...(fixFile.zee || [])]) { fillPolygon(R, gatPolygon(g), g[5] | 32); navPolys.push({ pts: gatPolygon(g) }); }
  // bruggen over water
  const roads = [...P.bridges, ...cityMap.roads.filter((r) => r && r.bridge).map((r) => ({ pts: r.pts, z: r.z || null, width: r.width || 4, movable: r.movable || '', name: r.name || '', type: r.type || '', city: true }))];
  for (const b of roads) {
    const half = (b.width || 4) / 2 + 1.5;
    const ob = { kind: b.movable ? 'beweegbaar' : 'vast', movable: b.movable || '', name: b.name || '', type: b.type, clear: b.movable ? Infinity : STREET_CLEAR, x: b.pts[0][0], y: b.pts[0][1] };
    // een vaste brug met een dekprofiel (de stad: ringwegen en viaducten) krijgt zijn echte doorvaarthoogte (clearOf, na closeGaps)
    stamp(R, b.pts, half, ob, !b.movable && b.z && b.z.some((q) => Math.abs(q) > 0.05) ? (x, y) => deckZAt(b.pts, b.z, x, y) : null);
  }
  // sluizen: de sluispoorten (OSM) en de kolken (waterpolygonen met `lock`)
  const locks = [...P.locks, ...(cityMap.meta.locks || [])];
  for (const k of locks) stamp(R, [[k.x, k.y]], Math.max(60, (k.w || 0) + 40), { kind: 'sluis', name: k.name || '', x: k.x, y: k.y });
  const wide = widenWideWater(R);
  const mains = widenMainWaterways(R);
  const closed = closeGaps(R);
  let dry = 0;
  if (gameWater) {
    const exact = createWaterIndex(navPolys);
    for (let ci = 0; ci < R.chunks.length; ci++) {
      const ch = R.chunks[ci];
      if (!ch) continue;
      const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
      for (let i = 0; i < ch.length; i++) {
        if (!(ch[i] & 7)) continue;
        const [x, y] = cellXY(bx + (i & 255), by + (i >> 8));
        if (!exact.inWater(x, y)) { ch[i] = 0; dry++; }
      }
    }
  }
  // de woonboten van de provincietegels (die van de stad liggen langs de kade en horen bij de kadewand): als laatste,
  // het verbreden en dichten hierboven maakt van een dichte cel anders weer water
  if (houseboats) for (const h of P.houseboats || []) if (h.pts && h.pts.length > 2) blockRing(R, h.pts);
  const heights = setClearances(R);
  return { R, P, cityMap, water, navPolys, dry, locks, closed, mains, wide, places: P.idx.global.places || [] };
}

// Water van klasse 3 met aan alle kanten minstens WIDE_M m water (een vaargeul van
// 2 x WIDE_M m breed) is breed genoeg voor binnenvaart: de kaart tekent kanalen in
// stukken en zonder naam, waarvan de breedte per stuk (waterlevels.js) te klein
// uitvalt. Afgeleide waterlopen van geraden breedte (14 m) blijven klasse 3.
export const WIDE_M = 10;
export function widenWideWater(R) {
  const r = Math.ceil(WIDE_M / CELL) - 1, up = [];
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) !== 3) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8);
      let all = true;
      for (let a = -r; a <= r && all; a++) for (let b = -r; b <= r; b++) if (R.nav(cx + a, cy + b) < 3) { all = false; break; }
      if (all) up.push([cx, cy]);
    }
  }
  for (const [x, y] of up) R.put(x, y, 4);
  return up.length;
}

// De kanalen van de provincie zijn in stukken getekend die, per stuk gemeten, smal
// lijken (nav 3). Het water van klasse 3 binnen MAIN_NEAR_M m van een stuk met de
// naam van een hoofdvaarweg (waterlevels.js MAIN_WATERWAYS) is dezelfde vaarweg en
// telt als klasse 4; twee zulke stukken met open land ertussen (een stuk dat in de
// kaart ontbreekt, tot MAIN_GAP_M m) groeien aan elkaar. Geeft het aantal cellen.
const AXES = [[1, 0], [0, 1], [1, 1], [1, -1]];
export const MAIN_NEAR_M = 40, MAIN_GAP_M = 35;
// ...but only water a barge has room in (#234): a side diep or ditch next to the canal stays class 3
export const MAIN_ROOM_M = 8;
function roomRound(R, cx, cy) {
  const q = Math.ceil(MAIN_ROOM_M / CELL) - 1;
  for (let a = -q; a <= q; a++) for (let b = -q; b <= q; b++) if (R.nav(cx + a, cy + b) < 3) return false;
  return true;
}
export function widenMainWaterways(R) {
  const r = Math.ceil(MAIN_NEAR_M / CELL), up = [];
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if (!(ch[i] & 32)) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8);
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r && R.nav(cx + a, cy + b) === 3 && roomRound(R, cx + a, cy + b)) up.push([cx + a, cy + b]);
    }
  }
  for (const [x, y] of up) R.put(x, y, 4 | 32);
  // gaten tussen twee stukken hoofdvaarweg
  const K = Math.ceil(MAIN_GAP_M / CELL), fill = [];
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if (!(ch[i] & 32)) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8);
      for (const [dx, dy] of AXES) {
        if (R.get(cx + dx, cy + dy) & 32) continue;
        for (let k = 2; k <= K; k++) {
          if (!(R.get(cx + dx * k, cy + dy * k) & 32)) continue;
          // alles ertussen was land of smal water: het wordt hoofdvaarweg, behalve een dam (een dijk waar geen vaarweg is: #349)
          let dam = false;
          for (let q = 1; q < k && !dam; q++) dam = R.onDam(cx + dx * q, cy + dy * q);
          if (!dam) for (let q = 1; q < k; q++) fill.push([cx + dx * q, cy + dy * q]);
          break;
        }
      }
    }
  }
  for (const [x, y] of fill) R.put(x, y, 4 | 32);
  return up.length + fill.length;
}

// De doorvaarthoogte van een vaste brug met dekprofiel: het water onder het dek is er pas na closeGaps, en
// de oprit boven de oever is lager dan het dek midden over het water. De boot vaart in de vaargeul: het 80e
// percentiel van de dekhoogte boven de watercellen van de brug (het dek zonder profiel blijft STREET_CLEAR).
export const CLEAR_PERCENTILE = 0.8;
export function clearOf(zs) {
  if (!zs.length) return null;
  zs = zs.slice().sort((a, b) => a - b);
  const z = zs[Math.min(zs.length - 1, Math.floor(zs.length * CLEAR_PERCENTILE))];
  return Math.round((z - BRIDGE_DECK_T - BOEZEM_Y) * 100) / 100;
}
export function setClearances(R) {
  let n = 0;
  for (const ob of R.list) {
    if (!ob.cells) continue;
    const zs = [];
    for (const [k, z] of ob.cells) { const cx = k % GW, cy = (k - cx) / GW; if (R.nav(cx, cy) >= 2 && z !== null) zs.push(z); }
    delete ob.cells;
    const c = clearOf(zs);
    if (c !== null) { ob.clear = Math.max(STREET_CLEAR, c); ob.profiled = true; n++; }
  }
  return n;
}

// De waterpolygonen zijn bij een brug en een sluis doorgesneden (OSM tekent het
// water niet onder het dek, en de kolk is een eigen stuk), en op een tegelgrens
// kan een cel ertussen vallen. Gesloten cellen tussen twee open cellen worden
// vaarwater (met de nav van het smalste; bij een brug of sluis krijgt ook smaller water
// onder het dek de nav van de twee kanten, een smalle polygon-sliver is geen engte): één cel (rasterruis) overal, tot
// CLOSE_M m waar een brug of sluis binnen NEAR_M m ligt. Geeft het aantal cellen.
export const CLOSE_M = 70, NEAR_M = 10, CLOSE_LOCK_M = 160;
export function closeGaps(R) {
  const fill = [];
  const tryCell = (cx, cy, K, raise = false) => {
    const cur = R.nav(cx, cy);
    if (cur >= 2 && !raise) return;
    let best = 0;
    for (const [dx, dy] of AXES) {
      let a = 0, b = 0;
      for (let k = 1; k <= K && !a; k++) { const v = R.get(cx - dx * k, cy - dy * k); if ((v & 7) >= 2) a = v; }
      for (let k = 1; k <= K && !b; k++) { const v = R.get(cx + dx * k, cy + dy * k); if ((v & 7) >= 2) b = v; }
      if (a && b) best = Math.max(best, Math.min(a & 7, b & 7));
    }
    if (best > cur && !R.onDam(cx, cy)) fill.push([cx, cy, best]);
  };
  // rasterruis: één gesloten cel tussen twee open
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) < 2) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8);
      for (const [dx, dy] of AXES) if (R.nav(cx + dx, cy + dy) < 2 && R.nav(cx + 2 * dx, cy + 2 * dy) >= 2) tryCell(cx + dx, cy + dy, 1);
    }
  }
  // bij een brug of sluis
  const near = Math.ceil(NEAR_M / CELL), seen = new Set();
  for (const [cid, on] of R.obs) {
    const ox = cid % GW, oy = (cid - ox) / GW, lock = R.list[on].kind === 'sluis';
    const nr = lock ? near * 2 : near;
    for (let a = -nr; a <= nr; a++) for (let b = -nr; b <= nr; b++) {
      const k = id(ox + a, oy + b);
      if (seen.has(k)) continue;
      seen.add(k);
      tryCell(ox + a, oy + b, Math.ceil((lock ? CLOSE_LOCK_M : CLOSE_M) / CELL), true);
    }
  }
  for (const [cx, cy, v] of fill) R.put(cx, cy, v);
  R.filled = fill;
  return fill.length;
}

// De gaten die closeGaps dichtte als kleine rechthoeken (één per cluster van minstens
// minCells cellen: een brug of sluis waar het water in de kaart onderbroken is):
// [x, y, lengte, breedte, hoek, nav] voor game/vaarnet_fixes.json .
export function clusterGaps(R, minCells = 12) {
  const set = new Map();
  for (const [cx, cy, v] of R.filled || []) set.set(id(cx, cy), v);
  const seen = new Set(), out = [];
  for (const [k0] of set) {
    if (seen.has(k0)) continue;
    const st = [k0], cells = [];
    seen.add(k0);
    while (st.length) {
      const c = st.pop(), cx = c % GW, cy = (c - cx) / GW;
      cells.push([cx, cy, set.get(c)]);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const kk = id(cx + a, cy + b); if (set.has(kk) && !seen.has(kk)) { seen.add(kk); st.push(kk); } }
    }
    if (cells.length < minCells) continue;
    const P = cells.map(([cx, cy]) => cellXY(cx, cy));
    let mx = 0, my = 0;
    for (const p of P) { mx += p[0]; my += p[1]; }
    mx /= P.length; my /= P.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of P) { sxx += (p[0] - mx) ** 2; syy += (p[1] - my) ** 2; sxy += (p[0] - mx) * (p[1] - my); }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(ang), s = Math.sin(ang);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of P) { const u = (p[0] - mx) * c + (p[1] - my) * s, v = -(p[0] - mx) * s + (p[1] - my) * c; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const r1 = (q) => Math.round(q * 10) / 10;
    out.push([r1(mx + cu * c - cv * s), r1(my + cu * s + cv * c), r1(u1 - u0 + CELL), r1(v1 - v0 + CELL), Math.round(ang * 1000) / 1000, Math.min(...cells.map((q) => q[2]))]);
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// ------------------------------------------------------------------ zee

const toLL = (x, y) => worldToWgs(x, y);
export function seaRegion(x, y) {
  const [la, lo] = toLL(x, y);
  if (lo > 7.0 && la < 53.31) return 'dollard';
  if (lo > 6.78 && la < 53.5) return 'eems';
  return la > 53.53 ? 'noordzee' : 'waddenzee';
}

// de kustlijn als punten (elke ~40 m) in emmers van 250 m
export function coastIndex(edge) {
  const B = new Map();
  const add = (x, y) => { const k = Math.floor(x / 250) + ',' + Math.floor(y / 250); (B.get(k) || B.set(k, []).get(k)).push([x, y]); };
  for (const c of edge.coast) {
    for (let i = 0; i + 1 < c.pts.length; i++) {
      const a = c.pts[i], b = c.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 40));
      for (let s = 0; s <= m; s++) add(a[0] + (b[0] - a[0]) * s / m, a[1] + (b[1] - a[1]) * s / m);
    }
  }
  return {
    near(x, y, r) {
      const cx = Math.floor(x / 250), cy = Math.floor(y / 250), k = Math.ceil(r / 250);
      let best = null, bd = r;
      for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) for (const p of B.get((cx + a) + ',' + (cy + b)) || []) {
        const d = Math.hypot(p[0] - x, p[1] - y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    },
  };
}

// ------------------------------------------------------------------ route

const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1], DC = [10, 14, 10, 14, 10, 14, 10, 14];
const BLOCK = 4000000;

class Heap {
  constructor() { this.k = new Float64Array(1 << 20); this.v = new Int32Array(1 << 20); this.n = 0; }
  push(key, val) {
    if (this.n === this.k.length) { const k = new Float64Array(this.n * 2); k.set(this.k); this.k = k; const v = new Int32Array(this.n * 2); v.set(this.v); this.v = v; }
    let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = key; this.v[i] = val;
  }
  pop() {
    const key = this.k[0], val = this.v[0], lk = this.k[--this.n], lv = this.v[this.n];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.n) break;
      if (c + 1 < this.n && this.k[c + 1] < this.k[c]) c++;
      if (this.k[c] >= lk) break;
      this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c;
    }
    this.k[i] = lk; this.v[i] = lv;
    this.popKey = key;
    return val;
  }
}

// Wat een boot van deze soort in een obstakel kost (kostenheden: 10 = 1 cel = 5 m).
function obstacleCost(ob, kind) {
  if (ob.kind === 'vast') return passBridge(kind, ob).ok ? 0 : BLOCK;
  if (ob.kind === 'beweegbaar') return 140;
  if (ob.kind === 'sluis') return 320;
  return 0;
}

// Dijkstra over de open cellen van een klasse. targets: (cx, cy) => label | null.
// Geeft per label de eerste (goedkoopste) cel die het bereikt, plus de totale reikwijdte.
// De afstand (in cellen, tot SHORE_CAP) van elke open cel tot de dichtstbijzijnde cel die voor de klasse dicht is, per brok:
// een golf vanaf de dichte cellen. Een brok dat er niet is, is dicht.
export const SHORE_CAP = 6;
export const SHORE_COST = [0, 16, 9, 5, 3, 1, 0];
export function shoreDist(R, cls) {
  const key = '_sd' + cls;
  if (R[key]) return R[key];
  const out = new Array(NCX * NCY).fill(null);
  for (let k = 0; k < R.chunks.length; k++) {
    const ch = R.chunks[k];
    if (!ch) continue;
    const a = out[k] = new Uint8Array(CS * CS);
    for (let i = 0; i < ch.length; i++) a[i] = (ch[i] & 7) >= cls ? SHORE_CAP : 0;
  }
  // (de cellen buiten een brok kijken in de buurbrok, een ontbrekend brok telt als dicht)
  const at = (cx, cy, level) => {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return false;
    const a = out[(cy >> 8) * NCX + (cx >> 8)];
    return !!a && a[((cy & 255) << 8) | (cx & 255)] === level;
  };
  const closedAt = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return true;
    const a = out[(cy >> 8) * NCX + (cx >> 8)];
    return !a || a[((cy & 255) << 8) | (cx & 255)] === 0;
  };
  for (let level = 1; level < SHORE_CAP; level++) {
    for (let k = 0; k < out.length; k++) {
      const a = out[k];
      if (!a) continue;
      const bx = (k % NCX) * CS, by = Math.floor(k / NCX) * CS, next = [];
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== SHORE_CAP) continue;
        const cx = bx + (i & 255), cy = by + (i >> 8);
        let hit = false;
        for (let s = 0; s < 8 && !hit; s++) hit = level === 1 ? closedAt(cx + DX[s], cy + DY[s]) : at(cx + DX[s], cy + DY[s], level - 1);
        if (hit) next.push(i);
      }
      for (const i of next) a[i] = level;
    }
  }
  return (R[key] = out);
}

export function sail(R, starts, cls, kind, targets, { stopWhenAll = null, navCost = null } = {}) {
  const dist = new Map(), par = new Map(); // brok -> Float32Array / Uint8Array
  const dch = (cx, cy) => { const k = (cy >> 8) * NCX + (cx >> 8); let c = dist.get(k); if (!c) { c = new Float32Array(CS * CS).fill(Infinity); dist.set(k, c); par.set(k, new Uint8Array(CS * CS)); } return k; };
  const heap = new Heap();
  const found = new Map();
  let reached = 0;
  for (const [cx, cy] of starts) { const k = dch(cx, cy); dist.get(k)[((cy & 255) << 8) | (cx & 255)] = 0; heap.push(0, id(cx, cy)); }
  const open = (cx, cy) => R.nav(cx, cy) >= cls;
  const sd = shoreDist(R, cls);
  while (heap.n) {
    const u = heap.pop(), d = heap.popKey, cx = u % GW, cy = (u - cx) / GW;
    const k = dch(cx, cy), di = ((cy & 255) << 8) | (cx & 255);
    if (d > dist.get(k)[di] + 0.01) continue;
    reached++;
    const lab = targets(cx, cy);
    if (lab && !found.has(lab)) { found.set(lab, { cx, cy, cost: d }); if (stopWhenAll && found.size >= stopWhenAll) break; }
    const ob0 = R.obs.get(u);
    for (let s = 0; s < 8; s++) {
      const nx = cx + DX[s], ny = cy + DY[s];
      if (!open(nx, ny)) continue;
      // een diagonaal mag geen hoek afsnijden door gesloten water
      let c = navCost ? DC[s] * navCost[R.nav(nx, ny)] : DC[s];
      // dicht bij de oever kost meer: de route houdt het midden van de vaargeul (een cel naast de oever ligt tot 2,5 m van
      // het echte water-eind en een romp past er niet, #343)
      c += SHORE_COST[sd[(ny >> 8) * NCX + (nx >> 8)][((ny & 255) << 8) | (nx & 255)]];
      const nid = id(nx, ny), ob = R.obs.get(nid);
      if (ob !== undefined && ob !== ob0) c += obstacleCost(R.list[ob], kind);
      const nk = dch(nx, ny), ni = ((ny & 255) << 8) | (nx & 255), nd = d + c;
      if (nd < dist.get(nk)[ni] - 0.01) { dist.get(nk)[ni] = nd; par.get(nk)[ni] = s + 1; heap.push(nd, nid); }
    }
  }
  const trace = (cx, cy) => {
    const path = [];
    for (;;) {
      path.push([cx, cy]);
      const k = (cy >> 8) * NCX + (cx >> 8), s = par.get(k)[((cy & 255) << 8) | (cx & 255)];
      if (!s) break;
      cx -= DX[s - 1]; cy -= DY[s - 1];
    }
    return path.reverse();
  };
  // de cel waar de goedkoopste route naar (cx, cy) vandaan komt, of null bij een wortel
  const parent = (cx, cy) => {
    const k = (cy >> 8) * NCX + (cx >> 8), p = par.get(k), d = p ? p[((cy & 255) << 8) | (cx & 255)] : 0;
    return d ? [cx - DX[d - 1], cy - DY[d - 1]] : null;
  };
  return { found, reached, trace, parent, cost: (cx, cy) => { const k = (cy >> 8) * NCX + (cx >> 8), c = dist.get(k); return c ? c[((cy & 255) << 8) | (cx & 255)] : Infinity; } };
}

// de obstakels langs een pad: [{ ...obstakel, at (m langs de route), ok }]
export function obstaclesOn(R, path, kind) {
  const out = [];
  let last = -1, m = 0;
  for (let i = 0; i < path.length; i++) {
    if (i) m += (path[i][0] !== path[i - 1][0] && path[i][1] !== path[i - 1][1] ? 1.414 : 1) * CELL;
    const o = R.obs.get(id(path[i][0], path[i][1]));
    if (o === undefined || o === last) { if (o === undefined) last = -1; continue; }
    last = o;
    const ob = R.list[o];
    const prev = out[out.length - 1];
    // de twee poorten van één sluis (en een brug met fietspad) tellen als één obstakel
    if (prev && prev.kind === ob.kind && m - prev.at < (ob.kind === 'sluis' ? 250 : 40) && Math.hypot(prev.x - ob.x, prev.y - ob.y) < 300) continue;
    out.push({ ...ob, at: Math.round(m), ok: obstacleCost(ob, kind) < BLOCK });
  }
  return out;
}

const round = (v) => Math.round(v);
const describe = (o) => `${o.kind === 'sluis' ? 'sluis' : o.kind === 'beweegbaar' ? 'beweegbare brug (' + o.movable + ')' : 'vaste brug'}${o.name ? ' ' + o.name : ''} op ${round(o.x)},${round(o.y)}`;


// het dichtstbijzijnde obstakel bij een punt (binnen 120 m), als tekst
export function nearObs(R, p, r = 120) {
  const [cx, cy] = cellOf(p[0], p[1]), k = Math.ceil(r / CELL);
  let best = null, bd = r;
  for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) {
    const o = R.obs.get(id(cx + a, cy + b));
    if (o === undefined) continue;
    const d = Math.hypot(a, b) * CELL;
    if (d < bd) { bd = d; best = R.list[o]; }
  }
  return best ? ' [' + best.kind + (best.name ? ' ' + best.name : '') + ' op ' + Math.round(bd) + ' m]' : '';
}

// ------------------------------------------------------------------ gaten

// De samenhangende waterstukken van een klasse (zonder obstakels): { label(cx,cy), sizes[] }.
export function components(R, cls) {
  const lab = new Map();
  const labOf = (cx, cy, make) => { const k = (cy >> 8) * NCX + (cx >> 8); let c = lab.get(k); if (!c && make) { c = new Int32Array(CS * CS); lab.set(k, c); } return c; };
  const sizes = [0], seeds = [null];
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) < cls) continue;
      const sx = bx + (i & 255), sy = by + (i >> 8);
      if (labOf(sx, sy, true)[((sy & 255) << 8) | (sx & 255)]) continue;
      const n = sizes.length; sizes.push(0); seeds.push([sx, sy]);
      const stack = [sx, sy];
      labOf(sx, sy, true)[((sy & 255) << 8) | (sx & 255)] = n;
      while (stack.length) {
        const y = stack.pop(), x = stack.pop();
        sizes[n]++;
        for (let s = 0; s < 8; s++) {
          const nx = x + DX[s], ny = y + DY[s];
          if (R.nav(nx, ny) < cls) continue;
          const c = labOf(nx, ny, true), j = ((ny & 255) << 8) | (nx & 255);
          if (c[j]) continue;
          c[j] = n; stack.push(nx, ny);
        }
      }
    }
  }
  return { label: (cx, cy) => { const c = labOf(cx, cy, false); return c ? c[((cy & 255) << 8) | (cx & 255)] : 0; }, sizes, seeds };
}

// Gaten tussen twee grote waterstukken: de kortste afstand over land (rechte stralen
// vanaf elke oeverrel tot hoogstens maxGap m). Per stukpaar het kortste gat.
export function findGaps(R, comp, cls, { minCells = 300, maxGap = 80 } = {}) {
  const best = new Map();
  const reach = Math.ceil(maxGap / CELL);
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) < cls) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8), a = comp.label(cx, cy);
      if (comp.sizes[a] < minCells) continue;
      for (let q = 0; q < 8; q++) {
        if (R.nav(cx + DX[q], cy + DY[q]) >= cls) continue;
        for (let k = 2; k <= reach; k++) {
          const nx = cx + DX[q] * k, ny = cy + DY[q] * k;
          if (R.nav(nx, ny) < cls) continue;
          const b = comp.label(nx, ny);
          if (b === a) break;
          if (comp.sizes[b] >= minCells) {
            const key = a < b ? a + ',' + b : b + ',' + a, d = k * CELL * (q & 1 ? 1.414 : 1), g = best.get(key);
            if (!g || d < g.d) best.set(key, { a: Math.min(a, b), b: Math.max(a, b), d, from: cellXY(cx, cy), to: cellXY(nx, ny) });
          }
          break;
        }
      }
    }
  }
  return [...best.values()].sort((p, q) => p.d - q.d);
}

// Per groot waterstuk dat niet bij het stuk van de start hoort: het kortste gat
// naar dat stuk (tot maxM m): kandidaten voor een verbinding in game/vaarnet_fixes.json.
export function linkCandidates(R, comp, cls, startComp, { minCells = 3000, maxM = 1500 } = {}) {
  const B = 250, hash = new Map();
  const each = (fn, want) => {
    for (let ci = 0; ci < R.chunks.length; ci++) {
      const ch = R.chunks[ci];
      if (!ch) continue;
      const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
      for (let i = 0; i < ch.length; i += 1) {
        if ((ch[i] & 7) < cls) continue;
        const cx = bx + (i & 255), cy = by + (i >> 8);
        if ((cx + cy) % 3) continue;
        fn(cx, cy, comp.label(cx, cy));
      }
    }
  };
  each((cx, cy, l) => { if (l !== startComp) return; const [x, y] = cellXY(cx, cy), k = Math.floor(x / B) + ',' + Math.floor(y / B); (hash.get(k) || hash.set(k, []).get(k)).push([x, y]); });
  const best = new Map(), k = Math.ceil(maxM / B);
  each((cx, cy, l) => {
    if (l === startComp || comp.sizes[l] < minCells) return;
    const [x, y] = cellXY(cx, cy), gx = Math.floor(x / B), gy = Math.floor(y / B);
    let bd = maxM, bp = null;
    for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) for (const p of hash.get((gx + a) + ',' + (gy + b)) || []) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; bp = p; } }
    const o = best.get(l);
    if (bp && (!o || bd < o.d)) best.set(l, { comp: l, cells: comp.sizes[l], d: bd, from: bp, to: [x, y] });
  });
  return [...best.values()].sort((a, b) => b.cells - a.cells);
}

export function startComp(R, comp, cls, at = [0, -350]) {
  const [sx, sy] = cellOf(at[0], at[1]);
  for (let r = 0; r < 400; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
    if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
    if (R.nav(sx + a, sy + b) >= cls) return comp.label(sx + a, sy + b);
  }
  return 0;
}

// ------------------------------------------------------------------ zee

// De open cel van een klasse het dichtst bij (x, y).
export function nearestOpenCell(R, x, y, cls, maxR = 400) {
  const [cx, cy] = cellOf(x, y);
  for (let r = 0; r < maxR; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
    if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
    if (R.nav(cx + a, cy + b) >= cls) return [cx + a, cy + b];
  }
  return null;
}

// De kust heeft geen waterpolygon (OSM kent alleen de kustlijn): een vaarweg die de kust
// bereikt, houdt op bij de dijk. Een boot moet de zee op kunnen varen tot de omkeerscène
// van het eind van de wereld (worldedge.js: zeeM voorbij de kust, edgescene.js). Waar de
// audit een zeetoegang vindt zonder water aan de zeekant, komt er een verbinding van de
// vaarweg naar de kust en een tong zee van SEA_TONGUE.wid m breed tot SEA_TONGUE.extra m
// voorbij de omkeerlijn: [x, y, lengte, breedte, hoek, nav] zoals gaten, maar zee (nav 4).
export const SEA_TONGUE = { wid: 500, extra: 150, link: 40 };
export function seaTongues({ R, P }) {
  const coast = coastIndex(P.edge), out = [];
  const start = nearestOpenCell(R, 0, -350, 3);
  // per zee de goedkoopst bereikte cel binnen SEA_REACH van de kust (de toegang van de audit)
  const res = sail(R, [start], 3, 'rondvaart', (cx, cy) => {
    const [x, y] = cellXY(cx, cy), q = coast.near(x, y, SEA_REACH);
    return q ? 'zee ' + seaRegion(q[0], q[1]) : null;
  });
  const seaM = P.edge.seaM || 3000;
  for (const [lab, f] of res.found) {
    const [x, y] = cellXY(f.cx, f.cy), q = coast.near(x, y, SEA_REACH);
    const here = outsideDist(x, y, P.edge.coast);
    if (here && here.d > 0) continue; // water aan de zeekant: de kaart heeft de zee hier al
    // de richting naar zee: waar 400 m verder het verst voorbij de kust ligt
    let best = null;
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2, o = outsideDist(q[0] + Math.cos(a) * 400, q[1] + Math.sin(a) * 400, P.edge.coast);
      if (o && (!best || o.d > best.d)) best = { a, d: o.d };
    }
    if (!best) continue;
    const r1 = (v) => Math.round(v * 10) / 10, c = Math.cos(best.a), sn = Math.sin(best.a);
    // de verbinding van de vaarweg naar de kust (waar de dijk ligt)
    const gap = Math.hypot(q[0] - x, q[1] - y);
    if (gap > 6) out.push([r1((x + q[0]) / 2), r1((y + q[1]) / 2), r1(gap + 20), SEA_TONGUE.link, Math.round(Math.atan2(q[1] - y, q[0] - x) * 1000) / 1000, 4, lab]);
    const L = seaM + SEA_TONGUE.extra + 40;
    out.push([r1(q[0] + c * (L / 2 - 40)), r1(q[1] + sn * (L / 2 - 40)), L, SEA_TONGUE.wid, Math.round(best.a * 1000) / 1000, 4, lab]);
  }
  return out;
}

// ------------------------------------------------------------------ audit

// De binnenvaarthaven van de stad (#295): de Oosterhaven aan de Eemskanaal- en Winschoterdiepkant. De binnenstad
// binnen de Kattenbrug (Schuitendiep, Diepenring, Noorderhaven) is voor binnenvaart bewust dicht: de bruggen
// daar zijn laag en vast, en de Kattenbrug (564,208) is de poort naar het net. Een binnenvaartschip meert in de
// Oosterhaven, en de route van klasse 4 begint daar.
export const BARGE_HOME = [720, 330];
export function audit({ R, P, places }, { classes = [3, 4], start = [0, -350], bargeStart = BARGE_HOME, log = console.log } = {}) {
  const coast = coastIndex(P.edge);
  const seaCache = new Map();
  const seaOf = (cx, cy) => {
    const [x, y] = cellXY(cx, cy);
    const q = coast.near(x, y, SEA_REACH);
    return q ? seaRegion(q[0], q[1]) : null;
  };
  const place = (x, y) => { let b = null, bd = 6000; for (const p of places) { if (p.kind === 'hamlet' && !p.pop) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } } return b ? b.name : '?'; };
  // de startcel: de dichtstbijzijnde open cel van de klasse bij de binnenstad
  const nearestOpen = (x, y, cls) => {
    const [cx, cy] = cellOf(x, y);
    for (let r = 0; r < 400; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      if (R.nav(cx + a, cy + b) >= cls) return [cx + a, cy + b];
    }
    return null;
  };
  const report = { classes: {}, start };
  for (const cls of classes) {
    const kind = CLASS_KIND[cls];
    const from = cls >= 4 && bargeStart ? bargeStart : start;
    const s = nearestOpen(from[0], from[1], cls);
    if (!s) { log(`klasse ${cls}: geen water bij de start`); continue; }
    const t0 = Date.now();
    const targets = (cx, cy) => {
      if (R.get(cx, cy) & 16) return 'Lauwersmeer';
      const reg = seaOf(cx, cy);
      return reg ? `zee ${reg}` : null;
    };
    // per label de goedkoopste cel, ook als later een andere zee-cel goedkoper had gekund
    const res = sail(R, [s], cls, kind, targets);
    const rep = { kind, start: cellXY(...s), reachedCells: res.reached, labels: {}, secs: (Date.now() - t0) / 1000 };
    log(`\nKlasse ${cls} (${kind}, hoogte ${airOfKind(kind)} m): ${res.reached} cellen bereikbaar vanaf ${cellXY(...s).map(round)} in ${rep.secs.toFixed(1)} s`);
    for (const lab of ['Lauwersmeer', 'zee waddenzee', 'zee eems', 'zee dollard', 'zee noordzee']) {
      const f = res.found.get(lab);
      if (!f) { rep.labels[lab] = null; log(`  ${lab}: GEEN route`); continue; }
      const path = res.trace(f.cx, f.cy), obs = obstaclesOn(R, path, kind), blocked = obs.filter((o) => !o.ok);
      const [x, y] = cellXY(f.cx, f.cy);
      rep.labels[lab] = { x: round(x), y: round(y), near: place(x, y), length: round(path.length * CELL * 1.1), blocked: blocked.length, obstacles: obs };
      log(`  ${lab}: ${blocked.length ? 'ALLEEN MET ' + blocked.length + ' onoverkomelijke obstakel(s)' : 'route'} bij ${place(x, y)} (${round(x)},${round(y)}), ongeveer ${(path.length * CELL * 1.1 / 1000).toFixed(1)} km`);
      const fixedOk = obs.filter((o) => o.kind === 'vast' && o.ok).length;
      log('      ' + fixedOk + ' vaste bruggen die de boot haalt, ' + obs.filter((o) => o.kind === 'beweegbaar').length + ' beweegbare bruggen (openen vanzelf), ' + obs.filter((o) => o.kind === 'sluis').length + ' sluispunten');
      for (const o of obs) if (!o.ok || o.kind === 'sluis') log('      na ' + (o.at / 1000).toFixed(1) + ' km: ' + (o.ok ? '' : 'GEBLOKKEERD ') + describe(o) + (o.kind === 'sluis' ? ' (wachttijd ca. ' + lockPassage({}) + ' s)' : ''));
    }
    report.classes[cls] = rep;
  }
  return report;
}

// ------------------------------------------------------------------ componenten

// Het water per klasse in samenhangende stukken: grootte, plaats en of het in het net zit.
// Klasse 1 (sloten en vijvers) en stukken onder minCells cellen horen er met opzet niet in.
// Geeft { net: [...stukken in het net, grootste eerst], small, ditch, main } en schrijft een samenvatting.
export function componentReport({ R, places, water }, { minCells = 200, start = [0, -350], log = console.log, cls = 2 } = {}) {
  const comp = components(R, cls);
  const acc = new Map();
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * CS, by = Math.floor(ci / NCX) * CS;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) < cls) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8), l = comp.label(cx, cy);
      let a = acc.get(l);
      if (!a) acc.set(l, a = { l, n: 0, sx: 0, sy: 0, n3: 0, n4: 0 });
      a.n++; a.sx += cx; a.sy += cy;
      if ((ch[i] & 7) >= 3) a.n3++;
      if ((ch[i] & 7) >= 4) a.n4++;
    }
  }
  const place = (x, y) => { let b = null, bd = 8000; for (const p of places) { if (p.kind === 'hamlet' && !p.pop) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } } return b ? b.name : '?'; };
  const list = [...acc.values()].sort((a, b) => b.n - a.n).map((a) => {
    const [x, y] = cellXY(a.sx / a.n, a.sy / a.n);
    return { id: a.l, cells: a.n, ha: Math.round(a.n * CELL * CELL / 1e4), x: Math.round(x), y: Math.round(y), near: place(x, y), wide: a.n3 / a.n, barge: a.n4 / a.n };
  });
  const net = list.filter((c) => c.cells >= minCells), small = list.filter((c) => c.cells < minCells);
  const s = nearestOpenCell(R, start[0], start[1], cls);
  const main = s ? comp.label(...s) : 0;
  // water van klasse 1 staat niet in het raster: uit de polygonen zelf
  let ditchCells = 0, ditches = 0;
  for (const w of water || []) { if ((w.nav ?? 0) >= 2 || w.pts.length < 3) continue; ditches++; ditchCells += polyArea(w.pts) / (CELL * CELL); }
  const sum = (a, f) => a.reduce((n, c) => n + f(c), 0);
  log(`klasse ${cls}: ${list.length} waterstukken; ${net.length} in het net (${Math.round(sum(net, (c) => c.ha))} ha), ${small.length} kleiner dan ${minCells} cellen (${Math.round(sum(small, (c) => c.ha))} ha) niet`);
  log(`water van klasse 1 (sloten en vijvers smaller dan 4 m of kleiner dan een vijver, bewust niet bevaarbaar): ${ditches} polygonen, ${Math.round(ditchCells * CELL * CELL / 1e4)} ha`);
  const mainRow = net.find((c) => c.id === main);
  log(`het stuk van de binnenstad: ${mainRow ? mainRow.cells + ' cellen, ' + mainRow.ha + ' ha' : 'niet gevonden'}`);
  log('de grootste stukken (cellen, ha, bij, dat deel breder dan 9 m, deel voor binnenvaart):');
  for (const c of net.slice(0, 25)) log(`  ${c.id === main ? '* ' : '  '}${c.cells} cellen, ${c.ha} ha bij ${c.near} (${c.x},${c.y}), ${Math.round(c.wide * 100)}% klasse 3, ${Math.round(c.barge * 100)}% klasse 4`);
  return { comp, list, net, small, main, ditches, ditchCells };
}

// Verbindingen waar een kanaal in de kaart onderbroken lijkt: twee stukken van minCells cellen
// of meer, hooguit maxGap m uit elkaar, waarvan de oevers elkaar over de breedte van het
// gat niet overal raken (een gat in het kanaal, niet twee evenwijdige sloten): vanaf het ene
// uiteinde zijn het stuk aan de overkant en het open land aan beide kanten hooguit 3 van de 16
// richtingen het andere stuk. Geeft rechthoeken [x, y, lengte, breedte, hoek, nav] zoals gaten.
export function autoLinks(R, comp, cls, { minCells = 300, maxGap = 25, width = 8 } = {}) {
  const out = [];
  const gaps = findGaps(R, comp, cls, { minCells, maxGap });
  const used = new Set();
  for (const g of gaps) {
    const [fx, fy] = cellOf(g.from[0], g.from[1]);
    let hits = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      for (let r = 1; r <= Math.ceil(maxGap * 3 / CELL); r++) {
        const nx = Math.round(fx + dx * r), ny = Math.round(fy + dy * r);
        if (R.nav(nx, ny) < cls) continue;
        if (comp.label(nx, ny) === g.a || comp.label(nx, ny) === g.b) { if (comp.label(nx, ny) !== comp.label(fx, fy)) hits++; break; }
      }
    }
    if (hits > 3) continue;
    const key = Math.min(g.a, g.b) + ',' + Math.max(g.a, g.b);
    if (used.has(key)) continue;
    used.add(key);
    const [x0, y0] = g.from, [x1, y1] = g.to, r1 = (v) => Math.round(v * 10) / 10;
    out.push([r1((x0 + x1) / 2), r1((y0 + y1) / 2), r1(Math.hypot(x1 - x0, y1 - y0) + CELL), width, Math.round(Math.atan2(y1 - y0, x1 - x0) * 1000) / 1000, cls]);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('vaarnet.mjs')) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
  const classes = arg('--class', '3,4').split(',').map(Number);
  const t = Date.now();
  const built = await buildRaster();
  const open = [2, 3, 4].map((c) => { let n = 0; for (const ch of built.R.chunks) if (ch) for (let i = 0; i < ch.length; i++) if ((ch[i] & 7) >= c) n++; return n; });
  console.log(`raster: ${built.water.length} waterpolygonen, ${built.R.list.length} obstakels, open cellen klasse 2/3/4: ${open.join('/')} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  if (process.argv.includes('--fixes')) {
    const gaten = clusterGaps(built.R), zee = seaTongues(built);
    const verbindingen = autoLinks(built.R, components(built.R, 2), 2);
    const file = new URL('../../game/vaarnet_fixes.json', import.meta.url);
    const cur = JSON.parse(fs.readFileSync(file));
    cur.gaten = gaten;
    cur.zee = zee;
    cur.verbindingen = verbindingen;
    const line = (x) => '    ' + JSON.stringify(x);
    const out = [
      '{',
      '  "versie": 1,',
      '  "uitleg": ' + JSON.stringify(cur.uitleg) + ',',
      '  "links": [', cur.links.map(line).join(',\n'), '  ],',
      '  "gatenUitleg": ' + JSON.stringify('gaten: [x, y, lengte, breedte, hoek (rad), nav], waterstukjes onder bruggen en sluizen waar de kaart het water onderbreekt; gemaakt door scripts/world/vaarnet.mjs --fixes') + ',',
      '  "gaten": [', gaten.map(line).join(',\n'), '  ],',
      '  "verbindingenUitleg": ' + JSON.stringify('verbindingen: kleine stukken water waar een kanaal of vaart in de kaart onderbroken lijkt (hooguit 25 m, [x, y, lengte, breedte, hoek (rad), nav]); gemaakt door scripts/world/vaarnet.mjs --fixes. Nog niet in beeld bekeken.') + ',',
      '  "verbindingen": [', verbindingen.map(line).join(',\n'), '  ],',
      '  "sluisgatenUitleg": ' + JSON.stringify('sluisgaten: de kolk van een sluis waar de kaart geen water tekent, [x, y, lengte, breedte, hoek (rad), nav]; gemaakt met scripts/world/sluizen.mjs (#236), blijft staan bij --fixes') + ',',
      '  "sluisgaten": [', (cur.sluisgaten || []).map(line).join(',\n'), '  ],',
      '  "dammenUitleg": ' + JSON.stringify(cur.dammenUitleg) + ',',
      '  "dammen": [', (cur.dammen || []).map(line).join(',\n'), '  ],',
      '  "zeeUitleg": ' + JSON.stringify('zee: verbinding en tong zee bij een zeetoegang zonder water aan de zeekant, [x, y, lengte, breedte, hoek (rad), nav, naam]; de tong loopt tot voorbij de omkeerlijn van het eind van de wereld (worldedge.js). Nog niet in beeld bekeken.') + ',',
      '  "zee": [', zee.map(line).join(',\n'), '  ]',
      '}', '',
    ].join('\n');
    fs.writeFileSync(file, out);
    console.log(gaten.length + ' gaten, ' + verbindingen.length + ' verbindingen en ' + zee.length + ' stukken zee geschreven in game/vaarnet_fixes.json');
    for (const z of zee) console.log('  zee bij ' + z[6] + ': ' + z.slice(0, 5).join(', '));
    process.exit(0);
  }
  if (process.argv.includes('--components')) {
    const rep = componentReport(built);
    const links = autoLinks(built.R, rep.comp, 2);
    console.log(links.length + ' verbindingen van hooguit 25 m gevonden tussen waterstukken (vaarnet.mjs --fixes schrijft ze)');
    // de plaatsen die geen water in het net hebben
    const miss = built.places.filter((p) => p.kind === 'town').filter((p) => { const c = nearestOpenCell(built.R, p.x, p.y, 2, 140); return !c || rep.net.every((n) => n.id !== rep.comp.label(c[0], c[1])); });
    const gapRows = linkCandidates(built.R, rep.comp, 2, rep.main, { minCells: 2000, maxM: 3000 });
    console.log('grote waterstukken die niet bij het stuk van de binnenstad horen, met het kortste gat daartoe (tot 3 km):');
    for (const c of gapRows.slice(0, 20)) console.log('  ' + c.cells + ' cellen, ' + Math.round(c.d) + ' m van ' + c.from.map(Math.round) + ' naar ' + c.to.map(Math.round) + nearObs(built.R, c.from, 200));
    console.log('steden zonder vaarwater van het net binnen 700 m: ' + (miss.map((p) => p.name).join(', ') || 'geen'));
    process.exit(0);
  }
  if (process.argv.includes('--links')) {
    const cls = classes[0], comp = components(built.R, cls), st = startComp(built.R, comp, cls);
    console.log('klasse ' + cls + ': het stuk van de start heeft ' + comp.sizes[st] + ' cellen; grote stukken ernaast (tot 1,5 km):');
    for (const c of linkCandidates(built.R, comp, cls, st).slice(0, 40)) console.log('  ' + c.cells + ' cellen, kortste gat ' + Math.round(c.d) + ' m van ' + c.from.map(Math.round) + ' naar ' + c.to.map(Math.round) + nearObs(built.R, c.from, 200));
    process.exit(0);
  }
  if (process.argv.includes('--gaps')) {
    for (const cls of classes) {
      const comp = components(built.R, cls);
      const order = comp.sizes.map((n, i) => [n, i]).filter((e) => e[1]).sort((a, b) => b[0] - a[0]).slice(0, 12);
      console.log('\nklasse ' + cls + ': ' + (comp.sizes.length - 1) + ' stukken, de grootste (cellen): ' + order.map((e) => e[0] + '#' + e[1]).join(' '));
      const gaps = findGaps(built.R, comp, cls);
      console.log(gaps.length + ' gaten tot 80 m tussen stukken van 300+ cellen:');
      const big = (g) => Math.max(comp.sizes[g.a], comp.sizes[g.b]) >= (cls === 4 ? 20000 : 150000);
      for (const g of gaps.filter(big).slice(0, 60)) console.log('  ' + Math.round(g.d) + ' m' + nearObs(built.R, g.from) + ' tussen #' + g.a + ' (' + comp.sizes[g.a] + ') en #' + g.b + ' (' + comp.sizes[g.b] + ') bij ' + g.from.map(Math.round) + ' > ' + g.to.map(Math.round));
    }
    process.exit(0);
  }
  const rep = audit(built, { classes });
  if (process.argv.includes('--strict') && rep.classes[3] && Object.values(rep.classes[3].labels).every((l) => !l || l.blocked)) process.exit(1);
}
