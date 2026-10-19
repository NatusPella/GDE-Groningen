// roadgraph.js: een groot los wegenstuk (een dorp) ver van het hoofdnet hangt er toch aan (#223);
// een klein los stukje op grote afstand blijft er bewust buiten. Zuiver, zonder wereldbestanden.
import { setRoadNet, snapRoad, roadGraphStats } from '../game/js/roadgraph.js';

let bad = 0;
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + extra}`); };
const line = (x0, y0, n, step) => ({ pts: Array.from({ length: n }, (_, i) => [x0 + i * step, y0]), kind: 5, w: 6, oneway: 0, bridge: 0 });

const rows = [line(0, 0, 200, 50)];                       // het hoofdnet
rows.push(line(-4000, 3000, 160, 30));                   // één stuk van 160 knopen, 3,6 km verderop
rows.push(line(-4000, 9000, 5, 30));                     // klein stukje, ver weg
setRoadNet(rows);
const near = (x, y) => snapRoad(x, y, 5);
check('het hoofdnet snapt', !!near(500, 0));
check('het grote stuk 3,6 km weg hangt aan het net', !!near(-3800, 3000), JSON.stringify(roadGraphStats()));
check('het kleine verre stukje blijft los', !near(-3950, 9000));
console.log(bad ? `roadgraph_stitch: ${bad} FAILED` : 'roadgraph_stitch: all passed');
process.exit(bad ? 1 : 0);
