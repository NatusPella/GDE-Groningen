// Het ballonvliegmodel (#1377, L3a): branden = stijgen, wind = drift, geen sturen behalve hoogte.
//   node scripts/balloonflight_test.mjs
import assert from 'node:assert/strict';
import * as B from '../game/js/balloonflight.js';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);
const run = (s, input, secs, wind, dt = 0.1) => {
  const ev = [];
  for (let t = 0; t < secs; t += dt) ev.push(...B.stepBalloon(s, typeof input === 'function' ? input(t) : input, dt, wind));
  return ev;
};
const WIND = { angle: 0, speed: 4 };

// 1) op de grond blijft hij staan zolang je niet brandt
{
  const s = B.newBalloonFlight(100, 200);
  const ev = run(s, {}, 30, WIND);
  ok(s.onGround && s.z === 0 && s.x === 100 && s.y === 200 && ev.length === 0, 'zonder brander blijft hij staan');
}

// 2) branden = stijgen, met een gebeurtenis bij het loskomen; de brander kost brandstof
{
  const s = B.newBalloonFlight(0, 0);
  const ev = run(s, { burn: true }, 20, WIND);
  ok(ev.filter((e) => e.type === 'opgestegen').length === 1, 'één keer opgestegen');
  ok(s.z > 20 && !s.onGround && s.vz > 0, 'hij stijgt');
  ok(s.vz <= B.BALLOON_MODEL.maxClimb + 1e-9, 'stijgsnelheid begrensd');
  near(s.fuel, 1 - 20 * B.BALLOON_MODEL.fuelPerBurnS, 1e-6, 'brandstof gaat op met de brandtijd');
}

// 3) niet branden = hij koelt af en daalt weer; een zachte landing is geen harde
{
  const s = B.newBalloonFlight(0, 0);
  run(s, { burn: true }, 25, WIND);
  const top = s.z;
  ok(top > 30, 'eerst omhoog');
  const ev = run(s, {}, 400, WIND);
  ok(s.onGround && s.z === 0, 'uiteindelijk weer op de grond');
  const land = ev.find((e) => e.type === 'geland');
  ok(land, 'een landing gemeld');
  ok(s.landings === 1, 'één landing geteld');
}

// 4) de klep laat hem sneller zakken dan afkoelen
{
  const mk = () => { const s = B.newBalloonFlight(0, 0); run(s, { burn: true }, 30, WIND); return s; };
  const a = mk(), b = mk();
  run(a, {}, 20, WIND); run(b, { vent: true }, 20, WIND);
  ok(b.z < a.z, 'met de klep zit hij lager');
  ok(b.heat < a.heat, 'met de klep is de lucht koeler');
}

// 5) wind = drift: hij drijft de kant van de wind op, niet de andere kant
{
  const s = B.newBalloonFlight(0, 0);
  run(s, { burn: true }, 15, WIND);
  const x0 = s.x;
  run(s, {}, 20, WIND);
  ok(s.x > x0 + 20, 'oostwind: hij drijft naar het oosten');
  ok(Math.abs(s.y) < s.x, 'vooral naar het oosten');
  const z = B.newBalloonFlight(0, 0);
  run(z, { burn: true }, 15, { angle: Math.PI, speed: 4 });
  run(z, {}, 20, { angle: Math.PI, speed: 4 });
  ok(z.x < -20, 'westwind: naar het westen');
}

// 6) geen wind, geen drift (op hoogte blijft de zijwaartse snelheid ~0)
{
  const s = B.newBalloonFlight(0, 0);
  run(s, { burn: true }, 20, { angle: 0, speed: 0 });
  near(s.x, 0, 1e-6, 'geen wind: geen drift');
}

