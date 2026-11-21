// Pure tests van de stabiele LOD-regels (#1016, #1052, #1008): ring en uitzonderingen, ring zonder flikker, hysterese,
// fade-state, opruimen met vertraging, snelheidsregels, routebemonstering.
//   node scripts/lodstable_test.mjs
import assert from 'node:assert/strict';
import {
  RING_KEEP_MAX, RING_HOLD_MS, selectRing, createRingSmoother, hystVisible, hystWidth, fadeStep, fadeSecs, facadeBand, createCooler,
  DISPOSE_DELAY_MS, DISPOSE_PER_FRAME, speedScale, facadeSpeedScale, ringSpeedScale, farBuildDist, thinPath,
} from '../game/js/lodstable.js';
import { streamRank, createStreamAhead, advanceStreamAhead } from '../game/js/streambudget.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// ---- selectRing: een gebouw dat wacht trekt de ring niet naar zich toe ----
const miss = (...ds) => ds.map((d) => [d, { id: d }]);
ok(selectRing([], 140).ring === 140 && selectRing([], 140).keep === 0, 'niets mist: de ring is de tekenafstand');
{
  const r = selectRing(miss(18, 40, 90), 140);
  ok(r.ring === 140 && r.keep === 3, 'drie wachtende gebouwen: ring blijft 140, alle drie houden hun verre kopie (was: ring 18 m)');
}
{
  const ds = Array.from({ length: RING_KEEP_MAX }, (_, i) => 10 + i * 4);
  const r = selectRing(miss(...ds), 140);
  ok(r.ring === 140 && r.keep === RING_KEEP_MAX, 'precies de limiet: nog steeds geen krimp');
}
{
  // een sprong: tientallen missen; de ring krimpt dan alleen tot het (K+1)e gebouw, niet tot het eerste
  const ds = Array.from({ length: 80 }, (_, i) => 12 + i * 1.5);
  const r = selectRing(miss(...ds), 140);
  ok(Math.abs(r.ring - (ds[RING_KEEP_MAX] - 0.01)) < 1e-9, `ring ${r.ring.toFixed(2)} = het (K+1)e gebouw, niet het eerste (12 m)`);
  ok(r.ring > ds[0] + 20, 'de ring is veel groter dan in de oude regel');
  ok(r.keep <= RING_KEEP_MAX && r.keep >= RING_KEEP_MAX - 1, 'de uitzonderingen zijn de dichtstbijzijnde');
  // alles binnen de ring met een mesh (niet in missing) heeft detail, alle missers binnen de ring zijn gedekt door een uitzondering
  let coveredLeft = 0;
  for (let i = 0; i < ds.length; i++) if (ds[i] <= r.ring && i >= r.keep) coveredLeft++;
  ok(coveredLeft === 0, 'geen gebouw binnen de ring zonder mesh en zonder uitzondering (geen gat)');
}
{
  const r = selectRing(miss(...Array.from({ length: 60 }, () => 500)), 140);
  ok(r.ring === 140, 'wat voorbij de tekenafstand mist, telt niet (ring is nooit groter dan de tekenafstand)');
}
{
  // nooit een gat, voor willekeurige verdelingen
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let trial = 0; trial < 200; trial++) {
    const cnt = Math.floor(rnd() * 70);
    const ds = Array.from({ length: cnt }, () => 5 + rnd() * 135).sort((a, b) => a - b);
    const r = selectRing(miss(...ds), 140);
    ok(r.ring <= 140 && r.keep <= RING_KEEP_MAX, 'ring en uitzonderingen binnen de grenzen');
    for (let i = r.keep; i < ds.length; i++) assert.ok(ds[i] > r.ring, `gat bij proef ${trial}`);
    n++;
  }
}

