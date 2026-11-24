// Pop-in regels (#1016). Puur: geen three.js, geen DOM, zodat scripts/popinrules_test.mjs elke regel zonder
// browser kan keuren.
//
// Het probleem: de tekenstraal van bomen, auto's en andere props eindigt waar de mist nog (bijna) niets
// verbergt (mistbegin ~135 m, mistein 357 m bij zichtafstand "normaal"; bij "ver" is er op 190 m geen mist).
// Een harde rand in de afstand is dan een zichtbare ring waarbinnen dingen plots verschijnen. Twee regels:
//  1. De LAADstraal ligt voorbij de TEKENstraal (marge >= de stap waarmee de lijst wordt herbouwd), zodat alles
//     wat zichtbaar mag zijn er al is voordat het zichtbaar wordt.
//  2. De zichtbaarheid loopt in een korte band af (dither, geen alpha): een ding komt binnen de band
//     geleidelijk in beeld in plaats van in één frame.

// 0 binnen de band-start, 1 voorbij het eind; ertussen lineair (de shader gebruikt dezelfde formule).
export function edgeFadeAmount(d, start, end) {
  if (!(end > start)) return d >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (d - start) / (end - start)));
}

// Hoeveel van de pixels van een ding op afstand d blijft staan: 1 = alles, 0 = niets.
// 24-11: steil in het midden van de band (EDGE_STEEP x zo steil), zodat een ding niet lang als een raster van losse pixels staat
export const EDGE_STEEP = 3;
export function edgeFadeKeep(d, start, end) {
  return Math.min(1, Math.max(0, (1 - edgeFadeAmount(d, start, end) - 0.5) * EDGE_STEEP + 0.5));
}

// De 4x4-Bayermatrix, term voor term de pedBayer2/pedBayer4 uit scene3d.js en edgefade3d.js: waarde in [0, 1).
const bayer2 = (x, y) => { const fx = Math.floor(x), fy = Math.floor(y), v = fx * 0.5 + fy * fy * 0.75; return v - Math.floor(v); };
export function bayer4(x, y) { return bayer2(0.5 * x, 0.5 * y) * 0.25 + bayer2(x, y); }

// Een ding op afstand d blijft getekend als de Bayerwaarde onder de behoudfractie ligt (de shader doet discard anders).
export function ditherKept(d, start, end, x, y) {
  return bayer4(x, y) < edgeFadeKeep(d, start, end);
}

// De straal waarin de lijst van bomen (en andere props) wordt opgebouwd: de tekenstraal plus een marge die
// minstens de herbouwstap (treesync.js maxM) dekt, zodat tussen twee herbouwingen niets zichtbaars ontbreekt.
export const REBUILD_STEP_M = 8;
export function loadRadius(drawR, step = REBUILD_STEP_M, extra = 0) {
  return drawR + Math.max(0, step) + Math.max(0, extra);
}

// De band waarin iets uitdooft, in afstand van de camera. De camera staat tot `camBack` m achter het
// aandachtspunt (volgcamera), dus de band begint zoveel eerder: een boom op de tekenstraal van het
// aandachtspunt is voor de camera tot camBack m verder weg en is dan al helemaal weg.
export function fadeBand(drawR, width = 12, camBack = 4) {
  const end = drawR - camBack;
  return [end - width, end];
}

// Dekt de laadstraal alles wat zichtbaar kan zijn? Zichtbaar = camera-afstand < band-eind; het aandachtspunt staat
// hooguit camBack achter de camera en is sinds de laatste herbouw hooguit `step` m verder gekomen.
export function loadCoversView(drawR, step = REBUILD_STEP_M, camBack = 4, width = 12) {
  const [, end] = fadeBand(drawR, width, camBack);
  return loadRadius(drawR, step) >= end + camBack;
}
