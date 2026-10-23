// Waar je kunt hengelen (#412): het water onder of naast de speler en wat voor water het is. Elke plek in de provincie waar je
// aan de kant staat of op het water vaart is een hengelplek; het watertype (visdata.js) bepaalt welke vis er zit. Pure regels
// op de waterpolygonen van de wereld (map.waterNear, waterlevels.js), geen DOM, geen THREE: scripts/vis_test.mjs.
//
// Een waterpolygoon heeft kind ('kanaal', 'diep', 'vaart', 'vijver', 'meer', 'zee', 'sloot') en soms een naam. Het type volgt
// eerst de naam (de Dollard is de Dollard), dan de soort polygoon en de breedte.
import { waterPolyAt, polyArea, meanWidth } from './waterlevels.js';
import { watertype } from './visdata.js';

export const HENGEL_REIK = 3.2;           // m: zo dichtbij de waterkant moet je staan
export const MEER_MIN_OPPERVLAK = 250000; // m2: een plas groter dan dit is een meer
export const GRACHT_MAX_BREEDTE = 15;       // m: een kanaalstrook smaller dan dit is een stadsgracht
export const PLAS_MAX_OPPERVLAK = 4e6;     // m2: een vijver of plas die groter is dan dit is ook een meer

const RE_WAD = /waddenzee|noordzee|dollard|eems(?!kanaal)|\bwad\b|lauwerszee|\bzee\b|wantij|geul\b|\bwatt/i;
const RE_MEER = /lauwersmeer|zuidlaardermeer|paterswoldsemeer|leekstermeer|schildmeer|oldambtmeer|\bmeer\b|dollardmeer|kardingerplas/i;
const RE_PLAS = /plas\b|vijver|kolk\b|poel\b|zwemwater|recreatieplas|waterpartij|\bput\b|\bplas /i;
const RE_RIVIER = /reitdiep|hunze|\baa\b|\bee\b|\bae\b|rivier|beek\b|\bzijl\b|spaarbekken|kleine aa|drentse aa|oude diep|\bdiep\b(?!ering)/i;
const RE_KANAAL = /kanaal|vaart(?!uig)|boterdiep|winschoterdiep|starkenborgh|hunsingo/i;
const RE_SLOOT = /sloot|greppel|wetering|tocht\b|leidijk|spui|droogmakerij|wijk\b/i;
const RE_GRACHT = /gra[cf]t|singel|haven|diepenring|kade\b|binnenstad/i;

// Het watertype van een polygoon ({ kind, name, pts }); `naam` laat de naam van het water zelf overschrijven (de naam van een
// buurpolygoon van hetzelfde water, zie naamVan). Een polygoon zonder naam gaat op soort en breedte; de stadsgrachten staan in de
// kaart als smalle 'kanaal'-stroken (Turfsingel, Schuitendiep), de echte vaarten als 'vaart' of brede 'kanaal'-polygonen.
const RE_DIEP = /diep$/i;
export function typeVanWater(poly, naamOverride = null) {
  if (!poly) return null;
  const naam = naamOverride || poly.name || '';
  const kind = poly.kind || 'diep';
  const oppervlak = poly.pts ? polyArea(poly.pts) : 0;
  const breed = poly.pts ? meanWidth(poly) : 8;
  if (kind === 'zee' || RE_WAD.test(naam)) return 'wad';
  if (RE_MEER.test(naam)) return oppervlak > 0 && oppervlak < MEER_MIN_OPPERVLAK / 2 ? 'plas' : 'meer';
  if (kind === 'meer') return oppervlak > 0 && oppervlak < MEER_MIN_OPPERVLAK / 5 ? 'plas' : 'meer';
  if (RE_SLOOT.test(naam) || kind === 'sloot') return 'sloot';
  if (RE_PLAS.test(naam)) return oppervlak > PLAS_MAX_OPPERVLAK ? 'meer' : 'plas';
  if (RE_GRACHT.test(naam)) return 'gracht';
  if (RE_RIVIER.test(naam)) return 'rivier';
  if (RE_KANAAL.test(naam)) return 'kanaal';
  // een naam op -diep (Schuitendiep, Zuiderdiep): in de stad smal, daarbuiten breed
  if (RE_DIEP.test(naam)) return breed < GRACHT_MAX_BREEDTE ? 'gracht' : 'kanaal';
  // geen naam die iets zegt: de soort polygoon
  if (kind === 'vijver') return oppervlak > PLAS_MAX_OPPERVLAK ? 'meer' : 'plas';
  if (kind === 'vaart') return 'kanaal';
  if (kind === 'kanaal') return breed < GRACHT_MAX_BREEDTE ? 'gracht' : 'kanaal';
  if (kind === 'diep') return breed >= 12 && oppervlak > 2e4 ? 'kanaal' : 'gracht';
  return 'plas';
}

