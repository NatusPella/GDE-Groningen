// Stabiele, zachte LOD-overgangen en bewegingsgericht vooruitladen (#1016, #1052, #1008). Puur: geen three.js,
// geen DOM, zodat scripts/lodstable_test.mjs elke regel zonder browser keurt.
//
// Vijf regels:
//  1. selectRing: de detailring van gebouwen (de straal waarbinnen het gebouw met ramen staat, daarbuiten tekent de verre
//     laag) krimpt niet meer naar het eerste gebouw dat nog op zijn bouwbudget of het linken van zijn shaders wacht.
//     De eerste RING_KEEP_MAX wachtende gebouwen houden hun verre kopie (farlod.js `uLodKeep`): ze staan nog even als kale
//     massa terwijl hun buren al detail hebben, en de ring blijft op de tekenafstand. Pas als er meer dan RING_KEEP_MAX
//     echt niet tijdig klaar zijn (een sprong, een stadsdeel), krimpt de ring, en dan alleen tot het (K+1)e gebouw.
//  2. createRingSmoother: de ring krimpt direct (anders zou er een gat vallen), maar groeit pas HOLD_MS na de laatste
//     krimp en dan met hoogstens GROW_MPS, zodat hij niet heen en weer flikkert bij een gebouw dat net klaar of net weer
//     niet klaar is.
//  3. hystVisible: een drempel met twee kanten (aan op `on`, uit pas voorbij `on` + hys): kleine bewegingen rond de
//     rand laten een ding niet knipperen.
//  4. fadeStep: de zichtbaarheid van gevelversiering (kozijnen, lijsten) loopt in FADE_S seconden van 0 naar 1 in plaats van
//     te springen; bij verminderde beweging (Rustig drukwerk) is het direct.
//  5. createCooler: opruimen met vertraging: wat uit beeld raakt blijft DISPOSE_DELAY_MS staan (en komt terug als de speler
//     omdraait), en hoogstens DISPOSE_PER_FRAME stuks per frame worden echt vrijgegeven (geen reeks bij een sprong).
// Plus de snelheidsregels: bij hoge snelheid krimpt de gevelafstand en iets de ring, en de verre laag begint eerder te
// bouwen in de rijrichting.

export const RING_KEEP_MAX = 24;      // zoveel wachtende gebouwen houden hun verre kopie (uniform vec2[24] in farlod.js)
export const RING_HOLD_MS = 300;      // zo lang na de laatste krimp groeit de ring niet
const RING_GROW_MPS = 80;      // en dan met hoogstens zoveel m/s
const FADE_S = 0.25;           // het in- of uitdoven van gevelversiering
export const DISPOSE_DELAY_MS = 4000; // zo lang blijft iets dat uit beeld raakt gebouwd
export const DISPOSE_PER_FRAME = 2;   // en zoveel stuks worden per frame echt vrijgegeven
export const FACADE_OPAQUE_M = 40;    // binnen zoveel m is elk kozijn en glasvlak volledig opaak (geen schermdeur-dither)
export const FACADE_MIN_M = 60;       // de gevelafstand (kozijnen) wordt bij snelheid of een drukke machine nooit kleiner dan dit
export const RING_MIN_M = 60;         // de snelheidsregel laat de detailring nooit onder dit krimpen (een tekort aan gebouwen wel: selectRing)
export const NEAR_BUILD_M = 60;       // een gebouw met zijn gevel binnen zoveel m wordt eerst en boven het budget gebouwd
export const NEAR_URGENT_MAX = 4;     // hoogstens zoveel nabije gebouwen per frame boven het budget (4 x 0,7 tot 1,6 ms: binnen urgentMs 6 van de planner)

// ---- 1. de ring en zijn uitzonderingen ----
// missing: [[afstand, ...], ...] van de detailgebouwen binnen de tekenafstand die nog geen mesh hebben, oplopend op afstand.
// Geeft { ring, keep }: keep = hoeveel van de eerste (dichtstbijzijnde) hun verre kopie houden.
export function selectRing(missing, drawDist, keepMax = RING_KEEP_MAX) {
  const n = missing.length;
  if (n <= keepMax) return { ring: drawDist, keep: n };
  const ring = Math.min(drawDist, missing[keepMax][0] - 0.01);
  let keep = 0;
  while (keep < keepMax && missing[keep][0] <= ring) keep++;
  return { ring, keep };
}

