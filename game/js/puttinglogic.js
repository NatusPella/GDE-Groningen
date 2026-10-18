// Pitch & putt, the rules and the roll of the ball. Pure maths, no DOM and no
// THREE: pitchputt.js draws it; scripts/minigames_test.mjs checks it in node.
//
// Six short holes on the open ground inside the Concours oval at the
// Stadspark. From the tee you pitch (a wedge: power and heading, a ball that
// flies, lands and rolls out a little); on the green you putt. The greens
// slope: the ball breaks downhill, more near the cup (the green is a shallow
// bowl), so the arrows on the green tell you where to aim. Every hole is
// par 2 or 3; a hole ends in the cup or after par + 4 strokes.
import { geo, medalFrom } from './minigamekit.js';

// tee and green (the cup) as WGS84; slope: where the green falls to (rad on
// the map) and by how much (m per m); bunkers: [along, across, radius] from
// the cup towards the tee.
export const PP_HOLES = [
  { tee: { lat: 53.202608, lon: 6.550551 }, green: { lat: 53.203227, lon: 6.550300 }, slope: [2.2, 0.026], bunkers: [[-7, 5, 2.8]] },
  { tee: { lat: 53.203331, lon: 6.549950 }, green: { lat: 53.202819, lon: 6.549104 }, slope: [-0.6, 0.032], bunkers: [] },
  { tee: { lat: 53.202605, lon: 6.548339 }, green: { lat: 53.202197, lon: 6.548294 }, slope: [0.4, 0.022], bunkers: [[6, -4, 2.4]] },
  { tee: { lat: 53.201788, lon: 6.548401 }, green: { lat: 53.202179, lon: 6.547448 }, slope: [1.5, 0.034], bunkers: [] },
  { tee: { lat: 53.201976, lon: 6.547133 }, green: { lat: 53.202026, lon: 6.545940 }, slope: [-2.4, 0.028], bunkers: [[-8, -4.5, 3]] },
  { tee: { lat: 53.202308, lon: 6.546775 }, green: { lat: 53.202607, lon: 6.547898 }, slope: [3.0, 0.03], bunkers: [] },
];

export const G = 9.81;
export const GREEN_R = 9;
export const CUP_R = 0.11;
export const CUP_SPEED = 1.7;
export const MU_GREEN = 0.13;
export const MU_ROUGH = 0.42;
export const PITCH_MAX = 62;
export const PUTT_VMAX = 7.2;
export const MAX_OVER_PAR = 4;
export const MEDAL_REL = [7, 3, 0];
const BOWL = 0.0011;
const DT = 0.01;

export const parFor = (len) => (len < 60 ? 2 : 3);

// Holes from tee and cup in the game frame: [{ tee: {x, y}, cup: {x, y}, slope: [dir, mag], bunkers }]
// (echteplekken.js lays them out on a real course); the same record ppHoles() builds.
export function holesFromWorld(raw) {
  return raw.map((h, i) => {
    const tee = { x: h.tee.x, y: h.tee.y }, cup = { x: h.cup.x, y: h.cup.y };
    const len = Math.hypot(cup.x - tee.x, cup.y - tee.y);
    const heading = Math.atan2(cup.y - tee.y, cup.x - tee.x);
    const c = Math.cos(heading), s = Math.sin(heading);
    return {
      n: i + 1, tee, cup, len, heading, par: parFor(len),
      slope: { dir: h.slope[0], mag: h.slope[1] },
      bunkers: (h.bunkers || []).map(([a, b, r]) => ({ x: cup.x + c * a - s * b, y: cup.y + s * a + c * b, r })),
    };
  });
}

