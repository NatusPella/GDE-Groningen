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
console.log(bad ? `${bad}/${n} mislukt` : `${n}/${n} ok`);
process.exit(bad ? 1 : 0);
