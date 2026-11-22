// Gewicht te voet (game/js/footfeel.js): aanzetten en uitlopen in plaats van aan/uit in één frame.
import { readFileSync } from 'node:fs';
import { stepWalkVelocity, stopDistance, WALK_ACCEL_RATE, WALK_STOP_RATE, WALK_STOP_EPS } from '../game/js/footfeel.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const RUN = 6.8, JOG = 3.0, DT = 1 / 60;

// aanzetten: geen sprong naar het tempo in één frame, wel snel op snelheid, nooit eroverheen
{
  const b = { vx: 0, vy: 0 };
  const first = stepWalkVelocity(b, RUN, 0, DT);
  ok(first > 0.5 && first < RUN * 0.35, 'eerste frame is een aanzet, geen volle snelheid', first);
  let t = DT, t90 = 0, prev = first;
  while (t < 1) {
    const s = stepWalkVelocity(b, RUN, 0, DT); t += DT;
    ok(s >= prev - 1e-9 && s <= RUN + 1e-9, 'monotoon en zonder overshoot', s);
    if (!t90 && s >= RUN * 0.9) t90 = t;
    prev = s;
  }
  ok(t90 > 0.1 && t90 < 0.22, '90% van het sprinttempo binnen 0,1-0,22 s', t90);
  ok(Math.abs(prev - RUN) < 0.01, 'komt op het tempo uit', prev);
}

// stoppen: sneller dan aanzetten, een korte uitloop, en daarna echt stil (exact 0)
{
  ok(WALK_STOP_RATE > WALK_ACCEL_RATE, 'stoppen gaat sneller dan aanzetten');
  for (const [v0, max] of [[RUN, 0.4], [JOG, 0.18]]) {
    const b = { vx: v0, vy: 0 };
    let dist = 0, t = 0;
    while (t < 1 && (b.vx !== 0 || b.vy !== 0)) { stepWalkVelocity(b, 0, 0, DT); dist += Math.hypot(b.vx, b.vy) * DT; t += DT; }
    ok(b.vx === 0 && b.vy === 0, 'staat exact stil', v0);
    ok(t < 0.3, 'stil binnen 0,3 s', t);
    ok(dist > 0.03 && dist < max, `uitloop vanaf ${v0} m/s blijft kort`, dist);
    ok(dist <= stopDistance(v0) + 1e-9, 'uitloop past binnen stopDistance', dist);
  }
  ok(WALK_STOP_EPS > 0 && WALK_STOP_EPS < 0.3, 'drempel voor stilstaan is klein');
}

// omkeren: de snelheid draait door nul, geen zijwaartse sprong
{
  const b = { vx: RUN, vy: 0 };
  stepWalkVelocity(b, -RUN, 0, DT);
  ok(b.vx > 0 && b.vx < RUN, 'omkeren remt eerst af', b.vx);
  for (let i = 0; i < 60; i++) stepWalkVelocity(b, -RUN, 0, DT);
  ok(Math.abs(b.vx + RUN) < 0.01 && b.vy === 0, 'en loopt daarna de andere kant op', b.vx);
}

// framerate: 30 en 144 fps geven na dezelfde tijd dezelfde snelheid
{
  const a = { vx: 0, vy: 0 }, c = { vx: 0, vy: 0 };
  for (let i = 0; i < 5; i++) stepWalkVelocity(a, RUN, 0, 1 / 30);
  for (let i = 0; i < 24; i++) stepWalkVelocity(c, RUN, 0, 1 / 144);
  ok(Math.abs(a.vx - c.vx) < 0.02, 'onafhankelijk van de framerate', `${a.vx} ${c.vx}`);
}

// robuust: NaN of dt 0 laat een loper niet vastlopen
{
  const b = { vx: NaN, vy: 3 };
  stepWalkVelocity(b, 2, 1, DT);
  ok(b.vx === 2 && b.vy === 1, 'NaN-snelheid valt terug op het doel');
  const z = { vx: 1, vy: 1 };
  stepWalkVelocity(z, 4, 0, 0);
  ok(z.vx === 4 && z.vy === 0, 'dt 0 valt terug op het doel');
  const g = { vx: 0, vy: 0 };
  ok(stepWalkVelocity(g, 0, 0, DT) === 0 && g.vx === 0, 'stil blijft stil');
}

// bedrading: player.js zet de loopsnelheid alleen nog via de regel, en de loopanimatie leest de echte snelheid
{
  const src = readFileSync(new URL('../game/js/player.js', import.meta.url), 'utf8');
  ok(src.includes('if (dir) stepWalkVelocity(this, Math.cos(dir.angle) * speed, Math.sin(dir.angle) * speed, dt);'), 'player.js loopt via stepWalkVelocity');
  ok(src.includes('else stepWalkVelocity(this, 0, 0, dt);'), 'player.js stopt via stepWalkVelocity');
  ok(!src.includes('this.vx = Math.cos(dir.angle) * speed'), 'geen directe toewijzing meer');
  const sc = readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  ok(sc.includes('animatePersonWalk(playerMesh, Math.hypot(player.vx, player.vy)'), 'de loopcyclus volgt de echte snelheid (voeten glijden niet)');
}

console.log(`footfeel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
