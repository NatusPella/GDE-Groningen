// Het rijgedrag van de volle tankwagen (vettruck 23-11, game/js/vehicle/heavyload.js): traag optrekken, lange remweg, wijde
// bochten, lang uitrollen, zachte vering die overhelt, de camera verder weg en een lage diesel. Vergelijkt met de bakwagen op
// dezelfde maat, zodat alleen de lading het verschil maakt.
//   node scripts/heavyload_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { TANKWAGEN_RIJGEDRAG: Z, zwareLading, remweg } = await import('../game/js/vehicle/heavyload.js');
const { playerTune, coastDrag, lateralGrip, maxYawRate } = await import('../game/js/vehicle/tuning.js');
const { vehicleCamRig } = await import('../game/js/cammath.js');
const { buildDefsNaMuseum } = await import('../game/js/missions_defs.js');

let bad = 0;
const ok = (name, c, info = '') => { if (!c) { bad++; console.log('FAIL', name, info); } else if (process.argv.includes('-v')) console.log('ok  ', name, info); };

// de tankwagen van M07 zoals de missie hem neerzet, en een bakwagen met precies dezelfde maat en afstelling
const vet = buildDefsNaMuseum({ walk: (x, y) => ({ x, y }), drive: (x, y) => ({ x, y }) }).find((d) => d.label === 'Al het vet van Grunn');
const tankModel = vet.stages.find((s) => s.kind === 'chase').vehicle;
const bakModel = { ...tankModel, tank: false, livery: undefined };
const auto = (model, extra = {}) => ({ model, driver: 'player', speed: 0, angle: 0, ...extra });
const tank = auto(tankModel), bak = auto(bakModel);

ok('alleen een vrachtwagen met tank is zwaar', zwareLading(tankModel) === Z && zwareLading(bakModel) === null && zwareLading({ name: 'van', tank: true }) === null && zwareLading(null) === null);
ok('de factoren liggen vast (bevroren)', Object.isFrozen(Z));
for (const k of ['optrek', 'rem', 'uitrol', 'grip']) ok(`${k} maakt hem zwaarder (0 < f < 1)`, Z[k] > 0 && Z[k] < 1, String(Z[k]));
for (const k of ['vering', 'overhel', 'camera', 'botsmassa']) ok(`${k} is groter dan bij een gewone auto`, Z[k] > 1, String(Z[k]));
ok('de vering is zachter dan die van de bus (1,7)', Z.vering > 1.7);
ok('massa is die van een volle tankwagen (15-30 t)', Z.massa >= 15000 && Z.massa <= 30000, String(Z.massa));

// optrekken en remmen (speler)
const tt = playerTune(tank), tb = playerTune(bak);
ok('zelfde topsnelheid als de bakwagen', tt.top === tb.top, `${tt.top} / ${tb.top}`);
ok('trekt trager op', Math.abs(tt.accel / tb.accel - Z.optrek) < 1e-9, `${tt.accel.toFixed(2)} tegen ${tb.accel.toFixed(2)}`);
const v80 = 80 / 3.6;
const rwT = remweg(v80, tt.brake), rwB = remweg(v80, tb.brake);
ok('remweg uit 80 km/u is minstens 2x die van de bakwagen', rwT >= 2 * rwB, `${rwT.toFixed(1)} m tegen ${rwB.toFixed(1)} m`);
ok('remweg uit 80 km/u tussen 30 en 60 m (een volle tankwagen, droog)', rwT >= 30 && rwT <= 60, rwT.toFixed(1) + ' m');
// 0 naar 50 km/u met de vloer van de speler-acceleratie (vehicle.js: floor 0,2 plus sqrt(headroom)), stap 1/60 s
const naar50 = (tune) => { let s = 0, t = 0; while (s < 50 / 3.6 && t < 60) { const h = Math.max(0, 1 - s / tune.top); s += tune.accel * (0.2 + 0.8 * Math.sqrt(h)) / 60; t += 1 / 60; } return t; };
const t50T = naar50(tt), t50B = naar50(tb);
ok('0-50 km/u duurt langer dan 8 s en langer dan de bakwagen', t50T > 8 && t50T > t50B * 1.6, `${t50T.toFixed(1)} s tegen ${t50B.toFixed(1)} s`);

// uitrollen, bochten
ok('rolt verder uit (minder rolweerstand)', coastDrag(tank, true, 15) < coastDrag(bak, true, 15));
ok('de AI-tankwagen rolt uit als elke AI', coastDrag(tank, false, 15) === coastDrag(bak, false, 15));
ok('minder zijgrip voor de speler', lateralGrip(tankModel, true) < lateralGrip(bakModel, true) * 0.5, `${lateralGrip(tankModel, true)} tegen ${lateralGrip(bakModel, true)}`);
ok('de AI-tankwagen van M07 houdt zijn grip', lateralGrip(tankModel, false) === lateralGrip(bakModel, false));
const yaw = (v) => maxYawRate({ ...v, speed: 20, gripK: 1 });
const straal = 20 / yaw(tank);
ok('bij 72 km/u een wijde bocht (straal > 35 m)', straal > 35 && yaw(tank) < yaw(bak), straal.toFixed(1) + ' m');

// camera, vering, motor
ok('de volgcamera staat verder weg', vehicleCamRig(tank).scale > vehicleCamRig(bak).scale * 1.1, `${vehicleCamRig(tank).scale.toFixed(2)} tegen ${vehicleCamRig(bak).scale.toFixed(2)}`);
const vsrc = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
ok('vehicle.js leest vering, overhellen en botsmassa uit heavyload', /zwaar\.vering/.test(vsrc) && /zwaar\.overhel/.test(vsrc) && /zwaar\.botsmassa/.test(vsrc));
ok('de grens van het overhellen blijft binnen de klem van de vering (0,14)', 0.085 * Z.overhel <= 0.14, String(0.085 * Z.overhel));
const asrc = fs.readFileSync(new URL('../game/js/audio.js', import.meta.url), 'utf8');
ok('een vrachtwagen klinkt als de lage diesel (motorsoort 2)', /if \(name === 'truck'\) return 2;/.test(asrc));

// de winkelversie rijdt op hetzelfde model, met dezelfde belettering
const tsrc = fs.readFileSync(new URL('../game/js/shopdata.js', import.meta.url), 'utf8');
ok('de winkel-tankwagen heeft tank en belettering', /tankwagen:.*tank: true, livery: 'usmemvet'/.test(tsrc));

console.log(bad ? `heavyload_test: ${bad} mislukt` : 'heavyload_test: ok');
process.exit(bad ? 1 : 0);
