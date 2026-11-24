// De dither-overgang detailgebouw / verre kopie (game/js/buildingfade.js): voor elke afstand rond de ring en elke pixel van het
// 4x4-patroon is er minstens één laag zichtbaar, en waar beide lagen bestaan precies één (geen gat, geen dubbel). Ook de bijzondere
// gevallen: een gebouw zonder eigen mesh (keep), een ring van de verre laag kleiner dan die van de detailgebouwen, geen band (Laag, Hoog-kort).
// En de GLSL in farlod.js en scene3d.js gebruikt deze stukken.
//   node scripts/buildingfade_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BUILDING_FADE_BAND as B, buildingFadeT, bayer4, detailShows, farShows, GLSL_DETAIL_VERT, GLSL_DETAIL_FRAG, GLSL_FAR_FRAG, GLSL_BAYER, fadeBandStep, BAND_SETTLE_S, BAND_MOVE_SPEED } from '../game/js/buildingfade.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const pixels = [];
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) pixels.push(bayer4(x + 0.5, y + 0.5));
ok(new Set(pixels.map((v) => v.toFixed(4))).size === 16 && pixels.every((v) => v > 0 && v < 1), 'het 4x4-patroon heeft 16 verschillende drempels in (0, 1)');
// 24-11 (beeldregressie 'stad', witte spikkels): een varying die overal 1 of 0 is, komt door de interpolatie als 1 - eps of eps aan; geen
// enkele pixel mag daardoor wegvallen (de drempels staan in het midden van hun zestiende, een halve stap van 0 en van 1)
for (const eps of [1e-7, 1e-5, 1e-3]) for (const b of pixels) { ok(!(b < 1 - (1 - eps)), `verre kopie op 1 - ${eps}: pixel blijft`); ok(!(b >= 1 - eps), `detail op ${eps}: pixel blijft`); }

for (const R of [140, 170, 155.3]) {
  for (const ringDetail of [R, R + 20]) { // de detailring kan groter zijn dan de ring van de verre laag (lodR = min(...))
    for (let d = 0; d <= R + 40; d += 0.05) {
      const detailExists = d <= ringDetail; // de CPU zet het detailgebouw in de scène tot zijn ring
      const t = buildingFadeT(d, R, B);
      for (const b of pixels) {
        const det = detailExists && detailShows(b, t);
        const far = farShows(b, d, R, B, false);
        ok(det || far, `R ${R}, d ${d.toFixed(2)}: minstens één laag (bayer ${b.toFixed(3)})`);
        if (detailExists) ok(!(det && far), `R ${R}, d ${d.toFixed(2)}: niet beide lagen op dezelfde pixel`);
      }
    }
  }
}
// een gebouw in de ring zonder eigen mesh houdt zijn volle verre kopie
for (let d = 0; d <= 200; d += 1) for (const b of pixels) ok(farShows(b, d, 170, B, true), 'keep: de verre kopie staat vol');
// geen band (geen verre laag of ?perfoff=gebouwfade): het detail tekent vol, de kopie is binnen de ring weg (de oude harde wissel)
for (let d = 0; d <= 170; d += 0.5) for (const b of pixels) { ok(detailShows(b, buildingFadeT(d, 170, 0), 0), 'zonder band: detail vol'); ok(!farShows(b, d, 170, 0), 'zonder band: geen kopie binnen de ring'); }
// t loopt van 0 naar 1 over de band en is daarbuiten vast
ok(buildingFadeT(170 - B - 1, 170) === 0 && buildingFadeT(170, 170) === 1 && Math.abs(buildingFadeT(170 - B / 2, 170) - 0.5) < 1e-9, 't over de band');


// temporele stabiliteit: stilstaand krimpt de band in BAND_SETTLE_S tot 0 (geen blijvend half-om-half gebouw), in beweging groeit hij terug
{
  let b = B;
  for (let t = 0; t < BAND_SETTLE_S + 0.05; t += 1 / 60) b = fadeBandStep(b, B, 0, 1 / 60);
  ok(b === 0, 'stilstand: de band is na BAND_SETTLE_S dicht');
  ok(fadeBandStep(B, B, 0, 1 / 60) > 0 && fadeBandStep(B, B, 0, 1 / 60) < B, 'stilstand: de band krimpt geleidelijk (een overgang in de tijd)');
  for (let t = 0; t < BAND_SETTLE_S + 0.05; t += 1 / 60) b = fadeBandStep(b, B, BAND_MOVE_SPEED + 1, 1 / 60);
  ok(b === B, 'beweging: de band is weer open');
  ok(fadeBandStep(B, 0, 10, 1 / 60) === 0, 'geen verre laag: meteen geen band');
  ok(fadeBandStep(NaN, B, 10, 1 / 60) > 0 && fadeBandStep(B, B, 10, 5) === B, 'robuust tegen NaN en een lange dt');
}

// de shaders gebruiken deze regels
const far = fs.readFileSync(new URL('../game/js/farlod.js', import.meta.url), 'utf8');
const sc = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(far.includes('${GLSL_FAR_FRAG}') && far.includes('vFarFade = (lodDist - (uLodDetailR - uLodBand)) / uLodBand;'), 'farlod.js: de kopie dooft met dezelfde t uit');
ok(far.includes('if (uLodBand <= 0.0 || lodHard > 0.5 || lodDist <= uLodDetailR - uLodBand) gl_Position'), 'farlod.js: binnen de band ingeklapt, zonder band (of voor een landmark) de oude wissel');
// een gebouw met een eigen model: zijn detail dithert niet (scene3d.js), dus zijn verre kopie houdt de harde wissel (anders een baksteencilinder door een lichte gevel)
ok(sc.includes("if (!ownBuildingModel(b) && !perfOff('gebouwfade')) addBuildingFade(mesh, b);") && far.includes('B.hardNow = ownBuildingModel(b) ? 1 : 0;'), 'eigen model (landmark, marktgebouw, kit): geen band in beide lagen');
ok(GLSL_DETAIL_FRAG.includes('bfBayer4') && GLSL_FAR_FRAG.includes('bfBayer4') && GLSL_BAYER.includes('+ 0.03125'), 'GLSL: dezelfde drempels met de halve stap als bayer4');
ok(sc.includes('${GLSL_DETAIL_VERT}') && sc.includes('${GLSL_DETAIL_FRAG}') && sc.includes("g.setAttribute('lodC'"), 'scene3d.js: het detailgebouw dithert op zijn middelpunt');
ok(GLSL_DETAIL_VERT.includes('(distance(lodC, uLodPlayer) - (uLodDetailR - uLodBand)) / uLodBand') && GLSL_DETAIL_FRAG.includes('>= 1.0 - vBldFade') && GLSL_FAR_FRAG.includes('< 1.0 - vFarFade'), 'GLSL: aanvullende drempels');
ok(sc.includes('const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;') && far.includes('const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;'), 'beide lagen: hetzelfde middelpunt (het midden van b.bounds)');
console.log(`buildingfade_test: ${n} controles groen`);
