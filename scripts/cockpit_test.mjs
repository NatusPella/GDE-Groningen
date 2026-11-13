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
  check('maaidorser: één zitplaats', mower.L.seats.length === 1);
  check('maaidorser: interieur op cabinehoogte (2,0..3,3)', mower.L.shell.floorY >= 2.0 && mower.L.shell.floorY <= 2.2 && mower.L.eye.y > 2.65 && mower.L.eye.y < 3.3, `${mower.L.shell.floorY} / ${mower.L.eye.y}`);
  check('maaidorser: dashboard en stuur boven de dorskast', mower.L.dash.y >= 2.0 && mower.L.wheel.y > 2.3, `${mower.L.dash.y} / ${mower.L.wheel.y}`);
  check('maaidorser: niet op auto-hoogte', mower.L.eye.y > 2.5 && mower.L.shell.floorY > 1.9);

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

// --- de 3D-kant (#847): cabin3d.js van buiten en carinterior.js in eerste persoon --------
import './node3d.mjs';
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const C3 = await import('../game/js/cabin3d.js');
const CI = await import('../game/js/carinterior.js');
const AI = await import('../game/js/autointerieur.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { interiorKlasse } = await import('../game/js/carinteriorlayout.js');

const THREE_MODEL = { 'trekker': { name: 'tractor', len: 4.3, wid: 2.3, color: '#3f7d3a' }, 'heli': { name: 'heli', len: 8.8, wid: 2.1, color: '#b8322a' }, 'vliegtuig': { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' }, 'machine-maal': { name: 'maaidorser', len: 7.4, wid: 3.3, color: '#c43d2b' }, 'machine-laad': { name: 'laadmachine', len: 3.4, wid: 1.8, color: '#e0a92b' } };
const FLAGS = { heli: { isHeli: true }, vliegtuig: { isPlane: true } };
const maak = (soort) => {
  const model = { ...THREE_MODEL[soort] };
  const v = new Vehicle(0, 0, 0, model);
  const flags = soort === 'heli' ? FLAGS.heli : soort === 'vliegtuig' ? FLAGS.vliegtuig : {};
  return Object.assign(v, flags);
};
const triangle = (g) => g.attributes.position.count / 3;
const bbox = (g) => { g.computeBoundingBox(); return g.boundingBox; };
const inCabine = (b, cab, marge = 0.06) => b.min.x >= cab.x0 - marge && b.max.x <= cab.x1 + marge &&
  b.min.z >= -cab.hw - marge && b.max.z <= cab.hw + marge &&
  b.min.y >= cab.floorY - 0.2 && b.max.y <= cab.roofY + 0.03;

const cockpitRows = [];
for (const soort of Object.keys(THREE_MODEL)) {
  const v = maak(soort);
  const klasse = interiorKlasse(v);
  const seat = vehicleSeat(v, true);
  const L = cockpitLayout(klasse, seat, v.model.len, v.model.wid, v.model.name);
  const mesh = buildVehicleMesh(v);
  const meshes = new Map([[v.id, mesh]]);
  const world = { vehicles: [v] };
  C3.syncCabins(world, meshes, 0, 0);
  const cab = mesh.userData.cabin;
  check(`${soort}: cabine van buiten gebouwd`, !!cab && cab.visible && cab.name === 'cabine', soort);
  if (!cab) continue;
  const b = bbox(cab.geometry);
  check(`${soort}: cabine binnen de cabine/romp van het model`, inCabine(b, L.cab), `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)} / cab ${JSON.stringify(L.cab)}`);
  check(`${soort}: cabine onder het dak van het model`, b.max.y <= L.cab.roofY + 0.03, `${b.max.y.toFixed(2)} tegen ${L.cab.roofY}`);
  // de LOD-trap: strikt aflopend en gedeeld per niveau
  const tri = [];
  for (let lod = 0; lod < 3; lod++) tri.push(triangle(C3.buildCabinGeometry(seat, v.model.len, v.model.wid, klasse, null, lod, { naam: v.model.name })));
  check(`${soort}: driehoeken lopen strikt af (${tri.join(' > ')})`, tri[0] > tri[1] && tri[1] > tri[2], tri.join(' > '));
  check(`${soort}: lod 1 minstens 35% minder`, tri[1] <= 0.65 * tri[0], `${tri[0]} -> ${tri[1]}`);
  check(`${soort}: lod 2 minstens 70% minder`, tri[2] <= 0.3 * tri[0], `${tri[0]} -> ${tri[2]}`);
  // het eerste-persoon-interieur: gebouwd, klein, één gedeeld materiaal, 2 + portieren objecten
  check(`${soort}: eigen interieur in eerste persoon`, CI.updateCarInterior(mesh, v, true) === true && !!mesh.userData.interior);
  const g = mesh.userData.interior;
  if (!g) continue;
  const onderdelen = [];
  g.traverse((o) => { if (o.isMesh) onderdelen.push(o); });
  let drie = 0;
  for (const m of onderdelen) drie += triangle(m.geometry);
  check(`${soort}: interieur klein genoeg (<= 4000 driehoeken)`, drie > 0 && drie <= 4000, String(drie));
  check(`${soort}: één gedeeld materiaal`, new Set(onderdelen.map((m) => m.material)).size === 1 && onderdelen[0].material.userData.shared === true);
  check(`${soort}: geen schaduw op een interieurdeel`, onderdelen.every((m) => m.castShadow === false));
  check(`${soort}: 2 + portieren draw-objecten`, onderdelen.length === 2 + g.userData.trims.length, `${onderdelen.length} bij ${g.userData.trims.length} portieren`);
  // het stuur draait mee met de besturing
  v.steer = 0.5;
  CI.updateCarInterior(mesh, v, true);
  check(`${soort}: het stuur draait mee`, near(g.userData.wheel.rotation.x, -1.1, 1e-9), String(g.userData.wheel.rotation.x));
  v.steer = 0;
  // de eerste-persooncamera: het oog (hoofdbot) valt in de cabine/romp, boven de vloer
  const oog = seat.y + 0.82; // hoofd = zitting + 0,65 (models3d_people.js NECK_Y) + 0,17 (firstpersoncam.js)
  check(`${soort}: eerste-persoonoog in de cabine (y)`, oog > L.shell.floorY + 0.2 && oog <= L.cab.roofY, `${oog.toFixed(2)} in ${L.shell.floorY}..${L.cab.roofY}`);
  const e = CI.interiorEyePose(v);
  check(`${soort}: BINNENIN-oog eindig en op cabinehoogte`, e && [e.x, e.y, e.z, e.fx, e.fy].every((n) => Number.isFinite(n)) && e.z > L.shell.floorY && e.z < L.cab.roofY, JSON.stringify(e));
  // het meedraaiende stuur van buiten: trekker en machines wel, heli en vliegtuig niet (cyclic/yoke)
  AI.syncAutoStuur(world, meshes, 0, 0, 1 / 60);
  const heeftStuur = !!(cab.userData.stuur && cab.userData.stuur.visible);
  const verwachtStuur = klasse === 'trekker' || klasse === 'machine';
  check(`${soort}: meedraaiend stuur ${verwachtStuur ? 'wel' : 'niet'}`, heeftStuur === verwachtStuur, String(heeftStuur));
  // ver weg: de cabine en het stuur gaan weg
  C3.syncCabins(world, meshes, C3.CABIN_LOD_R[2], 0);
  check(`${soort}: verborgen voorbij de verste straal`, !cab.visible);
  cockpitRows.push({ soort, tri, drie, objecten: onderdelen.length });
}
// De wrakvariant werkt ook voor een cockpitklasse (#847): verkoold, eigen geometrie, binnen de cabine.
{
  const v = maak('trekker');
  v.wrecked = true;
  const mesh = buildVehicleMesh(v);
  const wereld = { vehicles: [v] };
  const meshes = new Map([[v.id, mesh]]);
  C3.syncCabins(wereld, meshes, 0, 0);
  const cab = mesh.userData.cabin;
  check('wrak-trekker: eigen wrakcabine', !!cab && cab.visible && mesh.userData.cabinWreck === true);
  if (cab) {
    const seat = vehicleSeat(v, true);
    const L = cockpitLayout('trekker', seat, v.model.len, v.model.wid, 'tractor');
    const b = bbox(cab.geometry);
    check('wrak-trekker: wrakgeometrie binnen de cabine', inCabine(b, L.cab), `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}`);
    check('wrak-trekker: niet de gewone cabine', triangle(cab.geometry) !== triangle(C3.buildCabinGeometry(seat, v.model.len, v.model.wid, 'trekker', null, 0, { naam: 'tractor' })));
  }
}
// De eerste-persooncamera staat in de raamband die het model (straks) open heeft: de maaidorser
// krijgt een glasband van ~2,35 tot ~3,2 m, de laadmachine heeft zijn kooi van 1,45 tot ~2,0 m.
for (const [naam, onder, boven] of [['maaidorser', 2.35, 3.2], ['laadmachine', 1.45, 2.0]]) {
  const v = maak(naam === 'maaidorser' ? 'machine-maal' : 'machine-laad');
  const seat = vehicleSeat(v, true);
  const oog = seat.y + 0.82;
  check(`${naam}: eerste-persoonoog in de raamband ${onder}..${boven}`, oog > onder && oog <= boven, oog.toFixed(2));
  const L = cockpitLayout('machine', seat, v.model.len, v.model.wid, naam);
  check(`${naam}: het interieur zelf zit op cabinehoogte`, L.shell.floorY >= 1.39 && L.eye.y >= onder - 0.1 && L.eye.y < boven, `${L.shell.floorY} / ${L.eye.y}`);
}
// Bouwbudget: een rij cockpits van verschillende maten bouwt per aanroep hooguit drie geometrieën.
{
  const cocks = [];
  for (let i = 0; i < 4; i++) {
    const v = new Vehicle(0, 0, 0, { name: 'tractor', len: 3.7 + i * 0.2, wid: 2.1, color: '#3f7d3a' });
    cocks.push({ v, mesh: buildVehicleMesh(v) });
  }
  const wereld = { vehicles: cocks.map((c) => c.v) };
  const meshes = new Map(cocks.map((c) => [c.v.id, c.mesh]));
  const zichtbaar = () => cocks.filter((c) => c.mesh.userData.cabin && c.mesh.userData.cabin.visible).length;
  C3.syncCabins(wereld, meshes, 0, 0);
  check('cockpit-budget: eerste aanroep bouwt er precies 3', zichtbaar() === 3, String(zichtbaar()));
  C3.syncCabins(wereld, meshes, 0, 0);
  check('cockpit-budget: volgende aanroep bouwt de rest', zichtbaar() === 4, String(zichtbaar()));
}

if (cockpitRows.length) console.log('cockpit 3D-metingen:', cockpitRows.map((r) => `${r.soort} ${r.tri.join('>')} driehoeken (FP ${r.drie}, ${r.objecten} objecten)`).join(', '));
console.log(bad ? `cockpit_test: ${bad} mislukt` : `cockpit_test: ok (${layouts.length} cockpits, ${cockpitRows.length} 3D)`);
process.exit(bad ? 1 : 0);
