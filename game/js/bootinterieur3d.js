// Het interieur van de boten met een roef of stuurhut in beeld (#847, uitbreiding op de LOD-interieurs van
// #833): de betimmering van de rondvaartboot, een sloep met roef, de binnenvaart (spits en kempenaar), het
// zeeschip (vracht, container, tanker), de sleper, de skûtsje-kuip en de open kuip van de zeilboot. De
// indeling komt uit bootinterieur.js (plekken en maten, met tests); dit bestand bouwt de zichtbare 3D.
//
// Prestatie is hier de hele opzet:
//  - één samengevoegde geometrie per (bootsoort, lengte, breedte, detailniveau), gedeeld tussen boten van
//    hetzelfde model en gemaakt met GeoBuilder + markShared, zoals cabin3d.js en businterieur3d.js;
//  - één gedeeld Lambert-materiaal met vertexkleuren voor alle interieurs samen;
//  - één mesh per boot (userData.bootInt) die alleen van geometrie wisselt als de afstand een ander niveau
//    vraagt: er staat nooit een tweede of dubbele variant in de boot;
//  - drie afstandsniveaus, geschaald naar de scheepslengte: kleine sloepen tot 30/60/100 m, zeeschepen
//    mogen verder zichtbaar blijven;
//  - per aanroep worden hooguit BOOT_BUILD_BUDGET nieuwe geometrieën gebouwd, zodat een haven vol boten
//    geen hapering geeft; wie nog niet gebouwd is blijft één frame verborgen;
//  - geen raycasts en geen arrays of objecten per boot per frame in het hete pad (alleen een Map-lookup
//    en wat rekenwerk), en het interieur werpt geen schaduw.
//
// Het eigen-boot-detail (#847 punt 3): zit de speler in deze boot en staat de eerste-persooncamera aan
// (firstPersonOn), dan krijgt dezelfde mesh de detailvariant (niveau 0 plus close-updetails als kompas,
// gashendel, mok en radio) in plaats van het gewone LOD-niveau. Stapt hij uit, dan wisselt de geometrie
// terug; er komt dus nooit een tweede mesh bij. De binnenhuid (vloer, plafond en wanden met de normaal naar
// binnen) zit in niveau 0, zodat je in eerste persoon niet door de achterkanten van het enkelzijdige
// plaatwerk heen kijkt; van buiten is hij onzichtbaar en hij kost geen extra tekenaanroep.
import * as THREE from 'three';
import { GeoBuilder, markShared, composeMatrix } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { hoofdspeler } from './players.js';
import { firstPersonOn } from './firstperson.js';
import { bootInterieur, heeftBootInterieur, bootInterieurKey } from './bootinterieur.js';

// Afstandstrap (#847): Chebyshev-afstand tot de speler (max |dx|, |dy|), dezelfde maat als cabin3d.js en
// businterieur3d.js. De basisstraal geldt voor een boot van 10 m of korter; langere schepen blijven verder
// zichtbaar (tot 2,2x de basisstraal bij 70 m en langer), zodat een zeeschip op het Wad niet als een lege
// brug verdwijnt. 0 = dichtbij (vol interieur), 1 = midden, 2 = ver (blokken), -1 = voorbij de verste.
export const BOOT_LOD_R = [30, 60, 100];   // m: basis tot 30 lod 0, tot 60 lod 1, tot 100 lod 2; verder weg niets
export const BOOT_BUILD_BUDGET = 2;        // nieuwe geometrieën per wereldtick (#847): geen hapering
export const BOOT_EIGEN_LOD = 3;           // detailniveau van de eigen boot in eerste persoon (niveau 0 + extra's)
const MAAT_MIN = 10, MAAT_GROEI = 60, MAAT_MAX = 1.2; // lengte waarop de straal niet meer groeit
const FLOOR = 0x4a3826, WALL = 0x6a5a48, CEILING = 0xc9c3b6, DARK = 0x23262b, GREY = 0x3a3f46;
const SEAT = 0x2e5d8a, SEAT_BACK = 0x264d73, SEAT_TOP = 0x3d74a8, WOOD = 0x8a6440, TRIM = 0x6a707a;
const STEEL = 0x8a8e92, GLASS_INSTR = 0x9ad0e8, ORANGE = 0xd8572a, RED = 0xc0392b, GREEN = 0x2f7d46;
const CREAM = 0xe8e6e0;
const geoCache = new Map();
let material = null;

