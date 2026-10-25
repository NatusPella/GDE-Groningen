// Regels voor de nacht (#195), puur en zonder imports: hoeveel ramen per
// gebouwsoort branden op welk uur, de schemering, de maanfase en hoeveel
// sterren een kwaliteitsprofiel tekent. scene3d.js voert dit alleen als
// uniforms in; er is geen werk per frame buiten een paar getallen.

// [uur, aandeel verlichte ramen]
export const LIT_CURVES = {
  wonen: [[0, 0.32], [1, 0.24], [3, 0.14], [5, 0.14], [6.5, 0.3], [8, 0.15], [17, 0.25], [19, 0.5], [22.5, 0.5], [24, 0.32]],
  winkel: [[0, 0.12], [1, 0.05], [6, 0.05], [8, 0.8], [18, 0.9], [21, 0.7], [22.5, 0.25], [24, 0.12]],
  kantoor: [[0, 0.04], [5, 0.03], [7, 0.4], [9, 0.75], [17, 0.7], [19, 0.3], [22, 0.12], [24, 0.04]],
  horeca: [[0, 0.7], [2, 0.5], [4, 0.1], [11, 0.2], [16, 0.6], [19, 0.95], [24, 0.7]],
};

function curveAt(curve, h) {
  const t = ((h % 24) + 24) % 24;
  for (let i = 1; i < curve.length; i++) {
    if (t <= curve[i][0]) {
      const [h0, v0] = curve[i - 1], [h1, v1] = curve[i];
      return v0 + (v1 - v0) * (t - h0) / (h1 - h0);
    }
  }
  return curve[curve.length - 1][1];
}

export function litFraction(soort, hour) {
  return curveAt(LIT_CURVES[soort] || LIT_CURVES.wonen, hour);
}

// Het gebouwtype van de wereld (OSM-labels) naar een soort ramen.
export function windowKind(type) {
  const t = String(type || '').toLowerCase();
  if (/shop|retail|commercial|supermarket|kiosk/.test(t)) return 'winkel';
  if (/office|university|college|school|hospital|government|public/.test(t)) return 'kantoor';
  if (/restaurant|cafe|bar|pub|hotel|fast_food/.test(t)) return 'horeca';
  return 'wonen';
}

// Schemering: 0 bij volle dag, 1 in de diepste nacht, zacht ertussen. De
// zonshoogte komt uit daynight.js; tussen 6 graden en -12 graden schemert het.
export function twilight(elevDeg) {
  const x = Math.min(1, Math.max(0, (6 - elevDeg) / 18));
  return x * x * (3 - 2 * x);
}

// Het emissieve vulsel van het bladerdak (#463). Dat vulsel houdt een kruin in
// de schemering en in de schaduw van een zwarte blob, maar het is het ene stuk
// boom dat de zon niet dimt: in de nacht bleven de kronen daardoor groen
// oplichten tussen de donkere straat. `night` is de nachtwaarde van de zon
// (nightFactor, 0..1): 1 = het vulsel blijft zoals het was (dag en schemering),
// 0 = geen eigen licht meer. De straatlampen gaan aan bij night > 0.5, dus dan
// is de gloed al weg.
export function foliageGlow(night) {
  const n = Math.min(1, Math.max(0, (Number(night) || 0) * 1.5));
  return 1 - n * n * (3 - 2 * n);
}

// Maanfase over de verzonnen kalenderdagen: 0 nieuw, 0.5 vol. Synodische maand.
const SYNODIC_DAYS = 29.53;
export function moonPhase(day, offset = 0.31) {
  const f = ((day / SYNODIC_DAYS + offset) % 1 + 1) % 1;
  return f;
}
export function moonLit(phase) {
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
}

// Sterren per kwaliteitsprofiel: aandeel van de vaste puntenwolk dat getekend wordt.
export const STAR_SHARE = { laag: 0.35, middel: 0.65, hoog: 1 };
export function starCount(level, total) {
  return Math.max(0, Math.round(total * (STAR_SHARE[level] ?? 1)));
}
