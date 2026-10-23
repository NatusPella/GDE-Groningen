// Bietenoogst (#393): rijen, rooien in de snelheidsband, de rit naar de hoop en de uitbetaling.
//   node scripts/bietenrules_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from '../game/js/bietenrules.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// een speler die de rijen netjes rijdt: speed m/s, zijwaartse afwijking across
function rooi(s, { speed = 5, across = 0, rijen = B.RIJEN, dt = 0.1, maxT = 600 } = {}) {
  const evs = [];
  for (let t0 = 0; t0 < maxT && s.phase === 'rooien' && s.rij < rijen; t0 += dt) {
    const rij = s.rij;
    let along = -3;
    while (along <= B.RIJ_LEN + 2) {
      const e = B.step(s, { along, across, speed }, dt);
      evs.push(...e);
      if (e.some((x) => x.type === 'fail')) return evs;
      if (s.rij !== rij) break;
      along += speed * dt;
    }
    if (s.rij === rij) break;
  }
  return evs;
}
function breng(s, { decel = 0, lat = 0, dt = 0.1, seconden = 40 } = {}) {
  const evs = [];
  for (let i = 0; i < seconden / dt && !s.delivered; i++) {
    const dist = Math.max(0, 300 - i * dt * 8);
    const e = B.step(s, { dist, speed: dist < 7 ? 0.2 : 8, decel, lat }, dt);
    evs.push(...e);
    if (e.some((x) => x.type === 'fail')) break;
  }
  return evs;
}

t('de rijen liggen naast elkaar, om en om de andere kant op, en passen in de akker', () => {
  const r = B.akkerRijen({ x: 100, y: 50 }, 0.5);
  assert.equal(r.length, 4);
  for (const x of r) assert.ok(Math.abs(Math.hypot(x.bx - x.ax, x.by - x.ay) - B.RIJ_LEN) < 1e-6);
  assert.ok(r[0].ux * r[1].ux + r[0].uy * r[1].uy < -0.99, 'de tweede rij gaat terug');
  assert.ok(r[0].ux * r[2].ux + r[0].uy * r[2].uy > 0.99);
  // de afstand tussen de rijen
  const { across } = B.rijPositie(r[0], r[1].ax, r[1].ay);
  assert.ok(Math.abs(Math.abs(across) - B.RIJ_AFSTAND) < 1e-6);
  // het einde van een rij is het begin van de volgende, een keer aan de kop
  assert.ok(Math.hypot(r[0].bx - r[1].ax, r[0].by - r[1].ay) < B.RIJ_AFSTAND + 1e-6);
  // het midden van de akker
  const mx = r.reduce((s, x) => s + (x.ax + x.bx) / 2, 0) / 4, my = r.reduce((s, x) => s + (x.ay + x.by) / 2, 0) / 4;
  assert.ok(Math.hypot(mx - 100, my - 50) < 1e-6);
});

t('rijPositie: along en across', () => {
  const r = B.akkerRijen({ x: 0, y: 0 }, 0)[0];
  const p = B.rijPositie(r, r.ax + 30, r.ay + 1.5);
  assert.ok(Math.abs(p.along - 30) < 1e-9 && Math.abs(Math.abs(p.across) - 1.5) < 1e-9);
});

t('netjes rooien: alle rijen, bijna alles geoogst, fase wordt rijden', () => {
  const s = B.init(1);
  const ev = rooi(s);
  assert.equal(s.phase, 'rijden'); assert.equal(s.rij, 4);
  assert.ok(B.oogstFractie(s) > 0.95, String(B.oogstFractie(s)));
  assert.equal(ev.filter((e) => e.type === 'rij').length, 4);
  assert.ok(ev.some((e) => e.type === 'geoogst'));
  assert.equal(B.rijenOver(s), 0);
});

t('te langzaam rooit niets, te hard de helft, naast de rij niets', () => {
  let s = B.init(1);
  rooi(s, { speed: 1.5, maxT: 2 });
  assert.equal(s.geoogst, 0, 'te langzaam');
  s = B.init(1);
  B.step(s, { along: 10, across: 0, speed: 5 }, 0.1); B.step(s, { along: 14, across: 0, speed: 5 }, 0.1);
  const goed = s.geoogst;
  const hard = B.init(1);
  B.step(hard, { along: 10, across: 0, speed: 5 }, 0.1); B.step(hard, { along: 14, across: 0, speed: 9 }, 0.1);
  assert.ok(hard.geoogst < goed && hard.geoogst > 0, 'te hard: de helft');
  const naast = B.init(1);
  B.step(naast, { along: 10, across: 5, speed: 5 }, 0.1); B.step(naast, { along: 14, across: 5, speed: 5 }, 0.1);
  assert.equal(naast.geoogst, 0, 'naast de rij');
});

