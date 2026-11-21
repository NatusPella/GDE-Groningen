// Het hoogteprofiel van de luchtroute (#1038, game/js/airprofile.js) en de ringen van de heli-missies (heliplan.js clearRings):
// de luchtlijn ligt boven alle gebouwen langs de lijn, klimt en daalt vloeiend en rekent niet per frame opnieuw.
//   node scripts/airprofile_test.mjs            synthetische rij + cache + ringen (altijd)
// Met game/world (junction naar de hoofdmap) ook op de echte stad en de provincie: Euroborg -> Martinitoren -> Eemshaven en alle
// heli-ringen en -doelen; zonder game/world draait dat deel niet (SKIP). Met --profielen worden de profielen (hoogte per afstand) geprint.
import fs from 'node:fs';
import './node3d.mjs';
import assert from 'node:assert/strict';

const P = await import('../game/js/airprofile.js');
const GP = await import('../game/js/airguide.js');
const HP = await import('../game/js/heliplan.js');
const { pointInPolygon } = await import('../game/js/util.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);
const showProfiles = process.argv.includes('--profielen');
const DEG = 180 / Math.PI;

// --- een proefkaart: gebouwen als rechthoeken -----------------------------------------------------------------
const box = (x0, y0, x1, y1, h, extra = {}) => ({ bounds: [x0, y0, x1, y1], pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], h, ...extra });
const testMap = (list, extra = {}) => ({
  buildingsNear: (x, y, r) => list.filter((b) => b.bounds[0] - r <= x && x <= b.bounds[2] + r && b.bounds[1] - r <= y && y <= b.bounds[3] + r),
  groundHeightAt: () => 0,
  ...extra,
});
const stats = (z, ds) => {
  let maxSlope = 0, maxKink = 0, prev = null;
  for (let i = 1; i < z.length; i++) {
    const sl = Math.atan2(z[i] - z[i - 1], ds) * DEG;
    maxSlope = Math.max(maxSlope, Math.abs(sl));
    if (prev !== null) maxKink = Math.max(maxKink, Math.abs(sl - prev));
    prev = sl;
  }
  return { maxSlope, maxKink };
};
const A = { x: 0, y: 0 }, B = { x: 1200, y: 0 };

// 1) een rij gebouwen op de lijn: het profiel ligt erboven, klimt ervoor en daalt erachter
{
  const row = [box(250, -15, 290, 15, 8), box(400, -20, 450, 20, 14), box(600, -10, 640, 10, 40), box(800, -30, 860, 30, 12)];
  for (const plane of [false, true]) {
    const margin = plane ? P.AIR_MARGIN.plane : P.AIR_MARGIN.heli;
    const base = plane ? 150 : 60;
    const pr = P.buildAirProfile(testMap(row), A, B, { plane, base });
    const k = plane ? P.AIR_MAX_SLOPE_DEG.plane : P.AIR_MAX_SLOPE_DEG.heli;
    for (const b of row) {
      const top = P.buildingTop(b) + margin;
      for (let s = b.bounds[0]; s <= b.bounds[2]; s += 5) ok(P.profileAt(pr, s) >= top - 1e-6, `${plane ? 'vliegtuig' : 'heli'}: boven gebouw op ${s} m (${P.profileAt(pr, s).toFixed(1)} < ${top.toFixed(1)})`);
    }
    const st = stats(pr.z, pr.ds);
    ok(st.maxSlope <= k + 1e-6, `${plane ? 'vliegtuig' : 'heli'}: hellingshoek ${st.maxSlope.toFixed(2)} <= ${k}`);
    ok(st.maxKink <= 6, `${plane ? 'vliegtuig' : 'heli'}: geen knik > 6 graden per stap (${st.maxKink.toFixed(2)})`);
    ok(P.profileAt(pr, 0) <= base + 1e-6 || plane, 'begin op de basishoogte (geen obstakel vlakbij)');
    near(P.profileAt(pr, 1200), base, 1e-6, 'aan het eind weer op de basishoogte');
    if (!plane) {
      // vóór de hoge toren (40 verdiepingen = 124 m + 25) klimt de lijn al, ver ervoor niet
      ok(P.profileAt(pr, 500) > P.profileAt(pr, 300) || P.profileAt(pr, 500) > base, 'klimt vóór de toren');
      ok(P.profileAt(pr, 620) >= 124 + 25 - 1e-6, 'op de toren: dak + marge');
      ok(P.profileAt(pr, 1000) < P.profileAt(pr, 620), 'daalt achter de toren');
    }
  }
  // de strook is +-30 m breed: een gebouw 25 m naast de lijn telt mee, 60 m ernaast niet
  const side = (dy) => P.buildAirProfile(testMap([box(500, dy, 540, dy + 20, 30)]), A, B, { base: 60 });
  ok(P.profileAt(side(10), 520) >= 30 * 3.1 + 25 - 1e-6, 'gebouw 10 m naast de lijn telt mee');
  near(P.profileAt(side(80), 520), 60, 1e-6, 'gebouw 80 m naast de lijn telt niet mee');
  // obstakels uit opts.extra (windturbine, mast)
  const ex = P.buildAirProfile(testMap([]), A, B, { base: 60, extra: (x) => (Math.abs(x - 700) < 40 ? { top: 130, name: 'windturbine' } : null) });
  ok(P.profileAt(ex, 700) >= 155 - 1e-6 && P.airNeed(ex, 100, 700).name === 'windturbine', 'windturbine telt mee en geeft de naam');
  // het doel zelf is vrij: een gebouw op het doel houdt de daling niet tegen
  const goal = P.buildAirProfile(testMap([box(1180, -10, 1220, 10, 30)]), A, B, { base: 60 });
  near(P.profileAt(goal, 1200), 60, 1e-6, 'op de landingsplek zelf: basishoogte');
}

