// De metgezel stapt in via de bijrijdersdeur, niet door de carrosserie (video-QA 23-11, bevinding 1):
// het instappunt ligt buiten de botsvorm van de auto en aan de bijrijderskant.
import './node3d.mjs';
const { passengerDoorPoint } = await import('../game/js/companion.js');
const { pushCircleOutOfVehicle } = await import('../game/js/vehicle.js');
const { instapKant } = await import('../game/js/vehicledoors.js');

let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'ok ' : 'FOUT'}  ${m}`); if (!c) fails++; };
const model = { name: 'hatch', len: 3.8, wid: 1.7 };
for (const angle of [0, 0.7, Math.PI / 2, 2.4, -1.1]) {
  const v = { x: 10, y: -5, angle, model, halfLen: model.len / 2, halfWid: model.wid / 2 };
  const p = passengerDoorPoint(v);
  ok(p && Number.isFinite(p.x) && Number.isFinite(p.y), `hoek ${angle}: er is een instappunt`);
  ok(p && !pushCircleOutOfVehicle(p.x, p.y, 0.35, v), `hoek ${angle}: de metgezel op het instappunt staat niet in de auto`);
  ok(p && instapKant(v, p.x, p.y) === 1, `hoek ${angle}: het punt ligt aan de bijrijderskant`);
}
ok(passengerDoorPoint({ x: 0, y: 0, angle: 0, isBike: true, model: { name: 'bike', len: 1.8, wid: 0.6 } }) === null, 'een fiets heeft geen deur: geen instappunt (oude weg)');
ok(passengerDoorPoint(null) === null, 'geen voertuig: null');
console.log(fails ? `companion_instap_test: ${fails} fout` : 'companion_instap_test: ok');
process.exit(fails ? 1 : 0);
