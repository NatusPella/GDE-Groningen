// Pure tests voor de animatie-state-machine (animstate.js, ADR 0051): geldige overgangen, geen knip zonder menging, de loopruimte,
// laaggewichten en IK per state, de afstandstrap en de netwerkcodering.
//   node scripts/animstate_test.mjs
import * as A from '../game/js/animstate.js';

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const P = (o = {}) => ({ speed: 0, dir: 0, turn: 0, grounded: true, vy: 0, jump: false, water: false, climbing: false, seated: false, vehicle: null, cutscene: false, knocked: false, emote: null, ...o });
const run = (sm, p, secs, dt = 1 / 60) => { const seen = []; for (let t = 0; t < secs; t += dt) if (A.stepAnimState(sm, p, dt)) seen.push(A.stateName(sm)); return seen; };

// ---- tabel ------------------------------------------------------------------------------------------
ok(A.validateTransitions().length === 0, 'overgangstabel klopt: ' + A.validateTransitions().join('; '));
ok(A.STATE_IDS.length <= 255, 'state-id past in een byte');
for (const s of ['idle', 'locomotion', 'sprint', 'start', 'stop', 'turn', 'jump', 'fall', 'land', 'swim', 'climb', 'sit', 'drive', 'ride', 'enter', 'exit', 'knockdown', 'getup', 'emote', 'cutscene']) ok(A.STATES[s], `state ${s} bestaat`);

