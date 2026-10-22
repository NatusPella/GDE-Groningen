// Map icon rules (game/js/mapicons.js): categories by zoom, size by zoom, and
// the thinning where icons would overlap. Run: node scripts/mapicons_test.mjs
import { mapCategory, mapKindVisible, mapIconScale, placeIcons, mapPriority, mapRimColor, miniIconScale, iconGapPx, MIN_ICON_PX, ICON_UNITS, hexContrast, haloRim, haloOutline, HALO_DARK, HALO_LIGHT, GRAPHIC_CONTRAST, FLAT_FILL, FLAT_INK, mapFillColor, BADGE_SHAPE, badgeShape, badgeGlyphColor, shadeHex, stateLook, mapIconAlpha, GLYPH_LIGHT } from '../game/js/mapicons.js';
import { drawMapGlyph, MAP_GLYPH_KINDS } from '../game/js/mapglyphs.js';
import { MAP_PALETTE, MINI_PALETTE, nightPalette, toRgba } from '../game/js/mapstyle.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

// every kind the map draws has a category
const KINDS = ['player', 'userWaypoint', 'missionIdle', 'missionActive', 'mi-3', 'ma-3', 'home', 'homeGarage', 'own', 'station', 'hospital', 'politiebureau', 'garage',
  'sj-taxi', 'sj-target', 'shop-snack', 'pigeon', 'heli', 'padel', 'act-skate', 'pg-jelle', 'dorp', 'companion', 'eierbalTip', 'horeca', 'flitspaal', 'cash', 'policeFoot', 'waypoint'];
for (const k of KINDS) ok(mapCategory(k) && mapPriority(k) > 0, 'category for ' + k);

// zoomed out only the important ones
ok(mapKindVisible('player', 0.3) && mapKindVisible('ma-1', 0.3) && mapKindVisible('station', 0.3) && mapKindVisible('home', 0.3), 'goals, you, stations and home at every zoom');
ok(!mapKindVisible('shop-snack', 1) && mapKindVisible('shop-snack', 2.5), 'shops from zoom 2');
ok(!mapKindVisible('horeca', 4) && mapKindVisible('horeca', 7), 'food only close up (zoom 6)');
ok(!mapKindVisible('flitspaal', 2), 'speed cameras only close up');
ok(mapKindVisible('hospital', 1) && !mapKindVisible('hospital', 0.5), 'hospital and police from zoom 0.9');

// icon size grows with zoom, within bounds, and is much bigger than the old 1.25
ok(mapIconScale(0.3) >= 2.1 && mapIconScale(12) <= 3.2 && mapIconScale(12) > mapIconScale(1), 'scale grows with zoom, bounded');

// collisions: the higher priority stays, a kept category never drops
const placed = placeIcons([
  { kind: 'horeca', sx: 100, sy: 100 }, { kind: 'shop-snack', sx: 104, sy: 102 }, { kind: 'hospital', sx: 300, sy: 300 },
  { kind: 'flitspaal', sx: 301, sy: 301 }, { kind: 'ma-1', sx: 500, sy: 500 }, { kind: 'home', sx: 502, sy: 501 },
], 22);
const has = (k) => placed.some((p) => p.kind === k);
ok(has('shop-snack') && !has('horeca'), 'a shop beats food');
ok(has('hospital') && !has('flitspaal'), 'a hospital beats a speed camera');
ok(has('ma-1') && has('home'), 'goal and home are never dropped');
ok(mapPriority(placed[placed.length - 1].kind) >= mapPriority(placed[0].kind), 'drawn last = highest priority');

