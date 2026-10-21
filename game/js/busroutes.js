// Buslijnen als routemodel (#80): een lijn is een gekettinkte polylijn met haltes
// op boogafstand, en een rit (runner) die er heen en weer of rond overheen gaat.
// Puur: geen import van de wereld. Wegbreedte komt van buiten (roadWidthAt), de
// bus-AI in vehicle.js krijgt per beeld alleen een doel (aiOpts.goal) en een
// wachttijd bij de halte; het kortste-pad (findRoute) kiest alleen wegen waar de
// bus op past, dus een lijn die door een te smalle straat loopt rijdt eromheen.
//
// Data: provincie-bus.json ({ bus: [{ id, ref, name, from, to, pts, stops }] },
// door scripts/world/build_corridor.mjs busLines). De namen uit die data zijn
// echte lijnnamen en komen nooit in beeld: lineName() geeft een verzonnen naam.

export const STOP_RADIUS = 14;      // m: binnen dit bereik van de halte telt hij als gehaald
export const DWELL = 9;             // s halteren
export const LOOKAHEAD = 70;        // m vooruit op de lijn voor het doel van de AI
export const MIN_LENGTH = 400;      // m: kortere lijnen zijn rommel in de data
export const MERGE_STOPS = 30;      // m: haltes dichter bij elkaar zijn één halte
const LOOP_GAP = 150;               // m tussen begin en eind: een ronde lijn

const NAMES = ['De Zuidwester', 'Het Hoogeland', 'De Wadloper', 'Stadsslinger', 'De Oostrandlijn', 'Veenkoloniaal', 'De Kleiboer', 'Het Gorechtlijntje', 'De Maarkant', 'Pottenbakker', 'De Kustkruiper', 'Hunzedal'];

// verzonnen lijnnaam bij een lijnnummer (stabiel: zelfde ref, zelfde naam)
export function lineName(ref) {
  const s = String(ref || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `Lijn ${s || '?'} ${NAMES[h % NAMES.length]}`;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// --- welke wegen een bus mag nemen (#322) ----------------------------------------------------------
// Harde regels gelden altijd: geen voet- of fietspad, geen weg die OSM voor bussen sluit, geen
// voetgangersstraat, pad of zandweg, en breed genoeg. Een bus zonder lijn (of een bus die een
// omweg zoekt) blijft daarnaast op het busnet: hoofdwegen, tertiaire wegen, busbanen. Een straat
// van het woonwijkje (residential, service) is er alleen voor een bus als zijn lijn er echt loopt:
// de lijndata is de echte route, dus daar mag hij, en elders niet.
export const BUS_WID = 2.6;          // m: een gelede bus
export const BUS_MARGE = 1.1;        // m speling naast de bus (zoals vehicle.js canUseRoad)
export const LIJN_STROOK = 12;       // m: een weg telt als "van de lijn" binnen deze afstand van de polylijn
const GEEN_BUS_TYPES = new Set(['footway', 'cycleway', 'path', 'track', 'bridleway', 'steps', 'pedestrian', 'living_street', 'corridor', 'platform']);
const BUSNET_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'busway']);
const ACC_BUS = 8;                   // navgraph.js ACC.BUS (hier herhaald om puur te blijven)

// Reden waarom een bus een weg nooit mag nemen, of null.
export function busWegFout(road, wid = BUS_WID) {
  if (!road) return 'geen weg';
  if (road.cat === 'foot') return 'voetpad';
  if (road.cat === 'cycle') return 'fietspad';
  if (road.busOnly) return null;
  if (typeof road.acc === 'number' && !(road.acc & ACC_BUS)) return 'gesloten voor bussen';
  if (GEEN_BUS_TYPES.has(road.type)) return `geen busweg (${road.type})`;
  if (!(road.width >= wid + BUS_MARGE)) return 'te smal';
  return null;
}

// Hoort de weg bij het busnet (ook zonder lijn)?
export const busWegOpNet = (road) => !!road && (road.busOnly || road.cat === 'major' || BUSNET_TYPES.has(road.type));

// Strook rond een lijn: een set rastercellen (6 m) binnen LIJN_STROOK van de polylijn.
const CEL = 6;
export function lijnStrook(line) {
  if (line._strook) return line._strook;
  const cells = new Set();
  const r = Math.ceil(LIJN_STROOK / CEL);
  for (let s = 0; s <= line.length; s += CEL * 0.5) {
    const p = pointAt(line, s);
    const cx = Math.floor(p.x / CEL), cy = Math.floor(p.y / CEL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const x = (cx + i + 0.5) * CEL, y = (cy + j + 0.5) * CEL;
      if (Math.hypot(x - p.x, y - p.y) <= LIJN_STROOK) cells.add((cx + i) * 100003 + (cy + j));
    }
  }
  return (line._strook = cells);
}
export const opLijn = (line, x, y) => lijnStrook(line).has(Math.floor(x / CEL) * 100003 + Math.floor(y / CEL));

