// De rollende golfbal (#453): zwaartekracht, lucht, stuiteren, rollen met wrijving per ondergrond, hellingen, zand, water en de
// hole met rand. Puur: geen DOM, geen THREE, geen tijd van buiten. Een vaste tijdstap (DT) en geen toeval in de stap zelf,
// dus dezelfde slag geeft altijd dezelfde baan (scripts/golfphysics_test.mjs). puttinglogic.js bouwt er pitch en putt op;
// pitchputt.js speelt de baan (trace) en de geluiden (events) af.
//
// Het terrein dat de motor vraagt (puttinglogic.js holeTerrain maakt het):
//   surface(x, y) -> 'green' | 'gras' | 'zand' | 'water'
//   slope(x, y)   -> { x, y }  waar de grond naartoe valt (m per m), zoals slopeAt
//   cup           -> { x, y } of null, cupR (m)
// Hoogte: de bal ligt op een vlak (z = 0 is de grond); een helling kantelt de stuitnormaal en trekt aan de rollende bal.
export const G = 9.81;
export const BALL_R = 0.05;       // straal van de bal voor het oog en voor de grond (een derde van de put, zie pitchputt.js)
export const CUP_R = 0.11;
export const CUP_SPEED = 1.7;     // m/s: sneller dan dit (aan de rand) rolt de bal over of uit de hole
export const DT = 0.005;
export const SAMPLE = 0.02;       // één punt van de baan per 20 ms
export const MAX_T = 24;
export const LOFT = 0.62;         // rad: de lanceerhoek van een pitch (wedge)

