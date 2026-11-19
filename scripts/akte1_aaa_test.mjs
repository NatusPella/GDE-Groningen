// AAA-upgrade van akte 1 (M01 tot M06): gedrag van de pure delen (akte1_plan.js) en van de laag tussen bouwstenen en
// runner (akte1_aaa.js), met de echte defs van M05 en M01. Geen bronregex: alles draait.
//   node scripts/akte1_aaa_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const P = await import('../game/js/akte1_plan.js');
const T = await import('../game/js/cinetemplates.js');
const { kaartVan, startKaart, tikKaart, meldKaart } = await import('../game/js/regelkaart.js');
const { buildDefsVoorMuseum } = await import('../game/js/missions_defs.js');
const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const { KEI_ROUTE } = await import('../game/js/keiroute.js');
const A = await import('../game/js/akte1_aaa.js');
const { crowdClaimCount } = await import('../game/js/crowdplan.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// --- M05: finishsting, bijna, finishcamera ---------------------------------------------------------------------
ok(P.finishSting(1) === 'goud' && P.finishSting(2) === 'zilver' && P.finishSting(3) === 'brons', 'het podium krijgt goud, zilver, brons');
ok(P.finishSting(4) === null && P.finishSting(0) === null && P.finishSting(NaN) === null && P.finishSting(undefined) === null, 'buiten het podium en bij rommel geen medaillesting');
ok(P.bijnaMoment(7, false) && !P.bijnaMoment(7, true) && !P.bijnaMoment(20, false) && !P.bijnaMoment(0, false) && !P.bijnaMoment(null, false) && !P.bijnaMoment(NaN, false), 'bijna: één keer, alleen tussen 0 en 8 seconden');
{
  const fin = { x: 100, y: 50, a: 0 };
  const pose = P.finishPose(fin, { x: 80, y: 50 }, 0);
  ok(pose && [pose.position.x, pose.position.y, pose.position.z, pose.lookAt.x, pose.lookAt.y, pose.lookAt.z, pose.fov].every(eindig), 'de finishpose is eindig');
  ok(pose.position.x > fin.x && Math.abs(pose.position.y - fin.y) > 5, 'de camera staat voorbij de lijn en naast de baan');
  ok(pose.lookAt.x === 80, 'de camera kijkt naar wie er aankomt');
  const later = P.finishPose(fin, { x: 99, y: 50 }, 3);
  ok(later.position.x > pose.position.x && later.fov < pose.fov, 'de camera leeft: schuift weg en zoomt in');
  ok(P.finishPose(null, { x: 0, y: 0 }) === null && P.finishPose(fin, { x: NaN, y: 0 }) === null && P.finishPose({ x: 1 }, { x: 0, y: 0 }) === null, 'een kapotte invoer geeft geen pose (de gewone camera blijft)');
  ok(eindig(P.finishPose({ x: 1, y: 2, a: NaN }, { x: 0, y: 0 }, NaN).position.x), 'een onbekende koers of tijd geeft toch een eindige pose');
}

// --- M05: de ronde, het startlicht, het publiek ----------------------------------------------------------------
{
  const plan = T.raceDressingPlan(KEI_ROUTE);
  ok(plan && plan.loop === true, 'de Kei-race wordt herkend als ronde');
  ok(plan.start.x === plan.finish.x && plan.start.y === plan.finish.y && plan.start.title === 'START / FINISH', 'één boog op de lijn, geen twee op vijf meter');
  ok(plan.crowds.length === 1 && plan.crowds[0].spec.count >= 40, 'één groot publiek langs de lijn');
  const rechtdoor = T.raceDressingPlan([[0, 0], [100, 0], [200, 0]]);
  ok(!rechtdoor.loop && rechtdoor.crowds.length === 2 && rechtdoor.start.title === 'START', 'een gewone race houdt start en finish apart');
  // het startlicht loopt met de aftelling van racers.js mee
  const lit = (f, t) => T.startSignalState(T.raceLichtTijd(f, t));
  ok(lit('grid', 3).lit === 0 && !lit('grid', 3).go, 'tijdens het wachten op de grid brandt niets');
  ok(lit('countdown', 0).lit === 1 && lit('countdown', 1.1).lit === 2 && lit('countdown', 2.1).lit === 3 && !lit('countdown', 2.99).go, 'in het aftellen komt elke seconde een rood licht bij');
  ok(lit('race', 0).go && lit('race', 40).go, 'bij Start! is het groen');
  ok(T.raceLichtTijd('countdown', NaN) === 0 && T.raceLichtTijd(undefined) === -1, 'rommel zet het licht uit');
}
{
  const world = { map: { groundHeightAt: () => 0 }, time: 0 };
  const scene = new THREE.Scene();
  const { buildCheckpointRaceDecor, updateCheckpointRaceDecor, disposeCheckpointRaceDecor } = await import('../game/js/racedecor.js');
  const h = buildCheckpointRaceDecor(world, KEI_ROUTE, { key: 'test:kei', scene });
  ok(h && h.groups.length === 1, 'de ronde krijgt één boog', h && String(h.groups.length));
  ok(h.crowds.length === 1 && h.crowds[0].members.length >= 20, 'en een echt publiek', h && h.crowds.map((c) => c.members.length).join());
  // het publiek staat nooit op de fietsbaan
  const dRoute = (x, y) => { let best = Infinity; for (let i = 1; i < KEI_ROUTE.length; i++) { const [ax, ay] = KEI_ROUTE[i - 1], [bx, by] = KEI_ROUTE[i]; const dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u)); } return best; };
  ok(h.crowds[0].members.every((m) => dRoute(m.x, m.y) >= 3.5 - 1e-6), 'het publiek blijft van de baan af');
  updateCheckpointRaceDecor(h, 0.1, { x: KEI_ROUTE[0][0], y: KEI_ROUTE[0][1] }, T.raceLichtTijd('countdown', 1.5));
  const reds = h.lights.lamps.filter((m) => m.material.color.getHex() === 0xff2a1a).length;
  ok(reds === 2, 'het startlicht toont twee rood bij 1,5 s aftellen', String(reds));
  disposeCheckpointRaceDecor(h);
  ok(crowdClaimCount() === 0, 'opruimen geeft de publieksleutels terug');
}

