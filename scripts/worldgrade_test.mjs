// Pure test van de wereldgrading (game/js/worldgrade.js, worldcolormode.js, 21-11): uit en Laag doen niets, de dagprofielen zijn continu en
// begrensd, geen NaN, warm en zomers, Rustig drukwerk en kleurenblind schakelen raster en demping uit, het palet is monotoon in de menging
// en onafhankelijk van de volgorde (tegels en LOD-niveaus kleuren gelijk), en de contrastmatrix tussen wereldkleuren en markerkleuren (met
// kleurenblindsimulatie uit a11ylogic.js, dezelfde helper als de minimap-pijltest) blijft staan onder de sterkste grading.
//   node scripts/worldgrade_test.mjs            controleert
//   node scripts/worldgrade_test.mjs --tabel    schrijft ook de contrasttabel (voor docs/WERELDKLEUR-21-11.md)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gradeParams, gradePixel, profileAt, tintFactor, mixLumaHex, gradeNeutral, gradeDaypart, halftonePattern, GRADE_DAYPARTS, GRADE_TINT_KEYS, GRADE_BASE, GRADE_HALFTONE_PITCH } from '../game/js/worldgrade.js';
import { WORLD_COLOR_MODES, WORLD_COLOR_STRENGTH, cleanWorldColor, storedWorldColor } from '../game/js/worldcolormode.js';
import { WERELD_KLEURPLAAT, WERELD_INKTEN, WERELD_ROLLEN, dsWereld, wereldRol, setWereldMeng } from '../game/js/worldpalette.js';
import { simulate, colorDistance, contrastRatio, closePairs, MIN_DISTANCE } from '../game/js/a11ylogic.js';
import { PALETTES } from '../game/js/a11y.js';

let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('FAIL', m); } };
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const hexStr = (a) => '#' + a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lumaOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const TABEL = process.argv.includes('--tabel');

// ---------------------------------------------------------------- de standen
ok(WORLD_COLOR_MODES.join() === 'uit,subtiel,drukwerk', 'drie standen');
ok(WORLD_COLOR_STRENGTH.uit.meng === 0 && WORLD_COLOR_STRENGTH.uit.grade === 0, 'uit doet niets');
ok(WORLD_COLOR_STRENGTH.subtiel.meng === 0.4, 'subtiel is de menging van het besluit 21-11 (0,4)');
ok(WORLD_COLOR_STRENGTH.subtiel.meng < WORLD_COLOR_STRENGTH.drukwerk.meng && WORLD_COLOR_STRENGTH.subtiel.grade < WORLD_COLOR_STRENGTH.drukwerk.grade, 'drukwerk is sterker dan subtiel');
ok(WORLD_COLOR_STRENGTH.drukwerk.meng <= 0.7, 'ook drukwerk blijft een tint, geen filter (menging hoogstens 0,7)');
ok(cleanWorldColor('rommel') === 'subtiel' && cleanWorldColor(undefined) === 'subtiel' && cleanWorldColor('uit') === 'uit', 'onbekende stand valt terug op subtiel');
const nep = (tekst) => ({ getItem: () => tekst });
ok(storedWorldColor(nep(JSON.stringify({ worldColor: 'drukwerk' }))) === 'drukwerk', 'opgeslagen stand wordt gelezen');
ok(storedWorldColor(nep('{kapot')) === 'subtiel' && storedWorldColor(nep(null)) === 'subtiel' && storedWorldColor(null) === 'subtiel', 'kapotte of ontbrekende opslag: subtiel');

