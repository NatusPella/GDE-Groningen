// Spelbot (#186): de pure logica van game/js/botlogic.js, zonder Electron:
//   node scripts/botlogic_test.mjs
// statusschema, besturing van de doelvolger, vastzit-detectie, replay-formaat en rapport.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'game', 'js', 'botlogic.js')).href);
// #312: de heli- en zeilbesturing van de bot (scripts/bot/nav.mjs) en de regels waar ze op lijken
const N = await import(pathToFileURL(path.join(root, 'scripts', 'bot', 'nav.mjs')).href);
// #312: de board-stage met een voertuig van de bot (scripts/bot/board.mjs): welk voertuig, waar instappen, time-out
const Bd = await import(pathToFileURL(path.join(root, 'scripts', 'bot', 'board.mjs')).href);
const Z = await import(pathToFileURL(path.join(root, 'game', 'js', 'zeilrules.js')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// --- seed ----------------------------------------------------------------------
{
  const a = L.seededRandom(7), b = L.seededRandom(7), c = L.seededRandom(8);
  const xs = Array.from({ length: 5 }, a), ys = Array.from({ length: 5 }, b), zs = Array.from({ length: 5 }, c);
  ok(xs.every((v, i) => v === ys[i]), 'zelfde seed, zelfde reeks');
  ok(xs.some((v, i) => v !== zs[i]), 'andere seed, andere reeks');
  ok(xs.every((v) => v >= 0 && v < 1), 'waarden in [0, 1)');
}

// --- colonne (M23): de leider wacht op de laatste ------------------------------------
{
  ok(L.convoyPace([10, 20, 30], 11) === 11, 'colonne: bij elkaar, volle snelheid');
  ok(L.convoyPace([], 11) === 11, 'colonne: zonder leden volle snelheid');
  ok(L.convoyPace([10, 100], 11) === 11, 'colonne: de rij zelf is ongeveer 100 m lang, dat is geen achterstand');
  ok(L.convoyPace([10, 130], 11) < 11 && L.convoyPace([10, 130], 11) >= 3, 'colonne: 130 m achter, rustig aan');
  ok(L.convoyPace([10, 165], 11) === 0, 'colonne: ver achter, stilstaan');
  ok(L.convoyPace([110], 11) > L.convoyPace([140], 11), 'colonne: hoe verder achter, hoe trager');
}

// --- voetstick: inverse van player.js cameraRelativeMove ----------------------------
{
  const move = (ax, ay, camYaw) => { const c = Math.cos(camYaw), s = Math.sin(camYaw); return Math.atan2(s * -ay + c * ax, c * -ay - s * ax); };
  for (const cam of [0, 1, -2.5, 3]) {
    for (const h of [0, 0.7, -1.9, 3.0]) {
      const [x, y] = L.footStick(h, cam);
      ok(near(Math.hypot(x, y), 1), `stick heeft lengte 1 (${cam}, ${h})`);
      ok(near(L.normAngle(move(x, y, cam) - h), 0, 1e-9), `stick loopt richting ${h} bij camera ${cam}`);
    }
  }
}

// --- auto: sturen en gas -------------------------------------------------------------
{
  const car = { x: 0, y: 0, angle: 0, speed: 0 };
  const straight = L.carControls(car, { x: 100, y: 0 });
  ok(straight.steer === 0 && straight.throttle === 1, 'rechtdoor: gas, geen sturen');
  ok(L.carControls(car, { x: 0, y: 50 }).steer > 0, 'doel rechts (y naar het zuiden) geeft stuur naar rechts');
  ok(L.carControls(car, { x: 0, y: -50 }).steer < 0, 'doel links geeft stuur naar links');
  const fast = L.carControls({ ...car, speed: 30 }, { x: 100, y: 0 }, { top: 20 });
  ok(fast.throttle === -1, 'te snel: remmen');
  const behind = L.carControls({ ...car, speed: 10 }, { x: -50, y: 1 });
  ok(behind.want < 6, 'scherpe bocht: langzamer');
  const rev = L.carControls({ ...car, speed: 0 }, { x: -50, y: 20 });
  ok(rev.reverse && rev.throttle === -1 && rev.steer < 0, 'doel achter ons: achteruit met omgekeerd stuur');
  ok(!L.carControls({ ...car, speed: 15 }, { x: -50, y: 20 }).reverse, 'met vaart niet in de achteruit');
  const rest = L.carControls({ ...car, speed: 4 }, { x: 2, y: 0 }, { stopAt: true, rest: 3.5 });
  ok(rest.want === 0 && rest.throttle === -1, 'binnen de rustafstand: remmen tot stilstand');
  const stop = L.carControls({ ...car, speed: 12 }, { x: 8, y: 0 }, { stopAt: true });
  ok(stop.throttle === -1, 'bij het doel afremmen');
}

// --- klem ---------------------------------------------------------------------------------
{
  const w = new L.WedgeDetector({ afterS: 2 });
  ok(!w.update(0, 0, 1) && !w.update(1.9, 0.1, 1), 'nog niet lang genoeg klem');
  ok(w.update(2.1, 0.2, 1), 'gas zonder beweging: klem');
  w.reset();
  ok(!w.update(3, 0, 1), 'reset begint opnieuw');
  ok(!w.update(9, 0, 0), 'zonder gas is stilstaan geen klem');
  ok(!w.update(10, 5, 1) && !w.update(11, 0, 1), 'rijden zet de klok terug');
}

// --- pad volgen -------------------------------------------------------------------------
{
  const f = new L.PathFollower([[0, 0], [10, 0], [20, 0], [20, 20]], { reach: 3 });
  ok(f.length === 4 && !f.done, 'pad heeft vier punten');
  let a = f.next({ x: 0, y: 0 });
  ok(a.x === 10 && a.y === 0, 'eerste punt bereikt: op naar het volgende');
  a = f.next({ x: 19, y: 0 });
  ok(a.x === 20 && a.y === 20, 'punt bereikt: op naar het laatste');
  ok(f.next({ x: 20, y: 19 }) === null && f.done, 'laatste punt bereikt: klaar');
  ok(near(new L.PathFollower([[0, 0], [30, 0], [30, 40]]).remaining({ x: 0, y: 0 }), 70), 'resterende lengte');
}

// --- vastzitten --------------------------------------------------------------------------
{
  const d = new L.StuckDetector({ windowS: 10, minGain: 3 });
  let r;
  for (let t = 0; t <= 8; t++) r = d.update(t, { x: 0, y: 0, goalDist: 100 - t * 5, key: 'M01' });
  ok(!r.stuck, 'dichterbij komen is voortgang');
  for (let t = 9; t <= 17; t++) r = d.update(t, { x: 0, y: 0, goalDist: 60, key: 'M01' });
  ok(!r.stuck && r.idleFor < 10, 'nog net geen venster zonder voortgang');
  r = d.update(18, { x: 0, y: 0, goalDist: 60, key: 'M01' });
  ok(r.stuck, 'tien seconden zonder winst: vast');
  d.acknowledge(19);
  ok(!d.update(20, { x: 0, y: 0, goalDist: 60, key: 'M01' }).stuck && d.stuckCount === 1, 'na een redding een nieuw venster');
  r = d.update(40, { x: 0, y: 0, goalDist: 60, key: 'M02' });
  ok(!r.stuck && d.stuckCount === 0, 'andere stap begint opnieuw');
  // zonder afstand telt verplaatsing
  const e = new L.StuckDetector({ windowS: 5, minMove: 4 });
  for (let t = 0; t <= 4; t++) e.update(t, { x: t * 5, y: 0, key: 'k' });
  ok(!e.update(4.5, { x: 20, y: 0, key: 'k' }).stuck, 'bewegen is voortgang zonder doelafstand');
  ok(e.update(12, { x: 20, y: 0, key: 'k' }).stuck, 'stilstaan is vast zonder doelafstand');
  // cutscenes tellen niet mee
  const h = new L.StuckDetector({ windowS: 10 });
  h.update(0, { x: 0, y: 0, goalDist: 50, key: 'k' });
  for (let t = 1; t <= 30; t++) h.hold(t);
  ok(!h.update(31, { x: 0, y: 0, goalDist: 50, key: 'k' }).stuck, 'hold pauzeert de klok');
  {
    // een omweg (de afstand tot het doel wordt eerst groter) is geen vastzitten zolang de bot beweegt; na hardS wel
    const d = new L.StuckDetector({ windowS: 30, hardS: 150 });
    let stuck = false, x = 0;
    for (let t = 1; t <= 140; t++) { x += 3; stuck = d.update(t, { x, y: 0, goalDist: 100 + x, key: 'k' }).stuck || stuck; }
    ok(!stuck, 'omweg: bewegen telt als voortgang');
    for (let t = 141; t <= 200; t++) { x += 3; stuck = d.update(t, { x, y: 0, goalDist: 100 + x, key: 'k' }).stuck || stuck; }
    ok(stuck, 'omweg zonder ooit dichterbij: na hardS toch vast');
    const w = new L.StuckDetector({ windowS: 30 });
    let ws = false;
    for (let t = 1; t <= 40; t++) ws = w.update(t, { x: 1 + (t % 2), y: 0, goalDist: 50, key: 'k' }).stuck || ws;
    ok(ws, 'wippen op één plek blijft vast');
  }
  ok(L.rescueFor(0) === 'nudge' && L.rescueFor(1) === 'teleport' && L.rescueFor(2) === 'objective' && L.rescueFor(3) === 'win' && L.rescueFor(4) === 'skip' && L.rescueFor(9) === 'skip', 'redding loopt op, laatste sport is skip');
  ok(!L.isCheat('nudge') && L.isCheat('teleport'), 'een duwtje is geen cheat');
  {
    // M01: op het plein komt de auto niet dichter bij het doel, maar de score van de stunt klimt; dat is de voortgang (#387)
    const rondje = (t, score) => ({ x: 170 + Math.cos(t / 8) * 26, y: 70 + Math.sin(t / 8) * 26, goalDist: 3, key: 'M01:stunt', score });
    const metScore = new L.StuckDetector({ windowS: 30 });
    let vals = null;
    for (let t = 0; t <= 260; t++) { const r = metScore.update(t, rondje(t, Math.min(1500, t * 12))); if (r.stuck && vals == null) vals = t; }
    ok(vals === null, 'een stunt die punten scoort is geen vastzitten (M01)');
    const zonder = new L.StuckDetector({ windowS: 30 });
    let echt = null;
    for (let t = 0; t <= 260; t++) { const r = zonder.update(t, { ...rondje(t, null), score: null }); if (r.stuck && echt == null) echt = t; }
    ok(echt === 150, 'zonder score is hetzelfde rondje op het plein na hardS wel vast');
    const stil = new L.StuckDetector({ windowS: 30 });
    let stilVast = null;
    for (let t = 0; t <= 260; t++) { const r = stil.update(t, rondje(t, Math.min(600, t * 12))); if (r.stuck && stilVast == null) stilVast = t; }
    ok(stilVast != null && stilVast >= 195, 'een score die blijft hangen is na hardS toch vast');
  }
  {
    // een tak die zijn eigen klok bijhoudt (duif, vliegtuig) krijgt een eigen budget (#387)
    const w = new L.TaskWatch({ budget: 60 });
    const a = w.update('duif', 'ziel1', 10);
    ok(!a.tooLong && a.forS === 0, 'nieuwe taak: de klok begint');
    const b = w.update('duif', 'ziel1', 69);
    ok(!b.tooLong && Math.round(b.forS) === 59, 'nog binnen het budget');
    const c = w.update('duif', 'ziel1', 70);
    ok(c.tooLong && Math.round(c.forS) === 60 && c.budget === 60, 'budget op: tijd op');
    ok(!w.update('duif', 'ziel2', 200).tooLong, 'ander doel: de klok begint opnieuw');
    ok(!w.update('vliegtuig', 'x', 300).tooLong, 'andere tak: de klok begint opnieuw');
    w.reset();
    ok(!w.update('duif', 'ziel1', 999).tooLong, 'reset: de klok begint opnieuw');
  }
}

// --- beslissen ----------------------------------------------------------------------------
{
  const base = () => ({ v: 1, t: 1, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: null }, story: {}, mission: { active: false }, hud: { messages: [] }, blocking: {}, nearby: { vehicles: [] }, target: { x: 50, y: 0, distance: 50, source: 'missie' } });
  ok(L.decide({ ...base(), blocking: { pauseMenu: true } }).type === 'closemenu', 'pauzemenu sluiten');
  ok(L.decide({ ...base(), blocking: { dialog: { options: [{ key: '2', label: 'x' }] } } }).key === '2', 'dialoog: eerste optie');
  ok(L.decide({ ...base(), blocking: { cinematic: true } }).type === 'skip', 'cutscene overslaan');
  ok(L.decide({ ...base(), blocking: { ride: true } }).type === 'skip', 'reisscène (meerijden) overslaan');
  const shopA = L.decide({ ...base(), blocking: { shop: true } }, {});
  ok(shopA.type === 'shop' && shopA.n === 1, 'open winkel: kopen');
  ok(L.decide({ ...base(), blocking: { talk: true } }).type === 'wait', 'gesprek afwachten');
  ok(L.decide({ ...base(), mission: { active: true, stage: 'goto' }, blocking: { talk: true } }).type === 'goto', 'gesprek in een missie: doorlopen');
  ok(L.decide({ ...base(), target: null }).type === 'wait', 'zonder doel wachten');
  ok(L.decide(base()).mode === 'walk', 'dichtbij: lopen');
  { const occ = L.decide({ ...base(), target: { x: 14, y: 0, distance: 14, source: 'missie' }, mission: { active: true, stage: 'board' }, nearby: { vehicles: [{ x: 5, y: 0, distance: 5, free: true, drivable: true, kind: 'auto', occupied: true }, { x: 30, y: 0, distance: 30, free: true, drivable: true, kind: 'auto', occupied: false }] } }, {}); ok(occ.type === 'enter' && occ.vehicle.x === 30, 'een auto met bestuurder laat de bot staan (autodiefstal)'); }
  ok(L.decide({ ...base(), player: { ...base().player, vehicle: { kind: 'auto', speed: 8 } }, hud: { messages: ['Je auto staat in brand! Stap uit (E) voor hij ontploft'] } }, {}).key === 'e', 'brandende auto: uitstappen');
  ok(L.decide({ ...base(), player: { ...base().player, vehicle: { kind: 'fiets', speed: 1 } }, target: { x: 10, y: 0, distance: 10, source: 'winkel' } }, {}).key === 'e', 'bij de winkel van het verhaal: van de fiets af');
  const mvT = { x: 6, y: 0, distance: 6, source: 'missie', vehicle: true }, mvNear = [{ x: 6, y: 0, distance: 6, free: true, drivable: true, kind: 'auto' }, { x: 2, y: 3, distance: 3.6, free: true, drivable: true, kind: 'auto' }];
  const mvFoot = L.decide({ ...base(), mission: { active: true, stage: 'board' }, target: mvT, nearby: { vehicles: mvNear } }, {});
  ok(mvFoot.type === 'enter' && mvFoot.vehicle.x === 6, 'doel is een voertuig: dat voertuig nemen, niet het dichtstbijzijnde');
  ok(L.decide({ ...base(), player: { ...base().player, vehicle: { kind: 'auto', speed: 0 } }, mission: { active: true, stage: 'board' }, target: mvT, nearby: { vehicles: mvNear } }, {}).key === 'e', 'doel is een ander voertuig: eerst uitstappen');
  ok(L.decide({ ...base(), player: { ...base().player, vehicle: { kind: 'auto', speed: 0 } }, mission: { active: true, stage: 'chase' }, target: { ...mvT, distance: 40 }, nearby: { vehicles: mvNear } }, {}).key !== 'e', 'achtervolging: een prooi op afstand is niet het voertuig om in te stappen');
  const inCarPlane = { ...base(), player: { ...base().player, vehicle: { kind: 'auto', speed: 0 } }, mission: { active: true, stage: 'plane' }, nearby: { vehicles: [{ x: 6, y: 0, distance: 6, free: true, drivable: false, kind: 'vliegtuig' }] } };
  ok(L.decide(inCarPlane, {}).key === 'e', 'plane-fase vanuit een auto: eerst uitstappen');
  const far = { ...base(), target: { x: 900, y: 0, distance: 900 }, nearby: { vehicles: [{ x: 5, y: 0, distance: 5, free: true, drivable: true, kind: 'auto' }] } };
  ok(L.decide(far).type === 'enter', 'ver weg en een auto vlakbij: instappen');
  ok(L.decide(far, { boardTries: 3 }).type === 'goto', 'na drie pogingen niet meer instappen');
  const inCar = { ...far, player: { ...far.player, vehicle: { kind: 'auto', speed: 0, angle: 0 } } };
  ok(L.decide(inCar).mode === 'drive', 'in de auto: rijden');
  ok(L.decide({ ...inCar, mission: { onFoot: true } }).key === 'e', 'te voet-missie: uitstappen');
}

// --- stunts, pinnen, loket, minigame-start ---------------------------------------------------
{
  const b = () => ({ v: 1, t: 1, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: null }, story: {}, mission: { active: true, stage: 'goto' }, hud: { messages: [], prompt: '' }, blocking: {}, nearby: { vehicles: [] }, target: { x: 50, y: 0, distance: 50, source: 'missie' } });
  const car = { kind: 'auto', speed: 0, angle: 0 };
  ok(L.isStunt({ ...b(), mission: { label: 'Bakkie-stunt' } }) && L.isStunt({ ...b(), mission: { stage: 'stunt' } }) && !L.isStunt(b()), 'stunt herkend aan label of stage');
  ok(L.isStunt({ ...b(), mission: { label: 'Nul krassen', stunt: { score: 200, target: 1500 } } }) && !L.isStunt({ ...b(), mission: { label: 'Nul krassen', stunt: { score: 1500, target: 1500 } } }), 'stunt herkend aan de stuntscore van de missie (M01), niet meer als het doel gehaald is');
  ok(L.isStunt({ ...b(), mission: { label: 'Nul krassen', stuntSpec: { x: 168, y: 70, radius: 46, target: 1500 } }, target: { x: 168.7, y: 70, distance: 100 } }) && !L.isStunt({ ...b(), mission: { label: 'Nul krassen', stuntSpec: { x: 168, y: 70, radius: 46, target: 1500 } }, target: { x: -22, y: -491, distance: 600 } }), 'stunt herkend aan het doel in het midden van het plein (nog voor de score loopt), niet bij de bezorging');
  const st = L.decide({ ...b(), player: { ...b().player, vehicle: car }, mission: { active: true, label: 'Nul krassen: stunt' } });
  ok(st.mode === 'drive' && st.stunt === true && st.top === 30, 'stunt: snel rijden');
  ok(!L.decide({ ...b(), player: { ...b().player, vehicle: car } }).stunt, 'geen stunt: normaal rijden');
  const atm = { ...b(), target: { x: 2, y: 0, distance: 2 }, hud: { messages: [], prompt: 'E: pinnen' } };
  const pin = L.decide(atm);
  ok(pin.type === 'press' && pin.key === 'e' && pin.interact, 'prompt bij het doel: E drukken');
  ok(L.decide(atm, { pressTries: 4 }).type === 'goto', 'na vier pogingen weer lopen');
  ok(L.decide({ ...atm, target: { x: 90, y: 0, distance: 90 } }).type === 'goto', 'prompt ver van het doel telt niet');
  const board = { ...b(), mission: { active: true, stage: 'board' }, target: { x: 300, y: 0, distance: 300 }, nearby: { vehicles: [{ x: 20, y: 0, distance: 20, free: true, drivable: true, kind: 'auto' }] } };
  ok(L.decide(board).type === 'goto', 'board-stage: eerst naar de ver weg gelegen markering lopen (20 s), niet in de eerste de beste auto');
  ok(L.decide(board, { boardWalkUntil: -1 }).type === 'enter', 'board-stage: daarna toch instappen, ook ver van het doel');
  ok(L.decide(board, { boardTries: 4 }).type === 'goto', 'board-stage: opgeven na vier keer');
  // the car at the marker wins over the nearest one (M22: the Escapade stands among other cars)
  const two = { ...board, target: { x: 30, y: 0, distance: 30 }, nearby: { vehicles: [{ x: 5, y: 0, distance: 5, free: true, drivable: true, kind: 'auto' }, { x: 30, y: 1, distance: 30, free: true, drivable: true, kind: 'auto' }] } };
  ok(L.decide(two).type === 'enter' && L.decide(two).vehicle.x === 30, 'board-stage: de auto bij de markering boven de dichtstbijzijnde');
  // op een fiets bij de board-stage: eerst uitstappen, dan een motorvoertuig boven de fiets die je net verliet
  const onBike = { ...board, player: { ...board.player, vehicle: { kind: 'fiets', speed: 0, angle: 0 } }, nearby: { vehicles: [{ x: 5, y: 0, distance: 5, free: true, drivable: true, kind: 'fiets' }, { x: 20, y: 0, distance: 20, free: true, drivable: true, kind: 'auto' }] } };
  const mb = {};
  ok(L.decide(onBike, mb).key === 'e' && mb.boardTries === 1, 'board-stage op een fiets: uitstappen');
  const inOther = { ...board, player: { ...board.player, vehicle: { kind: 'auto', speed: 0, angle: 0 } }, nearby: { vehicles: [{ x: 4, y: 0, distance: 4, free: true, drivable: true, kind: 'auto' }] } };
  ok(L.decide(inOther, {}).key === 'e', 'board-stage in een andere auto: uitstappen en de auto daar nemen');
  ok(L.decide({ ...inOther, player: { ...inOther.player, vehicle: { kind: 'auto', speed: 12, angle: 0 } } }, {}).type === 'goto', 'in rijdende auto niet uitstappen');
  ok(L.decide(onBike, { boardTries: 4 }).type === 'goto', 'board-stage op een fiets: opgeven na vier keer');
  ok(L.decide({ ...onBike, player: { ...onBike.player, vehicle: null } }, { boardWalkUntil: -1 }).vehicle.kind === 'auto', 'board-stage te voet: motorvoertuig boven de fiets');
  ok(L.decide({ ...b(), mission: { active: true, stage: 'hold' }, target: { x: 1, y: 0, distance: 1 } }).type === 'wait', 'hold-stage: stilstaan in de ring');
ok(L.decide({ ...b(), mission: { active: true, stage: 'hold' }, target: { x: 5, y: 0, distance: 5 } }).type === 'wait', 'hold-stage: ook op 5 m (de ring is 9 m) blijft hij staan');
ok(L.decide({ ...b(), mission: { active: true, stage: 'hold' }, target: { x: 8, y: 0, distance: 8 } }).type === 'goto', 'hold-stage: buiten 5,5 m loopt hij naar de ring');
  const planS = { ...b(), mission: { active: true, stage: 'plan' }, target: { x: 1, y: 0, distance: 1 } };
  const pm = {};
  ok(L.decide(planS, pm).key === 'a' && pm.planTries === 1, 'plan-stage: A kiezen');
  ok(L.decide(planS, { planTries: 3 }).type !== 'press', 'plan-stage: na drie keer niet meer drukken');
  for (const id of ['drift', 'hengelen', 'wandeling', 'pitchputt', 'hoogvlieger', 'geheimen', 'snackketen', 'onbekend']) {
    const a = L.startAttempts(id);
    ok(a.length >= 4 && a[0] === 'e' && a.includes('interact') && a.includes('jitter'), 'start-opening ' + id);
  }
  const a1 = L.startAttempts('drift'); a1.pop();
  ok(L.startAttempts('drift').length === a1.length + 1, 'startAttempts geeft een kopie');
  const o0 = L.jitterOffset(0), o2 = L.jitterOffset(2);
  ok(o0.dx === 3 && o0.dy === 0 && near(o2.dx, 0, 0.01) && o2.dy === 3 && L.jitterOffset(8).dx === 3, 'jitter loopt rond');
}

