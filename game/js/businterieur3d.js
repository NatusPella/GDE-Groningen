import { hoofdspeler } from './players.js';
// De passagiersruimte van de bus in beeld (#444, #442, #833, #847): stoelen, haltestangen, handrail en reizigers die
// zitten of staan, door de ramen en de open deuren te zien en bij de binnenin-camera (V). De maten komen uit
// businterieur.js (met tests). De ruimte heeft drie detailniveaus op afstand (LOD): dichtbij de hele inrichting met
// reizigers, halfverwege de stoelen met de haltestangen en de handrail (zonder poten, loper en de helft van de stangen)
// en de reizigers, ver alleen stoelblokken zonder reizigers. Het dichtbije niveau heeft ook een enkelzijdige
// binnenhuid (vloer, plafond, wanden met deurgaten en een sluitwand), zodat je in eerste persoon niet door de
// achterkant van de enkelzijdige buscarrosserie heen de straat en de lucht ziet.
// Een gelede bus heeft twee eenheden (#847): de voorste inrichting hangt in de vehicle-mesh, die van de achterwagen
// hangt aan de trailer-groep (mesh.userData.busRear, models3d_vehicles.js) en draait dus mee met setBusRearAngle.
// Per eenheid is er één mesh die alleen van geometrie wisselt; de geometrie is gedeeld per (soort, maat, eenheid,
// niveau). Reizigers zijn er alleen dichtbij en nooit in een wrak. Een wrak (#847) krijgt een eigen, gedeelde
// wrakvariant (verkoold, scheef, geen reizigers) en zijn blinde glas wordt doorzichtig gemaakt, anders is de
// wrakruimte door de ramen niet te zien. Meldt zich in main.js als kind.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { busInterieur, midibusInterieur, bezetting, verdeelReizigers, ruimteReizigers, coopBezet, GANG } from './businterieur.js';

// Afstandstrap (#833): Chebyshev-afstand tot de speler (max |dx|, |dy|), dezelfde maat als cabin3d.js.
// 0 = dichtbij (volle inrichting + reizigers), 1 = midden (stoelen, stangen en handrail + reizigers),
// 2 = ver (alleen stoelblokken), -1 = voorbij de verste. Pure functie, zodat de tests dezelfde grens gebruiken.
export const BUS_LOD_R = [20, 45, 85];   // m: tot 20 lod 0, tot 45 lod 1, tot 85 lod 2; verder weg niets
export const INT_R = BUS_LOD_R[2];       // oude naam: de verste afstand waarop de binnenruimte nog te zien is
export const BUS_BUILD_BUDGET = 2;       // nieuwe geometrieën per aanroep (#833): één nieuwe bus per frame
const STOEL = 0x2e5d8a, STOEL_RUG = 0x264d73, STANG = 0xd9b026, DONKER = 0x23262b;
const WALL = 0x2a2f36, CEILING = 0x9aa3ad;
// het wrak (#847): roet en verkoold plastic in plaats van de blauwe stoelen en gele stangen
const WRAK_STOEL = 0x2b2724, WRAK_RUG = 0x1f1c19, WRAK_STANG = 0x4c463c, WRAK_DONKER = 0x171514;
const WRAK_WALL = 0x1d1b19, WRAK_CEIL = 0x2a2724, WRAK_VLOER = 0x141312;
const JASSEN = [0xc0553d, 0x4b7a5a, 0x7a5aa6, 0xd2a04a, 0x3d6e9e, 0x8a8f95, 0xa65a7a, 0x5a8f8a];
const HUIDEN = [0xe8c4a0, 0xc99a74, 0x8d5b3a, 0xf0d2b4];
const GEEN_BEZET = [];
const geoCache = new Map();
let material = null;

export function busLodAt(afstand) {
  if (!(afstand >= 0)) return -1;         // NaN of oneindig: geen binnenruimte
  if (afstand < BUS_LOD_R[0]) return 0;
  if (afstand < BUS_LOD_R[1]) return 1;
  if (afstand < BUS_LOD_R[2]) return 2;
  return -1;
}

function mat() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

const key = (v) => `${v.model.name}|${v.model.len}|${v.model.wid}|${v.model.trailer || 0}${v.wrecked ? '|w' : ''}`;
const layoutOf = (v) => (v.model.name === 'midibus'
  ? midibusInterieur(v.model.len, v.model.wid)
  : busInterieur(v.model.len, v.model.wid, { trailer: v.model.trailer || 0 }));

