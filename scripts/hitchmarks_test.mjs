// #804: de hitchprobe-marks mogen elkaar niet overschrijven: de populatielus
// werd eerder gemeten vanaf de hud-mark van de vorige frame (het frame-gat).
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
let fails = 0;
const ok = (c, n) => { if (!c) { fails++; console.log('FAIL ' + n); } };
ok(/probe\.begin\(now\);\s*\n\s*probe\.mark\('frame'\)/.test(src), 'frame-mark direct na probe.begin');
ok(src.indexOf("probe.mark('frame')") < src.indexOf("probe.mark('populate-pre')"), 'frame-mark vóór de populatie');
ok(src.indexOf("probe.mark('populate-pre')") < src.indexOf("probe.mark('populate')"), 'populate-pre vóór populate');
const body = src.slice(src.indexOf("probe.mark('populate-pre')"), src.indexOf("probe.mark('populate')"));
ok(/maintainPedestrians\(world\);/.test(body) && /manageTrafficPopulation/.test(body), 'de populatielus zit tussen de marks');
console.log(fails ? fails + ' FAIL' : 'hitchmarks_test ok: frame-, populate-pre- en populate-mark staan in de juiste orde');
process.exit(fails ? 1 : 0);
