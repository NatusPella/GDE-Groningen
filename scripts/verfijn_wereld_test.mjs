// Verfijnronde 22-11, epic Wereld/Verkeer/NPC-leven: regressietests, randgevallen en lange simulaties voor de kleine verbeteringen.
// docs/VERFIJNING-22-11-WERELD.md. node scripts/verfijn_wereld_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const { vehicleVerb, stealNoun } = await import('../game/js/vehicleverb.js');
const { createWeatherState, stepWeather, regionAt, regionWeather, REGION_IDS, WEATHER_KINDS } = await import('../game/js/weatherstate.js');
const { minimapRedrawDue, minimapIntervalMs } = await import('../game/js/minimapcadence.js');
const { stepNear, NEAR_MIN, NEAR_MAX, cameraNearTarget } = await import('../game/js/cameranear.js');
const { nieuwVast, stapVast, VAST_STIL_S } = await import('../game/js/vastlopen.js');
const { ribbonAlpha } = await import('../game/js/routeribbon.js');
const { makeLean, stepLean } = await import('../game/js/camlean.js');
const { taxiHudModel, afzettenKlaar } = await import('../game/js/taxistatus.js');
const { bindMinimapOpen } = await import('../game/js/minimaptap.js');
const { distinctPicks, QUAKE_BARKS, algaePatches } = await import('../game/js/eventrules.js');
const { makeBediening, stepBediening, toggleDeuren, deurenDicht } = await import('../game/js/busbestuur.js');
const { stepFov } = await import('../game/js/gamefeel.js');
const { resolveNavTargets, HYSTERESE } = await import('../game/js/navtarget.js');
const { lifeRoster, lifeLine, lifeSpeakers, lifeEvents, LIFE_EVENTS } = await import('../game/js/worldlife.js');

let n = 0;
const ok = (naam, f) => { try { f(); n++; } catch (e) { e.message = `${naam}: ${e.message}`; throw e; } };

// De hint bij een geparkeerd voertuig noemt het voertuig, geen "Auto jatten" voor een fiets.
ok('vehicleVerb: geparkeerde voertuigen', () => {
  assert.equal(vehicleVerb({ parked: true, isBike: true }).label, 'Fiets jatten');
  assert.equal(vehicleVerb({ parked: true, isScooter: true }).label, 'Scooter jatten');
  assert.equal(vehicleVerb({ parked: true, isBoat: true }).label, 'Boot jatten');
  assert.equal(vehicleVerb({ parked: true, isBus: true }).label, 'Bus jatten');
  assert.equal(vehicleVerb({ parked: true }).label, 'Auto jatten');
  assert.equal(stealNoun({ _mount: 'horse' }), 'Paard');
});
ok('vehicleVerb: eigen voertuig, gevallen fiets, bezette scooter', () => {
  assert.equal(vehicleVerb({ playerOwned: true, parked: true, isBike: true }).steal, undefined);
  assert.equal(vehicleVerb({ fallen: true, parked: true, isBike: true }).label, 'Fiets rechtzetten');
  assert.equal(vehicleVerb({ isScooter: true, road: {} }).label, 'Scooter jatten');
  assert.equal(vehicleVerb({ isScooter: true }).label, 'Opstappen');
});

// Weer: NaN, negatieve of nul-dt laat de toestand ongemoeid; daarna loopt het weer gewoon door.
ok('weer: ongeldige dt bevriest niets', () => {
  const ws = createWeatherState(7);
  for (const dt of [NaN, -1, 0, Infinity, undefined]) stepWeather(ws, dt, 12);
  for (const id of REGION_IDS) { const r = ws.regions[id]; assert.ok(Number.isFinite(r.age) && Number.isFinite(r.rain) && Number.isFinite(r.overcast) && Number.isFinite(r.mist)); }
  for (let i = 0; i < 400; i++) stepWeather(ws, 0.5, 12);
  assert.ok(Object.values(ws.regions).some((r) => r.age < 400));
});
// Weer: simulatie over 120 speeluren (1 speeluur = 60 s): alles eindig, soorten komen voor, droog is de norm, geen eindeloze bui.
ok('weer: lange simulatie', () => {
  const ws = createWeatherState(12345);
  const seen = new Set(); let wet = 0, total = 0, run = 0, maxRun = 0, last = '';
  for (let t = 0; t < 120 * 60; t++) {
    stepWeather(ws, 1, (t / 60) % 24);
    const w = regionWeather(ws, 'stad');
    assert.ok(Number.isFinite(w.rain) && Number.isFinite(w.overcast) && Number.isFinite(w.mist) && w.rain >= 0 && w.rain <= 1);
    assert.ok(WEATHER_KINDS.includes(w.kind));
    seen.add(w.kind); total++; if (w.rain > 0.2) wet++;
    if (w.kind === last) run++; else { run = 0; last = w.kind; }
    if (w.kind !== 'helder' && w.kind !== 'bewolkt') maxRun = Math.max(maxRun, run);
  }
  assert.ok(seen.has('helder') && seen.has('bewolkt'), [...seen].join());
  assert.ok(wet / total < 0.35, `te nat: ${wet / total}`);
  assert.ok(maxRun < 200, `een bui of mist van ${maxRun} s`);
});