// Midden en afslagplek (stand) van een baan uit zijn holes (met heading, dus na holesFromWorld).
export function venueLayout(holes) {
  const n = holes.length * 2;
  const center = { x: holes.reduce((a, h) => a + h.tee.x + h.cup.x, 0) / n, y: holes.reduce((a, h) => a + h.tee.y + h.cup.y, 0) / n };
  const f = holes[0];
  const stand = { x: f.tee.x - Math.cos(f.heading) * 3 + Math.cos(f.heading + Math.PI / 2) * 1.3, y: f.tee.y - Math.sin(f.heading) * 3 + Math.sin(f.heading + Math.PI / 2) * 1.3 };
  return { center, stand };
}

export function ppHoles() {
  return holesFromWorld(PP_HOLES.map((h) => ({ tee: geo(h.tee.lat, h.tee.lon), cup: geo(h.green.lat, h.green.lon), slope: h.slope, bunkers: h.bunkers })));
}

// The way the green falls at a point, as an acceleration direction (m per m).
export function slopeAt(h, x, y) {
  const bx = Math.cos(h.slope.dir) * h.slope.mag, by = Math.sin(h.slope.dir) * h.slope.mag;
  return { x: bx + (h.cup.x - x) * BOWL, y: by + (h.cup.y - y) * BOWL };
}

export const onGreen = (h, x, y) => Math.hypot(x - h.cup.x, y - h.cup.y) <= GREEN_R;
export const inBunker = (h, x, y) => h.bunkers.some((b) => Math.hypot(x - b.x, y - b.y) <= b.r);

// Rolls a ball from (x, y) with velocity (vx, vy) on this hole's green until
// it stops or drops. Returns { end, holed, path, t, passed }.
export function rollBall(h, x, y, vx, vy, opts = {}) {
  const path = [[x, y]];
  let t = 0, holed = false, passed = 0;
  const maxT = opts.maxT || 14;
  while (t < maxT) {
    const sp = Math.hypot(vx, vy);
    const grn = onGreen(h, x, y);
    const mu = grn ? MU_GREEN : MU_ROUGH;
    if (sp < 0.03) {
      const sl = grn ? slopeAt(h, x, y) : { x: 0, y: 0 };
      if (Math.hypot(sl.x, sl.y) * G < mu * G * 0.9) break;
    }
    const sl = grn ? slopeAt(h, x, y) : { x: 0, y: 0 };
    const fx = sp > 1e-4 ? -(vx / sp) * mu * G : 0, fy = sp > 1e-4 ? -(vy / sp) * mu * G : 0;
    let ax = fx + sl.x * G, ay = fy + sl.y * G;
    const nvx = vx + ax * DT, nvy = vy + ay * DT;
    // friction cannot reverse the ball
    if (sp > 1e-4 && (nvx * vx + nvy * vy) < 0 && Math.hypot(sl.x, sl.y) * G < mu * G) { vx = 0; vy = 0; }
    else { vx = nvx; vy = nvy; }
    x += vx * DT; y += vy * DT;
    t += DT;
    const d = Math.hypot(x - h.cup.x, y - h.cup.y);
    if (d < CUP_R) {
      const speed = Math.hypot(vx, vy);
      if (speed < CUP_SPEED * (1.15 - 0.6 * (d / CUP_R))) { holed = true; x = h.cup.x; y = h.cup.y; path.push([x, y]); break; }
      passed++;
    }
    if (Math.round(t / DT) % 4 === 0) path.push([x, y]);
  }
  return { end: { x, y }, holed, path, t, passed };
}

// A putt: power 0..1 along a heading.
export function putt(h, from, yaw, power) {
  const v = PUTT_VMAX * Math.max(0.02, Math.min(1, power));
  return rollBall(h, from.x, from.y, Math.cos(yaw) * v, Math.sin(yaw) * v);
}

