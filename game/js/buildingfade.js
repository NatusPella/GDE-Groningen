// De dither-overgang tussen een detailgebouw en zijn kopie in de verre laag (23-11, centraal LOD-systeem). Puur: de regel in JS (voor
// scripts/buildingfade_test.mjs) en dezelfde regel als GLSL-stukken (voor farlod.js en scene3d.js), uit één bron.
//
// Beide lagen rekenen met HETZELFDE middelpunt per gebouw (het midden van b.bounds: in de verre laag het attribuut lodCenter, in de
// detailmeshes het attribuut lodC) en dezelfde uniforms (uLodPlayer, uLodDetailR, uLodBand van farlod.js). In de band van uLodBand meter
// binnen de detailring loopt t van 0 naar 1: het detailgebouw houdt de pixels met bayer < 1 - t, de verre kopie die met bayer >= 1 - t.
// Elke pixel komt dus van precies één laag: geen gat en geen dubbel. Hysterese zit in de ring zelf (lodstable.js createRingSmoother).
// Een gebouw in de ring zonder eigen mesh (uLodKeep) houdt zijn volle verre kopie (t = 1); een detailmesh buiten de ring (t = 1) tekent
// niets meer, zodat er nooit twee volle lagen over elkaar staan.

export const BUILDING_FADE_BAND = 12; // m

// Temporele stabiliteit (24-11, beeldregressie 'stad'): de band staat alleen open terwijl het middelpunt beweegt (vanaf BAND_MOVE_SPEED m/s).
// Stilstaand krimpt hij in BAND_SETTLE_S naar 0 (de harde wissel op de ring): een gebouw in de band dooft dan in de tijd uit naar zijn
// detail, in plaats van blijvend half detail en half verre kopie te zijn. Bij beweging groeit hij net zo snel terug.
export const BAND_MOVE_SPEED = 1.5;
export const BAND_SETTLE_S = 0.8;
export function fadeBandStep(cur, want, speed, dt) {
  const target = want > 0 && speed >= BAND_MOVE_SPEED ? want : 0;
  const step = (BUILDING_FADE_BAND / BAND_SETTLE_S) * Math.max(0, Math.min(0.25, dt || 0));
  const c = Number.isFinite(cur) ? Math.min(cur, Math.max(want, 0)) : 0;
  return c < target ? Math.min(target, c + step) : Math.max(target, c - step);
}

// t (0: alleen detail, 1: alleen de verre kopie) voor een gebouw op `dist` m van de speler, ring R, band B.
export function buildingFadeT(dist, R, B = BUILDING_FADE_BAND) {
  if (!(B > 0)) return dist > R ? 1 : 0;
  return Math.min(1, Math.max(0, (dist - (R - B)) / B));
}
// Bayer 4x4 zoals in de shaders (edgefade3d.js, lod3d.js): 16 drempels, elk in het MIDDEN van zijn zestiende (1/32 tot 31/32). 24-11
// (beeldregressie 'stad'): met drempels 0 tot 15/16 viel de pixel met drempel 0 weg zodra een varying die overal 1,0 is door de
// interpolatie 0,9999999 werd: één gat per 4x4 pixels in elk ver gebouw (witte spikkels). Met de halve stap marge kan dat niet meer.
const BAYER_HALF_STEP = 1 / 32;
export function bayer4(x, y) {
  const b2 = (ax, ay) => { ax = Math.floor(ax); ay = Math.floor(ay); const v = ax * 0.5 + ay * ay * 0.75; return v - Math.floor(v); };
  return b2(0.5 * x, 0.5 * y) * 0.25 + b2(x, y) + BAYER_HALF_STEP;
}
// het detailgebouw (alleen als het er is: de CPU zet het in de scène tot de ring); zonder band tekent het vol
export const detailShows = (bayer, t, B = BUILDING_FADE_BAND) => !(B > 0 && t > 0 && bayer >= 1 - t);
// de verre kopie: binnen de ring zonder keep alleen in de band (daarbinnen ingeklapt), met het aanvullende patroon
export function farShows(bayer, dist, R, B = BUILDING_FADE_BAND, keep = false) {
  if (dist > R || keep) return true;
  if (!(B > 0) || dist <= R - B) return false;
  const t = buildingFadeT(dist, R, B);
  return !(t < 1 && bayer < 1 - t);
}

// --- GLSL ---------------------------------------------------------------------------------------------------------------------------
export const GLSL_BAYER = `float bfBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bfBayer4(vec2 a) { return bfBayer2(0.5 * a) * 0.25 + bfBayer2(a) + 0.03125; }`;
// detailmesh: vertex (na project_vertex) en fragment (begin van main)
export const GLSL_DETAIL_HEAD_VERT = `attribute vec2 lodC;
uniform vec2 uLodPlayer;
uniform float uLodDetailR;
uniform float uLodBand;
varying float vBldFade;`;
export const GLSL_DETAIL_VERT = `vBldFade = 0.0;
if (uLodBand > 0.0 && (lodC.x != 0.0 || lodC.y != 0.0)) vBldFade = clamp((distance(lodC, uLodPlayer) - (uLodDetailR - uLodBand)) / uLodBand, 0.0, 1.0);`;
export const GLSL_DETAIL_HEAD_FRAG = `varying float vBldFade;
${GLSL_BAYER}`;
export const GLSL_DETAIL_FRAG = `if (vBldFade > 0.0 && bfBayer4(gl_FragCoord.xy) >= 1.0 - vBldFade) discard;`;
// verre laag: vFarFade 1 = volle kopie; het inklappen binnen de band staat in farlod.js. uLodBand <= 0: geen overgang (geen verre laag,
// Laag en Hoog-kort, of ?perfoff=gebouwfade): de oude harde wissel op de ring
export const GLSL_FAR_FRAG = `if (vFarFade < 1.0 && bfBayer4(gl_FragCoord.xy) < 1.0 - vFarFade) discard;`;
