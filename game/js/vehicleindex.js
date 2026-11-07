// #653: één ruimtelijke index voor de acteurs (voertuigen), zodat de verkeers-AI,
// de voetgangers en de dieren niet elke frame de hele world.vehicles-lijst
// langslopen. Pure module (geen DOM/three); de lezers vragen alleen hun buren.
//
// Opbouw gebeurt één keer per spel-frame, lui bij de eerste query met een nieuwe
// world._vehStamp (main.js zet die per frame). De cellen en hun arrays worden
// hergebruikt, dus een rebuild alloceert niets. Elke query sorteert de kandidaten
// op de oorspronkelijke lijstvolgorde, zodat de lezers exact hetzelfde gedrag
// houden als met een volledige scan.

const CELL = 16;
const cells = new Map(); // cel -> array met voertuigen
let touched = [];        // cellen die deze rebuild gevuld zijn
let built = -1;
let ref = null;
const key = (cx, cy) => cx * 100003 + cy;

export const vehicleIndexStats = { builds: 0, queries: 0, candidates: 0, inserted: 0 };

function build(vehicles, stamp) {
  for (const k of touched) cells.get(k).length = 0;
  touched.length = 0;
  vehicleIndexStats.inserted = vehicles.length;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    v._vi = i;
    const k = key(Math.floor(v.x / CELL), Math.floor(v.y / CELL));
    let a = cells.get(k);
    if (!a) { a = []; cells.set(k, a); }
    if (a.length === 0) touched.push(k);
    a.push(v);
  }
  built = stamp;
  ref = vehicles;
  vehicleIndexStats.builds++;
}

export function beginVehicleFrame(world) {
  world._vehStamp = (world._vehStamp || 0) + 1;
}

// De voertuigen rond (x, y) binnen r, in de volgorde van world.vehicles.
export function vehiclesNear(world, x, y, r, out) {
  const stamp = world._vehStamp || 0;
  // #653: zonder frame-stempel (een test of een ander hoofd dat beginVehicleFrame niet per
  // frame aanroept) is er geen rebuild-moment: dan per vraag bouwen, anders ziet de AI alleen
  // de voertuigen die er bij de eerste vraag al waren.
  if (!stamp || stamp !== built || ref !== world.vehicles) build(world.vehicles, stamp);
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
  out.length = 0;
  const r2 = r * r;
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const a = cells.get(key(cx, cy));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const v = a[i];
        const dx = v.x - x, dy = v.y - y;
        if (dx * dx + dy * dy <= r2) out.push(v);
      }
    }
  }
  if (out.length > 1) out.sort((a, b) => a._vi - b._vi);
  vehicleIndexStats.queries++;
  vehicleIndexStats.candidates += out.length;
  return out;
}