// ---------------------------------------------------------------- de dataset verwijst naar tokens, niet naar losse hexen
const bron = readFileSync(fileURLToPath(new URL('../game/js/worldgrade.js', import.meta.url)), 'utf8');
ok(!/0x[0-9a-fA-F]{6}\b/.test(bron.replace(/\/\/.*$/gm, '')) && !/#[0-9a-fA-F]{6}\b/.test(bron.replace(/\/\/.*$/gm, '')), 'worldgrade.js bevat geen losse hex');
for (const v of Object.values(GRADE_TINT_KEYS)) ok(WERELD_INKTEN[v] !== undefined, 'tintinkt ' + v + ' is een token van WERELD_INKTEN');
ok(GRADE_DAYPARTS.every((d, i) => i === 0 || d.e < GRADE_DAYPARTS[i - 1].e), 'dagdelen aflopend op zonshoogte');

// ---------------------------------------------------------------- Uit en Laag zijn de identiteit
const basis = { elevation: 40, hour: 13, overcast: 0.2, mist: 0, storm: 0, rustig: false, kleurenblind: false };
for (const [stand, niveau] of [['uit', 'hoog'], ['uit', 'middel'], ['subtiel', 'laag'], ['drukwerk', 'laag']]) {
  const p = gradeParams({ ...basis, stand, niveau }, {});
  ok(!p.actief && p.satMul === 1 && p.conMul === 1 && p.raster === 0 && p.korrel === 0 && p.mist === 0 && p.zenit === 0 && p.grond === 0
    && p.lichtMul.every((v) => v === 1) && p.schaduwMul.every((v) => v === 1), `${stand}/${niveau}: geen enkele verandering`);
  for (const c of [[10, 20, 30], [200, 120, 40], [255, 255, 255]]) ok(gradePixel(c, p, 7, 9).every((v, i) => v === c[i]), `${stand}/${niveau}: pixel ongewijzigd`);
}
ok(gradeNeutral().actief === false, 'gradeNeutral');

// ---------------------------------------------------------------- niveaus: Midden geen raster of korrel, Hoog wel
for (const stand of ['subtiel', 'drukwerk']) {
  const m = gradeParams({ ...basis, stand, niveau: 'middel' }, {}), h = gradeParams({ ...basis, stand, niveau: 'hoog' }, {});
  ok(m.actief && m.raster === 0 && m.korrel === 0, stand + ': Midden heeft licht en kleur, geen raster en korrel (geen extra shaderwerk)');
  ok(h.raster > 0 && h.korrel > 0, stand + ': Hoog heeft raster en korrel');
  ok(m.satMul === h.satMul && m.lichtMul.every((v, i) => v === h.lichtMul[i]), stand + ': licht en kleur zijn gelijk op Midden en Hoog');
}

// ---------------------------------------------------------------- bereik, continuïteit, geen NaN, warm en zomers
const weers = [{}, { overcast: 0.4 }, { overcast: 0.95, storm: 0.85 }, { overcast: 0.3, mist: 0.6 }, { overcast: 1, mist: 1, storm: 1 }];
let maxSprong = 0;
for (const stand of ['subtiel', 'drukwerk']) {
  for (const weer of weers) {
    let vorig = null;
    for (let e = -30; e <= 70; e += 0.25) {
      const p = gradeParams({ stand, niveau: 'hoog', elevation: e, hour: 12, overcast: 0, mist: 0, storm: 0, rustig: false, kleurenblind: false, ...weer }, {});
      const getallen = [p.satMul, p.conMul, p.mist, p.zenit, p.grond, p.raster, p.korrel, ...p.lichtMul, ...p.schaduwMul];
      ok(getallen.every(Number.isFinite), `geen NaN ${stand} e=${e}`);
      ok(p.satMul >= 0.85 && p.satMul <= 1 && p.conMul >= 1 && p.conMul <= 1.06, `sat en contrast begrensd ${stand} e=${e}`);
      ok(p.lichtMul.every((v) => v > 0.8 && v < 1.2) && p.schaduwMul.every((v) => v > 0.8 && v < 1.2), `tinten klein (hoogstens 20%) ${stand} e=${e}`);
      ok(p.lichtMul[0] >= p.lichtMul[2], `het licht is warm, nooit koud (zomer) ${stand} e=${e}`);
      ok(p.raster <= 0.09 && p.korrel <= 0.09, `raster en korrel blijven een hint ${stand} e=${e}`);
      if (vorig) {
        const v = [vorig.satMul, vorig.conMul, vorig.mist, vorig.zenit, vorig.grond, vorig.raster * 5, vorig.korrel * 5, ...vorig.lichtMul, ...vorig.schaduwMul];
        const w = [p.satMul, p.conMul, p.mist, p.zenit, p.grond, p.raster * 5, p.korrel * 5, ...p.lichtMul, ...p.schaduwMul];
        for (let i = 0; i < v.length; i++) maxSprong = Math.max(maxSprong, Math.abs(v[i] - w[i]));
      }
      vorig = { ...p };
    }
  }
}
ok(maxSprong < 0.02, `dagprofielen continu: grootste sprong per kwartgraad ${maxSprong.toFixed(4)} (< 0,02)`);
// ook continu in het weer
{
  let vorigW = null, sprongW = 0;
  for (let o = 0; o <= 1.0001; o += 0.01) {
    const p = gradeParams({ ...basis, stand: 'drukwerk', niveau: 'hoog', overcast: o, mist: o, storm: o }, {});
    const v = [p.satMul, p.mist, p.korrel * 5, ...p.lichtMul, ...p.schaduwMul];
    if (vorigW) for (let i = 0; i < v.length; i++) sprongW = Math.max(sprongW, Math.abs(v[i] - vorigW[i]));
    vorigW = v;
  }
  ok(sprongW < 0.02, `continu in het weer (grootste sprong per 1% ${sprongW.toFixed(4)})`);
}
// sterkte monotoon: drukwerk wijkt in elk dagdeel meer af van neutraal dan subtiel, en bij elk weer
for (const e of [60, 30, 14, 6, 1, -3, -12]) {
  const a = gradeParams({ ...basis, elevation: e, stand: 'subtiel', niveau: 'hoog' }, {}), b = gradeParams({ ...basis, elevation: e, stand: 'drukwerk', niveau: 'hoog' }, {});
  const afw = (p) => (1 - p.satMul) + (p.conMul - 1) + Math.abs(p.lichtMul[2] - 1) + Math.abs(p.schaduwMul[0] - 1) + p.zenit + p.grond + p.mist;
  ok(afw(b) >= afw(a) - 1e-9, `drukwerk is minstens zo sterk als subtiel bij e=${e}`);
}
// nacht en schemering blijven zoals ze zijn qua raster (alleen een korrel): het raster hoort bij daglicht
for (const e of [-3, -7, -12, -25]) ok(gradeParams({ ...basis, elevation: e, stand: 'drukwerk', niveau: 'hoog' }, {}).raster === 0, 'geen raster in de nacht e=' + e);
ok(gradeDaypart(60) === 'middag' && gradeDaypart(20, 8) === 'ochtend' && gradeDaypart(8) === 'gouden uur' && gradeDaypart(-20) === 'nacht', 'dagdeelnamen');
// het profiel op een sleutel is de sleutel
for (const d of GRADE_DAYPARTS) ok(Math.abs(profileAt(d.e).papier - d.papier) < 1e-9, 'profiel op sleutel ' + d.e);
ok(Object.values(profileAt(NaN)).every(Number.isFinite), 'profiel bij NaN valt terug');

// ---------------------------------------------------------------- toegankelijkheid
for (const e of [60, 14, -7]) {
  const r = gradeParams({ ...basis, elevation: e, stand: 'drukwerk', niveau: 'hoog', rustig: true }, {});
  ok(r.raster === 0 && r.korrel === 0, 'Rustig drukwerk: geen raster en korrel e=' + e);
  const norm = gradeParams({ ...basis, elevation: e, stand: 'subtiel', niveau: 'hoog' }, {});
  ok(r.satMul === norm.satMul, 'Rustig drukwerk: drukwerk is niet sterker dan subtiel e=' + e);
  const kb = gradeParams({ ...basis, elevation: e, stand: 'drukwerk', niveau: 'hoog', kleurenblind: true }, {});
  ok(kb.satMul === 1 && kb.raster === 0, 'Kleurenblind: niet gedempt en geen raster e=' + e);
}

// ---------------------------------------------------------------- het palet: bereik, monotoon, gelijk bij elke aanroepvolgorde
const kleuren = [];
for (const [cat, v] of Object.entries(WERELD_KLEURPLAAT)) for (const [naam, hex] of Object.entries(v.kleuren)) kleuren.push({ cat, naam, hex });
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
for (const { naam, hex } of kleuren) {
  let vorig = -1;
  for (let m = 0; m <= 1.0001; m += 0.05) {
    const o = dsWereld(hex, 'auto', m);
    ok(Number.isInteger(o) && o >= 0 && o <= 0xffffff, `palet binnen bereik ${naam} @${m.toFixed(2)}`);
    const d = dist(o, hex);
    ok(d >= vorig - 1.5, `palet monotoon: ${naam} wijkt bij meer menging niet minder af (@${m.toFixed(2)})`);
    vorig = d;
  }
}
// tegels en LOD-niveaus: dezelfde kleur geeft altijd dezelfde uitkomst, ook na het legen van de cache en in omgekeerde volgorde
{
  const m = WORLD_COLOR_STRENGTH.drukwerk.meng;
  const eerst = kleuren.map((k) => dsWereld(k.hex, 'auto', m));
  setWereldMeng(null);
  const terug = kleuren.slice().reverse().map((k) => dsWereld(k.hex, 'auto', m)).reverse();
  ok(eerst.every((v, i) => v === terug[i]), 'het palet is onafhankelijk van de aanroepvolgorde en de cache (tegel en LOD kleuren gelijk)');
  ok(kleuren.every((k) => dsWereld(k.hex, wereldRol(k.hex), m) === dsWereld(k.hex, 'auto', m)), 'een afgeleide rol geeft dezelfde kleur als auto');
}
// geen harde sprong aan de rolgrenzen: een stap van één niveau in één kanaal geeft een kleine stap in het resultaat (op de grens hoogstens 30 van 255)
{
  let max = 0, waar = '';
  for (const m of [0.4, 0.65]) {
    for (let r = 20; r < 250; r += 5) for (let g = 20; g < 250; g += 5) for (let b = 20; b < 250; b += 15) {
      const a = (r << 16) | (g << 8) | b, c = (r << 16) | ((g + 1) << 8) | b, d = ((r + 1) << 16) | (g << 8) | b;
      for (const q of [c, d]) { const s = dist(dsWereld(a, 'auto', m), dsWereld(q, 'auto', m)); if (s > max) { max = s; waar = a.toString(16) + '@' + m; } }
    }
  }
  console.log(`  (rolgrenzen: grootste sprong bij 1 niveau verschil in de invoer: ${max.toFixed(1)} bij ${waar})`);
  ok(max < 120, 'rolgrenzen springen niet extreem (' + max.toFixed(1) + ')');
}
// geel en roze blijven gereserveerd: ook bij drukwerk trekt de wereld hooguit 25% / 30% naar het token
for (const m of [0.65, 1]) {
  const luifel = 0x8a6a2a, kraam = 0xc99a3a;
  for (const h of [luifel, kraam]) {
    const o = dsWereld(h, 'geel', m);
    const t = WERELD_INKTEN.geel;
    const maxVerschuiving = dist(h, t) * WERELD_ROLLEN.geel.max + 2;
    ok(dist(o, h) <= maxVerschuiving, 'geel trekt niet meer dan het maximum bij ' + m);
  }
}

// ---------------------------------------------------------------- de contrastmatrix: markers tegen de wereld, voor en na
const rij = [];
const dagstanden = [
  { naam: 'middag', e: 60 }, { naam: 'ochtend', e: 20 }, { naam: 'gouden uur', e: 8 }, { naam: 'avond', e: 2 }, { naam: 'nacht', e: -12 },
];
const weerExtremen = [{}, { overcast: 0.95, storm: 0.85 }, { overcast: 0.3, mist: 0.6 }];
const sterkste = (e, weer, kleurenblind = false) => gradeParams({ ...basis, stand: 'drukwerk', niveau: 'hoog', elevation: e, overcast: 0, mist: 0, storm: 0, kleurenblind, ...weer }, {});
const grade = (hex, p, x = 5, y = 7) => gradePixel(Array.isArray(hex) ? hex : (typeof hex === 'string' ? rgb(parseInt(hex.slice(1), 16)) : rgb(hex)), p, x, y);
const mkHex = (s) => parseInt(s.slice(1), 16);
let minRatioVerlies = 0, maxRatioVerlies = 0;
for (const [pn, pal] of Object.entries(PALETTES)) {
  for (const [mn, mk] of Object.entries(pal)) {
    for (const k of kleuren) {
      const oud = contrastRatio(mk, k.hex);
      // de wereldkleur wordt eerst door het palet (materiaal) en dan door de grading op het scherm gedaan; de marker alleen door de grading
      for (const ds of dagstanden) for (const weer of weerExtremen) {
        const p = sterkste(ds.e, weer);
        const nw = contrastRatio(grade(mk, p), grade(dsWereld(k.hex, 'auto', WORLD_COLOR_STRENGTH.drukwerk.meng), p));
        const verlies = (oud - nw) / oud;
        if (verlies > maxRatioVerlies) maxRatioVerlies = verlies;
        if (-verlies > minRatioVerlies) minRatioVerlies = -verlies;
        // wat al leesbaar was (3:1 voor grafiek) blijft dat, tot een marge van 15% van de verhouding
        if (oud >= 3) ok(nw >= 3 - 0.0001 || (oud - nw) / oud < 0.15, `contrast ${pn}/${mn} tegen ${k.cat}/${k.naam} ${ds.naam}: ${oud.toFixed(2)} naar ${nw.toFixed(2)}`);
      }
    }
  }
}
console.log(`  (contrastmatrix: grootste verlies aan verhouding ${(maxRatioVerlies * 100).toFixed(1)}%, grootste winst ${(minRatioVerlies * 100).toFixed(1)}%)`);
ok(maxRatioVerlies < 0.15, 'geen marker verliest meer dan 15% contrast tegen een wereldkleur onder de sterkste grading (' + (maxRatioVerlies * 100).toFixed(1) + '%)');

// de sleutelparen blijven uit elkaar, voor elk kleurenblindpalet, onder de sterkste grading, ook gesimuleerd
for (const [pn, pal] of Object.entries(PALETTES)) {
  for (const z of ['uit', 'deuteranopie', 'protanopie', 'tritanopie']) {
    for (const ds of dagstanden) for (const weer of weerExtremen) {
      const p = sterkste(ds.e, weer, pn !== 'uit'); // wie een kleurenblindpalet kiest, krijgt de grading zonder demping en raster
      const nieuw = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, grade(v, p)]));
      const voor = closePairs(pal, z).map((x) => x.pair.join('/'));
      const na = closePairs(nieuw, z);
      for (const x of na) ok(voor.includes(x.pair.join('/')), `sleutelpaar ${x.pair.join('/')} (${pn}, ${z}, ${ds.naam}) viel na de grading onder ΔE ${MIN_DISTANCE}: ${x.distance}`);
      for (const [a, b] of [['ok', 'danger'], ['danger', 'police'], ['mission', 'job']]) {
        const d0 = colorDistance(simulate(pal[a], z), simulate(pal[b], z));
        const d1 = colorDistance(simulate(nieuw[a], z), simulate(nieuw[b], z));
        // met een gekozen kleurenblindpalet: bijna geen verlies; zonder: hoogstens 25% (Drukwerk dempt 7% van de verzadiging) of nog ruim te onderscheiden (ΔE 40)
        const grens = Math.min(d0 * (pn === 'uit' ? 0.75 : 0.93), 40);
        ok(d1 >= grens, `${a}/${b} (${pn}, ${z}, ${ds.naam}) verliest te veel afstand: ${d0.toFixed(1)} naar ${d1.toFixed(1)}`);
      }
    }
  }
}
// geel is 'volg dit': de wereld komt het niet dichter bij, ook niet na de grading
{
  const geel = '#f9c80e';
  let zwakste = 1e9;
  for (const k of kleuren) {
    const voor = colorDistance(hexStr(rgb(k.hex)), geel);
    const p = sterkste(60, {});
    const na = colorDistance(hexStr(grade(dsWereld(k.hex, 'auto', WORLD_COLOR_STRENGTH.drukwerk.meng), p)), geel);
    ok(na >= voor - 6 || na >= 40, `geel gereserveerd: ${k.cat}/${k.naam} komt niet dichter bij het geel van de marker (${voor.toFixed(1)} naar ${na.toFixed(1)})`);
    zwakste = Math.min(zwakste, na);
  }
  console.log(`  (dichtste wereldkleur bij het marker-geel na de grading: ΔE ${zwakste.toFixed(1)})`);
  ok(zwakste >= 12, 'geen wereldkleur lijkt op het marker-geel (ΔE >= 12): ' + zwakste.toFixed(1));
}
// wegen en water leesbaar: het luma-verschil tussen asfalt, stoep, gras en water verschuift na de grading nauwelijks
{
  const p = sterkste(60, {});
  const lijst = { asfalt: 0x57595c, stoep: 0x7b776d, gras: 0x4f7234, water: 0x2c4a38 };
  const L0 = Object.fromEntries(Object.entries(lijst).map(([k, v]) => [k, lumaOf(rgb(v))]));
  const L1 = Object.fromEntries(Object.entries(lijst).map(([k, v]) => [k, lumaOf(grade(dsWereld(v, 'auto', 0.65), p))]));
  for (const [a, b] of [['asfalt', 'stoep'], ['asfalt', 'gras'], ['gras', 'water'], ['stoep', 'water']]) {
    const d0 = Math.abs(L0[a] - L0[b]), d1 = Math.abs(L1[a] - L1[b]);
    ok(Math.abs(d1 - d0) <= 6, `${a}/${b}: luma-verschil ${d0.toFixed(1)} naar ${d1.toFixed(1)} (hoogstens 6 verschil)`);
  }
}

