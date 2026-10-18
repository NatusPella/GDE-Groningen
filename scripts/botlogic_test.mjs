// Spelbot (#186): de pure logica van game/js/botlogic.js, zonder Electron:
//   node scripts/botlogic_test.mjs
// statusschema, besturing van de doelvolger, vastzit-detectie, replay-formaat en rapport.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'game', 'js', 'botlogic.js')).href);
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
  ok(L.rescueFor(0) === 'nudge' && L.rescueFor(1) === 'teleport' && L.rescueFor(2) === 'objective' && L.rescueFor(3) === 'win' && L.rescueFor(4) === 'skip' && L.rescueFor(9) === 'skip', 'redding loopt op, laatste sport is skip');
  ok(!L.isCheat('nudge') && L.isCheat('teleport'), 'een duwtje is geen cheat');
}

// --- beslissen ----------------------------------------------------------------------------
{
  const base = () => ({ v: 1, t: 1, player: { x: 0, y: 0, angle: 0, camYaw: 0, vehicle: null }, story: {}, mission: { active: false }, hud: { messages: [] }, blocking: {}, nearby: { vehicles: [] }, target: { x: 50, y: 0, distance: 50, source: 'missie' } });
  ok(L.decide({ ...base(), blocking: { pauseMenu: true } }).type === 'closemenu', 'pauzemenu sluiten');
  ok(L.decide({ ...base(), blocking: { dialog: { options: [{ key: '2', label: 'x' }] } } }).key === '2', 'dialoog: eerste optie');
  ok(L.decide({ ...base(), blocking: { cinematic: true } }).type === 'skip', 'cutscene overslaan');
  ok(L.decide({ ...base(), blocking: { talk: true } }).type === 'wait', 'gesprek afwachten');
  ok(L.decide({ ...base(), target: null }).type === 'wait', 'zonder doel wachten');
  ok(L.decide(base()).mode === 'walk', 'dichtbij: lopen');
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
  const st = L.decide({ ...b(), player: { ...b().player, vehicle: car }, mission: { active: true, label: 'Nul krassen: stunt' } });
  ok(st.mode === 'drive' && st.stunt === true && st.top === 30, 'stunt: snel rijden');
  ok(!L.decide({ ...b(), player: { ...b().player, vehicle: car } }).stunt, 'geen stunt: normaal rijden');
  const atm = { ...b(), target: { x: 2, y: 0, distance: 2 }, hud: { messages: [], prompt: 'E: pinnen' } };
  const pin = L.decide(atm);
  ok(pin.type === 'press' && pin.key === 'e' && pin.interact, 'prompt bij het doel: E drukken');
  ok(L.decide(atm, { pressTries: 4 }).type === 'goto', 'na vier pogingen weer lopen');
  ok(L.decide({ ...atm, target: { x: 90, y: 0, distance: 90 } }).type === 'goto', 'prompt ver van het doel telt niet');
  const board = { ...b(), mission: { active: true, stage: 'board' }, target: { x: 300, y: 0, distance: 300 }, nearby: { vehicles: [{ x: 20, y: 0, distance: 20, free: true, drivable: true, kind: 'auto' }] } };
  ok(L.decide(board).type === 'enter', 'board-stage: instappen, ook ver van het doel');
  ok(L.decide(board, { boardTries: 4 }).type === 'goto', 'board-stage: opgeven na vier keer');
  ok(L.decide({ ...b(), mission: { active: true, stage: 'hold' }, target: { x: 1, y: 0, distance: 1 } }).type === 'wait', 'hold-stage: stilstaan in de ring');
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
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
