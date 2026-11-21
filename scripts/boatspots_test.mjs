// isBoatSpotValid (game/js/vehicle/boatspots.js): waar een boot logisch ligt of vaart. Synthetische kaart, geen wereld nodig.
//   node scripts/boatspots_test.mjs
import './node3d.mjs';

const B = await import('../game/js/vehicle/boatspots.js');
const { createVaarNet } = await import('../game/js/vaarnet.js');
const { WATER_KINDS } = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

// een rechthoekig water (soort bepaalt diepte en klasse) op (x0, y0), breed in y
const water = (x0, y0, lang, breed, kind) => {
  const k = WATER_KINDS[kind];
  return { kind, dp: k.depth, nav: k.nav, lv: -2.3, body: 1, pts: [[x0, y0], [x0 + lang, y0], [x0 + lang, y0 + breed], [x0, y0 + breed]], bounds: [x0, y0, x0 + lang, y0 + breed] };
};
const kaart = (polys) => ({ water: polys, waterNear: () => polys, isOnBridge: () => false, roadsNear: () => [], buildingsNear: () => [], coveredAt: () => false });

// het vaarnet: één rand langs het kanaal (y = 15 .. 45 breed: hartlijn y = 30), klasse 4, vrije doorvaart
const rand = (x0, x1, y) => [0, 1, x1 - x0, 4, -1, [x0 * 10, y * 10, (x1 - x0) * 10, 0]];
const net = createVaarNet({ nodes: [[0, 30, 'haven', 'Testhaven'], [400, 30, 'kruising', '']], edges: [rand(0, 400, 30)], hubs: {} });

const kanaal = water(0, 15, 400, 30, 'kanaal');   // 30 m breed
const sloot = water(1000, 0, 400, 4, 'sloot');    // 4 m breed
const vijver = water(2000, 0, 60, 60, 'vijver');
const smal = water(3000, 0, 400, 3, 'diep');      // 3 m breed
const meer = water(4000, 0, 200, 200, 'meer');    // open water zonder net
const map = kaart([kanaal, sloot, vijver, smal, meer]);
// water per punt: de polygoon die het punt bevat
map.waterNear = (x, y) => [kanaal, sloot, vijver, smal, meer].filter((p) => x >= p.bounds[0] - 5 && x <= p.bounds[2] + 5 && y >= p.bounds[1] - 5 && y <= p.bounds[3] + 5);

B.configureBoatSource({ net, plekken: [{ t: 'pier', x: 1100, y: 2 }], marinas: null });

// 1. breedte: vier assen, het minimum
ok(B.lokaleBreedte(map, 200, 30) >= 28 && B.lokaleBreedte(map, 200, 30) <= 32, 'breedte van een kanaal van 30 m', B.lokaleBreedte(map, 200, 30));
ok(B.lokaleBreedte(map, 1200, 2) <= 5, 'breedte van een sloot van 4 m', B.lokaleBreedte(map, 1200, 2));
ok(B.lokaleBreedte(map, 5000, 5000) === 0, 'op land: breedte 0');

// 2. op het vaarnet
ok(B.isBoatSpotValid(map, 200, 30, 'sloep'), 'een sloep op het kanaal (vaarnet)');
ok(B.isBoatSpotValid(map, 200, 30, 'rondvaart'), 'een rondvaartboot op het kanaal');
ok(B.isBoatSpotValid(map, 200, 30, 'binnenvaart'), 'een binnenvaartschip op het kanaal (30 m breed)');
ok(B.assessBoatSpot(map, 200, 30, 'sloep').reden === 'vaarnet', 'reden: vaarnet');
ok(B.isBoatSpotValid(map, 200, 30, 'sloepGrijs') && B.isBoatSpotValid(map, 200, 30, 'sloepCabin'), 'sloepGrijs en sloepCabin tellen als sloep');

// 3. een sloot en een vijver: geen boot, ook geen kano zonder steiger
ok(!B.isBoatSpotValid(map, 1200, 2, 'sloep'), 'geen sloep op een sloot');
ok(B.assessBoatSpot(map, 1200, 2, 'sloep').reden === 'sloot', 'reden: sloot');
ok(!B.isBoatSpotValid(map, 1300, 2, 'kano'), 'geen kano op een sloot zonder steiger');
ok(B.isBoatSpotValid(map, 1100, 2, 'kano'), 'een kano op de sloot bij een steiger mag wel');
ok(!B.isBoatSpotValid(map, 2030, 30, 'sloep'), 'geen sloep op een vijver');
ok(B.assessBoatSpot(map, 2030, 30, 'waterfiets').reden === 'vijver', 'reden: vijver');

// 4. te smal voor de klasse
ok(!B.isBoatSpotValid(map, 3200, 1.5, 'sloep', { eisNet: false }), 'een sloep past niet in water van 3 m');
ok(B.assessBoatSpot(map, 3200, 1.5, 'sloep', { eisNet: false }).reden === 'smal', 'reden: smal');
ok(B.isBoatSpotValid(map, 3200, 1.5, 'kano', { eisNet: false }), 'een kano past in water van 3 m (breedte)');
ok(!B.isBoatSpotValid(map, 200, 20, 'binnenvaart', { opts: 1 }) || B.lokaleBreedte(map, 200, 20) >= 24, 'binnenvaart vraagt 24 m');

// 5. buiten het net, zonder kade: geen vaarweg; open water breed genoeg telt wel
ok(!B.isBoatSpotValid(map, 3200, 1.5, 'kano'), 'smal water zonder net en kade: geen vaarweg');
ok(B.isBoatSpotValid(map, 4100, 100, 'sloep'), 'een meer van 200 m is open water');
ok(B.assessBoatSpot(map, 4100, 100, 'sloep').reden === 'open-water', 'reden: open water');
ok(!B.isBoatSpotValid(map, 9000, 9000, 'sloep'), 'op land: nee');
ok(!B.isBoatSpotValid(map, NaN, 0, 'sloep'), 'NaN: nee');

