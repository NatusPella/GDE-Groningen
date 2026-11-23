// Landings en stof (game/js/landfeel.js, juice 23-11): voeten, voertuigen en snelheidsstrepen.
import { makeFootFx, tickFootFx, dustLook, footLandPuffs, footLandDip, vehicleLandFx, VEHICLE_LAND_MIN, streakAmount, STREAK_MAX, RUN_DUST_FROM } from '../game/js/landfeel.js';
import { effectsFor } from '../game/js/a11ylogic.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const FX = effectsFor({}), RM = effectsFor({ reduceMotion: true });
const DT = 1 / 60;

// een sprong: opstijgen, een landing met kracht, daarna rust; elk precies eenmaal
{
  const st = makeFootFx(), out = {}, p = { z: 0, gz: 0, vx: 0, vy: 0 };
  let take = 0, land = 0, lk = 0;
  for (let i = 0; i < 90; i++) {
    const t = i * DT;
    p.z = Math.max(0, 1.1 * 4 * (t / 0.6) * (1 - t / 0.6));
    tickFootFx(st, p, DT, out);
    if (out.takeoff) take++;
    if (out.land) { land++; lk = out.land; }
  }
  ok(take === 1 && land === 1, 'een sprong geeft een opstijging en een landing', `${take}/${land}`);
  ok(lk >= 0.9 && lk <= 1, 'een hele sprong landt vol', lk);
}
// een klein hupje: geen landing
{
  const st = makeFootFx(), out = {}, p = { z: 0, gz: 0, vx: 0, vy: 0 };
  let land = 0;
  for (let i = 0; i < 20; i++) { p.z = i > 2 && i < 10 ? 0.08 : 0; tickFootFx(st, p, DT, out); if (out.land) land++; }
  ok(land === 0, 'een hupje van 8 cm is geen landing');
}
// aanzetten tot rennen: één stofwolkje, sleep alleen vanaf rentempo
{
  const st = makeFootFx(), out = {}, p = { z: 0, gz: 0, vx: 0, vy: 0 };
  let launches = 0, trail = 0;
  for (let i = 0; i < 120; i++) {
    p.vx = Math.min(6.8, i * 0.4);
    tickFootFx(st, p, DT, out);
    if (out.launch) launches++;
    if (out.runRate > 0) trail++;
    ok(!(out.runRate > 0) || p.vx > RUN_DUST_FROM, 'geen sleepstof onder rentempo', p.vx);
  }
  ok(launches === 1, 'een startwolkje bij het aanzetten', launches);
  ok(trail > 60, 'stof volgt het rennen', trail);
  p.crouching = true; tickFootFx(st, p, DT, out);
  ok(!(out.runRate > 0), 'gehurkt geen sleepstof');
}
// stof per ondergrond
{
  const g = dustLook('gras'), a = dustLook('asfalt'), u = dustLook('onbekend');
  ok(g[0] < a[0] && g[3] > a[3], 'gras geeft bruiner, dikker stof dan asfalt');
  ok(u.length === 4 && u[3] > 0, 'onbekende ondergrond valt terug op klinkers');
}
// landingskracht en camera
{
  ok(footLandPuffs(1) > footLandPuffs(0.3), 'zwaardere landing, meer stof');
  ok(footLandDip(1, FX) < footLandDip(0.3, FX) && footLandDip(0.3, FX) < 0, 'zwaardere landing zakt dieper');
  ok(footLandDip(1, RM) === 0, 'bij beweging beperken geen camerazakking');
  ok(Math.abs(footLandDip(1, FX)) < 0.04, 'de zakking blijft klein (< 2,3 graden)', footLandDip(1, FX));
}
// voertuigen
{
  ok(vehicleLandFx(VEHICLE_LAND_MIN - 0.1, true) === null, 'een zachte landing doet niets');
  const soft = { ...vehicleLandFx(4, true, false, FX) }, hard = { ...vehicleLandFx(11, true, false, FX) };
  ok(hard.puffs > soft.puffs && hard.haptic > soft.haptic && hard.dip < soft.dip, 'harder is meer');
  ok(hard.sparks > 0 && vehicleLandFx(11, false, false, FX).sparks === 0, 'vonken alleen op verharding');
  ok(vehicleLandFx(11, true, true, FX).sparks === 0, 'een fiets geeft geen vonken');
  ok(vehicleLandFx(11, true, false, RM).dip === 0, 'bij beweging beperken geen dreun in beeld');
}
// snelheidsstrepen
{
  ok(streakAmount(0, FX) === 0 && streakAmount(3, FX) === 0, 'geen strepen bij lage snelheid');
  ok(streakAmount(11, FX) === STREAK_MAX && streakAmount(40, FX) === STREAK_MAX, 'strepen begrensd');
  ok(streakAmount(7, FX) > 0 && streakAmount(7, FX) < STREAK_MAX, 'strepen groeien met de snelheid');
  ok(streakAmount(11, RM) === 0, 'bij beweging beperken geen strepen');
  ok(streakAmount(NaN, FX) === 0, 'NaN geeft 0');
}
console.log(`landfeel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