// De binnenhuid van een eenheid (#833, #847): de buscarrosserie is enkelzijdig, dus van binnen keek je door de
// achterkanten van de vloer, het dak en de zijwanden heen de straat en de lucht in. Dit is één enkelzijdige huid die
// naar binnen kijkt: van buiten onzichtbaar en geen extra draw call, want hij zit in dezelfde lod0-geometrie. Alleen
// lod 0 (in eerste persoon sta je op afstand 0); lod 1 en 2 blijven zonder huid goedkoper. De deurzijde (de
// stoepkant, +z) valt in stukken uiteen zodat je bij een open deur naar buiten blijft kijken; de andere zijwand is
// dicht. De voorste eenheid heeft alleen een sluitwand achterin (vooraan zit de bestuurder); de achterwagen sluit aan
// beide kanten (bij de balg en bij de achterwand). De wrakvariant gebruikt roetkleuren.
function buildInnerShell(B, U, { front = false, wall = WALL, ceiling = CEILING, floor = DONKER } = {}) {
  const f = U.floor;
  const xFront = U.huid.x0, xRear = U.huid.x1;
  const hw = U.wid / 2 - 0.08;                               // de halve breedte waar de stoelen binnen vallen
  const ceilingY = f + 1.9;                                  // stahoogte (de handrail hangt op 2,35)
  const wallTop = f + 1.0;                                   // tot onder de raamlijn
  const P = (x, y, z) => [x, y, z];
  B.quadOut(P(xRear, f, -hw), P(xFront, f, -hw), P(xFront, f, hw), P(xRear, f, hw), [0, 1, 0], floor);            // vloer
  B.quadOut(P(xRear, ceilingY, -hw), P(xFront, ceilingY, -hw), P(xFront, ceilingY, hw), P(xRear, ceilingY, hw), [0, -1, 0], ceiling); // plafond
  const doors = U.doors.slice().sort((a, b) => a - b);
  let x = xRear;
  for (const d of doors) {
    const a = Math.min(d - 0.6, xFront), b = Math.min(d + 0.6, xFront);
    if (a > x) B.quadOut(P(x, f, hw), P(a, f, hw), P(a, wallTop, hw), P(x, wallTop, hw), [0, 0, -1], wall);
    if (b > x) x = b;
    if (x >= xFront) break;
  }
  if (x < xFront) B.quadOut(P(x, f, hw), P(xFront, f, hw), P(xFront, wallTop, hw), P(x, wallTop, hw), [0, 0, -1], wall);
  B.quadOut(P(xRear, f, -hw), P(xFront, f, -hw), P(xFront, wallTop, -hw), P(xRear, wallTop, -hw), [0, 0, 1], wall);   // dichte zijwand
  B.quadOut(P(xRear, f, -hw), P(xRear, f, hw), P(xRear, ceilingY, hw), P(xRear, ceilingY, -hw), [1, 0, 0], wall);    // achterwand
  if (front) B.quadOut(P(xFront, f, -hw), P(xFront, f, hw), P(xFront, ceilingY, hw), P(xFront, ceilingY, -hw), [-1, 0, 0], wall); // wand bij de balg
}

// De inrichting per niveau (#833), gedeeld per (bussoort, maat, eenheid, niveau):
//   0 = de volle inrichting: stoelen met poot, haltestangen, handrail en de loper in het gangpad, plus de
//       binnenhuid (vloer, plafond, wanden en sluitwanden) voor het zicht van binnen in eerste persoon;
//   1 = stoelen zonder poot, de haltestangen om de andere (dun en klein) en de handrail;
//   2 = alleen een donker stoelblok per stoel.
// Alle drie de niveau's passen in dezelfde mesh: sync wisselt alleen de geometrie.
function vulInrichting(B, U, lod) {
  const f = U.floor;
  for (const s of U.seats) {
    B.box(s.x, f + 0.27, s.z, 0.46, 0.08, 0.42, STOEL);                     // zitting
    B.box(s.x - 0.22, f + 0.58, s.z, 0.08, 0.5, 0.42, STOEL_RUG);           // rug
    if (lod === 0) B.box(s.x, f + 0.12, s.z, 0.42, 0.24, 0.1, DONKER);      // poot (valt op afstand weg)
  }
  if (lod === 0) {
    for (const p of U.poles) B.box(p.x, f + 0.95, p.z, 0.035, 1.9, 0.035, STANG);
  } else {
    // midden: de haltestangen om de andere; op 20-45 m zijn ze toch maar een paar pixels breed
    for (let i = 0; i < U.poles.length; i += 2) B.box(U.poles[i].x, f + 0.95, U.poles[i].z, 0.035, 1.9, 0.035, STANG);
  }
  for (const z of U.rail.z) B.box((U.rail.x0 + U.rail.x1) / 2, U.rail.y, z, Math.abs(U.rail.x0 - U.rail.x1), 0.035, 0.035, STANG);
  if (lod === 0) B.box((U.rail.x0 + U.rail.x1) / 2, f + 0.01, 0, Math.abs(U.rail.x0 - U.rail.x1), 0.02, GANG * 2, DONKER); // loper in het gangpad
}

