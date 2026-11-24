// Eerste-persoon-glue (#833) tussen firstperson.js (de pure stand en meetkunde) en scene3d.js
// (de 3D-wereld): de stand per frame, het verbergen van het eigen figuur en het interieur, de
// camera zelf en de handen/wapens van het viewmodel (#943). Geen three.js-import: de camera
// wordt via cam.position gezet en het kijkdoel gaat in een object van de aanroeper. Alles met
// positionele argumenten en module-tijdelijke objecten, zodat een eerste-persoonframe niets
// alloceert. Zo blijft scene3d.js onder zijn omvangsgrens (#497).
import { initFirstPerson, syncFirstPerson, noteVehicleChange, addLookPitch, clampPitch, lookVector, firstPersonEye, useStanceEye, cabinEyeY, EYE_ABOVE_NECK } from './firstperson.js';
import { updateCarInterior, interiorRoofY, interiorCamPitch } from './carinterior.js';
import { syncFirstPersonHands, hideFirstPersonHands } from './firstpersonhands.js';
import { getSettings } from './settings.js';
import { normalizeAngle } from './util.js';

// Bits die fpSync per frame aan scene3d teruggeeft.
export const FP_VIEW = 1;    // de camera staat in eerste persoon
export const FP_HIDE = 2;    // het eigen figuur (en zijn schaduw) moet weg
export const FP_CUT = 4;     // harde snee: de volgcam opnieuw laten beginnen
export const FP_INCABIN = 8; // het detailinterieur staat aan (de bestuurder is dan al verborgen)
export const FP_TOGGLE = 16; // de schakelaar veranderde dit frame: volgcam recht vooruit

const FP_LOOK_DIST = 10;        // m vooruit: alleen de richting van het kijkdoel telt

let wasOn = false;         // stond de schakelaar vorige frame aan?
let shown = false;         // stond de camera vorige frame in eerste persoon?
let toggled = false;       // de schakelaar veranderde dit frame: recht vooruit beginnen
let justEntered = false;   // net aangezet: de verborgen boomkronen een keer vrijgeven
let wasInVehicle = false;  // zat de camera vorige frame in een voertuig?
let wasVehicleFp = false;  // #890: hetzelfde, maar voor de stand (los van fpCamera's kijkhoek)
let lookYaw = 0;           // hoofd op de voertuighoek; eerste persoon zet die nooit zelf terug
let interiorMesh = null;   // de auto waarvan het detailinterieur het laatst zichtbaar was
const _altEye = { x: 0, y: 0, z: 0 };
const _eyeWorld = { x: 0, y: 0, z: 0 };
const _dir = { x: 0, y: 0, z: 0 };

