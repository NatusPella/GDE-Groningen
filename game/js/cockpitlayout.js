// Cabine- en cockpitindelingen voor de trekker, helikopter, het vliegtuig en de
// landbouwmachines (#847), in voertuiglokale meters (+x vooruit, +z rechts, y
// omhoog vanaf de grond). Puur: geen three.js en geen DOM, zodat
// scripts/cockpit_test.mjs de indeling in gewone node kan controleren; cabin3d.js
// (van buiten) en carinterior.js (de eigen cockpit in eerste persoon) bouwen
// eruit, net als carinteriorlayout.js dat voor de auto's doet.
//
// De maten komen uit de modelbouwers en zijn daar READ-ONLY uit overgenomen. Wie
// een model verandert, past de getallen hier aan:
//   trekker   models3d_vehicles.js tractorCab()/buildTractorMesh()
//             (cabine x0..x1, vloer 1,0, raamlijn 1,8, dak 2,72; glas op z ±0,43·W)
//   heli      heli3d.js bodyGeometry()
//             (bel om (0,55; 1,2; 0) met stralen 1,55 · 0,95 · 0,92; glas boven y 1,2;
//              vloerplaat y ~1,0; het glas is tot y 2,15 doorschijnend, dus de cockpit
//              moet binnen de bel blijven)
//   vliegtuig plane3d.js buildPlaneMesh() + seating3d.js PLANE_HALF_W
//             (romp 6,8 x 1,3 x 1,3 op y 1,45: x -3,4..3,4, y 0,8..2,1, halfbreedte 0,65;
//              de kap van 1,5 x 0,6 x 1,1 staat op y 2,2 en begint op y 1,9.
//              LET OP: model.wid is bij de kist de SPANWIJDTE (10,6); de cockpitrekening
//              gebruikt de romphalfbreedte 0,65, nooit model.wid)
//   machines  models3d_vehicles.js buildMaaidorserMesh()/buildLaadmachineMesh()
//             (maaidorser-cabine x 0,55..2,05, y 2,0..3,3, glasband 2,2..3,2, dakplaat 3,29..3,43;
//              laadmachine-kooi x -0,65..0,45, vloerplaat 1,39..1,51, dakplaat 1,96..2,04,
//              glas 1,48..2,04 — de kooi is maar 0,45 m hoog, dus de bestuurder zit laag en de
//              eerste-persooncamera komt net in de dakplaat; dat is de hoogte van dit model)

// De klassen met een eigen cockpit/cabine-indeling (in plaats van de auto-indeling).
export const COCKPIT_KLASSEN = ['trekker', 'heli', 'vliegtuig', 'machine'];
const COCKPIT = new Set(COCKPIT_KLASSEN);
export const isCockpitKlasse = (klasse) => COCKPIT.has(klasse);

// Romphalfbreedte van de kist uit plane3d.js (BoxGeometry 6,8 x 1,3 x 1,3); model.wid is de
// spanwijdte en zegt hier niets.
export const PLANE_HALF_W = 0.65;

// De maten van de trekker-cabine, afgeleid van tractorCab() in models3d_vehicles.js
// (TRACTOR_WB 2,45, cabine van rearX-0,62 tot rearX+0,78, vloer 1,0, raamlijn 1,8, dak 2,72).
export function tractorCabMaten(len, wid) {
  const rearX = len / 2 - 0.75 - 2.45;
  return { x0: rearX - 0.62, x1: rearX + 0.78, floorY: 1.0, belt: 1.8, roofY: 2.72, hw: wid * 0.43 - 0.06 };
}

// De vaste maten van de cockpit/cabine per klasse: het fysieke modeldeel waarin de
// indeling moet passen (x0..x1, vloer, dak, halve breedte) en de plek van de bestuurder.
const MAIDORSER = { x0: 0.55, x1: 2.05, floorY: 2.0, roofY: 3.3, hw: 1.09 };
const LAADMACHINE = { x0: -0.65, x1: 0.45, floorY: 1.39, roofY: 2.04, hw: 0.66 };
const MACHINE_MATEN = { maaidorser: MAIDORSER, laadmachine: LAADMACHINE };