// ---- 2. de ring zonder flikker ----
export function createRingSmoother({ holdMs = RING_HOLD_MS, growMps = RING_GROW_MPS } = {}) {
  let cur = null, highSince = -1, last = null, shrinks = 0, grows = 0;
  return {
    // target: de ring zoals selectRing hem wil; now in ms. Geeft de ring die tot nu toe gebruikt mag worden (<= target).
    // Groeien mag pas als het doel ononderbroken holdMs boven de ring ligt: een doel dat steeds even terugvalt
    // (een gebouw dat net klaar is en net weer niet) houdt de ring dus stil.
    update(target, now) {
      if (cur === null) { cur = target; last = now; return cur; }
      const dt = Math.max(0, now - last) / 1000;
      last = now;
      if (target < cur) { cur = target; highSince = -1; shrinks++; }
      else if (target > cur) {
        if (highSince < 0) highSince = now;
        if (now - highSince >= holdMs) { cur = Math.min(target, cur + growMps * dt); grows++; }
      } else highSince = -1;
      return cur;
    },
    get value() { return cur; },
    get shrinks() { return shrinks; },
    get grows() { return grows; },
  };
}

// ---- 3. hysterese ----
export function hystWidth(on, frac = 0.08, min = 6) { return Math.max(min, on * frac); }
// prev: was het ding zichtbaar; d: afstand; aan op <= on, uit pas voorbij on + hys
export function hystVisible(prev, d, on, hys = hystWidth(on)) {
  if (!Number.isFinite(on)) return true;
  return prev ? d <= on + hys : d <= on;
}

// ---- 4. de fade ----
// f in [0, 1] naar target (0 of 1) in `secs`; secs = 0 (verminderde beweging) springt.
export function fadeStep(f, target, dt, secs = FADE_S) {
  if (!(secs > 0)) return target;
  const step = Math.max(0, dt) / secs;
  return target > f ? Math.min(target, f + step) : Math.max(target, f - step);
}
// de fade bij verminderde beweging: direct
export function fadeSecs(reducedMotion) { return reducedMotion ? 0 : FADE_S; }

// De band (m vanaf de camera) waarin gevelversiering uitdooft bij afstand `on`: de band eindigt op `on` zelf.
// Op korte afstand is een kozijn nooit half uitgedoofd: de band begint niet voor FACADE_OPAQUE_M (40 m) en alles daarbinnen is opaak (#1016).
export function facadeBand(on, width = 10, opaque = FACADE_OPAQUE_M) { return Number.isFinite(on) ? [Math.max(on - width, Math.min(opaque, on), 0), on] : [1e9, 1e9 + 1]; }
// Afstand van een punt tot de bounding box [x0, y0, x1, y1] van een gebouw (0 binnen). Een groot gebouw heeft zijn gevel veel
// dichterbij dan zijn middelpunt: kozijnen en bouwvolgorde rekenen met de gevel (#1016, de ramen dichtbij).
export function boundsDist(b, px, py) {
  const dx = Math.max(b[0] - px, 0, px - b[2]), dy = Math.max(b[1] - py, 0, py - b[3]);
  return Math.hypot(dx, dy);
}
// De gevelafstand met snelheidsschaal, nooit onder FACADE_MIN_M; Infinity blijft Infinity.
export function facadeFloor(dist) { return Number.isFinite(dist) ? Math.max(dist, FACADE_MIN_M) : dist; }
// Bouwvolgorde van wachtende gebouwen (lager eerst): wat met zijn gevel binnen NEAR_BUILD_M staat gaat voor op afstand van die gevel
// (nabijheid), de rest op de rang in de rijrichting (richting, streambudget.js streamRank). `nearDist` is de afstand tot de gevel.
export function buildRank(nearDist, aheadRank) { return nearDist < NEAR_BUILD_M ? nearDist - 1e6 : aheadRank; }
// Mag dit gebouw boven het frame-budget gebouwd worden? Alleen met zijn gevel nabij en als dit frame er nog geen NEAR_URGENT_MAX waren.
export function nearUrgent(nearDist, urgentBuilt) { return nearDist < NEAR_BUILD_M && urgentBuilt < NEAR_URGENT_MAX; }
// De detailring na de snelheidsregel: niet onder RING_MIN_M, nooit boven de tekenafstand zelf.
export function ringFloor(r, drawDist) { return Math.min(drawDist, Math.max(r, RING_MIN_M)); }