// --- statusschema ---------------------------------------------------------------------------
{
  const good = { v: 1, t: 3, player: { x: 1, y: 2, angle: 0, camYaw: 0 }, story: {}, mission: {}, hud: { messages: [] }, blocking: {}, nearby: { vehicles: [] }, target: { x: 1, y: 1, distance: 1 } };
  ok(L.validateStatus(good).length === 0, 'geldige status');
  ok(L.validateStatus({ ...good, target: null }).length === 0, 'doel mag ontbreken');
  ok(L.validateStatus({ ...good, v: 2 }).length > 0, 'verkeerde versie');
  ok(L.validateStatus({ ...good, player: { x: NaN, y: 0, angle: 0, camYaw: 0 } }).some((p) => /player\.x/.test(p)), 'NaN in positie wordt gemeld');
  ok(L.validateStatus(null).length === 1, 'geen status');
  // het schema in playerapi.js levert alle velden die de hersenen en het rapport lezen
  const src = readFileSync(path.join(root, 'game', 'js', 'playerapi.js'), 'utf8');
  for (const k of ['player:', 'story:', 'mission:', 'goal:', 'target:', 'hud:', 'blocking:', 'wanted:', 'nearby:', 'subtitle', 'messages']) ok(src.includes(k), `playerapi.js levert ${k}`);
}