// De cabine van een machine; zonder naam (bijvoorbeeld een test of een aanroep met
// alleen de klasse) kiezen we op de stoelhoogte: de maaidorser zit hoog (y ~2,3), de
// laadmachine laag (y ~1,2). Beide zijn modelmaten, geen schattingen.
export function machineCab(naam, seat) {
  const m = MACHINE_MATEN[naam];
  if (m) return m;
  return seat && seat.y > 1.8 ? MAIDORSER : LAADMACHINE;
}

// Een volledige layout, net als interiorLayout() in carinteriorlayout.js, plus:
//   cab   = de fysieke cabine/romp van het model (x0..x1, floorY, roofY, hw)
//   shell = de binnenhuid die cabin3d/carinterior tekenen (vloer, wanden, achterwand, dakhemel)
//   hw    = halve breedte van de binnenhuid
function layoutOf(cab, shell, seat, d) {
  return {
    eye: d.eye,
    dash: d.dash,
    binnacle: d.binnacle,
    wheel: d.wheel,
    seats: d.seats,
    console: d.console,
    rear: d.rear === undefined ? null : d.rear,
    mirror: d.mirror,
    roof: d.roof,
    hw: shell.hw,
    cab,
    shell,
    // de hoogte waarop de cabinebouwers de stoelen tekenen: de echte zitting als die in de
    // binnenhuid past, anders net boven de vloer (de kooi van de laadmachine is erg laag)
    seatHoogte: Math.max(seat.y, shell.floorY + 0.02),
  };
}

// Hulpje voor de vaste vorm van een dashboard/kapje: x is het hart van de doos, y de
// onderkant, w de breedte langs z, h de hoogte en d de diepte langs x (zoals de
// bestaande builders in cabin3d/carinterior ze tekenen).
const blok = (x, y, w, h, d) => ({ x, y, w, h, d });

// Trekker (#847): de cabine over de achteras, met het stuur recht voor de bestuurder,
// een buddy seat rechts en de hef/aftakas-hendels op de middenconsole. De cabine is
// 1,98 m breed (0,86·W), dus de binnenhuid is smaller dan de auto-indeling zou denken.
function trekkerLayout(seat, len, wid) {
  const cab = tractorCabMaten(len, wid);
  const hw = cab.hw - 0.03;
  const x0 = cab.x0 + 0.1, x1 = cab.x1 - 0.08;
  const liningY = cab.roofY - 0.12;
  const dashX = x1 - 0.13;
  const dash = blok(dashX - 0.13, seat.y - 0.22, hw * 1.84, 0.5, 0.26);
  return layoutOf(cab,
    { x0, x1, floorY: cab.floorY + 0.04, roofY: liningY, hw },
    seat,
    {
      eye: { x: seat.x + 0.02, y: seat.y + 0.72, z: seat.z },
      dash,
      binnacle: blok(dash.x - 0.02, dash.y + dash.h, 0.44, 0.12, 0.16),
      // het stuur staat rechtop (tilt klein) en dicht bij de bestuurder, zoals op een trekker
      wheel: { x: dashX - 0.34, y: seat.y + 0.28, z: seat.z, r: 0.24, tilt: 0.32 },
      seats: [
        { x: seat.x, z: seat.z },
        { x: seat.x + 0.3, z: seat.z + 0.6 },
      ],
      console: blok(seat.x + 0.34, seat.y - 0.06, 0.34, 0.2, 0.24),
      mirror: { x: x1 - 0.25, y: liningY - 0.14, z: seat.z + 0.25 },
      roof: {
        y: liningY, x0: x0 + 0.02, x1: x1 - 0.04, w: hw * 1.8,
        pillars: [-1, 1].map((s) => ({ side: s, z: s * (hw - 0.06), x0: x1 - 0.04, y0: cab.belt - 0.05, x1: x1 - 0.16, y1: liningY })),
      },
    });
}

