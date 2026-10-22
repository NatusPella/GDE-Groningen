// De boekhouding van TileWorld (welke tegels een object vasthouden) laat een object pas los als de laatste tegel die het
// vasthoudt weg is (#314, geheugen: één sleutel in plaats van een Set per object). Een weg over een tegelrand ligt in twee
// tegels; een gebouw in de gepinde set en in een gestreamde tegel blijft staan als de gestreamde tegel gaat.
//   node scripts/tileworld_resident_test.mjs
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const road = (gid, x0, x1, y) => ({ gid, pts: [[x0, y], [x1, y]], width: 6, cat: 'minor', type: 'residential' });
const bld = (gid, x, y) => ({ gid, pts: sq(x, y, 10), type: 'house' });
const tile = (i, j, sections) => ({ i, j, sections });
const sec = (type, rows) => ({ type, rows });
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 1 }, meta: {} } }] };
const pinned = tile(0, 0, [sec(G.SECTION.BUILDINGS, [bld(0, 500, 500)])]);
const tw = TileWorld.fromTiles(global, [pinned]);
const roadsAt = (x, y) => tw.roadsNear(x, y, 3).filter((r) => r.type === 'residential').length;

// een weg over de rand van twee gestreamde tegels
tw.addTile(tile(1, 0, [sec(G.SECTION.ROADS, [road(7, 1900, 2100, 50)])]), '2000_0');
tw.addTile(tile(2, 0, [sec(G.SECTION.ROADS, [road(7, 1900, 2100, 50)])]), '3000_0');
ok(roadsAt(2000, 50) === 1, 'de weg over de rand staat één keer in het raster', String(roadsAt(2000, 50)));
tw.dropTile('1,0');
ok(roadsAt(2000, 50) === 1, 'tegel 1 weg: de weg blijft, tegel 2 houdt hem vast', String(roadsAt(2000, 50)));
ok(tw.dropTile('1,0') === false, 'dezelfde tegel twee keer wegdoen doet niets');
ok(roadsAt(2000, 50) === 1, 'een tweede dropTile haalt de weg niet weg');
tw.dropTile('2,0');
ok(roadsAt(2000, 50) === 0, 'tegel 2 ook weg: de weg is weg', String(roadsAt(2000, 50)));
ok(!tw._res.roads.has(7), 'het register laat de weg los');

// tegel 2 weer erbij, dan tegel 1: de volgorde maakt niet uit
tw.addTile(tile(2, 0, [sec(G.SECTION.ROADS, [road(7, 1900, 2100, 50)])]), '3000_0');
tw.addTile(tile(1, 0, [sec(G.SECTION.ROADS, [road(7, 1900, 2100, 50)])]), '2000_0');
tw.dropTile('2,0');
ok(roadsAt(2000, 50) === 1, 'omgekeerde volgorde: de eerste tegel houdt de weg vast', String(roadsAt(2000, 50)));
tw.dropTile('1,0');
ok(roadsAt(2000, 50) === 0, 'omgekeerde volgorde: beide weg, de weg is weg');

// drie tegels, het midden eerst
for (const [i, k] of [[1, '2000_0'], [2, '3000_0'], [3, '4000_0']]) tw.addTile(tile(i, 0, [sec(G.SECTION.ROADS, [road(9, 1900, 4100, 80)])]), k);
tw.dropTile('2,0');
ok(roadsAt(3000, 80) === 1, 'drie tegels, het midden weg: de weg blijft');
tw.dropTile('1,0');
ok(roadsAt(3000, 80) === 1, 'drie tegels, nog één over: de weg blijft');
tw.dropTile('3,0');
ok(roadsAt(3000, 80) === 0, 'drie tegels, alle weg: de weg is weg');

// het gebouw van de gepinde tegel blijft staan als een gestreamde tegel hetzelfde gebouw ook had en gaat
ok(tw.buildingsNear(505, 505, 2).length === 1, 'het gepinde gebouw staat in het raster');
tw.addTile(tile(5, 5, [sec(G.SECTION.BUILDINGS, [bld(0, 500, 500)])]), '5000_5000');
tw.dropTile('5,5');
ok(tw.buildingsNear(505, 505, 2).length === 1, 'het gepinde gebouw blijft na het wegdoen van de gestreamde tegel');
console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
