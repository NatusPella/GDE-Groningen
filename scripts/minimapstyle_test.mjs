// De stijl- en laagregels van de minimap (23-11, "strakker en mooier"): puur, zonder canvas.
//   node scripts/minimapstyle_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../game/js/minimapstyle.js';
import { minimapScale, minimapTopSpeed, MINIMAP_MODE } from '../game/js/roadaccess.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// 1. lagen: het land onderop, de route boven de plekken, de speler boven alles op de kaart, de rand als laatste
ok(S.MM_LAYERS[0] === 'land' && S.MM_LAYERS[S.MM_LAYERS.length - 1] === 'rand', 'het land onderop, de rand bovenop');
ok(S.layerIndex('routes') > S.layerIndex('plaatsnamen') && S.layerIndex('routes') < S.layerIndex('doelen'), 'de route boven de namen en onder de doelen');
ok(S.layerIndex('doelen') > S.layerIndex('plekken') && S.layerIndex('plekken') > S.layerIndex('routes'), 'doelen liggen boven de gewone plekken, de plekken boven de route (een badge leest op de lijn)');
ok(S.layerIndex('speler') > S.layerIndex('politie') && S.layerIndex('speler') > S.layerIndex('doelen') && S.layerIndex('speler') < S.layerIndex('noord'), 'de speler boven alles op de kaart, onder de randmarkeringen');
ok(new Set(S.MM_LAYERS).size === S.MM_LAYERS.length && new Set(S.LAND_LAYERS).size === S.LAND_LAYERS.length, 'geen laag dubbel');
ok(S.LAND_LAYERS.indexOf('water') < S.LAND_LAYERS.indexOf('wegen') && S.LAND_LAYERS.indexOf('wegen') < S.LAND_LAYERS.indexOf('gebouwen'), 'water onder de wegen, gebouwen boven de wegen');
ok(!S.LAND_LAYERS.includes('treinen') && S.MM_LAYERS.includes('treinen'), 'treinen rijden: ze zitten niet in de gecachete landlaag');

// 2. hiërarchie: de route die je volgt springt eruit, de rest is stil
const a = S.routeLook(true), b = S.routeLook(false);
ok(a.width > b.width && a.casing >= b.casing && a.halo > 0 && b.halo === 0, 'de actieve route is dikker en heeft een papieren rand');
ok(a.alpha === 1 && b.alpha < 1, 'een andere route stapt terug');
ok(a.chevrons && !b.chevrons, 'alleen de actieve route heeft chevrons');
ok(S.plekAlpha(true) < 1 && S.plekAlpha(true) >= 0.6 && S.plekAlpha(false) === 1, 'met een doel zijn de plekken stil maar leesbaar');
ok(a.width + a.casing + 2 * a.halo <= 14, 'de actieve route blijft binnen 14 px (hij bedekt de straatnamen niet)');

// 3. niet te veel tegelijk
ok(S.plekBudget(0, 6) === S.PLEK_MAX && S.plekBudget(6, 6) === S.PLEK_MIN && S.plekBudget(99, 6) === S.PLEK_MIN, 'lopend acht plekken, op topsnelheid drie');
let vorige = Infinity;
for (const v of [0, 2, 5, 10, 20, 28, 40]) { const k = S.plekBudget(v, 28); ok(k <= vorige && k >= S.PLEK_MIN, 'sneller is nooit meer plekken (' + v + ')'); vorige = k; }
ok(S.plekBudget(NaN, 0) === S.PLEK_MAX, 'zonder topsnelheid of snelheid het volle budget');

// 4. beweging: niet van de framerate afhankelijk, en Beweging beperken
const stappen = (dt, n2) => { let z = 1; for (let i = 0; i < n2; i++) z = S.naarZoom(z, 2, dt, false).waarde; return z; };
ok(Math.abs(stappen(1 / 60, 60) - stappen(1 / 30, 30)) < 1e-3 && Math.abs(stappen(1 / 60, 60) - stappen(0.1, 10)) < 1e-3, 'de zoom komt na een seconde op dezelfde plek bij 60, 30 en 10 tekenbeurten');
ok(S.naarZoom(1, 2, 0.016, true).waarde === 2 && !S.naarZoom(1, 2, 0.016, true).bezig, 'Beweging beperken: de zoom springt, geen glijden');
ok(S.naarZoom(1.999999, 2, 0.016, false).waarde === 2, 'vlak bij het doel staat de zoom stil (geen eindeloos settelen)');
const h = S.naarHoek(3.1, -3.1, 0.016, false);
ok(h.waarde > 3.1 && h.bezig, 'de draaiing neemt de korte kant over de naad');
ok(Math.abs(S.naarHoek(0, 1, 0.016, true).waarde - 1) < 1e-9, 'Beweging beperken: de draaiing volgt direct');
ok(S.naarHoek(NaN, 0.5, 0.016, false).waarde === 0.5, 'de eerste hoek is meteen goed');
let sp = NaN; sp = S.volgSnelheid(sp, 10, 0.016); ok(sp === 10, 'de eerste snelheid is meteen goed');
for (let i = 0; i < 3; i++) sp = S.volgSnelheid(sp, i % 2 ? 30 : 10, 0.033);
ok(sp > 10 && sp < 18, 'een hobbel in de snelheid laat de zoom niet ademen (' + sp.toFixed(1) + ')');
ok(S.zoomStap(0, 0.7 * 28, 28) === 1 && S.zoomStap(1, 0.5 * 28, 28) === 1 && S.zoomStap(1, 0.3 * 28, 28) === 0 && S.zoomStap(0, 0.5 * 28, 28) === 0, 'de zoomstappen hebben een tussenmarge');
for (const m of Object.keys(MINIMAP_MODE)) ok(minimapTopSpeed(m) > 0 && minimapScale(m, minimapTopSpeed(m)) === minimapScale(m, minimapTopSpeed(m) * 3), m + ': boven de topsnelheid zoomt de kaart niet verder uit');

