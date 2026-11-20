// De vaarroutelijn: een doorlopende lijn op het wateroppervlak die de berekende vaarroute
// (vaarnet.js, via routing.js) volgt, zoals het routelint op land. Pure regels, zonder three:
// scene3d/vaarlijn3d.js maakt er de mesh van. Boeien blijven echte navigatiemarkeringen
// (vaargeul, ondiepte); de route zelf is een lijn, geen rij boeien meer.
//
// Samen spelen: lokaal per speler (de route is die van de speler zelf, net als het routelint).

export const VAARLIJN = {
  AHEAD_M: 240,        // zoveel meter vooruit, daarna zachte uitfade
  HALF_W: 2.0,         // 4 m breed: leesbaar op afstand vanaf de boot
  STEP_M: 3,           // herbemonstering van de route (bochten blijven rond)
  FADE_IN_M: 8,        // onder de romp onzichtbaar, daarna in
  FADE_OUT_M: 60,      // zachte uitfade aan het eind van het getoonde stuk
  CHEVRON_M: 6,        // lengte van een chevron in de textuur
  LIFT: 0.06,          // m boven de waterspiegel (zonder golven)
  MAX_PTS: 400,
  DASH_ON_M: 1.6,      // de terugvallijn: gestippeld
  DASH_OFF_M: 2.4,
  DASH_AHEAD_M: 140,
};

// Is er nu een vaarroute die een lijn hoort te hebben? (de bewaker in de test en in de scene)
export function vaarlijnGewenst(route) {
  return !!route && route.mode === 'boat' && route.remaining > 10 && Array.isArray(route.pts) && route.pts.length >= 2;
}
// de luchtlijn-terugval: er is geen vaarroute gevonden (route.noRoute), de lijn is gestippeld
export const vaarlijnTerugval = (route) => !!route && route.mode === 'boat' && !!route.noRoute;

// Herbemonster een polylijn elke `step` meter (hoeken blijven staan); [[x, y], ...]
export function herbemonster(pts, step = VAARLIJN.STEP_M, max = VAARLIJN.MAX_PTS) {
  if (!pts || pts.length < 2) return pts ? pts.slice() : [];
  const out = [pts[0]];
  for (let i = 1; i < pts.length && out.length < max; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(L / step);
    for (let k = 1; k < n && out.length < max - 1; k++) out.push([a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n)]);
    out.push(b);
  }
  return out;
}

// De luchtlijn van `a` naar `b`, hoogstens DASH_AHEAD_M lang: [[x, y], [x, y]]
export function terugvalPunten(a, b, max = VAARLIJN.DASH_AHEAD_M) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 1) return [];
  const k = Math.min(1, max / L);
  return [[a[0], a[1]], [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]];
}

// Buffers voor één lijn, eenmaal aangemaakt (geen allocatie per herbouw): 2 hoekpunten per punt.
export function maakLijnBuffers(maxPts = VAARLIJN.MAX_PTS) {
  return {
    maxPts,
    pos: new Float32Array(maxPts * 2 * 3),
    uv: new Float32Array(maxPts * 2 * 2),
    col: new Float32Array(maxPts * 2 * 4),
    idx: new Uint16Array((maxPts - 1) * 6),
  };
}

// De alfa van de lijn op afstand `d` van het begin, bij totaal `total` meter getoond.
// `afgekapt`: de route loopt verder dan het getoonde stuk (dan zachte uitfade); anders
// vaart de lijn tot het doel en dooft hij alleen de laatste paar meter.
export function lijnAlfa(d, total, afgekapt) {
  const inn = Math.min(1, Math.max(0, d / VAARLIJN.FADE_IN_M));
  const ruimte = afgekapt ? VAARLIJN.FADE_OUT_M : 4;
  const uit = Math.min(1, Math.max(0, (total - d) / ruimte));
  const s = (x) => x * x * (3 - 2 * x);
  return s(inn) * s(uit);
}

// Vul de buffers met de strook langs `pts` (herbemonsterd). yAt(x, y) geeft de hoogte van
// het wateroppervlak (zonder lift). opts: along0 (m, voor de chevronfase), afgekapt, dash.
// -> { n: aantal punten, nIdx: aantal indices }
export function vulLijn(buf, pts, yAt, opts = {}) {
  const { along0 = 0, afgekapt = true, dash = false, halfW = VAARLIJN.HALF_W } = opts;
  const n = Math.min(pts.length, buf.maxPts);
  if (n < 2) return { n: 0, nIdx: 0 };
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let dist = 0, nIdx = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const y = yAt(pts[i][0], pts[i][1]) + VAARLIJN.LIFT;
    const alpha = lijnAlfa(dist, total, afgekapt);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      const j = i * 2 + k;
      buf.pos[j * 3] = pts[i][0] - dy * halfW * side;
      buf.pos[j * 3 + 1] = y;
      buf.pos[j * 3 + 2] = pts[i][1] + dx * halfW * side;
      buf.uv[j * 2] = k;
      buf.uv[j * 2 + 1] = (along0 + dist) / VAARLIJN.CHEVRON_M;
      buf.col[j * 4] = buf.col[j * 4 + 1] = buf.col[j * 4 + 2] = 1;
      buf.col[j * 4 + 3] = alpha;
    }
    if (i < n - 1) {
      // de stippellijn slaat de stukken tussen de streepjes over
      const midden = dist + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 2;
      const aan = !dash || midden % (VAARLIJN.DASH_ON_M + VAARLIJN.DASH_OFF_M) < VAARLIJN.DASH_ON_M;
      if (aan) {
        const q = i * 2;
        buf.idx[nIdx++] = q; buf.idx[nIdx++] = q + 2; buf.idx[nIdx++] = q + 1;
        buf.idx[nIdx++] = q + 1; buf.idx[nIdx++] = q + 2; buf.idx[nIdx++] = q + 3;
      }
    }
  }
  return { n, nIdx };
}

// De sleutel waarbij de lijn opnieuw wordt opgebouwd: nieuwe berekening (version), een
// ander soort lijn, of de boot is twee meter verder.
export const lijnSleutel = (route) => `${route.version}:${route.noRoute ? 'l' : 'v'}:${Math.round(route.px / 2)}:${Math.round(route.py / 2)}`;
