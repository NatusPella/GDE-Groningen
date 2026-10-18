// Hoogvlieger (reuzenrad): de regels.
//   node scripts/reuzenrad_test.mjs
import * as W from '../game/js/reuzenradrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

check('gondel 0 staat op rot=0 rechts van de as', near(W.gondolaPivot(0, 0).u, W.WHEEL_AT.u + W.R) && near(W.gondolaPivot(0, 0).h, W.AX));
check('een kwartslag omhoog staat op de top', near(W.gondolaPivot(0, Math.PI / 2).h, W.AX + W.R) && near(W.gondolaPivot(0, Math.PI / 2).u, W.WHEEL_AT.u));
check('de gondel hangt onder zijn draaipunt', near(W.seatPose(3, 0.4).h, W.gondolaPivot(3, 0.4).h - W.SEAT_DROP));
check('het laagste punt ligt boven de grond', W.seatPose(9, 0).h > 0.3, W.seatPose(9, 0).h);
check('wrapAngle blijft in (-pi, pi]', [-10, -3.2, 0, 3.2, 10, 6.4].every((a) => { const x = W.wrapAngle(a); return x > -Math.PI - 1e-9 && x <= Math.PI + 1e-9 && near(Math.cos(x), Math.cos(a)); }));

// gondel 9 staat bij rot=0 precies onderaan (9/12 * 2pi = 3pi/2 = -pi/2)
check('gondel 9 hangt bij rot 0 onderaan', near(W.bottomGap(9, 0), 0));
const b0 = W.nearestToBoarding(0);
check('instappen kan bij gondel onderaan', b0.ok && b0.index === 9 && near(b0.gap, 0));
check('tussen twee gondels kan het niet', !W.nearestToBoarding(Math.PI / W.N).ok);
check('tussen twee gondels wacht je even', W.secondsToNextGondola(Math.PI / W.N) > 0 && W.secondsToNextGondola(0) === 0);

// de wachttijd is nooit langer dan de afstand tussen twee gondels
let maxWait = 0, okAll = true;
for (let r = 0; r < 2 * Math.PI; r += 0.01) {
  const s = W.secondsToNextGondola(r);
  maxWait = Math.max(maxWait, s);
  if (!W.nearestToBoarding(r + s * W.OMEGA + (s > 0 ? 1e-6 : 0)).ok) okAll = false;
}
check('na het wachten staat er een gondel klaar', okAll);
check('wachttijd is hooguit een gondelafstand', maxWait <= (2 * Math.PI / W.N) / W.OMEGA, maxWait);
check('het venster is korter dan de gondelafstand (geen dubbele keus)', W.BOARD_WINDOW * 2 < 2 * Math.PI / W.N);

// de rit eindigt precies onderaan na LAPS rondes
for (const start of [0, 0.13, 1.7, 5]) {
  const b = W.nearestToBoarding(start);
  if (!b.ok) continue;
  const plan = W.ridePlan(start, b.index);
  check(`rit vanaf ${start}: einde hangt onderaan`, near(W.bottomGap(b.index, plan.endRot), 0, 1e-9));
  check(`rit vanaf ${start}: ${W.LAPS} rondes`, Math.abs((plan.endRot - plan.startRot) - W.LAPS * 2 * Math.PI) <= W.BOARD_WINDOW + 1e-9);
  check(`rit vanaf ${start}: start niet klaar, eind wel`, !W.rideDone(plan, start) && W.rideDone(plan, plan.endRot));
  check(`rit vanaf ${start}: voortgang 0..1`, W.rideFraction(plan, start) === 0 && W.rideFraction(plan, plan.endRot) === 1);
  check(`rit vanaf ${start}: uitstappen kan aan het eind, niet halverwege`, W.mayExit(plan, plan.endRot) && !W.mayExit(plan, plan.startRot + Math.PI));
}
check('rit duurt een paar minuten, niet seconden', (() => { const s = W.rideSecondsLeft(W.ridePlan(0, 9), 0); return s > 90 && s < 150; })());

// uitstappunt en instap
check('instap staat aan de marktkant, vrij van de poten', W.LOAD_AT.v > W.WHEEL_AT.v + 2.5);
check('nearLoading', W.nearLoading(W.LOAD_AT.u, W.LOAD_AT.v) && !W.nearLoading(W.WHEEL_AT.u + 20, W.WHEEL_AT.v));

// rondkijken
let l = W.lookStep({ yaw: 0, pitch: 0 }, 10, 5);
check('kijkhoek omhoog is begrensd', l.pitch === W.PITCH_MAX && Math.abs(l.yaw) <= Math.PI);
l = W.lookStep(l, 0, -50);
check('kijkhoek omlaag is begrensd', l.pitch === W.PITCH_MIN);
const d = W.lookDir({ yaw: 0.7, pitch: 0.3 });
check('kijkrichting is een eenheidsvector', near(Math.hypot(d.u, d.v, d.h), 1));

console.log(bad ? `${bad} van ${n} mislukt` : `reuzenrad_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
