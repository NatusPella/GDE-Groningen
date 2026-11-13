import { hoofdspeler } from './players.js';
// De passagiersruimte van de bus in beeld (#444, #442, #833): stoelen, haltestangen, handrail en reizigers die zitten of staan,
// door de ramen en de open deuren te zien en bij de binnenin-camera (V). De maten komen uit businterieur.js (met
// tests). De ruimte heeft drie detailniveaus op afstand (LOD): dichtbij de hele inrichting met reizigers, halfverwege
// de stoelen met de haltestangen en de handrail (zonder poten, loper en de helft van de stangen) en de reizigers, ver
// alleen stoelblokken zonder reizigers. Het dichtbije niveau heeft ook een enkelzijdige binnenhuid (vloer, plafond,
// wanden met deurgaten en achterwand), zodat je in eerste persoon niet door de achterkant van de enkelzijdige
// buscarrosserie heen de straat en de lucht ziet. De geometrie is gedeeld: één mesh per busmaat en niveau voor de
// inrichting, en per maat en aantal reizigers één voor de mensen (blokken van 4). Meldt zich in main.js als kind.
// De gelede stadsbus en de midibus (#442, de buurtbus uit de winkel) hebben elk hun eigen indeling.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { busInterieur, midibusInterieur, bezetting, ruimteReizigers, coopBezet, GANG } from './businterieur.js';

// Afstandstrap (#833): Chebyshev-afstand tot de speler (max |dx|, |dy|), dezelfde maat als cabin3d.js.
// 0 = dichtbij (volle inrichting + reizigers), 1 = midden (stoelen, stangen en handrail + reizigers),
// 2 = ver (alleen stoelblokken), -1 = voorbij de verste. Pure functie, zodat de tests dezelfde grens gebruiken.
export const BUS_LOD_R = [20, 45, 85];   // m: tot 20 lod 0, tot 45 lod 1, tot 85 lod 2; verder weg niets
export const INT_R = BUS_LOD_R[2];       // oude naam: de verste afstand waarop de binnenruimte nog te zien is
const BUS_BUILD_BUDGET = 2;              // nieuwe geometrieën per aanroep (#833): één nieuwe bus per frame
const STOEL = 0x2e5d8a, STOEL_RUG = 0x264d73, STANG = 0xd9b026, DONKER = 0x23262b;
const JASSEN = [0xc0553d, 0x4b7a5a, 0x7a5aa6, 0xd2a04a, 0x3d6e9e, 0x8a8f95, 0xa65a7a, 0x5a8f8a];
const HUIDEN = [0xe8c4a0, 0xc99a74, 0x8d5b3a, 0xf0d2b4];
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

const key = (v) => `${v.model.name}|${v.model.len}|${v.model.wid}|${v.model.trailer || 0}`;
const layoutOf = (v) => (v.model.name === 'midibus'
  ? midibusInterieur(v.model.len, v.model.wid)
  : busInterieur(v.model.len, v.model.wid, { trailer: v.model.trailer || 0 }));

