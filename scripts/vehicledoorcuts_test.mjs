// Deurnaden in de carrosserie (vehicledoorcuts.js): elk voertuig met openende deuren definieert een naad om elk deurpaneel
// en die naad zit echt in de gebouwde, gedeelde romp. Bussen, trams en treinen tekenen hun deuren zelf (bewust uitgezonderd).
//   node scripts/vehicledoorcuts_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

await import('three');
await import('../game/js/player.js');
const { DEUR_DEFS, doorsFor } = await import('../game/js/vehicledoors.js');
const { naadStroken, deurNaden, NADEN_MODELLEN } = await import('../game/js/vehicledoorcuts.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// 1. pure regel: elke deur heeft vier naden (en een handvat als hij scharniert), een laadklep een omlijsting
const TEKEN_ZELF = ['bus', 'midibus', 'tram', 'train'];
for (const [naam, defs] of Object.entries(DEUR_DEFS)) {
  if (TEKEN_ZELF.includes(naam)) { check(naam + ': tekent zijn deuren zelf, geen romp-naden', naadStroken(naam, 5, 1).length === 0); continue; }
  check(naam + ': staat in NADEN_MODELLEN', NADEN_MODELLEN.includes(naam));
  for (const d of defs) {
    if (d.soort === 'kap' || d.soort === 'klep') continue; // horizontaal plaatwerk: de naad ligt in het dak, geen zijdeur
    const s = deurNaden(d, 5, 1);
    const naden = s.filter((x) => x.soort === 'naad');
    check(`${naam}.${d.id}: minstens vier naden`, naden.length >= 4, String(naden.length));
    if (d.soort === 'scharnier' || d.soort === 'achterscharnier') check(`${naam}.${d.id}: handvat`, s.some((x) => x.soort === 'handvat'));
    if (d.soort !== 'achterdeur') {
      // de naden omlijsten het paneel: links, rechts, boven en onder van x +- w/2 en y0 .. y0 + h
      const xs = naden.map((x) => x.x), ys = naden.map((x) => x.y);
      check(`${naam}.${d.id}: omlijst het paneel`, Math.min(...xs) <= d.x * 5 - d.w / 2 + 1e-6 && Math.max(...xs) >= d.x * 5 + d.w / 2 - 1e-6 && Math.min(...ys) <= d.y0 + 1e-6 && Math.max(...ys) >= d.y0 + d.h - 1e-6);
    }
  }
}
// elk model met deuren in het voertuigregister is gedekt
for (const m of TRAFFIC_MODELS()) {
  const v = new Vehicle(0, 0, 0, m);
  const defs = doorsFor(v);
  if (!defs.length) continue;
  const n = v.isBus ? 'bus' : (v.isTaxi ? 'taxi' : m.name);
  check(m.name + ': deuren dus naden of eigen deurbladen', TEKEN_ZELF.includes(n) || NADEN_MODELLEN.includes(n) || NADEN_MODELLEN.includes(m.name), n);
}

// 2. de naden zitten echt in de gebouwde romp (hoekpunten van een naadstrook komen in de geometrie voor)
const MODELLEN = [['sedan', 4.3, 1.8], ['hatch', 3.8, 1.7], ['wagon', 4.5, 1.8], ['van', 5.0, 2.0], ['sport', 4.1, 1.85], ['suv', 4.7, 1.95], ['truck', 8.5, 2.5], ['tractor', 4.3, 2.3], ['trekkerlimo', 5.6, 2.0], ['foodtruck', 5.4, 2.1]];
for (const [naam, len, wid] of MODELLEN) {
  const v = new Vehicle(0, 0, 0, { name: naam, len, wid, color: '#7a1f1f', maxSpeed: 40, accel: 8, brake: 20, turnRate: 2.5 });
  const mesh = buildVehicleMesh(v);
  const body = mesh.userData.body || mesh;
  const pos = body.geometry.attributes.position;
  const stroken = naadStroken(naam, len, wid / 2).filter((s) => s.soort === 'naad');
  check(naam + ': heeft naadstroken', stroken.length >= 4, String(stroken.length));
  let gevonden = 0;
  for (const s of stroken) {
    const cx = s.x - s.sx / 2, cy = s.y - s.sy / 2, cz = s.z - s.sz / 2; // één hoekpunt van de strook
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i) - cx) < 2e-3 && Math.abs(pos.getY(i) - cy) < 2e-3 && Math.abs(pos.getZ(i) - cz) < 2e-3) { gevonden++; break; }
    }
  }
  check(naam + ': naden zitten in de romp', gevonden >= stroken.length * 0.9, `${gevonden} van ${stroken.length}`);
}

console.log(bad ? `vehicledoorcuts_test: ${bad} mislukt` : 'vehicledoorcuts_test: ok');
process.exit(bad ? 1 : 0);
