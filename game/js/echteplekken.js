import { pointInPolygon } from './util.js';

// De echte plekken van padelbanen en golfbanen / Pitch & Putt (#174): game/echteplekken.json,
// geschreven door scripts/world/echteplekken.py uit de OSM-provincie-extract (RD New-spelframe).
// Pure kant, geen DOM: padel.js en pitchputt.js vragen hier de locaties en de baanindeling.
// Zonder bestand (of zonder data) geven de functies [] terug en houden de modules hun oude plek.
// Namen van clubs nemen we niet over: elke plek heet naar zijn woonplaats of wijk.

let cache = null;

export async function loadEchtePlekken() {
  if (cache) return cache;
  try {
    const res = await fetch(new URL('echteplekken.json', location.href).href);
    cache = res.ok ? await res.json() : { padel: [], golf: [] };
  } catch (e) {
    cache = { padel: [], golf: [] };
  }
  return cache;
}

function echtePlekken() { return cache || { padel: [], golf: [] }; }

const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h >>> 0) / 4294967296; };

// --- padel ---------------------------------------------------------------------------------

const SITE_GAP = 90;     // banen binnen 90 m horen bij één locatie
const CENTRE_GAP = 150;  // een sportcentrum binnen 150 m van een baan is dezelfde locatie

// Locaties voor padel.js: { x, y, courts: [{ x, y, rot }], name, src: 'osm', centre? }.
// Banen (pitches van padelformaat) worden gegroepeerd; een sportcentrum zonder baan in de buurt
// wordt een locatie zonder banen (padel.js zoekt er dan zelf een vrije plek bij).
export function padelDefs(data = echtePlekken()) {
  const sites = [];
  const banen = (data.padel || []).filter((p) => p.soort === 'baan').sort((a, b) => a.x - b.x || a.y - b.y);
  for (const b of banen) {
    let s = sites.find((q) => Math.hypot(q.x - b.x, q.y - b.y) < SITE_GAP);
    if (!s) { s = { x: b.x, y: b.y, courts: [], plaats: b.plaats, src: 'osm' }; sites.push(s); }
    s.courts.push({ x: b.x, y: b.y, rot: b.rot });
  }
  for (const c of (data.padel || []).filter((p) => p.soort !== 'baan').sort((a, b) => a.x - b.x || a.y - b.y)) {
    if (sites.some((q) => Math.hypot(q.x - c.x, q.y - c.y) < CENTRE_GAP || q.courts.some((k) => Math.hypot(k.x - c.x, k.y - c.y) < CENTRE_GAP))) continue;
    sites.push({ x: c.x, y: c.y, courts: [], centre: true, plaats: c.plaats, src: 'osm' });
  }
  const seen = new Map();
  for (const s of sites) {
    const base = 'Padelbaan ' + (s.plaats || 'Grunn');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    s.name = n > 1 ? `${base} ${n}` : base;
    delete s.plaats;
  }
  return sites;
}

// De echte plekken voorop, de oude (mapextras.json) alleen waar de data niets heeft binnen 250 m.
export function mergePadelDefs(real, old, gap = 250) {
  const out = real.slice();
  for (const o of old || []) {
    if (!real.some((r) => Math.hypot(r.x - o.x, r.y - o.y) < gap)) out.push(o);
  }
  return out;
}

// --- golf / Pitch & Putt --------------------------------------------------------------------

const MIN_LEN = 30, MAX_LEN = 78;
const HOLES_WANTED = 6;

const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const inRing = (ring, x, y) => pointInPolygon(x, y, ring.concat([ring[0]]));

function holeFlavour(k, seed) {
  // helling en bunkers per hole, vast per baan en hole (de oude zes holes hadden ze met de hand)
  return {
    slope: [hash(seed + k * 7) * Math.PI * 2 - Math.PI, 0.022 + hash(seed + k * 13) * 0.012],
    bunkers: k % 3 === 0 ? [[(hash(seed + k) < 0.5 ? -1 : 1) * (6 + hash(seed + k * 3) * 2), (hash(seed + k * 5) < 0.5 ? -1 : 1) * 4.5, 2.4 + hash(seed + k * 11) * 0.6]] : [],
  };
}

