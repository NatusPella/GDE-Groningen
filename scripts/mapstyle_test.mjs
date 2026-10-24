// The shared map style (game/js/mapstyle.js): both palettes complete, zoom
// rules, and the three renderers reading it. Run: node scripts/mapstyle_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { mapPhase, applyMapPhase, currentMapPhase, nightPalette, shade, miniRoadStyle, MAP_PALETTE, MINI_PALETTE, ROAD_ORDER, ROAD_WIDTH_PX, ZOOM, layersAtZoom, roadWidthPx, roadColor, seaStyle, toRgba, baseFilter, INK, inkA, inkCss, ICON_RIM, ICON_FILL, ICON_GLYPH_LIGHT, ICON_MIN_ZOOM, modeLook, MINI_RANGE_M } from '../game/js/mapstyle.js';
import * as mapicons from '../game/js/mapicons.js';
import * as mapstyle from '../game/js/mapstyle.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

for (const k of Object.keys(MAP_PALETTE)) ok(k in MINI_PALETTE || k === 'foot', 'mini has ' + k);
for (const k of Object.keys(MINI_PALETTE)) if (k !== 'buildings' && k !== 'roadMetres') ok(k in MAP_PALETTE, 'map has ' + k);
for (const cat of Object.keys(ROAD_ORDER)) ok(ROAD_WIDTH_PX[cat] > 0 && roadColor(cat), 'road class ' + cat);
ok(ROAD_ORDER.foot < ROAD_ORDER.minor && ROAD_ORDER.minor < ROAD_ORDER.normal && ROAD_ORDER.normal < ROAD_ORDER.major, 'major on top');

ok(layersAtZoom(1).roads.join() === 'major,normal' && layersAtZoom(2).roads.length === 5, 'roads by zoom');
ok(!layersAtZoom(2.7).buildings && layersAtZoom(ZOOM.building).buildings, 'buildings from zoom 2.8');
ok(roadWidthPx('normal', 1, 8, 0.5) === 0.9 && roadWidthPx('normal', 3, 8, 0.5) === 1.4, 'normal road width by zoom');
ok(roadWidthPx('major', 8, 12, 1) > 2.4, 'real width up close');

ok(seaStyle().fill === MAP_PALETTE.water && seaStyle(MINI_PALETTE).edge === '#5aa0c0', 'sea per palette');
ok(toRgba('#2d6a86').join() === '45,106,134,255' && toRgba('rgba(160, 156, 146, 0.62)')[3] === 158, 'toRgba');

// day and night
ok(mapPhase(12) === 'dag' && mapPhase(23) === 'nacht' && mapPhase(3) === 'nacht' && mapPhase(6) === 'dag' && mapPhase(20.4) === 'dag' && mapPhase(20.5) === 'nacht', 'phase by hour');
ok(mapPhase(undefined) === 'dag' && mapPhase(27) === 'nacht', 'phase edge cases');
ok(shade('#ffffff', 0.5) === '#80808f' && shade('rgba(100, 100, 100, 0.5)', 0.5).startsWith('rgba(50, 50, 56, 0.5'), 'shade');
const lum = (c) => { const [r, g, b] = toRgba(c); return r + g + b; };
const night = nightPalette(MAP_PALETTE);
for (const k of ['meadow', 'water', 'road', 'major', 'building']) ok(lum(night[k]) < lum(MAP_PALETTE[k]), 'night darker: ' + k);
ok(lum(night.major) > lum(night.meadow) * 2 && lum(night.road) > lum(night.park), 'roads stay readable at night');
ok(night.roadMin === MAP_PALETTE.roadMin && nightPalette(MINI_PALETTE).buildings.length === 5, 'numbers and lists kept');
const dayWater = MAP_PALETTE.water;
ok(applyMapPhase('nacht') && MAP_PALETTE.water !== dayWater && currentMapPhase() === 'nacht' && !applyMapPhase('nacht'), 'palette turns in place');
ok(baseFilter() === 'brightness(0.6) saturate(0.9)', 'province base is dimmed at night');
ok(applyMapPhase('dag') && MAP_PALETTE.water === dayWater && baseFilter() === 'none', 'and back to day');

// minimap lines
ok(miniRoadStyle('major', 12, 1.5).widthM === 12 && miniRoadStyle('minor', 3, 0.5).widthM >= 1.4 / 0.5, 'min px width at small scale');
ok(miniRoadStyle('foot', 2, 1.5).alpha === 1 && miniRoadStyle('foot', 2, 0.6).alpha === 0 && miniRoadStyle('foot', 2, 0.8).alpha > 0 && miniRoadStyle('normal', 6, 0.3).alpha === 1, 'footpaths fade when zoomed out');