// --- replay ------------------------------------------------------------------------------------
{
  const log = new L.RunLog({ seed: 5 });
  log.add(0.5, 'key', { key: 'e', down: true });
  log.add(0.6, 'key', { key: 'e', down: false });
  log.add(1, 'axis', { x: 0.5, y: -1 });
  log.add(2, 'key', { key: 'shift', down: true });
  log.add(3, 'step', { event: 'begin', id: 'M01' });
  const back = L.RunLog.parse(log.toJsonl() + '\n\nkapot{\n');
  ok(back.meta.seed === 5 && back.meta.replay === L.REPLAY_VERSION, 'meta blijft behouden');
  ok(back.events.length === 5, 'kapotte regels worden overgeslagen');
  const ins = back.inputs();
  ok(ins.length === 5 && ins.every((e) => e.type === 'key' || e.type === 'axis'), 'alleen invoer wordt teruggespeeld');
  ok(L.unbalancedKeys(back.events).join() === 'shift', 'shift is nooit losgelaten');
  const rel = ins[ins.length - 1];
  ok(rel.key === 'shift' && rel.down === false, 'replay sluit een open toets af met een keyup');
  ok(L.unbalancedKeys([...back.events, ...ins.filter((e) => e.auto)]).length === 0, 'na de replay is elke keydown gevolgd door een keyup');
  ok(ins.every((e, i) => i === 0 || e.t >= ins[i - 1].t), 'op tijd gesorteerd');
}

