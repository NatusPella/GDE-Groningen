// Zachte overgangen voor weer en licht (#985): pure helpers zonder THREE, zodat scripts/weersmooth_test.mjs ze kan toetsen.
// De weermachine (weatherstate.js) laat regen, bewolking en mist al langzaam in- en uitlopen, maar een speler die een
// regiogrens oversteekt, een gast die de staat van de gastheer krijgt en een geforceerd weer sprongen wel in een
// keer. Alles hier is goedkoop (een paar vermenigvuldigingen per frame) en voegt geen shader, licht of pass toe.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Seconden waarmee bewolking en mist naar een nieuwe doelwaarde schuiven als de regio van de speler wisselt.
const COVER_EASE_S = 6;

// Schuif v naar target met een tijdconstante van `secs` seconden (exponentieel, onafhankelijk van de framerate).
export function easeTo(v, target, dt, secs = COVER_EASE_S) {
  if (!Number.isFinite(v)) return target;
  return v + (target - v) * (1 - Math.exp(-Math.max(0, dt) / secs));
}

// De regenstreepjes verschijnen niet met een klap: onder intensiteit 0,02 is de laag onzichtbaar, daarboven loopt de
// dekking in tot 0,16 in (was: een sprong naar 52 % van de volle dekking).
export function rainFade(t) {
  return smooth(0.02, 0.16, t);
}

// Een flits ver weg is zwakker: 1 op 250 m (de dichtstbijzijnde inslag) tot 0,4 op 3250 m.
export function flashGain(dist) {
  return 1 - 0.6 * clamp01(((Number(dist) || 250) - 250) / 3000);
}

// Wolkenlaag: een kommagetal aan wolken (4,0 .. 22,0) wordt `full` hele wolken en een deel `frac` van de volgende,
// zodat die laatste groeit in plaats van er ineens te hangen.
export function cloudFill(count, max = Infinity) {
  const c = Math.max(0, Math.min(max, Number(count) || 0));
  const full = Math.floor(c);
  return { full, frac: c - full };
}