// minimum sizes (#114): a floor in HUD px at every zoom, the minimap bigger in proportion
for (const z of [0.1, 0.3, 1, 4, 12, 60]) ok(mapIconScale(z) * ICON_UNITS >= MIN_ICON_PX, 'full map icon above the floor at zoom ' + z);
for (const size of [150, 190, 250, 320]) {
  ok(miniIconScale(size) * ICON_UNITS >= MIN_ICON_PX - 0.5, 'minimap icon above the floor at ' + size);
  ok(miniIconScale(size, true) > miniIconScale(size), 'goals a little bigger than places at ' + size);
}
ok(miniIconScale(250) * ICON_UNITS / 250 > mapIconScale(1) * ICON_UNITS / 900, 'minimap icons are bigger in proportion than on the full map (a 900 px view)');
ok(miniIconScale(0) * ICON_UNITS >= MIN_ICON_PX - 0.5, 'a missing size still gets the floor');
for (const sc of [miniIconScale(250), mapIconScale(1), mapIconScale(12)]) ok(iconGapPx(sc) > ICON_UNITS * sc, 'icons never closer than one icon width');
// no overlap: with the real gap, no two placed icons are closer than one icon
{
  const sc = miniIconScale(250), gap = iconGapPx(sc), items = [];
  for (let i = 0; i < 60; i++) items.push({ kind: ['shop-snack', 'hospital', 'horeca', 'ma-1'][i % 4], sx: (i * 37) % 200, sy: (i * 53) % 200 });
  const out = placeIcons(items, gap);
  let close = 0;
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    if (mapCategory(out[i].kind) === 'goal' || mapCategory(out[j].kind) === 'goal') continue;
    if (Math.hypot(out[i].sx - out[j].sx, out[i].sy - out[j].sy) < gap) close++;
  }
  ok(close === 0, 'placed icons keep their distance (' + close + ' too close)');
}
// the rim is in the category colour
ok(mapRimColor('hospital') !== mapRimColor('politiebureau') && mapRimColor('garage') !== mapRimColor('station'), 'rims differ per category');

// contrast guarantee (#114): on every ground of every palette (day, night, big map,
// minimap, sea) the outer rings reach 3:1, and the category rim reads on the disc
const flat = (c, under) => { const [r, g, b, a] = toRgba(c, 255); const u = toRgba(under, 255); const k = a / 255; return '#' + [r, g, b].map((v, i) => Math.round(v * k + u[i] * (1 - k)).toString(16).padStart(2, '0')).join(''); };
const GROUND_KEYS = ['meadow', 'park', 'ditch', 'water', 'waterEdge', 'road', 'major', 'minor', 'cycle', 'foot', 'building', 'church', 'tree', 'village', 'allot', 'sports', 'business', 'rail', 'turbine', 'forest'];
let worst = Infinity, worstAt = '';
for (const [pname, pal] of [['map', MAP_PALETTE], ['mini', MINI_PALETTE], ['map-nacht', nightPalette(MAP_PALETTE)], ['mini-nacht', nightPalette(MINI_PALETTE)]]) {
  const grounds = GROUND_KEYS.map((k) => [k, flat(pal[k], pal.meadow)]).concat((pal.buildings || []).map((c, i) => ['buildings' + i, c]));
  for (const [k, g] of grounds) {
    const c = hexContrast(haloOutline(g), g);
    // the dark outline and the cream ring are both always drawn: the better one carries it
    const both = Math.max(hexContrast(HALO_LIGHT, g), hexContrast(HALO_DARK, g));
    if (both < worst) { worst = both; worstAt = pname + '.' + k; }
    ok(c >= GRAPHIC_CONTRAST && both >= GRAPHIC_CONTRAST, `ring on ${pname}.${k} ${g} has ${c.toFixed(2)}:1`);
  }
}
ok(worst >= GRAPHIC_CONTRAST, 'worst ground ' + worstAt + ' ' + worst.toFixed(2));
for (const kind of ['hospital', 'politiebureau', 'garage', 'station', 'shop-a', 'horeca', 'own', 'dorp', 'sj-a', 'act-x', 'flitspaal', 'tip']) {
  ok(hexContrast(haloRim(kind), HALO_DARK) >= GRAPHIC_CONTRAST, 'rim of ' + kind + ' reads on the disc');
}

