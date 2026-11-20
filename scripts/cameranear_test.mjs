// Het near-vlak van de camera (cameranear.js, #917): groeit alleen met de vrije ruimte onder de camera, blijft 0,5 m in de
// eerste persoon, in een voertuig, in een cutscene en op de grond, zakt direct en stijgt zacht, en de testvlag ?near/?far
// weigert onzin. Plus de rekenregel van de 24-bit dieptebuffer: waarom 0,5 m op 250 m al 7,5 mm stap geeft.
//   node scripts/cameranear_test.mjs
import * as C from '../game/js/cameranear.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// de dieptestap: kwadratisch in de afstand, omgekeerd evenredig met near
ok(near(C.depthStep(250, 0.5), 250 * 250 / (0.5 * (2 ** 24 - 1))), 'depthStep volgt d^2 / (near * (2^24 - 1))');
ok(C.depthStep(250, 0.5) > 0.0074 && C.depthStep(250, 0.5) < 0.0076, 'op 250 m en near 0,5 is de stap 7,5 mm');
ok(C.depthStep(500, 0.5) > 0.029 && C.depthStep(500, 0.5) < 0.031, 'op 500 m en near 0,5 is de stap 30 mm');
ok(near(C.depthStep(300, 2.5) * 5, C.depthStep(300, 0.5)), 'vijf keer zo groot near is vijf keer zo kleine stap');
ok(C.depthStep(300, 0.5, 16) > C.depthStep(300, 0.5, 24) * 200, 'een 16-bit buffer is veel grover');
// de afstand waarop een offset van 6 mm (de nudge van een gebouw) nog boven de stap uitkomt
const d6 = C.maxSafeDistance(0.006, 0.5), d6hoog = C.maxSafeDistance(0.006, 2.5);
ok(d6 > 215 && d6 < 235, `6 mm houdt stand tot ~224 m bij near 0,5 (${d6.toFixed(0)})`);
ok(d6hoog > 495 && d6hoog < 510, `6 mm houdt stand tot ~502 m bij near 2,5 (${d6hoog.toFixed(0)})`);
ok(near(C.depthStep(C.maxSafeDistance(0.006, 1.2), 1.2), 0.006, 1e-9), 'maxSafeDistance is de inverse van depthStep');

// vrije ruimte: onder de grens 0,5, daarboven monotoon stijgend tot het plafond
ok(C.nearForClearance(0) === C.NEAR_MIN && C.nearForClearance(C.CLEARANCE_FROM) === C.NEAR_MIN, 'op de grond en tot 10 m blijft near 0,5');
ok(C.nearForClearance(-5) === C.NEAR_MIN && C.nearForClearance(NaN) === C.NEAR_MIN && C.nearForClearance(undefined) === C.NEAR_MIN, 'onzinwaarden geven 0,5');
ok(near(C.nearForClearance(C.CLEARANCE_TO), C.NEAR_MAX) && near(C.nearForClearance(1e6), C.NEAR_MAX), 'vanaf 60 m is near 2,5 en nooit meer');
let prev = 0, mono = true, inRange = true;
for (let c = -10; c <= 200; c += 0.5) {
  const n = C.nearForClearance(c);
  if (n < prev - 1e-12) mono = false;
  if (n < C.NEAR_MIN || n > C.NEAR_MAX) inRange = false;
  prev = n;
}
ok(mono, 'near stijgt monotoon met de vrije ruimte');
ok(inRange, 'near blijft tussen 0,5 en 2,5');
ok(C.NEAR_MIN === 0.5, 'op de grond is near zoals het spel altijd had: 0,5 m');