// 2) de landmark en de adviesregel
{
  const toren = box(590, -10, 610, 10, 3, { landmark: 'Martinitoren', landmarkKind: 'tower', name: 'Martinitoren' });
  ok(P.buildingTop(toren) >= 97, 'Martinitoren: 97 m');
  const pr = P.buildAirProfile(testMap([toren]), A, B, { base: 60 });
  const need = P.airNeed(pr, 100, 700);
  near(need.z, 122, 0.5, 'piek = toren + 25 m marge');
  ok(need.name === 'Martinitoren', `naam van de piek: ${need.name}`);
  ok(P.airNeedAdvice(need, 62) === 'Stijg naar 120 m: Martinitoren voor je', `advies: ${P.airNeedAdvice(need, 62)}`);
  ok(P.airNeedAdvice(need, 118) === '', 'al hoog genoeg: geen extra advies');
  const g = GP.airGuide({ x: 100, y: 0, z: 62, angle: 0 }, { x: 1200, y: 0, name: 'Eemshaven' }, { alt: 60, need });
  ok(/Stijg naar 120 m: Martinitoren voor je/.test(GP.airSub(g)) && g.dz > 15, `HUD-regel: ${GP.airSub(g)}`);
  const g0 = GP.airGuide({ x: 100, y: 0, z: 62, angle: 0 }, { x: 1200, y: 0, name: 'X' }, { alt: 60 });
  ok(g0.altAdvice === 'Hoogte goed', 'zonder profiel het oude advies');
  ok(P.airNeed(pr, 1000, 190).z < 70, 'voorbij de toren: geen piek meer voor je');
}