// A pitch: the carry in metres is power times PITCH_MAX; the ball lands with
// a little scatter and rolls out 12 percent of the carry (on the green with
// the slope). From a bunker the scatter doubles.
export function pitch(h, from, yaw, power, rng = Math.random, bunker = false) {
  const p = Math.max(0.05, Math.min(1, power));
  const carry = PITCH_MAX * p;
  const k = bunker ? 2 : 1;
  const gauss = () => (rng() + rng() + rng() - 1.5) / 0.75;
  const dist = Math.max(1, carry * (1 + gauss() * 0.025 * k));
  const dyaw = gauss() * 0.012 * k;
  const a = yaw + dyaw;
  const lx = from.x + Math.cos(a) * dist, ly = from.y + Math.sin(a) * dist;
  const grn = onGreen(h, lx, ly);
  const water = null;
  if (!grn) {
    // off the green: the ball plugs into the rough and rolls a metre
    const e = { x: lx + Math.cos(a) * dist * 0.04, y: ly + Math.sin(a) * dist * 0.04 };
    return { landing: { x: lx, y: ly }, end: e, holed: false, path: [[from.x, from.y], [lx, ly], [e.x, e.y]], carry: dist, onGreen: false, water };
  }
  const roll = dist * 0.12;
  const v = Math.sqrt(2 * MU_GREEN * G * roll);
  const r = rollBall(h, lx, ly, Math.cos(a) * v, Math.sin(a) * v);
  return { landing: { x: lx, y: ly }, end: r.end, holed: r.holed, path: [[from.x, from.y], [lx, ly], ...r.path.slice(1)], carry: dist, onGreen: true, water };
}

// The power that carries a pitch a given distance.
export const powerForCarry = (d) => Math.max(0.05, Math.min(1, d / PITCH_MAX));

// What the putt should be for a straight, no-break putt: the power that
// stops the ball a little past the cup. Used by the tests and the green
// reading arrow.
export function straightPower(dist) {
  const v = Math.sqrt(2 * MU_GREEN * G * (dist + 0.35));
  return Math.min(1, v / PUTT_VMAX);
}

// The best aim for a putt from a point: scans headings and powers and keeps
// the one that drops (or ends nearest), as the bot of the tests.
export function bestPutt(h, from) {
  const d = Math.hypot(h.cup.x - from.x, h.cup.y - from.y);
  const base = Math.atan2(h.cup.y - from.y, h.cup.x - from.x);
  const p0 = straightPower(d);
  let best = { yaw: base, power: p0, score: Infinity, holed: false };
  for (let da = -0.2; da <= 0.2001; da += 0.01) {
    for (let k = 0.85; k <= 1.15; k += 0.03) {
      const r = putt(h, from, base + da, p0 * k);
      const e = Math.hypot(r.end.x - h.cup.x, r.end.y - h.cup.y);
      const score = r.holed ? -1 : e;
      if (score < best.score) best = { yaw: base + da, power: p0 * k, score, holed: r.holed };
      if (r.holed) return best;
    }
  }
  return best;
}

// --- scoring -----------------------------------------------------------------------------------

export function holeName(strokes, par) {
  if (strokes === 1) return 'Hole-in-one!';
  const d = strokes - par;
  return d <= -2 ? 'Eagle' : d === -1 ? 'Birdie' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Dubbel bogey' : 'Triple bogey of erger';
}

export const relText = (d) => (d === 0 ? 'E' : d > 0 ? `+${d}` : String(d));

export function newCard(holes) {
  return { holes: holes.map((h) => ({ n: h.n, par: h.par, strokes: 0, done: false })), aces: 0, holedPutts: 0 };
}

export function finishHole(card, idx, strokes) {
  const h = card.holes[idx];
  h.strokes = Math.min(strokes, h.par + MAX_OVER_PAR);
  h.done = true;
  if (strokes === 1) card.aces++;
  return h;
}

export function cardTotals(card) {
  let strokes = 0, par = 0;
  for (const h of card.holes) if (h.done) { strokes += h.strokes; par += h.par; }
  return { strokes, par, rel: strokes - par };
}

export const courseMedal = (rel) => medalFrom(rel, MEDAL_REL, true);