// one icon, one colour: the fill of every category against the dark ink/outline, and on every ground
// of every palette one of fill, outline and the thin light line outside it reaches 3:1
const GROUNDS = [];
for (const [pname, pal] of [['map', MAP_PALETTE], ['mini', MINI_PALETTE], ['map-nacht', nightPalette(MAP_PALETTE)], ['mini-nacht', nightPalette(MINI_PALETTE)]]) {
  for (const k of GROUND_KEYS) GROUNDS.push([pname + '.' + k, flat(pal[k], pal.meadow)]);
  for (const [i, c] of (pal.buildings || []).entries()) GROUNDS.push([pname + '.buildings' + i, c]);
}
for (const [cat, fill] of Object.entries(FLAT_FILL)) {
  ok(hexContrast(fill, FLAT_INK) >= GRAPHIC_CONTRAST, 'fill of ' + cat + ' against its outline ' + hexContrast(fill, FLAT_INK).toFixed(2));
  for (const [g, c] of GROUNDS) ok(Math.max(hexContrast(fill, c), hexContrast(FLAT_INK, c), hexContrast(HALO_LIGHT, c)) >= GRAPHIC_CONTRAST, cat + ' on ' + g);
}
ok(new Set(['zorg', 'politiebureau', 'garage', 'station', 'job', 'shop', 'fun', 'horeca', 'ommeland'].map((c) => FLAT_FILL[c])).size === 9, 'categories have their own colour');
ok(mapFillColor('hospital') === FLAT_FILL.zorg && mapFillColor('shop-bakker') === FLAT_FILL.shop && mapFillColor('player') === null && mapFillColor('missionActive') === null && mapFillColor('police') === null, 'fill follows the category; you, goals, missions and police keep their look');
// the badge (#180): a shape and colour per category, a readable glyph, states and the zoom fade
for (const cat of Object.keys(FLAT_FILL)) ok(BADGE_SHAPE[cat], 'a badge shape for ' + cat);
{
  const pairs = new Set(Object.keys(FLAT_FILL).filter((c) => !['tip', 'other'].includes(c)).map((c) => BADGE_SHAPE[c] + FLAT_FILL[c]));
  ok(pairs.size === 10, 'every main category has its own shape and colour');
  ok(new Set(['zorg', 'politiebureau', 'garage', 'station', 'job', 'shop'].map((c) => BADGE_SHAPE[c])).size === 6, 'the six main places each have their own silhouette');
}
for (const [cat, fill] of Object.entries(FLAT_FILL)) {
  const g = badgeGlyphColor(fill);
  ok(g === GLYPH_LIGHT || g === FLAT_INK, 'glyph colour of ' + cat + ' is cream or ink');
  ok(hexContrast(g, fill) >= GRAPHIC_CONTRAST, 'glyph of ' + cat + ' on its fill ' + hexContrast(g, fill).toFixed(2));
}
ok(badgeShape('hospital') === 'circle' && badgeShape('politiebureau') === 'shield' && badgeShape('shop-snack') === 'tile' && badgeShape('garage') === 'hex' && badgeShape('station') === 'squircle', 'shape follows the category');
ok(shadeHex('#808080', 0) === '#808080' && shadeHex('#808080', 1) === '#ffffff' && shadeHex('#808080', -1) === '#000000', 'shadeHex ends');
ok(stateLook('vergrendeld').gray && stateLook('vergrendeld').alpha < stateLook('ontdekt').alpha && stateLook('ontdekt').alpha < stateLook('aanwezig').alpha && !stateLook().gray, 'states: locked < discovered < present');
ok(mapIconAlpha('player', 0.1) === 1 && mapIconAlpha('hospital', 0.9) < 1 && mapIconAlpha('hospital', 5) === 1 && mapIconAlpha('shop-a', 2) >= 0.8, 'important icons are solid, the rest fade in to 1 and never below 0.8');
// Garages are easy to find (tester feedback on 0.38.0, the bigger icons): they show from zoom 1.1, outrank shops and fun,
// and no icon is ever smaller than MIN_ICON_PX (21 px). Changes to the map style keep to this.
ok(mapKindVisible('garage', 1.1) && !mapKindVisible('garage', 1.0), 'garages show from zoom 1.1');
ok(mapPriority('garage') > mapPriority('shop') && mapPriority('garage') > mapPriority('fun'), 'a garage outranks shops and fun on the map');
ok(MIN_ICON_PX >= 21 && mapIconScale(1) * ICON_UNITS >= 21 && miniIconScale(150) * ICON_UNITS >= 21, 'icons keep their size (21 px at least, full map and minimap)');

// The bold glyphs (#383): a kind without its own readable drawing gets a cream silhouette, drawn on any 2D context
const calls = [];
const stub = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); }), set: (t, k, v) => { t[k] = v; return true; } });
ok(MAP_GLYPH_KINDS.length >= 10 && MAP_GLYPH_KINDS.every((k) => mapCategory(k) && mapFillColor(k)), 'every bold glyph kind has a category and a badge colour');
ok(MAP_GLYPH_KINDS.every((k) => drawMapGlyph(stub, k, 1) === true) && calls.includes('fill'), 'every bold glyph draws');
ok(drawMapGlyph(stub, 'hospital', 1) === false && drawMapGlyph(stub, 'act-kermis', 1) === false, 'other kinds keep their own drawing');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
