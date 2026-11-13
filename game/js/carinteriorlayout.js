// Layout of the car interior (dashboard, wheel, seats) in vehicle-local
// metres: +x forward, +z right, y up from the ground. Pure numbers, no
// three.js, so scripts/carinterior_test.mjs can check it in plain node.
// De cockpitklassen (trekker, heli, vliegtuig, machines, #847) hebben een eigen
// indeling in cockpitlayout.js; deze module kiest alleen welke klasse een
// voertuig is en houdt de auto-indeling voor de auto's, bestelbussen en
// vrachtwagens.
import { isCockpitKlasse, cockpitLayout } from './cockpitlayout.js';

// Open vehicles have no cabin to dress.
const NO_INTERIOR = new Set(['quad']);

// Vehicles with a cabin we dress: cars, vans, trucks and buses (the driver's
// cab only), the tractor, heli, plane and the farm machines (#847); not boats,
// bikes, scooters or quads.
export function hasCarInterior(v) {
  if (!v || !v.model || v.isBoat || v.isBike || v.isScooter) return false;
  if (v.isHeli || v.isPlane) return true;
  return !NO_INTERIOR.has(v.model.name);
}

// De cockpitklassen hebben een eigen, pure indeling (cockpitlayout.js); dit is de
// brug ernaartoe, zodat cabin3d.js en carinterior.js één ingang houden.
export function isCockpit(v) {
  return !!v && hasCarInterior(v) && isCockpitKlasse(interiorKlasse(v));
}

// seat = vehicleSeat(v, true): { x, y (cushion top), z }
// romp = carBodyFit(v) (models3d_vehicles.js): de raamlijn en het dak van de echte carrosserie.
// Zonder romp (vrachtwagen, bus, foodtruck, een test) gelden de oude, ruime maten.
// klasse: 'auto' (standaard) of een cockpitklasse; naam: de modelnaam (voor de machines).
export function interiorLayout(seat, len, wid, romp = null, klasse = 'auto', naam = '') {
  if (isCockpitKlasse(klasse)) return cockpitLayout(klasse, seat, len, wid, naam);
  const hw = wid / 2;
  const sx = seat.x, sy = seat.y, sz = seat.z;
  const side = sz < 0 ? 1 : -1; // z of the passenger seat is the mirror image
  const roof = roofLayout(sx, sy, sz, len, wid, hw, romp);
  const d = dashLayout(sx, sy, wid, romp);
  return {
    eye: { x: sx + 0.05, y: sy + 0.62, z: sz },
    dash: d.dash,
    binnacle: d.binnacle,
    wheel: { ...d.wheel, z: sz, r: 0.17, tilt: 0.45 },
    seats: [
      { x: sx, z: sz },
      { x: sx, z: sz + side * Math.min(hw * 0.68, 0.8) },
    ],
    console: { x: sx + 0.3, y: sy - 0.02, z: (sz + (sz + side * Math.min(hw * 0.68, 0.8))) / 2, w: 0.7, h: 0.2, d: 0.2 },
    rear: len > 3.6 && len <= 6.5 ? { x: sx - 1.0, y: sy, w: wid - 0.3 } : null,
    // de binnenspiegel hangt aan de voorkant van de dakhemel, achter de bovenkant van de voorruit (#442)
    mirror: romp
      ? { x: Math.max(roof.x1 - 0.08, sx + 0.1), y: roof.y - 0.16, z: sz + side * 0.28 }
      : { x: sx + 0.72, y: roof.y - 0.14, z: sz + side * 0.28 },
    // dakbekleding vanaf de voorruit tot achter de laatste stoel, met een A-stijl per kant
    roof,
    hw,
  };
}

// Dashboard, instrumentenpaneel en stuur. Met een romp staat de bovenkant van het dashboard op de
// raamlijn en blijft de voorkant achter de onderkant van de voorruit, zodat je het dashboard en het
// stuur door de ruiten ziet en er niet doorheen kijkt.
function dashLayout(sx, sy, wid, romp) {
  const d = romp ? 0.46 : 0.5;
  const top = romp ? romp.belt - 0.1 : sy + 0.34;
  const front = romp ? Math.min(sx + 1.1, romp.xA - 0.05) : sx + 1.1;
  const wheel = romp
    ? { x: front - d / 2 - 0.14, y: Math.max(sy + 0.32, Math.min(top - 0.06, sy + 0.42)) }
    : { x: sx + 0.52, y: sy + 0.32 };
  return {
    dash: { x: front - d / 2, y: top - 0.44, w: Math.max(0.8, wid - 0.16), h: 0.44, d },
    binnacle: { x: wheel.x + 0.1, y: top + 0.02, w: 0.46, h: 0.16, d: 0.22 },
    wheel,
  };
}

