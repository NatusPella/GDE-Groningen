// Weer en dagdeel op dezelfde zon (game/js/weerdag.js, #19). node scripts/weerdag_test.mjs
import './node3d.mjs';
import * as S from '../game/js/sunrules.js';
import * as W from '../game/js/weerdag.js';
const D = await import('../game/js/daynight.js');
import { createWeatherState, stepWeather, regionWeather, REGION_IDS } from '../game/js/weatherstate.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

for (const dec of [null, 0, 10, 15, 20.5]) {
  S.setSunDeclination(dec);
  const tag = `declinatie ${dec}`;
  let diff = '', ordered = true;
  for (let h = 0; h < 24; h += 0.25) {
    // de nacht van de stad is die van dayState
    const world = { clock: h }; D.refreshDayNight(world);
    const ds = D.dayState(world);
    const stad = W.dagdeel('stad', h) === 'nacht';
    if (stad !== ds.isNight) diff += ` nacht@${h}`;
    for (const id of REGION_IDS) {
      const dd = W.dagdeel(id, h);
      if (!['nacht', 'dageraad', 'ochtend', 'dag', 'avond', 'schemer'].includes(dd)) diff += ` ${id}@${h}`;
      if (W.mistMag(id, h) && h >= 12) ordered = false;
      if (W.onweerMag(id, h) && h < 12) ordered = false;
    }
  }
  ok(diff === '', `${tag}: dagdeel stad = dayState`, diff.slice(0, 80));
  ok(ordered, `${tag}: mist alleen voor de middag, onweer alleen erna`);
  // oost: de zon komt eerder op en gaat eerder onder dan west
  ok(W.streekZonHoogte('oost', 5) > W.streekZonHoogte('west', 5), `${tag}: oost heeft 's ochtends de hogere zon`);
  ok(W.streekZonHoogte('oost', 20) < W.streekZonHoogte('west', 20), `${tag}: oost heeft 's avonds de lagere zon`);
  ok(W.mistMag('stad', 12) === false && W.mistWeg('stad', 11) === true, `${tag}: geen mist op het middaguur`);
  ok(W.onweerMag('stad', 3) === false && W.onweerMag('stad', 15) === true, `${tag}: onweer alleen in de warme uren`);
}

// Met de datum schuift het weer mee: in de lente begint de dag later dan op de langste dag
S.setSunDeclination(0);
const lente = [...Array(96)].filter((_, i) => W.mistMag('stad', i / 4)).length;
S.setSunDeclination(20.5);
const zomer = [...Array(96)].filter((_, i) => W.mistMag('stad', i / 4)).length;
ok(lente > 0 && zomer > 0 && lente !== zomer, 'mistvenster volgt de zon', `${lente} ${zomer}`);

// Over een hele dag: mist en onweer vallen nooit buiten hun venster
S.setSunDeclination(15);
let bad = 0;
for (let seed = 1; seed < 6; seed++) {
  const ws = createWeatherState(seed);
  for (let t = 0; t < 24 * 3600; t += 1) {
    const hour = (t / 60) % 24;
    stepWeather(ws, 1, hour);
    for (const id of REGION_IDS) {
      const r = ws.regions[id];
      if (r.kind === 'mist' && r.age < 1 && !W.mistMag(id, hour)) bad++;
      if (r.kind === 'onweer' && r.age < 1 && !W.onweerMag(id, hour)) bad++;
    }
  }
}
ok(bad === 0, 'weerwissels vallen binnen de zonvensters', String(bad));
ok(regionWeather(createWeatherState(1), 'stad').kind !== undefined, 'regionWeather werkt');

console.log(fails ? `${fails} van ${n} mislukt` : `weerdag_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