function stoelblokken(B, U) {
  const f = U.floor;
  for (const s of U.seats) B.box(s.x - 0.08, f + 0.3, s.z, 0.5, 0.42, 0.42, STOEL_RUG);   // zitblok
}

// De inrichting van de voorste eenheid (de midibus is één eenheid).
export function buildInrichting(L, lod = 0) {
  const B = new GeoBuilder(1);
  if (lod >= 2) { stoelblokken(B, L); return B.build(); }
  if (lod === 0) buildInnerShell(B, L);
  vulInrichting(B, L, lod);
  return B.build();
}

// De inrichting van de achterwagen van de gelede bus (#847), in de coördinaten van de trailer-groep.
export function buildAchterInrichting(R, lod = 0) {
  const B = new GeoBuilder(1);
  if (lod >= 2) { stoelblokken(B, R); return B.build(); }
  if (lod === 0) buildInnerShell(B, R, { front: true });
  vulInrichting(B, R, lod);
  return B.build();
}

// De wrakvariant (#847): verkoold, verwrongen en scheef, zonder reizigers. Dezelfde opbouw en hetzelfde aantal
// niveau's als de normale inrichting, zodat de sync er niets van merkt; alleen de vormen en kleuren wijken af.
export function buildWrakInrichting(U, lod = 0, { achter = false } = {}) {
  const B = new GeoBuilder(1);
  const f = U.floor;
  if (lod >= 2) {
    for (let i = 0; i < U.seats.length; i++) {
      const s = U.seats[i], k = (i % 7) - 3;
      B.box(s.x - 0.08, f + 0.28, s.z, 0.5, 0.4, 0.42, WRAK_RUG, 0, 0, 0, k * 0.06, k * 0.05);
    }
    return B.build();
  }
  if (lod === 0) buildInnerShell(B, U, { front: achter, wall: WRAK_WALL, ceiling: WRAK_CEIL, floor: WRAK_VLOER });
  for (let i = 0; i < U.seats.length; i++) {
    const s = U.seats[i], k = ((i * 5) % 7) - 3, tilt = k * 0.05;
    B.box(s.x, f + 0.24, s.z, 0.46, 0.08, 0.42, WRAK_STOEL, 0, tilt * 0.5, 0, tilt);             // scheve zitting
    B.box(s.x - 0.2, f + 0.54, s.z, 0.08, 0.5, 0.42, WRAK_RUG, 0, 0, 0, 0.2 + tilt * 1.5);         // verwrongen rug
    if (lod === 0) B.box(s.x, f + 0.1, s.z, 0.4, 0.2, 0.1, WRAK_DONKER, 0, 0, 0, tilt * 0.5);     // losse poot
  }
  for (let i = 0; i < U.poles.length; i += lod === 0 ? 1 : 2) {
    const p = U.poles[i], k = (i % 5) - 2;
    B.box(p.x, f + 0.88, p.z, 0.035, 1.8, 0.035, WRAK_STANG, 0, k * 0.05, 0, k * 0.09);           // scheve stang
  }
  for (const z of U.rail.z) B.box((U.rail.x0 + U.rail.x1) / 2, U.rail.y - 0.12, z, Math.abs(U.rail.x0 - U.rail.x1), 0.035, 0.035, WRAK_STANG, 0, 0, 0, 0.05);
  // wat losse brokstukken op de vloer: een omgevallen stoel en een stuk plaatwerk
  B.box(U.rail.x1 + 1.2, f + 0.14, -0.3, 0.7, 0.22, 0.4, WRAK_STOEL, 0, 0.25, 0.6, 0.12);
  B.box(U.rail.x1 + 2.6, f + 0.05, 0.45, 0.9, 0.06, 0.5, WRAK_DONKER, 0, 0, -0.4, 0.08);
  return B.build();
}