// --- rapport --------------------------------------------------------------------------------------
{
  const ev = [
    { t: 0, type: 'step', event: 'begin', id: 'M00', label: 'Opening' },
    { t: 40, type: 'step', event: 'end', id: 'M00' },
    { t: 40, type: 'step', event: 'begin', id: 'M01', label: 'Eerste klus' },
    { t: 50, type: 'mission', event: 'start', id: 'M01', label: 'Eerste klus' },
    { t: 70, type: 'mission', event: 'fail', id: 'M01' },
    { t: 75, type: 'mission', event: 'start', id: 'M01' },
    { t: 100, type: 'stuck', step: 'M01', x: 10, y: 20, idleFor: 31, goalDist: 80 },
    { t: 101, type: 'cheat', rung: 'teleport', step: 'M01', why: '31 s zonder voortgang' },
    { t: 150, type: 'step', event: 'end', id: 'M01' },
    { t: 150, type: 'step', event: 'begin', id: 'M02', label: 'Tweede klus' },
    { t: 151, type: 'console', level: 'error', msg: 'boem' },
    { t: 151, type: 'console', level: 'warning', msg: 'THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN.' },
    { t: 152, type: 'shot', name: 'M01-vast' },
    { t: 153, type: 'key', key: 'e', down: true },
  ];
  const S = L.summarise(ev);
  ok(S.missions.length === 3, 'drie stappen in de samenvatting');
  const m1 = S.missions.find((m) => m.id === 'M01');
  ok(m1.end - m1.start === 110 && m1.fails === 1 && m1.starts === 2 && m1.stuck === 1 && m1.cheats[0] === 'teleport', 'M01: tijd, mislukking, herstart, vast en cheat');
  ok(S.missions.find((m) => m.id === 'M02').end == null, 'M02 is niet af');
  ok(S.nan === 1 && S.consoleErrors.length === 1 && S.warnings === 1, 'console, NaN en waarschuwingen geteld');
  const md = L.buildReport(ev, { title: 'test', seed: 1, result: 'KLAAR' });
  for (const part of ['# Spelbot-rapport: test', '## Tijd per missie', '| M01 | Eerste klus | 1:50 | klaar | 1 | 1 | teleport |', '## Vastzitten', '## Had een cheat nodig', '- 1:41 bij M01: teleport', '## Consolefouten', 'boem', '**1** (computeBoundingSphere)', '**Toetsen zonder keyup:** e', 'shots-M01-vast.png', 'Niet beoordeeld door de bot']) ok(md.includes(part), `rapport bevat: ${part}`);
  ok(L.buildReport([], {}).includes('Geen cheats nodig.'), 'leeg rapport werkt');
  {
    // een run die niet afkwam zegt bovenaan waar hij hing, ook als de laatste twintig minuten niets meer logden (#387)
    const stop = [
      { t: 0, type: 'step', event: 'begin', id: 'M01', label: 'Nul krassen' },
      { t: 200, type: 'step', event: 'end', id: 'M01' },
      { t: 200, type: 'step', event: 'begin', id: 'M04', label: 'Kieken van boven' },
      { t: 260, type: 'timeout', step: 'M04:duif', what: 'duif: hetzelfde fotodoel niet gehaald', forS: 60, x: -110, y: 1060, goalDist: 205, doel: { x: -47, y: 865 } },
      { t: 300, type: 'einde', result: 'TIMEOUT', reason: 'speltijd of echte tijd op', step: 'M04:duif', label: 'Kieken van boven', x: -110, y: 1060, goalDist: 205, inStepS: 100 },
    ];
    const md = L.buildReport(stop, { result: 'TIMEOUT (speltijd of echte tijd op)', gameSeconds: 1761 });
    for (const part of ['## Waar de run stopte', '- Stap: M04:duif (Kieken van boven)', '- Plek: (-110, 1060), 205 m van het doel', '- In deze stap: 1:40', '- Stilte: 24:21 zonder één gebeurtenis', '- Reden: speltijd of echte tijd op', '## Time-outs', 'duif: hetzelfde fotodoel niet gehaald na 60 s bij doel (-47, 865)']) ok(md.includes(part), `rapport na een time-out bevat: ${part}`);
    ok(!L.buildReport(stop, { result: 'KLAAR' }).includes('Waar de run stopte'), 'een afgelopen run heeft geen stopregel');
    ok(L.buildReport([{ t: 5, type: 'status', x: 3, y: 4, step: 'M05', dist: 12 }], { result: 'ONDERBROKEN', gameSeconds: 60 }).includes('- Plek: (3, 4), 12 m van het doel'), 'zonder eindregel: de laatste status zegt waar');
    ok(L.buildReport([{ t: 0, type: 'step', event: 'begin', id: 'M01' }], { result: 'KLAAR' }).includes('## Time-outs\n\nGeen.'), 'geen time-outs: de sectie zegt het');
  }
}

