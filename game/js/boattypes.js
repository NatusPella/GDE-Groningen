// Boat types on Grunn's canals: driving specs (v.model, name stays 'boat' so
// every isBoat code path keeps working; `kind` picks the hull, the seats and
// the lights) plus the seat layout the 3D layer uses for skippers,
// passengers, the player and the companion.
//
// Seats are boat-local (+x = bow, +z = starboard, y = seat top above the
// waterline origin of the hull). face = three.js yaw of the sitter relative to the
// bow. pose: arms/legs spec for models3d_people.seatPose.

export const BOAT_KINDS = {
  sloep: { kind: 'sloep', name: 'boat', len: 5.5, wid: 2.0, playerTop: 11, playerAccel: 3.4, maxSpeed: 4.5, accel: 1.6, brake: 2.2, turnRate: 1.3, color: '#e8e6e0', cabin: '#2f3a44' },
  sloepGrijs: { kind: 'sloep', name: 'boat', len: 5.8, wid: 2.1, playerTop: 10.5, playerAccel: 3.2, maxSpeed: 4.3, accel: 1.5, brake: 2.0, turnRate: 1.2, color: '#c7c9cc', cabin: '#1c1c1c' },
  rondvaart: { kind: 'rondvaart', name: 'boat', len: 14, wid: 3.3, playerTop: 7.4, playerAccel: 1.7, maxSpeed: 3.6, accel: 0.9, brake: 1.4, turnRate: 0.75, color: '#1d3350', cabin: '#e8e6e0' },
  kano: { kind: 'kano', name: 'boat', len: 4.2, wid: 0.8, playerTop: 3.6, playerAccel: 1.6, maxSpeed: 2.6, accel: 1.3, brake: 1.8, turnRate: 1.5, color: '#c8502a' },
  kajak: { kind: 'kajak', name: 'boat', len: 3.6, wid: 0.66, playerTop: 4, playerAccel: 1.8, maxSpeed: 2.8, accel: 1.5, brake: 2.0, turnRate: 1.7, color: '#e0b020' },
  waterfiets: { kind: 'waterfiets', name: 'boat', len: 2.6, wid: 1.6, playerTop: 3.2, playerAccel: 1.3, maxSpeed: 2.0, accel: 1.0, brake: 1.6, turnRate: 1.3, color: '#f0eee8', cabin: '#2a8fb0' },
  rubberboot: { kind: 'rubberboot', name: 'boat', len: 3.4, wid: 1.6, playerTop: 16, playerAccel: 5, maxSpeed: 6, accel: 2.6, brake: 2.4, turnRate: 1.6, color: '#3c4044', cabin: '#d8572a' },
  dinghy: { kind: 'dinghy', name: 'boat', len: 2.8, wid: 1.25, playerTop: 8, playerAccel: 3, maxSpeed: 3.0, accel: 1.4, brake: 2.0, turnRate: 1.5, color: '#2f4a3a' },
  // stand-up paddle board, one paddler standing
  sup: { kind: 'sup', name: 'boat', len: 3.2, wid: 0.8, playerTop: 2.6, playerAccel: 1.1, maxSpeed: 1.9, accel: 0.8, brake: 1.4, turnRate: 1.2, color: '#2a8fb0' },
  supWit: { kind: 'sup', name: 'boat', len: 3.0, wid: 0.78, playerTop: 2.5, playerAccel: 1.1, maxSpeed: 1.8, accel: 0.8, brake: 1.4, turnRate: 1.2, color: '#f2f0ea' },
  // Frisian sailing barge (Jelle's): not in the ambient mix
  skutsje: { kind: 'skutsje', name: 'boat', sail: true, len: 15, wid: 3.6, maxSpeed: 7, accel: 0.9, brake: 1.3, turnRate: 0.8, color: '#1b1d1f', cabin: '#8a5a2c' },
};

