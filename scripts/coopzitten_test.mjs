// Samen spelen (#434): wie er in een voertuig van iemand anders zit, is te zien op zijn eigen stoel, met de
// houding van die plek, ook als het voertuig rijdt, en nooit door de carrosserie heen. De stoelen komen uit
// seating3d.js vehicleSeatAt: de bank achterin (binnen de auto), de echte stoelen van een boot (boattypes.js)
// en de passagiersruimte van de bus (businterieur.js). De tekening is coopzitten3d.js syncZitters.
//   node scripts/coopzitten_test.mjs
import './node3d.mjs';

const THREE = await import('three');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { vehicleSeatAt, vehicleSeat } = await import('../game/js/seating3d.js');
const { boatSeats } = await import('../game/js/boattypes.js');
const { busInterieur, midibusInterieur, VLOER } = await import('../game/js/businterieur.js');
const { syncZitters, clearZitters, zitterPlekken } = await import('../game/js/coopzitten3d.js');

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const dicht = (a, b) => Math.abs(a - b) < 1e-6;

// De auto's zoals ze in het spel staan: modelnaam, lengte, breedte en de hoogte van het dak (models3d_vehicles.js carProfile).
const AUTO = {
  hatch: { len: 4.0, wid: 1.7, dak: 1.47 }, sedan: { len: 4.4, wid: 1.75, dak: 1.45 },
  wagon: { len: 4.3, wid: 1.75, dak: 1.5 }, suv: { len: 4.5, wid: 1.85, dak: 1.74 },
  sport: { len: 4.1, wid: 1.7, dak: 1.25 }, escort: { len: 4.7, wid: 1.75, dak: 1.38 },
  van: { len: 5.2, wid: 2.0, dak: 2.08 }, truck: { len: 6.4, wid: 2.4, dak: 2.55 },
};
const auto = (naam) => ({ id: 31, model: { name: naam, ...AUTO[naam] }, ...(naam === 'escort' ? { isHeroCar: true } : {}) });

// --- de bank achterin een auto: binnen de carrosserie, ook met meer dan vier spelers -------------------------------
for (const naam of Object.keys(AUTO)) {
  const v = auto(naam), a = AUTO[naam], hl = a.len / 2, hw = a.wid / 2;
  const stoelen = [0, 1, 2, 3, 4, 5, 6].map((s) => vehicleSeatAt(v, s));
  check(naam + ': de bestuurder en de bijrijder staan voorin', stoelen[0].x > stoelen[1].x - 0.4 && Math.abs(stoelen[0].z) > 0.1, JSON.stringify(stoelen.slice(0, 2).map((s) => [s.x, s.z])));
  check(naam + ': iedere passagier zit binnen de lengte van de auto', stoelen.slice(2).every((s) => s.x > -hl + 0.4 && s.x < hl), JSON.stringify(stoelen.slice(2).map((s) => s.x)));
  check(naam + ': iedere passagier zit binnen de breedte van de auto', stoelen.slice(2).every((s) => Math.abs(s.z) <= hw - 0.15), JSON.stringify(stoelen.slice(2).map((s) => s.z)));
  check(naam + ': het hoofd blijft onder het dak', stoelen.slice(2).every((s) => s.y + 0.92 <= a.dak), JSON.stringify(stoelen.slice(2).map((s) => s.y)));
  check(naam + ': de passagiers zitten achter de bijrijder en niet op de achterbumper', stoelen.slice(2).every((s) => s.x <= stoelen[1].x - 0.5), JSON.stringify(stoelen.slice(2).map((s) => s.x)));
  check(naam + ': de passagiers houden de handen op de schoot (geen stuur)', stoelen.slice(2).every((s) => s.pose && s.pose.arms === 'lap'), JSON.stringify(stoelen.slice(2).map((s) => s.pose && s.pose.arms)));
}
{ // de oude fout: een vierde en vijfde speler zaten achter de achterklep (x -1,82 bij een hatch van 4 m)
  const v = auto('hatch');
  check('een hatch: de vierde speler zit niet door de achterklep', vehicleSeatAt(v, 4).x > -2.0 + 0.9, vehicleSeatAt(v, 4).x);
  check('een hatch: de derde en vierde speler zitten naast elkaar op de bank', Math.abs(vehicleSeatAt(v, 2).z) > 0.2 && Math.abs(vehicleSeatAt(v, 3).z) > 0.2 && vehicleSeatAt(v, 2).z * vehicleSeatAt(v, 3).z < 0);
}

