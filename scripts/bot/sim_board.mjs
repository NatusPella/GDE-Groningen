// Spelbot (#312): een kleine simulatie van een board-stage met een voertuig, zonder Electron.
// De bot kiest een voertuig (scripts/bot/board.mjs), loopt naar de deur, drukt E en rijdt naar het
// doel; het model is een wandelaar van 4,5 m/s en een auto die naar zijn top toe rijdt. Het bewijst
// dat de keuze, de deur, de time-out per poging en de rit kloppen, niet dat het spel precies zo
// rekent; de echte proef is een run met scripts/bot/run.mjs.
//   node scripts/bot/sim_board.mjs
import { BOARD, bodyDistance, approachPoint, pickVehicle, boardStep, driveStep, pressed, missed } from './board.mjs';

const DT = 0.1;
let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name, extra); };
const r1 = (v) => Math.round(v * 10) / 10;

const voertuig = (v) => ({ mission: false, free: true, occupied: false, drivable: true, distance: 0, angle: 0, halfLen: 2, halfWid: 1, kind: 'auto', ...v });
const afstand = (p, c) => Math.hypot(c.x - p.x, c.y - p.y);
const snapshot = (p, voertuigen, target) => ({
  t: 0,
  player: { x: p.x, y: p.y, vehicle: p.vehicle || null },
  target,
  nearby: { vehicles: voertuigen.map((c) => ({ ...c, distance: r1(afstand(p, c)) })) },
});

// lopen: recht naar het punt, 4,5 m/s; `muur` blokkeert de ene kant van de wagen (een hek). Een
// blokkerende stap schuift langs de muur (eerst x, dan y), zoals een speler om het hek heen loopt.
function loop(p, to, muur) {
  const dx = to.x - p.x, dy = to.y - p.y, d = Math.hypot(dx, dy);
  if (d < 0.25) return false;
  const stap = Math.min(d, 4.5 * DT);
  const kandidaten = [[(dx / d) * stap, (dy / d) * stap], [Math.sign(dx) * stap, 0], [0, Math.sign(dy) * stap]];
  for (const [sx, sy] of kandidaten) {
    if (!sx && !sy) continue;
    const nx = p.x + sx, ny = p.y + sy;
    if (muur && muur(nx, ny)) continue;
    p.x = nx; p.y = ny;
    return true;
  }
  return false;
}

// Eén board-stage tot de bot instapt (of opgeeft): geeft { boarded, t, giveup, keuze, presses, flips }
function speelBoard(start, voertuigen, target, opts = {}) {
  const p = { ...start };
  const mem = {};
  let t = 0, keuze = null, presses = 0, flips = 0, exits = 0;
  const v = voertuigen.find((c) => c.mission);
  while (t < 120) {
    const s = snapshot(p, voertuigen, target);
    const pick = pickVehicle(s, mem);
    if (pick && pick.vehicle && (!keuze || keuze.x !== pick.vehicle.x)) keuze = pick;
    const step = boardStep({ ...s, vehicle: keuze ? keuze.vehicle : null, wrongVehicle: !!(p.vehicle && !p.vehicle.mission) }, mem, t);
    if (step.type === 'giveup') return { boarded: false, t, giveup: step, keuze, presses, flips, exits };
    if (step.type === 'exit') { exits++; p.vehicle = null; t += 1; continue; }
    if (step.type === 'drive') return { boarded: true, t, keuze, presses, flips, exits, mem };
    if (step.type === 'enter') {
      // het spel zelf: alleen als deze wagen de dichtstbijzijnde is en E aankomt
      const dichtst = s.nearby.vehicles.slice().sort((a, b) => bodyDistance(a, p) - bodyDistance(b, p))[0];
      const deze = s.nearby.vehicles.find((c) => Math.hypot(c.x - keuze.vehicle.x, c.y - keuze.vehicle.y) < 0.6);
      pressed(mem, t); presses++;
      if (!opts.eDoetNiets && deze && dichtst === deze) { p.vehicle = deze; continue; }
      missed(mem, keuze.vehicle, t);
    } else if (step.type === 'walk') {
      if (step.flipped) flips++;
      loop(p, step.to, opts.muur);
    }
    t += DT;
  }
  return { boarded: false, t, giveup: { why: 'simulatie op' }, keuze, presses, flips, exits };
}

