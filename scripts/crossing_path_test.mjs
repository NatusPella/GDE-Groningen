// Het ritpad van de audits (ringcheck.js crossingPath): node scripts/crossing_path_test.mjs
// Een klein kaartje: een doorgaande weg, een weg die aan beide kanten doorloopt, en een doodlopend straatje dat
// alleen op een voetpad uitkomt. Het pad loopt 25 m door op de weg die voorgaat (de aansluiting wordt dus
// meegereden), maar niet een doodlopend straatje in: daar zou de auto midden in een keerplein moeten keren en
// de audit meet dan een auto die van de rijbaan raakt (Bekemaheerd, #509).
import './node3d.mjs';

const RC = await import('../game/js/ringcheck.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const road = (pts, o = {}) => ({ pts, width: 6.5, cat: 'normal', name: 'Proef', ...o });
const main = road([[-60, 0], [0, 0], [60, 0]]);
const east = road([[60, 0], [90, 0]]);
const farEast = road([[90, 0], [120, 0]]);
// (het doodlopende straatje eindigt op de aansluiting en komt daarna terug: het is met de klok mee getekend
//  zodat het bij het westelijke eind van de hoofdweg aansluit)
const dead = road([[-90, -30], [-90, 0], [-60, 0]], { name: 'Doodlopend' });
const foot = { pts: [[-90, -30], [-90, -60]], cat: 'foot', width: 1.8 };
const roads = [main, east, farEast, dead, foot];
const map = {
  roads, terrainOn: false,
  roadsNear: (x, y, r) => roads.filter((q) => q.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) <= r + 1)),
};

const path = RC.crossingPath(map, { road: main, s0: 0, s1: 120 }, 25);
ok(path.length > 100, 'het pad volgt de weg', String(path.length));
// het doodlopende straatje in (het zuiden) komt niet in het pad
ok(!path.some((q) => q[1] < -2), 'een doodlopend straatje wordt niet ingereden (#509)', JSON.stringify(path.filter((q) => q[1] < -2).slice(0, 2)));
// de doorgaande weg aan de oostkant wordt 25 m meegeereden
const last = path[path.length - 1];
ok(last[0] > 80 && Math.abs(last[1]) < 0.5, 'de weg die voorgaat wordt meegeereden', `${last[0].toFixed(1)}, ${last[1].toFixed(1)}`);
// het westelijke eind begint op de hoofdweg zelf (geen 25 m dood spoor erbij)
const first = path[0];
ok(first[0] > -62 && first[0] < -58 && Math.abs(first[1]) < 0.5, 'het pad begint op de weg, niet in de doodlopende tak', `${first[0].toFixed(1)}, ${first[1].toFixed(1)}`);

console.log(`${n - fails}/${n} crossing path checks passed`);
process.exit(fails ? 1 : 0);