// --- boten: de echte stoelen van boattypes.js, met de houding van die plek (roeien, peddelen, sturen) -------------
{
  const boot = (kind, len, wid, extra = {}) => ({ id: 7, isBoat: true, model: { name: 'boat', kind, len, wid }, ...extra });
  const rond = boot('rondvaart', 14, 3.3), echte = boatSeats(rond);
  const s2 = vehicleSeatAt(rond, 2), s5 = vehicleSeatAt(rond, 5);
  check('rondvaart: stoel 2 is de echte tweede stoel (geen verzonnen plek)', dicht(s2.x, echte[2].x) && dicht(s2.z, echte[2].z) && dicht(s2.y, echte[2].y));
  check('rondvaart: stoel 5 is de echte vijfde stoel', dicht(s5.x, echte[5].x) && dicht(s5.z, echte[5].z));
  check('rondvaart: alle passagiers blijven binnen de romp', echte.every((s) => Math.abs(s.z) <= 3.3 / 2 - 0.1));
  const acht = boot('acht', 17, 0.62), roeier = vehicleSeatAt(acht, 2);
  check('acht: de passagier op stoel 2 roeit (de houding van die plek)', roeier.pose && roeier.pose.arms === 'row', JSON.stringify(roeier.pose && roeier.pose.arms));
  const kano = boot('kano', 4.2, 0.8);
  check('kano: de passagier op stoel 2 peddelt', vehicleSeatAt(kano, 2).pose.arms === 'paddle');
  const sup = boot('sup', 3.2, 0.8);
  check('sup: de bestuurder staat en peddelt', vehicleSeatAt(sup, 0).stand === true && vehicleSeatAt(sup, 0).pose.arms === 'sup');
  check('een boot met twee stoelen: een derde zitter valt terug op de laatste echte stoel', vehicleSeatAt(kano, 6).x === vehicleSeatAt(kano, 1).x);
}

// --- de bus: de passagiersruimte van businterieur.js --------------------------------------------------------------
{
  for (const [naam, len, wid] of [['bus', 11.2, 2.55], ['midibus', 8.4, 2.3]]) {
    const v = { id: 9, isBus: true, model: { name: naam, len, wid, trailer: naam === 'bus' ? 6.8 : 0 } };
    const layout = naam === 'midibus' ? midibusInterieur(len, wid) : busInterieur(len, wid, { trailer: v.model.trailer }), hl = len / 2;
    const s2 = vehicleSeatAt(v, 2), s9 = vehicleSeatAt(v, 9);
    check(naam + ': stoel 2 staat in de passagiersruimte', s2.x < vehicleSeat(v, true).x && s2.x > -hl && Math.abs(s2.z) < wid / 2, JSON.stringify([s2.x, s2.z]));
    check(naam + ': stoel 2 is een echte plek van de bus (zitting of staanplaats)', layout.seats.some((s) => dicht(s.x, s2.x) && dicht(s.z, s2.z)) || layout.stand.some((s) => dicht(s.x, s2.x) && dicht(s.z, s2.z)), JSON.stringify([s2.x, s2.z]));
    check(naam + ': een zittende reiziger zit op de zittinghoogte', s2.stand ? s2.y === VLOER : dicht(s2.y, VLOER + 0.31), JSON.stringify([s2.stand, s2.y]));
    check(naam + ': ook de negende speler zit binnen de bus', s9.x > -hl && s9.x < hl && Math.abs(s9.z) < wid / 2, JSON.stringify([s9.x, s9.z]));
  }
}

