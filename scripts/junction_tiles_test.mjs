// De kruispunten van de gestreamde provincietegels (#469): de tegelbouw schrijft ze als
// JUNCTIONS-rijen, en het spel moet ze in het model opnemen. Zonder deze test merkt niemand
// dat de provincie geen voorrang en geen stoplijnen heeft: de stad werkt immers gewoon.
import assert from 'node:assert';
import { junctionModel, junctionArm } from '../game/js/junctions.js';

let n = 0;
const ok = (v, wat) => { assert.ok(v, wat); n++; };

const road = { cat: 'residential', width: 6, pts: [[4, 0], [10, 0]] };
const side = { cat: 'residential', width: 5, pts: [[4, 6], [4, 0], [4, -6]] };

// Een kaart zoals TileWorld hem heeft: geen stad-roads, wel de wegen van de tegel en de rijen.
const map = {
  roads: [],
  meta: {},
  _res: { roads: new Map([[7, { obj: road }], [8, { obj: side }]]) },
  junctionRows: new Map([
    ['p0_0', [{ k: '40,0', p: [[4, 0]], c: 'equal', a: [[7, 0, 1, 3, 4.5, 1], [8, 1, 1, 4, 3.2, 1]] }]]
  ])
};

const model = junctionModel(map);
ok(model.has('40,0'), 'de provincietegel levert een knooppunt aan het model');
const node = model.get('40,0');
ok(node.control === 'equal', 'de controle komt uit de rij');
ok(node.arms.length === 2, 'beide armen staan erin, met de weg uit de tegel');

const arm = junctionArm(map, road, 0, -1);
ok(arm && arm.rule === 'yield', 'de arm met regel yield is terug te vinden (RULES[3])');
ok(arm && arm.stop === 4.5, 'de stoplijn uit de rij staat op de arm');
ok(arm && arm.entry !== false, 'de arm houdt zijn enters-vlag');

// Een tweede tegel erbij, en dan weer weg: het model volgt de geladen tegels.
map.junctionRows.set('p1_0', [{ k: '90,90', p: [[9, 9]], c: 'signals', a: [[7, 0, -1, 1, 5, 1]] }]);
map.junctionVer = (map.junctionVer || 0) + 1;
ok(junctionModel(map).has('90,90'), 'een nieuwe tegel komt erbij');
map.junctionRows.delete('p1_0');
map.junctionVer++;
ok(!junctionModel(map).has('90,90'), 'en verdwijnt weer als de tegel uitgaat');

// Een knooppunt zonder bruikbare arm levert niets op in plaats van een half knooppunt.
map.junctionRows.set('p2_0', [{ k: '10,10', p: [[1, 1]], c: 'equal', a: [[999, 0, 1, 2, 4, 1]] }]);
map.junctionVer++;
ok(!junctionModel(map).has('10,10'), 'een arm met een onbekende weg wordt overgeslagen');

console.log(`junction_tiles_test ok (${n} checks)`);