// --- 1. de quad van de missie tussen een auto en een fiets ---------------------------
{
  const quad = voertuig({ x: 40, y: 0, halfLen: 1.2, halfWid: 0.8, mission: true });
  const auto = voertuig({ x: 66, y: 3 });
  const fiets = voertuig({ x: 39, y: -3.5, kind: 'fiets', halfLen: 0.9, halfWid: 0.35 });
  const doel = { x: 40, y: 0, distance: 30 };
  const uit = speelBoard({ x: 10, y: 4 }, [auto, fiets, quad], doel);
  ok(uit.boarded, 'quad: de bot stapt in', `${uit.t.toFixed(1)} s`);
  ok(uit.keuze && uit.keuze.vehicle.mission && uit.keuze.why === 'missievoertuig', 'quad: het missievoertuig wint van de dichterbij staande fiets', uit.keuze && uit.keuze.why);
  ok(uit.presses === 1, 'quad: een keer E, precies bij de deur', String(uit.presses));
  // het eigen voertuig van de missie, ook als er een auto met bestuurder naast staat
  const s0 = snapshot({ x: 10, y: 4 }, [{ ...quad, distance: 6 }, { ...auto, x: 12, y: 4, occupied: true }], doel);
  const k0 = pickVehicle(s0, {});
  ok(k0 && k0.vehicle.mission, 'keuze: een auto met bestuurder is geen optie (autodiefstal)');
  // de deur: aan de kant van de speler, een halve meter van de romp, niet bij de bumper
  const deur = approachPoint(quad, { x: 10, y: 4 });
  ok(Math.abs(bodyDistance(quad, deur) - BOARD.pad) < 0.01, 'deur: een halve meter van de romp', String(r1(bodyDistance(quad, deur))));
  ok(deur.side === 1 && deur.door <= 0.6 && deur.door >= -0.6, 'deur: aan de kant van de speler, in het midden van de wagen');
}

// --- 2. in een verkeerd voertuig: eruit, dan de quad --------------------------------
{
  const quad = voertuig({ x: 40, y: 0, halfLen: 1.2, halfWid: 0.8, mission: true });
  const doel = { x: 40, y: 0, distance: 30 };
  const uit = speelBoard({ x: 38, y: 2, vehicle: { kind: 'fiets', mission: false, speed: 0 } }, [quad], doel);
  ok(uit.boarded && uit.exits >= 1, 'verkeerd voertuig: eerst uitstappen, daarna de quad in', `${uit.t.toFixed(1)} s, ${uit.exits} keer uit`);
}

// --- 3. E komt niet aan: na zes drukken opgeven, niet eindeloos hameren -------------
{
  const quad = voertuig({ x: 40, y: 0, halfLen: 1.2, halfWid: 0.8, mission: true });
  const uit = speelBoard({ x: 10, y: 4 }, [quad], { x: 40, y: 0, distance: 30 }, { eDoetNiets: true });
  ok(!uit.boarded && uit.giveup.why === 'voertuig laat niet in', 'E werkt niet: opgeven met een reden', uit.giveup.why);
  ok(uit.presses === BOARD.tries, 'E werkt niet: precies zes drukken, geen gehamer', String(uit.presses));
  ok(uit.t < BOARD.attemptS, 'E werkt niet: binnen de tijd van één poging', `${uit.t.toFixed(1)} s`);
}