// Loopt (het grootste deel van) de weg over de lijn? Punten om de ~12 m, minstens 60% binnen de strook.
export function wegOpLijn(line, road) {
  const P = road.pts;
  let n = 0, hit = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], len = dist(a, b), k = Math.max(1, Math.ceil(len / 12));
    for (let j = 0; j < k; j++) { const t = j / k; n++; if (opLijn(line, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) hit++; }
  }
  const e = P[P.length - 1];
  n++; if (opLijn(line, e[0], e[1])) hit++;
  return hit / n >= 0.6;
}

// De regel voor het verkeer: mag een bus (met deze lijn, of zonder) deze weg nemen? Antwoorden per (lijn, weg) gecachet.
export function busMagWeg(road, line, wid = BUS_WID) {
  if (busWegFout(road, wid)) return false;
  if (busWegOpNet(road)) return true;
  if (!line) return false;
  const c = line._wegen || (line._wegen = new WeakMap());
  let v = c.get(road);
  if (v === undefined) { v = wegOpLijn(line, road); c.set(road, v); }
  return v;
}

// Ruwe lijn uit de data naar het model: opgeschoonde punten, boogafstanden,
// haltes op boogafstand (gesorteerd, samengevoegd), lus ja/nee. null als de lijn
// niet te gebruiken is.
export function prepareLine(raw) {
  if (!raw || !Array.isArray(raw.pts)) return null;
  const pts = [];
  for (const p of raw.pts) if (!pts.length || dist(p, pts[pts.length - 1]) > 0.5) pts.push([p[0], p[1]]);
  if (pts.length < 2) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
  const length = cum[cum.length - 1];
  if (length < MIN_LENGTH) return null;
  const line = { id: raw.id, ref: raw.ref || '', from: raw.from || '', to: raw.to || '', name: lineName(raw.ref || raw.id), pts, cum, length, loop: dist(pts[0], pts[pts.length - 1]) < LOOP_GAP, stops: [] };
  const found = [];
  for (const st of raw.stops || []) {
    const pr = project(line, st.x, st.y);
    if (pr.d <= 60) found.push({ s: pr.s, x: pr.x, y: pr.y });
  }
  found.sort((a, b) => a.s - b.s);
  for (const f of found) if (!line.stops.length || f.s - line.stops[line.stops.length - 1].s > MERGE_STOPS) line.stops.push(f);
  // zonder bruikbare haltedata: begin en eind zijn de haltes
  if (line.stops.length < 2) line.stops = [{ s: 0, x: pts[0][0], y: pts[0][1] }, { s: length, x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] }];
  return line;
}

export function prepareLines(list) {
  const out = [];
  for (const r of list || []) { const l = prepareLine(r); if (l) out.push(l); }
  return out;
}

// punt op boogafstand s (geklemd) met rijrichting
export function pointAt(line, s) {
  s = Math.max(0, Math.min(line.length, s));
  const { pts, cum } = line;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  const a = pts[lo], b = pts[hi];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// dichtstbijzijnde punt op de lijn; from/to beperkt het zoeken tot een boogafstandsvenster
// Bij gelijke afstand (een lijn die over zichzelf terugloopt) wint met dir > 0 het latere stuk.
export function project(line, x, y, from = 0, to = Infinity, dir = 0) {
  const { pts, cum } = line;
  let best = { d: Infinity, s: 0, x: pts[0][0], y: pts[0][1] };
  for (let i = 0; i < pts.length - 1; i++) {
    if (cum[i + 1] < from || cum[i] > to) continue;
    const a = pts[i], b = pts[i + 1];
    const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2));
    const px = a[0] + vx * t, py = a[1] + vy * t, d = Math.hypot(x - px, y - py);
    if (d < best.d - 0.01 || (dir > 0 && d < best.d + 0.01)) best = { d, s: cum[i] + Math.sqrt(l2) * t, x: px, y: py };
  }
  return best;
}

// Stukken van de lijn waar de bus niet past: roadWidthAt(x, y) geeft de breedte
// van de weg daar (of null als er geen weg is). Teruggegeven: [{ from, to }] in m.
export function narrowSpans(line, roadWidthAt, busWidth = 2.6, step = 10) {
  const spans = [];
  let open = null;
  for (let s = 0; s <= line.length; s += step) {
    const p = pointAt(line, s);
    const w = roadWidthAt(p.x, p.y);
    const bad = w === null || w === undefined || w < busWidth + 1.1;
    if (bad && !open) open = { from: s, to: s };
    else if (bad) open.to = s;
    else if (open) { spans.push(open); open = null; }
  }
  if (open) spans.push(open);
  return spans;
}