// De binnenhuid van de passagiersruimte (#833): de buscarrosserie is enkelzijdig, dus van binnen keek je door
// de achterkanten van de vloer, het dak en de zijwanden heen de straat en de lucht in. Dit is één enkelzijdige
// huid die naar binnen kijkt: van buiten onzichtbaar en geen extra draw call, want hij zit in dezelfde
// lod0-inrichtingsgeometrie. Alleen lod 0 (in eerste persoon sta je op afstand 0); lod 1 en 2 blijven zonder
// huid goedkoper. De deurzijde (de stoepkant, +z) valt in stukken uiteen zodat je bij een open deur naar
// buiten blijft kijken; de andere zijwand is dicht (daar zit geen deur).
function buildInnerShell(B, L) {
  const f = L.floor;
  const xFront = L.rail.x0 - 0.4, xRear = L.rail.x1 + 0.2;   // dezelfde ruimte als de handrail beslaat
  const hw = L.wid / 2 - 0.08;                               // de halve breedte waar de stoelen binnen vallen
  const ceilingY = f + 1.9;                                  // stahoogte (de handrail hangt op 2,35)
  const wallTop = f + 1.0;                                   // tot onder de raamlijn
  const WALL = 0x2a2f36, CEILING = 0x9aa3ad;
  const P = (x, y, z) => [x, y, z];
  B.quadOut(P(xRear, f, -hw), P(xFront, f, -hw), P(xFront, f, hw), P(xRear, f, hw), [0, 1, 0], DONKER);            // vloer
  B.quadOut(P(xRear, ceilingY, -hw), P(xFront, ceilingY, -hw), P(xFront, ceilingY, hw), P(xRear, ceilingY, hw), [0, -1, 0], CEILING); // plafond
  const doors = L.doors.slice().sort((a, b) => a - b);
  let x = xRear;
  for (const d of doors) {
    const a = Math.min(d - 0.6, xFront), b = Math.min(d + 0.6, xFront);
    if (a > x) B.quadOut(P(x, f, hw), P(a, f, hw), P(a, wallTop, hw), P(x, wallTop, hw), [0, 0, -1], WALL);
    if (b > x) x = b;
    if (x >= xFront) break;
  }
  if (x < xFront) B.quadOut(P(x, f, hw), P(xFront, f, hw), P(xFront, wallTop, hw), P(x, wallTop, hw), [0, 0, -1], WALL);
  B.quadOut(P(xRear, f, -hw), P(xFront, f, -hw), P(xFront, wallTop, -hw), P(xRear, wallTop, -hw), [0, 0, 1], WALL);   // dichte zijwand
  B.quadOut(P(xRear, f, -hw), P(xRear, f, hw), P(xRear, ceilingY, hw), P(xRear, ceilingY, -hw), [1, 0, 0], WALL);    // achterwand
}