// De reizigers: een romp en een hoofd, zittend of staand; kleuren per plek vast. Alleen voor lod 0 en 1.
export function buildReizigers(L, n, bezet = []) {
  const B = new GeoBuilder(1);
  const f = L.floor;
  const { zit, sta } = bezetting(L, n, bezet);
  const kleur = (i) => JASSEN[(i * 5 + 3) % JASSEN.length];
  const huid = (i) => HUIDEN[(i * 3 + 1) % HUIDEN.length];
  zit.forEach((idx, i) => {
    const s = L.seats[idx];
    B.box(s.x - 0.05, f + 0.62, s.z, 0.26, 0.5, 0.36, kleur(idx));        // romp
    B.box(s.x + 0.1, f + 0.4, s.z, 0.34, 0.16, 0.34, DONKER);             // bovenbenen
    B.box(s.x - 0.04, f + 1.0, s.z, 0.2, 0.2, 0.2, huid(idx));            // hoofd
  });
  sta.forEach((idx, i) => {
    const s = L.stand[idx];
    B.box(s.x, f + 0.45, s.z, 0.22, 0.9, 0.3, DONKER);                    // benen
    B.box(s.x, f + 1.15, s.z, 0.26, 0.55, 0.38, kleur(idx + 7));          // romp
    B.box(s.x, f + 1.6, s.z, 0.2, 0.2, 0.2, huid(idx + 2));               // hoofd
  });
  return B.build();
}

// De reizigers in de achterwagen (#847), in de coördinaten van de trailer-groep.
export function buildAchterReizigers(R, n) {
  return buildReizigers(R, n);
}

// Gedeelde geometrie per eenheid en niveau; alleen bouwen als het budget van deze aanroep dat toestaat (#833).
function unitGeo(v, unit, lod, allowBuild) {
  const k = `i|${unit}|${key(v)}|${lod}`;
  let g = geoCache.get(k);
  if (!g && allowBuild) {
    const L = layoutOf(v);
    const U = unit === 'achter' ? L.rear : L;
    g = markShared(v.wrecked
      ? buildWrakInrichting(U, lod, { achter: unit === 'achter' })
      : unit === 'achter' ? buildAchterInrichting(U, lod) : buildInrichting(U, lod));
    geoCache.set(k, g);
  }
  return g || null;
}

function reizigersGeo(v, unit, n, bezet, allowBuild) {
  const k = `r|${unit}|${key(v)}|${n}|${bezet.join(',')}`;
  let g = geoCache.get(k);
  if (!g && allowBuild) {
    const L = layoutOf(v);
    g = markShared(unit === 'achter' ? buildAchterReizigers(L.rear, n) : buildReizigers(L, n, bezet));
    geoCache.set(k, g);
  }
  return g || null;
}

const bucket = (n) => Math.min(48, Math.ceil(n / 4) * 4);

// Aantal reizigers aan boord voor het beeld: de lopende rit, anders een vast getal per bus.
// Een midibus is een stuk kleiner dan de gelede bus: daar passen zonder rit maar een paar mensen in.
const leegAanBoord = (v) => (v.model && v.model.name === 'midibus' ? 2 + (ruimteReizigers(v.id) % 8) : ruimteReizigers(v.id));
export function reizigersAanBoord(v) {
  const r = v.busBediend && v.busBediend.ride;
  return r && !r.done && !r.failed ? r.onBoard : leegAanBoord(v);
}

// Stoelen waar een medespeler zit in deze bus (coöp, #444): de extra spelers bij de gastheer (world.coopFigures), Tessa
// (world.companion) en bij een gast de lijst uit het snapshot (world.coopZitters). Geeft stoelnummers.
export function coopStoelenIn(w, v) {
  const uit = [];
  for (const f of Object.values(w.coopFigures || {})) if (f && f.inVeh === v && f.stoel != null && !f.coopBestuurt) uit.push(f.stoel);
  for (const z of w.coopZitters || []) if (z && z.voertuig === v.id && !z.bestuurder) uit.push(z.stoel);
  return uit;
}

// Dezelfde stoelen als coopStoelenIn, maar als bitmasker: één getal, zodat een rustig frame geen arrays hoeft te
// maken om te zien of de bezetting veranderd is (#833). Een bus heeft hooguit een handvol stoelen, dus 32 bits is zat.
function multiplayerSeatMask(w, v) {
  let mask = 0;
  const figs = w.coopFigures;
  if (figs) {
    for (const id in figs) {
      const f = figs[id];
      if (f && f.inVeh === v && f.stoel != null && !f.coopBestuurt) mask |= 1 << (f.stoel & 31);
    }
  }
  const zitters = w.coopZitters;
  if (zitters) {
    for (let i = 0; i < zitters.length; i++) {
      const z = zitters[i];
      if (z && z.voertuig === v.id && !z.bestuurder) mask |= 1 << ((z.stoel | 0) & 31);
    }
  }
  return mask >>> 0;
}