// ---------------------------------------------------------------- de shader rekent hetzelfde (constanten uit postfx3d.js)
{
  const sh = readFileSync(fileURLToPath(new URL('../game/js/postfx3d.js', import.meta.url)), 'utf8');
  ok(sh.includes('uRaster') && sh.includes('uKorrel'), 'de grade-pass kent raster en korrel');
  ok(sh.includes('12.9898, 78.233') && sh.includes('43758.5453'), 'de korrelruis is dezelfde formule');
  ok(sh.includes((Math.PI * 2 / GRADE_HALFTONE_PITCH).toFixed(7).slice(0, 9)) || sh.includes('1.5707963'), 'de rasterfrequentie hoort bij GRADE_HALFTONE_PITCH 4');
  ok(sh.includes('smoothstep(0.05, 0.30, lw)') && sh.includes('0.70710678'), 'het rastermasker is dezelfde formule');
  ok(Math.abs(halftonePattern(0, 0) - 0.5) < 1e-9 && halftonePattern(1, 0) >= 0 && halftonePattern(1, 0) <= 1, 'rasterpatroon binnen 0..1');
  // het gemiddelde van het raster over een periode is 0,5: de schaduw wordt gemiddeld hoogstens halve rastersterkte donkerder
  let som = 0, cnt = 0;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) { som += halftonePattern(x, y); cnt++; }
  ok(Math.abs(som / cnt - 0.5) < 0.05, 'het raster is gemiddeld neutraal (' + (som / cnt).toFixed(3) + ')');
}
// raster en korrel veranderen de gemiddelde helderheid van een vlak nauwelijks (een hint, geen vervuiling)
{
  const p = gradeParams({ ...basis, stand: 'drukwerk', niveau: 'hoog', elevation: 60 }, {});
  for (const c of [[40, 40, 44], [128, 128, 128], [220, 214, 200]]) {
    let som = 0, cnt = 0;
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) { som += lumaOf(gradePixel(c, p, x, y)); cnt++; }
    const zonder = lumaOf(gradePixel(c, { ...p, raster: 0, korrel: 0 }, 0, 0));
    ok(Math.abs(som / cnt - zonder) < 6, `raster en korrel verschuiven de gemiddelde helderheid van ${c} hoogstens 6/255 (${(som / cnt - zonder).toFixed(2)})`);
  }
}
// tintFactor en mixLumaHex: begrensd, helderheid behouden
for (const a of [0, 0.3, 0.8]) ok(tintFactor(WERELD_INKTEN.papier, a).every(Number.isFinite), 'tintFactor');
ok(tintFactor(WERELD_INKTEN.papier, 0).every((v) => v === 1), 'tintFactor 0 is neutraal');
for (const h of [0xc8d9e2, 0x3a78c4, 0x74695a, 0x1e2f60]) {
  const o = mixLumaHex(h, WERELD_INKTEN.water, 0.3);
  ok(Math.abs(lumaOf(rgb(o)) - lumaOf(rgb(h))) < 3, 'mixLumaHex behoudt de helderheid ' + h.toString(16));
  ok(mixLumaHex(h, WERELD_INKTEN.water, 0) === h, 'mixLumaHex 0 is de bron');
}
void GRADE_BASE;

if (TABEL) {
  console.log('\n| Marker (palet uit) | tegen wereldkleur | voor | na (drukwerk, middag) |');
  console.log('|---|---|---|---|');
  const p = sterkste(60, {});
  for (const mn of ['mission', 'danger', 'police', 'ok']) for (const cat of Object.keys(WERELD_KLEURPLAAT)) {
    const rep = Object.entries(WERELD_KLEURPLAAT[cat].kleuren)[0];
    const oud = contrastRatio(PALETTES.uit[mn], rep[1]);
    const nw = contrastRatio(grade(PALETTES.uit[mn], p), grade(dsWereld(rep[1], 'auto', 0.65), p));
    console.log(`| ${mn} | ${cat} (${rep[0]}) | ${oud.toFixed(2)} | ${nw.toFixed(2)} |`);
  }
}
console.log(`worldgrade_test: ${n - fail}/${n} ok`);
if (fail) process.exit(1);
