// Inkomsten en uitgaven (#206): het kasboek van game/js/finance.js.
//   node scripts/finance_test.mjs
import { createLedger, syncLedger, noteMoney, book, summary, ledgerSave, ledgerLoad, resetBalance, DAYS } from '../game/js/finance.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

const l = createLedger();
syncLedger(l, 250, 9);
check('eerste sync boekt niets', summary(l).inTotal === 0 && summary(l).outTotal === 0);
noteMoney('Missies'); syncLedger(l, 350, 9.5);
check('inkomst met label', l.total.in.Missies === 100);
noteMoney('Winkels'); syncLedger(l, 320, 10);
check('uitgave met label', l.total.out.Winkels === 30);
syncLedger(l, 330, 10.1);
check('zonder label = overig', l.total.in['Overig inkomsten'] === 10);
noteMoney('Winkels'); syncLedger(l, 330, 10.2);
syncLedger(l, 300, 10.3);
check('label geldt maar één beeld', l.total.out['Overige uitgaven'] === 30, JSON.stringify(l.total.out));
syncLedger(l, NaN, 10.4); syncLedger(l, 300, 10.5);
check('NaN-saldo boekt niets', summary(l).outTotal === 60);

// dagen
syncLedger(l, 300, 23.5); syncLedger(l, 300, 0.2);
check('klok over middernacht = nieuwe dag', l.day === 1);
noteMoney('Bijbaantjes'); syncLedger(l, 400, 1);
let s = summary(l);
check('vandaag apart', s.todayIn === 100 && s.todayOut === 0, JSON.stringify(s));
check('week telt beide dagen', s.weekIn === 210 && s.weekOut === 60, JSON.stringify(s));
check('netto', s.net === s.inTotal - s.outTotal);
check('top-posten gesorteerd', s.topIn[0][0] === 'Missies' && s.topIn[0][1] >= s.topIn[1][1]);

// dagen worden afgekapt
const long = createLedger(); syncLedger(long, 0, 20);
for (let d = 0; d < DAYS + 6; d++) { syncLedger(long, long.last + 5, 1); syncLedger(long, long.last, 23); syncLedger(long, long.last, 0.5); }
check('maximaal DAYS dagen bewaard', long.days.length === DAYS, long.days.length);
check('totalen blijven volledig', summary(long).inTotal === (DAYS + 6) * 5);

// opslag
const copy = ledgerLoad(JSON.parse(JSON.stringify(ledgerSave(l))));
check('opslaan en laden gelijk', JSON.stringify(summary(copy)) === JSON.stringify(summary(l)));
check('geladen kasboek boekt niet bij eerste sync', (syncLedger(copy, 5000, 2), summary(copy).inTotal === summary(l).inTotal));
for (const bad1 of [null, undefined, 5, 'x', [], { total: 'x', days: 'y' }, { total: { in: { a: -5, b: NaN, c: 'x', d: 7 } }, days: [null, { day: 'x' }, { day: 3, in: { z: 1.9 } }] }]) {
  const c = ledgerLoad(bad1);
  check('rare opslag blijft heel ' + JSON.stringify(bad1), Number.isFinite(summary(c).inTotal) && Array.isArray(c.days));
}
const odd = ledgerLoad({ total: { in: { a: -5, b: NaN, d: 7 } }, days: [{ day: 3, in: { z: 1.9 } }] });
check('ongeldige posten weg', Object.keys(odd.total.in).join() === 'd' && odd.days[0].in.z === 1);
resetBalance(copy, 100); syncLedger(copy, 90, 3);
check('resetBalance maakt het nieuwe nulpunt', copy.last === 90);
book(copy, 0.2, 'x'); book(copy, NaN); check('niks boeken bij rommel', !copy.total.in.x);

console.log(bad ? `${bad} mislukt` : 'finance_test: alles goed');
process.exit(bad ? 1 : 0);