// Minimap-cadans: zonder geldige tijd altijd tekenen; met geldige tijd blijft de kostenregel gelden.
ok('minimap: NaN of ontbrekende tijd', () => {
  assert.equal(minimapRedrawDue(NaN, 0, 3, true), true);
  assert.equal(minimapRedrawDue(100, undefined, 3, true), true);
  assert.equal(minimapRedrawDue(100, 90, 3, true), false);
  assert.equal(minimapRedrawDue(140, 90, 3, true), true);
  assert.ok(Number.isFinite(minimapIntervalMs(NaN, false)));
});
ok('minimap: dubbelklik telt een keer', () => {
  let t = 1000, opened = 0; const ls = {};
  const el = { addEventListener: (k, f) => { ls[k] = f; } };
  bindMinimapOpen(el, () => { opened++; }, () => false, () => t);
  ls.click({}); t += 100; ls.click({}); assert.equal(opened, 1);
  t += 400; ls.click({}); assert.equal(opened, 2);
  let blocked = true;
  bindMinimapOpen(el, () => { opened++; }, () => blocked, () => t);
  ls.click({}); assert.equal(opened, 2); // geblokkeerd telt niet mee voor de rust
  blocked = false; ls.click({}); assert.equal(opened, 3);
});

ok('camera: near is nooit NaN', () => {
  assert.equal(stepNear(0.5, NaN, 0.016), NEAR_MIN);
  assert.equal(stepNear(NaN, 1.2, 0.016), 1.2);
  assert.ok(Number.isFinite(stepNear(0.5, NEAR_MAX, NaN)));
  assert.equal(cameraNearTarget({ clearance: 200, flying: true }), NEAR_MAX);
});

ok('vastlopen: dt-bewaking', () => {
  const st = nieuwVast(); const inv = { inVoertuig: true, gas: true, snelheid: 0, bezig: false, houdt: false };
  stapVast(st, NaN, inv); assert.equal(st.stil, 0);
  stapVast(st, 30, inv); assert.ok(st.stil <= 0.25 + 1e-9, 'een hapering van 30 s telde als vastzitten');
  let hint = false; for (let i = 0; i < Math.ceil(VAST_STIL_S / 0.1) + 5; i++) hint = stapVast(st, 0.1, inv).hint || hint;
  assert.ok(hint, `${VAST_STIL_S} s vastzitten moet de hint geven`);
});

ok('routestrook: NaN-punt', () => {
  assert.equal(ribbonAlpha(NaN, 80), 0);
  assert.equal(ribbonAlpha(10, NaN), 0);
  assert.ok(ribbonAlpha(40, 80) === 1);
});

ok('camlean: voertuigwissel reset de koers', () => {
  const l = makeLean();
  for (let i = 0; i < 30; i++) stepLean(l, 'car', 0.1, 20, 0, 0.016);
  stepLean(l, 'bike', 2.9, 20, 0, 0.016);
  assert.equal(l.angle, 2.9);
  assert.ok(Math.abs(l.roll) < 1e-3, `roll ${l.roll}`);
});

