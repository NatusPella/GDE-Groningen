// De laadruimte van busjes, vrachtwagens, foodtrucks en de kofferbak van auto's, zichtbaar door een
// open of losse (achter)deur of klep (#847). De indeling zelf staat in vrachtruimte.js (puur); dit
// bestand maakt er één samengevoegde, gedeelde geometrie per (soort, maat, detailniveau) van, met per
// voertuig een vaste mesh die alleen van geometrie wisselt als de afstand of de open deuren veranderen.
// Zoals bij de cabine (#833): dichtbij de volle lading (LOD0), halfverwege de grote stukken (LOD1), ver
// alleen de vloer met één laadblok (LOD2), en voorbij VRACHT_LOD_R[2] niets.
//
// De laadruimte ligt achter het plaatwerk van een gesloten modeldoos en is dus alleen te zien waar de
// carrosserie open is. Daarom hoort bij elk voertuig een klein "openingsdrieluik" met elk een eigen
// renderOrder (geen materiaal-sortering die kan verschuiven):
//   9. masker: zet met een gewone dieptetest stencil = 2 waar de opening het dichtstbijzijnde vlak is
//      (een open deurblad of een voorwerp ervoor houdt het masker tegen);
//  10. gat: de donkere binnenkant, alleen binnen stencil = 2;
//  12. lading: de gedeelde laadruimtegeometrie, alleen binnen stencil = 2, zonder dieptetest maar van
//      achter naar voren gesorteerd op de kijkrichting van de opening (schilder-volgorde).
// Zo komt de lading tevoorschijn zonder de fragmentele diepte-truc (gl_FragDepth) die in de praktijk
// niet betrouwbaar bleek, en blijft hij achter het plaatwerk: door een dichte carrosserie is niets te
// zien. De masker- en gatmesh zijn elk twee driehoeken per opening en delen hun geometrie met alle
// voertuigen van dezelfde soort en maat; de ladingmesh is de enige met een eigen, gedeelde LOD-geometrie.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { hoofdspeler } from './players.js';
import { doorsFor } from './vehicledoors.js';
import {
  vrachtruimteSoort, vrachtruimteZichtbaar, vrachtruimteDelen, vrachtruimteIndeling, vrachtruimteMaten,
  LAADRUIMTE_OPEN_VANAF, VIRTUELE_LAADDEUR,
} from './vrachtruimte.js';

// Afstandstrap (#847): Chebyshev-afstand tot de speler (max |dx|, |dy|), de maat die syncCabins ook
// gebruikt. 0 = dichtbij (volle lading), 1 = midden, 2 = ver, -1 = voorbij de verste straal. Puur,
// zodat scripts/vrachtruimte3d_test.mjs en de tick dezelfde grens gebruiken.
export const VRACHT_LOD_R = [20, 50, 80];   // m: tot 20 lod 0, tot 50 lod 1, tot 80 lod 2; verder niets
export const VRACHT_R = VRACHT_LOD_R[2];
const VRACHT_BUILD_BUDGET = 2;              // nieuwe geometrieën per tick: geen hapering bij een rij busjes
const STENCIL_REF = 2;                      // ref 2, zodat de cabine-opening (ref 1) ongemoeid blijft

export function vrachtruimteLodAt(afstand) {
  if (!(afstand >= 0)) return -1;           // NaN of oneindig: geen laadruimte
  if (afstand < VRACHT_LOD_R[0]) return 0;
  if (afstand < VRACHT_LOD_R[1]) return 1;
  if (afstand < VRACHT_LOD_R[2]) return 2;
  return -1;
}

const geoCache = new Map();
let maskMaterial = null;
let gatMaterial = null;
let cargoMaterial = null;

// Het masker: zet stencil = 2 waar de opening het dichtstbijzijnde vlak is (gewone dieptetest).
function maskerMateriaal() {
  if (!maskMaterial) {
    maskMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
      stencilWrite: true, stencilRef: STENCIL_REF, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    });
    maskMaterial.userData.shared = true;
  }
  return maskMaterial;
}

// De donkere binnenkant van de opening: alleen binnen het masker, over het plaatwerk heen.
function gatMateriaal() {
  if (!gatMaterial) {
    gatMaterial = new THREE.MeshBasicMaterial({
      color: 0x141518, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      stencilWrite: true, stencilRef: STENCIL_REF, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.KeepStencilOp,
    });
    gatMaterial.userData.shared = true;
  }
  return gatMaterial;
}

// Eén gedeeld Lambert-materiaal met vertexkleuren voor alle lading (zoals cabin3d.js). Een flinke
// emissive-basis houdt de lading leesbaar in een donkere laadruimte. Geen dieptetest: de
// schilder-volgorde in de geometrie bepaalt wat voor wat ligt; het masker begrenst alles tot de opening.
function laadruimteMateriaal() {
  if (!cargoMaterial) {
    cargoMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true, side: THREE.FrontSide, emissive: 0x565c63,
      depthTest: false, depthWrite: false,
      stencilWrite: true, stencilRef: STENCIL_REF, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.KeepStencilOp,
    });
    cargoMaterial.userData.shared = true;
  }
  return cargoMaterial;
}