// Helikopter (#847): de bel uit heli3d.js. De binnenhuid blijft binnen de bel, anders
// steekt hij door het glas. Rechts zitten (zoals in een echte heli), een cyclic in de
// hand en de hoofdschakelaars op de middenconsole.
function heliLayout(seat) {
  const cab = { x0: -0.35, x1: 1.9, floorY: 0.95, roofY: 2.15, hw: 0.72 };
  const shell = { x0: -0.2, x1: 1.3, floorY: 0.97, roofY: 1.72, hw: 0.6 };
  const liningY = 1.85;
  const dash = blok(1.13, 1.16, shell.hw * 1.9, 0.32, 0.24);
  return layoutOf(cab, shell, seat, {
    eye: { x: seat.x + 0.06, y: seat.y + 0.64, z: seat.z },
    dash,
    binnacle: blok(1.2, 1.48, 0.38, 0.12, 0.18),
    // de cyclic: een korte stok met een kleine greep; autointerieur.js slaat de
    // draaiende stuurring voor de heli over (een heli heeft geen stuurwiel)
    wheel: { x: 1.02, y: seat.y + 0.3, z: seat.z, r: 0.07, tilt: 0.12 },
    seats: [
      { x: seat.x, z: seat.z },
      { x: seat.x, z: -seat.z },
    ],
    console: blok(0.45, seat.y - 0.1, 0.32, 0.26, 0.3),
    mirror: { x: 1.1, y: liningY - 0.05, z: 0 },
    roof: {
      y: liningY, x0: 0.35, x1: 1.05, w: 0.5,
      pillars: [-1, 1].map((s) => ({ side: s, z: s * (shell.hw - 0.06), x0: 1.28, y0: 1.25, x1: 1.2, y1: shell.roofY })),
    },
  });
}

// Vliegtuig (#847): de cockpit in de romp van 1,3 m breed, op de hartlijn. De kap
// (glas) begint op y 1,9; de cockpit blijft eronder, met een yoke en de gashendel
// rechts. De passagier zit achter de piloot (tandem, geen bank).
function vliegtuigLayout(seat, len) {
  const half = PLANE_HALF_W;
  const cab = { x0: -Math.min(len / 2 - 0.05, 3.35), x1: Math.min(len / 2 - 0.05, 3.35), floorY: 0.8, roofY: 2.1, hw: half };
  const shell = { x0: -1.45, x1: 0.95, floorY: 0.85, roofY: 2.0, hw: half - 0.1 };
  const liningY = 1.98;
  const dash = blok(0.76, 1.25, shell.hw * 1.8, 0.34, 0.26);
  return layoutOf(cab, shell, seat, {
    eye: { x: seat.x + 0.05, y: seat.y + 0.72, z: 0 },
    dash,
    binnacle: blok(0.76, 1.59, 0.4, 0.13, 0.18),
    wheel: { x: 0.62, y: seat.y + 0.3, z: -0.08, r: 0.17, tilt: 0.22 },
    seats: [
      { x: seat.x, z: 0 },
      { x: seat.x - 0.8, z: 0 },
    ],
    console: blok(0.35, seat.y + 0.05, 0.24, 0.14, 0.4),
    mirror: { x: 0.6, y: liningY - 0.03, z: 0 },
    roof: {
      y: liningY, x0: -1.2, x1: 0.8, w: shell.hw * 1.8,
      pillars: [-1, 1].map((s) => ({ side: s, z: s * (shell.hw - 0.05), x0: 0.85, y0: 1.55, x1: 0.55, y1: liningY })),
    },
  });
}