ok('taxihud: geen NaN of undefined in beeld', () => {
  const m = taxiHudModel({ fase: 'meerijden', rit: undefined, naar: 'Hoofdstation', afstand: NaN, snelheid: 5, limiet: 14, comfort: 90, tijd: NaN });
  const alles = JSON.stringify(m);
  assert.ok(!/NaN|undefined/.test(alles), alles);
  assert.equal(m.cijfers[0].waarde, '-');
  assert.equal(m.cijfers.some((c) => c.label === 'Tijd'), false);
  assert.equal(m.stappen[1].stand, 'nu');
  const dicht = taxiHudModel({ fase: 'meerijden', rit: 2, naar: 'X', afstand: 12.4, snelheid: 0, comfort: 80, tijd: 20.2 });
  assert.equal(dicht.stappen[2].stand, 'nu');
  assert.equal(dicht.cijfers.find((c) => c.label === 'Tijd').waarde, '21 s');
});

ok('distinctPicks', () => {
  for (let s = 1; s < 200; s++) {
    let a = s; const rng = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const vorige = QUAKE_BARKS[s % QUAKE_BARKS.length];
    const k = distinctPicks(QUAKE_BARKS, QUAKE_BARKS.length - 1, rng, vorige);
    assert.equal(new Set(k).size, QUAKE_BARKS.length - 1);
    assert.ok(!k.includes(vorige));
  }
  assert.equal(distinctPicks(['a'], 3).length, 3);
  assert.deepEqual(distinctPicks([], 3), []);
});

// Wereldleven: regels herhalen niet direct, de lijst komt langs, bellen naast elkaar zijn verschillend.
ok('wereldleven: opeenvolgende beurten', () => {
  const roster = lifeRoster(80, 12);
  const mensen = roster.filter((a) => a.kind === 'people');
  assert.ok(mensen.length > 3);
  for (const a of roster.slice(0, 60)) {
    const reeks = []; for (let c = -5; c < 60; c++) reeks.push(lifeLine(a, c));
    if (new Set(reeks).size > 1) for (let i = 1; i < reeks.length; i++) assert.notEqual(reeks[i], reeks[i - 1], `${a.id} herhaalt in beurt ${i}`);
  }
  const uniek = new Set(); for (let c = 0; c < 40; c++) uniek.add(lifeLine(mensen[0], c));
  assert.ok(uniek.size >= 5, `maar ${uniek.size} verschillende regels`);
});
ok('wereldleven: negatieve en grote beurten', () => {
  const a = lifeRoster(80, 12).find((x) => x.kind === 'people');
  for (const c of [-1, -999, 0, 1e6, 12345678]) assert.equal(typeof lifeLine(a, c), 'string');
});
ok('wereldleven: naburige bellen verschillen', () => {
  let gezien = 0;
  for (const day of [3, 17, 40, 81, 120, 200]) {
    const roster = lifeRoster(day, 12.5);
    const hub = roster.find((a) => a.kind === 'people'); if (!hub) continue;
    for (let t = 0; t < 600; t += 3) {
      const sp = lifeSpeakers(roster, hub.x, hub.y, t, day);
      if (sp.length === 2) { gezien++; assert.notEqual(sp[0].text, sp[1].text); }
    }
  }
  assert.ok(gezien > 0);
});

// Simulatie over een jaar: elke dag heeft iets te beleven, en dagen met precies dezelfde evenementen volgen elkaar niet eindeloos op.
ok('wereldleven: een jaar variatie', () => {
  const mensenIds = LIFE_EVENTS.filter((e) => e.kind === 'people').map((e) => e.id);
  const tel = new Map(); let lege = 0, vorige = '', maxZelfde = 0, zelfdeRij = 0;
  for (let d = 0; d < 365; d++) {
    const ev = new Set();
    for (let h = 6; h < 24; h += 0.5) for (const e of lifeEvents(d, h)) if (e.kind === 'people') ev.add(e.id);
    for (const id of ev) tel.set(id, (tel.get(id) || 0) + 1);
    const sleutel = [...ev].sort().join(',');
    if (!ev.size) lege++;
    zelfdeRij = sleutel === vorige ? zelfdeRij + 1 : 0; vorige = sleutel; maxZelfde = Math.max(maxZelfde, zelfdeRij);
  }
  for (const id of mensenIds) assert.ok((tel.get(id) || 0) > 10, `${id} komt bijna nooit voor: ${tel.get(id) || 0} dagen`);
  assert.equal(lege, 0, 'een dag zonder enig mensenevenement');
  assert.ok(maxZelfde < 6, `${maxZelfde + 1} dagen achter elkaar precies hetzelfde`);
});