// Ambient traffic mix (weights).
const TRAFFIC = [
  ['sloep', 20], ['sloepGrijs', 10], ['rondvaart', 9], ['kano', 13], ['kajak', 11],
  ['waterfiets', 12], ['rubberboot', 12], ['dinghy', 10], ['sup', 7], ['supWit', 5],
];
const TRAFFIC_TOTAL = TRAFFIC.reduce((s, [, w]) => s + w, 0);

export function pickBoatModel(rng = Math.random) {
  let r = rng() * TRAFFIC_TOTAL;
  for (const [k, w] of TRAFFIC) { r -= w; if (r <= 0) return BOAT_KINDS[k]; }
  return BOAT_KINDS.sloep;
}

export function boatKind(v) {
  return (v && v.model && v.model.kind) || 'sloep';
}

// Sloep variant with a closed wheelhouse (police boats always have one).
export function boatHasCabin(v) {
  if (boatKind(v) !== 'sloep') return false;
  if (v.isPolice) return true;
  const h = Math.sin((v.id || 0) * 127.1 + 5.3 * 311.7) * 43758.5453;
  return h - Math.floor(h) < 0.4;
}

const LEGS_BENCH = { footX: 0.44, footY: -0.28 };
const LEGS_FLOOR = { footX: 0.8, footY: -0.03 };

