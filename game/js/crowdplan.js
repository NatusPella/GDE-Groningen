// Publiek (bouwsteen G0b): de pure kant van een herbruikbaar publiek langs een parcours of
// rond een plein. Geen three en geen kaart: de plaatsing, de reactie bij het passeren, de
// LOD-keuze en het register dat een dubbele crowd tegenhoudt zijn met node na te spelen.
// Het tekenen staat in crowd.js; de scènesjablonen in cinetemplates.js.
//
//   const plan = crowdPlan({ shape: 'line', pts: [[0, 0], [60, 0]], count: 30, seed: 7 }, ground);
//   plan.members -> [{ id, x, y, a, look, h, delay }]   (wereldcoördinaten, a = kijkrichting)
//
// Samen spelen: de plaatsing hangt alleen af van de spec en de seed (seedFromKey van de
// scène- of stap-id), dus host en gast bouwen hetzelfde publiek zonder dat er iets over het
// net gaat. claimCrowd houdt per apparaat één publiek per sleutel: een gast die de scène van
// de host naspeelt en ook de aankleding van de stap bouwt, krijgt het publiek niet dubbel.
import { mulberry32 } from './rng.js';

export const CROWD_MIN = 8;   // een klein publiek (een stuntarena); een gewoon publiek is 20 tot 60
export const CROWD_MAX = 60;
export const CROWD_SHAPES = ['line', 'ring'];
export const CROWD_LOOKS = 8; // de gedeelde figuurpool: goedkoop, geometrie wordt hergebruikt
const MIN_GAP = 0.9;          // m tussen twee figuren
export const REACT_NEAR = 7;  // m: hier juichen of zwaaien ze
export const REACT_LOOK = 18; // m: hier kijken ze mee
export const LOD_FULL = 40;   // m: animatie elk beeld
export const LOD_HIDDEN = 130; // m: verder staat het publiek niet meer in beeld

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isPt = (p) => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1]);
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// Een vaste getalseed uit een tekst (FNV-1a): dezelfde sleutel geeft overal dezelfde crowd.
export function seedFromKey(key) {
  let h = 2166136261;
  const s = String(key ?? '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// null als de spec mag, anders de foutmelding (cutscript.js gebruikt dit voor def.crowd).
export function crowdSpecIssue(spec) {
  if (!spec || typeof spec !== 'object') return 'crowd is geen object';
  if (!CROWD_SHAPES.includes(spec.shape)) return `crowd: onbekende vorm ${spec.shape}`;
  if (spec.count !== undefined && !(isNum(spec.count) && spec.count >= 1 && spec.count <= 200)) return 'crowd: count is een getal van 1 tot 200 (het plan begrenst op 60)';
  if (spec.seed !== undefined && !isNum(spec.seed)) return 'crowd: seed is een getal';
  if (spec.shape === 'line') {
    if (!(Array.isArray(spec.pts) && spec.pts.length >= 2 && spec.pts.every(isPt))) return 'crowd line: pts is een lijst van minstens twee [x, y]-punten';
    if (spec.side !== undefined && !(isNum(spec.side) && spec.side >= 2)) return 'crowd line: side is een afstand van minstens 2 m tot het parcours';
  } else {
    if (!(isNum(spec.x) && isNum(spec.y))) return 'crowd ring: x en y zijn nodig';
    if (!(isNum(spec.radius) && spec.radius >= 3)) return 'crowd ring: radius is minstens 3 m';
  }
  return null;
}

// Een spec in lokale cutscene-maten (f vooruit, s links, zoals def.actors) naar wereldmaten.
export function crowdSpecToWorld(spec, anchor) {
  const c = Math.cos(anchor.facing || 0), n = Math.sin(anchor.facing || 0);
  const w = (f, s) => [anchor.x + f * c - s * n, anchor.y + f * n + s * c];
  const out = { ...spec };
  if (spec.shape === 'line') out.pts = spec.pts.map((p) => w(p[0], p[1]));
  else { const p = w(spec.x, spec.y); out.x = p[0]; out.y = p[1]; if (isNum(spec.gapA)) out.gapA = spec.gapA + (anchor.facing || 0); }
  return out;
}

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len, s));
      let i = 1;
      while (i < pts.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1;
      const u = Math.max(0, Math.min(1, (s - cum[i - 1]) / seg));
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { x, y, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l };
    },
  };
}