// 6. de kade: een boot bij een anker in niet-net water
B.voegAnkersToe([{ x: 4100, y: 190, soort: 'steiger' }]);
ok(B.dichtstbijKade(4100, 150, 60).soort === 'steiger', 'de steiger wordt gevonden');
ok(B.dichtstbijKade(4100, 100, 20) === null, 'buiten bereik: geen anker');

// 7. afmeren: aan de oever, evenwijdig, bij een anker, niet op elkaar
B.voegAnkersToe([{ x: 200, y: 17, soort: 'steiger' }]);
const midden = B.isMooringSpotValid(map, 200, 30, 0, 'sloep');
ok(!midden.ok && midden.reden === 'midden-in-water', 'afmeren midden in het kanaal: nee', midden.reden);
const aan = B.isMooringSpotValid(map, 200, 17.5, 0, 'sloep');
ok(aan.ok, 'afmeren aan de oever bij de steiger, evenwijdig', aan.reden);
const dwars = B.isMooringSpotValid(map, 200, 17.5, Math.PI / 2, 'sloep');
ok(!dwars.ok && dwars.reden === 'niet-evenwijdig', 'afmeren dwars op de oever: nee', dwars.reden);
const ver = B.isMooringSpotValid(map, 300, 17.5, 0, 'sloep');
ok(!ver.ok && ver.reden === 'geen-kade', 'afmeren ver van een kade: nee', ver.reden);
const op = B.isMooringSpotValid(map, 202, 17.5, 0, 'sloep', { anderen: [{ x: 200, y: 17.5, len: 5.5 }], len: 5.5 });
ok(!op.ok && op.reden === 'overlap', 'afmeren op een andere boot: nee', op.reden);
const naast = B.isMooringSpotValid(map, 208, 17.5, 0, 'sloep', { anderen: [{ x: 200, y: 17.5, len: 5.5 }], len: 5.5 });
ok(naast.ok, 'afmeren op een bootlengte ernaast mag', naast.reden);
const brug = { ...map, isOnBridge: () => true };
ok(!B.isMooringSpotValid(brug, 200, 17.5, 0, 'sloep').ok, 'niet in een brugopening');

// 8. verplaatsen naar de dichtstbijzijnde geldige plek
const v1 = B.findValidBoatSpot(map, 1200, 2, 'sloep', { maxD: 150 });
ok(v1 === null, 'op een sloot ver van elk vaarwater: geen plek, de boot vervalt');
const v2 = B.findValidBoatSpot({ ...map }, 200, 60, 'sloep', { maxD: 150 });
ok(v2 === null || B.isBoatSpotValid(map, v2.x, v2.y, 'sloep'), 'een gevonden plek is geldig');
const dichtbij = kaart([kanaal, water(0, 50, 400, 3, 'sloot')]);
dichtbij.waterNear = () => [kanaal, water(0, 50, 400, 3, 'sloot')];
const v3 = B.findValidBoatSpot(dichtbij, 200, 51.5, 'sloep', { maxD: 150 });
ok(v3 && v3.afstand > 0 && B.isBoatSpotValid(dichtbij, v3.x, v3.y, 'sloep'), 'een boot op een sloot naast het kanaal schuift naar het kanaal', JSON.stringify(v3));
ok(v3 && v3.y < 46, 'en wel het kanaal in', v3 && v3.y);
const boot = { x: 200, y: 51.5, angle: 0, model: { kind: 'sloep', len: 5.5, wid: 2 } };
ok(B.ensureBoatValid(dichtbij, boot) === 'verplaatst' && boot.y < 46, 'ensureBoatValid verplaatst een missieboot');
const goed = { x: 200, y: 30, angle: 0, model: { kind: 'sloep', len: 5.5, wid: 2 } };
ok(B.ensureBoatValid(map, goed) === 'ok' && goed.x === 200, 'een boot die goed ligt blijft staan');

// 9. determinisme en prestaties: zelfde vraag, zelfde antwoord; de gecachte vraag is snel
const a = JSON.stringify(B.assessBoatSpot(map, 150, 25, 'sloep')), b = JSON.stringify(B.assessBoatSpot(map, 150, 25, 'sloep'));
ok(a === b, 'dezelfde vraag, hetzelfde antwoord');
let t0 = performance.now();
for (let i = 0; i < 2000; i++) B.isBoatSpotValid(map, 10 + (i % 380), 20 + (i % 20), 'sloep');
const koud = (performance.now() - t0) / 2000;
t0 = performance.now();
for (let i = 0; i < 2000; i++) B.isBoatSpotValid(map, 10 + (i % 380), 20 + (i % 20), 'sloep');
const warm = (performance.now() - t0) / 2000;
ok(koud < 1, `een spawnkeuze (koud) < 1 ms: ${koud.toFixed(3)} ms`);
ok(warm < 0.05, `een spawnkeuze (gecachet) < 0,05 ms: ${warm.toFixed(4)} ms`);

// 10. zonder vaarnet: alleen breedte en soort water (een build zonder vaarnet.json vaart zoals voorheen)
B.configureBoatSource({});
ok(B.isBoatSpotValid(map, 3200, 1.5, 'kano'), 'zonder net: breed genoeg is genoeg');
ok(!B.isBoatSpotValid(map, 1200, 2, 'sloep'), 'zonder net: een sloot blijft een sloot');

console.log(`boatspots: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