// --- M06: korte handelingen die nooit mislukken -------------------------------------------------------------------
{
  const st = { kind: 'fuse', kort: {} };
  ok(P.maakKort({ kind: 'fuse' }) === null, 'een stap zonder `kort` blijft de oude handeling');
  const k = P.maakKort(st);
  ok(k && k.tijd === P.KORT_STANDAARD.fuse && k.voortgang === 0, 'een korte handeling heeft een standaardtijd');
  ok(P.maakKort({ kind: 'crack', kort: { time: 99 } }).tijd === 8 && P.maakKort({ kind: 'lock', kort: { time: 0.1 } }).tijd === 1, 'de tijd is begrensd tussen 1 en 8 seconden');
  let t = 0;
  while (!k.klaar && t < 20) { P.tikKort(k, 0.1, { binnen: true, vast: true }); t += 0.1; }
  ok(k.klaar && Math.abs(t - k.tijd) < 0.25, 'vasthouden bij de prop maakt hem af in de tijd van de stap', String(t));
  // loslaten of weglopen: zakt terug, nooit onder de helft van het gehaalde, en mislukt nooit
  const z = P.maakKort({ kind: 'crack', kort: { time: 4 } });
  for (let i = 0; i < 30; i++) P.tikKort(z, 0.1, { binnen: true, vast: true }); // 3 s van 4
  const top = z.voortgang;
  for (let i = 0; i < 600; i++) P.tikKort(z, 0.1, { binnen: false, vast: false }); // een minuut weglopen
  ok(!z.klaar && z.voortgang >= top * P.KORT_VLOER - 1e-9 && z.voortgang <= top, 'weglopen zakt terug maar nooit onder de helft van het gehaalde');
  for (let i = 0; i < 80 && !z.klaar; i++) P.tikKort(z, 0.1, { binnen: true, vast: true });
  ok(z.klaar, 'terugkomen en vasthouden maakt hem alsnog af');
  const w = P.maakKort({ kind: 'lock', kort: {} });
  for (let i = 0; i < 100; i++) P.tikKort(w, 0.1, { binnen: false, vast: true });
  ok(w.voortgang === 0 && !w.klaar, 'E zonder bij de prop te staan doet niets');
  const d = P.maakKort({ kind: 'lock', kort: {} });
  P.tikKort(d, NaN, { binnen: true, vast: true }); P.tikKort(d, -5, { binnen: true, vast: true }); P.tikKort(d, 9999, { binnen: true, vast: true });
  ok(eindig(d.voortgang) && d.voortgang <= 1 && d.voortgang >= 0, 'rommel in dt geeft nooit een kapotte voortgang');
  const pr = P.kortPrompt(st, k, { x: 3, y: 4 });
  ok(pr && pr.key === 'E' && pr.ring && pr.cooldown > 0 && /stroomkast/i.test(pr.label), 'de prompt noemt de prop en de toets');
  ok(P.kortPrompt(st, null, { x: 1, y: 1 }) === null && P.kortPrompt(st, k, { x: NaN, y: 1 }) === null, 'zonder staat of plek geen prompt');
  // de defs van M06: geen enkele kraakstap kan nog falen door timing (kort) behalve de lasers en het slot die al hulp geven
}

