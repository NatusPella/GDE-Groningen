// #649: het watermasker herdraait niet meer bij elke waterrij die ergens in de
// provincie in- of uitstroomt, en de rasterpas stapelt niet op een traag beeld.
// node scripts/tilewatermask_test.mjs  (three uit de vendor-cache, nepwereld)
//
// Voor/na, met de tellers uit tileWaterStats():
//  - 10 s streamen (600 frames) waarin de globale waterversie elke frame
//    verandert maar het water in het venster gelijk blijft: voorheen ~10 nabije
//    en ~3 verre herdraaiingen, nu 0.
//  - verandert het water in het venster wel, dan komt er één herdraai op de
//    cadans (1 s nabij); op een traag beeld (dt > 30 ms) wordt hij uitgesteld.
//  - #756: een reeks trage beelden achter elkaar (zuinig-stand, 30 fps) heeft
//    geen rustig beeld; na een paar beelden forceert het masker de bake alsnog.
import './node3d.mjs';
const W = await import('../game/js/tilewatermask.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// een nep-scene en een nep-map: alleen waterNear doet er iets
const scene = { add() {} };
const lake = (cx, cy, r) => ({ pts: [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r], [cx - r, cy - r]], bounds: [cx - r, cy - r, cx + r, cy + r] });
// ~120 waterpolygonen in het venster (de stadse orde uit #649)
const polys = Array.from({ length: 120 }, (_, i) => lake(-600 + (i % 12) * 100, -600 + Math.floor(i / 12) * 100, 8 + (i % 5)));
const map = { _waterVer: 0, waterNear: () => polys };
const FPS = 60, DT = 1 / FPS;

const step = (t, dt = DT, radius = 80) => W.updateTileWater(map, scene, 0, 0, radius, t, dt);

// eerste twee frames: nabij en ver bakken, niet in hetzelfde beeld
step(0); step(DT);
let st = W.tileWaterStats();
ok(st.bakes === 1 && st.farBakes === 1, 'eerste bake: nabij en ver, verdeeld over twee frames', JSON.stringify([st.bakes, st.farBakes]));
const firstMs = st.lastMs;

// 10 s streamen: globale waterversie verandert, vensterwater niet
let t = DT;
for (let f = 0; f < 600; f++) { t += DT; map._waterVer++; step(t); }
st = W.tileWaterStats();
ok(st.bakes === 1 && st.farBakes === 1, 'geen herdraai door water buiten het venster', `${st.bakes} nabij, ${st.farBakes} ver`);
ok(st.skipped > 1000, 'de teller ziet de overgeslagen herdraaiingen', st.skipped);
console.log(`#649 meting: 600 frames met globale waterveranderingen -> ${st.bakes} nabije + ${st.farBakes} verre bake(s) (voorheen ~10 + ~3), ${st.skipped} overgeslagen; bake ${firstMs.toFixed(2)} ms`);

// het water in het venster verandert wel: één herdraai, op de cadans
map.waterNear = () => polys.concat([lake(500, 500, 40)]);
map._waterVer++;
const bakesBefore = st.bakes;
for (let f = 0; f < 10; f++) { t += DT; step(t); }
st = W.tileWaterStats();
ok(st.bakes === bakesBefore + 1, 'water in het venster verandert: één herdraai', `${st.bakes} vs ${bakesBefore}`);
// en vrijwel meteen erna niet nog een keer
const bakesAfter = st.bakes;
for (let f = 0; f < 30; f++) { t += DT; map._waterVer++; step(t); }
ok(W.tileWaterStats().bakes === bakesAfter, 'daarna weer stil');

// een traag beeld stelt de rasterpas uit (niet bovenop een hapering)
map.waterNear = () => polys.concat([lake(500, 500, 40), lake(-500, 400, 30)]);
map._waterVer++;
const beforeSlow = W.tileWaterStats();
t += 1.5; // cadans ruim voorbij
step(t, 0.05); // traag vorig beeld
const slow = W.tileWaterStats();
ok(slow.bakes === beforeSlow.bakes && slow.deferred > beforeSlow.deferred, 'traag beeld: bake uitgesteld', `${slow.bakes}/${beforeSlow.bakes}`);
t += DT;
step(t); // rustig beeld haalt hem in
ok(W.tileWaterStats().bakes === beforeSlow.bakes + 1, 'volgend rustig beeld: alsnog gebakken');

// de verre bake komt nooit in hetzelfde beeld als de nabije
map._waterVer++;
map.waterNear = () => polys.concat([lake(500, 500, 40), lake(-500, 400, 30), lake(300, -400, 50)]);
const beforeBoth = W.tileWaterStats();
t += 5; // beide cadansen voorbij
step(t);
const afterOne = W.tileWaterStats();
ok(afterOne.bakes === beforeBoth.bakes + 1 && afterOne.farBakes === beforeBoth.farBakes, 'nabij eerst, ver nog niet in hetzelfde beeld', JSON.stringify([afterOne.bakes - beforeBoth.bakes, afterOne.farBakes - beforeBoth.farBakes]));
step(t + DT);
ok(W.tileWaterStats().farBakes === beforeBoth.farBakes + 1, 'ver volgt een beeld later');

// #756: een aaneengesloten reeks trage beelden (zuinig-stand: skipFrame maakt elk
// gerenderd beeld ~33 ms; een 30 fps-scherm hetzelfde) heeft geen rustig beeld. Het
// masker moet dan na een paar beelden alsnog bakken i.p.v. te wachten op een rustige
// frame die nooit komt.
map.waterNear = () => polys.concat([lake(700, 300, 45)]);
map._waterVer++;
const beforeSlowRun = W.tileWaterStats();
for (let f = 0; f < 600; f++) { t += 0.04; step(t, 0.04); }
const afterSlowRun = W.tileWaterStats();
ok(afterSlowRun.bakes > beforeSlowRun.bakes && afterSlowRun.farBakes > beforeSlowRun.farBakes,
  '#756: 600 trage beelden (dt = 40 ms) bakken alsnog',
  `${afterSlowRun.bakes - beforeSlowRun.bakes} nabij, ${afterSlowRun.farBakes - beforeSlowRun.farBakes} ver`);

// #756: ook vanaf een koude start (nog nooit gebakken) op een machine met alleen
// maar trage beelden: de eerste bake mag niet op een rustige frame wachten.
{
  const W2 = await import('../game/js/tilewatermask.js?slowstart=756');
  const map2 = { _waterVer: 0, waterNear: () => polys };
  let t2 = 0;
  for (let f = 0; f < 20; f++) { t2 += 0.04; W2.updateTileWater(map2, scene, 0, 0, 80, t2, 0.04); }
  const st2 = W2.tileWaterStats();
  ok(st2.bakes >= 1 && st2.farBakes >= 1, '#756: koude start met alleen trage beelden bakt binnen 0,5 s', `${st2.bakes} nabij, ${st2.farBakes} ver na ${t2.toFixed(2)} s`);
}

console.log(`${n - fails}/${n} tilewatermask`);
process.exit(fails ? 1 : 0);