// the renderers take their colours from here
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
for (const f of ['game/js/countrymap.js', 'game/js/mapview.js', 'game/js/regions.js', 'game/js/hud_panel.js', 'scripts/world/province_map.mjs']) {
  ok(/mapstyle\.js/.test(src(f)), f + ' imports mapstyle');
}
for (const f of ['game/js/mapview.js', 'scripts/world/province_map.mjs']) ok(!/'#2d6a86'|'#4a8fae'/.test(src(f)), f + ' has no own water colours');

// --- one colour table, one layer rule (issue #112) -------------------------------
// The ink table keeps the colours the renderers had as literals: pinned here, so
// moving a colour into the table can never change the look unnoticed.
const INK_WAS = {
  cream: '#f0ede4', paper: '#f5f0e6', textBright: '#f2f2f2', dark: '#0c140e', black: '#000000', white: '#ffffff',
  green: '#1e9e56', greenLight: '#3fc97a', greenDark: '#0f5c30', red: '#d93f3f', policeBlue: '#3f6fd9', yellow: '#e8c93a',
  horeca: '#c9622a', grey: '#c7c7c2', greyDark: '#2a2e28',
  seaLabel: 'rgb(190,225,245)', flavour: 'rgb(245,226,170)', amber: '#ffbe46', amberInk: '#1c1408',
  panelTop: '#17301f', panelCard: '#10261a', panelDeep: 'rgb(10,19,13)', selected: 'rgb(95,180,217)',
  medalBronze: '#c8834a', medalSilver: '#cfd6dc',
  homeBlue: '#2f6fb0', eierbal: '#b06a28', locked: '#8d9489', passiefGrijs: '#9a9a9a',
  ringNext: '#ffc21a', ringLater: 'rgb(255,233,160)', heliDone: '#5dff7a', heliMiss: '#ff5a3c', balloon: '#ff7ab6',
  routeUser: '#c068ff', routeJob: '#ff9a3c', routeCare: '#ff5fb4',
  tintMini: 'rgb(6,12,9)', tintMap: 'rgb(4,8,12)',
  borderFriesland: '#e8b04a', borderDrenthe: '#c9a0e0', borderDuitsland: '#e86a5a', borderOther: '#e8e4d8', railBed: '#1b1d22',
  routeLine: '#3fd0ff', missionArea: '#ffd84a', worldEnd: '#1f2a3a',
};
const rgbOf = (c) => toRgba(c).slice(0, 3).join();
const rgbWas = (c) => (c[0] === '#' ? toRgba(c) : c.match(/\d+/g).map(Number)).slice(0, 3).join();
ok(Object.keys(INK).join() === Object.keys(INK_WAS).join(), 'ink table has the names the test pins');
for (const [k, was] of Object.entries(INK_WAS)) ok(/^#[0-9a-f]{6}$/.test(INK[k]) && rgbOf(INK[k]) === rgbWas(was), 'ink keeps its colour: ' + k);
ok(inkA('cream', 0.5) === 'rgba(240, 237, 228, 0.5)' && inkA('dark', '0.85') === 'rgba(12, 20, 14, 0.85)' && inkA('black', 0) === 'rgba(0, 0, 0, 0)', 'inkA');

ok(inkCss('a { color: ink(cream); border: 1px solid ink(greenLight 0.6); } b { x: ink(dark 0.85) }') === 'a { color: #f0ede4; border: 1px solid rgba(63, 201, 122, 0.6); } b { x: rgba(12, 20, 14, 0.85) }', 'inkCss resolves ink(name) and ink(name alpha)');
let inkThrew = false;
try { inkCss('a { color: ink(nope); }'); } catch (e) { inkThrew = true; }
ok(inkThrew, 'inkCss refuses an unknown ink');
// every ink() in the full map's stylesheet exists (the sheet is text; inkCss would throw on a typo when the map first opens)
const sheet = /style\.textContent = inkCss\(`([\s\S]*?)`\);/.exec(src('game/js/mapview.js'));
ok(sheet && /\bink\(/.test(sheet[1]) && !/#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(sheet[1]), 'the full map stylesheet names its colours with ink() tokens');
if (sheet) { let threw = false; try { inkCss(sheet[1]); } catch (e) { threw = true; } ok(!threw, 'every ink() in the full map stylesheet exists'); ok(!/\bink\(/.test(inkCss(sheet[1])), 'and all are resolved'); }

// the icon colours: the design stays, only the place changed
const RIM_WAS = {
  zorg: '#ff5a5a', politiebureau: '#5a8bff', garage: '#ffb23f', station: '#9a7bff', job: '#4fd6c4',
  shop: '#ff8ad0', gevaar: '#ff5a5a', rival: '#ffb23f', halte: '#ffd84a', subdoel: '#4fd6c4', fun: '#a6e04f', horeca: '#ff9a4f', own: '#f5e04f', ommeland: '#7fd0ff',
};
const FILL_WAS = {
  zorg: '#ef4444', politiebureau: '#3b82f6', garage: '#f59e0b', station: '#8b5cf6', job: '#14b8a6',
  shop: '#ec4899', fun: '#3fae49', horeca: '#f97316', ommeland: '#38bdf8', flitspaal: '#facc15', tip: '#d6a05a', other: '#f5f0e6',
};
ok(JSON.stringify(ICON_RIM) === JSON.stringify(RIM_WAS) && JSON.stringify(ICON_FILL) === JSON.stringify(FILL_WAS) && ICON_GLYPH_LIGHT === '#fff8ea', 'icon rim and fill colours unchanged');
ok(mapicons.FLAT_FILL === ICON_FILL && mapicons.HALO_DARK === INK.dark && mapicons.HALO_LIGHT === INK.cream && mapicons.GLYPH_LIGHT === ICON_GLYPH_LIGHT, 'mapicons reads the table');
ok(mapicons.mapRimColor('hospital') === '#ff5a5a' && mapicons.mapRimColor('player') === 'rgba(240, 237, 228, 0.92)', 'rim colour per kind');

// the zoom rule per icon category: from the table, one entry per category mapicons knows
const MIN_WAS = { player: 0, partner: 0, goal: 0, mission: 0, police: 0, gevaar: 0, rival: 0, halte: 0, subdoel: 0, home: 0, own: 0.6, station: 0, zorg: 0.9, politiebureau: 0.9, garage: 1.1, job: 1.1, fun: 1.6, shop: 2, ommeland: 0.34, companion: 1.6, tip: 4, horeca: 6, flitspaal: 4, other: 2 };
ok(JSON.stringify(ICON_MIN_ZOOM) === JSON.stringify(MIN_WAS), 'icon categories show from the same zoom as before');
const SAMPLE_KINDS = ['player', 'partner', 'userWaypoint', 'mm-gevaar', 'mm-rival', 'mm-halte', 'mm-subdoel', 'waypoint', 'cash', 'home', 'own', 'station', 'hospital', 'politiebureau', 'garage', 'sj-x', 'shop-x', 'dorp', 'companion', 'eierbalTip', 'horeca', 'flitspaal', 'pigeon', 'zzz'];
for (const k of SAMPLE_KINDS) ok(mapicons.mapCategory(k) in ICON_MIN_ZOOM, 'zoom rule for the category of ' + k);
for (const z of [0.3, 0.5, 0.9, 1, 1.6, 2, 4, 6, 8]) for (const k of SAMPLE_KINDS) ok(mapicons.mapKindVisible(k, z) === (z >= MIN_WAS[mapicons.mapCategory(k)]), `kind ${k} at zoom ${z}`);
ok(layersAtZoom(0.5).icons.includes('player') && !layersAtZoom(0.5).icons.includes('shop') && layersAtZoom(6).icons.includes('horeca') && !layersAtZoom(5.9).icons.includes('horeca'), 'layersAtZoom names the icon categories');

// layersAtZoom is the full map's rule: the same answers as the expressions mapview.js had inline
for (let z = 0.5; z <= 12.01; z += 0.1) {
  const L = layersAtZoom(z), lb = L.labels, tag = ' at zoom ' + z.toFixed(1);
  ok(L.roads.length === (z < 2 ? 2 : 5) && L.buildings === (z >= 2.8) && L.bridgeCasing === (z >= 2) && L.streamedVectors === (z >= 2), 'roads, buildings, bridges' + tag);
  ok(L.waterEdgePx === (z < 2 ? 1.2 : 0.8) && L.railPx === (z < 2 ? 1.6 : 2.6) && L.normalRoadAlpha === (z < 2 ? 0.6 : 1), 'edge, rail, alpha' + tag);
  ok(lb.regions === (z < 6) && lb.neighbours === (z < 6) && lb.wijken === (z < 6) && lb.cityRegion === !(z > 1.6) && lb.streets === (z >= 4) && lb.cycleStreets === (z >= 8) && lb.hamlets === (z >= 2) && lb.flavour === (z >= 2), 'which names show' + tag);
  ok(lb.placePx === (z < 2 ? 12 : 14) && lb.wijkPx === (z < 2 ? 12 : 15) && lb.streetPx === (z >= 8 ? 14 : 12), 'name sizes' + tag);
  if (z < 6) ok(lb.regionAlpha === Math.min(0.55, 0.2 + z * 0.15) && lb.wijkAlpha === (z < 3 ? 0.55 : 0.55 - (z - 3) * 0.12), 'name alpha' + tag);
}
ok(modeLook('boot').land === 0.4 && modeLook('boot').waterEdge === 2 && modeLook('lucht').land === 0.55 && modeLook('ov').land === 0.6 && modeLook('ov').rail === 1.8, 'travel mode look');
ok(modeLook('lopen').land === 1 && modeLook('fiets').waterEdge === 1 && modeLook('auto').rail === 1 && modeLook(undefined).land === 1, 'other modes leave the map alone');
ok(MINI_RANGE_M.near === 150 && MINI_RANGE_M.far === 250, 'minimap looks 150 / 250 m');

// --- no loose colour literals in the map renderers ---------------------------------
// Every colour the maps draw comes from mapstyle.js (palettes, INK, the icon tables).
// What may stay, and why:
const ALLOW = [
  { file: 'game/js/hud_panel.js', line: /<(path|rect|circle)\b/, why: 'the icon glyphs are SVG path strings with their own shading (icon design, #92 / #114)' },
  { file: 'game/js/hud_panel.js', line: /return `rgba\(\$\{n >> 16\}/, why: 'hexA turns a colour it is handed into rgba' },
];
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, '')).join('\n');
const RENDERERS = ['game/js/mapview.js', 'game/js/hud_panel.js', 'game/js/countrymap.js', 'game/js/regions.js', 'game/js/mapicons.js', 'game/js/missionmapdraw.js', 'game/js/ommelandmap.js', 'game/js/reiskaart.js'];
for (const f of RENDERERS) {
  const loose = [];
  stripComments(src(f)).split('\n').forEach((line, i) => {
    if (!COLOUR_LITERAL.test(line)) return;
    COLOUR_LITERAL.lastIndex = 0;
    if (ALLOW.some((a) => a.file === f && a.line.test(line))) return;
    loose.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
  });
  ok(loose.length === 0, f + ' has no loose colour literals (use mapstyle.js): ' + loose.join(' | '));
}
// every mapstyle name a renderer uses is imported there (node does not run the browser-only code paths: a missing import shows up at runtime only)
for (const f of RENDERERS) {
  const text = stripComments(src(f));
  const imp = /import\s*\{([^}]*)\}\s*from\s*'\.\/mapstyle\.js'/.exec(text);
  const imported = new Set(imp ? imp[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : []);
  const body = text.replace(/import[^;]*;/g, '');
  const missing = Object.keys(mapstyle).filter((name) => !imported.has(name) && new RegExp(`(?<![\\w.])${name}(?![\\w])`).test(body));
  ok(missing.length === 0, f + ' uses mapstyle names it does not import: ' + missing.join());
}
for (const a of ALLOW) ok(a.why && src(a.file).split('\n').some((l) => a.line.test(l)), 'allowlist entry still needed: ' + a.why);
for (const f of ['game/js/mapview.js', 'game/js/hud_panel.js', 'game/js/regions.js', 'game/js/mapicons.js']) ok(/\b(INK|inkA|ICON_RIM)\b/.test(src(f)) && /mapstyle\.js/.test(src(f)), f + ' reads the ink table');

const DAYMAP = { ...MAP_PALETTE };
// the map modules build their colour tables when they load: one that names an ink that is not there throws at import
for (const m of ['missionmapdraw', 'ommelandmap', 'reiskaart']) { let err = ''; try { await import(`../game/js/${m}.js`); } catch (e) { err = String(e); } ok(!err, m + ' loads', err); }
// the rails on the maps read the palette (issue #286): the night palette reaches them
const { drawRailsOnMap } = await import('../game/js/railway.js');
const railCols = (pal) => {
  const cols = [], ctx = { save() {}, restore() {}, setLineDash() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { cols.push(this.strokeStyle); } };
  drawRailsOnMap(ctx, { rails: [{ pts: [[0, 0], [10, 10]] }] }, -5, -5, 20, 20, 3, pal);
  return cols;
};
ok(railCols(MAP_PALETTE).join() === MAP_PALETTE.rail + ',' + MAP_PALETTE.railTie, 'rails draw in the map palette');
ok(railCols(MINI_PALETTE).join() === MINI_PALETTE.rail + ',' + MINI_PALETTE.railTie, 'and in the minimap palette');
applyMapPhase('nacht');
ok(railCols(MAP_PALETTE)[0] === nightPalette(DAYMAP).rail && railCols(MAP_PALETTE)[0] !== '#55524c' && railCols(MINI_PALETTE)[1] !== '#d8d4c8', 'at night the rails follow the night palette');
applyMapPhase('dag');

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