// De maatfactor: hoe groter het schip, hoe verder zijn interieur zichtbaar mag blijven (1 .. 2,2).
export function bootMaatFactor(lengte) {
  const l = Number.isFinite(lengte) ? lengte : 20;
  return 1 + Math.min(MAAT_MAX, Math.max(0, (l - MAAT_MIN) / MAAT_GROEI));
}

// De afstandstrap als pure functie, zodat de tests en de wereldtick dezelfde grens gebruiken.
export function bootLodAt(afstand, lengte = 20) {
  if (!(afstand >= 0)) return -1;             // NaN of oneindig: geen interieur
  const f = bootMaatFactor(lengte);
  if (afstand < BOOT_LOD_R[0] * f) return 0;
  if (afstand < BOOT_LOD_R[1] * f) return 1;
  if (afstand < BOOT_LOD_R[2] * f) return 2;
  return -1;
}

function bootMateriaal() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

// --- de bouwstenen -----------------------------------------------------------------------------

// Eén bank: kussen met een rugleuning (indien de indeling er een heeft) en op niveau 0 ook poten en een
// sierstrook. Op niveau 2 is het een donker blok: goedkoper kan niet, maar door de ramen leest het nog als
// een zitplaats (net als de stoelblokken van de bus).
function bank(B, b, lod) {
  if (lod >= 2) {
    B.box(b.x, b.y - 0.12, b.z, b.l, 0.3, b.b, SEAT_BACK);
    return;
  }
  B.box(b.x, b.y - 0.05, b.z, b.l, 0.1, b.b, SEAT);
  if (b.rug) B.box(b.x - b.l / 2 - 0.03, b.y + b.rug / 2, b.z, 0.07, b.rug, b.b, SEAT_BACK);
  if (lod === 0) {
    B.box(b.x, b.y + 0.005, b.z, b.l * 0.92, 0.02, b.b * 0.92, SEAT_TOP);
    // een bank die de fitter zelf al tekent (de rondvaartbanken) houdt zijn eigen poten en rugleuning
    if (!b.kaal) for (const s of [-1, 1]) B.box(b.x + s * b.l * 0.35, b.y - 0.2, b.z, 0.07, 0.3, 0.07, DARK);
  }
}

// De plek van het stuurwiel in de scheepsruimte: de torus staat in het XY-vlak, draait om y naar het YZ-vlak
// (de schipper kijkt tegen de ring aan) en kiept daarna met de tilt van de indeling.
const _wheelM = new THREE.Matrix4();
function wheelMatrix(s) {
  return _wheelM.makeTranslation(s.x, s.y, s.z)
    .multiply(new THREE.Matrix4().makeRotationZ(s.tilt || 0))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
}

function stuurWiel(B, s, lod, vloer) {
  if (lod >= 2) {
    B.box(s.x, s.y, s.z, 0.12, 0.4, 0.5, DARK);
    return;
  }
  if (lod === 1) {
    B.geo(new THREE.TorusGeometry(s.r, 0.03, 3, 7), wheelMatrix(s), DARK);
    return;
  }
  const M = wheelMatrix(s);
  B.geo(new THREE.TorusGeometry(s.r, 0.022, 6, 14), M, DARK);
  B.geo(new THREE.BoxGeometry(s.r * 1.66, 0.03, 0.03), M, TRIM);
  B.geo(new THREE.BoxGeometry(0.03, s.r * 1.66, 0.03), M, TRIM);
  B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8).rotateX(Math.PI / 2), M, STEEL);
  // kolom van het stuur naar de vloer; alleen als er echt ruimte onder het stuur zit (een lage sloeproef niet)
  const onder = s.y - s.r - 0.06;
  if (onder - vloer > 0.15) B.box(s.x, vloer + (onder - vloer) / 2, s.z, 0.05, onder - vloer, 0.05, DARK);
}

function helmstok(B, s, lod) {
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, dz = s.z1 - s.z0;
  const len = Math.hypot(dx, dy, dz);
  const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, cz = (s.z0 + s.z1) / 2;
  if (lod >= 2) return; // op de verste afstand is een helmstok van vijf centimeter niet meer te zien
  B.box(cx, cy, cz, len, 0.055, 0.055, WOOD, 0, 0, 0, Math.atan2(dy, dx));
  if (lod === 0) B.box(s.x1, s.y1, s.z1, 0.16, 0.06, 0.06, DARK); // greep
}

