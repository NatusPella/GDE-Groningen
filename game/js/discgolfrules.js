// Disc golf, the rules and the flight of the disc. Pure maths, no DOM and no
// THREE: discgolf.js draws it and feeds it the throws; scripts/minigames_test.mjs
// checks it in node.
//
// A throw is a launch speed (the power), a heading, a nose angle (loft) and a
// release: hyzer (-1, the disc curves to the left), flat (0) or anhyzer (+1,
// it curves to the right and holds). Whatever the release, a disc fades back
// to the left as it slows down. Wind pushes through the drag. A throw can end
// in the water (one stroke extra, back to the previous lie), against a tree,
// in the chains or on the grass; skids and rolls add a few metres.
import { geo, medalFrom } from './minigamekit.js';

// The nine holes of the course in the Stadspark (tee and basket as WGS84,
// picked on open meadow between the canal and the paths of the real park).
export const DISC_HOLES = [
  { tee: { lat: 53.204662, lon: 6.548154 }, basket: { lat: 53.204707, lon: 6.547043 } },
  { tee: { lat: 53.204950, lon: 6.545774 }, basket: { lat: 53.204392, lon: 6.545232 } },
  { tee: { lat: 53.204386, lon: 6.544264 }, basket: { lat: 53.204800, lon: 6.545204 } },
  { tee: { lat: 53.205246, lon: 6.544954 }, basket: { lat: 53.204867, lon: 6.543811 } },
  { tee: { lat: 53.205438, lon: 6.543346 }, basket: { lat: 53.204719, lon: 6.542845 } },
  { tee: { lat: 53.205871, lon: 6.544208 }, basket: { lat: 53.205238, lon: 6.543604 } },
  { tee: { lat: 53.205542, lon: 6.544462 }, basket: { lat: 53.206245, lon: 6.545149 } },
  { tee: { lat: 53.205998, lon: 6.545353 }, basket: { lat: 53.205505, lon: 6.545235 } },
  { tee: { lat: 53.206325, lon: 6.542732 }, basket: { lat: 53.206637, lon: 6.543770 } },
];

export const G = 9.81;
export const MAX_OVER_PAR = 4;
export const BASKET_R = 0.34;
export const BASKET_H = 1.45;
export const CIRCLE_M = 12;
export const MEDAL_REL = [6, 1, -2];

// vmax in m/s at full power; kd drag, kl lift, turn and fade as stability.
export const DISCS = {
  driver: { id: 'driver', name: 'Driver', vmax: 26, kd: 0.0042, kl: 0.0100, turn: 0.55, fade: 1.0 },
  midrange: { id: 'midrange', name: 'Midrange', vmax: 19.5, kd: 0.0058, kl: 0.0105, turn: 0.15, fade: 0.65 },
  putter: { id: 'putter', name: 'Putter', vmax: 14.5, kd: 0.0078, kl: 0.0110, turn: 0, fade: 0.35 },
};
export const DISC_ORDER = ['driver', 'midrange', 'putter'];
export const RELEASES = [
  { id: -1, name: 'Hyzer' },
  { id: 0, name: 'Vlak' },
  { id: 1, name: 'Anhyzer' },
];

const K_SET = 2.6, K_TURN = 1.4, K_FADE = 4.2;
// the wind in a game feels stronger than the Bft figure
const WIND_GAIN = 1.7;
const DT = 0.02;

export const holeLength = (h) => Math.hypot(h.basket.x - h.tee.x, h.basket.y - h.tee.y);

export function parFor(len) {
  return len < 60 ? 2 : len <= 110 ? 3 : 4;
}

// The holes in the world frame with their par.
export function courseHoles() {
  return DISC_HOLES.map((h, i) => {
    const tee = geo(h.tee.lat, h.tee.lon), basket = geo(h.basket.lat, h.basket.lon);
    const len = Math.hypot(basket.x - tee.x, basket.y - tee.y);
    return { n: i + 1, tee, basket, len, par: parFor(len), heading: Math.atan2(basket.y - tee.y, basket.x - tee.x) };
  });
}

export function suggestDisc(dist) {
  return dist > 50 ? 'driver' : dist > 22 ? 'midrange' : 'putter';
}