// De naam van het water bij een polygoon: zijn eigen naam, anders die van de dichtstbijzijnde benoemde polygoon van hetzelfde water
// (poly.body, de samenhangende waterlichamen van de bouw): een naamloze strook van het Reitdiep is dan toch het Reitdiep.
const NAAM_REIK = 400;
const NAAM_BUUR = 60;   // m tussen de vakken van twee polygonen van dezelfde soort
const boxGap = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));
export function naamVan(map, poly, x, y) {
  if (poly.name && poly.name !== 'Zee') return poly.name;
  if (poly._hengelNaam) return poly._hengelNaam;
  if (!map || !map.waterNear) return null;
  let naam = null, bd = Infinity;
  for (const q of map.waterNear(x, y, NAAM_REIK)) {
    if (q === poly || !q.name || q.name === 'Zee' || !q.bounds) continue;
    const gelijk = poly.body >= 0 && q.body === poly.body;
    // zonder gemeenschappelijk waterlichaam (de provinciegegevens kennen er niet overal een): een benoemde polygoon van dezelfde soort ernaast
    if (!gelijk && !(q.kind === poly.kind && boxGap(q.bounds, poly.bounds || q.bounds) <= NAAM_BUUR)) continue;
    const d = Math.hypot((q.bounds[0] + q.bounds[2]) / 2 - x, (q.bounds[1] + q.bounds[3]) / 2 - y) + (gelijk ? 0 : 1000);
    if (d < bd) { bd = d; naam = q.name; }
  }
  if (naam) poly._hengelNaam = naam;
  return naam;
}

// Een korte sleutel voor de plek in het visboek: de naam van het water, of een vak van 300 m voor water zonder naam.
export function plekSleutel(type, naam, x, y) {
  if (naam) return `${type}:${String(naam).slice(0, 60)}`;
  return `${type}:${Math.round((x || 0) / 300)}_${Math.round((y || 0) / 300)}`;
}

// Hoe de plek heet voor de speler: "Zuidlaardermeer" of, zonder naam, "de sloot".
export function plekNaam(type, naam) {
  if (naam) return naam;
  const t = watertype(type);
  return t ? t.uit : 'het water';
}

// Dichtstbijzijnde punt van de rand van een polygoon bij (x, y): { x, y, d }.
function randPunt(P, x, y) {
  let best = { x: P[0][0], y: P[0][1], d: Infinity };
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1], dx = P[i][0] - ax, dy = P[i][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { x: px, y: py, d };
  }
  return best;
}

// Het water waar de speler kan hengelen: op het water (een boot, of zwemmend) is dat de polygoon onder hem; aan de kant de
// dichtstbijzijnde polygoon met een rand binnen `reik` m. Geeft null op droog land of in een tunnel.
//   { poly, type, naam, plek, x, y (het punt aan het water), afstand, opWater }
export function vindHengelplek(map, x, y, { opWater = false, reik = HENGEL_REIK } = {}) {
  if (!map || !map.waterNear) return null;
  let poly = waterPolyAt(map, x, y);
  if (poly) {
    const naam = naamVan(map, poly, x, y);
    const type = typeVanWater(poly, naam);
    return { poly, type, naam: naam || null, plek: plekSleutel(type, naam, x, y), x, y, afstand: 0, opWater: true };
  }
  if (opWater) return null;
  let best = null;
  for (const w of map.waterNear(x, y, reik + 1)) {
    if (!w.pts || w.pts.length < 3) continue;
    const b = w.bounds;
    if (b && (x < b[0] - reik || x > b[2] + reik || y < b[1] - reik || y > b[3] + reik)) continue;
    const r = randPunt(w.pts, x, y);
    if (r.d <= reik && (!best || r.d < best.afstand)) best = { poly: w, x: r.x, y: r.y, afstand: r.d };
  }
  if (!best) return null;
  const naam = naamVan(map, best.poly, best.x, best.y);
  const type = typeVanWater(best.poly, naam);
  return { poly: best.poly, type, naam: naam || null, plek: plekSleutel(type, naam, best.x, best.y), x: best.x, y: best.y, afstand: best.afstand, opWater: false };
}