// 3) tegels: onbekend -> veilige standaardhoogte, daarna herberekening bij nieuwe tegels (met snelheidsgrens), cache
{
  let ready = false;
  const map = testMap([box(600, -10, 640, 10, 20)], { tilesReadyAt: () => ready });
  P.resetAirProfile();
  const me = { x: 0, y: 0, z: 60 };
  let t = 0;
  let pr = P.airProfileFor(map, me, B, { base: 60 }, t);
  ok(pr.incomplete && pr.z.every((z) => z >= P.AIR_DEFAULT_ALT - 1e-6), 'tegels niet klaar: overal minstens de standaardhoogte (150 m)');
  ok(P.airProfileStats().builds === 1, 'één bouw');
  // 200 keer "per frame" vragen: geen nieuwe bemonstering
  for (let i = 0; i < 200; i++) { t += 0.016; me.x += 0.5; pr = P.airProfileFor(map, me, B, { base: 60 }, t); }
  ok(P.airProfileStats().builds === 1, `per frame geen herberekening (${P.airProfileStats().builds} bouwen)`);
  ready = true;               // de tegels zijn binnen
  t += 0.2; P.airProfileFor(map, me, B, { base: 60 }, t);
  ok(P.airProfileStats().builds === 1, 'snelheidsgrens: niet binnen een seconde na de laatste bouw');
  t += 2; pr = P.airProfileFor(map, me, B, { base: 60 }, t);
  ok(P.airProfileStats().builds === 2 && P.airProfileStats().reason === 'tegels' && !pr.incomplete, 'tegels klaar: herberekend');
  ok(P.profileAt(pr, 100) < 80 && P.profileAt(pr, 620) >= 20 * 3.1 + 25 - 1e-6, 'nu de echte gebouwen: laag in het open stuk, boven het gebouw');
  // niets meer veranderd: geen bouw
  for (let i = 0; i < 100; i++) { t += 0.1; P.airProfileFor(map, me, B, { base: 60 }, t); }
  ok(P.airProfileStats().builds === 2, 'stabiele tegels: geen bouw');
  // een tegel valt weg: opnieuw
  ready = false; t += 3; P.airProfileFor(map, me, B, { base: 60 }, t);
  ok(P.airProfileStats().builds === 3, 'tegelwissel (weg): opnieuw');
  ready = true; t += 3; P.airProfileFor(map, me, B, { base: 60 }, t);
  // andere route: meteen opnieuw
  P.airProfileFor(map, me, { x: 900, y: 500 }, { base: 60 }, t + 0.01);
  ok(P.airProfileStats().reason === 'route', 'andere route: opnieuw');
  // afdrijven
  const before = P.airProfileStats().builds;
  P.airProfileFor(map, { x: 300, y: 200 }, { x: 900, y: 500 }, { base: 60 }, t + 3);
  ok(P.airProfileStats().builds === before + 1 && P.airProfileStats().reason === 'afdrijven', 'van de lijn afgedreven: opnieuw');
  // een lange route: een volgend stuk als het profiel voor je opraakt
  P.resetAirProfile();
  const far = { x: 15000, y: 0 }, m2 = { x: 0, y: 0, z: 60 };
  let q = P.airProfileFor(testMap([]), m2, far, { base: 60 }, 0);
  ok(q.s1 === P.AIR_SPAN_M && !q.atEnd, 'lange route: het eerste stuk is 4 km');
  m2.x = 3000; q = P.airProfileFor(testMap([]), m2, far, { base: 60 }, 5);
  ok(P.airProfileStats().reason === 'stuk' && q.s0 === 0 && q.ax === 3000, 'het stuk raakt op: een nieuw stuk vanaf je plek');
  P.resetAirProfile();
}

// 4) de ringen van de heli-missies: een ring boven een dak wordt omhoog gezet, een te hoge tussenring valt weg
{
  const dak = [box(95, -20, 125, 20, 12), box(300, -20, 330, 20, 40)]; // 37 m en 124 m
  const map = testMap(dak);
  const plan = { legs: [{ kind: 'rings', rings: [{ x: 110, y: 0, z: 45 }, { x: 200, y: 0, z: 50 }, { x: 315, y: 0, z: 60 }, { x: 500, y: 0, z: 50 }] }] };
  const r = HP.clearRings(plan, map, { x: 0, y: 0 });
  const zs = plan.legs[0].rings.map((q) => q.z);
  ok(r.lifted === 1 && r.dropped === 1, `een ring omhoog, een weg (${JSON.stringify(r)})`);
  ok(plan.legs[0].rings.length === 3 && zs[0] >= 12 * 3.1 + 2.6 + HP.RING_R * HP.HOOP_SLACK, `ring 1 boven het dak (${zs[0]})`);
  ok(plan.legs[0].rings[1].yaw !== undefined, 'de yaws zijn opnieuw gezet');
  ok(HP.clearRings(plan, map, { x: 0, y: 0 }).lifted === 0, 'idempotent');
  const open = { legs: [{ kind: 'rings', rings: [{ x: 700, y: 0, z: 50 }] }] };
  ok(HP.clearRings(open, testMap([]), null).lifted === 0, 'vrije ring blijft staan');
  const wacht = { legs: [{ kind: 'rings', rings: [{ x: 110, y: 0, z: 20 }] }] };
  ok(HP.clearRings(wacht, testMap(dak, { tilesReadyAt: () => false }), null).lifted === 0, 'tegel niet klaar: ring blijft (geen gok)');
}