// Per frame, vóór de camera: de stand bijwerken (bewaarde instelling en de schakelaar in het
// pauzemenu), bepalen of de camera in eerste persoon staat, het eigen figuur verbergen en het
// interieur van de eigen auto aan- of uitzetten. hidePlayers: scene3d verbergt de spelers al
// (duif, menu, filmpje, trein); interiorCamera: de BINNENIN-filmcamera staat aan.
// Geeft de FP_*-bits terug; geen object per frame.
export function fpSync(world, player, pv, pvMesh, hidePlayers, interiorCamera) {
  const st = world.firstPersoon || initFirstPerson(world);
  if (syncFirstPerson(world)) st.pitch = 0;
  // #890: in- of uitstappen verandert de plek waar je bent, niet je camera. De stand blijft
  // de spelersvoorkeur (instelling firstPersoon) en begint alleen recht vooruit; eerst viel de
  // camera na het uitstappen terug achter het figuur.
  const vehicleChanged = !!pv !== wasVehicleFp;
  wasVehicleFp = !!pv;
  if (vehicleChanged) {
    // de stand blijft de voorkeur van de speler; alleen de blik begint opnieuw, recht vooruit
    noteVehicleChange(world);
    toggled = true;
    if (player && pv) lookYaw = 0;
    else if (player) world.camYaw = player.angle;
  }
  const view = !!st.on && !world.cameraOverride && !world.trainCam && !world.trainDriving && !world.cinematicHidePlayers;
  if (!!st.on !== wasOn) { wasOn = !!st.on; toggled = true; }
  let bits = 0;
  if (vehicleChanged) bits |= FP_CUT;
  if (view !== shown) {
    // uit in een voertuig: de volgcam begint weer recht achter de auto, net als toen de stand
    // nog in scene3d zat (de FP-tak hield world.camYaw daar op de voertuighoek)
    if (!view && shown && player && player.inVehicle) world.camYaw = player.inVehicle.angle;
    shown = view;
    justEntered = view;
    bits |= FP_CUT;
  }
  if (view) bits |= FP_VIEW;
  if (hidePlayers || view) bits |= FP_HIDE;
  if (toggled) {
    // recht vooruit beginnen; te voet draait het lichaam vanzelf mee met de kijkrichting
    toggled = false;
    bits |= FP_TOGGLE;
    st.pitch = 0;
    if (player && player.inVehicle) lookYaw = 0;
    else if (st.on && player) world.camYaw = player.angle;
  }
  // Het detailinterieur van de eigen auto (ook in eerste persoon), en weer wegzetten als je
  // uitstapt: het hangt aan de auto, niet aan de speler.
  const inCabin = !!pv && updateCarInterior(pvMesh, pv, view || !!interiorCamera);
  if (inCabin) interiorMesh = pvMesh;
  else if (interiorMesh) {
    const g = interiorMesh.userData.interior;
    if (g) g.visible = false;
    interiorMesh = null;
  }
  if (inCabin) bits |= FP_INCABIN;
  // de handen van het viewmodel (#943) horen alleen bij de eerste-persooncamera; zodra die uit
  // staat (menu, filmpje, trein, duif) mogen ze niet in beeld blijven hangen
  if (!view) hideFirstPersonHands();
  return bits;
}