// [skipper, ...passengers]; the player drives from seat 0, the companion
// takes seat 1.
export function boatSeats(v) {
  const L = v.model.len, W = v.model.wid, hl = L / 2;
  switch (boatKind(v)) {
    case 'rondvaart': {
      const s = [{ x: -hl + 0.75, z: 0, y: 0.62, face: 0, pose: { recline: 0.05, ...LEGS_BENCH, arms: 'helm' } }];
      for (let x = hl - 2.1; x > -hl + 1.6; x -= 0.95) {
        for (const z of [-0.5, 0.5]) s.push({ x, z, y: 0.42, face: 0, pose: { recline: 0.08, ...LEGS_BENCH, arms: 'lap' } });
      }
      return s;
    }
    case 'skutsje':
      // skipper at the tiller, the rest on the hatch covers
      return [
        { x: -hl + 1.25, z: 0.35, y: 0.72, face: 0, pose: { recline: 0.05, ...LEGS_BENCH, arms: 'tiller' } },
        { x: -hl * 0.3, z: -0.5, y: 0.96, face: 0, pose: { recline: 0.1, ...LEGS_BENCH, arms: 'lap' } },
        { x: 0.3, z: 0.5, y: 0.96, face: 0, pose: { recline: 0.1, ...LEGS_BENCH, arms: 'lap' } },
        { x: -hl * 0.3, z: 0.5, y: 0.96, face: Math.PI / 2, pose: { recline: 0.06, ...LEGS_BENCH, arms: 'rail' } },
      ];
    case 'kano':
      return [
        { x: -hl * 0.58, z: 0, y: 0.18, face: 0, pose: { recline: -0.05, footX: 0.62, footY: -0.12, arms: 'paddle' } },
        { x: hl * 0.5, z: 0, y: 0.18, face: 0, pose: { recline: -0.05, footX: 0.6, footY: -0.12, arms: 'paddle' } },
      ];
    case 'sup':
      // the paddler stands mid-board; seat 1 sits cross-legged on the nose
      return [
        { x: -0.15, z: 0, y: 0.12, face: 0, stand: true, pose: { arms: 'sup' } },
        { x: 0.75, z: 0, y: 0.12, face: 0, pose: { recline: 0.08, footX: 0.5, footY: -0.02, splay: 0.35, arms: 'lap' } },
      ];
    case 'kajak':
      // seat 1: a stowaway on the fore deck, so Tammo and Tessa still fit
      return [
        { x: -0.15, z: 0, y: 0.04, face: 0, pose: { recline: 0.02, ...LEGS_FLOOR, arms: 'paddle' } },
        { x: 0.62, z: 0, y: 0.24, face: 0, pose: { recline: 0.12, footX: 0.78, footY: -0.05, arms: 'lap' } },
      ];
    case 'waterfiets':
      return [
        { x: -0.15, z: -0.36, y: 0.6, face: 0, pose: { recline: 0.12, footX: 0.5, footY: -0.26, pedal: true, arms: 'lap' } },
        { x: -0.15, z: 0.36, y: 0.6, face: 0, pose: { recline: 0.12, footX: 0.5, footY: -0.26, pedal: true, arms: 'lap' } },
      ];
    case 'rubberboot':
      return [
        { x: -hl + 0.55, z: W / 2 - 0.2, y: 0.5, face: 0, pose: { recline: 0, footX: 0.4, footY: -0.35, arms: 'tiller' } },
        { x: 0.25, z: -(W / 2 - 0.2), y: 0.5, face: -Math.PI / 2, pose: { recline: 0, footX: 0.38, footY: -0.35, arms: 'rail' } },
        { x: 0.55, z: W / 2 - 0.2, y: 0.5, face: Math.PI / 2, pose: { recline: 0, footX: 0.38, footY: -0.35, arms: 'rail' } },
      ];
    case 'dinghy':
      return [
        { x: -hl + 0.38, z: 0, y: 0.32, face: 0, pose: { recline: 0, ...LEGS_BENCH, footY: -0.2, arms: 'tiller' } },
        { x: 0.1, z: 0, y: 0.32, face: Math.PI, pose: { recline: 0.05, ...LEGS_BENCH, footY: -0.2, arms: 'lap' } },
      ];
    default: {
      const benchW = W * 0.8;
      if (boatHasCabin(v)) {
        return [
          { x: -hl * 0.05, z: -W * 0.16, y: 0.24, face: 0, pose: { recline: 0.15, footX: 0.72, footY: -0.1, arms: 'wheel' } },
          { x: -hl + 0.3, z: 0.25, y: 0.39, face: 0, pose: { recline: 0.1, ...LEGS_BENCH, arms: 'lap' } },
          { x: -hl + 0.3, z: -0.25, y: 0.39, face: 0, pose: { recline: 0.1, ...LEGS_BENCH, arms: 'rail' } },
        ];
      }
      return [
        { x: hl * 0.05 - 0.62, z: W * 0.18, y: 0.5, face: 0, pose: { recline: 0.04, ...LEGS_BENCH, arms: 'helm' } },
        { x: -hl + 0.95, z: -(benchW / 2 - 0.12), y: 0.39, face: -Math.PI / 2, pose: { recline: 0.06, ...LEGS_BENCH, arms: 'rail' } },
        { x: hl * 0.35, z: -0.3, y: 0.39, face: 0, pose: { recline: 0.04, ...LEGS_BENCH, arms: 'lap' } },
        { x: -hl + 0.3, z: 0.2, y: 0.39, face: 0, pose: { recline: 0.12, ...LEGS_BENCH, arms: 'lap' } },
      ];
    }
  }
}

// How many of the seats an ambient boat of this kind fills (skipper included).
export function boatCrewCount(v) {
  const h = Math.sin((v.id || 0) * 12.9898 + 4.1) * 43758.5453;
  const r = h - Math.floor(h);
  switch (boatKind(v)) {
    case 'rondvaart': return 5 + Math.floor(r * 5);
    case 'kano': return r < 0.6 ? 2 : 1;
    case 'kajak': return 1;
    case 'sup': return 1;
    case 'waterfiets': return r < 0.7 ? 2 : 1;
    case 'dinghy': return r < 0.5 ? 2 : 1;
    default: return 1 + Math.floor(r * 3);
  }
}

// Motorised boats carry red/green sidelights and a white stern light; paddle
// and pedal craft only a white all-round lamp.
export function boatIsMotorised(v) {
  const k = boatKind(v);
  return k !== 'kano' && k !== 'kajak' && k !== 'waterfiets' && k !== 'sup';
}
