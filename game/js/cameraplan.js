// De vaste regels van de volgcam, los van three.js en van de DOM (#502).
// Waarom dit hier staat en niet in scene3d.js: de camerastand hing aan het
// schermformaat (innerWidth/innerHeight) via de verhouding, en in de praktijk
// werd de camera op een telefoon in landschap (800x360) onder de grond en in de
// bebouwing gemeld. Een test kan deze drie regels op elk formaat narekenen
// (scripts/camera_mobiel_test.mjs) zonder een WebGL-context.
//
// De camera zelf is een baan om de speler heen: de afstand en de hoogte komen
// uit de kijkhoek (followPitch) en de baandiameter (radius) in meters. Het
// scherm doet daar niet aan mee - alleen de projectie (aspect en de VERTICALE
// kijkhoek) verschilt per scherm. Zo staat de camera op elk formaat achter en
// boven de speler.

// Een camera die verder dan dit van zijn volgplek staat, is geen volgcam meer
// maar een achtergebleven stand (het laatste titelbeeld, een filmpje, de vorige
// partij). De grootste baan in het spel is de helikopter: 4,4 x 3,68 m x de
// instelbare camerafstand, dus ruim onder de 25 m; 30 m laat dus geen gewone
// volgbeweging sneuvelen, ook niet bij 60 m/s.
export const CAMERA_SNAP_GAP = 30;

const REFERENCE_ASPECT = 16 / 9;

// De schermverhouding voor de projectie, met een ondergrens: tijdens het
// draaien van een telefoon of het inklappen van de adresbalk meldt de browser
// even hoogte 0. W/x -> 0, x/0 -> oneindig, en een projectiematrix met een
// oneindige of NaN-verhouding zet alles buiten beeld: één beeld lang lijkt de
// stad dan leeg (precies wat op een telefoon in landschap gezien werd). In dat
// geval houden we de verhouding van het vorige beeld aan.
export function cameraAspect(width, height, previous = REFERENCE_ASPECT) {
  const keep = Number.isFinite(previous) && previous > 0 ? previous : REFERENCE_ASPECT;
  const w = Number(width), h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return keep;
  const aspect = w / h;
  return Number.isFinite(aspect) && aspect > 0 ? aspect : keep;
}

// De kijkhoek van de volgcam is de VERTICALE hoek: dat is wat
// THREE.PerspectiveCamera.fov betekent, en die hoort bij een breed beeld gelijk
// te blijven. De horizontale hoek volgt vanzelf uit de verhouding; hem hier
// omrekenen zou de camera bij 800x360 juist bol laten trekken en in portret
// inzoomen. Alleen een onbruikbare instelling wordt hier afgevangen.
export function cameraVerticalFov(preset) {
  const v = Number(preset);
  if (!Number.isFinite(v)) return 64;
  return Math.min(80, Math.max(40, v));
}

// De kijkhoek van de volgcam uit de muispositie: `fraction` is 0 bovenin het
// scherm (laag, bijna level) en 1 onderin (steil van boven). Zonder muis
// (telefoon, aanraakbesturing) is er geen fraction en geldt de vaste
// volgstand. Waarom dat niet als 0 doorgaat: de cursorpositie is een aantal
// pixels en wordt door de schermhoogte gedeeld, dus dezelfde pixel gaf op een
// scherm van 360 px hoog een heel andere hoek dan op 800 px - daar hing de
// hoogte van de camera aan de korte kant van het scherm (#502).
export const PITCH_MIN_DEG = 10;
export const PITCH_MAX_DEG = 52;
export const DEFAULT_PITCH = Math.atan2(5.2 - 1.3, 9); // 23,4 graden, de standaardvolgstand
export function pitchForMouse(fraction) {
  if (!Number.isFinite(fraction)) return DEFAULT_PITCH;
  const t = Math.min(1, Math.max(0, fraction));
  return (PITCH_MIN_DEG + (PITCH_MAX_DEG - PITCH_MIN_DEG) * t) * Math.PI / 180;
}

// De volgplek: achter de speler (angle is de kijkrichting waar de camera
// achter hangt) en `sin(pitch) * radius` erboven, om het punt `eye` heen.
// x/y zijn wereldcoördinaten op de kaart, eye is de hoogte van het gevolgde
// punt in meters; het resultaat is { x, y: hoogte, z } net als de THREE-vector
// waarin scene3d.js de camera zet.
export function followCameraPose({ x = 0, y = 0, eye = 1.3, angle = 0, pitch = 0, radius = 0 } = {}) {
  const horiz = Math.cos(pitch) * radius;
  return { x: x - Math.cos(angle) * horiz, y: eye + Math.sin(pitch) * radius, z: y - Math.sin(angle) * horiz };
}

// Staat de camera niet meer op een volgplek (eerste beeld van een partij, na
// een filmpje of de titel, een sprong over de kaart), dan hoort hij meteen
// goed te staan in plaats van er in een seconde heen te glijden: op die weg
// komt hij namelijk over de lege kaart (onder het maaiveld) en dwars door de
// bebouwing. Vandaar een harde snee op afstand, niet alleen op een sprong van
// de speler.
export function cameraSnapNeeded(cam, pose, maxGap = CAMERA_SNAP_GAP) {
  if (!cam || !pose) return true;
  if (![cam.x, cam.y, cam.z, pose.x, pose.y, pose.z].every((v) => Number.isFinite(v))) return true;
  return Math.hypot(pose.x - cam.x, pose.y - cam.y, pose.z - cam.z) > maxGap;
}
