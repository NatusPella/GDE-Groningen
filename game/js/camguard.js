// Camerabescherming voor cutscenes (aaa30, eis 2): de cutscene-camera gaat nooit door een gebouw, boom, voertuig of ander
// object, ook niet tijdens een beweging (dolly, kraan, orbit, volg).
//
// Pure (geen THREE, geen DOM): cutscenehost.js zet elke gespeelde camerapose erdoor en scripts/lib/cutscene_lint.mjs en de
// Electron-audit (scripts/qa/cutscene_wereld_audit.mjs) gebruiken dezelfde sweep om een camerapad te toetsen.
//
// De stateloze plaatsing van cutscript.js (fitCamera, clearOfTrees, propBlocks) houdt het PUNT vrij, maar kan de camera tussen twee
// beelden meters verzetten (een muur die de dolly kruist: de camera springt "terug langs de kijkas") of tussen twee punten dwars door
// een hoek heen laten gaan. Deze wacht onthoudt de vorige vrije stand en
//   - snijdt het stuk vorige -> gewenste stand door met kleine stappen (een obstakel dat het stuk kruist stopt de camera ervoor);
//   - laat de camera na een verplaatsing (fitCamera) glijden met een maximale snelheid in plaats van springen;
//   - laat een bewuste snee (nieuw shot, `cut`) staan: het nieuwe punt hoort vrij te zijn (cutscript.js) en anders blijft de oude stand.
// env: { blocked(x, y, z) -> true als dat punt in een gebouw, boom, voertuig of prop zit }.
// Zonder env.blocked doet de wacht niets (kamersets met een eigen clamp).

export const GUARD_STEP = 0.2; // m tussen twee toetspunten op een stuk
export const GUARD_MAX_SPEED = 9; // m/s: sneller verplaatst een bewuste dolly of volgshot nooit; meer is een sprong door een correctie
export const GUARD_SNAP = 18; // m: verder dan dit is het een sprong van de scène zelf (een andere plek), geen correctie

const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

// Het eerste obstakel op het lijnstuk a -> b: { t (0..1), x, y, z } van het laatste vrije punt, of null als het stuk vrij is.
export function sweepBlocked(blocked, a, b, step = GUARD_STEP) {
  if (typeof blocked !== 'function') return null;
  const L = d3(a, b);
  const n = Math.max(1, Math.ceil(L / step));
  let free = 0;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * u;
    if (blocked(x, y, z)) {
      const f = Math.max(0, free);
      return { t: f, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * f, hitAt: u };
    }
    free = u;
  }
  return null;
}

// Duw een punt weg van muren: elke gewenste stand binnen `marge` van een gebouw (de near-plane van 0,5 m snijdt anders de muur open en
// toont de binnenkant) schuift weg van de muur. solid(x, y, z) -> true in een gebouw. Glad in de plaats, dus geen sprong tijdens een dolly.
export function nudgeFromWalls(solid, p, marge = 0.7) {
  let x = p.x, y = p.y;
  for (let ronde = 0; ronde < 3; ronde++) {
    let px = 0, py = 0, n = 0;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      for (const r of [marge * 0.5, marge]) if (solid(x + c * r, y + sn * r, p.z)) { px -= c * (1.2 - r / marge); py -= sn * (1.2 - r / marge); n++; break; }
    }
    if (!n) break;
    const l = Math.hypot(px, py) || 1;
    x += (px / l) * 0.25; y += (py / l) * 0.25;
  }
  return { x, y, z: p.z };
}

// Eén wacht per scène. apply(pose, dt) geeft de pose terug (hetzelfde object, met een mogelijk verschoven position) en telt in stats.
export function createCamGuard(env, opts = {}) {
  const blocked = env && env.blocked;
  const nudge = env && env.nudge;
  const maxSpeed = opts.maxSpeed ?? GUARD_MAX_SPEED;
  const snap = opts.snap ?? GUARD_SNAP;
  const stats = { frames: 0, held: 0, glided: 0, snapped: 0 };
  let cur = null, shot = null;
  const guard = {
    stats,
    reset() { cur = null; shot = null; },
    apply(pose, dt = 1 / 60) {
      const q = guard.move(pose, dt);
      if (nudge && q && q.position && [q.position.x, q.position.y, q.position.z].every(Number.isFinite)) q.position = nudge(q.position);
      return q;
    },
    move(pose, dt = 1 / 60) {
      if (!blocked || !pose || !pose.position) return pose;
      const want = pose.position;
      if (![want.x, want.y, want.z].every(Number.isFinite)) return pose;
      stats.frames++;
      const newShot = pose.shotIndex !== shot;
      shot = pose.shotIndex;
      // eerste beeld, een nieuw shot (bewuste snee) of een sprong van de scène zelf: het nieuwe punt geldt; ligt het in een obstakel, dan blijft de oude stand
      if (!cur || pose.cut || newShot || d3(cur, want) > snap) {
        if (cur && !pose.cut && !newShot && d3(cur, want) > snap) stats.snapped++;
        if (blocked(want.x, want.y, want.z)) {
          // een bewuste plek die in een obstakel valt (een geparkeerde auto): eerst iets omhoog, anders blijft de vorige stand
          let up = null;
          for (const dz of [0.6, 1.2, 2.0, 3.0]) if (!blocked(want.x, want.y, want.z + dz)) { up = want.z + dz; break; }
          if (up != null) { stats.held++; pose.position = { x: want.x, y: want.y, z: up }; cur = { ...pose.position }; return pose; }
          if (cur) { stats.held++; pose.position = { ...cur }; return pose; }
        }
        cur = { x: want.x, y: want.y, z: want.z };
        return pose;
      }
      // binnen een shot: glijden met een maximale snelheid, en nooit door een obstakel
      const dist = d3(cur, want);
      if (dist < 1e-6) return pose;
      const reach = Math.min(1, (maxSpeed * Math.max(dt, 1 / 120)) / dist);
      if (reach < 1) stats.glided++;
      const goal = { x: cur.x + (want.x - cur.x) * reach, y: cur.y + (want.y - cur.y) * reach, z: cur.z + (want.z - cur.z) * reach };
      // staat de camera zelf in een obstakel (een scène die zo begint), dan mag hij naar buiten: de eerste vrije stand wint
      const hit = blocked(cur.x, cur.y, cur.z) && !blocked(want.x, want.y, want.z) ? null : sweepBlocked(blocked, cur, goal);
      if (hit) { stats.held++; pose.position = { ...cur }; return pose; }
      cur = goal;
      pose.position = { ...goal };
      return pose;
    },
  };
  return guard;
}

// Toets een volledig camerapad (voor de lint en de audit): `samples` = [{ t, shotIndex, cut, position }]. Geeft de plekken waar de
// camera in een obstakel staat of er tussen twee beelden binnen een shot doorheen gaat: [{ t, soort: 'in' | 'door', x, y, z }].
export function pathViolations(blocked, samples, opts = {}) {
  const out = [];
  const step = opts.step ?? GUARD_STEP;
  let prev = null;
  for (const s of samples) {
    const p = s.position;
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) { prev = null; continue; }
    if (blocked(p.x, p.y, p.z)) out.push({ t: s.t, soort: 'in', x: p.x, y: p.y, z: p.z });
    else if (prev && !s.cut && prev.shotIndex === s.shotIndex && sweepBlocked(blocked, prev.position, p, step)) out.push({ t: s.t, soort: 'door', x: p.x, y: p.y, z: p.z });
    prev = s;
  }
  return out;
}