// ---- 5. opruimen met vertraging ----
export function createCooler({ delayMs = DISPOSE_DELAY_MS, perFrame = DISPOSE_PER_FRAME } = {}) {
  const cold = new Map();
  let quota = perFrame, released = 0, revived = 0;
  return {
    beginFrame() { quota = perFrame; },
    // het ding is weer nodig (of nog in beeld): het blijft
    wanted(key) { if (cold.delete(key)) revived++; },
    // het ding hoeft niet meer: geeft true als het nu echt vrijgegeven mag worden (lang genoeg koud, en er is quotum)
    unwanted(key, now) {
      let t = cold.get(key);
      if (t === undefined) { cold.set(key, now); t = now; }
      if (now - t < delayMs || quota <= 0) return false;
      quota--; cold.delete(key); released++;
      return true;
    },
    forget(key) { cold.delete(key); },
    get coldCount() { return cold.size; },
    get released() { return released; },
    get revived() { return revived; },
  };
}

// ---- snelheidsregels (bewegingsgericht) ----
// lineair van 1 bij `from` m/s naar `min` bij `to` m/s
export function speedScale(speed, { from = 12, to = 35, min = 0.6 } = {}) {
  const s = Number.isFinite(speed) ? Math.abs(speed) : 0;
  if (s <= from) return 1;
  if (s >= to) return min;
  return 1 - (1 - min) * (s - from) / (to - from);
}
// de gevelversiering (kozijnen) hoeft bij snelheid niet ver: ze zijn dan onscherp
export const facadeSpeedScale = (speed) => speedScale(speed, { from: 12, to: 35, min: 0.6 });
// de detailring zelf krimpt bij snelheid maar iets (de verre laag staat dan eerder in beeld)
export const ringSpeedScale = (speed) => speedScale(speed, { from: 20, to: 40, min: 0.85 });

// De verre laag begint eerder te bouwen in de rijrichting: het aandachtspunt (de focus plus lead m in de rijrichting,
// streambudget.js streamLead) telt mee voor het starten van een tegel. Geeft de afstand waarmee een tegel start.
export function farBuildDist(distPlayer, distAhead) {
  return Number.isFinite(distAhead) ? Math.min(distPlayer, distAhead) : distPlayer;
}

// ---- routes vooraf (taxi, trein, vlucht, rit-cutscenes) ----
// Bemonstert een route (lijst [x, y]) om de `step` m: [{ x, y, s }] met s de afstand langs de route; de eerste en laatste
// punten altijd. Een tegel die dichter bij het begin ligt wordt eerder gevraagd (prioriteit = s).
export function thinPath(points, step = 250, maxPoints = 400) {
  const out = [];
  if (!points || !points.length) return out;
  let s = 0, next = 0;
  let [px, py] = points[0];
  out.push({ x: px, y: py, s: 0 });
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const seg = Math.hypot(x - px, y - py);
    if (seg > 0) {
      const stepLen = Math.max(step, 1);
      while (next + stepLen <= s + seg && out.length < maxPoints - 1) {
        next += stepLen;
        const t = (next - s) / seg;
        out.push({ x: px + (x - px) * t, y: py + (y - py) * t, s: next });
      }
    }
    s += seg; px = x; py = y;
  }
  if (out.length < maxPoints && s > out[out.length - 1].s + 1) out.push({ x: px, y: py, s });
  return out;
}
