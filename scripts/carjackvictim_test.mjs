// Autodiefstal (#49): de bestuurder na de diefstal (carjackvictim.js).
//   node scripts/carjackvictim_test.mjs
import * as C from '../game/js/carjackvictim.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const run = (vic, ctxAt, secs = 30) => {
  const log = [];
  for (let t = 0; t < secs; t += 0.1) {
    const o = C.stepVictim(vic, 0.1, ctxAt(t));
    if (!log.length || log[log.length - 1].phase !== o.phase) log.push({ phase: o.phase, at: t, report: o.report });
    if (o.report) log.reported = (log.reported || 0) + 1;
    if (o.say) (log.lines ||= []).push(o.say);
    if (C.victimDone(vic)) break;
  }
  return log;
};
const wants = (seed) => C.createVictim(seed).wantsBack;
let sBack = 1, sNo = 1;
while (!wants(sBack)) sBack++;
while (wants(sNo)) sNo++;

check('fiets-bestuurder rent nooit achter hem aan', [1, 2, 3, 4, 5, 6, 7, 8].every((s) => !C.createVictim(s, { isBike: true }).wantsBack));
check('sommigen willen terug, anderen niet', wants(sBack) && !wants(sNo));

let log = run(C.createVictim(sBack), () => ({ dCar: 8, carSpeed: 10 }));
check('wil terug: zwaaien, rennen, bellen, weg', log.map((l) => l.phase).join() === 'fist,chase,call,away,done', log.map((l) => l.phase).join());
check('precies één melding', log.reported === 1);
check('rennen duurt niet langer dan chaseMax', Math.abs(log[2].at - log[1].at - C.VICTIM.chaseMax) < 0.3);

log = run(C.createVictim(sBack), (t) => ({ dCar: Math.max(1, 8 - t * 6), carSpeed: 0 }));
check('stilstaande auto: kloppen', log.map((l) => l.phase).includes('knock'), log.map((l) => l.phase).join());

log = run(C.createVictim(sBack), () => ({ dCar: 90, carSpeed: 20 }));
check('te ver weg: meteen bellen', log.map((l) => l.phase).join() === 'fist,call,away,done');

log = run(C.createVictim(sNo), () => ({ dCar: 5, carSpeed: 5 }));
check('wil niet terug: geen rennen', !log.map((l) => l.phase).includes('chase'));

log = run(C.createVictim(sNo), () => ({ dCar: 20, carSpeed: 5, copNear: true }));
check('agent in zicht: wijzen, geen bellen', log.map((l) => l.phase).join() === 'fist,point,away,done' && log.reported === 1, log.map((l) => l.phase).join());

log = run(C.createVictim(sNo, { reportable: false }), () => ({ dCar: 20, carSpeed: 5, copNear: true }));
check('niet meldbaar (geparkeerde auto): geen melding', !log.reported);

