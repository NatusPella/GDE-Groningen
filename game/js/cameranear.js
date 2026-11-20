// Het near-vlak van de spelcamera (#917). De dieptebuffer is 24 bit: de kleinste diepteverschil dat hij nog ziet is op
// afstand d ongeveer d^2 / (near * 2^24). Bij near 0,5 m is dat op 250 m al 7,5 mm en op 500 m 30 mm, dus de nudge van
// 4 tot 8 mm per gebouw en de polygonOffset van daken en ramen vallen daar samen (flikkering of de verkeerde winnaar).
// Een groter near maakt die stap kleiner, maar knipt alles weg dat dichter bij de lens zit. Daarom groeit near alleen mee
// met de vrije ruimte onder de camera (een luchtbeeld, de helikopter, een hoge filmcamera) en blijft hij 0,5 m op de grond,
// in de eerste persoon, in voertuigen, binnen en in elke cutscene-camera: daar zit de lens vlak bij muren, dashboard en wapen
// (CAM_CLEARANCE 0,9 m in scene3d.js houdt de lens bij 0,5 al van muren af).
// Samen spelen: de camera is per speler lokaal; een gast stelt zijn eigen near in, zonder netwerkbericht.
export const NEAR_MIN = 0.5;
export const NEAR_MAX = 2.5;
export const NEAR_FIRST_PERSON = 0.08; // eerste persoon: ogen, handen, wapen, dashboard, kozijn en muur zitten tot ~0,1 m voor de lens (#1024)
export const CLEARANCE_FROM = 10; // onder deze vrije hoogte (m) blijft near 0,5
export const CLEARANCE_TO = 60; // vanaf deze vrije hoogte (m) is near NEAR_MAX
const NEAR_RISE_PER_S = 3; // near stijgt zacht (1 - e^(-3 dt)); hij zakt direct, want een te groot near knipt de omgeving weg

// De stap van de dieptebuffer (m) op afstand d bij een near, voor een buffer van `bits` bits (24 in het spel).
export function depthStep(d, near, bits = 24) { return (d * d) / (near * (2 ** bits - 1)); }

// Tot welke afstand (m) een verschil van `offset` meter nog boven de dieptestap uitkomt (daarachter flikkert of verliest het).
export function maxSafeDistance(offset, near, bits = 24) { return Math.sqrt(offset * near * (2 ** bits - 1)); }

const smooth = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

// Het near dat bij een vrije hoogte hoort (m boven het oppervlak onder de camera).
export function nearForClearance(clearance) {
  if (!(clearance > CLEARANCE_FROM)) return NEAR_MIN;
  return NEAR_MIN + (NEAR_MAX - NEAR_MIN) * smooth((clearance - CLEARANCE_FROM) / (CLEARANCE_TO - CLEARANCE_FROM));
}

// Doel-near voor dit beeld. `forced` is de testvlag ?near (null als hij niet staat). Eerste persoon, een scriptcamera
// (cameraOverride), een camera in een gebouw of een speler die zelf in een voertuig zit blijven op NEAR_MIN, ook hoog in de lucht
// behalve een vliegend voertuig (`flying`: de helikopter, waar de camera boven de stad hangt).
export function cameraNearTarget({ clearance = 0, forced = null, firstPerson = false, override = false, indoors = false, inVehicle = false, flying = false } = {}) {
  if (forced != null) return forced;
  if (firstPerson) return NEAR_FIRST_PERSON; // ook in een voertuig en in de helikopter: het interieur zit vlak voor de lens
  if (override || indoors) return NEAR_MIN;
  if (inVehicle && !flying) return NEAR_MIN;
  return nearForClearance(clearance);
}

// Eén stap: omhoog zacht, omlaag direct.
export function stepNear(cur, target, dt) {
  if (!(target > cur)) return target;
  return cur + (target - cur) * (1 - Math.exp(-NEAR_RISE_PER_S * Math.max(0, dt)));
}

// De waarde van ?near=<m> of ?far=<m>: een getal tussen min en max, anders null.
export function parseCameraFlag(v, min, max) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export const parseNearFlag = (v) => parseCameraFlag(v, 0.1, 10);
export const parseFarFlag = (v) => parseCameraFlag(v, 100, 20000);