// --- 4. een hek aan de ene kant: de andere kant op, daarna time-out ------------------
{
  const quad = voertuig({ x: 40, y: 0, halfLen: 1.2, halfWid: 0.8, mission: true });
  const doel = { x: 40, y: 0, distance: 30 };
  // een hek op de zuidkant (waar de bot vandaan komt): dichter dan 2 m bij de romp mag daar niet
  const muur = (x, y) => {
    const c = Math.cos(quad.angle), s = Math.sin(quad.angle);
    const across = -(x - quad.x) * s + (y - quad.y) * c;
    return across < 0 && bodyDistance(quad, { x, y }) < 2;
  };
  const uit = speelBoard({ x: 10, y: -6 }, [quad], doel, { muur });
  ok(uit.flips >= 1, 'hek: de bot probeert de andere kant van de wagen', String(uit.flips));
  ok(uit.boarded, 'hek: via de vrije kant stapt hij alsnog in', `${uit.t.toFixed(1)} s`);
  // helemaal ingesloten: één poging duurt hooguit 35 s, dan is het een time-out (geen eindeloos lopen)
  const dicht = (x, y) => bodyDistance(quad, { x, y }) < 3;
  const op = speelBoard({ x: 10, y: -6 }, [quad], doel, { muur: dicht });
  ok(!op.boarded && op.giveup.why === 'time-out', 'ingesloten: time-out per poging', op.giveup.why);
  ok(op.t >= BOARD.attemptS && op.t < BOARD.attemptS + 3, 'ingesloten: na de tijd van een poging op, niet later', `${op.t.toFixed(1)} s`);
}

// --- 5. na het instappen: naar het doel rijden, met een eigen budget -----------------
{
  const p = { x: 40, y: 0, vehicle: { kind: 'auto', mission: true, speed: 0 } };
  const mem = {};
  let t = 0, d = Math.hypot(900 - p.x, 300 - p.y), gereden = 0;
  let laatste = null;
  while (t < 200 && d > 6) {
    const target = { x: 900, y: 300, distance: d };
    const step = driveStep({ player: p, target }, mem, t);
    if (step.type === 'giveup') { laatste = step; break; }
    const hoek = Math.atan2(target.y - p.y, target.x - p.x);
    const v = Math.min(step.top, (p.vehicle.speed || 0) + 6 * DT);
    p.vehicle.speed = v;
    p.x += Math.cos(hoek) * v * DT; p.y += Math.sin(hoek) * v * DT;
    d = Math.hypot(900 - p.x, 300 - p.y);
    gereden = t;
    t += DT;
  }
  ok(!laatste && d <= 6, 'rit: de bot rijdt naar het doel van de volgende stap', `${t.toFixed(1)} s, ${Math.round(d)} m over`);
  ok(t > 0 && t < BOARD.driveS, 'rit: ruim binnen het budget');
  // een doel dat wegloopt (de limo van de achtervolging is sneller): geen voortgang, na 420 s op
  const p2 = { x: 0, y: 0, vehicle: { kind: 'auto', mission: true, speed: 24 } };
  const mem2 = {}, doel2 = { x: 0, y: 0 };
  let t2 = 0, uit2 = null;
  while (t2 < 600 && !uit2) {
    doel2.x += 30 * DT;   // het doel loopt 30 m/s weg, de auto haalt 24
    const step = driveStep({ player: p2, target: { ...doel2, distance: Math.hypot(doel2.x, doel2.y) } }, mem2, t2);
    if (step.type === 'giveup') uit2 = step;
    t2 += DT;
  }
  ok(uit2 && uit2.why === 'geen voortgang na het instappen', 'rit: een doel dat wegloopt is na het budget een time-out', uit2 && uit2.why);
  ok(uit2 && uit2.forS >= BOARD.driveS, 'rit: het budget is zeven minuten zonder voortgang', uit2 && String(Math.round(uit2.forS)));
}

console.log(fails ? `${fails} mislukt` : 'alles goed');
process.exit(fails ? 1 : 0);