// --- het gat per open deur/klep ---------------------------------------------------------------
// Alles wat een laadruimte kan openen: de laadklep/achterdeur (verticaal), de kofferbakklep
// (horizontaal of bij een hatchback in de achterwand), de schuifdeur van een busje (flank), het vaste
// luik van de foodtruck en de denkbeeldige laaddeur van een bakwagen/geldbus/oplegger. `out` wijst naar
// buiten: de kijklijn de laadruimte in is -out, en daarop sorteert de lading (schilder-volgorde).
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
      if (v.model.name === 'hatch') {
        // hatchback: de klep is de hele achterklep, dus de opening zit in de achterwand (het
        // horizontale deksel alleen is van achteren nauwelijks te zien). De opening zo groot als de
        // kofferbak zelf: van de vloer tot onder het deksel.
        const m = vrachtruimteMaten(v);
        achter(d.id, m.floor + 0.06, Math.min(m.ceil - 0.02, d.y0 - 0.02), wid * 0.78 / 2 - 0.02);
      } else {
        // kofferdeksel van sedan/sport/escort: horizontale opening net boven het kofferdeksel
        boven(d.id, d.x * len - d.w / 2 + 0.02, d.x * len + d.w / 2 - 0.02, d.y0 + 0.03, wid * 0.78 / 2 - 0.02);
      }
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

// De wand die in de opening zelf ligt moet weg: kijk je door een schuifdeur of het luik van de
// foodtruck naar binnen, dan zit de eigen zijwand van de laadruimte precies voor de opening; bij een
// kofferdeksel is dat het plafond. Anders kijk je tegen de buitenkant van je eigen binnenhuid aan.
function snijdOpeningswand(delen, gaten) {
  let weg = null;
  for (const g of gaten) {
    if (g.out[1] > 0.5) weg = 'plafond';
    else if (g.out[2] > 0.5) weg = 'wand-r';
    else if (g.out[2] < -0.5) weg = 'wand-l';
  }
  return weg ? delen.filter((d) => d.id !== weg) : delen;
}

// Schilder-volgorde: de lading van achter naar voren ten opzichte van de opening, zodat wat verder
// weg ligt eerst getekend wordt. Bij meerdere open gaten telt de gemiddelde kijkrichting.
function sorteerLading(delen, gaten) {
  if (!gaten.length) return delen;
  let vx = 0, vy = 0, vz = 0;
  for (const g of gaten) { vx -= g.out[0]; vy -= g.out[1]; vz -= g.out[2]; }
  const n = Math.hypot(vx, vy, vz) || 1;
  vx /= n; vy /= n; vz /= n;
  return delen
    .map((d) => ({ d, k: d.x * vx + d.y * vy + d.z * vz }))
    .sort((a, b) => b.k - a.k)
    .map((o) => o.d);
}

// De gedeelde ladinggeometrie van één detailniveau (vloer, wanden, schappen, lading), inclusief de
// gaten die in de opening zelf vallen weggelaten en van achter naar voren gesorteerd.
function bouwLadingGeometrie(v, lod, kapot, gaten) {
  const B = new GeoBuilder(1);
  const delen = snijdOpeningswand(vrachtruimteDelen(v, { lod, kapot }), gaten);
  for (const d of sorteerLading(delen, gaten)) {
    const r = d.rot;
    if (r) B.box(d.x, d.y, d.z, d.sx, d.sy, d.sz, d.color, 0, r.x || 0, r.y || 0, r.z || 0);
    else B.box(d.x, d.y, d.z, d.sx, d.sy, d.sz, d.color, 0);
  }
  return B.build();
}

// De gedeelde geometrie van het masker en het gat: dezelfde quilt van twee driehoeken per opening.
function bouwGatGeometrie(gaten) {
  const B = new GeoBuilder(1);
  for (const g of gaten) B.quadOut(g.a, g.b, g.c, g.d, g.out, 0x141518, 0);
  return B.build();
}

function ladingSleutel(v, lod, kapot, sig) {
  const soort = vrachtruimteSoort(v);
  const kb = soort === 'kofferbak' && v.model.name ? v.model.name : '';
  return [soort, kb, v.model.len, v.model.wid, lod, kapot ? 1 : 0, sig].join('|');
}
function gatSleutel(v, sig) {
  const soort = vrachtruimteSoort(v);
  // de kofferbaksoort hoort in de sleutel: een sedan heeft een horizontaal deksel en een politiewagen
  // (ook een kofferbak van dezelfde maat) een verticale achterklep
  const kb = soort === 'kofferbak' && v.model.name ? v.model.name : '';
  return ['gat', soort, kb, v.model.len, v.model.wid, sig].join('|');
}