// Een wrak heeft blinde, ondoorzichtige ruiten (#847, vehicleMaterials in models3d_vehicles.js). De materialen zijn
// per voertuig nieuw, dus alleen dit wrak wordt doorzichtig; de midibus heeft al gewoon glas en slaan we over. Eén keer
// per voertuig, geen werk in het hete pad.
function openWrakGlas(mesh) {
  const ud = mesh.userData;
  if (ud.wrakGlasOpen) return;
  mesh.traverse((o) => {
    if (!o.isMesh || !Array.isArray(o.material) || o.material.length < 2) return;
    const glas = o.material[1];
    if (!glas || glas.transparent) return;
    glas.transparent = true;
    glas.opacity = 0.38;      // roetig glas: je ziet de wrakruimte, maar het blijft donker
    glas.depthWrite = false;
    glas.needsUpdate = true;
  });
  ud.wrakGlasOpen = true;
}

// Alles van deze bus uit beeld (voorbij de verste afstand of geen budget).
function hideRuimte(ud) {
  if (ud.busInt) ud.busInt.visible = false;
  if (ud.busIntAchter) ud.busIntAchter.visible = false;
  if (ud.busPas) ud.busPas.visible = false;
  if (ud.busPasAchter) ud.busPasAchter.visible = false;
}

// Een reizigersmesh per eenheid: dezelfde mesh blijft staan en wisselt alleen van geometrie (#833).
function zetPax(ud, veld, g, ouder, naam) {
  let m = ud[veld];
  if (!m) {
    m = new THREE.Mesh(g, mat());
    m.name = naam;
    m.castShadow = false;
    m.userData.noBatch = true;
    ouder.add(m);
    ud[veld] = m;
  } else if (m.geometry !== g) m.geometry = g;
  m.visible = true;
}

function ruimPax(ud, body, rear) {
  if (ud.busPas) { body.remove(ud.busPas); ud.busPas = null; }
  if (ud.busPasAchter && rear) { rear.remove(ud.busPasAchter); }
  ud.busPasAchter = null;
  ud.busPasSig = undefined;              // de volgende keer weer opnieuw opbouwen (uit de cache)
}

