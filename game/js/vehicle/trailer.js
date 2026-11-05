// De aanhangerhoek van de gelede bus (#497), uit vehicle.js gehaald: de
// afstandssampled trail, de oplegger-relatie en de pose van de achterunit.
// Pure functies op het voertuig; geen three.js en geen wereld.
import { normalizeAngle, clamp, lerp } from '../util.js';

// Rolling history of a bus's own pose, sampled by distance travelled (not
// frame count) so the trailing "harmonica" unit tracks correctly regardless
// of framerate or speed. Runs off applyControls so it keeps working whether
// the bus is AI-driven or the player is at the wheel.
export function pushBusTrail(v) {
  if (!v.trailHistory) {
    v.trailHistory = [{ x: v.x, y: v.y, angle: v.angle, dist: 0 }];
    v.trailDist = 0;
    return;
  }
  const last = v.trailHistory[v.trailHistory.length - 1];
  const d = Math.hypot(v.x - last.x, v.y - last.y);
  if (d < 0.01) return;
  v.trailDist += d;
  const free = v._trailFree || (v._trailFree = []);
  const e = free.pop() || {};
  e.x = v.x; e.y = v.y; e.angle = v.angle; e.dist = v.trailDist;
  v.trailHistory.push(e);
  const keepFrom = v.trailDist - (v.model.len + (v.model.trailer || 0)) * 1.6;
  while (v.trailHistory.length > 2 && v.trailHistory[1].dist < keepFrom) free.push(v.trailHistory.shift());
}

export function sampleBusTrail(v, backDist) {
  const hist = v.trailHistory;
  if (!hist || hist.length < 2) return { x: v.x, y: v.y, angle: v.angle };
  const targetDist = v.trailDist - backDist;
  if (targetDist <= hist[0].dist) return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
  for (let i = hist.length - 1; i > 0; i--) {
    if (hist[i - 1].dist <= targetDist) {
      const a = hist[i - 1], b = hist[i];
      const span = b.dist - a.dist;
      const t = span > 1e-6 ? clamp((targetDist - a.dist) / span, 0, 1) : 0;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), angle: a.angle + normalizeAngle(b.angle - a.angle) * t };
    }
  }
  return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
}

// De aanhanger van een gelede bus is geen star deel van de bus: hij hangt aan
// een scharnier en heeft daardoor een eigen koers. Die koers houden we bij als
// toestand (v.trailerAngle) in plaats van hem elk beeld opnieuw uit de trail te
// raden. Bij stilstand, bij het wegrijden en achteruit is die trail leeg of te
// kort, en dan sprong de achterkant terug naar de bushoek (dus recht) terwijl
// hij in de bocht stond.
// De koers volgt de klassieke oplegger-relatie
//   dθ/dt = (snelheid / trailerLengte) · sin(busHoek − θ)
// met de trailerlengte uit het model: vooruit trekt θ naar de bushoek toe,
// achteruit klapt hij juist verder uit (het teken draait om), net als bij een
// echte harmonica-bus.
const TRAILER_STILL_SPEED = 0.5; // m/s; hieronder telt de bus als stilstaand
const TRAILER_STILL_PULL = 0.8; // 1/s; hoe snel een stilstaande aanhanger naar de bushoek zakt
export const TRAILER_MAX_ANGLE = 1.1; // rad; ruimte voor een krappe bocht (was 0,75)

export function stepBusTrailerAngle(v, dt) {
  const tl = v.model.trailer || 0;
  if (!tl || !(dt > 0)) return;
  if (v.trailerAngle == null) v.trailerAngle = v.angle;
  const sp = v.speed || 0;
  const d = normalizeAngle(v.angle - v.trailerAngle);
  // Een stilstaande bus legt geen afstand af, dus de sleepformule verandert dan
  // niets; de aanhanger zakt rustig naar de hoek van de bus toe in plaats van
  // in één beeld recht te springen.
  const still = Math.max(0, 1 - Math.abs(sp) / TRAILER_STILL_SPEED);
  v.trailerAngle = normalizeAngle(v.trailerAngle + (sp / tl + still * TRAILER_STILL_PULL) * Math.sin(d) * dt);
}

// The rear unit of a gelede bus (model.trailer): it hangs off the joint at
// the body's tail and follows its own heading (v.trailerAngle, see
// stepBusTrailerAngle), so it cuts the corner the way a real one does. The
// trail below is only the fallback for a bus that has not been stepped yet.
// angle is clamped to the joint's TRAILER_MAX_ANGLE; cap is its collision
// capsule (vehicleCapsule's form).
export function busTrailerPose(v) {
  const hl = v.model.len / 2, tl = v.model.trailer || 0;
  const c = Math.cos(v.angle), sn = Math.sin(v.angle);
  const jx = v.x - c * hl, jy = v.y - sn * hl;
  let a;
  if (v.trailerAngle != null) {
    a = v.angle + clamp(normalizeAngle(v.trailerAngle - v.angle), -TRAILER_MAX_ANGLE, TRAILER_MAX_ANGLE);
  } else {
    const back = sampleBusTrail(v, tl * 0.65);
    const bjx = back.x - Math.cos(back.angle) * hl, bjy = back.y - Math.sin(back.angle) * hl;
    a = Math.hypot(jx - bjx, jy - bjy) > 0.4 && v.speed >= 0 ? Math.atan2(jy - bjy, jx - bjx) : back.angle;
    a = v.angle + clamp(normalizeAngle(a - v.angle), -TRAILER_MAX_ANGLE, TRAILER_MAX_ANGLE);
  }
  const r = v.halfWid + 0.05, ca = Math.cos(a), sa = Math.sin(a);
  const ax = jx - ca * r, ay = jy - sa * r, bx = jx - ca * Math.max(r, tl - r), by = jy - sa * Math.max(r, tl - r);
  return { jx, jy, angle: a, cap: { ax, ay, bx, by, r } };
}
