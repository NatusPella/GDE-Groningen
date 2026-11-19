// Bouwsteen G0b: sjablonen voor races en checkpointmissies (cinetemplates.js, racedecor.js,
// de dressingplannen in missiedecor.js). Een gefabriceerde route gaat erin; het plan, de
// cutscene-definitie, de weg-snap, het publiek en het opruimen worden gedragsmatig gecontroleerd.
//   node scripts/cinetemplates_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const T = await import('../game/js/cinetemplates.js');
const { compileScene, validateScene, roadPathDef } = await import('../game/js/cutscript.js');
const { crowdPlan, crowdSpecToWorld, claimCrowd, releaseCrowd, crowdClaimCount } = await import('../game/js/crowdplan.js');
const { buildCheckpointRaceDecor, updateCheckpointRaceDecor, disposeCheckpointRaceDecor, buildStartLights, setStartLights, raceDecorPlan } = await import('../game/js/racedecor.js');
const { dressingPlan, buildMissionDressing, updateMissionDressing, disposeMissionDressing, DRESSING_KINDS } = await import('../game/js/missiedecor.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// Een gefabriceerde route met een bocht: 120 m oost, een bocht naar het noorden, 70 m rechtuit.
const ROUTE = [[1000, 500], [1120, 500], [1160, 530], [1160, 600]];

// --- de route -----------------------------------------------------------------
{
  const info = T.routeInfo(ROUTE);
  ok(info && Math.abs(info.len - (120 + 50 + 70)) < 1e-6, 'routeInfo meet de lengte', info && String(info.len));
  ok(Math.abs(info.start.a) < 1e-9 && Math.abs(info.finish.a - Math.PI / 2) < 1e-9, 'begin- en eindkoers volgen het eerste en laatste stuk');
  ok(T.routeInfo([[0, 0]]) === null && T.routeInfo([[0, 0], [0, 0]]) === null && T.routeInfo(null) === null, 'een ongeldige route geeft null');
  const mid = info.at(120);
  ok(Math.abs(mid.x - 1120) < 1e-6 && Math.abs(mid.y - 500) < 1e-6, 'at(s) volgt de route');
}

// --- het startsein ------------------------------------------------------------
{
  const seq = [-1, 0, 1, 2, 3.5].map((t) => T.startSignalState(t));
  ok(seq[0].lit === 0 && !seq[0].go, 'voor het sein brandt niets');
  ok(seq[1].lit === 1 && seq[2].lit === 2 && seq[3].lit === 3, 'de rode lichten komen een voor een');
  ok(!seq[3].go && seq[4].go, 'daarna groen');
  ok(T.startSignalState(0).goAt === T.startSignalState(99).goAt && T.startSignalState(0).goAt > 2, 'de klok heeft één startmoment');
  const scene = new THREE.Scene();
  const h = buildStartLights({ map: { groundHeightAt: () => 0 } }, { x: 0, y: 0, a: 0.3 }, { scene });
  ok(h && h.lamps.length === 3 && h.group.parent === scene, 'het startlicht heeft drie lampen');
  setStartLights(h, 1.0);
  const reds = h.lamps.filter((m) => m.material.color.getHex() === 0xff2a1a).length;
  setStartLights(h, 9);
  ok(reds === 2 && h.lamps.every((m) => m.material.color.getHex() === 0x22cc44), 'de lampen volgen de klok: twee rood, dan alles groen');
}

// --- dressing voor een checkpointrace -----------------------------------------
{
  const plan = T.raceDressingPlan(ROUTE);
  ok(plan.kind === 'checkpoint' && plan.start.title === 'START' && plan.finish.title === 'FINISH', 'een checkpointrace krijgt een start en een finish');
  ok(Math.abs(plan.start.x - 1000) < 1e-6 && Math.abs(plan.finish.y - 600) < 1e-6, 'de bogen staan op de route');
  ok(plan.crowds.length === 2 && plan.crowds[1].spec.count > plan.crowds[0].spec.count, 'meer publiek bij de finish dan bij de start');
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: () => 0 } };
  const h = buildCheckpointRaceDecor(world, ROUTE, { key: 'test:m05', scene });
  ok(!!h && h.groups.length === 2 && h.crowds.length === 2, 'het decor bouwt twee bogen en twee groepen publiek');
  ok(h.crowds.every((c) => c.members.length >= 20), 'beide groepen zijn een echt publiek', h.crowds.map((c) => c.members.length).join());
  // het publiek staat niet op de route
  const routeDist = (x, y) => { let best = Infinity; for (let i = 1; i < ROUTE.length; i++) { const [ax, ay] = ROUTE[i - 1], [bx, by] = ROUTE[i]; const dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u)); } return best; };
  ok(h.crowds.every((c) => c.members.every((m) => routeDist(m.x, m.y) >= 3.5 - 1e-6)), 'het publiek blijft van het parcours af');
  ok(buildCheckpointRaceDecor(world, ROUTE, { key: 'test:m05', scene }).crowds.length === 0, 'dezelfde sleutel bouwt het publiek niet dubbel');
  updateCheckpointRaceDecor(h, 0.1, { x: 1000, y: 500 }, 1);
  disposeCheckpointRaceDecor(h);
  ok(crowdClaimCount() === 0, 'het publiek geeft zijn sleutels terug');
  ok(!scene.children.some((o) => o.name === 'crowd' || o.name.startsWith('crowd-')), 'het publiek is opgeruimd');
  // de oude finish-plannen blijven zoals ze waren
  ok(raceDecorPlan().people.length === 8 && raceDecorPlan().poles.length === 2, 'raceDecorPlan is ongewijzigd');
  ok(T.raceDressingPlan([[0, 0]]) === null, 'zonder route geen plan');
  // een lege scène en een route die kapot is bouwen niets
  ok(buildCheckpointRaceDecor(world, [[0, 0]], { scene }) === null, 'een kapotte route bouwt niets');
}

