// Reisopties bij een bestemming (#97): per vervoerswijze de route, de reistijd,
// de prijs en de lijnen. Puur: de routes komen van buiten (planLandRoute,
// planTrainTrip, planBoatRoute) of uit busTrip() hieronder; geen wereld, geen DOM.
// De kaart (ovkaart.js) tekent ze, het keuzepaneel (reispanel.js) toont ze.
// Alle lijnnamen en vervoerders zijn verzonnen; echte namen uit data komen
// nooit in beeld (zie busroutes.lineName).
import { CRUISE, travelSeconds, needsBeat } from './reistijd.js';
import { lineName } from './busroutes.js';
import { stopName } from './busservice.js';

export const WALK_V = 1.5;
export const BUS_WAIT_S = 240;       // gemiddeld wachten op de halte
export const BUS_CHANGE_S = 180;
export const BOAT_WAIT_S = 300;
export const STOP_NEAR_M = 600;      // zo ver lopen we naar een halte
export const CHANGE_NEAR_M = 150;    // haltes zo dicht bij elkaar zijn een overstap

// lijnkleuren per soort; bussen krijgen een vaste kleur uit het palet per lijnnummer
export const KLEUR = { taxi: '#d8c548', trein: '#ffc917', boot: '#2f8fd8', auto: '#e8b04a', lopen: '#9aa3ad' };
const BUS_PALET = ['#d6452f', '#2f9e6a', '#8a5fd0', '#e07a1f', '#1f8fa8', '#c23a8c', '#6a9a2a', '#b5651d'];

export function busColor(ref) {
  const s = String(ref || '');
  let h = 3;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return BUS_PALET[h % BUS_PALET.length];
}

export const lineColor = (kind, ref) => (kind === 'bus' ? busColor(ref) : KLEUR[kind] || KLEUR.auto);

// prijs in euro's
export function trainPrice(lengthM) { return Math.max(4, Math.min(8, Math.round(3 + (+lengthM || 0) / 900))); }
export const BUS_PRICE = 3;
export const BOAT_PRICE = 5;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; };

function slice(line, s0, s1) {
  const up = s1 >= s0, lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  const at = (s) => {
    const { pts, cum } = line;
    if (s <= 0) return [pts[0][0], pts[0][1]];
    if (s >= line.length) return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
    let a = 0, b = pts.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (cum[m] <= s) a = m; else b = m; }
    const t = (s - cum[a]) / ((cum[b] - cum[a]) || 1);
    return [pts[a][0] + (pts[b][0] - pts[a][0]) * t, pts[a][1] + (pts[b][1] - pts[a][1]) * t];
  };
  const out = [at(lo)];
  for (let i = 0; i < line.pts.length; i++) if (line.cum[i] > lo && line.cum[i] < hi) out.push([line.pts[i][0], line.pts[i][1]]);
  out.push(at(hi));
  return up ? out : out.reverse();
}

// Buslijnen (prepareLines uit busroutes.js) als reis: lopen naar een halte, een
// lijn (hooguit één overstap), lopen naar het doel. a, b: [x, y]. opts.walk(a, b)
// geeft een looproute of null (anders een rechte lijn). null als er geen bus gaat.
export function busTrip(lines, a, b, opts = {}) {
  const walk = opts.walk || ((p, q) => [p, q]);
  const near = (p) => {
    const r = [];
    lines.forEach((l, li) => l.stops.forEach((st, si) => { const d = dist([st.x, st.y], p); if (d <= STOP_NEAR_M) r.push({ li, si, d }); }));
    return r;
  };
  const from = near(a), to = near(b);
  if (!from.length || !to.length) return null;
  const rideS = (l, i0, i1) => Math.abs(l.stops[i1].s - l.stops[i0].s) / CRUISE.bus + Math.abs(i1 - i0) * 9;
  let best = null;
  const offer = (cost, plan) => { if (!best || cost < best.cost) best = { cost, ...plan }; };
  for (const f of from) {
    for (const t of to) {
      if (f.li !== t.li || f.si === t.si) continue;
      const l = lines[f.li];
      offer((f.d + t.d) / WALK_V + BUS_WAIT_S + rideS(l, f.si, t.si), { runs: [{ li: f.li, a: f.si, b: t.si }] });
    }
  }
  // één overstap: lijn 1 van f naar een halte bij een halte van lijn 2 naar t
  if (!best) {
    for (const f of from) {
      const l1 = lines[f.li];
      l1.stops.forEach((s1, i1) => {
        if (i1 === f.si) return;
        for (const t of to) {
          if (t.li === f.li) continue;
          const l2 = lines[t.li];
          l2.stops.forEach((s2, i2) => {
            if (i2 === t.si || dist([s1.x, s1.y], [s2.x, s2.y]) > CHANGE_NEAR_M) return;
            const cost = (f.d + t.d) / WALK_V + BUS_WAIT_S + BUS_CHANGE_S + rideS(l1, f.si, i1) + rideS(l2, i2, t.si);
            offer(cost, { runs: [{ li: f.li, a: f.si, b: i1 }, { li: t.li, a: i2, b: t.si }] });
          });
        }
      });
    }
  }
  if (!best) return null;
  const legs = [], stops = [], used = [], changes = [];
  const first = lines[best.runs[0].li].stops[best.runs[0].a];
  const w1 = walk(a, [first.x, first.y]);
  if (!w1) return null;
  legs.push({ kind: 'walk', pts: w1, length: polyLen(w1), label: `Lopen naar ${stopName(lines[best.runs[0].li], best.runs[0].a)}` });
  best.runs.forEach((r, k) => {
    const l = lines[r.li], sa = l.stops[r.a], sb = l.stops[r.b];
    const pts = slice(l, sa.s, sb.s);
    const na = stopName(l, r.a), nb = stopName(l, r.b);
    const color = busColor(l.ref || l.id);
    const name = l.name || lineName(l.ref);
    legs.push({ kind: 'bus', pts, length: polyLen(pts), label: `${name}: ${na} > ${nb}`, line: name, color, from: na, to: nb });
    used.push({ name, ref: l.ref || '', color, kind: 'bus' });
    if (k === 0) stops.push({ kind: 'instap', name: na, x: sa.x, y: sa.y });
    if (k < best.runs.length - 1) { stops.push({ kind: 'overstap', name: nb, x: sb.x, y: sb.y }); changes.push(nb); }
    else stops.push({ kind: 'uitstap', name: nb, x: sb.x, y: sb.y });
  });
  const lastRun = best.runs[best.runs.length - 1];
  const last = lines[lastRun.li].stops[lastRun.b];
  const w2 = walk([last.x, last.y], b);
  if (!w2) return null;
  legs.push({ kind: 'walk', pts: w2, length: polyLen(w2), label: 'Lopen naar je doel' });
  const pts = [];
  for (const lg of legs) for (const p of lg.pts) if (!pts.length || dist(pts[pts.length - 1], p) > 0.05) pts.push(p);
  return { mode: 'bus', pts, length: polyLen(pts), etaS: best.cost, legs, stops, changes, lines: used };
}