// The disc to take from a given distance, as the best-fit by reach.
export function maxRange(disc, release = 0, loft = 0.17) {
  const r = simulateFlight({ x: 0, y: 0, yaw: 0, power: 1, loft, release, disc }, {});
  return Math.hypot(r.end.x, r.end.y);
}

export function windVec(wind) {
  return { x: Math.cos(wind.dir) * wind.speed, y: Math.sin(wind.dir) * wind.speed };
}

// p: { x, y, yaw, power 0..1, loft rad, release -1..1, disc id|object }
// env: { wind {speed,dir}, trees [{x,y,r,h,crownR,crownZ}], basket {x,y}, water(x,y)->bool, rng }
// Returns { end {x,y}, reason, holed, path [[x,y,z]...], air s, from }.
export function simulateFlight(p, env = {}) {
  const disc = typeof p.disc === 'string' ? DISCS[p.disc] : p.disc;
  const wv = env.wind ? { x: windVec(env.wind).x * WIND_GAIN, y: windVec(env.wind).y * WIND_GAIN } : { x: 0, y: 0 };
  const rng = env.rng || Math.random;
  const v0 = Math.max(4, disc.vmax * Math.max(0.12, Math.min(1, p.power)));
  const loft = p.loft ?? 0.17;
  let vx = Math.cos(p.yaw) * v0 * Math.cos(loft), vy = Math.sin(p.yaw) * v0 * Math.cos(loft), vz = v0 * Math.sin(loft) + 0.4;
  let x = p.x, y = p.y, z = 1.2;
  const path = [[x, y, z]];
  let t = 0, reason = 'land', holed = false;
  const rel = p.release ?? 0;
  for (let i = 0; i < 700; i++) {
    const rx = vx - wv.x, ry = vy - wv.y;
    const sp = Math.hypot(rx, ry, vz);
    const vh = Math.hypot(vx, vy);
    const frac = Math.min(1, vh / v0);
    // sideways: perpendicular to the horizontal heading, positive to the right (clockwise on the map, y runs south)
    const side = K_SET * rel * frac * frac + K_TURN * disc.turn * frac * frac * frac * (rel >= 0 ? 1 : 0.2) - K_FADE * disc.fade * (1 - frac) * (1 - frac);
    const hx = vh > 0.01 ? vx / vh : 1, hy = vh > 0.01 ? vy / vh : 0;
    const ax = -disc.kd * sp * rx - hy * side;
    const ay = -disc.kd * sp * ry + hx * side;
    // lift mostly follows the ground speed, a little the airspeed: wind acts mainly through the drag
    const lift = Math.min(G * 0.92, disc.kl * (0.8 * vh * vh + 0.2 * (rx * rx + ry * ry)));
    const az = -G + lift - disc.kd * sp * vz * 1.5;
    vx += ax * DT; vy += ay * DT; vz += az * DT;
    const nx = x + vx * DT, ny = y + vy * DT, nz = z + vz * DT;
    t += DT;
    // the basket: the chains and the cage around the pole
    const b = env.basket;
    if (b && nz > 0.1 && nz < BASKET_H + 0.05) {
      // closest approach of this step to the pole
      const sx = nx - x, sy = ny - y, l2 = sx * sx + sy * sy || 1e-9;
      const u = Math.max(0, Math.min(1, ((b.x - x) * sx + (b.y - y) * sy) / l2));
      const dd = Math.hypot(x + sx * u - b.x, y + sy * u - b.y);
      if (dd < BASKET_R) {
        const spd = Math.hypot(vx, vy);
        const catchP = spd < 13 ? 1 : spd < 20 ? 0.7 : 0.3;
        if (rng() < catchP) { x = b.x; y = b.y; z = 0.6; holed = true; reason = 'chains'; path.push([x, y, 0.8]); break; }
        // it rattles out and drops next to the basket
        const a = rng() * Math.PI * 2;
        const ox = x, oy = y, oz = Math.max(0.3, z);
        x = b.x + Math.cos(a) * 0.5; y = b.y + Math.sin(a) * 0.5; z = 0;
        // geen sprong: eerst naar de mand, dan zakt hij langs de ketting naar de grond (#436)
        reason = 'rattle'; path.push([ox, oy, oz], [b.x, b.y, Math.max(0.5, oz * 0.8)], [(b.x + x) / 2, (b.y + y) / 2, 0.3], [x, y, 0]);
        break;
      }
    }
    if (env.trees) {
      let hit = null;
      for (const tr of env.trees) {
        // a trunk below the crown, the crown above it
        const rad = tr.crownR && nz >= (tr.crownZ || 3) ? tr.crownR : tr.r;
        if (nz < tr.h && Math.hypot(nx - tr.x, ny - tr.y) < rad + 0.2) { hit = tr; break; }
      }
      if (hit) {
        // against a trunk: the disc drops at its foot
        const a = Math.atan2(y - hit.y, x - hit.x);
        const ox = x, oy = y, oz = Math.max(0.5, z);
        x = hit.x + Math.cos(a) * (hit.r + 0.5); y = hit.y + Math.sin(a) * (hit.r + 0.5); z = 0;
        // geen sprong: de schijf valt langs de stam in een paar stappen naar zijn voet (#436)
        reason = 'tree'; path.push([ox, oy, oz], [(ox + x) / 2, (oy + y) / 2, oz * 0.4], [x, y, 0.4], [x, y, 0]);
        break;
      }
    }
    x = nx; y = ny; z = nz;
    if (i % 3 === 0) path.push([x, y, z]);
    if (z <= 0) {
      z = 0;
      // skid and roll
      const vh2 = Math.hypot(vx, vy);
      const k = 0.1 + (rel > 0 ? 0.08 : rel < 0 ? -0.04 : 0);
      const skid = vh2 * k;
      x += (vx / (vh2 || 1)) * skid; y += (vy / (vh2 || 1)) * skid;
      path.push([x, y, 0]);
      break;
    }
  }
  if (!holed && reason === 'land' && env.water && env.water(x, y)) reason = 'water';
  else if (!holed && reason === 'rattle' && env.water && env.water(x, y)) reason = 'water';
  return { end: { x, y }, reason, holed, path, air: t, from: { x: p.x, y: p.y } };
}

