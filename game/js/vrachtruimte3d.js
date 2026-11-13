// De laadruimte van busjes, vrachtwagens, foodtrucks en de kofferbak van auto's, zichtbaar door een
// open of losse (achter)deur of klep (#847). De indeling zelf staat in vrachtruimte.js (puur); dit
// bestand maakt er één samengevoegde, gedeelde geometrie per (soort, maat, detailniveau) van, met één
// mesh per voertuig dat alleen van geometrie wisselt als de afstand of de open deuren veranderen.
// Zoals bij de cabine (#833): dichtbij de volle lading (LOD0), halfverwege de grote stukken (LOD1), ver
// alleen de vloer met één laadblok (LOD2), en voorbij VRACHT_LOD_R[2] niets.
//
// De laadruimte ligt achter het plaatwerk en is dus alleen te zien waar de carrosserie open is. De
// modelbouwers (models3d_vehicles.js) tekenen de auto als een gesloten doos en vehicledoors3d.js zet de
// donkere deuropening *binnen* die doos; daarom tekent deze mesh zelf een "gat": een klein vlak op de
// plaats van de opening, iets buiten het plaatwerk, dat met gl_FragDepth = 1 de diepte daar weghaalt.
// Het vlak zelf is donker en de lading wordt er daarna in getekend (dezelfde truc als CABIN_HOLE in
// vehicledoors3d.js, maar zonder stencil: het vlak heeft een gewone dieptetest, dus een open deurblad
// of een voorbijganger vóór de opening houdt het gat dicht). De lading zelf is enkelzijdig: van buiten
// door de dichte carrosserie is niets te zien.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { hoofdspeler } from './players.js';
import { doorsFor } from './vehicledoors.js';
import {
  vrachtruimteSoort, vrachtruimteZichtbaar, vrachtruimteDelen, vrachtruimteIndeling,
  LAADRUIMTE_OPEN_VANAF, VIRTUELE_LAADDEUR,
} from './vrachtruimte.js';

// Afstandstrap (#847): Chebyshev-afstand tot de speler (max |dx|, |dy|), de maat die syncCabins ook
// gebruikt. 0 = dichtbij (volle lading), 1 = midden, 2 = ver, -1 = voorbij de verste straal. Puur,
// zodat scripts/vrachtruimte3d_test.mjs en de tick dezelfde grens gebruiken.
export const VRACHT_LOD_R = [20, 50, 80];   // m: tot 20 lod 0, tot 50 lod 1, tot 80 lod 2; verder niets
export const VRACHT_R = VRACHT_LOD_R[2];
const VRACHT_BUILD_BUDGET = 2;              // nieuwe geometrieën per tick: geen hapering bij een rij busjes

export function vrachtruimteLodAt(afstand) {
  if (!(afstand >= 0)) return -1;           // NaN of oneindig: geen laadruimte
  if (afstand < VRACHT_LOD_R[0]) return 0;
  if (afstand < VRACHT_LOD_R[1]) return 1;
  if (afstand < VRACHT_LOD_R[2]) return 2;
  return -1;
}

const geoCache = new Map();
let cargoMaterial = null;
let gatMaterial = null;
let materialArray = null;

// Het donkere "gat" op de plaats van de opening: het vlak staat iets buiten het plaatwerk, haalt de
// diepte weg (gl_FragDepth = 1) en tekent niets anders dan de donkere binnenkant. Het gat houdt zijn
// gewone dieptetest: alleen waar het vlak echt zichtbaar is (geen open deurblad of voorwerp ervoor)
// wordt de diepte weggehaald, zodat de lading erachter tevoorschijn komt.
function gatMateriaal() {
  if (!gatMaterial) {
    gatMaterial = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0x141518) } },
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 c; void main() { gl_FragColor = vec4(c, 1.0); gl_FragDepth = 1.0; }',
      fog: false, toneMapped: false, side: THREE.DoubleSide,
    });
    gatMaterial.userData.shared = true;
  }
  return gatMaterial;
}

// Eén gedeeld Lambert-materiaal met vertexkleuren voor alle laadruimtes (zoals cabin3d.js). Let op: dit
// materiaal moet na gatMateriaal gemaakt worden; het gat wordt op materiaal-id vóór de lading getekend.
function laadruimteMateriaal() {
  if (!cargoMaterial) {
    cargoMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, emissive: 0x20232a });
    cargoMaterial.userData.shared = true;
  }
  return cargoMaterial;
}

// De materiaallijst [gat, lading] is voor alle voertuigen dezelfde array: één allocatie, en de
// volgorde (gat vóór lading) ligt vast door de materiaal-id's hierboven.
function materialen() {
  if (!materialArray) materialArray = [gatMateriaal(), laadruimteMateriaal()];
  return materialArray;
}

