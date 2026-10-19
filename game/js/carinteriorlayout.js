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

// --- interieur per voertuigklasse (#51) ---------------------------------------------------
// Welke inrichting een voertuig krijgt. Pure keuze, voor scripts/carinterior_test.mjs.
export function interiorKlasse(v) {
  if (!v || !v.model) return 'auto';
  const n = v.model.name;
  if (v.isBus || n === 'bus' || n === 'midibus') return 'bus';
  if (v.isAmbulance) return 'ambulance';
  if (v.isPolice) return 'politie';
  if (n === 'taxi' || v.isTaxi) return 'taxi';
  if (n === 'sport') return 'sport';
  if (n === 'truck' || n === 'foodtruck') return 'vrachtwagen';
  if (n === 'van' || n === 'cashvan') return 'bestel';
  return 'auto';
}

// Stuur, stoelkleur en extra onderdelen per klasse, in dezelfde voertuigcoördinaten als interiorLayout.
// extras: { b: [breedte langs x, hoogte, breedte dwars z], at: [x, y, z], color }. Alles anoniem, geen merken.
export function klasseStijl(klasse, L, seat) {
  const sx = seat.x, sy = seat.y, sz = seat.z;
  const side = sz < 0 ? 1 : -1;
  const passZ = sz + side * Math.min(L.hw * 0.68, 0.8);
  const base = { wheel: {}, seatColor: null, seatTilt: 0.2, rear: undefined, extras: [] };
  switch (klasse) {
    case 'sport':
      return { ...base, wheel: { r: 0.15, tilt: 0.6 }, seatColor: 0x5a2a2a, seatTilt: 0.5, rear: null, extras: [
        { b: [0.55, 0.12, 0.2], at: [sx + 0.28, sy + 0.08, (sz + passZ) / 2], color: 0x1b1d20 },       // hoge middentunnel
        { b: [0.04, 0.04, 0.5], at: [sx - 0.62, sy + 0.48, 0], color: 0x2a2d32 },                       // rolbeugel dwars
      ] };
    case 'taxi':
      return { ...base, extras: [
        { b: [0.12, 0.1, 0.16], at: [sx + 0.62, sy + 0.34, sz + side * 0.34], color: 0x20262c },       // taxameter op het dashboard
        { b: [0.02, 0.05, 0.12], at: [sx + 0.555, sy + 0.34, sz + side * 0.34], color: 0xd9a21c },
      ] };
    case 'politie':
      return { ...base, extras: [
        { b: [0.22, 0.04, 0.3], at: [sx + 0.3, sy + 0.18, (sz + passZ) / 2], color: 0x1a1d20 },        // laptophouder
        { b: [0.1, 0.12, 0.14], at: [sx + 0.62, sy + 0.34, sz + side * 0.34], color: 0x2a2f3a },       // portofoon
        { b: [0.03, 0.62, L.hw * 1.6], at: [sx - 0.5, sy + 0.45, 0], color: 0x3a3f46 },                 // tussenschot voor de achterbank
      ] };
    case 'ambulance':
      return { ...base, rear: null, extras: [
        { b: [0.06, 0.9, L.hw * 1.7], at: [sx - 0.5, sy + 0.5, 0], color: 0x9aa3ad },                  // wand naar de laadruimte
        { b: [0.14, 0.1, 0.2], at: [sx + 0.6, sy + 0.34, sz + side * 0.34], color: 0xc22b2b },        // sirenebediening
      ] };
    case 'bestel':
      return { ...base, seatTilt: 0.12, rear: null, extras: [
        { b: [0.04, 0.9, L.hw * 1.7], at: [sx - 0.52, sy + 0.55, 0], color: 0x3a3f46 },                // wand voor de laadruimte
        { b: [0.3, 0.05, 0.4], at: [sx + 0.45, sy + 0.14, passZ], color: 0x6a707a },                   // klembord-plank
      ] };
    case 'vrachtwagen':
      return { ...base, wheel: { r: 0.25, tilt: 0.15 }, seatTilt: 0.1, rear: null, extras: [
        { b: [0.9, 0.3, L.hw * 1.7], at: [sx - 0.78, sy + 0.1, 0], color: 0x3c4148 },                  // slaapbank achter de stoelen
        { b: [0.16, 0.06, 0.22], at: [sx + 0.55, sy + 0.42, sz + side * 0.3], color: 0x20262c },      // boordcomputer
      ] };
    case 'bus':
      return { ...base, wheel: { r: 0.28, tilt: 0.08 }, seatTilt: 0.1, rear: null, extras: [
        { b: [0.3, 0.2, 0.3], at: [sx + 0.55, sy + 0.2, sz + side * 0.62], color: 0x2a2f3a },          // kaartjesautomaat
        { b: [0.03, 0.9, 0.04], at: [sx + 0.2, sy + 0.7, sz + side * 0.45], color: 0x6a707a },         // paal naast de bestuurder
      ] };
    default:
      return base;
  }
}
