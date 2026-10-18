// The shared map style (game/js/mapstyle.js): both palettes complete, zoom
// rules, and the three renderers reading it. Run: node scripts/mapstyle_test.mjs
import fs from 'node:fs';
import { mapPhase, applyMapPhase, currentMapPhase, nightPalette, shade, miniRoadStyle, MAP_PALETTE, MINI_PALETTE, ROAD_ORDER, ROAD_WIDTH_PX, ZOOM, layersAtZoom, roadWidthPx, roadColor, seaStyle, toRgba, baseFilter } from '../game/js/mapstyle.js';

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

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