// Aim solver for the tests and the bot: the yaw that lands nearest a target
// without wind, for a disc, power, loft and release.
export function aimAt(from, to, disc, power, loft, release) {
  const base = Math.atan2(to.y - from.y, to.x - from.x);
  let best = base, bestD = Infinity;
  for (let k = -40; k <= 40; k++) {
    const yaw = base + k * 0.01;
    const r = simulateFlight({ x: from.x, y: from.y, yaw, power, loft, release, disc }, {});
    const d = Math.hypot(r.end.x - to.x, r.end.y - to.y);
    if (d < bestD) { bestD = d; best = yaw; }
  }
  return best;
}

// The power at which a flat throw lands at distance d (no wind).
export function powerFor(dist, disc, loft = 0.17, release = 0) {
  let lo = 0.12, hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const r = simulateFlight({ x: 0, y: 0, yaw: 0, power: mid, loft, release, disc }, {});
    if (Math.hypot(r.end.x, r.end.y) < dist) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// The power at which a throw crosses the basket's height (1 m) at distance d, no
// wind: the throw that goes into the chains rather than landing at the basket.
export function powerForBasket(dist, disc, loft = 0.08, release = 0, height = 1) {
  const reach = (power) => {
    const r = simulateFlight({ x: 0, y: 0, yaw: 0, power, loft, release, disc }, {});
    for (let i = 1; i < r.path.length; i++) if (r.path[i][2] <= height && r.path[i - 1][2] > height) return r.path[i][0];
    return Math.hypot(r.end.x, r.end.y);
  };
  let lo = 0.12, hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (reach(mid) < dist) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- scoring -----------------------------------------------------------------------------------

export function holeName(strokes, par) {
  if (strokes === 1) return 'Ace!';
  const d = strokes - par;
  return d <= -3 ? 'Albatros' : d === -2 ? 'Eagle' : d === -1 ? 'Birdie' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Dubbel bogey' : 'Triple bogey of erger';
}

export const relText = (d) => (d === 0 ? 'E' : d > 0 ? `+${d}` : String(d));

export function newCard(holes) {
  return { holes: holes.map((h) => ({ n: h.n, par: h.par, strokes: 0, done: false })), penalties: 0, aces: 0, best: 0 };
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
