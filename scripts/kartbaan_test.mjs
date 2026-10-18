// The kart track on the real Kartbaan Ulrum (OSM way 474012393, kartbaandata.js,
// issue #176): the ring, the start on the longest straight, a race on it, and
// the clear zone round it.
//   node scripts/kartbaan_test.mjs
import * as KR from '../game/js/kartrace.js';
import { ULRUM_RING, ringToLocal, startOnLongestStraight } from '../game/js/kartbaandata.js';
import { addClearZone, removeClearZone, inClearZone, corridorPoints } from '../game/js/clearzone.js';

let bad = 0;
const check = (n, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', n, info); } };

const R = ringToLocal();
check('the ring has the mapped vertices', ULRUM_RING.length === 51, ULRUM_RING.length);
check('the ring lies at Ulrum', R.lat0 > 53.36 && R.lat0 < 53.363 && R.lon0 > 6.34 && R.lon0 < 6.343, `${R.lat0} ${R.lon0}`);
const xs = R.pts.map((p) => p[0]), ys = R.pts.map((p) => p[1]);
check('it is a track of about 70 x 70 m', Math.max(...xs) - Math.min(...xs) > 60 && Math.max(...xs) - Math.min(...xs) < 90 && Math.max(...ys) - Math.min(...ys) > 60 && Math.max(...ys) - Math.min(...ys) < 90);

const ctl = startOnLongestStraight(R.pts);
check('the loop gains one start point', ctl.length === R.pts.length + 1);
const T = KR.buildTrack(ctl, 7);
check('the lap is 300-380 m', T.length > 300 && T.length < 380, T.length.toFixed(0));
// the grid is up to 14 m behind the line: that stretch and 6 m after it must be straight
let maxCurv = 0;
for (let s = T.length - 15; s < T.length + 6; s += 1.5) { const i = ((Math.round(s / T.step)) % T.N + T.N) % T.N; maxCurv = Math.max(maxCurv, T.curv[i]); }
check('the start line has a straight under the grid', maxCurv < 0.02, maxCurv.toFixed(3));
let minGap = 1e9;
for (let i = 0; i < T.N; i++) for (let j = i + 30; j < T.N - 30; j += 3) minGap = Math.min(minGap, Math.hypot(T.u[i] - T.u[j], T.v[i] - T.v[j]));
check('parts of the track keep wall room from each other', minGap > 2 * (T.hw + KR.RUNOFF) + 1.5, minGap.toFixed(1));

// a race against the AI
const race = (drive) => {
  const karts = [KR.createKart(T, 0, { player: true, name: 'jij' }), KR.createKart(T, 1, { skill: 0.93 }), KR.createKart(T, 2, { skill: 0.97 }), KR.createKart(T, 3, { skill: 1.01 })];
  const dt = 1 / 60;
  let t = 0, maxOff = 0;
  for (; t < 300; t += dt) {
    for (const k of karts) {
      let inp;
      if (k.player) inp = drive(k, karts, dt);
      else { const gap = k.prog - karts[0].prog; inp = KR.aiInput(k, T, { band: gap > 45 ? 0.96 : gap < -45 ? 1.04 : 1, others: karts, dt }); }
      if (k.finished) inp = KR.aiInput(k, T, { skill: 0.55, others: karts, dt });
      KR.stepKart(k, inp, dt, T);
      KR.updateProgress(k, T, t);
      if (!k.finished) maxOff = Math.max(maxOff, Math.abs(k.off));
    }
    KR.collideKarts(karts);
    if (karts.every((k) => k.finished)) break;
  }
  return { karts, maxOff, rank: KR.rankKarts(karts) };
};
const best = race((k) => KR.bestInput(k, T));
check('everybody finishes three laps', best.karts.every((k) => k.finished && k.lapTimes.length === KR.LAPS), best.karts.map((k) => k.lapTimes.length).join(','));
check('laps take 28-45 s', best.karts.every((k) => k.lapTimes.slice(1).every((x) => x > 28 && x < 45)), best.karts.map((k) => k.lapTimes.map((x) => x.toFixed(1))).join(' | '));
check('the karts stay inside the tyre wall', best.maxOff < T.hw + KR.RUNOFF + 0.8, best.maxOff.toFixed(1));
check('a clean bot is not last', best.rank.indexOf(best.karts[0]) <= 1);
const idle = race(() => ({ throttle: 0, steer: 0, drift: false }));
check('a player who does nothing is last and does not finish', !idle.karts[0].finished && idle.rank[3] === idle.karts[0]);

// the clear zone round the track
addClearZone('kartbaan', corridorPoints(T, (u, v) => ({ x: u, y: v })), 3.5 + KR.RUNOFF + 3);
let allIn = true;
for (let i = 0; i < T.N; i++) if (!inClearZone(T.u[i], T.v[i])) allIn = false;
check('the whole track is in the clear zone', allIn);
check('a spot 40 m beyond the track is outside it', !inClearZone(Math.max(...T.u) + 40, T.v[0]));
removeClearZone('kartbaan');

console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
