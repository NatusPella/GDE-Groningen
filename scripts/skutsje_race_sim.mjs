// Sails the Skûtsje-sprint (game/js/pg_skutsje.js) headless: the player's
// skûtsje on the real boat physics (drivePlayerBoat, as player.js drives it) against Jelle's
// scripted boat, for several wind directions. A helmsman on the route line
// with the ideal trim must beat Jelle clearly; a sloppy one (trim 25 degrees
// off, weaving) must still lose. Also checks that a skûtsje and a sloep keep
// their way under the Diepenring's bridges.
//   node scripts/skutsje_race_sim.mjs
import './node3d.mjs';
import fs from 'node:fs';

await import('../game/js/sidejobs.js'); // laadvolgorde: eerst de takenlijst (importcyclus), anders TDZ in sidejobs.js
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { Vehicle, drivePlayerBoat } = await import('../game/js/vehicle.js');
const { normalizeAngle, clamp } = await import('../game/js/util.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
const { routeAt, prepareDiepenringRoute, diepenringProgress } = await import('../game/js/rondvaartchase.js');
const { sailPolar, idealTrim, sailSpeed, jelleSpeed } = await import('../game/js/pg_skutsje.js');

const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
prepareDiepenringRoute(map);
const s0 = diepenringProgress(751.16, 380.57).s, s1 = diepenringProgress(-373.03, 288.27).s;
const DEG = Math.PI / 180, DT = 1 / 60, LIMIT = 600;

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

// as pg_skutsje.js bridgeAhead
const bridgeAhead = (v, reach = 11) => {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  for (let k = -3; k <= reach; k += 2) if (map.isOnBridge(v.x + c * k, v.y + s * k)) return true;
  return false;
};
const underBridge = (v) => map.isOnBridge(v.x, v.y);
const offWind = (h, wf) => Math.abs(Math.atan2(Math.sin(wf - h), Math.cos(wf - h)));

let steerSign;
{
  const v = new Vehicle(0, 0, 0, { ...BOAT_KINDS.sloep });
  v.isBoat = true; v.driver = 'player'; v.speed = 3;
  for (let i = 0; i < 30; i++) v.applyControls(DT, 1, 1, false);
  steerSign = normalizeAngle(v.angle) > 0 ? 1 : -1;
}

// One race. sail = null drives a plain player boat (no sail) along the route.
function race(model, { wind = 0.4, trimErr = 0, weave = 0, sail = true } = {}) {
  const wf = wind + Math.PI;
  const q0 = routeAt(s0);
  const v = new Vehicle(q0.x, q0.y, q0.a, { ...model });
  v.isBoat = true; v.driver = 'player';
  if (sail) v.sailTop = 0;
  let ps = s0, pi = null, js = s0 + 4, jspeed = 0, t = 0, jfin = null, bumps = 0;
  const jv = { x: 0, y: 0, angle: q0.a };
  let under = 0, underMin = Infinity, cruise = 0, cruiseN = 0;
  while (t < LIMIT) {
    const pr = diepenringProgress(v.x, v.y, pi);
    pi = pr.i;
    if (pr.d < 60) ps = pr.s;
    if (ps >= s1 - 4) break;
    if (sail) {
      const theta = offWind(v.angle, wf), ideal = idealTrim(theta);
      const trim = clamp(ideal + trimErr, 5 * DEG, 85 * DEG);
      const trimEff = clamp(1 - ((trim - ideal) / (35 * DEG)) ** 2, 0.3, 1);
      v.sailTop = sailSpeed(sailPolar(theta) * trimEff, bridgeAhead(v) ? 1 : 0);
    }
    if (t > 30) {
      if (underBridge(v)) { under++; underMin = Math.min(underMin, v.speed); } else { cruise += v.speed; cruiseN++; }
    }
    const g = routeAt(ps + 16);
    const want = Math.atan2(g.y - v.y, g.x - v.x) + weave * Math.sin(t * 0.7);
    const steer = clamp(normalizeAngle(want - v.angle) * 2.2 * steerSign, -1, 1);
    if (!drivePlayerBoat(v, map, DT, 1, steer, false)) bumps++;
    // Jelle, as placeJelle
    const q = routeAt(js);
    jv.x = q.x; jv.y = q.y; jv.angle = q.a;
    const jw = jfin != null ? 0 : jelleSpeed(offWind(q.a, wf), bridgeAhead(jv) ? 1 : 0, js - ps);
    jspeed += clamp(jw - jspeed, -2 * DT, 0.9 * DT);
    js += jspeed * DT;
    if (jfin == null && js >= s1) jfin = t;
    t += DT;
  }
  return { t, done: ps >= s1 - 4, jfin, lead: s1 - js, bumps, under, underMin, cruise: cruise / Math.max(1, cruiseN) };
}

for (const wind of [0.4, 2.0, 3.6, 5.2]) {
  const good = race(BOAT_KINDS.skutsje, { wind });
  const bad = race(BOAT_KINDS.skutsje, { wind, trimErr: 25 * DEG, weave: 0.25 });
  console.log(`wind ${wind.toFixed(1)}: ideal ${good.t.toFixed(0)} s, Jelle ${good.jfin == null ? good.lead.toFixed(0) + ' m behind' : 'first'}, ` +
    `under bridges min ${good.underMin.toFixed(1)} m/s (cruise ${good.cruise.toFixed(1)}) | sloppy ${bad.done ? bad.t.toFixed(0) + ' s' : 'not home'}, Jelle ${bad.jfin != null ? bad.jfin.toFixed(0) + ' s' : 'behind'}`);
  ok(good.done && good.t < LIMIT * 0.6, `wind ${wind}: an ideal line gets home well inside the limit`);
  ok(good.jfin == null && good.lead > 40, `wind ${wind}: an ideal line beats Jelle clearly`);
  ok(good.under > 0 && good.underMin > good.cruise * 0.55, `wind ${wind}: the skûtsje keeps its way under the bridges`);
  ok(!bad.done || (bad.jfin != null && bad.jfin < bad.t), `wind ${wind}: a sloppy line loses to Jelle`);
}
const sloep = race(BOAT_KINDS.sloep, { sail: false });
console.log(`sloep: ${sloep.t.toFixed(0)} s, under bridges min ${sloep.underMin.toFixed(1)} m/s (cruise ${sloep.cruise.toFixed(1)}), ${sloep.bumps} bumps`);
ok(sloep.done && sloep.under > 0 && sloep.underMin > sloep.cruise * 0.7, 'a sloep keeps its speed under the bridges');

console.log(`${n - fails}/${n} ok`);
if (fails) process.exit(1);