// --- het gat per open deur/klep ---------------------------------------------------------------
// Alles wat een laadruimte kan openen: de laadklep/achterdeur (verticaal), de kofferbakklep
// (horizontaal), de schuifdeur van een busje (flank), het vaste luik van de foodtruck en de
// denkbeeldige laaddeur van een bakwagen/geldbus/oplegger.
function gatQuads(v) {
  const soort = vrachtruimteSoort(v);
  const uit = [];
  if (!soort) return uit;
  const len = v.model.len, wid = v.model.wid, hl = len / 2, hw = wid / 2;
  const st = v.doors || {};
  const open = (id) => !!((st.loose && st.loose[id]) || (st.open && (st.open[id] || 0) > LAADRUIMTE_OPEN_VANAF));
  // achterkant: een verticaal vlak net achter de achterwand van de carrosserie
  const achter = (id, y0, y1, zHalf) => uit.push({
    id, a: [-hl - 0.02, y0, -zHalf], b: [-hl - 0.02, y0, zHalf], c: [-hl - 0.02, y1, zHalf], d: [-hl - 0.02, y1, -zHalf], out: [-1, 0, 0],
  });
  // flank: een verticaal vlak net buiten het plaatwerk
  const flank = (id, x0, x1, y0, y1, side) => {
    const z = side * (hw + 0.02);
    uit.push({ id, a: [x0, y0, z], b: [x1, y0, z], c: [x1, y1, z], d: [x0, y1, z], out: [0, 0, side] });
  };
  // kofferbakklep: een horizontaal vlak net boven het kofferdeksel
  const boven = (id, x0, x1, y, zHalf) => uit.push({
    id, a: [x0, y, -zHalf], b: [x1, y, -zHalf], c: [x1, y, zHalf], d: [x0, y, zHalf], out: [0, 1, 0],
  });

  if (soort === 'foodtruck') {
    // het luik van buildFoodtruckMesh (x -hl+0,55..hl-1,45, y 1,05..1,85); de strook boven de
    // toonbank is open, de balie en de gele band blijven staan
    flank('luik', -hl + 0.6, hl - 1.5, 1.48, 1.84, 1);
    return uit;
  }
  if (soort === 'vrachtwagen') {
    if (open(VIRTUELE_LAADDEUR)) achter('laaddeur', 0.96, 3.5, hw - 0.16); // buildTruckMesh: bak 0,9..3,65
    return uit;
  }
  if (soort === 'oplegger') {
    if (open(VIRTUELE_LAADDEUR)) achter('laaddeur', 0.9, 3.3, hw - 0.14); // bak 0,75..3,45
    return uit;
  }
  if (soort === 'cashvan') {
    if (open(VIRTUELE_LAADDEUR)) achter('laaddeur', 0.5, 1.9, hw - 0.15);
    return uit;
  }
  for (const d of doorsFor(v)) {
    if (!(d.id === 'klep' || d.soort === 'achterdeur' || d.soort === 'schuif') || !open(d.id)) continue;
    if (d.soort === 'achterdeur') {
      // laadklep van een busje/ambulance of de achterklep van een wagon/suv: verticale opening
      achter(d.id, d.y0 + 0.03, d.y0 + d.h - 0.03, Math.min(d.w, wid - 0.3) / 2);
    } else if (d.soort === 'klep') {
      // kofferdeksel van hatch/sedan/sport/escort: horizontale opening boven de koffervloer
      boven(d.id, d.x * len - d.w / 2 + 0.02, d.x * len + d.w / 2 - 0.02, d.y0 + 0.012, wid * 0.78 / 2 - 0.02);
    } else if (d.soort === 'schuif') {
      // schuifdeur van een bestelbus: opening in de flank
      flank(d.id, d.x * len - d.w / 2 + 0.02, d.x * len + d.w / 2 - 0.02, d.y0 + 0.03, d.y0 + d.h - 0.03, d.side || 1);
    }
  }
  return uit;
}

// Goedkope signatuur van de open laadopeningen (geen allocaties), om per frame te zien of de mesh een
// andere geometrie nodig heeft. Bit i hoort bij de i-de deur van doorsFor; de vaste openingen hebben
// een eigen hoog bit.
function gatSignatuur(v) {
  const soort = vrachtruimteSoort(v);
  if (!soort) return 0;
  if (soort === 'foodtruck') return 1 << 16;
  const st = v.doors || {};
  const open = (id) => !!((st.loose && st.loose[id]) || (st.open && (st.open[id] || 0) > LAADRUIMTE_OPEN_VANAF));
  if (soort === 'vrachtwagen' || soort === 'oplegger' || soort === 'cashvan') return open(VIRTUELE_LAADDEUR) ? 1 << 17 : 0;
  let sig = 0, i = 0;
  for (const d of doorsFor(v)) {
    if ((d.id === 'klep' || d.soort === 'achterdeur' || d.soort === 'schuif') && open(d.id)) sig |= 1 << i;
    i++;
  }
  return sig;
}