t('een stuk overslaan telt als gemist en geeft een melding bij scheef rijden', () => {
  const s = B.init(1);
  B.step(s, { along: 5, across: 0, speed: 5 }, 0.1);
  B.step(s, { along: 45, across: 0, speed: 5 }, 0.1);
  assert.ok(s.gemist >= 30, 'het gat van 40 m is gemist');
  const s2 = B.init(1);
  B.step(s2, { along: 5, across: 0, speed: 5 }, 0.1);
  let scheef = 0;
  for (let i = 0; i < 40; i++) scheef += B.step(s2, { along: 20, across: 4, speed: 5 }, 0.1).filter((e) => e.type === 'scheef').length;
  assert.ok(scheef >= 1 && scheef <= 4, `scheef-meldingen ${scheef}`);
});

t('achteruit en terug rijden maakt geen meters', () => {
  const s = B.init(1);
  B.step(s, { along: 30, across: 0, speed: 5 }, 0.1);
  const g = s.geoogst;
  for (const a of [28, 20, 10, 5]) B.step(s, { along: a, across: 0, speed: 5 }, 0.1);
  assert.equal(s.geoogst, g);
});

t('hogere niveaus: smaller en stiller', () => {
  const a = B.init(1), b = B.init(5);
  assert.ok(b.tol < a.tol && b.vMax < a.vMax && b.limit < a.limit);
  assert.ok(b.tol > 1 && b.vMax > B.V_MIN + 1.5);
});

t('naar de hoop: zacht rijden levert alles af, hard remmen strooit de kar leeg', () => {
  const s = B.init(1); rooi(s);
  const ev = breng(s);
  assert.ok(s.delivered && ev.some((e) => e.type === 'done'));
  assert.equal(s.kwaliteit, 100);
  const r = B.result(s);
  assert.equal(r.failed, false); assert.equal(r.flawless, true); assert.ok(r.base >= 85 && r.tip === 24, JSON.stringify(r));
  const slecht = B.init(1); rooi(slecht);
  const ev2 = breng(slecht, { decel: 5 });
  assert.ok(ev2.some((e) => e.type === 'fail') && !slecht.delivered);
  assert.equal(B.result(slecht).failed, true); assert.equal(B.result(slecht).base, 0);
});

t('uitbetaling: meer geoogst en een heel gebleven lading betaalt meer; nooit negatief', () => {
  const vol = B.init(1); rooi(vol); breng(vol);
  const half = B.init(1); rooi(half, { speed: 9 }); breng(half);   // te hard: de helft in de grond
  const schade = B.init(1); rooi(schade); breng(schade, { decel: 4, seconden: 6 });
  assert.ok(B.result(vol).base > B.result(half).base, 'te hard rooien betaalt minder');
  if (schade.delivered) assert.ok(B.result(vol).base > B.result(schade).base);
  for (const s of [vol, half, schade, B.init(1)]) { const r = B.result(s); assert.ok(r.base >= 0 && r.tip >= 0 && Number.isFinite(r.base)); }
  assert.ok(B.result(vol).base <= 100 && B.result(vol).base >= 80, String(B.result(vol).base));
});

t('de klok: te lang over de bietentijd doen mislukt', () => {
  const s = B.init(1);
  let fail = false;
  for (let i = 0; i < 4000 && !fail; i++) fail = B.step(s, { along: -50, across: 30, speed: 0 }, 0.1).some((e) => e.type === 'fail');
  assert.ok(fail);
});

t('geen Math.random en geen THREE in de regels (puur, herhaalbaar)', () => {
  const src = fs.readFileSync(new URL('../game/js/bietenrules.js', import.meta.url), 'utf8');
  assert.ok(!/Math\.random|three|document|window/.test(src.replace(/\/\/.*$/gm, '')));
});

console.log(`bietenrules_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
