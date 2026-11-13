// Routewand-parsing uit perf-marks (#804):  node scripts/perf_marks_test.mjs
import { parseRouteMarks, routeMarksSummary } from './perf/normrules.mjs';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const lines = [
  '[renderer] [perf-mark] start a7 1794587805074 (js/errorlog.js:135)',
  '[renderer] [perf-mark] end a7 1794587865081 986 (js/errorlog.js:135)',
  'iets anders',
  '[renderer] [perf-mark] start spoor 1794587873517 (js/errorlog.js:135)',
  '[renderer] [perf-mark] end spoor 1794587918602 901 (js/errorlog.js:135)',
];
const marks = parseRouteMarks(lines);
ok(Object.keys(marks).length === 2 && marks.a7 && marks.spoor, 'beide routes worden geparsed');
ok(marks.spoor.end.frames === 901, 'de frames van de laatste mark worden bewaard');
const sum = routeMarksSummary(lines);
ok(Math.abs(sum.seconds - 105.092) < 1e-6, 'de routewand telt a7 én spoor (geen crash halverwege)', sum.seconds);
ok(sum.firstAt === 1794587805074, 'de eerste routestart is bekend');
ok(routeMarksSummary([]).seconds === 0 && routeMarksSummary([]).firstAt === null, 'zonder marks niets');
const half = routeMarksSummary(['[renderer] [perf-mark] start a7 0', '[renderer] [perf-mark] end a7 60000 10']);
ok(half.seconds === 60, 'een enkele route telt 60 s');

console.log(fails ? `${fails} FAIL` : 'perf_marks_test ok');
process.exit(fails ? 1 : 0);