// De plaatsing. ground(x, y) -> true waar een figuur mag staan (niet in water, gebouw of op de
// weg: crowd.js crowdGround). Een plek die niet mag schuift naar buiten, en valt anders weg:
// liever een kleiner publiek dan iemand in de gracht. spec.clear: [{ x, y, r }] vrij te houden
// (een finishlijn, een voertuigpad). Deterministisch per spec en seed.
export function crowdPlan(spec, ground = null) {
  const issue = crowdSpecIssue(spec);
  if (issue) return { members: [], requested: 0, short: true, seed: 0, issue };
  const seed = isNum(spec.seed) ? spec.seed >>> 0 : 1;
  const rng = mulberry32(seed);
  const want = Math.max(CROWD_MIN, Math.min(CROWD_MAX, Math.round(isNum(spec.count) ? spec.count : 30)));
  const clear = Array.isArray(spec.clear) ? spec.clear : [];
  const members = [];
  let skipped = 0; // de opening van een ring telt niet als te weinig publiek
  const free = (x, y) => {
    if (ground && !ground(x, y)) return false;
    for (const c of clear) if (Math.hypot(x - c.x, y - c.y) < (c.r ?? 2)) return false;
    for (const m of members) if (Math.hypot(x - m.x, y - m.y) < MIN_GAP) return false;
    return true;
  };
  const push = (x, y, fx, fy) => {
    members.push({
      id: members.length, x, y, a: Math.atan2(fy - y, fx - x),
      look: Math.floor(rng() * CROWD_LOOKS), h: 0.92 + rng() * 0.1, delay: rng() * 0.7,
    });
  };
  if (spec.shape === 'line') {
    const pl = polyline(spec.pts);
    const base = spec.side ?? 9, spread = spec.spread ?? 3;
    const sides = spec.sides === 'left' ? [1] : spec.sides === 'right' ? [-1] : [1, -1];
    for (let i = 0; i < want; i++) {
      const p = pl.at(((i + 0.2 + rng() * 0.6) / want) * pl.len);
      const sign = sides[Math.floor(rng() * sides.length)];
      const nx = -p.ty * sign, ny = p.tx * sign;
      let d = base + rng() * spread;
      for (let k = 0; k < 6; k++, d += 1.2) {
        const x = p.x + nx * d, y = p.y + ny * d;
        if (free(x, y)) { push(x, y, p.x, p.y); break; }
      }
    }
  } else {
    const depth = spec.depth ?? 4;
    const gapA = isNum(spec.gapA) ? spec.gapA : null, gapW = spec.gapW ?? 0.5;
    for (let i = 0; i < want; i++) {
      const ang = ((i + 0.2 + rng() * 0.6) / want) * Math.PI * 2;
      if (gapA != null && Math.abs(wrap(ang - gapA)) < gapW / 2) { skipped++; continue; }
      let d = spec.radius + rng() * depth;
      for (let k = 0; k < 6; k++, d += 1.2) {
        const x = spec.x + Math.cos(ang) * d, y = spec.y + Math.sin(ang) * d;
        if (free(x, y)) { push(x, y, spec.x, spec.y); break; }
      }
    }
  }
  const requested = want - skipped;
  return { members, requested, short: members.length < requested, seed, shape: spec.shape };
}

// De reactie van een figuur op iets dat voorbijkomt (focus: { x, y } van de speler of het
// voertuig). Binnen REACT_NEAR juichen of zwaaien ze, met een korte, per figuur andere
// vertraging, en dat houdt even aan nadat het onderwerp voorbij is; tot REACT_LOOK kijken ze
// mee. state is per figuur ({} bij de eerste keer); de nieuwe state komt terug.
export function crowdReact(state, m, focus, now) {
  const s = state && typeof state === 'object' ? state : {};
  if (s.anim === undefined) { s.anim = 'idle'; s.until = 0; s.since = -1; s.gaze = 0; }
  if (focus && isNum(focus.x) && isNum(focus.y)) {
    const d = Math.hypot(focus.x - m.x, focus.y - m.y);
    s.gaze = Math.max(-1.1, Math.min(1.1, wrap(Math.atan2(focus.y - m.y, focus.x - m.x) - m.a))) * (d <= REACT_LOOK ? 1 : 0);
    if (d <= REACT_NEAR) {
      if (s.since < 0) s.since = now + m.delay;
      if (now >= s.since) { s.anim = m.id % 3 === 0 ? 'wave' : 'cheer'; s.until = now + 1.6 + m.delay; } else s.anim = 'look';
    } else {
      if (now >= s.until) { s.since = -1; s.anim = d <= REACT_LOOK ? 'look' : 'idle'; }
    }
  } else if (now >= s.until) { s.anim = 'idle'; s.since = -1; s.gaze = 0; }
  return s;
}

// 0 = volle animatie, 1 = zuinig (elk vierde beeld), 2 = niet getekend.
export function crowdLod(dist) {
  return dist < LOD_FULL ? 0 : dist < LOD_HIDDEN ? 1 : 2;
}

// Eén publiek per sleutel per apparaat.
const claimed = new Set();
export function claimCrowd(key) {
  if (claimed.has(key)) return false;
  claimed.add(key);
  return true;
}
export function releaseCrowd(key) { claimed.delete(key); }
export function crowdClaimed(key) { return claimed.has(key); }
export function crowdClaimCount() { return claimed.size; }
