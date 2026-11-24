// De lijm tussen verkeers-AI en halteren (game/js/vehicle/busstopai.js): een bus die zijn rit volgt haltert; een bus waarvan
// de rit niet meeloopt (hij rijdt van zijn lijn af of de andere kant op) geeft de halte op in plaats van een minuut met
// knipperlicht op remsnelheid door te kruipen (samen-qa 24-11, in twee echte vensters gezien).
//   node scripts/busstopai_test.mjs
import * as BA from '../game/js/vehicle/busstopai.js';
const { stapBusHalte } = BA, LOS_M = BA.LOS_M ?? 25;

let fail = 0, n = 0;
const check = (naam, ok, x = '') => { n++; if (!ok) { fail++; console.log('FAIL', naam, x); } };
const DT = 1 / 30;
const lijn = { length: 1000, loop: false };
const stop = { s: 300, x: 300, y: 0 };
const world = { time: 0 };

// rit: de bus rijdt langs x; volgt = de rit (busRun.s) loopt mee met de bus
function rit({ volgt, richting = 1, s0 = 240, max = 40 }) {
  const v = { x: s0, y: 0, speed: 8, busRun: { line: lijn, s: s0, dir: 1, trips: 0 } };
  const out = { stop };
  const fasen = new Set();
  let knipperS = 0, staan = false;
  for (let i = 0; i < max / DT; i++) {
    world.time += DT;
    stapBusHalte(v, out, DT, world, null, () => 0.5);
    fasen.add(v.halteFase);
    if (v.halteFase === 'staan') staan = true;
    if (v.indForce) knipperS += DT;
    const vmax = Number.isFinite(v.halteVmax) ? v.halteVmax : 8;
    v.speed = Math.min(8, vmax, v.speed + 2 * DT);
    if (v.halteFase === 'staan') v.speed = 0;
    v.x += richting * v.speed * DT;
    if (volgt) v.busRun.s = v.x;
    if (staan) break;
  }
  return { v, fasen, knipperS, staan };
}

const goed = rit({ volgt: true });
check('een bus die zijn rit volgt haltert', goed.staan, [...goed.fasen].join(','));

const los = rit({ volgt: false, richting: -1, s0: 290 });
check('een bus die wegrijdt terwijl de rit stilstaat geeft de halte op', los.v.halteFase === 'rijden', los.v.halteFase);
check('en knippert niet de hele tijd', los.knipperS < 6, los.knipperS.toFixed(1) + ' s');
check('en kruipt niet op remsnelheid door', !Number.isFinite(los.v.halteVmax) || los.v.halteVmax > 50, String(los.v.halteVmax));
check('de grens is ruim (geen valse opgave in een bocht)', LOS_M >= 15);

console.log(fail ? `busstopai_test: ${fail} van ${n} FAILED` : `busstopai_test: ${n}/${n} ok`);
process.exit(fail ? 1 : 0);