// Dakhemel en A-stijlen. Boven het hoofd, onder het plaatwerk: een kleine marge boven de oogpunthoogte
// (grotere cabines, zoals bestel- en vrachtwagen en bus, hebben meer ruimte). Met een romp liggen de
// dakhemel en de A-stijlen precies onder het echte dak en langs de voorruit.
function roofLayout(sx, sy, sz, len, wid, hw, romp = null) {
  const zp = hw - 0.09;
  if (romp) {
    // onder het plaatswerk van het dak en binnen de ruit, zodat de hemel door de ramen te zien is en
    // niet in het dak verdwijnt
    const y = romp.roof - 0.14;
    return {
      y, x0: romp.xC + 0.02, x1: romp.xB - 0.02, w: Math.max(0.6, Math.min(wid - 0.3, wid * 0.8)),
      // de A-stijl net binnen het glas, anders zweeft hij boven de raamlijn buiten de ruit
      pillars: [-1, 1].map((s) => ({ side: s, z: s * (hw * 0.84 - 0.03), x0: romp.xA + 0.02, y0: romp.belt - 0.04, x1: romp.xB - 0.02, y1: y })),
    };
  }
  const big = len > 6.5 || sy > 0.55;
  const y = sy + 0.62 + (big ? 0.5 : 0.44);
  const front = sx + 1.0;
  const back = sx - (len > 3.6 && len <= 6.5 ? 1.35 : 0.55);
  const dashTop = sy - 0.1 + 0.44;
  return {
    y, x0: back, x1: front, w: Math.max(0.6, wid - 0.22),
    pillars: [-1, 1].map((s) => ({ side: s, z: s * zp, x0: front + 0.12, y0: dashTop, x1: front - 0.08, y1: y })),
  };
}

// Portierbekleding aan de binnenkant, op de plek van de echte deuren (vehicledoors.js DEUR_DEFS).
// defs: doorsFor(v); alleen draaideuren met stoel (geen kap, klep of bus-schuifdeur). Elke bekleding hoort bij
// een deur-id, zodat hij verdwijnt zodra die deur openstaat of los is (carinterior.js).
// hw: halve breedte van de binnenhuid; bij de trekker is de cabine smaller dan model.wid/2 (#847).
export function doorTrims(defs, len, wid, hw = wid / 2) {
  const out = [];
  for (const d of defs || []) {
    if (d.soort !== 'scharnier' && d.soort !== 'achterscharnier') continue;
    if (!d.seat || !d.side) continue;
    const w = d.w * 0.9;
    const x = d.x * len;
    const h = Math.min(0.62, d.h);   // tot de onderkant van het raam
    out.push({
      id: d.id, side: d.side, x, z: d.side * (hw - 0.07), w, y: d.y0 + h / 2, h,
      arm: { x: x + w * 0.1, y: d.y0 + h * 0.8, z: d.side * (hw - 0.12), w: w * 0.5 },
      handle: { x: x - d.w * 0.3, y: d.y0 + h * 0.85, z: d.side * (hw - 0.1) },
    });
  }
  return out;
}

// De binnenhuid die cabin3d.js (van buiten) en carinterior.js (de eigen auto in eerste
// persoon) tekenen: vloer, zijwanden en achterwand. Voor de cockpitklassen komen de maten
// uit cockpitlayout.js (L.shell); voor de auto's gelden de oude regels, zodat de bestaande
// interieurs en hun tests niet veranderen. sh is de verschuiving van een korte neus; cabin3d
// schuift het dashboard ermee terug, carinterior (de eigen auto) niet.
export function innerShell(seat, len, wid, L, romp = null) {
  if (L.shell) return { x0: L.shell.x0, x1: L.shell.x1, floorY: L.shell.floorY, roofY: L.shell.roofY, hw: L.hw, sh: 0 };
  const hw = wid / 2;
  const floorY = Math.max(0.3, seat.y - 0.34);
  const roofY = romp ? romp.belt - 0.02 : seat.y + 0.42;
  const sh = -Math.max(0, L.dash.x + L.dash.d / 2 - (len / 2 - 0.12));
  const x1 = L.dash.x + L.dash.d / 2 - 0.05;
  const x0 = L.rear ? L.rear.x - 0.45 : (romp ? seat.x - 0.55 : L.roof.x0 - 0.1);
  return { x0, x1, floorY, roofY, hw, sh };
}

