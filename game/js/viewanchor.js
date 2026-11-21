// De kijkanker (#1141): wat de minimap, de grote kaart en de kompasboog als "jij" tekenen.
// In sommige missies bestuur je iets anders dan Tammo of Tessa (een duif, een heli, een trein, een boot).
// De kaarten lazen toen elk hun eigen veld (player.angle, world.camYaw, world.pigeonMode); één plek beslist nu:
//   voorrang: duif > trein > voertuig (heli, vliegtuig, boot, fiets, auto, ...) > te voet.
// Puur: alleen leesbare velden van de wereld, geen DOM, geen three. docs/KAART-HEADING-21-11.md heeft de tabel.
//
// getViewAnchor(world, { pigeon, body }) (pigeon = getPigeonFlight(), body = hoofdspeler(world)) geeft { x, y, z, heading, upYaw, kind, camera } of null zonder lichaam:
//   heading  de kijk- of rijrichting van de bestuurde entiteit (rad, wereldhoek zoals player.angle): de driehoek wijst hierheen
//   upYaw    de hoek die op de minimap naar boven staat als de kaart meedraait (zie mapUpRotation)
//   kind     'voet' | 'zwemmen' | 'duif' | 'heli' | 'vliegtuig' | 'boot' | 'fiets' | 'paard' | 'auto' | 'trein'
//   camera   true als een scene of fotocamera het beeld heeft (world.cameraOverride): de camerahoek zegt dan niets over jou
import { hoofdspeler } from './players.js';

import { hoofdspeler } from './spelersregister.js';

const TAU = Math.PI * 2;
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const num = (n, d = 0) => (fin(n) ? n : d);
export const wrapAngle = (a) => (fin(a) ? a - Math.round(a / TAU) * TAU : 0);

// Wat voor ding is dit voertuig? (zelfde vlaggen als roadaccess.js travelModeOf)
export function vehicleKind(v) {
  if (!v) return 'voet';
  if (v.isHeli) return 'heli';
  if (v.isPlane) return 'vliegtuig';
  if (v.isBoat) return 'boot';
  if (v._mount === 'horse') return 'paard';
  if (v.isBike || v.isScooter || v._mount) return 'fiets';
  return 'auto';
}

// Soorten waarvan de camera een volgcamera is die achterloopt of een eigen stand kiest (filmstanden): daar telt de rijrichting.
const HEADING_UP = new Set(['duif', 'heli', 'vliegtuig', 'trein']);

export function getViewAnchor(world, opts = {}) {
  const body = opts.body || (world && hoofdspeler(world));
  if (!body) return null;
  const camera = !!world.cameraOverride;
  const camYaw = fin(world.camYaw) ? world.camYaw : null;
  const v = body.inVehicle && typeof body.inVehicle === 'object' ? body.inVehicle : null;
  let kind = 'voet', x = body.x, y = body.y, z = body.z, heading = body.angle;

  if (world.pigeonMode) {
    kind = 'duif';
    const f = opts.pigeon;
    // in de intro staat de duif nog bij Tammo: dan is het lichaam de plek (pigeonmode.js zet het lichaam daarna op de duif)
    if (f && !f.intro && fin(f.x) && fin(f.y)) { x = f.x; y = f.y; z = f.z; heading = f.yaw; }
  } else if (world.trainDriving || world.trainCam) {
    kind = 'trein';
    const cam = world.trainCam;
    // rondlopen in de wagon (trainWalk): het lichaam kijkt zelf; in de cabine en als passagier is de wagenhoek de richting
    if (!world.trainWalk && cam && fin(cam.angle)) heading = cam.angle;
  } else if (v) {
    kind = vehicleKind(v);
    x = fin(v.x) ? v.x : x; y = fin(v.y) ? v.y : y; z = fin(v.z) ? v.z : z; heading = fin(v.angle) ? v.angle : heading;
  } else if (body.swimming || body.water) kind = 'zwemmen';

  x = num(x); y = num(y); z = num(z); heading = wrapAngle(num(heading));
  // de kaart draait met de camera, behalve als die camera niet van jou is of een volgcamera is die achterloopt
  const upYaw = camera || HEADING_UP.has(kind) || camYaw == null ? heading : camYaw;
  return { x, y, z, heading, upYaw, kind, camera };
}

// Hoek waarmee de minimap draait (rad): 0 = noord boven, anders wijst upYaw omhoog (schermhoek -90 graden).
export function mapUpRotation(anchor, northUp) {
  if (northUp || !anchor || !fin(anchor.upYaw)) return 0;
  return -Math.PI / 2 - anchor.upYaw;
}

// Zachte overgang van de richting bij in- of uitstappen: na een wissel van soort draait de driehoek het korte eind om
// (ca. 0,4 s) in plaats van te springen. Verder geeft hij het anker ongewijzigd terug, zodat de driehoek niet achterloopt.
// state = { heading: null, kind: null, t: 0 }; nooit NaN; een ongeldige stand of de eerste aanroep is meteen goed.
export function easeAnchor(state, anchor, dt, { rate = 12, hold = 0.4 } = {}) {
  if (!anchor) { state.heading = null; state.kind = null; return anchor; }
  if (!fin(state.heading) || state.kind == null) { state.heading = anchor.heading; state.kind = anchor.kind; state.t = 0; return anchor; }
  if (state.kind !== anchor.kind) { state.kind = anchor.kind; state.t = hold; }
  if (!(state.t > 0)) { state.heading = anchor.heading; return anchor; }
  const d = Math.max(0, Math.min(0.25, num(dt)));
  state.t -= d;
  const k = 1 - Math.exp(-d * rate);
  state.heading = wrapAngle(state.heading + wrapAngle(anchor.heading - state.heading) * k);
  return { ...anchor, heading: state.heading };
}
