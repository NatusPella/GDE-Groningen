// Wereldkleur 24-11: de regels achter #1333 (etalages en bomen) en #1328 (containers), puur, zonder GL.
//   node scripts/wereldkleur_test.mjs
// - Elke winkelsoort heeft een meubel tegen de achterwand of hangt alles aan de wand, en laat een deel van de wandvakken kaal
//   (winkelkit.js STIJL.kast, STIJL.leeg); de shadertabel geeft dat door.
// - De winkelwanden van het nepinterieur gaan door igShopWall (vakken, kaal stuk muur, fries), niet meer door één patroon van
//   vloer tot plafond; de fietsenwinkel tekent losse fietsen (igBike) en geen wand vol wielen.
// - Geen roze kroon: een kers uit de kaart wordt meestal een linde, esdoorn of plataan, en de kers zelf staat in zomerblad.
// - De containers van M13 hebben een PBR-materiaal en een lak met een ondergrens aan de lichtheid.
// Samen spelen: alleen beeld, bij iedereen hetzelfde (geen netwerk, geen opslag).
import fs from 'node:fs';

let fails = 0, n = 0;
const ok = (c, msg, extra = '') => { n++; if (!c) { fails++; console.log('FAIL ' + msg + (extra ? ' (' + extra + ')' : '')); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

const WK = await import('../game/js/winkelkit.js');
for (const k of WK.SHOP_KINDS) {
  const t = WK.WINKEL[k];
  ok(Array.isArray(t.kast) && t.kast.length === 2 && t.kast[0] >= 0 && t.kast[0] <= 2.0 && t.kast[1] >= 0 && t.kast[1] <= 0.8, k + ': een meubel tegen de achterwand van hooguit 2 m hoog en 0,8 m diep', JSON.stringify(t.kast));
  ok(typeof t.leeg === 'number' && t.leeg >= 0 && t.leeg < 0.5, k + ': hooguit de helft van de wandvakken kaal', t.leeg);
  if (k !== 'kermiskraam') ok(t.leeg > 0, k + ': een deel van de wand blijft kaal, zodat het geen behang wordt');
}
const tab = WK.shaderTable();
ok(tab.stijl.every((r, i) => r[1] === WK.WINKEL[WK.SHOP_KINDS[i]].kast[0] && r[2] === WK.WINKEL[WK.SHOP_KINDS[i]].kast[1] && r[3] === WK.WINKEL[WK.SHOP_KINDS[i]].leeg), 'de shadertabel geeft kast en leeg door (uShopSty.yzw)');

const ig = lees('interiorglass.js');
const glsl = ig.slice(ig.indexOf('const INTERIOR ='), ig.indexOf('glassMaterial.onBeforeCompile'));
ok(/vec3 igShopWall\(/.test(glsl) && /vec3 igShopUnit\(/.test(glsl) && /vec3 igBike\(/.test(glsl), 'de winkelwand, het meubel en de fiets hebben een eigen functie');
ok(/else if \(shop && \(n\.z < -0\.5 \|\| abs\(n\.x\) > 0\.5\)\)/.test(glsl) && (glsl.match(/alb = igShopWall\(/g) || []).length === 1, 'achterwand en zijwanden van een winkel gaan door een igShopWall');
// 24-11: de D3D-compiler plakt elke aanroep in; met acht kopieen van igProducts tekende het glas op een losse mesh niets meer
ok((glsl.match(/igProducts\(/g) || []).length === 2, 'igProducts staat een keer in de shader en wordt een keer per pixel aangeroepen', (glsl.match(/igProducts\(/g) || []).length);
ok(!/if \(shop\) \{ vec3 pr = igProducts\(c/.test(glsl), 'geen winkelwand meer die van vloer tot plafond uit igProducts bestaat');
ok(/hitF = 3/.test(glsl) && /igShopUnit\(vec2\(hp\.x - k0\.x/.test(glsl), 'het meubel tegen de achterwand is een eigen doos met diepte');
ok(/float pand = fract\(shopStyle/.test(glsl), 'de inrichting hangt af van een seed per pand');
const shopWall = glsl.slice(glsl.indexOf('vec3 igShopWall('), glsl.indexOf('vec3 igShopUnit('));
ok(/pat == 5/.test(shopWall) && /igBike\(l, fc, col\)/.test(shopWall), 'de fietsenwinkel hangt losse fietsen in vakken');
ok(/hb < sty\.w/.test(shopWall), 'kale vakken volgen STIJL.leeg');
ok(!/\b(for|while)\s*\(/.test(glsl), 'geen lussen in de glasshader');
const bld = lees('models3d_buildings.js');
ok(/const bay0 = Math\.floor\(hash2\(seed, 9\.1\) \* 8\)/.test(bld) && /\(bay \+ bay0\) & 7/.test(bld), 'de ruitnummering van een winkel begint per pand ergens anders');

const GR = await import('../game/js/greenery.js');
const S = GR.SPECIES_INDEX;
const kers = GR.SPECIES[S.kers].color;
ok(((kers >> 8) & 255) > ((kers >> 16) & 255) && ((kers >> 8) & 255) > (kers & 255), 'de kers staat in zomerblad (groen, niet roze)', kers.toString(16));
const picks = {}; let pink = 0;
const col = { r: 0, g: 0, b: 0, setHex(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; return this; }, multiplyScalar(v) { this.r *= v; this.g *= v; this.b *= v; return this; } };
for (let i = 0; i < 400; i++) {
  const t = [i * 3.7 + 0.31, i * 1.9 - 4.2, S.kers, 75, 0];
  const id = GR.SPECIES[GR.treeDims(t).sp].id; picks[id] = (picks[id] || 0) + 1;
  GR.treeColor(t, col); if (col.r > col.g) pink++;
}
ok(pink === 0, 'geen kers uit de kaart met een roze kroon', pink + ' van 400');
ok(picks.linde > 80 && picks.esdoorn > 60 && picks.plataan > 40 && (picks.kers || 0) < 80, 'een kers uit de kaart wordt meestal linde, esdoorn of plataan', JSON.stringify(picks));
ok(GR.treeDims([3, 4, S.eik, 150, 0]).sp === S.eik && GR.treeDims([3, 4, S.linde, 150, 0]).sp === S.linde, 'andere soorten blijven wat ze zijn');
const t0 = [12.5, 40.25, S.kers, 70, 0];
ok(GR.treeDims(t0).sp === GR.treeDims(t0).sp && GR.summerSpecies(t0) === GR.treeDims(t0).sp, 'dezelfde boom kiest altijd dezelfde zomersoort (kroon en kleur kloppen bij elkaar)');

const ct = lees('containerterminal.js').replace(/\/\/.*$/gm, '');
ok(/new T\.MeshStandardMaterial\(\{ vertexColors: true/.test(ct) && !/MeshLambertMaterial\(\{ vertexColors: true, color \}\)/.test(ct), 'de containers hebben het PBR-materiaal van de wereld (omgevingslicht, ook in de schaduw)');
ok(/const LAK_L = \[0\.4, 0\.62\]/.test(ct), 'de lak heeft een ondergrens aan de lichtheid');

// #917: de lagen op de markt- en Natalini-gevels liggen ver genoeg uit elkaar (geen 1 tot 3 cm meer tussen baksteen en crème)
const mg = lees('marktgebouwen.js');
const lagen = Function('return ' + (mg.match(/export const MARKT_LAGEN = (\{[^}]*\})/) || [])[1])();
ok(lagen && lagen.speklaag >= 0.04 && lagen.kozijn >= 0.04 && lagen.latei >= 0.04, 'speklaag, kozijn en latei liggen minstens 4 cm voor de muur', JSON.stringify(lagen));
ok(lagen && lagen.lijst - lagen.latei >= 0.0399 && lagen.strook - lagen.lijst >= 0.0399 && lagen.lijst - lagen.speklaag >= 0.0399, 'lijst, latei, speklaag en hoekstrook liggen minstens 4 cm uit elkaar waar ze elkaar raken');
const plot = mg.slice(mg.indexOf('function buildPlot('), mg.indexOf('// a pilaster strip hides the joint'));
ok(!/fq\(B, e, [^;]*, 0\.0[0-3]\d*, /.test(plot), 'geen vlak meer dat 0 tot 4 cm voor de muur van een perceel ligt');
ok(/if \(nat\) \{ fq\(B, e, s0, s1, gH, Ep, 0, S\.wall, S\.g\); fq\(B, e, s0, s1, 0, gH, 0, 0xcfc3a5\); \}/.test(mg), 'de Natalini-plint is de muur zelf, geen laag erover');
ok(/for \(const \[a, b\] of gaps\) fbx\(B, e, a, b, ys - 0\.1, ys \+ 0\.1, 0, L\.speklaag/.test(mg), 'de speklagen zijn onderbroken rond de ramen');

console.log(fails ? `wereldkleur_test: ${fails} van ${n} FOUT` : `wereldkleur_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