// Eén keer per frame: bussen in de buurt krijgen hun passagiersruimte op het juiste detailniveau. De afstand wordt
// eerst bepaald (geen Math.hypot, geen arrays per bus); gebouwd wordt lazy en hooguit BUS_BUILD_BUDGET geometrieën
// per aanroep, zodat twee nieuwe bussen niet in één frame hangen. Wie nog niet gebouwd is blijft één frame verborgen.
// Een gelede bus heeft twee meshes (voor- en achterwagen) en dus twee geometrieën per niveau; die komen over twee
// frames, samen met de reizigers. Een wrak doet niet aan reizigers en heeft een eigen, gedeelde wrakgeometrie.
function updateInterieur(dt, w) {
  const p = hoofdspeler(w);
  if (!p) return;                         // nog geen speler (laden of test): niets te doen
  let budget = BUS_BUILD_BUDGET;
  for (const v of w.vehicles) {
    // de gelede stadsbus en de midibus (buurtbus); een tram heeft zijn eigen wagenindeling
    if (!v.isBus || !v.model || (v.model.name !== 'bus' && v.model.name !== 'midibus')) continue;
    const mesh = getVehicleMesh(v.id);
    if (!mesh) continue;
    const ud = mesh.userData;
    const rear = v.model.trailer ? ud.busRear : null;   // trailer-groep van de gelede bus (models3d_vehicles.js)
    const dx = Math.abs(v.x - p.x), dy = Math.abs(v.y - p.y);
    const lod = busLodAt(Math.max(dx, dy));   // Chebyshev; Math.max maakt een NaN-positie meteen onzichtbaar
    if (lod < 0) {                        // voorbij de verste afstand: alles uit
      hideRuimte(ud);
      continue;
    }
    const body = ud.body || mesh;
    const wrecked = !!v.wrecked;
    if (wrecked) openWrakGlas(mesh);      // de wrakruimte is pas te zien als het blinde glas doorzichtig is
    // de inrichting van de voorste eenheid: zelfde mesh, alleen de geometrie wisselt als het niveau verandert (#833)
    if (ud.busIntLod !== lod) {
      const cached = geoCache.size;
      const g = unitGeo(v, 'voor', lod, budget > 0);
      if (!g) {                           // geen budget meer: deze bus blijft één frame verborgen
        hideRuimte(ud);
        continue;
      }
      if (geoCache.size > cached) budget--;
      if (!ud.busInt) {
        ud.busInt = new THREE.Mesh(g, mat());
        ud.busInt.name = wrecked ? 'businterieur-wrak' : 'businterieur';   // de beeldronde herkent de wrakvariant hieraan (#847)
        ud.busInt.castShadow = false;     // het interieur werpt geen schaduw: dat kost een extra shadow-pass per bus
        ud.busInt.userData.noBatch = true;
        body.add(ud.busInt);
      } else ud.busInt.geometry = g;      // zelfde mesh, alleen de geometrie wisselt (#833)
      ud.busIntLod = lod;
    }
    ud.busInt.visible = true;
    // de inrichting van de achterwagen (#847): hangt aan de trailer-groep, dus draait mee met setBusRearAngle
    if (rear) {
      if (ud.busIntAchterLod !== lod) {
        const cached = geoCache.size;
        const g = unitGeo(v, 'achter', lod, budget > 0);
        if (!g) {                         // geen budget: de achterwagen blijft één frame verborgen
          if (ud.busIntAchter) ud.busIntAchter.visible = false;
          if (ud.busPasAchter) ud.busPasAchter.visible = false;
          continue;
        }
        if (geoCache.size > cached) budget--;
        if (!ud.busIntAchter) {
          ud.busIntAchter = new THREE.Mesh(g, mat());
          ud.busIntAchter.name = wrecked ? 'businterieur-achter-wrak' : 'businterieur-achter';
          ud.busIntAchter.castShadow = false;
          ud.busIntAchter.userData.noBatch = true;
          rear.add(ud.busIntAchter);
        } else ud.busIntAchter.geometry = g;
        ud.busIntAchterLod = lod;
      }
      ud.busIntAchter.visible = true;
    }
    if (wrecked || lod >= 2) {            // ver: alleen stoelblokken; een wrak heeft nooit reizigers
      ruimPax(ud, body, rear);
      continue;
    }
    // de reizigers: de bezetting als één getal vergelijken, zodat een rustig frame niets alloceert
    const n = bucket(reizigersAanBoord(v));
    const sig = n * 4294967296 + multiplayerSeatMask(w, v);
    if (ud.busPasSig === sig) {
      if (ud.busPas) ud.busPas.visible = true;
      if (ud.busPasAchter) ud.busPasAchter.visible = true;
      continue;
    }
    if (n <= 0) {                         // niemand aan boord: geen mesh, wel de stand bijhouden
      ruimPax(ud, body, rear);
      ud.busPasSig = sig;
      continue;
    }
    const L = layoutOf(v);                // alleen bij een nieuwe bezetting: geen layout per frame
    const verd = verdeelReizigers(L, n);
    let klaar = true;
    if (verd.voor > 0) {
      const cached = geoCache.size;
      const g = reizigersGeo(v, 'voor', verd.voor, coopBezet(L, coopStoelenIn(w, v)).sort((a, b) => a - b), budget > 0);
      if (!g) klaar = false;
      else {
        if (geoCache.size > cached) budget--;
        zetPax(ud, 'busPas', g, body, 'busreizigers');
      }
    } else if (ud.busPas) { body.remove(ud.busPas); ud.busPas = null; }
    if (rear && verd.achter > 0) {
      const cached = geoCache.size;
      const g = reizigersGeo(v, 'achter', verd.achter, GEEN_BEZET, budget > 0);
      if (!g) klaar = false;
      else {
        if (geoCache.size > cached) budget--;
        zetPax(ud, 'busPasAchter', g, rear, 'busreizigers-achter');
      }
    } else if (ud.busPasAchter && rear) { rear.remove(ud.busPasAchter); ud.busPasAchter = null; }
    if (ud.busPas) ud.busPas.visible = true;
    if (ud.busPasAchter) ud.busPasAchter.visible = true;
    if (klaar) ud.busPasSig = sig;        // pas tevreden als beide eenheden klaar zijn
  }
}

export const busInterieurKind = { id: 'businterieur', tickPhase: 'world', tick: updateInterieur };