// Maaidorser (hoge cabine boven de dorskast) en laadmachine (lage kooi): de indeling
// hangt aan de cabine van het model, niet aan de auto-hoogte. Beide machines hebben
// één zitplaats.
function machineLayout(seat, len, wid, naam) {
  const cab = machineCab(naam, seat);
  const hoog = cab === MAIDORSER || seat.y > 1.8;
  const hw = cab.hw - 0.03;
  const floorY = hoog ? cab.floorY + 0.06 : 1.45;   // maaidorser: op de cabinevloer; laadmachine: op de kooiplaat
  const roofY = hoog ? cab.roofY - 0.1 : 1.92;
  // De kooi van de laadmachine is maar 0,45 m hoog: het oog zit net onder de dakplaat (1,96)
  // en de dakhemel is de onderkant van die plaat. Bij de maaidorser is er echte ruimte.
  const liningY = hoog ? cab.roofY - 0.18 : 1.94;
  const eyeY = seat.y + (hoog ? 0.68 : 0.82);
  const x0 = cab.x0 + 0.07, x1 = cab.x1 - 0.07;
  const seatX = (cab.x0 + cab.x1) / 2 - 0.05;
  const dashFront = x1 - 0.06;
  // Het dashboard van de maaidorser staat in de raamband van de cabine (het model krijgt daar
  // een open glasband van ~2,35 tot ~3,2 m); de laadmachine heeft zijn eigen lage kooi.
  const dashY = hoog ? Math.max(cab.floorY + 0.36, 2.36) : 1.45;
  const dash = hoog
    ? blok(dashFront - 0.12, dashY, hw * 1.86, 0.5, 0.24)
    : blok(dashFront - 0.1, dashY, hw * 1.8, 0.3, 0.2);
  const wheelY = hoog ? dashY + 0.26 : 1.6;
  const wheelX = hoog ? dash.x - 0.28 : 0.05;
  return layoutOf(cab, { x0, x1, floorY, roofY, hw }, seat, {
    eye: { x: seatX + 0.05, y: eyeY, z: seat.z },
    dash,
    binnacle: hoog
      ? blok(dash.x - 0.02, dash.y + dash.h, 0.44, 0.14, 0.2)
      : blok(0.24, 1.75, 0.3, 0.1, 0.14),
    wheel: { x: wheelX, y: wheelY, z: seat.z, r: hoog ? 0.26 : 0.16, tilt: hoog ? 0.4 : 0.3 },
    seats: [{ x: seatX, z: seat.z }],
    console: hoog
      ? blok(seatX + 0.34, dashY + 0.19, 0.32, 0.22, 0.4)
      : blok(seatX + 0.3, Math.max(seat.y + 0.02, floorY + 0.12), 0.28, 0.16, 0.3),
    mirror: hoog
      ? { x: x1 - 0.2, y: liningY - 0.02, z: seat.z }
      : { x: x1 - 0.15, y: liningY - 0.01, z: seat.z },
    roof: {
      y: liningY, x0: x0 + 0.03, x1: x1 - 0.03, w: hw * 1.7,
      pillars: [-1, 1].map((s) => ({ side: s, z: s * (hw - 0.05), x0: x1 - 0.03, y0: hoog ? dashY - 0.1 : 1.52, x1: x1 - 0.12, y1: liningY })),
    },
  });
}

// De cockpit/cabine-indeling van een cockpitklasse (of null voor een auto). seat is
// vehicleSeat(v, true) uit seating3d.js; naam is de modelnaam (voor de machines).
export function cockpitLayout(klasse, seat, len, wid, naam = '') {
  if (!seat) return null;
  switch (klasse) {
    case 'trekker': return trekkerLayout(seat, len, wid);
    case 'heli': return heliLayout(seat);
    case 'vliegtuig': return vliegtuigLayout(seat, len);
    case 'machine': return machineLayout(seat, len, wid, naam);
    default: return null;
  }
}
