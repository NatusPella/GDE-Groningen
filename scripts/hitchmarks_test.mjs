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
// #804: de weg- en cityprops-submarks voor de laatste dempers
const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/probe\.mark\('roads-entry'\)/.test(scene) && /probe\.mark\('roads-query'\)/.test(scene), 'road-submarks in syncRoads');
ok(scene.indexOf("probe.mark('road-build-start')") < scene.indexOf("probe.mark('road-build')") && scene.indexOf("probe.mark('road-build')") < scene.indexOf("probe.mark('road-lift')"), 'road-build vóór road-lift');
const cp = fs.readFileSync(new URL('../game/js/cityprops.js', import.meta.url), 'utf8');
ok(/probe\.mark\('cp-gen-start'\)/.test(cp) && /probe\.mark\('cp-merge'\)/.test(cp), 'cityprops-submarks in de build/merge');
ok(cp.indexOf("probe.mark('cp-gen-start')") < cp.indexOf("probe.mark('cp-gen')"), 'cp-gen vóór cp-gen-mark');
console.log(fails ? fails + ' FAIL' : 'hitchmarks_test ok: frame-, populate-, road- en cityprops-marks staan in de juiste orde');
process.exit(fails ? 1 : 0);
