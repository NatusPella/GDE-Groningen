// De bestuurder in een auto die rond de tekenafstand rijdt (scene3d.js, DRIVER_FIGURE_DIST) knippert niet aan en uit: een drempel met twee kanten (lodstable.hystVisible).
//   node scripts/lod_figuren_test.mjs
import fs from 'node:fs';
import { hystVisible } from '../game/js/lodstable.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
const m = /DRIVER_FIGURE_DIST = (\d+);/.exec(src);
ok(!!m, 'DRIVER_FIGURE_DIST bestaat');
const ON = +m[1];
ok(/df\.visible = hasAiDriver\(v\) && hystVisible\(df\.visible, driverDist, DRIVER_FIGURE_DIST\)/.test(src), 'scene3d zet de bestuurder met hysterese aan en uit');
ok(!/df\.visible = hasAiDriver\(v\) && driverDist < DRIVER_FIGURE_DIST/.test(src), 'geen kale drempel meer');
// een auto die schommelt rond de grens (een stoplicht, een bocht): de oude drempel wisselt elk beeld, de nieuwe nauwelijks
const afstand = (f) => ON + Math.sin(f * 0.35) * 2.5;   // 67,5 tot 72,5 m
let oud = 0, nieuw = 0, vOud = false, vNieuw = false;
for (let f = 0; f < 600; f++) {
  const d = afstand(f);
  const o = d < ON, w = hystVisible(vNieuw, d, ON);
  if (o !== vOud) oud++; if (w !== vNieuw) nieuw++;
  vOud = o; vNieuw = w;
}
ok(oud >= 20, 'de kale drempel knippert (meetopzet klopt)', oud);
ok(nieuw <= 1, 'met hysterese hooguit een wissel', nieuw);
// dichtbij altijd zichtbaar, ver weg nooit
ok(hystVisible(false, ON - 1, ON) && hystVisible(true, ON - 1, ON), 'binnen de afstand zichtbaar');
ok(!hystVisible(false, ON + 30, ON) && !hystVisible(true, ON + 30, ON), 'ver weg niet zichtbaar');
console.log(`${n - fails}/${n} lod_figuren`);
process.exit(fails ? 1 : 0);
