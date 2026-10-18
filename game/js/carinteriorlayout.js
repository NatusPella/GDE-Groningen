// Layout of the car interior (dashboard, wheel, seats) in vehicle-local
// metres: +x forward, +z right, y up from the ground. Pure numbers, no
// three.js, so scripts/carinterior_test.mjs can check it in plain node.

const NO_INTERIOR = new Set(['truck', 'trekkerlimo', 'tractor', 'quad', 'foodtruck', 'cashvan']);

// Cars with a cabin we dress: not buses, boats, bikes, helis, trucks or tractors.
export function hasCarInterior(v) {
  if (!v || !v.model || v.isBus || v.isBoat || v.isBike || v.isScooter || v.isHeli) return false;
  return !NO_INTERIOR.has(v.model.name);
}

// seat = vehicleSeat(v, true): { x, y (cushion top), z }
export function interiorLayout(seat, len, wid) {
  const hw = wid / 2;
  const sx = seat.x, sy = seat.y, sz = seat.z;
  const side = sz < 0 ? 1 : -1; // z of the passenger seat is the mirror image
  return {
    eye: { x: sx + 0.05, y: sy + 0.62, z: sz },
    dash: { x: sx + 0.85, y: sy - 0.1, w: Math.max(0.8, wid - 0.16), h: 0.44, d: 0.5 },
    binnacle: { x: sx + 0.62, y: sy + 0.36, z: sz, w: 0.46, h: 0.16, d: 0.22 },
    wheel: { x: sx + 0.52, y: sy + 0.32, z: sz, r: 0.17, tilt: 0.45 },
    seats: [
      { x: sx, z: sz },
      { x: sx, z: sz + side * Math.min(hw * 0.68, 0.8) },
    ],
    console: { x: sx + 0.3, y: sy - 0.02, z: (sz + (sz + side * Math.min(hw * 0.68, 0.8))) / 2, w: 0.7, h: 0.2, d: 0.2 },
    rear: len > 3.6 ? { x: sx - 1.0, y: sy, w: wid - 0.3 } : null,
    mirror: { x: sx + 0.72, y: sy + 0.86, z: sz + side * 0.28 },
    hw,
  };
}