// 5. scherpte: de canvas krijgt precies de pixels van zijn vak
ok(S.backingPx(466.4, 233, 2) === 466 && S.backingPx(0, 233, 1.25) === 291 && S.backingPx(undefined, 250, 1) === 250, 'apparaatpixels van het vak, anders CSS keer verhouding');

// 6. de landcache
const m1 = S.landMaat(200, 1.3, 1);
ok(m1.half === 200 * S.LAND_MARGE && m1.res === 1.3 * S.LAND_OVERSAMPLE && m1.px === Math.ceil(2 * m1.half * m1.res), 'de laag dekt de marge en is overbemonsterd');
ok(S.landMaat(200, 1.3, 2).res === 2.6, 'op een scherm met 2x pixels de echte resolutie');
ok(S.landMaat(5000, 0.05, 1).px <= S.LAND_MAX_PX, 'nooit breder dan ' + S.LAND_MAX_PX + ' px');
const c = { x: 0, y: 0, half: 290, schaal: 1.3, sleutel: 'a', geo: 1, at: 0 };
const q = (o) => ({ x: 0, y: 0, straal: 200, schaal: 1.3, sleutel: 'a', geo: 1, nu: 100, bezig: false, laden: false, ...o });
ok(S.landVerouderd(null, q({})) === 'leeg' && S.landVerouderd(c, q({})) === '', 'leeg en vers');
ok(S.landVerouderd(c, q({ sleutel: 'b' })) === 'stijl', 'een andere dag/nacht, stand of laag: opnieuw');
ok(S.landVerouderd(c, q({ x: 80 })) === '' && S.landVerouderd(c, q({ x: 95 })) === 'rand', 'pas opnieuw als het beeld de rand van de laag raakt');
ok(S.landVerouderd(c, q({ schaal: 1.3 * 1.05, bezig: true })) === '' && S.landVerouderd(c, q({ schaal: 1.3 * 1.2, bezig: true })) === 'zoom', 'tijdens het zoomen een band');
ok(S.landVerouderd(c, q({ schaal: 1.3 * 1.05 })) === 'scherp', 'staat de zoom stil, dan één keer op de echte maat');
ok(S.landVerouderd(c, q({ geo: 2, nu: 100 })) === '' && S.landVerouderd(c, q({ geo: 2, nu: S.LAND_TEGEL_MS })) === 'tegels', 'nieuwe tegels: hooguit twee keer per seconde');
ok(S.landVerouderd(c, q({ laden: true, nu: S.LAND_LADEN_MS })) === 'laden', 'de provinciekaart laadt nog');

// 7. de tekencode volgt de regels (bron)
const hp = lees('hud_panel.js');
const mm = hp.slice(hp.indexOf('function drawMinimap('), hp.indexOf('// A heli run (helirun.js)'));
ok(/devicePixelContentBoxSize/.test(hp) && /backingPx\(/.test(mm), 'de canvas volgt de apparaatpixels van zijn vak (geen wazige schaling)');
ok(/drawMiniLandCached\(/.test(mm) && /landVerouderd\(/.test(hp), 'het land komt uit de cache');
ok(!/createRadialGradient/.test(hp.slice(hp.indexOf('function drawMiniSpeler'), hp.indexOf('function drawMiniSpeler') + 1600)), 'de spelerpijl maakt geen verloop per beeld');
ok(/reducedMotion\(\)/.test(mm) && /naarZoom\(/.test(mm) && /naarHoek\(/.test(mm), 'zoom en draaiing volgen Beweging beperken');
ok(/plekBudget\(/.test(mm) && /plekAlpha\(/.test(mm), 'decluttering en stille plekken');
ok(!/#[0-9a-fA-F]{6}\b/.test(lees('minimapstyle.js')), 'minimapstyle.js heeft geen eigen kleuren (die komen uit de tokens)');
const mmFns = hp.slice(hp.indexOf('function drawMiniRoute'), hp.indexOf('function drawMiniRoute') + 2400) + hp.slice(hp.indexOf('function drawMiniSpeler'), hp.indexOf('function drawMiniSpeler') + 1600);
ok(!/#[0-9a-fA-F]{6}\b/.test(mmFns), 'route en speler van de minimap tekenen met de inkt- en tokenkleuren');

console.log('minimapstyle_test: ' + n + ' controles ok');