// ---- opties ---------------------------------------------------------------

// #836: een taxi is een eigen reisoptie: geen dienstregeling, wel een prijs en een veilige
// aankomst bij het doel; de scène valt terug op de auto-opnamen.
export const TAXI_WAIT_S = 120;
export const taxiPrice = (lengthM) => Math.max(5, Math.round(5 + (+lengthM || 0) / 700));
export const MODE_LABEL = { taxi: 'Met de taxi', auto: 'Zelf rijden', trein: 'Met de trein', bus: 'Met de bus', boot: 'Per boot' };

// Eén optie uit een route. route: { length, etaS, legs?, stops?, changes?, lines? }.
function optionFrom(id, route, extra = {}) {
  if (!route || !(route.length > 0)) return null;
  const lines = route.lines || (route.legs || []).filter((l) => l.kind === 'train').map((l) => ({ name: l.line, color: KLEUR.trein, kind: 'trein' }));
  return {
    id, ride: id !== 'auto', label: MODE_LABEL[id], length: route.length,
    etaS: Math.round(route.etaS), transfers: (route.changes || []).length,
    price: 0, lines, stops: route.stops || [], legs: route.legs || [], pts: route.pts || [],
    ...extra,
  };
}

function trainRideLength(r) { return (r.legs || []).filter((l) => l.kind === 'train').reduce((n, l) => n + l.length, 0) || r.length; }

// Alle opties voor een bestemming. routes: { auto?, trein?, bus?, boot? }, elk
// een route zoals hierboven of null. Zelf rijden is er altijd, ook zonder route
// (dan rekent het met `directM`). Precies één meerijden-optie is aanbevolen.
export function reisOpties(routes, { directM = 0, money = Infinity } = {}) {
  const out = [];
  const auto = routes.auto || (directM > 0 ? { length: directM, etaS: travelSeconds(directM, 'auto') } : null);
  const a = optionFrom('auto', auto);
  if (a) out.push(a);
  const t = optionFrom('trein', routes.trein, { price: routes.trein ? trainPrice(trainRideLength(routes.trein)) : 0 });
  if (t) out.push(t);
  const b = optionFrom('bus', routes.bus, { price: BUS_PRICE * (1 + ((routes.bus && routes.bus.changes) || []).length) });
  if (b) out.push(b);
  const o = optionFrom('boot', routes.boot ? { ...routes.boot, etaS: routes.boot.etaS + BOAT_WAIT_S } : null, { price: BOAT_PRICE });
  if (o) out.push(o);
  const tx = optionFrom('taxi', routes.taxi, { price: routes.taxi ? taxiPrice(routes.taxi.length) : 0 });
  if (tx) out.push(tx);
  for (const x of out) { x.afford = money >= x.price; x.eta = etaText(x.etaS); }
  // aanbevolen: de snelste meerijden-optie die je kunt betalen, als hij niet
  // veel trager is dan zelf rijden (of als het een sprong is)
  const rides = out.filter((x) => x.ride && x.afford).sort((p, q) => p.etaS - q.etaS);
  const self = out.find((x) => x.id === 'auto');
  const rec = rides[0];
  if (rec && (!self || rec.etaS <= self.etaS * 1.5 || needsBeat(rec.length))) rec.aanbevolen = true;
  return out;
}

export function etaText(s) {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `± ${min} min`;
  return `± ${Math.floor(min / 60)} u ${min % 60 ? `${min % 60} min` : ''}`.trim();
}

// één regel per optie: "Met de bus · Lijn 12 De Wadloper · 1 overstap · € 6 · ± 24 min"
export function optieRegel(o) {
  const parts = [o.label];
  if (o.lines.length) parts.push([...new Set(o.lines.map((l) => l.name))].join(' + '));
  if (o.transfers) parts.push(o.transfers === 1 ? '1 overstap' : `${o.transfers} overstappen`);
  if (o.price) parts.push(`€ ${o.price}`);
  parts.push(o.eta || etaText(o.etaS));
  return parts.join(' · ');
}