const o = C.stepVictim(C.createVictim(1), 0.1, {});
check('boos zwaaien is een pose, geen letsel', o.pose === 'angry' && o.move === 'none');
check('elke regel is Nederlands tekst, geen geweld', Object.values(C.VICTIM_LINES).flat().every((l) => typeof l === 'string' && l.length > 5 && !/dood|bloed|sla|moord/i.test(l)));
check('regels komen één keer per fase', (() => { const v = C.createVictim(sBack); let c = 0; for (let i = 0; i < 15; i++) if (C.stepVictim(v, 0.1, { dCar: 9, carSpeed: 9 }).say) c++; return c === 1; })());
// uitstappen: van de stoel door de deur naar de plek naast de auto
{
  for (const angle of [0, 1.1, 2.6, -2]) {    const v = { x: 50, y: -20, angle, halfWid: 0.9, model: { len: 4.3 } };
    const n2 = [-Math.sin(angle), Math.cos(angle)];
    const spot = { x: v.x + n2[0] * -1.6, y: v.y + n2[1] * -1.6 };
    const plan = C.stepOutPlan(v, spot);
    const inCar = (x, y) => { const dx = x - v.x, dy = y - v.y, f = dx * Math.cos(angle) + dy * Math.sin(angle), l = dx * n2[0] + dy * n2[1]; return Math.abs(f) < 2.2 && Math.abs(l) < 0.95; };
    check(`hoek ${angle}: hij begint in de auto, aan de kant van de deur`, inCar(plan.fx, plan.fy) && (plan.fx - v.x) * n2[0] + (plan.fy - v.y) * n2[1] < 0);
    const p0 = C.stepOutPos(plan, 0), pMid = C.stepOutPos(plan, 0.2 + C.STEP_OUT.dur / 2), pEnd = C.stepOutPos(plan, 5);
    check(`hoek ${angle}: hij blijft even zitten tot de deur open is`, Math.hypot(p0.x - plan.fx, p0.y - plan.fy) < 1e-9 && !p0.done);
    check(`hoek ${angle}: halverwege is hij onderweg, aan het eind op zijn plek`, Math.hypot(pMid.x - plan.fx, pMid.y - plan.fy) > 0.3 && !pMid.done && pEnd.done && Math.hypot(pEnd.x - spot.x, pEnd.y - spot.y) < 1e-9);
    let last = -1, mono = true;
    for (let t = 0; t <= 1.2; t += 0.02) { const d = Math.hypot(C.stepOutPos(plan, t).x - plan.fx, C.stepOutPos(plan, t).y - plan.fy); if (d < last - 1e-9) mono = false; last = d; }
    check(`hoek ${angle}: hij beweegt alleen naar buiten`, mono);
  }
}
// een passagier uit zijn eigen deur trekken (#459): dezelfde reacties als de bestuurder,
// maar vanaf de kant van zijn stoel
{
  const v = { x: 10, y: 5, angle: 0, halfWid: 0.9, model: { name: 'sedan', len: 4.3, wid: 1.8 } };
  const open = (id) => ({ open: { [id]: 1 }, want: {}, loose: {}, hold: {}, dmg: {} });
  v.doors = open('vr');
  const rechts = C.trekUitPlan(v, 'bijrijder', { x: 10.6, y: 7.2 });
  check('bijrijder begint aan de rechterkant, bij zijn deur', rechts.fy > v.y + 0.2 && Math.abs(rechts.fx - (v.x + 0.645)) < 0.01, JSON.stringify(rechts));
  const links = C.trekUitPlan(v, 'bijrijder', { x: 10.6, y: 2.8 });  // belandt links, maar zijn deur is rechts
  check('de kant volgt de deur, niet waar hij belandt', links.fy > v.y && links.ty < v.y);
  v.doors = open('ar');
  const achter = C.trekUitPlan(v, 'achter', { x: 9.4, y: 7.2 });
  check('achterpassagier: achter zijn deur', achter.fx < v.x && achter.fy > v.y);
  let last = -1, mono = true;
  for (let t = 0; t <= 1.2; t += 0.02) { const d = Math.hypot(C.stepOutPos(rechts, t).x - rechts.fx, C.stepOutPos(rechts, t).y - rechts.fy); if (d < last - 1e-9) mono = false; last = d; }
  check('hij schuift alleen naar buiten', mono);
  // daarna de reacties van een autokraak: boos, bellen, één melding, nooit geweld
  const vic = C.createVictim(5);
  let report = 0, phases = [];
  for (let t = 0; t < 30; t += 0.1) {
    const o = C.stepVictim(vic, 0.1, { dCar: 4, carSpeed: 0, copNear: false });
    if (o.report) report++;
    if (!phases.length || phases[phases.length - 1] !== o.phase) phases.push(o.phase);
    if (C.victimDone(vic)) break;
  }
  check('de passagier meldt de diefstal precies één keer', report === 1 && phases.includes('call'), phases.join());
  check('en blijft bloedloos', C.VICTIM_LINES.call.every((l) => !/dood|bloed|sla|moord/i.test(l)));
}

// terugkomen bij een achtergelaten auto
{
  const run = (ctx, wants = true) => {
    const v = C.createVictim(1); v.wantsBack = wants;
    let reclaim = false, ret = false, phase = '';
    for (let i = 0; i < 700; i++) {
      const c = typeof ctx === 'function' ? ctx(i) : ctx;
      const o = C.stepVictim(v, 0.1, c);
      if (o.move === 'return') ret = true;
      if (o.reclaim) reclaim = true;
      phase = o.phase;
      if (phase === 'done') break;
    }
    return { reclaim, ret, phase };
  };
  const vrij = { dCar: 20, carSpeed: 0, carFree: true };
  const r1 = run(vrij);
  check('achtergelaten auto dichtbij: hij loopt terug (en geeft op als hij er niet komt)', r1.ret && !r1.reclaim && r1.phase === 'done', JSON.stringify(r1));
  const r2 = run({ dCar: 20, carSpeed: 0, carFree: false });
  check('auto nog in gebruik: hij blijft weg', !r2.ret && !r2.reclaim);
  const r3 = run({ dCar: 80, carSpeed: 0, carFree: true });
  check('auto te ver weg: hij laat het zitten', !r3.ret);
  const r4 = run(vrij, false);
  check('wie niet terug wil, komt ook niet terug', !r4.ret && !r4.reclaim);
  const r5 = run((i) => ({ dCar: Math.max(1.2, 30 - i * 0.2), carSpeed: 0, carFree: true }));
  check('bij de auto aangekomen stapt hij in', r5.reclaim);
  check('terugkomregels zijn tekst', C.VICTIM_LINES.back.every((l) => typeof l === 'string' && l.length > 5));
}
console.log(bad ? `${bad}/${n} mislukt` : `${n}/${n} ok`);
process.exit(bad ? 1 : 0);
