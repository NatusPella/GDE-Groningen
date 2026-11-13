// Cockpits van de trekker, helikopter, het vliegtuig en de machines (#847): de pure
// indeling uit cockpitlayout.js moet eindig zijn, in de cabine/romp van het model passen
// en kloppen voor de eerste-persooncamera. Later in dit bestand ook de 3D-kant
// (cabin3d.js erna): de LOD-trap, gedeelde geometrie, het bouwbudget en de wrakvariant.
//   node scripts/cockpit_test.mjs   (eenmalig: cd desktop && npm run stage)
import {
  COCKPIT_KLASSEN, isCockpitKlasse, cockpitLayout, machineCab, tractorCabMaten, PLANE_HALF_W,
} from '../game/js/cockpitlayout.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// De voertuigen met hun echte maten en stoelen (seating3d.js vehicleSeat):
//   trekker 4,3 x 2,3 (TRACTOR_MODEL)  stoel (x -1,02, y 1,55, z -0,1)
//   heli 8,8 x 2,1 (HELI_MODEL)        piloot rechts (x 0,62, y 0,98, z 0,4)
//   vliegtuig 8 x 10,6 (PLANE_MODEL)   piloot op de hartlijn (x -0,1, y 1,15, z 0)
//   maaidorser 7,4 x 3,3                stoel (x 1,25, y 2,28, z -0,2)
//   laadmachine 3,4 x 1,8               stoel (x -0,15, y 1,2, z -0,1)
const GEVALLEN = [
  ['trekker', 'tractor', 4.3, 2.3, { x: -1.02, y: 1.55, z: -0.1 }],
  ['heli', 'heli', 8.8, 2.1, { x: 0.62, y: 0.98, z: 0.4 }],
  ['vliegtuig', 'plane', 8, 10.6, { x: -0.1, y: 1.15, z: 0 }],
  ['machine', 'maaidorser', 7.4, 3.3, { x: 1.25, y: 2.28, z: -0.2 }],
  ['machine', 'laadmachine', 3.4, 1.8, { x: -0.15, y: 1.04, z: -0.1 }],
];

function alleGetallen(o, uit = []) {
  if (typeof o === 'number') uit.push(o);
  else if (Array.isArray(o)) for (const v of o) alleGetallen(v, uit);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) alleGetallen(v, uit);
  return uit;
}

check('cockpitklassen: trekker, heli, vliegtuig en machine', COCKPIT_KLASSEN.length === 4 && ['trekker', 'heli', 'vliegtuig', 'machine'].every((k) => isCockpitKlasse(k)), COCKPIT_KLASSEN.join(','));
check('cockpitklassen: een auto is geen cockpit', !isCockpitKlasse('auto') && !isCockpitKlasse('bus') && !isCockpitKlasse('vrachtwagen'));
const leeg = cockpitLayout('auto', { x: 0, y: 0.4, z: -0.3 }, 4, 1.8);
check('cockpitLayout geeft null voor een auto', leeg === null);

// De trekker-cabine hangt aan tractorCab(); de maten moeten met de modelbouwers meebewegen
{
  const groot = tractorCabMaten(4.3, 2.3), klein = tractorCabMaten(3.9, 2.1);
  check('trekker: cabine van 4,3 m', near(groot.x0, -1.67, 1e-6) && near(groot.x1, -0.27, 1e-6) && near(groot.floorY, 1) && near(groot.belt, 1.8) && near(groot.roofY, 2.72), JSON.stringify(groot));
  check('trekker: kleinere trekker schuift mee naar achteren', klein.x0 < groot.x0 && klein.x1 < groot.x1, `${klein.x0}..${klein.x1}`);
  check('trekker: cabine breder dan de binnenhuid', groot.hw > 0.85 && groot.hw < 1.4, String(groot.hw));
}

