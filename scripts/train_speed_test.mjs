// Treinen rijden nooit sneller dan een echte trein (#1339, #1348). De spelklok loopt 60 keer sneller dan de wereld; een trein die zijn
// plek uit het rooster haalt (trainservice.js) legde daardoor een stationsafstand af met ~1000 m/s. Deze test draait de echte spoorlijnen van
// de stad met het echte rooster, in stappen van 1/240 s tot 0,25 s (haperend beeld), en meet per beeld de verplaatsing langs de lijn
// van elke trein die in het vorige beeld ook in de wereld was. Daarbovenop: de gast (zelfde klok) en een sprong in de klok (laden).
//   node scripts/train_speed_test.mjs   (zonder game/world: SKIP)
import fs from 'node:fs';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP train_speed_test: geen game/world'); process.exit(0); }
const TW = await laadStadTegels();
const map = TW.world;
const PW = await import('../game/js/provinceworld.js');
PW.initProvince({ index: TW.index, world: map });
const RW = await import('../game/js/railway.js');
const { createServiceSource, DIENST } = await import('../game/js/trainservice.js');
const rooster = JSON.parse(fs.readFileSync(new URL('../game/trainschedule.json', import.meta.url), 'utf8'));

let n = 0, bad = 0;
const ok = (c, m, i = '') => { n++; if (!c) { bad++; console.log('FAIL', m, i); } };
const mkWorld = () => ({ map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null, time: 0, clock: 6, money: 0, wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} }, onRespawn: [], audioEvents: [], particles: [], addMessage() {}, health: 100, armor: 0 });
const world = mkWorld();
RW.initRailway(world);
RW.setTreinDienst(createServiceSource({ rooster: () => rooster, routes: RW.getRoutes, dagsoort: () => 'werk', klok: (w) => w.clock || 0 }));
const CAP = 22 * 1.5;   // m/s: ruim boven kruissnelheid (vmax van een intercity is 24 m/s)

const meet = (dt, uren, stap, w = world, start = 6) => {
  w.clock = start;
  let worst = 0, gezien = 0, wie = '';
  const vorig = new Map();
  const frames = Math.round(uren * 3600 / 60 / dt);   // uren spelklok -> echte seconden -> beelden
  for (let k = 0; k < frames; k++) {
    stap(dt, w);
    w.clock += dt * 24 / (24 * 60);                   // daynight.js: 24 uur per DAY_LENGTH_S
    w.time += dt;
    const nu = new Map();
    for (const t of RW.getTrains()) {
      nu.set(t, { c: t.c, rit: t.rit && t.rit.leg.id });
      const p = vorig.get(t);
      if (!p || p.rit !== (t.rit && t.rit.leg.id)) continue;
      const v = Math.abs(t.c - p.c) / dt;
      gezien++;
      if (v > worst) { worst = v; wie = `${t.route.name} ${t.rit ? t.rit.leg.id : 'pendel'} klok ${w.clock.toFixed(3)}`; }
      if (Math.abs(t.v) > 24.01 && t.state !== 'player') ok(false, 'gemelde snelheid onder vmax', `${t.v} ${wie}`);
    }
    vorig.clear(); for (const [t, x] of nu) vorig.set(t, x);
  }
  return { worst, gezien, wie };
};

for (const dt of [1 / 240, 1 / 60, 1 / 30, 0.1, 0.25]) {
  const r = meet(dt, 4, (d, w) => RW.updateRailway(d, w));
  ok(r.gezien > 2000, `dt ${dt.toFixed(4)}: genoeg treinbeelden gemeten`, r.gezien);
  ok(r.worst <= CAP, `dt ${dt.toFixed(4)}: de snelste trein rijdt ${r.worst.toFixed(1)} m/s (max ${CAP})`, r.wie);
}
// de gast rekent zelf uit de klok: dezelfde treinen, dezelfde snelheid
{
  const r = meet(1 / 60, 2, (d, w) => RW.gastOverwegen(d, w), world, 12);
  ok(r.worst <= CAP, `gast: de snelste trein rijdt ${r.worst.toFixed(1)} m/s`, r.wie);
}
// laden: de klok springt (opgeslagen spel, slapen, reizen): de eerste beelden daarna geven geen trein een sprong boven de bovengrens
{
  world.clock = 3; RW.updateRailway(1 / 60, world);
  world.clock = 15.5; RW.updateRailway(1 / 60, world);
  const r = meet(1 / 60, 1, (d, w) => RW.updateRailway(d, w), world, 15.5);
  ok(r.worst <= CAP, `na een sprong in de klok: ${r.worst.toFixed(1)} m/s`, r.wie);
}
// de tabel zelf: elk rooster-interval blijft onder de bovengrens bij 1 spelseconde per beeld
ok(DIENST.vReis <= 24, 'de kruissnelheid van de dienst is niet hoger dan de vmax van een trein');

console.log(bad ? `${bad} van ${n} mislukt` : `train_speed_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