// De eerste-persooncamera voor dit beeld: muisLOOK (yaw te voet world.camYaw, in een voertuig de
// voertuighoek plus een eigen lookYaw die niet vanzelf terugzwaait; pitch uit muis-dy met
// invertY), het oog van het eigen figuur (hoofdbot) of de terugval uit firstperson.js, en het
// kijkdoel in `out`. In een voertuig (#941) staat het oog in de carrosserie: op de zithoogte van
// het zittende figuur, maar altijd onder de binnenkant van het dak en mee met de vering van de
// body (#942). Zwemmend ligt de figuur plat, dus daar geldt de zwemstand. Geeft true terug als de
// camera net in eerste persoon kwam: de volgcam had dan kroontjes verborgen die weer vrij moeten.
export function fpCamera(world, cam, player, playerMesh, playerMeshPlaced, looking, lookK, lookBack, followPose, out, pvMesh, scene) {
  const mouse = world.input.mouse;
  const st = world.firstPersoon || initFirstPerson(world);
  if (looking) addLookPitch(world, mouse.dy * (world.scoped ? 0.3 : 1), lookK, getSettings().invertY);
  const pv = player.inVehicle;
  let camAngle;
  if (pv) {
    // instappen: recht vooruit kijken, niet de oude voetstand ten opzichte van de voertuighoek
    if (!wasInVehicle) lookYaw = 0;
    // in een helikopter draait de muis de heli zelf (heliflight.js)
    if (looking && mouse.dx !== 0 && !lookBack && !pv.isHeli) lookYaw = normalizeAngle(lookYaw + mouse.dx * lookK);
    camAngle = pv.angle + (lookBack ? Math.PI : lookYaw);
    world.camYaw = normalizeAngle(pv.angle + lookYaw);
  } else camAngle = world.camYaw;
  wasInVehicle = !!pv;
  // Het oog van het eigen figuur: de hoofdbot van de playerMesh (de stand van dit beeld), met de
  // spelerstand uit firstperson.js als het figuur er niet staat (fiets, scooter, instapanimatie).
  // Het figuur is verborgen, dus de camera kan in het hoofd staan. Zwemmend ligt het hele figuur
  // plat (swimTilt), dan is de nekbot geen ooghoogte meer (#941).
  const head = playerMeshPlaced && playerMesh && !useStanceEye(player) ? playerMesh.userData.head : null;
  if (head) {
    playerMesh.updateMatrixWorld(true);
    const m = head.matrixWorld.elements;
    _eyeWorld.x = m[12];
    _eyeWorld.y = m[13] + EYE_ABOVE_NECK;
    _eyeWorld.z = m[14];
    // In een voertuig het oog in de carrosserie zetten (#941/#942): de body is een kind van de
    // voertuiggreep. Het oog van het zittende figuur staat in de greep (placeSeated), dus eerst
    // terug naar voertuiglocale maten, daar onder de hemel klemmen, en dan met de wereldmatrix
    // van de body naar buiten. Zo beweegt de camera mee met de vering en staat hij nooit in de
    // dakbekleding.
    if (pv && pvMesh && pvMesh.userData) {
      pvMesh.updateWorldMatrix(true, false); // de greep van dit beeld, niet die van vorige frame
      const g = pvMesh.matrixWorld.elements;
      const dx = _eyeWorld.x - g[12], dy = _eyeWorld.y - g[13], dz = _eyeWorld.z - g[14];
      // de kolommen van de wereldmatrix zijn de lokale assen in de wereld; R^T keer de
      // verplaatsing geeft de lokale stand
      const lx = g[0] * dx + g[1] * dy + g[2] * dz;
      const ly = g[4] * dx + g[5] * dy + g[6] * dz;
      const lz = g[8] * dx + g[9] * dy + g[10] * dz;
      const wantY = cabinEyeY(ly, interiorRoofY(pv));
      const body = pvMesh.userData.body || pvMesh;
      body.updateWorldMatrix(false, false); // de ouders zijn hierboven al bijgewerkt
      const b = body.matrixWorld.elements;
      _eyeWorld.x = b[0] * lx + b[4] * wantY + b[8] * lz + b[12];
      _eyeWorld.y = b[1] * lx + b[5] * wantY + b[9] * lz + b[13];
      _eyeWorld.z = b[2] * lx + b[6] * wantY + b[10] * lz + b[14];
    }
    cam.position.set(_eyeWorld.x, _eyeWorld.y, _eyeWorld.z);
  } else {
    firstPersonEye(player, _altEye);
    cam.position.set(_altEye.x, _altEye.y, _altEye.z);
  }
  // in de auto kijkt de binnencamera per klasse iets omlaag (het stuur onderin beeld); de muis telt daarbij op
  lookVector(camAngle, clampPitch(st.pitch + (interiorMesh && player && player.inVehicle ? interiorCamPitch(player.inVehicle) : 0)), _dir);
  out.x = cam.position.x + _dir.x * FP_LOOK_DIST;
  out.y = cam.position.y + _dir.y * FP_LOOK_DIST;
  out.z = cam.position.z + _dir.z * FP_LOOK_DIST;
  followPose.position.x = cam.position.x; followPose.position.y = cam.position.z; followPose.position.z = cam.position.y;
  followPose.lookAt.x = out.x; followPose.lookAt.y = out.z; followPose.lookAt.z = out.y;
  followPose.at = performance.now();
  // Het viewmodel (#943): handen en wapen hangen aan de camera. Alleen hier, want dit is het
  // enige pad dat de eerste-persooncamera zet; fpSync haalt ze weg zodra de stand uit staat.
  syncFirstPersonHands(scene, cam, world, player);
  const entered = justEntered;
  justEntered = false;
  return entered;
}
