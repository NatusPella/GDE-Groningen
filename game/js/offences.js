// Traffic offences an agent can see (#43, step 2): running a red light, driving
// against the one-way, speeding. Each costs a fine, nothing more: no star, no
// warning card (#125). Only when an agent is watching, and each kind has its own
// pause. The phone in the hand lives in trafficlaw.js. The detection is pure
// (positions in, a kind out); updateOffences does the bookkeeping and takes the
// traffic lights as a probe, so this file needs no renderer.
import { travelModeOf, oneWayFor } from './roadaccess.js';
import { exempt, charge, agentWatching, roadUnder } from './trafficlaw.js';

export const OFFENCE_FINE = { roodLicht: 50, tegenVerkeer: 60, teHard: 45 };
const OFFENCE_TEXT = {
  roodLicht: 'Door rood gereden',
  tegenVerkeer: 'Tegen het verkeer in gereden',
  teHard: 'Te hard gereden',
};
const COOLDOWN_S = { roodLicht: 20, tegenVerkeer: 45, teHard: 60 };
const WATCH_M = 45;
const MOVING_MS = 3;
const LINE_REACH_M = 5; // sideways reach of a stop line
const WRONG_WAY_DOT = -0.6;
const WRONG_WAY_S = 2;
const SPEED_MARGIN_KMH = 15;
const SPEED_S = 1.5;
const MIN_LIMIT_KMH = 15; // roads without a believable limit never fine

// Did a vehicle that went from (px,py) to (x,y), heading `angle`, cross this
// head's stop line in the direction of travel? head: { x, y, hx, hy }.
export function crossedStopLine(px, py, x, y, angle, head) {
  const hl = Math.hypot(head.hx, head.hy) || 1;
  const hx = head.hx / hl, hy = head.hy / hl;
  const before = (px - head.x) * hx + (py - head.y) * hy;
  const after = (x - head.x) * hx + (y - head.y) * hy;
  if (before >= 0 || after < 0) return false;
  if (Math.abs(-(x - head.x) * hy + (y - head.y) * hx) > LINE_REACH_M) return false;
  return Math.cos(angle) * hx + Math.sin(angle) * hy > 0.7;
}

// Is a heading against the direction of a one-way road, at its nearest segment?
export function againstOneWay(road, x, y, angle) {
  if (!road || !road.oneway || !road.pts || road.pts.length < 2) return false;
  let best = Infinity, dot = 0;
  const p = road.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay, l2 = dx * dx + dy * dy;
    if (l2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) { best = d; dot = (Math.cos(angle) * dx + Math.sin(angle) * dy) / Math.sqrt(l2); }
  }
  return dot < WRONG_WAY_DOT;
}

export function speedingBy(speedMs, limitKmh) {
  if (!(limitKmh >= MIN_LIMIT_KMH)) return false;
  return Math.abs(speedMs) * 3.6 > limitKmh + SPEED_MARGIN_KMH;
}

const st = { cool: {}, wrong: 0, fast: 0, px: null, py: null, scanT: 0, road: null };
export function resetOffences() { st.cool = {}; st.wrong = 0; st.fast = 0; st.px = st.py = null; st.scanT = 0; st.road = null; }

// Fine an offence if an agent sees it and the pause for that kind is over.
// Returns the amount paid (0: not seen, paused or no money).
function reportOffence(world, kind, x, y) {
  const now = world.time || 0;
  if (now < (st.cool[kind] || 0)) return 0;
  if (!agentWatching(world, x, y, WATCH_M)) return 0;
  st.cool[kind] = now + COOLDOWN_S[kind];
  return charge(world, OFFENCE_FINE[kind], OFFENCE_TEXT[kind]);
}

// Every frame. probes: { signalsNear(x, y) -> heads, phaseFor(head, angle) -> 'red'|... }
export function updateOffences(dt, world, probes = {}) {
  if (!dt) return 0;
  const p = world.player, v = p && p.inVehicle;
  if (!v || v.isHeli || v.isBoat || v.wrecked || exempt(world, v)) { st.px = null; st.wrong = st.fast = 0; return 0; }
  const mode = travelModeOf(world);
  if (mode !== 'auto' && mode !== 'fiets') { st.px = null; st.wrong = st.fast = 0; return 0; }
  let paid = 0;
  const speed = Math.abs(v.speed || 0);
  if (probes.signalsNear && probes.phaseFor && st.px !== null && speed > MOVING_MS) {
    for (const h of probes.signalsNear(v.x, v.y)) {
      if (h.bike || h.broken) continue;
      if (crossedStopLine(st.px, st.py, v.x, v.y, v.angle, h) && probes.phaseFor(h, v.angle) === 'red') {
        paid += reportOffence(world, 'roodLicht', v.x, v.y);
        break;
      }
    }
  }
  st.px = v.x; st.py = v.y;
  st.scanT -= dt;
  if (st.scanT <= 0) {
    st.scanT = 0.25;
    st.road = world.map ? roadUnder(world.map, v.x, v.y, v.z || 0) : null;
  }
  const road = st.road;
  if (road && speed > MOVING_MS && v.speed > 0 && oneWayFor(road, mode) && againstOneWay(road, v.x, v.y, v.angle)) st.wrong += dt; else st.wrong = 0;
  if (st.wrong >= WRONG_WAY_S) { paid += reportOffence(world, 'tegenVerkeer', v.x, v.y); st.wrong = 0; }
  const limit = road && road.speed ? road.speed * 3.6 : 0;
  if (mode === 'auto' && speedingBy(speed, limit)) st.fast += dt; else st.fast = 0;
  if (st.fast >= SPEED_S) { paid += reportOffence(world, 'teHard', v.x, v.y); st.fast = 0; }
  return paid;
}