// --- duif-autopilot ---------------------------------------------------------------------------
{
  const f = { x: 0, y: 0, z: 30, ground: 0, yaw: 0 };
  ok(L.pigeonKeys(f, { x: 100, y: 50 }).has('d'), 'duif: doel rechts: D');
  ok(L.pigeonKeys(f, { x: 100, y: -50 }).has('a'), 'duif: doel links: A');
  const straight = L.pigeonKeys(f, { x: 100, y: 0 });
  ok(!straight.has('a') && !straight.has('d'), 'duif: recht vooruit: niet draaien');
  ok(L.pigeonKeys({ ...f, z: 5 }, { x: 100, y: 0 }).has(' '), 'duif: te laag: Spatie');
  ok(L.pigeonKeys({ ...f, z: 90 }, { x: 100, y: 0 }).has('shift'), 'duif: te hoog: Shift');
  ok(L.pigeonKeys({ ...f, z: 30 }, { x: 100, y: 0, z: 60 }).has(' '), 'duif: doelhoogte 60: omhoog');
  const bs = { v: 1, t: 1, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: null, pigeon: true }, story: {}, mission: { active: true }, hud: { messages: [] }, blocking: {}, nearby: { vehicles: [] }, target: { x: 50, y: 0, distance: 50, source: 'missie' } };
  ok(L.decide(bs).type === 'pigeon', 'duifstand: duif vliegen');
}

// --- te voet: een route om kraampalen en andere obstakels heen (#218) ---------------------
{
  // een rij kraampalen met een opening van 1 m, en een dicht muurtje van palen met een omweg rechts
  const rij = [];
  for (let y = -6; y <= 6; y += 1.2) rij.push({ x: 10, y });
  const free = (x, y) => !rij.some((q) => Math.hypot(q.x - x, q.y - y) < 0.9);
  ok(L.segmentFree({ x: 0, y: 0 }, { x: 5, y: 0 }, free), 'vrij stuk is vrij');
  ok(!L.segmentFree({ x: 0, y: 0 }, { x: 20, y: 0 }, free), 'stuk door de paalrij is niet vrij');
  const d = L.detourAround({ x: 0, y: 0 }, { x: 20, y: 0 }, free);
  ok(d && d.length >= 3, 'omweg rond de paalrij gevonden');
  ok(d && d.every((p, i) => i === 0 || L.segmentFree(d[i - 1], p, free)), 'elk stuk van de omweg is vrij');
  ok(d && near(d[d.length - 1].x, 20) && near(d[d.length - 1].y, 0), 'omweg eindigt op het doel');
  const r = L.repairPath([[0, 0], [20, 0], [40, 0]], free);
  ok(r.fixed === 1 && r.pts.length >= 4, 'repairPath herstelt één stuk');
  const dicht = (x, y) => !(x > 9 && x < 11 && y > -60 && y < 60);
  const geen = L.detourAround({ x: 0, y: 0 }, { x: 20, y: 0 }, dicht);
  ok(geen === null, 'een muur zonder omweg geeft null');
  const r2 = L.repairPath([[0, 0], [20, 0]], dicht);
  ok(r2.fixed === 0 && r2.pts.length === 2, 'zonder omweg blijft de route zoals hij was');
  // het doel zelf mag in een obstakel liggen (een voertuig om in te stappen): de omweg komt er toch
  const doelIn = (x, y) => Math.hypot(x - 20, y) > 0.7 && free(x, y);
  const d2 = L.detourAround({ x: 0, y: 0 }, { x: 20, y: 0 }, doelIn);
  ok(d2 && d2.length >= 3, 'doel in een obstakel: toch een route');
}

// een achtervolging: het doel is het voertuig dat wegrijdt, de bot blijft in zijn eigen auto en rijdt erachteraan (#218, M26)
{
  const st = (stage, veh) => ({ v: 1, t: 1, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: veh, pigeon: false }, story: {}, mission: { active: true, stage }, hud: { messages: [] }, blocking: {}, nearby: { vehicles: [] }, target: { x: 80, y: 0, distance: 80, source: 'missie', vehicle: true } });
  const car = { kind: 'auto', x: 0, y: 0, angle: 0, speed: 0 };
  const d = L.decide(st('chase', car), {});
  ok(d.type === 'goto' && d.mode === 'drive', 'achtervolging: de bot rijdt erachteraan en stapt niet uit', JSON.stringify(d));
  const d2 = L.decide(st('board', car), {});
  ok(d2.type === 'press' && d2.key === 'e', 'een board-stap met een voertuig als doel: eerst uitstappen', JSON.stringify(d2));
}