// --- de finish-cinematic ------------------------------------------------------
const fin = T.raceFinishScene(ROUTE, { id: 'test.finish', speed: 14 });
{
  ok(!!fin && fin.def.id === 'test.finish', 'raceFinishScene geeft een definitie');
  ok(Math.abs(fin.anchor.x - 1160) < 1e-6 && Math.abs(fin.anchor.y - 600) < 1e-6 && Math.abs(fin.anchor.facing - Math.PI / 2) < 1e-9, 'het anker staat op de finishlijn, in de rijrichting');
  const issues = validateScene(fin.def, { lines: [], duration: fin.def.duration });
  ok(issues.length === 0, 'de definitie is een geldige scène', issues.join(' | '));
  ok(T.crowdIssues(fin.def).length === 0, 'het publiek in de scène is geldig');
  const shots = fin.def.shots;
  ok(shots.length === 4 && shots[0].t === 0 && shots.every((s, i) => i === 0 || s.t > shots[i - 1].t), 'vier camerastanden met oplopende tijden: overzicht, volg, finishlijn, reactie');
  ok(shots.map((s) => s.shot).join() === 'crane,dolly,cut,handheld', 'de camerasjablonen zijn de verwachte soorten');
  ok(fin.def.props.wagen.road === true, 'het voertuig volgt de echte weg');
  const sc = compileScene(fin.def, { lines: [], duration: fin.def.duration });
  const at = (t) => sc.sample(t, fin.anchor).props.wagen;
  const start = at(0), end = at(fin.def.duration);
  ok(Math.hypot(start.x - 1160, start.y - 530) < 8, 'het voertuig begint ruim 60 m voor de lijn (op het bochtstuk)', JSON.stringify(start));
  const arrive = (70 / 14);
  const onLine = at(arrive);
  ok(Math.hypot(onLine.x - 1160, onLine.y - 600) < 2.5, 'op de aankomsttijd is het voertuig op de finishlijn', JSON.stringify(onLine));
  ok(end.y > 600, 'daarna rijdt het door voorbij de lijn');
  // de camera blijft in beeld bij het voertuig (geen verre cut): de afstand tot de wagen is begrensd
  let maxD = 0;
  for (let t = 0; t < fin.def.duration; t += 0.5) { const s = sc.sample(t, fin.anchor); maxD = Math.max(maxD, Math.hypot(s.camera.position.x - s.props.wagen.x, s.camera.position.y - s.props.wagen.y)); }
  ok(maxD < 60, 'de camera blijft bij het voertuig', maxD.toFixed(1));
  ok(T.raceFinishScene([[0, 0]]) === null, 'een kapotte route geeft geen scène');
  const nocrowd = T.raceFinishScene(ROUTE, { crowd: 0 });
  ok(nocrowd.def.crowd === undefined, 'zonder publiek staat er geen crowd in de definitie');
}