// ---- de ring zonder flikker ----
{
  const sm = createRingSmoother();
  let t = 0;
  ok(sm.update(140, t) === 140, 'start op de tekenafstand');
  t += 16; ok(sm.update(60, t) === 60, 'krimpt direct (anders een gat)');
  // het doel springt terug: de ring wacht RING_HOLD_MS
  t += 16; ok(sm.update(140, t) === 60, 'niet meteen groeien');
  t += RING_HOLD_MS - 40; ok(sm.update(140, t) === 60, 'ook niet vlak voor de wachttijd');
  t += 100; const g1 = sm.update(140, t);
  ok(g1 > 60 && g1 < 140, `daarna geleidelijk (${g1.toFixed(1)})`);
  let steps = 0; while (sm.value < 140 && steps < 1000) { t += 16; sm.update(140, t); steps++; }
  ok(sm.value === 140 && steps > 5, `en bereikt de tekenafstand in ${steps} frames, niet in een sprong`);
}
{
  // een gebouw dat afwisselend wel en niet klaar is (flikkerend doel): het aantal wisselingen blijft laag
  const sm = createRingSmoother();
  let t = 0, changes = 0, prev = 140;
  sm.update(140, t);
  for (let f = 0; f < 600; f++) {
    t += 16;
    const target = (f % 6 < 2) ? 50 : 140; // wisselt elke 100 ms
    const r = sm.update(target, t);
    if (Math.abs(r - prev) > 1e-9) changes++;
    prev = r;
    ok(r <= target + 1e-9 || f % 6 >= 2, 'de ring is nooit groter dan het doel (geen gat)');
  }
  // zonder smoother wisselt het doel zelf elke 6 frames; hier groeit de ring niet terug zolang het doel blijft zakken
  ok(sm.grows === 0 && sm.value === 50, `de ring groeit niet mee met het flikkerende doel (${sm.grows} keer, ring ${sm.value})`);
}

// ---- hysterese ----
{
  const on = 100, hys = hystWidth(on);
  ok(hys >= 6 && Math.abs(hys - 8) < 1e-9, 'bandbreedte');
  ok(hystVisible(false, 99, on) === true && hystVisible(false, 101, on) === false, 'aan op <= drempel');
  ok(hystVisible(true, 104, on) === true && hystVisible(true, 109, on) === false, 'uit pas voorbij drempel + hysterese');
  // heen en weer rond de rand: telt de wisselingen
  let vis = false, flips = 0;
  for (let i = 0; i < 400; i++) {
    const d = 100 + Math.sin(i / 3) * 4; // schommelt +-4 m om de drempel
    const v = hystVisible(vis, d, on, hys);
    if (v !== vis) flips++;
    vis = v;
  }
  let vis2 = false, flips2 = 0;
  for (let i = 0; i < 400; i++) { const d = 100 + Math.sin(i / 3) * 4; const v = d <= on; if (v !== vis2) flips2++; vis2 = v; }
  ok(flips <= 2 && flips2 > 20, `schommeling om de rand: ${flips} wisselingen met hysterese tegen ${flips2} zonder`);
  ok(hystVisible(false, 1e9, Infinity) === true, 'geen drempel (Infinity): altijd aan');
}

// ---- fade ----
{
  let f = 0; const dt = 1 / 60; let frames = 0;
  while (f < 1 && frames < 1000) { f = fadeStep(f, 1, dt); frames++; }
  ok(frames >= 14 && frames <= 17, `in ${frames} frames (ca. 0,25 s) van 0 naar 1`);
  let g = 1; frames = 0;
  while (g > 0 && frames < 1000) { g = fadeStep(g, 0, dt); frames++; }
  ok(frames >= 14 && frames <= 17, 'en terug');
  ok(fadeStep(0.3, 1, 0.01, 0) === 1 && fadeStep(0.7, 0, 0.01, 0) === 0, 'verminderde beweging: direct');
  ok(fadeSecs(true) === 0 && fadeSecs(false) > 0, 'fadeSecs');
  ok(fadeStep(0.5, 0.5, 1) === 0.5, 'op het doel blijft op het doel');
  let h = 0.2, mono = true, last = h;
  for (let i = 0; i < 30; i++) { h = fadeStep(h, 1, dt); if (h < last) mono = false; last = h; }
  ok(mono && h <= 1, 'monotoon en begrensd');
  const [a, b] = facadeBand(100);
  ok(a === 90 && b === 100, 'de band eindigt op de drempel');
  ok(facadeBand(Infinity)[0] > 1e8, 'geen drempel: geen band');
}

