// Muggings in the risky wijken after dark (muggingrules.js): when it can happen,
// how much is lost, the chase, the map warning, and that the wijken it names
// exist on the city map. No violence anywhere in the text.
//   node scripts/muggings_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as M from '../game/js/muggingrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- night and risk
{
  check('night factor: day 0, evening a bit, night full', M.nightFactor(14) === 0 && M.nightFactor(19) < M.nightFactor(20) && M.nightFactor(20) < M.nightFactor(21) && M.nightFactor(23.5) === 1 && M.nightFactor(2) === 1 && M.nightFactor(7) === 0);
  check('night factor wraps and rejects junk', M.nightFactor(25) === 1 && M.nightFactor(-1) === 1 && M.nightFactor(NaN) === 0 && M.nightFactor(undefined) === 0);
  check('no risk by day', Object.keys(M.RISKY).every((w) => M.riskLevel(w, 13) === 0 && !M.warnsOn(w, 13)));
  check('risk at night in the risky wijken', Object.keys(M.RISKY).every((w) => M.riskLevel(w, 1) > 0 && M.warnsOn(w, 1)));
  check('busy nightlife wijken are riskier than empty business parks', M.riskLevel('Binnenstad', 1) > M.riskLevel('Peizerweg', 1) && M.riskLevel('Binnenstad', 1) === 1);
  check('no risk elsewhere', M.riskLevel('Selwerd', 1) === 0 && M.riskLevel('', 1) === 0 && M.riskLevel(undefined, 1) === 0 && M.riskLevel('Zuiderpark', 23) === 0);
  check('warning on the map from the evening on, by the sun (the same night as the street lights), not by day', M.warnsOn('Stationsgebied', 21) && !M.warnsOn('Stationsgebied', 14) && !M.warnsOn('Peizerweg', 14) && M.warnsOn('Peizerweg', 23));
  check('every risky wijk has a reason in plain words', Object.keys(M.RISKY).every((w) => M.riskWhy(w).length > 8) && M.riskWhy('Selwerd') === '');
  check('the hazard grows with the risk and is a small per-second chance', M.hazard(1) > M.hazard(0.5) && M.hazard(0) === 0 && M.hazard(1) < 0.02 && M.hazard(-1) === 0);
  // expected time to the first mugging standing in the busiest wijk at night: a few minutes
  const mean = 1 / M.hazard(1);
  check('on average a few minutes in the busiest wijk', mean > 120 && mean < 400, mean);
}

// --- when it may happen
{
  const ok = { onFoot: true, busy: false, wanted: 0, since: 1e9, time: 1000, money: 200 };
  check('may happen on foot, calm, with money', M.mayMug(ok));
  for (const [k, v] of [['onFoot', false], ['busy', true], ['dead', true], ['wanted', 2], ['since', 100], ['time', 30], ['money', 20]]) check(`not when ${k}`, !M.mayMug({ ...ok, [k]: v }));
  check('not without a state', !M.mayMug(null) && !M.mayMug({}));
  check('a cooldown of several minutes between two', M.MUG.cooldown >= 300);
}

// --- the loss
{
  check('nothing to steal from a thin wallet', M.stolenAmount(24) === 0 && M.stolenAmount(0) === 0 && M.stolenAmount(NaN) === 0 && M.stolenAmount(-5) === 0);
  check('a share of the money, in steps of five', M.stolenAmount(100) === 20 && M.stolenAmount(250) === 50 && M.stolenAmount(40) === 10 && M.stolenAmount(25) === 10);
  check('never more than the cap, never more than you have', M.stolenAmount(100000) === M.MUG.max && [25, 26, 30, 99, 1234].every((m) => M.stolenAmount(m) <= m && M.stolenAmount(m) >= M.MUG.min));
  let mono = true, prev = 0;
  for (let m = 25; m < 5000; m += 7) { const a = M.stolenAmount(m); if (a < prev) mono = false; prev = a; }
  check('the loss never shrinks as you carry more', mono);
  check('a share, not everything', [30, 100, 500, 3000].every((m) => M.stolenAmount(m) <= m * 0.5));
}

// --- the chase
{
  // simulate: thief at 6.0 m/s on a straight line, the player sprinting at 6.8 m/s after a reaction delay
  const chase = (react, speed) => {
    let gap = M.MUG.snatchReach, t = 0, res = 'running';
    const dt = 0.05;
    while (res === 'running' && t < 120) {
      t += dt;
      gap += (M.MUG.fleeSpeed - (t > react ? speed : 0)) * dt;
      if (M.caught(gap, t)) res = 'caught';
      else if (M.escaped(gap, t)) res = 'escaped';
    }
    return { res, t };
  };
  check('an instant sprint is not caught in the first second (head start)', !M.caught(0.5, 0.5) && M.caught(0.5, 1.3));
  const fast = chase(0.5, 6.8), slowSprint = chase(2.5, 6.8), walking = chase(0.5, 3.5);
  check('sprinting after him catches him within the time', fast.res === 'caught' && fast.t < M.MUG.giveUpAfter, JSON.stringify(fast));
  check('hesitating makes it a longer run, but still possible within the limit', slowSprint.res === 'caught' && slowSprint.t > fast.t, JSON.stringify(slowSprint));
  check('walking never catches him: he gets away', walking.res === 'escaped');
  check('the thief is slower than your sprint but faster than your walk', M.MUG.fleeSpeed < 6.8 && M.MUG.fleeSpeed > 3.6);
  check('giving up: far away or too long', M.escaped(80, 5) && M.escaped(10, 31) && !M.escaped(30, 10));
}

// --- the text: calm, no violence
{
  const T = M.MUG_TEXT;
  const all = [T.warnTitle('Binnenstad'), T.warnBody('uitgaansdrukte'), T.tip, T.snatch(40), T.back(40), T.gone(40), ...T.thiefBark].join(' ');
  check('no violence in the words', !/(geslagen|mes|pistool|bloed|dood|steek|vechten|geweld|slaat|schiet)/i.test(all), all);
  check('the amounts show in the lines', T.snatch(40).includes('€40') && T.back(40).includes('€40') && T.gone(40).includes('€40'));
  check('the warning names the wijk and says what to do', T.warnTitle('Binnenstad').includes('Binnenstad') && /drukke straten|niet te veel geld/.test(T.warnBody('x')));
}

// --- the wijken exist on the city map
{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const { loadStadData } = await import('./lib/loadworld.mjs');
  const map = await loadStadData();
  const names = new Set((map.meta.neighbourhoodPoints || []).map((p) => p.name));
  const missing = Object.keys(M.RISKY).filter((w) => !names.has(w));
  check('every risky wijk is a named wijk on the map', missing.length === 0, missing.join(', '));
  check('only a minority of the wijken carries a warning', Object.keys(M.RISKY).length <= names.size * 0.25, `${Object.keys(M.RISKY).length}/${names.size}`);
  const src = fs.readFileSync(path.join(here, '../game/js/mapview.js'), 'utf8');
  check('the map draws the warning', /warnsOn\(p\.name/.test(src));
}

console.log(`muggings: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
