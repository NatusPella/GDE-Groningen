// Soepele wegdekovergangen (issue #189). Pure kant, zonder THREE: waar twee
// wegen met een ander dek (asfalt, klinkers, fietspad, grind) op één knoop
// samenkomen, krijgt het einde van elke weg een korte menging naar het dek van
// de buur: een kleurfactor per kanaal die over BLEND_LEN meter (plus de
// kruispuntzone) naar 1 loopt. roadsurface.js schrijft de factor als
// vertexattribuut (aBlendA / aBlendB) en de wegshader past hem toe; de audit
// (scripts/world/surface_blend_audit.mjs) en de test gebruiken dezelfde plannen.

export const BLEND_LEN = 5;
const MIN_DELTA = 0.015;

const hex = (c) => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
const toLin = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
export const linearOf = (c) => hex(c).map(toLin);
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// De factor waarmee een weg met kleur `own` aan het knooppunt naar het midden
// tussen `own` en `other` wordt gemengd: de buur doet hetzelfde, zodat beide
// op de knoop dezelfde kleur hebben (niet verwisseld).
// Loopt de buur zelf door over de knoop (t-aansluiting), dan gaat dit einde helemaal naar zijn kleur.
export function tintToward(own, other, full = false) {
  return own.map((v, i) => Math.min(2.8, Math.max(0.35, (full ? other[i] : (v + other[i]) / 2) / Math.max(v, 1e-3))));
}

// Is er een zichtbare kleursprong tussen twee linear-kleuren (relatief verschil in helderheid of tint)?
export function colourJump(a, b) {
  const la = lum(a), lb = lum(b);
  const rel = Math.abs(la - lb) / Math.max(la, lb, 1e-3);
  const hue = Math.max(...a.map((v, i) => Math.abs(v / Math.max(la, 1e-3) - b[i] / Math.max(lb, 1e-3))));
  return Math.max(rel, hue * 0.5);
}

// roads: wegen met pts en niveau; surfOf(r) -> { id, colour: [r,g,b] linear, rank };
// J(r, atStart) -> lengte van de kruispuntzone (m) aan dat einde (mag 0 zijn).
// Geeft Map<road, {a, b}> met per einde { tint: [r,g,b], len, from } of null.
export function planBlends(nodeIndex, nodeKey, roads, surfOf, J = () => 0, same = () => true) {
  const plan = new Map();
  for (const r of roads) {
    if (r.pts.length < 2) continue;
    const ends = [0, r.pts.length - 1].map((i) => {
      const mine = surfOf(r);
      if (!mine) return null;
      const list = nodeIndex.get(nodeKey(r.pts[i])) || [];
      // het dek van de buur met de hoogste rang wint op het kruispunt; daar loopt dit einde naartoe
      let best = null;
      for (let k = 0; k < list.length; k += 2) {
        const o = list[k], oi = list[k + 1];
        if (o === r || o.pts.length < 2 || !same(r, o)) continue;
        const s = surfOf(o);
        // (een buur met dezelfde kleur laat niets te mengen over, ook niet met een ander dek-id of andere klasse; hij mag een buur met een
        // andere kleur op dezelfde knoop niet verbergen: Atensheerd, twee rode klinkerwegen en een grijze)
        if (!s || colourJump(mine.colour, s.colour) < MIN_DELTA) continue;
        if (!best || s.rank > best.rank) best = { ...s, through: oi > 0 && oi < o.pts.length - 1 };
      }
      if (!best) return null;
      const tint = tintToward(mine.colour, best.colour, best.through);
      if (Math.max(...tint.map((v) => Math.abs(v - 1))) < MIN_DELTA) return null;
      return { tint, len: BLEND_LEN + J(r, i === 0), to: best.id };
    });
    if (ends[0] || ends[1]) plan.set(r, { a: ends[0], b: ends[1] });
  }
  return plan;
}

// De vertexattributen voor een weg: per hoekpunt de afstand langs de weg (al).
// aBlendA = (factor-1 rgb, lengte) aan het begin, aBlendB = (factor-1 rgb, wegtotaal) aan het einde;
// nul betekent geen menging, ook als een attribuut ontbreekt.
export function blendAttributes(pl, L) {
  const len = Math.max(pl.a ? pl.a.len : 0, pl.b ? pl.b.len : 0);
  const A = pl.a ? [pl.a.tint[0] - 1, pl.a.tint[1] - 1, pl.a.tint[2] - 1, len] : [0, 0, 0, len];
  const B = pl.b ? [pl.b.tint[0] - 1, pl.b.tint[1] - 1, pl.b.tint[2] - 1, L] : [0, 0, 0, L];
  return { A, B };
}

// Dezelfde formule als in de shader: de kleurfactor op afstand `al` langs de weg.
export function blendFactor(att, al) {
  const f = [1, 1, 1];
  const len = att.A[3];
  if (len > 0) {
    const t = smooth(0, len, al);
    for (let i = 0; i < 3; i++) f[i] *= 1 + att.A[i] * (1 - t);
    const t1 = smooth(0, len, att.B[3] - al);
    for (let i = 0; i < 3; i++) f[i] *= 1 + att.B[i] * (1 - t1);
  }
  return f;
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
