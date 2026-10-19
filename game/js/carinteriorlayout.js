// Layout of the car interior (dashboard, wheel, seats) in vehicle-local
// metres: +x forward, +z right, y up from the ground. Pure numbers, no
// three.js, so scripts/carinterior_test.mjs can check it in plain node.

// Open vehicles have no cabin to dress.
const NO_INTERIOR = new Set(['tractor', 'quad']);

// Vehicles with a cabin we dress: cars, vans, trucks and buses (the driver's
// cab only); not boats, bikes, helis, tractors or quads.
export function hasCarInterior(v) {
  if (!v || !v.model || v.isBoat || v.isBike || v.isScooter || v.isHeli) return false;
  return !NO_INTERIOR.has(v.model.name);
}

// seat = vehicleSeat(v, true): { x, y (cushion top), z }
export function interiorLayout(seat, len, wid) {
  const hw = wid / 2;
  const sx = seat.x, sy = seat.y, sz = seat.z;
  const side = sz < 0 ? 1 : -1; // z of the passenger seat is the mirror image
  const roof = roofLayout(sx, sy, sz, len, wid, hw);
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
    rear: len > 3.6 && len <= 6.5 ? { x: sx - 1.0, y: sy, w: wid - 0.3 } : null,
    mirror: { x: sx + 0.72, y: roof.y - 0.14, z: sz + side * 0.28 }, // hangt aan het dak
    // dakbekleding vanaf de voorruit tot achter de laatste stoel, met een A-stijl per kant
    roof,
    hw,
  };
}

// Dakhemel en A-stijlen. Boven het hoofd, onder het plaatwerk: een kleine marge boven de oogpunthoogte
// (grotere cabines, zoals bestel- en vrachtwagen en bus, hebben meer ruimte).
function roofLayout(sx, sy, sz, len, wid, hw) {
  const big = len > 6.5 || sy > 0.55;
  const y = sy + 0.62 + (big ? 0.5 : 0.44);
  const front = sx + 1.0;
  const back = sx - (len > 3.6 && len <= 6.5 ? 1.35 : 0.55);
  const dashTop = sy - 0.1 + 0.44;
  const zp = hw - 0.09;
  return {
    y, x0: back, x1: front, w: Math.max(0.6, wid - 0.22),
    pillars: [-1, 1].map((s) => ({ side: s, z: s * zp, x0: front + 0.12, y0: dashTop, x1: front - 0.08, y1: y })),
  };
}

// Portierbekleding aan de binnenkant, op de plek van de echte deuren (vehicledoors.js DEUR_DEFS).
// defs: doorsFor(v); alleen draaideuren met stoel (geen kap, klep of bus-schuifdeur). Elke bekleding hoort bij
// een deur-id, zodat hij verdwijnt zodra die deur openstaat of los is (carinterior.js).
export function doorTrims(defs, len, wid) {
  const hw = wid / 2;
  const out = [];
  for (const d of defs || []) {
    if (d.soort !== 'scharnier' && d.soort !== 'achterscharnier') continue;
    if (!d.seat || !d.side) continue;
    const w = d.w * 0.9;
    const x = d.x * len;
    const h = Math.min(0.62, d.h);   // tot de onderkant van het raam
    out.push({
      id: d.id, side: d.side, x, z: d.side * (hw - 0.07), w, y: d.y0 + h / 2, h,
      arm: { x: x + w * 0.1, y: d.y0 + h * 0.8, z: d.side * (hw - 0.12), w: w * 0.5 },
      handle: { x: x - d.w * 0.3, y: d.y0 + h * 0.85, z: d.side * (hw - 0.1) },
    });
  }
  return out;
}