// Het instrumentenpaneel: kast, glazen instrumentenplaat en twee lampjes aan de kant van de schipper. De
// indeling zet het paneel vóór het stuur (x groter), dus de bedienkant is de -x-kant.
function paneel(B, p, lod) {
  if (lod >= 2) {
    B.box(p.x, p.y + p.h / 2, p.z, p.l, p.h, p.b, DARK);
    return;
  }
  B.box(p.x, p.y + p.h / 2, p.z, p.l, p.h, p.b, TRIM);
  B.box(p.x, p.y + p.h + 0.015, p.z, p.l * 1.15, 0.03, p.b * 1.05, DARK); // bovenblad
  if (lod === 0) {
    B.box(p.x - p.l / 2 - 0.008, p.y + p.h * 0.52, p.z, 0.02, p.h * 0.55, p.b * 0.8, GLASS_INSTR);
    B.box(p.x - p.l / 2 - 0.02, p.y + p.h * 0.82, p.z - p.b * 0.28, 0.008, 0.05, 0.05, RED);
    B.box(p.x - p.l / 2 - 0.02, p.y + p.h * 0.82, p.z + p.b * 0.28, 0.008, 0.05, 0.05, GREEN);
  }
}

function tafel(B, t, lod) {
  if (lod >= 2) {
    B.box(t.x, t.y - 0.06, t.z, t.l, 0.12, t.b, TRIM);
    return;
  }
  B.box(t.x, t.y - 0.03, t.z, t.l, 0.06, t.b, WOOD);
  B.box(t.x, t.y - 0.06 - t.h / 2, t.z, 0.09, t.h - 0.06, 0.09, DARK);
}

function kombuis(B, k, lod) {
  if (lod >= 2) {
    B.box(k.x, k.y + k.h / 2, k.z, k.l, k.h, k.b, DARK);
    return;
  }
  B.box(k.x, k.y + k.h / 2, k.z, k.l, k.h, k.b, TRIM);                       // aanrechtkast
  B.box(k.x, k.y + k.h + 0.02, k.z, k.l * 1.05, 0.04, k.b * 1.05, STEEL);    // werkblad
  if (lod === 0) {
    B.box(k.x - k.l * 0.2, k.y + k.h + 0.045, k.z, k.l * 0.3, 0.02, k.b * 0.4, GLASS_INSTR); // spoelbak
    B.box(k.x + k.l * 0.25, k.y + k.h + 0.045, k.z, k.l * 0.28, 0.02, k.b * 0.5, DARK);      // kookplaat
    B.box(k.x, k.y + k.h * 0.55, k.z + k.b / 2 + 0.005, k.l * 0.7, 0.03, 0.03, STEEL);       // greep
  }
}

function vest(B, v, lod) {
  if (lod >= 2) return; // op afstand zijn de vesten een paar pixels
  B.box(v.x, v.y, v.z, 0.12, 0.26, 0.2, ORANGE);
  if (lod === 0) B.box(v.x, v.y + 0.02, v.z, 0.13, 0.05, 0.21, CREAM);
}

// De binnenhuid (#847): de romp en de opbouw zijn enkelzijdig, dus zonder deze huid kijk je in eerste persoon
// door de achterkanten van het plaatwerk heen de zee op. Vloer, plafond, de zijwanden onder het raamband en de
// voor- en achterwand onder het raamband, allemaal met de normaal naar binnen: van buiten onzichtbaar en het
// kost geen extra mesh of tekenaanroep, want het zit in dezelfde geometrie. Boven de raamlijn komt er geen
// dichte band: de schipper zit volgens boatSeats zo hoog dat zijn ogen op of net boven de raamlijn staan
// (spits: oog 2,69 bij een raamband tot 2,60; zeeschip: 10,69 bij 10,65), en een dichte band daarboven zou het
// hele uitzicht afsluiten; de binnenkant van het dak blijft als plafond zichtbaar. Alleen op niveau 0
// (in eerste persoon sta je op afstand 0); de verdere niveaus blijven goedkoper.
function binnenhuid(B, L) {
  const { x0, x1, halfW, vloer, dak, raam } = L;
  const P = (x, y, z) => [x, y, z];
  B.quadOut(P(x0, vloer, -halfW), P(x1, vloer, -halfW), P(x1, vloer, halfW), P(x0, vloer, halfW), [0, 1, 0], FLOOR);
  B.quadOut(P(x0, dak, -halfW), P(x1, dak, -halfW), P(x1, dak, halfW), P(x0, dak, halfW), [0, -1, 0], CEILING);
  const yA = Math.min(dak, raam ? raam.y0 : dak);
  if (yA - vloer >= 0.03) {
    for (const s of [-1, 1]) B.quadOut(P(x0, vloer, s * halfW), P(x1, vloer, s * halfW), P(x1, yA, s * halfW), P(x0, yA, s * halfW), [0, 0, -s], WALL);
    B.quadOut(P(x0, vloer, -halfW), P(x0, vloer, halfW), P(x0, yA, halfW), P(x0, yA, -halfW), [1, 0, 0], WALL);
    B.quadOut(P(x1, vloer, -halfW), P(x1, vloer, halfW), P(x1, yA, halfW), P(x1, yA, -halfW), [-1, 0, 0], WALL);
  }
}