// ---- opruimen met vertraging ----
{
  const c = createCooler();
  c.beginFrame();
  ok(c.unwanted('a', 0) === false, 'een ding dat net uit beeld raakt blijft');
  ok(c.unwanted('a', DISPOSE_DELAY_MS - 1) === false, 'ook vlak voor de vertraging');
  c.wanted('a');
  ok(c.coldCount === 0 && c.revived === 1, 'de speler draait om: het ding komt terug zonder herbouw');
  ok(c.unwanted('a', DISPOSE_DELAY_MS + 5) === false, 'en de teller begint opnieuw');
  ok(c.unwanted('a', 2 * DISPOSE_DELAY_MS + 10) === true, 'na de vertraging mag het weg');
  // een sprong: honderd dingen tegelijk koud, hoogstens DISPOSE_PER_FRAME per frame
  const c2 = createCooler();
  const keys = Array.from({ length: 100 }, (_, i) => 'k' + i);
  for (const k of keys) c2.unwanted(k, 0);
  let freed = 0, maxPerFrame = 0, frames = 0;
  const live = new Set(keys);
  for (let t = DISPOSE_DELAY_MS + 1; live.size && frames < 1000; t += 16, frames++) {
    c2.beginFrame();
    let thisFrame = 0;
    for (const k of [...live]) if (c2.unwanted(k, t)) { live.delete(k); freed++; thisFrame++; }
    maxPerFrame = Math.max(maxPerFrame, thisFrame);
  }
  ok(freed === 100 && maxPerFrame <= DISPOSE_PER_FRAME, `100 dingen in ${frames} frames, hoogstens ${maxPerFrame} per frame`);
}

// ---- snelheidsregels ----
ok(speedScale(0) === 1 && speedScale(12) === 1, 'stilstand en wandelen: geen krimp');
ok(Math.abs(speedScale(35) - 0.6) < 1e-9 && speedScale(80) === 0.6, 'snel: tot de ondergrens');
{ let mono = true, last = 2; for (let s = 0; s <= 60; s += 1) { const v = facadeSpeedScale(s); if (v > last + 1e-12) mono = false; last = v; } ok(mono, 'gevelafstand daalt monotoon met snelheid'); }
ok(ringSpeedScale(10) === 1 && ringSpeedScale(30) < 1 && ringSpeedScale(30) >= 0.85 && ringSpeedScale(100) === 0.85, 'de ring krimpt maar iets, nooit onder 85%');
ok(speedScale(NaN) === 1 && speedScale(-30) === speedScale(30), 'NaN en richting');
ok(farBuildDist(500, 200) === 200 && farBuildDist(100, 400) === 100 && farBuildDist(100, undefined) === 100, 'de verre laag bouwt voor wat vooruit ligt');

// ---- bewegingsgerichte rang (streambudget.js) ----
{
  const s = createStreamAhead();
  for (let i = 0; i < 120; i++) advanceStreamAhead(s, i * 0.5, 0, 1 / 60); // 30 m/s naar +x
  ok(s.speed > 25 && s.lead > 0, 'bij 30 m/s is er een lead');
  const ahead = streamRank(s, s.x + 100, 0), behind = streamRank(s, s.x - 20, 0);
  ok(ahead < behind, `100 m voor de neus (${ahead.toFixed(0)}) gaat vóór 20 m erachter (${behind.toFixed(0)})`);
  const st = createStreamAhead();
  advanceStreamAhead(st, 0, 0, 1 / 60); advanceStreamAhead(st, 0, 0, 1 / 60);
  ok(Math.abs(streamRank(st, 100, 0) - 100) < 1e-9, 'stilstand: gewoon afstand');
}

// ---- routes vooraf ----
{
  ok(thinPath([]).length === 0 && thinPath(null).length === 0, 'lege route');
  const r = thinPath([[0, 0], [1000, 0]], 250);
  ok(r.length === 5 && r[0].s === 0 && r[4].s === 1000 && r[1].x === 250, 'recht stuk: om de 250 m, eerste en laatste altijd');
  const bend = thinPath([[0, 0], [300, 0], [300, 300]], 200);
  ok(bend[1].x === 200 && bend[2].x === 300 && Math.abs(bend[2].y - 100) < 1e-9, 'de bemonstering loopt door de bocht');
  ok(bend[bend.length - 1].s === 600, 'de lengte klopt');
  ok(bend.every((p, i) => i === 0 || p.s > bend[i - 1].s), 's is strikt stijgend');
  ok(thinPath([[0, 0], [100000, 0]], 10, 50).length <= 50, 'het maximum aantal punten');
  ok(thinPath([[5, 5]]).length === 1 && thinPath([[5, 5], [5, 5]]).length === 1, 'een punt of nulrit');
}

console.log(`lodstable_test: ${n} controles groen`);
