// #497: de instap- en vindregels van vehicle.js, als eigen pure module. Geen THREE, geen wereld:
// afstand tot de carrosserie, wie mag instappen en welk voertuig binnen bereik staat. vehicle.js
// houdt de namen via een her-export, zodat bestaande lezers niets merken.
export const ENTER_REACH = 1.8;
const STILL_SPEED = 1.5; // m/s: tot deze snelheid telt een bezet voertuig als stilstaand
// een auto van een scène, missie of medespeler is geen jatbare auto
const SCENARIO_DRIVER = new Set(['cine', 'owner', 'mission', 'jelle', 'twins', 'moored', 'racer', 'cast']);

// Distance from a point to the vehicle's body outline (its oriented box), 0 when inside - so a long
// bus is as easy to reach at the back as a hatch.
export function distToVehicleBody(v, x, y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const dx = x - v.x, dy = y - v.y;
  const lx = Math.abs(dx * c + dy * s) - v.halfLen, ly = Math.abs(dy * c - dx * s) - v.halfWid;
  return Math.hypot(Math.max(0, lx), Math.max(0, ly));
}

// Wie mag instappen (#436): een leeg voertuig, of een stilstaand/geparkeerd voertuig waar nog een
// AI-bestuurder in zit (een wachtende of een auto die voor het licht stilstaat). Rijdend verkeer laat
// je met rust; de speler zelf nooit. Zo zijn ook een witte bestelbus en een zwarte politieauto te jatten.
export function canEnterVehicle(v) {
  if (!v || v.wrecked || v.sinking || v.disabled || v.driver === 'player') return false;
  if (typeof v.driver === 'number' || SCENARIO_DRIVER.has(v.driver)) return false;
  if (!v.driver) return true;
  return !!v.parked || Math.abs(v.speed || 0) <= STILL_SPEED;
}

// The free vehicle (no driver of any kind) whose body is nearest, within reach of its outline;
// moving traffic gets a little extra slack, a moored boat is boarded from the quay.
export function findEnterableVehicle(x, y, vehicles, reach = ENTER_REACH) {
  let best = null, bestScore = Infinity;
  for (const v of vehicles) {
    if (!canEnterVehicle(v)) continue;
    const pad = v.halfLen + reach + 1.5;
    if (Math.abs(v.x - x) > pad || Math.abs(v.y - y) > pad) continue;
    const r = (v.isBike || v.isScooter ? reach * 0.7 : v.isBoat ? reach + 1.2 : reach) + Math.min(1, Math.abs(v.speed) * 0.1);
    const d = distToVehicleBody(v, x, y);
    if (d > r || d / r >= bestScore) continue;
    bestScore = d / r;
    best = v;
  }
  return best;
}

export function findNearestVehicle(x, y, vehicles, maxDist = 2.5) {
  let best = null, bestD = maxDist;
  for (const v of vehicles) {
    if (v.wrecked) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}
