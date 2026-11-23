// Het verkeer reageert op de speler (game/js/trafficreact.js, #1315): snijden, spookrijden, rakelings passeren,
// het temperament per bestuurder en voetgangers die schrikken van een auto op de stoep. Pure test, zonder wereld.
//   node scripts/trafficreact_test.mjs
import fs from 'node:fs';
import { REACT, STARTLE, STARTLE_LINES, DRIVER_LINES, temperOf, classify, reaction, carStartle } from '../game/js/trafficreact.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const car = (o = {}) => ({ x: 0, y: 0, angle: 0, speed: 12, halfLen: 2.1, halfWid: 0.9, id: 1, ...o });

// --- classificatie -----------------------------------------------------------------------------------------
// AI-auto v op (0,0) naar +x met 12 m/s
ok(classify(car(), car({ x: 9, speed: 7 })) === 'snijden', 'speler vlak voor ons, langzamer: gesneden');
ok(classify(car(), car({ x: 9, speed: 12 })) === null, 'even hard voor ons: niets aan de hand');
ok(classify(car(), car({ x: 30, speed: 5 })) === null, 'ver voor ons: nog geen reactie');
ok(classify(car(), car({ x: 9, y: 3.5, speed: 5 })) === null, 'in de andere baan: niet gesneden');
ok(classify(car(), car({ x: 25, y: 0.5, angle: Math.PI, speed: 10 })) === 'spookrijder', 'op ons af in onze baan: spookrijder');
ok(classify(car(), car({ x: 25, y: 3.4, angle: Math.PI, speed: 10 })) === null, 'gewone tegenligger in zijn eigen baan: niets');
ok(classify(car({ speed: 0 }), car({ x: 25, angle: Math.PI, speed: 1 })) === null, 'stapvoets naderen is geen spookrijden');
ok(classify(car(), car({ x: -25, angle: Math.PI, speed: 10 })) === null, 'achter ons en van ons af: niets');
ok(classify(car(), car({ x: 0.5, y: 2.3, speed: 25 })) === 'rakelings', 'met 13 m/s verschil op 0,5 m langs: rakelings');
ok(classify(car(), car({ x: 0.5, y: 2.3, speed: 14 })) === null, 'kleine verschilsnelheid: geen schrik');
ok(classify(car(), car({ x: 0.5, y: 3.5, speed: 25 })) === null, 'met ruimte ertussen: niets');
ok(classify(car(), car({ x: 0.5, y: 1.2, speed: 25 })) === null, 'overlappend is een botsing, geen rakelings');
ok(classify(car(), car({ x: 9, speed: 5, z: 6 })) === null, 'op een ander niveau (brug, garage): niets');
const same = car(); ok(classify(same, same) === null, 'jezelf niet');

// --- temperament en reactie -----------------------------------------------------------------------------------
{
  const counts = { toeter: 0, boos: 0, kalm: 0 };
  for (let id = 0; id < 1000; id++) counts[temperOf(id)]++;
  ok(counts.toeter > counts.boos && counts.boos > counts.kalm && counts.kalm > 0, 'meesten toeteren, sommigen boos, een paar kalm', JSON.stringify(counts));
  ok(temperOf(17) === temperOf(17), 'temperament vast per voertuig');
}
const ids = { toeter: [...Array(50).keys()].find((i) => temperOf(i) === 'toeter'), boos: [...Array(50).keys()].find((i) => temperOf(i) === 'boos'), kalm: [...Array(50).keys()].find((i) => temperOf(i) === 'kalm') };
{
  const r = reaction('spookrijder', car({ id: ids.kalm }), 100, 0.5);
  ok(r && r.swerve === REACT.swerveHold && r.honk === 0, 'spookrijder: ook de kalme wijkt uit, zonder toeter');
  const b = reaction('spookrijder', car({ id: ids.boos }), 100, 0.5);
  ok(b && b.swerve > 0 && b.honk === REACT.honkHeadOn && b.gesture === REACT.gesture, 'spookrijder bij een boze: uitwijken, lange toeter en gebaar');
  ok(reaction('snijden', car({ id: ids.kalm }), 100, 0.1) === null, 'gesneden, kalme bestuurder: niets');
  const s = reaction('snijden', car({ id: ids.toeter }), 100, 0.1);
  ok(s && s.honk === REACT.honkCutIn && s.gesture === 0 && s.swerve === 0, 'gesneden: korte toeter');
  const g = reaction('rakelings', car({ id: ids.boos }), 100, 0.2);
  ok(g && g.gesture > 0, 'rakelings bij een boze: gebaar');
  ok(g.line === null || DRIVER_LINES.includes(g.line), 'opmerking is een bekende regel');
  for (let i = 0; i < 40; i++) { const x = reaction('rakelings', car({ id: ids.boos }), 100, i / 80); if (x && x.line) ok(DRIVER_LINES.includes(x.line), 'regel bekend'); }
}
{
  const v = car({ id: ids.toeter, _reactAt: 98 });
  ok(reaction('snijden', v, 100, 0.1) === null, 'afkoeltijd: niet meteen weer');
  ok(reaction('snijden', v, 98 + REACT.cooldown + 0.1, 0.1) !== null, 'na de afkoeltijd wel');
  for (const k of ['isPolice', 'sirenOn', 'isBus', 'isBike', 'isBoat']) ok(reaction('spookrijder', car({ id: ids.boos, [k]: true }), 100, 0.1) === null, `geen reactie van ${k}`);
  ok(reaction(null, car(), 100) === null && reaction('snijden', null, 100) === null, 'zonder soort of voertuig: null');
}

