// Bomen en heggen van een tegel die op de rijbaan zouden staan (#508). De pakketbouw ruimt de gemapte bomen op
// vóór de tegels geknipt worden (tegel_schoon.mjs, treeclear.js), maar de groenhook van de bouwer zet de
// vulbomen van bos en kerkhof per tegel neer met alleen de wegen van díé tegel in beeld (builderhooks.js
// greeneryHook), en de gemapte heggen worden nooit geknipt. Een tegelrand is zo blind: de weg van de tegel
// hiernaast reikt over de rand terwijl zijn rij in de buurtegel blijft, en een vulboom komt op het asfalt
// terecht. Hier wordt dat rechtgezet op de kaart waar het spel uit tekent (tileworld.js addTile, met de wegen
// van elke aanwezige tegel), met dezelfde regel waarmee de audits meten (tegel_afstand_audit, hedge_tile_audit).
//
// world: het spel (TileWorld) of, in een audit, { roadsNear, buildingsNear, waterNear }.
import { closestPointOnSegment, polygonBounds } from './util.js';
import { treeBesideRoad } from './treeclear.js';

// Een heg stopt deze afstand vóór de rand van de rijbaan (m); de audits gunnen 0,2 m afronding.
export const HEDGE_ROOM = 0.3;
// Zo ver reikt de zoom van een weg vanaf zijn middellijn (breedste rijbaan plus de zoom van een heg).
const REACH = 12;
// Een heg wordt in stappen van een meter nagelopen, dezelfde stap waarmee de audits meten.
const SAMPLE = 1;
// Een dek hoger dan dit is niet de weg waar de heg onder of de boom naast staat (treeclear.js).
const HOOG_MAAIVELD = 0.5;

// De hoogte van de weg op het punt dat het dichtst bij de kijker ligt (0 als de weg geen profiel heeft).
// (treeclear.js rekent met dezelfde regel; hier voor de heggen, die elke wegklasse raken.)
function zAt(r, i, t) {
  if (!r.z || r.z.length < i + 2) return 0;
  return r.z[i] + (r.z[i + 1] - r.z[i]) * t;
}

// Ligt (x, y) op een weg op maaiveld? Elke klasse telt: een heg hoort ook niet over een voetpad of fietspad
// te lopen (streetfurniture.js pieceOnWayOrWater), een brug of tunnel is geen weg op de grond. De maat is die van
// dat tekenen: een rijbaan of fietspad houdt 0,3 m aan, een voetpad zijn eigen halve breedte (minstens 0,6 m).
const roomOf = (r) => (r.cat === 'foot' ? Math.max(0.6, (r.width || 1.5) / 2) : (r.width || 4) / 2 + HEDGE_ROOM);
function onWay(map, x, y) {
  for (const r of map.roadsNear(x, y, REACH)) {
    const P = r.pts;
    if (!P || P.length < 2 || r.bridge || r.tunnel) continue;
    const room = roomOf(r);
    const [minx, miny, maxx, maxy] = r.bounds || [-Infinity, -Infinity, Infinity, Infinity];
    if (x < minx - room || x > maxx + room || y < miny - room || y > maxy + room) continue;
    for (let i = 0; i + 1 < P.length; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (cp.dist2 > room * room) continue;
      if (zAt(r, i, cp.t) > HOOG_MAAIVELD) continue; // een dek boven de heg
      return true;
    }
  }
  return false;
}

// De stukken van een heg die naast de wegen blijven, of null als er niets van over is. Ligt de hele lijn vrij, dan
// komt de lijn zelf terug ([pts], hetzelfde array); anders wordt hij geknipt en houdt elk stuk zijn eigen punten, op
// een meter gesampled en op de centimeter afgerond zoals de tegelrij ze heeft. De twee kanten van een weg worden twee
// stukken en geen lijn over het asfalt: wat ertussen ligt, is geen heg.
export function cutHedgeOffWays(map, pts) {
  let dirty = false;
  for (let i = 0; i + 1 < pts.length && !dirty; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / SAMPLE));
    for (let s = i === 0 ? 0 : 1; s <= n; s++) {
      if (onWay(map, a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n)) { dirty = true; break; }
    }
  }
  if (!dirty) return [pts];
  const out = [];
  let run = null;
  const flush = () => { if (run && run.length > 1) out.push(run); run = null; };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / SAMPLE));
    for (let s = i === 0 ? 0 : 1; s <= n; s++) {
      const x = a[0] + ((b[0] - a[0]) * s) / n, y = a[1] + ((b[1] - a[1]) * s) / n;
      if (onWay(map, x, y)) { flush(); continue; }
      (run || (run = [])).push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    }
  }
  flush();
  return out.length ? out : null;
}