// De close-updetails van de eigen boot (#847 punt 3): alleen in de detailvariant, die de speler te zien
// krijgt als hij zelf in deze boot zit in eerste persoon. Een kompas, gashendel, koffiemok en marifoon bij
// het stuur, een zeekaart op tafel en een waterkoker op het kombuisje: klein spul dat dichtbij het verschil
// maakt en op afstand wegblijft.
function eigenDetail(B, L) {
  const p = L.paneel;
  if (p) {
    const top = p.y + p.h + 0.03;
    B.box(p.x, top, p.z, 0.1, 0.04, 0.1, STEEL);                                   // kompasvoet
    B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 8), composeMatrix(p.x, top + 0.035, p.z), GLASS_INSTR);
    B.box(p.x, top + 0.06, p.z - 0.02, 0.02, 0.012, 0.07, RED);                    // kompasnaald
    B.geo(new THREE.CylinderGeometry(0.042, 0.036, 0.09, 7), composeMatrix(p.x - p.l * 0.2, top + 0.06, p.z + p.b * 0.3), CREAM); // mok
    B.box(p.x + p.l * 0.1, p.y + p.h - 0.07, p.z - p.b * 0.32, 0.08, 0.12, 0.22, DARK); // marifoon
    B.box(p.x + p.l * 0.1, p.y + p.h + 0.12, p.z - p.b * 0.32, 0.012, 0.22, 0.012, STEEL); // antenne
  }
  const s = L.stuur;
  if (s.soort === 'wiel') {
    B.box(s.x + 0.05, s.y - s.r, s.z + 0.28, 0.26, 0.06, 0.09, DARK);              // gashendelhuis
    B.box(s.x + 0.1, s.y - s.r + 0.06, s.z + 0.28, 0.05, 0.14, 0.045, DARK, 0, 0, 0.3); // hendel
  } else {
    B.box(s.x1 - 0.04, s.y1 + 0.06, s.z1, 0.06, 0.14, 0.06, DARK);                 // klem op de helmstok
  }
  if (L.tafel) B.box(L.tafel.x, L.tafel.y + 0.016, L.tafel.z, L.tafel.l * 0.72, 0.02, L.tafel.b * 0.72, CREAM); // zeekaart
  if (L.kombuis) {
    B.geo(new THREE.CylinderGeometry(0.075, 0.085, 0.16, 8), composeMatrix(L.kombuis.x, L.kombuis.y + L.kombuis.h + 0.12, L.kombuis.z), STEEL); // waterkoker
  }
}

// De inrichting per niveau (#847):
//   0 = de volle inrichting plus de binnenhuid (vloer, plafond, wanden en raamband) voor het zicht van binnen
//       in eerste persoon, met het stuur als ring met spaken;
//   1 = banken met rugleuning, stuur en paneel zonder kolom, banken zonder poten en sierstrook, geen klein spul;
//   2 = alleen donkere blokken op de plek van de banken, het stuur en het paneel.
// level BOOT_EIGEN_LOD bouwt niveau 0 plus de close-updetails (eigenDetail).
export function buildBootInterieur(L, lod = 0, extra = false) {
  const B = new GeoBuilder(1);
  if (lod === 0) {
    if (!L.open) binnenhuid(B, L);
    for (const b of L.banken) bank(B, b, 0);
    if (L.bemanningsbank) bank(B, L.bemanningsbank, 0);
    if (L.stuur.soort === 'wiel') stuurWiel(B, L.stuur, 0, L.vloer);
    else helmstok(B, L.stuur, 0);
    if (L.paneel) paneel(B, L.paneel, 0);
    if (L.tafel) tafel(B, L.tafel, 0);
    if (L.kombuis) kombuis(B, L.kombuis, 0);
    for (const v of L.vesten) vest(B, v, 0);
    if (extra) eigenDetail(B, L);
    return B.build();
  }
  if (lod === 1) {
    for (const b of L.banken) bank(B, b, 1);
    if (L.bemanningsbank) bank(B, L.bemanningsbank, 1);
    if (L.stuur.soort === 'wiel') stuurWiel(B, L.stuur, 1, L.vloer);
    else helmstok(B, L.stuur, 1);
    if (L.paneel) paneel(B, L.paneel, 1);
    return B.build();
  }
  // niveau 2: de goedkoopste blokken
  for (const b of L.banken) bank(B, b, 2);
  if (L.bemanningsbank) bank(B, L.bemanningsbank, 2);
  if (L.stuur.soort === 'wiel') stuurWiel(B, L.stuur, 2, L.vloer);
  else helmstok(B, L.stuur, 2);
  if (L.paneel) paneel(B, L.paneel, 2);
  return B.build();
}

