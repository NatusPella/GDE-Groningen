// Vliegcamera van de heli-missie (#166), pure: achter de heli, iets boven, en een
// beetje vooruitkijkend in de richting waarin hij echt beweegt. Zonder THREE;
// helirun.js geeft het resultaat aan world.cameraOverride. Tests: scripts/helictl_test.mjs.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// h: { x, y, z, angle, vx, vy }; geeft waar de camera wil staan en waar hij naar kijkt.
export function chaseTarget(h) {
  const hs = Math.hypot(h.vx || 0, h.vy || 0);
  // kijkrichting: de neus, een stukje richting de bewegingsrichting bij snelheid
  let dir = h.angle;
  if (hs > 4) dir = h.angle + clamp(wrap(Math.atan2(h.vy, h.vx) - h.angle), -0.6, 0.6) * clamp((hs - 4) / 14, 0, 1);
  const back = 20 + hs * 0.4, up = 6 + hs * 0.1;
  return {
    pos: { x: h.x - Math.cos(dir) * back, y: h.y - Math.sin(dir) * back, z: h.z + up },
    look: { x: h.x + Math.cos(dir) * (14 + hs * 0.5), y: h.y + Math.sin(dir) * (14 + hs * 0.5), z: h.z + 1 },
    fov: 58 + clamp(hs / 40, 0, 1) * 8,
    dir,
  };
}

// camera glijdt naar het doel; rate ~4 geeft een rustige volgtijd van ~0,25 s
export function followCam(cam, target, dt, rate = 4) {
  const s = 1 - Math.exp(-rate * dt);
  if (!cam) return { ...target.pos };
  return { x: cam.x + (target.pos.x - cam.x) * s, y: cam.y + (target.pos.y - cam.y) * s, z: cam.z + (target.pos.z - cam.z) * s };
}

// Eén frame van de chase-cam van de missie: schuift de camera naar de stand achter
// de heli en levert de override die helirun.js in world.cameraOverride zet. Heeft
// de speler met V een filmstand gekozen (cinematics.js, getCinemaCamMode), dan is
// override null: die hoek is dan van de speler en de missie mag hem niet elke
// frame terugzetten (#502). De chase-cam zelf loopt door, zodat de camera meteen
// klopt als de speler de filmstand weer uitzet.
export function chaseStep(v, cam, dt, mode = 0) {
  const T = chaseTarget(v);
  const next = followCam(cam, T, dt);
  return {
    cam: next,
    yaw: T.dir,
    override: mode ? null : { position: { ...next }, lookAt: T.look, fov: T.fov, cut: true },
  };
}

// De filmstanden van cinematics.js rekenen met z = hoogte boven de grond (een auto
// staat op de weg). Vliegt de speler, dan telt de hoogte van de heli erbij: anders
// kijkt de gekozen stand op straatniveau onder de heli langs. De hoek blijft die
// van de speler, alleen de hoogte schuift mee (#502). Een stand die zijn hoogte al
// zelf bepaalt (het binnenzicht) blijft ongemoeid, net als een stand op de grond.
export function liftPose(pose, v) {
  const h = (v && v.z) || 0;
  if (!pose || pose.interior || h <= 0) return pose;
  if (!pose.position || !pose.lookAt) return pose;
  return {
    ...pose,
    position: { ...pose.position, z: (pose.position.z ?? 0) + h },
    lookAt: { ...pose.lookAt, z: (pose.lookAt.z ?? 0) + h },
  };
}
