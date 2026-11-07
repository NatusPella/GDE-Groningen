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

console.log(`${n - fails}/${n} tilewatermask`);
process.exit(fails ? 1 : 0);