// --- de echte wereld ---------------------------------------------------------------------------------------------
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) {
  console.log(`airprofile_test: ${n} controles gehaald (SKIP het echte-wereld-deel: geen game/world met de provincie)`);
  process.exit(0);
}
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const wp = ([lat, lon]) => { const [x, y] = wgsToWorld(lat, lon); return { x, y }; };
async function loadAlong(a, b, w = 120) {
  const keys = new Set();
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  for (let s = 0; s <= L + 250; s += 250) {
    const x = a.x + ((b.x - a.x) * Math.min(s, L)) / L, y = a.y + ((b.y - a.y) * Math.min(s, L)) / L;
    for (const dx of [-w, 0, w]) for (const dy of [-w, 0, w]) { const k = G.tileKey(...G.tileIndexOf(x + dx, y + dy)); if (T.index.tiles[k]) keys.add(k); }
  }
  await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  return keys.size;
}
const poly = (x, y) => map.buildingsNear(x, y, 0.5).filter((b) => pointInPolygon(x, y, b.pts));

const PL = {
  euroborg: wp([53.2077, 6.5883]),
  martini: wp([53.2194, 6.5684]),
  eemshaven: wp([53.4395, 6.835]),
  umcg: wp([53.2200, 6.5760]),
  eelde: wp([53.1195, 6.5794]),
};
// de echte Martinitoren staat in de tegels als landmark
await loadAlong(PL.martini, PL.martini);
const mt = map.buildingsNear(PL.martini.x, PL.martini.y, 120).find((b) => b.landmark === 'Martinitoren');
ok(mt && P.buildingTop(mt) >= 97, 'de Martinitoren staat in de echte tegels met 97 m');

async function realRoute(name, a, b, o, checkM = 2500) {
  await loadAlong(a, b);
  const total = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / total, uy = (b.y - a.y) / total;
  const margin = P.AIR_MARGIN[o.plane ? 'plane' : 'heli'];
  let worst = Infinity, seenBuildings = 0, maxTop = 0, maxSlope = 0, maxKink = 0, steps = 0, pr = null;
  const dump = [];
  for (let s0 = 0; s0 < total; s0 += checkM) {
    pr = P.buildAirProfile(map, a, b, { ...o, s0 });
    ok(!pr.incomplete, `${name}: alle tegels langs het stuk vanaf ${s0} m zijn geladen`);
    const st = stats(pr.z, pr.ds);
    maxSlope = Math.max(maxSlope, st.maxSlope); maxKink = Math.max(maxKink, st.maxKink);
    // onafhankelijke controle: punten over de strook (-30..30 m), alleen echte gebouwen (punt in de voetafdruk)
    for (let s = s0; s <= Math.min(total, s0 + checkM); s += 7) {
      for (let off = -P.AIR_HALF_W; off <= P.AIR_HALF_W; off += 10) {
        const x = a.x + ux * s - uy * off, y = a.y + uy * s + ux * off;
        for (const b2 of poly(x, y)) {
          if (total - s < P.AIR_END_FREE_M) continue;
          seenBuildings++;
          const need = P.buildingTop(b2) + margin;
          maxTop = Math.max(maxTop, need);
          worst = Math.min(worst, P.profileAt(pr, s) - need);
        }
      }
    }
    if (showProfiles) for (let s = s0; s < Math.min(total, s0 + checkM); s += total > 6000 ? 500 : 100) dump.push(`${Math.round(s)}:${Math.round(P.profileAt(pr, s))}`);
    steps++;
  }
  ok(worst >= -1e-6, `${name}: de lijn ligt boven alle ${seenBuildings} gebouwpunten (kleinste ruimte ${worst.toFixed(1)} m)`);
  ok(maxSlope <= P.AIR_MAX_SLOPE_DEG[o.plane ? 'plane' : 'heli'] + 1e-6, `${name}: hellingshoek ${maxSlope.toFixed(1)}`);
  ok(maxKink <= 6, `${name}: knik ${maxKink.toFixed(2)} graden per stap`);
  console.log(`  ${name}: ${Math.round(total)} m, ${steps} stukken, ${seenBuildings} gebouwpunten gecontroleerd, hoogste eis ${maxTop.toFixed(0)} m, helling max ${maxSlope.toFixed(1)}, knik max ${maxKink.toFixed(2)}`);
  if (showProfiles) console.log(`    profiel (afstand:hoogte per 100 m) ${dump.join(' ')}`);
  return { total, dump };
}
const alt = (total, plane) => Math.round((plane ? Math.max(120, Math.min(300, 90 + total * 0.04)) : Math.max(45, Math.min(110, 40 + total * 0.02))) / 5) * 5;
const tot = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const t0 = Date.now();
// route 1: Euroborg -> Martinitoren (de binnenstad); route 2: Martinitoren -> Eemshaven; route 3: UMCG -> Eelde met het vliegtuig
const r1 = await realRoute('Euroborg -> Martinitoren (heli)', PL.euroborg, PL.martini, { base: alt(tot(PL.euroborg, PL.martini)) });
const over = { x: PL.martini.x + (PL.martini.x - PL.euroborg.x) * 0.7, y: PL.martini.y + (PL.martini.y - PL.euroborg.y) * 0.7 }; // over de toren heen, door de binnenstad
await realRoute("Euroborg -> over de Martinitoren heen (heli)", PL.euroborg, over, { base: alt(tot(PL.euroborg, over)) });
await realRoute("Euroborg -> over de Martinitoren heen (vliegtuig, laag)", PL.euroborg, over, { plane: true, base: 120 });
const rm = P.buildAirProfile(map, PL.euroborg, over, { base: alt(tot(PL.euroborg, over)) });
ok(Math.max(...rm.z) >= 97 + 25 - 1e-6, 'binnenstad: de lijn komt boven de Martinitoren (>= 122 m)');
const need1 = P.airNeed(rm, 0, 1700);
console.log(`  advies bij Euroborg: ${P.airNeedAdvice(need1, 50)} (piek ${Math.round(need1.z)} m op ${Math.round(need1.dist)} m, ${need1.name || '-'})`);
const r2 = await realRoute('Martinitoren -> Eemshaven (heli)', PL.martini, PL.eemshaven, { base: alt(tot(PL.martini, PL.eemshaven)) }, 4000);
const r3 = await realRoute('UMCG -> Eelde (vliegtuig)', PL.umcg, PL.eelde, { plane: true, base: alt(tot(PL.umcg, PL.eelde), true) }, 4000);
ok(r1.total > 0 && r2.total > 0 && r3.total > 0, 'drie echte routes');