function bouwGeometrie(v, lod, kapot, gaten) {
  const B = new GeoBuilder(2);
  // groep 0: de donkere gaten (vóór de lading getekend op materiaal-id, zie laadruimteMateriaal)
  for (const g of gaten) B.quadOut(g.a, g.b, g.c, g.d, g.out, 0x141518, 0);
  // groep 1: de lading, vloer, wanden en schappen van dit niveau
  for (const d of vrachtruimteDelen(v, { lod, kapot })) {
    const r = d.rot;
    if (r) B.box(d.x, d.y, d.z, d.sx, d.sy, d.sz, d.color, 1, r.x || 0, r.y || 0, r.z || 0);
    else B.box(d.x, d.y, d.z, d.sx, d.sy, d.sz, d.color, 1);
  }
  return B.build();
}

// Gedeelde geometrie per (soort, maat, detailniveau, kapot, open deuren). Een niveau dat nog niet
// bestaat wordt alleen gebouwd als allowBuild aan staat (het budget van deze tick); anders volgt null.
function geometryFor(v, lod, kapot, signatuur, allowBuild) {
  const soort = vrachtruimteSoort(v);
  const kb = soort === 'kofferbak' && v.model.name ? v.model.name : '';
  const key = [soort, kb, v.model.len, v.model.wid, lod, kapot ? 1 : 0, signatuur].join('|');
  let g = geoCache.get(key);
  if (!g && allowBuild) {
    g = markShared(bouwGeometrie(v, lod, kapot, gatQuads(v)));
    geoCache.set(key, g);
  }
  return g || null;
}

// Eén keer per wereldtick: elk voertuig binnen VRACHT_LOD_R[2] met een open/losse (achter)deur of klep
// (of een wrak) krijgt zijn laadruimte op het juiste detailniveau; de rest is verborgen. Per aanroep
// worden hooguit VRACHT_BUILD_BUDGET nieuwe geometrieën gebouwd, net als bij de cabines (#833).
export function syncVrachtruimtes(world, budget = VRACHT_BUILD_BUDGET) {
  if (!world || !world.vehicles) return;
  const p = hoofdspeler(world);
  if (!p) return;
  const px = p.x, py = p.y;
  let teBouwen = budget;
  for (const v of world.vehicles) {
    const mesh = getVehicleMesh(v.id);
    if (!mesh) continue;                     // mesh nog niet gebouwd of opgeruimd: de lading hangt eraan
    const cargo = mesh.userData.vrachtruimte || null;
    // eerst de afstand (Chebyshev, zonder Math.hypot; Math.max maakt een NaN-positie meteen onzichtbaar)
    const dx = Math.abs(v.x - px), dy = Math.abs(v.y - py);
    const lod = vrachtruimteLodAt(Math.max(dx, dy));
    if (lod < 0 || !vrachtruimteZichtbaar(v)) { if (cargo) cargo.visible = false; continue; }
    const kapot = !!v.wrecked;
    const sig = gatSignatuur(v);
    if (!cargo || mesh.userData.vrachtruimteLod !== lod || mesh.userData.vrachtruimteGat !== sig || mesh.userData.vrachtruimteKapot !== kapot) {
      const cached = geoCache.size;
      const g = geometryFor(v, lod, kapot, sig, teBouwen > 0);
      if (!g) { if (cargo) cargo.visible = false; continue; }   // nog geen budget: één tick verborgen
      if (geoCache.size > cached) teBouwen--;                    // er is echt een nieuwe geometrie gebouwd
      if (!cargo) {
        const m = new THREE.Mesh(g, materialen());
        m.name = 'vrachtruimte';
        m.renderOrder = 12;            // na de cabine (11): de lading ligt achter het plaatwerk
        m.castShadow = false;          // de lading werpt geen schaduw: dat kost een extra shadow-pass
        m.receiveShadow = false;
        m.userData.noBatch = true;
        (mesh.userData.body || mesh).add(m);
        mesh.userData.vrachtruimte = m;
        mesh.userData.vrachtruimteLod = lod;
        mesh.userData.vrachtruimteGat = sig;
        mesh.userData.vrachtruimteKapot = kapot;
        m.visible = true;
      } else {
        cargo.geometry = g;            // zelfde mesh, alleen de geometrie wisselt (#833)
        mesh.userData.vrachtruimteLod = lod;
        mesh.userData.vrachtruimteGat = sig;
        mesh.userData.vrachtruimteKapot = kapot;
      }
    }
    (mesh.userData.vrachtruimte || cargo).visible = true;
  }
}

// De wereld-tick die main.js registreert (de Lead): één keer per frame, na de deuren en de cabines.
export const vrachtruimteKind = {
  id: 'vrachtruimte',
  tickPhase: 'world',
  tick: (dt, w) => syncVrachtruimtes(w),
};

// Voor de beeldronde en de test: de indeling van dit voertuig (maten en romp) zonder three.js.
export function vrachtruimteMeting(v) {
  const indeling = vrachtruimteIndeling(v);
  if (!indeling) return null;
  return { soort: indeling.soort, kofferbak: indeling.kofferbak, kapot: indeling.kapot, maten: indeling.maten, romp: indeling.romp, delen: indeling.delen.length };
}