// Gedeelde geometrie per (soort, maat, niveau). Een niveau dat er nog niet is wordt alleen gebouwd als het
// budget van deze aanroep dat toestaat (#847); anders volgt null en blijft de boot één frame verborgen.
function bootGeometrie(v, lod, allowBuild) {
  const k = `${bootInterieurKey(v)}|${lod}`;
  let g = geoCache.get(k);
  if (!g && allowBuild) {
    const L = bootInterieur(v);
    g = markShared(buildBootInterieur(L, lod === BOOT_EIGEN_LOD ? 0 : lod, lod === BOOT_EIGEN_LOD));
    geoCache.set(k, g);
  }
  return g || null;
}

// Eén keer per frame: boten in de buurt krijgen hun interieur op het juiste detailniveau. De afstand wordt
// eerst bepaald (Chebyshev, geen Math.hypot, geen arrays per boot); gebouwd wordt lazy en hooguit
// BOOT_BUILD_BUDGET nieuwe geometrieën per aanroep, zodat een haven vol boten niet in één frame hangt.
// Zit de lokale speler zelf in een boot met de eerste-persooncamera aan, dan krijgt die boot de detailvariant
// (#847 punt 3); bij uitstappen wisselt dezelfde mesh terug naar het gewone niveau.
function updateBootInterieurs(dt, w) {
  const p = hoofdspeler(w);
  if (!p) return;                          // nog geen speler (laden of test): niets te doen
  const eigenBoot = p.inVehicle && p.inVehicle.isBoat ? p.inVehicle : null;
  const eigenAan = !!eigenBoot && firstPersonOn(w);
  let budget = BOOT_BUILD_BUDGET;
  for (const v of w.vehicles) {
    if (!v.isBoat) continue;
    const mesh = getVehicleMesh(v.id);
    if (!mesh) continue;
    const ud = mesh.userData;
    if (!heeftBootInterieur(v)) {          // open boot, wrak of zinkende boot: geen inrichting
      if (ud.bootInt) ud.bootInt.visible = false;
      continue;
    }
    let lod;
    if (v === eigenBoot && eigenAan) lod = BOOT_EIGEN_LOD;
    else {
      const dx = Math.abs(v.x - p.x), dy = Math.abs(v.y - p.y);
      lod = bootLodAt(Math.max(dx, dy), v.model.len); // Math.max maakt een NaN-positie meteen onzichtbaar
    }
    if (lod < 0) {                          // voorbij de verste afstand: uit
      if (ud.bootInt) ud.bootInt.visible = false;
      continue;
    }
    if (ud.bootIntLod !== lod) {
      const cached = geoCache.size;
      const g = bootGeometrie(v, lod, budget > 0);
      if (!g) {                             // nog geen budget voor deze geometrie: één frame verborgen
        if (ud.bootInt) ud.bootInt.visible = false;
        continue;
      }
      if (geoCache.size > cached) budget--; // er is echt een nieuwe geometrie gebouwd
      if (!ud.bootInt) {
        ud.bootInt = new THREE.Mesh(g, bootMateriaal());
        ud.bootInt.name = 'bootinterieur';
        ud.bootInt.renderOrder = 11;        // na het dek en de opbouw, zoals de cabine (cabin3d.js)
        ud.bootInt.castShadow = false;      // het interieur werpt geen schaduw: dat kost een extra shadow-pass
        ud.bootInt.receiveShadow = false;
        ud.bootInt.userData.noBatch = true;
        (ud.body || mesh).add(ud.bootInt);  // boten hebben geen userData.body: de mesh zelf is de romp
      } else ud.bootInt.geometry = g;       // zelfde mesh, alleen de geometrie wisselt (#847)
      ud.bootIntLod = lod;
    }
    ud.bootInt.visible = true;
  }
}

// De wereldtick (#847): main.js registreert deze kind; dit bestand raakt main.js niet aan.
export const bootInterieurKind = { id: 'bootinterieur', tickPhase: 'world', tick: updateBootInterieurs };