const layouts = [];
for (const [klasse, naam, len, wid, seat] of GEVALLEN) {
  const label = klasse + '/' + naam;
  check(`${label}: cockpitLayout bestaat`, !!cockpitLayout(klasse, seat, len, wid, naam));
  const L = cockpitLayout(klasse, seat, len, wid, naam);
  if (!L) continue;
  layouts.push({ klasse, naam, len, wid, seat, L });
  // alles eindig en geen ontbrekend onderdeel
  const getallen = alleGetallen(L);
  check(`${label}: alle maten eindig`, getallen.every(finite), String(getallen.filter((n) => !finite(n)).length));
  check(`${label}: oog, dashboard, stuur, stoelen, spiegel en dak`, !!L.eye && !!L.dash && !!L.binnacle && !!L.wheel && L.seats.length >= 1 && !!L.mirror && !!L.roof && !!L.shell && !!L.cab);
  check(`${label}: één samengevoegde binnenruimte`, L.shell.x0 < L.shell.x1 && L.shell.floorY < L.shell.roofY && L.hw > 0.3);
  // het oog zit boven de zitting, onder de dakhemel en in de cabine
  check(`${label}: oog boven de zitting`, L.eye.y > seat.y + 0.35, `${L.eye.y} tegen zitting ${seat.y}`);
  check(`${label}: oog onder de dakhemel`, L.eye.y < L.roof.y, `${L.eye.y} tegen ${L.roof.y}`);
  check(`${label}: oog in de cabine`, L.eye.x > L.cab.x0 && L.eye.x < L.cab.x1 && Math.abs(L.eye.z) <= L.cab.hw, JSON.stringify(L.eye));
  // het dashboard staat voor het oog, het stuur tussen oog en dashboard
  check(`${label}: dashboard voor het oog`, L.dash.x > L.eye.x, `${L.dash.x} tegen ${L.eye.x}`);
  check(`${label}: stuur tussen oog en dashboard`, L.wheel.x > L.eye.x && L.wheel.x < L.dash.x, `${L.eye.x} < ${L.wheel.x} < ${L.dash.x}`);
  check(`${label}: dashboard onder de raamlijn`, L.dash.y + L.dash.h <= L.cab.roofY + 0.001, `${(L.dash.y + L.dash.h).toFixed(2)} tegen dak ${L.cab.roofY}`);
  check(`${label}: dashboard binnen de cabinebreedte`, Math.abs(L.dash.x) + 0.01 > 0 && L.dash.w <= L.cab.hw * 2 + 0.001, `${L.dash.w} tegen ${L.cab.hw * 2}`);
  check(`${label}: stuur binnen de cabine`, Math.abs(L.wheel.z) + L.wheel.r <= L.cab.hw + 0.001, `${L.wheel.z} + ${L.wheel.r}`);
  // de stoelen blijven binnen de cabine en de spiegeling klopt
  for (const s of L.seats) check(`${label}: stoel binnen de cabine`, Math.abs(s.z) + 0.25 <= L.cab.hw + 0.001 && s.x > L.cab.x0 && s.x < L.cab.x1, JSON.stringify(s));
  check(`${label}: binnenspiegel/kompas boven het oog en onder het dak`, L.mirror.y > L.eye.y && L.mirror.y < L.roof.y + 0.2, `${L.mirror.y}`);
  // de binnenhuid past in de cabine van het model: nergens door het plaatwerk of het glas
  check(`${label}: binnenhuid in de cabine (x)`, L.shell.x0 >= L.cab.x0 && L.shell.x1 <= L.cab.x1, `${L.shell.x0}..${L.shell.x1} in ${L.cab.x0}..${L.cab.x1}`);
  check(`${label}: binnenhuid in de cabine (y)`, L.shell.floorY >= L.cab.floorY && L.shell.roofY <= L.cab.roofY, `${L.shell.floorY}..${L.shell.roofY} in ${L.cab.floorY}..${L.cab.roofY}`);
  check(`${label}: binnenhuid niet breder dan de cabine`, L.shell.hw <= L.cab.hw, `${L.shell.hw} tegen ${L.cab.hw}`);
  check(`${label}: dakhemel boven de ogen van beide inzittenden`, L.roof.y > L.eye.y + 0.05, `${L.roof.y} tegen ${L.eye.y}`);
  check(`${label}: A-stijl binnen de breedte`, L.roof.pillars.every((p) => Math.abs(p.z) < L.cab.hw), JSON.stringify(L.roof.pillars));
  // de extras van de klassestijl (carinteriorlayout.js) staan straks ook in de cabine; hier
  // alleen de vorm: elke cockpit heeft een stuurwiel/cyclic met een redelijke maat
  check(`${label}: stuur/cyclic heeft een maat`, L.wheel.r > 0.02 && L.wheel.r < 0.35, String(L.wheel.r));
}