// na een mislukte missie neemt de bot het aanbod 'opnieuw beginnen' (Enter), eenmaal per aanbod (#147: de bot rijdt niet terug naar de start)
{
  const st = (msgs, t, active = false) => ({ v: 1, t, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: null, pigeon: false }, story: {}, mission: { active }, hud: { messages: msgs }, blocking: {}, nearby: { vehicles: [] }, target: { x: 500, y: 0, distance: 500, source: 'missiestart' } });
  const mem = {};
  const a = L.decide(st(['Heel aankomen: opnieuw beginnen? Druk op Enter (of E).'], 100), mem);
  ok(a.type === 'press' && a.key === 'enter', 'het aanbod opnieuw beginnen: Enter', JSON.stringify(a));
  const b = L.decide(st(['Heel aankomen: opnieuw beginnen? Druk op Enter (of E).'], 102), mem);
  ok(b.type !== 'press' || b.key !== 'enter', 'hetzelfde aanbod niet meteen nog een keer');
  const c = L.decide(st(['Heel aankomen: opnieuw beginnen? Druk op Enter (of E).'], 110), mem);
  ok(c.type === 'press' && c.key === 'enter', 'een nieuw aanbod na 8 s: weer Enter');
  const d = L.decide(st([], 200), {});
  ok(!(d.type === 'press' && d.key === 'enter'), 'zonder aanbod geen Enter');
}

// ontwijken in smal verkeer (#354): een fietser of voetganger in de rijstrook buigt het doel weg en begrenst de snelheid
{
  const car = { x: 0, y: 0, angle: 0, speed: 14 };
  const clear = L.avoidance(car, [{ x: 30, y: 9, r: 0.5 }, { x: -10, y: 0, r: 0.5 }]);
  ok(clear.bias === 0 && clear.cap === Infinity && !clear.nearest, 'avoidance: niets in de rijstrook, niets verandert');
  const right = L.avoidance(car, [{ x: 12, y: 1.0, r: 0.6 }]);
  ok(right.bias < 0, 'avoidance: een fietser rechts voor de auto: naar links sturen', String(right.bias));
  const left = L.avoidance(car, [{ x: 12, y: -1.0, r: 0.6 }]);
  ok(left.bias > 0, 'avoidance: een fietser links voor de auto: naar rechts sturen', String(left.bias));
  const ahead = L.avoidance(car, [{ x: 10, y: 0, r: 0.5 }]);
  ok(ahead.bias < 0 && ahead.cap < 14, 'avoidance: precies voor de auto: links langs en afremmen', JSON.stringify(ahead));
  const farL = L.avoidance(car, [{ x: 40, y: 0, r: 0.5 }]);
  ok(farL.bias === 0, 'avoidance: verder dan het zicht telt niet');
  const near2 = L.avoidance(car, [{ x: 3, y: 0.2, r: 0.5 }]);
  ok(near2.cap <= 2, 'avoidance: vlak ervoor: stilstaan', String(near2.cap));
  // een auto die naar het zuiden rijdt (hoek 90 graden): rechts is dan het westen
  const west = L.avoidance({ x: 0, y: 0, angle: Math.PI / 2, speed: 10 }, [{ x: -1, y: 12, r: 0.5 }]);
  const east = L.avoidance({ x: 0, y: 0, angle: Math.PI / 2, speed: 10 }, [{ x: 1, y: 12, r: 0.5 }]);
  ok(west.bias < 0 && east.bias > 0, 'avoidance: naar het zuiden is rechts het westen: iemand in het westen betekent naar links', String([west.bias, east.bias]));
  // carControls: zonder obstakels dezelfde besturing, met een fietser een ander stuur en een lagere wens
  const target = { x: 100, y: 0 };
  const plain = L.carControls(car, target, { top: 30 });
  const same = L.carControls(car, target, { top: 30, avoid: [] });
  ok(plain.steer === same.steer && plain.want === same.want, 'carControls: een lege lijst obstakels verandert niets');
  const dodge = L.carControls(car, target, { top: 30, avoid: [{ x: 9, y: 0.4, r: 0.6 }] });
  ok(dodge.steer < plain.steer - 0.3 && dodge.want < plain.want, 'carControls: met een fietser voor de auto: ander stuur en lagere snelheid', JSON.stringify([plain, dodge]));
  // een rij voetgangers die de straat vult laat de auto niet achteruit draaien: hij blijft in de bocht aanzetten
  const wall = L.carControls({ x: 0, y: 0, angle: 0, speed: 1 }, { x: -50, y: 0 }, { top: 30, avoid: [{ x: 3, y: 0, r: 0.5 }] });
  ok(!wall.reverse, 'carControls: met iemand vlak voor de neus niet blindelings achteruit');
}

// bochten in de route (#354): een rechte weg begrenst niets, een haakse bocht kost snelheid, hoe dichterbij hoe meer
{
  const car = { x: 0, y: 0, angle: 0, speed: 20 };
  const straight = L.curveCap([{ x: 10, y: 0 }, { x: 30, y: 0 }, { x: 60, y: 0 }], 0, car);
  ok(straight === Infinity, 'curveCap: een rechte weg begrenst niets');
  const near = L.curveCap([{ x: 6, y: 0 }, { x: 6, y: 20 }, { x: 6, y: 40 }], 0, car);
  const mid = L.curveCap([{ x: 20, y: 0 }, { x: 20, y: 20 }, { x: 20, y: 40 }], 0, car);
  const far = L.curveCap([{ x: 50, y: 0 }, { x: 50, y: 20 }, { x: 50, y: 40 }], 0, car);
  ok(near < mid && mid < far, 'curveCap: een haakse bocht dichtbij begrenst harder dan verder weg', String([near, mid, far]));
  ok(near < 15 && near >= 5, 'curveCap: een haakse bocht op 6 m: ruim onder de 36 m/s en boven de ondergrens', String(near));
  const gentle = L.curveCap([{ x: 20, y: 0 }, { x: 40, y: 6 }, { x: 60, y: 6 }], 0, car);
  ok(gentle > mid, 'curveCap: een flauwe knik begrenst minder dan een haakse bocht', String([gentle, mid]));
  ok(L.curveCap([{ x: 70, y: 0 }, { x: 70, y: 30 }, { x: 70, y: 60 }], 0, car, { look: 40 }) === Infinity, 'curveCap: wat voorbij het zicht ligt telt niet');
  const slow = L.carControls(car, { x: 100, y: 0 }, { top: 36, curveCap: 8 });
  ok(slow.want === 8 && slow.throttle === -1, 'carControls: een bocht voor de neus remt tot de bochtsnelheid', JSON.stringify(slow));
}