// --- de start -----------------------------------------------------------------
{
  const st = T.raceStartScene(ROUTE, { id: 'test.start' });
  const issues = validateScene(st.def, { lines: [], duration: st.def.duration });
  ok(issues.length === 0, 'de startscène is geldig', issues.join(' | '));
  const sc = compileScene(st.def, { lines: [], duration: st.def.duration });
  const p0 = sc.sample(0, st.anchor).props.wagen, pEnd = sc.sample(st.signal.goAt - 0.1, st.anchor).props.wagen, pGo = sc.sample(st.def.duration - 0.2, st.anchor).props.wagen;
  ok(Math.hypot(p0.x - pEnd.x, p0.y - pEnd.y) < 0.2, 'het voertuig wacht tot het sein groen is');
  ok(Math.hypot(pGo.x - p0.x, pGo.y - p0.y) > 10, 'en rijdt dan weg');
}

// --- de weg-snap en het publiek: niemand wordt overreden -------------------------
{
  // de echte weg ligt 1,5 m naast de getekende route (rechter rijbaan) en volgt dezelfde bocht
  const road = { cat: 'major', pts: [[1000, 501.5], [1120, 501.5], [1161.5, 531.5], [1161.5, 640]] };
  const onRoad = (x, y) => {
    let best = null;
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (!best || d < best.d) best = { d, x: ax + dx * t, y: ay + dy * t, road };
    }
    return best;
  };
  const map = { nearestRoadPoint: (x, y, r = 400) => { const c = onRoad(x, y); return c && c.d <= r ? c : null; }, roadsNear: () => [road] };
  const routed = roadPathDef(fin.def, { ...fin.anchor }, map, { duration: fin.def.duration });
  ok(!!routed, 'de weg-snap zet de finishscène op de echte weg');
  const paths = T.roadPropPaths(routed);
  ok(paths.length === 1 && paths[0].length >= 5, 'roadPropPaths vindt het gesnapte pad');
  const world = paths[0].map(([f, s]) => { const c = Math.cos(fin.anchor.facing), sn = Math.sin(fin.anchor.facing); return [fin.anchor.x + f * c - s * sn, fin.anchor.y + f * sn + s * c]; });
  ok(world.every(([x, y]) => onRoad(x, y).d < 0.35), 'het voertuig blijft op de weg (geen kortsluiting door de bocht)');

  // een strak publiek (side 2) tegen het pad: zonder vrijhouden staan er figuren op de rijlijn
  const tight = crowdSpecToWorld({ shape: 'line', pts: [[-60, 0], [10, 0]], count: 40, side: 2, spread: 1, seed: 4 }, fin.anchor);
  const without = crowdPlan(tight, null);
  const clear = T.pathClearCircles([world], 3.2);
  const withClear = crowdPlan({ ...tight, clear }, null);
  ok(T.vehicleConflicts(world, without.members, 2.4).length > 0, 'controle: zonder vrijhouden staat iemand op het pad van het voertuig');
  ok(withClear.members.length >= 8 && T.vehicleConflicts(world, withClear.members, 3.0).length === 0, 'met vrijhouden staat niemand op het pad (geen doorrijden door figuren)');
  // en tijdens de scène: het voertuig komt nooit binnen 2,4 m van een figuur
  const sc = compileScene(routed, { lines: [], duration: routed.duration });
  let minD = Infinity;
  for (let t = 0; t < routed.duration; t += 0.2) { const w = sc.sample(t, fin.anchor).props.wagen; for (const m of withClear.members) minD = Math.min(minD, Math.hypot(w.x - m.x, w.y - m.y)); }
  ok(minD >= 2.4, 'het voertuig rijdt nergens door of langs een figuur heen', minD.toFixed(2));
}

// --- de voertuigsjablonen -----------------------------------------------------
{
  const v = T.vehicleCues('x', [[0, 0], [30, 0]], { kind: 'bestelbus', speed: 8 });
  ok(v.props.x.kind === 'bestelbus' && v.props.x.road === true && v.cues[0].speed === 8, 'een voertuigsjabloon zet het voertuig op de weg');
  ok(T.vehicleCues('f', [[0, 0], [30, 0]], { kind: 'fiets' }).props.f.road === 'cycle', 'een fiets volgt het fietspad');
  let threw = false; try { T.vehicleCues('x', [[0, 0], [1, 0]], { kind: 'tank' }); } catch (e) { threw = true; }
  ok(threw, 'een onbekend voertuig wordt geweigerd');
  ok(T.cameraTemplate('onzin').length === 0 && T.CAMERA_TEMPLATES.every((k) => T.cameraTemplate(k, { t0: 2 })[0].t === 2), 'elke camerasjabloon begint op de gevraagde tijd');
}