// Gedeelde geometrie opzoeken of (binnen het budget) bouwen. Geeft null als het budget op is.
function cacheOf(sleutel, maak, magBouwen) {
  let g = geoCache.get(sleutel);
  if (!g && magBouwen) {
    g = markShared(maak());
    geoCache.set(sleutel, g);
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
    if (lod < 0 || !vrachtruimteZichtbaar(v)) {
      if (cargo) {
        cargo.visible = false;
        mesh.userData.vrachtruimteMasker.visible = false;
        mesh.userData.vrachtruimteGatMesh.visible = false;
      }
      continue;
    }
    const kapot = !!v.wrecked;
    const sig = gatSignatuur(v);
    if (!cargo || mesh.userData.vrachtruimteLod !== lod || mesh.userData.vrachtruimteSig !== sig || mesh.userData.vrachtruimteKapot !== kapot) {
      const gaten = gatQuads(v);
      const voor = geoCache.size;
      const lading = cacheOf(ladingSleutel(v, lod, kapot, sig), () => bouwLadingGeometrie(v, lod, kapot, gaten), teBouwen > 0);
      const gatGeo = lading && gaten.length ? cacheOf(gatSleutel(v, sig), () => bouwGatGeometrie(gaten), geoCache.size - voor < teBouwen) : null;
      teBouwen -= geoCache.size - voor;
      if (!lading || (gaten.length && !gatGeo)) {   // geen budget: één tick verborgen
        if (cargo) {
          cargo.visible = false;
          mesh.userData.vrachtruimteMasker.visible = false;
          mesh.userData.vrachtruimteGatMesh.visible = false;
        }
        continue;
      }
      const gatZichtbaar = !!gatGeo;
      if (!cargo) {
        const maak = (geometry, material, naam, orde) => {
          const m = new THREE.Mesh(geometry, material);
          m.name = naam;
          m.renderOrder = orde;
          m.castShadow = false;
          m.receiveShadow = false;
          m.userData.noBatch = true;
          (mesh.userData.body || mesh).add(m);
          return m;
        };
        // masker (9) → gat (10) → lading (12): elk met een eigen renderOrder, dus de volgorde ligt
        // vast en hangt niet van de materiaal-sortering af.
        const mas = maak(gatGeo || new THREE.BufferGeometry(), maskerMateriaal(), 'vrachtruimte-masker', 9);
        const ga = maak(gatGeo || new THREE.BufferGeometry(), gatMateriaal(), 'vrachtruimte-gat', 10);
        const m = maak(lading, laadruimteMateriaal(), 'vrachtruimte', 12);
        m.userData.soort = vrachtruimteSoort(v); // voor de beeldronde: welk laadruimtetype hier hangt
        mesh.userData.vrachtruimte = m;
        mesh.userData.vrachtruimteMasker = mas;
        mesh.userData.vrachtruimteGatMesh = ga;
        mesh.userData.vrachtruimteLod = lod;
        mesh.userData.vrachtruimteSig = sig;
        mesh.userData.vrachtruimteKapot = kapot;
      } else {
        cargo.geometry = lading;
        mesh.userData.vrachtruimteMasker.geometry = gatGeo || new THREE.BufferGeometry();
        mesh.userData.vrachtruimteGatMesh.geometry = gatGeo || new THREE.BufferGeometry();
        mesh.userData.vrachtruimteLod = lod;
        mesh.userData.vrachtruimteSig = sig;
        mesh.userData.vrachtruimteKapot = kapot;
      }
      mesh.userData.vrachtruimte.visible = true;
      mesh.userData.vrachtruimteMasker.visible = gatZichtbaar;
      mesh.userData.vrachtruimteGatMesh.visible = gatZichtbaar;
    }
    const cargoNu = mesh.userData.vrachtruimte;
    cargoNu.visible = true;
    mesh.userData.vrachtruimteMasker.visible = !!mesh.userData.vrachtruimteSig;
    mesh.userData.vrachtruimteGatMesh.visible = !!mesh.userData.vrachtruimteSig;
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

// Diagnose voor de beeldronde: wat hangt er aan deze auto en welke groepen/maskers heeft de mesh?
export function vrachtruimteStand(v) {
  const mesh = v ? getVehicleMesh(v.id) : null;
  const m = mesh && mesh.userData.vrachtruimte;
  const mas = mesh && mesh.userData.vrachtruimteMasker;
  const ga = mesh && mesh.userData.vrachtruimteGatMesh;
  return {
    mesh: !!mesh, cargo: !!m, zichtbaar: !!(m && m.visible), lod: mesh ? mesh.userData.vrachtruimteLod ?? null : null,
    sig: mesh ? mesh.userData.vrachtruimteSig ?? null : null, kapot: mesh ? mesh.userData.vrachtruimteKapot ?? null : null,
    masker: mas ? { zichtbaar: mas.visible, driehoeken: mas.geometry.attributes.position ? mas.geometry.attributes.position.count / 3 : 0 } : null,
    gat: ga ? { zichtbaar: ga.visible, driehoeken: ga.geometry.attributes.position ? ga.geometry.attributes.position.count / 3 : 0 } : null,
    driehoeken: m && m.geometry.attributes.position ? m.geometry.attributes.position.count / 3 : 0,
    gatQuads: v ? gatQuads(v).length : 0,
    regel: v ? vrachtruimteZichtbaar(v) : false,
  };
}