// --- tekenen: de zitter hangt in het voertuig, dus hij rijdt mee, en zijn stoel verandert niet van het rijden -----
{
  clearZitters();
  const v = auto('hatch'), mesh = buildVehicleMesh(v);
  const zoek = (id) => (id === v.id ? { mesh, v } : null);
  const lijst = [
    { slot: 0, char: 'tammo', voertuig: v.id, stoel: 0 }, { slot: 1, char: 'anita', voertuig: v.id, stoel: 1 },
    { slot: 2, char: 'jelle', voertuig: v.id, stoel: 2 }, { slot: 3, char: 'mo', voertuig: v.id, stoel: 3 },
  ];
  check('vier spelers in de auto: alle vier getekend', syncZitters(lijst, zoek) === 4);
  check('de zitters hangen in het voertuigmodel (ze rijden mee)', mesh.userData.body.children.length >= 4);
  const plek = zitterPlekken();
  check('de plekken van de zitters zijn te lezen (voor de testbank)', plek.length === 4 && plek.every((p) => typeof p[2] === 'number'));
  const pos = new THREE.Vector3(), voor = new THREE.Vector3();
  mesh.updateMatrixWorld(true); mesh.userData.body.children[3].getWorldPosition(voor);
  mesh.position.x += 10; mesh.position.z += 4; mesh.rotation.y = -0.7; mesh.updateMatrixWorld(true);
  mesh.userData.body.children[3].getWorldPosition(pos);
  check('als de auto rijdt en draait, gaat de zitter mee', pos.distanceTo(voor) > 8, JSON.stringify([voor.toArray(), pos.toArray()]));
  const na = zitterPlekken();
  check('het rijden verandert de stoel van de zitter niet', na.every((p, i) => p[2] === plek[i][2] && p[4] === plek[i][4]), JSON.stringify([plek, na]));
  // uitstappen: weg uit het model
  syncZitters([], zoek);
  check('stapt iedereen uit, dan is de auto weer leeg', mesh.userData.body.children.filter((c) => c.userData && c.userData.legL).length === 0);
  clearZitters();
}

// --- de houding beweegt mee: een roeier en een SUP'er peddelen elke frame ----------------------------------------------------
{
  clearZitters();
  const boot = { id: 77, isBoat: true, model: { name: 'boat', kind: 'acht', len: 17, wid: 0.62 } };
  const mesh = buildVehicleMesh(boot);
  const zoek = (id) => (id === 77 ? { mesh, v: boot } : null);
  const lijst = [{ slot: 2, char: 'jelle', voertuig: 77, stoel: 2 }];
  syncZitters(lijst, zoek, { time: 1.0 });
  const bootOuder = mesh.userData.body || mesh;
  const z = bootOuder.children.find((c) => c.userData && c.userData.legL && c.userData.pelvis);
  const arm = z.userData.armL.rotation.z, romp = z.userData.chest.rotation.z;
  syncZitters(lijst, zoek, { time: 1.8 });
  check('een roeier in een acht haalt de riemen aan en uit', Math.abs(z.userData.armL.rotation.z - arm) > 0.05 || Math.abs(z.userData.chest.rotation.z - romp) > 0.05, JSON.stringify([arm, z.userData.armL.rotation.z]));
  clearZitters();
  const sup = { id: 78, isBoat: true, model: { name: 'boat', kind: 'sup', len: 3.2, wid: 0.8 } };
  const sm = buildVehicleMesh(sup);
  const zoekSup = (id) => (id === 78 ? { mesh: sm, v: sup } : null);
  syncZitters([{ slot: 3, char: 'mo', voertuig: 78, stoel: 0 }], zoekSup, { time: 2.0 });
  const supZ = sm.userData.body ? sm.userData.body.children.find((c) => c.userData && c.userData.pelvis) : sm.children.find((c) => c.userData && c.userData.pelvis);
  check('op een SUP staat de passagier met de peddel in de hand (geen kleermakerszit)', !!supZ && !!supZ.userData.supPaddle && supZ.userData.supPaddle.visible, !!supZ);
  clearZitters();
}

console.log(bad ? `${bad} van ${n} mislukt` : `coopzitten_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