// wie dichtbij muren, dashboard of wapen kijkt, houdt 0,5, ook als de vrije ruimte groot lijkt (balkon, brug, dak)
const hoog = { clearance: 80 };
ok(C.cameraNearTarget({ ...hoog }) === C.NEAR_MAX, 'een hoog luchtbeeld krijgt near 2,5');
ok(C.cameraNearTarget({ ...hoog, firstPerson: true }) === C.NEAR_FIRST_PERSON, 'eerste persoon: klein near (het wapen en de handen zitten voor de lens)');
ok(C.NEAR_FIRST_PERSON <= 0.1 && C.NEAR_FIRST_PERSON >= 0.05, 'eerste persoon: near tussen 0,05 en 0,1 m (muur, dashboard, kozijn op ~0,3 m zichtbaar)');
ok(C.cameraNearTarget({ clearance: 0, firstPerson: true, inVehicle: true }) <= 0.1, 'eerste persoon in een voertuig-interieur: near <= 0,1');
ok(C.cameraNearTarget({ clearance: 80, firstPerson: true, inVehicle: true, flying: true }) <= 0.1, 'eerste persoon in de helikopter-cabine: near <= 0,1');
ok(C.cameraNearTarget({ clearance: 0, firstPerson: true }) < C.cameraNearTarget({ clearance: 0 }), 'derde persoon houdt zijn 0,5');
ok(C.depthStep(60, C.NEAR_FIRST_PERSON) < 0.03, 'op 60 m blijft de dieptestap in de eerste persoon onder 3 cm');
ok(C.cameraNearTarget({ ...hoog, override: true }) === C.NEAR_MIN, 'een scriptcamera (cutscene, binnenkamer): 0,5');
ok(C.cameraNearTarget({ ...hoog, indoors: true }) === C.NEAR_MIN, 'binnen: 0,5');
ok(C.cameraNearTarget({ ...hoog, inVehicle: true }) === C.NEAR_MIN, 'in een auto, trein of op een boot (ook op een viaduct): 0,5');
ok(C.cameraNearTarget({ ...hoog, inVehicle: true, flying: true }) === C.NEAR_MAX, 'de helikopter hangt boven de stad en mag near 2,5');
ok(C.cameraNearTarget({ clearance: 3 }) === C.NEAR_MIN, 'laag boven de grond (derde persoon): 0,5');
ok(C.cameraNearTarget({ ...hoog, firstPerson: true, forced: 1.5 }) === 1.5, 'de testvlag wint van de regels');

// stap: omhoog zacht, omlaag direct (een te groot near knipt de omgeving weg)
ok(C.stepNear(2.5, 0.5, 0.016) === 0.5, 'near zakt direct naar het doel');
const up = C.stepNear(0.5, 2.5, 0.016);
ok(up > 0.5 && up < 0.6, `near stijgt zacht per beeld (${up.toFixed(3)})`);
let n = 0.5;
for (let i = 0; i < 120; i++) n = C.stepNear(n, 2.5, 1 / 60);
ok(n > 2.4 && n <= 2.5, `na twee seconden is near er bijna (${n.toFixed(2)})`);
ok(C.stepNear(1, 1, 0.016) === 1 && C.stepNear(0.5, 2.5, 0) === 0.5, 'geen verandering zonder doelverschil of tijd');

// simulatie: een helikopter stijgt van 0 naar 70 m en daalt weer; het near is nergens groter dan wat de vrije ruimte toelaat
let nn = 0.5, tooBig = 0;
for (let t = 0; t <= 40; t += 1 / 60) {
  const clearance = t < 20 ? t * 3.5 : (40 - t) * 3.5;
  nn = C.stepNear(nn, C.cameraNearTarget({ clearance, inVehicle: true, flying: true }), 1 / 60);
  if (nn > C.nearForClearance(clearance) + 1e-9) tooBig++;
}
ok(tooBig === 0, `tijdens stijgen en dalen is near nooit groter dan de vrije ruimte toelaat (${tooBig} beelden)`);

// de testvlag
ok(C.parseNearFlag('1.5') === 1.5 && C.parseNearFlag('2,5') === 2.5, '?near leest punt en komma');
ok(C.parseNearFlag(null) === null && C.parseNearFlag('') === null && C.parseNearFlag('abc') === null, '?near zonder getal doet niets');
ok(C.parseNearFlag('0') === null && C.parseNearFlag('-1') === null && C.parseNearFlag('50') === null, '?near buiten 0,1 tot 10 doet niets');
ok(C.parseFarFlag('400') === 400 && C.parseFarFlag('20') === null && C.parseFarFlag('1e9') === null, '?far leest alleen 100 tot 20000 m');

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('cameranear: all passed');