// 7) hoger = sterkere en gedraaide wind (je kiest je richting met je hoogte)
{
  const low = B.windAt(10, { angle: 0, speed: 4 }), high = B.windAt(400, { angle: 0, speed: 4 });
  ok(high.speed > low.speed * 1.5, 'op hoogte waait het harder');
  ok(Math.abs(high.angle - low.angle) > 0.2, 'op hoogte is de wind gedraaid');
  ok(B.windAt(-5, {}).speed > 0 && Number.isFinite(B.windAt(NaN, {}).vx), 'ongeldige hoogte geeft een geldige wind');
}

// 8) het plafond
{
  const s = B.newBalloonFlight(0, 0, { heat: 1 });
  s.fuel = 1;
  const m = { ...B.BALLOON_MODEL, ceiling: 60 };
  const ev = [];
  for (let t = 0; t < 120; t += 0.1) ev.push(...B.stepBalloon(s, { burn: true }, 0.1, WIND, m));
  ok(s.z <= 60, "niet hoger dan het plafond");
  ok(ev.some((e) => e.type === 'plafond'), 'plafond gemeld');
}

// 9) brandstof op: de brander doet niets meer, tot je op de grond tankt
{
  const s = B.newBalloonFlight(0, 0, { fuel: 0.02 });
  const ev = run(s, { burn: true }, 20, WIND);
  ok(ev.some((e) => e.type === 'brandstof-op'), 'brandstof-op gemeld');
  ok(s.fuel === 0, 'tank leeg');
  ok(B.refuel(s) === false || s.onGround, 'tanken kan alleen op de grond');
  run(s, {}, 600, WIND);
  ok(s.onGround, 'leeg: hij komt weer naar beneden');
  ok(B.refuel(s) && s.fuel === 1, 'op de grond tanken lukt');
  const t = B.newBalloonFlight(0, 0); run(t, { burn: true }, 20, WIND);
  ok(B.refuel(t) === false && t.fuel < 1, 'in de lucht tanken kan niet');
}

// 10) een harde landing (snel dalen met de klep van groot) wordt gemeld en geteld, zonder schade-model
{
  const s = B.newBalloonFlight(0, 0);
  s.z = 10; s.vz = -4.5; s.onGround = false; s.heat = 0; s.fuel = 0.5;
  const ev = run(s, {}, 10, WIND);
  const land = ev.find((e) => e.type === 'geland');
  ok(land && land.hard === true && s.hard === 1, 'harde landing gemeld');
  near(s.vz, 0, 1e-9, 'na de landing geen verticale snelheid');
}

// 11) een grote sprong in tijd rekent niet door in één stap en blijft eindig
{
  const s = B.newBalloonFlight(0, 0);
  B.stepBalloon(s, { burn: true }, 5000, WIND);
  ok(Number.isFinite(s.z) && s.z < 5, 'één grote dt is begrensd');
  ok(B.stepBalloon(s, {}, 0, WIND).length === 0 && B.stepBalloon(null, {}, 1).length === 0, 'dt 0 en geen staat: niets');
}

// 12) de uitlezing voor de HUD
{
  const s = B.newBalloonFlight(0, 0);
  ok(B.balloonReadout(s).stand === 'aan de grond', 'aan de grond');
  run(s, { burn: true }, 20, WIND);
  const r = B.balloonReadout(s);
  ok(r.stand === 'stijgend' && r.hoogte === Math.round(s.z) && r.brandstof < 100, 'stijgend, met brandstof');
  const l = B.newBalloonFlight(0, 0, { fuel: 0.1 });
  ok(B.balloonReadout(l).laag, 'lage brandstof gemeld');
}

// 13) deterministisch: dezelfde invoer geeft dezelfde vlucht
{
  const a = B.newBalloonFlight(0, 0), b = B.newBalloonFlight(0, 0);
  const inv = (t) => ({ burn: t % 20 < 6 });
  run(a, inv, 120, WIND); run(b, inv, 120, WIND);
  ok(a.x === b.x && a.y === b.y && a.z === b.z, 'deterministisch');
}

console.log(`balloonflight_test: ${n} controles ok`);
