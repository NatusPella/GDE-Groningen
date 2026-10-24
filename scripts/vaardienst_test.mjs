// De vaardienst (#444) in zeilvaren.js: een rondvaart of veerboot die bij elke halte aanlegt,
// met een dienstregeling, voortgang en een uitslag met medaille. Puur, met de echte zeilregels
// ernaast (zeilrules.js).   node scripts/vaardienst_test.mjs
import assert from 'node:assert';
import { VAART, maakVaardienst, vaarStap, vaarVoortgang, vaarUitslag, vaarStand } from '../game/js/zeilvaren.js';
import { createZeiler, stepZeil } from '../game/js/zeilrules.js';

const dt = 0.5;
const H = (x, y, naam) => ({ x, y, naam });

// Vaar naar een kade en blijf er `stopS` seconden liggen.
function naar(d, doel, { v = 4, stopS = VAART.aanlegS } = {}) {
  const evs = [];
  let x = Number.isFinite(d.x) ? d.x : 0, y = Number.isFinite(d.y) ? d.y : 0;
  for (let k = 0; k < 20000; k++) {
    const dist = Math.hypot(doel.x - x, doel.y - y);
    if (dist <= 0.5) break;
    const sp = Math.min(v, dist / dt);
    x += ((doel.x - x) / dist) * sp * dt;
    y += ((doel.y - y) / dist) * sp * dt;
    evs.push(...vaarStap(d, { x, y, speed: sp }, { dt }));
  }
  for (let k = 0; k < Math.ceil(stopS / dt) + 1; k++) evs.push(...vaarStap(d, { x: doel.x, y: doel.y, speed: 0 }, { dt }));
  return evs;
}

// --- de dienst -----------------------------------------------------------------------------
const d = maakVaardienst({ halten: [H(0, 0, 'Kade Noord'), H(120, 0, 'Kade Zuid'), H(260, 0, 'Sluis')] });
assert.strictEqual(d.vervoer, 'schip');
assert.strictEqual(d.naam, 'Rondvaart');
assert.strictEqual(d.regels.vmax, VAART.vmax);
assert.strictEqual(d.halten[0].stopR, VAART.aanlegR);
assert.strictEqual(d.halten[0].stopV, VAART.aanlegV);
assert.strictEqual(d.halten[0].stopS, VAART.aanlegS);
assert.strictEqual(vaarVoortgang(d), 0);
assert.deepStrictEqual(vaarStap(d, null), [], 'zonder boot gebeurt er niets');

// --- een hele dienst: netjes aanleggen, op tijd --------------------------------------------
const evs = [
  ...naar(d, { x: 0, y: 0 }),
  ...naar(d, { x: 120, y: 0 }),
  ...naar(d, { x: 260, y: 0 }),
];
const stops = evs.filter((e) => e.soort === 'halte');
assert.strictEqual(stops.length, 3, 'bij elke kade aangelegd');
assert.ok(stops.every((e) => e.opTijd), 'op tijd: ' + JSON.stringify(stops.map((e) => e.late)));
assert.ok(evs.some((e) => e.soort === 'klaar'));
const u = vaarUitslag(d);
assert.strictEqual(u.klaar, true);
assert.strictEqual(u.gehaald, 3);
assert.strictEqual(u.punten, 95, 'een dienst zonder fouten');
assert.strictEqual(u.medailleNaam, 'Goud');
assert.strictEqual(vaarVoortgang(d), 1);
assert.strictEqual(vaarStand(d).volgende, null);

// --- aanleggen vraagt om stil blijven liggen ------------------------------------------------
const kort = maakVaardienst({ halten: [{ x: 0, y: 0, naam: 'Kade' }] });
for (let k = 0; k < 3; k++) vaarStap(kort, { x: 0, y: 0, speed: 0 }, { dt }); // 1,5 s
assert.strictEqual(kort.gehaald, 0, 'na anderhalve seconde ligt de boot nog niet vast');
assert.ok(kort.stopT > 1 && kort.stopT < VAART.aanlegS);
vaarStap(kort, { x: 0, y: 0, speed: 0.5 }, { dt });
vaarStap(kort, { x: 0, y: 0, speed: 0 }, { dt });
vaarStap(kort, { x: 0, y: 0, speed: 0 }, { dt });
assert.strictEqual(kort.gehaald, 1, 'na drie seconden telt de halte');

// wegvaren voor de tijd: de teller begint opnieuw
const weg = maakVaardienst({ halten: [{ x: 0, y: 0, naam: 'Kade' }] });
vaarStap(weg, { x: 0, y: 0, speed: 0 }, { dt: 2 });
vaarStap(weg, { x: 60, y: 0, speed: 4 }, { dt });
assert.strictEqual(weg.gehaald, 0);
assert.strictEqual(weg.stopT, 0);

// --- te hard langs de kade: de halte telt niet --------------------------------------------
const mis = maakVaardienst({ halten: [H(0, 0, 'A'), H(80, 0, 'B')] });
const mev = [];
for (let x = 0; x <= 300; x += 3) mev.push(...vaarStap(mis, { x, y: 0, speed: 3 }, { dt: 0.2 }));
assert.strictEqual(mis.gemist.length, 2, 'beide kades voorbijgevaren');
assert.ok(mev.some((e) => e.soort === 'gemist'));
const um = vaarUitslag(mis);
assert.strictEqual(um.gehaald, 0);
assert.ok(um.punten < 50 && um.medaille === 0, 'geen medaille voor een dienst zonder halten: ' + um.punten);

// --- te hard varen kost veiligheid --------------------------------------------------------
const hard = maakVaardienst({ halten: [H(0, 0, 'A'), H(400, 0, 'B')] });
for (let k = 0; k < 20; k++) vaarStap(hard, { x: k, y: 0, speed: 12 }, { dt });
assert.ok(hard.teHard >= 9.5, 'de tijd te hard telt: ' + hard.teHard);
assert.ok(vaarUitslag(hard).veilig < 50);

// --- met de echte zeilregels: de boot van zeilvaren stuurt de dienst ------------------------
{
  const boot = createZeiler(300, 0, Math.PI); // koers west, wind uit het oosten: voor de wind
  const wind = { dir: 0, speed: 7 };
  const dienst = maakVaardienst({ halten: [{ x: 0, y: 0, naam: 'Kade West' }] });
  for (let k = 0; k < 2000; k++) {
    stepZeil(boot, { roer: 0, trim: 0 }, wind, 0.1);
    vaarStap(dienst, boot, { dt: 0.1 });
    if (boot.x <= 10) break;
  }
  assert.ok(boot.x <= 10, 'de boot vaart naar de kade: ' + boot.x.toFixed(1));
  // afmeren: langzaam en stil binnen de kade
  boot.speed = 0; boot.x = 0;
  for (let k = 0; k < 40; k++) vaarStap(dienst, boot, { dt: 0.1 });
  assert.strictEqual(dienst.gehaald, 1, 'de echte boot legt aan en telt mee');
  assert.ok(vaarUitslag(dienst).seconden > 0);
}

console.log('vaardienst_test ok');