// een route die ver van de bot begint (#354: de M26-start in de Gelkingestraat gaf een route vanaf de Pelsterstraat, 130 m verder)
{
  const me = { x: 224.9, y: 233.6 };
  ok(L.routeStartsFar(me, [[90, 293], [94, 303]]) === true, 'routeStartsFar: een route die 130 m verder begint wordt niet gevolgd');
  ok(L.routeStartsFar(me, [[226, 236], [235, 241]]) === false, 'routeStartsFar: een route die bij de bot begint wel');
  ok(L.routeStartsFar(me, null) === false && L.routeStartsFar(me, []) === false, 'routeStartsFar: zonder route niets');
}

// --annuleer (#390): the bot stops a mission through the menu; the report says whether the game kept its promises
{
  const good = { t: 41, type: 'annuleer', voor: { id: 'M01', stage: 'goto', fails: 0, money: 250 }, knop: true, vraagZichtbaar: true, nogActiefNaVraag: true, na: { actief: false, fase: 'cooldown', fails: 0, money: 250, menuDicht: true }, ok: true };
  const md = L.buildReport([good], { title: 'test', seed: 1, result: 'KLAAR' });
  ok(md.includes('## Missie gestopt uit het menu (#390)') && md.includes('bij M01: knop ja, vraag ja, na de vraag nog actief ja, na Ja gestopt (mislukkingen 0 naar 0, geld 250 naar 250): klopt'), 'annuleer: de regel van een geslaagde stop');
  const bad = L.buildReport([{ ...good, vraagZichtbaar: false, na: { ...good.na, actief: true, fails: 1 }, ok: false }], {});
  ok(bad.includes('vraag **nee**') && bad.includes('**nog actief**') && bad.includes('**klopt niet**'), 'annuleer: wat niet klopt valt op');
  ok(!L.buildReport([], {}).includes('#390'), 'annuleer: zonder stop geen sectie');
}

// --- heli (#312): toetsen voor opstijgen, vliegen en landen -------------------------
{
  const heli = (p = {}) => ({ x: 0, y: 0, z: 40, angle: 0, speed: 10, vz: 0, onGround: false, rotor: 1, groundZ: 0, ...p });
  const goal = { x: 500, y: 0 };
  // op de grond: de rotor moet eerst op toeren, dan Spatie
  ok(!N.heliKeys(heli({ onGround: true, z: 0, rotor: 0.4 }), { goal, agl: 0 }).has(' '), 'heli: wacht met opstijgen tot de rotor draait');
  ok(N.heliKeys(heli({ onGround: true, z: 0 }), { goal, agl: 0 }).has(' '), 'heli: op de grond en de rotor draait: Spatie');
  // in de lucht: neus naar het doel en vooruit
  ok(N.heliKeys(heli({ angle: 0 }), { goal, agl: 40 }).has('w'), 'heli: recht op het doel af: W');
  ok(N.heliKeys(heli({ angle: 0, y: 100 }), { goal, agl: 40 }).has('a'), 'heli: doel links: A');
  ok(N.heliKeys(heli({ angle: 0, y: -100 }), { goal, agl: 40 }).has('d'), 'heli: doel rechts: D');
  ok(!N.heliKeys(heli({ angle: Math.PI / 2 }), { goal, agl: 40 }).has('w'), 'heli: eerst gieren als het doel achter ons ligt');
  // hoogte houden en het luchtruim
  ok(N.heliKeys(heli({ z: 5 }), { goal, agl: 5 }).has(' '), 'heli: te laag: stijgen');
  ok(N.heliKeys(heli({ z: 70 }), { goal, agl: 70 }).has('control'), 'heli: te hoog: dalen');
  const hoog = N.heliKeys(heli({ z: 120 }), { goal, agl: 120 });
  ok(hoog.has('control') && !hoog.has(' '), 'heli: boven het luchtruim: alleen dalen');
  // landen: boven de plek niet meer stijgen, maar zakken
  const land = N.heliKeys(heli({ x: 496, speed: 0 }), { goal, mode: 'land', agl: 5 });
  ok(land.has('control') && !land.has(' ') && !land.has('w'), 'heli: boven de landingsplek: dalen en niet meer vooruit', [...land].join(''));
  ok(!N.heliKeys(heli({ x: 496, speed: 0 }), { goal, mode: 'land', agl: 0.5 }).has(' '), 'heli: vlak boven de grond: niet opspringen');
}

// --- zeilen (#312): dood hoek, kruisen en trim ---------------------------------------
{
  const b = (v = {}) => ({ x: 0, y: 0, angle: 0, speed: 3, sailTop: 3, zeilTrim: 0.6, omgeslagen: 0, helling: 0, ...v });
  const wind = { dir: 0, speed: 6 };
  // pal tegen de wind in: hij kruist in plaats van stil te vallen
  const up = N.sailControls(b(), { goal: { x: 400, y: 0 }, wind, dt: 0.1 });
  ok(up.tacking && up.throttle > 0, 'zeilen: pal tegen de wind in: kruisen met gas erop');
  ok(Math.abs(up.steer) > 0.2, 'zeilen: kruisen stuurt naar de boeg');
  // voor de wind: zeil vieren (Z), geen kruisen
  const down = N.sailControls(b({ angle: Math.PI }), { goal: { x: -400, y: 0 }, wind, dt: 0.1 });
  ok(!down.tacking && down.trim < 0, 'zeilen: voor de wind: zeil vieren', JSON.stringify(down));
  // halve wind: zeil aanhalen
  const half = N.sailControls(b({ angle: Math.PI / 2, zeilTrim: 0.3 }), { goal: { x: 0, y: 400 }, wind, dt: 0.1 });
  ok(!half.tacking && half.trim > 0, 'zeilen: halve wind: zeil aanhalen', JSON.stringify(half));
  // na 12 s van boeg wisselen als de andere boeg dichter bij het doel ligt
  const slag = b();
  N.sailControls(slag, { goal: { x: 400, y: 0 }, wind, dt: 12.1 });
  ok(slag.slagT != null && slag.slag != null, 'zeilen: de slag houdt zijn eigen tijd bij');
  // omgeslagen: geen gas, geen trim
  const nat = N.sailControls(b({ omgeslagen: 2 }), { goal: { x: 400, y: 0 }, wind, dt: 0.1 });
  ok(nat.throttle === 0 && nat.trim === 0 && !nat.tacking, 'zeilen: omgeslagen: even niets doen');
  // dezelfde windregels als het spel (zeilrules.js)
  for (const hoek of [-3, -2, -1.2, -0.6, 0, 0.6, 1.2, 2, 3]) {
    ok(near(N.polair(hoek), Z.polair(hoek)), `zeilen: polair gelijk aan het spel (${hoek})`);
    ok(near(N.besteTrim(hoek), Z.besteTrim(hoek)), `zeilen: beste trim gelijk aan het spel (${hoek})`);
  }
}

// --- roeien (#312): een tik per slag, niet hameren -----------------------------------
{
  ok(N.rowDue(1.3, 0), 'roeien: na 1,3 s mag de volgende slag');
  ok(!N.rowDue(0.4, 0), 'roeien: na 0,4 s niet');
  ok(N.rowDue(8, undefined), 'roeien: de eerste slag mag meteen');
}