// mu: rollende wrijving (verlies in g); e: terugkaatsing loodrecht; keep: hoeveel van de zijwaartse snelheid een harde inslag behoudt
// (backspin op de green, inslaan in het gras); plug: de bal blijft liggen.
export const SURFACE = {
  green: { mu: 0.13, e: 0.4, keep: 0.25 },
  gras: { mu: 0.42, e: 0.25, keep: 0.12 },
  zand: { mu: 1.4, e: 0, keep: 0, plug: true },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Een lege plek zonder helling en zonder hole, voor tests.
export const vlakTerrein = (surface = () => 'green') => ({ surface, slope: () => ({ x: 0, y: 0 }), cup: null, cupR: CUP_R });

// De beginsnelheid van een slag die `carry` meters ver komt op vlakke grond (zonder lucht): R = v² sin(2 loft) / g.
export function lanceer(yaw, carry, loft = LOFT) {
  const v = Math.sqrt((Math.max(0.1, carry) * G) / Math.sin(2 * loft));
  return { vx: Math.cos(yaw) * v * Math.cos(loft), vy: Math.sin(yaw) * v * Math.cos(loft), vz: v * Math.sin(loft) };
}

// Laat de bal lopen tot hij ligt, in de hole valt of in het water plonst.
// bal: { x, y, z?, vx, vy, vz? } (z is de hoogte van het midden boven de grond; staat de bal op de grond: BALL_R)
// opties: { maxT, sterkte (slag), drag }
// Geeft { end, holed, water, rest, passed, landing, t, trace: [[x, y, hoogte, snelheid] per SAMPLE], events: [{ t, kind, x, y, k }] }
// events: 'slag' (k = kracht 0..1), 'stuiter' (k = inslag 0..1), 'zand', 'plons', 'rand' (de bal tikt de rand en gaat eroverheen), 'hole', 'rust'.
export function simulate(T, bal, o = {}) {
  let x = bal.x, y = bal.y, z = Math.max(BALL_R, bal.z ?? BALL_R), vx = bal.vx || 0, vy = bal.vy || 0, vz = bal.vz || 0;
  const cup = T.cup, cupR = T.cupR || CUP_R;
  const maxT = o.maxT || MAX_T;
  const drag = o.drag ?? 0.012;
  const trace = [], events = [];
  let t = 0, nextS = 0, holed = false, water = false, rest = false, passed = 0, landing = null, inCup = false, plugged = false;
  const ev = (kind, k = 0) => events.push({ t: Math.round(t * 1000) / 1000, kind, x, y, k: Math.round(k * 100) / 100 });
  const sample = () => trace.push([x, y, z - BALL_R, Math.hypot(vx, vy)]);
  if (o.sterkte != null) ev('slag', o.sterkte);
  while (t < maxT) {
    if (t >= nextS - 1e-9) { sample(); nextS += SAMPLE; }
    if (z > BALL_R + 1e-5 || vz > 1e-6) {
      // in de lucht
      vz -= G * DT;
      const f = 1 - drag * DT;
      vx *= f; vy *= f;
      x += vx * DT; y += vy * DT; z += vz * DT; t += DT;
      if (z <= BALL_R && vz < 0) {
        const sf = T.surface(x, y);
        if (!landing) landing = { x, y, t };
        if (sf === 'water') { water = true; z = BALL_R; vx = vy = vz = 0; ev('plons', 1); sample(); break; }
        const S = SURFACE[sf] || SURFACE.gras;
        const s = T.slope(x, y);
        const nn = Math.sqrt(s.x * s.x + s.y * s.y + 1);
        const nx = s.x / nn, ny = s.y / nn, nz = 1 / nn;
        const vn = vx * nx + vy * ny + vz * nz;   // negatief: naar de grond
        const hard = clamp(-vn / 6, 0, 1);
        const keep = 1 - (1 - S.keep) * hard;
        const tx = (vx - vn * nx) * keep, ty = (vy - vn * ny) * keep, tz = (vz - vn * nz) * keep;
        const bn = -vn * S.e;
        z = BALL_R;
        if (S.plug) { vx = vy = vz = 0; plugged = true; ev('zand', hard); } else {
          vx = tx + bn * nx; vy = ty + bn * ny; vz = tz + bn * nz;
          if (-vn > 0.5) ev('stuiter', hard);
          if (vz < 0.45) vz = 0;
        }
      }
    } else {
      // op de grond: rollen
      z = BALL_R; vz = 0;
      const sf = T.surface(x, y);
      if (sf === 'water') { water = true; vx = vy = 0; ev('plons', 0.6); sample(); break; }
      const S = SURFACE[sf] || SURFACE.gras;
      const sl = T.slope(x, y);
      const sp = Math.hypot(vx, vy);
      const slm = Math.hypot(sl.x, sl.y);
      if (sp < 0.03 && slm * G < S.mu * G * 0.9) { vx = vy = 0; rest = true; ev('rust'); break; }
      const fx = sp > 1e-4 ? -(vx / sp) * S.mu * G : 0, fy = sp > 1e-4 ? -(vy / sp) * S.mu * G : 0;
      const nvx = vx + (fx + sl.x * G) * DT, nvy = vy + (fy + sl.y * G) * DT;
      // wrijving keert de bal niet om
      if (sp > 1e-4 && nvx * vx + nvy * vy < 0 && slm * G < S.mu * G) { vx = 0; vy = 0; } else { vx = nvx; vy = nvy; }
      x += vx * DT; y += vy * DT; t += DT;
    }
    if (cup && z <= BALL_R + 1e-3) {
      const dx = x - cup.x, dy = y - cup.y, d = Math.hypot(dx, dy);
      if (d < cupR) {
        const sp = Math.hypot(vx, vy);
        if (sp < CUP_SPEED * (1.15 - 0.6 * (d / cupR))) {
          holed = true; x = cup.x; y = cup.y; z = BALL_R; vx = vy = 0;
          ev('hole', clamp(sp / CUP_SPEED, 0, 1));
          sample();
          for (let i = 1; i <= 4; i++) trace.push([x, y, -0.03 * i, 0]);   // de bal zakt in de put
          break;
        }
        if (!inCup) {
          inCup = true; passed++;
          // een rustige bal die de rand raakt buigt er een eindje omheen (een lipout), een harde vliegt eroverheen
          if (sp < CUP_SPEED * 2.4) {
            const cross = vx * (cup.y - y) - vy * (cup.x - x);
            const a = (cross >= 0 ? 1 : -1) * 0.45 * (1 - d / cupR + 0.25);
            const ca = Math.cos(a), sa = Math.sin(a);
            const nvx = vx * ca - vy * sa, nvy = vx * sa + vy * ca;
            vx = nvx; vy = nvy;
            ev('rand', 1 - sp / (CUP_SPEED * 2.4));
          }
        }
      } else if (d > cupR * 1.6) inCup = false;
    }
  }
  if (!holed && !water) sample();
  void plugged;
  return { end: { x, y }, holed, water, rest, passed, landing, t, trace, events };
}
