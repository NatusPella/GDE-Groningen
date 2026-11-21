// Interieurs (epic #1150, ronde 2): stress en prestaties in Node. Een wandeling (5 m/s) door een straat met tien betreedbare panden
// aan weerskanten, elke 0,3 s een scan met de planregel van interiorplanner.js; elk gebouwd interieur is echt (plan en geometrie
// uit de echte bouwer). Bewaakt: nooit meer dan twee tegelijk, elk pand hooguit een keer gebouwd per passage (geen bouwen en weggooien
// bij elkaar), alles vrijgegeven na de wandeling (geometrieën weer op nul), het werk per scan blijft onder het budget (de zwaarste
// scan: plan + geometrie van een interieur) en het geheugen van wat leeft blijft klein. Geen game/world; THREE via de vendor-cache.
// Draai: node scripts/interior_stress_test.mjs
import './node3d.mjs';
const { planInterior } = await import('../game/js/interiorrules.js');
const { buildInteriorGeometry } = await import('../game/js/interiorbuild3d.js');
const { chooseLive, BUILD_R, DROP_R, MAX_LIVE } = await import('../game/js/interiorplanner.js');
const { building } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const rnd = mulberry32(77);
const KINDS = [['winkel', 'supermarkt'], ['winkel', 'bakker'], ['horeca', 'cafe'], ['kantoor', null], ['woning', null], ['winkel', 'kleding'], ['publiek', 'gemeente'], ['horeca', 'kroeg'], ['winkel', 'kapper'], ['bibliotheek', null]];
// tien panden langs de straat, links en rechts, elk 14 m breed en op 3 m van de straat
const street = [];
let x = 20;
for (let i = 0; i < 10; i++) {
  const [kind, sub] = KINDS[i];
  const w = 12, d = 11 + (i % 3);
  const { b, spot } = building(kind, sub, w, d, rnd);
  const north = i % 2 === 0; // noordzijde: de deur kijkt naar -y; zuidzijde: gespiegeld
  const sign = north ? 1 : -1;
  const T = ([px, py]) => [x + px, sign > 0 ? py : -py - 6];
  b.pts = b.pts.map(T);
  b.bounds = [Math.min(...b.pts.map((p) => p[0])), Math.min(...b.pts.map((p) => p[1])), Math.max(...b.pts.map((p) => p[0])), Math.max(...b.pts.map((p) => p[1]))];
  const e = b.entrance;
  if (sign > 0) { e.ax += x; } else { e.ax = x + w; e.ay = -6; e.tx = -1; e.ty = 0; e.nx = 0; e.ny = 1; }
  street.push({ b, spot, door: null });
  if (!north) x += 18;
  else x += 2;
}
// plan alles een keer (zoals de manager het een per scan doet) en meet
let planMs = 0, worstPlan = 0;
for (const s of street) {
  const t0 = performance.now();
  s.plan = planInterior(s.b, { spot: s.spot });
  const ms = performance.now() - t0;
  planMs += ms; worstPlan = Math.max(worstPlan, ms);
  ok(s.plan.ok, 'het stresspand is betreedbaar', s.plan.why);
  if (s.plan.ok) s.door = [s.plan.frame.ox, s.plan.frame.oy];
}
console.log(`  plannen: gemiddeld ${(planMs / street.length).toFixed(2)} ms, zwaarste ${worstPlan.toFixed(2)} ms`);