// de heli-missies: de ringen (Ballonjacht, Traumaduif, M12) en de snedes nooit in een gebouw, ook zonder opruiming gemeld
await loadAlong(PL.umcg, { x: HP.BALLOON_AT.x, y: HP.BALLOON_AT.y }, 300);
const pads = { umcg: { x: PL.umcg.x, y: PL.umcg.y, deck: 40 }, lauwersoog: HP.ROOSTER.lauwersoog, eelde: PL.eelde };
const ringInBuilding = (q) => {
  const rr = HP.RING_R * HP.HOOP_SLACK;
  const pts = [[0, 0]];
  for (let i = 0; i < 12; i++) pts.push([Math.cos((i * Math.PI) / 6) * rr, Math.sin((i * Math.PI) / 6) * rr]);
  for (const [dx, dy] of pts) for (const b of poly(q.x + dx, q.y + dy)) if (P.buildingTop(b) > q.z - rr) return b;
  return null;
};
for (const variant of ['ballonjacht', 'traumaduif', 'rooster']) {
  const plan = HP.makePlan(variant, pads);
  const raw = plan.legs.filter((l) => l.kind === 'rings').flatMap((l) => l.rings);
  const before = raw.filter(ringInBuilding).length;
  const r = HP.clearRings(plan, map, pads.umcg);
  const rings = plan.legs.filter((l) => l.kind === 'rings').flatMap((l) => l.rings);
  const bad = rings.filter(ringInBuilding);
  ok(bad.length === 0, `${variant}: geen ring in een gebouw (${bad.length})`);
  console.log(`  ${variant}: ${raw.length} ringen, ${before} in een gebouw vóór de opruiming; opgetild ${r.lifted}, weggelaten ${r.dropped}, over ${rings.length}`);
  for (const l of plan.legs) if (l.kind === 'cruise' && l.cut) {
    const t = P.topAt(map, l.cut.x, l.cut.y, 20);
    ok(!t.ready || t.top < l.cut.z - 10, `${variant}: de sprong na de cruise (${Math.round(l.cut.z)} m) ligt boven alles eronder (${Math.round(t.top)} m)`);
  }
}
console.log(`  (echte wereld ${Date.now() - t0} ms)`);
console.log(`airprofile_test: ${n} controles gehaald`);
