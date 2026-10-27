// Spelbot (#312): vliegen, stunten, racen en varen, zonder Electron.
//   node scripts/bot_vlieg_test.mjs
// De vier vaardigheden van de spelbot zijn pure regels (game/js/botlogic.js, scripts/bot/nav.mjs,
// scripts/bot/race.mjs, scripts/bot/stunt.mjs); dit bestand laat ze tegen de *spelregels* lopen:
//  1. vliegen: de poorten van M15 (planestage.js judgeGate), met de echte missiedefinitie, en een
//     volledige vlucht op het echte vliegmodel (arcadeplane.js): opstijgen, vijf poorten in volgorde,
//     circuit en een landing op de strook. Dat is wat een Electron-run daarna in beeld bevestigt;
//  2. stunten: de drift van M01 begint binnen het venster van vehicle.js (handrem boven 9 m/s, volle
//     lock) en levert punten volgens stuntavond.js (slip boven 2,2 m/s, 30 punten per halve seconde);
//  3. racen: drie ronden op de echte kartbaan (kartbaanspoor.js) met het echte kartmodel
//     (kartrace.js stepKart) en de pure kartregels van race.mjs;
//  4. varen: een zeilboot langs de kades (twee oevers 120 m uit elkaar), met de echte zeilregels
//     (zeilvaren.js zeilStap + zeilrules.js) en het roeiritme van de sloep.
// Geen THREE-scene, geen DOM, geen netwerk, geen Math.random: elke run is dezelfde.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import './node3d.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);