// de wandeling
const live = new Map(); // b -> { geometry, triangles, bytes }
let builds = 0, drops = 0, maxLive = 0, geoLive = 0, worstScan = 0, maxBytes = 0, thrash = 0;
const builtCount = new Map();
const visitDrops = new Map();
function pass(startX, endX, dir) {
  for (let px = startX; dir > 0 ? px <= endX : px >= endX; px += dir * 5 * 0.3) {
    const t0 = performance.now();
    const want = street.filter((s) => s.door).map((s) => ({ id: s, d: Math.hypot(s.door[0] - px, s.door[1] - 0) })).filter((w) => w.d <= BUILD_R).sort((a, b) => a.d - b.d);
    const lv = [...live.keys()].map((s) => ({ id: s, d: Math.hypot(s.door[0] - px, s.door[1]), inside: false }));
    const { drops: dr, build } = chooseLive(want, lv);
    for (const s of dr) { const o = live.get(s); o.geometry.dispose(); geoLive--; live.delete(s); drops++; visitDrops.set(s, (visitDrops.get(s) || 0) + 1); }
    if (build) {
      const { geometry, triangles } = buildInteriorGeometry(build.plan, 0, { x: build.plan.frame.ox, y: build.plan.frame.oy });
      geoLive++;
      live.set(build, { geometry, triangles, bytes: geometry.attributes.position.array.byteLength * (26 / 12) });
      builds++;
      builtCount.set(build, (builtCount.get(build) || 0) + 1);
    }
    maxLive = Math.max(maxLive, live.size);
    maxBytes = Math.max(maxBytes, [...live.values()].reduce((a, o) => a + o.bytes, 0));
    worstScan = Math.max(worstScan, performance.now() - t0);
    if (live.size > MAX_LIVE) { ok(false, 'meer dan twee interieurs tegelijk'); return; }
  }
}
const END = x + 40;
pass(0, END, 1);
const passBuilds = builds;
ok(maxLive <= MAX_LIVE, `nooit meer dan ${MAX_LIVE} interieurs tegelijk`, String(maxLive));
for (const [s, c] of builtCount) if (c > 1) thrash++;
ok(thrash === 0, 'elk pand wordt in een enkele passage hooguit een keer gebouwd (geen bouwen-weggooien-bouwen)', String(thrash));
ok(passBuilds <= street.length, 'hooguit een bouw per pand', `${passBuilds} bouwen voor ${street.length} panden`);
ok(passBuilds >= 8, 'bijna elk pand is onderweg gebouwd', String(passBuilds));
// buiten bereik: alles wordt weggegooid
pass(END, END + 80, 1);
for (let px = END + 80; px < END + 120; px += 1.5) {
  const lv = [...live.keys()].map((s) => ({ id: s, d: Math.hypot(s.door[0] - px, s.door[1]), inside: false }));
  const { drops: dr } = chooseLive([], lv);
  for (const s of dr) { live.get(s).geometry.dispose(); geoLive--; live.delete(s); drops++; }
}
ok(live.size === 0 && geoLive === 0, 'ver weg is alles vrijgegeven (geen geometrie blijft hangen)', `${live.size} levend, ${geoLive} geometrieen`);
ok(builds === drops, 'elk gebouwd interieur is ook weer vrijgegeven', `${builds} gebouwd, ${drops} vrijgegeven`);
// terug langs dezelfde straat: opnieuw bouwen is toegestaan, maar nog steeds begrensd
const before = builds;
pass(END, 0, -1);
ok(builds - before <= street.length + 2, 'terug door de straat bouwt elk pand hooguit eens opnieuw', String(builds - before));
ok(maxLive <= MAX_LIVE, 'ook terug nooit meer dan twee tegelijk');
// staan op de grens van de bouw- en weggooistraal: geen geflikker
{
  const s = street[0];
  const l = new Map(); let flips = 0, last = false;
  for (let i = 0; i < 400; i++) {
    const d = (BUILD_R + DROP_R) / 2 + Math.sin(i / 7) * 5; // schommelt tussen bouwen en weggooien
    const want = d <= BUILD_R ? [{ id: s, d }] : [];
    const lv = l.has(s) ? [{ id: s, d, inside: false }] : [];
    const r = chooseLive(want, lv);
    if (r.drops.includes(s)) l.delete(s);
    if (r.build === s) l.set(s, 1);
    const now = l.has(s); if (now !== last) { flips++; last = now; }
  }
  ok(flips <= 2, 'op de grens tussen bouwen en weggooien flikkert het niet (hysterese)', String(flips));
}
// de speler binnen: dat interieur wordt nooit weggegooid, ook niet ver weg
{
  const s = street[1];
  const r = chooseLive([], [{ id: s, d: 90, inside: true }]);
  ok(r.drops.length === 0, 'het interieur waar je in staat blijft bestaan');
}
console.log(`  wandeling: ${builds} gebouwd, ${drops} vrijgegeven, hooguit ${maxLive} tegelijk, zwaarste scan ${worstScan.toFixed(1)} ms, geheugen van wat leeft hooguit ${(maxBytes / 1024).toFixed(0)} KB`);
ok(worstScan < 40, 'de zwaarste scan (plan is al gemaakt, geometrie bouwen) blijft onder 40 ms', worstScan.toFixed(1));
ok(worstPlan < 40, 'het plan van een pand (eerste scan) blijft onder 40 ms', worstPlan.toFixed(1));
ok(maxBytes < 3 * 1024 * 1024, 'wat leeft blijft onder 3 MB', String(maxBytes));
console.log(bad ? `interior_stress_test: ${bad} van ${n} mislukt` : `interior_stress_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