// Per klasse de eigen kenmerken
{
  const trekker = layouts.find((g) => g.klasse === 'trekker');
  check('trekker: buddy seat naast de bestuurder', trekker.L.seats.length === 2 && trekker.L.seats[0].z !== trekker.L.seats[1].z);
  check('trekker: rechtopstaand groot stuur', trekker.L.wheel.r >= 0.2 && trekker.L.wheel.tilt < 0.5, `${trekker.L.wheel.r} / ${trekker.L.wheel.tilt}`);
  check('trekker: binnenhuid smaller dan de cabine', trekker.L.hw < trekker.L.cab.hw, `${trekker.L.hw} tegen ${trekker.L.cab.hw}`);

  const heli = layouts.find((g) => g.klasse === 'heli');
  check('heli: piloot rechts, passagier links', heli.L.seats.length === 2 && heli.L.seats[0].z > 0 && heli.L.seats[1].z < 0, JSON.stringify(heli.L.seats));
  check('heli: cockpit binnen de bel (x)', heli.L.shell.x1 <= 1.9 && heli.L.shell.x0 >= -0.35, `${heli.L.shell.x0}..${heli.L.shell.x1}`);
  // de bel: ((x-0,55)/1,55)^2 + ((y-1,2)/0,95)^2 + (z/0,92)^2 <= 1 (heli3d.js)
  const inBel = (x, y, z) => ((x - 0.55) / 1.55) ** 2 + ((y - 1.2) / 0.95) ** 2 + (z / 0.92) ** 2 <= 1;
  for (const hoek of [[heli.L.shell.x0, heli.L.shell.roofY, heli.L.shell.hw], [heli.L.shell.x1, heli.L.shell.roofY, heli.L.shell.hw], [heli.L.shell.x1, heli.L.shell.roofY, -heli.L.shell.hw]]) {
    check('heli: binnenhuid binnen de bel', inBel(...hoek), JSON.stringify(hoek));
  }
  check('heli: oog binnen de bel', inBel(heli.L.eye.x, heli.L.eye.y, heli.L.eye.z));
  check('heli: geen stuurwiel maar een cyclic', heli.L.wheel.r <= 0.1, String(heli.L.wheel.r));

  const kist = layouts.find((g) => g.klasse === 'vliegtuig');
  check('vliegtuig: cockpit op de romphartlijn', kist.L.seats.every((s) => near(s.z, 0)) && kist.L.eye.z === 0);
  check('vliegtuig: cockpit niet breder dan de romp', kist.L.shell.hw < PLANE_HALF_W && kist.L.dash.w <= PLANE_HALF_W * 2, `${kist.L.shell.hw} tegen ${PLANE_HALF_W}`);
  check('vliegtuig: cockpit binnen de romp (x en y)', kist.L.shell.x0 >= -3.4 && kist.L.shell.x1 <= 3.4 && kist.L.shell.floorY >= 0.8 && kist.L.shell.roofY <= 2.1, `${kist.L.shell.x0}..${kist.L.shell.x1} / ${kist.L.shell.floorY}..${kist.L.shell.roofY}`);
  check('vliegtuig: oog onder de kap (y 1,9)', kist.L.eye.y < 2.1 && kist.L.eye.y > 1.5, String(kist.L.eye.y));
  check('vliegtuig: passagier achter de piloot, geen bank', kist.L.seats.length === 2 && kist.L.seats[1].x < kist.L.seats[0].x && kist.L.rear === null);

  const mower = layouts.find((g) => g.naam === 'maaidorser');
  check('maaiderser: één zitplaats', mower.L.seats.length === 1);
  check('maaiderser: interieur op cabinehoogte (2,0..3,3)', mower.L.shell.floorY >= 2.0 && mower.L.shell.floorY <= 2.2 && mower.L.eye.y > 2.65 && mower.L.eye.y < 3.3, `${mower.L.shell.floorY} / ${mower.L.eye.y}`);
  check('maaiderser: dashboard en stuur boven de dorskast', mower.L.dash.y >= 2.0 && mower.L.wheel.y > 2.3, `${mower.L.dash.y} / ${mower.L.wheel.y}`);
  check('maaiderser: niet op auto-hoogte', mower.L.eye.y > 2.5 && mower.L.shell.floorY > 1.9);

  const laad = layouts.find((g) => g.naam === 'laadmachine');
  check('laadmachine: één zitplaats', laad.L.seats.length === 1);
  check('laadmachine: interieur op kooihoogte (1,45..2,0)', laad.L.shell.floorY >= 1.39 && laad.L.shell.roofY <= 2.04 && laad.L.eye.y > 1.8 && laad.L.eye.y < 2.0, `${laad.L.shell.floorY}..${laad.L.shell.roofY} / ${laad.L.eye.y}`);
  check('laadmachine: lager dan de maaidorser', laad.L.eye.y < mower.L.eye.y - 0.7, `${laad.L.eye.y} tegen ${mower.L.eye.y}`);
  check('laadmachine: stuur in de kooi', laad.L.wheel.y > 1.5 && laad.L.wheel.y < 2.0, String(laad.L.wheel.y));
}