// --- interieur per voertuigklasse (#51) ---------------------------------------------------
// Welke inrichting een voertuig krijgt. Pure keuze, voor scripts/carinterior_test.mjs.
// De cockpitklassen (#847) staan vooraan: een heli of kist heet in het model anders dan
// een auto en mag nooit in de auto-indeling vallen.
export function interiorKlasse(v) {
  if (!v || !v.model) return 'auto';
  if (v.isHeli) return 'heli';
  if (v.isPlane) return 'vliegtuig';
  const n = v.model.name;
  if (n === 'tractor') return 'trekker';
  if (n === 'maaidorser' || n === 'laadmachine') return 'machine';
  if (v.isBus || n === 'bus' || n === 'midibus') return 'bus';
  if (v.isAmbulance) return 'ambulance';
  if (v.isPolice) return 'politie';
  if (n === 'taxi' || v.isTaxi) return 'taxi';
  if (n === 'sport') return 'sport';
  if (n === 'truck' || n === 'foodtruck') return 'vrachtwagen';
  if (n === 'van' || n === 'cashvan') return 'bestel';
  return 'auto';
}

// Stuur, stoelkleur en extra onderdelen per klasse, in dezelfde voertuigcoördinaten als interiorLayout.
// extras: { b: [breedte langs x, hoogte, breedte dwars z], at: [x, y, z], color }. Alles anoniem, geen merken.
export function klasseStijl(klasse, L, seat) {
  const sx = seat.x, sy = seat.y, sz = seat.z;
  const side = sz < 0 ? 1 : -1;
  const passZ = sz + side * Math.min(L.hw * 0.68, 0.8);
  const dtop = L.dash.y + L.dash.h; // bovenkant dashboard: hierop staan de losse onderdelen
  const base = { wheel: {}, seatColor: null, rearColor: null, seatTilt: 0.2, rear: undefined, extras: [] };
  switch (klasse) {
    case 'sport':
      return { ...base, wheel: { r: 0.15, tilt: 0.6 }, seatColor: 0x5a2a2a, seatTilt: 0.5, rear: null, extras: [
        { b: [0.55, 0.12, 0.2], at: [sx + 0.28, sy + 0.08, (sz + passZ) / 2], color: 0x1b1d20 },       // hoge middentunnel
        { b: [0.04, 0.04, 0.5], at: [sx - 0.62, sy + 0.48, 0], color: 0x2a2d32 },                       // rolbeugel dwars
      ] };
    case 'taxi': {
      // Een taxi is een sedan met een ingerichte passagiersruimte (#442): het taxameter en de betaalautomaat
      // voor de bestuurder, en achter de voorstoelen een scheidingsruit met leeslampjes in de hemel. De
      // achterbank zelf staat op de gewone plek (carinteriorlayout rear, seating3d ACHTERBANK), alleen in
      // donker leer in plaats van de grijze stof van een gewone auto.
      // de scheiding blijft onder de dakhemel (L.roof.y is de onderkant daarvan)
      const rail = L.roof.y - 0.06, onder = sy + 0.44;
      return { ...base, seatColor: 0x24272c, rearColor: 0x24272c, extras: [
        { b: [0.12, 0.1, 0.16], at: [sx + 0.62, dtop + 0.06, sz + side * 0.34], color: 0x20262c },     // taxameter op het dashboard
        { b: [0.02, 0.05, 0.12], at: [sx + 0.555, dtop + 0.06, sz + side * 0.34], color: 0xd9a21c },   // het display, naar de bestuurder
        { b: [0.1, 0.06, 0.18], at: [sx + 0.34, sy + 0.12, sz + side * 0.55], color: 0x20262c },       // betaalautomaat op de tunnel
        { b: [0.02, 0.05, 0.1], at: [sx + 0.29, sy + 0.15, sz + side * 0.55], color: 0x9ad0e8 },       // pinautomaat-scherm
        { b: [0.05, 0.06, 0.2], at: [sx + 0.5, dtop + 0.04, sz - side * 0.1], color: 0x3f9a63 },       // "vrij"-bord naast de taxameter
        ...[rail, onder].map((y) => ({ b: [0.04, 0.05, L.hw * 1.5], at: [sx - 0.42, y, 0], color: 0x2a2f36 })),
        ...[-1, 1].map((s) => ({ b: [0.04, rail - onder, 0.04], at: [sx - 0.42, (rail + onder) / 2, s * L.hw * 0.72], color: 0x2a2f36 })),
        { b: [0.015, 0.36, L.hw * 1.34], at: [sx - 0.42, (rail + onder) / 2 + 0.02, 0], color: 0xa8bccb }, // de ruit van de scheiding
        ...(L.rear ? [-1, 1].map((s) => ({ b: [0.1, 0.03, 0.16], at: [L.rear.x + 0.3, L.roof.y - 0.055, s * 0.3], color: 0xf4e6c0 })) : []),
      ] };
    }
    case 'politie': {
      // De politieauto heeft achter de voorstoelen een kooi in plaats van een dicht schot (#442): twee rails
      // en vier spijlen, zodat je er doorheen kijkt. Achterin een harde kunststof bank, voorin de mobilofoon
      // met de blauwe en rode toets en een stopbord op het dashboard. De kooi blijft onder de dakhemel.
      const rail = L.roof.y - 0.06, voet = sy + 0.2;
      return { ...base, seatColor: 0x2f3338, rearColor: 0x2f3338, extras: [
        { b: [0.22, 0.04, 0.3], at: [sx + 0.3, sy + 0.18, (sz + passZ) / 2], color: 0x1a1d20 },        // laptophouder
        { b: [0.1, 0.12, 0.14], at: [sx + 0.62, dtop + 0.07, sz + side * 0.34], color: 0x2a2f3a },       // portofoon
        ...[rail, voet].map((y) => ({ b: [0.05, 0.05, L.hw * 1.7], at: [sx - 0.5, y, 0], color: 0x3a3f46 })), // boven- en onderrail van de kooi
        ...[-0.62, -0.2, 0.2, 0.62].map((z) => ({ b: [0.04, rail - voet, 0.04], at: [sx - 0.5, (rail + voet) / 2, z * L.hw], color: 0x3a3f46 })),
        ...[-1, 1].map((s) => ({ b: [0.05, rail - voet, 0.05], at: [sx - 0.5, (rail + voet) / 2, s * L.hw * 0.84], color: 0x3a3f46 })),
        { b: [0.16, 0.07, 0.2], at: [sx + 0.3, sy + 0.14, sz + side * 0.52], color: 0x20262c },         // mobilofoon in de tunnel
        { b: [0.02, 0.015, 0.05], at: [sx + 0.3, sy + 0.18, sz + side * 0.46], color: 0x2f6bff },
        { b: [0.02, 0.015, 0.05], at: [sx + 0.3, sy + 0.18, sz + side * 0.58], color: 0xd2422e },
        { b: [0.05, 0.2, 0.28], at: [sx + 0.44, dtop + 0.1, sz + side * 0.62], color: 0xe8e6e0 },       // stopbord op het dashboard
        { b: [0.02, 0.06, 0.24], at: [sx + 0.41, dtop + 0.15, sz + side * 0.62], color: 0xb0342c },
        { b: [0.05, 0.05, 0.24], at: [sx - 0.47, sy + 0.74, -L.hw * 0.45], color: 0x1a1d20 },           // zaklamp aan de kooi
      ] };
    }
    case 'ambulance':
      return { ...base, rear: null, extras: [
        { b: [0.06, 0.9, L.hw * 1.7], at: [sx - 0.5, sy + 0.5, 0], color: 0x9aa3ad },                  // wand naar de laadruimte
        { b: [0.14, 0.1, 0.2], at: [sx + 0.6, dtop + 0.06, sz + side * 0.34], color: 0xc22b2b },        // sirenebediening
      ] };
    case 'bestel':
      return { ...base, seatTilt: 0.12, rear: null, extras: [
        { b: [0.04, 0.9, L.hw * 1.7], at: [sx - 0.52, sy + 0.55, 0], color: 0x3a3f46 },                // wand voor de laadruimte
        { b: [0.3, 0.05, 0.4], at: [sx + 0.45, sy + 0.14, passZ], color: 0x6a707a },                   // klembord-plank
      ] };
    case 'vrachtwagen':
      return { ...base, wheel: { r: 0.25, tilt: 0.15 }, seatTilt: 0.1, rear: null, extras: [
        { b: [0.9, 0.3, L.hw * 1.7], at: [sx - 0.78, sy + 0.1, 0], color: 0x3c4148 },                  // slaapbank achter de stoelen
        { b: [0.16, 0.06, 0.22], at: [sx + 0.55, dtop + 0.08, sz + side * 0.3], color: 0x20262c },      // boordcomputer
      ] };
    case 'bus':
      return { ...base, wheel: { r: 0.28, tilt: 0.08 }, seatTilt: 0.1, rear: null, extras: [
        { b: [0.3, 0.2, 0.3], at: [sx + 0.55, sy + 0.2, sz + side * 0.62], color: 0x2a2f3a },          // kaartjesautomaat
        { b: [0.03, 0.9, 0.04], at: [sx + 0.2, sy + 0.7, sz + side * 0.45], color: 0x6a707a },         // paal naast de bestuurder
      ] };
    // --- cockpitklassen (#847) ---------------------------------------------------------
    // De cabine van de trekker is smaller dan model.wid/2; L.hw komt uit cockpitlayout.js en
    // alle extra's schalen daarmee mee, zodat ze ook in een kleinere trekker binnenblijven.
    case 'trekker':
      return { ...base, seatColor: 0x3b3326, seatTilt: 0.1, rear: null, extras: [
        { b: [0.08, 0.42, 0.08], at: [sx + 0.32, sy + 0.12, sz + L.hw * 0.55], color: 0x2a2d32 },     // hefhendel
        { b: [0.06, 0.3, 0.06], at: [sx + 0.5, sy + 0.06, sz + L.hw * 0.3], color: 0x2a2d32 },        // aftakashendel
        { b: [0.18, 0.06, 0.32], at: [L.dash.x + 0.02, dtop + 0.03, sz + L.hw * 0.42], color: 0x20262c }, // bedieningspaneel op het dashboard
        { b: [0.02, 0.08, 0.2], at: [L.dash.x - 0.13, dtop + 0.02, sz + L.hw * 0.42], color: 0x9ad0e8 },   // diesel-/toerentellerscherm
        { b: [0.05, 0.05, 0.05], at: [sx - 0.1, sy + 0.72, sz + L.hw * 0.7], color: 0xd9a21c },       // zwaailampje in de hemel
      ] };
    case 'heli':
      return { ...base, seatColor: 0x2a2f36, rear: null, extras: [
        { b: [0.06, 0.38, 0.06], at: [sx + 0.12, sy + 0.08, sz - L.hw * 0.75], color: 0x1c1d20 },     // collective links van de piloot
        { b: [0.1, 0.05, 0.1], at: [sx + 0.12, sy + 0.3, sz - L.hw * 0.75], color: 0x3a3f46 },        // greep van de collective
        { b: [0.2, 0.18, 0.28], at: [sx + 0.3, L.dash.y + L.dash.h + 0.09, 0], color: 0x20262c },     // middenconsole met schakelaars
        { b: [0.02, 0.05, 0.16], at: [sx + 0.2, L.dash.y + L.dash.h + 0.1, 0], color: 0x2fd05a },     // groene hoofdschakelaar
        { b: [0.02, 0.05, 0.16], at: [sx + 0.2, L.dash.y + L.dash.h + 0.1, L.hw * 0.25], color: 0xd83a2a },
      ] };
    case 'vliegtuig':
      return { ...base, seatColor: 0x4a3a2a, rear: null, extras: [
        { b: [0.1, 0.16, 0.08], at: [sx + 0.45, sy + 0.16, sz + L.hw * 0.5], color: 0x2a2d32 },       // gashendel rechts
        { b: [0.06, 0.14, 0.14], at: [sx + 0.55, sy + 0.16, sz + L.hw * 0.5], color: 0x9ad0e8 },      // gashendelknop
        { b: [0.02, 0.1, 0.24], at: [sx + 0.8, L.dash.y + L.dash.h - 0.12, sz], color: 0x20262c },    // instrumentenrij
        { b: [0.015, 0.04, 0.06], at: [sx + 0.79, L.dash.y + L.dash.h - 0.1, sz - 0.05], color: 0x9ad0e8 },
        { b: [0.015, 0.04, 0.06], at: [sx + 0.79, L.dash.y + L.dash.h - 0.1, sz + 0.05], color: 0x9ad0e8 },
      ] };
    case 'machine': {
      // Maaidorser en laadmachine (#847): één zitplaats, twee joysticks op de armsteunen (heffen
      // en de bak/maaitafel) en een paneel met de oogst-/lastindicatie. De joysticks hangen aan de
      // cabine, niet aan de zitting: bij de laadmachine staat de zitting laag in de kooi en anders
      // zouden ze onder de vloerplaat verdwijnen. cabY/cabZ schalen met de cabine van het model.
      const cabY = Math.max(sy + 0.08, L.cab.floorY + 0.16);
      const cabZ = L.cab.hw * 0.55;
      return { ...base, seatColor: 0x2f3338, seatTilt: 0.12, rear: null, extras: [
        { b: [0.07, 0.26, 0.07], at: [sx + 0.12, cabY, sz + cabZ], color: 0x1c1d20 },                  // joystick rechts (heffen)
        { b: [0.07, 0.26, 0.07], at: [sx + 0.12, cabY, sz - cabZ], color: 0x1c1d20 },                  // joystick links (bak/maaitafel)
        { b: [0.05, 0.05, 0.05], at: [sx + 0.12, cabY + 0.16, sz + cabZ], color: 0xb8322a },           // rode knop op de joystick
        { b: [0.16, 0.1, 0.26], at: [L.dash.x + 0.02, dtop + 0.05, sz + L.hw * 0.5], color: 0x20262c },   // bedieningspaneel op het dashboard
        { b: [0.02, 0.06, 0.18], at: [L.dash.x - 0.12, dtop + 0.06, sz + L.hw * 0.5], color: 0x9ad0e8 },  // indicatiescherm
      ] };
    }
    default:
      return base;
  }
}