// De lijn die het dichtst bij (x, y) komt, binnen maxD m.
export function nearestLine(lines, x, y, maxD = 400) {
  let best = null, bd = maxD;
  for (const l of lines || []) {
    const d = project(l, x, y).d;
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

// Alle lijnen binnen maxD van een punt (dichtstbij eerst): meer dan één lijn per plek.
export function linesNear(lines, x, y, maxD = 400) {
  const out = [];
  for (const l of lines || []) {
    const d = project(l, x, y).d;
    if (d < maxD) out.push({ l, d });
  }
  return out.sort((a, b) => a.d - b.d).map((q) => q.l);
}

// Een rit over een lijn. dir +1 vooruit, -1 terug; op een niet-ronde lijn keert
// hij aan het eind om, op een ronde lijn loopt s door.
export function makeRunner(line, s = 0, dir = 1) {
  return { line, s: Math.max(0, Math.min(line.length, s)), dir: dir < 0 ? -1 : 1, dwell: 0, served: null, trips: 0 };
}

function nextStop(r) {
  const { stops } = r.line;
  if (r.dir > 0) { for (const st of stops) if (st.s > r.s + 1) return st; return r.line.loop ? stops[0] : null; }
  for (let i = stops.length - 1; i >= 0; i--) if (stops[i].s < r.s - 1) return stops[i];
  return r.line.loop ? stops[stops.length - 1] : null;
}
export { nextStop };

// Per beeld: waar is de bus nu (x, y), hoeveel tijd is er om (dt). Geeft
// { goal, hold, atStop } terug: goal voor de AI, hold = seconden wachten bij de halte.
export function stepRunner(r, x, y, dt) {
  const L = r.line;
  if (r.dwell > 0) {
    r.dwell = Math.max(0, r.dwell - dt);
    return { goal: aheadGoal(r), hold: r.dwell, atStop: true };
  }
  // alleen voortgang binnen een venster rond s, zodat een lus zichzelf niet kruist
  const pr = project(L, x, y, r.s - 80, r.s + 160, r.dir);
  if (pr.d < 120) {
    if (r.dir > 0 ? pr.s > r.s : pr.s < r.s) r.s = pr.s;
  }
  // eind van een niet-ronde lijn: keren
  if (!L.loop) {
    if (r.dir > 0 && r.s > L.length - 6) { r.dir = -1; r.trips++; r.served = null; }
    else if (r.dir < 0 && r.s < 6) { r.dir = 1; r.trips++; r.served = null; }
  } else if (r.dir > 0 && r.s > L.length - 6) { r.s = 0; r.trips++; r.served = null; }
  else if (r.dir < 0 && r.s < 6) { r.s = L.length; r.trips++; r.served = null; }
  const st = nextStop(r);
  if (st && st !== r.served && Math.hypot(st.x - x, st.y - y) < STOP_RADIUS) {
    r.served = st;
    r.dwell = DWELL;
    return { goal: aheadGoal(r), hold: DWELL, atStop: true };
  }
  return { goal: aheadGoal(r), hold: 0, atStop: false };
}

// doel LOOKAHEAD m verder op de lijn, over het eind heen (lus) of tot het eind
function aheadGoal(r) {
  const L = r.line;
  let s = r.s + r.dir * LOOKAHEAD;
  // een ronde lijn heeft tot 150 m tussen eind en begin: het doel stopt op het eind, daar wikkelt stepRunner
  if (L.loop) s = Math.max(0, Math.min(L.length, s));
  const p = pointAt(L, s);
  return { x: p.x, y: p.y };
}

// Waar een bus op een lijn begint: punt op boogafstand s, met rijrichting dir.
export function startAt(line, s, dir = 1) {
  const p = pointAt(line, s);
  return { x: p.x, y: p.y, angle: dir < 0 ? p.heading + Math.PI : p.heading };
}

// Het busbestand van de provincie (provincie-bus.json, global.busFile van de
// index): { bus: [...] } naar voorbereide lijnen, of [] als het ontbreekt.
export async function loadBusLines(base = 'world/', file) {
  if (!file) return [];
  try {
    const r = await fetch(base + file);
    if (!r.ok) return [];
    const j = await r.json();
    return prepareLines(j && j.bus);
  } catch (e) {
    console.warn('bus lines not loaded', e);
    return [];
  }
}
