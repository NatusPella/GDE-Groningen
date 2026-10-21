// The pure side of the garage's vehicle pictures (#196, #170): which preview spec a
// garage entry (ownedvehicles.js getGarageCatalog) gets, how its card is styled
// (yours, for sale, locked, written off), and which card turns on a turntable.
// garageui.js draws, vehiclepreview.js renders; no DOM, no THREE.
// scripts/garagepics_test.mjs checks the register -> preview link.

// the still every card shows, and where the turntable starts: a three-quarter
// view from the front left (the model's nose points to its local -x)
export const GARAGE_3Q_ANGLE = Math.PI + 0.62;
// backing pixels of a card still (CSS about 200 x 104)
export const GARAGE_PIC_W = 384;
export const GARAGE_PIC_H = 200;
// the camera closer in than a viewer's, so a vehicle fills the wide card; a long
// one (a bus with its trailer) keeps more room
export const GARAGE_PIC_ZOOM = 0.8;
export function garagePicZoom(spec) {
  const m = (spec && spec.model) || {};
  const len = (m.len || 4) + (m.trailer || 0);
  return +(GARAGE_PIC_ZOOM * Math.min(1.45, Math.max(1, len / 7))).toFixed(3);
}
// the turntable on a card: radians per second, frames per second
export const TURN_SPEED = 0.9;
export const TURN_FPS = 30;

// The spec vehiclepreview.js builds a model from (the real vehicle builder,
// the stock spec's own model, colour and flags), or null without a model.
export function garagePreviewSpec(e) {
  if (!e || !e.spec || !e.spec.model) return null;
  return {
    kind: e.spec.kind,
    model: e.spec.model,
    color: e.color,
    nameIdx: e.spec.nameIdx || 0,
    flags: e.hero ? { isHeroCar: true } : e.spec.flags || null,
  };
}

// The stand-in vehicle object vehiclepreview.js hands the real model builder
// (models3d_vehicles.js buildVehicleMesh): the spec's model in the chosen paint.
export function previewVehicle(spec) {
  return {
    id: -1 - (spec.nameIdx || 0),
    model: { ...spec.model, color: spec.color },
    isBike: spec.kind === 'bike', isScooter: spec.kind === 'scooter', isBoat: spec.kind === 'boat', isHeli: spec.kind === 'heli',
    ...(spec.flags || {}),
    health: 100,
  };
}

// 'owned' | 'lost' | 'sale' | 'locked': the card's picture style
export function garageCardLook(e) {
  if (e.locked) return 'locked';
  if (!e.owned) return 'sale';
  return e.status === 'lost' ? 'lost' : 'owned';
}

// Which card turns: the one under the mouse or the one with keyboard or
// controller focus, whichever the player used last (`latest`: 'hover' or
// 'focus'); on a touch screen, where nothing hovers, the card that was
// tapped. "Beweging beperken" turns nothing.
export function turntableTarget({ hover = null, focus = null, selected = null, touch = false, reduced = false, latest = 'hover' } = {}) {
  if (reduced) return null;
  const first = latest === 'focus' ? focus || hover : hover || focus;
  return first || (touch ? selected : null) || null;
}

// The register entry (vehicleregister.js VOERTUIGEN) a spec's model belongs to, or ''.
export function registerNameOf(spec, voertuigen) {
  const n = spec && spec.model && spec.model.name;
  if (!n || !voertuigen[n]) return '';
  return n;
}