// De machinekeuze zonder modelnaam (een test of een aanroep met alleen de klasse) kiest op
// de stoelhoogte en komt op dezelfde cabine uit.
{
  const hoog = cockpitLayout('machine', { x: 1.25, y: 2.28, z: -0.2 }, 7.4, 3.3);
  const laag = cockpitLayout('machine', { x: -0.15, y: 1.2, z: -0.1 }, 3.4, 1.8);
  check('machine zonder naam: hoge stoel = maaidorser', machineCab('', { y: 2.28 }) === machineCab('maaidorser', { y: 2.28 }) && hoog.shell.roofY > 3);
  check('machine zonder naam: lage stoel = laadmachine', machineCab('', { y: 1.2 }) === machineCab('laadmachine', { y: 1.2 }) && laag.shell.roofY < 2);
  check('machine zonder naam: zelfde indeling als met naam', JSON.stringify(hoog.shell) === JSON.stringify(cockpitLayout('machine', { x: 1.25, y: 2.28, z: -0.2 }, 7.4, 3.3, 'maaidorser').shell));
}

// De trekker-cabine schuift met de lengte mee; de indeling moet dat volgen.
{
  const groot = cockpitLayout('trekker', { x: -1.02, y: 1.55, z: -0.1 }, 4.3, 2.3);
  const klein = cockpitLayout('trekker', { x: -1.32, y: 1.55, z: -0.1 }, 3.9, 2.1);
  check('trekker: kortere cabine schuift naar achteren', klein.shell.x1 < groot.shell.x1, `${klein.shell.x1} tegen ${groot.shell.x1}`);
  check('trekker: oog blijft boven de zitting', near(klein.eye.y - 1.55, groot.eye.y - 1.55, 1e-9));
}

console.log(bad ? `cockpit_test (pure indeling): ${bad} mislukt` : `cockpit_test (pure indeling): ok (${layouts.length} cockpits)`);
process.exit(bad ? 1 : 0);