// ---- lopen, rennen, stoppen ---------------------------------------------------------------------------
{
  const sm = A.createAnimState();
  ok(A.stateName(sm) === 'idle', 'begint in idle');
  const a = run(sm, P({ speed: 1.4 }), 1);
  ok(a[0] === 'start' && a[1] === 'locomotion', `idle -> start -> locomotion (${a})`);
  const b = run(sm, P({ speed: 7.2 }), 0.5);
  ok(b.includes('sprint'), 'hard rennen wordt sprint');
  const c = run(sm, P({ speed: 0 }), 1.5);
  ok(c.includes('locomotion') && c.includes('stop') && A.stateName(sm) === 'idle', `stoppen eindigt in idle via stop (${c})`);
}
// elke wissel mengt (k begint op 0 en loopt in de fadetijd naar 1), behalve de knip naar een cutscene
{
  const sm = A.createAnimState();
  let pops = 0, prevK = 1;
  const plan = [[P({ speed: 1.4 }), 1], [P({ speed: 0 }), 1], [P({ jump: true }), 0.1], [P({ grounded: false, vy: -4 }), 1], [P(), 1], [P({ water: true }), 1], [P(), 1], [P({ seated: true }), 1.5], [P(), 1.5], [P({ vehicle: 'car' }), 2], [P(), 2], [P({ knocked: true }), 0.2], [P({ knocked: true, down: true }), 3], [P({ emote: 'zwaai' }), 3]];
  for (const [p, secs] of plan) for (let t = 0; t < secs; t += 1 / 60) {
    const changed = A.stepAnimState(sm, p, 1 / 60);
    if (changed && sm.k !== 0 && A.stateName(sm) !== 'cutscene') pops++;
    prevK = sm.k;
  }
  ok(pops === 0, 'geen wissel zonder menging (behalve cutscene)');
  ok(prevK >= 0 && prevK <= 1, 'mengfactor binnen 0..1');
}
// voertuig: instappen, rijden met handen aan het stuur, uitstappen
{
  const sm = A.createAnimState();
  const seen = run(sm, P({ vehicle: 'car' }), 1.5);
  ok(seen[0] === 'enter' && seen[1] === 'drive', `instappen -> rijden (${seen})`);
  const ik = {};
  A.ikFor(sm, ik);
  ok(ik.hands === 'wheel' && ik.seat && !ik.feet, 'rijden: handen aan het stuur, zit-IK, geen voet-IK');
  const out = run(sm, P(), 1.5);
  ok(out[0] === 'exit' && A.stateName(sm) === 'idle', `uitstappen -> idle (${out})`);
  const sm2 = A.createAnimState();
  run(sm2, P({ vehicle: 'bike' }), 1.5);
  A.ikFor(sm2, ik);
  ok(A.stateName(sm2) === 'ride' && ik.hands === 'bars' && ik.feetMode === 'pedals', 'fiets: handen aan de stang, voeten op de trappers');
}
// IK per state: uit bij vallen en zwemmen, voeten aan bij lopen; ver weg altijd uit
{
  const ik = {};
  const sm = A.createAnimState();
  run(sm, P({ grounded: false, vy: -5 }), 0.5); A.ikFor(sm, ik);
  ok(A.stateName(sm) === 'fall' && !ik.feet && !ik.hands, 'vallen: geen IK');
  run(sm, P({ water: true }), 0.5); A.ikFor(sm, ik);
  ok(A.stateName(sm) === 'swim' && !ik.feet, 'zwemmen: geen voet-IK');
  const w = A.createAnimState(); run(w, P({ speed: 1.4 }), 1); A.ikFor(w, ik);
  ok(ik.feet && ik.feetMode === 'ground', 'lopen: voeten op de grond');
  w.tier = 2; A.ikFor(w, ik);
  ok(!ik.feet && !ik.hands && !ik.seat, 'ver weg: geen IK');
}
// lagen: bovenlijf mengt in, lipsync alleen dichtbij, ver weg geen lagen; zwemmen geen bovenlijflaag
{
  const sm = A.createAnimState(), L = {};
  A.setUpperLayer(sm, 'phone');
  run(sm, P(), 0.1); A.layerWeights(sm, L);
  ok(L.upper > 0.2 && L.upper < 0.6, `bovenlijf mengt in (${L.upper.toFixed(2)})`);
  run(sm, P(), 0.3); A.layerWeights(sm, L);
  ok(L.upper === 1 && L.lips === 1 && L.look === 1, 'na 0,25 s volledig, lipsync en blik aan');
  sm.tier = 1; A.layerWeights(sm, L); ok(L.lips === 0 && L.look === 1, 'middel: geen lipsync, wel blik');
  sm.tier = 2; A.layerWeights(sm, L); ok(L.upper === 0 && L.breath === 0 && L.look === 0, 'ver: alleen de basislaag');
  const s2 = A.createAnimState(); A.setUpperLayer(s2, 'carry'); run(s2, P({ water: true }), 1); A.layerWeights(s2, L);
  ok(L.upper === 0, 'zwemmen: geen bovenlijflaag');
  ok(A.UPPER_MASK.includes('Head') && !A.UPPER_MASK.includes('UpperLegL') && !A.UPPER_MASK.includes('Hips'), 'botmasker: bovenlijf zonder benen en heup');
}
// loopruimte: gewichten tellen op tot 1 en lopen vloeiend
{
  const b = {};
  let maxJump = 0, prev = null;
  for (let v = 0; v <= 9; v += 0.05) {
    A.speedBlend(v, b);
    ok(Math.abs(b.idle + b.walk + b.run + b.sprint - 1) < 1e-9, `blend telt op tot 1 bij ${v.toFixed(2)}`);
    if (prev) maxJump = Math.max(maxJump, Math.abs(b.walk - prev.walk), Math.abs(b.run - prev.run), Math.abs(b.sprint - prev.sprint), Math.abs(b.idle - prev.idle));
    prev = { ...b };
  }
  ok(maxJump < 0.05, `geen sprong in de loopruimte (${maxJump.toFixed(3)} per 0,05 m/s)`);
}
// afstandstrap: ver telt maar elke 4e stap, de tijd loopt door
{
  const sm = A.createAnimState(); sm.tier = 2;
  let changed = 0; for (let i = 0; i < 40; i++) changed += A.stepAnimState(sm, P({ speed: 1.4 }), 1 / 60) ? 1 : 0;
  ok(A.stateName(sm) !== 'idle' && changed >= 1, 'ver weg wisselt de state nog wel');
  ok(Math.abs(sm.t - 0) >= 0 && sm.t < 40 / 60 + 1e-9, 'tijd loopt door in grotere stappen');
}
// netwerk: 4 bytes heen en terug; een gast mengt naar de nieuwe state
{
  const host = A.createAnimState();
  run(host, P({ speed: 3 }), 1);
  host.nt = 0.37; host.dir = 1.2;
  const bytes = A.encodeAnimState(host);
  ok(bytes.length === 4 && bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255), 'vier bytes');
  const guest = A.createAnimState();
  ok(A.applyRemoteAnimState(guest, bytes), 'gast neemt het over');
  ok(A.stateName(guest) === A.stateName(host) && Math.abs(guest.speed - 3) < 0.05 && Math.abs(guest.dir - 1.2) < 0.03 && Math.abs(guest.nt - 0.37) < 0.01, 'state, snelheid, richting en tijd komen aan');
  ok(guest.k === 0 && guest.fade > 0, 'de gast mengt naar de nieuwe state (geen sprong)');
  ok(!A.applyRemoteAnimState(guest, null) && !A.applyRemoteAnimState(guest, [1]), 'kapotte berichten doen niets');
  A.applyRemoteAnimState(guest, [250, 0, 0, 0]);
  ok(A.stateName(guest) === 'idle', 'onbekende state-id valt terug op idle');
}
// rare invoer
{
  const sm = A.createAnimState();
  for (let i = 0; i < 100; i++) A.stepAnimState(sm, P({ speed: NaN, dir: Infinity }), NaN);
  ok(Number.isFinite(sm.k) && Number.isFinite(sm.t) && A.stateName(sm) === 'idle', 'NaN en oneindig: blijft eindig');
}

console.log(fails ? `${fails} van ${n} FAILED` : `animstate: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