// --- board-stage met een voertuig (#312): welk voertuig, waar instappen, time-out -----
{
  const quad = { x: 40, y: 0, angle: 0, halfLen: 1.2, halfWid: 0.8, kind: 'auto', mission: true, free: true, occupied: false, drivable: true, distance: 30 };
  const doel = { x: 40, y: 0, distance: 30 };
  const snap = (p, auto = []) => ({ t: 0, player: { x: p.x, y: p.y }, target: doel, nearby: { vehicles: auto } });
  // de romp: een kader van halfLen bij halfWid, precies als vehicle.js distToVehicleBody
  ok(near(Bd.bodyDistance(quad, { x: 40, y: 5 }), 4.2), 'board: naast de wagen is de rompafstand 4,2 m');
  ok(near(Bd.bodyDistance(quad, { x: 40, y: 0.5 }), 0), 'board: boven de wagen is de rompafstand 0');
  // de deur: aan de kant waar de speler staat, een halve meter van de romp, in het midden van de wagen
  const zuid = Bd.approachPoint(quad, { x: 30, y: -6 });
  ok(zuid.side === -1 && near(Bd.bodyDistance(quad, zuid), Bd.BOARD.pad), 'board: de deur aan de zuidkant, een halve meter van de romp');
  const noord = Bd.approachPoint(quad, { x: 30, y: 6 });
  ok(noord.side === 1 && noord.y > quad.y, 'board: de deur aan de kant van de speler');
  ok(Math.abs(Bd.approachPoint(quad, { x: 70, y: 2 }).door) <= quad.halfLen * 0.5, 'board: bij de deur, niet bij de bumper');
  // welk voertuig: het eigen voertuig van de missie wint van een dichterbij staande fiets
  const fiets = { ...quad, x: 38, y: -2, kind: 'fiets', halfLen: 0.9, halfWid: 0.35, mission: false, distance: 2 };
  const keuze = Bd.pickVehicle(snap({ x: 30, y: 0 }, [fiets, quad]), {});
  ok(keuze && keuze.vehicle.mission && keuze.why === 'missievoertuig', 'board: het missievoertuig gaat voor de fiets ernaast');
  // een auto met bestuurder is autodiefstal; een wrak telt niet; een overgeslagen voertuig even niet
  ok(Bd.pickVehicle(snap({ x: 30, y: 0 }, [{ ...quad, mission: false, occupied: true, distance: 3 }]), {}) === null, 'board: een auto met bestuurder laat de bot staan');
  ok(Bd.pickVehicle(snap({ x: 30, y: 0 }, [{ ...quad, mission: false, free: false, distance: 3 }]), {}) === null, 'board: een wrak telt niet');
  ok(Bd.pickVehicle(snap({ x: 30, y: 0 }, [{ ...quad, distance: Bd.BOARD.range + 10 }]), {}) === null, 'board: een voertuig buiten bereik laat de bot niet lopen');
  const mem0 = {};
  Bd.missed(mem0, quad, 0); Bd.missed(mem0, quad, 1); Bd.missed(mem0, quad, 2);
  ok(mem0.skip && Bd.pickVehicle(snap({ x: 30, y: 0 }, [quad]), mem0) === null, 'board: driemaal E zonder instappen: even overslaan');
  ok(Bd.pickVehicle(snap({ x: 30, y: 0 }, [quad]), mem0) === null && Bd.pickVehicle({ ...snap({ x: 30, y: 0 }, [quad]), t: 999 }, mem0) !== null, 'board: na een minuut is het voertuig weer een optie');
  // lopen naar de deur, dan E, en na een druk even wachten
  const mem = {};
  const ver = Bd.boardStep({ ...snap({ x: 10, y: 4 }), vehicle: quad }, mem, 0);
  ok(ver.type === 'walk' && near(Bd.bodyDistance(quad, ver.to), Bd.BOARD.pad), 'board: eerst naar de deur lopen');
  const dichtbij = Bd.boardStep({ ...snap({ x: 40, y: 1 }), vehicle: quad }, mem, 10);
  ok(dichtbij.type === 'enter', 'board: bij de deur is het E');
  Bd.pressed(mem, 10);
  ok(Bd.boardStep({ ...snap({ x: 40, y: 1 }), vehicle: quad }, mem, 10.5).type === 'wait', 'board: na E even wachten');
  // een voertuig waar E niet aankomt: na zes drukken opgeven, binnen de tijd van een poging
  const mem2 = {};
  let t = 0;
  Bd.pressed(mem2, t);
  while (Bd.boardStep({ ...snap({ x: 40, y: 1 }), vehicle: quad }, mem2, t).type === 'wait' && t < 60) t += 0.5;
  for (let i = 0; i < 5; i++) { Bd.pressed(mem2, t); t += Bd.BOARD.waitS; }
  const op = Bd.boardStep({ ...snap({ x: 40, y: 1 }), vehicle: quad }, mem2, t);
  ok(op.type === 'giveup' && op.why === 'voertuig laat niet in', 'board: zes drukken zonder instappen: opgeven met een reden');
  // een poging die niet afkomt: time-out na 25 s
  const mem3 = {};
  const begin = Bd.boardStep({ ...snap({ x: 10, y: 4 }), vehicle: quad }, mem3, 100);
  ok(begin.type === 'walk', 'board: de poging begint met lopen');
  const laat = Bd.boardStep({ ...snap({ x: 10, y: 4 }), vehicle: quad }, mem3, 100 + Bd.BOARD.attemptS + 0.1);
  ok(laat.type === 'giveup' && laat.why === 'time-out' && laat.forS > Bd.BOARD.attemptS, 'board: een poging duurt hooguit 35 s');
  // in een verkeerd voertuig: eruit (één keer), daarna boarden
  const mem4 = {};
  const uit = Bd.boardStep({ ...snap({ x: 40, y: 2 }), player: { x: 40, y: 2, vehicle: { kind: 'fiets', mission: false } }, vehicle: quad, wrongVehicle: true }, mem4, 0);
  ok(uit.type === 'exit', 'board: in een fiets bij de quad eerst uitstappen');
  // uit een rijdende auto stappen is geen optie: eerst afremmen
  const rijdend = Bd.boardStep({ ...snap({ x: 40, y: 2 }), player: { x: 40, y: 2, speed: 12, vehicle: { kind: 'auto', mission: false } }, vehicle: quad, wrongVehicle: true }, {}, 0);
  ok(rijdend.type === 'wait', 'board: uit een rijdende auto niet meteen uitstappen');
  ok(Bd.boardStep({ ...snap({ x: 40, y: 2 }), player: { x: 40, y: 2, vehicle: quad }, vehicle: quad }, mem4, 8).type === 'drive', 'board: in de quad: rijden');
  // de rit erna: naar het doel, en een doel dat wegloopt is na het budget een time-out
  const m5 = {};
  ok(Bd.driveStep({ player: { x: 0, y: 0 }, target: { x: 500, y: 0, distance: 500 } }, m5, 0).type === 'drive', 'board: na het instappen rijden naar het doel');
  let t5 = 0, op5 = null;
  while (t5 < 600 && !op5) { const s5 = Bd.driveStep({ player: { x: 0, y: 0 }, target: { x: t5 * 30, y: 0, distance: t5 * 30 } }, m5, t5); if (s5.type === 'giveup') op5 = s5; t5 += 1; }
  ok(op5 && op5.why === 'geen voortgang na het instappen' && op5.forS >= Bd.BOARD.driveS, 'board: de rit heeft een eigen budget');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