const L = await imp('game/js/botlogic.js');
const A = await imp('game/js/arcadeplane.js');
const PC = await imp('game/js/planecontrol.js');
const { judgeGate } = await imp('game/js/planestage.js');
const { buildNieuwDefs } = await imp('game/js/missions_nieuw.js');
const N = await imp('scripts/bot/nav.mjs');
const Rc = await imp('scripts/bot/race.mjs');
const St = await imp('scripts/bot/stunt.mjs');
const KR = await imp('game/js/kartrace.js');
const { KARTBAAN_TRACK } = await imp('game/js/kartbaanspoor.js');
const ZV = await imp('game/js/zeilvaren.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// De echte M15-definitie, zoals het verhaal hem bouwt (geen kaart nodig: alleen de startpunten).
const defs = buildNieuwDefs({ map: { meta: { landmarks: [] } }, walk: (x, y) => ({ x, y, road: null }), drive: (x, y) => ({ x, y, road: null }) });
const m15 = defs.find((d) => d.label === 'Laag over het graan');
ok(!!m15, 'M15 Laag over het graan staat in het verhaal');
const gates = m15.stages[1].gates;
const stripSpec = m15.stages[0].strip;

// --- 1. vliegen: welke poort, hoe hoog, hoe ver -------------------------------------------------
{
  ok(gates.length === 5 && m15.stages[1].kind === 'airgates', 'M15 heeft vijf poorten', String(gates.length));
  ok(gates[0].banner === true && gates[0].lo === 3, 'de eerste poort pikt het spandoek op, laag');
  // de missie zet haar marker op de poort waar ze is: de eerste ring die de marker houdt is de poort
  for (let k = 0; k < gates.length; k++) {
    const aim = L.gateAim(gates, { x: gates[k].x, y: gates[k].y });
    ok(aim.i === k, `marker op poort ${k + 1}: gateAim kiest die poort`, `koos ${aim.i + 1}`);
    ok(Math.abs(aim.alt - (gates[k].lo + gates[k].hi) / 2) < 0.001, `poort ${k + 1}: hoogte midden in de band`, String(aim.alt));
    ok(aim.from === 0 && aim.aim.x === gates[k].x, `poort ${k + 1}: afstand en mikpunt kloppen`);
  }
  // de poorten van de kermis liggen 168 m uit elkaar: een marker op poort 3 mag poort 4 niet kiezen
  const p3 = gates[2], p4 = gates[3];
  ok(Math.hypot(p4.x - p3.x, p4.y - p3.y) < 200, 'de kermispoorten liggen dicht bij elkaar', String(Math.round(Math.hypot(p4.x - p3.x, p4.y - p3.y))));
  const tussen = L.gateAim(gates, { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 });
  ok(tussen.i === 2, 'een marker tussen poort 3 en 4 kiest de eerste (geen poort overslaan)', `koos ${tussen.i + 1}`);
  // een marker ver van alle ringen (een waypoint van de missie): de dichtstbijzijnde
  const naast4 = L.gateAim(gates, { x: p4.x + 400, y: p4.y });
  ok(naast4.i === gates.length - 1, 'een marker naast poort 4 kiest de dichtstbijzijnde poort', `koos ${naast4.i + 1}`);
  ok(L.gateAim([], null) === null && L.gateAim(null, { x: 0, y: 0 }) === null, 'zonder poorten geen mikpunt');
  // elke poort is bereikbaar: de band ligt onder het plafond van het vliegtuig en de ring is wijder dan de rolbaan
  for (const g of gates) {
    ok(g.lo < g.hi && g.hi <= A.PLANE.ceiling, `poort ${g.label}: een echte hoogteband`, `${g.lo}-${g.hi}`);
    ok(g.r >= 25, `poort ${g.label}: de ring is wijd genoeg`, String(g.r));
  }
}

// --- 1b. vliegen: opstijgen, vijf poorten, circuit, landen (echte vliegmodel) --------------------
{
  const strip = PC.makeStrip(stripSpec);
  const start = strip.point(strip.length * 0.45);            // zoals planestage.js de kist neerzet
  const p = A.makePlane(start.x, start.y, 0, strip.heading);
  const ctl = { thr: 0, flaps: 0, gear: true };
  const DT = 1 / 60;
  const groundAt = () => 0;                                  // de polder is vlak; de bot rekent in agl
  const onRunway = (x, y) => strip.contains(x, y);
  let t = 0, gi = 0, phase = null, landed = false, rose = false, maxAgl = 0;
  let state = { closest: Infinity, agl: 0 };
  const passed = [];
  while (t < 600) {
    const agl = p.z - groundAt();
    maxAgl = Math.max(maxAgl, agl);
    const g = gates[gi];
    const keys = g
      ? L.planeKeys(p, { agl, goal: { x: g.x, y: g.y }, alt: (g.lo + g.hi) / 2, mode: 'fly' })
      : L.planeKeys(p, { agl, goal: start, alt: 30, mode: 'land', strip: stripSpec, phase });
    if (!g) phase = keys.phase;
    A.stepPlane(p, PC.planeInput((k) => keys.has(k), ctl, DT), DT, groundAt, onRunway);
    t += DT;
    if (!p.onGround) rose = true;
    if (p.crashed) break;
    if (g) {
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      const r = judgeGate(g, state, d, agl);                 // de spelregel van de missie zelf
      if (r === 'pass') { passed.push({ i: gi, t: Math.round(t), agl: Math.round(agl) }); gi++; state = { closest: Infinity, agl: 0 }; }
      else if (r) { ok(false, `poort ${gi + 1} gemist (${r})`, `${Math.round(d)} m, ${Math.round(agl)} m hoog op ${Math.round(t)} s`); break; }
    } else if (p.onGround && p.speed < 2 && strip.contains(p.x, p.y)) { landed = true; break; }
  }
  ok(rose, 'de kist komt van de strook', String(Math.round(maxAgl)));
  ok(gi === gates.length, 'alle vijf poorten gevlogen, in volgorde', `${gi}/${gates.length}`);
  ok(passed.every((q, k) => q.i === k), 'de poorten zijn in de volgorde van de missie gevlogen', passed.map((q) => q.i + 1).join(','));
  ok(passed.length === 5 && passed.every((q) => q.agl >= gates[q.i].lo && q.agl <= gates[q.i].hi), 'elke poort op de hoogte van zijn band', passed.map((q) => q.agl).join(','));
  ok(landed, 'de kist landt op de strook', `t=${Math.round(t)} s`);
  ok(p.landing === 'zacht', 'de landing is zacht', String(p.landing));
  ok(!p.crashed, 'geen crash');
  ok(landed && Math.abs(-(p.x - stripSpec.x) * Math.sin(stripSpec.heading) + (p.y - stripSpec.y) * Math.cos(stripSpec.heading)) < 23, 'de landing staat op de strook, niet ernaast');
  ok(t < 600, 'de hele vlucht past in tien minuten', `${Math.round(t)} s`);
  ok(passed.length && passed[0].t < 30, 'de eerste poort snel na het opstijgen', `${passed[0] && passed[0].t} s`);
  // het systeem dat de vlucht te lang duurt is de time-out van bot.page.js (420 s per stap): de vlucht moet
  // daar ruim onder blijven, anders grijpt de reddingsladder in
  ok(t < 420, 'de vlucht blijft onder het time-outbudget van 420 s', `${Math.round(t)} s`);
  // de toetsen zijn nooit alle remmen tegelijk: gas en rem samen is geen vliegen
  const both = [...L.planeKeys({ x: 0, y: 0, z: 40, heading: 0, speed: 40, pitch: 0, roll: 0, vz: 0, onGround: false, throttle: 0.5 }, { agl: 40, goal: { x: 500, y: 0 }, alt: 40, mode: 'fly' })];
  ok(!(both.includes('w') && both.includes('shift')), 'gas en rem gaan niet samen');
}

// --- 2. stunten: de drift van M01 binnen de regels van het spel --------------------------------
{
  const vehicle = readFileSync(path.join(root, 'game/js/vehicle.js'), 'utf8');
  const stuntavond = readFileSync(path.join(root, 'game/js/stuntavond.js'), 'utf8');
  const handrem = Number((vehicle.match(/brake > 0 && absSpeed > (\d+(?:\.\d+)?) && Math\.abs\(steerInput\) > (\d+(?:\.\d+)?)/) || [])[1]);
  const scoreS = Number((stuntavond.match(/slip > (\d+(?:\.\d+)?) && Math\.abs\(v\.speed\) > (\d+(?:\.\d+)?)/) || [])[1]);
  const scoreV = Number((stuntavond.match(/slip > \d+(?:\.\d+)? && Math\.abs\(v\.speed\) > (\d+(?:\.\d+)?)/) || [])[1]);
  const perS = Number((stuntavond.match(/const DRIFT_PER_S = (\d+)/) || [])[1]);
  ok(handrem === 9, 'vehicle.js: de handremdrift begint boven 9 m/s', String(handrem));
  ok(scoreS === 2.2 && scoreV === 6, 'stuntavond.js: punten vanaf 2,2 m/s slip en 6 m/s', `${scoreS}/${scoreV}`);
  ok(perS === 60, 'stuntavond.js: 60 punten per seconde driften', String(perS));
  // de bot zet de handrem pas boven de drempel van het spel, met volle lock (anders slaat de drift niet aan)
  ok(St.STUNT.startSpeed > handrem, 'de stunt begint boven de drempel van 9 m/s', String(St.STUNT.startSpeed));
  ok(St.STUNT.runTop > St.STUNT.startSpeed, 'de aanloop is sneller dan de startdrempel');
  const tik = St.STUNT.slideS / 0.5;                        // punten gaan per halve seconde
  ok(St.STUNT.slideS * perS >= 300, 'een slid van 5,5 s levert ruim 300 punten', String(St.STUNT.slideS * perS));
  ok(1500 / (perS / 2) * 0.5 < St.STUNT.budget, 'de vijftienhonderd punten passen in het tijdsbudget', `${Math.round(1500 / perS)} s < ${St.STUNT.budget} s`);
  // de fasen van de stunt, met de getallen van het spel ernaast
  const s = (q = {}) => ({ x: 0, y: 0, angle: 0, speed: 0, score: 0, target: 1500, anchor: { x: 0, y: 0 }, walker: Infinity, ...q });
  const mem = {};
  ok(St.stuntStep(s(), mem, 0).phase === 'aanloop', 'stilstaand: eerst de aanloop');
  const glij = St.stuntStep(s({ speed: St.STUNT.startSpeed }), mem, 1);
  ok(glij.phase === 'glij' && glij.handbrake === true && Math.abs(glij.steer) === 1, 'boven de drempel op het driftpunt: handrem en volle lock', JSON.stringify(glij));
  ok(Math.abs(glij.steer) > 0.3, 'de lock haalt de 0,3 van vehicle.js');
  ok(St.stuntStep(s({ speed: St.STUNT.startSpeed, walker: 3 }), { ...mem, phase: 'glij' }, 2).phase === 'aanloop', 'een wandelaar binnen 4 m: de slid stopt');
  const wandelaar = {};
  St.stuntStep(s({ speed: 0 }), wandelaar, 0);
  ok(St.stuntStep(s({ speed: 12, walker: 6 }), wandelaar, 1).phase === 'aanloop', 'geen nieuwe slid met een wandelaar binnen 9 m');
  const klok = {};
  St.stuntStep(s({ score: 0 }), klok, 0);
  ok(St.stuntStep(s({ score: 20 }), klok, St.STUNT.budget + 1).phase === 'timeout', 'geen punten meer: een time-out voor de ladder', String(St.STUNT.budget));
  const klaar = St.stuntStep(s({ score: 1500 }), {}, 0);
  ok(klaar.phase === 'klaar' && klaar.score === 1500, 'vijftienhonderd punten: de stunt is klaar');
  // de punten van een slid zoals het spel ze telt (30 per halve seconde), tegen de tijd van de bot
  let punten = 0;
  for (let t2 = 0; t2 < St.STUNT.slideS; t2 += 0.5) punten += perS * 0.5;
  ok(punten === 330, 'een slid van 5,5 s telt 330 punten in het spel', String(punten));
  ok(tik === 11, 'elf telmomenten in een slid', String(tik));
}

// --- 3. racen: drie ronden op de echte kartbaan ------------------------------------------------
{
  const track = KARTBAAN_TRACK;
  ok(track.N > 100 && track.hw > 3, 'de kartbaan van Ulrum is geladen', `${track.N} punten, ${Math.round(track.length)} m`);
  const k = KR.createKart(track, 0, { player: true, name: 'bot' });
  const mem = {};
  const DT = 1 / 60;
  let t = 0, laps = [], off = 0, drifts = 0, maxOff = 0;
  while (t < Rc.RACE.raceS && !k.finished) {
    const step = Rc.kartStep({ phase: 'race', kart: k, others: [] }, track, mem, t);
    if (step.type === 'timeout') { ok(false, `kart: ${step.why}`, `${Math.round(step.forS)} s`); break; }
    if (step.type === 'klaar') break;
    const inp = { throttle: step.throttle, steer: step.steer, drift: step.drift };
    if (step.drift) drifts++;
    const ev = KR.stepKart(k, inp, DT, track);
    const lap = KR.updateProgress(k, track, t);
    if (lap) laps.push(Math.round(lap.time * 10) / 10);
    t += DT;
    maxOff = Math.max(maxOff, Math.abs(k.off));
    if (k.grass) off++;
    void ev;
  }
  ok(k.finished, 'drie ronden gereden', `${k.lap} ronden in ${Math.round(t)} s`);
  ok(k.lap >= KR.LAPS, 'de uitslag telt drie ronden', String(k.lap));
  ok(k.prog >= KR.LAPS * track.length - 10, 'de afgelegde afstand klopt met de baan', `${Math.round(k.prog)} m`);
  ok(laps.length >= 3, 'elke ronde is geklokt', laps.join(' / '));
  ok(maxOff < track.hw + KR.RUNOFF, 'de kart blijft binnen de baan en de uitloop', `${Math.round(maxOff)} m, baan half ${track.hw}`);
  ok(off / (t / DT) < 0.2, 'de kart raakt hooguit even het gras', `${Math.round(100 * off / (t / DT))}%`);
  // de drift drempel van de bot ligt binnen die van het spel (kartrace.js driftMin 9)
  ok(Rc.RACE.driftMin > KR.KART.driftMin, 'de bot driftt pas boven de drempel van het spel', `${Rc.RACE.driftMin} > ${KR.KART.driftMin}`);
  ok(drifts > 0, 'de bot driftt in de bochten', String(drifts));
  // de uitslag: de eigen plek uit de stand van de baan
  const uitslag = Rc.raceResult({ karts: [k] }, 0);
  ok(uitslag && uitslag.plek === 1 && uitslag.klaar === true && uitslag.rondes === 3, 'de uitslag noemt de eigen plek en de ronden', JSON.stringify(uitslag));
  // de startlichten en de time-outs: een race die niet op gang komt is een bevinding, geen eindeloze run
  ok(Rc.kartStep({ phase: 'grid', kart: k }, track, {}, 0).type === 'wacht', 'bij de startlichten wacht de bot');
  ok(Rc.kartStep({ phase: 'grid', kart: k }, track, { gridAt: 0 }, Rc.RACE.gridS + 1).type === 'timeout', 'startlichten die niet uitgaan: time-out');
}

// --- 4. varen: een zeilboot langs de kades ------------------------------------------------------
{
  // De vaart: een recht stuk water van 600 m met twee kades 120 m uit elkaar (de botsing van het spel zelf
  // staat hier niet; de boot moet er zelf tussen blijven). Een dwarswind langs de kades: de route volgen is het
  // werk, het kruisen staat in scripts/botlogic_test.mjs en scripts/bot/sim_nav.mjs.
  const WIND = { dir: Math.PI / 2, speed: 7 };                // wind uit +y: langs de kades is het een dwarswind
  const HALF = 60;                                           // de kade: 60 m van de hartlijn
  const route = [{ x: 200, y: 0 }, { x: 400, y: 20 }, { x: 600, y: 0 }];
  const DT = 0.1;
  const boat = { x: 0, y: 0, angle: 0, speed: 0, zeilTrim: 0.6, omgeslagen: 0, helling: 0, sailTop: 0 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  let t = 0, i = 0, maxOff = 0, turnovers = 0, beste = Infinity;
  while (t < 900 && i < route.length) {
    const c = N.sailControls(boat, { goal: route[i], wind: WIND, dt: DT });
    ZV.zeilStap(boat, WIND, { trim: c.trim }, DT);            // de echte zeilregels: trim, helling, omslaan
    if (boat.omgeslagen > 0) turnovers++;
    boat.angle = N.wrap(boat.angle + c.steer * 0.9 * clamp(boat.speed / 1.5, 0.5, 1) * DT);
    boat.x += Math.cos(boat.angle) * boat.speed * DT;
    boat.y += Math.sin(boat.angle) * boat.speed * DT;
    const d = Math.hypot(route[i].x - boat.x, route[i].y - boat.y);
    beste = Math.min(beste, d);
    maxOff = Math.max(maxOff, Math.abs(boat.y - (i === 1 ? 20 : 0)));
    if (d < 15) i++;
    t += DT;
  }
  ok(i === route.length, 'de zeilboot haalt alle drie de kades', `${i}/${route.length}, dichtstbij ${Math.round(beste)} m`);
  ok(maxOff < HALF, 'de boot blijft tussen de kades', `${Math.round(maxOff)} m van de hartlijn, kade op ${HALF}`);
  ok(turnovers === 0, 'de boot slaat niet om', String(turnovers));
  ok(t < 900, 'de tocht past binnen een kwartier', `${Math.round(t)} s`);
  // pal tegen de wind in kruist hij (anders komt hij nooit aan de overkant)
  const tegen = N.sailControls({ x: 0, y: 0, angle: 0, speed: 3, zeilTrim: 0.6 }, { goal: { x: 400, y: 0 }, wind: { dir: 0, speed: 7 }, dt: DT });
  ok(tegen.tacking === true, 'pal tegen de wind in: hij kruist');
  const dood = N.sailControls({ x: 0, y: 0, angle: 0, speed: 3, zeilTrim: 0.6, omgeslagen: 2 }, { goal: { x: 400, y: 0 }, wind: WIND, dt: DT });
  ok(dood.tacking === false && dood.note === 'omgeslagen', 'na een omslag doet hij even niets');
  // het roeiritme van de sloep: elke 1,25 s een slag, en de slagen brengen hem vooruit
  ok(N.rowDue(1.3, 0) && !N.rowDue(0.4, 0) && N.rowDue(8, undefined), 'roeien: een slag per 1,25 s');
  const sloep = { x: 0, y: 0, angle: 0, speed: 0, roeiSt: {}, roeiTop: 0 };
  let now = 10, vorig = null, slagen = 0;
  for (let s2 = 0; s2 < 200; s2++) {
    const tik = N.rowDue(now, vorig);
    if (tik) { vorig = now; slagen++; }
    ZV.roeiStap(sloep, tik, now, 0.2);
    now += 0.2;
  }
  ok(slagen > 10 && sloep.speed > 1, 'de sloep komt vooruit op het ritme', `${slagen} slagen, ${Math.round(sloep.speed * 10) / 10} m/s`);
  ok(sloep.roeiTop > 0 && sloep.roeiTop <= 4, 'het ritme houdt hem onder de topsnelheid van de roeiboot', String(Math.round(sloep.roeiTop * 10) / 10));
}

// de twee paginascripts die deze regels aansturen moeten ten minste nog parseerbaar zijn (ze zijn geen
// module: ze hebben een top-level return, dus wikkel ze zoals de browser ze uitvoert)
for (const f of ['scripts/bot/bot.page.js', 'scripts/bot/minigames.page.js']) {
  let goed = true, fout = '';
  try { new Function(`return (async () => {\n${readFileSync(path.join(root, f), 'utf8')}\n})`); } catch (e) { goed = false; fout = e.message; }
  ok(goed, `${f} is parseerbaar`, fout);
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