// Echte tees en greens (golf=tee/green, golf=hole als lijn) binnen de baan: paren van 30 tot 78 m.
function realPairs(course, parts) {
  const inside = (p) => inRing(course.ring, p.x, p.y);
  const tees = parts.filter((p) => p.golf === 'tee' && inside(p)), greens = parts.filter((p) => p.golf === 'green' && inside(p));
  const out = [];
  for (const h of parts.filter((p) => p.golf === 'hole' && p.lijn && inside(p))) {
    const a = h.lijn[0], b = h.lijn[h.lijn.length - 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l >= MIN_LEN && l <= MAX_LEN) out.push({ tee: { x: a[0], y: a[1] }, cup: { x: b[0], y: b[1] } });
  }
  const usedG = new Set();
  for (const t of tees) {
    let best = null, bd = Infinity;
    for (const g of greens) {
      if (usedG.has(g)) continue;
      const d = Math.hypot(g.x - t.x, g.y - t.y);
      if (d >= MIN_LEN && d <= MAX_LEN && d < bd) { bd = d; best = g; }
    }
    if (best) { usedG.add(best); out.push({ tee: { x: t.x, y: t.y }, cup: { x: best.x, y: best.y } }); }
  }
  // geen twee holes op elkaar
  const kept = [];
  for (const h of out) if (!kept.some((k) => Math.hypot(k.cup.x - h.cup.x, k.cup.y - h.cup.y) < 20 || Math.hypot(k.tee.x - h.tee.x, k.tee.y - h.tee.y) < 6)) kept.push(h);
  return kept;
}

// Zes holes in een rooster over de omhullende van de baan (lengte-as = rot), een blok van
// hooguit 260 x 150 m om het midden, zo dat alle tees en greens binnen de omtrek vallen.
function gridHoles(course) {
  if (![course.x, course.y, course.rot, course.l, course.w].every(Number.isFinite)) return [];
  const c = Math.cos(course.rot), s = Math.sin(course.rot);
  const at = (cx, cy, u, v) => ({ x: cx + c * u - s * v, y: cy + s * u + c * v });
  const layouts = [[3, 2], [2, 3], [6, 1], [1, 6], [2, 2], [3, 1], [1, 3]];
  for (const [cols, rows] of layouts) {
    const L = Math.min(course.l - 14, 260), W = Math.min(course.w - 14, 150);
    const cu = L / cols, cv = W / rows;
    if (cu < MIN_LEN + 6 || cv < 22) continue;
    const len = Math.min(MAX_LEN - 8, cu * 0.84);
    const holes = [];
    let ok = true;
    for (let r = 0; r < rows && ok; r++) {
      for (let k = 0; k < cols && ok; k++) {
        const u0 = -L / 2 + cu * (k + 0.5), v0 = -W / 2 + cv * (r + 0.5);
        const dir = (r + k) % 2 ? -1 : 1;
        const tee = at(course.x, course.y, u0 - dir * len / 2, v0), cup = at(course.x, course.y, u0 + dir * len / 2, v0);
        if (![tee, cup].every((p) => inRing(course.ring, p.x, p.y))) { ok = false; break; }
        holes.push({ tee, cup });
      }
    }
    if (ok && holes.length >= 3) return holes;
  }
  return [];
}

// Een Pitch & Putt-baan op een echte golfbaan: { id, plaats, x, y, holes: [{ tee, cup, slope, bunkers }], real }.
// Echte tee/green-paren als er minstens drie zijn, anders een rooster in de omtrek.
export function golfVenues(data = echtePlekken(), { maxHa = 400 } = {}) {
  const golf = data.golf || [];
  const parts = golf.filter((g) => g.golf);
  const venues = [];
  for (const course of golf.filter((g) => g.leisure === 'golf_course' && g.ring && g.ring.length >= 3 && (g.ha || 0) <= maxHa)) {
    let holes = realPairs(course, parts), real = true;
    if (holes.length < 3) { holes = gridHoles(course); real = false; }
    if (holes.length < 3) continue;
    holes = holes.filter((h) => [h.tee.x, h.tee.y, h.cup.x, h.cup.y].every(Number.isFinite)).slice(0, HOLES_WANTED);
    if (holes.length < 3) continue;
    const seed = Math.round(Math.abs(course.x) * 3 + Math.abs(course.y));
    holes = holes.map((h, i) => ({ ...h, ...holeFlavour(i, seed) }));
    const [cx, cy] = centroid(holes.flatMap((h) => [[h.tee.x, h.tee.y], [h.cup.x, h.cup.y]]));
    venues.push({ id: 'echt-' + course.id, plaats: course.plaats || 'Grunn', x: cx, y: cy, holes, real, kleinBaan: !!course.pp, ha: course.ha });
  }
  const seen = new Map();
  for (const v of venues) {
    const base = 'Pitch & putt ' + v.plaats;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    v.name = n > 1 ? `${base} ${n}` : base;
  }
  return venues;
}

export const nearestOf = (list, x, y) => {
  let best = null, bd = Infinity;
  for (const v of list) { const d = Math.hypot(v.x - x, v.y - y); if (d < bd) { bd = d; best = v; } }
  return best ? { item: best, dist: bd } : null;
};

// Afstand (m) van een punt tot de dichtstbijzijnde lijn van `lijnen` ([{ pts: [[x, y], ...] }]); Infinity zonder lijnen.
export function afstandTotLijnen(lijnen, x, y) {
  let best = Infinity;
  for (const r of lijnen) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
      const d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
      if (d < best) best = d;
    }
  }
  return best;
}