// --- de defs van M05 en M01 ---------------------------------------------------------------------------------------
const stubMap = { roadsNear: () => [], walkNear: () => [], groundHeightAt: () => 0, openSpotNear: (x, y) => ({ x, y }) };
const spot = (x, y) => ({ x, y, road: null });
const m05 = buildDefsVoorMuseum({ map: stubMap, walk: spot, drive: spot })[2];
ok(m05.race === 'kei' && Array.isArray(m05.decorRoute) && m05.decorRoute.length === KEI_ROUTE.length, 'M05 heeft zijn route voor de aankleding');
{
  const kv = kaartVan(m05);
  ok(kv && kv.doel && kv.druk && kv.afloop && kv.regels.length >= 2 && kv.regels.length <= 3, 'de kaart van M05 heeft doel, tijd, afloop en hoogstens drie regels');
  const s = startKaart(m05, 'M05');
  const eerste = tikKaart(s, 0.016);
  ok(eerste && /podium/.test(eerste.body), 'het eerste kaartje is het doel');
  const stil = tikKaart(s, 3);
  ok(stil === null, 'drie seconden later nog niets (één kaartje tegelijk)');
  let t = 3, gezien = [];
  while (t < 40) { const c = tikKaart(s, 0.5); t += 0.5; if (c) gezien.push(c); }
  ok(gezien.length === 2, 'daarna twee regels op eigen tijd, de derde pas bij "bijna"', String(gezien.length));
  meldKaart(s, 'bijna');
  const bijna = tikKaart(s, 0.5);
  ok(bijna && /bijna/i.test(bijna.body), 'de "bijna"-regel komt na de melding');
  ok(m05.intro[0].length > 20 && /Sjoerd/.test(m05.intro[0]), 'de openingstekst van M05 is niet aangeraakt');
}
let m01 = null;
try { m01 = buildNieuwDefs({ map: stubMap, walk: spot, drive: spot, models: {} }).find((d) => d.label === 'Nul krassen, vijftienhonderd punten'); } catch (e) { console.log('M01 niet te bouwen met een stubkaart:', e.message); }
ok(!!m01, 'M01 is te bouwen');
if (m01) {
  const kv = kaartVan(m01);
  ok(kv && /1500/.test(kv.doel) && kv.regels.length === 3, 'de kaart van M01 heeft doel en drie regels');
  const s = startKaart(m01, 'M01');
  tikKaart(s, 0.016);
  let t = 0; const getoond = [];
  while (t < 30) { const c = tikKaart(s, 0.5); t += 0.5; if (c) getoond.push(c.body); }
  ok(getoond.length === 2 && !s.klaar, 'twee regels vanzelf, de derde wacht op het einde van de stunt');
  meldKaart(s, 'stuntklaar');
  ok(tikKaart(s, 0.5) !== null, 'na de stunt komt het tweede deel in beeld');
  ok(m01.stunt.target === 1500 && m01.stunt.center.x === 168.69, 'de stuntgegevens van M01 zijn ongewijzigd');
}