// --- de plannen voor plein, stuntarena, kade en perron ------------------------
{
  for (const kind of ['plein', 'stuntarena', 'kade', 'perron']) {
    ok(DRESSING_KINDS.includes(kind), kind + ': staat in de lijst');
    const p = dressingPlan(kind);
    ok(p && p.crowd && p.props.length >= 6 && p.people.length >= 3, kind + ': props, figuranten en een publiek', p && String(p.props.length));
  }
  ok(dressingPlan('stuntarena').crowd.count === 12 && dressingPlan('stuntarena').props.filter((q) => q.kind === 'hek').length === 12, 'de stuntarena: twaalf hekken en twaalf toeschouwers');
  ok(dressingPlan('plein').props.some((q) => q.kind === 'jurytafel') && dressingPlan('plein').props.filter((q) => q.kind === 'kraam').length >= 4, 'het plein: een jurytafel en kramen');
  ok(dressingPlan('perron').props.some((q) => q.kind === 'perronbord') && dressingPlan('kade').props.some((q) => q.kind === 'kist'), 'het perron heeft een bord en de kade kisten');
  ok(dressingPlan('naspeling').crowd === null && dressingPlan('schuur').crowd === null, 'de oude plannen hebben geen publiek en blijven zoals ze waren');
  // een kopie: een aanroeper kan het gedeelde plan niet veranderen
  const a = dressingPlan('kade'); a.crowd.pts[0][0] = 999; a.crowd.count = 1;
  ok(dressingPlan('kade').crowd.pts[0][0] !== 999 && dressingPlan('kade').crowd.count === 20, 'dressingPlan geeft een kopie van het publiek');

  for (const kind of ['plein', 'stuntarena', 'kade', 'perron']) {
    const scene = new THREE.Scene();
    // een kaart met een gebouw, water en een weg: het publiek mijdt ze
    const mapx = {
      groundHeightAt: () => 0,
      buildingsNear: () => [{ bounds: [-30, 20, -20, 28], pts: [[-30, 20], [-20, 20], [-20, 28], [-30, 28]] }],
      waterNear: () => [],
      roadsNear: () => [{ cat: 'normal', width: 6, pts: [[-60, -30], [60, -30]], bounds: [-60, -33, 60, -27] }],
    };
    const set = buildMissionDressing({ map: mapx }, kind, { x: 0, y: 0, a: 0 }, scene);
    ok(!!set && !!set.crowd && set.crowd.members.length >= 8, kind + ': de aankleding bouwt een publiek', String(set && set.crowd && set.crowd.members.length));
    if (!set || !set.crowd) continue;
    const bld = (x, y) => x > -30 && x < -20 && y > 20 && y < 28;
    const rd = (x, y) => Math.abs(y + 30) < 3.5;
    ok(set.crowd.members.every((m) => !bld(m.x, m.y) && !rd(m.x, m.y)), kind + ': het publiek staat niet in het gebouw of op de weg');
    ok(set.crowd.members.every((m) => Math.hypot(m.x, m.y) >= 4.5 - 1e-9), kind + ': het publiek blijft buiten de stage-cirkel');
    updateMissionDressing(set, 0.1, { x: 0, y: 0 });
    updateMissionDressing(set, 0.1);
    const keyed = crowdClaimCount();
    const again = buildMissionDressing({ map: mapx }, kind, { x: 0, y: 0, a: 0 }, scene);
    ok(again && !again.crowd, kind + ': een tweede aankleding op dezelfde plek bouwt het publiek niet dubbel');
    disposeMissionDressing(again);
    ok(crowdClaimCount() === keyed, kind + ': de tweede aankleding laat de sleutel van de eerste staan');
    disposeMissionDressing(set);
    ok(scene.children.length === 0 && crowdClaimCount() === 0, kind + ': alles is opgeruimd');
  }
}
releaseCrowd('x');
void claimCrowd;

console.log(fails ? `${fails} van ${n} mislukt` : `cinetemplates_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