// --- voetgangers en een auto op de stoep -------------------------------------------------------------------------
{
  const ped = (o = {}) => ({ x: 6, y: 0.5, state: 'wander', ...o });
  const c = car({ speed: 8 });
  ok(carStartle(ped(), c, true, 50, 0.9) === 'schrik', 'snelle auto op de stoep recht op hem af: schrik');
  ok(carStartle(ped(), car({ speed: 4 }), true, 50, 0.9) === 'opzij', 'langzaam: een stap opzij');
  ok(carStartle(ped(), car({ speed: 4 }), true, 50, 0.1) === 'schrik', 'soms schrikt ook een langzame passant');
  ok(carStartle(ped(), c, false, 50, 0.1) === null, 'op de rijbaan: geen schrik (dat is uitwijken, pedestrians.js)');
  ok(carStartle(ped(), car({ speed: 1.5 }), true, 50, 0.1) === null, 'stapvoets parkeren op de stoep: niemand schrikt');
  ok(carStartle(ped({ x: -8 }), c, true, 50, 0.1) === null, 'achter de auto: niets');
  ok(carStartle(ped({ y: 6 }), c, true, 50, 0.1) === null, 'ver opzij: niets');
  ok(carStartle(ped({ x: 30 }), c, true, 50, 0.1) === null, 'ver vooruit: nog niets');
  ok(carStartle(ped({ isCop: true }), c, true, 50, 0.1) === null, 'een agent schrikt niet');
  ok(carStartle(ped({ state: 'flee' }), c, true, 50, 0.1) === null, 'wie al vlucht niet nog eens');
  ok(carStartle(ped({ _startleAt: 48 }), c, true, 50, 0.1) === null, 'afkoeltijd per voetganger');
  ok(carStartle(ped({ _startleAt: 50 - STARTLE.cooldown - 1 }), c, true, 50, 0.1) === 'schrik', 'na de afkoeltijd weer');
  ok(STARTLE_LINES.length >= 4 && STARTLE_LINES.every((l) => typeof l === 'string' && l.length < 40), 'korte regels');
}

// --- bedrading -----------------------------------------------------------------------------------------------
{
  const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const tr = src('vehicle/traffic.js'), pe = src('pedestrians.js'), sc = src('scene3d.js');
  ok(/reactToHumanDrivers\(v, world\)/.test(tr) && /classify\(v, ds\[i\]\)/.test(tr), 'traffic.js laat elke AI-auto reageren op de menselijke bestuurders');
  ok(/reactHornUntil/.test(tr) && /v\.horn = [^;]*reactHornAt/.test(tr), 'de reactietoeter gaat via de gewone toetervlag (ook naar gasten)');
  ok(/carStartle\(ped, walkCar/.test(pe), 'pedestrians.js laat voetgangers schrikken van een auto op de stoep');
  ok(/fistOverlay\(df, world\.time\)/.test(sc), 'scene3d tekent het boze gebaar op de bestuurdersfiguur');
}

console.log(fails ? `trafficreact_test: ${fails} van ${n} mislukt` : `trafficreact_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