// --- de laag tussen bouwstenen en runner (akte1_aaa.js) -----------------------------------------------------------
{
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: () => 0 }, time: 0, audioEvents: [], player: { x: KEI_ROUTE[0][0], y: KEI_ROUTE[0][1], inVehicle: null } };
  A.aaaStart(world, m05, { scene });
  ok(A.aaaStand() && A.aaaStand().kei && A.aaaStand().kaart === true, 'M05: de aankleding staat en de kaart van de missie loopt');
  ok(scene.children.some((o) => o.name === 'race-decor'), 'de boog staat in de scène');
  const race = { phase: 'grid', timer: 0 };
  A.aaaTik(world, m05, 0.1, { race, timeLeft: 58, stunt: false });
  ok(!A.aaaStand().bijna, 'bij 58 seconden nog geen waarschuwing');
  A.aaaTik(world, m05, 0.1, { race: { phase: 'race', timer: 0 }, timeLeft: 7, stunt: false });
  ok(A.aaaStand().bijna && world.audioEvents.some((e) => e.kind === 'missiesting' && e.name === 'bijna'), 'bij 7 seconden klinkt de "bijna"-sting, één keer');
  A.aaaTik(world, m05, 0.1, { race: { phase: 'race', timer: 0 }, timeLeft: 6, stunt: false });
  ok(world.audioEvents.filter((e) => e.name === 'bijna').length === 1, 'niet een tweede keer');
  A.aaaCheckpoint(world, m05, { x: 0, y: 0 }, { last: false });
  ok(world.audioEvents.some((e) => e.name === 'stap'), 'een tussenpunt klinkt als "stap"');
  A.aaaCheckpoint(world, m05, { x: 0, y: 0, via: true }, { last: false });
  ok(world.audioEvents.filter((e) => e.name === 'stap').length === 1, 'een via-punt klinkt niet');
  A.aaaCheckpoint(world, m05, { x: 0, y: 0 }, { last: true, plek: 2 });
  ok(world.audioEvents.some((e) => e.name === 'zilver') && A.aaaStand().cam, 'de finish als tweede: zilver en de finishcamera');
  A.aaaOpruimen(world);
  ok(A.aaaStand() === null && crowdClaimCount() === 0, 'opruimen haalt alles weg: aankleding, camera, sleutels');
  A.aaaTik(world, m05, 0.1, {});
  A.aaaCheckpoint(world, m05, { x: 0, y: 0 }, { last: true, plek: 1 });
  A.aaaStuntKlaar(world);
  ok(A.aaaStand() === null, 'haken na het opruimen doen niets en gooien niets');
  // zonder aankleding (geen scène, rommel) loopt de missie gewoon door
  A.aaaStart(world, { label: 'rommel', decorRoute: [[0, 0]] }, { scene });
  ok(A.aaaStand() && !A.aaaStand().kei, 'een kapotte route bouwt niets en breekt niets');
  A.aaaOpruimen(world);
  // de stuntarena van M01 verschijnt pas als de speler dichtbij is en gaat weg als de punten binnen zijn
  if (m01) {
    A.aaaStart(world, m01, { scene });
    ok(A.aaaStand().kaart, 'M01: de kaart staat klaar');
    world.player.x = m01.stunt.center.x + 300; world.player.y = m01.stunt.center.y;
    A.aaaTik(world, m01, 0.1, { timeLeft: 200, stunt: true });
    ok(!A.aaaStand().arena, 'ver weg (300 m) staat de arena nog niet');
    world.player.x = m01.stunt.center.x + 40;
    A.aaaTik(world, m01, 0.1, { timeLeft: 200, stunt: true });
    ok(A.aaaStand().arena && scene.children.some((o) => o.name === 'mission-dressing-stuntarena'), 'dichtbij (40 m) staat de stuntarena');
    A.aaaTik(world, m01, 0.1, { timeLeft: 200, stunt: false });
    A.aaaStuntKlaar(world);
    ok(!A.aaaStand().arena && !scene.children.some((o) => o.name === 'mission-dressing-stuntarena'), 'na de stunt staat er geen arena meer');
    A.aaaTik(world, m01, 0.1, { timeLeft: 200, stunt: true });
    ok(!A.aaaStand().arena, 'en hij komt niet terug');
    A.aaaOpruimen(world);
  }
}

console.log(`akte1_aaa_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