// De lijnen van een hegrij: één lijn, of de stukken waarin een weg hem knipte (#508). Een lezer die de heg tekent of
// meet, neemt ze allemaal; `pts` is het eerste stuk.
export const hedgeLines = (h) => (h.lines ? h.lines : h.pts && h.pts.length > 1 ? [h.pts] : []);

// Een hegrij naast de wegen knippen, ter plekke: `pts` (het eerste stuk), `lines` (alle stukken) en `bounds` (om ze
// alle, zodat het heggetal hem blijft vinden). Geeft true als er iets veranderde; `pts` is dan leeg als de heg
// helemaal op een weg lag.
export function trimHedgeRow(world, h) {
  const lines = hedgeLines(h);
  if (!lines.length) return false;
  const out = [];
  let changed = false;
  for (const L of lines) {
    const runs = cutHedgeOffWays(world, L);
    if (!runs) { changed = true; continue; }
    if (runs.length > 1 || runs[0] !== L) changed = true;
    for (const r of runs) out.push(r);
  }
  if (!changed) return false;
  h.pts = out[0] || [];
  if (out.length > 1) h.lines = out;
  else delete h.lines;
  h.bounds = out.length ? polygonBounds(out.flat()) : null;
  return true;
}

// De heg past na het knippen in het heggetal van de wereld: de stukken vervangen en de plek in het raster volgen.
function retrimHedge(world, h) {
  const was = h.bounds || (h.pts && h.pts.length > 1 ? polygonBounds(h.pts) : null);
  if (!trimHedgeRow(world, h)) return 0;
  if (!h.pts.length) {
    if (was && world.hedgeGrid) world.hedgeGrid.remove(h, was);
    const q = world.furniture ? world.furniture.indexOf(h) : -1;
    if (q >= 0) world.furniture.splice(q, 1);
    return 1;
  }
  if (world.hedgeGrid) {
    if (was) world.hedgeGrid.update(h, was, h.bounds);
    else world.hedgeGrid.insert(h, h.bounds);
  }
  return 1;
}

// Een boom naast de weg zetten of weghalen (treeclear.js), en het boomraster volgen: een verplaatste boom staat
// in de cellen van zijn nieuwe plek, een verdwenen boom staat er niet meer in (het spel tekent wat hier staat).
function retrimTree(world, t) {
  const p = treeBesideRoad(world, t[0], t[1]);
  if (!p) {
    if (world.treeGrid) world.treeGrid.remove(t, [t[0], t[1], t[0], t[1]]);
    return 'weg';
  }
  if (p[0] === t[0] && p[1] === t[1]) return null;
  const was = [t[0], t[1], t[0], t[1]];
  t[0] = p[0];
  t[1] = p[1];
  if (world.treeGrid) world.treeGrid.update(t, was, [t[0], t[1], t[0], t[1]]);
  return 'naast';
}

// De bomen en heggen van een tegel die net in de wereld kwam (tileworld.js addTile), en van de ring van 12 m
// eromheen als deze tegel wegen meebracht: een weg van deze tegel reikt over de rand naar de bomen en heggen van
// de buurtegel, die er al stonden en er anders op blijven staan. Geeft de telling voor de test en de statistiek.
export function trimTileGreenery(world, box, { trees = null, hedges = null, roads = false } = {}) {
  const stats = { removed: 0, moved: 0, hedges: 0 };
  const tree = (t) => { const r = retrimTree(world, t); if (r === 'weg') stats.removed++; else if (r === 'naast') stats.moved++; };
  const hedge = (h) => { if (h.pts && h.pts.length > 1 && retrimHedge(world, h)) stats.hedges++; };
  for (const t of trees || []) tree(t);
  for (const h of hedges || []) hedge(h);
  if (roads && box) {
    const [x0, y0, x1, y1] = box;
    const ring = [
      [x0 - REACH, y0 - REACH, x1 + REACH, y0], [x0 - REACH, y1, x1 + REACH, y1 + REACH],
      [x0 - REACH, y0, x0, y1], [x1, y0, x1 + REACH, y1],
    ];
    for (const q of ring) {
      if (world.treeGrid) for (const t of world.treeGrid.query(...q)) tree(t);
      if (world.hedgeGrid) for (const h of world.hedgeGrid.query(...q)) hedge(h);
    }
  }
  return stats;
}
