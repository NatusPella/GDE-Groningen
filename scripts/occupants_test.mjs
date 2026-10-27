// Bezetting van auto's (#49): occupants.js.   node scripts/occupants_test.mjs
// De laatste checks gaan over de stoelen van het vliegtuig (#502): die komen uit seating3d.js, dat
// three.js nodig heeft. node3d.mjs zet de CDN-URL's op de gevendorde kopie (cd desktop && npm run stage).
import './node3d.mjs';
import * as O from '../game/js/occupants.js';
const { vehicleSeat, vehicleSeatAt } = await import('../game/js/seating3d.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const car = (id, extra = {}) => ({ id, model: { name: 'sedan' }, road: {}, ...extra });
const parked = (x, y, extra = {}) => ({ id: 1000 + x, model: { name: 'sedan' }, parked: true, parkSlot: { x, y }, ...extra });

// determinisme
const a = O.occupancyOf(car(7)), b = O.occupancyOf(car(7));
check('zelfde auto, zelfde bezetting', JSON.stringify(a) === JSON.stringify(b));
check('ander wereldzaad kan anders uitpakken', [1, 2, 3, 4, 5, 6].some((s) => JSON.stringify(O.occupancyOf(car(7), s)) !== JSON.stringify(a)));
check('parkeervak bepaalt de sleutel, niet het id', O.occupancyOf(parked(12.3, 4.5)).key === O.occupancyOf({ ...parked(12.3, 4.5), id: 5 }).key);

// wie zit waar
check('verkeersauto heeft bestuurder', O.occupancyOf(car(1)).driver === 'ai');
for (const extra of [{ isBus: true }, { isBoat: true }, { isBike: true }, { isScooter: true }, { isTram: true }]) {
  check('geen figuren in ' + Object.keys(extra)[0], O.occupancyOf(car(1, extra)).driver === null || extra.isBus);
}
check('bus: geen auto-figuren', O.occupancyOf(car(1, { isBus: true })).passengers.length === 0);
check('wrak is leeg', O.occupancyOf(car(1, { wrecked: true })).driver === null);
check('speler zit zelf: geen NPC', O.occupancyOf(car(1, { driver: 'player' })).driver === null);
check('geparkeerd zonder bezetter heeft geen bestuurder', (() => { for (let i = 0; i < 40; i++) if (O.occupancyOf(parked(i, 3)).driver !== 'waiting') return true; return false; })());

// kansen kloppen ongeveer
let waiting = 0, withPass = 0, taxiPass = 0;
for (let i = 0; i < 2000; i++) {
  if (O.occupancyOf(parked(i * 3.1, i * 1.7)).driver === 'waiting') waiting++;
  if (O.occupancyOf(car(i)).passengers.length) withPass++;
  if (O.occupancyOf(car(i, { isTaxi: true })).passengers.length) taxiPass++;
}
check('ongeveer 8% wacht in een geparkeerde auto', waiting > 100 && waiting < 230, waiting);
check('ongeveer 22% heeft een bijrijder', withPass > 330 && withPass < 560, withPass);
check('taxi vaker met passagier dan sedan', taxiPass > withPass);

// reacties
const wait = { key: 5, kind: 'sedan', driver: 'waiting', passengers: [] };
const drv = { key: 9, kind: 'sedan', driver: 'ai', passengers: [{ slot: 'front', seed: 1 }, { slot: 'rear', seed: 2 }] };
check('wachtende blijft zitten bij zacht gebonk', O.reactSeated(wait, { kind: 'crash', strength: 0.2, dist: 3 }).driver.act === 'stay');
check('wachtende stapt uit bij harde klap vlakbij', O.reactSeated(wait, { kind: 'crash', strength: 0.8, dist: 3 }).driver.act === 'exit');
check('wachtende blijft zitten bij harde klap ver weg', O.reactSeated(wait, { kind: 'crash', strength: 0.9, dist: 40 }).driver.act === 'stay');
check('schot dichtbij: wegduiken, niet uitstappen', O.reactSeated(wait, { kind: 'shot', dist: 10 }).driver.act === 'duck');
check('bij diefstal wordt de bestuurder eruit getrokken', O.reactSeated(drv, { kind: 'theft' }).driver.act === 'pulled');
const ex = O.exitOrder(O.reactSeated(drv, { kind: 'theft' }));
check('diefstal: bestuurder eerst, dan de passagiers', ex[0].who === 'driver' && ex.length === 3 && ex[1].delay >= 0.3, JSON.stringify(ex));
check('passagiers rennen weg bij diefstal', ex.slice(1).every((e) => e.act === 'flee'));
check('bij brand stappen allen uit', O.exitOrder(O.reactSeated(drv, { kind: 'fire' })).length === 3);
check('claxon vlakbij haalt wachtende eruit, ver weg niet', O.reactSeated(wait, { kind: 'honk', dist: 3 }).driver.act === 'exit' && O.reactSeated(wait, { kind: 'honk', dist: 30 }).driver.act === 'stay');
check('reactie deterministisch', JSON.stringify(O.reactSeated(drv, { kind: 'theft' })) === JSON.stringify(O.reactSeated(drv, { kind: 'theft' })));

// budget per tegel
const items = [];
for (let i = 0; i < 60; i++) {
  const v = car(i + 1);
  const occ = O.occupancyOf(v, 0);
  occ.passengers = [{ slot: 'front', seed: 1 }, { slot: 'rear', seed: 2 }];
  items.push({ id: v.id, x: (i % 5) * 10, y: 0, occ }); // alles in één tegel
}
const r = O.budgetOccupants(items);
const perTile = [...r.occupancy.values()].reduce((s, o) => s + O.extrasCount(o), 0);
check('één tegel blijft binnen het budget', perTile <= O.OCCUPANT_BUDGET.perTile, perTile);
check('bestuurders blijven bij bijrijder-korting', [...r.occupancy.values()].every((o) => o.driver === 'ai'));
const rev = O.budgetOccupants(items.slice().reverse());
check('budget hangt niet van de volgorde af', [...r.occupancy].every(([id, o]) => JSON.stringify(o) === JSON.stringify(rev.occupancy.get(id))));
const spread = items.map((it, i) => ({ ...it, x: i * 300 }));
const rs = O.budgetOccupants(spread);
check('wereldbreed budget', rs.total <= O.OCCUPANT_BUDGET.total, rs.total);
check('geen negatieve tellingen en altijd een plan', [...rs.occupancy.values()].every((o) => o.passengers.length >= 0));

// --- het vliegtuig (#502): de piloot en de passagier zitten in de romp, niet ernaast op de vleugel ----------
// De romp van plane3d.js is 6,8 x 1,3 x 1,3 op y 1,45: 1,3 breed, vloer 0,8 en dak 2,1. PLANE_MODEL.wid
// (planeflight.js) is 10,6 en dat is de spanwijdte; die mag hier dus nooit als rompbreedte gelden.
const kist = () => ({ id: 42, model: { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' }, isPlane: true });
const inRomp = (s) => Math.abs(s.z) < 0.65 && s.y > 0.8 && s.y < 2.1;
const piloot = vehicleSeatAt(kist(), 0), vliegpassagier = vehicleSeatAt(kist(), 1);
check('vliegtuig: de piloot zit op de hartlijn van de romp', inRomp(piloot) && Math.abs(piloot.x + 0.1) < 0.15, JSON.stringify([piloot.x, piloot.y, piloot.z]));
check('vliegtuig: de passagier zit achter de piloot in dezelfde romp', inRomp(vliegpassagier) && vliegpassagier.x < piloot.x - 0.4, JSON.stringify([vliegpassagier.x, vliegpassagier.y, vliegpassagier.z]));
check('vliegtuig: de piloot houdt de handen aan het stuur', piloot.pose && piloot.pose.arms === 'wheel', String(piloot.pose && piloot.pose.arms));
// de oude auto-uitkomst blijft precies zoals hij was: een hatch van 4 m en 1,7 breed, links voorin op 0,38
const hatch = vehicleSeat({ id: 7, model: { name: 'hatch', len: 4, wid: 1.7 } }, true);
check('auto ongewijzigd: de hatchstoel blijft links voorin op 0,38', hatch.x === -4 / 2 * 0.06 && hatch.z === -1.7 / 2 * 0.34 && hatch.y === 0.38 && hatch.pose.arms === 'wheel', JSON.stringify([hatch.x, hatch.y, hatch.z]));
console.log(bad ? `${bad}/${n} FAIL` : `occupants_test ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