// De inrichting per niveau (#833), gedeeld per (bussoort, maat, niveau):
//   0 = de volle inrichting: stoelen met poot, haltestangen, handrail en de loper in het gangpad, plus de
//       binnenhuid (vloer, plafond, wanden en achterwand) voor het zicht van binnen in eerste persoon;
//   1 = stoelen zonder poot, de haltestangen om de andere (dun en klein) en de handrail;
//   2 = alleen een donker stoelblok per stoel.
// Alle drie de niveau's passen in dezelfde mesh: sync wisselt alleen de geometrie.
export function buildInrichting(L, lod = 0) {
  const B = new GeoBuilder(1);
  const f = L.floor;
  if (lod >= 2) {
    for (const s of L.seats) B.box(s.x - 0.08, f + 0.3, s.z, 0.5, 0.42, 0.42, STOEL_RUG);   // zitblok
    return B.build();
  }
  if (lod === 0) buildInnerShell(B, L);
  for (const s of L.seats) {
    B.box(s.x, f + 0.27, s.z, 0.46, 0.08, 0.42, STOEL);                     // zitting
    B.box(s.x - 0.22, f + 0.58, s.z, 0.08, 0.5, 0.42, STOEL_RUG);           // rug
    if (lod === 0) B.box(s.x, f + 0.12, s.z, 0.42, 0.24, 0.1, DONKER);      // poot (valt op afstand weg)
  }
  if (lod === 0) {
    for (const p of L.poles) B.box(p.x, f + 0.95, p.z, 0.035, 1.9, 0.035, STANG);
  } else {
    // midden: de haltestangen om de andere; op 20-45 m zijn ze toch maar een paar pixels breed
    for (let i = 0; i < L.poles.length; i += 2) B.box(L.poles[i].x, f + 0.95, L.poles[i].z, 0.035, 1.9, 0.035, STANG);
  }
  for (const z of L.rail.z) B.box((L.rail.x0 + L.rail.x1) / 2, L.rail.y, z, Math.abs(L.rail.x0 - L.rail.x1), 0.035, 0.035, STANG);
  if (lod === 0) B.box((L.rail.x0 + L.rail.x1) / 2, f + 0.01, 0, Math.abs(L.rail.x0 - L.rail.x1), 0.02, GANG * 2, DONKER); // loper in het gangpad
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

// Gedeelde geometrie per niveau; alleen bouwen als het budget van deze aanroep dat toestaat (#833).
function inrichtingGeo(v, lod, allowBuild) {
  const k = `i|${key(v)}|${lod}`;
  let g = geoCache.get(k);
  if (!g && allowBuild) { g = markShared(buildInrichting(layoutOf(v), lod)); geoCache.set(k, g); }
  return g || null;
}

function reizigersGeo(v, n, bezet, allowBuild) {
  const k = `r|${key(v)}|${n}|${bezet.join(',')}`;
  let g = geoCache.get(k);
  if (!g && allowBuild) { g = markShared(buildReizigers(layoutOf(v), n, bezet)); geoCache.set(k, g); }
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

// Eén keer per frame: bussen in de buurt krijgen hun passagiersruimte op het juiste detailniveau. De afstand wordt
// eerst bepaald (geen Math.hypot, geen arrays per bus); gebouwd wordt lazy en hooguit BUS_BUILD_BUDGET geometrieën
// per aanroep, zodat twee nieuwe bussen niet in één frame hangen. Wie nog niet gebouwd is blijft één frame verborgen.
function updateInterieur(dt, w) {
  const p = hoofdspeler(w);
  if (!p) return;                         // nog geen speler (laden of test): niets te doen
  let budget = BUS_BUILD_BUDGET;
  for (const v of w.vehicles) {
    // de gelede stadsbus en de midibus (buurtbus); een tram heeft zijn eigen wagenindeling
    if (!v.isBus || v.wrecked || !v.model || (v.model.name !== 'bus' && v.model.name !== 'midibus')) continue;
    const mesh = getVehicleMesh(v.id);
    if (!mesh) continue;
    const ud = mesh.userData;
    const dx = Math.abs(v.x - p.x), dy = Math.abs(v.y - p.y);
    const lod = busLodAt(Math.max(dx, dy));   // Chebyshev; Math.max maakt een NaN-positie meteen onzichtbaar
    if (lod < 0) {                        // voorbij de verste afstand: alles uit
      if (ud.busInt) ud.busInt.visible = false;
      if (ud.busPas) ud.busPas.visible = false;
      continue;
    }
    const body = ud.body || mesh;
    // de inrichting: zelfde mesh, alleen de geometrie wisselt als het niveau verandert (#833)
    if (ud.busIntLod !== lod) {
      const cached = geoCache.size;
      const g = inrichtingGeo(v, lod, budget > 0);
      if (!g) {                           // geen budget meer: deze bus blijft één frame verborgen
        if (ud.busInt) ud.busInt.visible = false;
        if (ud.busPas) ud.busPas.visible = false;
        continue;
      }
      if (geoCache.size > cached) budget--;
      if (!ud.busInt) {
        ud.busInt = new THREE.Mesh(g, mat());
        ud.busInt.name = 'businterieur';
        ud.busInt.castShadow = false;     // het interieur werpt geen schaduw: dat kost een extra shadow-pass per bus
        ud.busInt.userData.noBatch = true;
        body.add(ud.busInt);
      } else ud.busInt.geometry = g;      // zelfde mesh, alleen de geometrie wisselt (#833)
      ud.busIntLod = lod;
    }
    ud.busInt.visible = true;
    if (lod >= 2) {                       // ver: alleen stoelblokken, geen reizigers
      if (ud.busPas) { body.remove(ud.busPas); ud.busPas = null; ud.busPasSig = undefined; }
      continue;
    }
    // de reizigers: de bezetting als één getal vergelijken, zodat een rustig frame niets alloceert
    const n = bucket(reizigersAanBoord(v));
    const sig = n * 4294967296 + multiplayerSeatMask(w, v);
    if (ud.busPasSig !== sig) {
      if (n <= 0) {                       // niemand aan boord: geen mesh, wel de stand bijhouden
        if (ud.busPas) { body.remove(ud.busPas); ud.busPas = null; }
        ud.busPasSig = sig;
        continue;
      }
      const bezet = coopStoelenIn(w, v).sort((a, b) => a - b);
      const cached = geoCache.size;
      const g = reizigersGeo(v, n, bezet, budget > 0);
      if (!g) {                           // nog geen budget: de oude reizigers blijven deze frame verborgen
        if (ud.busPas) ud.busPas.visible = false;
        continue;
      }
      if (geoCache.size > cached) budget--;
      if (ud.busPas) body.remove(ud.busPas);
      ud.busPas = new THREE.Mesh(g, mat());
      ud.busPas.name = 'busreizigers';
      ud.busPas.castShadow = false;
      ud.busPas.userData.noBatch = true;
      body.add(ud.busPas);
      ud.busPasSig = sig;
    }
    if (ud.busPas) ud.busPas.visible = true;
  }
}

export const busInterieurKind = { id: 'businterieur', tickPhase: 'world', tick: updateInterieur };