ok('bus: NaN-dt of NaN-snelheid laat de deuren werken', () => {
  const b = makeBediening();
  toggleDeuren(b, 0);
  stepBediening(b, NaN, NaN); stepBediening(b, -1, 0);
  assert.ok(Number.isFinite(b.doorOpen) && Number.isFinite(b.kneelAmt));
  for (let i = 0; i < 20; i++) stepBediening(b, 0.1, 0);
  assert.equal(b.doorOpen, 1);
  toggleDeuren(b, 0); for (let i = 0; i < 20; i++) stepBediening(b, 0.1, 0);
  assert.ok(deurenDicht(b));
});

ok('FOV: NaN herstelt zichzelf', () => {
  const fx = { cameraSway: 1 };
  assert.ok(Number.isFinite(stepFov(NaN, 20, 0.016, fx)));
  assert.ok(Number.isFinite(stepFov(3, NaN, 0.016, fx)));
  assert.ok(Number.isFinite(stepFov(3, 20, NaN, fx)));
  assert.equal(stepFov(3, 20, -5, fx), 3);
});

// Navigatie: twee groepsdoelen op (bijna) dezelfde afstand laten de pijl niet elk beeld wisselen.
ok('navtarget: hysterese op het actieve doel', () => {
  const sp = { x: 0, y: 0 };
  const groep = (a, b) => [{ x: a, y: 0, name: 'A' }, { x: 0, y: b, name: 'B' }];
  let vorig = null, wissels = 0, last = null;
  for (let i = 0; i < 200; i++) {
    const a = 300 + 12 * Math.sin(i / 3), b = 300 - 12 * Math.sin(i / 3); // om en om net dichterbij
    const r = resolveNavTargets({ speler: sp, modus: 'auto', groep: groep(a, b), vorig });
    assert.ok(r.actief);
    vorig = { type: r.actief.type, id: r.actief.id };
    const wie = r.actief.name; if (last && wie !== last) wissels++; last = wie;
  }
  assert.equal(wissels, 0, `${wissels} keer gewisseld`);
  // zonder vorig doel verandert niets: nog steeds het dichtstbijzijnde
  assert.equal(resolveNavTargets({ speler: sp, modus: 'auto', groep: groep(100, 300) }).actief.name, 'A');
  // en een veel dichterbij doel wint nog altijd van het vorige
  const sterk = resolveNavTargets({ speler: sp, modus: 'auto', groep: groep(100, 300), vorig: { type: 'groep', id: 'groep:B' } });
  assert.equal(sterk.actief.name, 'A');
  assert.ok(HYSTERESE < 1);
});

ok('taxi: afzetten ook als je al bent uitgestapt', () => {
  assert.equal(afzettenKlaar({ inTaxi: true, naastTaxi: true, snelheid: 0.2, afstand: 5 }), true);
  assert.equal(afzettenKlaar({ inTaxi: false, naastTaxi: true, snelheid: 0, afstand: 8 }), true);
  assert.equal(afzettenKlaar({ inTaxi: false, naastTaxi: false, snelheid: 0, afstand: 3 }), false); // je staat ver weg: de rit loopt door
  assert.equal(afzettenKlaar({ inTaxi: true, snelheid: 6, afstand: 3 }), false); // te hard
  assert.equal(afzettenKlaar({ inTaxi: true, snelheid: 0, afstand: 12 }), false);
  assert.equal(afzettenKlaar({ inTaxi: true, snelheid: 0, afstand: NaN }), false);
});
ok('randgevallen: NaN-plek en plas zonder grenzen', () => {
  assert.equal(regionAt(NaN, 5), 'stad');
  assert.equal(regionAt(9000, 0), 'oost');
  assert.deepEqual(algaePatches({ id: 1, area: 1e9 }, 4, () => true), []);
  const roster = lifeRoster(80, 12); const hub = roster.find((a) => a.kind === 'people');
  assert.deepEqual(lifeSpeakers(roster, NaN, hub.y, 5, 80), []);
});

console.log(`verfijn_wereld_test: ${n} groepen ok`);
