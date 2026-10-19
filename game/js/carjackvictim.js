import { hash2 } from './rng.js';
// Autodiefstal (#49): wat de bestuurder doet nadat hij uit zijn auto is gehaald.
// Eerst boos zwaaien met de vuist, dan een stukje achter de auto aan (alleen
// als hij hem terug wil en je dichtbij bent), bij een stilstaande auto op het
// raam kloppen, daarna bellen met de politie en weglopen. Bloedloos: hij
// tuimelt hooguit op straat en staat zelf weer op. Pure logica, geen
// Three.js; pedestrians.js past de uitkomst toe op de voetganger.
export const VICTIM = {
  fistTime: 1.8,       // s boos zwaaien
  chaseMax: 5,         // s achter de auto aan
  chaseGiveUp: 28,     // m: verder weg is hopeloos
  chaseSpeed: 4.6,     // m/s
  knockReach: 2.6,     // m: bij de auto is kloppen genoeg
  knockTime: 1.5,
  callTime: 3.5,       // s bellen voor de melding binnen is
  agentNear: 30,       // m: een agent in zicht, dan wijst hij direct
  pointTime: 1.2,
  awayTime: 4,
  returnReach: 45,     // m: een achtergelaten auto binnen dit bereik haalt hij terug
  returnMax: 25,       // s: langer zoekt hij er niet naar
  returnTouch: 1.6,    // m: zo dichtbij stapt hij in
  returnSpeed: 2.6,    // m/s: gewoon lopen
  gotBackTime: 0.8,    // s instappen
};

export const VICTIM_LINES = {
  fist: ['Hé! Mijn auto!', 'Dat mag je niet doen!', 'Mijn auto! Wat denk je wel!'],
  chase: ['Stop! Terug met die auto!', 'Wacht nou even!'],
  knock: ['Doe open!', 'Dit is echt niet leuk!'],
  call: ['112? Mijn auto is zojuist gestolen!', 'Politie? Iemand rijdt weg met mijn auto!'],
  point: ['Agent! Die daar! Mijn auto!'],
  away: ['Wat een dag...', 'En ik moest nog naar de bakker.'],
  back: ['Daar staat hij! Mijn auto!', 'Eindelijk, mijn auto.'],
};

const hash = (a, b = 0) => hash2(a, b);
const lineOf = (key, seed) => { const l = VICTIM_LINES[key]; return l[Math.floor(hash(seed, key.length) * l.length) % l.length]; };

// plan per bestuurder: de ene wil terug, de andere pakt direct zijn telefoon
export function createVictim(seed = 1, { isBike = false, reportable = true } = {}) {
  return {
    phase: 'fist', t: 0, seed,
    wantsBack: !isBike && hash(seed, 3) < 0.65,
    reportable,
    reported: false,
    said: {},
  };
}

// ctx: { dCar, carSpeed, copNear, carFree } - afstand tot de gestolen auto, zijn snelheid, agent in zicht, auto achtergelaten (niemand erin)
// Geeft { phase, move: 'none'|'chase'|'away'|'return', pose: null|'angry'|'call', face: 'car'|'cop'|'spot', say, report }
export function stepVictim(vic, dt, ctx = {}) {
  vic.t += dt;
  const dCar = ctx.dCar ?? 99, carSpeed = Math.abs(ctx.carSpeed ?? 0);
  const out = { phase: vic.phase, move: 'none', pose: null, face: 'car', say: null, report: false };
  const speak = (key) => { if (vic.said[key]) return; vic.said[key] = true; out.say = lineOf(key, vic.seed); };
  const go = (phase) => { vic.phase = phase; vic.t = 0; out.phase = phase; };
  if (vic.phase === 'fist') {
    out.pose = 'angry'; speak('fist');
    if (vic.t >= VICTIM.fistTime) go(vic.wantsBack && dCar < VICTIM.chaseGiveUp ? 'chase' : 'call');
  } else if (vic.phase === 'chase') {
    out.move = 'chase'; speak('chase');
    if (dCar <= VICTIM.knockReach && carSpeed < 1.5) go('knock');
    else if (vic.t >= VICTIM.chaseMax || dCar > VICTIM.chaseGiveUp) go('call');
  } else if (vic.phase === 'knock') {
    out.pose = 'angry'; speak('knock');
    if (vic.t >= VICTIM.knockTime) go('call');
  }
  if (vic.phase === 'call') {
    if (ctx.copNear && vic.reportable && !vic.reported) { go('point'); }
    else {
      out.pose = 'call'; out.face = 'spot'; speak('call');
      if (vic.t >= VICTIM.callTime) {
        if (vic.reportable && !vic.reported) { vic.reported = true; out.report = true; }
        go('away');
      }
    }
  }
  if (vic.phase === 'point') {
    out.face = 'cop'; speak('point');
    if (vic.t >= VICTIM.pointTime) { vic.reported = true; out.report = true; go('away'); }
  }
  if (vic.phase === 'away') {
    out.move = 'away'; out.face = 'spot'; speak('away');
    // wie zijn auto terug wil en hem ziet staan zonder bestuurder, loopt terug (#49)
    if (vic.t >= VICTIM.awayTime) go(vic.wantsBack && ctx.carFree && dCar < VICTIM.returnReach ? 'return' : 'done');
  } else if (vic.phase === 'return') {
    out.move = 'return'; out.face = 'car'; speak('back');
    if (!ctx.carFree || vic.t >= VICTIM.returnMax) go('done');
    else if (dCar <= VICTIM.returnTouch) { out.move = 'none'; go('regained'); }
  } else if (vic.phase === 'regained') {
    out.move = 'none'; out.face = 'car';
    if (vic.t >= VICTIM.gotBackTime) { out.reclaim = true; go('done'); }
  }
  out.phase = vic.phase;
  if (vic.phase === 'done') out.move = 'none';
  return out;
}

export const victimDone = (vic) => !vic || vic.phase === 'done';

// Uitstappen (#49): de bestuurder schuift van zijn stoel door de open deur naar
// de plek naast de auto, in plaats van daar ineens te staan. Pure kant; de
// stoelplek is een benadering van de bestuurdersstoel (zijde van de deur).
export const STEP_OUT = { dur: 0.75, delay: 0.2, seatSide: 0.42, seatFwd: 0.06 };

// v: { x, y, angle, halfWid, model.len }, spot: { x, y } waar hij belandt.
export function stepOutPlan(v, spot) {
  const f = [Math.cos(v.angle), Math.sin(v.angle)], n = [-Math.sin(v.angle), Math.cos(v.angle)];
  const side = (spot.x - v.x) * n[0] + (spot.y - v.y) * n[1] >= 0 ? 1 : -1;
  const len = (v.model && v.model.len) || 4.2, hw = v.halfWid || 0.9;
  return {
    fx: v.x + f[0] * len * STEP_OUT.seatFwd + n[0] * side * hw * STEP_OUT.seatSide,
    fy: v.y + f[1] * len * STEP_OUT.seatFwd + n[1] * side * hw * STEP_OUT.seatSide,
    tx: spot.x, ty: spot.y, t: 0, dur: STEP_OUT.dur, delay: STEP_OUT.delay,
  };
}

// Positie na t seconden: even blijven zitten (de deur gaat open), dan met een zachte versnelling naar buiten.
export function stepOutPos(plan, t) {
  const u = Math.max(0, Math.min(1, (t - plan.delay) / plan.dur));
  const k = u * u * (3 - 2 * u);
  return { x: plan.fx + (plan.tx - plan.fx) * k, y: plan.fy + (plan.ty - plan.fy) * k, done: u >= 1 };
}
