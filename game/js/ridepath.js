// Het pad van de taxirit (#882, playtest 0.64.0: "de taxi rijdt dwars door een gebouw heen"): de pure kant. De autoroute (routing.js
// planDriveRoute) is een rij wegpunten met aan het begin de plek van de speler en aan het eind de bestemming, allebei vaak
// naast of IN een gebouw. Het pad werd daarna door een Catmull-Rom-spline gehaald die bij ongelijke afstanden tussen de punten
// hoeken afsnijdt en uitzwaait. Hier wordt dat veilig: het begin- en eindstuk van de speler en het doel vallen weg (de taxi
// start en stopt aan de straatkant), de spline wordt per pad gecontroleerd tegen de gebouwvoetafdrukken (en op de rechterbaan
// waar de taxi echt rijdt) en zakt zo nodig terug naar een lichtere spline of de wegpunten zelf. Zonder THREE en zonder wereld:
// `binnen(x, y)` is de vraag "ligt hier een gebouw?" (routing.js insideBuilding), zodat scripts/ridepath_test.mjs het narekent.

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Dezelfde spline als cinedrive.smoothPath, met `mix`: 1 is de spline, 0 de rechte wegpunten (met alleen de dichte stappen).
export function maakPad(pts, step = 1, mix = 1) {
  const P = pts.map((p) => [p[0], p[1]]);
  const n = P.length;
  const dense = [P[0]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const k = Math.max(1, Math.ceil(dist(p1, p2) / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (cc - a) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (3 * b - a - 3 * cc + d) * t3);
      dense.push([lerp(lerp(p1[0], p2[0], t), c(p0[0], p1[0], p2[0], p3[0]), mix), lerp(lerp(p1[1], p2[1], t), c(p0[1], p1[1], p2[1], p3[1]), mix)]);
    }
  }
  const m = dense.length;
  const cum = new Float64Array(m);
  const ang = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + dist(dense[i], dense[i - 1]);
  for (let i = 0; i < m; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(m - 1, i + 1)];
    ang[i] = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  const len = cum[m - 1];
  return {
    len, dense,
    at(s) {
      s = Math.max(0, Math.min(len - 1e-3, s));
      let lo = 0, hi = m - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const t = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
      let da = ang[hi] - ang[lo];
      da = Math.atan2(Math.sin(da), Math.cos(da));
      return { x: lerp(dense[lo][0], dense[hi][0], t), y: lerp(dense[lo][1], dense[hi][1], t), a: ang[lo] + da * t };
    },
  };
}

// De rechterbaan van de taxi (zoals ritpad.rechterBaan): rechts is (-sin a, cos a).
const rechts = (q, afstand) => ({ x: q.x - Math.sin(q.a) * afstand, y: q.y + Math.cos(q.a) * afstand });

// Hoeveel punten van het pad (om de `stap` meter, op de rechterbaan) liggen in een gebouw?
const RIT_BEREIK_M = 450; // alleen het echte begin en einde worden gereden (ritpad.RIT.openS en sluitS, 9 s); het midden is een tijdsprong
export function schendingen(pad, binnen, { baan = 1.3, stap = 1.5, bereik = RIT_BEREIK_M } = {}) {
  let n = 0;
  for (let s = 0; s <= pad.len; s += stap) {
    if (pad.len > 2 * bereik && s > bereik && s < pad.len - bereik) { s = pad.len - bereik - stap; continue; }
    const q = pad.at(s), r = rechts(q, baan);
    if (binnen(q.x, q.y) || binnen(r.x, r.y)) n++;
  }
  return n;
}

// Is een punt van de route zelf de plek van de speler of de bestemming (de aansluitstukken)? Dat zijn de stukken die in een
// gebouw kunnen eindigen; de taxi rijdt alleen over de weg ertussen.
const isPunt = (p, q) => !!q && Number.isFinite(q.x) && Number.isFinite(q.y) && Math.hypot(p[0] - q.x, p[1] - q.y) < 0.6;

// pts: de autoroute, start en doel: { x, y } of null, binnen: (x, y) => ligt hier een gebouw.
// -> { pad, begin, eind, schendingen, mix, bijgesneden }: pad is { len, at(s) } voor cineDrive; begin en eind zeggen of de plek van de
// speler of het doel in een gebouw lag (dan start en stopt de taxi aan de straatkant); mix is hoeveel spline er over is (1 = alles).
export function ritRoute(pts, { start = null, doel = null, binnen = () => false } = {}) {
  let P = (pts || []).filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const uit = { begin: false, eind: false, bijgesneden: 0 };
  if (P.length > 2 && isPunt(P[0], start)) { uit.begin = binnen(P[0][0], P[0][1]); if (dist(P[0], P[1]) > 0.5) { P = P.slice(1); uit.bijgesneden++; } }
  if (P.length > 2 && isPunt(P[P.length - 1], doel)) { uit.eind = binnen(P[P.length - 1][0], P[P.length - 1][1]); if (dist(P[P.length - 1], P[P.length - 2]) > 0.5) { P = P.slice(0, -1); uit.bijgesneden++; } }
  // de hoeken ronder dan de wegpunten, zolang dat geen gebouw raakt: eerst de hele spline, dan lichter, dan de wegpunten zelf
  let beste = null;
  for (const mix of [1, 0.6, 0.3, 0]) {
    const pad = maakPad(P, 1, mix), s = schendingen(pad, binnen);
    if (!beste || s < beste.schendingen) beste = { pad, schendingen: s, mix };
    if (s === 0) break;
  }
  return { ...beste, ...uit };
}