// Wrakvariant (#847): het interieur van een uitgebrand voertuig. Pure stijl, zodat cabin3d.js
// hem per klasse/maat kan delen: roetzwarte binnenhuid, verschroeide bekleding, een scheef
// dashboard, een verwrongen stoel en losse panelen op de vloer. Geen reizigers, geen
// dakhemel en geen spiegels; die zijn in een wrak weggebrand of eruit gerukt.
export function wrakStijl(klasse, L, seat) {
  const K = klasseStijl(klasse, L, seat);
  const sx = seat.x, sy = seat.y, hw = L.hw;
  return {
    seatColor: 0x232120,
    rearColor: 0x1e1d1c,
    seatTilt: (K.seatTilt || 0.2) + 0.45,   // de rugleuning staat scheef
    seatScheef: 0.32,                      // en de zitting is opzij gedraaid
    seatKwijt: true,                       // de bijrijdersstoel/het tweede zitvlak is weg
    soot: 0x17181a,                        // vloer en wanden
    ash: 0x2a2825,                         // as en brokstukken
    rust: 0x5a3a24,                        // verbrande rand
    panel: 0x1c1b19,                       // een losgeslagen paneel
    // losse panelen en brokstukken op de vloer; at = [x, y, z], b = [x, y, z] maten
    brokstukken: [
      { b: [0.42, 0.05, 0.3], at: [sx - 0.45, Math.max(0.34, sy - 0.3), 0.12], color: 0x1c1b19 },
      { b: [0.16, 0.1, 0.2], at: [sx + 0.24, Math.max(0.36, sy - 0.26), -hw * 0.5], color: 0x2a2825 },
      { b: [0.1, 0.06, 0.3], at: [sx - 0.1, Math.max(0.32, sy - 0.31), hw * 0.28], color: 0x5a3a24 },
    ],
  };
}
